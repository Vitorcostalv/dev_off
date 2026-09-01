import Phaser from 'phaser';
import { estado } from '../game/estado';
import {
  COR_DO_ESCURO,
  LANTERNA,
  TINTA_APAGADA,
  buscarTipoDeLampada,
  criarMapaDeLuz,
  mapaDeLuzEstatico,
  somarLuzDoJogador,
} from '../game/luzes';
import type { Lampada, MapaDeLuz } from '../game/luzes';
import { comportamentoDe } from '../game/equipar';
import type { Direcao } from '../game/tipos';

/**
 * CAMADA DE LUZ — o desenho do mapa de luz e das luminarias.
 *
 * A tecnica, em tres passos:
 *
 *  1. `src/game/luzes.ts` calcula um valor de luz POR TILE do andar. As
 *     luminarias entram uma vez e ficam em cache; a lanterna do jogador entra a
 *     cada quadro, so na janela em volta dele.
 *  2. Esses valores viram uma textura de UM TEXEL POR TILE, em que o alfa de cada
 *     texel e `escuridao do comodo - luz do tile`.
 *  3. A textura e desenhada esticada por cima do mundo com filtro LINEAR.
 *
 * O passo 3 e o truque: e a interpolacao bilinear da GPU que produz o degrade
 * suave entre um tile claro e o vizinho escuro. Nao ha shader, nao ha
 * RenderTexture por quadro, nao ha centenas de circulos desenhados — e nao ha
 * borda geometrica visivel, que era o defeito da vinheta da leva anterior.
 *
 * O custo por quadro e reescrever ~400 texels de um ImageData e reenviar uma
 * textura de 34x22. Num andar de 30x20 tiles isso e ruido.
 */

/** Nome da textura de mapa de luz. Uma por cena; recriada a cada andar. */
const TEXTURA = 'represa-mapa-de-luz';

/** Profundidade da camada de escuridao — acima de tudo, abaixo da HUD. */
const DEPTH_ESCURO = 90000;
/** Halo aditivo das luminarias: acima do escuro, pra a lampada brilhar nele. */
const DEPTH_HALO = 90001;

/**
 * Quanto a janela de atualizacao passa do alcance da lanterna, em tiles.
 *
 * A folga existe pra a janela se AUTOLIMPAR: os tiles do anel entre o alcance da
 * luz e a borda da janela recebem, todo quadro, o valor estatico puro. Sem ela, o
 * rastro da lanterna ficaria aceso atras do jogador.
 */
const FOLGA_DA_JANELA = 3;

interface LampadaVisual {
  lampada: Lampada;
  sprite: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Graphics;
  /** fase do tremor, pra duas luminarias iguais nao piscarem juntas */
  fase: number;
}

export interface DependenciasLuz {
  tileBloqueado(tx: number, ty: number): boolean;
  /** escuridao do tile, 0 a 1, vinda dos comodos do tilemap */
  escuridaoNoTile(tx: number, ty: number): number;
}

export class CamadaLuz {
  private cena: Phaser.Scene;
  private tamanhoTile: number;
  private deps: DependenciasLuz;

  private largura = 0;
  private altura = 0;
  private lampadas: LampadaVisual[] = [];
  private estatico: MapaDeLuz | null = null;
  private trabalho: MapaDeLuz | null = null;
  private canvas: Phaser.Textures.CanvasTexture | null = null;
  private pixels: ImageData | null = null;
  private imagem: Phaser.GameObjects.Image | null = null;
  /** tempo acumulado, so pro tremor das luminarias */
  private tempo = 0;
  /** flags de circuito observadas no ultimo recalculo */
  private circuitosVistos = '';

  constructor(cena: Phaser.Scene, tamanhoTile: number, deps: DependenciasLuz) {
    this.cena = cena;
    this.tamanhoTile = tamanhoTile;
    this.deps = deps;
  }

  // ------------------------------------------------------------- montagem --
  montar(map: Phaser.Tilemaps.Tilemap): void {
    this.largura = map.width;
    this.altura = map.height;
    this.lerLampadas(map);
    this.criarTextura();
    this.recalcular();
  }

  /**
   * Le a camada `luzes` do tilemap.
   *
   * Um objeto sem `tipo` (os cinco setores autorais, que nasceram antes das
   * luminarias de verdade) cai no pendente: eles ja declaravam raio, e o que
   * faltava era so a arte.
   */
  private lerLampadas(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('luzes');
    if (!camada) return;
    const t = this.tamanhoTile;
    camada.objects.forEach((obj, i) => {
      const props = Object.fromEntries(
        (obj.properties ?? []).map((p: { name: string; value: unknown }) => [p.name, p.value]),
      );
      const tipo = buscarTipoDeLampada(props.tipo) ?? buscarTipoDeLampada('pendente')!;
      const tx = Math.floor(((obj.x ?? 0) + (obj.width ?? 0) / 2) / t);
      const ty = Math.floor(((obj.y ?? 0) + (obj.height ?? 0) / 2) / t);
      const lampada: Lampada = {
        id: obj.name || `luz_${i}`,
        tx,
        ty,
        tipo,
        raio: Math.max(1.5, Number(props.raio) || tipo.raio),
        intensidade: tipo.intensidade,
        circuito: typeof props.circuito === 'string' ? props.circuito : null,
      };
      // A luminaria e presa no TETO, e o teto de um comodo e a FAIXA DE PAREDE
      // acima da primeira linha dele. Pendurar a partir de `ty` fazia a peca
      // descer um tile e meio dentro do comodo e cobrir o jogador que estivesse
      // encostado na parede; a partir de `ty - 0.9` ela nasce na faixa e so
      // encosta na borda de cima da sala.
      const sprite = this.cena.add
        .image((tx + 0.5) * t, (ty - 0.9) * t, 'equipamento', tipo.frame)
        .setOrigin(0.5, 0);
      const escala = (tipo.altura * t) / sprite.height;
      sprite.setScale(escala);
      // acima do escuro: uma lampada acesa tem de aparecer no escuro
      sprite.setDepth(DEPTH_HALO);
      const halo = this.cena.add.graphics().setDepth(DEPTH_HALO);
      halo.setBlendMode(Phaser.BlendModes.ADD);
      this.lampadas.push({ lampada, sprite, halo, fase: (i * 1.7) % 6.283 });
    });
  }

  private criarTextura(): void {
    if (this.cena.textures.exists(TEXTURA)) this.cena.textures.remove(TEXTURA);
    const canvas = this.cena.textures.createCanvas(TEXTURA, this.largura, this.altura);
    if (!canvas) return;
    this.canvas = canvas;
    const ctx = canvas.getContext();
    this.pixels = ctx.createImageData(this.largura, this.altura);
    // LINEAR e o que transforma um texel por tile num degrade suave.
    canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.imagem = this.cena.add
      .image(0, 0, TEXTURA)
      .setOrigin(0, 0)
      .setDisplaySize(this.largura * this.tamanhoTile, this.altura * this.tamanhoTile)
      .setDepth(DEPTH_ESCURO);
  }

  /**
   * Recalcula o mapa ESTATICO e reescreve a textura inteira.
   *
   * Chamado ao montar e quando um circuito muda de estado — ou seja, ao resolver
   * um painel. Nao ha custo por quadro nenhum aqui.
   */
  recalcular(): void {
    this.estatico = mapaDeLuzEstatico(
      this.largura,
      this.altura,
      this.lampadas.map((l) => l.lampada),
      (l) => this.acesa(l),
      (x, y) => this.deps.tileBloqueado(x, y),
    );
    this.trabalho = criarMapaDeLuz(this.largura, this.altura);
    this.circuitosVistos = this.assinaturaDosCircuitos();
    for (const visual of this.lampadas) {
      const on = this.acesa(visual.lampada);
      visual.sprite.setTint(on ? 0xffffff : TINTA_APAGADA);
      visual.halo.setVisible(on);
      if (on) this.desenharHalo(visual);
    }
    this.escreverTudo();
  }

  private acesa(l: Lampada): boolean {
    return l.circuito === null || estado.worldEvents.ativa(l.circuito);
  }

  private assinaturaDosCircuitos(): string {
    return this.lampadas
      .map((l) => (l.lampada.circuito ? (this.acesa(l.lampada) ? '1' : '0') : '-'))
      .join('');
  }

  /** Halo aditivo em volta da lampada — o brilho que ela derrama no escuro. */
  private desenharHalo(visual: LampadaVisual): void {
    const t = this.tamanhoTile;
    const { lampada } = visual;
    const x = (lampada.tx + 0.5) * t;
    const y = (lampada.ty + 0.6) * t;
    const raio = lampada.raio * t * 0.55;
    visual.halo.clear();
    visual.halo.fillStyle(lampada.tipo.cor, 0.07);
    visual.halo.fillCircle(x, y, raio);
    visual.halo.fillStyle(lampada.tipo.cor, 0.07);
    visual.halo.fillCircle(x, y, raio * 0.6);
    visual.halo.fillStyle(0xffffff, 0.08);
    visual.halo.fillCircle(x, y, raio * 0.24);
  }

  destruir(): void {
    for (const l of this.lampadas) {
      l.sprite.destroy();
      l.halo.destroy();
    }
    this.lampadas = [];
    this.imagem?.destroy();
    this.imagem = null;
    if (this.canvas && this.cena.textures.exists(TEXTURA)) this.cena.textures.remove(TEXTURA);
    this.canvas = null;
    this.pixels = null;
    this.estatico = null;
    this.trabalho = null;
  }

  // ------------------------------------------------------------ atualizar --
  atualizar(deltaMs: number, jogador: { x: number; y: number }, direcao: Direcao, mira: { x: number; y: number } | null): void {
    if (!this.canvas || !this.estatico || !this.trabalho) return;
    this.tempo += deltaMs;

    // circuito ligado/desligado desde o ultimo quadro? refaz o estatico
    if (this.assinaturaDosCircuitos() !== this.circuitosVistos) this.recalcular();

    this.tremer();

    const t = this.tamanhoTile;
    const px = jogador.x / t;
    const py = jogador.y / t;
    const comLanterna = this.lanternaLigada();
    const raio = Math.ceil((comLanterna ? LANTERNA.alcance : 3) + FOLGA_DA_JANELA);
    const x0 = Math.max(0, Math.floor(px) - raio);
    const x1 = Math.min(this.largura - 1, Math.floor(px) + raio);
    const y0 = Math.max(0, Math.floor(py) - raio);
    const y1 = Math.min(this.altura - 1, Math.floor(py) + raio);

    // copia o estatico na janela e soma o jogador em cima
    for (let y = y0; y <= y1; y++) {
      const base = y * this.largura;
      for (let x = x0; x <= x1; x++) {
        this.trabalho.valores[base + x] = this.estatico.valores[base + x];
      }
    }
    somarLuzDoJogador(
      this.trabalho,
      { x: px, y: py },
      direcao,
      comLanterna,
      mira,
      (x, y) => this.deps.tileBloqueado(x, y),
    );
    this.escreverJanela(x0, y0, x1, y1, this.trabalho);
  }

  /**
   * A LANTERNA esta ligada?
   *
   * Duas fontes, e as duas valem: o ITEM equipado no cinto (o caminho novo) e a
   * flag `represaLanterna` do save antigo, que a leva anterior usava. Quem ja
   * tinha a lanterna antes desta leva nao perde o facho.
   */
  private lanternaLigada(): boolean {
    if (estado.worldEvents.ativa('represaLanterna')) return estado.equipamento.lanternaAcesa;
    const utilitario = estado.equipamento.equipado('utilitario');
    const naMao = estado.equipamento.naMao;
    const temLanterna = [utilitario, naMao].some(
      (id) => id !== null && comportamentoDe(id)?.acao?.tipo === 'alternar_luz',
    );
    return temLanterna && estado.equipamento.lanternaAcesa;
  }

  /** Tremor sutil das luminarias. Mexe no SPRITE, nao no mapa de luz. */
  private tremer(): void {
    for (const visual of this.lampadas) {
      if (!visual.halo.visible) continue;
      const a = visual.lampada.tipo.tremor;
      if (a <= 0) continue;
      // duas senoides de periodo incomensuravel: da um tremor irregular sem
      // sorteio, e sem sorteio a luz nao pisca diferente a cada reload
      const s = Math.sin(this.tempo / 430 + visual.fase) * 0.6
        + Math.sin(this.tempo / 137 + visual.fase * 2.3) * 0.4;
      visual.halo.setAlpha(1 - a + a * (0.5 + 0.5 * s));
      visual.sprite.setAlpha(1 - a * 0.5 + a * 0.5 * (0.5 + 0.5 * s));
    }
  }

  private escreverTudo(): void {
    if (!this.estatico) return;
    this.escreverJanela(0, 0, this.largura - 1, this.altura - 1, this.estatico);
  }

  /**
   * Escreve os texels de uma janela e reenvia a textura.
   *
   * `putImageData` com retangulo sujo evita reescrever o mapa inteiro; o
   * `refresh` do Phaser reenvia a textura toda, mas a 34x22 texels isso e
   * irrelevante.
   */
  private escreverJanela(x0: number, y0: number, x1: number, y1: number, mapa: MapaDeLuz): void {
    if (!this.canvas || !this.pixels) return;
    const dados = this.pixels.data;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * this.largura + x) * 4;
        const escuro = this.deps.escuridaoNoTile(x, y);
        const luz = mapa.valores[y * this.largura + x];
        const alfa = Math.max(0, Math.min(1, escuro - luz));
        dados[i] = COR_DO_ESCURO.r;
        dados[i + 1] = COR_DO_ESCURO.g;
        dados[i + 2] = COR_DO_ESCURO.b;
        dados[i + 3] = Math.round(alfa * 255);
      }
    }
    const ctx = this.canvas.getContext();
    ctx.putImageData(this.pixels, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    this.canvas.refresh();
  }

  /** Contagem de luminarias acesas e apagadas, pro relatorio de conferencia. */
  contagem(): { total: number; acesas: number; porTipo: Record<string, number> } {
    const porTipo: Record<string, number> = {};
    let acesas = 0;
    for (const l of this.lampadas) {
      porTipo[l.lampada.tipo.id] = (porTipo[l.lampada.tipo.id] ?? 0) + 1;
      if (this.acesa(l.lampada)) acesas += 1;
    }
    return { total: this.lampadas.length, acesas, porTipo };
  }
}

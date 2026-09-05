/**
 * A CENA DO MAPA — o desenho esquematico do mundo.
 *
 * O mapa antigo era o tilemap reduzido com o nome de cada zona escrito no
 * centro dela. Os defeitos vinham todos da mesma decisao: rotulo de 8 px
 * ilegivel, nome por cima de nome, estrada e predio disputando a atencao, o
 * marcador do jogador cobrindo justamente o nome do lugar onde ele esta, e uma
 * tarja preta enorme em volta de tudo.
 *
 * Aqui o mapa e um DESENHO do mundo e nao uma fotografia dele:
 *
 *  - a via sai da camada `caminhos` REDUZIDA numa grade grossa (uma celula a
 *    cada quatro tiles). O detalhe de tile some na reducao, que e o ponto: o que
 *    fica e o traçado, em bloco largo, do jeito que um mapa de turismo desenha;
 *  - o bairro e um poligono com nome, escrito a mao em `DISTRITOS`;
 *  - o lugar e um ICONE de sete pixels por tipo, e nao um retangulo com legenda;
 *  - o NOME so aparece onde cabe. O algoritmo tenta quatro ancoras em volta do
 *    icone e desiste se nenhuma couber sem encostar num rotulo ja posto. O que
 *    fica sem nome continua legivel pelo icone, e ganha o nome ao ser
 *    selecionado;
 *  - o marcador do jogador e um anel, desenhado por ULTIMO e sem rotulo — o
 *    nome do lugar onde ele esta aparece no painel de baixo, que e onde nao
 *    cobre nada.
 *
 * A aba REPRESA nao e mapa: e um navegador de profundidade. Cento e cinquenta
 * andares numa lista sao cento e cinquenta linhas que ninguem le, entao ele
 * mostra quinze faixas de dez e abre uma por vez.
 *
 * ---------------------------------------------------------------------------
 * POR QUE E UMA CENA E NAO UMA CAMADA DA FARMSCENE
 * ---------------------------------------------------------------------------
 * A camera do mundo tem ZOOM (0,83 com o tile de 32). Um objeto com
 * `scrollFactor 0` continua sendo escalado por esse zoom em volta do centro da
 * camera, entao o retangulo de fundo de 480x270 saia desenhado com 400x225 e
 * sobrava uma moldura de mundo em volta do mapa inteiro. Nao havia numero de
 * `fillRect` que resolvesse: o problema e a camera, nao o retangulo.
 *
 * Numa cena propria a camera e outra, com zoom 1, e o mapa cobre a tela porque
 * a tela dele TEM aquele tamanho. De quebra, sai da briga de profundidade com o
 * mundo — que desenha por Y e chega perto de 100.000 em mapa grande.
 */

import Phaser from 'phaser';
import { CONFIG } from '../game/config';
import { COR, FONTE } from '../game/tema';
import * as ui from './ui';
import { estado } from '../game/estado';
import {
  ABAS_DE_MAPA,
  BANDAS_DA_USINA,
  DISTRITOS,
  ESTILO_POR_CLASSE,
} from '../game/mapaEsquematico';
import type { AbaDeMapa, EstiloDeMarco, FormaDeMarco } from '../game/mapaEsquematico';
import { ANDARES_DE_PARADA, buscarAndar, flagDeCheckpoint } from '../game/andares';
import { flagDoEnigma } from '../game/enigmas';
import { MAPAS } from '../game/mapas';
import { buscarNpc, MORADORES_POR_CASA } from '../game/npcs';

/** Um lugar no mapa, ja projetado pra tela. */
interface MarcoDeMapa {
  id: string;
  nome: string;
  estilo: EstiloDeMarco;
  /** centro em tiles do mundo */
  tx: number;
  ty: number;
  /** centro em pixels de tela */
  x: number;
  y: number;
  /** chave do interior, quando o lugar tem um */
  interior: string | null;
}

interface MapaTiledCru {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: {
    name: string;
    data?: number[];
    objects?: { name: string; type?: string; class?: string; x: number; y: number; width: number; height: number }[];
  }[];
}

const QUADRO = { x: 6, y: 30, w: CONFIG.largura - 12, h: CONFIG.altura - 30 - 48 };
/**
 * O rodape de detalhe.
 *
 * Sao QUARENTA pixels e nao trinta: com trinta, o nome do lugar mais duas
 * linhas de corpo passavam da borda de baixo da tela e a ultima saia cortada
 * pela metade. Cabem duas linhas de corpo, e `detalharMarco` nunca escreve mais
 * que duas.
 */
const RODAPE = { x: 6, y: CONFIG.altura - 44, w: CONFIG.largura - 12, h: 40 };
/** Lado da celula da grade grossa, em tiles. Quatro e o que apaga o tile. */
const GRAO = 4;

export class MapaScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private g!: Phaser.GameObjects.Graphics;
  private textos: Phaser.GameObjects.Text[] = [];
  private tituloTexto!: Phaser.GameObjects.Text;
  private abasTexto: Phaser.GameObjects.Text[] = [];
  private detalheNome!: Phaser.GameObjects.Text;
  private detalheCorpo!: Phaser.GameObjects.Text;
  private dica!: Phaser.GameObjects.Text;

  private aba: AbaDeMapa = 'cidade';
  private cursor = 0;
  private bandaAberta: number | null = null;
  private marcos: MarcoDeMapa[] = [];
  /** transformacao do mapa atual: tile do mundo -> pixel de tela */
  private t = { x: 0, y: 0, escala: 1 };
  /** caixas de texto ja postas neste quadro, pra nenhum rotulo cair em cima de outro */
  private ocupados: { x0: number; y0: number; x1: number; y1: number }[] = [];

  constructor() {
    super('MapaScene');
  }

  /** A cena de mundo, de onde saem o tilemap em cache e a posicao do jogador. */
  private get mundo(): Phaser.Scene | null {
    return this.scene.get('FarmScene') ?? null;
  }

  private lerTilemap(chave: string): MapaTiledCru | null {
    const tilemapKey = MAPAS[chave]?.tilemapKey ?? '';
    const cache = this.mundo?.cache.tilemap.get(tilemapKey) as { data?: MapaTiledCru } | undefined;
    return cache?.data ?? null;
  }

  // -------------------------------------------------------------- ciclo --
  create(dados: { aba?: AbaDeMapa } = {}): void {
    this.aba = dados.aba ?? 'cidade';
    this.cursor = 0;
    this.montar();
    this.desenhar();

    const teclado = this.input.keyboard;
    teclado?.on('keydown-M', () => this.pedirFechar());
    teclado?.on('keydown-ESC', () => this.pedirFechar());
    teclado?.on('keydown-Q', () => this.trocarAba(-1));
    teclado?.on('keydown-E', () => this.trocarAba(1));
    teclado?.on('keydown-LEFT', (e: KeyboardEvent) => { e.preventDefault(); this.trocarAba(-1); });
    teclado?.on('keydown-RIGHT', (e: KeyboardEvent) => { e.preventDefault(); this.trocarAba(1); });
    teclado?.on('keydown-UP', (e: KeyboardEvent) => { e.preventDefault(); this.mover(-1); });
    teclado?.on('keydown-DOWN', (e: KeyboardEvent) => { e.preventDefault(); this.mover(1); });
    teclado?.on('keydown-ENTER', () => this.acionar());
  }

  /**
   * Quem fecha o mapa e a FarmScene, e nao esta cena.
   *
   * O estado `mapaAberto` mora la (ele bloqueia o movimento, o tiro e a
   * interacao), e uma cena que se fechasse sozinha deixaria aquele estado
   * mentindo. Aqui so se avisa.
   */
  private pedirFechar(): void {
    this.mundo?.events.emit('fechar-mapa');
  }

  /** Q/E ou clique numa aba. */
  trocarAba(passo: number): void {
    const i = ABAS_DE_MAPA.findIndex((a) => a.id === this.aba);
    this.aba = ABAS_DE_MAPA[(i + passo + ABAS_DE_MAPA.length) % ABAS_DE_MAPA.length].id;
    this.cursor = 0;
    this.bandaAberta = null;
    this.desenhar();
  }

  /** Setas: anda pelos lugares do mapa, ou pelas faixas da usina. */
  mover(passo: number): void {
    const total = this.aba === 'represa' ? this.linhasDaUsina().length : this.marcos.length;
    if (total === 0) return;
    this.cursor = (this.cursor + passo + total) % total;
    this.desenhar();
  }

  /** Enter: abre ou fecha uma faixa de andares. Nos mapas nao faz nada. */
  acionar(): void {
    if (this.aba !== 'represa') return;
    const linha = this.linhasDaUsina()[this.cursor];
    if (linha?.tipo !== 'banda') return;
    this.bandaAberta = this.bandaAberta === linha.banda ? null : linha.banda;
    this.desenhar();
  }

  /** Chamado por quadro enquanto o mapa esta aberto: so o marcador se mexe. */
  atualizar(): void {
    if (this.raiz?.visible) this.desenhar();
  }

  // ------------------------------------------------------------- montagem --
  private montar(): void {
    this.g = this.add.graphics().setScrollFactor(0);
    this.tituloTexto = ui.titulo(this, 10, 3, '');
    this.abasTexto = ABAS_DE_MAPA.map((_, i) =>
      ui.nota(this, 0, 0, '').setScrollFactor(0).setData('i', i));
    this.detalheNome = ui.corpo(this, RODAPE.x + 8, RODAPE.y + 4, '')
      .setColor(COR.lataoVivoTexto);
    this.detalheCorpo = ui.miudo(
      this, RODAPE.x + 8, RODAPE.y + 16, '', RODAPE.w - 16, COR.papelTexto,
    );
    this.dica = ui.nota(
      this, CONFIG.largura - 10, 6,
      '[Q/E] aba  [setas] escolher  [M] fechar',
    ).setOrigin(1, 0);

    this.raiz = this.add
      .container(0, 0, [this.g, this.tituloTexto, ...this.abasTexto, this.detalheNome, this.detalheCorpo, this.dica])
      // O mundo desenha por Y — um NPC no fim do mapa tem depth 3500 — entao o
      // mapa precisa de um numero fora dessa escala pra ficar por cima de tudo.
      .setDepth(100010)
      .setScrollFactor(0);
  }

  private limparTextos(): void {
    for (const t of this.textos) t.destroy();
    this.textos = [];
    this.ocupados = [];
  }

  private escrever(
    x: number, y: number, texto: string, cor: string, tamanho: string = FONTE.nota,
    origem: [number, number] = [0, 0],
  ): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, texto, { fontFamily: FONTE.familia, fontSize: tamanho, color: cor })
      .setOrigin(origem[0], origem[1])
      .setScrollFactor(0);
    this.textos.push(t);
    this.raiz?.add(t);
    return t;
  }

  // -------------------------------------------------------------- desenho --
  private desenhar(): void {
    this.limparTextos();
    this.g.clear();

    // Cobre a tela INTEIRA e opaco: com transparencia o mundo aparece por baixo
    // do mapa, e as duas leituras competem.
    this.g.fillStyle(COR.carvao, 1);
    this.g.fillRect(-4, -4, CONFIG.largura + 8, CONFIG.altura + 8);

    const def = ABAS_DE_MAPA.find((a) => a.id === this.aba)!;
    this.tituloTexto.setText(def.titulo);

    // abas, lado a lado sob o titulo
    let x = 10;
    this.abasTexto.forEach((t, i) => {
      const a = ABAS_DE_MAPA[i];
      const ativa = a.id === this.aba;
      t.setText(a.nome).setPosition(x, 17).setColor(ativa ? COR.lataoVivoTexto : COR.papelFracoTexto);
      this.g.lineStyle(1, ativa ? COR.lataoVivo : COR.madeira, ativa ? 1 : 0.6);
      this.g.strokeRect(x - 3.5, 15.5, t.width + 6, 11);
      x += t.width + 12;
    });

    ui.painel(this.g, QUADRO, false);
    ui.campo(this.g, RODAPE);

    if (this.aba === 'represa') this.desenharUsina();
    else this.desenharMapa(def.mapa!);
  }

  // ------------------------------------------------------- mapa externo --
  private desenharMapa(chave: string): void {
    const mapa = this.lerTilemap(chave);
    if (!mapa) {
      this.escrever(QUADRO.x + 10, QUADRO.y + 10, 'mapa fora do cache', COR.alertaTexto);
      return;
    }
    // a projecao preserva a proporcao do mundo: esticar um mapa 80x140 pra caber
    // num quadro deitado deformaria a cidade inteira
    const escala = Math.min(
      (QUADRO.w - 16) / mapa.width,
      (QUADRO.h - 16) / mapa.height,
    );
    this.t = {
      x: QUADRO.x + (QUADRO.w - mapa.width * escala) / 2,
      y: QUADRO.y + (QUADRO.h - mapa.height * escala) / 2,
      escala,
    };

    // ------------------------------------------------------- fundo verde --
    this.g.fillStyle(0x2a3a26, 1);
    this.g.fillRect(this.t.x, this.t.y, mapa.width * escala, mapa.height * escala);

    // ------------------------------------------------------------ bairros --
    for (const d of DISTRITOS[chave] ?? []) {
      const [dx, dy, dw, dh] = d.rect;
      this.g.fillStyle(COR.papel, 0.05);
      this.g.fillRect(...this.ret(dx, dy, dw, dh));
      this.g.lineStyle(1, COR.papelFraco, 0.22);
      this.g.strokeRect(...this.ret(dx, dy, dw, dh));
      const rotulo = this.escrever(
        this.px(dx + dw / 2), this.py(dy) + 2, d.nome.toUpperCase(),
        COR.papelFracoTexto, FONTE.nota, [0.5, 0],
      ).setAlpha(0.55);
      // O nome do bairro entra na lista de ocupados: sem isso, "Fazenda" caia
      // exatamente em cima de "COLONIA" no mapa rural.
      this.ocupados.push(this.caixaDe(rotulo));
    }

    // --------------------------------------------------------- vias e agua --
    this.desenharGrade(mapa, 'caminhos', 0xb08b5c, 1);

    // ------------------------------------------------------------- marcos --
    this.marcos = this.lerMarcos(mapa, chave);
    this.cursor = Math.min(this.cursor, Math.max(0, this.marcos.length - 1));

    // ROTULOS PRIMEIRO, pra o icone ficar por cima do proprio nome quando eles
    // se encostam — e por isso que o icone nunca some atras de um rotulo.
    const selecionado = this.marcos[this.cursor];
    this.marcos.forEach((m, i) => {
      const ativo = i === this.cursor;
      // SO O SELECIONADO e os lugares PUBLICOS ganham nome. Doze casas de NPC
      // rotuladas "Casa" viram uma nuvem de repeticao no meio do bairro, e o
      // nome nao acrescenta nada: quem e a casa de quem se le no painel de
      // baixo, ao escolher.
      if (!ativo && !m.estilo.publico) return;
      this.rotular(m, ativo);
    });
    for (let i = 0; i < this.marcos.length; i++) {
      this.icone(this.marcos[i], i === this.cursor);
    }

    // ------------------------------------------------------- o jogador --
    this.desenharJogador(chave);

    // ---------------------------------------------------------- detalhe --
    this.detalharMarco(selecionado, chave);
  }

  /**
   * Poe o nome de um marco, ou desiste dele.
   *
   * A caixa e MEDIDA e nao estimada. A primeira versao calculava
   * `texto.length * 5` e errava por baixo — as caixas de "Hospital" e
   * "Farmacia" nao se cruzavam na conta e se cruzavam na tela. Aqui o texto e
   * criado, medido pelo proprio Phaser e MOVIDO pra ancora que couber; se
   * nenhuma couber, ele e destruido e o lugar fica so com o icone.
   *
   * O selecionado nunca desiste: ele e o unico rotulo que o jogador pediu.
   */
  private rotular(m: MarcoDeMapa, ativo: boolean): void {
    const t = this.escrever(
      0, 0, m.estilo.rotulo, ativo ? COR.lataoVivoTexto : COR.papelTexto, FONTE.nota,
    ).setAlpha(ativo ? 1 : 0.8);
    const ancoras: [number, number, number, number][] = [
      [m.x, m.y - 9, 0.5, 1], [m.x, m.y + 9, 0.5, 0],
      [m.x + 8, m.y, 0, 0.5], [m.x - 8, m.y, 1, 0.5],
    ];
    for (const [ax, ay, ox, oy] of ancoras) {
      t.setOrigin(ox, oy).setPosition(ax, ay);
      const caixa = this.caixaDe(t);
      const foraDoQuadro = caixa.x0 < QUADRO.x || caixa.x1 > QUADRO.x + QUADRO.w
        || caixa.y0 < QUADRO.y || caixa.y1 > QUADRO.y + QUADRO.h;
      if (foraDoQuadro && !ativo) continue;
      const bate = this.ocupados.some((o) =>
        caixa.x0 < o.x1 && o.x0 < caixa.x1 && caixa.y0 < o.y1 && o.y0 < caixa.y1);
      if (bate && !ativo) continue;
      this.ocupados.push(caixa);
      return;
    }
    // nenhuma ancora coube: o lugar fica so com o icone, que continua legivel
    this.textos = this.textos.filter((outro) => outro !== t);
    t.destroy();
  }

  /** A caixa que um texto ocupa na tela, com uma folga de um pixel em volta. */
  private caixaDe(t: Phaser.GameObjects.Text): { x0: number; y0: number; x1: number; y1: number } {
    const x0 = t.x - t.width * t.originX - 1;
    const y0 = t.y - t.height * t.originY - 1;
    return { x0, y0, x1: x0 + t.width + 2, y1: y0 + t.height + 2 };
  }

  /**
   * A camada `caminhos` reduzida numa grade de `GRAO` tiles.
   *
   * Uma celula fica cheia quando METADE dela tem caminho. E o que transforma um
   * traçado de tile em bloco largo: passagem de um tile some, avenida fica.
   */
  private desenharGrade(mapa: MapaTiledCru, camada: string, cor: number, alfa: number): void {
    const dados = mapa.layers.find((l) => l.name === camada)?.data;
    if (!dados) return;
    this.g.fillStyle(cor, alfa);
    const lado = GRAO * this.t.escala;
    for (let cy = 0; cy < Math.ceil(mapa.height / GRAO); cy++) {
      for (let cx = 0; cx < Math.ceil(mapa.width / GRAO); cx++) {
        let cheios = 0;
        let total = 0;
        for (let y = cy * GRAO; y < Math.min(mapa.height, (cy + 1) * GRAO); y++) {
          for (let x = cx * GRAO; x < Math.min(mapa.width, (cx + 1) * GRAO); x++) {
            total++;
            if (dados[y * mapa.width + x] !== 0) cheios++;
          }
        }
        if (total > 0 && cheios / total >= 0.5) {
          this.g.fillRect(this.px(cx * GRAO), this.py(cy * GRAO), lado + 0.6, lado + 0.6);
        }
      }
    }
  }

  /** Le a camada `zonas` e vira lista de marco, ja projetada. */
  private lerMarcos(mapa: MapaTiledCru, chave: string): MarcoDeMapa[] {
    const zonas = mapa.layers.find((l) => l.name === 'zonas')?.objects ?? [];
    const saida: MarcoDeMapa[] = [];
    for (const z of zonas) {
      const classe = (z.type || z.class || '') as string;
      const estilo = ESTILO_POR_CLASSE[classe];
      if (!estilo) continue;
      const tx = (z.x + z.width / 2) / mapa.tilewidth;
      const ty = (z.y + z.height / 2) / mapa.tileheight;
      // DESCOBERTA (Parte 40): o que e publico aparece desde o comeco; o que e
      // casa dos outros so depois de o jogador ter entrado nela alguma vez. Nao
      // e obstaculo de navegacao — a via e o bairro continuam desenhados.
      const interior = MAPAS[z.name] ? z.name : null;
      const visitado = !interior || estado.worldEvents.ativa(`visitou_${interior}`);
      saida.push({
        id: z.name,
        nome: estilo.publico || visitado ? this.nomeDoMarco(z.name, estilo) : '?????',
        estilo,
        tx,
        ty,
        x: this.px(tx),
        y: this.py(ty),
        interior,
      });
    }
    void chave;
    return saida.sort((a, b) => a.ty - b.ty || a.tx - b.tx);
  }

  private nomeDoMarco(id: string, estilo: EstiloDeMarco): string {
    const titular = MORADORES_POR_CASA[id];
    if (titular) return `Casa d${buscarNpc(titular)?.nome ? 'a ' : 'e '}${buscarNpc(titular)?.nome ?? titular}`;
    return estilo.rotulo;
  }

  /** Icone de sete pixels, uma forma por grupo. */
  private icone(m: MarcoDeMapa, ativo: boolean): void {
    const { x, y } = m;
    const cor = m.nome === '?????' ? COR.papelFraco : m.estilo.cor;
    if (ativo) {
      this.g.lineStyle(1, COR.lataoVivo, 1);
      this.g.strokeCircle(x, y, 7);
    }
    this.g.fillStyle(COR.carvao, 0.85);
    this.g.fillCircle(x, y, 5);
    this.g.fillStyle(cor, 1);
    const f: FormaDeMarco = m.nome === '?????' ? 'casa' : m.estilo.forma;
    switch (f) {
      case 'casa':
        this.g.fillRect(x - 2, y - 1, 5, 4);
        this.g.fillTriangle(x - 3, y - 1, x + 0.5, y - 4, x + 4, y - 1);
        break;
      case 'loja':
        this.g.fillRect(x - 3, y - 1, 7, 4);
        this.g.fillRect(x - 3, y - 3, 7, 2);
        break;
      case 'publico':
        this.g.fillRect(x - 3, y + 1, 7, 2);
        this.g.fillRect(x - 2, y - 2, 1, 3);
        this.g.fillRect(x + 0, y - 2, 1, 3);
        this.g.fillRect(x + 2, y - 2, 1, 3);
        this.g.fillTriangle(x - 4, y - 2, x + 0.5, y - 5, x + 4, y - 2);
        break;
      case 'arvore':
        this.g.fillRect(x - 0.5, y, 2, 3);
        this.g.fillCircle(x + 0.5, y - 2, 3);
        break;
      case 'industria':
        this.g.fillRect(x - 3, y - 1, 7, 4);
        this.g.fillRect(x + 1, y - 4, 2, 3);
        break;
      case 'agua':
        this.g.fillRect(x - 3, y - 2, 7, 1);
        this.g.fillRect(x - 3, y + 0, 7, 1);
        this.g.fillRect(x - 3, y + 2, 7, 1);
        break;
    }
  }

  /**
   * O MARCADOR DO JOGADOR: um anel, por ultimo, sem rotulo.
   *
   * Sem rotulo de proposito — era exatamente o texto do marcador que cobria o
   * nome do lugar em que o jogador estava. Onde ele esta se le no painel de
   * baixo, que nao cobre nada.
   */
  private desenharJogador(chave: string): void {
    const aqui = MAPAS[estado.mapa];
    const externo = aqui?.mapaExterno ?? estado.mapa;
    if (externo !== chave) return;
    const pos = this.posicaoDoJogador();
    if (!pos) return;
    const x = this.px(pos.x);
    const y = this.py(pos.y);
    this.g.lineStyle(2, COR.alerta, 1);
    this.g.strokeCircle(x, y, 4);
    this.g.lineStyle(1, COR.papel, 0.9);
    this.g.strokeCircle(x, y, 6.5);
  }

  /**
   * Onde desenhar o jogador, em TILES do mapa externo.
   *
   * Dentro de um predio o jogador nao esta no mapa externo, e projetar a
   * coordenada dele daria um ponto no meio do nada. O que se usa e a ZONA do
   * predio em que ele esta — no mapa da cidade, "voce esta no mercado" e a
   * informacao certa.
   */
  private posicaoDoJogador(): { x: number; y: number } | null {
    const aqui = MAPAS[estado.mapa];
    if (!aqui) return null;
    if (aqui.mapaExterno === estado.mapa) {
      const jogador = this.posicaoNoMundo();
      return jogador;
    }
    const marco = this.marcos.find((m) => m.interior === estado.mapa);
    return marco ? { x: marco.tx, y: marco.ty } : null;
  }

  /**
   * A posicao do jogador em TILES, lida da cena de mundo.
   *
   * A cena de mundo continua sendo a dona do sprite; o mapa so pergunta. Passar
   * a coordenada por `scene.launch` congelaria o marcador no valor da abertura.
   */
  private posicaoNoMundo(): { x: number; y: number } | null {
    const f = this.mundo as unknown as { player?: { x: number; y: number }; tamanhoTile?: number };
    if (!f?.player || !f.tamanhoTile) return null;
    return { x: f.player.x / f.tamanhoTile, y: f.player.y / f.tamanhoTile };
  }

  private detalharMarco(m: MarcoDeMapa | undefined, chave: string): void {
    if (!m) {
      this.detalheNome.setText('—');
      this.detalheCorpo.setText('Nenhum lugar selecionado.');
      return;
    }
    const aqui = MAPAS[estado.mapa]?.mapaExterno === chave
      && (estado.mapa === m.interior || estado.mapa === chave);
    this.detalheNome.setText(m.nome === '?????' ? 'Lugar nao visitado' : m.nome);
    const titular = MORADORES_POR_CASA[m.id];
    const moradores = titular ? [buscarNpc(titular)?.nome ?? titular] : [];
    const linhas = [
      `${m.estilo.rotulo}  ·  ${ABAS_DE_MAPA.find((a) => a.mapa === chave)?.nome ?? ''}`,
      m.nome === '?????'
        ? 'Voce ainda nao entrou aqui.'
        : moradores.length > 0
          ? `Moram aqui: ${moradores.join(', ')}`
          : m.interior
            ? 'Tem interior: da pra entrar.'
            : 'Area externa.',
    ];
    if (aqui && estado.mapa === m.interior) linhas[1] = 'Voce esta aqui.';
    // DUAS linhas, sempre: a terceira nao cabe no rodape e saia cortada.
    this.detalheCorpo.setText(linhas.slice(0, 2).join('\n'));
  }

  // ------------------------------------------------------- aba da usina --
  private linhasDaUsina(): ({ tipo: 'banda'; banda: number } | { tipo: 'andar'; andar: number })[] {
    const saida: ({ tipo: 'banda'; banda: number } | { tipo: 'andar'; andar: number })[] = [];
    BANDAS_DA_USINA.forEach((b, i) => {
      saida.push({ tipo: 'banda', banda: i });
      if (this.bandaAberta === i) {
        for (let a = b.de; a <= b.ate; a++) saida.push({ tipo: 'andar', andar: a });
      }
    });
    return saida;
  }

  private desenharUsina(): void {
    const linhas = this.linhasDaUsina();
    this.cursor = Math.min(this.cursor, linhas.length - 1);
    const visiveis = 13;
    const topo = Math.max(0, Math.min(this.cursor - Math.floor(visiveis / 2), linhas.length - visiveis));
    const fundo = estado.represa.andarMaisFundo;

    this.escrever(
      QUADRO.x + 10, QUADRO.y + 6,
      `mais fundo alcancado: andar ${fundo}`, COR.papelFracoTexto,
    );

    for (let i = 0; i < visiveis; i++) {
      const linha = linhas[topo + i];
      if (!linha) break;
      const y = QUADRO.y + 20 + i * 12;
      const ativo = topo + i === this.cursor;
      if (linha.tipo === 'banda') {
        const b = BANDAS_DA_USINA[linha.banda];
        const visitados = Math.max(0, Math.min(10, fundo - b.de + 1));
        const marca = this.bandaAberta === linha.banda ? '-' : '+';
        this.escrever(
          QUADRO.x + 12, y,
          `[${marca}] ANDARES ${String(b.de).padStart(3, '0')} A ${String(b.ate).padStart(3, '0')}`,
          ativo ? COR.lataoVivoTexto : COR.papelTexto, FONTE.corpo,
        );
        // barra de progresso da faixa: dez tracos, um por andar visitado
        this.g.fillStyle(visitados > 0 ? COR.latao : COR.carvaoClaro, 1);
        for (let k = 0; k < 10; k++) {
          this.g.fillStyle(k < visitados ? COR.latao : COR.carvaoClaro, 1);
          this.g.fillRect(QUADRO.x + QUADRO.w - 90 + k * 8, y + 3, 6, 5);
        }
        continue;
      }
      const a = linha.andar;
      const def = buscarAndar(a);
      const visitado = a <= fundo;
      const parada = ANDARES_DE_PARADA.includes(a)
        && estado.worldEvents.ativa(flagDeCheckpoint(a));
      const enigma = estado.worldEvents.ativa(flagDoEnigma(a));
      const ficha = estado.arquivo.tem(a);
      // O ROTULO do andar e conteudo de historia: nao se entrega antes de chegar.
      const nome = visitado ? (def?.rotulo ?? '') : '?????';
      this.escrever(
        QUADRO.x + 28, y,
        `${String(a).padStart(3, '0')}  ${nome}`,
        ativo ? COR.lataoVivoTexto : visitado ? COR.papelTexto : COR.papelFracoTexto,
        FONTE.corpo,
      );
      const selo = [
        parada ? 'elevador' : '',
        enigma ? 'painel' : '',
        ficha ? 'documento' : '',
      ].filter(Boolean).join(' · ');
      if (selo) {
        this.escrever(QUADRO.x + QUADRO.w - 12, y + 1, selo, COR.verdeTexto, FONTE.nota, [1, 0]);
      }
    }

    const linha = linhas[this.cursor];
    if (linha?.tipo === 'banda') {
      const b = BANDAS_DA_USINA[linha.banda];
      this.detalheNome.setText(`Andares ${b.de} a ${b.ate}`);
      this.detalheCorpo.setText(
        'Enter abre e fecha a faixa. O elevador so para em andar ja ativado no proprio andar.',
      );
    } else if (linha) {
      const def = buscarAndar(linha.andar);
      const visitado = linha.andar <= fundo;
      this.detalheNome.setText(
        visitado ? `Andar ${linha.andar} — ${def?.rotulo}` : `Andar ${linha.andar}`,
      );
      this.detalheCorpo.setText(
        visitado
          ? `${def?.escuridao ? `escuridao ${def.escuridao.toFixed(2)}` : ''}   `
            + `${def?.parada ? 'parada de elevador' : ''}`
          : 'Voce ainda nao desceu ate aqui.',
      );
    }
  }

  // ------------------------------------------------------------ projecao --
  private px(tx: number): number {
    return this.t.x + tx * this.t.escala;
  }

  private py(ty: number): number {
    return this.t.y + ty * this.t.escala;
  }

  private ret(x: number, y: number, w: number, h: number): [number, number, number, number] {
    return [this.px(x), this.py(y), w * this.t.escala, h * this.t.escala];
  }
}

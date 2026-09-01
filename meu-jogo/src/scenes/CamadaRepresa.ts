import Phaser from 'phaser';
import { estado } from '../game/estado';
import { UI } from '../game/config';
import {
  ATAQUE_DO_JOGADOR,
  CATALOGO_INIMIGOS,
  EMPURRAO_DO_INIMIGO,
  buscarInimigo,
  criarRuntimeInimigo,
  decidirInimigo,
  ferirInimigo,
} from '../game/inimigos';
import type { DefinicaoInimigo, EstadoRuntimeInimigo } from '../game/inimigos';
import { FLAG_LANTERNA, RAIO_DE_LUZ, naRepresa, setorDaRepresa } from '../game/represa';
import { buscarTabelaDeSucata, sortearSucata } from '../game/sucata';
import type { Direcao } from '../game/tipos';

/**
 * CAMADA DA REPRESA — escuridao, inimigos e combate.
 *
 * Isto NAO e uma segunda cena nem um segundo motor: e um componente da
 * `FarmScene`, criado no `create` dela e destruido no restart, que cuida das
 * tres coisas que so existem dentro da usina. Ficou separado por tamanho, nao
 * por arquitetura — a FarmScene ja tem 2800 linhas, e enfiar IA de inimigo,
 * vinheta de luz e caixa de golpe no meio dela deixaria os dois ilegiveis.
 *
 * Fora da represa a camada nao faz NADA: `montar` sai na primeira linha se o
 * mapa nao for da usina, e `atualizar` idem. Nenhum mapa antigo paga por ela.
 */

/**
 * Tamanho da textura de vinheta, em px, e onde o buraco de luz comeca/acaba
 * como fracao do meio-lado.
 *
 * A textura e gerada UMA vez e depois so escalada: o raio de luz muda (com a
 * lanterna, e por comodo) e regerar canvas a cada mudanca seria desperdicio.
 * O buraco pequeno (0.18) e o que garante que a parte OPACA cubra a tela toda
 * mesmo com o raio de luz grande — a imagem fica ~5,5x o raio de cada lado.
 */
const VINHETA = { lado: 384, raioLuz: 0.18, raioCheio: 0.34 };

/** Duracao do piscar do jogador ao tomar dano, em ms. */
const PISCAR_MS = 180;

interface InimigoVisual {
  runtime: EstadoRuntimeInimigo;
  def: DefinicaoInimigo;
  sprite: Phaser.Physics.Arcade.Sprite;
  /** ultima animacao aplicada, pra nao remandar a mesma por frame */
  animacao: string;
}

export interface DependenciasCamada {
  /** true quando o tile (em TILES) barra movimento */
  tileBloqueado(tx: number, ty: number): boolean;
  /** escuridao do tile, 0 a 1 (vem dos comodos do tilemap) */
  escuridaoNoTile(tx: number, ty: number): number;
  /** mostra uma fala curta na caixa de dialogo */
  falar(linhas: string[], nome?: string): void;
  /** chamado quando a vida chega a zero */
  aoSerDerrotado(): void;
}

export class CamadaRepresa {
  private cena: Phaser.Scene;
  private tamanhoTile: number;
  private deps: DependenciasCamada;

  private inimigos: InimigoVisual[] = [];
  private vinheta: Phaser.GameObjects.Image | null = null;
  private luzes: Phaser.GameObjects.Graphics | null = null;
  private escuridaoAtual = 0;
  private escuridaoAlvo = 0;

  /** ms restantes da trava de animacao do golpe do jogador */
  private golpeAtivo = 0;
  /** ms restantes da recarga do golpe */
  private recargaGolpe = 0;
  private arcoDoGolpe: Phaser.GameObjects.Graphics | null = null;

  constructor(cena: Phaser.Scene, tamanhoTile: number, deps: DependenciasCamada) {
    this.cena = cena;
    this.tamanhoTile = tamanhoTile;
    this.deps = deps;
  }

  /** true quando o jogador esta preso na animacao do golpe (nao anda). */
  get atacando(): boolean {
    return this.golpeAtivo > 0;
  }

  get temInimigos(): boolean {
    return this.inimigos.some((i) => i.runtime.hp > 0);
  }

  /** Inimigos vivos, pra colisao e pra HUD. */
  get spritesDeInimigo(): Phaser.Physics.Arcade.Sprite[] {
    return this.inimigos.map((i) => i.sprite);
  }

  // ------------------------------------------------------------- montagem --
  montar(map: Phaser.Tilemaps.Tilemap, player: Phaser.Physics.Arcade.Sprite): void {
    if (!naRepresa(estado.mapa)) return;
    this.criarVinheta(player);
    this.criarLuzesDeEmergencia(map);
    this.criarInimigos(map);
  }

  private criarVinheta(player: Phaser.Physics.Arcade.Sprite): void {
    const setor = setorDaRepresa(estado.mapa);
    // o mapa externo da represa nao escurece: ele e dia aberto
    if (!setor) return;
    const chave = 'represa-vinheta';
    if (!this.cena.textures.exists(chave)) {
      const canvas = this.cena.textures.createCanvas(chave, VINHETA.lado, VINHETA.lado);
      const ctx = canvas?.getContext();
      if (canvas && ctx) {
        const meio = VINHETA.lado / 2;
        const gradiente = ctx.createRadialGradient(meio, meio, 0, meio, meio, meio);
        // 5,7,12 e o escuro do jogo: preto puro mata a leitura da arte
        gradiente.addColorStop(VINHETA.raioLuz, 'rgba(5,7,12,0)');
        gradiente.addColorStop(VINHETA.raioCheio, 'rgba(5,7,12,0.82)');
        gradiente.addColorStop(1, 'rgba(5,7,12,1)');
        ctx.fillStyle = gradiente;
        ctx.fillRect(0, 0, VINHETA.lado, VINHETA.lado);
        canvas.refresh();
      }
    }
    this.escuridaoAtual = setor.escuridao;
    this.escuridaoAlvo = setor.escuridao;
    this.vinheta = this.cena.add
      .image(player.x, player.y, chave)
      .setDepth(90000)
      .setAlpha(setor.escuridao);
    this.aplicarRaioDeLuz();
  }

  /**
   * Escala a vinheta pra que o buraco transparente tenha o raio de luz atual.
   * Sem lanterna o raio e menor, e a mesma textura serve pros dois casos.
   */
  private aplicarRaioDeLuz(): void {
    if (!this.vinheta) return;
    const tiles = estado.worldEvents.ativa(FLAG_LANTERNA)
      ? RAIO_DE_LUZ.comLanterna
      : RAIO_DE_LUZ.base;
    const raioPx = tiles * this.tamanhoTile;
    // (lado/2) * raioLuz = raioPx  =>  escala = raioPx / (lado/2 * raioLuz)
    const escala = raioPx / ((VINHETA.lado / 2) * VINHETA.raioLuz);
    this.vinheta.setScale(escala);
  }

  /**
   * Lampadas de emergencia, paineis acesos e faisca: sao MARCOS. Ficam ACIMA da
   * vinheta com mistura aditiva, entao no escuro elas aparecem de longe e dao
   * ao jogador uma referencia de onde ele esta — que e o que separa escuridao
   * tensa de escuridao chata.
   */
  private criarLuzesDeEmergencia(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('luzes');
    if (!camada) return;
    const t = this.tamanhoTile;
    const g = this.cena.add.graphics().setDepth(90001);
    g.setBlendMode(Phaser.BlendModes.ADD);
    for (const obj of camada.objects) {
      const props = Object.fromEntries(
        (obj.properties ?? []).map((p: { name: string; value: unknown }) => [p.name, p.value]),
      );
      const raio = Math.max(1, Number(props.raio) || 2) * t;
      const x = (obj.x ?? 0) + (obj.width ?? 0) / 2;
      const y = (obj.y ?? 0) + (obj.height ?? 0) / 2;
      // tres circulos concentricos fracos: da um halo com queda suave sem
      // precisar de shader nem de outra textura
      g.fillStyle(0xffd9a0, 0.1);
      g.fillCircle(x, y, raio);
      g.fillStyle(0xffd9a0, 0.09);
      g.fillCircle(x, y, raio * 0.62);
      g.fillStyle(0xfff0d0, 0.1);
      g.fillCircle(x, y, raio * 0.3);
    }
    this.luzes = g;
  }

  private criarInimigos(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('inimigos');
    if (!camada) return;
    const t = this.tamanhoTile;
    for (const obj of camada.objects) {
      const props = Object.fromEntries(
        (obj.properties ?? []).map((p: { name: string; value: unknown }) => [p.name, p.value]),
      );
      const def = buscarInimigo(props.tipo);
      if (!def) {
        console.warn(`[inimigo] tipo desconhecido em "${obj.name}":`, props.tipo);
        continue;
      }
      const tx = ((obj.x ?? 0) + (obj.width ?? 0) / 2) / t;
      const ty = ((obj.y ?? 0) + (obj.height ?? 0) / 2) / t;
      const runtime = criarRuntimeInimigo(
        obj.name || `${def.id}_${this.inimigos.length}`,
        def.id,
        tx,
        ty,
        Number(props.raio) || 4,
      );
      const sprite = this.cena.physics.add.sprite(
        tx * t,
        ty * t,
        `monstro-${def.id}-parado`,
        'down-0',
      );
      // a escala sai da ALTURA desejada em tiles: a arte de monstro tem 320 px
      // de celula, como a de NPC, entao a conta e a mesma
      const escala = (def.alturaTiles * t) / sprite.height;
      sprite.setScale(escala);
      sprite.setOrigin(0.5, 0.85);
      sprite.setDepth(sprite.y);
      sprite.body?.setSize(sprite.width * 0.42, sprite.height * 0.22);
      sprite.setCollideWorldBounds(true);
      this.inimigos.push({ runtime, def, sprite, animacao: '' });
    }
  }

  destruir(): void {
    for (const i of this.inimigos) i.sprite.destroy();
    this.inimigos = [];
    this.vinheta?.destroy();
    this.vinheta = null;
    this.luzes?.destroy();
    this.luzes = null;
    this.arcoDoGolpe?.destroy();
    this.arcoDoGolpe = null;
  }

  // ------------------------------------------------------------- atualizar --
  /**
   * Um passo da camada. `pausado` vem true com menu/dialogo aberto: nesse caso
   * a escuridao continua sendo desenhada (senao a tela clareia atras do menu),
   * mas ninguem anda e ninguem golpeia.
   */
  atualizar(
    deltaMs: number,
    player: Phaser.Physics.Arcade.Sprite,
    pausado: boolean,
  ): void {
    if (!naRepresa(estado.mapa)) return;
    this.atualizarEscuridao(deltaMs, player);
    if (this.golpeAtivo > 0) this.golpeAtivo = Math.max(0, this.golpeAtivo - deltaMs);
    if (this.recargaGolpe > 0) this.recargaGolpe = Math.max(0, this.recargaGolpe - deltaMs);
    if (pausado) {
      for (const i of this.inimigos) i.sprite.setVelocity(0, 0);
      return;
    }
    this.atualizarInimigos(deltaMs, player);
  }

  private atualizarEscuridao(deltaMs: number, player: Phaser.Physics.Arcade.Sprite): void {
    if (!this.vinheta) return;
    this.vinheta.setPosition(player.x, player.y);
    const t = this.tamanhoTile;
    const alvo = this.deps.escuridaoNoTile(Math.floor(player.x / t), Math.floor(player.y / t));
    if (Number.isFinite(alvo)) this.escuridaoAlvo = alvo;
    // transicao suave entre comodos de escuridao diferente: sem isto, passar de
    // uma galeria pro corredor de servico daria um piscar seco
    const passo = Math.min(1, deltaMs / 420);
    this.escuridaoAtual += (this.escuridaoAlvo - this.escuridaoAtual) * passo;
    this.vinheta.setAlpha(this.escuridaoAtual);
    this.aplicarRaioDeLuz();
  }

  private atualizarInimigos(deltaMs: number, player: Phaser.Physics.Arcade.Sprite): void {
    const t = this.tamanhoTile;
    const jogador = { x: player.x / t, y: player.y / t };
    const dificuldade = estado.represa.dificuldade;
    const podeVer = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
      this.linhaLivre(a, b);

    for (const alvo of this.inimigos) {
      const { runtime, def, sprite } = alvo;
      if (runtime.hp <= 0) {
        if (sprite.active) {
          sprite.setVelocity(0, 0);
          sprite.disableBody(true, true);
        }
        continue;
      }
      runtime.x = sprite.x / t;
      runtime.y = sprite.y / t;

      const decisao = decidirInimigo(runtime, def, jogador, deltaMs, dificuldade, podeVer);

      if (decisao.golpeia) {
        const r = estado.vida.receberDano(def.dano);
        if (r.aplicado > 0) {
          this.piscar(player);
          // empurrao: separa os corpos, senao o proximo golpe sai na cara
          const dx = player.x - sprite.x;
          const dy = player.y - sprite.y;
          const norma = Math.hypot(dx, dy) || 1;
          player.setVelocity(
            (dx / norma) * EMPURRAO_DO_INIMIGO * t,
            (dy / norma) * EMPURRAO_DO_INIMIGO * t,
          );
          if (r.derrotou) this.deps.aoSerDerrotado();
        }
      }

      if (decisao.destino && decisao.velocidade > 0) {
        const dx = decisao.destino.x * t - sprite.x;
        const dy = decisao.destino.y * t - sprite.y;
        const norma = Math.hypot(dx, dy);
        if (norma > 1) {
          const v = decisao.velocidade * t;
          sprite.setVelocity((dx / norma) * v, (dy / norma) * v);
          runtime.direcao = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
        } else {
          sprite.setVelocity(0, 0);
        }
      } else {
        sprite.setVelocity(0, 0);
      }

      const andando = decisao.estado === 'perseguindo' || decisao.estado === 'patrulha'
        || decisao.estado === 'alerta';
      const animacao = `monstro-${def.id}-${andando ? 'walk' : 'idle'}-${runtime.direcao}`;
      if (alvo.animacao !== animacao) {
        alvo.animacao = animacao;
        sprite.anims.play(animacao, true);
      }
      // vermelho enquanto reage ao golpe: e o unico retorno visual de que o
      // ataque acertou, e sem ele o combate parece nao registrar
      sprite.setTint(runtime.atingido > 0 ? 0xff8a7a : 0xffffff);
      sprite.setDepth(sprite.y);
    }
  }

  /** Reta livre entre dois pontos em TILES — a linha de visao do inimigo. */
  private linhaLivre(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    const passos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
    for (let i = 1; i < passos; i++) {
      const x = a.x + ((b.x - a.x) * i) / passos;
      const y = a.y + ((b.y - a.y) * i) / passos;
      if (this.deps.tileBloqueado(Math.floor(x), Math.floor(y))) return false;
    }
    return true;
  }

  private piscar(player: Phaser.Physics.Arcade.Sprite): void {
    player.setTintFill(0xffffff);
    this.cena.time.delayedCall(PISCAR_MS, () => player.clearTint());
  }

  // --------------------------------------------------------------- combate --
  /**
   * Golpe do jogador com a chave inglesa.
   *
   * A area e um RETANGULO a frente da direcao em que ele olha, e nao um circulo
   * em volta dele: girar e bater teria de acertar quem esta atras, o que faria o
   * combate virar "encoste e segure". Devolve quantos inimigos foram atingidos.
   */
  atacar(player: Phaser.Physics.Arcade.Sprite, direcao: Direcao): number {
    if (!naRepresa(estado.mapa)) return 0;
    if (this.recargaGolpe > 0 || this.golpeAtivo > 0) return 0;
    this.golpeAtivo = ATAQUE_DO_JOGADOR.duracao;
    this.recargaGolpe = ATAQUE_DO_JOGADOR.recarga;

    const t = this.tamanhoTile;
    const vetor = direcao === 'left'
      ? { x: -1, y: 0 }
      : direcao === 'right'
        ? { x: 1, y: 0 }
        : direcao === 'up'
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };
    const alcance = ATAQUE_DO_JOGADOR.alcance * t;
    const meia = ATAQUE_DO_JOGADOR.meiaLargura * t;
    const centro = { x: player.x + vetor.x * alcance * 0.55, y: player.y + vetor.y * alcance * 0.55 };
    const largura = vetor.x !== 0 ? alcance : meia * 2;
    const altura = vetor.y !== 0 ? alcance : meia * 2;

    this.desenharArco(centro, largura, altura);

    let atingidos = 0;
    for (const alvo of this.inimigos) {
      if (alvo.runtime.hp <= 0) continue;
      const dentro =
        Math.abs(alvo.sprite.x - centro.x) <= largura / 2 + alvo.sprite.displayWidth * 0.2 &&
        Math.abs(alvo.sprite.y - centro.y) <= altura / 2 + alvo.sprite.displayHeight * 0.2;
      if (!dentro) continue;
      const r = ferirInimigo(alvo.runtime, alvo.def, ATAQUE_DO_JOGADOR.dano);
      if (r.aplicado <= 0) continue;
      atingidos += 1;
      // empurrao no inimigo: mesma razao do empurrao no jogador
      const dx = alvo.sprite.x - player.x;
      const dy = alvo.sprite.y - player.y;
      const norma = Math.hypot(dx, dy) || 1;
      alvo.sprite.setVelocity(
        (dx / norma) * ATAQUE_DO_JOGADOR.empurrao * t,
        (dy / norma) * ATAQUE_DO_JOGADOR.empurrao * t,
      );
      if (r.morreu) this.derrubar(alvo);
    }
    return atingidos;
  }

  private desenharArco(centro: { x: number; y: number }, largura: number, altura: number): void {
    this.arcoDoGolpe?.destroy();
    const g = this.cena.add.graphics().setDepth(89000);
    g.fillStyle(0xfff0c0, 0.32);
    g.fillRect(centro.x - largura / 2, centro.y - altura / 2, largura, altura);
    this.arcoDoGolpe = g;
    this.cena.time.delayedCall(ATAQUE_DO_JOGADOR.duracao, () => {
      if (this.arcoDoGolpe === g) this.arcoDoGolpe = null;
      g.destroy();
    });
  }

  /**
   * Morte de um inimigo: some com esmaecimento e sorteia o drop UMA vez.
   *
   * O drop entra pelo `inventario` normal. Quando ele nao cabe, o item some em
   * vez de ficar no chao — e uma perda, mas e a mesma regra do resto do jogo
   * (ver `coletarItem`), e inventar item no chao aqui abriria um caminho de
   * persistencia que nada mais usa.
   */
  private derrubar(alvo: InimigoVisual): void {
    const { def, sprite } = alvo;
    sprite.setVelocity(0, 0);
    this.cena.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 320,
      onComplete: () => sprite.disableBody(true, true),
    });
    if (Math.random() > def.chanceDrop) return;
    const tabela = buscarTabelaDeSucata(def.tabelaDrop);
    if (!tabela) return;
    for (const peca of sortearSucata(tabela)) {
      const sobrou = estado.inventario.adicionar(peca.id, peca.quantidade);
      const entrou = peca.quantidade - sobrou;
      if (entrou > 0) estado.represa.registrarSalvado(peca.id, entrou);
    }
  }

  /** Contagem de inimigos vivos por tipo, pro relatorio de conferencia. */
  contagem(): Record<string, number> {
    const saida: Record<string, number> = {};
    for (const i of this.inimigos) {
      if (i.runtime.hp <= 0) continue;
      saida[i.def.id] = (saida[i.def.id] ?? 0) + 1;
    }
    return saida;
  }

  /** Rotulo de HUD do setor atual, ou null fora da usina. */
  static rotuloDeSetor(): string | null {
    const setor = setorDaRepresa(estado.mapa);
    if (!setor) return null;
    return `${setor.rotulo}  (nivel ${setor.nivel})`;
  }

  /** Cor do texto de tensao, pro aviso da HUD. */
  static corDaTensao(tensao: number): string {
    if (tensao < 0.34) return UI.textoFraco;
    if (tensao < 0.67) return UI.destaque;
    return UI.alerta;
  }
}

/** Tipos de inimigo declarados no catalogo — usado pelo BootScene pra carregar. */
export const IDS_DE_INIMIGO = Object.keys(CATALOGO_INIMIGOS);

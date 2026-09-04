import Phaser from 'phaser';
import { estado } from '../game/estado';
import {
  ATAQUE_DO_JOGADOR,
  EMPURRAO_DO_INIMIGO,
  buscarInimigo,
  criarRuntimeInimigo,
  decidirInimigo,
  ferirInimigo,
} from '../game/inimigos';
import type { DefinicaoInimigo, EstadoRuntimeInimigo } from '../game/inimigos';
import { naRepresa } from '../game/represa';
import { avancarProjetil } from '../game/armas';
import type { EstadoProjetil, Tiro } from '../game/armas';
import { buscarTabelaDeSucata, sortearSucata } from '../game/sucata';
import type { Direcao } from '../game/tipos';

/**
 * CAMADA DA REPRESA — inimigos, projeteis e combate.
 *
 * Isto NAO e uma segunda cena nem um segundo motor: e um componente da
 * `FarmScene`, criado no `create` dela e destruido no restart, que cuida do que
 * so existe dentro da usina. Ficou separado por tamanho, nao por arquitetura — a
 * FarmScene ja tem tres mil linhas, e enfiar IA de inimigo, voo de projetil e
 * caixa de golpe no meio dela deixaria os dois ilegiveis.
 *
 * A ESCURIDAO saiu daqui nesta leva: ela era uma vinheta radial presa ao
 * jogador, e virou um mapa de luz com oclusao de parede em `CamadaLuz` (ver o
 * cabecalho de la).
 *
 * Fora da represa a camada nao faz NADA: `montar` sai na primeira linha se o
 * mapa nao for da usina, e `atualizar` idem. Nenhum mapa antigo paga por ela.
 */

/** Duracao do piscar do jogador ao tomar dano, em ms. */
const PISCAR_MS = 180;

/** Um projetil em voo: a regra em `armas.ts`, o sprite aqui. */
interface ProjetilVisual {
  runtime: EstadoProjetil;
  sprite: Phaser.GameObjects.Image;
}

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
  /** chamado quando a vida chega a zero */
  aoSerDerrotado(): void;
}

export class CamadaRepresa {
  private cena: Phaser.Scene;
  private tamanhoTile: number;
  private deps: DependenciasCamada;

  private inimigos: InimigoVisual[] = [];

  /** ms restantes da trava de animacao do golpe do jogador */
  private golpeAtivo = 0;
  /** ms restantes da recarga do golpe */
  private recargaGolpe = 0;
  private arcoDoGolpe: Phaser.GameObjects.Graphics | null = null;

  private projeteis: ProjetilVisual[] = [];
  /** contador so pra dar id unico a cada projetil */
  private tirosDados = 0;

  constructor(cena: Phaser.Scene, tamanhoTile: number, deps: DependenciasCamada) {
    this.cena = cena;
    this.tamanhoTile = tamanhoTile;
    this.deps = deps;
  }

  /** true quando o jogador esta preso na animacao do golpe (nao anda). */
  get atacando(): boolean {
    return this.golpeAtivo > 0;
  }

  /** Inimigos vivos, pra colisao e pra HUD. */
  get spritesDeInimigo(): Phaser.Physics.Arcade.Sprite[] {
    return this.inimigos.map((i) => i.sprite);
  }

  // ------------------------------------------------------------- montagem --
  montar(map: Phaser.Tilemaps.Tilemap): void {
    if (!naRepresa(estado.mapa)) return;
    this.criarInimigos(map);
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

  // ---------------------------------------------- ganchos de depuracao --
  /**
   * Estado de depuracao vindo do painel de desenvolvimento.
   *
   * A camada guarda, mas so ela sabe o que fazer com cada chave: `aggro`
   * desenha o raio de deteccao e `congelado` para a IA sem parar a fisica —
   * congelar por `scene.pause` pararia tambem o jogador, que e o contrario do
   * que se quer ao observar um inimigo parado.
   */
  private depuracao = { corpos: false, aggro: false, congelado: false };
  private grafDepuracao: Phaser.GameObjects.Graphics | null = null;

  definirDepuracao(estadoDeDepuracao: { corpos: boolean; aggro: boolean; congelado: boolean }): void {
    this.depuracao = { ...estadoDeDepuracao };
    if (!this.depuracao.aggro) {
      this.grafDepuracao?.destroy();
      this.grafDepuracao = null;
    }
  }

  /** Remove os inimigos vivos do andar. Nao marca nada e nao da salvado. */
  limparInimigos(): number {
    const n = this.inimigos.length;
    for (const i of this.inimigos) i.sprite.destroy();
    this.inimigos = [];
    return n;
  }

  /** O circulo de deteccao de cada inimigo, redesenhado por quadro. */
  private desenharAggro(): void {
    if (!this.depuracao.aggro) return;
    if (!this.grafDepuracao) {
      this.grafDepuracao = this.cena.add.graphics().setDepth(9000);
    }
    const g = this.grafDepuracao;
    g.clear();
    g.lineStyle(1, 0xff5b57, 0.7);
    for (const i of this.inimigos) {
      g.strokeCircle(i.sprite.x, i.sprite.y, i.def.raioAggro * 32);
      // o circulo de DESISTENCIA sai mais fraco: e o que explica o inimigo
      // continuar vindo depois de o jogador sair do raio de deteccao
      g.lineStyle(1, 0xd9903f, 0.35);
      g.strokeCircle(i.sprite.x, i.sprite.y, i.def.raioDesistencia * 32);
      g.lineStyle(1, 0xff5b57, 0.7);
    }
  }

  destruir(): void {
    this.grafDepuracao?.destroy();
    this.grafDepuracao = null;
    for (const i of this.inimigos) i.sprite.destroy();
    this.inimigos = [];
    for (const p of this.projeteis) p.sprite.destroy();
    this.projeteis = [];
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
    if (this.golpeAtivo > 0) this.golpeAtivo = Math.max(0, this.golpeAtivo - deltaMs);
    if (this.recargaGolpe > 0) this.recargaGolpe = Math.max(0, this.recargaGolpe - deltaMs);
    if (pausado || this.depuracao.congelado) {
      for (const i of this.inimigos) i.sprite.setVelocity(0, 0);
      this.desenharAggro();
      return;
    }
    this.atualizarInimigos(deltaMs, player);
    this.atualizarProjeteis(deltaMs);
    this.desenharAggro();
  }

  // ------------------------------------------------------------- projeteis --
  /**
   * Cria o sprite de um projetil ja decidido por `SistemaArmas.disparar`.
   *
   * `origem` vem em PIXELS (a boca do cano, calculada por `MaoDoJogador`) e e
   * convertida em tiles aqui: a regra do projetil trabalha em tiles porque e
   * ela que consulta a colisao do tilemap.
   */
  lancarProjetil(tiro: Tiro, origem: { x: number; y: number }): void {
    const t = this.tamanhoTile;
    this.tirosDados += 1;
    const runtime = estado.armas.criarProjetil(
      tiro,
      { x: origem.x / t, y: origem.y / t },
      `tiro_${this.tirosDados}`,
    );
    const sprite = this.cena.add
      .image(origem.x, origem.y, 'equipamento', tiro.arma.frameProjetil)
      .setDepth(89500);
    const escala = (tiro.arma.alturaProjetil * t) / sprite.height;
    sprite.setScale(escala);
    sprite.setRotation(Math.atan2(runtime.dy, runtime.dx));
    this.projeteis.push({ runtime, sprite });
  }

  private atualizarProjeteis(deltaMs: number): void {
    if (this.projeteis.length === 0) return;
    const t = this.tamanhoTile;
    const vivos: ProjetilVisual[] = [];
    for (const p of this.projeteis) {
      const fim = avancarProjetil(p.runtime, deltaMs, (tx, ty) => this.deps.tileBloqueado(tx, ty));
      // Acerto em INIMIGO antes de olhar parede: um bicho encostado na alvenaria
      // tem de poder ser baleado, e a ordem inversa fazia o tiro morrer no tile
      // da parede atras dele.
      const alvo = this.inimigoEm(p.runtime.x, p.runtime.y);
      if (alvo) {
        const r = ferirInimigo(alvo.runtime, alvo.def, p.runtime.dano);
        if (r.aplicado > 0) {
          const arma = p.runtime.arma;
          const empurrao = arma === 'pistola' ? 3 : 2;
          alvo.sprite.setVelocity(p.runtime.dx * empurrao * t, p.runtime.dy * empurrao * t);
          if (r.morreu) this.derrubar(alvo);
        }
        this.faiscaDeImpacto(p.runtime.x * t, p.runtime.y * t);
        p.sprite.destroy();
        continue;
      }
      if (fim.tipo !== 'voando') {
        if (fim.tipo === 'parede') this.faiscaDeImpacto(p.runtime.x * t, p.runtime.y * t);
        p.sprite.destroy();
        continue;
      }
      p.sprite.setPosition(p.runtime.x * t, p.runtime.y * t);
      vivos.push(p);
    }
    this.projeteis = vivos;
  }

  /**
   * O inimigo vivo cujo CORPO contem o ponto (em TILES), ou null.
   *
   * O centro vertical NAO e `sprite.y`: a origem dos sprites de monstro e
   * (0.5, 0.85), ou seja `y` e quase o pe da figura. O centro visual esta
   * `displayHeight * (originY - 0.5)` acima dele. A primeira versao disto errou
   * exatamente aqui e o resultado era um tiro que passava por cima da cabeca de
   * uma impressora a cinco tiles sem tocar nela.
   */
  private inimigoEm(tx: number, ty: number): InimigoVisual | null {
    const t = this.tamanhoTile;
    for (const alvo of this.inimigos) {
      if (alvo.runtime.hp <= 0 || !alvo.sprite.active) continue;
      const meiaL = (alvo.sprite.displayWidth * 0.4) / t;
      const meiaA = (alvo.sprite.displayHeight * 0.4) / t;
      const cx = alvo.sprite.x / t;
      const cy = (alvo.sprite.y - alvo.sprite.displayHeight * (alvo.sprite.originY - 0.5)) / t;
      if (Math.abs(tx - cx) <= meiaL && Math.abs(ty - cy) <= meiaA) return alvo;
    }
    return null;
  }

  /** Faisca curta no ponto de impacto — o unico retorno de que a bala chegou. */
  private faiscaDeImpacto(x: number, y: number): void {
    const g = this.cena.add.graphics().setDepth(89600);
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xffe0a0, 0.85);
    g.fillCircle(x, y, this.tamanhoTile * 0.16);
    this.cena.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.8,
      duration: 150,
      onComplete: () => g.destroy(),
    });
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
  atacar(
    player: Phaser.Physics.Arcade.Sprite,
    direcao: Direcao,
    // `number` explicito: `ATAQUE_DO_JOGADOR` e `as const`, entao inferir daria o
    // tipo literal 4 e recusaria o dano da ferramenta equipada.
    dano: number = ATAQUE_DO_JOGADOR.dano,
  ): number {
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
      const r = ferirInimigo(alvo.runtime, alvo.def, dano);
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
}

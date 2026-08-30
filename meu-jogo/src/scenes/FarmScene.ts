import Phaser from 'phaser';
import { PROP_COLIDE } from '../game/colisao';
import { CONFIG, COR_ZONA, ROTULOS, UI } from '../game/config';
import { formatarDinheiro } from '../game/dinheiro';
import { estado } from '../game/estado';
import { ITENS } from '../game/inventario';
import { lojasDoMapa } from '../game/loja';
import { MAPA_DA_CASA, MAPA_DOS_NPCS, MAPAS, buscarMapa } from '../game/mapas';
import { CATALOGO_MOBILIA, buscarExpansao, buscarMovelDeLoja } from '../game/casa';
import { requisitosDoMovel } from '../game/casa';
import type { DefinicaoExpansao, RequisitoMaterial } from '../game/casa';
import type { MedidaDeMovel, MovelPosto } from '../game/casa';
import { buscarNpc, LOCAIS_CIDADE } from '../game/npcs';
import type { PerfilNpc } from '../game/npcs';
import { atividadeAtual, buscarMorador, MORADORES } from '../game/moradores';
import type { Morador } from '../game/moradores';
import { PONTOS_POR_REACAO, falaJaConversou, falasDoTema, temasDoDia } from '../game/dialogo';
import type { TemaDeConversa } from '../game/dialogo';
import { PONTOS_POR_TIER_PRESENTE, calcularTierPresente, reacaoPresente } from '../game/presentes';
import { CONFIG_TEMPO } from '../game/relogio';
import { ITEM_ENCOMENDA } from '../game/trabalhos';
import type { EstadoNpc } from '../game/rotinasNpc';
import { apagar, salvar } from '../game/save';
import { USOS_DE_MORADIA, falasDe } from '../game/tipos';
import { avisosDaSemana, segredosDoMapa } from '../game/ambientacao';
import type { SegredoDoMapa } from '../game/ambientacao';
import { PONTOS_ITENS_MISSAO } from '../game/missoesNpc';
import type { MissaoNpc } from '../game/missoesNpc';
import { jogadorOuveEncontro } from '../game/encontrosNpc';
import type {
  Direcao,
  Interagivel,
  PropObjeto,
  TipoInteragivel,
  TipoZona,
  UsoZona,
  ZonaReservada,
} from '../game/tipos';
import type { UIScene } from './UIScene';

/**
 * Quantos tiles cabem na largura da tela. E daqui que sai o zoom da camera:
 * o campo de visao fica fixo em tiles, entao mudar o tamanho do tile no
 * gerador nao muda o que o jogador ve — so a densidade de pixel da arte.
 */
const TILES_VISIVEIS_X = 15;
/** Altura do player em TILES (fica 1,5 tile, como antes). */
const ALTURA_PERSONAGEM_TILES = 1.5;
// Hitbox do player, em px do RECORTE (o frame tem 200x320), nao do mundo:
// o Arcade multiplica tanto setSize quanto setOffset pela escala do sprite
// (Body.js: `width = sourceWidth * _sx`, `position.x = ... + scaleX * offset.x`).
// Por isso estes quatro numeros nao mudam quando o tile muda de tamanho.
const CORPO_LARGURA = 70;
const CORPO_ALTURA = 50;
const CORPO_OFFSET_X = 65;
const CORPO_OFFSET_Y = 265;

/**
 * Altura desejada de cada estagio de arvore, em TILES. A escala do sprite sai
 * daqui dividido pela altura real do frame, entao a arte pode mudar de
 * resolucao sem mexer no jogo.
 */
const ALTURA_ARVORE = [0.7, 1.0, 1.5, 2.4, 2.4];
/** Idem para as flores (o estagio 0 e o mais aberto). */
const ALTURA_FLOR = [0.8, 0.7, 0.6, 0.5, 0.35, 0.5];
/** Do estagio 2 pra cima a arvore ja tem tronco que barra o player. */
const ARVORE_COLIDE_A_PARTIR_DE = 2;
/** Tronco: caixa de colisao na base do sprite, em TILES. */
const TRONCO_TILES = { largura: 0.56, altura: 0.375 };
/** Pedra menor que isto (em tiles de altura) e pedrisco: nao barra o player. */
const PEDRA_COLIDE_ACIMA_DE = 0.45;
/**
 * Caixa da pedra, como fracao do TAMANHO DO SPRITE (nao em tiles fixos como o
 * tronco): as pedras vao de pedrisco a matacao, entao a base acompanha cada uma.
 */
const PEDRA_CORPO = { largura: 0.78, altura: 0.34 };
/**
 * Caixa do movel de interior, tambem fracao do sprite. Mais funda que a da
 * pedra: gondola e balcao sao moveis de encostar, nao de passar atras.
 */
const MOVEL_CORPO = { largura: 0.92, altura: 0.5 };
/** Overlay de debug: acima de qualquer sprite ordenado por y. */
const DEPTH_OVERLAY = 100000;

const HORARIOS_PORTAS: Record<string, { nome: string; abre: number; fecha: number }> = {
  mercado: { nome: 'Mercado', abre: 8 * 60, fecha: 18 * 60 },
  academia: { nome: 'Academia', abre: 6 * 60, fecha: 22 * 60 },
  farmacia: { nome: 'Farmacia', abre: 8 * 60, fecha: 18 * 60 },
  bar: { nome: 'Bar', abre: 12 * 60, fecha: 22 * 60 },
  escola: { nome: 'Escola', abre: 8 * 60, fecha: 17 * 60 + 30 },
  biblioteca: { nome: 'Biblioteca', abre: 9 * 60, fecha: 19 * 60 },
};

interface FiguranteAmbiental {
  id: string;
  tipo: 'adulto' | 'crianca' | 'jovem' | 'idoso';
  inicio: { x: number; y: number };
  fim: { x: number; y: number };
  janela: { inicio: number; fim: number };
  seed: number;
  conta: Phaser.GameObjects.Container;
}

const VETOR: Record<Direcao, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// 'loja' NAO entra: nenhum tilemap traz objeto dessa classe hoje. Os pontos de
// loja sao acrescentados depois da leitura, a partir de PONTOS_DE_LOJA — ver o
// cabecalho de src/game/loja.ts, que documenta a pendencia de ligacao.
const TIPOS_VALIDOS: TipoInteragivel[] = [
  'placa',
  'npc',
  'porta',
  'cama',
  'item',
  'computador',
  'expansao',
  'mobilia',
];
const TIPOS_ZONA_VALIDOS: TipoZona[] = [
  'casa', 'mercado', 'academia', 'parque', 'bar', 'farmacia',
  'oficina', 'escola', 'biblioteca', 'quadra', 'terreno', 'servico',
  'madeireira', 'pedreira', 'fazenda',
];
const USOS_ZONA_VALIDOS: UsoZona[] = ['moradia', 'comercio', 'misto', 'praca', 'vago'];

/**
 * Texto de exame dos predios FECHADOS — os que tem fachada de pe e nenhuma
 * porta que abra. Sao os dois lotes `vago` com construcao: a casinha inicial
 * desativada nesta leva e a Central Telefonica do Mapa 2.
 */
const AVISOS_DE_PREDIO: Record<string, string[]> = {
  casa_1: [
    'A porta esta fechada com um cadeado velho.',
    'Local desativado. Ninguem mora aqui agora.',
  ],
  central: [
    'Central Telefonica Municipal — parece abandonada ha muitos anos.',
  ],
};

/**
 * Quanto o ponteiro pode ficar longe do jogador, em TILES, pra soltar um movel.
 * Sem isto daria pra mobiliar um comodo do outro lado da casa sem sair do lugar.
 */
const ALCANCE_DE_MOBILIA = 6;

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclas!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private correr!: Phaser.Input.Keyboard.Key;
  private direcao: Direcao = 'down';

  private interagiveis: Interagivel[] = [];
  private alvo: Interagivel | null = null;
  private npcs: NpcVisual[] = [];
  private balaoEncontro: Phaser.GameObjects.Text | null = null;
  private figurantesAmbientais: FiguranteAmbiental[] = [];
  private luzesNoturnas: Phaser.GameObjects.Graphics[] = [];
  private luzBiblioteca: Phaser.GameObjects.Graphics | null = null;
  private indicadoresPorta = new Map<string, Phaser.GameObjects.Text>();
  private visuaisDeItens = new Map<string, Phaser.GameObjects.Rectangle>();
  /** areas reservadas pros predios da proxima etapa; sem colisao */
  private zonas: ZonaReservada[] = [];
  /** demarcacao das zonas na tela (F6); null = escondida */
  private overlayZonas: Phaser.GameObjects.Container | null = null;
  /** caixas de colisao dos obstaculos (a copa fica livre, pra andar atras) */
  private obstaculos: Phaser.GameObjects.Zone[] = [];
  /** trava o input durante fades (dormir, trocar de mapa) */
  private transicionando = false;
  /** mapa da cidade aberto pelo jogador com M. */
  private mapaAberto = false;
  private overlayMapa: Phaser.GameObjects.Container | null = null;
  private marcadorPlayer: Phaser.GameObjects.Arc | null = null;
  private marcadoresNpc: Phaser.GameObjects.Arc[] = [];
  private transformMapa = { x: 0, y: 0, escala: 1 };
  /**
   * Tamanho do tile lido do proprio tilemap. Escala do player, da flora, zoom
   * da camera e alcance de interacao saem daqui — assim trocar o tile no
   * `gerar-assets.mjs` nao deixa nenhum numero desatualizado do lado do jogo.
   */
  private tamanhoTile = 32;
  /** de onde o player entrou neste mapa; null = usa o spawn padrao */
  private spawn: { x: number; y: number } | null = null;
  /** ultimo verbo mostrado no prompt; ver `atualizarAlvo` */
  private rotuloDoAlvo: string | null = null;
  /**
   * Tiles dos comodos marcados `privado` na camada `comodos` do mapa atual,
   * como "tx,ty". Sao os comodos atras de uma porta somente-NPC: o jogador nunca
   * chega neles (o flood-fill da conferencia prova isso), entao ele tambem nao
   * deve VER quem esta la dentro — senao o dono do bar apareceria andando por
   * cima da parede da propria moradia.
   */
  private tilesPrivados = new Set<string>();
  /**
   * Zonas de transicao entre mapas externos, da camada de objetos `bordas`, em
   * PIXELS. Encostar numa delas troca o mapa carregado — ver `atravessarBorda`.
   * Vazio nos interiores, que se atravessam por porta.
   */
  private bordas: BordaDeMapa[] = [];
  /**
   * Corpos SOLIDOS dos moveis do mapa atual, em TILES. Sao os mesmos
   * retangulos que viraram colisor em `criarMoveis`, guardados a parte porque a
   * validacao de posicao de mobilia (Parte 5) precisa saber onde ja tem movel
   * antes de criar qualquer coisa.
   */
  private corposDeMovel: RetTiles[] = [];
  /**
   * PEGADA de todo movel do mapa que nao e peca de chao — inclusive os que nao
   * colidem (quadro, planta, prateleira). E o que impede o jogador de empilhar
   * duas pecas no mesmo tile: e a MESMA regra que a conferencia offline aplica
   * na mobilia autoral (ver `conferirInterior` em tools/gerar-assets.mjs), so
   * que agora em tempo de jogo.
   */
  private pegadasDeMovel: RetTiles[] = [];
  /** Comodos do interior atual (camada `comodos`), em TILES. */
  private comodos: ComodoDoMapa[] = [];
  /** Sprites da mobilia POSTA PELO JOGADOR, na ordem de `estado.casa.moveis`. */
  private mobiliaDoJogador: Phaser.GameObjects.Image[] = [];
  /** Peca em posicionamento (modo mobilia); null = fora do modo. */
  private posicionando: PosicionamentoMobilia | null = null;
  /** A camada `objetos` do mapa atual — e nela que a colisao mora. */
  private camadaObjetos: Phaser.Tilemaps.TilemapLayer | null = null;
  /** Aviso fixo na tela durante o posicionamento de mobilia. */
  private avisoMobilia: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('FarmScene');
  }

  private get ui(): UIScene {
    return this.scene.get('UIScene') as UIScene;
  }

  /**
   * Roda a cada `scene.restart` — e onde o estado mutavel volta ao zero.
   * Campos de classe com inicializador NAO sao reexecutados no restart.
   */
  init(dados?: { mapa?: string; x?: number; y?: number }): void {
    if (dados?.mapa) estado.mapa = dados.mapa;
    this.spawn =
      dados?.x !== undefined && dados?.y !== undefined ? { x: dados.x, y: dados.y } : null;
    this.transicionando = false;
    this.mapaAberto = false;
    this.overlayMapa = null;
    this.marcadorPlayer = null;
    this.marcadoresNpc = [];
    this.interagiveis = [];
    this.npcs = [];
    this.figurantesAmbientais = [];
    this.luzesNoturnas = [];
    this.luzBiblioteca = null;
    this.indicadoresPorta.clear();
    this.visuaisDeItens.clear();
    this.zonas = [];
    this.overlayZonas = null;
    this.obstaculos = [];
    this.tilesPrivados = new Set();
    this.bordas = [];
    this.corposDeMovel = [];
    this.pegadasDeMovel = [];
    this.comodos = [];
    this.mobiliaDoJogador = [];
    this.posicionando = null;
    this.camadaObjetos = null;
    this.avisoMobilia = null;
    this.alvo = null;
  }

  /**
   * Todos os lotes do mapa atual, construidos e reservados (vazio nos mapas
   * sem a camada `zonas`).
   */
  get zonasReservadas(): readonly ZonaReservada[] {
    return this.zonas;
  }

  /** Só os lotes ainda sem construcao — o que a proxima etapa vai preencher. */
  get zonasLivres(): readonly ZonaReservada[] {
    return this.zonas.filter((z) => !z.construida);
  }

  /**
   * Lotes onde alguem pode morar: as seis casas mais os predios mistos (bar e
   * farmacia, que tem cama na metade de moradia). E a lista que o encaixe de um
   * NPC morador consulta — ver `MORADIAS` em src/game/npcs.ts.
   */
  get zonasDeMoradia(): readonly ZonaReservada[] {
    return this.zonas.filter((z) => z.moradia);
  }

  /** Acha um lote pelo id do Tiled, ex: `zonaPorId('mercado')`. */
  zonaPorId(id: string): ZonaReservada | null {
    return this.zonas.find((z) => z.id === id) ?? null;
  }

  /**
   * A porta que entra na construcao de um lote, se ele ja tiver uma. E o que
   * liga `casa_1` ao interior: a zona diz qual mapa, e este metodo acha o
   * objeto `porta` que fica dentro do lote e aponta pra esse mapa.
   */
  portaDaZona(id: string): Interagivel | null {
    const zona = this.zonaPorId(id);
    if (!zona?.mapaInterior) return null;
    return (
      this.interagiveis.find(
        (i) =>
          i.tipo === 'porta' &&
          i.props.destino === zona.mapaInterior &&
          i.x >= zona.x &&
          i.x <= zona.x + zona.largura &&
          i.y >= zona.y &&
          i.y <= zona.y + zona.altura,
      ) ?? null
    );
  }

  create(): void {
    const def = buscarMapa(estado.mapa);
    if (!def) throw new Error(`Mapa "${estado.mapa}" nao existe em MAPAS`);

    const map = this.make.tilemap({ key: def.tilemapKey });
    this.tamanhoTile = map.tileWidth;

    // 1o arg = nome do tileset DENTRO do JSON do Tiled, 2o = key carregada no BootScene.
    const tileset = map.addTilesetImage(def.tilesetNoJson, def.tilesetKey);
    if (!tileset) {
      throw new Error(`Tileset '${def.tilesetNoJson}' nao encontrado em ${def.tilemapKey}`);
    }

    const chao = map.createLayer('chao', tileset, 0, 0);
    // 'caminhos' e opcional: so os mapas externos tem malha de estradas.
    // Fica entre chao e objetos, entao a estrada cobre a grama sem cobrir nada.
    if (map.layers.some((l) => l.name === 'caminhos')) {
      map.createLayer('caminhos', tileset, 0, 0);
    }
    const objetos = map.createLayer('objetos', tileset, 0, 0);
    this.camadaObjetos = objetos;
    if (!chao || !objetos) {
      throw new Error(`Camadas chao/objetos nao encontradas em ${def.tilemapKey}`);
    }

    // Colisao do JOGADOR: vem da propriedade marcada nos tiles pelo gerador.
    // Ha uma segunda travessabilidade sobre a MESMA camada, a do NPC, em que a
    // porta somente-NPC nao bloqueia — ver src/game/colisao.ts. Ela nao precisa
    // de collider aqui porque o motor de rotinas nao usa fisica: ele anda em reta
    // entre waypoints, e sao as conferencias offline (verificar-mapas e
    // verificar-rotinas) que garantem que a rota so passa por onde o NPC pode.
    // Do lado do jogador, entao, a porta privada e parede e ponto final: andando
    // ou correndo, o collider abaixo barra do mesmo jeito.
    // A CASA DO PROTAGONISTA nasce com todos os comodos de expansao ja
    // construidos no tilemap. Aqui, ANTES de ligar a colisao, os que ainda nao
    // foram comprados sao lacrados com um tile de parede no vao. Comprar um
    // comodo e o inverso: apagar esse tile (ver `abrirComodoComprado`).
    this.lacrarExpansoes(map, objetos);
    objetos.setCollisionByProperty({ [PROP_COLIDE]: true });

    this.interagiveis = this.lerInterativos(map).filter((item) => {
      if (item.tipo === 'npc') return false;
      return item.tipo !== 'item' || !estado.itensColetados.has(item.id);
    });
    this.interagiveis.push(...this.lerPontosDeLoja());
    this.interagiveis.push(...this.lerPontosDeAmbientacao());
    this.zonas = this.lerZonas(map);
    this.tilesPrivados = this.lerComodosPrivados(map);
    this.bordas = this.lerBordas(map);
    this.comodos = this.lerComodos(map);

    const nasce =
      this.spawn ??
      {
        x: (def.spawnTile.x + 0.5) * this.tamanhoTile,
        y: (def.spawnTile.y + 0.5) * this.tamanhoTile,
      };
    this.player = this.physics.add.sprite(nasce.x, nasce.y, 'player-idle-sprites', 'down-0');
    this.configurarPersonagem(this.player);
    // hitbox menor que o sprite, so os pes -> parece melhor em top-down
    this.player.setCollideWorldBounds(true);

    this.criarNpcs();
    this.criarNovosMoradores();
    this.criarFigurantesAmbientais();
    this.criarItensColetaveis();
    this.criarConstrucoes(map);
    this.criarLuzesNoturnas();
    this.atualizarPortasEIluminacao();
    this.criarMoveis(map);
    this.criarMobiliaDoJogador();
    this.criarFlora(map);

    this.physics.add.collider(this.player, objetos);
    if (this.npcs.length > 0) {
      this.physics.add.collider(this.player, this.npcs.map((npc) => npc.sprite));
    }
    if (this.obstaculos.length > 0) this.physics.add.collider(this.player, this.obstaculos);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(this.zoomDeJogo());
    cam.fadeIn(220, 0, 0, 0);

    this.scene.setVisible(true, 'UIScene');
    this.ui.mostrarPrompt(null);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.teclas = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.teclas &
      Record<string, Phaser.Input.Keyboard.Key>;
    this.correr = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Modo de posicionar mobilia: o fantasma segue o ponteiro e solta no clique.
    // E o mesmo trio pointerdown/pointermove/pointerup do minigame de conserto,
    // sem lib nenhuma a mais.
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) =>
      this.arrastarMobilia(p),
    );
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) =>
      this.arrastarMobilia(p),
    );
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) =>
      this.soltarMobilia(p),
    );
    this.input.keyboard!.on('keydown-ESC', () => this.cancelarPosicionamento());

    // M abre/fecha o mapa da cidade.
    this.input.keyboard!.on('keydown-M', () => this.alternarMapa());

    // F6 mostra/esconde a demarcacao das zonas reservadas (debug)
    this.input.keyboard!.on('keydown-F6', () => this.alternarZonas());

    // F7 avanca uma hora para inspecionar rotinas sem esperar (debug).
    this.input.keyboard!.on('keydown-F7', () => {
      estado.dia += estado.relogio.avancarMinutos(60);
      estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, 0);
      this.sincronizarNpcs();
      console.info(`[tempo] avancado para ${estado.relogio.texto}`);
    });

    // F2/F3 continuam uteis para testar capacidade sem depender do mapa.
    this.input.keyboard!.on('keydown-F2', () => estado.inventario.adicionar('cabo_usb', 1));
    this.input.keyboard!.on('keydown-F3', () => estado.inventario.adicionar('bateria', 1));

    // F9 salva na hora (debug); no jogo, quem salva e o dormir
    this.input.keyboard!.on('keydown-F9', () => {
      console.info('[save] gravado:', this.salvarJogo());
    });

    // F4 apaga o save (debug)
    this.input.keyboard!.on('keydown-F4', () => {
      apagar();
      console.info('[save] apagado');
    });

    // F1 liga/desliga o debug das colisoes
    this.input.keyboard!.on('keydown-F1', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) this.physics.world.debugGraphic?.clear();
    });
  }

  update(_tempo: number, delta: number): void {
    // reordena o player entre as arvores conforme ele anda
    this.player.setDepth(this.player.y);

    if (!this.ui.bloqueado && !this.transicionando) {
      estado.dia += estado.relogio.avancar(delta);
      estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, delta);
      const iniciados = estado.encontrosNpc.atualizar(estado.dia, delta, estado.rotinasNpc.todos);
      if (iniciados.length > 0) estado.rotinasNpc.pausarParaEncontro(iniciados, 5800);
      this.sincronizarNpcs();
    }

    this.atualizarBalaoEncontro();

    this.atualizarFigurantesAmbientais();
    this.atualizarPortasEIluminacao();
    this.atualizarLuzesNoturnas();

    if (this.mapaAberto) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${this.direcao}`, true);
      this.atualizarMarcadoresMapa();
      return;
    }

    this.atualizarAlvo();
    if (this.atravessarBordaSeEncostou()) return;

    // com dialogo/menu aberto — ou com uma peca na mao — o player fica parado
    if (this.ui.bloqueado || this.transicionando || this.posicionando) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${this.direcao}`, true);
      return;
    }

    const k = this.teclas as unknown as Record<string, Phaser.Input.Keyboard.Key>;
    const esquerda = this.cursors.left.isDown || k.A.isDown;
    const direita = this.cursors.right.isDown || k.D.isDown;
    const cima = this.cursors.up.isDown || k.W.isDown;
    const baixo = this.cursors.down.isDown || k.S.isDown;

    const vx = (direita ? 1 : 0) - (esquerda ? 1 : 0);
    const vy = (baixo ? 1 : 0) - (cima ? 1 : 0);

    const correndo = this.correr.isDown;
    const velocidade = correndo ? CONFIG.movimento.correr : CONFIG.movimento.andar;
    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(velocidade);
    this.player.setVelocity(v.x, v.y);

    if (vx !== 0 || vy !== 0) {
      // horizontal tem prioridade na escolha da animacao
      if (vx !== 0) this.direcao = vx > 0 ? 'right' : 'left';
      else this.direcao = vy > 0 ? 'down' : 'up';
      this.player.anims.play(`${correndo ? 'run' : 'walk'}-${this.direcao}`, true);
    } else {
      this.player.anims.play(`idle-${this.direcao}`, true);
    }
  }

  /** Chamado pela UIScene quando o jogador aperta E / clica. */
  interagir(): void {
    if (this.posicionando || !this.alvo) return;
    switch (this.alvo.tipo) {
      case 'placa':
        this.examinarPlaca(this.alvo);
        break;
      case 'npc':
        this.falarCom(this.alvo);
        break;
      case 'cama':
        this.ui.confirmar('Dormir ate amanha?', () => this.dormir(estado.mapa));
        break;
      case 'item':
        this.coletarItem(this.alvo);
        break;
      case 'loja':
        this.ui.abrirLoja(String(this.alvo.props.loja));
        break;
      case 'computador':
        this.ui.abrirComputador();
        break;
      case 'expansao':
        this.abrirLojaDeExpansao();
        break;
      case 'mobilia':
        this.abrirCatalogoDeMobilia();
        break;
      case 'porta':
        if (!this.portaAbertaAgora(this.alvo)) {
          this.feedbackPortaFechada(this.alvo);
          return;
        }
        // a entrega vem antes de atravessar: se a porta e o destino, o E
        // entrega em vez de entrar. O proximo E entra normalmente.
        if (!this.entregarNaPorta(this.alvo)) this.atravessarPorta(this.alvo);
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------- entrega --

  /**
   * Conclui a entrega quando o jogador aciona a porta do destino carregando a
   * encomenda. Devolve true se tratou a interacao (e ai a porta NAO abre).
   *
   * A ordem e a mesma da compra: confere tudo, so entao aplica. Se a encomenda
   * nao estiver mais no inventario (o jogador descartou), nada e pago e a vaga
   * continua aceita — o jogador precisa buscar outra encomenda.
   */
  private entregarNaPorta(porta: Interagivel): boolean {
    if (!this.ehPortaDeEntrega(porta)) return false;
    const entrega = estado.trabalhos.entrega;
    if (!entrega) return false;

    const saiu = estado.inventario.remover(ITEM_ENCOMENDA, 1);
    if (saiu < 1) return false;

    // pagamento SEMPRE pela porta unica da carteira; ninguem escreve saldo aqui
    const r = estado.carteira.ganhar(entrega.recompensa);
    if (!r.ok) {
      // teto de saldo estourado ou valor invalido: devolve a encomenda pra o
      // jogador nao perder o trabalho junto com o pagamento
      estado.inventario.adicionar(ITEM_ENCOMENDA, 1);
      this.ui.iniciarDialogo(
        falasDe(entrega.morador, ['Nao consigo pagar agora. Volta depois.'], entrega.npcId),
      );
      return true;
    }

    estado.trabalhos.marcarConcluida(entrega.dia, entrega.idVaga);
    estado.trabalhos.entrega = null;
    this.ui.mostrarPrompt(null);
    this.alvo = null;
    this.rotuloDoAlvo = null;

    // bonus de relacionamento pela entrega bem-sucedida
    if (entrega.npcId) {
      estado.relacoes.ganharRelacao(entrega.npcId, 1.0);
    }

    this.ui.iniciarDialogo(
      falasDe(
        entrega.morador,
        [
          'Ah, era isso que eu estava esperando!',
          `Aqui, ${formatarDinheiro(entrega.recompensa)} pelo trabalho.`,
        ],
        entrega.npcId,
      ),
    );
    return true;
  }

  // -------------------------------------------------------------- portas --

  /** Fade, troca o tilemap e recoloca o player no ponto indicado pela porta. */
  private atravessarPorta(porta: Interagivel): void {
    const destino = buscarMapa(porta.props.destino);
    if (!destino) {
      console.warn(`[porta] "${porta.id}" aponta pra mapa inexistente:`, porta.props.destino);
      return;
    }
    const tx = Number(porta.props.destinoTx);
    const ty = Number(porta.props.destinoTy);
    // os dois mapas saem do mesmo gerador, entao compartilham o tamanho do tile
    const t = this.tamanhoTile;
    const posicao =
      Number.isFinite(tx) && Number.isFinite(ty)
        ? { x: tx * t + t / 2, y: ty * t + t / 2 }
        : { x: (destino.spawnTile.x + 0.5) * t, y: (destino.spawnTile.y + 0.5) * t };

    this.transicionando = true;
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapa: destino.chave, x: posicao.x, y: posicao.y });
    });
  }

  // -------------------------------------------------------------- dormir --

  /** Fluxo unico usado por qualquer cama, preservando o interior no save. */
  private dormir(zonaAtual: string): void {
    if (zonaAtual !== estado.mapa) {
      console.warn(`[dormir] zona mudou de "${zonaAtual}" para "${estado.mapa}" antes da confirmacao`);
      return;
    }
    this.transicionando = true;
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      estado.dia += 1;
      estado.relogio.definir(CONFIG_TEMPO.horaAoAcordar);
      this.salvarJogo();
      this.transicionando = false;
      cam.fadeIn(400, 0, 0, 0);
    });
  }

  /**
   * Interagiveis de loja do mapa atual. Vem de `PONTOS_DE_LOJA` e nao da camada
   * `interativos` do tilemap: o gerador de interior de comercio ainda nao emite
   * objeto dessa classe. A ligacao pendente esta documentada em game/loja.ts.
   */
  private lerPontosDeLoja(): Interagivel[] {
    const t = this.tamanhoTile;
    return lojasDoMapa(estado.mapa).map((ponto) => {
      const x = (ponto.tile.x + 0.5) * t;
      const y = (ponto.tile.y + 0.5) * t;
      if (ponto.id === 'loja_pedreira') {
        this.add.rectangle(x, y, t * 1.5, t * 0.65, 0x6f716d)
          .setStrokeStyle(2, 0xc9c4b8)
          .setDepth(y)
          .setName('balcao_pedreira_visual');
      }
      return {
        id: ponto.id,
        tipo: 'loja' as const,
        rotulo: ponto.rotulo,
        x,
        y,
        props: { loja: ponto.id },
      };
    });
  }

  private salvarJogo(): boolean {
    return salvar({
      dia: estado.dia,
      minutos: estado.relogio.minutos,
      mapa: estado.mapa,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      inventario: estado.inventario.serializar(),
      itensColetados: [...estado.itensColetados],
      dinheiro: estado.carteira.serializar(),
      lixeira: estado.lixeira.serializar(),
      trabalhos: estado.trabalhos.serializar(),
      relacoes: estado.relacoes.serializar(),
      casa: estado.casa.serializar(),
      worldEvents: estado.worldEvents.serializar(),
      missoesNpc: estado.missoesNpc.serializar(),
    });
  }

  // --------------------------------------------------------------- itens --

  private criarItensColetaveis(): void {
    for (const alvo of this.interagiveis) {
      if (alvo.tipo !== 'item') continue;
      const def = ITENS[String(alvo.props.itemId)];
      if (!def) {
        console.warn(`[item] "${alvo.id}" aponta para item desconhecido`);
        continue;
      }
      const visual = this.add
        .rectangle(alvo.x, alvo.y, this.tamanhoTile * 0.45, this.tamanhoTile * 0.45, def.icone)
        .setStrokeStyle(2, 0xffffff, 0.75)
        .setDepth(alvo.y);
      this.visuaisDeItens.set(alvo.id, visual);
    }
  }

  private coletarItem(alvo: Interagivel): void {
    const idItem = String(alvo.props.itemId ?? '');
    const def = ITENS[idItem];
    const quantidade = Math.max(1, Math.floor(Number(alvo.props.quantidade) || 1));
    if (!def) return;
    if (estado.inventario.adicionar(idItem, quantidade) > 0) {
      this.ui.iniciarDialogo(falasDe('Inventario', ['Nao ha espaco para este item.']));
      return;
    }

    estado.itensColetados.add(alvo.id);
    this.visuaisDeItens.get(alvo.id)?.destroy();
    this.visuaisDeItens.delete(alvo.id);
    this.interagiveis = this.interagiveis.filter((item) => item !== alvo);
    this.alvo = null;
    this.ui.mostrarPrompt(null);
    this.ui.iniciarDialogo(falasDe('Item', [`Voce pegou ${def.nome} x${quantidade}.`]));
  }

  // ------------------------------------------------------ figurantes ambientais --

  private criarFigurantesAmbientais(): void {
    this.figurantesAmbientais = [];
    const mapa = buscarMapa(estado.mapa);
    if (!mapa?.externo) return;

    const rotas: Record<
      string,
      Array<{
        id: string;
        tipo: FiguranteAmbiental['tipo'];
        inicio: { x: number; y: number };
        fim: { x: number; y: number };
        janela: { inicio: number; fim: number };
        seed: number;
      }>
    > = {
      farm: [
        { id: 'farm_almoco_1', tipo: 'adulto', inicio: { x: 60, y: 45 }, fim: { x: 69.5, y: 54 }, janela: { inicio: 11 * 60 + 30, fim: 13 * 60 + 30 }, seed: 0 },
        { id: 'farm_almoco_2', tipo: 'idoso', inicio: { x: 49, y: 55 }, fim: { x: 65, y: 54 }, janela: { inicio: 11 * 60 + 30, fim: 13 * 60 + 30 }, seed: 1 },
        { id: 'farm_almoco_3', tipo: 'jovem', inicio: { x: 83, y: 44 }, fim: { x: 72, y: 54 }, janela: { inicio: 11 * 60 + 30, fim: 13 * 60 + 30 }, seed: 2 },
        { id: 'farm_almoco_4', tipo: 'adulto', inicio: { x: 54, y: 62 }, fim: { x: 40, y: 55 }, janela: { inicio: 11 * 60 + 30, fim: 13 * 60 + 30 }, seed: 3 },
        { id: 'farm_noite_1', tipo: 'adulto', inicio: { x: 57, y: 58 }, fim: { x: 80.5, y: 28 }, janela: { inicio: 19 * 60, fim: 22 * 60 }, seed: 0 },
        { id: 'farm_noite_2', tipo: 'jovem', inicio: { x: 42, y: 57 }, fim: { x: 78, y: 30 }, janela: { inicio: 19 * 60, fim: 22 * 60 }, seed: 1 },
        { id: 'farm_noite_3', tipo: 'idoso', inicio: { x: 60, y: 48 }, fim: { x: 38, y: 55 }, janela: { inicio: 19 * 60, fim: 22 * 60 }, seed: 2 },
        { id: 'farm_noite_4', tipo: 'adulto', inicio: { x: 91, y: 45 }, fim: { x: 82, y: 29 }, janela: { inicio: 19 * 60, fim: 22 * 60 }, seed: 3 },
      ],
      bairro: [
        { id: 'bairro_escola_1', tipo: 'crianca', inicio: { x: 18, y: 49 }, fim: { x: 37.5, y: 47 }, janela: { inicio: 7 * 60, fim: 8 * 60 }, seed: 0 },
        { id: 'bairro_escola_2', tipo: 'adulto', inicio: { x: 18, y: 57 }, fim: { x: 37, y: 47 }, janela: { inicio: 7 * 60, fim: 8 * 60 }, seed: 1 },
        { id: 'bairro_escola_3', tipo: 'crianca', inicio: { x: 58, y: 72 }, fim: { x: 39, y: 47 }, janela: { inicio: 7 * 60, fim: 8 * 60 }, seed: 2 },
        { id: 'bairro_escola_4', tipo: 'crianca', inicio: { x: 100, y: 36 }, fim: { x: 39, y: 47 }, janela: { inicio: 7 * 60, fim: 8 * 60 }, seed: 3 },
        { id: 'bairro_volta_1', tipo: 'crianca', inicio: { x: 37.5, y: 47 }, fim: { x: 18, y: 49 }, janela: { inicio: 17 * 60, fim: 18 * 60 + 30 }, seed: 0 },
        { id: 'bairro_volta_2', tipo: 'adulto', inicio: { x: 37, y: 47 }, fim: { x: 18, y: 57 }, janela: { inicio: 17 * 60, fim: 18 * 60 + 30 }, seed: 1 },
        { id: 'bairro_volta_3', tipo: 'crianca', inicio: { x: 39, y: 47 }, fim: { x: 58, y: 72 }, janela: { inicio: 17 * 60, fim: 18 * 60 + 30 }, seed: 2 },
        { id: 'bairro_volta_4', tipo: 'adulto', inicio: { x: 39, y: 47 }, fim: { x: 100, y: 36 }, janela: { inicio: 17 * 60, fim: 18 * 60 + 30 }, seed: 3 },
      ],
      rural: [],
    };
    const lista = rotas[mapa.chave] ?? [];

    for (const rota of lista) {
      // Em dois de cada tres dias, exatamente um dos quatro slots da janela
      // descansa; no terceiro aparecem os quatro. Sempre ficam 3-4 simultaneos.
      if (estado.dia % 3 !== 0 && (estado.dia + rota.seed) % 4 === 0) continue;
      const corpo = this.add.container(rota.inicio.x * this.tamanhoTile, rota.inicio.y * this.tamanhoTile);
      const cabeca = this.add.circle(0, -11, 7, rota.tipo === 'crianca' ? 0xf3d5a8 : 0xe7b98b)
        .setDepth(1);
      const tronco = this.add.rectangle(0, 2, rota.tipo === 'crianca' ? 10 : 14, rota.tipo === 'adulto' || rota.tipo === 'idoso' ? 18 : 16, rota.tipo === 'jovem' ? 0x5a8bd6 : rota.tipo === 'crianca' ? 0xeb7b51 : 0x7e8f5f)
        .setOrigin(0.5, 0.5)
        .setDepth(1);
      const pernas = this.add.rectangle(0, 18, 12, 12, rota.tipo === 'crianca' ? 0x5e4254 : 0x433a3a)
        .setOrigin(0.5, 0.5)
        .setDepth(1);
      corpo.add([cabeca, tronco, pernas]);
      corpo.setDepth(rota.inicio.y * this.tamanhoTile);
      corpo.setVisible(false);
      this.figurantesAmbientais.push({ ...rota, conta: corpo });
    }
  }

  private atualizarFigurantesAmbientais(): void {
    if (!buscarMapa(estado.mapa)?.externo) {
      for (const figurante of this.figurantesAmbientais) figurante.conta.setVisible(false);
      return;
    }

    const minutos = estado.relogio.minutos;
    for (const figurante of this.figurantesAmbientais) {
      const dentroDaJanela = minutos >= figurante.janela.inicio && minutos < figurante.janela.fim;
      if (!dentroDaJanela) {
        figurante.conta.setVisible(false);
        continue;
      }

      const duracao = figurante.janela.fim - figurante.janela.inicio;
      const progresso = (minutos - figurante.janela.inicio) / duracao;
      // Anda durante 75% da janela, espera um pouco na chegada e entao some
      // pela porta/borda. A rota fica deterministica pelo dia e pelo slot.
      if (progresso >= 0.92) {
        figurante.conta.setVisible(false);
        continue;
      }
      const passo = Math.min(1, progresso / 0.75);
      const x = Phaser.Math.Linear(figurante.inicio.x, figurante.fim.x, passo) * this.tamanhoTile;
      const y = Phaser.Math.Linear(figurante.inicio.y, figurante.fim.y, passo) * this.tamanhoTile;
      figurante.conta.setPosition(x, y).setVisible(true).setDepth(y);
    }
  }

  private estahNoturno(minutos = estado.relogio.minutos): boolean {
    const m = ((minutos % (24 * 60)) + 24 * 60) % (24 * 60);
    return m >= 18 * 60 || m < 6 * 60;
  }

  private portaAbertaAgora(porta: Interagivel): boolean {
    const destino = String(porta.props.destino ?? '');
    const horario = HORARIOS_PORTAS[destino];
    if (!horario) return true;
    const m = estado.relogio.minutos;
    return m >= horario.abre && m < horario.fecha;
  }

  private feedbackPortaFechada(porta: Interagivel): void {
    const destino = String(porta.props.destino ?? '');
    const horario = HORARIOS_PORTAS[destino];
    const nome = horario?.nome ?? 'Local';
    const abre = horario ? `${String(Math.floor(horario.abre / 60)).padStart(2, '0')}:${String(horario.abre % 60).padStart(2, '0')}` : 'mais tarde';
    this.ui.iniciarDialogo(
      falasDe('Porta', [`${nome} fechado. Abre as ${abre}.`]),
    );
  }

  private atualizarPortasEIluminacao(): void {
    const mapa = buscarMapa(estado.mapa);
    for (const porta of this.interagiveis) {
      if (porta.tipo !== 'porta') continue;
      const destino = String(porta.props.destino ?? '');
      const horario = HORARIOS_PORTAS[destino];
      const texto = this.indicadoresPorta.get(porta.id) ?? this.add.text(porta.x, porta.y - 22, '', {
        fontFamily: UI.fonte,
        fontSize: '10px',
        color: '#f7f1cc',
        backgroundColor: '#1a1712',
        padding: { x: 4, y: 2 },
      }).setScrollFactor(1).setDepth(DEPTH_OVERLAY + 5);
      this.indicadoresPorta.set(porta.id, texto);
      if (!horario) {
        texto.setVisible(false);
        continue;
      }
      const aberto = this.portaAbertaAgora(porta);
      texto
        .setVisible(mapa?.externo ?? false)
        .setPosition(porta.x, porta.y - 24)
        .setText(aberto ? 'ABERTO' : 'FECHADO')
        .setColor(aberto ? '#baf0b8' : '#ffb5a9')
        .setBackgroundColor(aberto ? '#1d3a2a' : '#3a1f1a');
    }
  }

  private criarLuzesNoturnas(): void {
    this.luzesNoturnas.forEach((luz) => luz.destroy());
    this.luzesNoturnas = [];

    const pontos = {
      farm: [
        { x: 25, y: 40, r: 42 }, { x: 52, y: 32, r: 48 }, { x: 81, y: 28, r: 44 }, { x: 54, y: 60, r: 52 },
        { x: 70, y: 54, r: 48 }, { x: 85, y: 54, r: 50 }, { x: 15, y: 73, r: 40 },
      ],
      bairro: [
        { x: 32, y: 26, r: 44 }, { x: 68, y: 30, r: 46 }, { x: 92, y: 44, r: 46 }, { x: 66, y: 59, r: 52 },
        { x: 100, y: 58, r: 46 },
      ],
      rural: [
        { x: 28, y: 26, r: 40 }, { x: 54, y: 22, r: 38 }, { x: 70, y: 35, r: 42 }, { x: 50, y: 54, r: 48 },
        { x: 78, y: 60, r: 44 },
      ],
    } as const;

    const luzes = pontos[estado.mapa as keyof typeof pontos] ?? [];
    for (const ponto of luzes) {
      const grafico = this.add.graphics();
      grafico.fillStyle(0xffe3a3, 0.22);
      grafico.fillCircle(ponto.x * this.tamanhoTile, ponto.y * this.tamanhoTile, ponto.r);
      grafico.setDepth(DEPTH_OVERLAY + 2);
      grafico.setVisible(false);
      this.luzesNoturnas.push(grafico);
    }

    if (estado.mapa === 'biblioteca') {
      this.luzBiblioteca = this.add.graphics();
      this.luzBiblioteca.fillStyle(0xffe8a2, 0.18);
      this.luzBiblioteca.fillRect(11.5 * this.tamanhoTile, 8 * this.tamanhoTile, 8 * this.tamanhoTile, 6 * this.tamanhoTile);
      this.luzBiblioteca.setDepth(DEPTH_OVERLAY + 10);
      this.luzBiblioteca.setVisible(false);
    }
  }

  private atualizarLuzesNoturnas(): void {
    const ativa = this.estahNoturno();
    for (const luz of this.luzesNoturnas) luz.setVisible(ativa);
    if (this.luzBiblioteca) {
      const minutos = estado.relogio.minutos;
      this.luzBiblioteca.setVisible(minutos >= 9 * 60 && minutos < 19 * 60);
    }
  }

  /** Um sprite estatico por objeto `npc` do mapa. Nao anda ainda — so existe. */
  private criarNpcs(): void {
    estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, 0);
    for (const estadoNpc of estado.rotinasNpc.todos) {
      const def = buscarNpc(estadoNpc.id);
      if (!def) continue;
      const alvo: Interagivel = {
        id: `npc_${def.id}`,
        tipo: 'npc',
        rotulo: ROTULOS.npc,
        x: estadoNpc.x * this.tamanhoTile,
        y: estadoNpc.y * this.tamanhoTile,
        props: { npcId: def.id },
      };
      const textura = def.sprite ? `npc-${def.id}-sprites` : 'player-idle-sprites';
      const sprite = this.physics.add.sprite(alvo.x, alvo.y, textura, 'down-0');
      this.configurarNpc(sprite);
      sprite.setImmovable(true);
      if ('tint' in def && def.tint !== undefined) sprite.setTint(def.tint);
      sprite.anims.play(`${def.sprite ? `npc-${def.id}-` : ''}idle-down`);
      this.interagiveis.push(alvo);
      this.npcs.push({ estado: estadoNpc, sprite, interagivel: alvo, animacao: def.sprite ? `npc-${def.id}-` : '' });
    }
    this.sincronizarNpcs();
  }

  /** Os moradores dos Mapas 2/3 usam agenda declarativa entre mapas externos. */
  private criarNovosMoradores(): void {
    for (const morador of Object.values(MORADORES)) {
      const alvo: Interagivel = {
        id: `npc_${morador.id}`, tipo: 'npc', rotulo: ROTULOS.npc,
        x: 0, y: 0, props: { npcId: morador.id },
      };
      const sprite = this.physics.add.sprite(0, 0, `npc-${morador.id}-sprites`, 'down-0');
      this.configurarNpc(sprite);
      sprite.setImmovable(true);
      sprite.anims.play(`npc-${morador.id}-idle-down`);
      this.interagiveis.push(alvo);
      this.npcs.push({ morador, sprite, interagivel: alvo, animacao: `npc-${morador.id}-` });
    }
    this.sincronizarNpcs();
  }

  private sincronizarNpcs(): void {
    for (const npc of this.npcs) {
      const { sprite, interagivel } = npc;
      const atividade = npc.morador
        ? atividadeAtual(npc.morador, estado.dia, estado.relogio.minutos)
        : null;
      const externoAtual = buscarMapa(estado.mapa)?.mapaExterno;
      const apareceMorador = Boolean(atividade && externoAtual === atividade.mapa && estado.mapa === externoAtual);
      const semente = npc.morador
        ? [...npc.morador.id].reduce((n, c) => n + c.charCodeAt(0), 0)
        : 0;
      const fase = (estado.relogio.minutos + semente) / 7;
      const posicao = npc.morador
        ? (apareceMorador && atividade
            ? { x: atividade.x + Math.sin(fase) * 0.45, y: atividade.y }
            : null)
        : this.posicaoNpcNoMapa(npc.estado!);
      const visivel = posicao !== null;
      sprite.setVisible(visivel).setActive(visivel);
      if (sprite.body) sprite.body.enable = visivel;
      if (!visivel) continue;
      const x = posicao.x * this.tamanhoTile;
      const y = posicao.y * this.tamanhoTile;
      sprite.setPosition(x, y).setDepth(y);
      interagivel.x = x;
      interagivel.y = y;
      const movendo = npc.morador ? true : npc.estado!.movendo;
      const direcao = npc.morador
        ? (Math.cos(fase) >= 0 ? 'right' : 'left')
        : npc.estado!.direcao;
      sprite.anims.play(`${npc.animacao}${movendo ? 'walk' : 'idle'}-${direcao}`, true);
    }
  }

  /** O encontro sempre simula; so a camada visual depende da proximidade. */
  private atualizarBalaoEncontro(): void {
    const ativo = estado.encontrosNpc.ativo;
    const fala = ativo?.definicao.falas[ativo.indiceFala];
    const visual = fala ? this.npcs.find((n) => n.interagivel.props.npcId === fala.npcId) : null;
    const perto = Boolean(
      visual?.sprite.visible &&
      jogadorOuveEncontro(
        Phaser.Math.Distance.Between(this.player.x, this.player.y, visual.sprite.x, visual.sprite.y) / this.tamanhoTile,
      ),
    );
    if (!fala || !visual || !perto) {
      this.balaoEncontro?.destroy();
      this.balaoEncontro = null;
      return;
    }
    if (!this.balaoEncontro) {
      this.balaoEncontro = this.add.text(visual.sprite.x, visual.sprite.y - this.tamanhoTile * 1.8, '', {
        fontFamily:UI.fonte, fontSize:'10px', color:'#18202c', backgroundColor:'#fff8dc',
        padding:{x:6,y:4}, wordWrap:{width:180}, align:'center',
      }).setOrigin(0.5,1).setDepth(DEPTH_OVERLAY + 20);
    }
    this.balaoEncontro.setText(fala.texto).setPosition(
      visual.sprite.x,
      visual.sprite.y - this.tamanhoTile * 1.8,
    );
  }

  private posicaoNpcNoMapa(npc: EstadoNpc): { x: number; y: number } | null {
    if (estado.mapa === MAPA_DOS_NPCS) return npc.visivel ? { x: npc.x, y: npc.y } : null;
    if (npc.dentro !== estado.mapa) return null;
    if (!LOCAIS_CIDADE[npc.dentro]) return null;
    // Dentro de comodo privado ele some da cena: o jogador ve o dono andar ate a
    // porta somente-NPC e sumir por ela, e reaparecer vindo dela — em vez de ve-lo
    // atravessar a parede da moradia (o sprite fica acima da camada de tiles).
    if (this.tilesPrivados.has(`${Math.floor(npc.x)},${Math.floor(npc.y)}`)) return null;
    return { x: npc.x, y: npc.y };
  }

  /**
   * Tiles dos comodos `privado` da camada de objetos `comodos`. A camada e
   * opcional: os mapas externos e os interiores de um comodo so nao a tem, e ai
   * o conjunto fica vazio e nada muda.
   */
  private lerComodosPrivados(map: Phaser.Tilemaps.Tilemap): Set<string> {
    const tiles = new Set<string>();
    const camada = map.getObjectLayer('comodos');
    if (!camada) return tiles;
    for (const obj of camada.objects) {
      if (lerProps(obj).privado !== true) continue;
      const x0 = Math.floor((obj.x ?? 0) / this.tamanhoTile);
      const y0 = Math.floor((obj.y ?? 0) / this.tamanhoTile);
      const largura = Math.round((obj.width ?? 0) / this.tamanhoTile);
      const altura = Math.round((obj.height ?? 0) / this.tamanhoTile);
      for (let y = y0; y < y0 + altura; y++) {
        for (let x = x0; x < x0 + largura; x++) tiles.add(`${x},${y}`);
      }
    }
    return tiles;
  }

  // ---------------------------------------------------------- construcoes --

  /**
   * Desenha a fachada de cada lote construido, da camada de objetos
   * `construcoes`. A colisao NAO vem daqui: a pegada da construcao ja esta
   * pintada com tiles que colidem na camada `objetos`, e a fachada so cobre
   * isso por cima. O ponto do objeto e o rodape da pegada, e a arte pode ser
   * mais alta que ela — o telhado sobe alem do que barra o player.
   */
  private criarConstrucoes(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('construcoes');
    if (!camada) return;

    for (const obj of camada.objects) {
      const quadro = String(lerProps(obj).frame ?? obj.name ?? '');
      if (!this.textures.getFrame('construcoes', quadro)) {
        console.warn(`[construcoes] frame "${quadro}" nao existe no atlas — ignorado`);
        continue;
      }
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      this.add.image(x, y, 'construcoes', quadro).setOrigin(0.5, 1).setDepth(y);
    }
  }

  /**
   * Moveis de interior, da camada de objetos `moveis`. Diferente da flora, aqui
   * o gerador ja resolve atlas, frame, altura e se colide — o jogo so posiciona
   * e ordena por y. Assim mudar o layout de uma loja e mexer so no gerador.
   */
  private criarMoveis(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('moveis');
    if (!camada) return;

    for (const obj of camada.objects) {
      const props = lerProps(obj);
      const textura = String(props.atlas ?? '');
      const quadro = String(props.frame ?? '');
      const alturaTiles = Number(props.alturaTiles);
      if (!Number.isFinite(alturaTiles)) continue;
      if (!this.textures.getFrame(textura, quadro)) {
        console.warn(`[moveis] frame "${quadro}" nao existe em "${textura}" — ignorado`);
        continue;
      }

      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const sprite = this.add.image(x, y, textura, quadro).setOrigin(0.5, 1);
      sprite.setScale((alturaTiles * this.tamanhoTile) / sprite.height);
      // peca de chao (tapete) desce uma camada: ela e o unico movel que espera
      // ter outro movel EM CIMA, e os dois costumam ter a base na mesma linha
      sprite.setDepth(props.chao === true ? y - 1 : y);

      const largura = sprite.displayWidth * MOVEL_CORPO.largura;
      const altura = sprite.displayHeight * MOVEL_CORPO.altura;
      const pegada = this.retEmTiles(x, y, largura, altura);
      if (props.chao !== true) this.pegadasDeMovel.push(pegada);
      if (props.colide === true) {
        this.corpoNaBase(x, y, largura, altura);
        this.corposDeMovel.push(pegada);
      }
    }
  }

  /** O retangulo (em TILES) de um corpo de movel dado em pixels do mundo. */
  private retEmTiles(x: number, y: number, largura: number, altura: number): RetTiles {
    const t = this.tamanhoTile;
    return {
      x0: (x - largura / 2) / t,
      x1: (x + largura / 2) / t,
      y0: (y - altura) / t,
      y1: y / t,
    };
  }

  // ---------------------------------------------------------------- flora --

  /**
   * Cria arvores, pedras e flores a partir da camada de objetos `flora`. Sao
   * sprites, nao tiles: passam de 1 tile e precisam ordenar profundidade com o
   * player. A colisao fica so na BASE (tronco da arvore, pe da pedra), entao da
   * pra andar atras delas. A camada e opcional — mapas de interior nao a tem.
   */
  private criarFlora(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('flora');
    if (!camada) return;

    for (const obj of camada.objects) {
      const classe = obj.type || (obj as { class?: string }).class || '';
      const props = lerProps(obj);
      const receita = receitaDeFlora(classe, props);
      if (!receita) continue;

      if (!this.textures.getFrame(receita.textura, receita.quadro)) {
        console.warn(
          `[flora] frame "${receita.quadro}" nao existe em "${receita.textura}" — ignorado`,
        );
        continue;
      }

      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const sprite = this.add.image(x, y, receita.textura, receita.quadro).setOrigin(0.5, 1);
      // escala vem da altura real do frame: a arte pode mudar de resolucao
      sprite.setScale((receita.alturaTiles * this.tamanhoTile) / sprite.height);
      // profundidade = y: quem esta mais "pra frente" na tela desenha por cima
      sprite.setDepth(y);

      if (classe === 'arvore' && receita.colide) {
        this.corpoNaBase(
          x,
          y,
          TRONCO_TILES.largura * this.tamanhoTile,
          TRONCO_TILES.altura * this.tamanhoTile,
        );
      } else if (classe === 'pedra' && receita.colide) {
        this.corpoNaBase(
          x,
          y,
          sprite.displayWidth * PEDRA_CORPO.largura,
          sprite.displayHeight * PEDRA_CORPO.altura,
        );
      }
    }
  }

  /** Caixa estatica de colisao encostada na base de um sprite de flora. */
  private corpoNaBase(x: number, y: number, largura: number, altura: number): void {
    const corpo = this.add.zone(x, y - altura / 2, largura, altura);
    this.physics.add.existing(corpo, true);
    this.obstaculos.push(corpo);
  }

  // --------------------------------------------------------- camera/mapa --

  /**
   * Zoom que mantem `TILES_VISIVEIS_X` tiles na largura da tela. Com tile 16
   * dava 2; com 32 da 1 — mesmo campo de visao, o dobro de pixel por tile.
   */
  private zoomDeJogo(): number {
    return CONFIG.largura / (TILES_VISIVEIS_X * this.tamanhoTile);
  }

  private alternarMapa(): void {
    if (this.posicionando) return;
    this.mapaAberto = !this.mapaAberto;
    if (this.mapaAberto && !this.overlayMapa) this.criarOverlayMapa();
    this.overlayMapa?.setVisible(this.mapaAberto);
    this.scene.setVisible(!this.mapaAberto, 'UIScene');
    if (this.mapaAberto) this.atualizarMarcadoresMapa();
  }

  /** Monta uma representacao leve a partir do farm.json ja carregado. */
  /**
   * O mapa EXTERNO em que o jogador esta — ele mesmo, quando ja esta num
   * externo, ou o mapa a que o interior pertence. E o que o mapa da cidade
   * desenha: estando dentro do mercado, o util e ver a cidade em volta.
   */
  private get mapaExternoAtual(): string {
    const def = buscarMapa(estado.mapa);
    return def ? def.mapaExterno : MAPA_DOS_NPCS;
  }

  private criarOverlayMapa(): void {
    const chaveExterno = this.mapaExternoAtual;
    const tilemapKey = MAPAS[chaveExterno]?.tilemapKey ?? '';
    const cache = this.cache.tilemap.get(tilemapKey) as { data?: MapaTiledCru } | undefined;
    const mapa = cache?.data;
    if (!mapa) {
      console.warn(`[mapa] ${tilemapKey} nao esta no cache`);
      this.mapaAberto = false;
      return;
    }

    const margem = 16;
    const topo = 28;
    const larguraDisponivel = CONFIG.largura - margem * 2;
    const alturaDisponivel = CONFIG.altura - topo - margem;
    const larguraMundo = mapa.width * mapa.tilewidth;
    const alturaMundo = mapa.height * mapa.tileheight;
    const escala = Math.min(larguraDisponivel / larguraMundo, alturaDisponivel / alturaMundo);
    const largura = larguraMundo * escala;
    const altura = alturaMundo * escala;
    const x = (CONFIG.largura - largura) / 2;
    const y = topo + (alturaDisponivel - altura) / 2;
    this.transformMapa = { x, y, escala };

    const fundo = this.add.graphics().setScrollFactor(0);
    fundo.fillStyle(UI.fundo, 0.97);
    fundo.fillRect(0, 0, CONFIG.largura, CONFIG.altura);
    fundo.fillStyle(0x31533a, 1);
    fundo.fillRect(x, y, largura, altura);

    const caminhos = mapa.layers.find((l) => l.name === 'caminhos');
    if (caminhos?.data) {
      fundo.fillStyle(0xb88b57, 0.9);
      for (let ty = 0; ty < mapa.height; ty++) {
        let inicio = -1;
        for (let tx = 0; tx <= mapa.width; tx++) {
          const ocupado = tx < mapa.width && caminhos.data[ty * mapa.width + tx] !== 0;
          if (ocupado && inicio < 0) inicio = tx;
          if (!ocupado && inicio >= 0) {
            fundo.fillRect(
              x + inicio * mapa.tilewidth * escala,
              y + ty * mapa.tileheight * escala,
              (tx - inicio) * mapa.tilewidth * escala,
              mapa.tileheight * escala,
            );
            inicio = -1;
          }
        }
      }
    }

    const filhos: Phaser.GameObjects.GameObject[] = [fundo];
    const zonas = mapa.layers.find((l) => l.name === 'zonas')?.objects ?? [];
    for (const zona of zonas) {
      const cor = COR_ZONA[(zona.class || zona.type) as TipoZona] ?? 0xffffff;
      fundo.fillStyle(cor, 0.28);
      fundo.fillRect(
        x + zona.x * escala,
        y + zona.y * escala,
        zona.width * escala,
        zona.height * escala,
      );
      fundo.lineStyle(1, cor, 0.95);
      fundo.strokeRect(
        x + zona.x * escala,
        y + zona.y * escala,
        zona.width * escala,
        zona.height * escala,
      );
      filhos.push(
        this.add
          .text(
            x + (zona.x + zona.width / 2) * escala,
            y + (zona.y + zona.height / 2) * escala,
            zona.name.startsWith('casa_') ? zona.name.slice(5) : zona.name,
            { fontFamily: UI.fonte, fontSize: '8px', color: UI.texto, align: 'center' },
          )
          .setOrigin(0.5)
          .setScrollFactor(0),
      );
    }

    filhos.push(
      this.add.text(margem, 8, TITULO_DO_MAPA[chaveExterno] ?? 'Mapa', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.destaque,
      }).setScrollFactor(0),
      this.add.text(CONFIG.largura - margem, 8, '[M] fechar', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.textoFraco,
      }).setOrigin(1, 0).setScrollFactor(0),
      this.add.text(
        margem,
        CONFIG.altura - 13,
        chaveExterno === MAPA_DOS_NPCS ? 'vermelho: voce   amarelo: NPC' : 'vermelho: voce',
        {
          fontFamily: UI.fonte,
          fontSize: '8px',
          color: UI.textoFraco,
        },
      ).setScrollFactor(0),
    );

    this.marcadorPlayer = this.add.circle(0, 0, 4, 0xff5b57).setStrokeStyle(1, 0xffffff);
    this.marcadorPlayer.setScrollFactor(0);
    filhos.push(this.marcadorPlayer);
    // marcador de NPC so existe no mapa em que eles vivem
    this.marcadoresNpc = (chaveExterno === MAPA_DOS_NPCS ? estado.rotinasNpc.todos : []).map(() => {
      const marcador = this.add.circle(0, 0, 3, 0xffd34e).setStrokeStyle(1, 0x3a2b08);
      marcador.setScrollFactor(0);
      filhos.push(marcador);
      return marcador;
    });

    this.overlayMapa = this.add
      .container(0, 0, filhos)
      .setDepth(DEPTH_OVERLAY + 10)
      .setScrollFactor(0);
  }

  private atualizarMarcadoresMapa(): void {
    if (!this.marcadorPlayer) return;
    const posicaoPlayer = buscarMapa(estado.mapa)?.externo
      ? { x: this.player.x, y: this.player.y }
      : this.centroDaZonaDoInterior(estado.mapa);
    if (posicaoPlayer) {
      this.marcadorPlayer.setPosition(...this.paraCoordenadaDoMapa(posicaoPlayer.x, posicaoPlayer.y));
      this.marcadorPlayer.setVisible(true);
    } else this.marcadorPlayer.setVisible(false);

    this.marcadoresNpc.forEach((marcador, i) => {
      const npc = estado.rotinasNpc.todos[i];
      marcador.setVisible(Boolean(npc?.visivel));
      if (npc?.visivel) {
        marcador.setPosition(...this.paraCoordenadaDoMapa(
          npc.x * this.tamanhoTile,
          npc.y * this.tamanhoTile,
        ));
      }
    });
  }

  private paraCoordenadaDoMapa(x: number, y: number): [number, number] {
    return [
      this.transformMapa.x + x * this.transformMapa.escala,
      this.transformMapa.y + y * this.transformMapa.escala,
    ];
  }

  /**
   * Onde desenhar o marcador do jogador quando ele esta DENTRO de um predio: no
   * centro do lote daquele interior, no mapa externo correspondente.
   */
  private centroDaZonaDoInterior(chaveInterior: string): { x: number; y: number } | null {
    const tilemapKey = MAPAS[this.mapaExternoAtual]?.tilemapKey ?? '';
    const cache = this.cache.tilemap.get(tilemapKey) as { data?: MapaTiledCru } | undefined;
    const zona = cache?.data?.layers
      .find((l) => l.name === 'zonas')
      ?.objects?.find((obj) =>
        (obj.properties ?? []).some(
          (prop) => prop.name === 'mapaInterior' && prop.value === chaveInterior,
        ),
      );
    return zona ? { x: zona.x + zona.width / 2, y: zona.y + zona.height / 2 } : null;
  }

  // ------------------------------------------------------ zonas reservadas --

  /**
   * Desenha por cima do mapa o retangulo e o id de cada zona reservada, so
   * pra conferir o loteamento a olho. Nao cria colisao nem prende o player.
   */
  private alternarZonas(): void {
    if (this.overlayZonas) {
      this.overlayZonas.destroy(true);
      this.overlayZonas = null;
      return;
    }
    if (this.zonas.length === 0) {
      console.info('[zonas] este mapa nao tem camada "zonas"');
      return;
    }

    const traco = this.add.graphics();
    const rotulos: Phaser.GameObjects.Text[] = [];

    for (const zona of this.zonas) {
      const cor = COR_ZONA[zona.tipo];
      // lote construido: preenchimento mais forte e borda grossa. Reservado:
      // so um contorno fino, pra ficar claro o que ainda esta vazio.
      traco.fillStyle(cor, zona.construida ? 0.3 : 0.12);
      traco.fillRect(zona.x, zona.y, zona.largura, zona.altura);
      traco.lineStyle(zona.construida ? 3 : 1, cor, 0.9);
      traco.strokeRect(zona.x, zona.y, zona.largura, zona.altura);
      const marca = zona.construida ? `${zona.id} [${zona.mapaInterior ?? 'construida'}]` : zona.id;
      rotulos.push(
        this.add.text(zona.x + 3, zona.y + 3, marca, {
          fontFamily: UI.fonte,
          fontSize: '10px',
          color: zona.construida ? UI.destaque : UI.texto,
        }),
      );
    }

    this.overlayZonas = this.add.container(0, 0, [traco, ...rotulos]).setDepth(DEPTH_OVERLAY);
  }

  /** Reduz a arte original para a escala do mapa e deixa a colisao so nos pes. */
  private configurarPersonagem(sprite: Phaser.Physics.Arcade.Sprite): void {
    // escala tirada da altura real do recorte, igual a flora
    const escala = (ALTURA_PERSONAGEM_TILES * this.tamanhoTile) / sprite.height;
    // depth = y coloca o personagem na mesma ordenacao da flora: quem esta
    // mais pra baixo na tela desenha por cima. O player se reajusta no update.
    sprite.setOrigin(0.5, 1).setScale(escala).setDepth(sprite.y);
    sprite.body
      ?.setSize(CORPO_LARGURA, CORPO_ALTURA)
      .setOffset(CORPO_OFFSET_X, CORPO_OFFSET_Y);
  }

  private configurarNpc(sprite: Phaser.Physics.Arcade.Sprite): void {
    const escala = (ALTURA_PERSONAGEM_TILES * this.tamanhoTile) / sprite.height;
    sprite.setOrigin(0.5, 1).setScale(escala).setDepth(sprite.y);
    sprite.body
      ?.setSize(sprite.width * 0.34, sprite.height * 0.16)
      .setOffset(sprite.width * 0.33, sprite.height * 0.8);
  }

  /**
   * Conversa com um NPC.
   *
   * A fala de abertura dele continua sendo a primeira coisa que aparece; quando
   * ela termina, abre o menu de escolha (temas do dia + dar presente). Sem tema
   * cadastrado, o NPC fica so com a fala de abertura, como era antes.
   */
  private falarCom(alvo: Interagivel): void {
    const def = buscarNpc(alvo.props.npcId);
    if (!def) return;
    // basta ABORDAR pra o NPC entrar na aba Relacionamento do Navegador: uma
    // conversa que rendeu 0 ponto ainda foi uma conversa
    estado.relacoes.registrarInteracao(def.id);
    const condicional = estado.worldEvents.consumirFala(def.id);
    const abertura = condicional ? [condicional.texto, ...def.dialogoAtual] : def.dialogoAtual;
    this.ui.iniciarDialogo(falasDe(def.nome, abertura, def.id), () =>
      this.abrirMenuDeConversa(def),
    );
  }

  private abrirMenuDeConversa(def: PerfilNpc): void {
    const temas = temasDoDia(def.id, estado.dia);
    const opcoes = temas.map((tema) => ({
      rotulo: tema.rotulo,
      aoEscolher: () => this.conversarSobre(def, tema),
    }));
    const morador = buscarMorador(def.id);
    if (morador) {
      opcoes.push({ rotulo: 'Perguntar sobre o dia', aoEscolher: () => this.conversarComMorador(morador) });
    }
    const missao = estado.missoesNpc.porNpc(def.id);
    if (missao) this.acrescentarOpcaoMissao(opcoes, def, missao);
    opcoes.push({ rotulo: 'Dar um presente...', aoEscolher: () => this.abrirMenuDePresente(def) });
    if (opcoes.length === 1) return; // NPC sem tema: so a fala de abertura
    this.ui.abrirMenu(`Falar com ${def.nome}`, opcoes, undefined, def.id);
  }

  private acrescentarOpcaoMissao(
    opcoes: { rotulo: string; aoEscolher: () => void }[],
    def: PerfilNpc,
    missao: MissaoNpc,
  ): void {
    const situacao = estado.missoesNpc.estado(missao.id);
    if (situacao === 'concluida') return;
    if (situacao === 'disponivel') {
      if (estado.relacoes.getScore(def.id) < missao.requisitoRelacao) return;
      opcoes.unshift({ rotulo: `Missao: ${missao.titulo}`, aoEscolher: () => this.iniciarMissao(def, missao) });
      return;
    }
    const podeEntregar = this.podeEntregarMissao(missao);
    opcoes.unshift({
      rotulo: podeEntregar ? `Entregar: ${missao.titulo}` : `Sobre: ${missao.titulo}`,
      aoEscolher: () => podeEntregar ? this.concluirEntregaMissao(def, missao) : this.statusMissao(def, missao),
    });
  }

  private iniciarMissao(def: PerfilNpc, missao: MissaoNpc): void {
    if (!estado.missoesNpc.iniciar(missao.id)) return;
    this.ui.iniciarDialogo(falasDe(def.nome, [...missao.falaInicio, missao.descricao], def.id));
  }

  private podeEntregarMissao(missao: MissaoNpc): boolean {
    if (missao.tipo === 'conserto' || !missao.itemId || estado.inventario.contar(missao.itemId) < 1) return false;
    if (missao.localEntrega === 'academia') return estado.mapa === 'academia';
    if (missao.localEntrega === 'praca') {
      const tx = this.player.x / this.tamanhoTile;
      const ty = this.player.y / this.tamanhoTile;
      return estado.mapa === 'farm' && tx >= 31 && tx <= 45 && ty >= 50 && ty <= 61;
    }
    return true;
  }

  private statusMissao(def: PerfilNpc, missao: MissaoNpc): void {
    const texto = missao.tipo === 'conserto'
      ? 'A ordem esta ativa no app Trabalho do seu computador.'
      : missao.itemId && estado.inventario.contar(missao.itemId) > 0
        ? `Voce esta com o item, mas precisa fazer a entrega em ${missao.localEntrega ?? 'qualquer lugar'}.`
        : missao.descricao;
    this.ui.iniciarDialogo(falasDe(def.nome, [texto], def.id), () => this.abrirMenuDeConversa(def));
  }

  private concluirEntregaMissao(def: PerfilNpc, missao: MissaoNpc): void {
    if (!missao.itemId || !this.podeEntregarMissao(missao)) return;
    if (estado.inventario.remover(missao.itemId, 1) !== 1) return;
    const concluida = estado.missoesNpc.concluirComRecompensas(missao.id, estado);
    if (!concluida) {
      estado.inventario.adicionar(missao.itemId, 1);
      return;
    }
    this.ui.iniciarDialogo(falasDe(def.nome, [
      ...missao.falaConclusao,
      `Recompensa: ${formatarDinheiro(missao.recompensa)} e +${missao.bonusRelacao} de relacao.`,
    ], def.id));
  }

  private conversarComMorador(morador: Morador): void {
    const pontua = estado.relacoes.podeConversar(morador.id, estado.dia);
    if (pontua) {
      estado.relacoes.registrarConversa(morador.id, estado.dia);
      estado.relacoes.ganharRelacao(morador.id, 0.5);
    }
    const atividade = atividadeAtual(morador, estado.dia, estado.relogio.minutos);
    const texto = atividade
      ? `Agora eu estou em: ${atividade.atividade}. ${morador.dialogoAtual[estado.dia % morador.dialogoAtual.length]}`
      : morador.dialogoAtual[estado.dia % morador.dialogoAtual.length];
    const falas = pontua ? [texto] : ['A gente ja conversou bastante hoje.', texto];
    this.ui.iniciarDialogo(falasDe(morador.nome, falas, morador.id), () => this.abrirMenuDeConversa(morador));
  }

  /**
   * Aplica um tema de conversa.
   *
   * LIMITE DIARIO: so a PRIMEIRA conversa do dia com cada NPC pontua. Depois
   * dela a resposta do tema continua aparecendo — o texto e conteudo, nao
   * recompensa — mas o numero nao se mexe. E o que impede farmar relacionamento
   * apertando E em looping.
   */
  private conversarSobre(def: PerfilNpc, tema: TemaDeConversa): void {
    const pontua = estado.relacoes.podeConversar(def.id, estado.dia);
    const falas: string[] = [];

    if (pontua) {
      estado.relacoes.registrarConversa(def.id, estado.dia);
      const pontos = PONTOS_POR_REACAO[tema.reacao];
      if (pontos !== 0) estado.relacoes.ganharRelacao(def.id, pontos);
    } else {
      falas.push(falaJaConversou(def.id));
    }

    // a resposta VARIA a cada conversa (ver `falasDoTema`): o mesmo tema nao
    // devolve o mesmo texto duas vezes seguidas
    falas.push(...falasDoTema(def.id, tema, estado.dia));
    this.ui.iniciarDialogo(falasDe(def.nome, falas, def.id), () => this.abrirMenuDeConversa(def));
  }

  /** Lista o inventario pra escolher o presente. Item vazio nao entra. */
  private abrirMenuDePresente(def: PerfilNpc): void {
    const opcoes = estado.inventario.slots
      .map((slot, indice) => ({ slot, indice }))
      .filter((s): s is { slot: { id: string; qtd: number }; indice: number } => s.slot !== null)
      .map(({ slot, indice }) => ({
        rotulo: `${ITENS[slot.id]?.nome ?? slot.id}  x${slot.qtd}`,
        aoEscolher: () => this.presentear(def, indice, slot.id),
      }));

    if (opcoes.length === 0) {
      this.ui.iniciarDialogo(
        falasDe(def.nome, ['Voce nao esta com nada pra me dar.'], def.id),
        () => this.abrirMenuDeConversa(def),
      );
      return;
    }
    this.ui.abrirMenu(
      `Dar o que pra ${def.nome}?`,
      opcoes,
      () => this.abrirMenuDeConversa(def),
      def.id,
    );
  }

  /**
   * Entrega um presente.
   *
   * O item SEMPRE e consumido; o que o limite diario corta e a pontuacao. A
   * ordem e a mesma da compra: tira o item primeiro e so pontua se ele saiu
   * mesmo — sem isso, um slot que mudou entre abrir o menu e escolher renderia
   * ponto por um presente que nunca foi dado.
   */
  private presentear(def: PerfilNpc, indice: number, itemId: string): void {
    const slot = estado.inventario.slots[indice];
    if (!slot || slot.id !== itemId || estado.inventario.removerDoSlot(indice, 1) < 1) {
      this.ui.iniciarDialogo(
        falasDe(def.nome, ['...voce ia me dar alguma coisa?'], def.id),
        () => this.abrirMenuDeConversa(def),
      );
      return;
    }

    const tier = calcularTierPresente(def.id, itemId);
    const nomeItem = ITENS[itemId]?.nome ?? itemId;
    const falas = [reacaoPresente(def.id, tier)];

    if (estado.relacoes.podePresentear(def.id, estado.dia)) {
      estado.relacoes.registrarPresente(def.id, estado.dia);
      const pontos = PONTOS_POR_TIER_PRESENTE[tier];
      if (pontos !== 0) estado.relacoes.ganharRelacao(def.id, pontos);
    } else {
      falas.push('Voce ja tinha me dado uma coisa hoje. Guarda o resto pra voce.');
    }

    this.ui.iniciarDialogo(
      [
        { nome: 'Voce', texto: `Voce deu ${nomeItem} para ${def.nome}.` },
        ...falasDe(def.nome, falas, def.id),
      ],
      () => this.abrirMenuDeConversa(def),
    );
  }

  // ------------------------------------------------------------ interacao --

  /**
   * Escolhe o interagivel mais proximo que esteja dentro do raio E no cone
   * da direcao que o player esta olhando. Se voce estiver praticamente em
   * cima do objeto, a direcao e ignorada.
   */
  private atualizarAlvo(): void {
    // com uma peca de mobilia na mao o [E] nao interage com nada: o prompt sai
    // da tela pra nao competir com o aviso do posicionamento
    if (this.posicionando) {
      if (this.rotuloDoAlvo !== null) {
        this.alvo = null;
        this.rotuloDoAlvo = null;
        this.ui.mostrarPrompt(null);
      }
      return;
    }
    const { cosseno } = CONFIG.interacao;
    const raio = CONFIG.interacao.raio * this.tamanhoTile;
    const distanciaLivre = CONFIG.interacao.distanciaLivre * this.tamanhoTile;
    const dir = VETOR[this.direcao];
    const px = this.player.x;
    const py = this.player.y;

    let melhor: Interagivel | null = null;
    let melhorDist = Infinity;

    for (const alvo of this.interagiveis) {
      if (alvo.tipo === 'npc') {
        const npc = estado.rotinasNpc.porId(String(alvo.props.npcId));
        if (!npc || !this.posicaoNpcNoMapa(npc)) continue;
      }
      const dx = alvo.x - px;
      const dy = alvo.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > raio || dist >= melhorDist) continue;
      if (dist > distanciaLivre && (dx * dir.x + dy * dir.y) / dist < cosseno) continue;
      melhor = alvo;
      melhorDist = dist;
    }

    // O ROTULO E RECALCULADO SEMPRE, nao so quando o alvo muda: "Entregar" x
    // "Entrar" depende do estado da entrega e do inventario, que mudam sem o
    // alvo sair de baixo do jogador. Comparar so a referencia deixava o prompt
    // preso no verbo antigo enquanto o jogador estava parado na porta.
    const rotulo = melhor ? this.rotuloDe(melhor) : null;
    if (melhor !== this.alvo || rotulo !== this.rotuloDoAlvo) {
      this.alvo = melhor;
      this.rotuloDoAlvo = rotulo;
      this.ui.mostrarPrompt(rotulo);
    }
  }

  /**
   * O verbo do prompt. Quase sempre e o do proprio objeto; a excecao e a porta
   * do destino de uma entrega em andamento, que vira "Entregar" — o jogador
   * precisa ver ali, na porta, que aquele e o lugar certo.
   */
  private rotuloDe(alvo: Interagivel): string {
    return this.ehPortaDeEntrega(alvo) ? 'Entregar' : alvo.rotulo;
  }

  private ehPortaDeEntrega(alvo: Interagivel): boolean {
    const entrega = estado.trabalhos.entrega;
    return (
      alvo.tipo === 'porta' &&
      entrega !== null &&
      alvo.props.destino === entrega.destino &&
      estado.inventario.contar(ITEM_ENCOMENDA) > 0
    );
  }

  // ------------------------------------------------------ bordas de mapa --

  /**
   * Zonas de transicao da camada de objetos `bordas` (so os mapas externos a
   * tem). Cada uma e uma faixa de alguns tiles na beira do mapa; encostar nela
   * carrega o mapa vizinho e recoloca o jogador no ponto espelhado.
   */
  private lerBordas(map: Phaser.Tilemaps.Tilemap): BordaDeMapa[] {
    const camada = map.getObjectLayer('bordas');
    if (!camada) return [];
    const lista: BordaDeMapa[] = [];
    for (const obj of camada.objects) {
      const props = lerProps(obj);
      const destino = String(props.destino ?? '');
      if (!buscarMapa(destino)) {
        console.warn(`[borda] "${obj.name}" aponta pra mapa inexistente: ${destino}`);
        continue;
      }
      lista.push({
        id: obj.name || `borda_${lista.length}`,
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        largura: obj.width ?? 0,
        altura: obj.height ?? 0,
        destino,
        destinoTx: Number(props.destinoTx),
        destinoTy: Number(props.destinoTy),
      });
    }
    return lista;
  }

  /**
   * Troca de mapa quando o jogador pisa numa borda. Devolve true se disparou a
   * transicao — e ai o `update` para por aqui, como ja fazia no fade da porta.
   *
   * O teste e feito com o PE do jogador (a origem do sprite e 0.5,1), que e o
   * mesmo ponto que a fisica usa: encostar com a cabeca na faixa nao vale.
   */
  private atravessarBordaSeEncostou(): boolean {
    if (this.transicionando || this.bordas.length === 0) return false;
    const px = this.player.x;
    const py = this.player.y;
    for (const b of this.bordas) {
      if (px < b.x || py < b.y || px >= b.x + b.largura || py >= b.y + b.altura) continue;
      this.atravessarBorda(b);
      return true;
    }
    return false;
  }

  /** Mesmo fade da porta; muda so o que dispara. */
  private atravessarBorda(borda: BordaDeMapa): void {
    const t = this.tamanhoTile;
    const destino = buscarMapa(borda.destino);
    if (!destino) return;
    const posicao =
      Number.isFinite(borda.destinoTx) && Number.isFinite(borda.destinoTy)
        ? { x: (borda.destinoTx + 0.5) * t, y: (borda.destinoTy + 0.5) * t }
        : { x: (destino.spawnTile.x + 0.5) * t, y: (destino.spawnTile.y + 0.5) * t };

    this.transicionando = true;
    this.player.setVelocity(0, 0);
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapa: destino.chave, x: posicao.x, y: posicao.y });
    });
  }

  // ------------------------------------------------------------- comodos --

  /** Comodos do interior atual, em tiles. Vazio nos mapas sem a camada. */
  private lerComodos(map: Phaser.Tilemaps.Tilemap): ComodoDoMapa[] {
    const camada = map.getObjectLayer('comodos');
    if (!camada) return [];
    const t = this.tamanhoTile;
    return camada.objects.map((obj) => ({
      nome: obj.name,
      privado: lerProps(obj).privado === true,
      ret: {
        x0: Math.round((obj.x ?? 0) / t),
        y0: Math.round((obj.y ?? 0) / t),
        x1: Math.round(((obj.x ?? 0) + (obj.width ?? 0)) / t),
        y1: Math.round(((obj.y ?? 0) + (obj.height ?? 0)) / t),
      },
    }));
  }

  // ----------------------------------------------------- casa: expansoes --

  private textoMateriais(requisitos: readonly RequisitoMaterial[]): string {
    return requisitos.map((r) => `${ITENS[r.itemId]?.nome ?? r.itemId} x${r.quantidade}`).join(', ');
  }

  private materiaisFaltando(requisitos: readonly RequisitoMaterial[]): string[] {
    return requisitos.flatMap((r) => {
      const tem = estado.inventario.contar(r.itemId);
      return tem >= r.quantidade
        ? []
        : [`${ITENS[r.itemId]?.nome ?? r.itemId} ${tem}/${r.quantidade}`];
    });
  }

  private consumirMateriais(requisitos: readonly RequisitoMaterial[]): void {
    for (const requisito of requisitos) {
      const removidos = estado.inventario.remover(requisito.itemId, requisito.quantidade);
      if (removidos !== requisito.quantidade) {
        console.error(`[casa] BUG: requisito conferido mudou durante a transacao (${requisito.itemId})`);
      }
    }
  }

  /**
   * Tapa com parede o vao de cada comodo de expansao AINDA NAO COMPRADO.
   *
   * Roda antes de `setCollisionByProperty`, entao o tile posto aqui ja entra na
   * colisao como qualquer parede. O comodo continua existindo do outro lado
   * (piso, parede, mobilia) — ele so nao tem por onde entrar.
   */
  private lacrarExpansoes(
    map: Phaser.Tilemaps.Tilemap,
    objetos: Phaser.Tilemaps.TilemapLayer,
  ): void {
    const camada = map.getObjectLayer('expansoes');
    if (!camada) return;
    for (const obj of camada.objects) {
      const props = lerProps(obj);
      const comodo = String(props.comodo ?? obj.name ?? '');
      if (estado.casa.temComodo(comodo)) continue;
      const gid = Number(props.gidParede);
      const tx = Number(props.vaoTx);
      const ty = Number(props.vaoTy);
      if (!Number.isFinite(gid) || !Number.isFinite(tx) || !Number.isFinite(ty)) {
        console.warn(`[expansao] "${comodo}" sem vao/gid declarado — nao da pra lacrar`);
        continue;
      }
      objetos.putTileAt(gid, tx, ty);
    }
  }

  /**
   * Abre fisicamente um comodo recem-comprado, quando o jogador ja esta dentro
   * da casa. Comprando na madeireira (Mapa 3) isto nao roda — o comodo ja nasce
   * aberto na proxima vez que a casa for carregada, porque `lacrarExpansoes` le
   * o estado da compra.
   */
  private abrirComodoComprado(id: string): void {
    if (estado.mapa !== MAPA_DA_CASA || !this.camadaObjetos) return;
    const camada = this.camadaObjetos.tilemap.getObjectLayer('expansoes');
    const obj = camada?.objects.find((o) => (lerProps(o).comodo ?? o.name) === id);
    if (!obj) return;
    const props = lerProps(obj);
    this.camadaObjetos.removeTileAt(Number(props.vaoTx), Number(props.vaoTy));
  }

  /** Balcao da madeireira: a lista de comodos que ainda da pra comprar. */
  private abrirLojaDeExpansao(): void {
    const disponiveis = estado.casa.expansoesDisponiveis();
    if (disponiveis.length === 0) {
      this.ui.iniciarDialogo(
        falasDe('Madeireira', [
          'Sua casa ja esta com todos os comodos que a gente monta.',
          'Se quiser mobilia, isso e com voce mesmo na bancada.',
        ]),
      );
      return;
    }
    this.ui.abrirMenu(
      `Madeireira — ${estado.carteira.texto}`,
      disponiveis.map((exp) => ({
        rotulo: `${exp.nome}  ${formatarDinheiro(exp.preco)} + ${this.textoMateriais(exp.materiais)}`,
        aoEscolher: () => this.confirmarExpansao(exp),
      })),
    );
  }

  private confirmarExpansao(exp: DefinicaoExpansao): void {
    this.ui.iniciarDialogo(falasDe('Madeireira', [exp.descricao]), () => {
      this.ui.confirmar(`Fechar ${exp.nome} por ${formatarDinheiro(exp.preco)} + ${this.textoMateriais(exp.materiais)}?`, () =>
        this.comprarExpansao(exp),
      );
    });
  }

  /**
   * Compra de comodo. Passa inteira pela carteira: `cabe()` so pergunta se o
   * comodo ainda esta a venda e `entregar()` so registra — se o saldo nao der,
   * nada mudou.
   */
  private comprarExpansao(exp: DefinicaoExpansao): void {
    const faltas = this.materiaisFaltando(exp.materiais);
    if (faltas.length > 0) {
      this.ui.iniciarDialogo(falasDe('Madeireira', [`Faltam materiais: ${faltas.join(', ')}. Nada foi consumido.`]));
      return;
    }
    const r = estado.carteira.gastar(exp.preco, {
      cabe: () => !estado.casa.temComodo(exp.id) && this.materiaisFaltando(exp.materiais).length === 0,
      entregar: () => {
        this.consumirMateriais(exp.materiais);
        estado.casa.liberarComodo(exp.id);
      },
    });
    if (!r.ok) {
      const motivo =
        r.motivo === 'saldo'
          ? `Falta dinheiro: ${exp.nome} sai por ${formatarDinheiro(exp.preco)}.`
          : 'Nao deu pra fechar o servico agora.';
      this.ui.iniciarDialogo(falasDe('Madeireira', [motivo]));
      return;
    }
    this.abrirComodoComprado(exp.id);
    this.ui.iniciarDialogo(
      falasDe('Madeireira', [
        `Fechado. ${exp.nome} ja esta de pe na sua casa.`,
        `Saldo: ${estado.carteira.texto}.`,
      ]),
    );
  }

  // ------------------------------------------------------- casa: mobilia --

  /**
   * As medidas de uma peca do catalogo. Saem de `assets/sprites/mobilia.json`,
   * escrito pelo gerador a partir da propria folha de arte — o jogo nao guarda
   * nenhum tamanho de movel a mao.
   */
  private medidaDeMovel(id: string): MedidaDeMovel | null {
    const tabela = this.cache.json.get('mobilia') as Record<string, MedidaDeMovel> | undefined;
    return tabela?.[id] ?? null;
  }

  /** Recria os sprites da mobilia que o jogador ja comprou e posicionou. */
  private criarMobiliaDoJogador(): void {
    if (estado.mapa !== MAPA_DA_CASA) return;
    for (const movel of estado.casa.moveis) this.criarUmMovelDoJogador(movel, false);
  }

  /**
   * Um sprite de mobilia do jogador. `colisorProprio` distingue as duas
   * chamadas: no `create` os corpos entram na lista que vai virar UM collider
   * no fim; ja em jogo (peca recem-comprada) o collider tem de ser criado na
   * hora, senao a peca so passaria a barrar no proximo carregamento do mapa.
   */
  private criarUmMovelDoJogador(movel: MovelPosto, colisorProprio: boolean): void {
    const medida = this.medidaDeMovel(movel.id);
    if (!medida) {
      console.warn(`[mobilia] peca "${movel.id}" nao esta em mobilia.json — ignorada`);
      return;
    }
    if (!this.textures.getFrame(medida.atlas, medida.frame)) {
      console.warn(`[mobilia] frame "${medida.frame}" nao existe em "${medida.atlas}"`);
      return;
    }
    const t = this.tamanhoTile;
    const x = (movel.tx + medida.larguraTiles / 2) * t;
    const y = (movel.ty + 1) * t;
    const sprite = this.add.image(x, y, medida.atlas, medida.frame).setOrigin(0.5, 1);
    sprite.setScale((medida.alturaTiles * t) / sprite.height);
    sprite.setDepth(medida.chao ? y - 1 : y);
    this.mobiliaDoJogador.push(sprite);

    const largura = sprite.displayWidth * MOVEL_CORPO.largura;
    const altura = sprite.displayHeight * MOVEL_CORPO.altura;
    const pegada = this.retEmTiles(x, y, largura, altura);
    if (!medida.chao) this.pegadasDeMovel.push(pegada);
    if (!medida.solido) return;
    const antes = this.obstaculos.length;
    this.corpoNaBase(x, y, largura, altura);
    this.corposDeMovel.push(pegada);
    if (colisorProprio) {
      const corpo = this.obstaculos[antes];
      if (corpo) this.physics.add.collider(this.player, corpo);
    }
  }

  /** Bancada da oficina: abre o catalogo de pecas a venda. */
  private abrirCatalogoDeMobilia(): void {
    this.ui.abrirMenu(
      `Mobilia — ${estado.carteira.texto}`,
      CATALOGO_MOBILIA.map((peca) => ({
        rotulo: `${peca.nome}  ${formatarDinheiro(peca.preco)} + ${this.textoMateriais(requisitosDoMovel(peca))}`,
        aoEscolher: () => this.iniciarPosicionamento(peca.id),
      })),
    );
  }

  /**
   * Entra no modo de posicionar: a peca vira um fantasma preso ao ponteiro,
   * verde onde da pra soltar e vermelho onde nao da. O dinheiro so sai no
   * clique, e so se a posicao for valida.
   */
  private iniciarPosicionamento(id: string): void {
    const peca = buscarMovelDeLoja(id);
    const medida = peca ? this.medidaDeMovel(id) : null;
    if (!peca || !medida) {
      console.warn(`[mobilia] peca "${id}" sem definicao — nao da pra posicionar`);
      return;
    }
    const t = this.tamanhoTile;
    const requisitos = requisitosDoMovel(peca);
    const fantasma = this.add
      .image(this.player.x, this.player.y, medida.atlas, medida.frame)
      .setOrigin(0.5, 1)
      .setAlpha(0.7)
      .setDepth(DEPTH_OVERLAY - 1);
    fantasma.setScale((medida.alturaTiles * t) / fantasma.height);

    this.posicionando = { id, medida, fantasma, tx: 0, ty: 0, valido: false };
    this.avisoMobilia = this.add
      .text(
        CONFIG.largura / 2,
        6,
        `${peca.nome}  ${formatarDinheiro(peca.preco)} + ${this.textoMateriais(requisitos)}   [clique] poe   [ESC] sai`,
        { fontFamily: UI.fonte, fontSize: UI.tamanho, color: UI.texto, backgroundColor: '#1a1712' },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_OVERLAY + 20);
    this.ui.mostrarPrompt(null);
    this.arrastarMobilia(this.input.activePointer);
  }

  /** pointermove/pointerdown: recoloca o fantasma no tile sob o ponteiro. */
  private arrastarMobilia(ponteiro: Phaser.Input.Pointer): void {
    const posicao = this.posicionando;
    if (!posicao) return;
    const t = this.tamanhoTile;
    const mundo = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
    const tx = Math.floor(mundo.x / t);
    const ty = Math.floor(mundo.y / t);
    posicao.tx = tx;
    posicao.ty = ty;
    posicao.valido = this.posicaoDeMovelValida(posicao.medida, tx, ty);
    posicao.fantasma.setPosition((tx + posicao.medida.larguraTiles / 2) * t, (ty + 1) * t);
    posicao.fantasma.setTint(posicao.valido ? 0x9de08a : 0xff8f7f);
  }

  /** pointerup: paga e fixa a peca, se a posicao valer. */
  private soltarMobilia(ponteiro: Phaser.Input.Pointer): void {
    const posicao = this.posicionando;
    if (!posicao) return;
    this.arrastarMobilia(ponteiro);
    if (!posicao.valido) {
      this.avisoMobilia?.setText('Aqui nao da: fora do comodo, em cima de peca ou fechando passagem.');
      this.avisoMobilia?.setColor(UI.alerta);
      return;
    }
    const peca = buscarMovelDeLoja(posicao.id);
    if (!peca) return;
    const posto: MovelPosto = { id: posicao.id, tx: posicao.tx, ty: posicao.ty };
    const requisitos = requisitosDoMovel(peca);
    const faltas = this.materiaisFaltando(requisitos);
    if (faltas.length > 0) {
      this.avisoMobilia?.setText(`Faltam materiais: ${faltas.join(', ')}. Nada foi consumido.`);
      this.avisoMobilia?.setColor(UI.alerta);
      return;
    }
    const r = estado.carteira.gastar(peca.preco, {
      // reconfere na hora de pagar: a peca pode ter ficado invalida entre o
      // ultimo movimento do ponteiro e o clique
      cabe: () => this.posicaoDeMovelValida(posicao.medida, posto.tx, posto.ty) && this.materiaisFaltando(requisitos).length === 0,
      entregar: () => {
        this.consumirMateriais(requisitos);
        estado.casa.posicionarMovel(posto);
      },
    });
    if (!r.ok) {
      this.avisoMobilia?.setText(
        r.motivo === 'saldo'
          ? `Falta dinheiro: ${peca.nome} custa ${formatarDinheiro(peca.preco)}.`
          : 'Nao deu pra comprar agora.',
      );
      this.avisoMobilia?.setColor(UI.alerta);
      return;
    }
    this.cancelarPosicionamento();
    this.criarUmMovelDoJogador(posto, true);
    this.ui.iniciarDialogo(
      falasDe('Voce', [`${peca.nome} no lugar. Saldo: ${estado.carteira.texto}.`]),
    );
  }

  private cancelarPosicionamento(): void {
    if (!this.posicionando) return;
    this.posicionando.fantasma.destroy();
    this.posicionando = null;
    this.avisoMobilia?.destroy();
    this.avisoMobilia = null;
  }

  /** Retangulo de COLISAO de uma peca, em tiles, se ela fosse posta em tx/ty. */
  private corpoDoMovel(medida: MedidaDeMovel, tx: number, ty: number): RetTiles {
    const centro = tx + medida.larguraTiles / 2;
    const largura = medida.larguraTiles * MOVEL_CORPO.largura;
    const altura = medida.alturaTiles * MOVEL_CORPO.altura;
    return {
      x0: centro - largura / 2,
      x1: centro + largura / 2,
      y0: ty + 1 - altura,
      y1: ty + 1,
    };
  }

  /** Os comodos da casa que o jogador JA POSSUI (os basicos + os comprados). */
  private comodosDoJogador(): ComodoDoMapa[] {
    return this.comodos.filter(
      (c) => !c.privado && (!buscarExpansao(c.nome) || estado.casa.temComodo(c.nome)),
    );
  }

  /**
   * Uma posicao de mobilia so vale se as quatro coisas valerem:
   *
   *  1. a peca cabe INTEIRA dentro de um comodo que o jogador possui;
   *  2. o ponteiro nao esta longe demais do jogador (`ALCANCE_DE_MOBILIA`);
   *  3. nenhum tile do corpo dela encosta em parede ou em outro movel;
   *  4. com ela no lugar, TODO comodo possuido continua alcancavel a partir da
   *     porta de entrada — e o que impede entulhar o corredor e se trancar.
   *
   * Peca de CHAO (tapete) pula 3 e 4: ela nao tem corpo, entao pode ficar
   * debaixo de qualquer coisa e nao fecha passagem nenhuma.
   */
  private posicaoDeMovelValida(medida: MedidaDeMovel, tx: number, ty: number): boolean {
    const comodos = this.comodosDoJogador();
    if (comodos.length === 0) return false;

    const corpo = this.corpoDoMovel(medida, tx, ty);
    const area: RetTiles = medida.chao
      ? { x0: tx, x1: tx + medida.larguraTiles, y0: ty + 1 - medida.alturaTiles, y1: ty + 1 }
      : corpo;
    const dentroDeUm = comodos.some(
      (c) =>
        area.x0 >= c.ret.x0 && area.y0 >= c.ret.y0 && area.x1 <= c.ret.x1 && area.y1 <= c.ret.y1,
    );
    if (!dentroDeUm) return false;

    const t = this.tamanhoTile;
    const distancia = Math.hypot(
      (tx + 0.5) * t - this.player.x,
      (ty + 0.5) * t - this.player.y,
    );
    if (distancia > ALCANCE_DE_MOBILIA * t) return false;

    if (medida.chao) return true;

    // nenhuma outra peca (colida ela ou nao) pode dividir o tile
    if (this.pegadasDeMovel.some((r) => retangulosSeCruzam(r, corpo))) return false;
    for (const [x, y] of tilesDoRetangulo(corpo)) {
      if (this.tileBloqueado(x, y)) return false;
    }
    return this.passagemPreservada(corpo, comodos);
  }

  /** true se o tile e parede/agua — a mesma marca que barra o jogador. */
  private tileBloqueado(x: number, y: number): boolean {
    const tile = this.camadaObjetos?.getTileAt(x, y);
    return tile ? tile.properties?.[PROP_COLIDE] === true : false;
  }

  /**
   * Flood-fill a partir do tile de entrada do interior, tratando `extra` como
   * bloqueado. Devolve true se todo comodo possuido continua com pelo menos um
   * tile alcancavel — a mesma pergunta que a conferencia offline faz nos mapas
   * gerados, so que agora em tempo de jogo, porque a mobilia e do jogador.
   */
  private passagemPreservada(extra: RetTiles, comodos: ComodoDoMapa[]): boolean {
    const def = buscarMapa(estado.mapa);
    if (!def || !this.camadaObjetos) return true;
    const largura = this.camadaObjetos.tilemap.width;
    const altura = this.camadaObjetos.tilemap.height;

    const livre = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= largura || y >= altura) return false;
      if (this.tileBloqueado(x, y)) return false;
      const tile: RetTiles = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
      if (retangulosSeCruzam(extra, tile)) return false;
      return !this.corposDeMovel.some((r) => retangulosSeCruzam(r, tile));
    };

    const inicio: [number, number] = [def.spawnTile.x, def.spawnTile.y];
    if (!livre(...inicio)) return false;
    const vistos = new Set([inicio.join(',')]);
    const fila: [number, number][] = [inicio];
    for (let i = 0; i < fila.length; i++) {
      const [x, y] = fila[i];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as [number, number][]) {
        const k = `${nx},${ny}`;
        if (!vistos.has(k) && livre(nx, ny)) {
          vistos.add(k);
          fila.push([nx, ny]);
        }
      }
    }

    return comodos.every((c) => {
      for (let y = c.ret.y0; y < c.ret.y1; y++) {
        for (let x = c.ret.x0; x < c.ret.x1; x++) if (vistos.has(`${x},${y}`)) return true;
      }
      return false;
    });
  }

  // ------------------------------------------------------------- exame --

  /**
   * Placa comum, ou o aviso de um predio FECHADO. O gerador poe um objeto
   * `placa` com a propriedade `aviso` na frente da porta dos lotes que tem
   * fachada mas nao tem interior — ver `AVISOS_DE_PREDIO`.
   */
  private examinarPlaca(alvo: Interagivel): void {
    if (typeof alvo.props.missaoItemId === 'string') {
      this.coletarItemDeMissao(String(alvo.props.missaoItemId));
      return;
    }
    if (alvo.props.ambientacao === 'quadro') {
      const avisos = avisosDaSemana(estado.dia);
      this.ui.iniciarDialogo([
        { nome: 'Quadro de avisos', texto: `Avisos da semana ${Math.floor(estado.dia / 7) + 1}:` },
        ...avisos.map((texto, i) => ({ nome: `Aviso ${i + 1}`, texto })),
        { nome: 'Quadro de avisos', texto: 'Estes recados ainda sao apenas informativos; o app Trabalho nao os aceita.' },
      ]);
      return;
    }
    if (typeof alvo.props.segredoId === 'string') {
      const segredo = segredosDoMapa(estado.mapa).find((s) => s.id === alvo.props.segredoId);
      if (segredo) this.examinarSegredo(segredo);
      return;
    }
    const aviso = AVISOS_DE_PREDIO[String(alvo.props.aviso ?? '')];
    if (aviso) {
      this.ui.iniciarDialogo(falasDe('Voce', aviso));
      return;
    }
    this.ui.iniciarDialogo(
      falasDe('Placa', ['Isto e uma placa.', 'Nao tem nada escrito nela ainda.']),
    );
  }

  private coletarItemDeMissao(missaoId: string): void {
    const ponto = PONTOS_ITENS_MISSAO.find((p) => p.missaoId === missaoId);
    if (!ponto || estado.missoesNpc.estado(missaoId) !== 'em_andamento') {
      this.ui.iniciarDialogo(falasDe('Voce', ['Nao ha nada importante aqui agora.']));
      return;
    }
    if (estado.inventario.contar(ponto.itemId) > 0) {
      this.ui.iniciarDialogo(falasDe('Voce', ['Voce ja recolheu este item.']));
      return;
    }
    if (!estado.inventario.cabe(ponto.itemId, 1)) {
      this.ui.iniciarDialogo(falasDe('Inventario', ['Seu inventario esta cheio.']));
      return;
    }
    estado.inventario.adicionar(ponto.itemId, 1);
    this.ui.iniciarDialogo([
      { nome:ponto.titulo, texto:'Ha algo guardado aqui.' },
      { nome:'Encontrado', texto:ITENS[ponto.itemId]?.nome ?? ponto.itemId },
    ]);
  }

  private examinarSegredo(segredo: SegredoDoMapa): void {
    const falas = [{ nome: segredo.titulo, texto: segredo.texto }];
    const recompensa = segredo.recompensa;
    if (recompensa && !estado.worldEvents.ativa(recompensa.flag)) {
      if (!estado.inventario.cabe(recompensa.itemId, recompensa.quantidade)) {
        falas.push({ nome: 'Inventario', texto: 'Parece haver algo aqui, mas seu inventario esta cheio.' });
      } else {
        estado.inventario.adicionar(recompensa.itemId, recompensa.quantidade);
        estado.worldEvents.definir(recompensa.flag, true);
        falas.push({
          nome: 'Encontrado',
          texto: `${ITENS[recompensa.itemId]?.nome ?? recompensa.itemId} x${recompensa.quantidade}.`,
        });
      }
    }
    this.ui.iniciarDialogo(falas);
  }

  /** Pontos invisiveis: o jogador descobre chegando perto, sem marcador no mapa. */
  private lerPontosDeAmbientacao(): Interagivel[] {
    const t = this.tamanhoTile;
    const pontos: Interagivel[] = [];
    if (estado.mapa === 'farm') {
      const x = 38.5 * t;
      const y = 55.5 * t;
      const placa = this.add.rectangle(x, y - t * 0.35, t * 1.15, t * 0.72, 0x6f4a2d)
        .setStrokeStyle(2, 0xd4b07a)
        .setDepth(y);
      const pe = this.add.rectangle(x, y + t * 0.22, t * 0.14, t * 0.55, 0x49301f).setDepth(y - 1);
      placa.setName('quadro_avisos_visual');
      pe.setName('quadro_avisos_pe');
      pontos.push({
        id: 'quadro_avisos_praca', tipo: 'placa', rotulo: 'Ler avisos',
        x, y, props: { ambientacao: 'quadro' },
      });
    }
    for (const segredo of segredosDoMapa(estado.mapa)) {
      pontos.push({
        id: segredo.id, tipo: 'placa', rotulo: 'Examinar',
        x: (segredo.tile.x + 0.5) * t, y: (segredo.tile.y + 0.5) * t,
        props: { segredoId: segredo.id },
      });
    }
    for (const ponto of PONTOS_ITENS_MISSAO.filter((p) => p.mapa === estado.mapa)) {
      pontos.push({
        id:`ponto_${ponto.missaoId}`, tipo:'placa', rotulo:'Examinar',
        x:(ponto.tile.x + 0.5) * t, y:(ponto.tile.y + 0.5) * t,
        props:{ missaoItemId:ponto.missaoId },
      });
    }
    return pontos;
  }

  /** Converte a camada de objetos `interativos` do Tiled em dados do jogo. */
  private lerInterativos(map: Phaser.Tilemaps.Tilemap): Interagivel[] {
    const camada = map.getObjectLayer('interativos');
    if (!camada) return [];

    const lista: Interagivel[] = [];
    for (const obj of camada.objects) {
      // Tiled >= 1.9 grava 'class'; versoes antigas gravam 'type'
      const classe = (obj.type || (obj as { class?: string }).class || '') as TipoInteragivel;
      if (!TIPOS_VALIDOS.includes(classe)) {
        console.warn(`[interativos] classe desconhecida "${classe}" em "${obj.name}" — ignorado`);
        continue;
      }
      const props = lerProps(obj);
      lista.push({
        id: obj.name || `${classe}_${lista.length}`,
        tipo: classe,
        // o Tiled pode sobrescrever o verbo do prompt (ex: porta de saida -> "Sair")
        rotulo: typeof props.rotulo === 'string' ? props.rotulo : ROTULOS[classe],
        x: (obj.x ?? 0) + (obj.width ?? 0) / 2,
        y: (obj.y ?? 0) + (obj.height ?? 0) / 2,
        props,
      });
    }
    return lista;
  }

  /**
   * Converte a camada de objetos `zonas` do Tiled em areas reservadas.
   * A camada e opcional — mapas de interior simplesmente nao a tem.
   */
  private lerZonas(map: Phaser.Tilemaps.Tilemap): ZonaReservada[] {
    const camada = map.getObjectLayer('zonas');
    if (!camada) return [];

    const lista: ZonaReservada[] = [];
    for (const obj of camada.objects) {
      const classe = (obj.type || (obj as { class?: string }).class || '') as TipoZona;
      if (!TIPOS_ZONA_VALIDOS.includes(classe)) {
        console.warn(`[zonas] classe desconhecida "${classe}" em "${obj.name}" — ignorada`);
        continue;
      }
      const props = lerProps(obj);
      // `uso` diz o que a construcao E: moradia, comercio, misto (casa+comercio
      // no mesmo interior) ou praca. Quem gera o mapa e tools/gerar-assets.mjs,
      // que sempre escreve o campo — se ele nao vier, o lote esta malformado e
      // seguir em frente esconderia o problema.
      const uso = props.uso as UsoZona;
      if (!USOS_ZONA_VALIDOS.includes(uso)) {
        console.warn(`[zonas] uso desconhecido "${props.uso}" em "${obj.name}" — ignorada`);
        continue;
      }
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const largura = obj.width ?? 0;
      const altura = obj.height ?? 0;
      lista.push({
        id: obj.name || `${classe}_${lista.length}`,
        tipo: classe,
        uso,
        moradia: USOS_DE_MORADIA.includes(uso),
        construida: props.construida === true,
        mapaInterior: typeof props.mapaInterior === 'string' ? props.mapaInterior : null,
        x,
        y,
        largura,
        altura,
        centro: { x: x + largura / 2, y: y + altura / 2 },
      });
    }
    return lista;
  }
}

/** O que a cena precisa saber pra montar um sprite da camada `flora`. */
interface NpcVisual {
  estado?: EstadoNpc;
  morador?: Morador;
  sprite: Phaser.Physics.Arcade.Sprite;
  interagivel: Interagivel;
  animacao: string;
}

interface ReceitaFlora {
  textura: string;
  quadro: string;
  /** altura no mundo, em tiles */
  alturaTiles: number;
  colide: boolean;
}

interface ObjetoTiledCru {
  name: string;
  class?: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: { name: string; value: PropObjeto }[];
}

/** Nome que o mapa da cidade mostra no cabecalho, por mapa externo. */
const TITULO_DO_MAPA: Record<string, string> = {
  farm: 'Mapa da cidade',
  bairro: 'Bairro da Estacao',
  rural: 'Zona Rural',
};

/** Retangulo em TILES, com o canto (x0,y0) inclusivo e (x1,y1) exclusivo. */
interface RetTiles {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Uma zona de transicao entre mapas externos, ja em pixels do mundo. */
interface BordaDeMapa {
  id: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  destino: string;
  destinoTx: number;
  destinoTy: number;
}

/** Um comodo do interior atual, da camada de objetos `comodos`. */
interface ComodoDoMapa {
  nome: string;
  privado: boolean;
  ret: RetTiles;
}

/** A peca que o jogador esta arrastando pra posicionar. */
interface PosicionamentoMobilia {
  id: string;
  medida: MedidaDeMovel;
  fantasma: Phaser.GameObjects.Image;
  tx: number;
  ty: number;
  valido: boolean;
}

interface CamadaTiledCru {
  name: string;
  data?: number[];
  objects?: ObjetoTiledCru[];
}

interface MapaTiledCru {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: CamadaTiledCru[];
}

/**
 * Traduz um objeto da camada `flora` em textura + frame + tamanho.
 *
 * Arvore e flor tem estagios discretos, e a altura de cada um mora aqui no
 * jogo. Pedra e tamanho continuo (pedrisco a matacao), entao o gerador ja
 * grava `alturaTiles` no objeto — com uma escala unica pra folha toda, pra
 * elas manterem o tamanho relativo entre si.
 */
function receitaDeFlora(
  classe: string,
  props: Record<string, PropObjeto>,
): ReceitaFlora | null {
  if (classe === 'pedra') {
    const indice = Number(props.indice);
    const alturaTiles = Number(props.alturaTiles);
    if (!Number.isFinite(indice) || !Number.isFinite(alturaTiles)) return null;
    return {
      textura: 'pedras',
      quadro: `pedra_${indice}`,
      alturaTiles,
      colide: alturaTiles > PEDRA_COLIDE_ACIMA_DE,
    };
  }

  const estagio = Number(props.estagio);
  const especie = Number(props.especie);
  if (!Number.isFinite(estagio) || !Number.isFinite(especie)) return null;

  if (classe === 'arvore') {
    return {
      textura: 'arvores',
      quadro: `arvore_${especie}_${estagio}`,
      alturaTiles: ALTURA_ARVORE[estagio] ?? 1,
      colide: estagio >= ARVORE_COLIDE_A_PARTIR_DE,
    };
  }
  if (classe === 'flor') {
    return {
      textura: `flores_${String(props.folha)}`,
      quadro: `flor_${especie}_${estagio}`,
      alturaTiles: ALTURA_FLOR[estagio] ?? 1,
      colide: false,
    };
  }
  console.warn(`[flora] classe desconhecida "${classe}" — ignorada`);
  return null;
}

function lerProps(obj: Phaser.Types.Tilemaps.TiledObject): Record<string, PropObjeto> {
  const props: Record<string, PropObjeto> = {};
  const brutas = obj.properties as { name: string; value: PropObjeto }[] | undefined;
  if (Array.isArray(brutas)) for (const p of brutas) props[p.name] = p.value;
  return props;
}

/** Tiles cobertos por um retangulo em coordenadas fracionarias de tile. */
function tilesDoRetangulo(r: RetTiles): [number, number][] {
  const lista: [number, number][] = [];
  for (let y = Math.floor(r.y0); y < Math.ceil(r.y1); y++) {
    for (let x = Math.floor(r.x0); x < Math.ceil(r.x1); x++) lista.push([x, y]);
  }
  return lista;
}

/** Interseccao de retangulos meio-abertos: encostar de lado NAO conta. */
function retangulosSeCruzam(a: RetTiles, b: RetTiles): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

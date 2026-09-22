import { HORARIO_EMPREGO, TURNO_CIDADE } from '../game/cidade';
import { VidaDomestica } from './VidaDomestica';
import { BichosDoMundo } from './BichosDoMundo';
import { adotar, aproximar, companhia, falaSobreCompanhia, PRETENDENTES, textoDaCompanhia } from '../game/companhia';
import { comentarioDaPeca, conjuntoAtual, crescimento, pecaAtual } from '../game/guardaRoupa';
import { aniversarioDe, comentarioDeEsquecimento, contarMeuAniversario, conviteDeAniversario, dataLegivel, ehAniversario, falaDeAniversario, felicitacaoDeHoje, lembrarDoAniversario, sabeDoMeuAniversario, visitaDeAniversario, ANIVERSARIO_PROTAGONISTA } from '../game/aniversarios';
import { eventoNoLugar, dialogoDoEvento, concluirEvento } from '../game/eventosDeConvivencia';
import { CULTIVOS, NOS_RURAIS, RECEITAS, fabricar } from '../game/atividadesRurais';
import { controles } from '../game/InputRouter';
import { ambienteDoLugar, pisoDoMapa, somDoPasso, trilhaDoLugar } from '../game/audio';
import { som } from './Som';
import { obterMiniatura } from './capturaSave';
import { PersonagemModular } from './PersonagemModular';
import { aparenciaPorSemente } from '../game/visualPersonagem';
import { corpoNosPes, sombraDeContato, texturaRadial } from './luzESombra';
import { observarVida, registrarConvivencia, comentarioDoPadrao, naturezaDaRelacao, vinculoDisponivel, concluirVinculo } from '../game/vidaSocial';
import { dataDoDia } from '../game/calendario';
import { intensidadeNoturna } from '../game/clima';
import { AmbienteMundo } from './AmbienteMundo';
import Phaser from 'phaser';
import { cenaNoContexto, cenaPendente, motivoEspera, viuCena } from '../game/campanha';
import { PROP_COLIDE } from '../game/colisao';
import { CONFIG, COR_ZONA, ROTULOS, UI } from '../game/config';
import { formatarDinheiro } from '../game/dinheiro';
import { estado } from '../game/estado';
import { ITENS } from '../game/inventario';
import { lojasDoMapa } from '../game/loja';
import { MAPA_DA_CASA, MAPA_PADRAO, MAPAS, buscarMapa } from '../game/mapas';
import type { DefinicaoMapa } from '../game/mapas';
import { CATALOGO_MOBILIA, buscarExpansao, buscarMovelDeLoja } from '../game/casa';
import { requisitosDoMovel } from '../game/casa';
import type { DefinicaoExpansao, RequisitoMaterial } from '../game/casa';
import type { MedidaDeMovel, MovelPosto } from '../game/casa';
import { buscarNpc, LOCAIS_CIDADE, NPCS } from '../game/npcs';
import type { PerfilNpc } from '../game/npcs';
import { atividadeAtual, buscarMorador, MORADORES } from '../game/moradores';
import type { Morador } from '../game/moradores';
import { PONTOS_POR_REACAO, falaJaConversou, falasDoTema, temasDoDia } from '../game/dialogo';
import type { TemaDeConversa } from '../game/dialogo';
import { PONTOS_POR_TIER_PRESENTE, calcularTierPresente, reacaoPresente } from '../game/presentes';
import { CONFIG_TEMPO } from '../game/relogio';
import { ITEM_ENCOMENDA } from '../game/trabalhos';
import type { EstadoNpc } from '../game/rotinasNpc';
import { apagar, salvar, snapshots, restaurarSnapshot } from '../game/save';
import { USOS_DE_MORADIA, falasDe } from '../game/tipos';
import { AVISOS_DE_ENCONTRO, avisosDaSemana, segredosDoMapa } from '../game/ambientacao';
import { encontroDoDia } from '../game/rotinaSocial';
import type { SegredoDoMapa } from '../game/ambientacao';
import { PONTOS_ITENS_MISSAO } from '../game/missoesNpc';
import type { MissaoNpc } from '../game/missoesNpc';
import { jogadorOuveEncontro } from '../game/encontrosNpc';
import { atividadeComEmprego, PROJETOS_CIDADE } from '../game/cidade';
import { enfileirarFolhasNpc, prepararNpc } from './spritesNpc';
import type { IdProjetoCidade, ProjetoCidade } from '../game/cidade';
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
import { CamadaRepresa } from './CamadaRepresa';
import {
  PERDA_POR_DERROTA,
  PONTO_DE_RESGATE,
  SETOR_DE_RESGATE,
  buscarPainel,
  iniciarPainel,
  naRepresa,
  opcoesAtuais,
  perguntaAtual,
  responderPainel,
  setorDaRepresa,
} from '../game/represa';
import type { ProgressoPainel } from '../game/represa';
import {
  buscarTabelaDeSucata,
  ehSucata,
  marcaDeRaridade,
  precoDeRevenda,
  sortearSucata,
  venderSucata,
} from '../game/sucata';
import { ITENS_DE_LEITURA } from '../game/avisos';
import { MaoDoJogador } from './MaoDoJogador';
import { comportamentoDe, zonaPerigosa } from '../game/equipar';
import { ATAQUE_DO_JOGADOR } from '../game/inimigos';
import { buscarArma, direcaoDaMira } from '../game/armas';
import {
  ANDARES,
  ANDARES_DE_PARADA,
  andarDoMapa,
  andarDoMapaDef,
  buscarAndar,
  flagDeCheckpoint,
  mapaDoAndar,
} from '../game/andares';
import { fichaDoAndar } from '../game/fichas';

/**
 * Quantos tiles cabem na largura da tela. E daqui que sai o zoom da camera:
 * o campo de visao fica fixo em tiles, entao mudar o tamanho do tile no
 * gerador nao muda o que o jogador ve — so a densidade de pixel da arte.
 */
const TILES_VISIVEIS_X = 18;
/** Altura do player em TILES (fica 1,5 tile, como antes). */
const ALTURA_PERSONAGEM_TILES = 1.5;

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

/**
 * O balao de fala que aparece sobre a cabeca de um NPC num encontro.
 *
 * E a UNICA superficie invertida do jogo — letra escura em papel claro, no
 * contrario da paleta de painel. E de proposito: o balao fica desenhado DENTRO
 * do mundo, sobre cenario de qualquer cor, e a mesma moldura escura dos paineis
 * desapareceria contra uma parede de sombra.
 */
const BALAO = { texto: '#18202c', fundo: '#fff8dc' } as const;
/** Halo de poste: acima do veu da noite (850000) e dos efeitos de clima. */
const DEPTH_LUZ_NOTURNA = 850002;

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
  conta: PersonagemModular;
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
  'obra',
  // classes da represa
  'painel',
  'sucata',
  'revenda',
  'elevador',
];
const TIPOS_ZONA_VALIDOS: TipoZona[] = [
  'casa', 'mercado', 'academia', 'parque', 'bar', 'farmacia',
  'oficina', 'escola', 'biblioteca', 'quadra', 'terreno', 'servico',
  'madeireira', 'pedreira', 'fazenda',
  'represa', 'mirante',
];
const USOS_ZONA_VALIDOS: UsoZona[] = ['moradia', 'comercio', 'misto', 'praca', 'vago'];

/**
 * Texto de exame de todo objeto `placa` que carrega um `aviso`: predio fechado,
 * placa de estrada, interdicao de obra e os documentos de manutencao da represa.
 *
 * A tabela mora em src/game/avisos.ts e nao aqui porque e la que as RESPOSTAS
 * dos enigmas da usina estao escritas, e `npm run verificar-represa` le aquele
 * arquivo pra provar duas coisas: que nenhuma resposta ficou so na cabeca de
 * quem escreveu o painel, e que nenhum aviso posto no mundo ficou sem texto.
 */
const AVISOS_DE_PREDIO: Record<string, string[]> = ITENS_DE_LEITURA;

/**
 * Quanto o ponteiro pode ficar longe do jogador, em TILES, pra soltar um movel.
 * Sem isto daria pra mobiliar um comodo do outro lado da casa sem sair do lugar.
 */
const ALCANCE_DE_MOBILIA = 6;
/**
 * Motivo de cada trava de porta da represa. A mensagem existe pra a trava ser
 * LIDA e nao esbarrada: porta que nao abre sem explicacao le como bug.
 */
const MOTIVO_DE_TRAVA: Record<string, string[]> = {
  represaEnergiaGaleria: [
    'O alcapao tem trava eletrica e o LED dela esta apagado.',
    'Sem os geradores da galeria em marcha, isto nao destrava.',
  ],
  represaComportaAberta: [
    'A comporta de servico esta fechada e a pressao do outro lado ainda esta alta.',
    'A mesa de comportas fica aqui mesmo, nas galerias inferiores.',
  ],
  represaAtalhoManutencao: [
    'Porta de servico, tranca mecanica de barra. Ela abre por DENTRO, do lado de la.',
    'Se um dia voce chegar naquele lado, da pra destravar de vez.',
  ],
  represaElevadorLiberado: [
    'O elevador de servico esta morto. Nem o botao acende.',
    'Ele responde a placa mestre, e a placa mestre esta desligada.',
  ],
};

/** Flag da lanterna de manutencao — o que dobra o raio de luz no escuro. */
const FLAG_DA_LANTERNA = 'represaLanterna';

/** Fala de painel que o jogador ja resolveu. */
const FALA_PAINEL_RESOLVIDO = 'Ja esta feito. O painel mostra tudo em verde.';

/**
 * Tile da CAIXA DE DESPACHO na oficina do protagonista, o ponto de revenda de
 * salvado. Canto sudoeste da oficina, ao lado da caixa de ferramenta — tile
 * livre e alcancavel (conferido contra o tilemap gerado).
 */
/**
 * Onde a cabine do elevador para em cada andar de parada.
 *
 * Os andares 1 e 5 sao os setores desenhados a mao, e os tiles deles vem das
 * saidas `elevador_0` e `elevador_4` de `PLANTAS_REPRESA`. Do 10 em diante o
 * tile e o `elevador` do template do andar (ver `PLANTAS_DE_ANDAR`).
 *
 * A tabela existe porque o `spawnTile` do mapa e o alcapao de CHEGADA, que e
 * outro lugar: sair do elevador pelo alcapao faria a cabine parecer estar em
 * lugar diferente a cada viagem.
 */
const PARADA_DO_ANDAR: Record<number, { x: number; y: number }> = Object.fromEntries([
  [1, { x: 3, y: 15 }],
  [5, { x: 5, y: 4 }],
  ...ANDARES_DE_PARADA.filter((n) => n >= 10).map((n) => {
    const def = buscarAndar(n);
    return [n, def ? def.paradaTile : { x: 1, y: 1 }] as const;
  }),
]);

/**
 * O que a tecla F3 poe no inventario. So debug: nada no jogo le esta lista.
 */
const KIT_DE_DEBUG: readonly (readonly [string, number])[] = [
  ['chave_inglesa', 1],
  ['lanterna_manutencao', 1],
  ['pistola', 1],
  ['municao_pistola', 32],
  ['kit_primeiros_socorros', 3],
];

const TILE_DA_REVENDA = { x: 17, y: 20 };

/** Duracao do esmaecer de entrada/saida de cena de um NPC, em ms. */
const DURACAO_FADE_NPC = 220;

export class FarmScene extends Phaser.Scene {
  private ambiente!: AmbienteMundo;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private direcao: Direcao = 'down';

  private interagiveis: Interagivel[] = [];
  private campanhaSuspensa = false;
  private campanhaApos = 0;

  suspenderCampanha(suspensa: boolean): void {
    this.campanhaSuspensa = suspensa;
    this.campanhaApos = this.time.now + 1500;
  }

  iniciarCenaCampanha(id: string): void {
    const cena = cenaPendente(estado);
    if (!cena || cena.id !== id || motivoEspera(estado, cena)) return;
    this.campanhaSuspensa = false;
    this.player.setVelocity(0, 0);
    this.scene.pause('UIScene');
    this.scene.pause();
    this.scene.launch(id === 'prologo' && !estado.worldEvents.ativa('prologo:explorado') && !estado.worldEvents.obter('campanha:quadro') ? 'PrologoScene' : 'CampanhaScene', { id });
  }

  entrarProfundezas(): void {
    if (!viuCena(estado, 'andar50') || estado.mapa !== 'represa_f50') {
      this.ui.avisoRapido('A escada fica além do arquivo do andar 50. Continue sua história.', UI.textoFraco);
      return;
    }
    this.player.setVelocity(0, 0);
    this.scene.pause('UIScene');
    this.scene.pause();
    this.scene.launch('ProfundezasScene');
  }
  private alvo: Interagivel | null = null;
  private npcs: NpcVisual[] = [];
  private balaoEncontro: Phaser.GameObjects.Text | null = null;
  private figurantesAmbientais: FiguranteAmbiental[] = [];
  private luzesNoturnas: Phaser.GameObjects.Image[] = [];
  private luzBiblioteca: Phaser.GameObjects.Graphics | null = null;
  private indicadoresPorta = new Map<string, Phaser.GameObjects.Text>();
  private visuaisDeItens = new Map<string, Phaser.GameObjects.Rectangle>();
  /** areas reservadas pros predios da proxima etapa; sem colisao */
  private zonas: ZonaReservada[] = [];
  /** fachadas/placas dos projetos construiveis do bairro */
  private visuaisDeObra: Phaser.GameObjects.GameObject[] = [];
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
  private marcadoresNpc: MarcadorNpcMapa[] = [];
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

  /**
   * Escuridao, inimigos e combate da represa. `null` em todo mapa que nao e da
   * usina — e assim que nenhum mapa antigo paga por ela.
   */
  private represa: CamadaRepresa | null = null;

  /** Painel de enigma em andamento; `null` fora de um. */
  private painelAtivo: ProgressoPainel | null = null;

  /**
   * Relogios do audio. A escolha de ambiente/trilha e barata, mas nao precisa
   * rodar por quadro: hora, clima e mapa mudam devagar. Os passos, ao contrario,
   * dependem do ritmo da caminhada.
   */
  private proximaTrilhaSonora = 0;
  private proximoPasso = 0;

  /**
   * O item equipado desenhado na mao do jogador, mais a mira. Existe em TODO
   * mapa (uma chave inglesa e visivel na cidade tambem) — diferente da camada da
   * represa, que so existe na usina.
   */
  private mao!: MaoDoJogador;

  /**
   * Minuto de jogo observado no ultimo quadro. E o que faz a tensao da represa
   * subir por MINUTO DE JOGO e nao por quadro — ver `SistemaRepresa.avancar`.
   */
  private minutoObservado = -1;

  /** Escuridao por tile, montada dos comodos do tilemap. */
  private escuridaoDoComodo: { ret: RetTiles; valor: number }[] = [];

  /** Os dados com que a cena foi iniciada, pra poder reiniciar igual. */
  private entradaAtual: { mapa?: string; x?: number; y?: number; salvar?: boolean } | undefined;
  /**
   * NPCs cuja folha ja foi pedida ao loader nesta montagem de cena.
   *
   * Sem isto, um NPC visivel e ainda sem textura reenfileiraria a folha a cada
   * quadro ate ela chegar — dezenas de pedidos pro mesmo arquivo.
   */
  private folhasDeNpcPedidas = new Set<string>();

  /** Texto de espera enquanto um andar da represa e baixado. */
  private avisoDeCarga: Phaser.GameObjects.Text | null = null;

  /**
   * false enquanto o `create` nao terminou.
   *
   * Existe por causa da carga SOB DEMANDA: quando o tilemap de um andar ainda nao
   * chegou, o `create` para no meio e a cena fica sem `player`, sem camada e sem
   * teclas — mas o `update` continua sendo chamado a cada quadro. Sem esta
   * guarda, o primeiro quadro depois de pedir um andar novo estoura em
   * `player.setDepth`.
   */
  private pronto = false;
  private vidaDomestica?: VidaDomestica;
  private bichos?: BichosDoMundo;
  private curativo?: Phaser.GameObjects.Graphics;

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
  init(dados?: { mapa?: string; x?: number; y?: number; salvar?: boolean }): void {
    if (dados?.mapa) estado.mapa = dados.mapa;
    // Guardado pra o carregamento SOB DEMANDA poder reiniciar a cena no mesmo
    // ponto depois de o tilemap chegar (ver `garantirTilemap`).
    this.entradaAtual = dados;
    this.spawn =
      dados?.x !== undefined && dados?.y !== undefined ? { x: dados.x, y: dados.y } : null;
    this.pronto = false;
    this.transicionando = false;
    this.mapaAberto = false;
    this.overlayMapa = null;
    this.marcadorPlayer = null;
    this.marcadoresNpc = [];
    this.interagiveis = [];
    this.npcs = [];
    // Limpo a cada montagem de proposito: um pedido que FALHOU (rede caindo no
    // meio) deixaria o id marcado pra sempre, e o morador ficaria invisivel pelo
    // resto da sessao. Reenfileirar o que ja esta em textura nao custa nada —
    // `enfileirarFolhasNpc` confere o cache antes de pedir.
    this.folhasDeNpcPedidas.clear();
    this.figurantesAmbientais = [];
    this.luzesNoturnas = [];
    this.luzBiblioteca = null;
    this.indicadoresPorta.clear();
    this.visuaisDeItens.clear();
    this.zonas = [];
    this.visuaisDeObra = [];
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
    this.represa?.destruir();
    this.represa = null;
    this.painelAtivo = null;
    this.escuridaoDoComodo = [];
    this.minutoObservado = -1;
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
    // ANDAR SOB DEMANDA: o tilemap pode nao estar no cache ainda. `garantirTilemap`
    // dispara a carga e reinicia a cena quando ela termina — e por isso que ele
    // corta o `create` aqui, antes de qualquer objeto ser criado.
    if (!this.garantirTilemap(def)) return;
    // ATLAS DE MOVEL SOB DEMANDA: idem. Corta o `create` no mesmo lugar e pela
    // mesma razao — a cena reinicia com o atlas em cache.
    if (!this.garantirAtlasDeMovel(def)) return;
    // FOLHA DE NPC SOB DEMANDA: idem, pelos mesmos 14,99 MB que sairam do boot.
    // Vem depois das outras duas de proposito — a conta de quem esta em cena usa
    // o mapa, nao o tilemap, mas reiniciar por causa de tres coisas de uma vez
    // custa uma volta a menos se as duas primeiras ja estiverem em cache.
    if (!this.garantirFolhasDeNpc()) return;

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
      // pickup e recipiente de salvado sao ONE-SHOT e usam o mesmo registro
      if (item.tipo === 'item' || item.tipo === 'sucata') {
        return !estado.itensColetados.has(item.id);
      }
      return true;
    });
    this.interagiveis.push(...this.lerPontosDeLoja());
    this.interagiveis.push(...this.lerPontosDeAmbientacao());
    this.interagiveis.push(...this.lerPontoDeRevenda());
    this.interagiveis.push(...this.lerPontosDeSucata(map));
    this.zonas = this.lerZonas(map);
    this.limparLotesDosProjetos();
    this.tilesPrivados = this.lerComodosPrivados(map);
    this.bordas = this.lerBordas(map);
    this.comodos = this.lerComodos(map);
    this.escuridaoDoComodo = this.lerEscuridaoDosComodos(map);

    const spawnValido = this.spawn && this.spawn.x >= 0 && this.spawn.y >= 0
      && this.spawn.x < map.widthInPixels && this.spawn.y < map.heightInPixels;
    const nasce =
      (spawnValido ? this.spawn : null) ??
      {
        x: (def.spawnTile.x + 0.5) * this.tamanhoTile,
        y: (def.spawnTile.y + 0.5) * this.tamanhoTile,
      };
    this.player = this.physics.add.sprite(nasce.x, nasce.y, 'player-idle-sprites', 'down-0');
    this.configurarPersonagem(this.player);
    // hitbox menor que o sprite, so os pes -> parece melhor em top-down
    this.player.setCollideWorldBounds(true);
    this.curativo = this.add.graphics();

    // SAIU DA ZONA: o que a zona nova nao permite volta pra mochila. Roda no
    // create e nao na troca de mapa porque troca de mapa E um restart de cena —
    // um lugar so, e vale tambem pra save carregado dentro da usina.
    this.ajustarEquipamentoAZona();
    this.mao = new MaoDoJogador(this, this.tamanhoTile);
    this.mao.montar();

    this.criarFigurantesAmbientais();
    this.criarItensColetaveis();
    this.criarConstrucoes(map);
    this.criarProjetosCidade();
    this.criarLuzesNoturnas(map);
    this.atualizarPortasEIluminacao();
    this.criarMoveis(map);
    this.criarMobiliaDoJogador();
    this.ambiente = new AmbienteMundo(this, def.externo, estado.mapa);
    this.criarFlora(map);
    this.criarAtividadesRurais();
    // NPCs entram por ultimo: assim a busca de posicao segura ja conhece
    // predios, moveis, arvores e pedras do mapa carregado.
    this.criarNpcs();
    // registra a TROCA DE MAPA na represa aqui, com 0 minuto: e o que fecha a
    // corrida ao sair da usina e o que marca o nivel mais fundo alcancado.
    // Deixar isso so pro tique de minuto perdia visita curta — descer, olhar e
    // subir em menos de dez minutos de jogo nao contava.
    estado.represa.avancar(estado.mapa, 0);
    this.criarCamadaDaRepresa(map);

    this.physics.add.collider(this.player, objetos);
    if (this.represa) {
      const monstros = this.represa.spritesDeInimigo;
      if (monstros.length > 0) {
        // o inimigo respeita parede e movel como o jogador: sem isto ele
        // atravessa a alvenaria e persegue em linha reta pelo mapa inteiro
        this.physics.add.collider(monstros, objetos);
        this.physics.add.collider(monstros, monstros);
        this.physics.add.collider(this.player, monstros);
        if (this.obstaculos.length > 0) this.physics.add.collider(monstros, this.obstaculos);
      }
    }
    // Quem ainda nao tem folha nao tem sprite; `montarSpriteDeNpc` acrescenta
    // o colisor de cada um na hora em que ele entra em cena.
    const corposDeNpc = this.npcs
      .map((npc) => npc.sprite)
      .filter((sprite): sprite is Phaser.Physics.Arcade.Sprite => sprite !== null);
    if (corposDeNpc.length > 0) {
      this.physics.add.collider(this.player, corposDeNpc);
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
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => { if (!e.repeat && controles.corresponde('mapa', e)) this.alternarMapa(); });

    // ESPACO golpeia com a chave inglesa. So faz algo dentro da represa: a
    // cidade nao tem com quem brigar, e a tecla continua livre lá.
    this.input.keyboard!.addCapture('SPACE');

    // R recarrega a arma de fogo equipada.

    if (import.meta.env.DEV) {
      this.input.keyboard!.on('keydown-F10', () => { if (!this.ui.bloqueado && !this.mapaAberto) this.scene.launch('MenuScene', { pagina: 'dev' }); });
      // F6 mostra/esconde a demarcacao das zonas reservadas (debug)
      this.input.keyboard!.on('keydown-F6', () => this.alternarZonas());

      // F7 avanca uma hora para inspecionar rotinas sem esperar (debug).
      this.input.keyboard!.on('keydown-F7', () => {
        estado.dia += estado.relogio.avancarMinutos(60);
        estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, 0);
        this.sincronizarNpcs();
        console.info(`[tempo] avancado para ${estado.relogio.texto}`);
      });

      // F2 continua util para testar capacidade sem depender do mapa.
      this.input.keyboard!.on('keydown-F2', () => estado.inventario.adicionar('cabo_usb', 1));
      // F3 da o KIT DE EXPLORACAO. Substituiu o "adiciona uma bateria" porque
      // testar o ciclo da represa a mao — descer, achar a pistola no cofre da
      // portaria, comprar municao na madeireira, voltar — leva dez minutos de
      // jogo a cada tentativa, e o que se quer testar e o combate, nao a coleta.
      this.input.keyboard!.on('keydown-F3', () => {
        for (const [id, qtd] of KIT_DE_DEBUG) estado.inventario.adicionar(id, qtd);
        this.ui.avisoRapido('Kit de exploracao no inventario (F3).', UI.sucesso);
      });

      // F9 salva na hora (debug); no jogo, quem salva e o dormir
      this.input.keyboard!.on('keydown-F9', () => {
        console.info('[save] gravado:', this.salvarJogo());
      });

      // F4 apaga o save (debug)
      this.input.keyboard!.on('keydown-F4', () => {
        if (this.ui.bloqueado || this.mapaAberto) return;
        this.ui.confirmar('Apagar o save ativo? Um backup sera preservado.', () => {
          this.ui.avisoRapido(apagar() ? 'Save apagado; backup preservado.' : 'Nao foi possivel criar backup. Save mantido.');
        });
      });

      this.input.keyboard!.on('keydown-F8', () => {
        if (this.ui.bloqueado || this.mapaAberto) return;
        const backups = snapshots();
        if (!backups.length) { this.ui.avisoRapido('Nenhum backup disponivel.'); return; }
        this.ui.abrirMenu('Restaurar qual backup? Datas em UTC.', backups.map((backup, indice) => ({
          rotulo: `${indice + 1}. ${backup.criadoEm.slice(0, 19).replace('T', ' ')}`,
          aoEscolher: () => this.ui.confirmar('Restaurar este backup? A sessao sera recarregada.', () => {
            if (restaurarSnapshot(indice)) window.location.reload();
            else this.ui.avisoRapido('Backup invalido ou sem espaco. Save mantido.');
          }),
        })));
      });

      // F1 liga/desliga o debug das colisoes
      this.input.keyboard!.on('keydown-F1', () => {
        this.physics.world.drawDebug = !this.physics.world.drawDebug;
        if (!this.physics.world.drawDebug) this.physics.world.debugGraphic?.clear();
      });
    }

    this.pronto = true;
    this.vidaDomestica = new VidaDomestica(this, this.ui);
    this.interagiveis.push(...this.vidaDomestica.montar());
    this.bichos = new BichosDoMundo(this, this.tamanhoTile);
    this.interagiveis.push(...this.bichos.montar(estado.mapa));
    if (estado.mapa === MAPA_DA_CASA) this.visitaDeHoje();
    if (this.entradaAtual?.salvar) this.salvarJogo();
    if (!estado.tituloVisto) {
      estado.tituloVisto = true;
      this.time.delayedCall(1, () => this.scene.launch('MenuScene', { pagina: 'titulo' }));
    }
  }

  update(_tempo: number, delta: number): void {
    // O `create` pode ter parado no meio esperando o tilemap de um andar (ver
    // `garantirTilemap`): nesse quadro nao ha player, nem camada, nem teclas.
    if (!this.pronto) return;
    if (!this.campanhaSuspensa && this.time.now > this.campanhaApos && !this.ui.bloqueado && !this.transicionando && !this.mapaAberto
      && !this.scene.isActive('MenuScene') && !this.scene.isActive('CampanhaScene') && !this.scene.isActive('ProfundezasScene')) {
      const cena = cenaNoContexto(estado);
      if (cena) { this.iniciarCenaCampanha(cena.id); return; }
    }
    // reordena o player entre as arvores conforme ele anda
    this.player.setDepth(this.player.y);
    this.desenharAparencia();

    if (!this.ui.bloqueado && !this.transicionando && !this.mapaAberto) {
      const diaAntes = estado.dia;
      const minutoAntes = estado.relogio.minutos;
      estado.dia += estado.relogio.avancar(delta * estado.preferencias.valores.tempo);
      if (estado.dia !== diaAntes) { estado.eventos.emit('DAY_STARTED', { dia: estado.dia }); this.atualizarVisuaisRurais(); }
      if (estado.relogio.minutos !== minutoAntes) estado.eventos.emit('TIME_CHANGED', { dia: estado.dia, minuto: estado.relogio.minutos });
      if (estado.relogio.minutos !== minutoAntes) observarVida(estado, this.player.x / this.tamanhoTile, this.player.y / this.tamanhoTile);
      estado.vida.atualizar(delta);
      // a tensao da represa conta MINUTO DE JOGO, entao ela so avanca quando o
      // relogio vira — nao a cada quadro
      if (this.minutoObservado !== estado.relogio.minutos) {
        const antes = this.minutoObservado;
        this.minutoObservado = estado.relogio.minutos;
        estado.represa.avancar(estado.mapa, antes < 0 ? 0 : CONFIG_TEMPO.minutosPorTick);
      }
      estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, delta);
      const iniciados = estado.encontrosNpc.atualizar(estado.dia, delta, estado.rotinasNpc.todos, false, id => estado.relacoes.getScore(id));
      if (iniciados.length > 0) estado.rotinasNpc.pausarParaEncontro(iniciados, (estado.encontrosNpc.ativo?.definicao.falas.length ?? 4) * 1450);
      this.sincronizarNpcs();
    }

    estado.armas.atualizar(delta);
    this.atualizarBalaoEncontro();

    this.atualizarFigurantesAmbientais();
    this.bichos?.atualizar(delta, estado.mapa, estado.relogio.minutos, estado.clima.paraDia(estado.dia), dataDoDia(estado.dia).estacao, this.player, this.ui.bloqueado || this.mapaAberto);
    this.atualizarPortasEIluminacao();
    this.atualizarLuzesNoturnas();
    this.ambiente.atualizar(this.ui.bloqueado || this.mapaAberto ? 0 : delta, estado.relogio.minutos, dataDoDia(estado.dia).estacao, estado.clima.paraDia(estado.dia), estado.preferencias.valores);

    this.atualizarTrilhaSonora(delta);

    if (controles.apertouPad('mapa')) this.alternarMapa();
    if (this.mapaAberto) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(this.mao.animacaoDoCorpo('idle', this.direcao), true);
      this.mao.atualizar(delta, this.player, this.direcao);
      this.atualizarMarcadoresMapa();
      return;
    }

    this.represa?.atualizar(delta, this.player, this.ui.bloqueado || this.transicionando);

    this.atualizarAlvo();
    if (this.atravessarBordaSeEncostou()) return;

    // com dialogo/menu aberto — ou com uma peca na mao — o player fica parado
    if (this.ui.bloqueado || this.transicionando || this.posicionando) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(this.mao.animacaoDoCorpo('idle', this.direcao), true);
      this.mao.atualizar(delta, this.player, this.direcao);
      this.mao.atualizarMira(this.input.activePointer, false);
      return;
    }

    // MIRA E TIRO. Com arma de fogo na mao, a direcao do personagem passa a
    // sair do cursor e nao do movimento — e o que permite andar pra tras
    // atirando, que e o unico jeito de a arma valer contra um bicho rapido.
    const armaNaMao = this.armaEquipada();
    if (armaNaMao) {
      const p = this.input.activePointer;
      const dx = controles.usandoMiraPad ? controles.mira.x * 100 : p.worldX - this.player.x;
      const dy = controles.usandoMiraPad ? controles.mira.y * 100 : p.worldY - (this.player.y - this.tamanhoTile * 0.6);
      if (Math.hypot(dx, dy) > 2) this.direcao = direcaoDaMira(dx, dy);
      this.mao.atualizarMira(controles.usandoMiraPad ? { worldX: this.player.x + dx, worldY: this.player.y - this.tamanhoTile * .6 + dy } : p, true);
      if (p.leftButtonDown() || controles.atirando) this.atirar(dx, dy);
      if (controles.apertou('recarregar')) this.recarregarArma();
    } else {
      this.mao.atualizarMira(this.input.activePointer, false);
    }

    // golpe: trava o movimento pela duracao da animacao, o que e o que impede
    // andar e bater ao mesmo tempo e o que da peso ao ataque
    if (this.represa && controles.apertou('atacar')) {
      this.represa.atacar(this.player, this.direcao, this.danoDoGolpe());
      som.tocar('golpe');
    }
    if (this.represa?.atacando) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(this.mao.animacaoDoCorpo('idle', this.direcao), true);
      this.mao.atualizar(delta, this.player, this.direcao);
      return;
    }

    const esquerda = this.cursors.left.isDown || controles.pressionada('esquerda');
    const direita = this.cursors.right.isDown || controles.pressionada('direita');
    const cima = this.cursors.up.isDown || controles.pressionada('cima');
    const baixo = this.cursors.down.isDown || controles.pressionada('baixo');

    const vx = (direita ? 1 : 0) - (esquerda ? 1 : 0);
    const vy = (baixo ? 1 : 0) - (cima ? 1 : 0);

    const correndo = controles.pressionada('correr');
    const velocidade = (correndo ? CONFIG.movimento.correr : CONFIG.movimento.andar) * (estado.equipamento.equipado('acessorio') === 'smartwatch' ? 1.05 : 1);
    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(velocidade);
    this.player.setVelocity(v.x, v.y);

    if (vx !== 0 || vy !== 0) {
      // Horizontal tem prioridade na escolha da animacao. Com arma de fogo na
      // mao a direcao ja veio da MIRA lá em cima, e o movimento nao a rouba —
      // e o que permite recuar atirando.
      if (!armaNaMao) {
        if (vx !== 0) this.direcao = vx > 0 ? 'right' : 'left';
        else this.direcao = vy > 0 ? 'down' : 'up';
      }
      this.player.anims.play(
        this.mao.animacaoDoCorpo(correndo ? 'run' : 'walk', this.direcao),
        true,
      );
      this.pisar(correndo);
    } else {
      this.proximoPasso = 0;
      this.player.anims.play(this.mao.animacaoDoCorpo('idle', this.direcao), true);
    }
    this.mao.atualizar(delta, this.player, this.direcao);
  }

  /** Chamado pela UIScene quando o jogador aperta E / clica. */
  interagir(): void {
    if (this.posicionando || !this.alvo) return;
    switch (this.alvo.tipo) {
      case 'domestico':
        this.vidaDomestica?.interagir(String(this.alvo.props.acao));
        break;
      case 'bicho':
        this.interagirComBicho(this.alvo);
        break;
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
        this.ui.abrirMenu('Bancada de trabalho', [
          { rotulo: 'Moveis e decoracao', aoEscolher: () => this.abrirCatalogoDeMobilia() },
          ...RECEITAS.map(r => ({ rotulo: `${r.nome}: ${r.ingredientes.map(([id, n]) => `${n} ${ITENS[id]?.nome ?? id}`).join(' + ')}`, aoEscolher: () => { this.ui.avisoRapido(fabricar(r.id, estado.inventario)); this.salvarJogo(); } })),
        ]);
        break;
      case 'atividade_rural':
        this.abrirAtividadeRural(this.alvo.id);
        break;
      case 'obra':
        this.abrirProjetoCidade(this.alvo);
        break;
      case 'painel':
        this.abrirPainelDaRepresa(this.alvo);
        break;
      case 'sucata':
        this.recolherSucata(this.alvo);
        break;
      case 'elevador':
        this.abrirElevador(this.alvo);
        break;
      case 'revenda':
        this.abrirRevendaDeSucata();
        break;
      case 'porta':
        if (!this.portaDestrancada(this.alvo)) return;
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
    som.tocar('porta');
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapa: destino.chave, x: posicao.x, y: posicao.y });
    });
  }

  // --------------------------------------------------------------- audio --

  /**
   * Ambiente e trilha do lugar onde o jogador esta. As duas decisoes moram em
   * `game/audio.ts`; aqui so entram mapa, hora, clima e andar.
   */
  private atualizarTrilhaSonora(delta: number): void {
    this.proximaTrilhaSonora -= delta;
    if (this.proximaTrilhaSonora > 0) return;
    this.proximaTrilhaSonora = 500;
    const lugar = {
      mapa: estado.mapa,
      minuto: estado.relogio.minutos,
      clima: estado.clima.paraDia(estado.dia),
      externo: buscarMapa(estado.mapa)?.externo ?? false,
      andar: andarDoMapa(estado.mapa),
    };
    som.ambiente(ambienteDoLugar(lugar));
    som.musica(trilhaDoLugar(lugar));
  }

  /** Passo no ritmo da caminhada; a superficie vem do mapa. */
  private pisar(correndo: boolean): void {
    const agora = this.time.now;
    if (agora < this.proximoPasso) return;
    this.proximoPasso = agora + (correndo ? 260 : 380);
    som.tocar(somDoPasso(pisoDoMapa(estado.mapa)));
  }

  // -------------------------------------------------------------- dormir --

  /** Fluxo unico usado por qualquer cama, preservando o interior no save. */
  private dormir(zonaAtual: string, depoisDaNoite = false): void {
    if (zonaAtual !== estado.mapa) {
      console.warn(`[dormir] zona mudou de "${zonaAtual}" para "${estado.mapa}" antes da confirmacao`);
      return;
    }
    if (!depoisDaNoite && zonaAtual === 'oficina' && estado.dia >= 7 && !estado.worldEvents.ativa(`noite:vivida:${estado.dia}`) && (estado.dia % 17 === 8 || estado.dia % 13 === 7)) {
      this.scene.launch('NoiteScene', { tipo: estado.dia % 17 === 8 ? 'sonho' : 'insonia', aoDormir: () => this.dormir(zonaAtual, true) }); return;
    }
    this.transicionando = true;
    som.tocar('dormir');
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const mudouDia = estado.worldEvents.obter('noite:amanhecer') !== estado.dia || estado.relogio.minutos >= 360;
      if (mudouDia) estado.dia += 1;
      estado.worldEvents.definir('noite:amanhecer', -1);
      if (mudouDia) estado.eventos.emit('DAY_STARTED', { dia: estado.dia });
      this.atualizarVisuaisRurais();
      estado.relogio.definir(CONFIG_TEMPO.horaAoAcordar);
      // dormir na propria cama cura por inteiro. E a unica cura gratuita do
      // jogo, e por isso ela custa um dia.
      estado.vida.restaurarTudo();
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

  salvarJogo(): boolean {
    const miniatura = obterMiniatura();
    if (miniatura) estado.worldEvents.definir('save:miniatura', miniatura);
    return salvar({
      dia: estado.dia,
      progressao: estado.progressao.serializar(),
      clima: estado.clima.serializar(),
      rural: estado.rural.serializar(),
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
      cidade: estado.cidade.serializar(),
      vida: estado.vida.serializar(),
      represa: estado.represa.serializar(),
      equipamento: estado.equipamento.serializar(),
      armas: estado.armas.serializar(),
      arquivo: estado.arquivo.serializar(),
    });
  }

  // --------------------------------------------------------------- itens --

  private criarItensColetaveis(): void {
    for (const alvo of this.interagiveis) {
      // Recipiente de SALVADO: caixa fechada, nao um icone de item. A cor sai
      // da tabela e nao do conteudo — o jogador nao sabe o que tem dentro
      // antes de abrir, e o premio de puzzle (`requer`) usa o tom quente pra
      // se destacar de longe no escuro.
      if (alvo.tipo === 'sucata') {
        const premio = Boolean(alvo.props.requer);
        const visual = this.add
          .rectangle(
            alvo.x,
            alvo.y,
            this.tamanhoTile * 0.7,
            this.tamanhoTile * 0.55,
            premio ? 0x8a6a3a : 0x55565a,
          )
          .setStrokeStyle(2, premio ? 0xe0b862 : 0x9aa0a6, 0.9)
          .setDepth(alvo.y);
        this.visuaisDeItens.set(alvo.id, visual);
        continue;
      }
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

    som.tocar('pegar');
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
      const aparencia = aparenciaPorSemente(rota.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0));
      if (rota.tipo === 'idoso') aparencia.cabelo = 3;
      const corpo = new PersonagemModular(this, rota.inicio.x * this.tamanhoTile, rota.inicio.y * this.tamanhoTile,
        aparencia, this.tamanhoTile * (rota.tipo === 'crianca' ? 1.05 : 1.5));
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
      const dx = figurante.fim.x - figurante.inicio.x, dy = figurante.fim.y - figurante.inicio.y;
      const direcao = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
      figurante.conta.pose(passo < 1 ? 'walk' : 'idle', direcao, this.time.now, estado.preferencias.valores.movimentoReduzido);
    }
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
        fontSize: UI.tamanho,
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

  private criarLuzesNoturnas(map: Phaser.Tilemaps.Tilemap): void {
    this.luzesNoturnas.forEach((luz) => luz.destroy());
    this.luzesNoturnas = [];

    // A luz de dentro da biblioteca nao depende de poste: ela e a janela acesa
    // no horario de funcionamento, e fica antes do desvio abaixo.
    if (estado.mapa === 'biblioteca') {
      this.luzBiblioteca = this.add.graphics();
      this.luzBiblioteca.fillStyle(0xffe8a2, 0.18);
      this.luzBiblioteca.fillRect(11.5 * this.tamanhoTile, 8 * this.tamanhoTile, 8 * this.tamanhoTile, 6 * this.tamanhoTile);
      this.luzBiblioteca.setDepth(DEPTH_OVERLAY + 10);
      this.luzBiblioteca.setVisible(false);
    }

    // POSTE DE VERDADE ACENDE. Antes a luz noturna saia de uma tabela de
    // pontos a mao, escrita quando o mapa nao tinha poste nenhum: o halo caia
    // perto do lugar certo por aproximacao. Com o remap do centro, cada peca de
    // iluminacao sai do gerador marcada com `luz`, e a cena acende exatamente
    // onde ela esta. Mapa sem peca marcada continua com a tabela.
    const daLampada = this.luzesDosMoveis(map);
    if (daLampada.length > 0) {
      for (const ponto of daLampada) this.acenderLuzNoturna(ponto);
      return;
    }

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
      this.acenderLuzNoturna({
        x: ponto.x * this.tamanhoTile,
        y: ponto.y * this.tamanhoTile,
        r: ponto.r,
      });
    }
  }

  /**
   * Um halo quente, escondido de dia. Coordenada em PIXEL.
   *
   * A PROFUNDIDADE E O PONTO: o veu da noite do `AmbienteMundo` fica em 850000,
   * e o halo ficava embaixo dele — a luz do poste era escurecida junto com o
   * resto e praticamente desaparecia. Acima do veu, o poste passa a abrir uma
   * poca de luz de verdade no calcamento.
   */
  private acenderLuzNoturna(ponto: { x: number; y: number; r: number }): void {
    const grafico = this.add.image(ponto.x, ponto.y, texturaRadial(this))
      .setDisplaySize(ponto.r * 2, ponto.r * 2).setTint(0xffd59b).setBlendMode(Phaser.BlendModes.ADD);
    grafico.setDepth(DEPTH_LUZ_NOTURNA);
    grafico.setVisible(false);
    this.luzesNoturnas.push(grafico);
  }

  /**
   * Pontos de luz vindos da camada `moveis`: poste, balizador e luminaria
   * marcados com `luz` pelo gerador. O halo sobe pra altura da lampada e o raio
   * acompanha o tamanho da peca — poste de braco ilumina mais que balizador.
   */
  private luzesDosMoveis(map: Phaser.Tilemaps.Tilemap): { x: number; y: number; r: number }[] {
    return (map.getObjectLayer('moveis')?.objects ?? []).flatMap((obj) => {
      const props = lerProps(obj);
      if (props.luz !== true) return [];
      const alturaTiles = Number(props.alturaTiles) || 2;
      return [{
        x: obj.x ?? 0,
        y: (obj.y ?? 0) - alturaTiles * this.tamanhoTile * 0.75,
        r: this.tamanhoTile * (0.9 + alturaTiles * 0.32),
      }];
    });
  }

  private atualizarLuzesNoturnas(): void {
    for (const luz of this.luzesNoturnas) luz.setVisible(true).setAlpha(intensidadeNoturna(estado.relogio.minutos));
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
      this.interagiveis.push(alvo);
      const npc: NpcVisual = {
        estado: estadoNpc,
        sprite: null,
        interagivel: alvo,
        animacao: def.sprite ? `npc-${def.id}-` : '',
        visivelAplicado: false,
      };
      this.npcs.push(npc);
      this.montarSpriteDeNpc(npc);
    }
    this.sincronizarNpcs(true);
  }

  /**
   * Monta o sprite de um NPC, se a folha dele ja estiver em textura.
   *
   * Idempotente, e sem efeito nenhum quando a folha falta: devolve false e quem
   * chamou decide se pede. O colisor com o jogador entra aqui porque o da
   * montagem da cena so conhece quem existia naquele instante.
   */
  private montarSpriteDeNpc(npc: NpcVisual): boolean {
    if (npc.sprite) return true;
    const def = buscarNpc(npc.estado.id);
    if (!def || !prepararNpc(this, def)) return false;

    const textura = def.sprite ? `npc-${def.id}-sprites` : 'player-idle-sprites';
    const sprite = this.physics.add.sprite(
      npc.interagivel.x,
      npc.interagivel.y,
      textura,
      'down-0',
    );
    this.configurarNpc(sprite);
    sprite.setImmovable(true);
    if ('tint' in def && def.tint !== undefined) sprite.setTint(def.tint);
    sprite.anims.play(`${npc.animacao}idle-down`);
    sprite.setVisible(false);
    npc.sprite = sprite;
    this.physics.add.collider(this.player, sprite);
    return true;
  }

  /**
   * Pede a folha de um NPC que precisa aparecer e ainda nao tem sprite.
   *
   * Nao ha listener de COMPLETE aqui de proposito: a cena ja escuta esse evento
   * pra reiniciar depois de buscar tilemap e atlas de movel, e uma folha de NPC
   * chegando no meio disso dispararia o restart. Em vez disso `sincronizarNpcs`
   * tenta montar de novo a cada quadro — quando a textura chega, ela monta.
   */
  private garantirSpriteDeNpc(npc: NpcVisual): void {
    if (this.montarSpriteDeNpc(npc)) return;
    const def = buscarNpc(npc.estado.id);
    if (!def || this.folhasDeNpcPedidas.has(def.id)) return;
    this.folhasDeNpcPedidas.add(def.id);
    if (enfileirarFolhasNpc(this, def) > 0) this.load.start();
  }

  /**
   * As folhas de quem esta em cena AGORA, antes de a cena montar.
   *
   * Mesmo formato de `garantirTilemap` e `garantirAtlasDeMovel`: corta o
   * `create` no mesmo lugar, dispara a carga e reinicia quando ela termina.
   *
   * O conjunto e pequeno porque quem esta dentro de casa nao conta — no mapa
   * mais povoado sao dezessete dos trinta e tres. O minimapa entra na mesma
   * conta: ele mostra retrato de quem esta no mapa EXTERNO, mesmo com o jogador
   * dentro de um interior, e por isso `posicaoNpcNoMapaAberto` tambem pesa.
   */
  private garantirFolhasDeNpc(): boolean {
    let pedidos = 0;
    estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, 0);
    for (const estadoNpc of estado.rotinasNpc.todos) {
      const emCena = this.posicaoNpcNoMapa(estadoNpc) !== null
        || this.posicaoNpcNoMapaAberto(estadoNpc.id) !== null;
      if (!emCena) continue;
      const def = buscarNpc(estadoNpc.id);
      if (!def) continue;
      this.folhasDeNpcPedidas.add(def.id);
      pedidos += enfileirarFolhasNpc(this, def);
    }
    if (pedidos === 0) return true;
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.restart(this.entradaAtual));
    this.load.start();
    return false;
  }

  /**
   * Entrar e sair de cena com ESMAECIMENTO, e nao num quadro.
   *
   * A maioria dos NPCs troca de lugar sem caminhar (ver `assumir_lugar` em
   * npcs.ts) — e o unico jeito honesto de mover quem so tem poses paradas na
   * arte. O esmaecimento e o que faz esse aparecer/desaparecer ler como
   * intencional em vez de falha: ninguem pisca no meio da rua.
   *
   * `visivelAplicado` existe porque `sprite.visible` continua true durante o
   * esmaecimento de saida: sem ele, cada quadro reiniciaria o tween.
   */
  private aplicarVisibilidadeDeNpc(npc: NpcVisual, visivel: boolean, instantaneo = false): void {
    if (npc.visivelAplicado === visivel || !npc.sprite) return;
    const boneco = npc.sprite;
    npc.visivelAplicado = visivel;
    this.tweens.killTweensOf(boneco);
    // Na montagem da cena nao ha o que esmaecer: a camera inteira ja entra com
    // fade. Fazer isso aqui tambem deixaria o NPC em alpha 0 se o primeiro
    // quadro demorasse.
    // MOVIMENTO REDUZIDO reusa o caminho instantaneo, que ja existia pra
    // montagem de cena. Um NPC surgindo e desaparecendo em fade a cada troca de
    // rotina e movimento nao pedido, e o mesmo `setVisible` resolve.
    if (instantaneo || estado.preferencias.valores.movimentoReduzido) {
      boneco.setVisible(visivel).setAlpha(1);
      return;
    }
    if (visivel) {
      boneco.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: boneco, alpha: 1, duration: DURACAO_FADE_NPC });
      return;
    }
    this.tweens.add({
      targets: boneco,
      alpha: 0,
      duration: DURACAO_FADE_NPC,
      // pode ter voltado a ser visivel no meio do caminho
      onComplete: () => { if (!npc.visivelAplicado) boneco.setVisible(false); },
    });
  }

  private sincronizarNpcs(instantaneo = false): void {
    for (const npc of this.npcs) {
      const posicao = this.posicaoNpcNoMapa(npc.estado);
      const visivel = posicao !== null;
      // Quem precisa aparecer e nao tem sprite: pede a folha agora. Enquanto ela
      // nao chega o NPC simplesmente nao esta em cena, e o `continue` o mantem
      // fora tambem do alvo de conversa — nao existe interlocutor invisivel.
      if (visivel && !npc.sprite) this.garantirSpriteDeNpc(npc);
      const { sprite, interagivel } = npc;
      if (!sprite) continue;
      this.aplicarVisibilidadeDeNpc(npc, visivel, instantaneo);
      sprite.setActive(visivel);
      if (sprite.body) sprite.body.enable = visivel;
      if (!visivel) continue;
      const x = posicao.x * this.tamanhoTile;
      const y = posicao.y * this.tamanhoTile;
      sprite.setPosition(x, y).setDepth(y);
      interagivel.x = x;
      interagivel.y = y;
      const movendo = npc.estado.movendo;
      const direcao = npc.estado.direcao;
      sprite.anims.play(`${npc.animacao}${movendo ? 'walk' : 'idle'}-${direcao}`, true);
    }
  }

  /** O encontro sempre simula; so a camada visual depende da proximidade. */
  private atualizarBalaoEncontro(): void {
    const ativo = estado.encontrosNpc.ativo;
    const fala = ativo?.definicao.falas[ativo.indiceFala];
    const visual = fala ? this.npcs.find((n) => n.interagivel.props.npcId === fala.npcId) : null;
    // Sem sprite o NPC nao esta em cena (a folha dele ainda vem vindo), e balao
    // de fala precisa de alguem embaixo dele pra sair da boca de quem fala.
    const boneco = visual?.sprite ?? null;
    const perto = Boolean(
      boneco?.visible &&
      jogadorOuveEncontro(
        Phaser.Math.Distance.Between(this.player.x, this.player.y, boneco.x, boneco.y) / this.tamanhoTile,
      ),
    );
    if (!fala || !boneco || !perto) {
      this.balaoEncontro?.destroy();
      this.balaoEncontro = null;
      return;
    }
    if (!this.balaoEncontro) {
      this.balaoEncontro = this.add
        .text(boneco.x, boneco.y - this.tamanhoTile * 1.8, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanho,
          color: BALAO.texto,
          backgroundColor: BALAO.fundo,
          padding: { x: 6, y: 4 },
          wordWrap: { width: 180 },
          align: 'center',
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH_OVERLAY + 20);
    }
    this.balaoEncontro.setText(fala.texto).setPosition(
      boneco.x,
      boneco.y - this.tamanhoTile * 1.8,
    );
  }

  private posicaoNpcNoMapa(npc: EstadoNpc): { x: number; y: number } | null {
    // AO AR LIVRE: o mapa da atividade determina a presenca, inclusive emprego
    // em outro bairro. DefinicaoNpc.mapa continua sendo a residencia canonica.
    const def = NPCS[npc.id];
    if (!def) return null;
    if (npc.dentro === null) {
      return npc.visivel && estado.mapa === npc.mapaAtual ? { x: npc.x, y: npc.y } : null;
    }
    // DENTRO de construcao: aparece so pra quem esta no mesmo interior, venha o
    // NPC do mapa que vier (o Rafael mora no Bairro e atende na academia).
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

  /** Mostra os quatro projetos urbanos, construidos ou ainda como placa de obra. */
  private criarProjetosCidade(): void {
    if (estado.mapa !== 'bairro') return;
    const t = this.tamanhoTile;
    for (const projeto of Object.values(PROJETOS_CIDADE)) {
      const zona = this.zonaPorId(projeto.lote);
      if (!zona) {
        console.warn(`[cidade] lote "${projeto.lote}" nao existe no bairro`);
        continue;
      }
      const construido = estado.cidade.construido(projeto.id);
      const x = zona.centro.x;
      const topo = zona.y + t;
      const base = topo + projeto.pegada.h * t;
      if (construido) {
        const fachada = this.add.image(x, base, 'construcoes', projeto.quadro)
          .setOrigin(0.5, 1)
          .setDepth(base);
        this.visuaisDeObra.push(fachada);
        this.corpoNaBase(x, base, projeto.pegada.w * t, projeto.pegada.h * t);
        zona.construida = true;
      } else {
        const placa = this.add.rectangle(
          projeto.posto.x * t,
          projeto.posto.y * t,
          t * 1.4,
          t * 0.8,
          0xd9b56d,
        ).setStrokeStyle(2, 0x563b20).setDepth(projeto.posto.y * t);
        const texto = this.add.text(placa.x, placa.y, 'OBRA', {
          fontFamily: UI.fonte, fontSize: UI.tamanhoPlaca, color: '#37210f', align: 'center',
        }).setOrigin(0.5).setDepth(placa.depth + 1);
        this.visuaisDeObra.push(placa, texto);
      }
      this.interagiveis.push({
        id: `obra_${projeto.id}`,
        tipo: 'obra',
        rotulo: construido ? 'Gerenciar' : 'Construir',
        x: projeto.posto.x * t,
        y: projeto.posto.y * t,
        props: { projetoId: projeto.id },
      });
    }
  }

  /** Retira cerca/entulho antigo quando um projeto passa a ocupar o lote. */
  private limparLotesDosProjetos(): void {
    if (estado.mapa !== 'bairro' || !this.camadaObjetos) return;
    const t = this.tamanhoTile;
    for (const projeto of Object.values(PROJETOS_CIDADE)) {
      if (!estado.cidade.construido(projeto.id)) continue;
      const zona = this.zonaPorId(projeto.lote);
      if (!zona) continue;
      const x0 = Math.floor(zona.x / t);
      const y0 = Math.floor(zona.y / t);
      const x1 = Math.ceil((zona.x + zona.largura) / t);
      const y1 = Math.ceil((zona.y + zona.altura) / t);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) this.camadaObjetos.removeTileAt(x, y);
      }
    }
  }

  private abrirProjetoCidade(alvo: Interagivel): void {
    const id = String(alvo.props.projetoId) as IdProjetoCidade;
    const projeto = PROJETOS_CIDADE[id];
    if (!projeto) return;
    if (!estado.cidade.construido(id)) {
      this.ui.confirmar(
        `Construir ${projeto.nome} por ${formatarDinheiro(projeto.custo)}`
          + ` + ${this.textoMateriais(projeto.materiais)}?`,
        () => this.construirProjetoCidade(projeto),
      );
      return;
    }
    this.ui.abrirMenu(projeto.nome, [
      { rotulo: 'Usar servico (seg-sex, 08h-17h)', aoEscolher: () => this.usarServicoCidade(projeto) },
      { rotulo: 'Escolher responsavel', aoEscolher: () => this.abrirAtribuicaoDeFuncionario(projeto) },
    ]);
  }

  private usarServicoCidade(projeto: ProjetoCidade): void {
    if (!estado.cidade.funcionario(projeto.id)) { this.ui.avisoRapido('Escolha um responsavel para abrir o servico.'); return; }
    if (!TURNO_CIDADE.dias.includes(estado.dia % 7) || estado.relogio.minutos < TURNO_CIDADE.inicio || estado.relogio.minutos >= TURNO_CIDADE.fim) {
      this.ui.avisoRapido(`Atendimento de segunda a sexta, ${HORARIO_EMPREGO}.`); return;
    }
    if (projeto.id === 'hospital') {
      if (estado.vida.cheio) { this.ui.avisoRapido('Sua saude esta em dia.'); return; }
      this.ui.confirmar('Atendimento e recuperacao completa: R$ 15,00?', () => {
        const r = estado.carteira.gastar(1500, { cabe: () => !estado.vida.cheio, entregar: () => estado.vida.restaurarTudo() });
        if (r.ok) {
          const primeira = !estado.worldEvents.ativa('cuidado:consulta');
          estado.worldEvents.definir('cuidado:consulta', true);
          this.ui.iniciarDialogo([{ nome: 'Você', texto: primeira ? 'A cadeira e a luz branca me fazem prender a respiração antes que alguém diga qualquer coisa.' : 'Reconheço a cadeira. Dessa vez consigo apoiar as costas.' }, { nome: 'Atendimento', texto: 'Vou explicar antes de tocar. Se precisar de uma pausa, você pode pedir.' }, { nome: 'Você', texto: 'Eu peço um minuto. Ninguém discute.' }]);
        } else this.ui.avisoRapido('Saldo insuficiente ou atendimento desnecessário.');
        this.salvarJogo();
      });
    } else if (projeto.id === 'ponto_onibus') {
      this.ui.abrirMenu('Linha municipal - R$ 5,00 / 30 min', ['farm', 'rural'].filter(id => Object.hasOwn(MAPAS, id)).map(id => ({
        rotulo: id === 'rural' ? 'Zona rural' : 'Centro', aoEscolher: () => {
          const destino = buscarMapa(id); if (!destino) return;
          if (!estado.carteira.gastar(500).ok) { this.ui.avisoRapido('Saldo insuficiente.'); return; }
          estado.dia += estado.relogio.avancarMinutos(30);
          this.salvarJogo();
          this.scene.restart({ mapa: id, x: (destino.spawnTile.x + .5) * this.tamanhoTile, y: (destino.spawnTile.y + .5) * this.tamanhoTile, salvar: true });
        },
      })));
    } else {
      this.ui.abrirLoja({ id: `servico_${projeto.id}`, mapa: projeto.mapa, tile: projeto.posto, nome: projeto.nome, rotulo: 'Comprar', categorias: ['normal'],
        itemIds: projeto.id === 'padaria' ? ['pao_frances', 'pao_de_forma', 'pao_caseiro', 'fatia_bolo'] : ['cafe', 'leite', 'fatia_bolo', 'pao_frances'], npcDono: estado.cidade.funcionario(projeto.id) ?? undefined });
    }
  }

  /**
   * Obra publica: dinheiro E material, na mesma transacao da carteira.
   *
   * Mesmo formato da compra de comodo (`comprarExpansao`): a falta de
   * material e avisada ANTES, e dentro da transacao `cabe()` confere de novo,
   * porque entre o aviso e o gasto o jogador pode ter largado uma tabua.
   * Se o saldo nao der, nada e consumido.
   */
  private construirProjetoCidade(projeto: ProjetoCidade): void {
    const faltas = this.materiaisFaltando(projeto.materiais);
    if (faltas.length > 0) {
      this.ui.iniciarDialogo(falasDe('Prefeitura', [
        `Falta material para a obra: ${faltas.join(', ')}. Nada foi consumido.`,
        'A madeireira e a pedreira da zona rural vendem; os pontos de coleta sao de graca.',
      ]));
      return;
    }
    const r = estado.carteira.gastar(projeto.custo, {
      cabe: () => !estado.cidade.construido(projeto.id)
        && this.materiaisFaltando(projeto.materiais).length === 0,
      entregar: () => {
        this.consumirMateriais(projeto.materiais);
        estado.cidade.construir(projeto.id);
      },
    });
    if (!r.ok) {
      this.ui.iniciarDialogo(falasDe('Prefeitura', [
        r.motivo === 'saldo'
          ? `Falta dinheiro. O projeto custa ${formatarDinheiro(projeto.custo)}.`
          : 'Nao foi possivel iniciar a obra agora.',
      ]));
      return;
    }
    this.ui.iniciarDialogo(falasDe('Prefeitura', [
      `${projeto.nome} foi construido.`,
      'Use a placa em frente para atribuir um trabalhador.',
    ]), () => this.scene.restart({ mapa: estado.mapa, x: this.player.x, y: this.player.y }));
  }

  private abrirAtribuicaoDeFuncionario(projeto: ProjetoCidade): void {
    const atual = estado.cidade.funcionario(projeto.id);
    const candidatos = projeto.candidatos.filter((id) => {
      const outro = estado.cidade.projetoDoFuncionario(id);
      return !outro || outro.id === projeto.id;
    });
    const opcoes = candidatos.map((id) => {
      const morador = MORADORES[id];
      return {
        rotulo: `${atual === id ? '[atual] ' : ''}${morador?.nome ?? id} — ${morador?.profissao ?? 'morador'}`,
        aoEscolher: () => this.atribuirFuncionario(projeto, id),
      };
    });
    if (opcoes.length === 0) {
      this.ui.iniciarDialogo(falasDe('Prefeitura', ['Nao ha trabalhador compativel disponivel agora.']));
      return;
    }
    this.ui.abrirMenu(`${projeto.nome} — escolher responsavel`, opcoes);
  }

  private atribuirFuncionario(projeto: ProjetoCidade, npcId: string): void {
    const morador = MORADORES[npcId];
    if (!morador || !estado.cidade.atribuir(projeto.id, npcId)) {
      this.ui.iniciarDialogo(falasDe('Prefeitura', ['Essa atribuicao nao esta disponivel.']));
      return;
    }
    this.sincronizarNpcs();
    this.ui.iniciarDialogo(falasDe('Prefeitura', [
      `${morador.nome} agora e responsavel por ${projeto.nome}.`,
      // A rotina de cada NPC e montada UMA vez por dia, na virada. Trocar agora
      // reiniciaria o dia dele na frente do jogador — ver `atividadesComEmprego`
      // em src/game/cidade.ts.
      `O turno comeca amanha, nos dias uteis, das ${HORARIO_EMPREGO}.`,
    ], morador.id));
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
  private criarAtividadesRurais(): void {
    estado.rural.avancar(estado.dia, estado.clima);
    if (estado.mapa !== 'rural') return;
    for (const n of NOS_RURAIS) {
      const x = (n.x + .5) * this.tamanhoTile, y = (n.y + .5) * this.tamanhoTile;
      if (n.tipo === 'canteiro') {
        this.add.rectangle(x, y, 14, 12, 0x765138).setStrokeStyle(1, 0x513622).setDepth(y - 1);
        const sulcos = this.add.graphics().setDepth(y);
        sulcos.lineStyle(1, 0x4a3121); for (let dy = -4; dy <= 4; dy += 4) sulcos.lineBetween(x - 5, y + dy, x + 5, y + dy);
      } else {
        const frame = ITENS[n.tipo]?.frame;
        if (frame) this.add.image(x, y, 'itens', frame).setDisplaySize(14, 14).setDepth(y);
      }
      this.interagiveis.push({ id: n.id, tipo: 'atividade_rural', rotulo: n.tipo === 'canteiro' ? 'Canteiro' : 'Coletar materiais', x, y, props: {} });
    }
    this.atualizarVisuaisRurais();
  }

  private atualizarVisuaisRurais(): void {
    if (estado.mapa !== 'rural') return;
    this.children.getByName('cultivos-visuais')?.destroy();
    const camada = this.add.container(0, 0).setName('cultivos-visuais');
    for (const n of NOS_RURAIS.filter(n => n.tipo === 'canteiro')) {
      const p = estado.rural.plantio(n.id); if (!p) continue;
      const x = (n.x + .5) * this.tamanhoTile, y = (n.y + .5) * this.tamanhoTile, def = CULTIVOS.find(c => c.id === p.cultivo)!;
      const pronto = p.crescido >= def.dias;
      const g = this.add.graphics(); camada.add(g);
      if (p.regadoDia === estado.dia) { g.fillStyle(0x32291f, .55); g.fillRect(x - 6, y - 5, 12, 10); }
      g.lineStyle(2, p.seco ? 0xbaa06c : 0x599542);
      for (const dx of [-3, 3]) { g.lineBetween(x + dx, y + 3, x + dx, y - 1 - p.crescido); g.lineBetween(x + dx, y, x + dx - 2, y - 2); }
      if (pronto && !p.seco && ITENS[p.cultivo]?.frame) camada.add(this.add.image(x, y - 3, 'itens', ITENS[p.cultivo].frame).setDisplaySize(10, 10));
    }
    camada.setDepth(64.75 * this.tamanhoTile);
  }

  private abrirAtividadeRural(id: string): void {
    estado.rural.avancar(estado.dia, estado.clima);
    const n = NOS_RURAIS.find(n => n.id === id); if (!n) return;
    const agir = (acao: () => string) => { this.ui.avisoRapido(acao()); this.atualizarVisuaisRurais(); this.salvarJogo(); };
    if (n.tipo !== 'canteiro') { agir(() => estado.rural.coletar(id, estado.dia, estado.inventario)); return; }
    const p = estado.rural.plantio(id);
    const def = CULTIVOS.find(c => c.id === p?.cultivo);
    const opcoes = p ? [
      { rotulo: p.seco ? 'Limpar cultivo seco' : p.regadoDia === estado.dia ? 'Regado hoje' : 'Regar canteiro', aoEscolher: () => agir(() => estado.rural.regar(id, estado.dia)) },
      { rotulo: 'Colher', aoEscolher: () => agir(() => estado.rural.colher(id, estado.inventario)) },
    ] : CULTIVOS.map(c => ({ rotulo: `${c.nome}: sementes ${formatarDinheiro(c.custo)} / ${c.dias} dias`, aoEscolher: () => agir(() => estado.rural.plantar(id, c.id, estado.dia, estado.carteira)) }));
    opcoes.push(...CULTIVOS.map(c => ({ rotulo: `Vender ${c.nome} (${estado.inventario.contar(c.id)}) por ${formatarDinheiro(Math.floor((ITENS[c.id]?.preco ?? 0) * .6))}/un`, aoEscolher: () => agir(() => {
      const qtd = estado.inventario.contar(c.id), valor = Math.floor((ITENS[c.id]?.preco ?? 0) * .6) * qtd;
      if (!qtd || !valor) return 'Nenhum produto para vender.';
      if (!estado.carteira.ganhar(valor).ok) return 'Nao foi possivel receber o pagamento.';
      estado.inventario.remover(c.id, qtd); return `Venda concluida: ${formatarDinheiro(valor)}.`;
    }) })));
    this.ui.abrirMenu(p ? `${def?.nome}: ${p.seco ? 'seco' : `${p.crescido}/${def?.dias} dias`}` : 'Canteiro e venda rural', opcoes);
  }

  private criarFlora(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('flora');
    if (!camada) return;

    for (const obj of camada.objects) {
      if (this.floraDentroDeProjetoConstruido(obj.x ?? 0, obj.y ?? 0)) continue;
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
      if (classe === 'arvore' || classe === 'flor') this.ambiente.vegetacao(sprite);
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

  private floraDentroDeProjetoConstruido(x: number, y: number): boolean {
    if (estado.mapa !== 'bairro') return false;
    return Object.values(PROJETOS_CIDADE).some((projeto) => {
      if (!estado.cidade.construido(projeto.id)) return false;
      const zona = this.zonaPorId(projeto.lote);
      return Boolean(
        zona && x >= zona.x && x <= zona.x + zona.largura &&
        y >= zona.y && y <= zona.y + zona.altura,
      );
    });
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

  abrirMapaCelular(): void { if (!this.mapaAberto) this.alternarMapa(); }

  fotografar(): void {
    if (!this.pronto || this.ui.bloqueado || this.transicionando) return;
    if (!estado.worldEvents.ativa('fotografia:liberada') && !estado.worldEvents.ativa('campanha:cena:leticia')) return;
    const flags = estado.worldEvents.serializar().flags;
    if (Object.keys(flags).filter(k => k.startsWith('foto:')).length >= 20) return;
    const mapa = estado.mapa, dia = estado.dia;
    this.player.setVelocity(0, 0); this.scene.pause(); this.scene.pause('UIScene'); this.scene.setVisible(false, 'UIScene');
    this.game.renderer.snapshot(imagem => {
      try {
        if (!(imagem instanceof HTMLImageElement)) return;
        const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 135;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(imagem, 0, 0, 240, 135);
        // Só na região profunda e raramente: uma sombra deslocada, sem figuras familiares.
        if (mapa.startsWith('represa') && estado.arquivo.tem(100) && (dia + Object.keys(flags).filter(k => k.startsWith('foto:')).length) % 13 === 0) {
          ctx.fillStyle = 'rgba(14,22,30,.11)'; ctx.fillRect(160, 20, 5, 78);
        }
        const id = `${dia}-${Math.floor(estado.relogio.minutos)}-${Object.keys(flags).filter(k => k.startsWith('foto:')).length}`;
        estado.worldEvents.definir(`foto:${id}`, JSON.stringify({ id, dia, mapa, imagem: canvas.toDataURL('image/jpeg', .65) }));
        this.salvarJogo(); this.ui.avisoRapido('Fotografia guardada no celular.');
      } finally { this.scene.resume(); this.scene.resume('UIScene'); this.scene.setVisible(true, 'UIScene'); }
    });
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
    return def ? def.mapaExterno : MAPA_PADRAO;
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
            { fontFamily: UI.fonte, fontSize: UI.tamanhoPlaca, color: UI.texto, align: 'center' },
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
        'vermelho: voce   retrato: NPC',
        {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoPlaca,
          color: UI.textoFraco,
        },
      ).setScrollFactor(0),
    );

    this.marcadorPlayer = this.add.circle(0, 0, 4, 0xff5b57).setStrokeStyle(1, 0xffffff);
    this.marcadorPlayer.setScrollFactor(0);
    filhos.push(this.marcadorPlayer);
    // Um retrato corporal substitui o ponto amarelo. Todos os 33 perfis ganham
    // marcador; `atualizarMarcadoresMapa` mostra apenas quem esta neste mapa.
    const idsNpc = estado.rotinasNpc.todos.map((npc) => npc.id);
    this.marcadoresNpc = idsNpc.map((npcId) => {
      const fundoRetrato = this.add.circle(0, 0, 7, 0xfff4d0, 0.96)
        .setStrokeStyle(1, 0x3a2b08)
        .setScrollFactor(0);
      const retrato = this.add.image(0, 5, this.texturaDeRetrato(npcId), 'down-0')
        .setDisplaySize(10, 13)
        .setScrollFactor(0);
      const marcador = this.add.container(0, 0, [fundoRetrato, retrato]).setScrollFactor(0);
      filhos.push(marcador);
      return { npcId, marcador, retrato };
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

    this.marcadoresNpc.forEach(({ npcId, marcador, retrato }) => {
      const posicao = this.posicaoNpcNoMapaAberto(npcId);
      marcador.setVisible(posicao !== null);
      if (!posicao) return;
      // A folha pode ter chegado depois do desenho do mapa — quem esta em cena
      // tem sprite, e o retrato do minimapa usa a MESMA textura.
      const chave = this.texturaDeRetrato(npcId);
      if (retrato.texture.key !== chave) {
        retrato.setTexture(chave, 'down-0').setDisplaySize(10, 13);
      }
      marcador.setPosition(...this.paraCoordenadaDoMapa(posicao.x, posicao.y));
    });
  }

  /**
   * A textura do retrato de minimapa de um NPC.
   *
   * As folhas nao vem mais no boot, entao o retrato de quem nao esta neste mapa
   * pode nao ter textura nenhuma. O recuo e a folha do jogador: o marcador so
   * fica VISIVEL pra quem esta no mapa externo atual, e esse ja teve a folha
   * pedida por `garantirFolhasDeNpc` — mas entre o pedido e a chegada existem
   * alguns quadros, e um `add.image` com chave inexistente desenha o quadrado
   * verde de textura faltando.
   */
  private texturaDeRetrato(npcId: string): string {
    const perfil = buscarNpc(npcId);
    const candidatas = [
      perfil?.spriteParado ? `npc-${npcId}-parado` : null,
      perfil?.sprite ? `npc-${npcId}-sprites` : null,
    ].filter((chave): chave is string => chave !== null);
    return (
      candidatas.find((chave) => this.textures.exists(chave) && this.textures.get(chave).has('down-0'))
      ?? 'player-idle-sprites'
    );
  }

  /** Posicao externa de qualquer NPC, mesmo se o jogador estiver num interior. */
  private posicaoNpcNoMapaAberto(npcId: string): { x: number; y: number } | null {
    const npc = estado.rotinasNpc.porId(npcId);
    const def = NPCS[npcId];
    if (!npc || !def || !npc.visivel || npc.mapaAtual !== this.mapaExternoAtual) return null;
    return { x: npc.x * this.tamanhoTile, y: npc.y * this.tamanhoTile };
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
          fontSize: UI.tamanho,
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
    corpoNosPes(sprite, this.tamanhoTile);
    sombraDeContato(this, sprite, this.tamanhoTile);
  }

  private configurarNpc(sprite: Phaser.Physics.Arcade.Sprite): void {
    const escala = (ALTURA_PERSONAGEM_TILES * this.tamanhoTile) / sprite.height;
    sprite.setOrigin(0.5, 1).setScale(escala).setDepth(sprite.y);
    corpoNosPes(sprite, this.tamanhoTile);
    sombraDeContato(this, sprite, this.tamanhoTile);
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
    registrarConvivencia(estado, def.id);
    const cena = cenaNoContexto(estado, def.id);
    if (cena) { this.iniciarCenaCampanha(cena.id); return; }
    const condicional = estado.worldEvents.consumirFala(def.id);
    const padrao = comentarioDoPadrao(estado, def.id);
    const bicho = falaSobreCompanhia(estado, def.id);
    const roupa = comentarioDaPeca(estado, def.id);
    // Aniversario dele, esquecimento do dia anterior e felicitacao pelo meu.
    const dele = falaDeAniversario(estado, def.id);
    const convite = dele ? conviteDeAniversario(estado, def.id) : null;
    const esquecido = comentarioDeEsquecimento(estado, def.id);
    const meu = felicitacaoDeHoje(estado, def.id);
    const abertura = [...(dele ? [dele] : []), ...(convite ? [convite] : []), ...(esquecido ? [esquecido] : []), ...(meu ? [meu] : []),
      ...(padrao ? [padrao] : []), ...(bicho ? [bicho] : []), ...(roupa ? [roupa] : []), ...(condicional ? [condicional.texto] : []), ...def.dialogoAtual];
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
    const vinculo = vinculoDisponivel(estado, def.id);
    const evento = eventoNoLugar(estado);
    if (evento && dialogoDoEvento(estado).some(f => f.npcId === def.id) && !estado.worldEvents.ativa(`social:evento:${evento.id}:${estado.dia}`)) opcoes.unshift({ rotulo: `Ficar: ${evento.nome}`, aoEscolher: () => this.ui.iniciarDialogo(dialogoDoEvento(estado), () => { concluirEvento(estado); this.salvarJogo(); }) });
    if (vinculo) opcoes.unshift({ rotulo: vinculo.cena.titulo, aoEscolher: () => this.ui.iniciarDialogo(falasDe(def.nome, [...vinculo.cena.falas], def.id), () => {
      concluirVinculo(estado, def.id, vinculo.indice); this.salvarJogo();
    }) });
    const dataDele = aniversarioDe(def.id);
    if (dataDele && ehAniversario(dataDele, estado.dia) && !estado.worldEvents.ativa(`aniversario:lembrei:${def.id}:${dataDoDia(estado.dia).ano}`)) {
      opcoes.unshift({ rotulo: 'Desejar feliz aniversário', aoEscolher: () => {
        lembrarDoAniversario(estado, def.id, false);
        estado.relacoes.ganharRelacao(def.id, 0.5);
        this.salvarJogo();
        this.ui.iniciarDialogo(falasDe(def.nome, ['Obrigado. Você lembrou sem eu avisar, e isso já é o presente.'], def.id));
      } });
    }
    if (estado.relacoes.getScore(def.id) >= 4 && !sabeDoMeuAniversario(estado, def.id)) {
      opcoes.push({ rotulo: 'Contar quando é meu aniversário', aoEscolher: () => {
        contarMeuAniversario(estado, def.id);
        this.salvarJogo();
        this.ui.iniciarDialogo([
          { nome: 'Você', texto: `É ${dataLegivel(ANIVERSARIO_PROTAGONISTA)}. Não é uma data importante; eu só nunca disse a ninguém daqui.` },
          { nome: def.nome, npcId: def.id, texto: 'Anotei. Não prometo nada, mas anotei.' },
        ]);
      } });
    }
    opcoes.push({ rotulo: 'Nossa relação', aoEscolher: () => this.ui.iniciarDialogo(naturezaDaRelacao(estado, def.id).split('\n').map(texto => ({ nome: def.nome, texto, npcId: def.id }))) });
    if (estado.relacoes.getScore(def.id) >= 5 && !estado.worldEvents.ativa(`social:confidencia:${def.id}`)) opcoes.push({ rotulo: 'Contar um pouco sobre mim', aoEscolher: () => this.ui.iniciarDialogo([
      { nome: 'Você', texto: estado.arquivo.tem(188) ? 'Eu perdi pessoas da minha família. Ainda não sei como falar disso sem tentar explicar tudo.' : 'Antes de vir, eu não conseguia mais separar quem eu era do que precisava entregar.' },
      { nome: def.nome, npcId: def.id, texto: 'Obrigado por me contar. Você pode parar por aqui hoje, se quiser.' },
    ], () => { estado.worldEvents.definir(`social:confidencia:${def.id}`, true); this.salvarJogo(); }) });
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
    const atividade = atividadeComEmprego(
      estado.cidade,
      morador,
      estado.dia,
      estado.relogio.minutos,
      atividadeAtual(morador, estado.dia, estado.relogio.minutos),
    );
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
    if (lembrarDoAniversario(estado, def.id, true)) falas.push('Você trouxe isso hoje. Eu não tinha dito que era hoje, e você trouxe.');

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
      // bicho fora do horario/clima dele nao esta desenhado, e nao interage
      if (alvo.tipo === 'bicho' && alvo.props.presente !== true) continue;
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
  /**
   * APARENCIA DO PROTAGONISTA sobre a folha autoral: curativo, acento do
   * conjunto de roupa, peca recebida de morador e crescimento de cabelo/barba.
   * Sao marcas pequenas em Graphics — a folha nao muda, a hitbox nao muda, e a
   * arte ilustrada definitiva (paper doll) entra sem desfazer nada disto.
   */
  private desenharAparencia(): void {
    const g = this.curativo;
    if (!g) return;
    g.clear();
    g.setDepth(this.player.y + .1);
    const e = this.tamanhoTile / 32;
    const x = this.player.x, y = this.player.y, lado = this.direcao === 'left' ? -1 : 1;
    const frente = this.direcao !== 'up';
    if (estado.vida.fracao < .75) g.fillStyle(0xd6d1b9).fillRect(x + (this.direcao === 'left' ? -6 : 4) * e, y - 15 * e, 3 * e, 6 * e);
    const conjunto = conjuntoAtual(estado);
    if (conjunto.id !== 'casual') {
      g.fillStyle(conjunto.cor, .8).fillRect(x - 6 * e, y - 34 * e, 12 * e, 3 * e);
      g.fillStyle(conjunto.detalhe, .75).fillRect(x + (lado > 0 ? 2 : -5) * e, y - 31 * e, 3 * e, 8 * e);
    }
    const peca = pecaAtual(estado);
    if (peca) {
      g.fillStyle(peca.cor, .9);
      if (peca.id === 'bone' && frente) g.fillRect(x - 6 * e, y - 45 * e, 12 * e, 2 * e).fillRect(x + (lado > 0 ? 5 : -8) * e, y - 44 * e, 3 * e, 1.5 * e);
      else if (peca.id === 'cachecol') g.fillRect(x - 6 * e, y - 36 * e, 12 * e, 2.5 * e).fillRect(x + lado * 3 * e, y - 34 * e, 2 * e, 5 * e);
      else if (peca.id === 'luva') g.fillRect(x + 6 * e, y - 24 * e, 2.5 * e, 3 * e).fillRect(x - 8 * e, y - 24 * e, 2.5 * e, 3 * e);
      else g.fillRect(x - 5 * e, y - 26 * e, 10 * e, 6 * e);
    }
    const { cabelo, barba } = crescimento(estado);
    if (cabelo > 0) g.fillStyle(0x2b2622, .5).fillRect(x - 7 * e, y - (40 + cabelo) * e, 14 * e, (1.5 + cabelo) * e);
    if (barba > 0 && frente) g.fillStyle(0x30281f, .3 + barba * .13).fillEllipse(x + lado * e, y - 38 * e, 8 * e, (2 + barba * 1.5) * e);
  }

  /**
   * BICHO: fauna de rua (observar e reconhecer), pretendente a companhia
   * (aproximar por tres dias e dar um nome) e o proprio animal de companhia.
   */
  private interagirComBicho(alvo: Interagivel): void {
    const clima = estado.clima.paraDia(estado.dia);
    if (typeof alvo.props.pretendente === 'string') {
      const pretendente = PRETENDENTES.find(p => p.id === alvo.props.pretendente);
      if (!pretendente) return;
      const passo = aproximar(estado, pretendente.id);
      if (!passo) return;
      this.ui.iniciarDialogo(falasDe('Você', [pretendente.apresentacao, passo.texto]), () => {
        this.salvarJogo();
        if (!passo.adotavel) return;
        this.ui.abrirMenu('Ele está esperando alguma coisa. Talvez um nome.', [
          ...pretendente.nomes.map(nome => ({ rotulo: nome, aoEscolher: () => {
            if (!adotar(estado, pretendente.id, nome)) return;
            this.salvarJogo();
            this.ui.iniciarDialogo(falasDe('Você', [nome + ' vem atrás de mim sem pressa. Ele já sabe o caminho de casa melhor do que eu.']));
          } })),
          { rotulo: 'Hoje não', aoEscolher: () => {} },
        ]);
      });
      return;
    }
    if (alvo.props.companhia === true) {
      const bicho = companhia(estado);
      if (!bicho) return;
      const dentro = estado.mapa === 'oficina';
      this.ui.iniciarDialogo(falasDe('Você', [textoDaCompanhia(estado, clima, dentro)]), () => this.salvarJogo());
      return;
    }
    const texto = this.bichos?.textoDe(String(alvo.props.animal));
    if (texto) this.ui.iniciarDialogo(falasDe('Você', texto.split('\n\n')), () => this.salvarJogo());
  }

  /** Uma visita por ano, em casa, no aniversario do protagonista. */
  private visitaDeHoje(): void {
    const visita = visitaDeAniversario(estado);
    if (!visita) return;
    const def = buscarNpc(visita.npc);
    this.time.delayedCall(700, () => {
      if (this.ui.bloqueado || !this.pronto) return;
      this.ui.iniciarDialogo(falasDe(def?.nome ?? visita.npc, [...visita.falas], visita.npc), () => this.salvarJogo());
    });
  }

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

  // ======================================================== represa ==
  /**
   * Monta a camada da represa (escuridao + inimigos + combate) quando o mapa
   * atual e da usina. Fora dela `montar` sai na primeira linha, entao a chamada
   * aqui e barata em todo mapa antigo.
   */
  // ------------------------------------------- equipamento, arma e municao --
  /**
   * Ajusta o equipamento a ZONA do mapa que acabou de carregar.
   *
   * Roda no `create` e nao num gancho de "troca de mapa" porque trocar de mapa E
   * um `scene.restart` — assim a regra vale tambem pra save carregado dentro da
   * usina e pro resgate apos derrota, sem tres chamadas espalhadas.
   *
   * A arma NAO e apagada: ela volta pra mochila, e a municao que estava no
   * carregador volta com ela. Sem descarregar, oito cartuchos ficariam presos
   * num carregador de uma arma que nao esta mais na mao — e o jogador os veria
   * desaparecer da contagem sem explicacao.
   */
  private ajustarEquipamentoAZona(): void {
    const sairam = estado.equipamento.ajustarAZona(estado.mapa);
    for (const id of sairam) {
      const arma = comportamentoDe(id)?.arma;
      if (arma) estado.armas.descarregar(arma, estado.inventario);
    }
    estado.equipamento.sincronizarCom((id) => estado.inventario.contar(id));
    if (sairam.length > 0) {
      const nomes = sairam.map((id) => ITENS[id]?.nome ?? id).join(', ');
      this.ui.avisoRapido(`Guardou na mochila: ${nomes}.`);
    }
  }

  /**
   * true quando o clique esquerdo esta servindo pra ATIRAR.
   *
   * A UIScene consulta antes de tratar o clique como "interagir": sem isso, cada
   * tiro tambem abriria a porta ou a placa que estivesse no alcance.
   */
  mirandoComArma(): boolean {
    return this.armaEquipada() !== null && !this.ui.bloqueado && !this.mapaAberto;
  }

  /** A arma de fogo na mao, e so quando o mapa aceita tiro. */
  private armaEquipada(): ReturnType<typeof buscarArma> {
    if (!zonaPerigosa(estado.mapa)) return null;
    return buscarArma(comportamentoDe(estado.equipamento.naMao)?.arma);
  }

  /**
   * Dano do golpe. Sem nada na mao sai o valor base — o corpo a corpo existe
   * desde a leva anterior e continua existindo, senao todo save antigo perderia
   * o unico ataque que tinha.
   */
  private danoDoGolpe(): number {
    return comportamentoDe(estado.equipamento.naMao)?.danoCorpoACorpo ?? ATAQUE_DO_JOGADOR.dano;
  }

  /**
   * Um disparo. `SistemaArmas` decide se ele sai (cadencia, recarga, carregador)
   * e a camada da represa cuida do voo — aqui so se junta a boca do cano com o
   * resultado.
   */
  private atirar(dx: number, dy: number): void {
    const arma = this.armaEquipada();
    if (!arma || !this.represa) return;
    const r = estado.armas.disparar(arma.id, { x: dx, y: dy }, true);
    if (!r.ok) {
      // so o carregador vazio merece aviso: cadencia e recarga sao o normal do
      // uso e avisar a cada quadro entupiria a tela
      if (r.falha === 'sem_municao') {
        const tem = estado.inventario.contar(arma.municao);
        this.ui.avisoRapido(
          tem > 0 ? 'Carregador vazio. R pra recarregar.' : 'Sem municao.',
          UI.alerta,
        );
      }
      return;
    }
    this.mao.piscarFogonete();
    som.tocar('tiro');
    this.represa.lancarProjetil(r.tiro, this.mao.pontaDoCano(this.player, this.direcao));
  }

  private recarregarArma(): void {
    const arma = this.armaEquipada();
    if (!arma) return;
    const r = estado.armas.recarregar(arma.id, estado.inventario);
    if (r.ok) {
      som.tocar('recarregar');
      this.ui.avisoRapido(`Recarregou ${r.carregou} cartucho(s).`, UI.sucesso);
      return;
    }
    if (r.falha === 'sem_municao') this.ui.avisoRapido('Nao ha municao na mochila.', UI.alerta);
    else if (r.falha === 'cheio') this.ui.avisoRapido('O carregador ja esta cheio.');
  }

  /**
   * EQUIPAR pela UI. A cena e quem responde porque a regra depende do MAPA, e
   * mapa e assunto de cena.
   */
  equiparItem(id: string): void {
    if (estado.inventario.contar(id) <= 0) return;
    const r = estado.equipamento.equipar(id, estado.mapa);
    if (!r.ok) {
      this.ui.avisoRapido(r.aviso ?? 'Nao da pra equipar isso.', UI.alerta);
      return;
    }
    // a lanterna tem estalo proprio; o resto usa o som generico de equipar
    som.tocar(id === 'lanterna_manutencao' ? 'lanterna' : 'guardar');
    this.ui.avisoRapido(`Equipou ${ITENS[id]?.nome ?? id}.`, UI.sucesso);
  }

  desequiparItem(id: string): void {
    const slot = estado.equipamento.desequiparItem(id);
    if (!slot) return;
    const arma = comportamentoDe(id)?.arma;
    if (arma) estado.armas.descarregar(arma, estado.inventario);
    this.ui.avisoRapido(`Guardou ${ITENS[id]?.nome ?? id}.`);
  }

  /**
   * USAR um item. Devolve true quando o uso GASTOU uma unidade — e a UI que
   * remove do slot, porque so ela sabe de que slot o item saiu.
   */
  usarItemDoInventario(id: string): { ok: boolean; consumiu: boolean; aviso: string; cor?: string } {
    const c = comportamentoDe(id);
    const nome = ITENS[id]?.nome ?? id;
    if (!c?.acao) return { ok: false, consumiu: false, aviso: `${nome} nao se usa.`, cor: UI.alerta };
    switch (c.acao.tipo) {
      case 'curar': {
        if (estado.vida.cheio) {
          return { ok: false, consumiu: false, aviso: 'Voce esta sem nenhum ferimento.' };
        }
        const curou = estado.vida.curar(c.acao.quantidade);
        return {
          ok: true,
          consumiu: !!c.consumivel,
          aviso: `${nome}: +${curou} de vida.`,
          cor: UI.sucesso,
        };
      }
      case 'recarregar': {
        const arma = buscarArma(comportamentoDe(estado.equipamento.naMao)?.arma);
        if (!arma) {
          return { ok: false, consumiu: false, aviso: 'Nenhuma arma na mao.', cor: UI.alerta };
        }
        const r = estado.armas.recarregar(arma.id, estado.inventario);
        return r.ok
          ? { ok: true, consumiu: false, aviso: `Recarregou ${r.carregou}.`, cor: UI.sucesso }
          : { ok: false, consumiu: false, aviso: 'Nao deu pra recarregar.', cor: UI.alerta };
      }
      case 'alternar_luz': {
        if (!estado.equipamento.estaEquipado(id)) {
          return { ok: false, consumiu: false, aviso: 'Equipe a lanterna primeiro.', cor: UI.alerta };
        }
        const acesa = estado.equipamento.alternarLanterna();
        return { ok: true, consumiu: false, aviso: acesa ? 'Lanterna acesa.' : 'Lanterna apagada.' };
      }
      case 'ler':
        return { ok: true, consumiu: false, aviso: c.detalhe ?? ITENS[id]?.descricao ?? nome };
    }
  }

  // ------------------------------------------- andares: carga sob demanda --
  /**
   * Garante que o tilemap do mapa esta no cache.
   *
   * Devolve `false` quando a carga acabou de comecar — nesse caso o `create`
   * PARA aqui e a cena se reinicia sozinha quando o arquivo chega. E o preco de
   * ter cinquenta andares sem pagar por eles no boot; o efeito em jogo e um
   * quadro de "carregando" enquanto o alcapao termina de abrir.
   *
   * Os andares 1 a 5 e todo o resto do mundo NAO passam por aqui: eles vem no
   * `preload` do BootScene como sempre, e `sobDemanda` e falso neles.
   */
  /**
   * Os atlas de movel que ESTE mapa precisa, carregados aqui e nao no boot.
   *
   * Eram todos os catorze, sempre: 35,79 MB baixados antes de o menu aparecer,
   * incluindo a folha de banheiro e a de hospital pra quem estava na rua. O
   * mapa inicial (`bairro`) nao usa nenhum deles, e o mapa que usa mais — uma
   * residencia — usa seis, 15,64 MB.
   *
   * A lista sai da propria camada `moveis` do tilemap, que o gerador ja escreve
   * com `atlas` em cada objeto: nao ha segunda lista pra manter em sincronia, e
   * um layout novo no gerador ja traz o atlas dele junto.
   *
   * Na casa do protagonista entra tambem o catalogo de mobilia COMPRAVEL, que
   * nao esta na camada: as pecas que o jogador ainda nao comprou aparecem na
   * pre-visualizacao da loja, e a peca que ele ja comprou esta em `estado.casa`,
   * nao no tilemap.
   */
  private atlasDeMovelNecessarios(def: DefinicaoMapa): string[] {
    const nomes = new Set<string>();
    // o tilemap cru do cache, nao o objeto Phaser: aqui ainda nao ha tilemap
    // montado, e montar um so pra ler uma camada custaria o mapa inteiro
    const dados = this.cache.tilemap.get(def.tilemapKey)?.data as
      | { layers?: { name: string; objects?: { properties?: { name: string; value: unknown }[] }[] }[] }
      | undefined;
    const camada = dados?.layers?.find((l) => l.name === 'moveis');
    for (const obj of camada?.objects ?? []) {
      const atlas = obj.properties?.find((p) => p.name === 'atlas')?.value;
      if (typeof atlas === 'string' && atlas) nomes.add(atlas);
    }
    if (def.chave === MAPA_DA_CASA) {
      const medidas = this.cache.json.get('mobilia') as Record<string, { atlas?: string }> | undefined;
      for (const medida of Object.values(medidas ?? {})) {
        if (medida.atlas) nomes.add(medida.atlas);
      }
    }
    return [...nomes];
  }

  /**
   * Garante os atlas de movel do mapa. Devolve `false` quando cortou o `create`
   * pra esperar a carga — a cena reinicia sozinha ao fim dela.
   *
   * Sem aviso na tela, ao contrario de `garantirTilemap`: o atlas de movel so
   * falta na PRIMEIRA vez que se entra num tipo de interior, o arquivo esta no
   * mesmo servidor do tilemap que acabou de chegar, e uma tarja "carregando" que
   * pisca por dois quadros e mais ruido que informacao. Se a carga falhar, o
   * proprio `criarMoveis` avisa no console e segue sem a peca, que e o mesmo que
   * ele ja fazia pra frame inexistente.
   */
  private garantirAtlasDeMovel(def: DefinicaoMapa): boolean {
    const faltando = this.atlasDeMovelNecessarios(def).filter(
      (nome) => !this.textures.exists(nome),
    );
    if (faltando.length === 0) return true;
    for (const nome of faltando) {
      this.load.atlas(
        nome,
        `assets/sprites/${nome}.png`,
        `assets/sprites/${nome}.atlas.json`,
      );
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.restart(this.entradaAtual));
    this.load.start();
    return false;
  }


  private garantirTilemap(def: DefinicaoMapa): boolean {
    if (!def.sobDemanda || this.cache.tilemap.has(def.tilemapKey)) {
      this.descarregarAndaresDistantes(def.chave);
      return true;
    }
    this.avisoDeCarga = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Descendo...', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.texto,
        backgroundColor: '#0d0f14e0',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_OVERLAY);
    this.load.tilemapTiledJSON(def.tilemapKey, def.arquivo, { responseType: 'text', timeout: 15000 });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (!this.cache.tilemap.has(def.tilemapKey)) {
        this.avisoDeCarga?.setText('Nao foi possivel carregar o andar.\nEnter: tentar novamente\nEsc: voltar para casa');
        const tentar = () => { limpar(); this.scene.restart(this.entradaAtual); };
        const voltar = () => { limpar(); estado.mapa = MAPA_DA_CASA; this.scene.restart({ mapa: MAPA_DA_CASA }); };
        const limpar = () => {
          this.input.keyboard?.off('keydown-ENTER', tentar);
          this.input.keyboard?.off('keydown-ESC', voltar);
        };
        this.input.keyboard?.once('keydown-ENTER', tentar);
        this.input.keyboard?.once('keydown-ESC', voltar);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, limpar);
        this.avisoDeCarga?.setInteractive().once('pointerdown', tentar);
        return;
      }
      this.avisoDeCarga?.destroy();
      this.avisoDeCarga = null;
      this.scene.restart(this.entradaAtual);
    });
    this.load.start();
    return false;
  }

  /**
   * Tira do cache os andares que nao sao o atual nem os vizinhos imediatos.
   *
   * Com cinquenta andares, uma descida inteira acumularia cinquenta tilemaps na
   * memoria — que e exatamente o que a Parte 51 pede pra nao acontecer. Manter os
   * vizinhos evita recarregar a cada subida e descida de um andar, que e o
   * movimento mais comum.
   */
  private descarregarAndaresDistantes(atual: string): void {
    const andar = andarDoMapaDef(atual)?.andar;
    const vizinhos = new Set(
      andar === undefined
        ? []
        : [andar - 1, andar, andar + 1].filter((n) => n >= 1 && n <= ANDARES.length).map(mapaDoAndar),
    );
    for (const def of Object.values(MAPAS)) {
      if (!def.sobDemanda || vizinhos.has(def.chave)) continue;
      if (this.cache.tilemap.has(def.tilemapKey)) this.cache.tilemap.remove(def.tilemapKey);
    }
  }

  // --------------------------------------------------------------- elevador --
  /**
   * O ELEVADOR DE SERVICO. Onze paradas (andares 1, 5, 10 ... 50), e cada uma
   * precisa ter sido ATIVADA no proprio andar antes de valer.
   *
   * E isso que impede o elevador de ser um pulo pro fundo: chegar na parada e o
   * que a destrava, entao ele so encurta caminho ja andado. E o mesmo contrato
   * do atalho de manutencao da leva anterior, com dez paradas em vez de uma.
   */
  private abrirElevador(alvo: Interagivel): void {
    som.tocar('elevador');
    const aqui = Number(alvo.props.andar) || andarDoMapaDef(estado.mapa)?.andar || 1;
    // Chegar na cabine ATIVA a parada deste andar.
    if (!estado.worldEvents.ativa(flagDeCheckpoint(aqui))) {
      estado.worldEvents.definir(flagDeCheckpoint(aqui), true);
      this.ui.avisoRapido(`Parada ${buscarAndar(aqui)?.codigo ?? aqui} registrada.`, UI.sucesso);
    }
    const paradas = ANDARES_DE_PARADA.filter(
      (n) => n !== aqui && estado.worldEvents.ativa(flagDeCheckpoint(n)),
    );
    if (paradas.length === 0) {
      this.ui.iniciarDialogo([
        {
          nome: 'Elevador de servico',
          texto:
            'A cabine responde e o painel acende. So esta parada esta registrada — '
            + 'as outras precisam ser alcancadas a pe primeiro.',
        },
      ]);
      return;
    }
    this.ui.abrirMenu(
      'Elevador de servico',
      paradas.map((n) => {
        const def = buscarAndar(n);
        return {
          rotulo: `${def?.codigo ?? n} — ${def?.rotulo ?? ''}`,
          aoEscolher: () => this.usarElevador(n),
        };
      }),
    );
  }

  private usarElevador(andar: number): void {
    const def = buscarAndar(andar);
    if (!def) return;
    const destino = mapaDoAndar(andar);
    const planta = buscarMapa(destino);
    if (!planta) return;
    // A cabine larga o jogador no tile de PARADA do andar de destino, e nao no
    // alcapao de chegada: sao lugares diferentes, e sair do elevador pelo
    // alcapao faria a cabine parecer estar em outro lugar a cada viagem.
    const parada = PARADA_DO_ANDAR[andar] ?? planta.spawnTile;
    this.transicionando = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({
        mapa: destino,
        x: (parada.x + 0.5) * this.tamanhoTile,
        y: (parada.y + 0.5) * this.tamanhoTile,
      });
    });
  }

  // ----------------------------------------------------------- ficha medica --
  /**
   * ARQUIVA uma ficha medica ao ler.
   *
   * O documento fica no chao do andar (ele nao entra no inventario — sao
   * cinquenta folhas, e a Parte 17 pede que elas nao ocupem slot). O que fica
   * registrado e o numero: dali pra frente a ficha pode ser relida na tela de
   * Arquivos, e a lacuna de uma que ficou pra tras aparece como `?????`.
   */
  private arquivarFicha(andar: number): void {
    const ficha = fichaDoAndar(andar);
    if (!ficha) return;
    if (estado.arquivo.coletar(andar)) {
      this.ui.avisoRapido(
        andar === 50
          ? 'Ficha 050 arquivada. Seção de psicoterapia disponível nos Arquivos [J].'
          : `Ficha ${String(andar).padStart(3, '0')} arquivada (${estado.arquivo.quantasFichas}/50).`,
        UI.sucesso,
      );
    }
  }

  private criarCamadaDaRepresa(map: Phaser.Tilemaps.Tilemap): void {
    if (!naRepresa(estado.mapa)) return;
    this.represa = new CamadaRepresa(this, this.tamanhoTile, {
      tileBloqueado: (tx, ty) => this.tileBloqueado(tx, ty),
      escuridaoNoTile: (tx, ty) => this.escuridaoNoTile(tx, ty),
      aoSerDerrotado: () => this.serDerrotado(),
    });
    this.represa.montar(map, this.player);
    // marca a primeira visita: e o gancho pro resto do jogo saber que o jogador
    // conhece a usina (fala de NPC, blog, missao futura)
    estado.worldEvents.definir('represaVisitada', true);
  }

  /**
   * Recipientes de SALVADO, da camada `sucata` dos setores.
   *
   * Eles vem numa camada propria e nao em `interativos` porque o gerador precisa
   * distinguir os dois na hora de conferir (a conferencia de setor cobra coisas
   * diferentes de porta, painel e recipiente), e porque assim `lerInterativos`
   * continua com uma lista fechada de classes. Aqui os dois se juntam na mesma
   * lista de alvos — pro resto da cena um recipiente e um interagivel como
   * qualquer outro.
   */
  private lerPontosDeSucata(map: Phaser.Tilemaps.Tilemap): Interagivel[] {
    const camada = map.getObjectLayer('sucata');
    if (!camada) return [];
    const lista: Interagivel[] = [];
    for (const obj of camada.objects) {
      const id = obj.name || `sucata_${lista.length}`;
      if (estado.itensColetados.has(id)) continue;
      lista.push({
        id,
        tipo: 'sucata',
        rotulo: ROTULOS.sucata,
        x: (obj.x ?? 0) + (obj.width ?? 0) / 2,
        y: (obj.y ?? 0) + (obj.height ?? 0) / 2,
        props: lerProps(obj),
      });
    }
    return lista;
  }

  /**
   * Escuridao por comodo, lida do tilemap. O valor cai pra escuridao BASE do
   * setor nos tiles que nenhum comodo cobre (vao de parede, soleira) — sem isso
   * atravessar um vao daria um flash de claro.
   */
  private lerEscuridaoDosComodos(map: Phaser.Tilemaps.Tilemap): { ret: RetTiles; valor: number }[] {
    const camada = map.getObjectLayer('comodos');
    if (!camada) return [];
    const t = this.tamanhoTile;
    const lista: { ret: RetTiles; valor: number }[] = [];
    for (const obj of camada.objects) {
      const props = lerProps(obj);
      const valor = Number(props.escuridao);
      if (!Number.isFinite(valor)) continue;
      lista.push({
        valor: Math.min(1, Math.max(0, valor)),
        ret: {
          x0: Math.round((obj.x ?? 0) / t),
          y0: Math.round((obj.y ?? 0) / t),
          x1: Math.round(((obj.x ?? 0) + (obj.width ?? 0)) / t),
          y1: Math.round(((obj.y ?? 0) + (obj.height ?? 0)) / t),
        },
      });
    }
    return lista;
  }

  private escuridaoNoTile(tx: number, ty: number): number {
    for (const comodo of this.escuridaoDoComodo) {
      const r = comodo.ret;
      if (tx >= r.x0 && tx < r.x1 && ty >= r.y0 && ty < r.y1) return comodo.valor;
    }
    return setorDaRepresa(estado.mapa)?.escuridao ?? 0;
  }

  /**
   * Porta TRANCADA por flag (alcapao que exige setor energizado, atalho que so
   * abre pelo outro lado, elevador que precisa da placa restaurada).
   *
   * Devolve false quando a porta nao abre, e nesse caso ela mesma explica o
   * motivo — trava sem explicacao e o que faz o jogador achar que o jogo
   * quebrou. A mensagem sai da flag, entao acrescentar uma porta trancada nova
   * nao pede codigo novo, so uma linha em `MOTIVO_DE_TRAVA`.
   */
  private portaDestrancada(porta: Interagivel): boolean {
    const flag = String(porta.props.trancada ?? '');
    if (!flag) return true;
    if (estado.worldEvents.ativa(flag)) return true;
    this.ui.iniciarDialogo(
      falasDe('Usina', MOTIVO_DE_TRAVA[flag] ?? ['Esta passagem esta travada.']),
    );
    return false;
  }

  // ------------------------------------------------------ paineis --
  /**
   * Abre um painel de enigma.
   *
   * A UI e o MENU que o jogo ja tem (o mesmo dos temas de conversa e dos
   * presentes): titulo com a pergunta, uma linha por opcao. Foi de proposito —
   * inventar um painel proprio de enigma daria uma segunda janela modal pra
   * manter, e o menu ja resolve escolha, sequencia e digitacao de codigo (o
   * codigo entra digito por digito, com os dez digitos como opcoes).
   */
  private abrirPainelDaRepresa(alvo: Interagivel): void {
    const painel = buscarPainel(alvo.props.painel);
    if (!painel) {
      console.warn(`[painel] id desconhecido em "${alvo.id}":`, alvo.props.painel);
      return;
    }
    if (estado.worldEvents.ativa(painel.flag)) {
      this.ui.iniciarDialogo(falasDe(painel.nome, [FALA_PAINEL_RESOLVIDO]));
      return;
    }
    this.painelAtivo = iniciarPainel(painel, estado.represa.tensao);
    const tentativas = this.painelAtivo.tentativasRestantes;
    this.ui.iniciarDialogo(
      falasDe(painel.nome, [
        painel.abertura,
        tentativas <= 1
          ? 'Voce esta cansado e a mao trema. Da pra uma tentativa, nao mais.'
          : `Da pra tentar ${tentativas} vezes antes de o sistema travar.`,
      ]),
      () => this.desenharPainel(),
    );
  }

  /** Desenha o passo atual do painel em andamento. */
  private desenharPainel(): void {
    const progresso = this.painelAtivo;
    if (!progresso) return;
    const opcoes = opcoesAtuais(progresso).map((rotulo, indice) => ({
      rotulo,
      aoEscolher: () => this.responderNoPainel(indice),
    }));
    this.ui.abrirMenu(perguntaAtual(progresso), opcoes, () => {
      // desistir no meio nao pune: o painel volta do primeiro passo na proxima
      this.painelAtivo = null;
    });
  }

  private responderNoPainel(escolha: number): void {
    const progresso = this.painelAtivo;
    if (!progresso) return;
    const nome = progresso.painel.nome;
    const resposta = responderPainel(progresso, escolha, estado.inventario);
    switch (resposta.resultado) {
      case 'continua':
      case 'passo_ok':
        this.desenharPainel();
        return;
      case 'sem_peca':
        this.painelAtivo = null;
        this.ui.iniciarDialogo(
          falasDe(nome, [
            'O soquete esta vazio e nao ha nada na mochila que sirva.',
            'Uma placa de circuito recuperada resolveria. Elas aparecem a partir da manutencao.',
          ]),
        );
        return;
      case 'errou':
        // ERRAR CUSTA TENSAO, e tensao encurta as tentativas do proximo painel.
        // E o eixo do tempo entrando nos enigmas: insistir na forca bruta piora
        // a usina inteira em vez de so gastar uma chance local.
        estado.represa.registrarErro();
        this.ui.iniciarDialogo(
          falasDe(nome, [
            'Errado. O rele abre e o painel volta ao inicio.',
            `Restam ${resposta.restantes} tentativa(s).`,
          ]),
          () => this.desenharPainel(),
        );
        return;
      case 'travado':
        estado.represa.registrarErro();
        this.painelAtivo = null;
        this.ui.iniciarDialogo(
          falasDe(nome, [
            'O painel travou. Um LED vermelho fica piscando e nada mais responde.',
            'Ele destrava sozinho — mas nao enquanto voce estiver aqui embaixo.',
          ]),
        );
        return;
      case 'concluido': {
        this.painelAtivo = null;
        estado.worldEvents.definir(resposta.flag, true);
        const extras = this.recompensasDoPainel(resposta.flag);
        this.ui.iniciarDialogo(
          falasDe(nome, [progresso.painel.conclusao, ...extras]),
          // recarrega o setor: e o que faz o alcapao destravado, a gaveta
          // liberada e a luz nova aparecerem sem o jogador ter de sair e voltar
          () => this.recarregarSetor(),
        );
        return;
      }
    }
  }

  /**
   * Efeitos colaterais de um painel resolvido que nao sao a propria flag.
   * Hoje ha um: o quadro de disjuntores do nivel 0 revela a LANTERNA DE
   * MANUTENCAO na gaveta que ele destrava, e e ela que dobra o raio de luz.
   */
  private recompensasDoPainel(flag: string): string[] {
    if (flag !== 'represaLuzEntrada' || estado.worldEvents.ativa(FLAG_DA_LANTERNA)) return [];
    estado.worldEvents.definir(FLAG_DA_LANTERNA, true);
    return [
      'Na gaveta ha uma lanterna de manutencao, daquelas de cabo de borracha. A pilha aguenta.',
      'Dai pra frente voce ve bem mais longe no escuro.',
    ];
  }

  /** Recarrega o setor atual preservando a posicao do jogador. */
  private recarregarSetor(): void {
    this.transicionando = true;
    const x = this.player.x;
    const y = this.player.y;
    this.scene.restart({ mapa: estado.mapa, x, y });
  }

  // ------------------------------------------------------- sucata --
  /**
   * Recolhe um recipiente de salvado.
   *
   * Recipiente e ONE-SHOT e persiste em `estado.itensColetados`, o mesmo Set que
   * os pickups do mundo ja usavam — nao ha um segundo registro de "ja saqueado".
   * O que ele exige (`requer`) e uma flag de puzzle: e assim que o premio de um
   * enigma fica no mapa em vez de cair do ceu.
   */
  private recolherSucata(alvo: Interagivel): void {
    const flag = String(alvo.props.requer ?? '');
    if (flag && !estado.worldEvents.ativa(flag)) {
      this.ui.iniciarDialogo(
        falasDe('Usina', ['Esta trancado. A fechadura e eletrica e nao ha tensao nela.']),
      );
      return;
    }
    const tabela = buscarTabelaDeSucata(String(alvo.props.tabela ?? ''));
    if (!tabela) {
      console.warn(`[sucata] tabela desconhecida em "${alvo.id}":`, alvo.props.tabela);
      return;
    }
    const sorteio = sortearSucata(tabela);
    const linhas: string[] = [];
    let sobrou = false;
    for (const peca of sorteio) {
      const naoCabe = estado.inventario.adicionar(peca.id, peca.quantidade);
      const entrou = peca.quantidade - naoCabe;
      if (entrou > 0) {
        estado.represa.registrarSalvado(peca.id, entrou);
        linhas.push(`${ITENS[peca.id]?.nome ?? peca.id} x${entrou}`);
      }
      if (naoCabe > 0) sobrou = true;
    }
    // marca como saqueado ANTES de qualquer coisa poder falhar depois: um
    // recipiente que rende metade e melhor que um que rende duas vezes
    estado.itensColetados.add(alvo.id);
    this.visuaisDeItens.get(alvo.id)?.destroy();
    this.visuaisDeItens.delete(alvo.id);
    this.interagiveis = this.interagiveis.filter((item) => item !== alvo);
    this.ui.iniciarDialogo(
      falasDe('Salvado', [
        linhas.length > 0 ? `Recolhido: ${linhas.join(', ')}.` : 'So poeira e parafuso quebrado.',
        ...(sobrou ? ['A mochila encheu e o resto ficou pra tras.'] : []),
      ]),
    );
  }

  /**
   * Caixa de despacho da oficina: o ponto de REVENDA do salvado.
   *
   * Fica na oficina do protagonista e nao numa loja da cidade porque e assim que
   * o ciclo fecha onde ele comeca — preparar, subir, descer, voltar, despachar.
   * Vem daqui e nao do tilemap pelo mesmo motivo dos pontos de loja: a planta da
   * oficina nao emite objeto dessa classe (ver `lerPontosDeLoja`).
   */
  private lerPontoDeRevenda(): Interagivel[] {
    if (estado.mapa !== MAPA_DA_CASA) return [];
    const t = this.tamanhoTile;
    const tile = TILE_DA_REVENDA;
    const x = (tile.x + 0.5) * t;
    const y = (tile.y + 0.5) * t;
    this.add
      .rectangle(x, y, t * 0.8, t * 0.6, 0x5c5348)
      .setStrokeStyle(2, 0xa39785)
      .setDepth(y)
      .setName('caixa_de_despacho');
    return [
      {
        id: 'revenda_oficina',
        tipo: 'revenda' as const,
        rotulo: ROTULOS.revenda,
        x,
        y,
        props: {},
      },
    ];
  }

  /**
   * Menu de revenda: uma linha por tipo de salvado no inventario, com o total
   * que ele paga. Vende a PILHA INTEIRA de uma vez — vender unidade por unidade
   * daria dezenas de acionamentos pra esvaziar uma mochila de volta da usina.
   */
  private abrirRevendaDeSucata(): void {
    const lotes = estado.inventario
      .serializar()
      .flatMap((slot) => (slot && ehSucata(slot.id) ? [slot] : []))
      .reduce((mapa, slot) => {
        mapa.set(slot.id, (mapa.get(slot.id) ?? 0) + slot.qtd);
        return mapa;
      }, new Map<string, number>());

    if (lotes.size === 0) {
      this.ui.iniciarDialogo(
        falasDe('Caixa de despacho', [
          'A caixa esta vazia. Nao ha salvado nenhum na mochila pra despachar.',
        ]),
      );
      return;
    }

    const opcoes = [...lotes].map(([id, qtd]) => ({
      // a marca de raridade (*, **, ***) fica na frente: quem volta com dez
      // lotes decide o que despachar primeiro sem abrir o inventario
      rotulo:
        `${marcaDeRaridade(id)} ${ITENS[id]?.nome ?? id} x${qtd}` +
        ` — ${formatarDinheiro(precoDeRevenda(id, qtd))}`,
      aoEscolher: () => this.despacharSucata(id, qtd),
    }));
    this.ui.abrirMenu('Despachar qual lote?', opcoes);
  }

  private despacharSucata(id: string, quantidade: number): void {
    const r = venderSucata(estado.inventario, estado.carteira, id, quantidade);
    if (!r.ok) {
      this.ui.iniciarDialogo(
        falasDe('Caixa de despacho', [
          r.motivo === 'credito'
            ? 'A conta nao aceita mais credito. Gaste algo antes.'
            : 'O lote nao esta mais na mochila.',
        ]),
      );
      return;
    }
    this.ui.iniciarDialogo(
      falasDe('Caixa de despacho', [
        `${ITENS[id]?.nome ?? id} x${quantidade} despachado.`,
        `Creditado: ${formatarDinheiro(r.pago)}. Saldo: ${estado.carteira.texto}.`,
      ]),
      // reabre o menu: quem volta da usina tem varios lotes pra despachar
      () => this.abrirRevendaDeSucata(),
    );
  }

  // ------------------------------------------------------ derrota --
  /**
   * Vida a zero.
   *
   * NAO e permadeath e nao encosta em nada critico: o save fica, item de missao
   * fica, mobilia fica, relacionamento fica, puzzle resolvido fica e atalho
   * aberto fica. O que se perde e tempo (quatro horas de jogo) e METADE do
   * salvado recolhido NESTA descida — ver `PERDA_POR_DERROTA` em represa.ts.
   *
   * O jogador acorda no nivel 0, que e a zona segura da usina, e nao em casa: a
   * viagem de volta pela estrada e parte do custo, e acordar em casa apagaria a
   * decisao de "volto agora ou desco mais um nivel".
   */
  private serDerrotado(): void {
    if (this.transicionando) return;
    this.transicionando = true;
    const perda = estado.represa.perdaPorDerrota();
    for (const item of perda) estado.inventario.remover(item.id, item.quantidade);
    estado.vida.definir(Math.round(estado.vida.maxHp * PERDA_POR_DERROTA.fracaoDeVida));
    estado.dia += estado.relogio.avancarMinutos(PERDA_POR_DERROTA.horas * 60);

    const perdido = perda
      .map((item) => `${ITENS[item.id]?.nome ?? item.id} x${item.quantidade}`)
      .join(', ');

    const cam = this.cameras.main;
    cam.fadeOut(520, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const t = this.tamanhoTile;
      this.ui.iniciarDialogo(
        falasDe('...', [
          'Voce acorda no piso da casa de forca, com a lanterna apagada do lado.',
          `Passaram ${PERDA_POR_DERROTA.horas} horas.`,
          perdido ? `Parte do salvado ficou lá embaixo: ${perdido}.` : 'A mochila esta como estava.',
        ]),
      );
      this.scene.restart({
        mapa: SETOR_DE_RESGATE,
        x: (PONTO_DE_RESGATE.x + 0.5) * t,
        y: (PONTO_DE_RESGATE.y + 0.5) * t,
      });
    });
  }

  // ------------------------------------------------------------- exame --

  /**
   * Placa comum, ou o aviso de um predio FECHADO. O gerador poe um objeto
   * `placa` com a propriedade `aviso` na frente da porta dos lotes que tem
   * fachada mas nao tem interior — ver `AVISOS_DE_PREDIO`.
   */
  private examinarPlaca(alvo: Interagivel): void {
    if (estado.mapa === 'represa_f50' && Number(alvo.props.ficha) === 50 && viuCena(estado, 'andar50')) {
      this.ui.abrirMenu('Além do arquivo', [
        { rotulo: 'Descer a escada', aoEscolher: () => this.entrarProfundezas() },
        { rotulo: 'Reler a última folha', aoEscolher: () => this.ui.iniciarDialogo(falasDe('Última folha', AVISOS_DE_PREDIO[String(alvo.props.aviso ?? '')] ?? [])) },
      ]);
      return;
    }
    // FICHA MEDICA: o objeto tem a prop `ficha` com o numero do andar. Ler
    // arquiva; o texto sai igual ao de qualquer placa, logo abaixo.
    const andarDaFicha = Number(alvo.props.ficha);
    if (Number.isInteger(andarDaFicha) && andarDaFicha > 0) this.arquivarFicha(andarDaFicha);
    if (typeof alvo.props.missaoItemId === 'string') {
      this.coletarItemDeMissao(String(alvo.props.missaoItemId));
      return;
    }
    if (alvo.props.ambientacao === 'quadro') {
      const avisos = avisosDaSemana(estado.dia);
      // O ENCONTRO DE HOJE vem primeiro, quando existe: e o unico recado do
      // quadro que muda de um dia pro outro, e e onde o jogador descobre que
      // hoje a noite tem gente no bar (ver src/game/rotinaSocial.ts).
      const encontro = encontroDoDia(estado.dia);
      const doDia = encontro ? AVISOS_DE_ENCONTRO[encontro.aviso] : undefined;
      this.ui.iniciarDialogo([
        { nome: 'Quadro de avisos', texto: `Avisos da semana ${Math.floor(estado.dia / 7) + 1}:` },
        ...(doDia ? [{ nome: encontro!.nome, texto: doDia }] : []),
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
      // QUADRO DE AVISOS. Era um retangulo desenhado a mao no meio do gramado do
      // parque — dois rects e uma perna, sem arte. Com o remap do centro ele
      // passou a ser o quiosque de verdade da praca noroeste (peca [7,0] da folha
      // do parque, posta pelo gerador), e aqui fica so o ponto de leitura, na
      // calcada em frente a ele.
      pontos.push({
        id: 'quadro_avisos_praca', tipo: 'placa', rotulo: 'Ler avisos',
        x: 51.5 * t, y: 43.5 * t, props: { ambientacao: 'quadro' },
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
  estado: EstadoNpc;
  /**
   * null enquanto a folha do NPC nao chegou.
   *
   * As folhas nao vem mais no boot (eram 14,99 MB antes do menu): a cena pede
   * as de quem esta neste mapa e reinicia quando elas chegam. Quem aparece
   * DEPOIS disso — o morador que entra andando de fora da tela no meio do dia —
   * cai em `garantirSpriteDeNpc`, que busca a folha e monta o sprite sem
   * reiniciar a cena.
   *
   * Nao criar o sprite e deliberado: um sprite com textura ausente vira um
   * quadrado verde parado no meio da rua, e isso e pior que a ausencia.
   */
  sprite: Phaser.Physics.Arcade.Sprite | null;
  interagivel: Interagivel;
  animacao: string;
  /**
   * Ultima visibilidade APLICADA, que nao e a mesma coisa que `sprite.visible`
   * durante o esmaecimento. Ver `aplicarVisibilidadeDeNpc`.
   */
  visivelAplicado: boolean;
}

/** Retrato de um NPC exibido sobre o mapa aberto. */
interface MarcadorNpcMapa {
  npcId: string;
  marcador: Phaser.GameObjects.Container;
  /** o retrato dentro do marcador, guardado pra trocar de textura quando a folha chega */
  retrato: Phaser.GameObjects.Image;
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
  represa: 'Estrada da Represa',
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

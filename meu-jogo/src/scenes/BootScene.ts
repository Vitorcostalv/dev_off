import Phaser from 'phaser';
import { estado } from '../game/estado';
import { MAPAS, buscarMapa } from '../game/mapas';
import { carregar } from '../game/save';

const PLAYER_FRAME = { largura: 200, altura: 320 };
const PLAYER_RECORTE = {
  idle: {
    textura: 'player-idle-sprites',
    colunas: [184, 412, 638, 864],
    linhas: { down: 0, left: 300, right: 590, up: 874 },
  },
  walk: {
    textura: 'player-walk-sprites',
    colunas: [184, 412, 638, 864],
    linhas: { down: 0, left: 300, right: 610, up: 920 },
  },
  run: {
    textura: 'player-run-sprites',
    colunas: [144, 404, 682, 948],
    linhas: { down: 0, left: 294, right: 582, up: 870 },
  },
} as const;

/** Carrega todos os assets e mostra uma barra de progresso. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.criarBarraDeProgresso();

    // tileset: a key ('tiles-terrain') e o que o Phaser usa;
    // o nome do tileset dentro do JSON do Tiled e 'terrain' (ver FarmScene).
    this.load.image('tiles-terrain', 'assets/tilesets/terrain.png');
    // um tilemap por entrada de MAPAS: nao ha lista pra manter em dois lugares
    for (const def of Object.values(MAPAS)) {
      this.load.tilemapTiledJSON(def.tilemapKey, def.arquivo);
    }

    // fachadas das construcoes: um frame por lote, com o nome do lote
    this.load.atlas(
      'construcoes',
      'assets/sprites/construcoes.png',
      'assets/sprites/construcoes.atlas.json',
    );

    // flora: os atlas sao gerados por tools/gerar-assets.mjs a partir da grade
    // de cada spritesheet. Frames: arvore_<especie>_<estagio> / flor_<especie>_<estagio>.
    this.load.atlas('arvores', 'assets/sprites/Arvores.png', 'assets/sprites/arvores.atlas.json');
    this.load.atlas(
      'flores_v1',
      'assets/sprites/Flores_v1.png',
      'assets/sprites/flores_v1.atlas.json',
    );
    this.load.atlas(
      'flores_v2',
      'assets/sprites/Flores_v2.png',
      'assets/sprites/flores_v2.atlas.json',
    );
    // pedras soltas: frames `pedra_<i>`, do pedrisco ao matacao
    this.load.atlas('pedras', 'assets/sprites/pedras.png', 'assets/sprites/pedras.atlas.json');

    // moveis de interior: frames `movel_<linha>_<indice>`
    this.load.atlas(
      'moveis_mercado',
      'assets/sprites/Utensilios_mercado.png',
      'assets/sprites/moveis_mercado.atlas.json',
    );
    this.load.atlas(
      'moveis_academia',
      'assets/sprites/Utensilios_academia.png',
      'assets/sprites/moveis_academia.atlas.json',
    );

    this.load.image('player-idle-sprites', 'assets/sprites/player_sprites.png');
    this.load.image('player-walk-sprites', 'assets/sprites/Player_andando.png');
    this.load.image('player-run-sprites', 'assets/sprites/Player_correndo.png');
  }

  create(): void {
    this.criarFramesPlayer('idle');
    this.criarFramesPlayer('walk');
    this.criarFramesPlayer('run');
    this.criarAnimacoes();
    const inicio = this.aplicarSave();

    // a UI roda em paralelo, por cima do mundo, na resolucao base (sem zoom).
    // Ela sobe primeiro: a cena de mundo fala com ela ja no create().
    this.scene.launch('UIScene');
    this.scene.start('FarmScene', inicio);
  }

  /**
   * Le o localStorage e joga tudo dentro do `estado`.
   * Devolve o ponto de entrada da cena de mundo (ou undefined = jogo novo).
   */
  private aplicarSave(): { mapa: string; x: number; y: number } | undefined {
    const save = carregar();
    if (!save) return undefined;

    const mapa = buscarMapa(save.mapa);
    if (!mapa) {
      console.warn(`[save] mapa "${save.mapa}" nao existe mais — comecando na fazenda`);
      return undefined;
    }

    estado.dia = Number.isFinite(save.dia) ? save.dia : 0;
    estado.relogio.definir(Number.isFinite(save.minutos) ? save.minutos : 0);
    estado.mapa = mapa.chave;
    estado.inventario.restaurar(save.inventario);
    estado.itensColetados = new Set(
      Array.isArray(save.itensColetados)
        ? save.itensColetados.filter((id): id is string => typeof id === 'string')
        : [],
    );

    console.info(`[save] carregado: dia ${estado.dia}, ${estado.relogio.texto}, ${mapa.chave}`);
    return { mapa: mapa.chave, x: save.x, y: save.y };
  }

  private criarAnimacoes(): void {
    const dirs = ['down', 'left', 'right', 'up'];

    for (const key of dirs) {
      const frames = PLAYER_RECORTE.walk.colunas.map((_, indice) => ({
        key: PLAYER_RECORTE.walk.textura,
        frame: `${key}-${indice}`,
      }));
      this.anims.create({
        key: `walk-${key}`,
        frames,
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `run-${key}`,
        frames: PLAYER_RECORTE.run.colunas.map((_, indice) => ({
          key: PLAYER_RECORTE.run.textura,
          frame: `${key}-${indice}`,
        })),
        frameRate: 11,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${key}`,
        frames: [{ key: PLAYER_RECORTE.idle.textura, frame: `${key}-0` }],
        frameRate: 1,
      });
    }
  }

  /**
   * A imagem recebida tem espacamento irregular entre as poses, entao nao da
   * para usar frameWidth/frameHeight. Registramos cada recorte manualmente.
   */
  private criarFramesPlayer(tipo: keyof typeof PLAYER_RECORTE): void {
    const recorte = PLAYER_RECORTE[tipo];
    const textura = this.textures.get(recorte.textura);
    for (const [direcao, y] of Object.entries(recorte.linhas)) {
      recorte.colunas.forEach((x, indice) => {
        textura.add(
          `${direcao}-${indice}`,
          0,
          x,
          y,
          PLAYER_FRAME.largura,
          PLAYER_FRAME.altura,
        );
      });
    }
  }

  private criarBarraDeProgresso(): void {
    const { width, height } = this.scale;
    const barra = this.add.graphics();
    const moldura = this.add.graphics();
    moldura.lineStyle(1, 0xffffff, 0.5);
    moldura.strokeRect(width / 2 - 80, height / 2 - 6, 160, 12);

    this.load.on('progress', (valor: number) => {
      barra.clear();
      barra.fillStyle(0xa8c66c, 1);
      barra.fillRect(width / 2 - 78, height / 2 - 4, 156 * valor, 8);
    });

    this.load.on('complete', () => {
      barra.destroy();
      moldura.destroy();
    });
  }
}

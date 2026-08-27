import Phaser from 'phaser';
import { estado } from '../game/estado';
import { buscarMapa } from '../game/mapas';
import { carregar } from '../game/save';

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
    this.load.tilemapTiledJSON('farm-map', 'assets/tilemaps/farm.json');
    this.load.tilemapTiledJSON('casa-map', 'assets/tilemaps/casa.json');

    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
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

    console.info(`[save] carregado: dia ${estado.dia}, ${estado.relogio.texto}, ${mapa.chave}`);
    return { mapa: mapa.chave, x: save.x, y: save.y };
  }

  private criarAnimacoes(): void {
    const dirs = [
      { key: 'down', row: 0 },
      { key: 'left', row: 1 },
      { key: 'right', row: 2 },
      { key: 'up', row: 3 },
    ];

    for (const { key, row } of dirs) {
      const start = row * 4;
      this.anims.create({
        key: `walk-${key}`,
        frames: this.anims.generateFrameNumbers('player', { start, end: start + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${key}`,
        frames: [{ key: 'player', frame: start }],
        frameRate: 1,
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

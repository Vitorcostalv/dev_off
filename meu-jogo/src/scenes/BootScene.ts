import Phaser from 'phaser';

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

    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.criarAnimacoes();
    this.scene.start('FarmScene');
    // a UI roda em paralelo, por cima do mundo, na resolucao base (sem zoom)
    this.scene.launch('UIScene');
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

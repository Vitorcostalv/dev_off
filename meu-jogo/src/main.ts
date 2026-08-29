import Phaser from 'phaser';
import { estado } from './game/estado';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';
import { ComputadorScene } from './scenes/ComputadorScene';
import { UIScene } from './scenes/UIScene';
import './style.css';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1d2b1a',
  // sem isso a pixel art borra ao escalar
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // top-down: sem gravidade
      debug: false,
    },
  },
  scene: [BootScene, FarmScene, UIScene, ComputadorScene],
};

const game = new Phaser.Game(config);

// atalhos pra depurar no console do navegador: window.game / window.estado
if (import.meta.env.DEV) {
  Object.assign(window, { game, estado });
}


import Phaser from 'phaser';
import { estado } from './game/estado';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';
import { ComputadorScene } from './scenes/ComputadorScene';
import { UIScene } from './scenes/UIScene';
import { MapaScene } from './scenes/MapaScene';
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
  scene: [BootScene, FarmScene, UIScene, ComputadorScene, MapaScene],
};

const game = new Phaser.Game(config);

/**
 * O PAINEL DE DESENVOLVIMENTO (F10) SO EXISTE EM DESENVOLVIMENTO.
 *
 * O `import()` esta DENTRO do `if`, e nao no topo do arquivo, de proposito: com
 * o import no topo o modulo entraria no bundle publicado mesmo com a cena nunca
 * sendo adicionada, e bastaria alguem chama-la pelo console pra abrir o painel
 * de trapaca num jogo publicado. Assim o empacotador ve que o ramo e morto em
 * producao (`import.meta.env.DEV` vira `false` literal) e remove o modulo
 * inteiro — nao ha o que chamar.
 */
if (import.meta.env.DEV) {
  // atalhos pra depurar no console do navegador
  Object.assign(window, { game, estado });
  void import('./scenes/DevScene').then(({ DevScene }) => {
    game.scene.add('DevScene', DevScene, true);
  });
}


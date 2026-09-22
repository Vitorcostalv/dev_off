import Phaser from 'phaser';
import { estado } from './game/estado';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';
import { ComputadorScene } from './scenes/ComputadorScene';
import { UIScene } from './scenes/UIScene';
import { MenuScene } from './scenes/MenuScene';
import { CampanhaScene } from './scenes/CampanhaScene';
import { ProfundezasScene } from './scenes/ProfundezasScene';
import { PrologoScene } from './scenes/PrologoScene';
import { NoiteScene } from './scenes/NoiteScene';
import './style.css';
import { controles } from './game/InputRouter';
import { som } from './scenes/Som';
import { capturarMiniatura } from './scenes/capturaSave';
import { observarTrabalho } from './game/vidaSocial';

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
  scene: [BootScene, FarmScene, UIScene, ComputadorScene, MenuScene, CampanhaScene, ProfundezasScene, PrologoScene, NoiteScene],
};

const game = new Phaser.Game(config);
estado.eventos.on('JOB_COMPLETED', () => observarTrabalho(estado));
let capturaEm = 0, autosaveEm = 0;
game.events.on(Phaser.Core.Events.PRE_STEP, () => controles.atualizarPad());
game.events.on(Phaser.Core.Events.POST_STEP, (_tempo: number, delta: number) => {
  controles.fimQuadro();
  som.atualizar(delta);
  const jogando = !document.hidden && !game.scene.isActive('MenuScene') &&
    ['FarmScene', 'CampanhaScene', 'ProfundezasScene', 'ComputadorScene', 'PrologoScene', 'NoiteScene'].some(s => game.scene.isActive(s));
  if (jogando) {
    const passo = Math.min(Math.max(delta, 0), 1000);
    estado.worldEvents.definir('sessao:segundos', (Number(estado.worldEvents.obter('sessao:segundos')) || 0) + passo / 1000);
    capturaEm += passo; autosaveEm += passo;
    if (capturaEm >= 5000) { capturaEm = 0; capturarMiniatura(game); }
    if (autosaveEm >= 60000 && game.scene.isActive('FarmScene') && !(game.scene.getScene('UIScene') as UIScene).bloqueado) {
      autosaveEm = 0;
      if (!(game.scene.getScene('FarmScene') as FarmScene).salvarJogo())
        (game.scene.getScene('UIScene') as UIScene).avisoRapido('Não foi possível salvar automaticamente. Tente guardar o momento pelo menu.');
    }
  }
});
som.ligar(game);

// atalhos pra depurar no console do navegador: window.game / window.estado
if (import.meta.env.DEV) {
  Object.assign(window, { game, estado });
}


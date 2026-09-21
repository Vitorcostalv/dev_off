import Phaser from 'phaser';
import { caixaDosPes } from '../game/visualPersonagem';
export function texturaRadial(cena: Phaser.Scene): string {
  const key = 'luz-radial-suave';
  if (!cena.textures.exists(key)) {
    const t = cena.textures.createCanvas(key, 128, 128)!;
    const ctx = t.context, gradiente = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradiente.addColorStop(0, 'rgba(255,255,255,0.65)'); gradiente.addColorStop(.3, 'rgba(255,255,255,0.27)'); gradiente.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradiente; ctx.fillRect(0, 0, 128, 128); t.refresh(); t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return key;
}
export function corpoNosPes(sprite: Phaser.Physics.Arcade.Sprite, tile: number): void {
  const c = caixaDosPes(tile, sprite.width, sprite.height, Math.abs(sprite.scaleX));
  sprite.body?.setSize(c.fonteLargura, c.fonteAltura).setOffset(c.offsetX, c.offsetY);
}
export function sombraDeContato(cena: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, tile: number): void {
  const sombra = cena.add.image(sprite.x, sprite.y - 1, texturaRadial(cena)).setDisplaySize(tile * .85, tile * .3).setTint(0x08121c).setAlpha(.65);
  const atualizar = () => {
    sombra.setPosition(sprite.x, sprite.y - 1).setDepth(sprite.depth - .1).setVisible(sprite.visible && sprite.active).setAlpha(sprite.alpha * .65);
  };
  const limpar = () => { cena.events.off(Phaser.Scenes.Events.POST_UPDATE, atualizar); sombra.destroy(); };
  cena.events.on(Phaser.Scenes.Events.POST_UPDATE, atualizar);
  sprite.once(Phaser.GameObjects.Events.DESTROY, limpar);
  atualizar();
}

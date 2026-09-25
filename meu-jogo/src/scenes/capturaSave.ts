import Phaser from 'phaser';
let miniatura = '';
let capturando = false;
export function obterMiniatura(): string { return miniatura; }
export function capturarMiniatura(game: Phaser.Game): void {
  if (capturando || document.hidden) return;
  capturando = true;
  game.renderer.snapshot(imagem => {
    try {
      if (imagem instanceof HTMLImageElement) {
        const c = document.createElement('canvas'); c.width = 240; c.height = 135;
        c.getContext('2d')!.drawImage(imagem, 0, 0, 240, 135);
        miniatura = c.toDataURL('image/jpeg', .65);
      }
    } finally { capturando = false; }
  });
}

import Phaser from 'phaser';
import { estado } from '../game/estado';
import { fotosPessoais } from '../game/celular';
export function desenharObjetoLembranca(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number): void {
  if (id === 'davi') { g.fillStyle(0xb7ad91).fillRect(x, y + 6, 12, 3); g.fillStyle(0xb18d55).fillEllipse(x + 6, y + 5, 11, 6); g.lineStyle(1, 0xe1c48c).lineBetween(x + 4, y + 2, x + 5, y + 6); }
  else if (id === 'luke') { g.fillStyle(0x667e95).fillCircle(x + 5, y + 5, 5).fillRect(x, y, 10, 3); g.fillStyle(0x273846).fillCircle(x + 5, y + 5, 2); }
  else if (id === 'wendel') { g.fillStyle(0x547268).fillRect(x, y + 2, 12, 7); g.fillStyle(0xb09c72).fillRect(x + 3, y + 3, 6, 3); g.lineStyle(1, 0xc0baa2).lineBetween(x - 2, y + 5, x + 14, y + 5); }
  else { g.fillStyle(0xc0b692).fillRect(x, y - 2, 10, 12); g.fillStyle(0x899c9c).fillRect(x + 1, y - 1, 8, 7); g.fillStyle(0x485d4a).fillTriangle(x + 1, y + 6, x + 6, y, x + 9, y + 6); }
}
/** A mesma captura guardada aparece na casa, no mural e no título. */
export function fotografiaEmMoldura(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, x: number, y: number, largura: number): void {
  const foto = fotosPessoais(estado.worldEvents.serializar().flags)[0]; if (!foto) return;
  const altura = largura * 135 / 240;
  raiz.add(cena.add.rectangle(x, y, largura + 4, altura + 4, 0x806f53));
  const key = `foto-pessoal-${foto.id}`;
  const inserir = () => { if (raiz.active && cena.scene.isActive()) raiz.add(cena.add.image(x, y, key).setDisplaySize(largura, altura)); };
  if (cena.textures.exists(key)) inserir();
  else { cena.textures.once(`addtexture-${key}`, inserir); cena.textures.addBase64(key, foto.imagem); }
}

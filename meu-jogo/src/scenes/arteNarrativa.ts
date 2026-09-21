import Phaser from 'phaser';
import { buscarNpc } from '../game/npcs';
import { enfileirarFolhasNpc, prepararNpc } from './spritesNpc';

export function idPessoa(nome: string): string {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
export function carregarPessoas(cena: Phaser.Scene, nomes: readonly string[]): void {
  for (const nome of new Set(nomes)) { const def = buscarNpc(idPessoa(nome)); if (def) enfileirarFolhasNpc(cena, def); }
}
export function pessoaNarrativa(cena: Phaser.Scene, x: number, y: number, nome = 'voce', altura = 36): Phaser.GameObjects.Image {
  const id = idPessoa(nome), def = buscarNpc(id);
  const pronto = def ? prepararNpc(cena, def) : false;
  const key = pronto && cena.textures.exists(`npc-${id}-parado`) ? `npc-${id}-parado` : 'player-idle-sprites';
  const imagem = cena.add.image(x, y, key, 'down-0').setOrigin(.5, 1);
  imagem.setScale(altura / imagem.height).setTint(0xa3b0b9);
  return imagem;
}
export function carregarMobiliaNarrativa(cena: Phaser.Scene): void {
  for (const atlas of ['moveis_mobilia_v1', 'moveis_mobilia_v2']) {
    if (!cena.textures.exists(atlas)) cena.load.atlas(atlas, `assets/sprites/${atlas}.png`, `assets/sprites/${atlas}.atlas.json`);
  }
}
export function movelNarrativo(cena: Phaser.Scene, id: string, x: number, y: number, largura: number, altura: number): Phaser.GameObjects.Image | null {
  const dados = cena.cache.json.get('mobilia')?.[id];
  if (!dados || !cena.textures.exists(dados.atlas)) return null;
  const imagem = cena.add.image(x, y, dados.atlas, dados.frame).setOrigin(.5, 1);
  imagem.setScale(Math.min(largura / imagem.width, altura / imagem.height)).setTint(0x929d9f);
  return imagem;
}

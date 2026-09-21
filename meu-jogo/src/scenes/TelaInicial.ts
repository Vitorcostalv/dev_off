import Phaser from 'phaser';
import { estado } from '../game/estado';
import { pessoaNarrativa, movelNarrativo } from './arteNarrativa';

/** A casa sugere progresso sem antecipar as perdas narradas nos documentos. */
export function desenharTelaInicial(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container): Phaser.GameObjects.Graphics {
  const amigos = estado.relacoes.listaInteragidos().filter(id => estado.relacoes.getScore(id) >= 4).length;
  const profunda = estado.arquivo.tem(100);
  const familia = estado.arquivo.tem(159);
  const g = cena.add.graphics(); raiz.add(g);
  const r = (x: number, y: number, w: number, h: number, cor: number, a = 1) => g.fillStyle(cor, a).fillRect(x, y, w, h);
  r(0, 0, 480, 270, amigos ? 0x202b2b : 0x141e29);
  r(232, 178, 248, 92, 0x24282a);
  for (let x = 232; x < 480; x += 21) r(x, 178, 1, 92, 0x343537, .5);
  // Janela, represa quase apagada e chuva contida do lado de fora.
  r(255, 30, 119, 115, 0x0b141d); r(261, 36, 107, 101, 0x273d4b);
  r(266, 104, 94, 33, 0x26343e); r(275, 99, 9, 38, 0x202e38); r(336, 99, 9, 38, 0x202e38);
  for (let x = 290; x < 336; x += 13) r(x, 112, 5, 25, 0x22313b);
  r(312, 34, 4, 106, 0x121e26); r(258, 83, 114, 4, 0x121e26);
  r(252, 142, 127, 5, 0x535353);
  // O corredor ganha profundidade apenas depois da exploração clínica.
  r(407, 67, 55, 113, 0x10171e);
  if (profunda) {
    for (let i = 0; i < 5; i++) g.lineStyle(1, 0x43505b, .36).strokeRect(412 + i * 4, 72 + i * 8, 44 - i * 8, 110 - i * 8);
    r(429, 163, 8, 5, 0x7d8b89); r(452, 181, 13, 7, 0x667577);
  }
  g.fillStyle(amigos ? 0xbc8b53 : 0x9b9378, amigos ? .12 : .05).fillEllipse(351, 165, 164, 129);
  r(379, 137, 3, 54, 0x746c5b); r(367, 191, 26, 3, 0x504e49);
  g.fillStyle(amigos ? 0xc19b64 : 0x8e8b76).fillTriangle(370, 120, 391, 120, 398, 139).fillTriangle(370, 120, 398, 139, 363, 139);
  const movel = (id: string, x: number, y: number, w: number, h: number) => { const m = movelNarrativo(cena, id, x, y, w, h); if (m) raiz.add(m); };
  movel('poltrona_creme', 308, 215, 51, 57);
  const pessoa = pessoaNarrativa(cena, 307, 203, 'Você', 39); raiz.add(pessoa);
  // Mesa baixa com caneca, caixas e os objetos trazidos pela convivência.
  r(348, 207, 40, 5, 0x645343); r(352, 212, 3, 15, 0x423b32); r(382, 212, 3, 15, 0x423b32);
  r(359, 198, 8, 9, amigos ? 0x879e91 : 0x757878); g.lineStyle(1, 0x909c90).strokeRect(367, 200, 3, 4);
  r(411, 210, 29, 27, 0x665746); r(442, 225, 27, 22, 0x504739); r(423, 210, 3, 27, 0x8b7a59);
  if (amigos) { movel('planta_alta', 273, 226, 28, 51); r(388, 55, 12, 16, 0x88734e); r(390, 57, 8, 12, 0x869492); r(417, 203, 15, 2, 0x8e9799); r(428, 200, 3, 8, 0x7b6652); }
  if (familia) { r(373, 203, 12, 3, 0x8f7b60); r(377, 199, 5, 4, 0x5a5046); }
  // Gradiente por faixas: menu legível, imagem sem moldura de painel.
  for (let i = 0; i < 12; i++) r(i * 23, 0, 24, 270, 0x0a1118, Math.max(.04, .96 - i * .075));
  const clima = cena.add.graphics(); raiz.add(clima); return clima;
}

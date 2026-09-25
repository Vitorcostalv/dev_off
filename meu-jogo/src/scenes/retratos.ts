import Phaser from 'phaser';
export const EXPRESSOES = ['neutro', 'feliz', 'preocupado', 'triste', 'irritado', 'surpreso'] as const;
export type ExpressaoRetrato = typeof EXPRESSOES[number];
export const RETRATOS = ['edu', 'mari', 'jaqueline', 'leticia', 'wendel', 'alice', 'hiago', 'vitor'] as const;
export const idRetrato = (nome: string) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function enfileirarRetrato(cena: Phaser.Scene, id: string): boolean {
  if (!RETRATOS.some(n => n === id)) return false;
  if (!cena.textures.exists(`retrato-${id}`)) cena.load.image(`retrato-${id}`, `assets/retratos/${id}.png`);
  return true;
}
export function prepararRetrato(cena: Phaser.Scene, id: string): string | null {
  const key = `retrato-${id}`; if (!cena.textures.exists(key)) return null;
  const t = cena.textures.get(key), fonte = t.source[0]!;
  const w = Math.floor(fonte.width / 3), h = Math.floor(fonte.height / 2);
  EXPRESSOES.forEach((e, i) => { if (!t.has(e)) t.add(e, 0, (i % 3) * w, Math.floor(i / 3) * h, w, h); });
  t.setFilter(Phaser.Textures.FilterMode.LINEAR); return key;
}
export function expressaoDaFala(texto: string): ExpressaoRetrato {
  if (/não quero saber|não conta\.|chega!|pare com isso/i.test(texto)) return 'irritado';
  if (/morreu|saudade|não consegui continuar|sinto falta/i.test(texto)) return 'triste';
  if (/machuc|curativo|preocupa|tenta não morrer|tem certeza/i.test(texto)) return 'preocupado';
  if (/obrigad|bom te ver|que bom|gostei|feliz/i.test(texto)) return 'feliz';
  if (/como assim|você também\?|não acredito|surpresa/i.test(texto)) return 'surpreso';
  return 'neutro';
}

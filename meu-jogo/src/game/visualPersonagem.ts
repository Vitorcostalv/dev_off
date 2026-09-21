/** Contrato único para camadas autorais, poses e colisão. Coordenadas nos pés. */
export const POSES_PERSONAGEM = ['idle', 'walk', 'run', 'hold', 'tool', 'combat', 'sit', 'lean', 'work', 'read', 'phone', 'eat', 'sleep'] as const;
export type PosePersonagem = typeof POSES_PERSONAGEM[number];
export type DirecaoVisual = 'down' | 'up' | 'left' | 'right';
export interface AparenciaPersonagem {
  corpo: 0 | 1 | 2; pele: number; cabelo: number; camisa: number; calca: number;
  acessorio: 'nenhum' | 'oculos' | 'gorro';
}
export const PALETA_PERSONAGEM = {
  pele: [0xe0b493, 0xbb8768, 0x805741, 0xd3a184],
  cabelo: [0x322d2d, 0x655046, 0xa99778, 0xb0ad9f],
  camisa: [0x758984, 0x9d7563, 0x607787, 0x897e91, 0xb0a282],
  calca: [0x3e4954, 0x555247, 0x57464d],
} as const;
export function aparenciaPorSemente(semente: number): AparenciaPersonagem {
  const n = Math.abs(Math.trunc(Number.isFinite(semente) ? semente : 0));
  return { corpo: (n % 3) as 0 | 1 | 2, pele: n % 4, cabelo: Math.floor(n / 2) % 4,
    camisa: n % 5, calca: Math.floor(n / 3) % 3, acessorio: n % 7 === 0 ? 'oculos' : n % 5 === 0 ? 'gorro' : 'nenhum' };
}
export function quadroDaPose(pose: PosePersonagem, tempo: number, reduzido = false): number {
  return reduzido || ['idle', 'sit', 'lean', 'read', 'phone', 'sleep', 'hold'].includes(pose) ? 0 : Math.floor(Math.max(0, tempo) / (pose === 'run' ? 85 : 150)) % 4;
}
/** Dimensão física em unidades do mundo, nunca em percentuais da ilustração. */
export function caixaDosPes(tile: number, larguraFrame: number, alturaFrame: number, escala: number) {
  const largura = tile * .33, altura = tile * .24, margem = tile * .025;
  return { largura, altura, fonteLargura: largura / escala, fonteAltura: altura / escala,
    offsetX: larguraFrame / 2 - largura / escala / 2, offsetY: alturaFrame - (altura + margem) / escala };
}

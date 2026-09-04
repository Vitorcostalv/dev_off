import { lerPng, removerFundo, blobs, agruparEmLinhas } from '../imagem.mjs';
import { join } from 'node:path';
for (const arq of ['PAredes_internas_represa_andar_50_100.png','Paredes_internas_represa_andar_101_150.png']) {
  const img = removerFundo(lerPng(join('arte', arq)));
  const linhas = agruparEmLinhas(blobs(img, 1500, 16, false), 55);
  console.log('\n===', arq, `${linhas.length} linhas`);
  linhas.forEach((l, i) => {
    console.log(' linha', i, l.length, 'paineis:', l.map(b => `${b.w}x${b.h}@${b.x},${b.y}`).join('  '));
  });
}

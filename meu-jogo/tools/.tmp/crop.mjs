import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img } from '../png.mjs';
import { lerPng, removerFundo, pixel } from '../imagem.mjs';
const [arq, saida, y0, y1, esc] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +(process.argv[6] ?? 2)];
const img = removerFundo(lerPng(join('arte', arq)));
const w2 = Math.floor(img.w / esc), h2 = Math.floor((y1 - y0) / esc);
const out = new Img(w2, h2);
for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
  const p = pixel(img, x * esc, y0 + y * esc);
  out.set(x, y, p[3] > 8 ? [p[0], p[1], p[2], 255] : [34, 34, 38, 255]);
}
writeFileSync(saida, out.png());
console.log(saida, `${w2}x${h2}`);

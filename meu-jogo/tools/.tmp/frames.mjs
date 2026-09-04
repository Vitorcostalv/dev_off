import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img } from '../png.mjs';
import { lerPng, pixel } from '../imagem.mjs';
const arq = process.argv[2], saida = process.argv[3], linha = +(process.argv[4] ?? 0);
const img = lerPng(join('public/assets/sprites', arq));
const cw = img.w / 4, ch = img.h / 4, esc = 3;
const w2 = Math.floor(img.w / esc), h2 = Math.floor(ch / esc);
const out = new Img(w2, h2);
for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
  const p = pixel(img, x * esc, linha * ch + y * esc);
  const borda = (x * esc) % cw < esc;
  out.set(x, y, borda ? [200, 60, 60, 255] : p[3] > 8 ? [p[0], p[1], p[2], 255] : [30, 30, 34, 255]);
}
writeFileSync(saida, out.png());
console.log(saida, `${w2}x${h2}`);

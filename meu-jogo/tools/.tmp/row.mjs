import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img } from '../png.mjs';
import { lerPng, removerFundo, pixel, blobs, agruparEmLinhas } from '../imagem.mjs';
const [arq, saida, nlinha] = [process.argv[2], process.argv[3], +process.argv[4]];
const img = removerFundo(lerPng(join('arte', arq)));
const linhas = agruparEmLinhas(blobs(img, 1500, 16, false), 55);
const L = linhas[nlinha];
const esc = 2;
const h = Math.max(...L.map(b=>b.h));
const w2 = Math.floor(img.w/esc), h2 = Math.floor((h+14)/esc);
const out = new Img(w2, h2);
const y0 = Math.min(...L.map(b=>b.y));
for (let y=0;y<h2;y++) for (let x=0;x<w2;x++) {
  const p = pixel(img, x*esc, y0 + y*esc);
  out.set(x,y, p[3]>8?[p[0],p[1],p[2],255]:[30,30,34,255]);
}
// marca o inicio de cada peca com uma barra vermelha e um tracinho por indice
L.forEach((b,i)=>{
  const x = Math.floor(b.x/esc);
  for (let y=0;y<h2;y++) out.set(x,y,[220,40,40,255]);
  for (let k=0;k<=i;k++) for (let y=0;y<3;y++) out.set(x+2+k*3, y, [255,220,60,255]);
});
writeFileSync(saida, out.png());
console.log(saida, `${w2}x${h2}`, L.length, 'pecas');

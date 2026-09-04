import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img } from '../png.mjs';
import { lerPng, removerFundo, pixel, blobs, agruparEmLinhas } from '../imagem.mjs';
const [arq, saida, nl, c0, c1] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const img = removerFundo(lerPng(join('arte', arq)));
const L = agruparEmLinhas(blobs(img, 1500, 16, false), 55)[nl].slice(c0, c1 + 1);
const esc = 1;
const gap = 6;
const w = L.reduce((a,b)=>a+b.w+gap, gap), h = Math.max(...L.map(b=>b.h)) + 8;
const out = new Img(w, h);
let ox = gap;
L.forEach((b,i)=>{
  for (let y=0;y<b.h;y++) for (let x=0;x<b.w;x++) {
    const p = pixel(img, b.x+x, b.y+y);
    out.set(ox+x, 8+y, p[3]>8?[p[0],p[1],p[2],255]:[30,30,34,255]);
  }
  for (let k=0;k<=c0+i;k++) for (let y=0;y<4;y++) out.set(ox+2+k*4, y+1, [255,220,60,255]);
  ox += b.w + gap;
});
writeFileSync(saida, out.png());
console.log(saida, `${w}x${h}`);

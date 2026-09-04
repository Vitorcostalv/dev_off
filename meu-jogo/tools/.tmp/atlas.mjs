import { writeFileSync, readFileSync } from 'node:fs';
import { Img } from '../png.mjs';
import { lerPng, pixel } from '../imagem.mjs';
const img = lerPng('public/assets/sprites/decais.png');
const esc = 3;
const w2 = Math.floor(img.w/esc), h2 = Math.floor(img.h/esc);
const out = new Img(w2, h2);
for (let y=0;y<h2;y++) for (let x=0;x<w2;x++) {
  const p = pixel(img, x*esc, y*esc);
  out.set(x,y,p[3]>8?[p[0],p[1],p[2],255]:[26,26,30,255]);
}
writeFileSync('tools/.tmp/decais.png', out.png());
console.log(`${w2}x${h2}`);

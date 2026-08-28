// Encoder PNG minimo (RGBA, sem filtro) — so pra gerar a arte placeholder.
import { deflateSync } from 'node:zlib';

const TABELA = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = TABELA[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
  }
  set(x, y, [r, g, b, a = 255]) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
    this.px[i + 3] = a;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  png() {
    const stride = this.w * 4 + 1;
    const raw = Buffer.alloc(this.h * stride);
    for (let y = 0; y < this.h; y++) {
      raw[y * stride] = 0; // filtro None
      Buffer.from(this.px.buffer, y * this.w * 4, this.w * 4).copy(raw, y * stride + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

/** ruido deterministico — mesma entrada, mesma saida, sem Math.random */
export const ruido = (x, y, s) => ((Math.sin((x * 12.9898 + y * 78.233 + s) * 43758.5453) % 1) + 1) % 1;

/**
 * Hash inteiro -> [0,1). Deterministico (nada de Math.random), distribuicao
 * uniforme e sem os padroes diagonais que o hash por Math.sin deixa visiveis
 * quando usado tile a tile. Use este para escolher variantes de terreno.
 */
export function hash01(x, y, semente = 0) {
  let h =
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x165667b1) ^
    Math.imul(semente | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Cola um tile (array linear RGBA de tam*tam) na imagem, em (dx, dy). */
export function colar(im, px, tam, dx, dy) {
  for (let j = 0; j < tam; j++) {
    for (let i = 0; i < tam; i++) {
      const c = px[j * tam + i];
      if (c[3] < 8) continue;
      im.set(dx + i, dy + j, c);
    }
  }
}

/** Cola um retangulo de pixels (array linear RGBA, w x h) em (dx, dy). */
export function colarRet(im, px, w, h, dx, dy) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = px[j * w + i];
      if (!c || c[3] < 8) continue;
      im.set(dx + i, dy + j, c);
    }
  }
}

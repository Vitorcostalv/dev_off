// Monta o atlas de APARELHO a partir das tres folhas de "desmontado".
// Rode com: npm run gerar-aparelhos
//
// Mesmo desenho do `gerar-itens.mjs`, e a parte dele de proposito: sao folhas
// diferentes, com outro alvo (o minigame de conserto) e um catalogo proprio
// (`src/game/aparelhos.ts`). Os dois compartilham os helpers de imagem.
//
// As tres folhas JA VIERAM com recorte alfa — o cinza que aparece ao abrir o
// PNG e o RGB por baixo do alfa zerado, nao fundo chapado. Por isso aqui nao ha
// remocao de fundo: `blobs()` separa peca de fundo so pelo alfa, como nas
// folhas de flora.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './png.mjs';
import { agruparEmLinhas, blobs, lerPng } from './imagem.mjs';
import { APARELHOS, frameDaPeca, frameDoAparelho } from '../src/game/aparelhos.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/** SAIDA: o atlas que o jogo carrega. */
const SPRITES = join(RAIZ, 'public', 'assets', 'sprites');
/**
 * ENTRADA: as tres folhas de "desmontado", que so esta ferramenta le.
 * Ficam em `arte/` e nao em `public/` porque o Vite copia `public/` inteiro pro
 * build — as tres somam 7 MB que iriam pro deploy sem ninguem baixar.
 */
const ARTE = join(RAIZ, 'arte');

/**
 * As tres folhas. `linhas` e a contagem que a arte TEM: se ela for reexportada
 * com outro layout a contagem muda e o gerador para aqui, em vez de renumerar
 * as pecas em silencio e trocar a ilustracao de metade do catalogo.
 */
const FOLHAS = {
  notebook: { arquivo: 'Nootbook_desmontado.png', areaMinima: 1500, tolerancia: 46, linhas: 8 },
  celular: { arquivo: 'Celular_desmontado.png', areaMinima: 1200, tolerancia: 44, linhas: 9 },
  console: {
    arquivo: 'Consoles_e_controles_desmontados.png',
    areaMinima: 1800,
    tolerancia: 44,
    linhas: 11,
  },
};

function carregarFolha(chave) {
  const def = FOLHAS[chave];
  const img = lerPng(join(ARTE, def.arquivo));
  const achados = blobs(img, def.areaMinima, 40, true);
  const linhas = agruparEmLinhas(achados, def.tolerancia);
  if (linhas.length !== def.linhas) {
    throw new Error(
      `${def.arquivo}: esperava ${def.linhas} linhas, achei ${linhas.length}` +
        ` — a arte mudou de layout?`,
    );
  }
  return { ...def, chave, img, linhas };
}

const folhas = Object.fromEntries(Object.keys(FOLHAS).map((k) => [k, carregarFolha(k)]));

/** A peca de uma folha pelo par [linha, indice]; erra alto se nao existir. */
function peca(chave, [linha, indice], rotulo) {
  const f = folhas[chave];
  if (!f) throw new Error(`folha de aparelho "${chave}" nao existe`);
  const b = f.linhas[linha]?.[indice];
  if (!b) {
    const tem = f.linhas[linha]?.length ?? 0;
    throw new Error(
      `${f.arquivo}: ${rotulo} aponta pra [${linha},${indice}], que nao existe` +
        ` (a linha ${linha} tem ${tem} peca(s))`,
    );
  }
  return b;
}

// --------------------------------------------------------------- recortes --
/**
 * Tudo que vai pro atlas, ja resolvido: o aparelho inteiro de cada definicao
 * mais os quatro componentes dela.
 */
const recortes = [];
for (const a of APARELHOS) {
  recortes.push({
    frame: frameDoAparelho(a.id),
    folha: a.folha,
    b: peca(a.folha, a.montado, `${a.id} (montado)`),
  });
  for (const p of a.pecas) {
    recortes.push({
      frame: frameDaPeca(a.id, p.id),
      folha: a.folha,
      b: peca(a.folha, p.peca, `${a.id}/${p.id}`),
    });
  }
}

// ----------------------------------------------------------- reduzir peca --
/**
 * A arte de origem e grande (o notebook montado tem 314x260) e o minigame
 * mostra ele em ~120 px. Guardar o frame em tamanho cheio inflaria o atlas sem
 * ganho nenhum, entao cada recorte entra reduzido pra caber num quadrado de
 * `LADO_MAXIMO`, mantendo a proporcao.
 *
 * A reducao e por MEDIA de area (nao vizinho mais proximo): a arte e
 * fotografica, e reduzir por amostragem simples serrilha as bordas curvas.
 */
const LADO_MAXIMO = 192;

function reduzirRecorte(origem, b) {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(b.w, b.h));
  const w = Math.max(1, Math.round(b.w * escala));
  const h = Math.max(1, Math.round(b.h * escala));
  // mascara dos pixels que pertencem AO BLOB — vizinho colado na folha original
  // nao pode vazar pra dentro do frame
  const meus = new Uint8Array(b.w * b.h);
  for (const i of b.pixels) {
    const px = i % origem.w;
    const py = (i - px) / origem.w;
    meus[(py - b.y) * b.w + (px - b.x)] = 1;
  }

  const saida = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * b.h) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * b.h) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * b.w) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * b.w) / w));
      let r = 0;
      let g = 0;
      let bl = 0;
      let a = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          n++;
          if (!meus[sy * b.w + sx]) continue;
          const o = ((b.y + sy) * origem.w + (b.x + sx)) * 4;
          const alfa = origem.px[o + 3];
          // pondera a cor pelo alfa, senao a borda semitransparente escurece
          r += origem.px[o] * alfa;
          g += origem.px[o + 1] * alfa;
          bl += origem.px[o + 2] * alfa;
          a += alfa;
        }
      }
      const d = (y * w + x) * 4;
      if (a > 0) {
        saida[d] = Math.round(r / a);
        saida[d + 1] = Math.round(g / a);
        saida[d + 2] = Math.round(bl / a);
        saida[d + 3] = Math.round(a / n);
      }
    }
  }
  return { w, h, px: saida };
}

for (const r of recortes) r.img = reduzirRecorte(folhas[r.folha].img, r.b);

// ---------------------------------------------------------- empacotamento --
const FOLGA = 2;
const LARGURA_MAXIMA = 1024;

const ordenados = recortes.slice().sort((a, b) => b.img.h - a.img.h || b.img.w - a.img.w);
let x = FOLGA;
let y = FOLGA;
let alturaPrateleira = 0;
let largura = 0;
for (const r of ordenados) {
  if (x + r.img.w + FOLGA > LARGURA_MAXIMA) {
    x = FOLGA;
    y += alturaPrateleira + FOLGA;
    alturaPrateleira = 0;
  }
  r.x = x;
  r.y = y;
  x += r.img.w + FOLGA;
  alturaPrateleira = Math.max(alturaPrateleira, r.img.h);
  largura = Math.max(largura, x);
}
const altura = y + alturaPrateleira + FOLGA;

const im = new Img(largura, altura);
for (const r of ordenados) {
  for (let py = 0; py < r.img.h; py++) {
    for (let px = 0; px < r.img.w; px++) {
      const o = (py * r.img.w + px) * 4;
      if (r.img.px[o + 3] === 0) continue;
      im.set(r.x + px, r.y + py, [
        r.img.px[o],
        r.img.px[o + 1],
        r.img.px[o + 2],
        r.img.px[o + 3],
      ]);
    }
  }
}

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  console.log('  ->', caminho.replace(RAIZ, '.'));
}

const frames = {};
for (const r of ordenados) {
  frames[r.frame] = {
    frame: { x: r.x, y: r.y, w: r.img.w, h: r.img.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: r.img.w, h: r.img.h },
    sourceSize: { w: r.img.w, h: r.img.h },
  };
}

escrever(join(SPRITES, 'aparelhos.png'), im.png());
escrever(
  join(SPRITES, 'aparelhos.atlas.json'),
  JSON.stringify(
    {
      frames,
      meta: {
        app: 'gerar-aparelhos.mjs',
        image: 'aparelhos.png',
        format: 'RGBA8888',
        size: { w: im.w, h: im.h },
        scale: '1',
      },
    },
    null,
    1,
  ),
);

for (const f of Object.values(folhas)) {
  const total = f.linhas.reduce((s, l) => s + l.length, 0);
  const usadas = recortes.filter((r) => r.folha === f.chave).length;
  console.log(
    `  ${f.arquivo}: ${total} peca(s) em ${f.linhas.length} linha(s) — ${usadas} no catalogo`,
  );
}
console.log(
  `pronto. ${APARELHOS.length} aparelhos e ${recortes.length - APARELHOS.length} pecas` +
    ` no atlas (${im.w}x${im.h} px)`,
);

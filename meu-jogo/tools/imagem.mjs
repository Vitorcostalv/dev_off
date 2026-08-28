// Decoder PNG minimo (RGBA8, nao-entrelacado, filtros 0-4). Contrapartida do
// encoder em png.mjs — usado pra fatiar os spritesheets de arte em tiles.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const CANAIS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Le um PNG e devolve { w, h, px } com px em RGBA8 (4 bytes por pixel). */
export function lerPng(caminho) {
  const buf = readFileSync(caminho);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${caminho}: nao e PNG`);

  let pos = 8;
  let cab = null;
  let paleta = null;
  let alfaPaleta = null;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tipo = buf.toString('ascii', pos + 4, pos + 8);
    const dados = buf.subarray(pos + 8, pos + 8 + len);
    if (tipo === 'IHDR') {
      cab = {
        w: dados.readUInt32BE(0),
        h: dados.readUInt32BE(4),
        bits: dados[8],
        cor: dados[9],
        entrelacado: dados[12],
      };
    } else if (tipo === 'PLTE') paleta = dados;
    else if (tipo === 'tRNS') alfaPaleta = dados;
    else if (tipo === 'IDAT') idat.push(dados);
    else if (tipo === 'IEND') break;
    pos += 12 + len;
  }

  if (!cab) throw new Error(`${caminho}: sem IHDR`);
  if (cab.bits !== 8) throw new Error(`${caminho}: bit depth ${cab.bits} nao suportado`);
  if (cab.entrelacado) throw new Error(`${caminho}: PNG entrelacado nao suportado`);
  const canais = CANAIS[cab.cor];
  if (!canais) throw new Error(`${caminho}: color type ${cab.cor} nao suportado`);

  const { w, h } = cab;
  const bpp = canais;
  const stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const linhas = Buffer.alloc(h * stride);

  // desfaz o filtro por scanline (cada linha vem prefixada pelo tipo)
  for (let y = 0; y < h; y++) {
    const filtro = raw[y * (stride + 1)];
    const org = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const destino = linhas.subarray(y * stride, (y + 1) * stride);
    const acima = y > 0 ? linhas.subarray((y - 1) * stride, y * stride) : null;

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? destino[i - bpp] : 0; // esquerda
      const b = acima ? acima[i] : 0; // cima
      const c = acima && i >= bpp ? acima[i - bpp] : 0; // diagonal
      let v = org[i];
      switch (filtro) {
        case 0:
          break;
        case 1:
          v += a;
          break;
        case 2:
          v += b;
          break;
        case 3:
          v += (a + b) >> 1;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default:
          throw new Error(`${caminho}: filtro ${filtro} invalido na linha ${y}`);
      }
      destino[i] = v & 0xff;
    }
  }

  // normaliza pra RGBA8
  const px = new Uint8Array(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    const o = i * bpp;
    const d = i * 4;
    if (cab.cor === 6) {
      px[d] = linhas[o];
      px[d + 1] = linhas[o + 1];
      px[d + 2] = linhas[o + 2];
      px[d + 3] = linhas[o + 3];
    } else if (cab.cor === 2) {
      px[d] = linhas[o];
      px[d + 1] = linhas[o + 1];
      px[d + 2] = linhas[o + 2];
      px[d + 3] = 255;
    } else if (cab.cor === 0 || cab.cor === 4) {
      px[d] = px[d + 1] = px[d + 2] = linhas[o];
      px[d + 3] = cab.cor === 4 ? linhas[o + 1] : 255;
    } else {
      const idx = linhas[o];
      px[d] = paleta[idx * 3];
      px[d + 1] = paleta[idx * 3 + 1];
      px[d + 2] = paleta[idx * 3 + 2];
      px[d + 3] = alfaPaleta && idx < alfaPaleta.length ? alfaPaleta[idx] : 255;
    }
  }

  return { w, h, px };
}

/** Cor RGBA no pixel; fora da imagem devolve transparente. */
export function pixel(img, x, y) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return [0, 0, 0, 0];
  const i = (y * img.w + x) * 4;
  return [img.px[i], img.px[i + 1], img.px[i + 2], img.px[i + 3]];
}

/**
 * Caixa que envolve tudo que nao e transparente na regiao dada.
 * Devolve null se a regiao inteira for transparente.
 */
export function caixaOpaca(img, x0 = 0, y0 = 0, w = img.w, h = img.h, limiteAlfa = 8) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (pixel(img, x, y)[3] <= limiteAlfa) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Media RGBA (ponderada por alfa) de uma regiao — base do downscale. */
function media(img, x0, y0, w, h) {
  let r = 0;
  let g = 0;
  let b = 0;
  let somaAlfa = 0;
  let n = 0;
  for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
      const [pr, pg, pb, pa] = pixel(img, x, y);
      r += pr * pa;
      g += pg * pa;
      b += pb * pa;
      somaAlfa += pa;
      n++;
    }
  }
  if (!n || somaAlfa === 0) return [0, 0, 0, 0];
  // cor media ponderada por alfa (evita puxar pro preto das bordas vazias)
  return [
    Math.round(r / somaAlfa),
    Math.round(g / somaAlfa),
    Math.round(b / somaAlfa),
    Math.round(somaAlfa / n),
  ];
}

/**
 * Reduz `caixa` da imagem para `tam` x `tam` com filtro de caixa.
 * Devolve um array linear de `tam*tam` cores RGBA.
 */
export function reduzir(img, caixa, tam) {
  const saida = new Array(tam * tam);
  const passoX = caixa.w / tam;
  const passoY = caixa.h / tam;
  for (let j = 0; j < tam; j++) {
    for (let i = 0; i < tam; i++) {
      saida[j * tam + i] = media(img, caixa.x + i * passoX, caixa.y + j * passoY, passoX, passoY);
    }
  }
  return saida;
}

/**
 * Caixa quadrada centrada na celula (c, r) de uma grade de faixas detectadas,
 * encolhida por `inset` (fracao) pra fugir da franja irregular da arte.
 */
export function celulaQuadrada(cols, rows, c, r, inset = 0.05) {
  const [x0, x1] = cols[c];
  const [y0, y1] = rows[r];
  const lado = Math.min(x1 - x0, y1 - y0) * (1 - inset * 2);
  return {
    x: Math.round((x0 + x1) / 2 - lado / 2),
    y: Math.round((y0 + y1) / 2 - lado / 2),
    w: Math.round(lado),
    h: Math.round(lado),
  };
}

/** Faixas contiguas de indices cuja contagem passa do limiar. */
function faixas(contagens, limiar) {
  const out = [];
  let inicio = -1;
  for (let i = 0; i <= contagens.length; i++) {
    const ativo = i < contagens.length && contagens[i] > limiar;
    if (ativo && inicio < 0) inicio = i;
    if (!ativo && inicio >= 0) {
      out.push([inicio, i - 1]);
      inicio = -1;
    }
  }
  return out;
}

/**
 * Descobre a grade de um spritesheet projetando o alfa nos eixos: colunas e
 * linhas totalmente transparentes viram os intervalos entre celulas. Evita
 * hardcodar coordenadas — se a arte for reexportada, a grade se reajusta.
 * `limiar` sobe pra arte esparsa, pra ignorar sujeira de 1-2 px.
 */
export function detectarGrade(img, limiar = 0) {
  const colunas = new Array(img.w).fill(0);
  const linhas = new Array(img.h).fill(0);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (pixel(img, x, y)[3] > 16) {
        colunas[x]++;
        linhas[y]++;
      }
    }
  }
  return { cols: faixas(colunas, limiar), rows: faixas(linhas, limiar) };
}

/**
 * Componentes conexos de pixels opacos (vizinhanca 8), pra folhas que nao tem
 * grade — arte espalhada em posicoes livres. Devolve a caixa e a area de cada
 * blob, do maior pro menor, ignorando os menores que `areaMinima`.
 *
 * Com `comPixels`, cada blob leva tambem `pixels`: os indices lineares dos seus
 * proprios pixels. Serve pra recortar a peca sem levar o vizinho — a caixa e
 * retangular, entao arte diagonal (tapete) pega o canto de quem esta ao lado.
 */
export function blobs(img, areaMinima = 24, limiteAlfa = 16, comPixels = false) {
  const visto = new Uint8Array(img.w * img.h);
  const achados = [];
  const pilha = new Int32Array(img.w * img.h);

  const opaco = (x, y) =>
    x >= 0 && y >= 0 && x < img.w && y < img.h && img.px[(y * img.w + x) * 4 + 3] > limiteAlfa;

  for (let y0 = 0; y0 < img.h; y0++) {
    for (let x0 = 0; x0 < img.w; x0++) {
      const raiz = y0 * img.w + x0;
      if (visto[raiz] || !opaco(x0, y0)) continue;

      let topo = 0;
      pilha[topo++] = raiz;
      visto[raiz] = 1;
      const meus = comPixels ? [] : null;
      let minX = x0;
      let maxX = x0;
      let minY = y0;
      let maxY = y0;
      let area = 0;

      while (topo > 0) {
        const i = pilha[--topo];
        const x = i % img.w;
        const y = (i - x) / img.w;
        area++;
        if (meus) meus.push(i);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const a = x + dx;
            const b = y + dy;
            if (!opaco(a, b)) continue;
            const j = b * img.w + a;
            if (visto[j]) continue;
            visto[j] = 1;
            pilha[topo++] = j;
          }
        }
      }

      if (area >= areaMinima) {
        const b = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area };
        if (meus) b.pixels = meus;
        achados.push(b);
      }
    }
  }
  return achados.sort((a, b) => b.area - a.area);
}

/**
 * Reduz `caixa` da imagem para `w` x `h` (retangulo qualquer, nao so quadrado).
 * Devolve um array linear de w*h cores RGBA.
 */
export function reduzirPara(img, caixa, w, h) {
  const saida = new Array(w * h);
  const passoX = caixa.w / w;
  const passoY = caixa.h / h;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      saida[j * w + i] = media(img, caixa.x + i * passoX, caixa.y + j * passoY, passoX, passoY);
    }
  }
  return saida;
}

/**
 * Agrupa blobs em linhas pelo centro vertical. Serve pra folha cujas celulas
 * se tocam na projecao de alfa (as portas, por exemplo): a grade nao sai por
 * projecao, mas os blobs se organizam em linhas claras.
 * Cada linha sai ordenada da esquerda pra direita.
 */
export function agruparEmLinhas(lista, tolerancia) {
  const porY = lista.slice().sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const linhas = [];
  for (const b of porY) {
    const centro = b.y + b.h / 2;
    const linha = linhas.find((l) => Math.abs(l.centro - centro) <= tolerancia);
    if (linha) {
      linha.itens.push(b);
      // media corrente, pra linha nao derivar com blobs de altura diferente
      linha.centro = linha.itens.reduce((s, i) => s + i.y + i.h / 2, 0) / linha.itens.length;
    } else {
      linhas.push({ centro, itens: [b] });
    }
  }
  for (const l of linhas) l.itens.sort((a, b) => a.x - b.x);
  return linhas.map((l) => l.itens);
}

/**
 * Apaga o fundo CHAPADO de uma folha, deixando-a com alfa como as demais.
 *
 * Parte da arte nova veio exportada sobre preto opaco em vez de transparente, e
 * o resto do pipeline (blobs, empacotamento, atlas) so sabe separar peca de
 * fundo pelo alfa. Apagar por cor pura nao serve: o contorno das pecas tambem e
 * quase preto, e sairiam buracos no meio do movel. Entao a varredura sai das
 * BORDAS e so anda por pixel escuro vizinho de pixel escuro — o preto que esta
 * cercado por arte nunca e alcancado.
 *
 * O `limiar` e baixo de proposito: o fundo dessas folhas e preto quase puro
 * (0-2 por canal) e o contorno das pecas fica bem acima disso. Afrouxar demais
 * come o contorno, a peca se abre pro fundo e um movel inteiro sai fatiado em
 * blobs soltos.
 *
 * Devolve uma imagem nova; a original nao e tocada.
 */
export function removerFundo(img, limiar = 8) {
  const escuro = (i) =>
    img.px[i * 4] <= limiar && img.px[i * 4 + 1] <= limiar && img.px[i * 4 + 2] <= limiar;
  const fundo = new Uint8Array(img.w * img.h);
  const pilha = [];
  const empilhar = (x, y) => {
    const i = y * img.w + x;
    if (fundo[i] || !escuro(i)) return;
    fundo[i] = 1;
    pilha.push(i);
  };
  for (let x = 0; x < img.w; x++) {
    empilhar(x, 0);
    empilhar(x, img.h - 1);
  }
  for (let y = 0; y < img.h; y++) {
    empilhar(0, y);
    empilhar(img.w - 1, y);
  }
  while (pilha.length) {
    const i = pilha.pop();
    const x = i % img.w;
    const y = (i - x) / img.w;
    if (x > 0) empilhar(x - 1, y);
    if (x < img.w - 1) empilhar(x + 1, y);
    if (y > 0) empilhar(x, y - 1);
    if (y < img.h - 1) empilhar(x, y + 1);
  }
  const px = new Uint8Array(img.px);
  for (let i = 0; i < fundo.length; i++) if (fundo[i]) px[i * 4 + 3] = 0;
  return { w: img.w, h: img.h, px };
}

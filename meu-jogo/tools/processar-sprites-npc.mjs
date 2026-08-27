import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caixaOpaca, lerPng, reduzirPara } from './imagem.mjs';
import { colarRet, Img } from './png.mjs';

const DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'assets', 'sprites');
const FRAME = { w: 256, h: 320 };
const MARGEM = { x: 12, y: 12 };

/** Remove somente o preto conectado as bordas, preservando cores escuras internas. */
function removerFundoPreto(origem) {
  const total = origem.w * origem.h;
  const fundo = new Uint8Array(total);
  const fila = new Int32Array(total);
  let inicio = 0;
  let fim = 0;
  const escuro = (indice) => {
    const p = indice * 4;
    return origem.px[p] < 8 && origem.px[p + 1] < 8 && origem.px[p + 2] < 8;
  };
  const adicionar = (indice) => {
    if (indice < 0 || indice >= total || fundo[indice] || !escuro(indice)) return;
    fundo[indice] = 1;
    fila[fim++] = indice;
  };
  for (let x = 0; x < origem.w; x++) {
    adicionar(x);
    adicionar((origem.h - 1) * origem.w + x);
  }
  for (let y = 0; y < origem.h; y++) {
    adicionar(y * origem.w);
    adicionar(y * origem.w + origem.w - 1);
  }
  while (inicio < fim) {
    const indice = fila[inicio++];
    const x = indice % origem.w;
    if (x > 0) adicionar(indice - 1);
    if (x < origem.w - 1) adicionar(indice + 1);
    adicionar(indice - origem.w);
    adicionar(indice + origem.w);
  }

  const limpa = new Img(origem.w, origem.h);
  limpa.px.set(origem.px);
  for (let i = 0; i < total; i++) if (fundo[i]) limpa.px[i * 4 + 3] = 0;
  return limpa;
}

function componentes(img, totalLinhas, colunas) {
  const quantidade = totalLinhas * colunas;
  const visto = new Uint8Array(img.w * img.h);
  const pilha = new Int32Array(img.w * img.h);
  const encontrados = [];
  const opaco = (indice) => img.px[indice * 4 + 3] > 8;

  for (let raiz = 0; raiz < img.w * img.h; raiz++) {
    if (visto[raiz] || !opaco(raiz)) continue;
    let topo = 0;
    let area = 0;
    let minX = img.w;
    let minY = img.h;
    let maxX = 0;
    let maxY = 0;
    const indices = [];
    pilha[topo++] = raiz;
    visto[raiz] = 1;
    while (topo > 0) {
      const indice = pilha[--topo];
      indices.push(indice);
      area++;
      const x = indice % img.w;
      const y = Math.floor(indice / img.w);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h) continue;
        const vizinho = ny * img.w + nx;
        if (!visto[vizinho] && opaco(vizinho)) {
          visto[vizinho] = 1;
          pilha[topo++] = vizinho;
        }
      }
    }
    if (area < 200) continue;
    const recorte = new Img(maxX - minX + 1, maxY - minY + 1);
    for (const indice of indices) {
      const x = indice % img.w;
      const y = Math.floor(indice / img.w);
      const p = indice * 4;
      recorte.set(x - minX, y - minY, img.px.slice(p, p + 4));
    }
    encontrados.push({ img: recorte, area, centroX: (minX + maxX) / 2, centroY: (minY + maxY) / 2 });
  }

  const principais = encontrados.sort((a, b) => b.area - a.area).slice(0, quantidade);
  if (principais.length !== quantidade) throw new Error(`esperados ${quantidade} sprites, encontrados ${principais.length}`);
  principais.sort((a, b) => a.centroY - b.centroY);
  const grade = [];
  for (let i = 0; i < quantidade; i += colunas) {
    grade.push(principais.slice(i, i + colunas).sort((a, b) => a.centroX - b.centroX));
  }
  return grade;
}

/** Gera uma grade uniforme: cada frame contem exatamente uma pose. */
function normalizar({ entrada, saida, linhasOriginais, colunasOriginais = 4, mapa, removerPreto = false }) {
  const lida = lerPng(join(DIR, entrada));
  const origem = removerPreto ? removerFundoPreto(lida) : lida;
  const grade = componentes(origem, linhasOriginais, colunasOriginais);
  const frames = mapa.flat().map(({ coluna, linha, flipX = false }) => ({
    img: grade[linha][coluna].img,
    flipX,
  }));
  const maiorW = Math.max(...frames.map((frame) => frame.img.w));
  const maiorH = Math.max(...frames.map((frame) => frame.img.h));
  const escala = Math.min(
    (FRAME.w - MARGEM.x * 2) / maiorW,
    (FRAME.h - MARGEM.y * 2) / maiorH,
  );
  const destino = new Img(FRAME.w * 4, FRAME.h * 4);

  frames.forEach(({ img: frame, flipX }, indice) => {
    const w = Math.max(1, Math.round(frame.w * escala));
    const h = Math.max(1, Math.round(frame.h * escala));
    const caixa = caixaOpaca(frame);
    if (!caixa) throw new Error(`componente vazio no frame ${indice}`);
    const pixels = reduzirPara(frame, caixa, w, h);
    if (flipX) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < Math.floor(w / 2); x++) {
          const esquerda = y * w + x;
          const direita = y * w + (w - x - 1);
          [pixels[esquerda], pixels[direita]] = [pixels[direita], pixels[esquerda]];
        }
      }
    }
    const coluna = indice % 4;
    const linha = Math.floor(indice / 4);
    const x = coluna * FRAME.w + Math.round((FRAME.w - w) / 2);
    const y = linha * FRAME.h + FRAME.h - MARGEM.y - h;
    colarRet(destino, pixels, w, h, x, y);
  });

  writeFileSync(join(DIR, saida), destino.png());
  console.log(`[npc] ${entrada} -> ${saida} (${destino.w}x${destino.h}, 4x4)`);
}

const linha = (n) => [0, 1, 2, 3].map((coluna) => ({ coluna, linha: n }));

normalizar({
  entrada: 'Edu_correndo.png',
  saida: 'Edu_correndo_runtime.png',
  linhasOriginais: 3,
  mapa: [
    linha(0),
    linha(1),
    [0, 1, 0, 1].map((coluna) => ({ coluna, linha: 2 })),
    [0, 1, 0, 1].map((coluna) => ({ coluna, linha: 2, flipX: true })),
  ],
});

const tresFrames = (linha, inicio = 0, flipX = false) => [0, 1, 2, 1].map((offset) => ({
  coluna: inicio + offset,
  linha,
  flipX,
}));

normalizar({
  entrada: 'Edu_andando.png',
  saida: 'Edu_andando_runtime.png',
  linhasOriginais: 3,
  colunasOriginais: 6,
  mapa: [
    tresFrames(0),
    tresFrames(0, 3),
    tresFrames(1),
    tresFrames(1, 3),
  ],
});

normalizar({
  entrada: 'Mari_correndo.png',
  saida: 'Mari_correndo_runtime.png',
  linhasOriginais: 4,
  mapa: [linha(0), linha(1), linha(2), linha(3)],
  removerPreto: true,
});

normalizar({
  entrada: 'Mari_andando.png',
  saida: 'Mari_andando_runtime.png',
  linhasOriginais: 4,
  mapa: [linha(0), linha(1), linha(2), linha(3)],
  removerPreto: true,
});

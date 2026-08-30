import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caixaOpaca, lerPng, reduzirPara } from './imagem.mjs';
import { colarRet, Img } from './png.mjs';

const DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'assets', 'sprites');
const FRAME = { w: 256, h: 320 };
const MARGEM = { x: 12, y: 12 };

/**
 * Remove somente o preto conectado as bordas, preservando cores escuras
 * internas. `limiar` existe porque nem toda folha vem com preto puro: a da
 * Leticia tem fundo (11,11,13), que passa batido por um limiar de 8. Subir o
 * limiar so e seguro enquanto o contorno do personagem ficar acima dele —
 * confira a folha `_runtime` gerada antes de subir mais.
 */
function removerFundoPreto(origem, limiar = 8) {
  const total = origem.w * origem.h;
  const fundo = new Uint8Array(total);
  const fila = new Int32Array(total);
  let inicio = 0;
  let fim = 0;
  const escuro = (indice) => {
    const p = indice * 4;
    return origem.px[p] < limiar && origem.px[p + 1] < limiar && origem.px[p + 2] < limiar;
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

/**
 * Separa um componente que na verdade sao DOIS sprites empilhados, encostados
 * na arte. Corta na linha de MENOR quantidade de pixel opaco dentro da faixa
 * central (25%..75% da altura): e onde os dois se tocam. Fora dessa faixa nao
 * se corta, senao a linha mais vazia seria sempre o topo ou o pe do sprite.
 *
 * Existe porque a folha de caminhada do Wendel tem 8 colunas e, em uma delas, o
 * pe da pose de frente toca a cabeca da pose de baixo. Sem o corte, a deteccao
 * acha 31 componentes onde deveria achar 32, o corte pelos N maiores entra um
 * rotulo no lugar do sprite que faltou e TODAS as linhas saem embaralhadas.
 */
function separarEmpilhado(bruto, largura) {
  const { indices, minY, maxY } = bruto;
  const altura = maxY - minY + 1;
  const porLinha = new Int32Array(altura);
  for (const indice of indices) porLinha[Math.floor(indice / largura) - minY] += 1;

  const inicio = Math.floor(altura * 0.25);
  const fim = Math.ceil(altura * 0.75);
  let corte = inicio;
  for (let y = inicio; y < fim; y++) if (porLinha[y] < porLinha[corte]) corte = y;

  const limite = (minY + corte) * largura;
  const acima = indices.filter((indice) => indice < limite);
  const abaixo = indices.filter((indice) => indice >= limite);
  if (!acima.length || !abaixo.length) return [bruto];
  return [acima, abaixo].map((lista) => {
    let nMinX = Infinity, nMinY = Infinity, nMaxX = -Infinity, nMaxY = -Infinity;
    for (const indice of lista) {
      const x = indice % largura;
      const y = Math.floor(indice / largura);
      if (x < nMinX) nMinX = x;
      if (x > nMaxX) nMaxX = x;
      if (y < nMinY) nMinY = y;
      if (y > nMaxY) nMaxY = y;
    }
    return { indices: lista, area: lista.length, minX: nMinX, minY: nMinY, maxX: nMaxX, maxY: nMaxY };
  });
}

function componentes(img, totalLinhas, colunas, separarEmpilhados = false) {
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
    encontrados.push({ indices, area, minX, minY, maxX, maxY });
  }

  // Um componente muito mais alto que a mediana e um par empilhado que se toca.
  // A mediana sai dos proprios componentes, entao o limiar acompanha a folha.
  let brutos = encontrados;
  if (separarEmpilhados && encontrados.length > 2) {
    const alturas = encontrados.map((c) => c.maxY - c.minY + 1).sort((a, b) => a - b);
    const mediana = alturas[Math.floor(alturas.length / 2)];
    brutos = encontrados.flatMap((c) =>
      c.maxY - c.minY + 1 > mediana * 1.4 ? separarEmpilhado(c, img.w) : [c],
    );
  }

  const recortar = (c) => {
    const recorte = new Img(c.maxX - c.minX + 1, c.maxY - c.minY + 1);
    for (const indice of c.indices) {
      const x = indice % img.w;
      const y = Math.floor(indice / img.w);
      const p = indice * 4;
      recorte.set(x - c.minX, y - c.minY, img.px.slice(p, p + 4));
    }
    return {
      img: recorte,
      area: c.area,
      centroX: (c.minX + c.maxX) / 2,
      centroY: (c.minY + c.maxY) / 2,
    };
  };

  const principais = brutos
    .sort((a, b) => b.area - a.area)
    .slice(0, quantidade)
    .map(recortar);
  if (principais.length !== quantidade) throw new Error(`esperados ${quantidade} sprites, encontrados ${principais.length}`);
  principais.sort((a, b) => a.centroY - b.centroY);
  const grade = [];
  for (let i = 0; i < quantidade; i += colunas) {
    grade.push(principais.slice(i, i + colunas).sort((a, b) => a.centroX - b.centroX));
  }
  return grade;
}

/**
 * Corta uma folha pela grade declarada. Algumas artes novas tem halos opacos
 * que ligam duas poses vizinhas e confundem a deteccao por componentes.
 */
function celulasFixas(img, linhas, colunas, limites = {}) {
  const inicioX = Math.floor((limites.x0 ?? 0) * img.w);
  const fimX = Math.floor((limites.x1 ?? 1) * img.w);
  const inicioY = Math.floor((limites.y0 ?? 0) * img.h);
  const fimY = Math.floor((limites.y1 ?? 1) * img.h);
  const largura = fimX - inicioX;
  const altura = fimY - inicioY;
  const cortesX = limites.cortesX?.map((p) => inicioX + Math.floor(p * largura));
  const cortesY = limites.cortesY?.map((p) => inicioY + Math.floor(p * altura));
  return Array.from({ length: linhas }, (_, linhaAtual) =>
    Array.from({ length: colunas }, (_, colunaAtual) => {
      const gradeX0 = cortesX?.[colunaAtual] ?? inicioX + Math.floor((colunaAtual * largura) / colunas);
      const gradeX1 = cortesX?.[colunaAtual + 1] ?? inicioX + Math.floor(((colunaAtual + 1) * largura) / colunas);
      const gradeY0 = cortesY?.[linhaAtual] ?? inicioY + Math.floor((linhaAtual * altura) / linhas);
      const gradeY1 = cortesY?.[linhaAtual + 1] ?? inicioY + Math.floor(((linhaAtual + 1) * altura) / linhas);
      const margemX = Math.floor((gradeX1 - gradeX0) * (limites.sobreposicaoX ?? 0));
      const proporcaoTopo = limites.sobreposicaoTopoLinhas?.[linhaAtual]
        ?? limites.sobreposicaoY ?? 0;
      const proporcaoBase = limites.sobreposicaoBaseLinhas?.[linhaAtual]
        ?? limites.sobreposicaoY ?? 0;
      const margemTopo = Math.floor((gradeY1 - gradeY0) * proporcaoTopo);
      const margemBase = Math.floor((gradeY1 - gradeY0) * proporcaoBase);
      const x0 = Math.max(inicioX, gradeX0 - margemX);
      const x1 = Math.min(fimX, gradeX1 + margemX);
      const y0 = Math.max(inicioY, gradeY0 - margemTopo);
      const y1 = Math.min(fimY, gradeY1 + margemBase);
      const recorte = new Img(x1 - x0, y1 - y0);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const p = (y * img.w + x) * 4;
        const rgba = img.px.slice(p, p + 4);
        if (rgba[3] <= 8) rgba[3] = 0;
        recorte.set(x - x0, y - y0, rgba);
      }
      if (limites.maiorComponente) {
        try {
          return { img: componentes(recorte, 1, 1)[0][0].img };
        } catch {
          // Algumas poses muito escuras desaparecem no limiar de componentes;
          // nesse caso conservamos a celula da grade em vez de abortar a folha.
          return { img: recorte };
        }
      }
      return { img: recorte };
    }),
  );
}

/** Gera uma grade uniforme: cada frame contem exatamente uma pose. */
function normalizar({
  entrada,
  saida,
  linhasOriginais,
  colunasOriginais = 4,
  mapa,
  removerPreto = false,
  limiarPreto = 8,
  separarEmpilhados = false,
  gradeFixa = false,
  limitesGrade,
}) {
  const lida = lerPng(join(DIR, entrada));
  const origem = removerPreto ? removerFundoPreto(lida, limiarPreto) : lida;
  const grade = gradeFixa
    ? celulasFixas(origem, linhasOriginais, colunasOriginais, limitesGrade)
    : componentes(origem, linhasOriginais, colunasOriginais, separarEmpilhados);
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

/**
 * Folha de POSE PARADA: uma pose por direcao. A grade de saida e sempre 4x4,
 * entao a mesma pose vai nas 4 colunas — a animacao de idle usa so a primeira.
 */
const poseParada = (coluna, linha = 0, flipX = false) =>
  [0, 1, 2, 3].map(() => ({ coluna, linha, flipX }));

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

// A ORDEM do `mapa` e sempre [baixo, cima, esquerda, direita] — e o que
// npcs.ts espera nas linhas 0..3 da folha gerada. A ordem DENTRO da folha de
// arte muda de personagem pra personagem, entao cada entrada remapeia.

// Jaqueline: 3 colunas x 4 linhas, na ordem frente / esquerda / direita /
// costas. Com 3 poses o ciclo fecha em vai-e-volta, como o do Edu.
normalizar({
  entrada: 'Jaqueline_andando.png',
  saida: 'Jaqueline_andando_runtime.png',
  linhasOriginais: 4,
  colunasOriginais: 3,
  mapa: [tresFrames(0), tresFrames(3), tresFrames(1), tresFrames(2)],
  removerPreto: true,
});

// Leticia: 4 colunas x 4 linhas, rotuladas na propria arte como FRONT / RIGHT
// / BACK / LEFT. Os rotulos sao componentes bem menores que os personagens,
// entao o corte pelos 16 maiores os descarta sozinho.
normalizar({
  entrada: 'leticia_andando.png',
  saida: 'leticia_andando_runtime.png',
  linhasOriginais: 4,
  mapa: [linha(0), linha(2), linha(3), linha(1)],
  removerPreto: true,
  limiarPreto: 20, // o fundo dela e (11,11,13), nao preto puro
});

// --- poses paradas ---------------------------------------------------------
// Sem estas folhas o idle caia no 1o frame da caminhada, e o NPC parado ficava
// com uma perna a frente da outra, como se andasse no lugar.

// Jaqueline: 1 linha x 4 poses, na ordem frente / direita / esquerda / costas.
normalizar({
  entrada: 'Jaqueline_parada.png',
  saida: 'Jaqueline_parada_runtime.png',
  linhasOriginais: 1,
  colunasOriginais: 4,
  mapa: [poseParada(0), poseParada(3), poseParada(2), poseParada(1)],
});

// Leticia: 1 linha x 4 poses, mas as duas primeiras sao frontais — a folha nao
// tem perfil esquerdo, entao ele sai espelhando o direito.
normalizar({
  entrada: 'Leticia_parada.png',
  saida: 'Leticia_parada_runtime.png',
  linhasOriginais: 1,
  colunasOriginais: 4,
  mapa: [poseParada(0), poseParada(3), poseParada(2, 0, true), poseParada(2)],
});

// Mari: 1 linha x 4 poses — frente, frente (variante), perfil direito, costas.
normalizar({
  entrada: 'Mari_parada.png',
  saida: 'Mari_parada_runtime.png',
  linhasOriginais: 1,
  colunasOriginais: 4,
  mapa: [poseParada(0), poseParada(3), poseParada(2, 0, true), poseParada(2)],
});

// Edu: 2 linhas x 4 poses. A linha 0 e frente, frente, costas, costas; a linha 1
// tem quatro variacoes viradas pra ESQUERDA, entao a direita sai espelhada.
normalizar({
  entrada: 'Edu_parado.png',
  saida: 'Edu_parado_runtime.png',
  linhasOriginais: 2,
  colunasOriginais: 4,
  mapa: [poseParada(0), poseParada(2), poseParada(0, 1), poseParada(0, 1, true)],
});

// --- Alice (bar) e Wendel (farmacia) --------------------------------------
// Os dois moram onde trabalham, entao a folha que mais aparece e a de POSE
// PARADA: eles passam o dia atras do balcao do proprio interior.

/** Quatro frames espacados de uma linha de 8, pro ciclo nao sair pela metade. */
const quatroDeOito = (linha, flipX = false) =>
  [0, 2, 4, 6].map((coluna) => ({ coluna, linha, flipX }));

/** O mesmo pra uma linha de 10 (a folha do Hiago tem dez poses por direcao). */
const quatroDeDez = (linha, flipX = false) =>
  [0, 3, 5, 8].map((coluna) => ({ coluna, linha, flipX }));

// Alice: 4x4, na ordem frente / esquerda / direita / costas. A arte ja vem com
// fundo transparente, entao nao passa pelo removedor de preto.
normalizar({
  entrada: 'Alice_andando.png',
  saida: 'Alice_andando_runtime.png',
  linhasOriginais: 4,
  mapa: [linha(0), linha(3), linha(1), linha(2)],
});

normalizar({
  entrada: 'Alice_parada.png',
  saida: 'Alice_parada_runtime.png',
  linhasOriginais: 4,
  mapa: [poseParada(0, 0), poseParada(0, 3), poseParada(0, 1), poseParada(0, 2)],
});

// Wendel: a folha de caminhada e 8 colunas x 4 linhas, rotulada na propria arte
// como FRENTE / DIREITA / ESQUERDA / COSTAS — outra ordem que a da Alice. Os
// rotulos sao componentes bem menores que os personagens, entao o corte pelos
// 32 maiores os descarta sozinho. O nome do arquivo de arte e "Wendeu", grafia
// da propria arte, como em `Mobilhas_v1.png`; o personagem e Wendel.
normalizar({
  entrada: 'Wendeu_andando.png',
  saida: 'Wendeu_andando_runtime.png',
  linhasOriginais: 4,
  colunasOriginais: 8,
  separarEmpilhados: true, // numa coluna, o pe da pose de frente toca a de baixo
  mapa: [quatroDeOito(0), quatroDeOito(3), quatroDeOito(2), quatroDeOito(1)],
});

// A folha de pose parada dele e 4x4 e segue a ordem da Alice (frente /
// esquerda / direita / costas), nao a da propria folha de caminhada.
normalizar({
  entrada: 'Wendeu_parado.png',
  saida: 'Wendeu_parado_runtime.png',
  linhasOriginais: 4,
  mapa: [poseParada(0, 0), poseParada(0, 3), poseParada(0, 1), poseParada(0, 2)],
});

// ---------------------------------------------------------------- novos --
// Luke (filho da Jaqueline), Hiago e Vitor. As tres folhas de caminhada sao
// 8 colunas x 4 linhas na ordem frente / costas / esquerda / direita, que ja e
// a ordem de saida — por isso o mapa delas e direto, sem remanejar linha.

// Luke — caminhada 8x4 e pose parada 1x4 (frente / direita / esquerda / costas).
normalizar({
  entrada: 'Luke_andando.png',
  saida: 'Luke_andando_runtime.png',
  linhasOriginais: 4,
  colunasOriginais: 8,
  mapa: [quatroDeOito(0), quatroDeOito(1), quatroDeOito(2), quatroDeOito(3)],
});
normalizar({
  entrada: 'Luke_parado.png',
  saida: 'Luke_parado_runtime.png',
  linhasOriginais: 1,
  colunasOriginais: 4,
  mapa: [poseParada(0), poseParada(3), poseParada(2), poseParada(1)],
});

// Hiago — a folha de caminhada dele tem DEZ poses por direcao (as outras tem
// oito), na ordem frente / costas / direita / esquerda. A de pose parada vem
// sobre PRETO OPACO e segue frente / esquerda / direita / costas.
normalizar({
  entrada: 'Hiago_andando.png',
  saida: 'Hiago_andando_runtime.png',
  linhasOriginais: 4,
  colunasOriginais: 10,
  mapa: [quatroDeDez(0), quatroDeDez(1), quatroDeDez(3), quatroDeDez(2)],
});
normalizar({
  entrada: 'Hiago_parado.png',
  saida: 'Hiago_parado_runtime.png',
  linhasOriginais: 4,
  removerPreto: true,
  mapa: [poseParada(0, 0), poseParada(0, 3), poseParada(0, 1), poseParada(0, 2)],
});

// Vitor — a folha de pose parada tem UMA linha util (7 poses de corpo inteiro)
// e mais duas de estudo de rosto e de fone, que nao servem de pose. Pedir uma
// linha de 7 resolve sozinho: o corte pelos MAIORES componentes fica com os
// sete corpos e descarta cabeca e acessorio, que sao bem menores.
//
// As duas poses de perfil da folha olham as duas pro MESMO lado, entao o perfil
// esquerdo sai espelhando o direito — mesmo caminho ja usado na Leticia e na
// Mari, que tambem vieram sem um dos lados.
// a folha de caminhada dele e frente / costas / DIREITA / esquerda, ao contrario
// da do Luke — por isso as duas ultimas linhas entram trocadas
normalizar({
  entrada: 'Vitor_andando.png',
  saida: 'Vitor_andando_runtime.png',
  linhasOriginais: 4,
  colunasOriginais: 8,
  mapa: [quatroDeOito(0), quatroDeOito(1), quatroDeOito(3), quatroDeOito(2)],
});
normalizar({
  entrada: 'Vitor_parado.png',
  saida: 'Vitor_parado_runtime.png',
  linhasOriginais: 1,
  colunasOriginais: 7,
  mapa: [poseParada(0), poseParada(3), poseParada(2, 0, true), poseParada(2)],
});

// ----------------------------------------------------- novos moradores --
// As folhas novas seguem tres formatos recorrentes. Centralizar os formatos
// aqui evita copiar 48 blocos quase identicos e deixa simples substituir uma
// pose parada por caminhada verdadeira depois, sem mudar o cadastro do NPC.
const mapaQuatroDirecoes = [linha(0), linha(3), linha(1), linha(2)];
const mapaParadoQuatroDirecoes = [poseParada(0, 0), poseParada(0, 3), poseParada(0, 1), poseParada(0, 2)];

function novoComFolhas4x4(
  id, andando, parado, removerPreto = false, gradeFixa = false, separarEmpilhados = false,
  limitesPersonalizados = {},
) {
  const limitesGrade = gradeFixa
    ? { maiorComponente: true, ...limitesPersonalizados }
    : undefined;
  normalizar({
    entrada: andando, saida: `${id}_andando_runtime.png`, linhasOriginais: 4,
    mapa: mapaQuatroDirecoes, removerPreto, limiarPreto: 24, gradeFixa, limitesGrade,
    separarEmpilhados,
  });
  normalizar({
    entrada: parado, saida: `${id}_parado_runtime.png`, linhasOriginais: 4,
    mapa: mapaParadoQuatroDirecoes, removerPreto, limiarPreto: 24, gradeFixa, limitesGrade,
    separarEmpilhados,
  });
}

function novoComCaminhada8x4(id, andando, parado, paradoUmaLinha = false) {
  normalizar({
    entrada: andando, saida: `${id}_andando_runtime.png`, linhasOriginais: 4,
    colunasOriginais: 8,
    mapa: [quatroDeOito(0), quatroDeOito(3), quatroDeOito(1), quatroDeOito(2)],
    removerPreto: true, limiarPreto: 24,
  });
  normalizar({
    entrada: parado, saida: `${id}_parado_runtime.png`,
    linhasOriginais: paradoUmaLinha ? 1 : 4,
    colunasOriginais: 4,
    mapa: paradoUmaLinha
      ? [poseParada(0), poseParada(3), poseParada(1), poseParada(2)]
      : mapaParadoQuatroDirecoes,
    removerPreto: true, limiarPreto: 24,
  });
}

/** Caminhada 4x4 acompanhada por quatro poses paradas em uma unica linha. */
function novoComCaminhada4x4EParado1x4(id, andando, parado) {
  normalizar({
    entrada: andando, saida: `${id}_andando_runtime.png`, linhasOriginais: 4,
    colunasOriginais: 4, mapa: mapaQuatroDirecoes,
    removerPreto: true, limiarPreto: 24,
  });
  normalizar({
    entrada: parado, saida: `${id}_parado_runtime.png`, linhasOriginais: 1,
    colunasOriginais: 4,
    mapa: [poseParada(0), poseParada(3), poseParada(1), poseParada(2)],
    removerPreto: true, limiarPreto: 24,
  });
}

/** Sem caminhada propria: usa as quatro direcoes paradas nos dois runtimes. */
function novoSoParado4x4(id, entrada, gradeFixa = false) {
  for (const sufixo of ['andando', 'parado']) {
    normalizar({
      entrada, saida: `${id}_${sufixo}_runtime.png`, linhasOriginais: 4,
      mapa: mapaQuatroDirecoes, removerPreto: true, limiarPreto: 24, gradeFixa,
    });
  }
}

/** Uma unica folha 4x4 fornece caminhada e idle; detecta poses fora da grade. */
function novoSoFolha4x4(id, entrada, gradeFixa = false, limitesGrade, mapa = mapaQuatroDirecoes) {
  for (const sufixo of ['andando', 'parado']) {
    normalizar({
      entrada, saida: `${id}_${sufixo}_runtime.png`, linhasOriginais: 4,
      colunasOriginais: 4, mapa,
      removerPreto: true, limiarPreto: 24, gradeFixa, limitesGrade,
    });
  }
}

/** Criancas em folha vertical 1x4: frente, perfil E, perfil D, costas. */
function novoVertical1x4(id, entrada, limitesGrade = { maiorComponente: true }) {
  const mapa = [poseParada(0, 0), poseParada(0, 3), poseParada(0, 1), poseParada(0, 2)];
  for (const sufixo of ['andando', 'parado']) {
    normalizar({
      entrada, saida: `${id}_${sufixo}_runtime.png`, linhasOriginais: 4,
      colunasOriginais: 1, mapa, removerPreto: true, limiarPreto: 48, gradeFixa: true,
      limitesGrade,
    });
  }
}

novoVertical1x4('arthur', 'Arthur_parado.png', {
  cortesY: [0, 0.285, 0.53, 0.78, 1], maiorComponente: true,
});
novoSoParado4x4('bruno', 'Bruno_parado_madeireira.png');
novoComFolhas4x4('caio', 'caio_andando.png', 'Caio_parado.png', true, true);
novoVertical1x4('cecilia', 'Cecilia_parada.png');
novoComFolhas4x4('clara', 'Clara_andando.png', 'Clara_parada_bibliotecaria.png', false, true, false, {
  cortesY: [0, 0.258, 0.5, 0.748, 1],
});
novoSoParado4x4('davi', 'Davi_parado.png');
novoVertical1x4('helena', 'Helena_parada.png');
novoComCaminhada8x4('joao', 'João_andando.png', 'João_parado.png');
// A folha "Julia_parada" retrata outra personagem e contem uma pose gigante
// solta. A propria caminhada fornece os quatro idles coerentes com a Julia.
novoSoFolha4x4('julia', 'Julia_andando.png', true, {
  x1: 0.77, maiorComponente: true,
});
novoComCaminhada4x4EParado1x4('lucas', 'Lucas_andando.png', 'lucas_parado.png');
novoSoParado4x4('lucia', 'Lucia_parada.png');
novoSoParado4x4('livia', 'Lívia diretora.png');
novoVertical1x4('manuela', 'Manuela_parada.png');
// A folha do Matheus e uma grade 4x4 regular, mas radio, bolsa e bone soltos
// formam componentes separados. O corte por componentes confundia esses
// acessorios com personagens inteiros e produzia frames sem cabeca/corpo.
novoSoParado4x4('matheus', 'Matheus_parado.png', true);
novoComCaminhada8x4('neide', 'Neide_andando.png', 'Neide_parada.png');
novoSoParado4x4('priscila', 'Priscila.png');
novoSoFolha4x4('ilda', 'Professora_ilda.png', false);
novoSoParado4x4('rafael', 'Rafael_parado.png', true);
novoVertical1x4('ravi', 'Ravi_parado.png');
novoSoFolha4x4('roberto', 'Roberto_parado.png', true, {
  x0: 0.235, x1: 0.77, cortesY: [0, 0.278, 0.53, 0.77, 1], maiorComponente: true,
});
novoSoFolha4x4('samanta', 'Samanda_andando.png', true, {
  x0: 0.05, x1: 0.72, cortesY: [0, 0.27, 0.49, 0.74, 1], maiorComponente: true,
}, [linha(0), linha(3), [2, 3, 2, 3].map((coluna) => ({ coluna, linha: 1 })), linha(2)]);
novoComFolhas4x4('suzan', 'Suzan_andando.png', 'Suzan_parada.png', false, true, false, {
  cortesY: [0, 0.26, 0.495, 0.72, 1],
});
novoSoParado4x4('tulio', 'Tulio_parado.png');
novoSoParado4x4('rita', 'Vó_rita_parada.png');

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caixaOpaca, lerPng, reduzirPara } from './imagem.mjs';
import { colarRet, Img } from './png.mjs';

/**
 * MAQUINARIA DE FOLHA DE PERSONAGEM — o recortador compartilhado.
 *
 * A arte de personagem deste projeto (NPC e monstro) chega em folhas que nao
 * seguem grade nenhuma: as poses tem tamanhos diferentes, os vaos entre elas
 * caem em fracoes irregulares, algumas folhas vem sobre preto chapado e outras
 * ja recortadas, e ha folha em que uma pose invade a linha de cima. O que sai
 * daqui e sempre a MESMA coisa: uma folha 4x4 uniforme, celula de 256x320, com
 * as linhas na ordem baixo/cima/esquerda/direita — que e o que o BootScene
 * recorta sem saber de onde a arte veio.
 *
 * Este arquivo era o miolo de `processar-sprites-npc.mjs`. Ele saiu de la
 * quando os monstros da represa passaram a precisar do mesmo recorte: duplicar
 * `normalizar` significaria corrigir dois lugares a cada folha nova com
 * layout torto, e foi exatamente esse tipo de duplicacao que produziu os bugs
 * de textura da leva anterior.
 */

const DIR_SPRITES = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'assets', 'sprites');
const FRAME = { w: 256, h: 320 };
const MARGEM = { x: 12, y: 12 };

/** Onde as folhas de runtime sao lidas e gravadas. */
export const DIR = DIR_SPRITES;
export { FRAME, MARGEM };

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
 * A folha chegou CHAPADA (sem alfa nenhum)? So nesse caso ha fundo preto pra
 * remover. A separacao e limpa nas artes deste projeto: as chapadas dao 100%
 * de pixel opaco, as que ja vem recortadas ficam entre 21% e 53%. Nao serve
 * olhar so a moldura: o cabelo da Helena toca as duas laterais da folha dela.
 */
function fundoChapado(img) {
  let opacos = 0;
  for (let i = 3; i < img.px.length; i += 4) if (img.px[i] > 8) opacos += 1;
  return opacos / (img.w * img.h) >= 0.9;
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
 * Projecao de pixel opaco de uma faixa da imagem, por linha (`eixo: 'y'`) ou
 * por coluna (`eixo: 'x'`). E a materia-prima da busca de vao entre poses.
 */
function projecao(img, eixo, inicioA, fimA, inicioB, fimB) {
  const conta = new Int32Array(eixo === 'y' ? img.h : img.w);
  for (let a = inicioA; a < fimA; a++) {
    for (let b = inicioB; b < fimB; b++) {
      const x = eixo === 'y' ? b : a;
      const y = eixo === 'y' ? a : b;
      if (img.px[(y * img.w + x) * 4 + 3] > 8) conta[a] += 1;
    }
  }
  return conta;
}

/**
 * Linhas de corte de uma grade de `quantidade` celulas dentro de
 * `[inicio, fim)`, buscadas pela projecao em vez de assumidas.
 *
 * As folhas de arte NAO tem as poses distribuidas em celulas iguais: na do
 * Arthur a primeira pose ocupa 28% da altura, na da Helena os vaos caem em
 * 0,29 / 0,54 / 0,77. Dividir em quartos exatos cortava a figura no meio, e o
 * `maiorComponente` entao ficava com o pedaco maior do corte — o cabelo, as
 * pernas — em vez do personagem. Aqui cada fronteira NOMINAL e movida para a
 * posicao de MENOS pixel opaco numa janela em volta dela; empate fica com a
 * mais proxima do nominal, por isso a varredura sai do centro pros lados.
 *
 * Uma folha de grade realmente regular tem zero opaco na fronteira nominal, e
 * a busca devolve exatamente ela — o comportamento antigo continua valendo
 * onde ele estava certo.
 */
function cortesPorVao(perfil, inicio, fim, quantidade, janela = 0.14) {
  const total = fim - inicio;
  const cortes = [inicio];
  const raio = Math.max(2, Math.round((total / quantidade) * janela));
  for (let i = 1; i < quantidade; i++) {
    const nominal = inicio + Math.round((i * total) / quantidade);
    let melhor = Math.min(fim - 1, Math.max(inicio + 1, nominal));
    for (let passo = 1; passo <= raio; passo++) {
      for (const candidato of [nominal - passo, nominal + passo]) {
        if (candidato <= inicio || candidato >= fim - 1) continue;
        if (perfil[candidato] < perfil[melhor]) melhor = candidato;
      }
    }
    cortes.push(melhor);
  }
  cortes.push(fim);
  return cortes;
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
  const cortesX = limites.cortesX
    ? limites.cortesX.map((p) => inicioX + Math.floor(p * largura))
    : colunas > 1
      ? cortesPorVao(projecao(img, 'x', inicioX, fimX, inicioY, fimY), inicioX, fimX, colunas)
      : undefined;
  const cortesY = limites.cortesY
    ? limites.cortesY.map((p) => inicioY + Math.floor(p * altura))
    : linhas > 1
      ? cortesPorVao(projecao(img, 'y', inicioY, fimY, inicioX, fimX), inicioY, fimY, linhas)
      : undefined;
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
  /**
   * Pasta de onde a folha CRUA e lida. O padrao e a propria pasta de sprites,
   * porque as folhas de NPC ja moram la; os monstros vieram numa pasta propria
   * (`public/assets/Monstros`) e passam o caminho aqui. A SAIDA e sempre em
   * `public/assets/sprites`, que e o que o jogo serve.
   */
  dirEntrada = DIR_SPRITES,
  linhasOriginais,
  colunasOriginais = 4,
  mapa,
  removerPreto = false,
  limiarPreto = 8,
  separarEmpilhados = false,
  gradeFixa = false,
  limitesGrade,
}) {
  const lida = lerPng(join(dirEntrada, entrada));
  // `removerFundoPreto` decide pela COR, ignorando o alfa: numa folha que ja
  // vem com fundo transparente, o RGB lixo por baixo do alfa 0 e escuro, a
  // inundacao atravessa o fundo inteiro e come o cabelo preto do personagem —
  // foi o que apagou a pose de costas da Helena e a do Arthur.
  const origem = removerPreto && fundoChapado(lida)
    ? removerFundoPreto(lida, limiarPreto)
    : lida;
  const grade = gradeFixa
    ? celulasFixas(origem, linhasOriginais, colunasOriginais, limitesGrade)
    : componentes(origem, linhasOriginais, colunasOriginais, separarEmpilhados);
  const frames = mapa.flat().map(({ coluna, linha, flipX = false }) => ({
    img: grade[linha][coluna].img,
    flipX,
  }));
  // A ESCALA SAI DA CAIXA OPACA, nunca do tamanho da imagem de origem.
  // `reduzirPara` reamostra somente a caixa opaca; medir a escala pela imagem
  // inteira so coincide no caminho por componentes, onde o recorte JA e a caixa.
  // No caminho `gradeFixa` a imagem e a celula inteira da grade, e a figura
  // dentro dela era esticada ate a proporcao da celula — foi o que achatou as
  // folhas do Rafael, da Manuela e da Samanta.
  const caixas = frames.map(({ img: frame }, indice) => {
    const caixa = caixaOpaca(frame);
    if (!caixa) throw new Error(`componente vazio no frame ${indice}`);
    return caixa;
  });
  const maiorW = Math.max(...caixas.map((caixa) => caixa.w));
  const maiorH = Math.max(...caixas.map((caixa) => caixa.h));
  const escala = Math.min(
    (FRAME.w - MARGEM.x * 2) / maiorW,
    (FRAME.h - MARGEM.y * 2) / maiorH,
  );
  const destino = new Img(FRAME.w * 4, FRAME.h * 4);

  frames.forEach(({ img: frame, flipX }, indice) => {
    const caixa = caixas[indice];
    const w = Math.max(1, Math.round(caixa.w * escala));
    const h = Math.max(1, Math.round(caixa.h * escala));
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


/** Uma linha inteira da grade de origem: as 4 colunas, na ordem. */
export const linha = (n) => [0, 1, 2, 3].map((coluna) => ({ coluna, linha: n }));

/**
 * Folha de POSE PARADA: uma pose por direcao. A grade de saida e sempre 4x4,
 * entao a mesma pose vai nas 4 colunas — a animacao de idle usa so a primeira.
 */
export const poseParada = (coluna, linha = 0, flipX = false) =>
  [0, 1, 2, 3].map(() => ({ coluna, linha, flipX }));

export { normalizar, componentes, celulasFixas, projecao, cortesPorVao };

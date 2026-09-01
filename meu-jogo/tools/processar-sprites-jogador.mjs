import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIR } from './folha-personagem.mjs';
import { caixaOpaca, lerPng, reduzirPara } from './imagem.mjs';
import { colarRet, Img } from './png.mjs';

/**
 * Processa `Player_segurando.png` — a folha GENERICA de segurar item.
 *
 * O problema que este arquivo resolve: as folhas do protagonista
 * (`player_sprites`, `Player_andando`, `Player_correndo`) sao lidas CRUAS pelo
 * BootScene, com recorte medido a mao (ver `PLAYER_RECORTE`), e a folha de
 * segurar veio numa grade diferente e com o personagem DESENHADO MAIOR. Trocar
 * a textura do sprite quando o jogador equipa algo, sem tratar isso, faria o
 * personagem crescer 8% e subir do chao no instante do equipar.
 *
 * Entao aqui a folha e REGRAVADA na geometria das outras: grade 4x4 de celulas
 * de 200x320, personagem centrado em x=100 e com os pes em y=300, na ordem de
 * linha baixo/esquerda/direita/cima que o `PLAYER_RECORTE` ja usa. O BootScene
 * recorta a saida com uma grade uniforme e o sprite troca de textura sem mexer
 * em escala nem em origem.
 *
 * O segundo produto e `maos_jogador.json`: o PONTO DE PRESA por direcao, em px
 * da celula. Ele e MEDIDO na arte em vez de escrito a mao — o punho fechado e
 * um componente de cor de pele, e a regra que o acha ("entre os componentes de
 * pele com area >= 300, o de menor altura de caixa") vale nas quatro poses: a
 * cabeca e alta, o braco pendurado e comprido, e o punho erguido e o unico
 * compacto. Escrever quatro pares de numeros a mao daria um item flutuando a
 * dois pixels da mao e ninguem saberia por que.
 */

const FOLHA = 'Player_segurando.png';
const SAIDA = 'player_segurando_runtime.png';
const SAIDA_JSON = 'maos_jogador.json';

/** Celula de saida: a MESMA do `PLAYER_FRAME` do BootScene. */
const CELULA = { w: 200, h: 320 };
/**
 * Onde o personagem tem de cair dentro da celula pra bater com as outras
 * folhas. Os tres numeros sao medidos na `player_sprites.png`: a pose de baixo
 * dela tem 264 px de altura, base em y=300 e centro em x=100.
 */
const ALVO = { altura: 264, base: 300, centro: 100 };

/** Ordem das LINHAS na folha crua e na saida — a mesma do PLAYER_RECORTE. */
const DIRECOES = ['down', 'left', 'right', 'up'];

/** Vao minimo, em px, pra separar duas colunas/linhas na projecao de alfa. */
const VAO_MINIMO = 6;

/** Area minima de um componente de pele pra ele contar como mao ou cabeca. */
const AREA_DE_PELE = 300;

const opaco = (img, x, y) => img.px[(y * img.w + x) * 4 + 3] > 16;

/**
 * Cor de pele. A faixa e larga o bastante pra pegar a sombra do punho e
 * estreita o bastante pra nao pegar a camiseta preta nem o jeans.
 */
function ehPele(img, x, y) {
  const p = (y * img.w + x) * 4;
  const r = img.px[p];
  const g = img.px[p + 1];
  const b = img.px[p + 2];
  const a = img.px[p + 3];
  return a > 100 && r > 170 && g > 110 && g < 210 && b > 70 && b < 180 && r - b > 50 && r - g > 25;
}

/** Faixas com pixel opaco ao longo de um eixo, separadas por vao >= VAO_MINIMO. */
function faixas(img, eixo) {
  const n = eixo === 'x' ? img.w : img.h;
  const m = eixo === 'x' ? img.h : img.w;
  const cheio = [];
  for (let i = 0; i < n; i++) {
    let tem = false;
    for (let j = 0; j < m && !tem; j++) {
      tem = eixo === 'x' ? opaco(img, i, j) : opaco(img, j, i);
    }
    cheio.push(tem);
  }
  const saida = [];
  let inicio = -1;
  let vazio = 0;
  for (let i = 0; i < n; i++) {
    if (cheio[i]) {
      if (inicio < 0) inicio = i;
      vazio = 0;
    } else if (inicio >= 0) {
      vazio += 1;
      if (vazio >= VAO_MINIMO) {
        saida.push([inicio, i - vazio + 1]);
        inicio = -1;
        vazio = 0;
      }
    }
  }
  if (inicio >= 0) saida.push([inicio, n]);
  return saida;
}

/** Componentes de pele de um retangulo, com caixa e area. */
function componentesDePele(img, x0, y0, x1, y1) {
  const W = x1 - x0;
  const H = y1 - y0;
  const marca = new Int8Array(W * H);
  const saida = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (marca[i]) continue;
      marca[i] = 1;
      if (!ehPele(img, x + x0, y + y0)) continue;
      const pilha = [[x, y]];
      let n = 0;
      let minx = W;
      let maxx = -1;
      let miny = H;
      let maxy = -1;
      while (pilha.length) {
        const atual = pilha.pop();
        const cx = atual[0];
        const cy = atual[1];
        n += 1;
        if (cx < minx) minx = cx;
        if (cx > maxx) maxx = cx;
        if (cy < miny) miny = cy;
        if (cy > maxy) maxy = cy;
        const vizinhos = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const v of vizinhos) {
          const nx = v[0];
          const ny = v[1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (marca[j]) continue;
          marca[j] = 1;
          if (ehPele(img, nx + x0, ny + y0)) pilha.push([nx, ny]);
        }
      }
      saida.push({ n, x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1 });
    }
  }
  return saida;
}

// ------------------------------------------------------------------ leitura --
const bruta = lerPng(join(DIR, FOLHA));
const colunas = faixas(bruta, 'x');
const linhas = faixas(bruta, 'y');
if (colunas.length !== 4 || linhas.length !== 4) {
  throw new Error(
    `${FOLHA}: esperava uma grade 4x4, achei ${colunas.length} coluna(s) e ` +
      `${linhas.length} linha(s) — a arte mudou de layout?`,
  );
}

/** Recorte de uma celula da grade crua, como imagem propria. */
function celula(cx, cy) {
  const x0 = colunas[cx][0];
  const x1 = colunas[cx][1];
  const y0 = linhas[cy][0];
  const y1 = linhas[cy][1];
  const im = new Img(x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * bruta.w + x) * 4;
      im.set(x - x0, y - y0, [bruta.px[p], bruta.px[p + 1], bruta.px[p + 2], bruta.px[p + 3]]);
    }
  }
  return im;
}

// A ESCALA e uma so pras 16 celulas, tirada da pose de baixo: escalar cada pose
// pela propria altura faria o personagem encolher e crescer ao virar.
const referencia = celula(0, 0);
const caixaRef = caixaOpaca(referencia);
if (!caixaRef) throw new Error(`${FOLHA}: a pose de baixo saiu vazia`);
const ESCALA = ALVO.altura / caixaRef.h;

const destino = new Img(CELULA.w * 4, CELULA.h * 4);
const ancoras = {};
const alturas = {};

DIRECOES.forEach((direcao, linhaIdx) => {
  for (let colunaIdx = 0; colunaIdx < 4; colunaIdx++) {
    const im = celula(colunaIdx, linhaIdx);
    const caixa = caixaOpaca(im);
    if (!caixa) throw new Error(`${FOLHA}: celula ${colunaIdx},${linhaIdx} vazia`);
    const w = Math.max(1, Math.round(caixa.w * ESCALA));
    const h = Math.max(1, Math.round(caixa.h * ESCALA));
    const pixels = reduzirPara(im, caixa, w, h);
    const destX = colunaIdx * CELULA.w + Math.round(ALVO.centro - w / 2);
    const destY = linhaIdx * CELULA.h + ALVO.base - h;
    colarRet(destino, pixels, w, h, destX, destY);

    // o ponto de presa sai da PRIMEIRA coluna: as quatro colunas de uma linha
    // sao quadros do mesmo passo e a mao balanca poucos pixels entre elas
    if (colunaIdx !== 0) continue;
    const peles = componentesDePele(im, caixa.x, caixa.y, caixa.x + caixa.w, caixa.y + caixa.h)
      .filter((c) => c.n >= AREA_DE_PELE)
      .sort((a, b) => a.h - b.h);
    if (!peles.length) {
      throw new Error(`${FOLHA}: nao achei componente de pele na pose "${direcao}"`);
    }
    const punho = peles[0];
    ancoras[direcao] = {
      x: Math.round(ALVO.centro - w / 2 + (punho.x + punho.w / 2) * ESCALA),
      y: Math.round(ALVO.base - h + (punho.y + punho.h / 2) * ESCALA),
      // lado do punho em px da celula: e a medida de quanto o item pode crescer
      // antes de ficar grande demais pra mao que o segura
      lado: Math.round(Math.max(punho.w, punho.h) * ESCALA),
    };
    alturas[direcao] = h;
  }
});

writeFileSync(join(DIR, SAIDA), destino.png());
writeFileSync(
  join(DIR, SAIDA_JSON),
  JSON.stringify({ celula: CELULA, alvo: ALVO, ancoras, alturas, direcoes: DIRECOES }, null, 1),
);

console.log(
  `[jogador] ${FOLHA} -> ${SAIDA} (${destino.w}x${destino.h}, 4x4 de ${CELULA.w}x${CELULA.h})`,
);
console.log(`[jogador] escala ${ESCALA.toFixed(4)} | alturas ${JSON.stringify(alturas)}`);
for (const d of DIRECOES) {
  console.log(`  presa ${d.padEnd(6)} x=${ancoras[d].x} y=${ancoras[d].y} lado=${ancoras[d].lado}`);
}

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIR, normalizar } from './folha-personagem.mjs';

/**
 * Processa as folhas de MONSTRO ELETRONICO de `arte/Monstros` para o
 * mesmo formato de runtime dos NPCs: uma folha 4x4 de caminhada e uma 4x4 de
 * pose parada, celula de 256x320, linhas na ordem baixo/cima/esquerda/direita.
 *
 * Usar a MESMA maquinaria dos NPCs (`tools/folha-personagem.mjs`) e deliberado:
 * assim o BootScene recorta monstro com o mesmo `recortarFolhaNpc` que ja usa,
 * e a cena anima monstro com o mesmo par walk/idle. Nao ha um segundo caminho
 * de sprite no jogo por causa dos inimigos.
 *
 * AS FOLHAS NAO SEGUEM UM PADRAO. Sao de fontes diferentes e cada uma organiza
 * a grade de um jeito:
 *
 *  - `deadly ball`, `Printer`     — LINHA e direcao (linha 0 = poses paradas,
 *                                   linhas 1-4 = caminhada baixo/esq/cima/dir),
 *                                   com rotulo de texto em vermelho na folha;
 *  - `washing machine`            — igual, mas a ordem das paradas e
 *                                   frente/direita/costas/esquerda;
 *  - `sound box`                  — COLUNA e direcao e linha e quadro
 *                                   (linha 0 = paradas, 1-4 = quadros 1-4);
 *  - `Roboot`                     — coluna e direcao, linha e quadro, SEM linha
 *                                   de pose parada e com 6 quadros;
 *  - `SmatFone`, `Ice_monster`    — 5 colunas de quadro, linha e direcao, com um
 *                                   RETRATO grande solto a direita, que fica
 *                                   fora do recorte por `x1`.
 *
 * Por isso cada folha declara os proprios `cortesX`/`cortesY`, medidos na
 * projecao de alfa da arte, em vez de confiar na busca automatica de vao: em
 * metade delas o rotulo de texto ou o retrato solto move o minimo de projecao
 * pro lugar errado, e um corte errado embaralha as direcoes inteiras.
 *
 * `maiorComponente` esta ligado em todas: e o que descarta o rotulo de texto
 * ("STANDING", "DOWN", "FRAME 1") e mantem so a figura dentro da celula.
 */
const MONSTROS = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'arte', 'Monstros');

/** Quatro quadros de uma linha, na ordem 0,1,2,3. */
const quadros4 = (linha) => [0, 1, 2, 3].map((coluna) => ({ coluna, linha }));
/** Uma pose repetida nas 4 colunas — e o que a folha de idle pede. */
const parada = (coluna, linha) => [0, 1, 2, 3].map(() => ({ coluna, linha }));

/**
 * Folha em que a LINHA e a direcao: linha 0 traz as quatro poses paradas (uma
 * por coluna) e as linhas 1..4 sao os ciclos de caminhada.
 *
 * `ordemParada` diz em que coluna da linha 0 esta cada direcao, e `ordemAndando`
 * diz em que linha esta cada ciclo — as duas na ordem baixo/cima/esquerda/direita
 * que o runtime espera.
 */
function porLinhaDeDirecao(id, arquivo, cortes, ordemParada, ordemAndando) {
  const comum = {
    entrada: arquivo,
    dirEntrada: MONSTROS,
    linhasOriginais: cortes.cortesY.length - 1,
    colunasOriginais: cortes.cortesX.length - 1,
    removerPreto: true,
    limiarPreto: 24,
    gradeFixa: true,
    limitesGrade: { ...cortes, maiorComponente: true },
  };
  normalizar({
    ...comum,
    saida: `${id}_andando_runtime.png`,
    mapa: ordemAndando.map((linha) => quadros4(linha)),
  });
  normalizar({
    ...comum,
    saida: `${id}_parado_runtime.png`,
    mapa: ordemParada.map((coluna) => parada(coluna, 0)),
  });
}

/**
 * Folha em que a COLUNA e a direcao e a LINHA e o quadro. `linhaParada` e a
 * linha das poses paradas (null quando a folha nao tem uma — ai o idle sai do
 * primeiro quadro da caminhada, que nesta arte e uma pose de pe aceitavel
 * porque o monstro nao tem perna em passada).
 */
function porColunaDeDirecao(id, arquivo, cortes, ordemColuna, linhasQuadro, linhaParada) {
  const comum = {
    entrada: arquivo,
    dirEntrada: MONSTROS,
    linhasOriginais: cortes.cortesY.length - 1,
    colunasOriginais: cortes.cortesX.length - 1,
    removerPreto: true,
    limiarPreto: 24,
    gradeFixa: true,
    limitesGrade: { ...cortes, maiorComponente: true },
  };
  normalizar({
    ...comum,
    saida: `${id}_andando_runtime.png`,
    mapa: ordemColuna.map((coluna) => linhasQuadro.map((linha) => ({ coluna, linha }))),
  });
  normalizar({
    ...comum,
    saida: `${id}_parado_runtime.png`,
    mapa: ordemColuna.map((coluna) => parada(coluna, linhaParada ?? linhasQuadro[0])),
  });
}

// ------------------------------------------------------------------------
// `deadly ball.png` — 4x5, linha = direcao. Vira a ESFERA DE CHOQUE.
porLinhaDeDirecao(
  'esfera_choque',
  'deadly ball.png',
  {
    cortesX: [0.006, 0.275, 0.513, 0.746, 0.985],
    cortesY: [0.002, 0.275, 0.474, 0.634, 0.805, 0.985],
  },
  // linha 0: DOWN, LEFT, UP, RIGHT (rotulado na propria arte)
  [0, 2, 1, 3],
  // linhas de caminhada: 1=down, 2=left, 3=up, 4=right
  [1, 3, 2, 4],
);

// `Printer.png` — mesmo layout. Vira a IMPRESSORA ARISCA.
porLinhaDeDirecao(
  'impressora',
  'Printer.png',
  {
    cortesX: [0.004, 0.29, 0.516, 0.746, 0.985],
    cortesY: [0.007, 0.246, 0.419, 0.585, 0.762, 0.968],
  },
  [0, 2, 1, 3],
  [1, 3, 2, 4],
);

// `washing machine.png` — linha = direcao, mas a linha 0 esta em
// FRENTE/DIREITA/COSTAS/ESQUERDA (a arte rotula assim), e as linhas de
// caminhada seguem a mesma ordem. Vira a MAQUINA PESADA.
porLinhaDeDirecao(
  'maquina_lavar',
  'washing machine.png',
  {
    cortesX: [0.002, 0.319, 0.519, 0.749, 0.98],
    cortesY: [0.004, 0.299, 0.47, 0.64, 0.803, 0.994],
  },
  // baixo=frente(0), cima=costas(2), esquerda=left(3), direita=right(1)
  [0, 2, 3, 1],
  // 1=frente, 2=direita, 3=costas, 4=esquerda
  [1, 3, 4, 2],
);

// `sound box.png` — COLUNA = direcao, linha 0 = paradas, 1..4 = quadros.
porColunaDeDirecao(
  'caixa_som',
  'sound box.png',
  {
    cortesX: [0.001, 0.274, 0.48, 0.767, 0.978],
    cortesY: [0.0, 0.251, 0.462, 0.622, 0.783, 0.976],
  },
  // colunas: DOWN, LEFT, UP, RIGHT -> baixo, cima, esquerda, direita
  [0, 2, 1, 3],
  [1, 2, 3, 4],
  0,
);

// `Roboot.png` — coluna = direcao, 6 quadros, SEM linha de pose parada.
porColunaDeDirecao(
  'robo_servico',
  'Roboot.png',
  {
    cortesX: [0.019, 0.259, 0.494, 0.739, 0.98],
    cortesY: [0.0, 0.175, 0.344, 0.513, 0.682, 0.851, 1.0],
  },
  // colunas: frente, perfil esquerdo, perfil direito, costas
  [0, 3, 1, 2],
  // 4 dos 6 quadros, espacados: da o ciclo sem ficar arrastado
  [0, 2, 3, 5],
  null,
);

// `SmatFone.png` — 5 colunas de quadro e linha = direcao, com o retrato grande
// a direita cortado fora por `x1`. Vira o APARELHO TOMADO.
porLinhaDeDirecao(
  'smartfone',
  'SmatFone.png',
  {
    x1: 0.755,
    cortesX: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    cortesY: [0.006, 0.18, 0.35, 0.507, 0.654, 0.829, 0.99],
  },
  // a folha nao tem linha de paradas: o idle sai do primeiro quadro de cada
  // ciclo, e por isso `ordemParada` aqui aponta pra coluna 0 das linhas de
  // caminhada (ver a chamada especial de `parada` abaixo)
  [0, 0, 0, 0],
  // 1=frente, 2=perfil esquerdo, 3=perfil direito, 4=costas
  [1, 4, 2, 3],
);

// `Ice_monster.png` — mesmo esquema do SmatFone, com 7 linhas. Vira a CAMARA FRIA.
porLinhaDeDirecao(
  'geladeira_gelo',
  'Ice_monster.png',
  {
    x1: 0.65,
    cortesX: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    cortesY: [0.012, 0.155, 0.3, 0.442, 0.59, 0.738, 0.88, 0.991],
  },
  [0, 0, 0, 0],
  // 1=frente, 2=perfil esquerdo, 3=perfil direito, 4=costas
  [1, 4, 2, 3],
);

/**
 * As duas folhas que ficaram DE FORA, e por que:
 *
 * - `Boss_v1.png`      — a folha veio sobre um FUNDO DEGRADE vermelho/roxo
 *                        opaco, nao sobre preto chapado. `removerFundoPreto`
 *                        decide por cor escura conectada a borda e nao encosta
 *                        nesse fundo, entao cada celula sairia com o retangulo
 *                        de degrade em volta da figura. Tirar exigiria chroma
 *                        key com tolerancia, que nao existe no pipeline — e
 *                        chefe esta fora do escopo desta leva de qualquer forma.
 * - `Micro-ondas.png`  — a folha mistura, nas mesmas linhas, ciclo de caminhada,
 *                        quadros de morte, sopro de fogo e PECAS SOLTAS (garra,
 *                        tubo, faisca). As colunas nao separam na projecao em
 *                        nenhum limiar, e as linhas de baixo tem contagem
 *                        diferente das de cima. Daria pra forcar um corte, mas o
 *                        resultado seria uma direcao com quadro de explosao no
 *                        meio do ciclo.
 *
 * As duas continuam na pasta, intocadas. Aproveitar qualquer uma delas pede
 * trabalho no recortador, nao mais uma entrada aqui.
 */
const FOLHAS_FORA = ['Boss_v1.png', 'Micro-ondas.png'];

const PROCESSADOS = [
  'esfera_choque',
  'impressora',
  'maquina_lavar',
  'caixa_som',
  'robo_servico',
  'smartfone',
  'geladeira_gelo',
];

writeFileSync(
  join(DIR, 'monstros.json'),
  `${JSON.stringify({ monstros: PROCESSADOS, semUso: FOLHAS_FORA }, null, 2)}\n`,
);
console.log(
  `[monstro] ${PROCESSADOS.length} folha(s) processada(s): ${PROCESSADOS.join(', ')}` +
    ` | fora: ${FOLHAS_FORA.join(', ')}`,
);

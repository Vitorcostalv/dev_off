import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIR,
  linha,
  normalizar,
  poseParada,
} from './folha-personagem.mjs';

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
function novoSoParado4x4(id, entrada, gradeFixa = false, limitesGrade) {
  for (const sufixo of ['andando', 'parado']) {
    normalizar({
      entrada, saida: `${id}_${sufixo}_runtime.png`, linhasOriginais: 4,
      mapa: mapaQuatroDirecoes, removerPreto: true, limiarPreto: 24, gradeFixa,
      limitesGrade,
      // a folha de origem nao tem passada; a de caminhada ganha o ciclo
      // sintetico, a de parado fica como veio
      passoSintetico: sufixo === 'andando',
    });
  }
}

/**
 * Uma unica folha 4x4 de CAMINHADA fornece os dois runtimes: a de passos sai
 * inteira, e a de idle repete a primeira coluna de cada direcao. Sem essa
 * repeticao o arquivo `_parado` guardaria quatro poses de passada, e "parado"
 * passaria a significar coisas diferentes de NPC pra NPC.
 */
function novoSoFolha4x4(id, entrada, gradeFixa = false, limitesGrade, mapa = mapaQuatroDirecoes) {
  const parado = mapa.map((direcao) => [0, 1, 2, 3].map(() => direcao[0]));
  for (const [sufixo, usado] of [['andando', mapa], ['parado', parado]]) {
    normalizar({
      entrada, saida: `${id}_${sufixo}_runtime.png`, linhasOriginais: 4,
      colunasOriginais: 4, mapa: usado,
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
      passoSintetico: sufixo === 'andando',
    });
  }
}

novoVertical1x4('arthur', 'Arthur_parado.png');
novoSoParado4x4('bruno', 'Bruno_parado_madeireira.png');
novoComFolhas4x4('caio', 'caio_andando.png', 'Caio_parado.png', true, true);
novoVertical1x4('cecilia', 'Cecilia_parada.png');
novoComFolhas4x4('clara', 'Clara_andando.png', 'Clara_parada_bibliotecaria.png', false, true);
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
novoSoParado4x4('livia', 'Lívia diretora.png', true);
novoVertical1x4('manuela', 'Manuela_parada.png');
// A folha do Matheus e a unica em que as linhas de pose se INVADEM: numa das
// colunas ele ergue o bastao, que sobe ate a fileira de cima, e por isso a
// folha nao tem uma unica linha horizontal vazia. Sem vao pra achar, o corte
// sempre atravessa alguma figura — `maiorComponente` e o que descarta o pedaco
// invasor e mantem o policial inteiro dentro da celula.
novoSoParado4x4('matheus', 'Matheus_parado.png', true, { maiorComponente: true });
novoComCaminhada8x4('neide', 'Neide_andando.png', 'Neide_parada.png');
novoSoParado4x4('priscila', 'Priscila.png');
novoSoFolha4x4('ilda', 'Professora_ilda.png', false);
novoSoParado4x4('rafael', 'Rafael_parado.png', true);
novoVertical1x4('ravi', 'Ravi_parado.png');
// Roberto tem DUAS folhas: `Roberto_Andando.png`, com passada de verdade, e
// `Roberto_parado.png`, com as poses paradas. As duas trazem uma pose solta
// fora da grade 4x4, em posicao diferente em cada uma — dai o `x0`/`x1`
// proprio de cada chamada em vez de um `novoComFolhas4x4` compartilhado.
normalizar({
  entrada: 'Roberto_Andando.png', saida: 'roberto_andando_runtime.png',
  linhasOriginais: 4, colunasOriginais: 4, mapa: mapaQuatroDirecoes,
  removerPreto: true, limiarPreto: 24, gradeFixa: true,
  limitesGrade: { x0: 0.05, x1: 0.75, maiorComponente: true },
});
normalizar({
  entrada: 'Roberto_parado.png', saida: 'roberto_parado_runtime.png',
  linhasOriginais: 4, colunasOriginais: 4, mapa: mapaParadoQuatroDirecoes,
  removerPreto: true, limiarPreto: 24, gradeFixa: true,
  limitesGrade: { x0: 0.235, x1: 0.77, maiorComponente: true },
});
novoSoFolha4x4('samanta', 'Samanda_andando.png', true, {
  x0: 0.05, x1: 0.72, maiorComponente: true,
}, [linha(0), linha(3), [2, 3, 2, 3].map((coluna) => ({ coluna, linha: 1 })), linha(2)]);
novoComFolhas4x4('suzan', 'Suzan_andando.png', 'Suzan_parada.png', false, true);
// Tulio e Livia vem em folha chapada de fundo preto. A remocao do preto abre
// buracos no contorno e o cabelo escuro deles se desprende do corpo, entao o
// corte por componentes entregava meia figura. As duas grades sao regulares:
// cortar pela grade mantem a pose inteira na celula, solta ou nao.
novoSoParado4x4('tulio', 'Tulio_parado.png', true);
novoSoParado4x4('rita', 'Vó_rita_parada.png');

/**
 * Quem anda com PASSADA SINTETICA — a folha de arte so tem pose parada.
 *
 * A lista e escrita, e nao deduzida, pelo mesmo motivo da lista de passada real
 * logo abaixo: o arquivo gerado nao conta de onde veio. Ela vai pro JSON de
 * runtime pra a conferencia de animacao saber diferenciar "anda de mentira"
 * (aceitavel, a arte nao existe) de "nao anda" (defeito).
 */
const PASSADA_SINTETICA = [
  'arthur', 'bruno', 'cecilia', 'davi', 'helena', 'livia', 'lucia', 'manuela',
  'matheus', 'priscila', 'rafael', 'rita', 'ravi', 'tulio',
];

// ------------------------------------------------- quem tem passada real --
/**
 * NPCs cuja folha de ARTE traz um ciclo de caminhada de verdade (pernas em
 * passada), e nao quatro poses paradas diferentes.
 *
 * Esta lista existe porque a distincao nao da pra deduzir do arquivo gerado: o
 * runtime de todo mundo sai numa grade 4x4 identica. E ela sai daqui, do lado
 * das chamadas que leem cada folha, porque e aqui que se sabe qual arte foi
 * usada — os 9 NPCs originais e os moradores entram no mesmo bolo.
 *
 * Vira `npc-caminhada.json`, e a conferencia de rotinas usa esse arquivo pra
 * reprovar quem recebeu rotina de andar sem ter com que andar. Antes de mover
 * um id pra ca, confira a folha `_andando_runtime` gerada: se as quatro
 * colunas de uma direcao mostram a MESMA pose de pe, a arte nao tem passada.
 */
const CAMINHADA_REAL = [
  // os 9 originais
  'edu', 'mari', 'jaqueline', 'leticia', 'wendel', 'alice', 'luke', 'hiago', 'vitor',
  // moradores com folha de caminhada propria
  'caio', 'clara', 'ilda', 'joao', 'julia', 'lucas', 'neide', 'roberto', 'samanta', 'suzan',
];

writeFileSync(
  join(DIR, 'npc-caminhada.json'),
  `${JSON.stringify({ caminhada: CAMINHADA_REAL, sintetica: PASSADA_SINTETICA }, null, 2)}\n`,
);
console.log(
  `[npc] npc-caminhada.json: ${CAMINHADA_REAL.length} com passada real, `
  + `${PASSADA_SINTETICA.length} com passada sintetica`,
);

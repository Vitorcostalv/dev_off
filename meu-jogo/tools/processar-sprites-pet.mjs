import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIR } from './folha-personagem.mjs';
import { blobs, caixaOpaca, lerPng, reduzirPara } from './imagem.mjs';
import { colarRet, Img } from './png.mjs';

/**
 * Processa as folhas de BICHO DE ESTIMACAO — `Cachorros.png` e `Gatos_v1.png`.
 *
 * As duas ja vem quase prontas: fundo transparente, uma raca (ou cor) por
 * linha, uma pose por coluna, todas viradas pra direita. O que falta e o que
 * este processador faz — separar cada linha numa folha propria, na grade 4x4 de
 * runtime (baixo, cima, esquerda, direita) que o BootScene ja sabe recortar.
 *
 * POR QUE UMA FOLHA POR BICHO, e nao uma so com todos: o `recortarFolhaNpc` do
 * BootScene trabalha por textura, e as animacoes sao nomeadas por chave de
 * textura. Uma folha por bicho e o formato que ele ja consome, e e o mesmo que
 * NPC e monstro usam.
 *
 * A CELULA e menor que a de gente (128x128 contra 256x320): um gato deitado tem
 * proporcao de paisagem, e enfiar isso numa celula de retrato desperdicaria
 * metade da textura. O `pets.json` leva junto a ALTURA DO CONTEUDO de cada
 * folha, que e o que a cena usa pra escalar o bicho pro tamanho certo em tiles —
 * escalar pela altura da celula deixaria um gato do tamanho de um cachorro.
 */

const CELULA = { w: 128, h: 128 };
const MARGEM = 6;

/**
 * As duas folhas.
 *
 * `poses` diz em que COLUNA esta cada pose que o runtime precisa, e `linhas` diz
 * quantas racas/cores a folha tem. A ordem das colunas foi lida da propria arte:
 *
 *   Cachorros.png  0 em pe (perfil)  1 sentado (perfil)  2 sentado (frente)
 *                  3 deitado         4 passo A           5 passo B
 *                  6 frente          7 costas
 *
 *   Gatos_v1.png   0 em pe (perfil)  1 sentado (frente)  2 dormindo
 *                  3 passo A         4 passo B           5 frente
 *                  6 costas
 */
const FOLHAS = {
  cachorro: {
    arquivo: 'Cachorros.png',
    linhas: 8,
    colunas: 8,
    areaMinima: 900,
    poses: { frente: 6, costas: 7, passoA: 4, passoB: 5, sentado: 2, dormindo: 3 },
    // uma raca por linha, na ordem em que a folha as traz
    nomes: ['golden', 'labrador', 'beagle', 'corgi', 'bichon', 'salsicha', 'yorkshire', 'dalmata'],
  },
  gato: {
    arquivo: 'Gatos_v1.png',
    linhas: 8,
    colunas: 7,
    areaMinima: 700,
    /**
     * A folha de gato pede CORTE MEDIDO em vez de deteccao por blob.
     *
     * Motivo concreto: a pose de COSTAS do siames (linha 6) e a do rajado (linha
     * 7) se encostam pelo rabo, e o detector as devolve como um blob so de 263 px
     * de altura. Qualquer agrupamento por proximidade erra a partir dai — ou a
     * linha 7 fica com seis poses, ou duas linhas se fundem.
     *
     * Os cortes sao os pontos MEDIOS entre o fim de uma peca e o comeco da
     * seguinte, lidos da projecao de alfa da propria folha. E a mesma solucao que
     * `processar-sprites-monstro.mjs` ja usa nas folhas tortas de monstro.
     */
    cortesX: [0, 238, 390, 565, 769, 986, 1115, 1254],
    cortesY: [0, 171, 329, 491, 649, 805, 955, 1088, 1254],
    poses: { frente: 5, costas: 6, passoA: 3, passoB: 4, sentado: 1, dormindo: 2 },
    nomes: ['laranja', 'preto', 'branco', 'cinza', 'smoking', 'tricolor', 'siames', 'rajado'],
  },
};

/**
 * A grade 4x4 de saida, por indice de frame.
 *
 * Linha 0 baixo, 1 cima, 2 esquerda, 3 direita — a MESMA ordem que
 * `criarSpritesMonstros` espera no BootScene.
 *
 * Baixo e cima nao tem quadro de passada na arte (a folha so traz perfil
 * andando), entao eles alternam entre a pose de frente/costas e a de sentado.
 * Fica melhor do que parecer congelado e nao inventa arte que nao existe.
 */
const GRADE = (p) => [
  // baixo
  { coluna: p.frente }, { coluna: p.frente }, { coluna: p.sentado }, { coluna: p.frente },
  // cima
  { coluna: p.costas }, { coluna: p.costas }, { coluna: p.costas }, { coluna: p.costas },
  // esquerda (a arte olha pra direita: espelha)
  { coluna: p.passoA, flipX: true }, { coluna: p.passoB, flipX: true },
  { coluna: p.passoA, flipX: true }, { coluna: p.passoB, flipX: true },
  // direita
  { coluna: p.passoA }, { coluna: p.passoB }, { coluna: p.passoA }, { coluna: p.passoB },
];

/** A folha de DORMIR/SENTAR: quatro direcoes com a mesma pose parada. */
const GRADE_PARADO = (p) => [
  { coluna: p.frente }, { coluna: p.frente }, { coluna: p.frente }, { coluna: p.frente },
  { coluna: p.costas }, { coluna: p.costas }, { coluna: p.costas }, { coluna: p.costas },
  { coluna: p.sentado, flipX: true }, { coluna: p.sentado, flipX: true },
  { coluna: p.sentado, flipX: true }, { coluna: p.sentado, flipX: true },
  { coluna: p.sentado }, { coluna: p.sentado }, { coluna: p.sentado }, { coluna: p.sentado },
];

/**
 * Agrupa as pecas em EXATAMENTE `linhas` faixas, cortando nos maiores vaos
 * verticais entre centros consecutivos.
 *
 * `agruparEmLinhas` (o agrupador geral do projeto) usa TOLERANCIA, e nas folhas
 * de bicho isso nao fecha: o gato deitado e mais baixo que o sentado, entao o
 * centro dele foge da faixa e a linha se parte. Com tolerancia maior, duas
 * linhas vizinhas se juntam. Aqui a contagem de linhas e CONHECIDA (uma raca por
 * linha), e cortar nos N-1 maiores vaos e exato em vez de aproximado.
 */
function agruparEmGrade(pecas, linhas, colunas, rotulo) {
  const porY = [...pecas].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  const vaos = [];
  for (let i = 1; i < porY.length; i++) {
    const anterior = porY[i - 1].y + porY[i - 1].h / 2;
    const atual = porY[i].y + porY[i].h / 2;
    vaos.push({ i, distancia: atual - anterior });
  }
  const cortes = vaos
    .sort((a, b) => b.distancia - a.distancia)
    .slice(0, linhas - 1)
    .map((v) => v.i)
    .sort((a, b) => a - b);
  const grupos = [];
  let inicio = 0;
  for (const corte of [...cortes, porY.length]) {
    grupos.push(porY.slice(inicio, corte).sort((a, b) => a.x - b.x));
    inicio = corte;
  }
  for (const g of grupos) {
    if (g.length !== colunas) {
      throw new Error(
        `${rotulo}: uma linha tem ${g.length} pose(s), esperava ${colunas}` +
          ' — a arte mudou de layout?',
      );
    }
  }
  return grupos;
}

/**
 * A grade a partir de CORTES MEDIDOS: uma caixa opaca por celula.
 *
 * Uma celula vazia derruba a geracao — folha reexportada com outro layout tem de
 * parar aqui, e nao produzir um gato sem cabeca.
 */
function grade(img, cortesX, cortesY, rotulo) {
  const linhas = [];
  for (let r = 0; r < cortesY.length - 1; r++) {
    const faixa = [];
    for (let c = 0; c < cortesX.length - 1; c++) {
      const x0 = cortesX[c];
      const y0 = cortesY[r];
      const w = cortesX[c + 1] - x0;
      const h = cortesY[r + 1] - y0;
      const caixa = caixaOpaca(img, x0, y0, w, h);
      if (!caixa) throw new Error(`${rotulo}: a celula ${c},${r} esta vazia`);
      faixa.push(caixa);
    }
    linhas.push(faixa);
  }
  return linhas;
}

const saida = {};

for (const [especie, def] of Object.entries(FOLHAS)) {
  const img = lerPng(join(DIR, def.arquivo));
  const linhas = def.cortesX
    ? grade(img, def.cortesX, def.cortesY, def.arquivo)
    : agruparEmGrade(
      blobs(img, def.areaMinima, 16, false),
      def.linhas,
      def.colunas,
      def.arquivo,
    );

  def.nomes.forEach((nome, indiceDaLinha) => {
    const pecas = linhas[indiceDaLinha];
    for (const [rotulo, grade] of [['andando', GRADE(def.poses)], ['parado', GRADE_PARADO(def.poses)]]) {
      // A ESCALA sai da maior caixa entre as poses usadas: assim todas as poses
      // do mesmo bicho ficam na mesma proporcao, e um gato deitado nao vira um
      // gato gigante so por ser mais comprido.
      const usadas = [...new Set(grade.map((g) => g.coluna))];
      const caixas = usadas.map((c) => pecas[c]);
      const maiorW = Math.max(...caixas.map((b) => b.w));
      const maiorH = Math.max(...caixas.map((b) => b.h));
      const escala = Math.min(
        (CELULA.w - MARGEM * 2) / maiorW,
        (CELULA.h - MARGEM * 2) / maiorH,
      );

      const folha = new Img(CELULA.w * 4, CELULA.h * 4);
      let alturaConteudo = 0;
      grade.forEach((celula, indice) => {
        const b = pecas[celula.coluna];
        const w = Math.max(1, Math.round(b.w * escala));
        const h = Math.max(1, Math.round(b.h * escala));
        alturaConteudo = Math.max(alturaConteudo, h);
        const px = reduzirPara(img, b, w, h);
        if (celula.flipX) {
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < Math.floor(w / 2); x++) {
              const e = y * w + x;
              const d = y * w + (w - x - 1);
              [px[e], px[d]] = [px[d], px[e]];
            }
          }
        }
        const cx = (indice % 4) * CELULA.w + Math.round((CELULA.w - w) / 2);
        const cy = Math.floor(indice / 4) * CELULA.h + CELULA.h - MARGEM - h;
        colarRet(folha, px, w, h, cx, cy);
      });

      const arquivo = `pet_${nome}_${rotulo}_runtime.png`;
      writeFileSync(join(DIR, arquivo), folha.png());
      if (rotulo === 'andando') {
        saida[nome] = { especie, arquivo, alturaConteudo, celula: CELULA };
      }
    }
    console.log(`[pet] ${def.arquivo} linha ${indiceDaLinha} -> pet_${nome}_*_runtime.png`);
  });
}

writeFileSync(join(DIR, 'pets.json'), JSON.stringify(saida, null, 1));
console.log(`[pet] ${Object.keys(saida).length} bicho(s) processado(s) -> pets.json`);

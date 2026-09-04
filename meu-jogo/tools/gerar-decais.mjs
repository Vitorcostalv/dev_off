/**
 * OS DECAIS DOS ANDARES 51 A 150.
 *
 * Um DECAL e uma marca colada na parede: quadro de aviso, placa de seguranca,
 * desenho de crianca, contagem riscada, marca de mao. Nao e tile e nao entra no
 * `terrain.png` — e sprite, posto por objeto no tilemap, exatamente como a
 * luminaria e o cartaz ja eram.
 *
 * A razao de nao ser tile e a Parte 24: a raridade E o efeito. Um desenho de
 * crianca assado no tileset apareceria em toda parede daquele estilo; posto
 * como objeto, o andar 104 tem UM e o 103 nao tem nenhum, e e isso que faz o
 * primeiro assustar.
 *
 * TODA A ARTE E DAS DUAS FOLHAS DE PAREDE QUE O USUARIO ENTREGOU. Nada aqui e
 * desenhado por codigo:
 *
 *   PAredes_internas_represa_andar_50_100.png   linha 2 — quadros e placas
 *   Paredes_internas_represa_andar_101_150.png  linhas 0, 2, 5 e 7
 *
 * As duas folhas trazem, na linha 0, paineis com A FAIXA DE ANDAR PINTADA
 * ("51-60", "101-110", ...). Eles NAO viram tile de parede: um tile ladrilha, e
 * "71-80" repetido de dois em dois metros vira papel de parede. Viram PLACA —
 * uma por andar, na parede da chegada, dizendo em que faixa o jogador esta.
 *
 *     npm run gerar-decais
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './png.mjs';
import { agruparEmLinhas, blobs, lerPng, removerFundo } from './imagem.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARTE = join(RAIZ, 'arte');
const SPRITES = join(RAIZ, 'public', 'assets', 'sprites');

const FOLHAS = {
  trabalho: {
    arquivo: 'PAredes_internas_represa_andar_50_100.png',
    linhas: 8, areaMinima: 1500, tolerancia: 55,
  },
  infancia: {
    arquivo: 'Paredes_internas_represa_andar_101_150.png',
    linhas: 8, areaMinima: 1500, tolerancia: 55,
  },
};

/**
 * As pecas, por [linha, coluna] na folha.
 *
 * `familia` e o que o registro de andares consulta: um capitulo pede duas
 * marcas de "desenho" e uma de "aviso", e o gerador sorteia dentro da familia.
 * `altura` e a altura desejada em TILES quando o decal e desenhado no mundo —
 * placa de parede e menor que quadro de aviso, e sem isso todos sairiam do
 * mesmo tamanho.
 */
const PECAS = {
  // ------------------------------------------------- placas de faixa (0,2-6) --
  faixa_051_060: { folha: 'trabalho', peca: [0, 2], familia: 'faixa', altura: 2.2 },
  faixa_061_070: { folha: 'trabalho', peca: [0, 3], familia: 'faixa', altura: 2.2 },
  faixa_071_080: { folha: 'trabalho', peca: [0, 4], familia: 'faixa', altura: 2.2 },
  faixa_081_090: { folha: 'trabalho', peca: [0, 5], familia: 'faixa', altura: 2.2 },
  faixa_091_100: { folha: 'trabalho', peca: [0, 6], familia: 'faixa', altura: 2.2 },
  faixa_101_110: { folha: 'infancia', peca: [0, 2], familia: 'faixa', altura: 2.2 },
  faixa_111_120: { folha: 'infancia', peca: [0, 3], familia: 'faixa', altura: 2.2 },
  faixa_121_130: { folha: 'infancia', peca: [0, 4], familia: 'faixa', altura: 2.2 },
  faixa_131_140: { folha: 'infancia', peca: [0, 5], familia: 'faixa', altura: 2.2 },
  faixa_141_150: { folha: 'infancia', peca: [0, 6], familia: 'faixa', altura: 2.2 },

  // ------------------------------------ TRABALHO: quadros e placas (linha 2) --
  quadro_mapa: { folha: 'trabalho', peca: [2, 0], familia: 'quadro', altura: 1.9 },
  quadro_registros: { folha: 'trabalho', peca: [2, 1], familia: 'quadro', altura: 1.9 },
  placa_pressao: { folha: 'trabalho', peca: [2, 2], familia: 'placa', altura: 1.3 },
  placa_contencao: { folha: 'trabalho', peca: [2, 3], familia: 'placa', altura: 1.3 },
  placa_nivel: { folha: 'trabalho', peca: [2, 4], familia: 'placa', altura: 1.3 },
  placa_perigo: { folha: 'trabalho', peca: [2, 5], familia: 'placa', altura: 1.3 },
  placa_silencio: { folha: 'trabalho', peca: [2, 6], familia: 'placa', altura: 1.3 },
  placa_sem_luz: { folha: 'trabalho', peca: [2, 7], familia: 'placa', altura: 1.3 },

  // -------------------------------------------- INFANCIA: o que nao devia ali --
  // desenho: casa com sol, familia de palito, duas criancas de giz
  desenho_casa: { folha: 'infancia', peca: [2, 2], familia: 'desenho', altura: 1.8 },
  desenho_familia: { folha: 'infancia', peca: [2, 3], familia: 'desenho', altura: 1.8 },
  desenho_criancas: { folha: 'infancia', peca: [5, 8], familia: 'desenho', altura: 2.1 },
  // escrita: contagem riscada e a parede dos olhos
  escrita_contagem: { folha: 'infancia', peca: [2, 4], familia: 'escrita', altura: 1.8 },
  escrita_olhos: { folha: 'infancia', peca: [2, 7], familia: 'escrita', altura: 1.8 },
  // aviso escrito A MAO, nao impresso
  aviso_ouve: { folha: 'infancia', peca: [2, 5], familia: 'aviso', altura: 1.8 },
  aviso_saida: { folha: 'infancia', peca: [2, 6], familia: 'aviso', altura: 1.8 },
  aviso_fim: { folha: 'infancia', peca: [7, 6], familia: 'aviso', altura: 2.4 },
  // sangue: DOIS frames, e so. A contencao e a regra (Parte 7)
  sangue_maos: { folha: 'infancia', peca: [5, 7], familia: 'sangue', altura: 2.0 },
  sangue_parede: { folha: 'infancia', peca: [5, 6], familia: 'sangue', altura: 2.0 },
  // quadro de recado da infancia
  quadro_mural: { folha: 'infancia', peca: [2, 0], familia: 'quadro', altura: 1.9 },
};

function carregar(chave) {
  const def = FOLHAS[chave];
  const img = removerFundo(lerPng(join(ARTE, def.arquivo)));
  const linhas = agruparEmLinhas(blobs(img, def.areaMinima, 16, true), def.tolerancia);
  if (linhas.length !== def.linhas) {
    throw new Error(
      `${def.arquivo}: esperava ${def.linhas} linha(s) de peca, achei ${linhas.length}`
      + ' — a arte mudou de layout?',
    );
  }
  return { ...def, chave, img, linhas };
}

const folhas = Object.fromEntries(Object.keys(FOLHAS).map((k) => [k, carregar(k)]));

function pecaDe(nome, def) {
  const f = folhas[def.folha];
  const b = f.linhas[def.peca[0]]?.[def.peca[1]];
  if (!b) {
    const tem = f.linhas[def.peca[0]]?.length ?? 0;
    throw new Error(
      `${nome}: ${f.arquivo} nao tem a peca [${def.peca}] (a linha ${def.peca[0]} tem ${tem})`,
    );
  }
  return b;
}

// ------------------------------------------------------------ empacotamento --
const FOLGA = 2;
const LARGURA_MAXIMA = 2048;

const celulas = Object.entries(PECAS)
  .map(([nome, def]) => ({ nome, def, b: pecaDe(nome, def) }))
  .sort((a, b) => b.b.h - a.b.h || b.b.w - a.b.w);

let x = FOLGA;
let y = FOLGA;
let alturaPrateleira = 0;
let largura = 0;
for (const c of celulas) {
  if (x + c.b.w + FOLGA > LARGURA_MAXIMA) {
    x = FOLGA;
    y += alturaPrateleira + FOLGA;
    alturaPrateleira = 0;
  }
  c.x = x;
  c.y = y;
  x += c.b.w + FOLGA;
  alturaPrateleira = Math.max(alturaPrateleira, c.b.h);
  largura = Math.max(largura, x);
}
const altura = y + alturaPrateleira + FOLGA;

const im = new Img(largura, altura);
for (const c of celulas) {
  const origem = folhas[c.def.folha].img;
  for (const i of c.b.pixels) {
    const px = i % origem.w;
    const py = (i - px) / origem.w;
    const o = i * 4;
    im.set(c.x + (px - c.b.x), c.y + (py - c.b.y), [
      origem.px[o], origem.px[o + 1], origem.px[o + 2], origem.px[o + 3],
    ]);
  }
}

// ------------------------------------------------------------------ saida --
const frames = {};
const meta = {};
for (const c of celulas) {
  frames[c.nome] = {
    frame: { x: c.x, y: c.y, w: c.b.w, h: c.b.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: c.b.w, h: c.b.h },
    sourceSize: { w: c.b.w, h: c.b.h },
  };
  meta[c.nome] = {
    familia: c.def.familia,
    alturaTiles: c.def.altura,
    // proporcao da peca, pra a cena achar a largura sem medir a textura
    proporcao: +(c.b.w / c.b.h).toFixed(4),
  };
}

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  console.log('  ->', caminho.replace(RAIZ, '.'));
}

escrever(join(SPRITES, 'decais.png'), im.png());
escrever(
  join(SPRITES, 'decais.atlas.json'),
  JSON.stringify(
    {
      frames,
      meta: {
        app: 'gerar-decais.mjs',
        image: 'decais.png',
        format: 'RGBA8888',
        size: { w: im.w, h: im.h },
        scale: '1',
      },
    },
    null,
    1,
  ),
);
escrever(join(SPRITES, 'decais.json'), JSON.stringify(meta, null, 1));

const porFamilia = {};
for (const [nome, m] of Object.entries(meta)) (porFamilia[m.familia] ??= []).push(nome);
console.log(
  `pronto. ${celulas.length} decal(is) (${im.w}x${im.h} px) em `
  + `${Object.keys(porFamilia).length} familia(s): `
  + Object.entries(porFamilia).map(([f, l]) => `${f} ${l.length}`).join(', '),
);

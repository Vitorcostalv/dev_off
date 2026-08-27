// Monta o tileset, os atlas de flora e os tilemaps a partir da arte em
// public/assets/sprites. Rode com: npm run gerar-assets
//
// A arte vem em spritesheets grandes (celulas de ~300-600 px). Este script
// detecta a grade de cada folha pelo alfa, reduz as celulas pro tile do mundo
// (T px) e escreve um unico tilesets/terrain.png. Os sprites do player e a
// flora nao entram no tileset: viram atlas carregados a parte.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, colar, colarRet, hash01, ruido } from './png.mjs';
import {
  agruparEmLinhas,
  blobs,
  caixaOpaca,
  celulaQuadrada,
  detectarGrade,
  lerPng,
  pixel as pixelDe,
  reduzir,
  reduzirPara,
} from './imagem.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(RAIZ, 'public', 'assets');
const SPRITES = join(ASSETS, 'sprites'); // servido em runtime
// Arte de origem que o jogo NAO carrega: entra assada no terrain.png ou no
// construcoes.png, entao fica fora de public/ pra nao inflar o build.
const ARTE = join(RAIZ, 'arte');
/** Onde mora a folha: public/ se o jogo a carrega, arte/ se e so fonte. */
const caminhoFolha = (arquivo, runtime) => join(runtime ? SPRITES : ARTE, arquivo);
// Tamanho do tile do mundo, em px. Mudar aqui reprocessa tileset e tilemaps;
// do lado do jogo a FarmScene le o valor do proprio tilemap, entao nao ha
// numero pra sincronizar a mao. Precisa ser multiplo de T_ARTE.
const T = 32;

/** Seed do mundo: fixa, pra mesma geracao sair identica em todo reload. */
const SEMENTE = 20260827;

// ------------------------------------------------------------------ folhas --
/**
 * Cada folha de arte, com a forma esperada da grade.
 *
 * `limiar` sobe na arte esparsa (flora) pra projecao ignorar sujeira de 1-2 px
 * entre as celulas. `inset` e quanto encolher a celula antes de reduzir: a arte
 * tem borda irregular e escura, e incluir essa borda faz o tile virar grade
 * visivel quando repetido. Terreno que repete muito (grama) pede inset
 * generoso. Os dois sao fracoes, entao independem de T.
 */
const FOLHAS = {
  grama: { arquivo: 'Grama.png', cols: 3, rows: 1, limiar: 0, inset: 0.22 },
  // estrada/lago: o inset subiu de 0.05 quando o tile foi pra 32 px. A arte tem
  // franja colorida na beirada de cada celula; em 16 px ela sumia na media do
  // downscale, em 32 resolve como pontinhos claros e o tile vira grade.
  estrada: { arquivo: 'estrada_de_terra.png', cols: 3, rows: 3, limiar: 0, inset: 0.12 },
  lago: { arquivo: 'lago_v1.png', cols: 3, rows: 3, limiar: 0, inset: 0.1 },
  // runtime: o jogo carrega a folha inteira e recorta pelo atlas
  arvores: { arquivo: 'Arvores.png', cols: 6, rows: 3, limiar: 2, runtime: true },
  flores_v1: { arquivo: 'Flores_v1.png', cols: 6, rows: 4, limiar: 2, runtime: true },
  flores_v2: { arquivo: 'Flores_v2.png', cols: 6, rows: 4, limiar: 2, runtime: true },

  // Kit de construcao das casas. O `limiar` de cada uma nao e capricho: em
  // Portas as linhas se tocam na projecao e so separam em 60; em Janelas o
  // limiar baixo junta as duas primeiras linhas (que tem janela alta).
  paredes: { arquivo: 'Paredes_casa_v1.png', cols: 6, rows: 3, limiar: 2 },
  telhados: { arquivo: 'Telhados_v1.png', cols: 6, rows: 3, limiar: 2 },
  portas: { arquivo: 'Portas_v1.png', cols: 4, rows: 5, limiar: 60 },
  janelas: { arquivo: 'Janelas_v1.png', cols: 7, rows: 4, limiar: 12 },
};

/** Le a folha, detecta a grade e confere se bate com o esperado. */
function carregarFolha(chave) {
  const def = FOLHAS[chave];
  const img = lerPng(caminhoFolha(def.arquivo, def.runtime));
  const grade = detectarGrade(img, def.limiar);
  if (grade.cols.length !== def.cols || grade.rows.length !== def.rows) {
    throw new Error(
      `${def.arquivo}: esperava grade ${def.cols}x${def.rows}, ` +
        `detectei ${grade.cols.length}x${grade.rows.length} — a arte mudou?`,
    );
  }
  return { ...def, img, ...grade };
}

const folhas = Object.fromEntries(Object.keys(FOLHAS).map((k) => [k, carregarFolha(k)]));

// ------------------------------------------------------------------ pedras --
/**
 * `pedras.png` e a unica folha sem grade: a metade esquerda traz tiles de piso
 * e um autotile de caminho de pedra (ainda nao usados), e a direita traz pedras
 * soltas espalhadas em posicoes livres. Por isso ela sai por componente conexo
 * em vez de projecao de alfa.
 *
 * `xDecoracao` e a fronteira entre as duas metades: todo bloco de grade comeca
 * antes dela, toda pedra solta comeca depois. E coordenada a mao porque nao ha
 * nada na imagem que separe as duas metades automaticamente — a assercao de
 * quantidade embaixo avisa se a arte mudar de layout.
 */
// pedras.png e a unica folha usada nas DUAS pontas: o calcamento entra assado
// no tileset e as pedras soltas viram atlas carregado em runtime. Por isso ela
// fica em public/ mesmo tendo parte consumida em build.
const PEDRAS = { arquivo: 'pedras.png', xDecoracao: 960, areaMinima: 240, runtime: true };

/** Cor media dos pixels opacos da caixa — usada pra separar pedra de capim. */
function corMedia(img, caixa) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = caixa.y; y < caixa.y + caixa.h; y++) {
    for (let x = caixa.x; x < caixa.x + caixa.w; x++) {
      const [pr, pg, pb, pa] = pixelDe(img, x, y);
      if (pa <= 16) continue;
      r += pr;
      g += pg;
      b += pb;
      n++;
    }
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

/**
 * Pedras soltas, da menor pra maior. Tufos de capim da mesma metade sao
 * descartados pela cor (verde dominante) — sao decoracao de outro tipo.
 */
function carregarPedras() {
  const img = lerPng(caminhoFolha(PEDRAS.arquivo, PEDRAS.runtime));
  const todos = blobs(img, PEDRAS.areaMinima);
  const soltas = todos.filter((b) => b.x >= PEDRAS.xDecoracao);
  const pedras = soltas.filter((b) => {
    const [r, g, bl] = corMedia(img, b);
    return g < r * 1.25 && g < bl * 1.6; // cinza, nao verde
  });
  if (pedras.length < 12) {
    throw new Error(
      `${PEDRAS.arquivo}: achei so ${pedras.length} pedras soltas ` +
        `(de ${soltas.length} blocos a direita de x=${PEDRAS.xDecoracao}) — o layout da arte mudou?`,
    );
  }
  // menor primeiro: o sorteio no mapa puxa pro comeco da lista
  pedras.sort((a, b) => a.area - b.area);

  // Metade esquerda: os blocos quase solidos (fill alto) sao tiles de piso de
  // pedra. A primeira LINHA deles e o calcamento liso; a de baixo e a mesma
  // coisa mas com moldura, que nao serve pra pavimentar area grande.
  const solidos = todos.filter(
    (b) => b.x < PEDRAS.xDecoracao && b.area / (b.w * b.h) > 0.9 && b.w > 100,
  );
  const linhas = agruparEmLinhas(solidos, 80);
  const calcamento = linhas[0] ?? [];
  if (calcamento.length < 3) {
    throw new Error(
      `${PEDRAS.arquivo}: esperava >=3 tiles de calcamento na 1a linha, achei ${calcamento.length}`,
    );
  }

  return { arquivo: PEDRAS.arquivo, img, pedras, calcamento };
}

const folhaPedras = carregarPedras();

/**
 * Escala unica pra folha toda, ancorada na maior pedra: assim as pedras
 * mantem o tamanho relativo entre si em vez de virarem todas do mesmo tamanho.
 */
const ALTURA_MAIOR_PEDRA_TILES = 1.6;
const ESCALA_PEDRA = (() => {
  const maiorAltura = Math.max(...folhaPedras.pedras.map((p) => p.h));
  return (ALTURA_MAIOR_PEDRA_TILES * T) / maiorAltura;
})();
/** Altura da pedra `i` em tiles, com a escala compartilhada. */
const alturaPedraTiles = (i) => +((folhaPedras.pedras[i].h * ESCALA_PEDRA) / T).toFixed(3);

/** Encolhe uma caixa por uma fracao de cada lado — foge da borda escura da arte. */
function encolher(caixa, fracao) {
  const dx = Math.round(caixa.w * fracao);
  const dy = Math.round(caixa.h * fracao);
  return { x: caixa.x + dx, y: caixa.y + dy, w: caixa.w - dx * 2, h: caixa.h - dy * 2 };
}

// --------------------------------------------------------- kit e fachadas --
/** Caixa justa do desenho dentro da celula (c, r) de uma folha com grade. */
function celulaJusta(chave, c, r) {
  const f = folhas[chave];
  const [x0, x1] = f.cols[c];
  const [y0, y1] = f.rows[r];
  const caixa = caixaOpaca(f.img, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 16);
  if (!caixa) throw new Error(`${f.arquivo}: celula (${c},${r}) esta vazia`);
  return caixa;
}

/**
 * `Mecado_academia.png` traz as fachadas do mercado e da academia ja montadas,
 * em elevacao frontal — nao ha o que compor, so recortar. Cada uma e o maior
 * blob da sua metade da folha (mercado em cima, academia embaixo).
 */
function carregarFachadasProntas() {
  const img = lerPng(caminhoFolha('Mecado_academia.png', false));
  const todos = blobs(img, 5000);
  const meio = img.h / 2;
  const maiorEm = (filtro, rotulo) => {
    const c = todos.filter(filtro)[0];
    if (!c) throw new Error(`Mecado_academia.png: nao achei a fachada do ${rotulo}`);
    return c;
  };
  return {
    arquivo: 'Mecado_academia.png',
    img,
    mercado: maiorEm((b) => b.y + b.h / 2 < meio, 'mercado'),
    academia: maiorEm((b) => b.y + b.h / 2 >= meio, 'academia'),
  };
}

const fachadasProntas = carregarFachadasProntas();

/**
 * Folhas de utensilio (mercado e academia). Nao tem grade: a arte esta
 * espalhada, entao sai por componente conexo agrupado em LINHAS. Uma peca e
 * identificada por [linha, indice na linha], o que sobrevive a arte ganhar ou
 * perder um item no meio de uma linha melhor do que um indice global.
 *
 * `larguraReferencia` e a largura, em tiles, que a peca `referencia` deve ter.
 * Dela sai uma escala unica pra folha toda, entao as pecas mantem o tamanho
 * relativo entre si — mesma ideia usada nas pedras.
 */
const UTENSILIOS = {
  mercado: {
    arquivo: 'Utensilios_mercado.png',
    areaMinima: 900,
    tolerancia: 70,
    linhas: 6,
    runtime: true,
    referencia: [2, 0], // gondola de hortifruti
    larguraReferencia: 2,
  },
  academia: {
    arquivo: 'Utensilios_academia.png',
    areaMinima: 900,
    tolerancia: 70,
    linhas: 7,
    runtime: true,
    referencia: [2, 0], // aparelho grande
    larguraReferencia: 2.2,
  },
};

function carregarUtensilios(chave) {
  const def = UTENSILIOS[chave];
  const img = lerPng(caminhoFolha(def.arquivo, def.runtime));
  const linhas = agruparEmLinhas(blobs(img, def.areaMinima), def.tolerancia);
  if (linhas.length !== def.linhas) {
    throw new Error(
      `${def.arquivo}: esperava ${def.linhas} linhas de utensilio, achei ${linhas.length}` +
        ` — a arte mudou de layout?`,
    );
  }
  const [lr, ir] = def.referencia;
  const ref = linhas[lr]?.[ir];
  if (!ref) throw new Error(`${def.arquivo}: peca de referencia [${lr},${ir}] nao existe`);
  const escala = (def.larguraReferencia * T) / ref.w;
  return { ...def, img, linhas, escala };
}

const utensilios = Object.fromEntries(
  Object.keys(UTENSILIOS).map((k) => [k, carregarUtensilios(k)]),
);

/** Uma peca de utensilio pelo par [linha, indice]. */
function peca(chave, linha, indice) {
  const u = utensilios[chave];
  const b = u.linhas[linha]?.[indice];
  if (!b) throw new Error(`${u.arquivo}: nao existe peca [${linha},${indice}]`);
  return b;
}

/** Nome do frame de uma peca no atlas de moveis. */
const nomePeca = (linha, indice) => `movel_${linha}_${indice}`;

/** Atlas de utensilios: um frame por peca, apontando pro PNG original. */
function gerarAtlasUtensilios(chave) {
  const u = utensilios[chave];
  const frames = {};
  u.linhas.forEach((linha, li) => {
    linha.forEach((b, i) => {
      frames[nomePeca(li, i)] = {
        frame: { x: b.x, y: b.y, w: b.w, h: b.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: b.w, h: b.h },
        sourceSize: { w: b.w, h: b.h },
      };
    });
  });
  return escreverAtlas(`moveis_${chave}`, u, frames);
}

/** Tile de T x T tirado da celula (c, r) de uma folha de terreno. */
function tileDaArte(chave, c, r) {
  const f = folhas[chave];
  return reduzir(f.img, celulaQuadrada(f.cols, f.rows, c, r, f.inset ?? 0.05), T);
}

// -------------------------------------------------------- transformar tile --
const girar = (px) => {
  // 90 graus no sentido do relogio: (i,j) -> (T-1-j, i)
  const out = new Array(T * T);
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) out[i * T + (T - 1 - j)] = px[j * T + i];
  }
  return out;
};
const espelharV = (px) => {
  const out = new Array(T * T);
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) out[(T - 1 - j) * T + i] = px[j * T + i];
  }
  return out;
};
/** As 4 rotacoes de um tile — usadas pra quebrar a repeticao do terreno. */
const rotacoes = (px) => {
  const r1 = girar(px);
  const r2 = girar(r1);
  return [px, r1, r2, girar(r2)];
};
/**
 * As 8 simetrias do quadrado (4 rotacoes + as 4 do espelho). Vale a pena onde
 * a arte tem detalhe grande e reconhecivel — o miolo do lago com vitoria-regia
 * repete de forma obvia em 32 px se so girar.
 */
const simetrias = (px) => [...rotacoes(px), ...rotacoes(espelharV(px))];

// ------------------------------------------------------------ tiles pintados --
// Sobrou arte procedural so pro interior da casa e pra borda, que nao tem
// asset ainda. Os pintores desenham numa grade fixa de T_ARTE px (as
// coordenadas deles sao a mao, tijolo por tijolo) e `pintado` amplia por
// vizinho-mais-proximo ate o tile do mundo. Assim mudar T nao entorta o
// desenho: so deixa o pixel maior, que e o que se quer em pixel art.
const T_ARTE = 16;
if (T % T_ARTE !== 0) throw new Error(`T (${T}) precisa ser multiplo de ${T_ARTE}`);

function salpico(im, ox, semente, cor, corte) {
  for (let y = 0; y < T_ARTE; y++) {
    for (let x = 0; x < T_ARTE; x++) {
      if (ruido(x + ox, y, semente) > corte) im.set(ox + x, y, cor);
    }
  }
}

/** Roda o pintor na grade de arte e amplia pro tile do mundo. */
function pintado(pintar) {
  const im = new Img(T_ARTE, T_ARTE);
  pintar(im, 0, 0);
  const fator = T / T_ARTE;
  const px = new Array(T * T);
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) {
      const o = (Math.floor(j / fator) * T_ARTE + Math.floor(i / fator)) * 4;
      px[j * T + i] = [im.px[o], im.px[o + 1], im.px[o + 2], im.px[o + 3]];
    }
  }
  return px;
}

// ---------------------------------------------------------------- estradas --
// Mascara de conectividade: N=1, E=2, S=4, W=8. A folha traz 9 pecas; as
// mascaras que faltam (Ts girados) saem de rotacao/espelho das que existem.
const ESTRADA_CELULA = {
  0: [0, 0], // terra batida, sem caminho
  10: [1, 0], // EW
  5: [2, 0], // NS
  3: [0, 1], // NE
  6: [1, 1], // ES
  12: [2, 1], // SW
  9: [0, 2], // NW
  14: [1, 2], // ESW (T abrindo pro sul)
  15: [2, 2], // cruzamento
};

/** Tile de estrada pra cada uma das 16 mascaras possiveis. */
function tilesEstrada() {
  const base = {};
  for (const [mascara, [c, r]] of Object.entries(ESTRADA_CELULA)) {
    base[Number(mascara)] = tileDaArte('estrada', c, r);
  }
  // Ts que faltam, derivados do T de mascara 14 (ESW)
  base[11] = espelharV(base[14]); // ENW  (T abrindo pro norte)
  base[13] = girar(base[14]); // NSW  (T abrindo pro oeste)
  base[7] = girar(girar(girar(base[14]))); // NES  (T abrindo pro leste)
  // pontas soltas: reaproveita a reta correspondente
  base[1] = base[5];
  base[4] = base[5];
  base[2] = base[10];
  base[8] = base[10];
  return base;
}

// ------------------------------------------------------------------ tileset --
// A ORDEM desta lista define o GID (indice + 1) e a coluna no PNG.
const estrada = tilesEstrada();

/** As 3 variantes de grama da arte, cada uma nas 4 rotacoes. */
const GRAMA = ['A', 'B', 'C'].flatMap((letra, v) =>
  rotacoes(tileDaArte('grama', v, 0)).map((px, r) => ({ nome: `GRAMA_${letra}${r}`, px })),
);

const TILES = [
  // grama: arte lisa / com florzinhas / com terra, x4 rotacoes cada
  ...GRAMA,

  // terra batida (faixa da via): 4 rotacoes, senao as pedrinhas viram padrao
  ...rotacoes(tileDaArte('estrada', 0, 0)).map((px, r) => ({ nome: `TERRA_${r}`, px })),

  // calcamento da praca, da metade esquerda de pedras.png. Cada variante nas
  // 4 rotacoes: e um piso que cobre area grande, e sem isso vira xadrez.
  ...folhaPedras.calcamento.flatMap((caixa, v) =>
    rotacoes(reduzir(folhaPedras.img, encolher(caixa, 0.1), T)).map((px, r) => ({
      nome: `CALCADA_${v}${r}`,
      px,
    })),
  ),

  // estrada: um tile por mascara de conectividade
  ...Array.from({ length: 16 }, (_, m) => ({ nome: `ESTRADA_${m}`, px: estrada[m] })),

  // lago: 9-slice (canto/borda/centro). Tudo colide: e corpo de agua.
  ...[
    ['AGUA_NO', 0, 0],
    ['AGUA_N', 1, 0],
    ['AGUA_NE', 2, 0],
    ['AGUA_O', 0, 1],
    ['AGUA_L', 2, 1],
    ['AGUA_SO', 0, 2],
    ['AGUA_S', 1, 2],
    ['AGUA_SE', 2, 2],
  ].map(([nome, c, r]) => ({ nome, colide: true, px: tileDaArte('lago', c, r) })),
  // miolo do lago nas 8 simetrias: sem isso as vitorias-regias viram xadrez
  ...simetrias(tileDaArte('lago', 1, 1)).map((px, r) => ({
    nome: `AGUA_C${r}`,
    colide: true,
    px,
  })),

  // borda do mundo: mata fechada. Colide e some no meio da linha de arvores,
  // em vez de virar um muro cinza brigando com a arte.
  {
    nome: 'MATO',
    colide: true,
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [28, 62, 34]);
      salpico(im, ox, s, [38, 80, 44], 0.6);
      salpico(im, ox, s + 3, [20, 48, 28], 0.75);
    }),
  },
  // interior da casa: ainda sem arte, segue pintado
  // piso de interior comercial: ladrilho claro com rejunte. As fachadas do
  // mercado e da academia sao modernas, entao paralelepipedo ficaria estranho.
  {
    nome: 'PISO',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [206, 206, 198]);
      salpico(im, ox, s, [216, 216, 208], 0.8);
      im.rect(ox, 0, T_ARTE, 1, [176, 176, 170]); // rejunte
      im.rect(ox, 0, 1, T_ARTE, [176, 176, 170]);
      im.rect(ox + 8, 0, 1, T_ARTE, [190, 190, 184]);
      im.rect(ox, 8, T_ARTE, 1, [190, 190, 184]);
    }),
  },
  {
    nome: 'MADEIRA',
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [156, 116, 74]);
      for (let y = 3; y < T_ARTE; y += 4) im.rect(ox, y, T_ARTE, 1, [128, 92, 58]);
      im.rect(ox + 7, 0, 1, 3, [128, 92, 58]);
      im.rect(ox + 3, 4, 1, 3, [128, 92, 58]);
      im.rect(ox + 11, 8, 1, 3, [128, 92, 58]);
      im.rect(ox + 5, 12, 1, 3, [128, 92, 58]);
    }),
  },
  {
    nome: 'PAREDE',
    colide: true,
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [102, 80, 64]);
      for (let y = 0; y < T_ARTE; y += 4) {
        im.rect(ox, y, T_ARTE, 1, [78, 60, 48]);
        const desloc = (y / 4) % 2 === 0 ? 0 : 8;
        im.rect(ox + desloc, y, 1, 4, [78, 60, 48]);
        im.rect(ox + ((desloc + 8) % 16), y, 1, 4, [78, 60, 48]);
      }
    }),
  },
  {
    nome: 'PORTA',
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [78, 60, 48]);
      im.rect(ox + 2, 1, 12, 15, [122, 82, 50]);
      im.rect(ox + 2, 1, 12, 1, [148, 106, 68]);
      im.rect(ox + 7, 1, 1, 15, [96, 64, 40]);
      im.rect(ox + 11, 8, 2, 2, [226, 196, 108]); // macaneta
    }),
  },
  {
    nome: 'TAPETE',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [168, 72, 84]);
      im.rect(ox, 0, T_ARTE, 1, [212, 168, 96]);
      im.rect(ox, T_ARTE - 1, T_ARTE, 1, [212, 168, 96]);
      salpico(im, ox, s, [190, 96, 106], 0.9);
    }),
  },
  {
    nome: 'CAMA_TOPO',
    colide: true,
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [122, 82, 50]);
      im.rect(ox + 1, 1, 14, 14, [232, 228, 216]);
      im.rect(ox + 3, 3, 10, 6, [246, 246, 240]);
      im.rect(ox + 1, 12, 14, 3, [200, 84, 96]);
    }),
  },
  {
    nome: 'CAMA_BASE',
    colide: true,
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [122, 82, 50]);
      im.rect(ox + 1, 0, 14, 14, [200, 84, 96]);
      im.rect(ox + 1, 3, 14, 1, [226, 128, 136]);
      im.rect(ox + 1, 8, 14, 1, [226, 128, 136]);
    }),
  },
];

/** NOME -> gid (1-based, como o Tiled grava nas camadas de tile). */
const GID = Object.fromEntries(TILES.map((t, i) => [t.nome, i + 1]));
/** ids 0-based dos tiles que travam o player (formato de `tileset.tiles`). */
const COLIDEM = TILES.flatMap((t, i) => (t.colide ? [i] : []));

/** gid da estrada para uma mascara de conectividade. */
const gidEstrada = (mascara) => GID[`ESTRADA_${mascara}`];
/** 9-slice do lago; o centro (null) sai do material 'agua_centro' com rotacao. */
const GID_AGUA = [
  [GID.AGUA_NO, GID.AGUA_N, GID.AGUA_NE],
  [GID.AGUA_O, null, GID.AGUA_L],
  [GID.AGUA_SO, GID.AGUA_S, GID.AGUA_SE],
];

// ---------------------------------------------------------------- terreno --
// Indirecao entre "material logico" e GID real: trocar a arte de terreno e
// mexer aqui, nao no desenho do mapa.
// O peso de cada arte de grama (6:2:1) e dividido igualmente entre as suas 4
// rotacoes, entao a proporcao entre as artes se mantem.
const MATERIAIS = {
  grama: [
    ['A', 6],
    ['B', 2],
    ['C', 1],
  ].flatMap(([letra, peso]) => [0, 1, 2, 3].map((r) => ({ gid: GID[`GRAMA_${letra}${r}`], peso }))),
  terra: [0, 1, 2, 3].map((r) => ({ gid: GID[`TERRA_${r}`], peso: 1 })),
  // As 4 artes de calcamento tem tons bem diferentes (cinza, bege, e as duas
  // com musgo). Peso igual deixa a praca remendada, entao o cinza domina e o
  // resto entra como variacao. A ordem vem da folha, esquerda pra direita.
  calcada: folhaPedras.calcamento.flatMap((_, v) =>
    [0, 1, 2, 3].map((r) => ({
      gid: GID[`CALCADA_${v}${r}`],
      peso: [10, 1, 4, 1][v] ?? 1,
    })),
  ),
  agua_centro: [0, 1, 2, 3, 4, 5, 6, 7].map((r) => ({ gid: GID[`AGUA_C${r}`], peso: 1 })),
  madeira: [{ gid: GID.MADEIRA, peso: 1 }],
  tapete: [{ gid: GID.TAPETE, peso: 1 }],
};

/**
 * Sorteia a variante do material pela posicao do tile. Deterministico: a
 * mesma (x, y, semente) devolve sempre o mesmo gid, entao o mapa nao muda
 * a cada `npm run gerar-assets` nem a cada reload da pagina.
 */
function variante(material, x, y, semente = SEMENTE) {
  const opcoes = MATERIAIS[material];
  if (!opcoes) throw new Error(`material desconhecido: "${material}"`);
  if (opcoes.length === 1) return opcoes[0].gid;

  const total = opcoes.reduce((soma, o) => soma + o.peso, 0);
  let corte = hash01(x, y, semente) * total;
  for (const o of opcoes) {
    corte -= o.peso;
    if (corte < 0) return o.gid;
  }
  return opcoes[opcoes.length - 1].gid;
}

/** Pincel de material: usa direto em Grade#rect / Grade#moldura. */
const de = (material) => (x, y) => variante(material, x, y);

// ------------------------------------------------------------------ grade --
/** Camada de tiles como grade mutavel; `dados()` sai no formato do Tiled. */
class Grade {
  constructor(w, h, preencher = 0) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(preencher);
  }
  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x, y) {
    return this.dentro(x, y) ? this.px[y * this.w + x] : 0;
  }
  set(x, y, gid) {
    if (this.dentro(x, y)) this.px[y * this.w + x] = gid;
  }
  /** `pincel` pode ser um gid fixo ou uma funcao (x, y) => gid. */
  rect(x0, y0, w, h, pincel) {
    const f = typeof pincel === 'function' ? pincel : () => pincel;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) this.set(x, y, f(x, y));
    }
  }
  moldura(pincel) {
    this.rect(0, 0, this.w, 1, pincel);
    this.rect(0, this.h - 1, this.w, 1, pincel);
    this.rect(0, 0, 1, this.h, pincel);
    this.rect(this.w - 1, 0, 1, this.h, pincel);
  }
  dados() {
    return this.px;
  }
}

// ------------------------------------------------------- planta da cidade --
// Tudo em TILES. Mexer aqui e o jeito de reorganizar a cidade.
const FAZENDA = { largura: 120, altura: 90 };

/**
 * Malha viaria. Cada via e um segmento reto definido pelo EIXO (w ou h = 1);
 * `largura` diz quantos tiles a faixa de terra batida ocupa no total.
 *
 * A arte da estrada traz a trilha clara no meio de um tile de terra, entao a
 * via se monta em duas passadas: a faixa inteira de terra, e a trilha clara
 * so no eixo, com o tile escolhido pela conectividade (autotile). Da um
 * caminho de terra largo com a trilha gasta no meio, em vez de uma fita de
 * 1 tile mais estreita que o proprio player.
 */
const LARGURA_VIA = 3;
const VIAS = [
  { nome: 'avenida_h', x: 3, y: 45, w: 114, h: 1 },
  { nome: 'avenida_v', x: 60, y: 3, w: 1, h: 84 },
  { nome: 'anel_norte', x: 22, y: 20, w: 78, h: 1 },
  { nome: 'anel_sul', x: 22, y: 71, w: 78, h: 1 },
  { nome: 'anel_oeste', x: 22, y: 20, w: 1, h: 52 },
  { nome: 'anel_leste', x: 99, y: 20, w: 1, h: 52 },
];

/** A faixa de terra da via: o eixo alargado perpendicularmente. */
function faixaDaVia(v, largura = LARGURA_VIA) {
  const r = (largura - 1) >> 1;
  return v.h === 1
    ? { x: v.x, y: v.y - r, w: v.w, h: largura }
    : { x: v.x - r, y: v.y, w: largura, h: v.h };
}

/**
 * Areas reservadas pros predios da proxima etapa. Vao numa camada de OBJETOS
 * separada ('zonas'): sem tile, sem colisao, so demarcacao.
 */
// Os 9 lotes. Quem esta construido e o que tem interior sai de `CONSTRUCOES` /
// `PRACAS` mais abaixo — aqui fica so a geometria do loteamento.
const ZONAS = [
  { nome: 'casa_1', classe: 'casa', x: 28, y: 12, w: 8, h: 6 },
  { nome: 'casa_2', classe: 'casa', x: 40, y: 12, w: 8, h: 6 },
  { nome: 'casa_3', classe: 'casa', x: 72, y: 12, w: 8, h: 6 },
  { nome: 'casa_4', classe: 'casa', x: 84, y: 12, w: 8, h: 6 },
  { nome: 'casa_5', classe: 'casa', x: 28, y: 75, w: 8, h: 6 },
  { nome: 'casa_6', classe: 'casa', x: 40, y: 75, w: 8, h: 6 },
  { nome: 'mercado', classe: 'mercado', x: 64, y: 50, w: 12, h: 8 },
  { nome: 'academia', classe: 'academia', x: 48, y: 30, w: 10, h: 8 },
  { nome: 'parque', classe: 'parque', x: 28, y: 48, w: 20, h: 14 },
];

/** Lago: retangulo, que e o que um 9-slice sem cantos internos aceita. */
const LAGO = { x: 104, y: 49, w: 11, h: 9 };

/** Acha uma zona pelo nome; erra alto se o nome nao existir mais. */
function zona(nome) {
  const z = ZONAS.find((x) => x.nome === nome);
  if (!z) throw new Error(`zona "${nome}" nao existe em ZONAS`);
  return z;
}

// ----------------------------------------------------------- construcoes --
/**
 * Estilos de casa: cada um combina parede, telhado, porta e janela do kit.
 * `parede`/`janela` sao [coluna, linha] da folha; `telhado` e a linha (a coluna
 * 0 e a unica laje aproveitavel — o resto da folha e cumeeira, chamine e
 * lucarna, pecas cujo encaixe nao da pra inferir com seguranca).
 */
const ESTILOS_CASA = [
  { parede: [0, 0], telhado: 0, porta: 0, janela: [0, 2] }, // reboco + telha de barro
  { parede: [1, 0], telhado: 1, porta: 2, janela: [2, 2] }, // reboco rachado + madeira
  { parede: [0, 1], telhado: 0, porta: 3, janela: [0, 3] }, // tijolo + telha de barro
  { parede: [4, 1], telhado: 1, porta: 2, janela: [4, 2] }, // tijolo claro + madeira
  { parede: [0, 2], telhado: 2, porta: 1, janela: [0, 2] }, // tabua azul + ardosia
  { parede: [2, 2], telhado: 2, porta: 1, janela: [2, 3] }, // tabua verde + ardosia
];

/** Altura do sprite acima da pegada, em tiles: o telhado sobe alem do que colide. */
const SOBRA_TELHADO = 0.7;

/**
 * Uma construcao por lote. `pegada` e o retangulo em TILES que ela ocupa e que
 * colide; a posicao sai do lote (centrada, encostada no topo), entao mover o
 * lote leva a construcao junto.
 *
 * A porta fica no meio da parede de BAIXO em todas. A arte e elevacao frontal
 * (parede com alicerce embaixo, porta vista de frente), entao a fachada olha
 * pro sul e a porta tem de acompanhar. Nas casas ao sul do anel (casa_5/casa_6)
 * isso deixa a porta virada pro lado oposto da via — o jogador entra pelas
 * laterais do lote, e o flood-fill confere que da.
 */
const CONSTRUCOES = {
  casa_1: { pegada: { w: 5, h: 4 }, interior: 'casa_1', estilo: 0 },
  casa_2: { pegada: { w: 5, h: 4 }, interior: 'casa_2', estilo: 1 },
  casa_3: { pegada: { w: 5, h: 4 }, interior: 'casa_3', estilo: 2 },
  casa_4: { pegada: { w: 5, h: 4 }, interior: 'casa_4', estilo: 3 },
  casa_5: { pegada: { w: 5, h: 4 }, interior: 'casa_5', estilo: 4 },
  casa_6: { pegada: { w: 5, h: 4 }, interior: 'casa_6', estilo: 5 },
  mercado: { pegada: { w: 8, h: 5 }, interior: 'mercado', fachada: 'mercado' },
  academia: { pegada: { w: 8, h: 5 }, interior: 'academia', fachada: 'academia' },
};

/** Lotes que sao area externa: praca, sem predio e sem interior. */
const PRACAS = { parque: true };

/**
 * A praca do parque: um retangulo calcado no meio do lote, mais uma calcada de
 * 2 tiles ligando ela a avenida. O resto do lote fica livre pra vegetacao — a
 * mesma distribuicao deterministica das arvores/flores do resto do mapa.
 *
 * Sem banco nem chafariz: nao ha asset pra isso, e inventar peca procedural
 * aqui destoaria do resto (as folhas de mercado/academia tem banco, se um dia
 * fizer sentido puxar de la).
 */
const PRACA = (() => {
  const z = zona('parque');
  const w = 10;
  const h = 6;
  const x = z.x + Math.floor((z.w - w) / 2);
  const y = z.y + Math.floor((z.h - h) / 2);
  // a calcada sobe pela avenida horizontal, que e a via mais perto ao norte
  const avenida = VIAS.find((v) => v.nome === 'avenida_h');
  if (!avenida) throw new Error('a praca depende da via "avenida_h"');
  const faixa = faixaDaVia(avenida);
  return {
    x,
    y,
    w,
    h,
    calcada: { x: x + Math.floor(w / 2) - 1, w: 2, y0: faixa.y + faixa.h, y1: y - 1 },
  };
})();

/** Todos os tiles calcados da praca (piso + calcada de ligacao). */
function tilesDaPraca() {
  const lista = [];
  for (let j = PRACA.y; j < PRACA.y + PRACA.h; j++) {
    for (let i = PRACA.x; i < PRACA.x + PRACA.w; i++) lista.push([i, j]);
  }
  const c = PRACA.calcada;
  for (let j = c.y0; j <= c.y1; j++) {
    for (let i = c.x; i < c.x + c.w; i++) lista.push([i, j]);
  }
  return lista;
}

/** Pinta a praca na camada de caminhos (nao colide: e piso). */
function pavimentarPraca(caminhos) {
  for (const [x, y] of tilesDaPraca()) caminhos.set(x, y, variante('calcada', x, y));
}

/** Resolve a construcao de um lote em coordenadas de tile. */
function construcaoDe(nome) {
  const def = CONSTRUCOES[nome];
  const z = zona(nome);
  const { w, h } = def.pegada;
  if (w > z.w || h > z.h) throw new Error(`a construcao de "${nome}" nao cabe no lote`);
  const x = z.x + Math.floor((z.w - w) / 2);
  const y = z.y;
  const portaX = x + Math.floor(w / 2);
  const portaY = y + h - 1;
  return { nome, ...def, x, y, w, h, portaX, portaY, frente: { x: portaX, y: portaY + 1 } };
}

const CONSTRUIDAS = Object.keys(CONSTRUCOES).map(construcaoDe);

/**
 * Compoe a fachada de uma casa: laje de telhado repetida no alto, parede
 * repetida embaixo, porta centrada no rodape e uma janela ao lado. Sai como um
 * retangulo de `larguraPx` x `alturaPx` pronto pra virar frame de atlas.
 *
 * Repete as pecas em vez de esticar: esticar a laje deformaria a telha. Cada
 * peca e escalada pela ALTURA da faixa e repetida na horizontal ate cobrir.
 */
function comporCasa(estilo, larguraPx, alturaPx) {
  const im = new Img(larguraPx, alturaPx);
  const beiral = Math.max(2, Math.round(larguraPx * 0.03)); // avanco do telhado
  const alturaTelhado = Math.round(alturaPx * 0.44);
  const alturaParede = alturaPx - alturaTelhado;

  /** Repete a peca na horizontal, escalada pela altura da faixa. */
  const faixa = (folha, caixa, esquerda, largura, topo, altura) => {
    const passo = Math.max(1, Math.round(caixa.w * (altura / caixa.h)));
    const px = reduzirPara(folhas[folha].img, caixa, passo, altura);
    for (let dx = esquerda; dx < esquerda + largura; dx += passo) {
      colarRet(im, px, passo, altura, dx, topo);
    }
  };

  // parede primeiro; o telhado entra por cima com avanco dos dois lados
  faixa(
    'paredes',
    celulaJusta('paredes', ...estilo.parede),
    0,
    larguraPx,
    alturaTelhado,
    alturaParede,
  );

  // janelas: uma de cada lado da porta, simetricas
  const cJanela = celulaJusta('janelas', ...estilo.janela);
  const alturaJanela = Math.round(alturaParede * 0.4);
  const larguraJanela = Math.max(1, Math.round(cJanela.w * (alturaJanela / cJanela.h)));
  const pxJanela = reduzirPara(folhas.janelas.img, cJanela, larguraJanela, alturaJanela);
  const topoJanela = alturaTelhado + Math.round(alturaParede * 0.14);
  const margemJanela = Math.round(larguraPx * 0.08);
  colarRet(im, pxJanela, larguraJanela, alturaJanela, margemJanela, topoJanela);
  colarRet(
    im,
    pxJanela,
    larguraJanela,
    alturaJanela,
    larguraPx - margemJanela - larguraJanela,
    topoJanela,
  );

  // porta: encostada no rodape, centrada. Cobre o alicerce da parede ali, o
  // que e o certo — a arte da porta ja traz a propria base de pedra.
  const cPorta = celulaJusta('portas', 0, estilo.porta);
  const larguraPorta = Math.round(larguraPx * 0.28);
  const alturaPorta = Math.min(
    alturaParede,
    Math.max(1, Math.round(cPorta.h * (larguraPorta / cPorta.w))),
  );
  colarRet(
    im,
    reduzirPara(folhas.portas.img, cPorta, larguraPorta, alturaPorta),
    larguraPorta,
    alturaPorta,
    Math.round((larguraPx - larguraPorta) / 2),
    alturaPx - alturaPorta,
  );

  // telhado por ultimo, com beiral avancando alem da parede, e uma linha
  // escura embaixo fazendo a sombra do beiral — e o que tira o aspecto de
  // "textura colada" e faz a casa ler como volume.
  faixa(
    'telhados',
    celulaJusta('telhados', 0, estilo.telhado),
    0,
    larguraPx,
    0,
    alturaTelhado,
  );
  const sombra = Math.max(1, Math.round(alturaPx * 0.015));
  for (let y = alturaTelhado; y < alturaTelhado + sombra; y++) {
    for (let x = 0; x < larguraPx; x++) im.set(x, y, [38, 26, 20, 170]);
  }
  // recorta os cantos do beiral pra ele nao virar um bloco reto
  for (let y = 0; y < alturaTelhado; y++) {
    const recuo = Math.round(beiral * (1 - y / alturaTelhado));
    for (let d = 0; d < recuo; d++) {
      im.set(d, y, [0, 0, 0, 0]);
      im.set(larguraPx - 1 - d, y, [0, 0, 0, 0]);
    }
  }

  return im;
}

/**
 * Monta `construcoes.png`: um frame por lote construido, com o nome do lote.
 * O jogo so posiciona o sprite — todo o dimensionamento mora aqui.
 */
function gerarConstrucoes() {
  const pecas = CONSTRUIDAS.map((c) => {
    const larguraPx = c.w * T;
    const alturaPx = Math.round((c.h + SOBRA_TELHADO) * T);
    if (c.fachada) {
      // fachada pronta: so escala pra largura da pegada, mantendo a proporcao
      const caixa = fachadasProntas[c.fachada];
      const altura = Math.max(1, Math.round(caixa.h * (larguraPx / caixa.w)));
      const px = reduzirPara(fachadasProntas.img, caixa, larguraPx, altura);
      const im = new Img(larguraPx, altura);
      colarRet(im, px, larguraPx, altura, 0, 0);
      return { nome: c.nome, im };
    }
    return { nome: c.nome, im: comporCasa(ESTILOS_CASA[c.estilo], larguraPx, alturaPx) };
  });

  const largura = pecas.reduce((s, p) => s + p.im.w, 0);
  const altura = Math.max(...pecas.map((p) => p.im.h));
  const folha = new Img(largura, altura);
  const frames = {};
  let ox = 0;
  for (const p of pecas) {
    for (let y = 0; y < p.im.h; y++) {
      for (let x = 0; x < p.im.w; x++) {
        const o = (y * p.im.w + x) * 4;
        if (p.im.px[o + 3] < 8) continue;
        folha.set(ox + x, y, [p.im.px[o], p.im.px[o + 1], p.im.px[o + 2], p.im.px[o + 3]]);
      }
    }
    frames[p.nome] = {
      frame: { x: ox, y: 0, w: p.im.w, h: p.im.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.im.w, h: p.im.h },
      sourceSize: { w: p.im.w, h: p.im.h },
    };
    ox += p.im.w;
  }
  escrever(join(SPRITES, 'construcoes.png'), folha.png());
  escreverAtlas('construcoes', { arquivo: 'construcoes.png', img: folha }, frames);
  return frames;
}

/** Acha a construcao de um lote; erra alto se o lote nao tiver uma. */
function construcao(nome) {
  const c = CONSTRUIDAS.find((x) => x.nome === nome);
  if (!c) throw new Error(`lote "${nome}" nao tem construcao em CONSTRUCOES`);
  return c;
}

/** Tile onde o player nasce: centro do mapa, em cima do cruzamento. */
const CENTRO = { x: 60, y: 45 };

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  console.log('  ->', caminho.replace(RAIZ, '.'));
}

function gerarTileset() {
  const im = new Img(T * TILES.length, T);
  TILES.forEach((tile, i) => colar(im, tile.px, T, i * T, 0));
  escrever(join(ASSETS, 'tilesets', 'terrain.png'), im.png());
  return { largura: im.w, altura: im.h, colunas: TILES.length, total: TILES.length };
}

// -------------------------------------------------------------- atlas flora --
/**
 * Atlas no formato JSON Hash do Phaser, apontando pro PNG original (sem
 * reduzir): o jogo escala o sprite em tempo de execucao. Cada frame e a caixa
 * justa do desenho, entao a base do tronco/haste fica no rodape do frame.
 */
function gerarAtlas(chave, nomeFrame) {
  const f = folhas[chave];
  const frames = {};
  for (let r = 0; r < f.rows.length; r++) {
    for (let c = 0; c < f.cols.length; c++) {
      const [x0, x1] = f.cols[c];
      const [y0, y1] = f.rows[r];
      const caixa = caixaOpaca(f.img, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 16);
      if (!caixa) continue;
      frames[nomeFrame(c, r)] = {
        frame: { x: caixa.x, y: caixa.y, w: caixa.w, h: caixa.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: caixa.w, h: caixa.h },
        sourceSize: { w: caixa.w, h: caixa.h },
      };
    }
  }
  return escreverAtlas(chave, f, frames);
}

/** Grava o atlas e devolve os frames. */
function escreverAtlas(chave, f, frames) {
  const json = {
    frames,
    meta: {
      app: 'gerar-assets.mjs',
      image: f.arquivo,
      format: 'RGBA8888',
      size: { w: f.img.w, h: f.img.h },
      scale: '1',
    },
  };
  escrever(join(SPRITES, `${chave}.atlas.json`), JSON.stringify(json, null, 1));
  return frames;
}

/** Atlas das pedras soltas: um frame por blob, na ordem do menor pro maior. */
function gerarAtlasPedras() {
  const frames = {};
  folhaPedras.pedras.forEach((p, i) => {
    frames[`pedra_${i}`] = {
      frame: { x: p.x, y: p.y, w: p.w, h: p.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
      sourceSize: { w: p.w, h: p.h },
    };
  });
  return escreverAtlas('pedras', folhaPedras, frames);
}

// ---------------------------------------------------------------- tilemaps --
let proximoIdObjeto = 1;

/** Tipo da propriedade no formato do Tiled (float x int importa pra ele). */
function tipoTiled(value) {
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
  return 'string';
}

/** Objeto do Tiled em coordenadas de TILE; `tw`/`th` tambem em tiles. */
function objeto(nome, classe, tx, ty, props, tw = 1, th = 1) {
  return {
    class: classe,
    type: classe, // Tiled <1.9 grava 'type'; lemos os dois no jogo
    height: th * T,
    width: tw * T,
    id: proximoIdObjeto++,
    name: nome,
    rotation: 0,
    visible: true,
    x: tx * T,
    y: ty * T,
    properties: Object.entries(props || {}).map(([name, value]) => ({
      name,
      type: tipoTiled(value),
      value,
    })),
  };
}

/** Objeto pontual (ponto exato em px, nao alinhado ao tile) — usado na flora. */
function ponto(nome, classe, px, py, props) {
  return {
    class: classe,
    type: classe,
    height: 0,
    width: 0,
    point: true,
    id: proximoIdObjeto++,
    name: nome,
    rotation: 0,
    visible: true,
    x: Math.round(px),
    y: Math.round(py),
    properties: Object.entries(props || {}).map(([name, value]) => ({
      name,
      type: tipoTiled(value),
      value,
    })),
  };
}

function camadaTiles(nome, id, grade) {
  return {
    data: grade.dados(),
    height: grade.h,
    id,
    name: nome,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: grade.w,
    x: 0,
    y: 0,
  };
}

function camadaObjetos(nome, id, objetos) {
  return {
    draworder: 'topdown',
    id,
    name: nome,
    objects: objetos,
    opacity: 1,
    type: 'objectgroup',
    visible: true,
    x: 0,
    y: 0,
  };
}

function montarMapa(largura, altura, camadas, ts) {
  return {
    compressionlevel: -1,
    width: largura,
    height: altura,
    tilewidth: T,
    tileheight: T,
    infinite: false,
    nextlayerid: camadas.length + 1,
    nextobjectid: proximoIdObjeto,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    type: 'map',
    version: '1.10',
    layers: camadas,
    tilesets: [
      {
        columns: ts.colunas,
        firstgid: 1,
        image: '../tilesets/terrain.png',
        imagewidth: ts.largura,
        imageheight: ts.altura,
        margin: 0,
        spacing: 0,
        name: 'terrain',
        tilecount: ts.total,
        tilewidth: T,
        tileheight: T,
        tiles: COLIDEM.map((id) => ({
          id,
          properties: [{ name: 'collides', type: 'bool', value: true }],
        })),
      },
    ],
  };
}

// -------------------------------------------------------------- fazenda --
/** Marca o EIXO das vias, que e o que o autotile precisa. */
function malhaDeVias(W, H) {
  const via = new Grade(W, H, 0);
  for (const v of VIAS) via.rect(v.x, v.y, v.w, v.h, 1);
  return via;
}

/** Marca a FAIXA inteira das vias — o que a flora tem de respeitar. */
function faixasDeVias(W, H) {
  const faixa = new Grade(W, H, 0);
  for (const v of VIAS) {
    const f = faixaDaVia(v);
    faixa.rect(f.x, f.y, f.w, f.h, 1);
  }
  return faixa;
}

/** Pinta a camada de caminhos escolhendo o tile pela conectividade. */
function pintarVias(caminhos, via) {
  for (let y = 0; y < via.h; y++) {
    for (let x = 0; x < via.w; x++) {
      if (!via.get(x, y)) continue;
      const mascara =
        (via.get(x, y - 1) ? 1 : 0) |
        (via.get(x + 1, y) ? 2 : 0) |
        (via.get(x, y + 1) ? 4 : 0) |
        (via.get(x - 1, y) ? 8 : 0);
      caminhos.set(x, y, gidEstrada(mascara));
    }
  }
}

/** Pinta o lago como 9-slice: cada tile escolhe canto/borda/centro. */
function pintarLago(obj, lago) {
  for (let j = 0; j < lago.h; j++) {
    for (let i = 0; i < lago.w; i++) {
      const linha = j === 0 ? 0 : j === lago.h - 1 ? 2 : 1;
      const coluna = i === 0 ? 0 : i === lago.w - 1 ? 2 : 1;
      const x = lago.x + i;
      const y = lago.y + j;
      obj.set(x, y, GID_AGUA[linha][coluna] ?? variante('agua_centro', x, y));
    }
  }
}

// --------------------------------------------------------------- flora --
/** Estagio adulto de cada especie de arvore (coluna da folha Arvores.png). */
const ARVORE_ESTAGIOS = [2, 3, 3, 3, 4]; // pesa o estagio 3 (copa cheia)
/** Colunas de flor em ponto de floracao (as ultimas sao muda e semente). */
const FLOR_ESTAGIOS = [0, 1, 1, 2];

/**
 * Espalha arvores e flores de forma deterministica. Fica fora de via, zona
 * reservada, lago, casinha e do miolo do cruzamento — o resto e mato.
 * Sai numa camada de objetos ('flora'), nao em tiles: arvore precisa ser
 * sprite pra ordenar profundidade com o player e ter copa maior que 1 tile.
 */
function gerarFlora(W, H, via, ocupado) {
  const arvores = [];
  const flores = [];
  const pedras = [];
  const especiesArvore = folhas.arvores.rows.length;
  const totalPedras = folhaPedras.pedras.length;

  const livre = (x, y, folga) => {
    for (let j = -folga; j <= folga; j++) {
      for (let i = -folga; i <= folga; i++) {
        const a = x + i;
        const b = y + j;
        if (a < 1 || b < 1 || a >= W - 1 || b >= H - 1) return false;
        if (via.get(a, b) || ocupado.has(`${a},${b}`)) return false;
      }
    }
    return true;
  };

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      // mais denso perto da borda: fecha o mapa com mata em vez de parede
      const beira = Math.min(x, y, W - 1 - x, H - 1 - y);
      const densidade = beira < 3 ? 0.55 : beira < 9 ? 0.1 : 0.03;

      // folga 1 = nenhuma outra arvore na vizinhanca 3x3, senao vira parede
      if (hash01(x, y, SEMENTE + 101) < densidade && livre(x, y, 1)) {
        const especie = Math.floor(hash01(x, y, SEMENTE + 202) * especiesArvore) % especiesArvore;
        const estagio =
          ARVORE_ESTAGIOS[Math.floor(hash01(x, y, SEMENTE + 303) * ARVORE_ESTAGIOS.length)];
        // desloca dentro do tile pra mata nao virar grade
        const dx = (hash01(x, y, SEMENTE + 404) - 0.5) * T * 0.7;
        const dy = (hash01(x, y, SEMENTE + 505) - 0.5) * T * 0.7;
        arvores.push(
          ponto(`arvore_${arvores.length}`, 'arvore', (x + 0.5) * T + dx, (y + 1) * T + dy, {
            especie,
            estagio,
          }),
        );
        ocupado.add(`${x},${y}`); // reserva o tile: garante o espacamento
        continue; // arvore, pedra e flor nao dividem tile
      }

      if (hash01(x, y, SEMENTE + 121) < 0.028 && livre(x, y, 0)) {
        // sorteio puxado pro comeco da lista (que esta ordenada do menor pro
        // maior): matacao e raro, pedrisco e comum
        const indice = Math.min(
          totalPedras - 1,
          Math.floor(hash01(x, y, SEMENTE + 232) ** 2.2 * totalPedras),
        );
        const dx = (hash01(x, y, SEMENTE + 343) - 0.5) * T * 0.6;
        const dy = (hash01(x, y, SEMENTE + 454) - 0.5) * T * 0.6;
        pedras.push(
          ponto(`pedra_${pedras.length}`, 'pedra', (x + 0.5) * T + dx, (y + 1) * T + dy, {
            indice,
            alturaTiles: alturaPedraTiles(indice),
          }),
        );
        ocupado.add(`${x},${y}`);
        continue;
      }

      if (hash01(x, y, SEMENTE + 606) < 0.03 && livre(x, y, 0)) {
        const folha = hash01(x, y, SEMENTE + 707) < 0.5 ? 'v1' : 'v2';
        const especies = folhas[`flores_${folha}`].rows.length;
        const especie = Math.floor(hash01(x, y, SEMENTE + 808) * especies) % especies;
        const estagio =
          FLOR_ESTAGIOS[Math.floor(hash01(x, y, SEMENTE + 909) * FLOR_ESTAGIOS.length)];
        const dx = (hash01(x, y, SEMENTE + 111) - 0.5) * T * 0.6;
        const dy = (hash01(x, y, SEMENTE + 222) - 0.5) * T * 0.6;
        flores.push(
          ponto(`flor_${flores.length}`, 'flor', (x + 0.5) * T + dx, (y + 1) * T + dy, {
            folha,
            especie,
            estagio,
          }),
        );
      }
    }
  }
  return { arvores, flores, pedras };
}

function gerarFazenda(ts) {
  const { largura: W, altura: H } = FAZENDA;
  const chao = new Grade(W, H);
  const caminhos = new Grade(W, H); // 0 = vazio, entao so a via aparece
  const obj = new Grade(W, H);

  chao.rect(0, 0, W, H, de('grama'));

  // 1a passada: a faixa de terra batida. 2a: a trilha clara no eixo.
  for (const v of VIAS) {
    const faixa = faixaDaVia(v);
    caminhos.rect(faixa.x, faixa.y, faixa.w, faixa.h, de('terra'));
  }
  const via = malhaDeVias(W, H);
  pintarVias(caminhos, via);

  pavimentarPraca(caminhos);

  obj.moldura(GID.MATO);
  pintarLago(obj, LAGO);

  // Pegada de cada construcao: PAREDE colide, PORTA nao. O sprite da fachada
  // cobre a pegada inteira por cima, entao a colisao continua vindo dos tiles —
  // nenhuma maquina nova, o mesmo caminho que casa_1 ja usava.
  for (const c of CONSTRUIDAS) {
    obj.rect(c.x, c.y, c.w, c.h, GID.PAREDE);
    obj.set(c.portaX, c.portaY, GID.PORTA);
  }

  const interativos = [
    objeto('placa_teste', 'placa', CENTRO.x - 3, CENTRO.y + 3),
    objeto('pickup_cabo_usb_1', 'item', CENTRO.x - 2, CENTRO.y, { itemId: 'cabo_usb' }),
    objeto('pickup_cabo_usb_2', 'item', CENTRO.x + 2, CENTRO.y, { itemId: 'cabo_usb' }),
    ...CONSTRUIDAS.map((c) =>
      objeto(`porta_${c.nome}`, 'porta', c.portaX, c.portaY, {
        destino: c.interior,
        destinoTx: PORTA_INTERIOR.x,
        destinoTy: PORTA_INTERIOR.y - 1, // um tile acima da saida, ja dentro
      }),
    ),
  ];

  // o sprite da fachada e um objeto da camada `construcoes`: o jogo posiciona
  // pelo rodape da pegada e ordena profundidade por y, como a flora
  const fachadas = CONSTRUIDAS.map((c) =>
    ponto(c.nome, 'fachada', (c.x + c.w / 2) * T, (c.y + c.h) * T, { frame: c.nome }),
  );

  const zonas = ZONAS.map((z) => {
    const c = CONSTRUCOES[z.nome];
    return objeto(
      z.nome,
      z.classe,
      z.x,
      z.y,
      {
        tipo: z.classe,
        construida: Boolean(c) || Boolean(PRACAS[z.nome]),
        ...(c ? { mapaInterior: c.interior } : {}),
      },
      z.w,
      z.h,
    );
  });

  // tiles que a flora tem de respeitar: zonas, lago, casinha, interativos
  const ocupado = new Set();
  const bloquear = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) ocupado.add(`${i},${j}`);
  };
  // Lote com predio: bloqueia inteiro, pra nao nascer arvore no quintal nem
  // colada na fachada. O parque e o contrario: e area verde, entao so o
  // calcamento (mais 1 tile de folga) e proibido — o resto do lote recebe
  // vegetacao pela mesma regra do resto do mapa.
  for (const z of ZONAS) {
    if (PRACAS[z.nome]) continue;
    bloquear(z.x - 1, z.y - 1, z.w + 2, z.h + 2);
  }
  for (const [x, y] of tilesDaPraca()) bloquear(x - 1, y - 1, 3, 3);
  bloquear(LAGO.x - 1, LAGO.y - 1, LAGO.w + 2, LAGO.h + 2);
  bloquear(CENTRO.x - 4, CENTRO.y - 2, 9, 7); // respiro em volta do spawn
  for (const it of interativos) bloquear(it.x / T - 1, it.y / T - 1, 3, 3);

  const { arvores, flores, pedras } = gerarFlora(W, H, faixasDeVias(W, H), ocupado);

  return {
    mapa: montarMapa(
      W,
      H,
      [
        camadaTiles('chao', 1, chao),
        camadaTiles('caminhos', 2, caminhos),
        camadaTiles('objetos', 3, obj),
        camadaObjetos('interativos', 4, interativos),
        camadaObjetos('zonas', 5, zonas),
        camadaObjetos('flora', 6, [...arvores, ...pedras, ...flores]),
        camadaObjetos('construcoes', 7, fachadas),
      ],
      ts,
    ),
    contagem: { arvores: arvores.length, pedras: pedras.length, flores: flores.length },
  };
}

// ---------------------------------------------------------------- interiores --
/** Onde fica a porta de saida em todo interior: meio da parede de baixo. */
const INTERIOR_CASA = { largura: 16, altura: 12 };
const PORTA_INTERIOR = { x: 8, y: INTERIOR_CASA.altura - 1 };

/**
 * Interior de casa: o mesmo layout residencial pra todas (chao de madeira,
 * tapete, cama). So a saida muda — cada uma devolve o player na frente da
 * porta da SUA construcao. Variar o interior fica pra depois.
 */
function gerarInteriorCasa(nome, ts) {
  const c = construcao(nome);
  const { largura: W, altura: H } = INTERIOR_CASA;
  const chao = new Grade(W, H, GID.MADEIRA);
  const obj = new Grade(W, H);

  obj.moldura(GID.PAREDE);
  obj.set(PORTA_INTERIOR.x, PORTA_INTERIOR.y, GID.PORTA); // saida (nao colide)

  chao.rect(6, 5, 4, 2, de('tapete'));

  obj.set(2, 2, GID.CAMA_TOPO);
  obj.set(2, 3, GID.CAMA_BASE);

  const interativos = [
    objeto('porta_saida', 'porta', PORTA_INTERIOR.x, PORTA_INTERIOR.y, {
      destino: 'farm',
      destinoTx: c.frente.x,
      destinoTy: c.frente.y, // um tile abaixo da porta da casa, ja na grama
      rotulo: 'Sair',
    }),
    objeto(`cama_${nome}`, 'cama', 2, 3),
  ];

  return montarMapa(
    W,
    H,
    [
      camadaTiles('chao', 1, chao),
      camadaTiles('objetos', 2, obj),
      camadaObjetos('interativos', 3, interativos),
    ],
    ts,
  );
}

// ------------------------------------------------- interiores comerciais --
/**
 * Interior de comercio: sala aberta, chao de ladrilho, moveis encostados nas
 * paredes e em gondolas, deixando corredor pra circular. Os moveis vao numa
 * camada de objetos `moveis`: o gerador ja resolve atlas, frame, tamanho e se
 * colide, entao o jogo so posiciona.
 *
 * `pecas` e uma lista de { peca: [linha, indice], tx, ty, colide }. `tx`/`ty`
 * sao o tile do RODAPE do movel (como a flora), entao ele cresce pra cima.
 */
function gerarInteriorComercio(nome, chaveUtensilio, tamanho, pecas, ts) {
  const c = construcao(nome);
  const { largura: W, altura: H } = tamanho;
  const chao = new Grade(W, H, GID.PISO);
  const obj = new Grade(W, H);

  obj.moldura(GID.PAREDE);
  const portaX = Math.floor(W / 2);
  obj.set(portaX, H - 1, GID.PORTA);

  const u = utensilios[chaveUtensilio];
  const moveis = pecas.map((p, i) => {
    const b = peca(chaveUtensilio, ...p.peca);
    const larguraTiles = (b.w * u.escala) / T;
    const alturaTiles = (b.h * u.escala) / T;
    return ponto(
      `movel_${nome}_${i}`,
      'movel',
      (p.tx + larguraTiles / 2) * T,
      (p.ty + 1) * T,
      {
        atlas: `moveis_${chaveUtensilio}`,
        frame: nomePeca(...p.peca),
        alturaTiles: +alturaTiles.toFixed(3),
        colide: p.colide !== false,
      },
    );
  });

  const interativos = [
    objeto('porta_saida', 'porta', portaX, H - 1, {
      destino: 'farm',
      destinoTx: c.frente.x,
      destinoTy: c.frente.y,
      rotulo: 'Sair',
    }),
  ];

  return {
    mapa: montarMapa(
      W,
      H,
      [
        camadaTiles('chao', 1, chao),
        camadaTiles('objetos', 2, obj),
        camadaObjetos('interativos', 3, interativos),
        camadaObjetos('moveis', 4, moveis),
      ],
      ts,
    ),
    moveis: moveis.length,
  };
}

/** Salao do mercado: duas fileiras de gondola, frios ao fundo, caixa na saida. */
const MERCADO_INTERIOR = { largura: 22, altura: 15 };
const MERCADO_PECAS = [
  // fundo: geladeiras e freezers encostados na parede de cima
  { peca: [2, 5], tx: 2, ty: 2 },
  { peca: [2, 6], tx: 5, ty: 2 },
  { peca: [1, 7], tx: 9, ty: 2 },
  { peca: [1, 8], tx: 12, ty: 2 },
  { peca: [2, 4], tx: 17, ty: 2 }, // balcao de frios
  // gondola 1
  { peca: [2, 0], tx: 3, ty: 6 },
  { peca: [2, 1], tx: 6, ty: 6 },
  { peca: [2, 2], tx: 9, ty: 6 },
  { peca: [2, 3], tx: 12, ty: 6 },
  { peca: [2, 0], tx: 15, ty: 6 },
  // gondola 2
  { peca: [2, 2], tx: 3, ty: 9 },
  { peca: [2, 3], tx: 6, ty: 9 },
  { peca: [2, 1], tx: 9, ty: 9 },
  { peca: [2, 0], tx: 12, ty: 9 },
  { peca: [2, 2], tx: 15, ty: 9 },
  // mesa de hortifruti solta e caixa perto da porta
  { peca: [3, 1], tx: 18, ty: 6 },
  { peca: [1, 0], tx: 15, ty: 13 }, // caixa registradora
  { peca: [0, 0], tx: 2, ty: 13, colide: false }, // carrinho: da pra passar por cima
];

/** Salao da academia: aparelhos grandes no fundo e nas laterais, banco no meio. */
const ACADEMIA_INTERIOR = { largura: 18, altura: 12 };
const ACADEMIA_PECAS = [
  // fundo: fileira de aparelhos grandes
  { peca: [2, 0], tx: 2, ty: 2 },
  { peca: [2, 1], tx: 5, ty: 2 },
  { peca: [2, 2], tx: 8, ty: 2 },
  { peca: [2, 3], tx: 11, ty: 2 },
  { peca: [2, 4], tx: 14, ty: 2 },
  // meio: segunda fileira
  { peca: [3, 0], tx: 2, ty: 6 },
  { peca: [3, 1], tx: 5, ty: 6 },
  { peca: [3, 2], tx: 8, ty: 6 },
  { peca: [3, 3], tx: 12, ty: 6 },
  { peca: [2, 5], tx: 15, ty: 6 },
  // frente: bancos e rack, deixando o corredor da porta livre
  { peca: [1, 0], tx: 2, ty: 9 },
  { peca: [1, 1], tx: 6, ty: 9 },
  { peca: [6, 0], tx: 13, ty: 9 },
  // acessorios soltos: nao colidem, so decoram
  { peca: [4, 0], tx: 11, ty: 10, colide: false },
  { peca: [5, 0], tx: 16, ty: 10, colide: false },
];

// ---------------------------------------------------------------- sanidade --
/** Erra alto na geracao em vez de deixar o mapa quebrado silencioso no jogo. */
function conferirFazenda() {
  const { largura: W, altura: H } = FAZENDA;

  const tiles = (r) => {
    const lista = [];
    for (let j = r.y; j < r.y + r.h; j++) {
      for (let i = r.x; i < r.x + r.w; i++) lista.push(`${i},${j}`);
    }
    return lista;
  };
  const conferirLimites = (rotulo, r) => {
    if (r.x < 1 || r.y < 1 || r.x + r.w > W - 1 || r.y + r.h > H - 1) {
      throw new Error(`"${rotulo}" sai do mapa (${W}x${H})`);
    }
  };

  // vias podem (e devem) se cruzar entre si — viram um conjunto so.
  // Confere pela FAIXA inteira, nao pelo eixo: e ela que ocupa o terreno.
  const asfalto = new Set();
  for (const v of VIAS) {
    const faixa = faixaDaVia(v);
    conferirLimites(v.nome, faixa);
    for (const t of tiles(faixa)) asfalto.add(t);
  }

  // lotes nao podem se sobrepor nem cair em cima de via
  const ocupado = new Map();
  const marcarLote = (rotulo, r) => {
    conferirLimites(rotulo, r);
    for (const t of tiles(r)) {
      if (asfalto.has(t)) throw new Error(`"${rotulo}" fica em cima de uma via no tile ${t}`);
      const antes = ocupado.get(t);
      if (antes) throw new Error(`"${rotulo}" invade "${antes}" no tile ${t}`);
      ocupado.set(t, rotulo);
    }
  };
  for (const z of ZONAS) marcarLote(z.nome, z);
  marcarLote('lago', LAGO);

  // As construcoes nao sao lotes separados: cada uma mora dentro do seu lote.
  for (const c of CONSTRUIDAS) {
    const lote = zona(c.nome);
    const dentro =
      c.x >= lote.x &&
      c.y >= lote.y &&
      c.x + c.w <= lote.x + lote.w &&
      c.y + c.h <= lote.y + lote.h;
    if (!dentro) throw new Error(`a construcao de "${c.nome}" nao cabe no lote`);

    // a porta precisa de um tile andavel na frente pra dar pra entrar/sair
    const chaveFrente = `${c.frente.x},${c.frente.y}`;
    if (asfalto.has(chaveFrente)) {
      throw new Error(`a porta de "${c.nome}" abre em cima de uma via (${chaveFrente})`);
    }
    if (c.frente.y >= H - 1 || c.frente.x < 1) {
      throw new Error(`a porta de "${c.nome}" abre fora do mapa (${chaveFrente})`);
    }
    // a frente da porta tem de continuar dentro do lote, senao a construcao
    // esta encostada demais na borda e o quintal sumiu
    if (c.frente.y > lote.y + lote.h - 1) {
      throw new Error(`"${c.nome}" nao deixou quintal na frente da porta`);
    }
    if (!c.interior) throw new Error(`"${c.nome}" nao tem interior definido`);
  }

  // a praca nao pode cair em cima de via nem sair do mapa, e o piso tem de
  // ficar dentro do lote do parque (a calcada de ligacao pode sair, ela liga)
  const lotePraca = zona('parque');
  for (const [x, y] of tilesDaPraca()) {
    if (asfalto.has(`${x},${y}`)) throw new Error(`a praca cai em cima de via em ${x},${y}`);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) {
      throw new Error(`a praca sai do mapa em ${x},${y}`);
    }
  }
  for (let j = PRACA.y; j < PRACA.y + PRACA.h; j++) {
    for (let i = PRACA.x; i < PRACA.x + PRACA.w; i++) {
      const dentro =
        i >= lotePraca.x &&
        j >= lotePraca.y &&
        i < lotePraca.x + lotePraca.w &&
        j < lotePraca.y + lotePraca.h;
      if (!dentro) throw new Error(`o piso da praca saiu do lote do parque em ${i},${j}`);
    }
  }

  // todo lote construido precisa aparecer em CONSTRUCOES ou em PRACAS
  for (const z of ZONAS) {
    if (!CONSTRUCOES[z.nome] && !PRACAS[z.nome]) {
      throw new Error(`o lote "${z.nome}" ficou sem construcao nem praca`);
    }
  }

  const casas = ZONAS.filter((z) => z.classe === 'casa').length;
  if (casas !== 6) throw new Error(`esperava 6 zonas de casa, achei ${casas}`);
  for (const exigida of ['mercado', 'academia', 'parque']) {
    if (!ZONAS.some((z) => z.nome === exigida)) throw new Error(`falta a zona "${exigida}"`);
  }

  // toda mascara de estrada que a malha usa precisa existir no tileset
  const via = malhaDeVias(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!via.get(x, y)) continue;
      const m =
        (via.get(x, y - 1) ? 1 : 0) |
        (via.get(x + 1, y) ? 2 : 0) |
        (via.get(x, y + 1) ? 4 : 0) |
        (via.get(x - 1, y) ? 8 : 0);
      if (!gidEstrada(m)) throw new Error(`sem tile de estrada pra mascara ${m} em ${x},${y}`);
    }
  }
}

console.log('gerando assets...');
conferirFazenda();
const ts = gerarTileset();
const molduras = {
  arvores: gerarAtlas('arvores', (c, r) => `arvore_${r}_${c}`),
  flores_v1: gerarAtlas('flores_v1', (c, r) => `flor_${r}_${c}`),
  flores_v2: gerarAtlas('flores_v2', (c, r) => `flor_${r}_${c}`),
  pedras: gerarAtlasPedras(),
  construcoes: gerarConstrucoes(),
  moveis_mercado: gerarAtlasUtensilios('mercado'),
  moveis_academia: gerarAtlasUtensilios('academia'),
};
const fazenda = gerarFazenda(ts);
escrever(join(ASSETS, 'tilemaps', 'farm.json'), JSON.stringify(fazenda.mapa, null, 1));
for (const c of CONSTRUIDAS) {
  if (c.fachada) continue; // comercio tem interior proprio, mais abaixo
  escrever(
    join(ASSETS, 'tilemaps', `${c.interior}.json`),
    JSON.stringify(gerarInteriorCasa(c.nome, ts), null, 1),
  );
}
const mercado = gerarInteriorComercio(
  'mercado',
  'mercado',
  MERCADO_INTERIOR,
  MERCADO_PECAS,
  ts,
);
escrever(join(ASSETS, 'tilemaps', 'mercado.json'), JSON.stringify(mercado.mapa, null, 1));
const academia = gerarInteriorComercio(
  'academia',
  'academia',
  ACADEMIA_INTERIOR,
  ACADEMIA_PECAS,
  ts,
);
escrever(join(ASSETS, 'tilemaps', 'academia.json'), JSON.stringify(academia.mapa, null, 1));
console.log(
  `pronto. tileset ${TILES.length} tiles de ${T}px | ` +
    `fazenda ${FAZENDA.largura}x${FAZENDA.altura} (${FAZENDA.largura * T}x${FAZENDA.altura * T} px) | ` +
    `${fazenda.contagem.arvores} arvores, ${fazenda.contagem.pedras} pedras, ` +
    `${fazenda.contagem.flores} flores | ` +
    `atlas: ${Object.entries(molduras).map(([k, v]) => `${k}=${Object.keys(v).length}`).join(' ')}`,
);

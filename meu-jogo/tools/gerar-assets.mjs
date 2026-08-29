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
import { PROP_COLIDE, PROP_PORTA_NPC } from '../src/game/colisao.ts';
import { FOLHAS_DE_MOVEL } from '../src/game/moveis.ts';
import { CATALOGO_MOBILIA } from '../src/game/casa.ts';
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
  removerFundo,
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
  // Grama propria do Mapa 2 (bairro) e do Mapa 3 (zona rural). As duas folhas
  // vieram com grade 3x2 (seis variantes cada), contra a 3x1 da grama do Mapa
  // 1 — e por isso que cada mapa tem material proprio em `MATERIAIS`, e nao um
  // tinte por cima do mesmo tile.
  grama2: { arquivo: 'Grama_mapa_2.png', cols: 3, rows: 2, limiar: 0, inset: 0.22 },
  grama3: { arquivo: 'Grama_mapa_3.png', cols: 3, rows: 2, limiar: 0, inset: 0.22 },
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
  // folha nova, so de porta de COMERCIO (vidro, batente largo, letreiro).
  // Serve a fachada composta dos quatro lotes de comercio; as casas continuam
  // na v1, que tem porta residencial.
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

/*
 * As folhas de fachada PRONTA (`Mecado_academia.png` e `farmacia_bar.png`) nao
 * sao mais lidas: os quatro lotes de comercio passaram a ter a fachada COMPOSTA
 * a partir da folha de parede do proprio ramo, do mesmo jeito que as casas ja
 * eram montadas (ver `ESTILOS_COMERCIO` e `comporComercio`). A arte continua no
 * repositorio como referencia de como cada predio deve ler.
 */

/**
 * Folhas de MOVEL: utensilio de comercio e mobilia de casa. Nenhuma delas tem
 * grade — a arte esta espalhada, entao sai por componente conexo agrupado em
 * LINHAS. Uma peca e identificada por [linha, indice na linha], o que sobrevive
 * a arte ganhar ou perder um item no meio de uma linha melhor do que um indice
 * global.
 *
 * `larguraReferencia` e a largura, em tiles, que a peca `referencia` deve ter.
 * Dela sai uma escala unica pra folha toda, entao as pecas mantem o tamanho
 * relativo entre si — mesma ideia usada nas pedras. As referencias de TODAS as
 * folhas foram medidas contra a mesma regua (ver a nota nas folhas por comodo,
 * embaixo), pra que a estante de uma leia do mesmo tamanho que a estante de
 * outra: o conjunto tem de parecer um so.
 *
 * `alfa` e o limiar de opacidade da deteccao. Em `Mobilhas_v1.png` ele sobe pra
 * 128 porque a arte esta encostada na folha: com o limiar padrao (16) a sombra
 * de uma peca toca a vizinha e a folha inteira sai como um blob so.
 */
const FOLHAS_MOVEIS = {
  mercado: {
    arquivo: 'Utensilios_mercado.png',
    areaMinima: 900,
    tolerancia: 70,
    linhas: 6,
    referencia: [2, 0], // gondola de hortifruti
    larguraReferencia: 2,
  },
  academia: {
    arquivo: 'Utensilios_academia.png',
    areaMinima: 900,
    tolerancia: 70,
    linhas: 7,
    referencia: [2, 0], // aparelho grande
    larguraReferencia: 2.2,
  },
  // Mobilia de casa. Duas folhas de estilo parecido; a v1 tem a arte maior e
  // encostada, a v2 e mais solta e traz mais variedade de cor.
  mobilia_v1: {
    arquivo: 'Mobilhas_v1.png', // grafia da propria arte
    areaMinima: 1500,
    tolerancia: 55,
    alfa: 128,
    linhas: 7,
    referencia: [4, 4], // estante de livros
    larguraReferencia: 1.35,
  },
  mobilia_v2: {
    arquivo: 'Mobilia_v2.png',
    areaMinima: 2000,
    tolerancia: 50,
    linhas: 10,
    referencia: [2, 0], // sofa de 2 lugares
    larguraReferencia: 2.5,
  },
  // Arte DEDICADA de bar e farmacia, na mesma folha: as duas metades do predio
  // misto. Traz balcao, estanteria, mesa, banqueta, barril e letreiro dos dois
  // ramos — e o que dispensa o placeholder de mobilia de casa que o salao usava
  // antes. A deteccao sai limpa em 7 linhas com os parametros padrao.
  farmacia_bar: {
    arquivo: 'Moveis_farmacia_bar.png',
    areaMinima: 1500,
    tolerancia: 55,
    linhas: 7,
    referencia: [1, 0], // balcao do bar
    larguraReferencia: 3,
  },

  // Folhas DEDICADAS por comodo. Sao elas que aposentaram o placeholder: ate
  // aqui a cozinha usava mesa de jantar e estante de potes da folha de sala, e o
  // banheiro usava comoda e espelho. Agora ha pia, fogao, geladeira, vaso,
  // banheira e box de verdade.
  //
  // A largura de referencia de cada uma foi escolhida contra a MESMA regua: o
  // sofa de 2 lugares de `mobilia_v2` tem 2,5 tiles, o que poe o tile do mundo
  // em ~0,64 m. Dai saem a cama de casal (1,6 m), a banheira (1,7 m) e a mesa de
  // jantar com as duas cadeiras (2,2 m) — assim a cama de um quarto e a mesa da
  // cozinha lem do mesmo tamanho quando o jogador anda de um comodo pro outro.
  // Estruturas de PARQUE. Unica folha de movel que mobilia area EXTERNA: banco,
  // chafariz, lixeira, poste, brinquedo de playground, quiosque. A regua e a
  // mesma das folhas de interior (o banco de praca em 2,6 tiles poe o tile em
  // ~0,64 m, igual ao sofa de `mobilia_v2`), pra o mobiliario do parque nao ler
  // maior nem menor que o de dentro de casa.
  parque: {
    arquivo: 'Estuturas_parque_v1.png',
    runtime: true,
    areaMinima: 1500,
    tolerancia: 55,
    linhas: 9,
    referencia: [0, 7], // banco de praca de encosto reto
    larguraReferencia: 2.6,
  },
  quarto: {
    arquivo: 'Moveis_quarto.png',
    areaMinima: 1500,
    tolerancia: 55,
    linhas: 8,
    referencia: [0, 1], // cama de casal
    larguraReferencia: 2.5,
  },
  banheiro: {
    arquivo: 'Moveis_banheiro.png',
    areaMinima: 1500,
    tolerancia: 55,
    linhas: 5,
    referencia: [0, 6], // banheira
    larguraReferencia: 2.65,
  },
  // exportada sobre preto opaco: `fundoPreto` apaga o fundo antes da deteccao
  cozinha: {
    arquivo: 'Moveis_cozinha.png',
    areaMinima: 2000,
    tolerancia: 55,
    fundoPreto: true,
    linhas: 8,
    referencia: [3, 1], // mesa de jantar com as duas cadeiras
    larguraReferencia: 3.4,
  },
  eletronicos: {
    arquivo: 'Moveis_Eletronicos_v1.png',
    areaMinima: 1500,
    tolerancia: 55,
    linhas: 8,
    referencia: [0, 0], // TV em cima do rack de madeira
    larguraReferencia: 2.2,
  },
};

function carregarFolhaMoveis(chave) {
  const def = FOLHAS_MOVEIS[chave];
  const cru = lerPng(caminhoFolha(def.arquivo, def.runtime));
  const img = def.fundoPreto ? removerFundo(cru) : cru;
  const linhas = agruparEmLinhas(
    blobs(img, def.areaMinima, def.alfa ?? 16, true),
    def.tolerancia,
  );
  if (linhas.length !== def.linhas) {
    throw new Error(
      `${def.arquivo}: esperava ${def.linhas} linhas de movel, achei ${linhas.length}` +
        ` — a arte mudou de layout?`,
    );
  }
  const [lr, ir] = def.referencia;
  const ref = linhas[lr]?.[ir];
  if (!ref) throw new Error(`${def.arquivo}: peca de referencia [${lr},${ir}] nao existe`);
  const escala = (def.larguraReferencia * T) / ref.w;
  return { ...def, img, linhas, escala };
}

const folhasMoveis = Object.fromEntries(
  Object.keys(FOLHAS_MOVEIS).map((k) => [k, carregarFolhaMoveis(k)]),
);

// a lista que o jogo carrega e a que o gerador empacota tem de ser a mesma
for (const f of FOLHAS_DE_MOVEL) {
  if (!FOLHAS_MOVEIS[f]) {
    throw new Error(`FOLHAS_DE_MOVEL pede a folha "${f}", que nao existe em FOLHAS_MOVEIS`);
  }
}
for (const f of Object.keys(FOLHAS_MOVEIS)) {
  if (!FOLHAS_DE_MOVEL.includes(f)) {
    throw new Error(`a folha "${f}" nao esta em FOLHAS_DE_MOVEL — o jogo nao carregaria o atlas`);
  }
}

/** Uma peca de movel pelo par [linha, indice]. */
function peca(chave, linha, indice) {
  const u = folhasMoveis[chave];
  const b = u.linhas[linha]?.[indice];
  if (!b) throw new Error(`${u.arquivo}: nao existe peca [${linha},${indice}]`);
  return b;
}

/** Nome do frame de uma peca no atlas de moveis. */
const nomePeca = (linha, indice) => `movel_${linha}_${indice}`;

/**
 * Reempacota a folha de movel: cada peca ganha uma celula propria numa folha
 * nova, levando SO os proprios pixels.
 *
 * Recortar na posicao original nao serve. O frame do atlas e um retangulo e a
 * arte nao: numa peca diagonal (tapete) a caixa pega o canto da peca vizinha, e
 * como a vizinha tambem e uma peca legitima, apagar "sujeira" nao resolve — as
 * duas caixas se sobrepoem de verdade. Separar em celulas resolve de uma vez.
 *
 * O empacotamento e por prateleira (esquerda pra direita, quebra na largura da
 * folha original). Nao precisa ser otimo: a folha nova sai menor que a arte
 * crua de qualquer jeito, porque o espaco vazio entre as pecas vai embora.
 */
const FOLGA_EMPACOTE = 2; // px entre celulas, pra escala nao puxar do vizinho

function empacotarFolhaMoveis(chave) {
  const u = folhasMoveis[chave];
  const caixas = new Map();

  // 1a passada: decide onde cada peca vai, e com isso o tamanho da folha
  let x = FOLGA_EMPACOTE;
  let y = FOLGA_EMPACOTE;
  let alturaPrateleira = 0;
  let largura = 0;
  u.linhas.forEach((linha, li) => {
    linha.forEach((b, i) => {
      if (!b.pixels) throw new Error(`${u.arquivo}: blob sem lista de pixels`);
      if (x + b.w + FOLGA_EMPACOTE > u.img.w) {
        x = FOLGA_EMPACOTE;
        y += alturaPrateleira + FOLGA_EMPACOTE;
        alturaPrateleira = 0;
      }
      caixas.set(nomePeca(li, i), { origem: b, x, y, w: b.w, h: b.h });
      x += b.w + FOLGA_EMPACOTE;
      alturaPrateleira = Math.max(alturaPrateleira, b.h);
      largura = Math.max(largura, x);
    });
  });
  const altura = y + alturaPrateleira + FOLGA_EMPACOTE;

  // 2a passada: copia pixel a pixel, so o que e da peca
  const im = new Img(largura, altura);
  for (const c of caixas.values()) {
    for (const i of c.origem.pixels) {
      const px = i % u.img.w;
      const py = (i - px) / u.img.w;
      const o = i * 4;
      im.set(c.x + (px - c.origem.x), c.y + (py - c.origem.y), [
        u.img.px[o],
        u.img.px[o + 1],
        u.img.px[o + 2],
        u.img.px[o + 3],
      ]);
    }
  }

  const arquivo = `moveis_${chave}.png`;
  escrever(join(SPRITES, arquivo), im.png());
  return { arquivo, img: im, caixas };
}

/** Atlas de moveis: um frame por peca, apontando pra folha reempacotada. */
function gerarAtlasMoveis(chave) {
  const folha = empacotarFolhaMoveis(chave);
  const frames = {};
  for (const [nome, c] of folha.caixas) {
    frames[nome] = {
      frame: { x: c.x, y: c.y, w: c.w, h: c.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: c.w, h: c.h },
      sourceSize: { w: c.w, h: c.h },
    };
  }
  return escreverAtlas(`moveis_${chave}`, folha, frames);
}

/** Tile de T x T tirado da celula (c, r) de uma folha de terreno. */
function tileDaArte(chave, c, r) {
  const f = folhas[chave];
  return reduzir(f.img, celulaQuadrada(f.cols, f.rows, c, r, f.inset ?? 0.05), T);
}

// ------------------------------------------------------- paredes internas --
/**
 * Folhas de PAINEL: arte de parede em elevacao frontal, um painel inteiro por
 * peca (campo em cima, rodape/lambri embaixo).
 *
 * De cada painel o gerador tira DOIS tiles: um do CAMPO (a area lisa de cima,
 * que e o que repete bem) e um do RODAPE (a faixa de baixo, onde a arte ja traz
 * lambri e baseboard). Qual dos dois entra em cada tile do mapa quem decide e
 * `acabarParedes`, pela vizinhanca — ver `relevoDeParede`.
 *
 * Sao dois `modo`s de recorte porque as folhas foram exportadas diferente:
 *
 * - `blobs` — os paineis se ENCOSTAM na projecao de alfa (a folha de casa e
 *   assim), entao a grade nao sai por projecao e cada painel tem de vir por
 *   componente conexo agrupado em linhas, como as folhas de movel;
 * - `grade` — ha corredor transparente entre os paineis, e ai a projecao acha a
 *   grade direto. Nas folhas de comercio o painel tem moldura e miolo separados
 *   por alfa, o que quebraria a deteccao por blob (a moldura sai como peca).
 *
 * `fundoPreto` apaga o fundo chapado antes de qualquer deteccao: parte da arte
 * nova veio sobre preto opaco em vez de transparente (ver `removerFundo`).
 * `faixaMinima` descarta banda fina demais pra ser painel — sujeira de 2-3 px
 * que a projecao acha entre as linhas.
 */
const FOLHAS_PAINEL = {
  casa_interna: {
    arquivo: 'paredes_casa_Internas_v1.png',
    modo: 'blobs',
    areaMinima: 1500,
    tolerancia: 55,
    // as 4 primeiras linhas sao os paineis (7 cada); da 5a pra baixo a folha
    // traz rodape solto, coluna, cantoneira e grelha, que nao viram tile
    linhas: 7,
    paineis: 4,
    porLinha: 7,
  },
  academia: { arquivo: 'paredes_academia.png', modo: 'grade', paineis: 4, porLinha: 6 },
  // no mercado os paineis se encostam na horizontal, como na folha de casa
  mercado: {
    arquivo: 'Paredes_mercado.png',
    modo: 'blobs',
    areaMinima: 1500,
    tolerancia: 55,
    linhas: 6,
    paineis: 3,
    porLinha: 6,
  },
  farmacia: { arquivo: 'Paredes_farmacia.png', modo: 'grade', paineis: 3, porLinha: 6 },
  // Folhas novas desta leva. As tres vieram sobre fundo PRETO opaco (como a do
  // bar), entao pedem `fundoPreto` pra projecao achar a grade; escola tem 5
  // paineis por linha, biblioteca e o predio generico tem 6.
  escola: { arquivo: 'Paredes_escola.png', modo: 'grade', fundoPreto: true, paineis: 3, porLinha: 5 },
  biblioteca: { arquivo: 'Paredes_biblioteca.png', modo: 'grade', fundoPreto: true, paineis: 3, porLinha: 6 },
  // `predio` e a folha de alvenaria neutra: serve a oficina do protagonista, a
  // madeireira e a central telefonica, que nao tem folha de ramo propria.
  predio: { arquivo: 'PAredes_predio.png', modo: 'grade', fundoPreto: true, paineis: 3, porLinha: 6 },
  bar: { arquivo: 'Paredes_bar.png', modo: 'grade', fundoPreto: true, paineis: 3, porLinha: 6 },
};

/** Faixa detectada por projecao mais estreita que isto e sujeira, nao painel. */
const FAIXA_MINIMA_PAINEL = 60;

function carregarFolhaPainel(chave) {
  const def = FOLHAS_PAINEL[chave];
  const cru = lerPng(caminhoFolha(def.arquivo, def.runtime));
  const img = def.fundoPreto ? removerFundo(cru) : cru;

  let linhas;
  if (def.modo === 'grade') {
    const g = detectarGrade(img, def.limiar ?? 2);
    const util = (faixas) => faixas.filter(([a, b]) => b - a + 1 >= FAIXA_MINIMA_PAINEL);
    const cols = util(g.cols);
    const rows = util(g.rows);
    linhas = rows.map(([y0, y1]) =>
      cols.map(([x0, x1]) => ({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 })),
    );
  } else {
    linhas = agruparEmLinhas(blobs(img, def.areaMinima, def.alfa ?? 16, false), def.tolerancia);
    if (linhas.length !== def.linhas) {
      throw new Error(
        `${def.arquivo}: esperava ${def.linhas} linhas de painel, achei ${linhas.length}` +
          ` — a arte mudou de layout?`,
      );
    }
  }

  if (linhas.length < def.paineis) {
    throw new Error(
      `${def.arquivo}: esperava ao menos ${def.paineis} linhas de painel, achei ${linhas.length}`,
    );
  }
  for (let i = 0; i < def.paineis; i++) {
    if (linhas[i].length !== def.porLinha) {
      throw new Error(
        `${def.arquivo}: linha ${i} tem ${linhas[i].length} paineis, esperava ${def.porLinha}`,
      );
    }
  }
  return { ...def, img, linhas };
}

const folhasPainel = Object.fromEntries(
  Object.keys(FOLHAS_PAINEL).map((k) => [k, carregarFolhaPainel(k)]),
);

/**
 * As duas faixas de um painel, em fracao da altura dele.
 *
 * `campo` fica no alto, longe do lambri e da moldura de baixo; `rodape` encosta
 * na base. A largura do recorte e sempre a ALTURA da faixa, pra sair quadrado —
 * um tile de mundo e quadrado e esticar a arte na horizontal faria a listra do
 * papel de parede engordar so nesse pedaco.
 */
const FAIXAS_DO_PAINEL = { campo: [0.1, 0.42], rodape: [0.58, 1.0] };

/**
 * Recorte quadrado de uma faixa do painel [linha, indice], reduzido pro tile.
 *
 * `faixas` sobrepoe as bandas padrao quando o painel nao segue o desenho tipico
 * (campo liso em cima, lambri embaixo). O mercado e o caso: ele traz uma tarja
 * vermelha bem no alto, e com a banda padrao o tile de campo sai listrado — o
 * que numa parede lateral, repetido de cima a baixo, vira um poste de barbeiro.
 */
function tileDePainel(chave, [linha, indice], faixa, faixas = {}) {
  const f = folhasPainel[chave];
  const b = f.linhas[linha]?.[indice];
  if (!b) throw new Error(`${f.arquivo}: nao existe painel [${linha},${indice}]`);
  const [a0, a1] = faixas[faixa] ?? FAIXAS_DO_PAINEL[faixa];
  const y = Math.round(b.y + b.h * a0);
  const lado = Math.min(b.w, Math.round(b.h * (a1 - a0)));
  return reduzir(f.img, { x: Math.round(b.x + (b.w - lado) / 2), y, w: lado, h: lado }, T);
}

/**
 * Relevo 2D de parede: sombra na base e luz no topo, desenhadas no proprio
 * tile.
 *
 * E a mesma tecnica do beiral do telhado em `comporCasa` — uma linha escura na
 * junta em vez de motor de luz —, so que virada pra dentro de casa. Sem ela a
 * parede interna le como "mais um pedaco de chao": nada separa o plano vertical
 * do horizontal. Com ela, a faixa escura na base finca a parede no chao e o
 * fio claro no topo devolve a quina iluminada.
 *
 * `base` vale pro tile cuja vizinha de BAIXO e piso (a parede encontra o chao
 * ali) e `topo` pro tile cuja vizinha de CIMA e piso. Um tile de parede de 1
 * tile de espessura recebe os dois. Generico de proposito: qualquer interior
 * futuro so precisa de um par de tiles campo/rodape pra usar isto.
 */
const RELEVO_PAREDE = {
  sombra: [26, 18, 14],
  luz: [255, 248, 232],
  faixaSombra: 0.22, // fracao do tile que a sombra cobre, de baixo pra cima
  forcaSombra: 0.5,
  faixaLuz: 0.1,
  forcaLuz: 0.34,
};

function relevoDeParede(px, { base = false, topo = false } = {}) {
  const saida = px.map((c) => [...c]);
  const misturar = (j, cor, k) => {
    for (let i = 0; i < T; i++) {
      const c = saida[j * T + i];
      if (!c || c[3] === 0) continue;
      c[0] = Math.round(c[0] * (1 - k) + cor[0] * k);
      c[1] = Math.round(c[1] * (1 - k) + cor[1] * k);
      c[2] = Math.round(c[2] * (1 - k) + cor[2] * k);
    }
  };
  if (base) {
    const n = Math.max(2, Math.round(T * RELEVO_PAREDE.faixaSombra));
    // rampa: quase nada no comeco da faixa, cheia na ultima linha do tile
    for (let d = 0; d < n; d++) {
      misturar(T - n + d, RELEVO_PAREDE.sombra, (RELEVO_PAREDE.forcaSombra * (d + 1)) / n);
    }
  }
  if (topo) {
    const n = Math.max(1, Math.round(T * RELEVO_PAREDE.faixaLuz));
    for (let d = 0; d < n; d++) {
      misturar(d, RELEVO_PAREDE.luz, (RELEVO_PAREDE.forcaLuz * (n - d)) / n);
    }
  }
  return saida;
}

/**
 * Os 4 tiles de um estilo de parede interna. O nome de cada um vira GID e a
 * escolha entre eles e por vizinhanca, em `acabarParedes`:
 *
 * - CORPO — meio da parede: nem encosta no chao em cima nem embaixo
 * - BASE  — piso embaixo: campo do painel nao, RODAPE, mais a sombra da junta
 * - TOPO  — piso em cima: campo do painel com o fio de luz na quina
 * - UNICA — parede de 1 tile de espessura, com piso dos dois lados
 */
const VARIANTES_PAREDE = ['CORPO', 'BASE', 'TOPO', 'UNICA'];

function tilesDeEstiloDeParede(nome, folha, painel, faixas) {
  const campo = tileDePainel(folha, painel, 'campo', faixas);
  const rodape = tileDePainel(folha, painel, 'rodape', faixas);
  return [
    { nome: `PAREDE_${nome}_CORPO`, colide: true, px: campo },
    { nome: `PAREDE_${nome}_BASE`, colide: true, px: relevoDeParede(rodape, { base: true }) },
    { nome: `PAREDE_${nome}_TOPO`, colide: true, px: relevoDeParede(campo, { topo: true }) },
    {
      nome: `PAREDE_${nome}_UNICA`,
      colide: true,
      px: relevoDeParede(rodape, { base: true, topo: true }),
    },
  ];
}

/**
 * Catalogo de estilo de parede interna: nome logico -> folha e painel.
 *
 * Os de casa saem de `paredes_casa_Internas_v1.png`; os de comercio, da folha
 * dedicada de cada ramo. Trocar o papel de parede de uma casa e mexer no
 * `parede` da planta dela, nao aqui.
 */
const ESTILOS_PAREDE = {
  // --- residencial: campo liso/estampado com lambri de madeira ---
  reboco_creme: ['casa_interna', [0, 0]],
  papel_azul: ['casa_interna', [0, 1]],
  papel_verde: ['casa_interna', [0, 2]],
  reboco_bege: ['casa_interna', [0, 3]],
  tijolo_claro: ['casa_interna', [0, 4]],
  liso_branco: ['casa_interna', [2, 0]],
  liso_azul: ['casa_interna', [2, 1]],
  liso_sage: ['casa_interna', [2, 2]],
  liso_bege: ['casa_interna', [2, 3]],
  // --- molhados: a folha traz azulejo de verdade, entao banheiro e cozinha
  //     deixam de usar papel de parede ---
  azulejo_branco: ['casa_interna', [3, 0]],
  azulejo_verde: ['casa_interna', [3, 1]],
  azulejo_escuro: ['casa_interna', [3, 4]],
  // --- comercio: cada ramo com a folha do proprio ramo ---
  academia: ['academia', [0, 0]],
  // a tarja vermelha do mercado fica no alto do painel; o campo desce pra pegar
  // so o azulejo creme
  mercado: ['mercado', [0, 0], { campo: [0.26, 0.54] }],
  farmacia: ['farmacia', [1, 0]],
  bar: ['bar', [0, 0]],
  // --- predios do Mapa 2, com as folhas novas ---
  escola: ['escola', [0, 0]],
  biblioteca: ['biblioteca', [0, 0]],
  // alvenaria neutra: e a parede da parte de MORADIA da casa+oficina
  predio: ['predio', [0, 0]],
  // concreto rachado: a parede do comodo de OFICINA, que le como puxadinho
  predio_gasto: ['predio', [1, 1]],
};

const TILES_DE_PAREDE = Object.entries(ESTILOS_PAREDE).flatMap(([nome, [folha, painel, faixas]]) =>
  tilesDeEstiloDeParede(nome, folha, painel, faixas),
);

// ---------------------------------------------------------------- pisos --
/**
 * Folhas de PISO: textura de chao ja desenhada pra ladrilhar, uma peca por
 * quadrado. As duas folhas trazem as tres primeiras linhas cheias de quadrados
 * do mesmo tamanho e, da quarta pra baixo, rodape/soleira/ralo/tapete — que nao
 * viram tile de chao.
 *
 * A arte e SEM COSTURA de proposito, entao aqui nao ha rotacao nem variante
 * como na grama: o quadrado inteiro vira o tile e repete direto.
 */
const FOLHAS_PISO = {
  banheiro: { arquivo: 'Pisos_banheiro.png', areaMinima: 8000, tolerancia: 60, linhasUteis: 2 },
  cozinha: { arquivo: 'Pisos_cozinha.png', areaMinima: 8000, tolerancia: 60, linhasUteis: 3 },
};

/** Quanto encolher o quadrado antes de reduzir, pra fugir da franja da borda. */
const INSET_PISO = 0.03;

function carregarFolhaPiso(chave) {
  const def = FOLHAS_PISO[chave];
  const img = lerPng(caminhoFolha(def.arquivo, def.runtime));
  const linhas = agruparEmLinhas(blobs(img, def.areaMinima, 16, false), def.tolerancia);
  if (linhas.length < def.linhasUteis) {
    throw new Error(
      `${def.arquivo}: esperava ao menos ${def.linhasUteis} linhas de piso, achei ${linhas.length}`,
    );
  }
  return { ...def, img, linhas };
}

const folhasPiso = Object.fromEntries(Object.keys(FOLHAS_PISO).map((k) => [k, carregarFolhaPiso(k)]));

function tileDePiso(chave, [linha, indice]) {
  const f = folhasPiso[chave];
  const b = f.linhas[linha]?.[indice];
  if (!b) throw new Error(`${f.arquivo}: nao existe piso [${linha},${indice}]`);
  return reduzir(f.img, encolher(b, INSET_PISO), T);
}

/**
 * Catalogo de piso: nome logico -> folha e quadrado.
 *
 * As folhas se chamam "banheiro" e "cozinha" pelo tema do pacote de arte, mas o
 * conteudo nao respeita isso — a de cozinha traz as madeiras e o espinha de
 * peixe, que sao o piso de sala e de quarto. Quem decide onde cada um entra e o
 * `pisos` da planta.
 */
const PISOS = {
  madeira_clara: ['cozinha', [0, 5]],
  madeira_escura: ['cozinha', [0, 6]],
  espinha_madeira: ['cozinha', [2, 4]],
  espinha_clara: ['cozinha', [2, 6]],
  ladrilho_bege: ['cozinha', [0, 4]],
  concreto: ['cozinha', [0, 2]],
  concreto_escuro: ['cozinha', [0, 3]],
  xadrez_cozinha: ['cozinha', [1, 0]],
  terracota: ['cozinha', [2, 0]],
  ladrilho_verde: ['cozinha', [2, 1]],
  azulejo_portugues: ['cozinha', [1, 6]],
  marmore: ['banheiro', [0, 2]],
  hexagonal: ['banheiro', [0, 5]],
  xadrez_banheiro: ['banheiro', [0, 6]],
  mosaico_azul: ['banheiro', [1, 2]],
  mosaico_menta: ['banheiro', [1, 3]],
  granilite: ['banheiro', [1, 4]],
};

const TILES_DE_PISO = Object.entries(PISOS).map(([nome, [folha, quadro]]) => ({
  nome: `PISO_${nome.toUpperCase()}`,
  px: tileDePiso(folha, quadro),
}));

/** GID do piso pelo nome logico, com erro alto se o nome nao existir. */
function gidDePiso(nome) {
  const gid = GID[`PISO_${nome.toUpperCase()}`];
  if (!gid) throw new Error(`piso "${nome}" nao existe em PISOS`);
  return gid;
}

// --------------------------------------------------------- portas de vao --
/**
 * A faixa de porta RESIDENCIAL de `Portas_v2.png`.
 *
 * A folha traz quatro faixas (farmacia, bar, academia e casa) e so a ultima
 * serve aqui — as outras sao porta de fachada de comercio, que ja esta resolvida
 * pelo sprite de construcao. A faixa sai da propria projecao de alfa (a ultima
 * linha da grade), entao reexportar a arte com outra altura nao quebra nada.
 *
 * Dentro da faixa a arte esta em 3 cores x 3 estados (fechada, aberta pra
 * esquerda, aberta pra direita), sempre nessa ordem da esquerda pra direita. O
 * rotulo "HOUSE / INTERIOR" e o iconezinho de casa tambem sao blobs; `ALTURA_MINIMA`
 * corta os dois, que sao bem mais baixos que uma porta.
 */
const FOLHA_PORTA_INTERNA = { arquivo: 'Portas_v2.png', areaMinima: 9000, portas: 9 };
const ALTURA_MINIMA_PORTA = 0.85; // fracao da altura da faixa

function carregarPortasInternas() {
  const img = lerPng(caminhoFolha(FOLHA_PORTA_INTERNA.arquivo, false));
  const grade = detectarGrade(img, 2);
  const [y0, y1] = grade.rows[grade.rows.length - 1];
  const h = y1 - y0 + 1;
  const achados = blobs(img, FOLHA_PORTA_INTERNA.areaMinima)
    .filter((b) => b.y >= y0 && b.y + b.h <= y1 + 1 && b.h >= h * ALTURA_MINIMA_PORTA)
    .sort((a, b) => a.x - b.x);
  if (achados.length !== FOLHA_PORTA_INTERNA.portas) {
    throw new Error(
      `${FOLHA_PORTA_INTERNA.arquivo}: esperava ${FOLHA_PORTA_INTERNA.portas} portas de casa na ` +
        `faixa ${y0}..${y1}, achei ${achados.length} — a arte mudou de layout?`,
    );
  }
  return { img, portas: achados };
}

const portasInternas = carregarPortasInternas();

/**
 * Cor da porta por tipo de comodo. A propria arte traz o pictograma (vaso,
 * cama, talher), entao a escolha nao e so de cor: e de qual placa fica na
 * folha da porta.
 */
const CORES_DE_PORTA = { claro: 0, madeira: 3, verde: 6 };
/** Estado dentro de cada cor. Aberta pra esquerda e a que le como VAO. */
const ESTADO_DE_PORTA = { fechada: 0, aberta: 1, aberta_direita: 2 };
const ESTADO_PADRAO = 'aberta';

/**
 * Os tiles de uma cor de porta interna.
 *
 * Sao dois formatos porque os vaos das plantas tem dois tamanhos: parede
 * horizontal de 2 tiles de espessura pede a porta partida em TOPO+BASE (a arte
 * inteira ocupando os dois tiles), e parede de 1 tile pede a porta inteira num
 * tile so. Nenhum dos tres colide: a porta e so a arte do vao, a passagem
 * continua exatamente tao andavel quanto era.
 *
 * `paredeInterna` marca o tile pro relevo de parede tratar o vao como alvenaria
 * (ver `acabarParedes`): a arte da porta ja traz o proprio batente, e sombrear
 * a parede no meio dele deixaria um degrau escuro no vao.
 */
function tilesDePortaInterna(nome, indice) {
  const b = portasInternas.portas[indice];
  const alto = reduzirPara(portasInternas.img, b, T, T * 2);
  const fatia = (linha) => alto.slice(linha * T * T, (linha + 1) * T * T);
  return [
    {
      nome: `PORTA_INT_${nome}_TOPO`,
      paredeInterna: true,
      px: fatia(0),
    },
    {
      nome: `PORTA_INT_${nome}_BASE`,
      paredeInterna: true,
      px: fatia(1),
    },
    {
      nome: `PORTA_INT_${nome}`,
      paredeInterna: true,
      px: reduzirPara(portasInternas.img, b, T, T),
    },
  ];
}

const TILES_DE_PORTA_INTERNA = Object.entries(CORES_DE_PORTA).flatMap(([nome, base]) =>
  tilesDePortaInterna(nome, base + ESTADO_DE_PORTA[ESTADO_PADRAO]),
);

/**
 * A cama dos interiores multi-comodo, em dois tiles empilhados.
 *
 * A cama e o unico movel de casa que NAO e sprite: ela e tile porque o objeto
 * interativo de dormir/salvar (`cama` na camada `interativos`) e a conferencia
 * de acesso dependem de ela ocupar exatamente (x,y) e (x,y+1). O que muda aqui
 * e so a arte — sai a cama pintada a mao, entra a cama de solteiro da folha
 * dedicada de quarto, esticada nos 32x64 dos dois tiles.
 *
 * A cama pintada a mao saiu do tileset junto com o interior de salao unico da
 * casa_1, que foi desativada nesta leva.
 */
function tilesDeCamaDeQuarto() {
  const b = peca('quarto', 0, 0); // cama de solteiro
  const alto = reduzirPara(folhasMoveis.quarto.img, b, T, T * 2);
  return [
    { nome: 'CAMA_QUARTO_TOPO', colide: true, px: alto.slice(0, T * T) },
    { nome: 'CAMA_QUARTO_BASE', colide: true, px: alto.slice(T * T) },
  ];
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

/**
 * Grama dos mapas 2 e 3, das folhas novas.
 *
 * As duas vieram em grade 3x2, mas NEM TODA celula serve de tile de chao:
 *
 * - a LINHA 1 das duas folhas e a versao NOTURNA da linha 0 (mesmo pareamento
 *   de `Grama.png` com `Grama_noite.png`). O jogo nao troca tile por horario,
 *   entao ela fica FORA — anotada aqui pra quem for implementar noite saber
 *   que a arte ja existe;
 * - as celulas com CENARIO desenhado dentro (caminho de pedra na grama2, fardo
 *   de feno / cerca / girassol na grama3) tambem ficam fora: sao pecas de
 *   composicao, e ladrilhadas viram carimbo repetido.
 *
 * Sobra o que repete bem, cada uma nas 4 rotacoes.
 */
const gramaDeFolha = (prefixo, chave, celulas) =>
  celulas.flatMap(([c, r], v) =>
    rotacoes(tileDaArte(chave, c, r)).map((px, giro) => ({
      nome: `${prefixo}_${v}${giro}`,
      px,
    })),
  );
const GRAMA2 = gramaDeFolha('GRAMA2', 'grama2', [[0, 0], [1, 0]]);
const GRAMA3 = gramaDeFolha('GRAMA3', 'grama3', [[0, 0]]);

const TILES = [
  // grama: arte lisa / com florzinhas / com terra, x4 rotacoes cada
  ...GRAMA,
  // grama propria do Mapa 2 (bairro) e do Mapa 3 (zona rural)
  ...GRAMA2,
  ...GRAMA3,

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
  // paredes internas com arte dedicada, 4 variantes de relevo cada (ver
  // `tilesDeEstiloDeParede`). A PAREDE pintada logo abaixo continua no tileset:
  // e a do salao unico da casa_1, que segue com o sistema original.
  ...TILES_DE_PAREDE,
  // portas de vao: arte por cima da passagem, sem colisao nenhuma
  ...TILES_DE_PORTA_INTERNA,
  // piso de interior, um por textura da arte dedicada
  ...TILES_DE_PISO,
  // cama dos interiores multi-comodo, com a arte da folha de quarto
  ...tilesDeCamaDeQuarto(),
  // ------------------------------------------------ terreno dos mapas novos --
  // Nenhuma destas cinco superficies tem folha de arte dedicada na pasta, entao
  // seguem PINTADAS proceduralmente, como o MATO e o PISO ja eram. Cada uma
  // esta documentada com o que ela representa, pra a troca por arte dedicada,
  // quando houver, ser so mexer no pintor.

  // Ponte de tabua sobre o rio do Mapa 2: e o UNICO tile andavel dentro da
  // faixa de agua. Nao colide de proposito.
  {
    nome: 'PONTE',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [138, 104, 66]);
      for (let y = 1; y < T_ARTE; y += 3) im.rect(ox, y, T_ARTE, 1, [104, 76, 46]);
      im.rect(ox, 0, T_ARTE, 1, [176, 142, 96]); // guarda-corpo norte
      im.rect(ox, T_ARTE - 1, T_ARTE, 1, [92, 66, 40]); // sombra sul
      salpico(im, ox, s, [156, 122, 82], 0.85);
    }),
  },
  // Muro do condominio fechado (Mapa 2) e cerca velha do terreno abandonado.
  {
    nome: 'MURO',
    colide: true,
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [188, 182, 168]);
      im.rect(ox, 0, T_ARTE, 2, [214, 210, 198]); // capeamento
      im.rect(ox, T_ARTE - 3, T_ARTE, 3, [148, 142, 130]); // base
      for (let y = 4; y < T_ARTE - 3; y += 4) im.rect(ox, y, T_ARTE, 1, [162, 156, 144]);
      salpico(im, ox, s, [172, 166, 154], 0.8);
    }),
  },
  // Portao do condominio: vao do muro, andavel.
  {
    nome: 'PORTAO',
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [96, 92, 84]);
      for (let x = 1; x < T_ARTE; x += 3) im.rect(ox + x, 2, 1, T_ARTE - 4, [58, 56, 52]);
      im.rect(ox, 2, T_ARTE, 1, [124, 120, 110]);
      im.rect(ox, T_ARTE - 3, T_ARTE, 1, [124, 120, 110]);
    }),
  },
  // Plantacao das fazendas do Mapa 3: leira de terra com o pe de planta em
  // cima. AMBIENTACAO — nao ha mecanica de plantio/colheita nesta leva.
  {
    nome: 'PLANTACAO',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [122, 92, 62]);
      for (let y = 1; y < T_ARTE; y += 4) {
        im.rect(ox, y, T_ARTE, 2, [96, 70, 46]); // sulco
        im.rect(ox, y + 2, T_ARTE, 1, [86, 122, 58]); // muda
      }
      salpico(im, ox, s, [104, 140, 66], 0.86);
    }),
  },
  // Cascalho da pedreira do Mapa 3. AMBIENTACAO — sem mecanica de mineracao.
  {
    nome: 'CASCALHO',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [148, 142, 132]);
      salpico(im, ox, s, [124, 118, 110], 0.62);
      salpico(im, ox, s + 7, [172, 166, 156], 0.72);
      salpico(im, ox, s + 13, [100, 96, 90], 0.86);
    }),
  },
  // Piso da quadra esportiva do Mapa 2. Sem funcao de jogo nesta leva: e chao.
  {
    nome: 'QUADRA',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [176, 108, 78]);
      salpico(im, ox, s, [186, 118, 88], 0.8);
      im.rect(ox, 0, T_ARTE, 1, [162, 96, 68]);
      im.rect(ox, 0, 1, T_ARTE, [162, 96, 68]);
    }),
  },
  // Faixa branca da quadra: usada so na moldura do retangulo de jogo.
  {
    nome: 'QUADRA_LINHA',
    px: pintado((im, ox, s) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [176, 108, 78]);
      salpico(im, ox, s, [186, 118, 88], 0.85);
      im.rect(ox, 7, T_ARTE, 2, [236, 232, 222]);
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
  /**
   * PORTA SOMENTE-NPC. Colide (o jogador trata como parede, andando ou
   * correndo) e ao mesmo tempo carrega `npcAtravessa`, entao a validacao de
   * rota de NPC passa por ela como se nao houvesse nada — ver
   * src/game/colisao.ts.
   *
   * A arte a distingue da porta publica de proposito: batente escuro, folha
   * mais fria e uma plaquinha clara no lugar da macaneta. O jogador tem de ler
   * "area de servico, nao entra" sem precisar esbarrar pra descobrir.
   */
  {
    nome: 'PORTA_NPC',
    colide: true,
    npcAtravessa: true,
    px: pintado((im, ox) => {
      im.rect(ox, 0, T_ARTE, T_ARTE, [56, 48, 44]);
      im.rect(ox + 2, 1, 12, 15, [92, 96, 104]);
      im.rect(ox + 2, 1, 12, 1, [126, 130, 138]);
      im.rect(ox + 3, 3, 10, 5, [74, 78, 86]); // almofada de cima
      im.rect(ox + 3, 10, 10, 4, [74, 78, 86]); // almofada de baixo
      im.rect(ox + 5, 8, 6, 2, [214, 210, 198]); // placa de "privado"
      im.rect(ox + 12, 8, 1, 2, [188, 178, 140]); // macaneta discreta
    }),
  },
];

/** NOME -> gid (1-based, como o Tiled grava nas camadas de tile). */
const GID = Object.fromEntries(TILES.map((t, i) => [t.nome, i + 1]));
/**
 * Entradas de `tileset.tiles` com as propriedades de colisao de cada tile, no
 * formato do Tiled. Sao duas marcas independentes (ver src/game/colisao.ts):
 * `collides` barra o JOGADOR e `npcAtravessa` libera o NPC no MESMO tile.
 */
const PROPRIEDADES_TILE = TILES.flatMap((t, i) => {
  if (t.npcAtravessa && !t.colide) {
    throw new Error(`"${t.nome}": ${PROP_PORTA_NPC} so faz sentido em tile que colide`);
  }
  const properties = [];
  if (t.colide) properties.push({ name: PROP_COLIDE, type: 'bool', value: true });
  if (t.npcAtravessa) properties.push({ name: PROP_PORTA_NPC, type: 'bool', value: true });
  return properties.length ? [{ id: i, properties }] : [];
});

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
  // Grama dos mapas novos. O bairro tem duas leituras de gramado (3:2); a zona
  // rural, uma so, nas 4 rotacoes — e a unica celula da folha que nao traz
  // cenario desenhado dentro.
  grama_bairro: [3, 2].flatMap((peso, v) =>
    [0, 1, 2, 3].map((r) => ({ gid: GID[`GRAMA2_${v}${r}`], peso })),
  ),
  grama_rural: [0, 1, 2, 3].map((r) => ({ gid: GID[`GRAMA3_0${r}`], peso: 1 })),
  plantacao: [{ gid: GID.PLANTACAO, peso: 1 }],
  cascalho: [{ gid: GID.CASCALHO, peso: 1 }],
  quadra: [{ gid: GID.QUADRA, peso: 1 }],
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
  // Vai de borda a borda: a ponta OESTE e por onde se sai pro Mapa 2 (ver
  // `BORDAS`). A ponta leste continua so terminando na mata.
  { nome: 'avenida_h', x: 0, y: 45, w: 120, h: 1 },
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
// Os 11 lotes. Quem esta construido e o que tem interior sai de `CONSTRUCOES` /
// `PRACAS` mais abaixo — aqui fica so a geometria do loteamento.
//
// `uso` separa o que a construcao É, e nao so como ela se chama:
//   moradia  — casa pura, uma cama e um morador (casa_1..casa_6)
//   comercio — salao puro, ninguem mora dentro (mercado, academia)
//   misto    — casa + comercio no MESMO predio e no MESMO interior, sem parede
//              interna: metade e a moradia do dono (com cama), metade e o
//              espaco de trabalho (bar, farmacia)
//   praca    — area externa, sem predio (parque)
// Quem conta como moradia disponivel pro morador vem daqui, entao 'misto' entra
// na mesma validacao de "um NPC por casa" que as seis casas ja usam.
const ZONAS = [
  // casa_1 — a casinha inicial do protagonista. Nesta leva ele MUDOU pro Mapa 2
  // (lote `oficina`), e este lote virou VAGO: o predio continua de pe, mas a
  // porta nao abre mais e nao ha interior. Fica reservado pra uso narrativo
  // futuro (outro morador entrando ali).
  { nome: 'casa_1', classe: 'casa', uso: 'vago', x: 28, y: 12, w: 8, h: 6 },
  { nome: 'casa_2', classe: 'casa', uso: 'moradia', x: 40, y: 12, w: 8, h: 6 },
  { nome: 'casa_3', classe: 'casa', uso: 'moradia', x: 72, y: 12, w: 8, h: 6 },
  { nome: 'casa_4', classe: 'casa', uso: 'moradia', x: 84, y: 12, w: 8, h: 6 },
  { nome: 'casa_5', classe: 'casa', uso: 'moradia', x: 28, y: 75, w: 8, h: 6 },
  { nome: 'casa_6', classe: 'casa', uso: 'moradia', x: 40, y: 75, w: 8, h: 6 },
  { nome: 'mercado', classe: 'mercado', uso: 'comercio', x: 64, y: 50, w: 12, h: 8 },
  { nome: 'academia', classe: 'academia', uso: 'comercio', x: 48, y: 30, w: 10, h: 8 },
  { nome: 'parque', classe: 'parque', uso: 'praca', x: 28, y: 48, w: 20, h: 14 },
  // Servicos: os dois quadrantes livres a leste da avenida vertical. O lote e
  // maior que o de uma casa (10x8 contra 8x6) porque o predio tem duas funcoes
  // dentro, e menor que o do mercado (12x8) porque a area de trabalho e um
  // balcao e nao um salao de gondolas.
  { nome: 'bar', classe: 'bar', uso: 'misto', x: 76, y: 24, w: 10, h: 8 },
  { nome: 'farmacia', classe: 'farmacia', uso: 'misto', x: 80, y: 50, w: 10, h: 8 },
];

/** Lotes onde alguem mora: casa pura mais os mistos (casa + comercio). */
const USOS_DE_MORADIA = new Set(['moradia', 'misto']);
const LOTES_DE_MORADIA = ZONAS.filter((z) => USOS_DE_MORADIA.has(z.uso)).map((z) => z.nome);

/** Lago: retangulo, que e o que um 9-slice sem cantos internos aceita. */
const LAGO = { x: 104, y: 49, w: 11, h: 9 };

/**
 * Acha um lote pelo nome, EM QUALQUER mapa externo, e devolve junto de que mapa
 * ele e. Nome de lote e globalmente unico (`conferirNomesDeLote` cobra isso),
 * entao a busca nao e ambigua.
 */
function loteDe(nome) {
  for (const [mapa, m] of Object.entries(MUNDO)) {
    const z = m.zonas.find((x) => x.nome === nome);
    if (z) return { mapa, zona: z, def: m.construcoes[nome] };
  }
  throw new Error(`lote "${nome}" nao existe em nenhum mapa de MUNDO`);
}

/** Acha uma zona pelo nome; erra alto se o nome nao existir mais. */
function zona(nome) {
  return loteDe(nome).zona;
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
  casa_1: { pegada: { w: 5, h: 4 }, estilo: 0, fechada: true },
  casa_2: { pegada: { w: 5, h: 4 }, interior: 'casa_2', estilo: 1 },
  casa_3: { pegada: { w: 5, h: 4 }, interior: 'casa_3', estilo: 2 },
  casa_4: { pegada: { w: 5, h: 4 }, interior: 'casa_4', estilo: 3 },
  casa_5: { pegada: { w: 5, h: 4 }, interior: 'casa_5', estilo: 4 },
  casa_6: { pegada: { w: 5, h: 4 }, interior: 'casa_6', estilo: 5 },
  // `comercio` marca o lote cuja fachada e COMPOSTA a partir da folha de parede
  // do proprio ramo (ver `ESTILOS_COMERCIO`) e cujo interior sai do gerador de
  // salao, nao do de casa.
  mercado: { pegada: { w: 8, h: 5 }, interior: 'mercado', comercio: true },
  academia: { pegada: { w: 8, h: 5 }, interior: 'academia', comercio: true },
  // Mistos: `misto` diz que o interior sai do gerador combinado (cama de um
  // lado, trabalho do outro, tudo no mesmo comodo) em vez do salao puro.
  bar: { pegada: { w: 8, h: 5 }, interior: 'bar', comercio: true, misto: true },
  farmacia: { pegada: { w: 8, h: 5 }, interior: 'farmacia', comercio: true, misto: true },
};

/** Lotes que sao area externa: praca, sem predio e sem interior. */
const PRACAS = { parque: true, quadra: true };

// ================================================================= MUNDO ==
// A partir desta leva o jogo tem TRES mapas externos, e nao mais um. O que era
// especifico da fazenda (`FAZENDA`, `VIAS`, `ZONAS`, `CONSTRUCOES`) continua
// existindo com o mesmo nome — o Mapa 1 nao mudou de forma — e os mapas novos
// entram como tabelas irmas, registradas em `MUNDO`.
//
// Quem resolve "de que mapa e este lote" e o registro: `zona()`,
// `construcaoDe()` e `construcao()` varrem os tres. Por isso NOME DE LOTE E
// GLOBALMENTE UNICO — a conferencia embaixo reprova se dois mapas repetirem um.

// ------------------------------------------------------- vias em polilinha --
/**
 * Malha viaria dos mapas 2 e 3.
 *
 * O Mapa 1 tem vias RETAS (`VIAS`), o que deixou a cidade com cara de
 * quadriculado. Os mapas novos usam POLILINHA: uma sequencia de pontos ligados
 * por Bresenham, entao o eixo desce em degraus e a rua sai torta de proposito.
 *
 * A faixa de terra sai por DILATACAO quadrada do eixo (raio 1 = faixa de 3
 * tiles), e nao pelo alargamento perpendicular de `faixaDaVia`: num trecho
 * diagonal nao existe "perpendicular" unica, e a dilatacao fecha o degrau sem
 * deixar buraco. O autotile de `pintarVias` continua o mesmo — ele so olha a
 * vizinhanca de 4 do eixo.
 */
const RAIO_FAIXA = 1;

/** Tiles do eixo de uma polilinha, em degraus de Bresenham. */
function tilesDaPolilinha(pontos) {
  const saida = [];
  const vistos = new Set();
  const por1 = (x, y) => {
    const k = `${x},${y}`;
    if (vistos.has(k)) return;
    vistos.add(k);
    saida.push([x, y]);
  };
  for (let i = 0; i < pontos.length - 1; i++) {
    let [x, y] = pontos[i];
    const [x1, y1] = pontos[i + 1];
    const dx = Math.abs(x1 - x);
    const dy = -Math.abs(y1 - y);
    const sx = x < x1 ? 1 : -1;
    const sy = y < y1 ? 1 : -1;
    let erro = dx + dy;
    for (;;) {
      por1(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * erro;
      // move UM eixo por vez: o eixo da via tem de ser conexo por vizinhanca de
      // 4, senao o autotile abre buraco na diagonal
      if (e2 >= dy) {
        erro += dy;
        x += sx;
      } else {
        erro += dx;
        y += sy;
      }
    }
  }
  return saida;
}

/** Eixo (Grade 0/1) de uma lista de polilinhas. */
function eixoDeVias(W, H, vias) {
  const eixo = new Grade(W, H, 0);
  for (const v of vias) for (const [x, y] of tilesDaPolilinha(v.pontos)) eixo.set(x, y, 1);
  return eixo;
}

/** Faixa de terra: o eixo dilatado por `RAIO_FAIXA` em quadrado. */
function faixaDeVias(W, H, vias) {
  const eixo = eixoDeVias(W, H, vias);
  const faixa = new Grade(W, H, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!eixo.get(x, y)) continue;
      for (let j = -RAIO_FAIXA; j <= RAIO_FAIXA; j++) {
        for (let i = -RAIO_FAIXA; i <= RAIO_FAIXA; i++) faixa.set(x + i, y + j, 1);
      }
    }
  }
  return faixa;
}

const linha = (nome, pontos) => ({ nome, pontos });

// ------------------------------------------ Mapa 2 — Bairro da Estacao --
/**
 * Mapa 2 — "Bairro da Estacao" / "Bairro Baixo".
 *
 * Maior que o Mapa 1 (140x110 contra 120x90) e MENOS denso: menos lotes, mais
 * respiro entre eles, e a rua principal descendo torta de leste pra oeste em
 * vez da avenida reta da fazenda.
 *
 * Ligacoes: borda LESTE volta pro Mapa 1; borda SUL, depois da ponte, vai pro
 * Mapa 3.
 */
const BAIRRO = { largura: 140, altura: 110 };

const VIAS_BAIRRO = [
  // rua principal: entra pela borda leste e desce em curva ate a borda oeste
  linha('rua_principal', [
    [139, 55], [122, 55], [108, 49], [92, 47], [78, 50], [66, 54], [52, 57], [36, 63], [20, 66], [1, 66],
  ]),
  // rua da estacao: eixo norte-sul, cruza a principal em (66,54) e segue ate a
  // ponte e a saida pro Mapa 3
  linha('rua_estacao', [[58, 2], [58, 28], [62, 42], [66, 54], [66, 74], [66, 96], [66, 108]]),
  // rua baixa: serve a zona residencial ao sul da principal
  linha('rua_baixa', [[20, 78], [44, 76], [66, 74], [92, 76], [112, 72]]),
  // acesso ao condominio fechado: sobe da principal ate o portao
  linha('rua_condominio', [[104, 48], [104, 42]]),
  // acesso a escola, subindo da principal
  linha('rua_escola', [[26, 65], [26, 36], [42, 30]]),
];

/**
 * Rio da borda inferior. Faixa de agua ONDULADA (a linha do leito varia com x),
 * intransponivel — o unico jeito de passar e a PONTE, que e um tile andavel por
 * cima da agua na coluna da rua da estacao.
 */
const RIO_BAIRRO = {
  y: 88,
  altura: 5,
  /** deslocamento vertical do leito, em tiles, pra o rio nao sair reto */
  onda: (x) => Math.round(2 * Math.sin(x / 11)),
  ponte: { x: 63, w: 7 },
};

/** Linha de topo do rio na coluna `x`. */
const topoDoRio = (x) => RIO_BAIRRO.y + RIO_BAIRRO.onda(x);

/**
 * Condominio fechado: um cluster de lotes cercado por muro, com PORTAO unico ao
 * sul. Os quatro lotes de dentro ficam RESERVADOS (sem construcao) — o objetivo
 * e a densidade residencial, nao mobiliar quatro casas sem morador.
 *
 * O muro NAO e um lote: e desenho na camada `objetos`. Por isso ele pode
 * abracar os quatro lotes sem disparar a conferencia de "lote invade lote".
 */
const CONDOMINIO = { x: 92, y: 20, w: 28, h: 22, portao: { x: 103, w: 3 } };

/** Quadra esportiva: retangulo de piso dentro do lote `quadra`. */
const QUADRA_BAIRRO = { x: 90, y: 60, w: 12, h: 8 };

/** Terreno abandonado: mato, entulho e um resto de cerca. */
const TERRENO_BAIRRO = { x: 109, y: 59, w: 10, h: 7 };

const ZONAS_BAIRRO = [
  // casa+oficina do protagonista: e o predio principal do mapa
  { nome: 'oficina', classe: 'oficina', uso: 'moradia', x: 74, y: 34, w: 12, h: 10 },
  { nome: 'escola', classe: 'escola', uso: 'comercio', x: 30, y: 42, w: 16, h: 11 },
  { nome: 'biblioteca', classe: 'biblioteca', uso: 'comercio', x: 46, y: 44, w: 14, h: 10 },
  { nome: 'quadra', classe: 'quadra', uso: 'praca', x: 88, y: 58, w: 16, h: 12 },
  { nome: 'terreno_baldio', classe: 'terreno', uso: 'vago', x: 108, y: 58, w: 12, h: 9 },
  // predio misterioso: fechado, sem interior
  { nome: 'central', classe: 'servico', uso: 'vago', x: 46, y: 63, w: 8, h: 6 },
  // zona residencial: lotes RESERVADOS, sem construcao e sem morador
  { nome: 'casa_b1', classe: 'casa', uso: 'moradia', x: 14, y: 44, w: 8, h: 6 },
  { nome: 'casa_b2', classe: 'casa', uso: 'moradia', x: 14, y: 52, w: 8, h: 6 },
  { nome: 'casa_b3', classe: 'casa', uso: 'moradia', x: 34, y: 70, w: 8, h: 6 },
  { nome: 'casa_b4', classe: 'casa', uso: 'moradia', x: 56, y: 68, w: 8, h: 6 },
  { nome: 'casa_b5', classe: 'casa', uso: 'moradia', x: 78, y: 66, w: 8, h: 6 },
  { nome: 'casa_b6', classe: 'casa', uso: 'moradia', x: 4, y: 52, w: 8, h: 6 },
  { nome: 'casa_b7', classe: 'casa', uso: 'moradia', x: 30, y: 80, w: 8, h: 5 },
  { nome: 'casa_b8', classe: 'casa', uso: 'moradia', x: 124, y: 62, w: 8, h: 6 },
  // dentro do condominio fechado
  { nome: 'casa_c1', classe: 'casa', uso: 'moradia', x: 95, y: 24, w: 9, h: 7 },
  { nome: 'casa_c2', classe: 'casa', uso: 'moradia', x: 107, y: 24, w: 9, h: 7 },
  { nome: 'casa_c3', classe: 'casa', uso: 'moradia', x: 95, y: 33, w: 9, h: 7 },
  { nome: 'casa_c4', classe: 'casa', uso: 'moradia', x: 107, y: 33, w: 9, h: 7 },
];

const CONSTRUCOES_BAIRRO = {
  oficina: { pegada: { w: 8, h: 5 }, interior: 'oficina', comercio: true },
  escola: { pegada: { w: 10, h: 6 }, interior: 'escola', comercio: true },
  biblioteca: { pegada: { w: 10, h: 6 }, interior: 'biblioteca', comercio: true },
  // `fechada` = predio de pe SEM interior: a porta nao abre, e no lugar dela o
  // mapa poe um objeto de exame com o texto fixo da Central Telefonica.
  central: { pegada: { w: 5, h: 4 }, comercio: true, fechada: true },
};

// ----------------------------------------------------- Mapa 3 — Zona Rural --
/**
 * Mapa 3 — Zona Rural. Grande (150x120) e vazio: terrenos enormes, poucas
 * construcoes, estrada de terra unica serpenteando de norte a sul com tres
 * ramais.
 *
 * Ligacoes: borda NORTE volta pro Mapa 2.
 *
 * RESERVA PRO MAPA 4 (represa): a estrada principal desce ate a borda SUL, nos
 * tiles `RESERVA_MAPA_4`. NADA esta implementado la — nao ha objeto de borda,
 * nao ha mapa de destino e nao ha gancho no codigo do jogo. O que existe e a
 * malha de vias ja desenhada ate esse ponto, pra a etapa do Mapa 4 nao precisar
 * redesenhar a estrada inteira.
 */
const RURAL = { largura: 150, altura: 120 };
/** Tiles da borda sul reservados pra futura ligacao com o Mapa 4 (represa). */
const RESERVA_MAPA_4 = { x: 59, w: 7 };

const VIAS_RURAL = [
  linha('estrada_rural', [
    [66, 1], [66, 18], [74, 34], [82, 52], [78, 74], [68, 92], [62, 110], [62, 118],
  ]),
  linha('ramal_madeireira', [[82, 52], [104, 46], [122, 42]]),
  linha('ramal_fazenda', [[74, 34], [48, 30], [26, 38]]),
  linha('ramal_pedreira', [[78, 74], [100, 70], [118, 72]]),
];

/** Areas AMBIENTADAS do Mapa 3 — visual, sem mecanica nenhuma nesta leva. */
const PLANTIOS_RURAL = [
  { lote: 'fazenda_1', x: 26, y: 46, w: 22, h: 14 },
  { lote: 'fazenda_2', x: 28, y: 74, w: 20, h: 12 },
];
const PEDREIRA_RURAL = { lote: 'pedreira', x: 108, y: 78, w: 22, h: 12 };

const ZONAS_RURAL = [
  { nome: 'madeireira', classe: 'madeireira', uso: 'comercio', x: 110, y: 30, w: 14, h: 10 },
  { nome: 'pedreira', classe: 'pedreira', uso: 'vago', x: 106, y: 76, w: 26, h: 16 },
  { nome: 'fazenda_1', classe: 'fazenda', uso: 'vago', x: 24, y: 44, w: 26, h: 18 },
  { nome: 'fazenda_2', classe: 'fazenda', uso: 'vago', x: 26, y: 72, w: 24, h: 16 },
  { nome: 'casa_rural_1', classe: 'casa', uso: 'moradia', x: 52, y: 66, w: 10, h: 7 },
  { nome: 'casa_rural_2', classe: 'casa', uso: 'moradia', x: 96, y: 30, w: 10, h: 7 },
];

const CONSTRUCOES_RURAL = {
  // A madeireira NAO tem interior: o atendimento e num BALCAO externo, no tile
  // da porta. Foi o caminho mais direto pra ligar a loja de expansao (Parte 5)
  // sem gerar mais um tilemap so pra um balcao.
  madeireira: { pegada: { w: 8, h: 5 }, comercio: true, balcao: true },
};

// -------------------------------------------------------- registro global --
/**
 * Os tres mapas externos do jogo. `grama` e o material de chao de cada um (as
 * folhas novas de grama sao por mapa).
 */
const MUNDO = {
  farm: {
    largura: FAZENDA.largura,
    altura: FAZENDA.altura,
    grama: 'grama',
    zonas: ZONAS,
    construcoes: CONSTRUCOES,
  },
  bairro: {
    largura: BAIRRO.largura,
    altura: BAIRRO.altura,
    grama: 'grama_bairro',
    zonas: ZONAS_BAIRRO,
    construcoes: CONSTRUCOES_BAIRRO,
  },
  rural: {
    largura: RURAL.largura,
    altura: RURAL.altura,
    grama: 'grama_rural',
    zonas: ZONAS_RURAL,
    construcoes: CONSTRUCOES_RURAL,
  },
};

/**
 * BORDAS: as zonas de transicao entre mapas externos.
 *
 * Cada entrada e um retangulo em TILES na beira de um mapa; encostar nele troca
 * o mapa carregado (com fade) e larga o jogador em `destinoTx/destinoTy` do
 * mapa de destino. Elas sao declaradas AOS PARES, e a conferencia cobra que o
 * par exista e que o ponto de chegada de uma caia dentro da outra.
 */
const BORDAS = [
  // Mapa 1 <-> Mapa 2, pela ponta oeste da avenida horizontal da fazenda
  { mapa: 'farm', nome: 'borda_oeste', x: 0, y: 44, w: 2, h: 3, destino: 'bairro', destinoTx: 136, destinoTy: 55 },
  { mapa: 'bairro', nome: 'borda_leste', x: 138, y: 54, w: 2, h: 3, destino: 'farm', destinoTx: 3, destinoTy: 45 },
  // Mapa 2 <-> Mapa 3, pela rua da estacao, DEPOIS da ponte
  { mapa: 'bairro', nome: 'borda_sul', x: 65, y: 108, w: 3, h: 2, destino: 'rural', destinoTx: 66, destinoTy: 4 },
  { mapa: 'rural', nome: 'borda_norte', x: 65, y: 0, w: 3, h: 2, destino: 'bairro', destinoTx: 66, destinoTy: 105 },
];

const bordasDoMapa = (mapa) => BORDAS.filter((b) => b.mapa === mapa);

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


/**
 * Mobiliario do PARQUE, posicionado a mao no calcamento da praca.
 *
 * Nao e sorteado como a flora: praca e coisa DESENHADA, e distribuicao aleatoria
 * de banco e chafariz sai como entulho. As coordenadas sao LOCAIS a `PRACA`
 * (0,0 = canto superior esquerdo do calcamento), entao mover a praca leva o
 * mobiliario junto.
 *
 * Duas regras de layout que o codigo abaixo respeita:
 *
 * - a CALCADA de ligacao entra pelo meio do lado norte (`PRACA.calcada`, 2 tiles
 *   de largura). A faixa dela fica vazia de ponta a ponta, senao o jogador
 *   esbarra num banco logo ao entrar;
 * - o mobiliario mora SO no calcamento. A vegetacao ja e proibida na praca mais
 *   1 tile de folga (ver `bloquear` em `gerarMapaExterno`), entao nada aqui
 *   disputa tile com arvore ou flor.
 *
 * O playground fica no canto leste de proposito: e o ponto que o Luke usa como
 * ancora quando a rotina dele manda "brincar no parque" (ver `npcs.ts`).
 */
const PECAS_PARQUE = [
  // --- lado oeste: agua e estar (colunas 0-3) ---
  { peca: [2, 7], tx: 1, ty: 3, colide: true }, // chafariz
  { peca: [0, 7], tx: 0, ty: 5, colide: true }, // banco virado pro chafariz
  { peca: [2, 1], tx: 0, ty: 1, colide: true }, // lixeira
  { peca: [0, 1], tx: 3, ty: 1, colide: true }, // poste de luz

  // --- lado leste: playground, a ancora do Luke (colunas 6-9) ---
  { peca: [3, 0], tx: 6, ty: 3, colide: true }, // torre com escorregador
  { peca: [3, 1], tx: 6, ty: 5, colide: true }, // balanco
  { peca: [0, 6], tx: 6, ty: 1, colide: true }, // banco de quem fica olhando
  { peca: [0, 2], tx: 9, ty: 1, colide: true }, // poste de luz
];

/** Faixa da calcada de entrada, em coordenadas LOCAIS da praca. */
function corredorDaPraca() {
  return { x0: PRACA.calcada.x - PRACA.x, x1: PRACA.calcada.x - PRACA.x + PRACA.calcada.w - 1 };
}

/**
 * Os objetos de `moveis` do parque, ja em coordenada de mundo. Devolve lista
 * vazia se alguma peca cair fora do calcamento — o que e erro de layout, e o
 * `escreverMapa` reprova alto em vez de deixar banco boiando na grama.
 */
function moveisDoParque() {
  const corredor = corredorDaPraca();
  const pecas = PECAS_PARQUE.map((p) => {
    const { w } = tamanhoDeMovel('parque', p.peca, p.escala);
    const x0 = p.tx;
    const x1 = p.tx + Math.max(1, Math.round(w)) - 1;
    if (p.tx < 0 || p.ty < 0 || p.ty >= PRACA.h + 1 || x1 >= PRACA.w) {
      throw new Error(
        `peca de parque [${p.peca}] em (${p.tx},${p.ty}) sai do calcamento ${PRACA.w}x${PRACA.h}`,
      );
    }
    if (x0 <= corredor.x1 && x1 >= corredor.x0) {
      throw new Error(
        `peca de parque [${p.peca}] em (${p.tx},${p.ty}) tapa a calcada de entrada` +
          ` (colunas ${corredor.x0}-${corredor.x1})`,
      );
    }
    return { ...p, tx: PRACA.x + p.tx, ty: PRACA.y + p.ty - 1 };
  });
  return objetosDeMovel('parque', pecas, 'parque');
}

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
  const { mapa, zona: z, def } = loteDe(nome);
  if (!def) throw new Error(`o lote "${nome}" nao tem construcao`);
  const { w, h } = def.pegada;
  if (w > z.w || h > z.h) throw new Error(`a construcao de "${nome}" nao cabe no lote`);
  const x = z.x + Math.floor((z.w - w) / 2);
  const y = z.y;
  const portaX = x + Math.floor(w / 2);
  const portaY = y + h - 1;
  return { nome, mapa, ...def, x, y, w, h, portaX, portaY, frente: { x: portaX, y: portaY + 1 } };
}

/** Toda construcao de pe do jogo, dos tres mapas externos. */
const CONSTRUIDAS = Object.values(MUNDO).flatMap((m) =>
  Object.keys(m.construcoes).map(construcaoDe),
);

/** So as construcoes de um mapa — e o que cada gerador de mapa desenha. */
const construidasDe = (mapa) => CONSTRUIDAS.filter((c) => c.mapa === mapa);

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



// ------------------------------------------------- portas de comercio --
/**
 * `Portas_v2.png` — a folha de porta de COMERCIO, uma linha por ramo
 * (farmacia, bar/taverna, academia) e quatro estados por linha (fechada, aberta
 * pra esquerda, pra direita, escancarada).
 *
 * Ela NAO sai por grade como a `Portas_v1`: a folha tem uma coluna de rotulo a
 * esquerda ("1) PHARMACY", "2) BAR/TAVERN"...) e uma linha de cabecalho em
 * cima, e a projecao de alfa mistura os dois com a arte. Entao o recorte e por
 * componente conexo, com um piso de tamanho que descarta rotulo e icone e
 * deixa passar so as portas.
 */
const PORTAS_COMERCIO = { arquivo: 'Portas_v2.png', areaMinima: 20000, larguraMinima: 90, alturaMinima: 120, tolerancia: 70 };

const folhaPortasComercio = (() => {
  const img = lerPng(caminhoFolha(PORTAS_COMERCIO.arquivo, false));
  const pecas = blobs(img, PORTAS_COMERCIO.areaMinima).filter(
    (b) => b.w > PORTAS_COMERCIO.larguraMinima && b.h > PORTAS_COMERCIO.alturaMinima,
  );
  const linhas = agruparEmLinhas(pecas, PORTAS_COMERCIO.tolerancia);
  if (linhas.length < 2) {
    throw new Error(
      `${PORTAS_COMERCIO.arquivo}: esperava ao menos 2 linhas de porta, achei ${linhas.length}` +
        ' — a arte mudou de layout?',
    );
  }
  return { arquivo: PORTAS_COMERCIO.arquivo, img, linhas };
})();

/** A porta [linha, estado] da folha de comercio. Estado 0 = fechada. */
function portaDeComercio(linha, estado) {
  const b = folhaPortasComercio.linhas[linha] ? folhaPortasComercio.linhas[linha][estado] : undefined;
  if (!b) {
    const forma = folhaPortasComercio.linhas.map((l) => l.length).join('x');
    throw new Error(
      `${folhaPortasComercio.arquivo}: nao existe porta [${linha},${estado}] (linhas: ${forma})`,
    );
  }
  return b;
}

/**
 * `Portas_predio.png` — folha nova de porta de PREDIO PUBLICO (escola,
 * biblioteca, oficina, madeireira). Mesma situacao da `Portas_v2`: a folha tem
 * rotulo e cabecalho misturados com a arte, entao o recorte e por componente
 * conexo com piso de tamanho, e nao por grade.
 */
const PORTAS_PREDIO = { arquivo: 'Portas_predio.png', areaMinima: 20000, larguraMinima: 90, alturaMinima: 120, tolerancia: 70 };

const folhaPortasPredio = (() => {
  const img = lerPng(caminhoFolha(PORTAS_PREDIO.arquivo, false));
  const pecas = blobs(img, PORTAS_PREDIO.areaMinima).filter(
    (b) => b.w > PORTAS_PREDIO.larguraMinima && b.h > PORTAS_PREDIO.alturaMinima,
  );
  const linhas = agruparEmLinhas(pecas, PORTAS_PREDIO.tolerancia);
  if (linhas.length < 4) {
    throw new Error(
      `${PORTAS_PREDIO.arquivo}: esperava 4 linhas de porta, achei ${linhas.length}` +
        ' — a arte mudou de layout?',
    );
  }
  return { arquivo: PORTAS_PREDIO.arquivo, img, linhas };
})();

/** A porta [linha, indice] da folha de predio. */
function portaDePredio(linha, indice) {
  const b = folhaPortasPredio.linhas[linha]
    ? folhaPortasPredio.linhas[linha][indice]
    : undefined;
  if (!b) {
    const forma = folhaPortasPredio.linhas.map((l) => l.length).join('x');
    throw new Error(
      `${folhaPortasPredio.arquivo}: nao existe porta [${linha},${indice}] (linhas: ${forma})`,
    );
  }
  return b;
}

// ------------------------------------------------- fachada de comercio --
/**
 * Fachada de COMERCIO, composta peca a peca — mesmo metodo das casas
 * (`comporCasa`), com as folhas de parede/porta proprias de cada ramo em vez
 * da arte de fachada pronta.
 *
 * As folhas de comercio ja vem em ELEVACAO FRONTAL: cada painel traz moldura em
 * cima, campo no meio e (na farmacia e no bar) alicerce de pedra embaixo. Entao
 * a composicao nao precisa inventar parede — ela LADRILHA os paineis em duas
 * fileiras e troca o painel do meio pelo letreiro (em cima) e pela porta
 * (embaixo):
 *
 *     [ parede ][ LETREIRO ][ parede ]
 *     [ parede ][  PORTA   ][ parede ]
 *
 * O letreiro e o que mantem cada predio reconhecivel de longe (carrinho no
 * mercado, halter neon na academia, cruz na farmacia, caneca no bar) — sem ele
 * os quatro lotes virariam a mesma caixa cinza e a cidade perderia leitura.
 *
 * `porta` sai da folha do proprio ramo quando ela tem uma (mercado e academia
 * trazem porta de vidro no meio da folha); farmacia e bar puxam de
 * `Portas_v2.png`, que tem uma porta desenhada pra cada um dos dois.
 */
const ESTILOS_COMERCIO = {
  mercado: {
    painel: 'mercado',
    parede: [0, 0],
    letreiro: [1, 0],
    porta: { painel: 'mercado', peca: [3, 3] },
    // teto chapado: mercado e academia sao caixa comercial, nao casa de telha
    telhado: null,
  },
  academia: {
    painel: 'academia',
    parede: [3, 0],
    letreiro: [0, 3],
    porta: { painel: 'academia', peca: [1, 2] },
    telhado: null,
  },
  farmacia: {
    painel: 'farmacia',
    parede: [2, 0],
    letreiro: [0, 0],
    // a folha da farmacia nao tem porta; a linha 0 de Portas_v2 e a dela
    porta: { linha: 0, estado: 0 },
    telhado: 1,
  },
  bar: {
    painel: 'bar',
    parede: [0, 0],
    letreiro: [0, 4],
    // linha 1 de Portas_v2 e a do bar (porta de taverna em arco)
    porta: { linha: 1, estado: 0 },
    telhado: 2,
  },

  // --------------------------------------------------- predios desta leva --
  // Todos usam `Portas_predio.png` (folha nova de porta de predio publico) e a
  // folha de parede do proprio predio. Nenhum tem arte de fachada pronta, entao
  // a composicao segue o mesmo esquema parede/letreiro/porta dos quatro acima.
  // parede lisa creme com rodape, quadro-negro grande como letreiro e porta
  // dupla de vidro: le como escola publica de bairro
  escola: {
    painel: 'escola',
    parede: [0, 0],
    letreiro: [1, 2],
    porta: { predio: [0, 2] },
    telhado: null,
  },
  biblioteca: {
    painel: 'biblioteca',
    parede: [0, 0],
    letreiro: [0, 2],
    porta: { predio: [0, 0] },
    telhado: null,
  },
  // Casa+oficina do protagonista. DECISAO DE COMPOSICAO: nao ha folha de
  // "assistencia tecnica velha" na pasta de arte, entao a fachada sai da
  // alvenaria neutra (`PAredes_predio.png`) no painel mais gasto da folha, com
  // telha de barro por cima — le como puxadinho antigo em vez de loja nova.
  // A PROGRESSAO VISUAL do documento de enredo (sujo -> limpo -> centro
  // comunitario) NAO esta implementada: e gancho futuro, e vai pedir um segundo
  // e um terceiro frame deste mesmo lote.
  oficina: {
    painel: 'predio',
    parede: [1, 1],
    letreiro: [1, 4],
    porta: { predio: [1, 2] },
    telhado: 1,
  },
  madeireira: {
    painel: 'predio',
    parede: [0, 3],
    letreiro: [0, 5],
    porta: { predio: [1, 4] },
    telhado: 1,
  },
  // Central Telefonica Municipal: predio pequeno e FECHADO. A porta da folha
  // entra na composicao so como desenho — no mapa o tile dela colide, entao
  // nao ha como entrar (ver `CONSTRUCOES_BAIRRO`).
  central: {
    painel: 'predio',
    parede: [1, 0],
    letreiro: [1, 5],
    // a "porta" e uma porta de aco baixada: le como predio lacrado ha anos
    porta: { predio: [3, 0] },
    telhado: 2,
  },
};

/** Caixa de um painel [linha, indice] de uma folha de parede de comercio. */
function caixaDePainel(chave, indices) {
  const f = folhasPainel[chave];
  const b = f.linhas[indices[0]] ? f.linhas[indices[0]][indices[1]] : undefined;
  if (!b) {
    const forma = f.linhas.map((l) => l.length).join('x');
    throw new Error(
      `${f.arquivo}: nao existe painel [${indices[0]},${indices[1]}] (linhas: ${forma})`,
    );
  }
  return b;
}

/** Cola uma peca de folha qualquer num retangulo do destino, sem deformar. */
function colarPeca(im, img, caixa, x, y, w, h) {
  colarRet(im, reduzirPara(img, caixa, w, h), w, h, x, y);
}

function comporComercio(estilo, larguraPx, alturaPx) {
  const im = new Img(larguraPx, alturaPx);
  const folhaParede = folhasPainel[estilo.painel];

  const alturaTelhado = estilo.telhado === null ? 0 : Math.round(alturaPx * 0.26);
  const alturaCorpo = alturaPx - alturaTelhado;
  const alturaFileira = Math.round(alturaCorpo / 2);

  // largura da coluna: mantem a proporcao do painel, pra o campo nao esticar
  const cxParede = caixaDePainel(estilo.painel, estilo.parede);
  const colunaIdeal = Math.max(1, Math.round(cxParede.w * (alturaFileira / cxParede.h)));
  // impar, pra sobrar o mesmo numero de colunas de cada lado do letreiro
  let colunas = Math.max(3, Math.round(larguraPx / colunaIdeal));
  if (colunas % 2 === 0) colunas += 1;
  const coluna = Math.ceil(larguraPx / colunas);
  const meio = Math.floor(colunas / 2);

  for (let fileira = 0; fileira < 2; fileira++) {
    const y = alturaTelhado + fileira * alturaFileira;
    const altura = fileira === 0 ? alturaFileira : alturaCorpo - alturaFileira;
    for (let c = 0; c < colunas; c++) {
      const x = c * coluna;
      const w = Math.min(coluna, larguraPx - x);
      if (w <= 0) continue;
      colarPeca(im, folhaParede.img, cxParede, x, y, w, altura);
    }
  }

  // letreiro na fileira de cima, porta na de baixo — os dois no meio
  const xMeio = meio * coluna;
  const larguraMeio = Math.min(coluna, larguraPx - xMeio);
  colarPeca(
    im,
    folhaParede.img,
    caixaDePainel(estilo.painel, estilo.letreiro),
    xMeio,
    alturaTelhado,
    larguraMeio,
    alturaFileira,
  );

  const alturaPorta = alturaCorpo - alturaFileira;
  const yPorta = alturaTelhado + alturaFileira;
  if (estilo.porta.predio) {
    // porta da folha `Portas_predio.png`: mesmo encaixe pela ALTURA da porta de
    // comercio, so muda a folha de origem
    const cx = portaDePredio(estilo.porta.predio[0], estilo.porta.predio[1]);
    const lp = Math.max(1, Math.min(larguraMeio, Math.round(cx.w * (alturaPorta / cx.h))));
    colarPeca(
      im,
      folhaPortasPredio.img,
      cx,
      xMeio + Math.round((larguraMeio - lp) / 2),
      yPorta,
      lp,
      alturaPorta,
    );
  } else if (estilo.porta.painel) {
    colarPeca(
      im,
      folhasPainel[estilo.porta.painel].img,
      caixaDePainel(estilo.porta.painel, estilo.porta.peca),
      xMeio,
      yPorta,
      larguraMeio,
      alturaPorta,
    );
  } else {
    // porta de `Portas_v2`: a arte e mais alta que larga, entao ela e encaixada
    // pela ALTURA e centrada na coluna, com a parede aparecendo dos lados
    const cx = portaDeComercio(estilo.porta.linha, estilo.porta.estado);
    const lp = Math.max(1, Math.min(larguraMeio, Math.round(cx.w * (alturaPorta / cx.h))));
    colarPeca(
      im,
      folhaPortasComercio.img,
      cx,
      xMeio + Math.round((larguraMeio - lp) / 2),
      yPorta,
      lp,
      alturaPorta,
    );
  }

  // telhado, onde o ramo pede: farmacia e bar sao construcao de vila e leem
  // melhor com telha; mercado e academia ficam com a platibanda do proprio painel
  if (estilo.telhado !== null) {
    const cTelhado = celulaJusta('telhados', 0, estilo.telhado);
    const passo = Math.max(1, Math.round(cTelhado.w * (alturaTelhado / cTelhado.h)));
    const px = reduzirPara(folhas.telhados.img, cTelhado, passo, alturaTelhado);
    for (let dx = 0; dx < larguraPx; dx += passo) {
      colarRet(im, px, passo, alturaTelhado, dx, 0);
    }
    const sombra = Math.max(1, Math.round(alturaPx * 0.015));
    for (let y = alturaTelhado; y < alturaTelhado + sombra; y++) {
      for (let x = 0; x < larguraPx; x++) im.set(x, y, [38, 26, 20, 170]);
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
    if (c.comercio) {
      return { nome: c.nome, im: comporComercio(ESTILOS_COMERCIO[c.nome], larguraPx, alturaPx) };
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

/**
 * Catalogo de mobilia COMPRAVEL, pro sistema de expansao de casa.
 *
 * A lista de pecas e os precos moram em src/game/casa.ts (e codigo de jogo, nao
 * de arte). O que sai daqui sao as MEDIDAS: atlas, frame e tamanho em tiles de
 * cada peca, lidos da propria folha. Assim o jogo posiciona e valida a pegada
 * com o mesmo numero que a conferencia de interior usa, sem ninguem repetir
 * medida a mao.
 */
function gerarCatalogoMobilia() {
  const saida = {};
  for (const item of CATALOGO_MOBILIA) {
    if (saida[item.id]) throw new Error(`catalogo de mobilia: id repetido "${item.id}"`);
    const def = MOVEIS_CASA[item.movel];
    if (!def) {
      throw new Error(
        `catalogo de mobilia: a peca "${item.id}" aponta pra "${item.movel}", que nao existe ` +
          'em MOVEIS_CASA',
      );
    }
    const { w, h } = tamanhoDeMovel(def.folha, def.peca, def.escala ?? 1);
    saida[item.id] = {
      atlas: `moveis_${def.folha}`,
      frame: nomePeca(def.peca[0], def.peca[1]),
      larguraTiles: +w.toFixed(3),
      alturaTiles: +h.toFixed(3),
      solido: def.solido === true,
      chao: def.chao === true,
    };
  }
  escrever(join(SPRITES, 'mobilia.json'), JSON.stringify(saida, null, 1));
  return saida;
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
        tiles: PROPRIEDADES_TILE,
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
function gerarFlora(W, H, via, ocupado, opcoes = {}) {
  // Cada mapa tem a sua densidade e a sua semente: sem deslocar a semente, o
  // mesmo (x,y) sortearia a mesma arvore nos tres mapas, e os trechos que
  // coincidem sairiam identicos.
  const semente = opcoes.semente ?? SEMENTE;
  const dens = opcoes.densidades ?? { beira: 0.55, perto: 0.1, longe: 0.03 };
  const densPedra = opcoes.pedra ?? 0.028;
  const densFlor = opcoes.flor ?? 0.03;
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
      const densidade = beira < 3 ? dens.beira : beira < 9 ? dens.perto : dens.longe;

      // folga 1 = nenhuma outra arvore na vizinhanca 3x3, senao vira parede
      if (hash01(x, y, semente + 101) < densidade && livre(x, y, 1)) {
        const especie = Math.floor(hash01(x, y, semente + 202) * especiesArvore) % especiesArvore;
        const estagio =
          ARVORE_ESTAGIOS[Math.floor(hash01(x, y, semente + 303) * ARVORE_ESTAGIOS.length)];
        // desloca dentro do tile pra mata nao virar grade
        const dx = (hash01(x, y, semente + 404) - 0.5) * T * 0.7;
        const dy = (hash01(x, y, semente + 505) - 0.5) * T * 0.7;
        arvores.push(
          ponto(`arvore_${arvores.length}`, 'arvore', (x + 0.5) * T + dx, (y + 1) * T + dy, {
            especie,
            estagio,
          }),
        );
        ocupado.add(`${x},${y}`); // reserva o tile: garante o espacamento
        continue; // arvore, pedra e flor nao dividem tile
      }

      if (hash01(x, y, semente + 121) < densPedra && livre(x, y, 0)) {
        // sorteio puxado pro comeco da lista (que esta ordenada do menor pro
        // maior): matacao e raro, pedrisco e comum
        const indice = Math.min(
          totalPedras - 1,
          Math.floor(hash01(x, y, semente + 232) ** 2.2 * totalPedras),
        );
        const dx = (hash01(x, y, semente + 343) - 0.5) * T * 0.6;
        const dy = (hash01(x, y, semente + 454) - 0.5) * T * 0.6;
        pedras.push(
          ponto(`pedra_${pedras.length}`, 'pedra', (x + 0.5) * T + dx, (y + 1) * T + dy, {
            indice,
            alturaTiles: alturaPedraTiles(indice),
          }),
        );
        ocupado.add(`${x},${y}`);
        continue;
      }

      if (hash01(x, y, semente + 606) < densFlor && livre(x, y, 0)) {
        const folha = hash01(x, y, semente + 707) < 0.5 ? 'v1' : 'v2';
        const especies = folhas[`flores_${folha}`].rows.length;
        const especie = Math.floor(hash01(x, y, semente + 808) * especies) % especies;
        const estagio =
          FLOR_ESTAGIOS[Math.floor(hash01(x, y, semente + 909) * FLOR_ESTAGIOS.length)];
        const dx = (hash01(x, y, semente + 111) - 0.5) * T * 0.6;
        const dy = (hash01(x, y, semente + 222) - 0.5) * T * 0.6;
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
  // vao na mata da borda: e por ele que se atravessa pro Mapa 2
  for (const b of bordasDoMapa('farm')) obj.rect(b.x, b.y, b.w, b.h, 0);
  pintarLago(obj, LAGO);

  // Pegada de cada construcao: PAREDE colide, PORTA nao. O sprite da fachada
  // cobre a pegada inteira por cima, entao a colisao continua vindo dos tiles —
  // nenhuma maquina nova, o mesmo caminho que casa_1 ja usava.
  for (const c of construidasDe('farm')) {
    obj.rect(c.x, c.y, c.w, c.h, GID.PAREDE);
    // lote FECHADO (a casa_1 desativada) fica so com parede: a porta desenhada
    // na fachada nao tem tile andavel atras dela
    if (c.interior) obj.set(c.portaX, c.portaY, GID.PORTA);
  }

  const interativos = [
    objeto('placa_teste', 'placa', CENTRO.x - 3, CENTRO.y + 3),
    objeto('pickup_cabo_usb_1', 'item', CENTRO.x - 2, CENTRO.y, { itemId: 'cabo_usb' }),
    objeto('pickup_cabo_usb_2', 'item', CENTRO.x + 2, CENTRO.y, { itemId: 'cabo_usb' }),
    ...construidasDe('farm').map((c) => {
      // predio desativado: em vez de porta, um objeto de exame na frente dela
      if (!c.interior) {
        return objeto(`aviso_${c.nome}`, 'placa', c.portaX, c.portaY + 1, { aviso: c.nome });
      }
      // um tile acima da saida DAQUELE interior, ja dentro. Sai da geometria do
      // proprio interior (que nem sempre tem 16x12: o salao e mais largo, o
      // misto e mais fundo), senao entrar num predio grande larga o jogador no
      // meio do comodo em vez de na porta.
      const entrada = entradaDoInterior(c.interior);
      return objeto(`porta_${c.nome}`, 'porta', c.portaX, c.portaY, {
        destino: c.interior,
        destinoTx: entrada.x,
        destinoTy: entrada.y,
      });
    }),
  ];

  // o sprite da fachada e um objeto da camada `construcoes`: o jogo posiciona
  // pelo rodape da pegada e ordena profundidade por y, como a flora
  const fachadas = construidasDe('farm').map((c) =>
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
        uso: z.uso,
        moradia: USOS_DE_MORADIA.has(z.uso),
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
  for (const b of bordasDoMapa('farm')) bloquear(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
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
        // o parque e o unico mobiliario do mapa externo; a cena le esta camada
        // com o MESMO `criarMoveis` dos interiores
        camadaObjetos('moveis', 8, moveisDoParque()),
        camadaObjetos('bordas', 9, objetosDeBorda('farm')),
      ],
      ts,
    ),
    contagem: { arvores: arvores.length, pedras: pedras.length, flores: flores.length },
  };
}


// ==================================================== mapas externos novos ==
/**
 * Base comum dos mapas externos 2 e 3: grama do mapa, malha de vias em
 * polilinha, moldura de mata na borda e os vaos das zonas de transicao.
 *
 * O Mapa 1 continua com `gerarFazenda`, que e anterior a este caminho e usa
 * vias retas. Nao vale a pena reescrever a fazenda so pra ela passar por aqui:
 * o resultado seria o mesmo mapa com risco de regressao.
 */
function baseExterna(chave, vias) {
  const m = MUNDO[chave];
  const W = m.largura;
  const H = m.altura;
  const chao = new Grade(W, H);
  const caminhos = new Grade(W, H);
  const obj = new Grade(W, H);

  chao.rect(0, 0, W, H, de(m.grama));

  // 1a passada: faixa de terra batida (o eixo dilatado). 2a: a trilha clara.
  const faixa = faixaDeVias(W, H, vias);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (faixa.get(x, y)) caminhos.set(x, y, variante('terra', x, y));
    }
  }
  pintarVias(caminhos, eixoDeVias(W, H, vias));

  obj.moldura(GID.MATO);
  // as zonas de transicao sao buracos na moldura: e por elas que se sai do mapa
  for (const b of bordasDoMapa(chave)) obj.rect(b.x, b.y, b.w, b.h, 0);

  return { m, W, H, chao, caminhos, obj, faixa };
}

/** Objetos da camada `bordas` de um mapa externo. */
function objetosDeBorda(chave) {
  return bordasDoMapa(chave).map((b) =>
    objeto(
      b.nome,
      'borda',
      b.x,
      b.y,
      { destino: b.destino, destinoTx: b.destinoTx, destinoTy: b.destinoTy },
      b.w,
      b.h,
    ),
  );
}

/**
 * Pegada + porta + fachada + objeto interativo de cada construcao de um mapa.
 *
 * Ha tres formas de construcao agora:
 *  - com INTERIOR  — a porta e um tile andavel e vira objeto `porta`;
 *  - com BALCAO    — sem interior; a porta vira objeto `expansao` (a madeireira,
 *                    que atende do lado de fora);
 *  - FECHADA       — sem interior e sem servico; a porta e PAREDE e no lugar
 *                    dela fica um objeto `placa` de exame (a central telefonica).
 */
function predionosDoMapa(chave, obj) {
  const interativos = [];
  const fachadas = [];
  for (const c of construidasDe(chave)) {
    obj.rect(c.x, c.y, c.w, c.h, GID.PAREDE);
    if (c.interior) {
      obj.set(c.portaX, c.portaY, GID.PORTA);
      const entrada = entradaDoInterior(c.interior);
      interativos.push(
        objeto(`porta_${c.nome}`, 'porta', c.portaX, c.portaY, {
          destino: c.interior,
          destinoTx: entrada.x,
          destinoTy: entrada.y,
        }),
      );
    } else if (c.balcao) {
      // balcao: o tile da porta continua andavel (o jogador encosta nele), mas
      // quem responde ao [E] e a loja de expansao de casa
      obj.set(c.portaX, c.portaY, GID.PORTA);
      interativos.push(objeto(`balcao_${c.nome}`, 'expansao', c.portaX, c.portaY, {}));
    } else {
      interativos.push(
        objeto(`aviso_${c.nome}`, 'placa', c.portaX, c.portaY + 1, { aviso: c.nome }),
      );
    }
    fachadas.push(
      ponto(c.nome, 'fachada', (c.x + c.w / 2) * T, (c.y + c.h) * T, { frame: c.nome }),
    );
  }
  return { interativos, fachadas };
}

/** Objetos da camada `zonas` de um mapa externo. */
function objetosDeZona(chave) {
  const m = MUNDO[chave];
  return m.zonas.map((z) => {
    const c = m.construcoes[z.nome];
    return objeto(
      z.nome,
      z.classe,
      z.x,
      z.y,
      {
        tipo: z.classe,
        uso: z.uso,
        moradia: USOS_DE_MORADIA.has(z.uso),
        construida: Boolean(c) || Boolean(PRACAS[z.nome]),
        ...(c?.interior ? { mapaInterior: c.interior } : {}),
      },
      z.w,
      z.h,
    );
  });
}

/**
 * Entulho: pedras soltas espalhadas de proposito numa area (pedreira, terreno
 * abandonado). Diferente da flora, que sorteia o mapa inteiro, aqui a area e
 * dada e a densidade e alta — e o que faz a pedreira LER como pedreira sem
 * precisar de arte nova.
 */
function entulhoEm(prefixo, r, semente, densidade, ocupado) {
  const pedras = [];
  const total = folhaPedras.pedras.length;
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (ocupado.has(`${x},${y}`)) continue;
      if (hash01(x, y, semente) >= densidade) continue;
      const indice = Math.min(total - 1, Math.floor(hash01(x, y, semente + 11) ** 1.4 * total));
      const dx = (hash01(x, y, semente + 22) - 0.5) * T * 0.6;
      const dy = (hash01(x, y, semente + 33) - 0.5) * T * 0.6;
      pedras.push(
        ponto(`${prefixo}_${pedras.length}`, 'pedra', (x + 0.5) * T + dx, (y + 1) * T + dy, {
          indice,
          alturaTiles: alturaPedraTiles(indice),
        }),
      );
      ocupado.add(`${x},${y}`);
    }
  }
  return pedras;
}

/** Bloqueia um retangulo pra flora (helper compartilhado pelos mapas novos). */
function bloquearEm(ocupado, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) ocupado.add(`${i},${j}`);
}

// ------------------------------------------------------------- Mapa 2 --
function gerarBairro(ts) {
  const { W, H, chao, caminhos, obj, faixa } = baseExterna('bairro', VIAS_BAIRRO);

  // --- rio ondulado na faixa de baixo, com a ponte na coluna da rua ---
  const ponte = RIO_BAIRRO.ponte;
  for (let x = 0; x < W; x++) {
    const topo = topoDoRio(x);
    for (let j = 0; j < RIO_BAIRRO.altura; j++) {
      const y = topo + j;
      const naPonte = x >= ponte.x && x < ponte.x + ponte.w;
      if (naPonte) {
        obj.set(x, y, GID.PONTE);
        continue;
      }
      const linhaAgua = j === 0 ? 0 : j === RIO_BAIRRO.altura - 1 ? 2 : 1;
      obj.set(x, y, GID_AGUA[linhaAgua][1] ?? variante('agua_centro', x, y));
    }
  }
  // as cabeceiras: 1 tile de tabua de cada lado, pra a ponte nao "comecar" na agua
  for (let x = ponte.x; x < ponte.x + ponte.w; x++) {
    obj.set(x, topoDoRio(x) - 1, GID.PONTE);
    obj.set(x, topoDoRio(x) + RIO_BAIRRO.altura, GID.PONTE);
  }

  // --- muro do condominio fechado, com portao unico ao sul ---
  const cd = CONDOMINIO;
  obj.rect(cd.x, cd.y, cd.w, 1, GID.MURO);
  obj.rect(cd.x, cd.y + cd.h - 1, cd.w, 1, GID.MURO);
  obj.rect(cd.x, cd.y, 1, cd.h, GID.MURO);
  obj.rect(cd.x + cd.w - 1, cd.y, 1, cd.h, GID.MURO);
  obj.rect(cd.portao.x, cd.y + cd.h - 1, cd.portao.w, 1, GID.PORTAO);

  // --- quadra esportiva: piso na camada de caminhos, com a moldura marcada ---
  const q = QUADRA_BAIRRO;
  for (let y = q.y; y < q.y + q.h; y++) {
    for (let x = q.x; x < q.x + q.w; x++) {
      const naLinha = y === q.y || y === q.y + q.h - 1 || x === q.x || x === q.x + q.w - 1;
      caminhos.set(x, y, naLinha ? GID.QUADRA_LINHA : GID.QUADRA);
    }
  }
  // calcada ligando a quadra a rua baixa, senao ela fica ilhada no mato
  const meioQuadra = q.x + Math.floor(q.w / 2);
  for (let y = q.y + q.h; y <= 74; y++) {
    caminhos.set(meioQuadra, y, variante('calcada', meioQuadra, y));
    caminhos.set(meioQuadra + 1, y, variante('calcada', meioQuadra + 1, y));
  }

  // --- terreno abandonado: chao pelado, cerca velha com falhas ---
  const tb = TERRENO_BAIRRO;
  for (let y = tb.y; y < tb.y + tb.h; y++) {
    for (let x = tb.x; x < tb.x + tb.w; x++) caminhos.set(x, y, variante('terra', x, y));
  }
  for (let x = tb.x; x < tb.x + tb.w; x++) {
    // cerca com falha: 1 tile em cada 4 esta caido
    if (x % 4 !== 1) obj.set(x, tb.y, GID.MURO);
    if (x % 4 !== 3) obj.set(x, tb.y + tb.h - 1, GID.MURO);
  }
  for (let y = tb.y; y < tb.y + tb.h; y++) {
    if (y % 3 !== 0) obj.set(tb.x, y, GID.MURO);
    if (y % 3 !== 2) obj.set(tb.x + tb.w - 1, y, GID.MURO);
  }

  const { interativos, fachadas } = predionosDoMapa('bairro', obj);
  const bordas = objetosDeBorda('bairro');
  const zonas = objetosDeZona('bairro');

  // --- o que a flora tem de respeitar ---
  const ocupado = new Set();
  for (const z of MUNDO.bairro.zonas) bloquearEm(ocupado, z.x - 1, z.y - 1, z.w + 2, z.h + 2);
  bloquearEm(ocupado, cd.x - 1, cd.y - 1, cd.w + 2, cd.h + 2);
  bloquearEm(ocupado, q.x - 1, q.y - 1, q.w + 2, q.h + 2);
  bloquearEm(ocupado, meioQuadra - 1, q.y + q.h, 4, 16);
  // rio + ponte: nada de arvore em cima da agua nem na cabeceira
  for (let x = 0; x < W; x++) bloquearEm(ocupado, x, topoDoRio(x) - 2, 1, RIO_BAIRRO.altura + 4);
  for (const b of bordasDoMapa('bairro')) bloquearEm(ocupado, b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  for (const it of interativos) bloquearEm(ocupado, it.x / T - 1, it.y / T - 1, 3, 3);

  // entulho DENTRO do terreno abandonado (fora do bloqueio geral do lote, que
  // so vale pra flora sorteada)
  const entulho = entulhoEm('entulho', tb, SEMENTE + 1701, 0.22, new Set());

  // Menos denso que o Mapa 1 de proposito: o bairro e periferia urbana, nao
  // mata. Semente deslocada pra o desenho nao repetir o da fazenda.
  const flora = gerarFlora(W, H, faixa, ocupado, {
    semente: SEMENTE + 1000,
    densidades: { beira: 0.42, perto: 0.05, longe: 0.014 },
    pedra: 0.012,
    flor: 0.022,
  });

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
        camadaObjetos('flora', 6, [...flora.arvores, ...flora.pedras, ...entulho, ...flora.flores]),
        camadaObjetos('construcoes', 7, fachadas),
        camadaObjetos('bordas', 8, bordas),
      ],
      ts,
    ),
    contagem: {
      arvores: flora.arvores.length,
      pedras: flora.pedras.length + entulho.length,
      flores: flora.flores.length,
    },
  };
}

// ------------------------------------------------------------- Mapa 3 --
function gerarRural(ts) {
  const { W, H, chao, caminhos, obj, faixa } = baseExterna('rural', VIAS_RURAL);

  // --- plantacoes: leira de terra dentro dos lotes de fazenda ---
  for (const pl of PLANTIOS_RURAL) {
    for (let y = pl.y; y < pl.y + pl.h; y++) {
      for (let x = pl.x; x < pl.x + pl.w; x++) {
        // deixa uma carreira de grama a cada 5 linhas: e o carreador da roca
        caminhos.set(x, y, (y - pl.y) % 5 === 4 ? variante('terra', x, y) : GID.PLANTACAO);
      }
    }
  }

  // --- pedreira: cascalho no chao; o entulho de pedra entra na camada flora ---
  const pd = PEDREIRA_RURAL;
  for (let y = pd.y; y < pd.y + pd.h; y++) {
    for (let x = pd.x; x < pd.x + pd.w; x++) caminhos.set(x, y, GID.CASCALHO);
  }

  const { interativos, fachadas } = predionosDoMapa('rural', obj);
  const bordas = objetosDeBorda('rural');
  const zonas = objetosDeZona('rural');

  const ocupado = new Set();
  for (const z of MUNDO.rural.zonas) bloquearEm(ocupado, z.x - 1, z.y - 1, z.w + 2, z.h + 2);
  for (const b of bordasDoMapa('rural')) bloquearEm(ocupado, b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  // corredor reservado pro Mapa 4: fica limpo de arvore, pra a ligacao futura
  // nao precisar derrubar mata gerada
  bloquearEm(ocupado, RESERVA_MAPA_4.x, H - 6, RESERVA_MAPA_4.w, 6);
  for (const it of interativos) bloquearEm(ocupado, it.x / T - 1, it.y / T - 1, 3, 3);

  const entulho = entulhoEm('cascalho', pd, SEMENTE + 2702, 0.3, new Set());

  // Zona rural: densidade de mata parecida com a da fazenda no miolo, mas com
  // os lotes enormes vazios ela le como campo aberto.
  const flora = gerarFlora(W, H, faixa, ocupado, {
    semente: SEMENTE + 2000,
    densidades: { beira: 0.5, perto: 0.08, longe: 0.026 },
    pedra: 0.02,
    flor: 0.03,
  });

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
        camadaObjetos('flora', 6, [...flora.arvores, ...flora.pedras, ...entulho, ...flora.flores]),
        camadaObjetos('construcoes', 7, fachadas),
        camadaObjetos('bordas', 8, bordas),
      ],
      ts,
    ),
    contagem: {
      arvores: flora.arvores.length,
      pedras: flora.pedras.length + entulho.length,
      flores: flora.flores.length,
    },
  };
}

// ------------------------------------------------------------------ moveis --
/**
 * Caixa de colisao de um movel, em fracao do sprite. Espelha `MOVEL_CORPO` da
 * FarmScene: o corpo fica na BASE do sprite, entao da pra andar atras da peca
 * alta em vez de ela virar um bloco. Esta repetido aqui porque a conferencia de
 * acesso (flood-fill) roda na geracao, antes de o jogo existir — se um dos dois
 * mudar, a conferencia deixa de valer.
 */
const CORPO_MOVEL = { largura: 0.92, altura: 0.5 };

/**
 * Tamanho de uma peca em TILES, pela escala unica da sua folha. O fator e um
 * multiplicador opcional da peca: serve pra arte desenhada em perspectiva forte,
 * onde o retangulo do PNG e bem menor que a pegada real da peca no chao. O
 * tapete e o caso — na escala compartilhada ele sai mais estreito que a mesa de
 * centro que deveria ficar em cima dele.
 */
function tamanhoDeMovel(chaveFolha, [linha, indice], fator = 1) {
  const u = folhasMoveis[chaveFolha];
  if (!u) throw new Error(`folha de movel "${chaveFolha}" nao existe`);
  const b = peca(chaveFolha, linha, indice);
  return { w: (b.w * u.escala * fator) / T, h: (b.h * u.escala * fator) / T };
}

/**
 * Objetos da camada `moveis` a partir de uma lista declarativa. Cada item e
 * `{ peca: [linha, indice], tx, ty, folha?, colide? }`; `folha` cai em
 * `folhaPadrao` quando omitida, que e o caso dos interiores de comercio (uma
 * folha so). `tx`/`ty` sao o tile do canto ESQUERDO-INFERIOR: o movel cresce
 * pra cima e pra direita, como a flora.
 */
function objetosDeMovel(prefixo, pecas, folhaPadrao) {
  return pecas.map((p, i) => {
    const chave = p.folha ?? folhaPadrao;
    const { w, h } = tamanhoDeMovel(chave, p.peca, p.escala);
    return ponto(`movel_${prefixo}_${i}`, 'movel', (p.tx + w / 2) * T, (p.ty + 1) * T, {
      atlas: `moveis_${chave}`,
      frame: nomePeca(...p.peca),
      alturaTiles: +h.toFixed(3),
      colide: p.colide !== false,
      // tapete: fica uma camada abaixo do resto, senao ele cobre o sofa que
      // deveria estar EM CIMA dele — os dois tem a base na mesma linha, e sem
      // isto o desempate e a ordem da lista
      chao: p.chao === true,
    });
  });
}

/** Retangulo em TILES que o corpo de um movel solido bloqueia. */
function corpoDeMovel(p, folhaPadrao) {
  const { w, h } = tamanhoDeMovel(p.folha ?? folhaPadrao, p.peca, p.escala);
  const centro = p.tx + w / 2;
  const largura = w * CORPO_MOVEL.largura;
  const altura = h * CORPO_MOVEL.altura;
  return { x0: centro - largura / 2, x1: centro + largura / 2, y0: p.ty + 1 - altura, y1: p.ty + 1 };
}

// ---------------------------------------------------------------- interiores --
/**
 * Espessura da parede de CIMA no interior de casa, em tiles. Com 1 tile nao ha
 * superficie pra pendurar nada: o quadro sai flutuando no meio do chao. Com 2 a
 * peca de parede fica com a base na borda de baixo da faixa e le como pendurada.
 * O movel alto encostado na parede tambem passa a cobri-la, que e o certo.
 */
const PAREDE_TOPO = 2;

/**
 * Catalogo de mobilia, agrupado POR TIPO DE COMODO.
 *
 * O agrupamento nao e so arrumacao: e o contrato. `pecasDeCatalogo` cobra que
 * uma peca de `quarto` so apareca em comodo de quarto, uma de `cozinha` so na
 * cozinha, e assim por diante — entao nao ha como voltar ao que havia antes,
 * que era a mesma mobilia generica de sala espalhada nos quatro comodos, com a
 * cozinha "resolvida" por uma mesa de jantar e o banheiro por uma comoda.
 *
 * `comum` e a categoria que passa em qualquer comodo: tapete, quadro, planta,
 * relogio, caminha de pet. Sao pecas sem funcao de comodo — decoram tanto um
 * quarto quanto um corredor.
 *
 * O criterio de COLIDIR e o mesmo de sempre: colide o que tem volume pra
 * esbarrar (cama, guarda-roupa, geladeira, fogao, sofa, banheira, box). Nao
 * colide o que esta deitado no chao (tapete, caminha de pet), pendurado na
 * parede (quadro, espelho, prateleira, chuveiro, toalheiro) ou e leve o
 * bastante pra passar raspando (vaso, cesto, banquinho, frascos). Cada peca
 * solida a mais e um tile a menos pra circular.
 *
 * `chao: true` poe a peca na camada de baixo — e o tapete, que pode ter movel
 * em cima sem que a conferencia trate isso como sobreposicao.
 *
 * As folhas trazem muito mais peca do que isto; ficou de fora o que nao cabe em
 * casa (utensilio solto de bancada, aquario, cerca, area externa).
 */
const CATALOGO_POR_COMODO = {
  quarto: {
    // --- dormir e guardar ---
    cama_solteiro: { folha: 'quarto', peca: [0, 0], solido: true },
    cama_casal: { folha: 'quarto', peca: [0, 1], solido: true },
    criado_mudo: { folha: 'quarto', peca: [0, 2], solido: true },
    comoda_quarto: { folha: 'quarto', peca: [0, 3], solido: true },
    guarda_roupa: { folha: 'quarto', peca: [0, 4], solido: true },
    guarda_roupa_madeira: { folha: 'mobilia_v2', peca: [0, 8], solido: true },
    cabeceira_abajur: { folha: 'mobilia_v2', peca: [1, 1], solido: true },
    bau: { folha: 'quarto', peca: [5, 0], solido: true },
    // --- estudar e arrumar-se ---
    estante_quarto: { folha: 'quarto', peca: [2, 0], solido: true },
    escrivaninha: { folha: 'quarto', peca: [2, 1], solido: true },
    penteadeira: { folha: 'quarto', peca: [2, 2], solido: true },
    recamier: { folha: 'quarto', peca: [5, 1], solido: true },
    setup_gamer: { folha: 'eletronicos', peca: [2, 0], solido: true },
    mesa_notebook: { folha: 'eletronicos', peca: [2, 3], solido: true },
    // --- leves e de parede ---
    prateleira_livros: { folha: 'quarto', peca: [1, 0], solido: false },
    abajur_pe: { folha: 'quarto', peca: [2, 3], solido: false },
    abajur_mesa: { folha: 'quarto', peca: [2, 4], solido: false },
    quadro_montanha: { folha: 'quarto', peca: [2, 5], solido: false },
    despertador: { folha: 'quarto', peca: [3, 0], solido: false },
    toalhas_quarto: { folha: 'quarto', peca: [4, 0], solido: false },
    tapete_quarto: { folha: 'quarto', peca: [5, 2], solido: false, chao: true },
    planta_quarto: { folha: 'quarto', peca: [5, 3], solido: false },
    cesto_roupa: { folha: 'quarto', peca: [5, 4], solido: false },
    almofadas_pilha: { folha: 'quarto', peca: [6, 0], solido: false },
    girassois: { folha: 'quarto', peca: [7, 0], solido: false },
    livros_soltos: { folha: 'quarto', peca: [7, 1], solido: false },
    vela_quarto: { folha: 'quarto', peca: [7, 2], solido: false },
    quadrinho: { folha: 'quarto', peca: [7, 3], solido: false },
    difusor_quarto: { folha: 'quarto', peca: [7, 4], solido: false },
    manta_dobrada: { folha: 'quarto', peca: [7, 6], solido: false },
    ar_condicionado: { folha: 'eletronicos', peca: [5, 4], solido: false },
  },

  cozinha: {
    // --- os quatro moveis que fazem uma cozinha ser cozinha ---
    geladeira: { folha: 'cozinha', peca: [1, 0], solido: true },
    fogao: { folha: 'cozinha', peca: [1, 1], solido: true },
    pia: { folha: 'cozinha', peca: [1, 2], solido: true },
    bancada: { folha: 'cozinha', peca: [1, 3], solido: true },
    // --- guardar ---
    armario_aereo: { folha: 'cozinha', peca: [0, 0], solido: true },
    despenseiro: { folha: 'cozinha', peca: [2, 0], solido: true },
    cristaleira: { folha: 'cozinha', peca: [2, 1], solido: true },
    // --- comer ---
    ilha: { folha: 'cozinha', peca: [3, 0], solido: true },
    mesa_de_jantar: { folha: 'cozinha', peca: [3, 1], solido: true },
    // --- leves e de parede ---
    microondas: { folha: 'cozinha', peca: [4, 0], solido: false },
    caixa_de_pao: { folha: 'cozinha', peca: [4, 4], solido: false },
    escorredor: { folha: 'cozinha', peca: [4, 5], solido: false },
    lixeira: { folha: 'cozinha', peca: [4, 6], solido: false },
    fruteira: { folha: 'cozinha', peca: [5, 10], solido: false },
    porta_temperos: { folha: 'cozinha', peca: [6, 5], solido: false },
    utensilios: { folha: 'cozinha', peca: [6, 6], solido: false },
    prateleira_cozinha: { folha: 'cozinha', peca: [7, 0], solido: false },
    quadro_cozinha: { folha: 'cozinha', peca: [7, 1], solido: false },
    lampiao_cozinha: { folha: 'cozinha', peca: [7, 2], solido: false },
    planta_cozinha: { folha: 'cozinha', peca: [7, 3], solido: false },
    tapete_cozinha: { folha: 'cozinha', peca: [7, 4], solido: false, chao: true },
    quadro_negro: { folha: 'cozinha', peca: [7, 5], solido: false },
    relogio_cozinha: { folha: 'cozinha', peca: [7, 6], solido: false },
    flores_cozinha: { folha: 'cozinha', peca: [7, 7], solido: false },
  },

  banheiro: {
    // --- louca ---
    vaso_sanitario: { folha: 'banheiro', peca: [0, 0], solido: true },
    gabinete_pia: { folha: 'banheiro', peca: [0, 4], solido: true },
    banheira: { folha: 'banheiro', peca: [0, 6], solido: true },
    box_chuveiro: { folha: 'banheiro', peca: [2, 0], solido: true },
    // --- guardar ---
    armario_banheiro: { folha: 'banheiro', peca: [2, 1], solido: true },
    gabinete_frascos: { folha: 'banheiro', peca: [2, 2], solido: true },
    // --- leves e de parede ---
    escova_sanitaria: { folha: 'banheiro', peca: [0, 2], solido: false },
    papel_higienico: { folha: 'banheiro', peca: [0, 3], solido: false },
    espelho_banheiro: { folha: 'banheiro', peca: [0, 5], solido: false },
    chuveiro: { folha: 'banheiro', peca: [1, 0], solido: false },
    prateleira_frascos: { folha: 'banheiro', peca: [1, 1], solido: false },
    toalheiro: { folha: 'banheiro', peca: [2, 3], solido: false },
    toalha_branca: { folha: 'banheiro', peca: [2, 4], solido: false },
    toalhas_dobradas: { folha: 'banheiro', peca: [2, 5], solido: false },
    tapete_banheiro: { folha: 'banheiro', peca: [3, 0], solido: false, chao: true },
    banquinho: { folha: 'banheiro', peca: [3, 1], solido: false },
    planta_banheiro: { folha: 'banheiro', peca: [3, 2], solido: false },
    saboneteira: { folha: 'banheiro', peca: [3, 3], solido: false },
    armario_remedios: { folha: 'banheiro', peca: [3, 4], solido: false },
    lampiao_banheiro: { folha: 'banheiro', peca: [3, 5], solido: false },
    cesto_banheiro: { folha: 'banheiro', peca: [4, 0], solido: false },
    cesto_pequeno: { folha: 'banheiro', peca: [4, 1], solido: false },
    tapete_creme_banheiro: { folha: 'banheiro', peca: [4, 2], solido: false, chao: true },
    frascos: { folha: 'banheiro', peca: [4, 3], solido: false },
    copo_escovas: { folha: 'banheiro', peca: [4, 4], solido: false },
  },

  sala: {
    // --- sentar ---
    sofa_cinza: { folha: 'mobilia_v2', peca: [2, 0], solido: true },
    sofa_lilas: { folha: 'mobilia_v2', peca: [2, 1], solido: true },
    sofa_creme: { folha: 'mobilia_v2', peca: [2, 2], solido: true },
    sofa_azul_l: { folha: 'mobilia_v2', peca: [2, 4], solido: true },
    sofa_verde: { folha: 'mobilia_v2', peca: [2, 5], solido: true },
    poltrona_creme: { folha: 'mobilia_v1', peca: [1, 1], solido: true },
    poltrona_marinho: { folha: 'mobilia_v2', peca: [2, 6], solido: true },
    poltrona_branca: { folha: 'mobilia_v2', peca: [4, 0], solido: true },
    poltrona_mostarda: { folha: 'mobilia_v2', peca: [4, 1], solido: true },
    // --- apoiar ---
    mesa_centro_madeira: { folha: 'mobilia_v2', peca: [3, 1], solido: true },
    mesa_centro_escura: { folha: 'mobilia_v2', peca: [3, 0], solido: true },
    mesa_redonda_branca: { folha: 'mobilia_v2', peca: [4, 2], solido: true },
    aparador_quadro: { folha: 'mobilia_v1', peca: [4, 0], solido: true },
    // --- estante ---
    estante_livros: { folha: 'mobilia_v1', peca: [4, 4], solido: true },
    estante_livros_v2: { folha: 'mobilia_v2', peca: [1, 14], solido: true },
    estante_industrial: { folha: 'mobilia_v1', peca: [3, 0], solido: true },
    estante_plantas: { folha: 'mobilia_v1', peca: [0, 7], solido: true },
    // --- eletronica: a folha dedicada aposentou o rack pintado da mobilia ---
    tv_rack_madeira: { folha: 'eletronicos', peca: [0, 0], solido: true },
    tv_rack_branco: { folha: 'eletronicos', peca: [0, 1], solido: true },
    tv_painel: { folha: 'eletronicos', peca: [0, 2], solido: true },
    tv_rack_largo: { folha: 'eletronicos', peca: [0, 5], solido: true },
    // rack pintado da mobilia generica: so a casa_1 ainda usa
    rack_tv_v2: { folha: 'mobilia_v2', peca: [4, 8], solido: true },
    vitrola: { folha: 'eletronicos', peca: [0, 10], solido: false },
    caixa_som: { folha: 'eletronicos', peca: [0, 3], solido: false },
    ventilador: { folha: 'eletronicos', peca: [5, 7], solido: false },
    puff_verde: { folha: 'mobilia_v2', peca: [2, 8], solido: false },
    otomana: { folha: 'mobilia_v2', peca: [2, 11], solido: false },
  },

  /**
   * OFICINA — categoria nova desta leva, pro comodo de trabalho da casa do
   * protagonista e pros comodos de expansao (deposito e garagem).
   *
   * Nao ha folha de arte de oficina na pasta. DECISAO DE COMPOSICAO: as pecas
   * saem de folhas ja processadas, escolhidas pela leitura e nao pelo nome de
   * origem — a bancada de pia da folha de cozinha le como bancada de trabalho,
   * a estante industrial da mobilia le como prateleira de pecas, e o bau do
   * quarto le como caixa de ferramenta. Sao PLACEHOLDERS conscientes: quando
   * houver folha dedicada de oficina, e so trocar `folha`/`peca` aqui.
   */
  oficina: {
    bancada_trabalho: { folha: 'cozinha', peca: [1, 3], solido: true },
    armario_pecas: { folha: 'cozinha', peca: [2, 0], solido: true },
    prateleira_pecas: { folha: 'mobilia_v1', peca: [3, 0], solido: true },
    estante_caixas: { folha: 'mobilia_v1', peca: [4, 4], solido: true },
    mesa_bancada_pc: { folha: 'eletronicos', peca: [2, 3], solido: true },
    setup_oficina: { folha: 'eletronicos', peca: [2, 0], solido: true },
    caixa_ferramenta: { folha: 'quarto', peca: [5, 0], solido: true },
    ventilador_oficina: { folha: 'eletronicos', peca: [5, 7], solido: false },
    ar_oficina: { folha: 'eletronicos', peca: [5, 4], solido: false },
    cesto_sucata: { folha: 'mobilia_v1', peca: [4, 5], solido: false },
    caixa_som_oficina: { folha: 'eletronicos', peca: [0, 3], solido: false },
  },

  /** ESCOLA — carteira, mesa do professor e quadro. Mesmo criterio da oficina. */
  escola: {
    carteira: { folha: 'quarto', peca: [2, 1], solido: true },
    mesa_professor: { folha: 'cozinha', peca: [3, 1], solido: true },
    armario_escolar: { folha: 'quarto', peca: [0, 4], solido: true },
    estante_escolar: { folha: 'mobilia_v1', peca: [4, 4], solido: true },
    quadro_sala: { folha: 'cozinha', peca: [7, 5], solido: false },
  },

  /** BIBLIOTECA — estante de acervo, mesa de leitura e balcao. */
  biblioteca: {
    estante_acervo: { folha: 'mobilia_v1', peca: [4, 4], solido: true },
    estante_acervo_alta: { folha: 'mobilia_v2', peca: [1, 14], solido: true },
    estante_arquivo: { folha: 'mobilia_v1', peca: [3, 0], solido: true },
    mesa_leitura: { folha: 'cozinha', peca: [3, 1], solido: true },
    balcao_atendimento: { folha: 'cozinha', peca: [1, 3], solido: true },
    // computador DECORATIVO: nao ha objeto interativo nele (gancho futuro)
    pc_consulta: { folha: 'eletronicos', peca: [2, 3], solido: true },
    luminaria_leitura: { folha: 'quarto', peca: [2, 3], solido: false },
  },

  comum: {
    // chao
    tapete_marrom: { folha: 'mobilia_v2', peca: [3, 5], solido: false, chao: true, escala: 1.7 },
    tapete_creme: { folha: 'mobilia_v2', peca: [3, 7], solido: false, chao: true, escala: 1.7 },
    tapete_rosa: { folha: 'mobilia_v2', peca: [3, 8], solido: false, chao: true, escala: 1.7 },
    tapete_cinza: { folha: 'mobilia_v2', peca: [3, 10], solido: false, chao: true, escala: 1.7 },
    caminha_pet: { folha: 'mobilia_v1', peca: [5, 11], solido: false },
    caminha_pet_v2: { folha: 'mobilia_v2', peca: [8, 11], solido: false },
    cesto_vime: { folha: 'mobilia_v1', peca: [4, 5], solido: false },
    // parede
    quadros: { folha: 'mobilia_v1', peca: [4, 11], solido: false },
    relogio_parede: { folha: 'mobilia_v1', peca: [4, 9], solido: false },
    prateleira_planta: { folha: 'mobilia_v1', peca: [4, 10], solido: false },
    espelho_alto: { folha: 'mobilia_v1', peca: [0, 4], solido: false },
    quadro_paisagem: { folha: 'mobilia_v2', peca: [5, 8], solido: false },
    poster_galaxia: { folha: 'mobilia_v2', peca: [5, 9], solido: false },
    quadro_folha: { folha: 'mobilia_v2', peca: [5, 10], solido: false },
    relogio_v2: { folha: 'mobilia_v2', peca: [4, 12], solido: false },
    // planta, luz e miudeza
    planta_grande: { folha: 'mobilia_v1', peca: [1, 6], solido: false },
    lampada_tripe: { folha: 'mobilia_v1', peca: [1, 4], solido: false },
    velas: { folha: 'mobilia_v1', peca: [5, 7], solido: false },
    vaso_planta: { folha: 'mobilia_v2', peca: [5, 6], solido: false },
    vaso_rosa: { folha: 'mobilia_v2', peca: [6, 0], solido: false },
    planta_alta: { folha: 'mobilia_v2', peca: [6, 15], solido: false },
    vaso_flores: { folha: 'mobilia_v2', peca: [6, 17], solido: false },
    violao: { folha: 'mobilia_v2', peca: [1, 9], solido: false },
  },
};

/**
 * O catalogo achatado: nome da peca -> definicao, com o `comodo` de origem
 * junto. Erra alto se o mesmo nome aparecer em duas categorias — seria
 * ambiguo em qual comodo a peca pode entrar.
 */
const MOVEIS_CASA = (() => {
  const plano = {};
  for (const [comodo, pecas] of Object.entries(CATALOGO_POR_COMODO)) {
    for (const [nome, def] of Object.entries(pecas)) {
      if (plano[nome]) {
        throw new Error(`o movel "${nome}" esta em "${plano[nome].comodo}" e em "${comodo}"`);
      }
      plano[nome] = { ...def, comodo };
    }
  }
  return plano;
})();

/**
 * De que TIPO e um comodo, pelo nome que a planta deu a ele. Corredor, hall e
 * salao nao tem mobilia propria: so aceitam peca `comum`.
 */
const TIPO_DE_COMODO = {
  quarto: 'quarto',
  cozinha: 'cozinha',
  banheiro: 'banheiro',
  sala: 'sala',
  corredor: 'comum',
  hall: 'comum',
  salao: 'comum',
  // --- comodos dos predios desta leva ---
  oficina: 'oficina',
  deposito: 'oficina',
  garagem: 'oficina',
  estudio: 'oficina',
  sala_aula: 'escola',
  acervo: 'biblioteca',
  leitura: 'biblioteca',
};

// -------------------------------------------------- plantas multi-comodo --
/**
 * PLANTA de um interior com varios comodos na MESMA cena. Nao ha transicao de
 * tela entre comodos: e um mapa so, maior que o salao antigo, com paredes
 * internas e vaos de passagem.
 *
 * Campos, todos em TILES:
 *
 * - `largura`/`altura` — o mapa inteiro, incluindo a moldura de parede.
 * - `porta`            — coluna da porta de SAIDA, na parede de baixo. O
 *                        jogador nasce um tile acima dela (ver
 *                        `entradaDoInterior`, espelhado em src/game/mapas.ts).
 * - `paredes`          — retangulos [x, y, w, h] de parede interna. As
 *                        horizontais tem 2 tiles de espessura de proposito: com
 *                        1 tile um guarda-roupa de 2,5 tiles de altura cobre a
 *                        parede E o comodo de tras, e a peca deixa de ler como
 *                        "encostada na parede".
 * - `vaos`             — tiles apagados das paredes internas: sao as passagens.
 *                        Numa parede de 2 tiles o vao precisa dos DOIS tiles.
 * - `portasNpc`        — tiles de porta somente-NPC (ver o tile `PORTA_NPC` e
 *                        src/game/colisao.ts). Nas casas nao ha nenhuma: todos
 *                        os comodos sao do jogador. Quem usa sao os mistos.
 * - `comodos`          — nome: [x, y, w, h], so a area util (sem parede). Sai
 *                        numa camada de objetos `comodos` no tilemap, entao
 *                        `verificar-mapas` cobra a acessibilidade de cada um sem
 *                        ter de repetir o layout aqui.
 * - `privados`         — nomes de comodo que o JOGADOR nao pode alcancar. Vazio
 *                        nas casas; nos mistos e a moradia do dono.
 * - `cama`             — tile do TOPO da cama; a base fica um tile abaixo.
 * - `spawnNpc`         — onde o morador comeca o dia dentro de casa. Espelha
 *                        `posicaoInicial` em src/game/npcs.ts.
 * - `mobilia`          — comodo: [{ movel, tx, ty }], so pra agrupar a leitura;
 *                        o gerador achata tudo numa lista so.
 *
 * - `parede`          — estilo de parede interna da casa (ver `ESTILOS_PAREDE`).
 * - `paredePorComodo`  — comodo que pede parede propria; e o que poe azulejo no
 *                        banheiro e na cozinha sem mexer no resto.
 * - `chao`             — tile de piso padrao do interior (nome cru do tileset).
 * - `pisos`            — comodo: piso proprio (nome logico de `PISOS`). Pintado
 *                        por cima do `chao`, so na area util do comodo, entao o
 *                        tile do vao fica com o piso de fundo e le como soleira.
 *
 * A mobilia sai TODA de arte dedicada por comodo: cada lista de `mobilia` so
 * aceita peca da categoria do comodo (ver `CATALOGO_POR_COMODO`), entao a
 * cozinha tem pia, fogao e geladeira de verdade, e o banheiro tem vaso, box e
 * gabinete — nao mais mesa de jantar e comoda fazendo as vezes.
 */
const PLANTAS_CASA = {
  // Edu — corredor central de cima a baixo, dois comodos de cada lado. E a
  // planta mais "apartamento": tudo se alcanca pelo corredor, nenhum comodo
  // depende de atravessar outro.
  casa_2: {
    parede: 'papel_azul',
    paredePorComodo: { banheiro: 'azulejo_branco', cozinha: 'azulejo_escuro' },
    chao: 'PISO_MADEIRA_CLARA',
    pisos: { cozinha: 'xadrez_cozinha', banheiro: 'hexagonal' },
    largura: 22,
    altura: 18,
    porta: 11,
    cama: { x: 2, y: 2 },
    spawnNpc: { x: 14, y: 6 },
    paredes: [
      [9, 2, 1, 15], // divisa oeste do corredor
      [12, 2, 1, 15], // divisa leste do corredor
      [1, 10, 8, 2], // quarto / cozinha
      [13, 12, 8, 2], // sala / banheiro
    ],
    vaos: [[9, 4], [9, 14], [12, 6], [12, 15]],
    comodos: {
      quarto: [1, 2, 8, 8],
      cozinha: [1, 12, 8, 5],
      corredor: [10, 2, 2, 15],
      sala: [13, 2, 8, 10],
      banheiro: [13, 14, 8, 3],
    },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'guarda_roupa', tx: 6, ty: 4 },
        { movel: 'setup_gamer', tx: 5, ty: 8 },
        { movel: 'estante_quarto', tx: 1, ty: 8 },
        { movel: 'poster_galaxia', tx: 7, ty: 6 },
        { movel: 'abajur_pe', tx: 8, ty: 3 },
        { movel: 'tapete_quarto', tx: 3, ty: 6 },
        { movel: 'caminha_pet', tx: 1, ty: 5 },
        { movel: 'violao', tx: 1, ty: 3 },
      ],
      cozinha: [
        { movel: 'geladeira', tx: 1, ty: 14 },
        { movel: 'fogao', tx: 3, ty: 14 },
        { movel: 'pia', tx: 5, ty: 14 },
        { movel: 'despenseiro', tx: 7, ty: 14 },
        { movel: 'mesa_de_jantar', tx: 2, ty: 16 },
        { movel: 'tapete_cozinha', tx: 2, ty: 16 },
        { movel: 'relogio_cozinha', tx: 1, ty: 12 },
        { movel: 'quadro_negro', tx: 3, ty: 12 },
        { movel: 'planta_cozinha', tx: 8, ty: 16 },
        { movel: 'lixeira', tx: 8, ty: 15 },
        // utensilio solto de bancada: so decora, nao colide
        { movel: 'microondas', tx: 5, ty: 12 },
        { movel: 'escorredor', tx: 6, ty: 15 },
        { movel: 'fruteira', tx: 1, ty: 15 },
      ],
      sala: [
        { movel: 'tv_rack_madeira', tx: 17, ty: 4 },
        { movel: 'sofa_azul_l', tx: 16, ty: 9 },
        { movel: 'mesa_centro_escura', tx: 17, ty: 11 },
        { movel: 'tapete_cinza', tx: 16, ty: 11 },
        { movel: 'estante_livros_v2', tx: 13, ty: 4 },
        { movel: 'poltrona_marinho', tx: 13, ty: 8 },
        { movel: 'quadro_paisagem', tx: 15, ty: 3 },
        { movel: 'planta_alta', tx: 13, ty: 11 },
      ],
      banheiro: [
        { movel: 'vaso_sanitario', tx: 13, ty: 16 },
        { movel: 'gabinete_pia', tx: 16, ty: 16 },
        { movel: 'box_chuveiro', tx: 18, ty: 16 },
        { movel: 'espelho_banheiro', tx: 13, ty: 14 },
        { movel: 'toalheiro', tx: 15, ty: 14 },
        { movel: 'tapete_banheiro', tx: 14, ty: 15 },
        { movel: 'planta_banheiro', tx: 20, ty: 14 },
      ],
    },
  },

  // Mari — sala larga na frente, ocupando a fachada inteira, e tres comodos
  // enfileirados no fundo, cada um com vao proprio pra sala. Sem corredor: a
  // sala E a circulacao.
  casa_3: {
    parede: 'reboco_creme',
    paredePorComodo: { banheiro: 'azulejo_verde', cozinha: 'azulejo_branco' },
    chao: 'PISO_ESPINHA_MADEIRA',
    pisos: { cozinha: 'ladrilho_bege', banheiro: 'mosaico_menta' },
    largura: 22,
    altura: 18,
    porta: 11,
    cama: { x: 2, y: 2 },
    spawnNpc: { x: 11, y: 14 },
    paredes: [
      [1, 10, 20, 2], // fundo / sala
      [8, 2, 1, 8], // quarto / cozinha
      [15, 2, 1, 8], // cozinha / banheiro
    ],
    vaos: [[4, 10], [4, 11], [11, 10], [11, 11], [18, 10], [18, 11]],
    comodos: {
      quarto: [1, 2, 7, 8],
      cozinha: [9, 2, 6, 8],
      banheiro: [16, 2, 5, 8],
      sala: [1, 12, 20, 5],
    },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'penteadeira', tx: 5, ty: 4 },
        { movel: 'guarda_roupa', tx: 5, ty: 8 },
        { movel: 'cesto_roupa', tx: 1, ty: 9 },
        { movel: 'quadro_montanha', tx: 1, ty: 6 },
        { movel: 'tapete_quarto', tx: 2, ty: 6 },
        { movel: 'vaso_rosa', tx: 7, ty: 3 },
      ],
      cozinha: [
        { movel: 'geladeira', tx: 9, ty: 3 },
        { movel: 'fogao', tx: 11, ty: 3 },
        { movel: 'pia', tx: 13, ty: 2 },
        { movel: 'mesa_de_jantar', tx: 9, ty: 8 },
        { movel: 'planta_cozinha', tx: 14, ty: 8 },
        { movel: 'utensilios', tx: 9, ty: 5 },
        { movel: 'relogio_cozinha', tx: 13, ty: 5 },
        { movel: 'porta_temperos', tx: 13, ty: 3 },
        { movel: 'fruteira', tx: 12, ty: 5 },
        { movel: 'flores_cozinha', tx: 14, ty: 4 },
      ],
      banheiro: [
        { movel: 'banheira', tx: 16, ty: 3 },
        { movel: 'vaso_sanitario', tx: 20, ty: 3 },
        { movel: 'gabinete_pia', tx: 16, ty: 7 },
        { movel: 'armario_banheiro', tx: 19, ty: 7 },
        { movel: 'espelho_banheiro', tx: 16, ty: 5 },
        { movel: 'tapete_banheiro', tx: 18, ty: 9 },
        { movel: 'planta_banheiro', tx: 20, ty: 9 },
      ],
      sala: [
        { movel: 'sofa_creme', tx: 2, ty: 13 },
        { movel: 'mesa_centro_madeira', tx: 5, ty: 14 },
        { movel: 'tapete_creme', tx: 2, ty: 15 },
        { movel: 'poltrona_mostarda', tx: 8, ty: 13 },
        { movel: 'tv_rack_branco', tx: 13, ty: 13 },
        { movel: 'estante_livros', tx: 19, ty: 16 },
        { movel: 'planta_grande', tx: 13, ty: 16 },
        { movel: 'relogio_v2', tx: 1, ty: 12 },
      ],
    },
  },

  // Jaqueline — casa funda, com corredor HORIZONTAL no meio: quarto e cozinha
  // ao fundo, sala e banheiro na frente. A porta abre direto na sala.
  casa_4: {
    parede: 'reboco_bege',
    paredePorComodo: { banheiro: 'azulejo_branco', cozinha: 'tijolo_claro' },
    chao: 'PISO_MADEIRA_ESCURA',
    pisos: { cozinha: 'terracota', banheiro: 'marmore' },
    largura: 22,
    altura: 20,
    porta: 5,
    cama: { x: 2, y: 2 },
    spawnNpc: { x: 5, y: 15 },
    paredes: [
      [1, 7, 20, 2], // fundo / corredor
      [1, 11, 20, 2], // corredor / frente
      [11, 2, 1, 5], // quarto / cozinha
      [13, 13, 1, 6], // sala / banheiro
    ],
    vaos: [[5, 7], [5, 8], [16, 7], [16, 8], [5, 11], [5, 12], [17, 11], [17, 12]],
    comodos: {
      quarto: [1, 2, 10, 5],
      cozinha: [12, 2, 9, 5],
      corredor: [1, 9, 20, 2],
      sala: [1, 13, 12, 6],
      banheiro: [14, 13, 7, 6],
    },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'guarda_roupa', tx: 6, ty: 6 },
        { movel: 'comoda_quarto', tx: 8, ty: 6 },
        { movel: 'quadro_montanha', tx: 1, ty: 5 },
        { movel: 'tapete_quarto', tx: 1, ty: 6 },
        { movel: 'caminha_pet', tx: 10, ty: 3 },
        { movel: 'abajur_mesa', tx: 10, ty: 6 },
      ],
      cozinha: [
        { movel: 'geladeira', tx: 12, ty: 3 },
        { movel: 'fogao', tx: 14, ty: 3 },
        { movel: 'pia', tx: 16, ty: 3 },
        { movel: 'cristaleira', tx: 19, ty: 3 },
        { movel: 'mesa_de_jantar', tx: 12, ty: 6 },
        { movel: 'tapete_cozinha', tx: 12, ty: 6 },
        { movel: 'planta_cozinha', tx: 18, ty: 6 },
        { movel: 'relogio_cozinha', tx: 20, ty: 6 },
        { movel: 'microondas', tx: 17, ty: 4 },
        { movel: 'escorredor', tx: 16, ty: 5 },
        { movel: 'caixa_de_pao', tx: 19, ty: 4 },
      ],
      corredor: [{ movel: 'quadros', tx: 10, ty: 10 }],
      sala: [
        { movel: 'sofa_azul_l', tx: 1, ty: 14 },
        { movel: 'mesa_centro_escura', tx: 2, ty: 16 },
        { movel: 'tapete_marrom', tx: 1, ty: 17 },
        { movel: 'tv_rack_madeira', tx: 9, ty: 15 },
        { movel: 'poltrona_branca', tx: 7, ty: 18 },
        { movel: 'planta_alta', tx: 12, ty: 18 },
        { movel: 'quadro_paisagem', tx: 6, ty: 14 },
      ],
      banheiro: [
        { movel: 'gabinete_pia', tx: 18, ty: 14 },
        { movel: 'vaso_sanitario', tx: 20, ty: 16 },
        { movel: 'box_chuveiro', tx: 14, ty: 17 },
        { movel: 'toalheiro', tx: 14, ty: 13 },
        { movel: 'tapete_banheiro', tx: 18, ty: 18 },
        { movel: 'planta_banheiro', tx: 20, ty: 18 },
      ],
    },
  },

  // Leticia — casa mais estreita, dividida ao meio no sentido vertical: quarto
  // grande e sala a oeste, cozinha e banheiro a leste. O banheiro so se alcanca
  // pela sala, e a cozinha so pelo banheiro — planta de casa antiga.
  casa_5: {
    parede: 'liso_azul',
    paredePorComodo: { banheiro: 'azulejo_verde', cozinha: 'azulejo_branco' },
    chao: 'PISO_MADEIRA_CLARA',
    pisos: { cozinha: 'azulejo_portugues', banheiro: 'mosaico_azul' },
    largura: 20,
    altura: 18,
    porta: 5,
    cama: { x: 2, y: 2 },
    spawnNpc: { x: 5, y: 14 },
    paredes: [
      [11, 2, 1, 15], // oeste / leste
      [1, 10, 10, 2], // quarto / sala
      [12, 8, 7, 2], // cozinha / banheiro
    ],
    vaos: [[7, 10], [7, 11], [11, 13], [15, 8], [15, 9]],
    comodos: {
      quarto: [1, 2, 10, 8],
      sala: [1, 12, 10, 5],
      cozinha: [12, 2, 7, 6],
      banheiro: [12, 10, 7, 7],
    },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'guarda_roupa', tx: 5, ty: 4 },
        { movel: 'comoda_quarto', tx: 9, ty: 4 },
        { movel: 'escrivaninha', tx: 4, ty: 8 },
        { movel: 'quadro_montanha', tx: 8, ty: 3 },
        { movel: 'tapete_quarto', tx: 2, ty: 7 },
        { movel: 'planta_quarto', tx: 1, ty: 9 },
        { movel: 'espelho_alto', tx: 10, ty: 8 },
      ],
      sala: [
        { movel: 'sofa_verde', tx: 1, ty: 13 },
        { movel: 'mesa_centro_madeira', tx: 1, ty: 15 },
        { movel: 'tapete_cinza', tx: 1, ty: 15 },
        { movel: 'tv_rack_madeira', tx: 6, ty: 14 },
        { movel: 'poltrona_creme', tx: 8, ty: 16 },
        { movel: 'planta_grande', tx: 6, ty: 16 },
      ],
      cozinha: [
        { movel: 'geladeira', tx: 12, ty: 3 },
        { movel: 'fogao', tx: 14, ty: 3 },
        { movel: 'pia', tx: 16, ty: 2 },
        { movel: 'despenseiro', tx: 18, ty: 3 },
        { movel: 'mesa_de_jantar', tx: 12, ty: 6 },
        { movel: 'tapete_cozinha', tx: 12, ty: 6 },
        { movel: 'relogio_cozinha', tx: 18, ty: 7 },
        { movel: 'utensilios', tx: 12, ty: 5 },
        { movel: 'fruteira', tx: 17, ty: 4 },
        { movel: 'porta_temperos', tx: 16, ty: 5 },
      ],
      banheiro: [
        { movel: 'banheira', tx: 12, ty: 11 },
        { movel: 'vaso_sanitario', tx: 17, ty: 11 },
        { movel: 'box_chuveiro', tx: 12, ty: 16 },
        { movel: 'gabinete_pia', tx: 16, ty: 16 },
        { movel: 'espelho_banheiro', tx: 16, ty: 14 },
        { movel: 'tapete_banheiro', tx: 15, ty: 13 },
        { movel: 'cesto_banheiro', tx: 18, ty: 13 },
      ],
    },
  },

  // Casa vaga — tres faixas verticais com hall de entrada no meio: quarto e
  // banheiro a oeste, cozinha em cima do hall, e uma sala comprida ocupando a
  // faixa leste inteira. O quarto so se alcanca pela cozinha.
  casa_6: {
    parede: 'liso_sage',
    paredePorComodo: { banheiro: 'azulejo_branco', cozinha: 'azulejo_verde' },
    chao: 'PISO_ESPINHA_CLARA',
    pisos: { cozinha: 'ladrilho_verde', banheiro: 'xadrez_banheiro' },
    largura: 22,
    altura: 16,
    porta: 10,
    cama: { x: 2, y: 2 },
    spawnNpc: { x: 16, y: 12 },
    paredes: [
      [7, 2, 1, 13], // oeste / centro
      [13, 2, 1, 13], // centro / sala
      [1, 8, 6, 2], // quarto / banheiro
      [8, 9, 5, 2], // cozinha / hall
    ],
    vaos: [[7, 4], [7, 12], [10, 9], [10, 10], [13, 12]],
    comodos: {
      quarto: [1, 2, 6, 6],
      banheiro: [1, 10, 6, 5],
      cozinha: [8, 2, 5, 7],
      hall: [8, 11, 5, 4],
      sala: [14, 2, 7, 13],
    },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'guarda_roupa', tx: 5, ty: 7 },
        { movel: 'quadrinho', tx: 1, ty: 6 },
        { movel: 'bau', tx: 1, ty: 7 },
        { movel: 'tapete_quarto', tx: 3, ty: 6 },
        { movel: 'planta_quarto', tx: 6, ty: 3 },
      ],
      banheiro: [
        { movel: 'vaso_sanitario', tx: 1, ty: 12 },
        { movel: 'gabinete_pia', tx: 3, ty: 10 },
        { movel: 'box_chuveiro', tx: 1, ty: 14 },
        { movel: 'espelho_banheiro', tx: 3, ty: 12 },
        { movel: 'toalheiro', tx: 5, ty: 10 },
        { movel: 'tapete_banheiro', tx: 5, ty: 14 },
      ],
      cozinha: [
        { movel: 'geladeira', tx: 8, ty: 3 },
        { movel: 'fogao', tx: 10, ty: 3 },
        { movel: 'pia', tx: 11, ty: 5 },
        { movel: 'ilha', tx: 8, ty: 7 },
        { movel: 'despenseiro', tx: 12, ty: 8 },
        { movel: 'tapete_cozinha', tx: 8, ty: 8 },
        { movel: 'relogio_cozinha', tx: 12, ty: 6 },
        { movel: 'escorredor', tx: 8, ty: 5 },
        { movel: 'fruteira', tx: 10, ty: 6 },
      ],
      hall: [
        { movel: 'prateleira_planta', tx: 8, ty: 11 },
        { movel: 'vaso_planta', tx: 12, ty: 14 },
      ],
      sala: [
        { movel: 'sofa_lilas', tx: 15, ty: 4 },
        { movel: 'mesa_centro_escura', tx: 15, ty: 6 },
        { movel: 'tapete_creme', tx: 15, ty: 7 },
        { movel: 'tv_rack_largo', tx: 15, ty: 9 },
        { movel: 'estante_livros', tx: 19, ty: 4 },
        { movel: 'poltrona_mostarda', tx: 19, ty: 8 },
        { movel: 'planta_alta', tx: 14, ty: 14 },
        { movel: 'relogio_v2', tx: 17, ty: 2 },
        { movel: 'quadro_paisagem', tx: 19, ty: 13 },
      ],
    },
  },
};


// ---------------------------------------- interiores dos predios desta leva --
/**
 * PLANTAS_PROPRIAS — os interiores que NAO sao casa de NPC nem predio misto:
 *
 *  - `oficina`    — casa + oficina do protagonista, no Mapa 2. E pra ca que
 *                   migraram o dormir/salvar e o computador dos 7 apps, que
 *                   antes ficavam na `casa_1` do Mapa 1;
 *  - `escola`     — predio publico de salas genericas, sem NPC aluno;
 *  - `biblioteca` — acervo + sala de leitura, com um computador DECORATIVO.
 *
 * Sao plantas do mesmo formato de `PLANTAS_CASA` (ver o cabecalho la), com tres
 * campos a mais, todos opcionais:
 *
 *  - `cama`      — deixou de ser obrigatorio: escola e biblioteca nao tem;
 *  - `spawnNpc`  — idem: nenhum dos tres tem morador;
 *  - `pc`        — tile do objeto interativo `computador`;
 *  - `mobiliar`  — tile do objeto interativo `mobilia` (a bancada da oficina,
 *                  que abre o catalogo de mobilia — ver Parte 5);
 *  - `expansoes` — comodos que NASCEM CONSTRUIDOS no tilemap mas ficam
 *                  LACRADOS em jogo ate serem comprados na madeireira. Cada um
 *                  declara o `vao` (o tile de passagem) que o jogo tapa com
 *                  parede enquanto o comodo nao foi comprado. Ver
 *                  src/game/casa.ts.
 */
const PLANTAS_PROPRIAS = {
  /**
   * Casa+oficina do protagonista. Espinha central de corredor, moradia a oeste
   * (quarto/cozinha/banheiro), sala e OFICINA a leste, e uma terceira faixa a
   * leste de tudo com os tres comodos de EXPANSAO.
   *
   *   quarto   | corr | sala      | deposito
   *   cozinha  |  i   |-----------|----------
   *   banheiro |  d   | oficina   | estudio
   *            |  or  |           | garagem
   */
  oficina: {
    parede: 'predio',
    paredePorComodo: {
      banheiro: 'azulejo_branco',
      cozinha: 'azulejo_verde',
      oficina: 'predio_gasto',
      deposito: 'predio_gasto',
      garagem: 'predio_gasto',
    },
    chao: 'PISO_MADEIRA_CLARA',
    pisos: {
      cozinha: 'ladrilho_bege',
      banheiro: 'hexagonal',
      corredor: 'granilite',
      oficina: 'concreto',
      deposito: 'concreto_escuro',
      estudio: 'espinha_clara',
      garagem: 'concreto_escuro',
    },
    largura: 34,
    altura: 22,
    porta: 12,
    cama: { x: 2, y: 3 },
    pc: { x: 17, y: 14 },
    mobiliar: { x: 21, y: 14 },
    paredes: [
      [11, 2, 1, 19], // divisa oeste do corredor
      [14, 2, 1, 19], // divisa leste do corredor
      [25, 2, 1, 19], // divisa da faixa de expansao
      [1, 9, 10, 2], // quarto / cozinha
      [1, 15, 10, 2], // cozinha / banheiro
      [15, 10, 10, 2], // sala / oficina
      [26, 7, 7, 2], // deposito / estudio
      [26, 14, 7, 2], // estudio / garagem
    ],
    vaos: [
      [11, 5], [11, 12], [11, 18], // corredor -> quarto / cozinha / banheiro
      [14, 5], [14, 16], // corredor -> sala / oficina
      [25, 4], [25, 12], [25, 18], // vaos das EXPANSOES (lacrados ate a compra)
    ],
    comodos: {
      quarto: [1, 2, 10, 7],
      cozinha: [1, 11, 10, 4],
      banheiro: [1, 17, 10, 4],
      corredor: [12, 2, 2, 19],
      sala: [15, 2, 10, 8],
      oficina: [15, 12, 10, 9],
      deposito: [26, 2, 7, 5],
      estudio: [26, 9, 7, 5],
      garagem: [26, 16, 7, 5],
    },
    expansoes: {
      deposito: { vao: [25, 4] },
      estudio: { vao: [25, 12] },
      garagem: { vao: [25, 18] },
    },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 4, ty: 4 },
        { movel: 'guarda_roupa', tx: 7, ty: 4 },
        { movel: 'comoda_quarto', tx: 1, ty: 8 },
        { movel: 'tapete_quarto', tx: 4, ty: 7 },
        { movel: 'poster_galaxia', tx: 6, ty: 2 },
        { movel: 'abajur_mesa', tx: 9, ty: 4 },
        { movel: 'cesto_roupa', tx: 9, ty: 8 },
      ],
      cozinha: [
        { movel: 'geladeira', tx: 1, ty: 12 },
        { movel: 'fogao', tx: 3, ty: 12 },
        { movel: 'pia', tx: 5, ty: 12 },
        { movel: 'mesa_de_jantar', tx: 2, ty: 14 },
        { movel: 'relogio_cozinha', tx: 8, ty: 11 },
        { movel: 'lixeira', tx: 9, ty: 14 },
      ],
      banheiro: [
        { movel: 'vaso_sanitario', tx: 1, ty: 20 },
        { movel: 'gabinete_pia', tx: 4, ty: 20 },
        { movel: 'box_chuveiro', tx: 7, ty: 20 },
        { movel: 'espelho_banheiro', tx: 4, ty: 18 },
        { movel: 'tapete_banheiro', tx: 2, ty: 18 },
      ],
      sala: [
        { movel: 'sofa_creme', tx: 16, ty: 6 },
        { movel: 'mesa_centro_madeira', tx: 17, ty: 8 },
        { movel: 'tapete_cinza', tx: 16, ty: 8 },
        { movel: 'tv_rack_madeira', tx: 20, ty: 4 },
        { movel: 'planta_alta', tx: 23, ty: 9 },
        { movel: 'quadro_paisagem', tx: 18, ty: 2 },
      ],
      // A oficina sai TODA do catalogo novo `oficina` (ver CATALOGO_POR_COMODO):
      // bancada, armario de pecas, estante de sucata e o computador de trabalho.
      oficina: [
        { movel: 'bancada_trabalho', tx: 20, ty: 14 },
        { movel: 'setup_oficina', tx: 16, ty: 14 },
        { movel: 'prateleira_pecas', tx: 15, ty: 18 },
        { movel: 'estante_caixas', tx: 23, ty: 14 },
        { movel: 'caixa_ferramenta', tx: 18, ty: 20 },
        { movel: 'cesto_sucata', tx: 21, ty: 20 },
        { movel: 'ventilador_oficina', tx: 24, ty: 20 },
      ],
      // Comodos de EXPANSAO: nascem VAZIOS de proposito. A graca da Parte 5 e o
      // jogador mobiliar peca por peca depois de comprar o comodo.
    },
  },

  /**
   * Escola: hall corrido no fundo e tres salas de aula em cima. Interior
   * simples, como pedido — nao ha NPC aluno pra povoar, entao ele existe como
   * espaco navegavel.
   *
   * GANCHO FUTURO (nao implementado): horario de entrada/saida, aluno e
   * professor. Nada no codigo depende disso hoje.
   */
  escola: {
    parede: 'escola',
    chao: 'PISO_GRANILITE',
    pisos: { sala_aula_1: 'madeira_clara', sala_aula_2: 'madeira_clara', sala_aula_3: 'madeira_clara' },
    largura: 24,
    altura: 16,
    porta: 12,
    paredes: [
      [1, 9, 22, 2], // divisa hall / salas
      [7, 2, 1, 7],
      [16, 2, 1, 7],
    ],
    vaos: [[3, 9], [3, 10], [11, 9], [11, 10], [20, 9], [20, 10]],
    comodos: {
      sala_aula_1: [1, 2, 6, 7],
      sala_aula_2: [8, 2, 8, 7],
      sala_aula_3: [17, 2, 6, 7],
      hall: [1, 11, 22, 4],
    },
    // Sala de aula e comodo ESTREITO (6 a 8 tiles) e a carteira ocupa 2,5 deles.
    // Por isso a mobilia e curta e deixa coluna livre de proposito: cada peca a
    // mais fecharia uma fileira inteira e ilharia o fundo da sala.
    mobilia: {
      sala_aula_1: [
        { movel: 'quadro_sala', tx: 2, ty: 3 },
        { movel: 'mesa_professor', tx: 1, ty: 4 },
        { movel: 'carteira', tx: 1, ty: 7 },
      ],
      sala_aula_2: [
        { movel: 'quadro_sala', tx: 11, ty: 3 },
        { movel: 'mesa_professor', tx: 8, ty: 4 },
        { movel: 'carteira', tx: 8, ty: 7 },
        { movel: 'carteira', tx: 12, ty: 7 },
        { movel: 'armario_escolar', tx: 14, ty: 4 },
      ],
      sala_aula_3: [
        { movel: 'quadro_sala', tx: 19, ty: 3 },
        { movel: 'mesa_professor', tx: 17, ty: 4 },
        { movel: 'carteira', tx: 20, ty: 7 },
      ],
      hall: [
        { movel: 'planta_grande', tx: 1, ty: 14 },
        { movel: 'quadros', tx: 5, ty: 11 },
        { movel: 'relogio_parede', tx: 16, ty: 11 },
        { movel: 'planta_alta', tx: 22, ty: 14 },
      ],
    },
  },

  /**
   * Biblioteca: acervo a oeste, sala de leitura a leste, ligados por um vao.
   *
   * O computador da leitura e DECORATIVO — nao ha objeto interativo nele. A
   * pesquisa/arquivo que o documento de enredo pede pro misterio da AuroraLivre
   * fica como GANCHO FUTURO: nada aqui prepara terreno pra isso alem do movel.
   */
  biblioteca: {
    parede: 'biblioteca',
    chao: 'PISO_ESPINHA_MADEIRA',
    pisos: { leitura: 'madeira_escura' },
    largura: 22,
    altura: 15,
    porta: 11,
    paredes: [[10, 2, 1, 11]],
    vaos: [[10, 6]],
    comodos: {
      acervo: [1, 2, 9, 12],
      leitura: [11, 2, 10, 12],
    },
    mobilia: {
      // as estantes ficam em fileiras com coluna de circulacao entre elas
      acervo: [
        { movel: 'estante_acervo_alta', tx: 1, ty: 4 },
        { movel: 'estante_acervo_alta', tx: 4, ty: 4 },
        { movel: 'estante_acervo_alta', tx: 7, ty: 4 },
        { movel: 'estante_arquivo', tx: 1, ty: 9 },
        { movel: 'estante_acervo', tx: 5, ty: 9 },
        { movel: 'luminaria_leitura', tx: 9, ty: 12 },
      ],
      leitura: [
        { movel: 'balcao_atendimento', tx: 13, ty: 13 },
        { movel: 'mesa_leitura', tx: 15, ty: 8 },
        { movel: 'estante_acervo', tx: 19, ty: 4 },
        // computador DECORATIVO: nao ha objeto interativo nele
        { movel: 'pc_consulta', tx: 11, ty: 4 },
        { movel: 'quadro_paisagem', tx: 15, ty: 2 },
        { movel: 'planta_alta', tx: 19, ty: 12 },
      ],
    },
  },
};

/** A planta de um interior multi-comodo; erra alto se a casa nao tiver uma. */
function planta(nome) {
  const p = PLANTAS_CASA[nome] ?? PLANTAS_MISTO[nome] ?? PLANTAS_PROPRIAS[nome];
  if (!p) throw new Error(`"${nome}" nao tem planta em PLANTAS_CASA/MISTO/PROPRIAS`);
  return p;
}

/** Toda planta multi-comodo do jogo, das tres tabelas. */
const TODAS_AS_PLANTAS = () => ({ ...PLANTAS_CASA, ...PLANTAS_MISTO, ...PLANTAS_PROPRIAS });

/** Toda a mobilia de uma planta, achatada e com o comodo de origem no rotulo. */
function mobiliaDaPlanta(p) {
  return Object.entries(p.mobilia ?? {}).flatMap(([comodo, lista]) =>
    lista.map((m) => ({ ...m, comodo })),
  );
}

/**
 * Traduz uma lista de `{ movel, tx, ty }` do catalogo `MOVEIS_CASA` pro formato
 * de `objetosDeMovel`. `comodo` sobrevive a traducao so pra mensagem de erro
 * da conferencia dizer em que comodo a peca esta.
 */
function pecasDeCatalogo(rotulo, lista) {
  return lista.map((m) => {
    const def = MOVEIS_CASA[m.movel];
    if (!def) throw new Error(`"${rotulo}": movel "${m.movel}" nao existe em MOVEIS_CASA`);
    // O comodo so recebe peca da propria categoria (mais as `comum`). E o que
    // impede a mobilia generica de voltar a se espalhar por todo comodo: sem
    // isto, pousar uma comoda no banheiro passaria batido.
    if (m.comodo) {
      const tipo = TIPO_DE_COMODO[m.comodo.replace(/_\d+$/, '')];
      if (!tipo) throw new Error(`"${rotulo}": comodo "${m.comodo}" nao tem tipo em TIPO_DE_COMODO`);
      if (def.comodo !== 'comum' && def.comodo !== tipo) {
        throw new Error(
          `"${rotulo}": "${m.movel}" e peca de ${def.comodo} e esta no comodo "${m.comodo}"` +
            ` (tipo ${tipo})`,
        );
      }
    }
    return {
      folha: def.folha,
      peca: def.peca,
      tx: m.tx,
      ty: m.ty,
      colide: def.solido,
      chao: def.chao === true,
      escala: def.escala ?? 1,
      comodo: m.comodo,
      movel: m.movel,
    };
  });
}

/**
 * Traduz a mobilia de uma planta multi-comodo. Sao duas fontes: `mobilia` vem
 * do catalogo `MOVEIS_CASA` (as folhas genericas de sala e quarto) e
 * `mobiliaFolha` vem direto de uma folha dedicada, pelo par [linha, indice] —
 * e o que os mistos usam na area publica (`Moveis_farmacia_bar.png`).
 */
function pecasDaPlanta(nome) {
  const p = planta(nome);
  const doCatalogo = pecasDeCatalogo(nome, mobiliaDaPlanta(p));
  const daFolha = Object.entries(p.mobiliaFolha ?? {}).flatMap(([comodo, lista]) =>
    lista.map((m) => ({ folha: p.folha, comodo, ...m })),
  );
  return [...doCatalogo, ...daFolha];
}

// --------------------------------------------------- portas entre comodos --
/**
 * Que cor de porta cada comodo pede. A arte traz o pictograma junto, entao isto
 * decide tambem qual placa aparece na folha. A ORDEM importa: um vao faz divisa
 * com dois comodos, e ganha o mais especifico dos dois — banheiro na frente de
 * cozinha, cozinha na frente de quarto, e sala/corredor/hall/salao no fim, que
 * levam a porta de madeira neutra.
 */
const PORTA_DO_COMODO = [
  ['banheiro', 'claro'],
  ['cozinha', 'verde'],
  ['quarto', 'madeira'],
];
const PORTA_DE_VAO_PADRAO = 'madeira';

/**
 * Agrupa `vaos` em PASSAGENS: tiles de vao colados formam um vao so.
 *
 * Uma passagem de 1 tile e um vao em parede fina; uma de 2 tiles empilhados e o
 * vao numa parede horizontal, que tem 2 tiles de espessura de proposito (ver
 * `PLANTAS_CASA`). Qualquer outro formato erra alto em vez de sair sem porta:
 * seria uma passagem que a arte de porta ainda nao sabe cobrir.
 */
function passagensDaPlanta(p) {
  const pendentes = new Set((p.vaos ?? []).map(([x, y]) => `${x},${y}`));
  const passagens = [];
  for (const [x, y] of p.vaos ?? []) {
    if (!pendentes.has(`${x},${y}`)) continue;
    const grupo = [];
    const fila = [[x, y]];
    pendentes.delete(`${x},${y}`);
    while (fila.length) {
      const [a, b] = fila.pop();
      grupo.push([a, b]);
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const k = `${a + dx},${b + dy}`;
        if (!pendentes.has(k)) continue;
        pendentes.delete(k);
        fila.push([a + dx, b + dy]);
      }
    }
    grupo.sort((u, v) => u[1] - v[1] || u[0] - v[0]);
    const empilhados =
      grupo.length === 2 && grupo[0][0] === grupo[1][0] && grupo[1][1] === grupo[0][1] + 1;
    if (grupo.length !== 1 && !empilhados) {
      throw new Error(
        `vao de formato inesperado (${grupo.map((g) => g.join(',')).join(' ')}): a porta interna ` +
          `so sabe cobrir vao de 1 tile ou de 2 empilhados`,
      );
    }
    passagens.push(grupo);
  }
  return passagens;
}

/**
 * Os tiles de porta de cada passagem da planta: `[x, y, gid]`.
 *
 * A porta e SO arte. Ela nao entra na geometria que `conferirInterior` usa (que
 * sai de `paredes`/`vaos`), o tile nao colide e nao ha interacao de abrir nem
 * fechar — o jogador atravessa o vao exatamente como atravessava antes de haver
 * porta nenhuma. Derivar a lista dos proprios `vaos`, em vez de repetir as
 * coordenadas a mao, e o que garante isso: a porta nao tem como cair fora da
 * passagem nem sobrar uma passagem sem porta.
 */
function portasDeVao(p) {
  const comodoEm = new Map();
  for (const [nome, [x, y, w, h]] of Object.entries(p.comodos ?? {})) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) comodoEm.set(`${i},${j}`, nome);
    }
  }
  /** Comodos que a passagem liga, na vizinhanca de todos os tiles dela. */
  const vizinhos = (grupo) => {
    const nomes = new Set();
    for (const [x, y] of grupo) {
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const c = comodoEm.get(`${x + dx},${y + dy}`);
        if (c) nomes.add(c);
      }
    }
    return nomes;
  };

  const saida = [];
  for (const grupo of passagensDaPlanta(p)) {
    const ligados = vizinhos(grupo);
    const cor =
      PORTA_DO_COMODO.find(([comodo]) =>
        [...ligados].some((n) => n === comodo || n.startsWith(`${comodo}_`)),
      )?.[1] ?? PORTA_DE_VAO_PADRAO;
    if (grupo.length === 1) {
      saida.push([grupo[0][0], grupo[0][1], GID[`PORTA_INT_${cor}`]]);
    } else {
      saida.push([grupo[0][0], grupo[0][1], GID[`PORTA_INT_${cor}_TOPO`]]);
      saida.push([grupo[1][0], grupo[1][1], GID[`PORTA_INT_${cor}_BASE`]]);
    }
  }
  return saida;
}

// ------------------------------------------------- acabamento de parede --
/**
 * Gids que ocupam a linha da parede sem SER parede opaca: a saida, a porta
 * somente-NPC e as portas internas. Pra decidir o relevo eles contam como
 * parede — o fio de luz e a sombra sao da alvenaria, e a arte da porta ja traz
 * o proprio batente.
 */
function gidsDaLinhaDeParede() {
  return new Set(
    TILES.filter((t) => t.nome === 'PORTA' || t.nome === 'PORTA_NPC' || t.paredeInterna).map(
      (t) => GID[t.nome],
    ),
  );
}

/**
 * De que estilo e a parede em cada tile.
 *
 * O padrao e o estilo da planta (`parede`); um comodo pode pedir o proprio em
 * `paredePorComodo`, que e o que poe azulejo no banheiro e na cozinha sem
 * mexer no resto da casa. A regra de desempate, pra um tile que faz divisa com
 * dois comodos, e: vizinho COM estilo proprio ganha de vizinho sem, e vizinho
 * colado ganha de vizinho a dois tiles (parede horizontal tem 2 de espessura,
 * entao o tile de tras so alcanca o comodo pulando um).
 */
function estiloDeParedeDoTile(p) {
  const padrao = p.parede ?? 'reboco_creme';
  const proprio = p.paredePorComodo ?? {};
  const comodoEm = new Map();
  for (const [nome, [x, y, w, h]] of Object.entries(p.comodos ?? {})) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) comodoEm.set(`${i},${j}`, nome);
    }
  }
  const colados = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const doisTiles = colados.map(([dx, dy]) => [dx * 2, dy * 2]);
  return (x, y) => {
    for (const grupo of [colados, doisTiles]) {
      for (const [dx, dy] of grupo) {
        const c = comodoEm.get(`${x + dx},${y + dy}`);
        if (c && proprio[c]) return proprio[c];
      }
      for (const [dx, dy] of grupo) {
        if (comodoEm.has(`${x + dx},${y + dy}`)) return padrao;
      }
    }
    return padrao;
  };
}

/**
 * Segunda passada na camada `objetos`: troca cada tile de parede generico pela
 * variante de arte + relevo que a vizinhanca pede (ver `relevoDeParede`).
 *
 * A parede e pintada antes com um gid marcador (`GID.PAREDE`), o que deixa a
 * planta falando so de geometria; a arte entra aqui, depois de os vaos e as
 * portas ja estarem no lugar. Fora do mapa conta como parede, entao a moldura
 * so ganha relevo na face que de fato da pro comodo.
 */
function acabarParedes(obj, W, H, estiloEm) {
  const naLinha = gidsDaLinhaDeParede();
  const ehParede = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    const g = obj.get(x, y);
    return g === GID.PAREDE || naLinha.has(g);
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (obj.get(x, y) !== GID.PAREDE) continue;
      const base = !ehParede(x, y + 1);
      const topo = !ehParede(x, y - 1);
      const variante = base && topo ? 'UNICA' : base ? 'BASE' : topo ? 'TOPO' : 'CORPO';
      const estilo = estiloEm(x, y);
      const gid = GID[`PAREDE_${estilo}_${variante}`];
      if (!gid) throw new Error(`nao existe tile PAREDE_${estilo}_${variante}`);
      obj.set(x, y, gid);
    }
  }
}

// -------------------------------------------- interior de varios comodos --
/**
 * Interior MULTI-COMODO: um mapa so, com paredes internas e vaos, a partir de
 * uma planta (ver `PLANTAS_CASA` / `PLANTAS_MISTO`). Nao ha transicao de tela
 * entre comodos — o jogador anda de um pro outro como anda pela sala.
 *
 * O que sai no tilemap, alem das camadas de sempre, e uma camada de objetos
 * `comodos`: um retangulo por comodo, com a propriedade `privado`. E dela que
 * `verificar-mapas` tira o que o jogador tem de alcancar e o que ele nao pode
 * alcancar, sem precisar repetir o layout do lado de la.
 */
function gerarInteriorPlanta(nome, ts) {
  const p = planta(nome);
  const { largura: W, altura: H } = p;
  const c = construcao(nome);

  const chao = new Grade(W, H, GID[p.chao ?? 'MADEIRA']);
  for (const [x, y, w, h, material] of p.faixasDeChao ?? []) chao.rect(x, y, w, h, GID[material]);
  // piso POR COMODO: o retangulo de cada comodo pega a textura que a planta
  // pediu. Vale pra area util; o tile do vao fica com o piso de fundo, que e o
  // que faz ele ler como soleira entre um comodo e o outro.
  for (const [comodo, piso] of Object.entries(p.pisos ?? {})) {
    const ret = p.comodos?.[comodo];
    if (!ret) throw new Error(`"${nome}": piso pedido pro comodo "${comodo}", que nao existe`);
    chao.rect(ret[0], ret[1], ret[2], ret[3], gidDePiso(piso));
  }

  const obj = new Grade(W, H);
  obj.moldura(GID.PAREDE);
  obj.rect(0, 0, W, PAREDE_TOPO, GID.PAREDE);
  for (const [x, y, w, h] of p.paredes) obj.rect(x, y, w, h, GID.PAREDE);
  for (const [x, y] of p.vaos) obj.set(x, y, 0);
  // depois dos vaos: a porta somente-NPC e parede pro jogador, entao ela nao
  // pode ser apagada por engano se cair num vao
  for (const [x, y] of p.portasNpc ?? []) obj.set(x, y, GID.PORTA_NPC);
  obj.set(p.porta, H - 1, GID.PORTA); // saida (nao colide)
  // arte por cima da geometria: primeiro a porta de cada vao, depois o relevo
  // da alvenaria — que precisa das portas ja postas pra nao tratar o vao como
  // chao e sombrear a parede no meio do batente
  for (const [x, y, gid] of portasDeVao(p)) obj.set(x, y, gid);
  acabarParedes(obj, W, H, estiloDeParedeDoTile(p));

  // `cama` e opcional: escola e biblioteca nao tem uma.
  if (p.cama) {
    obj.set(p.cama.x, p.cama.y, GID.CAMA_QUARTO_TOPO);
    obj.set(p.cama.x, p.cama.y + 1, GID.CAMA_QUARTO_BASE);
  }

  const interativos = [
    // a saida devolve o jogador na frente da porta DAQUELE lote, no mapa
    // externo a que o lote pertence — que ja nao e sempre a fazenda
    objeto('porta_saida', 'porta', p.porta, H - 1, {
      destino: c.mapa,
      destinoTx: c.frente.x,
      destinoTy: c.frente.y,
      rotulo: 'Sair',
    }),
  ];
  if (p.cama) interativos.push(objeto(`cama_${nome}`, 'cama', p.cama.x, p.cama.y + 1));
  if (p.pc) interativos.push(objeto(`computador_${nome}`, 'computador', p.pc.x, p.pc.y));
  if (p.mobiliar) {
    interativos.push(objeto(`mobilia_${nome}`, 'mobilia', p.mobiliar.x, p.mobiliar.y));
  }

  const privados = new Set(p.privados ?? []);
  const comodos = Object.entries(p.comodos).map(([comodo, [x, y, w, h]]) =>
    objeto(comodo, 'comodo', x, y, { privado: privados.has(comodo) }, w, h),
  );

  const moveis = objetosDeMovel(nome, pecasDaPlanta(nome), p.folha);

  /**
   * Camada `expansoes`: um retangulo por comodo COMPRAVEL, com o tile do vao
   * que o jogo tapa com parede enquanto o comodo nao foi comprado.
   *
   * O comodo ja nasce CONSTRUIDO no tilemap (piso, parede, vao) — lacrar em
   * runtime e mais simples e mais confiavel do que abrir alvenaria: nao ha
   * geometria pra inventar na hora da compra, so um tile pra apagar.
   */
  const camadas = [
    camadaTiles('chao', 1, chao),
    camadaTiles('objetos', 2, obj),
    camadaObjetos('interativos', 3, interativos),
    camadaObjetos('moveis', 4, moveis),
    camadaObjetos('comodos', 5, comodos),
  ];
  const expansoes = Object.entries(p.expansoes ?? {}).map(([comodo, def]) => {
    const ret = p.comodos[comodo];
    if (!ret) throw new Error(`"${nome}": expansao "${comodo}" nao tem comodo`);
    return objeto(
      comodo,
      'expansao',
      ret[0],
      ret[1],
      { comodo, vaoTx: def.vao[0], vaoTy: def.vao[1], gidParede: GID.PAREDE },
      ret[2],
      ret[3],
    );
  });
  if (expansoes.length) camadas.push(camadaObjetos('expansoes', 6, expansoes));

  return {
    mapa: montarMapa(W, H, camadas, ts),
    moveis: moveis.length,
  };
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
function gerarInteriorComercio(salao, ts) {
  const { nome, tamanho, pecas, folha } = salao;
  const c = construcao(nome);
  const { largura: W, altura: H } = tamanho;
  const chao = new Grade(W, H, gidDePiso(salao.piso));
  const obj = new Grade(W, H);

  obj.moldura(GID.PAREDE);
  const portaX = Math.floor(W / 2);
  obj.set(portaX, H - 1, GID.PORTA);
  // salao e um comodo so: o estilo de parede do ramo vale pro perimetro inteiro
  acabarParedes(obj, W, H, () => salao.parede);

  const moveis = objetosDeMovel(nome, pecas, folha);

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

// ------------------------------------------------------ sanidade: interior --
/**
 * Confere um interior antes de escrever o JSON. Cobra quatro coisas:
 *
 * 1. toda peca cabe na sala (base fora da parede de baixo, nada saindo do mapa);
 * 2. duas pecas nao dividem tile de base — com uma excecao de proposito: peca
 *    marcada `chao` (tapete) e uma camada abaixo, entao movel em cima de tapete
 *    e o resultado desejado, nao colisao de layout;
 * 3. acesso do NPC: todo tile livre e alcancavel a partir da frente da porta,
 *    atravessando as portas somente-NPC;
 * 4. acesso do JOGADOR: idem, mas com as portas somente-NPC fechadas — e ai todo
 *    tile livre FORA de comodo privado tem de continuar alcancavel, e nenhum
 *    tile de `proibirJogador` pode estar.
 *
 * Sao literalmente dois flood-fills sobre a mesma grade, com a unica diferenca
 * de como cada um trata a porta somente-NPC — que e o contrato descrito em
 * src/game/colisao.ts.
 *
 * A rasterizacao do corpo e conservadora: qualquer sobreposicao com o tile ja
 * conta como bloqueio. Se o flood-fill reprovar por causa de uma lasquinha, o
 * certo e mexer no layout, nao afrouxar a conta.
 */
function conferirInterior(rotulo, tamanho, pecas, folhaPadrao, extras) {
  const { largura: W, altura: H } = tamanho;
  const {
    bloqueados = [],
    exigirLivres = [],
    exigirComodos = [],
    proibirJogador = [],
    paredes = [],
    vaos = [],
    portasNpc = [],
    privados = [],
    /**
     * Retangulos LACRADOS: tiles que ficam fora da conta de acesso, dos dois
     * lados. E o que a conferencia do estado "expansao nao comprada" usa — o
     * comodo existe no tilemap e e livre, mas o vao esta tapado, entao exigir
     * que ele seja alcancavel seria exigir o contrario do que se quer provar.
     */
    lacrados = [],
    portaX,
    paredeTopo = 1,
  } = extras;

  const tilesDoRet = (r) => {
    const lista = [];
    for (let y = Math.floor(r.y0); y < Math.ceil(r.y1); y++) {
      for (let x = Math.floor(r.x0); x < Math.ceil(r.x1); x++) lista.push([x, y]);
    }
    return lista;
  };

  // --- 1 e 2: geometria das pecas
  const baseOcupada = new Map(); // tile da base -> indice da peca que o tomou
  const ondeFica = (i) => {
    const p = pecas[i];
    return p.comodo ? `${p.movel ?? p.peca} no ${p.comodo}` : `[${p.peca}]`;
  };
  pecas.forEach((p, i) => {
    const chave = p.folha ?? folhaPadrao;
    const { w, h } = tamanhoDeMovel(chave, p.peca, p.escala);
    const visual = { x0: p.tx, x1: p.tx + w, y0: p.ty + 1 - h, y1: p.ty + 1 };
    if (visual.x0 < 0 || visual.x1 > W || visual.y0 < 0) {
      throw new Error(
        `${rotulo}: movel ${i} (${ondeFica(i)}) sai do mapa (${JSON.stringify(visual)})`,
      );
    }
    if (visual.y1 > H - 1) {
      throw new Error(`${rotulo}: movel ${i} (${ondeFica(i)}) tem a base na parede de baixo`);
    }
    if (visual.y1 < paredeTopo) {
      throw new Error(`${rotulo}: movel ${i} (${ondeFica(i)}) tem a base dentro da parede de cima`);
    }
    if (p.chao) return; // tapete e camada de chao: pode ter movel em cima
    for (const [x, y] of tilesDoRet(corpoDeMovel(p, folhaPadrao))) {
      const antes = baseOcupada.get(`${x},${y}`);
      if (antes !== undefined) {
        throw new Error(
          `${rotulo}: movel ${i} (${ondeFica(i)}) divide o tile ${x},${y} com o movel ` +
            `${antes} (${ondeFica(antes)})`,
        );
      }
      baseOcupada.set(`${x},${y}`, i);
    }
  });

  // --- 3 e 4: acesso. `bloq` e a grade do JOGADOR e `bloqNpc` a do NPC; a
  // unica diferenca entre as duas e a porta somente-NPC.
  const bloq = new Grade(W, H, 0);
  bloq.moldura(1);
  bloq.rect(0, 0, W, paredeTopo, 1);
  for (const [x, y, w, h] of paredes) bloq.rect(x, y, w, h, 1);
  for (const [x, y] of vaos) bloq.set(x, y, 0);
  for (const [x, y] of portasNpc) bloq.set(x, y, 1);
  for (const [x, y] of bloqueados) bloq.set(x, y, 1);
  for (const p of pecas) {
    if (p.colide === false) continue;
    for (const [x, y] of tilesDoRet(corpoDeMovel(p, folhaPadrao))) bloq.set(x, y, 1);
  }
  const bloqNpc = new Grade(W, H, 0);
  bloqNpc.px = [...bloq.px];
  for (const [x, y] of portasNpc) {
    if (!bloq.get(x, y)) throw new Error(`${rotulo}: a porta somente-NPC (${x},${y}) nao bloqueia`);
    bloqNpc.set(x, y, 0);
  }

  const inicio = [portaX, H - 2];
  if (bloq.get(...inicio)) {
    throw new Error(`${rotulo}: a frente da porta (${inicio}) esta bloqueada por movel`);
  }
  const alcance = (grade) => {
    const visto = new Set([`${inicio[0]},${inicio[1]}`]);
    const fila = [inicio];
    while (fila.length) {
      const [x, y] = fila.pop();
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]) {
        const a = x + dx;
        const b = y + dy;
        const k = `${a},${b}`;
        if (!grade.dentro(a, b) || visto.has(k) || grade.get(a, b)) continue;
        visto.add(k);
        fila.push([a, b]);
      }
    }
    return visto;
  };
  const vistoNpc = alcance(bloqNpc);
  const vistoJogador = alcance(bloq);

  // area privada: os tiles que o jogador NAO precisa alcancar (e, mais abaixo,
  // nao pode). Vem dos comodos marcados `privado` na planta.
  const privado = new Set();
  for (const [x0, y0, w, h] of privados) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) privado.add(`${x},${y}`);
  }

  const lacrado = new Set();
  for (const [x0, y0, w, h] of lacrados) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) lacrado.add(`${x},${y}`);
  }

  let livres = 0;
  const ilhados = [];
  const semJogador = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (bloqNpc.get(x, y) || lacrado.has(`${x},${y}`)) continue;
      livres++;
      const k = `${x},${y}`;
      if (!vistoNpc.has(k)) ilhados.push(k);
      else if (!privado.has(k) && !bloq.get(x, y) && !vistoJogador.has(k)) semJogador.push(k);
    }
  }
  if (ilhados.length) {
    throw new Error(
      `${rotulo}: ${ilhados.length} tile(s) livre(s) sem acesso a partir da porta: ` +
        ilhados.slice(0, 8).join(' '),
    );
  }
  if (semJogador.length) {
    throw new Error(
      `${rotulo}: ${semJogador.length} tile(s) fora de comodo privado que o jogador nao ` +
        `alcanca: ${semJogador.slice(0, 8).join(' ')}`,
    );
  }
  // um comodo esta OK quando pelo menos um tile dele e livre e alcancavel: e o
  // que prova que da pra entrar nele. Que TODO tile livre seja alcancavel ja e
  // cobrado acima, entao nao ha ganho em escolher um tile especifico aqui —
  // so o risco de escolher justo o que o guarda-roupa ocupa.
  for (const [x0, y0, w, h, comodo, quem = 'jogador'] of exigirComodos) {
    const grade = quem === 'npc' ? bloqNpc : bloq;
    const visto = quem === 'npc' ? vistoNpc : vistoJogador;
    let ok = false;
    for (let y = y0; y < y0 + h && !ok; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (!grade.get(x, y) && visto.has(`${x},${y}`)) {
          ok = true;
          break;
        }
      }
    }
    if (!ok) {
      throw new Error(
        `${rotulo}: o comodo "${comodo}" (${x0},${y0} ${w}x${h}) nao tem nenhum tile ` +
          `livre alcancavel pelo ${quem}`,
      );
    }
  }
  for (const [x, y, oque, quem = 'jogador'] of exigirLivres) {
    const grade = quem === 'npc' ? bloqNpc : bloq;
    const visto = quem === 'npc' ? vistoNpc : vistoJogador;
    if (grade.get(x, y)) throw new Error(`${rotulo}: ${oque} (${x},${y}) ficou bloqueado`);
    if (!visto.has(`${x},${y}`)) {
      throw new Error(`${rotulo}: ${oque} (${x},${y}) ficou sem acesso para o ${quem}`);
    }
  }
  for (const [x, y, oque] of proibirJogador) {
    if (vistoJogador.has(`${x},${y}`)) {
      throw new Error(`${rotulo}: o jogador alcanca ${oque} (${x},${y}), que deveria ser privado`);
    }
  }

  const solidos = pecas.filter((p) => p.colide !== false).length;
  return {
    livres,
    alcancaveis: vistoJogador.size,
    alcancaveisNpc: vistoNpc.size,
    solidos,
    decorativos: pecas.length - solidos,
  };
}

/**
 * Salao de comercio PURO: mesma conferencia das casas, sem cama — ninguem mora
 * no mercado nem na academia. O bar e a farmacia sao mistos e tem conferencia
 * propria (`conferirMistos`), que cobra a cama tambem. O que mais importa aqui
 * e a COLUNA DA PORTA — o salao e largo e e facil um balcao de 3 tiles cair em
 * cima dela, o que trancaria o jogador do lado de fora.
 */
const SALOES = () => [
  {
    nome: 'mercado',
    tamanho: MERCADO_INTERIOR,
    pecas: MERCADO_PECAS,
    folha: 'mercado',
    parede: 'mercado',
    piso: 'granilite',
  },
  {
    nome: 'academia',
    tamanho: ACADEMIA_INTERIOR,
    pecas: ACADEMIA_PECAS,
    folha: 'academia',
    parede: 'academia',
    piso: 'concreto_escuro',
  },
];

function conferirSaloes() {
  const linhas = [];
  for (const salao of SALOES()) {
    const portaX = Math.floor(salao.tamanho.largura / 2);
    const r = conferirInterior(salao.nome, salao.tamanho, salao.pecas, salao.folha, {
      portaX,
      exigirLivres: [[portaX, salao.tamanho.altura - 2, 'a frente da porta']],
    });
    linhas.push(
      `  ${salao.nome}: ${salao.pecas.length} moveis (${r.solidos} solidos,` +
        ` ${r.decorativos} decorativos) | ${r.alcancaveis}/${r.livres} tiles livres alcancaveis`,
    );
  }
  console.log(['saloes de comercio:', ...linhas].join('\n'));
}

/**
 * Roda a conferencia numa planta multi-comodo. Alem do que `conferirInterior` ja
 * cobra sozinho, exige explicitamente:
 *
 * - a frente da porta de saida e a frente da cama livres;
 * - o spawn do morador livre e alcancavel PELO NPC (num misto ele fica do lado
 *   privado, onde o jogador nao chega);
 * - um tile de cada COMODO alcancavel — pelo jogador nos comodos publicos, so
 *   pelo NPC nos privados — e, nos privados, a garantia de que o jogador NAO
 *   chega la por caminho nenhum, tile por tile.
 */
function conferirPlanta(nome, extras = {}) {
  const p = planta(nome);
  const pecas = pecasDaPlanta(nome);
  const privados = new Set(p.privados ?? []);
  // Nas casas a cama e do jogador (ele dorme e salva nela); nos mistos ela fica
  // no quarto privado do dono, e ai so o NPC precisa chegar nela.
  const quemUsaACama = privados.size ? 'npc' : 'jogador';
  const exigir = [
    [p.porta, p.altura - 2, 'a frente da porta'],
    // cama e morador sao OPCIONAIS: escola e biblioteca nao tem nem um nem outro
    ...(p.cama ? [[p.cama.x, p.cama.y + 2, 'a frente da cama', quemUsaACama]] : []),
    ...(p.spawnNpc ? [[p.spawnNpc.x, p.spawnNpc.y, 'o spawn do morador', 'npc']] : []),
    ...(p.pc ? [[p.pc.x, p.pc.y + 1, 'a frente do computador']] : []),
    ...(p.mobiliar ? [[p.mobiliar.x, p.mobiliar.y + 1, 'a frente da bancada']] : []),
    ...(extras.exigirLivres ?? []),
  ];
  const proibir = [...(extras.proibirJogador ?? [])];
  const exigirComodos = [];
  for (const [comodo, [x, y, w, h]] of Object.entries(p.comodos)) {
    exigirComodos.push([x, y, w, h, comodo, privados.has(comodo) ? 'npc' : 'jogador']);
    if (privados.has(comodo)) {
      for (let j = y; j < y + h; j++) {
        for (let i = x; i < x + w; i++) proibir.push([i, j, `o comodo privado "${comodo}"`]);
      }
    }
  }

  // Os retangulos de comodo cobrem so a area util: o tile do VAO fica na linha
  // da parede e nao pertence a comodo nenhum. Um vao que da pra comodo privado e
  // privado tambem — senao ele apareceria como "tile publico que o jogador nao
  // alcanca", que e exatamente o contrario do que ele e.
  const retsPrivados = Object.entries(p.comodos)
    .filter(([comodo]) => privados.has(comodo))
    .map(([, ret]) => ret);
  const ehPrivado = (x, y) =>
    retsPrivados.some(([rx, ry, rw, rh]) => x >= rx && y >= ry && x < rx + rw && y < ry + rh);
  for (const [x, y] of p.vaos) {
    const vizinhoPrivado = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]].some(([a, b]) =>
      ehPrivado(a, b),
    );
    if (!vizinhoPrivado) continue;
    retsPrivados.push([x, y, 1, 1]);
    proibir.push([x, y, `o vao privado ${x},${y}`]);
  }

  const r = conferirInterior(nome, p, pecas, p.folha, {
    bloqueados: p.cama
      ? [
          [p.cama.x, p.cama.y],
          [p.cama.x, p.cama.y + 1],
        ]
      : [],
    paredes: p.paredes,
    vaos: p.vaos,
    portasNpc: p.portasNpc ?? [],
    privados: retsPrivados,
    portaX: p.porta,
    paredeTopo: PAREDE_TOPO,
    exigirLivres: exigir,
    exigirComodos,
    proibirJogador: proibir,
  });
  return { p, pecas, ...r };
}

/**
 * Conferencia dos interiores proprios (oficina, escola, biblioteca).
 *
 * Na casa+oficina ela roda DUAS vezes: uma com todas as expansoes abertas (que
 * e o estado gravado no tilemap) e outra com elas LACRADAS, que e o estado de
 * um jogo novo. A segunda passada e o que prova que tapar o vao nao ilha nenhum
 * comodo basico — o jogador de jogo novo tem de alcancar quarto, sala, cozinha,
 * banheiro e oficina do mesmo jeito.
 */
function conferirPlantasProprias() {
  const linhas = [];
  for (const nome of Object.keys(PLANTAS_PROPRIAS)) {
    const p = PLANTAS_PROPRIAS[nome];
    const expandiveis = Object.keys(p.expansoes ?? {});
    const r = conferirPlanta(nome);
    if (expandiveis.length) conferirLacrada(nome, p, expandiveis);
    const comodos = Object.keys(r.p.comodos);
    const compraveis = expandiveis.length
      ? ` | ${expandiveis.length} compraveis (${expandiveis.join(', ')})`
      : '';
    linhas.push(
      `  ${nome} (${r.p.largura}x${r.p.altura}): ${comodos.length} comodos ` +
        `[${comodos.join(', ')}]${compraveis} | ${r.pecas.length} moveis | ` +
        `${r.alcancaveis}/${r.livres} tiles livres`,
    );
  }
  console.log(`interiores proprios (protagonista e predios publicos):`);
  for (const l of linhas) console.log(l);
}

/** A mesma planta com os vaos de expansao tapados e os comodos comprados fora. */
function conferirLacrada(nome, p, expandiveis) {
  const eVaoDeExpansao = (x, y) =>
    Object.values(p.expansoes).some((e) => e.vao[0] === x && e.vao[1] === y);
  const semExpansao = (obj) =>
    Object.fromEntries(Object.entries(obj ?? {}).filter(([c]) => !expandiveis.includes(c)));
  const lacrada = {
    ...p,
    vaos: p.vaos.filter(([x, y]) => !eVaoDeExpansao(x, y)),
    comodos: semExpansao(p.comodos),
    pisos: semExpansao(p.pisos),
    mobilia: semExpansao(p.mobilia),
  };
  conferirInterior(
    `${nome} (expansoes lacradas)`,
    lacrada,
    pecasDeCatalogo(nome, mobiliaDaPlanta(lacrada)),
    lacrada.folha,
    {
      bloqueados: lacrada.cama
        ? [
            [lacrada.cama.x, lacrada.cama.y],
            [lacrada.cama.x, lacrada.cama.y + 1],
          ]
        : [],
      paredes: lacrada.paredes,
      vaos: lacrada.vaos,
      portasNpc: [],
      privados: [],
      portaX: lacrada.porta,
      paredeTopo: PAREDE_TOPO,
      exigirLivres: [
        [lacrada.porta, lacrada.altura - 2, 'a frente da porta'],
        ...(lacrada.pc ? [[lacrada.pc.x, lacrada.pc.y + 1, 'a frente do computador']] : []),
        ...(lacrada.mobiliar
          ? [[lacrada.mobiliar.x, lacrada.mobiliar.y + 1, 'a frente da bancada']]
          : []),
      ],
      exigirComodos: Object.entries(lacrada.comodos).map(([c, [x, y, w, h]]) => [
        x,
        y,
        w,
        h,
        c,
        'jogador',
      ]),
      // o comodo comprado, mais o proprio tile do vao tapado
      lacrados: [
        ...expandiveis.map((c) => p.comodos[c]),
        ...Object.values(p.expansoes).map((e) => [e.vao[0], e.vao[1], 1, 1]),
      ],
      proibirJogador: [],
    },
  );
}

/** Conferencia das 5 casas de NPC, todas multi-comodo e todas do jogador. */
function conferirPlantasDeCasa() {
  const linhas = [];
  for (const nome of Object.keys(PLANTAS_CASA)) {
    const r = conferirPlanta(nome);
    const comodos = Object.keys(r.p.comodos);
    linhas.push(
      `  ${nome} (${r.p.largura}x${r.p.altura}): ${comodos.length} comodos ` +
        `[${comodos.join(', ')}] | ${r.pecas.length} moveis (${r.solidos} solidos, ` +
        `${r.decorativos} decorativos) | ${r.alcancaveis}/${r.livres} tiles livres ` +
        `alcancaveis pelo jogador`,
    );
  }
  console.log(`interiores multi-comodo das casas de NPC:\n${linhas.join('\n')}`);
}

// ------------------------------------------- interiores mistos (casa+comercio) --
/**
 * Predio misto: moradia e comercio no MESMO mapa de interior, agora com parede
 * de verdade entre os dois.
 *
 * - AREA PUBLICA (x >= 10, chao de ladrilho): o salao comercial, igualzinho ao
 *   que ja existia — mesma porta, mesmas pecas da folha dedicada, mesmas
 *   coordenadas. E o unico pedaco que o jogador ve.
 * - AREA PRIVADA (x <= 8, chao de madeira): a moradia do dono, dividida em
 *   quarto (com a cama), corredor e sala. O jogador NAO entra: a divisa e uma
 *   coluna inteira de parede.
 * - A ligacao entre as duas e um tile so, `PORTA_NPC` em (9,8): parede pro
 *   jogador, passagem livre pro dono. Ver src/game/colisao.ts.
 *
 * A planta privada e a MESMA nos dois lotes de proposito — e ela que faz o
 * mecanismo valer pra qualquer misto futuro: quem criar um lote novo herda a
 * divisao, a porta e a rota interna so espalhando `PLANTA_MISTO_BASE`.
 */
const PLANTA_MISTO_BASE = {
  // moradia com papel de parede de casa; o salao pede a folha do proprio ramo,
  // entao cada lote poe o seu em `paredePorComodo` (ver `PLANTAS_MISTO`). A
  // coluna divisoria fica com o estilo do SALAO: e a unica das duas faces que o
  // jogador chega a ver.
  parede: 'liso_bege',
  largura: 20,
  altura: 14,
  porta: 10,
  chao: 'PISO',
  // metade oeste em madeira: e a moradia. A coluna 9 e parede, entao o material
  // dela nao aparece — vai junto so pra faixa nao ter buraco.
  faixasDeChao: [[0, 0, 10, 14, 'PISO_MADEIRA_CLARA']],
  cama: { x: 2, y: 2 },
  spawnNpc: { x: 5, y: 11 },
  paredes: [
    [9, 2, 1, 11], // divisa publica/privada, de parede a parede
    [1, 7, 8, 1], // quarto / corredor
    [1, 9, 8, 1], // corredor / sala
  ],
  vaos: [[6, 7], [3, 9]],
  portasNpc: [[9, 8]],
  comodos: {
    quarto: [1, 2, 8, 5],
    corredor: [1, 8, 8, 1],
    sala: [1, 10, 8, 3],
    salao: [10, 2, 9, 11],
  },
  privados: ['quarto', 'corredor', 'sala'],
  folha: 'farmacia_bar',
};

/**
 * Os dois POSTOS do dono, pra presenca interior fixa (ver `posto_interior` em
 * src/game/rotinasNpc.ts): ele passa o dia alternando entre estes dois pontos
 * dentro do proprio predio — e desde agora ANDANDO de um pro outro, atravessando
 * a porta somente-NPC no caminho.
 *
 * `trabalho` fica ATRAS do balcao — nos dois mistos o movel de balcao ocupa as
 * linhas 6 e 7, entao a linha 5 e o lado de dentro dele. O sprite do dono sai
 * com profundidade menor que a do balcao, entao ele aparece atras da peca, que e
 * a leitura certa. `moradia` fica na sala da area privada, ao lado da cozinha
 * improvisada — e o mesmo tile em que ele nasce.
 *
 * Estao duplicados em `LOCAIS_CIDADE[...].postos` (src/game/npcs.ts), porque o
 * jogo precisa deles sem ler o gerador. A conferencia abaixo cobra que o de
 * trabalho seja alcancavel pelo JOGADOR e o de moradia so pelo NPC.
 */
const MISTO_POSTOS = {
  trabalho: { x: 13, y: 5 },
  moradia: PLANTA_MISTO_BASE.spawnNpc,
};
/** Um tile do fundo do salao que tem de ser alcancavel pelo jogador. */
const MISTO_ALVO_TRABALHO = { x: 15, y: 8 };

/**
 * As duas pontas da porta somente-NPC. O lado publico e do jogador (ele chega
 * ate a porta e para), o lado privado nao — se um dia ele alcancar (8,8) a
 * conferencia reprova, porque o comodo inteiro esta em `proibirJogador`.
 */
const MISTO_LADOS_DA_PORTA = { publico: { x: 10, y: 8 }, privado: { x: 8, y: 8 } };

/**
 * Mobilia de cada predio misto, em dois blocos.
 *
 * `mobilia` sai do catalogo `MOVEIS_CASA` e mobilia a AREA PRIVADA, com a mesma
 * regra de categoria das residencias: o quarto do dono leva peca de quarto.
 * `mobiliaFolha` sai da folha DEDICADA `farmacia_bar` e mobilia o SALAO, que nao
 * mudou uma peca de lugar — o que mudou nele foi so a parede e o piso, que
 * passaram a sair da arte do proprio ramo.
 *
 * `tx`/`ty` sao o tile do canto esquerdo-INFERIOR, como no resto do gerador.
 */
const PLANTAS_MISTO = {
  // Bar: back bar de garrafas ao fundo, balcao com duas banquetas de frente pra
  // porta, mesa e banco na parede da direita. Nos fundos, a moradia da Alice.
  bar: {
    ...PLANTA_MISTO_BASE,
    paredePorComodo: { salao: 'bar' },
    pisos: { salao: 'terracota' },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'guarda_roupa', tx: 4, ty: 6 },
        { movel: 'quadro_folha', tx: 6, ty: 3 },
        { movel: 'planta_quarto', tx: 7, ty: 6 },
      ],
      sala: [
        { movel: 'sofa_creme', tx: 1, ty: 12 },
        { movel: 'mesa_centro_madeira', tx: 4, ty: 12 },
        { movel: 'estante_livros_v2', tx: 7, ty: 12 },
        { movel: 'tapete_creme', tx: 1, ty: 12 },
        { movel: 'relogio_v2', tx: 1, ty: 10 },
      ],
    },
    mobiliaFolha: {
      salao: [
        // fundo: estante de garrafas, engradado e barril
        { peca: [0, 0], tx: 12, ty: 4 },
        { peca: [4, 2], tx: 10, ty: 4 },
        { peca: [4, 0], tx: 17, ty: 4 },
        // balcao de frente pra porta, com as banquetas do lado do salao
        { peca: [1, 0], tx: 12, ty: 7 },
        { peca: [3, 1], tx: 12, ty: 9 },
        { peca: [3, 2], tx: 14, ty: 9 },
        { peca: [4, 1], tx: 17, ty: 6 },
        // salao: mesa redonda, mesa de toalha, banco e tapete
        { peca: [2, 0], tx: 16, ty: 9 },
        { peca: [2, 1], tx: 11, ty: 12 },
        { peca: [3, 0], tx: 16, ty: 11 },
        { peca: [5, 2], tx: 12, ty: 11, chao: true, colide: false },
        // letreiro de chope e lampiao na parede, mais o cavalete perto da porta
        { peca: [5, 1], tx: 15, ty: 1, colide: false },
        { peca: [4, 3], tx: 11, ty: 1, colide: false },
        { peca: [5, 0], tx: 17, ty: 12, colide: false },
      ],
    },
  },

  // Farmacia: balcao de atendimento virado pra porta, vitrine refrigerada e
  // armario de medicamento ao fundo, bancada de manipulacao com cadeira no
  // canto. Nos fundos, a moradia do Wendel — mesma planta da Alice, outras pecas.
  farmacia: {
    ...PLANTA_MISTO_BASE,
    paredePorComodo: { salao: 'farmacia' },
    pisos: { salao: 'marmore' },
    mobilia: {
      quarto: [
        { movel: 'criado_mudo', tx: 3, ty: 3 },
        { movel: 'comoda_quarto', tx: 4, ty: 6 },
        { movel: 'quadro_paisagem', tx: 6, ty: 3 },
        { movel: 'cesto_roupa', tx: 7, ty: 6 },
      ],
      sala: [
        { movel: 'sofa_cinza', tx: 1, ty: 12 },
        { movel: 'mesa_centro_escura', tx: 4, ty: 12 },
        { movel: 'estante_livros_v2', tx: 7, ty: 12 },
        { movel: 'tapete_rosa', tx: 1, ty: 12 },
        { movel: 'relogio_parede', tx: 1, ty: 10 },
      ],
    },
    mobiliaFolha: {
      salao: [
        // fundo: vitrine refrigerada, armario de medicamento e estante de frascos
        { peca: [2, 2], tx: 10, ty: 4 },
        { peca: [0, 1], tx: 13, ty: 4 },
        { peca: [2, 3], tx: 16, ty: 4 },
        // balcao de atendimento de frente pra porta
        { peca: [1, 1], tx: 11, ty: 7 },
        { peca: [2, 4], tx: 16, ty: 7 },
        // bancada de manipulacao com cadeira, e o engradado de reposicao
        { peca: [4, 4], tx: 11, ty: 11 },
        { peca: [4, 5], tx: 13, ty: 12 },
        { peca: [5, 3], tx: 16, ty: 11 },
        { peca: [6, 0], tx: 14, ty: 10, chao: true, colide: false },
        // letreiro de cruz, lampiao e vaso na parede
        { peca: [5, 5], tx: 15, ty: 1, colide: false },
        { peca: [5, 6], tx: 11, ty: 1, colide: false },
        { peca: [5, 4], tx: 18, ty: 9, colide: false },
      ],
    },
  },
};

/**
 * Conferencia dos mistos. E a mesma de qualquer planta multi-comodo, mais o que
 * so o misto precisa provar:
 *
 * - o jogador alcanca o posto de TRABALHO, o fundo do salao e o lado publico da
 *   porta somente-NPC — o comercio continua inteiro pra ele;
 * - o jogador NAO alcanca nenhum tile da moradia (quarto, corredor e sala estao
 *   marcados `privado`, e `conferirPlanta` proibe o flood-fill dele em todos);
 * - o NPC alcanca os DOIS postos e o lado privado da porta, o que so e possivel
 *   atravessando ela.
 */
function conferirMistos() {
  const linhas = [];
  for (const nome of Object.keys(PLANTAS_MISTO)) {
    const r = conferirPlanta(nome, {
      exigirLivres: [
        [MISTO_POSTOS.trabalho.x, MISTO_POSTOS.trabalho.y, 'o posto de trabalho do dono'],
        [MISTO_ALVO_TRABALHO.x, MISTO_ALVO_TRABALHO.y, 'o fundo do salao'],
        [MISTO_LADOS_DA_PORTA.publico.x, MISTO_LADOS_DA_PORTA.publico.y, 'o lado publico da porta'],
        [
          MISTO_LADOS_DA_PORTA.privado.x,
          MISTO_LADOS_DA_PORTA.privado.y,
          'o lado privado da porta',
          'npc',
        ],
        [MISTO_POSTOS.moradia.x, MISTO_POSTOS.moradia.y, 'o posto de moradia do dono', 'npc'],
        [MISTO_POSTOS.trabalho.x, MISTO_POSTOS.trabalho.y, 'o posto de trabalho do dono', 'npc'],
      ],
    });
    const doSalao = r.p.mobiliaFolha.salao.length;
    linhas.push(
      `  ${nome}: ${r.pecas.length} moveis (${r.pecas.length - doSalao} na moradia, ` +
        `${doSalao} no salao | ${r.solidos} solidos, ${r.decorativos} decorativos) | ` +
        `jogador alcanca ${r.alcancaveis} tiles, NPC alcanca ${r.alcancaveisNpc} de ${r.livres}`,
    );
  }
  const { largura: W, altura: H } = PLANTA_MISTO_BASE;
  console.log(`interiores mistos (${W}x${H}, moradia 1..8 + salao 10..18):\n${linhas.join('\n')}`);
  console.log(
    `  porta somente-NPC em ${PLANTA_MISTO_BASE.portasNpc[0]} | postos do dono: ` +
      `trabalho (${MISTO_POSTOS.trabalho.x},${MISTO_POSTOS.trabalho.y}) e ` +
      `moradia (${MISTO_POSTOS.moradia.x},${MISTO_POSTOS.moradia.y})`,
  );
}

/**
 * Onde o jogador cai ao entrar num predio: um tile acima da porta de saida do
 * interior. Cada interior tem tamanho proprio, entao a posicao sai da geometria
 * dele — e a mesma conta que `spawnTile` em src/game/mapas.ts declara.
 */
function entradaDoInterior(chave) {
  const p = PLANTAS_CASA[chave] ?? PLANTAS_MISTO[chave] ?? PLANTAS_PROPRIAS[chave];
  if (p) return { x: p.porta, y: p.altura - 2 };
  const salao = SALOES().find((s) => s.nome === chave);
  if (salao) {
    return { x: Math.floor(salao.tamanho.largura / 2), y: salao.tamanho.altura - 2 };
  }
  throw new Error(`"${chave}" nao tem planta nem salao — nao da pra saber a entrada`);
}

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
    // via PODE encostar na borda: a avenida horizontal termina na zona de
    // transicao pro Mapa 2. O que nao pode e sair do mapa.
    if (faixa.x < 0 || faixa.y < 0 || faixa.x + faixa.w > W || faixa.y + faixa.h > H) {
      throw new Error(`"${v.nome}" sai do mapa (${W}x${H})`);
    }
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
  for (const c of construidasDe('farm')) {
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
    // `interior` deixou de ser obrigatorio: um lote pode ter predio FECHADO
    // (casa_1 desativada). O que continua obrigatorio e a frente da porta ser
    // andavel — e nela que fica o objeto de exame.
    if (!c.interior && !c.fechada) {
      throw new Error(`"${c.nome}" nao tem interior nem esta marcado como fechada`);
    }
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
  for (const exigida of ['mercado', 'academia', 'parque', 'bar', 'farmacia']) {
    if (!ZONAS.some((z) => z.nome === exigida)) throw new Error(`falta a zona "${exigida}"`);
  }

  // todo lote tem de declarar um `uso` conhecido, e todo lote misto tem de ter
  // interior proprio (e onde ficam a cama do dono e a area de trabalho)
  const USOS = new Set(['moradia', 'comercio', 'misto', 'praca', 'vago']);
  for (const z of ZONAS) {
    if (!USOS.has(z.uso)) throw new Error(`o lote "${z.nome}" tem uso invalido: "${z.uso}"`);
    if (z.uso !== 'misto') continue;
    if (!CONSTRUCOES[z.nome]?.misto) {
      throw new Error(`o lote misto "${z.nome}" nao esta marcado como misto em CONSTRUCOES`);
    }
    if (!PLANTAS_MISTO[z.nome]) {
      throw new Error(`o lote misto "${z.nome}" nao tem planta em PLANTAS_MISTO`);
    }
  }
  // e o contrario: construcao marcada misto sem lote misto
  for (const [nome, c] of Object.entries(CONSTRUCOES)) {
    if (c.misto && zona(nome).uso !== 'misto') {
      throw new Error(`"${nome}" e misto em CONSTRUCOES mas o lote nao declara uso "misto"`);
    }
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


// ------------------------------------------- sanidade: mapas externos novos --
/**
 * Conferencia dos mapas externos 2 e 3, feita SOBRE O TILEMAP JA GERADO.
 *
 * A da fazenda (`conferirFazenda`) roda antes da geracao, em cima das tabelas.
 * Aqui e o contrario, e de proposito: os mapas novos tem rio, muro, ponte e
 * cerca desenhados direto na camada `objetos`, e nenhuma tabela sabe o efeito
 * combinado deles. Conferir o resultado e o unico jeito de provar que a ponte
 * atravessa, que o condominio tem entrada e que nenhum lote ficou ilhado.
 *
 * O que cobra:
 *  - lote dentro do mapa, sem sobrepor outro lote nem cair em cima de via;
 *  - construcao dentro do proprio lote, com a frente da porta livre;
 *  - flood-fill a partir da zona de transicao de entrada alcanca TODO lote,
 *    TODA frente de porta, TODA outra zona de transicao e o outro lado do rio;
 *  - o par de cada borda existe e o ponto de chegada cai dentro dele.
 */
function gidBloqueia(gid) {
  const t = TILES[(gid & 0x1fffffff) - 1];
  return Boolean(t?.colide);
}

function conferirExterno(chave, vias, gerado, alvosExtras = []) {
  const m = MUNDO[chave];
  const W = m.largura;
  const H = m.altura;

  // --- geometria: lote nao invade lote nem via ---
  const faixa = faixaDeVias(W, H, vias);
  const ocupado = new Map();
  for (const z of m.zonas) {
    if (z.x < 1 || z.y < 1 || z.x + z.w > W - 1 || z.y + z.h > H - 1) {
      throw new Error(`${chave}: lote "${z.nome}" sai do mapa (${W}x${H})`);
    }
    for (let y = z.y; y < z.y + z.h; y++) {
      for (let x = z.x; x < z.x + z.w; x++) {
        if (faixa.get(x, y)) {
          throw new Error(`${chave}: lote "${z.nome}" fica em cima de via em ${x},${y}`);
        }
        const antes = ocupado.get(`${x},${y}`);
        if (antes) throw new Error(`${chave}: "${z.nome}" invade "${antes}" em ${x},${y}`);
        ocupado.set(`${x},${y}`, z.nome);
      }
    }
  }

  for (const c of construidasDe(chave)) {
    const lote = zona(c.nome);
    const dentro =
      c.x >= lote.x && c.y >= lote.y && c.x + c.w <= lote.x + lote.w && c.y + c.h <= lote.y + lote.h;
    if (!dentro) throw new Error(`${chave}: a construcao de "${c.nome}" nao cabe no lote`);
    if (c.frente.y > lote.y + lote.h - 1) {
      throw new Error(`${chave}: "${c.nome}" nao deixou quintal na frente da porta`);
    }
  }

  // --- travessabilidade, sobre o tilemap gerado ---
  const objetos = gerado.mapa.layers.find((l) => l.name === 'objetos').data;
  const livre = (x, y) =>
    x >= 0 && y >= 0 && x < W && y < H && !gidBloqueia(objetos[y * W + x] ?? 0);

  const entrada = bordasDoMapa(chave)[0];
  if (!entrada) throw new Error(`${chave}: nenhuma zona de transicao declarada`);
  const inicio = [entrada.x + Math.floor(entrada.w / 2), entrada.y + Math.floor(entrada.h / 2)];
  if (!livre(...inicio)) throw new Error(`${chave}: a borda "${entrada.nome}" nasce bloqueada`);

  const vistos = new Set([inicio.join(',')]);
  const fila = [inicio];
  for (let i = 0; i < fila.length; i++) {
    const [x, y] = fila[i];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = `${nx},${ny}`;
      if (livre(nx, ny) && !vistos.has(k)) {
        vistos.add(k);
        fila.push([nx, ny]);
      }
    }
  }

  const alcanca = (x, y) => vistos.has(`${x},${y}`);
  for (const z of m.zonas) {
    let ok = false;
    for (let y = z.y; y < z.y + z.h && !ok; y++) {
      for (let x = z.x; x < z.x + z.w; x++) ok ||= alcanca(x, y);
    }
    if (!ok) throw new Error(`${chave}: o lote "${z.nome}" nao esta alcancavel`);
  }
  for (const c of construidasDe(chave)) {
    if (!alcanca(c.frente.x, c.frente.y)) {
      throw new Error(`${chave}: a frente da porta de "${c.nome}" nao esta alcancavel`);
    }
  }
  for (const b of bordasDoMapa(chave)) {
    const alvo = [b.x + Math.floor(b.w / 2), b.y + Math.floor(b.h / 2)];
    if (!alcanca(...alvo)) {
      throw new Error(`${chave}: a zona de transicao "${b.nome}" nao esta alcancavel`);
    }
  }
  for (const [x, y, rotulo] of alvosExtras) {
    if (!alcanca(x, y)) throw new Error(`${chave}: ${rotulo} (${x},${y}) nao esta alcancavel`);
  }

  return { alcancaveis: vistos.size, lotes: m.zonas.length };
}

/** Todo par de borda tem de existir dos dois lados e chegar dentro do irmao. */
function conferirBordas() {
  for (const b of BORDAS) {
    const alvo = MUNDO[b.destino];
    if (!alvo) throw new Error(`borda "${b.nome}" aponta pro mapa inexistente "${b.destino}"`);
    const volta = BORDAS.find((o) => o.mapa === b.destino && o.destino === b.mapa);
    if (!volta) throw new Error(`borda "${b.nome}" nao tem par de volta em "${b.destino}"`);
    const dentro =
      b.destinoTx >= 0 && b.destinoTy >= 0 && b.destinoTx < alvo.largura && b.destinoTy < alvo.altura;
    if (!dentro) throw new Error(`borda "${b.nome}" chega fora do mapa "${b.destino}"`);
    // chegar EM CIMA da borda de volta faria o jogador quicar entre os dois
    // mapas sem conseguir sair; o ponto de chegada tem de ficar ao lado dela
    const emCima =
      b.destinoTx >= volta.x &&
      b.destinoTx < volta.x + volta.w &&
      b.destinoTy >= volta.y &&
      b.destinoTy < volta.y + volta.h;
    if (emCima) {
      throw new Error(
        `borda "${b.nome}" larga o jogador dentro de "${volta.nome}" — ele voltaria na hora`,
      );
    }
  }
}

/** Nome de lote e chave global: dois mapas nao podem repetir um. */
function conferirNomesDeLote() {
  const vistos = new Map();
  for (const [mapa, m] of Object.entries(MUNDO)) {
    for (const z of m.zonas) {
      const antes = vistos.get(z.nome);
      if (antes) throw new Error(`o lote "${z.nome}" existe em "${antes}" e em "${mapa}"`);
      vistos.set(z.nome, mapa);
    }
  }
}

console.log('gerando assets...');
conferirNomesDeLote();
conferirBordas();
conferirFazenda();
conferirPlantasDeCasa();
conferirSaloes();
conferirMistos();
conferirPlantasProprias();
const ts = gerarTileset();
const molduras = {
  arvores: gerarAtlas('arvores', (c, r) => `arvore_${r}_${c}`),
  flores_v1: gerarAtlas('flores_v1', (c, r) => `flor_${r}_${c}`),
  flores_v2: gerarAtlas('flores_v2', (c, r) => `flor_${r}_${c}`),
  pedras: gerarAtlasPedras(),
  construcoes: gerarConstrucoes(),
  // uma folha por entrada de FOLHAS_DE_MOVEL — a mesma lista que a BootScene
  // carrega, pra nao existir atlas gerado que ninguem le nem frame apontando
  // pra atlas que nao foi carregado
  ...Object.fromEntries(FOLHAS_DE_MOVEL.map((f) => [`moveis_${f}`, gerarAtlasMoveis(f)])),
};
const catalogoMobilia = gerarCatalogoMobilia();
const fazenda = gerarFazenda(ts);
escrever(join(ASSETS, 'tilemaps', 'farm.json'), JSON.stringify(fazenda.mapa, null, 1));
const bairro = gerarBairro(ts);
// o outro lado do rio so e alcancavel pela ponte: e o alvo extra que prova isso
const rBairro = conferirExterno('bairro', VIAS_BAIRRO, bairro, [
  [66, 104, 'a margem sul do rio (so a ponte leva la)'],
  [CONDOMINIO.x + 4, CONDOMINIO.y + 4, 'o miolo do condominio fechado'],
  [QUADRA_BAIRRO.x + 2, QUADRA_BAIRRO.y + 2, 'o piso da quadra'],
]);
escrever(join(ASSETS, 'tilemaps', 'bairro.json'), JSON.stringify(bairro.mapa, null, 1));
const rural = gerarRural(ts);
const rRural = conferirExterno('rural', VIAS_RURAL, rural, [
  [PEDREIRA_RURAL.x + 4, PEDREIRA_RURAL.y + 4, 'o cascalho da pedreira'],
  [PLANTIOS_RURAL[0].x + 2, PLANTIOS_RURAL[0].y + 2, 'a plantacao da fazenda_1'],
  [RESERVA_MAPA_4.x + 3, RURAL.altura - 3, 'o corredor reservado pro Mapa 4'],
]);
escrever(join(ASSETS, 'tilemaps', 'rural.json'), JSON.stringify(rural.mapa, null, 1));
console.log(
  `mapas externos: bairro ${BAIRRO.largura}x${BAIRRO.altura} ` +
    `(${rBairro.lotes} lotes, ${rBairro.alcancaveis} tiles alcancaveis) | ` +
    `rural ${RURAL.largura}x${RURAL.altura} ` +
    `(${rRural.lotes} lotes, ${rRural.alcancaveis} tiles alcancaveis)`,
);
let moveisDeCasa = 0;
for (const c of CONSTRUIDAS) {
  if (c.comercio || !c.interior) continue; // comercio, misto e fechados ficam de fora
  const interior = gerarInteriorPlanta(c.nome, ts);
  moveisDeCasa += interior.moveis;
  escrever(
    join(ASSETS, 'tilemaps', `${c.interior}.json`),
    JSON.stringify(interior.mapa, null, 1),
  );
}
// interiores PROPRIOS desta leva: casa+oficina do protagonista, escola e
// biblioteca. Todos multi-comodo, todos no Mapa 2.
let moveisProprios = 0;
for (const nome of Object.keys(PLANTAS_PROPRIAS)) {
  const interior = gerarInteriorPlanta(nome, ts);
  moveisProprios += interior.moveis;
  escrever(join(ASSETS, 'tilemaps', `${nome}.json`), JSON.stringify(interior.mapa, null, 1));
}
for (const salao of SALOES()) {
  const interior = gerarInteriorComercio(salao, ts);
  escrever(join(ASSETS, 'tilemaps', `${salao.nome}.json`), JSON.stringify(interior.mapa, null, 1));
}
// mistos: um unico interior por lote, com a moradia atras da porta somente-NPC
let moveisMistos = 0;
for (const nome of Object.keys(PLANTAS_MISTO)) {
  const interior = gerarInteriorPlanta(nome, ts);
  moveisMistos += interior.moveis;
  escrever(join(ASSETS, 'tilemaps', `${nome}.json`), JSON.stringify(interior.mapa, null, 1));
}
console.log(
  `pronto. tileset ${TILES.length} tiles de ${T}px | ` +
    `fazenda ${FAZENDA.largura}x${FAZENDA.altura} (${FAZENDA.largura * T}x${FAZENDA.altura * T} px) | ` +
    `${fazenda.contagem.arvores} arvores, ${fazenda.contagem.pedras} pedras, ` +
    `${fazenda.contagem.flores} flores | ` +
    `moveis: ${moveisDeCasa} nas casas, ${moveisMistos} nos mistos, ` +
    `${moveisProprios} nos proprios | ` +
    `catalogo de mobilia: ${Object.keys(catalogoMobilia).length} pecas | ` +
    `atlas: ${Object.entries(molduras).map(([k, v]) => `${k}=${Object.keys(v).length}`).join(' ')}`,
);

// Monta o atlas de ICONE DE ITEM a partir das duas folhas de arte de item.
// Rode com: npm run gerar-itens
//
// E um gerador a parte do `gerar-assets.mjs` de proposito: aquele cuida do
// mundo (tileset, tilemaps, mobilia) e roda inteiro a cada mudanca de mapa;
// este so olha `Itens_do_mercado_v1.png` e `itens_Eletronicos.png` e escreve um
// unico par de arquivos (`itens.png` + `itens.atlas.json`). Os dois compartilham
// os helpers de imagem (`imagem.mjs`) e o encoder de PNG (`png.mjs`).
//
// O QUE sai do atlas nao se decide aqui: e o `CATALOGO_ITENS` de
// src/game/itens.ts, o mesmo que o jogo carrega. Peca que nao esta no catalogo
// nao vira frame, e item do catalogo que aponta pra peca inexistente derruba a
// geracao.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './png.mjs';
import { agruparEmLinhas, blobs, lerPng, reduzirPara } from './imagem.mjs';
import { CATALOGO_ITENS } from '../src/game/itens.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(RAIZ, 'public', 'assets', 'sprites');

/**
 * As duas folhas, com o que cada uma precisa pra ser segmentada.
 *
 * - `areaMinima` — abaixo disso e sujeira de compressao, nao peca.
 * - `tolerancia` — quanto dois blobs podem diferir de centro vertical e ainda
 *   contarem como da mesma linha (ver `agruparEmLinhas`).
 * - `linhas`     — quantas linhas a arte TEM. Se a folha for reexportada com
 *   outro layout, a contagem muda e o gerador para aqui, em vez de renumerar as
 *   pecas em silencio e trocar o icone de metade do catalogo.
 * - `fundo`      — cor chapada do fundo, quando a folha nao veio com alfa.
 * - `descartarTarja` — a folha de eletronico e um CARTAZ: tem tarja de titulo de
 *   secao ("AUDIO E SOM"), que o detector enxerga como peca. As tarjas sao as
 *   unicas formas largas e baixas da folha, entao caem por geometria.
 */
const FOLHAS_DE_ITEM = {
  mercado: {
    arquivo: 'Itens_do_mercado_v1.png',
    areaMinima: 400,
    tolerancia: 50,
    linhas: 8,
  },
  eletronicos: {
    arquivo: 'itens_Eletronicos.png',
    areaMinima: 700,
    tolerancia: 40,
    linhas: 10,
    // exportada sobre cinza-chumbo opaco em vez de transparente
    fundo: { cor: [26, 30, 35], tolerancia: 16 },
    descartarTarja: true,
  },
  /**
   * A folha de sobrevivencia e eletronica da represa: 180 pecas em 10 linhas.
   *
   * Ela PARECE ter fundo (um degrade colorido por tras das pecas), e nao tem: o
   * degrade esta todo em alfa 1, que fica abaixo do limiar de 16 do detector.
   * Nao precisa de `removerFundoDeCor` — a primeira tentativa passou por lá e o
   * resultado foi apagar a lateral escura de metade das pecas.
   *
   * Das 180, o catalogo usa 18 (8 de utilidade e remedio, 10 de icone de
   * salvado). O resto fica sem uso de proposito: peca de arte nao vira item so
   * porque existe.
   */
  represa: {
    arquivo: 'itens_represa_v2.png',
    areaMinima: 400,
    tolerancia: 50,
    linhas: 10,
  },
};

/** Altura maxima de uma tarja de titulo, em px, e o quanto ela e mais larga que alta. */
const TARJA = { alturaMaxima: 34, proporcaoMinima: 3.2 };

/**
 * Apaga um fundo CHAPADO de cor qualquer, deixando a folha com alfa como as
 * demais. `removerFundo` do `imagem.mjs` resolve o caso do fundo preto quase
 * puro; esta folha veio sobre cinza-chumbo, entao a comparacao e por distancia
 * de cor em vez de "escuro o bastante".
 *
 * Como la, a varredura sai das BORDAS e so anda por vizinho parecido: o cinza
 * que esta cercado por arte (a lateral de um notebook preto, por exemplo) nunca
 * e alcancado e continua fazendo parte da peca.
 */
function removerFundoDeCor(img, [r, g, b], tolerancia) {
  const { w, h, px } = img;
  const parecido = (i) =>
    Math.abs(px[i * 4] - r) <= tolerancia &&
    Math.abs(px[i * 4 + 1] - g) <= tolerancia &&
    Math.abs(px[i * 4 + 2] - b) <= tolerancia;

  const fundo = new Uint8Array(w * h);
  const pilha = [];
  const empilhar = (x, y) => {
    const i = y * w + x;
    if (fundo[i] || !parecido(i)) return;
    fundo[i] = 1;
    pilha.push(i);
  };
  for (let x = 0; x < w; x++) {
    empilhar(x, 0);
    empilhar(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    empilhar(0, y);
    empilhar(w - 1, y);
  }
  while (pilha.length) {
    const i = pilha.pop();
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) empilhar(x - 1, y);
    if (x < w - 1) empilhar(x + 1, y);
    if (y > 0) empilhar(x, y - 1);
    if (y < h - 1) empilhar(x, y + 1);
  }

  const saida = new Uint8Array(px);
  for (let i = 0; i < fundo.length; i++) if (fundo[i]) saida[i * 4 + 3] = 0;
  return { w, h, px: saida };
}

const ehTarja = (b) => b.h <= TARJA.alturaMaxima && b.w / b.h >= TARJA.proporcaoMinima;

function carregarFolha(chave) {
  const def = FOLHAS_DE_ITEM[chave];
  const cru = lerPng(join(SPRITES, def.arquivo));
  const img = def.fundo ? removerFundoDeCor(cru, def.fundo.cor, def.fundo.tolerancia) : cru;

  let achados = blobs(img, def.areaMinima, 16, true);
  const tarjas = def.descartarTarja ? achados.filter(ehTarja) : [];
  if (def.descartarTarja) achados = achados.filter((b) => !ehTarja(b));

  const linhas = agruparEmLinhas(achados, def.tolerancia);
  if (linhas.length !== def.linhas) {
    throw new Error(
      `${def.arquivo}: esperava ${def.linhas} linhas de item, achei ${linhas.length}` +
        ` — a arte mudou de layout?`,
    );
  }
  return { ...def, chave, img, linhas, tarjas: tarjas.length };
}

const folhas = Object.fromEntries(
  Object.keys(FOLHAS_DE_ITEM).map((k) => [k, carregarFolha(k)]),
);

/** A peca de uma folha pelo par [linha, indice]; erra alto se nao existir. */
function peca(chave, [linha, indice]) {
  const f = folhas[chave];
  if (!f) throw new Error(`folha de item "${chave}" nao existe`);
  const b = f.linhas[linha]?.[indice];
  if (!b) {
    const tem = f.linhas[linha]?.length ?? 0;
    throw new Error(
      `${f.arquivo}: nao existe peca [${linha},${indice}]` +
        ` (a linha ${linha} tem ${tem} peca(s))`,
    );
  }
  return b;
}

// ------------------------------------------------------------ empacotamento --
/**
 * Reempacota as pecas do catalogo numa folha propria, cada uma na sua celula e
 * levando SO os proprios pixels.
 *
 * E o mesmo motivo do empacotamento da mobilia: o frame do atlas e um retangulo
 * e a arte nao. Duas pecas vizinhas na folha original tem caixas que se
 * sobrepoem de verdade (a bandeja de morango encosta no tomate), entao recortar
 * na posicao original poria lasca da vizinha dentro do icone. Aqui as duas
 * folhas ainda entram na MESMA saida, o que so e possivel copiando pixel a
 * pixel.
 *
 * O empacotamento e por prateleira, ordenado da peca mais alta pra mais baixa —
 * assim as prateleiras ficam justas e a folha sai bem menor que as duas de
 * origem somadas.
 */
const FOLGA = 2; // px entre celulas, pra escala nao puxar do vizinho
const LARGURA_MAXIMA = 2048; // teto confortavel de textura

/**
 * Lado maximo que uma peca leva pra folha, em px, por categoria de item.
 *
 * A arte de origem vai de 40 a 200 px de lado, e a tela nunca pede tudo isso: o
 * jogo roda em 480x270 logicos com `Scale.FIT`, entao icone desenhado a N px
 * amostra N px de textura, e ponto. Pixel acima disso e download que ninguem ve.
 *
 * O teto nao e um so porque as telas grandes filtram por CATEGORIA — e filtram
 * no codigo, com o filtro escrito e comentado, nao por acaso:
 *
 * - `eletronico` — a DevStore (`categoria === 'eletronico'`, devstore.ts) mostra
 *   o produto aberto num quadro de 88, com o icone a **72**. 96 da um terco de
 *   folga;
 * - `normal` — o jogo da memoria (`categoria === 'normal'`, jogos/memoria.ts)
 *   tira o lado da carta da area da janela: com a janela ocupando a tela
 *   inteira, o pior caso e `min((480-24)/4, (270-26-16)/3) - 14`, ou **62**. 64
 *   cobre o pior caso;
 * - o resto (`utilidade`, `remedio`, `sucata`) so aparece no inventario (**16**,
 *   que e `INV.slot - 6`), na linha da loja (**17**) e no chao (**14**). 32 e o
 *   dobro do maior.
 *
 * Categoria nova sem teto aqui PARA a geracao de proposito: o padrao errado
 * seria cair no menor e entregar icone borrado numa tela que ninguem conferiu.
 *
 * O jogo nao tem numero pra acertar junto com estes: toda chamada passa por
 * `ajustarIcone`, que tira a escala de `frame.width`. E quem garante que o teto
 * nao ficou baixo demais e a suite de navegador, que mede icone desenhado contra
 * frame de origem e cobra que nenhum seja AMPLIADO.
 *
 * A qualidade sobe, nao cai: `reduzirPara` reamostra com filtro de caixa
 * ponderado por alfa, enquanto quem estava reduzindo 200 pra 72 era o canvas com
 * `pixelArt: true`, isto e, vizinho mais proximo jogando fora pixel por
 * arredondamento.
 */
const LADO_MAXIMO = {
  eletronico: 96,
  normal: 64,
  utilidade: 32,
  remedio: 32,
  sucata: 32,
  material: 32,
};

/** O teto da categoria do item, ou um erro alto se a categoria for nova. */
function tetoDe(item) {
  const teto = LADO_MAXIMO[item.categoria];
  if (!teto) {
    throw new Error(
      `item "${item.id}": categoria "${item.categoria}" nao tem teto de lado em LADO_MAXIMO.` +
        ` Veja em que telas um item dessa categoria aparece e escreva o teto la.`,
    );
  }
  return teto;
}

/** A peca recortada pros PROPRIOS pixels, sobre fundo transparente. */
function recortar(chaveDaFolha, b) {
  const origem = folhas[chaveDaFolha].img;
  if (!b.pixels) throw new Error(`peca [${b.x},${b.y}] veio sem lista de pixels`);
  const im = new Img(b.w, b.h);
  for (const i of b.pixels) {
    const px = i % origem.w;
    const py = (i - px) / origem.w;
    const o = i * 4;
    im.set(px - b.x, py - b.y, [
      origem.px[o],
      origem.px[o + 1],
      origem.px[o + 2],
      origem.px[o + 3],
    ]);
  }
  return im;
}

/**
 * A celula final de um item: recortada e, se passar de `LADO_MAXIMO`, reduzida
 * mantendo a proporcao.
 *
 * O recorte vem ANTES da reducao de proposito. Duas pecas vizinhas na folha de
 * origem tem caixas que se sobrepoem de verdade (a bandeja de morango encosta
 * no tomate), entao reduzir direto da folha puxaria lasca da vizinha pra dentro
 * da media de cada pixel do icone.
 */
function celula(item) {
  const b = peca(item.folha, item.peca);
  const inteira = recortar(item.folha, b);
  const teto = tetoDe(item);
  const maior = Math.max(inteira.w, inteira.h);
  if (maior <= teto) return inteira;

  const escala = teto / maior;
  const w = Math.max(1, Math.round(inteira.w * escala));
  const h = Math.max(1, Math.round(inteira.h * escala));
  const cores = reduzirPara(inteira, { x: 0, y: 0, w: inteira.w, h: inteira.h }, w, h);
  const menor = new Img(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) menor.set(i, j, cores[j * w + i]);
  return menor;
}

function empacotar(itens) {
  const celulas = itens
    .map((item) => ({ item, img: celula(item) }))
    .sort((a, b) => b.img.h - a.img.h || b.img.w - a.img.w);

  let x = FOLGA;
  let y = FOLGA;
  let alturaPrateleira = 0;
  let largura = 0;
  for (const c of celulas) {
    if (x + c.img.w + FOLGA > LARGURA_MAXIMA) {
      x = FOLGA;
      y += alturaPrateleira + FOLGA;
      alturaPrateleira = 0;
    }
    c.x = x;
    c.y = y;
    x += c.img.w + FOLGA;
    alturaPrateleira = Math.max(alturaPrateleira, c.img.h);
    largura = Math.max(largura, x);
  }
  const altura = y + alturaPrateleira + FOLGA;

  const im = new Img(largura, altura);
  for (const c of celulas) {
    for (let j = 0; j < c.img.h; j++) {
      for (let i = 0; i < c.img.w; i++) {
        const o = (j * c.img.w + i) * 4;
        im.set(c.x + i, c.y + j, [
          c.img.px[o],
          c.img.px[o + 1],
          c.img.px[o + 2],
          c.img.px[o + 3],
        ]);
      }
    }
  }
  return { im, celulas };
}

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  console.log('  ->', caminho.replace(RAIZ, '.'));
}

// ------------------------------------------------------------------ saida --
const ITENS_COM_ARTE = CATALOGO_ITENS.filter((item) => item.folha && item.peca && item.frame);
const { im, celulas } = empacotar(ITENS_COM_ARTE);

const frames = {};
for (const c of celulas) {
  frames[c.item.frame] = {
    frame: { x: c.x, y: c.y, w: c.img.w, h: c.img.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: c.img.w, h: c.img.h },
    sourceSize: { w: c.img.w, h: c.img.h },
  };
}

escrever(join(SPRITES, 'itens.png'), im.png());
escrever(
  join(SPRITES, 'itens.atlas.json'),
  JSON.stringify(
    {
      frames,
      meta: {
        app: 'gerar-itens.mjs',
        image: 'itens.png',
        format: 'RGBA8888',
        size: { w: im.w, h: im.h },
        scale: '1',
      },
    },
    null,
    1,
  ),
);

// --------------------------------------------------------------- resumo --
const porCategoria = (cat) => CATALOGO_ITENS.filter((i) => i.categoria === cat);
const faixa = (cat) => {
  const precos = porCategoria(cat).map((i) => i.preco);
  const brl = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;
  return `${brl(Math.min(...precos))} a ${brl(Math.max(...precos))}`;
};

for (const f of Object.values(folhas)) {
  const total = f.linhas.reduce((s, l) => s + l.length, 0);
  const usadas = CATALOGO_ITENS.filter((i) => i.folha === f.chave).length;
  console.log(
    `  ${f.arquivo}: ${total} peca(s) detectada(s) em ${f.linhas.length} linha(s)` +
      `${f.tarjas ? ` (+${f.tarjas} tarja(s) de secao descartada(s))` : ''}` +
      ` — ${usadas} no catalogo`,
  );
}
console.log(
  `pronto. ${ITENS_COM_ARTE.length} itens no atlas + ${CATALOGO_ITENS.length - ITENS_COM_ARTE.length} sem arte ` +
    `(${im.w}x${im.h} px) | ` +
    `normal: ${porCategoria('normal').length} de ${faixa('normal')} | ` +
    `eletronico: ${porCategoria('eletronico').length} de ${faixa('eletronico')}`,
);

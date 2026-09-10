// Monta o atlas `equipamento`: o que o jogador SEGURA, o que ele DISPARA e as
// lampadas da represa. Rode com: npm run gerar-equipamento
//
// E um gerador a parte de `gerar-itens.mjs` porque o produto e outro: la sao
// ICONES de inventario, recortados justos e desenhados a 24 px numa celula de
// UI; aqui sao SPRITES DE MUNDO, que precisam de um ponto de ancoragem (a presa
// da mao, o cano de onde o tiro sai, o bico da lampada) pra serem colados no
// lugar certo em cima de outro sprite. Um icone nao tem presa; um sprite de mao
// sem presa fica flutuando.
//
// A LISTA e a fonte: `PECAS` diz de que folha vem cada frame, que peca da folha
// e onde esta a presa dela. `src/game/equipar.ts` referencia os frames por
// nome, e `tools/verificar-equipamento.mjs` cobra que todo frame citado por um
// item exista aqui.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './png.mjs';
import { agruparEmLinhas, blobs, lerPng } from './imagem.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(RAIZ, 'public', 'assets', 'sprites');
const ARMAS = join(RAIZ, 'arte', 'Armas');
const ARTE = join(RAIZ, 'arte');

/**
 * As folhas de origem, com o que cada uma precisa pra ser segmentada.
 *
 * `linhas` e a contagem ESPERADA. Ela existe pelo mesmo motivo que em
 * `gerar-itens.mjs`: se a arte for reexportada com outro layout, o gerador para
 * aqui em vez de renumerar as pecas em silencio e trocar a pistola por uma
 * lanterna na mao do jogador.
 */
const FOLHAS = {
  pistola: { dir: ARMAS, arquivo: 'Pistola.png', areaMinima: 900, tolerancia: 60, linhas: 5 },
  itens: {
    dir: SPRITES,
    arquivo: 'itens_represa_v2.png',
    areaMinima: 400,
    tolerancia: 50,
    linhas: 10,
  },
  lampadas: { dir: ARTE, arquivo: 'Lampadas_v2.png', areaMinima: 700, tolerancia: 45, linhas: 7 },
};

/**
 * As pecas.
 *
 * `presa` e o ponto de ancoragem em FRACAO da caixa da peca, ou, quando o par
 * de frames precisa coincidir pixel a pixel, um par absoluto `presaPx` medido
 * do canto INFERIOR ESQUERDO (x pra direita, y pra cima).
 *
 * A pistola usa `presaPx` de proposito: `mao_pistola` e `mao_pistola_disparo`
 * sao a MESMA arma, e a segunda so e mais larga porque tem o fogo do cano
 * saindo pela direita. Ancorar por fracao faria a arma pular pra tras no
 * quadro do disparo — que e exatamente o quadro em que o jogador esta olhando.
 */
const PECAS = {
  mao_pistola: { folha: 'pistola', peca: [0, 1], presaPx: [47, 51], cano: [1, 0.42] },
  mao_pistola_disparo: { folha: 'pistola', peca: [2, 1], presaPx: [47, 51], cano: [1, 0.42] },
  projetil_pistola: { folha: 'pistola', peca: [4, 1], presa: [0.5, 0.5] },
  carregador_pistola: { folha: 'pistola', peca: [4, 0], presa: [0.5, 0.9] },

  // ferramenta: a chave inglesa da arte de itens, em pe, presa na base do cabo
  mao_chave_inglesa: { folha: 'itens', peca: [9, 14], presa: [0.5, 0.92] },
  // lanterna: deitada, apontando pra direita; a presa e o corpo, nao o facho
  mao_lanterna: { folha: 'itens', peca: [1, 7], presa: [0.22, 0.55], cano: [1, 0.5] },

  // ------------------------------------------------------- lampadas da usina --
  // SO O ESTADO ACESO entra no atlas. O apagado sai em jogo, tingindo o mesmo
  // frame de cinza-chumbo (ver `TINTA_APAGADA` em src/game/luzes.ts).
  //
  // A folha TEM lampadas apagadas, e a primeira versao disto usava pares dela.
  // Nao deu: os pares da arte nao sao a mesma luminaria em dois estados, sao
  // luminarias PARECIDAS — o par do bulbo de gaiola, por exemplo, nao existe, e
  // o vizinho apagado mais proximo e um domo de outro formato. Acender a luz
  // trocava a silhueta do objeto, o que le como se a luminaria tivesse sido
  // substituida. Tingir o mesmo frame garante silhueta identica em qualquer
  // luminaria nova, sem procurar par na folha.
  //
  // A presa e o ponto de FIXACAO (o teto), porque a lampada e desenhada
  // pendurada.
  lampada_pendente: { folha: 'lampadas', peca: [2, 0], presa: [0.5, 0.04] },
  lampada_gaiola: { folha: 'lampadas', peca: [2, 8], presa: [0.5, 0.04] },
  lampada_tubular: { folha: 'lampadas', peca: [5, 0], presa: [0.5, 0.15] },
  lampada_teto: { folha: 'lampadas', peca: [0, 2], presa: [0.5, 0.12] },
};

function carregar(chave) {
  const def = FOLHAS[chave];
  const img = lerPng(join(def.dir, def.arquivo));
  const achados = blobs(img, def.areaMinima, 16, true);
  const linhas = agruparEmLinhas(achados, def.tolerancia);
  if (linhas.length !== def.linhas) {
    throw new Error(
      `${def.arquivo}: esperava ${def.linhas} linha(s) de peca, achei ${linhas.length}` +
        ` — a arte mudou de layout?`,
    );
  }
  return { ...def, chave, img, linhas };
}

const folhas = Object.fromEntries(Object.keys(FOLHAS).map((k) => [k, carregar(k)]));

function pecaDe(nome, def) {
  const f = folhas[def.folha];
  if (!f) throw new Error(`${nome}: folha "${def.folha}" nao existe`);
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
      origem.px[o],
      origem.px[o + 1],
      origem.px[o + 2],
      origem.px[o + 3],
    ]);
  }
}

// ------------------------------------------------------------------ saida --
const frames = {};
/** Presa e cano por frame, em FRACAO do frame — e o que o jogo consome. */
const ancoras = {};
for (const c of celulas) {
  frames[c.nome] = {
    frame: { x: c.x, y: c.y, w: c.b.w, h: c.b.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: c.b.w, h: c.b.h },
    sourceSize: { w: c.b.w, h: c.b.h },
  };
  const presa = c.def.presaPx
    ? [c.def.presaPx[0] / c.b.w, (c.b.h - c.def.presaPx[1]) / c.b.h]
    : c.def.presa;
  ancoras[c.nome] = {
    largura: c.b.w,
    altura: c.b.h,
    presa: { x: +presa[0].toFixed(4), y: +presa[1].toFixed(4) },
    ...(c.def.cano ? { cano: { x: c.def.cano[0], y: c.def.cano[1] } } : {}),
  };
}

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  console.log('  ->', caminho.replace(RAIZ, '.'));
}

escrever(join(SPRITES, 'equipamento.png'), im.png());
escrever(
  join(SPRITES, 'equipamento.atlas.json'),
  JSON.stringify(
    {
      frames,
      meta: {
        app: 'gerar-equipamento.mjs',
        image: 'equipamento.png',
        format: 'RGBA8888',
        size: { w: im.w, h: im.h },
        scale: '1',
      },
    },
    null,
    1,
  ),
);
escrever(join(SPRITES, 'equipamento.ancoras.json'), JSON.stringify(ancoras, null, 1));

console.log(
  `pronto. ${celulas.length} frame(s) de equipamento (${im.w}x${im.h} px) de ` +
    `${Object.keys(folhas).length} folha(s)`,
);

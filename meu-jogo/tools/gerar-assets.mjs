// Gera o tileset placeholder e os tilemaps. Rode com: npm run gerar-assets
// Os sprites do player sao arte externa e nao sao sobrescritos por este script.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, ruido } from './png.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(RAIZ, 'public', 'assets');
const T = 16; // tamanho do tile

// ---------------------------------------------------------------- tileset --
// Ordem importa: o indice aqui + 1 e o GID usado nos tilemaps abaixo.
const GID = {
  GRAMA: 1,
  TERRA: 2,
  AGUA: 3,
  PEDRA: 4,
  MADEIRA: 5,
  PAREDE: 6,
  PORTA: 7,
  TAPETE: 8,
  CAMA_TOPO: 9,
  CAMA_BASE: 10,
};
// tiles que travam o player (indice 0-based, como o Tiled grava em tileset.tiles)
const COLIDEM = [GID.AGUA, GID.PEDRA, GID.PAREDE, GID.CAMA_TOPO, GID.CAMA_BASE].map((g) => g - 1);

function salpico(im, ox, semente, cor, corte) {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (ruido(x + ox, y, semente) > corte) im.set(ox + x, y, cor);
    }
  }
}

const pintores = [
  // 1 grama
  (im, ox, s) => {
    im.rect(ox, 0, T, T, [86, 148, 74]);
    salpico(im, ox, s, [106, 172, 88], 0.86);
  },
  // 2 terra
  (im, ox, s) => {
    im.rect(ox, 0, T, T, [148, 112, 76]);
    salpico(im, ox, s, [168, 132, 92], 0.86);
  },
  // 3 agua
  (im, ox, s) => {
    im.rect(ox, 0, T, T, [58, 106, 168]);
    salpico(im, ox, s, [82, 138, 196], 0.88);
  },
  // 4 pedra
  (im, ox, s) => {
    im.rect(ox, 0, T, T, [110, 110, 122]);
    salpico(im, ox, s, [140, 140, 152], 0.86);
    for (let i = 0; i < T; i++) {
      im.set(ox + i, 0, [140, 140, 152]);
      im.set(ox, i, [140, 140, 152]);
    }
  },
  // 5 madeira (assoalho)
  (im, ox) => {
    im.rect(ox, 0, T, T, [156, 116, 74]);
    for (let y = 3; y < T; y += 4) im.rect(ox, y, T, 1, [128, 92, 58]);
    im.rect(ox + 7, 0, 1, 3, [128, 92, 58]);
    im.rect(ox + 3, 4, 1, 3, [128, 92, 58]);
    im.rect(ox + 11, 8, 1, 3, [128, 92, 58]);
    im.rect(ox + 5, 12, 1, 3, [128, 92, 58]);
  },
  // 6 parede
  (im, ox) => {
    im.rect(ox, 0, T, T, [102, 80, 64]);
    for (let y = 0; y < T; y += 4) {
      im.rect(ox, y, T, 1, [78, 60, 48]);
      const desloc = (y / 4) % 2 === 0 ? 0 : 8;
      im.rect(ox + desloc, y, 1, 4, [78, 60, 48]);
      im.rect(ox + ((desloc + 8) % 16), y, 1, 4, [78, 60, 48]);
    }
  },
  // 7 porta
  (im, ox) => {
    im.rect(ox, 0, T, T, [78, 60, 48]);
    im.rect(ox + 2, 1, 12, 15, [122, 82, 50]);
    im.rect(ox + 2, 1, 12, 1, [148, 106, 68]);
    im.rect(ox + 7, 1, 1, 15, [96, 64, 40]);
    im.rect(ox + 11, 8, 2, 2, [226, 196, 108]); // macaneta
  },
  // 8 tapete
  (im, ox, s) => {
    im.rect(ox, 0, T, T, [168, 72, 84]);
    im.rect(ox, 0, T, 1, [212, 168, 96]);
    im.rect(ox, T - 1, T, 1, [212, 168, 96]);
    salpico(im, ox, s, [190, 96, 106], 0.9);
  },
  // 9 cama (topo: travesseiro)
  (im, ox) => {
    im.rect(ox, 0, T, T, [122, 82, 50]);
    im.rect(ox + 1, 1, 14, 14, [232, 228, 216]);
    im.rect(ox + 3, 3, 10, 6, [246, 246, 240]);
    im.rect(ox + 1, 12, 14, 3, [200, 84, 96]);
  },
  // 10 cama (base: coberta)
  (im, ox) => {
    im.rect(ox, 0, T, T, [122, 82, 50]);
    im.rect(ox + 1, 0, 14, 14, [200, 84, 96]);
    im.rect(ox + 1, 3, 14, 1, [226, 128, 136]);
    im.rect(ox + 1, 8, 14, 1, [226, 128, 136]);
  },
];

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  console.log('  ->', caminho.replace(RAIZ, '.'));
}

function gerarTileset() {
  const im = new Img(T * pintores.length, T);
  pintores.forEach((pintar, i) => pintar(im, i * T, i));
  escrever(join(ASSETS, 'tilesets', 'terrain.png'), im.png());
  return { largura: im.w, altura: im.h, colunas: pintores.length, total: pintores.length };
}

// ------------------------------------------------------------ spritesheet --
function gerarPlayer() {
  const im = new Img(64, 64);
  const PELE = [240, 200, 160];
  const CABELO = [70, 46, 38];
  const CAMISA = [200, 76, 68];
  const CALCA = [58, 74, 128];
  const BOTA = [60, 44, 36];
  const OLHO = [30, 30, 40];

  for (let dir = 0; dir < 4; dir++) {
    for (let f = 0; f < 4; f++) {
      const ox = f * T;
      const oy = dir * T;
      const y0 = 2 + (f === 3 ? 1 : 0);
      im.rect(ox + 5, oy + y0, 6, 3, CABELO);
      im.rect(ox + 5, oy + y0 + 3, 6, 3, PELE);
      if (dir !== 3) {
        const ex = dir === 1 ? 5 : dir === 2 ? 8 : 6;
        im.rect(ox + ex, oy + y0 + 4, 1, 1, OLHO);
        if (dir === 0) im.rect(ox + 9, oy + y0 + 4, 1, 1, OLHO);
      }
      im.rect(ox + 4, oy + y0 + 6, 8, 5, CAMISA);
      im.rect(ox + 5, oy + y0 + 11, 6, 2, CALCA);
      const passo = f % 2 === 1 ? 1 : 0;
      im.rect(ox + 5, oy + y0 + 13 - passo, 2, 1, BOTA);
      im.rect(ox + 9, oy + y0 + 13 + passo - (f === 3 ? 1 : 0), 2, 1, BOTA);
    }
  }
  escrever(join(ASSETS, 'sprites', 'player.png'), im.png());
}

// ---------------------------------------------------------------- tilemaps --
let proximoIdObjeto = 1;

/** Objeto de interacao no formato que o Tiled grava (retangulo de 1 tile). */
function objeto(nome, classe, tx, ty, props) {
  return {
    class: classe,
    type: classe, // Tiled <1.9 grava 'type'; lemos os dois no jogo
    height: T,
    width: T,
    id: proximoIdObjeto++,
    name: nome,
    rotation: 0,
    visible: true,
    x: tx * T,
    y: ty * T,
    properties: Object.entries(props || {}).map(([name, value]) => ({
      name,
      type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
      value,
    })),
  };
}

function camadaTiles(nome, id, dados, w, h) {
  return {
    data: dados,
    height: h,
    id,
    name: nome,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: w,
    x: 0,
    y: 0,
  };
}

function montarMapa(largura, altura, chao, objetos, interativos, ts) {
  return {
    compressionlevel: -1,
    width: largura,
    height: altura,
    tilewidth: T,
    tileheight: T,
    infinite: false,
    nextlayerid: 4,
    nextobjectid: proximoIdObjeto,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    type: 'map',
    version: '1.10',
    layers: [
      camadaTiles('chao', 1, chao, largura, altura),
      camadaTiles('objetos', 2, objetos, largura, altura),
      {
        draworder: 'topdown',
        id: 3,
        name: 'interativos',
        objects: interativos,
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
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

function gerarFazenda(ts) {
  const W = 40;
  const H = 30;
  const chao = new Array(W * H).fill(GID.GRAMA);
  const obj = new Array(W * H).fill(0);
  const at = (x, y) => y * W + x;

  for (let x = 2; x < W - 2; x++) chao[at(x, 15)] = GID.TERRA;
  for (let y = 2; y < H - 2; y++) chao[at(20, y)] = GID.TERRA;
  for (let y = 5; y < 11; y++) for (let x = 5; x < 15; x++) chao[at(x, y)] = GID.TERRA;

  for (let x = 0; x < W; x++) {
    obj[at(x, 0)] = GID.PEDRA;
    obj[at(x, H - 1)] = GID.PEDRA;
  }
  for (let y = 0; y < H; y++) {
    obj[at(0, y)] = GID.PEDRA;
    obj[at(W - 1, y)] = GID.PEDRA;
  }

  for (let y = 19; y < 25; y++) {
    for (let x = 26; x < 34; x++) {
      const dx = (x - 30) / 4;
      const dy = (y - 22) / 3;
      if (dx * dx + dy * dy <= 1) obj[at(x, y)] = GID.AGUA;
    }
  }
  for (const par of [[8, 20], [9, 20], [12, 24], [33, 12]]) obj[at(par[0], par[1])] = GID.PEDRA;

  // casinha: bloco de parede com uma porta no meio da parede de baixo
  for (let y = 6; y <= 9; y++) for (let x = 22; x <= 26; x++) obj[at(x, y)] = GID.PAREDE;
  obj[at(24, 9)] = GID.PORTA;

  const interativos = [
    objeto('placa_teste', 'placa', 18, 15),
    objeto('morador_1', 'npc', 16, 15, { npcId: 'morador_1' }),
    // destinoTx/destinoTy sao em TILES do mapa de destino
    objeto('porta_casa', 'porta', 24, 9, { destino: 'casa', destinoTx: 8, destinoTy: 10 }),
  ];

  return montarMapa(W, H, chao, obj, interativos, ts);
}

function gerarCasa(ts) {
  const W = 16;
  const H = 12;
  const chao = new Array(W * H).fill(GID.MADEIRA);
  const obj = new Array(W * H).fill(0);
  const at = (x, y) => y * W + x;

  for (let x = 0; x < W; x++) {
    obj[at(x, 0)] = GID.PAREDE;
    obj[at(x, H - 1)] = GID.PAREDE;
  }
  for (let y = 0; y < H; y++) {
    obj[at(0, y)] = GID.PAREDE;
    obj[at(W - 1, y)] = GID.PAREDE;
  }
  obj[at(8, H - 1)] = GID.PORTA; // saida (nao colide)

  for (let y = 5; y <= 6; y++) for (let x = 6; x <= 9; x++) chao[at(x, y)] = GID.TAPETE;

  obj[at(2, 2)] = GID.CAMA_TOPO;
  obj[at(2, 3)] = GID.CAMA_BASE;

  const interativos = [
    objeto('porta_saida', 'porta', 8, H - 1, {
      destino: 'farm',
      destinoTx: 24,
      destinoTy: 10,
      rotulo: 'Sair',
    }),
    objeto('cama_casa', 'cama', 2, 3),
  ];

  return montarMapa(W, H, chao, obj, interativos, ts);
}

console.log('gerando assets placeholder...');
const ts = gerarTileset();
escrever(join(ASSETS, 'tilemaps', 'farm.json'), JSON.stringify(gerarFazenda(ts), null, 1));
escrever(join(ASSETS, 'tilemaps', 'casa.json'), JSON.stringify(gerarCasa(ts), null, 1));
console.log('pronto.');

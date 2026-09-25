/**
 * Confere o REMAP DA ESTRADA DA REPRESA (Mapa 4) no mapa que o gerador escreveu.
 *
 * (O `verificar-represa` que ja existia e outra coisa: ele confere os cinquenta
 * ANDARES da usina — setor, enigma, inimigo, atalho. Este aqui e a estrada.)
 *
 * Este mapa ja tinha o que os outros tres nao tinham: dez placas, patio na
 * frente da casa de forca, mirante calcado e ramal ate ele. O que ele nao tinha
 * era UM UNICO objeto de cenario — nem camada `moveis`. Entao o que se confere
 * aqui e o que entrou, e o que ele nao pode ter deixado de ser:
 *
 *   1. ALCANCE. O flood-fill do spawn (a boca da estrada, na borda sul) tem de
 *      subir ate a porta da casa de forca e passar pelos tres recuos;
 *   2. O PORTAO CONTINUA SENDO A UNICA ENTRADA. A cerca fecha o mapa de ponta a
 *      ponta em y 40 com um portao de tres tiles. Um recuo de concreto encostado
 *      nela nao pode ter aberto buraco nenhum;
 *   3. A AGUA CONTINUA INTRANSPONIVEL. Reservatorio e rio de jusante sao o que
 *      fecha o mapa pelos lados;
 *   4. UMA LUZ SO. Todo o resto do jogo tem iluminacao publica; esta estrada
 *      tem uma lampada, no portao. Se aparecer uma segunda, alguem mobiliou sem
 *      ler o que o lugar e.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPAS } from '../src/game/mapas.ts';

const url = (c) => new URL(c, import.meta.url);
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const MOVEL_CORPO = { largura: 0.92, altura: 0.5 };
const TRONCO = { largura: 0.56, altura: 0.375 };
const PEDRA = { largura: 0.78, altura: 0.34 };
const PEDRA_COLIDE_ACIMA_DE = 0.45;

let conferencias = 0;
const ok = (mensagem, condicao) => { assert(condicao, mensagem); conferencias += 1; };

const atlasCache = new Map();
const framesDoAtlas = (atlas) => {
  if (!atlasCache.has(atlas)) {
    atlasCache.set(atlas, JSON.parse(readFileSync(url(`../public/assets/sprites/${atlas}.atlas.json`))).frames);
  }
  return atlasCache.get(atlas);
};

const mapa = JSON.parse(readFileSync(url('../public/assets/tilemaps/represa.json')));
const T = mapa.tilewidth;
const W = mapa.width;
const H = mapa.height;

// ------------------------------------------------------------------ colisao
const gidsBloqueados = new Set();
for (const ts of mapa.tilesets) {
  for (const t of ts.tiles ?? []) {
    if ((t.properties ?? []).some((p) => p.name === 'collides' && p.value === true)) gidsBloqueados.add(ts.firstgid + t.id);
  }
}
const solido = new Uint8Array(W * H);
for (const camada of mapa.layers) {
  if (camada.type !== 'tilelayer') continue;
  for (let i = 0; i < camada.data.length; i++) if (gidsBloqueados.has(camada.data[i] & 0x1fffffff)) solido[i] = 1;
}
const marcarCorpo = (cx, cy, largura, altura) => {
  for (let py = cy - altura; py < cy; py += 1) {
    for (let px = cx - largura / 2; px < cx + largura / 2; px += 1) {
      const tx = Math.floor(px / T); const ty = Math.floor(py / T);
      if (tx >= 0 && ty >= 0 && tx < W && ty < H) solido[ty * W + tx] = 1;
    }
  }
};
const objetosDe = (nome) => mapa.layers.find((c) => c.name === nome)?.objects ?? [];
const framesPedra = framesDoAtlas('pedras');
for (const o of objetosDe('flora')) {
  const p = props(o);
  if (o.type === 'arvore') {
    if (p.estagio < 2) continue;
    marcarCorpo(o.x, o.y, TRONCO.largura * T, TRONCO.altura * T);
  } else if (o.type === 'pedra') {
    if (p.alturaTiles <= PEDRA_COLIDE_ACIMA_DE) continue;
    const f = framesPedra[`pedra_${p.indice}`].frame;
    const h = p.alturaTiles * T;
    marcarCorpo(o.x, o.y, h * (f.w / f.h) * PEDRA.largura, h * PEDRA.altura);
  }
}
const moveis = objetosDe('moveis');
for (const o of moveis) {
  const p = props(o);
  if (p.colide !== true) continue;
  const f = framesDoAtlas(String(p.atlas))[String(p.frame)];
  if (!f) continue;
  const escala = (Number(p.alturaTiles) * T) / f.frame.h;
  marcarCorpo(o.x, o.y, f.frame.w * escala * MOVEL_CORPO.largura, f.frame.h * escala * MOVEL_CORPO.altura);
}
const livre = (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < H && !solido[ty * W + tx];

// ------------------------------------------------------------------ alcance
const spawn = MAPAS.represa.spawnTile;
ok(`spawn (${spawn.x},${spawn.y}) esta livre`, livre(spawn.x, spawn.y));
const visto = new Uint8Array(W * H);
const fila = [[spawn.x, spawn.y]];
visto[spawn.y * W + spawn.x] = 1;
let alcancados = 0;
while (fila.length) {
  const [x, y] = fila.pop();
  alcancados += 1;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx; const ny = y + dy;
    if (!livre(nx, ny) || visto[ny * W + nx]) continue;
    visto[ny * W + nx] = 1;
    fila.push([nx, ny]);
  }
}
const alcanca = (tx, ty) => visto[ty * W + tx] === 1;
ok(`o flood-fill sobe a estrada (${alcancados} tiles)`, alcancados > 1500);

// a porta da casa de forca, que e a unica que abre no mapa
const portas = objetosDe('interativos').filter((o) => o.type === 'porta');
ok(`a estrada tem a porta da casa de forca (${portas.length})`, portas.length === 1);
for (const porta of portas) {
  const tx = Math.floor(porta.x / T);
  const ty = Math.floor(porta.y / T) + 1;
  ok(`a frente de "${porta.name}" (${tx},${ty}) esta livre`, livre(tx, ty));
  ok(`a frente de "${porta.name}" e alcancavel da boca da estrada`, alcanca(tx, ty));
}

/**
 * O PORTAO E A UNICA ENTRADA. A cerca corre em y 40, de x 4 a x 78, com portao
 * de tres tiles em x 39. O recuo de concreto novo encosta nela do lado de fora
 * — se ele tivesse aberto buraco, a area restrita deixaria de ser restrita e
 * nada no jogo avisaria.
 */
let furos = 0;
for (let tx = 4; tx <= 78; tx++) {
  const passa = livre(tx, 40) && alcanca(tx, 40);
  const noPortao = tx >= 39 && tx <= 41;
  if (passa && !noPortao) furos += 1;
}
ok(`a cerca da area restrita nao tem furo fora do portao (${furos} achado(s))`, furos === 0);
ok(
  'o portao esta aberto e se alcanca da estrada',
  [39, 40, 41].some((tx) => livre(tx, 40) && alcanca(tx, 40)),
);

/** A agua continua fechando o mapa: nada do reservatorio se alcanca a pe. */
let naAgua = 0;
for (let ty = 3; ty < 22; ty++) {
  for (let tx = 2; tx < 78; tx++) if (alcanca(tx, ty)) naAgua += 1;
}
ok(`nenhum tile do reservatorio e alcancavel a pe (${naAgua} achado(s))`, naAgua === 0);

/** Os tres recuos: tem de sobrar chao, e ele tem de ser alcancavel. */
const AREAS = [
  ['recuo do portao', { x: 43, y: 41, w: 4, h: 4 }, 8],
  ['area de piquenique abandonada', { x: 44, y: 105, w: 13, h: 5 }, 40],
  ['patio do galpao', { x: 56, y: 68, w: 10, h: 3 }, 18],
  ['mirante sobre o rio', { x: 22, y: 90, w: 10, h: 6 }, 40],
];
for (const [nome, r, minimo] of AREAS) {
  let livres = 0; let alcancaveis = 0;
  for (let ty = r.y; ty < r.y + r.h; ty++) {
    for (let tx = r.x; tx < r.x + r.w; tx++) {
      if (!livre(tx, ty)) continue;
      livres += 1;
      if (alcanca(tx, ty)) alcancaveis += 1;
    }
  }
  ok(`${nome}: sobra chao andavel (${livres} tiles, minimo ${minimo})`, livres >= minimo);
  ok(`${nome}: todo o chao livre e alcancavel (${alcancaveis}/${livres})`, alcancaveis === livres);
}

// -------------------------------------------------------------- mobiliario
const daEstrada = moveis.filter((o) => o.name.startsWith('movel_represa_'));
ok(`mobiliario posto na estrada (${daEstrada.length} pecas)`, daEstrada.length >= 14);
const comLuz = daEstrada.filter((o) => props(o).luz === true);
ok(
  `UMA lampada no mapa inteiro, no portao (${comLuz.length}). Uma usina desativada nao tem `
  + 'iluminacao publica, e a luz acesa no portao e a leitura do lugar',
  comLuz.length === 1,
);
for (const o of daEstrada) {
  const p = props(o);
  ok(`${o.name} aponta pro atlas do parque`, p.atlas === 'moveis_parque');
  ok(`${o.name} tem altura em tiles`, Number.isFinite(Number(p.alturaTiles)) && Number(p.alturaTiles) > 0);
}

// ------------------------------------------------------------------ densidade
const caminhos = mapa.layers.find((c) => c.name === 'caminhos');
const piso = caminhos.data.filter((gid) => gid !== 0).length;
ok(`piso desenhado na estrada (${piso} tiles)`, piso > 700);
ok(`a estrada continua sendo mata (${W * H - piso} tiles sem piso)`, W * H - piso > 9000);

console.log(
  `[estrada da represa] ${conferencias} conferencias: ${alcancados} tiles alcancaveis, `
  + `${daEstrada.length} pecas de mobiliario (${comLuz.length} com luz), ${piso} tiles de piso`,
);

/**
 * Confere o REMAP DA ZONA RURAL no mapa que o gerador escreveu.
 *
 * (O `verificar-rural` que ja existia e outra coisa: ele conferre a MECANICA da
 * roca — plantio, coleta, fabricacao. Este aqui e o mapa.)
 *
 * A pergunta central e uma so, e ela e diferente da do centro e da do bairro:
 * **da pra chegar nas tres portas deste mapa andando?** Ate esta leva nao dava
 * de um jeito que o mapa mostrasse — a casa do Joao fica vinte tiles a oeste da
 * estrada, a do Bruno doze ao norte, o balcao da madeireira sete, e entre a
 * porta e a estrada havia mato e mais nada. O jogador chegava cortando gramado
 * na diagonal, porque nao havia por onde mais.
 *
 * Alem disso: os terreiros e as eiras sobram chao; as serventias estao livres de
 * ponta a ponta; as quatro placas tem texto; e o mobiliario aponta pro atlas
 * certo.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITENS_DE_LEITURA } from '../src/game/avisos.ts';
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

const mapa = JSON.parse(readFileSync(url('../public/assets/tilemaps/rural.json')));
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
const spawn = MAPAS.rural.spawnTile;
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
ok(`o flood-fill cobre a zona rural (${alcancados} tiles)`, alcancados > 6000);

/**
 * AS TRES PORTAS. Duas sao porta de casa e a terceira e o BALCAO da madeireira,
 * que nao tem interior — o atendimento e no tile da porta, e por isso ele entra
 * aqui do mesmo jeito: caminho ate o balcao e caminho ate a loja de material.
 */
const PORTAS = [
  ['casa do Joao, da Neide e da Priscila', 57, 70],
  ['casa do Bruno', 101, 34],
  ['balcao da madeireira', 117, 35],
];
for (const [nome, tx, ty] of PORTAS) {
  ok(`${nome}: a frente da porta (${tx},${ty}) esta livre`, livre(tx, ty));
  ok(`${nome}: a frente da porta e alcancavel do spawn`, alcanca(tx, ty));
}

/**
 * SERVENTIA CONTINUA. Cada uma e uma faixa de um tile no trecho longo, e ela
 * tem de estar livre em todo o percurso: e o unico caminho que aquela porta
 * tem, e uma arvore sorteada em cima dele fecha a propriedade inteira.
 */
const SERVENTIAS = [
  { nome: 'serventia da casa do Joao', eixo: 'x', de: 57, ate: 77, fixo: 70 },
  { nome: 'serventia da casa do Bruno', eixo: 'y', de: 34, ate: 46, fixo: 101 },
  { nome: 'serventia da madeireira', eixo: 'y', de: 38, ate: 42, fixo: 117, alternativo: 118 },
];
for (const s of SERVENTIAS) {
  let fechados = 0;
  for (let n = s.de; n <= s.ate; n++) {
    const passa = s.eixo === 'x'
      ? livre(n, s.fixo) || (s.alternativo !== undefined && livre(n, s.alternativo))
      : livre(s.fixo, n) || (s.alternativo !== undefined && livre(s.alternativo, n));
    if (!passa) fechados += 1;
  }
  ok(`${s.nome}: livre da porta ate a estrada (${fechados} pontos fechados)`, fechados === 0);
  const inicio = s.eixo === 'x' ? [s.de, s.fixo] : [s.fixo, s.de];
  ok(`${s.nome}: a ponta de cima e alcancavel do spawn`, alcanca(inicio[0], inicio[1]));
}

/** Terreiro, eira e patio: area de trabalho, e tem de sobrar chao nelas. */
const AREAS = [
  ['terreiro da casa do Joao', { x: 54, y: 70, w: 7, h: 3 }, 14],
  ['terreiro da casa do Bruno', { x: 98, y: 34, w: 7, h: 3 }, 14],
  ['patio da madeireira', { x: 111, y: 35, w: 12, h: 4 }, 34],
  ['eira da fazenda_1', { x: 26, y: 61, w: 14, h: 3 }, 30],
  ['eira da fazenda_2', { x: 28, y: 87, w: 14, h: 3 }, 30],
  ['patio da pedreira', { x: 106, y: 73, w: 12, h: 3 }, 24],
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
  ok(`${nome}: todo o chao livre e alcancavel do spawn (${alcancaveis}/${livres})`, alcancaveis === livres);
}

// ------------------------------------------------------------- placa com texto
const placas = objetosDe('interativos').filter((o) => o.type === 'placa');
const comAviso = placas.filter((o) => typeof props(o).aviso === 'string');
ok(`a zona rural tem placa de estrada (${comAviso.length})`, comAviso.length >= 4);
for (const placa of comAviso) {
  const chave = props(placa).aviso;
  ok(
    `a placa "${placa.name}" tem texto em ITENS_DE_LEITURA ("${chave}")`,
    Array.isArray(ITENS_DE_LEITURA[chave]) && ITENS_DE_LEITURA[chave].length > 0,
  );
}

// -------------------------------------------------------------- mobiliario
const doRural = moveis.filter((o) => o.name.startsWith('movel_rural_'));
ok(`mobiliario de roca posto no mapa (${doRural.length} pecas)`, doRural.length >= 20);
const comLuz = doRural.filter((o) => props(o).luz === true);
ok(
  `as duas moradias tem poste (${comLuz.length}); a roca nao tem iluminacao publica`,
  comLuz.length === 2,
);
for (const o of doRural) {
  const p = props(o);
  ok(`${o.name} aponta pro atlas do parque`, p.atlas === 'moveis_parque');
  ok(`${o.name} tem altura em tiles`, Number.isFinite(Number(p.alturaTiles)) && Number(p.alturaTiles) > 0);
}

// ------------------------------------------------------------------ densidade
const caminhos = mapa.layers.find((c) => c.name === 'caminhos');
const piso = caminhos.data.filter((gid) => gid !== 0).length;
ok(`piso desenhado na zona rural (${piso} tiles)`, piso > 2000);
const verde = W * H - piso;
ok(`a zona rural continua sendo a mais vazia do jogo (${verde} tiles)`, verde > 14000);

console.log(
  `[zona rural] ${conferencias} conferencias: ${alcancados} tiles alcancaveis, ${PORTAS.length} portas, `
  + `${doRural.length} pecas de mobiliario (${comLuz.length} com luz), ${piso} tiles de piso`,
);

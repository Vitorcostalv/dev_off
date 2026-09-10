/**
 * Confere o REMAP DO CENTRO no mapa que o gerador escreveu (nao nas tabelas que
 * o produziram — as tabelas o proprio gerador ja cobra).
 *
 * O que ele mede e o que um remap pode quebrar sem dar erro:
 *
 *   1. ALCANCE. Um flood-fill do spawn tem de chegar na frente de toda porta,
 *      em toda praca de esquina e no mirante do lago. Calcada bonita que nao
 *      leva a lugar nenhum e cenario, nao cidade;
 *   2. CALCADA CONTINUA. Cada lado de cada avenida tem de ter as duas faixas
 *      inteiras andaveis de ponta a ponta, tirando o que o mobiliario ocupa —
 *      e nunca as duas no mesmo x;
 *   3. PORTA LIVRE. Nenhum corpo de movel encosta na frente de porta, que e a
 *      ancora de rotina dos NPCs;
 *   4. PLACA COM TEXTO. Todo objeto `placa` do mapa tem verbete em
 *      `ITENS_DE_LEITURA`;
 *   5. DENSIDADE. O centro tinha quadrante inteiro de grama vazia; a conta de
 *      tiles calcados serve de linha de base contra regressao.
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

const mapa = JSON.parse(readFileSync(url('../public/assets/tilemaps/farm.json')));
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
const spawn = MAPAS.farm.spawnTile;
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
ok(`o flood-fill cobre area de cidade (${alcancados} tiles)`, alcancados > 4000);

// frente de cada porta
const portas = objetosDe('interativos').filter((o) => o.type === 'porta');
ok('o mapa tem as portas dos lotes construidos', portas.length >= 9);
for (const porta of portas) {
  const tx = Math.floor(porta.x / T);
  const ty = Math.floor(porta.y / T) + 1; // um tile a frente da porta
  ok(`a frente da porta "${porta.name}" (${tx},${ty}) esta livre`, livre(tx, ty));
  ok(`a frente da porta "${porta.name}" e alcancavel do spawn`, alcanca(tx, ty));
}

/**
 * Cada area de estar do remap: praca de esquina, terraco, apron, mirante,
 * bosque, patio e viela. A conferencia e por AREA e nao por tile — mobiliario
 * ocupa tile, e exigir um ponto especifico livre transformaria qualquer
 * reposicionamento de banco em falha falsa. O que importa e que sobre chao
 * andavel alcancavel do spawn em cada uma, e sobre o bastante pra circular.
 */
const AREAS = [
  ['praca noroeste', { x: 50, y: 39, w: 8, h: 4 }, 12],
  ['praca nordeste', { x: 63, y: 39, w: 8, h: 4 }, 12],
  ['praca sudoeste', { x: 50, y: 48, w: 8, h: 4 }, 12],
  ['praca sudeste', { x: 63, y: 48, w: 6, h: 2 }, 6],
  ['terraco do bar', { x: 77, y: 29, w: 8, h: 5 }, 14],
  ['apron do mercado', { x: 66, y: 55, w: 8, h: 3 }, 10],
  ['entrada da farmacia', { x: 82, y: 55, w: 6, h: 2 }, 6],
  ['entrada da academia', { x: 50, y: 35, w: 7, h: 2 }, 6],
  ['mirante do lago', { x: 102, y: 50, w: 2, h: 8 }, 6],
  ['bosque', { x: 29, y: 64, w: 14, h: 4 }, 20],
  ['patio de servico', { x: 74, y: 62, w: 16, h: 6 }, 40],
  ['viela de servico', { x: 63, y: 60, w: 34, h: 1 }, 24],
  ['fundos das casas do norte', { x: 24, y: 10, w: 29, h: 1 }, 20],
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

// ---------------------------------------------------------- calcada continua
/**
 * Em cada faixa de calcada de avenida, ao menos uma das duas linhas (ou
 * colunas) tem de estar livre em cada posicao. E a regra que impede poste de
 * fechar a passagem — o motivo de a avenida ter calcada dupla.
 */
const FAIXAS = [
  { nome: 'avenida h, calcada norte', eixo: 'x', de: 4, ate: 115, linhas: [42, 43] },
  { nome: 'avenida h, calcada sul', eixo: 'x', de: 4, ate: 115, linhas: [47, 48] },
  // A ponta SUL para em 82: a barreira de obra da interdicao (y 84, x 52..68)
  // atravessa a avenida de proposito, e ela nao e falha de calcada.
  { nome: 'avenida v, calcada oeste', eixo: 'y', de: 4, ate: 82, linhas: [57, 58] },
  { nome: 'avenida v, calcada leste', eixo: 'y', de: 4, ate: 82, linhas: [62, 63] },
];
for (const faixa of FAIXAS) {
  let fechados = 0;
  for (let n = faixa.de; n <= faixa.ate; n++) {
    const passa = faixa.linhas.some((l) => (faixa.eixo === 'x' ? livre(n, l) : livre(l, n)));
    if (!passa) fechados += 1;
  }
  ok(`${faixa.nome}: passagem livre de ponta a ponta (${fechados} pontos fechados)`, fechados === 0);
}

// -------------------------------------------------------- acesso continuo
/**
 * Cada faixa de acesso de comercio tem duas colunas de largura, e ao menos uma
 * delas tem de estar livre em cada linha do percurso. Foi assim que apareceu o
 * bicicletario (4 tiles de largura) plantado em cima do acesso do mercado: o
 * caminho existia no piso e o corpo do movel o fechava.
 */
const ACESSOS = [
  { nome: 'acesso do mercado', colunas: [69, 70], de: 55, ate: 69 },
  { nome: 'acesso da farmacia', colunas: [85, 86], de: 55, ate: 69 },
  { nome: 'acesso da academia', colunas: [53, 54], de: 35, ate: 43 },
  { nome: 'acesso do bar', colunas: [81, 82], de: 29, ate: 43 },
];
for (const acesso of ACESSOS) {
  let fechados = 0;
  for (let ty = acesso.de; ty <= acesso.ate; ty++) {
    if (!acesso.colunas.some((tx) => livre(tx, ty))) fechados += 1;
  }
  ok(`${acesso.nome}: livre da rua ate a porta (${fechados} linhas fechadas)`, fechados === 0);
}

// ------------------------------------------------------------- placa com texto
const placas = objetosDe('interativos').filter((o) => o.type === 'placa');
const comAviso = placas.filter((o) => typeof props(o).aviso === 'string');
ok(`o centro tem placa de rua (${comAviso.length})`, comAviso.length >= 4);
for (const placa of comAviso) {
  const chave = props(placa).aviso;
  ok(`a placa "${placa.name}" tem texto em ITENS_DE_LEITURA ("${chave}")`, Array.isArray(ITENS_DE_LEITURA[chave]) && ITENS_DE_LEITURA[chave].length > 0);
}
ok('nao ha mais placa de teste no cruzamento', !placas.some((o) => o.name === 'placa_teste'));

// -------------------------------------------------------------- mobiliario
const doCentro = moveis.filter((o) => o.name.startsWith('movel_centro_'));
ok(`mobiliario urbano posto no mapa (${doCentro.length} pecas)`, doCentro.length >= 50);
const comLuz = doCentro.filter((o) => props(o).luz === true);
ok(`pecas de iluminacao marcadas (${comLuz.length})`, comLuz.length >= 20);
for (const o of doCentro) {
  const p = props(o);
  ok(`${o.name} aponta pro atlas do parque`, p.atlas === 'moveis_parque');
  ok(`${o.name} tem altura em tiles`, Number.isFinite(Number(p.alturaTiles)) && Number(p.alturaTiles) > 0);
}

// ------------------------------------------------------------------ densidade
const caminhos = mapa.layers.find((c) => c.name === 'caminhos');
const calcados = caminhos.data.filter((gid) => gid !== 0).length;
ok(`piso desenhado no centro (${calcados} tiles de caminho)`, calcados > 3000);
const grama = W * H - calcados;
ok(`ainda ha area verde (${grama} tiles)`, grama > 4000);

console.log(
  `[centro] ${conferencias} conferencias: ${alcancados} tiles alcancaveis, ${portas.length} portas, `
  + `${doCentro.length} pecas de mobiliario (${comLuz.length} com luz), ${calcados} tiles de piso`,
);

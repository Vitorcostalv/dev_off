/**
 * Confere o REMAP DO BAIRRO no mapa que o gerador escreveu (nao nas tabelas que
 * o produziram — as tabelas o proprio gerador ja cobra, em `conferirRemap`).
 *
 * Mesma leitura que `verificar-centro`, com uma pergunta a mais que so o bairro
 * tem:
 *
 *   1. ALCANCE. Um flood-fill do spawn tem de chegar na frente das doze portas (a
 *      central telefonica e predio fechado: no lugar da porta ela tem objeto de
 *      exame), nos dois largos da estacao, na cabeceira da ponte e no recuo da
 *      quadra.
 *      Calcada que nao leva a lugar nenhum e cenario, nao bairro;
 *   2. O CONDOMINIO POR DENTRO. As duas casas de dentro do muro so se alcancam
 *      pelo portao, e o caminho de la e novo: a rua do condominio passou a
 *      entrar pelo portao e virar rua interna. Se o portao fechar, ou se a rua
 *      nao chegar nas portas, as casas do Lucas e do Tulio ficam inacessiveis —
 *      e ninguem percebe ate tentar visitar;
 *   3. A PONTE CONTINUA PASSANDO. Ela e a UNICA travessia do rio e a unica saida
 *      pra zona rural. Calcamento novo perto da cabeceira nao pode ter encostado
 *      nela;
 *   4. PORTA LIVRE. Nenhum corpo de movel encosta na frente de porta, que e a
 *      ancora de rotina dos NPCs — e vinte dos trinta e tres moram aqui;
 *   5. PLACA COM TEXTO. Todo objeto `placa` do mapa tem verbete em
 *      `ITENS_DE_LEITURA`;
 *   6. DENSIDADE. O bairro nao tinha um tile de calcada; a conta serve de linha
 *      de base contra regressao.
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

const mapa = JSON.parse(readFileSync(url('../public/assets/tilemaps/bairro.json')));
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
const spawn = MAPAS.bairro.spawnTile;
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
ok(`o flood-fill cobre area de bairro (${alcancados} tiles)`, alcancados > 5000);

// frente de cada porta, e das duas de dentro do muro em separado
const portas = objetosDe('interativos').filter((o) => o.type === 'porta');
ok(`o mapa tem as portas dos lotes construidos (${portas.length})`, portas.length >= 12);
for (const porta of portas) {
  const tx = Math.floor(porta.x / T);
  const ty = Math.floor(porta.y / T) + 1;
  ok(`a frente da porta "${porta.name}" (${tx},${ty}) esta livre`, livre(tx, ty));
  ok(`a frente da porta "${porta.name}" e alcancavel do spawn`, alcanca(tx, ty));
}

/**
 * O CONDOMINIO. Vale conferencia propria porque ele e o unico lugar do jogo
 * cercado por muro com uma entrada so: as duas casas de dentro so se alcancam
 * pelo portao, e antes desta leva nao havia rua nem calcada la dentro — as
 * portas davam pra grama e o caminho ate elas era andar por cima do gramado.
 */
const DENTRO_DO_MURO = [
  ['casa do Lucas (casa_c1)', 99, 28],
  ['casa do Tulio (casa_c2)', 111, 28],
];
for (const [nome, tx, ty] of DENTRO_DO_MURO) {
  ok(`${nome}: a frente da porta e alcancavel pelo portao`, alcanca(tx, ty));
}
// o portao em si: sem ele nada la dentro se alcanca
ok('o portao do condominio esta aberto (algum tile livre na linha do muro)',
  [103, 104, 105, 106].some((tx) => livre(tx, 41) && alcanca(tx, 41)));

/**
 * A PONTE. Unica travessia do rio e unica saida pra zona rural. O calcamento da
 * cabeceira e novo e fica a quatro tiles dela.
 */
let tilesDePonte = 0;
for (let ty = 84; ty < 96; ty++) {
  for (let tx = 62; tx < 71; tx++) if (livre(tx, ty) && alcanca(tx, ty)) tilesDePonte += 1;
}
ok(`a ponte continua passando (${tilesDePonte} tiles alcancaveis na faixa dela)`, tilesDePonte >= 30);

/**
 * Cada area de estar do remap. A conferencia e por AREA e nao por tile —
 * mobiliario ocupa tile, e exigir um ponto especifico livre transformaria
 * qualquer reposicionamento de banco em falha falsa.
 */
const AREAS = [
  ['largo da estacao, oeste', { x: 50, y: 6, w: 6, h: 7 }, 22],
  ['largo da estacao, leste', { x: 61, y: 6, w: 6, h: 7 }, 21],
  ['patio da escola', { x: 33, y: 48, w: 10, h: 3 }, 17],
  ['patio da biblioteca', { x: 48, y: 50, w: 10, h: 2 }, 13],
  ['apron da oficina', { x: 76, y: 39, w: 8, h: 3 }, 12],
  ['recuo da quadra', { x: 85, y: 60, w: 4, h: 8 }, 19],
  ['jardim do condominio, oeste', { x: 96, y: 33, w: 6, h: 5 }, 20],
  ['jardim do condominio, leste', { x: 107, y: 33, w: 7, h: 5 }, 23],
  ['cabeceira da ponte', { x: 70, y: 82, w: 6, h: 4 }, 13],
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

/**
 * ACESSO CONTINUO das casas. Cada entrada e uma faixa de um tile, e ela tem de
 * estar livre em todo o percurso: foi assim que o centro descobriu bicicletario
 * plantado em cima de acesso de porta. Aqui a faixa e estreita, entao qualquer
 * movel ou arvore em cima dela fecha o caminho inteiro.
 */
const ENTRADAS = [
  { nome: 'entrada da casa_b1', eixo: 'x', de: 17, ate: 24, fixo: 48 },
  { nome: 'entrada da casa_b2', eixo: 'x', de: 17, ate: 24, fixo: 56 },
  { nome: 'entrada da casa_b6', eixo: 'y', de: 56, ate: 64, fixo: 7 },
  { nome: 'entrada da casa_b7 (contorno)', eixo: 'y', de: 79, ate: 84, fixo: 37 },
  { nome: 'ramal da escola', eixo: 'y', de: 50, ate: 61, fixo: 37, alternativo: 38 },
  { nome: 'ramal da oficina', eixo: 'y', de: 41, ate: 48, fixo: 79, alternativo: 80 },
];
for (const e of ENTRADAS) {
  let fechados = 0;
  for (let n = e.de; n <= e.ate; n++) {
    const passa = e.eixo === 'x'
      ? livre(n, e.fixo) || (e.alternativo !== undefined && livre(n, e.alternativo))
      : livre(e.fixo, n) || (e.alternativo !== undefined && livre(e.alternativo, n));
    if (!passa) fechados += 1;
  }
  ok(`${e.nome}: livre da porta ate a rua (${fechados} pontos fechados)`, fechados === 0);
}

// ------------------------------------------------------------- placa com texto
const placas = objetosDe('interativos').filter((o) => o.type === 'placa');
const comAviso = placas.filter((o) => typeof props(o).aviso === 'string');
ok(`o bairro tem placa de rua (${comAviso.length})`, comAviso.length >= 4);
for (const placa of comAviso) {
  const chave = props(placa).aviso;
  ok(
    `a placa "${placa.name}" tem texto em ITENS_DE_LEITURA ("${chave}")`,
    Array.isArray(ITENS_DE_LEITURA[chave]) && ITENS_DE_LEITURA[chave].length > 0,
  );
}

// -------------------------------------------------------------- mobiliario
const doBairro = moveis.filter((o) => o.name.startsWith('movel_bairro_'));
ok(`mobiliario urbano posto no mapa (${doBairro.length} pecas)`, doBairro.length >= 30);
const comLuz = doBairro.filter((o) => props(o).luz === true);
ok(`pecas de iluminacao marcadas (${comLuz.length})`, comLuz.length >= 8);
for (const o of doBairro) {
  const p = props(o);
  ok(`${o.name} aponta pro atlas do parque`, p.atlas === 'moveis_parque');
  ok(`${o.name} tem altura em tiles`, Number.isFinite(Number(p.alturaTiles)) && Number(p.alturaTiles) > 0);
}

/**
 * NENHUM movel encostando na frente de porta. O gerador ja cobra isso nas
 * tabelas, mas ali ele mede o TILE da peca; aqui se mede o CORPO dela, que sobe
 * meio sprite acima da base e e o que de fato bloqueia. Vinte dos trinta e tres
 * moradores moram neste mapa, e a frente da porta e a ancora da rotina deles.
 */
for (const porta of portas) {
  const tx = Math.floor(porta.x / T);
  const ty = Math.floor(porta.y / T) + 1;
  ok(`nenhum corpo de movel cobre a frente de "${porta.name}"`, livre(tx, ty));
}

// ------------------------------------------------------------------ densidade
const caminhos = mapa.layers.find((c) => c.name === 'caminhos');
const calcados = caminhos.data.filter((gid) => gid !== 0).length;
ok(`piso desenhado no bairro (${calcados} tiles de caminho)`, calcados > 2500);
const grama = W * H - calcados;
ok(`o bairro continua sendo mais verde que o centro (${grama} tiles)`, grama > 10000);

console.log(
  `[bairro] ${conferencias} conferencias: ${alcancados} tiles alcancaveis, ${portas.length} portas, `
  + `${doBairro.length} pecas de mobiliario (${comLuz.length} com luz), ${calcados} tiles de piso`,
);

/**
 * Densidade e variedade de mobilia nos 23 interiores urbanos.
 *
 * Existe por causa de uma medicao: os interiores PUBLICOS estavam com metade da
 * mobilia por area das residencias — biblioteca com 3,6 pecas por 100 tiles
 * contra 9,3 da casa do Edu. Sala grande com quatro pecas nao le como
 * biblioteca nem como mercado; le como caixa com props.
 *
 * O que este validador cobra, sobre os tilemaps escritos:
 *
 *   1. DENSIDADE minima por interior, com piso proprio pra quem tem comodo
 *      vazio de proposito (a oficina do protagonista guarda tres comodos de
 *      expansao que so mobiliam depois da compra);
 *   2. VARIEDADE: quantas pecas DISTINTAS o interior usa. Vinte copias da mesma
 *      gondola tem densidade boa e leitura ruim;
 *   3. COMODO VAZIO: todo comodo com area util tem ao menos uma peca, tirando
 *      corredor (que e passagem) e os comodos de expansao.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPAS } from '../src/game/mapas.ts';

const url = (c) => new URL(c, import.meta.url);
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));

let conferencias = 0;
const ok = (mensagem, condicao) => { assert(condicao, mensagem); conferencias += 1; };

/** Piso de densidade (pecas por 100 tiles) e de variedade, por interior. */
const MINIMO = {
  // A oficina tem os tres comodos de expansao vazios ate a compra: 21 dos 748
  // tiles dela sao comodo que ainda nao existe pro jogador.
  oficina: { densidade: 5.2, variedade: 20 },
  // Salao comercial: sao caixas de uma sala so, e a mobilia e o produto.
  mercado: { densidade: 9, variedade: 16 },
  academia: { densidade: 9.5, variedade: 14 },
  // Predios publicos de duas a quatro salas.
  biblioteca: { densidade: 6.5, variedade: 14 },
  escola: { densidade: 6, variedade: 10 },
  // Mistos: metade do interior e moradia do dono.
  bar: { densidade: 7, variedade: 12 },
  farmacia: { densidade: 7, variedade: 12 },
};
/** Residencia: o padrao, medido no que as casas ja entregavam. */
const PADRAO = { densidade: 6, variedade: 14 };
/** Comodo que pode ficar sem peca. */
const PODE_FICAR_VAZIO = new Set(['corredor', 'deposito', 'estudio', 'garagem']);

const interiores = Object.values(MAPAS).filter((def) => !def.externo && !def.chave.startsWith('represa'));
ok(`os 23 interiores urbanos estao no registro (${interiores.length})`, interiores.length === 23);

const relatorio = [];
for (const def of interiores) {
  const mapa = JSON.parse(readFileSync(url(`../public/assets/tilemaps/${def.chave}.json`)));
  const moveis = mapa.layers.find((c) => c.name === 'moveis')?.objects ?? [];
  const comodos = mapa.layers.find((c) => c.name === 'comodos')?.objects ?? [];
  const area = mapa.width * mapa.height;
  const densidade = (moveis.length / area) * 100;
  const distintas = new Set(moveis.map((o) => `${props(o).atlas}:${props(o).frame}`)).size;
  const minimo = MINIMO[def.chave] ?? PADRAO;

  ok(
    `${def.chave}: densidade ${densidade.toFixed(2)} peca(s)/100 tiles (minimo ${minimo.densidade})`,
    densidade >= minimo.densidade,
  );
  ok(
    `${def.chave}: ${distintas} pecas distintas (minimo ${minimo.variedade})`,
    distintas >= minimo.variedade,
  );

  // comodo vazio: a base de cada peca cai em algum comodo?
  const T = mapa.tilewidth;
  for (const comodo of comodos) {
    if (PODE_FICAR_VAZIO.has(comodo.name)) continue;
    const x0 = comodo.x / T; const y0 = comodo.y / T;
    const x1 = x0 + comodo.width / T; const y1 = y0 + comodo.height / T;
    const dentro = moveis.filter((o) => {
      const tx = o.x / T; const ty = o.y / T;
      return tx >= x0 - 1 && tx <= x1 + 1 && ty >= y0 - 1 && ty <= y1 + 1;
    });
    ok(`${def.chave}: o comodo "${comodo.name}" tem mobilia (${dentro.length})`, dentro.length > 0);
  }

  relatorio.push({ chave: def.chave, area, moveis: moveis.length, densidade: Number(densidade.toFixed(2)), distintas, comodos: comodos.length });
}

const media = relatorio.reduce((s, r) => s + r.densidade, 0) / relatorio.length;
const pior = relatorio.reduce((a, b) => (a.densidade <= b.densidade ? a : b));
console.log(
  `[interiores] ${conferencias} conferencias: ${relatorio.length} interiores, `
  + `densidade media ${media.toFixed(2)} peca(s)/100 tiles, menor "${pior.chave}" (${pior.densidade})`,
);

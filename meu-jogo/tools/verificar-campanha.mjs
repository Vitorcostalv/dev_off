import assert from 'node:assert/strict';
import { CENAS_CAMPANHA, cenaPendente, cenaNoContexto, concluirCena, motivoEspera, viuCena } from '../src/game/campanha.ts';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { SistemaArquivo } from '../src/game/fichas.ts';
import { SistemaMissoesNpc } from '../src/game/missoesNpc.ts';
import { salaMemoria, bloqueadoNaMemoria } from '../src/game/profundezas.ts';
import { normalizeSave } from '../src/game/SaveMigration.ts';

const c = { dia: 0, mapa: 'bairro', worldEvents: new SistemaWorldEvents(), arquivo: new SistemaArquivo(), missoesNpc: new SistemaMissoesNpc() };
assert.equal(new Set(CENAS_CAMPANHA.map(s => s.id)).size, CENAS_CAMPANHA.length);
assert.equal(cenaPendente(c).id, 'prologo');
assert(!concluirCena(c, 'final'));
assert.equal(cenaNoContexto(c), null);
assert(concluirCena(c, 'prologo'));
assert(!concluirCena(c, 'prologo'));
c.mapa = 'oficina';
assert.equal(cenaNoContexto(c), null); // primeiro dia, antes das caixas
c.dia = 1;
assert.equal(cenaNoContexto(c).id, 'caixas');
for (const s of CENAS_CAMPANHA.slice(1)) {
  c.dia = Math.max(c.dia + 1, s.dia ?? 0);
  if (s.missao) { assert(motivoEspera(c, s)); c.missoesNpc.iniciar(s.missao); c.missoesNpc.concluir(s.missao); }
  if (s.ficha) { assert(motivoEspera(c, s)); c.arquivo.coletar(s.ficha); }
  if (s.id === 'final') {
    assert(motivoEspera(c, s)); c.worldEvents.definir('campanha:profundidade', 200);
  }
  assert.equal(motivoEspera(c, s), null, s.id);
  if (s.npc) {
    assert.equal(cenaNoContexto(c, 'ninguem'), null);
    assert.equal(cenaNoContexto(c, s.npc).id, s.id);
  }
  assert(concluirCena(c, s.id), s.id);
  const salvo = normalizeSave({ worldEvents: c.worldEvents.serializar() });
  c.worldEvents.restaurar(salvo.worldEvents);
  assert(viuCena(c, s.id));
}
assert.equal(cenaPendente(c), null);
assert(!concluirCena(c, 'epilogo'));

// Uma passagem fisicamente alcançável para documento, vestígio e ambas escadas,
// em TODAS as salas, usando a mesma colisão que o jogador.
for (let andar = 51; andar <= 200; andar++) {
  const sala = salaMemoria(andar);
  assert.deepEqual(sala, salaMemoria(andar));
  const fila = [[48, 184]], visitados = new Set(['48,184']);
  for (let i = 0; i < fila.length; i++) {
    const [x, y] = fila[i];
    for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!visitados.has(k) && !bloqueadoNaMemoria(sala, nx, ny)) { visitados.add(k); fila.push([nx, ny]); }
    }
  }
  for (const [tx, ty] of [[96, 68], [64, 120], [428, 60]]) assert(fila.some(([x, y]) => Math.hypot(x - tx, y - ty) < 10), `Acesso ${andar}:${tx},${ty}`);
  if (andar >= 151) assert.equal(sala.ameacas, 0);
}
console.log(`Campanha: ${CENAS_CAMPANHA.length} cenas, pré-requisitos, ordem, save e 150 salas alcançáveis passaram.`);

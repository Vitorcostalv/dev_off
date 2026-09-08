import assert from 'node:assert/strict';
import { SistemaCidade, PROJETOS_CIDADE, atividadesComEmprego, atividadeComEmprego } from '../src/game/cidade.ts';
import { MORADORES, atividadeAtual } from '../src/game/moradores.ts';
import { NPCS, acoesDeAtividades } from '../src/game/npcs.ts';
import { SistemaRotinasNpc } from '../src/game/rotinasNpc.ts';
import { feedAte } from '../src/game/blog.ts';
import { ListaRolavel } from '../src/pc/listaRolavel.ts';

for (const valor of [undefined, null, 42, 'padaria', [], [null, 42, 'desconhecido', '__proto__', 'padaria']]) {
  const cidade = new SistemaCidade();
  cidade.restaurar({ construidos: valor, funcionarios: valor });
  assert.equal(cidade.construido('padaria'), Array.isArray(valor) && valor.includes('padaria'));
}
const cidade = new SistemaCidade();
cidade.restaurar({ construidos: ['padaria'], funcionarios: [null, 42, ['padaria'], ['padaria', 'invalido'], ['padaria', 'joao']] });
assert.equal(cidade.funcionario('padaria'), 'joao');
const copia = new SistemaCidade(); copia.restaurar(cidade.serializar());
assert.deepEqual(copia.serializar(), cidade.serializar());

let combinacoes = 0;
for (const projeto of Object.values(PROJETOS_CIDADE)) for (const id of projeto.candidatos) {
  const cidade = new SistemaCidade(); cidade.construir(projeto.id); cidade.atribuir(projeto.id, id);
  const morador = MORADORES[id];
  for (let dia = 0; dia < 7; dia++) {
    const atividades = atividadesComEmprego(cidade, morador, dia);
    if (dia >= 5) { assert.equal(atividades, null); continue; }
    const motor = new SistemaRotinasNpc();
    motor.definirSubstituicaoDeRotina(def => def.id === id ? acoesDeAtividades(atividades) : null);
    for (let minuto = 0; minuto <= 22 * 60; minuto++) {
      motor.atualizar(dia, minuto, 0);
      if (minuto >= 480 && minuto < 1020) {
        const npc = motor.porId(id);
        assert.equal(npc.mapaAtual, projeto.mapa, `${id} mapa às ${minuto}`);
        assert.equal(npc.dentro, null);
        assert.equal(npc.x, projeto.posto.x + 0.5);
        assert.equal(npc.y, projeto.posto.y + 0.5);
        const fala = atividadeComEmprego(cidade, morador, dia, minuto, atividadeAtual(morador, dia, minuto));
        assert.equal(fala.inicio, 480); assert.equal(fala.fim, 1020);
      }
      if (minuto === 479 || minuto === 1020) {
        const fala = atividadeComEmprego(cidade, morador, dia, minuto, atividadeAtual(morador, dia, minuto));
        assert.deepEqual(fala, atividadeAtual(morador, dia, minuto));
      }
    }
    assert.equal(NPCS[id].mapa, morador.mapaResidencia);
  }
  combinacoes++;
}
for (let dia = 0; dia < 30; dia++) {
  for (const minuto of [0, 360, 480, 720, 1080, 1439]) {
    const feed = feedAte(dia, minuto);
    assert.deepEqual(feed, feedAte(dia, minuto));
    assert(feed.every(post => post.dia < dia || post.minuto <= minuto));
  }
  for (const post of feedAte(dia, 1439).filter(p => p.dia === dia)) {
    assert(!feedAte(dia, post.minuto - 1).some(p => p.dia === dia && p.npcId === post.npcId));
    assert(feedAte(dia, post.minuto).some(p => p.dia === dia && p.npcId === post.npcId));
  }
}
for (const total of [0, 1, 5, 8, 100]) {
  const lista = new ListaRolavel(); lista.configurar(total, 5);
  for (let i = 0; i < total; i++) { lista.selecionar(i); assert(lista.visivel(i)); }
  lista.selecionar(-1); assert.equal(lista.cursor, 0);
  lista.selecionar(total + 100); assert.equal(lista.cursor, Math.max(0, total - 1));
  lista.configurar(1, 5); assert.equal(lista.topo, 0);
}
console.log(`[overhaul] save de cidade, ${combinacoes} empregos × 5 dias, mapas runtime, blog e viewport: passou`);

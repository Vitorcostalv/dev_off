import assert from 'node:assert/strict';
import { createDefaultSave, migrateSave, normalizeSave, validateSave } from '../src/game/SaveMigration.ts';
import { salvar, carregar, snapshots, restaurarSnapshot, apagar } from '../src/game/save.ts';
const memory = new Map(); let falhar = '';
globalThis.localStorage = {
  getItem: k => memory.get(k) ?? null,
  setItem: (k, v) => { if (k === falhar) throw Error('quota simulada'); memory.set(k, v); },
  removeItem: k => memory.delete(k),
};
const key = 'meu-jogo:save';
const base = createDefaultSave(); assert(validateSave(base));
const legado = { ...base, versao: 6, dinheiro: 123456, dia: 14, minutos: 900,
  inventario: [{ id: 'cabo_usb', qtd: 2 }],
  cidade: { construidos: ['padaria'], funcionarios: [['padaria', 'joao']] },
  arquivo: [1, 10, 50], worldEvents: { flags: { testeNarrativa: true }, falasVistas: ['fala1'] },
  relacoes: { scores: [['edu', 3]], interagidos: ['edu'], conversas: [['edu', 14]], presentes: [] },
};
const original = JSON.stringify(legado); memory.set(key, original);
const atual = carregar(); assert(validateSave(atual)); assert.equal(atual.versao, 7);
assert.equal(atual.dinheiro, legado.dinheiro); assert.equal(atual.dia, 14);
assert.deepEqual(atual.cidade, legado.cidade); assert.deepEqual(atual.arquivo, legado.arquivo);
assert.deepEqual(atual.worldEvents, legado.worldEvents); assert.equal(atual.inventario[0].qtd, 2);
assert.equal(snapshots()[0].bruto, original);
assert.deepEqual(carregar(), atual); assert.deepEqual(normalizeSave(atual), atual);
for (const campo of Object.keys(base).filter(k => !['versao'].includes(k))) {
  for (const ruim of [null, 42, 'errado', [], {}, [null, 42, {}, '__proto__']]) {
    const reparado = migrateSave({ ...legado, [campo]: ruim });
    assert(reparado, campo); assert(validateSave(reparado), `normalizacao de ${campo}`);
    if (campo !== 'dinheiro') assert.equal(reparado.dinheiro, legado.dinheiro);
  }
}
assert.equal(migrateSave(null), null); assert.equal(migrateSave({ versao: 8 }), null);
const futuro = JSON.stringify({ ...base, versao: 8 }); memory.set(key, futuro);
assert.equal(carregar(), null); assert.equal(salvar(base), false); assert.equal(memory.get(key), futuro);
for (const etapa of [key + ':backups', key + ':pending', key]) {
  memory.clear(); memory.set(key, original); falhar = etapa;
  assert.equal(salvar({ ...base, dinheiro: 999 }), false); assert.equal(memory.get(key), original);
  assert.equal(carregar().dinheiro, legado.dinheiro); assert.equal(memory.get(key), original);
  falhar = '';
}
memory.clear(); memory.set(key, original);
assert(salvar({ ...base, dinheiro: 999 })); assert(restaurarSnapshot(0)); assert.equal(carregar().dinheiro, legado.dinheiro);
assert(apagar()); assert.equal(memory.get(key), undefined); assert(snapshots().length > 0);
memory.set(key, '{invalido'); assert.equal(carregar(), null); assert.equal(memory.get(key), '{invalido');
console.log('[save] v6 -> v7, reparo por campo, idempotencia, backups, restauracao e falhas de escrita: passou');

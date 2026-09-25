import assert from 'node:assert/strict';
import { AtividadesRurais, RECEITAS, fabricar } from '../src/game/atividadesRurais.ts';
import { Inventario, ITENS } from '../src/game/inventario.ts';
import { Carteira } from '../src/game/dinheiro.ts';
import { SistemaClima } from '../src/game/clima.ts';
const rural = new AtividadesRurais(), inv = new Inventario(), carteira = new Carteira(), clima = new SistemaClima();
for (const r of RECEITAS) { assert(ITENS[r.produto]); for (const [id] of r.ingredientes) assert(ITENS[id], id); }
const antes = carteira.saldo;
rural.plantar('canteiro_1', 'cenoura', 0, carteira); assert.equal(carteira.saldo, antes - 300);
rural.plantar('canteiro_1', 'cenoura', 0, carteira); assert.equal(carteira.saldo, antes - 300);
for (let d = 0; d < 3; d++) { rural.regar('canteiro_1', d); rural.avancar(d + 1, clima); }
assert.equal(rural.plantio('canteiro_1').crescido, 3);
const copia = new AtividadesRurais(); copia.restaurar(rural.serializar()); assert.deepEqual(copia.serializar(), rural.serializar());
rural.colher('canteiro_1', inv); rural.colher('canteiro_1', inv); assert.equal(inv.contar('cenoura'), 3);
rural.coletar('madeira_1', 3, inv); rural.coletar('madeira_1', 3, inv); assert.equal(inv.contar('madeira'), 3);
rural.coletar('madeira_1', 5, inv); assert.equal(inv.contar('madeira'), 6);
inv.adicionar('cabo_usb', 2); fabricar('lanterna', inv); assert.equal(inv.contar('lanterna_manutencao'), 1); assert.equal(inv.contar('cabo_usb'), 0);
fabricar('lanterna', inv); assert.equal(inv.contar('lanterna_manutencao'), 1);
rural.plantar('canteiro_2', 'tomate', 1, carteira); rural.avancar(1e12, clima); assert(rural.plantio('canteiro_2').seco);
const dia = rural.plantio('canteiro_2').ultimoDia; rural.avancar(0, clima); assert.equal(rural.plantio('canteiro_2').ultimoDia, dia);
console.log('[rural] cultivo, duplicacao, fabricacao, persistencia e salto extremo: passou');

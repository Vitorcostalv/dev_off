import assert from 'node:assert/strict';
import { dataDoDia } from '../src/game/calendario.ts';
import { SistemaClima, CLIMAS, intensidadeNoturna } from '../src/game/clima.ts';
import { GameEventBus } from '../src/game/GameEvents.ts';
import { Progressao } from '../src/game/progressao.ts';
import { Preferencias } from '../src/game/settings.ts';
for (let dia = 0; dia < 500; dia++) {
  const d = dataDoDia(dia); assert(d.diaEstacao >= 1 && d.diaEstacao <= 28); assert.equal(d.diaSemana, dia % 7);
  assert.equal(d.ano, Math.floor(dia / 112) + 1);
  const a = new SistemaClima(), b = new SistemaClima();
  assert.equal(a.paraDia(dia), b.paraDia(dia)); assert(CLIMAS.includes(a.paraDia(dia)));
  a.definir(dia, 'Temporal'); b.restaurar(a.serializar()); assert.equal(b.paraDia(dia), 'Temporal');
}
assert.equal(dataDoDia(28).estacao, 1); assert.equal(dataDoDia(112).ano, 2);
assert.equal(intensidadeNoturna(720), 0); assert.equal(intensidadeNoturna(180), 1);
assert(intensidadeNoturna(1100) < intensidadeNoturna(1200));
const bus = new GameEventBus(), p = new Progressao(); let unlocked = 0;
const c = { dia: 6, minuto: 180, itens: ['teclado_preto', 'mouse_usb', 'monitor_lcd', ...Array.from({ length: 17 }, (_, i) => `item${i}`)], conhecidos: 33, totalNpcs: 33 };
bus.on('ACHIEVEMENT_UNLOCKED', () => unlocked++); p.conectar(bus, () => c);
bus.emit('ITEM_ADDED', { id: 'monitor_lcd', quantidade: 1 });
bus.emit('SHOP_PURCHASE', { id: 'teclado_preto', total: 100000, loja: 'loja_mercado', eletronico: true });
bus.emit('JOB_COMPLETED', { id: 'vaga' }); bus.emit('TIME_CHANGED', { dia: 6, minuto: 180 });
bus.emit('TRASH_EMPTIED', { quantidade: 1 }); bus.emit('MINIGAME_COMPLETED', { id: 'memoria' });
assert.equal(p.total, 10); assert.equal(unlocked, 10);
bus.emit('ITEM_ADDED', { id: 'monitor_lcd', quantidade: 1 }); assert.equal(unlocked, 10);
const copia = new Progressao(); copia.restaurar(p.serializar()); assert.deepEqual(copia.serializar(), p.serializar());
for (const bad of [null, 42, 'x', [], {}]) { copia.restaurar(bad); assert.equal(copia.total, 0); }
const prefs = new Preferencias(); prefs.restaurar({ master: 9, tempo: -1, qualidade: 'ultra', particulas: false });
assert.equal(prefs.valores.master, 1); assert.equal(prefs.valores.tempo, 1); assert.equal(prefs.valores.qualidade, 'normal'); assert.equal(prefs.valores.particulas, false);
console.log('[vida cotidiana] 500 dias, clima persistente, 10 conquistas, eventos e preferencias: passou');

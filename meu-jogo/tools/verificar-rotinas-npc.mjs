import { readFileSync } from 'node:fs';
import { SistemaRotinasNpc } from '../src/game/rotinasNpc.ts';

const mapa = JSON.parse(readFileSync(new URL('../public/assets/tilemaps/farm.json', import.meta.url)));
const objetos = mapa.layers.find((camada) => camada.name === 'objetos');
const bloqueados = new Set();
for (const tileset of mapa.tilesets) {
  for (const tile of tileset.tiles ?? []) {
    if ((tile.properties ?? []).some((p) => p.name === 'collides' && p.value === true)) {
      bloqueados.add(tileset.firstgid + tile.id);
    }
  }
}

function livre(x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= mapa.width || ty >= mapa.height) return false;
  return !bloqueados.has((objetos.data[ty * mapa.width + tx] ?? 0) & 0x1fffffff);
}

const sistema = new SistemaRotinasNpc();
const registros = new Map();
for (let minuto = 6 * 60; minuto <= 19 * 60; minuto++) {
  for (let amostra = 0; amostra < 10; amostra++) {
    sistema.atualizar(0, minuto, 100);
    for (const npc of sistema.todos) {
      if (npc.visivel && !livre(npc.x, npc.y)) {
        throw new Error(`${npc.id} entrou em tile bloqueado as ${minuto}: ${npc.x},${npc.y}`);
      }
    }
  }
  if ([8 * 60, 9 * 60, 10 * 60, 12 * 60 + 40, 13 * 60, 18 * 60, 19 * 60].includes(minuto)) {
    registros.set(minuto, sistema.todos.map((npc) => ({
      id: npc.id, x: +npc.x.toFixed(1), y: +npc.y.toFixed(1), dentro: npc.dentro,
    })));
  }
}

const edu = sistema.porId('edu');
const mari = sistema.porId('mari');
if (edu?.dentro !== 'casa_2') throw new Error('Edu nao voltou para casa apos as 18:00');
if (mari?.dentro !== 'casa_3') throw new Error('Mari nao voltou para casa perto das 13:00');
const mariDez = registros.get(10 * 60).find((npc) => npc.id === 'mari');
if (mariDez.dentro !== 'academia') throw new Error('Mari nao entrou na academia');

console.log('[rotinas] dia simulado sem tiles bloqueados; Edu e Mari retornaram para casa');
for (const [minuto, estados] of registros) {
  const hora = `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;
  console.log(`  ${hora}`, JSON.stringify(estados));
}

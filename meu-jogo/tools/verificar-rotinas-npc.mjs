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
const alcanceEdu = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
const estadosAcademiaMari = { andando: false, parada: false, posicoes: new Set() };
const transicoesPorta = {
  eduAndouDentro: false, eduSaiuNaPorta: false,
  mariAndouDentro: false, mariSaiuNaPorta: false,
};
for (let minuto = 6 * 60; minuto <= 19 * 60; minuto++) {
  for (let amostra = 0; amostra < 10; amostra++) {
    sistema.atualizar(0, minuto, 100);
    for (const npc of sistema.todos) {
      if (npc.visivel && !livre(npc.x, npc.y)) {
        throw new Error(`${npc.id} entrou em tile bloqueado as ${minuto}: ${npc.x},${npc.y}`);
      }
      if (npc.id === 'edu' && npc.visivel) {
        alcanceEdu.minX = Math.min(alcanceEdu.minX, npc.x);
        alcanceEdu.maxX = Math.max(alcanceEdu.maxX, npc.x);
        alcanceEdu.minY = Math.min(alcanceEdu.minY, npc.y);
        alcanceEdu.maxY = Math.max(alcanceEdu.maxY, npc.y);
      }
      if (npc.id === 'mari' && npc.dentro === 'academia' && npc.acaoAtual === 'vagar_rota') {
        estadosAcademiaMari[npc.movendo ? 'andando' : 'parada'] = true;
        estadosAcademiaMari.posicoes.add(`${npc.x.toFixed(1)},${npc.y.toFixed(1)}`);
      }
      if (npc.id === 'edu' && minuto === 8 * 60) {
        if (npc.dentro === 'casa_2' && npc.movendo) transicoesPorta.eduAndouDentro = true;
        if (npc.dentro === null && Math.hypot(npc.x - 43.5, npc.y - 16.5) < 0.3) {
          transicoesPorta.eduSaiuNaPorta = true;
        }
      }
      if (npc.id === 'mari' && minuto >= 12 * 60 + 40 && minuto <= 12 * 60 + 42) {
        if (npc.dentro === 'academia' && npc.movendo) transicoesPorta.mariAndouDentro = true;
        if (npc.dentro === null && Math.hypot(npc.x - 53.5, npc.y - 35.5) < 0.3) {
          transicoesPorta.mariSaiuNaPorta = true;
        }
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
if (!estadosAcademiaMari.andando || !estadosAcademiaMari.parada || estadosAcademiaMari.posicoes.size < 8) {
  throw new Error('Mari nao alternou caminhada e pausa dentro da academia');
}
if (alcanceEdu.minX > 23 || alcanceEdu.maxX < 98 || alcanceEdu.minY > 22 || alcanceEdu.maxY < 70) {
  throw new Error(`Edu nao percorreu a cidade inteira: ${JSON.stringify(alcanceEdu)}`);
}
if (Object.values(transicoesPorta).some((valor) => !valor)) {
  throw new Error(`transicao pelas portas incompleta: ${JSON.stringify(transicoesPorta)}`);
}

console.log('[rotinas] cidade percorrida; caminhada, pausas e transicoes por portas validadas');
for (const [minuto, estados] of registros) {
  const hora = `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;
  console.log(`  ${hora}`, JSON.stringify(estados));
}

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_MAPAS = join(RAIZ, 'public', 'assets', 'tilemaps');
const CASAS = Array.from({ length: 6 }, (_, i) => `casa_${i + 1}`);
const SPAWNS = {
  farm: [60, 45],
  ...Object.fromEntries(CASAS.map((casa) => [casa, [8, 10]])),
  mercado: [11, 13],
  academia: [9, 10],
  bar: [9, 10],
  farmacia: [9, 10],
};

function lerMapa(nome) {
  return JSON.parse(readFileSync(join(DIR_MAPAS, `${nome}.json`), 'utf8'));
}

function camada(mapa, nome) {
  const encontrada = mapa.layers.find((item) => item.name === nome);
  if (!encontrada) throw new Error(`${nome}: camada "${nome}" ausente`);
  return encontrada;
}

function props(objeto) {
  return Object.fromEntries((objeto.properties ?? []).map((p) => [p.name, p.value]));
}

function gidsComColisao(mapa) {
  const resultado = new Set();
  for (const tileset of mapa.tilesets ?? []) {
    for (const tile of tileset.tiles ?? []) {
      if ((tile.properties ?? []).some((p) => p.name === 'collides' && p.value === true)) {
        resultado.add(tileset.firstgid + tile.id);
      }
    }
  }
  return resultado;
}

function floodFill(mapa, spawn) {
  const objetos = camada(mapa, 'objetos');
  const bloqueados = gidsComColisao(mapa);
  const chave = (x, y) => `${x},${y}`;
  const livre = (x, y) =>
    x >= 0 && y >= 0 && x < mapa.width && y < mapa.height &&
    !bloqueados.has((objetos.data[y * mapa.width + x] ?? 0) & 0x1fffffff);
  if (!livre(...spawn)) throw new Error(`spawn ${spawn.join(',')} bloqueado`);

  const visitados = new Set([chave(...spawn)]);
  const fila = [spawn];
  for (let i = 0; i < fila.length; i++) {
    const [x, y] = fila[i];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = chave(nx, ny);
      if (livre(nx, ny) && !visitados.has(k)) {
        visitados.add(k);
        fila.push([nx, ny]);
      }
    }
  }
  return { visitados, livre };
}

function tileDoObjeto(mapa, objeto) {
  return [Math.floor((objeto.x ?? 0) / mapa.tilewidth), Math.floor((objeto.y ?? 0) / mapa.tileheight)];
}

function adjacenteAlcancavel(mapa, objeto, flood) {
  const [x, y] = tileDoObjeto(mapa, objeto);
  return [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    .some(([tx, ty]) => flood.visitados.has(`${tx},${ty}`));
}

function verificarInterior(nome) {
  const mapa = lerMapa(nome);
  const flood = floodFill(mapa, SPAWNS[nome]);
  const interativos = camada(mapa, 'interativos').objects ?? [];
  const saidas = interativos.filter((obj) => (obj.class || obj.type) === 'porta');
  if (saidas.length !== 1 || !adjacenteAlcancavel(mapa, saidas[0], flood)) {
    throw new Error(`${nome}: porta de saida nao esta alcancavel`);
  }
  if (CASAS.includes(nome)) {
    const camas = interativos.filter((obj) => (obj.class || obj.type) === 'cama');
    if (camas.length !== 1) throw new Error(`${nome}: esperava 1 cama interativa, achei ${camas.length}`);
    if (!adjacenteAlcancavel(mapa, camas[0], flood)) throw new Error(`${nome}: cama nao esta alcancavel`);
  }
}

function verificarZonasDaFazenda() {
  const mapa = lerMapa('farm');
  const flood = floodFill(mapa, SPAWNS.farm);
  const interativos = camada(mapa, 'interativos').objects ?? [];
  const zonas = camada(mapa, 'zonas').objects ?? [];
  const esperadas = zonas.map((obj) => obj.name);
  for (const casa of CASAS) {
    if (!esperadas.includes(casa)) throw new Error(`farm: zona "${casa}" ausente`);
  }
  if (esperadas.length < CASAS.length + 3) {
    throw new Error(`farm: esperava ao menos 9 lotes, achei ${esperadas.length}`);
  }

  for (const nome of esperadas) {
    const zona = zonas.find((obj) => obj.name === nome);
    if (!zona) throw new Error(`farm: zona "${nome}" ausente`);
    if (!props(zona).mapaInterior) {
      // lote sem interior (a praca): basta ter algum tile alcancavel dentro
      const x0 = Math.floor(zona.x / mapa.tilewidth);
      const y0 = Math.floor(zona.y / mapa.tileheight);
      const x1 = x0 + Math.floor(zona.width / mapa.tilewidth);
      const y1 = y0 + Math.floor(zona.height / mapa.tileheight);
      let alcancavel = false;
      for (let y = y0; y < y1 && !alcancavel; y++) {
        for (let x = x0; x < x1; x++) alcancavel ||= flood.visitados.has(`${x},${y}`);
      }
      if (!alcancavel) throw new Error(`farm: lote "${nome}" nao esta alcancavel`);
      continue;
    }
    const destino = props(zona).mapaInterior;
    const porta = interativos.find((obj) =>
      (obj.class || obj.type) === 'porta' && props(obj).destino === destino);
    if (!porta || !adjacenteAlcancavel(mapa, porta, flood)) {
      throw new Error(`farm: porta de "${nome}" nao esta alcancavel`);
    }
  }
  const pickups = interativos.filter((obj) => (obj.class || obj.type) === 'item');
  if (pickups.length !== 2) throw new Error(`farm: esperava 2 pickups, achei ${pickups.length}`);
  if (!pickups.every((obj) => props(obj).itemId === 'cabo_usb' && adjacenteAlcancavel(mapa, obj, flood))) {
    throw new Error('farm: pickups de empilhamento invalidos ou inalcançaveis');
  }
  return {
    total: esperadas.length,
    interiores: esperadas.filter((nome) => {
      const zona = zonas.find((obj) => obj.name === nome);
      return Boolean(props(zona).mapaInterior);
    }),
  };
}

const { total, interiores } = verificarZonasDaFazenda();
for (const nome of interiores) verificarInterior(nome);
console.log(
  `[verificacao] ${total}/${total} lotes alcancaveis; ` +
    `${interiores.length} interiores conferidos (${interiores.join(', ')}); ` +
    `${CASAS.length}/${CASAS.length} casas com cama interativa alcancavel; 2/2 pickups`,
);

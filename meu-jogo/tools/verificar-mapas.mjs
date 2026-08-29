import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROP_PORTA_NPC, tileBloqueia } from '../src/game/colisao.ts';
import { MAPAS } from '../src/game/mapas.ts';
import { EXPANSOES, buscarExpansao } from '../src/game/casa.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_MAPAS = join(RAIZ, 'public', 'assets', 'tilemaps');
/**
 * As cinco casas de NPC do Mapa 1. A `casa_1` NAO entra: nesta leva o
 * protagonista mudou pro Mapa 2 e o lote virou `vago` — predio de pe, porta
 * fechada, sem interior.
 */
const CASAS = ['casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6'];
/** Predios MISTOS: casa + comercio no mesmo interior, com cama na area privada. */
const MISTOS = ['bar', 'farmacia'];
/** Todo lote do Mapa 1 onde um NPC mora — o que precisa de cama interativa. */
const MORADIAS = [...CASAS, ...MISTOS];
/** Comodos que toda casa de NPC multi-comodo tem de oferecer ao jogador. */
const COMODOS_DE_CASA = ['quarto', 'sala', 'cozinha', 'banheiro'];
/**
 * Comodos que a casa+oficina do protagonista tem de oferecer DE SAIDA, sem
 * comprar nada: os quatro de moradia mais o de trabalho.
 */
const COMODOS_DA_OFICINA = ['quarto', 'sala', 'cozinha', 'banheiro', 'oficina'];
/** Usos de lote validos — `vago` entrou nesta leva. */
const USOS = ['moradia', 'comercio', 'misto', 'praca', 'vago'];
/** Os mapas externos, na ordem em que o jogador os encontra. */
const EXTERNOS = Object.values(MAPAS).filter((def) => def.externo);

function lerMapa(nome) {
  return JSON.parse(readFileSync(join(DIR_MAPAS, `${nome}.json`), 'utf8'));
}

function camada(mapa, nome) {
  const encontrada = mapa.layers.find((item) => item.name === nome);
  if (!encontrada) throw new Error(`${nome}: camada "${nome}" ausente`);
  return encontrada;
}

function objetosDe(mapa, nome) {
  return mapa.layers.find((item) => item.name === nome)?.objects ?? [];
}

function props(objeto) {
  return Object.fromEntries((objeto.properties ?? []).map((p) => [p.name, p.value]));
}

/**
 * Gids que bloqueiam `quem` ('jogador' ou 'npc'). Sao dois conjuntos DIFERENTES
 * sobre o mesmo tileset: a porta somente-NPC entra no do jogador e fica de fora
 * no do NPC. Ver src/game/colisao.ts.
 */
function gidsQueBloqueiam(mapa, quem) {
  const resultado = new Set();
  for (const tileset of mapa.tilesets ?? []) {
    for (const tile of tileset.tiles ?? []) {
      if (tileBloqueia(tile.properties ?? [], quem)) resultado.add(tileset.firstgid + tile.id);
    }
  }
  return resultado;
}

/** Gids marcados como porta somente-NPC — usados so pra contar/relatar. */
function gidsDePortaNpc(mapa) {
  const resultado = new Set();
  for (const tileset of mapa.tilesets ?? []) {
    for (const tile of tileset.tiles ?? []) {
      if ((tile.properties ?? []).some((p) => p.name === PROP_PORTA_NPC && p.value === true)) {
        resultado.add(tileset.firstgid + tile.id);
      }
    }
  }
  return resultado;
}

function floodFill(mapa, spawn, quem = 'jogador', tapados = []) {
  const objetos = camada(mapa, 'objetos');
  const bloqueados = gidsQueBloqueiam(mapa, quem);
  const chave = (x, y) => `${x},${y}`;
  // `tapados` sao tiles tratados como parede mesmo estando livres no tilemap:
  // e assim que se confere o estado "expansao ainda nao comprada".
  const tapado = new Set(tapados.map(([x, y]) => chave(x, y)));
  const livre = (x, y) =>
    x >= 0 && y >= 0 && x < mapa.width && y < mapa.height &&
    !tapado.has(chave(x, y)) &&
    !bloqueados.has((objetos.data[y * mapa.width + x] ?? 0) & 0x1fffffff);
  if (!livre(...spawn)) throw new Error(`spawn ${spawn.join(',')} bloqueado para o ${quem}`);

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

/** Retangulo de um objeto de comodo, em tiles. */
function retangulo(mapa, objeto) {
  const [x, y] = tileDoObjeto(mapa, objeto);
  return {
    x,
    y,
    w: Math.round((objeto.width ?? 0) / mapa.tilewidth),
    h: Math.round((objeto.height ?? 0) / mapa.tileheight),
  };
}

function tilesDoRetangulo(r) {
  const lista = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) lista.push(`${x},${y}`);
  return lista;
}

/**
 * Confere um interior. Sao DOIS flood-fills a partir do mesmo tile de entrada:
 * o do jogador (a porta somente-NPC e parede) e o do NPC (ela e passagem).
 *
 * - todo comodo publico tem de ter tile alcancavel pelo JOGADOR;
 * - todo comodo privado tem de ter tile alcancavel pelo NPC e NENHUM tile
 *   alcancavel pelo jogador — e o contrato da area privada dos mistos;
 * - a cama e alcancavel por quem mora nela: pelo jogador quando fica em comodo
 *   publico (as casas), so pelo NPC quando fica no quarto privado (os mistos).
 *
 * O tile de entrada sai do proprio mapa (um acima da porta de saida) e e
 * comparado com o `spawnTile` declarado em src/game/mapas.ts: se o gerador mudar
 * a planta e o jogo nao acompanhar, reprova aqui em vez de largar o jogador
 * dentro de uma parede.
 */
function verificarInterior(nome) {
  const mapa = lerMapa(nome);
  const interativos = camada(mapa, 'interativos').objects ?? [];
  const saidas = interativos.filter((obj) => (obj.class || obj.type) === 'porta');
  if (saidas.length !== 1) {
    throw new Error(`${nome}: esperava 1 porta de saida, achei ${saidas.length}`);
  }
  const [portaX, portaY] = tileDoObjeto(mapa, saidas[0]);
  const spawn = [portaX, portaY - 1];

  const declarado = MAPAS[nome]?.spawnTile;
  if (!declarado) throw new Error(`${nome}: nao existe em MAPAS (src/game/mapas.ts)`);
  if (declarado.x !== spawn[0] || declarado.y !== spawn[1]) {
    throw new Error(
      `${nome}: spawnTile de src/game/mapas.ts e ${declarado.x},${declarado.y}, mas a porta ` +
        `do tilemap pede ${spawn.join(',')}`,
    );
  }

  const jogador = floodFill(mapa, spawn, 'jogador');
  const npc = floodFill(mapa, spawn, 'npc');
  if (!adjacenteAlcancavel(mapa, saidas[0], jogador)) {
    throw new Error(`${nome}: porta de saida nao esta alcancavel`);
  }

  // comodos: a camada e opcional (os saloes de comercio continuam sendo um
  // comodo so, sem divisao interna pra declarar)
  const comodos = objetosDe(mapa, 'comodos').map((obj) => ({
    nome: obj.name,
    privado: props(obj).privado === true,
    ret: retangulo(mapa, obj),
  }));
  const privados = new Set();
  for (const comodo of comodos) {
    const tiles = tilesDoRetangulo(comodo.ret);
    if (comodo.privado) for (const t of tiles) privados.add(t);
    const doNpc = tiles.filter((t) => npc.visitados.has(t));
    const doJogador = tiles.filter((t) => jogador.visitados.has(t));
    if (comodo.privado) {
      if (!doNpc.length) {
        throw new Error(`${nome}: o comodo privado "${comodo.nome}" nao e alcancavel pelo NPC`);
      }
      if (doJogador.length) {
        throw new Error(
          `${nome}: o jogador alcanca ${doJogador.length} tile(s) do comodo PRIVADO ` +
            `"${comodo.nome}" (${doJogador.slice(0, 4).join(' ')})`,
        );
      }
      continue;
    }
    if (!doJogador.length) {
      throw new Error(`${nome}: o comodo "${comodo.nome}" nao e alcancavel pelo jogador`);
    }
  }

  // a casa+oficina do protagonista: os cinco comodos basicos tem de estar
  // acessiveis mesmo com todas as expansoes ainda lacradas. O tilemap traz as
  // expansoes ABERTAS (quem lacra e o jogo, ao carregar), entao aqui basta
  // conferir que os basicos existem e que a camada `expansoes` esta coerente.
  if (nome === 'oficina') {
    const nomes = comodos.map((c) => c.nome);
    const faltando = COMODOS_DA_OFICINA.filter((c) => !nomes.includes(c));
    if (faltando.length) {
      throw new Error(`oficina: faltam os comodos ${faltando.join(', ')}`);
    }
    const expansoes = objetosDe(mapa, 'expansoes');
    if (!expansoes.length) throw new Error('oficina: nenhum comodo de expansao declarado');
    for (const exp of expansoes) {
      const prop = props(exp);
      const comodo = String(prop.comodo ?? exp.name);
      if (!nomes.includes(comodo)) {
        throw new Error(`oficina: a expansao "${comodo}" nao tem comodo correspondente`);
      }
      if (!buscarExpansao(comodo)) {
        throw new Error(`oficina: a expansao "${comodo}" nao existe em EXPANSOES (casa.ts)`);
      }
      if (!Number.isFinite(prop.vaoTx) || !Number.isFinite(prop.vaoTy)) {
        throw new Error(`oficina: a expansao "${comodo}" nao declara o tile do vao`);
      }
      if (!Number.isFinite(prop.gidParede)) {
        throw new Error(`oficina: a expansao "${comodo}" nao declara o gid de parede`);
      }
    }
    if (expansoes.length !== EXPANSOES.length) {
      throw new Error(
        `oficina: ${expansoes.length} expansao(oes) no tilemap contra ${EXPANSOES.length} em casa.ts`,
      );
    }
    // com os vaos tapados, todo comodo BASICO continua alcancavel
    const vaos = expansoes.map((exp) => {
      const prop = props(exp);
      return [Number(prop.vaoTx), Number(prop.vaoTy)];
    });
    const lacrado = floodFill(mapa, spawn, 'jogador', vaos);
    for (const comodo of comodos) {
      if (buscarExpansao(comodo.nome)) continue;
      const alcanca = tilesDoRetangulo(comodo.ret).some((t) => lacrado.visitados.has(t));
      if (!alcanca) {
        throw new Error(
          `oficina: com as expansoes lacradas o comodo "${comodo.nome}" fica inalcancavel`,
        );
      }
    }
    for (const comodo of comodos) {
      if (!buscarExpansao(comodo.nome)) continue;
      const alcanca = tilesDoRetangulo(comodo.ret).some((t) => lacrado.visitados.has(t));
      if (alcanca) {
        throw new Error(
          `oficina: o comodo compravel "${comodo.nome}" ja e alcancavel sem a compra`,
        );
      }
    }
  }

  // as cinco casas de NPC sao multi-comodo e TODOS os comodos sao do jogador
  if (CASAS.includes(nome)) {
    const nomes = comodos.map((c) => c.nome);
    const faltando = COMODOS_DE_CASA.filter((c) => !nomes.includes(c));
    if (faltando.length) {
      throw new Error(`${nome}: faltam os comodos ${faltando.join(', ')} (achei ${nomes.join(', ')})`);
    }
    const trancados = comodos.filter((c) => c.privado).map((c) => c.nome);
    if (trancados.length) {
      throw new Error(`${nome}: casa de NPC nao pode ter comodo privado (${trancados.join(', ')})`);
    }
  }

  // Toda MORADIA precisa de uma cama: as seis casas e os dois mistos. Nas casas
  // ela fica em comodo do jogador; nos mistos, no quarto da area privada, e ai o
  // jogador NAO pode alcancar — quem dorme nela e o dono.
  let camaPrivada = false;
  if (MORADIAS.includes(nome)) {
    const camas = interativos.filter((obj) => (obj.class || obj.type) === 'cama');
    if (camas.length !== 1) throw new Error(`${nome}: esperava 1 cama interativa, achei ${camas.length}`);
    camaPrivada = privados.has(tileDoObjeto(mapa, camas[0]).join(','));
    if (camaPrivada) {
      if (!adjacenteAlcancavel(mapa, camas[0], npc)) {
        throw new Error(`${nome}: a cama do dono nao esta alcancavel pelo NPC`);
      }
      if (adjacenteAlcancavel(mapa, camas[0], jogador)) {
        throw new Error(`${nome}: a cama do dono esta na area privada mas o jogador chega nela`);
      }
    } else if (!adjacenteAlcancavel(mapa, camas[0], jogador)) {
      throw new Error(`${nome}: cama nao esta alcancavel`);
    }
  }

  // Nos mistos a divisao publico/privado tem de ser feita por PORTA SOMENTE-NPC:
  // sem ela o dono ficaria trancado de um lado do proprio predio.
  const objetos = camada(mapa, 'objetos');
  const portasNpc = gidsDePortaNpc(mapa);
  const quantasPortasNpc = objetos.data.filter((gid) => portasNpc.has(gid & 0x1fffffff)).length;
  if (MISTOS.includes(nome)) {
    if (!camaPrivada) throw new Error(`${nome}: a cama do dono deveria estar na area privada`);
    if (!quantasPortasNpc) {
      throw new Error(`${nome}: nenhuma porta somente-NPC ligando o salao a moradia`);
    }
    if (!comodos.some((c) => c.privado)) throw new Error(`${nome}: nenhum comodo privado`);
    const moveis = objetosDe(mapa, 'moveis').length;
    if (moveis < 15) throw new Error(`${nome}: esperava mobilia nos dois ambientes, achei ${moveis}`);
  }

  return {
    nome,
    comodos: comodos.length,
    privados: comodos.filter((c) => c.privado).length,
    portasNpc: quantasPortasNpc,
    jogador: jogador.visitados.size,
    npc: npc.visitados.size,
  };
}

/**
 * Confere um mapa EXTERNO inteiro (Mapa 1, 2 ou 3).
 *
 * O flood-fill sai do spawn declarado em `MAPAS` — no Mapa 1 e o centro da
 * cidade, nos dois novos e o tile em que o jogador cai vindo do mapa vizinho.
 * Dele tem de sair caminho ate:
 *
 *  - algum tile de TODO lote (construido ou reservado);
 *  - a porta de TODO lote que tem interior;
 *  - TODA zona de transicao declarada na camada `bordas`.
 *
 * A checagem de MORADIAS (um lote de moradia por NPC) so vale pro Mapa 1: os
 * lotes residenciais dos mapas 2 e 3 estao reservados de proposito, sem morador.
 */
function verificarMapaExterno(def) {
  const nome = def.chave;
  const mapa = lerMapa(nome);
  const flood = floodFill(mapa, [def.spawnTile.x, def.spawnTile.y]);
  const interativos = camada(mapa, 'interativos').objects ?? [];
  const zonas = camada(mapa, 'zonas').objects ?? [];

  const moradiasDoMapa = [];
  for (const zona of zonas) {
    const uso = props(zona).uso;
    if (!USOS.includes(uso)) {
      throw new Error(`${nome}: lote "${zona.name}" com uso invalido: ${JSON.stringify(uso)}`);
    }
    if (props(zona).moradia !== (uso === 'moradia' || uso === 'misto')) {
      throw new Error(`${nome}: lote "${zona.name}" tem moradia incoerente com o uso "${uso}"`);
    }
    if (uso === 'moradia' || uso === 'misto') moradiasDoMapa.push(zona.name);
  }

  for (const zona of zonas) {
    const destino = props(zona).mapaInterior;
    if (!destino) {
      // lote sem interior (praca, terreno, predio fechado, lote reservado):
      // basta ter algum tile alcancavel dentro dele
      const r = retangulo(mapa, zona);
      if (!tilesDoRetangulo(r).some((t) => flood.visitados.has(t))) {
        throw new Error(`${nome}: lote "${zona.name}" nao esta alcancavel`);
      }
      continue;
    }
    if (!MAPAS[destino]) {
      throw new Error(`${nome}: lote "${zona.name}" aponta pro interior "${destino}", que nao existe em MAPAS`);
    }
    const porta = interativos.find(
      (obj) => (obj.class || obj.type) === 'porta' && props(obj).destino === destino,
    );
    if (!porta || !adjacenteAlcancavel(mapa, porta, flood)) {
      throw new Error(`${nome}: porta de "${zona.name}" nao esta alcancavel`);
    }
  }

  // zonas de transicao: a camada e obrigatoria em mapa externo desta leva
  const bordas = objetosDe(mapa, 'bordas');
  if (!bordas.length) throw new Error(`${nome}: nenhuma zona de transicao na camada "bordas"`);
  for (const borda of bordas) {
    const r = retangulo(mapa, borda);
    if (!tilesDoRetangulo(r).some((t) => flood.visitados.has(t))) {
      throw new Error(`${nome}: a zona de transicao "${borda.name}" nao esta alcancavel`);
    }
  }

  return {
    nome,
    lotes: zonas.length,
    moradias: moradiasDoMapa,
    bordas: bordas.length,
    alcancaveis: flood.visitados.size,
    interiores: zonas
      .filter((zona) => props(zona).mapaInterior)
      .map((zona) => props(zona).mapaInterior),
  };
}

/** So o Mapa 1 tem NPC morador; a lista dele tem de bater com `MORADIAS`. */
function conferirMoradiasDoMapa1(relatorio) {
  const faltando = MORADIAS.filter((n) => !relatorio.moradias.includes(n));
  const sobrando = relatorio.moradias.filter((n) => !MORADIAS.includes(n));
  if (faltando.length || sobrando.length) {
    throw new Error(
      `farm: moradias do mapa divergem das esperadas (falta: ${faltando.join(', ') || '-'}; ` +
        `sobra: ${sobrando.join(', ') || '-'})`,
    );
  }
  for (const nome of MISTOS) {
    if (!relatorio.moradias.includes(nome)) throw new Error(`farm: "${nome}" deveria ser moradia`);
  }
  const mapa = lerMapa('farm');
  const flood = floodFill(mapa, [MAPAS.farm.spawnTile.x, MAPAS.farm.spawnTile.y]);
  const pickups = (camada(mapa, 'interativos').objects ?? []).filter(
    (obj) => (obj.class || obj.type) === 'item',
  );
  if (pickups.length !== 2) throw new Error(`farm: esperava 2 pickups, achei ${pickups.length}`);
  if (!pickups.every((obj) => props(obj).itemId === 'cabo_usb' && adjacenteAlcancavel(mapa, obj, flood))) {
    throw new Error('farm: pickups de empilhamento invalidos ou inalcancaveis');
  }
}

/**
 * As zonas de transicao andam AOS PARES: se do Mapa 1 sai uma pro Mapa 2, do
 * Mapa 2 tem de sair uma de volta pro Mapa 1. Alem disso o ponto de chegada de
 * cada uma tem de cair num tile livre do mapa de destino e FORA da borda de
 * volta — senao o jogador quicaria entre os dois mapas sem conseguir sair.
 */
function verificarBordas() {
  const porMapa = new Map(
    EXTERNOS.map((def) => [def.chave, { def, mapa: lerMapa(def.chave), bordas: [] }]),
  );
  for (const entrada of porMapa.values()) {
    for (const obj of objetosDe(entrada.mapa, 'bordas')) {
      entrada.bordas.push({ nome: obj.name, ret: retangulo(entrada.mapa, obj), ...props(obj) });
    }
  }

  let pares = 0;
  for (const entrada of porMapa.values()) {
    for (const borda of entrada.bordas) {
      const alvo = porMapa.get(borda.destino);
      if (!alvo) {
        throw new Error(`${entrada.def.chave}: "${borda.nome}" aponta pro mapa "${borda.destino}", que nao e externo`);
      }
      const volta = alvo.bordas.find((b) => b.destino === entrada.def.chave);
      if (!volta) {
        throw new Error(`${entrada.def.chave}: "${borda.nome}" nao tem par de volta em "${borda.destino}"`);
      }
      const flood = floodFill(alvo.mapa, [alvo.def.spawnTile.x, alvo.def.spawnTile.y]);
      if (!flood.visitados.has(`${borda.destinoTx},${borda.destinoTy}`)) {
        throw new Error(
          `${entrada.def.chave}: "${borda.nome}" larga o jogador em ` +
            `${borda.destinoTx},${borda.destinoTy} de "${borda.destino}", que nao e alcancavel`,
        );
      }
      const dentroDaVolta =
        borda.destinoTx >= volta.ret.x &&
        borda.destinoTx < volta.ret.x + volta.ret.w &&
        borda.destinoTy >= volta.ret.y &&
        borda.destinoTy < volta.ret.y + volta.ret.h;
      if (dentroDaVolta) {
        throw new Error(
          `${entrada.def.chave}: "${borda.nome}" chega dentro de "${volta.nome}" — o jogador voltaria na hora`,
        );
      }
      pares++;
    }
  }
  return pares;
}

const relatoriosExternos = EXTERNOS.map((def) => verificarMapaExterno(def));
conferirMoradiasDoMapa1(relatoriosExternos.find((r) => r.nome === 'farm'));
const paresDeBorda = verificarBordas();
const interiores = relatoriosExternos.flatMap((r) => r.interiores);
const relatorios = interiores.map((nome) => verificarInterior(nome));
for (const r of relatoriosExternos) {
  console.log(
    `[verificacao] ${r.nome.padEnd(7)} ${String(r.lotes).padStart(2)} lote(s) alcancavel(is), ` +
      `${r.interiores.length} com interior, ${r.bordas} zona(s) de transicao, ` +
      `${r.alcancaveis} tiles alcancaveis`,
  );
}
console.log(
  `[verificacao] ${paresDeBorda} ligacao(oes) entre mapas conferida(s) nos dois sentidos; ` +
    `${interiores.length} interiores conferidos (${interiores.join(', ')})`,
);
for (const r of relatorios) {
  if (!r.comodos) continue;
  console.log(
    `  ${r.nome.padEnd(11)} ${String(r.comodos).padStart(2)} comodos ` +
      `(${r.privados} privado(s), ${r.portasNpc} porta(s) somente-NPC) | ` +
      `jogador alcanca ${String(r.jogador).padStart(3)} tiles, NPC alcanca ${r.npc}`,
  );
}
const comPrivado = relatorios.filter((r) => r.privados);
console.log(
  `[verificacao] area privada CONFIRMADAMENTE inacessivel ao jogador em ` +
    `${comPrivado.length} interior(es): ${comPrivado.map((r) => r.nome).join(', ') || '-'}`,
);
console.log(
  `[verificacao] casa do protagonista: ${EXPANSOES.length} comodo(s) compravel(is) ` +
    `(${EXPANSOES.map((e) => e.id).join(', ')}), lacrados enquanto nao comprados`,
);

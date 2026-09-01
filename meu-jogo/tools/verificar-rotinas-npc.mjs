import { readFileSync } from 'node:fs';
import { SistemaRotinasNpc } from '../src/game/rotinasNpc.ts';
import { DIA_DA_SEMANA, DIAS_DA_SEMANA } from '../src/game/calendario.ts';
import { PROP_PORTA_NPC, tileBloqueia } from '../src/game/colisao.ts';
import {
  LOCAIS_CIDADE,
  MORADIAS,
  MORADIAS_VAGAS,
  NPCS,
  NPCS_DE_PRESENCA_INTERIOR,
} from '../src/game/npcs.ts';
import { MORADORES } from '../src/game/moradores.ts';

const url = (caminho) => new URL(caminho, import.meta.url);
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));

// Arvore e pedra sao SPRITE, nao tile: a colisao delas e uma caixa na base, do
// mesmo tamanho que a FarmScene monta. Sem contar isso a conferencia aprova
// rota que atravessa a mata. Movel ao ar livre (banco de praca, mesa de feira)
// entra pela mesma conta, com a caixa de `MOVEL_CORPO`.
const TRONCO = { largura: 0.56, altura: 0.375 };
const PEDRA = { largura: 0.78, altura: 0.34 };
const PEDRA_COLIDE_ACIMA_DE = 0.45;
const MOVEL_CORPO = { largura: 0.92, altura: 0.5 };

const atlasCache = new Map();
function framesDoAtlas(atlas) {
  if (!atlasCache.has(atlas)) {
    atlasCache.set(
      atlas,
      JSON.parse(readFileSync(url(`../public/assets/sprites/${atlas}.atlas.json`))).frames,
    );
  }
  return atlasCache.get(atlas);
}

/**
 * Grade de colisao de um mapa EXTERNO. Antes havia uma so, do `farm`, porque os
 * NPCs viviam todos nele; hoje cada NPC declara o seu mapa (`DefinicaoNpc.mapa`)
 * e a conferencia precisa da grade dos tres.
 */
function carregarExterno(chave) {
  const mapa = JSON.parse(readFileSync(url(`../public/assets/tilemaps/${chave}.json`)));
  const T = mapa.tilewidth;
  const bloqueados = new Set();
  for (const tileset of mapa.tilesets) {
    for (const tile of tileset.tiles ?? []) {
      if ((tile.properties ?? []).some((p) => p.name === 'collides' && p.value === true)) {
        bloqueados.add(tileset.firstgid + tile.id);
      }
    }
  }
  const solido = new Uint8Array(mapa.width * mapa.height);
  for (const camada of mapa.layers) {
    if (camada.type !== 'tilelayer') continue;
    for (let i = 0; i < camada.data.length; i++) {
      if (bloqueados.has(camada.data[i] & 0x1fffffff)) solido[i] = 1;
    }
  }
  const marcarCorpo = (cx, cy, largura, altura) => {
    for (let py = cy - altura; py < cy; py += 1) {
      for (let px = cx - largura / 2; px < cx + largura / 2; px += 1) {
        const tx = Math.floor(px / T);
        const ty = Math.floor(py / T);
        if (tx >= 0 && ty >= 0 && tx < mapa.width && ty < mapa.height) {
          solido[ty * mapa.width + tx] = 1;
        }
      }
    }
  };
  let corpos = 0;
  const framesPedra = framesDoAtlas('pedras');
  for (const o of mapa.layers.find((c) => c.name === 'flora')?.objects ?? []) {
    const p = props(o);
    if (o.type === 'arvore') {
      if (p.estagio < 2) continue;
      marcarCorpo(o.x, o.y, TRONCO.largura * T, TRONCO.altura * T);
    } else if (o.type === 'pedra') {
      if (p.alturaTiles <= PEDRA_COLIDE_ACIMA_DE) continue;
      const f = framesPedra[`pedra_${p.indice}`].frame;
      const h = p.alturaTiles * T;
      marcarCorpo(o.x, o.y, h * (f.w / f.h) * PEDRA.largura, h * PEDRA.altura);
    } else continue;
    corpos += 1;
  }
  for (const o of mapa.layers.find((c) => c.name === 'moveis')?.objects ?? []) {
    const p = props(o);
    if (p.colide !== true) continue;
    const f = framesDoAtlas(String(p.atlas))[String(p.frame)];
    if (!f) continue;
    const escala = (Number(p.alturaTiles) * T) / f.frame.h;
    marcarCorpo(o.x, o.y, f.frame.w * escala * MOVEL_CORPO.largura, f.frame.h * escala * MOVEL_CORPO.altura);
    corpos += 1;
  }

  const livre = (x, y) => {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= mapa.width || ty >= mapa.height) return false;
    return !solido[ty * mapa.width + tx];
  };
  /** Amostra o segmento a->b como o NPC anda: em reta, sem pathfinding. */
  const trechoBloqueado = (a, b) => {
    const passos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.25));
    for (let i = 0; i <= passos; i++) {
      const x = a.x + ((b.x - a.x) * i) / passos;
      const y = a.y + ((b.y - a.y) * i) / passos;
      if (!livre(x, y)) return `${Math.floor(x)},${Math.floor(y)}`;
    }
    return null;
  };
  return { chave, largura: mapa.width, altura: mapa.height, corpos, livre, trechoBloqueado };
}

const EXTERNOS = new Map(
  ['farm', 'bairro', 'rural'].map((chave) => [chave, carregarExterno(chave)]),
);
const externoDe = (chave) => {
  const externo = EXTERNOS.get(chave);
  if (!externo) throw new Error(`mapa externo desconhecido: ${chave}`);
  return externo;
};
// Os apelidos do mapa 1 continuam existindo: as conferencias dos 9 NPCs
// originais, escritas antes de haver tres mapas, falam do `farm` sem dizer.
const farm = externoDe('farm');
const { livre, trechoBloqueado } = farm;
const corpos = [...EXTERNOS.values()].reduce((total, e) => total + e.corpos, 0);
/** Grade externa do mapa a que o NPC pertence. */
const externoDoNpc = (id) => externoDe(NPCS[id].mapa);

/** Todas as acoes de um NPC: a rotina padrao mais as rotinas de dia da semana. */
function acoesDe(def) {
  return [...def.rotina, ...Object.values(def.rotinaSemanal ?? {}).flat()];
}

/**
 * Retangulo de `vagar`: por ser convexo, basta que todo tile dele seja livre
 * pra qualquer reta interna tambem ser. Confere na definicao, nao por amostra —
 * o sorteio pode levar centenas de dias pra achar o canto ruim. A grade e a do
 * MAPA DO NPC (`DefinicaoNpc.mapa`), nao mais sempre a do mapa 1.
 *
 * Confere tambem a VOLTA PRA CASA a partir de cada area, mas SO pra quem
 * depende dela: o fallback das 18:00 (`voltar_para_casa`) e acrescentado apenas
 * quando a rotina nao tem nenhuma acao as 18:00 ou depois. Os 24 moradores
 * fecham o dia com um `assumir_lugar` em casa as 22:00 justamente pra nao
 * dependerem de andar pra casa — quem nao tem folha de caminhada nao pode.
 */
function conferirAreasDeVagar() {
  let areas = 0;
  for (const def of Object.values(NPCS)) {
    const externo = externoDoNpc(def.id);
    const temAcaoNoturna = acoesDe(def).some((acao) => acao.horario >= 18 * 60);
    for (const acao of acoesDe(def)) {
      if (acao.tipo !== 'vagar') continue;
      areas += 1;
      const { min, max } = acao.area;
      for (let ty = Math.floor(min.y); ty <= Math.floor(max.y); ty++) {
        for (let tx = Math.floor(min.x); tx <= Math.floor(max.x); tx++) {
          if (!externo.livre(tx + 0.5, ty + 0.5)) {
            throw new Error(
              `area de vagar de ${def.id} (${acao.horario}) inclui tile bloqueado ` +
                `${tx},${ty} em ${externo.chave}`,
            );
          }
        }
      }
      if (temAcaoNoturna) continue; // nao usa o fallback: nada a conferir aqui

      const frente = LOCAIS_CIDADE[def.casa]?.frente;
      if (!frente) throw new Error(`${def.id}: casa "${def.casa}" sem frente`);
      const volta = [...(acao.saidaSegura ?? []), ...def.rotaCasa, frente];
      const cantos = [
        { x: min.x, y: min.y }, { x: max.x, y: min.y },
        { x: min.x, y: max.y }, { x: max.x, y: max.y },
      ];
      for (const canto of cantos) {
        const ruim = externo.trechoBloqueado(canto, volta[0]);
        if (ruim) {
          throw new Error(
            `${def.id} (${acao.horario}): do canto ${canto.x},${canto.y} da area ate ` +
              `${volta[0].x},${volta[0].y} passa pelo tile bloqueado ${ruim}`,
          );
        }
      }
      for (let i = 0; i < volta.length - 1; i++) {
        const ruim = externo.trechoBloqueado(volta[i], volta[i + 1]);
        if (ruim) {
          throw new Error(
            `${def.id} (${acao.horario}): a volta pra casa passa pelo tile bloqueado ${ruim} ` +
              `entre ${volta[i].x},${volta[i].y} e ${volta[i + 1].x},${volta[i + 1].y}`,
          );
        }
      }
    }
  }
  return areas;
}

/**
 * PERCURSOS de rua dos moradores (`LugarMorador.rota`): confere o ciclo inteiro
 * em reta, ponto a ponto, mais o trecho que fecha (ultimo -> primeiro) e a
 * entrada (o `ponto` da faixa ate o primeiro waypoint). Diferente da `area`,
 * aqui nao ha convexidade que garanta nada — o que garante e cada trecho.
 *
 * A varredura sai das AGENDAS e nao de `NPCS[].rotina` de proposito: ha
 * `vagar_rota` que acontece DENTRO de interior (a Mari na academia, a Jaqueline
 * no mercado), e comparar essas com a grade do mapa externo reprovaria rota
 * correta. Na agenda o dado esta explicito: `construcao === null` e ar livre.
 */
function conferirPercursos() {
  let trechos = 0;
  for (const morador of Object.values(MORADORES)) {
    for (const faixa of morador.atividades) {
      const rota = faixa.lugar.rota;
      if (!rota) continue;
      if (faixa.lugar.construcao !== null) {
        throw new Error(`${morador.id}: percurso dentro da construcao "${faixa.lugar.construcao}"`);
      }
      if (rota.length < 2) throw new Error(`${morador.id}: percurso com menos de 2 waypoints`);
      const externo = externoDe(faixa.lugar.mapa);
      const pares = [
        [faixa.lugar.ponto, rota[0]],
        ...rota.map((a, i) => [a, rota[(i + 1) % rota.length]]),
      ];
      for (const [a, b] of pares) {
        const ruim = externo.trechoBloqueado(a, b);
        if (ruim) {
          throw new Error(
            `percurso de ${morador.id} (${faixa.inicio}): trecho ${a.x},${a.y} -> ${b.x},${b.y} ` +
              `passa pelo tile bloqueado ${ruim} em ${externo.chave}`,
          );
        }
        trechos += 1;
      }
    }
  }
  return trechos;
}

const sistema = new SistemaRotinasNpc();
const registros = new Map();
const alcanceEdu = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
const estadosAcademiaMari = { andando: false, parada: false, posicoes: new Set() };
const transicoesPorta = {
  eduAndouDentro: false, eduSaiuNaPorta: false,
  mariAndouDentro: false, mariSaiuNaPorta: false,
  jaquelineSaiuNaPorta: false, jaquelineVoltouNaPorta: false,
};
// Jaqueline: expediente no mercado. Leticia: alcance a ceu aberto, pra provar
// que ela cobre tanto a avenida quanto a praca.
const expedienteJaqueline = { dentro: new Set(), trabalhou: false };
// Uma marca por area de vagar da Leticia, tirada da propria definicao: assim a
// conferencia continua valendo se as areas mudarem de lugar.
const areasLeticia = NPCS.leticia.rotina
  .filter((acao) => acao.tipo === 'vagar')
  .map((acao) => ({ area: acao.area, visitada: false, minutos: new Set() }));
const areasDeVagar = conferirAreasDeVagar();
const trechosDePercurso = conferirPercursos();
for (let minuto = 6 * 60; minuto <= 19 * 60; minuto++) {
  for (let amostra = 0; amostra < 10; amostra++) {
    sistema.atualizar(0, minuto, 100);
    for (const npc of sistema.todos) {
      if (npc.visivel && !externoDoNpc(npc.id).livre(npc.x, npc.y)) {
        throw new Error(
          `${npc.id} entrou em tile bloqueado as ${minuto} em ` +
            `${NPCS[npc.id].mapa}: ${npc.x},${npc.y}`,
        );
      }
      if (npc.id === 'leticia' && npc.visivel && npc.acaoAtual === 'vagar') {
        for (const marca of areasLeticia) {
          const dentroDaArea = npc.x >= marca.area.min.x && npc.x <= marca.area.max.x
            && npc.y >= marca.area.min.y && npc.y <= marca.area.max.y;
          if (!dentroDaArea) continue;
          marca.visitada = true;
          marca.minutos.add(minuto);
        }
      }
      if (npc.id === 'jaqueline') {
        if (npc.dentro === 'mercado') {
          expedienteJaqueline.dentro.add(minuto);
          if (npc.acaoAtual === 'vagar_rota') expedienteJaqueline.trabalhou = true;
        }
        // A janela e de minutos, nao um instante: com a casa multi-comodo o NPC
        // ANDA de dentro ate a porta antes de aparecer na rua, e o trajeto leva
        // alguns minutos de jogo. Sair na hora exata voltaria a ser teleporte.
        if (minuto >= 8 * 60 + 30 && minuto <= 8 * 60 + 45 && npc.dentro === null
          && Math.hypot(npc.x - 87.5, npc.y - 16.5) < 0.3) {
          transicoesPorta.jaquelineSaiuNaPorta = true;
        }
        if (minuto >= 17 * 60 && minuto <= 17 * 60 + 2 && npc.dentro === null
          && Math.hypot(npc.x - 70.5, npc.y - 55.5) < 0.3) {
          transicoesPorta.jaquelineVoltouNaPorta = true;
        }
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
      if (npc.id === 'edu' && minuto >= 8 * 60 && minuto <= 8 * 60 + 15) {
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
  if ([8 * 60, 8 * 60 + 30, 9 * 60, 10 * 60, 12 * 60 + 40, 13 * 60, 14 * 60, 17 * 60, 18 * 60, 19 * 60].includes(minuto)) {
    registros.set(minuto, sistema.todos.map((npc) => ({
      id: npc.id, x: +npc.x.toFixed(1), y: +npc.y.toFixed(1), dentro: npc.dentro,
    })));
  }
}

const edu = sistema.porId('edu');
const mari = sistema.porId('mari');
if (edu?.dentro !== 'casa_2') throw new Error('Edu nao voltou para casa apos as 18:00');
if (mari?.dentro !== 'casa_3') throw new Error('Mari nao voltou para casa perto das 13:00');

// todo NPC tem de terminar o dia dentro da PROPRIA casa
for (const def of Object.values(NPCS)) {
  const estado = sistema.porId(def.id);
  if (estado?.dentro !== def.casa) {
    throw new Error(`${def.id} terminou as 19:00 em "${estado?.dentro}", nao em ${def.casa}`);
  }
}

// uma moradia por morador TITULAR — a validacao de npcs.ts ja explode na carga,
// aqui e so pra a conferencia dizer com quantos lotes ela contou. `MORADIAS`
// inclui os predios MISTOS (bar e farmacia): eles tem cama, entao contam como
// moradia disponivel igual as seis casas.
//
// Quem divide teto (`compartilhaCasa`: o Luke com a mae, o Vitor com o irmao)
// fica de fora da conta: dois moradores na mesma casa e o esperado ali.
const titulares = Object.values(NPCS).filter((def) => !def.compartilhaCasa);
const casas = new Set(titulares.map((def) => def.casa));
if (casas.size !== titulares.length) throw new Error('dois NPCs titulares na mesma casa');
for (const casa of casas) {
  if (!LOCAIS_CIDADE[casa]) throw new Error(`casa "${casa}" nao existe em LOCAIS_CIDADE`);
  if (!MORADIAS.includes(casa)) throw new Error(`"${casa}" nao e moradia disponivel`);
}
// as moradias vagas tem de ter local de cidade pronto, senao encaixar um NPC
// nelas depois quebraria na primeira rotina
for (const vaga of MORADIAS_VAGAS) {
  const local = LOCAIS_CIDADE[vaga];
  if (!local) throw new Error(`a moradia vaga "${vaga}" nao existe em LOCAIS_CIDADE`);
  if (!livre(local.frente.x, local.frente.y)) {
    throw new Error(`a frente da moradia vaga "${vaga}" esta bloqueada`);
  }
}

if (expedienteJaqueline.dentro.size < 6 * 60) {
  throw new Error(
    `Jaqueline ficou so ${expedienteJaqueline.dentro.size} min no mercado (esperado >= 360)`,
  );
}
if (!expedienteJaqueline.trabalhou) throw new Error('Jaqueline nao trabalhou dentro do mercado');
if (expedienteJaqueline.dentro.has(17 * 60 + 30)) {
  throw new Error('Jaqueline continuou no mercado depois das 17:00');
}

// Leticia tem de ter vagado de fato em CADA area, nao so passado por perto: as
// duas ficam longe uma da outra (avenida em y~45, praca em y~52..58).
areasLeticia.forEach((marca, i) => {
  if (!marca.visitada || marca.minutos.size < 30) {
    throw new Error(
      `Leticia vagou so ${marca.minutos.size} min na area ${i} ` +
        `(${JSON.stringify(marca.area)})`,
    );
  }
});
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

console.log(
  `[rotinas] ${Object.keys(NPCS).length} NPCs em ${casas.size} casas | ` +
    `${corpos} corpos de flora no bloqueio | ${areasDeVagar} area(s) de vagar e ` +
      `${trechosDePercurso} trecho(s) de percurso conferido(s)`,
);
console.log(
  `[rotinas] ${MORADIAS.length} moradias no total, ${MORADIAS_VAGAS.length} vaga(s): ` +
    `${MORADIAS_VAGAS.join(', ') || '-'} (frente livre conferida)`,
);
console.log(
  `[rotinas] Jaqueline: ${expedienteJaqueline.dentro.size} min de expediente no mercado | ` +
    `Leticia vagou ${areasLeticia.map((m) => `${m.minutos.size} min`).join(' + ')}`,
);
console.log('[rotinas] cidade percorrida; caminhada, pausas e transicoes por portas validadas');

// ----------------------------------------- presenca interior fixa (7 dias) --
/**
 * Grade de colisao de um INTERIOR: os tiles que colidem mais o corpo de cada
 * movel solido, com a mesma caixa que a FarmScene monta (`MOVEL_CORPO`). E o que
 * permite cobrar que o dono do predio misto nunca pare — nem passe — em cima de
 * mobilia solida ao trocar de posto ou ao sair pra rua.
 */
/**
 * Minimo de minutos de jogo que a troca de posto tem de levar. Nao e um numero
 * de design: e so o piso que separa "andou" de "teleportou". A duracao real sai
 * da distancia dentro do interior, com a mesma velocidade das rotas externas.
 */
const MINUTOS_MINIMOS_DE_TRANSITO = 3;
function gradeInterior(nome, quem = 'npc') {
  const m = JSON.parse(readFileSync(url(`../public/assets/tilemaps/${nome}.json`)));
  // `quem` escolhe QUAL colisao vale: a porta somente-NPC barra o jogador e nao
  // barra o NPC, e e por ela que o dono de um lote misto vai da moradia pro
  // balcao. Ver src/game/colisao.ts.
  const gids = new Set();
  for (const ts of m.tilesets) {
    for (const t of ts.tiles ?? []) {
      if (tileBloqueia(t.properties ?? [], quem)) gids.add(ts.firstgid + t.id);
    }
  }
  const grade = new Uint8Array(m.width * m.height);
  for (const camada of m.layers) {
    if (camada.type !== 'tilelayer') continue;
    for (let i = 0; i < camada.data.length; i++) {
      if (gids.has(camada.data[i] & 0x1fffffff)) grade[i] = 1;
    }
  }
  let solidos = 0;
  for (const o of m.layers.find((c) => c.name === 'moveis')?.objects ?? []) {
    const p = props(o);
    if (p.colide === false) continue;
    const f = framesDoAtlas(p.atlas)[p.frame].frame;
    const h = p.alturaTiles * m.tileheight;
    const largura = h * (f.w / f.h) * MOVEL_CORPO.largura;
    const altura = h * MOVEL_CORPO.altura;
    for (let py = o.y - altura; py < o.y; py += 1) {
      for (let px = o.x - largura / 2; px < o.x + largura / 2; px += 1) {
        const tx = Math.floor(px / m.tilewidth);
        const ty = Math.floor(py / m.tileheight);
        if (tx >= 0 && ty >= 0 && tx < m.width && ty < m.height) grade[ty * m.width + tx] = 1;
      }
    }
    solidos += 1;
  }
  // Tiles de porta somente-NPC: e por eles que o dono do lote misto passa da
  // moradia pro salao. Ficam expostos pra conferencia poder cobrar que a
  // travessia ACONTECE, e nao so que ela seria possivel.
  const gidsPortaNpc = new Set();
  for (const ts of m.tilesets) {
    for (const t of ts.tiles ?? []) {
      if ((t.properties ?? []).some((q) => q.name === PROP_PORTA_NPC && q.value === true)) {
        gidsPortaNpc.add(ts.firstgid + t.id);
      }
    }
  }
  const portasNpc = new Set();
  for (const camada of m.layers) {
    if (camada.type !== 'tilelayer') continue;
    camada.data.forEach((gid, i) => {
      if (!gidsPortaNpc.has(gid & 0x1fffffff)) return;
      portasNpc.add(`${i % m.width},${Math.floor(i / m.width)}`);
    });
  }
  return {
    nome,
    solidos,
    portasNpc,
    naPortaNpc: (x, y) => portasNpc.has(`${Math.floor(x)},${Math.floor(y)}`),
    livre: (x, y) => {
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      if (tx < 0 || ty < 0 || tx >= m.width || ty >= m.height) return false;
      return !grade[ty * m.width + tx];
    },
  };
}

/**
 * Os interiores das casas de NPC viraram multi-comodo: a reta do ponto em que o
 * morador acorda ate a porta da rua atravessa parede em quase todos. Como o motor
 * nao faz pathfinding, quem resolve isso e o `corredorInterior` declarado em
 * `LOCAIS_CIDADE` — e e ele que esta sendo conferido aqui.
 *
 * Roda um dia inteiro e, sempre que o NPC estiver DENTRO de um interior que a
 * conferencia conhece, cobra que a posicao dele seja um tile livre. Cobra
 * tambem que cada morador tenha ANDADO dentro de casa em algum momento: com a
 * casa grande, sair dela deixou de ser um pulo de dois tiles.
 */
function conferirInterioresDeMoradores() {
  // casa_1 saiu da lista: o lote foi desativado nesta leva e nao tem mais
  // interior. As cinco restantes sao as casas de NPC.
  const casas = ['casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6'];
  const grades = new Map(casas.map((nome) => [nome, gradeInterior(nome)]));
  const sistema = new SistemaRotinasNpc();
  const andouDentro = new Set();
  const ruins = [];
  for (let minuto = 6 * 60; minuto <= 20 * 60; minuto++) {
    for (let amostra = 0; amostra < 10; amostra++) {
      sistema.atualizar(0, minuto, 100);
      for (const npc of sistema.todos) {
        const grade = npc.visivel ? null : grades.get(npc.dentro);
        if (!grade) continue;
        if (npc.movendo) andouDentro.add(npc.id);
        if (!grade.livre(npc.x, npc.y)) {
          ruins.push(`${npc.id} as ${minuto}min em ${npc.dentro} ${npc.x.toFixed(1)},${npc.y.toFixed(1)}`);
        }
      }
    }
  }
  if (ruins.length) {
    throw new Error(
      'morador dentro de parede ou mobilia no interior da propria casa: ' +
        ruins.slice(0, 4).join(' | '),
    );
  }
  const comRotina = Object.values(NPCS).filter(
    (def) => casas.includes(def.casa) && def.rotina.length > 0,
  );
  for (const def of comRotina) {
    if (!andouDentro.has(def.id)) {
      throw new Error(`${def.id} nunca andou dentro de ${def.casa} — saiu por teleporte?`);
    }
  }
  return { casas: grades.size, andaram: comRotina.length };
}

/**
 * Simula a SEMANA inteira, um dia por vez, e cobra o contrato da presenca
 * interior fixa:
 *
 * 1. o dono aparece no mapa externo APENAS no dia da viagem semanal — e nesse
 *    dia ele de fato chega ao mercado e volta pro proprio predio;
 * 2. em todos os outros dias ele nunca fica visivel la fora (logo, nunca sai no
 *    mapa da tecla M, que le o mesmo `visivel`);
 * 3. os dois postos sao ocupados todo dia (abre e fecha);
 * 4. nenhuma posicao dele, dentro ou fora, cai em tile bloqueado — incluindo as
 *    caminhadas dentro do interior;
 * 5. a troca de posto tem DURACAO REAL: ele passa minutos em transito
 *    (`acaoAtual === "posto_interior"` com `posto` ainda null) em vez de trocar
 *    de lugar num tick, e nesse transito ele CRUZA a porta somente-NPC — que e o
 *    unico jeito de ir da moradia ao balcao.
 */
function conferirPresencaInteriorFixa() {
  const DIAS_DE_VIAGEM = { wendel: DIA_DA_SEMANA.quarta, alice: DIA_DA_SEMANA.sexta };
  const grades = new Map(
    ['bar', 'farmacia', 'mercado'].map((nome) => [nome, gradeInterior(nome)]),
  );
  const sistema = new SistemaRotinasNpc();
  const ids = NPCS_DE_PRESENCA_INTERIOR;
  if (!ids.length) throw new Error('nenhum NPC de presenca interior fixa pra conferir');
  for (const id of ids) {
    if (DIAS_DE_VIAGEM[id] === undefined) {
      throw new Error(`"${id}" e de presenca interior fixa mas a conferencia nao sabe o dia da viagem dele`);
    }
  }

  const linhas = [];
  for (let dia = 0; dia < 7; dia++) {
    const registro = new Map(
      ids.map((id) => [id, {
        fora: new Set(), mercado: new Set(), postos: new Set(),
        ruinsFora: [], ruinsDentro: [], transito: new Set(), cruzouPorta: new Set(),
      }]),
    );
    for (let minuto = 6 * 60; minuto <= 21 * 60; minuto++) {
      for (let amostra = 0; amostra < 10; amostra++) {
        sistema.atualizar(dia, minuto, 100);
        for (const id of ids) {
          const npc = sistema.porId(id);
          const reg = registro.get(id);
          if (npc.posto) reg.postos.add(npc.posto);
          if (npc.acaoAtual === 'posto_interior' && !npc.posto) reg.transito.add(minuto);
          if (!npc.visivel && grades.get(npc.dentro)?.naPortaNpc(npc.x, npc.y)) {
            reg.cruzouPorta.add(minuto);
          }
          if (npc.visivel) {
            reg.fora.add(minuto);
            if (!livre(npc.x, npc.y)) {
              reg.ruinsFora.push(`${minuto}min em ${npc.x.toFixed(1)},${npc.y.toFixed(1)}`);
            }
            continue;
          }
          if (!npc.dentro) throw new Error(`${id}: invisivel e fora de construcao as ${minuto}`);
          if (npc.dentro === 'mercado') reg.mercado.add(minuto);
          const grade = grades.get(npc.dentro);
          if (grade && !grade.livre(npc.x, npc.y)) {
            reg.ruinsDentro.push(
              `${minuto}min em ${npc.dentro} ${npc.x.toFixed(1)},${npc.y.toFixed(1)}`,
            );
          }
        }
      }
    }

    for (const id of ids) {
      const def = NPCS[id];
      const reg = registro.get(id);
      const viaja = dia === DIAS_DE_VIAGEM[id];
      if (reg.ruinsDentro.length) {
        throw new Error(
          `${id} (dia ${dia}) parou em mobilia solida dentro do interior: ` +
            reg.ruinsDentro.slice(0, 4).join(' | '),
        );
      }
      if (reg.ruinsFora.length) {
        throw new Error(
          `${id} (dia ${dia}) pisou em tile bloqueado no mapa externo: ` +
            reg.ruinsFora.slice(0, 4).join(' | '),
        );
      }
      if (!viaja && reg.fora.size) {
        throw new Error(
          `${id} apareceu no mapa externo em ${nomeDoDiaDaSemana(dia)} ` +
            `(${reg.fora.size} min), e nao deveria sair nesse dia`,
        );
      }
      if (!viaja && reg.mercado.size) {
        throw new Error(`${id} entrou no mercado em ${nomeDoDiaDaSemana(dia)}, fora do dia da viagem`);
      }
      if (viaja) {
        if (!reg.fora.size) {
          throw new Error(`${id} nao apareceu no mapa externo no dia da viagem (${nomeDoDiaDaSemana(dia)})`);
        }
        if (reg.mercado.size < 20 || reg.mercado.size > 60) {
          throw new Error(
            `${id} ficou ${reg.mercado.size} min no mercado (esperado uma visita curta, 20..60)`,
          );
        }
      }
      for (const posto of ['trabalho', 'moradia']) {
        if (!reg.postos.has(posto)) {
          throw new Error(`${id} nao ocupou o posto "${posto}" em ${nomeDoDiaDaSemana(dia)}`);
        }
      }
      // A troca de posto era instantanea (0 min). Agora e caminhada: se o
      // transito voltar a caber num tick, isto reprova.
      if (reg.transito.size < MINUTOS_MINIMOS_DE_TRANSITO) {
        throw new Error(
          `${id} levou so ${reg.transito.size} min trocando de posto em ` +
            `${nomeDoDiaDaSemana(dia)} (esperado >= ${MINUTOS_MINIMOS_DE_TRANSITO}) — a troca voltou a ser instantanea?`,
        );
      }
      if (reg.cruzouPorta.size < 2) {
        throw new Error(
          `${id} cruzou a porta somente-NPC em so ${reg.cruzouPorta.size} min de ` +
            `${nomeDoDiaDaSemana(dia)} (esperado a ida e a volta)`,
        );
      }
      const fim = sistema.porId(id);
      if (fim.dentro !== def.casa) {
        throw new Error(`${id} terminou ${nomeDoDiaDaSemana(dia)} em "${fim.dentro}", nao em ${def.casa}`);
      }
      if (fim.posto !== 'moradia') {
        throw new Error(`${id} nao voltou ao posto de moradia no fim de ${nomeDoDiaDaSemana(dia)}`);
      }
      linhas.push(
        `  ${nomeDoDiaDaSemana(dia).padEnd(13)} ${id.padEnd(7)} ` +
          `fora ${String(reg.fora.size).padStart(3)} min | ` +
          `mercado ${String(reg.mercado.size).padStart(2)} min | ` +
          `troca de posto ${String(reg.transito.size).padStart(2)} min a pe, ` +
          `porta privada em ${reg.cruzouPorta.size} min${viaja ? '  <- viagem semanal' : ''}`,
      );
    }
  }
  const solidos = [...grades.values()].map((g) => `${g.nome}=${g.solidos}`).join(' ');
  return { linhas, solidos, total: ids.length };
}

// ------------------------------------- os lugares fixos dos 24 moradores --
/**
 * Todo `assumir_lugar` tem de apontar pra um tile que EXISTA, esteja livre e
 * seja alcancavel.
 *
 * A acao troca de lugar sem caminhar (ver npcs.ts), entao um ponto errado nao
 * quebra nada em runtime: o NPC simplesmente fica de pe dentro de uma parede,
 * ou num comodo em que o jogador nao consegue entrar pra falar com ele. Sao os
 * dois casos que esta conferencia reprova.
 *
 * Nos interiores a grade usada e a do NPC, e o flood-fill parte da frente da
 * porta da rua — o mesmo ponto de partida da conferencia de interiores do
 * gerador.
 */
function conferirLugaresAssumidos() {
  const gradesInterior = new Map();
  const alcanceInterior = new Map();
  const grade = (nome) => {
    if (!gradesInterior.has(nome)) gradesInterior.set(nome, gradeInterior(nome));
    return gradesInterior.get(nome);
  };
  const alcancaveis = (nome) => {
    if (alcanceInterior.has(nome)) return alcanceInterior.get(nome);
    const g = grade(nome);
    const porta = LOCAIS_CIDADE[nome]?.portaInterior;
    if (!porta) throw new Error(`interior "${nome}" nao tem portaInterior em LOCAIS_CIDADE`);
    const inicio = `${Math.floor(porta.x)},${Math.floor(porta.y)}`;
    const vistos = new Set([inicio]);
    const fila = [[Math.floor(porta.x), Math.floor(porta.y)]];
    while (fila.length) {
      const [x, y] = fila.pop();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const a = x + dx;
        const b = y + dy;
        const chave = `${a},${b}`;
        if (vistos.has(chave) || !g.livre(a + 0.5, b + 0.5)) continue;
        vistos.add(chave);
        fila.push([a, b]);
      }
    }
    alcanceInterior.set(nome, vistos);
    return vistos;
  };

  let lugares = 0;
  const interioresVistos = new Set();
  for (const def of Object.values(NPCS)) {
    for (const acao of acoesDe(def)) {
      if (acao.tipo !== 'assumir_lugar') continue;
      lugares += 1;
      const { x, y } = acao.ponto;
      if (acao.construcao === null) {
        const externo = externoDoNpc(def.id);
        if (!externo.livre(x, y)) {
          throw new Error(
            `${def.id} (${acao.horario}): o lugar ao ar livre ${x},${y} esta bloqueado ` +
              `em ${externo.chave}`,
          );
        }
        continue;
      }
      interioresVistos.add(acao.construcao);
      const g = grade(acao.construcao);
      if (!g.livre(x, y)) {
        throw new Error(
          `${def.id} (${acao.horario}): o lugar ${x},${y} de "${acao.construcao}" ` +
            'cai em parede ou mobilia solida',
        );
      }
      if (!alcancaveis(acao.construcao).has(`${Math.floor(x)},${Math.floor(y)}`)) {
        throw new Error(
          `${def.id} (${acao.horario}): o lugar ${x},${y} de "${acao.construcao}" nao e ` +
            'alcancavel a partir da porta da rua',
        );
      }
    }
  }
  return { lugares, interiores: interioresVistos.size };
}

/**
 * No maximo UM bloco ao ar livre por dia, cercado por interior.
 *
 * `assumir_lugar` troca de lugar num instante. Entre dois interiores, ou de
 * interior pra rua, isso acontece longe de vista. Entre dois pontos ao ar livre
 * do MESMO mapa seria um teleporte na frente do jogador — que e exatamente o
 * que o sistema antigo fazia a cada mudanca de compromisso.
 */
function conferirBlocosAoArLivre() {
  let blocos = 0;
  for (const def of Object.values(NPCS)) {
    const rotinas = [['padrao', def.rotina], ...Object.entries(def.rotinaSemanal ?? {})];
    for (const [nome, rotina] of rotinas) {
      const lugares = rotina
        .filter((acao) => acao.tipo === 'assumir_lugar')
        .sort((a, b) => a.horario - b.horario);
      if (!lugares.length) continue;
      if (lugares[0].construcao === null) {
        throw new Error(`${def.id} (${nome}): o dia comeca ao ar livre, e nao em casa`);
      }
      let abertos = 0;
      let anterior = null;
      for (const acao of lugares) {
        if (acao.construcao === null) {
          if (anterior?.construcao === null) {
            throw new Error(
              `${def.id} (${nome}): duas trocas seguidas ao ar livre ` +
                `(${anterior.ponto.x},${anterior.ponto.y} -> ${acao.ponto.x},${acao.ponto.y}) ` +
                'seriam um teleporte a vista do jogador',
            );
          }
          abertos += 1;
        }
        anterior = acao;
      }
      if (abertos > 1) {
        throw new Error(`${def.id} (${nome}): ${abertos} blocos ao ar livre no mesmo dia`);
      }
      blocos += abertos;
    }
  }
  return blocos;
}

/**
 * Dois NPCs parados no MESMO tile ao mesmo tempo viram um sprite so.
 *
 * So conta quem esta PARADO e sem acao em curso (`inativo`): quem esta andando
 * ou perambulando se cruza de passagem, e o motor nao tem colisao entre NPCs —
 * o Hiago passa pela sala onde o Vitor esta sentado, e isso e normal. O que se
 * cobra e o posto FIXO: a carteira de cada crianca, o ponto de cada membro da
 * familia na sala, o balcao de cada funcionario.
 */
function conferirPostosSemColisao() {
  const sistema = new SistemaRotinasNpc();
  const conflitos = [];
  for (const dia of [0, 5]) {
    for (let minuto = 0; minuto <= 23 * 60; minuto += 10) {
      sistema.atualizar(dia, minuto, 100);
      const ocupacao = new Map();
      for (const npc of sistema.todos) {
        if (npc.acaoAtual !== 'inativo' || npc.movendo) continue;
        const chave = `${npc.dentro ?? NPCS[npc.id].mapa}:${Math.floor(npc.x)},${Math.floor(npc.y)}`;
        const antes = ocupacao.get(chave);
        if (antes) conflitos.push(`${antes} e ${npc.id} em ${chave} (dia ${dia}, ${minuto}min)`);
        else ocupacao.set(chave, npc.id);
      }
    }
  }
  if (conflitos.length) {
    throw new Error(`postos fixos sobrepostos: ${conflitos.slice(0, 5).join(' | ')}`);
  }
}

const nomeDoDiaDaSemana = (dia) => DIAS_DA_SEMANA[dia];
const moradores = conferirInterioresDeMoradores();
console.log(
  `[rotinas] interiores das casas: ${moradores.casas} conferidos, ` +
    `${moradores.andaram} morador(es) andando de verdade de dentro de casa ate a porta`,
);
const presenca = conferirPresencaInteriorFixa();
console.log(
  `[rotinas] presenca interior fixa: ${presenca.total} NPC(s) conferido(s) nos 7 dias ` +
    `(corpos de movel por interior: ${presenca.solidos})`,
);
for (const linha of presenca.linhas) console.log(linha);

const lugares = conferirLugaresAssumidos();
const blocos = conferirBlocosAoArLivre();
conferirPostosSemColisao();
console.log(
  `[rotinas] ${lugares.lugares} lugar(es) fixo(s) conferido(s) em ${lugares.interiores} ` +
    `interior(es); ${blocos} bloco(s) ao ar livre, no maximo um por dia, sem posto sobreposto`,
);

for (const [minuto, estados] of registros) {
  const hora = `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;
  console.log(`  ${hora}`, JSON.stringify(estados));
}

/**
 * CLIMA, ESTACAO E ENCONTRO nas rotinas: a matriz inteira.
 *
 * O ajuste de calendario mexe na rotina de todo NPC, e rotina mexida e rotina
 * que pode mandar alguem pra dentro de uma parede. Entao a conferencia nao
 * escolhe casos: ela roda as 4 estacoes x 8 climas x 7 dias da semana pros 33
 * NPCs — 6.720 rotinas — e cobra, em cada uma:
 *
 *   1. todo `assumir_lugar` cai em tile LIVRE e ALCANCAVEL (no mapa externo ou
 *      no interior que a acao declara);
 *   2. duas trocas de lugar ao ar livre seguidas no mesmo mapa nao acontecem —
 *      seria teleporte na frente do jogador;
 *   3. o NPC nunca fica sem nenhuma acao no dia;
 *   4. posto de trabalho e compromisso de emprego NAO sao tocados por clima nem
 *      por estacao;
 *   5. o encontro do dia poe cada participante numa vaga PROPRIA, e nao ha
 *      encontro com mais participante que vaga;
 *   6. chuva recolhe: em dia de chuva sem encontro, ninguem com abrigo declarado
 *      fica ao ar livre.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLIMAS } from '../src/game/clima.ts';
import { DIAS_POR_ESTACAO, dataDoDia, diaDaSemana } from '../src/game/calendario.ts';
import { tileBloqueia } from '../src/game/colisao.ts';
import { MORADORES } from '../src/game/moradores.ts';
import { NPCS } from '../src/game/npcs.ts';
import {
  CLIMAS_DE_ABRIGO,
  ENCONTROS,
  abrigoDe,
  encontroDoDia,
  participantesDoEncontro,
  rotinaComCalendario,
} from '../src/game/rotinaSocial.ts';

const url = (c) => new URL(c, import.meta.url);
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const MOVEL_CORPO = { largura: 0.92, altura: 0.5 };
const TRONCO = { largura: 0.56, altura: 0.375 };
const PEDRA = { largura: 0.78, altura: 0.34 };
const PEDRA_COLIDE_ACIMA_DE = 0.45;

let conferencias = 0;
const ok = (mensagem, condicao) => { assert(condicao, mensagem); conferencias += 1; };

const atlasCache = new Map();
const framesDoAtlas = (atlas) => {
  if (!atlasCache.has(atlas)) {
    atlasCache.set(atlas, JSON.parse(readFileSync(url(`../public/assets/sprites/${atlas}.atlas.json`))).frames);
  }
  return atlasCache.get(atlas);
};

/**
 * Grade de colisao de um mapa, com os corpos de flora e mobilia. `npcAtravessa`
 * abre a porta somente-NPC: quem anda aqui e NPC.
 */
const gradeCache = new Map();
function grade(chave) {
  if (gradeCache.has(chave)) return gradeCache.get(chave);
  const mapa = JSON.parse(readFileSync(url(`../public/assets/tilemaps/${chave}.json`)));
  const T = mapa.tilewidth;
  const bloqueados = new Set();
  for (const ts of mapa.tilesets) {
    for (const t of ts.tiles ?? []) {
      // 'npc' abre a porta somente-NPC: quem anda nestas rotinas e NPC.
      if (tileBloqueia(t.properties ?? [], 'npc')) bloqueados.add(ts.firstgid + t.id);
    }
  }
  const solido = new Uint8Array(mapa.width * mapa.height);
  for (const camada of mapa.layers) {
    if (camada.type !== 'tilelayer') continue;
    for (let i = 0; i < camada.data.length; i++) if (bloqueados.has(camada.data[i] & 0x1fffffff)) solido[i] = 1;
  }
  const corpo = (cx, cy, largura, altura) => {
    for (let py = cy - altura; py < cy; py += 1) {
      for (let px = cx - largura / 2; px < cx + largura / 2; px += 1) {
        const tx = Math.floor(px / T); const ty = Math.floor(py / T);
        if (tx >= 0 && ty >= 0 && tx < mapa.width && ty < mapa.height) solido[ty * mapa.width + tx] = 1;
      }
    }
  };
  const framesPedra = framesDoAtlas('pedras');
  for (const o of mapa.layers.find((c) => c.name === 'flora')?.objects ?? []) {
    const p = props(o);
    if (o.type === 'arvore') {
      if (p.estagio < 2) continue;
      corpo(o.x, o.y, TRONCO.largura * T, TRONCO.altura * T);
    } else if (o.type === 'pedra') {
      if (p.alturaTiles <= PEDRA_COLIDE_ACIMA_DE) continue;
      const f = framesPedra[`pedra_${p.indice}`].frame;
      const h = p.alturaTiles * T;
      corpo(o.x, o.y, h * (f.w / f.h) * PEDRA.largura, h * PEDRA.altura);
    }
  }
  for (const o of mapa.layers.find((c) => c.name === 'moveis')?.objects ?? []) {
    const p = props(o);
    if (p.colide !== true) continue;
    const f = framesDoAtlas(String(p.atlas))[String(p.frame)];
    if (!f) continue;
    const escala = (Number(p.alturaTiles) * T) / f.frame.h;
    corpo(o.x, o.y, f.frame.w * escala * MOVEL_CORPO.largura, f.frame.h * escala * MOVEL_CORPO.altura);
  }
  const livre = (x, y) => {
    const tx = Math.floor(x); const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= mapa.width || ty >= mapa.height) return false;
    return !solido[ty * mapa.width + tx];
  };
  const g = { chave, largura: mapa.width, altura: mapa.height, livre };
  gradeCache.set(chave, g);
  return g;
}

// --------------------------------------------------------------- encontros
const favoritosPorNpc = new Map(Object.values(MORADORES).map((m) => [m.id, m.vida.favoritos]));
const ordem = Object.keys(NPCS);

for (const encontro of ENCONTROS) {
  const participantes = participantesDoEncontro(encontro, favoritosPorNpc, ordem);
  ok(`"${encontro.id}": tem participante (${participantes.length})`, participantes.length >= 3);
  ok(
    `"${encontro.id}": ${participantes.length} participante(s) em ${encontro.vagas.length} vaga(s)`,
    participantes.length <= encontro.vagas.length,
  );
  const distintas = new Set(encontro.vagas.map((v) => `${v.x},${v.y}`));
  ok(`"${encontro.id}": vagas distintas`, distintas.size === encontro.vagas.length);
  const g = grade(encontro.construcao ?? encontro.mapa);
  for (const vaga of encontro.vagas) {
    ok(
      `"${encontro.id}": vaga (${vaga.x},${vaga.y}) livre em ${g.chave}`,
      g.livre(vaga.x, vaga.y),
    );
  }
  ok(`"${encontro.id}": tem aviso pro quadro`, typeof encontro.aviso === 'string' && encontro.aviso.length > 0);
}
// um dia de cada tipo tem de existir na semana e na estacao
const semanais = ENCONTROS.filter((e) => e.diaDaSemana !== undefined);
const deEstacao = ENCONTROS.filter((e) => e.diaDaEstacao !== undefined);
ok(`ha encontro semanal (${semanais.length})`, semanais.length >= 2);
ok(`ha evento de estacao (${deEstacao.length})`, deEstacao.length >= 1);
ok('nenhum dia da semana tem dois encontros', new Set(semanais.map((e) => e.diaDaSemana)).size === semanais.length);

// ------------------------------------------------------------- a matriz
const AO_AR_LIVRE = new Set(['vagar', 'vagar_rota', 'andar_rota']);
let rotinas = 0;
let recolhidos = 0;
let comEncontro = 0;
const climasVistos = new Set();

for (let estacao = 0; estacao < 4; estacao++) {
  for (let diaEstacao = 1; diaEstacao <= DIAS_POR_ESTACAO; diaEstacao++) {
    const dia = estacao * DIAS_POR_ESTACAO + (diaEstacao - 1);
    const data = dataDoDia(dia);
    if (data.estacao !== estacao) continue;
    for (const clima of CLIMAS) {
      climasVistos.add(clima);
      const encontro = encontroDoDia(dia);
      const participantes = encontro ? participantesDoEncontro(encontro, favoritosPorNpc, ordem) : [];
      const vagasUsadas = new Map();

      for (const def of Object.values(NPCS)) {
        const base = def.rotinaSemanal?.[diaDaSemana(dia)] ?? def.rotina;
        const rotina = rotinaComCalendario(def, base, { dia, clima, favoritosPorNpc, ordem });
        rotinas += 1;
        assert(rotina.length > 0, `${def.id} ficou sem acao no dia ${dia} (${clima})`);

        let anterior = null;
        for (const acao of rotina) {
          if (acao.tipo !== 'assumir_lugar') { anterior = acao; continue; }
          const chave = acao.construcao ?? acao.mapa ?? def.mapa;
          const g = grade(chave);
          assert(
            g.livre(acao.ponto.x, acao.ponto.y),
            `${def.id} dia ${dia} (${clima}): assumir_lugar em (${acao.ponto.x},${acao.ponto.y}) bloqueado em ${chave}`,
          );
          if (acao.construcao === null && anterior?.tipo === 'assumir_lugar' && anterior.construcao === null) {
            const mapaAnterior = anterior.mapa ?? def.mapa;
            assert(
              mapaAnterior !== chave,
              `${def.id} dia ${dia} (${clima}): duas trocas ao ar livre seguidas em ${chave}`,
            );
          }
          anterior = acao;
        }

        // 4. posto de trabalho intacto
        const postosBase = base.filter((a) => a.tipo === 'posto_interior').length;
        const postosDepois = rotina.filter((a) => a.tipo === 'posto_interior').length;
        assert.equal(
          postosDepois,
          postosBase,
          `${def.id} dia ${dia} (${clima}): o clima mexeu no posto de trabalho`,
        );

        // 5. vaga propria por participante
        const indice = participantes.indexOf(def.id);
        if (indice >= 0) {
          const vaga = encontro.vagas[indice];
          const marca = `${vaga.x},${vaga.y}`;
          assert(!vagasUsadas.has(marca), `vaga ${marca} de "${encontro.id}" repetida (${vagasUsadas.get(marca)} e ${def.id})`);
          vagasUsadas.set(marca, def.id);
          const noEncontro = rotina.some(
            (a) => a.tipo === 'assumir_lugar' && a.horario === encontro.inicio
              && a.ponto.x === vaga.x && a.ponto.y === vaga.y,
          );
          assert(noEncontro, `${def.id} nao foi pro encontro "${encontro.id}" no dia ${dia}`);
          comEncontro += 1;
        }

        // 6. chuva recolhe (quando o dia nao tem encontro pra esse NPC, e quem
        // trabalha ao ar livre na zona rural nao entra nesta conta)
        if (CLIMAS_DE_ABRIGO.includes(clima) && indice < 0 && abrigoDe(def) && def.mapa !== 'rural') {
          const naRua = rotina.filter(
            (a) => AO_AR_LIVRE.has(a.tipo) || (a.tipo === 'assumir_lugar' && a.construcao === null),
          );
          assert.equal(
            naRua.length,
            0,
            `${def.id} dia ${dia} (${clima}): ficou na rua com ${naRua.length} acao(oes) ao ar livre`,
          );
          recolhidos += 1;
        }
      }
    }
  }
}
conferencias += rotinas;
ok(`a matriz cobriu os 8 climas (${climasVistos.size})`, climasVistos.size === CLIMAS.length);
ok(`a matriz rodou as 4 estacoes x 28 dias x 8 climas x ${Object.keys(NPCS).length} NPCs`, rotinas === 4 * DIAS_POR_ESTACAO * CLIMAS.length * Object.keys(NPCS).length);
ok(`houve recolhimento por chuva (${recolhidos})`, recolhidos > 1000);
ok(`houve participacao em encontro (${comEncontro})`, comEncontro > 100);

console.log(
  `[social] ${conferencias} conferencias: ${rotinas} rotinas (4 estacoes x ${DIAS_POR_ESTACAO} dias x `
  + `${CLIMAS.length} climas x ${Object.keys(NPCS).length} NPCs), ${recolhidos} recolhimentos por chuva, `
  + `${comEncontro} presencas em encontro, ${ENCONTROS.length} encontros`,
);

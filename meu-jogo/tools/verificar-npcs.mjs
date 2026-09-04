/**
 * CONFERENCIA DE ANIMACAO DE NPC.
 *
 * O defeito que originou este arquivo era visivel e silencioso ao mesmo tempo:
 * doze moradores do Mapa 2 atravessavam o bairro inteiro sem mexer uma perna.
 * Nada quebrava, nada aparecia no console — a folha `_andando_runtime` deles
 * existia, tinha o tamanho certo e os quatro quadros por direcao. So que os
 * quatro quadros eram a MESMA imagem, porque a arte de origem so tinha pose
 * parada e o processador repetia a pose pra preencher a grade.
 *
 * E por isso que a conferencia daqui nao se contenta em achar o arquivo e
 * contar quadro: ela LE os pixels e cobra que os quadros de uma direcao sejam
 * diferentes entre si. Um NPC que anda com quatro quadros identicos e
 * exatamente o defeito, e nenhuma conferencia estrutural o pega.
 *
 *     npm run verificar-npcs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerPng, pixel } from './imagem.mjs';
import { NPCS } from '../src/game/npcs.ts';
import { MORADORES } from '../src/game/moradores.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICO = join(RAIZ, 'public');

const DIRECOES = ['down', 'up', 'left', 'right'];

let checagens = 0;
const falhas = [];

function ok(condicao, mensagem) {
  checagens++;
  if (!condicao) falhas.push(mensagem);
}

/**
 * Assinatura de um quadro da folha: uma amostra esparsa de pixels.
 *
 * Amostra em vez de hash do quadro inteiro porque os quadros tem 256x320 e sao
 * centenas — e porque a diferenca que interessa (a perna sai do lugar) aparece
 * em qualquer grade grossa. O passo de 7 e primo com a largura da celula pra a
 * amostra nao cair sempre na mesma coluna de cada figura.
 */
function assinaturaDoQuadro(img, coluna, linha, colunas, linhas) {
  const cw = img.w / colunas;
  const ch = img.h / linhas;
  const x0 = Math.floor(coluna * cw);
  const y0 = Math.floor(linha * ch);
  const partes = [];
  for (let y = 4; y < ch - 4; y += 7) {
    for (let x = 4; x < cw - 4; x += 7) {
      const p = pixel(img, x0 + x, y0 + y);
      partes.push(p[3] < 8 ? 0 : ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4));
    }
  }
  return partes.join(',');
}

const cacheDeFolha = new Map();
function carregar(arquivo) {
  if (!cacheDeFolha.has(arquivo)) {
    const caminho = join(PUBLICO, arquivo);
    cacheDeFolha.set(arquivo, existsSync(caminho) ? lerPng(caminho) : null);
  }
  return cacheDeFolha.get(arquivo);
}

// --------------------------------------------------- quem anda de verdade --
const listaDePassada = JSON.parse(
  readFileSync(join(PUBLICO, 'assets/sprites/npc-caminhada.json'), 'utf8'),
);
const PASSADA_REAL = new Set(listaDePassada.caminhada ?? []);
const PASSADA_SINTETICA = new Set(listaDePassada.sintetica ?? []);

ok(
  PASSADA_REAL.size > 0,
  'npc-caminhada.json nao lista nenhum NPC com passada real — o processador rodou?',
);
for (const id of PASSADA_SINTETICA) {
  ok(
    !PASSADA_REAL.has(id),
    `${id} aparece nas DUAS listas de npc-caminhada.json (real e sintetica)`,
  );
}

// --------------------------------------------------------- quem se movimenta --
/**
 * Um NPC "se movimenta" quando alguma acao da rotina dele o tira do lugar.
 *
 * `ir`/`vagar`/`percorrer` movem; `esperar`, `entrar` e `posto` nao. Um morador
 * se movimenta sempre: a agenda dele o manda de casa pro trabalho e de volta,
 * e e no caminho que a caminhada aparece.
 */
const ACOES_QUE_MOVEM = new Set(['ir', 'vagar', 'percorrer', 'rota']);

function seMovimenta(def) {
  const rotinas = def.rotina ?? def.rotinas ?? null;
  if (!rotinas) return true; // morador: a agenda sempre o desloca
  const acoes = Array.isArray(rotinas) ? rotinas : Object.values(rotinas).flat();
  return acoes.some((a) => a && ACOES_QUE_MOVEM.has(a.tipo));
}

// ------------------------------------------------------------- a conferencia --
const perfis = [
  ...Object.values(NPCS).map((def) => ({ def, origem: 'npcs.ts' })),
  ...Object.values(MORADORES).map((def) => ({ def, origem: 'moradores.ts' })),
];

const relatorio = [];

for (const { def, origem } of perfis) {
  const id = def.id;
  const anda = seMovimenta(def);
  if (!anda) continue;

  const folha = def.sprite;
  ok(!!folha, `${id} (${origem}) se movimenta e nao tem folha de caminhada declarada`);
  if (!folha) continue;

  const img = carregar(folha.arquivo);
  ok(!!img, `${id}: a folha ${folha.arquivo} nao existe em public/`);
  if (!img) continue;

  ok(
    img.w % folha.colunas === 0 && img.h % folha.linhas === 0,
    `${id}: ${folha.arquivo} tem ${img.w}x${img.h}, que nao divide em `
    + `${folha.colunas}x${folha.linhas}`,
  );

  for (const direcao of DIRECOES) {
    const faixa = folha.frames[direcao];
    ok(!!faixa, `${id}: falta a direcao "${direcao}" na folha de caminhada`);
    if (!faixa) continue;
    ok(
      faixa.linha >= 0 && faixa.linha < folha.linhas,
      `${id}/${direcao}: linha ${faixa.linha} fora da folha (${folha.linhas} linhas)`,
    );
    ok(
      faixa.colunas.length >= 2,
      `${id}/${direcao}: ${faixa.colunas.length} quadro(s) de caminhada — `
      + 'com menos de dois nao ha ciclo',
    );
    for (const c of faixa.colunas) {
      ok(
        c >= 0 && c < folha.colunas,
        `${id}/${direcao}: coluna ${c} fora da folha (${folha.colunas} colunas)`,
      );
    }

    // O CHECK QUE IMPORTA: os quadros da direcao tem de ser diferentes entre si.
    const assinaturas = new Set(
      faixa.colunas.map((c) => assinaturaDoQuadro(img, c, faixa.linha, folha.colunas, folha.linhas)),
    );
    const anima = assinaturas.size > 1;
    ok(
      anima,
      `${id}/${direcao}: os ${faixa.colunas.length} quadros de caminhada sao IDENTICOS — `
      + `o NPC desliza. anim "npc-${id}-walk-${direcao}", folha ${folha.arquivo}`,
    );
    if (!anima) {
      relatorio.push({
        id, direcao, anim: `npc-${id}-walk-${direcao}`, folha: folha.arquivo,
      });
    }
  }

  // A folha de parado e opcional, mas quando declarada tem de existir e caber.
  if (def.spriteParado) {
    const p = def.spriteParado;
    const imgP = carregar(p.arquivo);
    ok(!!imgP, `${id}: a folha de parado ${p.arquivo} nao existe em public/`);
    if (imgP) {
      for (const direcao of DIRECOES) {
        const faixa = p.frames[direcao];
        ok(!!faixa, `${id}: falta a direcao "${direcao}" na folha de parado`);
        if (!faixa) continue;
        ok(
          faixa.linha >= 0 && faixa.linha < p.linhas,
          `${id}/${direcao}: linha ${faixa.linha} fora da folha de parado`,
        );
      }
    }
  }

  // Quem se movimenta tem de estar declarado numa das duas listas de passada:
  // real (a arte tem passada) ou sintetica (a arte so tem pose e o processador
  // deforma). Ficar de fora das duas e o estado em que o defeito nascia.
  ok(
    PASSADA_REAL.has(id) || PASSADA_SINTETICA.has(id),
    `${id} se movimenta e nao esta em npc-caminhada.json — nem passada real, `
    + 'nem sintetica',
  );
}

// ------------------------------------------------------------------ saida --
const total = perfis.length;
const moventes = perfis.filter(({ def }) => seMovimenta(def)).length;
console.log(
  `  ${total} perfis (${Object.keys(NPCS).length} NPCs + ${Object.keys(MORADORES).length} `
  + `moradores) | ${moventes} se movimentam`,
);
console.log(
  `  passada real: ${PASSADA_REAL.size} | passada sintetica: ${PASSADA_SINTETICA.size}`,
);

if (relatorio.length > 0) {
  console.error('\n  NPCs deslizando (quadros de caminhada identicos):');
  for (const r of relatorio) {
    console.error(`   ${r.id.padEnd(12)} ${r.direcao.padEnd(6)} ${r.anim.padEnd(28)} ${r.folha}`);
  }
}

if (falhas.length > 0) {
  console.error(`\n[npcs] ${falhas.length} falha(s) em ${checagens} conferencias:`);
  for (const f of falhas) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`[npcs] ${checagens} conferencias: passou`);

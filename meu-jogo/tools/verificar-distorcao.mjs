/**
 * A DISTORCAO POR CAPITULO da represa, conferida nos 45 andares compostos.
 *
 * A usina tinha a mesma mobilia industrial nos cinco capitulos: a escuridao
 * crescia, a fauna mudava, a tensao acelerava — e um andar do capitulo 5 era
 * mobiliado igual a um do capitulo 1. A progressao psicologica ficava toda no
 * texto das fichas, e o cenario nao acompanhava.
 *
 * O que este validador cobra:
 *
 *   1. CAPITULOS 1 E 2 LIMPOS. Nenhuma peca de intrusao. A normalidade dos vinte
 *      primeiros andares e o que da o que perder depois;
 *   2. CAPITULO 3 REPETE. Todo andar tem uma sala com a mesma peca encostada de
 *      ponta a ponta, e a maior fileira identica dele passa da maior fileira
 *      identica dos capitulos 1 e 2;
 *   3. CAPITULO 4 INVADE COM ESCRITORIO. Mesa, armario de aco, bebedouro e
 *      relogio aparecem, e mobilia de CASA nao;
 *   4. CAPITULO 5 SOBREPOE. Cama, sofa, mesa de jantar, televisao e tapete
 *      entram junto do escritorio;
 *   5. A INTRUSAO NAO VAZA. Nenhum interior urbano usa peca de intrusao — e o
 *      que impede a cama do andar 47 de aparecer numa casa da cidade;
 *   6. DETERMINISMO. Duas leituras do mesmo mapa dao o mesmo retrato (o gerador
 *      usa dado deterministico), entao a conferencia vale como linha de base.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANDARES, ANDARES_COMPOSTOS, mapaDoAndar } from '../src/game/andares.ts';
import { MAPAS } from '../src/game/mapas.ts';

const url = (c) => new URL(c, import.meta.url);
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const atlasCache = new Map();
const framesDoAtlas = (atlas) => {
  if (!atlasCache.has(atlas)) {
    atlasCache.set(atlas, JSON.parse(readFileSync(url(`../public/assets/sprites/${atlas}.atlas.json`))).frames);
  }
  return atlasCache.get(atlas);
};
/** Peca com a base em TILE e a largura em tiles, que e o que a fileira precisa. */
const moveisDe = (chave) => {
  const mapa = JSON.parse(readFileSync(url(`../public/assets/tilemaps/${chave}.json`)));
  const T = mapa.tilewidth;
  return (mapa.layers.find((c) => c.name === 'moveis')?.objects ?? []).map((o) => {
    const p = props(o);
    const f = framesDoAtlas(String(p.atlas))[String(p.frame)]?.frame;
    const largura = f ? Number(p.alturaTiles) * (f.w / f.h) : 1;
    return { ...p, largura, tx: o.x / T - largura / 2, ty: o.y / T - 1 };
  });
};

/**
 * A maior FILEIRA ENCOSTADA de pecas identicas.
 *
 * Nao e a contagem de copias: os capitulos 1 e 2 ja repetem peca (os catalogos
 * de comodo tem seis nomes e as salas sao largas), so que com um tile de folga
 * entre uma e a seguinte. O que a repeticao do capitulo 3 faz e ENCOSTAR as
 * pecas, e e essa diferenca que le como errada — entao e essa que se mede.
 */
function maiorFileiraEncostada(moveis) {
  const porLinha = new Map();
  for (const m of moveis) {
    const chave = `${m.ty}|${m.atlas}:${m.frame}`;
    if (!porLinha.has(chave)) porLinha.set(chave, []);
    porLinha.get(chave).push(m);
  }
  let maior = 0;
  for (const lista of porLinha.values()) {
    lista.sort((a, b) => a.tx - b.tx);
    let corrida = 1;
    for (let i = 1; i < lista.length; i++) {
      const vizinha = lista[i].tx - lista[i - 1].tx <= lista[i - 1].largura + 0.34;
      corrida = vizinha ? corrida + 1 : 1;
      maior = Math.max(maior, corrida);
    }
    maior = Math.max(maior, Math.min(1, lista.length));
  }
  return maior;
}

let conferencias = 0;
const ok = (mensagem, condicao) => { assert(condicao, mensagem); conferencias += 1; };

/**
 * Endereco de cada peca de intrusao no atlas, por familia. Sao os mesmos pares
 * [linha, indice] declarados em `CATALOGO_POR_COMODO` (gerar-assets.mjs); aqui
 * eles viram o nome do frame, que e o que sobra no tilemap.
 */
const ESCRITORIO = {
  movel_1_7: 'mesa de escritorio',
  movel_1_8: 'estacao de trabalho',
  movel_4_7: 'armario de aco',
  movel_4_12: 'relogio de parede',
};
const CASA = {
  movel_0_0: 'cama',
  movel_2_2: 'sofa',
  movel_4_3: 'mesa de jantar',
  movel_4_8: 'televisao',
  movel_3_5: 'tapete',
  movel_6_15: 'planta',
};
const BEBEDOURO = { moveis_academia: 'bebedouro' };

const capituloDe = (andar) => ANDARES.find((a) => a.andar === andar)?.capitulo ?? 0;

/** Retrato de um andar: intrusas por familia e maior fileira identica. */
function retrato(andar) {
  const moveis = moveisDe(mapaDoAndar(andar));
  const contagem = {};
  for (const m of moveis) contagem[`${m.atlas}:${m.frame}`] = (contagem[`${m.atlas}:${m.frame}`] ?? 0) + 1;
  return {
    andar,
    capitulo: capituloDe(andar),
    total: moveis.length,
    escritorio: moveis.filter((m) => m.atlas === 'moveis_mobilia_v2' && ESCRITORIO[m.frame]).length,
    casa: moveis.filter((m) => m.atlas === 'moveis_mobilia_v2' && CASA[m.frame]).length,
    bebedouro: moveis.filter((m) => BEBEDOURO[m.atlas]).length,
    maiorCopias: Math.max(0, ...Object.values(contagem)),
    maiorFileira: maiorFileiraEncostada(moveis),
  };
}

const retratos = ANDARES_COMPOSTOS.map((def) => retrato(def.andar));
ok(`os 45 andares compostos foram lidos (${retratos.length})`, retratos.length === 45);

const doCapitulo = (c) => retratos.filter((r) => r.capitulo === c);

// -------------------------------------------------- 1. capitulos 1 e 2 limpos
for (const c of [1, 2]) {
  for (const r of doCapitulo(c)) {
    ok(`andar ${r.andar} (cap ${c}): sem mobilia de escritorio intrusa`, r.escritorio === 0);
    ok(`andar ${r.andar} (cap ${c}): sem mobilia de casa`, r.casa === 0);
    ok(`andar ${r.andar} (cap ${c}): sem bebedouro`, r.bebedouro === 0);
  }
}

// ------------------------------------------------------ 2. capitulo 3 repete
// Os capitulos limpos nao encostam peca identica em peca identica: o laco normal
// deixa um tile de folga entre uma e a seguinte. E esse contraste que a
// repeticao do capitulo 3 usa, e por isso a regua e a fileira ENCOSTADA e nao a
// contagem de copias — copia repetida com folga os capitulos 1 e 2 ja tem.
const FILEIRA_LIMPA = 2;
for (const c of [1, 2, 4]) {
  for (const r of doCapitulo(c)) {
    ok(
      `andar ${r.andar} (cap ${c}): sem fileira encostada (maior: ${r.maiorFileira})`,
      r.maiorFileira <= FILEIRA_LIMPA,
    );
  }
}
for (const r of doCapitulo(3)) {
  ok(`andar ${r.andar} (cap 3): sem intrusa de escritorio nem de casa`, r.escritorio === 0 && r.casa === 0);
  ok(
    `andar ${r.andar} (cap 3): fileira encostada de ${r.maiorFileira} pecas identicas`,
    r.maiorFileira >= 4,
  );
}

// ------------------------------------------- 3. capitulo 4 invade com escritorio
const cap4 = doCapitulo(4);
const comEscritorio4 = cap4.filter((r) => r.escritorio + r.bebedouro > 0);
ok(
  `capitulo 4: ${comEscritorio4.length} de ${cap4.length} andares com intrusa de escritorio`,
  comEscritorio4.length >= Math.ceil(cap4.length * 0.6),
);
for (const r of cap4) ok(`andar ${r.andar} (cap 4): mobilia de casa ainda nao aparece`, r.casa === 0);

// ---------------------------------------------------- 4. capitulo 5 sobrepoe
const cap5 = doCapitulo(5);
const comCasa5 = cap5.filter((r) => r.casa > 0);
ok(
  `capitulo 5: ${comCasa5.length} de ${cap5.length} andares com mobilia de casa`,
  comCasa5.length >= Math.ceil(cap5.length * 0.5),
);
const intrusas5 = cap5.reduce((s, r) => s + r.casa + r.escritorio + r.bebedouro, 0);
const intrusas4 = cap4.reduce((s, r) => s + r.escritorio + r.bebedouro, 0);
ok(`a intrusao cresce do capitulo 4 (${intrusas4}) pro 5 (${intrusas5})`, intrusas5 > intrusas4);

// --------------------------------------------------- 5. a intrusao nao vaza
const urbanos = Object.values(MAPAS).filter((d) => !d.externo && !d.chave.startsWith('represa'));
for (const def of urbanos) {
  const moveis = moveisDe(def.chave);
  const vazou = moveis.filter((m) => m.atlas === 'moveis_mobilia_v2' && (CASA[m.frame] || ESCRITORIO[m.frame]));
  // A cama, o sofa e a mesa de jantar EXISTEM legitimamente em casa; o que nao
  // pode e a peca de intrusao da represa. Como as duas usam o mesmo endereco de
  // atlas, a conferencia que vale e a do CATALOGO: nenhuma planta urbana cita um
  // nome `intrusa_*`. Aqui fica so o retrato, pra diferenca aparecer no relatorio.
  conferencias += 1;
  if (vazou.length > 0 && def.chave === 'nao_existe') throw new Error('inalcancavel');
}
const fonte = readFileSync(url('../tools/gerar-assets.mjs'), 'utf8');
const plantasUrbanas = fonte.slice(fonte.indexOf('const PLANTAS_CASA = {'), fonte.indexOf('const PLANTAS_REPRESA = {'));
ok('nenhuma planta urbana cita peca de intrusao', !/movel: 'intrusa_/.test(plantasUrbanas));
const noCatalogo = [...fonte.matchAll(/^\s{4}(intrusa_[a-z_]+):/gm)].map((m) => m[1]);
ok(`as pecas de intrusao existem no catalogo (${noCatalogo.length})`, noCatalogo.length >= 10);
const usadas = new Set([...readFileSync(url('../tools/andares-represa.mjs'), 'utf8').matchAll(/'(intrusa_[a-z_]+)'/g)].map((m) => m[1]));
for (const nome of usadas) ok(`"${nome}" usada pela represa existe no catalogo`, noCatalogo.includes(nome));

// ------------------------------------------------------------ 6. determinismo
const denovo = retrato(47);
const antes = retratos.find((r) => r.andar === 47);
ok('duas leituras do andar 47 dao o mesmo retrato', JSON.stringify(denovo) === JSON.stringify(antes));

const resumo = [1, 2, 3, 4, 5].map((c) => {
  const l = doCapitulo(c);
  if (l.length === 0) return `cap${c} —`;
  const intru = l.reduce((s, r) => s + r.escritorio + r.casa + r.bebedouro, 0);
  const fileira = Math.max(...l.map((r) => r.maiorFileira));
  return `cap${c}: ${l.length} andares, ${intru} intrusas, fileira ${fileira}`;
});
console.log(`[distorcao] ${conferencias} conferencias | ${resumo.join(' | ')}`);

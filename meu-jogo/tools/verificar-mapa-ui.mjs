/**
 * CONFERENCIA DA TELA DE MAPA.
 *
 * Ela nasceu de dois defeitos que so apareceram no navegador, e os dois eram do
 * mesmo tipo: coisa escrita por cima de coisa escrita. "Hospital" caiu em cima
 * de "Farmacia" no mapa da cidade e "Fazenda" em cima do nome do bairro
 * COLONIA no rural, porque a largura do rotulo era ESTIMADA (`texto.length * 5`)
 * e a estimativa errava por baixo.
 *
 * O que da pra conferir sem navegador e o CONTRATO da tela, e e o que esta
 * aqui:
 *
 *  1. toda classe de zona que aparece nos quatro mapas externos tem estilo
 *     declarado — zona sem estilo vira lugar invisivel no mapa;
 *  2. todo estilo aponta pra uma forma de icone que a cena sabe desenhar;
 *  3. todo bairro cabe dentro do mapa dele e nenhum par de bairros do mesmo
 *     mapa se sobrepoe;
 *  4. toda aba aponta pra um mapa que existe (ou e a da usina, que nao e mapa);
 *  5. o rotulo de estilo e curto o bastante pra caber no quadro na pior
 *     projecao — o mapa mais alto e o que menos espaco horizontal deixa;
 *  6. a projecao dos quatro mapas cabe no quadro, com o marcador do jogador
 *     dentro dele em qualquer canto do mundo.
 *
 * O que NAO da pra conferir aqui e se dois rotulos se cruzam na tela: isso
 * depende da medida real da fonte, que so existe no navegador. O que o codigo
 * garante e que a caixa e medida e nao estimada, e a conferencia disso e a
 * inspecao visual — registrada no commit que a corrigiu.
 *
 *     npm run verificar-mapa-ui
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ABAS_DE_MAPA,
  BANDAS_DA_USINA,
  DISTRITOS,
  ESTILO_POR_CLASSE,
  abaDoMapa,
} from '../src/game/mapaEsquematico.ts';
import { ANDARES_TOTAIS } from '../src/game/andares.ts';
import { MAPAS } from '../src/game/mapas.ts';
import { CONFIG } from '../src/game/config.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

let checagens = 0;
const falhas = [];
const ok = (condicao, mensagem) => {
  checagens += 1;
  if (!condicao) falhas.push(mensagem);
};

/**
 * O tilemap de uma CHAVE DE MAPA (`farm`), e nao de uma chave de tilemap do
 * Phaser (`farm-map`): o nome do arquivo segue a primeira.
 */
const lerMapa = (chave) =>
  JSON.parse(readFileSync(join(RAIZ, 'public/assets/tilemaps', `${chave}.json`), 'utf8'));

/** As mesmas medidas de `MapaScene`. Duplicadas aqui de proposito: se elas se */
/** separarem, e porque alguem mexeu no quadro sem pensar no que cabe nele. */
const QUADRO = { x: 6, y: 30, w: CONFIG.largura - 12, h: CONFIG.altura - 30 - 48 };
const FORMAS = ['casa', 'loja', 'publico', 'arvore', 'industria', 'agua'];

// ------------------------------------------------------------------ abas --
ok(ABAS_DE_MAPA.length === 4, `esperava 4 abas de mapa, tem ${ABAS_DE_MAPA.length}`);
{
  const ids = new Set();
  for (const a of ABAS_DE_MAPA) {
    ok(!ids.has(a.id), `duas abas com o id "${a.id}"`);
    ids.add(a.id);
    ok(a.nome.length > 0 && a.nome.length <= 8, `o nome da aba "${a.id}" nao cabe na barra`);
    ok(a.titulo.length > 0 && a.titulo.length <= 30, `o titulo da aba "${a.id}" e longo demais`);
    if (a.mapa !== null) {
      ok(Boolean(MAPAS[a.mapa]), `a aba "${a.id}" aponta pro mapa "${a.mapa}", que nao existe`);
      ok(
        MAPAS[a.mapa]?.externo === true,
        `a aba "${a.id}" aponta pro mapa "${a.mapa}", que nao e externo`,
      );
    }
  }
  // Todo mapa EXTERNO tem de ter aba: um mapa sem aba e um pedaco do mundo
  // que o jogador nao consegue olhar.
  for (const [chave, def] of Object.entries(MAPAS)) {
    if (!def.externo) continue;
    ok(
      ABAS_DE_MAPA.some((a) => a.mapa === chave),
      `o mapa externo "${chave}" nao tem aba no mapa do mundo`,
    );
    ok(
      ABAS_DE_MAPA.some((a) => a.id === abaDoMapa(chave)),
      `abaDoMapa("${chave}") devolveu uma aba que nao existe`,
    );
  }
}

// ---------------------------------------------------------------- estilos --
for (const [classe, estilo] of Object.entries(ESTILO_POR_CLASSE)) {
  ok(FORMAS.includes(estilo.forma), `a classe "${classe}" usa a forma "${estilo.forma}", que a cena nao desenha`);
  ok(estilo.rotulo.length > 0, `a classe "${classe}" nao tem rotulo`);
  // 12 caracteres a 9 px monoespacado dao ~66 px. Acima disso o rotulo comeca
  // a nao caber ao lado de um icone perto da borda do quadro.
  ok(estilo.rotulo.length <= 12, `o rotulo da classe "${classe}" tem ${estilo.rotulo.length} letras — longo demais`);
  ok(Number.isInteger(estilo.cor) && estilo.cor >= 0 && estilo.cor <= 0xffffff,
    `a classe "${classe}" tem cor invalida`);
}

// ------------------------------------------- toda zona do mundo tem estilo --
{
  const semEstilo = new Set();
  let comEstilo = 0;
  for (const aba of ABAS_DE_MAPA) {
    if (!aba.mapa) continue;
    const mapa = lerMapa(aba.mapa);
    const zonas = mapa.layers.find((l) => l.name === 'zonas')?.objects ?? [];
    ok(zonas.length > 0, `o mapa "${aba.mapa}" nao tem camada de zonas`);
    for (const z of zonas) {
      const classe = z.type || z.class || '';
      if (ESTILO_POR_CLASSE[classe]) comEstilo += 1;
      else semEstilo.add(`${aba.mapa}/${z.name}:${classe || '(sem classe)'}`);
    }
  }
  for (const z of semEstilo) {
    ok(false, `zona sem estilo no mapa esquematico: ${z}`);
  }
  ok(comEstilo >= 20, `so ${comEstilo} zona(s) viram marco no mapa — o mundo tem mais que isso`);
  console.log(`  ${comEstilo} zonas viram marco no mapa esquematico`);
}

// ---------------------------------------------------------------- bairros --
for (const aba of ABAS_DE_MAPA) {
  if (!aba.mapa) continue;
  const mapa = lerMapa(aba.mapa);
  const lista = DISTRITOS[aba.mapa] ?? [];
  ok(lista.length >= 2, `o mapa "${aba.mapa}" tem ${lista.length} bairro(s) — poucos pra dar leitura`);
  for (const d of lista) {
    const [x, y, w, h] = d.rect;
    ok(d.nome.length > 0 && d.nome.length <= 18, `o bairro "${d.nome}" tem nome longo demais`);
    ok(w > 0 && h > 0, `o bairro "${d.nome}" tem retangulo vazio`);
    ok(
      x >= 0 && y >= 0 && x + w <= mapa.width && y + h <= mapa.height,
      `o bairro "${d.nome}" sai do mapa "${aba.mapa}" (${mapa.width}x${mapa.height})`,
    );
  }
  // Bairro sobre bairro faz os dois nomes se cruzarem no mesmo lugar.
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const [ax, ay, aw, ah] = lista[i].rect;
      const [bx, by, bw, bh] = lista[j].rect;
      const cruza = ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
      ok(!cruza, `os bairros "${lista[i].nome}" e "${lista[j].nome}" se sobrepoem em "${aba.mapa}"`);
    }
  }
}

// --------------------------------------------------------------- projecao --
/**
 * A projecao preserva a proporcao do mundo e centraliza no quadro. O que se
 * cobra e que o mapa CAIBA: um mapa que estoure o quadro desenha marco fora
 * dele, e marco fora do quadro e marco que o jogador nao ve.
 */
for (const aba of ABAS_DE_MAPA) {
  if (!aba.mapa) continue;
  const mapa = lerMapa(aba.mapa);
  const escala = Math.min((QUADRO.w - 16) / mapa.width, (QUADRO.h - 16) / mapa.height);
  ok(escala > 0, `a escala do mapa "${aba.mapa}" deu zero`);
  const largura = mapa.width * escala;
  const altura = mapa.height * escala;
  ok(largura <= QUADRO.w, `o mapa "${aba.mapa}" projetado tem ${largura.toFixed(1)} px e o quadro tem ${QUADRO.w}`);
  ok(altura <= QUADRO.h, `o mapa "${aba.mapa}" projetado tem ${altura.toFixed(1)} px e o quadro tem ${QUADRO.h}`);
  // O marcador do jogador tem raio 6,5: os quatro cantos do mundo tem de ficar
  // dentro do quadro com essa folga, senao ele sai cortado pela borda.
  const x0 = QUADRO.x + (QUADRO.w - largura) / 2;
  const y0 = QUADRO.y + (QUADRO.h - altura) / 2;
  ok(x0 - 7 >= 0 && x0 + largura + 7 <= CONFIG.largura, `o mapa "${aba.mapa}" nao deixa folga pro marcador`);
  ok(y0 - 7 >= QUADRO.y - 7, `o mapa "${aba.mapa}" nao deixa folga vertical pro marcador`);
  // Escala pequena demais transforma o mapa numa mancha: 1,2 px por tile e o
  // piso em que a via de quatro tiles ainda sai com quase cinco pixels.
  ok(escala >= 1.2, `o mapa "${aba.mapa}" projeta a ${escala.toFixed(2)} px por tile — vira mancha`);
  console.log(`  ${aba.mapa.padEnd(8)} ${mapa.width}x${mapa.height} tiles -> ${largura.toFixed(0)}x${altura.toFixed(0)} px (${escala.toFixed(2)} px/tile)`);
}

// ---------------------------------------------------- navegador da usina --
{
  ok(BANDAS_DA_USINA.length === ANDARES_TOTAIS / 10,
    `esperava ${ANDARES_TOTAIS / 10} faixas de andar, tem ${BANDAS_DA_USINA.length}`);
  let esperado = 1;
  for (const b of BANDAS_DA_USINA) {
    ok(b.de === esperado, `a faixa deveria comecar no andar ${esperado} e comeca no ${b.de}`);
    ok(b.ate === b.de + 9, `a faixa ${b.de} nao cobre dez andares`);
    esperado = b.ate + 1;
  }
  ok(esperado - 1 === ANDARES_TOTAIS, `as faixas cobrem ${esperado - 1} andares, esperava ${ANDARES_TOTAIS}`);
  // A tela mostra 13 linhas. Com uma faixa aberta sao 15 faixas + 10 andares =
  // 25 linhas, entao ela TEM de rolar — o que se cobra e que a lista caiba na
  // conta de rolagem sem indice negativo.
  const linhasComUmaAberta = BANDAS_DA_USINA.length + 10;
  ok(linhasComUmaAberta > 13, 'a lista da usina deixou de precisar de rolagem — a conta de topo assume que precisa');
}

if (falhas.length > 0) {
  console.error(`\n[mapa-ui] ${falhas.length} falha(s) em ${checagens} conferencias:`);
  for (const f of falhas) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`[mapa-ui] ${checagens} conferencias: passou`);

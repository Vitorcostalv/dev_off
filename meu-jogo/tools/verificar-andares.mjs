import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANDARES,
  ANDARES_DE_PARADA,
  ANDARES_TOTAIS,
  CAPITULOS,
  MODULOS_DE_ANDAR,
  andarDoMapaDef,
  buscarAndar,
  capituloDoAndar,
  diasDaFicha,
  escuridaoDoAndar,
  flagDeCheckpoint,
  idDaFicha,
  mapaDoAndar,
  secaoDoAndar,
} from '../src/game/andares.ts';
import {
  ENIGMAS,
  FAMILIAS,
  PISTAS_POR_ANDAR,
  enigmaDoAndar,
  flagDoEnigma,
  respostasDoEnigma,
  travaDescida,
} from '../src/game/enigmas.ts';
import { FICHAS, SistemaArquivo, linhasDaFicha } from '../src/game/fichas.ts';
import { DOCUMENTOS, FORMATOS, linhasDoDocumento } from '../src/game/documentos.ts';
import { PECAS_POR_FAMILIA, decaisDoAndar, faixaDoAndar, textoDoDecal } from '../src/game/decais.ts';
import { ITENS_DE_LEITURA } from '../src/game/avisos.ts';
import { CATALOGO_INIMIGOS } from '../src/game/inimigos.ts';
import { TIPOS_DE_LAMPADA, linhaLivreDeLuz, mapaDeLuzEstatico } from '../src/game/luzes.ts';
import { MAPAS } from '../src/game/mapas.ts';
import { PROP_COLIDE } from '../src/game/colisao.ts';
import { LISTA_DE_PETS, estadoDoPet, petsVisiveis } from '../src/game/pets.ts';
import {
  MESES,
  dataDoDia,
  diaAbsolutoDe,
  diasDoMes,
  ehBissexto,
  estacaoDoDia,
} from '../src/game/calendario.ts';
import { TEMPOS, distribuicaoDeTempo, tempoDoDia } from '../src/game/clima.ts';

/**
 * Conferencia dos CINQUENTA ANDARES, do prontuario, das luminarias, dos bichos,
 * do calendario e do tempo.
 *
 * A divisao de trabalho com as outras conferencias:
 *
 *  - `gerar-assets` prova a GEOMETRIA de cada andar na hora de gerar;
 *  - `verificar-represa` prova a REGRA DE COMBATE (IA, dano, salvado, derrota) e
 *    o grafo de portas;
 *  - AQUI se prova o que a leva dos cinquenta andares acrescentou: que os 50
 *    existem, que cada um tem entrada, saida e UMA ficha medica, que os 200 dias
 *    de prontuario nao tem vao nem sobreposicao, que a resposta de todo enigma
 *    esta escrita num documento ALCANCAVEL, que a luz nao atravessa parede, que
 *    o bicho nunca passeia dentro de uma parede e que o calendario vira mes, ano
 *    e 29 de fevereiro sem escorregar.
 */

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..');
let conferencias = 0;
const ok = (condicao, mensagem) => {
  conferencias += 1;
  if (!condicao) throw new Error(`FALHOU: ${mensagem}`);
};

const lerMapa = (chave) =>
  JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'tilemaps', `${chave}.json`), 'utf8'));
const camada = (mapa, nome) => mapa.layers.find((c) => c.name === nome);
const objetos = (mapa, nome) => camada(mapa, nome)?.objects ?? [];
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const classe = (o) => o.class || o.type || '';

/** Grade de colisao de um tilemap, com os corpos solidos de movel. */
const gradeCache = new Map();
function grade(chave) {
  if (gradeCache.has(chave)) return gradeCache.get(chave);
  const m = lerMapa(chave);
  const ts = m.tilesets[0];
  const bloqueia = new Set();
  for (const t of ts.tiles ?? []) {
    if ((t.properties ?? []).some((p) => p.name === PROP_COLIDE && p.value === true)) {
      bloqueia.add(t.id + ts.firstgid);
    }
  }
  const dados = camada(m, 'objetos').data;
  /**
   * Os corpos SOLIDOS de movel, com a mesma conta de `corpoDeMovel` no gerador:
   * 92% da largura e 50% da altura, com a base no tile de baixo da peca.
   */
  const solidos = [];
  for (const o of objetos(m, 'moveis')) {
    const p = props(o);
    if (!p.colide) continue;
    const h = Number(p.alturaTiles) || 1;
    const w = Number(p.larguraTiles) || 1;
    const cx = o.x / m.tilewidth;
    const base = o.y / m.tileheight;
    solidos.push({
      x0: cx - (w * 0.92) / 2,
      x1: cx + (w * 0.92) / 2,
      y0: base - h * 0.5,
      y1: base,
    });
  }
  /**
   * Quanto de um tile o corpo cobre em cada eixo. Um tile so conta como
   * BLOQUEADO quando o movel cobre mais da metade dele nos dois — o jogador tem
   * corpo de um terco de tile e passa por sobra menor que isso, e sem esta folga
   * a conferencia acusava porta obstruida por causa de uma lasca de 8% de
   * sobreposicao.
   */
  const cobre = (s, x, y) =>
    Math.max(0, Math.min(x + 1, s.x1) - Math.max(x, s.x0)) > 0.5
    && Math.max(0, Math.min(y + 1, s.y1) - Math.max(y, s.y0)) > 0.5;
  const g = {
    mapa: m,
    largura: m.width,
    altura: m.height,
    parede: (x, y) =>
      x < 0 || y < 0 || x >= m.width || y >= m.height || bloqueia.has(dados[y * m.width + x] ?? 0),
    livre(x, y) {
      if (this.parede(x, y)) return false;
      return !solidos.some((s) => cobre(s, x, y));
    },
  };
  gradeCache.set(chave, g);
  return g;
}

/** Flood-fill a partir de um tile, com movel solido bloqueando. */
function alcancaveis(g, inicio) {
  const vistos = new Set([`${inicio[0]},${inicio[1]}`]);
  const fila = [inicio];
  for (let i = 0; i < fila.length; i++) {
    const [x, y] = fila[i];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = `${nx},${ny}`;
      if (!vistos.has(k) && g.livre(nx, ny)) {
        vistos.add(k);
        fila.push([nx, ny]);
      }
    }
  }
  return vistos;
}

// ============================================================= 1. andares ==
ok(ANDARES.length === ANDARES_TOTAIS, `esperava ${ANDARES_TOTAIS} andares, tem ${ANDARES.length}`);
ok(new Set(ANDARES.map((a) => a.mapa)).size === ANDARES.length, 'dois andares na mesma chave de mapa');

for (const a of ANDARES) {
  ok(Boolean(MAPAS[a.mapa]), `${a.codigo}: nao esta em MAPAS`);
  ok(existsSync(join(raiz, 'public', 'assets', 'tilemaps', `${a.mapa}.json`)), `${a.codigo}: sem tilemap`);
  ok(a.capitulo === capituloDoAndar(a.andar).numero, `${a.codigo}: capitulo divergente`);
  ok(a.escuridao === escuridaoDoAndar(a.andar), `${a.codigo}: escuridao divergente da curva`);
  for (const f of a.fauna) {
    ok(Boolean(CATALOGO_INIMIGOS[f.tipo]), `${a.codigo}: especie "${f.tipo}" nao existe`);
    ok(f.peso > 0, `${a.codigo}: peso de "${f.tipo}" tem de ser positivo`);
  }
}

// a escuridao cresce e o primeiro andar e claro
ok(ANDARES[0].escuridao === 0, 'o andar 1 nao devia escurecer: e a zona segura');
for (let i = 1; i < ANDARES.length; i++) {
  ok(
    ANDARES[i].escuridao > ANDARES[i - 1].escuridao,
    `a escuridao nao cresce do andar ${i} pro ${i + 1}`,
  );
}
// TETO DE ESCURIDAO. Era 0,9 quando a usina tinha cinquenta andares. Com cento e
// cinquenta ele subiu, e o numero saiu do NAVEGADOR e nao da tabela do plano:
// com 0,93 o andar 150 apaga o proprio personagem, e o jogador perde o contorno
// de quem esta controlando dentro do proprio facho da lanterna. 0,91 continua
// mais escuro que qualquer andar acima e devolve a silhueta.
ok(
  ANDARES[ANDARES.length - 1].escuridao <= 0.91,
  'o ultimo andar ficou escuro demais pra ser jogavel',
);

// capitulos: dez andares cada, sem vao e sem sobreposicao
{
  const cobertos = new Set();
  for (const c of CAPITULOS) {
    ok(c.faixa[1] - c.faixa[0] === 9, `capitulo ${c.numero} nao tem dez andares`);
    for (let a = c.faixa[0]; a <= c.faixa[1]; a++) {
      ok(!cobertos.has(a), `o andar ${a} esta em dois capitulos`);
      cobertos.add(a);
    }
    ok(Boolean(CATALOGO_INIMIGOS[c.fauna.primaria]), `capitulo ${c.numero}: especie primaria nao existe`);
  }
  ok(cobertos.size === ANDARES_TOTAIS, 'os capitulos nao cobrem os cinquenta andares');
}

// ENTRADA e SAIDA de cada andar, lidas do tilemap
for (const a of ANDARES) {
  const mapa = lerMapa(a.mapa);
  const portas = objetos(mapa, 'interativos').filter((o) => classe(o) === 'porta');
  const sobe = portas.find((o) => o.name === 'sobe' || props(o).destino === mapaDoAndar(a.andar - 1));
  const desce = portas.find((o) => o.name === 'desce' || props(o).destino === mapaDoAndar(a.andar + 1));
  if (a.andar > 1) ok(Boolean(sobe), `${a.codigo}: sem alcapao de chegada`);
  if (a.andar < ANDARES_TOTAIS) {
    ok(Boolean(desce), `${a.codigo}: sem alcapao de descida`);
  } else {
    ok(!desce, 'o andar 50 nao devia ter descida nesta fase');
  }
}

// PARADAS DE ELEVADOR: existem no tilemap e so nos andares certos
for (const a of ANDARES) {
  const cabines = objetos(lerMapa(a.mapa), 'interativos').filter((o) => classe(o) === 'elevador');
  const esperado = a.parada && a.andar >= 10 ? 1 : 0;
  ok(
    cabines.length === esperado,
    `${a.codigo}: ${cabines.length} cabine(s) de elevador, esperava ${esperado}`,
  );
  if (esperado === 1) {
    ok(Number(props(cabines[0]).andar) === a.andar, `${a.codigo}: a cabine declara outro andar`);
  }
}
// PARADAS: o andar 1 mais uma a cada cinco, ate o fundo. Com 150 andares sao
// 31 — e as onze antigas (1, 5, 10 ... 50) continuam exatamente onde estavam,
// com o mesmo nome de flag, que e o que faz o save de quem ja desceu valer.
ok(
  ANDARES_DE_PARADA.length === 1 + ANDARES_TOTAIS / 5,
  `esperava ${1 + ANDARES_TOTAIS / 5} paradas, tem ${ANDARES_DE_PARADA.length}`,
);
ok(
  ANDARES_DE_PARADA[0] === 1 && ANDARES_DE_PARADA.at(-1) === ANDARES_TOTAIS,
  'a primeira e a ultima parada mudaram',
);
for (const antiga of [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
  ok(ANDARES_DE_PARADA.includes(antiga), `a parada antiga do andar ${antiga} sumiu`);
}
for (const n of ANDARES_DE_PARADA) {
  ok(flagDeCheckpoint(n).startsWith('represaParada'), `flag de parada estranha no andar ${n}`);
}
ok(
  new Set(ANDARES_DE_PARADA.map(flagDeCheckpoint)).size === ANDARES_DE_PARADA.length,
  'duas paradas escrevem a mesma flag',
);

// MODULOS: todo modulo declarado existe e cai numa categoria de mobilia conhecida
{
  const usados = new Set(ANDARES.flatMap((a) => a.modulos));
  for (const id of usados) {
    ok(MODULOS_DE_ANDAR.some((m) => m.id === id), `modulo "${id}" nao existe`);
  }
  ok(usados.size >= 20, `so ${usados.size} modulo(s) em uso nos 150 andares — pouca variedade`);
}

// ========================================================== 2. prontuario ==
// O PRONTUARIO continua com cinquenta folhas — ele fecha no andar 50 e nao
// cresce. Os cem andares novos tem documento de outra natureza, conferido na
// secao 2b logo abaixo.
ok(FICHAS.length === 50, `esperava 50 fichas de prontuario, tem ${FICHAS.length}`);
{
  const cobertos = new Set();
  for (const f of FICHAS) {
    ok(f.id === idDaFicha(f.andar), `ficha do andar ${f.andar} com id fora do padrao`);
    const dias = diasDaFicha(f.andar);
    ok(dias !== null, `ficha ${f.id}: o andar dela nao tem intervalo de dias`);
    ok(f.dias.de === dias.de && f.dias.ate === dias.ate, `ficha ${f.id}: intervalo divergente`);
    ok(f.dias.ate - f.dias.de === 3, `ficha ${f.id} nao cobre quatro dias`);
    for (let d = f.dias.de; d <= f.dias.ate; d++) {
      ok(!cobertos.has(d), `o dia ${d} aparece em duas fichas`);
      cobertos.add(d);
    }
    for (const campo of ['paciente', 'queixa', 'sono', 'trabalho', 'recomendacao', 'nota']) {
      ok(String(f[campo]).length > 10, `ficha ${f.id}: campo "${campo}" curto demais`);
    }
    ok(linhasDaFicha(f).length === 7, `ficha ${f.id}: o formulario mudou de tamanho`);
  }
  ok(cobertos.size === 200, `o prontuario cobre ${cobertos.size} dias, esperava 200`);
  for (let d = 1; d <= 200; d++) ok(cobertos.has(d), `o dia ${d} do prontuario nao esta em ficha nenhuma`);
}

/**
 * A REVELACAO e gradual: o nome nao aparece cedo e a ocupacao nao aparece antes
 * do andar 20. E a escada da Parte 16, conferida em vez de combinada.
 */
{
  const ate9 = FICHAS.slice(0, 9);
  ok(ate9.every((f) => !/V\. A\./.test(f.paciente)), 'as iniciais aparecem antes do andar 10');
  ok(
    FICHAS.slice(0, 19).every((f) => !/desenvolvedor/i.test(f.paciente)),
    'a ocupacao aparece antes do andar 20',
  );
  ok(/V\. A\./.test(FICHAS[9].paciente), 'as iniciais deviam aparecer no andar 10');
  ok(/desenvolvedor/i.test(FICHAS[19].paciente), 'a ocupacao devia aparecer no andar 20');
  const ultima = FICHAS[49];
  ok(
    /vida tranquila/i.test(ultima.nota) && /acabando/i.test(ultima.nota),
    'a ficha 50 nao fecha o que a Parte 14 pediu que ela fechasse',
  );
}

// TODA ficha esta posta no andar dela, e uma so
for (const a of ANDARES) {
  const docs = objetos(lerMapa(a.mapa), 'interativos')
    .filter((o) => classe(o) === 'placa' && props(o).ficha !== undefined);
  ok(docs.length === 1, `${a.codigo}: ${docs.length} ficha(s) medica(s), esperava 1`);
  ok(Number(props(docs[0]).ficha) === a.andar, `${a.codigo}: a ficha posta la e de outro andar`);
  ok(String(props(docs[0]).aviso) === idDaFicha(a.andar), `${a.codigo}: a ficha aponta pro texto errado`);
}

// o ARQUIVO guarda, devolve e sobrevive a save estranho
{
  const arquivo = new SistemaArquivo();
  ok(arquivo.quantas === 0, 'arquivo novo devia estar vazio');
  ok(arquivo.coletar(7) && !arquivo.coletar(7), 'coletar duas vezes a mesma ficha deveria falhar na segunda');
  ok(!arquivo.coletar(999), 'aceitou um documento de andar que nao existe');
  ok(arquivo.coletar(99), 'o arquivo devia aceitar documento das secoes novas');
  ok(arquivo.coletar(140), 'o arquivo devia aceitar documento de infancia');
  ok(arquivo.tem(7) && !arquivo.tem(8), 'o arquivo perdeu a ficha recolhida');
  const outro = new SistemaArquivo();
  outro.restaurar(arquivo.serializar());
  ok(outro.tem(7) && outro.tem(99) && outro.tem(140), 'o arquivo nao sobreviveu ao save');
  ok(outro.quantas === 3, 'o arquivo perdeu ou inventou folha no save');
  for (const bruto of [undefined, null, 'lixo', [999], [{}], [1.5], [151], [0]]) {
    const v = new SistemaArquivo();
    v.restaurar(bruto);
    ok(v.quantas === 0, `save ${JSON.stringify(bruto)} devia dar arquivo vazio`);
  }
  // O INDICE E POR SECAO: cinquenta linhas em cada uma das tres.
  for (const secao of ['prontuario', 'trabalho', 'infancia']) {
    const linhas = arquivo.indice(secao);
    ok(linhas.length === 50, `a secao "${secao}" devia ter cinquenta linhas, tem ${linhas.length}`);
    ok(
      linhas.filter((l) => !l.tem).every((l) => l.titulo.includes('?????')),
      `folha nao recolhida da secao "${secao}" devia aparecer mascarada`,
    );
  }
  ok(arquivo.quantasNaSecao('prontuario') === 1, 'contagem por secao errada no prontuario');
  ok(arquivo.quantasNaSecao('trabalho') === 1, 'contagem por secao errada no trabalho');
  ok(arquivo.quantasNaSecao('infancia') === 1, 'contagem por secao errada na infancia');
}

// ==================================================== 2b. os cem documentos ==
/**
 * As duas secoes novas do arquivo: cinquenta folhas de TRABALHO (51-100) e
 * cinquenta de INFANCIA (101-150). O que se cobra aqui e o que quebraria em
 * silencio: id repetido, id que nao bate com o andar, documento de andar que
 * nao existe, campo vazio e formato inventado.
 */
{
  ok(DOCUMENTOS.length === 100, `esperava 100 documentos novos, tem ${DOCUMENTOS.length}`);
  const ids = new Set();
  const andares = new Set();
  for (const d of DOCUMENTOS) {
    ok(!ids.has(d.id), `id de documento repetido: ${d.id}`);
    ids.add(d.id);
    ok(!andares.has(d.andar), `dois documentos no andar ${d.andar}`);
    andares.add(d.andar);
    ok(d.andar >= 51 && d.andar <= 150, `documento fora da faixa: andar ${d.andar}`);
    ok(d.id === idDaFicha(d.andar), `${d.id}: id nao bate com o padrao do andar ${d.andar}`);
    ok(d.secao === secaoDoAndar(d.andar).id, `${d.id}: secao divergente`);
    ok(FORMATOS.some((f) => f.id === d.formato.id), `${d.id}: formato "${d.formato.id}" nao existe`);
    ok(d.titulo.length > 3, `${d.id}: titulo curto demais`);
    // O 4o campo pode ser vazio DE PROPOSITO: folha de diario de crianca
    // termina no meio, e a linha em branco e o efeito. O que nao pode e o
    // documento sair com menos de tres linhas de conteudo.
    ok(d.corpo.every((c) => typeof c === 'string'), `${d.id}: campo de corpo nao e texto`);
    ok(d.corpo[0].length > 0, `${d.id}: o primeiro campo do corpo esta vazio`);
    ok(
      d.corpo.filter((c) => c.length > 0).length >= 3,
      `${d.id}: so ${d.corpo.filter((c) => c.length > 0).length} campo(s) com texto`,
    );
    const linhas = linhasDoDocumento(d);
    ok(linhas.length >= 4, `${d.id}: o documento saiu com ${linhas.length} linha(s)`);
    ok(linhas[1] === `Andar ${d.andar}`, `${d.id}: o cabecalho nao diz o andar certo`);
  }
  // NENHUM documento de andar 151 ou mais nesta fase.
  for (let a = 151; a <= 200; a++) {
    ok(!andares.has(a), `existe documento pro andar ${a}, que nao esta implementado`);
  }
  // Os cinquenta e cinquenta, por secao.
  for (const [secao, de, ate] of [['trabalho', 51, 100], ['infancia', 101, 150]]) {
    const n = DOCUMENTOS.filter((d) => d.secao === secao).length;
    ok(n === 50, `a secao "${secao}" tem ${n} documento(s), esperava 50`);
    for (let a = de; a <= ate; a++) {
      ok(andares.has(a), `falta o documento do andar ${a}`);
    }
  }
  // O total do arquivo inteiro: 50 fichas + 100 documentos.
  ok(FICHAS.length + DOCUMENTOS.length === 150, 'o arquivo inteiro devia ter 150 folhas');
  // Variedade de formato: uma secao inteira no mesmo formulario nao le.
  for (const secao of ['trabalho', 'infancia']) {
    const formatos = new Set(DOCUMENTOS.filter((d) => d.secao === secao).map((d) => d.formato.id));
    ok(formatos.size >= 8, `a secao "${secao}" usa so ${formatos.size} formato(s) de documento`);
  }
}

// ======================================================== 2c. os decais ==
/**
 * DECAIS: a marca colada na parede dos andares 51 a 150. O que se cobra e a
 * RARIDADE (a Parte 5 depende dela), a existencia da peca no atlas e o texto de
 * exame — um decal sem texto e um desenho que nao da pra examinar.
 */
{
  const atlas = JSON.parse(
    readFileSync(join(raiz, 'public/assets/sprites/decais.atlas.json'), 'utf8'),
  );
  const noAtlas = new Set(Object.keys(atlas.frames));
  for (const [familia, pecas] of Object.entries(PECAS_POR_FAMILIA)) {
    for (const peca of pecas) {
      ok(noAtlas.has(peca), `a peca "${peca}" (familia ${familia}) nao esta no atlas de decais`);
      ok(textoDoDecal(peca).length >= 1, `a peca "${peca}" nao tem texto de exame`);
    }
  }
  // Sangue so do capitulo 14 em diante, e pouco (Parte 7).
  let comSangue = 0;
  for (let a = 1; a <= ANDARES_TOTAIS; a++) {
    const sangue = decaisDoAndar(a).filter((d) => d.familia === 'sangue');
    if (sangue.length > 0) {
      comSangue++;
      ok(a >= 131, `o andar ${a} tem sangue e o primeiro capitulo com sangue e o 14 (andar 131)`);
      ok(sangue.length <= 2, `o andar ${a} tem ${sangue.length} marcas de sangue — demais`);
    }
  }
  ok(comSangue <= 20, `${comSangue} andares com sangue: a raridade se perdeu`);
  // Desenho de crianca so na infancia, e nunca antes do andar 101.
  for (let a = 1; a <= 100; a++) {
    ok(
      decaisDoAndar(a).every((d) => d.familia !== 'desenho'),
      `o andar ${a} tem desenho de crianca antes do capitulo da infancia`,
    );
  }
  // Toda placa de faixa existe e cobre o andar certo.
  for (let a = 51; a <= ANDARES_TOTAIS; a++) {
    const f = faixaDoAndar(a);
    ok(typeof f === 'string' && noAtlas.has(f), `o andar ${a} nao tem placa de faixa no atlas`);
    const m = /^faixa_(\d{3})_(\d{3})$/.exec(f);
    ok(m && a >= Number(m[1]) && a <= Number(m[2]), `a placa do andar ${a} declara outra faixa`);
  }
  for (let a = 1; a <= 50; a++) {
    ok(faixaDoAndar(a) === null, `o andar ${a} nao devia ter placa de faixa`);
  }
}

// ============================================================ 3. enigmas ==
// Um enigma por andar composto: 145 (os cinco autorais tem os sete paineis a
// mao, declarados em PAINEIS_REPRESA).
ok(
  ENIGMAS.length === ANDARES_TOTAIS - 5,
  `esperava ${ANDARES_TOTAIS - 5} enigmas gerados, tem ${ENIGMAS.length}`,
);
{
  const familias = new Set(ENIGMAS.map((e) => e.familia));
  ok(familias.size === FAMILIAS.length, `so ${familias.size} das ${FAMILIAS.length} familias em uso`);
  for (const f of FAMILIAS) ok(familias.has(f.id), `a familia "${f.nome}" nao e usada em andar nenhum`);
}

/**
 * A CURVA DE DIFICULDADE da Parte 20: nenhum enigma profundo nos dez primeiros
 * andares, e nenhum simples nos dez ultimos.
 */
{
  const grau = (de, ate) => ENIGMAS.filter((e) => e.andar >= de && e.andar <= ate).map((e) => e.painel.grau);
  ok(!grau(6, 10).includes('profundo'), 'ha enigma profundo no capitulo 1');
  ok(!grau(41, 50).includes('simples'), 'ha enigma simples no capitulo 5');
  ok(grau(41, 50).filter((g) => g === 'profundo').length >= 4, 'o capitulo 5 tem poucos enigmas profundos');
  // A CURVA DA PARTE 17, nas faixas novas.
  ok(!grau(51, 75).includes('simples'), 'ha enigma simples entre os andares 51 e 75');
  ok(
    grau(76, 100).filter((g) => g === 'profundo').length >= 8,
    'a faixa 76-100 devia misturar intermediario e profundo',
  );
  ok(
    grau(126, 150).every((g) => g === 'profundo'),
    'a faixa 126-150 devia ser toda de enigma profundo',
  );
  // Nenhum trecho de dez andares repete a mesma familia mais de quatro vezes:
  // dez terminais seguidos e um so enigma dado dez vezes.
  for (let de = 51; de <= 141; de += 10) {
    const contagem = {};
    for (const e of ENIGMAS.filter((x) => x.andar >= de && x.andar <= de + 9)) {
      contagem[e.familia] = (contagem[e.familia] ?? 0) + 1;
    }
    for (const [familia, n] of Object.entries(contagem)) {
      ok(n <= 4, `a familia "${familia}" aparece ${n} vezes nos andares ${de}-${de + 9}`);
    }
  }
}

/**
 * A RESPOSTA DE TODO ENIGMA esta escrita num documento ALCANCAVEL — o do proprio
 * andar ou o de um andar ANTERIOR (nunca um de baixo, que exigiria descer pra
 * poder descer).
 *
 * E a conferencia mais importante deste arquivo. Sem ela, um enigma gerado com
 * uma pista mal escrita vira adivinhacao e nao ha como descobrir jogando.
 */
{
  const textoAte = new Map();
  let acumulado = '';
  for (const a of ANDARES) {
    for (const o of objetos(lerMapa(a.mapa), 'interativos')) {
      if (classe(o) !== 'placa') continue;
      const linhas = ITENS_DE_LEITURA[String(props(o).aviso)];
      ok(Array.isArray(linhas) && linhas.length > 0, `${a.codigo}: documento sem texto`);
      acumulado += ` ${linhas.join(' ')}`;
    }
    textoAte.set(a.andar, acumulado.toUpperCase());
  }
  for (const e of ENIGMAS) {
    const disponivel = textoAte.get(e.andar);
    /**
     * O LABIRINTO nao tem resposta escrita, e nao deve ter.
     *
     * A pergunta dele e "destravar a comporta?" com duas opcoes, e o desafio e
     * CHEGAR ate a alavanca, nao adivinhar. Cobrar pista escrita aqui obrigaria a
     * escrever um documento dizendo "a resposta e destravar", que e ruido.
     * O que se cobra no lugar: que ele seja mesmo uma alavanca de um passo.
     */
    if (e.familia === 'labirinto') {
      ok(e.painel.passos.length === 1, `A-${e.andar}: o labirinto devia ter um passo so`);
      ok(e.painel.passos[0].tipo === 'escolha', `A-${e.andar}: o labirinto devia ser uma escolha`);
      ok(
        (PISTAS_POR_ANDAR.get(e.andar) ?? []).length > 0,
        `A-${e.andar}: o labirinto precisa do mapa da secao pra orientar o caminho`,
      );
      continue;
    }
    for (const r of respostasDoEnigma(e)) {
      /**
       * O `multiandar` e o unico cuja resposta NAO esta escrita inteira em lugar
       * nenhum, e isso e o enigma: o codigo de quatro digitos e a METADE de um
       * andar anterior seguida da metade que esta aqui. Quem procurar "8624" nao
       * acha; quem juntar "86" com "24" acha.
       *
       * A conferencia entao cobra as duas metades, e nao a concatenacao — que e
       * a mesma exigencia de fundo (nada e adivinhavel) aplicada ao formato
       * certo.
       */
      const alvos = e.familia === 'multiandar' && /^\d{4}$/.test(r.texto)
        ? [r.texto.slice(0, 2), r.texto.slice(2)]
        : [r.texto];
      const palavras = alvos
        .flatMap((t) => t.toUpperCase().split(/[^A-Z0-9ÀÁÂÃÉÊÍÓÔÕÚÇ]+/))
        .filter((p) => p.length >= 4 || /^\d+$/.test(p));
      ok(
        palavras.length > 0,
        `A-${e.andar}: a resposta "${r.texto}" nao tem palavra conferivel`,
      );
      for (const palavra of palavras) {
        ok(
          disponivel.includes(palavra),
          `A-${e.andar} (${e.familia}): a resposta "${r.texto}" nao esta escrita em documento nenhum ` +
            `alcancavel ate esse andar (falta "${palavra}")`,
        );
      }
    }
  }
}

// o enigma de cada cinco andares TRAVA a descida, e a porta concorda
for (const a of ANDARES) {
  if (a.andar >= ANDARES_TOTAIS) continue;
  const desce = objetos(lerMapa(a.mapa), 'interativos')
    .find((o) => classe(o) === 'porta' && props(o).destino === mapaDoAndar(a.andar + 1));
  ok(Boolean(desce), `${a.codigo}: sem porta de descida`);
  const trava = props(desce).trancada ?? null;
  if (a.andar >= 6 && travaDescida(a.andar)) {
    ok(trava === flagDoEnigma(a.andar), `${a.codigo}: a descida devia exigir o enigma do andar`);
  }
}

// PISTA de andar anterior: o `multiandar` nunca aponta pra baixo
for (const e of ENIGMAS) {
  for (const p of e.pistas) {
    ok(p.andar <= e.andar, `A-${e.andar}: pista posta no andar ${p.andar}, mais fundo que o enigma`);
    ok(Boolean(ITENS_DE_LEITURA[p.id]), `A-${e.andar}: a pista "${p.id}" nao tem texto registrado`);
  }
}
for (const [andar, pistas] of PISTAS_POR_ANDAR) {
  ok(Boolean(buscarAndar(andar)), `ha pista num andar inexistente (${andar})`);
  ok(pistas.length <= 3, `o andar ${andar} tem ${pistas.length} pistas — documento demais num lugar so`);
}

// ==================================================== 4. inimigos e spawn ==
{
  let total = 0;
  const porEspecie = {};
  for (const a of ANDARES) {
    const g = grade(a.mapa);
    /**
     * De onde o flood-fill sai.
     *
     * Nos andares COMPOSTOS e o tile de chegada declarado no template. Nos cinco
     * DESENHADOS A MAO o registro nao tem esse tile (a planta deles e anterior ao
     * registro), entao ele sai da primeira PORTA do tilemap — que e a convencao
     * que `conferirSetoresRepresa` ja usa: a primeira saida e sempre a que liga
     * pra fora.
     */
    const entrada = (() => {
      if (a.planta !== 'desenhada') return a.entrada;
      const porta = objetos(lerMapa(a.mapa), 'interativos').find((o) => classe(o) === 'porta');
      if (!porta) return a.entrada;
      const tx = Math.floor((porta.x + porta.width / 2) / 32);
      const ty = Math.floor((porta.y + porta.height / 2) / 32);
      return { x: tx, y: g.livre(tx, ty) ? ty : ty - 1 };
    })();
    const alcanca = alcancaveis(g, [entrada.x, entrada.y]);
    const inimigos = objetos(lerMapa(a.mapa), 'inimigos');
    /**
     * Nos andares COMPOSTOS a contagem tem de bater com o registro: e ele que
     * manda no gerador. Nos cinco DESENHADOS A MAO ela nao bate, e nao deve — o
     * inimigo deles esta posto por posicao autoral desde a leva anterior, e o
     * registro nao e a fonte. O que se cobra la e o teto e a especie.
     */
    if (a.planta === 'desenhada') {
      ok(inimigos.length <= 5, `${a.codigo}: ${inimigos.length} inimigos num setor autoral`);
    } else {
      ok(
        inimigos.length === a.inimigos,
        `${a.codigo}: ${inimigos.length} inimigo(s) no mapa, o registro diz ${a.inimigos}`,
      );
    }
    const permitidas = new Set(a.fauna.map((f) => f.tipo));
    const cap = capituloDoAndar(a.andar);
    for (const o of inimigos) {
      const p = props(o);
      ok(Boolean(CATALOGO_INIMIGOS[p.tipo]), `${a.codigo}: especie desconhecida "${p.tipo}"`);
      // No andar autoral a especie tem de ser do CAPITULO (a fauna do andar e
      // mais estreita: ela so abre a secundaria no meio do capitulo).
      const doCapitulo = new Set(
        [cap.fauna.primaria, cap.fauna.secundaria, cap.fauna.rara].filter(Boolean),
      );
      const aceitas = a.planta === 'desenhada' ? doCapitulo : permitidas;
      ok(aceitas.has(String(p.tipo)), `${a.codigo}: "${p.tipo}" nao esta na fauna do capitulo`);
      const tx = Math.floor((o.x + o.width / 2) / 32);
      const ty = Math.floor((o.y + o.height / 2) / 32);
      // PAREDE e o limite duro; movel nao e. O inimigo tem corpo de fisica e o
      // Arcade o empurra pra fora de um movel no primeiro passo — nascer
      // encostado numa estante e feio, nao e quebrado. Nascer dentro da
      // alvenaria, sim.
      ok(!g.parede(tx, ty), `${a.codigo}: inimigo em ${tx},${ty} nasce dentro da alvenaria`);
      ok(
        [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
          alcanca.has(`${tx + dx},${ty + dy}`)),
        `${a.codigo}: inimigo em ${tx},${ty} nasce num pedaco sem ligacao com a chegada`,
      );
      // A regra dos quatro tiles vale pros andares COMPOSTOS, que e onde o
      // posicionamento e automatico e precisa de trava. Nos cinco autorais o
      // inimigo esta onde alguem o pos, e alguns deles guardam a propria escada
      // de proposito.
      if (a.planta !== 'desenhada') {
        ok(
          Math.hypot(tx - entrada.x, ty - entrada.y) >= 4,
          `${a.codigo}: inimigo em ${tx},${ty} nasce a menos de quatro tiles da chegada`,
        );
      }
      porEspecie[String(p.tipo)] = (porEspecie[String(p.tipo)] ?? 0) + 1;
      total += 1;
    }
    /**
     * Documento, painel, porta e recipiente tem de ser ALCANCAVEIS — mas de
     * perto, e nao por cima.
     *
     * A interacao do jogo e por DISTANCIA (`atualizarAlvo` na FarmScene procura
     * o alvo mais proximo dentro de um raio), entao um documento posto no mesmo
     * tile de uma estante continua acessivel: o jogador para na frente dela e
     * aperta E. O que nao pode e o objeto estar num pedaco do andar sem ligacao
     * nenhuma com a chegada — e e isso que se confere aqui, olhando o tile do
     * objeto e os quatro vizinhos.
     */
    const acessivel = (tx, ty) =>
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
        alcanca.has(`${tx + dx},${ty + dy}`));
    for (const o of objetos(lerMapa(a.mapa), 'interativos')) {
      if (!['placa', 'painel', 'porta', 'elevador'].includes(classe(o))) continue;
      const tx = Math.floor((o.x + o.width / 2) / 32);
      const ty = Math.floor((o.y + o.height / 2) / 32);
      ok(
        acessivel(tx, ty),
        `${a.codigo}: ${classe(o)} "${o.name}" em ${tx},${ty} esta num pedaco sem ligacao com a chegada`,
      );
    }
    for (const o of objetos(lerMapa(a.mapa), 'sucata')) {
      const tx = Math.floor((o.x + o.width / 2) / 32);
      const ty = Math.floor((o.y + o.height / 2) / 32);
      ok(acessivel(tx, ty), `${a.codigo}: salvado em ${tx},${ty} nao e alcancavel`);
    }
  }
  ok(total >= 150, `poucos inimigos nos cinquenta andares (${total})`);
  ok(
    Object.keys(porEspecie).length === Object.keys(CATALOGO_INIMIGOS).length,
    `so ${Object.keys(porEspecie).length} das ${Object.keys(CATALOGO_INIMIGOS).length} especies aparecem`,
  );
  // os dois primeiros andares sao zona segura
  ok(objetos(lerMapa(mapaDoAndar(1)), 'inimigos').length === 0, 'o andar 1 nao pode ter inimigo');
}

// ============================================================== 5. luzes ==
{
  let total = 0;
  let comCircuito = 0;
  const flagsDeEnigma = new Set(ANDARES.map((a) => flagDoEnigma(a.andar)));
  for (const a of ANDARES) {
    const luzes = objetos(lerMapa(a.mapa), 'luzes');
    ok(luzes.length > 0, `${a.codigo}: nenhuma luminaria`);
    const g = grade(a.mapa);
    for (const o of luzes) {
      const p = props(o);
      if (p.tipo !== undefined) {
        ok(Boolean(TIPOS_DE_LAMPADA[String(p.tipo)]), `${a.codigo}: tipo de luminaria "${p.tipo}"`);
      }
      if (p.circuito !== undefined) {
        ok(
          flagsDeEnigma.has(String(p.circuito)),
          `${a.codigo}: a luminaria depende de "${p.circuito}", que nao e flag de enigma`,
        );
        comCircuito += 1;
      }
      const tx = Math.floor((o.x + o.width / 2) / 32);
      const ty = Math.floor((o.y + o.height / 2) / 32);
      ok(!g.parede(tx, ty), `${a.codigo}: luminaria em ${tx},${ty} esta dentro da alvenaria`);
      total += 1;
    }
  }
  ok(total >= 100, `poucas luminarias nos cinquenta andares (${total})`);
  ok(comCircuito >= 40, `poucas luminarias ligadas a enigma (${comCircuito})`);
  // toda arte de luminaria existe no atlas
  const atlas = JSON.parse(
    readFileSync(join(raiz, 'public', 'assets', 'sprites', 'equipamento.atlas.json'), 'utf8'),
  );
  for (const t of Object.values(TIPOS_DE_LAMPADA)) {
    ok(Boolean(atlas.frames[t.frame]), `a luminaria "${t.id}" aponta pro frame inexistente "${t.frame}"`);
    ok(t.raio > 1 && t.intensidade > 0, `a luminaria "${t.id}" tem raio ou intensidade invalidos`);
  }
}

/** A LUZ NAO ATRAVESSA PAREDE — provado num andar de verdade. */
{
  const a = ANDARES.find((x) => x.planta === 'espinha_3' && x.andar > 6) ?? ANDARES[5];
  const g = grade(a.mapa);
  const luzes = objetos(lerMapa(a.mapa), 'luzes').map((o, i) => ({
    id: `l${i}`,
    tx: Math.floor((o.x + o.width / 2) / 32),
    ty: Math.floor((o.y + o.height / 2) / 32),
    tipo: TIPOS_DE_LAMPADA.pendente,
    raio: 6,
    intensidade: 1,
    circuito: null,
  }));
  const mapa = mapaDeLuzEstatico(g.largura, g.altura, luzes, () => true, (x, y) => g.parede(x, y));
  let escondidos = 0;
  for (const l of luzes) {
    for (let y = 0; y < g.altura; y++) {
      for (let x = 0; x < g.largura; x++) {
        if (Math.hypot(x - l.tx, y - l.ty) > 5) continue;
        if (linhaLivreDeLuz(l.tx, l.ty, x, y, (px, py) => g.parede(px, py))) continue;
        // tile atras de parede em relacao a ESTA lampada: so nao pode estar
        // aceso se nenhuma outra lampada o alcanca
        const outra = luzes.some(
          (o) =>
            o !== l
            && Math.hypot(x - o.tx, y - o.ty) < o.raio
            && linhaLivreDeLuz(o.tx, o.ty, x, y, (px, py) => g.parede(px, py)),
        );
        if (outra) continue;
        escondidos += 1;
        ok(
          mapa.valores[y * g.largura + x] === 0,
          `${a.codigo}: a luz atravessou parede ate ${x},${y}`,
        );
      }
    }
  }
  ok(escondidos > 20, `poucos tiles atras de parede pra provar a oclusao (${escondidos})`);
}

// =============================================================== 6. pets ==
{
  const pets = JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'sprites', 'pets.json'), 'utf8'));
  ok(LISTA_DE_PETS.length >= 4, 'poucos bichos no mundo');
  const donos = new Set();
  for (const pet of LISTA_DE_PETS) {
    ok(Boolean(pets[pet.variante]), `${pet.nome}: a variante "${pet.variante}" nao foi processada`);
    ok(
      pets[pet.variante].especie === pet.especie,
      `${pet.nome}: a arte e de ${pets[pet.variante].especie} e o registro diz ${pet.especie}`,
    );
    for (const sufixo of ['andando', 'parado']) {
      const arquivo = join(raiz, 'public', 'assets', 'sprites', `pet_${pet.variante}_${sufixo}_runtime.png`);
      ok(existsSync(arquivo), `${pet.nome}: falta a folha ${sufixo} (rode processar-sprites-pet)`);
    }
    if (pet.dono) {
      ok(!donos.has(pet.dono), `${pet.dono} aparece como dono de dois bichos`);
      donos.add(pet.dono);
    }
    // a agenda cobre o dia inteiro, comecando em 0
    ok(pet.agenda[0].inicio === 0, `${pet.nome}: a agenda nao comeca a meia-noite`);
    for (let i = 1; i < pet.agenda.length; i++) {
      ok(
        pet.agenda[i].inicio > pet.agenda[i - 1].inicio,
        `${pet.nome}: a agenda volta no tempo`,
      );
    }
    // TODO circulo de perambulacao e chao livre
    for (const bloco of pet.agenda) {
      const g = grade(bloco.lugar.mapa);
      const anda = bloco.modo === 'vagar' || bloco.modo === 'seguir';
      const raio = anda ? (bloco.lugar.raio ?? 2) : 0;
      for (let dy = -Math.ceil(raio); dy <= Math.ceil(raio); dy++) {
        for (let dx = -Math.ceil(raio); dx <= Math.ceil(raio); dx++) {
          if (Math.hypot(dx, dy) > raio + 0.4) continue;
          const x = Math.floor(bloco.lugar.ponto.x + dx);
          const y = Math.floor(bloco.lugar.ponto.y + dy);
          ok(
            g.livre(x, y),
            `${pet.nome} (${bloco.modo} em ${bloco.lugar.mapa}): o tile ${x},${y} do circulo nao e chao livre`,
          );
        }
      }
    }
  }
  // ninguem some do mundo: em toda hora do dia, todo bicho esta em algum mapa
  for (let h = 0; h < 24; h++) {
    for (const pet of LISTA_DE_PETS) {
      const e = estadoDoPet(pet, h * 60);
      ok(Boolean(MAPAS[e.lugar.mapa]), `${pet.nome} as ${h}h esta num mapa inexistente`);
    }
  }
  ok(petsVisiveis('bairro', 9 * 60).length >= 2, 'nenhum bicho no bairro as 9h');
  ok(petsVisiveis('bairro', 3 * 60).length === 0, 'bicho na rua as 3 da manha');
}

// ========================================================== 7. calendario ==
{
  ok(ehBissexto(2024) && !ehBissexto(2025) && ehBissexto(2000) && !ehBissexto(1900), 'regra de bissexto errada');
  ok(diasDoMes(2, 2024) === 29 && diasDoMes(2, 2025) === 28, 'fevereiro errado');
  ok(diasDoMes(1, 2025) === 31 && diasDoMes(4, 2025) === 30, 'tamanho de mes errado');
  ok(MESES.length === 12, 'o calendario nao tem doze meses');

  // ida e volta em quatro anos de dias, com virada de mes, de ano e 29/2
  const vistos = new Set();
  for (let d = 0; d < 1500; d++) {
    const data = dataDoDia(d);
    ok(data.dia >= 1 && data.dia <= diasDoMes(data.mes, data.ano), `dia ${d}: dia do mes fora da faixa`);
    ok(data.mes >= 1 && data.mes <= 12, `dia ${d}: mes fora da faixa`);
    ok(diaAbsolutoDe(data) === d, `dia ${d}: a volta pelo calendario nao fecha`);
    const chave = `${data.ano}-${data.mes}-${data.dia}`;
    ok(!vistos.has(chave), `a data ${chave} aparece duas vezes`);
    vistos.add(chave);
  }
  // o dia da semana anda de um em um
  for (let d = 0; d < 400; d++) {
    ok(
      dataDoDia(d + 1).diaDaSemana === (dataDoDia(d).diaDaSemana + 1) % 7,
      `o dia da semana pulou entre ${d} e ${d + 1}`,
    );
  }
  ok(dataDoDia(0).diaDaSemana === 0, 'o dia 0 tem de ser segunda-feira');
  // 29 de fevereiro existe no ano bissexto e nao existe no outro
  ok(vistos.has('2028-2-29'), 'faltou o 29 de fevereiro de 2028');
  ok(!vistos.has('2027-2-29'), '2027 nao e bissexto e ganhou 29 de fevereiro');
  // dia negativo (o save guarda `dia` cru e o F7 pode empurrar pra tras)
  ok(dataDoDia(-1).mes === 8 && dataDoDia(-1).dia === 31, 'o dia -1 devia ser 31 de agosto');
  ok(['verao', 'outono', 'inverno', 'primavera'].includes(estacaoDoDia(0)), 'estacao invalida');
}

// ============================================================== 8. tempo ==
{
  ok(Object.keys(TEMPOS).length === 4, 'esperava quatro estados de tempo');
  // DETERMINISTICO: o mesmo dia da o mesmo tempo, sempre
  for (const d of [0, 1, 37, 137, 365, 999, -5]) {
    ok(tempoDoDia(d).id === tempoDoDia(d).id, `o tempo do dia ${d} nao e estavel`);
  }
  // e o dia seguinte nao e sempre o mesmo (senao nao ha clima nenhum)
  const ano = distribuicaoDeTempo(0, 364);
  for (const [id, n] of Object.entries(ano)) {
    ok(n > 0, `o tempo "${id}" nunca acontece num ano inteiro`);
  }
  const chuvosos = ano.chuva_fraca + ano.chuva_forte;
  ok(chuvosos > 40 && chuvosos < 160, `chove em ${chuvosos} dias do ano — fora do razoavel`);
  // o verao chove mais que o inverno
  const verao = distribuicaoDeTempo(91, 180);
  const inverno = distribuicaoDeTempo(273, 364);
  ok(
    verao.chuva_fraca + verao.chuva_forte > inverno.chuva_fraca + inverno.chuva_forte,
    'o verao deveria chover mais que o inverno',
  );
  // save/reload preserva: como o tempo e derivado do dia, basta o dia sobreviver
  ok(tempoDoDia(137).id === tempoDoDia(137.0).id, 'o tempo mudou com o mesmo dia');
}

// ============================================================ relatorio ==
const porCapitulo = CAPITULOS.map((c) => {
  const faixa = ANDARES.filter((a) => a.capitulo === c.numero);
  const inimigos = faixa.reduce((n, a) => n + a.inimigos, 0);
  return `  cap ${c.numero} ${c.nome.padEnd(16)} andares ${c.faixa[0]}-${c.faixa[1]}` +
    `  escuridao ${faixa[0].escuridao.toFixed(2)}..${faixa.at(-1).escuridao.toFixed(2)}` +
    `  ${inimigos} inimigo(s)  fauna ${c.fauna.primaria}`;
});
console.log(porCapitulo.join('\n'));
console.log(
  `  ${ENIGMAS.length} enigmas de ${FAMILIAS.length} familias | ` +
    `${ANDARES.filter((a) => travaDescida(a.andar)).length} travam a descida | ` +
    `${ANDARES_DE_PARADA.length} paradas de elevador`,
);
console.log(
  `  prontuario: ${FICHAS.length} fichas, dias 1 a 200 | ` +
    `${LISTA_DE_PETS.length} bichos (${LISTA_DE_PETS.filter((p) => p.especie === 'cachorro').length} ` +
    `cachorro, ${LISTA_DE_PETS.filter((p) => p.especie === 'gato').length} gato)`,
);
{
  const ano = distribuicaoDeTempo(0, 364);
  console.log(
    `  tempo no primeiro ano: ${ano.limpo} limpo, ${ano.nublado} nublado, ` +
      `${ano.chuva_fraca} chuva fraca, ${ano.chuva_forte} chuva forte`,
  );
}
console.log(`[andares] ${conferencias} conferencias: passou`);

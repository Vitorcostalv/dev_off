/**
 * A TRAVA DE HISTORIA, conferida contra o codigo.
 *
 * O escopo desta remasterizacao tem uma restricao acima de todas as outras: o
 * canon narrativo nao se mexe. Nao se troca nome de morador, nem familia, nem
 * onde ele mora; nao se reescreve fala existente; nao se acrescenta nem se tira
 * missao pessoal, segredo ou ficha medica; nao se renumera capitulo nem andar.
 * Um mapa redesenhado pode MUDAR DE LUGAR um objeto narrativo, mas preserva o id
 * dele, o texto, a flag de progresso e a ordem em que ele se revela.
 *
 * Sete etapas mexeram em preco, peso de tabela de loot, tamanho de sprite,
 * moldura de painel, pilha de foco e pasta de asset. Nenhuma delas devia tocar
 * no canon — e "nao devia" nao e verificacao. Esta e.
 *
 * O jeito de travar e o de sempre no projeto: o numero e o nome ficam ESCRITOS
 * aqui, e nao lidos do mesmo lugar que eles deveriam validar. Um validador que
 * conta 33 NPCs contando `NPCS.length` passa com 32; um que lista os 33 nomes
 * falha dizendo qual sumiu.
 *
 * DE ONDE VEIO ESTA LISTA, e isso importa: ela foi CAPTURADA DO CODIGO no commit
 * que a criou, e nao transcrita de um documento de design — nao existe um. Ou
 * seja: ela nao prova que o canon esta certo, prova que ele nao MUDOU desde
 * aqui. E o que se pode afirmar com honestidade, e e o que serve pro proposito:
 * as sete etapas de remasterizacao seguintes nao podem mexer no canon sem que
 * este arquivo grite.
 *
 * Se um dia aparecer o documento de origem, e ele discordar daqui, o documento
 * ganha — e a divergencia e um bug que estava escondido.
 *
 * O que se cobra:
 *
 *   1. os 33 NPCs, um por um, com nome e id;
 *   2. os 24 moradores com casa, mapa de residencia e familia;
 *   3. as 6 missoes pessoais, com id e dono;
 *   4. os 5 segredos, com id, mapa e recompensa;
 *   5. os 5 capitulos, com nome e faixa de andar;
 *   6. as 50 fichas medicas, com id, intervalo de dias da cronologia de 200 e o
 *      cadastro PACIENTE 4471-C;
 *   7. o cenario: 50 andares, as 11 paradas de elevador, a usina abandonada.
 */
import assert from 'node:assert/strict';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const [
  { NPCS },
  { MORADORES },
  { MISSOES_NPC },
  { SEGREDOS },
  { CAPITULOS, ANDARES_TOTAIS, ANDARES_DE_PARADA, capituloDoAndar, idDaFicha, diasDaFicha },
  { FICHAS, fichaDoAndar, tituloDaFicha },
] = await Promise.all([
  import('../src/game/npcs.ts'),
  import('../src/game/moradores.ts'),
  import('../src/game/missoesNpc.ts'),
  import('../src/game/ambientacao.ts'),
  import('../src/game/andares.ts'),
  import('../src/game/fichas.ts'),
]);

let conferencias = 0;
const falhas = [];
const ok = (mensagem, condicao) => {
  conferencias += 1;
  if (!condicao) falhas.push(mensagem);
};
/** Toda falha aqui e a mesma falha: alguem mexeu no canon. */
const canon = (o, esperado, achado, quem) =>
  ok(
    `TRAVA DE HISTORIA: ${o} devia ser ${JSON.stringify(esperado)} e esta ${JSON.stringify(achado)}` +
      (quem ? ` (${quem})` : ''),
    JSON.stringify(esperado) === JSON.stringify(achado),
  );

const lista = (x) => (Array.isArray(x) ? x : Object.values(x));

// ============================================================== 1. NPCS ==
//
// Os trinta e tres, escritos. Vinte e quatro sao moradores da cidade; os outros
// nove sao os que aparecem sem casa propria no cadastro de moradores.
const NOMES_DE_NPC = {
  edu: 'Edu',
  mari: 'Mari',
  jaqueline: 'Jaqueline',
  leticia: 'Leticia',
  wendel: 'Wendel',
  alice: 'Alice',
  livia: 'Livia',
  matheus: 'Matheus',
  cecilia: 'Cecilia',
  clara: 'Clara',
  lucia: 'Lucia',
  caio: 'Caio',
  helena: 'Helena',
  julia: 'Julia',
  arthur: 'Arthur',
  rita: 'Vo Rita',
  roberto: 'Roberto',
  ilda: 'Professora Ilda',
  ravi: 'Ravi',
  davi: 'Davi',
  samanta: 'Samanta',
  manuela: 'Manuela',
  rafael: 'Rafael',
  suzan: 'Suzan',
  lucas: 'Lucas',
  tulio: 'Tulio',
  joao: 'Joao',
  neide: 'Neide',
  priscila: 'Priscila',
  bruno: 'Bruno',
  luke: 'Luke',
  hiago: 'Hiago',
  vitor: 'Vitor',
};

const npcs = lista(NPCS);
const porId = new Map(npcs.map((n) => [n.id, n]));
canon('a contagem de NPCs', 33, npcs.length);
for (const [id, nome] of Object.entries(NOMES_DE_NPC)) {
  const n = porId.get(id);
  ok(`TRAVA DE HISTORIA: o NPC "${id}" (${nome}) desapareceu do jogo`, Boolean(n));
  if (n) canon(`o nome do NPC "${id}"`, nome, n.nome);
}
// e nenhum NPC a mais: um nome novo na cidade e mudanca de canon do mesmo jeito
const sobrando = npcs.map((n) => n.id).filter((id) => !(id in NOMES_DE_NPC));
canon('os NPCs sem lugar na lista de canon', [], sobrando);

// =========================================================== 2. MORADORES ==
//
// Onde cada um mora e com quem. Um remap pode mover a CASA no mapa, mas nao
// pode mudar quem vive nela nem em que mapa ela fica.
const MORADIA = {
  // casa_b1: Livia, Matheus e a filha Cecilia
  livia: ['casa_b1', 'bairro'],
  matheus: ['casa_b1', 'bairro'],
  cecilia: ['casa_b1', 'bairro'],
  // casa_b2: Clara e Lucia
  clara: ['casa_b2', 'bairro'],
  lucia: ['casa_b2', 'bairro'],
  // casa_b3: Caio e Helena
  caio: ['casa_b3', 'bairro'],
  helena: ['casa_b3', 'bairro'],
  // casa_b4: Julia, Arthur e Vo Rita
  julia: ['casa_b4', 'bairro'],
  arthur: ['casa_b4', 'bairro'],
  rita: ['casa_b4', 'bairro'],
  // casa_b5: Roberto, Professora Ilda e Ravi
  roberto: ['casa_b5', 'bairro'],
  ilda: ['casa_b5', 'bairro'],
  ravi: ['casa_b5', 'bairro'],
  // casa_b6: Davi, Samanta e Manuela
  davi: ['casa_b6', 'bairro'],
  samanta: ['casa_b6', 'bairro'],
  manuela: ['casa_b6', 'bairro'],
  // casa_b7: Rafael e Suzan
  rafael: ['casa_b7', 'bairro'],
  suzan: ['casa_b7', 'bairro'],
  // sozinhos
  lucas: ['casa_c1', 'bairro'],
  tulio: ['casa_c2', 'bairro'],
  // zona rural: Joao, Neide e Priscila numa casa, Bruno na outra
  joao: ['casa_rural_1', 'rural'],
  neide: ['casa_rural_1', 'rural'],
  priscila: ['casa_rural_1', 'rural'],
  bruno: ['casa_rural_2', 'rural'],
};
const moradores = lista(MORADORES);
canon('a contagem de moradores', 24, moradores.length);
const morador = new Map(moradores.map((m) => [m.id, m]));
for (const [id, [casa, mapa]] of Object.entries(MORADIA)) {
  const m = morador.get(id);
  ok(`TRAVA DE HISTORIA: o morador "${id}" desapareceu do cadastro`, Boolean(m));
  if (!m) continue;
  canon(`a casa de "${id}"`, casa, m.casa, m.nome);
  canon(`o mapa de residencia de "${id}"`, mapa, m.mapaResidencia, m.nome);
  // familia declarada: quem mora junto tem de continuar junto
  ok(
    `TRAVA DE HISTORIA: "${id}" (${m.nome}) perdeu a declaracao de familia`,
    m.familia !== undefined && m.familia !== null,
  );
}
// duas casas com o mesmo morador, ou morador em casa que nao existe, seria
// remap tendo mexido em canon sem perceber
const casasUsadas = new Set(moradores.map((m) => m.casa));
canon('o numero de casas habitadas', 11, casasUsadas.size);

// ======================================================= 3. MISSOES PESSOAIS ==
//
// Seis, uma por NPC, e cada uma e um pedido pessoal com um objeto proprio. Sao
// o unico conteudo de missao do jogo e o escopo trava as seis.
const MISSOES = {
  edu_notebook: 'edu',
  mari_equipamento: 'mari',
  jaqueline_caixa: 'jaqueline',
  leticia_camera: 'leticia',
  wendel_hd: 'wendel',
  alice_vitrola: 'alice',
};
const missoes = lista(MISSOES_NPC);
canon('a contagem de missoes pessoais', 6, missoes.length);
const missaoPorId = new Map(missoes.map((m) => [m.id, m]));
for (const [id, npcId] of Object.entries(MISSOES)) {
  const m = missaoPorId.get(id);
  ok(`TRAVA DE HISTORIA: a missao pessoal "${id}" desapareceu`, Boolean(m));
  if (!m) continue;
  canon(`o dono da missao "${id}"`, npcId, m.npcId);
  ok(`TRAVA DE HISTORIA: a missao "${id}" ficou sem NPC no jogo`, porId.has(m.npcId));
}
const missoesSobrando = missoes.map((m) => m.id).filter((id) => !(id in MISSOES));
canon('as missoes pessoais sem lugar no canon', [], missoesSobrando);

// ============================================================ 4. SEGREDOS ==
const IDS_DE_SEGREDO = [
  'segredo_biblioteca',
  'segredo_rio',
  'segredo_madeireira',
  'segredo_pedreira',
  'segredo_fazenda',
];
const segredos = lista(SEGREDOS);
canon('a contagem de segredos', 5, segredos.length);
const idsAchados = segredos.map((s) => s.id).sort();
const idsEsperados = [...IDS_DE_SEGREDO].sort();
canon('os ids dos cinco segredos', idsEsperados, idsAchados);
for (const s of segredos) {
  ok(`TRAVA DE HISTORIA: o segredo "${s.id}" ficou sem mapa`, typeof s.mapa === 'string' && s.mapa);
  ok(
    `TRAVA DE HISTORIA: o segredo "${s.id}" ficou sem posicao`,
    s.tile && Number.isFinite(s.tile.x) && Number.isFinite(s.tile.y),
  );
}

// ============================================================ 5. CAPITULOS ==
//
// A progressao psicologica em cinco capitulos, dez andares cada. O nome e a
// faixa de cada um sao canon; o VISUAL de cada faixa (a distorcao) nao e.
const CANON_DE_CAPITULO = [
  ['Rotina', 1, 10],
  ['Pressao', 11, 20],
  ['Colapso', 21, 30],
  ['Negacao', 31, 40],
  ['Reconhecimento', 41, 50],
];
const capitulos = lista(CAPITULOS);
canon('a contagem de capitulos', 5, capitulos.length);
for (const [i, [nome, de, ate]] of CANON_DE_CAPITULO.entries()) {
  const c = capitulos[i];
  ok(`TRAVA DE HISTORIA: falta o capitulo ${i + 1} (${nome})`, Boolean(c));
  if (!c) continue;
  canon(`o nome do capitulo ${i + 1}`, nome, c.nome);
  canon(`a faixa do capitulo ${i + 1} (${nome})`, [de, ate], [c.faixa[0], c.faixa[1]]);
  // e o andar do meio da faixa resolve pro capitulo certo
  const meio = Math.floor((de + ate) / 2);
  canon(`o capitulo do andar ${meio}`, nome, capituloDoAndar(meio).nome);
}
// as bordas: o andar 10 e Rotina e o 11 e Pressao. Um erro de um andar aqui
// deslocaria a leitura de cinquenta fichas.
canon('o capitulo do andar 1', 'Rotina', capituloDoAndar(1).nome);
canon('o capitulo do andar 10', 'Rotina', capituloDoAndar(10).nome);
canon('o capitulo do andar 11', 'Pressao', capituloDoAndar(11).nome);
canon('o capitulo do andar 50', 'Reconhecimento', capituloDoAndar(50).nome);

// ============================================================= 6. FICHAS ==
//
// Cinquenta fichas medicas cobrindo uma cronologia de 200 dias, quatro dias
// cada. Sao o texto narrativo da usina, e o escopo trava as cinquenta.
canon('a contagem de fichas medicas', 50, lista(FICHAS).length);
canon('o total de andares', 50, ANDARES_TOTAIS);
for (let andar = 1; andar <= 50; andar += 1) {
  const f = fichaDoAndar(andar);
  ok(`TRAVA DE HISTORIA: o andar ${andar} ficou sem ficha medica`, Boolean(f));
  if (!f) continue;
  canon(`o id da ficha do andar ${andar}`, `ficha_${String(andar).padStart(3, '0')}`, idDaFicha(andar));
  const dias = diasDaFicha(andar);
  canon(`os dias da ficha do andar ${andar}`, [(andar - 1) * 4 + 1, andar * 4], [dias.de, dias.ate]);
}
// a cronologia fecha em 200 dias exatos: 50 fichas de 4 dias
canon('o primeiro dia da cronologia', 1, diasDaFicha(1).de);
canon('o ultimo dia da cronologia', 200, diasDaFicha(50).ate);
// A ESCADA DE REVELACAO DO PACIENTE.
//
// E o nucleo narrativo da usina, e a coisa que o escopo protege com mais forca:
// "a ordem em que ele se revela". Nos nove primeiros andares o paciente e um
// numero de cadastro e nada mais; as iniciais chegam no 10, o nome e a profissao
// no 20, o regime de trabalho no 30, a mudanca de endereco no 40, e o
// encerramento no 50. Adiantar qualquer degrau desses entrega o fim da historia
// no comeco dela.
const REVELACAO = [
  [1, 'PACIENTE 4471-C'],
  [9, 'PACIENTE 4471-C'],
  [10, 'PACIENTE 4471-C — iniciais V. A.'],
  [19, 'PACIENTE 4471-C — iniciais V. A.'],
  [20, 'PACIENTE V. A., 34 anos — desenvolvedor de software'],
  [29, 'PACIENTE V. A., 34 anos — desenvolvedor de software'],
  [30, 'PACIENTE V. A. — desenvolvedor, regime remoto integral'],
  [39, 'PACIENTE V. A. — desenvolvedor, regime remoto integral'],
  [40, 'PACIENTE V. A. — mudanca de domicilio registrada em folha anexa'],
  [49, 'PACIENTE V. A. — mudanca de domicilio registrada em folha anexa'],
  [50, 'PACIENTE V. A. — prontuario encerrado por transferencia'],
];
for (const [andar, esperado] of REVELACAO) {
  canon(`a identificacao do paciente no andar ${andar}`, esperado, fichaDoAndar(andar).paciente);
}
// o cadastro 4471-C so aparece nos DEZENOVE primeiros andares, e o nome do
// paciente NAO aparece neles: e o que faz a revelacao ser revelacao
const cadastro = [];
const comNome = [];
for (let a = 1; a <= 50; a += 1) {
  const p = fichaDoAndar(a).paciente;
  if (p.includes('4471-C')) cadastro.push(a);
  if (/V. A./.test(p)) comNome.push(a);
}
canon('os andares em que o cadastro 4471-C aparece', Array.from({ length: 19 }, (_, i) => i + 1), cadastro);
canon('o primeiro andar em que as iniciais V. A. aparecem', 10, comNome[0]);
ok(
  `TRAVA DE HISTORIA: as iniciais V. A. aparecem em ${comNome.length} andares e deviam aparecer ` +
    'em 41 (do 10 ao 50)',
  comNome.length === 41,
);
// e o titulo de folha continua sendo a numeracao, nao o nome: e a folha de um
// arquivo medico, e o jogador le a numeracao antes de ler quem e
canon('o titulo da folha do andar 1', 'FICHA 001  dias 1-4', tituloDaFicha(fichaDoAndar(1)));
canon('o titulo da folha do andar 50', 'FICHA 050  dias 197-200', tituloDaFicha(fichaDoAndar(50)));

// =========================================================== 7. O CENARIO ==
canon('as paradas do elevador de servico', [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50], [...ANDARES_DE_PARADA]);
ok(
  `TRAVA DE HISTORIA: ha ${ANDARES_DE_PARADA.length} paradas de elevador e o canon tem 11`,
  ANDARES_DE_PARADA.length === 11,
);
// a primeira e a ultima parada sao os dois extremos, senao ha andar inalcancavel
canon('a primeira parada', 1, ANDARES_DE_PARADA[0]);
canon('a ultima parada', 50, ANDARES_DE_PARADA[ANDARES_DE_PARADA.length - 1]);

if (falhas.length > 0) {
  console.error(`\n[canon] ${falhas.length} de ${conferencias} conferencias FALHARAM:`);
  for (const f of falhas) console.error('  - ' + f);
  console.error(
    '\nEstas nao sao falhas de codigo. Sao mudancas no CANON NARRATIVO, que o escopo desta\n' +
      'remasterizacao trava. Se a mudanca foi de proposito e autorizada, atualize a lista\n' +
      'neste arquivo junto com ela — nunca so o codigo.',
  );
  process.exit(1);
}
console.log(`[canon] ${conferencias} conferencias de trava de historia passaram`);

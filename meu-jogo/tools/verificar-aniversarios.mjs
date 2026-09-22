import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { dataDoDia, DIAS_POR_ESTACAO } from '../src/game/calendario.ts';
import { NPCS } from '../src/game/npcs.ts';
import { MORADORES } from '../src/game/moradores.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';
import {
  ANIVERSARIOS, ANIVERSARIO_PROTAGONISTA, aniversarioDe, aniversariantesDoDia, comentarioDeEsquecimento,
  contarMeuAniversario, conviteDeAniversario, dataLegivel, ehAniversario, falaDeAniversario, felicitacaoDeHoje,
  lembraDaMinhaData, lembrarDoAniversario, meuAniversarioHoje, proximoAniversario, quemSabeDoMeuAniversario,
  sabeDoMeuAniversario, visitaDeAniversario,
} from '../src/game/aniversarios.ts';

// Toda a cidade tem data, e nenhuma data e repetida no mesmo dia da mesma estacao.
const npcs = [...Object.keys(MORADORES), ...Object.keys(NPCS).filter(id => NPCS[id].nome && !NPCS[id].loja)];
const semData = Object.keys(ANIVERSARIOS).filter(id => !npcs.includes(id));
assert.equal(Object.keys(ANIVERSARIOS).length, 33);
assert.deepEqual(semData, [], 'toda data pertence a um NPC existente');
for (const id of Object.keys(MORADORES)) assert(aniversarioDe(id), id);
const ocupadas = new Set();
for (const [id, d] of Object.entries(ANIVERSARIOS)) {
  assert(d.dia >= 1 && d.dia <= DIAS_POR_ESTACAO, id);
  const chave = `${d.estacao}:${d.dia}`;
  assert(!ocupadas.has(chave), `data repetida em ${id}`);
  ocupadas.add(chave);
}
assert.equal(ehAniversario(ANIVERSARIOS.edu, 2), true, 'dia 2 absoluto = 3 de Primavera');
assert.equal(ehAniversario(ANIVERSARIOS.edu, 3), false);
assert.equal(ehAniversario(ANIVERSARIOS.edu, 2 + DIAS_POR_ESTACAO * 4), true, 'a data volta todo ano');
assert.deepEqual(aniversariantesDoDia(2), ['edu']);
assert.equal(proximoAniversario('edu', 3), 2 + DIAS_POR_ESTACAO * 4);
assert.equal(proximoAniversario('ninguem', 0), null);
const diaMeu = (ANIVERSARIO_PROTAGONISTA.estacao * DIAS_POR_ESTACAO) + ANIVERSARIO_PROTAGONISTA.dia - 1;
assert.equal(meuAniversarioHoje(diaMeu), true);
assert.equal(meuAniversarioHoje(diaMeu + 1), false);
assert.equal(dataLegivel(ANIVERSARIO_PROTAGONISTA), '20 de Outono');
assert.equal(dataDoDia(diaMeu).ano, 1);

const novo = (dia = 0, score = 8) => ({ dia, relacoes: { getScore: () => score }, worldEvents: new SistemaWorldEvents() });

// Aniversario do morador: fala uma vez por ano, convite acima de 4 de relacao.
const c = novo(2);
assert(falaDeAniversario(c, 'edu').includes('hoje'));
assert.equal(falaDeAniversario(c, 'edu'), null, 'uma fala por ano');
assert(conviteDeAniversario(c, 'edu'));
assert.equal(conviteDeAniversario(novo(2, 2), 'edu'), null, 'sem relacao nao ha convite');
assert.equal(conviteDeAniversario(c, 'mari'), null, 'hoje nao e o dia de Mari');
assert.equal(lembrarDoAniversario(c, 'mari', false), false);
assert.equal(lembrarDoAniversario(c, 'edu', true), true);
assert.equal(lembrarDoAniversario(c, 'edu', true), false, 'so conta uma vez');
assert(c.worldEvents.ativa('aniversario:presente:edu:1'));
assert(lerDiario(c.worldEvents.serializar().flags).some(e => e.texto.includes('Levei uma coisa pequena')));
// Esquecimento: fala no dia seguinte, so para quem nao foi visitado, e uma vez.
const e = novo(3);
assert(comentarioDeEsquecimento(e, 'edu').includes('Ontem foi meu aniversário'));
assert.equal(comentarioDeEsquecimento(e, 'edu'), null);
const lembrado = novo(3);
lembrado.worldEvents.definir('aniversario:lembrei:edu:1', true);
assert.equal(comentarioDeEsquecimento(lembrado, 'edu'), null, 'quem foi lembrado nao cobra');
assert.equal(comentarioDeEsquecimento(novo(3, 1), 'edu'), null, 'estranho nao cobra nada');
assert.equal(comentarioDeEsquecimento(novo(4), 'edu'), null, 'a cobranca e so no dia seguinte');

// Aniversario do protagonista: ninguem sabe antes de eu contar.
const m = novo(diaMeu, 5);
assert.deepEqual(quemSabeDoMeuAniversario(m), []);
assert.equal(felicitacaoDeHoje(m, 'edu'), null);
assert.equal(visitaDeAniversario(m), null, 'sem ninguem que saiba, ninguem bate na porta');
assert.equal(contarMeuAniversario(novo(0, 2), 'edu'), false, 'contar exige alguma intimidade');
assert.equal(contarMeuAniversario(m, 'edu'), true);
assert.equal(contarMeuAniversario(m, 'edu'), false);
assert.equal(sabeDoMeuAniversario(m, 'edu'), true);
assert.equal(lembraDaMinhaData(m, 'edu'), false, 'com relacao media, so lembra no ano seguinte');
assert.equal(felicitacaoDeHoje(m, 'edu'), null);
const proximo = { ...m, dia: diaMeu + DIAS_POR_ESTACAO * 4 };
assert(felicitacaoDeHoje(proximo, 'edu'), 'no ano seguinte ele lembra');
assert.equal(felicitacaoDeHoje(proximo, 'edu'), null, 'uma felicitacao por ano');
const proximo2 = { ...m, dia: diaMeu + DIAS_POR_ESTACAO * 8 };
assert(felicitacaoDeHoje(proximo2, 'edu').includes('Segundo ano'));
// Relacao alta lembra ja no primeiro ano.
const perto = novo(diaMeu, 9);
assert(contarMeuAniversario(perto, 'jaqueline'));
assert.equal(lembraDaMinhaData(perto, 'jaqueline'), true);
assert(felicitacaoDeHoje(perto, 'jaqueline').includes('bolo'));
// Visita: uma por ano, uma pessoa so, e fica no diario.
perto.worldEvents.definir('social:dias:jaqueline', 20);
const visita = visitaDeAniversario(perto);
assert.equal(visita.npc, 'jaqueline');
assert.equal(visita.falas.length, 3);
assert.equal(visitaDeAniversario(perto), null, 'uma visita por ano');
assert(lerDiario(perto.worldEvents.serializar().flags).some(x => x.texto.includes('bateu na porta hoje')));
// Save: nada disso vive fora das flags.
const dados = perto.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(dados)));
assert.deepEqual(salvo.serializar(), dados);
console.log('Aniversarios: 33 datas unicas, fala anual, convite, presente, esquecimento, lembranca progressiva e visita passaram.');

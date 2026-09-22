import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { memoriasDisponiveis, lembrancasDaCasa, programaRadio } from '../src/game/memoriasPessoais.ts';
import { mensagensDisponiveis, responderMensagem, conversaCelular, fotosPessoais } from '../src/game/celular.ts';
import { eventoNoLugar, dialogoDoEvento, concluirEvento } from '../src/game/eventosDeConvivencia.ts';
import { SistemaEncontrosNpc } from '../src/game/encontrosNpc.ts';
import { textoClinicoVisivel } from '../src/game/arquivoVisivel.ts';
import { buscarRegistroPsicoterapia } from '../src/game/fichas.ts';
import { escreverDiario, lerDiario, registrarCenaNoDiario } from '../src/game/diarioPessoal.ts';
import { observarVida, observarTrabalho, registrarConvivencia, comentarioDoPadrao, naturezaDaRelacao, vinculoDisponivel, concluirVinculo, VINCULOS } from '../src/game/vidaSocial.ts';
let score = 9;
const c = { dia: 0, mapa: 'oficina', relogio: { minutos: 1320 }, vida: { fracao: 1 }, relacoes: { getScore: () => score, listaInteragidos: () => ['edu'] }, worldEvents: new SistemaWorldEvents() };
escreverDiario(c, 'x', 'Um dia.'); escreverDiario(c, 'x', 'Outro texto.');
assert.equal(lerDiario(c.worldEvents.serializar().flags).length, 1);
assert.equal(lerDiario(c.worldEvents.serializar().flags)[0].texto, 'Um dia.');
registrarCenaNoDiario(c, 'epilogo'); assert(lerDiario(c.worldEvents.serializar().flags).some(e => e.texto.includes('Foi um dia bom')));
for (let d = 0; d < 7; d++) { c.dia = d; observarTrabalho(c); observarTrabalho(c); }
assert(comentarioDoPadrao(c, 'edu')?.includes('horário')); assert.equal(comentarioDoPadrao(c, 'edu'), null);
c.dia = 50; assert.equal(comentarioDoPadrao(c, 'edu'), null);
c.mapa = 'bar'; observarVida(c, 0, 0); assert(comentarioDoPadrao(c, 'alice')?.includes('cadeira'));
c.dia = 51; c.mapa = 'represa_f1'; c.relogio.minutos = 100; observarVida(c, 0, 0);
c.dia = 52; assert(comentarioDoPadrao(c, 'jaqueline')?.includes('luz'));
registrarConvivencia(c, 'edu'); registrarConvivencia(c, 'edu'); assert.equal(c.worldEvents.obter('social:dias:edu'), 1);
assert(naturezaDaRelacao(c, 'edu').includes('Conhecimento sobre você: pouco'));
// Dezesseis moradores importantes: cinco cenas nos oito dos retratos, tres nos demais.
assert.equal(Object.keys(VINCULOS).length, 16);
assert.equal(Object.values(VINCULOS).reduce((n, v) => n + v.length, 0), 64);
assert.equal(vinculoDisponivel(c, 'edu').indice, 0);
score = 5;
c.worldEvents.definir('vinculo:edu:0', true); c.worldEvents.definir('vinculo:edu:1', true);
assert.equal(vinculoDisponivel(c, 'edu'), null, 'a terceira cena pede mais relacao');
c.worldEvents.definir('vinculo:edu:0', false); c.worldEvents.definir('vinculo:edu:1', false);
score = 12;
for (const [id, cenas] of Object.entries(VINCULOS)) {
  c.worldEvents.definir('missaoWendelHdConcluida', true);
  assert([3, 5].includes(cenas.length), id);
  for (let i = 0; i < cenas.length; i++) { c.dia++; assert.equal(vinculoDisponivel(c, id).indice, i, `${id}:${i}`); assert(concluirVinculo(c, id, i)); assert(!concluirVinculo(c, id, i)); }
  c.dia++;
  assert.equal(vinculoDisponivel(c, id), null);
}
score = 9;
assert(c.worldEvents.ativa('fotografia:liberada')); assert(c.worldEvents.ativa('social:jantarWendel'));
const serializado = c.worldEvents.serializar(); const salvo = new SistemaWorldEvents(); salvo.restaurar(JSON.parse(JSON.stringify(serializado))); assert.deepEqual(salvo.serializar(), serializado);
console.log('Diário, padrões de 28 dias, falas diárias, rumores, dimensões sociais, 64 cenas de vínculo e save passaram.');
const fichas = new Set();
assert.equal(memoriasDisponiveis({ arquivo: { tem: n => fichas.has(n) } }).length, 0);
for (const n of [50, 75, 110, 126, 142, 157, 159, 173, 188]) {
  fichas.add(n);
  const lista = memoriasDisponiveis({ arquivo: { tem: n => fichas.has(n) } });
  assert.equal(lista.length, fichas.size);
  assert(lista.every(m => m.ficha <= n));
}
assert(lembrancasDaCasa(c).some(m => m.id === 'leticia'));
assert(programaRadio(240, 0).includes('Madrugada'));
const msg = mensagensDisponiveis(c).find(m => m.npc === 'edu');
assert(responderMensagem(c, msg.id)); assert(!responderMensagem(c, msg.id));
assert(conversaCelular(c, msg).includes('Ainda não houve resposta'));
c.dia++; assert(conversaCelular(c, msg).includes(msg.retorno));
assert.deepEqual(fotosPessoais({ 'foto:bad': '{', 'foto:wrong': '{}' }), []);
console.log('Nove memórias sem spoilers, presentes, rádio, mensagens atrasadas e leitura segura do álbum passaram.');
for (const [dia, mapa, minuto] of [[6, 'bairro', 1200], [13, 'farm', 1000], [20, 'farm', 1200], [24, 'bar', 1200], [27, 'farm', 1000]]) {
  Object.assign(c, { dia, mapa }); c.relogio.minutos = minuto;
  assert(eventoNoLugar(c)); const primeiro = dialogoDoEvento(c);
  assert(primeiro.length >= 3); assert(concluirEvento(c)); assert(!concluirEvento(c));
  c.dia += 112; assert.notDeepEqual(dialogoDoEvento(c), primeiro);
  c.mapa = 'oficina'; assert.equal(eventoNoLugar(c), null);
}
const grupo = ['mari', 'leticia', 'edu'].map((id, i) => ({ id, x: 50 + i, y: 50, dentro: null, visivel: true, mapaAtual: 'farm' }));
const encontros = new SistemaEncontrosNpc();
assert.equal(encontros.atualizar(0, 0, grupo, true, () => 8).length, 3);
assert(encontros.ativo.definicao.falas.some(f => f.texto.includes('oficina')));
const separados = new SistemaEncontrosNpc();
assert.equal(separados.atualizar(0, 0, grupo.map((g, i) => ({ ...g, mapaAtual: String(i) })), true).length, 0);
console.log('Cinco eventos, variação anual, participação única e conversas em grupo sem cruzar mapas passaram.');
for (const [n, depois] of [[52, 75], [78, 100], [108, 125], [132, 150], [160, 180]]) {
  const texto = buscarRegistroPsicoterapia(n).texto;
  const antes = textoClinicoVisivel(n, texto, { tem: () => false });
  assert(antes.includes('████'), String(n));
  assert.equal(textoClinicoVisivel(n, texto, { tem: v => v === depois }), texto);
  assert.equal(buscarRegistroPsicoterapia(n).texto, texto);
}
for (const n of [126, 142, 155, 157, 159, 173]) {
  const texto = buscarRegistroPsicoterapia(n).texto;
  assert.equal(textoClinicoVisivel(n, texto, { tem: () => false }), texto);
}
console.log('Tarjas reversíveis preservam o catálogo integral e as seis revelações principais.');

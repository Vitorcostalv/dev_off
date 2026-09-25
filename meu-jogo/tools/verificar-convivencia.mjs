import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';
import { NPCS } from '../src/game/npcs.ts';
import {
  ACOMPANHANTES, NOME_DO_LUGAR, acompanhamentoAtual, caminhadaAtual, encerrarAcompanhamento,
  encerrarCaminhada, falaDeQuemSenta, iniciarAcompanhamento, iniciarCaminhada, lugarDoPonto,
  observacaoDoBanco, podeCaminhar, quemSenta, registrarBanco, registrarLugar, textoAoSentar,
} from '../src/game/convivencia.ts';
import { PRATOS, comer, historiaDoPrato, podeConvidar, pratosAprendidos, refeicaoDeHoje } from '../src/game/refeicoes.ts';

const novo = (dia = 0, mapa = 'bairro', minutos = 600) => ({
  dia, mapa, relogio: { minutos }, worldEvents: new SistemaWorldEvents(),
});

// ------------------------------------------------------------------ lugares --
assert.equal(lugarDoPonto('farm', 52, 44), 'praca');
assert.equal(lugarDoPonto('farm', 34, 57), 'praca', 'o parque com chafariz conta como praca');
assert.equal(lugarDoPonto('farm', 70, 50), 'mercado');
assert.equal(lugarDoPonto('bairro', 69, 95), 'rio');
assert.equal(lugarDoPonto('bairro', 39, 50), 'escola');
assert.equal(lugarDoPonto('bairro', 75, 40), 'estacao');
assert.equal(lugarDoPonto('rural', 30, 86), 'roca');
assert.equal(lugarDoPonto('represa', 40, 120), 'estrada');
assert.equal(lugarDoPonto('oficina', 10, 10), 'interior');

// --------------------------------------------------------------- caminhada --
assert.deepEqual([...ACOMPANHANTES].sort(), ['edu', 'leticia']);
for (const id of ACOMPANHANTES) assert(NPCS[id], `${id} precisa existir como NPC`);
assert.equal(podeCaminhar('alice'), false);
const c = novo(3, 'bairro', 600);
assert.equal(caminhadaAtual(c), null);
assert.equal(iniciarCaminhada(c, 'alice'), false, 'so quem tem falas de caminhada caminha');
assert.equal(iniciarCaminhada(c, 'edu'), true);
assert.equal(iniciarCaminhada(c, 'leticia'), false, 'uma caminhada por vez');
assert.equal(caminhadaAtual(c).npc, 'edu');
const naEscola = registrarLugar(c, 'escola');
assert(naEscola && naEscola.includes('muro'));
assert.equal(registrarLugar(c, 'escola'), null, 'lugar repetido nao repete a fala');
assert(registrarLugar(c, 'rio'));
assert.equal(caminhadaAtual(c).lugares.length, 2);
c.relogio.minutos = 645;
const fim = encerrarCaminhada(c);
assert(fim.includes('2 lugares'));
assert.equal(caminhadaAtual(c), null);
assert(lerDiario(c.worldEvents.serializar().flags).some(e => e.texto.includes('Caminhei com edu')));
assert.equal(encerrarCaminhada(c), null);
// Trecho curto: uma parada só tem texto próprio, e continua valendo.
const curta = novo(4);
iniciarCaminhada(curta, 'leticia');
registrarLugar(curta, 'praca');
assert(encerrarCaminhada(curta).includes('trecho curto'));

// ------------------------------------------------------------- acompanhar --
const a = novo(5);
assert.equal(acompanhamentoAtual(a), null);
assert.equal(iniciarAcompanhamento(a, 'jaqueline'), true);
assert.equal(iniciarAcompanhamento(a, 'wendel'), false, 'um acompanhamento por vez');
assert.equal(acompanhamentoAtual(a), 'jaqueline');
assert(encerrarAcompanhamento(a, true).includes('Chegamos'));
assert.equal(acompanhamentoAtual(a), null);
assert.equal(encerrarAcompanhamento(a, true), null);
assert(lerDiario(a.worldEvents.serializar().flags).some(e => e.texto.includes('Acompanhei jaqueline')));
const perdido = novo(6);
iniciarAcompanhamento(perdido, 'edu');
assert(encerrarAcompanhamento(perdido, false).includes('caminhos diferentes'));
assert.equal(lerDiario(perdido.worldEvents.serializar().flags).length, 0, 'nao chegar nao vira registro');

// ------------------------------------------------------------------ banco --
const b = novo(7, 'farm', 20 * 60);
assert(textoAoSentar(b, 'praca').includes('escura'));
b.relogio.minutos = 15 * 60;
assert(textoAoSentar(b, 'praca').includes('nada para resolver'));
const observacoes = new Set([0, 1, 2, 3, 4].map(i => observacaoDoBanco('praca', i)));
assert.equal(observacoes.size, 4, 'quatro observacoes por lugar, em ciclo');
assert.notEqual(observacaoDoBanco('praca', 0), observacaoDoBanco('rio', 0));
for (const lugar of Object.keys(NOME_DO_LUGAR)) assert(observacaoDoBanco(lugar, 0).length > 10, lugar);
registrarBanco(b, 'praca', 10);
assert.equal(lerDiario(b.worldEvents.serializar().flags).length, 0, 'sentar um minuto nao vira registro');
registrarBanco(b, 'praca', 45);
assert(lerDiario(b.worldEvents.serializar().flags).some(e => e.texto.includes('Não estava esperando ninguém')));
assert.equal(quemSenta(b, [], () => 9), null);
assert.equal(quemSenta(b, ['edu'], () => 0), null, 'estranho nao senta junto');
assert.equal(quemSenta(b, ['edu'], () => 6), 'edu');
assert(falaDeQuemSenta('edu', 'praca').includes('lugar nenhum'));
assert(falaDeQuemSenta('ninguem', 'praca').length > 10, 'quem nao tem fala propria ainda cumprimenta');
console.log('Convivencia: lugares, caminhada com falas por lugar, acompanhamento e banco passaram.');

// -------------------------------------------------------- refeicoes e receitas --
const r = novo(8, 'oficina', 19 * 60);
assert.equal(pratosAprendidos(r).length, 0, 'receita nenhuma antes das cenas de vinculo');
assert.equal(comer(r, 'cozinhar', undefined, 'pao'), null, 'sem a receita nao ha prato');
assert.equal(refeicaoDeHoje(r), null);
const sozinho = comer(r, 'sozinho');
assert(sozinho.texto.includes('panela'), 'casa ainda sem mesa posta');
assert.equal(sozinho.relacao, null);
assert.equal(refeicaoDeHoje(r), 'sozinho');
assert(lerDiario(r.worldEvents.serializar().flags).some(e => e.texto.includes('panela')));
const repetida = comer(r, 'sozinho');
assert(repetida.texto.includes('de novo'));
assert.equal(lerDiario(r.worldEvents.serializar().flags).filter(e => e.id === 'refeicao:8').length, 1);
// As quatro receitas dependem de cenas de vinculo ja vividas.
for (const p of PRATOS) {
  assert(p.requisito.startsWith('vinculo:'), p.id);
  r.worldEvents.definir(p.requisito, true);
}
assert.equal(pratosAprendidos(r).length, PRATOS.length);
assert(historiaDoPrato(r, 'conserva').includes('até parecer certo'));
assert.equal(historiaDoPrato(r, 'inexistente'), null);
r.dia = 9;
const jantar = comer(r, 'jantar', 'Wendel');
assert(jantar.texto.includes('Jantei com Wendel'));
assert.deepEqual(jantar.relacao, { npc: 'Wendel', pontos: 0.5 });
r.dia = 10;
const cozinhado = comer(r, 'cozinhar', 'Alice', 'pao');
assert(cozinhado.texto.includes('denso demais'));
assert.deepEqual(cozinhado.relacao, { npc: 'Alice', pontos: 0.5 });
r.dia = 11;
const almoco = { ...r, relogio: { minutos: 12 * 60 } };
assert(comer(almoco, 'jantar', 'Edu').texto.includes('Almocei'));
assert.equal(comer(r, 'jantar'), null, 'jantar exige com quem');
// Convite: exige relacao e hora de refeicao, nao item.
assert.equal(podeConvidar({ ...r, relogio: { minutos: 19 * 60 } }, 4), false);
assert.equal(podeConvidar({ ...r, relogio: { minutos: 19 * 60 } }, 5), true);
assert.equal(podeConvidar({ ...r, relogio: { minutos: 9 * 60 } }, 9), false, 'nove da manha nao e hora de convidar');
assert.equal(podeConvidar({ ...r, relogio: { minutos: 12 * 60 } }, 9), true);
const dados = r.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(dados)));
assert.deepEqual(salvo.serializar(), dados);
console.log('Convivencia: refeicoes sozinho/bar/jantar/cozinhar, quatro receitas de moradores e save passaram.');

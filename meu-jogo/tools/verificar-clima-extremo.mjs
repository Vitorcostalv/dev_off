import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';
import { dataDoDia, DIAS_POR_ESTACAO } from '../src/game/calendario.ts';
import { MAPAS } from '../src/game/mapas.ts';
import { NPCS } from '../src/game/npcs.ts';
import { MORADORES } from '../src/game/moradores.ts';
import { PROJETOS_CIDADE } from '../src/game/cidade.ts';
import {
  EVENTOS_CLIMA, ajudarComGerador, apagaoAtivo, avisarEvento, climaDoEvento, eventoAtivo, eventoDoDia,
  reacaoAoEvento, represaIluminada, textoDoApagao, TEXTO_REPRESA_ACESA,
} from '../src/game/climaExtremo.ts';
import {
  MUDANCAS, deslocamentoDaEstacao, marcasDaEstacao, mudancasVisiveis, resumoDaCidade, textoDaEstacaoDentro, trajeDaEstacao,
} from '../src/game/mudancasUrbanas.ts';

const novo = (dia = 0, mapa = 'bairro', minutos = 600) => ({
  dia, mapa, relogio: { minutos }, worldEvents: new SistemaWorldEvents(),
});

// -------------------------------------------------------- eventos raros --
assert.equal(EVENTOS_CLIMA.length, 6);
assert.deepEqual(EVENTOS_CLIMA.map(e => e.id).sort(),
  ['cheia', 'chuva_prolongada', 'geada', 'neblina_densa', 'onda_de_calor', 'temporal']);
for (const e of EVENTOS_CLIMA) {
  assert(e.estacoes.length >= 1 && e.estacoes.every(s => s >= 0 && s <= 3), e.id);
  assert(e.aviso.length > 10 && e.texto.length > 10 && e.servicos.length > 10, e.id);
}
// Raro e deterministico: os mesmos dias em qualquer maquina.
const dias = [];
for (let d = 0; d < DIAS_POR_ESTACAO * 4; d++) if (eventoDoDia(d)) dias.push(d);
assert(dias.length >= 4 && dias.length <= 8, `${dias.length} eventos no primeiro ano`);
for (const d of dias) {
  const evento = eventoDoDia(d);
  assert(evento.estacoes.includes(dataDoDia(d).estacao), `${evento.id} fora da estacao no dia ${d}`);
  assert.equal(eventoDoDia(d).id, evento.id, 'consulta estavel');
}
assert.equal(eventoDoDia(0), null, 'os primeiros dias ficam livres');
// A chuva prolongada dura tres dias; os outros, um.
const diaChuva = dias.find(d => eventoDoDia(d).id === 'chuva_prolongada');
if (diaChuva !== undefined) {
  assert.equal(eventoAtivo(diaChuva + 1)?.id, 'chuva_prolongada');
  assert.equal(eventoAtivo(diaChuva + 2)?.id, 'chuva_prolongada');
  assert.equal(eventoAtivo(diaChuva + 3), null);
}
const diaCurto = dias.find(d => eventoDoDia(d).id !== 'chuva_prolongada');
assert.equal(eventoAtivo(diaCurto + 1), null, 'evento de um dia nao vaza para o seguinte');
assert.equal(climaDoEvento(diaCurto, 'Limpo'), eventoDoDia(diaCurto).clima);
assert.equal(climaDoEvento(1, 'Limpo'), 'Limpo', 'dia comum mantem o clima do calendario');
// Aviso uma vez, com registro no caderno.
const c = novo(diaCurto);
const avisado = avisarEvento(c);
assert(avisado && avisado.id === eventoDoDia(diaCurto).id);
assert.equal(avisarEvento(c), null, 'um aviso por evento');
assert(lerDiario(c.worldEvents.serializar().flags).some(e => e.texto.includes(avisado.nome)));
assert.equal(avisarEvento(novo(1)), null, 'dia sem evento nao avisa nada');

// -------------------------------------------------------------- apagão --
const diaTemporal = dias.find(d => eventoDoDia(d).id === 'temporal');
assert(diaTemporal !== undefined, 'o primeiro ano precisa ter ao menos um temporal');
assert.equal(apagaoAtivo(diaTemporal, 20 * 60), true);
assert.equal(apagaoAtivo(diaTemporal, 12 * 60), false, 'a luz cai a noite');
assert.equal(apagaoAtivo(diaTemporal, 23 * 60 + 30), false);
assert.equal(apagaoAtivo(diaTemporal + 1, 20 * 60), false);
assert(textoDoApagao('bar').includes('vela'));
assert(textoDoApagao('farmacia').includes('lanterna'));
assert.notEqual(textoDoApagao('bairro'), textoDoApagao('oficina'));
assert.equal(represaIluminada(diaTemporal, 20 * 60, 'bairro'), true);
assert.equal(represaIluminada(diaTemporal, 20 * 60, 'oficina'), false, 'de dentro de casa nao se ve');
assert.equal(represaIluminada(diaTemporal, 12 * 60, 'bairro'), false);
assert(TEXTO_REPRESA_ACESA.includes('não apagou'));
// Gerador: uma vez por apagão, sem pagamento.
const g = novo(diaTemporal, 'bar', 20 * 60);
assert.equal(ajudarComGerador(novo(diaTemporal, 'bar', 12 * 60), 'bar'), null, 'sem apagao nao ha gerador');
const ajuda = ajudarComGerador(g, 'bar');
assert.equal(ajuda.npc, 'alice');
assert.equal(ajuda.pontos, 1);
assert(ajuda.texto.includes('gerador'));
assert.equal(ajudarComGerador(g, 'farmacia'), null, 'uma ajuda por apagao');
assert(lerDiario(g.worldEvents.serializar().flags).some(e => e.texto.includes('gerador')));
// Reações: uma por morador por dia, e só de quem tem fala para aquele evento.
const r = novo(diaTemporal, 'bar', 20 * 60);
const fala = reacaoAoEvento(r, 'alice');
assert(fala && fala.length > 10);
assert.equal(reacaoAoEvento(r, 'alice'), null, 'uma fala por dia');
assert.equal(reacaoAoEvento(r, 'lucas'), null, 'quem nao tem fala fica calado');
assert.equal(reacaoAoEvento(novo(1), 'alice'), null, 'dia comum nao rende fala de clima');
console.log('Clima: seis eventos raros deterministicos, apagao com gerador, represa acesa e reacoes passaram.');

// ------------------------------------------------- mudanças urbanas --
for (const m of MUDANCAS) {
  assert(MAPAS[m.mapa], `${m.id}: mapa inexistente`);
  assert(m.ano >= 1 && m.largura > 0 && m.altura > 0, m.id);
  if (m.obra) assert(Object.hasOwn(PROJETOS_CIDADE, m.obra), `${m.id}: obra ${m.obra} nao existe`);
}
assert.equal(mudancasVisiveis('bairro', 1, []).length, 0, 'no primeiro ano a cidade e a que eu encontrei');
assert(mudancasVisiveis('bairro', 2, []).length >= 2);
assert(mudancasVisiveis('farm', 3, []).length > mudancasVisiveis('farm', 2, []).length);
// Obra financiada aparece antes do ano previsto.
assert.equal(mudancasVisiveis('bairro', 1, ['padaria']).some(m => m.id === 'comercio_padaria'), true);
assert.equal(mudancasVisiveis('bairro', 1, []).some(m => m.id === 'comercio_padaria'), false);
assert(resumoDaCidade(1, []).includes('como eu encontrei'));
assert(resumoDaCidade(4, ['padaria', 'hospital', 'cafeteria', 'ponto_onibus']).includes('procurar o que reconheço'));
// Interiores por estação.
assert.deepEqual(marcasDaEstacao('oficina', 0), [], 'primavera nao muda o interior');
const inverno = marcasDaEstacao('oficina', 3);
assert.equal(inverno.length, 2);
assert.deepEqual(inverno.map(m => m.id), ['janela_fechada', 'cobertor']);
assert.deepEqual(marcasDaEstacao('oficina', 1).map(m => m.id), ['janela_aberta', 'ventilador']);
assert.deepEqual(marcasDaEstacao('represa_f10', 3), [], 'a represa nao recebe cobertor');
assert(textoDaEstacaoDentro(3).includes('cobertor'));
assert(textoDaEstacaoDentro(1).includes('ventilador'));
assert.equal(textoDaEstacaoDentro(0), null);
// Roupa e horário dos figurantes.
assert.equal(trajeDaEstacao(3, 2).acessorio, 'gorro');
assert.equal(trajeDaEstacao(3, 2).cachecol, true);
assert.equal(trajeDaEstacao(1, 2).acessorio, 'nenhum');
assert.notEqual(trajeDaEstacao(1, 2).camisa, trajeDaEstacao(3, 2).camisa);
assert.equal(deslocamentoDaEstacao(19 * 60, 3), null, 'no inverno ninguem fica na rua a noite');
assert.equal(deslocamentoDaEstacao(7 * 60, 3), -30);
assert.equal(deslocamentoDaEstacao(19 * 60, 1), 30, 'no verao a noite comeca depois');
assert.equal(deslocamentoDaEstacao(12 * 60, 1), 60, 'o meio do dia de verao sai do sol');
assert.equal(deslocamentoDaEstacao(7 * 60, 0), 0);
// Os moradores citados nas reações existem.
const dados = g.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(dados)));
assert.deepEqual(salvo.serializar(), dados);
console.log('Clima: mudancas urbanas por ano e por obra, interiores por estacao e figurantes sazonais passaram.');

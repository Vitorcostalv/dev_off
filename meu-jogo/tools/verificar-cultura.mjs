import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { SistemaClima } from '../src/game/clima.ts';
import { SistemaCidade, PROJETOS_CIDADE } from '../src/game/cidade.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';
import { MAPAS } from '../src/game/mapas.ts';
import { NPCS } from '../src/game/npcs.ts';
import { MORADORES } from '../src/game/moradores.ts';
import { faixaDoMinuto, programaDoMomento, programaRadio, temReferenciaDaRepresa, NOME_DA_FAIXA } from '../src/game/radio.ts';
import { edicaoDaSemana, jaLeuEdicao, marcarEdicaoLida, numeroDaEdicao, primeiroDiaDaEdicao } from '../src/game/jornal.ts';
import { LIVROS, NOME_DO_ASSUNTO, assuntosDisponiveis, jaLeu, livrosDisponiveis, livrosDoAssunto, marcarLido, quantosLidos } from '../src/game/biblioteca.ts';
import {
  ARQUIVISTAS, DOCUMENTOS, coletarDocumento, documentosArquivados, documentosDoMapa, entregarAoArquivo,
  museuAberto, naMochila, progressoDoArquivo, secoesDoMuseu, temDocumento,
} from '../src/game/memoriaDaCidade.ts';
import { falaDeViagem, paisagemDaViagem } from '../src/game/viagem.ts';

const novo = (dia = 0) => ({
  dia,
  clima: new SistemaClima(),
  cidade: new SistemaCidade(),
  relacoes: { listaInteragidos: () => ['edu', 'jaqueline', 'clara'], getScore: () => 6 },
  worldEvents: new SistemaWorldEvents(),
});

// ----------------------------------------------------------------- rádio --
assert.equal(faixaDoMinuto(0), 'madrugada');
assert.equal(faixaDoMinuto(7 * 60), 'manha');
assert.equal(faixaDoMinuto(14 * 60), 'tarde');
assert.equal(faixaDoMinuto(21 * 60), 'noite');
assert.equal(faixaDoMinuto(-30), 'noite', 'minuto negativo cai na faixa certa do dia anterior');
for (const faixa of Object.keys(NOME_DA_FAIXA)) assert(NOME_DA_FAIXA[faixa].length > 3);
// Cada faixa tem programa proprio e rotativo.
const manhas = new Set([0, 1, 2, 4, 5, 6].map(d => programaDoMomento(d, 8 * 60).texto));
assert(manhas.size >= 5, 'a grade da manha gira entre os dias');
assert(programaDoMomento(0, 8 * 60).texto.includes('Segunda-feira'), 'a manha anuncia o dia');
assert(programaDoMomento(0, 8 * 60, 'Chuva').texto.includes('chuva'), 'a manha anuncia o tempo');
assert.equal(programaDoMomento(0, 2 * 60).faixa, 'madrugada');
assert.equal(programaDoMomento(5, 14 * 60).faixa, 'tarde');
assert(programaDoMomento(5, 20 * 60).texto.includes('“'), 'a noite le recados');
// Represa: referencia ocasional, so em servico, e nunca todo dia.
assert.equal(temReferenciaDaRepresa(3), true);
assert.equal(temReferenciaDaRepresa(4), false);
assert(programaDoMomento(3, 8 * 60).texto.includes('represa') || programaDoMomento(3, 8 * 60).texto.includes('usina'));
assert.equal(programaDoMomento(4, 8 * 60).texto.includes('usina'), false);
assert(programaRadio(240, 0).startsWith('Madrugada'));
console.log('Cultura: quatro faixas de rádio por horário, grade rotativa e represa ocasional passaram.');

// ---------------------------------------------------------------- jornal --
assert.equal(numeroDaEdicao(0), 1);
assert.equal(numeroDaEdicao(6), 1);
assert.equal(numeroDaEdicao(7), 2);
assert.equal(primeiroDiaDaEdicao(9), 7);
const j = novo(9);
const edicao = edicaoDaSemana(j);
assert.equal(edicao.numero, 2);
assert.equal(edicao.secoes.length, 6);
assert.deepEqual(edicao.secoes.map(s => s.titulo), ['Obras', 'Agenda', 'Tempo', 'Moradores', 'Memória', 'Circulando']);
assert(edicao.secoes[0].texto.includes('Nenhuma obra'), 'sem obra, o jornal diz que nao ha obra');
assert(edicao.manchete === edicao.manchete.toUpperCase(), 'manchete em caixa alta');
assert(edicao.secoes[2].texto.includes('Semana predominantemente'));
// A manchete reage a obra financiada pelo jogador na semana.
j.cidade.construir('padaria');
j.worldEvents.definir('jornal:obra:padaria', 8);
const comObra = edicaoDaSemana(j);
assert(comObra.manchete.includes(PROJETOS_CIDADE.padaria.nome.toUpperCase()), comObra.manchete);
assert(comObra.secoes[0].texto.includes('entrou em funcionamento'));
// Semana seguinte: a obra continua listada, mas nao e mais manchete.
const depois = edicaoDaSemana({ ...j, dia: 30 });
assert(!depois.manchete.includes('PADARIA'), depois.manchete);
assert(depois.secoes[0].texto.includes('Nenhuma obra nova'));
// Rumores acompanham o mundo: bicho, represa e oficina movimentada.
j.worldEvents.definir('companhia:nome', 'Lasca');
j.worldEvents.definir('social:noiteRepresa', 8);
j.worldEvents.definir('oficina:servicos', 6);
const circulando = edicaoDaSemana(j).secoes[5].texto;
assert(circulando.includes('Lasca') && circulando.includes('estrada alta') && circulando.includes('oficina'));
// Memória cita o arquivo depois de três documentos.
j.worldEvents.definir('memoria:arquivados', 3);
assert(edicaoDaSemana(j).secoes[4].texto.includes('arquivo histórico'));
assert.equal(jaLeuEdicao(j, 2), false);
marcarEdicaoLida(j, 2);
assert.equal(jaLeuEdicao(j, 2), true);
console.log('Cultura: jornal semanal com seis seções, manchete reagindo à obra e rumores do mundo passaram.');

// ------------------------------------------------------------ biblioteca --
const b = novo();
assert.equal(LIVROS.length, 14);
assert.equal(new Set(LIVROS.map(l => l.id)).size, 14, 'ids unicos');
for (const l of LIVROS) {
  assert(l.paginas.length >= 3, l.id);
  assert(NOME_DO_ASSUNTO[l.assunto], `${l.id}: assunto desconhecido`);
}
assert.equal(new Set(LIVROS.map(l => l.assunto)).size, 7, 'os sete assuntos do checklist');
const antes = livrosDisponiveis(b).length;
assert(antes < LIVROS.length, 'alguns titulos dependem de progresso');
b.worldEvents.definir('campanha:cena:prologo', true);
b.worldEvents.definir('campanha:profundidade', 4);
b.worldEvents.definir('memoria:ferrovia', true);
assert.equal(livrosDisponiveis(b).length, LIVROS.length);
assert.equal(assuntosDisponiveis(b).length, 7);
assert.equal(livrosDoAssunto(b, 'ferrovia').length, 2);
assert.equal(quantosLidos(b), 0);
assert.equal(jaLeu(b, 'fundacao'), false);
assert.equal(marcarLido(b, 'fundacao'), true);
assert.equal(marcarLido(b, 'fundacao'), false, 'ler duas vezes nao conta duas vezes');
assert.equal(marcarLido(b, 'inexistente'), false);
assert.equal(quantosLidos(b), 1);

// ------------------------------------------------- documentos e arquivo --
assert.equal(DOCUMENTOS.length, 12);
assert.equal(new Set(DOCUMENTOS.map(d => d.id)).size, 12);
for (const d of DOCUMENTOS) assert(MAPAS[d.mapa], `${d.id}: mapa ${d.mapa} nao existe`);
assert(documentosDoMapa('bairro').length >= 3);
assert.equal(documentosDoMapa('oficina').length, 0, 'documento nenhum dentro de casa');
const m = novo(5);
assert.equal(temDocumento(m, 'horario_trem'), false);
const doc = coletarDocumento(m, 'horario_trem');
assert.equal(doc.tema, 'ferrovia');
assert.equal(coletarDocumento(m, 'horario_trem'), null, 'nao recolhe duas vezes');
assert.equal(temDocumento(m, 'horario_trem'), true);
assert(m.worldEvents.ativa('memoria:ferrovia'), 'a ferrovia abre os livros dela');
assert(lerDiario(m.worldEvents.serializar().flags).some(e => e.texto.includes('biblioteca')));
assert.equal(naMochila(m).length, 1);
assert.equal(entregarAoArquivo(m, 'horario_trem', 'edu'), null, 'so Clara e Ilda catalogam');
for (const id of ARQUIVISTAS) assert(MORADORES[id] || NPCS[id], `${id} precisa existir`);
const catalogado = entregarAoArquivo(m, 'horario_trem', 'clara');
assert.equal(catalogado.total, 1);
assert.equal(catalogado.abriuMuseu, false);
assert(catalogado.fala.includes('ferrovia'));
assert.equal(entregarAoArquivo(m, 'horario_trem', 'clara'), null);
assert.equal(naMochila(m).length, 0);
// Ilda cataloga com outra fala.
coletarDocumento(m, 'folha_ponto');
assert.notEqual(entregarAoArquivo(m, 'folha_ponto', 'ilda').fala, catalogado.fala);
assert(progressoDoArquivo(m).texto.includes('2 de 12'));
// Oito documentos abrem a sala de memoria, uma vez só.
const restantes = DOCUMENTOS.filter(d => !temDocumento(m, d.id)).slice(0, 6);
let abriu = 0;
for (const d of restantes) { coletarDocumento(m, d.id); if (entregarAoArquivo(m, d.id, 'clara').abriuMuseu) abriu += 1; }
assert.equal(abriu, 1, 'a sala abre uma vez');
assert.equal(museuAberto(m), true);
assert.equal(documentosArquivados(m).length, 8);
assert(lerDiario(m.worldEvents.serializar().flags).some(e => e.texto.includes('sala de memória')));
const secoes = secoesDoMuseu(m);
assert(secoes.length >= 3, 'a exposicao sai por tema');
for (const s of secoes) assert(s.pecas.length > 0 && s.texto.length > 10);
assert.equal(secoesDoMuseu(novo()).length, 0, 'sala vazia antes de qualquer entrega');
console.log('Cultura: 14 livros em sete assuntos, 12 documentos, arquivo com Clara e Ilda e sala de memória passaram.');

// ------------------------------------------------------------- ônibus --
const paisagem = paisagemDaViagem('rural', 'Limpo', 12 * 60);
assert(paisagem.length >= 5);
assert(paisagem.some(t => t.includes('terra')));
const comChuva = paisagemDaViagem('rural', 'Chuva', 12 * 60);
assert(comChuva.length > paisagem.length && comChuva.some(t => t.includes('chuva')));
const aNoite = paisagemDaViagem('farm', 'Limpo', 21 * 60);
assert(aNoite.some(t => t.includes('espelho')));
assert.deepEqual(paisagemDaViagem('destino_inexistente', 'Limpo', 12 * 60), paisagemDaViagem('farm', 'Limpo', 12 * 60));
const v = novo(0);
assert.equal(falaDeViagem({ ...v, dia: 1 }, 'farm'), null, 'nem toda viagem tem companhia');
assert(falaDeViagem({ ...v, dia: 2 }, 'farm'), 'com conhecidos, alguem senta junto');
assert.equal(falaDeViagem({ ...v, dia: 2, relacoes: { getScore: () => 0 } }, 'farm'), null, 'estranho nao puxa conversa');
const dados = m.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(dados)));
assert.deepEqual(salvo.serializar(), dados);
assert.equal(museuAberto({ dia: 0, worldEvents: salvo }), true);
console.log('Cultura: paisagem do ônibus por destino, clima e hora, companhia ocasional e save passaram.');

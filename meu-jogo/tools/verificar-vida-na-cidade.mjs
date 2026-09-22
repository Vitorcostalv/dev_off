import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { aproximar, adotar, alimentar, companhia, companhiaNoMapa, alcanceDaCompanhia, falaSobreCompanhia, lugarDoDescanso, pretendenteNoMapa, textoDaCompanhia } from '../src/game/companhia.ts';
import { FAUNA, faunaDoMomento, reconhecer, nomeConhecido, textoDoAnimal, conhecidosPeloNome } from '../src/game/fauna.ts';
import { CONJUNTOS, adequadoAoClima, comentarioDaPeca, comentarioDaRoupa, conjuntoAtual, conjuntosDisponiveis, crescimento, cuidar, pecaAtual, pecasDisponiveis, textoDoCrescimento, usarPeca, vestir } from '../src/game/guardaRoupa.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';

const novo = () => ({ dia: 0, mapa: 'rural', relogio: { minutos: 600 }, worldEvents: new SistemaWorldEvents() });

// ----------------------------------------------------------- companhia --
const c = novo();
assert.equal(pretendenteNoMapa(c, 'rural').id, 'cachorro_rural');
assert.equal(pretendenteNoMapa(c, 'farm'), null);
// Tres dias de aproximacao; repetir no mesmo dia nao adianta o vinculo.
assert.equal(aproximar(c, 'cachorro_rural').adotavel, false);
assert.equal(aproximar(c, 'cachorro_rural').adotavel, false);
assert.equal(adotar(c, 'cachorro_rural', 'Lasca'), false);
c.dia = 1; assert.equal(aproximar(c, 'cachorro_rural').adotavel, false);
c.dia = 2; assert.equal(aproximar(c, 'cachorro_rural').adotavel, true);
assert.equal(adotar(c, 'cachorro_rural', 'Bidu'), false, 'nome fora da lista');
assert.equal(adotar(c, 'cachorro_rural', 'Lasca'), true);
assert.equal(adotar(c, 'cachorro_rural', 'Pino'), false, 'nao adota duas vezes');
assert.equal(pretendenteNoMapa(c, 'bairro'), null, 'com bicho em casa ninguem mais e pretendente');
const bicho = companhia(c);
assert.equal(bicho.nome, 'Lasca');
assert.equal(bicho.especie, 'cachorro');
assert.equal(bicho.comeuHoje, false);
assert(lerDiario(c.worldEvents.serializar().flags).some(e => e.texto.includes('Lasca veio comigo')));
// Alimentar vale uma vez por dia e nao ha punicao por esquecer.
assert(alimentar(c).includes('tigela'));
assert(alimentar(c).includes('já comeu hoje'));
assert.equal(companhia(c).convivio, 1);
c.dia = 3; assert(alimentar(c));
assert.equal(companhia(c).convivio, 2);
// Lugares de descanso mudam com o dia; chuva recolhe para perto da porta.
const lugares = new Set();
for (let d = 0; d < 8; d++) { c.dia = d; lugares.add(lugarDoDescanso(c, 'Limpo').texto); }
assert(lugares.size >= 4, 'dorme em lugares diferentes');
assert(lugarDoDescanso(c, 'Temporal').texto.includes('chuva'));
assert(alcanceDaCompanhia('Temporal') < alcanceDaCompanhia('Chuva'));
assert(alcanceDaCompanhia('Chuva') < alcanceDaCompanhia('Limpo'));
assert.equal(companhiaNoMapa(c, 'oficina'), true);
assert.equal(companhiaNoMapa(c, 'bairro'), true);
assert.equal(companhiaNoMapa(c, 'represa_f10'), false);
assert(textoDaCompanhia(c, 'Limpo', true).includes('Lasca está'));
assert(textoDaCompanhia(c, 'Chuva', false).includes('beiral'));
c.dia = 9;
assert(falaSobreCompanhia(c, 'jaqueline').includes('Lasca'));
assert.equal(falaSobreCompanhia(c, 'jaqueline'), null, 'cada morador comenta uma vez');
assert.equal(falaSobreCompanhia(c, 'clara'), null, 'quem nao tem fala fica calado');
console.log('Companhia: adocao em tres dias, alimentacao opcional, lugares de sono, alcance por clima e falas passaram.');

// --------------------------------------------------------------- fauna --
const f = novo();
const manha = faunaDoMomento('farm', 0, 7 * 60, 'Limpo', 0);
assert(manha.some(a => a.especie === 'passaro'));
assert.equal(faunaDoMomento('farm', 0, 7 * 60, 'Chuva', 0).some(a => a.id === 'passaros_praca'), false, 'chuva tira quem exige tempo seco');
assert(faunaDoMomento('bairro', 0, 23 * 60, 'Chuva', 0).some(a => a.especie === 'sapo'), 'sapos aparecem na chuva');
assert.equal(faunaDoMomento('bairro', 0, 12 * 60, 'Chuva', 0).some(a => a.especie === 'sapo'), false, 'sapo noturno nao aparece ao meio-dia');
assert(faunaDoMomento('represa', 0, 22 * 60, 'Limpo', 1).some(a => a.especie === 'vagalume'));
assert.equal(faunaDoMomento('represa', 0, 22 * 60, 'Limpo', 3).some(a => a.especie === 'vagalume'), false, 'vagalume nao aparece no inverno');
// Consulta pura: mesma entrada, mesma lista.
assert.deepEqual(faunaDoMomento('farm', 5, 9 * 60, 'Limpo', 0), faunaDoMomento('farm', 5, 9 * 60, 'Limpo', 0));
const farofa = FAUNA.find(a => a.id === 'gato_farofa');
assert.equal(nomeConhecido(f, farofa), null);
for (let d = 0; d < 3; d++) { f.dia = d; assert.equal(reconhecer(f, farofa.id), d + 1); assert.equal(reconhecer(f, farofa.id), d + 1, 'um encontro por dia'); }
assert.equal(nomeConhecido(f, farofa), 'Farofa');
assert(textoDoAnimal(f, farofa).includes('Já sei o nome'));
assert.deepEqual(conhecidosPeloNome(f), ['Farofa']);
const semNome = FAUNA.find(a => !a.nome);
f.dia = 20; reconhecer(f, semNome.id); f.dia = 21; reconhecer(f, semNome.id);
assert.equal(nomeConhecido(f, semNome), null, 'bicho sem nome declarado nunca ganha um');
assert(textoDoAnimal(f, semNome).includes('já vi antes'));
console.log('Fauna: janela por hora, clima e estacao, consulta determinística e reconhecimento por nome passaram.');

// ---------------------------------------------------------- guarda-roupa --
const r = novo();
assert.equal(conjuntosDisponiveis(r).length, 1, 'so a roupa de todo dia no comeco');
assert.equal(conjuntoAtual(r).id, 'casual');
assert.equal(vestir(r, 'represa'), false, 'nao veste o que nao tem');
r.worldEvents.definir('visual:chuva:bairro', 120);
r.worldEvents.definir('campanha:cena:oficina', true);
r.worldEvents.definir('campanha:profundidade', 3);
r.dia = 90;
assert.equal(conjuntosDisponiveis(r).length, CONJUNTOS.length);
assert.equal(vestir(r, 'chuva'), true);
assert.equal(conjuntoAtual(r).id, 'chuva');
assert.equal(adequadoAoClima(conjuntoAtual(r), 'Temporal', 0), true);
assert.equal(adequadoAoClima(conjuntoAtual(r), 'Calor', 1), false);
assert.equal(comentarioDaRoupa(r, 'Temporal', 0), null, 'roupa certa nao rende comentario');
const aviso = comentarioDaRoupa(r, 'Calor', 1);
assert(aviso && aviso.includes('sol'));
assert.equal(comentarioDaRoupa(r, 'Calor', 1), null, 'um comentario por dia');
// Pecas de moradores: dependem do vinculo e sao notadas uma vez por quem deu.
assert.equal(pecasDisponiveis(r).length, 0);
r.worldEvents.definir('vinculo:jaqueline:2', true);
assert.equal(pecasDisponiveis(r).length, 1);
assert.equal(usarPeca(r, 'bone'), false);
assert.equal(usarPeca(r, 'cachecol'), true);
assert.equal(pecaAtual(r).npc, 'jaqueline');
assert.equal(comentarioDaPeca(r, 'edu'), null);
assert(comentarioDaPeca(r, 'jaqueline').includes('torto'));
assert.equal(comentarioDaPeca(r, 'jaqueline'), null);
assert.equal(usarPeca(r, null), true);
assert.equal(pecaAtual(r), null);
// Cabelo e barba: tres estagios por tempo, recaida adianta, cuidar zera.
const a = novo();
assert.deepEqual(crescimento(a), { cabelo: 0, barba: 0 });
a.dia = 14; assert.deepEqual(crescimento(a), { cabelo: 1, barba: 1 });
a.dia = 40; assert.deepEqual(crescimento(a), { cabelo: 2, barba: 2 });
assert(textoDoCrescimento(a).includes('forma própria'));
cuidar(a, 'barba');
assert.deepEqual(crescimento(a), { cabelo: 2, barba: 0 });
cuidar(a, 'cabelo');
assert.deepEqual(crescimento(a), { cabelo: 0, barba: 0 });
const b = novo();
b.worldEvents.definir('campanha:cena:recaida', true);
assert.deepEqual(crescimento(b), { cabelo: 1, barba: 1 }, 'a recaida adianta um estagio');
cuidar(b, 'ambos');
assert.deepEqual(crescimento(b), { cabelo: 0, barba: 0 });
b.dia = 100;
assert.deepEqual(crescimento(b), { cabelo: 2, barba: 2 }, 'depois de cuidar, volta a contar so o tempo');
// Save: tudo isso vive nas flags e sobrevive a um ciclo completo.
const serializado = c.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(serializado)));
assert.deepEqual(salvo.serializar(), serializado);
assert.equal(companhia({ ...c, worldEvents: salvo }).nome, 'Lasca');
console.log('Guarda-roupa: cinco conjuntos, pecas de moradores, comentario por clima, cabelo/barba e save passaram.');

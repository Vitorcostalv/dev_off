import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';
import { NPCS } from '../src/game/npcs.ts';
import { MORADORES } from '../src/game/moradores.ts';
import { PROJETOS_CIDADE } from '../src/game/cidade.ts';
import {
  cenaDaConsulta, consultasFeitas, falaDeQuemViu, mancando, marcasDeFerimento, nivelDeFerimento,
  registrarConsulta, registrarFerimentoNaRepresa, textoDoFerimento, voltouFeridoDaRepresa,
} from '../src/game/cuidado.ts';

const novo = (fracao = 1, mapa = 'bairro', dia = 0) => ({
  dia, mapa, vida: { fracao }, worldEvents: new SistemaWorldEvents(),
});

// ---------------------------------------------------------------- niveis --
assert.equal(nivelDeFerimento(1), 0);
assert.equal(nivelDeFerimento(0.95), 0);
assert.equal(nivelDeFerimento(0.8), 1);
assert.equal(nivelDeFerimento(0.5), 2);
assert.equal(nivelDeFerimento(0.1), 3);
assert.equal(nivelDeFerimento(NaN), 0, 'fracao invalida nao inventa ferimento');
assert.deepEqual(marcasDeFerimento(0), []);
assert.equal(marcasDeFerimento(1).length, 1);
assert.equal(marcasDeFerimento(2).length, 2);
assert.equal(marcasDeFerimento(3).length, 4);
// As marcas ficam acima dos pés e dentro da altura do sprite (48 px).
for (const nivel of [1, 2, 3]) {
  for (const m of marcasDeFerimento(nivel)) {
    assert(m.y < 0 && m.y > -48, `${nivel}:${m.parte} fora do corpo`);
    assert(m.w > 0 && m.h > 0);
  }
}
assert.equal(mancando(1), false);
assert.equal(mancando(2), true);
assert.equal(mancando(3), true);
for (const nivel of [0, 1, 2, 3]) assert(textoDoFerimento(nivel).length > 10, String(nivel));
assert(textoDoFerimento(2).includes('torto'));

// ------------------------------------------------- voltar ferido da represa --
const c = novo(0.5, 'represa_f12', 4);
assert.equal(voltouFeridoDaRepresa(c), false, 'dentro da represa ainda nao e volta');
registrarFerimentoNaRepresa(c);
assert.equal(c.worldEvents.obter('cuidado:represa'), 4);
c.mapa = 'bairro';
assert.equal(voltouFeridoDaRepresa(c), true);
// Sem ferimento, descer e voltar nao marca nada.
const inteiro = novo(1, 'represa_f3', 4);
registrarFerimentoNaRepresa(inteiro);
assert.equal(inteiro.worldEvents.obter('cuidado:represa'), undefined);
// Uma fala por morador por dia, e so de quem tem fala propria.
const wendel = falaDeQuemViu(c, 'wendel');
// Nivel 2 escolhe a segunda fala de Wendel: curativo no balcao, sem cobranca.
assert(wendel && wendel.includes('curativo'));
assert.equal(falaDeQuemViu(c, 'wendel'), null, 'uma vez por dia');
assert(falaDeQuemViu(c, 'mari'));
assert.equal(falaDeQuemViu(c, 'lucas'), null, 'quem nao tem fala fica calado');
// O nivel escolhe a fala: leve e grave nao dizem a mesma coisa.
const leve = novo(0.8, 'represa_f2', 9);
registrarFerimentoNaRepresa(leve);
leve.mapa = 'bairro';
const grave = novo(0.2, 'represa_f2', 9);
registrarFerimentoNaRepresa(grave);
grave.mapa = 'bairro';
assert.notEqual(falaDeQuemViu(leve, 'jaqueline'), falaDeQuemViu(grave, 'jaqueline'));
// No dia seguinte, ninguem cobra o que viu ontem.
c.dia = 5;
assert.equal(voltouFeridoDaRepresa(c), false);
assert.equal(falaDeQuemViu(c, 'alice'), null);
console.log('Cuidado: tres niveis de ferimento, marcas no corpo, passo torto e falas de quem ve passaram.');

// --------------------------------------------------------------- consulta --
const p = novo(0.4, 'bairro', 6);
assert.equal(consultasFeitas(p), 0);
const primeira = cenaDaConsulta(p, 'rafael', 'Rafael');
assert(primeira[0].texto.includes('luz branca'), 'a primeira guarda o desconforto');
assert(primeira.some(f => f.texto.includes('explicar cada passo')), 'ferimento alto explica antes de tocar');
assert(primeira.some(f => f.npcId === 'rafael'), 'quem atende fala como morador');
assert.equal(primeira.length, 4);
assert.equal(registrarConsulta(p), 1);
assert(lerDiario(p.worldEvents.serializar().flags).some(e => e.texto.includes('não gosto de consultório') || e.texto.includes('Não gosto de consultório')));
const segunda = cenaDaConsulta(p, 'rafael', 'Rafael');
assert(segunda[0].texto.includes('Reconheço a cadeira'));
assert.notEqual(segunda[0].texto, primeira[0].texto);
registrarConsulta(p);
const terceira = cenaDaConsulta(p, null, 'Atendimento');
assert(terceira[0].texto.includes('onde ficam as coisas'));
assert.equal(terceira.length, 3, 'sem morador atendendo, sem fala pessoal');
for (let i = 0; i < 4; i++) registrarConsulta(p);
assert(cenaDaConsulta(p, null, 'Atendimento')[0].texto.includes('Cheguei, sentei'));
// Ferimento leve muda o que o atendimento diz.
const leveConsulta = novo(0.8, 'bairro', 7);
assert(cenaDaConsulta(leveConsulta, null, 'Atendimento').some(f => f.texto.includes('Não é grave')));
// Os tres candidatos do posto de saude existem e tem fala propria.
const posto = PROJETOS_CIDADE.hospital ?? Object.values(PROJETOS_CIDADE).find(p2 => p2.id === 'hospital');
for (const id of posto.candidatos) {
  assert(MORADORES[id] || NPCS[id], `${id} precisa existir`);
  const cena = cenaDaConsulta(novo(0.5), id, 'Atendente');
  assert.equal(cena.length, 4, `${id} deveria ter fala pessoal`);
}
const dados = p.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(dados)));
assert.deepEqual(salvo.serializar(), dados);
assert.equal(consultasFeitas({ ...p, worldEvents: salvo }), 6);
console.log('Cuidado: consulta em cena com quatro aberturas, fala de quem atende e save passaram.');

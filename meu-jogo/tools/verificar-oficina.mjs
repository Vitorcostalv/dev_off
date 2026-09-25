import assert from 'node:assert/strict';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { lerDiario } from '../src/game/diarioPessoal.ts';
import { quadroDoDia, VAGAS_POR_DIA } from '../src/game/trabalhos.ts';
import { APARELHOS } from '../src/game/aparelhos.ts';
import {
  CARGA_PADRAO, CLIENTES, FALHAS, ORDEM_DE_FALHA, PRECOS, SINTOMAS, acimaDaCarga, aparelhoDoCliente,
  avaliarDiagnostico, cargaEscolhida, clienteDaVaga, comentarioDeExcesso, declararDiaLivre, definirCarga,
  desfazerDiaLivre, diasSeguidosTrabalhando, ehDiaLivre, falaDoCliente, opcoesDeDiagnostico, registrarServico,
  registrarServicoDoDia, registrarVisita, reputacao, rotuloDeReputacao, servicosHoje, sintomaDaVaga,
  textoDoDiaLivre, vagasExtras, visitasDoCliente,
} from '../src/game/oficina.ts';

const novo = (dia = 0) => ({ dia, worldEvents: new SistemaWorldEvents() });

// ------------------------------------------------------------ diagnostico --
assert.equal(SINTOMAS.length, 12);
for (const falha of ORDEM_DE_FALHA) {
  assert.equal(SINTOMAS.filter(s => s.falha === falha).length, 2, `dois sintomas para ${falha}`);
  assert(FALHAS[falha].nome && FALHAS[falha].conserto);
}
for (const s of SINTOMAS) assert.equal(s.pistas.length, 3, s.id);
// O sintoma e deterministico por vaga e dia, e muda de um dia para o outro.
assert.equal(sintomaDaVaga('conserto_celular', 3).id, sintomaDaVaga('conserto_celular', 3).id);
const variados = new Set([...Array(40).keys()].map(d => sintomaDaVaga('conserto_celular', d).id));
assert(variados.size >= 6, `so ${variados.size} sintomas em 40 dias`);
// Quatro hipoteses distintas, sempre com a certa entre elas.
for (let dia = 0; dia < 60; dia++) {
  for (const id of ['conserto_celular', 'conserto_notebook', 'conserto_console']) {
    const sintoma = sintomaDaVaga(id, dia);
    const opcoes = opcoesDeDiagnostico(sintoma, id, dia);
    assert.equal(opcoes.length, 4, `${id}:${dia}`);
    assert.equal(new Set(opcoes).size, 4, 'sem hipotese repetida');
    assert(opcoes.includes(sintoma.falha), 'a falha certa esta na lista');
    assert.deepEqual(opcoes, opcoesDeDiagnostico(sintoma, id, dia), 'ordem estavel');
  }
}
const sintoma = SINTOMAS[0];
const certo = avaliarDiagnostico(sintoma, sintoma.falha);
const errado = avaliarDiagnostico(sintoma, ORDEM_DE_FALHA.find(f => f !== sintoma.falha));
assert.equal(certo.certo, true);
assert(certo.fator > 1 && certo.fator <= 1.2, 'acerto paga um pouco mais');
assert.equal(errado.certo, false);
assert(errado.fator < 1 && errado.fator >= 0.8, 'erro custa pouco, e nunca zera');
assert(errado.texto.includes(FALHAS[sintoma.falha].nome.toLowerCase()), 'o texto diz qual era a falha');
assert.equal(Object.keys(PRECOS).length, 3);
assert(PRECOS.baixo.fator < PRECOS.justo.fator && PRECOS.justo.fator < PRECOS.alto.fator);
console.log('Oficina: 12 sintomas, seis falhas, quatro hipoteses deterministicas e ajuste de pagamento passaram.');

// ------------------------------------------------------ clientes recorrentes --
assert.equal(CLIENTES.length, 6);
for (const c of CLIENTES) {
  assert(c.aparelhos.length >= 3 && c.historia.length >= 4, c.id);
  for (const a of c.aparelhos) assert(APARELHOS.some(x => x.id === a), `${c.id}: aparelho ${a} nao existe`);
  // O aparelho e a fala evoluem com as visitas e nunca saem da lista.
  assert.equal(aparelhoDoCliente(c, 0), c.aparelhos[0]);
  assert.equal(aparelhoDoCliente(c, 99), c.aparelhos[c.aparelhos.length - 1]);
  assert.equal(falaDoCliente(c, 99), c.historia[c.historia.length - 1]);
  assert.notEqual(falaDoCliente(c, 0), falaDoCliente(c, 1));
}
const cv = novo();
const cliente = clienteDaVaga('conserto_celular', 5);
assert.equal(cliente.id, clienteDaVaga('conserto_celular', 5).id, 'mesmo dia, mesmo cliente');
assert.equal(visitasDoCliente(cv, cliente.id), 0);
assert.equal(registrarVisita(cv, cliente.id), 1);
assert.equal(registrarVisita(cv, cliente.id), 2);
assert.equal(visitasDoCliente(cv, cliente.id), 2);
const clientesUsados = new Set([...Array(30).keys()].map(d => clienteDaVaga('conserto_celular', d).id));
assert(clientesUsados.size >= 4, 'os clientes se alternam ao longo dos dias');
console.log('Oficina: seis clientes recorrentes com aparelho e fala que evoluem passaram.');

// --------------------------------------------------------------- reputacao --
const r0 = novo();
const inicial = reputacao(r0);
assert.deepEqual([inicial.confiabilidade, inicial.velocidade, inicial.qualidade, inicial.preco], [50, 50, 50, 50]);
assert.equal(inicial.servicos, 0);
assert(rotuloDeReputacao(inicial).includes('sem histórico'));
assert.equal(vagasExtras(r0), 0);
const bom = novo();
for (let i = 0; i < 6; i++) registrarServico(bom, { completo: true, fracaoTempo: 0.8, diagnostico: true, preco: 'justo' });
const rb = reputacao(bom);
assert.equal(rb.servicos, 6);
assert.equal(rb.confiabilidade, 100);
assert.equal(rb.qualidade, 100);
assert.equal(rb.velocidade, 80);
assert.equal(rb.preco, 100, 'cobrar o justo nao desgasta o preco');
assert.equal(vagasExtras(bom), 2, 'reputacao alta traz duas vagas a mais');
const ruim = novo();
for (let i = 0; i < 6; i++) registrarServico(ruim, { completo: false, fracaoTempo: 0.05, diagnostico: false, preco: 'alto' });
const rr = reputacao(ruim);
assert.equal(rr.confiabilidade, 0);
assert.equal(rr.qualidade, 0);
assert(rr.preco < 40, 'cobrar sempre caro derruba o eixo de preco');
assert.equal(vagasExtras(ruim), 0);
assert(rotuloDeReputacao(rr).includes('ninguém garante'));
// O quadro do dia cresce com a reputacao, sem perder as vagas de antes.
const base = quadroDoDia(10);
assert.equal(base.length, VAGAS_POR_DIA);
assert.equal(quadroDoDia(10, 2).length, VAGAS_POR_DIA + 2);
assert.deepEqual(quadroDoDia(10, 2).slice(0, 0), []);
for (const vaga of base) assert(quadroDoDia(10, 2).some(v => v.id === vaga.id), 'as vagas antigas continuam no quadro');
assert.equal(quadroDoDia(10, 99).length, VAGAS_POR_DIA + 2, 'o acrescimo tem teto');
console.log('Oficina: quatro eixos de reputacao, rotulos e vagas extras no quadro passaram.');

// ------------------------------------------------- carga, excesso e folga --
const t = novo(4);
assert.equal(cargaEscolhida(t), CARGA_PADRAO);
assert.equal(definirCarga(t, 0), false);
assert.equal(definirCarga(t, 6), false);
assert.equal(definirCarga(t, 2), true);
assert.equal(cargaEscolhida(t), 2);
assert.equal(servicosHoje(t), 0);
assert.equal(acimaDaCarga(t), false);
assert.equal(registrarServicoDoDia(t), 1);
assert.equal(registrarServicoDoDia(t), 2);
assert.equal(acimaDaCarga(t), true, 'dois de dois ja e o combinado');
assert.equal(comentarioDeExcesso(t), null, 'estar no limite nao rende cobranca');
registrarServicoDoDia(t);
const excesso = comentarioDeExcesso(t);
assert(excesso && excesso.includes('3 serviços hoje'));
// O aviso acompanha cada serviço a mais (o numero muda), mas o caderno so registra uma vez.
assert.equal(comentarioDeExcesso(t), excesso);
assert.equal(lerDiario(t.worldEvents.serializar().flags).filter(e => e.texto.includes('tinha decidido parar')).length, 1);
assert(lerDiario(t.worldEvents.serializar().flags).some(e => e.texto.includes('tinha decidido parar')));
// Dias seguidos: sete dias de bancada rendem uma observacao, e nada alem disso.
const seguidos = novo(0);
for (let dia = 0; dia < 8; dia++) { seguidos.dia = dia; registrarServicoDoDia(seguidos); }
assert.equal(diasSeguidosTrabalhando(seguidos), 8);
const aviso = comentarioDeExcesso(seguidos);
assert(aviso && aviso.includes('dias seguidos'));
// Dia livre: so antes do primeiro serviço, e reversivel.
const folga = novo(9);
assert.equal(ehDiaLivre(folga), false);
assert.equal(declararDiaLivre(folga), true);
assert.equal(ehDiaLivre(folga), true);
assert.equal(declararDiaLivre(folga), false, 'nao declara duas vezes');
assert(textoDoDiaLivre(folga).includes('Dia livre'));
assert(lerDiario(folga.worldEvents.serializar().flags).some(e => e.texto.includes('Fechei a bancada')));
assert.equal(desfazerDiaLivre(folga), true);
assert.equal(ehDiaLivre(folga), false);
registrarServicoDoDia(folga);
assert.equal(declararDiaLivre(folga), false, 'com serviço feito, a folga fica para amanha');
folga.dia = 10;
assert.equal(ehDiaLivre(folga), false, 'a folga vale so para o dia declarado');
assert.equal(declararDiaLivre(folga), true);
// Save: tudo vive nas flags.
const dados = t.worldEvents.serializar();
const salvo = new SistemaWorldEvents();
salvo.restaurar(JSON.parse(JSON.stringify(dados)));
assert.deepEqual(salvo.serializar(), dados);
assert.equal(cargaEscolhida({ dia: t.dia, worldEvents: salvo }), 2);
console.log('Oficina: carga do dia, excesso sem punicao, dias seguidos, dia livre e save passaram.');

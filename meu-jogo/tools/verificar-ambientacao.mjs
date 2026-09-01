import { AVISOS_DA_CIDADE, SEGREDOS, avisosDaSemana } from '../src/game/ambientacao.ts';
import { CATALOGO_MOBILIA, EXPANSOES, requisitosDoMovel } from '../src/game/casa.ts';
import { MATERIAIS } from '../src/game/itens.ts';
import { ITENS } from '../src/game/inventario.ts';
import { buscarLoja, itensDaLoja } from '../src/game/loja.ts';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';

let testes = 0;
function conferir(condicao, mensagem) {
  testes += 1;
  if (!condicao) throw new Error(`FALHOU: ${mensagem}`);
}

conferir(MATERIAIS.length === 3, 'catalogo deve ter Madeira, Pedra e Concreto');
for (const material of MATERIAIS) {
  conferir(ITENS[material.id]?.tipo === 'material', `${material.id} nao entrou como material no inventario`);
  conferir(material.maxPilha === 99, `${material.id} nao empilha ate 99`);
  conferir(Number.isSafeInteger(material.preco) && material.preco > 0, `${material.id} sem preco fixo valido`);
}

const madeireira = buscarLoja('loja_madeireira');
const pedreira = buscarLoja('loja_pedreira');
conferir(Boolean(madeireira && pedreira), 'faltou ponto de venda rural');
// A madeireira passou a vender FERRAMENTA e MUNICAO junto com o material — ela
// tambem e casa agropecuaria. A conferencia continua exigindo os dois materiais
// na frente da lista (a ordem sai das `categorias` do ponto) e agora cobra que a
// pistola e o cartao de acesso NAO estejam a venda: os dois sao da mesma
// categoria `utilidade` e sao achados na usina, nao comprados.
const ofertaMadeireira = itensDaLoja(madeireira).map((i) => i.id);
conferir(ofertaMadeireira.slice(0, 2).join(',') === 'madeira,concreto', 'oferta da madeireira incorreta');
conferir(
  ofertaMadeireira.slice(2).join(',') === 'chave_inglesa,lanterna_manutencao,municao_pistola',
  'a prateleira de utilidade da madeireira mudou',
);
for (const proibido of ['pistola', 'cartao_acesso_usina']) {
  conferir(!ofertaMadeireira.includes(proibido), `${proibido} nao pode estar a venda`);
}
const farmacia = buscarLoja('loja_farmacia');
conferir(Boolean(farmacia), 'faltou o ponto de venda da farmacia');
conferir(
  itensDaLoja(farmacia).map((i) => i.id).join(',')
    === 'kit_primeiros_socorros,analgesico,energetico',
  'oferta da farmacia incorreta',
);
conferir(farmacia.npcDono === 'wendel', 'a farmacia devia dar desconto por relacao com o Wendel');
conferir(itensDaLoja(pedreira).map((i) => i.id).join(',') === 'pedra,concreto', 'oferta da pedreira incorreta');

for (const expansao of EXPANSOES) {
  conferir(expansao.materiais.length > 0, `${expansao.id} nao exige material`);
  conferir(expansao.materiais.every((r) => r.quantidade > 0 && ITENS[r.itemId]?.tipo === 'material'), `${expansao.id} tem requisito invalido`);
}
for (const movel of CATALOGO_MOBILIA) {
  const requisitos = requisitosDoMovel(movel);
  conferir(requisitos.length > 0, `${movel.id} nao exige material`);
  conferir(requisitos.every((r) => r.quantidade > 0 && ITENS[r.itemId]?.tipo === 'material'), `${movel.id} tem requisito invalido`);
}

conferir(AVISOS_DA_CIDADE.length === 15, 'banco do quadro deve ter 15 avisos');
for (let dia = 0; dia < 28; dia += 1) {
  const avisos = avisosDaSemana(dia);
  conferir(avisos.length === 4 && new Set(avisos).size === 4, `avisos repetidos no dia ${dia}`);
  if (dia % 7 !== 0) conferir(avisos.join('|') === avisosDaSemana(dia - 1).join('|'), `quadro mudou dentro da semana no dia ${dia}`);
}

conferir(SEGREDOS.length === 5, 'devem existir cinco segredos');
conferir(SEGREDOS.filter((s) => s.mapa === 'bairro').length === 2, 'Mapa 2 deve ter dois segredos');
conferir(SEGREDOS.filter((s) => s.mapa === 'rural').length === 3, 'Mapa 3 deve ter tres segredos');
conferir(SEGREDOS.filter((s) => s.recompensa).length === 1, 'exatamente um segredo deve dar recompensa');

const memoria = new SistemaWorldEvents();
conferir(memoria.consumirFala('jaqueline') === null, 'fala apareceu antes da flag');
memoria.definir('protagonistaConsertouAlgo', true);
const fala = memoria.consumirFala('alice');
conferir(Boolean(fala?.texto.includes('conserta')), 'Alice nao comentou o primeiro conserto');
conferir(memoria.consumirFala('jaqueline') === null, 'fala global repetiu com Jaqueline');
const salvo = memoria.serializar();
const restaurada = new SistemaWorldEvents();
restaurada.restaurar(salvo);
conferir(restaurada.ativa('protagonistaConsertouAlgo'), 'flag nao sobreviveu ao save');
conferir(restaurada.consumirFala('alice') === null, 'fala vista reapareceu depois do save');

console.log(`[ambientacao] ${testes} conferencias: materiais, quadro, segredos e worldEvents passaram`);

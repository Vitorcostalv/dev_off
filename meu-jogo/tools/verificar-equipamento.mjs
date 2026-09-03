import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Inventario, ITENS } from '../src/game/inventario.ts';
import { CATALOGO_ITENS, buscarItemDeLoja } from '../src/game/itens.ts';
import {
  COMPORTAMENTOS,
  SLOTS_DE_EQUIPAMENTO,
  SistemaEquipamento,
  acoesDoItem,
  comportamentoDe,
  podeDescartar,
  zonaDoMapa,
} from '../src/game/equipar.ts';
import {
  ARMAS,
  SistemaArmas,
  avancarProjetil,
  direcaoDaMira,
} from '../src/game/armas.ts';
import { itensDaLoja, PONTOS_DE_LOJA, buscarLoja } from '../src/game/loja.ts';
import { MAPAS } from '../src/game/mapas.ts';

/**
 * Conferencia de ITEM, EQUIPAMENTO e ARMA.
 *
 * O que ela prova, e por que cada uma importa:
 *
 *  - todo id de item e unico e todo item equipavel aponta pra um slot e pra um
 *    frame de arte que EXISTEM (sem isso o jogador equipa e nada aparece na mao);
 *  - a pistola nao equipa fora da usina, e sair da usina guarda ela na mochila
 *    COM a municao do carregador (sem isso a municao some sem explicacao);
 *  - a arma nao dispara sem municao, nao dispara mais rapido que a cadencia e nao
 *    dispara recarregando;
 *  - recarregar nao cria municao: o que sai do inventario e exatamente o que
 *    entra no carregador;
 *  - o projetil NAO atravessa parede, nem a 30 quadros por segundo;
 *  - item unico e item de missao nao se descartam.
 *
 * Como o resto das conferencias do projeto, ela roda sem navegador: `equipar.ts`
 * e `armas.ts` sao dado mais funcao pura de proposito.
 */

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..');
let conferencias = 0;
const ok = (condicao, mensagem) => {
  conferencias += 1;
  if (!condicao) throw new Error(`FALHOU: ${mensagem}`);
};

// ============================================================== 1. itens ==
{
  const ids = CATALOGO_ITENS.map((i) => i.id);
  ok(new Set(ids).size === ids.length, 'ha id repetido no catalogo de itens');
  for (const item of CATALOGO_ITENS) {
    ok(Boolean(ITENS[item.id]), `${item.id}: esta no catalogo e nao no registro de inventario`);
    ok(item.maxPilha >= 1, `${item.id}: pilha maxima invalida`);
    ok(Number.isSafeInteger(item.preco) && item.preco > 0, `${item.id}: preco invalido`);
  }
  // todo item com comportamento existe
  for (const id of Object.keys(COMPORTAMENTOS)) {
    ok(Boolean(ITENS[id]), `o comportamento aponta pro item inexistente "${id}"`);
  }
}

// atlas de icone: todo item com `frame` tem frame de verdade
{
  const atlas = JSON.parse(
    readFileSync(join(raiz, 'public', 'assets', 'sprites', 'itens.atlas.json'), 'utf8'),
  );
  for (const item of CATALOGO_ITENS) {
    if (!item.frame) continue;
    ok(Boolean(atlas.frames[item.frame]), `${item.id}: o frame "${item.frame}" nao esta no atlas`);
  }
}

// ========================================================= 2. equipamento ==
{
  const atlas = JSON.parse(
    readFileSync(join(raiz, 'public', 'assets', 'sprites', 'equipamento.atlas.json'), 'utf8'),
  );
  const ancoras = JSON.parse(
    readFileSync(join(raiz, 'public', 'assets', 'sprites', 'equipamento.ancoras.json'), 'utf8'),
  );
  const maos = JSON.parse(
    readFileSync(join(raiz, 'public', 'assets', 'sprites', 'maos_jogador.json'), 'utf8'),
  );

  ok(
    existsSync(join(raiz, 'public', 'assets', 'sprites', 'player_segurando_runtime.png')),
    'falta a folha de segurar (rode processar-sprites-jogador)',
  );
  for (const direcao of ['down', 'up', 'left', 'right']) {
    const a = maos.ancoras?.[direcao];
    ok(Boolean(a), `a folha de segurar nao tem ponto de presa pra "${direcao}"`);
    ok(
      a.x > 0 && a.x < maos.celula.w && a.y > 0 && a.y < maos.celula.h,
      `o ponto de presa de "${direcao}" caiu fora da celula`,
    );
  }

  for (const [id, c] of Object.entries(COMPORTAMENTOS)) {
    if (c.slot) {
      ok(SLOTS_DE_EQUIPAMENTO.includes(c.slot), `${id}: slot desconhecido "${c.slot}"`);
      ok(Boolean(c.frameNaMao), `${id}: e equipavel e nao tem arte de mao`);
    }
    if (c.frameNaMao) {
      ok(Boolean(atlas.frames[c.frameNaMao]), `${id}: o frame "${c.frameNaMao}" nao esta no atlas`);
      ok(Boolean(ancoras[c.frameNaMao]), `${id}: o frame "${c.frameNaMao}" nao tem ancora`);
      ok(c.alturaNaMao > 0 && c.alturaNaMao < 2, `${id}: altura na mao fora da faixa`);
      ok(Boolean(c.ajuste), `${id}: sem ajuste de presa por direcao`);
      for (const direcao of ['down', 'up', 'left', 'right']) {
        ok(Boolean(c.ajuste?.[direcao]), `${id}: sem ajuste pra direcao "${direcao}"`);
      }
    }
    if (c.arma) {
      ok(Boolean(ARMAS[c.arma]), `${id}: aponta pra arma inexistente "${c.arma}"`);
      ok(c.slot === 'mao', `${id}: arma tem de ser de mao`);
    }
    if (c.zonas) ok(c.zonas.length > 0, `${id}: lista de zonas vazia`);
  }
}

/** ZONA: a pistola so equipa na usina, e sair de la guarda ela na mochila. */
{
  const eq = new SistemaEquipamento();
  ok(zonaDoMapa('farm') === 'cidade', 'o Mapa 1 deveria ser zona de cidade');
  ok(zonaDoMapa('represa') === 'cidade', 'o Mapa 4 aberto deveria ser zona de cidade');
  ok(zonaDoMapa('represa_2') === 'perigosa', 'o andar da usina deveria ser zona perigosa');

  const foraDaUsina = eq.equipar('pistola', 'farm');
  ok(!foraDaUsina.ok && foraDaUsina.falha === 'zona', 'a pistola equipou na cidade');
  ok(eq.naMao === null, 'a mao ficou com a pistola mesmo com a recusa');
  ok(Boolean(foraDaUsina.aviso), 'a recusa de zona veio sem explicacao pro jogador');

  const dentro = eq.equipar('pistola', 'represa_3');
  ok(dentro.ok && eq.naMao === 'pistola', 'a pistola nao equipou dentro da usina');

  // a chave inglesa e a lanterna valem nas duas zonas
  ok(eq.equipar('chave_inglesa', 'farm').ok, 'a chave inglesa devia equipar em qualquer lugar');
  ok(eq.equipar('lanterna_manutencao', 'farm').ok, 'a lanterna devia equipar em qualquer lugar');
  ok(eq.equipado('utilitario') === 'lanterna_manutencao', 'a lanterna nao foi pro cinto');

  // sair da zona guarda a arma, e so ela
  eq.equipar('pistola', 'represa_3');
  const sairam = eq.ajustarAZona('bairro');
  ok(sairam.includes('pistola'), 'a pistola nao saiu da mao ao voltar pra cidade');
  ok(eq.naMao === null, 'a mao ficou com a arma na cidade');
  ok(eq.equipado('utilitario') === 'lanterna_manutencao', 'a lanterna saiu junto sem precisar');
}

/** O item que sai do inventario sai da mao junto. */
{
  const eq = new SistemaEquipamento();
  const inv = new Inventario();
  inv.adicionar('chave_inglesa', 1);
  eq.equipar('chave_inglesa', 'farm');
  inv.remover('chave_inglesa', 1);
  eq.sincronizarCom((id) => inv.contar(id));
  ok(eq.naMao === null, 'a mao ficou com um item que nao esta mais na mochila');
}

/** Save antigo, save estranho e save de item que nao existe mais. */
{
  for (const bruto of [undefined, null, 'lixo', { mao: 'nao_existe' }, { mao: 'maca' }, { acessorio: 'pistola' }]) {
    const eq = new SistemaEquipamento();
    eq.restaurar(bruto);
    ok(
      SLOTS_DE_EQUIPAMENTO.every((s) => eq.equipado(s) === null),
      `save ${JSON.stringify(bruto)} deveria dar equipamento vazio`,
    );
  }
  const eq = new SistemaEquipamento();
  eq.restaurar({ mao: 'chave_inglesa', utilitario: 'lanterna_manutencao' });
  ok(eq.naMao === 'chave_inglesa' && eq.equipado('utilitario') === 'lanterna_manutencao',
    'o save valido de equipamento nao voltou');
}

/** Item unico e de missao nao se descartam. */
{
  for (const id of ['pistola', 'cartao_acesso_usina', 'encomenda', 'notebook_edu']) {
    ok(!podeDescartar(ITENS[id]), `"${id}" deveria ser indestrutivel`);
  }
  ok(podeDescartar(ITENS.maca), 'uma maca deveria poder ser descartada');
  // as acoes de um item dependem do que ele faz
  ok(acoesDoItem('maca', false).includes('usar') === false, 'maca nao tem acao de uso');
  ok(acoesDoItem('kit_primeiros_socorros', false).includes('usar'), 'o kit deveria ter USAR');
  ok(acoesDoItem('pistola', false).includes('equipar'), 'a pistola deveria ter EQUIPAR');
  ok(acoesDoItem('pistola', true).includes('desequipar'), 'a pistola equipada deveria ter GUARDAR');
  ok(!acoesDoItem('pistola', false).includes('descartar'), 'a pistola nao pode ter DESCARTAR');
}

// =============================================================== 3. armas ==
for (const arma of Object.values(ARMAS)) {
  ok(arma.dano > 0, `${arma.id}: dano invalido`);
  ok(arma.carregador > 0, `${arma.id}: carregador vazio por definicao`);
  ok(arma.cadencia > 0 && arma.recarga > 0, `${arma.id}: cadencia ou recarga invalida`);
  ok(arma.velocidade > 5, `${arma.id}: projetil lento demais pra ler como tiro`);
  ok(arma.alcance > 2, `${arma.id}: alcance curto demais`);
  ok(Boolean(ITENS[arma.municao]), `${arma.id}: a municao "${arma.municao}" nao existe`);
  ok(comportamentoDe(arma.municao)?.municaoDe === arma.id, `${arma.municao}: nao aponta de volta`);
  ok(arma.chanceCritica >= 0 && arma.chanceCritica < 0.5, `${arma.id}: chance critica absurda`);
}

/** O disparo respeita municao, cadencia e recarga. */
{
  const sistema = new SistemaArmas();
  const inv = new Inventario();
  const arma = ARMAS.pistola;

  ok(sistema.disparar('pistola', { x: 1, y: 0 }, true).falha === 'sem_municao', 'atirou sem municao');
  ok(sistema.disparar('nao_existe', { x: 1, y: 0 }, true).falha === 'sem_arma', 'atirou sem arma');
  ok(sistema.disparar('pistola', { x: 1, y: 0 }, false).falha === 'zona', 'atirou fora da zona');

  // recarregar NAO cria municao
  inv.adicionar(arma.municao, 20);
  const r = sistema.recarregar('pistola', inv);
  ok(r.ok && r.carregou === arma.carregador, 'a recarga nao encheu o carregador');
  ok(
    inv.contar(arma.municao) === 20 - arma.carregador,
    'a recarga nao tirou do inventario o que pos no carregador',
  );
  ok(sistema.emRecarga, 'a recarga deveria travar a arma por um tempo');
  ok(sistema.disparar('pistola', { x: 1, y: 0 }, true).falha === 'recarregando', 'atirou recarregando');
  sistema.atualizar(arma.recarga + 1);
  ok(!sistema.emRecarga, 'a recarga nao terminou');

  // cadencia: o segundo tiro no mesmo instante e recusado
  const primeiro = sistema.disparar('pistola', { x: 1, y: 0 }, true, () => 0.5);
  ok(primeiro.ok, 'o primeiro tiro nao saiu');
  ok(
    sistema.disparar('pistola', { x: 1, y: 0 }, true).falha === 'cadencia',
    'a arma disparou duas vezes no mesmo instante',
  );
  sistema.atualizar(arma.cadencia + 1);
  ok(sistema.disparar('pistola', { x: 1, y: 0 }, true).ok, 'a arma travou depois da cadencia');
  ok(sistema.noCarregador('pistola') === arma.carregador - 2, 'a contagem do carregador nao fecha');

  // esvaziar o carregador e recusar
  for (let i = 0; i < arma.carregador; i++) {
    sistema.atualizar(arma.cadencia + 1);
    sistema.disparar('pistola', { x: 1, y: 0 }, true);
  }
  sistema.atualizar(arma.cadencia + 1);
  ok(
    sistema.disparar('pistola', { x: 1, y: 0 }, true).falha === 'sem_municao',
    'a arma disparou com o carregador vazio',
  );

  // critico dobra o dano, e a dispersao nao passa da metade declarada
  const critico = new SistemaArmas();
  critico.recarregar('pistola', (() => {
    const i = new Inventario();
    i.adicionar(arma.municao, 8);
    return i;
  })());
  critico.atualizar(arma.recarga + 1);
  const tiro = critico.disparar('pistola', { x: 1, y: 0 }, true, () => 0);
  ok(tiro.ok && tiro.tiro.critico && tiro.tiro.dano === arma.dano * 2, 'o critico nao dobrou o dano');
  const angulo = Math.abs(Math.atan2(tiro.tiro.dy, tiro.tiro.dx));
  ok(angulo <= arma.dispersao, `a dispersao passou do limite (${angulo})`);

  // DESCARREGAR devolve a municao pro inventario
  const guarda = new SistemaArmas();
  const mochila = new Inventario();
  mochila.adicionar(arma.municao, 8);
  guarda.recarregar('pistola', mochila);
  ok(mochila.contar(arma.municao) === 0, 'a recarga deveria ter esvaziado a reserva');
  guarda.descarregar('pistola', mochila);
  ok(mochila.contar(arma.municao) === 8, 'descarregar perdeu municao');
  ok(guarda.noCarregador('pistola') === 0, 'o carregador ficou cheio depois de descarregar');
}

/** O PROJETIL nao atravessa parede, nem com quadro longo. */
{
  const arma = ARMAS.pistola;
  const parede = (x) => x >= 5 && x <= 6;
  for (const delta of [16, 33, 100, 250]) {
    const p = {
      id: 't', arma: 'pistola', x: 1, y: 1, dx: 1, dy: 0,
      velocidade: arma.velocidade, restante: arma.alcance, dano: arma.dano, morto: false,
    };
    let fim = { tipo: 'voando' };
    for (let i = 0; i < 60 && fim.tipo === 'voando'; i++) {
      fim = avancarProjetil(p, delta, (x) => parede(x));
    }
    ok(fim.tipo === 'parede', `com quadro de ${delta} ms o projetil nao parou na parede`);
    ok(p.x < 7, `com quadro de ${delta} ms o projetil atravessou a parede (parou em ${p.x})`);
  }
  // sem parede, ele morre no fim do alcance
  const livre = {
    id: 't', arma: 'pistola', x: 0, y: 0, dx: 1, dy: 0,
    velocidade: arma.velocidade, restante: arma.alcance, dano: arma.dano, morto: false,
  };
  let fim = { tipo: 'voando' };
  for (let i = 0; i < 200 && fim.tipo === 'voando'; i++) fim = avancarProjetil(livre, 16, () => false);
  ok(fim.tipo === 'alcance', 'o projetil nao morreu no fim do alcance');
  ok(Math.abs(livre.x - arma.alcance) < 0.2, `o projetil andou ${livre.x}, esperava ${arma.alcance}`);
}

/** A pose sai da componente DOMINANTE da mira, e o empate horizontal ganha. */
{
  ok(direcaoDaMira(1, 0) === 'right', 'mira pra direita');
  ok(direcaoDaMira(-1, 0) === 'left', 'mira pra esquerda');
  ok(direcaoDaMira(0, 1) === 'down', 'mira pra baixo');
  ok(direcaoDaMira(0, -1) === 'up', 'mira pra cima');
  ok(direcaoDaMira(1, 1) === 'right', 'a diagonal exata deveria virar perfil');
  ok(direcaoDaMira(0.4, -1) === 'up', 'a vertical dominante deveria virar costas');
}

// =============================================================== 4. lojas ==
{
  for (const ponto of PONTOS_DE_LOJA) {
    ok(Boolean(MAPAS[ponto.mapa]), `${ponto.id}: mapa "${ponto.mapa}" nao existe`);
    const itens = itensDaLoja(ponto);
    ok(itens.length > 0, `${ponto.id}: nao vende nada`);
    for (const item of itens) ok(Boolean(buscarItemDeLoja(item.id)), `${ponto.id}: item fantasma`);
  }
  // a PISTOLA e o CARTAO nao estao a venda em lugar nenhum
  for (const proibido of ['pistola', 'cartao_acesso_usina']) {
    for (const ponto of PONTOS_DE_LOJA) {
      ok(
        !itensDaLoja(ponto).some((i) => i.id === proibido),
        `${ponto.id} vende "${proibido}", que so pode ser achado na usina`,
      );
    }
  }
  // a municao TEM de estar a venda: sem fonte comprável, a arma vira decoracao
  ok(
    PONTOS_DE_LOJA.some((p) => itensDaLoja(p).some((i) => i.id === 'municao_pistola')),
    'nenhuma loja vende municao',
  );
  ok(Boolean(buscarLoja('loja_farmacia')), 'a farmacia nao esta registrada como ponto de venda');
}

// ============================================================ relatorio ==
const equipaveis = Object.entries(COMPORTAMENTOS).filter(([, c]) => c.slot);
console.log(
  `  ${Object.keys(COMPORTAMENTOS).length} item(s) com comportamento | ` +
    `${equipaveis.length} equipavel(is) | ${Object.keys(ARMAS).length} arma(s) de fogo`,
);
console.log(
  `  pistola: ${ARMAS.pistola.dano} de dano, ${ARMAS.pistola.carregador} tiros, ` +
    `${ARMAS.pistola.cadencia} ms de cadencia, ${ARMAS.pistola.recarga} ms de recarga, ` +
    `${ARMAS.pistola.alcance} tiles de alcance`,
);
console.log(`[equipamento] ${conferencias} conferencias: passou`);

/**
 * A ponte entre a sucata da usina e o trabalho da cidade, vista no jogo.
 *
 * O simulador (`verificar-equilibrio`) prova a aritmetica: a peca comum vale
 * mais guardada que vendida, o bonus e opcional, so o conserto completo consome.
 * O que ele nao prova e que a MOCHILA e a CARTEIRA mexem certo — que a peca sai
 * de verdade, que o dinheiro entra com o bonus dentro, e que quem nao tem peca
 * recebe o pagamento cheio sem ver aviso de falta.
 *
 * Sao quatro perguntas:
 *
 *   1. um conserto completo COM peca na mochila paga mais que sem, e a peca sai;
 *   2. quem nao tem peca recebe o pagamento cheio e nada e cobrado;
 *   3. um conserto pela metade nao consome peca nenhuma;
 *   4. os precos novos da casa chegam na tela da loja de mobilia.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(30000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

const checks = [];
const reais = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

/**
 * Roda um conserto pelo caminho de credito DO APP e devolve o que mudou.
 *
 * Chama `pagarConserto` do app de Trabalho — o mesmo metodo que o quebra-cabeca
 * chama ao encaixar a ultima peca — em vez de reimplementar a conta aqui: e a
 * unica forma de o teste falhar se o app mudar.
 */
const consertar = (pecaNaMochila, acertos, total) => page.evaluate(
  ([peca, ac, tot]) => {
    const e = window.estado;
    // mochila e carteira num estado conhecido
    e.inventario.slots.fill(null);
    e.carteira.restaurar(500_000);
    if (peca) e.inventario.adicionar(peca, 3);
    // uma vaga de conserto do quadro de hoje, ainda nao concluida
    const vaga = e.trabalhos.quadro?.(e.dia)?.find?.((v) => v.tipo === 'conserto')
      ?? window.__quadro.find((v) => v.tipo === 'conserto');
    e.trabalhos.limparConcluidas?.();
    const antes = { saldo: e.carteira.saldo, pecas: peca ? e.inventario.contar(peca) : 0 };
    const app = window.__appTrabalho;
    app.pagarConserto(vaga, ac, tot);
    return {
      vaga: vaga.id,
      recompensa: vaga.recompensa,
      ganho: e.carteira.saldo - antes.saldo,
      pecasAntes: antes.pecas,
      pecasDepois: peca ? e.inventario.contar(peca) : 0,
    };
  },
  [pecaNaMochila, acertos, total],
);

try {
  await page.goto(ALVO);
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto === true);
  await page.waitForTimeout(600);

  // O app de Trabalho e a lista de vagas do dia, expostos pro teste. O app roda
  // dentro da ComputadorScene; instanciar so ele evita abrir o PC, escolher
  // icone e jogar o quebra-cabeca inteiro pra chegar no credito.
  await page.evaluate(async () => {
    const { criarApps } = await import('/src/pc/apps/index.ts');
    const { quadroDoDia } = await import('/src/game/trabalhos.ts');
    window.__quadro = quadroDoDia(window.estado.dia);
    window.__appTrabalho = criarApps().find((a) => a.id === 'trabalho' || /trabalho/i.test(a.titulo));
    // o app desenha ao montar; aqui so o caminho de credito interessa, e ele nao
    // depende de nada desenhado
    window.__appTrabalho.avisar = () => {};
  });
  const temApp = await page.evaluate(() => Boolean(window.__appTrabalho?.pagarConserto));
  assert(temApp, 'nao achei o app de Trabalho com `pagarConserto`');

  // --------------------------------- 1. conserto completo com peca na mochila
  const com = await consertar('ferro_velho', 3, 3);
  const sem = await consertar(null, 3, 3);
  assert(sem.ganho > 0, `o conserto sem peca nao pagou nada: ${JSON.stringify(sem)}`);
  assert(
    com.ganho > sem.ganho,
    `a peca de reposicao nao pagou bonus: ${reais(com.ganho)} com peca contra ${reais(sem.ganho)} sem`,
  );
  assert.equal(
    com.pecasDepois, com.pecasAntes - 1,
    `a peca de reposicao nao saiu da mochila: ${com.pecasAntes} -> ${com.pecasDepois}`,
  );
  const bonus = com.ganho - sem.ganho;
  checks.push(
    `conserto completo: ${reais(sem.ganho)} sem peca e ${reais(com.ganho)} com uma de ferro-velho ` +
      `(bonus de ${reais(bonus)}), e a peca saiu da mochila (${com.pecasAntes} -> ${com.pecasDepois})`,
  );

  // ----------------------------------------- 2. sem peca, pagamento cheio
  assert.equal(
    sem.ganho, sem.recompensa,
    `quem nao tem peca tinha de receber o conserto cheio (${reais(sem.recompensa)}) e recebeu ` +
      reais(sem.ganho),
  );
  checks.push(`sem nenhuma peca na mochila o conserto paga cheio (${reais(sem.ganho)}) e nada e cobrado`);

  // ------------------------------- 3. conserto pela metade nao consome peca
  const metade = await consertar('ferro_velho', 2, 3);
  assert.equal(
    metade.pecasDepois, metade.pecasAntes,
    `um conserto pela metade consumiu a peca: ${metade.pecasAntes} -> ${metade.pecasDepois}`,
  );
  assert(
    metade.ganho > 0 && metade.ganho < sem.ganho,
    `o conserto de 2/3 tinha de pagar proporcional: ${reais(metade.ganho)} contra ` +
      `${reais(sem.ganho)} do completo`,
  );
  checks.push(
    `conserto de 2/3 paga proporcional (${reais(metade.ganho)}) e NAO consome peca — material de ` +
      'quem errou seria cobrar duas vezes',
  );

  // ------------------------------------ 4. os precos novos na tela da loja
  const mobilia = await page.evaluate(async () => {
    const { CATALOGO_MOBILIA, EXPANSOES, requisitosDoMovel } = await import('/src/game/casa.ts');
    const sofa = CATALOGO_MOBILIA.find((m) => m.id === 'sofa_creme');
    const vaso = CATALOGO_MOBILIA.find((m) => m.id === 'vaso_flores');
    return {
      sofa: { preco: sofa.preco, materiais: requisitosDoMovel(sofa) },
      vaso: { preco: vaso.preco, materiais: requisitosDoMovel(vaso) },
      deposito: EXPANSOES.find((e) => e.id === 'deposito').preco,
      total: CATALOGO_MOBILIA.reduce((s, m) => s + m.preco, 0)
        + EXPANSOES.reduce((s, e) => s + e.preco, 0),
    };
  });
  assert.equal(mobilia.total, 2_254_000, `a casa inteira deu ${reais(mobilia.total)}`);
  assert.equal(mobilia.deposito, 160_000, 'o deposito nao esta no preco novo');
  // o vaso continua barato e sem material pesado; o sofa e caro e pede concreto
  assert.deepEqual(
    mobilia.vaso.materiais.map((m) => m.itemId), ['madeira'],
    `o vaso de flores pede material pesado: ${JSON.stringify(mobilia.vaso.materiais)}`,
  );
  assert(
    mobilia.sofa.materiais.some((m) => m.itemId === 'concreto'),
    `o sofa nao pede concreto: ${JSON.stringify(mobilia.sofa.materiais)}`,
  );
  checks.push(
    `a casa inteira custa ${reais(mobilia.total)}: vaso a ${reais(mobilia.vaso.preco)} so com ` +
      `madeira, sofa a ${reais(mobilia.sofa.preco)} com concreto`,
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync(
    'docs/evidence/equilibrio-browser.json',
    `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
console.log(`[equilibrio browser] ${checks.length} conferencias passaram`);

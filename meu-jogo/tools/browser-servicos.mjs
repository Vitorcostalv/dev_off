import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** O servidor de desenvolvimento. `GAME_URL` deixa rodar contra um limpo. */
const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(ALVO); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.evaluate(async () => {
    const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts'); const e = window.estado;
    e.cidade.restaurar({ construidos: ['hospital', 'padaria', 'ponto_onibus'], funcionarios: [['hospital', 'rafael'], ['padaria', 'joao'], ['ponto_onibus', 'julia']] });
    e.dia = 0; e.relogio.definir(600); e.vida.receberDano(5); e.carteira.restaurar(10000);
    window.game.scene.getScene('FarmScene').usarServicoCidade(PROJETOS_CIDADE.hospital);
  });
  // Confirm the actual UI transaction.
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.estado.vida.cheio), true);
  assert.equal(await page.evaluate(() => window.estado.carteira.saldo), 8500);
  await page.evaluate(async () => { const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts'); window.game.scene.getScene('FarmScene').usarServicoCidade(PROJETOS_CIDADE.padaria); });
  assert(await page.evaluate(() => window.game.scene.getScene('UIScene').lojaItens.length > 0));
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.evaluate(async () => { const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts'); window.game.scene.getScene('FarmScene').usarServicoCidade(PROJETOS_CIDADE.ponto_onibus); });
  await page.keyboard.press('s'); await page.waitForTimeout(100); await page.keyboard.press('e');
  await page.waitForFunction(() => window.estado.mapa === 'rural' && window.game.scene.getScene('FarmScene').pronto);
  assert.equal(await page.evaluate(() => window.estado.carteira.saldo), 8000);

  // ---------------------------------------- construir uma obra custa MATERIAL
  //
  // A cafeteria pede madeira x24 e pedra x10 alem do saldo. O que se prova aqui
  // sao as duas metades da transacao: sem material nada acontece (nem o dinheiro
  // sai), e com material as duas coisas saem juntas.
  const contarNaMochila = () => page.evaluate(() => ({
    madeira: window.estado.inventario.contar('madeira'),
    pedra: window.estado.inventario.contar('pedra'),
    saldo: window.estado.carteira.saldo,
    construida: window.estado.cidade.construido('cafeteria'),
  }));
  const construirCafeteria = () => page.evaluate(async () => {
    const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts');
    window.game.scene.getScene('FarmScene').construirProjetoCidade(PROJETOS_CIDADE.cafeteria);
  });

  await page.evaluate(() => {
    const e = window.estado;
    e.cidade.restaurar({ construidos: [], funcionarios: [] });
    e.carteira.restaurar(50000);
    e.inventario.remover('madeira', 99);
    e.inventario.remover('pedra', 99);
    e.inventario.adicionar('madeira', 24);   // madeira sim, pedra nao
  });
  const semPedra = await contarNaMochila();
  await construirCafeteria();
  await page.waitForTimeout(200);
  const depoisDeFalhar = await contarNaMochila();
  assert.equal(depoisDeFalhar.construida, false, 'a cafeteria subiu sem a pedra');
  assert.deepEqual(
    [depoisDeFalhar.madeira, depoisDeFalhar.saldo],
    [semPedra.madeira, semPedra.saldo],
    'a obra recusada consumiu alguma coisa: recusa tem de nao deixar rastro',
  );
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);

  await page.evaluate(() => window.estado.inventario.adicionar('pedra', 10));
  const antesDeConstruir = await contarNaMochila();
  await construirCafeteria();
  await page.waitForTimeout(300);
  const depois = await contarNaMochila();
  assert.equal(depois.construida, true, 'a cafeteria nao subiu com dinheiro e material na mao');
  assert.equal(depois.madeira, antesDeConstruir.madeira - 24, 'a madeira nao saiu da mochila');
  assert.equal(depois.pedra, antesDeConstruir.pedra - 10, 'a pedra nao saiu da mochila');
  assert.equal(depois.saldo, antesDeConstruir.saldo - 8000, 'o saldo nao pagou os R$ 80,00');
  const lazy = await page.evaluate(async () => { const { MAPAS } = await import('/src/game/mapas.ts'); return Object.values(MAPAS).find(m => m.sobDemanda); });
  await page.route(`**/${lazy.arquivo.replace(/^\//, '')}`, route => route.abort());
  await page.evaluate(mapa => { window.game.scene.getScene('FarmScene').scene.restart({ mapa }); }, lazy.chave);
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene').avisoDeCarga?.text.includes('Nao foi possivel'));
  await page.waitForTimeout(300); assert.equal(await page.evaluate(() => window.game.scene.getScene('FarmScene').pronto), false);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => window.game.scene.getScene('FarmScene').pronto);
  assert.deepEqual(errors, []);
  fs.writeFileSync('docs/evidence/servicos-browser.json', JSON.stringify({ errors, checks: ['paid health recovery', 'bakery catalogue', 'bus purchase and travel', 'city work refuses without materials and consumes them with', 'failed map recovery to home'] }, null, 2));
} finally { await browser.close(); }
console.log('[servicos browser] passou');

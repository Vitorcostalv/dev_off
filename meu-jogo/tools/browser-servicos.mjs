import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5186'); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
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
  const lazy = await page.evaluate(async () => { const { MAPAS } = await import('/src/game/mapas.ts'); return Object.values(MAPAS).find(m => m.sobDemanda); });
  await page.route(`**/${lazy.arquivo.replace(/^\//, '')}`, route => route.abort());
  await page.evaluate(mapa => { window.game.scene.getScene('FarmScene').scene.restart({ mapa }); }, lazy.chave);
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene').avisoDeCarga?.text.includes('Nao foi possivel'));
  await page.waitForTimeout(300); assert.equal(await page.evaluate(() => window.game.scene.getScene('FarmScene').pronto), false);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => window.game.scene.getScene('FarmScene').pronto);
  assert.deepEqual(errors, []);
  fs.writeFileSync('docs/evidence/servicos-browser.json', JSON.stringify({ errors, checks: ['paid health recovery', 'bakery catalogue', 'bus purchase and travel', 'failed map recovery to home'] }, null, 2));
} finally { await browser.close(); }
console.log('[servicos browser] passou');

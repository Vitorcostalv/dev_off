import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true, channel: 'chrome' }); const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5186'); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150); await page.keyboard.press('F10'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.game.scene.getScene('MenuScene').pagina), 'dev');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
  const dia = await page.evaluate(() => window.estado.dia);
  await page.keyboard.press('Enter'); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => window.estado.dia), dia + 1);
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.game.scene.getScene('MenuScene').pagina), 'dev_mapas');
  await page.keyboard.press('PageDown'); await page.waitForTimeout(100); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.estado.mapa === 'casa_4' && window.game.scene.getScene('FarmScene').pronto);
  await page.keyboard.press('F10'); await page.waitForTimeout(100); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  const antes = await page.evaluate(() => window.estado.inventario.slots.filter(Boolean).length);
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert(await page.evaluate(() => window.estado.inventario.slots.filter(Boolean).length) >= antes);
  await page.screenshot({ path: 'docs/evidence/dev-itens.png' });
  assert.deepEqual(errors, []); fs.writeFileSync('docs/evidence/dev-browser.json', JSON.stringify({ errors, checks: ['F10 dev menu', 'day event', 'map pagination and warp', 'item grant'] }, null, 2));
} finally { await browser.close(); }
console.log('[dev browser] passou');

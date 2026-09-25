import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** O servidor de desenvolvimento. `GAME_URL` deixa rodar contra um limpo. */
const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' }); const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(ALVO); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.evaluate(() => { window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'rural', x: 1296, y: 2096 }); });
  await page.waitForFunction(() => window.estado.mapa === 'rural' && window.game.scene.getScene('FarmScene').pronto);
  await page.evaluate(() => { window.game.scene.getScene('FarmScene').scene.launch('MenuScene', { pagina: 'controles' }); });
  await page.waitForFunction(() => window.game.scene.isActive('MenuScene'));
  for (let n = 0; n < 3; n++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
  await page.keyboard.press('Enter'); await page.waitForTimeout(100); await page.keyboard.press('l'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:controls')).direita), 'KeyL');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const x = () => page.evaluate(() => window.game.scene.getScene('FarmScene').player.x);
  const antes = await x(); await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d'); assert(Math.abs(await x() - antes) < 2);
  await page.keyboard.down('l'); await page.waitForTimeout(250); await page.keyboard.up('l'); assert(await x() > antes + 5);
  const parado = await x(); await page.waitForTimeout(150); assert(Math.abs(await x() - parado) < 2);
  await page.evaluate(() => {
    window.padTeste = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [null, window.padTeste], configurable: true });
  });
  const pad = async b => { await page.evaluate(b => { window.padTeste.buttons[b].pressed = true; }, b); await page.waitForTimeout(120); await page.evaluate(b => { window.padTeste.buttons[b].pressed = false; }, b); await page.waitForTimeout(200); };
  await pad(9); assert(await page.evaluate(() => window.game.scene.isActive('MenuScene')));
  await pad(1); assert.equal(await page.evaluate(() => window.game.scene.isActive('MenuScene')), false);
  await pad(3); assert(await page.evaluate(() => window.game.scene.getScene('UIScene').inventarioAberto));
  await pad(1);
  assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').inventarioAberto), false);
  await page.evaluate(() => { window.game.scene.getScene('UIScene').abrirComputador(); }); await page.waitForTimeout(200);
  await pad(0); assert(await page.evaluate(() => window.game.scene.getScene('ComputadorScene').janela.aberta));
  await pad(1); await pad(1);
  await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  assert.equal(await page.evaluate(async () => (await import('/src/game/InputRouter.ts')).controles.rotulo('direita')), 'L');
  assert.deepEqual(errors, []); fs.writeFileSync('docs/evidence/controles-browser.json', JSON.stringify({ errors, checks: ['remap UI persistence', 'old binding inactive', 'new binding movement', 'keyup stops motion', 'pad at index one', 'pad pause and inventory', 'DevOS open and close with pad'] }, null, 2));
} finally { await browser.close(); }
console.log('[controles browser] passou');

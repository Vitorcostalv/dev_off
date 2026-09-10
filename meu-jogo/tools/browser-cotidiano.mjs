import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

/** O servidor de desenvolvimento. `GAME_URL` deixa rodar contra um limpo. */
const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } }); page.setDefaultTimeout(30000);
const errors = [], warnings = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
const shot = n => page.screenshot({ path: `docs/evidence/cotidiano-${n}.png` });
try {
  await page.goto(ALVO); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await shot('titulo'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  assert(await page.evaluate(() => window.game.scene.isActive('FarmScene')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100); await shot('pausa');
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); await page.keyboard.press('Enter'); await page.waitForTimeout(100); await shot('calendario');
  assert.equal(await page.evaluate(() => window.game.scene.getScene('MenuScene').pagina), 'calendario');
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  for (let n = 0; n < 4; n++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
  await page.keyboard.press('Enter'); await page.waitForTimeout(100); await shot('opcoes');
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:settings')).tempo), 2);
  await page.evaluate(() => window.game.scene.getScene('MenuScene').fechar());
  await page.evaluate(() => {
    window.estado.dia = 57; window.estado.clima.definir(57, 'Chuva');
    window.game.scene.getScene('FarmScene').salvarJogo();
  }); await page.waitForTimeout(300); await shot('outono-chuva');
  await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene')); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.estado.dia), 57); assert.equal(await page.evaluate(() => window.estado.clima.paraDia(57)), 'Chuva');
  await page.evaluate(async () => {
    const { comprar, PONTOS_DE_LOJA, reiniciarTravaDeCompra } = await import('/src/game/loja.ts');
    const { CATALOGO_ITENS } = await import('/src/game/itens.ts');
    const item = CATALOGO_ITENS.find(i => i.categoria === 'normal');
    window.estado.carteira.restaurar(100000); comprar(item.id, 1, PONTOS_DE_LOJA[0]);
    window.game.scene.getScene('UIScene').abrirComputador();
  }); await page.waitForFunction(() => window.game.scene.isActive('ComputadorScene'));
  assert(await page.evaluate(() => window.estado.progressao.desbloqueada('compra')));
  await page.evaluate(() => window.game.scene.getScene('ComputadorScene').abrirApp(6)); await page.waitForTimeout(100); await shot('conquistas');
  assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  fs.writeFileSync('docs/evidence/cotidiano-browser.json', JSON.stringify({ errors, warnings, checks: ['title/pause/calendar/settings keyboard', 'preferences persisted', 'autumn/rain save/reload', 'real shop purchase unlocks achievement'] }, null, 2));
} finally { await browser.close(); }
console.log('[cotidiano] browser passou');

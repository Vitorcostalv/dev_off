import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDefaultSave } from '../src/game/SaveMigration.ts';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage(); page.setDefaultTimeout(30000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
const ready = async () => {
  await page.waitForFunction(() => window.game?.scene.getScene('FarmScene')?.pronto);
  await page.waitForTimeout(100);
  if (await page.evaluate(() => window.game.scene.isActive('MenuScene') && window.game.scene.getScene('MenuScene').pagina === 'titulo')) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  }
};
const legacy = { ...createDefaultSave(), versao: 6, dinheiro: 65432, arquivo: [1, 25, 50], cidade: { construidos: 42, funcionarios: 42 } };
try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5186'); await ready();
  await page.evaluate(s => localStorage.setItem('meu-jogo:save', JSON.stringify(s)), legacy);
  await page.reload(); await ready();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:save')));
  assert.equal(saved.versao, 7); assert.equal(saved.dinheiro, 65432); assert.deepEqual(saved.arquivo, [1, 25, 50]);
  assert.deepEqual(saved.cidade, { construidos: [], funcionarios: [] });
  await page.keyboard.press('m'); await page.waitForTimeout(80);
  const paused = await page.evaluate(() => {
    const e = window.estado, f = window.game.scene.getScene('FarmScene');
    const before = e.relogio.minutos; f.update(0, 15000);
    return { open: f.mapaAberto, before, after: e.relogio.minutos };
  }); assert(paused.open); assert.equal(paused.after, paused.before);
  await page.keyboard.press('m'); await page.waitForTimeout(80);
  await page.keyboard.press('F4'); await page.waitForTimeout(80);
  assert(await page.evaluate(() => window.game.scene.getScene('UIScene').confirmacaoAberta));
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:save')).dinheiro), 65432);
  await page.keyboard.press('F8'); await page.waitForTimeout(80);
  assert(await page.evaluate(() => window.game.scene.getScene('UIScene').menuAberto));
  await page.keyboard.press('e'); await page.waitForTimeout(80);
  assert(await page.evaluate(() => window.game.scene.getScene('UIScene').confirmacaoAberta));
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);

  const prod = await browser.newPage();
  await prod.goto(process.env.PRODUCTION_URL ?? 'http://127.0.0.1:5187');
  await prod.waitForSelector('canvas'); await prod.waitForTimeout(2000);
  await prod.evaluate(() => localStorage.setItem('meu-jogo:save', JSON.stringify({ marcador: 'nao-apagar' })));
  for (const key of ['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9']) await prod.keyboard.press(key);
  assert.equal(await prod.evaluate(() => window.game), undefined);
  assert.equal(await prod.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:save')).marcador), 'nao-apagar');
  fs.writeFileSync(new URL('../docs/evidence/phase2-browser.json', import.meta.url), JSON.stringify({ errors, checks: ['v6 migration in browser', 'archive/money preservation', 'map pauses clock', 'F4/F8 confirmation and cancellation', 'production F keys preserve storage; debug globals absent'] }, null, 2));
} finally { await browser.close(); }
console.log('[browser-save] migracao, pausa, confirmacoes e protecao de producao passaram');

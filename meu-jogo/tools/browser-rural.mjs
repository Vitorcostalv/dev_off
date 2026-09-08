import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.evaluate(() => { window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'rural', x: 1296, y: 2096 }); });
  await page.waitForFunction(() => window.estado.mapa === 'rural' && window.game.scene.getScene('FarmScene').pronto);
  await page.waitForTimeout(300);
  const nodes = await page.evaluate(() => {
    const s = window.game.scene.getScene('FarmScene');
    return s.interagiveis.filter(n => n.tipo === 'atividade_rural').map(n => ({ id: n.id, x: n.x, y: n.y, blocked: s.camadaObjetos.getTileAtWorldXY(n.x, n.y)?.collides ?? false }));
  });
  assert.equal(nodes.length, 7); assert(nodes.every(n => !n.blocked), JSON.stringify(nodes));
  await page.keyboard.press('e'); await page.waitForTimeout(100);
  await page.screenshot({ path: 'docs/evidence/rural-canteiro.png' });
  await page.evaluate(() => {
    const e = window.estado; e.rural.plantar('canteiro_1', 'cenoura', e.dia, e.carteira);
    for (let d = 0; d < 3; d++) { e.rural.regar('canteiro_1', e.dia); e.dia++; e.eventos.emit('DAY_STARTED', { dia: e.dia }); }
    window.game.scene.getScene('FarmScene').salvarJogo();
  });
  await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  assert.equal(await page.evaluate(() => window.estado.rural.plantio('canteiro_1').crescido), 3);
  await page.evaluate(() => { window.estado.rural.colher('canteiro_1', window.estado.inventario); });
  assert.equal(await page.evaluate(() => window.estado.inventario.contar('cenoura')), 3);
  assert.deepEqual(errors, []);
  fs.writeFileSync('docs/evidence/rural-browser.json', JSON.stringify({ nodes, errors, checks: ['seven rural nodes', 'tile collision clear', 'growth through day events', 'save reload harvest'] }, null, 2));
} finally { await browser.close(); }
console.log('[rural browser] passou');

import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** O servidor de desenvolvimento. `GAME_URL` deixa rodar contra um limpo. */
const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(ALVO);
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
  // ------------------------------------------------ o remap da zona rural
  //
  // O validador offline le o tilemap; aqui se mede o que so o navegador
  // responde: que o mobiliario de roca aparece (o mapa passou a ter camada
  // `moveis`, e com ela a carga sob demanda de `moveis_parque`) e que as duas
  // unicas luzes do mapa acendem — uma no terreiro de cada moradia, que e o que
  // marca que ali mora gente.
  // a suite recarregou a pagina acima e o jogo voltou pro menu: entrar de novo
  // antes de medir, senao a captura sai do menu e nao do lugar
  if (await page.evaluate(() => window.game.scene.isActive('MenuScene'))) {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !window.game.scene.isActive('MenuScene'));
  }
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.pronto = false;
    window.estado.mapa = 'rural';
    f.scene.restart({ mapa: 'rural', x: 57.5 * 32, y: 71.5 * 32 });
  });
  await page.waitForFunction(() => {
    const f = window.game.scene.getScene('FarmScene');
    return window.estado.mapa === 'rural' && f?.pronto === true && f.load.isLoading() === false;
  });
  await page.waitForTimeout(300);
  const remap = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    return {
      moveis: f.pegadasDeMovel?.length ?? -1,
      atlas: f.textures.getTextureKeys().filter((k) => k.startsWith('moveis_')).sort(),
    };
  });
  assert(
    remap.moveis >= 18,
    `a zona rural desenhou ${remap.moveis} moveis; o remap poe 22. Carga sob demanda que nao ` +
      'carrega e terreiro vazio em silencio',
  );
  assert(remap.atlas.includes('moveis_parque'), `sem "moveis_parque": ${JSON.stringify(remap.atlas)}`);
  const acesos = async (minutos) => {
    await page.evaluate((m) => {
      window.estado.relogio.definir(m);
      window.game.scene.getScene('FarmScene').atualizarLuzesNoturnas();
    }, minutos);
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const f = window.game.scene.getScene('FarmScene');
      return (f.luzesNoturnas ?? []).filter((g) => g.visible && g.alpha > 0.05).length;
    });
  };
  const dia = await acesos(12 * 60);
  const noite = await acesos(23 * 60);
  assert.equal(dia, 0, `${dia} luz(es) acesa(s) ao meio-dia na roca`);
  assert.equal(
    noite, 2,
    `${noite} luz(es) acesa(s) as 23h; sao duas, uma por moradia — a roca nao tem iluminacao publica`,
  );
  await page.screenshot({ path: 'docs/evidence/rural-terreiro.png' });

  assert.deepEqual(errors, []);
  fs.writeFileSync('docs/evidence/rural-browser.json', JSON.stringify({ nodes, errors, checks: ['seven rural nodes', 'tile collision clear', 'growth through day events', 'save reload harvest', `remap: ${remap.moveis} pecas de mobiliario, ${noite} luzes a noite e ${dia} de dia`] }, null, 2));
} finally { await browser.close(); }
console.log('[rural browser] passou');

/**
 * A distorcao da represa vista no jogo: um andar de cada capitulo, aberto de
 * verdade, com a contagem do que aparece na cena e a captura de evidencia.
 *
 * O validador de no confere o tilemap; este confere o que o jogador ve — que a
 * peca intrusa entra na cena (e nao so no arquivo), que ela nao aparece nos
 * capitulos limpos e que o andar carrega sob demanda sem erro de console.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(60000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

/** Frames das pecas intrusas, por familia (os mesmos de verificar-distorcao). */
const ESCRITORIO = ['movel_1_7', 'movel_1_8', 'movel_4_7', 'movel_4_12'];
const CASA = ['movel_0_0', 'movel_2_2', 'movel_4_3', 'movel_4_8', 'movel_3_5', 'movel_6_15'];

const ANDARES = [
  { andar: 8, capitulo: 1, escritorio: 0, casa: 0 },
  { andar: 25, capitulo: 3, escritorio: 0, casa: 0 },
  { andar: 36, capitulo: 4, escritorio: 'algum', casa: 0 },
  { andar: 47, capitulo: 5, escritorio: 'qualquer', casa: 'algum' },
];

const checks = [];
try {
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  for (const alvo of ANDARES) {
    const chave = `represa_f${String(alvo.andar).padStart(2, '0')}`;
    await page.evaluate((m) => { window.game.scene.getScene('FarmScene').scene.restart({ mapa: m }); }, chave);
    await page.waitForFunction((m) => window.estado.mapa === m && window.game.scene.getScene('FarmScene').pronto, chave);
    await page.waitForTimeout(700);

    const naCena = await page.evaluate(([escritorio, casa]) => {
      const f = window.game.scene.getScene('FarmScene');
      const sprites = f.children.list.filter((o) => o.texture?.key === 'moveis_mobilia_v2');
      const conta = (lista) => sprites.filter((o) => lista.includes(o.frame?.name)).length;
      return { total: sprites.length, escritorio: conta(escritorio), casa: conta(casa) };
    }, [ESCRITORIO, CASA]);

    if (alvo.escritorio === 0) {
      assert.equal(naCena.escritorio, 0, `andar ${alvo.andar} (cap ${alvo.capitulo}): apareceu escritorio intruso`);
    } else {
      assert(naCena.escritorio + naCena.casa > 0, `andar ${alvo.andar} (cap ${alvo.capitulo}): nenhuma intrusa na cena`);
    }
    if (alvo.casa === 0) {
      assert.equal(naCena.casa, 0, `andar ${alvo.andar} (cap ${alvo.capitulo}): apareceu mobilia de casa`);
    } else {
      assert(naCena.casa > 0, `andar ${alvo.andar} (cap ${alvo.capitulo}): nenhuma peca de casa na cena`);
    }

    await page.locator('canvas').screenshot({ path: `docs/evidence/represa-cap${alvo.capitulo}-a${alvo.andar}.png` });
    checks.push(`andar ${alvo.andar} (cap ${alvo.capitulo}): ${naCena.escritorio} de escritorio, ${naCena.casa} de casa`);
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync('docs/evidence/represa-distorcao-browser.json', `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(`[represa distorcao] ${checks.length} andares conferidos no navegador`);

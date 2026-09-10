/**
 * Os interiores publicos no navegador: abrem sem erro, a mobilia nova aparece
 * na cena e o jogador circula por dentro deles.
 *
 * A conferencia de circulacao existe porque densidade e alcance brigam: cada
 * peca a mais e um tile a menos pra andar, e o flood-fill do gerador aprova
 * layout que na pratica deixa o jogador raspando na parede. Aqui ele anda de
 * verdade, com colisao, de ponta a ponta de cada salao.
 *
 * Guarda as capturas em docs/evidence/interior-*.png.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(30000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

/**
 * Cada interior com: onde por o jogador, quantas pecas a cena tem de mostrar e
 * um trajeto pra ele percorrer (tecla, milissegundos, tiles minimos).
 */
const INTERIORES = [
  { mapa: 'biblioteca', em: [16, 8], pecas: 23, andar: { tecla: 'a', ms: 2600, minimo: 4, eixo: 'x' } },
  { mapa: 'escola', em: [12, 13], pecas: 26, andar: { tecla: 'd', ms: 2200, minimo: 4, eixo: 'x' } },
    // O mercado anda no CORREDOR entre as duas gondolas (linha 8), nao pra cima:
  // subir da frente de caixa bate na gondola de baixo, que e o desenho certo.
  { mapa: 'mercado', em: [8, 8], pecas: 32, andar: { tecla: 'd', ms: 2600, minimo: 4, eixo: 'x' } },
  { mapa: 'academia', em: [9, 8], pecas: 22, andar: { tecla: 'a', ms: 2000, minimo: 3, eixo: 'x' } },
    // A oficina anda o CORREDOR central de cima a baixo: sao 19 tiles de espinha,
  // e e o trajeto que o jogador faz todo dia entre quarto, cozinha e bancada.
  { mapa: 'oficina', em: [12, 19], pecas: 43, andar: { tecla: 'w', ms: 4000, minimo: 8, eixo: 'y' } },
];

const checks = [];
const posicao = () => page.evaluate(() => {
  const p = window.game.scene.getScene('FarmScene').player;
  return { x: p.x / 32, y: p.y / 32 };
});

try {
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  for (const alvo of INTERIORES) {
    // CENTRO do tile, nao o canto: em x = 12 * 32 o corpo do jogador fica metade
    // dentro da parede vizinha e ele nao sai do lugar.
    await page.evaluate(([m, x, y]) => {
      window.game.scene.getScene('FarmScene').scene.restart({ mapa: m, x: (x + 0.5) * 32, y: (y + 0.5) * 32 });
    }, [alvo.mapa, alvo.em[0], alvo.em[1]]);
    await page.waitForFunction((m) => window.estado.mapa === m && window.game.scene.getScene('FarmScene').pronto, alvo.mapa);
    await page.waitForTimeout(600);

    const naCena = await page.evaluate(() => {
      const f = window.game.scene.getScene('FarmScene');
      const atlas = new Set(['moveis_mobilia_v1', 'moveis_mobilia_v2', 'moveis_quarto', 'moveis_cozinha', 'moveis_banheiro', 'moveis_eletronicos', 'moveis_mercado', 'moveis_academia', 'moveis_farmacia_bar']);
      return f.children.list.filter((o) => atlas.has(o.texture?.key) && o.visible).length;
    });
    assert.equal(naCena, alvo.pecas, `${alvo.mapa}: esperava ${alvo.pecas} pecas na cena, achei ${naCena}`);

    const antes = await posicao();
    await page.keyboard.down(alvo.andar.tecla);
    await page.waitForTimeout(alvo.andar.ms);
    await page.keyboard.up(alvo.andar.tecla);
    await page.waitForTimeout(150);
    const depois = await posicao();
    const andou = Math.abs(depois[alvo.andar.eixo] - antes[alvo.andar.eixo]);
    assert(andou >= alvo.andar.minimo, `${alvo.mapa}: andou ${andou.toFixed(1)} tiles, esperava ${alvo.andar.minimo}`);

    await page.locator('canvas').screenshot({ path: `docs/evidence/interior-${alvo.mapa}.png` });
    checks.push(`${alvo.mapa}: ${naCena} pecas na cena, ${andou.toFixed(1)} tiles de circulacao`);
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync('docs/evidence/interiores-browser.json', `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(`[interiores browser] ${checks.length} interiores conferidos`);

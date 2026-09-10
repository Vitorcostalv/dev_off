/**
 * O centro remapeado no navegador: mobiliario desenhado, placas de rua com
 * texto, quadro de avisos no quiosque da praca, poste acendendo onde ele esta e
 * caminhada de calcada da praca ate a porta do mercado.
 *
 * Guarda as capturas de dia e de noite em docs/evidence/centro-*.png.
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

const checks = [];
const shot = (n) => page.locator('canvas').screenshot({ path: `docs/evidence/centro-${n}.png` });
/** Recomeca a cena no centro, na hora pedida, e espera ficar pronta. */
const ir = async (tx, ty, hora) => {
  await page.evaluate(([x, y, h]) => {
    window.estado.relogio.definir(h * 60);
    window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'farm', x: x * 32, y: y * 32 });
  }, [tx, ty, hora]);
  await page.waitForFunction(() => window.estado.mapa === 'farm' && window.game.scene.getScene('FarmScene').pronto);
  await page.waitForTimeout(700);
};
/**
 * Poe o jogador num tile OLHANDO pra uma direcao e devolve o alvo que a cena
 * enxerga. A direcao importa: a interacao exige o alvo a frente (ver
 * `CONFIG.interacao.cosseno`), entao teletransportar sem virar nao acha nada.
 */
const encostar = async (tx, ty, direcao = 'up') => {
  await page.evaluate(([x, y, d]) => {
    const f = window.game.scene.getScene('FarmScene');
    f.player.setPosition((x + 0.5) * 32, (y + 0.5) * 32);
    f.direcao = d;
  }, [tx, ty, direcao]);
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const alvo = window.game.scene.getScene('FarmScene').alvo;
    return alvo ? { id: alvo.id, tipo: alvo.tipo, rotulo: alvo.rotulo } : null;
  });
};
const falaAberta = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  return { aberta: ui.dialogoAberto === true, texto: ui.dialogoTexto?.text ?? '' };
});
/**
 * Fecha a fala ate o fim. Esc nao fecha dialogo (so confirmacao): quem passa a
 * pagina e o proprio E, e uma fala de tres linhas precisa de tres toques. Sem
 * isso o E seguinte avanca a fala velha em vez de abrir a proxima placa.
 */
const fecharFala = async () => {
  for (let n = 0; n < 10; n++) {
    if (!(await falaAberta()).aberta) return;
    await page.keyboard.press('e');
    await page.waitForTimeout(180);
  }
  throw new Error('a fala nao fechou');
};

try {
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // ------------------------------------------------------------- mobiliario
  await ir(60, 45, 12);
  const mobiliario = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    const doCentro = f.children.list.filter((o) => o.texture?.key === 'moveis_parque' && o.visible);
    return { pecas: doCentro.length, luzes: f.luzesNoturnas.length };
  });
  assert(mobiliario.pecas >= 50, `poucas pecas de mobiliario na cena: ${mobiliario.pecas}`);
  assert.equal(mobiliario.luzes, 25, `esperava 25 halos vindos dos postes, achei ${mobiliario.luzes}`);
  checks.push(`${mobiliario.pecas} pecas do atlas do parque na cena, ${mobiliario.luzes} halos vindos dos postes`);
  await shot('dia');

  // ------------------------------------------------------- luz vem do poste
  // De dia o halo e invisivel; a noite ele acende E fica sobre o veu escuro.
  const luzDeDia = await page.evaluate(() => window.game.scene.getScene('FarmScene').luzesNoturnas.map((g) => g.alpha));
  assert(luzDeDia.every((a) => a === 0), `halo aceso ao meio-dia: ${luzDeDia.slice(0, 3)}`);
  await ir(57, 44, 22);
  const luzDeNoite = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    return {
      alphas: f.luzesNoturnas.map((g) => Number(g.alpha.toFixed(2))),
      profundidade: f.luzesNoturnas[0]?.depth ?? 0,
      veu: f.ambiente.luz.depth,
    };
  });
  assert(luzDeNoite.alphas.every((a) => a === 1), 'halo apagado as 22:00');
  assert(luzDeNoite.profundidade > luzDeNoite.veu, `halo (${luzDeNoite.profundidade}) tem de ficar acima do veu da noite (${luzDeNoite.veu})`);
  checks.push('poste apaga de dia, acende de noite e a poca de luz fica sobre o veu');
  await shot('noite');

  // ------------------------------------------------------------ quadro de avisos
  await ir(60, 45, 12);
  const noQuadro = await encostar(51, 44, 'up');
  assert.equal(noQuadro?.id, 'quadro_avisos_praca', `esperava o quadro de avisos, achei ${JSON.stringify(noQuadro)}`);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const avisos = await falaAberta();
  assert(avisos.aberta, 'o quadro de avisos nao abriu');
  assert(avisos.texto.length > 10, `texto curto no quadro: "${avisos.texto}"`);
  checks.push('quadro de avisos no quiosque da praca abre e traz texto');
  await fecharFala();

  // -------------------------------------------------------------- placa de rua
  const naPlaca = await encostar(57, 43, 'up');
  assert.equal(naPlaca?.id, 'placa_centro', `esperava a placa do cruzamento, achei ${JSON.stringify(naPlaca)}`);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const placa = await falaAberta();
  assert(placa.aberta && /PRACA CENTRAL|Avenida/i.test(placa.texto), `placa do centro sem texto proprio: "${placa.texto}"`);
  checks.push('placa do cruzamento diz onde o jogador esta');
  await fecharFala();

  // ------------------------------------------------- caminhada pela calcada
  //
  // Da calcada do anel SUL ate a frente da porta do mercado, andando de
  // verdade: e a prova de que o acesso novo e caminho, nao desenho. Vem do sul
  // porque a arte de fachada e elevacao frontal e TODA porta olha pro sul —
  // quem chega pela avenida ao norte tem de contornar o predio, e era
  // exatamente essa volta que nao existia antes do remap.
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.player.setPosition(69.5 * 32, 68.5 * 32);
  });
  await page.waitForTimeout(200);
  const antes = await page.evaluate(() => {
    const p = window.game.scene.getScene('FarmScene').player;
    return { x: p.x / 32, y: p.y / 32 };
  });
  // Correndo: sao 13 tiles do anel ate a porta, e a passada andando nao cobre
  // isso dentro de um tempo de teste razoavel.
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await page.waitForTimeout(4200);
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await page.waitForTimeout(200);
  const depois = await page.evaluate(() => {
    const p = window.game.scene.getScene('FarmScene').player;
    return { x: p.x / 32, y: p.y / 32 };
  });
  const andou = antes.y - depois.y;
  assert(andou > 8, `andou pouco pelo acesso do mercado: ${antes.y.toFixed(1)} -> ${depois.y.toFixed(1)}`);
  assert(depois.y < 57 && depois.y > 54, `nao parou na frente da porta do mercado: y ${depois.y.toFixed(1)}`);
  checks.push(`caminhada de ${andou.toFixed(1)} tiles pelo acesso do mercado, parando na porta`);
  await shot('acesso-mercado');

  // --------------------------------------------------------------- terraco
  await ir(81, 32, 19);
  await shot('bar');
  await ir(70, 58, 12);
  await shot('mercado');

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync('docs/evidence/centro-browser.json', `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(`[centro browser] ${checks.length} conferencias passaram`);

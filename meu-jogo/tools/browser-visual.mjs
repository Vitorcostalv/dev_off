import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(90000);
const erros = []; page.on('pageerror', e => erros.push(e.message));
try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5190');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene'); f.suspenderCampanha(true);
    window.game.scene.getScene('MenuScene').fechar();
    window.estado.relogio.definir(12 * 60); window.estado.clima.definir(window.estado.dia, 'Chuva');
  });
  await page.waitForTimeout(600);
  const resultado = await page.evaluate(async () => {
    const f = window.game.scene.getScene('FarmScene'), { corpoNosPes } = await import('/src/scenes/luzESombra.ts');
    const comparar = s => ({ w: s.body.width, h: s.body.height });
    const player = comparar(f.player);
    const teste = f.physics.add.sprite(f.player.x + 30, f.player.y, 'player-idle-sprites', 'down-0').setOrigin(.5, 1).setScale(.35);
    corpoNosPes(teste, f.tamanhoTile); teste.body.updateFromGameObject();
    const outro = comparar(teste); teste.destroy();
    return { player, outro, esperado: { w: f.tamanhoTile * .33, h: f.tamanhoTile * .24 }, radial: f.textures.exists('luz-radial-suave'), chuva: window.estado.worldEvents.obter(`visual:chuva:${window.estado.mapa}`) };
  });
  for (const k of ['w', 'h']) { assert(Math.abs(resultado.player[k] - resultado.esperado[k]) < .001); assert(Math.abs(resultado.outro[k] - resultado.esperado[k]) < .001); }
  assert(resultado.radial); assert.equal(typeof resultado.chuva, 'number');
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene'); window.estado.clima.definir(window.estado.dia, 'Limpo');
    window.estado.relogio.definir(13 * 60); f.player.setPosition(37 * f.tamanhoTile, 47 * f.tamanhoTile);
  });
  fs.mkdirSync('docs/evidence', { recursive: true });
  await page.waitForTimeout(400); await page.screenshot({ path: 'docs/evidence/visual-ambiente.png' });
  const seco = await page.evaluate(() => ({ ultima: window.estado.worldEvents.obter(`visual:chuva:${window.estado.mapa}`), desenho: window.game.scene.getScene('FarmScene').ambiente.pocos.commandBuffer.length }));
  assert.equal(seco.ultima, resultado.chuva); assert(seco.desenho > 0);
  await page.evaluate(() => window.estado.relogio.definir(21 * 60));
  await page.waitForTimeout(250); await page.screenshot({ path: 'docs/evidence/visual-luz-noturna.png' });
  await page.evaluate(() => window.estado.relogio.definir(7 * 60 + 30));
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.game.scene.getScene('FarmScene').figurantesAmbientais.some(f => f.conta.visible && f.conta.camadas.length === 6)));
  await page.evaluate(async () => {
    const { PersonagemModular } = await import('/src/scenes/PersonagemModular.ts');
    const { POSES_PERSONAGEM, aparenciaPorSemente } = await import('/src/game/visualPersonagem.ts');
    const { default: Phaser } = await import('/node_modules/.vite/deps/phaser.js');
    const cena = new Phaser.Scene('TesteVisual');
    cena.create = function () {
      this.add.rectangle(240, 135, 480, 270, 0x1b2831);
      this.add.text(15, 12, 'Personagens modulares · estudo de poses', { fontSize: '13px', color: '#d3ccba' });
      POSES_PERSONAGEM.forEach((pose, i) => {
        const x = 35 + (i % 7) * 68, y = 110 + Math.floor(i / 7) * 108;
        const pessoa = new PersonagemModular(this, x, y, aparenciaPorSemente(i * 7 + 2), 58);
        pessoa.pose(pose, 'down', 160);
        this.add.text(x - 22, y + 10, pose, { fontSize: '10px', color: '#a5b7b6' });
      });
    };
    window.game.scene.pause('FarmScene'); window.game.scene.pause('UIScene'); window.game.scene.add('TesteVisual', cena, true);
  });
  await page.waitForTimeout(250); await page.screenshot({ path: 'docs/evidence/visual-paper-doll.png' });
  assert.deepEqual(erros, []);
  console.log('Chrome: colisão independente da escala, sombra, chuva persistente e galeria das 13 poses sem erros.');
} finally { await browser.close(); }

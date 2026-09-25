import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAPAS } from '../src/game/mapas.ts';

/** O servidor de desenvolvimento. `GAME_URL` deixa rodar contra um limpo. */
const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';

const out = new URL('../docs/evidence/', import.meta.url);
const prefix = process.env.REPORT_PREFIX ?? 'phase1';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(30000);
const log = { errors: [], warnings: [], maps: [], checks: [] };
page.on('pageerror', e => { if (log.errors.length < 20) { log.errors.push(e.message); console.error(e.message); } });
page.on('console', m => { if (m.type() === 'warning') log.warnings.push(m.text()); if (m.type() === 'error') log.errors.push(m.text()); });
const ready = async () => {
  await page.waitForFunction(() => window.game?.scene.getScene('FarmScene')?.pronto);
  await page.waitForTimeout(100);
  if (await page.evaluate(() => window.game.scene.isActive('MenuScene') && window.game.scene.getScene('MenuScene').pagina === 'titulo')) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  }
};
const snap = async name => page.screenshot({ path: new URL(name + '.png', out).pathname.replace(/^\/(\w:)/, '$1') });
try {
  const start = Date.now();
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5186'); await ready();
  log.timeToPlayableMs = Date.now() - start;
  await page.waitForTimeout(400); await snap(`${prefix}-town`);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await page.keyboard.press('m'); await page.keyboard.press('m');
  await page.evaluate(async () => {
    const { MISSOES_NPC } = await import('/src/game/missoesNpc.ts');
    window.estado.missoesNpc.restaurar({ estados: MISSOES_NPC.filter(m => m.tipo === 'conserto').map(m => [m.id, 'em_andamento']) });
    window.game.scene.getScene('UIScene').abrirComputador();
  });
  await page.waitForFunction(() => window.game.scene.isActive('ComputadorScene'));
  for (let i = 0; i < 7; i++) {
    await page.evaluate(i => window.game.scene.getScene('ComputadorScene').abrirApp(i), i);
    await page.waitForTimeout(100);
    if (i === 1) {
      assert.equal(await page.evaluate(() => window.game.scene.getScene('ComputadorScene').janela.app.vagas.length), 8);
      for (let row = 0; row < 8; row++) {
        const check = await page.evaluate(() => {
          const a = window.game.scene.getScene('ComputadorScene').janela.app;
          const r = a.linhas[a.cursor].fundo;
          return { cursor: a.cursor, visible: r.visible, enabled: r.input.enabled, bottom: r.y + r.height / 2, limit: a.areaDaVista.y + a.areaDaVista.h };
        });
        assert.equal(check.cursor, row); assert(check.visible && check.enabled); assert(check.bottom <= check.limit);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(80);
      }
      await snap(`${prefix}-work-last`);
      await page.keyboard.press('PageUp');
      assert.equal(await page.evaluate(() => window.game.scene.getScene('ComputadorScene').janela.app.cursor), 2);
      await page.mouse.move(180, 280); await page.mouse.wheel(0, 120); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.game.scene.getScene('ComputadorScene').janela.app.cursor), 3);
      await snap(`${prefix}-work`);
      log.checks.push('8 work rows: keyboard, PageUp and mouse wheel');
    }
    await page.evaluate(() => window.game.scene.getScene('ComputadorScene').voltarAoDesktop());
  }
  await page.evaluate(() => window.game.scene.getScene('ComputadorScene').desligar());
  for (const m of Object.values(MAPAS)) {
    // `pronto` cai na mao ANTES do restart, e a espera cobra tambem o carregador
    // ocioso. Sem as duas coisas a espera enxerga o `pronto` da cena VELHA e
    // segue pro mapa seguinte antes de o atual existir — e a cena de mundo hoje
    // reinicia ate tres vezes por entrada (tilemap, atlas de movel e folha de
    // NPC, cada um cortando o `create` e pedindo o que falta).
    await page.evaluate(m => {
      const f = window.game.scene.getScene('FarmScene');
      f.pronto = false;
      f.scene.restart({ mapa: m.chave, x: (m.spawnTile.x + .5) * 32, y: (m.spawnTile.y + .5) * 32 });
    }, m);
    await page.waitForFunction(k => {
      const f = window.game.scene.getScene('FarmScene');
      return window.estado.mapa === k && f?.pronto === true && f.load.isLoading() === false;
    }, m.chave);
    log.maps.push(m.chave);
    console.log('mapa', log.maps.length, m.chave);
    fs.writeFileSync(new URL(`${prefix}-browser.json`, out), JSON.stringify(log, null, 2));
    await page.waitForTimeout(80);
  }
  assert.equal(log.maps.length, 77);
  await page.evaluate(() => {
    const e = window.estado; e.cidade.construir('padaria'); e.cidade.atribuir('padaria', 'joao');
    e.dia = 1; e.relogio.definir(600); e.rotinasNpc.atualizar(1, 600, 0);
    window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'bairro', x: 128.5 * 32, y: 72 * 32 });
  }); await ready();
  // O sprite de um NPC pode nascer null: as folhas nao vem mais no boot, e a
  // cena pede a de quem entra em cena no quadro em que ele entra. Esperar por
  // ele e parte do teste — um `n.sprite.visible` direto viraria TypeError
  // intermitente em vez de dizer o que faltou.
  await page.waitForFunction(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.sincronizarNpcs(true);
    return Boolean(f.npcs.find(n => n.estado.id === 'joao')?.sprite);
  });
  const worker = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene'); f.sincronizarNpcs(true);
    const n = f.npcs.find(n => n.estado.id === 'joao');
    return { visible: n.sprite.visible, collision: n.sprite.body.enable, map: n.estado.mapaAtual };
  });
  assert.deepEqual(worker, { visible: true, collision: true, map: 'bairro' });
  await page.waitForTimeout(400); await snap(`${prefix}-worker`);
  await page.evaluate(() => window.game.scene.getScene('FarmScene').salvarJogo());
  await page.reload(); await ready();
  assert.equal(await page.evaluate(() => window.estado.cidade.funcionario('padaria')), 'joao');
  for (const bad of [null, 42, 'invalid']) {
    await page.evaluate(bad => { const s = JSON.parse(localStorage.getItem('meu-jogo:save')); s.cidade = { construidos: bad, funcionarios: bad }; localStorage.setItem('meu-jogo:save', JSON.stringify(s)); }, bad);
    await page.reload(); await ready();
  }
  log.checks.push('7 apps; 77 maps; Joao visible/collision; save/reload; malformed city');
  assert.deepEqual(log.errors, []); assert.deepEqual(log.warnings.filter(w => w.includes('AnimationManager')), []);
} finally {
  fs.writeFileSync(new URL(`${prefix}-browser.json`, out), JSON.stringify(log, null, 2));
  await browser.close();
}
console.log(JSON.stringify(log));

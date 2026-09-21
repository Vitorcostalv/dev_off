import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(120000);
const erros = [];
page.on('pageerror', e => erros.push(e.message));
const entrar = async () => {
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
};
const medir = async () => page.evaluate(() => {
  const c = window.game.scene.getScene('CampanhaScene');
  return c.raiz.list.filter(o => o.type === 'Text' && o.y === 184).map(o => ({ texto: o.text, fim: o.y + o.height }));
});
const terminar = async () => {
  const result = await page.evaluate(() => {
    const s = window.game.scene.getScene('CampanhaScene');
    const id = s.id, problemas = [];
    let i = 0;
    while (s.indice < s.cena.quadros.length && i++ < 100) {
      for (const texto of s.raiz.list.filter(o => o.type === 'Text' && o.y === 184)) {
        if (texto.y + texto.height > 238) problemas.push(`${id}:${s.indice}: ${texto.height}`);
      }
      s.prontoEm = 0; s.avancar();
    }
    return { id, problemas, concluida: window.estado.worldEvents.ativa(`campanha:cena:${id}`) };
  });
  assert.deepEqual(result.problemas, []);
  assert(result.concluida, result.id);
  await page.waitForFunction(() => !window.game.scene.isActive('CampanhaScene'));
  return result.id;
};
try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5190');
  await entrar();
  await page.waitForFunction(() => window.game.scene.isActive('CampanhaScene'));
  assert.equal(await page.evaluate(() => window.game.scene.getScene('CampanhaScene').id), 'prologo');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.game.scene.getScene('CampanhaScene').indice), 1);
  const textoAntes = await medir();
  await page.reload(); await entrar();
  await page.waitForFunction(() => window.game.scene.isActive('CampanhaScene'));
  assert.deepEqual(await medir(), textoAntes);
  await page.screenshot({ path: 'docs/evidence/campanha-prologo.png' });
  await terminar();
  await page.waitForFunction(() => window.estado.mapa === 'oficina' && window.game.scene.getScene('FarmScene').pronto);
  const ids = await page.evaluate(async () => (await import('/src/game/campanha.ts')).CENAS_CAMPANHA.map(s => s.id));
  for (const id of ids.filter(x => !['prologo', 'final', 'epilogo'].includes(x))) {
    // Preparação de tempo/quest para testar cenas sem horas de grind; o disparo
    // passa pelas mesmas condições de mapa/NPC da partida normal.
    await page.evaluate(async id => {
      const { CENAS_CAMPANHA } = await import('/src/game/campanha.ts');
      const s = CENAS_CAMPANHA.find(s => s.id === id), e = window.estado;
      const f = window.game.scene.getScene('FarmScene');
      f.suspenderCampanha(true);
      e.dia = Math.max(e.dia + 1, s.dia ?? 0);
      if (s.ficha) e.arquivo.coletar(s.ficha);
      if (s.missao) { e.missoesNpc.iniciar(s.missao); e.missoesNpc.concluirComRecompensas(s.missao, e); }
      e.mapa = s.local === 'represa*' ? 'represa_0' : s.local;
      f.pronto = false; f.scene.restart({ mapa: e.mapa });
    }, id);
    await page.waitForFunction(() => window.game.scene.getScene('FarmScene').pronto);
    await page.evaluate(async id => {
      const { CENAS_CAMPANHA } = await import('/src/game/campanha.ts');
      const s = CENAS_CAMPANHA.find(s => s.id === id), f = window.game.scene.getScene('FarmScene');
      if (s.npc) f.falarCom({ props: { npcId: s.npc } });
      else { f.suspenderCampanha(false); f.campanhaApos = 0; }
    }, id);
    await page.waitForFunction(id => window.game.scene.isActive('CampanhaScene') && window.game.scene.getScene('CampanhaScene').id === id, id);
    if (id === 'cliente') {
      await page.evaluate(() => { const s = window.game.scene.getScene('CampanhaScene'); s.prontoEm = 0; s.avancar(); s.escolha = 1; });
    }
    if (id === 'rio') await page.screenshot({ path: 'docs/evidence/campanha-rio.png' });
    await terminar();
  }
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('campanha:escolha:cliente')), 1);
  await page.evaluate(() => window.game.scene.getScene('FarmScene').entrarProfundezas());
  await page.waitForFunction(() => window.game.scene.isActive('ProfundezasScene'));
  // Movimento real, além dos testes de alcance por geometria.
  const inicio = await page.evaluate(() => window.game.scene.getScene('ProfundezasScene').x);
  await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d');
  assert(await page.evaluate(() => window.game.scene.getScene('ProfundezasScene').x) > inicio);
  for (let andar = 51; andar <= 200; andar++) {
    const resultado = await page.evaluate(esperado => {
      const s = window.game.scene.getScene('ProfundezasScene');
      if (s.andar !== esperado) return { erro: `Andar ${s.andar}, esperado ${esperado}` };
      // A escada não pode avançar antes do documento.
      s.x = 427; s.y = 61; s.aceitarApos = 0; s.interagir();
      const bloqueou = s.andar === esperado;
      s.voltar();
      s.x = 96; s.y = 69; s.aceitarApos = 0; s.interagir();
      const alturas = [];
      while (s.painel.visible) {
        alturas.push(s.leitura.y + s.leitura.height);
        s.aceitarApos = 0; s.interagir();
      }
      const lido = window.estado.arquivo.tem(esperado);
      return { bloqueou, lido, alturas };
    }, andar);
    assert(!resultado.erro, resultado.erro);
    assert(resultado.bloqueou); assert(resultado.lido);
    assert(resultado.alturas.every(y => y <= 213), `Texto A-${andar}`);
    if ([104, 173].includes(andar)) await page.screenshot({ path: `docs/evidence/campanha-andar-${andar}.png` });
    if (andar === 100) {
      await page.reload(); await entrar();
      await page.waitForFunction(() => window.game.scene.getScene('FarmScene').pronto);
      await page.evaluate(() => window.game.scene.getScene('FarmScene').entrarProfundezas());
      await page.waitForFunction(() => window.game.scene.isActive('ProfundezasScene'));
      assert.equal(await page.evaluate(() => window.game.scene.getScene('ProfundezasScene').andar), 100);
    }
    await page.evaluate(() => { const s = window.game.scene.getScene('ProfundezasScene'); s.x = 427; s.y = 61; s.aceitarApos = 0; s.interagir(); });
  }
  await page.waitForFunction(() => window.game.scene.isActive('CampanhaScene'));
  assert.equal(await terminar(), 'final');
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene'); window.estado.mapa = 'oficina';
    f.pronto = false; f.scene.restart({ mapa: 'oficina' });
  });
  await page.waitForFunction(() => window.game.scene.isActive('CampanhaScene'));
  assert.equal(await terminar(), 'epilogo');
  assert.deepEqual(erros, []);
  const dados = await page.evaluate(() => ({ flags: window.estado.worldEvents.serializar(), registros: window.estado.arquivo.quantosRegistros }));
  assert.equal(dados.registros, 150);
  fs.writeFileSync('docs/evidence/campanha-browser.json', JSON.stringify({ cenas: ids.length, salas: 150, erros, ...dados }, null, 2));
  console.log('Campanha no Chrome: prólogo e retomada, 25 cenas, escolha, 150 salas/documentos, final e epílogo passaram.');
} finally { await browser.close(); }

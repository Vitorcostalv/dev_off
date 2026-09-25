import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(120000);
const erros = []; page.on('pageerror', e => erros.push(e.message));
const iniciar = async () => { await page.waitForFunction(() => window.game?.scene.isActive('MenuScene')); await page.keyboard.press('Enter'); };
const fecharTexto = () => page.evaluate(() => { const s = window.game.scene.getScene('PrologoScene'); let i = 0; while (s.modo === 'texto' && i++ < 30) s.interagir(); });
try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5190'); await iniciar();
  await page.waitForFunction(() => window.game.scene.isActive('PrologoScene'));
  await fecharTexto(); const x = await page.evaluate(() => window.game.scene.getScene('PrologoScene').x);
  await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
  assert(await page.evaluate(() => window.game.scene.getScene('PrologoScene').x) > x);
  fs.mkdirSync('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/prologo-exploravel.png' });
  for (let etapa = 0; etapa < 4; etapa++) {
    await page.evaluate(() => { const s = window.game.scene.getScene('PrologoScene'); s.x = 390; s.y = 104; s.interagir(); }); await fecharTexto();
    await page.evaluate(() => { const s = window.game.scene.getScene('PrologoScene'); s.x = 331; s.y = 104; s.interagir(); }); await fecharTexto();
    assert.equal(await page.evaluate(() => window.game.scene.getScene('PrologoScene').modo), 'trabalho');
    await page.evaluate(async etapa => { const s = window.game.scene.getScene('PrologoScene'); const { MADRUGADAS } = await import('/src/game/prologoExploravel.ts'); s.escolha = MADRUGADAS[etapa].resposta; s.interagir(); }, etapa); await fecharTexto();
    assert.equal(await page.evaluate(() => window.game.scene.getScene('PrologoScene').etapa), etapa + 1);
    if (etapa === 1) { await page.reload(); await iniciar(); await page.waitForFunction(() => window.game.scene.isActive('PrologoScene')); assert.equal(await page.evaluate(() => window.game.scene.getScene('PrologoScene').etapa), 2); }
  }
  await page.evaluate(() => { const s = window.game.scene.getScene('PrologoScene'); s.x = 234; s.y = 203; s.interagir(); });
  await page.waitForFunction(() => window.game.scene.isActive('CampanhaScene'));
  assert.equal(await page.evaluate(() => window.game.scene.getScene('CampanhaScene').indice), 6);
  await page.evaluate(() => { const s = window.game.scene.getScene('CampanhaScene'); while (s.indice < s.cena.quadros.length) { s.prontoEm = 0; s.avancar(); } });
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene').pronto && !window.game.scene.isActive('CampanhaScene'));
  await page.evaluate(() => window.game.scene.getScene('FarmScene').suspenderCampanha(true));
  assert(await page.evaluate(() => window.estado.worldEvents.obter('diario:cena:prologo')));
  for (const id of ['leticia', 'edu', 'mari', 'jaqueline', 'wendel', 'alice', 'hiago', 'vitor']) {
    await page.evaluate(id => window.game.scene.getScene('UIScene').iniciarDialogo([{ nome: id, npcId: id, texto: 'Obrigado por me contar.' }]), id);
    await page.waitForFunction(id => window.game.scene.getScene('UIScene').dialogoRetrato.texture.key === `retrato-${id}`, id);
    const expressoes = ['neutro', 'feliz', 'preocupado', 'triste', 'irritado', 'surpreso'];
    for (const expressao of expressoes) {
      await page.evaluate(expressao => { const ui = window.game.scene.getScene('UIScene'); ui.falas[0].expressao = expressao; ui.desenharFala(); }, expressao);
      assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoRetrato.frame.name), expressao);
    }
    if (id === 'leticia') await page.screenshot({ path: 'docs/evidence/retrato-dialogo.png' });
    await page.evaluate(() => window.game.scene.getScene('UIScene').fecharDialogo());
  }
  await page.evaluate(() => { window.estado.preferencias.valores.retratos = false; window.game.scene.getScene('UIScene').iniciarDialogo([{ nome: 'Edu', npcId: 'edu', texto: 'Podemos caminhar.' }]); });
  assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoRetrato.visible), false);
  await page.evaluate(() => { const ui = window.game.scene.getScene('UIScene'); ui.fecharDialogo(); const f = window.game.scene.getScene('FarmScene'); f.scene.restart({ mapa: 'oficina' }); });
  await page.waitForFunction(() => window.estado.mapa === 'oficina' && window.game.scene.getScene('FarmScene').pronto);
  const pontos = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => p.tipo === 'domestico').map(p => p.props.acao));
  assert.equal(pontos.length, 10);
  for (const id of ['cafe', 'banho', 'espelho', 'radio', 'janela', 'correio', 'bau']) {
    await page.evaluate(id => { const f = window.game.scene.getScene('FarmScene'); f.alvo = f.interagiveis.find(p => p.props.acao === id); f.interagir(); }, id);
    assert(await page.evaluate(() => window.game.scene.getScene('UIScene').bloqueado), id);
    await page.evaluate(() => window.game.scene.getScene('UIScene').fecharDialogo());
  }
  // O armario abre menu, e nao dialogo: no primeiro dia so ha a roupa de todo dia.
  await page.evaluate(() => { const f = window.game.scene.getScene('FarmScene'); f.alvo = f.interagiveis.find(p => p.props.acao === 'armario'); f.interagir(); });
  assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.length), 1);
  await page.evaluate(() => window.game.scene.getScene('UIScene').fecharMenu());
  await page.evaluate(() => { window.estado.worldEvents.definir('fotografia:liberada', true); window.game.scene.getScene('FarmScene').fotografar(); });
  await page.waitForFunction(() => Object.keys(window.estado.worldEvents.serializar().flags).some(k => k.startsWith('foto:')));
  await page.evaluate(() => window.game.scene.getScene('FarmScene').scene.launch('MenuScene', { pagina: 'fotos' }));
  await page.waitForFunction(() => window.game.scene.isActive('MenuScene') && window.game.scene.getScene('MenuScene').pagina === 'fotos');
  await page.evaluate(() => window.game.scene.getScene('MenuScene').opcoes.find(o => o.texto.startsWith('Dia ')).executar());
  await page.waitForFunction(() => window.game.scene.getScene('MenuScene').raiz.list.some(o => o.type === 'Image' && o.texture.key.startsWith('foto-pessoal-')));
  await page.screenshot({ path: 'docs/evidence/fotografia-casa.png' });
  await page.reload(); await iniciar();
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene').pronto);
  assert(await page.evaluate(() => window.estado.worldEvents.obter('diario:casa:cafe:0')));
  assert(await page.evaluate(() => Object.keys(window.estado.worldEvents.serializar().flags).some(k => k.startsWith('foto:'))));
  await page.evaluate(() => { const f = window.game.scene.getScene('FarmScene'); f.suspenderCampanha(true); });
  for (const [dia, mapa, minuto] of [[6, 'bairro', 1200], [13, 'farm', 1000], [20, 'farm', 1200], [24, 'bar', 1200], [27, 'farm', 1000]]) {
    await page.evaluate(({ dia, mapa, minuto }) => { const f = window.game.scene.getScene('FarmScene'); window.estado.dia = dia; window.estado.relogio.definir(minuto); f.scene.restart({ mapa }); }, { dia, mapa, minuto });
    await page.waitForFunction(mapa => window.estado.mapa === mapa && window.game.scene.getScene('FarmScene').pronto, mapa);
    const evento = await page.evaluate(async () => {
      const { buscarNpc } = await import('/src/game/npcs.ts');
      const { dialogoDoEvento } = await import('/src/game/eventosDeConvivencia.ts');
      const f = window.game.scene.getScene('FarmScene'), ui = window.game.scene.getScene('UIScene'); f.suspenderCampanha(true); f.abrirMenuDeConversa(buscarNpc(dialogoDoEvento(window.estado).find(f => f.npcId).npcId));
      const opcao = ui.menuOpcoes.find(o => o.rotulo.startsWith('Ficar:'));
      if (!opcao) return 'ausente'; opcao.aoEscolher();
      let fora = false; while (ui.dialogoAberto) { if (ui.dialogoTexto.y + ui.dialogoTexto.height > 248) fora = true; ui.avancarDialogo(); }
      return { marco: window.estado.worldEvents.obter('social:ultimoMarco'), fora };
    });
    assert.notEqual(evento, 'ausente'); assert(evento.marco); assert.equal(evento.fora, false);
  }
  assert.deepEqual(erros, []);
  await page.evaluate(() => { const f = window.game.scene.getScene('FarmScene'); window.estado.dia = 7; f.scene.restart({ mapa: 'oficina' }); });
  await page.waitForFunction(() => window.estado.mapa === 'oficina' && window.game.scene.getScene('FarmScene').pronto);
  await page.evaluate(() => { const f = window.game.scene.getScene('FarmScene'); f.suspenderCampanha(true); f.dormir('oficina'); });
  await page.waitForFunction(() => window.game.scene.isActive('NoiteScene'));
  await page.evaluate(() => { const n = window.game.scene.getScene('NoiteScene'); n.escolha = 1; n.acionar(); });
  assert(await page.evaluate(() => window.estado.worldEvents.obter('diario:insonia:7:1')));
  await page.screenshot({ path: 'docs/evidence/insonia.png' });
  await page.evaluate(() => { const n = window.game.scene.getScene('NoiteScene'); n.escolha = 0; n.acionar(); });
  await page.waitForFunction(() => !window.game.scene.isActive('NoiteScene'));
  assert.equal(await page.evaluate(() => window.estado.dia), 8);
  assert.equal(await page.evaluate(() => window.estado.relogio.minutos), 167);
  await page.evaluate(() => window.game.scene.getScene('FarmScene').dormir('oficina'));
  await page.waitForFunction(() => window.estado.relogio.minutos === 360);
  assert.equal(await page.evaluate(() => window.estado.dia), 8);
  await page.evaluate(() => { window.estado.dia = 25; window.game.scene.getScene('FarmScene').dormir('oficina'); });
  await page.waitForFunction(() => window.game.scene.isActive('NoiteScene'));
  assert.equal(await page.evaluate(() => window.game.scene.getScene('NoiteScene').tipo), 'sonho');
  await page.evaluate(() => { const n = window.game.scene.getScene('NoiteScene'); for (let i = 0; i < 5; i++) n.acionar(); });
  await page.waitForFunction(() => window.estado.dia === 26);
  assert(await page.evaluate(() => window.estado.worldEvents.obter('diario:sonho:25')));
  assert.deepEqual(erros, []);
  console.log('Prólogo explorável: movimento, 4 diagnósticos, reload, chegada e diário; 8 retratos × 6 expressões e modo simples passaram.');
} finally { await browser.close(); }

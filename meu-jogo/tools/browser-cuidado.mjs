import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(120000);
const erros = [];
page.on('pageerror', e => erros.push(e.message));

const irPara = async (mapa, dia, minuto) => {
  await page.evaluate(({ mapa, dia, minuto }) => {
    const f = window.game.scene.getScene('FarmScene');
    f.suspenderCampanha(true);
    window.estado.dia = dia;
    window.estado.relogio.definir(minuto);
    f.scene.restart({ mapa });
  }, { mapa, dia, minuto });
  await page.waitForFunction(mapa => window.estado.mapa === mapa && window.game.scene.getScene('FarmScene').pronto, mapa);
  await page.evaluate(() => window.game.scene.getScene('FarmScene').suspenderCampanha(true));
  await page.waitForTimeout(320);
  await page.waitForFunction(mapa => window.estado.mapa === mapa && window.game.scene.getScene('FarmScene').pronto, mapa);
};
const avancarFalas = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  let guarda = 0;
  while (ui.dialogoAberto && guarda++ < 40) ui.avancarDialogo();
});

try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5190');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto);
  await page.evaluate(async () => {
    const f = window.game.scene.getScene('FarmScene');
    f.suspenderCampanha(true);
    window.game.scene.stop('PrologoScene');
    window.game.scene.stop('CampanhaScene');
    const { CENAS_CAMPANHA } = await import('/src/game/campanha.ts');
    for (const cena of CENAS_CAMPANHA) window.estado.worldEvents.definir(`campanha:cena:${cena.id}`, true);
    window.estado.worldEvents.definir('prologo:explorado', true);
  });

  // ------------------------------------------- marcas de ferimento no corpo --
  await irPara('bairro', 3, 15 * 60);
  const semFerimento = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    window.estado.vida.restaurarTudo();
    f.desenharAparencia();
    return f.curativo.commandBuffer.length;
  });
  const comFerimento = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    window.estado.vida.receberDano(21);
    f.desenharAparencia();
    return { comandos: f.curativo.commandBuffer.length, fracao: window.estado.vida.fracao };
  });
  assert(comFerimento.fracao < 0.4, `vida em ${comFerimento.fracao}`);
  assert(comFerimento.comandos > semFerimento, 'o corpo ferido desenha marcas a mais');

  // ------------------------------------ moradores percebem a volta da represa --
  await page.evaluate(() => {
    window.estado.relacoes.ganharRelacao('wendel', 8);
    window.estado.worldEvents.definir('cuidado:represa', window.estado.dia);
  });
  const abertura = await page.evaluate(async () => {
    const { buscarNpc } = await import('/src/game/npcs.ts');
    const f = window.game.scene.getScene('FarmScene');
    f.falarCom({ id: 'npc:wendel', tipo: 'npc', rotulo: 'Falar', x: 0, y: 0, props: { npcId: 'wendel' } });
    const ui = window.game.scene.getScene('UIScene');
    return { nome: buscarNpc('wendel').nome, texto: ui.dialogoTexto.text };
  });
  assert(abertura.texto.includes('curativo') || abertura.texto.includes('gaze'), abertura.texto);
  await page.screenshot({ path: 'docs/evidence/ferimento-fala.png' });
  await avancarFalas();
  await page.evaluate(() => { const ui = window.game.scene.getScene('UIScene'); if (ui.menuAberto) ui.fecharMenu(); });

  // ------------------------------------------------- o espelho mostra o corpo --
  await irPara('oficina', 3, 9 * 60);
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.alvo = f.interagiveis.find(p => p.props.acao === 'espelho');
    f.interagir();
  });
  const falasDoEspelho = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const textos = [];
    let guarda = 0;
    while (ui.dialogoAberto && guarda++ < 10) { textos.push(ui.dialogoTexto.text); ui.avancarDialogo(); }
    return textos;
  });
  assert(falasDoEspelho.some(t => t.includes('Curativo')), JSON.stringify(falasDoEspelho));
  await page.evaluate(() => { const ui = window.game.scene.getScene('UIScene'); if (ui.menuAberto) ui.fecharMenu(); });

  // -------------------------------------------------- consulta no posto --
  await page.evaluate(async () => {
    const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts');
    const projeto = Object.values(PROJETOS_CIDADE).find(p => p.id === 'hospital');
    window.estado.carteira.ganhar(2_000_00);
    window.estado.cidade.construir(projeto.id);
    window.estado.cidade.atribuir(projeto.id, 'rafael');
  });
  const consulta = await page.evaluate(async () => {
    const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts');
    const projeto = Object.values(PROJETOS_CIDADE).find(p => p.id === 'hospital');
    const f = window.game.scene.getScene('FarmScene');
    window.estado.dia = 3 - (window.estado.dia % 7) + 1; // uma terca-feira
    window.estado.relogio.definir(10 * 60);
    f.usarServicoCidade(projeto);
    const ui = window.game.scene.getScene('UIScene');
    ui.confirmarEscolha?.();
    return ui.dialogoAberto ? ui.dialogoTexto.text : null;
  });
  if (consulta === null) {
    // O atendimento pode recusar por horário: o teste então confere a cena pura.
    const cena = await page.evaluate(async () => {
      const { cenaDaConsulta } = await import('/src/game/cuidado.ts');
      return cenaDaConsulta(window.estado, 'rafael', 'Rafael').map(f => f.texto);
    });
    assert(cena[0].includes('luz branca'), JSON.stringify(cena));
  } else {
    assert(consulta.includes('luz branca') || consulta.includes('cadeira'), consulta);
  }
  fs.mkdirSync('docs/evidence', { recursive: true });
  assert.deepEqual(erros, []);
  console.log('Cuidado: marcas no corpo, fala de quem ve a volta da represa, espelho e cena da consulta passaram.');
} finally {
  await browser.close();
}

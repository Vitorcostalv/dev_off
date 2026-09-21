import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
const erros = [];
page.on('pageerror', e => erros.push(e.message));
const iniciar = async () => {
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  // Isola a compatibilidade do arquivo legado, anterior ao início da campanha.
  await page.evaluate(() => {
    window.game.scene.getScene('FarmScene').suspenderCampanha(true);
    window.game.scene.getScene('MenuScene').fechar();
  });
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto);
};
try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5189');
  await iniciar();
  await page.evaluate(() => {
    window.estado.arquivo.coletar(1);
    window.game.scene.getScene('UIScene').abrirArquivo();
  });
  assert(!await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.some(o => /Psicoterapia/.test(o.rotulo))));
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.game.scene.getScene('FarmScene').arquivarFicha(50));
  await page.keyboard.press('j');
  await page.waitForFunction(() => window.game.scene.getScene('UIScene').menuOpcoes[0]?.rotulo.startsWith('Psicoterapia'));
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('UIScene').dialogoAberto);
  assert.equal(await page.evaluate(() => window.estado.arquivo.proximoRegistro()), 51);
  assert.equal(await page.evaluate(() => window.estado.arquivo.tem(51)), false);
  // Conclui pelo mesmo comando que o jogador usa, sem escrever progresso direto.
  for (let i = 0; i < 20 && await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoAberto); i++) {
    await page.keyboard.press('Enter');
  }
  assert.equal(await page.evaluate(() => window.estado.arquivo.proximoRegistro()), 52);
  await page.reload();
  await iniciar();
  assert.equal(await page.evaluate(() => window.estado.arquivo.proximoRegistro()), 52);

  // Renderiza e conclui todas as páginas restantes. Confere legibilidade real,
  // preservação do texto e salvamento, incluindo registros extensos como o 200.
  const resultado = await page.evaluate(async () => {
    const ui = window.game.scene.getScene('UIScene');
    const { REGISTROS_PSICOTERAPIA } = await import('/src/game/registrosPsicoterapia.ts');
    const problemas = [];
    let paginas = 0;
    for (const registro of REGISTROS_PSICOTERAPIA) {
      ui.fecharMenu();
      ui.lerRegistroPsicoterapia(registro.numero);
      const texto = ui.falas.map(f => f.texto).join(' ').replace(/\s+/g, ' ').trim();
      if (texto !== registro.texto.replace(/\s+/g, ' ').trim()) problemas.push(`Texto ${registro.numero}`);
      while (ui.dialogoAberto) {
        if (ui.dialogoTexto.y + ui.dialogoTexto.height > 246) problemas.push(`Overflow ${registro.numero}`);
        paginas++;
        ui.avancarDialogo();
      }
      if (!window.estado.arquivo.tem(registro.numero)) problemas.push(`Progresso ${registro.numero}`);
    }
    return { problemas, paginas, proximo: window.estado.arquivo.proximoRegistro(), total: window.estado.arquivo.quantosRegistros };
  });
  assert.deepEqual(resultado.problemas, []);
  assert.equal(resultado.total, 150);
  assert.equal(resultado.proximo, null);
  await page.reload();
  await iniciar();
  assert.equal(await page.evaluate(() => window.estado.arquivo.quantosRegistros), 150);
  assert.deepEqual(erros, []);
  console.log(`Psicoterapia no Chrome: abertura por J, bloqueios, leitura, ${resultado.paginas} páginas sem corte e save/reload até 200 passaram.`);
} finally {
  await browser.close();
}

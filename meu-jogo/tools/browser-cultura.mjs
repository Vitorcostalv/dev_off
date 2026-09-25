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
  while (ui.dialogoAberto && guarda++ < 60) ui.avancarDialogo();
});
const fecharMenu = () => page.evaluate(() => { const ui = window.game.scene.getScene('UIScene'); if (ui.menuAberto) ui.fecharMenu(); });
const usarPonto = (acao) => page.evaluate(acao => {
  const f = window.game.scene.getScene('FarmScene');
  const alvo = f.interagiveis.find(p => p.props.acao === acao);
  if (!alvo) return false;
  f.alvo = alvo;
  f.interagir();
  return true;
}, acao);
const opcoesDoMenu = () => page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.map(o => o.rotulo));
const escolherMenu = (trecho) => page.evaluate(trecho => {
  const ui = window.game.scene.getScene('UIScene');
  const opcao = ui.menuOpcoes.find(o => o.rotulo.includes(trecho));
  if (!opcao) return false;
  ui.fecharMenu();
  opcao.aoEscolher();
  return true;
}, trecho);

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

  // ---------------------------------------------- documento no mundo --
  await irPara('bairro', 3, 11 * 60);
  const documentos = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => p.tipo === 'documento').map(p => p.props.documento));
  assert(documentos.length >= 3, `so ${documentos.length} documentos no bairro`);
  await page.evaluate(id => {
    const f = window.game.scene.getScene('FarmScene');
    f.alvo = f.interagiveis.find(p => p.props.documento === id);
    f.interagir();
  }, documentos[0]);
  await avancarFalas();
  assert.equal(await page.evaluate(id => window.estado.worldEvents.ativa(`memoria:doc:${id}`), documentos[0]), true);
  const restantes = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => p.tipo === 'documento').length);
  assert.equal(restantes, documentos.length - 1, 'o documento recolhido sai do mapa');

  // --------------------------------------------------- biblioteca --
  await irPara('biblioteca', 3, 11 * 60);
  const pontos = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => String(p.props.acao ?? '').startsWith('biblioteca:')).map(p => p.props.acao));
  assert.deepEqual(pontos, ['biblioteca:acervo', 'biblioteca:jornal', 'biblioteca:arquivo'], JSON.stringify(pontos));
  // Acervo: assuntos, títulos e páginas.
  assert(await usarPonto('biblioteca:acervo'));
  const assuntos = await opcoesDoMenu();
  assert(assuntos.some(a => a.includes('História local')), JSON.stringify(assuntos));
  assert(await escolherMenu('História local'));
  const titulos = await opcoesDoMenu();
  assert(titulos.length >= 2, JSON.stringify(titulos));
  assert(await escolherMenu('Rio Claro'));
  const paginas = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const textos = [];
    let guarda = 0;
    while (ui.dialogoAberto && guarda++ < 10) { textos.push(ui.dialogoTexto.text); ui.avancarDialogo(); }
    return textos;
  });
  assert(paginas.length >= 3, JSON.stringify(paginas));
  assert.equal(await page.evaluate(() => window.estado.worldEvents.ativa('livro:fundacao')), true);
  await page.screenshot({ path: 'docs/evidence/biblioteca-acervo.png' });
  await fecharMenu();
  // Jornal da semana na mesa de leitura.
  assert(await usarPonto('biblioteca:jornal'));
  const manchete = await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoTexto.text);
  assert(manchete === manchete.toUpperCase(), manchete);
  await avancarFalas();
  assert.equal(await page.evaluate(() => window.estado.worldEvents.ativa('jornal:lido:1')), true);
  // Arquivo: sem Clara nem Ilda, ninguém cataloga.
  await page.evaluate(() => {
    for (const id of ['clara', 'ilda']) {
      const npc = window.estado.rotinasNpc.porId(id);
      if (npc) { npc.dentro = null; npc.mapaAtual = 'rural'; }
    }
  });
  assert(await usarPonto('biblioteca:arquivo'));
  const semArquivista = await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoTexto.text);
  // O texto do diálogo vem quebrado em linhas: comparar por trecho curto.
  assert(semArquivista.includes('Clara e Ilda'), semArquivista);
  await avancarFalas();
  // Com Clara na biblioteca, o documento entra no arquivo.
  await page.evaluate(() => {
    const npc = window.estado.rotinasNpc.porId('clara');
    npc.dentro = 'biblioteca';
    npc.mapaAtual = 'bairro';
    npc.visivel = true;
  });
  assert(await usarPonto('biblioteca:arquivo'));
  const entrega = await opcoesDoMenu();
  assert(entrega.length >= 1, JSON.stringify(entrega));
  await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const opcao = ui.menuOpcoes[0];
    ui.fecharMenu();
    opcao.aoEscolher();
  });
  await avancarFalas();
  assert.equal(await page.evaluate(() => Number(window.estado.worldEvents.obter('memoria:arquivados'))), 1);
  await fecharMenu();
  // Oito documentos abrem a sala de memória, e o ponto aparece sem recarregar o mapa.
  const abriu = await page.evaluate(async () => {
    const { DOCUMENTOS, coletarDocumento, entregarAoArquivo, museuAberto } = await import('/src/game/memoriaDaCidade.ts');
    for (const doc of DOCUMENTOS.slice(0, 8)) { coletarDocumento(window.estado, doc.id); entregarAoArquivo(window.estado, doc.id, 'clara'); }
    window.game.scene.getScene('FarmScene').reconstruirPontos();
    return { museu: museuAberto(window.estado), pontos: window.game.scene.getScene('FarmScene').interagiveis.filter(p => String(p.props.acao ?? '').startsWith('biblioteca:')).length };
  });
  assert.equal(abriu.museu, true);
  assert.equal(abriu.pontos, 4, 'a sala de memória entra como quarto ponto');
  assert(await usarPonto('biblioteca:memoria'));
  const secoes = await opcoesDoMenu();
  assert(secoes.length >= 3, JSON.stringify(secoes));
  await escolherMenu(secoes[0].split(' (')[0]);
  await avancarFalas();
  await page.screenshot({ path: 'docs/evidence/sala-de-memoria.png' });
  await fecharMenu();

  // ------------------------------------------------------- rádio em casa --
  await irPara('oficina', 3, 8 * 60);
  assert(await usarPonto('radio'));
  const radio = await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoTexto.text);
  assert(radio.includes('Manhã na Rio Claro'), radio);
  await avancarFalas();

  // -------------------------------------------------- jornal no celular --
  await page.evaluate(() => window.game.scene.getScene('FarmScene').scene.launch('MenuScene', { pagina: 'jornal' }));
  await page.waitForFunction(() => window.game.scene.isActive('MenuScene') && window.game.scene.getScene('MenuScene').pagina === 'jornal');
  const celular = await page.evaluate(() => {
    const m = window.game.scene.getScene('MenuScene');
    return { titulo: m.titulo, secoes: m.opcoes.map(o => o.texto), manchete: m.mensagem };
  });
  assert.deepEqual(celular.secoes, ['Obras', 'Agenda', 'Tempo', 'Moradores', 'Memória', 'Circulando']);
  assert(celular.titulo.includes('Jornal'));
  await page.screenshot({ path: 'docs/evidence/jornal-semana.png' });
  await page.evaluate(() => window.game.scene.getScene('MenuScene').fechar());
  await page.waitForFunction(() => !window.game.scene.isActive('MenuScene'));

  // ------------------------------------------------------ viagem de ônibus --
  await irPara('bairro', 3, 10 * 60);
  await page.evaluate(async () => {
    const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts');
    window.estado.carteira.ganhar(2_000_00);
    window.estado.cidade.construir('ponto_onibus');
    window.estado.cidade.atribuir('ponto_onibus', PROJETOS_CIDADE.ponto_onibus.candidatos[0]);
    window.estado.dia = 3 - (window.estado.dia % 7) + 1;
    window.estado.relogio.definir(10 * 60);
  });
  await page.evaluate(async () => {
    const { PROJETOS_CIDADE } = await import('/src/game/cidade.ts');
    const f = window.game.scene.getScene('FarmScene');
    f.usarServicoCidade(PROJETOS_CIDADE.ponto_onibus);
    const ui = window.game.scene.getScene('UIScene');
    const opcao = ui.menuOpcoes.find(o => o.rotulo.includes('Centro'));
    ui.fecharMenu();
    opcao.aoEscolher();
  });
  await page.waitForFunction(() => window.game.scene.isActive('ViagemScene'));
  await page.waitForTimeout(1200);
  const viagem = await page.evaluate(() => {
    const v = window.game.scene.getScene('ViagemScene');
    return { legenda: v.legenda.text, tempo: v.tempo };
  });
  assert(viagem.legenda.length > 10, 'a janela conta o trecho');
  assert(viagem.tempo > 500);
  await page.screenshot({ path: 'docs/evidence/viagem-onibus.png' });
  // Pular a viagem chega no mesmo lugar.
  await page.keyboard.press('e');
  await page.waitForFunction(() => !window.game.scene.isActive('ViagemScene'));
  await page.waitForFunction(() => window.estado.mapa === 'farm' && window.game.scene.getScene('FarmScene').pronto);
  assert.equal(await page.evaluate(() => window.estado.mapa), 'farm');
  assert(await page.evaluate(() => Object.keys(window.estado.worldEvents.serializar().flags).some(k => k.startsWith('diario:viagem:'))));

  fs.mkdirSync('docs/evidence', { recursive: true });
  assert.deepEqual(erros, []);
  console.log('Cultura: documento recolhido, acervo, jornal, arquivo com Clara, sala de memória, rádio e viagem de ônibus passaram.');
} finally {
  await browser.close();
}

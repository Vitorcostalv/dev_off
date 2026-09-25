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
const fecharTudo = async () => {
  await avancarFalas();
  await page.evaluate(() => { const ui = window.game.scene.getScene('UIScene'); if (ui.menuAberto) ui.fecharMenu(); });
};
const conversar = (npcId) => page.evaluate(async npcId => {
  const { buscarNpc } = await import('/src/game/npcs.ts');
  const f = window.game.scene.getScene('FarmScene');
  f.abrirMenuDeConversa(buscarNpc(npcId));
  return window.game.scene.getScene('UIScene').menuOpcoes.map(o => o.rotulo);
}, npcId);
const escolher = (trecho) => page.evaluate(trecho => {
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

  // ----------------------------------------------------- banco de praça --
  await irPara('farm', 3, 15 * 60);
  const bancos = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => p.tipo === 'banco').length);
  assert(bancos >= 3, `so ${bancos} bancos no mapa do centro`);
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    const banco = f.interagiveis.find(p => p.tipo === 'banco');
    f.player.setPosition(banco.x, banco.y);
    f.alvo = banco;
    f.interagir();
  });
  await avancarFalas();
  assert(await page.evaluate(() => window.game.scene.getScene('FarmScene').sentado !== null), 'sentou no banco');
  const relogioAntes = await page.evaluate(() => window.estado.dia * 1440 + window.estado.relogio.minutos);
  await page.waitForTimeout(2500);
  const relogioDepois = await page.evaluate(() => window.estado.dia * 1440 + window.estado.relogio.minutos);
  assert(relogioDepois > relogioAntes, 'o tempo corre enquanto se está sentado');
  await page.screenshot({ path: 'docs/evidence/banco-praca.png' });
  await page.evaluate(() => window.game.scene.getScene('FarmScene').levantarDoBanco());
  assert.equal(await page.evaluate(() => window.game.scene.getScene('FarmScene').sentado), null);

  // -------------------------------------------------- caminhada com Edu --
  await page.evaluate(() => { window.estado.relacoes.ganharRelacao('edu', 8); window.estado.relacoes.ganharRelacao('alice', 8); });
  await irPara('bairro', 4, 15 * 60);
  const opcoes = await conversar('edu');
  assert(opcoes.some(o => o.includes('Caminhar um pouco')), JSON.stringify(opcoes));
  assert(opcoes.some(o => o.includes('Posso te acompanhar')));
  assert(await escolher('Caminhar um pouco'));
  await avancarFalas();
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('convivio:npc')), 'edu');
  // O morador sai da rotina e vem atrás do jogador.
  const perseguicao = await page.evaluate(async () => {
    const f = window.game.scene.getScene('FarmScene');
    const npc = window.estado.rotinasNpc.porId('edu');
    npc.x = f.player.x / f.tamanhoTile + 12;
    npc.y = f.player.y / f.tamanhoTile + 12;
    const antes = Math.hypot(npc.x - f.player.x / f.tamanhoTile, npc.y - f.player.y / f.tamanhoTile);
    for (let i = 0; i < 120; i++) f.atualizarConvivio(16);
    const depois = Math.hypot(npc.x - f.player.x / f.tamanhoTile, npc.y - f.player.y / f.tamanhoTile);
    return { antes, depois, mapa: npc.mapaAtual, dentro: npc.dentro };
  });
  assert(perseguicao.depois < perseguicao.antes - 1, `nao se aproximou: ${JSON.stringify(perseguicao)}`);
  assert.equal(perseguicao.mapa, 'bairro');
  assert.equal(perseguicao.dentro, null);
  // Atravessar um lugar novo rende a fala daquele lugar.
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.player.setPosition(39 * f.tamanhoTile, 50 * f.tamanhoTile);
    f.atualizarConvivio(16);
  });
  const falaDoLugar = await page.evaluate(() => window.game.scene.getScene('UIScene').dialogoTexto.text);
  assert(falaDoLugar.length > 0, 'a caminhada comentou o lugar');
  await avancarFalas();
  // O primeiro lugar e o patio da estacao, onde o jogador nasce no bairro.
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.estado.worldEvents.obter('convivio:lugares'))), ['estacao', 'escola']);
  const emCaminhada = await conversar('edu');
  assert(emCaminhada.some(o => o.includes('Encerrar a caminhada')));
  assert(await escolher('Encerrar a caminhada'));
  await avancarFalas();
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('convivio:npc')), '');

  // ------------------------------------------------- cozinha e refeições --
  await irPara('oficina', 5, 19 * 60);
  const domesticos = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => p.tipo === 'domestico').map(p => p.props.acao));
  assert(domesticos.includes('cozinha'), JSON.stringify(domesticos));
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.alvo = f.interagiveis.find(p => p.props.acao === 'cozinha');
    f.interagir();
  });
  const cozinha = await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.map(o => o.rotulo));
  assert(cozinha.some(o => o.includes('Comer alguma coisa')), JSON.stringify(cozinha));
  await escolher('Comer alguma coisa');
  await fecharTudo();
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('refeicao:tipo')), 'sozinho');
  // Receita aprendida numa cena de vínculo aparece na cozinha.
  await page.evaluate(() => window.estado.worldEvents.definir('vinculo:davi:1', true));
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.alvo = f.interagiveis.find(p => p.props.acao === 'cozinha');
    f.interagir();
  });
  const comReceita = await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.map(o => o.rotulo));
  assert(comReceita.some(o => o.includes('Fazer: Pão de Davi')), JSON.stringify(comReceita));
  await fecharTudo();

  // --------------------------------------------------- oficina no celular --
  await page.evaluate(() => window.game.scene.getScene('FarmScene').scene.launch('MenuScene', { pagina: 'oficina' }));
  await page.waitForFunction(() => window.game.scene.isActive('MenuScene') && window.game.scene.getScene('MenuScene').pagina === 'oficina');
  const oficina = await page.evaluate(() => {
    const m = window.game.scene.getScene('MenuScene');
    return { opcoes: m.opcoes.map(o => o.texto), mensagem: m.mensagem };
  });
  assert(oficina.opcoes.some(o => o.includes('Contratos por dia: 3')), JSON.stringify(oficina.opcoes));
  assert(oficina.opcoes.some(o => o.includes('dia livre')));
  assert(oficina.mensagem.includes('sem histórico'));
  await page.evaluate(() => {
    const m = window.game.scene.getScene('MenuScene');
    m.opcoes.find(o => o.texto.includes('Contratos por dia')).ajustar(-1);
  });
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('oficina:carga')), 2);
  await page.evaluate(() => {
    const m = window.game.scene.getScene('MenuScene');
    m.opcoes.find(o => o.texto.includes('Declarar hoje')).executar();
  });
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('oficina:folga')), 5);
  await page.screenshot({ path: 'docs/evidence/oficina-reputacao.png' });
  await page.evaluate(() => window.game.scene.getScene('MenuScene').fechar());
  await page.waitForFunction(() => !window.game.scene.isActive('MenuScene'));

  // ------------------------------------------- inspeção antes do conserto --
  // Com o dia livre declarado o quadro fecha; desfazer devolve as vagas.
  await page.evaluate(() => window.game.scene.getScene('UIScene').abrirComputador());
  await page.waitForFunction(() => window.game.scene.isActive('ComputadorScene'));
  const abrirTrabalho = async () => page.evaluate(() => {
    const pc = window.game.scene.getScene('ComputadorScene');
    const indice = pc.apps.findIndex(a => a.id === 'trabalho');
    pc.cursor = indice;
    pc.abrirApp(indice);
    return pc.janela.app.vagas.length;
  });
  assert.equal(await abrirTrabalho(), 0, 'dia livre fecha o quadro');
  await page.evaluate(async () => {
    const { desfazerDiaLivre } = await import('/src/game/oficina.ts');
    desfazerDiaLivre(window.estado);
  });
  const vagas = await abrirTrabalho();
  assert(vagas >= 5, `quadro voltou com ${vagas} vagas`);
  const inspecao = await page.evaluate(() => {
    const app = window.game.scene.getScene('ComputadorScene').janela.app;
    const indice = app.vagas.findIndex(v => v.tipo === 'conserto');
    app.selecionar(indice);
    app.acionarVaga();
    return app.minigame?.constructor.name;
  });
  assert.equal(inspecao, 'InspecaoConserto', 'o conserto começa pela inspeção');
  await page.screenshot({ path: 'docs/evidence/oficina-inspecao.png' });
  const depoisDaInspecao = await page.evaluate(() => {
    const app = window.game.scene.getScene('ComputadorScene').janela.app;
    app.minigame.aoTeclar({ key: '1' });
    const noPreco = app.minigame.constructor.name;
    app.minigame.aoTeclar({ key: '2' });
    return { noPreco, agora: app.minigame?.constructor.name, inspecao: app.inspecao?.preco };
  });
  assert.equal(depoisDaInspecao.noPreco, 'InspecaoConserto');
  assert.equal(depoisDaInspecao.agora, 'QuebraCabecaConserto', 'depois do preço vem o quebra-cabeça');
  assert.equal(depoisDaInspecao.inspecao, 'justo');
  // Terminar o conserto registra reputação, visita do cliente e carga do dia.
  const fim = await page.evaluate(() => {
    const app = window.game.scene.getScene('ComputadorScene').janela.app;
    const jogo = app.minigame;
    jogo.aoTeclar({ key: 'e' });
    // O mesmo gesto do jogador: pegar a peca, levar ate o slot e soltar.
    jogo.pecas.forEach(p => {
      const slot = jogo.slots.find(s => s.indice === p.indice);
      if (!slot) return;
      jogo.aoComecarArraste({}, p.imagem);
      p.imagem.setPosition(slot.x, slot.y);
      jogo.aoSoltar({}, p.imagem);
    });
    return { acertos: jogo.acertos, servicos: window.estado.worldEvents.obter('oficina:servicos') };
  });
  assert(fim.acertos >= 1, 'encaixou peças');
  assert.equal(fim.servicos, 1, 'o serviço entrou na reputação');
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('oficina:hoje')), 1);
  const reputacao = await page.evaluate(async () => {
    const { reputacao, visitasDoCliente, CLIENTES } = await import('/src/game/oficina.ts');
    return {
      r: reputacao(window.estado),
      visitas: CLIENTES.map(c => visitasDoCliente(window.estado, c.id)).reduce((a, b) => a + b, 0),
    };
  });
  assert.equal(reputacao.r.servicos, 1);
  assert.equal(reputacao.visitas, 1, 'o cliente recorrente registrou a visita');
  fs.mkdirSync('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/oficina-conserto.png' });

  assert.deepEqual(erros, []);
  console.log('Oficina e convivência: banco, caminhada com Edu, cozinha, painel da oficina, inspeção e reputação passaram.');
} finally {
  await browser.close();
}

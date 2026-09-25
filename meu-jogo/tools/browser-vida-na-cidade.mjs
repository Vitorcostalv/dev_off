import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(120000);
const erros = [];
page.on('pageerror', e => erros.push(e.message));

const irPara = async (mapa, dia, minuto, clima) => {
  await page.evaluate(({ mapa, dia, minuto, clima }) => {
    const f = window.game.scene.getScene('FarmScene');
    f.suspenderCampanha(true);
    window.estado.dia = dia;
    window.estado.relogio.definir(minuto);
    if (clima) window.estado.clima.definir(dia, clima);
    f.scene.restart({ mapa });
  }, { mapa, dia, minuto, clima });
  await page.waitForFunction(mapa => window.estado.mapa === mapa && window.game.scene.getScene('FarmScene').pronto, mapa);
  await page.evaluate(() => window.game.scene.getScene('FarmScene').suspenderCampanha(true));
  await page.waitForTimeout(320);
  await page.waitForFunction(mapa => window.estado.mapa === mapa && window.game.scene.getScene('FarmScene').pronto, mapa);
};
const usar = (acao) => page.evaluate(acao => {
  const f = window.game.scene.getScene('FarmScene');
  f.alvo = f.interagiveis.find(p => p.props.acao === acao);
  f.interagir();
}, acao);
const usarBicho = (filtro) => page.evaluate(filtro => {
  const f = window.game.scene.getScene('FarmScene');
  f.alvo = f.interagiveis.find(p => p.tipo === 'bicho' && (filtro === 'qualquer' ? p.props.presente : p.id === filtro));
  if (!f.alvo) return false;
  f.interagir();
  return true;
}, filtro);
const avancarFalas = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  let guarda = 0;
  while (ui.dialogoAberto && guarda++ < 40) ui.avancarDialogo();
});
const fecharTudo = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  let guarda = 0;
  while (ui.dialogoAberto && guarda++ < 40) ui.avancarDialogo();
  if (ui.menuAberto) ui.fecharMenu();
});

try {
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5190');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto);
  // O prologo tem suite propria; aqui ele sai da frente sem ser reescrito.
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.suspenderCampanha(true);
    window.game.scene.stop('PrologoScene');
    window.game.scene.stop('CampanhaScene');
    window.estado.worldEvents.definir('prologo:explorado', true);
  });
  // A campanha tem suite propria. Sem marcar as cenas como vistas, cada troca de
  // dia reabre uma cena e reinicia a FarmScene no meio das conferencias.
  await page.evaluate(async () => {
    const { CENAS_CAMPANHA } = await import('/src/game/campanha.ts');
    for (const cena of CENAS_CAMPANHA) window.estado.worldEvents.definir(`campanha:cena:${cena.id}`, true);
  });

  // ------------------------------------------------- companhia: tres dias --
  for (const dia of [0, 1, 2]) {
    await irPara('rural', dia, 10 * 60, 'Limpo');
    assert(await usarBicho('bicho:pretendente'), `pretendente ausente no dia ${dia}`);
    await avancarFalas();
  }
  const nomes = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    return ui.menuOpcoes.map(o => o.rotulo);
  });
  assert.deepEqual(nomes.slice(0, 3), ['Lasca', 'Pino', 'Vento']);
  await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes[0].aoEscolher());
  await fecharTudo();
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('companhia:nome')), 'Lasca');

  // ------------------------------------------- tigela e sono dentro de casa --
  await irPara('oficina', 3, 9 * 60, 'Limpo');
  const pontos = await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.filter(p => p.tipo === 'domestico').map(p => p.props.acao));
  assert.equal(pontos.length, 11, 'com bicho em casa a tigela entra');
  assert(pontos.includes('tigela'));
  await usar('tigela');
  await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes[0].aoEscolher());
  await fecharTudo();
  assert.equal(await page.evaluate(() => window.estado.worldEvents.obter('companhia:comeu')), 3);
  assert.equal(await page.evaluate(() => window.game.scene.getScene('FarmScene').interagiveis.some(p => p.id === 'bicho:companhia' && p.props.presente)), true);

  // ------------------------------- companhia espera parte do caminho na rua --
  await irPara('bairro', 3, 10 * 60, 'Limpo');
  const longe = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    const alvo = f.interagiveis.find(p => p.id === 'bicho:companhia');
    const tile = f.tamanhoTile;
    // Posicao fingida: mover o player de verdade para longe encostaria numa
    // borda de mapa e a cena trocaria de mapa no meio da conferencia.
    const jogador = { x: 60 * tile, y: 80 * tile };
    for (let i = 0; i < 60; i++) f.bichos.atualizar(16, 'bairro', 600, 'Limpo', 0, jogador, false);
    const porta = { x: 80 * tile, y: 39 * tile };
    return { distanciaDaPorta: Math.hypot(alvo.x - porta.x, alvo.y - porta.y) / tile, presente: alvo.props.presente };
  });
  assert.equal(longe.presente, true);
  assert(longe.distanciaDaPorta <= 14.5, `parou a ${longe.distanciaDaPorta} tiles da porta`);
  assert(longe.distanciaDaPorta >= 10, 'acompanhou o trecho antes de parar');

  // ------------------------------------------ fauna: tres encontros e nome --
  // Em um dia de cada quatro o bicho nao esta no ponto dele; 5, 6 e 7 sao dias em que esta.
  for (const dia of [5, 6, 7]) {
    await irPara('bairro', dia, 15 * 60, 'Limpo');
    await page.evaluate(() => {
      const f = window.game.scene.getScene('FarmScene');
      f.bichos.atualizar(16, 'bairro', 900, 'Limpo', 0, f.player, false);
    });
    const achou = await usarBicho('bicho:gato_escola');
    assert(achou, `gato ausente no dia ${dia}`);
    await fecharTudo();
  }
  const gato = await page.evaluate(async () => {
    const { FAUNA, nomeConhecido, encontros } = await import('/src/game/fauna.ts');
    const animal = FAUNA.find(a => a.id === 'gato_escola');
    return { nome: nomeConhecido(window.estado, animal), vezes: encontros(window.estado, animal.id) };
  });
  assert.equal(gato.vezes, 3);
  assert.equal(gato.nome, 'Régua');
  // Sapo aparece na chuva e some no tempo seco, no mesmo horario.
  const sapos = await page.evaluate(async () => {
    const { faunaDoMomento } = await import('/src/game/fauna.ts');
    return {
      chuva: faunaDoMomento('bairro', 8, 22 * 60, 'Chuva', 0).some(a => a.especie === 'sapo'),
      seco: faunaDoMomento('bairro', 8, 22 * 60, 'Limpo', 0).some(a => a.especie === 'sapo'),
    };
  });
  assert.deepEqual(sapos, { chuva: true, seco: false });
  fs.mkdirSync('docs/evidence', { recursive: true });
  await irPara('bairro', 6, 15 * 60, 'Limpo');
  // A evidencia visual precisa do jogador PERTO dos bichos: sem isso a camera
  // fica na porta de casa e a foto nao mostra nada do que foi conferido.
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    const tile = f.tamanhoTile;
    // A camera segue o jogador: para a foto mostrar o gato do muro da escola,
    // quem se aproxima e o proprio jogador, num ponto interno do bairro.
    f.player.setPosition(40 * tile, 52 * tile);
    for (let i = 0; i < 60; i++) f.bichos.atualizar(16, 'bairro', 900, 'Limpo', 0, f.player, false);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/evidence/fauna-e-companhia.png' });

  // ------------------------------------------------ armario e espelho --
  await page.evaluate(() => {
    const f = window.estado.worldEvents;
    f.definir('visual:chuva:bairro', 120);
    f.definir('campanha:cena:oficina', true);
    f.definir('campanha:profundidade', 3);
    f.definir('vinculo:jaqueline:2', true);
  });
  await irPara('oficina', 90, 9 * 60, 'Frio');
  await usar('armario');
  const roupas = await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.map(o => o.rotulo));
  for (const nome of ['Roupa de todo dia', 'Capa de chuva', 'Agasalho de inverno', 'Roupa de oficina', 'Roupa da represa']) {
    assert(roupas.some(r => r.includes(nome)), nome);
  }
  assert(roupas.some(r => r.includes('Cachecol de Jaqueline')));
  await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    ui.menuOpcoes.find(o => o.rotulo.includes('inverno')).aoEscolher();
  });
  await fecharTudo();
  assert.equal(await page.evaluate(async () => {
    const { conjuntoAtual } = await import('/src/game/guardaRoupa.ts');
    return conjuntoAtual(window.estado).id;
  }), 'inverno');
  // Cabelo e barba no estagio 2 depois de 90 dias; cuidar zera os dois.
  await usar('espelho');
  await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    let guarda = 0;
    while (ui.dialogoAberto && guarda++ < 10) ui.avancarDialogo();
  });
  const opcoesEspelho = await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes.map(o => o.rotulo));
  assert.deepEqual(opcoesEspelho, ['Cortar o cabelo', 'Fazer a barba', 'Cuidar dos dois', 'Deixar como está']);
  await page.evaluate(() => window.game.scene.getScene('UIScene').menuOpcoes[2].aoEscolher());
  await fecharTudo();
  assert.deepEqual(await page.evaluate(async () => {
    const { crescimento } = await import('/src/game/guardaRoupa.ts');
    return crescimento(window.estado);
  }), { cabelo: 0, barba: 0 });

  // ---------------------------------------------------------- aniversários --
  const conversa = await page.evaluate(async () => {
    const { buscarNpc } = await import('/src/game/npcs.ts');
    const f = window.game.scene.getScene('FarmScene'), ui = window.game.scene.getScene('UIScene');
    window.estado.relacoes.ganharRelacao('edu', 8);
    f.abrirMenuDeConversa(buscarNpc('edu'));
    const opcao = ui.menuOpcoes.find(o => o.rotulo.startsWith('Contar quando'));
    if (!opcao) return 'ausente';
    opcao.aoEscolher();
    let guarda = 0;
    while (ui.dialogoAberto && guarda++ < 10) ui.avancarDialogo();
    return window.estado.worldEvents.ativa('aniversario:sabe:edu');
  });
  assert.equal(conversa, true);
  await fecharTudo();
  // 20 de Outono do ano seguinte: Edu lembra e alguém bate na porta.
  await irPara('oficina', 2 * 28 + 19 + 112, 10 * 60, 'Limpo');
  await page.waitForFunction(() => window.game.scene.getScene('UIScene').dialogoAberto);
  const visita = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const nome = ui.dialogoNome.text;
    let guarda = 0;
    while (ui.dialogoAberto && guarda++ < 10) ui.avancarDialogo();
    return nome;
  });
  assert.equal(visita, 'Edu');
  assert(await page.evaluate(() => Object.keys(window.estado.worldEvents.serializar().flags).some(k => k.startsWith('aniversario:visita:'))));
  await page.screenshot({ path: 'docs/evidence/aniversario-visita.png' });
  // O calendário do celular marca a data do protagonista e a de quem ele conhece.
  await page.evaluate(() => window.game.scene.getScene('FarmScene').scene.launch('MenuScene', { pagina: 'calendario' }));
  await page.waitForFunction(() => window.game.scene.isActive('MenuScene') && window.game.scene.getScene('MenuScene').pagina === 'calendario');
  const calendario = await page.evaluate(() => window.game.scene.getScene('MenuScene').raiz.list.filter(o => o.type === 'Text').map(t => t.text));
  assert(calendario.some(t => t.includes('+')), 'o dia do protagonista aparece marcado');
  assert(calendario.some(t => t.includes('meu aniversário')), 'a legenda do dia aparece');
  await page.screenshot({ path: 'docs/evidence/calendario-aniversarios.png' });

  // Recarregar preserva bicho, roupa, aparência e aniversários.
  await page.reload();
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto);
  const depois = await page.evaluate(async () => {
    const { companhia } = await import('/src/game/companhia.ts');
    const { conjuntoAtual, pecaAtual } = await import('/src/game/guardaRoupa.ts');
    const { sabeDoMeuAniversario } = await import('/src/game/aniversarios.ts');
    return {
      bicho: companhia(window.estado)?.nome ?? null,
      roupa: conjuntoAtual(window.estado).id,
      peca: pecaAtual(window.estado)?.id ?? null,
      sabe: sabeDoMeuAniversario(window.estado, 'edu'),
    };
  });
  assert.equal(depois.bicho, 'Lasca');
  assert.equal(depois.roupa, 'inverno');
  assert.equal(depois.sabe, true);
  assert.deepEqual(erros, []);
  console.log('Vida na cidade: adoção em três dias, tigela, espera na rua, fauna com nome, armário, espelho, aniversário e recarga passaram.');
} finally {
  await browser.close();
}

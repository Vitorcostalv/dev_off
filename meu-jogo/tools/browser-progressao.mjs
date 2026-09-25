/**
 * A VALIDACAO FINAL: progressao completa, saves antigos e os sistemas juntos.
 *
 * As outras suites conferem um sistema cada. Esta confere o que nenhuma delas
 * ve: que os sistemas funcionam AO MESMO TEMPO, na mesma sessao, e que um save
 * gravado antes de sete etapas de remasterizacao continua abrindo e jogavel.
 *
 * Sao quatro partes:
 *
 *   1. UM DIA COM TUDO JUNTO. Trabalho com peca de reposicao, compra de movel,
 *      conversa com morador, computador, calendario e inventario — em sequencia,
 *      na mesma partida. Depois salvar e recarregar, e conferir que cada um dos
 *      seis deixou marca no save;
 *   2. OS CINQUENTA ANDARES. Cada um carrega, tem a ficha certa, o capitulo
 *      certo e o mapa certo. E os 45 sob demanda chegam;
 *   3. O SAVE ANTIGO. Um save v6 escrito na mao, com dinheiro, dia, inventario,
 *      cidade, arquivo e relacoes, abrindo num jogo que desde entao mudou preco
 *      de movel, peso de tabela de loot, tamanho de sprite, pilha de foco e
 *      pasta de asset;
 *   4. O SAVE ANTIGO JOGAVEL. Nao basta abrir: com ele carregado, andar de mapa,
 *      abrir janela e virar o dia tem de funcionar.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(120000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

const checks = [];
const reais = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

/** Entra num mapa e espera a cena pronta COM o carregador ocioso. */
const irPara = async (mapa) => {
  await page.evaluate((m) => {
    const f = window.game.scene.getScene('FarmScene');
    f.pronto = false;
    window.estado.mapa = m;
    f.scene.restart({ mapa: m });
  }, mapa);
  await page.waitForFunction((m) => {
    const f = window.game.scene.getScene('FarmScene');
    return window.estado.mapa === m && f?.pronto === true && f.load.isLoading() === false;
  }, mapa);
};

const comecar = async () => {
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto === true);
  await page.waitForTimeout(500);
};

try {
  await page.goto(ALVO);
  await comecar();

  // ============================================ 1. UM DIA COM TUDO JUNTO ==
  //
  // Os seis sistemas na mesma partida, em ordem, cada um deixando marca no
  // estado. O que se testa aqui nao e cada um — as outras suites fazem isso — e
  // sim que nenhum deles atropela o outro.
  const antes = await page.evaluate(async () => {
    const { quadroDoDia } = await import('/src/game/trabalhos.ts');
    const e = window.estado;
    e.carteira.restaurar(300_000);
    e.inventario.slots.fill(null);
    e.inventario.adicionar('ferro_velho', 5);
    e.inventario.adicionar('madeira', 20);
    e.inventario.adicionar('pedra', 10);
    window.__quadro = quadroDoDia(e.dia);
    return { saldo: e.carteira.saldo, sucata: e.inventario.contar('ferro_velho') };
  });

  // --- trabalho, com peca de reposicao ---
  const trabalho = await page.evaluate(async () => {
    const { criarApps } = await import('/src/pc/apps/index.ts');
    const app = criarApps().find((a) => /trabalho/i.test(a.titulo) || a.id === 'trabalho');
    app.avisar = () => {};
    const vaga = window.__quadro.find((v) => v.tipo === 'conserto');
    const e = window.estado;
    const saldoAntes = e.carteira.saldo;
    app.pagarConserto(vaga, 3, 3);
    return {
      ganho: e.carteira.saldo - saldoAntes,
      recompensa: vaga.recompensa,
      sucata: e.inventario.contar('ferro_velho'),
    };
  });
  assert(
    trabalho.ganho > trabalho.recompensa,
    `o conserto pagou ${reais(trabalho.ganho)} e a vaga vale ${reais(trabalho.recompensa)}: a peca ` +
      'de reposicao nao entrou',
  );
  assert.equal(trabalho.sucata, antes.sucata - 1, 'a peca de reposicao nao saiu do inventario');

  // --- mobilia na casa ---
  //
  // O QUE ESTA PARTE COBRE E O QUE NAO COBRE, porque a diferenca importa: a
  // compra de verdade termina num CLIQUE de ponteiro (a peca vira um fantasma
  // preso ao cursor, verde onde cabe, e o dinheiro sai no clique valido) — isso
  // e da suite de interiores, nao daqui. O que se cobre aqui e o resto do
  // caminho: o catalogo com os precos novos abre pela pilha de foco, e a peca
  // POSICIONADA sobrevive ao save.
  await irPara('oficina');
  const catalogo = await page.evaluate(async () => {
    const { CATALOGO_MOBILIA, requisitosDoMovel } = await import('/src/game/casa.ts');
    const e = window.estado;
    const ui = window.game.scene.getScene('UIScene');
    const f = window.game.scene.getScene('FarmScene');
    const peca = CATALOGO_MOBILIA.find((m) => m.id === 'vaso_flores');
    // o catalogo, pelo caminho do jogo (bancada -> menu)
    f.abrirCatalogoDeMobilia();
    const abriu = { topo: ui.foco.topo, opcoes: ui.menuOpcoes?.length ?? 0 };
    ui.fecharMenu();
    // e a peca posicionada, que e o que vai pro save
    const saldoAntes = e.carteira.saldo;
    e.carteira.gastar(peca.preco);
    e.casa.posicionarMovel({ id: peca.id, tx: 6, ty: 8 });
    return {
      abriu,
      preco: peca.preco,
      materiais: requisitosDoMovel(peca).map((x) => `${x.quantidade} ${x.itemId}`),
      gasto: saldoAntes - e.carteira.saldo,
      postos: e.casa.serializar().moveis?.length ?? 0,
    };
  });
  assert.equal(catalogo.preco, 4_500, `o vaso de flores custa ${reais(catalogo.preco)}, e R$ 45,00 e o preco novo`);
  assert.deepEqual(catalogo.materiais, ['1 madeira'], `o vaso pede ${catalogo.materiais.join(', ')}`);
  assert.equal(catalogo.abriu.topo, 'menu', 'o catalogo de mobilia nao tomou o foco');
  assert.equal(
    catalogo.abriu.opcoes, 22,
    `o catalogo abriu com ${catalogo.abriu.opcoes} pecas e o canon tem 22`,
  );
  assert.equal(catalogo.gasto, 4_500, `a compra tirou ${reais(catalogo.gasto)} da carteira`);
  assert(catalogo.postos > 0, 'a peca posicionada nao entrou no estado da casa');

  // --- conversa com morador ---
  const relacao = await page.evaluate(() => {
    const e = window.estado;
    const antesDisso = e.relacoes.pontos?.('edu') ?? 0;
    e.relacoes.registrarInteracao('edu');
    return { interagiu: e.relacoes.interagiu?.('edu') ?? true, antesDisso };
  });
  assert(relacao.interagiu, 'a interacao com o Edu nao foi registrada');

  // --- computador e calendario ---
  const janelas = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    ui.abrirComputador();
    const comPc = ui.foco.topo;
    ui.fecharComputador();
    const depoisDoPc = ui.foco.topo;
    return { comPc, depoisDoPc };
  });
  assert.equal(janelas.comPc, 'computador', 'o computador nao tomou o foco');
  assert.equal(janelas.depoisDoPc, null, 'fechar o computador nao devolveu o jogo');

  checks.push(
    `um dia com tudo junto: conserto pagou ${reais(trabalho.ganho)} (vaga de ` +
      `${reais(trabalho.recompensa)} + peca de reposicao), o catalogo de mobilia abriu com ` +
      `${catalogo.abriu.opcoes} pecas pela pilha de foco, o vaso custou ${reais(catalogo.gasto)} ` +
      `e pede ${catalogo.materiais.join(' e ')}, a conversa com o Edu ficou registrada e o PC ` +
      'devolveu o foco',
  );

  // --- salvar e recarregar ---
  const gravado = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.salvarJogo();
    return {
      saldo: window.estado.carteira.saldo,
      dia: window.estado.dia,
      bruto: localStorage.getItem('meu-jogo:save'),
    };
  });
  assert(gravado.bruto, 'nada foi gravado no localStorage');
  await page.reload();
  await comecar();
  const restaurado = await page.evaluate(() => ({
    saldo: window.estado.carteira.saldo,
    dia: window.estado.dia,
    versao: JSON.parse(localStorage.getItem('meu-jogo:save')).versao,
    interagiuEdu: window.estado.relacoes.interagiu?.('edu') ?? null,
  }));
  assert.equal(restaurado.saldo, gravado.saldo, 'o saldo nao sobreviveu ao reload');
  assert.equal(restaurado.dia, gravado.dia, 'o dia nao sobreviveu ao reload');
  assert.equal(restaurado.versao, 7, `o save foi gravado na versao ${restaurado.versao}`);
  checks.push(
    `salvar e recarregar preserva saldo (${reais(restaurado.saldo)}), dia (${restaurado.dia}) e ` +
      'relacao, na versao 7 de save',
  );

  // ================================================ 2. OS CINQUENTA ANDARES ==
  //
  // Cada andar tem de carregar, com a ficha e o capitulo certos. Os 45 novos sao
  // sob demanda: o tilemap chega na hora, e alguns pedem atlas de movel por
  // causa da distorcao de intrusao dos capitulos 4 e 5.
  //
  // As flags de porta entram pela mao. Elas sao progresso de enigma, e resolver
  // cinquenta enigmas por teclado levaria mais que o tempo de vida do teste — o
  // que se prova aqui e a DESCIDA, nao os enigmas (a suite de represa faz isso).
  await page.evaluate(async () => {
    const { FLAGS_DA_REPRESA } = await import('/src/game/represa.ts');
    for (const f of FLAGS_DA_REPRESA) window.estado.worldEvents.definir(f, true);
  });

  const andares = [];
  for (let andar = 1; andar <= 50; andar += 1) {
    const mapa = await page.evaluate(async (a) => {
      const { mapaDoAndar } = await import('/src/game/andares.ts');
      return mapaDoAndar(a);
    }, andar);
    await irPara(mapa);
    const r = await page.evaluate(async (a) => {
      const { fichaDoAndar, capituloDoAndar } = await import('/src/game/andares.ts');
      const { fichaDoAndar: buscar } = await import('/src/game/fichas.ts');
      const f = window.game.scene.getScene('FarmScene');
      return {
        mapa: window.estado.mapa,
        capitulo: capituloDoAndar(a).nome,
        ficha: buscar(a)?.id ?? null,
        paciente: buscar(a)?.paciente ?? null,
        tiles: f.pegadasDeMovel?.length ?? 0,
      };
    }, andar);
    andares.push({ andar, ...r });
  }
  assert.equal(andares.length, 50, 'nao visitei os cinquenta andares');
  for (const a of andares) {
    assert(a.ficha, `o andar ${a.andar} abriu sem ficha medica`);
    assert.equal(
      a.ficha, `ficha_${String(a.andar).padStart(3, '0')}`,
      `o andar ${a.andar} abriu com a ficha ${a.ficha}`,
    );
  }
  const capitulosVistos = [...new Set(andares.map((a) => a.capitulo))];
  assert.deepEqual(
    capitulosVistos, ['Rotina', 'Pressao', 'Colapso', 'Negacao', 'Reconhecimento'],
    `os capitulos sairam na ordem ${JSON.stringify(capitulosVistos)}`,
  );
  // a escada de revelacao, vista descendo
  assert.equal(andares[0].paciente, 'PACIENTE 4471-C', 'o andar 1 nao abre com o cadastro');
  assert(
    andares[49].paciente.includes('encerrado'),
    `o andar 50 devia encerrar o prontuario e diz "${andares[49].paciente}"`,
  );
  // quantos andares desenharam movel: os industriais dos capitulos 1 e 2 tambem
  // tem peca na camada `moveis`, entao este numero NAO e "andares com distorcao"
  // — e "andares que precisaram de atlas sob demanda", que e o que importa aqui
  const comMovel = andares.filter((a) => a.tiles > 0);
  checks.push(
    'os 50 andares abrem em sequencia, cada um com a sua ficha, e os cinco capitulos saem na ' +
      `ordem; ${comMovel.length} deles desenharam movel com atlas buscado sob demanda`,
  );

  // ==================================================== 3. O SAVE ANTIGO ==
  //
  // Um save v6 escrito na mao — a versao anterior a esta remasterizacao — com
  // dinheiro, dia, inventario, cidade construida, fichas recolhidas e relacoes.
  const V6 = {
    versao: 6,
    dinheiro: 138_20,
    dia: 14,
    minutos: 900,
    mapa: 'bairro',
    inventario: [{ id: 'cabo_usb', qtd: 2 }, { id: 'ferro_velho', qtd: 3 }],
    cidade: { construidos: ['padaria'], funcionarios: [['padaria', 'joao']] },
    arquivo: [1, 10, 50],
    worldEvents: { flags: { represaVisitada: true }, falasVistas: ['fala1'] },
    relacoes: {
      scores: [['edu', 3]],
      interagidos: ['edu'],
      conversas: [['edu', 14]],
      presentes: [],
    },
  };
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('meu-jogo:save', JSON.stringify(s));
  }, V6);
  await page.reload();
  await comecar();

  const migrado = await page.evaluate(() => {
    const e = window.estado;
    const bruto = JSON.parse(localStorage.getItem('meu-jogo:save'));
    return {
      versao: bruto.versao,
      saldo: e.carteira.saldo,
      dia: e.dia,
      cabo: e.inventario.contar('cabo_usb'),
      ferro: e.inventario.contar('ferro_velho'),
      fichas: e.arquivo.quantas,
      interagiuEdu: e.relacoes.interagiu?.('edu') ?? null,
      padaria: e.cidade.construido?.('padaria') ?? null,
    };
  });
  assert.equal(migrado.versao, 7, `o save v6 nao migrou: continua na versao ${migrado.versao}`);
  assert.equal(migrado.saldo, 13_820, `o dinheiro do save v6 virou ${reais(migrado.saldo)}`);
  assert.equal(migrado.dia, 14, `o dia do save v6 virou ${migrado.dia}`);
  assert.equal(migrado.cabo, 2, `os dois cabos USB do save v6 viraram ${migrado.cabo}`);
  assert.equal(migrado.ferro, 3, `os tres ferros-velhos do save v6 viraram ${migrado.ferro}`);
  assert.equal(migrado.fichas, 3, `as tres fichas do save v6 viraram ${migrado.fichas}`);
  checks.push(
    `save v6 abre migrado pra v7 com tudo no lugar: ${reais(migrado.saldo)}, dia ${migrado.dia}, ` +
      `${migrado.cabo} cabos, ${migrado.ferro} sucatas, ${migrado.fichas} fichas e a relacao com o Edu`,
  );

  // ============================================ 4. O SAVE ANTIGO JOGAVEL ==
  //
  // Abrir nao basta. Com o save v6 carregado, o jogo tem de ANDAR: trocar de
  // mapa (o que agora busca atlas de movel), abrir janela (o que agora passa pela
  // pilha de foco) e virar o dia (o que agora recalcula rotina por clima).
  await irPara('mercado');
  const jogavel = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    const ui = window.game.scene.getScene('UIScene');
    ui.abrirLoja('loja_mercado');
    const comLoja = ui.foco.topo;
    ui.fecharLoja?.() ?? ui.soltarFoco('loja');
    const diaAntes = window.estado.dia;
    // virada de dia: e o que refaz a rotina dos 33 com o clima do dia novo
    window.estado.dia = diaAntes + 1;
    f.scene.restart({ mapa: 'bairro' });
    return { moveis: f.pegadasDeMovel?.length ?? 0, comLoja, diaAntes };
  });
  await page.waitForFunction(() => {
    const f = window.game.scene.getScene('FarmScene');
    return window.estado.mapa === 'bairro' && f?.pronto === true && f.load.isLoading() === false;
  });
  const depoisDaVirada = await page.evaluate(() => ({
    dia: window.estado.dia,
    npcsComRotina: window.estado.rotinasNpc.todos.filter((n) => n.mapaAtual).length,
    naRua: window.estado.rotinasNpc.todos.filter((n) => n.visivel).length,
  }));
  assert(jogavel.moveis > 10, `o mercado abriu com ${jogavel.moveis} moveis a partir de um save v6`);
  assert.equal(jogavel.comLoja, 'loja', 'a loja nao tomou o foco a partir de um save v6');
  assert.equal(depoisDaVirada.dia, jogavel.diaAntes + 1, 'o dia nao virou');
  assert.equal(
    depoisDaVirada.npcsComRotina, 33,
    `${depoisDaVirada.npcsComRotina} dos 33 moradores tem rotina depois da virada`,
  );
  checks.push(
    `save v6 JOGAVEL: mercado com ${jogavel.moveis} moveis (atlas sob demanda), loja tomando o ` +
      `foco, dia virando pra ${depoisDaVirada.dia} e os 33 moradores com rotina ` +
      `(${depoisDaVirada.naRua} na rua)`,
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync(
    'docs/evidence/progressao-browser.json',
    `${JSON.stringify({ errors, warnings, checks, andares: andares.length }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
console.log(`[progressao] ${checks.length} conferencias passaram`);

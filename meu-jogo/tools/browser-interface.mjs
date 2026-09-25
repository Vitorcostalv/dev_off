/**
 * A pilha de foco e a moldura padrao vistas no jogo, e nao no fonte.
 *
 * O validador offline (`verificar-interface`) prova que a pilha se comporta em
 * 160 sequencias de abertura e que nenhuma tela escreve tamanho ou cor crua.
 * Nada disso prova que a TECLA chega na janela certa: pra isso a UIScene tem de
 * estar de pe, com o teclado de verdade e as janelas abrindo do jeito que o
 * jogo abre.
 *
 * Sao seis perguntas:
 *
 *   1. o menu de assunto recebe o E no PRIMEIRO aperto (era o bug: o retrato de
 *      quem fala abre por baixo do menu, e a ordem escrita a mao mandava a tecla
 *      pro retrato — o primeiro E apagava a foto em vez de escolher o tema);
 *   2. ESC com pergunta aberta sobre um menu fecha a PERGUNTA (a ordem antiga
 *      cancelava o menu de tras e deixava a pergunta na tela sem dono);
 *   3. duas janelas de conteudo nunca ficam abertas juntas;
 *   4. nada abre por cima de uma pergunta;
 *   5. fechar a janela do topo devolve o teclado pra de baixo, e o jogo so volta
 *      a andar quando a pilha esvazia;
 *   6. a moldura das janelas tem a mesma cor de borda, medida no pixel.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lerPng, pixel as pixelDe } from './imagem.mjs';

const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(30000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

const checks = [];
/** O estado da pilha, do lado do jogo. */
const foco = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  return { abertas: [...ui.foco.abertas], topo: ui.foco.topo, bloqueado: ui.bloqueado };
});
const limpar = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  for (const j of [...ui.foco.abertas].reverse()) ui.soltarFoco(j);
});

const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'interface-'));
let contador = 0;
/**
 * A cor do pixel (x, y) EM COORDENADA LOGICA (480x270).
 *
 * O canvas do navegador e um multiplo inteiro da tela logica, entao a conversao
 * e uma multiplicacao — e o `+1` pega o centro do pixel logico em vez do canto,
 * onde o arredondamento do canvas pode cair no vizinho.
 */
const corLogica = async (x, y) => {
  const arquivo = path.join(temporario, `i${contador++}.png`);
  await page.locator('canvas').screenshot({ path: arquivo });
  const img = lerPng(arquivo);
  const escala = Math.round(img.w / 480);
  const [r, g, b] = pixelDe(img, x * escala + 1, y * escala + 1);
  return (r << 16) | (g << 8) | b;
};

try {
  await page.goto(ALVO);
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto === true);
  await page.waitForTimeout(600);

  // ------------------------------------------- 1. o menu de assunto pega o E
  //
  // Aberto do jeito que a FarmScene abre pra falar com um morador: com `npcId`,
  // que poe o retrato de quem fala POR BAIXO do menu.
  await page.evaluate(() => {
    window.__escolhido = 0;
    const ui = window.game.scene.getScene('UIScene');
    ui.abrirMenu(
      'Falar com Alice',
      [
        { rotulo: 'Sobre o dia', aoEscolher: () => { window.__escolhido += 1; } },
        { rotulo: 'Sobre a represa', aoEscolher: () => { window.__escolhido += 100; } },
      ],
      undefined,
      'alice',
    );
  });
  await page.waitForTimeout(200);
  const comMenu = await foco();
  assert.deepEqual(
    comMenu.abertas, ['dialogo', 'menu'],
    `o retrato tinha de estar aberto por baixo do menu: ${JSON.stringify(comMenu)}`,
  );
  assert.equal(comMenu.topo, 'menu', 'o menu tinha de estar com o teclado');
  await page.locator('canvas').screenshot({ path: 'docs/evidence/interface-menu-retrato.png' });

  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  const escolhido = await page.evaluate(() => window.__escolhido);
  assert.equal(
    escolhido, 1,
    `um aperto de E tinha de escolher a primeira opcao (deu ${escolhido}). ` +
      'Zero e o bug antigo: a tecla ia pro retrato aberto por baixo do menu.',
  );
  checks.push('menu de assunto com retrato: UM aperto de E escolhe o tema (era zero)');
  await limpar();

  // --------------------------------------- 2. ESC vai pra pergunta, nao pro menu
  await page.evaluate(() => {
    window.__cancelou = 0;
    const ui = window.game.scene.getScene('UIScene');
    ui.abrirMenu('Bancada', [{ rotulo: 'Consertar', aoEscolher: () => {} }], () => { window.__cancelou += 1; });
    ui.confirmar('Descartar mesmo?', () => {}, () => { window.__cancelou += 100; });
  });
  await page.waitForTimeout(200);
  const empilhado = await foco();
  assert.deepEqual(
    empilhado.abertas, ['menu', 'confirmacao'],
    `a pergunta tinha de abrir por cima do menu: ${JSON.stringify(empilhado)}`,
  );
  await page.locator('canvas').screenshot({ path: 'docs/evidence/interface-pergunta-sobre-menu.png' });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const depoisDoEsc = await foco();
  const cancelou = await page.evaluate(() => window.__cancelou);
  assert.deepEqual(
    depoisDoEsc.abertas, ['menu'],
    `o ESC tinha de fechar so a pergunta: ${JSON.stringify(depoisDoEsc)}`,
  );
  assert.equal(cancelou, 100, `o ESC tinha de cair no "nao" da pergunta, e caiu em ${cancelou}`);
  checks.push('ESC com pergunta sobre menu fecha a pergunta e o menu continua com o teclado');

  // e o segundo ESC fecha o menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  assert.equal((await foco()).topo, null, 'o segundo ESC tinha de devolver o teclado pro jogo');
  assert.equal(await page.evaluate(() => window.__cancelou), 101, 'o menu tinha de cancelar no segundo ESC');
  checks.push('o segundo ESC fecha o menu e devolve o jogo — uma janela por aperto');

  // -------------------------------------- 3. uma janela de conteudo por vez
  await limpar();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  assert.equal((await foco()).topo, 'inventario', 'Tab tinha de abrir o inventario');
  await page.locator('canvas').screenshot({ path: 'docs/evidence/interface-inventario.png' });

  const idDeLoja = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    ui.abrirLoja('loja_mercado');
    return ui.foco.topo;
  });
  await page.waitForTimeout(250);
  const comLoja = await foco();
  assert.equal(idDeLoja, 'loja', 'a loja tinha de tomar o foco');
  assert.deepEqual(
    comLoja.abertas, ['loja'],
    `abrir a loja tinha de fechar o inventario: ${JSON.stringify(comLoja)}`,
  );
  const inventarioVisivel = await page.evaluate(
    () => window.game.scene.getScene('UIScene').inventario.visible,
  );
  assert.equal(inventarioVisivel, false, 'o inventario ficou desenhado por baixo da loja');
  checks.push('abrir a loja fecha o inventario — e ele sai da tela junto, nao so da pilha');
  await page.locator('canvas').screenshot({ path: 'docs/evidence/interface-loja.png' });

  // ------------------------------------- 4. nada abre por cima de uma pergunta
  await page.evaluate(() => {
    window.__abriu = 0;
    const ui = window.game.scene.getScene('UIScene');
    ui.confirmar('Comprar 1 por R$ 3,00?', () => {}, () => {});
    ui.abrirMenu('Nao devia abrir', [{ rotulo: 'x', aoEscolher: () => { window.__abriu += 1; } }]);
    ui.abrirLoja('loja_mercado');
  });
  await page.waitForTimeout(250);
  const sobrePergunta = await foco();
  assert.equal(
    sobrePergunta.topo, 'confirmacao',
    `a pergunta tinha de continuar com o teclado: ${JSON.stringify(sobrePergunta)}`,
  );
  assert(
    !sobrePergunta.abertas.includes('menu'),
    `um menu abriu por cima da pergunta: ${JSON.stringify(sobrePergunta)}`,
  );
  checks.push('nem menu nem loja abrem por cima de uma pergunta — a pergunta e a ultima palavra');

  // ------------------------- 5. o jogo so volta a andar quando a pilha esvazia
  assert.equal(sobrePergunta.bloqueado, true, 'com janela aberta o jogo tinha de estar parado');
  await limpar();
  await page.waitForTimeout(200);
  const livre = await foco();
  assert.deepEqual(livre, { abertas: [], topo: null, bloqueado: false }, `${JSON.stringify(livre)}`);
  checks.push('pilha vazia = jogo andando; qualquer janela aberta = jogo parado');

  // --------------------------------------- 6. a moldura e a mesma, no pixel
  //
  // A borda de painel e uma linha de 1px na cor UI.borda, desenhada pelo mesmo
  // `moldura` em todas as janelas. Medir DUAS janelas diferentes no mesmo ponto
  // relativo prova que as duas passaram pelo kit.
  const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
  /** UI.borda: a cor que `moldura` usa no traco de 1px de toda janela. */
  const ESPERADA = 0x6b5f4c;
  const distancia = (a, b) =>
    Math.abs((a >> 16) - (b >> 16)) +
    Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) +
    Math.abs((a & 255) - (b & 255));

  /**
   * Acha o traco da borda esquerda do painel e devolve a cor dele.
   *
   * Varre uma janela estreita em volta do x do painel em vez de ler UM pixel: a
   * borda tem 1px logico, e `getBounds` de container arredonda pelo filho mais a
   * esquerda — um pixel fixo cai no fundo do painel ou no cenario de fora. Foi o
   * que deu verde de grama (#4fa415) na primeira versao deste teste.
   */
  const corDaBorda = async (x, y) => {
    let melhor = { cor: -1, dist: Infinity, dx: 0 };
    for (let dx = -2; dx <= 3; dx++) {
      const cor = await corLogica(x + dx, y);
      const dist = distancia(cor, ESPERADA);
      if (dist < melhor.dist) melhor = { cor, dist, dx };
    }
    return melhor;
  };

  /**
   * O retangulo que a `moldura` desenhou, guardado por ela no proprio Graphics.
   * E o unico jeito honesto de medir: `getBounds` do container soma os filhos e
   * o titulo passa da borda.
   */
  const painelDe = (janela) => page.evaluate((j) => {
    const ui = window.game.scene.getScene('UIScene');
    for (const filho of ui[j].list) {
      const r = filho.getData?.('painel');
      if (r) return r;
    }
    return null;
  }, janela);

  const medidas = {};
  await page.evaluate(() => window.game.scene.getScene('UIScene').abrirLoja('loja_mercado'));
  await page.waitForTimeout(400);
  const rLoja = await painelDe('loja');
  assert(rLoja, 'o painel da loja nao registrou o retangulo — nao passou por `moldura`');
  // um terco painel abaixo do topo: longe do titulo e de qualquer divisa
  medidas.loja = await corDaBorda(rLoja.x, rLoja.y + Math.round(rLoja.h / 3));
  await limpar();

  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  const rInv = await painelDe('inventario');
  assert(rInv, 'o painel do inventario nao registrou o retangulo — nao passou por `moldura`');
  medidas.inventario = await corDaBorda(rInv.x, rInv.y + Math.round(rInv.h / 3));
  await limpar();

  // 12 de distancia somada nos tres canais: o canvas escala com `pixelArt`, mas
  // uma borda de outra cor erraria por muito mais que isso
  for (const [janela, m] of Object.entries(medidas)) {
    assert(
      m.dist <= 12,
      `a borda do painel de ${janela} saiu ${hex(m.cor)} e ${hex(ESPERADA)} era o esperado ` +
        `(distancia ${m.dist}) — essa janela nao passou pelo kit de moldura`,
    );
  }
  checks.push(
    `a borda das duas janelas e UI.borda no pixel: ${hex(medidas.loja.cor)} na loja e ` +
      `${hex(medidas.inventario.cor)} no inventario`,
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync('docs/evidence/interface-browser.json', `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(`[interface browser] ${checks.length} conferencias passaram`);

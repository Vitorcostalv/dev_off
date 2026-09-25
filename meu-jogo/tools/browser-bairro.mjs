/**
 * O REMAP DO BAIRRO no jogo de pe.
 *
 * O validador offline le o tilemap que o gerador escreveu; aqui se mede o que so
 * o navegador responde:
 *
 *   1. as 38 pecas de mobiliario aparecem de verdade — e o bairro passou a pedir
 *      `moveis_parque` SOB DEMANDA, que ate esta leva era coisa de interior;
 *   2. os nove postes acendem halo a noite e ficam apagados de dia;
 *   3. a placa do largo abre com o texto dela;
 *   4. uma caminhada real pelo patio da escola, de piso, sem esbarrar;
 *   5. as duas casas do condominio se alcancam pelo portao — a coisa mais facil
 *      de quebrar aqui, e a que nao levanta erro nenhum quando quebra.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(60000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

const checks = [];
/**
 * Poe o jogador num tile OLHANDO pra uma direcao e devolve o alvo que a cena
 * enxerga. A direcao importa: a interacao exige o alvo A FRENTE (ver
 * `CONFIG.interacao.cosseno`), entao teletransportar sem virar nao acha nada.
 */
const encostar = async (tx, ty, direcao = 'up') => {
  await page.evaluate(([x, y, d]) => {
    const f = window.game.scene.getScene('FarmScene');
    f.player.setPosition((x + 0.5) * 32, (y + 0.5) * 32);
    f.direcao = d;
  }, [tx, ty, direcao]);
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const a = window.game.scene.getScene('FarmScene').alvo;
    return a ? { id: a.id, tipo: a.tipo, destino: a.props?.destino ?? null } : null;
  });
};
const falaAberta = () => page.evaluate(() => {
  const ui = window.game.scene.getScene('UIScene');
  return { aberta: ui.dialogoAberto === true, texto: ui.dialogoTexto?.text ?? '' };
});
/** Esc nao fecha dialogo (so confirmacao): quem passa a pagina e o proprio E. */
const fecharFala = async () => {
  for (let n = 0; n < 10; n++) {
    if (!(await falaAberta()).aberta) return;
    await page.keyboard.press('e');
    await page.waitForTimeout(180);
  }
  throw new Error('a fala nao fechou');
};
const entrar = async (mapa, x, y) => {
  await page.evaluate(([m, tx, ty]) => {
    const f = window.game.scene.getScene('FarmScene');
    f.pronto = false;
    window.estado.mapa = m;
    f.scene.restart({ mapa: m, x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 });
  }, [mapa, x, y]);
  await page.waitForFunction(
    (m) => {
      const f = window.game.scene.getScene('FarmScene');
      return window.estado.mapa === m && f?.pronto === true && f.load.isLoading() === false;
    },
    mapa,
  );
  await page.waitForTimeout(300);
};

try {
  await page.goto(ALVO);
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto === true);

  // ------------------------------- 1. mobiliario na cena e atlas sob demanda
  await entrar('bairro', 58, 10);
  const cena = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    return {
      moveis: f.pegadasDeMovel?.length ?? -1,
      atlas: f.textures.getTextureKeys().filter((k) => k.startsWith('moveis_')).sort(),
      luzes: f.luzesNoturnas?.length ?? -1,
    };
  });
  assert(
    cena.moveis >= 30,
    `o bairro desenhou ${cena.moveis} moveis; o remap poe 38. Carga sob demanda que nao carrega e `
      + 'praca vazia em silencio — `criarMoveis` avisa no console e segue',
  );
  assert(
    cena.atlas.includes('moveis_parque'),
    `o bairro nao carregou "moveis_parque": ${JSON.stringify(cena.atlas)}`,
  );
  checks.push(
    `bairro: ${cena.moveis} pecas de mobiliario com ${cena.atlas.length} atlas sob demanda `
      + `(${cena.atlas.join(', ')})`,
  );

  // ------------------------------------------- 2. os postes acendem a noite
  const halos = async (minutos) => {
    await page.evaluate((m) => {
      window.estado.relogio.definir(m);
      window.game.scene.getScene('FarmScene').atualizarLuzesNoturnas();
    }, minutos);
    await page.waitForTimeout(250);
    return page.evaluate(() => {
      const f = window.game.scene.getScene('FarmScene');
      return (f.luzesNoturnas ?? []).filter((g) => g.visible && g.alpha > 0.05).length;
    });
  };
  const deDia = await halos(12 * 60);
  const deNoite = await halos(23 * 60);
  assert.equal(deDia, 0, `${deDia} halo(s) acesos ao meio-dia no bairro`);
  assert(
    deNoite >= 8,
    `so ${deNoite} halo(s) acesos as 23h; o remap poe nove postes marcados com luz`,
  );
  checks.push(`postes do bairro: ${deDia} halos ao meio-dia, ${deNoite} as 23h`);

  // ----------------------------------------------- 3. a placa do largo abre
  await entrar('bairro', 57, 15);
  const naPlaca = await encostar(57, 14, 'up');
  assert.equal(
    naPlaca?.id, 'placa_largo_estacao',
    `esperava a placa do largo e achei ${JSON.stringify(naPlaca)}`,
  );
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const fala = await falaAberta();
  assert(fala.aberta, 'a placa do largo nao abriu');
  assert(
    fala.texto.toUpperCase().includes('LARGO'),
    `a placa do largo abriu com texto de outra coisa: "${fala.texto}"`,
  );
  checks.push(`a placa do largo abre: "${fala.texto.slice(0, 44)}..."`);
  await fecharFala();

  // --------------------------------- 4. uma caminhada de verdade pelo patio
  await entrar('bairro', 34, 50);
  const antes = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    return { x: f.player.x, y: f.player.y };
  });
  await page.keyboard.down('d');
  await page.waitForTimeout(1800);
  await page.keyboard.up('d');
  await page.waitForTimeout(200);
  const depois = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    return { x: f.player.x, y: f.player.y };
  });
  const andou = (depois.x - antes.x) / 32;
  assert(
    andou > 4,
    `o jogador andou ${andou.toFixed(1)} tiles pelo patio da escola antes de travar; o patio tem `
      + 'dez de largura e tem de dar pra atravessar',
  );
  checks.push(`caminhada pelo patio da escola: ${andou.toFixed(1)} tiles sem travar`);

  // ------------------------- 5. as duas casas do condominio, pelo portao
  await entrar('bairro', 104, 45);
  await page.screenshot({ path: 'docs/evidence/bairro-condominio.png' });
  const portoes = await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    const portas = f.interagiveis.filter((i) => i.tipo === 'porta');
    return portas
      .filter((p) => String(p.props.destino ?? '').startsWith('casa_c'))
      .map((p) => ({ destino: p.props.destino, tx: Math.round(p.x / 32), ty: Math.round(p.y / 32) }));
  });
  assert.equal(
    portoes.length, 2,
    `o condominio devia ter duas portas de casa e tem ${portoes.length}: ${JSON.stringify(portoes)}`,
  );
  // entra de verdade numa delas, pelo caminho do jogador: e o que prova que o
  // caminho existe do lado de la, e nao so que a porta esta na lista
  const naPorta = await encostar(99, 28, 'up');
  assert.equal(
    naPorta?.destino, 'casa_c1',
    `esperava a porta da casa do Lucas e achei ${JSON.stringify(naPorta)}`,
  );
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.estado.mapa === 'casa_c1'
    && window.game.scene.getScene('FarmScene')?.pronto === true);
  checks.push(`o condominio abre as duas casas pelo portao (${portoes.map((p) => p.destino).join(', ')})`);

  await entrar('bairro', 58, 10);
  await page.screenshot({ path: 'docs/evidence/bairro-largo.png' });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync(
    'docs/evidence/bairro-browser.json',
    `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
console.log(`[bairro browser] ${checks.length} conferencias passaram`);

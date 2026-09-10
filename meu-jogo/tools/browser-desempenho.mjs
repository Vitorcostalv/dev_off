/**
 * O PESO DO BOOT, medido na rede e nao no disco.
 *
 * A base de desempenho de `docs/overhaul.md` registrava "public soma
 * 268.978.461 bytes (tamanho distribuido, nao trafego de boot)" e dizia, com
 * razao, que o trafego ainda precisava de medicao propria. Esta e ela.
 *
 * Contar bytes em `public/` nao responde nada: metade daquilo e folha de arte
 * que so o gerador le. O que importa e o que o NAVEGADOR baixa antes de a
 * primeira tela aparecer, e isso so o navegador informa.
 *
 * Sao cinco perguntas:
 *
 *   1. quanto o boot baixa ate o menu, por categoria;
 *   2. que os atlas de movel NAO estao nesse total (eram 35,79 MB de folha de
 *      banheiro e de hospital baixadas pra quem comeca na rua);
 *   3. que eles CHEGAM ao entrar num interior, e a mobilia aparece — carga sob
 *      demanda que nao carrega e sala vazia em silencio;
 *   4. que as treze faixas longas de audio nao entram no boot;
 *   5. que o teto de peso segura: um asset novo que dobre o boot falha aqui.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lerPng, pixel as pixelDe } from './imagem.mjs';

const ALVO = process.env.GAME_URL ?? 'http://127.0.0.1:5186';

/**
 * TETO DO BOOT, em MB.
 *
 * Nao e uma meta: e o valor medido hoje (36,5 MB) com folga de dez por cento. A
 * folga existe pra um icone novo nao quebrar o teste, e o teto existe pra
 * ninguem devolver ao boot uma leva de 35 MB sem notar.
 */
const TETO_MB = 40;

/** Categorias que NAO podem aparecer no boot, e a razao de cada uma. */
const PROIBIDOS = [
  {
    nome: 'atlas de movel',
    casa: (u) => /\/sprites\/moveis_/.test(u),
    razao:
      'as catorze folhas somam 35,79 MB; a cena de mundo carrega as do mapa ' +
      '(ver garantirAtlasDeMovel na FarmScene)',
  },
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(60000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

/** Todo asset baixado, com o tamanho do corpo. */
const baixados = new Map();
page.on('response', async (r) => {
  const u = new URL(r.url()).pathname;
  if (!u.startsWith('/assets/')) return;
  try { baixados.set(u, (await r.body()).length); } catch { baixados.set(u, 0); }
});

const checks = [];
const mb = (b) => (b / 1048576).toFixed(2);

const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'desempenho-'));
let contador = 0;
/** A cor do pixel (x, y) em coordenada LOGICA (480x270). */
const corLogica = async (x, y) => {
  const arquivo = path.join(temporario, `d${contador++}.png`);
  await page.locator('canvas').screenshot({ path: arquivo });
  const img = lerPng(arquivo);
  const escala = Math.round(img.w / 480);
  const [r, g, b] = pixelDe(img, x * escala + 1, y * escala + 1);
  return (r << 16) | (g << 8) | b;
};
const somaDe = (mapa) => [...mapa.values()].reduce((a, c) => a + c, 0);

const categoria = (u) => {
  const nome = u.split('/').pop();
  if (u.includes('/audio/')) return 'audio';
  if (u.includes('/tilemaps/')) return 'tilemaps';
  if (u.includes('/tilesets/')) return 'tilesets';
  if (/^moveis_/.test(nome)) return 'atlas de movel';
  if (/_(andando|parado|correndo)_runtime/.test(nome)) return 'sprite de npc/monstro';
  if (/^(itens|aparelhos)\./.test(nome)) return 'icones de item';
  if (/^(Arvores|arvores|pedras|flores|Flores|grama|Grama)/.test(nome)) return 'flora';
  if (/^construcoes/.test(nome)) return 'fachadas';
  if (/^(Player|player|maos|equipamento)/i.test(nome)) return 'jogador';
  return 'outros';
};

try {
  await page.goto(ALVO);
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));

  // ------------------------------------------ 1. o peso do boot, por categoria
  const doBoot = new Map(baixados);
  const total = somaDe(doBoot);
  const porCategoria = {};
  for (const [u, n] of doBoot) porCategoria[categoria(u)] = (porCategoria[categoria(u)] ?? 0) + n;
  const detalhe = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${mb(n)} MB`)
    .join(', ');
  checks.push(`boot ate o menu: ${doBoot.size} arquivos, ${mb(total)} MB — ${detalhe}`);

  // ------------------------------------------------- 2 e 4. o que nao entra
  for (const p of PROIBIDOS) {
    const achados = [...doBoot].filter(([u]) => p.casa(u));
    assert.equal(
      achados.length, 0,
      `${achados.length} arquivo(s) de "${p.nome}" no boot (${mb(achados.reduce((s, [, n]) => s + n, 0))} MB): ${p.razao}`,
    );
    checks.push(`nenhum arquivo de "${p.nome}" no boot`);
  }
  // audio: so o do lugar. As treze faixas longas somam 7,15 dos 7,52 MB.
  const audioDoBoot = [...doBoot].filter(([u]) => u.includes('/audio/'));
  const somaAudio = audioDoBoot.reduce((s, [, n]) => s + n, 0);
  assert(
    somaAudio < 2 * 1048576,
    `o boot baixou ${mb(somaAudio)} MB de audio; ambiente e trilha entram por demanda e efeito ` +
      'mais interface somam 0,37 MB',
  );
  checks.push(`audio no boot: ${audioDoBoot.length} arquivos, ${mb(somaAudio)} MB (era 7,52 MB nos 46)`);

  // ---------------------------------------------------------- 5. o teto
  assert(
    total < TETO_MB * 1048576,
    `o boot baixa ${mb(total)} MB e o teto e ${TETO_MB} MB. Se o asset novo e necessario, suba o ` +
      'teto de proposito neste arquivo; se nao, carregue ele por demanda',
  );
  checks.push(`o boot cabe no teto de ${TETO_MB} MB com ${mb(total)} MB`);

  // ------------------ 3. o atlas sob demanda chega, e a mobilia aparece
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.getScene('FarmScene')?.pronto === true);
  await page.waitForTimeout(500);

  /**
   * Entra num mapa e devolve a mobilia desenhada.
   *
   * A espera nao pode ser um tempo fixo. A cena reinicia DUAS vezes ao entrar
   * num interior — uma pra pedir os atlas, outra com eles em cache — e a casa do
   * protagonista puxa 15,6 MB de atlas. Com 400 ms de espera o teste media a
   * cena velha e dava a casa como VAZIA, que e exatamente o sintoma que ele
   * existe pra pegar; um falso positivo desses e pior que nenhum teste.
   *
   * Entao: derruba o `pronto` da cena velha na mao (pra ela nao ser confundida
   * com a nova), espera o mapa certo pronto E o carregador ocioso.
   */
  const entrar = async (mapa) => {
    await page.evaluate((m) => {
      const f = window.game.scene.getScene('FarmScene');
      f.pronto = false;
      window.estado.mapa = m;
      f.scene.restart({ mapa: m });
    }, mapa);
    await page.waitForFunction(
      (m) => {
        const f = window.game.scene.getScene('FarmScene');
        return window.estado.mapa === m && f?.pronto === true && f.load.isLoading() === false;
      },
      mapa,
    );
    await page.waitForTimeout(300);
    return page.evaluate(() => {
      const f = window.game.scene.getScene('FarmScene');
      return {
        moveis: f.pegadasDeMovel?.length ?? -1,
        atlas: f.textures.getTextureKeys().filter((k) => k.startsWith('moveis_')).sort(),
      };
    });
  };

  // o mercado usa UMA folha; a casa do protagonista usa seis
  const mercado = await entrar('mercado');
  assert(
    mercado.moveis > 10,
    `o mercado ficou com ${mercado.moveis} moveis — o atlas sob demanda nao chegou, e sala vazia ` +
      'nao levanta erro nenhum: `criarMoveis` avisa no console e segue',
  );
  assert(
    mercado.atlas.includes('moveis_mercado'),
    `o atlas do mercado nao esta carregado: ${JSON.stringify(mercado.atlas)}`,
  );
  checks.push(
    `mercado: ${mercado.moveis} moveis na tela com ${mercado.atlas.length} atlas carregado(s) ` +
      `(${mercado.atlas.join(', ')})`,
  );

  const casa = await entrar('oficina');
  assert(casa.moveis > 20, `a casa do protagonista ficou com ${casa.moveis} moveis`);
  assert(
    casa.atlas.length >= 6,
    `a casa precisa de seis atlas e tem ${casa.atlas.length}: ${JSON.stringify(casa.atlas)}`,
  );
  checks.push(`casa do protagonista: ${casa.moveis} moveis com ${casa.atlas.length} atlas`);

  // e a rua nao carrega folha de interior nenhuma alem da que ja veio
  const antes = new Set(casa.atlas);
  const bairro = await entrar('bairro');
  assert(
    bairro.atlas.every((a) => antes.has(a)),
    `entrar na rua carregou atlas de interior novo: ${JSON.stringify(bairro.atlas)}`,
  );
  checks.push('a rua do bairro nao pede atlas de interior nenhum');


  // ------------------------- 8 e 9. as duas opcoes de acessibilidade valem
  //
  // As duas existiam nas preferencias e valiam por uma coisa cada: o contraste
  // alto trocava UM retangulo (o fundo do painel da tela de menu) e o movimento
  // reduzido desligava as particulas de clima. HUD, caixa de fala, inventario e
  // loja ignoravam o contraste, e a seta [Enter] piscava pra sempre na caixa de
  // fala com movimento reduzido ligado.
  //
  // O contraste se mede no PIXEL: a mesma caixa de fala, sobre o mesmo cenario,
  // com a opcao desligada e ligada. Ligada, o painel e opaco — entao a cor do
  // fundo dele tem de ficar MAIS PERTO de UI.fundo (#1a1712) do que ficava.
  const abrirFala = () => page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    for (const j of [...ui.foco.abertas].reverse()) ui.soltarFoco(j);
    ui.iniciarDialogo([{ nome: 'Teste', texto: 'Contraste medido no pixel.' }]);
  });
  const definirPreferencia = (chave, valor) => page.evaluate(([k, v]) => {
    window.estado.preferencias.valores[k] = v;
    window.estado.preferencias.salvar?.();
    // o `create` da UIScene e quem aplica; reinicia-la e o que o menu de pausa faz
    window.game.scene.getScene('UIScene').scene.restart();
  }, [chave, valor]);

  const distanciaAoFundo = async () => {
    const r = await painelDeFala();
    // um ponto DENTRO do painel, longe de texto e de borda
    const cor = await corLogica(r.x + 20, r.y + r.h - 10);
    const FUNDO = 0x1a1712;
    return {
      cor,
      dist:
        Math.abs((cor >> 16) - (FUNDO >> 16)) +
        Math.abs(((cor >> 8) & 255) - ((FUNDO >> 8) & 255)) +
        Math.abs((cor & 255) - (FUNDO & 255)),
    };
  };
  const painelDeFala = () => page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    for (const filho of ui.dialogo.list) {
      const r = filho.getData?.('painel');
      if (r) return r;
    }
    return null;
  });

  // com o jogo no centro ao meio-dia, que e o cenario mais claro do jogo
  await page.evaluate(() => {
    window.estado.relogio.definir(12 * 60);
    window.estado.clima.definir(window.estado.dia, 'Limpo');
    window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'farm' });
  });
  await page.waitForFunction(() => window.estado.mapa === 'farm' && window.game.scene.getScene('FarmScene')?.pronto === true);
  await page.waitForTimeout(600);

  await definirPreferencia('altoContraste', false);
  await page.waitForTimeout(500);
  await abrirFala();
  await page.waitForTimeout(400);
  const normal = await distanciaAoFundo();

  await definirPreferencia('altoContraste', true);
  await page.waitForTimeout(500);
  await abrirFala();
  await page.waitForTimeout(400);
  const alto = await distanciaAoFundo();

  const hexc = (c) => `#${c.toString(16).padStart(6, '0')}`;
  assert(
    alto.dist < normal.dist,
    `o contraste alto nao deixou o painel mais opaco: ${hexc(normal.cor)} (distancia ` +
      `${normal.dist} de UI.fundo) contra ${hexc(alto.cor)} (${alto.dist}) — a opcao continua ` +
      'valendo so pelo retangulo da tela de menu',
  );
  assert(
    alto.dist <= 6,
    `com contraste alto o painel devia ser opaco e mediu ${hexc(alto.cor)}, a ${alto.dist} de ` +
      'UI.fundo',
  );
  checks.push(
    `contraste alto na caixa de fala sobre o centro ao meio-dia: ${hexc(normal.cor)} (a ` +
      `${normal.dist} de UI.fundo) vira ${hexc(alto.cor)} (a ${alto.dist}) — cenario claro para ` +
      'de vazar por tras das letras',
  );

  // movimento reduzido: a seta [Enter] nao pode estar em tween nenhum
  const setaAnimada = async () => page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    const setas = ui.dialogo.list.filter((o) => o.text === '[Enter]');
    return {
      quantas: setas.length,
      emTween: setas.some((s) => ui.tweens.getTweensOf(s).length > 0),
      alpha: setas[0] ? Number(setas[0].alpha.toFixed(2)) : null,
    };
  });
  await definirPreferencia('movimentoReduzido', false);
  await page.waitForTimeout(500);
  const comMovimento = await setaAnimada();
  await definirPreferencia('movimentoReduzido', true);
  await page.waitForTimeout(500);
  const semMovimento = await setaAnimada();
  assert.equal(comMovimento.quantas, 1, 'nao achei a seta [Enter] na caixa de fala');
  assert.equal(
    comMovimento.emTween, true,
    'a seta [Enter] devia piscar com movimento reduzido DESLIGADO — o teste nao esta medindo nada',
  );
  assert.equal(
    semMovimento.emTween, false,
    'a seta [Enter] continua piscando com movimento reduzido ligado; ela e o unico elemento ' +
      'perpetuamente animado da interface e fica onde o jogador passa mais tempo lendo',
  );
  assert(
    semMovimento.alpha > 0.25,
    `a seta parada ficou em alpha ${semMovimento.alpha}: parar de piscar nao pode ser sumir`,
  );
  checks.push(
    `movimento reduzido para a seta [Enter] da caixa de fala (alpha ${semMovimento.alpha}, parada) ` +
      'e mantem ela visivel',
  );
  await definirPreferencia('movimentoReduzido', false);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync(
    'docs/evidence/desempenho-browser.json',
    `${JSON.stringify({ errors, warnings, checks, bootMB: Number(mb(total)), porCategoria }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
console.log(`[desempenho browser] ${checks.length} conferencias passaram`);

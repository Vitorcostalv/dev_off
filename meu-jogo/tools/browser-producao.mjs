/**
 * Validacao final no BUILD DE PRODUCAO (dist servido por `vite preview`).
 *
 * Duas frentes:
 *  1. estatica  — o bundle nao carrega o vocabulario nem os atalhos do modo de
 *     desenvolvimento (o guarda `import.meta.env.DEV` os remove na build);
 *  2. de tela   — sem `window.game`/`window.estado` pra inspecionar, a prova de
 *     que uma tecla abriu (ou nao abriu) um painel vem da diferenca media de
 *     pixels do canvas. O mapa da cidade cobre a tela inteira, entao serve de
 *     referencia superior; o mundo parado, de referencia inferior.
 *
 * Roda com o preview de producao no ar:
 *   npm run build && npx vite preview --port 5187 --strictPort --host 127.0.0.1
 *   npm run test:producao
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lerPng } from './imagem.mjs';

const ALVO = process.env.PRODUCTION_URL ?? 'http://127.0.0.1:5187';
const raiz = new URL('..', import.meta.url);
const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'meu-jogo-prod-'));

// ---------------------------------------------------------------- 1. estatica
const pastaAssets = new URL('dist/assets/', raiz);
const bundles = fs.readdirSync(pastaAssets).filter((n) => n.endsWith('.js'));
assert.equal(bundles.length, 1, `esperava um bundle em dist/assets, achei ${bundles.length}`);
const codigo = fs.readFileSync(new URL(bundles[0], pastaAssets), 'utf8');

const PROIBIDOS = [
  'Desenvolvimento',        // titulos e entrada do menu de desenvolvimento
  'dev_mapas',
  'dev_itens',
  'Viajar para mapa',
  'Salvar e exportar JSON',
  'keydown-F10',            // atalho do painel de desenvolvimento
  'keydown-F6',             // demarcacao de zonas reservadas
  'window.estado',
];
const vazados = PROIBIDOS.filter((termo) => codigo.includes(termo));
assert.deepEqual(vazados, [], `bundle de producao vazou termos de desenvolvimento: ${vazados.join(', ')}`);
// o remapeamento de teclas, ao contrario, PRECISA existir em producao
for (const termo of ['meu-jogo:controls', 'Restaurar teclas padrao']) {
  assert(codigo.includes(termo), `bundle de producao perdeu "${termo}"`);
}

// ------------------------------------------------------------------ 2. de tela
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let contador = 0;
/** Screenshot do canvas decodificado em RGBA. */
const quadro = async () => {
  const arquivo = path.join(temporario, `q${contador++}.png`);
  await page.locator('canvas').screenshot({ path: arquivo });
  return lerPng(arquivo);
};
/** Diferenca media por canal entre dois quadros do mesmo tamanho. */
const diferenca = (a, b) => {
  assert.equal(a.px.length, b.px.length, 'quadros de tamanhos diferentes');
  let soma = 0;
  for (let i = 0; i < a.px.length; i += 4) {
    soma += Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]);
  }
  return soma / (a.px.length / 4) / 3;
};
const tecla = async (k, espera = 260) => { await page.keyboard.press(k); await page.waitForTimeout(espera); };
/**
 * Setas uma por quadro. Sem a pausa entre elas o Phaser processa parte da fila
 * depois da troca de pagina, e a contagem de linhas deixa de valer.
 */
const setas = async (quantas, k) => {
  for (let i = 0; i < quantas; i++) {
    await page.keyboard.press(k);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(150);
};
/** Quantas cores distintas o quadro tem — a tela preta do boot tem pouquissimas. */
const cores = (img) => {
  const vistas = new Set();
  for (let i = 0; i < img.px.length; i += 4) vistas.add((img.px[i] << 16) | (img.px[i + 1] << 8) | img.px[i + 2]);
  return vistas.size;
};
/**
 * Espera o boot terminar e entra no mundo. Em producao nao ha `window.game` pra
 * consultar, entao o sinal de "ja desenhou" e o proprio quadro deixar de ser
 * uma chapa quase lisa; o Enter e conferido comparando titulo com mundo.
 */
const entrar = async () => {
  await page.waitForSelector('canvas');
  await page.waitForLoadState('networkidle');
  let titulo = null;
  for (let tentativa = 0; tentativa < 40 && !titulo; tentativa++) {
    const q = await quadro();
    if (cores(q) > 50) titulo = q;
    else await page.waitForTimeout(500);
  }
  assert(titulo, 'a tela de titulo nao apareceu no build de producao');
  await tecla('Enter', 900); // pagina de titulo -> mundo
  const mundo = await quadro();
  assert(diferenca(titulo, mundo) > 2, 'Enter nao saiu da tela de titulo');
  return mundo;
};

const checks = [];
try {
  await page.goto(ALVO);
  const mundo = await entrar();

  // sem atalhos de depuracao no console
  assert.equal(await page.evaluate(() => window.game), undefined);
  assert.equal(await page.evaluate(() => window.estado), undefined);
  checks.push('sem window.game/window.estado em producao');

  // referencia superior: o mapa da cidade (M) cobre a tela
  await tecla('KeyM', 400);
  const comMapa = await quadro();
  await tecla('KeyM', 400);
  const mundoDeNovo = await quadro();
  const ruido = diferenca(mundo, mundoDeNovo);
  const painel = diferenca(mundo, comMapa);
  assert(painel > ruido * 4 + 1, `metrica sem separacao: painel ${painel.toFixed(2)} vs ruido ${ruido.toFixed(2)}`);
  const limite = ruido + (painel - ruido) / 3;
  checks.push(`metrica de painel calibrada (mundo ${ruido.toFixed(2)} < limite ${limite.toFixed(2)} < mapa ${painel.toFixed(2)})`);

  // as teclas de funcao nao abrem nada e nao tocam no save
  await page.evaluate(() => localStorage.setItem('meu-jogo:save', JSON.stringify({ marcador: 'nao-apagar' })));
  for (const k of ['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9', 'F10']) await tecla(k, 140);
  await page.waitForTimeout(300);
  const depoisDasF = await quadro();
  assert(diferenca(mundoDeNovo, depoisDasF) < limite, 'alguma tecla de funcao abriu um painel em producao');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:save')).marcador), 'nao-apagar');
  assert.equal(await page.evaluate(() => window.game), undefined);
  checks.push('F1-F10 em producao: nenhum painel, save intacto, sem globais');

  // remapeamento pela interface de producao: Pausa -> Opcoes -> Teclas -> Mapa
  await tecla('Escape', 400);
  await setas(12, 'ArrowDown');           // o cursor para na ultima linha da pausa: Opcoes
  await tecla('Enter', 400);
  await setas(12, 'ArrowDown');           // ultima linha das opcoes: Teclas e controle
  await tecla('Enter', 400);
  await setas(3, 'ArrowUp');              // garante o topo da lista de acoes
  await setas(7, 'ArrowDown');            // 8a acao da lista: Mapa
  await tecla('Enter', 250);
  await tecla('KeyL', 300);
  const atalhos = await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:controls')));
  assert.equal(atalhos.mapa, 'KeyL', `o remapeamento nao caiu na linha do mapa: ${JSON.stringify(atalhos)}`);
  assert.deepEqual(
    Object.entries(atalhos).filter(([, code]) => code === 'KeyL').map(([id]) => id),
    ['mapa'],
    'mais de uma acao acabou em KeyL',
  );
  assert.deepEqual(
    { ...atalhos, mapa: 'KeyM' },
    { cima: 'KeyW', baixo: 'KeyS', esquerda: 'KeyA', direita: 'KeyD', interagir: 'KeyE', correr: 'ShiftLeft', inventario: 'Tab', mapa: 'KeyM', atacar: 'Space', recarregar: 'KeyR', usar: 'KeyU', equipar: 'KeyF' },
    'a navegacao mexeu em alguma acao fora do mapa',
  );
  checks.push('remapeamento pela tela de opcoes de producao persiste, sem tocar nas outras acoes');

  await tecla('Escape', 250);
  await tecla('Escape', 250);
  await tecla('Escape', 400);

  // recarrega: o atalho salvo tem de valer desde o boot
  await page.reload();
  const base = await entrar();
  await tecla('KeyM', 400);
  const comAntiga = await quadro();
  assert(diferenca(base, comAntiga) < limite, 'a tecla antiga (M) continuou abrindo o mapa em producao');
  checks.push('tecla antiga inativa depois do remapeamento');
  await tecla('KeyL', 400);
  const comNova = await quadro();
  assert(diferenca(base, comNova) > limite, 'a tecla nova (L) nao abriu o mapa em producao');
  await tecla('KeyL', 400);
  checks.push('tecla nova abre o mapa depois de recarregar');

  assert.deepEqual(errors, []);
  fs.writeFileSync(
    new URL('docs/evidence/producao-browser.json', raiz),
    `${JSON.stringify({ alvo: ALVO, bundle: bundles[0], bytes: codigo.length, errors, checks }, null, 2)}\n`,
  );
} finally {
  await browser.close();
  fs.rmSync(temporario, { recursive: true, force: true });
}
console.log(`[producao] ${checks.length} conferencias passaram no build de producao`);

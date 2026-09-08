/**
 * Audio no navegador: catalogo carregado, ambiente e trilha respondendo a mapa,
 * hora e clima, volumes das opcoes chegando ao mixer e sobrevivendo ao reload.
 *
 * O Chrome sobe com a politica de autoplay liberada — sem isso o contexto de
 * audio fica suspenso esperando um gesto e nada toca em modo headless.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(30000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

const checks = [];
/**
 * O modulo do tocador fica em window pro teste poder usar predicados SINCRONOS:
 * predicado async em waitForFunction devolve Promise, que e sempre truthy, e a
 * espera passaria na primeira tentativa sem conferir nada.
 */
const expor = () => page.evaluate(async () => {
  window.somTeste = (await import('/src/scenes/Som.ts')).som;
});
/** Estado do mixer visto de dentro da pagina. */
const mixer = () => page.evaluate(() => {
  const som = window.somTeste;
  const camada = (id) => {
    const achou = id ? window.game.sound.sounds.find((s) => s.key === id && s.isPlaying) : null;
    return achou ? { key: achou.key, volume: Number(achou.volume.toFixed(3)), loop: achou.loop } : null;
  };
  return {
    disponivel: som.disponivel,
    ambiente: som.ambienteAtual,
    musica: som.musicaAtual,
    camadaAmbiente: camada(som.ambienteAtual),
    camadaMusica: camada(som.musicaAtual),
    tocando: window.game.sound.sounds.filter((s) => s.isPlaying).map((s) => ({ key: s.key, volume: Number(s.volume.toFixed(3)), loop: s.loop })),
  };
});
const esperarAmbiente = (id) => page.waitForFunction((alvo) => window.somTeste.ambienteAtual === alvo, id, { timeout: 15000 });
const esperarTrilha = (id) => page.waitForFunction((alvo) => window.somTeste.musicaAtual === alvo, id, { timeout: 15000 });

try {
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));

  // catalogo inteiro no cache, com os mesmos ids do modulo de dominio
  const cache = await page.evaluate(async () => {
    const { IDS_DE_AUDIO } = await import('/src/game/audio.ts');
    return { total: IDS_DE_AUDIO.length, faltando: IDS_DE_AUDIO.filter((id) => !window.game.cache.audio.exists(id)) };
  });
  assert.deepEqual(cache.faltando, [], 'sons ausentes no cache');
  assert(cache.total >= 40, `catalogo pequeno demais: ${cache.total}`);
  checks.push(`${cache.total} sons carregados no boot`);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await expor();

  // o jogo comeca no bairro: o ambiente do bairro e diferente do centro
  await esperarAmbiente('amb_bairro');
  checks.push('bairro tem ambiente proprio no inicio da partida');

  // centro de dia: ambiente e trilha proprios, ambos em loop e audiveis
  await page.evaluate(() => {
    window.estado.relogio.definir(12 * 60);
    window.estado.clima.definir(window.estado.dia, 'Limpo');
    window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'farm' });
  });
  await page.waitForFunction(() => window.estado.mapa === 'farm' && window.game.scene.getScene('FarmScene').pronto);
  await esperarAmbiente('amb_cidade');
  await esperarTrilha('mus_cidade');
  // a transicao dura ~1s: espera a camada nova ganhar volume antes de medir
  await page.waitForTimeout(1200);
  const cidade = await mixer();
  assert.equal(cidade.disponivel, true, 'audio indisponivel no navegador de teste');
  assert(cidade.camadaAmbiente?.loop === true && cidade.camadaAmbiente.volume > 0, `ambiente do centro mudo: ${JSON.stringify(cidade)}`);
  assert(cidade.camadaMusica?.loop === true && cidade.camadaMusica.volume > 0, `trilha do centro muda: ${JSON.stringify(cidade)}`);
  checks.push('centro de dia: amb_cidade + mus_cidade tocando com volume');

  // clima manda no ambiente
  await page.evaluate(() => window.estado.clima.definir(window.estado.dia, 'Chuva'));
  await esperarAmbiente('amb_chuva');
  checks.push('chuva troca o ambiente');

  // hora manda: de noite o ambiente muda e a trilha cala
  await page.evaluate(() => { window.estado.clima.definir(window.estado.dia, 'Limpo'); window.estado.relogio.definir(23 * 60); });
  await esperarAmbiente('amb_noite');
  await esperarTrilha(null);
  checks.push('noite troca o ambiente e silencia a trilha');

  // interior abafa o clima e o horario
  await page.evaluate(() => { window.estado.relogio.definir(12 * 60); window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'mercado' }); });
  await page.waitForFunction(() => window.estado.mapa === 'mercado' && window.game.scene.getScene('FarmScene').pronto);
  await esperarAmbiente('amb_interior');
  checks.push('interior usa amb_interior');

  // represa funda: ambiente e trilha da usina
  await page.evaluate(() => window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'represa_f30' }));
  await page.waitForFunction(() => window.estado.mapa === 'represa_f30' && window.game.scene.getScene('FarmScene').pronto);
  await esperarAmbiente('amb_represa_fundo');
  await esperarTrilha('mus_represa');
  await page.waitForTimeout(1200);
  checks.push('represa funda: amb_represa_fundo + mus_represa');

  // efeito pontual entra no mixer com o volume do proprio barramento
  const efeito = await page.evaluate(() => {
    const som = window.somTeste;
    const antes = window.game.sound.sounds.length;
    som.tocar('tiro');
    const achou = window.game.sound.sounds.find((s) => s.key === 'tiro');
    return { antes, depois: window.game.sound.sounds.length, volume: achou ? Number(achou.volume.toFixed(3)) : null };
  });
  assert(efeito.depois > efeito.antes, 'o efeito nao entrou no mixer');
  assert(efeito.volume > 0, 'o efeito entrou mudo');
  checks.push('efeito pontual entra no mixer com volume proprio');

  // De volta ao centro pra medir volume: mapa carregado no boot, ambiente e
  // trilha simultaneos, e nenhuma dependencia de carregamento sob demanda.
  await page.evaluate(() => {
    window.estado.relogio.definir(12 * 60);
    window.game.scene.getScene('FarmScene').scene.restart({ mapa: 'farm' });
  });
  await page.waitForFunction(() => window.estado.mapa === 'farm' && window.game.scene.getScene('FarmScene').pronto);
  await esperarAmbiente('amb_cidade');
  await esperarTrilha('mus_cidade');
  await page.waitForTimeout(1200);

  // pela tela de opcoes: master a zero silencia tudo e persiste
  await page.evaluate(() => window.game.scene.getScene('FarmScene').scene.launch('MenuScene', { pagina: 'som' }));
  await page.waitForFunction(() => window.game.scene.isActive('MenuScene'));
  for (let i = 0; i < 10; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(70); }
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:settings')).master), 0);
  const mudo = await mixer();
  assert(mudo.tocando.every((s) => s.volume === 0), `camada continuou audivel com master zero: ${JSON.stringify(mudo.tocando)}`);
  checks.push('master zero silencia as camadas e fica salvo');

  // e volta ao subir de novo
  for (let i = 0; i < 7; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(70); }
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => Math.round(JSON.parse(localStorage.getItem('meu-jogo:settings')).master * 10)), 7);
  const devolta = await mixer();
  assert(devolta.tocando.some((s) => s.volume > 0), 'as camadas nao voltaram a soar');
  checks.push('volume volta a subir pela mesma tela');

  // um barramento sozinho: musica a zero nao mexe no ambiente
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(120);
  for (let i = 0; i < 10; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(70); }
  await page.waitForTimeout(400);
  const soMusica = await mixer();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-jogo:settings')).musica), 0);
  assert.equal(soMusica.camadaMusica?.volume, 0, `a trilha nao silenciou: ${JSON.stringify(soMusica)}`);
  assert(soMusica.camadaAmbiente?.volume > 0, `o ambiente silenciou junto com a trilha: ${JSON.stringify(soMusica)}`);
  checks.push('barramento de musica isolado do de ambiente');

  // reload: os volumes salvos valem desde o boot
  await page.reload();
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await expor();
  const depois = await page.evaluate(() => ({ master: window.estado.preferencias.valores.master, musica: window.estado.preferencias.valores.musica }));
  assert.equal(Math.round(depois.master * 10), 7);
  assert.equal(depois.musica, 0);
  await page.waitForFunction(() => {
    const som = window.somTeste;
    const trilha = window.game.sound.sounds.find((s) => s.key === som.musicaAtual);
    return som.musicaAtual === null || (trilha && trilha.volume === 0);
  });
  checks.push('volumes salvos valem desde o boot');

  const avisosDeSom = warnings.filter((t) => t.includes('[som]'));
  assert.deepEqual(avisosDeSom, [], 'houve aviso de som ausente');
  assert.deepEqual(errors, []);
  fs.writeFileSync('docs/evidence/audio-browser.json', `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(`[audio browser] ${checks.length} conferencias passaram`);

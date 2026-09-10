/**
 * Clima e encontro vistos no jogo, e nao na tabela.
 *
 * Sao tres perguntas que so o jogo responde: a chuva realmente tira gente da
 * rua (o motor de rotinas roda com a rotina ajustada), o encontro de sabado
 * realmente junta gente dentro do bar, e o quadro da praca anuncia o encontro
 * do dia.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.setDefaultTimeout(30000);
const errors = []; const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

const checks = [];
/**
 * Poe o jogo num dia/hora/clima e devolve quem esta visivel em cada mapa.
 *
 * O motor escolhe a rotina UMA vez por dia, na virada, entao mudar o dia exige
 * reiniciar a cena: e o que `scene.restart` faz aqui.
 */
const retrato = async (dia, hora, clima, mapa) => {
  await page.evaluate(([d, h, c, m]) => {
    window.estado.dia = d;
    window.estado.relogio.definir(h * 60);
    window.estado.clima.definir(d, c);
    window.game.scene.getScene('FarmScene').scene.restart({ mapa: m });
  }, [dia, hora, clima, mapa]);
  await page.waitForFunction((m) => window.estado.mapa === m && window.game.scene.getScene('FarmScene').pronto, mapa);
  await page.waitForTimeout(900);
  return page.evaluate(() => {
    const npcs = window.estado.rotinasNpc.todos;
    return {
      naRua: npcs.filter((n) => n.visivel).map((n) => n.id),
      dentro: npcs.filter((n) => n.dentro).map((n) => `${n.id}@${n.dentro}`),
    };
  });
};

try {
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => window.game?.scene.isActive('MenuScene'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // ------------------------------------------------------- chuva esvazia a rua
  //
  // Dois dias DIFERENTES da mesma quarta-feira (2 e 9): o motor escolhe a rotina
  // uma vez por dia, na virada, entao repetir o mesmo dia com outro clima nao
  // troca rotina nenhuma — o retrato sairia igual e o teste passaria por engano.
  const limpo = await retrato(2, 15, 'Limpo', 'bairro');
  const chuva = await retrato(9, 15, 'Chuva', 'bairro');
  assert(limpo.naRua.length > 0, 'ninguem na rua do bairro num dia limpo');
  assert(
    chuva.naRua.length < limpo.naRua.length,
    `a chuva nao tirou ninguem da rua: ${limpo.naRua.length} -> ${chuva.naRua.length}`,
  );
  checks.push(`bairro as 15:00: ${limpo.naRua.length} na rua com tempo limpo, ${chuva.naRua.length} com chuva`);

  // ------------------------------------------------------- sabado no bar
  // Dia 5 e sabado (dia 0 do jogo e segunda). As 20:00 o encontro esta em curso.
  const sabado = await retrato(5, 20, 'Limpo', 'bar');
  const noBar = sabado.dentro.filter((s) => s.endsWith('@bar'));
  assert(noBar.length >= 3, `o encontro de sabado juntou pouca gente no bar: ${JSON.stringify(sabado.dentro)}`);
  checks.push(`sabado 20:00: ${noBar.length} pessoas dentro do bar (${noBar.join(', ')})`);
  await page.locator('canvas').screenshot({ path: 'docs/evidence/social-sabado-bar.png' });

  // e numa quarta a mesma hora o bar nao tem plateia
  const quarta = await retrato(16, 20, 'Limpo', 'bar');
  const quartaNoBar = quarta.dentro.filter((s) => s.endsWith('@bar'));
  assert(
    quartaNoBar.length < noBar.length,
    `o bar tem a mesma gente na quarta (${quartaNoBar.length}) e no sabado (${noBar.length})`,
  );
  checks.push(`quarta 20:00: ${quartaNoBar.length} pessoas no bar — o encontro e do sabado`);

  // ------------------------------------------------------- domingo na praca
  const domingo = await retrato(6, 11, 'Limpo', 'farm');
  const naPraca = await page.evaluate(() => window.estado.rotinasNpc.todos
    .filter((n) => n.visivel && n.mapaAtual === 'farm' && n.x > 48 && n.x < 58 && n.y > 47 && n.y < 52)
    .map((n) => n.id));
  assert(naPraca.length >= 3, `o domingo na praca juntou pouca gente: ${JSON.stringify(domingo.naRua)}`);
  checks.push(`domingo 11:00: ${naPraca.length} pessoas na praca sudoeste (${naPraca.join(', ')})`);
  await page.locator('canvas').screenshot({ path: 'docs/evidence/social-domingo-praca.png' });

  // ------------------------------------------------------- quadro anuncia
  await page.evaluate(() => {
    const f = window.game.scene.getScene('FarmScene');
    f.player.setPosition(51.5 * 32, 44.5 * 32);
    f.direcao = 'up';
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const fala = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    return { aberta: ui.dialogoAberto === true, nome: ui.dialogoNome?.text ?? '', texto: ui.dialogoTexto?.text ?? '' };
  });
  assert(fala.aberta, 'o quadro de avisos nao abriu');
  // a primeira pagina e o cabecalho; a segunda tem de ser o encontro do dia
  await page.keyboard.press('e');
  await page.waitForTimeout(250);
  const segunda = await page.evaluate(() => {
    const ui = window.game.scene.getScene('UIScene');
    return { nome: ui.dialogoNome?.text ?? '', texto: ui.dialogoTexto?.text ?? '' };
  });
  assert(
    /praca|bar|feira/i.test(segunda.texto) || /Domingo|Sabado|Feira/i.test(segunda.nome),
    `o quadro nao anunciou o encontro do dia: ${JSON.stringify(segunda)}`,
  );
  checks.push(`quadro de avisos anuncia o encontro do dia ("${segunda.nome}")`);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  fs.writeFileSync('docs/evidence/social-browser.json', `${JSON.stringify({ errors, warnings, checks }, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(`[social browser] ${checks.length} conferencias passaram`);

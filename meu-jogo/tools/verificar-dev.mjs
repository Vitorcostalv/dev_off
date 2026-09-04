/**
 * CONFERENCIA DO PAINEL DE DESENVOLVIMENTO.
 *
 * Uma coisa so, e ela e de seguranca: o painel de trapaca NAO pode ir junto no
 * jogo publicado. A Parte 77 pede isso, e e o tipo de regra que se cumpre no dia
 * em que se escreve e se quebra tres meses depois, quando alguem move o import
 * pro topo do arquivo pra "organizar".
 *
 * Sao tres checagens:
 *
 *  1. main.ts so carrega a DevScene DENTRO de um ramo `import.meta.env.DEV`;
 *  2. nenhum arquivo de `src/` fora da propria DevScene a importa no topo;
 *  3. se ja existe um `dist/` gerado, o nome da cena nao aparece nele.
 *
 * A terceira e a unica prova de verdade — as duas primeiras sao o que impede o
 * erro de acontecer, e a terceira e o que o pega se acontecer mesmo assim.
 *
 *     npm run verificar-dev
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

let checagens = 0;
const falhas = [];
const ok = (condicao, mensagem) => {
  checagens += 1;
  if (!condicao) falhas.push(mensagem);
};

// ------------------------------------------------- 1. o ramo em main.ts --
const main = readFileSync(join(RAIZ, 'src/main.ts'), 'utf8');
ok(main.includes('DevScene'), 'main.ts nao menciona a DevScene — o painel foi removido?');
{
  const i = main.indexOf('DevScene');
  const guarda = main.lastIndexOf('import.meta.env.DEV', i);
  ok(guarda >= 0, 'main.ts carrega a DevScene sem um `import.meta.env.DEV` antes');
  // o import tem de ser DINAMICO: `import(...)` estatico no topo entra no bundle
  // mesmo dentro de um `if`, porque import estatico nao e condicional
  ok(
    /import\(\s*['"]\.\/scenes\/DevScene['"]\s*\)/.test(main),
    'a DevScene tem de entrar por `import()` dinamico, nao por import estatico',
  );
  ok(
    !/^import .*DevScene.*$/m.test(main),
    'main.ts importa a DevScene no topo — isso a poe no bundle de producao',
  );
}

// ----------------------------------- 2. ninguem mais a importa estatico --
function arquivosDe(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivosDe(caminho));
    else if (/\.tsx?$/.test(nome)) saida.push(caminho);
  }
  return saida;
}
for (const caminho of arquivosDe(join(RAIZ, 'src'))) {
  if (caminho.endsWith('DevScene.ts')) continue;
  const texto = readFileSync(caminho, 'utf8');
  ok(
    !/^import[^\n]*DevScene/m.test(texto),
    `${caminho.replace(RAIZ, '.')} importa a DevScene no topo`,
  );
}

// ------------------------------------------------- 3. o bundle gerado --
const dist = join(RAIZ, 'dist', 'assets');
if (existsSync(dist)) {
  const js = readdirSync(dist).filter((n) => n.endsWith('.js'));
  ok(js.length > 0, 'dist/assets nao tem nenhum .js — o build saiu vazio?');
  for (const nome of js) {
    const texto = readFileSync(join(dist, nome), 'utf8');
    ok(
      !texto.includes('DevScene'),
      `o bundle ${nome} contem "DevScene": o painel de trapaca foi publicado`,
    );
    ok(
      !texto.includes('PAINEL DE DESENVOLVIMENTO'),
      `o bundle ${nome} contem o cabecalho do painel de desenvolvimento`,
    );
  }
  console.log(`  bundle conferido: ${js.length} arquivo(s) em dist/assets, sem a DevScene`);
} else {
  console.log('  dist/ nao existe: a conferencia do bundle foi pulada (rode `npm run build` antes)');
}

// -------------------------------- 4. o painel nao mistura as tres acoes --
/**
 * Teleportar, destravar checkpoint e marcar visitado sao TRES itens de menu
 * separados (Parte 48). A conferencia e textual e grossa de proposito: ela so
 * cobra que os tres rotulos existam e que o de teleporte nao ligue flag nenhuma.
 */
{
  const dev = readFileSync(join(RAIZ, 'src/scenes/DevScene.ts'), 'utf8');
  for (const trecho of ['Teleportar — chegada do andar', 'Destravar a parada DESTE andar']) {
    ok(dev.includes(trecho), `o painel perdeu o item "${trecho}"`);
  }
  const bloco = dev.slice(
    dev.indexOf('Teleportar — chegada do andar'),
    dev.indexOf('Destravar a parada DESTE andar'),
  );
  ok(
    !bloco.includes('flagDeCheckpoint') && !bloco.includes('flagDoEnigma'),
    'o item de teleporte esta ligando flag de progressao junto',
  );
}

if (falhas.length > 0) {
  console.error(`\n[dev] ${falhas.length} falha(s) em ${checagens} conferencias:`);
  for (const f of falhas) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`[dev] ${checagens} conferencias: passou`);

/**
 * Roda todas as conferencias de dominio (tools/verificar-*.mjs) em sequencia e
 * grava a evidencia agregada em docs/evidence/<rotulo>-tests.json.
 *
 * O rotulo vem do primeiro argumento (padrao: "controles"), pra cada etapa do
 * overhaul guardar o proprio retrato sem sobrescrever o anterior.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizFerramentas = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.dirname(raizFerramentas);
const rotulo = process.argv[2] ?? 'controles';

const arquivos = fs
  .readdirSync(raizFerramentas)
  .filter((nome) => nome.startsWith('verificar-') && nome.endsWith('.mjs') && nome !== 'verificar-tudo.mjs')
  .sort();

const resultados = [];
for (const file of arquivos) {
  const r = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', path.join(raizFerramentas, file)],
    { cwd: raiz, encoding: 'utf8' },
  );
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  resultados.push({ file, status: r.status ?? 1, output });
  console.log(`${r.status === 0 ? '[ok]  ' : '[FALHA]'} ${file}`);
  if (r.status !== 0) process.stdout.write(output);
}

const destino = path.join(raiz, 'docs', 'evidence', `${rotulo}-tests.json`);
fs.writeFileSync(destino, `${JSON.stringify(resultados, null, 2)}\n`);

const falhas = resultados.filter((r) => r.status !== 0);
console.log(`[verificar-tudo] ${resultados.length - falhas.length}/${resultados.length} conferencias passaram -> ${path.relative(raiz, destino)}`);
if (falhas.length) process.exit(1);

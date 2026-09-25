import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SistemaArquivo, FICHAS, TOTAL_DOCUMENTOS, REGISTROS_PSICOTERAPIA, buscarRegistroPsicoterapia } from '../src/game/fichas.ts';
import { normalizeSave, migrateSave } from '../src/game/SaveMigration.ts';

assert.equal(TOTAL_DOCUMENTOS, 200);
assert.equal(FICHAS.length, 50);
assert.deepEqual(REGISTROS_PSICOTERAPIA.map(r => r.numero), Array.from({ length: 150 }, (_, i) => i + 51));
const fonte = fs.readFileSync(new URL('../docs/narrativa-fontes/registros-051-200.txt', import.meta.url), 'utf8');
const originais = new Map([...fonte.matchAll(/^(\d+)\. (.+)$/gm)].map(m => [Number(m[1]), m[2].trim()]));
for (const r of REGISTROS_PSICOTERAPIA) {
  if (![141, 173].includes(r.numero)) assert.equal(r.texto, originais.get(r.numero), `Texto autoral ${r.numero}`);
}
assert(!buscarRegistroPsicoterapia(141).texto.includes('falecimento'));
assert(buscarRegistroPsicoterapia(142).texto.includes('Ela morreu'));
assert(buscarRegistroPsicoterapia(173).texto.includes('dobrado em quatro'));

const arquivo = new SistemaArquivo();
assert.equal(arquivo.proximoRegistro(), null);
assert.deepEqual(arquivo.indicePsicoterapia(), []);
assert(!arquivo.concluirRegistro(51));
arquivo.coletar(50);
assert.equal(arquivo.proximoRegistro(), 51);
assert(!arquivo.coletar(200)); // Ficha física não é sessão de terapia.
assert(!arquivo.podeLerRegistro(200));
assert(!arquivo.concluirRegistro(52));
assert(!/esposa|filha|morte|luto|abuso/i.test(JSON.stringify(arquivo.indicePsicoterapia())));
for (let n = 51; n <= 200; n++) {
  assert.equal(arquivo.proximoRegistro(), n);
  assert(arquivo.concluirRegistro(n));
  assert(!arquivo.concluirRegistro(n));
  assert.equal(arquivo.quantosRegistros, n - 50);
  const restaurado = new SistemaArquivo();
  restaurado.restaurar(normalizeSave({ arquivo: arquivo.serializar() }).arquivo);
  assert.deepEqual(restaurado.serializar(), arquivo.serializar(), `Save após ${n}`);
}
assert.equal(arquivo.proximoRegistro(), null);
assert(arquivo.podeLerRegistro(51));
assert.equal(arquivo.quantasFichas, 1);
assert.equal(arquivo.quantas, 151);

const legado = migrateSave({ versao: 6, arquivo: [1, 10, 50] });
arquivo.restaurar(legado.arquivo);
assert.deepEqual(arquivo.serializar(), [1, 10, 50]);
assert.equal(arquivo.proximoRegistro(), 51);
arquivo.restaurar([200, 52, 50, 51, 54, 52, -1, 201, null]);
assert.deepEqual(arquivo.serializar(), [50, 51, 52]);
arquivo.restaurar([51, 52, 200]);
assert.deepEqual(arquivo.serializar(), []);
console.log('Psicoterapia: 150 textos, revelações, sequência completa, releitura, save, legado e dados corrompidos conferidos.');

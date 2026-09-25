import fs from 'node:fs';

// Fonte autoral preservada; somente parágrafos numerados entram no jogo.
const fonte = fs.readFileSync(new URL('../docs/narrativa-fontes/registros-051-200.txt', import.meta.url), 'utf8');
const registros = [...fonte.matchAll(/^(\d+)\. (.+)$/gm)].map((m) => ({ numero: Number(m[1]), texto: m[2].trim() }));
if (registros.length !== 150 || registros.some((r, i) => r.numero !== i + 51)) {
  throw new Error('A fonte deve conter exatamente os registros 51–200, em ordem, sem lacunas.');
}
// Edições de continuidade documentadas em narrativa-consolidada.md.
registros.find(r => r.numero === 141).texto = 'Questionado sobre o que aconteceu depois, pede mudança de assunto. Solicitação respeitada.';
registros.find(r => r.numero === 173).texto = registros.find(r => r.numero === 173).texto.replace('dobrado quatro vezes', 'dobrado em quatro');
const saida = `// Gerado por tools/importar-psicoterapia.mjs a partir da fonte autoral.\n// Não atribuir datas nem confundir número de registro com andar existente.\nexport const REGISTROS_PSICOTERAPIA: readonly { numero: number; texto: string }[] = ${JSON.stringify(registros, null, 2)};\n`;
fs.writeFileSync(new URL('../src/game/registrosPsicoterapia.ts', import.meta.url), saida, 'utf8');
console.log('150 registros importados; notas editoriais excluídas; duas edições de continuidade aplicadas.');

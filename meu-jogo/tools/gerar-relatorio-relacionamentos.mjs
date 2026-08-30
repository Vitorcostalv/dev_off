import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MORADORES, CASAS_OCUPADAS, CASAS_VAZIAS, TERRENO_FUTURO } from '../src/game/moradores.ts';
import { NPCS } from '../src/game/npcs.ts';
import { MISSOES_NPC } from '../src/game/missoesNpc.ts';
import { ENCONTROS_NPC } from '../src/game/encontrosNpc.ts';

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const linhas = [];
const add = (...itens) => linhas.push(...itens);

const ORIGINAIS = {
  edu: ['Irma mora fora e liga com frequencia.', 'Leticia: afinidade silenciosa nas caminhadas.', 'Mari: brincadeira recorrente sobre ele nao treinar.', 'Priscila: colega de trabalho remoto.'],
  mari: ['Leticia: irmas; afeto com atrito sobre ritmo e rumo.', 'Edu: provoca sobre a academia.', 'Rafael: parceria profissional entre treino e fisioterapia.', 'Hiago: implicancia amigavel sobre corrida.'],
  jaqueline: ['Luke: mae e responsavel; marido existe fora do elenco visual.', 'Alice: amiga de fofoca leve e confiavel.', 'Samanta: troca noticias sem expor assuntos serios.', 'Davi e Neide: fornecedores e conhecidos do mercado.'],
  leticia: ['Mari: irma; afeto com tensao leve.', 'Edu: companhia contemplativa de caminhada.', 'Lucia: amiga de fotografia de rua.'],
  wendel: ['Esposa falecida; a missao do HD preserva essa memoria.', 'Alice: amizade antiga, com provocacoes toleradas.'],
  alice: ['Filha mora fora do elenco atual.', 'Wendel: amigo antigo.', 'Jaqueline: amiga e parceira de fofoca leve.', 'Vitor: funcionario e musico do bar.', 'Davi e Suzan: colaboradores de comida e eventos.'],
  luke: ['Jaqueline: mae e responsavel.', 'Crianca: amizade com protagonista, sem romance.'],
  hiago: ['Vitor: irmao mais velho e colega de casa.', 'Mari: rivalidade amigavel de treino.', 'Julia: colega da mobilidade urbana.'],
  vitor: ['Hiago: irmao mais novo e colega de casa.', 'Alice: chefe e amiga do bar.', 'Lucia e Suzan: colegas de audio e producao cultural.'],
};

add('# Relatorio completo de relacionamentos', '',
  `Total jogavel: **${Object.keys(NPCS).length + Object.keys(MORADORES).length} NPCs nomeados** (${Object.keys(NPCS).length} originais + ${Object.keys(MORADORES).length} novos).`, '',
  'O score com o protagonista vai de -12 a 12 para todos. Criancas, casados e personagens marcados sem romance usam os rotulos sociais `Confianca profunda` e `Amizade de familia` nos dois tiers superiores. Romance continua separado e so fica habilitado nos perfis apropriados.', '',
  '## Elenco original e vinculos', '');
for (const npc of Object.values(NPCS)) {
  add(`### ${npc.nome} (ID: ${npc.id})`, '', `- Residencia: ${npc.casa}.`, ...ORIGINAIS[npc.id].map((r) => `- ${r}`), '');
}

add('## Novos moradores, familias e rede social', '');
for (const morador of Object.values(MORADORES)) {
  add(`### ${morador.nome} (ID: ${morador.id})`, '',
    `- ${morador.idade} anos; ${morador.profissao}; ${morador.estadoCivil}.`,
    `- Casa: ${morador.casa} no Mapa ${morador.mapaResidencia === 'bairro' ? '2' : '3'}. Familia: ${morador.familia}.`,
    `- Protagonista: relacionamento completo; romance ${morador.romancePermitido ? 'permitido' : 'bloqueado (vinculo social)'}.`,
    ...morador.relacoes.map((r) => `- ${MORADORES[r.com]?.nome ?? NPCS[r.com]?.nome ?? r.com} — **${r.tipo}**: ${r.detalhe}.`),
    '');
}

const porCasa = Object.values(MORADORES).reduce((mapa, m) => {
  (mapa[m.casa] ??= []).push(m.nome); return mapa;
}, {});
add('## Ocupacao residencial', '');
for (const casa of CASAS_OCUPADAS) add(`- ${casa}: ${porCasa[casa].join(', ')}.`);
add(`- Casas preservadas vazias: ${CASAS_VAZIAS.join(', ')}.`,
  `- Terreno preservado para expansao: ${TERRENO_FUTURO}.`, '');

add('## Missoes e efeito no relacionamento', '');
for (const m of MISSOES_NPC) {
  add(`- **${m.titulo}** (${NPCS[m.npcId].nome}): requisito ${m.requisitoRelacao}; ${m.tipo}; recompensa R$ ${(m.recompensa/100).toFixed(2).replace('.', ',')}; +${m.bonusRelacao} de relacao; flag ${m.worldEvent}.`);
}

add('', '## Encontros ambientais', '');
for (const encontro of ENCONTROS_NPC) {
  add(`- **${encontro.participantes.map((id) => NPCS[id]?.nome ?? MORADORES[id]?.nome ?? id).join(' ↔ ')}**: ${encontro.falas.map((f) => `“${f.texto}”`).join(' / ')}`);
}
add('', 'Os encontros nao alteram o score do protagonista. A simulacao e a pausa acontecem independentemente dele; o balao so aparece dentro do alcance visual.', '');

writeFileSync(join(raiz, 'RELATORIO_RELACIONAMENTOS.md'), `${linhas.join('\n').trimEnd()}\n`);
console.log(`[relatorio] ${Object.keys(NPCS).length + Object.keys(MORADORES).length} NPCs documentados em RELATORIO_RELACIONAMENTOS.md`);

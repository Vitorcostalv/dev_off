import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Carteira } from '../src/game/dinheiro.ts';
import { SistemaRelacoes } from '../src/game/relacoes.ts';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';
import { SistemaMissoesNpc, MISSOES_NPC } from '../src/game/missoesNpc.ts';
import { MORADORES, CRIANCAS, atividadeAtual } from '../src/game/moradores.ts';
import { ITENS } from '../src/game/inventario.ts';
import { SistemaEncontrosNpc, jogadorOuveEncontro } from '../src/game/encontrosNpc.ts';

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ok = (condicao, mensagem) => { if (!condicao) throw new Error(mensagem); };

ok(Object.keys(MORADORES).length === 24, `esperados 24 moradores, recebidos ${Object.keys(MORADORES).length}`);
ok(MISSOES_NPC.length === 6, 'precisa haver seis missoes pessoais');
ok(new Set(MISSOES_NPC.map((m) => m.worldEvent)).size === 6, 'flags de missao precisam ser unicas');
ok(MISSOES_NPC.every((m) => m.recompensa > 32000), 'toda missao deve pagar mais que uma vaga comum');
ok((MISSOES_NPC.find((m) => m.npcId === 'wendel')?.requisitoRelacao ?? 0) > Math.max(...MISSOES_NPC.filter((m) => m.npcId !== 'wendel').map((m) => m.requisitoRelacao)), 'Wendel precisa do maior requisito');

const casasPorMapa = (mapa) => {
  const tilemap = JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'tilemaps', `${mapa}.json`), 'utf8'));
  const zonas = tilemap.layers.find((camada) => camada.name === 'zonas')?.objects ?? [];
  return new Map(zonas
    .filter((zona) => zona.class === 'casa')
    .map((zona) => [
      zona.name,
      Object.fromEntries((zona.properties ?? []).map((prop) => [prop.name, prop.value])).construida === true,
    ]));
};
const casasBairro = casasPorMapa('bairro');
const casasRurais = casasPorMapa('rural');
for (const id of ['casa_b1', 'casa_b2', 'casa_b3', 'casa_b4', 'casa_b5', 'casa_b6', 'casa_b7', 'casa_c1', 'casa_c2']) {
  ok(casasBairro.get(id) === true, `${id}: residencia ocupada nao foi construida`);
}
for (const id of ['casa_b8', 'casa_c3', 'casa_c4']) {
  ok(casasBairro.get(id) === false, `${id}: lote reservado deveria continuar vazio`);
}
for (const id of ['casa_rural_1', 'casa_rural_2']) {
  ok(casasRurais.get(id) === true, `${id}: residencia rural nao foi construida`);
}

for (const morador of Object.values(MORADORES)) {
  ok(morador.personalidade.qualidades.length >= 3 && morador.personalidade.defeitos.length >= 2, `${morador.id}: personalidade rasa`);
  ok(morador.relacoes.length >= 2, `${morador.id}: menos de duas relacoes externas`);
  ok(morador.atividades.some((a) => a.fimDeSemana) && morador.atividades.some((a) => !a.fimDeSemana), `${morador.id}: falta variacao semanal`);
  ok(morador.preferencias.amado.length >= 2 && morador.preferencias.gosta.length >= 3 && morador.preferencias.nao_gosta.length >= 3, `${morador.id}: preferencias incompletas`);
  for (const id of [...morador.preferencias.amado, ...morador.preferencias.gosta, ...(morador.preferencias.neutro ?? []), ...morador.preferencias.nao_gosta]) {
    ok(Boolean(ITENS[id]), `${morador.id}: presente inexistente "${id}"`);
  }
  const todosPresentes = [...morador.preferencias.amado, ...morador.preferencias.gosta, ...(morador.preferencias.neutro ?? []), ...morador.preferencias.nao_gosta];
  ok(new Set(todosPresentes).size === todosPresentes.length, `${morador.id}: item repetido entre tiers de presente`);
  ok(existsSync(join(raiz, 'public', morador.sprite.arquivo)), `${morador.id}: sprite de caminhada ausente`);
  ok(existsSync(join(raiz, 'public', morador.spriteParado.arquivo)), `${morador.id}: sprite parado ausente`);
}
for (const id of CRIANCAS) ok(MORADORES[id].romancePermitido === false, `${id}: crianca entrou no romance`);

// Dois moradores realmente consultados em horarios diferentes, como a cena faz.
ok(atividadeAtual(MORADORES.clara, 0, 10 * 60)?.atividade === 'turno na biblioteca', 'rotina da Clara nao abriu');
ok(atividadeAtual(MORADORES.helena, 0, 15 * 60)?.atividade === 'quadra e amigos', 'rotina da Helena nao chegou ao lazer');
ok(MORADORES.clara.dialogoAtual.length >= 3 && MORADORES.helena.dialogoAtual.length >= 3, 'dialogo basico ausente');

// Duas missoes ponta a ponta: estado, dinheiro, relacao, flag e persistencia.
const carteira = new Carteira();
const relacoes = new SistemaRelacoes();
const worldEvents = new SistemaWorldEvents();
const missoes = new SistemaMissoesNpc();
const destino = { carteira, relacoes, worldEvents };
const saldoInicial = carteira.saldo;
for (const id of ['edu_notebook', 'mari_equipamento']) {
  ok(missoes.iniciar(id), `${id}: nao iniciou`);
  const missao = missoes.concluirComRecompensas(id, destino);
  ok(Boolean(missao), `${id}: nao concluiu`);
  ok(worldEvents.ativa(missao.worldEvent), `${id}: flag nao ativou`);
  ok(relacoes.getScore(missao.npcId) === missao.bonusRelacao, `${id}: bonus de relacao incorreto`);
  ok(missoes.concluirComRecompensas(id, destino) === null, `${id}: permitiu repetir`);
}
ok(carteira.saldo === saldoInicial + 42000 + 44000, 'pagamento das duas missoes incorreto');
const restauradas = new SistemaMissoesNpc();
restauradas.restaurar(missoes.serializar());
ok(restauradas.estado('edu_notebook') === 'concluida' && restauradas.estado('mari_equipamento') === 'concluida', 'save de missoes nao restaurou');

// O mesmo encontro existe perto e longe; so a regra de visibilidade muda.
const estadoNpc = (id, x) => ({ id, x, y:10, dentro:null, visivel:true, acordado:true, movendo:true, direcao:'right', acaoAtual:'vagar', posto:null });
const encontros = new SistemaEncontrosNpc();
const pausados = encontros.atualizar(2, 16, [estadoNpc('edu',10), estadoNpc('leticia',11)], true);
ok(pausados.length === 2 && Boolean(encontros.ativo), 'encontro forcado nao iniciou');
ok(jogadorOuveEncontro(3), 'jogador perto deveria ver o balao');
ok(!jogadorOuveEncontro(30) && Boolean(encontros.ativo), 'jogador longe alterou a simulacao');

console.log(`[expansao] OK: ${Object.keys(MORADORES).length} moradores, 6 missoes, 2 fluxos completos e encontro perto/longe.`);

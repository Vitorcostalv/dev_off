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
import { atividadeComEmprego, PROJETOS_CIDADE, SistemaCidade } from '../src/game/cidade.ts';
import { MAPAS } from '../src/game/mapas.ts';

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ok = (condicao, mensagem) => { if (!condicao) throw new Error(mensagem); };

ok(Object.keys(MORADORES).length === 24, `esperados 24 moradores, recebidos ${Object.keys(MORADORES).length}`);
ok(MISSOES_NPC.length === 6, 'precisa haver seis missoes pessoais');
ok(new Set(MISSOES_NPC.map((m) => m.worldEvent)).size === 6, 'flags de missao precisam ser unicas');
ok(MISSOES_NPC.every((m) => m.recompensa > 32000), 'toda missao deve pagar mais que uma vaga comum');
ok((MISSOES_NPC.find((m) => m.npcId === 'wendel')?.requisitoRelacao ?? 0) > Math.max(...MISSOES_NPC.filter((m) => m.npcId !== 'wendel').map((m) => m.requisitoRelacao)), 'Wendel precisa do maior requisito');
ok(Object.keys(PROJETOS_CIDADE).length === 4, 'precisa haver quatro projetos urbanos');
ok(Object.values(PROJETOS_CIDADE).every((p) => p.mapa === 'bairro'), 'projeto urbano saiu do bairro/encostou na represa');

const atlasConstrucoes = JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'sprites', 'construcoes.atlas.json'), 'utf8'));
for (const projeto of Object.values(PROJETOS_CIDADE)) {
  ok(Boolean(atlasConstrucoes.frames[projeto.quadro]), `${projeto.id}: fachada nao entrou no atlas`);
  ok(projeto.candidatos.every((id) => Boolean(MORADORES[id])), `${projeto.id}: candidato inexistente`);
}
for (const folha of ['cafeteria', 'hospital', 'padaria', 'ponto_de_onibus']) {
  ok(existsSync(join(raiz, 'public', 'assets', 'sprites', `moveis_${folha}.png`)), `${folha}: PNG processado ausente`);
  ok(existsSync(join(raiz, 'public', 'assets', 'sprites', `moveis_${folha}.atlas.json`)), `${folha}: atlas processado ausente`);
}

const cidade = new SistemaCidade();
ok(!cidade.atribuir('cafeteria', 'lucia'), 'atribuiu antes de construir');
ok(cidade.construir('cafeteria') && cidade.atribuir('cafeteria', 'lucia'), 'fluxo construir/atribuir falhou');
ok(cidade.construir('hospital') && !cidade.atribuir('hospital', 'lucia'), 'aceitou profissional incompativel');
const turno = atividadeComEmprego(cidade, MORADORES.lucia, 0, 10 * 60, atividadeAtual(MORADORES.lucia, 0, 10 * 60));
ok(turno?.atividade === PROJETOS_CIDADE.cafeteria.atividade, 'emprego construido nao substituiu agenda util');
const cidadeRestaurada = new SistemaCidade();
cidadeRestaurada.restaurar(cidade.serializar());
ok(cidadeRestaurada.construido('cafeteria') && cidadeRestaurada.funcionario('cafeteria') === 'lucia', 'save da cidade nao restaurou');

const casasPorMapa = (mapa) => {
  const tilemap = JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'tilemaps', `${mapa}.json`), 'utf8'));
  const zonas = tilemap.layers.find((camada) => camada.name === 'zonas')?.objects ?? [];
  return new Map(zonas
    .filter((zona) => zona.class === 'casa')
    .map((zona) => [
      zona.name,
      Object.fromEntries((zona.properties ?? []).map((prop) => [prop.name, prop.value])),
    ]));
};
const casasBairro = casasPorMapa('bairro');
const casasRurais = casasPorMapa('rural');
for (const id of ['casa_b1', 'casa_b2', 'casa_b3', 'casa_b4', 'casa_b5', 'casa_b6', 'casa_b7', 'casa_c1', 'casa_c2']) {
  ok(casasBairro.get(id)?.construida === true, `${id}: residencia ocupada nao foi construida`);
  ok(casasBairro.get(id)?.mapaInterior === id, `${id}: residencia ocupada nao abre o proprio interior`);
}
for (const id of ['casa_b8', 'casa_c3', 'casa_c4']) {
  ok(casasBairro.get(id)?.construida === false, `${id}: lote reservado deveria continuar vazio`);
}
for (const id of ['casa_rural_1', 'casa_rural_2']) {
  ok(casasRurais.get(id)?.construida === true, `${id}: residencia rural nao foi construida`);
  ok(casasRurais.get(id)?.mapaInterior === id, `${id}: residencia rural nao abre o proprio interior`);
}
const casasOcupadas = [
  'casa_b1', 'casa_b2', 'casa_b3', 'casa_b4', 'casa_b5', 'casa_b6', 'casa_b7',
  'casa_c1', 'casa_c2', 'casa_rural_1', 'casa_rural_2',
];
for (const id of casasOcupadas) {
  ok(Boolean(MAPAS[id]), `${id}: interior nao registrado em MAPAS`);
  const interior = JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'tilemaps', `${id}.json`), 'utf8'));
  const moveis = interior.layers.find((camada) => camada.name === 'moveis')?.objects ?? [];
  const comodos = interior.layers.find((camada) => camada.name === 'comodos')?.objects ?? [];
  ok(moveis.length >= 24, `${id}: casa parece vazia (${moveis.length} moveis)`);
  ok(comodos.length >= 4, `${id}: casa sem divisao real de comodos`);
}

const moveisEsperados = new Set(['bruno', 'caio', 'clara', 'ilda', 'joao', 'julia', 'lucas', 'neide', 'samanta', 'suzan']);
for (const morador of Object.values(MORADORES)) {
  ok(
    morador.movimento === (moveisEsperados.has(morador.id) ? 'vagar' : 'parado'),
    `${morador.id}: movimento nao corresponde ao tipo de folha disponivel`,
  );
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

// --------------------------------------------------------------------------
// POSICAO DE CADA ATIVIDADE, contra o tilemap de verdade.
//
// Esta parte nao existia, e foi por isso que duas ancoras dentro de PAREDE
// entraram no repositorio sem ninguem notar: a compra de sabado dos 24
// moradores em (67,54), que e a fachada do mercado, e o expediente do Tulio em
// (50,64), dentro do predio central. O motor do Mapa 1 tem o equivalente disto
// em `verificar-rotinas`, que amostra os sete dias contra a grade.
//
// A regra e a mesma que `tileLivreParaMorador` aplica em jogo: o tile nao pode
// colidir na camada `objetos`, nao pode estar sob a pegada de um movel que nao
// seja peca de chao, e nao pode estar sob flora.
const RAIO_ESPALHAMENTO = 4; // igual ao da FarmScene
const mapasCarregados = new Map();
const carregarMapa = (nome) => {
  if (mapasCarregados.has(nome)) return mapasCarregados.get(nome);
  const bruto = JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'tilemaps', `${nome}.json`), 'utf8'));
  const tileset = bruto.tilesets[0];
  const lado = bruto.tilewidth;
  const colidem = new Set((tileset.tiles ?? [])
    .filter((t) => (t.properties ?? []).some((p) => p.name === 'collides' && p.value))
    .map((t) => t.id + tileset.firstgid));
  const objetos = bruto.layers.find((c) => c.name === 'objetos').data;
  // A pegada de um movel e ancorada na BASE (origem 0.5,1), como em criarMoveis.
  const emTile = (obj) => `${Math.floor((obj.x ?? 0) / lado)},${Math.floor(((obj.y ?? 0) - 1) / lado)}`;
  const moveis = new Set((bruto.layers.find((c) => c.name === 'moveis')?.objects ?? [])
    .filter((obj) => !(obj.properties ?? []).some((p) => p.name === 'chao' && p.value))
    .map(emTile));
  const flora = new Set((bruto.layers.find((c) => c.name === 'flora')?.objects ?? []).map(emTile));
  const dados = {
    largura: bruto.width,
    altura: bruto.height,
    livre: (x, y) => x >= 1 && y >= 1 && x < bruto.width - 1 && y < bruto.height - 1
      && !colidem.has(objetos[y * bruto.width + x])
      && !moveis.has(`${x},${y}`) && !flora.has(`${x},${y}`),
  };
  mapasCarregados.set(nome, dados);
  return dados;
};
/** Quantos moradores cabem em volta de uma ancora, contando o proprio tile. */
const vagasEmVolta = (mapa, x, y) => {
  const { livre } = carregarMapa(mapa);
  let vagas = 0;
  for (let dy = -RAIO_ESPALHAMENTO; dy <= RAIO_ESPALHAMENTO; dy++) {
    for (let dx = -RAIO_ESPALHAMENTO; dx <= RAIO_ESPALHAMENTO; dx++) {
      if (livre(x + dx, y + dy)) vagas += 1;
    }
  }
  return vagas;
};

let postosConferidos = 0;
for (const morador of Object.values(MORADORES)) {
  for (const atividade of morador.atividades) {
    ok(Boolean(MAPAS[atividade.mapa]), `${morador.id}: atividade "${atividade.atividade}" em mapa inexistente "${atividade.mapa}"`);
    ok(
      carregarMapa(atividade.mapa).livre(atividade.x, atividade.y),
      `${morador.id}: "${atividade.atividade}" cai em parede/movel/arvore ` +
        `em ${atividade.mapa} (${atividade.x},${atividade.y})`,
    );
    postosConferidos += 1;
  }
}

// AGLOMERACAO: em nenhum instante pode haver mais morador numa ancora do que
// tile livre em volta dela. Passar disso e o que empurrava os excedentes pro
// fallback de `posicaoInicialSegura`, que planta o NPC na propria ancora.
let picoAglomeracao = 0;
for (let dia = 0; dia < 7; dia++) {
  for (let minuto = 0; minuto < 24 * 60; minuto += 10) {
    const porAncora = new Map();
    for (const morador of Object.values(MORADORES)) {
      const atividade = atividadeAtual(morador, dia, minuto);
      if (!atividade) continue;
      const chave = `${atividade.mapa}:${atividade.x}:${atividade.y}`;
      porAncora.set(chave, (porAncora.get(chave) ?? 0) + 1);
    }
    for (const [chave, quantos] of porAncora) {
      if (quantos < 2) continue;
      picoAglomeracao = Math.max(picoAglomeracao, quantos);
      const [mapa, x, y] = chave.split(':');
      const vagas = vagasEmVolta(mapa, Number(x), Number(y));
      ok(
        vagas >= quantos,
        `dia ${dia} ${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}: ` +
          `${quantos} moradores na ancora ${chave}, que so tem ${vagas} tile(s) livre(s) em volta`,
      );
    }
  }
}

console.log(
  `[expansao] OK: ${Object.keys(MORADORES).length} moradores, 4 obras com atribuicao, 6 missoes, ` +
    `2 fluxos completos e encontro perto/longe; ${postosConferidos} postos conferidos no tilemap ` +
    `(pico de ${picoAglomeracao} moradores numa ancora).`,
);

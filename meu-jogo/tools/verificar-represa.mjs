import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Carteira } from '../src/game/dinheiro.ts';
import { Inventario } from '../src/game/inventario.ts';
import { ITENS } from '../src/game/inventario.ts';
import { MAPAS } from '../src/game/mapas.ts';
import { SistemaVida, HP_MAXIMO, INVULNERAVEL_MS } from '../src/game/vida.ts';
import {
  ATAQUE_DO_JOGADOR,
  CATALOGO_INIMIGOS,
  criarRuntimeInimigo,
  decidirInimigo,
  ferirInimigo,
} from '../src/game/inimigos.ts';
import {
  ATALHOS_REPRESA,
  FLAGS_DA_REPRESA,
  PAINEIS_REPRESA,
  PERDA_POR_DERROTA,
  SETORES_REPRESA,
  SistemaRepresa,
  TENSAO,
  dificuldadeDaTensao,
  iniciarPainel,
  opcoesAtuais,
  responderPainel,
  tentativasDe,
} from '../src/game/represa.ts';
import {
  IDS_DE_SUCATA,
  TABELAS_DE_SUCATA,
  buscarTabelaDeSucata,
  ehSucata,
  precoDeRevenda,
  sortearSucata,
  valorDeSucata,
  venderSucata,
} from '../src/game/sucata.ts';
import { ITENS_DE_LEITURA } from '../src/game/avisos.ts';
import { SistemaWorldEvents } from '../src/game/worldEvents.ts';

/**
 * Conferencia da REPRESA — o Mapa 4 e os cinco setores dele.
 *
 * A divisao de trabalho com as outras conferencias:
 *
 *  - `tools/gerar-assets.mjs` prova a GEOMETRIA na hora de gerar (comodo sobre
 *    tile livre, tudo alcancavel, par de porta, escuridao crescendo);
 *  - `verificar-mapas` prova a topologia dos externos e desvia dos setores;
 *  - AQUI se prova a REGRA DE JOGO: que a resposta de todo enigma esta escrita
 *    em algum documento do mapa, que nenhum inimigo mata o jogador cheio num
 *    golpe, que a IA persegue, desiste e para de atacar depois de morta, que a
 *    tabela de salvado melhora com a profundidade, que a revenda nao duplica
 *    dinheiro e que a derrota nao encosta em nada critico.
 *
 * Ela roda sem navegador de proposito: a IA e os enigmas sao funcoes puras
 * (`decidirInimigo`, `responderPainel`), e por isso da pra provar o
 * comportamento deles sem cena, sem fisica e sem tela.
 */

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..');
let conferencias = 0;
const ok = (condicao, mensagem) => {
  conferencias += 1;
  if (!condicao) throw new Error(`FALHOU: ${mensagem}`);
};

const lerMapa = (chave) =>
  JSON.parse(readFileSync(join(raiz, 'public', 'assets', 'tilemaps', `${chave}.json`), 'utf8'));
const camada = (mapa, nome) => mapa.layers.find((c) => c.name === nome);
const objetos = (mapa, nome) => camada(mapa, nome)?.objects ?? [];
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const classe = (o) => o.class || o.type || '';

// =========================================================== 1. topologia ==
/**
 * O mundo tem de ser uma ESTRELA com o Mapa 1 no centro, e a ponta sul do Mapa 1
 * tem de continuar vazia. A conferencia le os tilemaps gerados, nao as tabelas
 * do gerador: e o unico jeito de pegar um `npm run gerar-assets` esquecido.
 */
const LIGACOES_ESPERADAS = [
  ['farm', 'borda_oeste', 'bairro'],
  ['bairro', 'borda_leste', 'farm'],
  ['farm', 'borda_leste', 'rural'],
  ['rural', 'borda_oeste', 'farm'],
  ['farm', 'borda_norte', 'represa'],
  ['represa', 'borda_sul', 'farm'],
];

const bordasPorMapa = new Map();
for (const chave of ['farm', 'bairro', 'rural', 'represa']) {
  const mapa = lerMapa(chave);
  bordasPorMapa.set(
    chave,
    objetos(mapa, 'bordas').map((o) => ({
      nome: o.name,
      // posicao da PROPRIA zona no mapa dela, em tiles
      y: Math.round((o.y ?? 0) / mapa.tileheight),
      destino: String(props(o).destino),
      tx: Number(props(o).destinoTx),
      ty: Number(props(o).destinoTy),
    })),
  );
}

const totalDeclaradas = [...bordasPorMapa.values()].reduce((n, l) => n + l.length, 0);
ok(
  totalDeclaradas === LIGACOES_ESPERADAS.length,
  `esperava ${LIGACOES_ESPERADAS.length} zonas de transicao no mundo, achei ${totalDeclaradas}`,
);
for (const [mapa, nome, destino] of LIGACOES_ESPERADAS) {
  const b = bordasPorMapa.get(mapa)?.find((x) => x.nome === nome);
  ok(Boolean(b), `${mapa}: falta a zona de transicao "${nome}"`);
  ok(b.destino === destino, `${mapa}/${nome} aponta pra "${b.destino}", esperava "${destino}"`);
  const alvo = lerMapa(destino);
  ok(
    b.tx >= 0 && b.ty >= 0 && b.tx < alvo.width && b.ty < alvo.height,
    `${mapa}/${nome} chega fora de "${destino}"`,
  );
}
// a ponta SUL do Mapa 1 continua reservada
ok(
  !bordasPorMapa.get('farm').some((b) => b.y > 80 || b.nome === 'borda_sul'),
  'a ponta sul do Mapa 1 ganhou zona de transicao — ela e reserva pro mapa futuro',
);
// e a ligacao antiga Mapa 2 <-> Mapa 3 nao voltou
ok(
  !bordasPorMapa.get('bairro').some((b) => b.destino === 'rural'),
  'a ligacao direta Mapa 2 -> Mapa 3 voltou; o mundo tem de ser estrela no Mapa 1',
);
ok(
  !bordasPorMapa.get('rural').some((b) => b.destino === 'bairro'),
  'a ligacao direta Mapa 3 -> Mapa 2 voltou',
);
// a interdicao visivel do sul existe no mapa
const avisosFarm = objetos(lerMapa('farm'), 'interativos').filter(
  (o) => classe(o) === 'placa' && props(o).aviso === 'estrada_sul',
);
ok(avisosFarm.length === 1, 'falta a placa de interdicao na ponta sul do Mapa 1');
ok(
  Array.isArray(ITENS_DE_LEITURA.estrada_sul) && ITENS_DE_LEITURA.estrada_sul.length >= 2,
  'a interdicao do sul nao tem texto de exame — ela leria como parede sem motivo',
);

/**
 * TODO objeto de exame do mundo tem texto.
 *
 * Vale pros quatro mapas externos e pros cinco setores, e nao so pra represa: a
 * placa muda ("Isto e uma placa. Nao tem nada escrito nela ainda.") e o tipo de
 * regressao que passa despercebida — o objeto existe, o prompt aparece, o
 * jogador aperta E e recebe o texto de placeholder.
 */
{
  const semTexto = [];
  const todosOsMapas = ['farm', 'bairro', 'rural', 'represa', ...SETORES_REPRESA.map((s) => s.chave)];
  let avisos = 0;
  for (const chave of todosOsMapas) {
    for (const o of objetos(lerMapa(chave), 'interativos')) {
      if (classe(o) !== 'placa') continue;
      const id = props(o).aviso;
      // a placa de teste do Mapa 1 nao carrega `aviso`: ela tem texto proprio
      if (id === undefined) continue;
      avisos += 1;
      const linhas = ITENS_DE_LEITURA[String(id)];
      if (!Array.isArray(linhas) || linhas.length === 0) semTexto.push(`${chave}/${id}`);
    }
  }
  ok(semTexto.length === 0, `aviso(s) sem texto em ITENS_DE_LEITURA: ${semTexto.join(', ')}`);
  ok(avisos >= 20, `poucos objetos de exame no mundo (${avisos})`);
}

// ============================================================ 2. setores ==
const setores = new Map(SETORES_REPRESA.map((s) => [s.chave, s]));
for (const setor of SETORES_REPRESA) {
  ok(Boolean(MAPAS[setor.chave]), `${setor.chave}: nao esta registrado em MAPAS`);
  ok(
    MAPAS[setor.chave].mapaExterno === 'represa',
    `${setor.chave}: mapaExterno deveria ser "represa"`,
  );
}

/** Grafo de portas dos cinco setores, lido dos tilemaps. */
const portasDoSetor = new Map();
for (const setor of SETORES_REPRESA) {
  const mapa = lerMapa(setor.chave);
  const portas = objetos(mapa, 'interativos')
    .filter((o) => classe(o) === 'porta')
    .map((o) => ({ nome: o.name, ...props(o) }));
  portasDoSetor.set(setor.chave, portas);
  ok(portas.length >= 2, `${setor.chave}: setor com menos de duas portas`);
}

// o nivel 0 e o unico que sai pra rua
for (const setor of SETORES_REPRESA) {
  const praRua = portasDoSetor.get(setor.chave).filter((p) => p.destino === 'represa');
  ok(
    praRua.length === (setor.nivel === 0 ? 1 : 0),
    `${setor.chave}: ${praRua.length} porta(s) pra rua (o nivel 0 tem 1, os outros 0)`,
  );
}

// toda porta entre setores tem par de volta
for (const [chave, portas] of portasDoSetor) {
  for (const porta of portas) {
    if (porta.destino === 'represa') continue;
    ok(setores.has(porta.destino), `${chave}/${porta.nome}: destino "${porta.destino}" nao e setor`);
    const volta = portasDoSetor.get(porta.destino).some((p) => p.destino === chave);
    ok(volta, `${chave}/${porta.nome}: "${porta.destino}" nao tem porta de volta`);
  }
}

/**
 * A trava DECLARADA (`SetorRepresa.exige`) tem de bater com a trava que esta no
 * tilemap, na porta que DESCE pra aquele setor. Sem esta conferencia as duas
 * podem divergir em silencio: o jogo barraria por uma flag e a tabela diria
 * outra, e o relatorio de progressao ficaria mentindo.
 */
for (const setor of SETORES_REPRESA) {
  if (setor.nivel === 0) continue;
  const acima = SETORES_REPRESA.find((s) => s.nivel === setor.nivel + 1);
  const descida = portasDoSetor.get(acima.chave).find((p) => p.destino === setor.chave);
  ok(Boolean(descida), `${acima.chave}: nao ha porta descendo pro ${setor.chave}`);
  const trava = descida.trancada ?? null;
  ok(
    trava === setor.exige,
    `${setor.chave}: a porta de descida exige "${trava}" e a tabela declara "${setor.exige}"`,
  );
}

// os dois ATALHOS existem como porta trancada em algum setor
for (const flag of ATALHOS_REPRESA) {
  const achou = [...portasDoSetor.values()].some((portas) =>
    portas.some((p) => p.trancada === flag),
  );
  ok(achou, `o atalho "${flag}" nao esta em porta nenhuma`);
}
// e o atalho da manutencao tem a alavanca que o abre no OUTRO lado
{
  const alavanca = PAINEIS_REPRESA.find((p) => p.flag === 'represaAtalhoManutencao');
  ok(Boolean(alavanca), 'nao ha painel que abra o atalho da manutencao');
  const portaTrancada = [...portasDoSetor.entries()].find(([, portas]) =>
    portas.some((p) => p.trancada === 'represaAtalhoManutencao'),
  );
  ok(
    portaTrancada[0] !== alavanca.setor,
    'a alavanca do atalho esta no MESMO setor da porta que ela abre — o atalho nao teria graca',
  );
}

// a escuridao cresce com a profundidade, e o nivel 0 e claro
const porProfundidade = [...SETORES_REPRESA].sort((a, b) => b.nivel - a.nivel);
ok(porProfundidade[0].escuridao === 0, 'o nivel 0 nao devia escurecer: e a zona segura');
for (let i = 1; i < porProfundidade.length; i++) {
  ok(
    porProfundidade[i].escuridao > porProfundidade[i - 1].escuridao,
    `escuridao nao cresce do nivel ${porProfundidade[i - 1].nivel} pro ${porProfundidade[i].nivel}`,
  );
}

// o valor de escuridao do tilemap bate com a tabela do jogo
for (const setor of SETORES_REPRESA) {
  const comodos = objetos(lerMapa(setor.chave), 'comodos');
  ok(comodos.length > 0, `${setor.chave}: nenhum comodo na camada`);
  const valores = comodos.map((c) => Number(props(c).escuridao));
  ok(
    valores.every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
    `${setor.chave}: comodo com escuridao invalida`,
  );
  ok(
    valores.some((v) => v === setor.escuridao),
    `${setor.chave}: nenhum comodo usa a escuridao base ${setor.escuridao} declarada em represa.ts`,
  );
}

// ============================================== 3. zona segura e inimigos ==
/**
 * ZONA SEGURA: o nivel 0 nao tem inimigo, e nenhum dos mapas 1, 2 e 3 tem.
 * Esta e a conferencia que impede um spawn escapar pra cidade.
 */
for (const chave of ['farm', 'bairro', 'rural', 'represa']) {
  ok(
    objetos(lerMapa(chave), 'inimigos').length === 0,
    `${chave}: mapa externo nao pode ter inimigo nesta leva`,
  );
}
ok(
  objetos(lerMapa('represa_0'), 'inimigos').length === 0,
  'represa_0 e a zona segura: nao pode ter inimigo',
);

let inimigosNoMundo = 0;
const usados = new Set();
for (const setor of SETORES_REPRESA) {
  for (const o of objetos(lerMapa(setor.chave), 'inimigos')) {
    const p = props(o);
    const def = CATALOGO_INIMIGOS[p.tipo];
    ok(Boolean(def), `${setor.chave}/${o.name}: tipo de inimigo desconhecido "${p.tipo}"`);
    ok(Number(p.raio) >= 1, `${setor.chave}/${o.name}: raio de patrulha invalido`);
    usados.add(def.id);
    inimigosNoMundo += 1;
  }
}
ok(inimigosNoMundo >= 8, `poucos inimigos no mundo (${inimigosNoMundo})`);

// toda folha de monstro declarada existe processada
for (const def of Object.values(CATALOGO_INIMIGOS)) {
  for (const sufixo of ['andando', 'parado']) {
    const arquivo = join(raiz, 'public', 'assets', 'sprites', `${def.id}_${sufixo}_runtime.png`);
    ok(existsSync(arquivo), `${def.id}: falta a folha ${sufixo}_runtime (rode processar-sprites-monstro)`);
  }
}

/**
 * NENHUM inimigo mata o jogador cheio de vida num golpe, e nenhum mata em menos
 * de tres. E o limite que o plano pediu, e ele fica conferido em vez de
 * combinado.
 */
for (const def of Object.values(CATALOGO_INIMIGOS)) {
  ok(def.dano > 0 && def.dano <= 8, `${def.id}: dano ${def.dano} fora da faixa 1..8`);
  ok(
    HP_MAXIMO / def.dano >= 3,
    `${def.id}: mata o jogador cheio em ${Math.ceil(HP_MAXIMO / def.dano)} golpes (minimo 3)`,
  );
  ok(
    def.raioDesistencia > def.raioAggro,
    `${def.id}: raio de desistencia tem de ser MAIOR que o de aggro (histerese)`,
  );
  ok(def.velocidadePatrulha < def.velocidade, `${def.id}: patrulha nao pode ser tao rapida quanto a perseguicao`);
  ok(Boolean(buscarTabelaDeSucata(def.tabelaDrop)), `${def.id}: tabela de drop "${def.tabelaDrop}" nao existe`);
  // o jogador tem de conseguir matar em um numero razoavel de golpes
  const golpes = Math.ceil(def.hpMax / ATAQUE_DO_JOGADOR.dano);
  ok(golpes >= 2 && golpes <= 10, `${def.id}: morre em ${golpes} golpes (esperado 2..10)`);
}

// ================================================================ 4. IA ==
/** Patrulha longe do jogador, persegue quando perto, ataque com cadencia. */
{
  const def = CATALOGO_INIMIGOS.impressora;
  const bicho = criarRuntimeInimigo('teste', 'impressora', 10, 10, 3);

  // longe: patrulha
  let d = decidirInimigo(bicho, def, { x: 40, y: 40 }, 16);
  ok(d.estado === 'patrulha', `longe do jogador o estado deveria ser patrulha, veio "${d.estado}"`);

  // dentro do aggro: persegue
  bicho.x = 10; bicho.y = 10;
  d = decidirInimigo(bicho, def, { x: 13, y: 10 }, 16);
  ok(d.estado === 'perseguindo', `dentro do aggro deveria perseguir, veio "${d.estado}"`);

  // encostado: ataca e o primeiro golpe sai
  d = decidirInimigo(bicho, def, { x: 10.5, y: 10 }, 16);
  ok(d.estado === 'atacando' && d.golpeia, 'encostado deveria golpear');
  // e o SEGUNDO golpe nao sai no quadro seguinte: cadencia
  d = decidirInimigo(bicho, def, { x: 10.5, y: 10 }, 16);
  ok(d.estado === 'atacando' && !d.golpeia, 'golpeou duas vezes seguidas — a cadencia nao funciona');
  // depois da recarga, sai de novo
  d = decidirInimigo(bicho, def, { x: 10.5, y: 10 }, def.recargaAtaque + 20);
  ok(d.golpeia, 'nao golpeou nem depois da recarga inteira');

  // fugiu pra longe: desiste e volta pra ancora
  bicho.x = 10; bicho.y = 10;
  d = decidirInimigo(bicho, def, { x: 60, y: 60 }, 16);
  ok(d.estado !== 'perseguindo', 'nao desistiu de um jogador a 50 tiles');

  // linha de visao: com parede no meio, NAO entra em perseguicao
  const cego = criarRuntimeInimigo('cego', 'impressora', 10, 10, 3);
  d = decidirInimigo(cego, def, { x: 13, y: 10 }, 16, 1, () => false);
  ok(d.estado !== 'perseguindo', 'perseguiu atraves de parede (linha de visao ignorada)');

  // morto: nao anda e nao golpeia, nunca mais
  const morto = criarRuntimeInimigo('morto', 'impressora', 10, 10, 3);
  const r = ferirInimigo(morto, def, 999);
  ok(r.morreu, 'dano acima do HP deveria matar');
  ok(!ferirInimigo(morto, def, 5).morreu, 'morreu duas vezes — o drop sairia dobrado');
  for (let i = 0; i < 40; i++) {
    const dd = decidirInimigo(morto, def, { x: 10.2, y: 10 }, 200);
    ok(!dd.golpeia && dd.estado === 'morto', 'inimigo morto continuou agindo');
  }

  // ao ser ferido ele PARA por um instante (janela de recuo do jogador)
  const ferido = criarRuntimeInimigo('ferido', 'impressora', 10, 10, 3);
  ferirInimigo(ferido, def, 1);
  const dd = decidirInimigo(ferido, def, { x: 10.2, y: 10 }, 16);
  ok(dd.estado === 'atingido' && !dd.golpeia, 'inimigo ferido golpeou no mesmo instante');
}

/** A tensao acelera, mas dentro de um teto conhecido. */
ok(dificuldadeDaTensao(0) === 1, 'tensao zero deveria dar dificuldade 1');
ok(
  Math.abs(dificuldadeDaTensao(1) - TENSAO.dificuldadeMaxima) < 1e-9,
  'tensao maxima nao chega na dificuldade maxima declarada',
);
ok(TENSAO.dificuldadeMaxima < 2, 'a tensao nao pode mais que dobrar a IA');

// ============================================================== 5. vida ==
{
  const vida = new SistemaVida();
  ok(vida.hp === HP_MAXIMO && vida.maxHp === HP_MAXIMO, 'jogo novo nao comeca com 30/30');

  const r = vida.receberDano(5);
  ok(r.aplicado === 5 && vida.hp === 25, 'dano de 5 nao levou a vida pra 25');
  // dentro da janela, o segundo golpe nao conta
  ok(vida.receberDano(5).aplicado === 0, 'tomou dano duas vezes dentro da invulnerabilidade');
  vida.atualizar(INVULNERAVEL_MS + 1);
  ok(vida.receberDano(5).aplicado === 5 && vida.hp === 20, 'a janela nao expirou');

  // nunca abaixo de zero, e o "derrotou" sai UMA vez
  vida.atualizar(INVULNERAVEL_MS + 1);
  const morte = vida.receberDano(999);
  ok(vida.hp === 0 && morte.derrotou, 'dano fatal nao zerou a vida');
  vida.atualizar(INVULNERAVEL_MS + 1);
  ok(!vida.receberDano(5).derrotou, 'derrotou duas vezes — o resgate rodaria em dobro');

  // curar respeita o teto
  vida.restaurarTudo();
  ok(vida.hp === HP_MAXIMO && vida.curar(50) === 0, 'curar passou do teto');

  // save antigo (sem o campo) volta cheio; save absurdo tambem
  for (const bruto of [undefined, null, {}, { hp: -3 }, { hp: 999 }, { hp: NaN }, { hp: 0 }]) {
    const v = new SistemaVida();
    v.restaurar(bruto);
    ok(v.hp === HP_MAXIMO, `save ${JSON.stringify(bruto)} deveria voltar 30/30, veio ${v.hp}`);
  }
  const v = new SistemaVida();
  v.restaurar({ hp: 12, maxHp: 30 });
  ok(v.hp === 12, 'save valido nao preservou a vida');
}

// =========================================================== 6. paineis ==
const paineisNoMundo = new Map();
for (const setor of SETORES_REPRESA) {
  for (const o of objetos(lerMapa(setor.chave), 'interativos')) {
    if (classe(o) !== 'painel') continue;
    paineisNoMundo.set(String(props(o).painel), setor.chave);
  }
}
for (const painel of PAINEIS_REPRESA) {
  ok(paineisNoMundo.has(painel.id), `o painel "${painel.id}" nao existe em nenhum tilemap`);
  ok(
    paineisNoMundo.get(painel.id) === painel.setor,
    `o painel "${painel.id}" esta em ${paineisNoMundo.get(painel.id)} e declara ${painel.setor}`,
  );
}
for (const [id, setor] of paineisNoMundo) {
  ok(
    PAINEIS_REPRESA.some((p) => p.id === id),
    `${setor}: o tilemap tem um painel "${id}" que nao existe em PAINEIS_REPRESA`,
  );
}
// contagem por grau, como o plano pediu: 3 simples, 2 intermediarios, 1 profundo
const porGrau = (grau) => PAINEIS_REPRESA.filter((p) => p.grau === grau).length;
ok(porGrau('simples') >= 3, `esperava 3 enigmas simples, tem ${porGrau('simples')}`);
ok(porGrau('intermediario') >= 2, `esperava 2 intermediarios, tem ${porGrau('intermediario')}`);
ok(porGrau('profundo') >= 1, `esperava 1 profundo, tem ${porGrau('profundo')}`);
// o profundo junta mais de um passo
const profundo = PAINEIS_REPRESA.find((p) => p.grau === 'profundo');
ok(profundo.passos.length >= 3, 'o enigma profundo tem menos de tres passos');
// flags unicas
const flags = PAINEIS_REPRESA.map((p) => p.flag);
ok(new Set(flags).size === flags.length, 'dois paineis escrevem a mesma flag');
for (const flag of [...flags, ...ATALHOS_REPRESA]) {
  ok(FLAGS_DA_REPRESA.includes(flag), `a flag "${flag}" nao esta em FLAGS_DA_REPRESA`);
}

/**
 * A RESPOSTA DE TODO ENIGMA ESTA ESCRITA em algum documento do mapa.
 *
 * E a conferencia mais importante deste arquivo: sem ela nada impede um enigma
 * de virar adivinhacao numa mudanca de texto. Ela le os documentos DO PROPRIO
 * TILEMAP (nao a tabela inteira de avisos), entao um documento que exista no
 * texto mas nao esteja posto no mundo tambem reprova.
 */
const textoDosDocumentos = (() => {
  let tudo = '';
  for (const setor of SETORES_REPRESA) {
    for (const o of objetos(lerMapa(setor.chave), 'interativos')) {
      if (classe(o) !== 'placa') continue;
      const chave = String(props(o).aviso);
      const linhas = ITENS_DE_LEITURA[chave];
      ok(Array.isArray(linhas) && linhas.length > 0, `${setor.chave}: documento "${chave}" sem texto`);
      tudo += ` ${linhas.join(' ')}`;
    }
  }
  return tudo.toUpperCase();
})();

/** `agulha` aparece no texto dos documentos? (comparacao sem caixa) */
const noTexto = (agulha) => textoDosDocumentos.includes(agulha.toUpperCase());

/**
 * Toda PALAVRA de peso da resposta aparece nos documentos?
 *
 * A comparacao e por palavra e nao pela frase inteira porque o rotulo do menu e
 * curto ("Marrom + preto") e o documento e prosa ("COMANDO: MARROM (fase) e
 * PRETO (retorno)"). Exigir a frase literal obrigaria escrever documento com
 * cara de gabarito. Palavras de 4 letras ou mais bastam pra provar que a
 * resposta esta escrita em algum lugar.
 */
const palavrasNoTexto = (frase) => {
  const palavras = frase
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 4);
  return palavras.length > 0 && palavras.every((w) => textoDosDocumentos.includes(w));
};

for (const painel of PAINEIS_REPRESA) {
  // a alavanca nao e enigma: nao ha resposta pra estar escrita
  if (painel.grau === 'alavanca') continue;
  for (const passo of painel.passos) {
    if (passo.tipo === 'escolha') {
      ok(
        palavrasNoTexto(passo.opcoes[passo.correta]),
        `${painel.id}: a resposta "${passo.opcoes[passo.correta]}" nao esta escrita em documento nenhum`,
      );
    }
    if (passo.tipo === 'sequencia') {
      // a ORDEM tem de aparecer na ordem dentro de um mesmo documento
      const rotulos = passo.ordem.map((i) => passo.opcoes[i].toUpperCase());
      let achou = false;
      for (const linhas of Object.values(ITENS_DE_LEITURA)) {
        const doc = linhas.join(' ').toUpperCase();
        let posicao = -1;
        let cabe = true;
        for (const rotulo of rotulos) {
          const proximo = doc.indexOf(rotulo, posicao + 1);
          if (proximo <= posicao) {
            cabe = false;
            break;
          }
          posicao = proximo;
        }
        if (cabe) {
          achou = true;
          break;
        }
      }
      ok(achou, `${painel.id}: a ordem ${rotulos.join(' > ')} nao esta escrita em nenhum documento`);
    }
    if (passo.tipo === 'codigo') {
      // o codigo inteiro, ou os pedacos dele, tem de estar escritos
      const inteiro = noTexto(passo.codigo);
      const metades = passo.codigo.length >= 4
        && noTexto(passo.codigo.slice(0, 2))
        && noTexto(passo.codigo.slice(2));
      ok(
        inteiro || metades,
        `${painel.id}: o codigo "${passo.codigo}" nao esta escrito (nem inteiro nem em pedacos)`,
      );
    }
    if (passo.tipo === 'peca') {
      ok(ehSucata(passo.itemId), `${painel.id}: a peca pedida "${passo.itemId}" nao e salvado`);
    }
  }
}

/** Resolver um painel PELO CAMINHO CERTO conclui; errar gasta tentativa. */
{
  const painel = PAINEIS_REPRESA.find((p) => p.id === 'geradores');
  const p = iniciarPainel(painel, 0);
  const passo = painel.passos[0];
  let fim = null;
  for (const indice of passo.ordem) fim = responderPainel(p, indice);
  ok(fim.resultado === 'concluido' && fim.flag === painel.flag, 'a sequencia certa nao concluiu');

  // errado: volta ao inicio e desconta
  const q = iniciarPainel(painel, 0);
  const errado = passo.ordem[0] === 0 ? 1 : 0;
  const r = responderPainel(q, errado);
  ok(r.resultado === 'errou', 'resposta errada nao foi recusada');
  ok(q.tentativasRestantes === painel.tentativas - 1, 'errar nao gastou tentativa');

  // gastar todas TRAVA
  let ultimo = null;
  for (let i = 0; i < painel.tentativas + 2; i++) ultimo = responderPainel(q, errado);
  ok(ultimo.resultado === 'travado', 'painel nao travou depois de gastar as tentativas');
}

/** Codigo: digito por digito, e errar no meio ja gasta a tentativa. */
{
  const painel = PAINEIS_REPRESA.find((p) => p.passos.some((s) => s.tipo === 'codigo'));
  const passoCodigo = painel.passos.find((s) => s.tipo === 'codigo');
  ok(
    opcoesAtuais(iniciarPainel(painel, 0)).length > 0,
    'o painel nao oferece nenhuma opcao no primeiro passo',
  );
  // pula direto pro passo do codigo
  const p = iniciarPainel(painel, 0);
  p.passo = painel.passos.indexOf(passoCodigo);
  ok(opcoesAtuais(p).length === 10, 'o passo de codigo deveria oferecer os dez digitos');
  for (const digito of passoCodigo.codigo) {
    const r = responderPainel(p, Number(digito));
    ok(r.resultado !== 'errou', `o digito certo "${digito}" foi recusado`);
  }
  ok(p.passo > painel.passos.indexOf(passoCodigo), 'o codigo certo nao avancou o passo');

  const q = iniciarPainel(painel, 0);
  q.passo = painel.passos.indexOf(passoCodigo);
  const errado = (Number(passoCodigo.codigo[0]) + 1) % 10;
  ok(responderPainel(q, errado).resultado === 'errou', 'digito errado nao foi recusado');
}

/** A peca do enigma profundo E CONSUMIDA, e sem ela o passo nao passa. */
{
  const painel = PAINEIS_REPRESA.find((p) => p.grau === 'profundo');
  const indicePeca = painel.passos.findIndex((s) => s.tipo === 'peca');
  const passo = painel.passos[indicePeca];
  const vazio = new Inventario();
  const p = iniciarPainel(painel, 0);
  p.passo = indicePeca;
  ok(responderPainel(p, 0, vazio).resultado === 'sem_peca', 'aceitou o passo de peca sem a peca');

  const cheio = new Inventario();
  cheio.adicionar(passo.itemId, 2);
  const q = iniciarPainel(painel, 0);
  q.passo = indicePeca;
  ok(responderPainel(q, 0, cheio).resultado !== 'sem_peca', 'recusou o passo com a peca na mochila');
  ok(cheio.contar(passo.itemId) === 1, 'a peca nao foi consumida (ou foi consumida em dobro)');
}

/** A tensao encurta as tentativas, mas nunca fecha o enigma. */
for (const painel of PAINEIS_REPRESA) {
  const descansado = tentativasDe(painel, 0);
  const exausto = tentativasDe(painel, TENSAO.maxima);
  ok(descansado === painel.tentativas, `${painel.id}: tentativas com tensao zero nao sao as declaradas`);
  ok(exausto >= 1, `${painel.id}: a tensao maxima fechou o enigma (0 tentativas)`);
  if (painel.grau !== 'alavanca') {
    ok(exausto < descansado, `${painel.id}: a tensao nao encurtou nada`);
  }
}

// ============================================================ 7. sucata ==
for (const id of IDS_DE_SUCATA) {
  ok(Boolean(ITENS[id]), `o salvado "${id}" nao chegou no registro de itens`);
  ok(valorDeSucata(id) > 0, `o salvado "${id}" nao vale nada`);
  ok(ITENS[id].preco === valorDeSucata(id), `o preco de "${id}" divergiu do valor de referencia`);
}

const tabelasNoMundo = new Set();
let pontosDeSucata = 0;
let premiosDeSucata = 0;
for (const setor of SETORES_REPRESA) {
  for (const o of objetos(lerMapa(setor.chave), 'sucata')) {
    const p = props(o);
    const tabela = buscarTabelaDeSucata(String(p.tabela));
    ok(Boolean(tabela), `${setor.chave}/${o.name}: tabela "${p.tabela}" nao existe`);
    tabelasNoMundo.add(tabela.id);
    pontosDeSucata += 1;
    if (p.requer) {
      premiosDeSucata += 1;
      ok(
        FLAGS_DA_REPRESA.includes(String(p.requer)),
        `${setor.chave}/${o.name}: exige a flag "${p.requer}", que nao e da represa`,
      );
    }
  }
}
ok(pontosDeSucata >= 15, `poucos pontos de salvado (${pontosDeSucata})`);
ok(premiosDeSucata >= 4, `poucos recipientes atras de enigma (${premiosDeSucata})`);
for (const tabela of TABELAS_DE_SUCATA) {
  const usadaPorInimigo = Object.values(CATALOGO_INIMIGOS).some((d) => d.tabelaDrop === tabela.id);
  ok(
    tabelasNoMundo.has(tabela.id) || usadaPorInimigo,
    `a tabela "${tabela.id}" nao e usada por recipiente nenhum nem por inimigo nenhum`,
  );
  for (const id of Object.keys(tabela.pesos)) {
    ok(ehSucata(id), `a tabela "${tabela.id}" sorteia "${id}", que nao e salvado`);
  }
  ok(tabela.pecasMin >= 1 && tabela.pecasMax >= tabela.pecasMin, `a tabela "${tabela.id}" tem faixa invalida`);
}

/**
 * A PROGRESSAO por profundidade: o valor esperado de uma caixa tem de subir do
 * nivel 0 pro -4. Sem isto nada garante que descer valha a pena, e o jogador
 * racional ficaria saqueando o nivel 0 pra sempre.
 */
const esperado = (tabela) => {
  const total = Object.values(tabela.pesos).reduce((a, b) => a + b, 0);
  const medio = Object.entries(tabela.pesos).reduce(
    (soma, [id, peso]) => soma + (peso / total) * valorDeSucata(id),
    0,
  );
  return medio * ((tabela.pecasMin + tabela.pecasMax) / 2);
};
const cadeia = ['nivel_0', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4'].map(buscarTabelaDeSucata);
for (let i = 1; i < cadeia.length; i++) {
  ok(
    esperado(cadeia[i]) > esperado(cadeia[i - 1]),
    `o nivel ${i} nao paga mais que o ${i - 1} (${Math.round(esperado(cadeia[i]))} vs ` +
      `${Math.round(esperado(cadeia[i - 1]))} centavos)`,
  );
}
// o cofre profundo e a unica tabela so-de-raro
const cofre = buscarTabelaDeSucata('nivel_4_cofre');
ok(
  Object.keys(cofre.pesos).every((id) => valorDeSucata(id) >= 10_000),
  'o cofre profundo tem peca que nao e rara',
);

/** O sorteio respeita a faixa de pecas e nunca devolve id de fora da tabela. */
{
  let semente = 12345;
  const pseudo = () => {
    semente = (semente * 1664525 + 1013904223) >>> 0;
    return semente / 0x100000000;
  };
  for (const tabela of TABELAS_DE_SUCATA) {
    for (let i = 0; i < 200; i++) {
      const saida = sortearSucata(tabela, pseudo);
      const total = saida.reduce((n, p) => n + p.quantidade, 0);
      ok(
        total >= tabela.pecasMin && total <= tabela.pecasMax,
        `${tabela.id}: sorteou ${total} pecas, fora de ${tabela.pecasMin}..${tabela.pecasMax}`,
      );
      for (const peca of saida) {
        ok(tabela.pesos[peca.id] > 0, `${tabela.id}: sorteou "${peca.id}", que nao esta na tabela`);
      }
    }
  }
}

// =========================================================== 8. revenda ==
{
  const inv = new Inventario();
  const carteira = new Carteira();
  const saldoInicial = carteira.serializar();
  inv.adicionar('fio_de_cobre', 10);

  // vender mais do que se tem nao paga nada e nao tira nada
  ok(venderSucata(inv, carteira, 'fio_de_cobre', 11).ok === false, 'vendeu mais do que tinha');
  ok(inv.contar('fio_de_cobre') === 10, 'a venda recusada mexeu no inventario');
  ok(carteira.serializar() === saldoInicial, 'a venda recusada mexeu no saldo');

  // vender o que nao e salvado nao passa
  inv.adicionar('madeira', 5);
  ok(venderSucata(inv, carteira, 'madeira', 1).ok === false, 'vendeu material como salvado');

  // venda valida paga o preco declarado
  const r = venderSucata(inv, carteira, 'fio_de_cobre', 4);
  ok(r.ok && r.pago === precoDeRevenda('fio_de_cobre', 4), 'a venda pagou valor diferente do declarado');
  ok(inv.contar('fio_de_cobre') === 6, 'a venda nao tirou a quantidade certa');
  ok(carteira.serializar() === saldoInicial + r.pago, 'o saldo nao subiu exatamente o que foi pago');

  // ACIONAR DE NOVO nao duplica: o estoque acabou, e nada mais e pago
  const antes = carteira.serializar();
  venderSucata(inv, carteira, 'fio_de_cobre', 6);
  const depois = carteira.serializar();
  ok(venderSucata(inv, carteira, 'fio_de_cobre', 1).ok === false, 'vendeu com o estoque vazio');
  ok(carteira.serializar() === depois, 'o acionamento repetido creditou de novo');
  ok(depois > antes, 'a segunda venda valida nao pagou');

  // quantidade absurda e recusada
  for (const q of [0, -1, 1.5, NaN, Infinity]) {
    ok(venderSucata(inv, carteira, 'ferro_velho', q).ok === false, `aceitou quantidade ${q}`);
  }
  // a revenda paga MENOS que o valor de referencia (senao nao ha razao pra usar
  // a peca na bancada em vez de vender tudo sempre)
  for (const id of IDS_DE_SUCATA) {
    ok(precoDeRevenda(id, 1) < valorDeSucata(id), `a revenda de "${id}" paga o valor cheio`);
  }
}

// =========================================================== 9. derrota ==
{
  const sistema = new SistemaRepresa();
  // 40 minutos no nivel 0 quase nao tensiona; 40 no -4 tensiona muito
  const raso = new SistemaRepresa();
  raso.avancar('represa_0', 0);
  for (let i = 0; i < 4; i++) raso.avancar('represa_0', 10);
  const fundo = new SistemaRepresa();
  fundo.avancar('represa_4', 0);
  for (let i = 0; i < 4; i++) fundo.avancar('represa_4', 10);
  ok(fundo.tensao > raso.tensao * 2, 'a profundidade nao acelera a tensao');
  ok(raso.tensao < 0.3, `40 min no nivel 0 tensionaram demais (${raso.tensao.toFixed(2)})`);

  // sair da usina zera a tensao e fecha a corrida
  fundo.registrarSalvado('fio_de_cobre', 4);
  fundo.avancar('represa', 10);
  ok(fundo.tensao === 0, 'sair pro mapa externo nao zerou a tensao');
  ok(fundo.salvadoDaCorrida.length === 0, 'sair da usina nao fechou a corrida');

  // derrota: perde METADE do salvado da corrida, arredondando pra baixo
  sistema.avancar('represa_2', 0);
  sistema.registrarSalvado('fio_de_cobre', 4);
  sistema.registrarSalvado('parafusos', 1);
  const perda = sistema.perdaPorDerrota();
  const cobre = perda.find((p) => p.id === 'fio_de_cobre');
  ok(cobre?.quantidade === 2, `esperava perder 2 de cobre, perdeu ${cobre?.quantidade}`);
  ok(
    !perda.some((p) => p.id === 'parafusos'),
    'perdeu a unica unidade recolhida — o arredondamento devia ser pra baixo',
  );
  ok(sistema.tensao === 0 && sistema.salvadoDaCorrida.length === 0, 'a derrota nao limpou a corrida');
  // e uma segunda derrota seguida nao perde mais nada
  ok(sistema.perdaPorDerrota().length === 0, 'a segunda derrota perdeu salvado que nao existia');

  ok(PERDA_POR_DERROTA.fracaoDeVida > 0, 'o resgate acordaria o jogador com vida zero');
  ok(PERDA_POR_DERROTA.horas > 0, 'a derrota nao custa tempo nenhum');
  ok(PERDA_POR_DERROTA.fracaoDoSalvado < 1, 'a derrota levaria TODO o salvado');
}

/**
 * A derrota nao pode encostar em flag de puzzle nem em atalho aberto: e o que
 * garante que o progresso seja irreversivel. `perdaPorDerrota` nem recebe
 * `worldEvents`, entao a prova aqui e que o sistema continua com as flags apos
 * uma derrota simulada.
 */
{
  const eventos = new SistemaWorldEvents();
  for (const flag of FLAGS_DA_REPRESA) eventos.definir(flag, true);
  const sistema = new SistemaRepresa();
  sistema.avancar('represa_4', 10);
  sistema.registrarSalvado('modulo_de_controle', 3);
  sistema.perdaPorDerrota();
  for (const flag of FLAGS_DA_REPRESA) {
    ok(eventos.ativa(flag), `a derrota apagou a flag "${flag}"`);
  }
  // e o save preserva as flags no ciclo serializar/restaurar
  const outro = new SistemaWorldEvents();
  outro.restaurar(eventos.serializar());
  for (const flag of FLAGS_DA_REPRESA) {
    ok(outro.ativa(flag), `a flag "${flag}" nao sobreviveu ao save`);
  }
}

/** Salvado nao e item de missao: descartar salvado nao pode travar nada. */
for (const id of IDS_DE_SUCATA) {
  ok(ITENS[id].deMissao !== true, `o salvado "${id}" esta marcado como item de missao`);
}

// ============================================================ relatorio ==
const porNivel = SETORES_REPRESA.map((s) => {
  const mapa = lerMapa(s.chave);
  return (
    `${String(s.nivel).padStart(2)} ${s.rotulo.padEnd(22)} escuridao ${s.escuridao.toFixed(2)}` +
    ` | ${String(objetos(mapa, 'comodos').length).padStart(2)} comodos` +
    ` | ${String(portasDoSetor.get(s.chave).length)} portas` +
    ` | ${String(objetos(mapa, 'sucata').length).padStart(2)} sucata` +
    ` | ${String(objetos(mapa, 'inimigos').length)} inimigos` +
    ` | ${String(objetos(mapa, 'luzes').length)} luzes`
  );
});
console.log(porNivel.map((l) => `  ${l}`).join('\n'));
console.log(
  `  topologia: ${LIGACOES_ESPERADAS.length / 2} ligacoes radiais no Mapa 1; ` +
    'sul reservado, Mapa 2 <-> Mapa 3 desligado',
);
console.log(
  `  ${Object.keys(CATALOGO_INIMIGOS).length} tipos de monstro (${[...usados].sort().join(', ')} em uso), ` +
    `${inimigosNoMundo} instancias | ${IDS_DE_SUCATA.length} salvados em ` +
    `${TABELAS_DE_SUCATA.length} tabelas`,
);
console.log(
  `  ${PAINEIS_REPRESA.length} paineis (${porGrau('simples')} simples, ` +
    `${porGrau('intermediario')} intermediarios, ${porGrau('profundo')} profundo, ` +
    `${porGrau('alavanca')} alavanca) | ${ATALHOS_REPRESA.length} atalhos permanentes`,
);
console.log(`[represa] ${conferencias} conferencias: passou`);

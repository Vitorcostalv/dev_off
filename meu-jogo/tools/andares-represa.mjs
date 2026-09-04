import {
  ANDARES,
  ANDARES_COMPOSTOS,
  buscarModulo,
  buscarPlantaDeAndar,
  mapaDoAndar,
} from '../src/game/andares.ts';
import {
  enigmaDoAndar,
  flagDoEnigma,
  PISTAS_POR_ANDAR,
  travaDescida,
} from '../src/game/enigmas.ts';
import { idDaFicha } from '../src/game/andares.ts';
import { decaisDoAndar, faixaDoAndar } from '../src/game/decais.ts';
import {
  LABIRINTOS_FUNDOS,
  TEMPLATES_INFANCIA,
  TEMPLATES_TRABALHO,
} from './andares-fundos.mjs';

/**
 * OS QUARENTA E CINCO ANDARES COMPOSTOS DA REPRESA.
 *
 * Os cinco primeiros andares tem planta DESENHADA A MAO em `PLANTAS_REPRESA`
 * (gerar-assets.mjs) e continuam intocados. Do 6 ao 50 a planta e COMPOSTA aqui:
 * um template de geometria mais um modulo industrial por vao, e o conteudo
 * (enigma, documento, salvado, inimigo, luminaria, mobilia) posto por regra.
 *
 * COMPOSICAO NAO E GERACAO ALEATORIA, e a diferenca importa:
 *
 *  - os TEMPLATES sao nove geometrias escritas a mao, com parede, vao, tile de
 *    chegada e tile de descida declarados peca por peca;
 *  - qual template e qual modulo cada andar usa esta escrito em
 *    `src/game/andares.ts`, andar por andar;
 *  - os tres LABIRINTOS sao autorais: cada corredor deles e um segmento escrito
 *    a mao, no mesmo idioma de polilinha que as vias dos mapas externos usam;
 *  - o que sobra pro automatico e so ONDE, dentro do comodo, cada objeto cai — e
 *    isso sai de um hash do numero do andar, entao o andar 23 e igual em toda
 *    maquina e em todo reload.
 *
 * O que este arquivo NAO faz: nao desenha tile, nao conhece GID e nao escreve
 * arquivo. Ele devolve plantas no MESMO formato de `PLANTAS_REPRESA`, e quem as
 * transforma em tilemap e o `gerarSetorRepresa` que ja existia. Foi essa a
 * condicao pra os quarenta e cinco andares novos nao virarem um segundo motor de
 * mapa ao lado do primeiro.
 */

// ------------------------------------------------------------------ hash --
/** Mesma avalanche do `hash01` de png.mjs, indexada por andar e rotulo. */
function hash(andar, sal) {
  let h = (andar * 2654435761) >>> 0;
  for (let i = 0; i < sal.length; i++) h = Math.imul(h ^ sal.charCodeAt(i), 0x01000193);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const dado = (andar, sal, n) => Math.min(n - 1, Math.floor(hash(andar, sal) * n));

/** true quando o tile [x, y] cai dentro do retangulo [rx, ry, rw, rh]. */
const dentroDoRect = ([rx, ry, rw, rh], [x, y]) =>
  x >= rx && x < rx + rw && y >= ry && y < ry + rh;

/**
 * A PAREDE de um modulo depende do KIT do capitulo.
 *
 * Ate o capitulo 4 e a folha original da usina; do 5 em diante e a folha do
 * fundo, que o usuario entregou rotulada "andar 50 a 100". Os capitulos do
 * TRABALHO e da INFANCIA usam a mesma familia de peca do kit `fundo` — o que os
 * separa em jogo nao e o tile de parede (que continua sendo concreto de usina,
 * como a Parte 3 exige) e sim o DECAL colado nele e a mobilia do modulo.
 *
 * Foi uma escolha, e a alternativa era pior: a folha da infancia tem sangue e
 * desenho PINTADOS na propria peca de parede, e usa-la como tile faria cada
 * comodo do andar 104 ter desenho de crianca em toda parede. A raridade e o
 * efeito (Parte 5), e tile nao tem como ser raro.
 */
function paredeDoModulo(modulo, kit) {
  return (kit !== 'usina' && modulo.paredeFunda) || modulo.parede;
}

/** Parede da moldura externa do andar, por kit. */
const PAREDE_DE_MOLDURA = {
  usina: 'represa_tecnico',
  fundo: 'fundo_concreto',
  trabalho: 'fundo_concreto',
  infancia: 'fundo_concreto',
};

// ---------------------------------------------------------------- templates --
/**
 * Um TEMPLATE e a geometria de um andar, sem conteudo:
 *
 *   largura/altura  — tamanho do tilemap
 *   paredes         — retangulos de alvenaria interna [x, y, w, h]
 *   vaos            — tiles de parede que ficam ABERTOS (as portas entre comodos)
 *   comodos         — na ordem; `slot` marca os que consomem a lista de modulos
 *                     do andar, e `modulo` fixa o modulo dos corredores
 *
 * OS TRES TILES DE SERVICO — chegada, descida e parada do elevador — NAO estao
 * aqui: eles moram em `PLANTAS_DE_ANDAR`, em src/game/andares.ts, porque
 * `MAPAS.spawnTile` precisa do tile de chegada em tempo de jogo e este arquivo
 * nao existe la. `servicos()` logo abaixo os traz, e a conferencia de setor prova
 * que os tres caem em piso livre e alcancavel da geometria daqui.
 *
 * A moldura (borda de 1 tile e a faixa de 2 no topo) tambem nao esta declarada:
 * quem a poe e o `gerarSetorRepresa`, como em qualquer interior do jogo.
 */
export const TEMPLATES = {
  // ---------------------------------------- corredor central, tres salas --
  espinha_3: {
    largura: 30,
    altura: 20,
    paredes: [
      [10, 2, 1, 8], // divisa sala A / sala B
      [19, 2, 1, 8], // divisa sala B / sala C
      [1, 10, 27, 2], // divisa das salas com o corredor
    ],
    vaos: [[5, 10], [5, 11], [15, 10], [15, 11], [24, 10], [24, 11]],
    comodos: [
      { nome: 'a', rect: [1, 2, 9, 8], slot: 0 },
      { nome: 'b', rect: [11, 2, 8, 8], slot: 1 },
      { nome: 'c', rect: [20, 2, 8, 8], slot: 2 },
      { nome: 'passagem', rect: [1, 12, 27, 7], modulo: 'corredor' },
    ],
  },

  // -------------------------------------- corredor central, cinco salas --
  espinha_5: {
    largura: 34,
    altura: 22,
    paredes: [
      [6, 2, 1, 8],
      [12, 2, 1, 8],
      [18, 2, 1, 8],
      [24, 2, 1, 8],
      [1, 10, 32, 2],
    ],
    vaos: [
      [3, 10], [3, 11], [9, 10], [9, 11], [15, 10], [15, 11],
      [21, 10], [21, 11], [28, 10], [28, 11],
    ],
    comodos: [
      { nome: 'a', rect: [1, 2, 5, 8], slot: 0 },
      { nome: 'b', rect: [7, 2, 5, 8], slot: 1 },
      { nome: 'c', rect: [13, 2, 5, 8], slot: 2 },
      { nome: 'd', rect: [19, 2, 5, 8], slot: 3 },
      { nome: 'e', rect: [25, 2, 8, 8], slot: 4 },
      { nome: 'passagem', rect: [1, 12, 32, 9], modulo: 'corredor' },
    ],
  },

  // ------------------------------------------- cruzamento, quatro cantos --
  cruz_4: {
    largura: 30,
    altura: 22,
    paredes: [
      [12, 2, 1, 7], [16, 2, 1, 7],
      [12, 14, 1, 6], [16, 14, 1, 6],
      [1, 9, 11, 1], [17, 9, 11, 1],
      [1, 13, 11, 1], [17, 13, 11, 1],
    ],
    vaos: [[12, 5], [16, 5], [12, 17], [16, 17], [6, 9], [22, 13]],
    comodos: [
      { nome: 'a', rect: [1, 2, 11, 7], slot: 0 },
      { nome: 'b', rect: [17, 2, 11, 7], slot: 1 },
      { nome: 'c', rect: [1, 14, 11, 6], slot: 2 },
      { nome: 'd', rect: [17, 14, 11, 6], slot: 3 },
      { nome: 'eixo_norte', rect: [13, 2, 3, 7], modulo: 'corredor' },
      { nome: 'eixo_meio', rect: [1, 10, 27, 3], modulo: 'corredor' },
      { nome: 'eixo_sul', rect: [13, 14, 3, 6], modulo: 'corredor' },
    ],
  },

  // ------------------------------------------------ duas galerias empilhadas --
  galeria_2: {
    largura: 30,
    altura: 22,
    paredes: [[1, 10, 27, 2]],
    vaos: [[8, 10], [8, 11], [21, 10], [21, 11]],
    comodos: [
      { nome: 'a', rect: [1, 2, 27, 8], slot: 0 },
      { nome: 'b', rect: [1, 12, 27, 8], slot: 1 },
    ],
  },

  // -------------------------------------------- duas galerias com anexos --
  galeria_4: {
    largura: 32,
    altura: 22,
    paredes: [[21, 2, 1, 8], [1, 10, 30, 2], [21, 12, 1, 8]],
    vaos: [[21, 5], [21, 15], [10, 10], [10, 11]],
    comodos: [
      { nome: 'a', rect: [1, 2, 20, 8], slot: 0 },
      { nome: 'b', rect: [22, 2, 9, 8], slot: 1 },
      { nome: 'c', rect: [1, 12, 20, 8], slot: 2 },
      { nome: 'd', rect: [22, 12, 9, 8], slot: 3 },
    ],
  },

  // ------------------------------------------------ anel com sala central --
  anel: {
    largura: 30,
    altura: 22,
    paredes: [
      [8, 7, 14, 1], [8, 15, 14, 1],
      [8, 8, 1, 7], [21, 8, 1, 7],
    ],
    vaos: [[14, 7], [14, 15]],
    comodos: [
      { nome: 'a', rect: [9, 8, 12, 7], slot: 0 },
      { nome: 'b', rect: [1, 2, 27, 5], slot: 1 },
      { nome: 'c', rect: [1, 16, 27, 4], slot: 2 },
      { nome: 'oeste', rect: [1, 7, 7, 9], modulo: 'corredor' },
      { nome: 'leste', rect: [22, 7, 6, 9], modulo: 'corredor' },
    ],
  },

  // ------------------------------------------------------------- poco --
  poco: {
    largura: 20,
    altura: 18,
    paredes: [[1, 8, 17, 2]],
    vaos: [[9, 8], [9, 9]],
    comodos: [
      { nome: 'a', rect: [1, 2, 17, 6], slot: 0 },
      { nome: 'b', rect: [1, 10, 17, 7], slot: 1 },
    ],
  },

  // -------------------------------------------- salao com duas laterais --
  salao_2: {
    largura: 32,
    altura: 22,
    paredes: [
      [21, 2, 1, 12],
      [22, 8, 9, 1],
      [1, 14, 30, 2],
    ],
    vaos: [[21, 6], [21, 11], [10, 14], [10, 15], [26, 8]],
    comodos: [
      { nome: 'a', rect: [1, 2, 20, 12], slot: 0 },
      { nome: 'b', rect: [22, 2, 9, 6], slot: 1 },
      { nome: 'c', rect: [22, 9, 9, 5], slot: 2 },
      { nome: 'rodape', rect: [1, 16, 30, 4], modulo: 'corredor' },
    ],
  },
};

// ---------------------------------------------------------- labirintos --
/**
 * OS TRES LABIRINTOS AUTORAIS.
 *
 * Cada corredor e um SEGMENTO escrito a mao — `[x0, y0, x1, y1]`, horizontal ou
 * vertical, largura de um tile. Fora dos segmentos e dos comodos, tudo e
 * alvenaria. E o mesmo idioma de polilinha que `VIAS` usa nos mapas externos, e
 * foi escolhido em vez de arte ASCII por um motivo pratico: uma linha de trinta
 * caracteres com um `#` fora de lugar produz um labirinto sem saida e ninguem
 * acha o erro olhando; um segmento errado a conferencia aponta pelo nome.
 *
 * `marcos` sao os pontos de referencia que a Parte 21 pede — porta numerada,
 * cor de tubo, maquina quebrada. Sao objetos de exame, e e por eles que o
 * jogador aprende o caminho em vez de decorar curvas.
 */
export const LABIRINTOS = {
  labirinto_a: {
    largura: 30,
    altura: 22,
    // Tubulacoes: um anel externo, tres travessias e dois becos.
    corredores: [
      [1, 2, 28, 2], // galeria de cima, de ponta a ponta
      [1, 2, 1, 19], // ramal oeste completo
      [28, 2, 28, 19], // ramal leste completo
      [1, 19, 28, 19], // galeria de baixo
      [5, 2, 5, 12], // travessia 1 (beco: para no 12)
      [12, 4, 12, 19], // travessia 2 (liga cima e baixo)
      [21, 2, 21, 16], // travessia 3
      [5, 12, 12, 12], // ligacao das travessias 1 e 2
      [12, 8, 21, 8], // atravessa o meio
      [16, 8, 16, 16], // desce do meio pro ramal 3
      [16, 16, 21, 16],
      [8, 16, 12, 16], // beco curto
      [24, 6, 28, 6], // reentrancia leste
      [24, 6, 24, 12],
    ],
    comodos: [
      { nome: 'a', rect: [2, 3, 3, 4], slot: 0 },
      { nome: 'b', rect: [13, 9, 3, 3], slot: 1 },
      { nome: 'c', rect: [25, 13, 3, 5], slot: 2 },
      { nome: 'd', rect: [2, 13, 3, 5], slot: 3 },
    ],
  },

  labirinto_b: {
    largura: 30,
    altura: 24,
    // Galeria de cabos: uma espinha vertical com costelas alternadas.
    corredores: [
      [14, 2, 14, 21], // espinha
      [1, 2, 28, 2],
      [1, 21, 28, 21],
      [1, 2, 1, 21],
      [28, 2, 28, 21],
      [2, 5, 14, 5], // costela 1 (oeste)
      [14, 8, 27, 8], // costela 2 (leste)
      [2, 11, 14, 11],
      [14, 14, 27, 14],
      [2, 17, 14, 17],
      [5, 5, 5, 11], // ligacao vertical oeste
      [23, 8, 23, 14], // ligacao vertical leste
      [9, 11, 9, 17],
      [20, 14, 20, 21],
      [9, 2, 9, 5],
    ],
    comodos: [
      { nome: 'a', rect: [2, 3, 6, 2], slot: 0 },
      { nome: 'b', rect: [24, 9, 4, 5], slot: 1 },
      { nome: 'c', rect: [10, 18, 4, 3], slot: 2 },
      { nome: 'd', rect: [15, 3, 5, 2], slot: 3 },
    ],
  },

  labirinto_c: {
    largura: 32,
    altura: 24,
    // Baias: malha regular de divisorias, com dois atalhos que nao parecem.
    corredores: [
      [1, 2, 30, 2],
      [1, 21, 30, 21],
      [1, 2, 1, 21],
      [30, 2, 30, 21],
      [7, 2, 7, 21],
      [14, 2, 14, 21],
      [21, 2, 21, 21],
      [1, 7, 7, 7],
      [14, 7, 21, 7],
      [7, 12, 14, 12],
      [21, 12, 30, 12],
      [1, 17, 14, 17],
      [21, 17, 30, 17],
      [24, 2, 24, 12],
      [4, 12, 7, 12],
      [4, 12, 4, 17],
      [27, 17, 27, 21],
    ],
    comodos: [
      { nome: 'a', rect: [2, 3, 5, 3], slot: 0 },
      { nome: 'b', rect: [15, 8, 6, 3], slot: 1 },
      { nome: 'c', rect: [22, 18, 5, 3], slot: 2 },
      { nome: 'd', rect: [8, 13, 6, 3], slot: 3 },
    ],
  },
};

/**
 * Transforma um labirinto autoral em paredes/vaos no formato do template.
 *
 * O jeito de fazer isso e pelo NEGATIVO: a alvenaria e tudo, e os corredores e
 * os comodos abrem buraco nela. Declarar as paredes uma por uma daria centenas
 * de retangulos; declarar os corredores da dezessete linhas legiveis.
 */
function templateDoLabirinto(lab, servico) {
  const { largura: W, altura: H } = lab;
  // mapa de "aberto", em tiles internos
  const aberto = new Set();
  const abrir = (x, y) => {
    if (x > 0 && y >= 2 && x < W - 1 && y < H - 1) aberto.add(`${x},${y}`);
  };
  for (const [x0, y0, x1, y1] of lab.corredores) {
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);
    if (dx !== 0 && dy !== 0) {
      throw new Error(`labirinto: segmento diagonal [${x0},${y0},${x1},${y1}]`);
    }
    let x = x0;
    let y = y0;
    abrir(x, y);
    while (x !== x1 || y !== y1) {
      x += dx;
      y += dy;
      abrir(x, y);
    }
  }
  for (const c of lab.comodos) {
    const [x, y, w, h] = c.rect;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) abrir(i, j);
  }
  // As paredes viram retangulos de 1x1: o gerador as pinta uma por uma, e o
  // custo disso e irrelevante (um andar tem menos de 500 tiles de alvenaria).
  const paredes = [];
  for (let y = 2; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!aberto.has(`${x},${y}`)) paredes.push([x, y, 1, 1]);
    }
  }
  // Os tres tiles de servico e os marcos tem de cair em corredor ou em comodo.
  // A conferencia de setor pegaria isso depois, mas com uma mensagem sobre um id
  // de objeto; aqui a mensagem diz qual coordenada do labirinto esta errada, que
  // e o que se precisa saber pra corrigir.
  for (const [rotulo, [x, y]] of [
    ['entrada', servico.entrada],
    ['descida', servico.descida],
    ['elevador', servico.elevador],
  ]) {
    if (!aberto.has(`${x},${y}`)) {
      throw new Error(`labirinto: ${rotulo} em ${x},${y} nao esta em corredor nem em comodo`);
    }
  }
  for (const m of servico.marcos ?? []) {
    if (!aberto.has(`${m.tx},${m.ty}`)) {
      throw new Error(`labirinto: marco "${m.id}" em ${m.tx},${m.ty} esta na alvenaria`);
    }
  }

  return {
    largura: W,
    altura: H,
    paredes,
    vaos: [],
    comodos: lab.comodos,
    // Os CORREDORES do labirinto nao entram como comodo de proposito: tile que
    // nenhum comodo cobre fica na escuridao BASE do andar, e os comodos, com o
    // ajuste do modulo, ficam mais claros. E o efeito que se quer — no
    // labirinto o corredor e o lugar tenso e a sala e o alivio.
    //
    // Eles saem daqui SO como lista de tile livre, pro nascimento de inimigo.
    // Um labirinto tem tres salas pequenas e trinta metros de corredor; sem
    // isso, o andar 104 declarava sete bichos no registro e nascia com dois, e
    // todo o resto do andar ficava vazio.
    corredoresLivres: [...aberto].map((k) => k.split(',').map(Number)),
  };
}

/** Os tres tiles de servico de um template, lidos de `PLANTAS_DE_ANDAR`. */
function servicos(idDaPlanta) {
  const p = buscarPlantaDeAndar(idDaPlanta);
  if (!p?.entrada || !p.descida || !p.elevador) {
    throw new Error(`[andares] a planta "${idDaPlanta}" nao declarou os tres tiles de servico`);
  }
  return {
    entrada: [...p.entrada],
    descida: [...p.descida],
    elevador: [...p.elevador],
    marcos: p.marcos ?? [],
  };
}

/**
 * TODAS as geometrias, num mapa so.
 *
 * As nove originais (andares 6-50) moram aqui em cima; as dezesseis dos andares
 * 51-150 moram em andares-fundos.mjs, no mesmo formato. A juncao e feita uma vez
 * so pra `templateDoAndar` continuar tendo um unico lugar onde procurar — que e
 * o que impede um andar de sair sem geometria e ninguem notar ate o tilemap.
 */
const TODAS_AS_GEOMETRIAS = { ...TEMPLATES, ...TEMPLATES_TRABALHO, ...TEMPLATES_INFANCIA };
const TODOS_OS_LABIRINTOS = { ...LABIRINTOS, ...LABIRINTOS_FUNDOS };

export { TODAS_AS_GEOMETRIAS, TODOS_OS_LABIRINTOS };

/** O template de um andar, seja parametrico ou labirinto, com os tiles de servico. */
export function templateDoAndar(def) {
  const s = servicos(def.planta);
  if (TODAS_AS_GEOMETRIAS[def.planta]) return { ...TODAS_AS_GEOMETRIAS[def.planta], ...s };
  const lab = TODOS_OS_LABIRINTOS[def.planta];
  if (!lab) throw new Error(`[andares] template "${def.planta}" nao existe`);
  return { ...templateDoLabirinto(lab, s), ...s };
}

// ------------------------------------------------------------ composicao --
/** Limpa o nome de um comodo pra ele ser unico e legivel no tilemap. */
const nomeDeComodo = (modulo, i) => `${modulo.comodo}_${i}`;

/**
 * Onde os objetos de um comodo podem cair.
 *
 * `prateleira` e a primeira linha util do comodo (encostada na parede de cima):
 * e onde a mobilia e as luminarias vao, porque peca de encostar na parede e o
 * que uma sala industrial tem. `piso` e o resto: e onde caem painel, documento,
 * recipiente de salvado e inimigo.
 *
 * A separacao existe pra o placer nao precisar de deteccao de colisao de verdade
 * — nada que anda cai na prateleira e nada que encosta na parede cai no piso.
 */
function vagasDoComodo(rect) {
  const [x, y, w, h] = rect;
  const prateleira = [];
  const piso = [];
  for (let i = x; i < x + w; i++) prateleira.push([i, y]);
  for (let j = y + 1; j < y + h; j++) {
    for (let i = x; i < x + w; i++) piso.push([i, j]);
  }
  return { prateleira, piso };
}

export function plantasCompostas({ medir }) {
  const geometria = new Map();
  for (const def of ANDARES) {
    if (def.planta === 'desenhada') continue;
    geometria.set(def.andar, templateDoAndar(def));
  }

  /** Onde o jogador chega ao ENTRAR no andar `n` vindo de cima. */
  const chegadaEm = (n) => {
    const t = geometria.get(n);
    if (t) return t.entrada;
    // andares 1 a 5: a chegada e o alcapao declarado a mao. So o andar 5 e
    // alcancado por cima nesta direcao, e o alcapao dele e o `desce_4`.
    return null;
  };

  const plantas = {};

  for (const def of ANDARES_COMPOSTOS) {
    const t = geometria.get(def.andar);
    const enigma = enigmaDoAndar(def.andar);
    const nome = mapaDoAndar(def.andar);

    // ---------------------------------------------------------- comodos --
    const comodos = {};
    const pisos = {};
    const paredePorComodo = {};
    const escuridaoPorComodo = {};
    const infos = [];
    t.comodos.forEach((c, i) => {
      const idModulo = c.slot === undefined ? c.modulo : def.modulos[c.slot];
      const modulo = buscarModulo(idModulo);
      if (!modulo) throw new Error(`[${nome}] modulo "${idModulo}" nao existe`);
      const chave = nomeDeComodo(modulo, i);
      comodos[chave] = c.rect;
      pisos[chave] = modulo.piso;
      // CAPITULO 5: a parede vem da folha do fundo da usina. E a unica coisa
      // que muda por capitulo na geometria — o resto do andar continua sendo o
      // mesmo template com os mesmos modulos.
      paredePorComodo[chave] = paredeDoModulo(modulo, def.kit);
      escuridaoPorComodo[chave] = +Math.min(
        0.9,
        Math.max(0, def.escuridao + modulo.escuridaoExtra),
      ).toFixed(4);
      infos.push({ chave, rect: c.rect, modulo, vagas: vagasDoComodo(c.rect) });
    });

    // ---------------------------------------------------------- reservas --
    const ocupado = new Set();
    const reservar = (x, y, raio = 1) => {
      for (let j = y - raio; j <= y + raio; j++) {
        for (let i = x - raio; i <= x + raio; i++) ocupado.add(`${i},${j}`);
      }
    };
    reservar(...t.entrada, 1);
    reservar(...t.descida, 1);
    if (def.parada) reservar(...t.elevador, 1);
    /**
     * OS VAOS entre comodos, e o tile de cada lado deles.
     *
     * Sem esta reserva a mobilia pousava na primeira linha do comodo — que e
     * exatamente onde o vao desemboca — e o corpo solido dela fechava a
     * passagem. O jogador ainda passava raspando (o corpo do movel comeca um
     * quarto de tile abaixo da linha), mas era uma porta obstruida, e a
     * conferencia dos andares pegou isso no andar 6.
     */
    for (const [vx, vy] of t.vaos) {
      reservar(vx, vy, 0);
      reservar(vx, vy + 1, 0);
      reservar(vx, vy - 1, 0);
    }

    /** Primeira vaga livre de uma lista, marcando-a como ocupada. */
    const pegar = (lista, sal, margem = 0) => {
      if (lista.length === 0) return null;
      const inicio = dado(def.andar, sal, lista.length);
      for (let k = 0; k < lista.length; k++) {
        const [x, y] = lista[(inicio + k) % lista.length];
        if (ocupado.has(`${x},${y}`)) continue;
        reservar(x, y, margem);
        return [x, y];
      }
      return null;
    };

    // ------------------------------------------------------------ saidas --
    const saidas = [];
    // SOBE: sempre existe. O destino e o andar de cima, no alcapao de descida
    // dele. Nos andares 6 a 50 isso sai da geometria; no 6, o de cima e o setor
    // desenhado a mao `represa_4`, e o alcapao novo dele esta declarado lá.
    const acima = def.andar - 1;
    const geoAcima = geometria.get(acima);
    saidas.push({
      id: 'sobe',
      tx: t.entrada[0],
      ty: t.entrada[1],
      destino: mapaDoAndar(acima),
      destinoTx: geoAcima ? geoAcima.descida[0] : DESCIDA_DO_ANDAR_5[0],
      destinoTy: geoAcima ? geoAcima.descida[1] : DESCIDA_DO_ANDAR_5[1],
      grelha: true,
      rotulo: 'Subir',
    });
    if (def.andar < ANDARES.length) {
      const abaixo = def.andar + 1;
      const trava = travaDescida(def.andar) ? flagDoEnigma(def.andar) : null;
      saidas.push({
        id: 'desce',
        tx: t.descida[0],
        ty: t.descida[1],
        destino: mapaDoAndar(abaixo),
        destinoTx: chegadaEm(abaixo)[0],
        destinoTy: chegadaEm(abaixo)[1],
        grelha: true,
        rotulo: 'Descer',
        ...(trava ? { trancada: trava } : {}),
      });
    }
    if (def.parada) {
      saidas.push({
        id: 'elevador',
        tx: t.elevador[0],
        ty: t.elevador[1],
        // O elevador nao e uma porta pra um destino fixo: ele abre um MENU de
        // paradas ja ativadas (ver `abrirElevador` na FarmScene). O destino
        // declarado aqui e o andar 1, que e a parada que sempre existe.
        destino: mapaDoAndar(1),
        destinoTx: 14,
        destinoTy: 15,
        grelha: true,
        rotulo: 'Elevador de servico',
        elevador: def.andar,
      });
    }

    // ------------------------------------------------------------ painel --
    const paineis = [];
    if (enigma) {
      const preferidos = infos.filter((i) => i.modulo.aceitaPainel);
      const alvo = (preferidos.length ? preferidos : infos)[
        dado(def.andar, 'painel', (preferidos.length ? preferidos : infos).length)
      ];
      const p = pegar(alvo.vagas.prateleira, 'painelpos', 1) ?? pegar(alvo.vagas.piso, 'painelpiso', 1);
      if (!p) throw new Error(`[${nome}] nao sobrou vaga pro painel`);
      paineis.push({ id: enigma.painel.id, tx: p[0], ty: p[1] });
    }

    // --------------------------------------------------------- documentos --
    const avisos = [];
    const paraFicha = infos.filter((i) => i.modulo.aceitaFicha);
    const salaDaFicha = (paraFicha.length ? paraFicha : infos)[
      dado(def.andar, 'ficha', (paraFicha.length ? paraFicha : infos).length)
    ];
    const posFicha = pegar(salaDaFicha.vagas.piso, 'fichapos', 0)
      ?? pegar(salaDaFicha.vagas.prateleira, 'fichaprat', 0);
    if (!posFicha) throw new Error(`[${nome}] nao sobrou vaga pra ficha medica`);
    avisos.push({
      id: idDaFicha(def.andar),
      tx: posFicha[0],
      ty: posFicha[1],
      ficha: def.andar,
      // O andar 50 guarda a ultima ficha atras do proprio enigma: e a unica que
      // pede algo do jogador, e e a que fecha o capitulo 5.
      ...(def.andar === 50 ? { requer: flagDoEnigma(50) } : {}),
    });
    for (const pista of PISTAS_POR_ANDAR.get(def.andar) ?? []) {
      const sala = infos[dado(def.andar, `pista${pista.id}`, infos.length)];
      const pos = pegar(sala.vagas.piso, `pistapos${pista.id}`, 0)
        ?? pegar(sala.vagas.prateleira, `pistaprat${pista.id}`, 0);
      if (!pos) throw new Error(`[${nome}] nao sobrou vaga pra pista "${pista.id}"`);
      avisos.push({ id: pista.id, tx: pos[0], ty: pos[1] });
    }
    // ------------------------------------------------------------ decais --
    /**
     * A PLACA DE FAIXA vem primeiro e vai perto da chegada: e a primeira coisa
     * que o jogador ve ao descer, e e ela que diz em que trecho ele esta sem
     * precisar de HUD.
     */
    const faixa = faixaDoAndar(def.andar);
    if (faixa) {
      const salaDaChegada = infos.find((i) => dentroDoRect(i.rect, t.entrada)) ?? infos[0];
      const pos = pegar(salaDaChegada.vagas.prateleira, 'faixapos', 0)
        ?? pegar(salaDaChegada.vagas.piso, 'faixapiso', 0);
      if (pos) {
        avisos.push({
          id: `faixa_${String(def.andar).padStart(3, '0')}`,
          tx: pos[0], ty: pos[1], decal: faixa,
        });
      }
    }
    for (const decal of decaisDoAndar(def.andar)) {
      // Prefere o comodo com mais parede a vista (`paredao`, `corredor`): um
      // desenho de crianca atras de uma estante nao e raro, e invisivel.
      const preferidos = infos.filter((i) => i.modulo.id === 'paredao' || i.modulo.id === 'corredor');
      const lista = preferidos.length ? preferidos : infos;
      const sala = lista[dado(def.andar, `${decal.id}sala`, lista.length)];
      const pos = pegar(sala.vagas.prateleira, `${decal.id}p`, 0)
        ?? pegar(sala.vagas.piso, `${decal.id}c`, 0);
      if (!pos) continue; // decal e enfeite: se nao coube, nao cabe. Nada quebra.
      avisos.push({ id: decal.id, tx: pos[0], ty: pos[1], decal: decal.peca });
    }

    for (const marco of t.marcos ?? []) {
      if (ocupado.has(`${marco.tx},${marco.ty}`)) continue;
      reservar(marco.tx, marco.ty, 0);
      avisos.push({ id: `${marco.id}_${String(def.andar).padStart(2, '0')}`, tx: marco.tx, ty: marco.ty, marco: marco.id });
    }

    // ------------------------------------------------------------ salvado --
    const sucata = [];
    const quantos = 3 + (def.andar % 3);
    for (let k = 0; k < quantos; k++) {
      const sala = infos[(dado(def.andar, `suc${k}`, infos.length) + k) % infos.length];
      const pos = pegar(sala.vagas.piso, `sucpos${k}`, 0);
      if (!pos) continue;
      sucata.push({ id: `caixa_${def.andar}_${k}`, tx: pos[0], ty: pos[1], tabela: def.loot });
    }
    // O PREMIO do enigma. Quando o enigma nao trava a descida, e ele que da
    // sentido ao painel — abre um recipiente da tabela de premio do trecho.
    if (enigma && !enigma.travaDescida) {
      const sala = infos[dado(def.andar, 'premio', infos.length)];
      const pos = pegar(sala.vagas.piso, 'premiopos', 0);
      if (pos) {
        sucata.push({
          id: `premio_${def.andar}`,
          tx: pos[0],
          ty: pos[1],
          tabela: `${def.loot}_premio`,
          requer: flagDoEnigma(def.andar),
        });
      }
    }

    // ----------------------------------------------------------- inimigos --
    /**
     * ZONAS DE NASCIMENTO. Nao ha coordenada arbitraria: o inimigo nasce dentro
     * de um comodo que nao e seguro, longe do alcapao de chegada (a Parte 10
     * proibe nascer ao lado da entrada) e nunca em cima de documento, painel ou
     * recipiente — o `ocupado` ja cuida dos tres.
     */
    const inimigos = [];
    const hostis = infos.filter((i) => !i.modulo.seguro);
    /**
     * NO LABIRINTO o corredor tambem vale como berco.
     *
     * A regra de distancia da chegada continua valendo, e o `ocupado` continua
     * barrando tile de documento, painel e recipiente — o que muda e so o
     * conjunto de tiles candidatos.
     */
    const corredores = (t.corredoresLivres ?? []).filter(
      ([x, y]) => !ocupado.has(`${x},${y}`)
        && Math.hypot(x - t.entrada[0], y - t.entrada[1]) >= 6,
    );
    const pesoTotal = def.fauna.reduce((s, f) => s + f.peso, 0);
    for (let k = 0; k < def.inimigos && hostis.length > 0; k++) {
      /**
       * Tenta a sala sorteada e, se ela estiver lotada, TODAS as outras.
       *
       * Sem o segundo laco o andar saia com menos inimigos do que o registro
       * declara — bastava a sala sorteada ja ter documento, painel e dois
       * recipientes pra a vaga acabar. A conferencia dos andares compara os dois
       * numeros e foi ela que pegou isso, no andar 17.
       */
      let pos = null;
      for (let tentativa = 0; tentativa < hostis.length && !pos; tentativa++) {
        const sala = hostis[(dado(def.andar, `inim${k}`, hostis.length) + k + tentativa) % hostis.length];
        // A DISTANCIA MINIMA da chegada e inegociavel: nascer ao lado do alcapao
        // e o que a Parte 10 proibe, e o segundo laco existe pra achar sala com
        // vaga, nao pra afrouxar a regra.
        const longe = sala.vagas.piso.filter(
          ([x, y]) => Math.hypot(x - t.entrada[0], y - t.entrada[1]) >= 6,
        );
        pos = pegar(longe, `inimpos${k}${tentativa}`, 1);
      }
      if (!pos && corredores.length > 0) {
        // sobra o corredor: mesma regra de distancia, tile ainda livre
        for (let tentativa = 0; tentativa < corredores.length && !pos; tentativa++) {
          const i = (dado(def.andar, `corr${k}`, corredores.length) + k + tentativa) % corredores.length;
          const [x, y] = corredores[i];
          if (ocupado.has(`${x},${y}`)) continue;
          reservar(x, y, 1);
          pos = [x, y];
        }
      }
      if (!pos) continue;
      // especie por peso, deterministica
      let sorteio = hash(def.andar, `esp${k}`) * pesoTotal;
      let tipo = def.fauna[0].tipo;
      for (const f of def.fauna) {
        sorteio -= f.peso;
        if (sorteio <= 0) {
          tipo = f.tipo;
          break;
        }
      }
      inimigos.push({ id: `${def.andar}_${k}`, tipo, tx: pos[0], ty: pos[1], raio: 4 });
    }

    // -------------------------------------------------------------- luzes --
    /**
     * LUMINARIAS. `tipo` escolhe a arte no atlas `equipamento`, e `circuito`
     * liga a lampada ao enigma do andar: enquanto ele nao e resolvido, as
     * luminarias do circuito ficam APAGADAS. E o gancho da Parte 24 — resolver o
     * painel clareia o andar e revela caminho que estava ilegivel.
     */
    const luzes = [];
    const TIPOS_DE_LUZ = ['pendente', 'gaiola', 'tubular', 'teto'];
    infos.forEach((info, i) => {
      const [x, y, w] = info.rect;
      for (let k = 0; k < info.modulo.luzes; k++) {
        const px = Math.round(x + (w * (k + 1)) / (info.modulo.luzes + 1));
        luzes.push({
          tx: Math.max(x, Math.min(x + w - 1, px)),
          ty: y,
          raio: 3 + (i % 2),
          tipo: TIPOS_DE_LUZ[(def.andar + i + k) % TIPOS_DE_LUZ.length],
          // Metade das luminarias depende do enigma do andar; a outra metade
          // fica acesa, senao um andar com o enigma nao resolvido ficaria cego.
          // A propriedade e OMITIDA quando nao ha circuito: prop nula viraria
          // uma string vazia no Tiled e o jogo leria como "circuito chamado ''".
          ...(enigma && (i + k) % 2 === 1 ? { circuito: flagDoEnigma(def.andar) } : {}),
        });
      }
    });

    // ------------------------------------------------------------ mobilia --
    const mobilia = {};
    for (const info of infos) {
      const lista = [];
      const catalogo = MOBILIA_POR_TIPO[info.modulo.comodo] ?? [];
      if (catalogo.length === 0) {
        mobilia[info.chave] = lista;
        continue;
      }
      let x = info.rect[0];
      const limite = info.rect[0] + info.rect[2];
      let k = 0;
      while (x < limite) {
        const nomeMovel = catalogo[(dado(def.andar, `mob${info.chave}${k}`, catalogo.length) + k) % catalogo.length];
        /**
         * A PEGADA em tiles inteiros, arredondada pra CIMA.
         *
         * `medir` devolve a largura real da peca em tiles, que e fracionaria
         * (0,99 tile, 2,4 tiles). Tratar isso como contagem de tile deu dois
         * defeitos de uma vez: o laco de reserva rodava `i < 0,99` e marcava um
         * tile so, e o avanco `x += 0,99 + 1` tirava o `x` do inteiro — a peca
         * seguinte pousava em 9,6 e o corpo dela invadia o tile 10, que era
         * justamente a soleira de uma porta. A conferencia dos andares pegou isso
         * no andar 10.
         */
        const largura = Math.max(1, Math.ceil(medir(nomeMovel).w));
        if (x + largura > limite) break;
        const livre = Array.from({ length: largura }, (_, i) => !ocupado.has(`${x + i},${info.rect[1]}`))
          .every(Boolean);
        if (livre) {
          for (let i = 0; i < largura; i++) ocupado.add(`${x + i},${info.rect[1]}`);
          lista.push({ movel: nomeMovel, tx: x, ty: info.rect[1] });
          x += largura + 1;
        } else {
          x += 1;
        }
        k += 1;
        if (k > 40) break;
      }
      mobilia[info.chave] = lista;
    }

    plantas[nome] = {
      andar: def.andar,
      nivel: 1 - def.andar,
      rotulo: `${def.rotulo} — ${def.codigo}`,
      escuridao: def.escuridao,
      escuridaoPorComodo,
      parede: def.kit === 'usina' ? 'represa_tecnico' : PAREDE_DE_MOLDURA[def.kit],
      paredePorComodo,
      chao: 'PISO_CONCRETO',
      pisos,
      largura: t.largura,
      altura: t.altura,
      paredes: t.paredes,
      vaos: t.vaos,
      comodos,
      saidas,
      mobilia,
      paineis,
      sucata,
      avisos,
      inimigos,
      luzes,
    };
  }

  return plantas;
}

/**
 * Onde o jogador cai ao SUBIR do andar 6 pro 5, e de onde ele desce do 5 pro 6.
 *
 * O andar 5 e `represa_4`, planta desenhada a mao. O alcapao de descida dele nao
 * existia (era o fim da usina) e foi acrescentado em `PLANTAS_REPRESA`; este par
 * de coordenadas e o mesmo dos dois lados, e a conferencia de setor compara.
 */
export const DESCIDA_DO_ANDAR_5 = [20, 15];

/**
 * MOBILIA por tipo de comodo do modulo. Sao os nomes de `CATALOGO_POR_COMODO`
 * (gerar-assets.mjs), filtrados a mao: peca de encostar na parede, que e o que
 * cabe numa prateleira de um tile de altura.
 *
 * A validacao de categoria continua sendo a de `pecasDeCatalogo` — se um nome
 * daqui nao pertencer a categoria do comodo, a geracao para.
 */
const MOBILIA_POR_TIPO = {
  controle: [
    'mesa_bancada_pc', 'setup_oficina', 'armario_pecas', 'estante_caixas',
    'bancada_trabalho', 'caixa_ferramenta',
  ],
  galeria: [
    'armario_pecas', 'prateleira_pecas', 'estante_caixas', 'cesto_sucata',
    'ventilador_oficina', 'ar_oficina',
  ],
  corredor_manutencao: [
    'armario_pecas', 'estante_caixas', 'prateleira_pecas', 'cesto_sucata',
  ],
  poco: ['cesto_sucata', 'prateleira_pecas', 'estante_caixas'],
  eletrica: ['armario_pecas', 'bancada_trabalho', 'estante_caixas', 'prateleira_pecas'],
  deposito: [
    'estante_caixas', 'armario_pecas', 'prateleira_pecas', 'caixa_ferramenta', 'cesto_sucata',
  ],
  arquivo: [
    'estante_arquivo', 'estante_acervo', 'estante_acervo_alta', 'mesa_leitura', 'pc_consulta',
  ],
};

export { MOBILIA_POR_TIPO };

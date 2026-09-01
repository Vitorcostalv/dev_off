/**
 * OS CINQUENTA ANDARES DA REPRESA — o registro central.
 *
 * Este arquivo e o UNICO lugar em que se decide qualquer coisa por andar. Nao ha
 * `if (andar === 23)` espalhado pelo jogo: a cena, a HUD, o gerador de tilemap, o
 * sorteio de inimigo, o enigma, o documento e a conferencia offline leem todos
 * daqui. Foi a Parte 30 do plano que pediu isso, e o motivo e concreto — com
 * cinquenta andares, uma regra escrita em dois lugares e uma regra que vai
 * divergir.
 *
 * ---------------------------------------------------------------------------
 * OS CINCO PRIMEIROS ANDARES SAO OS CINCO SETORES ANTIGOS
 * ---------------------------------------------------------------------------
 * `represa_0` .. `represa_4` continuam existindo, com as mesmas chaves de mapa,
 * as mesmas plantas desenhadas a mao e as mesmas flags de puzzle. Eles passaram a
 * ser os andares 1 a 5. Nao ha renomeacao, nao ha migracao de save e um jogo
 * salvo dentro do `represa_2` continua abrindo no mesmo lugar.
 *
 * Os andares 6 a 50 sao novos e usam chave `represa_f06` .. `represa_f50`. Eles
 * NAO tem planta desenhada a mao: sao COMPOSTOS por modulo (ver
 * `MODULOS_DE_ANDAR` e os construtores de planta em tools/gerar-assets.mjs) a
 * partir do que este arquivo declara. Composicao nao e geracao aleatoria — cada
 * andar declara qual template usa e qual modulo entra em cada vao dele, e o
 * resultado e o mesmo em toda maquina e em todo reload.
 *
 * ---------------------------------------------------------------------------
 * O QUE MUDOU DE BALANCEAMENTO, E POR QUE
 * ---------------------------------------------------------------------------
 * A leva anterior tinha CINCO andares, e por isso a curva dela era ingreme: a
 * escuridao saltava de 0 a 0,8 em cinco passos e os dois monstros mais pesados
 * do jogo apareciam no quarto e no quinto. Com cinquenta andares isso deixaria
 * quarenta e cinco andares sem espaco pra crescer. Entao:
 *
 *  - a ESCURIDAO virou uma curva de 0 (andar 1) a 0,86 (andar 50);
 *  - a FAUNA passou a seguir o capitulo, com uma especie dominante por faixa;
 *  - a TENSAO passou a acelerar por CAPITULO e nao por profundidade absoluta
 *    (49 vezes o fator antigo estouraria o teto em tres minutos).
 *
 * Isso REBALANCEIA os andares 2 a 5, que ficam mais claros e com bicho mais
 * leve do que estavam. E deliberado: eles agora sao a introducao de uma descida
 * de cinquenta, e nao o fim dela.
 */

/** Capitulo narrativo. Dez andares cada. */
export type CapituloAndar = 1 | 2 | 3 | 4 | 5;

export interface DefinicaoCapitulo {
  numero: CapituloAndar;
  nome: string;
  /** primeiro e ultimo andar, inclusive */
  faixa: readonly [number, number];
  /** o que o capitulo mostra no ambiente */
  ambiente: string;
  /** o que os documentos daquele trecho tratam */
  tema: string;
  /**
   * Especies de monstro do capitulo. `primaria` domina; `secundaria` aparece a
   * partir do meio do capitulo; `rara` aparece so nos tres ultimos andares dele.
   * Todas tem de existir em `CATALOGO_INIMIGOS` — a conferencia cobra.
   */
  fauna: { primaria: string; secundaria?: string; rara?: string };
  /** multiplicador de subida da tensao dentro do capitulo */
  fatorDeTensao: number;
}

export const CAPITULOS: readonly DefinicaoCapitulo[] = [
  {
    numero: 1,
    nome: 'Rotina',
    faixa: [1, 10],
    ambiente:
      'Ainda parece uma usina hidreletrica desativada e nada mais. A luz de teto funciona na '
      + 'maior parte, o piso foi lavado alguma vez e as portas fecham.',
    tema: 'cansaco, hora extra, sono ruim, trabalho demais, nao conseguir desligar',
    fauna: { primaria: 'esfera_choque', secundaria: 'smartfone' },
    fatorDeTensao: 1,
  },
  {
    numero: 2,
    nome: 'Pressao',
    faixa: [11, 20],
    ambiente:
      'Mais equipamento arrebentado, mais vao sem luz, mais bicho. A agua de infiltracao ja '
      + 'chega ao piso em alguns comodos.',
    tema: 'estresse cronico, sintoma de ansiedade, exaustao fisica, queixa repetida, nao descansar',
    fauna: { primaria: 'smartfone', secundaria: 'esfera_choque', rara: 'impressora' },
    fatorDeTensao: 1.5,
  },
  {
    numero: 3,
    nome: 'Colapso',
    faixa: [21, 30],
    ambiente:
      'A arquitetura industrial continua industrial, e passa a estar arranjada de um jeito '
      + 'desconfortavel: corredor que da em corredor, sala repetida, cota que nao fecha.',
    tema: 'exaustao grave, falha de memoria, instabilidade emocional, acompanhamento, recomendacao de parar',
    fauna: { primaria: 'impressora', secundaria: 'smartfone', rara: 'caixa_som' },
    fatorDeTensao: 2,
  },
  {
    numero: 4,
    nome: 'Negacao',
    faixa: [31, 40],
    ambiente:
      'Comeca a aparecer coisa que nao e de usina: divisoria de baia, monitor ligado sem cabo, '
      + 'tela de erro, prazo escrito na parede. Nada explica nada.',
    tema: 'reconhecer o que ja se sabia, negar o proprio quadro, prazo, cobranca',
    fauna: { primaria: 'robo_servico', secundaria: 'caixa_som', rara: 'maquina_lavar' },
    fatorDeTensao: 2.5,
  },
  {
    numero: 5,
    nome: 'Reconhecimento',
    faixa: [41, 50],
    ambiente:
      'O mais escuro e o mais hostil que a usina fica. As duas coisas convivem sem se resolver: '
      + 'a barragem de 1961 e o escritorio que nunca existiu ali.',
    tema: 'o motivo real da mudanca pra cidade pequena, e o que ficou por dizer',
    fauna: { primaria: 'maquina_lavar', secundaria: 'robo_servico', rara: 'geladeira_gelo' },
    fatorDeTensao: 3,
  },
];

export function capituloDoAndar(andar: number): DefinicaoCapitulo {
  const c = CAPITULOS.find((cap) => andar >= cap.faixa[0] && andar <= cap.faixa[1]);
  if (!c) throw new Error(`[andares] andar ${andar} esta fora dos cinco capitulos`);
  return c;
}

// ------------------------------------------------------------- escuridao --
/** Andares totais. Cinquenta nesta fase; abaixo do 50 fica pra depois. */
export const ANDARES_TOTAIS = 50;

/**
 * ESCURIDAO base do andar, 0 a 1.
 *
 * O andar 1 e a casa de forca: luz de teto acesa, zero escuridao. Do 2 em diante
 * a curva sobe devagar e para em 0,86 — preto puro mata a leitura da arte, e o
 * ultimo andar tem de continuar jogavel com a lanterna.
 *
 * O piso de 0,12 no andar 2 nao e arbitrario: e quase o valor que o setor
 * `represa_1` ja tinha (0,18) na leva dos cinco. A entrada da penumbra continua
 * onde estava; o que mudou e que agora ela tem quarenta e oito andares pra
 * crescer em vez de tres.
 */
export function escuridaoDoAndar(andar: number): number {
  if (andar <= 1) return 0;
  return +Math.min(0.86, 0.12 + (andar - 2) * 0.0155).toFixed(4);
}

// ---------------------------------------------------------------- fauna --
/**
 * Quantos inimigos nascem no andar.
 *
 * Cresce com a profundidade e para em 7. O teto existe por desempenho e por
 * jogabilidade: oito maquinas pesadas num corredor escuro nao e dificuldade, e
 * sim uma parede.
 */
export function inimigosDoAndar(andar: number): number {
  if (andar <= 2) return 0; // os dois primeiros sao zona segura
  return Math.min(7, 1 + Math.floor((andar - 3) / 7));
}

/**
 * Tabela PONDERADA de especies do andar.
 *
 * A regra e a da Parte 11: uma especie dominante por faixa, a secundaria
 * entrando no meio do capitulo e a rara so no fim dele. Nos capitulos 4 e 5 as
 * tres convivem, que e o que faz o fundo parecer misturado.
 */
export function faunaDoAndar(andar: number): { tipo: string; peso: number }[] {
  const cap = capituloDoAndar(andar);
  const posicao = andar - cap.faixa[0]; // 0 a 9
  const tabela: { tipo: string; peso: number }[] = [{ tipo: cap.fauna.primaria, peso: 10 }];
  if (cap.fauna.secundaria && posicao >= 4) {
    tabela.push({ tipo: cap.fauna.secundaria, peso: posicao >= 7 ? 6 : 3 });
  }
  if (cap.fauna.rara && posicao >= 7) tabela.push({ tipo: cap.fauna.rara, peso: 2 });
  return tabela;
}

// ----------------------------------------------------------------- loot --
/**
 * Tabela de salvado do andar. Sao as cinco tabelas por nivel que ja existiam
 * (`nivel_0` a `nivel_4`), agora distribuidas ao longo dos cinquenta andares:
 * dez andares por tabela.
 */
export function tabelaDoAndar(andar: number): string {
  return `nivel_${Math.min(4, Math.floor((andar - 1) / 10))}`;
}

// ------------------------------------------------------------ checkpoint --
/**
 * ANDARES DE PARADA DO ELEVADOR DE SERVICO.
 *
 * Cinquenta andares sem atalho seria releitura obrigatoria de tudo a cada
 * descida. Cada parada precisa ser ATIVADA no proprio andar antes de valer (ver
 * `flagDeCheckpoint`), entao nao ha como pular pra andar nao visitado.
 */
export const ANDARES_DE_PARADA: readonly number[] = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export const flagDeCheckpoint = (andar: number): string =>
  `represaParada${String(andar).padStart(2, '0')}`;

// --------------------------------------------------------------- fichas --
/**
 * FICHA MEDICA do andar — um documento por andar, cobrindo QUATRO dias da
 * cronologia de 200 dias. O andar 1 traz os dias 1 a 4; o 50, os dias 197 a 200.
 *
 * O id e deterministico e o intervalo sai da aritmetica, nao de uma tabela: com
 * cinquenta entradas escritas a mao, um intervalo repetido ou um vao de quatro
 * dias passaria batido. O texto de cada uma mora em `src/game/fichas.ts`.
 */
export const idDaFicha = (andar: number): string => `ficha_${String(andar).padStart(3, '0')}`;

export function diasDaFicha(andar: number): { de: number; ate: number } {
  return { de: (andar - 1) * 4 + 1, ate: andar * 4 };
}

// ---------------------------------------------------------------- mapa --
/**
 * Chave de mapa do andar.
 *
 * Os cinco primeiros mantem a chave ANTIGA. E o que faz um save gravado dentro
 * de `represa_3` continuar abrindo em `represa_3` — subir a versao do save e
 * descartar o progresso de quem ja desceu seria o preco de uma renomeacao que
 * nao muda nada em jogo.
 */
const CHAVES_ANTIGAS = ['represa_0', 'represa_1', 'represa_2', 'represa_3', 'represa_4'];

export function mapaDoAndar(andar: number): string {
  return CHAVES_ANTIGAS[andar - 1] ?? `represa_f${String(andar).padStart(2, '0')}`;
}

/** O andar de uma chave de mapa, ou null se ela nao e da usina. */
export function andarDoMapa(mapa: unknown): number | null {
  if (typeof mapa !== 'string') return null;
  const antigo = CHAVES_ANTIGAS.indexOf(mapa);
  if (antigo >= 0) return antigo + 1;
  const m = /^represa_f(\d{2})$/.exec(mapa);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= ANDARES_TOTAIS ? n : null;
}

// -------------------------------------------------------------- plantas --
/**
 * TEMPLATE de planta. Cada um e um construtor parametrizado em
 * tools/gerar-assets.mjs; aqui fica so o nome e quantos VAOS DE MODULO ele tem,
 * que e o que este arquivo precisa saber pra a lista de modulos de um andar ser
 * conferivel sem abrir o gerador.
 *
 * `desenhada` marca os cinco primeiros: eles nao passam por construtor nenhum,
 * a planta deles esta escrita a mao em `PLANTAS_REPRESA`.
 */
export interface DefinicaoPlanta {
  id: string;
  nome: string;
  /** quantos comodos de modulo o template tem */
  vaos: number;
  /**
   * OS TRES TILES DE SERVICO do template: onde se chega vindo de cima, onde se
   * desce e onde a cabine do elevador para.
   *
   * Eles moram aqui, e nao junto da geometria (que esta em
   * tools/andares-represa.mjs), por uma razao pratica: `MAPAS.spawnTile` precisa
   * do tile de chegada em tempo de JOGO, e o gerador nao esta disponivel la. O
   * gerador le estes mesmos tres numeros — nao ha uma segunda copia deles — e a
   * conferencia de setor prova, tile por tile, que os tres caem em piso livre e
   * alcancavel do template correspondente.
   */
  entrada?: readonly [number, number];
  descida?: readonly [number, number];
  elevador?: readonly [number, number];
  /**
   * MARCOS de navegacao do labirinto — porta numerada, cor de tubo, maquina
   * parada. Sao objetos de exame, e e por eles que o jogador APRENDE o caminho em
   * vez de decorar curvas (Parte 21). Vazio nos templates parametricos.
   *
   * O texto de cada um mora em `MARCOS_DE_LABIRINTO`, em src/game/avisos.ts: o
   * id do aviso no mapa e `<id>_<andar>`, porque o mesmo labirinto e usado em
   * dois andares diferentes e o texto muda com a profundidade.
   */
  marcos?: readonly { id: string; tx: number; ty: number }[];
  /** true = labirinto autoral, com os corredores escritos segmento por segmento */
  labirinto?: boolean;
  desenhada?: boolean;
}

export const PLANTAS_DE_ANDAR: readonly DefinicaoPlanta[] = [
  { id: 'desenhada', nome: 'Planta desenhada a mao', vaos: 0, desenhada: true },
  // ------------------------------------------------------- parametricos --
  {
    id: 'espinha_3', nome: 'Corredor central com tres salas', vaos: 3,
    entrada: [3, 17], descida: [26, 17], elevador: [14, 17],
  },
  {
    id: 'espinha_5', nome: 'Corredor central com cinco salas', vaos: 5,
    entrada: [3, 19], descida: [30, 19], elevador: [16, 19],
  },
  {
    id: 'cruz_4', nome: 'Cruzamento com quatro salas de canto', vaos: 4,
    entrada: [14, 3], descida: [14, 19], elevador: [14, 11],
  },
  {
    id: 'galeria_2', nome: 'Duas galerias empilhadas', vaos: 2,
    entrada: [4, 4], descida: [25, 18], elevador: [14, 18],
  },
  {
    id: 'galeria_4', nome: 'Duas galerias com anexos', vaos: 4,
    entrada: [4, 4], descida: [18, 18], elevador: [26, 18],
  },
  {
    id: 'anel', nome: 'Corredor em anel com sala central', vaos: 3,
    entrada: [4, 4], descida: [24, 18], elevador: [14, 18],
  },
  {
    id: 'poco', nome: 'Poco: dois comodos e a escada', vaos: 2,
    entrada: [3, 4], descida: [15, 15], elevador: [9, 15],
  },
  {
    id: 'salao_2', nome: 'Salao unico com duas laterais', vaos: 3,
    entrada: [4, 4], descida: [26, 18], elevador: [14, 18],
  },
  // ------------------------------------------------------------ autorais --
  {
    id: 'labirinto_a', nome: 'Labirinto das tubulacoes', vaos: 4, labirinto: true,
    entrada: [1, 2], descida: [26, 17], elevador: [3, 17],
    marcos: [
      { id: 'tubo_azul', tx: 5, ty: 3 },
      { id: 'tubo_vermelho', tx: 12, ty: 5 },
      { id: 'porta_numerada', tx: 21, ty: 9 },
    ],
  },
  {
    id: 'labirinto_b', nome: 'Labirinto dos cabos', vaos: 4, labirinto: true,
    entrada: [14, 2], descida: [26, 21], elevador: [2, 21],
    marcos: [
      { id: 'cabo_marcado', tx: 14, ty: 6 },
      { id: 'painel_cego', tx: 5, ty: 11 },
      { id: 'maquina_parada', tx: 23, ty: 14 },
    ],
  },
  {
    id: 'labirinto_c', nome: 'Labirinto das baias', vaos: 4, labirinto: true,
    entrada: [1, 2], descida: [28, 21], elevador: [2, 21],
    marcos: [
      { id: 'baia_23', tx: 7, ty: 4 },
      { id: 'monitor_ligado', tx: 15, ty: 9 },
      { id: 'quadro_prazos', tx: 24, ty: 5 },
    ],
  },
];

const PLANTA_POR_ID = new Map(PLANTAS_DE_ANDAR.map((p) => [p.id, p]));

export function buscarPlantaDeAndar(id: string): DefinicaoPlanta | null {
  return PLANTA_POR_ID.get(id) ?? null;
}

// -------------------------------------------------------------- modulos --
/**
 * MODULOS INDUSTRIAIS — o vocabulario de comodo da usina.
 *
 * Um modulo e o que um comodo E: sala de controle, camara de turbina, corredor
 * de manutencao, alagado, sala eletrica, deposito, e assim por diante. Ele
 * decide o piso, a parede, a categoria de mobilia e a escuridao RELATIVA do
 * comodo — e por isso que dois andares com o mesmo template nao se parecem.
 *
 * `comodo` e a chave que o catalogo de mobilia do gerador entende (ver
 * `TIPO_DE_COMODO` em tools/gerar-assets.mjs): e o que garante que um deposito
 * receba peca de oficina e um arquivo receba estante de acervo, sem uma segunda
 * tabela de mobilia por modulo.
 */
export interface ModuloDeAndar {
  id: string;
  nome: string;
  /** chave de comodo do gerador — decide a categoria da mobilia */
  comodo: string;
  piso: string;
  parede: string;
  /**
   * Parede do CAPITULO 5 (andares 41 a 50). Ausente = o modulo usa a mesma
   * parede em toda a descida.
   *
   * Existe porque o fundo da usina tem folha de arte propria
   * (`PAredes_internas_represa_andar_50_100.png`): concreto rachado, vidro
   * blindado, parede de painel e tubulacao pesada. E o que faz o capitulo 5
   * parecer outro lugar sem mudar uma linha de geometria.
   */
  paredeFunda?: string;
  /** somado a escuridao do andar; pode ser negativo (comodo com luz propria) */
  escuridaoExtra: number;
  /** true = pode receber painel de enigma */
  aceitaPainel?: boolean;
  /** true = pode receber a ficha medica do andar */
  aceitaFicha?: boolean;
  /** true = e zona segura (inimigo nao nasce dentro) */
  seguro?: boolean;
  /** quantas luminarias o modulo pendura */
  luzes: number;
}

export const MODULOS_DE_ANDAR: readonly ModuloDeAndar[] = [
  {
    id: 'controle', nome: 'Sala de controle', comodo: 'controle',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_painel', escuridaoExtra: -0.08,
    aceitaPainel: true, aceitaFicha: true, seguro: true, luzes: 2,
  },
  {
    id: 'turbina', nome: 'Camara de turbina', comodo: 'galeria',
    piso: 'concreto_escuro', parede: 'represa_tecnico', paredeFunda: 'fundo_tubos', escuridaoExtra: 0.04,
    aceitaPainel: true, luzes: 2,
  },
  {
    id: 'corredor', nome: 'Corredor de manutencao', comodo: 'corredor_manutencao',
    piso: 'concreto_escuro', parede: 'represa_tecnico', paredeFunda: 'fundo_concreto', escuridaoExtra: 0.05, luzes: 1,
  },
  {
    id: 'alagado', nome: 'Area alagada', comodo: 'poco',
    piso: 'concreto_escuro', parede: 'represa_gasto', paredeFunda: 'fundo_concreto', escuridaoExtra: 0.08, luzes: 1,
  },
  {
    id: 'eletrica', nome: 'Sala eletrica', comodo: 'eletrica',
    piso: 'granilite', parede: 'represa_tecnico', paredeFunda: 'fundo_painel', escuridaoExtra: -0.04,
    aceitaPainel: true, luzes: 2,
  },
  {
    id: 'deposito', nome: 'Deposito', comodo: 'deposito',
    piso: 'concreto_escuro', parede: 'represa_faixa', paredeFunda: 'fundo_concreto', escuridaoExtra: 0.02, luzes: 1,
  },
  {
    id: 'ventilacao', nome: 'Corredor de ventilacao', comodo: 'corredor_manutencao',
    piso: 'concreto_escuro', parede: 'represa_tubos', paredeFunda: 'fundo_tubos', escuridaoExtra: 0.06, luzes: 1,
  },
  {
    id: 'geradores', nome: 'Sala dos geradores', comodo: 'galeria',
    piso: 'concreto_escuro', parede: 'represa_tecnico', paredeFunda: 'fundo_painel', escuridaoExtra: 0,
    aceitaPainel: true, luzes: 3,
  },
  {
    id: 'arquivo', nome: 'Arquivo do escritorio', comodo: 'arquivo',
    piso: 'marmore', parede: 'represa_limpo', paredeFunda: 'fundo_vidro', escuridaoExtra: -0.05,
    aceitaFicha: true, seguro: true, luzes: 2,
  },
  {
    id: 'tunel', nome: 'Tunel de servico', comodo: 'corredor_manutencao',
    piso: 'concreto_escuro', parede: 'represa_escuro', paredeFunda: 'fundo_concreto', escuridaoExtra: 0.07, luzes: 1,
  },
  {
    id: 'bombas', nome: 'Casa de bombas', comodo: 'poco',
    piso: 'concreto_escuro', parede: 'represa_tecnico', paredeFunda: 'fundo_tubos', escuridaoExtra: 0.05,
    aceitaPainel: true, luzes: 2,
  },
  {
    id: 'portaria', nome: 'Posto de seguranca', comodo: 'controle',
    piso: 'granilite', parede: 'represa_faixa', paredeFunda: 'fundo_vidro', escuridaoExtra: -0.1,
    aceitaFicha: true, seguro: true, luzes: 2,
  },
  {
    id: 'ferramentaria', nome: 'Ferramentaria', comodo: 'deposito',
    piso: 'concreto_escuro', parede: 'represa_faixa', paredeFunda: 'fundo_concreto', escuridaoExtra: 0,
    aceitaPainel: true, luzes: 2,
  },
  {
    id: 'servidores', nome: 'Sala de servidores', comodo: 'eletrica',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_painel', escuridaoExtra: -0.02,
    aceitaPainel: true, aceitaFicha: true, luzes: 2,
  },
  {
    id: 'cabos', nome: 'Galeria de cabos', comodo: 'corredor_manutencao',
    piso: 'concreto_escuro', parede: 'represa_tubos', paredeFunda: 'fundo_tubos', escuridaoExtra: 0.06, luzes: 1,
  },
  {
    id: 'baias', nome: 'Baias de escritorio', comodo: 'arquivo',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_vidro', escuridaoExtra: 0.02,
    aceitaFicha: true, luzes: 2,
  },
];

const MODULO_POR_ID = new Map(MODULOS_DE_ANDAR.map((m) => [m.id, m]));

export function buscarModulo(id: string): ModuloDeAndar | null {
  return MODULO_POR_ID.get(id) ?? null;
}

// ---------------------------------------------------------------- andares --
/**
 * A TABELA DOS CINQUENTA. Uma linha por andar:
 *
 *     [andar, planta, modulos, rotulo, familiaDoEnigma | null]
 *
 * O resto de cada andar (capitulo, escuridao, fauna, loot, ficha, parada de
 * elevador) e DERIVADO pelas funcoes acima — escrever cinquenta vezes numeros
 * que seguem uma curva e o jeito mais seguro de a curva ter um degrau que
 * ninguem nota.
 *
 * Os cinco primeiros aparecem com planta `desenhada` e sem modulo: a geometria
 * deles esta escrita a mao em `PLANTAS_REPRESA`, e os enigmas deles sao os sete
 * paineis autorais da leva anterior (por isso `null` aqui: quem os declara e
 * `PAINEIS_REPRESA`).
 */
type LinhaAndar = readonly [number, string, readonly string[], string, string | null];

const TABELA: readonly LinhaAndar[] = [
  // ---------------------------------------- CAPITULO 1 — Rotina (1 a 10) --
  [1, 'desenhada', [], 'Casa de Forca', null],
  [2, 'desenhada', [], 'Manutencao', null],
  [3, 'desenhada', [], 'Galeria das Turbinas', null],
  [4, 'desenhada', [], 'Galerias Inferiores', null],
  [5, 'desenhada', [], 'Setor Profundo', null],
  [6, 'espinha_3', ['deposito', 'corredor', 'eletrica'], 'Almoxarifado', 'alavancas'],
  [7, 'galeria_2', ['turbina', 'corredor'], 'Galeria Norte', 'observacao'],
  [8, 'labirinto_a', ['tunel', 'cabos', 'deposito', 'corredor'], 'Tubulacoes', 'labirinto'],
  [9, 'cruz_4', ['controle', 'eletrica', 'deposito', 'corredor'], 'Cruzamento 9', 'circuito'],
  [10, 'salao_2', ['geradores', 'ferramentaria', 'portaria'], 'Casa dos Geradores', 'roteamento'],
  // --------------------------------------- CAPITULO 2 — Pressao (11 a 20) --
  [11, 'espinha_5', ['bombas', 'corredor', 'alagado', 'deposito', 'eletrica'], 'Estacao de Bombas', 'valvulas'],
  [12, 'galeria_4', ['turbina', 'corredor', 'cabos', 'deposito'], 'Galeria 12', 'alavancas'],
  [13, 'anel', ['eletrica', 'corredor', 'arquivo'], 'Anel Eletrico', 'terminal'],
  [14, 'espinha_3', ['ventilacao', 'corredor', 'deposito'], 'Ventilacao 14', 'observacao'],
  [15, 'salao_2', ['geradores', 'controle', 'ferramentaria'], 'Sala de Comando 15', 'roteamento'],
  [16, 'cruz_4', ['alagado', 'bombas', 'corredor', 'tunel'], 'Cota 16', 'valvulas'],
  [17, 'labirinto_b', ['cabos', 'tunel', 'eletrica', 'corredor'], 'Galeria de Cabos', 'labirinto'],
  [18, 'galeria_2', ['turbina', 'ventilacao'], 'Galeria 18', 'circuito'],
  [19, 'espinha_5', ['deposito', 'corredor', 'eletrica', 'alagado', 'ferramentaria'], 'Nivel 19', 'pressao'],
  [20, 'anel', ['servidores', 'corredor', 'arquivo'], 'Central de Dados 20', 'multiandar'],
  // --------------------------------------- CAPITULO 3 — Colapso (21 a 30) --
  [21, 'espinha_3', ['tunel', 'corredor', 'alagado'], 'Descida 21', 'alavancas'],
  [22, 'galeria_4', ['turbina', 'geradores', 'cabos', 'corredor'], 'Galeria 22', 'roteamento'],
  [23, 'cruz_4', ['eletrica', 'servidores', 'deposito', 'ventilacao'], 'Cruzamento 23', 'terminal'],
  [24, 'poco', ['alagado', 'bombas'], 'Poco 24', 'valvulas'],
  [25, 'salao_2', ['geradores', 'controle', 'arquivo'], 'Comando 25', 'temporizado'],
  [26, 'labirinto_c', ['baias', 'corredor', 'arquivo', 'cabos'], 'Corredores 26', 'labirinto'],
  [27, 'espinha_5', ['corredor', 'eletrica', 'deposito', 'alagado', 'tunel'], 'Nivel 27', 'circuito'],
  [28, 'anel', ['turbina', 'ventilacao', 'ferramentaria'], 'Anel 28', 'pressao'],
  [29, 'galeria_2', ['alagado', 'tunel'], 'Galeria Inundada', 'observacao'],
  [30, 'cruz_4', ['servidores', 'controle', 'eletrica', 'arquivo'], 'Central 30', 'multiandar'],
  // ---------------------------------------- CAPITULO 4 — Negacao (31 a 40) --
  [31, 'espinha_3', ['baias', 'corredor', 'servidores'], 'Pavimento 31', 'terminal'],
  [32, 'galeria_4', ['turbina', 'baias', 'cabos', 'corredor'], 'Galeria 32', 'roteamento'],
  [33, 'anel', ['servidores', 'ventilacao', 'baias'], 'Anel 33', 'temporizado'],
  [34, 'labirinto_a', ['cabos', 'baias', 'tunel', 'corredor'], 'Baias 34', 'labirinto'],
  [35, 'salao_2', ['geradores', 'servidores', 'controle'], 'Comando 35', 'circuito'],
  [36, 'espinha_5', ['corredor', 'baias', 'eletrica', 'alagado', 'deposito'], 'Pavimento 36', 'valvulas'],
  [37, 'cruz_4', ['servidores', 'baias', 'corredor', 'arquivo'], 'Cruzamento 37', 'pressao'],
  [38, 'poco', ['alagado', 'bombas'], 'Poco 38', 'alavancas'],
  [39, 'galeria_2', ['turbina', 'cabos'], 'Galeria 39', 'observacao'],
  [40, 'anel', ['servidores', 'corredor', 'arquivo'], 'Arquivo Central', 'multiandar'],
  // -------------------------------- CAPITULO 5 — Reconhecimento (41 a 50) --
  [41, 'espinha_3', ['tunel', 'corredor', 'baias'], 'Descida 41', 'terminal'],
  [42, 'galeria_4', ['turbina', 'geradores', 'servidores', 'cabos'], 'Galeria 42', 'roteamento'],
  [43, 'labirinto_b', ['cabos', 'tunel', 'baias', 'corredor'], 'Malha 43', 'labirinto'],
  [44, 'cruz_4', ['eletrica', 'servidores', 'alagado', 'ventilacao'], 'Cota 44', 'temporizado'],
  [45, 'salao_2', ['geradores', 'controle', 'ferramentaria'], 'Comando 45', 'circuito'],
  [46, 'espinha_5', ['corredor', 'alagado', 'bombas', 'eletrica', 'tunel'], 'Nivel 46', 'valvulas'],
  [47, 'anel', ['turbina', 'cabos', 'baias'], 'Anel 47', 'pressao'],
  [48, 'poco', ['alagado', 'tunel'], 'Poco 48', 'alavancas'],
  [49, 'galeria_4', ['turbina', 'geradores', 'servidores', 'corredor'], 'Galeria 49', 'multiandar'],
  [50, 'salao_2', ['arquivo', 'servidores', 'controle'], 'Sala 50', 'terminal'],
];

export interface DefinicaoAndar {
  andar: number;
  /** chave em MAPAS */
  mapa: string;
  capitulo: CapituloAndar;
  rotulo: string;
  /** rotulo curto pra HUD: "A-17" */
  codigo: string;
  planta: string;
  modulos: readonly string[];
  escuridao: number;
  /** familia do enigma; null nos cinco andares autorais */
  enigma: string | null;
  /** id da ficha medica do andar */
  ficha: string;
  dias: { de: number; ate: number };
  /** tabela de sorteio de salvado */
  loot: string;
  /** quantos inimigos nascem */
  inimigos: number;
  fauna: { tipo: string; peso: number }[];
  /** true = parada do elevador de servico */
  parada: boolean;
  /** true = o andar e predominantemente labirinto */
  labirinto: boolean;
  /** true = nenhum inimigo nasce no andar */
  seguro: boolean;
  /** tile de chegada (vindo de cima); e o `spawnTile` do mapa do andar */
  entrada: { x: number; y: number };
  /**
   * Tile em que a cabine do elevador para. So vale nos andares de parada, e NAO
   * e o mesmo que `entrada`: sair do elevador pelo alcapao de chegada faria a
   * cabine parecer estar em lugar diferente a cada viagem.
   */
  paradaTile: { x: number; y: number };
}

export const ANDARES: readonly DefinicaoAndar[] = TABELA.map(
  ([andar, planta, modulos, rotulo, enigma]) => {
    const p = buscarPlantaDeAndar(planta);
    if (!p) throw new Error(`[andares] andar ${andar} usa planta inexistente "${planta}"`);
    if (!p.desenhada && modulos.length !== p.vaos) {
      throw new Error(
        `[andares] andar ${andar} declarou ${modulos.length} modulo(s) e a planta `
        + `"${planta}" tem ${p.vaos} vao(s)`,
      );
    }
    for (const m of modulos) {
      if (!buscarModulo(m)) throw new Error(`[andares] andar ${andar} usa modulo inexistente "${m}"`);
    }
    const inimigos = inimigosDoAndar(andar);
    return {
      andar,
      mapa: mapaDoAndar(andar),
      capitulo: capituloDoAndar(andar).numero,
      rotulo,
      codigo: `A-${String(andar).padStart(2, '0')}`,
      planta,
      modulos,
      escuridao: escuridaoDoAndar(andar),
      enigma,
      ficha: idDaFicha(andar),
      dias: diasDaFicha(andar),
      loot: tabelaDoAndar(andar),
      inimigos,
      fauna: faunaDoAndar(andar),
      parada: ANDARES_DE_PARADA.includes(andar),
      labirinto: !!p.labirinto,
      seguro: inimigos === 0,
      entrada: p.entrada ? { x: p.entrada[0], y: p.entrada[1] } : { x: 14, y: 18 },
      paradaTile: p.elevador ? { x: p.elevador[0], y: p.elevador[1] } : { x: 14, y: 18 },
    };
  },
);

if (ANDARES.length !== ANDARES_TOTAIS) {
  throw new Error(`[andares] a tabela tem ${ANDARES.length} linha(s), esperava ${ANDARES_TOTAIS}`);
}

const ANDAR_POR_NUMERO = new Map(ANDARES.map((a) => [a.andar, a]));
const ANDAR_POR_MAPA = new Map(ANDARES.map((a) => [a.mapa, a]));

export function buscarAndar(andar: unknown): DefinicaoAndar | null {
  return typeof andar === 'number' ? (ANDAR_POR_NUMERO.get(andar) ?? null) : null;
}

/** O andar de um mapa, ou null quando o mapa nao e da usina. */
export function andarDoMapaDef(mapa: unknown): DefinicaoAndar | null {
  return typeof mapa === 'string' ? (ANDAR_POR_MAPA.get(mapa) ?? null) : null;
}

/** Os cinco andares desenhados a mao — os setores da leva anterior. */
export const ANDARES_DESENHADOS = ANDARES.filter((a) => a.planta === 'desenhada');

/** Os andares COMPOSTOS, que o gerador monta por modulo. */
export const ANDARES_COMPOSTOS = ANDARES.filter((a) => a.planta !== 'desenhada');

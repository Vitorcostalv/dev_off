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
/**
 * O numero do capitulo, 1 a 15. Cada um cobre dez andares.
 *
 * Deixou de ser uniao literal quando passaram de cinco: quinze literais numa
 * uniao so servem pra o compilador cobrar um `as` toda vez que o numero sai de
 * uma conta, e o valor real ja e conferido em `capituloDoAndar`.
 */
export type CapituloAndar = number;

/** O KIT VISUAL do capitulo — qual folha de parede o gerador usa. */
export type KitDeAndar = 'usina' | 'fundo' | 'trabalho' | 'infancia';

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
  /**
   * Folha de parede do capitulo. Os quatro kits existem em arte de verdade:
   * `usina` e `PAredes_internas_represa.png`, `fundo` e as pecas lisas de
   * `PAredes_internas_represa_andar_50_100.png`, `trabalho` sao as pecas
   * ROTULADAS dessa mesma folha (51-60, 61-70, ...) e `infancia` e
   * `Paredes_internas_represa_andar_101_150.png`.
   */
  kit: KitDeAndar;
  /**
   * FRACAO DAS LUMINARIAS COM ENERGIA, 0 a 1 (Parte 21).
   *
   * A infraestrutura eletrica se degrada com a profundidade: no capitulo 1
   * quase toda luminaria acende sozinha, no 15 quase nenhuma. O que sobra sai
   * do painel do andar — e o que faz restaurar energia valer a pena la embaixo.
   */
  luzes: number;
  /**
   * DECAIS do capitulo (Parte 24): desenho de crianca, escrita, aviso a mao,
   * marca de sangue. Sao sobreposicoes, e a raridade e o efeito — capitulo sem
   * entrada aqui nao recebe decal nenhum.
   */
  decais?: readonly { familia: string; quantidade: number }[];
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
    kit: 'usina',
    luzes: 0.9,
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
    kit: 'usina',
    luzes: 0.78,
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
    kit: 'usina',
    luzes: 0.66,
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
    kit: 'usina',
    luzes: 0.56,
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
    kit: 'fundo',
    luzes: 0.46,
  },

  // ======================================================================
  // TRABALHO — andares 51 a 100.
  //
  // A usina continua uma usina: nao ha predio de escritorio aqui, e nao pode
  // haver. O que entra e VOCABULARIO — bancada de manutencao arrumada como
  // estacao de trabalho, monitor velho, rack, cabo em calha, quadro de prazo,
  // ordem de servico repetida, relogio de ponto. Um lugar industrial arrumado
  // com a logica psicologica de um escritorio, sem virar um.
  // ======================================================================
  {
    numero: 6,
    nome: 'Produtividade',
    faixa: [51, 60],
    ambiente:
      'A manutencao aqui embaixo era organizada. Bancada numerada, ordem de servico em '
      + 'pasta, quadro de turno preenchido a mao ate o fim. Tudo funciona e tudo esta um '
      + 'pouco arrumado demais.',
    tema: 'trabalhar mais, dar conta, aceitar tarefa extra, ser elogiado por estar sempre disponivel',
    fauna: { primaria: 'smartfone', secundaria: 'impressora', rara: 'caixa_som' },
    fatorDeTensao: 3.2,
    kit: 'trabalho',
    luzes: 0.42,
  },
  {
    numero: 7,
    nome: 'Prazos',
    faixa: [61, 70],
    ambiente:
      'Mais alarme, mais quadro, mais chamado repetido. A mesma ordem de servico aparece '
      + 'em tres pranchetas com tres datas, e nenhuma das tres esta assinada.',
    tema: 'prazo constante, chamado que nao fecha, sono interrompido, trabalho invadindo o resto',
    fauna: { primaria: 'impressora', secundaria: 'smartfone', rara: 'robo_servico' },
    fatorDeTensao: 3.5,
    kit: 'trabalho',
    luzes: 0.38,
  },
  {
    numero: 8,
    nome: 'Falha',
    faixa: [71, 80],
    ambiente:
      'Equipamento parado no meio do conserto, tampa aberta, peca no chao ao lado. Nenhum '
      + 'reparo aqui foi terminado, e todos foram comecados.',
    tema: 'medo de errar, falha tecnica, culpa, autocritica, achar que todo problema e seu',
    fauna: { primaria: 'robo_servico', secundaria: 'impressora', rara: 'maquina_lavar' },
    fatorDeTensao: 3.8,
    kit: 'trabalho',
    luzes: 0.33,
  },
  {
    numero: 9,
    nome: 'Sempre Ligado',
    faixa: [81, 90],
    ambiente:
      'Tela acesa em corredor sem ninguem. Calha de cabo cruzando comodo que nao tem '
      + 'equipamento. Luz de notificacao piscando em painel desligado da rede.',
    tema: 'nao conseguir desligar, mensagem de madrugada, telefone de trabalho, folga que nao descansa',
    fauna: { primaria: 'caixa_som', secundaria: 'smartfone', rara: 'robo_servico' },
    fatorDeTensao: 4.1,
    kit: 'trabalho',
    luzes: 0.28,
  },
  {
    numero: 10,
    nome: 'Colapso',
    faixa: [91, 100],
    ambiente:
      'O trecho mais pesado do capitulo do trabalho. O piso alaga, o ar fica parado e as '
      + 'bancadas viram entulho. O andar 100 e a ultima sala em que alguem ainda escreveu.',
    tema: 'exaustao grave, perda de concentracao, panico, recomendacao medica de parar',
    fauna: { primaria: 'maquina_lavar', secundaria: 'robo_servico', rara: 'geladeira_gelo' },
    fatorDeTensao: 4.4,
    kit: 'trabalho',
    luzes: 0.22,
  },

  // ======================================================================
  // INFANCIA — andares 101 a 150.
  //
  // A usina AINDA existe: concreto, tubo, painel, comporta. O que muda e que
  // comeca a haver nela coisa que nao tem como estar ali — risco de giz,
  // desenho de casa com sol, marca de altura na parede, letra de caderno. No
  // comeco e raro de proposito: o efeito depende da raridade, e parede coberta
  // de desenho vira cenario de parque tematico.
  // ======================================================================
  {
    numero: 11,
    nome: 'Memoria',
    faixa: [101, 110],
    ambiente:
      'Parede de usina, quase toda normal. De vez em quando um risco baixo, na altura de '
      + 'quem tem sete anos, que ninguem explicou e ninguem apagou.',
    tema: 'lembranca solta, numero escolar, desenho esquecido, coisa fora de lugar',
    fauna: { primaria: 'esfera_choque', secundaria: 'smartfone', rara: 'impressora' },
    fatorDeTensao: 4.6,
    kit: 'infancia',
    luzes: 0.2,
    decais: [{ familia: 'desenho', quantidade: 1 }],
  },
  {
    numero: 12,
    nome: 'Expectativa',
    faixa: [111, 120],
    ambiente:
      'Mais marca de infancia, e todas de registro: altura anotada, nota copiada, estrela '
      + 'de papel colada em concreto. Alguem media alguma coisa aqui o tempo todo.',
    tema: 'querer aprovacao, medo de decepcionar, nota, elogio por ser inteligente',
    fauna: { primaria: 'impressora', secundaria: 'esfera_choque', rara: 'caixa_som' },
    fatorDeTensao: 4.8,
    kit: 'infancia',
    luzes: 0.17,
    decais: [{ familia: 'desenho', quantidade: 2 }, { familia: 'escrita', quantidade: 1 }],
  },
  {
    numero: 13,
    nome: 'Perfeicao',
    faixa: [121, 130],
    ambiente:
      'A composicao dos comodos fica desconfortavel: sala repetida com uma diferenca so, '
      + 'corredor que corrige a si mesmo, desenho refeito por cima do anterior.',
    tema: 'erro tratado como fracasso, ter de fazer certo, comparacao, desempenho virando identidade',
    fauna: { primaria: 'caixa_som', secundaria: 'impressora', rara: 'robo_servico' },
    fatorDeTensao: 5,
    kit: 'infancia',
    luzes: 0.14,
    decais: [{ familia: 'desenho', quantidade: 2 }, { familia: 'escrita', quantidade: 2 }],
  },
  {
    numero: 14,
    nome: 'Medo',
    faixa: [131, 140],
    ambiente:
      'Parede arrebentada, desenho com o rosto riscado, frase repetida ate o fim da linha. '
      + 'Sangue aparece aqui, e aparece pouco — em comodo escolhido, nunca espalhado.',
    tema: 'esconder erro, medo de ser visto falhando, frase repetida, o que nao se conta em casa',
    fauna: { primaria: 'robo_servico', secundaria: 'maquina_lavar', rara: 'geladeira_gelo' },
    fatorDeTensao: 5.2,
    kit: 'infancia',
    luzes: 0.11,
    decais: [
      { familia: 'desenho', quantidade: 2 },
      { familia: 'escrita', quantidade: 2 },
      { familia: 'aviso', quantidade: 1 },
      { familia: 'sangue', quantidade: 1 },
    ],
  },
  {
    numero: 15,
    nome: 'Origem',
    faixa: [141, 150],
    ambiente:
      'O trecho mais fundo que existe nesta fase. A usina e a infancia dividem o mesmo '
      + 'concreto sem que nenhuma das duas ceda, e o andar 150 termina com uma porta que '
      + 'nao abre.',
    tema: 'o padrao de antes do emprego, o que ja estava ali, e a pergunta que fica',
    fauna: { primaria: 'maquina_lavar', secundaria: 'geladeira_gelo', rara: 'esfera_choque' },
    fatorDeTensao: 5.4,
    kit: 'infancia',
    luzes: 0.08,
    decais: [
      { familia: 'desenho', quantidade: 3 },
      { familia: 'escrita', quantidade: 2 },
      { familia: 'aviso', quantidade: 2 },
      { familia: 'sangue', quantidade: 2 },
    ],
  },
];

export function capituloDoAndar(andar: number): DefinicaoCapitulo {
  const c = CAPITULOS.find((cap) => andar >= cap.faixa[0] && andar <= cap.faixa[1]);
  if (!c) throw new Error(`[andares] andar ${andar} esta fora dos cinco capitulos`);
  return c;
}

// ------------------------------------------------------------- escuridao --
/** Andares totais. Cento e cinquenta nesta fase; do 151 pra baixo fica pra depois. */
export const ANDARES_TOTAIS = 150;

/** Ultimo andar dos cinco setores autorais — a fronteira que nao se mexe. */
export const ULTIMO_ANDAR_DESENHADO = 5;

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
const ESCURIDAO_DO_ANDAR_50 = 0.86;
/**
 * O TETO.
 *
 * Foi 0,93 primeiro, que e o topo da faixa que o plano sugeria pro trecho 141 a
 * 150. No navegador, no andar 150, isso apaga o proprio personagem: com a
 * lanterna acesa dava pra ver a caixa de salvado e a silhueta do bicho, e nao
 * dava pra saber onde o jogador estava dentro do proprio facho. 0,91 mantem o
 * fundo mais escuro que qualquer andar acima e devolve o contorno de quem se
 * esta controlando, que e o minimo pra o andar ser dificil em vez de ilegivel.
 */
const ESCURIDAO_MAXIMA = 0.91;

export function escuridaoDoAndar(andar: number): number {
  if (andar <= 1) return 0;
  if (andar <= 50) {
    return +Math.min(ESCURIDAO_DO_ANDAR_50, 0.12 + (andar - 2) * 0.0155).toFixed(4);
  }
  // Do 51 ao 150 a curva CONTINUA de onde o andar 50 parou, e nao recomeca.
  //
  // O plano sugeria 0,60 a 0,68 pro capitulo 6, e esses valores sao mais CLAROS
  // que o andar 50 (0,86): adotados ao pe da letra, a usina clarearia ao ficar
  // mais funda, que e o contrario do que o proprio plano pede. O que se manteve
  // foi a intencao — escurecer ate cerca de 0,93 no fim — num degrau por andar
  // pequeno o bastante pra ninguem ver o corte entre capitulos.
  const passo = (ESCURIDAO_MAXIMA - ESCURIDAO_DO_ANDAR_50) / (ANDARES_TOTAIS - 50);
  return +Math.min(ESCURIDAO_MAXIMA, ESCURIDAO_DO_ANDAR_50 + (andar - 50) * passo).toFixed(4);
}

/**
 * O ANDAR TEM MAQUINA DORMENTE? (Parte 22)
 *
 * Em alguns andares parte dos inimigos esta no MESMO circuito das luminarias.
 * Enquanto o painel nao e resolvido eles ficam parados e inofensivos, de pe no
 * escuro; resolver o painel acende o andar E os acorda.
 *
 * E a troca que a Parte 22 pede: o corredor escuro fica navegavel, e o preco e
 * que o que estava desligado passa a andar. O jogador escolhe.
 *
 * NAO E EM TODO ANDAR, e a regra e essa: de seis em seis. Um andar em cada seis
 * mantem a escolha rara o bastante pra ela continuar sendo uma decisao — em
 * todo andar viraria imposto, e o jogador pararia de resolver painel.
 */
export function temMaquinaDormente(andar: number): boolean {
  return andar > 5 && andar % 6 === 0;
}

/**
 * FRACAO DAS LUMINARIAS DO ANDAR QUE TEM ENERGIA (Parte 21).
 *
 * Sai do capitulo, com um degrau dentro dele: o ultimo andar de um capitulo e
 * sempre mais apagado que o primeiro, entao a queda de energia se sente na
 * descida e nao so na troca de capitulo.
 */
export function luzesAcesasDoAndar(andar: number): number {
  const cap = capituloDoAndar(andar);
  const posicao = (andar - cap.faixa[0]) / 9; // 0 a 1 dentro do capitulo
  return +Math.max(0.05, cap.luzes * (1 - 0.25 * posicao)).toFixed(3);
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
  if (andar <= 50) return Math.min(7, 1 + Math.floor((andar - 3) / 7));
  // Abaixo do 50 a conta muda de eixo: a quantidade fica onde estava (oito
  // maquinas pesadas num corredor escuro nao e dificuldade, e parede) e o que
  // cresce e a MISTURA, em `faunaDoAndar`. O teto sobe de 7 pra 9 so no
  // capitulo da infancia, onde a diversidade e o ponto.
  return andar <= 100 ? 7 : Math.min(9, 7 + Math.floor((andar - 101) / 25));
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
  // A MISTURA entra mais cedo quanto mais fundo (Parte 27): ate o 50 a
  // secundaria so aparece na metade do capitulo e a rara no fim dele; do 51 ao
  // 100 as duas entram um pouco antes; do 101 em diante entram desde o comeco,
  // e e por isso que o capitulo da infancia le como bagunca de especie.
  const entraSecundaria = andar <= 50 ? 4 : andar <= 100 ? 2 : 0;
  const entraRara = andar <= 50 ? 7 : andar <= 100 ? 5 : 2;
  const tabela: { tipo: string; peso: number }[] = [{ tipo: cap.fauna.primaria, peso: 10 }];
  if (cap.fauna.secundaria && posicao >= entraSecundaria) {
    tabela.push({ tipo: cap.fauna.secundaria, peso: posicao >= entraRara ? 6 : 3 });
  }
  if (cap.fauna.rara && posicao >= entraRara) tabela.push({ tipo: cap.fauna.rara, peso: 2 });
  return tabela;
}

// ----------------------------------------------------------------- loot --
/**
 * Tabela de salvado do andar. Sao as cinco tabelas por nivel que ja existiam
 * (`nivel_0` a `nivel_4`), agora distribuidas ao longo dos cinquenta andares:
 * dez andares por tabela.
 */
export function tabelaDoAndar(andar: number): string {
  return `nivel_${Math.min(14, Math.floor((andar - 1) / 10))}`;
}

// ------------------------------------------------------------ checkpoint --
/**
 * ANDARES DE PARADA DO ELEVADOR DE SERVICO.
 *
 * Cinquenta andares sem atalho seria releitura obrigatoria de tudo a cada
 * descida. Cada parada precisa ser ATIVADA no proprio andar antes de valer (ver
 * `flagDeCheckpoint`), entao nao ha como pular pra andar nao visitado.
 */
export const ANDARES_DE_PARADA: readonly number[] = [
  1,
  // de cinco em cinco, do 5 ao 150 — as onze paradas antigas continuam onde
  // estavam, e as flags delas continuam com o mesmo nome
  ...Array.from({ length: ANDARES_TOTAIS / 5 }, (_, i) => (i + 1) * 5),
];

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
/**
 * AS TRES SECOES DO ARQUIVO (Parte 9).
 *
 * O prontuario e o que ja existia e nao se toca: cinquenta fichas medicas
 * cobrindo duzentos dias. As duas secoes novas nao sao prontuario e nao se
 * fingem de prontuario — sao papel de trabalho e papel de escola, com formato
 * proprio. Sao artefatos de FICCAO: nao ha ali orientacao medica, dose,
 * diagnostico aproveitavel nem conduta que alguem deva seguir.
 */
export type SecaoDeArquivo = 'prontuario' | 'trabalho' | 'infancia';

export interface DefinicaoSecao {
  id: SecaoDeArquivo;
  /** rotulo na tela de Arquivos */
  nome: string;
  faixa: readonly [number, number];
  /** prefixo do id de documento */
  prefixo: string;
  /** uma linha explicando a secao, no cabecalho da aba */
  resumo: string;
}

export const SECOES_DE_ARQUIVO: readonly DefinicaoSecao[] = [
  {
    id: 'prontuario',
    nome: 'Prontuario',
    faixa: [1, 50],
    prefixo: 'ficha',
    resumo: 'Duzentos dias de acompanhamento, quatro por ficha.',
  },
  {
    id: 'trabalho',
    nome: 'Trabalho',
    faixa: [51, 100],
    prefixo: 'work_record',
    resumo: 'Papel de emprego: saude ocupacional, chamado, avaliacao, recado.',
  },
  {
    id: 'infancia',
    nome: 'Infancia',
    faixa: [101, 150],
    prefixo: 'childhood_record',
    resumo: 'Papel de escola e de casa, de muito antes do primeiro emprego.',
  },
];

export function secaoDoAndar(andar: number): DefinicaoSecao {
  const s = SECOES_DE_ARQUIVO.find((sec) => andar >= sec.faixa[0] && andar <= sec.faixa[1]);
  if (!s) throw new Error(`[andares] andar ${andar} esta fora das secoes de arquivo`);
  return s;
}

/**
 * Id do documento do andar.
 *
 * Os cinquenta primeiros mantem `ficha_001`..`ficha_050`, letra por letra: eles
 * ja estao gravados em save de quem desceu, e renomear apagaria o arquivo de
 * quem jogou. Os novos usam o prefixo da propria secao.
 */
export const idDaFicha = (andar: number): string =>
  `${secaoDoAndar(andar).prefixo}_${String(andar).padStart(3, '0')}`;

/**
 * Os quatro dias que a ficha cobre — SO no prontuario.
 *
 * A cronologia de duzentos dias fecha no andar 50 e nao continua: os documentos
 * de trabalho sao anteriores a ela e os de infancia sao anteriores a tudo.
 * Estender a conta pra baixo criaria um dia 201 que nao existe em lugar nenhum.
 */
export function diasDaFicha(andar: number): { de: number; ate: number } | null {
  if (andar > 50) return null;
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
  // dois OU tres digitos: `represa_f06` continua sendo o andar 6 e
  // `represa_f100` passa a ser o 100. O gerador ja escrevia tres digitos
  // sozinho (padStart nao corta), entao so a LEITURA precisava alargar.
  const m = /^represa_f(\d{2,3})$/.exec(mapa);
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

  // ============================== ANDARES 51 A 150 ==============================
  // A geometria delas mora em tools/andares-fundos.mjs, no mesmo formato das de
  // cima. As oito do TRABALHO sao plantas de ocupacao (baia, corredor comprido,
  // pente de bancada, atrio); as oito da INFANCIA sao plantas de repeticao e
  // simetria (sala igual ao lado de sala igual, anel que nao fecha, espiral,
  // espelho) — incomodam por serem regulares demais.
  {
    id: 'baias_6', nome: 'Seis baias com eixo de servico', vaos: 6,
    entrada: [17, 3], descida: [17, 19], elevador: [17, 11],
  },
  {
    id: 'corredor_longo', nome: 'Corredor comprido com quatro salas', vaos: 4,
    entrada: [3, 14], descida: [34, 14], elevador: [18, 14],
  },
  {
    id: 'duplo_anel', nome: 'Dois aneis concentricos', vaos: 4,
    entrada: [3, 3], descida: [16, 12], elevador: [16, 20],
  },
  {
    id: 'escalonado', nome: 'Quatro faixas com portas em degrau', vaos: 4,
    entrada: [26, 3], descida: [26, 20], elevador: [26, 12],
  },
  {
    id: 'atrio', nome: 'Atrio central com quatro anexos', vaos: 4,
    entrada: [3, 4], descida: [26, 19], elevador: [14, 11],
  },
  {
    id: 'espinha_7', nome: 'Corredor central com sete salas', vaos: 7,
    entrada: [3, 14], descida: [36, 14], elevador: [19, 14],
  },
  {
    id: 'pente', nome: 'Galeria com cinco dentes', vaos: 5,
    entrada: [3, 3], descida: [29, 18], elevador: [16, 3],
  },
  {
    id: 'labirinto_d', nome: 'Labirinto das baias numeradas', vaos: 4, labirinto: true,
    entrada: [2, 2], descida: [31, 19], elevador: [16, 2],
    marcos: [
      { id: 'porta_numerada', tx: 12, ty: 4 },
      { id: 'cabo_anilha', tx: 20, ty: 17 },
      { id: 'painel_cego', tx: 28, ty: 4 },
    ],
  },
  {
    id: 'cruz_6', nome: 'Cruzamento com seis salas iguais', vaos: 6,
    entrada: [16, 3], descida: [16, 20], elevador: [16, 12],
  },
  {
    id: 'galeria_6', nome: 'Tres galerias com anexos', vaos: 6,
    entrada: [3, 4], descida: [30, 20], elevador: [11, 13],
  },
  {
    id: 'poco_duplo', nome: 'Poco de tres estagios', vaos: 3,
    entrada: [10, 4], descida: [10, 21], elevador: [10, 13],
  },
  {
    id: 'anel_partido', nome: 'Anel que nao fecha', vaos: 3,
    entrada: [3, 3], descida: [26, 18], elevador: [14, 10],
  },
  {
    id: 'corredor_duplo', nome: 'Dois corredores paralelos', vaos: 3,
    entrada: [3, 3], descida: [28, 19], elevador: [16, 3],
  },
  {
    id: 'sala_espelho', nome: 'Quatro salas em espelho', vaos: 4,
    entrada: [3, 3], descida: [22, 17], elevador: [14, 11],
  },
  {
    id: 'labirinto_e', nome: 'Espiral', vaos: 3, labirinto: true,
    entrada: [2, 2], descida: [13, 12], elevador: [24, 21],
    marcos: [
      { id: 'tubo_azul', tx: 13, ty: 3 },
      { id: 'tubo_vermelho', tx: 4, ty: 10 },
      { id: 'baia_numerada', tx: 20, ty: 13 },
    ],
  },
  {
    id: 'labirinto_f', nome: 'Malha regular', vaos: 4, labirinto: true,
    entrada: [2, 2], descida: [28, 21], elevador: [16, 12],
    marcos: [
      { id: 'porta_numerada', tx: 10, ty: 9 },
      { id: 'painel_cego', tx: 26, ty: 15 },
      { id: 'baia_numerada', tx: 14, ty: 19 },
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

  // ====================== TRABALHO (andares 51 a 100) ======================
  // Os seis primeiros sao o vocabulario da Parte 3: bancada numerada, rack,
  // terminal, ordem de servico, relogio de ponto, fila de impressao. Todos
  // reusam um `comodo` que ja existe, porque `comodo` e o que escolhe a MOBILIA
  // — inventar um comodo novo pediria uma tabela de movel nova pra cada um, e o
  // que muda de verdade aqui e parede, piso, escuridao e nome.
  {
    id: 'estacoes', nome: 'Estacoes de manutencao', comodo: 'arquivo',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_vidro', escuridaoExtra: 0.01,
    aceitaFicha: true, luzes: 2,
  },
  {
    id: 'racks', nome: 'Corredor de racks', comodo: 'eletrica',
    piso: 'granilite', parede: 'represa_tecnico', paredeFunda: 'fundo_painel', escuridaoExtra: 0.03,
    aceitaPainel: true, luzes: 2,
  },
  {
    id: 'terminais', nome: 'Sala de terminais', comodo: 'eletrica',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_painel', escuridaoExtra: -0.02,
    aceitaPainel: true, aceitaFicha: true, luzes: 2,
  },
  {
    id: 'expedicao', nome: 'Expedicao de ordens', comodo: 'deposito',
    piso: 'concreto_escuro', parede: 'represa_faixa', paredeFunda: 'fundo_concreto', escuridaoExtra: 0.02,
    aceitaFicha: true, luzes: 1,
  },
  {
    id: 'ponto', nome: 'Sala do ponto', comodo: 'controle',
    piso: 'granilite', parede: 'represa_faixa', paredeFunda: 'fundo_vidro', escuridaoExtra: -0.06,
    aceitaFicha: true, seguro: true, luzes: 2,
  },
  {
    id: 'impressao', nome: 'Sala de impressao', comodo: 'arquivo',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_vidro', escuridaoExtra: 0.03,
    aceitaPainel: true, luzes: 1,
  },
  {
    // Sala dos monitores apagados: um dos encontros especiais da Parte 28. Nao
    // e zona segura — o que ela tem de diferente e a densidade de tela morta.
    id: 'monitores', nome: 'Sala dos monitores', comodo: 'eletrica',
    piso: 'granilite', parede: 'represa_escuro', paredeFunda: 'fundo_vidro', escuridaoExtra: 0.05,
    luzes: 1,
  },

  // ====================== INFANCIA (andares 101 a 150) =====================
  {
    // Sala em que toda maquina esta desligada e nenhum bicho nasce (Parte 28).
    // O silencio dela e o efeito: o jogador para de andar sozinho.
    id: 'sala_vazia', nome: 'Sala vazia', comodo: 'controle',
    piso: 'granilite', parede: 'represa_limpo', paredeFunda: 'fundo_concreto', escuridaoExtra: -0.04,
    aceitaFicha: true, seguro: true, luzes: 1,
  },
  {
    // Paredao: comodo com pouca coisa no chao e muita parede a vista. E onde os
    // decais de desenho cabem sem competir com movel.
    id: 'paredao', nome: 'Paredao', comodo: 'corredor_manutencao',
    piso: 'concreto_escuro', parede: 'represa_escuro', paredeFunda: 'fundo_concreto', escuridaoExtra: 0.06,
    luzes: 1,
  },
  {
    id: 'refeitorio', nome: 'Refeitorio de turno', comodo: 'deposito',
    piso: 'marmore', parede: 'represa_faixa', paredeFunda: 'fundo_vidro', escuridaoExtra: 0.02,
    aceitaFicha: true, luzes: 2,
  },
  {
    id: 'poco_seco', nome: 'Poco seco', comodo: 'poco',
    piso: 'concreto_escuro', parede: 'represa_gasto', paredeFunda: 'fundo_tubos', escuridaoExtra: 0.09,
    aceitaPainel: true, luzes: 1,
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

  // --------------------------------- CAPITULO 6 — Produtividade (51 a 60) --
  [51, 'baias_6', ['eletrica', 'controle', 'expedicao', 'arquivo', 'ferramentaria', 'corredor'], 'Manutencao 51', 'roteamento'],
  [52, 'corredor_longo', ['cabos', 'racks', 'baias', 'corredor'], 'Bancadas 52', 'valvulas'],
  [53, 'atrio', ['monitores', 'ponto', 'eletrica', 'corredor'], 'Sala de Turno', 'terminal'],
  [54, 'escalonado', ['terminais', 'servidores', 'cabos', 'corredor'], 'Expedicao 54', 'pressao'],
  [55, 'espinha_7', ['impressao', 'corredor', 'monitores', 'ponto', 'eletrica', 'controle', 'expedicao'], 'Pavimento 55', 'circuito'],
  [56, 'pente', ['arquivo', 'ferramentaria', 'terminais', 'servidores', 'corredor'], 'Almoxarifado 56', 'roteamento'],
  [57, 'labirinto_d', ['deposito', 'estacoes', 'impressao', 'corredor'], 'Corredores 57', 'labirinto'],
  [58, 'corredor_longo', ['controle', 'expedicao', 'arquivo', 'corredor'], 'Sala de Ordens', 'valvulas'],
  [59, 'baias_6', ['racks', 'baias', 'deposito', 'estacoes', 'impressao', 'corredor'], 'Pavimento 59', 'pressao'],
  [60, 'atrio', ['ponto', 'eletrica', 'controle', 'corredor'], 'Chefia de Turno', 'alavancas'],
  // -------------------------------------- CAPITULO 7 — Prazos (61 a 70) --
  [61, 'baias_6', ['servidores', 'cabos', 'racks', 'baias', 'deposito', 'corredor'], 'Quadro de Prazos', 'roteamento'],
  [62, 'corredor_longo', ['corredor', 'monitores', 'ponto', 'eletrica'], 'Pavimento 62', 'valvulas'],
  [63, 'atrio', ['ferramentaria', 'terminais', 'servidores', 'corredor'], 'Sala de Chamados', 'terminal'],
  [64, 'escalonado', ['estacoes', 'impressao', 'corredor', 'monitores'], 'Galeria 64', 'pressao'],
  [65, 'espinha_7', ['expedicao', 'arquivo', 'ferramentaria', 'terminais', 'servidores', 'cabos', 'corredor'], 'Cota 65', 'circuito'],
  [66, 'pente', ['baias', 'deposito', 'estacoes', 'impressao', 'corredor'], 'Corredores 66', 'roteamento'],
  [67, 'duplo_anel', ['eletrica', 'controle', 'expedicao', 'corredor'], 'Pavimento 67', 'terminal'],
  [68, 'labirinto_d', ['cabos', 'racks', 'baias', 'corredor'], 'Baias 68', 'labirinto'],
  [69, 'baias_6', ['monitores', 'ponto', 'eletrica', 'controle', 'expedicao', 'corredor'], 'Sala 69', 'pressao'],
  [70, 'atrio', ['terminais', 'servidores', 'cabos', 'corredor'], 'Central de Prazos', 'alavancas'],
  // -------------------------------------- CAPITULO 8 — Falha (71 a 80) --
  [71, 'baias_6', ['impressao', 'corredor', 'monitores', 'ponto', 'eletrica', 'controle'], 'Oficina Parada', 'roteamento'],
  [72, 'corredor_longo', ['arquivo', 'ferramentaria', 'terminais', 'corredor'], 'Pavimento 72', 'valvulas'],
  [73, 'atrio', ['deposito', 'estacoes', 'impressao', 'corredor'], 'Bancada 73', 'terminal'],
  [74, 'escalonado', ['controle', 'expedicao', 'arquivo', 'corredor'], 'Galeria 74', 'pressao'],
  [75, 'espinha_7', ['racks', 'baias', 'deposito', 'estacoes', 'impressao', 'corredor', 'monitores'], 'Sala de Falhas', 'circuito'],
  [76, 'pente', ['ponto', 'eletrica', 'controle', 'expedicao', 'corredor'], 'Corredores 76', 'valvulas'],
  [77, 'duplo_anel', ['servidores', 'cabos', 'racks', 'corredor'], 'Pavimento 77', 'temporizado'],
  [78, 'corredor_longo', ['corredor', 'monitores', 'ponto', 'eletrica'], 'Deposito 78', 'terminal'],
  [79, 'labirinto_d', ['ferramentaria', 'terminais', 'servidores', 'corredor'], 'Baias 79', 'labirinto'],
  [80, 'atrio', ['estacoes', 'impressao', 'corredor', 'monitores'], 'Sala de Registro', 'multiandar'],
  // -------------------------------------- CAPITULO 9 — Sempre Ligado (81 a 90) --
  [81, 'baias_6', ['expedicao', 'arquivo', 'ferramentaria', 'terminais', 'servidores', 'corredor'], 'Monitores 81', 'terminal'],
  [82, 'corredor_longo', ['baias', 'deposito', 'estacoes', 'corredor'], 'Pavimento 82', 'temporizado'],
  [83, 'atrio', ['eletrica', 'controle', 'expedicao', 'corredor'], 'Galeria de Cabos 83', 'roteamento'],
  [84, 'escalonado', ['cabos', 'racks', 'baias', 'corredor'], 'Sala 84', 'multiandar'],
  [85, 'espinha_7', ['monitores', 'ponto', 'eletrica', 'controle', 'expedicao', 'arquivo', 'corredor'], 'Central 85', 'pressao'],
  [86, 'pente', ['terminais', 'servidores', 'cabos', 'racks', 'corredor'], 'Corredores 86', 'valvulas'],
  [87, 'duplo_anel', ['impressao', 'corredor', 'monitores', 'ponto'], 'Pavimento 87', 'temporizado'],
  [88, 'corredor_longo', ['arquivo', 'ferramentaria', 'terminais', 'corredor'], 'Racks 88', 'terminal'],
  [89, 'baias_6', ['deposito', 'estacoes', 'impressao', 'corredor', 'monitores', 'ponto'], 'Sala 89', 'circuito'],
  [90, 'atrio', ['controle', 'expedicao', 'arquivo', 'corredor'], 'Sala de Plantao', 'multiandar'],
  // -------------------------------------- CAPITULO 10 — Colapso (91 a 100) --
  [91, 'labirinto_d', ['racks', 'baias', 'deposito', 'corredor'], 'Pavimento 91', 'labirinto'],
  [92, 'corredor_longo', ['ponto', 'eletrica', 'controle', 'corredor'], 'Alagado 92', 'temporizado'],
  [93, 'atrio', ['servidores', 'cabos', 'racks', 'corredor'], 'Galeria 93', 'roteamento'],
  [94, 'escalonado', ['corredor', 'monitores', 'ponto', 'eletrica'], 'Corredores 94', 'multiandar'],
  [95, 'espinha_7', ['ferramentaria', 'terminais', 'servidores', 'cabos', 'racks', 'baias', 'corredor'], 'Cota 95', 'pressao'],
  [96, 'pente', ['estacoes', 'impressao', 'corredor', 'monitores', 'ponto'], 'Sala 96', 'valvulas'],
  [97, 'duplo_anel', ['expedicao', 'arquivo', 'ferramentaria', 'corredor'], 'Pavimento 97', 'temporizado'],
  [98, 'corredor_longo', ['baias', 'deposito', 'estacoes', 'corredor'], 'Baias 98', 'terminal'],
  [99, 'baias_6', ['eletrica', 'controle', 'expedicao', 'arquivo', 'ferramentaria', 'corredor'], 'Deposito 99', 'circuito'],
  [100, 'atrio', ['cabos', 'racks', 'baias', 'corredor'], 'Sala 100', 'multiandar'],
  // -------------------------------------- CAPITULO 11 — Memoria (101 a 110) --
  [101, 'cruz_6', ['poco_seco', 'baias', 'ventilacao', 'cabos', 'arquivo', 'corredor'], 'Nivel 101', 'observacao'],
  [102, 'galeria_6', ['refeitorio', 'tunel', 'estacoes', 'paredao', 'deposito', 'corredor'], 'Corredor 102', 'terminal'],
  [103, 'poco_duplo', ['corredor', 'eletrica', 'poco_seco'], 'Sala 103', 'multiandar'],
  [104, 'labirinto_e', ['alagado', 'monitores', 'refeitorio'], 'Espiral 104', 'labirinto'],
  [105, 'corredor_duplo', ['controle', 'sala_vazia', 'corredor'], 'Cota 105', 'roteamento'],
  [106, 'sala_espelho', ['cabos', 'arquivo', 'alagado', 'corredor'], 'Galeria 106', 'observacao'],
  [107, 'galeria_6', ['paredao', 'deposito', 'controle', 'sala_vazia', 'corredor', 'eletrica'], 'Sala 107', 'terminal'],
  [108, 'cruz_6', ['baias', 'ventilacao', 'cabos', 'arquivo', 'alagado', 'corredor'], 'Pavimento 108', 'multiandar'],
  [109, 'poco_duplo', ['tunel', 'estacoes', 'paredao'], 'Corredor 109', 'valvulas'],
  [110, 'sala_espelho', ['eletrica', 'poco_seco', 'baias', 'corredor'], 'Sala 110', 'observacao'],
  // -------------------------------------- CAPITULO 12 — Expectativa (111 a 120) --
  [111, 'labirinto_f', ['monitores', 'refeitorio', 'tunel', 'corredor'], 'Malha 111', 'labirinto'],
  [112, 'galeria_6', ['sala_vazia', 'corredor', 'eletrica', 'poco_seco', 'baias', 'ventilacao'], 'Sala 112', 'terminal'],
  [113, 'poco_duplo', ['arquivo', 'alagado', 'monitores'], 'Galeria 113', 'multiandar'],
  [114, 'anel_partido', ['deposito', 'controle', 'sala_vazia'], 'Cota 114', 'observacao'],
  [115, 'corredor_duplo', ['ventilacao', 'cabos', 'arquivo'], 'Pavimento 115', 'roteamento'],
  [116, 'sala_espelho', ['estacoes', 'paredao', 'deposito', 'corredor'], 'Corredor 116', 'observacao'],
  [117, 'galeria_6', ['poco_seco', 'baias', 'ventilacao', 'cabos', 'arquivo', 'corredor'], 'Sala 117', 'terminal'],
  [118, 'labirinto_e', ['refeitorio', 'tunel', 'estacoes'], 'Espiral 118', 'labirinto'],
  [119, 'poco_duplo', ['corredor', 'eletrica', 'poco_seco'], 'Galeria 119', 'valvulas'],
  [120, 'sala_espelho', ['alagado', 'monitores', 'refeitorio', 'corredor'], 'Sala 120', 'observacao'],
  // -------------------------------------- CAPITULO 13 — Perfeicao (121 a 130) --
  [121, 'cruz_6', ['controle', 'sala_vazia', 'corredor', 'eletrica', 'poco_seco', 'baias'], 'Sala 121', 'observacao'],
  [122, 'galeria_6', ['cabos', 'arquivo', 'alagado', 'monitores', 'refeitorio', 'corredor'], 'Espelho 122', 'terminal'],
  [123, 'poco_duplo', ['paredao', 'deposito', 'controle'], 'Galeria 123', 'multiandar'],
  [124, 'anel_partido', ['baias', 'ventilacao', 'cabos'], 'Corredor 124', 'observacao'],
  [125, 'corredor_duplo', ['tunel', 'estacoes', 'paredao'], 'Cota 125', 'roteamento'],
  [126, 'labirinto_f', ['eletrica', 'poco_seco', 'baias', 'corredor'], 'Malha 126', 'labirinto'],
  [127, 'galeria_6', ['monitores', 'refeitorio', 'tunel', 'estacoes', 'paredao', 'corredor'], 'Sala 127', 'multiandar'],
  [128, 'cruz_6', ['sala_vazia', 'corredor', 'eletrica', 'poco_seco', 'baias', 'ventilacao'], 'Pavimento 128', 'terminal'],
  [129, 'poco_duplo', ['arquivo', 'alagado', 'monitores'], 'Galeria 129', 'temporizado'],
  [130, 'sala_espelho', ['deposito', 'controle', 'sala_vazia', 'corredor'], 'Sala 130', 'multiandar'],
  // -------------------------------------- CAPITULO 14 — Medo (131 a 140) --
  [131, 'cruz_6', ['ventilacao', 'cabos', 'arquivo', 'alagado', 'monitores', 'corredor'], 'Corredor 131', 'multiandar'],
  [132, 'galeria_6', ['estacoes', 'paredao', 'deposito', 'controle', 'sala_vazia', 'corredor'], 'Sala 132', 'temporizado'],
  [133, 'labirinto_e', ['poco_seco', 'baias', 'ventilacao'], 'Espiral 133', 'labirinto'],
  [134, 'anel_partido', ['refeitorio', 'tunel', 'estacoes'], 'Cota 134', 'multiandar'],
  [135, 'corredor_duplo', ['corredor', 'eletrica', 'poco_seco'], 'Pavimento 135', 'circuito'],
  [136, 'sala_espelho', ['alagado', 'monitores', 'refeitorio', 'corredor'], 'Galeria 136', 'temporizado'],
  [137, 'galeria_6', ['controle', 'sala_vazia', 'corredor', 'eletrica', 'poco_seco', 'baias'], 'Sala 137', 'multiandar'],
  [138, 'cruz_6', ['cabos', 'arquivo', 'alagado', 'monitores', 'refeitorio', 'corredor'], 'Corredor 138', 'terminal'],
  [139, 'poco_duplo', ['paredao', 'deposito', 'controle'], 'Espelho 139', 'temporizado'],
  [140, 'sala_espelho', ['baias', 'ventilacao', 'cabos', 'corredor'], 'Sala 140', 'multiandar'],
  // -------------------------------------- CAPITULO 15 — Origem (141 a 150) --
  [141, 'cruz_6', ['tunel', 'estacoes', 'paredao', 'deposito', 'controle', 'corredor'], 'Nivel 141', 'multiandar'],
  [142, 'galeria_6', ['eletrica', 'poco_seco', 'baias', 'ventilacao', 'cabos', 'corredor'], 'Galeria 142', 'temporizado'],
  [143, 'poco_duplo', ['monitores', 'refeitorio', 'tunel'], 'Sala 143', 'roteamento'],
  [144, 'anel_partido', ['sala_vazia', 'corredor', 'eletrica'], 'Cota 144', 'multiandar'],
  [145, 'corredor_duplo', ['arquivo', 'alagado', 'monitores'], 'Pavimento 145', 'circuito'],
  [146, 'sala_espelho', ['deposito', 'controle', 'sala_vazia', 'corredor'], 'Corredor 146', 'temporizado'],
  [147, 'labirinto_f', ['ventilacao', 'cabos', 'arquivo', 'corredor'], 'Malha 147', 'labirinto'],
  [148, 'cruz_6', ['estacoes', 'paredao', 'deposito', 'controle', 'sala_vazia', 'corredor'], 'Sala 148', 'terminal'],
  [149, 'poco_duplo', ['poco_seco', 'baias', 'ventilacao'], 'Galeria 149', 'temporizado'],
  [150, 'sala_espelho', ['refeitorio', 'tunel', 'estacoes', 'corredor'], 'Sala 150', 'multiandar'],
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
  /** fracao das luminarias do andar que tem energia sem o painel resolvido */
  luzesAcesas: number;
  /** kit visual (folha de parede) do capitulo */
  kit: KitDeAndar;
  /** familia do enigma; null nos cinco andares autorais */
  enigma: string | null;
  /** secao do arquivo a que o documento do andar pertence */
  secao: SecaoDeArquivo;
  /** id do documento do andar */
  ficha: string;
  /** dias cobertos — so no prontuario (andares 1 a 50) */
  dias: { de: number; ate: number } | null;
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
      codigo: `A-${String(andar).padStart(andar > 99 ? 3 : 2, '0')}`,
      planta,
      modulos,
      escuridao: escuridaoDoAndar(andar),
      luzesAcesas: luzesAcesasDoAndar(andar),
      kit: capituloDoAndar(andar).kit,
      enigma,
      secao: secaoDoAndar(andar).id,
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

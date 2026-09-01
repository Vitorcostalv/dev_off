/**
 * A REPRESA — progressao, escuridao, tensao e quebra-cabecas.
 *
 * O que mora aqui e a regra da area; o que mora no tilemap e a geometria e as
 * POSICOES (ver `PLANTAS_REPRESA` em tools/gerar-assets.mjs). A separacao e a
 * mesma que a mobilia ja usa: o gerador diz onde esta o painel, este arquivo diz
 * o que ele pergunta.
 *
 * Tres decisoes valem explicacao:
 *
 * 1. TODA persistencia passa por `worldEvents`. Nao ha um segundo sistema de
 *    save pra represa. Um puzzle resolvido e uma flag, um atalho aberto e uma
 *    flag, um recipiente ja saqueado e um id em `itensColetados` — os mesmos dois
 *    mecanismos que a cidade ja usa. O save so ganhou a vida e o registro da
 *    corrida atual.
 *
 * 2. A dificuldade cresce em DOIS eixos, e nao um. Profundidade e o eixo
 *    permanente (cada nivel escurece mais, os bichos de la doem mais); TENSAO e
 *    o eixo temporario — ela sobe enquanto o jogador esta dentro e zera quando
 *    ele sai. E o que faz "ficar mais tempo" custar algo sem punir quem explora
 *    devagar em varias viagens.
 *
 * 3. A derrota NAO e permanente e NAO toca em nada critico. Ver
 *    `PERDA_POR_DERROTA` e o comentario dela.
 */

import type { ValorWorldEvent } from './worldEvents.ts';

// --------------------------------------------------------------- setores --
export interface SetorRepresa {
  /** chave em MAPAS */
  chave: string;
  nivel: number;
  rotulo: string;
  /** escuridao base do setor, 0 a 1 (o valor por comodo vem do tilemap) */
  escuridao: number;
  /** flag que precisa estar ativa pra descer PRA CA; null = livre */
  exige: string | null;
}

/**
 * Os cinco setores, do mais raso pro mais fundo.
 *
 * Esta tabela e a fonte da leitura "quao fundo eu estou" — a HUD, a tensao e o
 * resgate saem dela. A escuridao esta repetida do tilemap de proposito: o jogo
 * usa o valor do COMODO quando ha um, e este e o piso do setor pra quando o
 * jogador esta num tile que nenhum comodo cobre (corredor de ligacao, vao).
 */
export const SETORES_REPRESA: readonly SetorRepresa[] = [
  { chave: 'represa_0', nivel: 0, rotulo: 'Casa de Forca', escuridao: 0, exige: null },
  { chave: 'represa_1', nivel: -1, rotulo: 'Manutencao', escuridao: 0.18, exige: null },
  { chave: 'represa_2', nivel: -2, rotulo: 'Galeria das Turbinas', escuridao: 0.38, exige: null },
  { chave: 'represa_3', nivel: -3, rotulo: 'Galerias Inferiores', escuridao: 0.6, exige: 'represaEnergiaGaleria' },
  { chave: 'represa_4', nivel: -4, rotulo: 'Setor Profundo', escuridao: 0.8, exige: 'represaComportaAberta' },
];

const SETOR_POR_CHAVE = new Map(SETORES_REPRESA.map((s) => [s.chave, s]));

export function setorDaRepresa(chave: unknown): SetorRepresa | null {
  return typeof chave === 'string' ? (SETOR_POR_CHAVE.get(chave) ?? null) : null;
}

/** true no mapa externo da represa e em qualquer setor dela. */
export function naRepresa(mapa: string): boolean {
  return mapa === 'represa' || SETOR_POR_CHAVE.has(mapa);
}

/** Setor onde o jogador acorda depois de ser derrotado: sempre o nivel 0. */
export const SETOR_DE_RESGATE = 'represa_0';
export const PONTO_DE_RESGATE = { x: 14, y: 17 };

// --------------------------------------------------------------- tensao --
/**
 * TENSAO — o eixo temporal da dificuldade.
 *
 * Sobe com o tempo de permanencia DENTRO da usina e com a profundidade em que
 * o jogador esta; zera quando ele volta pro mapa externo. O efeito e um
 * multiplicador aplicado a velocidade, ao raio de deteccao e a cadencia dos
 * inimigos — nunca ao dano nem ao HP deles, pra a conta de "quantos golpes eu
 * aguento" e "quantos golpes ele aguenta" continuar previsivel.
 *
 * Escala: 40 minutos de jogo no nivel 0 nao chegam a 0,25 de tensao; 40 minutos
 * no nivel -4 passam de 0,8. Descer e o que acelera, e e isso que o jogador
 * sente: dar uma passada rapida no fundo e barato, morar la nao.
 */
export const TENSAO = {
  /** quanto sobe por MINUTO de jogo no nivel 0 */
  porMinuto: 0.004,
  /** quanto cada nivel de profundidade multiplica a subida */
  fatorPorNivel: 0.45,
  /** quanto um erro em painel adiciona de uma vez */
  porErro: 0.05,
  /** teto */
  maxima: 1,
  /** multiplicador de dificuldade quando a tensao esta no teto */
  dificuldadeMaxima: 1.55,
} as const;

/** Multiplicador de IA para uma tensao. 1 na chegada. */
export function dificuldadeDaTensao(tensao: number): number {
  const t = Math.min(TENSAO.maxima, Math.max(0, tensao));
  return 1 + t * (TENSAO.dificuldadeMaxima - 1);
}

// -------------------------------------------------------------- derrota --
/**
 * O que a derrota custa.
 *
 * NAO custa: save, item de missao, item unico, mobilia, relacionamento, flag de
 * puzzle resolvido, atalho aberto. Custa tempo e parte do salvado NAO CRITICO
 * recolhido — e so o da corrida atual, contado por `SistemaRepresa`.
 *
 * A conta e uma fracao e nao um numero fixo pra escalar sozinha: quem desce com
 * pouco perde pouco, quem desce e enche a mochila tem o que perder. E o que faz
 * "voltar pra vender" ser uma decisao.
 */
export const PERDA_POR_DERROTA = {
  /** fracao do salvado da corrida atual que se perde */
  fracaoDoSalvado: 0.5,
  /** horas de jogo que passam no resgate */
  horas: 4,
  /** com quanto da vida o jogador acorda */
  fracaoDeVida: 0.6,
} as const;

// ---------------------------------------------------------------- luz --
/**
 * LANTERNA. O jogo comeca sem uma: o raio de visao no escuro e o `base`. A
 * lanterna de manutencao (achada no nivel 0, na gaveta que o primeiro puzzle
 * abre) troca isso pelo `comLanterna`.
 *
 * Os dois raios sao generosos de proposito. Escuridao aqui e pra criar tensao,
 * nao pra fazer o jogador tatear parede — o que a escuridao esconde e o inimigo
 * ao longe e a saida do outro lado da galeria, nao o proprio pe.
 */
export const RAIO_DE_LUZ = {
  /** raio em TILES sem lanterna */
  base: 3.2,
  /** raio em TILES com a lanterna de manutencao */
  comLanterna: 5.6,
} as const;

export const FLAG_LANTERNA = 'represaLanterna';

// ---------------------------------------------------------- quebra-cabecas --
/** Um passo de um painel. */
export type PassoPainel =
  /** escolher a opcao certa numa lista */
  | { tipo: 'escolha'; pergunta: string; opcoes: readonly string[]; correta: number }
  /** escolher varias opcoes NA ORDEM certa */
  | { tipo: 'sequencia'; pergunta: string; opcoes: readonly string[]; ordem: readonly number[] }
  /** digitar um codigo numerico, digito por digito */
  | { tipo: 'codigo'; pergunta: string; codigo: string }
  /** encaixar uma peca do inventario (ela e CONSUMIDA) */
  | { tipo: 'peca'; pergunta: string; itemId: string; nomeDoItem: string };

export interface PainelRepresa {
  id: string;
  /** setor em que ele fica — usado pela conferencia e pela mensagem de erro */
  setor: string;
  nome: string;
  /** dificuldade declarada, so pra leitura e pra conferencia contar */
  grau: 'alavanca' | 'simples' | 'intermediario' | 'profundo';
  /** texto mostrado antes do primeiro passo */
  abertura: string;
  /** texto ao concluir */
  conclusao: string;
  passos: readonly PassoPainel[];
  /** flag ligada ao concluir */
  flag: string;
  /** tentativas base por visita; a tensao desconta (ver `tentativasDe`) */
  tentativas: number;
}

/**
 * Os SETE paineis: uma alavanca, tres simples, dois intermediarios e um
 * profundo de tres passos.
 *
 * A regra de escrita que todos seguem: a resposta esta SEMPRE escrita em algum
 * documento do mapa, e nunca e adivinhavel. Os documentos sao objetos de exame
 * (`placa` com `aviso`), e a lista de textos mora em `AVISOS_DE_PREDIO`, na
 * FarmScene. O painel profundo junta pista de TRES setores diferentes de
 * proposito — e o unico que exige ter percorrido a usina inteira.
 *
 * Nenhum painel e obrigatorio pra sair da represa. Tres deles (2, 3 e o cofre
 * do 6) protegem so loot; os outros abrem profundidade ou atalho.
 */
export const PAINEIS_REPRESA: readonly PainelRepresa[] = [
  {
    id: 'alavanca_atalho',
    setor: 'represa_2',
    nome: 'Alavanca da porta de servico',
    grau: 'alavanca',
    abertura: 'A porta de servico que estava trancada la em cima e esta. A alavanca fica deste lado.',
    conclusao: 'A trava cedeu. Dai pra frente a descida pela manutencao fica quatro comodos mais curta.',
    passos: [
      {
        tipo: 'escolha',
        pergunta: 'Destravar a porta de servico?',
        opcoes: ['Destravar', 'Deixar como esta'],
        correta: 0,
      },
    ],
    flag: 'represaAtalhoManutencao',
    tentativas: 9,
  },
  {
    id: 'quadro_entrada',
    setor: 'represa_0',
    nome: 'Quadro de disjuntores',
    grau: 'simples',
    abertura: 'Tres disjuntores desligados e uma etiqueta colada por dentro da tampa. A ordem importa.',
    conclusao: 'As luminarias do hall acendem uma a uma. A gaveta da sala de controle destrava junto.',
    passos: [
      {
        tipo: 'sequencia',
        pergunta: 'Religar em que ordem?',
        opcoes: ['Bomba de drenagem', 'Iluminacao', 'Ventilacao', 'Comando geral'],
        // a etiqueta do diario de entrada: bomba, iluminacao, ventilacao
        ordem: [0, 1, 2],
      },
    ],
    flag: 'represaLuzEntrada',
    tentativas: 5,
  },
  {
    id: 'simbolos_manutencao',
    setor: 'represa_1',
    nome: 'Painel de simbolos',
    grau: 'simples',
    abertura: 'O armario de suprimentos usa fechadura de simbolo. A etiqueta dele diz o que ele guarda.',
    conclusao: 'A tranca gira. Dentro ha o que sobrou do estoque de manutencao.',
    passos: [
      {
        tipo: 'escolha',
        pergunta: 'Qual simbolo corresponde a "risco eletrico"?',
        opcoes: ['Triangulo com raio', 'Circulo com gota', 'Quadrado com chama', 'Losango com engrenagem'],
        correta: 0,
      },
    ],
    flag: 'represaSimbolosResolvido',
    tentativas: 5,
  },
  {
    id: 'cabos_bomba',
    setor: 'represa_1',
    nome: 'Caixa de passagem da bomba',
    grau: 'simples',
    abertura: 'Dois cabos arrancados e uma legenda parafusada na parede ao lado.',
    conclusao: 'O contator fecha com um estalo seco. A caixa de pecas da bomba abre.',
    passos: [
      {
        tipo: 'escolha',
        pergunta: 'Qual par religa o comando da bomba?',
        opcoes: ['Azul + cinza', 'Marrom + preto', 'Verde-amarelo + azul', 'Vermelho + vermelho'],
        // a legenda: comando = marrom (fase) + preto (retorno)
        correta: 1,
      },
    ],
    flag: 'represaCabosResolvido',
    tentativas: 5,
  },
  {
    id: 'geradores',
    setor: 'represa_2',
    nome: 'Sinoptico dos geradores',
    grau: 'intermediario',
    abertura:
      'Quatro geradores, todos parados. O diario de operacao ao lado registra a ordem de partida — ' +
      'e avisa que fora dela o disjuntor de campo abre.',
    conclusao:
      'Um a um os geradores entram. A luz do sinoptico passa de vermelho pra verde e o alcapao ' +
      'da galeria inferior destrava.',
    passos: [
      {
        tipo: 'sequencia',
        pergunta: 'Ordem de partida dos geradores?',
        opcoes: ['G1', 'G2', 'G3', 'G4'],
        // diario: G3, G1, G4, G2
        ordem: [2, 0, 3, 1],
      },
    ],
    flag: 'represaEnergiaGaleria',
    tentativas: 4,
  },
  {
    id: 'comportas',
    setor: 'represa_3',
    nome: 'Mesa de comportas',
    grau: 'intermediario',
    abertura:
      'Tres valvulas e um manometro. O procedimento colado no vidro diz que a pressao tem de cair ' +
      'antes de qualquer coisa abrir.',
    conclusao:
      'A pressao cai, a comporta de servico range e o poco de drenagem fica acessivel. ' +
      'Da pra ouvir agua correndo muito abaixo.',
    passos: [
      {
        tipo: 'sequencia',
        pergunta: 'Sequencia das valvulas?',
        opcoes: ['Alivio', 'Bypass', 'Servico', 'Fecho de emergencia'],
        // procedimento: alivio, bypass, servico
        ordem: [0, 1, 2],
      },
      {
        tipo: 'codigo',
        pergunta: 'Codigo de liberacao da comporta (2 digitos)',
        // esta no proprio procedimento, no rodape
        codigo: '47',
      },
    ],
    flag: 'represaComportaAberta',
    tentativas: 4,
  },
  {
    id: 'placa_controle',
    setor: 'represa_4',
    nome: 'Placa de controle mestre',
    grau: 'profundo',
    abertura:
      'A placa mestre esta na bancada, aberta, com um componente carbonizado e um soquete vazio. ' +
      'Alguem ja tentou consertar isto antes — e desistiu no meio.',
    conclusao:
      'A placa acorda. O terminal cospe uma linha de registro com data de tres anos DEPOIS do ' +
      'desligamento da usina, o elevador de servico volta a atender e o cofre do canto destrava.',
    passos: [
      {
        tipo: 'escolha',
        pergunta: 'Qual componente queimou?',
        opcoes: ['Regulador de tensao', 'Capacitor de filtro', 'Cristal oscilador', 'Diodo de protecao'],
        // o registro de manutencao do nivel 0 fecha nisto
        correta: 1,
      },
      {
        tipo: 'peca',
        pergunta: 'Encaixar uma placa de circuito recuperada no soquete vazio',
        itemId: 'placa_de_circuito',
        nomeDoItem: 'Placa de Circuito',
      },
      {
        tipo: 'codigo',
        pergunta: 'Codigo de manutencao (4 digitos)',
        // 19 esta na placa da turbina (nivel -2) e 82 no terminal daqui
        codigo: '1982',
      },
    ],
    flag: 'represaPlacaRestaurada',
    tentativas: 3,
  },
];

const PAINEL_POR_ID = new Map(PAINEIS_REPRESA.map((p) => [p.id, p]));

export function buscarPainel(id: unknown): PainelRepresa | null {
  return typeof id === 'string' ? (PAINEL_POR_ID.get(id) ?? null) : null;
}

/**
 * Flags de ATALHO PERMANENTE — as que encurtam o caminho depois de abertas.
 * Ficam separadas das de puzzle porque a derrota nao pode revogar nenhuma das
 * duas, e a conferencia cobra exatamente isso.
 */
export const ATALHOS_REPRESA = ['represaAtalhoManutencao', 'represaElevadorLiberado'] as const;

/** Toda flag que a represa escreve. E o que o save tem de preservar. */
export const FLAGS_DA_REPRESA: readonly string[] = [
  ...PAINEIS_REPRESA.map((p) => p.flag),
  ...ATALHOS_REPRESA,
  FLAG_LANTERNA,
  'represaVisitada',
];

/**
 * Quantas tentativas um painel da AGORA.
 *
 * A tensao desconta: chegar descansado no painel profundo da 3 chances, chegar
 * nele depois de uma hora perdida no escuro da 1. E o eixo do tempo entrando
 * tambem nos enigmas, e nao so nos bichos — e o que faz "ficar mais tempo"
 * doer sem nunca fechar o progresso: a tentativa volta quando a tensao cai, e a
 * tensao cai saindo da usina.
 */
export function tentativasDe(painel: PainelRepresa, tensao: number): number {
  if (painel.grau === 'alavanca') return painel.tentativas;
  const desconto = Math.floor(Math.min(TENSAO.maxima, Math.max(0, tensao)) * 3);
  return Math.max(1, painel.tentativas - desconto);
}

// -------------------------------------------------------------- sistema --
export interface DadosRepresa {
  /** minutos de jogo acumulados na corrida atual dentro da usina */
  minutosDentro: number;
  /** tensao atual, 0 a 1 */
  tensao: number;
  /** ids de salvado recolhido na corrida atual (o que a derrota belisca) */
  corrida: { id: string; quantidade: number }[];
  /** nivel mais fundo ja alcancado, pra a UI e pro relatorio */
  nivelMaisFundo: number;
}

/**
 * Estado da represa que NAO cabe em worldEvents: a corrida atual.
 *
 * O que e permanente (puzzle resolvido, atalho aberto, recipiente saqueado) mora
 * em `worldEvents` / `itensColetados`. O que e da VIAGEM (quanto tempo dentro,
 * tensao, o que foi recolhido desde a ultima saida) mora aqui, e e a unica
 * coisa que a derrota mexe.
 */
export class SistemaRepresa {
  private minutosDentro = 0;
  private _tensao = 0;
  private corrida = new Map<string, number>();
  private _nivelMaisFundo = 0;
  /** ultimo mapa observado, pra detectar entrada e saida da usina */
  private ultimoMapa: string | null = null;

  get tensao(): number {
    return this._tensao;
  }

  get dificuldade(): number {
    return dificuldadeDaTensao(this._tensao);
  }

  get nivelMaisFundo(): number {
    return this._nivelMaisFundo;
  }

  /** Salvado recolhido na corrida atual. */
  get salvadoDaCorrida(): { id: string; quantidade: number }[] {
    return [...this.corrida].map(([id, quantidade]) => ({ id, quantidade }));
  }

  /**
   * Chamado a cada virada de minuto de jogo, com o mapa atual.
   *
   * Fazer a conta em MINUTO DE JOGO e nao em milissegundo real e deliberado: o
   * jogador ja tem uma nocao de quanto custa "uma hora dentro da usina", e o
   * relogio da HUD e o mesmo. Contar em tempo real faria a tensao depender de
   * quanto tempo o menu ficou aberto.
   */
  avancar(mapa: string, minutos: number): void {
    const setor = setorDaRepresa(mapa);
    if (this.ultimoMapa !== mapa) {
      this.ultimoMapa = mapa;
      // Saiu dos SETORES: a corrida fecha e a tensao zera.
      //
      // O corte e no setor e nao em `naRepresa`, que inclui o mapa externo do
      // Mapa 4: a estrada e dia aberto e nao ha inimigo nela, entao chegar no
      // patio da casa de forca ja e ter escapado. Usar `naRepresa` aqui fazia a
      // tensao sobreviver a saida pela porta — o jogador saia, respirava e
      // voltava com a mesma tensao de antes.
      if (!setor) this.encerrarCorrida();
    }
    if (!setor) return;
    if (setor.nivel < this._nivelMaisFundo) this._nivelMaisFundo = setor.nivel;
    if (minutos <= 0) return;
    this.minutosDentro += minutos;
    const fator = 1 + Math.abs(setor.nivel) * TENSAO.fatorPorNivel;
    this._tensao = Math.min(TENSAO.maxima, this._tensao + minutos * TENSAO.porMinuto * fator);
  }

  /** Erro em painel: a tensao sobe de uma vez. */
  registrarErro(): void {
    this._tensao = Math.min(TENSAO.maxima, this._tensao + TENSAO.porErro);
  }

  /** Salvado recolhido dentro da usina entra na conta da corrida. */
  registrarSalvado(id: string, quantidade: number): void {
    if (quantidade <= 0) return;
    this.corrida.set(id, (this.corrida.get(id) ?? 0) + quantidade);
  }

  /** Saiu da usina por vontade propria: nada se perde, a tensao zera. */
  encerrarCorrida(): void {
    this.minutosDentro = 0;
    this._tensao = 0;
    this.corrida.clear();
  }

  /**
   * Derrota: devolve o que TEM DE SAIR do inventario e limpa a corrida.
   *
   * Quem remove e a cena — este metodo so calcula, pra a regra ser conferivel
   * sem inventario. A conta arredonda pra BAIXO: quem recolheu uma peca so nao
   * perde nada, o que evita a punicao mais frustrante possivel (descer, achar
   * uma coisa, morrer, voltar de maos vazias).
   */
  perdaPorDerrota(): { id: string; quantidade: number }[] {
    const perda = [...this.corrida]
      .map(([id, quantidade]) => ({
        id,
        quantidade: Math.floor(quantidade * PERDA_POR_DERROTA.fracaoDoSalvado),
      }))
      .filter((p) => p.quantidade > 0);
    this.minutosDentro = 0;
    this._tensao = 0;
    this.corrida.clear();
    return perda;
  }

  serializar(): DadosRepresa {
    return {
      minutosDentro: this.minutosDentro,
      tensao: this._tensao,
      corrida: this.salvadoDaCorrida,
      nivelMaisFundo: this._nivelMaisFundo,
    };
  }

  restaurar(bruto: unknown): void {
    this.minutosDentro = 0;
    this._tensao = 0;
    this.corrida.clear();
    this._nivelMaisFundo = 0;
    this.ultimoMapa = null;
    if (!bruto || typeof bruto !== 'object') return;
    const dados = bruto as Partial<DadosRepresa>;
    if (Number.isFinite(dados.minutosDentro)) this.minutosDentro = Math.max(0, Number(dados.minutosDentro));
    if (Number.isFinite(dados.tensao)) {
      this._tensao = Math.min(TENSAO.maxima, Math.max(0, Number(dados.tensao)));
    }
    if (Number.isFinite(dados.nivelMaisFundo)) {
      this._nivelMaisFundo = Math.min(0, Math.round(Number(dados.nivelMaisFundo)));
    }
    for (const entrada of Array.isArray(dados.corrida) ? dados.corrida : []) {
      if (typeof entrada?.id === 'string' && Number.isFinite(entrada.quantidade)) {
        this.corrida.set(entrada.id, Math.max(0, Math.floor(entrada.quantidade)));
      }
    }
  }
}

/**
 * Estado de um painel EM ANDAMENTO. Vive na cena, nao no save: um painel
 * interrompido no meio recomeca do primeiro passo, e o unico registro que fica
 * e a flag do painel concluido.
 */
export interface ProgressoPainel {
  painel: PainelRepresa;
  passo: number;
  /** escolhas ja feitas no passo atual (sequencia) ou digitos (codigo) */
  parcial: number[];
  digitos: string;
  tentativasRestantes: number;
}

export function iniciarPainel(painel: PainelRepresa, tensao: number): ProgressoPainel {
  return {
    painel,
    passo: 0,
    parcial: [],
    digitos: '',
    tentativasRestantes: tentativasDe(painel, tensao),
  };
}

export type RespostaPainel =
  | { resultado: 'continua' }
  | { resultado: 'passo_ok' }
  | { resultado: 'concluido'; flag: string }
  | { resultado: 'errou'; restantes: number }
  | { resultado: 'travado' }
  | { resultado: 'sem_peca'; itemId: string };

/**
 * Aplica UMA escolha do jogador no painel em andamento.
 *
 * `temItem`/`consumirItem` entram por parametro pelo mesmo motivo de sempre: a
 * regra tem de ser testavel sem inventario de verdade.
 */
export function responderPainel(
  progresso: ProgressoPainel,
  escolha: number,
  inventario?: { contar(id: string): number; remover(id: string, qtd: number): number },
): RespostaPainel {
  const passo = progresso.painel.passos[progresso.passo];
  if (!passo) return { resultado: 'travado' };

  const errar = (): RespostaPainel => {
    progresso.parcial = [];
    progresso.digitos = '';
    progresso.tentativasRestantes -= 1;
    return progresso.tentativasRestantes > 0
      ? { resultado: 'errou', restantes: progresso.tentativasRestantes }
      : { resultado: 'travado' };
  };

  const avancar = (): RespostaPainel => {
    progresso.passo += 1;
    progresso.parcial = [];
    progresso.digitos = '';
    if (progresso.passo >= progresso.painel.passos.length) {
      return { resultado: 'concluido', flag: progresso.painel.flag };
    }
    return { resultado: 'passo_ok' };
  };

  switch (passo.tipo) {
    case 'escolha':
      return escolha === passo.correta ? avancar() : errar();

    case 'sequencia': {
      const esperado = passo.ordem[progresso.parcial.length];
      if (escolha !== esperado) return errar();
      progresso.parcial.push(escolha);
      return progresso.parcial.length >= passo.ordem.length ? avancar() : { resultado: 'continua' };
    }

    case 'codigo': {
      // `escolha` e o digito escolhido no menu (0 a 9). O codigo e conferido
      // digito a digito: errar no meio ja gasta a tentativa, o que e o que
      // torna a pista necessaria em vez de opcional.
      const esperado = passo.codigo[progresso.digitos.length];
      if (String(escolha) !== esperado) return errar();
      progresso.digitos += String(escolha);
      return progresso.digitos.length >= passo.codigo.length ? avancar() : { resultado: 'continua' };
    }

    case 'peca': {
      if (escolha !== 0) return { resultado: 'continua' };
      if (!inventario || inventario.contar(passo.itemId) <= 0) {
        return { resultado: 'sem_peca', itemId: passo.itemId };
      }
      inventario.remover(passo.itemId, 1);
      return avancar();
    }
  }
}

/** Rotulo do passo atual, pro titulo do menu. */
export function perguntaAtual(progresso: ProgressoPainel): string {
  const passo = progresso.painel.passos[progresso.passo];
  if (!passo) return progresso.painel.nome;
  if (passo.tipo === 'sequencia') {
    const feito = progresso.parcial.length;
    return `${passo.pergunta} (${feito + 1} de ${passo.ordem.length})`;
  }
  if (passo.tipo === 'codigo') {
    const mascara = progresso.digitos + '_'.repeat(passo.codigo.length - progresso.digitos.length);
    return `${passo.pergunta}: ${mascara}`;
  }
  return passo.pergunta;
}

/** Opcoes do passo atual, na ordem em que o menu deve mostrar. */
export function opcoesAtuais(progresso: ProgressoPainel): string[] {
  const passo = progresso.painel.passos[progresso.passo];
  if (!passo) return [];
  if (passo.tipo === 'codigo') return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (passo.tipo === 'peca') return [`Encaixar ${passo.nomeDoItem}`, 'Deixar pra depois'];
  return [...passo.opcoes];
}

/** Todas as flags que um painel concluido escreve, pro save conferir. */
export function flagsConcluidas(worldEvents: {
  ativa(chave: string): boolean;
}): Record<string, ValorWorldEvent> {
  const saida: Record<string, ValorWorldEvent> = {};
  for (const flag of FLAGS_DA_REPRESA) if (worldEvents.ativa(flag)) saida[flag] = true;
  return saida;
}

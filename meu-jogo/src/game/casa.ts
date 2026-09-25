/**
 * CASA DO PROTAGONISTA — expansao de comodos e mobilia paga.
 *
 * Sao duas compras diferentes, em dois balcoes diferentes:
 *
 *  1. COMODO, na madeireira do Mapa 3 (objeto interativo `expansao`). Cada
 *     comodo comprado abre FISICAMENTE na planta da casa: o vao que estava
 *     tapado com parede vira passagem. Os comodos ja existem no tilemap desde a
 *     geracao (piso, parede, vao) — o que a compra faz e destapar, e nao
 *     construir. Isso e o que torna a mecanica confiavel: nao ha geometria
 *     inventada em tempo de jogo, so um tile pra apagar.
 *
 *  2. MOVEL, na bancada da propria oficina (objeto interativo `mobilia`). O
 *     jogador escolhe a peca no catalogo, ela vira um fantasma preso ao ponteiro
 *     e ele solta onde quiser DENTRO de um comodo que ja possui. O pagamento so
 *     acontece quando a posicao e valida.
 *
 * Este arquivo guarda a TABELA de precos e o ESTADO serializavel. A geometria
 * (o que e posicao valida) mora na cena, que e quem tem o tilemap na mao — ver
 * `FarmScene.posicaoDeMovelValida`.
 *
 * DINHEIRO: nada aqui escreve saldo. Quem cobra e `estado.carteira.gastar()`,
 * com uma `Entrega` que so aplica a mudanca se o debito passar — mesmo contrato
 * da loja e da DevStore.
 */

/** Um comodo compravel da casa+oficina. `id` e o nome do comodo no tilemap. */
export interface DefinicaoExpansao {
  id: string;
  nome: string;
  /** preco em CENTAVOS */
  preco: number;
  descricao: string;
  materiais: readonly RequisitoMaterial[];
}

export interface RequisitoMaterial {
  itemId: 'madeira' | 'pedra' | 'concreto';
  quantidade: number;
}

/**
 * Os tres comodos de expansao da planta `oficina` (ver `PLANTAS_PROPRIAS` em
 * tools/gerar-assets.mjs). A ordem e a da lista da loja.
 *
 * PRECOS — AJUSTAVEIS, e a regua e o SIMULADOR: `npm run verificar-equilibrio`
 * mede um ano de quadro de trabalho e diz quantos dias de jogo cada preco custa.
 *
 * A referencia e um dia de quadro cheio, R$ 736,65 (cinco vagas, media de 112
 * dias simulados). O deposito e uma meta de curto prazo — as "5 vagas boas" que
 * este comentario sempre prometeu e o preco nao cobrava: a R$ 800 ele custava
 * duas vagas e meia, e agora custa as cinco. O estudio e de medio prazo e a
 * garagem de longo.
 *
 * O que a medicao mostrou: a casa INTEIRA (tres expansoes e vinte e dois moveis)
 * custava R$ 8.115, ou onze dias de trabalho — dez por cento de um ano de jogo.
 * Todo o conteudo de casa acabava na segunda semana, e comprar deixava de ser
 * decisao porque nao havia o que escolher entre. Agora custa uma estacao.
 */
export const EXPANSOES: readonly DefinicaoExpansao[] = [
  {
    id: 'deposito',
    nome: 'Deposito',
    preco: 160_000,
    materiais: [{ itemId: 'madeira', quantidade: 20 }, { itemId: 'pedra', quantidade: 12 }],
    descricao: 'Um comodo pequeno atras da sala, pra guardar o que nao cabe na oficina.',
  },
  {
    id: 'estudio',
    nome: 'Estudio',
    preco: 400_000,
    materiais: [{ itemId: 'madeira', quantidade: 35 }, { itemId: 'concreto', quantidade: 15 }],
    descricao: 'Sala extra ligada a oficina, com piso de madeira.',
  },
  {
    id: 'garagem',
    nome: 'Garagem',
    preco: 900_000,
    materiais: [{ itemId: 'pedra', quantidade: 50 }, { itemId: 'concreto', quantidade: 30 }],
    descricao: 'O maior dos tres, no fundo da faixa leste. Piso de concreto.',
  },
];

export function buscarExpansao(id: unknown): DefinicaoExpansao | null {
  return typeof id === 'string' ? (EXPANSOES.find((e) => e.id === id) ?? null) : null;
}

/**
 * Uma peca do catalogo de mobilia.
 *
 * `movel` e a chave em `MOVEIS_CASA` do gerador. As MEDIDAS da peca (atlas,
 * frame, largura e altura em tiles) NAO estao aqui de proposito: elas saem da
 * arte, e o gerador as escreve em `assets/sprites/mobilia.json` lendo esta
 * mesma lista. Assim nao existe numero de arte duplicado entre o gerador e o
 * jogo — o mesmo arranjo que `FOLHAS_DE_MOVEL` ja usava.
 */
export interface DefinicaoMovelLoja {
  id: string;
  nome: string;
  /** preco em CENTAVOS */
  preco: number;
  /** chave em MOVEIS_CASA (tools/gerar-assets.mjs) */
  movel: string;
}

/**
 * Catalogo de mobilia. PRECOS AJUSTAVEIS, mesma regua das expansoes: peca de
 * decoracao entre R$ 30 e R$ 90, movel de verdade entre R$ 150 e R$ 320.
 *
 * O catalogo NAO restringe peca por comodo — diferente da mobilia autoral das
 * casas de NPC, aqui quem decide o que vai onde e o jogador.
 */
export const CATALOGO_MOBILIA: readonly DefinicaoMovelLoja[] = [
  // --- decoracao leve (nao bloqueia passagem) ---
  //
  // Continua barata: enfeite e compra de impulso, e o vaso a R$ 45 e a primeira
  // coisa que o jogador compra por vontade propria em vez de por necessidade.
  { id: 'vaso_flores', nome: 'Vaso de flores', preco: 4_500, movel: 'vaso_flores' },
  { id: 'poster_galaxia', nome: 'Poster', preco: 5_000, movel: 'poster_galaxia' },
  { id: 'quadro_paisagem', nome: 'Quadro de paisagem', preco: 6_000, movel: 'quadro_paisagem' },
  { id: 'planta_alta', nome: 'Planta alta', preco: 7_000, movel: 'planta_alta' },
  { id: 'relogio_parede', nome: 'Relogio de parede', preco: 7_500, movel: 'relogio_parede' },
  { id: 'planta_grande', nome: 'Planta grande', preco: 8_000, movel: 'planta_grande' },
  { id: 'tapete_cinza', nome: 'Tapete cinza', preco: 9_000, movel: 'tapete_cinza' },
  { id: 'tapete_creme', nome: 'Tapete creme', preco: 9_000, movel: 'tapete_creme' },
  { id: 'lampada_tripe', nome: 'Lampada de tripe', preco: 10_500, movel: 'lampada_tripe' },
  { id: 'violao', nome: 'Violao', preco: 13_500, movel: 'violao' },
  // --- moveis (bloqueiam passagem) ---
  //
  // Estes subiram TRES vezes, e a decoracao so uma vez e meia. E de proposito: a
  // escada era estreita demais pra escolher dentro dela. Com a decoracao entre
  // R$ 45 e R$ 135 e o movel entre R$ 270 e R$ 960, o sofa passou a custar mais
  // de um dia de trabalho — e comprar o sofa passou a ser em vez de outra coisa.
  { id: 'criado_mudo', nome: 'Criado-mudo', preco: 27_000, movel: 'criado_mudo' },
  { id: 'caixa_ferramenta', nome: 'Caixa de ferramenta', preco: 36_000, movel: 'caixa_ferramenta' },
  { id: 'mesa_centro_madeira', nome: 'Mesa de centro', preco: 45_000, movel: 'mesa_centro_madeira' },
  { id: 'poltrona_creme', nome: 'Poltrona', preco: 54_000, movel: 'poltrona_creme' },
  { id: 'comoda_quarto', nome: 'Comoda', preco: 57_000, movel: 'comoda_quarto' },
  { id: 'escrivaninha', nome: 'Escrivaninha', preco: 60_000, movel: 'escrivaninha' },
  { id: 'estante_caixas', nome: 'Estante de caixas', preco: 60_000, movel: 'estante_caixas' },
  { id: 'armario_pecas', nome: 'Armario de pecas', preco: 63_000, movel: 'armario_pecas' },
  { id: 'estante_livros_v2', nome: 'Estante de livros', preco: 66_000, movel: 'estante_livros_v2' },
  { id: 'prateleira_pecas', nome: 'Prateleira de pecas', preco: 72_000, movel: 'prateleira_pecas' },
  { id: 'bancada_trabalho', nome: 'Bancada de trabalho', preco: 78_000, movel: 'bancada_trabalho' },
  { id: 'sofa_creme', nome: 'Sofa', preco: 96_000, movel: 'sofa_creme' },
];

export function buscarMovelDeLoja(id: unknown): DefinicaoMovelLoja | null {
  return typeof id === 'string' ? (CATALOGO_MOBILIA.find((m) => m.id === id) ?? null) : null;
}

/**
 * Toda peca exige material. A quantidade sai do PRECO em vez de uma coluna
 * propria no catalogo — e o que evita duplicar vinte e duas linhas de tabela.
 *
 * MAS O PRECO NAO E ESCALA DE MATERIAL, e a escala mudou junto: quando o preco
 * do movel subiu tres vezes, esta funcao passou a pedir tres vezes mais madeira
 * sem ninguem ter decidido isso, e os dois limiares (R$ 90 pra pedra, R$ 200 pra
 * concreto) cairam AMBOS abaixo do movel mais barato — as tres faixas de
 * material viraram uma. Os limiares abaixo estao na escala nova, e
 * `verificar-equilibrio` confere que as tres faixas continuam povoadas.
 *
 *   decoracao      (R$ 45 a R$ 135):  madeira
 *   movel leve     (R$ 270 a R$ 570): madeira + pedra
 *   movel pesado   (R$ 600 a R$ 960): madeira + concreto
 */
const PRECO_COM_PEDRA = 20_000;
const PRECO_COM_CONCRETO = 60_000;

export function requisitosDoMovel(movel: DefinicaoMovelLoja): RequisitoMaterial[] {
  const madeira = Math.max(1, Math.ceil(movel.preco / 20_000));
  const extras: RequisitoMaterial[] = movel.preco >= PRECO_COM_CONCRETO
    ? [{ itemId: 'concreto', quantidade: Math.max(1, Math.floor(movel.preco / 30_000)) }]
    : movel.preco >= PRECO_COM_PEDRA
      ? [{ itemId: 'pedra', quantidade: 1 }]
      : [];
  return [{ itemId: 'madeira', quantidade: madeira }, ...extras];
}

/** As medidas de uma peca, como o gerador as escreveu em `mobilia.json`. */
export interface MedidaDeMovel {
  atlas: string;
  frame: string;
  larguraTiles: number;
  alturaTiles: number;
  solido: boolean;
  chao: boolean;
}

/** Uma peca JA POSICIONADA na casa. `tx`/`ty` sao o tile esquerdo-INFERIOR. */
export interface MovelPosto {
  /** id do catalogo */
  id: string;
  tx: number;
  ty: number;
}

export interface DadosCasa {
  /** ids dos comodos de expansao ja comprados */
  comodos: string[];
  moveis: MovelPosto[];
}

/**
 * Estado da casa do protagonista. So guarda o que precisa sobreviver ao save;
 * quem sabe desenhar e validar e a cena.
 */
export class SistemaCasa {
  private comprados = new Set<string>();
  private postos: MovelPosto[] = [];

  /** Os comodos de expansao ja comprados. */
  get comodos(): ReadonlySet<string> {
    return this.comprados;
  }

  get moveis(): readonly MovelPosto[] {
    return this.postos;
  }

  temComodo(id: string): boolean {
    return this.comprados.has(id);
  }

  /** As expansoes que ainda estao a venda, na ordem do catalogo. */
  expansoesDisponiveis(): DefinicaoExpansao[] {
    return EXPANSOES.filter((e) => !this.comprados.has(e.id));
  }

  /**
   * Registra a compra de um comodo. NAO cobra: quem cobra e a carteira, e este
   * metodo e o `entregar()` da transacao.
   */
  liberarComodo(id: string): void {
    this.comprados.add(id);
  }

  /** Idem pra mobilia: so registra a peca ja paga. */
  posicionarMovel(movel: MovelPosto): void {
    this.postos.push({ ...movel });
  }

  serializar(): DadosCasa {
    return { comodos: [...this.comprados], moveis: this.postos.map((m) => ({ ...m })) };
  }

  /**
   * Le do save. Aceita save antigo (campo ausente) e save estranho sem quebrar:
   * comodo ou peca que nao existe mais no catalogo e descartado com aviso, em
   * vez de derrubar o jogo.
   */
  restaurar(bruto: unknown): void {
    this.comprados = new Set();
    this.postos = [];
    if (!bruto || typeof bruto !== 'object') return;
    const dados = bruto as Partial<DadosCasa>;

    if (Array.isArray(dados.comodos)) {
      for (const id of dados.comodos) {
        if (buscarExpansao(id)) this.comprados.add(id as string);
        else console.warn(`[casa] comodo "${String(id)}" nao existe mais — ignorado`);
      }
    }
    if (Array.isArray(dados.moveis)) {
      for (const m of dados.moveis) {
        if (!m || typeof m !== 'object') continue;
        const { id, tx, ty } = m as MovelPosto;
        if (!buscarMovelDeLoja(id) || !Number.isFinite(tx) || !Number.isFinite(ty)) {
          console.warn(`[casa] movel invalido no save (${String(id)}) — ignorado`);
          continue;
        }
        this.postos.push({ id, tx: Math.round(tx), ty: Math.round(ty) });
      }
    }
  }
}

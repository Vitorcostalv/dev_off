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
 * PRECOS — AJUSTAVEIS. A referencia e o que o jogador ganha hoje: uma vaga do
 * app Trabalho paga entre R$ 40 e R$ 320, e o item mais caro da DevStore custa
 * cerca de R$ 1.500. Entao o deposito e uma meta de curto prazo (umas 5 vagas
 * boas), o estudio de medio e a garagem de longo. Mexer aqui nao pede mexer em
 * mais nada.
 */
export const EXPANSOES: readonly DefinicaoExpansao[] = [
  {
    id: 'deposito',
    nome: 'Deposito',
    preco: 80_000,
    materiais: [{ itemId: 'madeira', quantidade: 20 }, { itemId: 'pedra', quantidade: 12 }],
    descricao: 'Um comodo pequeno atras da sala, pra guardar o que nao cabe na oficina.',
  },
  {
    id: 'estudio',
    nome: 'Estudio',
    preco: 160_000,
    materiais: [{ itemId: 'madeira', quantidade: 35 }, { itemId: 'concreto', quantidade: 15 }],
    descricao: 'Sala extra ligada a oficina, com piso de madeira.',
  },
  {
    id: 'garagem',
    nome: 'Garagem',
    preco: 280_000,
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
  { id: 'vaso_flores', nome: 'Vaso de flores', preco: 3_000, movel: 'vaso_flores' },
  { id: 'poster_galaxia', nome: 'Poster', preco: 3_500, movel: 'poster_galaxia' },
  { id: 'quadro_paisagem', nome: 'Quadro de paisagem', preco: 4_000, movel: 'quadro_paisagem' },
  { id: 'planta_alta', nome: 'Planta alta', preco: 4_500, movel: 'planta_alta' },
  { id: 'relogio_parede', nome: 'Relogio de parede', preco: 5_000, movel: 'relogio_parede' },
  { id: 'planta_grande', nome: 'Planta grande', preco: 5_500, movel: 'planta_grande' },
  { id: 'tapete_cinza', nome: 'Tapete cinza', preco: 6_000, movel: 'tapete_cinza' },
  { id: 'tapete_creme', nome: 'Tapete creme', preco: 6_000, movel: 'tapete_creme' },
  { id: 'lampada_tripe', nome: 'Lampada de tripe', preco: 7_000, movel: 'lampada_tripe' },
  { id: 'violao', nome: 'Violao', preco: 9_000, movel: 'violao' },
  // --- moveis (bloqueiam passagem) ---
  { id: 'criado_mudo', nome: 'Criado-mudo', preco: 9_000, movel: 'criado_mudo' },
  { id: 'caixa_ferramenta', nome: 'Caixa de ferramenta', preco: 12_000, movel: 'caixa_ferramenta' },
  { id: 'mesa_centro_madeira', nome: 'Mesa de centro', preco: 15_000, movel: 'mesa_centro_madeira' },
  { id: 'poltrona_creme', nome: 'Poltrona', preco: 18_000, movel: 'poltrona_creme' },
  { id: 'comoda_quarto', nome: 'Comoda', preco: 19_000, movel: 'comoda_quarto' },
  { id: 'escrivaninha', nome: 'Escrivaninha', preco: 20_000, movel: 'escrivaninha' },
  { id: 'estante_caixas', nome: 'Estante de caixas', preco: 20_000, movel: 'estante_caixas' },
  { id: 'armario_pecas', nome: 'Armario de pecas', preco: 21_000, movel: 'armario_pecas' },
  { id: 'estante_livros_v2', nome: 'Estante de livros', preco: 22_000, movel: 'estante_livros_v2' },
  { id: 'prateleira_pecas', nome: 'Prateleira de pecas', preco: 24_000, movel: 'prateleira_pecas' },
  { id: 'bancada_trabalho', nome: 'Bancada de trabalho', preco: 26_000, movel: 'bancada_trabalho' },
  { id: 'sofa_creme', nome: 'Sofa', preco: 32_000, movel: 'sofa_creme' },
];

export function buscarMovelDeLoja(id: unknown): DefinicaoMovelLoja | null {
  return typeof id === 'string' ? (CATALOGO_MOBILIA.find((m) => m.id === id) ?? null) : null;
}

/**
 * Toda peca exige material. A quantidade acompanha o preco e evita duplicar
 * uma coluna longa no catalogo; itens leves usam madeira, os mais pesados
 * acrescentam pedra ou concreto.
 */
export function requisitosDoMovel(movel: DefinicaoMovelLoja): RequisitoMaterial[] {
  const madeira = Math.max(1, Math.ceil(movel.preco / 10_000));
  const extras: RequisitoMaterial[] = movel.preco >= 20_000
    ? [{ itemId: 'concreto', quantidade: Math.max(1, Math.floor(movel.preco / 20_000)) }]
    : movel.preco >= 9_000
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

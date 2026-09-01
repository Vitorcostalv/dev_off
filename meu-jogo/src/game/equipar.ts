/**
 * O QUE UM ITEM FAZ — comportamento, equipamento e presa na mao.
 *
 * Antes desta leva o inventario guardava itens e nada mais: a unica coisa que
 * "usar" fazia era descontar da pilha e escrever uma linha de aviso, e a acao
 * ficava escrita dentro da UIScene. Este arquivo tira a regra de la e a poe num
 * lugar so, em forma de DADO.
 *
 * Tres coisas moram aqui e nenhuma quarta:
 *
 *  1. `COMPORTAMENTOS` — o que cada item usavel/equipavel faz, por id. Item que
 *     nao aparece nesta tabela e item inerte: da pra guardar, mover, vender e
 *     descartar, e nada mais. Isso e a maioria do catalogo (as 300 pecas de
 *     mercado e de eletronico) e continua sendo, sem uma linha de codigo por
 *     item.
 *  2. `SistemaEquipamento` — os slots. So MAO e UTILITARIO funcionam nesta
 *     etapa; ACESSORIO existe na tabela de slots e nao aceita nada ainda, o que
 *     e o suficiente pra a UI e o save ja saberem lidar com ele.
 *  3. As ZONAS. Uma arma de fogo pode ficar na mochila em qualquer lugar do
 *     mundo, mas so pode ser EQUIPADA em zona perigosa. A regra e uma so, em
 *     `podeEquipar`, e vale pra qualquer item futuro que declare `zonas`.
 *
 * A separacao que este arquivo mantem: ele nao conhece Phaser, nao toca em
 * `estado` global e nao desenha nada. Quem faz efeito colateral e a cena; aqui
 * so se decide o que acontece. E o que permite a conferencia offline provar que
 * a pistola nao equipa na cidade, que um item de missao nao se descarta e que
 * todo frame de mao citado existe no atlas.
 */

import { ITENS } from './inventario.ts';
import type { DefinicaoItem } from './inventario.ts';
import { naRepresa, setorDaRepresa } from './represa.ts';

// ------------------------------------------------------------------ slots --
/**
 * Os slots de equipamento.
 *
 * MAO e o que o personagem segura e o que a folha `Player_segurando` mostra.
 * UTILITARIO e o que fica pendurado no cinto e age sem ocupar a mao — hoje so a
 * lanterna, e e por isso que ele existe: obrigar a escolher entre ver no escuro
 * e ter uma arma na mao seria uma decisao interessante em outro jogo, e neste
 * seria so tatear parede com uma pistola inutil.
 *
 * ACESSORIO esta declarado e vazio. Nao e enfeite: `SistemaEquipamento` ja
 * serializa, restaura e limpa os tres, entao o dia em que existir um item de
 * acessorio ele nao pede migracao de save.
 */
export const SLOTS_DE_EQUIPAMENTO = ['mao', 'acessorio', 'utilitario'] as const;
export type SlotEquipamento = (typeof SLOTS_DE_EQUIPAMENTO)[number];

/** Rotulo de cada slot, pro painel de inventario. */
export const NOME_DO_SLOT: Record<SlotEquipamento, string> = {
  mao: 'Mao',
  acessorio: 'Acessorio',
  utilitario: 'Utilitario',
};

// ------------------------------------------------------------------ zonas --
/**
 * ZONA em que um item pode ser equipado.
 *
 * `cidade` e todo mapa que nao seja a usina; `perigosa` sao os andares da
 * represa. Um item sem `zonas` declaradas vale nas duas — que e o caso da
 * chave inglesa e da lanterna.
 */
export type ZonaDeUso = 'cidade' | 'perigosa';

/** A zona de um mapa. Uma linha, e e a unica definicao no jogo. */
export function zonaDoMapa(mapa: string): ZonaDeUso {
  return setorDaRepresa(mapa) ? 'perigosa' : 'cidade';
}

/** true quando o mapa aceita combate — o que a camada da represa ja governa. */
export function zonaPerigosa(mapa: string): boolean {
  return zonaDoMapa(mapa) === 'perigosa';
}

/**
 * true no mapa externo da represa e nos andares. Reexportado daqui pra quem
 * cuida de item nao precisar conhecer `represa.ts`.
 */
export { naRepresa };

// ----------------------------------------------------------------- acoes --
/**
 * O que "USAR" faz.
 *
 * Cada variante e resolvida pela cena, que tem o que a acao precisa (vida,
 * relogio, camada de luz). O tipo e fechado de proposito: acao nova exige
 * entrada nova aqui e no `switch` de quem aplica, e o compilador cobra as duas.
 */
export type AcaoDeItem =
  /** devolve vida; `quantidade` em pontos de HP */
  | { tipo: 'curar'; quantidade: number }
  /** recarrega a arma de fogo equipada a partir da municao do inventario */
  | { tipo: 'recarregar' }
  /** liga/desliga a lanterna equipada */
  | { tipo: 'alternar_luz' }
  /** so mostra a descricao longa; serve a chave de acesso e a documentacao */
  | { tipo: 'ler' };

/**
 * AJUSTE DA PRESA por item, em cima da ancora medida na folha de segurar.
 *
 * A ancora (ver `tools/processar-sprites-jogador.mjs`) diz onde esta o PUNHO em
 * cada uma das quatro poses. O ajuste diz como o item se acomoda naquele punho:
 * uma pistola sai apontada pra frente, uma chave inglesa sai em pe, uma lanterna
 * sai deitada. Sem o ajuste por item, todos sairiam na mesma inclinacao e a
 * chave inglesa ficaria apontando pro chao.
 *
 * Todos os campos sao POR DIRECAO porque a arte do personagem nao e simetrica: a
 * mao erguida esta a esquerda do corpo na pose de frente e a direita na de
 * costas, e o item que na pose de perfil aparece inteiro, na de frente aparece
 * de viés. Um deslocamento global unico ja foi tentado e o resultado e a arma
 * cruzando o peito na pose de costas.
 */
export interface AjustePorDirecao {
  /** deslocamento em px da CELULA (200x320), somado a ancora do punho */
  dx?: number;
  dy?: number;
  /** rotacao em graus, sentido horario */
  giro?: number;
  /** multiplicador do tamanho base do item */
  escala?: number;
  /** true = o item desenha ATRAS do corpo (pose de costas, tipicamente) */
  atras?: boolean;
  /** true = espelha o item no eixo x (pose virada pra esquerda) */
  espelhado?: boolean;
}

export type AjusteNaMao = Record<'down' | 'left' | 'right' | 'up', AjustePorDirecao>;

/** O comportamento de um item. Todos os campos sao opcionais menos o id. */
export interface ComportamentoItem {
  /** dispara com a acao USAR */
  acao?: AcaoDeItem;
  /** a acao CONSOME uma unidade */
  consumivel?: boolean;
  /** aceita EQUIPAR, e em que slot */
  slot?: SlotEquipamento;
  /** zonas em que o EQUIPAR e permitido; ausente = todas */
  zonas?: readonly ZonaDeUso[];
  /** recusa curta e no tom do jogo, quando a zona nao permite */
  recusaDeZona?: string;
  /** frame no atlas `equipamento` mostrado na mao */
  frameNaMao?: string;
  /** altura do item na mao, em TILES; a escala do sprite sai daqui */
  alturaNaMao?: number;
  /** ajuste da presa por direcao */
  ajuste?: AjusteNaMao;
  /** id da arma em `ARMAS`, quando o item e arma de fogo */
  arma?: string;
  /** dano corpo a corpo, quando o item e ferramenta de bater */
  danoCorpoACorpo?: number;
  /** municao: de que arma este cartucho e */
  municaoDe?: string;
  /** NUNCA se destroi: item unico, de missao ou de acesso */
  indestrutivel?: boolean;
  /** texto longo do painel de detalhes, alem da descricao do catalogo */
  detalhe?: string;
}

/** Ajuste padrao: o item fica em pe no punho, sem giro. */
const EM_PE: AjusteNaMao = {
  down: { dx: -1, dy: 0 },
  left: { dx: -2, dy: 0, espelhado: true },
  right: { dx: 2, dy: 0 },
  up: { dx: 1, dy: -1, atras: true },
};

/**
 * Ajuste de ARMA DE MAO apontada pra frente. Os quatro giros levam em conta
 * que a arte da arma aponta pra DIREITA:
 *
 *   right  0 grau, como esta;
 *   left   espelhada;
 *   down   inclinada pra baixo e pra frente, saindo do peito;
 *   up     inclinada pra cima e ATRAS do corpo — na pose de costas o cano
 *          aponta pra longe da camera, e desenhar a arma na frente do tronco
 *          faria ela parecer colada nas costas do personagem.
 */
const APONTADA: AjusteNaMao = {
  down: { dx: -2, dy: 2, giro: 22, escala: 0.94 },
  left: { dx: -3, dy: 0, espelhado: true },
  right: { dx: 3, dy: 0 },
  up: { dx: 2, dy: -1, giro: -18, escala: 0.94, atras: true },
};

// ---------------------------------------------------------- comportamentos --
/**
 * A TABELA. Um item por linha; quem nao esta aqui e inerte.
 *
 * A ordem e por funcao: arma, ferramenta, municao, remedio, acesso.
 */
export const COMPORTAMENTOS: Record<string, ComportamentoItem> = {
  // -------------------------------------------------------------- armas --
  pistola: {
    slot: 'mao',
    // A UNICA restricao de zona do jogo, e a razao de `zonas` existir.
    zonas: ['perigosa'],
    recusaDeZona: 'Voce prefere nao carregar isso pela cidade.',
    frameNaMao: 'mao_pistola',
    alturaNaMao: 0.5,
    ajuste: APONTADA,
    arma: 'pistola',
    indestrutivel: true,
    detalhe:
      'Estava no cofre da portaria, oleada e com o carregador ao lado. Serve na represa e ' +
      'em nenhum outro lugar — nao ha nada na cidade pra que ela sirva.',
  },

  // --------------------------------------------------------- ferramentas --
  chave_inglesa: {
    slot: 'mao',
    frameNaMao: 'mao_chave_inglesa',
    alturaNaMao: 0.62,
    ajuste: EM_PE,
    // 7 contra os 4 do golpe base. A chave inglesa nao INTRODUZ o corpo a corpo
    // (ele existe desde a leva anterior e continua funcionando de maos vazias,
    // senao todo save antigo perderia o unico ataque que tinha) — ela e a
    // melhoria dele, e a razao de valer os R$ 39 da madeireira.
    danoCorpoACorpo: 7,
    detalhe: 'Equipada, o golpe passa de 4 pra 7 de dano. Sem ela o golpe continua saindo, mais fraco.',
  },
  lanterna_manutencao: {
    slot: 'utilitario',
    acao: { tipo: 'alternar_luz' },
    frameNaMao: 'mao_lanterna',
    alturaNaMao: 0.34,
    ajuste: {
      down: { dx: -2, dy: 1, giro: 14 },
      left: { dx: -3, dy: 0, espelhado: true },
      right: { dx: 3, dy: 0 },
      up: { dx: 2, dy: 0, giro: -14, atras: true },
    },
    detalhe: 'No cinto ela ja ilumina; USAR liga e desliga o facho.',
  },

  // ------------------------------------------------------------ municao --
  municao_pistola: {
    acao: { tipo: 'recarregar' },
    municaoDe: 'pistola',
    detalhe: 'Recarregar tambem sai com R, com a pistola na mao.',
  },

  // ----------------------------------------------------------- remedios --
  kit_primeiros_socorros: { acao: { tipo: 'curar', quantidade: 14 }, consumivel: true },
  analgesico: { acao: { tipo: 'curar', quantidade: 6 }, consumivel: true },
  energetico: { acao: { tipo: 'curar', quantidade: 3 }, consumivel: true },

  // ------------------------------------------------------------- acesso --
  cartao_acesso_usina: {
    acao: { tipo: 'ler' },
    indestrutivel: true,
    detalhe:
      'Abre as portas de cracha da usina. Enquanto ele estiver com voce, elas nao pedem nada.',
  },
};

export function comportamentoDe(id: unknown): ComportamentoItem | null {
  return typeof id === 'string' ? (COMPORTAMENTOS[id] ?? null) : null;
}

/**
 * As ACOES que o inventario deve oferecer pro item selecionado, na ordem em que
 * a UI lista. Fica aqui, e nao na UIScene, porque a regra e a mesma em qualquer
 * lugar que mostre um item.
 */
export type AcaoDeInventario = 'usar' | 'equipar' | 'desequipar' | 'examinar' | 'descartar';

export function acoesDoItem(
  id: string,
  equipadoAgora: boolean,
): readonly AcaoDeInventario[] {
  const def = ITENS[id];
  if (!def) return [];
  const c = COMPORTAMENTOS[id];
  const acoes: AcaoDeInventario[] = [];
  if (c?.acao) acoes.push('usar');
  if (c?.slot) acoes.push(equipadoAgora ? 'desequipar' : 'equipar');
  acoes.push('examinar');
  if (podeDescartar(def)) acoes.push('descartar');
  return acoes;
}

/**
 * Item que NUNCA se destroi.
 *
 * Duas fontes: `deMissao` (que ja existia, e nasceu de um beco sem saida real —
 * ver `DefinicaoItem`) e `indestrutivel` (novo, pros itens unicos e de acesso).
 * A pistola entra na segunda: ha uma so no jogo, ela vem de um cofre que nao
 * enche de novo, e descarta-la por engano fecharia o combate a distancia pra
 * sempre.
 */
export function podeDescartar(def: DefinicaoItem): boolean {
  if (def.deMissao) return false;
  return !COMPORTAMENTOS[def.id]?.indestrutivel;
}

// ------------------------------------------------------------- resultados --
export type FalhaEquipar =
  /** o item nao e equipavel */
  | 'nao_equipavel'
  /** a zona atual nao permite */
  | 'zona'
  /** o item nao esta no inventario */
  | 'ausente';

export interface ResultadoEquipar {
  ok: boolean;
  falha?: FalhaEquipar;
  /** slot afetado, quando deu certo */
  slot?: SlotEquipamento;
  /** o que estava no slot antes */
  anterior?: string | null;
  /** mensagem pronta pro aviso da HUD */
  aviso?: string;
}

// --------------------------------------------------------------- sistema --
export type DadosEquipamento = Partial<Record<SlotEquipamento, string | null>>;

/**
 * O que esta equipado.
 *
 * Guarda ID de item, nao slot de inventario: um item equipado continua ocupando
 * o slot em que esta e continua sendo contado por `contar`. Guardar o INDICE do
 * slot pareceu mais direto no comeco e nao e — organizar o inventario reordena
 * os slots, e a arma equipada passava a ser a maca que caiu naquele indice.
 */
export class SistemaEquipamento {
  private slots: Record<SlotEquipamento, string | null> = {
    mao: null,
    acessorio: null,
    utilitario: null,
  };

  /** true quando a lanterna equipada esta acesa. Nao consome nada (ver Parte 25). */
  private _lanternaAcesa = true;

  get lanternaAcesa(): boolean {
    return this._lanternaAcesa;
  }

  equipado(slot: SlotEquipamento): string | null {
    return this.slots[slot];
  }

  /** O item da MAO — o atalho mais usado. */
  get naMao(): string | null {
    return this.slots.mao;
  }

  /** true se `id` esta equipado em qualquer slot. */
  estaEquipado(id: string): boolean {
    return SLOTS_DE_EQUIPAMENTO.some((s) => this.slots[s] === id);
  }

  /** O slot em que `id` esta, ou null. */
  slotDe(id: string): SlotEquipamento | null {
    return SLOTS_DE_EQUIPAMENTO.find((s) => this.slots[s] === id) ?? null;
  }

  /**
   * Pode equipar `id` estando em `mapa`?
   *
   * Nao consulta inventario: quem chama ja sabe se tem o item. Isso mantem a
   * regra testavel com um id e uma string.
   */
  podeEquipar(id: string, mapa: string): ResultadoEquipar {
    const c = COMPORTAMENTOS[id];
    if (!c?.slot) return { ok: false, falha: 'nao_equipavel' };
    if (c.zonas && !c.zonas.includes(zonaDoMapa(mapa))) {
      return { ok: false, falha: 'zona', aviso: c.recusaDeZona ?? 'Nao da pra usar isso aqui.' };
    }
    return { ok: true, slot: c.slot };
  }

  equipar(id: string, mapa: string): ResultadoEquipar {
    const r = this.podeEquipar(id, mapa);
    if (!r.ok || !r.slot) return r;
    const anterior = this.slots[r.slot];
    this.slots[r.slot] = id;
    return { ok: true, slot: r.slot, anterior };
  }

  desequipar(slot: SlotEquipamento): string | null {
    const saiu = this.slots[slot];
    this.slots[slot] = null;
    return saiu;
  }

  /** Desequipa `id` de onde ele estiver. Devolve o slot esvaziado, ou null. */
  desequiparItem(id: string): SlotEquipamento | null {
    const slot = this.slotDe(id);
    if (slot) this.slots[slot] = null;
    return slot;
  }

  alternarLanterna(): boolean {
    this._lanternaAcesa = !this._lanternaAcesa;
    return this._lanternaAcesa;
  }

  /**
   * SAIU DA ZONA PERIGOSA: desequipa o que a zona nova nao permite.
   *
   * E chamado a cada troca de mapa. Nao apaga nada do inventario — a arma volta
   * pra mochila e continua lá. Devolve os ids que sairam, pra a cena avisar.
   */
  ajustarAZona(mapa: string): string[] {
    const sairam: string[] = [];
    for (const slot of SLOTS_DE_EQUIPAMENTO) {
      const id = this.slots[slot];
      if (!id) continue;
      const c = COMPORTAMENTOS[id];
      if (c?.zonas && !c.zonas.includes(zonaDoMapa(mapa))) {
        this.slots[slot] = null;
        sairam.push(id);
      }
    }
    return sairam;
  }

  /**
   * O item saiu do inventario (vendido, descartado, gasto): se estava equipado,
   * sai do slot tambem. Sem isto o save gravaria uma arma equipada que nao
   * existe mais na mochila.
   */
  sincronizarCom(contar: (id: string) => number): void {
    for (const slot of SLOTS_DE_EQUIPAMENTO) {
      const id = this.slots[slot];
      if (id && contar(id) <= 0) this.slots[slot] = null;
    }
  }

  serializar(): DadosEquipamento {
    return { mao: this.slots.mao, acessorio: this.slots.acessorio, utilitario: this.slots.utilitario };
  }

  /**
   * Save antigo chega sem este campo e o resultado e "nada equipado", que e o
   * estado certo pra quem nunca viu a pistola. Id que nao existe mais no
   * catalogo tambem cai em null, em vez de derrubar a carga.
   */
  restaurar(bruto: unknown): void {
    this.slots = { mao: null, acessorio: null, utilitario: null };
    this._lanternaAcesa = true;
    if (!bruto || typeof bruto !== 'object') return;
    const dados = bruto as DadosEquipamento;
    for (const slot of SLOTS_DE_EQUIPAMENTO) {
      const id = dados[slot];
      if (typeof id !== 'string' || !ITENS[id]) continue;
      if (COMPORTAMENTOS[id]?.slot !== slot) continue;
      this.slots[slot] = id;
    }
  }
}

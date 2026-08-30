import { CATALOGO_ITENS } from './itens.ts';
import type { CategoriaItem } from './itens.ts';

/**
 * Que TIPO de item e — usado no painel de detalhes e na ordenacao do
 * inventario. Nao e a mesma coisa que `categoria`: categoria e de onde o item
 * vem (prateleira do mercado x prateleira de eletronico) e decide a faixa de
 * preco; tipo e o que ele FAZ na mao do jogador.
 */
export type TipoItem = 'componente' | 'consumivel' | 'eletronico' | 'ferramenta' | 'material' | 'outro';

/** Ordem em que `Inventario.organizar()` agrupa os tipos. */
export const ORDEM_DE_TIPO: readonly TipoItem[] = [
  'consumivel',
  'eletronico',
  'componente',
  'ferramenta',
  'material',
  'outro',
];

export interface DefinicaoItem {
  id: string;
  nome: string;
  /**
   * Cor do icone quando o item NAO tem arte propria. Continua servindo aos
   * itens de teste, que nao tem correspondente nas folhas de arte de item.
   */
  icone: number;
  descricao: string;
  tipo: TipoItem;
  /** quantos cabem em um slot */
  maxPilha: number;
  /**
   * Frame no atlas `itens`, quando o item tem arte propria. Ausente = a UI
   * desenha o retangulo colorido de `icone`.
   */
  frame?: string;
  /** de que prateleira o item veio; ausente = item que a loja nao vende */
  categoria?: CategoriaItem;
  /** preco de compra em CENTAVOS; ausente = fora de venda */
  preco?: number;
  /**
   * Item de MISSAO: entra e sai por regra de jogo, nunca pela vontade do
   * jogador. A UI recusa descartar um destes.
   *
   * Existe por causa de um beco sem saida real: a encomenda da vaga de entrega
   * podia ser descartada como qualquer item, e ai a entrega ficava aceita PARA
   * SEMPRE — a porta do destino nao completava nada (sem encomenda no
   * inventario) e o app recusava aceitar outra ("ja tem uma em andamento").
   * Ver tambem `SistemaTrabalhos.cancelarEntrega`, que e a saida quando a
   * encomenda some por outro caminho.
   */
  deMissao?: boolean;
}

/**
 * Itens de teste, anteriores as folhas de arte de item. Nao tem correspondente
 * nas folhas novas, entao seguem com o icone placeholder colorido — e o que os
 * pickups espalhados pelo mapa ainda usam.
 */
const ITENS_DE_TESTE: Record<string, DefinicaoItem> = {
  cabo_usb: {
    id: 'cabo_usb',
    nome: 'Cabo USB',
    icone: 0x61b7d9,
    descricao: 'Um cabo curto que ainda parece funcionar.',
    tipo: 'componente',
    maxPilha: 99,
  },
  bateria: {
    id: 'bateria',
    nome: 'Bateria',
    icone: 0xe3c85b,
    descricao: 'Uma bateria compacta com um pouco de carga.',
    tipo: 'componente',
    maxPilha: 20,
  },
};

/**
 * Itens de MISSAO: entram e saem por regra de jogo, nao pela loja. Ficam fora
 * do `CATALOGO_ITENS` de proposito — nao tem arte propria nas folhas de item,
 * nao tem preco e nao podem aparecer na vitrine da DevStore nem na loja fisica.
 */
const ITENS_DE_MISSAO: Record<string, DefinicaoItem> = {
  encomenda: {
    id: 'encomenda',
    nome: 'Encomenda',
    icone: 0xc9a86a,
    descricao: 'Uma caixa lacrada com endereco escrito a mao. Nao e sua.',
    tipo: 'outro',
    // uma por vez: a vaga de entrega e uma so (ver SistemaTrabalhos)
    maxPilha: 1,
    deMissao: true,
  },
  notebook_edu: { id:'notebook_edu', nome:'Notebook do Edu', icone:0x424c58, descricao:'Um notebook dentro de uma mochila preta. Ha um adesivo com o nome Edu.', tipo:'eletronico', maxPilha:1, deMissao:true },
  camera_leticia: { id:'camera_leticia', nome:'Camera antiga da Leticia', icone:0x6b5748, descricao:'Camera analogica antiga, protegida num estojo gasto.', tipo:'eletronico', maxPilha:1, deMissao:true },
};

/** Cor de fundo do slot por categoria, so pra o icone nao flutuar no vazio. */
const COR_DE_CATEGORIA: Record<CategoriaItem, number> = {
  normal: 0x9ad27f,
  eletronico: 0x7fa8d9,
  material: 0xa79d8c,
};

/**
 * Registro de TODO item que pode entrar no inventario: os de teste mais o
 * `CATALOGO_ITENS`. O catalogo entra por ultimo, mas nao pode sobrescrever
 * ninguem — id repetido derruba a carga em vez de trocar um item por outro no
 * save de quem ja jogou.
 */
export const ITENS: Record<string, DefinicaoItem> = (() => {
  const registro: Record<string, DefinicaoItem> = { ...ITENS_DE_TESTE, ...ITENS_DE_MISSAO };
  for (const item of CATALOGO_ITENS) {
    if (registro[item.id]) {
      throw new Error(`[inventario] item "${item.id}" ja existe fora do catalogo`);
    }
    registro[item.id] = {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      // comida e bebida se usam; materiais e eletronicos mantem tipo proprio
      tipo: item.categoria === 'normal' ? 'consumivel' : item.categoria === 'material' ? 'material' : 'eletronico',
      maxPilha: item.maxPilha,
      frame: item.frame,
      icone: item.icone ?? COR_DE_CATEGORIA[item.categoria],
      categoria: item.categoria,
      preco: item.preco,
    };
  }
  return registro;
})();

export interface Slot {
  id: string;
  qtd: number;
}

export const TAMANHO_PADRAO = 20;

export class Inventario {
  readonly slots: (Slot | null)[];

  constructor(tamanho: number = TAMANHO_PADRAO) {
    this.slots = new Array<Slot | null>(tamanho).fill(null);
  }

  /**
   * Empilha no que ja existe e so depois ocupa slot vazio.
   * Devolve quanto NAO coube (0 = entrou tudo).
   */
  adicionar(id: string, qtd = 1): number {
    const def = ITENS[id];
    if (!def) {
      console.warn(`[inventario] item desconhecido "${id}"`);
      return qtd;
    }

    let resto = qtd;
    for (const slot of this.slots) {
      if (resto <= 0) break;
      if (slot?.id !== id) continue;
      const cabe = Math.min(def.maxPilha - slot.qtd, resto);
      slot.qtd += cabe;
      resto -= cabe;
    }
    for (let i = 0; i < this.slots.length && resto > 0; i++) {
      if (this.slots[i] !== null) continue;
      const cabe = Math.min(def.maxPilha, resto);
      this.slots[i] = { id, qtd: cabe };
      resto -= cabe;
    }
    return resto;
  }

  /**
   * true se `qtd` unidades de `id` cabem AGORA, sem alterar nada.
   *
   * E a metade "so pergunta" da compra atomica: a carteira chama isto antes de
   * encostar no saldo (ver `Entrega` em game/dinheiro.ts). A simulacao repete a
   * mesma ordem de `adicionar` — primeiro completa pilha existente, so depois
   * ocupa slot vazio — senao ela responderia "cabe" pra um caso que na hora de
   * entregar nao caberia.
   */
  cabe(id: string, qtd = 1): boolean {
    const def = ITENS[id];
    if (!def || qtd <= 0) return false;
    let resto = qtd;
    for (const slot of this.slots) {
      if (resto <= 0) break;
      if (slot?.id === id) resto -= Math.min(def.maxPilha - slot.qtd, resto);
    }
    for (const slot of this.slots) {
      if (resto <= 0) break;
      if (slot === null) resto -= Math.min(def.maxPilha, resto);
    }
    return resto <= 0;
  }

  /** Quantos slots ainda estao vazios. */
  get vagos(): number {
    return this.slots.reduce((total, s) => (s === null ? total + 1 : total), 0);
  }

  /**
   * Tira `qtd` de UM slot especifico e devolve quanto saiu. E o que "descartar"
   * e "usar" precisam: `remover` vai atras do id em qualquer slot, e ai
   * descartar a pilha selecionada poderia esvaziar outra.
   */
  removerDoSlot(indice: number, qtd = 1): number {
    const slot = this.slots[indice];
    if (!slot || qtd <= 0) return 0;
    const tira = Math.min(slot.qtd, qtd);
    slot.qtd -= tira;
    if (slot.qtd === 0) this.slots[indice] = null;
    return tira;
  }

  /**
   * Reagrupa o inventario: junta o que estiver espalhado em pilhas cheias e
   * ordena por tipo (ver `ORDEM_DE_TIPO`) e depois por nome.
   *
   * Somar tudo por id antes de redistribuir e o que preserva o empilhamento: duas
   * pilhas de 7 macas viram uma de 14, nao duas de 7 lado a lado. Como a
   * capacidade total nao muda, o que cabia antes continua cabendo.
   */
  organizar(): void {
    const total = new Map<string, number>();
    for (const slot of this.slots) {
      if (slot) total.set(slot.id, (total.get(slot.id) ?? 0) + slot.qtd);
    }
    const ordenados = [...total.keys()].sort((a, b) => {
      const da = ITENS[a];
      const db = ITENS[b];
      const ta = ORDEM_DE_TIPO.indexOf(da.tipo);
      const tb = ORDEM_DE_TIPO.indexOf(db.tipo);
      return ta - tb || da.nome.localeCompare(db.nome);
    });

    this.slots.fill(null);
    let i = 0;
    for (const id of ordenados) {
      let resto = total.get(id) ?? 0;
      while (resto > 0 && i < this.slots.length) {
        const cabe = Math.min(ITENS[id].maxPilha, resto);
        this.slots[i] = { id, qtd: cabe };
        resto -= cabe;
        i += 1;
      }
      if (resto > 0) {
        // so aconteceria se a capacidade tivesse encolhido entre save e load
        console.warn(`[inventario] nao coube tudo ao organizar: sobraram ${resto} de "${id}"`);
      }
    }
  }

  /** Devolve quanto foi realmente removido. */
  remover(id: string, qtd = 1): number {
    let restante = qtd;
    for (let i = this.slots.length - 1; i >= 0 && restante > 0; i--) {
      const slot = this.slots[i];
      if (slot?.id !== id) continue;
      const tira = Math.min(slot.qtd, restante);
      slot.qtd -= tira;
      restante -= tira;
      if (slot.qtd === 0) this.slots[i] = null;
    }
    return qtd - restante;
  }

  contar(id: string): number {
    return this.slots.reduce((total, s) => (s?.id === id ? total + s.qtd : total), 0);
  }

  serializar(): (Slot | null)[] {
    return this.slots.map((s) => (s ? { id: s.id, qtd: s.qtd } : null));
  }

  /** Aceita dados de save antigos/estranhos sem quebrar: o que nao bate vira slot vazio. */
  restaurar(dados: unknown): void {
    this.slots.fill(null);
    if (!Array.isArray(dados)) return;
    for (let i = 0; i < Math.min(dados.length, this.slots.length); i++) {
      const s = dados[i] as Partial<Slot> | null;
      if (!s || typeof s.id !== 'string' || !ITENS[s.id]) continue;
      const qtd = Math.max(0, Math.min(Number(s.qtd) || 0, ITENS[s.id].maxPilha));
      if (qtd > 0) this.slots[i] = { id: s.id, qtd };
    }
  }
}

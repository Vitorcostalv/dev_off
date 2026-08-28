export interface DefinicaoItem {
  id: string;
  nome: string;
  /** Cor do icone placeholder, ate haver arte de item. */
  icone: number;
  descricao: string;
  tipo: 'componente' | 'consumivel' | 'ferramenta' | 'outro';
  /** quantos cabem em um slot */
  maxPilha: number;
}

export const ITENS: Record<string, DefinicaoItem> = {
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

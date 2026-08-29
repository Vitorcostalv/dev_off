import { formatarHora } from './relogio.ts';
import { nomeDoDia } from './calendario.ts';

/**
 * Historico de descarte — o que alimenta o app Lixeira do computador.
 *
 * E SO historico: nao ha recuperacao de item. O que sai do inventario saiu; a
 * lixeira registra o que foi e quando, nada mais. Por isso a entrada guarda o
 * NOME do item, e nao so o id: um item pode sumir do catalogo entre uma
 * partida e outra, e a linha do historico ainda precisa fazer sentido.
 */
export interface EntradaDeLixeira {
  /** id do item no catalogo, pra quem quiser cruzar com ITENS depois */
  id: string;
  /** nome no momento do descarte */
  nome: string;
  qtd: number;
  /** dia absoluto do jogo em que o descarte aconteceu */
  dia: number;
  /** minutos desde a meia-noite */
  minutos: number;
}

/**
 * Teto de entradas guardadas. A lista vive no save, e save cresce pra sempre se
 * ninguem cortar: 50 descartes cobrem o historico util e mantem o JSON pequeno.
 */
export const LIMITE_DE_ENTRADAS = 50;

export class Lixeira {
  /** Mais recente PRIMEIRO — e a ordem em que a tela mostra. */
  private entradas: EntradaDeLixeira[] = [];

  get lista(): readonly EntradaDeLixeira[] {
    return this.entradas;
  }

  get vazia(): boolean {
    return this.entradas.length === 0;
  }

  registrar(entrada: EntradaDeLixeira): void {
    if (entrada.qtd <= 0) return;
    this.entradas.unshift(entrada);
    if (this.entradas.length > LIMITE_DE_ENTRADAS) {
      this.entradas.length = LIMITE_DE_ENTRADAS;
    }
  }

  serializar(): EntradaDeLixeira[] {
    return this.entradas.map((e) => ({ ...e }));
  }

  /** Aceita save antigo ou estranho sem quebrar: o que nao bate e descartado. */
  restaurar(bruto: unknown): void {
    this.entradas = [];
    if (!Array.isArray(bruto)) return;
    for (const cru of bruto.slice(0, LIMITE_DE_ENTRADAS)) {
      const e = cru as Partial<EntradaDeLixeira>;
      if (typeof e?.id !== 'string' || typeof e.nome !== 'string') continue;
      const qtd = Number(e.qtd);
      if (!Number.isSafeInteger(qtd) || qtd <= 0) continue;
      this.entradas.push({
        id: e.id,
        nome: e.nome,
        qtd,
        dia: Number.isFinite(e.dia) ? Number(e.dia) : 0,
        minutos: Number.isFinite(e.minutos) ? Number(e.minutos) : 0,
      });
    }
  }
}

/** "Quarta-feira 14:30" — o carimbo de tempo mostrado na lista. */
export function carimboDe(entrada: EntradaDeLixeira): string {
  return `${nomeDoDia(entrada.dia)} ${formatarHora(entrada.minutos)}`;
}

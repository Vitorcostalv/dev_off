/**
 * Dinheiro do jogador — ponto UNICO de verdade do saldo.
 *
 * O saldo mora em `Carteira._saldo` e e privado de proposito: nenhum outro
 * arquivo escreve nele. Quem precisa mexer chama `ganhar()` ou `gastar()`, que
 * sao as duas unicas portas. Isso e o que torna a regra "nao pode ficar
 * negativo" verificavel num lugar so, em vez de espalhada por cada tela que
 * mexe em dinheiro.
 *
 * O valor e guardado em CENTAVOS, como inteiro. Guardar em reais com casa
 * decimal traz o erro de ponto flutuante junto (0.1 + 0.2 !== 0.3), e depois de
 * algumas dezenas de compras o saldo desanda alguns centavos. Com centavos
 * inteiros a conta e exata, e a formatacao com virgula acontece so na hora de
 * mostrar (`formatarDinheiro`).
 */

/** Saldo de um jogo novo, em centavos (R$ 200,00). */
export const SALDO_INICIAL = 20_000;

/**
 * Teto de sanidade do saldo, em centavos (R$ 1.000.000,00). Nao e regra de
 * jogo: e o que separa "save legitimo" de "save adulterado ou corrompido" na
 * hora de carregar. Um save acima disso volta pro saldo inicial.
 */
export const SALDO_MAXIMO = 100_000_000;

/** Por que uma transacao nao passou. `ok: true` nunca traz motivo. */
export type MotivoRecusa =
  /** valor invalido: NaN, negativo, fracao de centavo */
  | 'valor'
  /** nao ha saldo suficiente pra cobrir o debito */
  | 'saldo'
  /** a contrapartida da transacao nao cabe (ex: inventario cheio) */
  | 'entrega'
  /** ja ha uma transacao em andamento — protege contra disparo duplo */
  | 'ocupado'
  /** o credito estouraria o teto de sanidade */
  | 'teto';

export interface ResultadoTransacao {
  ok: boolean;
  /** so quando `ok` e false */
  motivo?: MotivoRecusa;
  /** saldo DEPOIS da transacao (igual ao de antes, quando ela e recusada) */
  saldo: number;
}

/**
 * A contrapartida de um `gastar()`: o que o jogador recebe pelo dinheiro.
 *
 * Sao dois passos de proposito, e e isso que torna a compra atomica:
 * `cabe()` so PERGUNTA (nao pode mudar nada) e `entregar()` so APLICA. A
 * carteira roda `cabe()` junto das outras checagens, antes de encostar no
 * saldo; se qualquer uma reprovar, nada foi alterado e nao ha o que desfazer.
 *
 * O caminho oposto — debitar e tentar consertar se a entrega falhar — perde
 * dinheiro em toda falha que o "conserto" nao previu. Aqui nao existe estado
 * intermediario pra consertar.
 */
export interface Entrega {
  /** true se a entrega pode ser concluida AGORA, sem alterar nada. */
  cabe(): boolean;
  /** Aplica a entrega. So e chamado depois de `cabe()` ter dado true. */
  entregar(): void;
}

/** "12345" -> "R$ 123,45". Aceita centavos negativos (mostra o sinal). */
export function formatarDinheiro(centavos: number): string {
  const sinal = centavos < 0 ? '-' : '';
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.floor(abs / 100);
  const cents = abs % 100;
  // separador de milhar, pra R$ 12.345,00 nao virar uma parede de digitos
  const milhar = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sinal}R$ ${milhar},${String(cents).padStart(2, '0')}`;
}

/** Um valor so serve como dinheiro se for inteiro, finito e nao-negativo. */
function valorValido(centavos: unknown): centavos is number {
  return typeof centavos === 'number' && Number.isSafeInteger(centavos) && centavos >= 0;
}

export class Carteira {
  private _saldo: number = SALDO_INICIAL;

  /**
   * Trava de transacao. Duplo-clique no botao de comprar chega aqui como duas
   * chamadas seguidas; re-entrancia (um `entregar()` que dispara outra compra)
   * chega como chamada aninhada. A trava barra as duas: enquanto uma transacao
   * nao terminou, a proxima e recusada com `motivo: 'ocupado'` em vez de
   * debitar duas vezes.
   */
  private ocupada = false;

  /** Saldo atual em centavos. Somente leitura — escrever so por ganhar/gastar. */
  get saldo(): number {
    return this._saldo;
  }

  /** Saldo formatado pra tela, ex: "R$ 200,00". */
  get texto(): string {
    return formatarDinheiro(this._saldo);
  }

  /** true se o saldo cobre `centavos`. Nao altera nada. */
  temSaldo(centavos: number): boolean {
    return valorValido(centavos) && this._saldo >= centavos;
  }

  /**
   * Credita `centavos`. Recusa valor invalido e credito que estouraria o teto
   * de sanidade — nos dois casos o saldo fica exatamente como estava.
   */
  ganhar(centavos: number): ResultadoTransacao {
    if (!valorValido(centavos)) {
      console.warn('[dinheiro] ganhar recusado: valor invalido', centavos);
      return { ok: false, motivo: 'valor', saldo: this._saldo };
    }
    if (this.ocupada) return { ok: false, motivo: 'ocupado', saldo: this._saldo };
    if (this._saldo + centavos > SALDO_MAXIMO) {
      console.warn('[dinheiro] ganhar recusado: estouraria o teto de saldo');
      return { ok: false, motivo: 'teto', saldo: this._saldo };
    }
    this._saldo += centavos;
    return { ok: true, saldo: this._saldo };
  }

  /**
   * Debita `centavos` — e, se houver `entrega`, so confirma o debito quando a
   * entrega tambem puder ser concluida.
   *
   * A ordem e sempre: CONFERIR TUDO -> APLICAR TUDO. Ate a ultima checagem o
   * saldo nao foi tocado, entao qualquer recusa devolve o mundo intacto: nao ha
   * "descontou e agora tenta devolver".
   */
  gastar(centavos: number, entrega?: Entrega): ResultadoTransacao {
    if (this.ocupada) {
      console.warn('[dinheiro] gastar recusado: ja ha uma transacao em andamento');
      return { ok: false, motivo: 'ocupado', saldo: this._saldo };
    }
    this.ocupada = true;
    try {
      // --- so conferencia daqui pra baixo; nada e alterado ---
      if (!valorValido(centavos)) {
        console.warn('[dinheiro] gastar recusado: valor invalido', centavos);
        return { ok: false, motivo: 'valor', saldo: this._saldo };
      }
      if (this._saldo < centavos) {
        return { ok: false, motivo: 'saldo', saldo: this._saldo };
      }
      // `cabe()` pode ser caro, mas roda por ultimo e so quando o resto passou
      if (entrega && !entrega.cabe()) {
        return { ok: false, motivo: 'entrega', saldo: this._saldo };
      }

      // --- daqui pra baixo nada mais pode recusar: aplica ---
      this._saldo -= centavos;
      entrega?.entregar();
      return { ok: true, saldo: this._saldo };
    } finally {
      this.ocupada = false;
    }
  }

  serializar(): number {
    return this._saldo;
  }

  /**
   * Le o saldo do save. Aceita QUALQUER coisa sem quebrar o jogo: string,
   * null, NaN, negativo, fracionario ou acima do teto viram um aviso e o saldo
   * inicial. Travar o jogo por causa de um save estranho seria pior do que
   * comecar de novo com R$ 200.
   */
  restaurar(bruto: unknown): void {
    if (valorValido(bruto) && bruto <= SALDO_MAXIMO) {
      this._saldo = bruto;
      return;
    }
    console.warn(`[dinheiro] saldo invalido no save (${String(bruto)}) — voltando ao inicial`);
    this._saldo = SALDO_INICIAL;
  }
}

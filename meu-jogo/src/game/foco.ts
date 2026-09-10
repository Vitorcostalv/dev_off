/**
 * Quem esta com o foco da interface.
 *
 * ## Por que existe
 * As seis janelas do jogo (fala, confirmacao, menu de assunto, inventario, loja
 * e computador) decidiam sozinhas se podiam abrir, cada uma com a sua guarda
 * escrita a mao:
 *
 *     abrirArquivo:     if (modalPorCima || lojaAberta || pcAberto) return;
 *     abrirLoja:        if (modalPorCima) return;
 *     abrirComputador:  if (modalPorCima || pcAberto) return;
 *
 * Nenhuma das tres conferia a mesma coisa, e as diferencas nao eram decisao:
 * a loja abria com o computador ligado, e o computador abria com a loja aberta.
 * Abrir uma setima janela exigiria acertar seis listas — e cada uma que
 * esquecesse a nova daria uma janela por baixo de outra, com o teclado indo pra
 * janela errada.
 *
 * Agora a regra fica em UM lugar: a tabela `CAMADA` abaixo. Nenhuma janela
 * pergunta pelas outras; todas perguntam pra pilha.
 *
 * ## Modulo puro
 * Sem Phaser e sem `estado`: e o que deixa a conferencia offline rodar todas as
 * sequencias de abrir/fechar (6 janelas, 4 de profundidade) sem abrir o jogo.
 */

export type JanelaDaUi =
  | 'dialogo'
  | 'confirmacao'
  | 'menu'
  | 'inventario'
  | 'loja'
  | 'computador';

/**
 * A camada de cada janela. Numero maior fica por cima.
 *
 * - **1, janela de conteudo**: ocupa a tela e o jogador navega dentro dela. Sao
 *   excludentes entre si — abrir a loja com o inventario aberto fecha o
 *   inventario, porque as duas usam as mesmas setas pra coisas diferentes.
 * - **2, fala**: abre POR CIMA de uma janela de conteudo (comprar um item pode
 *   render uma fala do balconista) e a de conteudo continua visivel por tras.
 *   O menu de assunto convive com a fala de proposito: o retrato de quem fala
 *   fica aberto por baixo do menu, pro jogador nao escolher assunto sem ver com
 *   quem esta falando.
 * - **3, pergunta**: "confirma a compra?" e a ultima palavra. Abre por cima de
 *   qualquer coisa e nada abre por cima dela.
 */
const CAMADA: Record<JanelaDaUi, 1 | 2 | 3> = {
  inventario: 1,
  loja: 1,
  computador: 1,
  dialogo: 2,
  menu: 2,
  confirmacao: 3,
};

/**
 * Camadas em que duas janelas nao podem ficar abertas juntas — abrir a segunda
 * FECHA a primeira.
 *
 * So a camada de conteudo e excludente, e a razao e o teclado: inventario e
 * loja navegam com as mesmas setas pra coisas diferentes, e o PC ocupa a tela
 * inteira. Ja na camada da fala a convivencia e o efeito desejado — o retrato
 * de quem fala fica aberto POR BAIXO do menu de assunto, pro jogador nao
 * escolher presente sem ver com quem esta falando.
 */
const EXCLUDENTES = new Set<number>([1]);

/** Janelas que capturam o teclado inteiro: enquanto uma esta aberta, nada anda. */
export class PilhaDeFoco {
  private pilha: JanelaDaUi[] = [];

  /** A janela que esta recebendo o teclado, ou null com o jogo em foco. */
  get topo(): JanelaDaUi | null {
    return this.pilha.length > 0 ? this.pilha[this.pilha.length - 1] : null;
  }

  /** true quando alguma janela captura o jogo — o player e o relogio param. */
  get bloqueado(): boolean {
    return this.pilha.length > 0;
  }

  get abertas(): readonly JanelaDaUi[] {
    return this.pilha;
  }

  aberta(janela: JanelaDaUi): boolean {
    return this.pilha.includes(janela);
  }

  /**
   * `true` se `janela` pode abrir agora.
   *
   * A regra e uma: a camada da janela nova tem de ser MAIOR OU IGUAL a do topo.
   * Uma pergunta abre sobre qualquer coisa (3 >= tudo), uma fala abre sobre uma
   * janela de conteudo (2 >= 1) mas nao sobre uma pergunta (2 < 3), e uma
   * janela de conteudo so abre com o jogo em foco ou trocando outra da sua
   * propria camada (1 >= 1).
   */
  podeAbrir(janela: JanelaDaUi): boolean {
    const topo = this.topo;
    return topo === null || CAMADA[janela] >= CAMADA[topo];
  }

  /**
   * Pede o foco pra `janela`. Devolve a lista de janelas que tem de FECHAR pra
   * essa abrir — vazia quando nada precisa sair, e nunca preenchida quando o
   * pedido e recusado.
   *
   * Devolver a lista em vez de fechar por conta propria: quem sabe esconder o
   * container e a cena, nao a pilha. A pilha nao conhece Phaser.
   */
  abrir(janela: JanelaDaUi): { ok: boolean; fechar: JanelaDaUi[] } {
    if (this.aberta(janela) || !this.podeAbrir(janela)) return { ok: false, fechar: [] };
    // troca de janela de conteudo: as duas competem pelas mesmas setas
    const fechar = EXCLUDENTES.has(CAMADA[janela])
      ? this.pilha.filter((j) => CAMADA[j] === CAMADA[janela])
      : [];
    this.pilha = this.pilha.filter((j) => !fechar.includes(j));
    this.pilha.push(janela);
    return { ok: true, fechar };
  }

  /** Solta o foco. Devolve false se a janela nao estava na pilha. */
  fechar(janela: JanelaDaUi): boolean {
    const antes = this.pilha.length;
    this.pilha = this.pilha.filter((j) => j !== janela);
    return this.pilha.length < antes;
  }

  /** Volta tudo pro jogo. Usada na troca de mapa, que reinicia a FarmScene. */
  limpar(): void {
    this.pilha = [];
  }
}

/** A camada de uma janela — exposta pra conferencia, nao pro jogo. */
export function camadaDaJanela(janela: JanelaDaUi): number {
  return CAMADA[janela];
}

export const JANELAS = Object.keys(CAMADA) as JanelaDaUi[];

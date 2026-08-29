import type Phaser from 'phaser';

/**
 * O que a moldura de janela entrega pro app. O app NAO conhece a cena do PC nem
 * a cena do mundo: ele so recebe uma area de desenho e um jeito de voltar.
 */
export interface ContextoApp {
  cena: Phaser.Scene;
  /** area util DENTRO da moldura, em pixels de tela */
  area: { x: number; y: number; w: number; h: number };
  /** fecha este app e volta pro desktop */
  voltar(): void;
}

/**
 * Um app do computador. Todos os sete implementam isto e todos abrem dentro da
 * MESMA moldura (`JanelaApp`) — e o que mantem a consistencia visual de sistema
 * operacional em vez de sete telas soltas.
 *
 * `montar` devolve os objetos criados; a moldura destroi todos ao fechar, entao
 * um app nao precisa de limpeza propria a menos que tenha registrado algo fora
 * da lista (timer, listener) — pra isso existe `aoFechar`.
 */
export interface AppDoPc {
  readonly id: string;
  /** vai no desktop e na barra de titulo da janela */
  readonly titulo: string;
  /** glifo do icone no desktop (1-2 caracteres) */
  readonly glifo: string;
  /** cor do ladrilho do icone no desktop */
  readonly cor: number;
  /** linha curta embaixo do icone; tambem serve de "o que este app faz" */
  readonly resumo: string;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[];
  /** roda a cada frame enquanto o app esta aberto */
  atualizar?(): void;
  /** devolve true se consumiu a tecla (a moldura entao nao trata) */
  aoTeclar?(evento: KeyboardEvent): boolean;
  /** desfaz o que `montar` criou FORA da lista devolvida */
  aoFechar?(): void;
}

export type Direcao = 'up' | 'down' | 'left' | 'right';

/** Classes de objeto usadas na camada `interativos` dos tilemaps do Tiled. */
export type TipoInteragivel = 'placa' | 'npc' | 'porta' | 'cama';

export type PropObjeto = string | number | boolean;

/** Um alvo de interacao ja resolvido a partir do objeto do Tiled. */
export interface Interagivel {
  id: string;
  tipo: TipoInteragivel;
  /** texto curto mostrado no prompt, ex: "Falar" -> "[E] Falar" */
  rotulo: string;
  /** centro do objeto, em pixels do mundo */
  x: number;
  y: number;
  props: Record<string, PropObjeto>;
}

/** O que a UI precisa saber da cena de mundo, sem depender da classe dela. */
export interface MundoJogavel {
  interagir(): void;
}

/** Um bloco de fala do dialogo. */
export interface Fala {
  nome: string;
  texto: string;
}

/** Atalho: varias falas seguidas do mesmo personagem. */
export function falasDe(nome: string, linhas: string[]): Fala[] {
  return linhas.map((texto) => ({ nome, texto }));
}

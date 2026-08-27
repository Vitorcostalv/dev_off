export type Direcao = 'up' | 'down' | 'left' | 'right';

/** Classes de objeto usadas na camada `interativos` dos tilemaps do Tiled. */
export type TipoInteragivel = 'placa' | 'npc' | 'porta' | 'cama' | 'item';

/** Classes de objeto usadas na camada `zonas` dos tilemaps do Tiled. */
export type TipoZona = 'casa' | 'mercado' | 'academia' | 'parque';

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

/**
 * Um lote do mapa, vindo da camada de objetos `zonas` do Tiled. A camada nao
 * tem tile nem colisao: e demarcacao. `construida` separa as duas situacoes —
 * lote ja com predio de pe (hoje so `casa_1`, a casinha inicial) e lote ainda
 * reservado, aguardando a etapa de construcao.
 */
export interface ZonaReservada {
  /** id do objeto no Tiled, ex: 'casa_1', 'mercado' */
  id: string;
  tipo: TipoZona;
  /** true = ja tem construcao no lote; false = reservado */
  construida: boolean;
  /** chave em MAPAS do interior, quando a construcao tem um (ex: 'casa') */
  mapaInterior: string | null;
  /** canto superior esquerdo, em pixels do mundo */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** centro em pixels — referencia pra encaixar o predio na proxima etapa */
  centro: { x: number; y: number };
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

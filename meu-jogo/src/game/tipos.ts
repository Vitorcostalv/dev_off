export type Direcao = 'up' | 'down' | 'left' | 'right';

/** Classes de objeto usadas na camada `interativos` dos tilemaps do Tiled. */
export type TipoInteragivel =
  | 'placa'
  | 'npc'
  | 'porta'
  | 'cama'
  | 'item'
  | 'loja'
  | 'computador'
  /** balcao da madeireira: abre a loja de EXPANSAO DE COMODO da casa */
  | 'expansao'
  /** bancada da oficina: abre o catalogo de MOBILIA da casa */
  | 'mobilia';

/** Classes de objeto usadas na camada `zonas` dos tilemaps do Tiled. */
export type TipoZona =
  // Mapa 1
  | 'casa'
  | 'mercado'
  | 'academia'
  | 'parque'
  | 'bar'
  | 'farmacia'
  // Mapa 2 — Bairro da Estacao
  | 'oficina'
  | 'escola'
  | 'biblioteca'
  | 'quadra'
  | 'terreno'
  | 'servico'
  // Mapa 3 — Zona Rural
  | 'madeireira'
  | 'pedreira'
  | 'fazenda';

/**
 * O que a construcao do lote É, independente de como ela se chama:
 *
 * - `moradia`  — casa pura: uma cama, um morador (casa_2..casa_6)
 * - `comercio` — salao puro: ninguem mora dentro (mercado, academia)
 * - `misto`    — casa + comercio no MESMO predio e no MESMO interior, sem
 *                parede interna: metade e a moradia do dono (com cama), metade
 *                e o espaco de trabalho (bar, farmacia)
 * - `praca`    — area externa, sem predio nem interior (parque, quadra)
 * - `vago`     — lote SEM interior ativo: ou nunca teve construcao (os lotes
 *                residenciais reservados do Mapa 2 e as areas ambientadas do
 *                Mapa 3), ou tem predio de pe com a porta fechada (a `casa_1`,
 *                desativada nesta leva, e a Central Telefonica). Nao recebe
 *                morador e nao entra em nenhuma conta de moradia.
 *
 * `moradia` e `misto` contam como moradia disponivel: e por isso que o bar e a
 * farmacia entram na mesma validacao de "um NPC por casa" das seis casas.
 */
export type UsoZona = 'moradia' | 'comercio' | 'misto' | 'praca' | 'vago';

/** Usos em que alguem mora — os lotes que podem receber um NPC morador. */
export const USOS_DE_MORADIA: readonly UsoZona[] = ['moradia', 'misto'];

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
 * lote ja com predio de pe e lote ainda reservado, aguardando construcao. Nos
 * mapas 2 e 3 a maioria dos lotes esta reservada de proposito: eles dao a
 * densidade visual do bairro sem exigir um interior mobiliado por lote.
 */
export interface ZonaReservada {
  /** id do objeto no Tiled, ex: 'casa_2', 'mercado', 'oficina' */
  id: string;
  tipo: TipoZona;
  /** o que a construcao e: moradia, comercio, misto (casa+comercio) ou praca */
  uso: UsoZona;
  /** true = alguem pode morar aqui (uso `moradia` ou `misto`) */
  moradia: boolean;
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
  /**
   * Id do NPC que fala, quando ha um. E o que liga a fala ao RETRATO na caixa
   * de dialogo (ver `UIScene.desenharRetrato`): o retrato sai da folha de pose
   * parada do proprio NPC, entao nao ha arte nova por personagem.
   *
   * Fica opcional porque nem toda fala tem dono — placa, item e aviso de
   * sistema falam sem rosto, e ai a caixa usa a largura toda pro texto.
   */
  npcId?: string;
}

/** Atalho: varias falas seguidas do mesmo personagem. */
export function falasDe(nome: string, linhas: string[], npcId?: string): Fala[] {
  return linhas.map((texto) => ({ nome, texto, npcId }));
}

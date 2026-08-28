export interface DefinicaoMapa {
  /** chave usada em `estado.mapa` e na propriedade `destino` das portas */
  chave: string;
  /** key do this.load.tilemapTiledJSON no BootScene */
  tilemapKey: string;
  /** caminho do JSON dentro de public/ */
  arquivo: string;
  /** nome do tileset DENTRO do JSON do Tiled */
  tilesetNoJson: string;
  /** key do this.load.image do PNG do tileset */
  tilesetKey: string;
  /**
   * Onde o player nasce quando ninguem diz de onde ele veio, em TILES.
   * A cena converte pra pixel com o tamanho de tile lido do tilemap, entao
   * mudar a resolucao do tile nao mexe aqui.
   */
  spawnTile: { x: number; y: number };
}

/** Todo mapa sai do mesmo gerador, entao key e arquivo derivam da chave. */
function mapa(chave: string, spawnTile: { x: number; y: number }): DefinicaoMapa {
  return {
    chave,
    tilemapKey: `${chave}-map`,
    arquivo: `assets/tilemaps/${chave}.json`,
    tilesetNoJson: 'terrain',
    tilesetKey: 'tiles-terrain',
    spawnTile,
  };
}

/**
 * Tile de entrada de todo interior: um acima da porta de saida.
 *
 * casa_1 e a unica que ainda usa o salao unico 16x12 do inicio do projeto (e
 * sistema proprio do protagonista). As outras cinco viraram plantas
 * multi-comodo, cada uma com tamanho e coluna de porta propria — os numeros
 * abaixo sao `{ porta, altura - 2 }` de `PLANTAS_CASA` em
 * tools/gerar-assets.mjs, que e a mesma conta de `entradaDoInterior` la.
 * `npm run verificar-mapas` compara os dois lados e reprova se divergirem.
 */
const ENTRADA_SALAO_UNICO = { x: 8, y: 10 };

export const MAPAS: Record<string, DefinicaoMapa> = {
  // externo: centro do mapa 120x90, em cima do cruzamento principal
  farm: mapa('farm', { x: 60, y: 45 }),

  // interiores das 6 casas
  casa_1: mapa('casa_1', ENTRADA_SALAO_UNICO),
  casa_2: mapa('casa_2', { x: 11, y: 16 }), // 22x18, corredor central
  casa_3: mapa('casa_3', { x: 11, y: 16 }), // 22x18, sala na frente
  casa_4: mapa('casa_4', { x: 5, y: 18 }), // 22x20, corredor horizontal
  casa_5: mapa('casa_5', { x: 5, y: 16 }), // 20x18, dividida ao meio
  casa_6: mapa('casa_6', { x: 10, y: 14 }), // 22x16, hall central

  // interiores de comercio: a porta de saida fica no meio da parede de baixo,
  // entao a entrada e um tile acima dela (o salao e mais largo que uma casa)
  mercado: mapa('mercado', { x: 11, y: 13 }),
  academia: mapa('academia', { x: 9, y: 10 }),

  // interiores MISTOS (casa + comercio no mesmo mapa, 20x14): a faixa oeste e a
  // moradia do dono, dividida em quarto/corredor/sala e fechada por uma porta
  // somente-NPC; a leste fica o salao, que e onde o jogador entra e circula.
  bar: mapa('bar', { x: 10, y: 12 }),
  farmacia: mapa('farmacia', { x: 10, y: 12 }),
};

export function buscarMapa(chave: unknown): DefinicaoMapa | null {
  return typeof chave === 'string' ? (MAPAS[chave] ?? null) : null;
}

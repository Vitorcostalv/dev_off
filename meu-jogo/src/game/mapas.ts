export interface DefinicaoMapa {
  /** chave usada em `estado.mapa` e na propriedade `destino` das portas */
  chave: string;
  /** key do this.load.tilemapTiledJSON no BootScene */
  tilemapKey: string;
  /** nome do tileset DENTRO do JSON do Tiled */
  tilesetNoJson: string;
  /** key do this.load.image do PNG do tileset */
  tilesetKey: string;
  /** onde o player nasce quando ninguem diz de onde ele veio */
  spawn: { x: number; y: number };
}

export const MAPAS: Record<string, DefinicaoMapa> = {
  farm: {
    chave: 'farm',
    tilemapKey: 'farm-map',
    tilesetNoJson: 'terrain',
    tilesetKey: 'tiles-terrain',
    spawn: { x: 320, y: 240 },
  },
  casa: {
    chave: 'casa',
    tilemapKey: 'casa-map',
    tilesetNoJson: 'terrain',
    tilesetKey: 'tiles-terrain',
    spawn: { x: 136, y: 168 },
  },
};

export function buscarMapa(chave: unknown): DefinicaoMapa | null {
  return typeof chave === 'string' ? (MAPAS[chave] ?? null) : null;
}

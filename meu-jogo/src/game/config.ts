import type { TipoInteragivel, TipoZona } from './tipos';

/** Numeros que valem a pena mexer sem cacar no meio do codigo. */
export const CONFIG = {
  /** resolucao base; o Scale.FIT cuida do resto */
  largura: 480,
  altura: 270,

  /** Velocidades do player em pixels por segundo. */
  movimento: {
    andar: 91,
    correr: 143,
  },

  // Distancias em TILES, nao em pixels: o mundo escala com o tamanho do tile
  // (a FarmScene multiplica pelo valor lido do tilemap).
  interacao: {
    /** alcance, em tiles */
    raio: 1.75,
    /** cosseno minimo entre "pra onde o player olha" e "onde esta o alvo" */
    cosseno: 0.35,
    /** abaixo disso o alvo vale mesmo estando de costas (voce esta em cima dele) */
    distanciaLivre: 0.56,
  },
} as const;

/** Verbo mostrado no prompt para cada classe de objeto. */
export const ROTULOS: Record<TipoInteragivel, string> = {
  placa: 'Ler',
  npc: 'Falar',
  porta: 'Entrar',
  cama: 'Dormir',
  item: 'Pegar',
};

/** Cor da demarcacao de cada tipo de zona reservada (overlay de debug, F6). */
export const COR_ZONA: Record<TipoZona, number> = {
  casa: 0x7fc9ff,
  mercado: 0xffd97d,
  academia: 0xff8f7f,
  parque: 0x9ee493,
  bar: 0xffa95c,
  farmacia: 0x7fe3d0,
};

/** Paleta/medidas da interface, pra HUD, dialogo e inventario ficarem coerentes. */
export const UI = {
  fonte: 'monospace',
  tamanho: '10px',
  tamanhoTitulo: '11px',
  texto: '#f4efe2',
  textoFraco: '#b9b0a0',
  destaque: '#ffd97d',
  fundo: 0x1a1712,
  fundoAlfa: 0.88,
  borda: 0x6b5f4c,
} as const;

import type { TipoInteragivel } from './tipos';

/** Numeros que valem a pena mexer sem cacar no meio do codigo. */
export const CONFIG = {
  /** resolucao base; o Scale.FIT cuida do resto */
  largura: 480,
  altura: 270,

  interacao: {
    /** alcance em pixels (o tile tem 16) */
    raio: 28,
    /** cosseno minimo entre "pra onde o player olha" e "onde esta o alvo" */
    cosseno: 0.35,
    /** abaixo disso o alvo vale mesmo estando de costas (voce esta em cima dele) */
    distanciaLivre: 9,
  },
} as const;

/** Verbo mostrado no prompt para cada classe de objeto. */
export const ROTULOS: Record<TipoInteragivel, string> = {
  placa: 'Ler',
  npc: 'Falar',
  porta: 'Entrar',
  cama: 'Dormir',
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

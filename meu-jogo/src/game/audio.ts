import { intensidadeNoturna } from './clima.ts';
import type { Clima } from './clima.ts';

/**
 * Catalogo e regras de som. Sem Phaser: o que decide QUAL som toca mora aqui e
 * roda em teste de nó; quem toca é `src/scenes/Som.ts`.
 *
 * Os arquivos de `public/assets/audio/` saem de `tools/gerar-audio.mjs`, e o
 * gerador recusa rodar se catalogo e receitas divergirem.
 */

/** Barramentos de mistura; cada um tem o proprio volume nas opcoes. */
export const BARRAMENTOS = ['efeitos', 'ambiente', 'musica', 'interface'] as const;
export type Barramento = typeof BARRAMENTOS[number];

export interface DefinicaoSom {
  barramento: Barramento;
  /** Ganho do som dentro do barramento (0-1). */
  volume: number;
  /** Ciclo continuo: ambientes e trilhas. */
  loop?: boolean;
  /** Variacao aleatoria de tom, em fracao. Evita repeticao mecanica. */
  variacao?: number;
  /** Segundos minimos entre duas execucoes do mesmo id. */
  intervalo?: number;
}

const efeito = (volume: number, variacao = 0.08, intervalo = 0.04): DefinicaoSom => ({ barramento: 'efeitos', volume, variacao, intervalo });
const ui = (volume: number): DefinicaoSom => ({ barramento: 'interface', volume, variacao: 0.03, intervalo: 0.03 });
const ambiente = (volume: number): DefinicaoSom => ({ barramento: 'ambiente', volume, loop: true });
const trilha = (volume: number): DefinicaoSom => ({ barramento: 'musica', volume, loop: true });

export const CATALOGO_AUDIO = {
  // interface
  ui_mover: ui(0.5),
  ui_confirmar: ui(0.6),
  ui_cancelar: ui(0.5),
  ui_erro: ui(0.55),
  ui_pagina: ui(0.45),

  // mundo
  passo_grama: efeito(0.35, 0.14, 0.1),
  passo_terra: efeito(0.35, 0.14, 0.1),
  passo_madeira: efeito(0.3, 0.14, 0.1),
  passo_concreto: efeito(0.3, 0.14, 0.1),
  passo_metal: efeito(0.3, 0.14, 0.1),
  porta: efeito(0.55, 0.06),
  gaveta: efeito(0.5),
  pegar: efeito(0.6),
  guardar: efeito(0.5),
  compra: efeito(0.65),
  dinheiro: efeito(0.6),
  dormir: efeito(0.6, 0.02),
  lanterna: efeito(0.5),
  elevador: efeito(0.6, 0.03),

  // combate
  golpe: efeito(0.5, 0.12),
  acerto: efeito(0.6, 0.1),
  tiro: efeito(0.7, 0.06),
  recarregar: efeito(0.55, 0.05),
  inimigo_dano: efeito(0.6, 0.12),
  inimigo_morte: efeito(0.65, 0.1),
  dano_jogador: efeito(0.75, 0.05),

  // progressao e computador
  conquista: efeito(0.7, 0),
  missao: efeito(0.6, 0),
  enigma_ok: efeito(0.6, 0.02),
  enigma_erro: efeito(0.55, 0.02),
  pc_ligar: efeito(0.5, 0.02),
  pc_tecla: ui(0.3),
  pc_app: ui(0.4),

  // ambientes
  amb_cidade: ambiente(0.5),
  amb_bairro: ambiente(0.45),
  amb_rural: ambiente(0.5),
  amb_interior: ambiente(0.4),
  amb_noite: ambiente(0.45),
  amb_chuva: ambiente(0.6),
  amb_vento: ambiente(0.5),
  amb_represa: ambiente(0.55),
  amb_represa_fundo: ambiente(0.6),

  // trilhas
  mus_titulo: trilha(0.55),
  mus_cidade: trilha(0.4),
  mus_bar: trilha(0.45),
  mus_represa: trilha(0.4),
} as const satisfies Record<string, DefinicaoSom>;

export type SomId = keyof typeof CATALOGO_AUDIO;
export const IDS_DE_AUDIO = Object.keys(CATALOGO_AUDIO) as SomId[];

/** Volume final de um som: ganho proprio x barramento x master. */
export function volumeFinal(id: SomId, volumes: Record<Barramento | 'master', number>): number {
  const def = CATALOGO_AUDIO[id];
  const limpo = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
  return limpo(def.volume) * limpo(volumes[def.barramento]) * limpo(volumes.master);
}

/** Superficies com passo proprio; o resto cai em grama. */
export const PISOS = {
  grama: 'passo_grama',
  terra: 'passo_terra',
  madeira: 'passo_madeira',
  concreto: 'passo_concreto',
  metal: 'passo_metal',
} as const satisfies Record<string, SomId>;
export type Piso = keyof typeof PISOS;

export function somDoPasso(piso: string | null | undefined): SomId {
  return (PISOS as Record<string, SomId>)[piso ?? ''] ?? 'passo_grama';
}

/**
 * Piso de um mapa quando o tile nao diz nada: interior de casa é madeira, loja
 * e rua são concreto, represa é metal, campo é terra.
 */
export function pisoDoMapa(mapa: string): Piso {
  if (mapa.startsWith('represa')) return 'metal';
  if (mapa.startsWith('casa') || mapa === 'oficina') return 'madeira';
  if (mapa === 'rural') return 'terra';
  if (mapa === 'farm' || mapa === 'bairro') return 'grama';
  return 'concreto';
}

export interface LugarSonoro {
  mapa: string;
  /** Minuto do dia (0-1439). */
  minuto: number;
  clima: Clima;
  externo: boolean;
  /** Andar da represa, quando estiver nela. */
  andar?: number | null;
}

const CHUVOSO: Clima[] = ['Chuva', 'Temporal'];

/**
 * Ambiente do lugar. A ordem importa: represa ignora clima e hora (lá dentro
 * nao existe nem tempo nem tempo), interior abafa o clima, e no aberto a chuva
 * vence o vento, que vence a noite.
 */
export function ambienteDoLugar(lugar: LugarSonoro): SomId {
  if (lugar.mapa.startsWith('represa')) {
    return (lugar.andar ?? 0) >= 26 ? 'amb_represa_fundo' : 'amb_represa';
  }
  if (!lugar.externo) return 'amb_interior';
  if (CHUVOSO.includes(lugar.clima)) return 'amb_chuva';
  if (lugar.clima === 'Vento') return 'amb_vento';
  if (intensidadeNoturna(lugar.minuto) > 0.5) return 'amb_noite';
  if (lugar.mapa === 'bairro') return 'amb_bairro';
  if (lugar.mapa === 'rural') return 'amb_rural';
  return 'amb_cidade';
}

/**
 * Trilha do lugar; `null` é silencio proposital. Musica constante cansa, então
 * casas e lojas ficam só com ambiente, e a cidade se cala de noite.
 */
export function trilhaDoLugar(lugar: LugarSonoro): SomId | null {
  if (lugar.mapa.startsWith('represa')) return 'mus_represa';
  if (lugar.mapa === 'bar') return 'mus_bar';
  if (!lugar.externo) return null;
  if (intensidadeNoturna(lugar.minuto) > 0.5) return null;
  return 'mus_cidade';
}

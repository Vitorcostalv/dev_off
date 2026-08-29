/**
 * Sistema de presentes para NPCs.
 *
 * Cada presente tem uma reação baseada no quanto o NPC gosta dele:
 * - amado: +1,5 pontos de relação
 * - gosta: +1,0 pontos
 * - neutro: 0 pontos (item consumido mas sem ganho de relação)
 * - não gosta: -1,0 pontos
 *
 * O jogador escolhe um item do inventário e o "dá" ao NPC. O item é consumido
 * (removido do inventário) e os pontos são aplicados. LIMITE: só o primeiro
 * presente do dia por NPC conta pontos — presentes adicionais no mesmo dia
 * consomem o item mas não pontua novamente.
 */

export type TierPresente = 'amado' | 'gosta' | 'neutro' | 'nao_gosta';

export interface PreferenciaNpc {
  /** Itens que o NPC ama. */
  amado: readonly string[];
  /** Itens que o NPC gosta. */
  gosta: readonly string[];
  /** Itens neutros (sem pontos, só consome). */
  neutro?: readonly string[];
  /** Itens que o NPC não gosta. */
  nao_gosta: readonly string[];
}

/**
 * Tabela de preferências por NPC.
 *
 * EDU (27 anos, dev remoto, inteligente, educado):
 *   Amado: café, eletrônicos simples/úteis
 *   Gosta: bebidas saudáveis, eletronicos
 *   Não gusta: alimentos muito doces
 *
 * MARI (24 anos, academia, disciplinada, competitiva):
 *   Amado: air fryer, cafeteira (energia/health)
 *   Gosta: bebidas, alimentos saudáveis
 *   Não gusta: doces em excesso
 *
 * JAQUELINE (36 anos, mercado, casada, fofoqueira):
 *   Amado: doces, itens de mercado (nostalgia)
 *   Gosta: bebidas, alimentos do dia a dia
 *   Não gusta: eletrônicos caros
 *
 * LETÍCIA (28 anos, observadora, sem emprego, criativa):
 *   Amado: camera, drone, eletrônicos de arte/fotografia
 *   Gosta: eletronicos simples, alimentos
 *   Não gusta: (pouco judging; aceita quase tudo)
 *
 * WENDEL (34 anos, farmacêutico, organizado, fechado):
 *   Amado: organizadores, eletrônicos úteis
 *   Gosta: medicinas (não tem no catálogo atual), ordenação
 *   Não gusta: caos, coisas frívolas
 *
 * ALICE (41 anos, bar, divertida, sarcástica):
 *   Amado: bebidas, itens de bar (caixa de som)
 *   Gosta: alimentos variados
 *   Não gusta: (aceita bem); clima do bar é: tudo serve
 */
export const PREFERENCIAS_NPCS: Record<string, PreferenciaNpc> = {
  // --- EDU ---
  edu: {
    amado: ['cafe', 'smartphone', 'power_bank', 'ssd', 'roteador'],
    gosta: ['suco_laranja', 'suco_uva', 'agua', 'notebook', 'pendrive', 'fone_bluetooth'],
    neutro: ['pao_frances', 'maca', 'banana'],
    nao_gosta: ['bolo_morango', 'barra_de_chocolate', 'sorvete', 'refrigerante'],
  },

  // --- MARI ---
  mari: {
    amado: ['air_fryer', 'cafeteira_expresso', 'notebook', 'smartwatch'],
    gosta: ['achocolatado', 'suco_laranja', 'iogurte', 'smartphone', 'headset'],
    neutro: ['ovos', 'frango', 'cereal'],
    nao_gosta: ['sorvete', 'bolo_morango', 'picole_chocolate', 'chips'],
  },

  // --- JAQUELINE ---
  jaqueline: {
    amado: ['fatia_bolo', 'cookies', 'barra_de_chocolate', 'croissant', 'rosquinha'],
    gosta: ['pao_frances', 'refrigerante', 'achocolatado', 'biscoito', 'tomate'],
    neutro: ['queijo_prato', 'salame', 'macarrao', 'arroz'],
    nao_gosta: ['notebook', 'tablet', 'drone', 'console_portatil'],
  },

  // --- LETÍCIA ---
  leticia: {
    amado: ['camera', 'drone', 'camera_de_acao', 'smartphone_azul', 'ring_light'],
    gosta: ['morango', 'uva', 'maca', 'suco_laranja', 'ssd'],
    neutro: ['pao_caseiro', 'alface', 'agua'],
    nao_gosta: [],
  },

  // --- WENDEL ---
  wendel: {
    amado: ['filtro_de_linha', 'power_bank', 'tomada_inteligente', 'assistente_de_voz_mini'],
    gosta: ['carregador', 'roteador', 'adaptador_de_tomada', 'ssd', 'organizador'],
    neutro: ['pao_frances', 'cafe', 'agua'],
    nao_gosta: ['sorvete', 'picole_chocolate', 'bolo_morango', 'chips'],
  },

  // --- ALICE ---
  alice: {
    amado: ['refrigerante', 'suco_uva', 'caixa_de_som', 'caixa_bluetooth', 'soundbar'],
    gosta: ['agua', 'achocolatado', 'suco_laranja', 'cookies', 'barra_de_chocolate'],
    neutro: ['pao_frances', 'cafe', 'queijo_prato'],
    nao_gosta: [],
  },

  // --- MORADOR_1 (placeholder) ---
  morador_1: {
    amado: ['cafe', 'pao_frances'],
    gosta: ['agua', 'maca', 'banana', 'smartphone'],
    neutro: ['biscoito', 'arroz'],
    nao_gosta: [],
  },
};

/**
 * Calcula o tier de um presente pra um NPC.
 * Retorna 'amado', 'gosta', 'neutro', ou 'nao_gosta'.
 */
export function calcularTierPresente(npcId: string, itemId: string): TierPresente {
  const prefs = PREFERENCIAS_NPCS[npcId];
  if (!prefs) return 'neutro';

  if (prefs.amado.includes(itemId)) return 'amado';
  if (prefs.gosta.includes(itemId)) return 'gosta';
  if (prefs.neutro?.includes(itemId)) return 'neutro';
  if (prefs.nao_gosta.includes(itemId)) return 'nao_gosta';

  // Default: neutro (item não está em nenhuma lista)
  return 'neutro';
}

/**
 * Pontos de relação ganhos por tier de presente.
 */
export const PONTOS_POR_TIER_PRESENTE: Record<TierPresente, number> = {
  amado: 1.5,
  gosta: 1.0,
  neutro: 0,
  nao_gosta: -1.0,
};

/**
 * Texto de reação do NPC ao receber um presente, por tier.
 * Cada NPC pode ter uma reação customizada, mas esses são os padrões.
 */
export const REACOES_PRESENTE: Record<TierPresente, Record<string, string[]>> = {
  amado: {
    default: [
      'Que bom! Obrigado!',
      'Adorei! Voce me conhece bem.',
      'Perfeito! Exatamente o que eu queria.',
      'Que presenca atenciosa!',
    ],
  },
  gosta: {
    default: [
      'Valeu, gostei!',
      'Bacana, obrigado.',
      'Que legal, thanks!',
      'Muito gentil da sua parte.',
    ],
  },
  neutro: {
    default: [
      'Ah, ok. Valeu.',
      'Interessante. Obrigado.',
      'Que gentileza.',
      'Tudo bem, valeu.',
    ],
  },
  nao_gosta: {
    default: [
      'Ah... obrigado, mas nao era bem isso.',
      'Ehhh... valeu a intencao.',
      'Bem, nao e muito meu estilo.',
      'Entendi a ideia, valeu.',
    ],
  },
};

/**
 * Retorna a reação padrão de um NPC ao receber um presente.
 * Usa uma aleatória da lista correspondente ao tier.
 */
export function escolherReacaoPresente(_npcId: string, tier: TierPresente): string {
  const reacoes = REACOES_PRESENTE[tier]?.default ?? REACOES_PRESENTE.neutro.default;
  return reacoes[Math.floor(Math.random() * reacoes.length)];
}

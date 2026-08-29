/**
 * Presentes para NPCs.
 *
 * O jogador escolhe um item do inventario e da pro NPC. O item e SEMPRE
 * consumido; o que varia e quanto de relacionamento ele rende:
 *
 *   amado      +1,5
 *   gosta      +1,0
 *   neutro      0
 *   nao_gosta  -1,0
 *
 * LIMITE DIARIO: so o PRIMEIRO presente do dia por NPC pontua. Os seguintes
 * consomem o item e rendem a reacao em texto, mas nao mexem no numero. A trava
 * mora em `SistemaRelacoes.podePresentear`, junto com a da conversa, porque ela
 * precisa ir pro save.
 *
 * ---------------------------------------------------------------------------
 * OS IDS SAO CONFERIDOS
 * ---------------------------------------------------------------------------
 * Toda id citada aqui precisa existir no `CATALOGO_ITENS`. Id escrita errada
 * nao quebra nada em jogo — ela so nunca casa, e o presente cai em `neutro` em
 * silencio, que e o pior tipo de bug: invisivel. `npm run verificar-relacoes`
 * cruza as duas listas e reprova qualquer id orfa.
 */

export type TierPresente = 'amado' | 'gosta' | 'neutro' | 'nao_gosta';

export interface PreferenciaNpc {
  amado: readonly string[];
  gosta: readonly string[];
  /** citados so pra documentar; item fora de todas as listas ja cai em neutro */
  neutro?: readonly string[];
  nao_gosta: readonly string[];
}

/** Pontos de relacao por tier. */
export const PONTOS_POR_TIER_PRESENTE: Record<TierPresente, number> = {
  amado: 1.5,
  gosta: 1.0,
  neutro: 0,
  nao_gosta: -1.0,
};

/**
 * Preferencia por NPC, montada a partir do perfil de cada personagem.
 *
 * Onde o perfil pede uma coisa que o catalogo nao tem, vale o mais proximo:
 *   - Mari pede "isotonico/suplemento": nao existe, entao entram as bebidas e
 *     os itens de energia/saude que existem (suco, iogurte, achocolatado) e o
 *     smartwatch, que e o objeto de treino do catalogo.
 *   - Wendel pede "organizador": nao existe como item, entao entram os
 *     eletronicos que ORGANIZAM (filtro de linha, tomada inteligente, hub).
 *   - Alice pede "item de bar": nao ha bebida alcoolica no catalogo, entao
 *     entram os refrigerantes e o som do bar (caixa, soundbar).
 */
export const PREFERENCIAS_NPCS: Record<string, PreferenciaNpc> = {
  // EDU — cafe e eletronico simples. Doce demais nao e com ele.
  edu: {
    amado: ['cafe', 'cafeteira', 'ssd', 'pendrive'],
    gosta: ['agua', 'suco_laranja', 'fone_bluetooth', 'roteador', 'power_bank', 'teclado'],
    neutro: ['pao_frances', 'maca', 'banana'],
    nao_gosta: ['bolo_morango', 'barra_de_chocolate', 'sorvete', 'picole_chocolate'],
  },

  // MARI — energia e disciplina. Guloseima e o oposto do que ela prega.
  mari: {
    amado: ['iogurte', 'suco_laranja', 'smartwatch', 'fone_esportivo'],
    gosta: ['agua', 'achocolatado', 'frango', 'ovos', 'cereal', 'headset'],
    neutro: ['arroz', 'macarrao', 'maca'],
    nao_gosta: ['sorvete', 'bolo_morango', 'picole_chocolate', 'chips', 'refrigerante'],
  },

  // JAQUELINE — doce e coisa de mercado. Eletronico caro ela acha exagero.
  jaqueline: {
    amado: ['fatia_bolo', 'cookies', 'barra_de_chocolate', 'croissant', 'rosquinha'],
    gosta: ['pao_frances', 'refrigerante', 'achocolatado', 'biscoito', 'muffin', 'torta'],
    neutro: ['queijo_prato', 'salame', 'macarrao', 'arroz'],
    nao_gosta: ['notebook', 'tablet', 'drone', 'console_portatil', 'notebook_gamer'],
  },

  // LETICIA — fotografia e arte. Nao tem item que ela recuse: ela nao julga.
  leticia: {
    amado: ['camera', 'camera_de_acao', 'ring_light', 'filmadora'],
    gosta: ['morango', 'uva', 'maca', 'suco_uva', 'cartao_sd', 'smartphone_azul'],
    neutro: ['pao_caseiro', 'alface', 'agua'],
    nao_gosta: [],
  },

  // WENDEL — o que organiza e o que e util. Frivolidade nao entra.
  wendel: {
    amado: ['filtro_de_linha', 'tomada_inteligente', 'hub_inteligente', 'power_bank'],
    gosta: ['carregador', 'carregador_de_parede', 'roteador', 'adaptador_de_tomada', 'pilhas', 'lampada_led'],
    neutro: ['pao_frances', 'cafe', 'agua'],
    nao_gosta: ['sorvete', 'picole_chocolate', 'bolo_morango', 'chips', 'console_retro'],
  },

  // ALICE — bebida e som de bar. Ela tambem nao recusa nada: e o bar dela.
  alice: {
    amado: ['refrigerante', 'refrigerante_limao', 'caixa_de_som', 'caixa_bluetooth', 'soundbar'],
    gosta: ['suco_uva', 'agua', 'cookies', 'barra_de_chocolate', 'radio_boombox', 'microfone'],
    neutro: ['pao_frances', 'cafe', 'queijo_prato'],
    nao_gosta: [],
  },

  // MORADOR_1 — placeholder sem perfil escrito.
  morador_1: {
    amado: ['cafe', 'pao_frances'],
    gosta: ['agua', 'maca', 'banana'],
    neutro: ['biscoito', 'arroz'],
    nao_gosta: [],
  },
};

/**
 * O tier de um item pra um NPC. Item fora de todas as listas — e NPC sem tabela
 * — cai em `neutro`: o presente e aceito, consome o item e nao rende ponto.
 */
export function calcularTierPresente(npcId: string, itemId: string): TierPresente {
  const prefs = PREFERENCIAS_NPCS[npcId];
  if (!prefs) return 'neutro';
  if (prefs.amado.includes(itemId)) return 'amado';
  if (prefs.gosta.includes(itemId)) return 'gosta';
  if (prefs.nao_gosta.includes(itemId)) return 'nao_gosta';
  return 'neutro';
}

/**
 * Reacao por NPC e por tier, na voz de cada um. O `padrao` cobre NPC sem texto
 * proprio (o morador placeholder, e qualquer NPC futuro antes de ganhar falas).
 */
const REACOES: Record<string, Record<TierPresente, string>> = {
  edu: {
    amado: 'Ah. Isso eu ia comprar essa semana. Serio, obrigado.',
    gosta: 'Boa. Vou usar.',
    neutro: 'Obrigado. Guardo aqui.',
    nao_gosta: 'Eu... obrigado. Nao sou muito de doce, mas obrigado.',
  },
  mari: {
    amado: 'ISSO! Voce presta atencao, hein. Valeu mesmo.',
    gosta: 'Boa escolha. Serve.',
    neutro: 'Valeu. Ta anotado.',
    nao_gosta: 'Isso ai eu nao como. Mas obrigada pela intencao, de verdade.',
  },
  jaqueline: {
    amado: 'AI que coisa! Voce nao devia... nao, devia sim. Amei!',
    gosta: 'Que gracinha, obrigada! Vou levar pro meu filho provar.',
    neutro: 'Obrigada, viu. Sempre bom.',
    nao_gosta: 'Meu bem, isso ai e caro demais pra mim. Mas obrigada.',
  },
  leticia: {
    amado: 'Nossa... eu queria mesmo. Obrigada, de verdade.',
    gosta: 'Que legal. Obrigada.',
    neutro: 'Obrigada. Que gentileza.',
    nao_gosta: 'Obrigada. Serve pra alguma coisa, com certeza.',
  },
  wendel: {
    amado: 'Isso e util. Muito util. Obrigado.',
    gosta: 'Bem pensado. Obrigado.',
    neutro: 'Obrigado. Vou guardar no lugar certo.',
    nao_gosta: 'Agradeco. Nao e o meu tipo de coisa, mas agradeco.',
  },
  alice: {
    amado: 'Olha so! Voce me conhece. Isso aqui fica no bar.',
    gosta: 'Boa, essa eu aceito.',
    neutro: 'Valeu, meu bem.',
    nao_gosta: 'Ta... obrigada. Voce tentou.',
  },
  padrao: {
    amado: 'Nossa, obrigado! Adorei.',
    gosta: 'Valeu, gostei.',
    neutro: 'Obrigado.',
    nao_gosta: 'Obrigado, mas nao era bem isso.',
  },
};

export function reacaoPresente(npcId: string, tier: TierPresente): string {
  return (REACOES[npcId] ?? REACOES.padrao)[tier];
}

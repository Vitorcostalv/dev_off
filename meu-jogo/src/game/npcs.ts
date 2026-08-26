/**
 * Catalogo de NPCs. A posicao vem do objeto `npc` no Tiled (propriedade
 * `npcId` apontando pra uma chave daqui), entao o mesmo NPC pode ser
 * reposicionado sem mexer em codigo.
 *
 * `dialogoAtual` e o que ele fala hoje — a ideia e trocar isso depois em
 * funcao de dia/hora/eventos, sem mudar o resto da estrutura.
 */
export interface DefinicaoNpc {
  id: string;
  nome: string;
  /** cor aplicada no spritesheet do player, ate ter arte propria */
  tint: number;
  dialogoAtual: string[];
}

export const NPCS: Record<string, DefinicaoNpc> = {
  morador_1: {
    id: 'morador_1',
    nome: 'Morador 1',
    tint: 0x8fb6ff,
    dialogoAtual: ['Oi.', 'Tudo certo por aqui.', 'Ate mais.'],
  },
};

export function buscarNpc(id: unknown): DefinicaoNpc | null {
  return typeof id === 'string' ? (NPCS[id] ?? null) : null;
}

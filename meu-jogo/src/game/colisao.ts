/**
 * Contrato de colisao dos tilemaps: quem e barrado por qual tile.
 *
 * O tileset gravado por `tools/gerar-assets.mjs` marca cada tile com estas duas
 * propriedades booleanas, e TODO consumidor (o jogo, a conferencia de mapas e a
 * de rotinas) le as mesmas. Sao dois "corpos de colisao" sobre a MESMA posicao,
 * escolhidos pelo tipo de entidade:
 *
 * - `collides`     — barra o JOGADOR. E o que a FarmScene passa pro
 *                    `setCollisionByProperty` da camada `objetos`, entao vale
 *                    pra andar e pra correr: nao ha como atravessar.
 * - `npcAtravessa` — o NPC IGNORA este tile. So aparece em tile que tambem tem
 *                    `collides`: e a porta somente-NPC, parede pro jogador e
 *                    passagem livre pra quem mora no predio.
 *
 * A consequencia pratica e que existem DUAS travessabilidades por mapa:
 *
 * - a do jogador  — `collides` bloqueia, ponto final (flood-fill do jogador);
 * - a do NPC      — `collides && !npcAtravessa` (flood-fill / validacao de rota).
 *
 * O motor de rotinas (src/game/rotinasNpc.ts) nao usa fisica: ele anda em reta
 * entre waypoints, entao a porta somente-NPC nao precisa de nenhum tratamento em
 * runtime — ela ja e transparente pra ele. O que a marca garante e que as
 * conferencias offline aprovem a rota que atravessa a porta e reprovem qualquer
 * caminho do jogador ate o outro lado.
 */

/** Propriedade de tile que barra o jogador. */
export const PROP_COLIDE = 'collides';

/** Propriedade de tile que o NPC ignora (porta somente-NPC). */
export const PROP_PORTA_NPC = 'npcAtravessa';

/** Quem esta tentando passar por um tile. */
export type Travessia = 'jogador' | 'npc';

/**
 * Le as propriedades de um tile (no formato do Tiled) e diz se ele barra a
 * entidade indicada. Serve tanto pro tileset embutido no JSON quanto pra
 * qualquer lista `[{ name, value }]`.
 */
export function tileBloqueia(
  propriedades: readonly { name: string; value: unknown }[],
  quem: Travessia,
): boolean {
  let colide = false;
  let portaNpc = false;
  for (const p of propriedades) {
    if (p.name === PROP_COLIDE && p.value === true) colide = true;
    if (p.name === PROP_PORTA_NPC && p.value === true) portaNpc = true;
  }
  return colide && !(quem === 'npc' && portaNpc);
}

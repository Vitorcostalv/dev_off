/**
 * Sistema de relacionamento com NPCs.
 *
 * Cada NPC tem um score de relacionamento que sai de -12 a 12, aumentando em
 * incrementos de 0.5. O score e persistido no save e usado pra calcular o
 * nivel de relacionamento (Estranho, Conhecido, Amigo, Namorando, Casamento).
 *
 * O sistema e puramente aditivo: ninguem escreve o score direto. So
 * ganharRelacao() e perderRelacao() alteram o numero. Isso garante que a
 * logica de cap/floor e override de label rode num lugar so.
 *
 * LABEL OVERRIDE: alguns NPCs tem rótulos diferentes nos níveis altos.
 * Jaqueline, por exemplo, e CASADA — o nivel 8 dela vira "Confiança profunda"
 * em vez de "Namorando", e o nivel 12 vira "Amizade de família" em vez de
 * "Casamento". Wendel e VIÚVO (mecanicamente disponível pra romance) mas sem
 * label especial — so a progressão de diálogo reflete a abertura emocional dele.
 */

/** Score em cada NPC: -12 a 12, em incrementos de 0.5. */
type ScoreRelacao = number;

/** Nivel de relacionamento derivado do score. */
export type NivelRelacao =
  | 'Estranho'
  | 'Conhecido'
  | 'Amigo'
  | 'Namorando'
  | 'Casamento'
  | 'Confiança profunda' // override de jaqueline em nivel 8
  | 'Amizade de família'; // override de jaqueline em nivel 12

/** Qual NPC tem qual label override num nível específico. */
interface OverrideLabelPorNpc {
  8?: NivelRelacao;
  12?: NivelRelacao;
}

const OVERRIDES_LABELS: Record<string, OverrideLabelPorNpc> = {
  jaqueline: {
    8: 'Confiança profunda',
    12: 'Amizade de família',
  },
  // wendel: viúvo mas sem override de label. diálogo reflete a abertura emocional.
};

/**
 * Converte um score de relacionamento pra um nível.
 * - < 0: Estranho
 * - 0 a 3.5: Conhecido
 * - 4 a 7.5: Amigo
 * - 8 a 11.5: Namorando (ou override do NPC)
 * - 12: Casamento (ou override do NPC)
 */
export function nivelDeScore(score: number): NivelRelacao {
  if (score < 0) return 'Estranho';
  if (score < 4) return 'Conhecido';
  if (score < 8) return 'Amigo';
  if (score < 12) return 'Namorando';
  return 'Casamento';
}

/**
 * Aplica o override de label se houver pra este NPC em seu nivel atual.
 */
export function labelRelacao(npcId: string, score: number): NivelRelacao {
  const nivel = nivelDeScore(score);
  const scoreInteiro = Math.round(score * 2) / 2; // round pra 0.5 termos
  const override = OVERRIDES_LABELS[npcId]?.[scoreInteiro as 8 | 12];
  return override ?? nivel;
}

export class SistemaRelacoes {
  /** Score por NPC. Ausentes = 0 (nunca falou com o NPC). */
  private scores: Map<string, ScoreRelacao> = new Map();

  /**
   * Score atual de um NPC. Retorna 0 se nunca conversou (não inicializado).
   */
  getScore(npcId: string): number {
    return this.scores.get(npcId) ?? 0;
  }

  /**
   * Nível de um NPC. Retorna 0 se nunca conversou.
   */
  getNivel(npcId: string): NivelRelacao {
    return labelRelacao(npcId, this.getScore(npcId));
  }

  /**
   * Adiciona pontos de relacionamento ao NPC.
   * - Incremento é 0.5
   * - Teto é 12
   * - Piso é -12
   */
  ganharRelacao(npcId: string, valor: number): void {
    const novoScore = Math.round((this.getScore(npcId) + valor) * 2) / 2; // arredonda pra 0.5
    this.scores.set(npcId, Math.max(-12, Math.min(12, novoScore)));
  }

  /**
   * Remove pontos de relacionamento (atalho pra `ganharRelacao` com valor negativo).
   */
  perderRelacao(npcId: string, valor: number): void {
    this.ganharRelacao(npcId, -valor);
  }

  /**
   * Retorna os NPCs com os quais o jogador JÁ conversou (score !== 0).
   * Usado pra listar no app de Relacionamento — não mostra quem nunca falou.
   */
  npcsBocaAberta(): string[] {
    return Array.from(this.scores.keys()).filter((id) => this.scores.get(id) !== 0);
  }

  /**
   * Dados por NPC, pra UI renderizar (relacionamento, barra, etc).
   */
  getDados(npcId: string): { score: number; nivel: NivelRelacao; label: string } {
    const score = this.getScore(npcId);
    const nivel = this.getNivel(npcId);
    return {
      score,
      nivel,
      label: labelRelacao(npcId, score),
    };
  }

  /**
   * Serializa pra save. Guarda como array de [id, score] pra poupar espaço.
   */
  serializar(): Array<[string, number]> {
    return Array.from(this.scores.entries());
  }

  /**
   * Restaura do save. Gracioso com dados estranhos: QUALQUER coisa invalida
   * em um NPC específico e pulada (aquele NPC volta a 0); as outras sao restauradas.
   */
  restaurar(bruto: unknown): void {
    this.scores.clear();
    if (!Array.isArray(bruto)) return;

    for (const entry of bruto) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [npcId, score] = entry;
      if (typeof npcId !== 'string' || typeof score !== 'number') continue;
      if (!Number.isSafeInteger(Math.round(score * 2))) continue; // não é múltiplo de 0.5
      const clamped = Math.max(-12, Math.min(12, score));
      this.scores.set(npcId, clamped);
    }
  }
}

/**
 * Nota de design: "Exclusividade" (só poder namorar um NPC) fica como comentário
 * aqui. Se o design futuro decidir implementá-la, seria um check no UI do
 * diálogo que reprova ganhar relação "Namorando" se outro NPC já tiver esse
 * nível. Não há bloqueio de dados aqui — tudo fica aberto.
 */

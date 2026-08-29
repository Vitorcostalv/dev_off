/**
 * Sistema de relacionamento com NPCs.
 *
 * Cada NPC tem um score que vai de -12 a 12, sempre em passos de 0,5. O score
 * e persistido no save e usado pra derivar o NIVEL (Estranho, Conhecido, Amigo,
 * Namorando, Casamento) e, a partir dele, o desconto no comercio do NPC.
 *
 * O sistema e puramente aditivo: ninguem escreve o score direto. So
 * `ganharRelacao()` e `perderRelacao()` alteram o numero — e as duas passam
 * pelo mesmo lugar, onde ficam o arredondamento pra 0,5, o piso e o teto.
 *
 * ---------------------------------------------------------------------------
 * ROTULO POR NPC
 * ---------------------------------------------------------------------------
 * Alguns NPCs nao podem receber o rotulo romantico. Jaqueline e CASADA: o tier
 * 8-11,5 dela le "Confianca profunda" e o 12 le "Amizade de familia", mesmo
 * pontuando exatamente igual aos outros. O override vale pro TIER INTEIRO, nao
 * so pro valor exato — 8,5 tambem e "Confianca profunda".
 *
 * Wendel e VIUVO: mecanicamente disponivel pra romance, sem override. Quem
 * reflete a personalidade fechada dele e o texto do dialogo, nao o rotulo.
 *
 * ---------------------------------------------------------------------------
 * LIMITE DIARIO
 * ---------------------------------------------------------------------------
 * Conversa e presente pontuam UMA VEZ POR DIA por NPC. A trava mora aqui
 * (`podeConversar` / `registrarConversa` e o par equivalente pra presente)
 * porque o dado precisa ir pro save junto com o score: sem isso, salvar e
 * recarregar zeraria a trava e o grind por spam voltaria.
 *
 * ---------------------------------------------------------------------------
 * "JA INTERAGIU" NAO E "SCORE != 0"
 * ---------------------------------------------------------------------------
 * Conversar sobre um tema neutro rende 0 ponto — e mesmo assim a conversa
 * aconteceu. Por isso existe o conjunto `interagidos`, separado do score: e ele
 * que a aba Relacionamento do Navegador usa pra decidir quem listar. Usar
 * `score !== 0` esconderia justamente quem o jogador conheceu e nao agradou.
 */

/** Score em cada NPC: -12 a 12, em incrementos de 0,5. */
type ScoreRelacao = number;

export const SCORE_MINIMO = -12;
export const SCORE_MAXIMO = 12;

/** Nivel de relacionamento derivado do score. */
export type NivelRelacao = 'Estranho' | 'Conhecido' | 'Amigo' | 'Namorando' | 'Casamento';

/** Rotulo mostrado ao jogador. Igual ao nivel, exceto onde ha override. */
export type RotuloRelacao = NivelRelacao | 'Confianca profunda' | 'Amizade de familia';

/** Override de rotulo por NPC, por NIVEL (nao por valor exato). */
const OVERRIDES_ROTULO: Record<string, Partial<Record<NivelRelacao, RotuloRelacao>>> = {
  jaqueline: {
    Namorando: 'Confianca profunda',
    Casamento: 'Amizade de familia',
  },
};

/**
 * Converte um score num nivel.
 * - < 0: Estranho
 * - 0 a 3,5: Conhecido
 * - 4 a 7,5: Amigo
 * - 8 a 11,5: Namorando
 * - 12: Casamento
 */
export function nivelDeScore(score: number): NivelRelacao {
  if (score < 0) return 'Estranho';
  if (score < 4) return 'Conhecido';
  if (score < 8) return 'Amigo';
  if (score < 12) return 'Namorando';
  return 'Casamento';
}

/** O nivel com o override do NPC aplicado, se houver. */
export function rotuloRelacao(npcId: string, score: number): RotuloRelacao {
  const nivel = nivelDeScore(score);
  return OVERRIDES_ROTULO[npcId]?.[nivel] ?? nivel;
}

/** Arredonda pro multiplo de 0,5 mais proximo e prende na faixa valida. */
function normalizar(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  const emMeios = Math.round(valor * 2) / 2;
  return Math.max(SCORE_MINIMO, Math.min(SCORE_MAXIMO, emMeios));
}

/** O formato que vai pro save. */
export interface DadosRelacoes {
  scores: Array<[string, number]>;
  interagidos: string[];
  /** ultimo dia em que a conversa de cada NPC pontuou */
  conversas: Array<[string, number]>;
  /** ultimo dia em que o presente de cada NPC pontuou */
  presentes: Array<[string, number]>;
}

export class SistemaRelacoes {
  /** Score por NPC. Ausente = 0. */
  private scores = new Map<string, ScoreRelacao>();
  /** Quem o jogador ja abordou pelo menos uma vez, independente de pontuar. */
  private interagidos = new Set<string>();
  /** npcId -> dia da ultima conversa que PONTUOU */
  private conversas = new Map<string, number>();
  /** npcId -> dia do ultimo presente que PONTUOU */
  private presentes = new Map<string, number>();

  getScore(npcId: string): number {
    return this.scores.get(npcId) ?? 0;
  }

  getNivel(npcId: string): NivelRelacao {
    return nivelDeScore(this.getScore(npcId));
  }

  /** O rotulo mostrado ao jogador (com override de NPC). */
  getRotulo(npcId: string): RotuloRelacao {
    return rotuloRelacao(npcId, this.getScore(npcId));
  }

  /**
   * Soma pontos ao NPC. Passo de 0,5, piso -12, teto 12. Registrar o NPC como
   * "interagido" faz parte: quem ganhou ponto obviamente foi abordado.
   */
  ganharRelacao(npcId: string, valor: number): void {
    if (!npcId) return;
    this.interagidos.add(npcId);
    this.scores.set(npcId, normalizar(this.getScore(npcId) + valor));
  }

  /** Atalho pra `ganharRelacao` com valor negativo. */
  perderRelacao(npcId: string, valor: number): void {
    this.ganharRelacao(npcId, -valor);
  }

  /**
   * Marca que o jogador abordou o NPC, sem mexer no score. E o que faz um NPC
   * aparecer na aba Relacionamento mesmo depois de uma conversa neutra.
   */
  registrarInteracao(npcId: string): void {
    if (npcId) this.interagidos.add(npcId);
  }

  jaInteragiu(npcId: string): boolean {
    return this.interagidos.has(npcId);
  }

  /** Todos os NPCs ja abordados, em ordem alfabetica de id (lista estavel). */
  listaInteragidos(): string[] {
    return [...this.interagidos].sort();
  }

  // ---------------------------------------------------------- limite diario --

  /** true se a conversa de hoje com este NPC ainda pode render ponto. */
  podeConversar(npcId: string, dia: number): boolean {
    return this.conversas.get(npcId) !== dia;
  }

  registrarConversa(npcId: string, dia: number): void {
    this.conversas.set(npcId, dia);
    this.interagidos.add(npcId);
  }

  /** true se o presente de hoje pra este NPC ainda pode render ponto. */
  podePresentear(npcId: string, dia: number): boolean {
    return this.presentes.get(npcId) !== dia;
  }

  registrarPresente(npcId: string, dia: number): void {
    this.presentes.set(npcId, dia);
    this.interagidos.add(npcId);
  }

  // ------------------------------------------------------------------ save --

  serializar(): DadosRelacoes {
    return {
      scores: [...this.scores.entries()],
      interagidos: [...this.interagidos],
      conversas: [...this.conversas.entries()],
      presentes: [...this.presentes.entries()],
    };
  }

  /**
   * Restaura do save. Gracioso com dado estranho: cada entrada invalida e
   * pulada sozinha, as validas entram. Save antigo (campo ausente) cai no
   * caminho de estado vazio, sem derrubar o resto do save.
   */
  restaurar(bruto: unknown): void {
    this.scores.clear();
    this.interagidos.clear();
    this.conversas.clear();
    this.presentes.clear();
    if (!bruto || typeof bruto !== 'object') return;

    // Compatibilidade: a primeira versao gravava so o array de [id, score].
    // Ele vira o campo `scores` e o resto (interagidos/limites) comeca vazio,
    // em vez de o save perder o relacionamento inteiro por mudanca de formato.
    const d: Partial<DadosRelacoes> = Array.isArray(bruto)
      ? { scores: bruto as Array<[string, number]> }
      : (bruto as Partial<DadosRelacoes>);

    for (const entrada of Array.isArray(d.scores) ? d.scores : []) {
      if (!Array.isArray(entrada) || entrada.length !== 2) continue;
      const [npcId, score] = entrada;
      if (typeof npcId !== 'string' || typeof score !== 'number') continue;
      if (!Number.isFinite(score)) continue;
      this.scores.set(npcId, normalizar(score));
      this.interagidos.add(npcId);
    }

    for (const npcId of Array.isArray(d.interagidos) ? d.interagidos : []) {
      if (typeof npcId === 'string') this.interagidos.add(npcId);
    }

    const restaurarDias = (bruta: unknown, destino: Map<string, number>): void => {
      for (const entrada of Array.isArray(bruta) ? bruta : []) {
        if (!Array.isArray(entrada) || entrada.length !== 2) continue;
        const [npcId, dia] = entrada;
        if (typeof npcId !== 'string' || !Number.isSafeInteger(dia)) continue;
        destino.set(npcId, dia);
      }
    };
    restaurarDias(d.conversas, this.conversas);
    restaurarDias(d.presentes, this.presentes);
  }
}

/**
 * Nota de design — EXCLUSIVIDADE.
 *
 * Nao ha trava de "so pode namorar um": nada aqui impede dois NPCs em
 * "Namorando" ao mesmo tempo. Se um dia o design pedir exclusividade, o lugar
 * e este arquivo (um check dentro de `ganharRelacao` recusando subir pro tier
 * romantico quando outro NPC ja esta nele), NAO a UI — senao cada tela que
 * pontua precisaria repetir a regra. Fica fora de proposito nesta etapa.
 */

/**
 * Memoria generica da cidade. Toda escrita de flag passa por esta classe para
 * o save nunca depender de Maps/Sets ou de mutacao espalhada pelas cenas.
 * Valores simples alem de boolean tambem sao aceitos para eventos futuros.
 */
export type ValorWorldEvent = boolean | string | number;

export interface DadosWorldEvents {
  flags: Record<string, ValorWorldEvent>;
  falasVistas: string[];
}

interface FalaCondicional {
  id: string;
  flag: string;
  npcs: Record<string, string>;
}

/**
 * COMO EXPANDIR:
 * 1. No ponto em que algo acontecer, chame `estado.worldEvents.definir('minhaFlag', true)`.
 * 2. Acrescente abaixo uma entrada com id unico, a mesma `flag` e uma fala por
 *    NPC. O motor a mostra uma vez, antes do menu normal, e persiste que foi vista.
 */
const FALAS_CONDICIONAIS: readonly FalaCondicional[] = [
  {
    id: 'comentario_primeiro_conserto',
    flag: 'protagonistaConsertouAlgo',
    npcs: {
      jaqueline: 'Fiquei sabendo que voce ja esta pegando conserto pela cidade. Noticia corre rapido por aqui.',
      alice: 'Entao voce conserta coisas de verdade. Eu tinha apostado que era so pose de oficina.',
    },
  },
  {
    id: 'reacao_missao_caixa_jaqueline',
    flag: 'missaoJaquelineCaixaConcluida',
    npcs: {
      jaqueline: 'Olha... o caixa ficou melhor que antes. Nao espalha que eu fiquei impressionada. Quer dizer, pode espalhar um pouquinho.',
    },
  },
  {
    id: 'reacao_missao_hd_wendel',
    flag: 'missaoWendelHdConcluida',
    npcs: {
      wendel: 'As fotos e os videos voltaram. Uma pasta nao. Eu nao pedi tudo. Ja e mais do que eu tinha ontem.',
    },
  },
  {
    id: 'reacao_missao_vitrola_alice',
    flag: 'missaoAliceVitrolaConcluida',
    npcs: {
      alice: 'A vitrola voltou a tocar. Wendel vai fingir que nao sentiu falta; eu conheco aquele movel de farmacia.',
    },
  },
];

export class SistemaWorldEvents {
  private flags: Record<string, ValorWorldEvent> = {};
  private falasVistas = new Set<string>();

  definir(chave: string, valor: ValorWorldEvent): void {
    if (chave) this.flags[chave] = valor;
  }

  obter(chave: string): ValorWorldEvent | undefined {
    return this.flags[chave];
  }

  ativa(chave: string): boolean {
    return this.flags[chave] === true;
  }

  /** Devolve e consome a primeira fala pendente para o NPC. */
  consumirFala(npcId: string): { id: string; texto: string } | null {
    const fala = FALAS_CONDICIONAIS.find(
      (c) => this.ativa(c.flag) && !this.falasVistas.has(c.id) && Boolean(c.npcs[npcId]),
    );
    if (!fala) return null;
    this.falasVistas.add(fala.id);
    return { id: fala.id, texto: fala.npcs[npcId] };
  }

  serializar(): DadosWorldEvents {
    return { flags: { ...this.flags }, falasVistas: [...this.falasVistas] };
  }

  restaurar(bruto: unknown): void {
    this.flags = {};
    this.falasVistas = new Set();
    if (!bruto || typeof bruto !== 'object') return;
    const dados = bruto as Partial<DadosWorldEvents>;
    if (dados.flags && typeof dados.flags === 'object') {
      for (const [chave, valor] of Object.entries(dados.flags)) {
        if (typeof valor === 'boolean' || typeof valor === 'string' || typeof valor === 'number') {
          this.flags[chave] = valor;
        }
      }
    }
    for (const id of Array.isArray(dados.falasVistas) ? dados.falasVistas : []) {
      if (typeof id === 'string') this.falasVistas.add(id);
    }
  }
}

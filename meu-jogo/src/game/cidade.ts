import type { AtividadeMorador, Morador } from './moradores.ts';

export type IdProjetoCidade = 'cafeteria' | 'hospital' | 'padaria' | 'ponto_onibus';

export interface ProjetoCidade {
  id: IdProjetoCidade;
  nome: string;
  lote: string;
  mapa: 'bairro';
  quadro: string;
  custo: number;
  candidatos: readonly string[];
  posto: { x: number; y: number };
  pegada: { w: number; h: number };
  atividade: string;
}

/**
 * Projetos ocupam apenas lotes que ja estavam vagos no Mapa 2. A represa e o
 * corredor reservado para o Mapa 4 nao participam deste sistema.
 */
export const PROJETOS_CIDADE: Record<IdProjetoCidade, ProjetoCidade> = {
  cafeteria: {
    id: 'cafeteria', nome: 'Cafeteria da Estacao', lote: 'terreno_baldio', mapa: 'bairro',
    quadro: 'projeto_cafeteria', custo: 8_000, candidatos: ['lucia', 'samanta', 'tulio'],
    posto: { x: 113, y: 66 }, pegada: { w: 7, h: 4 }, atividade: 'turno na cafeteria',
  },
  hospital: {
    id: 'hospital', nome: 'Posto de Saude', lote: 'casa_c3', mapa: 'bairro',
    quadro: 'projeto_hospital', custo: 15_000, candidatos: ['rafael', 'priscila', 'ilda'],
    posto: { x: 99, y: 39 }, pegada: { w: 6, h: 4 }, atividade: 'atendimento no posto de saude',
  },
  padaria: {
    id: 'padaria', nome: 'Padaria do Bairro', lote: 'casa_b8', mapa: 'bairro',
    quadro: 'projeto_padaria', custo: 9_000, candidatos: ['davi', 'neide', 'joao'],
    posto: { x: 128, y: 69 }, pegada: { w: 6, h: 4 }, atividade: 'turno na padaria',
  },
  ponto_onibus: {
    id: 'ponto_onibus', nome: 'Ponto de Onibus', lote: 'casa_c4', mapa: 'bairro',
    quadro: 'projeto_ponto_onibus', custo: 4_000, candidatos: ['julia', 'matheus', 'tulio'],
    posto: { x: 111, y: 39 }, pegada: { w: 5, h: 2 }, atividade: 'operacao da linha de onibus',
  },
};

export interface DadosCidade {
  construidos: IdProjetoCidade[];
  funcionarios: [IdProjetoCidade, string][];
}

/** Única fonte dos horários anunciados e simulados dos empregos urbanos. */
export const TURNO_CIDADE = { inicio: 8 * 60, fim: 17 * 60, dias: [0, 1, 2, 3, 4] as readonly number[] };
export const HORARIO_EMPREGO = `${String(TURNO_CIDADE.inicio / 60).padStart(2, '0')}:00 as ${String(TURNO_CIDADE.fim / 60).padStart(2, '0')}:00`;

export function turnoDoFuncionario(cidade: SistemaCidade, npcId: string, dia: number): AtividadeMorador | null {
  const projeto = cidade.projetoDoFuncionario(npcId);
  if (!projeto || !TURNO_CIDADE.dias.includes(dia % 7)) return null;
  return {
    inicio: TURNO_CIDADE.inicio, fim: TURNO_CIDADE.fim,
    lugar: { construcao: null, mapa: projeto.mapa, ponto: { x: projeto.posto.x + 0.5, y: projeto.posto.y + 0.5 } },
    atividade: projeto.atividade,
  };
}

export class SistemaCidade {
  private construidos = new Set<IdProjetoCidade>();
  private funcionarios = new Map<IdProjetoCidade, string>();

  construido(id: IdProjetoCidade): boolean {
    return this.construidos.has(id);
  }

  funcionario(id: IdProjetoCidade): string | null {
    return this.funcionarios.get(id) ?? null;
  }

  projetoDoFuncionario(npcId: string): ProjetoCidade | null {
    for (const [id, funcionario] of this.funcionarios) {
      if (funcionario === npcId && this.construido(id)) return PROJETOS_CIDADE[id];
    }
    return null;
  }

  construir(id: IdProjetoCidade): boolean {
    if (!PROJETOS_CIDADE[id] || this.construidos.has(id)) return false;
    this.construidos.add(id);
    return true;
  }

  atribuir(id: IdProjetoCidade, npcId: string): boolean {
    const projeto = PROJETOS_CIDADE[id];
    if (!projeto || !this.construido(id) || !projeto.candidatos.includes(npcId)) return false;
    for (const [outro, funcionario] of this.funcionarios) {
      if (outro !== id && funcionario === npcId) return false;
    }
    this.funcionarios.set(id, npcId);
    return true;
  }

  serializar(): DadosCidade {
    return { construidos: [...this.construidos], funcionarios: [...this.funcionarios] };
  }

  restaurar(bruto: unknown): void {
    this.construidos.clear();
    this.funcionarios.clear();
    if (!bruto || typeof bruto !== 'object') return;
    const dados = bruto as Partial<DadosCidade>;
    for (const id of Array.isArray(dados.construidos) ? dados.construidos : []) {
      if (typeof id === 'string' && Object.hasOwn(PROJETOS_CIDADE, id)) this.construidos.add(id as IdProjetoCidade);
    }
    for (const entrada of Array.isArray(dados.funcionarios) ? dados.funcionarios : []) {
      if (!Array.isArray(entrada) || entrada.length !== 2) continue;
      const [id, npcId] = entrada;
      if (typeof id === 'string' && typeof npcId === 'string') this.atribuir(id as IdProjetoCidade, npcId);
    }
  }
}

/**
 * O emprego construido substitui a agenda util entre 8h e 17h.
 *
 * O posto de um projeto urbano fica AO AR LIVRE, no lote da obra, entao o lugar
 * devolvido tem `construcao: null`. Isso mantem a regra de um bloco ao ar livre
 * por dia: o turno do emprego ocupa a mesma faixa que a atividade que ele
 * substitui, e as pontas do dia continuam sendo casa.
 *
 * Quem consulta isto e o TEXTO (o que o morador responde quando perguntado) e a
 * substituicao de rotina do dia, em `rotinaDoEmpregoDaCidade`.
 */
export function atividadeComEmprego(
  cidade: SistemaCidade,
  morador: Morador,
  dia: number,
  minutos: number,
  atividadePadrao: AtividadeMorador | null,
): AtividadeMorador | null {
  const turno = turnoDoFuncionario(cidade, morador.id, dia);
  return turno && minutos >= turno.inicio && minutos < turno.fim ? turno : atividadePadrao;
}

/**
 * Agenda do dia com o emprego da obra no lugar do compromisso do meio.
 *
 * A rotina de um NPC e montada UMA vez por dia, na virada (ver
 * `SistemaRotinasNpc.reiniciar`), entao atribuir alguem a uma obra vale a
 * partir do dia seguinte — e o que o dialogo da prefeitura avisa. Trocar a
 * rotina no meio do dia significaria reiniciar o dia do NPC, mandando ele de
 * volta pro ponto inicial na frente do jogador.
 */
export function atividadesComEmprego(
  cidade: SistemaCidade,
  morador: Morador,
  dia: number,
): AtividadeMorador[] | null {
  const turno = turnoDoFuncionario(cidade, morador.id, dia);
  if (!turno) return null;
  const uteis = morador.atividades.filter((faixa) => !faixa.fimDeSemana);
  const foraDoTurno = uteis.flatMap((faixa) => {
    const partes: AtividadeMorador[] = [];
    if (faixa.inicio < turno.inicio) partes.push({ ...faixa, fim: Math.min(faixa.fim, turno.inicio) });
    if (faixa.fim > turno.fim) partes.push({ ...faixa, inicio: Math.max(faixa.inicio, turno.fim) });
    return partes;
  });
  return [...foraDoTurno, turno].sort((a, b) => a.inicio - b.inicio);
}

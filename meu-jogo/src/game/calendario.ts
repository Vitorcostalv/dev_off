/** Dia 0 do jogo e uma segunda-feira. */
export const DIAS_DA_SEMANA = [
  'Segunda-feira',
  'Terca-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sabado',
  'Domingo',
] as const;

/** Indice de `DIAS_DA_SEMANA`: 0 = segunda, 6 = domingo. */
export type IndiceDiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Dia da semana de um dia absoluto. Funciona pra dia negativo tambem (o `%` de
 * JS devolve resto com sinal), o que importa porque o save guarda `dia` cru.
 */
export function diaDaSemana(dia: number): IndiceDiaDaSemana {
  return (((dia % 7) + 7) % 7) as IndiceDiaDaSemana;
}

/** Nomes por indice, pra rotina semanal ficar legivel na definicao do NPC. */
export const DIA_DA_SEMANA = {
  segunda: 0,
  terca: 1,
  quarta: 2,
  quinta: 3,
  sexta: 4,
  sabado: 5,
  domingo: 6,
} as const satisfies Record<string, IndiceDiaDaSemana>;

export function nomeDoDia(dia: number): string {
  return DIAS_DA_SEMANA[diaDaSemana(dia)];
}

export const ESTACOES = ['Primavera', 'Verao', 'Outono', 'Inverno'] as const;
export const DIAS_POR_ESTACAO = 28;
export function dataDoDia(dia: number, duracao = DIAS_POR_ESTACAO) {
  if (!Number.isSafeInteger(dia) || dia < 0 || !Number.isSafeInteger(duracao) || duracao < 1) throw new Error('Calendario invalido');
  const estacao = Math.floor(dia / duracao) % 4;
  return { diaAbsoluto: dia, diaSemana: diaDaSemana(dia), diaEstacao: dia % duracao + 1, estacao, nomeEstacao: ESTACOES[estacao], ano: Math.floor(dia / (duracao * 4)) + 1 };
}

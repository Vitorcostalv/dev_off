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

export function nomeDoDia(dia: number): string {
  const i = ((dia % 7) + 7) % 7;
  return DIAS_DA_SEMANA[i];
}

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

// ---------------------------------------------------------------- calendario --
/**
 * O CALENDARIO COMPLETO — dia, mes e ano.
 *
 * O jogo sempre contou `estado.dia`, um inteiro que comeca em 0 e so cresce, e
 * o dia da semana saia de `dia % 7`. Isso continua exatamente como estava: o
 * calendario e uma LEITURA de `dia`, nao um segundo contador.
 *
 * A consequencia pratica e que nao ha migracao de save. Um jogo salvo no dia 137
 * abre no dia 137 e ganha uma data de verdade sem nada ter sido gravado a mais —
 * e mudar a data inicial mudaria a data de todo save antigo junto, que e o
 * comportamento certo pra uma leitura derivada.
 */

/**
 * A data do DIA 0. Segunda-feira, 1 de setembro de 2025.
 *
 * Segunda-feira porque `diaDaSemana(0)` ja devolvia 0 (segunda) desde a primeira
 * versao do relogio, e trocar isso quebraria toda rotina de NPC escrita por dia
 * da semana. Setembro porque a mudanca do protagonista pra cidade acontece no
 * fim do inverno, e os 200 dias do prontuario terminam no comeco do outono
 * seguinte.
 */
export const DIA_ZERO = { dia: 1, mes: 9, ano: 2025 } as const;

export const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

/** Abreviacao de tres letras, pro cartao compacto da HUD. */
export const MES_CURTO = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

/** Regra gregoriana completa: 2000 e bissexto, 1900 nao e. */
export function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** Dias de um mes (1 a 12) num ano. */
export function diasDoMes(mes: number, ano: number): number {
  if (mes === 2) return ehBissexto(ano) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1] ?? 30;
}

export interface DataDoJogo {
  /** dia do mes, 1 a 31 */
  dia: number;
  /** mes, 1 a 12 */
  mes: number;
  ano: number;
  /** 0 = segunda, 6 = domingo */
  diaDaSemana: IndiceDiaDaSemana;
}

/**
 * A data de um dia absoluto.
 *
 * Anda mes a mes a partir do DIA ZERO em vez de fazer conta juliana. E mais
 * lento e e irrelevante: sao poucas centenas de iteracoes num jogo de anos, e
 * assim a virada de mes, a de ano e o 29 de fevereiro caem todas na MESMA
 * regra (`diasDoMes`), sem uma segunda formula que possa divergir dela.
 *
 * Dia NEGATIVO funciona: o save guarda `dia` cru, e o atalho de debug F7 pode
 * empurrar o relogio pra tras.
 */
export function dataDoDia(diaAbsoluto: number): DataDoJogo {
  let dia: number = DIA_ZERO.dia;
  let mes: number = DIA_ZERO.mes;
  let ano: number = DIA_ZERO.ano;
  let restante = Math.trunc(Number.isFinite(diaAbsoluto) ? diaAbsoluto : 0);

  while (restante > 0) {
    const noMes = diasDoMes(mes, ano);
    const cabe = Math.min(restante, noMes - dia);
    dia += cabe;
    restante -= cabe;
    if (restante > 0) {
      restante -= 1;
      dia = 1;
      mes += 1;
      if (mes > 12) {
        mes = 1;
        ano += 1;
      }
    }
  }
  while (restante < 0) {
    const cabe = Math.min(-restante, dia - 1);
    dia -= cabe;
    restante += cabe;
    if (restante < 0) {
      restante += 1;
      mes -= 1;
      if (mes < 1) {
        mes = 12;
        ano -= 1;
      }
      dia = diasDoMes(mes, ano);
    }
  }
  return { dia, mes, ano, diaDaSemana: diaDaSemana(diaAbsoluto) };
}

/** O inverso de `dataDoDia`, usado pela conferencia pra fechar o ciclo. */
export function diaAbsolutoDe(data: { dia: number; mes: number; ano: number }): number {
  let n = 0;
  let dia: number = DIA_ZERO.dia;
  let mes: number = DIA_ZERO.mes;
  let ano: number = DIA_ZERO.ano;
  const antes = (a: number, b: number, c: number): boolean =>
    ano < a || (ano === a && (mes < b || (mes === b && dia < c)));
  while (antes(data.ano, data.mes, data.dia)) {
    dia += 1;
    if (dia > diasDoMes(mes, ano)) {
      dia = 1;
      mes += 1;
      if (mes > 12) {
        mes = 1;
        ano += 1;
      }
    }
    n += 1;
  }
  return n;
}

/** "Sabado, 14 de Marco" — o formato longo, pro calendario e pro save. */
export function formatarData(diaAbsoluto: number): string {
  const d = dataDoDia(diaAbsoluto);
  return `${DIAS_DA_SEMANA[d.diaDaSemana]}, ${d.dia} de ${MESES[d.mes - 1]}`;
}

/** "Sab. 14 Mar." — o formato curto, pro cartao da HUD. */
export function formatarDataCurta(diaAbsoluto: number): string {
  const d = dataDoDia(diaAbsoluto);
  return `${DIAS_DA_SEMANA[d.diaDaSemana].slice(0, 3)}. ${d.dia} ${MES_CURTO[d.mes - 1]}.`;
}

/** "14 de Marco de 2026" — com o ano, que a HUD nao mostra. */
export function formatarDataCompleta(diaAbsoluto: number): string {
  const d = dataDoDia(diaAbsoluto);
  return `${d.dia} de ${MESES[d.mes - 1]} de ${d.ano}`;
}

/**
 * ESTACAO do ano no hemisferio SUL, que e onde a cidade fica.
 *
 * Serve ao clima (chove muito mais no verao) e ao texto de ambientacao. A
 * divisao e por mes e nao por solsticio: a diferenca de vinte dias nao muda
 * nada em jogo e a regra por mes cabe numa linha.
 */
export type Estacao = 'verao' | 'outono' | 'inverno' | 'primavera';

export function estacaoDoDia(diaAbsoluto: number): Estacao {
  const mes = dataDoDia(diaAbsoluto).mes;
  if (mes === 12 || mes <= 2) return 'verao';
  if (mes <= 5) return 'outono';
  if (mes <= 8) return 'inverno';
  return 'primavera';
}

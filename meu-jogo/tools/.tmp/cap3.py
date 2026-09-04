# -*- coding: utf-8 -*-
import io
p='src/game/andares.ts'; s=io.open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)

# ------------------------------------------------------------- totais --
rep("""/** Andares totais. Cinquenta nesta fase; abaixo do 50 fica pra depois. */
export const ANDARES_TOTAIS = 50;""",
"""/** Andares totais. Cento e cinquenta nesta fase; do 151 pra baixo fica pra depois. */
export const ANDARES_TOTAIS = 150;

/** Ultimo andar dos cinco setores autorais — a fronteira que nao se mexe. */
export const ULTIMO_ANDAR_DESENHADO = 5;""")

# ---------------------------------------------------------- escuridao --
rep("""export function escuridaoDoAndar(andar: number): number {
  if (andar <= 1) return 0;
  return +Math.min(0.86, 0.12 + (andar - 2) * 0.0155).toFixed(4);
}""",
"""const ESCURIDAO_DO_ANDAR_50 = 0.86;
/** O teto: preto puro apaga a arte, e o andar 150 tem de continuar jogavel. */
const ESCURIDAO_MAXIMA = 0.93;

export function escuridaoDoAndar(andar: number): number {
  if (andar <= 1) return 0;
  if (andar <= 50) {
    return +Math.min(ESCURIDAO_DO_ANDAR_50, 0.12 + (andar - 2) * 0.0155).toFixed(4);
  }
  // Do 51 ao 150 a curva CONTINUA de onde o andar 50 parou, e nao recomeca.
  //
  // O plano sugeria 0,60 a 0,68 pro capitulo 6, e esses valores sao mais CLAROS
  // que o andar 50 (0,86): adotados ao pe da letra, a usina clarearia ao ficar
  // mais funda, que e o contrario do que o proprio plano pede. O que se manteve
  // foi a intencao — escurecer ate cerca de 0,93 no fim — num degrau por andar
  // pequeno o bastante pra ninguem ver o corte entre capitulos.
  const passo = (ESCURIDAO_MAXIMA - ESCURIDAO_DO_ANDAR_50) / (ANDARES_TOTAIS - 50);
  return +Math.min(ESCURIDAO_MAXIMA, ESCURIDAO_DO_ANDAR_50 + (andar - 50) * passo).toFixed(4);
}

/**
 * FRACAO DAS LUMINARIAS DO ANDAR QUE TEM ENERGIA (Parte 21).
 *
 * Sai do capitulo, com um degrau dentro dele: o ultimo andar de um capitulo e
 * sempre mais apagado que o primeiro, entao a queda de energia se sente na
 * descida e nao so na troca de capitulo.
 */
export function luzesAcesasDoAndar(andar: number): number {
  const cap = capituloDoAndar(andar);
  const posicao = (andar - cap.faixa[0]) / 9; // 0 a 1 dentro do capitulo
  return +Math.max(0.05, cap.luzes * (1 - 0.25 * posicao)).toFixed(3);
}""")

# ----------------------------------------------------------- inimigos --
rep("""export function inimigosDoAndar(andar: number): number {
  if (andar <= 2) return 0; // os dois primeiros sao zona segura
  return Math.min(7, 1 + Math.floor((andar - 3) / 7));
}""",
"""export function inimigosDoAndar(andar: number): number {
  if (andar <= 2) return 0; // os dois primeiros sao zona segura
  if (andar <= 50) return Math.min(7, 1 + Math.floor((andar - 3) / 7));
  // Abaixo do 50 a conta muda de eixo: a quantidade fica onde estava (oito
  // maquinas pesadas num corredor escuro nao e dificuldade, e parede) e o que
  // cresce e a MISTURA, em `faunaDoAndar`. O teto sobe de 7 pra 9 so no
  // capitulo da infancia, onde a diversidade e o ponto.
  return andar <= 100 ? 7 : Math.min(9, 7 + Math.floor((andar - 101) / 25));
}""")

# -------------------------------------------------------------- fauna --
rep("""export function faunaDoAndar(andar: number): { tipo: string; peso: number }[] {
  const cap = capituloDoAndar(andar);
  const posicao = andar - cap.faixa[0]; // 0 a 9
  const tabela: { tipo: string; peso: number }[] = [{ tipo: cap.fauna.primaria, peso: 10 }];
  if (cap.fauna.secundaria && posicao >= 4) {
    tabela.push({ tipo: cap.fauna.secundaria, peso: posicao >= 7 ? 6 : 3 });
  }
  if (cap.fauna.rara && posicao >= 7) tabela.push({ tipo: cap.fauna.rara, peso: 2 });
  return tabela;
}""",
"""export function faunaDoAndar(andar: number): { tipo: string; peso: number }[] {
  const cap = capituloDoAndar(andar);
  const posicao = andar - cap.faixa[0]; // 0 a 9
  // A MISTURA entra mais cedo quanto mais fundo (Parte 27): ate o 50 a
  // secundaria so aparece na metade do capitulo e a rara no fim dele; do 51 ao
  // 100 as duas entram um pouco antes; do 101 em diante entram desde o comeco,
  // e e por isso que o capitulo da infancia le como bagunca de especie.
  const entraSecundaria = andar <= 50 ? 4 : andar <= 100 ? 2 : 0;
  const entraRara = andar <= 50 ? 7 : andar <= 100 ? 5 : 2;
  const tabela: { tipo: string; peso: number }[] = [{ tipo: cap.fauna.primaria, peso: 10 }];
  if (cap.fauna.secundaria && posicao >= entraSecundaria) {
    tabela.push({ tipo: cap.fauna.secundaria, peso: posicao >= entraRara ? 6 : 3 });
  }
  if (cap.fauna.rara && posicao >= entraRara) tabela.push({ tipo: cap.fauna.rara, peso: 2 });
  return tabela;
}""")

# --------------------------------------------------------------- loot --
rep("""export function tabelaDoAndar(andar: number): string {
  return `nivel_${Math.min(4, Math.floor((andar - 1) / 10))}`;
}""",
"""export function tabelaDoAndar(andar: number): string {
  return `nivel_${Math.min(14, Math.floor((andar - 1) / 10))}`;
}""")

# ---------------------------------------------------------- paradas --
rep("""export const ANDARES_DE_PARADA: readonly number[] = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];""",
"""export const ANDARES_DE_PARADA: readonly number[] = [
  1,
  // de cinco em cinco, do 5 ao 150 — as onze paradas antigas continuam onde
  // estavam, e as flags delas continuam com o mesmo nome
  ...Array.from({ length: ANDARES_TOTAIS / 5 }, (_, i) => (i + 1) * 5),
];""")
io.open(p,'w',encoding='utf-8').write(s); print('ok')

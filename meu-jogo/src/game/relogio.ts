export const CONFIG_TEMPO = {
  /** quantos minutos de jogo passam a cada tick */
  minutosPorTick: 10,
  /** de quantos em quantos segundos reais acontece um tick */
  segundosPorTick: 10,
  /** hora em que o dia comeca ao acordar (6:00) */
  horaAoAcordar: 6 * 60,
  /** hora inicial de um jogo novo (7:20) */
  horaInicial: 7 * 60 + 20,
} as const;

const MINUTOS_POR_DIA = 24 * 60;

export function formatarHora(minutos: number): string {
  const m = ((minutos % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
  const hh = Math.floor(m / 60);
  return `${String(hh).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Relogio do jogo. Nao avanca sozinho: alguem tem que chamar `avancar(delta)`
 * a cada frame — e a cena de mundo so chama quando o jogo nao esta pausado.
 */
export class Relogio {
  minutos: number = CONFIG_TEMPO.horaInicial;
  private acumuladoMs = 0;

  /** Avanca o tempo. Devolve quantas viradas de meia-noite aconteceram. */
  avancar(deltaMs: number): number {
    this.acumuladoMs += deltaMs;
    const intervalo = CONFIG_TEMPO.segundosPorTick * 1000;

    let viradas = 0;
    while (this.acumuladoMs >= intervalo) {
      this.acumuladoMs -= intervalo;
      this.minutos += CONFIG_TEMPO.minutosPorTick;
      while (this.minutos >= MINUTOS_POR_DIA) {
        this.minutos -= MINUTOS_POR_DIA;
        viradas += 1;
      }
    }
    return viradas;
  }

  /** Atalho de debug (F7); tambem preserva corretamente a virada do dia. */
  avancarMinutos(quantidade: number): number {
    this.minutos += quantidade;
    const viradas = Math.floor(this.minutos / MINUTOS_POR_DIA);
    this.minutos %= MINUTOS_POR_DIA;
    return viradas;
  }

  /** Usado ao acordar e ao carregar um save. */
  definir(minutos: number): void {
    this.minutos = minutos;
    this.acumuladoMs = 0;
  }

  get texto(): string {
    return formatarHora(this.minutos);
  }
}

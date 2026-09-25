import { dataDoDia } from './calendario.ts';
export const CLIMAS = ['Limpo', 'Nublado', 'Chuva', 'Temporal', 'Neblina', 'Vento', 'Frio', 'Calor'] as const;
export type Clima = typeof CLIMAS[number];
const PESOS = [[38, 20, 25, 4, 6, 7, 0, 0], [45, 12, 15, 10, 0, 5, 0, 13], [35, 23, 14, 2, 10, 16, 0, 0], [30, 22, 10, 1, 15, 10, 12, 0]];
export class SistemaClima {
  private seed = 44712026;
  private override: { dia: number; clima: Clima } | null = null;
  paraDia(dia: number): Clima {
    if (this.override?.dia === dia) return this.override.clima;
    let h = Math.imul(dia + this.seed, 0x45d9f3b); h = Math.imul(h ^ h >>> 16, 0x45d9f3b);
    let sorteio = ((h ^ h >>> 16) >>> 0) % 100;
    const pesos = PESOS[dataDoDia(dia).estacao];
    for (let i = 0; i < pesos.length; i++) { sorteio -= pesos[i]; if (sorteio < 0) return CLIMAS[i]; }
    return 'Limpo';
  }
  definir(dia: number, clima: Clima): void { this.override = { dia, clima }; }
  serializar() { return { seed: this.seed, override: this.override ? { ...this.override } : null }; }
  restaurar(bruto: unknown): void {
    this.seed = 44712026; this.override = null;
    if (!bruto || typeof bruto !== 'object') return;
    const d = bruto as Partial<ReturnType<SistemaClima['serializar']>>;
    if (Number.isSafeInteger(d.seed) && d.seed! >= 0) this.seed = d.seed!;
    if (d.override && Number.isSafeInteger(d.override.dia) && d.override.dia >= 0 && CLIMAS.includes(d.override.clima)) this.override = { ...d.override };
  }
}
export function intensidadeNoturna(minuto: number): number {
  if (minuto < 300 || minuto >= 1260) return 1;
  if (minuto < 420) return 1 - (minuto - 300) / 120;
  if (minuto < 1020) return 0;
  return (minuto - 1020) / 240;
}

export const DEFAULT_SETTINGS = { master: 0.7, efeitos: 0.6, ambiente: 0.4, tempo: 1, movimentoReduzido: false, altoContraste: false, particulas: true, qualidade: 'normal' as 'baixa' | 'normal' | 'alta' };
export type Settings = typeof DEFAULT_SETTINGS;
export class Preferencias {
  valores: Settings = { ...DEFAULT_SETTINGS };
  carregar(): void {
    try { this.restaurar(JSON.parse(localStorage.getItem('meu-jogo:settings') ?? '{}')); } catch { this.restaurar({}); }
  }
  restaurar(bruto: unknown): void {
    this.valores = { ...DEFAULT_SETTINGS }; if (!bruto || typeof bruto !== 'object') return;
    const d = bruto as Partial<Settings>;
    for (const k of ['master', 'efeitos', 'ambiente'] as const) if (typeof d[k] === 'number' && Number.isFinite(d[k])) this.valores[k] = Math.max(0, Math.min(1, d[k]!));
    for (const k of ['movimentoReduzido', 'altoContraste', 'particulas'] as const) if (typeof d[k] === 'boolean') this.valores[k] = d[k]!;
    if ([0.5, 1, 2].includes(d.tempo!)) this.valores.tempo = d.tempo!;
    if (['baixa', 'normal', 'alta'].includes(d.qualidade!)) this.valores.qualidade = d.qualidade!;
  }
  salvar(): boolean { try { localStorage.setItem('meu-jogo:settings', JSON.stringify(this.valores)); return true; } catch { return false; } }
}

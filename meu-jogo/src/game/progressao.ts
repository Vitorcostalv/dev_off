import type { GameEventBus } from './GameEvents.ts';

export const CONQUISTAS = [
  { id: 'compra', titulo: 'Primeira compra', dica: 'Compre qualquer coisa no mercado.', glifo: '✦' },
  { id: 'setup', titulo: 'Setup montado', dica: 'Tenha teclado, mouse e monitor ao mesmo tempo.', glifo: '▣' },
  { id: 'cidade', titulo: 'Bom dia, cidade', dica: 'Fale com todos os moradores.', glifo: '☺' },
  { id: 'madrugada', titulo: 'Madrugada', dica: 'Fique acordado ate as 3 da manha.', glifo: '☾' },
  { id: 'colecionador', titulo: 'Colecionador', dica: 'Tenha 20 itens diferentes de uma vez.', glifo: '❖' },
  { id: 'salario', titulo: 'Primeiro salario', dica: 'Conclua um trabalho.', glifo: '$' },
  { id: 'semana', titulo: 'Semana cheia', dica: 'Jogue sete dias seguidos.', glifo: '▤' },
  { id: 'gastador', titulo: 'Gastador', dica: 'Gaste mil reais em eletronicos.', glifo: '▲' },
  { id: 'faxina', titulo: 'Faxina', dica: 'Esvazie a lixeira.', glifo: '⌫' },
  { id: 'jogador', titulo: 'Jogador', dica: 'Termine um minijogo.', glifo: '◆' },
] as const;
export interface DadosProgressao {
  desbloqueadas: Record<string, { dia: number; minuto: number }>;
  descobertos: string[];
  gastosEletronicos: number;
  trabalhos: number;
}
interface ContextoProgressao {
  dia: number; minuto: number; itens: string[]; conhecidos: number; totalNpcs: number;
}
export class Progressao {
  private dados: DadosProgressao = { desbloqueadas: {}, descobertos: [], gastosEletronicos: 0, trabalhos: 0 };
  private desligar: (() => void)[] = [];
  conectar(bus: GameEventBus, contexto: () => ContextoProgressao): void {
    this.desligar.forEach(f => f());
    const liberar = (id: string) => {
      const def = CONQUISTAS.find(c => c.id === id); if (!def || this.dados.desbloqueadas[id]) return;
      const c = contexto(); this.dados.desbloqueadas[id] = { dia: c.dia, minuto: c.minuto };
      bus.emit('ACHIEVEMENT_UNLOCKED', { id, titulo: def.titulo });
    };
    const revisar = () => {
      const c = contexto();
      this.dados.descobertos = [...new Set([...this.dados.descobertos, ...c.itens])];
      if (c.itens.length >= 20) liberar('colecionador');
      if (['teclado', 'mouse', 'monitor'].every(tipo => c.itens.some(id => id.startsWith(tipo)))) liberar('setup');
      if (c.conhecidos >= c.totalNpcs && c.totalNpcs > 0) liberar('cidade');
      if (c.dia >= 6) liberar('semana');
    };
    this.desligar = [
      bus.on('ITEM_ADDED', revisar), bus.on('NPC_TALKED', revisar), bus.on('DAY_STARTED', revisar),
      bus.on('SHOP_PURCHASE', e => {
        if (e.loja === 'loja_mercado') liberar('compra');
        if (e.eletronico) this.dados.gastosEletronicos += e.total;
        if (this.dados.gastosEletronicos >= 100000) liberar('gastador'); revisar();
      }),
      bus.on('JOB_COMPLETED', () => { this.dados.trabalhos++; liberar('salario'); }),
      bus.on('TIME_CHANGED', e => { if (e.dia > 0 && e.minuto >= 180 && e.minuto < 360) liberar('madrugada'); }),
      bus.on('TRASH_EMPTIED', e => { if (e.quantidade > 0) liberar('faxina'); }),
      bus.on('MINIGAME_COMPLETED', () => liberar('jogador')),
    ];
  }
  get total(): number { return Object.keys(this.dados.desbloqueadas).length; }
  desbloqueada(id: string): { dia: number; minuto: number } | null { return this.dados.desbloqueadas[id] ?? null; }
  serializar(): DadosProgressao { return structuredClone(this.dados); }
  restaurar(bruto: unknown): void {
    this.dados = { desbloqueadas: {}, descobertos: [], gastosEletronicos: 0, trabalhos: 0 };
    if (!bruto || typeof bruto !== 'object') return;
    const d = bruto as Partial<DadosProgressao>;
    for (const c of CONQUISTAS) {
      const v = d.desbloqueadas?.[c.id];
      if (v && Number.isSafeInteger(v.dia) && v.dia >= 0 && Number.isInteger(v.minuto) && v.minuto >= 0 && v.minuto < 1440)
        this.dados.desbloqueadas[c.id] = { dia: v.dia, minuto: v.minuto };
    }
    this.dados.descobertos = [...new Set(Array.isArray(d.descobertos) ? d.descobertos.filter(x => typeof x === 'string') : [])];
    for (const k of ['gastosEletronicos', 'trabalhos'] as const)
      if (Number.isSafeInteger(d[k]) && d[k]! >= 0) this.dados[k] = d[k]!;
  }
}

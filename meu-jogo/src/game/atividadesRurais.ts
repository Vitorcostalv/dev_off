import { dataDoDia } from './calendario.ts';
import type { SistemaClima } from './clima.ts';
import type { Inventario } from './inventario.ts';
import type { Carteira } from './dinheiro.ts';
export const CULTIVOS = [
  { id: 'tomate', nome: 'Tomate', dias: 4, custo: 400, quantidade: 3, estacoes: [0, 1] },
  { id: 'cenoura', nome: 'Cenoura', dias: 3, custo: 300, quantidade: 3, estacoes: [0, 2, 3] },
  { id: 'milho', nome: 'Milho', dias: 5, custo: 500, quantidade: 4, estacoes: [0, 1, 2] },
] as const;
export const NOS_RURAIS = [
  { id: 'canteiro_1', tipo: 'canteiro', x: 40, y: 64 },
  { id: 'canteiro_2', tipo: 'canteiro', x: 42, y: 64 },
  { id: 'canteiro_3', tipo: 'canteiro', x: 44, y: 64 },
  { id: 'madeira_1', tipo: 'madeira', x: 115, y: 42 },
  { id: 'madeira_2', tipo: 'madeira', x: 119, y: 42 },
  { id: 'pedra_1', tipo: 'pedra', x: 113, y: 94 },
  { id: 'pedra_2', tipo: 'pedra', x: 118, y: 94 },
] as const;
interface Plantio { cultivo: string; crescido: number; ultimoDia: number; regadoDia: number; seco: boolean; }
export interface DadosRurais { plantios: Record<string, Plantio>; coletas: Record<string, number>; }
export class AtividadesRurais {
  private dados: DadosRurais = { plantios: {}, coletas: {} };
  plantio(id: string): Readonly<Plantio> | null { return this.dados.plantios[id] ?? null; }
  avancar(dia: number, clima: SistemaClima): void {
    if (!Number.isSafeInteger(dia) || dia < 0) return;
    for (const p of Object.values(this.dados.plantios)) {
      if (dia <= p.ultimoDia) continue;
      const def = CULTIVOS.find(c => c.id === p.cultivo)!;
      // Todo cultivo atravessa uma estacao inadequada em no maximo um ano.
      if (dia - p.ultimoDia > 112) p.seco = true;
      for (let d = p.ultimoDia; !p.seco && d < Math.min(dia, p.ultimoDia + 112); d++) {
        if (!(def.estacoes as readonly number[]).includes(dataDoDia(d + 1).estacao)) p.seco = true;
        if (!p.seco && (p.regadoDia === d || ['Chuva', 'Temporal'].includes(clima.paraDia(d)))) p.crescido = Math.min(def.dias, p.crescido + 1);
      }
      p.ultimoDia = dia;
    }
  }
  plantar(id: string, cultivo: string, dia: number, carteira: Carteira): string {
    const no = NOS_RURAIS.find(n => n.id === id && n.tipo === 'canteiro');
    const def = CULTIVOS.find(c => c.id === cultivo);
    if (!no || !def || this.dados.plantios[id]) return 'Canteiro indisponivel.';
    if (!(def.estacoes as readonly number[]).includes(dataDoDia(dia).estacao)) return 'Este cultivo nao cresce nesta estacao.';
    if (!carteira.gastar(def.custo).ok) return 'Saldo insuficiente para sementes.';
    this.dados.plantios[id] = { cultivo, crescido: 0, ultimoDia: dia, regadoDia: -1, seco: false };
    return 'Sementes plantadas. Regue todos os dias; chuva tambem ajuda.';
  }
  regar(id: string, dia: number): string {
    const p = this.dados.plantios[id]; if (!p) return 'Plante primeiro.';
    if (p.seco) { delete this.dados.plantios[id]; return 'Canteiro limpo para a nova estacao.'; }
    p.regadoDia = dia; return 'Canteiro regado por hoje.';
  }
  colher(id: string, inventario: Inventario): string {
    const p = this.dados.plantios[id], def = CULTIVOS.find(c => c.id === p?.cultivo);
    if (!p || !def || p.seco || p.crescido < def.dias) return 'Ainda nao esta pronto para colher.';
    if (!inventario.cabe(def.id, def.quantidade)) return 'Abra espaco no inventario antes de colher.';
    inventario.adicionar(def.id, def.quantidade); delete this.dados.plantios[id]; return `Colhido: ${def.nome} x${def.quantidade}.`;
  }
  coletar(id: string, dia: number, inventario: Inventario): string {
    const n = NOS_RURAIS.find(n => n.id === id); if (!n || n.tipo === 'canteiro') return 'Ponto invalido.';
    if ((this.dados.coletas[id] ?? -10) + 2 > dia) return 'Este ponto se renova em dois dias apos a coleta.';
    if (!inventario.cabe(n.tipo, 3)) return 'Abra espaco no inventario.';
    inventario.adicionar(n.tipo, 3); this.dados.coletas[id] = dia;
    return `Ferramentas do posto utilizadas. ${n.tipo === 'madeira' ? 'Madeira' : 'Pedra'} x3 recolhida.`;
  }
  serializar(): DadosRurais { return structuredClone(this.dados); }
  restaurar(bruto: unknown): void {
    this.dados = { plantios: {}, coletas: {} }; if (!bruto || typeof bruto !== 'object') return;
    const d = bruto as Partial<DadosRurais>;
    for (const n of NOS_RURAIS) {
      const p = d.plantios?.[n.id];
      if (n.tipo === 'canteiro' && p && CULTIVOS.some(c => c.id === p.cultivo) && [p.crescido, p.ultimoDia, p.regadoDia].every(Number.isSafeInteger) && p.crescido >= 0 && p.crescido <= 5 && p.ultimoDia >= 0 && p.regadoDia >= -1)
        this.dados.plantios[n.id] = { ...p, seco: p.seco === true };
      const dia = d.coletas?.[n.id]; if (Number.isSafeInteger(dia) && dia! >= 0) this.dados.coletas[n.id] = dia!;
    }
  }
}

export const RECEITAS = [
  { id: 'lanterna', nome: 'Lanterna de manutencao', produto: 'lanterna_manutencao', ingredientes: [['cabo_usb', 2], ['madeira', 3]] },
] as const;
export function fabricar(id: string, inventario: Inventario): string {
  const r = RECEITAS.find(r => r.id === id); if (!r) return 'Receita desconhecida.';
  if (!r.ingredientes.every(([item, qtd]) => inventario.contar(item) >= qtd)) return 'Faltam materiais.';
  // Simula capacidade antes de gastar qualquer ingrediente.
  const dados = inventario.serializar();
  for (const [item, qtd] of r.ingredientes) inventario.remover(item, qtd);
  if (!inventario.cabe(r.produto, 1)) { inventario.restaurar(dados); return 'Sem espaco para o produto.'; }
  inventario.adicionar(r.produto, 1); return `${r.nome} fabricado.`;
}

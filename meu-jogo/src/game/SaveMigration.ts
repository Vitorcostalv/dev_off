import type { DadosSave } from './save.ts';
import { MAPAS, MAPA_PADRAO } from './mapas.ts';
import { CONFIG_TEMPO } from './relogio.ts';
import { Inventario } from './inventario.ts';
import { Carteira } from './dinheiro.ts';
import { Lixeira } from './lixeira.ts';
import { SistemaTrabalhos } from './trabalhos.ts';
import { SistemaRelacoes } from './relacoes.ts';
import { SistemaCasa } from './casa.ts';
import { SistemaCidade } from './cidade.ts';
import { SistemaWorldEvents } from './worldEvents.ts';
import { SistemaMissoesNpc } from './missoesNpc.ts';
import { SistemaVida } from './vida.ts';
import { SistemaRepresa } from './represa.ts';
import { SistemaEquipamento } from './equipar.ts';
import { SistemaArmas } from './armas.ts';
import { SistemaArquivo } from './fichas.ts';
import { Progressao } from './progressao.ts';
import { SistemaClima } from './clima.ts';

export const SAVE_VERSION = 7;
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Os restauradores existentes continuam donos das regras de cada domínio. */
function restaurado<T>(sistema: { restaurar(v: unknown): void; serializar(): T }, bruto: unknown): T {
  sistema.restaurar(bruto);
  return sistema.serializar();
}

/** Impede nomes de propriedades do protótipo de entrarem em registros antigos. */
function dadosSimples(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(dadosSimples);
  if (!objeto(v)) return v;
  return Object.fromEntries(Object.entries(v)
    .filter(([k]) => !['__proto__', 'prototype', 'constructor', 'toString', 'valueOf'].includes(k))
    .map(([k, value]) => [k, dadosSimples(value)]));
}

export function normalizeSave(bruto: unknown): DadosSave {
  const d = objeto(bruto) ? dadosSimples(bruto) as Record<string, unknown> : {};
  const mapa = typeof d.mapa === 'string' && Object.hasOwn(MAPAS, d.mapa) ? MAPAS[d.mapa] : MAPAS[MAPA_PADRAO];
  const posicaoValida = d.mapa === mapa.chave;
  const coordenada = (v: unknown, fallback: number) => posicaoValida && typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
  const inventario = new Inventario(); inventario.restaurar(d.inventario);
  const equipamento = new SistemaEquipamento(); equipamento.restaurar(d.equipamento);
  equipamento.sincronizarCom(id => inventario.contar(id));
  const carteira = new Carteira();
  if (d.dinheiro !== undefined) carteira.restaurar(d.dinheiro);
  return {
    versao: SAVE_VERSION,
    dia: Number.isSafeInteger(d.dia) && Number(d.dia) >= 0 ? Number(d.dia) : 0,
    minutos: typeof d.minutos === 'number' && Number.isFinite(d.minutos) && d.minutos >= 0 && d.minutos < 1440 ? Math.floor(d.minutos) : CONFIG_TEMPO.horaInicial,
    mapa: mapa.chave,
    x: coordenada(d.x, (mapa.spawnTile.x + 0.5) * 32),
    y: coordenada(d.y, (mapa.spawnTile.y + 0.5) * 32),
    inventario: inventario.serializar(), dinheiro: carteira.serializar(),
    itensColetados: [...new Set(Array.isArray(d.itensColetados) ? d.itensColetados.filter((x): x is string => typeof x === 'string') : [])],
    lixeira: restaurado(new Lixeira(), d.lixeira),
    trabalhos: restaurado(new SistemaTrabalhos(), d.trabalhos),
    relacoes: restaurado(new SistemaRelacoes(), d.relacoes),
    casa: restaurado(new SistemaCasa(), d.casa),
    cidade: restaurado(new SistemaCidade(), d.cidade),
    worldEvents: restaurado(new SistemaWorldEvents(), d.worldEvents),
    missoesNpc: restaurado(new SistemaMissoesNpc(), d.missoesNpc),
    vida: restaurado(new SistemaVida(), d.vida),
    represa: restaurado(new SistemaRepresa(), d.represa),
    equipamento: equipamento.serializar(),
    armas: restaurado(new SistemaArmas(), d.armas),
    arquivo: restaurado(new SistemaArquivo(), d.arquivo),
    progressao: restaurado(new Progressao(), d.progressao),
    clima: restaurado(new SistemaClima(), d.clima),
  };
}

export function createDefaultSave(): DadosSave { return normalizeSave({}); }
export function repairSave(bruto: unknown): DadosSave { return normalizeSave(bruto); }

export function migrateSave(bruto: unknown): DadosSave | null {
  if (!objeto(bruto) || (bruto.versao !== 6 && bruto.versao !== SAVE_VERSION)) return null;
  return normalizeSave(bruto);
}

export function validateSave(bruto: unknown): bruto is DadosSave {
  if (!objeto(bruto) || bruto.versao !== SAVE_VERSION) return false;
  try {
    // Uma representação canônica torna reparos e migrações idempotentes.
    const normal = normalizeSave(bruto);
    return Object.keys(normal).every(k => JSON.stringify(bruto[k]) === JSON.stringify(normal[k as keyof DadosSave]));
  } catch { return false; }
}

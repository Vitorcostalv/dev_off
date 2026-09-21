import { migrateSave, SAVE_VERSION } from './SaveMigration.ts';
import { snapshots, restaurarDados } from './save.ts';
import type { DadosSave } from './save.ts';
import { dataDoDia, nomeDoDia } from './calendario.ts';
import { CENAS_CAMPANHA } from './campanha.ts';

export type EstadoPartida = 'vazio' | 'disponivel' | 'incompativel' | 'danificado';
export interface Partida {
  id: string; nome: string; estado: EstadoPartida; dados: DadosSave | null;
  data: string; hora: string; lugar: string; evento: string; tempo: string; miniatura: string;
}
export const ESPACOS_PARTIDA = ['1', '2', '3', '4'] as const;
const CHAVE = 'meu-jogo:partida:';
export function descreverPartida(id: string, nome: string, bruto: string | null): Partida {
  const p: Partida = { id, nome, estado: 'vazio', dados: null, data: '', hora: '', lugar: '', evento: '', tempo: '', miniatura: '' };
  if (!bruto) return p;
  try {
    const entrada = JSON.parse(bruto);
    if (entrada?.versao > SAVE_VERSION) return { ...p, estado: 'incompativel' };
    if (!entrada || typeof entrada !== 'object' || !Number.isInteger(entrada.versao) || !Number.isInteger(entrada.dia)) return { ...p, estado: 'danificado' };
    const dados = migrateSave(entrada);
    if (!dados) return { ...p, estado: 'danificado' };
    const d = dataDoDia(dados.dia), f = dados.worldEvents?.flags ?? {};
    const minutos = Math.floor(Math.max(0, Number(f['sessao:segundos']) || 0) / 60);
    const evento = [...CENAS_CAMPANHA].reverse().find(c => f[`campanha:cena:${c.id}`]);
    const lugares: Record<string, string> = { oficina: 'Casa e oficina', bairro: 'Bairro da Estação', farm: 'Centro da cidade', bar: 'Bar de Alice', represa: 'Estrada da represa', rural: 'Zona rural', mercado: 'Mercado' };
    return { ...p, estado: 'disponivel', dados, data: `${d.nomeEstacao} — Ano ${d.ano}`,
      hora: `${nomeDoDia(dados.dia)} — ${String(Math.floor(dados.minutos / 60)).padStart(2, '0')}:${String(dados.minutos % 60).padStart(2, '0')}`,
      lugar: f['campanha:ativa'] ? 'Uma lembrança em andamento' : lugares[dados.mapa] ?? (dados.mapa.startsWith('represa') ? 'Interior da represa' : 'Na cidade'),
      evento: evento?.titulo ?? 'Chegada à cidade', tempo: `${Math.floor(minutos / 60)}h ${minutos % 60}min`,
      miniatura: typeof f['save:miniatura'] === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f['save:miniatura']) && f['save:miniatura'].length < 180000 ? f['save:miniatura'] : '' };
  } catch { return { ...p, estado: 'danificado' }; }
}
export function listarPartidas(): Partida[] {
  try {
    return [descreverPartida('auto', 'Autosave', localStorage.getItem('meu-jogo:save')),
      ...ESPACOS_PARTIDA.map(id => descreverPartida(id, `Lembrança ${id}`, localStorage.getItem(CHAVE + id))),
      descreverPartida('backup', 'Backup anterior', snapshots()[0]?.bruto ?? null)];
  } catch { return []; }
}
export function guardarPartida(id: string): boolean {
  if (!ESPACOS_PARTIDA.includes(id as typeof ESPACOS_PARTIDA[number])) return false;
  try {
    const bruto = localStorage.getItem('meu-jogo:save');
    if (descreverPartida(id, '', bruto).estado !== 'disponivel' || !bruto) return false;
    const chave = CHAVE + id, anterior = localStorage.getItem(chave);
    // Cada espaço guarda também a versão anterior, independente do autosave.
    if (anterior) localStorage.setItem(chave + ':anterior', anterior);
    localStorage.setItem(chave, bruto);
    return localStorage.getItem(chave) === bruto;
  } catch { return false; }
}
export function carregarPartida(id: string): boolean {
  const p = listarPartidas().find(p => p.id === id);
  return p?.estado === 'disponivel' && p.dados !== null && restaurarDados(p.dados);
}

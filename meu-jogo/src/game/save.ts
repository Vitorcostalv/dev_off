import type { EntradaDeLixeira } from './lixeira.ts';
import type { DadosRelacoes } from './relacoes.ts';
import type { Slot } from './inventario.ts';
import type { DadosCasa } from './casa.ts';
import type { DadosWorldEvents } from './worldEvents.ts';
import type { DadosMissoesNpc } from './missoesNpc.ts';
import type { DadosCidade } from './cidade.ts';
import type { DadosVida } from './vida.ts';
import type { DadosRepresa } from './represa.ts';
import type { DadosEquipamento } from './equipar.ts';
import type { DadosArmas } from './armas.ts';

import { migrateSave, normalizeSave, validateSave, SAVE_VERSION } from './SaveMigration.ts';

const CHAVE = 'meu-jogo:save';
const TEMPORARIO = CHAVE + ':pending';
const BACKUPS = CHAVE + ':backups';

export interface DadosSave {
  versao: number;
  dia: number;
  minutos: number;
  mapa: string;
  x: number;
  y: number;
  inventario: (Slot | null)[];
  itensColetados: string[];
  /** saldo em CENTAVOS; ver src/game/dinheiro.ts */
  dinheiro: number;
  /** historico de descarte; ausente nos saves gravados antes do app Lixeira */
  lixeira?: EntradaDeLixeira[];
  /** entrega em andamento e vagas ja concluidas; ausente nos saves antigos */
  trabalhos?: unknown;
  /**
   * relacionamento com NPCs: score, quem ja foi abordado e as travas de limite
   * diario. Ausente nos saves gravados antes deste recurso; `restaurar` tambem
   * aceita o formato antigo (so o array de scores) sem descartar o save.
   */
  relacoes?: DadosRelacoes;
  /**
   * Comodos de expansao comprados e mobilia posicionada na casa+oficina. Campo
   * novo da versao 6; `SistemaCasa.restaurar` aceita ausente e devolve a casa
   * como ela sai da geracao.
   */
  casa?: DadosCasa;
  /** flags genericas e falas condicionais ja vistas */
  worldEvents?: DadosWorldEvents;
  /** estados disponivel/em andamento/concluida das missoes pessoais */
  missoesNpc?: DadosMissoesNpc;
  /** projetos urbanos construidos e seus trabalhadores; ausente em saves antigos */
  cidade?: DadosCidade;
  /**
   * Vida do jogador. Campo NOVO, sem subir a versao: save antigo chega sem ele e
   * `SistemaVida.restaurar` devolve 30/30 — que e o estado certo pra quem nunca
   * entrou na represa. A migracao v6 -> v7 preserva este comportamento.
   */
  vida?: DadosVida;
  /**
   * CORRIDA atual na represa (tempo dentro, tensao e o salvado recolhido desde a
   * ultima saida). O progresso PERMANENTE da usina nao esta aqui: puzzle
   * resolvido e atalho aberto sao flag de `worldEvents`, e recipiente saqueado e
   * id em `itensColetados` — os dois mecanismos que o jogo ja tinha. Ausente em
   * save antigo, e ai a corrida comeca zerada.
   */
  represa?: DadosRepresa;
  /**
   * O que esta equipado, por slot. Campo NOVO e ADITIVO: save antigo chega sem
   * ele e `SistemaEquipamento.restaurar` devolve os tres slots vazios, que e o
   * estado certo pra quem nunca achou a pistola.
   */
  equipamento?: DadosEquipamento;
  /** cartuchos no carregador de cada arma; ausente = carregador vazio */
  armas?: DadosArmas;
  /**
   * Numeros das fichas medicas ja recolhidas na represa (1 a 50). Guarda so o
   * numero: o texto e estatico, entao o save nao cresce com o prontuario e
   * corrigir uma virgula numa ficha nao invalida nada. Ausente = arquivo vazio.
   */
  arquivo?: number[];
}

export interface SnapshotSave { criadoEm: string; bruto: string; }

export function snapshots(): SnapshotSave[] {
  try {
    const d: unknown = JSON.parse(localStorage.getItem(BACKUPS) ?? '[]');
    return Array.isArray(d) ? d.filter(s => s && typeof s.criadoEm === 'string' && typeof s.bruto === 'string').slice(0, 3) : [];
  } catch { return []; }
}

export function criarSnapshot(): boolean {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return true;
    const anteriores = snapshots();
    if (anteriores[0]?.bruto === bruto) return true;
    localStorage.setItem(BACKUPS, JSON.stringify([{ criadoEm: new Date().toISOString(), bruto }, ...anteriores].slice(0, 3)));
    return true;
  } catch { return false; }
}

/** O ativo só muda após backup e leitura/validação da escrita temporária. */
function gravarValidado(dados: DadosSave): boolean {
  if (!validateSave(dados)) return false;
  try {
    if (!criarSnapshot()) return false;
    const json = JSON.stringify(dados);
    localStorage.setItem(TEMPORARIO, json);
    const gravado = localStorage.getItem(TEMPORARIO);
    if (gravado !== json || !validateSave(JSON.parse(gravado))) return false;
    localStorage.setItem(CHAVE, json);
    // Falhar na limpeza não transforma uma gravação confirmada em fracasso.
    try { localStorage.removeItem(TEMPORARIO); } catch { /* limpável no próximo save */ }
    return true;
  } catch (erro) {
    console.warn('[save] nao consegui gravar; save anterior preservado', erro);
    return false;
  }
}

export function salvar(dados: Omit<DadosSave, 'versao'>): boolean {
  try {
    const anterior = localStorage.getItem(CHAVE);
    if (anterior) {
      try {
        if (JSON.parse(anterior)?.versao > SAVE_VERSION) return false;
      } catch { /* snapshot preserva o JSON corrompido */ }
    }
    return gravarValidado(normalizeSave(dados));
  } catch { return false; }
}

export function carregar(): DadosSave | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const entrada: unknown = JSON.parse(bruto);
    const dados = migrateSave(entrada);
    if (!dados) return null;
    if (!validateSave(entrada)) gravarValidado(dados);
    // Mesmo sem espaço para migrar no storage, a sessão pode ler a cópia reparada.
    return dados;
  } catch (erro) {
    console.warn('[save] leitura falhou; original e backups preservados', erro);
    return null;
  }
}

/** A UI de desenvolvimento confirma a restauração antes de chamar esta função. */
export function restaurarSnapshot(indice: number): boolean {
  try {
    const snapshot = snapshots()[indice];
    if (!snapshot) return false;
    const dados = migrateSave(JSON.parse(snapshot.bruto));
    return dados !== null && gravarValidado(dados);
  } catch { return false; }
}

export function apagar(): boolean {
  try {
    if (!criarSnapshot()) return false;
    localStorage.removeItem(CHAVE);
    return true;
  } catch { return false; }
}

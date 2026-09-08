export interface GameEvents {
  ITEM_ADDED: { id: string; quantidade: number };
  SHOP_PURCHASE: { id: string; total: number; loja: string; eletronico: boolean };
  JOB_COMPLETED: { id: string };
  NPC_TALKED: { id: string };
  TIME_CHANGED: { dia: number; minuto: number };
  DAY_STARTED: { dia: number };
  TRASH_EMPTIED: { quantidade: number };
  MINIGAME_COMPLETED: { id: string };
  ACHIEVEMENT_UNLOCKED: { id: string; titulo: string };
}

/** Instanciado por sessão; normalizadores e testes isolados não emitem eventos. */
export class GameEventBus {
  private listeners = new Map<keyof GameEvents, Set<(payload: never) => void>>();
  on<K extends keyof GameEvents>(tipo: K, listener: (payload: GameEvents[K]) => void): () => void {
    const grupo = this.listeners.get(tipo) ?? new Set();
    grupo.add(listener as (payload: never) => void); this.listeners.set(tipo, grupo);
    return () => { grupo.delete(listener as (payload: never) => void); };
  }
  emit<K extends keyof GameEvents>(tipo: K, payload: GameEvents[K]): void {
    for (const listener of [...(this.listeners.get(tipo) ?? [])]) listener(payload as never);
  }
}

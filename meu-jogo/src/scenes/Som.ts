import Phaser from 'phaser';
import {
  BARRAMENTOS,
  CATALOGO_AUDIO,
  IDS_DE_AUDIO,
  volumeFinal,
} from '../game/audio';
import type { Barramento, SomId } from '../game/audio';

/**
 * Toca o catalogo de `src/game/audio.ts`.
 *
 * Vive no jogo, nao numa cena: a FarmScene reinicia a cada troca de mapa, e
 * ambiente e trilha nao podem recomecar do zero a cada porta. `main.ts` liga o
 * som uma vez e chama `atualizar` por quadro; as cenas so pedem `tocar`,
 * `ambiente` e `musica`.
 *
 * Sem audio disponivel (navegador sem Web Audio, arquivo que falhou ao
 * decodificar) tudo vira no-op: nenhuma cena precisa checar antes de pedir som.
 */

type SomTocavel = Phaser.Sound.BaseSound & {
  setVolume(valor: number): unknown;
  setRate?(valor: number): unknown;
};

/** Volumes das opcoes; `master` multiplica todos os barramentos. */
export type Volumes = Record<Barramento | 'master', number>;

const FADE_MS = 900;

/** Uma faixa continua (ambiente ou trilha) com transicao suave. */
class Camada {
  atual: { id: SomId; som: SomTocavel } | null = null;
  private saindo: { id: SomId; som: SomTocavel; ganho: number }[] = [];
  private ganho = 0;

  definir(id: SomId | null, criar: (id: SomId) => SomTocavel | null): void {
    if (this.atual?.id === id) return;
    if (this.atual) this.saindo.push({ id: this.atual.id, som: this.atual.som, ganho: this.ganho });
    this.atual = null;
    this.ganho = 0;
    if (!id) return;
    const som = criar(id);
    if (som) this.atual = { id, som };
  }

  atualizar(delta: number, alvo: (id: SomId) => number): void {
    const passo = delta / FADE_MS;
    if (this.atual) {
      this.ganho = Math.min(1, this.ganho + passo);
      this.atual.som.setVolume(this.ganho * alvo(this.atual.id));
    }
    this.saindo = this.saindo.filter((s) => {
      s.ganho -= passo;
      if (s.ganho <= 0) { s.som.destroy(); return false; }
      s.som.setVolume(s.ganho * alvo(s.id));
      return true;
    });
  }

  parar(): void {
    this.atual?.som.destroy();
    for (const s of this.saindo) s.som.destroy();
    this.atual = null;
    this.saindo = [];
    this.ganho = 0;
  }
}

export class Som {
  private manager: Phaser.Sound.BaseSoundManager | null = null;
  private volumes: Volumes = { master: 0.7, efeitos: 0.6, ambiente: 0.4, musica: 0.5, interface: 0.6 };
  private ultimaVez = new Map<SomId, number>();
  private camadaAmbiente = new Camada();
  private camadaMusica = new Camada();
  private faltando = new Set<SomId>();

  /** false quando nao ha audio nenhum: as chamadas seguem validas e sem efeito. */
  disponivel = false;

  /** Carrega o catalogo inteiro; chamado do preload do BootScene. */
  static precarregar(cena: Phaser.Scene): void {
    for (const id of IDS_DE_AUDIO) cena.load.audio(id, `assets/audio/${id}.wav`);
  }

  ligar(game: Phaser.Game): void {
    this.manager = game.sound;
    this.disponivel = !(game.sound instanceof Phaser.Sound.NoAudioSoundManager);
  }

  aplicar(volumes: Partial<Volumes>): void {
    for (const chave of ['master', ...BARRAMENTOS] as (Barramento | 'master')[]) {
      const v = volumes[chave];
      if (typeof v === 'number' && Number.isFinite(v)) this.volumes[chave] = Math.max(0, Math.min(1, v));
    }
  }

  private volume(id: SomId): number {
    return volumeFinal(id, this.volumes);
  }

  private existe(id: SomId): boolean {
    if (!this.manager) return false;
    if (this.manager.game.cache.audio.exists(id)) return true;
    // um arquivo ausente vira aviso uma vez, e o jogo segue sem aquele som
    if (!this.faltando.has(id)) {
      this.faltando.add(id);
      console.warn(`[som] ${id} nao esta no cache de audio`);
    }
    return false;
  }

  /** Efeito pontual. Repeticoes muito proximas do mesmo id sao descartadas. */
  tocar(id: SomId, extra: { volume?: number; rate?: number } = {}): void {
    if (!this.disponivel || !this.manager || !this.existe(id)) return;
    const def = CATALOGO_AUDIO[id];
    const agora = this.manager.game.loop.time;
    const minimo = (def.intervalo ?? 0) * 1000;
    if (minimo > 0 && agora - (this.ultimaVez.get(id) ?? -Infinity) < minimo) return;
    const volume = this.volume(id) * (extra.volume ?? 1);
    if (volume <= 0.0005) return;
    this.ultimaVez.set(id, agora);
    const variacao = def.variacao ?? 0;
    const rate = extra.rate ?? (variacao > 0 ? 1 + (Math.random() * 2 - 1) * variacao : 1);
    this.manager.play(id, { volume, rate });
  }

  /** Ambiente do lugar; `null` silencia a camada. */
  ambiente(id: SomId | null): void {
    if (!this.disponivel) return;
    this.camadaAmbiente.definir(id, (chave) => this.criarCiclo(chave));
  }

  /** Trilha do lugar; `null` é silencio proposital. */
  musica(id: SomId | null): void {
    if (!this.disponivel) return;
    this.camadaMusica.definir(id, (chave) => this.criarCiclo(chave));
  }

  get ambienteAtual(): SomId | null { return this.camadaAmbiente.atual?.id ?? null; }
  get musicaAtual(): SomId | null { return this.camadaMusica.atual?.id ?? null; }

  private criarCiclo(id: SomId): SomTocavel | null {
    if (!this.manager || !this.existe(id)) return null;
    const som = this.manager.add(id, { loop: true, volume: 0 }) as SomTocavel;
    som.play();
    return som;
  }

  /** Chamado por quadro pelo `main.ts`: só cuida das transicoes das camadas. */
  atualizar(delta: number): void {
    if (!this.disponivel) return;
    const alvo = (id: SomId) => this.volume(id);
    this.camadaAmbiente.atualizar(delta, alvo);
    this.camadaMusica.atualizar(delta, alvo);
  }

  /** Corta as camadas contínuas na hora, sem transicao. */
  silenciar(): void {
    this.camadaAmbiente.parar();
    this.camadaMusica.parar();
  }
}

export const som = new Som();

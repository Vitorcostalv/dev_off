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

/** Chave da cena invisivel que só serve de loader pro audio (ver `ligar`). */
const CENA_DE_CARGA = 'CarregadorDeSom';

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
  /** A cena que existe so pra ter um loader proprio; ver `cenaDeCarga`. */
  private carregadorCache: Phaser.Scene | null = null;
  /** Faixas em transito, pra dois pedidos seguidos nao baixarem duas vezes. */
  private carregando = new Set<SomId>();

  /** false quando nao ha audio nenhum: as chamadas seguem validas e sem efeito. */
  disponivel = false;

  /**
   * O que o BOOT carrega: efeito e som de interface, e mais nada.
   *
   * Os quarenta e seis WAV somam 7,52 MB, mas 7,15 deles sao ambiente (3,11) e
   * trilha (4,04) — nove e quatro arquivos longos. Efeito e interface juntos sao
   * 0,37 MB, e sao os unicos que o jogo precisa NO INSTANTE em que o jogador
   * aperta uma tecla: um passo que sai meio segundo depois do passo e um bug.
   *
   * Ambiente e trilha entram por `garantir`, na primeira vez que o lugar pede
   * um deles. Sao faixas de trinta segundos que entram com fade de 900ms — meio
   * segundo de atraso no comeco de um ambiente nao se ouve.
   */
  static precarregar(cena: Phaser.Scene): void {
    for (const id of IDS_DE_AUDIO) {
      const b = CATALOGO_AUDIO[id].barramento;
      if (b === 'ambiente' || b === 'musica') continue;
      cena.load.audio(id, `assets/audio/${id}.wav`);
    }
  }

  ligar(game: Phaser.Game): void {
    this.manager = game.sound;
    this.disponivel = !(game.sound instanceof Phaser.Sound.NoAudioSoundManager);
    // CENA PROPRIA SO PRA CARREGAR. Sem ela o som usaria o loader da cena de
    // mundo, e a FarmScene escuta `COMPLETE` nesse mesmo loader pra reiniciar
    // depois de buscar tilemap e atlas de movel sob demanda: uma faixa de
    // ambiente chegando no meio disso dispararia o `restart` dela.
    game.scene.add(CENA_DE_CARGA, { key: CENA_DE_CARGA }, true);
  }

  /**
   * A cena de carga, resolvida no PRIMEIRO USO e nao no `ligar`.
   *
   * `SceneManager.add` empilha a criacao pro proximo passo do jogo, entao
   * `getScene` chamado na linha seguinte devolve null — e um null guardado ali
   * ficava guardado pra sempre, e ambiente e trilha nunca carregavam. O sintoma
   * era silencio total, sem erro nenhum no console.
   */
  private get carregador(): Phaser.Scene | null {
    if (this.carregadorCache) return this.carregadorCache;
    this.carregadorCache = this.manager?.game.scene.getScene(CENA_DE_CARGA) ?? null;
    return this.carregadorCache;
  }

  /**
   * Garante a faixa no cache. Devolve `false` quando ela ainda esta vindo — a
   * camada tenta de novo ao fim da carga.
   */
  private garantir(id: SomId, aoChegar: () => void): boolean {
    if (!this.manager) return false;
    if (this.manager.game.cache.audio.exists(id)) return true;
    if (this.carregando.has(id) || !this.carregador) return false;
    this.carregando.add(id);
    this.carregador.load.audio(id, `assets/audio/${id}.wav`);
    this.carregador.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.carregando.delete(id);
      aoChegar();
    });
    this.carregador.load.start();
    return false;
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
    // o silencio nao espera carga nenhuma
    if (id !== null && !this.garantir(id, () => this.ambiente(id))) return;
    this.camadaAmbiente.definir(id, (chave) => this.criarCiclo(chave));
  }

  /** Trilha do lugar; `null` é silencio proposital. */
  musica(id: SomId | null): void {
    if (!this.disponivel) return;
    if (id !== null && !this.garantir(id, () => this.musica(id))) return;
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

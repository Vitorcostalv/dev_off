/**
 * Vida do jogador — a primeira barra de HP do jogo.
 *
 * NAO E A ENERGIA DO TRABALHO. Sao dois recursos separados de proposito: a
 * energia governa quantos consertos cabem num dia e se recupera dormindo; a
 * vida governa quanto dano o jogador aguenta dentro da represa e se recupera
 * ao ser resgatado ou ao dormir. Misturar os dois faria uma noite mal dormida
 * matar o jogador numa galeria, e faria uma mordida de robo cancelar um turno
 * de trabalho — nenhum dos dois e o que se quer.
 *
 * O padrao aqui e o mesmo da `Carteira`: o valor mora privado e as unicas
 * portas sao `receberDano` e `curar`, entao a regra "entre 0 e maxHp" e
 * verificavel num lugar so.
 */

/** Vida maxima do jogador. Jogo novo comeca cheio. */
export const HP_MAXIMO = 30;

/**
 * Janela de invulnerabilidade depois de tomar dano, em milissegundos.
 *
 * Existe por um motivo concreto: o dano sai da SOBREPOSICAO de corpos, que o
 * Arcade reavalia a cada passo de fisica. Sem a janela, ficar encostado num
 * inimigo drenaria os 30 pontos em menos de um segundo e o jogador nunca
 * entenderia o que aconteceu. 750 ms da tempo de recuar e ler o piscar.
 */
export const INVULNERAVEL_MS = 750;

export interface DadosVida {
  hp: number;
  maxHp: number;
}

export interface ResultadoDano {
  /** quanto foi efetivamente descontado (0 quando estava invulneravel) */
  aplicado: number;
  /** true so no golpe que levou a vida a zero */
  derrotou: boolean;
}

export class SistemaVida {
  private _hp = HP_MAXIMO;
  private _maxHp = HP_MAXIMO;
  /** Tempo restante de invulnerabilidade, em ms. */
  private invulneravelMs = 0;

  get hp(): number {
    return this._hp;
  }

  get maxHp(): number {
    return this._maxHp;
  }

  get cheio(): boolean {
    return this._hp >= this._maxHp;
  }

  get vivo(): boolean {
    return this._hp > 0;
  }

  /** 0 a 1 — o que a barra da HUD desenha. */
  get fracao(): number {
    return this._maxHp > 0 ? this._hp / this._maxHp : 0;
  }

  get invulneravel(): boolean {
    return this.invulneravelMs > 0;
  }

  /** Consome a janela de invulnerabilidade. A cena chama por frame. */
  atualizar(deltaMs: number): void {
    if (this.invulneravelMs > 0) this.invulneravelMs = Math.max(0, this.invulneravelMs - deltaMs);
  }

  /**
   * Aplica dano. Devolve 0 aplicado quando a janela de invulnerabilidade esta
   * aberta — quem chama usa isso pra decidir se pisca o sprite e se empurra.
   */
  receberDano(quantidade: number): ResultadoDano {
    if (!Number.isFinite(quantidade) || quantidade <= 0) return { aplicado: 0, derrotou: false };
    if (this.invulneravelMs > 0 || this._hp <= 0) return { aplicado: 0, derrotou: false };
    const aplicado = Math.min(this._hp, Math.floor(quantidade));
    this._hp -= aplicado;
    this.invulneravelMs = INVULNERAVEL_MS;
    return { aplicado, derrotou: this._hp <= 0 };
  }

  curar(quantidade: number): number {
    if (!Number.isFinite(quantidade) || quantidade <= 0) return 0;
    const antes = this._hp;
    this._hp = Math.min(this._maxHp, this._hp + Math.floor(quantidade));
    return this._hp - antes;
  }

  /** Recuperacao total: dormir na propria cama e o resgate apos derrota. */
  restaurarTudo(): void {
    this._hp = this._maxHp;
    this.invulneravelMs = 0;
  }

  /**
   * Define a vida direto, saneando. Serve ao resgate, que acorda o jogador com
   * uma fracao da vida em vez de com ela cheia.
   */
  definir(hp: number): void {
    this._hp = Math.min(this._maxHp, Math.max(0, Math.floor(Number.isFinite(hp) ? hp : 0)));
    this.invulneravelMs = 0;
  }

  serializar(): DadosVida {
    return { hp: this._hp, maxHp: this._maxHp };
  }

  /**
   * Save antigo nao tem este campo: `bruto` chega `undefined` e a vida fica
   * cheia, que e o certo pra quem nunca entrou na represa. Valor absurdo
   * (NaN, negativo, acima do teto) tambem cai no cheio em vez de derrubar o
   * save.
   */
  restaurar(bruto: unknown): void {
    this._maxHp = HP_MAXIMO;
    this.invulneravelMs = 0;
    if (!bruto || typeof bruto !== 'object') {
      this._hp = this._maxHp;
      return;
    }
    const dados = bruto as Partial<DadosVida>;
    const hp = Number(dados.hp);
    // hp 0 gravado significaria "jogador morto no reload", que nao e um estado
    // jogavel: o resgate ja acontece na hora, entao 0 no save e save invalido.
    this._hp = Number.isFinite(hp) && hp > 0 && hp <= this._maxHp ? Math.floor(hp) : this._maxHp;
  }
}

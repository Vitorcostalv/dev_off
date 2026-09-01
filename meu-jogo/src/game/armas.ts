/**
 * ARMAS DE FOGO E PROJETEIS.
 *
 * Como `inimigos.ts`, este arquivo e DADO mais decisao e nao tem uma linha de
 * Phaser: quem desenha o tiro e move o sprite e a camada da represa, mas quem
 * decide se o disparo sai, quanto custa de municao, para onde o projetil vai e
 * quando ele morre e daqui. E o que permite a conferencia offline provar que a
 * arma nao dispara sem municao, que ela nao dispara mais rapido que a cadencia,
 * que o projetil nao atravessa parede e que recarregar nao cria municao.
 *
 * Arma NOVA nao pede codigo novo: pede uma entrada em `ARMAS`, um item com
 * `arma: <id>` em `COMPORTAMENTOS` (ver equipar.ts) e um frame de mao no atlas
 * `equipamento`. Nao ha uma classe por arma, nem um projetil por arma.
 */

/** Um cartucho por disparo — o custo em municao. Fica constante e nao por arma
 *  porque nao ha, nem vai haver nesta fase, arma que gaste dois. */
export const CARTUCHO_POR_DISPARO = 1;

export interface DefinicaoArma {
  id: string;
  nome: string;
  /** id do item de municao que ela usa */
  municao: string;
  /** dano por acerto */
  dano: number;
  /** quantos cartuchos cabem no carregador */
  carregador: number;
  /** intervalo minimo entre dois disparos, em ms */
  cadencia: number;
  /** tempo de recarga, em ms */
  recarga: number;
  /** velocidade do projetil, em TILES por segundo */
  velocidade: number;
  /** alcance maximo do projetil, em TILES */
  alcance: number;
  /** dispersao maxima, em RADIANOS (metade pra cada lado) */
  dispersao: number;
  /** empurrao no inimigo atingido, em tiles por segundo */
  empurrao: number;
  /** chance de acerto critico, 0 a 1 (o critico dobra o dano) */
  chanceCritica: number;
  /** frame do atlas `equipamento` mostrado no quadro do disparo */
  fogonete?: string;
  /** duracao do fogonete, em ms */
  duracaoFogonete: number;
  /** frame do projetil no atlas `equipamento` */
  frameProjetil: string;
  /** altura do projetil em TILES */
  alturaProjetil: number;
}

/**
 * As armas.
 *
 * A PISTOLA e conservadora de proposito, e os numeros dela sao a resposta a uma
 * pergunta de balanceamento: quanto uma arma de fogo pode encurtar um encontro
 * sem apagar o combate corpo a corpo?
 *
 *   - 6 de dano contra 4 da chave inglesa (7 com a chave grande equipada);
 *   - 300 ms de cadencia contra 460 ms de recarga do golpe;
 *   - mas 8 tiros por carregador e 1,2 s pra trocar.
 *
 * Ou seja: a pistola resolve um pesado (26 de HP) em cinco tiros e sobra
 * carregador pra pouco mais que isso. Contra tres bichos ela acaba no meio da
 * briga e a chave inglesa volta a ser a arma. E o que se quis: a arma de fogo e
 * o recurso que se GASTA, nao a que substitui a outra.
 */
export const ARMAS: Record<string, DefinicaoArma> = {
  pistola: {
    id: 'pistola',
    nome: 'Pistola',
    municao: 'municao_pistola',
    dano: 6,
    carregador: 8,
    cadencia: 300,
    recarga: 1200,
    velocidade: 18,
    alcance: 9,
    // 4 graus de abertura: o bastante pra o tiro de longe nao ser garantido e
    // pouco o bastante pra ninguem culpar a arma por errar de perto
    dispersao: 0.07,
    empurrao: 3,
    chanceCritica: 0.08,
    fogonete: 'mao_pistola_disparo',
    duracaoFogonete: 90,
    frameProjetil: 'projetil_pistola',
    alturaProjetil: 0.22,
  },
};

export function buscarArma(id: unknown): DefinicaoArma | null {
  return typeof id === 'string' ? (ARMAS[id] ?? null) : null;
}

// ------------------------------------------------------------- projeteis --
export interface EstadoProjetil {
  id: string;
  arma: string;
  /** posicao atual, em TILES */
  x: number;
  y: number;
  /** direcao normalizada */
  dx: number;
  dy: number;
  /** tiles por segundo */
  velocidade: number;
  /** quanto de alcance ainda resta, em tiles */
  restante: number;
  dano: number;
  /** true quando o dano ja foi aplicado ou o projetil morreu */
  morto: boolean;
}

export type FimDeProjetil =
  /** ainda voando */
  | { tipo: 'voando' }
  /** bateu em parede/obstaculo */
  | { tipo: 'parede'; x: number; y: number }
  /** chegou ao fim do alcance */
  | { tipo: 'alcance' };

/**
 * Um passo do projetil.
 *
 * O avanco e SUBDIVIDIDO em passos de no maximo meio tile. Sem isso um projetil
 * de 18 tiles/s a 60 fps anda 0,3 tile por quadro — o que ja passaria batido por
 * uma parede de um tile em quadros perdidos, e a 30 fps atravessaria de fato. A
 * subdivisao e o que sustenta a regra "bala nao passa por parede" sem depender
 * de taxa de quadros.
 */
export function avancarProjetil(
  p: EstadoProjetil,
  deltaMs: number,
  bloqueado: (tx: number, ty: number) => boolean,
): FimDeProjetil {
  if (p.morto) return { tipo: 'alcance' };
  const distancia = Math.min(p.restante, (p.velocidade * deltaMs) / 1000);
  const passos = Math.max(1, Math.ceil(distancia / 0.5));
  const passo = distancia / passos;
  for (let i = 0; i < passos; i++) {
    p.x += p.dx * passo;
    p.y += p.dy * passo;
    p.restante -= passo;
    if (bloqueado(Math.floor(p.x), Math.floor(p.y))) {
      p.morto = true;
      return { tipo: 'parede', x: p.x, y: p.y };
    }
  }
  if (p.restante <= 0) {
    p.morto = true;
    return { tipo: 'alcance' };
  }
  return { tipo: 'voando' };
}

// ---------------------------------------------------------------- disparo --
export type FalhaDisparo =
  /** nenhuma arma de fogo equipada */
  | 'sem_arma'
  /** carregador vazio */
  | 'sem_municao'
  /** ainda na cadencia */
  | 'cadencia'
  /** recarregando */
  | 'recarregando'
  /** o mapa atual nao aceita tiro */
  | 'zona';

export interface Tiro {
  arma: DefinicaoArma;
  /** direcao final, ja com dispersao aplicada */
  dx: number;
  dy: number;
  dano: number;
  critico: boolean;
  /** quanto ficou no carregador depois do tiro */
  restanteNoCarregador: number;
}

export type ResultadoDisparo = { ok: true; tiro: Tiro } | { ok: false; falha: FalhaDisparo };

/**
 * ESTADO DE COMBATE DA ARMA — carregador, cadencia e recarga.
 *
 * O carregador POR ARMA vai pro save; a cadencia e a recarga nao, porque sao
 * milissegundos de uma briga e nao progresso. Um jogo recarregado comeca com a
 * arma pronta, o que e o comportamento simpatico e nao abre nenhuma brecha: a
 * municao do carregador foi contada quando ela saiu do inventario.
 */
export interface DadosArmas {
  carregadores: Record<string, number>;
}

export class SistemaArmas {
  private carregadores = new Map<string, number>();
  /** ms restantes da cadencia, por arma */
  private cadencia = new Map<string, number>();
  /** ms restantes da recarga em andamento; null = nao esta recarregando */
  private recarregando: { arma: string; restante: number } | null = null;

  /** Quantos cartuchos estao no carregador da arma. */
  noCarregador(arma: string): number {
    return this.carregadores.get(arma) ?? 0;
  }

  get emRecarga(): boolean {
    return this.recarregando !== null;
  }

  /** 0 a 1 — quanto da recarga ja passou; serve a barra da HUD. */
  progressoDaRecarga(): number {
    if (!this.recarregando) return 1;
    const def = ARMAS[this.recarregando.arma];
    if (!def) return 1;
    return 1 - this.recarregando.restante / def.recarga;
  }

  atualizar(deltaMs: number): void {
    for (const [arma, restante] of this.cadencia) {
      const novo = restante - deltaMs;
      if (novo <= 0) this.cadencia.delete(arma);
      else this.cadencia.set(arma, novo);
    }
    if (this.recarregando) {
      this.recarregando.restante -= deltaMs;
      if (this.recarregando.restante <= 0) this.recarregando = null;
    }
  }

  /**
   * Dispara.
   *
   * `aleatorio` entra por parametro pra dispersao e critico serem conferiveis:
   * a conferencia passa uma sequencia fixa e prova que o dano critico e o dobro
   * e que a dispersao nunca passa da metade declarada.
   */
  disparar(
    armaId: string | null,
    direcao: { x: number; y: number },
    podeAtirar: boolean,
    aleatorio: () => number = Math.random,
  ): ResultadoDisparo {
    const def = buscarArma(armaId);
    if (!def) return { ok: false, falha: 'sem_arma' };
    if (!podeAtirar) return { ok: false, falha: 'zona' };
    if (this.recarregando) return { ok: false, falha: 'recarregando' };
    if ((this.cadencia.get(def.id) ?? 0) > 0) return { ok: false, falha: 'cadencia' };
    const municao = this.noCarregador(def.id);
    if (municao < CARTUCHO_POR_DISPARO) return { ok: false, falha: 'sem_municao' };

    const norma = Math.hypot(direcao.x, direcao.y) || 1;
    const angulo = Math.atan2(direcao.y / norma, direcao.x / norma)
      + (aleatorio() - 0.5) * def.dispersao;
    const critico = aleatorio() < def.chanceCritica;
    const restante = municao - CARTUCHO_POR_DISPARO;
    this.carregadores.set(def.id, restante);
    this.cadencia.set(def.id, def.cadencia);
    return {
      ok: true,
      tiro: {
        arma: def,
        dx: Math.cos(angulo),
        dy: Math.sin(angulo),
        dano: critico ? def.dano * 2 : def.dano,
        critico,
        restanteNoCarregador: restante,
      },
    };
  }

  /** Cria o projetil de um tiro, a partir da boca do cano em TILES. */
  criarProjetil(tiro: Tiro, origem: { x: number; y: number }, id: string): EstadoProjetil {
    return {
      id,
      arma: tiro.arma.id,
      x: origem.x,
      y: origem.y,
      dx: tiro.dx,
      dy: tiro.dy,
      velocidade: tiro.arma.velocidade,
      restante: tiro.arma.alcance,
      dano: tiro.dano,
      morto: false,
    };
  }

  // -------------------------------------------------------------- recarga --
  /**
   * Recarrega: TIRA do inventario e POE no carregador.
   *
   * A ordem importa e e a mesma da revenda de salvado: remove primeiro, credita
   * depois, e o que nao saiu do inventario nao entra no carregador. Recarga
   * parcial e permitida — com tres cartuchos na mochila o carregador fica com
   * tres, e nao recusa.
   */
  recarregar(
    armaId: string | null,
    inventario: { contar(id: string): number; remover(id: string, qtd: number): number },
  ): { ok: boolean; falha?: 'sem_arma' | 'cheio' | 'sem_municao' | 'recarregando'; carregou?: number } {
    const def = buscarArma(armaId);
    if (!def) return { ok: false, falha: 'sem_arma' };
    if (this.recarregando) return { ok: false, falha: 'recarregando' };
    const dentro = this.noCarregador(def.id);
    const falta = def.carregador - dentro;
    if (falta <= 0) return { ok: false, falha: 'cheio' };
    const disponivel = inventario.contar(def.municao);
    if (disponivel <= 0) return { ok: false, falha: 'sem_municao' };
    const pedido = Math.min(falta, disponivel);
    const saiu = inventario.remover(def.municao, pedido);
    if (saiu <= 0) return { ok: false, falha: 'sem_municao' };
    this.carregadores.set(def.id, dentro + saiu);
    this.recarregando = { arma: def.id, restante: def.recarga };
    return { ok: true, carregou: saiu };
  }

  /**
   * DESCARREGA a arma de volta pro inventario. E o que a saida da zona
   * perigosa chama: a arma volta pra mochila e a municao do carregador volta com
   * ela, em vez de ficar presa num carregador de uma arma que nao esta na mao.
   *
   * Devolve quanto NAO cabe no inventario (esse fica no carregador).
   */
  descarregar(
    armaId: string,
    inventario: { adicionar(id: string, qtd: number): number },
  ): number {
    const def = buscarArma(armaId);
    if (!def) return 0;
    const dentro = this.noCarregador(def.id);
    if (dentro <= 0) return 0;
    const sobrou = inventario.adicionar(def.municao, dentro);
    this.carregadores.set(def.id, sobrou);
    this.recarregando = null;
    return sobrou;
  }

  serializar(): DadosArmas {
    return { carregadores: Object.fromEntries(this.carregadores) };
  }

  restaurar(bruto: unknown): void {
    this.carregadores.clear();
    this.cadencia.clear();
    this.recarregando = null;
    if (!bruto || typeof bruto !== 'object') return;
    const dados = (bruto as Partial<DadosArmas>).carregadores;
    if (!dados || typeof dados !== 'object') return;
    for (const [arma, quantidade] of Object.entries(dados)) {
      const def = ARMAS[arma];
      if (!def) continue;
      const n = Number(quantidade);
      if (!Number.isFinite(n) || n <= 0) continue;
      this.carregadores.set(arma, Math.min(def.carregador, Math.floor(n)));
    }
  }
}

// --------------------------------------------------------------- direcao --
export type DirecaoDeMira = 'down' | 'left' | 'right' | 'up';

/**
 * A direcao de sprite que corresponde a um vetor de mira.
 *
 * O personagem tem QUATRO poses e nada mais, e a mira e livre: quem resolve o
 * conflito e a componente dominante. O empate horizontal ganha de proposito —
 * as poses de perfil sao as que mostram a arma inteira, e alternar entre frente
 * e perfil na diagonal exata ficava tremido.
 */
export function direcaoDaMira(dx: number, dy: number): DirecaoDeMira {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

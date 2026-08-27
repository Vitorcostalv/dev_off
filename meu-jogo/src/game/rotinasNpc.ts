import { LOCAIS_CIDADE, NPCS, hora } from './npcs.ts';
import type { AcaoRotinaNpc, DefinicaoNpc, PontoTile } from './npcs.ts';
import type { Direcao } from './tipos.ts';

const HORA_FALLBACK_CASA = hora(18);
const VELOCIDADE_TILES_POR_SEGUNDO = 2.2;
const DISTANCIA_CHEGADA = 0.02;

export interface EstadoNpc {
  readonly id: string;
  x: number;
  y: number;
  dentro: string | null;
  visivel: boolean;
  acordado: boolean;
  movendo: boolean;
  direcao: Direcao;
  acaoAtual: AcaoRotinaNpc['tipo'] | 'inativo';
}

interface RuntimeNpc {
  def: DefinicaoNpc;
  estado: EstadoNpc;
  rotina: AcaoRotinaNpc[];
  indice: number;
  acao: AcaoRotinaNpc | null;
  rota: PontoTile[];
  pontoRota: number;
  alvoVagar: PontoTile | null;
  semente: number;
}

export class SistemaRotinasNpc {
  private runtimes = new Map<string, RuntimeNpc>();
  private diaAtual: number | null = null;

  constructor() {
    for (const def of Object.values(NPCS)) this.runtimes.set(def.id, this.criarRuntime(def));
  }

  get todos(): readonly EstadoNpc[] {
    return [...this.runtimes.values()].map((runtime) => runtime.estado);
  }

  porId(id: string): EstadoNpc | null {
    return this.runtimes.get(id)?.estado ?? null;
  }

  atualizar(dia: number, minutos: number, deltaMs: number): void {
    if (this.diaAtual !== dia) {
      this.diaAtual = dia;
      for (const runtime of this.runtimes.values()) this.reiniciar(runtime);
    }
    for (const runtime of this.runtimes.values()) {
      runtime.estado.acordado = minutos >= runtime.def.horaAcordar;
      this.atualizarNpc(runtime, minutos, deltaMs / 1000);
    }
  }

  private criarRuntime(def: DefinicaoNpc): RuntimeNpc {
    const estado: EstadoNpc = {
      id: def.id,
      x: def.posicaoInicial.x,
      y: def.posicaoInicial.y,
      dentro: def.dentroInicial,
      visivel: def.dentroInicial === null,
      acordado: false,
      movendo: false,
      direcao: 'down',
      acaoAtual: 'inativo',
    };
    return {
      def,
      estado,
      rotina: this.rotinaComFallback(def),
      indice: 0,
      acao: null,
      rota: [],
      pontoRota: 0,
      alvoVagar: null,
      semente: [...def.id].reduce((n, letra) => (n * 31 + letra.charCodeAt(0)) >>> 0, 1),
    };
  }

  private rotinaComFallback(def: DefinicaoNpc): AcaoRotinaNpc[] {
    const rotina = [...def.rotina];
    if (!rotina.some((acao) => acao.horario >= HORA_FALLBACK_CASA)) {
      rotina.push({ horario: HORA_FALLBACK_CASA, tipo: 'voltar_para_casa' });
    }
    return rotina.sort((a, b) => a.horario - b.horario);
  }

  private reiniciar(runtime: RuntimeNpc): void {
    const { def, estado } = runtime;
    estado.x = def.posicaoInicial.x;
    estado.y = def.posicaoInicial.y;
    estado.dentro = def.dentroInicial;
    estado.visivel = def.dentroInicial === null;
    estado.acordado = false;
    estado.movendo = false;
    estado.direcao = 'down';
    estado.acaoAtual = 'inativo';
    runtime.indice = 0;
    runtime.acao = null;
    runtime.rota = [];
    runtime.pontoRota = 0;
    runtime.alvoVagar = null;
  }

  private atualizarNpc(runtime: RuntimeNpc, minutos: number, deltaSegundos: number): void {
    // Descreve somente o tick atual; a cena nao deve consumir este estado.
    runtime.estado.movendo = false;
    const proxima = runtime.rotina[runtime.indice];
    if (
      runtime.acao && proxima &&
      proxima.horario > runtime.acao.horario && proxima.horario <= minutos
    ) {
      runtime.acao = null;
      runtime.estado.movendo = false;
    }

    for (let seguranca = 0; seguranca < 12; seguranca++) {
      if (!runtime.acao) {
        const pendente = runtime.rotina[runtime.indice];
        if (!pendente || pendente.horario > minutos) {
          runtime.estado.acaoAtual = 'inativo';
          return;
        }
        this.iniciarAcao(runtime, pendente);
        runtime.indice += 1;
      }

      if (!this.executarAcao(runtime, deltaSegundos)) return;
      runtime.acao = null;
      runtime.estado.movendo = false;
      deltaSegundos = 0;
    }
  }

  private iniciarAcao(runtime: RuntimeNpc, acao: AcaoRotinaNpc): void {
    runtime.acao = acao;
    runtime.estado.acaoAtual = acao.tipo;
    runtime.rota = [];
    runtime.pontoRota = 0;
    runtime.alvoVagar = null;
    if (acao.tipo === 'andar_rota') runtime.rota = acao.waypoints;
    if (acao.tipo === 'voltar_para_casa') {
      const frente = LOCAIS_CIDADE[runtime.def.casa]?.frente;
      runtime.rota = frente && this.distancia(runtime.estado, frente) <= DISTANCIA_CHEGADA
        ? [frente]
        : [...runtime.def.rotaCasa, ...(frente ? [frente] : [])];
    }
  }

  private executarAcao(runtime: RuntimeNpc, deltaSegundos: number): boolean {
    const acao = runtime.acao;
    if (!acao) return true;
    switch (acao.tipo) {
      case 'entrar_construcao':
        runtime.estado.dentro = acao.construcao;
        runtime.estado.visivel = false;
        return true;
      case 'sair_construcao': {
        const frente = LOCAIS_CIDADE[acao.construcao]?.frente;
        if (!frente) throw new Error(`construcao desconhecida: ${acao.construcao}`);
        runtime.estado.x = frente.x;
        runtime.estado.y = frente.y;
        runtime.estado.dentro = null;
        runtime.estado.visivel = true;
        return true;
      }
      case 'andar_rota':
        return this.seguirRota(runtime, deltaSegundos, false);
      case 'voltar_para_casa':
        return this.seguirRota(runtime, deltaSegundos, true);
      case 'vagar':
        this.vagar(runtime, acao, deltaSegundos);
        return false;
    }
  }

  private seguirRota(runtime: RuntimeNpc, deltaSegundos: number, entrarEmCasa: boolean): boolean {
    let distancia = VELOCIDADE_TILES_POR_SEGUNDO * deltaSegundos;
    while (runtime.pontoRota < runtime.rota.length) {
      const alvo = runtime.rota[runtime.pontoRota];
      distancia -= this.moverAte(runtime.estado, alvo, distancia);
      if (this.distancia(runtime.estado, alvo) > DISTANCIA_CHEGADA) return false;
      runtime.estado.x = alvo.x;
      runtime.estado.y = alvo.y;
      runtime.pontoRota += 1;
      if (distancia <= 0) return false;
    }
    if (entrarEmCasa) {
      runtime.estado.dentro = runtime.def.casa;
      runtime.estado.visivel = false;
    }
    return true;
  }

  private vagar(runtime: RuntimeNpc, acao: Extract<AcaoRotinaNpc, { tipo: 'vagar' }>, delta: number): void {
    if (!runtime.alvoVagar || this.distancia(runtime.estado, runtime.alvoVagar) <= DISTANCIA_CHEGADA) {
      runtime.alvoVagar = {
        x: this.aleatorio(runtime, acao.area.min.x, acao.area.max.x),
        y: this.aleatorio(runtime, acao.area.min.y, acao.area.max.y),
      };
    }
    this.moverAte(runtime.estado, runtime.alvoVagar, VELOCIDADE_TILES_POR_SEGUNDO * delta);
  }

  private moverAte(estado: EstadoNpc, alvo: PontoTile, distanciaMaxima: number): number {
    const dx = alvo.x - estado.x;
    const dy = alvo.y - estado.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia <= DISTANCIA_CHEGADA) return 0;
    const usada = Math.min(distancia, distanciaMaxima);
    estado.x += (dx / distancia) * usada;
    estado.y += (dy / distancia) * usada;
    estado.movendo = true;
    estado.direcao = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    return usada;
  }

  private distancia(a: PontoTile, b: PontoTile): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private aleatorio(runtime: RuntimeNpc, min: number, max: number): number {
    runtime.semente = (runtime.semente * 1664525 + 1013904223) >>> 0;
    return min + (runtime.semente / 0x100000000) * (max - min);
  }
}

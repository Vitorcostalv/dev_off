import { diaDaSemana } from './calendario.ts';
import { LOCAIS_CIDADE, NPCS, hora } from './npcs.ts';
import type { AcaoRotinaNpc, DefinicaoNpc, PontoTile, PostoInterior } from './npcs.ts';
import type { Direcao } from './tipos.ts';

const HORA_FALLBACK_CASA = hora(18);
const VELOCIDADE_TILES_POR_SEGUNDO = 2.2;
const DISTANCIA_CHEGADA = 0.02;

export interface EstadoNpc {
  readonly id: string;
  /** Mapa externo da atividade atual; residência permanece em DefinicaoNpc. */
  mapaAtual: string;
  x: number;
  y: number;
  dentro: string | null;
  visivel: boolean;
  acordado: boolean;
  movendo: boolean;
  direcao: Direcao;
  acaoAtual: AcaoRotinaNpc['tipo'] | 'inativo';
  /**
   * Posto de presenca interior fixa em que o NPC esta, ou null quando ele nao
   * usa esse modo (ou saiu do predio pra viagem do dia). Sai daqui e nao da
   * coordenada porque quem le nao deveria ter de comparar ponto flutuante.
   */
  posto: PostoInterior | null;
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
  pausaRestante: number;
  rotaInterrompida: PontoTile[];
  semente: number;
}

export class SistemaRotinasNpc {
  private runtimes = new Map<string, RuntimeNpc>();
  private diaAtual: number | null = null;
  private pausas = new Map<string, number>();
  /**
   * Substituicao opcional da rotina do dia, consultada UMA vez por NPC na
   * virada do dia. Existe pelo emprego dos projetos urbanos: quem foi designado
   * pra uma obra troca o compromisso do meio do dia pelo turno de la, e essa
   * informacao vive no `estado.cidade`, que este modulo nao pode importar sem
   * fechar um ciclo. Quem liga as duas pontas e src/game/estado.ts.
   */
  private substituicao: ((def: DefinicaoNpc, dia: number) => AcaoRotinaNpc[] | null) | null = null;

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
      for (const runtime of this.runtimes.values()) this.reiniciar(runtime, dia);
    }
    for (const runtime of this.runtimes.values()) {
      runtime.estado.acordado = minutos >= runtime.def.horaAcordar;
      const pausa = this.pausas.get(runtime.def.id) ?? 0;
      if (pausa > 0) {
        runtime.estado.movendo = false;
        this.pausas.set(runtime.def.id, Math.max(0, pausa - deltaMs));
        continue;
      }
      this.atualizarNpc(runtime, minutos, deltaMs / 1000);
    }
  }

  /** Ver `substituicao`. Passar `null` volta ao comportamento sem substituicao. */
  definirSubstituicaoDeRotina(
    fn: ((def: DefinicaoNpc, dia: number) => AcaoRotinaNpc[] | null) | null,
  ): void {
    this.substituicao = fn;
  }

  pausarParaEncontro(ids: readonly string[], milissegundos: number): void {
    for (const id of ids) if (this.runtimes.has(id)) this.pausas.set(id, Math.max(0, milissegundos));
  }

  private criarRuntime(def: DefinicaoNpc): RuntimeNpc {
    const estado: EstadoNpc = {
      id: def.id,
      mapaAtual: def.mapa,
      x: def.posicaoInicial.x,
      y: def.posicaoInicial.y,
      dentro: def.dentroInicial,
      visivel: def.dentroInicial === null,
      acordado: false,
      movendo: false,
      direcao: 'down',
      acaoAtual: 'inativo',
      posto: null,
    };
    return {
      def,
      estado,
      rotina: this.rotinaDoDia(def, 0),
      indice: 0,
      acao: null,
      rota: [],
      pontoRota: 0,
      alvoVagar: null,
      pausaRestante: 0,
      rotaInterrompida: [],
      semente: [...def.id].reduce((n, letra) => (n * 31 + letra.charCodeAt(0)) >>> 0, 1),
    };
  }

  /**
   * Rotina de um dia: a do dia da semana, se o NPC tiver uma, senao a padrao.
   * A escolha e feita UMA vez por dia (na virada, em `reiniciar`) — assim o dia
   * inteiro roda com a mesma lista e nao ha risco de trocar de rotina no meio.
   */
  private rotinaDoDia(def: DefinicaoNpc, dia: number): AcaoRotinaNpc[] {
    const base = this.substituicao?.(def, dia)
      ?? def.rotinaSemanal?.[diaDaSemana(dia)]
      ?? def.rotina;
    const rotina = [...base];
    if (!rotina.some((acao) => acao.horario >= HORA_FALLBACK_CASA)) {
      rotina.push({ horario: HORA_FALLBACK_CASA, tipo: 'voltar_para_casa' });
    }
    return rotina.sort((a, b) => a.horario - b.horario);
  }

  private reiniciar(runtime: RuntimeNpc, dia: number): void {
    const { def, estado } = runtime;
    runtime.rotina = this.rotinaDoDia(def, dia);
    estado.x = def.posicaoInicial.x;
    estado.mapaAtual = def.mapa;
    estado.y = def.posicaoInicial.y;
    estado.dentro = def.dentroInicial;
    estado.visivel = def.dentroInicial === null;
    estado.acordado = false;
    estado.movendo = false;
    estado.direcao = 'down';
    estado.acaoAtual = 'inativo';
    estado.posto = null;
    runtime.indice = 0;
    runtime.acao = null;
    runtime.rota = [];
    runtime.pontoRota = 0;
    runtime.alvoVagar = null;
    runtime.pausaRestante = 0;
    runtime.rotaInterrompida = [];
  }

  private atualizarNpc(runtime: RuntimeNpc, minutos: number, deltaSegundos: number): void {
    // Descreve somente o tick atual; a cena nao deve consumir este estado.
    runtime.estado.movendo = false;
    const proxima = runtime.rotina[runtime.indice];
    if (
      runtime.acao && proxima &&
      proxima.horario > runtime.acao.horario && proxima.horario <= minutos
    ) {
      // O trecho interrompido e o que a acao em curso oferece como saida segura
      // dela mesma; `voltar_para_casa` costura isso na frente da `rotaCasa`.
      runtime.rotaInterrompida = runtime.acao.tipo === 'vagar_rota'
        ? (runtime.acao.rotasRetorno?.[runtime.pontoRota]
          ?? runtime.rota.slice(runtime.pontoRota))
        : runtime.acao.tipo === 'vagar'
        ? (runtime.acao.saidaSegura ?? [])
        : [];
      runtime.acao = null;
      runtime.estado.movendo = false;
      runtime.pausaRestante = 0;
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

  /** Posto de um NPC de presenca interior fixa; erra alto se o lote nao tiver. */
  private postoDe(def: DefinicaoNpc, posto: PostoInterior): PontoTile {
    const ponto = LOCAIS_CIDADE[def.casa]?.postos?.[posto];
    if (!ponto) {
      throw new Error(
        `"${def.id}" pediu o posto "${posto}", mas "${def.casa}" nao tem postos em LOCAIS_CIDADE`,
      );
    }
    return ponto;
  }

  /**
   * Waypoints da posicao atual ate o posto pedido, pela ESPINHA do predio
   * (`LOCAIS_CIDADE[casa].rotaEntrePostos`, escrita de `moradia` pra
   * `trabalho`). Ir pro outro posto e percorrer a mesma espinha ao contrario.
   *
   * Como nao ha pathfinding, a entrada na espinha e pelo waypoint mais PROXIMO
   * da posicao atual: sair de tras do balcao, do quarto ou da porta da rua
   * pega o mesmo corredor, sem andar pra tras. A espinha e uma polilinha
   * simples e passa pela frente da porta da rua justamente pra isso valer.
   *
   * Sem espinha declarada o posto continua sendo um ponto so — o NPC anda em
   * reta ate ele, que e o certo num interior de um comodo so.
   */
  private rotaAtePosto(runtime: RuntimeNpc, posto: PostoInterior): PontoTile[] {
    const destino = this.postoDe(runtime.def, posto);
    const espinha = LOCAIS_CIDADE[runtime.def.casa]?.rotaEntrePostos;
    if (!espinha?.length) return [destino];
    const rota = posto === 'trabalho' ? [...espinha] : [...espinha].reverse();
    let inicio = 0;
    let melhor = Infinity;
    rota.forEach((ponto, i) => {
      const d = this.distancia(runtime.estado, ponto);
      if (d < melhor) {
        melhor = d;
        inicio = i;
      }
    });
    return rota.slice(inicio);
  }

  private iniciarAcao(runtime: RuntimeNpc, acao: AcaoRotinaNpc): void {
    runtime.acao = acao;
    runtime.estado.acaoAtual = acao.tipo;
    runtime.rota = [];
    runtime.pontoRota = 0;
    runtime.alvoVagar = null;
    runtime.pausaRestante = 0;
    if (acao.tipo === 'andar_rota') runtime.rota = acao.waypoints;
    if (acao.tipo === 'vagar_rota') runtime.rota = acao.waypoints;
    if (acao.tipo === 'posto_interior') {
      // O dono ja esta dentro do proprio predio quando isto comeca (ou porque
      // nasceu la, ou porque acabou de voltar pela porta). Se por algum motivo
      // nao estiver, entra pela porta antes de andar — assim a rota parte sempre
      // de um tile valido do interior.
      const estado = runtime.estado;
      if (estado.dentro !== runtime.def.casa) {
        const porta = LOCAIS_CIDADE[runtime.def.casa]?.portaInterior;
        estado.dentro = runtime.def.casa;
        estado.visivel = false;
        if (porta) {
          estado.x = porta.x;
          estado.y = porta.y;
        }
      }
      estado.posto = null; // em transito: so vira o posto de destino na chegada
      runtime.rota = this.rotaAtePosto(runtime, acao.posto);
    }
    if (acao.tipo === 'sair_construcao') {
      const local = LOCAIS_CIDADE[acao.construcao];
      if (!local) throw new Error(`construcao desconhecida: ${acao.construcao}`);
      // o corredor interno, quando o predio tem um: a reta do posto ate a porta
      // atravessaria mobilia, e aqui nao ha pathfinding
      runtime.rota = [...(local.corredorInterior ?? []), local.portaInterior];
    }
    if (acao.tipo === 'voltar_para_casa') {
      const frente = LOCAIS_CIDADE[runtime.def.casa]?.frente;
      const trechoInterrompido = runtime.estado.dentro === null ? runtime.rotaInterrompida : [];
      runtime.rota = runtime.estado.dentro === runtime.def.casa
        ? []
        : frente && this.distancia(runtime.estado, frente) <= DISTANCIA_CHEGADA
        ? [frente]
        : [...trechoInterrompido, ...runtime.def.rotaCasa, ...(frente ? [frente] : [])];
    }
    runtime.rotaInterrompida = [];
  }

  private executarAcao(runtime: RuntimeNpc, deltaSegundos: number): boolean {
    const acao = runtime.acao;
    if (!acao) return true;
    switch (acao.tipo) {
      case 'posto_interior': {
        // Caminhada de verdade DENTRO do interior, pelo mesmo `seguirRota` das
        // rotas externas: a duracao sai da distancia real, nao de um numero
        // fixo. `visivel` fica false porque "dentro de construcao" e o que
        // esconde o NPC do mapa externo — a cena desenha ele pelo par
        // (dentro === mapa aberto), em posicaoNpcNoMapa, entao quem estiver no
        // predio ve o trajeto inteiro, inclusive a passagem pela porta privada.
        runtime.estado.dentro = runtime.def.casa;
        runtime.estado.visivel = false;
        if (!this.seguirRota(runtime, deltaSegundos, false)) return false;
        const ponto = this.postoDe(runtime.def, acao.posto);
        runtime.estado.x = ponto.x;
        runtime.estado.y = ponto.y;
        runtime.estado.posto = acao.posto;
        return true;
      }
      case 'assumir_lugar':
        runtime.estado.mapaAtual = acao.mapa ?? runtime.def.mapa;
        // Troca instantanea de lugar: sem rota, sem passo. Ver o comentario do
        // tipo em npcs.ts — e o que os NPCs sem folha de caminhada usam, e
        // tambem quem trabalha num posto fixo dentro de um predio.
        runtime.estado.x = acao.ponto.x;
        runtime.estado.y = acao.ponto.y;
        runtime.estado.dentro = acao.construcao;
        runtime.estado.visivel = acao.construcao === null;
        runtime.estado.posto = null;
        if (acao.direcao) runtime.estado.direcao = acao.direcao;
        return true;
      case 'entrar_construcao':
        runtime.estado.x = LOCAIS_CIDADE[acao.construcao].portaInterior.x;
        runtime.estado.y = LOCAIS_CIDADE[acao.construcao].portaInterior.y;
        runtime.estado.dentro = acao.construcao;
        runtime.estado.visivel = false;
        runtime.estado.posto = null;
        return true;
      case 'sair_construcao': {
        const frente = LOCAIS_CIDADE[acao.construcao]?.frente;
        if (!frente) throw new Error(`construcao desconhecida: ${acao.construcao}`);
        if (!this.seguirRota(runtime, deltaSegundos, false)) return false;
        runtime.estado.x = frente.x;
        runtime.estado.y = frente.y;
        runtime.estado.dentro = null;
        runtime.estado.visivel = true;
        runtime.estado.posto = null;
        return true;
      }
      case 'andar_rota':
        return this.seguirRota(runtime, deltaSegundos, false);
      case 'voltar_para_casa':
        return this.seguirRota(runtime, deltaSegundos, true);
      case 'vagar_rota':
        this.vagarRota(runtime, acao, deltaSegundos);
        return false;
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
    if (entrarEmCasa && runtime.estado.dentro !== runtime.def.casa) {
      runtime.estado.dentro = runtime.def.casa;
      runtime.estado.visivel = false;
      // chegou pela porta, ainda nao esta em posto nenhum: quem mora onde
      // trabalha recebe um `posto_interior` logo depois pra assumir o balcao
      runtime.estado.posto = null;
      const porta = LOCAIS_CIDADE[runtime.def.casa]?.portaInterior;
      if (porta) {
        runtime.estado.x = porta.x;
        runtime.estado.y = porta.y;
      }
    }
    return true;
  }

  private vagar(runtime: RuntimeNpc, acao: Extract<AcaoRotinaNpc, { tipo: 'vagar' }>, delta: number): void {
    if (this.pausar(runtime, delta)) return;
    if (!runtime.alvoVagar || this.distancia(runtime.estado, runtime.alvoVagar) <= DISTANCIA_CHEGADA) {
      if (runtime.alvoVagar) this.iniciarPausa(runtime, acao);
      runtime.alvoVagar = {
        x: this.aleatorio(runtime, acao.area.min.x, acao.area.max.x),
        y: this.aleatorio(runtime, acao.area.min.y, acao.area.max.y),
      };
    }
    this.moverAte(runtime.estado, runtime.alvoVagar, VELOCIDADE_TILES_POR_SEGUNDO * delta);
  }

  private vagarRota(
    runtime: RuntimeNpc,
    acao: Extract<AcaoRotinaNpc, { tipo: 'vagar_rota' }>,
    delta: number,
  ): void {
    if (this.pausar(runtime, delta) || runtime.rota.length === 0) return;
    const alvo = runtime.rota[runtime.pontoRota];
    this.moverAte(runtime.estado, alvo, VELOCIDADE_TILES_POR_SEGUNDO * delta);
    if (this.distancia(runtime.estado, alvo) > DISTANCIA_CHEGADA) return;
    runtime.estado.x = alvo.x;
    runtime.estado.y = alvo.y;
    runtime.pontoRota = (runtime.pontoRota + 1) % runtime.rota.length;
    this.iniciarPausa(runtime, acao);
  }

  private pausar(runtime: RuntimeNpc, delta: number): boolean {
    if (runtime.pausaRestante <= 0) return false;
    runtime.pausaRestante = Math.max(0, runtime.pausaRestante - delta);
    return true;
  }

  private iniciarPausa(
    runtime: RuntimeNpc,
    acao: { pausaMinSegundos?: number; pausaMaxSegundos?: number },
  ): void {
    const min = Math.max(0, acao.pausaMinSegundos ?? 0);
    const max = Math.max(min, acao.pausaMaxSegundos ?? min);
    runtime.pausaRestante = this.aleatorio(runtime, min, max);
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

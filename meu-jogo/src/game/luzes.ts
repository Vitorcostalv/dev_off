/**
 * ILUMINACAO DA REPRESA — o mapa de luz, as luminarias e a lanterna.
 *
 * A leva anterior tinha UMA vinheta radial centrada no jogador, com alfa igual a
 * escuridao do comodo. Funcionava e tinha dois defeitos que a Parte 22 pediu pra
 * corrigir: a luz era um CIRCULO DESENHADO (dava pra ver a borda dele) e ela
 * atravessava parede — uma lampada acesa do outro lado da alvenaria clareava o
 * corredor inteiro.
 *
 * O que ha agora e um MAPA DE LUZ: um valor por tile do andar, somando a
 * contribuicao de cada luminaria acesa e da lanterna do jogador, com LINHA DE
 * VISAO conferida tile por tile. A cena transforma esse mapa numa textura de um
 * texel por tile e a desenha esticada com filtro LINEAR — e a interpolacao da
 * textura que da o degrade suave, de graca, sem shader e sem borda geometrica.
 *
 * A divisao de trabalho e a de sempre neste projeto: aqui nao ha uma linha de
 * Phaser. O que mora aqui e a CONTA (quanto de luz cada tile recebe), e por isso
 * a conferencia offline consegue provar que a luz nao passa por parede, que toda
 * luminaria referencia arte que existe e que todo circuito aponta pra uma flag de
 * verdade.
 */

/** Cor do escuro. Preto puro mata a leitura da arte; este e o azul-chumbo do jogo. */
export const COR_DO_ESCURO = { r: 5, g: 7, b: 12 };

/**
 * Tinta aplicada na luminaria APAGADA.
 *
 * O atlas guarda so o estado aceso de cada luminaria (ver
 * tools/gerar-equipamento.mjs): o apagado sai tingindo o mesmo frame de
 * cinza-chumbo. Isso garante que acender a luz nao troque a silhueta do objeto,
 * o que aconteceria se o par aceso/apagado viesse de duas pecas parecidas da
 * folha.
 */
export const TINTA_APAGADA = 0x3f444c;

// ------------------------------------------------------------- luminarias --
export interface TipoDeLampada {
  id: string;
  nome: string;
  /** frame no atlas `equipamento` */
  frame: string;
  /** altura do sprite em TILES */
  altura: number;
  /** raio padrao de alcance, em tiles */
  raio: number;
  /** quanto ela clareia no centro, 0 a 1 */
  intensidade: number;
  /** cor do halo aditivo desenhado em volta dela */
  cor: number;
  /** amplitude do tremor, 0 = luz firme */
  tremor: number;
}

/**
 * Os quatro tipos de luminaria industrial.
 *
 * A `tubular` e a mais forte e a mais firme: e a luz de corredor de manutencao,
 * o que a usina tinha de mais confiavel. A `gaiola` e a de emergencia — fraca,
 * quente e a unica que treme de verdade, porque e a que sobrevive nos andares em
 * que nada mais funciona.
 */
export const TIPOS_DE_LAMPADA: Record<string, TipoDeLampada> = {
  pendente: {
    id: 'pendente', nome: 'Pendente de galpao', frame: 'lampada_pendente',
    altura: 1.15, raio: 5, intensidade: 0.85, cor: 0xffe2ac, tremor: 0.04,
  },
  gaiola: {
    id: 'gaiola', nome: 'Bulbo de emergencia', frame: 'lampada_gaiola',
    altura: 1.0, raio: 3.4, intensidade: 0.7, cor: 0xffc27a, tremor: 0.14,
  },
  tubular: {
    id: 'tubular', nome: 'Luminaria tubular', frame: 'lampada_tubular',
    altura: 0.55, raio: 6, intensidade: 0.95, cor: 0xfff0d4, tremor: 0.02,
  },
  teto: {
    id: 'teto', nome: 'Plafon de teto', frame: 'lampada_teto',
    altura: 0.6, raio: 4.2, intensidade: 0.8, cor: 0xffeec4, tremor: 0.03,
  },
};

export function buscarTipoDeLampada(id: unknown): TipoDeLampada | null {
  return typeof id === 'string' ? (TIPOS_DE_LAMPADA[id] ?? null) : null;
}

/** Uma luminaria posta no mapa. */
export interface Lampada {
  id: string;
  /** posicao em TILES */
  tx: number;
  ty: number;
  tipo: TipoDeLampada;
  raio: number;
  intensidade: number;
  /**
   * Flag de que o CIRCUITO dela depende. Enquanto ela nao estiver ativa, a
   * luminaria fica apagada e nao entra no mapa de luz. E o gancho da Parte 24:
   * resolver o painel do andar acende metade das luminarias e revela caminho que
   * estava ilegivel.
   */
  circuito: string | null;
}

// ------------------------------------------------------------- lanterna --
/**
 * A LANTERNA do jogador.
 *
 * `cone` e a metade da abertura, em radianos. O facho e um cone com queda suave
 * na borda, mais um halo curto em volta do jogador (`raioPerto`) — sem esse halo
 * o jogador nao veria os proprios pes, e olhar pra frente no escuro viraria
 * andar as cegas de lado.
 */
export const LANTERNA = {
  /** alcance do facho, em tiles */
  alcance: 8.5,
  /** metade da abertura do cone, em radianos (~34 graus de cada lado) */
  cone: 0.6,
  /** raio do halo em volta do jogador, em tiles */
  raioPerto: 2.6,
  /** intensidade no centro do facho */
  intensidade: 1,
} as const;

/**
 * A VISAO SEM LANTERNA — o quanto o jogador enxerga de si mesmo no escuro.
 *
 * Ela existe pra escuridao criar tensao e nao frustracao: mesmo sem lanterna
 * nenhuma da pra andar, achar a parede e ler a porta. O que a lanterna muda e
 * ver LONGE e ver PRA ONDE, que e o que importa num labirinto.
 */
export const VISAO_BASE = { raio: 3, intensidade: 0.85 } as const;

// -------------------------------------------------------------- mapa de luz --
export interface MapaDeLuz {
  largura: number;
  altura: number;
  /** um valor de luz por tile, 0 (escuro) a 1+ (estourado) */
  valores: Float32Array;
}

export function criarMapaDeLuz(largura: number, altura: number): MapaDeLuz {
  return { largura, altura, valores: new Float32Array(largura * altura) };
}

const dentro = (m: MapaDeLuz, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < m.largura && y < m.altura;

export function luzEm(m: MapaDeLuz, x: number, y: number): number {
  return dentro(m, x, y) ? m.valores[y * m.largura + x] : 0;
}

/**
 * LINHA DE VISAO entre dois tiles, com amostragem de meio tile.
 *
 * E a mesma tecnica que o inimigo usa pra decidir se ve o jogador
 * (`CamadaRepresa.linhaLivre`), e esta aqui numa funcao pura pela mesma razao: e
 * o que permite provar, sem navegador, que a luz nao passa por parede.
 *
 * O tile de ORIGEM e o de DESTINO nao contam: a luminaria costuma estar colada na
 * parede (ela e presa no teto, na primeira linha do comodo), e contar o proprio
 * tile dela apagaria toda luminaria do andar.
 */
export function linhaLivreDeLuz(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bloqueado: (x: number, y: number) => boolean,
): boolean {
  const passos = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
  for (let i = 1; i < passos; i++) {
    const x = Math.round(ax + ((bx - ax) * i) / passos);
    const y = Math.round(ay + ((by - ay) * i) / passos);
    if (x === ax && y === ay) continue;
    if (x === bx && y === by) continue;
    if (bloqueado(x, y)) return false;
  }
  return true;
}

/**
 * Queda de intensidade com a distancia, pra LUMINARIA.
 *
 * Quadratica: cai rapido e deixa a borda bem macia. E o que faz uma lampada
 * parecer uma poca de luz no chao em vez de um circulo chapado.
 */
function queda(distancia: number, raio: number): number {
  if (distancia >= raio) return 0;
  const t = 1 - distancia / raio;
  return t * t;
}

/**
 * Queda da LANTERNA. Bem mais lenta que a da luminaria, de proposito.
 *
 * Com a queda quadratica o facho morria na metade do alcance: a 4 tiles ele
 * entregava 0,28 de luz contra 0,76 de escuridao do andar 43, e o corredor a
 * frente continuava ilegivel — o jogador tinha alcance no papel e nao na tela.
 * Com expoente 1,5 o mesmo ponto recebe 0,68, e o fim do facho ainda escurece.
 */
function quedaDaLanterna(distancia: number, raio: number): number {
  if (distancia >= raio) return 0;
  return 1 - (distancia / raio) ** 1.5;
}

/**
 * O MAPA DE LUZ ESTATICO do andar: so as luminarias, so uma vez.
 *
 * Ele e calculado uma vez por andar (e recalculado quando um circuito muda de
 * estado, o que acontece ao resolver um painel) e guardado. E a cache que a
 * Parte 23 pede: sem ela seriam centenas de tracados de linha de visao por
 * quadro, e com ela sao zero.
 */
export function mapaDeLuzEstatico(
  largura: number,
  altura: number,
  lampadas: readonly Lampada[],
  acesa: (l: Lampada) => boolean,
  bloqueado: (x: number, y: number) => boolean,
): MapaDeLuz {
  const mapa = criarMapaDeLuz(largura, altura);
  for (const l of lampadas) {
    if (!acesa(l)) continue;
    const r = Math.ceil(l.raio);
    for (let y = l.ty - r; y <= l.ty + r; y++) {
      for (let x = l.tx - r; x <= l.tx + r; x++) {
        if (!dentro(mapa, x, y)) continue;
        const d = Math.hypot(x - l.tx, y - l.ty);
        const q = queda(d, l.raio) * l.intensidade;
        if (q <= 0.002) continue;
        if (!linhaLivreDeLuz(l.tx, l.ty, x, y, bloqueado)) continue;
        const i = y * largura + x;
        // soma saturante: duas luminarias juntas clareiam mais, sem estourar
        mapa.valores[i] = Math.min(1.4, mapa.valores[i] + q);
      }
    }
  }
  return mapa;
}

/** Vetor unitario de uma direcao de sprite. */
const VETOR_DE_DIRECAO: Record<string, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * A luz do JOGADOR somada ao mapa estatico, num retangulo em volta dele.
 *
 * Escreve em `saida` (que ja traz uma copia do estatico na janela) pra nao
 * alocar um Float32Array de mapa inteiro por quadro.
 *
 * `mira` permite o facho seguir o CURSOR e nao a pose: com arma na mao a pose ja
 * sai da mira, e sem isso o facho apontaria pra um dos quatro lados enquanto o
 * tiro sai na diagonal.
 */
export function somarLuzDoJogador(
  saida: MapaDeLuz,
  jogador: { x: number; y: number },
  direcao: string,
  comLanterna: boolean,
  mira: { x: number; y: number } | null,
  bloqueado: (x: number, y: number) => boolean,
): void {
  const px = Math.round(jogador.x);
  const py = Math.round(jogador.y);
  const base = VETOR_DE_DIRECAO[direcao] ?? VETOR_DE_DIRECAO.down;
  const bruto = mira && (mira.x !== 0 || mira.y !== 0) ? mira : base;
  const norma = Math.hypot(bruto.x, bruto.y) || 1;
  const fx = bruto.x / norma;
  const fy = bruto.y / norma;

  const alcance = comLanterna ? LANTERNA.alcance : VISAO_BASE.raio;
  const r = Math.ceil(alcance);
  for (let y = py - r; y <= py + r; y++) {
    for (let x = px - r; x <= px + r; x++) {
      if (!dentro(saida, x, y)) continue;
      const dx = x - jogador.x;
      const dy = y - jogador.y;
      const d = Math.hypot(dx, dy);
      // halo curto em volta dos pes, sempre — mesmo sem lanterna
      let q = quedaDaLanterna(d, VISAO_BASE.raio) * VISAO_BASE.intensidade;
      if (comLanterna && d > 0.01) {
        const cos = (dx / d) * fx + (dy / d) * fy;
        const angulo = Math.acos(Math.max(-1, Math.min(1, cos)));
        if (angulo < LANTERNA.cone) {
          // queda suave na BORDA do cone: sem ela o facho tem aresta reta e
          // parece um triangulo desenhado, que e o que a Parte 25 proibe
          const suave = 1 - (angulo / LANTERNA.cone) ** 2;
          q = Math.max(q, quedaDaLanterna(d, LANTERNA.alcance) * LANTERNA.intensidade * suave);
        }
      }
      if (q <= 0.002) continue;
      // O facho tambem PARA na parede: sem isto a lanterna acende o comodo
      // vizinho atraves da alvenaria, que e o defeito que a vinheta antiga tinha.
      if (!linhaLivreDeLuz(px, py, x, y, bloqueado)) continue;
      const i = y * saida.largura + x;
      saida.valores[i] = Math.min(1.6, saida.valores[i] + q);
    }
  }
}

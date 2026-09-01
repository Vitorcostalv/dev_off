/**
 * MONSTROS ELETRONICOS — catalogo e maquina de estados.
 *
 * Este arquivo e DADO mais logica de decisao, e nao tem uma linha de Phaser: a
 * `FarmScene` desenha e move o sprite, mas quem decide "perseguir ou voltar",
 * "pode atacar agora" e "quanto dano" e `decidirInimigo` aqui. E o que permite
 * a conferencia offline (`verificar-represa`) rodar a IA sem navegador e provar
 * que o inimigo desiste, que ele nao ataca depois de morto e que ele nao aplica
 * dano todo quadro.
 *
 * Um inimigo NOVO nao precisa de codigo novo: precisa de uma entrada em
 * `CATALOGO_INIMIGOS` e de uma folha processada por
 * `tools/processar-sprites-monstro.mjs`.
 */

import type { Direcao } from './tipos.ts';

/** Estados da IA. Simples de proposito: e para ser confiavel, nao esperto. */
export type EstadoInimigo = 'parado' | 'patrulha' | 'alerta' | 'perseguindo' | 'atacando' | 'atingido' | 'morto';

export interface DefinicaoInimigo {
  id: string;
  nome: string;
  /**
   * Arquetipo, so pra leitura humana e pra conferencia agrupar. Nao muda
   * comportamento: quem muda e cada numero abaixo.
   */
  arquetipo: 'rasteiro' | 'padrao' | 'drone' | 'pesado';
  hpMax: number;
  /**
   * Dano por golpe. Fica POR TIPO e nao numa constante global de proposito: e o
   * botao de balanceamento por profundidade. Nenhum valor chega perto de 30 —
   * nenhum inimigo pode matar o jogador cheio de vida num golpe so.
   */
  dano: number;
  /** velocidade de perseguicao, em TILES por segundo */
  velocidade: number;
  /** velocidade de patrulha; sempre menor, senao a patrulha le como perseguicao */
  velocidadePatrulha: number;
  /** raio de deteccao, em tiles */
  raioAggro: number;
  /**
   * A que distancia ele DESISTE, em tiles. Sempre maior que `raioAggro`, senao
   * o inimigo entra e sai de perseguicao no limite do circulo, tremendo no
   * lugar. A diferenca entre os dois e a histerese.
   */
  raioDesistencia: number;
  /** alcance do golpe, em tiles */
  alcanceAtaque: number;
  /** intervalo minimo entre dois golpes DELE, em ms */
  recargaAtaque: number;
  /** duracao da reacao ao ser atingido, em ms (ele para de andar) */
  duracaoAtingido: number;
  /** vida em tiles: quanto do sprite ocupa a altura */
  alturaTiles: number;
  /** quantos golpes do jogador ele aguenta com a chave inglesa (derivado) */
  tabelaDrop: string;
  /** chance de dropar alguma coisa, 0 a 1 */
  chanceDrop: number;
}

/**
 * Os sete monstros processados da pasta `public/assets/Monstros`.
 *
 * A escala de dano acompanha a profundidade em que o bicho aparece:
 *
 *   rasteiro  2-3   nivel -1 e -2
 *   padrao    4-5   nivel -2 e -3
 *   drone     4     nivel -3 (rapido, aggro longo, pouco HP)
 *   pesado    6-8   nivel -3 e -4
 *
 * Nenhum passa de 8: com 30 de vida, o pior encontro possivel (dois pesados
 * juntos) ainda da ao jogador quatro golpes de margem pra recuar.
 */
export const CATALOGO_INIMIGOS: Record<string, DefinicaoInimigo> = {
  /** `deadly ball.png` — esfera de tracao com serra. Rapida, fragil, pouco dano. */
  esfera_choque: {
    id: 'esfera_choque', nome: 'Esfera de Choque', arquetipo: 'rasteiro',
    hpMax: 6, dano: 2, velocidade: 3.2, velocidadePatrulha: 1.4,
    raioAggro: 4.5, raioDesistencia: 7, alcanceAtaque: 0.9, recargaAtaque: 900,
    duracaoAtingido: 220, alturaTiles: 1.1, tabelaDrop: 'nivel_1', chanceDrop: 0.55,
  },
  /** `SmatFone.png` — corpo estreito e alto. O mais rapido; aggro longo. */
  smartfone: {
    id: 'smartfone', nome: 'Aparelho Tomado', arquetipo: 'drone',
    hpMax: 8, dano: 3, velocidade: 3.6, velocidadePatrulha: 1.8,
    raioAggro: 7, raioDesistencia: 10, alcanceAtaque: 1, recargaAtaque: 800,
    duracaoAtingido: 200, alturaTiles: 1.3, tabelaDrop: 'nivel_3', chanceDrop: 0.5,
  },
  /** `Printer.png` — garras e papel. O inimigo padrao da galeria das turbinas. */
  impressora: {
    id: 'impressora', nome: 'Impressora Arisca', arquetipo: 'padrao',
    hpMax: 12, dano: 4, velocidade: 2.4, velocidadePatrulha: 1.1,
    raioAggro: 5, raioDesistencia: 8, alcanceAtaque: 1.1, recargaAtaque: 1000,
    duracaoAtingido: 260, alturaTiles: 1.4, tabelaDrop: 'nivel_2', chanceDrop: 0.6,
  },
  /** `sound box.png` — o de maior aggro: ele OUVE mais longe do que ve. */
  caixa_som: {
    id: 'caixa_som', nome: 'Caixa de Som', arquetipo: 'padrao',
    hpMax: 14, dano: 5, velocidade: 2.2, velocidadePatrulha: 1,
    raioAggro: 8, raioDesistencia: 11, alcanceAtaque: 1.2, recargaAtaque: 1100,
    duracaoAtingido: 280, alturaTiles: 1.5, tabelaDrop: 'nivel_3', chanceDrop: 0.6,
  },
  /** `Roboot.png` — robo de servico quebrado. Meio de tudo. */
  robo_servico: {
    id: 'robo_servico', nome: 'Robo de Servico', arquetipo: 'padrao',
    hpMax: 16, dano: 5, velocidade: 2, velocidadePatrulha: 1,
    raioAggro: 5.5, raioDesistencia: 9, alcanceAtaque: 1.2, recargaAtaque: 1050,
    duracaoAtingido: 280, alturaTiles: 1.5, tabelaDrop: 'nivel_2', chanceDrop: 0.65,
  },
  /** `washing machine.png` — pesado. Lento, duro e o que mais dói. */
  maquina_lavar: {
    id: 'maquina_lavar', nome: 'Maquina Pesada', arquetipo: 'pesado',
    hpMax: 26, dano: 7, velocidade: 1.5, velocidadePatrulha: 0.7,
    raioAggro: 4.5, raioDesistencia: 7.5, alcanceAtaque: 1.4, recargaAtaque: 1400,
    duracaoAtingido: 340, alturaTiles: 1.8, tabelaDrop: 'nivel_3', chanceDrop: 0.75,
  },
  /** `Ice_monster.png` — o mais forte do setor profundo. */
  geladeira_gelo: {
    id: 'geladeira_gelo', nome: 'Camara Fria', arquetipo: 'pesado',
    hpMax: 32, dano: 8, velocidade: 1.6, velocidadePatrulha: 0.7,
    raioAggro: 5, raioDesistencia: 8, alcanceAtaque: 1.4, recargaAtaque: 1500,
    duracaoAtingido: 360, alturaTiles: 1.9, tabelaDrop: 'nivel_4', chanceDrop: 0.8,
  },
};

export function buscarInimigo(id: unknown): DefinicaoInimigo | null {
  return typeof id === 'string' ? (CATALOGO_INIMIGOS[id] ?? null) : null;
}

// ---------------------------------------------------------------- ataque --
/**
 * A CHAVE INGLESA — o primeiro (e por ora unico) ataque do jogador.
 *
 * Cabe no personagem: ele e tecnico, e o que ele tem na mao e ferramenta de
 * manutencao. Nao ha arvore de habilidade, armadura nem combo — so um golpe com
 * trava de animacao, que e o minimo pra combate existir sem virar outro jogo.
 */
export const ATAQUE_DO_JOGADOR = {
  /** dano por golpe */
  dano: 4,
  /** duracao da animacao/trava, em ms — enquanto isso o jogador nao anda */
  duracao: 260,
  /** intervalo minimo entre dois golpes, em ms. Maior que a duracao: e o que
   *  impede segurar a tecla e virar metralhadora. */
  recarga: 460,
  /** alcance a frente do jogador, em tiles */
  alcance: 1.5,
  /** meia-largura da area de golpe, em tiles (o golpe pega um arco, nao um fio) */
  meiaLargura: 0.9,
  /** empurrao aplicado no inimigo atingido, em tiles por segundo */
  empurrao: 5,
} as const;

/** Empurrao que o inimigo aplica no JOGADOR ao acertar, em tiles por segundo. */
export const EMPURRAO_DO_INIMIGO = 4.5;

// ---------------------------------------------------------------- IA --
export interface EstadoRuntimeInimigo {
  id: string;
  tipo: string;
  hp: number;
  estado: EstadoInimigo;
  x: number;
  y: number;
  direcao: Direcao;
  /** centro da area de patrulha, em tiles */
  ancora: { x: number; y: number };
  raioPatrulha: number;
  /** alvo de patrulha atual */
  alvo: { x: number; y: number } | null;
  /** ms restantes de recarga do golpe */
  recarga: number;
  /** ms restantes da reacao a ser atingido */
  atingido: number;
  /** semente do gerador deterministico deste inimigo */
  semente: number;
}

export interface DecisaoInimigo {
  estado: EstadoInimigo;
  /** para onde ele quer ir, em tiles; null = ficar parado */
  destino: { x: number; y: number } | null;
  /** velocidade a usar, em tiles por segundo */
  velocidade: number;
  /** true no quadro em que o golpe sai (a cena aplica o dano) */
  golpeia: boolean;
}

/** Gerador deterministico por inimigo — mesma tecnica do motor de rotinas. */
function aleatorio(estado: EstadoRuntimeInimigo, min: number, max: number): number {
  estado.semente = (estado.semente * 1664525 + 1013904223) >>> 0;
  return min + (estado.semente / 0x100000000) * (max - min);
}

const distancia = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Um passo da IA.
 *
 * `dificuldade` e o multiplicador de TENSAO da represa (ver `represa.ts`): 1 na
 * chegada, e sobe conforme o jogador demora dentro da usina. Ele mexe em
 * velocidade, alcance de deteccao e cadencia — NAO em dano nem em HP, pra a
 * conta de "quantos golpes eu aguento" continuar previsivel pro jogador.
 *
 * `podeVer` e a linha de visao, injetada pela cena (ela e quem tem o tilemap).
 * Sem ela um inimigo perseguiria atravessando parede.
 */
export function decidirInimigo(
  estado: EstadoRuntimeInimigo,
  def: DefinicaoInimigo,
  jogador: { x: number; y: number } | null,
  deltaMs: number,
  dificuldade = 1,
  podeVer: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean = () => true,
): DecisaoInimigo {
  if (estado.recarga > 0) estado.recarga = Math.max(0, estado.recarga - deltaMs);
  if (estado.atingido > 0) estado.atingido = Math.max(0, estado.atingido - deltaMs);

  if (estado.hp <= 0) {
    estado.estado = 'morto';
    return { estado: 'morto', destino: null, velocidade: 0, golpeia: false };
  }
  // Reacao ao golpe: ele PARA. E o que da a janela de recuo pro jogador e o que
  // impede o pesado de empurrar o jogador contra a parede sem parar.
  if (estado.atingido > 0) {
    estado.estado = 'atingido';
    return { estado: 'atingido', destino: null, velocidade: 0, golpeia: false };
  }

  const aggro = def.raioAggro * dificuldade;
  const desiste = def.raioDesistencia * dificuldade;
  const dist = jogador ? distancia(estado, jogador) : Infinity;
  const perseguindo = estado.estado === 'perseguindo' || estado.estado === 'atacando';
  // histerese: entra em perseguicao dentro de `aggro`, so sai passando de
  // `desiste`. E o que impede o tremor no limite do circulo.
  const querPerseguir = jogador !== null
    && (perseguindo ? dist <= desiste : dist <= aggro && podeVer(estado, jogador));

  if (querPerseguir && jogador) {
    if (dist <= def.alcanceAtaque) {
      estado.estado = 'atacando';
      if (estado.recarga > 0) {
        return { estado: 'atacando', destino: null, velocidade: 0, golpeia: false };
      }
      // a recarga encurta com a tensao, mas nunca abaixo de 45% do valor base
      estado.recarga = Math.max(def.recargaAtaque * 0.45, def.recargaAtaque / dificuldade);
      return { estado: 'atacando', destino: null, velocidade: 0, golpeia: true };
    }
    estado.estado = 'perseguindo';
    return {
      estado: 'perseguindo',
      destino: { x: jogador.x, y: jogador.y },
      velocidade: def.velocidade * dificuldade,
      golpeia: false,
    };
  }

  // Perdeu o jogador: volta pra area. Nao fica onde parou — senao o mapa vai
  // esvaziando de bicho perto da porta e enchendo perto de onde o jogador fugiu.
  const longeDaAncora = distancia(estado, estado.ancora) > estado.raioPatrulha;
  if (longeDaAncora) {
    estado.estado = 'alerta';
    return {
      estado: 'alerta',
      destino: { x: estado.ancora.x, y: estado.ancora.y },
      velocidade: def.velocidade * 0.8,
      golpeia: false,
    };
  }

  if (!estado.alvo || distancia(estado, estado.alvo) < 0.25) {
    estado.alvo = {
      x: estado.ancora.x + aleatorio(estado, -estado.raioPatrulha, estado.raioPatrulha),
      y: estado.ancora.y + aleatorio(estado, -estado.raioPatrulha, estado.raioPatrulha),
    };
  }
  estado.estado = 'patrulha';
  return {
    estado: 'patrulha',
    destino: estado.alvo,
    velocidade: def.velocidadePatrulha,
    golpeia: false,
  };
}

/** Cria o runtime de um inimigo a partir do objeto do tilemap. */
export function criarRuntimeInimigo(
  id: string,
  tipo: string,
  x: number,
  y: number,
  raioPatrulha: number,
): EstadoRuntimeInimigo {
  const def = CATALOGO_INIMIGOS[tipo];
  if (!def) throw new Error(`[inimigos] tipo desconhecido: "${tipo}"`);
  return {
    id,
    tipo,
    hp: def.hpMax,
    estado: 'parado',
    x,
    y,
    direcao: 'down',
    ancora: { x, y },
    raioPatrulha: Math.max(1, raioPatrulha),
    alvo: null,
    recarga: 0,
    atingido: 0,
    semente: [...id].reduce((n, letra) => (n * 31 + letra.charCodeAt(0)) >>> 0, 7),
  };
}

/**
 * Aplica dano num inimigo. Devolve se ele morreu NESTE golpe — a cena usa isso
 * pra dropar uma vez e nao uma por quadro de sobreposicao.
 */
export function ferirInimigo(
  estado: EstadoRuntimeInimigo,
  def: DefinicaoInimigo,
  dano: number,
): { aplicado: number; morreu: boolean } {
  if (estado.hp <= 0) return { aplicado: 0, morreu: false };
  const aplicado = Math.min(estado.hp, Math.max(0, Math.floor(dano)));
  estado.hp -= aplicado;
  if (estado.hp <= 0) {
    estado.estado = 'morto';
    return { aplicado, morreu: true };
  }
  estado.atingido = def.duracaoAtingido;
  estado.estado = 'atingido';
  return { aplicado, morreu: false };
}

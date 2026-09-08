import { ANDARES_COMPOSTOS } from './andares.ts';

export interface DefinicaoMapa {
  /** chave usada em `estado.mapa` e na propriedade `destino` das portas */
  chave: string;
  /** key do this.load.tilemapTiledJSON no BootScene */
  tilemapKey: string;
  /** caminho do JSON dentro de public/ */
  arquivo: string;
  /** nome do tileset DENTRO do JSON do Tiled */
  tilesetNoJson: string;
  /** key do this.load.image do PNG do tileset */
  tilesetKey: string;
  /**
   * Onde o player nasce quando ninguem diz de onde ele veio, em TILES.
   * A cena converte pra pixel com o tamanho de tile lido do tilemap, entao
   * mudar a resolucao do tile nao mexe aqui.
   */
  spawnTile: { x: number; y: number };
  /**
   * true nos quatro mapas de MUNDO ABERTO, false nos interiores.
   *
   * O que depende disso: as zonas de transicao entre mapas (`bordas`) so
   * existem em mapa externo, e o mapa da cidade (tecla M) so faz sentido sobre
   * um deles.
   */
  externo: boolean;
  /**
   * Pra um INTERIOR, o mapa externo a que ele pertence — e o que o mapa da
   * cidade usa pra saber que planta desenhar quando o jogador esta dentro de um
   * predio. Nos externos, e a propria chave.
   */
  mapaExterno: string;
  /**
   * CARREGA SOB DEMANDA: o tilemap nao entra no `preload` do BootScene; a cena de
   * mundo o busca quando o jogador chega nele.
   *
   * Existe pelos quarenta e cinco andares novos da represa. Somados, os tilemaps
   * deles passam de um megabyte de JSON — carregar tudo no boot atrasaria a
   * abertura do jogo pra quem nunca desceu na usina, e manter os cinquenta em
   * memoria e exatamente o que a Parte 51 do plano proibe. Ver `garantirTilemap`
   * na FarmScene.
   */
  sobDemanda?: boolean;
}

/** Todo mapa sai do mesmo gerador, entao key e arquivo derivam da chave. */
function mapa(
  chave: string,
  spawnTile: { x: number; y: number },
  mapaExterno: string,
): DefinicaoMapa {
  return {
    chave,
    tilemapKey: `${chave}-map`,
    arquivo: `assets/tilemaps/${chave}.json`,
    tilesetNoJson: 'terrain',
    tilesetKey: 'tiles-terrain',
    spawnTile,
    externo: mapaExterno === chave,
    mapaExterno,
  };
}

/**
 * Mapa externo usado como ultimo recurso quando `estado.mapa` nao esta em
 * `MAPAS` — o BootScene ja barra esse caso ao aplicar o save, entao isto so
 * cobre um estado impossivel sem espalhar `null` pela cena.
 *
 * NAO e mais "o mapa dos NPCs": cada NPC declara o seu em `DefinicaoNpc.mapa`,
 * e o motor de rotinas move os 33 nos tres mapas.
 */
export const MAPA_PADRAO = 'farm';

/** O interior da casa+oficina do protagonista: onde se dorme, salva e usa o PC. */
export const MAPA_DA_CASA = 'oficina';

/**
 * Tile de entrada de todo interior: um acima da porta de saida. Sao os
 * `{ porta, altura - 2 }` das plantas em tools/gerar-assets.mjs, que e a mesma
 * conta de `entradaDoInterior` la. `npm run verificar-mapas` compara os dois
 * lados e reprova se divergirem.
 */
export const MAPAS: Record<string, DefinicaoMapa> = {
  // ------------------------------------------------------------- externos --
  // Mapa 1 — a cidade original. Spawn no centro, em cima do cruzamento.
  farm: mapa('farm', { x: 60, y: 45 }, 'farm'),
  // Mapa 2 — Bairro da Estacao, a oeste do Mapa 1. E onde mora o protagonista,
  // e por isso o spawn padrao dele e a porta da casa+oficina: jogo novo comeca
  // aqui (ver `estado.mapa`).
  bairro: mapa('bairro', { x: 80, y: 39 }, 'bairro'),
  // Mapa 3 — Zona Rural, a LESTE do Mapa 1 na topologia nova.
  rural: mapa('rural', { x: 3, y: 44 }, 'rural'),
  // Mapa 4 — Estrada da Represa, ao NORTE do Mapa 1. Entra pela borda sul e
  // sobe: o spawn padrao e a boca da estrada, nao o meio do mapa.
  represa: mapa('represa', { x: 40, y: 136 }, 'represa'),

  // ----------------------------------------------- interiores do Mapa 1 --
  // A casa_1 (casinha inicial do protagonista) NAO esta mais aqui: o predio
  // continua de pe no mapa, mas a porta nao abre e nao ha interior — ver a
  // migracao pro lote `oficina` do Mapa 2.
  casa_2: mapa('casa_2', { x: 11, y: 16 }, 'farm'), // 22x18, corredor central
  casa_3: mapa('casa_3', { x: 11, y: 16 }, 'farm'), // 22x18, sala na frente
  casa_4: mapa('casa_4', { x: 5, y: 18 }, 'farm'), // 22x20, corredor horizontal
  casa_5: mapa('casa_5', { x: 5, y: 16 }, 'farm'), // 20x18, dividida ao meio
  casa_6: mapa('casa_6', { x: 10, y: 14 }, 'farm'), // 22x16, hall central

  // interiores de comercio: a porta de saida fica no meio da parede de baixo,
  // entao a entrada e um tile acima dela (o salao e mais largo que uma casa)
  mercado: mapa('mercado', { x: 11, y: 13 }, 'farm'),
  academia: mapa('academia', { x: 9, y: 10 }, 'farm'),

  // interiores MISTOS (casa + comercio no mesmo mapa, 20x14): a faixa oeste e a
  // moradia do dono, dividida em quarto/corredor/sala e fechada por uma porta
  // somente-NPC; a leste fica o salao, que e onde o jogador entra e circula.
  bar: mapa('bar', { x: 10, y: 12 }, 'farm'),
  farmacia: mapa('farmacia', { x: 10, y: 12 }, 'farm'),

  // ----------------------------------------------- interiores do Mapa 2 --
  // Casa + oficina do protagonista (34x22): quarto, cozinha, banheiro, sala,
  // oficina e tres comodos de EXPANSAO comprados na madeireira do Mapa 3.
  oficina: mapa('oficina', { x: 12, y: 20 }, 'bairro'),
  escola: mapa('escola', { x: 12, y: 14 }, 'bairro'), // 24x16, hall + 3 salas
  biblioteca: mapa('biblioteca', { x: 11, y: 13 }, 'bairro'), // 22x15, acervo + leitura

  // Casas ocupadas do Bairro da Estacao. As entradas acompanham a porta e a
  // geometria individual geradas em `PLANTAS_CASA`.
  casa_b1: mapa('casa_b1', { x: 11, y: 16 }, 'bairro'),
  casa_b2: mapa('casa_b2', { x: 10, y: 16 }, 'bairro'),
  casa_b3: mapa('casa_b3', { x: 5, y: 18 }, 'bairro'),
  casa_b4: mapa('casa_b4', { x: 14, y: 16 }, 'bairro'),
  casa_b5: mapa('casa_b5', { x: 10, y: 14 }, 'bairro'),
  casa_b6: mapa('casa_b6', { x: 10, y: 16 }, 'bairro'),
  casa_b7: mapa('casa_b7', { x: 11, y: 16 }, 'bairro'),
  casa_c1: mapa('casa_c1', { x: 16, y: 18 }, 'bairro'),
  casa_c2: mapa('casa_c2', { x: 5, y: 16 }, 'bairro'),

  // Moradias da Zona Rural.
  casa_rural_1: mapa('casa_rural_1', { x: 11, y: 14 }, 'rural'),
  casa_rural_2: mapa('casa_rural_2', { x: 11, y: 16 }, 'rural'),

  // ----------------------------------------------- interiores do Mapa 4 --
  // Os cinco setores da usina. NAO sao interiores de predio: sao niveis de uma
  // area de exploracao, ligados entre si por alcapao e elevador, com inimigo,
  // sucata, painel de enigma e escuridao por comodo. O que os faz caber no
  // sistema de mapa que ja existia e que eles sao tilemaps com camada
  // `interativos` — a cena nao ganhou caminho novo por causa deles.
  //
  // O `spawnTile` de cada um e o alcapao de chegada. Ele quase nunca e usado:
  // toda porta manda `destinoTx/destinoTy` explicito. Ele existe pro caso de um
  // save antigo apontar pro setor sem coordenada valida.
  represa_0: mapa('represa_0', { x: 14, y: 18 }, 'represa'),
  represa_1: mapa('represa_1', { x: 25, y: 19 }, 'represa'),
  represa_2: mapa('represa_2', { x: 30, y: 18 }, 'represa'),
  represa_3: mapa('represa_3', { x: 16, y: 21 }, 'represa'),
  represa_4: mapa('represa_4', { x: 13, y: 17 }, 'represa'),

  // Os ANDARES 6 a 50 (`represa_f06` .. `represa_f50`). Nao estao escritos um
  // por um: a lista sai de `ANDARES` (src/game/andares.ts), que e o registro
  // central, e o `spawnTile` de cada um e o tile de chegada declarado no template
  // dele. Manter quarenta e cinco linhas aqui em paralelo aquele arquivo seria
  // manter a mesma lista em dois lugares.
  //
  // Todos entram como `sobDemanda`: o tilemap deles chega quando o jogador
  // chega, e nao no boot.
  ...Object.fromEntries(
    ANDARES_COMPOSTOS.map((a) => [
      a.mapa,
      { ...mapa(a.mapa, a.entrada, 'represa'), sobDemanda: true },
    ]),
  ),
};

export function buscarMapa(chave: unknown): DefinicaoMapa | null {
  return typeof chave === 'string' ? (MAPAS[chave] ?? null) : null;
}

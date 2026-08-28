export interface PontoTile {
  x: number;
  y: number;
}

export interface AreaVagar {
  min: PontoTile;
  max: PontoTile;
}

export interface SpriteNpc {
  arquivo: string;
  colunas: number;
  linhas: number;
  frames: Record<'up' | 'down' | 'left' | 'right', { linha: number; colunas: number[] }>;
}

interface AcaoBase {
  /** Minuto absoluto do dia em que a acao fica disponivel. */
  horario: number;
}

export type AcaoRotinaNpc =
  | (AcaoBase & {
      /**
       * Anda pra pontos sorteados dentro de `area`, em linha reta. Nao ha
       * pathfinding: a `area` tem de ser um retangulo INTEIRAMENTE livre, e
       * ai a convexidade garante que qualquer reta entre dois pontos dela
       * tambem e livre. Um retangulo "por cima da cidade" nao serve — passa
       * dentro de casa e de arvore (`npm run verificar-rotinas` reprova).
       * Pra cobrir area nao convexa, use varios turnos de `vagar` ligados por
       * `andar_rota`, ou `vagar_rota` com waypoints.
       */
      tipo: 'vagar';
      area: AreaVagar;
      /**
       * Caminho seguro de dentro da `area` ate o primeiro ponto de `rotaCasa`.
       * O fallback das 18:00 sai em RETA da posicao atual pro primeiro ponto
       * que receber, entao sem isto a volta pra casa depende de `rotaCasa[0]`
       * ser alcancavel em reta de qualquer canto da area — o que amarra a
       * definicao a qual acao ficou por ultimo no dia. Com o caminho aqui, o
       * primeiro ponto fica DENTRO da area (a reta ate ele e livre pela
       * convexidade) e o resto e uma rota explicita. Mesmo papel que
       * `rotasRetorno` faz pra `vagar_rota`.
       */
      saidaSegura?: PontoTile[];
      pausaMinSegundos?: number;
      pausaMaxSegundos?: number;
    })
  | (AcaoBase & {
      tipo: 'vagar_rota';
      waypoints: PontoTile[];
      /** Caminho seguro do waypoint atual ate a saida da rota. */
      rotasRetorno?: PontoTile[][];
      pausaMinSegundos?: number;
      pausaMaxSegundos?: number;
    })
  | (AcaoBase & { tipo: 'andar_rota'; waypoints: PontoTile[] })
  | (AcaoBase & { tipo: 'entrar_construcao'; construcao: string })
  | (AcaoBase & { tipo: 'sair_construcao'; construcao: string })
  | (AcaoBase & { tipo: 'voltar_para_casa' });

export interface DefinicaoNpc {
  id: string;
  nome: string;
  casa: string;
  posicaoInicial: PontoTile;
  /** Construcao onde o NPC comeca o dia; null = ja esta do lado de fora. */
  dentroInicial: string | null;
  horaAcordar: number;
  dialogoAtual: string[];
  /** Recorte do spritesheet; null usa os sprites do player como placeholder. */
  sprite: SpriteNpc | null;
  /**
   * Folha de POSE PARADA. Sem ela o idle cai no 1o frame da caminhada, que e
   * uma pose de passo — o NPC parado parece estar andando no lugar.
   */
  spriteParado?: SpriteNpc | null;
  tint?: number;
  rotina: AcaoRotinaNpc[];
  /** Rota publica ate a frente da casa, usada pelo fallback global das 18:00. */
  rotaCasa: PontoTile[];
}

interface LocalCidade {
  frente: PontoTile;
  interior: PontoTile;
  portaInterior: PontoTile;
}

export const LOCAIS_CIDADE: Record<string, LocalCidade> = {
  casa_1: { frente: { x: 31.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  casa_2: { frente: { x: 43.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  casa_3: { frente: { x: 75.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  casa_4: { frente: { x: 87.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  casa_5: { frente: { x: 31.5, y: 79.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  casa_6: { frente: { x: 43.5, y: 79.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  mercado: { frente: { x: 70.5, y: 55.5 }, interior: { x: 11.5, y: 9.5 }, portaInterior: { x: 11.5, y: 13.5 } },
  academia: { frente: { x: 53.5, y: 35.5 }, interior: { x: 9.5, y: 8.5 }, portaInterior: { x: 9.5, y: 10.5 } },
  // Mistos (casa + comercio no mesmo interior 20x14): `interior` fica na metade
  // de MORADIA, que e onde o dono nasce — o mesmo papel que (8,8) tem nas casas.
  bar: { frente: { x: 81.5, y: 29.5 }, interior: { x: 4.5, y: 8.5 }, portaInterior: { x: 10.5, y: 12.5 } },
  farmacia: { frente: { x: 85.5, y: 55.5 }, interior: { x: 4.5, y: 8.5 }, portaInterior: { x: 10.5, y: 12.5 } },
};

/**
 * Lotes onde alguem pode morar, na ordem em que aparecem no mapa. Sao as seis
 * casas puras mais os dois predios MISTOS (casa + comercio no mesmo interior):
 * o bar e a farmacia tem cama na metade de moradia, entao contam como moradia
 * disponivel exatamente como `casa_2..casa_6`.
 *
 * Quem define isto de verdade e a camada `zonas` do mapa, no campo `uso`
 * (`moradia` ou `misto` — ver `USOS_DE_MORADIA` em tipos.ts). A lista esta
 * repetida aqui porque a validacao de moradores roda na CARGA do modulo, antes
 * de existir tilemap; `npm run verificar-mapas` confere que as duas nao
 * divergiram.
 */
export const MORADIAS = [
  'casa_1',
  'casa_2',
  'casa_3',
  'casa_4',
  'casa_5',
  'casa_6',
  'bar',
  'farmacia',
] as const;

export const hora = (horas: number, minutos = 0): number => horas * 60 + minutos;

export const NPCS: Record<string, DefinicaoNpc> = {
  morador_1: {
    id: 'morador_1',
    nome: 'Morador 1',
    casa: 'casa_1',
    posicaoInicial: { x: 63.5, y: 48.5 },
    dentroInicial: null,
    horaAcordar: hora(7),
    tint: 0x8fb6ff,
    sprite: null,
    dialogoAtual: ['Oi.', 'Tudo certo por aqui.', 'Ate mais.'],
    rotina: [],
    rotaCasa: [
      { x: 60.5, y: 45.5 },
      { x: 60.5, y: 20.5 },
      { x: 31.5, y: 20.5 },
      { x: 31.5, y: 16.5 },
    ],
  },
  edu: {
    id: 'edu', nome: 'Edu', casa: 'casa_2',
    posicaoInicial: { x: 8.5, y: 8.5 }, dentroInicial: 'casa_2', horaAcordar: hora(7),
    sprite: {
      arquivo: 'assets/sprites/Edu_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Edu_parado_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Fui contratado remoto, entao nem preciso sair de casa...',
      'Mas saio mesmo assim.',
    ],
    rotina: [
      { horario: hora(8), tipo: 'sair_construcao', construcao: 'casa_2' },
      { horario: hora(8), tipo: 'andar_rota', waypoints: [
        { x: 43.5, y: 20.5 }, { x: 60.5, y: 20.5 }, { x: 60.5, y: 45.5 },
      ] },
      { horario: hora(8), tipo: 'vagar_rota', pausaMinSegundos: 1, pausaMaxSegundos: 4,
        waypoints: [
          { x: 99.5, y: 45.5 }, { x: 99.5, y: 71.5 },
          { x: 60.5, y: 71.5 }, { x: 22.5, y: 71.5 },
          { x: 22.5, y: 45.5 }, { x: 22.5, y: 20.5 },
          { x: 60.5, y: 20.5 }, { x: 99.5, y: 20.5 },
          { x: 99.5, y: 45.5 }, { x: 60.5, y: 45.5 },
        ],
        rotasRetorno: [
          [{ x: 99.5, y: 45.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 99.5, y: 71.5 }, { x: 99.5, y: 45.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 60.5, y: 71.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 22.5, y: 71.5 }, { x: 22.5, y: 45.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 22.5, y: 45.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 22.5, y: 20.5 }, { x: 60.5, y: 20.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 60.5, y: 20.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 99.5, y: 20.5 }, { x: 99.5, y: 45.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 99.5, y: 45.5 }, { x: 60.5, y: 45.5 }],
          [{ x: 60.5, y: 45.5 }],
        ] },
    ],
    rotaCasa: [
      { x: 60.5, y: 45.5 }, { x: 60.5, y: 20.5 },
      { x: 43.5, y: 20.5 }, { x: 43.5, y: 16.5 },
    ],
  },
  mari: {
    id: 'mari', nome: 'Mari', casa: 'casa_3',
    posicaoInicial: { x: 8.5, y: 8.5 }, dentroInicial: 'casa_3', horaAcordar: hora(8),
    sprite: {
      arquivo: 'assets/sprites/Mari_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Mari_parada_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: ['Hoje e dia de treino.', 'Quero voltar pra casa perto das 13:00.'],
    rotina: [
      { horario: hora(9), tipo: 'sair_construcao', construcao: 'casa_3' },
      { horario: hora(9), tipo: 'andar_rota', waypoints: [
        { x: 75.5, y: 20.5 }, { x: 60.5, y: 20.5 },
        { x: 60.5, y: 35.5 }, { x: 53.5, y: 35.5 },
      ] },
      { horario: hora(9), tipo: 'entrar_construcao', construcao: 'academia' },
      { horario: hora(9), tipo: 'vagar_rota', pausaMinSegundos: 2, pausaMaxSegundos: 5,
        waypoints: [
          { x: 9.5, y: 9.5 }, { x: 11.5, y: 9.5 },
          { x: 11.5, y: 8.5 }, { x: 9.5, y: 8.5 },
        ] },
      { horario: hora(12, 40), tipo: 'sair_construcao', construcao: 'academia' },
      { horario: hora(12, 40), tipo: 'andar_rota', waypoints: [
        { x: 60.5, y: 35.5 }, { x: 60.5, y: 20.5 },
        { x: 75.5, y: 20.5 }, { x: 75.5, y: 16.5 },
      ] },
      { horario: hora(12, 40), tipo: 'voltar_para_casa' },
    ],
    rotaCasa: [
      { x: 60.5, y: 35.5 }, { x: 60.5, y: 20.5 },
      { x: 75.5, y: 20.5 }, { x: 75.5, y: 16.5 },
    ],
  },
  jaqueline: {
    id: 'jaqueline', nome: 'Jaqueline', casa: 'casa_4',
    posicaoInicial: { x: 8.5, y: 8.5 }, dentroInicial: 'casa_4', horaAcordar: hora(8),
    sprite: {
      arquivo: 'assets/sprites/Jaqueline_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Jaqueline_parada_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Oi! Ja soube? A Mari passou aqui hoje, direto da academia.',
      'Passo o dia atendendo, entao acabo sabendo de tudo — nada de mais, so o movimento.',
      'Precisa de alguma coisa? Se nao tiver no mercado, eu sei quem tem.',
    ],
    rotina: [
      { horario: hora(8, 30), tipo: 'sair_construcao', construcao: 'casa_4' },
      // desce do lote pro anel norte, corta pro hub (60.5,20.5) — o mesmo que
      // Edu e Mari usam — e desce a avenida vertical ate a frente do mercado
      { horario: hora(8, 30), tipo: 'andar_rota', waypoints: [
        { x: 87.5, y: 20.5 }, { x: 60.5, y: 20.5 },
        { x: 60.5, y: 55.5 }, { x: 70.5, y: 55.5 },
      ] },
      { horario: hora(8, 30), tipo: 'entrar_construcao', construcao: 'mercado' },
      // expediente: circuito curto atras do caixa, invisivel e sem interacao
      { horario: hora(8, 30), tipo: 'vagar_rota', pausaMinSegundos: 3, pausaMaxSegundos: 7,
        waypoints: [
          { x: 14.5, y: 12.5 }, { x: 16.5, y: 12.5 },
          { x: 16.5, y: 11.5 }, { x: 14.5, y: 11.5 },
        ] },
      { horario: hora(17), tipo: 'sair_construcao', construcao: 'mercado' },
      { horario: hora(17), tipo: 'andar_rota', waypoints: [
        { x: 60.5, y: 55.5 }, { x: 60.5, y: 20.5 },
        { x: 87.5, y: 20.5 }, { x: 87.5, y: 16.5 },
      ] },
      { horario: hora(17), tipo: 'voltar_para_casa' },
    ],
    rotaCasa: [
      { x: 60.5, y: 55.5 }, { x: 60.5, y: 20.5 },
      { x: 87.5, y: 20.5 }, { x: 87.5, y: 16.5 },
    ],
  },
  leticia: {
    id: 'leticia', nome: 'Leticia', casa: 'casa_5',
    posicaoInicial: { x: 8.5, y: 8.5 }, dentroInicial: 'casa_5', horaAcordar: hora(9, 30),
    sprite: {
      arquivo: 'assets/sprites/leticia_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Leticia_parada_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Sai sem pressa hoje. Sempre saio sem pressa.',
      'A praca fica boa de tarde, quando o calcamento esquenta.',
      'O vento mudou de lado perto do meio-dia. Voce percebeu?',
    ],
    // Sem destino: dois turnos de `vagar`, um na avenida principal e outro na
    // praca do parque, ligados por uma rota. Ver a nota sobre area retangular
    // abaixo de NPCS — o retangulo tem de ser todo livre.
    rotina: [
      { horario: hora(10), tipo: 'sair_construcao', construcao: 'casa_5' },
      // a casa fica entre a porta e o anel sul, entao contorna pela coluna x=34
      { horario: hora(10), tipo: 'andar_rota', waypoints: [
        { x: 34.5, y: 79.5 }, { x: 34.5, y: 71.5 },
        { x: 22.5, y: 71.5 }, { x: 22.5, y: 45.5 },
      ] },
      { horario: hora(10), tipo: 'vagar', pausaMinSegundos: 4, pausaMaxSegundos: 12,
        area: { min: { x: 23.5, y: 44.4 }, max: { x: 97.5, y: 46.6 } } },
      { horario: hora(13), tipo: 'andar_rota', waypoints: [
        { x: 37.5, y: 45.5 }, { x: 37.5, y: 47.5 }, { x: 37.5, y: 52.5 },
      ] },
      { horario: hora(13), tipo: 'vagar', pausaMinSegundos: 6, pausaMaxSegundos: 18,
        area: { min: { x: 33.2, y: 52.2 }, max: { x: 42.8, y: 57.8 } },
        // a praca nao tem saida em reta pra avenida: sobe pela calcada primeiro
        saidaSegura: [
          { x: 37.5, y: 52.5 }, { x: 37.5, y: 47.5 }, { x: 37.5, y: 45.5 },
        ] },
      // o turno da avenida nao precisa de saida: a area toda esta na faixa da
      // via, e o primeiro ponto de `rotaCasa` tambem
    ],
    rotaCasa: [
      { x: 22.5, y: 45.5 }, { x: 22.5, y: 71.5 },
      { x: 34.5, y: 71.5 }, { x: 34.5, y: 79.5 },
    ],
  },
};

export const MORADORES_POR_CASA = Object.fromEntries(
  Object.values(NPCS).map((npc) => [npc.casa, npc.id]),
) as Record<string, string>;

if (Object.keys(MORADORES_POR_CASA).length !== Object.keys(NPCS).length) {
  throw new Error('dois NPCs foram configurados na mesma casa');
}

// Morar em algo que nao e moradia (mercado, academia, parque) nao existe: a
// mesma validacao que impede dois NPCs na mesma casa cobra isto. Bar e farmacia
// passam porque sao MISTOS — tem cama na metade de moradia.
for (const npc of Object.values(NPCS)) {
  if (!(MORADIAS as readonly string[]).includes(npc.casa)) {
    throw new Error(
      `"${npc.id}" mora em "${npc.casa}", que nao e moradia disponivel ` +
        `(esperado um de: ${MORADIAS.join(', ')})`,
    );
  }
  if (!LOCAIS_CIDADE[npc.casa]) {
    throw new Error(`"${npc.id}" mora em "${npc.casa}", que nao existe em LOCAIS_CIDADE`);
  }
}

/** Moradias ainda sem morador — onde o proximo NPC pode ser encaixado. */
export const MORADIAS_VAGAS: readonly string[] = MORADIAS.filter(
  (casa) => !MORADORES_POR_CASA[casa],
);

export function buscarNpc(id: unknown): DefinicaoNpc | null {
  return typeof id === 'string' ? (NPCS[id] ?? null) : null;
}

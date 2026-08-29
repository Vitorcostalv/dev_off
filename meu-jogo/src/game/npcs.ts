import { DIA_DA_SEMANA } from './calendario.ts';
import type { IndiceDiaDaSemana } from './calendario.ts';

export interface PontoTile {
  x: number;
  y: number;
}

export interface AreaVagar {
  min: PontoTile;
  max: PontoTile;
}

/**
 * Postos de uma PRESENCA INTERIOR FIXA. O NPC que mora onde trabalha passa o dia
 * dentro do proprio interior, alternando entre dois lugares pelo relogio.
 *
 * - `trabalho` — atras do balcao, no salao, no horario de funcionamento
 * - `moradia`  — na sala da area privada do mesmo interior, fora do horario
 *
 * A troca NAO e teleporte: ele percorre a espinha do predio
 * (`LOCAIS_CIDADE[casa].rotaEntrePostos`) a pe, atravessando a porta
 * somente-NPC. Quem estiver dentro do predio na hora ve o trajeto inteiro.
 */
export type PostoInterior = 'trabalho' | 'moradia';

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
  | (AcaoBase & {
      /**
       * PRESENCA INTERIOR FIXA: leva o NPC ate um posto DENTRO da propria
       * construcao (`def.casa`), ANDANDO. Nao e troca de posicao: ele segue os
       * waypoints de `LOCAIS_CIDADE[casa].rotaEntrePostos` com o mesmo motor de
       * caminhada das rotas externas, entao a duracao sai da distancia real
       * dentro do interior e a animacao de passo roda normalmente.
       *
       * Enquanto anda, `estado.posto` fica `null` (esta em transito) e vira o
       * posto de destino so na chegada. Ele nao aparece no mapa externo
       * (`visivel` fica false, como em qualquer NPC "dentro"), mas aparece,
       * caminha e conversa quando o jogador esta no interior dele.
       *
       * Os postos sao do PREDIO, nao do NPC: saem de `LOCAIS_CIDADE[casa].postos`,
       * entao qualquer futuro dono do mesmo lote herda as duas posicoes ja
       * conferidas pelo flood-fill do gerador.
       */
      tipo: 'posto_interior';
      posto: PostoInterior;
    })
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
  /**
   * Mora na casa de OUTRO NPC, em vez de ocupar uma moradia propria.
   *
   * O Luke divide a casa_4 com a mae (Jaqueline) e o Vitor divide a casa_6 com
   * o irmao (Hiago). Sem esta marca a validacao de "dois NPCs na mesma casa"
   * reprovaria os dois, e `MORADIAS_VAGAS` passaria a achar que a cidade tem
   * menos casa livre do que tem — quem divide teto nao consome vaga.
   */
  compartilhaCasa?: boolean;
  /**
   * Marca o NPC de PRESENCA INTERIOR FIXA (mora onde trabalha). E so um rotulo
   * declarativo — quem move o NPC e a acao `posto_interior`. A validacao no fim
   * do arquivo cobra que os dois andem juntos: com a marca, a rotina tem de usar
   * `posto_interior` e o lote tem de ter `postos` em `LOCAIS_CIDADE`.
   */
  presencaInteriorFixa?: boolean;
  rotina: AcaoRotinaNpc[];
  /**
   * Rotina que SUBSTITUI `rotina` num dia da semana (0 = segunda). O motor
   * escolhe uma vez por dia, na virada — ver `SistemaRotinasNpc.reiniciar`.
   * E o que da a viagem semanal ao mercado sem espalhar `if` pelo motor.
   */
  rotinaSemanal?: Partial<Record<IndiceDiaDaSemana, AcaoRotinaNpc[]>>;
  /** Rota publica ate a frente da casa, usada pelo fallback global das 18:00. */
  rotaCasa: PontoTile[];
}

interface LocalCidade {
  frente: PontoTile;
  interior: PontoTile;
  portaInterior: PontoTile;
  /**
   * Postos de presenca interior fixa, quando o predio tem moradia junto do
   * comercio (os lotes MISTOS). Sao coordenadas do INTERIOR, e as mesmas que
   * `conferirMistos()` em tools/gerar-assets.mjs exige alcancaveis — o de
   * trabalho pelo JOGADOR (fica no salao) e o de moradia so pelo NPC (fica atras
   * da porta somente-NPC). Mexer numa ponta sem a outra reprova na geracao.
   */
  postos?: Record<PostoInterior, PontoTile>;
  /**
   * ESPINHA do interior: o caminho que liga o posto de `moradia` ao de
   * `trabalho`, escrito nessa ordem. E por ela que o dono ANDA quando troca de
   * posto — atravessando a porta somente-NPC no meio, que e parede pro jogador.
   *
   * O motor nao faz pathfinding: ele entra na espinha pelo waypoint mais proximo
   * da posicao atual e segue ate a ponta (ver `rotaAtePosto` em rotinasNpc.ts).
   * Por isso a espinha e uma polilinha simples, sem se dobrar sobre si mesma, e
   * passa pela frente da porta da rua — assim sair de tras do balcao, do quarto
   * ou de quem acabou de entrar da rua usa sempre o mesmo corredor.
   */
  rotaEntrePostos?: PontoTile[];
  /**
   * Caminho interno a percorrer ANTES da porta, ao sair do predio. A reta do
   * ponto onde o NPC esta ate a porta atravessa parede e mobilia em quase todo
   * interior multi-comodo, e o motor nao faz pathfinding: sem isto o morador
   * sairia por dentro do sofa.
   *
   * Vale a partir de onde o NPC comeca o dia (`interior`) ou, nos mistos, do
   * posto de MORADIA — que e de onde as saidas acontecem (a viagem semanal sai
   * antes de abrir a loja). A conferencia dos 7 dias em `verificar-rotinas`
   * amostra a posicao contra a grade do interior, entao um caminho errado aqui
   * reprova la.
   */
  corredorInterior?: PontoTile[];
}

/**
 * ESPINHA dos predios mistos, de `moradia` (na sala dos fundos) ate `trabalho`
 * (atras do balcao). Os dois lotes saem da MESMA planta privada — ver
 * `PLANTA_MISTO_BASE` em tools/gerar-assets.mjs —, entao a espinha e uma so, e
 * qualquer lote misto novo herda o percurso junto com a planta.
 */
const ESPINHA_MISTO: PontoTile[] = [
  { x: 5.5, y: 11.5 }, // posto de moradia, na sala dos fundos
  { x: 3.5, y: 11.5 },
  { x: 3.5, y: 8.5 }, // corredor da moradia, ja alinhado com a porta privada
  { x: 9.5, y: 8.5 }, // PORTA SOMENTE-NPC: o jogador bate aqui, o dono passa
  { x: 10.5, y: 8.5 }, // primeiro tile do salao
  { x: 10.5, y: 5.5 }, // sobe pela coluna livre, por fora do balcao
  { x: 13.5, y: 5.5 }, // posto de trabalho, do lado de dentro do balcao
];

/**
 * Saida de um predio misto: da sala dos fundos ate a frente da porta da rua,
 * pelo mesmo corredor e pela mesma porta privada da espinha.
 */
const CORREDOR_SAIDA_MISTO: PontoTile[] = [
  { x: 3.5, y: 11.5 },
  { x: 3.5, y: 8.5 },
  { x: 9.5, y: 8.5 },
  { x: 10.5, y: 8.5 },
  { x: 10.5, y: 12.5 },
];

export const LOCAIS_CIDADE: Record<string, LocalCidade> = {
  // casa_1 e a unica com o salao unico 16x12 do inicio do projeto.
  casa_1: { frente: { x: 31.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 }, portaInterior: { x: 8.5, y: 10.5 } },
  // As cinco casas de NPC viraram plantas multi-comodo, cada uma com porta,
  // tamanho e disposicao propria (ver `PLANTAS_CASA` em tools/gerar-assets.mjs).
  // `interior` e o tile em que o morador comeca o dia — sempre na sala, e sempre
  // alinhado com o vao por onde ele sai, pra `corredorInterior` ser uma reta.
  casa_2: {
    frente: { x: 43.5, y: 16.5 },
    interior: { x: 14.5, y: 6.5 },
    portaInterior: { x: 11.5, y: 16.5 },
    // sala -> vao (12,6) -> corredor central -> porta
    corredorInterior: [{ x: 11.5, y: 6.5 }],
  },
  casa_3: {
    frente: { x: 75.5, y: 16.5 },
    interior: { x: 11.5, y: 14.5 },
    portaInterior: { x: 11.5, y: 16.5 },
    // a sala da frente ja e a circulacao: desce reto ate a porta
  },
  casa_4: {
    frente: { x: 87.5, y: 16.5 },
    interior: { x: 5.5, y: 15.5 },
    portaInterior: { x: 5.5, y: 18.5 },
  },
  casa_5: {
    frente: { x: 31.5, y: 79.5 },
    interior: { x: 5.5, y: 14.5 },
    portaInterior: { x: 5.5, y: 16.5 },
  },
  casa_6: {
    frente: { x: 43.5, y: 79.5 },
    interior: { x: 16.5, y: 12.5 },
    portaInterior: { x: 10.5, y: 14.5 },
    // sala -> vao (13,12) -> hall -> porta
    corredorInterior: [{ x: 10.5, y: 12.5 }],
  },
  mercado: { frente: { x: 70.5, y: 55.5 }, interior: { x: 11.5, y: 9.5 }, portaInterior: { x: 11.5, y: 13.5 } },
  academia: { frente: { x: 53.5, y: 35.5 }, interior: { x: 9.5, y: 8.5 }, portaInterior: { x: 9.5, y: 10.5 } },
  // Mistos (casa + comercio no mesmo interior 20x14): `interior` fica na sala da
  // area PRIVADA, atras da porta somente-NPC — e onde o dono nasce e onde ele
  // volta fora do horario de funcionamento. Os dois lotes usam a mesma planta,
  // entao os postos e a espinha coincidem.
  bar: {
    frente: { x: 81.5, y: 29.5 },
    interior: { x: 5.5, y: 11.5 },
    portaInterior: { x: 10.5, y: 12.5 },
    postos: { trabalho: { x: 13.5, y: 5.5 }, moradia: { x: 5.5, y: 11.5 } },
    rotaEntrePostos: ESPINHA_MISTO,
    corredorInterior: CORREDOR_SAIDA_MISTO,
  },
  farmacia: {
    frente: { x: 85.5, y: 55.5 },
    interior: { x: 5.5, y: 11.5 },
    portaInterior: { x: 10.5, y: 12.5 },
    postos: { trabalho: { x: 13.5, y: 5.5 }, moradia: { x: 5.5, y: 11.5 } },
    rotaEntrePostos: ESPINHA_MISTO,
    corredorInterior: CORREDOR_SAIDA_MISTO,
  },
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
    posicaoInicial: { x: 14.5, y: 6.5 }, dentroInicial: 'casa_2', horaAcordar: hora(7),
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
    posicaoInicial: { x: 11.5, y: 14.5 }, dentroInicial: 'casa_3', horaAcordar: hora(8),
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
    posicaoInicial: { x: 5.5, y: 15.5 }, dentroInicial: 'casa_4', horaAcordar: hora(8),
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
    posicaoInicial: { x: 5.5, y: 14.5 }, dentroInicial: 'casa_5', horaAcordar: hora(9, 30),
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
  // ------------------------------------------------------------------------
  // PRESENCA INTERIOR FIXA: os dois donos dos lotes MISTOS. Eles moram onde
  // trabalham, entao passam o dia dentro do proprio interior, indo A PE do posto
  // de moradia (na area privada) ate o de trabalho (atras do balcao) e de volta,
  // atravessando a porta somente-NPC. O jogador so os encontra entrando no
  // predio; no mapa externo eles nao existem.
  //
  // A excecao e a viagem semanal ao mercado, que e o unico dia em que aparecem
  // la fora. Ela vem de `rotinaSemanal`, entao o motor nao precisa saber nada
  // sobre dia da semana alem de escolher a lista na virada do dia.
  wendel: {
    id: 'wendel', nome: 'Wendel', casa: 'farmacia',
    posicaoInicial: { x: 5.5, y: 11.5 }, dentroInicial: 'farmacia', horaAcordar: hora(7),
    presencaInteriorFixa: true,
    // a arte grafa "Wendeu"; o personagem e Wendel (ver processar-sprites-npc)
    sprite: {
      arquivo: 'assets/sprites/Wendeu_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Wendeu_parado_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Boa tarde. Antes de qualquer coisa: leia a bula. Sempre.',
      'Isto que chamam de "remedio pra dor de cabeca" e um analgesico simples. ' +
        'Faz efeito em uns quarenta minutos, uma hora se voce comeu bem antes.',
      'Receita nao precisa. Agua precisa, e um copo cheio — e a parte que todo mundo esquece.',
    ],
    // farmacia abre as 09:00 e fecha as 18:00
    rotina: [
      { horario: hora(9), tipo: 'posto_interior', posto: 'trabalho' },
      { horario: hora(18), tipo: 'posto_interior', posto: 'moradia' },
    ],
    rotinaSemanal: {
      // Quarta: em vez de abrir as 09:00, ele desce pro mercado. A faixa y=55.5
      // e a mesma lane de aproximacao que a Jaqueline usa pra chegar na porta do
      // mercado — a farmacia fica no mesmo corredor, so mais a leste.
      [DIA_DA_SEMANA.quarta]: [
        { horario: hora(9), tipo: 'sair_construcao', construcao: 'farmacia' },
        { horario: hora(9), tipo: 'andar_rota', waypoints: [{ x: 70.5, y: 55.5 }] },
        { horario: hora(9), tipo: 'entrar_construcao', construcao: 'mercado' },
        // expediente curto e do outro lado do salao: a Jaqueline trabalha em
        // x=14..16, entao a visita fica em x=6..8 e os dois nao se sobrepoem
        { horario: hora(9), tipo: 'vagar_rota', pausaMinSegundos: 3, pausaMaxSegundos: 8,
          waypoints: [{ x: 6.5, y: 11.5 }, { x: 8.5, y: 11.5 }] },
        { horario: hora(9, 45), tipo: 'sair_construcao', construcao: 'mercado' },
        { horario: hora(9, 45), tipo: 'andar_rota', waypoints: [{ x: 85.5, y: 55.5 }] },
        { horario: hora(9, 45), tipo: 'voltar_para_casa' },
        // a farmacia abre atrasada neste dia, e ai segue igual
        { horario: hora(10), tipo: 'posto_interior', posto: 'trabalho' },
        { horario: hora(18), tipo: 'posto_interior', posto: 'moradia' },
      ],
    },
    rotaCasa: [
      { x: 70.5, y: 55.5 }, { x: 85.5, y: 55.5 },
    ],
  },
  alice: {
    id: 'alice', nome: 'Alice', casa: 'bar',
    posicaoInicial: { x: 5.5, y: 11.5 }, dentroInicial: 'bar', horaAcordar: hora(9),
    presencaInteriorFixa: true,
    sprite: {
      arquivo: 'assets/sprites/Alice_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Alice_parada_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Oi! Senta ai, vai. Ninguem fica de pe no meu balcao.',
      'Voce e novo por aqui, ne? Uma semana e eu ja sei o nome de todo mundo — ' +
        'e quem bebe o que, mas isso eu nao conto.',
      'Conversa e de graca. O resto e que custa.',
    ],
    // bar abre as 12:00 e fecha as 20:00
    rotina: [
      { horario: hora(12), tipo: 'posto_interior', posto: 'trabalho' },
      { horario: hora(20), tipo: 'posto_interior', posto: 'moradia' },
    ],
    rotinaSemanal: {
      // Sexta: antes de abrir, ela vai ao mercado. O bar fica ao norte, entao a
      // rota desce pela coluna x=81.5 ate a avenida horizontal e pega o hub
      // (60.5,45.5) -> (60.5,55.5), o mesmo caminho que Edu, Mari e Jaqueline
      // usam pra cruzar a cidade. A ida e a volta sao 57 tiles cada, o que da
      // meia hora de jogo por perna: o bar abre bem depois do normal.
      [DIA_DA_SEMANA.sexta]: [
        { horario: hora(12), tipo: 'sair_construcao', construcao: 'bar' },
        { horario: hora(12), tipo: 'andar_rota', waypoints: [
          { x: 81.5, y: 45.5 }, { x: 60.5, y: 45.5 },
          { x: 60.5, y: 55.5 }, { x: 70.5, y: 55.5 },
        ] },
        { horario: hora(12), tipo: 'entrar_construcao', construcao: 'mercado' },
        { horario: hora(12), tipo: 'vagar_rota', pausaMinSegundos: 3, pausaMaxSegundos: 8,
          waypoints: [{ x: 6.5, y: 11.5 }, { x: 8.5, y: 11.5 }] },
        { horario: hora(13, 5), tipo: 'sair_construcao', construcao: 'mercado' },
        { horario: hora(13, 5), tipo: 'andar_rota', waypoints: [
          { x: 60.5, y: 55.5 }, { x: 60.5, y: 45.5 },
          { x: 81.5, y: 45.5 }, { x: 81.5, y: 29.5 },
        ] },
        { horario: hora(13, 5), tipo: 'voltar_para_casa' },
        { horario: hora(13, 45), tipo: 'posto_interior', posto: 'trabalho' },
        { horario: hora(20), tipo: 'posto_interior', posto: 'moradia' },
      ],
    },
    rotaCasa: [
      { x: 60.5, y: 55.5 }, { x: 60.5, y: 45.5 },
      { x: 81.5, y: 45.5 }, { x: 81.5, y: 29.5 },
    ],
  },
  // ------------------------------------------------------------------------
  // MORADORES QUE DIVIDEM TETO. Nenhum deles ocupa moradia propria (ver
  // `compartilhaCasa`): o Luke mora com a mae e o Vitor mora com o irmao. Sao
  // entradas declarativas como as outras — nao ha uma linha de codigo por NPC.

  // Luke, 12 anos, filho da Jaqueline. Sem trabalho e sem horario: sai depois
  // da mae, roda a avenida de manha e passa a tarde no playground do parque.
  // As duas areas de `vagar` sao as MESMAS que a Leticia usa, ja aprovadas pelo
  // verificador de rotinas — area nova exigiria conferir convexidade de novo.
  luke: {
    id: 'luke', nome: 'Luke', casa: 'casa_4', compartilhaCasa: true,
    posicaoInicial: { x: 6.5, y: 15.5 }, dentroInicial: 'casa_4', horaAcordar: hora(9),
    sprite: {
      arquivo: 'assets/sprites/Luke_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Luke_parado_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Oi! Voce tambem ta de folga hoje?',
      'Minha mae fica no mercado o dia inteiro, entao eu fico por ai.',
      'Ja viu o balanco novo do parque? Da pra ir BEM alto.',
    ],
    rotina: [
      { horario: hora(9, 30), tipo: 'sair_construcao', construcao: 'casa_4' },
      // desce do lote pro anel norte e pega a avenida vertical, o mesmo caminho
      // que a mae faz pro mercado — ele so nao entra
      { horario: hora(9, 30), tipo: 'andar_rota', waypoints: [
        { x: 87.5, y: 20.5 }, { x: 60.5, y: 20.5 }, { x: 60.5, y: 45.5 },
      ] },
      { horario: hora(9, 30), tipo: 'vagar', pausaMinSegundos: 3, pausaMaxSegundos: 9,
        area: { min: { x: 23.5, y: 44.4 }, max: { x: 97.5, y: 46.6 } } },
      { horario: hora(13), tipo: 'andar_rota', waypoints: [
        { x: 37.5, y: 45.5 }, { x: 37.5, y: 47.5 }, { x: 37.5, y: 52.5 },
      ] },
      // tarde no parque: e a ancora visual do "brincar no parque" — o
      // playground fica no lado leste do calcamento (ver PECAS_PARQUE)
      { horario: hora(13), tipo: 'vagar', pausaMinSegundos: 4, pausaMaxSegundos: 14,
        area: { min: { x: 33.2, y: 52.2 }, max: { x: 42.8, y: 57.8 } },
        saidaSegura: [
          { x: 37.5, y: 52.5 }, { x: 37.5, y: 47.5 }, { x: 37.5, y: 45.5 },
        ] },
    ],
    rotaCasa: [
      { x: 60.5, y: 45.5 }, { x: 60.5, y: 20.5 },
      { x: 87.5, y: 20.5 }, { x: 87.5, y: 16.5 },
    ],
  },

  // Hiago, 26, entregador de bicicleta. Titular da casa_6 — a ultima que estava
  // vaga. Vive na rua e conhece todo mundo pelo apelido; treina correndo em vez
  // de academia, o que rende implicancia amigavel com a Mari.
  hiago: {
    id: 'hiago', nome: 'Hiago', casa: 'casa_6',
    posicaoInicial: { x: 16.5, y: 12.5 }, dentroInicial: 'casa_6', horaAcordar: hora(6),
    sprite: {
      arquivo: 'assets/sprites/Hiago_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Hiago_parado_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Fala! Tudo certo?',
      'Passo por essa rua umas dez vezes por dia, entao a gente ia se esbarrar de qualquer jeito.',
      'Se precisar levar alguma coisa pra algum lugar, me chama.',
    ],
    rotina: [
      { horario: hora(7), tipo: 'sair_construcao', construcao: 'casa_6' },
      // sobe pela coluna que a Leticia ja usa (x=34.5) e cai na avenida
      { horario: hora(7), tipo: 'andar_rota', waypoints: [
        { x: 34.5, y: 79.5 }, { x: 34.5, y: 71.5 },
        { x: 22.5, y: 71.5 }, { x: 22.5, y: 45.5 },
      ] },
      { horario: hora(7), tipo: 'vagar', pausaMinSegundos: 2, pausaMaxSegundos: 6,
        area: { min: { x: 23.5, y: 44.4 }, max: { x: 97.5, y: 46.6 } } },
    ],
    rotaCasa: [
      { x: 22.5, y: 45.5 }, { x: 22.5, y: 71.5 },
      { x: 34.5, y: 71.5 }, { x: 34.5, y: 79.5 },
    ],
  },

  // Vitor, 29, irmao mais velho do Hiago, divide a casa_6 com ele. Trabalha de
  // noite no bar da Alice e toca nos fins de semana, entao acorda tarde e so
  // aparece na rua no fim da tarde — e o unico NPC que o jogador quase nunca
  // encontra de manha.
  vitor: {
    id: 'vitor', nome: 'Vitor', casa: 'casa_6', compartilhaCasa: true,
    posicaoInicial: { x: 15.5, y: 12.5 }, dentroInicial: 'casa_6', horaAcordar: hora(11),
    sprite: {
      arquivo: 'assets/sprites/Vitor_andando_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    },
    spriteParado: {
      arquivo: 'assets/sprites/Vitor_parado_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0] },
        up: { linha: 1, colunas: [0] },
        left: { linha: 2, colunas: [0] },
        right: { linha: 3, colunas: [0] },
      },
    },
    dialogoAtual: [
      'Opa. Acordei agora, desculpa a cara.',
      'Trabalho no bar, entao meu dia comeca quando o seu ta acabando.',
      'Se aparecer la de noite, eu te sirvo alguma coisa.',
    ],
    rotina: [
      { horario: hora(15), tipo: 'sair_construcao', construcao: 'casa_6' },
      { horario: hora(15), tipo: 'andar_rota', waypoints: [
        { x: 34.5, y: 79.5 }, { x: 34.5, y: 71.5 },
        { x: 22.5, y: 71.5 }, { x: 22.5, y: 45.5 },
      ] },
      { horario: hora(15), tipo: 'vagar', pausaMinSegundos: 6, pausaMaxSegundos: 16,
        area: { min: { x: 23.5, y: 44.4 }, max: { x: 97.5, y: 46.6 } } },
    ],
    rotaCasa: [
      { x: 22.5, y: 45.5 }, { x: 22.5, y: 71.5 },
      { x: 34.5, y: 71.5 }, { x: 34.5, y: 79.5 },
    ],
  },
};

/** So quem OCUPA a moradia entra aqui; quem divide teto (ver `compartilhaCasa`) nao. */
const TITULARES = Object.values(NPCS).filter((npc) => !npc.compartilhaCasa);

export const MORADORES_POR_CASA = Object.fromEntries(
  TITULARES.map((npc) => [npc.casa, npc.id]),
) as Record<string, string>;

if (Object.keys(MORADORES_POR_CASA).length !== TITULARES.length) {
  throw new Error('dois NPCs titulares foram configurados na mesma casa');
}

// quem divide teto tem de dividir com ALGUEM: casa sem titular nao e casa
// compartilhada, e um NPC morando sozinho numa casa que ele nao ocupa some das
// contas de moradia sem ninguem perceber
for (const npc of Object.values(NPCS)) {
  if (npc.compartilhaCasa && !MORADORES_POR_CASA[npc.casa]) {
    throw new Error(`"${npc.id}" divide "${npc.casa}", que nao tem morador titular`);
  }
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

/** Todas as acoes que um NPC pode executar, somando a rotina padrao e as semanais. */
function acoesDe(def: DefinicaoNpc): AcaoRotinaNpc[] {
  return [...def.rotina, ...Object.values(def.rotinaSemanal ?? {}).flat()];
}

/**
 * Coerencia da PRESENCA INTERIOR FIXA. A marca em `presencaInteriorFixa` e a
 * acao `posto_interior` sao duas metades da mesma coisa, e o lote precisa ter os
 * postos: se uma das tres partes faltar, o NPC ou nunca sai do lugar inicial ou
 * estoura no meio do dia. Melhor estourar aqui, na carga.
 */
for (const def of Object.values(NPCS)) {
  const usaPosto = acoesDe(def).some((acao) => acao.tipo === 'posto_interior');
  if (usaPosto !== Boolean(def.presencaInteriorFixa)) {
    throw new Error(
      `"${def.id}": presencaInteriorFixa=${Boolean(def.presencaInteriorFixa)} mas ` +
        `${usaPosto ? 'usa' : 'nao usa'} a acao posto_interior`,
    );
  }
  if (!usaPosto) continue;
  const postos = LOCAIS_CIDADE[def.casa]?.postos;
  if (!postos) {
    throw new Error(`"${def.id}" e de presenca interior fixa, mas "${def.casa}" nao tem postos`);
  }
  // quem mora onde trabalha comeca o dia DENTRO do proprio predio
  if (def.dentroInicial !== def.casa) {
    throw new Error(
      `"${def.id}" e de presenca interior fixa, entao dentroInicial deveria ser ` +
        `"${def.casa}", nao ${JSON.stringify(def.dentroInicial)}`,
    );
  }
}

/** Os NPCs que moram onde trabalham — usado pelas conferencias e pelo relatorio. */
export const NPCS_DE_PRESENCA_INTERIOR: readonly string[] = Object.values(NPCS)
  .filter((def) => def.presencaInteriorFixa)
  .map((def) => def.id);

export function buscarNpc(id: unknown): DefinicaoNpc | null {
  return typeof id === 'string' ? (NPCS[id] ?? null) : null;
}

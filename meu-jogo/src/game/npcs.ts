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
  | (AcaoBase & { tipo: 'vagar'; area: AreaVagar })
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
  tint?: number;
  rotina: AcaoRotinaNpc[];
  /** Rota publica ate a frente da casa, usada pelo fallback global das 18:00. */
  rotaCasa: PontoTile[];
}

export const LOCAIS_CIDADE: Record<string, { frente: PontoTile; interior: PontoTile }> = {
  casa_1: { frente: { x: 31.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 } },
  casa_2: { frente: { x: 43.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 } },
  casa_3: { frente: { x: 75.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 } },
  casa_4: { frente: { x: 87.5, y: 16.5 }, interior: { x: 8.5, y: 8.5 } },
  casa_5: { frente: { x: 31.5, y: 79.5 }, interior: { x: 8.5, y: 8.5 } },
  casa_6: { frente: { x: 43.5, y: 79.5 }, interior: { x: 8.5, y: 8.5 } },
  mercado: { frente: { x: 70.5, y: 55.5 }, interior: { x: 11.5, y: 10.5 } },
  academia: { frente: { x: 53.5, y: 35.5 }, interior: { x: 9.5, y: 8.5 } },
};

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
    posicaoInicial: { x: 43.5, y: 16.5 }, dentroInicial: 'casa_2', horaAcordar: hora(7),
    sprite: {
      arquivo: 'assets/sprites/Edu_correndo_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
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
      { horario: hora(8), tipo: 'vagar', area: {
        min: { x: 50.5, y: 44.3 }, max: { x: 70.5, y: 46.7 },
      } },
    ],
    rotaCasa: [
      { x: 60.5, y: 45.5 }, { x: 60.5, y: 20.5 },
      { x: 43.5, y: 20.5 }, { x: 43.5, y: 16.5 },
    ],
  },
  mari: {
    id: 'mari', nome: 'Mari', casa: 'casa_3',
    posicaoInicial: { x: 75.5, y: 16.5 }, dentroInicial: 'casa_3', horaAcordar: hora(8),
    sprite: {
      arquivo: 'assets/sprites/Mari_correndo_runtime.png', colunas: 4, linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
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
};

export const MORADORES_POR_CASA = Object.fromEntries(
  Object.values(NPCS).map((npc) => [npc.casa, npc.id]),
) as Record<string, string>;

if (Object.keys(MORADORES_POR_CASA).length !== Object.keys(NPCS).length) {
  throw new Error('dois NPCs foram configurados na mesma casa');
}

export function buscarNpc(id: unknown): DefinicaoNpc | null {
  return typeof id === 'string' ? (NPCS[id] ?? null) : null;
}

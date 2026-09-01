/**
 * OS BICHOS DE ESTIMACAO.
 *
 * Deliberadamente pequeno. A Parte 31 do plano pediu um registro leve e disse o
 * que ele NAO deve virar: bicho nao briga, nao tem relacionamento, nao tem
 * inventario e nao entra em nenhuma conta de economia. O que ele faz e estar
 * onde deveria estar — dormindo em casa de madrugada, no quintal de dia, sentado
 * na tarde — e dar vida a um mapa que ate agora so tinha gente.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELE NAO USA O MOTOR DE ROTINA DOS NPCs
 * ---------------------------------------------------------------------------
 * O motor de rotina (`SistemaRotinasNpc`) resolve um problema que o bicho nao
 * tem: caminhar em reta entre waypoints, entrar e sair de construcao, ser
 * substituido por emprego e por chuva, e aparecer no mapa da cidade. Um gato
 * andando tres tiles em volta de um poste nao precisa de nada disso, e enfiar
 * dezesseis bichos no motor dobraria o custo por quadro dele.
 *
 * O que ha aqui e uma funcao pura: dado o bicho, o dia e a hora, ela devolve
 * onde ele esta e o que ele esta fazendo. O deslocamento fino (o passinho em
 * volta do ponto) e uma senoide na cena — deterministico, sem fisica e sem
 * colisao, e por isso o bicho nunca atravessa parede: ele nunca sai do circulo
 * declarado, e a conferencia prova que o circulo inteiro e chao livre.
 */

import { buscarMorador } from './moradores.ts';

export type EspeciePet = 'cachorro' | 'gato';

/** O que o bicho esta fazendo. */
export type ModoPet =
  /** deitado, sem se mexer */
  | 'dormir'
  /** andando devagar em volta do ponto */
  | 'vagar'
  /** parado e sentado */
  | 'sentar'
  /** atras do dono, quando ele esta no mesmo mapa e ao ar livre */
  | 'seguir';

export interface LugarDePet {
  /**
   * Chave de mapa em MAPAS — a do INTERIOR quando ele esta dentro (`casa_b1`) e
   * a do mapa aberto quando ele esta fora (`bairro`).
   *
   * E o mesmo `estado.mapa` da cena, e por isso a comparacao "este bicho aparece
   * aqui?" e uma igualdade de string. Os NPCs precisam de um par
   * (mapa, construcao) porque o mapa da cidade desenha o marcador deles do lado
   * de fora do predio em que estao; bicho nao aparece no mapa da cidade.
   */
  mapa: string;
  /** centro, em TILES */
  ponto: { x: number; y: number };
  /** raio de perambulacao em tiles; so vale no modo `vagar` */
  raio?: number;
}

export interface BlocoDePet {
  /** hora de inicio, em minutos do dia */
  inicio: number;
  modo: ModoPet;
  lugar: LugarDePet;
}

export interface DefinicaoPet {
  id: string;
  nome: string;
  especie: EspeciePet;
  /** variante de arte: a chave em `pets.json` (raca do cachorro, cor do gato) */
  variante: string;
  /** id do morador dono; null = bicho de rua */
  dono: string | null;
  /** onde ele dorme */
  lar: LugarDePet;
  /**
   * Lugares favoritos, em texto. Nao tem efeito mecanico nenhum ainda: e o
   * gancho de dialogo e de missao futura que a Parte 31 pediu ("favoriteLocations").
   */
  favoritos: readonly string[];
  agenda: readonly BlocoDePet[];
}

const dentro = (interior: string, x: number, y: number): LugarDePet => ({
  mapa: interior, ponto: { x, y },
});
const fora = (mapa: string, x: number, y: number, raio = 2): LugarDePet => ({
  mapa, ponto: { x, y }, raio,
});
const hora = (h: number): number => h * 60;

/**
 * A AGENDA PADRAO de um bicho de casa: dorme, sai de manha, senta a tarde e
 * volta a dormir.
 *
 * A mesma forma serve aos seis porque a diferenca entre eles esta no LUGAR, nao
 * no horario — e um gato que dorme das 20h as 8h e um cachorro que dorme das 21h
 * as 7h nao produzem nenhuma diferenca visivel num jogo cujo relogio anda dez
 * minutos por tique.
 */
const agendaDeCasa = (lar: LugarDePet, quintal: LugarDePet, tarde: LugarDePet): BlocoDePet[] => [
  { inicio: 0, modo: 'dormir', lugar: lar },
  { inicio: hora(8), modo: 'vagar', lugar: quintal },
  { inicio: hora(14), modo: 'sentar', lugar: tarde },
  { inicio: hora(17), modo: 'seguir', lugar: quintal },
  { inicio: hora(20), modo: 'dormir', lugar: lar },
];

/**
 * OS SEIS BICHOS.
 *
 * A Parte 32 pediu que a distribuicao fizesse sentido e que nem todo NPC tivesse
 * um. Sao seis em vinte e quatro moradias: as tres familias com crianca ou com
 * quintal ganharam cachorro, a moradora mais velha e os dois moradores sozinhos
 * ganharam gato, e as outras dezoito casas ficaram sem — que e o normal.
 *
 * Todo ponto ao ar livre daqui e um tile JA PROVADO livre por outra coisa: sao
 * pontos de rotina de morador (a quadra, a roca, o balcao da madeireira) ou o
 * eixo de uma via, que o gerador mantem limpo. `npm run verificar-rotinas`
 * refaz a prova pro circulo inteiro de perambulacao.
 */
export const PETS: Record<string, DefinicaoPet> = {
  pipoca: {
    id: 'pipoca', nome: 'Pipoca', especie: 'cachorro', variante: 'golden', dono: 'livia',
    lar: dentro('casa_b1', 14.5, 6.5),
    favoritos: ['a quadra do bairro', 'a sombra do muro da escola'],
    agenda: agendaDeCasa(
      dentro('casa_b1', 14.5, 6.5),
      fora('bairro', 90.5, 62.5, 2.5),
      fora('bairro', 92.5, 65.5, 1),
    ),
  },
  bolinha: {
    id: 'bolinha', nome: 'Bolinha', especie: 'cachorro', variante: 'beagle', dono: 'roberto',
    lar: dentro('casa_b5', 16.5, 12.5),
    favoritos: ['a calcada do anel sul', 'o portao de casa'],
    agenda: agendaDeCasa(
      dentro('casa_b5', 16.5, 12.5),
      fora('bairro', 92.2, 76.2, 2),
      fora('bairro', 88, 76.2, 1),
    ),
  },
  mel: {
    id: 'mel', nome: 'Mel', especie: 'cachorro', variante: 'labrador', dono: 'joao',
    lar: dentro('casa_rural_1', 5.5, 12.5),
    favoritos: ['a leira do meio', 'a beira do caminho de terra'],
    agenda: agendaDeCasa(
      dentro('casa_rural_1', 5.5, 12.5),
      fora('rural', 32.5, 50.5, 3),
      fora('rural', 36.5, 52.5, 1),
    ),
  },
  nina: {
    id: 'nina', nome: 'Nina', especie: 'gato', variante: 'tricolor', dono: 'rita',
    lar: dentro('casa_b4', 10.5, 14.5),
    favoritos: ['o muro da avenida', 'o colo da Rita'],
    agenda: agendaDeCasa(
      dentro('casa_b4', 10.5, 14.5),
      fora('bairro', 66.2, 74.2, 2),
      fora('bairro', 66.2, 71, 1),
    ),
  },
  tico: {
    id: 'tico', nome: 'Tico', especie: 'gato', variante: 'siames', dono: 'bruno',
    lar: dentro('casa_rural_2', 14.5, 6.5),
    favoritos: ['a pilha de tabua', 'o balcao da madeireira'],
    agenda: agendaDeCasa(
      dentro('casa_rural_2', 14.5, 6.5),
      fora('rural', 116.5, 38.5, 2),
      fora('rural', 113.5, 38.5, 1),
    ),
  },
  sombra: {
    id: 'sombra', nome: 'Sombra', especie: 'gato', variante: 'preto', dono: 'lucia',
    lar: dentro('casa_b2', 8.5, 14.5),
    favoritos: ['o patio da central telefonica', 'qualquer telhado'],
    agenda: agendaDeCasa(
      dentro('casa_b2', 8.5, 14.5),
      fora('bairro', 44.5, 66.5, 2),
      fora('bairro', 42.5, 66.5, 1),
    ),
  },
};

export const LISTA_DE_PETS: readonly DefinicaoPet[] = Object.values(PETS);

export function buscarPet(id: unknown): DefinicaoPet | null {
  return typeof id === 'string' ? (PETS[id] ?? null) : null;
}

/** Os bichos de um dono. Vazio pra quem nao tem. */
export function petsDoDono(npcId: string): DefinicaoPet[] {
  return LISTA_DE_PETS.filter((p) => p.dono === npcId);
}

/** O bloco de agenda que vale num horario. */
export function blocoAtual(pet: DefinicaoPet, minutos: number): BlocoDePet {
  let atual = pet.agenda[0];
  for (const bloco of pet.agenda) {
    if (bloco.inicio <= minutos) atual = bloco;
  }
  return atual;
}

export interface EstadoDePet {
  pet: DefinicaoPet;
  modo: ModoPet;
  lugar: LugarDePet;
  /** true quando o modo pede que ele ande atras do dono */
  seguindo: boolean;
}

/**
 * ONDE O BICHO ESTA agora.
 *
 * `seguir` so vale quando o dono existe e mora no mesmo mapa; fora disso ele cai
 * em `vagar` no mesmo lugar. Isso e uma decisao de robustez: o motor de rotina do
 * dono pode leva-lo pra outro mapa (o Wendel atende na farmacia do Mapa 1), e um
 * cachorro que "segue" alguem que nao esta ali ficaria parado no vazio.
 */
export function estadoDoPet(pet: DefinicaoPet, minutos: number): EstadoDePet {
  const bloco = blocoAtual(pet, minutos);
  const dono = pet.dono ? buscarMorador(pet.dono) : null;
  const podeSeguir = bloco.modo === 'seguir'
    && dono !== null
    && dono.mapaResidencia === bloco.lugar.mapa;
  return {
    pet,
    modo: podeSeguir ? 'seguir' : bloco.modo === 'seguir' ? 'vagar' : bloco.modo,
    lugar: bloco.lugar,
    seguindo: podeSeguir,
  };
}

/**
 * Os bichos que devem aparecer no mapa carregado agora.
 *
 * `mapa` e o `estado.mapa` da cena — a chave do interior quando o jogador esta
 * dentro de um predio, a do mapa aberto quando esta fora.
 */
export function petsVisiveis(mapa: string, minutos: number): EstadoDePet[] {
  return LISTA_DE_PETS.map((p) => estadoDoPet(p, minutos)).filter((e) => e.lugar.mapa === mapa);
}

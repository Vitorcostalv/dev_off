import type { Clima } from './clima.ts';

/**
 * FAUNA DE RUA. Bichos determinísticos por mapa, horário, clima e estação. Não
 * há spawn aleatório nem população persistida: a lista é uma consulta pura, e o
 * save guarda apenas quantas vezes o jogador encontrou cada um — é isso que
 * transforma "um gato" em "o gato do muro da escola" depois de três encontros.
 *
 * Os gatos e os cachorros conhecidos conversam com o quadro de avisos que já
 * existia (o gato laranja Farofa e o cachorro manso da Zona Rural).
 */
export type EspecieFauna = 'gato' | 'cachorro' | 'passaro' | 'sapo' | 'vagalume';
export interface AnimalDeRua {
  id: string;
  especie: EspecieFauna;
  mapa: string;
  /** Nome que só aparece depois de encontros repetidos. */
  nome?: string;
  tile: { x: number; y: number };
  /** Raio em tiles do vaivém em volta do ponto; 0 = parado. */
  raio: number;
  janela: { inicio: number; fim: number };
  exige?: 'chuva' | 'seco';
  estacoes?: readonly number[];
  quantidade?: number;
  texto: string;
}

const DIA = { inicio: 6 * 60, fim: 19 * 60 };
const NOITE = { inicio: 19 * 60, fim: 5 * 60 };

export const FAUNA: readonly AnimalDeRua[] = [
  { id: 'gato_farofa', especie: 'gato', mapa: 'farm', nome: 'Farofa', tile: { x: 52, y: 44 }, raio: 2, janela: { inicio: 8 * 60, fim: 18 * 60 }, exige: 'seco',
    texto: 'Um gato laranja dorme no banco da praça, exatamente onde a tarde bate.' },
  { id: 'gato_mercado', especie: 'gato', mapa: 'farm', nome: 'Dona Preta', tile: { x: 64, y: 52 }, raio: 1, janela: { inicio: 6 * 60, fim: 11 * 60 },
    texto: 'A gata preta espera a porta dos fundos do mercado abrir. Ela não pede; ela espera.' },
  { id: 'gato_escola', especie: 'gato', mapa: 'bairro', nome: 'Régua', tile: { x: 39, y: 50 }, raio: 2, janela: { inicio: 11 * 60, fim: 22 * 60 },
    texto: 'O gato do muro da escola anda na linha do reboco, sem olhar para baixo.' },
  { id: 'cachorro_quadra', especie: 'cachorro', mapa: 'bairro', nome: 'Bolacha', tile: { x: 58, y: 70 }, raio: 4, janela: { inicio: 7 * 60, fim: 19 * 60 }, exige: 'seco',
    texto: 'O cachorro caramelo da quadra acompanha quem passa por meio campo e volta.' },
  { id: 'cachorro_fazenda', especie: 'cachorro', mapa: 'rural', tile: { x: 30, y: 86 }, raio: 5, janela: { inicio: 5 * 60, fim: 20 * 60 },
    texto: 'Um cachorro de trabalho corre a cerca de ponta a ponta e para exatamente no mesmo lugar.' },
  { id: 'passaros_praca', especie: 'passaro', mapa: 'farm', tile: { x: 55, y: 41 }, raio: 3, quantidade: 4, janela: { inicio: 5 * 60 + 30, fim: 9 * 60 }, exige: 'seco',
    texto: 'Os pássaros da praça descem juntos, comem o que caiu da feira e sobem juntos.' },
  { id: 'passaros_fios', especie: 'passaro', mapa: 'bairro', tile: { x: 44, y: 41 }, raio: 2, quantidade: 5, janela: { inicio: 16 * 60, fim: 18 * 60 + 30 },
    texto: 'Cinco pássaros dividem o fio em partes iguais. Um deles insiste em ficar no meio.' },
  { id: 'passaros_roca', especie: 'passaro', mapa: 'rural', tile: { x: 108, y: 32 }, raio: 4, quantidade: 3, janela: { inicio: 6 * 60, fim: 10 * 60 },
    texto: 'Os pássaros da roça esperam o trator parar antes de descer.' },
  { id: 'sapos_rio', especie: 'sapo', mapa: 'bairro', tile: { x: 69, y: 95 }, raio: 2, quantidade: 3, janela: NOITE, exige: 'chuva',
    texto: 'Com a chuva os sapos assumem a margem. O barulho deles é maior que eles.' },
  { id: 'sapos_acude', especie: 'sapo', mapa: 'rural', tile: { x: 124, y: 86 }, raio: 2, quantidade: 2, janela: { inicio: 17 * 60, fim: 23 * 60 }, exige: 'chuva',
    texto: 'Dois sapos ocupam a poça da pedreira como se ela sempre tivesse estado ali.' },
  { id: 'vagalumes_estrada', especie: 'vagalume', mapa: 'represa', tile: { x: 40, y: 120 }, raio: 5, quantidade: 6, janela: NOITE, exige: 'seco', estacoes: [0, 1],
    texto: 'Vagalumes no mato da estrada. A luz deles não alcança nada; mesmo assim eu vejo.' },
  { id: 'vagalumes_rio', especie: 'vagalume', mapa: 'bairro', tile: { x: 66, y: 92 }, raio: 5, quantidade: 5, janela: NOITE, exige: 'seco', estacoes: [0, 1],
    texto: 'Os vagalumes ficam na altura da grama alta, perto da água.' },
  { id: 'passaros_represa', especie: 'passaro', mapa: 'represa', tile: { x: 40, y: 130 }, raio: 3, quantidade: 2, janela: DIA, exige: 'seco',
    texto: 'Dois pássaros acompanham a estrada por um trecho e voltam antes do portão.' },
  { id: 'gato_oficina', especie: 'gato', mapa: 'bairro', tile: { x: 78, y: 42 }, raio: 2, janela: { inicio: 20 * 60, fim: 2 * 60 },
    texto: 'Um gato passa pela minha calçada quase no mesmo horário. Não é meu; também não é de mais ninguém.' },
];

function dentroDaJanela(janela: { inicio: number; fim: number }, minuto: number): boolean {
  return janela.inicio <= janela.fim ? minuto >= janela.inicio && minuto < janela.fim : minuto >= janela.inicio || minuto < janela.fim;
}

/** Consulta pura: mesmo dia, mesmo clima e mesma hora devolvem a mesma lista. */
export function faunaDoMomento(mapa: string, dia: number, minuto: number, clima: Clima, estacao: number): AnimalDeRua[] {
  const chovendo = clima === 'Chuva' || clima === 'Temporal';
  return FAUNA.filter(a => {
    if (a.mapa !== mapa || !dentroDaJanela(a.janela, minuto)) return false;
    if (a.exige === 'chuva' && !chovendo) return false;
    if (a.exige === 'seco' && chovendo) return false;
    if (a.estacoes && !a.estacoes.includes(estacao)) return false;
    // Em um dia de cada quatro o bicho não está no ponto dele. Sem sorteio: o
    // próprio dia decide, então um save recarregado vê a mesma cidade.
    return (Math.abs(dia) + a.id.length) % 4 !== 3;
  });
}

export interface ContextoFauna {
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void };
  dia: number;
}
/** Um encontro por dia por bicho; a partir do terceiro ele passa a ter nome. */
export function reconhecer(c: ContextoFauna, id: string): number {
  const total = Number(c.worldEvents.obter(`fauna:encontros:${id}`) ?? 0);
  if (c.worldEvents.obter(`fauna:dia:${id}`) === c.dia) return total;
  c.worldEvents.definir(`fauna:dia:${id}`, c.dia);
  c.worldEvents.definir(`fauna:encontros:${id}`, total + 1);
  return total + 1;
}
export function encontros(c: ContextoFauna, id: string): number {
  return Number(c.worldEvents.obter(`fauna:encontros:${id}`) ?? 0);
}
export function nomeConhecido(c: ContextoFauna, animal: AnimalDeRua): string | null {
  return animal.nome && encontros(c, animal.id) >= 3 ? animal.nome : null;
}
export function textoDoAnimal(c: ContextoFauna, animal: AnimalDeRua): string {
  const nome = nomeConhecido(c, animal);
  const vezes = encontros(c, animal.id);
  if (nome) return `${animal.texto}\n\nJá sei o nome: ${nome}. ${vezes >= 8 ? 'Ele também já sabe a hora em que eu passo.' : 'Ele deixa eu chegar mais perto do que antes.'}`;
  return vezes >= 2 ? `${animal.texto}\n\nEsse eu já vi antes, no mesmo lugar.` : animal.texto;
}
/** Quantos bichos diferentes o jogador já reconheceu pelo nome. */
export function conhecidosPeloNome(c: ContextoFauna): string[] {
  return FAUNA.filter(a => a.nome && encontros(c, a.id) >= 3).map(a => a.nome!);
}

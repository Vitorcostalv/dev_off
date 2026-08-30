/** Conteudo leve e deterministico dos pontos de ambientacao da cidade. */

export interface SegredoDoMapa {
  id: string;
  mapa: 'bairro' | 'rural';
  tile: { x: number; y: number };
  titulo: string;
  texto: string;
  recompensa?: { itemId: string; quantidade: number; flag: string };
}

export const AVISOS_DA_CIDADE: readonly string[] = [
  'Procura-se bicicleta azul. Ultima vez vista perto da quadra.',
  'Torneio amistoso na quadra no sabado. Inscricoes na escola.',
  'A biblioteca aceita doacoes de livros em bom estado.',
  'Gato laranja desaparecido. Atende pelo nome de Farofa.',
  'A prefeitura pede cuidado com a ponte depois de chuva forte.',
  'Precisa-se de ajuda para consertar um radio antigo. Tratar no mercado.',
  'Feira de produtores rurais no domingo pela manha.',
  'Aula aberta de alongamento na praca, quarta-feira as 18:00.',
  'Encontrado molho de chaves perto do bar. Deixado na farmacia.',
  'Mutirao de limpeza da margem do rio no proximo fim de semana.',
  'Vende-se estante usada. Recado com a bibliotecaria.',
  'A escola procura sucata eletronica para a feira de ciencias.',
  'Cachorro preto muito manso apareceu na Zona Rural. Alguem conhece?',
  'A madeireira avisa: encomendas grandes precisam ser marcadas antes.',
  'Reuniao de moradores na praca, sexta-feira as 19:30.',
];

/** Quatro avisos estaveis durante a semana inteira (dia 0..6, 7..13 etc.). */
export function avisosDaSemana(dia: number): string[] {
  const semana = Math.floor(Math.max(0, dia) / 7);
  const restantes = [...AVISOS_DA_CIDADE];
  const escolhidos: string[] = [];
  let estado = (semana + 1) * 0x45d9f3b;
  while (escolhidos.length < 4 && restantes.length > 0) {
    estado = Math.imul(estado ^ (estado >>> 16), 0x45d9f3b);
    estado ^= estado >>> 16;
    const indice = (estado >>> 0) % restantes.length;
    escolhidos.push(restantes.splice(indice, 1)[0]);
  }
  return escolhidos;
}

export const SEGREDOS: readonly SegredoDoMapa[] = [
  {
    id: 'segredo_biblioteca', mapa: 'bairro', tile: { x: 53, y: 42.5 },
    titulo: 'Atras da biblioteca',
    texto: 'Ha iniciais antigas riscadas num tijolo: duas pessoas prometeram devolver um livro juntas.',
  },
  {
    id: 'segredo_rio', mapa: 'bairro', tile: { x: 70, y: 96 },
    titulo: 'Margem do rio',
    texto: 'Entre as pedras, uma caixinha enferrujada ainda protege um cabo bem enrolado.',
    recompensa: { itemId: 'cabo_usb', quantidade: 1, flag: 'segredoRioRecompensado' },
  },
  {
    id: 'segredo_madeireira', mapa: 'rural', tile: { x: 117, y: 28.5 },
    titulo: 'Atras da madeireira',
    texto: 'Uma tora tem aneis marcados a lapis, como se alguem contasse os anos de uma historia.',
  },
  {
    id: 'segredo_pedreira', mapa: 'rural', tile: { x: 126, y: 88 },
    titulo: 'Fundo da pedreira',
    texto: 'A rocha partida revela uma faixa brilhante que desaparece quando vista de frente.',
  },
  {
    id: 'segredo_fazenda', mapa: 'rural', tile: { x: 27, y: 84 },
    titulo: 'Canto da fazenda',
    texto: 'Um espantalho pequeno encara a estrada. No bolso, so ha uma lista de nomes apagados pela chuva.',
  },
];

export function segredosDoMapa(mapa: string): SegredoDoMapa[] {
  return SEGREDOS.filter((segredo) => segredo.mapa === mapa);
}

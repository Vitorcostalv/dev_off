/** Salas da continuação: geometria determinística, sem ampliar artificialmente o loot. */
export interface ObstaculoMemoria { x: number; y: number; w: number; h: number; tipo: 'mesa' | 'cama' | 'armario' | 'cadeira' }
export interface SalaMemoria {
  andar: number; tema: 'memoria' | 'culpa' | 'identidade'; observacao: string;
  obstaculos: ObstaculoMemoria[]; ameacas: number;
}
const OBSERVACOES = [
  'A porta industrial abre para um cômodo com as proporções de uma sala de casa.',
  'O relógio anda. A hora não muda. Você se lembra de uma noite que parecia assim.',
  'Uma cadeira de espera diante de uma mesa de trabalho. Nenhuma das duas parece pertencer à usina.',
  'Um calendário tem a data riscada. Você lembrava de outra data. O papel não confirma sua memória.',
  'Você lembrava de ter respondido sozinho. O registro na tela contém uma oferta de ajuda.',
  'Na sua lembrança, ninguém tinha percebido. No papel: “Você não precisa terminar hoje”.',
  'Você reconhece o corredor. A janela fica do outro lado na sua lembrança.',
  'Há marcas de uma mesa no piso. O retângulo é menor do que você lembrava.',
];
export function salaMemoria(andar: number): SalaMemoria {
  if (!Number.isInteger(andar) || andar < 51 || andar > 200) throw new Error('Andar de memória inválido');
  const tema = andar <= 100 ? 'memoria' : andar <= 150 ? 'culpa' : 'identidade';
  const tipos: ObstaculoMemoria['tipo'][] = ['mesa', 'armario', 'cadeira', 'cama'];
  const obstaculos = Array.from({ length: tema === 'identidade' ? 2 : 4 }, (_, i) => ({
    x: 144 + i * 58, y: 92 + ((andar * 13 + i * 17) % 43), w: 28, h: 25,
    tipo: tipos[(andar + i) % tipos.length]!,
  }));
  let observacao = OBSERVACOES[(andar - 51) % OBSERVACOES.length]!;
  if (tema === 'culpa') observacao = [
    '“Eu consigo.” A frase reaparece sob outra camada de tinta.',
    'Um pedido de ajuda apagado pela metade. Você não consegue identificar a letra.',
    'Uma casa, um sol, três figuras de mãos dadas. Traços de lápis na parede, sem assinatura.',
    '“Só preciso terminar isso.” Não há data ao lado.',
    'Uma folha dobrada em quatro. Pela dobra, vê-se um pequeno traço de sol e lápis amarelo.',
  ][andar % 5]!;
  if (tema === 'identidade') observacao = andar < 173
    ? 'Uma sala quase vazia. O silêncio deixa espaço para uma lembrança que você ainda não nomeou.'
    : 'O sol e as três figuras têm os mesmos traços do desenho guardado. Como a represa sabe disso?';
  return { andar, tema, observacao, obstaculos, ameacas: andar >= 151 || andar % 10 === 0 ? 0 : andar % 3 === 0 ? 1 : 0 };
}
export function bloqueadoNaMemoria(sala: SalaMemoria, x: number, y: number): boolean {
  if (x < 27 || x > 453 || y < 48 || y > 213) return true;
  return sala.obstaculos.some(r => x + 6 > r.x && x - 6 < r.x + r.w && y + 5 > r.y && y - 5 < r.y + r.h);
}

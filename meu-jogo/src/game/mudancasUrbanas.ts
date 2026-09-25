/**
 * A CIDADE AO LONGO DOS ANOS — o que muda de lugar sem que ninguém anuncie.
 *
 * Pintura de fachada, banco novo, grafite, árvore plantada, placa trocada,
 * comércio ocupando um ponto vago. Cada mudança depende do ANO ou de uma obra
 * que o jogador financiou, e todas são desenhadas por cima do tilemap existente
 * — nenhum mapa é regerado, e nada some do mundo antigo.
 *
 * As estações entram por dentro: no inverno os interiores ganham cobertor e
 * janela fechada; no verão, ventilador e janela aberta. Os figurantes mudam de
 * roupa junto, pelo mesmo calendário.
 */
export type TipoDeMudanca = 'pintura' | 'banco' | 'grafite' | 'arvore' | 'placa' | 'comercio' | 'lote';
export interface MudancaUrbana {
  id: string;
  mapa: string;
  tipo: TipoDeMudanca;
  /** Canto da marca, em tiles do mapa. */
  tile: { x: number; y: number };
  largura: number;
  altura: number;
  cor: number;
  /** Ano do jogo a partir do qual aparece (1 = primeiro ano). */
  ano: number;
  /** Obra que também libera a mudança, independente do ano. */
  obra?: string;
  texto: string;
}

export const MUDANCAS: readonly MudancaUrbana[] = [
  { id: 'pintura_escola', mapa: 'bairro', tipo: 'pintura', tile: { x: 36, y: 46 }, largura: 6, altura: .6, cor: 0xbcc8b4, ano: 2,
    texto: 'A escola foi repintada num verde mais claro. A faixa antiga aparece embaixo, em dia de chuva.' },
  { id: 'grafite_muro', mapa: 'bairro', tipo: 'grafite', tile: { x: 43, y: 52 }, largura: 3, altura: 1.2, cor: 0x9a6b8f, ano: 2,
    texto: 'Alguém pintou um mural no muro da quadra. Ninguém apagou, e agora ele é ponto de referência.' },
  { id: 'banco_praca_novo', mapa: 'farm', tipo: 'banco', tile: { x: 55, y: 46 }, largura: 2.4, altura: .8, cor: 0x8a6b45, ano: 2,
    texto: 'Puseram dois bancos novos na praça, virados para a árvore e não para a rua.' },
  { id: 'arvores_avenida', mapa: 'farm', tipo: 'arvore', tile: { x: 62, y: 44 }, largura: 1.2, altura: 1.6, cor: 0x4a6b3a, ano: 3,
    texto: 'As mudas plantadas no mutirão já dão sombra na calçada da avenida.' },
  { id: 'arvores_bairro', mapa: 'bairro', tipo: 'arvore', tile: { x: 70, y: 44 }, largura: 1.2, altura: 1.6, cor: 0x47643a, ano: 3,
    texto: 'A rua da estação ganhou três árvores. Duas pegaram.' },
  { id: 'placa_estacao', mapa: 'bairro', tipo: 'placa', tile: { x: 72, y: 42 }, largura: 1.6, altura: .9, cor: 0xb9ae8c, ano: 2,
    texto: 'Trocaram a placa da estação. A nova tem o nome antigo escrito embaixo, menor.' },
  { id: 'pintura_bar', mapa: 'farm', tipo: 'pintura', tile: { x: 67, y: 50 }, largura: 4, altura: .6, cor: 0xa98a63, ano: 3,
    texto: 'O bar ganhou fachada nova. Alice escolheu a cor num sábado e mudou de ideia no domingo.' },
  { id: 'comercio_cafeteria', mapa: 'bairro', tipo: 'comercio', tile: { x: 112, y: 65 }, largura: 3, altura: 1.2, cor: 0xc0a074, ano: 9, obra: 'cafeteria',
    texto: 'A cafeteria acendeu o letreiro. O ponto estava vago desde antes de eu chegar.' },
  { id: 'comercio_padaria', mapa: 'bairro', tipo: 'comercio', tile: { x: 127, y: 68 }, largura: 3, altura: 1.2, cor: 0xd0b07a, ano: 9, obra: 'padaria',
    texto: 'A padaria do bairro abriu. O cheiro chega antes da esquina.' },
  { id: 'lote_posto', mapa: 'bairro', tipo: 'lote', tile: { x: 98, y: 38 }, largura: 4, altura: 1.6, cor: 0xa8b3bc, ano: 9, obra: 'hospital',
    texto: 'O lote da rua de cima deixou de ser mato: o posto de saúde ocupa a esquina inteira.' },
  { id: 'lote_onibus', mapa: 'bairro', tipo: 'lote', tile: { x: 110, y: 38 }, largura: 3, altura: 1, cor: 0x9aa7b0, ano: 9, obra: 'ponto_onibus',
    texto: 'O ponto de ônibus tem cobertura, banco e horário afixado. Antes era uma placa torta.' },
  { id: 'grafite_estacao', mapa: 'bairro', tipo: 'grafite', tile: { x: 66, y: 46 }, largura: 2.6, altura: 1, cor: 0x7e8fb0, ano: 4,
    texto: 'O galpão da estação virou parede de quem pinta. Uma das figuras é um trem sem trilho.' },
];

export function mudancasVisiveis(mapa: string, ano: number, obras: readonly string[]): MudancaUrbana[] {
  return MUDANCAS.filter(m => m.mapa === mapa && (ano >= m.ano || (m.obra !== undefined && obras.includes(m.obra))));
}
/** Resumo que o protagonista faz quando olha a rua depois de alguns anos. */
export function resumoDaCidade(ano: number, obras: readonly string[]): string {
  const total = MUDANCAS.filter(m => ano >= m.ano || (m.obra !== undefined && obras.includes(m.obra))).length;
  if (total === 0) return 'A cidade está como eu encontrei. Faz pouco tempo que eu cheguei.';
  if (total < 4) return 'Umas coisas mudaram de lugar desde que eu cheguei. Pouca gente comenta.';
  if (total < 8) return 'A rua não é a mesma de quando eu cheguei. Eu vi cada mudança acontecer devagar.';
  return 'Se alguém me mostrasse uma foto do meu primeiro mês, eu teria de procurar o que reconheço.';
}

// ------------------------------------------------------ estações por dentro --
export type AjusteDeEstacao = 'cobertor' | 'janela_fechada' | 'ventilador' | 'janela_aberta';
export interface MarcaDeEstacao {
  id: AjusteDeEstacao;
  /** Posição em pixels do interior, já na escala do mapa. */
  x: number; y: number; largura: number; altura: number; cor: number;
}
const INTERIORES: Record<string, readonly { x: number; y: number }[]> = {
  oficina: [{ x: 300, y: 120 }, { x: 390, y: 185 }],
  bar: [{ x: 250, y: 120 }, { x: 330, y: 150 }],
  farmacia: [{ x: 250, y: 120 }, { x: 320, y: 150 }],
  biblioteca: [{ x: 260, y: 120 }, { x: 350, y: 160 }],
  mercado: [{ x: 250, y: 120 }, { x: 330, y: 160 }],
  academia: [{ x: 240, y: 110 }, { x: 320, y: 150 }],
};
/** Inverno fecha a casa; verão abre. Fora dessas duas estações, nada muda. */
export function marcasDaEstacao(mapa: string, estacao: number): MarcaDeEstacao[] {
  const pontos = INTERIORES[mapa];
  if (!pontos || (estacao !== 1 && estacao !== 3)) return [];
  const inverno = estacao === 3;
  return pontos.map((p, i) => (inverno
    ? i === 0
      ? { id: 'janela_fechada' as const, x: p.x, y: p.y, largura: 22, altura: 16, cor: 0x53606b }
      : { id: 'cobertor' as const, x: p.x, y: p.y, largura: 26, altura: 10, cor: 0x8a6e63 }
    : i === 0
      ? { id: 'janela_aberta' as const, x: p.x, y: p.y, largura: 22, altura: 16, cor: 0xbfd2d8 }
      : { id: 'ventilador' as const, x: p.x, y: p.y, largura: 12, altura: 12, cor: 0xb8bcc0 }));
}
export function textoDaEstacaoDentro(estacao: number): string | null {
  if (estacao === 3) return 'Janelas fechadas e cobertor na cadeira. A casa encolhe um pouco no inverno.';
  if (estacao === 1) return 'Janela aberta e ventilador ligado no canto. O ar de fora entra quente mesmo assim.';
  return null;
}

// --------------------------------------------- moradores conforme a estação --
export interface TrajeDaEstacao { acessorio: 'nenhum' | 'gorro'; camisa: number; cachecol: boolean }
export function trajeDaEstacao(estacao: number, semente: number): TrajeDaEstacao {
  if (estacao === 3) return { acessorio: 'gorro', camisa: 1, cachecol: semente % 2 === 0 };
  if (estacao === 1) return { acessorio: 'nenhum', camisa: 4, cachecol: false };
  return { acessorio: semente % 7 === 0 ? 'gorro' : 'nenhum', camisa: semente % 5, cachecol: false };
}
/**
 * Comportamento: no inverno os figurantes da noite ficam em casa e os da tarde
 * saem mais cedo; no verão acontece o contrário. Devolve o deslocamento em
 * minutos, ou `null` quando aquele figurante não sai naquela estação.
 */
export function deslocamentoDaEstacao(inicio: number, estacao: number): number | null {
  const noite = inicio >= 18 * 60;
  if (estacao === 3) return noite ? null : -30;
  if (estacao === 1) return noite ? 30 : inicio >= 11 * 60 && inicio < 15 * 60 ? 60 : 0;
  return 0;
}

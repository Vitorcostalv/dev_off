/**
 * Aparelhos do minigame de conserto (vaga tipo `conserto` em game/trabalhos.ts).
 *
 * Mesma ideia do `CATALOGO_ITENS`: este arquivo e a FONTE UNICA, e
 * `tools/gerar-aparelhos.mjs` importa a mesma lista pra decidir o que empacotar
 * no atlas `aparelhos`. Peca que nao esta aqui nao vira frame, e endereco que
 * nao existe na folha derruba a geracao em vez de virar frame errado.
 *
 * O endereco `[linha, indice]` e o mesmo esquema ja usado pela mobilia e pelos
 * itens: as pecas sao detectadas por blob na folha de arte e agrupadas em
 * linhas, entao o endereco e estavel enquanto o layout da arte nao mudar.
 *
 * ---------------------------------------------------------------------------
 * GANCHO FUTURO — economia de pecas
 * ---------------------------------------------------------------------------
 * Hoje `pecas` e SO ilustracao: os quatro componentes viram os botoes do
 * minigame de sequencia, e acertar a sequencia paga. Nao ha peca no inventario,
 * nao ha compra de peca, nao ha peca que falta.
 *
 * Quando essa economia entrar, o caminho e:
 *   1. cada `PecaDeAparelho` ganha um `item` apontando pra um id do
 *      CATALOGO_ITENS (a DevStore ja vende SSD, RAM, bateria, cabo...);
 *   2. aceitar a vaga passa a exigir que o jogador TENHA as pecas, checando com
 *      `estado.inventario.cabe`/`contar` — mesma recusa segura da compra;
 *   3. concluir consome as pecas com `removerDoSlot` e paga a mao de obra.
 * Nada disso muda o minigame: ele continua sendo a parte de habilidade.
 */

export type FolhaAparelho = 'notebook' | 'celular' | 'console';

export interface PecaDeAparelho {
  id: string;
  nome: string;
  /** endereco [linha, indice] na folha do aparelho */
  peca: readonly [number, number];
}

export interface DefinicaoAparelho {
  id: string;
  nome: string;
  folha: FolhaAparelho;
  /** o aparelho inteiro, usado como ilustracao do conserto */
  montado: readonly [number, number];
  /** os componentes que viram os botoes do minigame */
  pecas: readonly PecaDeAparelho[];
}

export const APARELHOS: readonly DefinicaoAparelho[] = [
  {
    id: 'notebook',
    nome: 'Notebook',
    folha: 'notebook',
    montado: [0, 0],
    pecas: [
      { id: 'memoria', nome: 'Memoria RAM', peca: [5, 1] },
      { id: 'ssd', nome: 'SSD M.2', peca: [5, 2] },
      { id: 'bateria', nome: 'Bateria', peca: [6, 1] },
      { id: 'cooler', nome: 'Cooler', peca: [6, 2] },
    ],
  },
  {
    id: 'celular',
    nome: 'Celular',
    folha: 'celular',
    montado: [0, 0],
    pecas: [
      { id: 'bateria', nome: 'Bateria', peca: [2, 4] },
      { id: 'placa', nome: 'Placa-mae', peca: [2, 5] },
      { id: 'camera', nome: 'Camera', peca: [2, 7] },
      { id: 'alto_falante', nome: 'Alto-falante', peca: [5, 0] },
    ],
  },
  {
    id: 'console',
    nome: 'Console Portatil',
    folha: 'console',
    montado: [7, 0],
    pecas: [
      { id: 'placa', nome: 'Placa', peca: [7, 2] },
      { id: 'carcaca', nome: 'Carcaca', peca: [7, 1] },
      { id: 'cartucho', nome: 'Cartucho', peca: [10, 0] },
      { id: 'disco', nome: 'Disco', peca: [9, 0] },
    ],
  },
];

/** Nome do frame do aparelho inteiro no atlas `aparelhos`. */
export const frameDoAparelho = (id: string): string => `aparelho_${id}`;

/** Nome do frame de um componente no atlas `aparelhos`. */
export const frameDaPeca = (aparelho: string, peca: string): string =>
  `peca_${aparelho}_${peca}`;

export function buscarAparelho(id: unknown): DefinicaoAparelho | undefined {
  return typeof id === 'string' ? APARELHOS.find((a) => a.id === id) : undefined;
}

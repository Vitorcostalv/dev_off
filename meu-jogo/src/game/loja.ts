import { estado } from './estado.ts';
import type { Entrega } from './dinheiro.ts';
import { CATALOGO_ITENS, buscarItemDeLoja } from './itens.ts';
import type { CategoriaItem, DefinicaoItemLoja } from './itens.ts';

/**
 * Loja — o balcao que vende os itens do `CATALOGO_ITENS`.
 *
 * Nesta etapa a loja SO VENDE. Nao ha recompra: o jogador gasta, o item entra
 * no inventario, e acabou.
 *
 * ---------------------------------------------------------------------------
 * PENDENCIA DE INTEGRACAO — ponto de interacao declarado aqui, nao no tilemap
 * ---------------------------------------------------------------------------
 * O caixa registradora do mercado ja existe como MOVEL (peca `movel_1_0` da
 * folha `mercado`, posta em `MERCADO_PECAS` no gerador), mas o interior de
 * comercio so gera um objeto interativo: a porta de saida. Nao ha, hoje, objeto
 * de classe "loja" na camada `interativos` do mercado.
 *
 * Em vez de mexer no gerador de interiores (e reprocessar todos os tilemaps por
 * causa de um objeto), o ponto de loja fica declarado aqui, em `PONTOS_DE_LOJA`,
 * com o tile do caixa. A `FarmScene` le esta lista ao montar o mapa e cria o
 * interagivel na hora — o efeito em jogo e o mesmo de um objeto vindo do Tiled.
 *
 * O caminho definitivo, quando alguem for mexer em `gerarInteriorComercio`, e
 * emitir um `objeto('loja_mercado', 'loja', tx, ty, { loja: 'loja_mercado' })`
 * junto da porta e apagar a lista daqui. Ate la, o tile abaixo tem de bater com
 * a posicao do caixa em `MERCADO_PECAS`; se o layout do salao mudar, e este o
 * numero a corrigir.
 */
export interface PontoDeLoja {
  /** id do interagivel gerado; unico no mapa */
  id: string;
  /** chave do mapa em `MAPAS` onde o ponto existe */
  mapa: string;
  /** tile em que o interagivel nasce (centro do tile) */
  tile: { x: number; y: number };
  /** cabecalho da janela de compra */
  nome: string;
  /** verbo do prompt "[E] ..." */
  rotulo: string;
  /**
   * Categorias a venda neste ponto, na ordem em que aparecem. O mercado vende
   * as duas; um ponto futuro (a farmacia, por exemplo) pode vender so uma.
   */
  categorias: readonly CategoriaItem[];
}

export const PONTOS_DE_LOJA: readonly PontoDeLoja[] = [
  {
    id: 'loja_mercado',
    mapa: 'mercado',
    // caixa registradora do salao: `{ peca: [1, 0], tx: 15, ty: 13 }` em
    // MERCADO_PECAS. O movel ocupa x 15..18 com a base encostada na parede de
    // baixo, entao o jogador atende pela frente, vindo de y 12.
    tile: { x: 16, y: 13 },
    nome: 'Mercado',
    rotulo: 'Comprar',
    categorias: ['normal', 'eletronico'],
  },
];

/** Os pontos de loja de um mapa (vazio na maioria deles). */
export function lojasDoMapa(mapa: string): PontoDeLoja[] {
  return PONTOS_DE_LOJA.filter((p) => p.mapa === mapa);
}

export function buscarLoja(id: string): PontoDeLoja | undefined {
  return PONTOS_DE_LOJA.find((p) => p.id === id);
}

/** O que um ponto vende, na ordem das categorias declaradas nele. */
export function itensDaLoja(ponto: PontoDeLoja): DefinicaoItemLoja[] {
  return ponto.categorias.flatMap((cat) => CATALOGO_ITENS.filter((i) => i.categoria === cat));
}

// --------------------------------------------------------------- compra --

/** Teto por compra: acima disso e engano de digitacao, nao pedido. */
export const LIMITE_POR_COMPRA = 99;

export type FalhaCompra =
  /** id que nao esta a venda */
  | 'item'
  /** quantidade zerada, negativa ou acima do limite */
  | 'quantidade'
  /** saldo nao cobre o total */
  | 'saldo'
  /** o inventario nao tem espaco pra quantidade pedida */
  | 'espaco'
  /** disparo duplo da mesma compra — ver `JANELA_DUPLO_CLIQUE` */
  | 'duplicada';

export interface ResultadoCompra {
  ok: boolean;
  falha?: FalhaCompra;
  /** quanto a compra custaria/custou, em centavos */
  total: number;
}

/**
 * Janela, em ms, em que a MESMA compra (mesmo item, mesma quantidade) e tratada
 * como disparo duplo e recusada.
 *
 * A trava de re-entrancia da `Carteira` cobre o caso de uma transacao chamar
 * outra por dentro, mas nao o duplo-clique: sao duas chamadas seguidas e
 * separadas, e pra carteira as duas sao legitimas. Curta o bastante pra nao
 * atrapalhar quem quer mesmo comprar duas vezes seguidas.
 */
const JANELA_DUPLO_CLIQUE = 300;

const agora = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

let ultimaCompra = { id: '', quantidade: 0, quando: Number.NEGATIVE_INFINITY };

/** Zera a trava de duplo-clique. So pra teste — o jogo nao precisa chamar. */
export function esquecerUltimaCompra(): void {
  ultimaCompra = { id: '', quantidade: 0, quando: Number.NEGATIVE_INFINITY };
}

/**
 * Compra `quantidade` unidades de `idItem`.
 *
 * Nao ha nenhum passo aqui que altere o mundo por conta propria: a mudanca toda
 * acontece dentro de `Carteira.gastar`, que confere saldo E espaco antes de
 * debitar qualquer coisa. Se faltar dinheiro OU faltar slot, a funcao devolve a
 * falha e nada mudou — nem o saldo, nem o inventario.
 */
export function comprar(idItem: string, quantidade: number): ResultadoCompra {
  const def = buscarItemDeLoja(idItem);
  if (!def) {
    console.warn(`[loja] "${idItem}" nao esta a venda`);
    return { ok: false, falha: 'item', total: 0 };
  }

  // recusa em vez de arredondar: 1,5 virando 1 seria uma compra que ninguem
  // pediu, e o chamador nunca ficaria sabendo que o pedido dele foi mudado
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > LIMITE_POR_COMPRA) {
    return { ok: false, falha: 'quantidade', total: 0 };
  }
  const qtd = quantidade;
  const total = def.preco * qtd;

  const t = agora();
  const repetida =
    ultimaCompra.id === def.id &&
    ultimaCompra.quantidade === qtd &&
    t - ultimaCompra.quando < JANELA_DUPLO_CLIQUE;
  if (repetida) {
    console.warn('[loja] compra ignorada: disparo duplo da mesma compra');
    return { ok: false, falha: 'duplicada', total };
  }

  // As duas metades da entrega. `cabe` NAO altera nada — e o que permite a
  // carteira decidir antes de debitar (ver `Entrega` em game/dinheiro.ts).
  const entrega: Entrega = {
    cabe: () => estado.inventario.cabe(def.id, qtd),
    entregar: () => {
      const resto = estado.inventario.adicionar(def.id, qtd);
      if (resto > 0) {
        // Inalcancavel: `cabe` e `adicionar` seguem a mesma regra de
        // empilhamento. Se um dia divergirem, e aqui que aparece.
        console.error(`[loja] BUG: cabe() aprovou mas sobraram ${resto} de "${def.id}"`);
      }
    },
  };

  const r = estado.carteira.gastar(total, entrega);
  if (r.ok) {
    ultimaCompra = { id: def.id, quantidade: qtd, quando: t };
    return { ok: true, total };
  }

  const falha: FalhaCompra =
    r.motivo === 'saldo' ? 'saldo' : r.motivo === 'entrega' ? 'espaco' : 'quantidade';
  return { ok: false, falha, total };
}

/**
 * Quantas unidades de `idItem` o jogador consegue levar agora — o menor entre o
 * que o dinheiro compra e o que o inventario aceita. Serve pra UI ja abrir numa
 * quantidade viavel em vez de deixar o jogador tentar e falhar.
 */
export function quantidadeViavel(idItem: string): number {
  const def = buscarItemDeLoja(idItem);
  if (!def || def.preco <= 0) return 0;
  const porDinheiro = Math.floor(estado.carteira.saldo / def.preco);
  let maximo = Math.min(porDinheiro, LIMITE_POR_COMPRA);
  // o teto por espaco nao tem formula fechada (depende das pilhas parciais),
  // entao desce ate caber — sao no maximo 99 passos
  while (maximo > 0 && !estado.inventario.cabe(def.id, maximo)) maximo -= 1;
  return maximo;
}

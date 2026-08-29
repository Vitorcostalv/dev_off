import { estado } from './estado.ts';
import type { Entrega } from './dinheiro.ts';
import { CATALOGO_ITENS, buscarItemDeLoja } from './itens.ts';
import type { CategoriaItem, DefinicaoItemLoja } from './itens.ts';
import type { NivelRelacao } from './relacoes.ts';

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
  /**
   * Dono do ponto, quando ha um NPC atras do balcao. E o que liga o preco ao
   * relacionamento (ver `precoComDesconto`). Ponto SEM dono — a DevStore, que e
   * uma loja online sem NPC — deixa isto de fora e nunca da desconto.
   */
  npcDono?: string;
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
    // Jaqueline e a atendente do mercado: e a relacao com ela que barateia a
    // compra aqui. Farmacia (Wendel) e bar (Alice) ainda nao vendem; quando
    // venderem, basta declarar o ponto com `npcDono` e o desconto ja vale.
    npcDono: 'jaqueline',
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

// --------------------------------------------------------- desconto por relacao --
/**
 * Desconto por NIVEL de relacionamento com o dono do ponto.
 *
 * A tabela e indexada pelo NIVEL (o valor mecanico), nao pelo rotulo mostrado
 * ao jogador: Jaqueline le "Confianca profunda" onde os outros leem
 * "Namorando", e as duas leituras tem de dar os mesmos 10%. Amarrar o desconto
 * ao texto faria o override de rotulo mudar o preco sem querer.
 *
 *   Estranho / Conhecido   0%
 *   Amigo      (4  a 7,5)  5%
 *   Namorando  (8  a 11,5) 10%
 *   Casamento  (12)        15%
 */
export const DESCONTO_POR_NIVEL: Record<NivelRelacao, number> = {
  Estranho: 0,
  Conhecido: 0,
  Amigo: 0.05,
  Namorando: 0.1,
  Casamento: 0.15,
};

/** O percentual ativo com um NPC agora: 0 a 0,15. */
export function percentualDescontoNpc(npcDono: string | undefined): number {
  if (!npcDono) return 0;
  return DESCONTO_POR_NIVEL[estado.relacoes.getNivel(npcDono)] ?? 0;
}

/**
 * Preco final de um item num ponto com dono.
 *
 * FUNCAO UNICA: quem mostra preco e quem cobra chamam esta mesma funcao, senao
 * a vitrine e o caixa discordam. Arredonda pra BAIXO — o desconto nunca pode
 * sair menor do que o anunciado por causa de arredondamento.
 *
 * @param precoBase preco de tabela em CENTAVOS
 * @param npcDono   dono do ponto; `undefined` devolve o preco cheio
 */
export function precoComDesconto(precoBase: number, npcDono: string | undefined): number {
  const desconto = percentualDescontoNpc(npcDono);
  if (desconto <= 0) return precoBase;
  return Math.floor(precoBase * (1 - desconto));
}

/** O preco de um item NO PONTO em que ele esta sendo vendido. */
export function precoNoPonto(item: DefinicaoItemLoja, ponto: PontoDeLoja | null | undefined): number {
  return precoComDesconto(item.preco, ponto?.npcDono);
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
export function comprar(
  idItem: string,
  quantidade: number,
  ponto?: PontoDeLoja | null,
): ResultadoCompra {
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
  // o desconto entra AQUI, na unica funcao que cobra. A vitrine usa a mesma
  // `precoNoPonto`, entao o valor da tela e o valor do caixa sao o mesmo numero.
  const total = precoNoPonto(def, ponto) * qtd;

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
export function quantidadeViavel(idItem: string, ponto?: PontoDeLoja | null): number {
  const def = buscarItemDeLoja(idItem);
  if (!def || def.preco <= 0) return 0;
  const unidade = precoNoPonto(def, ponto);
  if (unidade <= 0) return 0;
  const porDinheiro = Math.floor(estado.carteira.saldo / unidade);
  let maximo = Math.min(porDinheiro, LIMITE_POR_COMPRA);
  // o teto por espaco nao tem formula fechada (depende das pilhas parciais),
  // entao desce ate caber — sao no maximo 99 passos
  while (maximo > 0 && !estado.inventario.cabe(def.id, maximo)) maximo -= 1;
  return maximo;
}

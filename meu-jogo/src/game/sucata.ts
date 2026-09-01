/**
 * SALVADO ELETRONICO — o que se tira da represa e o que ele vale.
 *
 * Este arquivo tem tres coisas e nenhuma quarta:
 *
 *  1. os itens de salvado (`ITENS_DE_SUCATA`), que entram no `CATALOGO_ITENS`
 *     como qualquer outro item — mesmo inventario, mesma pilha, mesmo icone;
 *  2. as TABELAS DE SORTEIO, uma por nivel da represa, mais as de premio de
 *     puzzle e a do cofre profundo;
 *  3. a REVENDA, que e o que fecha o ciclo de dinheiro.
 *
 * O que ele NAO faz: nao mexe em carteira nem em inventario direto. `vender`
 * recebe as duas dependencias por parametro, pelo mesmo motivo que a loja usa
 * `Entrega` — a transacao tem de ser atomica e testavel sem cena.
 */

import type { DefinicaoItemLoja } from './itens.ts';

/** Raridade do salvado. E o que a UI colore e o que as tabelas ponderam. */
export type RaridadeSucata = 'comum' | 'incomum' | 'raro';

interface EntradaSucata {
  id: string;
  nome: string;
  descricao: string;
  raridade: RaridadeSucata;
  /** preco de referencia em CENTAVOS; a revenda paga uma fracao disto */
  valor: number;
  icone: number;
  maxPilha: number;
}

/**
 * Os 15 salvados.
 *
 * O PRECO E FIXO e escrito aqui, nao sorteado pelo hash como o resto do
 * catalogo. Motivo: o valor do salvado E a regra de balanceamento do ciclo da
 * represa (risco por profundidade), e sorteio nao se equilibra — um sucateado
 * comum caro tornaria o nivel -1 mais lucrativo que o -4.
 *
 * A escala: sucata comum paga trocado (R$ 2 a R$ 9), incomum paga uma diaria de
 * conserto (R$ 18 a R$ 55) e rara paga como uma vaga boa do app Trabalho
 * (R$ 120 a R$ 280). Nenhum deles paga como um eletronico novo de vitrine — o
 * salvado e materia-prima, nao produto.
 */
const ENTRADAS: readonly EntradaSucata[] = [
  // ------------------------------------------------------------- comum --
  { id: 'ferro_velho', nome: 'Ferro-velho', raridade: 'comum', valor: 300, icone: 0x8a8f94, maxPilha: 99,
    descricao: 'Chapa e cantoneira retorcidas. Vende por peso, nao por peca.' },
  { id: 'fio_de_cobre', nome: 'Fio de Cobre', raridade: 'comum', valor: 700, icone: 0xc07a44, maxPilha: 99,
    descricao: 'Rolo de cobre descascado da fiacao da usina. O que mais paga entre as sucatas.' },
  { id: 'cabo_velho', nome: 'Cabo Velho', raridade: 'comum', valor: 400, icone: 0x5d5f63, maxPilha: 99,
    descricao: 'Cabo blindado, capa rachada, condutor inteiro. Da pra reaproveitar em bancada.' },
  { id: 'parafusos', nome: 'Parafusos Sortidos', raridade: 'comum', valor: 200, icone: 0xa9aeb3, maxPilha: 99,
    descricao: 'Um punhado de parafuso, porca e arruela. Nunca do tamanho que voce precisa.' },
  { id: 'conector_danificado', nome: 'Conector Danificado', raridade: 'comum', valor: 500, icone: 0x7f6b8f, maxPilha: 99,
    descricao: 'Conector industrial com pino torto. Serve pra estudar o pinout.' },
  // ----------------------------------------------------------- incomum --
  { id: 'placa_de_circuito', nome: 'Placa de Circuito', raridade: 'incomum', valor: 2600, icone: 0x3f8f5f, maxPilha: 30,
    descricao: 'Placa de controle antiga, trilha oxidada. Tem componente aproveitavel.' },
  { id: 'motor_pequeno', nome: 'Motor Pequeno', raridade: 'incomum', valor: 3400, icone: 0x6a707a, maxPilha: 30,
    descricao: 'Motor de atuador de comporta. Gira quando se ajuda com a mao.' },
  { id: 'sensor_industrial', nome: 'Sensor Industrial', raridade: 'incomum', valor: 2900, icone: 0x4f9fbf, maxPilha: 30,
    descricao: 'Sensor de nivel com a carcaca trincada. A eletronica parece intacta.' },
  { id: 'fonte_chaveada', nome: 'Fonte Chaveada', raridade: 'incomum', valor: 3800, icone: 0xbf8f3f, maxPilha: 30,
    descricao: 'Fonte de painel, capacitor estufado. Trocando os capacitores, volta.' },
  { id: 'bateria_selada', nome: 'Bateria Selada', raridade: 'incomum', valor: 2200, icone: 0xd0b040, maxPilha: 30,
    descricao: 'Bateria de emergencia da usina. Ainda segura carga por alguns minutos.' },
  { id: 'rele_industrial', nome: 'Rele Industrial', raridade: 'incomum', valor: 1800, icone: 0x9a5f4f, maxPilha: 30,
    descricao: 'Rele de contato de potencia. Clica firme, o que e bom sinal.' },
  // -------------------------------------------------------------- raro --
  { id: 'modulo_de_controle', nome: 'Modulo de Controle', raridade: 'raro', valor: 18000, icone: 0x3f6fbf, maxPilha: 10,
    descricao: 'Modulo intacto, ainda lacrado na embalagem antiestatica. Nao devia estar aqui.' },
  { id: 'placa_especializada', nome: 'Placa Especializada', raridade: 'raro', valor: 22000, icone: 0x6f4fbf, maxPilha: 10,
    descricao: 'Placa sem serigrafia de fabricante e com trilha que nao segue norma nenhuma.' },
  { id: 'processador_antigo', nome: 'Processador Antigo', raridade: 'raro', valor: 15000, icone: 0xcfae5f, maxPilha: 10,
    descricao: 'Encapsulamento ceramico, pinos dourados. Colecionador paga mais que sucateiro.' },
  { id: 'componente_incomum', nome: 'Componente Inclassificavel', raridade: 'raro', valor: 28000, icone: 0xbf4f7f, maxPilha: 10,
    descricao: 'Nao ha marcacao, nao ha datasheet, e ele esquenta sozinho. Guarde com cuidado.' },
];

export const IDS_DE_SUCATA: readonly string[] = ENTRADAS.map((e) => e.id);

/**
 * Precos de salvado no formato de `PRECO_MANUAL` de itens.ts. Sao FIXOS: e por
 * isso que eles entram na tabela de preco manual em vez de sair do hash — ver o
 * comentario de `ENTRADAS`.
 */
export const PRECOS_DE_SUCATA: Record<string, number> = Object.fromEntries(
  ENTRADAS.map((e) => [e.id, e.valor]),
);

const POR_ID = new Map(ENTRADAS.map((e) => [e.id, e]));

export function ehSucata(id: string): boolean {
  return POR_ID.has(id);
}

export function raridadeDeSucata(id: string): RaridadeSucata | null {
  return POR_ID.get(id)?.raridade ?? null;
}

/** Valor de referencia do salvado, em centavos. */
export function valorDeSucata(id: string): number {
  return POR_ID.get(id)?.valor ?? 0;
}

/**
 * As entradas no formato do `CATALOGO_ITENS`. Categoria `sucata` porque as tres
 * que existiam nao servem: `material` tem envelope de preco de tijolo (R$ 4 a
 * R$ 12) e um modulo raro vale R$ 180; `eletronico` e prateleira de loja, e
 * salvado nao esta a venda em loja nenhuma.
 */
export const ITENS_DE_SUCATA: readonly DefinicaoItemLoja[] = ENTRADAS.map((e) => ({
  id: e.id,
  nome: e.nome,
  descricao: e.descricao,
  categoria: 'sucata' as const,
  maxPilha: e.maxPilha,
  preco: e.valor,
  icone: e.icone,
}));

// ------------------------------------------------------------- tabelas --
/**
 * Uma tabela de sorteio: quantas pecas saem e com que peso cada id.
 *
 * `pesos` NAO sao probabilidades escritas a mao — sao pesos relativos, e a
 * soma nao precisa fechar 100. Isso e de proposito: acrescentar um id novo a
 * uma tabela nao obriga a recalcular os outros.
 */
export interface TabelaDeSucata {
  id: string;
  /** minimo e maximo de PECAS sorteadas (cada peca e um id + quantidade 1) */
  pecasMin: number;
  pecasMax: number;
  pesos: Readonly<Record<string, number>>;
}

/**
 * Uma tabela por nivel, mais os premios.
 *
 * A PROGRESSAO e o ponto: no nivel -1 o cofre de premio ja da uma peca incomum,
 * mas o sorteio comum e quase todo ferro-velho; no -4 o comum ja e incomum e a
 * peca rara aparece. O cofre profundo (`nivel_4_cofre`) e a UNICA fonte de raro
 * garantida — todo o resto e sorte, e por isso nada critico de historia sai de
 * sorteio (ver o comentario de `sortear`).
 */
export const TABELAS_DE_SUCATA: readonly TabelaDeSucata[] = [
  {
    id: 'nivel_0', pecasMin: 1, pecasMax: 2,
    pesos: { ferro_velho: 40, parafusos: 30, cabo_velho: 20, fio_de_cobre: 10 },
  },
  {
    id: 'nivel_0_premio', pecasMin: 2, pecasMax: 3,
    pesos: { fio_de_cobre: 40, cabo_velho: 30, conector_danificado: 20, rele_industrial: 10 },
  },
  {
    id: 'nivel_1', pecasMin: 1, pecasMax: 3,
    pesos: { ferro_velho: 30, parafusos: 22, cabo_velho: 20, fio_de_cobre: 18, conector_danificado: 10 },
  },
  {
    id: 'nivel_1_premio', pecasMin: 2, pecasMax: 3,
    pesos: { rele_industrial: 34, bateria_selada: 26, placa_de_circuito: 20, fio_de_cobre: 20 },
  },
  {
    id: 'nivel_2', pecasMin: 2, pecasMax: 3,
    pesos: {
      ferro_velho: 20, fio_de_cobre: 20, cabo_velho: 16, conector_danificado: 14,
      rele_industrial: 12, placa_de_circuito: 10, bateria_selada: 8,
    },
  },
  {
    id: 'nivel_2_premio', pecasMin: 2, pecasMax: 4,
    pesos: { placa_de_circuito: 30, motor_pequeno: 24, fonte_chaveada: 20, sensor_industrial: 16, processador_antigo: 10 },
  },
  {
    id: 'nivel_3', pecasMin: 2, pecasMax: 4,
    pesos: {
      fio_de_cobre: 18, conector_danificado: 14, placa_de_circuito: 16, sensor_industrial: 14,
      motor_pequeno: 12, fonte_chaveada: 12, bateria_selada: 10, processador_antigo: 4,
    },
  },
  {
    id: 'nivel_3_premio', pecasMin: 3, pecasMax: 4,
    pesos: { fonte_chaveada: 26, sensor_industrial: 24, motor_pequeno: 20, processador_antigo: 18, modulo_de_controle: 12 },
  },
  {
    id: 'nivel_4', pecasMin: 3, pecasMax: 4,
    pesos: {
      placa_de_circuito: 18, sensor_industrial: 16, fonte_chaveada: 16, motor_pequeno: 14,
      processador_antigo: 14, modulo_de_controle: 12, placa_especializada: 10,
    },
  },
  {
    // COFRE do setor profundo: a recompensa do puzzle de tres passos. E a unica
    // tabela que so tem peca rara, e a unica que garante o componente
    // inclassificavel — que e o gancho de historia da usina.
    id: 'nivel_4_cofre', pecasMin: 3, pecasMax: 4,
    pesos: { componente_incomum: 30, placa_especializada: 26, modulo_de_controle: 24, processador_antigo: 20 },
  },
];

const TABELA_POR_ID = new Map(TABELAS_DE_SUCATA.map((t) => [t.id, t]));

export function buscarTabelaDeSucata(id: string): TabelaDeSucata | null {
  return TABELA_POR_ID.get(id) ?? null;
}

/**
 * Sorteia o conteudo de um recipiente.
 *
 * `aleatorio` entra por parametro (e nao `Math.random` direto) pra a conferencia
 * offline poder rodar com uma sequencia fixa e provar a distribuicao — e o mesmo
 * motivo pelo qual a geracao de mundo usa hash em vez de random.
 *
 * NADA CRITICO DE HISTORIA sai daqui: os documentos, os codigos e as flags de
 * puzzle sao objetos fixos no mapa. Uma tabela azarada custa dinheiro ao
 * jogador, nunca o progresso.
 */
export function sortearSucata(
  tabela: TabelaDeSucata,
  aleatorio: () => number = Math.random,
): { id: string; quantidade: number }[] {
  const ids = Object.keys(tabela.pesos);
  const total = ids.reduce((soma, id) => soma + tabela.pesos[id], 0);
  if (total <= 0 || ids.length === 0) return [];
  const faixa = tabela.pecasMax - tabela.pecasMin + 1;
  const pecas = tabela.pecasMin + Math.floor(aleatorio() * faixa);
  const contagem = new Map<string, number>();
  for (let i = 0; i < pecas; i++) {
    let corte = aleatorio() * total;
    let escolhido = ids[ids.length - 1];
    for (const id of ids) {
      corte -= tabela.pesos[id];
      if (corte < 0) {
        escolhido = id;
        break;
      }
    }
    contagem.set(escolhido, (contagem.get(escolhido) ?? 0) + 1);
  }
  return [...contagem].map(([id, quantidade]) => ({ id, quantidade }));
}

// ------------------------------------------------------------- revenda --
/**
 * Quanto a revenda PAGA, como fracao do valor de referencia.
 *
 * Nao e 100% de proposito: a diferenca e o que faz o jogador preferir usar a
 * peca na bancada quando ela serve pra alguma coisa, em vez de vender tudo
 * sempre. E nao e baixa demais — vender e o ciclo principal de dinheiro da
 * represa, e cobrar pedagio de 50% tornaria a viagem inteira sem gracaa.
 */
export const FRACAO_DE_REVENDA = 0.8;

export function precoDeRevenda(id: string, quantidade = 1): number {
  const unidade = Math.round(valorDeSucata(id) * FRACAO_DE_REVENDA);
  return unidade * Math.max(0, Math.floor(quantidade));
}

export type FalhaRevenda = 'item' | 'quantidade' | 'estoque' | 'credito';

export interface ResultadoRevenda {
  ok: boolean;
  motivo?: FalhaRevenda;
  /** centavos creditados; 0 quando recusada */
  pago: number;
}

/**
 * Vende salvado: tira do inventario e credita a carteira.
 *
 * A ORDEM importa e e o que impede duplicar dinheiro por acionamento repetido:
 * remove PRIMEIRO, e so credita o que realmente saiu do inventario. Se o
 * credito for recusado (teto de saldo), o item volta — e o unico ponto em que
 * ha desfazer, e ele e exato porque a quantidade removida e conhecida.
 */
export function venderSucata(
  inventario: {
    contar(id: string): number;
    remover(id: string, qtd: number): number;
    adicionar(id: string, qtd: number): number;
  },
  carteira: { ganhar(centavos: number): { ok: boolean } },
  id: string,
  quantidade: number,
): ResultadoRevenda {
  if (!ehSucata(id)) return { ok: false, motivo: 'item', pago: 0 };
  const pedido = Math.floor(quantidade);
  if (!Number.isFinite(pedido) || pedido <= 0) return { ok: false, motivo: 'quantidade', pago: 0 };
  if (inventario.contar(id) < pedido) return { ok: false, motivo: 'estoque', pago: 0 };

  const removido = inventario.remover(id, pedido);
  if (removido <= 0) return { ok: false, motivo: 'estoque', pago: 0 };
  const pago = precoDeRevenda(id, removido);
  const credito = carteira.ganhar(pago);
  if (!credito.ok) {
    inventario.adicionar(id, removido);
    return { ok: false, motivo: 'credito', pago: 0 };
  }
  return { ok: true, pago };
}

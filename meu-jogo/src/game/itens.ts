/**
 * Catalogo dos itens de verdade — os que vem das duas folhas de arte de item
 * (`Itens_do_mercado_v1.png` e `itens_Eletronicos.png`) e que a loja do mercado
 * vende.
 *
 * Este arquivo e a FONTE UNICA: `tools/gerar-itens.mjs` importa a mesma lista
 * pra decidir o que empacotar no atlas `itens`, e `game/inventario.ts` importa
 * pra registrar os itens. Nao ha como sobrar um item no catalogo sem frame no
 * atlas, nem um frame no atlas que ninguem usa — o gerador erra alto nos dois
 * casos.
 *
 * Cada entrada e uma tupla curta pra lista caber na tela:
 *
 *     [[linha, indice], id, nome, descricao]
 *
 * `[linha, indice]` e o endereco da peca na folha, no mesmo esquema ja usado
 * por `CATALOGO_POR_COMODO` pra mobilia: as pecas sao detectadas por blob e
 * agrupadas em linhas, entao o endereco e estavel enquanto a arte nao mudar de
 * layout (e se mudar, o gerador reprova a contagem de linhas em vez de gerar
 * frame errado em silencio).
 */

export type CategoriaItem = 'normal' | 'eletronico';

/** Qual folha de arte guarda a peca do icone. */
export type FolhaDeItem = 'mercado' | 'eletronicos';

/** Uma linha do catalogo antes de virar `DefinicaoItemLoja`. */
type Entrada = readonly [peca: readonly [number, number], id: string, nome: string, descricao: string];

export interface DefinicaoItemLoja {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaItem;
  folha: FolhaDeItem;
  peca: readonly [number, number];
  /** nome do frame no atlas `itens` */
  frame: string;
  /** quantos cabem num slot do inventario */
  maxPilha: number;
  /** preco de compra em CENTAVOS (ver `precoDe`) */
  preco: number;
}

// ---------------------------------------------------------------- precos --
/**
 * Semente do gerador de precos. Fixa de proposito: o preco de um item e sempre
 * o mesmo, em toda maquina e em todo reload — nao ha `Math.random` aqui. E a
 * mesma tecnica da geracao de mundo em `tools/png.mjs` (`hash01`), so que
 * indexada pelo id do item em vez de por coordenada.
 */
const SEMENTE_PRECO = 20260828;

/**
 * Faixa de preco por categoria, em CENTAVOS. Eletronico e uma ordem de grandeza
 * mais caro que item de mercado: a ideia e que a compra do dia a dia caiba no
 * troco e a eletronica exija juntar dinheiro.
 *
 * Os dois numeros sao o piso e o teto ANTES do arredondamento comercial.
 */
export const FAIXA_DE_PRECO: Record<CategoriaItem, readonly [number, number]> = {
  normal: [150, 3990], // R$ 1,50 a R$ 39,90
  eletronico: [4900, 129000], // R$ 49,00 a R$ 1.290,00
};

/**
 * Preco fixado a mao, sobrepondo o gerado. E aqui que se ajusta o item que saiu
 * caro ou barato demais pro que ele e, sem tocar na tabela inteira: basta
 * acrescentar `id: centavos`. Vazio hoje — todos os precos sao os gerados.
 *
 * Ex: PRECO_MANUAL = { pilhas_recarregaveis: 2990 };
 */
export const PRECO_MANUAL: Record<string, number> = {};

/** Hash de texto -> [0,1). Deterministico, mesma avalanche do `hash01`. */
function hash01Texto(texto: string, semente: number): number {
  let h = semente | 0;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193);
  }
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Preco de um item, em centavos. Sorteia dentro da faixa da categoria pelo hash
 * do id e arredonda pro "x,90" de vitrine mais proximo, sem nunca cair abaixo
 * do piso da faixa.
 */
export function precoDe(id: string, categoria: CategoriaItem): number {
  const manual = PRECO_MANUAL[id];
  if (manual !== undefined) return manual;
  const [minimo, maximo] = FAIXA_DE_PRECO[categoria];
  const bruto = minimo + hash01Texto(id, SEMENTE_PRECO) * (maximo - minimo);
  // arredonda pro real cheio e tira 10 centavos: R$ 12,90 em vez de R$ 12,37
  const comercial = Math.round(bruto / 100) * 100 - 10;
  return Math.max(minimo, comercial);
}

/** Nome do frame de um item no atlas `itens`. */
export const frameDoItem = (id: string): string => `item_${id}`;

// -------------------------------------------------------------- catalogo --
/**
 * Mercado — hortifruti, padaria, acougue/laticinio, bebida e mercearia seca.
 * Sao as cinco primeiras linhas da folha; da linha 5 pra baixo a arte e de
 * MOBILIARIO de loja (balcao, caixa registradora, expositor, palete), que nao e
 * item de inventario e por isso fica de fora.
 */
const MERCADO: readonly Entrada[] = [
  // --- linha 0: hortifruti ---
  [[0, 0], 'maca', 'Maca', 'Vermelha e firme. Some da fruteira em dois dias.'],
  [[0, 1], 'maca_verde', 'Maca Verde', 'Mais acida que a vermelha. Boa pra torta.'],
  [[0, 2], 'banana', 'Cacho de Banana', 'Ainda um pouco verde no talo.'],
  [[0, 3], 'laranja', 'Laranja', 'Casca grossa, cheiro forte.'],
  [[0, 4], 'uva', 'Cacho de Uva', 'Roxa e sem semente.'],
  [[0, 5], 'morango', 'Bandeja de Morango', 'Doze morangos, dois deles amassados.'],
  [[0, 6], 'tomate', 'Tomate', 'Maduro no ponto de molho.'],
  [[0, 7], 'cenoura', 'Cenoura', 'Com a rama ainda presa.'],
  [[0, 8], 'alface', 'Alface', 'Um pe inteiro, lavado.'],
  [[0, 9], 'brocolis', 'Brocolis', 'Firme e bem verde.'],
  [[0, 10], 'milho', 'Espiga de Milho', 'Palha aberta so na ponta.'],
  [[0, 11], 'batata', 'Batatas', 'Um punhado, ainda com terra.'],
  [[0, 12], 'cebola', 'Cebola', 'Casca dourada e seca.'],
  [[0, 13], 'cebola_roxa', 'Cebola Roxa', 'Mais suave que a branca, boa crua.'],
  [[0, 14], 'alho', 'Alho', 'Cabeca inteira, dentes graudos.'],
  // --- linha 1: padaria e confeitaria ---
  [[1, 0], 'pao_frances', 'Pao Frances', 'Casquinha ainda morna.'],
  [[1, 1], 'pao_de_forma', 'Pao de Forma', 'Fatiado e embalado.'],
  [[1, 2], 'baguete', 'Baguete', 'Longa demais pra sacola.'],
  [[1, 3], 'pao_caseiro', 'Pao Caseiro', 'Redondo, de fermentacao lenta.'],
  [[1, 4], 'croissant', 'Croissant', 'Solta lasca so de olhar.'],
  [[1, 5], 'muffin', 'Muffin', 'Com gotas de chocolate.'],
  [[1, 6], 'rosquinha', 'Rosquinha Rosa', 'Cobertura rosa e granulado.'],
  [[1, 7], 'rosquinha_chocolate', 'Rosquinha de Chocolate', 'Cobertura grossa demais.'],
  [[1, 8], 'cookies', 'Cookies', 'Um saquinho com seis.'],
  [[1, 9], 'torta', 'Torta', 'Massa folhada com recheio de frutas.'],
  [[1, 10], 'fatia_bolo', 'Fatia de Bolo', 'Tres camadas, recheio de chocolate.'],
  [[1, 11], 'fatia_cheesecake', 'Fatia de Cheesecake', 'Com calda de morango por cima.'],
  [[1, 12], 'bolo_morango', 'Bolo de Morango', 'Inteiro. Nao cabe numa mao so.'],
  // --- linha 2: acougue e laticinio ---
  [[2, 0], 'bife', 'Bife', 'Corte grosso, embalado em bandeja.'],
  [[2, 1], 'frango', 'Frango', 'Peito resfriado, na bandeja.'],
  [[2, 2], 'carne_moida', 'Carne Moida', 'Meio quilo, moida na hora.'],
  [[2, 3], 'salsicha', 'Salsicha', 'Bandeja com oito.'],
  [[2, 4], 'bacon', 'Bacon', 'Fatiado fino, do jeito que frita melhor.'],
  [[2, 5], 'salame', 'Salame', 'Peca inteira, curada.'],
  [[2, 6], 'queijo_suico', 'Queijo Suico', 'Cheio de olhaduras.'],
  [[2, 7], 'queijo_prato', 'Queijo Prato', 'Roda com a casca vermelha.'],
  [[2, 8], 'manteiga', 'Manteiga', 'Tablete com sal.'],
  [[2, 9], 'ovos', 'Duzia de Ovos', 'Caixa fechada, nenhum trincado.'],
  [[2, 10], 'leite', 'Leite', 'Caixa de um litro, integral.'],
  // --- linha 3: bebida e mercearia liquida ---
  [[3, 0], 'leite_desnatado', 'Leite Desnatado', 'Mesma caixa, menos gordura.'],
  [[3, 1], 'achocolatado', 'Achocolatado', 'Pronto pra beber, bem doce.'],
  [[3, 2], 'suco_laranja', 'Suco de Laranja', 'Caixa de um litro.'],
  [[3, 3], 'suco_uva', 'Suco de Uva', 'Integral, sem acucar.'],
  [[3, 4], 'iogurte', 'Iogurte', 'Potinho de morango.'],
  [[3, 5], 'creme_de_leite', 'Creme de Leite', 'Pote pequeno, pra molho.'],
  [[3, 6], 'molho_de_tomate', 'Molho de Tomate', 'Vidro com tampa de rosca.'],
  [[3, 7], 'maionese', 'Maionese', 'Pote grande, tradicional.'],
  [[3, 8], 'cafe', 'Cafe', 'Pote de cafe soluvel.'],
  [[3, 9], 'creme_de_chocolate', 'Creme de Chocolate', 'Pote de avela com chocolate.'],
  [[3, 10], 'mel', 'Mel', 'Pote de vidro, cristalizando no fundo.'],
  [[3, 11], 'refrigerante', 'Refrigerante', 'Lata gelada de cola.'],
  [[3, 12], 'refrigerante_limao', 'Refrigerante de Limao', 'Lata verde, bem gasosa.'],
  [[3, 13], 'agua', 'Agua Mineral', 'Garrafa de 500 ml.'],
  [[3, 14], 'oleo', 'Oleo', 'Garrafa de oleo de soja.'],
  // --- linha 4: mercearia seca e congelado ---
  [[4, 0], 'macarrao', 'Macarrao', 'Pacote de espaguete.'],
  [[4, 1], 'arroz', 'Arroz', 'Pacote de um quilo.'],
  [[4, 2], 'feijao', 'Feijao', 'Pacote de um quilo, carioca.'],
  [[4, 3], 'farinha', 'Farinha de Trigo', 'Pacote de um quilo.'],
  [[4, 4], 'acucar', 'Acucar', 'Pacote de um quilo, refinado.'],
  [[4, 5], 'sal', 'Sal', 'Pacote azul de sempre.'],
  [[4, 6], 'cereal', 'Cereal', 'Caixa de flocos com mel.'],
  [[4, 7], 'chips', 'Batata Chips', 'Saco grande, metade e ar.'],
  [[4, 8], 'biscoito', 'Biscoito', 'Pacote recheado.'],
  [[4, 9], 'barra_de_chocolate', 'Barra de Chocolate', 'Ao leite, ja meio derretida.'],
  [[4, 10], 'sorvete', 'Sorvete', 'Pote de dois litros.'],
  [[4, 11], 'ervilha_congelada', 'Ervilha Congelada', 'Saco que descongela rapido demais.'],
  [[4, 12], 'picole_chocolate', 'Picole de Chocolate', 'Cobertura crocante.'],
  [[4, 13], 'picole_frutas', 'Picole de Frutas', 'Rosa, de morango.'],
];

/**
 * Eletronicos — a folha e um cartaz com secoes rotuladas, entao o detector
 * tambem enxerga as tarjas de titulo ("AUDIO E SOM"). O gerador descarta essas
 * tarjas por geometria (barra larga e baixa) ANTES de numerar as linhas; ainda
 * assim ha linha de sobra na folha que nao virou item aqui — este catalogo e
 * uma selecao, nao a folha inteira.
 */
const ELETRONICOS: readonly Entrada[] = [
  // --- celular, tablet e computador ---
  [[0, 1], 'smartphone', 'Smartphone', 'Tela grande, bateria media.'],
  [[0, 3], 'smartphone_menta', 'Smartphone Menta', 'A cor que sobrou na loja.'],
  [[0, 6], 'smartphone_top', 'Smartphone Topo de Linha', 'Tres cameras e um preco absurdo.'],
  [[1, 0], 'tablet', 'Tablet', 'Bom pra ler, ruim pra escrever.'],
  [[1, 4], 'tablet_caneta', 'Tablet com Caneta', 'Vem com caneta que some em uma semana.'],
  [[1, 5], 'notebook', 'Notebook', 'Basico, pra planilha e navegador.'],
  [[1, 7], 'notebook_fino', 'Notebook Fino', 'Leve, aquece rapido.'],
  [[1, 8], 'notebook_gamer', 'Notebook Gamer', 'Ventoinha que parece um secador.'],
  [[0, 9], 'gabinete_pc', 'Gabinete de PC', 'Caixa preta, sem frescura.'],
  [[0, 11], 'gabinete_rgb', 'Gabinete RGB', 'Pisca mais do que processa.'],
  [[0, 8], 'monitor_azul', 'Monitor', 'Vinte e quatro polegadas.'],
  // --- audio ---
  [[0, 12], 'headset', 'Headset', 'Almofada de espuma, cabo longo.'],
  [[0, 13], 'headset_branco', 'Headset Branco', 'Suja com facilidade.'],
  [[0, 14], 'headset_gamer', 'Headset Gamer', 'Com microfone que capta o mundo todo.'],
  [[2, 0], 'fone_bluetooth', 'Fone Bluetooth', 'Estojo que carrega sozinho.'],
  [[4, 0], 'fone_intra', 'Fone Intra-auricular', 'Cai da orelha ao correr.'],
  [[0, 15], 'monitor_de_audio', 'Caixa de Estudio', 'Som limpo, grave curto.'],
  [[4, 2], 'caixa_portatil', 'Caixa Portatil', 'A prova de respingo, dizem.'],
  [[4, 3], 'radio_boombox', 'Radio Boombox', 'Toca radio e pendrive.'],
  [[4, 4], 'assistente_de_voz', 'Assistente de Voz', 'Escuta mais do que responde.'],
  [[1, 15], 'soundbar', 'Soundbar', 'Cabe embaixo da TV, quase.'],
  // --- tela ---
  [[4, 5], 'tv', 'TV', 'Quarenta polegadas, painel comum.'],
  [[5, 6], 'tv_4k', 'TV 4K', 'Mais pixel do que a vista alcanca.'],
  [[5, 8], 'monitor_24', 'Monitor 24"', 'IPS, borda fina.'],
  [[4, 7], 'monitor_curvo', 'Monitor Curvo', 'Ocupa a mesa inteira.'],
  // --- periferico ---
  [[2, 7], 'teclado_rgb', 'Teclado RGB', 'Mecanico e barulhento.'],
  [[4, 9], 'teclado', 'Teclado', 'Membrana, silencioso.'],
  [[2, 8], 'mouse', 'Mouse', 'Sem fio, dois botoes.'],
  [[4, 10], 'mouse_gamer', 'Mouse Gamer', 'Sete botoes, usa dois.'],
  [[4, 11], 'mousepad', 'Mousepad', 'Grande o bastante pra caber o teclado.'],
  [[5, 10], 'controle', 'Controle', 'Analogico ja com folga.'],
  [[5, 11], 'controle_branco', 'Controle Branco', 'Pilha AA nao inclusa.'],
  [[5, 12], 'volante_gamer', 'Volante Gamer', 'Com pedal e tudo.'],
  [[5, 13], 'cadeira_gamer', 'Cadeira Gamer', 'Confortavel nas duas primeiras horas.'],
  [[1, 9], 'webcam', 'Webcam', 'Full HD, foco fixo.'],
  [[1, 10], 'microfone', 'Microfone', 'Condensador com trip de mesa.'],
  [[1, 11], 'ring_light', 'Ring Light', 'Tres tons de branco.'],
  // --- rede ---
  [[2, 10], 'roteador', 'Roteador', 'Quatro antenas, sinal de duas.'],
  [[2, 11], 'roteador_branco', 'Roteador Branco', 'Bonito e comum.'],
  [[2, 12], 'switch_de_rede', 'Switch de Rede', 'Cinco portas gigabit.'],
  [[2, 13], 'adaptador_wifi', 'Adaptador Wi-Fi', 'USB com antena removivel.'],
  // --- armazenamento ---
  [[7, 0], 'ssd', 'SSD', 'Portatil, um terabyte.'],
  [[7, 1], 'ssd_nvme', 'SSD NVMe', 'Rapido a ponto de esquentar.'],
  [[7, 2], 'hd_externo', 'HD Externo', 'Dois terabytes, faz barulho.'],
  [[7, 4], 'pendrive', 'Pendrive', 'Some na primeira semana.'],
  [[7, 6], 'cartao_sd', 'Cartao SD', '64 GB, classe 10.'],
  [[7, 7], 'cartao_micro_sd', 'Cartao microSD', '128 GB, do tamanho de uma unha.'],
  // --- camera ---
  [[7, 8], 'camera', 'Camera', 'Reflex com lente de kit.'],
  [[7, 9], 'camera_de_acao', 'Camera de Acao', 'Vai molhar de qualquer jeito.'],
  [[7, 11], 'camera_de_seguranca', 'Camera de Seguranca', 'Gira sozinha, meio assustadora.'],
  [[7, 12], 'drone', 'Drone', 'Autonomia de vinte minutos.'],
  // --- energia ---
  [[7, 13], 'carregador', 'Carregador', 'Rapido, se o cabo ajudar.'],
  [[7, 16], 'filtro_de_linha', 'Filtro de Linha', 'Seis tomadas, cinco ocupadas.'],
  [[7, 17], 'power_bank', 'Power Bank', 'Carrega o celular duas vezes.'],
  [[7, 19], 'pilhas', 'Pilhas Recarregaveis', 'Quatro AA, com pouca carga de fabrica.'],
  // --- eletroportatil e casa ---
  [[9, 1], 'cafeteira', 'Cafeteira', 'De capsula, vermelha.'],
  [[9, 3], 'air_fryer', 'Air Fryer', 'A que todo mundo tem.'],
  [[9, 4], 'liquidificador', 'Liquidificador', 'Copo de vidro, doze velocidades.'],
  [[9, 5], 'microondas_portatil', 'Micro-ondas', 'Vinte litros, prato giratorio.'],
  [[9, 6], 'lampada_led', 'Lampada LED', 'Branca quente, 9 W.'],
  [[9, 7], 'lampada_rgb', 'Lampada RGB', 'Dezesseis milhoes de cores, usa tres.'],
  [[9, 8], 'tomada_inteligente', 'Tomada Inteligente', 'Liga pelo celular.'],
  // --- outros ---
  [[9, 13], 'calculadora', 'Calculadora', 'Solar, das que nunca acabam.'],
  [[9, 14], 'relogio_digital', 'Relogio Digital', 'Numeros grandes e verdes.'],
  [[9, 15], 'smartwatch', 'Smartwatch', 'Conta passos e cobra que voce ande.'],
  [[9, 16], 'console_portatil', 'Console Portatil', 'Tela pequena, bateria longa.'],
  [[9, 17], 'console_retro', 'Console Retro', 'Com dois controles e um cartucho preso.'],
];

/** Quantos de um item cabem num slot, pelo tamanho tipico da categoria. */
const PILHA_PADRAO: Record<CategoriaItem, number> = {
  normal: 20,
  eletronico: 5,
};

function montar(
  entradas: readonly Entrada[],
  categoria: CategoriaItem,
  folha: FolhaDeItem,
): DefinicaoItemLoja[] {
  return entradas.map(([peca, id, nome, descricao]) => ({
    id,
    nome,
    descricao,
    categoria,
    folha,
    peca,
    frame: frameDoItem(id),
    maxPilha: PILHA_PADRAO[categoria],
    preco: precoDe(id, categoria),
  }));
}

/**
 * O catalogo inteiro, na ordem em que a loja lista: mercado primeiro (o mais
 * barato e o que se compra toda semana), eletronico depois.
 */
export const CATALOGO_ITENS: readonly DefinicaoItemLoja[] = (() => {
  const lista = [
    ...montar(MERCADO, 'normal', 'mercado'),
    ...montar(ELETRONICOS, 'eletronico', 'eletronicos'),
  ];
  // id repetido daria dois itens diferentes com o mesmo frame e o mesmo slot de
  // inventario — melhor errar alto na carga do que descobrir jogando
  const vistos = new Set<string>();
  for (const item of lista) {
    if (vistos.has(item.id)) throw new Error(`[itens] id duplicado no catalogo: "${item.id}"`);
    vistos.add(item.id);
  }
  return lista;
})();

/** Um item do catalogo pelo id, ou undefined. */
export function buscarItemDeLoja(id: string): DefinicaoItemLoja | undefined {
  return CATALOGO_ITENS.find((i) => i.id === id);
}

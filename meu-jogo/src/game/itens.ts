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

/**
 * De que PRATELEIRA o item vem. Nao e o mesmo que `TipoItem` (o que ele faz na
 * mao do jogador) — categoria decide faixa de preco, cor de icone e em que
 * ponto de loja ele aparece.
 *
 * `sucata` entrou com a represa. Nao deu pra reaproveitar nenhuma das tres:
 * `material` tem envelope de tijolo (R$ 4 a R$ 12) e um modulo raro vale R$ 180;
 * `eletronico` e prateleira de vitrine, e salvado nao esta a venda em loja
 * nenhuma — ele so SAI do inventario, na revenda.
 */
import { ITENS_DE_SUCATA, PRECOS_DE_SUCATA } from './sucata.ts';

export type CategoriaItem =
  | 'normal'
  | 'eletronico'
  | 'material'
  | 'sucata'
  | 'utilidade'
  | 'remedio';

/** Qual folha de arte guarda a peca do icone. */
export type FolhaDeItem = 'mercado' | 'eletronicos' | 'represa';

/** Uma linha do catalogo antes de virar `DefinicaoItemLoja`. */
type Entrada = readonly [peca: readonly [number, number], id: string, nome: string, descricao: string];

export interface DefinicaoItemLoja {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaItem;
  /** Materiais sem arte usam icone de cor e nao entram no atlas gerado. */
  folha?: FolhaDeItem;
  peca?: readonly [number, number];
  /** nome do frame no atlas `itens` */
  frame?: string;
  /** cor do placeholder quando nao ha frame */
  icone?: number;
  /** quantos cabem num slot do inventario */
  maxPilha: number;
  /** preco de compra em CENTAVOS (ver `precoDe`) */
  preco: number;
  /** secao do eletronico; ausente nos itens de mercado */
  secao?: SecaoEletronico;
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
 * Secao de eletronico. NAO e a mesma coisa que `categoria`: categoria e a
 * prateleira (mercado x eletronico) e secao e o TIPO de eletronico.
 *
 * Existe por causa de um problema concreto: quando o hash sorteava dentro de
 * uma faixa unica de R$ 49 a R$ 1.290 pra todos os 110 eletronicos, saiam
 * comparacoes absurdas — um pendrive a R$ 1.200 ao lado de outro a R$ 70, um
 * cabo mais caro que um notebook. O hash continua decidindo o preco, mas agora
 * so escolhe a POSICAO DENTRO da faixa da propria secao. Dois pendrives ficam
 * na mesma faixa e um notebook nunca desce pra faixa de cabo.
 */
export type SecaoEletronico =
  | 'celulares'
  | 'computadores'
  | 'telas'
  | 'audio'
  | 'perifericos'
  | 'acessorios'
  | 'rede'
  | 'armazenamento'
  | 'midia'
  | 'fotografia'
  | 'eletro'
  | 'smart_home'
  | 'outros';

export interface DefinicaoSecao {
  id: SecaoEletronico;
  /** cabecalho e nome completo, usado no card de produto */
  nome: string;
  /** rotulo curto, pro botao de filtro caber na aba */
  aba: string;
  /** piso e teto em CENTAVOS, antes do arredondamento comercial */
  faixa: readonly [number, number];
}

/**
 * As faixas. Sao apertadas de proposito: quanto mais estreita a faixa, menos
 * espaco pro hash produzir um vizinho absurdo. Onde a faixa precisa ser larga
 * (`outros`, que e o balaio), o ajuste fino sai por `PRECO_MANUAL`.
 *
 * A ordem aqui e a ordem das abas na DevStore.
 */
export const SECOES_ELETRONICO: readonly DefinicaoSecao[] = [
  { id: 'celulares', nome: 'Celulares e Tablets', aba: 'Celulares', faixa: [49990, 199000] },
  { id: 'computadores', nome: 'Computadores e Notebooks', aba: 'PCs', faixa: [89990, 299000] },
  { id: 'telas', nome: 'TV e Monitores', aba: 'Telas', faixa: [44990, 249000] },
  { id: 'audio', nome: 'Audio e Som', aba: 'Audio', faixa: [14990, 89990] },
  { id: 'perifericos', nome: 'Perifericos', aba: 'Perifericos', faixa: [9990, 69990] },
  { id: 'acessorios', nome: 'Acessorios e Energia', aba: 'Acessorios', faixa: [1990, 14990] },
  { id: 'rede', nome: 'Rede e Conectividade', aba: 'Rede', faixa: [5990, 29990] },
  { id: 'armazenamento', nome: 'Discos e SSDs', aba: 'Discos', faixa: [19990, 49990] },
  { id: 'midia', nome: 'Pendrives e Cartoes', aba: 'Pendrives', faixa: [2990, 9990] },
  { id: 'fotografia', nome: 'Cameras e Drones', aba: 'Cameras', faixa: [29990, 199000] },
  { id: 'eletro', nome: 'Eletrodomesticos', aba: 'Eletro', faixa: [14990, 89990] },
  { id: 'smart_home', nome: 'Assistentes e Smart Home', aba: 'Smart', faixa: [7990, 29990] },
  { id: 'outros', nome: 'Portateis e Consoles', aba: 'Portateis', faixa: [19990, 69990] },
];

const POR_ID_DE_SECAO = new Map(SECOES_ELETRONICO.map((s) => [s.id, s]));

export function buscarSecao(id: unknown): DefinicaoSecao | undefined {
  return typeof id === 'string' ? POR_ID_DE_SECAO.get(id as SecaoEletronico) : undefined;
}

/** Faixa dos itens de mercado. Nao tem secao: a prateleira inteira e uma so. */
const FAIXA_NORMAL: readonly [number, number] = [150, 3990]; // R$ 1,50 a R$ 39,90

/**
 * Faixa por CATEGORIA, que e o envelope do que a categoria pode custar.
 *
 * Pra `eletronico` ela e derivada das secoes (menor piso, maior teto) em vez de
 * escrita a mao: assim nao ha como ajustar uma secao e esquecer de mexer aqui,
 * deixando a conferencia da economia checando um limite que nao vale mais.
 *
 * ATENCAO: as faixas de `normal` e `eletronico` agora SE SOBREPOEM na ponta de
 * baixo — um cabo de R$ 19,90 custa menos que um bolo de R$ 35. Isso e
 * proposital: a regra antiga ("todo eletronico e mais caro que todo item de
 * mercado") produzia um pendrive de R$ 1.200. Plausibilidade dentro do tipo
 * vale mais que a separacao limpa entre as duas prateleiras.
 */
export const FAIXA_DE_PRECO: Record<CategoriaItem, readonly [number, number]> = {
  normal: FAIXA_NORMAL,
  eletronico: [
    Math.min(...SECOES_ELETRONICO.map((s) => s.faixa[0])),
    Math.max(...SECOES_ELETRONICO.map((s) => s.faixa[1])),
  ],
  material: [400, 1_200],
  // Salvado: do ferro-velho de R$ 2 ao componente inclassificavel de R$ 280.
  // A faixa e larga porque a PROGRESSAO por profundidade e feita de valor —
  // ver `ENTRADAS` em src/game/sucata.ts, onde todo preco e fixo a mao.
  sucata: [200, 30_000],
  // FERRAMENTA, ARMA e MUNICAO. Como no salvado, todo preco daqui e fixo a mao
  // (ver `PRECO_MANUAL`): sao poucos itens e cada um e uma decisao de
  // balanceamento — quanto custa uma descida armada na represa.
  utilidade: [200, 40_000],
  // REMEDIO. Faixa de farmacia de cidade pequena: o analgesico e barato, o kit
  // completo custa uma tarde de conserto.
  remedio: [500, 12_000],
};

/**
 * Preco fixado a mao, sobrepondo o gerado. E aqui que se ajusta o item que saiu
 * caro ou barato demais pro que ele e, sem tocar na tabela inteira: basta
 * acrescentar `id: centavos`.
 *
 * Um preco fixado aqui pode sair da faixa da secao de proposito — e pra isso
 * que ele serve. A conferencia da economia deixa passar, mas ainda cobra que
 * ele fique dentro do envelope da categoria, pra pegar erro de digitacao.
 */
export const PRECO_MANUAL: Record<string, number> = {
  // o halo da vitrine: a descricao dele promete "um preco absurdo", entao ele e
  // fixado no teto da secao em vez de cair onde o hash quiser
  smartphone_top: 199000, // R$ 1.990,00
  madeira: 400,
  pedra: 600,
  concreto: 1_000,
  // SALVADO: todo preco e fixo, e por isso todos entram aqui em vez de sair do
  // hash. O valor do salvado E a regra de balanceamento do ciclo da represa
  // (risco por profundidade), e sorteio nao se equilibra — um sucateado comum
  // caro tornaria o nivel -1 mais lucrativo que o -4. Ver src/game/sucata.ts.
  ...PRECOS_DE_SUCATA,
  // UTILIDADE e REMEDIO: todo preco e fixo, pelo mesmo motivo do salvado — cada
  // um destes e uma decisao de balanceamento, e nao um numero de vitrine.
  //
  // A conta que eles fecham: uma descida armada e abastecida custa cerca de
  // R$ 60 (duas caixas de municao e um kit), e um so modulo de controle do
  // nivel -4 paga R$ 144 na revenda. Descer fundo continua valendo a pena;
  // descer fundo SEM se preparar e que fica caro.
  chave_inglesa: 3_900, // R$ 39,00
  lanterna_manutencao: 5_900, // R$ 59,00
  municao_pistola: 250, // R$ 2,50 por cartucho
  // Nao estao a venda em lugar nenhum: o preco existe pro painel de detalhes do
  // inventario ter o que mostrar, e pra revenda saber quanto vale.
  pistola: 38_000, // R$ 380,00
  cartao_acesso_usina: 200, // R$ 2,00 — vale o plastico
  kit_primeiros_socorros: 4_500, // R$ 45,00
  analgesico: 1_200, // R$ 12,00
  energetico: 990, // R$ 9,90
};

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
 * A faixa que vale pra um item: a da secao, quando ele e eletronico e tem secao
 * declarada; a da categoria, no resto dos casos.
 */
export function faixaDoItem(id: string, categoria: CategoriaItem): readonly [number, number] {
  if (categoria !== 'eletronico') return FAIXA_DE_PRECO[categoria];
  const secao = buscarSecao(SECAO_DE_ITEM.get(id));
  if (!secao) {
    // so acontece se alguem acrescentar um eletronico fora de ELETRONICOS_POR_SECAO
    console.warn(`[itens] eletronico "${id}" sem secao — usando o envelope da categoria`);
    return FAIXA_DE_PRECO.eletronico;
  }
  return secao.faixa;
}

/**
 * Preco de um item, em centavos. Sorteia dentro da faixa da SECAO (ou da
 * categoria, pros itens de mercado) pelo hash do id e arredonda pro "x,90" de
 * vitrine mais proximo, sem sair da faixa.
 */
export function precoDe(id: string, categoria: CategoriaItem): number {
  const manual = PRECO_MANUAL[id];
  if (manual !== undefined) return manual;
  const [minimo, maximo] = faixaDoItem(id, categoria);
  const bruto = minimo + hash01Texto(id, SEMENTE_PRECO) * (maximo - minimo);
  // arredonda pro real cheio e tira 10 centavos: R$ 12,90 em vez de R$ 12,37
  const comercial = Math.round(bruto / 100) * 100 - 10;
  return Math.min(maximo, Math.max(minimo, comercial));
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
 * Eletronicos, agrupados por SECAO — e a secao que decide a faixa de preco (ver
 * `SECOES_ELETRONICO`). Acrescentar um item aqui ja o coloca na faixa certa e
 * na aba certa da DevStore; um eletronico fora deste mapa cai no envelope da
 * categoria e o console avisa.
 *
 * A folha e um cartaz com secoes rotuladas, entao o detector tambem enxerga as
 * tarjas de titulo ("AUDIO E SOM"). O gerador descarta essas tarjas por
 * geometria (barra larga e baixa) ANTES de numerar as linhas.
 *
 * Das 116 pecas que sobram, 110 estao aqui. As SEIS de fora, com o motivo de
 * cada uma — a lista existe pra ninguem gastar tempo procurando de novo o que
 * ja foi olhado:
 *
 *   [0,0]        lasca de celular cortada pela borda esquerda da folha
 *   [2,1]        um fone solto, que o detector separou do estojo [2,0]
 *   [3,0] [3,1]  a tarja "AUDIO E SOM": veio partida em duas, e cada metade
 *                fica quase quadrada, entao escapa do filtro de tarja
 *   [8,0]        a tarja "ELETRO", partida do mesmo jeito
 *   [9,0]        o robo aspirador saiu GRUDADO no aspirador vertical: os dois
 *                se tocam na arte, viram um blob so, e nao da pra separar sem
 *                recortar a folha na mao
 */
const ELETRONICOS_POR_SECAO: Record<SecaoEletronico, readonly Entrada[]> = {
  celulares: [
    [[0, 1], 'smartphone', 'Smartphone', 'Tela grande, bateria media.'],
    [[0, 2], 'smartphone_preto', 'Smartphone Preto', 'Fica ligado na vitrine o dia todo.'],
    [[0, 3], 'smartphone_menta', 'Smartphone Menta', 'A cor que sobrou na loja.'],
    [[0, 4], 'smartphone_roxo', 'Smartphone Roxo', 'A cor que some primeiro da prateleira.'],
    [[0, 5], 'smartphone_azul', 'Smartphone Azul', 'Camera dupla, bateria honesta.'],
    [[0, 6], 'smartphone_top', 'Smartphone Topo de Linha', 'Tres cameras e um preco absurdo.'],
    [[0, 7], 'smartphone_dourado', 'Smartphone Dourado', 'Marca o dedo so de pegar.'],
    [[1, 0], 'tablet', 'Tablet', 'Bom pra ler, ruim pra escrever.'],
    [[1, 1], 'tablet_10', 'Tablet 10 Polegadas', 'Grande demais pra segurar com uma mao.'],
    [[1, 2], 'tablet_pro', 'Tablet Pro', 'Tela que faz filme ruim parecer bom.'],
    [[1, 3], 'tablet_grande', 'Tablet Grande', 'Pesa mais do que aparenta.'],
    [[1, 4], 'tablet_caneta', 'Tablet com Caneta', 'Vem com caneta que some em uma semana.'],
  ],
  computadores: [
    [[1, 5], 'notebook', 'Notebook', 'Basico, pra planilha e navegador.'],
    [[1, 6], 'notebook_prata', 'Notebook Prata', 'Tampa que guarda marca de dedo.'],
    [[1, 7], 'notebook_fino', 'Notebook Fino', 'Leve, aquece rapido.'],
    [[1, 8], 'notebook_gamer', 'Notebook Gamer', 'Ventoinha que parece um secador.'],
    [[2, 9], 'ultrabook', 'Ultrabook', 'Fino a ponto de dar medo de fechar.'],
    [[2, 6], 'mini_pc', 'Mini PC', 'Do tamanho de um livro em pe.'],
    [[0, 9], 'gabinete_pc', 'Gabinete de PC', 'Caixa preta, sem frescura.'],
    [[0, 11], 'gabinete_rgb', 'Gabinete RGB', 'Pisca mais do que processa.'],
  ],
  telas: [
    [[4, 5], 'tv', 'TV', 'Quarenta polegadas, painel comum.'],
    [[5, 6], 'tv_4k', 'TV 4K', 'Mais pixel do que a vista alcanca.'],
    [[0, 8], 'monitor_azul', 'Monitor', 'Vinte e quatro polegadas.'],
    [[0, 10], 'monitor_led', 'Monitor LED', 'Painel comum, sessenta hertz.'],
    [[5, 8], 'monitor_24', 'Monitor 24"', 'IPS, borda fina.'],
    [[5, 7], 'monitor_27', 'Monitor 27 Polegadas', 'Ocupa metade da mesa, sem exagero.'],
    [[5, 9], 'monitor_32', 'Monitor 32 Curvo', 'A curva so quem senta perto percebe.'],
    [[4, 7], 'monitor_curvo', 'Monitor Curvo', 'Ocupa a mesa inteira.'],
    [[4, 6], 'monitor_gamer', 'Monitor Gamer', 'Cento e sessenta hertz.'],
    [[2, 5], 'projetor', 'Projetor', 'Imagem grande, so com a luz apagada.'],
  ],
  audio: [
    [[0, 12], 'headset', 'Headset', 'Almofada de espuma, cabo longo.'],
    [[0, 13], 'headset_branco', 'Headset Branco', 'Suja com facilidade.'],
    [[0, 14], 'headset_gamer', 'Headset Gamer', 'Com microfone que capta o mundo todo.'],
    [[2, 0], 'fone_bluetooth', 'Fone Bluetooth', 'Estojo que carrega sozinho.'],
    [[4, 0], 'fone_intra', 'Fone Intra-auricular', 'Cai da orelha ao correr.'],
    [[4, 1], 'fone_esportivo', 'Fone Esportivo', 'Fica na orelha ate voce correr.'],
    [[0, 15], 'monitor_de_audio', 'Caixa de Estudio', 'Som limpo, grave curto.'],
    [[0, 16], 'caixa_de_som', 'Caixa de Som', 'Vendida uma a uma, nao em par.'],
    [[5, 4], 'caixa_de_estante', 'Caixa de Estante', 'Pequena, mas honesta.'],
    [[5, 2], 'caixa_acustica', 'Caixa Acustica', 'Duas vias, madeira pintada.'],
    [[5, 3], 'caixa_acustica_grande', 'Caixa Acustica Grande', 'Nao cabe na estante.'],
    [[2, 2], 'caixa_media', 'Caixa Media', 'Alca de mao e som de festa pequena.'],
    [[2, 3], 'caixa_de_festa', 'Caixa de Festa', 'Pesada, com alca reforcada.'],
    [[2, 4], 'caixa_amplificada', 'Caixa Amplificada', 'Tem entrada de microfone atras.'],
    [[4, 2], 'caixa_portatil', 'Caixa Portatil', 'A prova de respingo, dizem.'],
    [[5, 5], 'caixa_bluetooth', 'Caixa Bluetooth', 'Bateria pra um dia inteiro.'],
    [[5, 0], 'subwoofer', 'Subwoofer', 'Grave que treme a mesa.'],
    [[5, 1], 'alto_falante', 'Alto-falante', 'So o drive, sem caixa nenhuma.'],
    [[1, 15], 'soundbar', 'Soundbar', 'Cabe embaixo da TV, quase.'],
    [[6, 0], 'soundbar_longa', 'Soundbar Longa', 'Ocupa a largura da TV inteira.'],
    [[4, 3], 'radio_boombox', 'Radio Boombox', 'Toca radio e pendrive.'],
  ],
  perifericos: [
    [[4, 9], 'teclado', 'Teclado', 'Membrana, silencioso.'],
    [[4, 8], 'teclado_mecanico', 'Teclado Mecanico', 'Switch azul; o vizinho reclama.'],
    [[2, 7], 'teclado_rgb', 'Teclado RGB', 'Mecanico e barulhento.'],
    [[2, 8], 'mouse', 'Mouse', 'Sem fio, dois botoes.'],
    [[4, 10], 'mouse_gamer', 'Mouse Gamer', 'Sete botoes, usa dois.'],
    [[5, 10], 'controle', 'Controle', 'Analogico ja com folga.'],
    [[5, 11], 'controle_branco', 'Controle Branco', 'Pilha AA nao inclusa.'],
    [[5, 12], 'volante_gamer', 'Volante Gamer', 'Com pedal e tudo.'],
    [[6, 1], 'pedaleira', 'Pedaleira', 'Tres pedais; a embreagem vem junto.'],
    [[5, 13], 'cadeira_gamer', 'Cadeira Gamer', 'Confortavel nas duas primeiras horas.'],
    [[1, 9], 'webcam', 'Webcam', 'Full HD, foco fixo.'],
    [[1, 10], 'microfone', 'Microfone', 'Condensador com trip de mesa.'],
    [[1, 11], 'ring_light', 'Ring Light', 'Tres tons de branco.'],
  ],
  acessorios: [
    [[4, 11], 'mousepad', 'Mousepad', 'Grande o bastante pra caber o teclado.'],
    [[7, 13], 'carregador', 'Carregador', 'Rapido, se o cabo ajudar.'],
    [[7, 14], 'carregador_de_parede', 'Carregador de Parede', 'Preto, esquenta um pouco.'],
    [[7, 15], 'adaptador_de_tomada', 'Adaptador de Tomada', 'Serve em quase todo padrao.'],
    [[7, 16], 'filtro_de_linha', 'Filtro de Linha', 'Seis tomadas, cinco ocupadas.'],
    [[7, 17], 'power_bank', 'Power Bank', 'Carrega o celular duas vezes.'],
    [[7, 3], 'power_bank_slim', 'Power Bank Slim', 'Tres saidas e nenhuma sobrando.'],
    [[7, 18], 'power_bank_branco', 'Power Bank Branco', 'Mesma carga, cor diferente.'],
    [[7, 19], 'pilhas', 'Pilhas Recarregaveis', 'Quatro AA, com pouca carga de fabrica.'],
    [[9, 13], 'calculadora', 'Calculadora', 'Solar, das que nunca acabam.'],
    [[9, 14], 'relogio_digital', 'Relogio Digital', 'Numeros grandes e verdes.'],
  ],
  rede: [
    [[2, 10], 'roteador', 'Roteador', 'Quatro antenas, sinal de duas.'],
    [[2, 11], 'roteador_branco', 'Roteador Branco', 'Bonito e comum.'],
    [[2, 12], 'switch_de_rede', 'Switch de Rede', 'Cinco portas gigabit.'],
    [[2, 13], 'adaptador_wifi', 'Adaptador Wi-Fi', 'USB com antena removivel.'],
    [[1, 13], 'adaptador_de_rede', 'Adaptador de Rede', 'Pro dia em que o Wi-Fi cai.'],
    [[1, 12], 'adaptador_hdmi', 'Adaptador HDMI', 'Vive perdido na gaveta.'],
  ],
  armazenamento: [
    [[7, 0], 'ssd', 'SSD', 'Portatil, um terabyte.'],
    [[7, 1], 'ssd_nvme', 'SSD NVMe', 'Rapido a ponto de esquentar.'],
    [[7, 2], 'hd_externo', 'HD Externo', 'Dois terabytes, faz barulho.'],
  ],
  midia: [
    [[7, 4], 'pendrive', 'Pendrive', 'Some na primeira semana.'],
    [[1, 14], 'pendrive_azul', 'Pendrive Azul', 'Trinta e dois gigas, tampa ja perdida.'],
    [[7, 5], 'pendrive_metal', 'Pendrive de Metal', 'Mais pesado do que parece.'],
    [[7, 6], 'cartao_sd', 'Cartao SD', '64 GB, classe 10.'],
    [[7, 7], 'cartao_micro_sd', 'Cartao microSD', '128 GB, do tamanho de uma unha.'],
  ],
  fotografia: [
    [[7, 8], 'camera', 'Camera', 'Reflex com lente de kit.'],
    [[7, 9], 'camera_de_acao', 'Camera de Acao', 'Vai molhar de qualquer jeito.'],
    [[7, 10], 'filmadora', 'Filmadora', 'Grava em cartao, com zoom otico.'],
    [[7, 11], 'camera_de_seguranca', 'Camera de Seguranca', 'Gira sozinha, meio assustadora.'],
    [[7, 12], 'drone', 'Drone', 'Autonomia de vinte minutos.'],
  ],
  eletro: [
    [[9, 1], 'cafeteira', 'Cafeteira', 'De capsula, vermelha.'],
    [[9, 2], 'cafeteira_expresso', 'Cafeteira Expresso', 'Moe o grao e acorda a casa.'],
    [[9, 3], 'air_fryer', 'Air Fryer', 'A que todo mundo tem.'],
    [[9, 4], 'liquidificador', 'Liquidificador', 'Copo de vidro, doze velocidades.'],
    [[9, 5], 'microondas_portatil', 'Micro-ondas', 'Vinte litros, prato giratorio.'],
  ],
  smart_home: [
    [[4, 4], 'assistente_de_voz', 'Assistente de Voz', 'Escuta mais do que responde.'],
    [[9, 10], 'assistente_mini', 'Assistente de Voz Mini', 'Aro azul que acende ao escutar.'],
    [[9, 11], 'assistente_branco', 'Assistente de Voz Branco', 'Combina com a estante.'],
    [[9, 12], 'hub_inteligente', 'Hub Inteligente', 'Manda em tudo que for esperto na casa.'],
    [[9, 8], 'tomada_inteligente', 'Tomada Inteligente', 'Liga pelo celular.'],
    [[9, 9], 'adaptador_de_streaming', 'Adaptador de Streaming', 'Deixa a TV velha esperta.'],
    [[9, 6], 'lampada_led', 'Lampada LED', 'Branca quente, 9 W.'],
    [[9, 7], 'lampada_rgb', 'Lampada RGB', 'Dezesseis milhoes de cores, usa tres.'],
  ],
  outros: [
    [[9, 15], 'smartwatch', 'Smartwatch', 'Conta passos e cobra que voce ande.'],
    [[9, 16], 'console_portatil', 'Console Portatil', 'Tela pequena, bateria longa.'],
    [[9, 17], 'console_retro', 'Console Retro', 'Com dois controles e um cartucho preso.'],
  ],
};

/** id do item -> secao. E o que `faixaDoItem` consulta pra achar a faixa. */
const SECAO_DE_ITEM = new Map<string, SecaoEletronico>(
  (Object.entries(ELETRONICOS_POR_SECAO) as [SecaoEletronico, readonly Entrada[]][]).flatMap(
    ([secao, entradas]) => entradas.map(([, id]) => [id, secao] as [string, SecaoEletronico]),
  ),
);

/** A secao de um eletronico, ou undefined se ele nao for um. */
export function secaoDoItem(id: string): SecaoEletronico | undefined {
  return SECAO_DE_ITEM.get(id);
}

/** Todos os eletronicos, na ordem das secoes. */
const ELETRONICOS: readonly Entrada[] = SECOES_ELETRONICO.flatMap(
  (s) => ELETRONICOS_POR_SECAO[s.id],
);

/**
 * UTILIDADE — ferramenta, arma, municao e chave de acesso.
 *
 * A folha e `itens_represa_v2.png`, um cartaz de 180 pecas de sobrevivencia e
 * eletronica. Do que ela tem, entra aqui SO o que o jogo usa: nao ha item no
 * catalogo pelo simples fato de a arte existir — cada um destes e equipavel,
 * consumivel ou chave de porta (ver `src/game/equipar.ts`).
 *
 * A pistola e o cartao de acesso NAO estao a venda em ponto nenhum: os dois sao
 * achados na usina. Eles moram nesta categoria de proposito, e o que os mantem
 * fora da vitrine e a lista `itemIds` do ponto de loja (ver `PONTOS_DE_LOJA`).
 */
const UTILIDADES: readonly Entrada[] = [
  [[9, 14], 'chave_inglesa', 'Chave Inglesa', 'Chave de boca de 24, cabo com marca de mao. Bate melhor do que aperta.'],
  [[1, 7], 'lanterna_manutencao', 'Lanterna de Manutencao', 'Corpo de aluminio, foco ajustavel. Aguenta cair no concreto.'],
  [[2, 0], 'pistola', 'Pistola', 'Pistola de guarda, oleada e guardada em cofre por tres anos. Ainda funciona.'],
  [[3, 0], 'municao_pistola', 'Municao 9 mm', 'Cartucho de nove milimetros. A caixa vem com cinquenta; sobrou menos.'],
  [[8, 11], 'cartao_acesso_usina', 'Cartao de Acesso da Usina', 'Cracha de manutencao com a foto raspada. A tarja magnetica ainda le.'],
];

/** REMEDIO — o que a farmacia do Wendel vende e o que devolve vida. */
const REMEDIOS: readonly Entrada[] = [
  [[3, 17], 'kit_primeiros_socorros', 'Kit de Primeiros Socorros', 'Caixa vermelha com gaze, esparadrapo e antisseptico. Resolve o que da pra resolver sozinho.'],
  [[4, 21], 'analgesico', 'Analgesico', 'Cartela de doze. Tira a dor, nao o motivo dela.'],
  [[4, 11], 'energetico', 'Energetico', 'Lata gelada. Meia hora de disposicao e duas de arrependimento.'],
];

/** Quantos de um item cabem num slot, pelo tamanho tipico da categoria. */
const PILHA_PADRAO: Record<CategoriaItem, number> = {
  normal: 20,
  eletronico: 5,
  material: 99,
  sucata: 99,
  // Municao empilha alto (99) e arma nao empilha (1). O padrao da categoria e o
  // da municao, e as excecoes saem por `PILHA_MANUAL`.
  utilidade: 99,
  remedio: 20,
};

/**
 * Pilha fixada a mao, sobrepondo a da categoria. Existe pra arma e ferramenta:
 * cinco chaves inglesas num slot nao faz sentido, e uma pistola muito menos.
 */
const PILHA_MANUAL: Record<string, number> = {
  chave_inglesa: 1,
  lanterna_manutencao: 1,
  pistola: 1,
  cartao_acesso_usina: 1,
  kit_primeiros_socorros: 5,
};

/** Precos fixos em centavos: material bruto nao varia por dia nem por loja. */
export const MATERIAIS: readonly DefinicaoItemLoja[] = [
  {
    id: 'madeira', nome: 'Madeira', descricao: 'Tabuas secas para obra e mobilia.',
    categoria: 'material', maxPilha: 99, preco: precoDe('madeira', 'material'), icone: 0xa8733f,
  },
  {
    id: 'pedra', nome: 'Pedra', descricao: 'Pedra bruta separada por tamanho.',
    categoria: 'material', maxPilha: 99, preco: precoDe('pedra', 'material'), icone: 0x8b8b82,
  },
  {
    id: 'concreto', nome: 'Concreto', descricao: 'Mistura pronta para base e acabamento.',
    categoria: 'material', maxPilha: 99, preco: precoDe('concreto', 'material'), icone: 0xb3b0a7,
  },
];

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
    maxPilha: PILHA_MANUAL[id] ?? PILHA_PADRAO[categoria],
    preco: precoDe(id, categoria),
    secao: SECAO_DE_ITEM.get(id),
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
    ...montar(UTILIDADES, 'utilidade', 'represa'),
    ...montar(REMEDIOS, 'remedio', 'represa'),
    ...MATERIAIS,
    // Salvado da represa. Entra no catalogo como qualquer item (mesmo
    // inventario, mesma pilha, mesmo icone de cor) e por isso nao precisou de
    // um segundo registro de item nem de outro caminho de save.
    ...ITENS_DE_SUCATA,
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

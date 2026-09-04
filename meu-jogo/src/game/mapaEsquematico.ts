/**
 * O MAPA ESQUEMATICO — a metadata de APRESENTACAO dos mapas externos.
 *
 * O mapa antigo desenhava o tilemap de jogo reduzido e escrevia o nome de cada
 * zona no centro dela. Isso produzia exatamente os defeitos que se via na tela:
 * rotulo de 8 px ilegivel, nome por cima de nome, estrada e predio competindo
 * pela mesma atencao, o marcador do jogador cobrindo o nome do lugar em que ele
 * esta, e uma tarja preta enorme em volta. E ia piorar: cada predio novo era
 * mais um nome jogado no meio da pilha.
 *
 * A troca e de natureza. O mapa deixa de ser uma FOTOGRAFIA reduzida do mundo e
 * passa a ser um DESENHO dele — mapa de turismo de cidade pequena, com via
 * grossa, bairro delimitado, icone por tipo de lugar e nome so onde cabe.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTA AQUI E O QUE NAO ESTA
 * ---------------------------------------------------------------------------
 * Aqui ficam as decisoes de APRESENTACAO: como cada tipo de lugar aparece, que
 * nome ele tem na legenda, em que bairro ele esta e que abas existem.
 *
 * NAO ficam aqui as coordenadas dos lugares. Elas continuam saindo da camada
 * `zonas` do proprio tilemap, que ja e a fonte delas em tudo o mais no jogo —
 * copiar quarenta pares de coordenada pra ca criaria uma segunda verdade que
 * envelhece sozinha na primeira vez que um lote se mexer.
 *
 * As VIAS e a AGUA tambem nao estao escritas: a cena reduz as camadas
 * `caminhos` e `chao` numa grade grossa (uma celula a cada quatro tiles) e
 * desenha o resultado em bloco. Isso e desenho esquematico e nao o tilemap — o
 * detalhe de tile desaparece na reducao, que e o objetivo.
 */

/** As quatro abas do mapa. `REPRESA` e a unica que nao e um mapa externo. */
export type AbaDeMapa = 'cidade' | 'bairros' | 'regiao' | 'represa';

export interface DefinicaoAbaDeMapa {
  id: AbaDeMapa;
  nome: string;
  /** chave do mapa externo; null na aba da usina, que e um navegador de profundidade */
  mapa: string | null;
  titulo: string;
}

export const ABAS_DE_MAPA: readonly DefinicaoAbaDeMapa[] = [
  { id: 'cidade', nome: 'CIDADE', mapa: 'farm', titulo: 'Santa Aurora — centro' },
  { id: 'bairros', nome: 'BAIRROS', mapa: 'bairro', titulo: 'Bairro da Estacao' },
  { id: 'regiao', nome: 'REGIAO', mapa: 'rural', titulo: 'Zona rural' },
  { id: 'represa', nome: 'REPRESA', mapa: 'represa', titulo: 'Estrada da represa' },
];

export function abaDoMapa(mapa: string): AbaDeMapa {
  return ABAS_DE_MAPA.find((a) => a.mapa === mapa)?.id ?? 'cidade';
}

/**
 * COMO CADA TIPO DE LUGAR APARECE.
 *
 * `forma` escolhe o desenho do icone — sao seis, e seis e o limite de formas que
 * se distingue num icone de sete pixels. `cor` separa os grupos: morar, comprar,
 * estudar, trabalhar, ar livre e industria.
 *
 * O icone NAO e emoji nem letra: a interface e pixel e uma fonte de sistema no
 * meio dela sai borrada em qualquer escala que nao seja a de origem.
 */
export type FormaDeMarco = 'casa' | 'loja' | 'publico' | 'arvore' | 'industria' | 'agua';

export interface EstiloDeMarco {
  forma: FormaDeMarco;
  cor: number;
  /** nome curto na legenda; o nome longo vai no painel de detalhe */
  rotulo: string;
  /** true = aparece no mapa desde o comeco, mesmo sem ter sido visitado */
  publico?: boolean;
}

/**
 * Por CLASSE de zona do tilemap. Zona de classe desconhecida nao vira marco —
 * e o que impede um lote de teste de aparecer no mapa da cidade.
 */
export const ESTILO_POR_CLASSE: Record<string, EstiloDeMarco> = {
  casa: { forma: 'casa', cor: 0xb98a5a, rotulo: 'Casa' },
  mercado: { forma: 'loja', cor: 0x7ea55f, rotulo: 'Mercado', publico: true },
  farmacia: { forma: 'loja', cor: 0x7ea55f, rotulo: 'Farmacia', publico: true },
  bar: { forma: 'loja', cor: 0x7ea55f, rotulo: 'Bar', publico: true },
  academia: { forma: 'publico', cor: 0x6f96b8, rotulo: 'Academia', publico: true },
  escola: { forma: 'publico', cor: 0x6f96b8, rotulo: 'Escola', publico: true },
  biblioteca: { forma: 'publico', cor: 0x6f96b8, rotulo: 'Biblioteca', publico: true },
  hospital: { forma: 'publico', cor: 0xb85440, rotulo: 'Hospital', publico: true },
  oficina: { forma: 'industria', cor: 0xc9a227, rotulo: 'Oficina', publico: true },
  madeireira: { forma: 'industria', cor: 0xc9a227, rotulo: 'Madeireira', publico: true },
  pedreira: { forma: 'industria', cor: 0x8a8f94, rotulo: 'Pedreira', publico: true },
  fazenda: { forma: 'arvore', cor: 0x7ea55f, rotulo: 'Fazenda', publico: true },
  parque: { forma: 'arvore', cor: 0x7ea55f, rotulo: 'Parque', publico: true },
  quadra: { forma: 'arvore', cor: 0x7ea55f, rotulo: 'Quadra', publico: true },
  mirante: { forma: 'agua', cor: 0x6f96b8, rotulo: 'Mirante', publico: true },
  represa: { forma: 'industria', cor: 0x8a8f94, rotulo: 'Usina', publico: true },
  servico: { forma: 'industria', cor: 0x8a8f94, rotulo: 'Servico' },
  terreno: { forma: 'arvore', cor: 0x4a3c2c, rotulo: 'Terreno' },
};

/**
 * OS BAIRROS de cada mapa, em tiles do mundo.
 *
 * Sao poucos e sao escritos a mao de proposito: bairro e uma leitura do lugar,
 * nao um dado do tilemap. "Centro" e "Beira do rio" nao existem em camada
 * nenhuma — existem porque alguem que mora ali chamaria assim.
 */
export interface DistritoDeMapa {
  nome: string;
  /** [x, y, largura, altura] em tiles */
  rect: readonly [number, number, number, number];
}

export const DISTRITOS: Record<string, readonly DistritoDeMapa[]> = {
  farm: [
    { nome: 'Centro', rect: [30, 10, 60, 30] },
    { nome: 'Beira do rio', rect: [0, 45, 45, 45] },
    { nome: 'Saida leste', rect: [90, 20, 30, 50] },
  ],
  bairro: [
    { nome: 'Vila da Estacao', rect: [10, 10, 60, 45] },
    { nome: 'Alto', rect: [70, 10, 65, 45] },
    { nome: 'Fundos', rect: [10, 60, 120, 45] },
  ],
  rural: [
    { nome: 'Estrada velha', rect: [0, 20, 70, 40] },
    { nome: 'Corte', rect: [80, 15, 65, 50] },
    { nome: 'Colonia', rect: [10, 70, 90, 45] },
  ],
  represa: [
    { nome: 'Acesso', rect: [10, 5, 60, 45] },
    { nome: 'Casa de forca', rect: [10, 60, 60, 60] },
  ],
};

/**
 * As BANDAS do navegador de profundidade da usina (Parte 41).
 *
 * Quinze faixas de dez andares. Nao ha lista de 150 linhas em tela nenhuma: a
 * faixa mostra quantos andares dela ja foram visitados, e abrir uma mostra os
 * dez. Andar nunca visitado aparece so como numero — o rotulo dele e conteudo
 * de historia e nao se entrega antes de chegar la.
 */
export const BANDAS_DA_USINA = Array.from({ length: 15 }, (_, i) => ({
  de: i * 10 + 1,
  ate: i * 10 + 10,
}));

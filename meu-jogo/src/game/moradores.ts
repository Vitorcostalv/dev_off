import { registrarPreferenciasNpc } from './presentes.ts';
import type { PreferenciaNpc } from './presentes.ts';
import type { AreaVagar, PontoTile, SpriteNpc } from './npcs.ts';

export type FaixaEtaria = 'crianca' | 'jovem' | 'adulto' | 'idoso';
export type MapaMorador = 'bairro' | 'rural' | 'farm';

/**
 * ------------------------------------------------------------------ lugares --
 * Um LUGAR e o par (onde) + (em que ponto), e nao um par de coordenadas soltas.
 *
 * A versao anterior guardava `mapa`/`x`/`y` de mapa EXTERNO em toda atividade,
 * entao a diretora passava o dia na calcada da escola e os moradores jantavam e
 * dormiam na rua, na frente da propria porta. Aqui o que aparece e a
 * `construcao` — o interior em que a atividade acontece — e `ponto`, ja em
 * coordenada daquele interior. `construcao: null` e o unico caso de ar livre, e
 * ai `ponto` volta a ser coordenada do mapa externo.
 *
 * `area` so entra em lugar ao ar livre e SO vale pra quem tem passada real na
 * arte (ver `npc-caminhada.json`): e o retangulo em que o NPC perambula. Ele
 * precisa ser INTEIRAMENTE livre — o motor anda em reta, sem pathfinding, e a
 * convexidade do retangulo e o que garante que qualquer reta dentro dele
 * tambem esta livre. `ponto` fica DENTRO da `area` pelo mesmo motivo: e de la
 * que sai o primeiro trecho. `npm run verificar-rotinas` reprova as duas
 * coisas.
 */
export interface LugarMorador {
  /** Interior em que a atividade acontece; null = ao ar livre. */
  construcao: string | null;
  /** Mapa externo a que o lugar pertence (o do interior, ou o do ar livre). */
  mapa: MapaMorador;
  /** Ponto fixo, em tiles do interior indicado (ou do mapa externo). */
  ponto: PontoTile;
  /**
   * PERCURSO de rua: a polilinha que o morador percorre em ciclo durante o
   * bloco, com pausa em cada ponta. E a alternativa a `area`, e a preferida
   * para bloco urbano.
   *
   * Existe porque `area` — retangulo livre e convexo — so pode ser tao grande
   * quanto o maior retangulo vazio perto da porta, e isso e pequeno num bairro
   * com casa, arvore e cerca: o morador ficava indo e voltando num 10x3 na
   * frente da propria casa. O percurso nao tem essa amarra: ele acompanha o
   * EIXO das vias, que o gerador ja mantem livre de flora e de lote, entao da
   * pra atravessar o bairro de ponta a ponta em reta entre waypoints — que e o
   * unico movimento que o motor sabe fazer (nao ha pathfinding).
   *
   * O primeiro waypoint tem de ser alcancavel em reta a partir de `ponto`, e
   * cada trecho entre waypoints consecutivos (mais o que fecha o ciclo, do
   * ultimo pro primeiro) tem de estar livre. `npm run verificar-rotinas`
   * reprova as duas coisas.
   */
  rota?: PontoTile[];
  /** Retangulo de perambulacao ao ar livre, para quem tem passada real. */
  area?: AreaVagar;
}

export interface AtividadeMorador {
  inicio: number;
  fim: number;
  lugar: LugarMorador;
  atividade: string;
  /** Quando true, substitui esta faixa aos sabados e domingos. */
  fimDeSemana?: boolean;
}

export interface RelacaoSocial {
  com: string;
  tipo: 'familia' | 'amizade' | 'colegas' | 'rivalidade' | 'vizinhanca' | 'cuidado';
  detalhe: string;
}

export interface Morador {
  id: string;
  nome: string;
  idade: number;
  faixa: FaixaEtaria;
  profissao: string;
  estadoCivil: string;
  casa: string;
  mapaResidencia: 'bairro' | 'rural';
  familia: string;
  personalidade: { qualidades: [string, string, string]; defeitos: [string, string]; fala: string; social: string };
  vida: { favoritos: string[]; hobbies: string[]; preocupacao: string; objetivo: string };
  rotinaResumo: string[];
  atividades: AtividadeMorador[];
  relacoes: RelacaoSocial[];
  dialogoAtual: string[];
  preferencias: PreferenciaNpc & { odeia: string };
  romancePermitido: boolean;
  /**
   * So recebe `vagar` quem possui uma folha com passos reais. As artes que
   * trazem apenas as quatro poses paradas continuam vivas no cenario, mas nao
   * deslizam pelo mapa fingindo uma caminhada.
   */
  movimento: 'parado' | 'vagar';
  sprite: SpriteNpc;
  spriteParado: SpriteNpc;
}

const frames = {
  down: { linha: 0, colunas: [0, 1, 2, 3] }, up: { linha: 1, colunas: [0, 1, 2, 3] },
  left: { linha: 2, colunas: [0, 1, 2, 3] }, right: { linha: 3, colunas: [0, 1, 2, 3] },
};
const framesParados = {
  down: { linha: 0, colunas: [0] }, up: { linha: 1, colunas: [0] },
  left: { linha: 2, colunas: [0] }, right: { linha: 3, colunas: [0] },
};
/**
 * Espelha `CAMINHADA_REAL` de tools/processar-sprites-npc.mjs, que publica a
 * mesma lista em `assets/sprites/npc-caminhada.json` — a conferencia de rotinas
 * compara os dois. Bruno saiu daqui: a folha dele
 * (`Bruno_parado_madeireira.png`) traz quatro poses de pe, nao uma passada, e
 * ele deslizava pelo pateo da madeireira. Roberto entrou: `Roberto_Andando.png`
 * estava na pasta de arte sem ninguem usar.
 */
const NPCS_COM_PASSOS_REAIS = new Set([
  'caio', 'clara', 'ilda', 'joao', 'julia', 'lucas', 'neide', 'roberto', 'samanta', 'suzan',
]);
const sprites = (id: string): Pick<Morador, 'sprite' | 'spriteParado' | 'movimento'> => ({
  movimento: NPCS_COM_PASSOS_REAIS.has(id) ? 'vagar' : 'parado',
  sprite: { arquivo: `assets/sprites/${id}_andando_runtime.png`, colunas: 4, linhas: 4, frames },
  spriteParado: { arquivo: `assets/sprites/${id}_parado_runtime.png`, colunas: 4, linhas: 4, frames: framesParados },
});
const h = (hora: number, minuto = 0) => hora * 60 + minuto;

const dentro = (construcao: string, mapa: MapaMorador, x: number, y: number): LugarMorador =>
  ({ construcao, mapa, ponto: { x, y } });
const aoArLivre = (mapa: MapaMorador, x: number, y: number, area?: AreaVagar): LugarMorador =>
  ({ construcao: null, mapa, ponto: { x, y }, area });

/**
 * Lugar ao ar livre com PERCURSO: o morador entra pelo primeiro waypoint e
 * percorre a polilinha em ciclo. `pontos` sao pares [x, y] em tiles do mapa.
 */
const percurso = (mapa: MapaMorador, pontos: readonly (readonly [number, number])[]): LugarMorador => ({
  construcao: null,
  mapa,
  ponto: { x: pontos[0][0], y: pontos[0][1] },
  rota: pontos.map(([x, y]) => ({ x, y })),
});

/**
 * LAR de cada morador: o interior da propria casa e um ponto SEU dentro dela.
 * Cada membro da familia tem o seu porque duas pessoas nao podem ocupar o mesmo
 * tile — e porque a casa vira mais viva com gente espalhada pela sala.
 *
 * Os pontos saem da sala (ou do comodo de circulacao) de cada planta gerada em
 * `PLANTAS_CASA`, e `npm run verificar-rotinas` confere um por um contra o
 * tilemap: tile livre, dentro do mapa e alcancavel a partir da porta.
 */
const LAR: Record<string, LugarMorador> = {
  livia: dentro('casa_b1', 'bairro', 14.5, 6.5),
  matheus: dentro('casa_b1', 'bairro', 16.5, 6.5),
  cecilia: dentro('casa_b1', 'bairro', 18.5, 6.5),
  clara: dentro('casa_b2', 'bairro', 10.5, 14.5),
  lucia: dentro('casa_b2', 'bairro', 12.5, 14.5),
  caio: dentro('casa_b3', 'bairro', 5.5, 15.5),
  helena: dentro('casa_b3', 'bairro', 7.5, 15.5),
  julia: dentro('casa_b4', 'bairro', 14.5, 14.5),
  arthur: dentro('casa_b4', 'bairro', 16.5, 14.5),
  rita: dentro('casa_b4', 'bairro', 10.5, 14.5),
  roberto: dentro('casa_b5', 'bairro', 16.5, 12.5),
  ilda: dentro('casa_b5', 'bairro', 18.5, 12.5),
  ravi: dentro('casa_b5', 'bairro', 15.5, 10.5),
  davi: dentro('casa_b6', 'bairro', 7.5, 6.5),
  samanta: dentro('casa_b6', 'bairro', 5.5, 6.5),
  manuela: dentro('casa_b6', 'bairro', 3.5, 6.5),
  rafael: dentro('casa_b7', 'bairro', 11.5, 14.5),
  suzan: dentro('casa_b7', 'bairro', 13.5, 14.5),
  lucas: dentro('casa_c1', 'bairro', 16.5, 15.5),
  tulio: dentro('casa_c2', 'bairro', 5.5, 14.5),
  joao: dentro('casa_rural_1', 'rural', 5.5, 12.5),
  neide: dentro('casa_rural_1', 'rural', 3.5, 12.5),
  priscila: dentro('casa_rural_1', 'rural', 2.5, 13.5),
  bruno: dentro('casa_rural_2', 'rural', 14.5, 6.5),
};

// ------------------------------------------------------- postos de trabalho --
// Escola: a `sala_aula_3` da planta virou DIRETORIA, e e onde a Livia fica.
// Ilda da aula na sala do meio; as cinco criancas tem carteira propria, cada
// uma num tile distinto, senao elas se sobrepoem.
const DIRETORIA = dentro('escola', 'bairro', 19.5, 6.5);
const SALA_DE_AULA = dentro('escola', 'bairro', 12.5, 3.5);
const CARTEIRA: Record<string, LugarMorador> = {
  cecilia: dentro('escola', 'bairro', 9.5, 5.5),
  arthur: dentro('escola', 'bairro', 11.5, 5.5),
  ravi: dentro('escola', 'bairro', 13.5, 5.5),
  manuela: dentro('escola', 'bairro', 9.5, 8.5),
  helena: dentro('escola', 'bairro', 11.5, 8.5),
};
const BALCAO_BIBLIOTECA = dentro('biblioteca', 'bairro', 12.5, 12.5);
const ACERVO = dentro('biblioteca', 'bairro', 5.5, 6.5);
const MESA_DE_LEITURA = dentro('biblioteca', 'bairro', 16.5, 11.5);
const CANTO_DO_RAVI = dentro('biblioteca', 'bairro', 7.5, 9.5);
// Rafael atende na academia do Mapa 1: e o unico morador do Bairro que trabalha
// num interior da cidade velha. O motor nao se importa — quem decide se o NPC
// aparece e o par (construcao aberta) ou (mapa externo aberto), nao a distancia.
const SALA_DE_FISIO = dentro('academia', 'farm', 4.5, 4.5);
// Trabalho em casa, em OUTRO comodo: a transicao acontece dentro do interior,
// entao ninguem ve ninguem sumir da rua.
const COZINHA_DO_DAVI = dentro('casa_b6', 'bairro', 14.5, 12.5);
const COSTURA_DA_RITA = dentro('casa_b4', 'bairro', 3.5, 4.5);
const ESCRITORIO_DA_PRISCILA = dentro('casa_rural_1', 'rural', 17.5, 5.5);

// ------------------------------------------------------------- ao ar livre --
// Postos FIXOS: quem nao tem passada real na arte fica de pe, e nao desliza.
const PORTAO_DA_ESCOLA = aoArLivre('bairro', 36.5, 49.5);
const PATIO_DA_CENTRAL = aoArLivre('bairro', 45.5, 62.5);
const BALCAO_DA_MADEIREIRA = aoArLivre('rural', 116.5, 35.5);
const QUADRA: Record<string, LugarMorador> = {
  cecilia: aoArLivre('bairro', 90.5, 62.5),
  arthur: aoArLivre('bairro', 92.5, 62.5),
  ravi: aoArLivre('bairro', 94.5, 62.5),
  manuela: aoArLivre('bairro', 90.5, 65.5),
  helena: aoArLivre('bairro', 92.5, 65.5),
  matheus: aoArLivre('bairro', 96.5, 62.5),
};

// PERCURSOS de rua, so pra quem tem passada real na arte.
//
// Antes eram RETANGULOS de perambulacao, um por morador, e o resultado era o
// que se via em jogo: cada um andando de um lado pro outro num pedaco de
// gramado na frente da propria porta. O retangulo tem de ser convexo e
// inteiramente livre (o motor anda em reta), e num bairro com casa, cerca e
// arvore o maior retangulo livre perto de uma porta e miudo — 10x3 no caso da
// Samanta. Nao havia como aumentar sem passar por cima de alguma coisa.
//
// O percurso resolve por outro lado: ele acompanha o EIXO das vias do mapa, que
// o gerador mantem livre (a flora respeita a faixa da via e nenhum lote invade
// ela). Assim o trajeto pode ter dezenas de tiles e ainda ser feito de retas
// livres. Cada morador ganhou um trecho que combina com o que ele faz —
// a Julia percorre a linha do onibus, o Caio desce a rua baixa atras de
// conserto, a Ilda faz a caminhada da tarde ate o fim da rua.
const RUA_DO_CAIO = percurso('bairro', [
  [37.5, 76.6], [30, 77.3], [20.5, 78.2], [30, 77.3], [44, 76.2], [55, 75.2], [44, 76.2],
]);
const LINHA_DA_JULIA = percurso('bairro', [
  [59.5, 74.6], [66.2, 74.2], [66.2, 64], [66.2, 54.5], [66.2, 64], [66.2, 74.2], [52, 75.6], [66.2, 74.2],
]);
const CALCADA_DO_ROBERTO = percurso('bairro', [
  [81.5, 75.4], [92.2, 76.2], [100, 74.2], [92.2, 76.2], [70, 74.4], [66.2, 74.2], [70, 74.4],
]);
const CAMINHADA_DA_ILDA = percurso('bairro', [
  [84.5, 74.5], [92.2, 76.2], [100, 74.2], [108, 72.8], [100, 74.2], [92.2, 76.2], [78, 74.9], [70, 74.4], [78, 74.9],
]);
const RUA_DA_SAMANTA = percurso('bairro', [
  [7.5, 58.5], [8.5, 62], [8.5, 65.8], [20.5, 66.2], [30, 64.5], [36.5, 63.2], [30, 64.5], [20.5, 66.2], [8.5, 65.8], [8.5, 62],
]);
const QUADRA_ABERTA = percurso('bairro', [
  [95.5, 64.5], [91.5, 61.5], [96.5, 67.5], [96.5, 73.5], [96.5, 67.5], [101.5, 61.5], [96.5, 63],
]);
// A roca continua sendo AREA e nao percurso: sao 20x12 tiles de leira aberta, e
// quem esta capinando anda mesmo sem rumo fixo. A objecao do retangulo pequeno
// nao vale aqui — o campo e maior que a tela.
const HORTA_DO_JOAO = aoArLivre('rural', 32.5, 50.5, { min: { x: 26, y: 46 }, max: { x: 46, y: 58 } });
const HORTA_DA_NEIDE = aoArLivre('rural', 40.5, 54.5, { min: { x: 26, y: 46 }, max: { x: 46, y: 58 } });

/**
 * Uma agenda e uma lista de (hora de inicio, lugar, texto). O `fim` de cada
 * faixa e o inicio da seguinte, e a ultima vai ate a meia-noite — assim nao ha
 * como abrir um buraco entre duas faixas por descuido de digitacao.
 *
 * REGRA que vale pra todas: no maximo UM bloco ao ar livre por dia, e ele fica
 * cercado por faixas em interior. Trocar de lugar e instantaneo (ver
 * `assumir_lugar` em npcs.ts), e uma troca entre dois pontos ao ar livre do
 * mesmo mapa seria um teleporte na cara do jogador. Entre interiores, ou de
 * interior pra rua, a troca acontece longe de vista. `verificar-rotinas` cobra
 * essa regra.
 */
const faixas = (
  lista: readonly (readonly [number, LugarMorador, string])[],
  fimDeSemana: boolean,
): AtividadeMorador[] => lista.map(([inicio, lugar, atividade], i) => ({
  inicio,
  fim: lista[i + 1]?.[0] ?? h(23, 59),
  lugar,
  atividade,
  ...(fimDeSemana ? { fimDeSemana: true } : {}),
}));

const agenda = (
  util: readonly (readonly [number, LugarMorador, string])[],
  fds: readonly (readonly [number, LugarMorador, string])[],
): AtividadeMorador[] => [...faixas(util, false), ...faixas(fds, true)];

const AGENDAS: Record<string, AtividadeMorador[]> = {
  livia: agenda(
    [[h(6), LAR.livia, 'cafe e leitura antes de abrir a escola'],
      [h(7, 20), DIRETORIA, 'direcao da escola'],
      [h(17), LAR.livia, 'jantar e tempo com a familia']],
    [[h(8), LAR.livia, 'manha lenta em casa'],
      [h(14), LAR.livia, 'planejamento das oficinas de leitura'],
      [h(19), LAR.livia, 'noite em familia']],
  ),
  matheus: agenda(
    [[h(6), LAR.matheus, 'cafe com a Livia'],
      [h(8), PORTAO_DA_ESCOLA, 'ronda comunitaria no portao da escola'],
      [h(18), LAR.matheus, 'jantar e tempo com a familia']],
    [[h(8), LAR.matheus, 'manha em casa'],
      [h(10), QUADRA.matheus, 'fim de semana: olho na quadra'],
      [h(17), LAR.matheus, 'noite em familia']],
  ),
  cecilia: agenda(
    [[h(6, 30), LAR.cecilia, 'se arrumar para a aula'],
      [h(8), CARTEIRA.cecilia, 'aula na escola'],
      [h(12, 30), LAR.cecilia, 'almoco e licao de casa'],
      [h(14), QUADRA.cecilia, 'brincar na quadra'],
      [h(18), LAR.cecilia, 'jantar em familia']],
    [[h(8), LAR.cecilia, 'manha de desenho'],
      [h(13), QUADRA.cecilia, 'fim de semana: quadra com os amigos'],
      [h(18), LAR.cecilia, 'noite em familia']],
  ),
  clara: agenda(
    [[h(6, 30), LAR.clara, 'cafe com a Lucia'],
      [h(9), BALCAO_BIBLIOTECA, 'turno na biblioteca'],
      [h(19), LAR.clara, 'leitura e jantar']],
    [[h(8), LAR.clara, 'manha de encadernacao'],
      [h(13), BALCAO_BIBLIOTECA, 'fim de semana: organiza o acervo'],
      [h(18), LAR.clara, 'noite tranquila em casa']],
  ),
  lucia: agenda(
    [[h(7), LAR.lucia, 'cafe e curriculo'],
      [h(10), MESA_DE_LEITURA, 'estudo na sala de leitura'],
      [h(17), LAR.lucia, 'jantar com a Clara']],
    [[h(9), LAR.lucia, 'manha de projetos'],
      [h(14), MESA_DE_LEITURA, 'fim de semana: estudo na biblioteca'],
      [h(19), LAR.lucia, 'noite em casa']],
  ),
  caio: agenda(
    [[h(6, 30), LAR.caio, 'cafe com a Helena'],
      [h(8), RUA_DO_CAIO, 'consertos na rua de casa'],
      [h(19), LAR.caio, 'jantar e conversa']],
    [[h(8), LAR.caio, 'manha de manutencao da moto'],
      [h(11), RUA_DO_CAIO, 'fim de semana: oficina de portao aberto'],
      [h(19), LAR.caio, 'noite em casa']],
  ),
  helena: agenda(
    [[h(6, 30), LAR.helena, 'se arrumar para a aula'],
      [h(8), CARTEIRA.helena, 'aula na escola'],
      [h(13), QUADRA.helena, 'treino na quadra'],
      [h(18, 30), LAR.helena, 'jantar com o pai']],
    [[h(8), LAR.helena, 'manha de skate no quintal'],
      [h(13), QUADRA.helena, 'fim de semana: quadra'],
      [h(18, 30), LAR.helena, 'noite em casa']],
  ),
  julia: agenda(
    [[h(5, 30), LAR.julia, 'cafe antes do primeiro horario'],
      [h(7), LINHA_DA_JULIA, 'operacao da linha de onibus'],
      [h(18), LAR.julia, 'jantar com Arthur e Rita']],
    [[h(8), LAR.julia, 'manha em casa'],
      [h(12), LINHA_DA_JULIA, 'fim de semana: volta no bairro'],
      [h(18), LAR.julia, 'noite em familia']],
  ),
  arthur: agenda(
    [[h(6, 30), LAR.arthur, 'se arrumar para a aula'],
      [h(8), CARTEIRA.arthur, 'aula na escola'],
      [h(13), QUADRA.arthur, 'clube secreto na quadra'],
      [h(18), LAR.arthur, 'jantar com a mae e a avo']],
    [[h(8), LAR.arthur, 'manha de aventura no quintal'],
      [h(13), QUADRA.arthur, 'fim de semana: quadra'],
      [h(18), LAR.arthur, 'noite em familia']],
  ),
  rita: agenda(
    [[h(7), LAR.rita, 'cafe e radio'],
      [h(9), COSTURA_DA_RITA, 'costura na cozinha'],
      [h(18), LAR.rita, 'jantar com a familia']],
    [[h(8), LAR.rita, 'manha de bolo'],
      [h(14), COSTURA_DA_RITA, 'fim de semana: conserta roupa dos vizinhos'],
      [h(19), LAR.rita, 'noite em familia']],
  ),
  roberto: agenda(
    [[h(6), LAR.roberto, 'cafe cedo com a Ilda'],
      [h(9), CALCADA_DO_ROBERTO, 'volta pela calcada e conversa com vizinho'],
      [h(18), LAR.roberto, 'jantar e noticiario']],
    [[h(8), LAR.roberto, 'manha de album de fotos'],
      [h(11), CALCADA_DO_ROBERTO, 'fim de semana: banco da calcada'],
      [h(18), LAR.roberto, 'noite em casa']],
  ),
  ilda: agenda(
    [[h(6, 30), LAR.ilda, 'cafe e correcao de prova'],
      [h(8), SALA_DE_AULA, 'aula de historia'],
      [h(12, 30), LAR.ilda, 'almoco em casa'],
      [h(14), CAMINHADA_DA_ILDA, 'caminhada da tarde'],
      [h(18), LAR.ilda, 'jantar com Roberto e Ravi']],
    [[h(8), LAR.ilda, 'manha de leitura'],
      [h(14), CAMINHADA_DA_ILDA, 'fim de semana: caminhada com o Ravi'],
      [h(18), LAR.ilda, 'noite em familia']],
  ),
  ravi: agenda(
    [[h(6, 30), LAR.ravi, 'se arrumar para a aula'],
      [h(8), CARTEIRA.ravi, 'aula na escola'],
      [h(13), CANTO_DO_RAVI, 'tarde no acervo da biblioteca'],
      [h(18), LAR.ravi, 'jantar com os avos']],
    [[h(9), LAR.ravi, 'manha de quebra-cabeca'],
      [h(13), CANTO_DO_RAVI, 'fim de semana: biblioteca'],
      [h(18), LAR.ravi, 'noite em familia']],
  ),
  davi: agenda(
    [[h(7, 30), LAR.davi, 'cafe silencioso'],
      [h(10), COZINHA_DO_DAVI, 'cozinha para a familia'],
      [h(20), LAR.davi, 'sala com a Samanta']],
    [[h(9), LAR.davi, 'manha devagar'],
      [h(12), COZINHA_DO_DAVI, 'fim de semana: almoco grande'],
      [h(20), LAR.davi, 'noite em casa']],
  ),
  samanta: agenda(
    [[h(6, 30), LAR.samanta, 'cafe e cabelo da Manuela'],
      [h(9), RUA_DA_SAMANTA, 'atende as clientes na rua de casa'],
      [h(19), LAR.samanta, 'jantar com Davi e Manuela']],
    [[h(8), LAR.samanta, 'manha em casa'],
      [h(11), RUA_DA_SAMANTA, 'fim de semana: fila de clientes'],
      [h(19), LAR.samanta, 'noite em familia']],
  ),
  manuela: agenda(
    [[h(7), LAR.manuela, 'se arrumar para a aula'],
      [h(8), CARTEIRA.manuela, 'aula na escola'],
      [h(12, 30), LAR.manuela, 'almoco com o tio Davi'],
      [h(15), QUADRA.manuela, 'quadra com os amigos'],
      [h(18), LAR.manuela, 'jantar em familia']],
    [[h(8), LAR.manuela, 'manha de musica alta'],
      [h(13), QUADRA.manuela, 'fim de semana: quadra'],
      [h(18), LAR.manuela, 'noite em familia']],
  ),
  rafael: agenda(
    [[h(6, 30), LAR.rafael, 'alongamento e cafe'],
      [h(8), SALA_DE_FISIO, 'atendimentos na academia'],
      [h(18), LAR.rafael, 'jantar com a Suzan']],
    [[h(8), LAR.rafael, 'manha de treino em casa'],
      [h(13), SALA_DE_FISIO, 'fim de semana: plantao de avaliacoes'],
      [h(18), LAR.rafael, 'noite em casa']],
  ),
  suzan: agenda(
    [[h(7), LAR.suzan, 'cafe e caderno de ideias'],
      [h(10), QUADRA_ABERTA, 'producao do evento na quadra'],
      [h(19), LAR.suzan, 'jantar com o Rafael']],
    [[h(8), LAR.suzan, 'manha de telefonemas'],
      [h(11), QUADRA_ABERTA, 'fim de semana: monta o palco da quadra'],
      [h(19), LAR.suzan, 'noite em casa']],
  ),
  lucas: agenda(
    [[h(7), LAR.lucas, 'cafe e podcast'],
      [h(9), ACERVO, 'atendimento no acervo'],
      [h(19), LAR.lucas, 'jantar sozinho e ligacao pra familia']],
    [[h(9), LAR.lucas, 'manha de faxina'],
      [h(13), ACERVO, 'fim de semana: catalogacao atrasada'],
      [h(19), LAR.lucas, 'noite em casa']],
  ),
  tulio: agenda(
    [[h(7), LAR.tulio, 'cafe e telefone atras de servico'],
      [h(9), PATIO_DA_CENTRAL, 'pequenos reparos no patio da central'],
      [h(18), LAR.tulio, 'jantar e causos']],
    [[h(9), LAR.tulio, 'manha de conserto proprio'],
      [h(13), PATIO_DA_CENTRAL, 'fim de semana: bico no patio'],
      [h(19), LAR.tulio, 'noite em casa']],
  ),
  joao: agenda(
    [[h(5), LAR.joao, 'cafe antes do sol'],
      [h(6, 30), HORTA_DO_JOAO, 'lida na plantacao'],
      [h(18), LAR.joao, 'jantar com Neide e Priscila']],
    [[h(6), LAR.joao, 'cafe de sabado'],
      [h(8), HORTA_DO_JOAO, 'fim de semana: colheita para a feira'],
      [h(17), LAR.joao, 'noite em familia']],
  ),
  neide: agenda(
    [[h(5), LAR.neide, 'cafe e conservas'],
      [h(6, 30), HORTA_DA_NEIDE, 'lida na plantacao'],
      [h(18), LAR.neide, 'jantar em familia']],
    [[h(6), LAR.neide, 'cafe de sabado'],
      [h(8), HORTA_DA_NEIDE, 'fim de semana: prepara os vidros de conserva'],
      [h(17), LAR.neide, 'noite em familia']],
  ),
  priscila: agenda(
    [[h(7), LAR.priscila, 'cafe e planilha'],
      [h(8, 30), ESCRITORIO_DA_PRISCILA, 'fechamento da cooperativa'],
      [h(18), LAR.priscila, 'jantar com o casal']],
    [[h(9), LAR.priscila, 'manha de silencio'],
      [h(14), ESCRITORIO_DA_PRISCILA, 'fim de semana: conferencia de notas'],
      [h(19), LAR.priscila, 'noite em familia']],
  ),
  bruno: agenda(
    [[h(5, 30), LAR.bruno, 'cafe forte antes do turno'],
      [h(7), BALCAO_DA_MADEIREIRA, 'balcao da madeireira'],
      [h(18), LAR.bruno, 'jantar sozinho e radio']],
    [[h(7), LAR.bruno, 'manha de conserto de serra'],
      [h(9), BALCAO_DA_MADEIREIRA, 'fim de semana: balcao em meio turno'],
      [h(15), LAR.bruno, 'tarde e noite em casa']],
  ),
};

const presentes = (amado: [string, string], gosta: [string, string, string], nao: [string, string], odeia: string): Morador['preferencias'] =>
  ({ amado, gosta, neutro: ['agua', 'pao_frances'], nao_gosta: [...nao, odeia], odeia });
const rel = (com: string, tipo: RelacaoSocial['tipo'], detalhe: string): RelacaoSocial => ({ com, tipo, detalhe });

export const MORADORES: Record<string, Morador> = {
  livia: { id: 'livia', nome: 'Livia', idade: 41, faixa: 'adulto', profissao: 'diretora da escola', estadoCivil: 'casada com Matheus', casa: 'casa_b1', mapaResidencia: 'bairro', familia: 'esposa de Matheus e mae de Cecilia', personalidade: { qualidades: ['justa','organizada','protetora'], defeitos: ['controladora','impaciente'], fala: 'clara e didatica', social: 'acolhe primeiro e cobra depois' }, vida: { favoritos: ['escola','biblioteca'], hobbies: ['encadernacao','jardinagem'], preocupacao: 'evasao dos alunos', objetivo: 'abrir oficinas no contraturno' }, rotinaResumo: ['06:00 acorda e prepara o cafe','07:20 abre a escola; almoca com Ilda','sexta revisa projetos na biblioteca','domingo caminha com Matheus e Cecilia'], atividades: AGENDAS.livia, relacoes: [rel('ilda','colegas','confia nela para mediar conflitos'),rel('clara','amizade','planejam projetos de leitura')], dialogoAtual: ['A escola funciona melhor quando cada pessoa se sente vista.','Cecilia conta tudo no jantar. Tudo mesmo.','Estou tentando abrir uma oficina de leitura depois das aulas.'], preferencias: presentes(['tablet_caneta','tablet'],['cafe','tablet_10','lampada_led'],['refrigerante','chips'],'drone'), romancePermitido: false, ...sprites('livia') },
  matheus: { id:'matheus', nome:'Matheus', idade:43, faixa:'adulto', profissao:'policial comunitario', estadoCivil:'casado com Livia', casa:'casa_b1', mapaResidencia:'bairro', familia:'marido de Livia e pai de Cecilia', personalidade:{qualidades:['calmo','corajoso','observador'],defeitos:['teimoso','reservado'],fala:'baixa e objetiva',social:'ouve antes de intervir'}, vida:{favoritos:['quadra','cafe da praca'],hobbies:['xadrez','consertar radios'],preocupacao:'ser visto apenas como autoridade',objetivo:'criar uma guarda comunitaria desarmada'}, rotinaResumo:['05:40 acorda e patrulha a pe','07:30 acompanha Cecilia ate a escola','sexta joga xadrez com Roberto','domingo fica com a familia'], atividades: AGENDAS.matheus, relacoes:[rel('roberto','amizade','parceiros de xadrez'),rel('caio','colegas','trocam informacoes sobre transito')], dialogoAtual:['Ronda boa e a que termina sem susto.','A Cecilia acha que eu sei resolver qualquer coisa. Nao conta pra ela.','Roberto ainda me deve uma revanche no xadrez.'], preferencias:presentes(['radio_boombox','cafe'],['pilhas','relogio_digital','pao_caseiro'],['drone','refrigerante'],'console_portatil'), romancePermitido:false, ...sprites('matheus') },
  cecilia: { id:'cecilia', nome:'Cecilia', idade:9, faixa:'crianca', profissao:'estudante', estadoCivil:'crianca', casa:'casa_b1', mapaResidencia:'bairro', familia:'filha de Livia e Matheus', personalidade:{qualidades:['curiosa','generosa','criativa'],defeitos:['intrometida','distraida'],fala:'perguntas em sequencia',social:'faz amizade antes de saber o nome'}, vida:{favoritos:['escola','quadra'],hobbies:['desenho','colecionar folhas'],preocupacao:'ler em voz alta',objetivo:'ilustrar um livro'}, rotinaResumo:['06:40 acorda','08:00-12:00 escola','14:00 quadra com Arthur e Ravi','18:00 volta com o pai'], atividades: AGENDAS.cecilia, relacoes:[rel('arthur','amizade','inventam mapas do bairro'),rel('ravi','amizade','trocam desenhos')], dialogoAtual:['Voce sabe desenhar cachorro? Eu sei, mas o meu parece uma nuvem.','A diretora e minha mae, mas na escola eu chamo de diretora. Quase sempre.','Arthur disse que achou um atalho. Nao era um atalho.'], preferencias:presentes(['barra_de_chocolate','tablet_caneta'],['maca','cookies','console_retro'],['cebola','cafe'],'brocolis'), romancePermitido:false, ...sprites('cecilia') },
  clara: { id:'clara', nome:'Clara', idade:34, faixa:'adulto', profissao:'bibliotecaria', estadoCivil:'solteira', casa:'casa_b2', mapaResidencia:'bairro', familia:'irma mais velha de Lucia', personalidade:{qualidades:['atenciosa','culta','paciente'],defeitos:['perfeccionista','evita confronto'],fala:'mansa e precisa',social:'lembra o livro preferido de cada um'}, vida:{favoritos:['biblioteca','praca'],hobbies:['restaurar livros','palavras cruzadas'],preocupacao:'goteira no acervo',objetivo:'criar um arquivo da historia local'}, rotinaResumo:['06:50 acorda','09:00-19:00 biblioteca com pausa na praca','quarta visita Ilda','domingo restaura livros em casa'], atividades: AGENDAS.clara, relacoes:[rel('livia','amizade','organizam projetos de leitura'),rel('alice','amizade','recebe historias antigas do bar')], dialogoAtual:['Livro devolvido atrasado ainda e melhor que livro nunca lido.','Lucia esta tentando decidir o futuro. Eu tento nao decidir por ela.','Alice conhece metade da historia da cidade e inventa a outra metade.'], preferencias:presentes(['tablet','cafe'],['tablet_10','lampada_led','cookies'],['refrigerante','drone'],'caixa_de_som'), romancePermitido:true, ...sprites('clara') },
  lucia: { id:'lucia', nome:'Lucia', idade:21, faixa:'jovem', profissao:'estudante e procurando emprego', estadoCivil:'solteira', casa:'casa_b2', mapaResidencia:'bairro', familia:'irma mais nova de Clara', personalidade:{qualidades:['inventiva','solidaria','bem-humorada'],defeitos:['indecisa','procrastinadora'],fala:'rapida, cheia de parenteses',social:'faz piada quando fica nervosa'}, vida:{favoritos:['biblioteca','bar'],hobbies:['podcast','fotografia de rua'],preocupacao:'escolher uma carreira',objetivo:'produzir um documentario da cidade'}, rotinaResumo:['09:10 acorda','manha estuda na biblioteca','tarde procura bicos e grava entrevistas','sexta ajuda Vitor no som do bar'], atividades: AGENDAS.lucia, relacoes:[rel('vitor','colegas','aprende gravacao de audio'),rel('leticia','amizade','fazem caminhadas fotograficas')], dialogoAtual:['Eu tenho tres planos de carreira. Isso conta como plano?','A Clara organiza livros; eu desorganizo ideias. Equilibrio familiar.','Leticia enxerga umas fotos que eu ainda nao aprendi a ver.'], preferencias:presentes(['camera','microfone'],['fone_bluetooth','cafe','cartao_sd'],['relogio_digital','brocolis'],'air_fryer'), romancePermitido:true, ...sprites('lucia') },
  caio: { id:'caio', nome:'Caio', idade:43, faixa:'adulto', profissao:'mecanico autonomo', estadoCivil:'separado', casa:'casa_b3', mapaResidencia:'bairro', familia:'pai solo de Helena', personalidade:{qualidades:['leal','habilidoso','paciente'],defeitos:['calado','orgulhoso'],fala:'frases curtas e analogias de motor',social:'ajuda sem anunciar'}, vida:{favoritos:['oficina','bar'],hobbies:['motos antigas','domino'],preocupacao:'ter pouco tempo para Helena',objetivo:'abrir uma oficina com aprendiz'}, rotinaResumo:['05:50 acorda e prepara o cafe de Helena','07:30 oficina; almoca no mercado','sexta bar com Bruno','domingo leva Helena a zona rural'], atividades: AGENDAS.caio, relacoes:[rel('bruno','rivalidade','disputam quem entende mais de ferramenta'),rel('matheus','colegas','conversam sobre seguranca viaria')], dialogoAtual:['Barulho estranho sempre conta uma historia.','A Helena ja sabe mais de ferramenta do que admite.','Bruno chama improviso de tecnica. Eu chamo de improviso.'], preferencias:presentes(['adaptador_de_tomada','cafe'],['filtro_de_linha','pilhas','radio_boombox'],['ring_light','sorvete'],'drone'), romancePermitido:true, ...sprites('caio') },
  helena: { id:'helena', nome:'Helena', idade:13, faixa:'crianca', profissao:'estudante', estadoCivil:'adolescente', casa:'casa_b3', mapaResidencia:'bairro', familia:'filha de Caio', personalidade:{qualidades:['independente','esperta','corajosa'],defeitos:['impulsiva','competitiva'],fala:'direta, com ironia curta',social:'testa as pessoas antes de confiar'}, vida:{favoritos:['quadra','oficina'],hobbies:['skate','montar miniaturas'],preocupacao:'que o pai trabalhe demais',objetivo:'competir em skate'}, rotinaResumo:['06:30 acorda','08:00-13:00 escola','15:00 quadra ou oficina do pai','19:00 em casa; nunca sai de madrugada'], atividades: AGENDAS.helena, relacoes:[rel('suzan','amizade','treinam manobras na quadra'),rel('manuela','cuidado','ensina a andar de skate')], dialogoAtual:['Nao, eu nao cai. Eu testei o chao.','Meu pai sabe consertar tudo, menos o proprio horario.','Suzan prometeu filmar minha proxima manobra.'], preferencias:presentes(['fone_esportivo','controle'],['refrigerante','chips','smartwatch'],['tablet','alface'],'console_portatil'), romancePermitido:false, ...sprites('helena') },
  julia: { id:'julia', nome:'Julia', idade:36, faixa:'adulto', profissao:'motorista de onibus', estadoCivil:'divorciada', casa:'casa_b4', mapaResidencia:'bairro', familia:'mae de Arthur e filha de Rita', personalidade:{qualidades:['pontual','afetuosa','pratica'],defeitos:['ansiosa','mandona'],fala:'energiva, como quem anuncia parada',social:'conhece todos de vista'}, vida:{favoritos:['ponto de onibus','mercado'],hobbies:['cantar','cuidar de suculentas'],preocupacao:'conciliar turnos e familia',objetivo:'dirigir uma linha intermunicipal'}, rotinaResumo:['04:50 acorda','06:00 inicia a linha bairro-centro','14:30 busca Arthur','sabado canta no bar; domingo almoca com Rita'], atividades: AGENDAS.julia, relacoes:[rel('hiago','colegas','trocam noticias das ruas'),rel('samanta','amizade','cantam juntas aos sabados')], dialogoAtual:['Proxima parada: cinco minutos de descanso.','Arthur sabe todos os horarios melhor que muito adulto.','Se o Hiago disser que chega mais rapido de bicicleta, nao acredita.'], preferencias:presentes(['cafe','radio_boombox'],['lampada_led','cookies','power_bank'],['drone','chips'],'relogio_digital'), romancePermitido:true, ...sprites('julia') },
  arthur: { id:'arthur', nome:'Arthur', idade:10, faixa:'crianca', profissao:'estudante', estadoCivil:'crianca', casa:'casa_b4', mapaResidencia:'bairro', familia:'filho de Julia e neto de Rita', personalidade:{qualidades:['imaginativo','gentil','persistente'],defeitos:['desastrado','teimoso'],fala:'narra aventuras como fatos',social:'cria clubes com regras demais'}, vida:{favoritos:['escola','quadra'],hobbies:['mapas','aviao de papel'],preocupacao:'a mae dirigir cansada',objetivo:'conhecer todas as estradas'}, rotinaResumo:['06:20 acorda com a avo','08:00-12:00 escola','14:00 explora o bairro com Cecilia','18:00 volta antes de Julia chegar'], atividades: AGENDAS.arthur, relacoes:[rel('cecilia','amizade','mapeiam atalhos imaginarios'),rel('ravi','amizade','constroem avioes de papel')], dialogoAtual:['Estou fazendo um mapa. A parte secreta ainda e secreta ate pra mim.','Minha mae dirige o onibus grande. Eu dirijo os avioes de papel.','A vo Rita sempre sabe quando eu peguei biscoito.'], preferencias:presentes(['console_portatil','cookies'],['tablet_caneta','suco_uva','barra_de_chocolate'],['cebola','cafe'],'brocolis'), romancePermitido:false, ...sprites('arthur') },
  rita: { id:'rita', nome:'Vo Rita', idade:69, faixa:'idoso', profissao:'costureira aposentada', estadoCivil:'viuva', casa:'casa_b4', mapaResidencia:'bairro', familia:'mae de Julia e avo de Arthur', personalidade:{qualidades:['sabia','acolhedora','engenhosa'],defeitos:['bisbilhoteira','inflexivel'],fala:'proverbios e humor seco',social:'alimenta qualquer visita'}, vida:{favoritos:['mercado','praca'],hobbies:['costura','horta em vasos'],preocupacao:'a filha descansar pouco',objetivo:'terminar uma colcha da familia'}, rotinaResumo:['05:30 acorda e costura','07:30 leva Arthur a escola','tarde praca ou mercado','domingo recebe Ilda para cafe'], atividades: AGENDAS.rita, relacoes:[rel('ilda','amizade','tomam cafe aos domingos'),rel('neide','amizade','trocam sementes e receitas')], dialogoAtual:['Ponto torto se desfaz; palavra torta da mais trabalho.','A Julia precisa de oito horas de sono e acha que precisa de quatro.','Neide me prometeu uma muda de alecrim.'], preferencias:presentes(['tablet_caneta','cafe'],['lampada_led','pao_caseiro','suco_uva'],['refrigerante','chips'],'drone'), romancePermitido:false, ...sprites('rita') },
  roberto: { id:'roberto', nome:'Roberto', idade:67, faixa:'idoso', profissao:'ferroviario aposentado', estadoCivil:'casado com Ilda', casa:'casa_b5', mapaResidencia:'bairro', familia:'marido de Ilda e avo responsavel por Ravi', personalidade:{qualidades:['paciente','leal','metodico'],defeitos:['nostalgico','rabugento'],fala:'lenta, cheia de datas',social:'prefere companhia silenciosa'}, vida:{favoritos:['estacao','praca'],hobbies:['xadrez','trens em miniatura'],preocupacao:'perder a memoria das historias locais',objetivo:'montar uma maquete da antiga ferrovia'}, rotinaResumo:['05:20 acorda e caminha ate a estacao','manha cuida de Ravi','sexta xadrez com Matheus','domingo visita o mercado com Ilda'], atividades: AGENDAS.roberto, relacoes:[rel('matheus','amizade','jogam xadrez nas sextas'),rel('joao','amizade','lembram o transporte rural antigo')], dialogoAtual:['Essa rua seguia o trilho antigo. Quase ninguem lembra.','Ravi ganhou de mim no xadrez. Foi sorte. Duas vezes.','Matheus pensa demais antes de mover o cavalo.'], preferencias:presentes(['radio_boombox','cafe'],['pilhas','relogio_digital','pao_caseiro'],['drone','smartphone_azul'],'fone_esportivo'), romancePermitido:false, ...sprites('roberto') },
  ilda: { id:'ilda', nome:'Professora Ilda', idade:65, faixa:'idoso', profissao:'professora de historia em meio periodo', estadoCivil:'casada com Roberto', casa:'casa_b5', mapaResidencia:'bairro', familia:'esposa de Roberto e avo responsavel por Ravi', personalidade:{qualidades:['didatica','curiosa','compassiva'],defeitos:['exigente','dispersa'],fala:'conta contexto antes da resposta',social:'transforma conversa em aula sem perceber'}, vida:{favoritos:['escola','biblioteca'],hobbies:['genealogia','croche'],preocupacao:'Ravi esconder quando precisa de ajuda',objetivo:'publicar a memoria oral da cidade'}, rotinaResumo:['06:10 acorda','08:00-12:00 aulas seg/qua/sex','tarde pesquisa com Clara','domingo cafe com Rita'], atividades: AGENDAS.ilda, relacoes:[rel('livia','colegas','mentora informal da diretora'),rel('rita','amizade','encontro de cafe e costura')], dialogoAtual:['Toda cidade guarda historia nos lugares que para de olhar.','O Ravi aprende rapido quando esquece que esta estudando.','Clara encontrou um jornal que eu procurava ha anos.'], preferencias:presentes(['tablet','tablet_caneta'],['cafe','suco_uva','tablet_10'],['refrigerante','drone'],'console_portatil'), romancePermitido:false, ...sprites('ilda') },
  ravi: { id:'ravi', nome:'Ravi', idade:11, faixa:'crianca', profissao:'estudante', estadoCivil:'crianca', casa:'casa_b5', mapaResidencia:'bairro', familia:'neto sob os cuidados de Ilda e Roberto', personalidade:{qualidades:['analitico','educado','leal'],defeitos:['timido','preocupado'],fala:'baixo, escolhe palavras',social:'se solta em grupos pequenos'}, vida:{favoritos:['biblioteca','quadra'],hobbies:['xadrez','quadrinhos'],preocupacao:'dar trabalho aos avos',objetivo:'criar um jogo de tabuleiro'}, rotinaResumo:['06:50 acorda','08:00-12:00 escola','14:00 biblioteca; quinta quadra','18:00 joga xadrez com Roberto'], atividades: AGENDAS.ravi, relacoes:[rel('arthur','amizade','testam jogos de papel'),rel('cecilia','amizade','trocam desenhos e quadrinhos')], dialogoAtual:['Estou fazendo um jogo. Ainda falta uma regra que nao estrague as outras.','Meu avo diz que eu tive sorte no xadrez. Duas vezes.','Na biblioteca da pra pensar sem todo mundo perguntar por que voce esta quieto.'], preferencias:presentes(['tablet','controle'],['cookies','tablet_caneta','suco_uva'],['cafe','cebola'],'brocolis'), romancePermitido:false, ...sprites('ravi') },
  davi: { id:'davi', nome:'Davi', idade:28, faixa:'adulto', profissao:'cozinheiro afastado temporariamente', estadoCivil:'solteiro', casa:'casa_b6', mapaResidencia:'bairro', familia:'irmao de Samanta e tio de Manuela', personalidade:{qualidades:['cuidadoso','criativo','generoso'],defeitos:['inseguro','mal-humorado cedo'],fala:'ironia baixa',social:'cozinha em vez de falar sobre afeto'}, vida:{favoritos:['mercado','bar'],hobbies:['panificacao','filmes antigos'],preocupacao:'voltar ao trabalho depois de uma lesao na mao',objetivo:'abrir uma pequena padaria'}, rotinaResumo:['08:40 acorda e faz fisioterapia','manha testa receitas em casa','tarde mercado e praca','sabado leva paes ao bar'], atividades: AGENDAS.davi, relacoes:[rel('alice','colegas','fornece petiscos de teste'),rel('jaqueline','amizade','ela avalia receitas sem delicadeza')], dialogoAtual:['Hoje o pao cresceu. Minha paciencia, nem tanto.','A Manuela e minha critica gastronomica mais cruel.','Alice chama meus testes queimados de acompanhamento defumado.'], preferencias:presentes(['liquidificador','cafe'],['farinha','ovos','manteiga'],['chips','refrigerante'],'drone'), romancePermitido:true, ...sprites('davi') },
  samanta: { id:'samanta', nome:'Samanta', idade:32, faixa:'adulto', profissao:'cabeleireira informal', estadoCivil:'mae solo', casa:'casa_b6', mapaResidencia:'bairro', familia:'mae de Manuela e irma de Davi', personalidade:{qualidades:['carismatica','resiliente','atenta'],defeitos:['fofoqueira','sobrecarregada'],fala:'calorosa e musical',social:'sabe quando brincar e quando ouvir'}, vida:{favoritos:['praca','bar'],hobbies:['canto','penteados'],preocupacao:'estabilizar a renda',objetivo:'abrir um salao no bairro'}, rotinaResumo:['06:30 acorda e arruma Manuela','09:00 atende em casa','16:00 busca a filha','sabado canta com Julia no bar'], atividades: AGENDAS.samanta, relacoes:[rel('julia','amizade','dupla de canto aos sabados'),rel('jaqueline','colegas','trocam noticias sem expor segredos')], dialogoAtual:['Cabelo conta como a pessoa chegou; conversa conta como ela quer sair.','Davi finge que nao gosta de elogio. Tenta elogiar o pao dele.','A Manuela escolhe meus brincos e leva a funcao muito a serio.'], preferencias:presentes(['ring_light','microfone'],['cafe','soundbar','fone_bluetooth'],['adaptador_de_tomada','chips'],'brocolis'), romancePermitido:true, ...sprites('samanta') },
  manuela: { id:'manuela', nome:'Manuela', idade:7, faixa:'crianca', profissao:'estudante', estadoCivil:'crianca', casa:'casa_b6', mapaResidencia:'bairro', familia:'filha de Samanta e sobrinha de Davi', personalidade:{qualidades:['afetuosa','ousada','engracada'],defeitos:['impaciente','barulhenta'],fala:'alto e sem filtro',social:'adota adultos como plateia'}, vida:{favoritos:['escola','quadra'],hobbies:['danca','adesivos'],preocupacao:'a mae trabalhar demais',objetivo:'aprender uma coreografia inteira'}, rotinaResumo:['07:00 acorda','08:00-12:00 escola','14:00 brinca com Helena','18:00 ajuda o tio na cozinha'], atividades: AGENDAS.manuela, relacoes:[rel('helena','amizade','recebe aulas cuidadosas de skate'),rel('cecilia','amizade','inventam coreografias')], dialogoAtual:['A Helena disse que eu ainda nao posso descer a rampa grande. Ainda.','Meu tio faz pao quadrado e chama de rustico.','Hoje eu escolhi os brincos da minha mae. Ficou perfeito.'], preferencias:presentes(['console_portatil','barra_de_chocolate'],['cookies','suco_uva','tablet_caneta'],['cafe','cebola'],'brocolis'), romancePermitido:false, ...sprites('manuela') },
  rafael: { id:'rafael', nome:'Rafael', idade:30, faixa:'adulto', profissao:'fisioterapeuta', estadoCivil:'casado com Suzan', casa:'casa_b7', mapaResidencia:'bairro', familia:'marido de Suzan', personalidade:{qualidades:['empatico','disciplinado','otimista'],defeitos:['competitivo','excessivamente prestativo'],fala:'encorajadora',social:'transforma tudo em meta pequena'}, vida:{favoritos:['academia','quadra'],hobbies:['corrida','culinaria saudavel'],preocupacao:'nao levar problemas de pacientes para casa',objetivo:'abrir atendimento comunitario'}, rotinaResumo:['05:10 acorda e corre','07:00 atende perto da academia','18:00 quadra com Suzan','domingo almoca com Caio e Helena'], atividades: AGENDAS.rafael, relacoes:[rel('mari','colegas','encaminham alunos e pacientes'),rel('caio','amizade','acompanha a recuperacao da mao dele')], dialogoAtual:['Melhora pequena tambem e melhora. O corpo soma tudo.','Suzan diz que eu transformo passeio em treino. Talvez.','Caio esta recuperando a mao, embora reclame de cada exercicio.'], preferencias:presentes(['smartwatch','fone_esportivo'],['suco_laranja','banana','iogurte'],['refrigerante','chips'],'cafe'), romancePermitido:false, ...sprites('rafael') },
  suzan: { id:'suzan', nome:'Suzan', idade:29, faixa:'adulto', profissao:'produtora cultural freelancer', estadoCivil:'casada com Rafael', casa:'casa_b7', mapaResidencia:'bairro', familia:'esposa de Rafael', personalidade:{qualidades:['criativa','diplomatica','entusiasmada'],defeitos:['desorganizada','assume tarefas demais'],fala:'visual, cheia de exemplos',social:'conecta pessoas de grupos diferentes'}, vida:{favoritos:['quadra','bar'],hobbies:['video','danca'],preocupacao:'projetos irregulares',objetivo:'criar um festival anual do bairro'}, rotinaResumo:['08:20 acorda','manha edita projetos em casa','tarde escola, quadra ou bar','sexta grava Vitor; domingo visita Helena'], atividades: AGENDAS.suzan, relacoes:[rel('helena','amizade','filma as manobras de skate'),rel('vitor','colegas','produzem apresentacoes locais')], dialogoAtual:['Uma cidade precisa de festa pra lembrar que e uma cidade.','Helena finalmente deixou eu filmar a rampa grande.','Rafael chama montagem de video de ficar sentada demais.'], preferencias:presentes(['camera_de_acao','microfone'],['cartao_sd','fone_bluetooth','cafe'],['adaptador_de_tomada','brocolis'],'air_fryer'), romancePermitido:false, ...sprites('suzan') },
  lucas: { id:'lucas', nome:'Lucas', idade:26, faixa:'jovem', profissao:'funcionario da biblioteca', estadoCivil:'solteiro', casa:'casa_c1', mapaResidencia:'bairro', familia:'mora sozinho; familia em outra cidade', personalidade:{qualidades:['prestativo','curioso','educado'],defeitos:['ansioso','pedante'],fala:'formal quando fica nervoso',social:'oferece ajuda antes de intimidade'}, vida:{favoritos:['biblioteca','estacao'],hobbies:['ficcao cientifica','observacao de aves'],preocupacao:'se sentir de fora da cidade',objetivo:'cursar arquivologia'}, rotinaResumo:['07:40 acorda','09:00 organiza devolucoes','17:00 observa aves perto da estacao','sabado joga com Ravi na biblioteca'], atividades: AGENDAS.lucas, relacoes:[rel('clara','colegas','mentora no trabalho'),rel('ravi','amizade','testa os jogos de tabuleiro dele')], dialogoAtual:['Posso ajudar a encontrar alguma coisa. Mesmo que nao seja um livro.','Clara sabe exatamente onde tudo esta. Eu ainda uso etiquetas.','Ravi criou um jogo surpreendentemente dificil.'], preferencias:presentes(['tablet','camera'],['cafe','tablet_caneta','tablet_10'],['caixa_de_som','refrigerante'],'drone'), romancePermitido:true, ...sprites('lucas') },
  tulio: { id:'tulio', nome:'Tulio', idade:39, faixa:'adulto', profissao:'desempregado, faz pequenos servicos', estadoCivil:'solteiro', casa:'casa_c2', mapaResidencia:'bairro', familia:'mora sozinho; primo de Bruno', personalidade:{qualidades:['versatil','honesto','bem-humorado'],defeitos:['inconstante','orgulhoso'],fala:'causos longos',social:'conhece gente em todo oficio'}, vida:{favoritos:['mercado','madeireira'],hobbies:['pesca','restaurar moveis'],preocupacao:'conseguir renda estavel',objetivo:'montar uma marcenaria de reparos'}, rotinaResumo:['07:10 acorda','manha procura servicos no bairro','ter/qui ajuda Bruno na madeireira','sexta bar; domingo pesca com Joao'], atividades: AGENDAS.tulio, relacoes:[rel('bruno','familia','primos; trabalham juntos sem morar juntos'),rel('joao','amizade','pescam aos domingos')], dialogoAtual:['Se tiver uma cadeira manca, eu conheco tres jeitos de arrumar.','Bruno diz que eu converso mais do que lixo. Ele nao esta errado.','Trabalho fixo eu ainda nao achei. Servico, isso sempre aparece.'], preferencias:presentes(['adaptador_de_tomada','radio_boombox'],['cafe','pilhas','pao_caseiro'],['ring_light','brocolis'],'drone'), romancePermitido:true, ...sprites('tulio') },
  joao: { id:'joao', nome:'Joao', idade:48, faixa:'adulto', profissao:'agricultor e feirante', estadoCivil:'casado com Neide', casa:'casa_rural_1', mapaResidencia:'rural', familia:'marido de Neide e irmao de Priscila', personalidade:{qualidades:['trabalhador','generoso','prudente'],defeitos:['tradicionalista','teimoso'],fala:'calma, com referencias ao tempo',social:'oferece produto antes de conversa'}, vida:{favoritos:['fazenda','mercado'],hobbies:['pesca','radio'],preocupacao:'chuvas irregulares',objetivo:'diversificar a plantacao'}, rotinaResumo:['04:45 acorda','05:30 cuida da fazenda','quarta e sabado vende no mercado','domingo pesca com Tulio e visita Roberto'], atividades: AGENDAS.joao, relacoes:[rel('tulio','amizade','companheiros de pesca'),rel('roberto','amizade','trocam historias da antiga ferrovia')], dialogoAtual:['Ceu fechado cedo assim pode ser chuva ou promessa vazia.','A Neide percebe praga na folha antes de mim. Nao repete isso.','Priscila leva as contas melhor do que qualquer caderno meu.'], preferencias:presentes(['radio_boombox','power_bank'],['cafe','milho','pilhas'],['drone','ring_light'],'console_portatil'), romancePermitido:false, ...sprites('joao') },
  neide: { id:'neide', nome:'Neide', idade:46, faixa:'adulto', profissao:'agricultora e produtora de conservas', estadoCivil:'casada com Joao', casa:'casa_rural_1', mapaResidencia:'rural', familia:'esposa de Joao e cunhada de Priscila', personalidade:{qualidades:['atenta','acolhedora','persistente'],defeitos:['desconfiada','centralizadora'],fala:'pratica, com humor discreto',social:'observa bastante antes de convidar'}, vida:{favoritos:['fazenda','mercado'],hobbies:['conservas','ervas medicinais'],preocupacao:'Joao esconder cansaco',objetivo:'vender produtos com marca propria'}, rotinaResumo:['05:15 acorda','06:00 horta e conservas','quinta entrega no mercado','domingo troca mudas com Rita'], atividades: AGENDAS.neide, relacoes:[rel('rita','amizade','trocam mudas e receitas'),rel('jaqueline','colegas','negociam conservas no mercado')], dialogoAtual:['Conserva boa precisa de tempo. Gente tambem.','Joao chama cansaco de calor. Eu conheco a diferenca.','Rita quer uma muda de alecrim e vai receber duas.'], preferencias:presentes(['lampada_led','tablet_caneta'],['cafe','milho','creme_de_leite'],['refrigerante','chips'],'drone'), romancePermitido:false, ...sprites('neide') },
  priscila: { id:'priscila', nome:'Priscila', idade:38, faixa:'adulto', profissao:'contadora remota da cooperativa', estadoCivil:'solteira', casa:'casa_rural_1', mapaResidencia:'rural', familia:'irma de Joao; divide a casa com o casal', personalidade:{qualidades:['precisa','independente','leal'],defeitos:['critica','impaciente'],fala:'numeros e conclusoes',social:'demonstra carinho resolvendo problemas'}, vida:{favoritos:['fazenda','biblioteca'],hobbies:['planilhas','corrida'],preocupacao:'nao ter privacidade na casa compartilhada',objetivo:'construir um pequeno estudio no campo'}, rotinaResumo:['06:35 acorda e corre','08:00-16:00 trabalho remoto','quarta biblioteca no bairro','sexta janta com Clara'], atividades: AGENDAS.priscila, relacoes:[rel('clara','amizade','clube informal de leitura'),rel('edu','colegas','trocam dicas de trabalho remoto')], dialogoAtual:['Trabalhar remoto no campo e otimo ate a internet lembrar que e no campo.','Meu irmao chama anotacao num guardanapo de contabilidade.','Clara separou uns livros sobre cooperativas pra mim.'], preferencias:presentes(['notebook','cafe'],['ssd','roteador','tablet_caneta'],['refrigerante','radio_boombox'],'drone'), romancePermitido:true, ...sprites('priscila') },
  bruno: { id:'bruno', nome:'Bruno', idade:45, faixa:'adulto', profissao:'encarregado da madeireira', estadoCivil:'divorciado', casa:'casa_rural_2', mapaResidencia:'rural', familia:'mora sozinho; primo de Tulio', personalidade:{qualidades:['responsavel','franco','protetor'],defeitos:['ranzinza','competitivo'],fala:'seca e alta por causa das maquinas',social:'respeita competencia mais que simpatia'}, vida:{favoritos:['madeireira','bar'],hobbies:['entalhe','mecanica'],preocupacao:'seguranca da equipe',objetivo:'modernizar a madeireira sem demitir ninguem'}, rotinaResumo:['05:00 acorda','06:00 inspeciona a madeireira','sexta compara ferramentas com Caio no bar','domingo recebe Tulio ou fica entalhando'], atividades: AGENDAS.bruno, relacoes:[rel('caio','rivalidade','competicao amigavel sobre ferramentas'),rel('tulio','familia','primo a quem oferece bicos')], dialogoAtual:['Madeira avisa antes de quebrar. Tem que saber ouvir.','Tulio trabalha bem quando para de contar historia.','Caio usa ferramenta boa. Pena que acha que inventou todas.'], preferencias:presentes(['adaptador_de_tomada','cafe'],['power_bank','pilhas','radio_boombox'],['ring_light','sorvete'],'drone'), romancePermitido:true, ...sprites('bruno') },
};

export const CASAS_OCUPADAS = [...new Set(Object.values(MORADORES).map((m) => m.casa))];
export const CASAS_VAZIAS = ['casa_b8', 'casa_c3', 'casa_c4'];
export const TERRENO_FUTURO = 'terreno_baldio';
export const CRIANCAS = Object.values(MORADORES).filter((m) => m.faixa === 'crianca').map((m) => m.id);

for (const morador of Object.values(MORADORES)) {
  registrarPreferenciasNpc(morador.id, morador.preferencias);
}

export function buscarMorador(id: unknown): Morador | null {
  return typeof id === 'string' ? MORADORES[id] ?? null : null;
}

/** Atividade valida para o relogio atual; fins de semana substituem o dia util. */
export function atividadeAtual(morador: Morador, dia: number, minutos: number): AtividadeMorador | null {
  const fimDeSemana = dia % 7 >= 5;
  const lista = morador.atividades.filter((a) => Boolean(a.fimDeSemana) === fimDeSemana);
  return lista.find((a) => minutos >= a.inicio && minutos < a.fim) ?? null;
}

/**
 * AS DEZ FAMILIAS DE ENIGMA, e como um andar ganha o seu.
 *
 * A leva anterior tinha SETE paineis escritos a mao, um por um, com a resposta
 * de cada um redigida num documento tambem escrito a mao. Isso funciona pra
 * sete. Pra quarenta e cinco, nao: metade das respostas acabaria sem pista
 * escrita em lugar nenhum, e a unica forma de o jogador resolver seria por
 * tentativa e erro — que e exatamente o que a Parte 20 proibe.
 *
 * Entao aqui o painel e a PISTA nascem juntos, da mesma funcao. `gerarEnigma`
 * devolve os dois: o painel (com a resposta) e o texto do documento (com a
 * resposta escrita em prosa). Nao ha como acrescentar um enigma e esquecer a
 * pista — nao existe caminho de codigo que produza um sem o outro.
 *
 * Tudo e DETERMINISTICO: a familia vem da tabela de andares e os parametros
 * (quais alavancas, que ordem, que codigo) saem de um hash do numero do andar.
 * O andar 23 faz a mesma pergunta em toda maquina e em todo reload, e a
 * conferencia offline confere as cinquenta respostas sem abrir navegador.
 *
 * ---------------------------------------------------------------------------
 * O QUE CADA ENIGMA ABRE
 * ---------------------------------------------------------------------------
 * A cada CINCO andares o enigma trava a descida — sao as nove portas de verdade
 * da usina (5->6, 10->11, ... 45->46). Nos outros trinta e seis ele abre so um
 * recipiente de salvado melhor. E o que faz a maioria dos enigmas ser opcional
 * sem que nenhum deles seja decorativo.
 */

import { ANDARES, ANDARES_TOTAIS, buscarAndar, capituloDoAndar, idDaFicha } from './andares.ts';
import type { PainelRepresa, PassoPainel } from './represa.ts';

// ------------------------------------------------------------------ hash --
/**
 * Hash deterministico de um numero e um rotulo -> [0,1). E a mesma avalanche do
 * `hash01Texto` de itens.ts; ela esta repetida aqui (quatro linhas) em vez de
 * importada porque importar `itens.ts` daqui fecharia um ciclo com o catalogo.
 */
function hash(andar: number, sal: string): number {
  let h = (andar * 2654435761) >>> 0;
  for (let i = 0; i < sal.length; i++) h = Math.imul(h ^ sal.charCodeAt(i), 0x01000193);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Inteiro em [0, n). */
const dado = (andar: number, sal: string, n: number): number =>
  Math.min(n - 1, Math.floor(hash(andar, sal) * n));

/**
 * Embaralha uma lista de forma deterministica e devolve os `quantos` primeiros.
 * Fisher-Yates com o hash no lugar do `Math.random` — o mesmo padrao que a
 * geracao de mundo ja usa.
 */
function escolherAlguns<T>(lista: readonly T[], quantos: number, andar: number, sal: string): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(hash(andar, `${sal}:${i}`) * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, quantos);
}

// -------------------------------------------------------------- familias --
export const FAMILIAS_DE_ENIGMA = [
  'alavancas',
  'roteamento',
  'labirinto',
  'terminal',
  'valvulas',
  'circuito',
  'pressao',
  'temporizado',
  'observacao',
  'multiandar',
] as const;
export type FamiliaEnigma = (typeof FAMILIAS_DE_ENIGMA)[number];

export interface DefinicaoFamilia {
  id: FamiliaEnigma;
  nome: string;
  /** o que ela pede do jogador, em uma linha */
  descricao: string;
  /** grau BASE; o capitulo pode subir (ver `grauDoEnigma`) */
  grau: 'simples' | 'intermediario' | 'profundo';
}

export const FAMILIAS: readonly DefinicaoFamilia[] = [
  { id: 'alavancas', nome: 'Sequencia de alavancas', descricao: 'acionar alavancas na ordem certa', grau: 'simples' },
  { id: 'roteamento', nome: 'Roteamento de energia', descricao: 'religar barramentos entre paineis', grau: 'intermediario' },
  { id: 'labirinto', nome: 'Travessia', descricao: 'achar a alavanca do outro lado do labirinto', grau: 'simples' },
  { id: 'terminal', nome: 'Codigo de terminal', descricao: 'digitar um codigo lido num documento', grau: 'intermediario' },
  { id: 'valvulas', nome: 'Sequencia de valvulas', descricao: 'abrir e fechar valvulas na ordem', grau: 'intermediario' },
  { id: 'circuito', nome: 'Reconexao de circuito', descricao: 'escolher o par de cabos certo', grau: 'simples' },
  { id: 'pressao', nome: 'Peso e pressao', descricao: 'manter a porta com peso ou trava', grau: 'intermediario' },
  { id: 'temporizado', nome: 'Energia por tempo', descricao: 'concluir a partida antes do prazo', grau: 'profundo' },
  { id: 'observacao', nome: 'Observacao', descricao: 'ler o simbolo certo no ambiente', grau: 'simples' },
  { id: 'multiandar', nome: 'Pista de outro andar', descricao: 'juntar dois pedacos de codigo achados antes', grau: 'profundo' },
];

const FAMILIA_POR_ID = new Map(FAMILIAS.map((f) => [f.id, f]));

export function buscarFamilia(id: unknown): DefinicaoFamilia | null {
  return typeof id === 'string' ? (FAMILIA_POR_ID.get(id as FamiliaEnigma) ?? null) : null;
}

/**
 * GRAU efetivo: o da familia, subido um degrau nos capitulos 4 e 5.
 *
 * E o que produz a curva da Parte 20 sem uma tabela de cinquenta graus escrita a
 * mao: a mesma familia de alavancas pede tres passos no andar 6 e quatro no 48.
 */
export function grauDoEnigma(andar: number): 'simples' | 'intermediario' | 'profundo' {
  const def = buscarAndar(andar);
  const familia = buscarFamilia(def?.enigma);
  if (!familia) return 'simples';
  const cap = capituloDoAndar(andar).numero;
  const escada: ('simples' | 'intermediario' | 'profundo')[] = ['simples', 'intermediario', 'profundo'];
  const base = escada.indexOf(familia.grau);
  // A curva da Parte 17, em degrau de capitulo em vez de tabela de 150 graus:
  // do capitulo 4 em diante a familia sobe um degrau, e do 8 (andar 71) em
  // diante sobe dois. E o que faz a mesma familia de alavancas pedir tres
  // passos no andar 6, quatro no 48 e cinco no 138.
  const degrau = cap >= 8 ? 2 : cap >= 4 ? 1 : 0;
  return escada[Math.min(2, base + degrau)];
}

// ------------------------------------------------------------- vocabulario --
const ALAVANCAS = ['Drenagem', 'Iluminacao', 'Ventilacao', 'Exaustao', 'Reserva', 'Recalque'];
const BARRAMENTOS = ['Barramento norte', 'Barramento sul', 'Barramento leste', 'Barramento oeste'];
const VALVULAS = ['Alivio', 'Bypass', 'Servico', 'Retorno', 'Emergencia'];
const PARES_DE_CABO = [
  'Marrom com preto',
  'Azul com cinza',
  'Verde com amarelo',
  'Vermelho com laranja',
  'Branco com violeta',
];
const SIMBOLOS = [
  'Triangulo com raio',
  'Circulo com gota',
  'Quadrado com chama',
  'Losango com engrenagem',
  'Hexagono com seta',
];
const PESOS = ['Contrapeso de chumbo', 'Trava mecanica', 'Calco de madeira', 'Grampo hidraulico'];
const PARTIDA = ['Excitatriz', 'Campo', 'Sincronismo', 'Carga', 'Regulador'];

// ------------------------------------------------------------- resultado --
/** Uma PISTA: o texto que vai virar documento de exame num andar. */
export interface PistaDeEnigma {
  /** em que andar o documento fica */
  andar: number;
  /** id do aviso (chave em ITENS_DE_LEITURA) */
  id: string;
  linhas: readonly string[];
}

export interface EnigmaDoAndar {
  andar: number;
  familia: FamiliaEnigma;
  painel: PainelRepresa;
  pistas: readonly PistaDeEnigma[];
  /** true quando este enigma trava a DESCIDA pro andar seguinte */
  travaDescida: boolean;
}

/** Flag que o painel do andar liga. */
export const flagDoEnigma = (andar: number): string =>
  `represaEnigma${String(andar).padStart(2, '0')}`;

/** id do painel do andar, usado no objeto do tilemap. */
export const idDoPainel = (andar: number): string => `enigma_${String(andar).padStart(2, '0')}`;

/** id do documento de pista do andar. */
export const idDaPista = (andar: number): string => `pista_${String(andar).padStart(2, '0')}`;

/**
 * A cada cinco andares o enigma trava a descida. O andar 50 nao trava nada:
 * abaixo dele nao ha nada nesta fase.
 */
export function travaDescida(andar: number): boolean {
  return andar % 5 === 0 && andar < ANDARES_TOTAIS;
}

/** Quantas tentativas base o grau da. */
const TENTATIVAS_POR_GRAU = { simples: 5, intermediario: 4, profundo: 3 } as const;

// -------------------------------------------------------------- geracao --
/**
 * O ENIGMA de um andar composto.
 *
 * Devolve `null` nos cinco primeiros: eles usam os sete paineis autorais da leva
 * anterior (`PAINEIS_REPRESA`), que continuam valendo palavra por palavra.
 */
export function gerarEnigma(andar: number): EnigmaDoAndar | null {
  const def = buscarAndar(andar);
  if (!def || !def.enigma) return null;
  const familia = def.enigma as FamiliaEnigma;
  const grau = grauDoEnigma(andar);
  const trava = travaDescida(andar);
  const passos: PassoPainel[] = [];
  const pistas: PistaDeEnigma[] = [];
  const pista = (linhas: string[], noAndar = andar, id = idDaPista(noAndar)): void => {
    pistas.push({ andar: noAndar, id, linhas });
  };

  // Quantos passos o grau pede. E a curva da Parte 20 num lugar so.
  const tamanho = grau === 'simples' ? 3 : grau === 'intermediario' ? 4 : 4;

  switch (familia) {
    case 'alavancas': {
      const opcoes = escolherAlguns(ALAVANCAS, Math.min(ALAVANCAS.length, tamanho + 1), andar, 'al');
      const ordem = escolherAlguns(opcoes.map((_, i) => i), tamanho, andar, 'ord');
      passos.push({
        tipo: 'sequencia',
        pergunta: 'Acionar em que ordem?',
        opcoes,
        ordem,
      });
      pista([
        `PROCEDIMENTO DE RELIGAMENTO — quadro do andar ${andar}.`,
        `"Apos parada, acionar nesta ordem: ${ordem.map((i) => opcoes[i].toUpperCase()).join(', ')}."`,
        `"O que ficar de fora da lista permanece DESLIGADO. Quem acionar `
          + `${opcoes.filter((_, i) => !ordem.includes(i)).map((o) => o.toUpperCase()).join(' ou ')} `
          + `derruba o quadro inteiro."`,
      ]);
      break;
    }

    case 'roteamento': {
      const opcoes = [...BARRAMENTOS];
      const ordem = escolherAlguns(opcoes.map((_, i) => i), Math.min(tamanho, opcoes.length), andar, 'rot');
      passos.push({
        tipo: 'sequencia',
        pergunta: 'Fechar os barramentos em que ordem?',
        opcoes,
        ordem,
      });
      pista([
        `DIAGRAMA UNIFILAR — plastificado, preso no quadro do andar ${andar}.`,
        '"O fechamento e sempre do barramento mais carregado pro mais leve, e a carga desta '
          + 'secao esta anotada a lapis na lateral do diagrama."',
        `"Ordem de fechamento: ${ordem.map((i) => opcoes[i]).join(' -> ')}."`,
      ]);
      break;
    }

    case 'labirinto': {
      // Aqui o desafio e CHEGAR, nao responder: a alavanca fica no fundo do
      // labirinto e a pergunta e uma so.
      passos.push({
        tipo: 'escolha',
        pergunta: 'Destravar a comporta desta secao?',
        opcoes: ['Destravar', 'Deixar como esta'],
        correta: 0,
      });
      pista([
        `MAPA DA SECAO — chapa de aluminio na parede, andar ${andar}.`,
        '"A malha desta secao nao segue o projeto. Siga a cor do tubo: o AZUL vai pro fundo, '
          + 'o VERMELHO volta pra escada."',
        '"A alavanca de comporta esta no fim do ramal azul, sozinha, numa reentrancia."',
      ]);
      break;
    }

    case 'terminal': {
      const digitos = grau === 'profundo' ? 4 : 3;
      let codigo = '';
      for (let i = 0; i < digitos; i++) codigo += String(dado(andar, `cod${i}`, 10));
      passos.push({
        tipo: 'codigo',
        pergunta: `Codigo de manutencao (${digitos} digitos)`,
        codigo,
      });
      pista([
        `TERMINAL DE OPERACAO — andar ${andar}. A tela pede senha de manutencao.`,
        `Colado na moldura, um papel amarelado: "senha de manutencao desta secao: ${codigo}".`,
        '"Trocar a senha exige o sistema no ar, e o sistema nao esta no ar. Deixamos assim."',
      ]);
      break;
    }

    case 'valvulas': {
      const opcoes = [...VALVULAS];
      const ordem = escolherAlguns([0, 1, 2, 3], Math.min(tamanho - 1, 3), andar, 'val');
      const liberacao = String(10 + dado(andar, 'lib', 89));
      passos.push({
        tipo: 'sequencia',
        pergunta: 'Sequencia das valvulas?',
        opcoes,
        ordem,
      });
      passos.push({
        tipo: 'codigo',
        pergunta: 'Codigo de liberacao (2 digitos)',
        codigo: liberacao,
      });
      pista([
        `PROCEDIMENTO DE COMPORTA — folha plastificada, andar ${andar}.`,
        `"Somente com a pressao em queda, e nesta ordem: ${ordem.map((i) => opcoes[i]).join(', ')}."`,
        `"A ${opcoes[4]} nao entra na sequencia — quem a abre trava a mesa."`,
        `No rodape, impresso: "Liberacao: ${liberacao}".`,
      ]);
      break;
    }

    case 'circuito': {
      const opcoes = escolherAlguns(PARES_DE_CABO, 4, andar, 'cab');
      const correta = dado(andar, 'cabok', opcoes.length);
      passos.push({
        tipo: 'escolha',
        pergunta: 'Qual par religa o comando desta secao?',
        opcoes,
        correta,
      });
      pista([
        `LEGENDA DE CABEAMENTO — placa parafusada na parede, andar ${andar}.`,
        `"COMANDO desta secao: ${opcoes[correta]}. O resto e forca, terra ou sinal de teste."`,
        '"Quem fecha comando em par de forca queima o contator, e nao ha contator de reposicao."',
      ]);
      break;
    }

    case 'pressao': {
      const opcoes = escolherAlguns(PESOS, 4, andar, 'peso');
      const ordem = escolherAlguns([0, 1, 2, 3], 2, andar, 'pord');
      const correta = dado(andar, 'pok', opcoes.length);
      passos.push({
        tipo: 'sequencia',
        pergunta: 'Escorar a comporta com o que, e em que ordem?',
        opcoes,
        ordem,
      });
      passos.push({
        tipo: 'escolha',
        pergunta: 'O que sustenta a pressao no fim?',
        opcoes,
        correta,
      });
      pista([
        `ORDEM DE SERVICO — andar ${andar}, presa num prego.`,
        `"Comporta emperrada. Escorar com ${ordem.map((i) => opcoes[i]).join(' e depois ')}, `
          + 'nessa ordem, senao ela desce em cima da mao de quem esta embaixo."',
        `"Quem sustenta a pressao no fim e o ${opcoes[correta].toLowerCase()}. O resto e so escora."`,
      ]);
      break;
    }

    case 'temporizado': {
      const opcoes = [...PARTIDA];
      const ordem = escolherAlguns([0, 1, 2, 3, 4], 3, andar, 'tmp');
      passos.push({
        tipo: 'sequencia',
        pergunta: 'Partida em vazio — ordem, e rapido',
        opcoes,
        ordem,
        // 9 s pra tres passos. O prazo existe pra a resposta nao poder ser
        // procurada NO MEIO do painel: da pra ler o documento antes e nao
        // durante.
        limiteMs: 9000,
      });
      pista([
        `DIARIO DE OPERACAO — bancada do andar ${andar}, letra apressada.`,
        `"Partida em vazio, sempre nesta ordem: ${ordem.map((i) => opcoes[i]).join(', ')}."`,
        '"A janela e curta: passando de dez segundos o disjuntor de campo abre e tem de comecar '
          + 'tudo de novo. Decore antes de encostar na mesa."',
      ]);
      break;
    }

    case 'multiandar': {
      // Metade do codigo aqui, metade num andar JA VISITADO. A pista de tras
      // fica sempre num andar anterior de mesma paridade, pra o jogador nunca
      // depender de descer PRIMEIRO pra resolver o de cima.
      const metadeA = String(10 + dado(andar, 'mA', 89));
      const metadeB = String(10 + dado(andar, 'mB', 89));
      const anterior = Math.max(1, andar - 6);
      passos.push({
        tipo: 'codigo',
        pergunta: 'Codigo de arquivo (4 digitos)',
        codigo: `${metadeA}${metadeB}`,
      });
      pista([
        `ARQUIVO LACRADO — andar ${andar}. A fechadura pede quatro digitos.`,
        `Etiqueta na tampa: "codigo = numero do lote (andar ${anterior}) seguido do numero da `
          + `caixa". O numero da caixa esta impresso aqui: ${metadeB}.`,
        '"O numero do lote nao fica junto do arquivo. Nunca ficou."',
      ]);
      pista(
        [
          `ETIQUETA DE LOTE — colada num engradado do andar ${anterior}.`,
          `"LOTE ${metadeA} — destino: arquivo do andar ${andar}."`,
          'A tinta esta clara, mas os dois digitos dao pra ler.',
        ],
        anterior,
        `lote_${String(andar).padStart(2, '0')}`,
      );
      break;
    }

    case 'observacao': {
      const opcoes = escolherAlguns(SIMBOLOS, 4, andar, 'sim');
      const correta = dado(andar, 'simok', opcoes.length);
      passos.push({
        tipo: 'escolha',
        pergunta: 'Qual simbolo abre esta trava?',
        opcoes,
        correta,
      });
      pista([
        `PLACA DE ADVERTENCIA — andar ${andar}, na parede ao lado da trava.`,
        `"A trava desta secao usa o simbolo de ${opcoes[correta].toLowerCase()}. Os outros tres `
          + 'sao de agua de servico, de extintor e de ferramentaria."',
        '"Nao confunda outra vez."',
      ]);
      break;
    }
  }

  const familiaDef = buscarFamilia(familia);
  const painel: PainelRepresa = {
    id: idDoPainel(andar),
    setor: def.mapa,
    nome: `${familiaDef?.nome ?? 'Painel'} — ${def.rotulo}`,
    grau,
    abertura: trava
      ? 'O alcapao do andar de baixo esta travado por este painel. Nao ha outro caminho.'
      : 'Um painel de servico ao lado de um armario lacrado. O que ele abre nao e a saida.',
    conclusao: trava
      ? 'A trava do alcapao cede com um estalo longo. Da pra descer.'
      : 'O armario destrava. Dentro ha o que sobrou do estoque desta secao.',
    passos,
    flag: flagDoEnigma(andar),
    tentativas: TENTATIVAS_POR_GRAU[grau],
  };

  return { andar, familia, painel, pistas, travaDescida: trava };
}

/** Todos os enigmas dos andares compostos, na ordem dos andares. */
export const ENIGMAS: readonly EnigmaDoAndar[] = ANDARES.map((a) => gerarEnigma(a.andar)).filter(
  (e): e is EnigmaDoAndar => e !== null,
);

const ENIGMA_POR_ANDAR = new Map(ENIGMAS.map((e) => [e.andar, e]));

export function enigmaDoAndar(andar: unknown): EnigmaDoAndar | null {
  return typeof andar === 'number' ? (ENIGMA_POR_ANDAR.get(andar) ?? null) : null;
}

/**
 * TODAS as pistas, agrupadas pelo andar em que o documento fica. E o que o
 * gerador de tilemap usa pra saber quantos documentos por andar, e o que
 * `avisos.ts` usa pra registrar o texto de cada um.
 */
export const PISTAS_POR_ANDAR: ReadonlyMap<number, readonly PistaDeEnigma[]> = (() => {
  const mapa = new Map<number, PistaDeEnigma[]>();
  for (const e of ENIGMAS) {
    for (const p of e.pistas) {
      const lista = mapa.get(p.andar) ?? [];
      lista.push(p);
      mapa.set(p.andar, lista);
    }
  }
  return mapa;
})();

/**
 * Todo texto de pista, por id de aviso. Entra em `ITENS_DE_LEITURA` junto dos
 * documentos escritos a mao — pro jogo e pra conferencia, uma pista gerada e um
 * documento como qualquer outro.
 */
export const TEXTOS_DE_PISTA: Record<string, string[]> = (() => {
  const saida: Record<string, string[]> = {};
  for (const e of ENIGMAS) {
    for (const p of e.pistas) {
      if (saida[p.id]) throw new Error(`[enigmas] pista com id repetido: "${p.id}"`);
      saida[p.id] = [...p.linhas];
    }
  }
  return saida;
})();

/**
 * A RESPOSTA de um enigma em forma de texto, pra a conferencia poder cobrar que
 * ela esteja escrita em algum documento alcancavel. Uma entrada por passo.
 */
export function respostasDoEnigma(e: EnigmaDoAndar): { rotulo: string; texto: string }[] {
  const saida: { rotulo: string; texto: string }[] = [];
  for (const passo of e.painel.passos) {
    if (passo.tipo === 'escolha') {
      saida.push({ rotulo: passo.pergunta, texto: passo.opcoes[passo.correta] });
    } else if (passo.tipo === 'sequencia') {
      for (const i of passo.ordem) saida.push({ rotulo: passo.pergunta, texto: passo.opcoes[i] });
    } else if (passo.tipo === 'codigo') {
      saida.push({ rotulo: passo.pergunta, texto: passo.codigo });
    }
  }
  return saida;
}

/** Ids de ficha e de pista de um andar — o que o gerador poe como documento. */
export function documentosDoAndar(andar: number): { id: string; aviso: string }[] {
  const saida = [{ id: `ficha_${String(andar).padStart(3, '0')}`, aviso: idDaFicha(andar) }];
  for (const p of PISTAS_POR_ANDAR.get(andar) ?? []) saida.push({ id: p.id, aviso: p.id });
  return saida;
}

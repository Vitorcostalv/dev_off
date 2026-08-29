import { APARELHOS } from './aparelhos.ts';
import { NPCS } from './npcs.ts';

/**
 * Quadro de vagas do app Trabalho.
 *
 * ---------------------------------------------------------------------------
 * DINHEIRO
 * ---------------------------------------------------------------------------
 * Nenhuma funcao deste arquivo escreve saldo. Quem paga e o app, chamando
 * `estado.carteira.ganhar(centavos)` — a mesma porta unica que a loja usa pra
 * gastar. Aqui so se CALCULA quanto vale, e o calculo e puro.
 *
 * ---------------------------------------------------------------------------
 * COMO O QUADRO E GERADO — geracao leve deterministica por dia
 * ---------------------------------------------------------------------------
 * Havia duas opcoes: um punhado de vagas fixas, ou geracao por dia. Ficou a
 * segunda, na versao mais simples que ainda da variedade:
 *
 *   - o catalogo de MODELOS abaixo e fixo e escrito a mao (12 modelos);
 *   - a cada dia, `quadroDoDia(dia)` escolhe 5 deles com um embaralhamento
 *     semeado pelo proprio dia, garantindo pelo menos um de cada tipo;
 *   - o destino de uma entrega tambem sai do mesmo sorteio.
 *
 * O resultado e deterministico: o mesmo dia da o mesmo quadro em qualquer
 * maquina e em qualquer reload, sem `Math.random` e sem precisar guardar o
 * quadro no save. Fechar o jogo e voltar no mesmo dia devolve as mesmas vagas.
 * O que PRECISA ser salvo e so o que o jogador ja fez (ver `SistemaTrabalhos`).
 */

export type TipoTrabalho = 'entrega' | 'codigo' | 'conserto';
export type Dificuldade = 'facil' | 'media' | 'dificil';

export const NOME_DE_TIPO: Record<TipoTrabalho, string> = {
  entrega: 'Entrega',
  codigo: 'Codigo',
  conserto: 'Conserto',
};

export const NOME_DE_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'Facil',
  media: 'Media',
  dificil: 'Dificil',
};

interface ModeloDeVaga {
  id: string;
  tipo: TipoTrabalho;
  titulo: string;
  descricao: string;
  cliente: string;
  dificuldade: Dificuldade;
  /** em CENTAVOS */
  recompensa: number;
  /** so `conserto`: id em APARELHOS */
  aparelho?: string;
}

/**
 * Os 12 modelos. As recompensas ficam entre R$ 40 e R$ 320 de proposito: o
 * saldo inicial e R$ 200 e o eletronico mais barato da DevStore custa R$ 19,90,
 * entao um dia de trabalho compra acessorio, e juntar pra um notebook
 * (R$ 1.500) leva bastante tempo. E o mesmo espirito da faixa de precos.
 */
const MODELOS: readonly ModeloDeVaga[] = [
  // --- entrega ---
  {
    id: 'entrega_encomenda',
    tipo: 'entrega',
    titulo: 'Levar uma encomenda',
    descricao: 'A transportadora deixou no lugar errado. Alguem tem que levar ate a porta.',
    cliente: 'Transportadora',
    dificuldade: 'facil',
    recompensa: 6500,
  },
  {
    id: 'entrega_remedio',
    tipo: 'entrega',
    titulo: 'Entregar remedio',
    descricao: 'Receita pronta esperando desde ontem. O cliente nao pode vir buscar.',
    cliente: 'Farmacia Central',
    dificuldade: 'facil',
    recompensa: 5500,
  },
  {
    id: 'entrega_peca',
    tipo: 'entrega',
    titulo: 'Levar peca de reposicao',
    descricao: 'Chegou a peca que faltava. Precisa chegar hoje.',
    cliente: 'Assistencia Tecnica',
    dificuldade: 'media',
    recompensa: 9000,
  },
  {
    id: 'entrega_mercado',
    tipo: 'entrega',
    titulo: 'Compras do mercado',
    descricao: 'Sacola pesada, cliente sem carro. Nao pode virar o dia.',
    cliente: 'Mercado',
    dificuldade: 'media',
    recompensa: 8000,
  },
  // --- codigo ---
  {
    id: 'codigo_landing',
    tipo: 'codigo',
    titulo: 'Terminar uma landing page',
    descricao: 'O freela anterior sumiu no meio. Falta fechar um trecho.',
    cliente: 'Padaria do Ze',
    dificuldade: 'facil',
    recompensa: 7500,
  },
  {
    id: 'codigo_script',
    tipo: 'codigo',
    titulo: 'Consertar um script quebrado',
    descricao: 'Parou de rodar depois de uma edicao apressada.',
    cliente: 'Academia',
    dificuldade: 'media',
    recompensa: 14000,
  },
  {
    id: 'codigo_caixa',
    tipo: 'codigo',
    titulo: 'Ajuste no sistema de caixa',
    descricao: 'O total sai errado quando o carrinho esta vazio.',
    cliente: 'Mercado',
    dificuldade: 'media',
    recompensa: 16000,
  },
  {
    id: 'codigo_api',
    tipo: 'codigo',
    titulo: 'Integracao com a API do fornecedor',
    descricao: 'Ninguem na equipe mexe com assincrono. Voce mexe.',
    cliente: 'Distribuidora',
    dificuldade: 'dificil',
    recompensa: 32000,
  },
  // --- conserto ---
  {
    id: 'conserto_celular',
    tipo: 'conserto',
    titulo: 'Celular nao liga',
    descricao: 'Caiu na pia. Secou, mas nao voltou.',
    cliente: 'Vizinho do 2',
    dificuldade: 'facil',
    recompensa: 8500,
    aparelho: 'celular',
  },
  {
    id: 'conserto_console',
    tipo: 'conserto',
    titulo: 'Portatil antigo sem imagem',
    descricao: 'Guardado ha quinze anos numa gaveta. Merece uma chance.',
    cliente: 'Colecionador',
    dificuldade: 'media',
    recompensa: 15000,
    aparelho: 'console',
  },
  {
    id: 'conserto_notebook',
    tipo: 'conserto',
    titulo: 'Notebook superaquecendo',
    descricao: 'Desliga sozinho depois de vinte minutos.',
    cliente: 'Escritorio',
    dificuldade: 'media',
    recompensa: 18000,
    aparelho: 'notebook',
  },
  {
    id: 'conserto_notebook_pro',
    tipo: 'conserto',
    titulo: 'Notebook que nao da video',
    descricao: 'Liga, faz barulho, tela preta. Trabalho de gente que sabe.',
    cliente: 'Estudio',
    dificuldade: 'dificil',
    recompensa: 28000,
    aparelho: 'notebook',
  },
];

/** Uma vaga do quadro de hoje: o modelo mais o que foi sorteado pro dia. */
export interface Vaga extends ModeloDeVaga {
  /** so `entrega`: chave do mapa de destino */
  destino?: string;
  /** so `entrega`: quem recebe, pro texto da vaga */
  moradorDestino?: string;
}

/**
 * Destinos possiveis de entrega: as moradias que TEM morador.
 *
 * `casa_6` fica de fora de proposito — ela existe no mapa e conta como moradia,
 * mas ninguem mora nela hoje (ver NPCS em npcs.ts). Entregar numa casa vazia
 * seria falar sozinho na porta, entao a lista sai dos NPCs, nao de MORADIAS: no
 * dia em que casa_6 ganhar um morador, ela entra aqui sozinha.
 */
export const DESTINOS_DE_ENTREGA: readonly { mapa: string; morador: string }[] = Object.values(
  NPCS,
)
  .filter((npc) => npc.casa !== 'casa_1') // a casa do proprio jogador nao vale
  .map((npc) => ({ mapa: npc.casa, morador: npc.nome }));

// ------------------------------------------------------------- sorteio --
/** Hash inteiro -> [0,1). Mesma avalanche do `hash01Texto` de itens.ts. */
function hash01(n: number, semente: number): number {
  let h = Math.imul(n ^ semente, 0x01000193);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const SEMENTE_QUADRO = 20260901;

/** Quantas vagas o quadro mostra por dia. */
export const VAGAS_POR_DIA = 5;

/**
 * O quadro de um dia. Deterministico: mesmo dia, mesmas vagas.
 *
 * Garante pelo menos uma vaga de cada tipo antes de completar as vagas
 * restantes — senao um dia poderia sair so com entrega, e o jogador que quer
 * jogar o minigame de conserto ficaria esperando o dia virar.
 */
export function quadroDoDia(dia: number): Vaga[] {
  const escolhidas: ModeloDeVaga[] = [];
  const usados = new Set<string>();

  const sortearDe = (candidatos: readonly ModeloDeVaga[], passo: number): void => {
    const livres = candidatos.filter((m) => !usados.has(m.id));
    if (livres.length === 0) return;
    const i = Math.floor(hash01(dia * 31 + passo, SEMENTE_QUADRO) * livres.length);
    const escolhido = livres[Math.min(i, livres.length - 1)];
    usados.add(escolhido.id);
    escolhidas.push(escolhido);
  };

  const tipos: TipoTrabalho[] = ['entrega', 'codigo', 'conserto'];
  tipos.forEach((tipo, i) => sortearDe(MODELOS.filter((m) => m.tipo === tipo), i));
  for (let i = escolhidas.length; i < VAGAS_POR_DIA; i++) sortearDe(MODELOS, 10 + i);

  // ordena por tipo e depois por recompensa, pra a lista nao dancar entre dias
  const ordem: Record<TipoTrabalho, number> = { entrega: 0, codigo: 1, conserto: 2 };
  escolhidas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || a.recompensa - b.recompensa);

  return escolhidas.map((modelo, i) => {
    if (modelo.tipo !== 'entrega') return { ...modelo };
    const d =
      DESTINOS_DE_ENTREGA[
        Math.floor(hash01(dia * 97 + i, SEMENTE_QUADRO + 1) * DESTINOS_DE_ENTREGA.length) %
          DESTINOS_DE_ENTREGA.length
      ];
    return { ...modelo, destino: d.mapa, moradorDestino: d.morador };
  });
}

// --------------------------------------------------- regras de pagamento --
/**
 * CODIGO — acerto paga cheio, ERRO PAGA ZERO.
 *
 * A alternativa (metade por errar) foi descartada com a conta na mao: sao 4
 * alternativas, entao chutar valeria 0,25 x cheio + 0,75 x metade = 62,5% do
 * que vale acertar. Com esse numero nao ha motivo pra ler o codigo — chutar
 * rapido varias vezes rende mais que pensar. Com zero, chutar vale 25%, e saber
 * a resposta passa a ser a jogada boa.
 *
 * A vaga NAO some ao errar: ela continua no quadro do dia e pode ser refeita.
 * O custo do erro e o tempo, nao a perda da vaga.
 */
export function pagamentoDeCodigo(vaga: Vaga, acertou: boolean): number {
  return acertou ? vaga.recompensa : 0;
}

/**
 * CONSERTO — pagamento PROPORCIONAL aos passos acertados.
 *
 * Aqui a conta e outra: a sequencia tem de 4 a 7 passos e 4 botoes, entao a
 * chance de chutar a sequencia inteira e no maximo 1/256. Proporcional nao
 * premia chute, e reconhece que quem acertou 5 de 7 passos realmente trabalhou
 * — diferente da pergunta unica do codigo, em que "trabalho parcial" nao
 * existe.
 */
export function pagamentoDeConserto(vaga: Vaga, acertos: number, total: number): number {
  if (total <= 0) return 0;
  if (acertos >= total) return vaga.recompensa;
  return Math.floor((vaga.recompensa * acertos) / total);
}

// -------------------------------------------------------- minigame: codigo --
export interface Pergunta {
  /** trecho com `___` no lugar da lacuna */
  codigo: string;
  enunciado: string;
  opcoes: readonly string[];
  /** indice em `opcoes` */
  correta: number;
  explicacao: string;
}

/**
 * Banco de perguntas, em dificuldade crescente. O protagonista e dev, entao sao
 * de sintaxe de JS/TS mesmo — as primeiras valem pra quem nunca programou, as
 * ultimas pedem saber a diferenca entre coisas parecidas.
 *
 * A dificuldade da vaga escolhe a FATIA do banco (ver `perguntaDaVaga`), e a
 * pergunta dentro da fatia sai por sorteio deterministico do dia — o mesmo
 * mecanismo do quadro. Repetir a vaga no mesmo dia repete a pergunta; isso e
 * proposital, porque errar e tentar de novo deve exigir ter APRENDIDO, nao
 * esperar cair uma pergunta mais facil.
 */
export const PERGUNTAS: readonly Pergunta[] = [
  {
    codigo: "const nomes = ['ana', 'bia'];\nnomes.___('caio');",
    enunciado: 'Qual metodo acrescenta um item no FIM do array?',
    opcoes: ['push', 'add', 'append', 'insert'],
    correta: 0,
    explicacao: 'Em JavaScript o metodo e push. add e append sao de outras linguagens.',
  },
  {
    codigo: 'for (let i = 0; i ___ 10; i++) {\n  console.log(i);\n}',
    enunciado: 'O que faz o laco rodar de 0 a 9?',
    opcoes: ['<=', '<', '=<', '=='],
    correta: 1,
    explicacao: 'Com < 10 o laco para em 9. Com <= 10 ele rodaria 11 vezes.',
  },
  {
    codigo: 'const soma = (a, b) ___ a + b;',
    enunciado: 'Qual seta fecha uma arrow function?',
    opcoes: ['->', '=>', '::', ':'],
    correta: 1,
    explicacao: 'A arrow function usa =>. A seta -> e de outras linguagens.',
  },
  {
    codigo: "const total = itens.___((soma, i) => soma + i.preco, 0);",
    enunciado: 'Qual metodo reduz o array a um valor unico?',
    opcoes: ['map', 'filter', 'reduce', 'forEach'],
    correta: 2,
    explicacao: 'reduce acumula os itens num valor so; map e filter devolvem arrays.',
  },
  {
    codigo: 'const dobrados = numeros.___(n => n * 2);',
    enunciado: 'Qual metodo devolve um array NOVO com cada item transformado?',
    opcoes: ['forEach', 'map', 'find', 'some'],
    correta: 1,
    explicacao: 'map devolve o array novo. forEach percorre e devolve undefined.',
  },
  {
    codigo: "if (idade ___ '18') {\n  liberar();\n}",
    enunciado: 'Qual comparacao NAO converte tipo antes de comparar?',
    opcoes: ['==', '===', '=', '~='],
    correta: 1,
    explicacao: "=== compara valor E tipo. Com == o numero 18 seria igual a string '18'.",
  },
  {
    codigo: 'const copia = [___lista, novo];',
    enunciado: 'O que copia os itens de `lista` para dentro do array novo?',
    opcoes: ['...', '..', '*', '&'],
    correta: 0,
    explicacao: 'O spread (...) espalha os itens. Sem ele, lista entraria como um item so.',
  },
  {
    codigo: 'const grandes = numeros.___(n => n > 100);',
    enunciado: 'Qual metodo devolve SO os itens que passam no teste?',
    opcoes: ['map', 'every', 'filter', 'sort'],
    correta: 2,
    explicacao: 'filter devolve o subconjunto; every devolve true/false.',
  },
  {
    codigo: 'function preco(v: ___): string {\n  return v.toFixed(2);\n}',
    enunciado: 'Que tipo do TypeScript aceita 19.9 e tem toFixed?',
    opcoes: ['string', 'number', 'int', 'float'],
    correta: 1,
    explicacao: 'TypeScript tem number para todo numero; int e float nao existem.',
  },
  {
    codigo: 'async function buscar() {\n  const r = ___ fetch(url);\n}',
    enunciado: 'O que espera a promessa terminar dentro de uma funcao async?',
    opcoes: ['yield', 'await', 'wait', 'async'],
    correta: 1,
    explicacao: 'await pausa ate a promessa resolver. yield e de generator.',
  },
  {
    codigo: 'const porta = config.porta ___ 3000;',
    enunciado: 'Qual operador usa 3000 SO quando porta e null ou undefined?',
    opcoes: ['||', '??', '&&', '?.'],
    correta: 1,
    explicacao: '?? so cai no padrao com null/undefined. || tambem cairia com 0.',
  },
];

/** Quantas perguntas cada dificuldade sorteia, da mais facil pra mais dificil. */
const FATIA_POR_DIFICULDADE: Record<Dificuldade, readonly [number, number]> = {
  facil: [0, 4],
  media: [3, 8],
  dificil: [7, PERGUNTAS.length],
};

export function perguntaDaVaga(vaga: Vaga, dia: number): Pergunta {
  const [ini, fim] = FATIA_POR_DIFICULDADE[vaga.dificuldade];
  const fatia = PERGUNTAS.slice(ini, fim);
  const i = Math.floor(hash01(dia * 13 + vaga.id.length, SEMENTE_QUADRO + 2) * fatia.length);
  return fatia[Math.min(i, fatia.length - 1)];
}

// ------------------------------------------------------ minigame: conserto --
/** Tamanho da sequencia e tempo por passo, por dificuldade. */
export const CONSERTO_POR_DIFICULDADE: Record<
  Dificuldade,
  { passos: number; msPorPasso: number }
> = {
  facil: { passos: 4, msPorPasso: 2600 },
  media: { passos: 6, msPorPasso: 2200 },
  dificil: { passos: 7, msPorPasso: 1800 },
};

/**
 * A sequencia de pecas a repetir. Deterministica por (vaga, dia): reabrir a
 * mesma vaga no mesmo dia da a mesma sequencia, entao errar e tentar de novo
 * cobra memoria, nao sorte.
 */
export function sequenciaDoConserto(vaga: Vaga, dia: number): number[] {
  const aparelho = APARELHOS.find((a) => a.id === vaga.aparelho);
  const total = aparelho ? aparelho.pecas.length : 4;
  const { passos } = CONSERTO_POR_DIFICULDADE[vaga.dificuldade];
  const seq: number[] = [];
  for (let i = 0; i < passos; i++) {
    seq.push(Math.floor(hash01(dia * 7919 + i * 131 + vaga.id.length, SEMENTE_QUADRO + 3) * total) % total);
  }
  return seq;
}

// ------------------------------------------------------------- estado --
/** Entrega aceita e ainda nao concluida. So existe uma por vez. */
export interface EntregaAtiva {
  idVaga: string;
  titulo: string;
  /** chave do mapa de destino */
  destino: string;
  morador: string;
  /** em CENTAVOS */
  recompensa: number;
  /** dia em que foi aceita, so pra mostrar na tela */
  dia: number;
}

/**
 * O que o jogador ja fez. E o unico pedaco de trabalho que precisa ir pro save:
 * o quadro em si e derivado do dia (ver `quadroDoDia`).
 *
 * So UMA entrega por vez, de proposito: a encomenda ocupa slot de inventario e
 * o destino aparece na tela; duas ao mesmo tempo exigiriam escolher qual
 * entregar em cada porta, e isso e complexidade sem graca nenhuma.
 */
export class SistemaTrabalhos {
  entrega: EntregaAtiva | null = null;
  /** chaves `${dia}:${idVaga}` — some sozinho quando o dia vira */
  private feitos = new Set<string>();

  private chave(dia: number, idVaga: string): string {
    return `${dia}:${idVaga}`;
  }

  concluida(dia: number, idVaga: string): boolean {
    return this.feitos.has(this.chave(dia, idVaga));
  }

  marcarConcluida(dia: number, idVaga: string): void {
    this.feitos.add(this.chave(dia, idVaga));
  }

  serializar(): { entrega: EntregaAtiva | null; feitos: string[] } {
    return { entrega: this.entrega ? { ...this.entrega } : null, feitos: [...this.feitos] };
  }

  restaurar(bruto: unknown): void {
    this.entrega = null;
    this.feitos = new Set();
    const d = bruto as { entrega?: Partial<EntregaAtiva>; feitos?: unknown } | undefined;
    if (Array.isArray(d?.feitos)) {
      for (const f of d.feitos) if (typeof f === 'string') this.feitos.add(f);
    }
    const e = d?.entrega;
    const recompensa = Number(e?.recompensa);
    if (
      e &&
      typeof e.idVaga === 'string' &&
      typeof e.destino === 'string' &&
      Number.isSafeInteger(recompensa) &&
      recompensa > 0
    ) {
      this.entrega = {
        idVaga: e.idVaga,
        titulo: typeof e.titulo === 'string' ? e.titulo : 'Entrega',
        destino: e.destino,
        morador: typeof e.morador === 'string' ? e.morador : 'morador',
        recompensa,
        dia: Number.isFinite(e.dia) ? Number(e.dia) : 0,
      };
    }
  }
}

/** Id do item de encomenda que a vaga de entrega poe no inventario. */
export const ITEM_ENCOMENDA = 'encomenda';

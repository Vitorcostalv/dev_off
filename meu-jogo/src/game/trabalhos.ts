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
  {
    id: 'codigo_relatorio',
    tipo: 'codigo',
    titulo: 'Relatorio que nao fecha',
    descricao: 'Some um centavo no total e ninguem descobre onde.',
    cliente: 'Contabilidade',
    dificuldade: 'dificil',
    recompensa: 22000,
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
  /** Conserto narrativo iniciado em dialogo; nao pertence ao quadro diario. */
  missaoNpcId?: string;
  /** so `entrega`: chave do mapa de destino */
  destino?: string;
  /** so `entrega`: quem recebe, pro texto da vaga */
  moradorDestino?: string;
  /** so `entrega`: id do NPC que recebe a entrega (pra bonus de relacao) */
  npcDestino?: string;
  /**
   * so `codigo`: quantas perguntas esta vaga tem HOJE, de 1 a 5. Sai de
   * `etapasDeCodigo` (ver la a regra), nao do modelo — o mesmo modelo pode ter
   * numero de etapas diferente em dias diferentes.
   *
   * 1 etapa  = acerto paga cheio, erro paga zero.
   * 2-5      = pagamento PROPORCIONAL aos acertos.
   */
  etapas?: number;
}

/**
 * Destinos possiveis de entrega: as moradias que TEM morador.
 *
 * `casa_6` fica de fora de proposito — ela existe no mapa e conta como moradia,
 * mas ninguem mora nela hoje (ver NPCS em npcs.ts). Entregar numa casa vazia
 * seria falar sozinho na porta, entao a lista sai dos NPCs, nao de MORADIAS: no
 * dia em que casa_6 ganhar um morador, ela entra aqui sozinha.
 */
export const DESTINOS_DE_ENTREGA: readonly { npcId: string; mapa: string; morador: string }[] = Object.values(
  NPCS,
)
  // a casa do protagonista nao entra: ela nao e casa de NPC nenhum desde que
  // ele mudou pro lote `oficina` do Mapa 2
  // um destino por PORTA: quem divide teto (Luke com a mae, Vitor com o irmao)
  // fica de fora, senao o mesmo endereco apareceria duas vezes no quadro com
  // nomes diferentes e a entrega viraria loteria de qual dos dois atende
  .filter((npc) => !npc.compartilhaCasa)
  .map((npc) => ({ npcId: npc.id, mapa: npc.casa, morador: npc.nome }));

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

/** Piso de recompensa (em CENTAVOS) de cada numero de etapas. */
const FAIXA_DE_ETAPAS: readonly { minimo: number; etapas: number }[] = [
  { minimo: 25000, etapas: 5 },
  { minimo: 19000, etapas: 4 },
  { minimo: 15000, etapas: 3 },
  { minimo: 10000, etapas: 2 },
  { minimo: 0, etapas: 1 },
];

/** Quantas etapas o banco consegue servir sem repetir pergunta. */
export const MAX_ETAPAS_CODIGO = 5;

/**
 * Quantas perguntas uma vaga de codigo tem hoje: de 1 a 5, CORRELACIONADO com a
 * recompensa — quem paga mais cobra mais etapas.
 *
 * A faixa da recompensa da o piso; um sorteio deterministico por (vaga, dia)
 * pode somar uma etapa a mais, pra a mesma vaga nao ser sempre identica. Vaga
 * barata fica travada em 1 etapa: e ela que segura a regra de tudo-ou-nada,
 * que so faz sentido com pergunta unica.
 */
export function etapasDeCodigo(recompensa: number, idVaga: string, dia: number): number {
  const base = FAIXA_DE_ETAPAS.find((f) => recompensa >= f.minimo)?.etapas ?? 1;
  if (base <= 1) return 1;
  const extra = hash01(dia * 53 + idVaga.length, SEMENTE_QUADRO + 4) < 0.4 ? 1 : 0;
  return Math.min(MAX_ETAPAS_CODIGO, base + extra);
}

/**
 * O quadro de um dia. Deterministico: mesmo dia, mesmas vagas.
 *
 * Garante pelo menos uma vaga de cada tipo antes de completar as vagas
 * restantes — senao um dia poderia sair so com entrega, e o jogador que quer
 * jogar o minigame de conserto ficaria esperando o dia virar.
 */
/**
 * `extras` vem da REPUTACAO da oficina (ver game/oficina.ts): quem e procurado
 * recebe ate duas vagas a mais no mesmo quadro. Zero por padrao, e o quadro
 * continua identico ao de antes pra quem ainda nao trabalhou na cidade.
 */
export function quadroDoDia(dia: number, extras = 0): Vaga[] {
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
  const total = VAGAS_POR_DIA + Math.max(0, Math.min(2, Math.trunc(extras)));
  for (let i = escolhidas.length; i < total; i++) sortearDe(MODELOS, 10 + i);

  // ordena por tipo e depois por recompensa, pra a lista nao dancar entre dias
  const ordem: Record<TipoTrabalho, number> = { entrega: 0, codigo: 1, conserto: 2 };
  escolhidas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || a.recompensa - b.recompensa);

  return escolhidas.map((modelo, i) => {
    const vaga = { ...modelo };
    
    // entrega: sorteia destino
    if (modelo.tipo === 'entrega') {
      const d =
        DESTINOS_DE_ENTREGA[
          Math.floor(hash01(dia * 97 + i, SEMENTE_QUADRO + 1) * DESTINOS_DE_ENTREGA.length) %
            DESTINOS_DE_ENTREGA.length
        ];
      return { ...vaga, destino: d.mapa, moradorDestino: d.morador, npcDestino: d.npcId };
    }
    
    // codigo: o numero de etapas sai da recompensa (ver `etapasDeCodigo`)
    if (modelo.tipo === 'codigo') {
      return { ...vaga, etapas: etapasDeCodigo(modelo.recompensa, modelo.id, dia) };
    }

    return vaga;
  });
}

// --------------------------------------------------- regras de pagamento --
/**
 * CODIGO DE UMA ETAPA — acerto paga cheio, ERRO PAGA ZERO.
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
 * CODIGO DE 2 A 5 ETAPAS — pagamento PROPORCIONAL aos acertos.
 *
 * REGRA DIFERENTE DA DE CIMA, de proposito. Com uma pergunta so, "trabalho
 * parcial" nao existe: ou leu o codigo ou chutou. Com cinco perguntas
 * DIFERENTES, acertar tres e um resultado de verdade — chutar as cinco rende
 * 25% em media, ler e acertar tres rende 60%, e ai vale a pena ler.
 *
 * Errar uma etapa NAO encerra a vaga: o jogador responde todas e recebe o
 * proporcional no fim. E o mesmo principio ja validado no conserto.
 */
export function pagamentoDeCodigoMultiEtapas(vaga: Vaga, acertos: number, total: number): number {
  if (total <= 0) return 0;
  if (acertos >= total) return vaga.recompensa;
  return Math.floor((vaga.recompensa * acertos) / total);
}

/**
 * A porta unica de pagamento de uma vaga de codigo: escolhe a regra pelo numero
 * de etapas em vez de deixar cada chamador lembrar qual das duas usar. Foi
 * exatamente esse esquecimento que fez as vagas multi-etapa pagarem zero.
 */
export function pagamentoDeVagaDeCodigo(vaga: Vaga, acertos: number, total: number): number {
  if (total <= 1) return pagamentoDeCodigo(vaga, acertos >= 1);
  return pagamentoDeCodigoMultiEtapas(vaga, acertos, total);
}

/**
 * CONSERTO — pagamento PROPORCIONAL as pecas encaixadas.
 *
 * Cada peca so encaixa no proprio slot, entao nao ha chute que valha: arrastar
 * a peca errada devolve ela pra bandeja e custa tempo. Proporcional reconhece
 * quem encaixou 3 de 4 antes de o tempo acabar.
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
 * A dificuldade da vaga escolhe a FATIA do banco (ver `fatiaDeDificuldade`), e
 * as perguntas dentro da fatia saem por sorteio deterministico do dia — o mesmo
 * mecanismo do quadro. Repetir a vaga no mesmo dia repete as perguntas; isso e
 * proposital, porque errar e tentar de novo deve exigir ter APRENDIDO, nao
 * esperar cair uma pergunta mais facil.
 *
 * Uma vaga de 5 etapas precisa de 5 perguntas DIFERENTES, entao cada fatia tem
 * de ter pelo menos `MAX_ETAPAS_CODIGO` entradas — o verificador cobra isso.
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
  // --- perguntas adicionais para vagas multi-etapas ---
  {
    codigo: 'const { nome, idade } ___ usuario;',
    enunciado: 'Qual operador extrai propriedades de um objeto?',
    opcoes: ['<-', '=', ':', '...'],
    correta: 1,
    explicacao: 'A desestruturacao usa = com chaves. : e sintaxe de tipo, ... e spread.',
  },
  {
    codigo: 'const resultado = valor ___ null ? valor : padrao;',
    enunciado: 'Qual operador implementa a condicao "se for null, use padrao"?',
    opcoes: ['??', '||', '&&', '?:'],
    correta: 0,
    explicacao: '?? e o operador de nullish coalescing. || tambem funciona mas e menos preciso.',
  },
  {
    codigo: 'let x;\nif (valor) {\n  x = valor;\n} else {\n  x = 0;\n}\nlet y = valor ___ 0;',
    enunciado: 'Qual operador ternario faz a mesma coisa?',
    opcoes: ['? :', ': ?', '? ?', ': :'],
    correta: 0,
    explicacao: 'O operador ternario e condicao ? verdade : falso.',
  },
  {
    codigo: 'const nomes = lista.___(p => p.nome);',
    enunciado: 'Qual metodo extrai uma propriedade de cada item do array?',
    opcoes: ['select', 'extract', 'map', 'find'],
    correta: 2,
    explicacao: 'map transforma cada item; select e sintaxe de outras linguagens.',
  },
  {
    codigo: 'const existe = itens.___(i => i.id === 5);',
    enunciado: 'Qual metodo devolve true se ALGUM item passar no teste?',
    opcoes: ['some', 'any', 'exists', 'includes'],
    correta: 0,
    explicacao: 'some devolve boolean. includes procura valor, nao teste; every quer TODOS.',
  },
  {
    codigo: 'const tudoCerto = itens.___(i => i.valido);',
    enunciado: 'Qual metodo devolve true SO se TODOS os itens passam no teste?',
    opcoes: ['every', 'all', 'each', 'some'],
    correta: 0,
    explicacao: 'every quer todos. some basta um; all nao existe em JS.',
  },
  {
    codigo: 'const texto = "javascript";\nconst subst = texto.___(0, 4);',
    enunciado: 'Qual metodo pega um pedaco de uma string?',
    opcoes: ['slice', 'substr', 'substring', 'cut'],
    correta: 0,
    explicacao: 'slice(inicio, fim) e o jeito moderno. substr e deprecated.',
  },
  {
    codigo: 'const obj = {};\nobj.___ = "valor";\nconsole.log(obj.chave);',
    enunciado: 'O que vai no espaco para acessar a propriedade "chave" dinamicamente?',
    opcoes: ['chave', '"chave"', "'chave'", '[\'chave\']'],
    correta: 3,
    explicacao: 'Notacao entre colchetes permite propriedade dinamica.',
  },
  {
    codigo: 'class Animal {\n  ___ mover() { }\n}\nclass Cachorro ___ Animal { }',
    enunciado: 'Qual palavra herda metodos da classe pai?',
    opcoes: ['inherits', 'extends', 'super', 'parent'],
    correta: 1,
    explicacao: 'extends faz heranca em JS/TS. super chama metodo do pai.',
  },
  {
    codigo: 'const dados = JSON.___(jsonString);',
    enunciado: 'Qual funcao converte uma string JSON num objeto?',
    opcoes: ['parse', 'decode', 'read', 'load'],
    correta: 0,
    explicacao: 'parse traduz string JSON. stringify faz o inverso.',
  },
  {
    codigo: 'const nomes = ["alice", "bruno"];\nconst maiusculas = nomes.___().map(n => n.toUpperCase());',
    enunciado: 'Qual metodo faz uma copia do array sem alterar o original?',
    opcoes: ['copy', 'slice', 'clone', 'dup'],
    correta: 1,
    explicacao: 'slice() sem argumentos cria uma copia. assignment apenas copia a referencia.',
  },
];

/**
 * Fatia do banco por dificuldade. Cada fatia precisa ter pelo menos
 * `MAX_ETAPAS_CODIGO` perguntas, senao uma vaga de 5 etapas nao teria como
 * montar 5 perguntas DIFERENTES — `verificar-relacoes` confere isso.
 */
const FATIA_POR_DIFICULDADE: Record<Dificuldade, readonly [number, number]> = {
  facil: [0, 6],
  media: [4, 12],
  dificil: [10, PERGUNTAS.length],
};

/** A fatia de perguntas de uma dificuldade. */
export function fatiaDeDificuldade(dificuldade: Dificuldade): readonly Pergunta[] {
  const [ini, fim] = FATIA_POR_DIFICULDADE[dificuldade];
  return PERGUNTAS.slice(ini, fim);
}

/**
 * As perguntas de uma vaga de codigo, na ordem em que serao feitas.
 *
 * SEM REPETICAO dentro da mesma vaga: a escolha vai puxando da fatia e riscando
 * o que ja saiu. Repetir a mesma pergunta numa vaga de 5 etapas transformaria
 * a vaga em "acerte uma, acerte todas".
 *
 * Deterministica por (vaga, dia), igual ao resto: refazer a vaga no mesmo dia
 * traz as mesmas perguntas na mesma ordem, entao tentar de novo cobra ter
 * APRENDIDO — nao esperar cair uma pergunta mais facil.
 */
export function perguntasDaVaga(vaga: Vaga, dia: number): Pergunta[] {
  const fatia = fatiaDeDificuldade(vaga.dificuldade);
  const quantas = Math.max(1, Math.min(vaga.etapas ?? 1, fatia.length));
  const restantes = [...fatia];
  const escolhidas: Pergunta[] = [];
  for (let i = 0; i < quantas && restantes.length > 0; i++) {
    const k = Math.floor(hash01(dia * 13 + vaga.id.length + i * 977, SEMENTE_QUADRO + 2) * restantes.length);
    escolhidas.push(restantes.splice(Math.min(k, restantes.length - 1), 1)[0]);
  }
  return escolhidas;
}

// ------------------------------------------------------ minigame: conserto --
/**
 * Dificuldade do quebra-cabeca de conserto.
 *
 * Escala por NUMERO DE PECAS e por TEMPO. Cada aparelho do catalogo tem quatro
 * componentes, entao `pecas` e um teto: `facil` usa tres dos quatro e sobra
 * tempo; `dificil` usa os quatro com bem menos tempo. Quando um aparelho com
 * mais componentes entrar em `APARELHOS`, os numeros aqui sobem sozinhos ate o
 * tamanho do aparelho — `pecasDoConserto` corta pelo menor dos dois.
 */
export const CONSERTO_POR_DIFICULDADE: Record<
  Dificuldade,
  { pecas: number; segundos: number }
> = {
  facil: { pecas: 3, segundos: 45 },
  media: { pecas: 4, segundos: 40 },
  dificil: { pecas: 5, segundos: 30 },
};

/**
 * Quais componentes do aparelho entram no quebra-cabeca de hoje, na ordem em
 * que os slots aparecem na tela.
 *
 * SEM REPETICAO — e esta a diferenca pro minigame de sequencia que existia
 * antes. Naquele, o mesmo componente podia sair duas vezes; num quebra-cabeca
 * de encaixe isso deixa o tabuleiro IMPOSSIVEL, porque a peca ja encaixada nao
 * pode ser arrastada de novo pro segundo slot.
 *
 * Deterministica por (vaga, dia): a mesma vaga no mesmo dia monta o mesmo
 * tabuleiro.
 */
export function pecasDoConserto(vaga: Vaga, dia: number): number[] {
  const aparelho = APARELHOS.find((a) => a.id === vaga.aparelho);
  const total = aparelho ? aparelho.pecas.length : 0;
  if (total === 0) return [];
  const quantas = Math.min(CONSERTO_POR_DIFICULDADE[vaga.dificuldade].pecas, total);

  const restantes = Array.from({ length: total }, (_, i) => i);
  const escolhidas: number[] = [];
  for (let i = 0; i < quantas; i++) {
    const k = Math.floor(
      hash01(dia * 7919 + i * 131 + vaga.id.length, SEMENTE_QUADRO + 3) * restantes.length,
    );
    escolhidas.push(restantes.splice(Math.min(k, restantes.length - 1), 1)[0]);
  }
  return escolhidas;
}

// ------------------------------------------------- peca de reposicao --
/**
 * A PECA DE REPOSICAO do conserto: a ponte que faltava entre a sucata da usina
 * e o trabalho da cidade.
 *
 * O simulador de equilibrio mediu o problema: as cinco pecas COMUNS de sucata
 * (ferro-velho, parafusos, cabo velho, fio de cobre, conector danificado) valem
 * de R$ 1,60 a R$ 5,60 na revenda, e nao servem pra mais nada. Uma descida nos
 * dez primeiros andares — que sortea justamente essas — rendia R$ 158, cinco
 * vezes menos que um dia de quadro. O raso da usina era pedagio de historia, nao
 * um lugar onde se ganha algo.
 *
 * Agora um conserto COMPLETO aceita uma dessas pecas como reposicao: ela sai do
 * inventario e o pagamento vem com `BONUS_DE_REPOSICAO` a mais. E o unico lugar
 * do jogo onde uma peca comum vale mais guardada que vendida — vinte por cento
 * de uma vaga de conserto e muito mais que os R$ 3,36 do sucateiro.
 *
 * O bonus NAO E OBRIGATORIO, e isso e a regra: quem nunca desceu na usina
 * trabalha igual, recebe o pagamento cheio do conserto e nao ve mensagem de
 * falta. Um requisito aqui travaria o app Trabalho atras da represa.
 *
 * So no conserto COMPLETO: a peca que sobrou de um conserto pela metade nao
 * consertou nada, e consumir o material de quem errou seria cobrar duas vezes.
 */
export const PECAS_DE_REPOSICAO: readonly string[] = [
  'ferro_velho',
  'parafusos',
  'cabo_velho',
  'fio_de_cobre',
  'conector_danificado',
];

/** Quanto o pagamento sobe com a peca de reposicao. */
export const BONUS_DE_REPOSICAO = 0.2;

/**
 * A peca de reposicao a consumir e o bonus que ela rende, ou `null` quando o
 * conserto nao esta completo ou o jogador nao tem nenhuma das pecas.
 *
 * Recebe uma FUNCAO de contagem em vez do inventario: e o que deixa a conferencia
 * offline rodar as combinacoes sem montar um inventario de verdade, e o que
 * impede este modulo de importar `inventario.ts`.
 */
export function reposicaoDoConserto(
  vaga: Vaga,
  acertos: number,
  total: number,
  contar: (itemId: string) => number,
): { itemId: string; bonus: number } | null {
  if (total <= 0 || acertos < total) return null;
  const itemId = PECAS_DE_REPOSICAO.find((id) => contar(id) > 0);
  if (!itemId) return null;
  const bonus = Math.round(pagamentoDeConserto(vaga, acertos, total) * BONUS_DE_REPOSICAO);
  return bonus > 0 ? { itemId, bonus } : null;
}

/** Tempo total, em ms, do quebra-cabeca de uma vaga. */
export function tempoDoConserto(vaga: Vaga): number {
  return CONSERTO_POR_DIFICULDADE[vaga.dificuldade].segundos * 1000;
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
  /** id do NPC que recebe (pra bonus de relacao) */
  npcId?: string;
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
  aoConcluir?: (id: string) => void;
  entrega: EntregaAtiva | null = null;

  /**
   * Larga a entrega em andamento sem pagar nada.
   *
   * Existe pra o jogador nunca ficar preso: a entrega so e concluida na porta
   * do destino COM a encomenda em maos, entao uma encomenda perdida (por um
   * save antigo, por um bug, por qualquer caminho que tire o item) travava o
   * sistema inteiro — a porta nao completava e o app recusava aceitar outra
   * vaga. Cancelar nao devolve nada nem marca a vaga como feita: ela volta pro
   * quadro do dia e pode ser aceita de novo.
   */
  cancelarEntrega(): EntregaAtiva | null {
    const largada = this.entrega;
    this.entrega = null;
    return largada;
  }
  /** chaves `${dia}:${idVaga}` — some sozinho quando o dia vira */
  private feitos = new Set<string>();

  private chave(dia: number, idVaga: string): string {
    return `${dia}:${idVaga}`;
  }

  concluida(dia: number, idVaga: string): boolean {
    return this.feitos.has(this.chave(dia, idVaga));
  }

  marcarConcluida(dia: number, idVaga: string): void {
    if (this.concluida(dia, idVaga)) return;
    this.feitos.add(this.chave(dia, idVaga));
    this.aoConcluir?.(idVaga);
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
        // sem isto o bonus de relacao da entrega sumia ao salvar e recarregar:
        // a entrega voltava sem dono e a porta pagava so o dinheiro
        npcId: typeof e.npcId === 'string' ? e.npcId : undefined,
      };
    }
  }
}

/** Id do item de encomenda que a vaga de entrega poe no inventario. */
export const ITEM_ENCOMENDA = 'encomenda';

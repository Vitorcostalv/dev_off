/**
 * Conversa por TEMA.
 *
 * Falar com um NPC deixou de ser uma fala fixa: a linha de abertura dele
 * (`DefinicaoNpc.dialogoAtual`) continua sendo a primeira coisa que aparece, e
 * logo depois abre um menu com 3 a 4 temas. O jogador escolhe um, o NPC
 * responde no tom dele, e a escolha mexe no relacionamento.
 *
 * ---------------------------------------------------------------------------
 * REACAO
 * ---------------------------------------------------------------------------
 *   gosta      +0,5
 *   neutro      0
 *   nao_gosta  -1,0
 *
 * A assimetria e de proposito: agradar e devagar, desagradar e rapido. Sem ela
 * o jogador varreria a lista inteira de temas sem custo ate achar o bom.
 *
 * ---------------------------------------------------------------------------
 * LIMITE DIARIO
 * ---------------------------------------------------------------------------
 * So a PRIMEIRA escolha de tema do dia com cada NPC pontua. A trava esta em
 * `SistemaRelacoes.podeConversar`, porque ela precisa ir pro save. Depois dela,
 * falar de novo continua mostrando a resposta do tema (o texto e conteudo, nao
 * recompensa) — o que nao acontece de novo e a pontuacao.
 *
 * ---------------------------------------------------------------------------
 * QUAIS TEMAS APARECEM
 * ---------------------------------------------------------------------------
 * `temasDoDia` sorteia 3-4 dos temas do NPC com semente do dia — o mesmo
 * mecanismo deterministico do quadro de vagas. Nem todo tema aparece todo dia,
 * entao pegar o tema bom do NPC tem um pouco de espera, e o jogador que ja
 * conhece as preferencias ainda tem o que fazer. Mesmo dia, mesmos temas.
 *
 * As familias que ainda nao tem NPC nem sprite (a irma do Edu, o marido e o
 * filho da Jaqueline, a esposa falecida do Wendel, a filha da Alice) aparecem
 * SO como mencao nas falas. Nenhuma delas vira personagem aqui.
 */

export type ReacaoTema = 'gosta' | 'neutro' | 'nao_gosta';

/** Pontos de relacionamento por reacao ao tema. */
export const PONTOS_POR_REACAO: Record<ReacaoTema, number> = {
  gosta: 0.5,
  neutro: 0,
  nao_gosta: -1.0,
};

export interface TemaDeConversa {
  /** unico dentro do NPC */
  id: string;
  /** o que o JOGADOR diz — e o que aparece no menu */
  rotulo: string;
  reacao: ReacaoTema;
  /** resposta do NPC, uma ou mais falas em sequencia */
  falas: readonly string[];
}

/** Quantos temas o menu mostra por dia. */
export const TEMAS_VISIVEIS = { min: 3, max: 4 } as const;

/**
 * Tabela de temas por NPC. Escrita a partir do perfil de cada personagem:
 * o que ele gosta de conversar, o que passa batido e o que fecha a cara.
 */
export const TEMAS_POR_NPC: Record<string, readonly TemaDeConversa[]> = {
  // ------------------------------------------------------------------ EDU --
  // Observador silencioso. Comenta pouco, mas comenta bem. Trabalho e neutro:
  // ele tem emprego estavel e nao e o assunto que o interessa.
  edu: [
    {
      id: 'cidade',
      rotulo: 'Reparou em alguma coisa na rua hoje?',
      reacao: 'gosta',
      falas: [
        'Reparei. A padaria abre a persiana sempre no mesmo minuto.',
        'Eu ando bastante. Depois de um tempo a cidade fica previsivel, e ai o que sai do padrao pula na cara.',
      ],
    },
    {
      id: 'tecnologia',
      rotulo: 'Viu aquele lancamento novo?',
      reacao: 'gosta',
      falas: [
        'Vi. Especificacao boa, preco de piada.',
        'Mas gostei da ideia por tras. Isso e o que importa.',
      ],
    },
    {
      id: 'caminhada',
      rotulo: 'Voce anda muito por ai, ne?',
      reacao: 'gosta',
      falas: [
        'Ando. Fico ruim parado dentro de casa.',
        'Nao e exercicio nem nada. E so... andar.',
      ],
    },
    {
      id: 'trabalho',
      rotulo: 'Como esta o trabalho?',
      reacao: 'neutro',
      falas: [
        'Estavel. Entrego, recebo, ninguem reclama.',
        'Nao tem muito o que contar, pra ser honesto.',
      ],
    },
    {
      id: 'irma',
      rotulo: 'Sua irma anda te visitando?',
      reacao: 'neutro',
      falas: [
        'Ela liga. Diz que eu deveria sair mais.',
        'Eu saio. Ela nao acredita.',
      ],
    },
    {
      id: 'problemas',
      rotulo: 'Tem alguma coisa te incomodando?',
      reacao: 'nao_gosta',
      falas: [
        '...',
        'Nao. Tudo certo.',
        'Vamos falar de outra coisa.',
      ],
    },
    {
      id: 'decisao',
      rotulo: 'Voce precisa decidir isso logo.',
      reacao: 'nao_gosta',
      falas: [
        'Precisa por que?',
        'Eu decido quando estiver pronto.',
      ],
    },
  ],

  // ----------------------------------------------------------------- MARI --
  // Direta, competitiva, energetica. Insegura sobre o futuro, mas nao admite.
  mari: [
    {
      id: 'treino',
      rotulo: 'Como foi o treino hoje?',
      reacao: 'gosta',
      falas: [
        'Pesado. Do jeito que tem que ser.',
        'Terceiro mes sem falhar um dia. Anota ai.',
      ],
    },
    {
      id: 'metas',
      rotulo: 'Qual e a sua proxima meta?',
      reacao: 'gosta',
      falas: [
        'Agora? Bater o meu proprio numero. So isso.',
        'Meta que depende de outra pessoa nao e meta, e torcida.',
      ],
    },
    {
      id: 'desafio',
      rotulo: 'Aposto que eu aguento mais que voce.',
      reacao: 'gosta',
      falas: [
        'Ha! Fala isso de novo depois de vinte minutos de esteira.',
        'Serio, marca um dia. Eu quero ver.',
      ],
    },
    {
      id: 'academia',
      rotulo: 'A academia esta cheia?',
      reacao: 'neutro',
      falas: [
        'Segunda enche, quarta esvazia. Sempre igual.',
        'Melhor pra mim.',
      ],
    },
    {
      id: 'leticia',
      rotulo: 'E a Leticia, como esta?',
      reacao: 'neutro',
      falas: [
        'Andando por ai, como sempre.',
        'Ela e boa gente. So precisava de um rumo.',
      ],
    },
    {
      id: 'preguica',
      rotulo: 'Hoje eu nao faria nada, so descansar.',
      reacao: 'nao_gosta',
      falas: [
        'Descansar e uma coisa. Desistir e outra.',
        'Voce falou como quem ja desistiu.',
      ],
    },
    {
      id: 'comparacao',
      rotulo: 'O pessoal da academia treina mais pesado que voce.',
      reacao: 'nao_gosta',
      falas: [
        'Treina, e?',
        'Entao me traz o numero deles. Eu bato.',
        '...deixa pra la.',
      ],
    },
  ],

  // ------------------------------------------------------------ JAQUELINE --
  // Fala demais, puxa assunto, sabe tudo pelo caixa. Mas o que e serio ela
  // guarda — e nao gosta nem um pouco de ser cutucada pra soltar.
  jaqueline: [
    {
      id: 'fofoca',
      rotulo: 'Me conta a novidade do mercado.',
      reacao: 'gosta',
      falas: [
        'Ai, voce nao vai acreditar. Passou aqui gente comprando bolo as sete da manha.',
        'Sete! Da manha! Eu quase perguntei, mas me segurei.',
        'Quase.',
      ],
    },
    {
      id: 'familia',
      rotulo: 'Como esta a familia?',
      reacao: 'gosta',
      falas: [
        'O meu marido pegou estrada de novo, volta quinta. Ou sexta, depende do carregamento.',
        'E o menino ta com doze e ja acha que sabe tudo. Puxou ao pai.',
      ],
    },
    {
      id: 'bairro',
      rotulo: 'O bairro mudou muito nesses anos?',
      reacao: 'gosta',
      falas: [
        'Mudou! Aqui na frente era so terreno.',
        'Eu trabalho nesse caixa ha tempo suficiente pra ver crianca virar gente grande.',
      ],
    },
    {
      id: 'precos',
      rotulo: 'Os precos subiram?',
      reacao: 'neutro',
      falas: [
        'Subiu o que vem de fora. O resto ta igual.',
        'Se quiser eu te aviso quando descer.',
      ],
    },
    {
      id: 'alice',
      rotulo: 'Voce e a Alice se falam bastante.',
      reacao: 'neutro',
      falas: [
        'Toda sexta. Ela vem comigo fazer as compras dela.',
        'Ela e sincera demais, aquela mulher. Eu gosto.',
      ],
    },
    {
      id: 'segredo',
      rotulo: 'Voce sabe o que aconteceu de verdade, ne? Conta.',
      reacao: 'nao_gosta',
      falas: [
        'Olha... nao.',
        'Piada eu conto. Isso ai eu nao conto.',
        'E se um dia for sobre voce, voce vai querer que eu tenha calado.',
      ],
    },
    {
      id: 'seco',
      rotulo: 'Tanto faz.',
      reacao: 'nao_gosta',
      falas: [
        'Tanto faz?',
        'Nossa. Que animo.',
      ],
    },
  ],

  // -------------------------------------------------------------- LETICIA --
  // Tranquila, observadora, otima ouvinte. Emprego e o assunto que ela desvia.
  leticia: [
    {
      id: 'observar',
      rotulo: 'O que voce viu de interessante hoje?',
      reacao: 'gosta',
      falas: [
        'A sombra da arvore da praca chega no banco exatamente as duas da tarde.',
        'Todo dia. Da pra marcar hora nela.',
      ],
    },
    {
      id: 'natureza',
      rotulo: 'Tem passarinho por aqui?',
      reacao: 'gosta',
      falas: [
        'Tem tres tipos so nessa rua. Um deles voce so escuta, nunca ve.',
        'Eu passei um mes tentando. Nunca vi.',
      ],
    },
    {
      id: 'arte',
      rotulo: 'Voce ja pensou em fotografar isso?',
      reacao: 'gosta',
      falas: [
        'Pensei. Penso bastante, na verdade.',
        'E que a foto nunca fica com a mesma luz que eu vi. Mas um dia fica.',
      ],
    },
    {
      id: 'praca',
      rotulo: 'Voce fica muito na praca a tarde.',
      reacao: 'neutro',
      falas: [
        'Fico. Depois das uma o sol bate melhor daquele lado.',
        'E sempre passa alguem pra conversar.',
      ],
    },
    {
      id: 'mari',
      rotulo: 'Como e morar com a Mari?',
      reacao: 'neutro',
      falas: [
        'Barulhento. Ela acorda cedo e nao anda em silencio.',
        'Mas eu gosto. A casa fica viva.',
      ],
    },
    {
      id: 'emprego',
      rotulo: 'Voce ta trabalhando com o que agora?',
      reacao: 'nao_gosta',
      falas: [
        'Ah... nada fixo no momento.',
        'Olha o pessego naquela arvore ali, ja ta dando.',
      ],
    },
    {
      id: 'futuro',
      rotulo: 'E o que voce pretende fazer da vida?',
      reacao: 'nao_gosta',
      falas: [
        'Essa e a pergunta que todo mundo faz.',
        'Eu ainda nao tenho resposta boa. Desculpa.',
      ],
    },
  ],

  // --------------------------------------------------------------- WENDEL --
  // Formal, seco, organizado. Fechou depois que a esposa morreu. Fofoca e
  // pressa sao as duas coisas que ele nao tolera.
  wendel: [
    {
      id: 'organizacao',
      rotulo: 'A farmacia esta impecavel.',
      reacao: 'gosta',
      falas: [
        'Obrigado. Cada coisa tem um lugar, e o lugar nao muda.',
        'Quando muda, eu percebo no mesmo dia.',
      ],
    },
    {
      id: 'saude',
      rotulo: 'O que voce recomenda pra dormir melhor?',
      reacao: 'gosta',
      falas: [
        'Horario. Antes de qualquer coisa que se compre aqui, horario.',
        'Deite no mesmo horario por duas semanas. Se nao resolver, volte aqui.',
      ],
    },
    {
      id: 'responsabilidade',
      rotulo: 'Deve ser pesado responder por tudo sozinho.',
      reacao: 'gosta',
      falas: [
        '...E.',
        'Mas alguem tem que assinar embaixo. Prefiro que seja eu.',
        'Obrigado por perguntar. Poucos perguntam.',
      ],
    },
    {
      id: 'rotina',
      rotulo: 'Voce vai ao mercado toda quarta?',
      reacao: 'neutro',
      falas: [
        'Toda quarta, depois do almoco.',
        'A lista e a mesma ha anos. Funciona.',
      ],
    },
    {
      id: 'tempo',
      rotulo: 'Movimento bom hoje?',
      reacao: 'neutro',
      falas: [
        'Dentro do esperado pra um dia de semana.',
        'Precisa de alguma coisa?',
      ],
    },
    {
      id: 'fofoca',
      rotulo: 'Ouvi um boato sobre uma pessoa daqui...',
      reacao: 'nao_gosta',
      falas: [
        'Nao me conte.',
        'O que entra nesta farmacia nao sai. Vale pra receita e vale pra conversa.',
      ],
    },
    {
      id: 'pressa',
      rotulo: 'Da pra adiantar? Estou com pressa.',
      reacao: 'nao_gosta',
      falas: [
        'Nao da.',
        'Pressa e como se troca uma caixa pela outra. Eu prefiro conferir.',
      ],
    },
  ],

  // ---------------------------------------------------------------- ALICE --
  // Le gente melhor que ninguem. Direta, sarcastica. Odeia ser subestimada.
  alice: [
    {
      id: 'direto',
      rotulo: 'Vou ser direto com voce.',
      reacao: 'gosta',
      falas: [
        'Otimo. Odeio rodeio.',
        'Pode falar. Eu aguento.',
      ],
    },
    {
      id: 'fofoca',
      rotulo: 'Quem apareceu no bar essa semana?',
      reacao: 'gosta',
      falas: [
        'Gente demais e ninguem interessante. Fora um.',
        'Sentou no canto, pediu uma coisa so, e ficou duas horas olhando pro copo.',
        'Esses eu guardo na memoria.',
      ],
    },
    {
      id: 'conselho',
      rotulo: 'O que voce faria no meu lugar?',
      reacao: 'gosta',
      falas: [
        'No SEU lugar? Eu ja teria falado o que penso e aguentado o barulho depois.',
        'Sai mais barato que ficar remoendo. Confia em quem serve bebida pra cidade inteira.',
      ],
    },
    {
      id: 'bar',
      rotulo: 'Como foi o movimento hoje?',
      reacao: 'neutro',
      falas: [
        'Deu pra pagar as contas. E o que interessa.',
        'Sexta e outra historia.',
      ],
    },
    {
      id: 'filha',
      rotulo: 'Sua filha vem visitar?',
      reacao: 'neutro',
      falas: [
        'No feriado, se a faculdade deixar.',
        'Ela liga toda semana. E mais do que eu ligava pra minha mae, entao ta bom.',
      ],
    },
    {
      id: 'raso',
      rotulo: 'Entao... o tempo esta legal, ne?',
      reacao: 'nao_gosta',
      falas: [
        'O tempo.',
        'Serio, e isso? Voce tem assunto melhor que isso.',
      ],
    },
    {
      id: 'condescendencia',
      rotulo: 'Deve ser dificil tocar um bar sozinha, coitada.',
      reacao: 'nao_gosta',
      falas: [
        'Coitada.',
        'Meu bem, eu toco esse bar ha mais tempo do que muita gente aqui tem de idade.',
        'Guarda a pena pra quem precisa.',
      ],
    },
  ],

  // ----------------------------------------------------------- MORADOR_1 --
  // Placeholder sem perfil escrito: dois temas neutros so pra ele nao abrir um
  // menu vazio. Ganha tabela de verdade quando ganhar personagem.
  morador_1: [
    {
      id: 'clima',
      rotulo: 'Dia bonito hoje.',
      reacao: 'neutro',
      falas: ['E mesmo.', 'Bom pra sair um pouco.'],
    },
    {
      id: 'cidade',
      rotulo: 'Faz tempo que voce mora aqui?',
      reacao: 'neutro',
      falas: ['Faz um tempo.', 'E tranquilo por aqui.'],
    },
    {
      id: 'ajuda',
      rotulo: 'Precisa de alguma coisa?',
      reacao: 'neutro',
      falas: ['Por enquanto nao, obrigado.'],
    },
  ],
};

/** Hash inteiro -> [0,1). Mesma avalanche usada pelo quadro de vagas. */
function hash01(n: number, semente: number): number {
  let h = Math.imul(n ^ semente, 0x01000193);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const SEMENTE_TEMAS = 20260915;

/** Soma dos codigos do id — da um numero estavel por NPC pra semear o sorteio. */
function semeaDeTexto(texto: string): number {
  let n = 0;
  for (let i = 0; i < texto.length; i++) n = (n * 31 + texto.charCodeAt(i)) | 0;
  return n;
}

/**
 * Os temas disponiveis com este NPC HOJE: 3 ou 4 dos que ele tem, sorteados
 * com semente do dia. Deterministico — mesmo dia, mesmo menu.
 *
 * Garante pelo menos um tema de cada polaridade que o NPC tenha (gosta e
 * nao_gosta), senao um dia poderia sair so com temas neutros e a conversa
 * daquele dia nao teria escolha nenhuma pra fazer.
 */
export function temasDoDia(npcId: string, dia: number): TemaDeConversa[] {
  const todos = TEMAS_POR_NPC[npcId] ?? [];
  if (todos.length === 0) return [];

  const base = semeaDeTexto(npcId);
  const quantos = Math.min(
    todos.length,
    TEMAS_VISIVEIS.min + (hash01(dia * 17 + base, SEMENTE_TEMAS) < 0.5 ? 0 : 1),
  );

  const escolhidos: TemaDeConversa[] = [];
  const usados = new Set<string>();

  const puxar = (candidatos: readonly TemaDeConversa[], passo: number): void => {
    const livres = candidatos.filter((t) => !usados.has(t.id));
    if (livres.length === 0) return;
    const i = Math.floor(hash01(dia * 101 + base + passo * 7, SEMENTE_TEMAS + 1) * livres.length);
    const escolhido = livres[Math.min(i, livres.length - 1)];
    usados.add(escolhido.id);
    escolhidos.push(escolhido);
  };

  // uma de cada polaridade primeiro, o resto por sorteio livre
  puxar(todos.filter((t) => t.reacao === 'gosta'), 0);
  puxar(todos.filter((t) => t.reacao === 'nao_gosta'), 1);
  for (let i = escolhidos.length; i < quantos; i++) puxar(todos, 10 + i);

  // ordem estavel: a mesma da tabela, pra o menu nao dancar entre aberturas
  return escolhidos.sort((a, b) => todos.indexOf(a) - todos.indexOf(b));
}

export function buscarTema(npcId: string, temaId: string): TemaDeConversa | undefined {
  return (TEMAS_POR_NPC[npcId] ?? []).find((t) => t.id === temaId);
}

/**
 * A linha que o NPC solta quando o jogador ja conversou hoje. A resposta do
 * tema continua aparecendo depois desta — o que acabou foi a pontuacao, nao a
 * conversa.
 */
const JA_CONVERSOU: Record<string, string> = {
  edu: 'A gente ja falou hoje. Mas tudo bem.',
  mari: 'De novo? Ta bom, manda.',
  jaqueline: 'Voce de novo! Adoro. Fala.',
  leticia: 'Ja conversamos hoje, ne? Nao tem problema.',
  wendel: 'Ja conversamos hoje. Pois nao.',
  alice: 'Voce nao cansa, hein. Pode falar.',
};

export function falaJaConversou(npcId: string): string {
  return JA_CONVERSOU[npcId] ?? 'A gente ja conversou hoje.';
}

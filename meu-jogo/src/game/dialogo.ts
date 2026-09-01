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
  /**
   * As respostas possiveis do NPC, cada uma sendo uma sequencia de falas.
   *
   * Sao 2 ou 3 por tema pra a mesma escolha nao devolver sempre o mesmo texto —
   * o que fazia a conversa parecer um menu de FAQ depois da segunda visita. A
   * variacao e de FRASEADO, nao de conteudo: todas dizem a mesma coisa, no
   * mesmo humor. Quem escolhe qual sai e `falasDoTema`.
   */
  variacoes: readonly (readonly string[])[];
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
      variacoes: [
        [
          'Reparei. A padaria abre a persiana sempre no mesmo minuto.',
          'Eu ando bastante. Depois de um tempo a cidade fica previsivel, e ai o que sai do padrao pula na cara.',
        ],
        [
          'Reparei. Trocaram o toldo da farmacia e ninguem comentou.',
          'Essas coisas mudam devagar. Da pra ver se voce passar sempre.',
        ],
        [
          'Hoje tinha um caminhao parado na esquina desde cedo.',
          'Fiquei curioso. Nao perguntei.',
        ],
      ],
    },
    {
      id: 'tecnologia',
      rotulo: 'Viu aquele lancamento novo?',
      reacao: 'gosta',
      variacoes: [
        [
          'Vi. Especificacao boa, preco de piada.',
          'Mas gostei da ideia por tras. Isso e o que importa.',
        ],
        [
          'Li sobre. Parece resolver um problema que quase ninguem tem.',
          'Mas a engenharia e bonita, isso eu admito.',
        ],
        [
          'Vi, sim. Fiquei uns quarenta minutos lendo a documentacao.',
          'Nao vou comprar. So queria entender como fizeram.',
        ],
      ],
    },
    {
      id: 'caminhada',
      rotulo: 'Voce anda muito por ai, ne?',
      reacao: 'gosta',
      variacoes: [
        [
          'Ando. Fico ruim parado dentro de casa.',
          'Nao e exercicio nem nada. E so... andar.',
        ],
        [
          'Ando. E a unica hora do dia em que eu nao estou resolvendo nada.',
          'Acho que e por isso.',
        ],
      ],
    },
    {
      id: 'trabalho',
      rotulo: 'Como esta o trabalho?',
      reacao: 'neutro',
      variacoes: [
        [
          'Estavel. Entrego, recebo, ninguem reclama.',
          'Nao tem muito o que contar, pra ser honesto.',
        ],
        [
          'Vai indo. Entreguei o que tinha pra entregar.',
          'Proximo assunto?',
        ],
      ],
    },
    {
      id: 'irma',
      rotulo: 'Sua irma anda te visitando?',
      reacao: 'neutro',
      variacoes: [
        [
          'Ela liga. Diz que eu deveria sair mais.',
          'Eu saio. Ela nao acredita.',
        ],
        [
          'Mandou mensagem ontem. Perguntou se eu estava comendo direito.',
          'Eu respondi que sim. Ela nao acreditou nessa tambem.',
        ],
      ],
    },
    {
      id: 'problemas',
      rotulo: 'Tem alguma coisa te incomodando?',
      reacao: 'nao_gosta',
      variacoes: [
        [
          '...',
          'Nao. Tudo certo.',
          'Vamos falar de outra coisa.',
        ],
        [
          'Por que voce pergunta?',
          'Nao. Ta tudo bem.',
        ],
        [
          '...',
          'Prefiro nao.',
        ],
      ],
    },
    {
      id: 'decisao',
      rotulo: 'Voce precisa decidir isso logo.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Precisa por que?',
          'Eu decido quando estiver pronto.',
        ],
        [
          'Todo mundo acha que sabe a hora certa das minhas coisas.',
          'Eu vou resolver. No meu tempo.',
        ],
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
      variacoes: [
        [
          'Pesado. Do jeito que tem que ser.',
          'Terceiro mes sem falhar um dia. Anota ai.',
        ],
        [
          'Foi. Acordei antes do despertador de novo.',
          'Quando o corpo entra no ritmo, ele nem pergunta mais.',
        ],
        [
          'Perna hoje. Vou descer escada de lado ate amanha.',
          'Valeu cada segundo.',
        ],
      ],
    },
    {
      id: 'metas',
      rotulo: 'Qual e a sua proxima meta?',
      reacao: 'gosta',
      variacoes: [
        [
          'Agora? Bater o meu proprio numero. So isso.',
          'Meta que depende de outra pessoa nao e meta, e torcida.',
        ],
        [
          'Fechar o mes inteiro sem faltar. So isso, e ja e dificil.',
          'Meta grande demais e desculpa pra desistir na primeira semana.',
        ],
        [
          'Tenho um numero na cabeca. Nao vou falar ainda.',
          'Falo quando bater.',
        ],
      ],
    },
    {
      id: 'desafio',
      rotulo: 'Aposto que eu aguento mais que voce.',
      reacao: 'gosta',
      variacoes: [
        [
          'Ha! Fala isso de novo depois de vinte minutos de esteira.',
          'Serio, marca um dia. Eu quero ver.',
        ],
        [
          'Ah, e? Marca ai.',
          'Eu levo agua pros dois. Voce vai precisar.',
        ],
        [
          'Voce nao tem ideia do que ta falando. Eu adoro isso.',
          'Amanha, seis da manha. Aparece.',
        ],
      ],
    },
    {
      id: 'academia',
      rotulo: 'A academia esta cheia?',
      reacao: 'neutro',
      variacoes: [
        [
          'Segunda enche, quarta esvazia. Sempre igual.',
          'Melhor pra mim.',
        ],
        [
          'Ta na media. Ninguem atrapalha, ninguem ajuda.',
          'Do jeito que eu gosto.',
        ],
      ],
    },
    {
      id: 'leticia',
      rotulo: 'E a Leticia, como esta?',
      reacao: 'neutro',
      variacoes: [
        [
          'Andando por ai, como sempre.',
          'Ela e boa gente. So precisava de um rumo.',
        ],
        [
          'Ta bem. Acordou depois das dez, como sempre.',
          'Um dia ela acha o que quer fazer. Eu torco.',
        ],
      ],
    },
    {
      id: 'preguica',
      rotulo: 'Hoje eu nao faria nada, so descansar.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Descansar e uma coisa. Desistir e outra.',
          'Voce falou como quem ja desistiu.',
        ],
        [
          'Descanso e parte do treino. Isso nao e descanso, e fuga.',
          'Voce sabe a diferenca.',
        ],
        [
          'Fala isso na segunda e a semana inteira vai embora junto.',
          'Levanta.',
        ],
      ],
    },
    {
      id: 'comparacao',
      rotulo: 'O pessoal da academia treina mais pesado que voce.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Treina, e?',
          'Entao me traz o numero deles. Eu bato.',
          '...deixa pra la.',
        ],
        [
          'Interessante.',
          'Quer saber? Eu nem preciso responder isso.',
        ],
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
      variacoes: [
        [
          'Ai, voce nao vai acreditar. Passou aqui gente comprando bolo as sete da manha.',
          'Sete! Da manha! Eu quase perguntei, mas me segurei.',
          'Quase.',
        ],
        [
          'Ai, meu bem, hoje foi calmo. Calmo DEMAIS, o que ja e estranho.',
          'Quando ninguem aparece e porque tem coisa acontecendo em outro lugar.',
        ],
        [
          'Voce viu a fila de ontem? Deu a volta na prateleira de arroz.',
          'E tudo por causa de uma promocao que nem era tao boa assim.',
        ],
      ],
    },
    {
      id: 'familia',
      rotulo: 'Como esta a familia?',
      reacao: 'gosta',
      variacoes: [
        [
          'O meu marido pegou estrada de novo, volta quinta. Ou sexta, depende do carregamento.',
          'E o menino ta com doze e ja acha que sabe tudo. Puxou ao pai.',
        ],
        [
          'Tudo bem, gracas a Deus. O menino ta na fase de nao querer conversar.',
          'Eu falo por nos dois, entao a gente se equilibra.',
        ],
        [
          'O pai dele liga da estrada toda noite. Nem que seja um minuto.',
          'Isso eu acho bonito, viu.',
        ],
      ],
    },
    {
      id: 'bairro',
      rotulo: 'O bairro mudou muito nesses anos?',
      reacao: 'gosta',
      variacoes: [
        [
          'Mudou! Aqui na frente era so terreno.',
          'Eu trabalho nesse caixa ha tempo suficiente pra ver crianca virar gente grande.',
        ],
        [
          'Mudou e nao mudou. Predio novo, gente velha.',
          'As historias sao as mesmas, so trocam de dono.',
        ],
      ],
    },
    {
      id: 'precos',
      rotulo: 'Os precos subiram?',
      reacao: 'neutro',
      variacoes: [
        [
          'Subiu o que vem de fora. O resto ta igual.',
          'Se quiser eu te aviso quando descer.',
        ],
        [
          'Uns subiram, outros nem tanto. Depende do que voce leva.',
          'Me fala o que voce quer que eu te digo se vale.',
        ],
      ],
    },
    {
      id: 'alice',
      rotulo: 'Voce e a Alice se falam bastante.',
      reacao: 'neutro',
      variacoes: [
        [
          'Toda sexta. Ela vem comigo fazer as compras dela.',
          'Ela e sincera demais, aquela mulher. Eu gosto.',
        ],
        [
          'A gente se aguenta ha muito tempo. Isso ja e amizade.',
          'Ela finge que nao liga pra nada. Liga pra tudo.',
        ],
      ],
    },
    {
      id: 'segredo',
      rotulo: 'Voce sabe o que aconteceu de verdade, ne? Conta.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Olha... nao.',
          'Piada eu conto. Isso ai eu nao conto.',
          'E se um dia for sobre voce, voce vai querer que eu tenha calado.',
        ],
        [
          'Meu bem.',
          'Se eu contasse, voce ia rir hoje e desconfiar de mim pra sempre.',
          'Nao compensa pra nenhum dos dois.',
        ],
        [
          'Nao insiste, vai.',
          'Tem coisa que eu levo daqui pra casa e de casa pro tumulo.',
        ],
      ],
    },
    {
      id: 'seco',
      rotulo: 'Tanto faz.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Tanto faz?',
          'Nossa. Que animo.',
        ],
        [
          'Tanto faz e o que a gente diz quando cansou da conversa.',
          'Tudo bem, eu entendo. Mas doi um pouquinho.',
        ],
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
      variacoes: [
        [
          'A sombra da arvore da praca chega no banco exatamente as duas da tarde.',
          'Todo dia. Da pra marcar hora nela.',
        ],
        [
          'Um gato atravessou a praca tres vezes pelo mesmo caminho.',
          'Nao sei o que ele estava procurando. Espero que tenha achado.',
        ],
        [
          'A padaria acende a luz de tras antes da da frente.',
          'Nunca contei isso pra ninguem. E bobo, ne?',
        ],
      ],
    },
    {
      id: 'natureza',
      rotulo: 'Tem passarinho por aqui?',
      reacao: 'gosta',
      variacoes: [
        [
          'Tem tres tipos so nessa rua. Um deles voce so escuta, nunca ve.',
          'Eu passei um mes tentando. Nunca vi.',
        ],
        [
          'Depois da chuva eles ficam mais barulhentos. Ja reparou?',
          'E como se estivessem se contando quem sobrou.',
        ],
        [
          'Tem um ninho na calha da casa da esquina. Ninguem viu ainda.',
          'Eu vou fingir que tambem nao vi, pra ninguem mexer.',
        ],
      ],
    },
    {
      id: 'arte',
      rotulo: 'Voce ja pensou em fotografar isso?',
      reacao: 'gosta',
      variacoes: [
        [
          'Pensei. Penso bastante, na verdade.',
          'E que a foto nunca fica com a mesma luz que eu vi. Mas um dia fica.',
        ],
        [
          'Ja tentei. A foto sai certa e mesmo assim errada.',
          'Falta o cheiro, acho. Ou o barulho.',
        ],
        [
          'Penso todo dia. Um dia eu compro uma camera de verdade.',
          'Por enquanto eu guardo na cabeca.',
        ],
      ],
    },
    {
      id: 'praca',
      rotulo: 'Voce fica muito na praca a tarde.',
      reacao: 'neutro',
      variacoes: [
        [
          'Fico. Depois das uma o sol bate melhor daquele lado.',
          'E sempre passa alguem pra conversar.',
        ],
        [
          'Fico. Sento sempre no mesmo banco, o de baixo da arvore.',
          'Se o banco estiver ocupado eu espero. Nao tem pressa.',
        ],
      ],
    },
    {
      id: 'mari',
      rotulo: 'Como e morar com a Mari?',
      reacao: 'neutro',
      variacoes: [
        [
          'Barulhento. Ela acorda cedo e nao anda em silencio.',
          'Mas eu gosto. A casa fica viva.',
        ],
        [
          'Ela e melhor do que acha que e. So nao para pra perceber.',
          'Eu falo isso pra ela. Ela nao ouve.',
        ],
      ],
    },
    {
      id: 'emprego',
      rotulo: 'Voce ta trabalhando com o que agora?',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Ah... nada fixo no momento.',
          'Olha o pessego naquela arvore ali, ja ta dando.',
        ],
        [
          'Nada certo ainda.',
          'Olha, o vento virou. Vai chover antes das cinco, aposto.',
        ],
        [
          'Estou entre uma coisa e outra.',
          '...voce ja reparou nessa arvore? Ela e mais velha que a rua.',
        ],
      ],
    },
    {
      id: 'futuro',
      rotulo: 'E o que voce pretende fazer da vida?',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Essa e a pergunta que todo mundo faz.',
          'Eu ainda nao tenho resposta boa. Desculpa.',
        ],
        [
          'Nao sei. Sinceramente.',
          'As vezes acho que ninguem sabe e so eu que admito.',
        ],
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
      variacoes: [
        [
          'Obrigado. Cada coisa tem um lugar, e o lugar nao muda.',
          'Quando muda, eu percebo no mesmo dia.',
        ],
        [
          'Obrigado. Leva quinze minutos por dia e economiza uma hora por semana.',
          'Nao e mania. E conta.',
        ],
        [
          'E o unico jeito de eu confiar no que entrego pra alguem.',
          'Se eu nao sei onde esta, eu nao sei o que e.',
        ],
      ],
    },
    {
      id: 'saude',
      rotulo: 'O que voce recomenda pra dormir melhor?',
      reacao: 'gosta',
      variacoes: [
        [
          'Horario. Antes de qualquer coisa que se compre aqui, horario.',
          'Deite no mesmo horario por duas semanas. Se nao resolver, volte aqui.',
        ],
        [
          'Agua. Antes de qualquer coisa, agua.',
          'Metade do que me pedem aqui resolveria com agua e uma semana de horario.',
        ],
        [
          'Depende do motivo. Cansaco nao e a mesma coisa que insonia.',
          'Se quiser, me conte direito e eu te digo o que serve.',
        ],
      ],
    },
    {
      id: 'responsabilidade',
      rotulo: 'Deve ser pesado responder por tudo sozinho.',
      reacao: 'gosta',
      variacoes: [
        [
          '...E.',
          'Mas alguem tem que assinar embaixo. Prefiro que seja eu.',
          'Obrigado por perguntar. Poucos perguntam.',
        ],
        [
          'E. E pesado.',
          'Mas eu escolhi. E continuo escolhendo todo dia de manha.',
          'Obrigado por notar.',
        ],
      ],
    },
    {
      id: 'rotina',
      rotulo: 'Voce vai ao mercado toda quarta?',
      reacao: 'neutro',
      variacoes: [
        [
          'Toda quarta, depois do almoco.',
          'A lista e a mesma ha anos. Funciona.',
        ],
        [
          'Toda quarta. Se eu nao for na quarta, a semana inteira desanda.',
          'Ja tentei mudar uma vez. Nao gostei.',
        ],
      ],
    },
    {
      id: 'tempo',
      rotulo: 'Movimento bom hoje?',
      reacao: 'neutro',
      variacoes: [
        [
          'Dentro do esperado pra um dia de semana.',
          'Precisa de alguma coisa?',
        ],
        [
          'Tranquilo. Melhor assim.',
          'Movimento demais e sinal de que tem gente doente.',
        ],
      ],
    },
    {
      id: 'fofoca',
      rotulo: 'Ouvi um boato sobre uma pessoa daqui...',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Nao me conte.',
          'O que entra nesta farmacia nao sai. Vale pra receita e vale pra conversa.',
        ],
        [
          'Nao.',
          'Se e sobre alguem daqui, eu prefiro nao saber.',
          'Assim ninguem precisa se preocupar comigo.',
        ],
      ],
    },
    {
      id: 'pressa',
      rotulo: 'Da pra adiantar? Estou com pressa.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Nao da.',
          'Pressa e como se troca uma caixa pela outra. Eu prefiro conferir.',
        ],
        [
          'Entao volte quando tiver tempo.',
          'Aqui a gente confere duas vezes. Sempre.',
        ],
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
      variacoes: [
        [
          'Otimo. Odeio rodeio.',
          'Pode falar. Eu aguento.',
        ],
        [
          'Finalmente alguem.',
          'Fala logo, que eu tenho copo pra lavar.',
        ],
        [
          'Boa. Rodeio e coisa de quem nao decidiu ainda.',
          'Manda.',
        ],
      ],
    },
    {
      id: 'fofoca',
      rotulo: 'Quem apareceu no bar essa semana?',
      reacao: 'gosta',
      variacoes: [
        [
          'Gente demais e ninguem interessante. Fora um.',
          'Sentou no canto, pediu uma coisa so, e ficou duas horas olhando pro copo.',
          'Esses eu guardo na memoria.',
        ],
        [
          'Semana morna. Duas discussoes e nenhuma boa.',
          'Uma delas foi sobre futebol, o que e um desperdicio de raiva.',
        ],
        [
          'Apareceu gente que eu nao via ha anos. Sentou, bebeu, foi embora.',
          'Nao perguntei nada. Ele voltou no dia seguinte. Ai sim eu pergunto.',
        ],
      ],
    },
    {
      id: 'conselho',
      rotulo: 'O que voce faria no meu lugar?',
      reacao: 'gosta',
      variacoes: [
        [
          'No SEU lugar? Eu ja teria falado o que penso e aguentado o barulho depois.',
          'Sai mais barato que ficar remoendo. Confia em quem serve bebida pra cidade inteira.',
        ],
        [
          'Depende. Voce quer que eu concorde com voce ou quer a verdade?',
          'Porque as duas coisas custam o mesmo aqui.',
        ],
        [
          'Eu faria o que voce ja sabe que tem que fazer.',
          'Voce so queria alguem falando em voz alta.',
        ],
      ],
    },
    {
      id: 'bar',
      rotulo: 'Como foi o movimento hoje?',
      reacao: 'neutro',
      variacoes: [
        [
          'Deu pra pagar as contas. E o que interessa.',
          'Sexta e outra historia.',
        ],
        [
          'Cheio na hora errada e vazio na hora certa. O de sempre.',
          'Mas paga as contas.',
        ],
      ],
    },
    {
      id: 'filha',
      rotulo: 'Sua filha vem visitar?',
      reacao: 'neutro',
      variacoes: [
        [
          'No feriado, se a faculdade deixar.',
          'Ela liga toda semana. E mais do que eu ligava pra minha mae, entao ta bom.',
        ],
        [
          'Ta bem. Reclamando da comida da faculdade, entao ta otima.',
          'Se um dia ela parar de reclamar, ai eu me preocupo.',
        ],
      ],
    },
    {
      id: 'raso',
      rotulo: 'Entao... o tempo esta legal, ne?',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'O tempo.',
          'Serio, e isso? Voce tem assunto melhor que isso.',
        ],
        [
          'Ta.',
          'Meu bem, voce entrou aqui com cara de quem tem assunto. Usa ele.',
        ],
      ],
    },
    {
      id: 'condescendencia',
      rotulo: 'Deve ser dificil tocar um bar sozinha, coitada.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Coitada.',
          'Meu bem, eu toco esse bar ha mais tempo do que muita gente aqui tem de idade.',
          'Guarda a pena pra quem precisa.',
        ],
        [
          'Repete devagar pra eu ter certeza de que ouvi.',
          'Nao? Melhor assim.',
        ],
      ],
    },
  ],

  // ----------------------------------------------------------------- LUKE --
  // 12 anos, filho da Jaqueline. Animado, curioso, fala em maiuscula. Tem menos
  // temas que os adultos de proposito: crianca de doze anos nao tem sete
  // assuntos de conversa com um adulto que ela acabou de conhecer.
  luke: [
    {
      id: 'parque',
      rotulo: 'O que voce faz no parque?',
      reacao: 'gosta',
      variacoes: [
        [
          'TUDO! Balanco, escorregador, subir onde nao pode subir.',
          'Ontem eu fui tao alto no balanco que a corrente deu um tranco.',
          'Nao conta pra minha mae.',
        ],
        [
          'Depende do dia. Hoje eu vou tentar bater meu recorde no escorregador.',
          'Recorde de velocidade. Eu cronometro na cabeca.',
        ],
      ],
    },
    {
      id: 'curiosidade',
      rotulo: 'Quer saber uma coisa?',
      reacao: 'gosta',
      variacoes: [
        [
          'QUERO! Fala fala fala.',
          '...ah. Achei que ia ser mais legal.',
          'Mas obrigado, eu gostei mesmo assim.',
        ],
        [
          'Sempre! Eu pergunto tudo pra todo mundo.',
          'Minha mae diz que eu puxei ela nisso. Acho que sim.',
        ],
      ],
    },
    {
      id: 'mae',
      rotulo: 'Sua mae trabalha muito, ne?',
      reacao: 'neutro',
      variacoes: [
        [
          'O dia inteiro no mercado. E ela AINDA chega falando.',
          'Nao sei de onde ela tira.',
        ],
        [
          'Ela sai antes de eu acordar quase sempre.',
          'Mas ela deixa bilhete. Todo dia um bilhete.',
        ],
      ],
    },
    {
      id: 'escola',
      rotulo: 'E a escola, vai bem?',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Ahhh, por que todo adulto pergunta isso?',
          'Vai. Vai bem. Pronto.',
        ],
        [
          'Vai indo.',
          'Voce quer mesmo falar disso? Tem coisa melhor.',
        ],
      ],
    },
  ],

  // ---------------------------------------------------------------- HIAGO --
  // 26, entregador de bicicleta, titular da casa_6. Vive na rua, conhece todo
  // mundo, otimista teimoso. Treina correndo — o que rende implicancia amigavel
  // com a Mari, que acha que treino de verdade e na academia.
  hiago: [
    {
      id: 'rua',
      rotulo: 'Voce conhece toda a cidade, ne?',
      reacao: 'gosta',
      variacoes: [
        [
          'De cor. Cada buraco, cada cachorro bravo, cada portao que trava.',
          'Me da um endereco que eu te digo quanto tempo leva daqui.',
        ],
        [
          'Rua por rua. E os atalhos, que sao o que importa.',
          'Tem um corte atras do mercado que economiza cinco minutos. Nao espalha.',
        ],
      ],
    },
    {
      id: 'bike',
      rotulo: 'Faz tempo que voce trabalha de bike?',
      reacao: 'gosta',
      variacoes: [
        [
          'Uns quatro anos. Comecei quebrado e continuei porque gostei.',
          'Ninguem manda em mim e eu passo o dia no sol. Ta bom demais.',
        ],
        [
          'Desde que eu me entendo por gente, praticamente.',
          'Perna cansa. Cabeca nao. Vale a troca.',
        ],
      ],
    },
    {
      id: 'correr',
      rotulo: 'Aposto que voce nao aguenta o meu ritmo.',
      reacao: 'gosta',
      variacoes: [
        [
          'HA! Essa eu ja ouvi da Mari.',
          'Ela treina naquela sala fechada. Eu treino no mundo.',
          'Marca ai, vai. Domingo de manha.',
        ],
        [
          'Olha, eu subo aquela ladeira com caixa nas costas.',
          'Mas pode tentar. Eu gosto de companhia.',
        ],
      ],
    },
    {
      id: 'irmao',
      rotulo: 'Como e morar com o Vitor?',
      reacao: 'neutro',
      variacoes: [
        [
          'A gente quase nao se ve. Eu durmo quando ele chega.',
          'Funciona melhor do que parece.',
        ],
        [
          'Tranquilo. Ele so reclama quando eu acordo cedo demais.',
          'Que e todo dia.',
        ],
      ],
    },
    {
      id: 'reclamar',
      rotulo: 'Nesta cidade nao da pra fazer nada mesmo.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Da, sim.',
          'Eu ouco isso todo dia de gente que nunca tentou.',
          'Se voce acha ruim, faz diferente. Mas faz.',
        ],
        [
          'Pra quem fica sentado, nenhuma cidade tem o que fazer.',
          'Desculpa a franqueza.',
        ],
      ],
    },
    {
      id: 'invisivel',
      rotulo: 'So deixa ai na porta e some.',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Beleza. Deixo.',
          '...sabia que da pra falar "obrigado"? Custa nada.',
        ],
        [
          'Ta certo.',
          'A gente entrega o dia inteiro e quase ninguem olha na cara. Fica a dica.',
        ],
      ],
    },
  ],

  // ---------------------------------------------------------------- VITOR --
  // 29, irmao mais velho do Hiago, divide a casa_6 com ele. Garcom no bar da
  // Alice e musico. Acorda tarde, fala baixo, ironia seca. Odeia a pergunta
  // sobre "emprego de verdade" do mesmo jeito que a Leticia odeia a dela — mas
  // ele responde com ironia em vez de mudar de assunto.
  vitor: [
    {
      id: 'musica',
      rotulo: 'O que voce esta ouvindo?',
      reacao: 'gosta',
      variacoes: [
        [
          'Uma coisa que eu gravei semana passada e ainda nao odeio.',
          'Isso e raro. Normalmente leva tres dias.',
        ],
        [
          'Nada que voce conheca. Nem eu conhecia ate ontem.',
          'Quer ouvir? Tenho fone.',
        ],
      ],
    },
    {
      id: 'bar',
      rotulo: 'Como e trabalhar no bar da Alice?',
      reacao: 'gosta',
      variacoes: [
        [
          'Melhor chefe que eu ja tive. E a mais assustadora.',
          'As duas coisas ao mesmo tempo, o tempo todo.',
        ],
        [
          'Voce aprende gente muito rapido servindo bebida.',
          'Em duas semanas eu sei quem paga a conta e quem some.',
        ],
      ],
    },
    {
      id: 'noite',
      rotulo: 'Voce prefere a noite mesmo, ne?',
      reacao: 'gosta',
      variacoes: [
        [
          'Prefiro. De dia tem gente demais decidindo coisa.',
          'De noite todo mundo ja desistiu de resolver o dia. Fica honesto.',
        ],
        [
          'Sempre preferi. Minha cabeca so liga depois das oito.',
          'Antes disso eu sou um movel.',
        ],
      ],
    },
    {
      id: 'irmao',
      rotulo: 'Voce e o Hiago sao bem diferentes.',
      reacao: 'neutro',
      variacoes: [
        [
          'Ele acorda as seis por vontade propria. Eu acho isso uma doenca.',
          'Fora isso a gente se da bem.',
        ],
        [
          'Somos. Ele resolve tudo pedalando, eu resolvo tudo pensando.',
          'Nenhum dos dois metodos e rapido.',
        ],
      ],
    },
    {
      id: 'sono',
      rotulo: 'Acordou agora? Ja e meio-dia.',
      reacao: 'neutro',
      variacoes: [
        [
          'Pra mim sao seis da manha. Faz a conta.',
          'Fecho o bar as tres.',
        ],
        [
          'Ja. E ainda ta cedo.',
          'Nao me julga antes do meu cafe.',
        ],
      ],
    },
    {
      id: 'emprego',
      rotulo: 'Mas voce nao quer um emprego de verdade?',
      reacao: 'nao_gosta',
      variacoes: [
        [
          'Ah, esse.',
          'Eu trabalho seis noites por semana. Mas tudo bem, nao e de verdade.',
          'Proximo assunto.',
        ],
        [
          'De verdade como? Com cracha?',
          'Eu pago meu aluguel. Achei que fosse esse o teste.',
        ],
      ],
    },
  ],

  // ==================================================================
  // MORADORES DOS MAPAS 2 E 3
  // ------------------------------------------------------------------
  // Quatro temas cada: dois que a pessoa gosta, um neutro e um que ela
  // evita. Sao menos que os cinco a oito dos 9 originais de proposito —
  // aqui sao 24 pessoas, e o menu do dia mostra 3 a 4 de qualquer forma.
  // O que cada um gosta ou evita sai do perfil em src/game/moradores.ts:
  // profissao, hobby, preocupacao e o item que ele odeia.
  // ==================================================================

  // ---------------------------------------------------------------- LIVIA --
  livia: [
    {
      id: 'escola', rotulo: 'Como esta a escola este ano?', reacao: 'gosta',
      variacoes: [
        ['Cheia nas primeiras semanas e mais vazia em maio. Sempre e assim.',
          'Eu anoto quem falta. Nao pra punir. Pra ir atras.'],
        ['Melhor do que no ano passado, e ainda longe do que precisa ser.',
          'Tenho tres salas e nenhuma delas devia ter trinta alunos.'],
        ['Funcionando. Nao e elogio pequeno, considerando o orcamento.'],
      ],
    },
    {
      id: 'oficinas', rotulo: 'Ouvi falar de oficinas no contraturno.', reacao: 'gosta',
      variacoes: [
        ['Ainda e projeto. Mas eu tenho o espaco, e a Clara tem os livros.',
          'Falta so quem fique com as criancas nas tardes.'],
        ['Voce ouviu bem. Quero abrir leitura e desenho depois das aulas.',
          'Metade dos alunos vai pra casa vazia. Prefiro que venham pra ca.'],
      ],
    },
    {
      id: 'encadernacao', rotulo: 'O que voce faz nas horas livres?', reacao: 'neutro',
      variacoes: [
        ['Encaderno. Livro velho, capa nova. Da pra consertar quase tudo.'],
        ['Jardim e cola de encadernacao. Duas coisas que pedem paciencia.'],
      ],
    },
    {
      id: 'drone', rotulo: 'Ja pensou em filmar a escola com drone?', reacao: 'nao_gosta',
      variacoes: [
        ['Nao. Tem crianca de nove anos nesse patio.',
          'Camera voando por cima delas nao entra aqui.'],
        ['Nao gosto da ideia. Ninguem pediu pra ser filmado indo pra aula.'],
      ],
    },
  ],

  // -------------------------------------------------------------- MATHEUS --
  matheus: [
    {
      id: 'ronda', rotulo: 'Como vai a ronda?', reacao: 'gosta',
      variacoes: [
        ['Calma. Do jeito que eu gosto.',
          'Fico no portao na entrada e na saida. O resto do dia eu ando.'],
        ['Sem ocorrencia. Isso e o trabalho dando resultado, nao falta dele.'],
        ['Hoje so um portao aberto que ninguem tinha visto. Fechei.'],
      ],
    },
    {
      id: 'guarda', rotulo: 'Voce falou de uma guarda comunitaria.', reacao: 'gosta',
      variacoes: [
        ['Desarmada. Gente do bairro que conhece o bairro.',
          'A maioria do que aparece aqui se resolve conversando.'],
        ['E a ideia. Nao pra substituir ninguem — pra chegar antes.'],
      ],
    },
    {
      id: 'xadrez', rotulo: 'Voce joga xadrez com o Roberto, ne?', reacao: 'neutro',
      variacoes: [
        ['Sextas. Ele ganha mais. Nao me incomoda.'],
        ['Jogo. Ele demora dez minutos por lance e conta uma historia em cada um.'],
      ],
    },
    {
      id: 'autoridade', rotulo: 'As pessoas te tratam bem por aqui?', reacao: 'nao_gosta',
      variacoes: [
        ['Me tratam como farda.',
          'Eu moro aqui. Minha filha estuda aqui. Isso custa pra aparecer.'],
        ['Depende do dia. Tem gente que abaixa a voz quando eu chego perto.',
          'Nao e o efeito que eu quero causar.'],
      ],
    },
  ],

  // -------------------------------------------------------------- CECILIA --
  cecilia: [
    {
      id: 'desenho', rotulo: 'O que voce esta desenhando?', reacao: 'gosta',
      variacoes: [
        ['Uma folha! Achei uma bem grande no caminho da escola.',
          'Eu desenho e depois colo a folha do lado pra comparar.'],
        ['Um mapa. O Arthur inventa o caminho e eu desenho.',
          'Ele diz que existe. Eu acho que talvez.'],
        ['Um livro. Ainda nao tem historia, so os desenhos.'],
      ],
    },
    {
      id: 'perguntas', rotulo: 'Voce pergunta muito, ne?', reacao: 'gosta',
      variacoes: [
        ['Pergunto! Como voce sabe? Alguem falou? Foi minha mae?'],
        ['E ruim? A professora Ilda disse que nao e ruim.'],
      ],
    },
    {
      id: 'amigos', rotulo: 'Quem sao seus amigos?', reacao: 'neutro',
      variacoes: [
        ['O Arthur e o Ravi. E a Manuela, mas ela e pequena.'],
        ['Todo mundo da minha sala. Alguns eu ainda nao sei o nome.'],
      ],
    },
    {
      id: 'leitura_em_voz_alta', rotulo: 'Voce le em voz alta na aula?', reacao: 'nao_gosta',
      variacoes: [
        ['...as vezes.',
          'Minha voz fica esquisita quando todo mundo olha.'],
        ['Nao gosto. Eu leio bem sozinha, juro.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- CLARA --
  clara: [
    {
      id: 'acervo', rotulo: 'Como esta o acervo?', reacao: 'gosta',
      variacoes: [
        ['Organizado. Nao completo, mas organizado.',
          'Tem coisa aqui que so existe aqui. E o que me deixa acordada de noite.'],
        ['Crescendo devagar. Doacao chega mais que verba.'],
        ['Bem. Tirando a goteira, que voltou.'],
      ],
    },
    {
      id: 'arquivo_local', rotulo: 'Voce queria montar um arquivo da cidade?', reacao: 'gosta',
      variacoes: [
        ['Quero. Fotografia, ata, jornal de bairro, o que aparecer.',
          'A Ilda ja gravou umas entrevistas. Falta lugar pra guardar.'],
        ['E o meu projeto. A memoria desta cidade esta em gaveta de gente.'],
      ],
    },
    {
      id: 'restauro', rotulo: 'Voce restaura livro?', reacao: 'neutro',
      variacoes: [
        ['Restauro. Lombada, dobra, mancha de umidade.',
          'A Livia encaderna melhor que eu. Nao conte pra ela que eu disse.'],
        ['Um pouco. E parecido com palavra cruzada: da certo ou nao da.'],
      ],
    },
    {
      id: 'barulho', rotulo: 'Podia ter musica ambiente aqui.', reacao: 'nao_gosta',
      variacoes: [
        ['Nao.',
          'Desculpe. Foi seco. Mas nao.'],
        ['Ja tentaram. Uma caixa de som na sala de leitura.',
          'Duas pessoas foram embora no primeiro dia.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- LUCIA --
  lucia: [
    {
      id: 'documentario', rotulo: 'Voce esta gravando alguma coisa?', reacao: 'gosta',
      variacoes: [
        ['Estou! (mais ou menos) (tenho quarenta minutos de audio e nenhum roteiro)',
          'E sobre a cidade. Todo mundo aqui tem uma versao diferente da mesma rua.'],
        ['Gravando, editando, apagando, gravando de novo. O ciclo.',
          'O Vitor me ensinou a nao estourar o microfone. Foi tarde, mas ensinou.'],
        ['Um pouco. Hoje so o som da estacao. Da um fundo bom.'],
      ],
    },
    {
      id: 'fotografia', rotulo: 'Vi voce fotografando na rua.', reacao: 'gosta',
      variacoes: [
        ['Ah, viu? Eu ando com a Leticia. Ela caminha e eu paro toda hora.',
          'Ela tem paciencia. Eu tenho quatrocentas fotos de portao.'],
        ['Fotografia de rua. Que e um nome bonito pra "eu nao sei o que quero fotografar".'],
      ],
    },
    {
      id: 'irma', rotulo: 'Voce mora com a Clara, ne?', reacao: 'neutro',
      variacoes: [
        ['Moro. Ela e a irma organizada e eu sou a outra.'],
        ['Sim. Ela arruma minha mesa quando eu saio. Eu finjo que nao vejo.'],
      ],
    },
    {
      id: 'carreira', rotulo: 'Ja decidiu o que vai fazer da vida?', reacao: 'nao_gosta',
      variacoes: [
        ['Essa pergunta.',
          'Nao. E cada vez que alguem pergunta eu decido menos.'],
        ['Ainda nao. (obrigada por lembrar) (estava esquecendo por dez minutos)'],
      ],
    },
  ],

  // ----------------------------------------------------------------- CAIO --
  caio: [
    {
      id: 'conserto', rotulo: 'Em que voce esta trabalhando?', reacao: 'gosta',
      variacoes: [
        ['Carburador. Peca velha, dona teimosa.',
          'Motor avisa antes de quebrar. Basta escutar.'],
        ['Uma moto de 82. O dono quer que fique como nova.',
          'Vai ficar como uma de 82 bem cuidada. E melhor.'],
        ['Nada grande hoje. Freio e uma lanterna.'],
      ],
    },
    {
      id: 'oficina', rotulo: 'Nunca pensou em abrir uma oficina?', reacao: 'gosta',
      variacoes: [
        ['Penso. Com aprendiz.',
          'Ferramenta eu tenho. Falta parede e alguem pra ensinar.'],
        ['Pensei ontem, inclusive. Passa por semana.',
          'A Helena diz que eu ja tenho oficina, e que ela e o quintal.'],
      ],
    },
    {
      id: 'domino', rotulo: 'Voce joga domino?', reacao: 'neutro',
      variacoes: [
        ['Jogo. Ganho pouco e falo menos.'],
        ['De vez em quando. Da pra jogar calado, e isso conta.'],
      ],
    },
    {
      id: 'tempo_com_helena', rotulo: 'A Helena passa muito tempo sozinha?', reacao: 'nao_gosta',
      variacoes: [
        ['...',
          'Passa. Eu sei.',
          'Motor eu conserto. Isso ai eu ainda estou aprendendo.'],
        ['Ela diz que nao. Eu conto as horas e vejo que sim.'],
      ],
    },
  ],

  // --------------------------------------------------------------- HELENA --
  helena: [
    {
      id: 'skate', rotulo: 'Como vai o skate?', reacao: 'gosta',
      variacoes: [
        ['Vai. Cai, levanta, vai de novo.',
          'A Suzan filma. Da pra ver o erro no video, e ai da pra consertar.'],
        ['Melhor que semana passada. Ja e alguma coisa.'],
        ['Bem. Estou treinando uma manobra que ainda nao sai. Vai sair.'],
      ],
    },
    {
      id: 'competicao', rotulo: 'Voce quer competir?', reacao: 'gosta',
      variacoes: [
        ['Quero. Nao pra ganhar de ninguem daqui.',
          'Pra saber onde eu estou de verdade.'],
        ['Sim. E antes que voce pergunte: eu sei que e longe e sei que e caro.'],
      ],
    },
    {
      id: 'miniaturas', rotulo: 'Voce monta miniaturas?', reacao: 'neutro',
      variacoes: [
        ['Monto. Peca pequena, cola, paciencia. Igual ao meu pai, mas menor.'],
        ['Monto sim. Ninguem espera isso de mim, o que e otimo.'],
      ],
    },
    {
      id: 'pai_trabalhando', rotulo: 'Seu pai trabalha muito, ne?', reacao: 'nao_gosta',
      variacoes: [
        ['Trabalha.',
          'Nao precisa fazer essa cara. Eu sei cuidar de mim.'],
        ['Voce e a terceira pessoa a falar isso essa semana.',
          'Fala com ele, entao. Comigo nao resolve.'],
      ],
    },
  ],
  // ---------------------------------------------------------------- JULIA --
  julia: [
    {
      id: 'linha', rotulo: 'Como esta a linha hoje?', reacao: 'gosta',
      variacoes: [
        ['Atrasou seis minutos na primeira volta e eu recuperei quatro.',
          'Ponto por ponto, eu conheco todo mundo que sobe.'],
        ['Boa. Sem buraco novo, o que por aqui e noticia.'],
        ['Cheia. Sabado e sempre assim, mercado e quadra no mesmo horario.'],
      ],
    },
    {
      id: 'intermunicipal', rotulo: 'Voce quer pegar linha intermunicipal?', reacao: 'gosta',
      variacoes: [
        ['Quero. Estrada aberta, menos parada, mais horas seguidas.',
          'O problema e o Arthur. Turno longo com filho pequeno nao fecha.'],
        ['Um dia. Quando ele estiver maior e eu tiver menos medo de perder o jantar.'],
      ],
    },
    {
      id: 'suculentas', rotulo: 'Voce cuida de plantas?', reacao: 'neutro',
      variacoes: [
        ['Suculenta. E a unica que aguenta meu horario.'],
        ['Cuido. Elas nao reclamam se eu chegar tarde.'],
      ],
    },
    {
      id: 'horario', rotulo: 'Da conta de conciliar tudo?', reacao: 'nao_gosta',
      variacoes: [
        ['Dou. Todo dia eu dou.',
          'Nao precisa perguntar duas vezes. A resposta cansa mais que o turno.'],
        ['Dou conta. Minha mae ajuda. Nao me faz gostar da pergunta.'],
      ],
    },
  ],

  // --------------------------------------------------------------- ARTHUR --
  arthur: [
    {
      id: 'mapas', rotulo: 'O que voce esta mapeando?', reacao: 'gosta',
      variacoes: [
        ['Um atalho! Ele passa por tras da escola e sai na quadra.',
          'Nao passa mesmo, mas no mapa passa, e no mapa vale.'],
        ['Todas as estradas. Ja tenho quatro. Faltam as outras.'],
        ['A ponte. Eu desenhei ela tres vezes porque ela e comprida.'],
      ],
    },
    {
      id: 'clube', rotulo: 'Voce tem um clube?', reacao: 'gosta',
      variacoes: [
        ['Tenho! Tem regra pra entrar, regra pra sair e regra pra falar.',
          'A Cecilia disse que tem regra demais. Eu escrevi mais uma.'],
        ['Tenho. Somos tres. Um e o Ravi, que faz os avioes.'],
      ],
    },
    {
      id: 'aviao', rotulo: 'Seus avioes de papel voam bem?', reacao: 'neutro',
      variacoes: [
        ['Alguns. Um foi no telhado e ficou la.'],
        ['O Ravi dobra melhor. Eu jogo mais longe.'],
      ],
    },
    {
      id: 'mae_cansada', rotulo: 'Sua mae trabalha muito?', reacao: 'nao_gosta',
      variacoes: [
        ['Ela dirige de noite as vezes.',
          'Eu fico acordado escutando o onibus. Nao conta pra ela.'],
        ['Muito. Eu nao gosto de falar disso.'],
      ],
    },
  ],

  // ----------------------------------------------------------------- RITA --
  rita: [
    {
      id: 'colcha', rotulo: 'Como vai a colcha?', reacao: 'gosta',
      variacoes: [
        ['Vai. Um quadrado por pessoa da familia.',
          'Comecei com quatro. Agora sao seis. Filha, neto, e os que chegarem.'],
        ['Devagar. Colcha boa nao tem pressa, e eu tenho tempo de sobra.'],
        ['Terminei um quadrado ontem. O do Arthur, cheio de aviao.'],
      ],
    },
    {
      id: 'horta', rotulo: 'Como esta sua horta?', reacao: 'gosta',
      variacoes: [
        ['Em vaso, que e o que cabe. Cebolinha, hortela e uma pimenta valente.',
          'A Neide me trouxe semente nova. Vamos ver o que sai.'],
        ['Boa. Quem rega todo dia colhe todo mes.'],
      ],
    },
    {
      id: 'cafe_domingo', rotulo: 'Voce toma cafe com a Ilda?', reacao: 'neutro',
      variacoes: [
        ['Todo domingo. Ela fala de historia e eu costuro.'],
        ['Tomo. Ela explica as coisas com data. Eu explico com proverbio.'],
      ],
    },
    {
      id: 'filha_descanso', rotulo: 'A Julia descansa pouco.', reacao: 'nao_gosta',
      variacoes: [
        ['Nao me diga o que eu sei.',
          'Eu ponho comida no prato dela. E o que me deixam fazer.'],
        ['Pouco. Ela nao me ouve, e voce tambem nao vai ouvir de mim.'],
      ],
    },
  ],

  // -------------------------------------------------------------- ROBERTO --
  roberto: [
    {
      id: 'ferrovia', rotulo: 'Como era a ferrovia aqui?', reacao: 'gosta',
      variacoes: [
        ['Passava as seis e dez, e as dezoito e quarenta.',
          'Fechou em 89. O trilho ficou dois anos no chao antes de tirarem.'],
        ['Tinha duas plataformas. A segunda quase nao era usada.',
          'Eu trabalhei nela dezenove anos. Sei onde cada dormente estava torto.'],
        ['Era o relogio da cidade. Quando parou, todo mundo passou a chegar atrasado.'],
      ],
    },
    {
      id: 'maquete', rotulo: 'Voce esta montando uma maquete?', reacao: 'gosta',
      variacoes: [
        ['Estou. Escala pequena, paciencia grande.',
          'Quero a estacao como ela era, nao como ficou.'],
        ['Estou. Ja tenho o galpao e trezentos metros de trilho de mentira.'],
      ],
    },
    {
      id: 'xadrez', rotulo: 'Voce joga xadrez, ne?', reacao: 'neutro',
      variacoes: [
        ['Sextas, com o Matheus. Ele pensa rapido demais.'],
        ['Jogo. Gosto do silencio que vem com o tabuleiro.'],
      ],
    },
    {
      id: 'esquecer', rotulo: 'O senhor lembra de tudo isso mesmo?', reacao: 'nao_gosta',
      variacoes: [
        ['Lembro hoje.',
          'E por isso que eu escrevo. Um dia nao vou lembrar, e ai alguem le.'],
        ['Lembro. Nao brinque com isso.'],
      ],
    },
  ],

  // ----------------------------------------------------------------- ILDA --
  ilda: [
    {
      id: 'memoria_oral', rotulo: 'A senhora esta gravando entrevistas?', reacao: 'gosta',
      variacoes: [
        ['Estou. Comecei pelos mais velhos, por motivo obvio.',
          'Antes de responder eu preciso contar como cheguei nisso: foi uma aula em que ninguem sabia o nome da propria rua.'],
        ['Estou, sim. Onze pessoas ate agora. A Clara vai guardar o material.',
          'Historia local nao esta em livro. Esta em cozinha.'],
        ['Estou. Ontem gravei o Roberto falando de trem por quarenta minutos.'],
      ],
    },
    {
      id: 'genealogia', rotulo: 'A senhora estuda arvore genealogica?', reacao: 'gosta',
      variacoes: [
        ['Estudo. Meia cidade e prima da outra meia e ninguem sabe.',
          'Descobri que a Samanta e o Tulio tem bisavo em comum. Nao contei ainda.'],
        ['Estudo. Da pra explicar muita briga antiga com um papel e uma caneta.'],
      ],
    },
    {
      id: 'croche', rotulo: 'A senhora faz croche?', reacao: 'neutro',
      variacoes: [
        ['Faco. Com a Rita, nos domingos. Ela costura melhor.'],
        ['Faco. E como corrigir prova: um ponto errado e voce volta tres.'],
      ],
    },
    {
      id: 'ravi_calado', rotulo: 'O Ravi parece calado.', reacao: 'nao_gosta',
      variacoes: [
        ['Ele e cuidadoso, nao calado.',
          'O que me preocupa e outra coisa: ele esconde quando precisa de ajuda. Isso eu nao consigo ensinar.'],
        ['Ele fala. Escolhe as palavras, o que e diferente de nao ter.',
          'Nao chame ele de timido perto dele, por favor.'],
      ],
    },
  ],

  // ----------------------------------------------------------------- RAVI --
  ravi: [
    {
      id: 'jogo_de_tabuleiro', rotulo: 'Voce esta criando um jogo?', reacao: 'gosta',
      variacoes: [
        ['Estou. Ainda esta desbalanceado.',
          'O Arthur sempre ganha, e nao e por estrategia. E porque a regra dele deixa.'],
        ['Estou. Tem dado, tem carta e tem uma parte que ninguem entende ainda.',
          'O Lucas testou. Ele anota tudo o que da errado. Eu gosto disso.'],
        ['Estou. Hoje eu redesenhei o tabuleiro inteiro.'],
      ],
    },
    {
      id: 'quadrinhos', rotulo: 'Voce le quadrinhos?', reacao: 'gosta',
      variacoes: [
        ['Leio. A Cecilia desenha e eu escrevo a legenda.',
          'Ela desenha melhor. Eu penso a ordem dos quadros.'],
        ['Leio. Na biblioteca tem uma prateleira inteira, no canto do acervo.'],
      ],
    },
    {
      id: 'xadrez', rotulo: 'Seu avo te ensinou xadrez?', reacao: 'neutro',
      variacoes: [
        ['Ensinou. Ele demora muito pra jogar. Eu nao me importo.'],
        ['Ensinou. Eu ganho uma em cinco. Esta melhorando.'],
      ],
    },
    {
      id: 'dar_trabalho', rotulo: 'Seus avos cuidam bem de voce?', reacao: 'nao_gosta',
      variacoes: [
        ['Cuidam.',
          'Eu tento nao dar trabalho. Eles ja fizeram muito.'],
        ['Cuidam, sim. Prefiro nao falar sobre isso.'],
      ],
    },
  ],

  // ----------------------------------------------------------------- DAVI --
  davi: [
    {
      id: 'pao', rotulo: 'Voce anda assando pao?', reacao: 'gosta',
      variacoes: [
        ['Todo dia. E a unica coisa que a minha mao aguenta sem reclamar.',
          'Massa nao tem pressa. Isso ajuda.'],
        ['Ando. Fermentacao lenta, que e o que da sabor e o que da tempo.',
          'A Jaqueline provou e disse que faltava sal. Faltava sal.'],
        ['Assei ontem. Sobrou. Passe la depois.'],
      ],
    },
    {
      id: 'padaria', rotulo: 'Voce quer abrir uma padaria?', reacao: 'gosta',
      variacoes: [
        ['Pequena. Balcao, forno e duas mesas.',
          'Nao preciso de restaurante. Preciso de um lugar que abra as cinco.'],
        ['Quero. Ja sei o cardapio inteiro e nao tenho o ponto.'],
      ],
    },
    {
      id: 'filmes', rotulo: 'Voce ve filme antigo?', reacao: 'neutro',
      variacoes: [
        ['Vejo. Preto e branco, de preferencia. Tem menos coisa na tela.'],
        ['Vejo. A Manuela dorme no meio e diz que assistiu.'],
      ],
    },
    {
      id: 'mao', rotulo: 'Quando voce volta pra cozinha profissional?', reacao: 'nao_gosta',
      variacoes: [
        ['Quando a mao deixar.',
          'Nao sei a data. Ninguem sabe. O Rafael tambem nao.'],
        ['Nao me pergunte isso de manha.',
          'Desculpe. E que a resposta e sempre a mesma e sempre ruim.'],
      ],
    },
  ],
  // -------------------------------------------------------------- SAMANTA --
  samanta: [
    {
      id: 'salao', rotulo: 'Voce quer abrir um salao?', reacao: 'gosta',
      variacoes: [
        ['Quero. Duas cadeiras, espelho grande e uma tomada que aguente o secador.',
          'Hoje eu atendo na sala de casa e na calcada. Da certo, mas nao da conta.'],
        ['Quero, e ja escolhi o nome. Nao vou falar antes de ter a chave.'],
        ['Quero. Cada mes eu guardo um pouco. Ja e alguma coisa.'],
      ],
    },
    {
      id: 'canto', rotulo: 'Ouvi voce cantando com a Julia.', reacao: 'gosta',
      variacoes: [
        ['Sabado de manha, sempre. Ela faz a primeira e eu faco a segunda.',
          'Ela tem voz de anunciar parada. Combina melhor do que parece.'],
        ['Ah, ouviu? A gente canta enquanto eu escovo o cabelo dela.'],
      ],
    },
    {
      id: 'penteado', rotulo: 'Voce faz penteado de festa?', reacao: 'neutro',
      variacoes: [
        ['Faco. Formatura, casamento, aniversario de sete anos.'],
        ['Faco. Trancado leva duas horas e rende historia pra semana.'],
      ],
    },
    {
      id: 'fofoca', rotulo: 'Voce sabe de tudo o que acontece aqui, ne?', reacao: 'nao_gosta',
      variacoes: [
        ['Eu escuto muito. Nao e a mesma coisa.',
          'Quem senta na minha cadeira fala. O que fica na cadeira, fica.'],
        ['Sei o que as pessoas me contam. E nao e pra sair repetindo.',
          'Se eu repetisse, ninguem mais sentava.'],
      ],
    },
  ],

  // -------------------------------------------------------------- MANUELA --
  manuela: [
    {
      id: 'danca', rotulo: 'Voce esta ensaiando alguma coreografia?', reacao: 'gosta',
      variacoes: [
        ['ESTOU! Ja sei quase metade!',
          'A Cecilia inventa o meio e eu invento o fim.'],
        ['Estou! Quer ver? Eu faco agora. Aqui mesmo.'],
        ['Estou. Mas tem uma parte que eu erro sempre e fico brava.'],
      ],
    },
    {
      id: 'adesivos', rotulo: 'Voce coleciona adesivo?', reacao: 'gosta',
      variacoes: [
        ['Tenho um caderno inteiro! So os brilhantes ficam na primeira pagina.'],
        ['Tenho! Nao pode trocar os brilhantes. So os normais.'],
      ],
    },
    {
      id: 'skate', rotulo: 'A Helena esta te ensinando skate?', reacao: 'neutro',
      variacoes: [
        ['Esta. Ela segura minha mao e diz pra eu nao olhar pro pe.'],
        ['Esta! Eu ja fico em pe parada. Andar e o proximo.'],
      ],
    },
    {
      id: 'mae_trabalhando', rotulo: 'Sua mae fica ocupada, ne?', reacao: 'nao_gosta',
      variacoes: [
        ['Fica.',
          'Eu queria que ela sentasse. Ela nunca senta.'],
        ['Fica. Nao quero falar disso agora.'],
      ],
    },
  ],

  // --------------------------------------------------------------- RAFAEL --
  rafael: [
    {
      id: 'atendimento', rotulo: 'Como vao os atendimentos?', reacao: 'gosta',
      variacoes: [
        ['Bem. Tres pacientes hoje, e um deles finalmente subiu escada sem apoio.',
          'Meta pequena. Sempre meta pequena. E o que funciona.'],
        ['Bem. A Mari me encaminha os alunos que exageram no treino.',
          'Ela avisa antes de virar lesao. Isso vale ouro.'],
        ['Boa semana. O Caio esta recuperando movimento na mao, devagar.'],
      ],
    },
    {
      id: 'comunitario', rotulo: 'Voce quer atender de graca no bairro?', reacao: 'gosta',
      variacoes: [
        ['Nao de graca. A preco de quem mora aqui.',
          'Metade das dores que eu vejo viraram cronicas por falta de duas consultas.'],
        ['Quero. Um dia por semana, comecando por quem nao pode pagar.'],
      ],
    },
    {
      id: 'corrida', rotulo: 'Voce corre de manha?', reacao: 'neutro',
      variacoes: [
        ['Corro. Antes das seis, quando o bairro ainda esta quieto.'],
        ['Corro. E o unico horario em que eu nao estou ajudando ninguem.'],
      ],
    },
    {
      id: 'cafe', rotulo: 'Aceita um cafe?', reacao: 'nao_gosta',
      variacoes: [
        ['Nao, obrigado. Eu nao tomo.',
          'Ja tentei gostar por educacao. Nao deu.'],
        ['Nao bebo cafe. Eu sei, eu sei, sou o unico.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- SUZAN --
  suzan: [
    {
      id: 'festival', rotulo: 'Como vai o festival do bairro?', reacao: 'gosta',
      variacoes: [
        ['Vai virar realidade. Imagine a quadra com palco baixo, luz lateral, e o pessoal sentado no chao.',
          'Ja tenho tres apresentacoes confirmadas e nenhum orcamento.'],
        ['Vai. Estou juntando gente que nunca se falou: a Clara, a Helena, o Vitor.',
          'Quando junta, aparece programacao.'],
        ['Vai bem. Hoje eu marquei onde o palco encaixa. Cabe.'],
      ],
    },
    {
      id: 'video', rotulo: 'Voce filma as manobras da Helena?', reacao: 'gosta',
      variacoes: [
        ['Filmo. Camera baixa, no nivel do chao, acompanhando o eixo dela.',
          'Ela ve o video e corrige sozinha. Eu so aponto a camera.'],
        ['Filmo. E o melhor material que eu tenho, e nem e trabalho.'],
      ],
    },
    {
      id: 'danca', rotulo: 'Voce danca?', reacao: 'neutro',
      variacoes: [
        ['Danco. Mal, mas com convicao.'],
        ['Danco. E como producao: alguem tem que marcar o primeiro passo.'],
      ],
    },
    {
      id: 'renda_irregular', rotulo: 'Da pra viver de projeto avulso?', reacao: 'nao_gosta',
      variacoes: [
        ['Da. Alguns meses da muito bem e alguns meses nao da nada.',
          'Eu prefiro nao fazer essa conta em voz alta.'],
        ['Da. E a pergunta que meu pai faz todo Natal, se serve de resposta.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- LUCAS --
  lucas: [
    {
      id: 'biblioteca', rotulo: 'Como e trabalhar na biblioteca?', reacao: 'gosta',
      variacoes: [
        ['E excelente. Perdao — e bom. Eu fico formal quando estou animado.',
          'A Clara me ensinou a catalogar. Eu descobri que gosto disso mais do que de ler.'],
        ['Gosto muito. Silencio, ordem e gente entrando pra procurar coisa.'],
        ['Bom. Hoje catalogei setenta e um volumes. Numero exato, eu conto.'],
      ],
    },
    {
      id: 'arquivologia', rotulo: 'Voce quer estudar arquivologia?', reacao: 'gosta',
      variacoes: [
        ['Quero. E a distancia, o que resolve o problema de eu morar aqui.',
          'A Clara disse que ela assina a carta de recomendacao. Eu ainda nao pedi.'],
        ['Quero. Sei que parece assunto arido. Nao e.'],
      ],
    },
    {
      id: 'aves', rotulo: 'Voce observa passaros?', reacao: 'neutro',
      variacoes: [
        ['Observo. Da janela do acervo passa bem-te-vi todo dia as sete.'],
        ['Observo. E ficcao cientifica. Sao os dois hobbies e eu nao sei explicar a ligacao.'],
      ],
    },
    {
      id: 'de_fora', rotulo: 'Voce nao e daqui, ne?', reacao: 'nao_gosta',
      variacoes: [
        ['Nao sou.',
          'Faz dois anos. Ainda me perguntam isso, o que responde a sua pergunta seguinte.'],
        ['Nao. Minha familia esta em outra cidade.',
          'Eu tento nao ficar pensando nisso, e ai alguem pergunta.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- TULIO --
  tulio: [
    {
      id: 'servicos', rotulo: 'Voce faz que tipo de servico?', reacao: 'gosta',
      variacoes: [
        ['Quase tudo. Telhado, tomada, dobradica, portao emperrado.',
          'Uma vez eu consertei uma bomba d agua com um pedaco de mangueira de jardim. Durou dois anos.'],
        ['O que aparecer. E ja apareceu de tudo.',
          'Semana passada foi uma cadeira de balanco que balancava de um lado so.'],
        ['Pequeno reparo. Coisa que ninguem quer chamar profissional pra fazer.'],
      ],
    },
    {
      id: 'marcenaria', rotulo: 'Voce quer montar uma marcenaria?', reacao: 'gosta',
      variacoes: [
        ['De reparo, nao de movel novo. Tem diferenca.',
          'O Bruno me consegue madeira de sobra na madeireira. O resto e bancada e tempo.'],
        ['Quero. Restaurar movel velho e melhor negocio do que fazer barato.'],
      ],
    },
    {
      id: 'pesca', rotulo: 'Voce pesca?', reacao: 'neutro',
      variacoes: [
        ['Domingo, com o Joao. A gente pesca pouco e conversa muito.'],
        ['Pesco. E o unico lugar em que eu fico calado.'],
      ],
    },
    {
      id: 'emprego_fixo', rotulo: 'Nunca pensou em pegar um emprego fixo?', reacao: 'nao_gosta',
      variacoes: [
        ['Pensei. Muito.',
          'Eu tenho oficio, tenho nome na cidade e nao tenho carteira assinada. Nao gosto de explicar isso.'],
        ['Todo mes eu penso. Nao precisa me lembrar.'],
      ],
    },
  ],
  // ----------------------------------------------------------------- JOAO --
  joao: [
    {
      id: 'plantacao', rotulo: 'Como esta a plantacao?', reacao: 'gosta',
      variacoes: [
        ['De pe. Milho adiantado, feijao atrasado, e o tomate decidindo.',
          'Se voce quiser levar alguma coisa, eu separo antes de a gente conversar.'],
        ['Boa. Chuva veio na semana certa este ano, o que e sorte, nao competencia.'],
        ['Vai indo. Colheita pequena sabado, pra feira.'],
      ],
    },
    {
      id: 'diversificar', rotulo: 'Voce pensa em plantar outras coisas?', reacao: 'gosta',
      variacoes: [
        ['Penso. Uma coisa que aguente seca e uma que aguente agua demais.',
          'Nao da mais pra apostar tudo numa cultura so. O tempo mudou de jeito.'],
        ['Penso. A Priscila fez a conta e disse que compensa. Ela costuma estar certa.'],
      ],
    },
    {
      id: 'radio', rotulo: 'Voce escuta radio na lida?', reacao: 'neutro',
      variacoes: [
        ['Escuto. Noticia de manha e musica de tarde.'],
        ['Escuto. Previsao do tempo, principalmente. Erram bastante.'],
      ],
    },
    {
      id: 'maquina_nova', rotulo: 'Nao seria mais facil mecanizar tudo?', reacao: 'nao_gosta',
      variacoes: [
        ['Mais facil pra quem vende a maquina.',
          'Eu conheco esta terra hectare por hectare. Nao vou trocar isso por um manual.'],
        ['Ja me falaram. Ja disse nao.',
          'Nao e teimosia. E que aqui a conta nao fecha.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- NEIDE --
  neide: [
    {
      id: 'conservas', rotulo: 'Voce faz conserva?', reacao: 'gosta',
      variacoes: [
        ['Faco. Pimenta, pepino, jilo e uma geleia de umbu que sai bem.',
          'Vinte vidros por semana. Vendo no mercado, pela Jaqueline.'],
        ['Faco. E o que transforma o excesso da colheita em dinheiro de mes seguinte.'],
        ['Faco, sim. Hoje foi dia de esterilizar vidro. Cozinha inteira quente.'],
      ],
    },
    {
      id: 'marca_propria', rotulo: 'Voce queria ter uma marca?', reacao: 'gosta',
      variacoes: [
        ['Queria. Rotulo com nome, nao com fita crepe.',
          'Quem compra uma vez volta. So nao sabe como me achar de novo.'],
        ['Queria. A Suzan disse que faz o rotulo. Eu ainda estou decidindo o nome.'],
      ],
    },
    {
      id: 'ervas', rotulo: 'Voce entende de erva medicinal?', reacao: 'neutro',
      variacoes: [
        ['Entendo o basico. Boldo, erva-cidreira, hortela.',
          'Nao substituo farmacia. Antes que alguem entenda errado.'],
        ['Um pouco. A Rita me ensinou mais do que eu ensinei ela.'],
      ],
    },
    {
      id: 'joao_cansado', rotulo: 'O Joao aguenta esse ritmo?', reacao: 'nao_gosta',
      variacoes: [
        ['Ele diz que aguenta.',
          'Ele levanta as quatro e nao conta quando as costas travam. Eu conto.'],
        ['Voce percebeu tambem, entao.',
          'Nao fale com ele sobre isso. Ele fecha.'],
      ],
    },
  ],

  // ------------------------------------------------------------- PRISCILA --
  priscila: [
    {
      id: 'cooperativa', rotulo: 'Como estao as contas da cooperativa?', reacao: 'gosta',
      variacoes: [
        ['Fechadas no dia dez, como todo mes.',
          'Doze produtores, quatro atrasados, nenhum inadimplente. E um bom numero.'],
        ['Em ordem. E raro alguem perguntar, entao obrigada.',
          'A margem melhorou dois pontos desde que a Neide passou a rotular.'],
        ['Boas. Fechei hoje de manha.'],
      ],
    },
    {
      id: 'estudio', rotulo: 'Voce quer construir um estudio no campo?', reacao: 'gosta',
      variacoes: [
        ['Quero. Um quarto com porta e uma mesa. Nao preciso de mais.',
          'Eu trabalho de casa e a casa e de tres pessoas. A conta e simples.'],
        ['Quero. Ja tenho o orcamento em planilha, com tres cenarios.'],
      ],
    },
    {
      id: 'corrida', rotulo: 'Voce corre?', reacao: 'neutro',
      variacoes: [
        ['Corro. Estrada de terra, seis quilometros, sem fone.'],
        ['Corro de manha. E o unico numero do meu dia que nao e de outra pessoa.'],
      ],
    },
    {
      id: 'casa_cheia', rotulo: 'E bom morar com seu irmao e sua cunhada?', reacao: 'nao_gosta',
      variacoes: [
        ['Eles sao otimos. A casa e pequena.',
          'Sao coisas diferentes, e eu prefiro nao detalhar.'],
        ['E bom. Nao ter uma porta pra fechar nao e.'],
      ],
    },
  ],

  // ---------------------------------------------------------------- BRUNO --
  bruno: [
    {
      id: 'madeireira', rotulo: 'Como vai a madeireira?', reacao: 'gosta',
      variacoes: [
        ['Vai. Serra afiada, equipe inteira e nenhum dedo a menos este ano.',
          'Se precisar de madeira pra ampliar aquela casa, o balcao e aqui.'],
        ['Bem. Entrou pedido grande na terca. Deu conta.'],
        ['Vai. Falo alto porque a serra fica ligada o dia todo. Nao e comigo.'],
      ],
    },
    {
      id: 'seguranca', rotulo: 'A serra nao e perigosa?', reacao: 'gosta',
      variacoes: [
        ['E. E por isso que tem regra e a regra vale pra mim tambem.',
          'Quem trabalha comigo volta pra casa inteiro. Isso nao e negociavel.'],
        ['Muito. Eu treino todo mundo duas vezes: quando entra e quando relaxa.'],
      ],
    },
    {
      id: 'entalhe', rotulo: 'Voce entalha madeira?', reacao: 'neutro',
      variacoes: [
        ['Entalho. Coisa pequena, em casa, depois do turno.'],
        ['Entalho. E o oposto do trabalho: aqui eu corto rapido, la eu corto devagar.'],
      ],
    },
    {
      id: 'modernizar', rotulo: 'Maquina nova nao dispensaria gente?', reacao: 'nao_gosta',
      variacoes: [
        ['Nao na minha.',
          'Se a maquina chegar e alguem sair, eu nao troco. Ponto.'],
        ['E o que todo mundo assume, e me irrita.',
          'Eu quero modernizar sem demitir. E possivel. Da mais trabalho.'],
      ],
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

/**
 * Ultima variacao usada por (NPC, tema). Vive so na sessao, de proposito: se o
 * jogador fechar o jogo e voltar, repetir uma fala nao e problema — o que
 * incomoda e ver a MESMA linha duas vezes seguidas na mesma conversa. Guardar
 * isso no save seria peso morto num dado puramente cosmetico.
 */
const ultimaVariacao = new Map<string, number>();

/**
 * As falas de uma escolha de tema.
 *
 * A escolha e pseudoaleatoria DETERMINISTICA (semeada por NPC, tema e dia), com
 * uma regra a mais: nunca repete a variacao imediatamente anterior daquele par
 * NPC+tema. Sem isso, insistir no mesmo assunto no mesmo dia devolvia o texto
 * identico e a conversa perdia a graca justamente na hora em que o jogador esta
 * explorando o personagem.
 */
export function falasDoTema(npcId: string, tema: TemaDeConversa, dia: number): readonly string[] {
  const total = tema.variacoes.length;
  if (total === 0) return [];
  if (total === 1) return tema.variacoes[0];

  const chave = `${npcId}:${tema.id}`;
  const anterior = ultimaVariacao.get(chave);
  const sorteada = Math.floor(
    hash01(dia * 271 + semeaDeTexto(chave), SEMENTE_TEMAS + 3) * total,
  ) % total;
  const escolhida = sorteada === anterior ? (sorteada + 1) % total : sorteada;
  ultimaVariacao.set(chave, escolhida);
  return tema.variacoes[escolhida];
}

/** So pra teste: esquece o historico de variacao. */
export function esquecerVariacoes(): void {
  ultimaVariacao.clear();
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
  luke: 'De novo?! Ta, pode falar.',
  hiago: 'Ja trocamos ideia hoje, mas fala ai.',
  vitor: 'A gente ja conversou. Tudo bem, manda.',
  livia: 'Ja conversamos hoje. Mas pode falar.',
  matheus: 'De novo? Tudo bem. Fala.',
  cecilia: 'Voce voltou! Eu tenho mais pergunta.',
  clara: 'A gente ja falou hoje. Sem problema.',
  lucia: 'Oi de novo! (eu nao me importo) (nunca)',
  caio: 'Ja falamos. Pode falar mais.',
  helena: 'Voce nao cansa, ne.',
  julia: 'Ja te vi hoje. Segunda parada, entao.',
  arthur: 'Voce voltou pro clube?',
  rita: 'Volta sempre, filho. Senta.',
  roberto: 'Hoje ja teve conversa. Mas eu tenho tempo.',
  ilda: 'Ja conversamos, mas repetir nao faz mal a ninguem.',
  ravi: 'A gente ja falou. Tudo bem.',
  davi: 'De novo? Ta. Fala.',
  samanta: 'Voce ja passou aqui! Senta.',
  manuela: 'OUTRA VEZ! Oi!',
  rafael: 'A gente ja falou hoje. Manda de novo.',
  suzan: 'De novo, otimo. Eu adoro repetir ideia.',
  lucas: 'Nos ja conversamos hoje. Ainda assim, pois nao.',
  tulio: 'Ja falamos, mas eu nao terminei o causo.',
  joao: 'Ja conversamos. O dia e longo.',
  neide: 'Ja falamos hoje. Pode falar.',
  priscila: 'Segunda conversa no mesmo dia. Anotado.',
  bruno: 'Ja falamos. Fala de novo, entao.',
};

export function falaJaConversou(npcId: string): string {
  return JA_CONVERSOU[npcId] ?? 'A gente ja conversou hoje.';
}

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

// O import e circular no papel (temasMoradores le os tipos daqui), mas so um
// lado carrega valor: la o import e `import type`, que o TS apaga na compilacao.
import { TEMAS_MORADORES } from './temasMoradores.ts';

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
 *
 * Os nove NPCs do Mapa 1 ficam aqui; os 24 moradores dos Mapas 2 e 3 vem de
 * `temasMoradores.ts`, no fim do arquivo. Sao tabelas separadas so por tamanho —
 * o motor nao distingue os dois grupos.
 */
const TEMAS_MAPA_1: Record<string, readonly TemaDeConversa[]> = {
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
};

export const TEMAS_POR_NPC: Record<string, readonly TemaDeConversa[]> = {
  ...TEMAS_MAPA_1,
  ...TEMAS_MORADORES,
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
};

export function falaJaConversou(npcId: string): string {
  return JA_CONVERSOU[npcId] ?? 'A gente ja conversou hoje.';
}

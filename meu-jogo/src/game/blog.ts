/**
 * O blog da cidade — o feed que o app Navegador mostra.
 *
 * Cada NPC tem um pool de posts curtos escritos na voz dele. Todo dia, cada NPC
 * pode ou nao postar: quem e falante posta quase sempre, quem e fechado posta
 * raramente (Wendel posta em cerca de um dia a cada cinco, e quando posta e uma
 * linha seca).
 *
 * TUDO E DETERMINISTICO por dia, com a mesma semente do quadro de vagas: o
 * feed de terca e sempre o feed de terca, em qualquer maquina e em qualquer
 * reload. Por isso o feed NAO vai pro save — ele e derivado do dia, igual as
 * vagas.
 *
 * O feed mostra alguns dias de historico pra parecer um feed de verdade, em
 * ordem cronologica inversa (mais recente primeiro). O "horario" de cada post
 * tambem sai do hash, so pra ordenar os posts de um mesmo dia entre si.
 *
 * Nesta etapa e SO LEITURA: nao ha curtir nem comentar.
 */

/** Quantos dias de historico o feed carrega, contando o de hoje. */
export const DIAS_DE_FEED = 4;

/** Chance de cada NPC postar num dia qualquer. */
const CHANCE_DE_POSTAR: Record<string, number> = {
  jaqueline: 0.9,
  alice: 0.85,
  mari: 0.8,
  luke: 0.75,
  hiago: 0.75,
  leticia: 0.7,
  vitor: 0.5,
  edu: 0.45,
  wendel: 0.2,
};

/**
 * Pool de posts por NPC, na voz de cada um.
 *
 * As familias sem NPC nem sprite (marido e filho da Jaqueline, filha da Alice,
 * irma do Edu, esposa falecida do Wendel) entram so como MENCAO, do mesmo jeito
 * que no dialogo — nenhuma delas vira personagem.
 */
export const POSTS_POR_NPC: Record<string, readonly string[]> = {
  // Posta pouco e curto. Observacao de rua, sem se expor.
  edu: [
    'A padaria abriu tres minutos atrasada hoje. Primeira vez no mes.',
    'Descobri uma rua que eu nunca tinha andado. Nesta cidade. Serio.',
    'Compilou de primeira. Nao vou mexer em mais nada hoje.',
    'Tem um gato que senta sempre no mesmo muro, mesmo horario. Respeito.',
    'Andei bastante hoje. Sem destino, so andei.',
    'Alguem mais acha que teclado mecanico e caro demais pelo que entrega? Nao? Ok.',
    'Minha irma ligou. Disse que eu preciso sair mais. Eu tinha acabado de voltar da rua.',
  ],

  // Treino, disciplina, superacao. Energia alta, frases curtas e diretas.
  mari: [
    'Treino feito. Antes das sete, como sempre.',
    'Bati meu recorde de agachamento hoje. ANOTA.',
    'Nao existe dia sem vontade. Existe dia em que voce vai mesmo sem vontade.',
    'A academia estava vazia hoje de manha. Otimo. Mais espaco pra mim.',
    'Terceiro mes sem falhar um dia. Quem duvidava, pode falar agora.',
    'Dica: se voce esta esperando motivacao chegar, ela nao vem. Levanta.',
    'Minha irma acordou com o barulho do meu treino de novo. Faz parte.',
    'Semana pesada. Do jeito que eu gosto.',
  ],

  // Fala muito, puxa assunto, conta o que e engracado e guarda o que e serio.
  jaqueline: [
    'Gente, passou aqui as sete da manha comprando BOLO. Bolo! De manha!',
    'Chegou lote novo de pao. Vem quentinho que acaba rapido.',
    'O caixa quebrou por vinte minutos hoje. A fila virou reuniao de condominio.',
    'Meu marido pegou estrada de novo. Volta quinta. Ou sexta. Vai saber.',
    'O menino tirou nota boa na prova e ja quer premio. Puxou ao pai mesmo.',
    'Tem coisa que eu escuto no caixa que eu levo pro tumulo, viu. Nem adianta perguntar.',
    'Sexta e dia de compras com a Alice. Ja separei a lista dela, que ela sempre esquece.',
    'Aqui na frente era so terreno quando eu comecei. Hoje tem fila na calcada.',
  ],

  // Observacao, natureza, luz. Tranquila, sem pressa, sem falar de emprego.
  leticia: [
    'A sombra da arvore da praca chega no banco as duas em ponto. Todo dia.',
    'Tem tres tipos de passaro so nesta rua. Um deles eu nunca consegui ver.',
    'A luz do fim da tarde aqui fica alaranjada de um jeito que foto nenhuma pega.',
    'O pessego daquela arvore da esquina ja esta dando. Ninguem reparou ainda.',
    'Passei a tarde na praca sem fazer nada. Foi otimo, obrigada por perguntar.',
    'Chovia fino hoje cedo. O cheiro da calcada molhada vale acordar cedo.',
    'Vi o Edu passar pela terceira vez hoje. A gente nunca se fala, so acena.',
    'Um dia eu monto um portfolio com isso tudo. Um dia.',
  ],

  // Quase nao posta. Quando posta, e curto, pratico e util.
  wendel: [
    'A farmacia abre as 8h e fecha as 19h. Sem excecao.',
    'Lembrete: antibiotico e ate o fim da cartela, nao ate melhorar.',
    'Estoque reposto. Tudo conferido item por item.',
    'Quarta-feira eu fecho das 13h as 14h. Anotem.',
    'Dormir no mesmo horario resolve mais que meio balcao daqui.',
    'Quem deixou o guarda-chuva aqui pode buscar. Esta guardado.',
  ],

  // 12 anos: frase curta, empolgacao alta, pontuacao demais.
  luke: [
    'FUI ALTISSIMO no balanco hoje!!',
    'Descobri um atalho pro parque. Passa atras do muro. Nao conta.',
    'Minha mae trouxe bolo do mercado. O dia foi bom.',
    'Alguem sabe por que o chafariz liga sozinho de manha? EU quero saber.',
    'Achei uma pedra que parece um coracao. Ta no meu bolso.',
    'Hoje nao teve escola. MELHOR DIA.',
    'O Hiago passou de bike e me deu tchau. Ele e maneiro.',
  ],

  // Vive na rua, fala rapido, otimismo teimoso.
  hiago: [
    'Trinta e duas entregas hoje. Recorde do mes.',
    'Subi a ladeira do bar sem descer da bike. Anota ai.',
    'Aviso: tem obra na rua de tras. Desviem pela praca.',
    'Cachorro do numero 40 finalmente parou de correr atras de mim. Vitoria.',
    'Se voce ta achando que nao da tempo, e porque nao tentou de bike.',
    'Meu irmao chegou as tres da manha e reclamou do MEU barulho as seis.',
    'Chuva fina e a melhor de pedalar. Ninguem acredita em mim.',
  ],

  // Musico noturno: posta tarde, frase seca, ironia leve.
  vitor: [
    'Bom dia pra quem esta acordando agora. Ou seja: eu.',
    'Terminei uma musica hoje. Amanha eu decido se presto.',
    'O bar fechou tarde. A cidade fica bonita vazia.',
    'Gente que pede musica e depois nao dança. Explica.',
    'Meu fone quebrou. Dia ruim, oficialmente.',
    'Sexta tem gente demais e ninguem escutando. Sabado e melhor.',
  ],

  // Sarcastica, direta, le gente. O bar e o posto de observacao dela.
  alice: [
    'Bar cheio, cozinha atrasada, todo mundo feliz. Noite normal.',
    'Sujeito passou duas horas olhando pro copo. Nao perguntei. Ele que fala quando quiser.',
    'Se voce vier me pedir conselho, prepare-se pra ouvir a resposta de verdade.',
    'Playlist nova pra sexta. Se voce nao gostar, o problema e seu.',
    'Minha filha ligou da faculdade. Disse que esta comendo bem. Duvido.',
    'Hoje alguem tentou me explicar como se toca um bar. A mim.',
    'Sexta de compras com a Jaqueline. A cidade inteira em duas horas de conversa.',
    'O Wendel passou aqui. Ficou onze minutos. Recorde pessoal dele.',
    'Deu pra pagar as contas. E o que interessa.',
  ],
};

export interface PostDoBlog {
  npcId: string;
  texto: string;
  /** dia absoluto em que foi postado */
  dia: number;
  /** minuto do dia; so serve pra ordenar os posts de um mesmo dia */
  minuto: number;
}

/** Hash inteiro -> [0,1). Mesma avalanche do quadro de vagas. */
function hash01(n: number, semente: number): number {
  let h = Math.imul(n ^ semente, 0x01000193);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const SEMENTE_BLOG = 20260922;

function semeaDeTexto(texto: string): number {
  let n = 0;
  for (let i = 0; i < texto.length; i++) n = (n * 31 + texto.charCodeAt(i)) | 0;
  return n;
}

/** O post de um NPC num dia, ou null se ele nao postou naquele dia. */
export function postDoDia(npcId: string, dia: number): PostDoBlog | null {
  const pool = POSTS_POR_NPC[npcId];
  if (!pool || pool.length === 0) return null;

  const base = semeaDeTexto(npcId);
  const chance = CHANCE_DE_POSTAR[npcId] ?? 0.5;
  if (hash01(dia * 191 + base, SEMENTE_BLOG) >= chance) return null;

  const i = Math.floor(hash01(dia * 977 + base, SEMENTE_BLOG + 1) * pool.length);
  const minuto = Math.floor(hash01(dia * 37 + base, SEMENTE_BLOG + 2) * (22 * 60 - 6 * 60)) + 6 * 60;
  return { npcId, texto: pool[Math.min(i, pool.length - 1)], dia, minuto };
}

/**
 * O feed: os posts dos ultimos `DIAS_DE_FEED` dias, do mais recente pro mais
 * antigo. Dias negativos sao pulados — no comeco do jogo o feed e curto mesmo.
 */
export function feedAte(diaAtual: number, dias: number = DIAS_DE_FEED): PostDoBlog[] {
  const posts: PostDoBlog[] = [];
  for (let d = diaAtual; d > diaAtual - dias && d >= 0; d--) {
    for (const npcId of Object.keys(POSTS_POR_NPC)) {
      const post = postDoDia(npcId, d);
      if (post) posts.push(post);
    }
  }
  return posts.sort((a, b) => b.dia - a.dia || b.minuto - a.minuto);
}

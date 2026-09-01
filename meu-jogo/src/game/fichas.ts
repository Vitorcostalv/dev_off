/**
 * AS CINQUENTA FICHAS MEDICAS — a cronologia de 200 dias.
 *
 * Uma ficha por andar da represa, quatro dias de prontuario em cada: o andar 1
 * traz os dias 1 a 4, o andar 50 traz os dias 197 a 200. A aritmetica esta em
 * `diasDaFicha` (andares.ts) e nao aqui, pra nao existir intervalo repetido nem
 * vao de quatro dias no meio.
 *
 * ---------------------------------------------------------------------------
 * O QUE ISTO E, E O QUE NAO E
 * ---------------------------------------------------------------------------
 * E FICCAO. Sao documentos de um prontuario inventado, escritos pra contar uma
 * historia; nao ha aqui orientacao medica, dose, diagnostico aproveitavel nem
 * conduta que alguem deva seguir. O tom e de formulario de ambulatorio de
 * empresa: seco, repetitivo, com o campo "observacao" onde o texto vaza.
 *
 * ---------------------------------------------------------------------------
 * A REVELACAO E GRADUAL, E A ESCADA E ESTA
 * ---------------------------------------------------------------------------
 *   andar 1 a 9    o paciente e um numero de cadastro e mais nada
 *   andar 10       aparecem as iniciais
 *   andar 20       a ocupacao e dita: desenvolvedor de software
 *   andar 30       a historia comeca a bater com a do protagonista
 *   andar 40       da pra concluir de quem e o prontuario
 *   andar 50       nao ha mais como nao concluir
 *
 * O que o andar 50 estabelece: a mudanca pra cidade pequena NAO foi um plano de
 * vida tranquila que apareceu do nada. Ele estava se deteriorando sob pressao
 * profissional continua, e a mudanca foi parte da tentativa de se recuperar.
 *
 * O que o andar 50 NAO estabelece, de proposito: quem levou o prontuario pra
 * dentro da usina, o que sao os monstros, por que o setor profundo tinha energia
 * tres anos depois do desligamento e o que ha abaixo do andar 50. As quatro
 * perguntas ficam abertas.
 *
 * O numero de cadastro (4471) e o mesmo numero de serie da Turbina 2, que a
 * placa do andar 3 ja trazia desde a leva anterior. Nao ha explicacao pra isso
 * em lugar nenhum, e nao deve haver ainda.
 */

import { diasDaFicha, idDaFicha } from './andares.ts';

export interface FichaMedica {
  id: string;
  andar: number;
  dias: { de: number; ate: number };
  /** como o paciente aparece identificado NESTA folha */
  paciente: string;
  queixa: string;
  sono: string;
  trabalho: string;
  recomendacao: string;
  /** a linha manuscrita no campo de observacao */
  nota: string;
}

/** Uma linha da tabela crua: [queixa, sono, trabalho, recomendacao, nota]. */
type Linha = readonly [string, string, string, string, string];

/**
 * Como o paciente e identificado, por faixa de andar. E a escada de revelacao
 * num lugar so — mexer nela aqui muda as cinquenta folhas de uma vez.
 */
function identificacao(andar: number): string {
  if (andar < 10) return 'PACIENTE 4471-C';
  if (andar < 20) return 'PACIENTE 4471-C — iniciais V. A.';
  if (andar < 30) return 'PACIENTE V. A., 34 anos — desenvolvedor de software';
  if (andar < 40) return 'PACIENTE V. A. — desenvolvedor, regime remoto integral';
  if (andar < 50) return 'PACIENTE V. A. — mudanca de domicilio registrada em folha anexa';
  return 'PACIENTE V. A. — prontuario encerrado por transferencia';
}

const LINHAS: readonly Linha[] = [
  // ------------------------------------- CAPITULO 1 — Rotina (1 a 10) --
  [
    'Cansaco ao fim do dia, sem outra queixa. Procurou por conta propria.',
    'Cinco a seis horas, com despertar noturno uma vez.',
    'Jornada declarada de oito horas; relata "algumas" horas extras na semana.',
    'Orientacao geral de sono. Retorno em duas semanas se persistir.',
    'Paciente minimiza. Falou "e so a fase do projeto" tres vezes na consulta.',
  ],
  [
    'Cansaco mantido. Refere dor de cabeca no fim da tarde.',
    'Cinco horas em media. Diz que "aproveita a madrugada porque ninguem chama".',
    'Horas extras agora quantificadas: doze na ultima semana.',
    'Reduzir tela apos as 22h. Pausa de dez minutos a cada duas horas.',
    'Trouxe o notebook pra sala de espera e trabalhou enquanto aguardava.',
  ],
  [
    'Dor de cabeca quase diaria. Tensao cervical a palpacao.',
    'Quatro a cinco horas. Acorda com a sensacao de nao ter dormido.',
    'Entrega grande em curso. Diz que "depois disso normaliza".',
    'Alongamento cervical. Reavaliar em quinze dias.',
    'Perguntei quantas vezes "depois disso" ja apareceu no prontuario. Nao respondeu.',
  ],
  [
    'Cervicalgia e episodios de visao embacada ao fim do dia.',
    'Quatro horas. Duas noites em claro na quinzena.',
    'A entrega foi adiada; a jornada nao.',
    'Encaminhamento pra avaliacao oftalmologica. Insisti na reducao de jornada.',
    'Recusou atestado. Disse que o time e pequeno e que ele e o unico que conhece a base.',
  ],
  [
    'Refere irritabilidade e dificuldade de sustentar atencao em reuniao.',
    'Quatro a cinco horas, fragmentado.',
    'Passou a atender fora do horario "pra nao acumular".',
    'Orientado a definir horario de corte. Combinamos 20h.',
    'O horario de corte foi combinado e descumprido no mesmo dia — ele mesmo contou.',
  ],
  [
    'Queixa nova: perde palavra no meio da frase ao explicar codigo.',
    'Quatro horas. Cafe apos as 18h praticamente diario.',
    'Duas frentes simultaneas. Diz que uma delas "e so acompanhar".',
    'Suspender cafeina apos as 15h. Reavaliar atencao em trinta dias.',
    'Anotou a orientacao no celular, num aplicativo de tarefa, entre dois tickets.',
  ],
  [
    'Palpitacao em repouso, duas vezes na semana. Exame fisico sem alteracao.',
    'Tres a quatro horas nas noites de plantao.',
    'Entrou em escala de plantao noturno "temporariamente".',
    'Solicitados exames de rotina. Orientado a comunicar a chefia.',
    'Comunicou a chefia. A resposta, segundo ele, foi um emoji de coracao.',
  ],
  [
    'Exames de rotina sem alteracao. Queixas mantidas.',
    'Quatro horas. Relata sonhar com a tela de erro do sistema.',
    'O plantao "temporario" completou seis semanas.',
    'Reforcada a indicacao de reducao de jornada. Registrado por escrito.',
    'Pediu copia do registro escrito. Nao disse pra que.',
  ],
  [
    'Perda de peso de tres quilos em oito semanas, sem dieta.',
    'Quatro horas. Duas madrugadas seguidas trabalhando na semana passada.',
    'Diz que a entrega grande voltou pro calendario, com a data antiga.',
    'Encaminhamento a nutricao. Contraindicado manter plantao noturno.',
    '"A data antiga" e a data que ele mesmo disse ser impossivel na consulta 4.',
  ],
  [
    'Quadro de cansaco cronico ja instalado. Concentracao reduzida.',
    'Quatro horas em media, com dois despertares.',
    'Jornada real estimada em sessenta horas semanais.',
    'Indicado afastamento de curta duracao. Paciente recusa.',
    'Iniciais conferidas com o cadastro: V. A. Ele riu e disse que "V" de vontade.',
  ],
  // ------------------------------------ CAPITULO 2 — Pressao (11 a 20) --
  [
    'Estresse ocupacional com repercussao fisica. Bruxismo noturno relatado.',
    'Quatro horas. Aperta os dentes; acordou com a mandibula travada.',
    'Sessenta horas mantidas. Recusou o afastamento por escrito.',
    'Placa de bruxismo. Nova conversa sobre afastamento em trinta dias.',
    'A recusa por escrito foi redigida por ele em quatro linhas, sem erro nenhum.',
  ],
  [
    'Taquicardia ao abrir o computador pela manha. Relata "aviso do corpo".',
    'Tres a quatro horas. Deitar virou tarefa da lista.',
    'Duas frentes viraram tres.',
    'Solicitada avaliacao cardiologica. Orientado repouso relativo.',
    'Ele chamou o proprio sintoma de "latencia". Nao percebeu que chamou.',
  ],
  [
    'Avaliacao cardiologica sem doenca estrutural. Sintoma atribuido a ansiedade.',
    'Tres horas nas noites de entrega.',
    'A entrega grande foi antecipada em duas semanas.',
    'Indicado acompanhamento psicologico. Aceitou "quando der".',
    '"Quando der" e a terceira formula dele. As outras duas: "e so a fase" e "depois normaliza".',
  ],
  [
    'Ansiedade com sintoma fisico predominante. Sudorese e tremor fino.',
    'Tres horas. Diz que a insonia "e produtiva".',
    'Trabalhou trinta e uma horas seguidas na semana da antecipacao.',
    'Contraindicada jornada superior a oito horas. Registrado.',
    'Trinta e uma horas seguidas. Confirmou duas vezes; nao e erro de anotacao.',
  ],
  [
    'Exaustao fisica. Nao sustenta esforco leve por dez minutos.',
    'Quatro horas, com sono diurno involuntario.',
    'Entrega feita. Nova entrega abriu no dia seguinte.',
    'Afastamento de sete dias emitido. Paciente levou o atestado.',
    'Levou o atestado. Nao entregou. Trabalhou os sete dias — ele mesmo relatou depois.',
  ],
  [
    'Queixa de esquecimento de compromisso e de conversa recente.',
    'Quatro horas. Uma noite em claro por semana, em media.',
    'Assumiu a manutencao de um sistema que nao conhece, "porque ninguem mais tem contexto".',
    'Rastreio cognitivo agendado. Reforcado o encaminhamento psicologico.',
    'Ele escreveu "contexto" e depois disse que era a palavra errada. Nao achou a outra.',
  ],
  [
    'Rastreio cognitivo dentro da normalidade. Queixa mantida.',
    'Quatro horas. Sonha com fila de tarefas.',
    'Sessenta e cinco horas semanais estimadas.',
    'Indicada reducao imediata de escopo. Encaminhamento formal a chefia.',
    'A chefia respondeu ao encaminhamento pedindo estimativa de impacto no cronograma.',
  ],
  [
    'Choro sem motivo identificado, duas vezes na quinzena. Relata vergonha.',
    'Tres a quatro horas.',
    'Reuniao de madrugada com fuso de outro pais, tres vezes por semana.',
    'Iniciado acompanhamento psicologico. Frequencia semanal.',
    'Primeira sessao feita de dentro do carro, no estacionamento, entre duas reunioes.',
  ],
  [
    'Dor toracica atipica em contexto de crise. Investigacao negativa.',
    'Tres horas. Passou a dormir com o celular na mao.',
    'Diz que "ja nao sabe de quantos projetos e responsavel".',
    'Contraindicado sobreaviso noturno. Registrado por escrito, terceira vez.',
    'Terceira vez registrada. Guardo copia das tres na pasta do paciente.',
  ],
  [
    'Quadro de esgotamento relacionado ao trabalho, com repercussao clinica.',
    'Tres a quatro horas. Sem noite integra em dez dias.',
    'Ocupacao: desenvolvedor de software. Regime remoto, sem separacao de ambiente.',
    'Afastamento de trinta dias indicado. Paciente pediu prazo pra "organizar a entrega".',
    'Pediu prazo pra organizar a entrega antes de aceitar o afastamento. Concedi quinze dias.',
  ],
  // ----------------------------------- CAPITULO 3 — Colapso (21 a 30) --
  [
    'Nao compareceu na data marcada. Retornou nove dias depois.',
    'Nao soube informar quantas horas dormiu na semana.',
    'Os quinze dias de prazo viraram vinte e sete.',
    'Afastamento emitido com data retroativa. Orientado a nao acessar sistemas.',
    'Perguntei o que aconteceu nos nove dias. Disse que "passou rapido".',
  ],
  [
    'Durante o afastamento, manteve acesso e resolveu duas ocorrencias.',
    'Cinco horas — melhora leve na primeira semana parada.',
    'Afastado no papel; ativo no sistema, com registro de commit de madrugada.',
    'Reforcada a suspensao total de acesso. Conversa com a chefia solicitada.',
    'O registro de madrugada e das 03h14. Ele nao lembrava de ter feito.',
  ],
  [
    'Episodio de desorientacao em casa: nao soube dizer que dia era.',
    'Quatro horas.',
    'Fim do afastamento. Voltou a jornada integral no primeiro dia.',
    'Solicitada avaliacao neurologica pra descartar causa organica.',
    'Ele descreveu o episodio como "o dia sem cabecalho". Achei a expressao exata.',
  ],
  [
    'Avaliacao neurologica sem causa organica. Atribuido a privacao de sono.',
    'Quatro horas, fragmentado em tres blocos.',
    'Assumiu, alem do resto, o plantao do colega que pediu demissao.',
    'Contraindicado acumulo de funcao. Registrado.',
    'O colega que pediu demissao trabalhava no mesmo horario que ele. Anotei o nome.',
  ],
  [
    'Irritabilidade com terceiros. Relata discussao em call, na frente do time.',
    'Tres a quatro horas.',
    'Setenta horas semanais estimadas. Nao contesta o numero.',
    'Aumentada a frequencia do acompanhamento psicologico. Nova indicacao de afastamento.',
    'Nao contestou o numero. Antes ele contestava, e isso me preocupa mais que o numero.',
  ],
  [
    'Perda de referencia de tempo: confundiu semana passada com o mes anterior.',
    'Quatro horas.',
    'Diz que abriu a agenda e nao reconheceu tres das proprias reunioes.',
    'Afastamento de sessenta dias indicado, por escrito, com copia a chefia.',
    'Nao reconheceu tres reunioes que ele mesmo marcou. Mostrou o print. E a letra dele.',
  ],
  [
    'Aceitou o afastamento. Primeira semana com melhora do sono.',
    'Seis horas na terceira noite. Chamou de "estranho".',
    'Sem acesso a sistema. Confirmado com a chefia.',
    'Manter afastamento. Reavaliar em quinze dias.',
    'Chamou seis horas de sono de "estranho". Foi o mais perto de alivio que eu vi nele.',
  ],
  [
    'Segunda semana: ansiedade de retorno. Refere culpa pela equipe.',
    'Cinco a seis horas.',
    'Recebeu duas mensagens da chefia perguntando prazo de volta.',
    'Orientado a nao responder mensagem de trabalho no afastamento.',
    'Respondeu as duas. Uma delas com uma estimativa de prazo, detalhada, de tres itens.',
  ],
  [
    'Terceira semana: piora. Voltou a acordar as 4h "pra adiantar".',
    'Quatro horas.',
    'Retomou acesso por conta propria, sem alta.',
    'Registrada quebra de afastamento. Indicado desligamento da funcao atual.',
    'Sugeri, pela primeira vez, mudar de trabalho. Ele disse que nao sabe fazer outra coisa.',
  ],
  [
    'Quadro cronico. Refere pensar em "ir pra um lugar sem sinal".',
    'Quatro horas.',
    'Regime remoto integral desde o inicio do prontuario; nunca teve escritorio.',
    'Discutida mudanca de contexto: cidade menor, jornada reduzida, trabalho por demanda.',
    'Perguntou se conserto de eletronico "conta como trabalho de verdade". Contei que sim.',
  ],
  // ----------------------------------- CAPITULO 4 — Negacao (31 a 40) --
  [
    'Retornou com plano concreto de mudanca. Animo melhor, sono igual.',
    'Quatro a cinco horas.',
    'Negociou passar a atender por demanda, remoto, com menos clientes.',
    'Apoiada a mudanca. Manter acompanhamento a distancia.',
    'Ele chamou o plano de "reducao de escopo". Nao percebeu de onde tirou a palavra.',
  ],
  [
    'Refere que o corpo "esta esperando o susto passar".',
    'Cinco horas.',
    'Duas semanas ate a mudanca. Continua atendendo os clientes antigos.',
    'Orientado a nao levar os clientes antigos pro contexto novo.',
    'Levou. Todos. Disse que era "so a transicao".',
  ],
  [
    'Sintoma novo: acha que ja leu o proprio prontuario. Nao leu.',
    'Cinco horas, com pesadelo recorrente de corredor.',
    'Mudanca marcada. Casa com oficina nos fundos, comprada.',
    'Reforcada a separacao entre casa e trabalho na casa nova.',
    'Descreveu o pesadelo: corredor de concreto que da em outro corredor igual.',
  ],
  [
    'Sensacao de familiaridade com lugares onde nao esteve.',
    'Cinco horas.',
    'Ultima semana antes da mudanca. Trabalhou todos os dias.',
    'Manter acompanhamento. Reavaliar trinta dias apos a mudanca.',
    'Disse: "eu ja sei o que voce vai escrever aqui". Nao errou muito.',
  ],
  [
    'Primeira consulta apos a mudanca. Refere silencio "alto demais".',
    'Seis horas. Melhor noite do prontuario inteiro.',
    'Atendendo tres clientes por demanda, com conserto de eletronico no local.',
    'Manter. Reduzir gradualmente os clientes antigos.',
    'Seis horas. Registrei o numero em destaque porque nao aparecia desde o dia 9.',
  ],
  [
    'Refere prazo aparecendo em lugar que nao e de prazo.',
    'Cinco a seis horas.',
    'Um cliente antigo voltou a exigir sobreaviso.',
    'Contraindicado sobreaviso. Quarta vez registrada.',
    'Descreveu ver uma data de entrega escrita numa parede. Nao insistiu no assunto.',
  ],
  [
    'Melhora do humor. Queixa cognitiva persistente e estavel.',
    'Seis horas.',
    'Encerrou o contrato do cliente que exigia sobreaviso.',
    'Manter. Elogiada a decisao.',
    'Foi a primeira vez em cento e quarenta dias que ele encerrou algo por decisao propria.',
  ],
  [
    'Refere que "a cidade tem uma represa" e mudou de assunto.',
    'Cinco a seis horas.',
    'Dois clientes. Rotina de oficina estabelecida.',
    'Manter acompanhamento mensal.',
    'Mudou de assunto duas vezes ao falar da represa. Nao explorei; ele nao quis.',
  ],
  [
    'Estavel. Queixa de nao lembrar por que se mudou.',
    'Seis horas.',
    'Rotina mantida.',
    'Retomada a leitura conjunta do prontuario, a pedido dele.',
    'Ele pediu pra ler o proprio prontuario. Comecamos pelo dia 1. Parou no dia 40.',
  ],
  [
    'Trouxe a duvida por escrito: "eu escolhi vir ou fui trazido?".',
    'Seis horas.',
    'Rotina mantida. Dois clientes, oficina, conserto por demanda.',
    'Retomada da leitura na proxima consulta. Orientado a nao ler sozinho.',
    'A pergunta esta na letra dele, num papel dobrado em quatro. Anexei a folha.',
  ],
  // ------------------------------ CAPITULO 5 — Reconhecimento (41 a 50) --
  [
    'Leu sozinho os dias 41 a 80. Reacao de estranhamento, nao de surpresa.',
    'Cinco horas na noite seguinte a leitura.',
    'Rotina mantida.',
    'Manter acompanhamento. Nao antecipar a leitura do trecho final.',
    'Disse: "isso nao parece meu, parece de alguem que eu conheco muito bem".',
  ],
  [
    'Refere reconhecer o corredor do pesadelo num lugar real.',
    'Quatro a cinco horas.',
    'Um cliente pediu retorno de jornada integral. Ele nao respondeu ainda.',
    'Contraindicado retorno a jornada integral. Registrado em definitivo.',
    'Nao respondeu ao cliente. Ficou tres dias com a mensagem aberta na tela.',
  ],
  [
    'Recusou o retorno a jornada integral. Refere alivio e culpa juntos.',
    'Cinco horas.',
    'Dois clientes.',
    'Manter. Trabalhada a culpa em sessao.',
    'A culpa dele nao e por ter recusado. E por ter demorado tres dias.',
  ],
  [
    'Pergunta direta: quer saber se o quadro dele tem nome.',
    'Cinco horas.',
    'Rotina mantida.',
    'Explicado o quadro em termos clinicos, sem rotulo de manchete.',
    'A pergunta que ele fez de verdade nao foi o nome. Foi se tem volta.',
  ],
  [
    'Estavel. Sono melhor que em qualquer ponto dos primeiros cem dias.',
    'Seis a sete horas.',
    'Rotina mantida.',
    'Espacado o acompanhamento pra bimestral.',
    'Sete horas. Escrevi o numero e mostrei pra ele. Ficou olhando um tempo.',
  ],
  [
    'Trouxe o assunto da represa por conta propria. Descreveu a estrada.',
    'Seis horas.',
    'Rotina mantida.',
    'Sem contraindicacao a caminhada. Orientado a nao ir sozinho a lugar fechado.',
    'Descreveu a estrada com precisao de quem foi. Ele diz que nunca passou do portao.',
  ],
  [
    'Refere ter encontrado "papel com a minha letra" num lugar improvavel.',
    'Cinco a seis horas.',
    'Rotina mantida.',
    'Investigada a possibilidade de confabulacao. Sem outros indicios.',
    'Nao anotei onde era o lugar improvavel. Ele nao disse, e eu nao perguntei duas vezes.',
  ],
  [
    'Leu os dias 121 a 160. Chorou na leitura do dia 160.',
    'Quatro horas na noite da leitura; seis nas seguintes.',
    'Rotina mantida.',
    'Manter. Leitura do trecho final somente em consulta.',
    'O dia 160 e a folha dobrada em quatro. Ele reconheceu o papel antes de ler o texto.',
  ],
  [
    'Preparacao pra leitura do trecho final. Combinado o que ele quer saber.',
    'Seis horas.',
    'Rotina mantida.',
    'Manter. Ultima consulta do prontuario agendada.',
    'Ele pediu duas coisas: nada de rotulo, e a frase que resume, escrita por mim.',
  ],
  [
    'ULTIMA FOLHA. Leitura conjunta do prontuario inteiro, concluida.',
    'Seis a sete horas, estavel nos ultimos trinta dias.',
    'Dois clientes por demanda, oficina de conserto, jornada abaixo de trinta horas.',
    'Alta do acompanhamento continuo. Prontuario encerrado por transferencia.',
    'A frase que ele pediu: voce nao veio pra ca porque quis uma vida tranquila. Voce veio '
      + 'porque estava se acabando e essa foi a unica coisa que sobrou pra tentar. A vida '
      + 'tranquila veio depois, e foi voce que fez.',
  ],
];

if (LINHAS.length !== 50) {
  throw new Error(`[fichas] a tabela tem ${LINHAS.length} folha(s), esperava 50`);
}

export const FICHAS: readonly FichaMedica[] = LINHAS.map((linha, i) => {
  const andar = i + 1;
  return {
    id: idDaFicha(andar),
    andar,
    dias: diasDaFicha(andar),
    paciente: identificacao(andar),
    queixa: linha[0],
    sono: linha[1],
    trabalho: linha[2],
    recomendacao: linha[3],
    nota: linha[4],
  };
});

const FICHA_POR_ID = new Map(FICHAS.map((f) => [f.id, f]));
const FICHA_POR_ANDAR = new Map(FICHAS.map((f) => [f.andar, f]));

export function buscarFicha(id: unknown): FichaMedica | null {
  return typeof id === 'string' ? (FICHA_POR_ID.get(id) ?? null) : null;
}

export function fichaDoAndar(andar: unknown): FichaMedica | null {
  return typeof andar === 'number' ? (FICHA_POR_ANDAR.get(andar) ?? null) : null;
}

/**
 * O texto da ficha, em linhas, na ordem do formulario.
 *
 * E o MESMO texto no objeto de exame do mapa e na tela de Arquivos: uma ficha
 * lida no chao do andar 23 e a mesma ficha relida depois, palavra por palavra.
 */
export function linhasDaFicha(f: FichaMedica): string[] {
  return [
    `FICHA ${String(f.andar).padStart(3, '0')} — dias ${f.dias.de} a ${f.dias.ate}`,
    f.paciente,
    `Queixa: ${f.queixa}`,
    `Sono: ${f.sono}`,
    `Trabalho: ${f.trabalho}`,
    `Conduta: ${f.recomendacao}`,
    `Observacao: ${f.nota}`,
  ];
}

/** Titulo curto pra lista de Arquivos. */
export function tituloDaFicha(f: FichaMedica): string {
  return `FICHA ${String(f.andar).padStart(3, '0')}  dias ${f.dias.de}-${f.dias.ate}`;
}

/** Todo texto de ficha por id de aviso — entra em `ITENS_DE_LEITURA`. */
export const TEXTOS_DE_FICHA: Record<string, string[]> = Object.fromEntries(
  FICHAS.map((f) => [f.id, linhasDaFicha(f)]),
);

// --------------------------------------------------------------- arquivo --
/**
 * O ARQUIVO — quais fichas o jogador ja recolheu.
 *
 * As cinquenta fichas NAO entram no inventario. Sao papel de prontuario, e
 * carregar cinquenta folhas em slots de mochila seria ocupar o inventario
 * inteiro com leitura (a Parte 17 pede exatamente que isso nao aconteca). Ao
 * examinar uma ficha no chao do andar, ela e ARQUIVADA aqui, e a partir dai da
 * pra reler a qualquer momento pela tela de Arquivos.
 *
 * O que fica guardado e so o NUMERO do andar: o texto e estatico e mora em
 * `FICHAS`. Assim o save nao cresce com o tamanho do prontuario, e corrigir uma
 * virgula numa ficha nao invalida nada.
 */
export class SistemaArquivo {
  private recolhidas = new Set<number>();

  coletar(andar: number): boolean {
    if (!FICHA_POR_ANDAR.has(andar) || this.recolhidas.has(andar)) return false;
    this.recolhidas.add(andar);
    return true;
  }

  tem(andar: number): boolean {
    return this.recolhidas.has(andar);
  }

  get quantas(): number {
    return this.recolhidas.size;
  }

  /** As fichas ja recolhidas, em ordem de andar. */
  coletadas(): FichaMedica[] {
    return [...this.recolhidas]
      .sort((a, b) => a - b)
      .map((andar) => FICHA_POR_ANDAR.get(andar))
      .filter((f): f is FichaMedica => f !== undefined);
  }

  /**
   * A lista COMPLETA pra tela de Arquivos: as recolhidas com titulo, as outras
   * como `?????`. Mostrar a lacuna e o que faz o jogador saber que falta uma —
   * sem isso, quem pula um andar nunca descobre que pulou.
   */
  indice(): { andar: number; titulo: string; tem: boolean }[] {
    return FICHAS.map((f) => ({
      andar: f.andar,
      titulo: this.recolhidas.has(f.andar) ? tituloDaFicha(f) : `FICHA ${String(f.andar).padStart(3, '0')}  ?????`,
      tem: this.recolhidas.has(f.andar),
    }));
  }

  serializar(): number[] {
    return [...this.recolhidas].sort((a, b) => a - b);
  }

  restaurar(bruto: unknown): void {
    this.recolhidas.clear();
    if (!Array.isArray(bruto)) return;
    for (const n of bruto) {
      const andar = Number(n);
      if (Number.isInteger(andar) && FICHA_POR_ANDAR.has(andar)) this.recolhidas.add(andar);
    }
  }
}

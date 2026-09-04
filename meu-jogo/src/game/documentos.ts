/**
 * OS CEM DOCUMENTOS DOS ANDARES 51 A 150.
 *
 * Cinquenta de TRABALHO (51-100) e cinquenta de INFANCIA (101-150). Eles nao
 * substituem o prontuario dos cinquenta primeiros andares — sao uma segunda e
 * uma terceira secao do arquivo, e o prontuario continua em `fichas.ts`, letra
 * por letra.
 *
 * SAO ARTEFATOS DE FICCAO. Nao ha aqui orientacao medica, dose, diagnostico
 * aproveitavel nem conduta que alguem deva seguir; sao papel inventado pra
 * contar uma historia, do mesmo jeito que a carta de um NPC e.
 *
 * ---------------------------------------------------------------------------
 * POR QUE O FORMATO MUDA DE UM PRA OUTRO
 * ---------------------------------------------------------------------------
 * A Parte 10 pede que nao sejam todos iguais, e a razao e de leitura: cinquenta
 * fichas com os mesmos cinco rotulos viram uma so, e o jogador para de ler no
 * decimo. Entao cada documento declara o TIPO dele, e o tipo escolhe os rotulos
 * — uma avaliacao de desempenho tem "Periodo" e "Parecer", um chamado tecnico
 * tem "Chamado" e "Causa raiz", um bilhete de professora nao tem rotulo nenhum.
 *
 * ---------------------------------------------------------------------------
 * O QUE ELES NAO FAZEM
 * ---------------------------------------------------------------------------
 * Nenhum documento escreve "a infancia dele causou o esgotamento". A ligacao e
 * do jogador. Os papeis de trabalho descrevem um sistema em que a pressao vem
 * de todo lado ao mesmo tempo — empresa, cliente, equipe, dinheiro e ele
 * mesmo — e nenhum vilao assina embaixo. Os papeis de infancia descrevem uma
 * casa comum, com adulto cansado e escola exigente, e nenhum monstro tambem.
 *
 * O andar 100 fecha o capitulo do trabalho e ABRE o da infancia. O andar 150
 * nao fecha nada: ele termina numa referencia que aponta pra baixo.
 */

import { secaoDoAndar } from './andares.ts';
import type { SecaoDeArquivo } from './andares.ts';

// ------------------------------------------------------------------ tipos --
/**
 * Os formatos. Cada um traz os quatro rotulos do corpo, na ordem.
 *
 * Rotulo vazio (`''`) sai como linha solta, sem prefixo — e o que faz um
 * bilhete parecer bilhete e nao formulario.
 */
export interface FormatoDocumento {
  id: string;
  nome: string;
  rotulos: readonly [string, string, string, string];
}

export const FORMATOS: readonly FormatoDocumento[] = [
  // ------------------------------------------------------------ trabalho --
  { id: 'saude_ocupacional', nome: 'Saude ocupacional', rotulos: ['Exame', 'Queixa referida', 'Achado', 'Encaminhamento'] },
  { id: 'afastamento', nome: 'Recomendacao de afastamento', rotulos: ['Periodo sugerido', 'Motivo', 'Restricao', 'Situacao'] },
  { id: 'terapia', nome: 'Resumo de sessao', rotulos: ['Assunto', 'Relato', 'Observacao', 'Combinado'] },
  { id: 'questionario', nome: 'Autorrelato', rotulos: ['Pergunta', 'Resposta', 'Pergunta', 'Resposta'] },
  { id: 'incidente', nome: 'Registro de incidente', rotulos: ['Ocorrencia', 'Impacto', 'Causa apontada', 'Acao'] },
  { id: 'avaliacao', nome: 'Avaliacao de desempenho', rotulos: ['Periodo', 'Destaque', 'Ponto de atencao', 'Parecer'] },
  { id: 'jornada', nome: 'Espelho de ponto', rotulos: ['Periodo', 'Jornada media', 'Fora de expediente', 'Observacao'] },
  { id: 'email', nome: 'Impressao de mensagem', rotulos: ['De', 'Assunto', '', ''] },
  { id: 'rh', nome: 'Correspondencia de RH', rotulos: ['Assunto', '', '', 'Encaminhamento'] },
  { id: 'chamado', nome: 'Nota tecnica de chamado', rotulos: ['Chamado', 'Sintoma', 'Causa raiz', 'Nota do plantonista'] },

  // ------------------------------------------------------------ infancia --
  { id: 'boletim', nome: 'Boletim', rotulos: ['Periodo', 'Notas', 'Frequencia', 'Parecer'] },
  { id: 'bilhete', nome: 'Bilhete da professora', rotulos: ['', '', '', ''] },
  { id: 'diario', nome: 'Folha de diario', rotulos: ['', '', '', ''] },
  { id: 'desenho', nome: 'Desenho com legenda', rotulos: ['O que tem no papel', 'Escrito no canto', 'Verso', 'Guardado por'] },
  { id: 'recado_casa', nome: 'Recado de casa', rotulos: ['', '', '', ''] },
  { id: 'orientacao', nome: 'Ficha de orientacao escolar', rotulos: ['Motivo do encaminhamento', 'Relato da familia', 'Relato da crianca', 'Sugestao'] },
  { id: 'pediatria', nome: 'Anotacao antiga de pediatria', rotulos: ['Idade', 'Motivo', 'Exame', 'Orientacao'] },
  { id: 'caderno', nome: 'Pagina de caderno', rotulos: ['Materia', 'Exercicio', 'Correcao', 'Margem'] },
  { id: 'carta', nome: 'Carta', rotulos: ['Para', '', '', 'Assinado'] },
  { id: 'memoria', nome: 'Transcricao de memoria', rotulos: ['Idade aproximada', 'Cena', 'O que ele diz sentir', 'Nota de quem transcreveu'] },
];

const FORMATO_POR_ID = new Map(FORMATOS.map((f) => [f.id, f]));

export interface Documento {
  id: string;
  andar: number;
  secao: SecaoDeArquivo;
  formato: FormatoDocumento;
  titulo: string;
  corpo: readonly [string, string, string, string];
}

/** Uma linha da tabela: [formato, titulo, campo1, campo2, campo3, campo4]. */
type LinhaDoc = readonly [string, string, string, string, string, string];

// =========================================================================
// TRABALHO — andares 51 a 100
// =========================================================================
const TRABALHO: readonly LinhaDoc[] = [
  // ------------------------------------ 51-60 Produtividade --
  ['saude_ocupacional', 'Admissional',
    'Admissional, sem restricao.',
    'Nenhuma. Diz estar "no melhor momento".',
    'Pressao 12 por 8. Sono referido de sete horas.',
    'Liberado para a funcao. Retorno periodico em doze meses.'],
  ['avaliacao', 'Primeiro trimestre',
    'Primeiro trimestre.',
    'Entrega no prazo em todas as demandas. Assume tarefa de colega sem ser pedido.',
    'Nenhum registrado.',
    'Acima do esperado. Sugerido para a fila de promocao.'],
  ['email', 'Obrigado pelo sabado',
    'Coordenacao',
    'Obrigado pelo sabado',
    'So passando pra agradecer. Voce salvou a entrega. Nao precisava, mas salvou.',
    'Descansa amanha, ta?'],
  ['jornada', 'Espelho — mes 4',
    'Mes 4.',
    'Oito horas e vinte.',
    'Quatro horas no mes, todas em dia util.',
    'Dentro do limite. Nada a apontar.'],
  ['questionario', 'Autorrelato trimestral',
    'Voce consegue se desligar do trabalho fora do expediente?',
    'Consigo. So olho as mensagens pra saber se pegou fogo.',
    'Com que frequencia isso acontece?',
    'Todo dia, mas e rapido.'],
  ['chamado', 'INC-2214',
    'INC-2214 — fila de processamento parada.',
    'Fila parou as 23h10. Ninguem viu ate as 07h.',
    'Falha em servico de terceiro.',
    'Ele entrou sozinho as 23h40. Ninguem o acionou.'],
  ['avaliacao', 'Segundo trimestre',
    'Segundo trimestre.',
    'Disponibilidade. A equipe cita o nome dele quando pergunta quem responde de madrugada.',
    'Concentra conhecimento. Nao delega.',
    'Acima do esperado. Recomendado repartir contexto com o time.'],
  ['terapia', 'Sessao 1',
    'Primeira sessao, encaminhado pelo plano da empresa.',
    'Veio porque "anda dormindo mal", e acha que e caso de trocar o colchao.',
    'Fala do trabalho sem eu perguntar, nos primeiros dois minutos.',
    'Combinado quinzenal. Sem meta por enquanto.'],
  ['jornada', 'Espelho — mes 7',
    'Mes 7.',
    'Nove horas e dez.',
    'Dezenove horas no mes. Seis delas em fim de semana.',
    'Acima do limite do acordo. Enviado alerta automatico a chefia.'],
  ['rh', 'Aviso automatico de jornada',
    'Aviso automatico de jornada',
    'Este e um aviso gerado pelo sistema. Ele nao implica sancao.',
    'Recomendamos compensar as horas nas proximas duas semanas.',
    'Nenhum. Aviso arquivado sem resposta do colaborador.'],

  // ---------------------------------------------- 61-70 Prazos --
  ['incidente', 'Entrega adiada',
    'Entrega adiada em dois dias por dependencia externa.',
    'Cliente escalou para a diretoria.',
    'Dependencia de terceiro. Fora do controle da equipe.',
    'Nenhuma. Registrado para historico.'],
  ['email', 'Da pra virar hoje?',
    'Gerencia de contas',
    'Da pra virar hoje?',
    'O cliente pediu pra antecipar. Sei que e sacanagem. Se nao der, tudo bem.',
    'Ele respondeu "da" as 19h04. A mensagem foi enviada as 19h02.'],
  ['jornada', 'Espelho — mes 11',
    'Mes 11.',
    'Dez horas e quarenta.',
    'Trinta e uma horas no mes.',
    'Segundo mes consecutivo acima do limite.'],
  ['terapia', 'Sessao 6',
    'Sono.',
    'Acorda entre tres e quatro da manha pensando em chamado aberto. Levanta e olha o celular.',
    'Chama isso de "resolver antes que vire problema". Nao chama de acordar.',
    'Combinado deixar o celular fora do quarto por duas semanas.'],
  ['terapia', 'Sessao 8',
    'O combinado do celular.',
    'Cumpriu quatro noites. Na quinta houve uma parada e ele voltou atras.',
    'Contou como quem confessa. Nao pedi explicacao, e ele deu tres.',
    'Retomar sem prazo. O acordo era o teste, nao a regra.'],
  ['chamado', 'INC-3390',
    'INC-3390 — indisponibilidade de duas horas.',
    'Servico fora do ar entre 02h e 04h.',
    'Configuracao aplicada por rotina automatizada.',
    'Ele assumiu a causa em reuniao. A rotina nao era dele.'],
  ['avaliacao', 'Quarto trimestre',
    'Quarto trimestre.',
    'Continua entregando. Continua respondendo fora do horario.',
    'Reage a critica tecnica como critica pessoal.',
    'Dentro do esperado. Sugerido acompanhamento com a lideranca.'],
  ['saude_ocupacional', 'Periodico',
    'Periodico anual.',
    'Refere cansaco, dor de cabeca no fim do dia e "cabeca cheia".',
    'Pressao 13 por 9. Tensao cervical. Sono referido de cinco horas.',
    'Orientado reduzir carga. Encaminhado a avaliacao clinica.'],
  ['questionario', 'Autorrelato semestral',
    'Voce consegue se desligar do trabalho fora do expediente?',
    'Nao muito. Mas e uma fase.',
    'Ha quanto tempo essa fase dura?',
    'Nao sei. Um ano, talvez.'],
  ['rh', 'Convite para conversa',
    'Convite para conversa sobre carga de trabalho',
    'Seu espelho de ponto acendeu alerta por tres meses seguidos.',
    'A conversa e voluntaria e nao entra em avaliacao.',
    'Reagendada duas vezes pelo colaborador. Nao realizada.'],

  // ----------------------------------------------- 71-80 Falha --
  ['incidente', 'Publicacao revertida',
    'Publicacao revertida em producao.',
    'Trinta e cinco minutos de degradacao para parte dos clientes.',
    'Cobertura de teste insuficiente para o caso de borda.',
    'Revisao do processo de teste. Sem apontamento individual.'],
  ['terapia', 'Sessao 14',
    'A publicacao revertida.',
    'Descreve o erro em detalhe tecnico por vinte minutos. Sabe a linha exata.',
    'Quando pergunto o que ele sentiu, responde de novo o que aconteceu.',
    'Voltar ao assunto. Nao insistir hoje.'],
  ['email', 'Sobre ontem',
    'Colega de equipe',
    'Sobre ontem',
    'Cara, o rollback foi tranquilo, ninguem morreu. Para de se cobrar.',
    'Serio. Para.'],
  ['chamado', 'INC-4102',
    'INC-4102 — lentidao intermitente.',
    'Relatos esparsos de lentidao, sem padrao.',
    'Nao identificada. Chamado fechado por inatividade.',
    'Ele reabriu o chamado tres vezes em duas semanas, por conta propria.'],
  ['avaliacao', 'Sexto trimestre',
    'Sexto trimestre.',
    'Profundidade tecnica. E a referencia do time no sistema legado.',
    'Queda de ritmo. Retrabalho por revisao excessiva do proprio codigo.',
    'Dentro do esperado, com atencao. Sugerido dividir a frente com outra pessoa.'],
  ['jornada', 'Espelho — mes 20',
    'Mes 20.',
    'Onze horas e cinco.',
    'Quarenta e duas horas no mes.',
    'Alerta acumulado. Bloqueio automatico de novas horas solicitado a chefia.'],
  ['terapia', 'Sessao 19',
    'A palavra "culpa".',
    'Usou a palavra sete vezes em cinquenta minutos, todas sobre incidente tecnico.',
    'Nenhuma vez sobre pessoa. So sobre sistema.',
    'Trabalhar a diferenca entre responsabilidade e culpa.'],
  ['questionario', 'Autorrelato trimestral',
    'Quando algo falha, de quem costuma ser a responsabilidade?',
    'Minha. Sempre da pra ter previsto.',
    'Isso vale para falha de terceiro tambem?',
    'Vale. Eu escolhi o terceiro.'],
  ['incidente', 'Perda de dado de teste',
    'Perda de dado em ambiente de teste.',
    'Nenhum. Ambiente reconstruido em uma hora.',
    'Comando executado no terminal errado.',
    'Ele pediu para registrar o proprio nome no campo de causa. Recusado pelo processo.'],
  ['rh', 'Retorno da conversa',
    'Retorno da conversa sobre carga',
    'A conversa ocorreu. O colaborador declarou estar bem e recusou reducao de escopo.',
    'Registrado que a oferta foi feita.',
    'Reavaliar em noventa dias.'],

  // ---------------------------------------- 81-90 Sempre Ligado --
  ['jornada', 'Espelho — mes 24',
    'Mes 24.',
    'Onze horas e trinta.',
    'Cinquenta e uma horas no mes. Vinte e duas de madrugada.',
    'Padrao de acesso ao sistema entre 01h e 04h em dezoito dos trinta dias.'],
  ['email', 'Ferias',
    'Coordenacao',
    'Ferias',
    'Voce tem 42 dias acumulados. O RH me cobrou. Marca alguma coisa.',
    'Nem que seja uma semana.'],
  ['terapia', 'Sessao 26',
    'Ferias.',
    'Marcou uma semana. Levou o notebook. Trabalhou em tres dos sete dias.',
    'Descreve os outros quatro dias como "perdidos".',
    'Trabalhar o que "perdido" quer dizer aqui.'],
  ['questionario', 'Autorrelato semestral',
    'Voce consegue aproveitar o tempo livre?',
    'Consigo, mas fica uma coisa no fundo. Como se eu tivesse esquecido de algo.',
    'O que costuma ser?',
    'Nunca e nada. Mas eu olho pra ter certeza.'],
  ['chamado', 'INC-5533',
    'INC-5533 — alerta falso recorrente.',
    'Alerta dispara sem incidente, em media nove vezes por noite.',
    'Limiar mal calibrado. Correcao pendente ha cinco meses.',
    'Ele acorda com todos. Pediu para nao silenciar "por seguranca".'],
  ['saude_ocupacional', 'Retorno clinico',
    'Retorno de avaliacao clinica.',
    'Palpitacao ao ler mensagem de trabalho. Aperto no peito sem esforco fisico.',
    'Exames cardiologicos sem alteracao.',
    'Encaminhado a avaliacao em saude mental. Sugerido afastamento parcial.'],
  ['afastamento', 'Primeira recomendacao',
    'Quinze dias.',
    'Quadro de exaustao com sintoma fisico associado.',
    'Sem acesso a sistema corporativo no periodo.',
    'Recusada pelo colaborador. Registrada a recusa.'],
  ['avaliacao', 'Nono trimestre',
    'Nono trimestre.',
    'Nenhum destacado neste ciclo.',
    'Prazo perdido em duas frentes. Ausencia em ritual de equipe.',
    'Abaixo do esperado. Primeira vez na serie historica dele.'],
  ['terapia', 'Sessao 33',
    'A avaliacao.',
    'Leu o parecer quatro vezes. Sabe o texto de cor.',
    'Disse: "entao acabou". Perguntei o que acabou. Nao respondeu.',
    'Aumentar frequencia para semanal. Ele aceitou sem discutir, o que e novo.'],
  ['email', 'Nao respondida',
    'Ele mesmo, rascunho salvo',
    '(sem assunto)',
    'Acho que eu preciso parar um pouco. Nao sei como escrever isso sem parecer',
    '[rascunho interrompido, nunca enviado]'],

  // ------------------------------------------- 91-100 Colapso --
  ['incidente', 'Ausencia em plantao',
    'Nao atendeu acionamento de plantao por quatro horas.',
    'Escalonamento acionou o suplente. Sem impacto a cliente.',
    'Nao apurada.',
    'Ele estava em casa, acordado, com o celular na mao.'],
  ['terapia', 'Sessao 38',
    'O plantao nao atendido.',
    'Diz que viu o alerta e nao conseguiu tocar na tela. Ficou olhando ate parar.',
    'Primeira vez que descreve sintoma sem transformar em problema tecnico.',
    'Nomeado o quadro com ele. Ele nao discordou.'],
  ['afastamento', 'Segunda recomendacao',
    'Trinta dias, prorrogaveis.',
    'Exaustao com prejuizo funcional. Episodios de bloqueio diante de demanda.',
    'Sem acesso a sistema corporativo. Sem contato de equipe.',
    'Aceita. Iniciada nesta data.'],
  ['jornada', 'Espelho — mes 31',
    'Mes 31, parcial.',
    'Quatro horas e dez.',
    'Zero.',
    'Primeiro mes sem acesso fora de expediente em vinte e nove meses.'],
  ['rh', 'Comunicado de afastamento',
    'Comunicado interno de afastamento',
    'O colaborador esta afastado por recomendacao medica.',
    'Suas frentes foram redistribuidas. Nao ha prazo de retorno definido.',
    'Arquivado.'],
  ['terapia', 'Sessao 44',
    'O que sobrou.',
    'Fala pela primeira vez de algo que nao e trabalho: uma bancada de conserto na casa do avo.',
    'A voz muda. Anotei isso porque foi visivel.',
    'Explorar. Sem transformar em plano.'],
  ['questionario', 'Autorrelato de retorno',
    'O que voce quer que seja diferente?',
    'Eu queria que trabalhar nao fosse a unica coisa que eu sei fazer bem.',
    'Voce acha que e a unica?',
    'Nao sei. Nunca testei outra.'],
  ['terapia', 'Sessao 51',
    'A decisao.',
    'Trouxe pesquisa de cidade pequena, custo de vida, ponto comercial de oficina.',
    'Nao e fuga romantica: ele fez planilha. Continua sendo ele.',
    'Apoiada a decisao. Alertado que mudar de lugar nao muda o padrao sozinho.'],
  ['rh', 'Desligamento a pedido',
    'Desligamento a pedido',
    'Solicitado pelo colaborador ao fim do afastamento.',
    'Sem pendencia. Elegivel a recontratacao.',
    'Encerrado o vinculo nesta data.'],
  ['terapia', 'Sessao 58 — ultima antes da mudanca',
    'Encerramento e transferencia.',
    'Vai para Santa Aurora em dezoito dias. A oficina ja tem endereco.',
    'Perguntei quando comecou. Ele respondeu o primeiro emprego. Eu disse que nao perguntei isso.',
    'Ele ficou quieto e disse: "entao muito antes". Transferencia encaminhada. O prontuario '
      + 'de la comeca no dia 1.'],
];

// =========================================================================
// INFANCIA — andares 101 a 150
// =========================================================================
const INFANCIA: readonly LinhaDoc[] = [
  // -------------------------------------------- 101-110 Memoria --
  ['boletim', 'Boletim, 1a serie',
    'Primeiro ano.',
    'Todas acima da media da turma.',
    'Integral.',
    'Crianca atenta. Termina antes dos colegas e espera em silencio.'],
  ['desenho', 'Casa com sol',
    'Uma casa, um sol no canto, tres pessoas do lado de fora.',
    '"pra mamae"',
    'Nada.',
    'Guardado numa pasta com mais quarenta.'],
  ['bilhete', 'Bilhete na agenda',
    'Ele leu a pagina inteira sozinho hoje.',
    'Contei pra turma e ele ficou vermelho, mas queria que eu contasse de novo.',
    'So achei bonito e quis avisar.',
    'Prof. Dalva'],
  ['pediatria', 'Consulta de rotina',
    'Sete anos.',
    'Rotina anual.',
    'Peso e altura na faixa. Sem queixa.',
    'Nada a acrescentar. Retorno em um ano.'],
  ['caderno', 'Pagina de matematica',
    'Matematica.',
    'Doze contas de somar.',
    'Doze certas. Visto e estrela.',
    'Na margem, com lapis mais fino: "fazer mais".'],
  ['boletim', 'Boletim, 2a serie',
    'Segundo ano.',
    'Todas acima da media. Uma nota abaixo do proprio bimestre anterior.',
    'Integral.',
    'Perguntou tres vezes por que a nota caiu. A nota era 9,2.'],
  ['diario', 'Folha solta de caderno',
    'hoje eu errei uma na prova',
    'nao foi a professora que falou nada',
    'eu que sei',
    ''],
  ['bilhete', 'Bilhete na agenda',
    'Ele apagou o exercicio inteiro tres vezes hoje ate ficar sem borracha.',
    'O exercicio estava certo desde a primeira.',
    'Nao repreendi. Achei melhor voces saberem.',
    'Prof. Dalva'],
  ['memoria', 'Transcricao — a estrela',
    'Sete ou oito anos.',
    'Uma estrela adesiva colada no caderno, e a mae mostrando pra visita.',
    'Diz que sentiu alivio. Nao alegria.',
    'Ele corrigiu a palavra sozinho, duas vezes, ate achar "alivio".'],
  ['recado_casa', 'Recado na geladeira',
    'Filho, cheguei tarde de novo.',
    'Tem comida no fogao. Vi seu boletim em cima da mesa.',
    'Muito orgulho de voce, serio.',
    'Amanha a gente conversa direito.'],

  // ---------------------------------------- 111-120 Expectativa --
  ['boletim', 'Boletim, 4a serie',
    'Quarto ano.',
    'A maior media da turma.',
    'Integral.',
    'Indicado para a turma avancada de matematica no ano seguinte.'],
  ['carta', 'Carta do avo',
    'Para o meu neto',
    'Fiquei sabendo da turma avancada. Sua mae ligou so pra contar.',
    'Quando vier no feriado a bancada ta arrumada, a gente conserta o radio.',
    'Vovo Anselmo'],
  ['orientacao', 'Encaminhamento a orientacao',
    'Choro apos avaliacao com nota 8,5.',
    'A familia diz que nunca cobrou nota. Acredito.',
    'A crianca diz que "8,5 nao e a nota dele".',
    'Conversa com a familia sobre elogio focado em resultado.'],
  ['diario', 'Folha de diario',
    'a tia falou que eu sou o mais inteligente da sala',
    'agora se eu errar vai ser pior',
    'nao sei como conta isso pra alguem',
    ''],
  ['caderno', 'Pagina de portugues',
    'Portugues.',
    'Redacao: "O que eu quero ser".',
    'Nota maxima. "Muito bem escrito!"',
    'Na margem, apagado e ainda legivel: "isso e o que eu quero ou o que eles querem".'],
  ['bilhete', 'Bilhete na agenda',
    'Ele nao quis apresentar o trabalho na frente da turma.',
    'Disse que ia esquecer alguma parte. O trabalho estava decorado inteiro.',
    'Deixei ele entregar escrito. Nao insisti.',
    'Prof. Dalva'],
  ['memoria', 'Transcricao — a visita',
    'Nove anos.',
    'A mae apresentando ele a uma visita como "o inteligente".',
    'Diz que gostou, e que depois passou a semana com medo de a visita voltar.',
    'Perguntei do que ele tinha medo. Respondeu: "de ela ver que nao era verdade".'],
  ['boletim', 'Boletim, 5a serie',
    'Quinto ano.',
    'A maior media da escola.',
    'Integral.',
    'Homenageado na formatura. Nao subiu ao palco.'],
  ['recado_casa', 'Recado na geladeira',
    'Fui direto do plantao pra outra coisa, desculpa.',
    'Se der conta do dever sozinho hoje me ajuda muito.',
    'Voce sempre da conta.',
    'Bj'],
  ['pediatria', 'Consulta',
    'Dez anos.',
    'Dor de barriga recorrente, sempre em semana de prova.',
    'Sem alteracao. Abdome normal.',
    'Orientado a familia observar. Sem medicacao.'],

  // ------------------------------------------ 121-130 Perfeicao --
  ['caderno', 'Pagina refeita',
    'Historia.',
    'Linha do tempo, copiada tres vezes na mesma folha.',
    'A primeira copia ja estava certa.',
    'Na margem: "a letra tava feia".'],
  ['orientacao', 'Segundo encaminhamento',
    'Recusa de entregar trabalho considerado "nao bom o suficiente".',
    'A familia relata que ele passa a noite refazendo sem pedirem.',
    'Ele diz: "se eu entregar assim, e como se eu nao soubesse".',
    'Sugerido combinar prazo de parada. Nao de qualidade.'],
  ['bilhete', 'Bilhete da professora nova',
    'Sou nova na turma e queria entender uma coisa.',
    'Ele pede pra refazer prova que tirou 9. Ja disse que nao precisa e ele insiste.',
    'Alguem em casa cobra isso?',
    'Prof. Renata'],
  ['recado_casa', 'Resposta ao bilhete',
    'Professora, ninguem cobra nada dele aqui.',
    'A gente ate pede pra parar. Ele para na frente da gente e continua depois.',
    'Se souber o que fazer, me fala, porque eu nao sei.',
    'Mae'],
  ['diario', 'Folha de diario',
    'refiz o trabalho de novo',
    'nao ta melhor',
    'so ta mais tempo',
    ''],
  ['boletim', 'Boletim, 7a serie',
    'Setimo ano.',
    'Todas maximas. Uma disciplina com media 9,7.',
    'Duas faltas.',
    'As duas faltas foram no dia da entrega do trabalho de artes.'],
  ['memoria', 'Transcricao — a comparacao',
    'Doze anos.',
    'Um primo com nota mais baixa sendo elogiado por ter "se esforcado".',
    'Diz que entendeu ali que o esforco dele nao contava, porque dele ja se esperava.',
    'Ele nao usou a palavra injusto. Usou "logico".'],
  ['orientacao', 'Devolutiva a familia',
    'Acompanhamento do caso.',
    'A familia comparece, colabora e esta genuinamente preocupada.',
    'A crianca minimiza tudo em minha frente e refaz tudo em casa.',
    'Nada aqui e culpa de ninguem. E um padrao, e padrao se aprende de varios lugares ao mesmo tempo.'],
  ['carta', 'Carta do avo',
    'Para o meu neto',
    'Voce me perguntou como eu sabia que o radio ia funcionar antes de ligar.',
    'Nao sabia. Ligava e via. Errar na bancada nao e igual errar na prova, moleque.',
    'Vovo Anselmo'],
  ['desenho', 'Desenho de ninguem',
    'Uma casa, um sol, e o lugar das pessoas em branco.',
    'Nada escrito.',
    'No verso, riscado ate furar: um rosto.',
    'Achado dobrado dentro de um livro didatico.'],

  // ----------------------------------------------- 131-140 Medo --
  ['diario', 'Folha rasgada',
    'se eu contar que eu nao entendi a materia',
    'eles vao achar que os outros anos foram sorte',
    'entao eu nao conto e estudo escondido',
    ''],
  ['caderno', 'Pagina com a margem cheia',
    'Fisica.',
    'Lista de exercicios, incompleta.',
    'Sem correcao. Nao entregue.',
    'Na margem, a mesma frase quatorze vezes: "eu devia saber isso".'],
  ['orientacao', 'Registro de queda',
    'Queda de rendimento no segundo semestre.',
    'A familia atribui a adolescencia. Nao insisti.',
    'Ele diz que esta tudo bem. Repetiu tres vezes sem eu perguntar de novo.',
    'Manter observacao. Nao forcar.'],
  ['pediatria', 'Consulta',
    'Quinze anos.',
    'Insonia. Refere "nao conseguir desligar a cabeca".',
    'Sem alteracao clinica.',
    'Orientado higiene do sono. Sugerida avaliacao psicologica; a familia agradeceu e nao levou.'],
  ['bilhete', 'Bilhete nao entregue',
    'Achei este bilhete dentro do armario dele no fim do ano.',
    'Estava escrito pra mim e nunca chegou.',
    'Dizia so: "professora eu acho que eu nao sou o que voces acham".',
    'Prof. Renata'],
  ['memoria', 'Transcricao — o armario',
    'Quinze anos.',
    'Guardar prova ruim no fundo do armario em vez de levar pra assinar.',
    'Diz que nao foi por medo de bronca. Foi por medo da cara de decepcao.',
    'Perguntei se a cara chegou a acontecer alguma vez. Ele disse que nao. Nunca.'],
  ['diario', 'Folha de diario',
    'hoje eu fingi que sabia',
    'e deu certo',
    'foi pior',
    ''],
  ['recado_casa', 'Recado na geladeira',
    'Amor, chegou carta da escola.',
    'Nao abri. Se voce quiser falar a gente fala, se nao quiser tudo bem tambem.',
    'So nao carrega sozinho.',
    'Mae'],
  ['carta', 'Ultima carta do avo',
    'Para o meu neto',
    'Sua mae disse que voce anda calado. Eu tambem era, nao serve de desculpa.',
    'A bancada continua aqui. Nao precisa consertar nada pra vir.',
    'Vovo Anselmo'],
  ['orientacao', 'Encerramento do acompanhamento',
    'Conclusao do ensino medio.',
    'A familia agradece e informa aprovacao em curso superior.',
    'Ele passou pelo corredor, acenou e nao entrou.',
    'Encerrado. Sem indicacao de seguimento.'],

  // ---------------------------------------------- 141-150 Origem --
  ['memoria', 'Transcricao — a bancada',
    'Dezessete anos.',
    'A ultima vez na bancada do avo, ja depois do velorio.',
    'Diz que consertou o radio sozinho e nao teve pra quem mostrar.',
    'Foi a unica cena, em cinquenta e oito sessoes, que ele contou sem ser perguntado.'],
  ['boletim', 'Historico do ensino medio',
    'Tres anos.',
    'Media geral 9,4. Nenhuma recuperacao.',
    'Integral, com duas faltas em tres anos.',
    'Aprovado em primeira chamada. Nenhuma observacao pedagogica em todo o periodo.'],
  ['diario', 'Folha de diario, ultima do caderno',
    'passei',
    'todo mundo falou que era obvio',
    'entao nao contou',
    ''],
  ['carta', 'Carta que ele escreveu e nao mandou',
    'Vo',
    'Consertei o radio. Pegou na terceira tentativa, igual voce falava.',
    'Voce disse que errar na bancada nao e igual errar na prova. Eu acho que eu nunca aprendi a diferenca.',
    '(sem assinatura)'],
  ['memoria', 'Transcricao — a primeira vez',
    'Nao definida. Ele diz "sempre".',
    'Perguntei quando comecou a achar que descansar tinha de ser merecido.',
    'Ele disse que nao lembra de ter achado outra coisa.',
    'Nao ha primeira vez. E isso que torna dificil.'],
  ['orientacao', 'Copia arquivada',
    'Copia da ficha de encaminhamento aos nove anos.',
    'O campo "relato da familia" diz: nunca cobramos nota.',
    'O campo "relato da crianca" diz: eu que quero.',
    'As duas coisas eram verdade. Era esse o problema.'],
  ['desenho', 'O desenho de novo',
    'Uma casa, um sol, e tres pessoas do lado de fora.',
    'No canto, com letra de adulto: "ele desenhou de novo, aos 26".',
    'No verso: uma quarta figura, menor, apagada.',
    'Nao consta quem guardou.'],
  ['memoria', 'Transcricao — a pergunta',
    'Vinte e seis anos.',
    'Ele pergunta se da pra desaprender.',
    'Digo que da pra aprender por cima. Ele pergunta se e a mesma coisa.',
    'Nao e, e eu disse que nao e.'],
  ['pediatria', 'Folha fora de lugar',
    'Idade nao preenchida.',
    'Campo em branco.',
    'Campo em branco.',
    'Esta folha nao pertence a nenhum dos tres arquivos. O cabecalho traz um numero de secao '
      + 'que nao existe nesta usina.'],
  ['memoria', 'Transcricao — a folha que falta',
    'Nao aplicavel.',
    'O arquivo de infancia tem cinquenta folhas e cinquenta e uma referencias.',
    'A referencia 151 aparece no rodape de tres delas e nao aponta pra nada aqui.',
    'Abaixo desta sala ha uma porta de contencao lacrada por dentro. O visor dela diz 151-200. '
      + 'Nao ha chave, nao ha painel e nao ha corredor de volta que passe por ela.'],
];

// ------------------------------------------------------------- montagem --
function montar(linhas: readonly LinhaDoc[], primeiroAndar: number): Documento[] {
  return linhas.map((linha, i) => {
    const andar = primeiroAndar + i;
    const formato = FORMATO_POR_ID.get(linha[0]);
    if (!formato) throw new Error(`[documentos] andar ${andar} usa formato "${linha[0]}", que nao existe`);
    const secao = secaoDoAndar(andar);
    return {
      id: `${secao.prefixo}_${String(andar).padStart(3, '0')}`,
      andar,
      secao: secao.id,
      formato,
      titulo: linha[1],
      corpo: [linha[2], linha[3], linha[4], linha[5]] as const,
    };
  });
}

if (TRABALHO.length !== 50) {
  throw new Error(`[documentos] o arquivo de trabalho tem ${TRABALHO.length} folha(s), esperava 50`);
}
if (INFANCIA.length !== 50) {
  throw new Error(`[documentos] o arquivo de infancia tem ${INFANCIA.length} folha(s), esperava 50`);
}

export const DOCUMENTOS: readonly Documento[] = [
  ...montar(TRABALHO, 51),
  ...montar(INFANCIA, 101),
];

const DOC_POR_ID = new Map(DOCUMENTOS.map((d) => [d.id, d]));
const DOC_POR_ANDAR = new Map(DOCUMENTOS.map((d) => [d.andar, d]));

export function buscarDocumento(id: unknown): Documento | null {
  return typeof id === 'string' ? (DOC_POR_ID.get(id) ?? null) : null;
}

export function documentoDoAndar(andar: unknown): Documento | null {
  return typeof andar === 'number' ? (DOC_POR_ANDAR.get(andar) ?? null) : null;
}

/**
 * O texto do documento, em linhas.
 *
 * Rotulo vazio sai como linha solta — e o que faz um bilhete de professora
 * parecer bilhete e um espelho de ponto parecer formulario, com a mesma
 * funcao de montagem.
 */
export function linhasDoDocumento(d: Documento): string[] {
  const cabeca = `${d.formato.nome.toUpperCase()} — ${d.titulo}`;
  const corpo = d.corpo.map((texto, i) => {
    const rotulo = d.formato.rotulos[i];
    if (!texto) return '';
    return rotulo ? `${rotulo}: ${texto}` : texto;
  });
  return [cabeca, `Andar ${d.andar}`, ...corpo.filter(Boolean)];
}

/** Titulo curto pra lista de Arquivos. */
export function tituloDoDocumento(d: Documento): string {
  return `${String(d.andar).padStart(3, '0')}  ${d.titulo}`;
}

/** Todo texto de documento por id de aviso — entra em `ITENS_DE_LEITURA`. */
export const TEXTOS_DE_DOCUMENTO: Record<string, string[]> = Object.fromEntries(
  DOCUMENTOS.map((d) => [d.id, linhasDoDocumento(d)]),
);

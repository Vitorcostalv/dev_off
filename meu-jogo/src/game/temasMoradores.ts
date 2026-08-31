import type { ReacaoTema, TemaDeConversa } from './dialogo.ts';

/**
 * TEMAS DE CONVERSA DOS 24 MORADORES dos Mapas 2 e 3.
 *
 * Ate aqui `TEMAS_POR_NPC` so tinha os nove NPCs do Mapa 1, e o menu de conversa
 * dos moradores abria com duas opcoes fixas ("Perguntar sobre o dia" e "Dar um
 * presente") — a diferenca ficava gritante depois de falar com o Edu ou a Alice,
 * que tem tres ou quatro temas rotativos por dia.
 *
 * Cada tema sai do PERFIL da pessoa em `moradores.ts`: o que ela gosta de
 * conversar, o que passa batido e o que fecha a cara. A regra que a conferencia
 * cobra (`npm run verificar-relacoes`) e a mesma dos nove originais: 5 a 8 temas
 * por adulto, 3 a 4 por crianca, pelo menos um `gosta` e um `nao_gosta`, e 2 ou
 * 3 variacoes de texto por tema para a mesma escolha nao devolver sempre a mesma
 * resposta.
 *
 * As variacoes mudam o FRASEADO, nao o conteudo: dizem a mesma coisa, no mesmo
 * humor. Quem sorteia qual sai e `falasDoTema`.
 */

/** Atalho de escrita: um tema com suas variacoes, sem repetir as chaves. */
const t = (
  id: string,
  rotulo: string,
  reacao: ReacaoTema,
  ...variacoes: string[][]
): TemaDeConversa => ({ id, rotulo, reacao, variacoes });

export const TEMAS_MORADORES: Record<string, readonly TemaDeConversa[]> = {
  // ---------------------------------------------------------------- LIVIA --
  // Diretora. Clara e didatica, acolhe primeiro e cobra depois. O que a tira do
  // serio e sugestao de atalho por cima da regra.
  livia: [
    t('escola', 'Como esta a escola esse ano?', 'gosta',
      ['Cheia, e isso ja e vitoria.', 'Matricula nao me tira o sono. Quem some no meio do ano, sim.'],
      ['Vai bem. Trocamos a calha da sala tres nas ferias.', 'Parece pouco. Aluno repara em tudo.']),
    t('oficinas', 'Ouvi falar de oficinas no contraturno.', 'gosta',
      ['Ouviu direito. Marcenaria, horta, leitura em voz alta.', 'Se o menino tem onde estar de tarde, ele nao some da chamada de manha.'],
      ['E o projeto que eu mais quero de pe.', 'Nao e sobre nota. E sobre ter motivo pra voltar amanha.']),
    t('encadernacao', 'Isso ai e um livro costurado a mao?', 'gosta',
      ['E. Aprendi com a Clara, devolvendo favor por favor.', 'Costurar caderno acalma. Nao tem reuniao no meio.'],
      ['E sim. Esse aqui e o terceiro dessa leva.', 'Papel dobrado na ordem certa e a coisa mais organizada que existe.']),
    t('bairro', 'O bairro anda movimentado?', 'neutro',
      ['Anda o de sempre. Onibus, mercado, escola.', 'Movimento nao me diz muito. Silencio no horario de aula, sim.'],
      ['Nada fora do comum.', 'A gente mede o bairro pelo portao da escola. Hoje foi um dia normal.']),
    t('atalho', 'Da pra dar um jeitinho nessa regra?', 'nao_gosta',
      ['Nao da.', 'Regra que se dobra pra um dobra pra todos, e ai nao e mais regra. Peca do jeito certo que eu ajudo.'],
      ['Nao, e nao vou fingir que estou pensando.', 'Sou eu que assino. O jeitinho fica comigo depois.']),
  ],

  // -------------------------------------------------------------- MATHEUS --
  // Policial comunitario. Fala baixa e objetiva, ouve antes de intervir. O que
  // incomoda e ser tratado como farda, e nao como vizinho.
  matheus: [
    t('ronda', 'Como foi a ronda hoje?', 'gosta',
      ['Tranquila. Duas conversas e um portao destrancado que eu avisei.', 'Ronda boa e a que ninguem percebe.'],
      ['Sem nada. Andei, cumprimentei, voltei.', 'A parte mais util do dia foi ouvir a dona da esquina reclamar da lampada.']),
    t('radios', 'Voce conserta radio, ne?', 'gosta',
      ['Conserto. Valvula velha ainda me diverte.', 'Aparelho antigo avisa antes de quebrar. Gente tambem, se voce prestar atencao.'],
      ['Conserto. Tenho tres na bancada agora.', 'Gosto de coisa que volta a funcionar com peca original.']),
    t('xadrez', 'Joga uma partida?', 'gosta',
      ['Jogo. Mas eu demoro.', 'O Roberto reclama que eu penso demais. Ele perde do mesmo jeito.'],
      ['Jogo. Me da uma cadeira e vinte minutos.', 'Xadrez e a unica coisa que eu levo pro lado pessoal.']),
    t('quadra', 'A quadra fica cheia de tarde?', 'neutro',
      ['Fica. Molecada ate escurecer.', 'Nunca precisei ir la a trabalho. E um bom sinal.'],
      ['Fica cheia, sim.', 'Eu passo, olho e sigo. Nao faco mais que isso.']),
    t('autoridade', 'Chamo voce se acontecer alguma coisa?', 'nao_gosta',
      ['Chama. Mas nao e so pra isso que eu sirvo.', 'Moro aqui. Preferia que voce me chamasse antes de acontecer.'],
      ['Chama, claro.', 'So nao me trate como botao de emergencia. Isso cansa mais que o turno.']),
  ],

  // -------------------------------------------------------------- CECILIA --
  cecilia: [
    t('desenho', 'O que voce esta desenhando?', 'gosta',
      ['Uma arvore que eu inventei. Ela tem folha de tres cores.', 'Quer ver? Espera, deixa eu terminar essa parte.'],
      ['O Arthur, mas ele mexeu e ficou torto.', 'Eu vou fazer de novo. Nao ficou ruim, so ficou torto.']),
    t('folhas', 'Isso e uma colecao de folhas?', 'gosta',
      ['E! Ja tenho quarenta e duas.', 'Cada uma tem o dia que eu achei escrito atras.'],
      ['E sim, e nenhuma e repetida.', 'A minha preferida e uma vermelha que eu achei atras da escola.']),
    t('amigos', 'Voce brinca com quem?', 'neutro',
      ['Com o Arthur e o Ravi. E com a Manuela quando ela deixa.'],
      ['Com todo mundo, mais ou menos.', 'Eu esqueco o nome, mas nao esqueco a pessoa.']),
    t('ler_alto', 'Voce le bem em voz alta?', 'nao_gosta',
      ['Nao quero falar disso.', 'Eu leio. So nao gosto quando todo mundo fica olhando.'],
      ['...pode perguntar outra coisa?']),
  ],

  // ---------------------------------------------------------------- CLARA --
  clara: [
    t('livros', 'Me indica alguma coisa pra ler?', 'gosta',
      ['Indico. Mas antes: o que voce leu por ultimo e gostou?', 'Indicacao boa comeca com pergunta.'],
      ['Indico varias. O problema e escolher uma.', 'Deixa eu ver a sua cara de novo... acho que sei qual.']),
    t('arquivo', 'O que e esse arquivo da cidade?', 'gosta',
      ['E a ideia que me faz levantar cedo.', 'Foto, jornal velho, caderno de obra. A cidade tem memoria, so nao tem prateleira.'],
      ['Um lugar pra guardar o que a cidade lembra.', 'Metade ja esta em caixa na minha sala. A outra metade ainda esta na cabeca das pessoas.']),
    t('restauro', 'Da pra salvar um livro nesse estado?', 'gosta',
      ['Da. Quase sempre da.', 'Lombada solta e o mais facil. Mofo e o que me tira o sono.'],
      ['Esse ai? Da, com paciencia.', 'Cola errada estraga mais que o tempo. Ja vi muito livro morrer de conserto.']),
    t('movimento', 'Aparece muita gente na biblioteca?', 'neutro',
      ['Aparece o suficiente.', 'Quinta de manha e vazio. Eu gosto de quinta de manha.'],
      ['Uns quinze por dia, contando os que so usam a tomada.', 'Nao me importo. Tomada tambem e servico.']),
    t('barulho', 'Posso colocar um som aqui?', 'nao_gosta',
      ['Prefiro que nao.', 'Nao e frescura. Tem gente que so consegue ler aqui, e e por isso que aqui e assim.'],
      ['Aqui nao, por favor.', 'Eu nao vou brigar com voce. Vou so pedir de novo, mais baixo.']),
  ],

  // ---------------------------------------------------------------- LUCIA --
  lucia: [
    t('documentario', 'Como esta o documentario?', 'gosta',
      ['Existe! Em pastas. Muitas pastas.', 'Ja tenho quatro entrevistas boas e nenhuma ideia de ordem.'],
      ['Andando (devagar) (mas andando).', 'A Ilda me deu duas horas de gravacao. Duas HORAS. E tudo bom.']),
    t('foto', 'Voce fotografa muito na rua?', 'gosta',
      ['Todo dia. A maioria e lixo, umas tres por mes prestam.', 'Mas as tres valem as outras trezentas.'],
      ['Bastante. Gosto de gente distraida.', 'Ninguem posa direito. Gente distraida posa perfeito.']),
    t('podcast', 'Ouvi que voce grava um podcast.', 'gosta',
      ['Gravo! Tres ouvintes fieis, dois sao parentes.', 'Mas o terceiro eu nao conheco, e isso me deixa muito feliz.'],
      ['Gravo, sim.', 'E basicamente eu perguntando coisa demais pra quem topa sentar. Ou seja: e a minha vida normal, com microfone.']),
    t('biblioteca', 'Voce fica muito na biblioteca?', 'neutro',
      ['Fico. Tem tomada, silencio e a Clara.', 'Nessa ordem, dependendo do dia.'],
      ['Todo dia um pouco.', 'E o meu escritorio, sem o constrangimento de ter um escritorio.']),
    t('carreira', 'E ai, ja escolheu o que vai fazer da vida?', 'nao_gosta',
      ['Ah. Essa pergunta.', 'Todo mundo faz essa pergunta. Ninguem quer a resposta longa, e a minha e longa.'],
      ['Ainda nao, e ja sei o que voce vai dizer.', 'Vou fingir que voce nao perguntou, e a gente segue amigo.']),
  ],

  // ----------------------------------------------------------------- CAIO --
  caio: [
    t('motor', 'Consegue descobrir o barulho desse motor?', 'gosta',
      ['Consigo. Motor nao mente.', 'Barulho e recado. So precisa de alguem que escute na hora certa.'],
      ['Deixa eu ouvir.', '...correia. Aposto na correia. Se eu errar, o conserto sai de graca.']),
    t('moto', 'Essa moto e antiga?', 'gosta',
      ['E de setenta e oito. Toda dela.', 'Peca nova nela e mentira. Prefiro esperar a certa.'],
      ['Mais velha que voce, provavelmente.', 'E anda melhor que muita coisa que saiu ano passado.']),
    t('aprendiz', 'Pensou em pegar um aprendiz?', 'gosta',
      ['Penso todo dia.', 'Oficina de um homem so acaba com o homem. E eu tenho uma filha pra ver crescer.'],
      ['Ja pensei. Preciso de espaco antes.', 'Ensinar e o que eu sei fazer melhor depois de consertar.']),
    t('domino', 'Domino no bar hoje?', 'neutro',
      ['Talvez. Depende da hora que eu fechar.'],
      ['Pode ser.', 'Eu jogo calado. Ninguem reclama disso no domino.']),
    t('bruno', 'O Bruno falou que faz melhor.', 'nao_gosta',
      ['Falou, e?', 'Ele serra madeira. Eu monto motor. Nao e a mesma bancada e ele sabe disso.'],
      ['Ele fala muito.', 'Deixa quieto. Se eu comecar, a gente nao termina hoje.']),
  ],

  // --------------------------------------------------------------- HELENA --
  helena: [
    t('skate', 'Voce anda bem de skate?', 'gosta',
      ['Ando. E ando melhor que semana passada, que e o que importa.', 'Quer ver? Nao vou repetir se der errado.'],
      ['Ando. Cai bastante tambem, faz parte.', 'Tem uma manobra que eu quase pego. Quase ha um mes.']),
    t('miniaturas', 'Voce monta essas miniaturas?', 'gosta',
      ['Monto. Peca pequena me acalma.', 'Aprendi na oficina do meu pai, esperando ele terminar servico.'],
      ['Monto, sim.', 'A ultima tem quatrocentas pecas. Terminei em tres dias e nao dormi direito.']),
    t('oficina', 'Voce ajuda seu pai na oficina?', 'neutro',
      ['As vezes. Entrego ferramenta, mais que isso ele nao deixa.'],
      ['De vez em quando.', 'Ele diz que eu atrapalho. Eu diria que eu supervisiono.']),
    t('idade', 'Voce e nova demais pra isso.', 'nao_gosta',
      ['Ta.', 'Fala isso de novo depois que eu pousar a manobra.'],
      ['Todo adulto fala isso.', 'E depois pergunta como eu aprendi. Escolhe uma.']),
  ],

  // ---------------------------------------------------------------- JULIA --
  julia: [
    t('linha', 'Como e dirigir a linha todo dia?', 'gosta',
      ['E o melhor emprego que ja tive, e olha que eu tive uns ruins.', 'Cinquenta pessoas por viagem. Eu sei o ponto de quase todas.'],
      ['Gosto. Serio.', 'Rua vazia as cinco da manha e uma coisa que pouca gente ve.']),
    t('cantar', 'Voce estava cantando agora?', 'gosta',
      ['Estava! Sempre estou.', 'Motorista que canta chega inteiro no fim do turno.'],
      ['Estava, e nem percebi.', 'O Arthur diz que eu canto a mesma musica ha um ano. Ele nao esta errado.']),
    t('suculentas', 'Essas plantinhas sao suas?', 'gosta',
      ['Sao. Sao as unicas que sobrevivem a minha escala.', 'Planta que perdoa esquecimento e planta pra mim.'],
      ['Todas. Ja sao onze.', 'Cada folha caida vira vaso novo. E de graca, e e bonito.']),
    t('horario', 'Qual o proximo horario?', 'neutro',
      ['Daqui a vinte e dois minutos.', 'Nao arredondo. Arredondar e como atraso comeca.'],
      ['Tem um em vinte minutos e outro na hora cheia.']),
    t('atraso', 'Da pra esperar mais cinco minutinhos?', 'nao_gosta',
      ['Nao da.', 'Cinco pra voce e vinte pra quem esta na terceira parada. Ja atrasei por gente boa e me arrependi.'],
      ['Nao. Desculpa, mas nao.', 'Meu horario e a unica coisa que a cidade inteira confia em mim.']),
  ],

  // --------------------------------------------------------------- ARTHUR --
  arthur: [
    t('mapas', 'O que e esse mapa?', 'gosta',
      ['E a cidade! Mas com os caminhos que ninguem usa.', 'Esse tracinho aqui e um atalho. Eu testei.'],
      ['Um mapa das estradas. Eu desenho de memoria.', 'Tem uma parte que eu inventei porque nunca fui. Depois eu conserto.']),
    t('aviao', 'Esse aviao de papel voa longe?', 'gosta',
      ['Esse aqui foi da quadra ate o portao. Recorde.', 'A asa tem que ser dobrada duas vezes. Duas, nao tres.'],
      ['Voa muito! Quer que eu jogue?', 'Se cair na arvore, a culpa e do vento.']),
    t('clube', 'Voce tem um clube?', 'neutro',
      ['Tenho. Tem regra e tudo.', 'A Cecilia diz que tem regra demais. Eu acho que tem regra de menos.'],
      ['Tenho. Somos tres.', 'Pra entrar tem que saber o nome de uma estrada. Qualquer uma.']),
    t('brocolis', 'Voce come brocolis?', 'nao_gosta',
      ['Nao.', 'Ja tentei duas vezes. As duas vezes eu tinha razao.'],
      ['Nao fala essa palavra perto de mim.']),
  ],

  // ----------------------------------------------------------------- RITA --
  rita: [
    t('colcha', 'A colcha esta ficando grande.', 'gosta',
      ['Esta. Cada quadrado e uma roupa que alguem da casa usou.', 'Quando terminar, a familia inteira cabe embaixo dela. Essa e a ideia.'],
      ['Falta um canto so.', 'Estou guardando o ultimo pedaco pra quando a Julia parar quieta o suficiente pra escolher.']),
    t('horta', 'Isso tudo cresce em vaso?', 'gosta',
      ['Cresce. Terra pouca, cuidado muito.', 'Cebolinha, manjericao e uma pimenteira teimosa que ninguem colhe.'],
      ['Cresce sim, e da pra dois.', 'Quem tem varanda e nao planta nada esta desperdicando sol de graca.']),
    t('conselho', 'A senhora me da um conselho?', 'gosta',
      ['Dou dois, e o segundo e de graca.', 'Nao decida nada com fome, e nao responda nada com raiva.'],
      ['Dou. Mas conselho e como remedio: so funciona se voce tomar.', 'Faca a coisa chata primeiro. O resto do dia melhora sozinho.']),
    t('mercado', 'Foi ao mercado hoje?', 'neutro',
      ['Fui cedo. Depois das dez so tem o que ninguem quis.'],
      ['Fui. Nao trouxe nada demais.', 'Fui mais pela caminhada que pela compra.']),
    t('pressa', 'Rapidinho, so uma coisa...', 'nao_gosta',
      ['Rapidinho nao existe.', 'Senta. O que e rapido a gente resolve sentado do mesmo jeito.'],
      ['Ai, essa pressa.', 'Ja perdi mais tempo consertando coisa feita as pressas do que fazendo devagar.']),
  ],

  // -------------------------------------------------------------- ROBERTO --
  roberto: [
    t('ferrovia', 'Como era a ferrovia aqui?', 'gosta',
      ['Era o relogio da cidade. Sessenta e um a oitenta e nove.', 'Quem morava perto do ramal nao precisava de despertador.'],
      ['Passava ali, atras de onde e a quadra hoje.', 'Dois por dia, e o das seis nunca atrasou. Nunca mesmo.']),
    t('maquete', 'Isso e uma maquete de trem?', 'gosta',
      ['E o ramal antigo, na escala certa.', 'Falta o trecho da curva. E o mais dificil, e eu deixei pro fim de proposito.'],
      ['E. Levo dois anos nela.', 'Nao e brinquedo. E a unica planta que sobrou daquele traçado.']),
    t('xadrez', 'Uma partida de xadrez?', 'gosta',
      ['Aceito. Sente ai.', 'O Matheus demora quinze minutos por lance. Se voce for rapido, ja e novidade.'],
      ['Aceito. Ganho ou perco calado.', 'E o unico esporte que ainda combina comigo.']),
    t('praca', 'Passa muito tempo na praca?', 'neutro',
      ['Passo. De manha e de tarde, quando o banco esta na sombra.'],
      ['Bastante.', 'Nao converso muito. So gosto de estar onde tem gente passando.']),
    t('digital', 'Hoje isso tudo esta no celular, ne?', 'nao_gosta',
      ['Esta, e some junto quando o aparelho morre.', 'Papel eu ainda leio daqui a trinta anos. Ja provei isso.'],
      ['Esta. E ai ninguem sabe mais nada de cor.', 'Nao sou contra. So nao ponho tudo no mesmo lugar.']),
  ],

  // ----------------------------------------------------------------- ILDA --
  ilda: [
    t('historia', 'Me conta uma historia da cidade.', 'gosta',
      ['Conto, mas antes voce precisa saber onde ficava a estacao.', 'Sem isso o resto nao faz sentido. Tudo aqui foi construido em volta dela.'],
      ['Conto. Comeco por 1958, que e quando o mapa muda.', 'Se eu me alongar, me interrompe. Eu nao percebo sozinha.']),
    t('memoria_oral', 'O que e essa gravacao de memoria oral?', 'gosta',
      ['E gente velha contando o que nao esta escrito em lugar nenhum.', 'Cada pessoa que morre aqui leva um capitulo. Eu estou correndo atras.'],
      ['Vinte e duas entrevistas ate agora.', 'A Lucia me ajuda com o microfone. Eu so faco a pergunta certa e calo a boca.']),
    t('genealogia', 'Voce estuda arvore genealogica?', 'gosta',
      ['Estudo. Metade do bairro e parente da outra metade.', 'Ninguem acredita ate eu mostrar o papel.'],
      ['Estudo, sim. E um vicio caro em paciencia.', 'Achei um bisavo comum entre o Tulio e o Bruno. Os dois fingiram que ja sabiam.']),
    t('croche', 'Isso e croche?', 'neutro',
      ['E. Faco enquanto penso.', 'Nao presta pra vender. Presta pra nao ficar parada.'],
      ['E croche, sim. Nao me pergunte o que vai ser.']),
    t('decorar', 'Historia e so decorar data, ne?', 'nao_gosta',
      ['Nao e, e isso me irrita mais do que eu gostaria.', 'Data e endereco. O que interessa e quem morava la.'],
      ['Foi assim que te ensinaram, e por isso voce acha chato.', 'Nao vou discutir. Vou so contar uma coisa e voce me diz se e decoreba.']),
  ],

  // ----------------------------------------------------------------- RAVI --
  ravi: [
    t('jogo', 'Voce esta criando um jogo?', 'gosta',
      ['Estou. De tabuleiro.', 'Ja tem regra. Falta a parte de nao ficar chato no meio.'],
      ['Estou, sim... voce quer testar?', 'Ninguem testou ainda. Eu acho que esta bom.']),
    t('xadrez', 'Voce joga xadrez?', 'gosta',
      ['Jogo. Com o seu Roberto, aos sabados.', 'Ele me deixa ganhar as vezes. Eu percebo, mas nao falo.'],
      ['Jogo.', 'Gosto porque ninguem precisa conversar enquanto joga.']),
    t('quadrinhos', 'Le quadrinhos?', 'neutro',
      ['Leio. A Clara guarda os novos pra mim.'],
      ['Leio bastante.', 'Levo pra escola, mas so leio no recreio.']),
    t('atencao', 'Fala mais alto, ninguem te ouviu!', 'nao_gosta',
      ['...desculpa.', 'Eu falei. Voce e que estava conversando.'],
      ['Prefiro nao repetir.']),
  ],

  // ----------------------------------------------------------------- DAVI --
  davi: [
    t('pao', 'De onde vem esse cheiro de pao?', 'gosta',
      ['Da minha cozinha. Fermentacao longa, dezoito horas.', 'Pressa estraga pao mais que forno errado.'],
      ['Sou eu. Estou testando uma massa nova.', 'Se der certo, voce prova. Se der errado, voce nunca soube.']),
    t('padaria', 'Voce quer abrir uma padaria?', 'gosta',
      ['Quero. Pequena. Seis tipos de pao e ponto.', 'Cardapio grande e o jeito mais rapido de fazer tudo mal feito.'],
      ['Esse e o plano.', 'Ja sei o nome. Nao vou falar ainda, da azar.']),
    t('filmes', 'Voce ve filme antigo?', 'gosta',
      ['Vejo. Preto e branco de preferencia.', 'Filme antigo tem paciencia. Igual massa.'],
      ['Vejo, quase todo dia de noite.', 'E a unica hora em que eu nao estou pensando em comida.']),
    t('mercado', 'Vai ao mercado hoje?', 'neutro',
      ['Vou. Sempre vou.', 'Escolher ingrediente e metade do trabalho.'],
      ['Ja fui. De manha cedo, antes de todo mundo.']),
    t('mao', 'Como esta a sua mao?', 'nao_gosta',
      ['Esta.', 'Prefiro nao falar disso agora, se voce nao se importa.'],
      ['Melhorando, dizem.', 'Todo mundo pergunta. Ninguem pergunta o que eu ando cozinhando.']),
  ],

  // -------------------------------------------------------------- SAMANTA --
  samanta: [
    t('penteado', 'Voce fez esse penteado?', 'gosta',
      ['Fiz! Deu uma hora e quarenta e valeu cada minuto.', 'Cabelo bom levanta o dia da pessoa. Isso nao e exagero meu, e observacao.'],
      ['Fui eu. Gostou?', 'Trabalho na cozinha de casa, com espelho de porta. E o que tem.']),
    t('salao', 'Pensa em abrir um salao?', 'gosta',
      ['Penso desde os vinte.', 'Preciso de ponto, cadeira e um mes de folego. Os tres ao mesmo tempo.'],
      ['Penso todo dia, em voz alta, pra quem quiser ouvir.', 'Falar em voz alta e como eu me obrigo a nao desistir.']),
    t('cantar', 'Voce canta enquanto trabalha?', 'gosta',
      ['Canto. Cliente reclama nao, cliente canta junto.', 'Ja perdi cliente por preco. Nunca por musica.'],
      ['Canto sem perceber.', 'A Julia diz que a gente afina no mesmo tom errado. Ela nao esta errada.']),
    t('clientes', 'Tem muita cliente?', 'neutro',
      ['Tenho as minhas. Umas quinze fixas.', 'Da pra viver. Nao da pra planejar.'],
      ['Tenho um bocado, mas espalhado no mes.']),
    t('de_graca', 'Faz um precinho? Ou de graca, pela divulgacao...', 'nao_gosta',
      ['Divulgacao nao paga a tinta.', 'Eu ja faco de graca pra quem precisa. Voce nao precisa.'],
      ['Ah, essa eu ouco toda semana.', 'Faco um precinho pra quem me indica. Voce me indica?']),
  ],

  // -------------------------------------------------------------- MANUELA --
  manuela: [
    t('danca', 'Voce sabe dancar?', 'gosta',
      ['SEI! Olha!', 'Essa parte eu ainda erro, mas eu erro rapido, entao ninguem ve.'],
      ['Sei uma coreografia quase inteira.', 'Falta o final. O final e o mais dificil e o mais legal.']),
    t('adesivos', 'Sao seus esses adesivos?', 'gosta',
      ['Sao todos meus! Quer um?', 'Esse aqui nao. Esse aqui e o meu preferido.'],
      ['Sao. Eu troco com a Cecilia.', 'Ela da dois pequenos por um grande. Eu acho justo.']),
    t('escola', 'Voce gosta da escola?', 'neutro',
      ['Gosto. Do recreio principalmente.'],
      ['Mais ou menos.', 'Gosto da professora Ilda porque ela conta historia.']),
    t('esperar', 'Espera um pouquinho.', 'nao_gosta',
      ['Nao quero esperar!', 'Todo mundo fala isso e depois demora MUITO.'],
      ['Ai... quanto tempo?']),
  ],

  // --------------------------------------------------------------- RAFAEL --
  rafael: [
    t('postura', 'Minhas costas estao doendo.', 'gosta',
      ['Deixa eu ver como voce senta.', 'Quase sempre e isso. Nao e forca, e o tanto de tempo na mesma posicao.'],
      ['Levanta um pouco. Isso, assim.', 'Duas pausas de dois minutos por hora resolvem mais que qualquer pomada.']),
    t('corrida', 'Voce corre todo dia?', 'gosta',
      ['Quase. Cinco dias, dois de descanso.', 'Descanso e treino tambem. Demorei anos pra aceitar isso.'],
      ['Corro cedo, antes do primeiro paciente.', 'Comeca com dez minutos. Serio, dez. Nao comece com trinta.']),
    t('comunitario', 'O que e esse atendimento comunitario?', 'gosta',
      ['Atender quem nao chega ate a clinica.', 'Idoso com joelho ruim nao sobe ladeira pra tratar o joelho ruim.'],
      ['A ideia e simples: eu vou ate a pessoa.', 'Falta lugar e falta horario. Vontade sobra.']),
    t('academia', 'A academia enche?', 'neutro',
      ['Enche de manha e depois das seis.', 'No meio do dia e so eu e a Mari.'],
      ['Depende do dia.', 'Segunda e sempre cheia. Sempre.']),
    t('cafe', 'Aceita um cafe?', 'nao_gosta',
      ['Nao, obrigado. Cafe e eu nao nos damos.', 'Ja tentei gostar por educacao. Nao rolou.'],
      ['Cafe nao, desculpa.', 'Aceito agua. Aceito muita agua, na verdade.']),
  ],

  // ---------------------------------------------------------------- SUZAN --
  suzan: [
    t('festival', 'Me fala desse festival.', 'gosta',
      ['Um fim de semana, tres palcos, tudo do bairro.', 'Nao precisa de nome grande. Precisa de gente que ja mora aqui e ninguem viu ainda.'],
      ['Ah, o festival. Eu falo demais dele, me avisa quando cansar.', 'Comeca pequeno, na quadra. Ano que vem cresce.']),
    t('video', 'Voce filma?', 'gosta',
      ['Filmo. Casamento, show, ensaio de danca.', 'A parte boa e montar. Montar e onde a coisa vira historia.'],
      ['Filmo tudo. Metade nem edito.', 'Mas eu guardo. Um dia isso vira arquivo, e a Clara vai me agradecer.']),
    t('gente', 'Voce conhece muita gente, ne?', 'gosta',
      ['Conheco. E o que eu tenho de melhor.', 'Nao e rede de contato. E saber quem fica bem trabalhando com quem.'],
      ['Conheco, sim. Vicio profissional.', 'Voce me diz o problema e eu ja penso em duas pessoas pra resolver.']),
    t('agenda', 'Como esta a agenda?', 'neutro',
      ['Cheia esse mes, vazia no que vem.', 'Freelancer aprende a nao olhar muito longe.'],
      ['Ocupada. Nao necessariamente paga, mas ocupada.']),
    t('visibilidade', 'Faz de graca que da visibilidade.', 'nao_gosta',
      ['Visibilidade eu ja tenho. Aluguel eu nao tenho.', 'Eu topo trocar servico. De graca, nao.'],
      ['Nossa, essa doi.', 'Eu faco de graca por causa que eu escolho. Nao por promessa de gente me ver.']),
  ],

  // ---------------------------------------------------------------- LUCAS --
  lucas: [
    t('aves', 'O que voce esta olhando ali?', 'gosta',
      ['Um bem-te-vi. Sempre o mesmo, sempre naquele poste.', 'Desculpa, eu fico assim mesmo. Levo binoculo pro trabalho.'],
      ['Tem um casal de joao-de-barro terminando a casa.', 'Leva onze dias, em media. Estou no oitavo.']),
    t('ficcao', 'Le ficcao cientifica?', 'gosta',
      ['Leio. E defendo o genero em qualquer mesa.', 'Nao e sobre nave. E sobre o que a gente faria.'],
      ['Leio muito. Talvez demais.', 'Se voce quiser comecar, eu tenho tres sugestoes e uma ordem. Ja preparei faz tempo.']),
    t('arquivologia', 'Voce quer estudar o que mesmo?', 'gosta',
      ['Arquivologia. Ninguem sabe o que e, e eu adoro explicar.', 'E cuidar do que a cidade nao pode perder. A Clara ja faz isso sem diploma.'],
      ['Arquivologia, formalmente.', 'Desculpa o tom, eu fico assim quando estou animado.']),
    t('biblioteca', 'Faz tempo que trabalha na biblioteca?', 'neutro',
      ['Faz dois anos e quatro meses.', 'Comecei substituindo alguem por quinze dias.'],
      ['Um tempo bom ja.', 'Eu organizo, a Clara decide. Funciona.']),
    t('de_fora', 'Voce nao e daqui, ne?', 'nao_gosta',
      ['Nao sou. Ja faz dois anos, mas nao sou.', 'Todo mundo pergunta isso primeiro. Ninguem pergunta se eu gosto daqui.'],
      ['Nao. Vim de fora.', 'Um dia isso para de ser a primeira coisa que perguntam. Espero.']),
  ],

  // ---------------------------------------------------------------- TULIO --
  tulio: [
    t('conserto', 'Voce conserta o que?', 'gosta',
      ['Quase tudo que nao liga na tomada. E metade do que liga.', 'Cadeira manca eu resolvo de tres jeitos. Depende do que voce tem em casa.'],
      ['Me mostra o problema que eu te digo.', 'Ja consertei portao com corda de varal. Durou dois anos.']),
    t('pesca', 'Pescou alguma coisa?', 'gosta',
      ['Pesquei uma historia boa, peixe nenhum.', 'O Joao ri de mim, mas ele tambem volta sem nada.'],
      ['Domingo eu peguei tres. Pequenos, mas tres.', 'A parte boa e as cinco da manha, quando nao tem ninguem.']),
    t('marcenaria', 'Vai montar uma marcenaria?', 'gosta',
      ['Essa e a ideia que eu carrego ha uns seis anos.', 'Nao pra fazer movel novo. Pra consertar o que a pessoa nao quer jogar fora.'],
      ['Vou. Preciso de bancada e de duas ferramentas.', 'O Bruno diz que me arruma a madeira. Ele diz muita coisa, mas essa eu acredito.']),
    t('bruno', 'O Bruno e seu primo?', 'neutro',
      ['E. Primo de primeiro grau, briga de segundo.', 'A gente se da bem trabalhando. So nao em almoco de familia.'],
      ['E sim.', 'Ele e o serio, eu sou o outro.']),
    t('emprego_fixo', 'Voce nao arruma um emprego fixo?', 'nao_gosta',
      ['Ja tive. Tres.', 'Todo mundo acha que e falta de vontade. Nao e, e eu ja cansei de explicar.'],
      ['Estou tentando, obrigado.', 'Mudar de assunto agora seria muito gentil da sua parte.']),
  ],

  // ----------------------------------------------------------------- JOAO --
  joao: [
    t('tempo', 'Vai chover?', 'gosta',
      ['Vai. Nao hoje, mas vai.', 'O vento virou de manha. Quando ele vira assim, chove em dois dias.'],
      ['Nao acho. O ceu esta limpo demais pra essa epoca.', 'E isso me preocupa mais que chuva.']),
    t('plantacao', 'Como esta a plantacao?', 'gosta',
      ['O milho esta bom. O resto esta pedindo agua.', 'Planta nao reclama. So para de crescer, que e pior.'],
      ['Melhor que ano passado, que nao e dificil.', 'Estou testando duas coisas novas num canto pequeno. Se der certo, eu aumento.']),
    t('feira', 'Voce leva pra feira?', 'gosta',
      ['Levo. Sabado de manha, barraca de sempre.', 'Vendo mais conversando que anunciando. A Neide que me ensinou isso.'],
      ['Levo o que sobra da semana, que e bastante.', 'Prefiro vender barato a ver estragando.']),
    t('radio', 'Ainda escuta radio?', 'neutro',
      ['Escuto o dia inteiro. Ate no trator.'],
      ['Escuto. Noticia e previsao, o resto e companhia.']),
    t('novidade', 'Ja pensou em fazer diferente?', 'nao_gosta',
      ['Pensei, tentei, perdi uma safra.', 'Hoje eu testo num canto pequeno. Aprendi do jeito caro.'],
      ['Todo ano aparece alguem com uma novidade.', 'Eu ouço tudo. Mudo pouco. Ate agora deu certo.']),
  ],

  // ---------------------------------------------------------------- NEIDE --
  neide: [
    t('conservas', 'Esses vidros sao seus?', 'gosta',
      ['Sao. Pimenta, pepino, geleia de tres frutas.', 'Segredo nao tem. Tem tempo e vidro fervido.'],
      ['Todos. Faco desde menina.', 'Esse ano saiu uma de figo que ficou boa demais pra vender barato.']),
    t('ervas', 'Isso serve pra que?', 'gosta',
      ['Cha. E cha bom, nao cha de desespero.', 'Boldo, erva-cidreira, hortela. Nada que substitua remedio, antes que voce pergunte.'],
      ['Pra cha e pra tempero, depende do corte.', 'Minha mae plantava as mesmas. Nao mudei uma.']),
    t('marca', 'Voce quer vender com marca propria?', 'gosta',
      ['Quero. Rotulo, nome, tudo direitinho.', 'A Suzan ficou de desenhar. Eu ja escolhi a cor.'],
      ['Esse e o plano pro ano que vem.', 'Vender solto e vender barato. Ja entendi isso.']),
    t('feira', 'Vai a feira com o Joao?', 'neutro',
      ['Vou. Ele vende, eu conto.', 'Divisao antiga, funciona.'],
      ['Todo sabado.']),
    t('cozinha', 'Quer ajuda na cozinha?', 'nao_gosta',
      ['Nao precisa.', 'Nao e desfeita. E que eu sei onde esta cada coisa e nao gosto de procurar.'],
      ['Deixa comigo.', 'Ja tentei dividir. Termina mais devagar e eu fico de mau humor.']),
  ],

  // ------------------------------------------------------------- PRISCILA --
  priscila: [
    t('numeros', 'Da pra saber se isso fecha?', 'gosta',
      ['Da. Me passa os numeros que eu te digo em dez minutos.', 'Quase sempre o problema nao e receita. E prazo.'],
      ['Da, e vai ser mais rapido do que voce imagina.', 'Gosto disso. Numero e a unica coisa que nao discute comigo.']),
    t('estudio', 'O que e esse estudio que voce quer?', 'gosta',
      ['Quatro paredes minhas, no fundo do terreno.', 'Nao e luxo. E poder fechar uma porta durante uma reuniao.'],
      ['Um comodo so meu, com mesa e tomada.', 'Ja desenhei a planta tres vezes. A terceira e a boa.']),
    t('corrida', 'Voce corre?', 'gosta',
      ['Corro. E a hora do dia em que ninguem me pergunta nada.', 'Cinco quilometros, mesma volta, todo dia.'],
      ['Corro cedo, na estrada de terra.', 'Nao e por saude. E por silencio.']),
    t('cooperativa', 'Voce trabalha pra cooperativa?', 'neutro',
      ['Trabalho. Remoto, o dia inteiro.', 'Fecho o mes deles e o de mais tres clientes.'],
      ['Sim, ha seis anos.', 'Nunca fui la pessoalmente. E o combinado.']),
    t('achismo', 'Eu acho que da pra fazer sem conta.', 'nao_gosta',
      ['Acha.', 'Achismo e o que quebra negocio bom. Ja vi de perto, mais de uma vez.'],
      ['Sem conta voce descobre em seis meses o que eu te digo hoje.', 'Faz como quiser. Depois me chama.']),
  ],

  // ---------------------------------------------------------------- BRUNO --
  bruno: [
    t('seguranca', 'A serra nao e perigosa?', 'gosta',
      ['E. Por isso a gente para antes de estar cansado, nao depois.', 'Sete anos sem acidente. Isso e regra, nao sorte.'],
      ['E, e quem diz que nao e ja se machucou.', 'Protetor, luva, e ninguem opera com pressa. So essas tres.']),
    t('entalhe', 'Voce entalha?', 'gosta',
      ['Entalho. Em casa, de noite, no silencio.', 'Serrar o dia inteiro e tirar madeira. Entalhar e devolver alguma coisa.'],
      ['Entalho, sim. Ninguem espera isso de mim.', 'Faco bicho e cabo de ferramenta. Mais o segundo que o primeiro.']),
    t('madeira', 'Que madeira e boa pra isso?', 'gosta',
      ['Depende do que voce vai fazer. Me diz que eu te digo.', 'Errar a madeira estraga o trabalho antes de comecar.'],
      ['Pergunta boa. Poucos perguntam antes de comprar.', 'Pra fora, tem que aguentar chuva. Pra dentro, pode ser bonita.']),
    t('tulio', 'O Tulio e seu primo?', 'neutro',
      ['E. Fala pelos dois.', 'Trabalha bem quando quer. O problema e o quando.'],
      ['E, primo.', 'A gente se resolve. Nao precisa de plateia.']),
    t('caio', 'O Caio disse que voce fala demais.', 'nao_gosta',
      ['Disse, e?', 'Ele conserta motor e acha que isso e o mundo inteiro. Nao e.'],
      ['Olha so.', 'Da o recado de volta: a bancada dele esta torta faz dois anos.']),
  ],
};

import { escreverDiario } from './diarioPessoal.ts';
export interface ContextoSocial {
  dia: number; mapa: string;
  relogio: { minutos: number };
  vida: { fracao: number };
  relacoes: { getScore(id: string): number; listaInteragidos(): string[] };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}
const dias = (c: ContextoSocial, k: string): number[] => {
  try { const d = JSON.parse(String(c.worldEvents.obter(k.startsWith('padrao:') ? k : `padrao:${k}`) ?? '[]')); return Array.isArray(d) ? d.filter(v => Number.isInteger(v) && v >= c.dia - 28 && v <= c.dia) : []; } catch { return []; }
};
function observar(c: ContextoSocial, tipo: string): void {
  const k = `padrao:${tipo}`, d = dias(c, k); if (!d.includes(c.dia)) c.worldEvents.definir(k, JSON.stringify([...d, c.dia]));
}
export function observarVida(c: ContextoSocial, xTile: number, yTile: number): void {
  if (c.mapa === 'bar') {
    const anterior = c.worldEvents.obter('social:ultimoBar');
    if (anterior !== c.dia) c.worldEvents.definir('social:ausenciaBar', c.dia - Number(anterior ?? 0));
    observar(c, 'bar'); c.worldEvents.definir('social:ultimoBar', c.dia);
  }
  if (c.mapa === 'farm' && xTile >= 49 && xTile <= 57 && yTile >= 38 && yTile <= 52) observar(c, 'praca');
  if (c.mapa.startsWith('represa')) {
    if (c.vida.fracao < .6) observar(c, 'ferido');
    if (c.relogio.minutos < 360) c.worldEvents.definir('social:noiteRepresa', c.dia);
  }
}
export function observarTrabalho(c: ContextoSocial): void {
  c.worldEvents.definir('social:ultimoTrabalho', c.dia);
  if (c.relogio.minutos >= 21 * 60 || c.relogio.minutos < 360) observar(c, 'trabalhoTarde');
}
export function registrarConvivencia(c: ContextoSocial, id: string): void {
  const k = `social:conversa:${id}`; if (c.worldEvents.obter(k) === c.dia) return;
  c.worldEvents.definir(k, c.dia);
  const total = `social:dias:${id}`; c.worldEvents.definir(total, Number(c.worldEvents.obter(total) ?? 0) + 1);
}
export function naturezaDaRelacao(c: ContextoSocial, id: string): string {
  const convivio = Number(c.worldEvents.obter(`social:dias:${id}`) ?? 0), score = c.relacoes.getScore(id);
  const confianca = score >= 8 ? 'muito alta' : score >= 4 ? 'alta' : score >= 0 ? 'em construção' : 'abalada';
  const proximidade = convivio >= 14 ? 'alta' : convivio >= 5 ? 'moderada' : 'reservada';
  const conhecimento = c.worldEvents.ativa(`social:confidencia:${id}`) ? 'elevado' : c.worldEvents.ativa(`vinculo:${id}:1`) ? 'algum' : 'pouco';
  return `Confiança: ${confianca}\nProximidade: ${proximidade}\nConhecimento sobre você: ${conhecimento}\nAfeto: ${convivio >= 8 && score >= 4 ? 'carinho presente' : 'ainda se descobrindo'}`;
}
export function comentarioDoPadrao(c: ContextoSocial, id: string): string | null {
  if (c.worldEvents.obter(`social:comentou:${id}`) === c.dia) return null;
  let fala: string | null = null;
  const noite = c.worldEvents.obter('social:noiteRepresa');
  if (typeof noite === 'number' && c.dia === noite + 1) fala = ({ jaqueline: 'Disseram que tinha luz naquela estrada ontem. Eu vi da janela, mas não sei o que era.', hiago: 'Você estava lá, não estava? A estrada da represa estava acesa quando passei.', alice: 'Não quero saber o que você estava fazendo. Só tenta não morrer.' } as Record<string, string>)[id] ?? null;
  if (!fala && id === 'edu' && dias(c, 'trabalhoTarde').length >= 7) fala = 'Você ainda está trabalhando nesse horário? Tenho visto sua janela acesa quando volto. Não precisa me explicar. Só achei que devia perguntar.';
  if (!fala && id === 'alice' && c.relacoes.getScore(id) >= 2 && Math.max(c.dia - Number(c.worldEvents.obter('social:ultimoBar') ?? 0), c.worldEvents.obter('social:ultimoBar') === c.dia ? Number(c.worldEvents.obter('social:ausenciaBar') ?? 0) : 0) >= 14) fala = 'Achei que tinha ido embora sem avisar. Sua cadeira continua aqui.';
  if (!fala && id === 'leticia' && dias(c, 'praca').length >= 5) fala = 'Você tem vindo bastante aqui. Já começou a perceber quando a luz muda?';
  if (!fala && id === 'wendel' && dias(c, 'ferido').length >= 3) fala = 'Você está ficando bom demais em precisar de curativo. Pode entrar aqui antes de precisar também.';
  if (!fala && c.vida.fracao < .6 && c.relacoes.getScore(id) >= 2) fala = id === 'mari' ? 'Você está protegendo esse braço. Hoje não precisa forçar.' : 'Você voltou machucado. Quer sentar um pouco? Posso ficar aqui.';
  if (fala) c.worldEvents.definir(`social:comentou:${id}`, c.dia);
  return fala;
}
export interface CenaVinculo { titulo: string; falas: readonly string[]; diario: string }
export const VINCULOS: Record<string, readonly CenaVinculo[]> = {
  edu: [
    { titulo: 'O caminho mais comprido', falas: ['Eu podia ir pela rua de cima. Dou a volta porque tem uma árvore que muda de cor primeiro.', 'Não precisa ser eficiente. Às vezes nem precisa chegar.'], diario: 'Edu me mostrou o caminho mais comprido. Chegamos do mesmo jeito.' },
    { titulo: 'Um dia sem resposta', falas: ['Também tenho medo de perder trabalho. Desligar não prova que deixei de ter medo.', 'A diferença é que hoje eu desligo com medo mesmo.'], diario: 'Achei que para Edu fosse fácil. Ele disse que não.' },
    { titulo: 'Lugar ao lado', falas: ['Vou caminhar. Você quer ir?', 'Se não quiser conversar, tudo bem. A gente não precisa preencher o caminho.'], diario: 'Caminhamos até a sombra mudar de lado. Não resolvemos nada.' },
    { titulo: 'O que eu deixei pela metade', falas: ['Tem um projeto meu parado há dois anos. Eu falo dele como se fosse esta semana.', 'Não vou terminar por vergonha. Se um dia terminar, vai ser porque deu vontade.'], diario: 'Edu tem uma coisa inacabada e não pede desculpa por ela.' },
    { titulo: 'Sábado inteiro', falas: ['Hoje eu não abri o computador nenhuma vez. Contei.', 'Quer ficar aqui até o sol sair da varanda? É o meu plano inteiro.'], diario: 'Passamos um sábado sem produzir nada. Foi o dia mais cheio da semana.' },
  ],
  mari: [
    { titulo: 'Depois do treino', falas: ['Hoje eu parei antes do fim. Não conta para o pessoal que eu disse isso como se fosse confissão.', 'Tem dia que continuar só faz a gente repetir errado.'], diario: 'Mari parou antes do fim. Ficamos na porta da academia.' },
    { titulo: 'Ficar para trás', falas: ['Eu digo disciplina porque fica melhor do que dizer medo.', 'Às vezes acho que, se eu parar, ninguém vai esperar.'], diario: 'Mari falou de medo. Não parecia menos forte.' },
    { titulo: 'Sem cronômetro', falas: ['Trouxe duas garrafas de água. Vamos sentar um pouco?', 'Não vou cronometrar. Pode rir. Eu mereci essa.'], diario: 'Ficamos sentados sem contar os minutos.' },
    { titulo: 'A lesão que ninguém viu', falas: ['Treinei seis meses com dor. Chamava de firmeza.', 'Hoje eu aviso quando dói. Demorei para entender que avisar também é treino.'], diario: 'Mari treinou com dor por meses. Hoje ela avisa.' },
    { titulo: 'Ensinar devagar', falas: ['Quer aprender um movimento? Vou explicar devagar, e você pode errar quantas vezes precisar.', 'Ninguém está contando. Sério. Nem eu.'], diario: 'Mari me ensinou um movimento sem pressa. Errei bastante.' },
  ],
  jaqueline: [
    { titulo: 'Receita sem medida', falas: ['Minha mãe dizia “um pouco”. Eu reclamava. Agora faço igual.', 'Se der errado, a gente come assim mesmo.'], diario: 'Jaqueline me ensinou uma receita sem medida exata.' },
    { titulo: 'Nem tudo precisa circular', falas: ['Eu falo demais, eu sei. Mas tem coisa que me contam e fica comigo.', 'O que você não quiser que vire assunto, não vira.'], diario: 'Jaqueline sabe guardar silêncio também.' },
    { titulo: 'Mais um prato', falas: ['Pus um prato a mais. Não precisa trazer nada.', 'E não vá consertar a torneira no meio do almoço. Hoje você veio comer.'], diario: 'Havia um prato a mais. Era o meu.' },
    { titulo: 'A casa cheia e vazia', falas: ['Quando meus filhos saíram, eu continuei cozinhando para seis.', 'Levei um ano para fazer comida para dois sem achar que estava desistindo de alguma coisa.'], diario: 'Jaqueline ainda cozinha demais. Ela sabe por quê.' },
    { titulo: 'Uma tarde no quintal', falas: ['Senta aqui. O sol vira essa esquina às quatro e meia, sempre.', 'Não precisamos de assunto. Eu aviso se precisar.'], diario: 'Ficamos no quintal de Jaqueline vendo o sol virar a esquina.' },
  ],
  leticia: [
    { titulo: 'Uma fotografia sem gente', falas: ['Hoje eu fotografei um banco vazio. Ele não estava vazio ontem.', 'Você pode usar a câmera do celular. Não precisa saber o que a foto quer dizer antes de tirar.'], diario: 'Letícia me mostrou que uma fotografia pode começar sem assunto.' },
    { titulo: 'Fora do enquadramento', falas: ['Quando alguém pede para eu apagar uma foto, eu apago.', 'Gostar da imagem não me dá direito sobre a pessoa que estava nela.'], diario: 'Letícia escolhe também as fotos que não guarda.' },
    { titulo: 'Ainda não sei', falas: ['Ficou boa? Ainda não sei.', 'Mas lembro de estar aqui quando tirei. Por enquanto basta.'], diario: 'Saí na fotografia. Não tentei explicar meu rosto.' },
    { titulo: 'O que eu não fotografo', falas: ['Existe um lugar nesta cidade que eu nunca fotografei. Eu sei o caminho de cor.', 'Não vou te dizer qual é hoje. Só queria que alguém soubesse que existe.'], diario: 'Letícia guarda um lugar que ela não fotografa. Não perguntei qual.' },
    { titulo: 'Revelar junto', falas: ['Trouxe as fotos impressas. Algumas ficaram ruins e eu trouxe do mesmo jeito.', 'Escolhe uma para ficar com você. Não a melhor: uma.'], diario: 'Escolhi uma fotografia que não era a melhor. Ficou na parede.' },
  ],
  wendel: [
    { titulo: 'Antes da farmácia', falas: ['Aprendi a abrir a loja cedo porque minha esposa acordava antes de mim.', 'Ainda acordo no horário dela. Algumas coisas ficam no corpo.'], diario: 'Wendel falou de uma manhã antiga. Escutei.' },
    { titulo: 'Uma pasta vazia', falas: ['Não pedi que você recuperasse tudo. Não existe isso.', 'Às vezes eu abro as fotos e fecho de novo. Às vezes fico. As duas coisas servem.'], diario: 'Wendel não olha as fotografias do mesmo jeito todos os dias.' },
    { titulo: 'Jantar', falas: ['Fiz comida demais. Dessa vez foi de propósito.', 'Não trouxe nenhum aparelho quebrado. Você pode descansar as mãos.'], diario: 'Jantei com Wendel. A conversa não tinha serviço no meio.' },
    { titulo: 'O rádio dela', falas: ['Esse rádio era dela. Eu deixo ligado baixo quando fecho a farmácia.', 'Não é para ouvir. É para o lugar não ficar sem som.'], diario: 'O rádio fica ligado baixo na farmácia fechada. Agora eu sei de quem era.' },
    { titulo: 'Sem consulta', falas: ['Você entrou e não perguntou nada de remédio. Pode fazer isso sempre.', 'Senta aí. Eu fecho em vinte minutos e a gente não faz nada útil depois.'], diario: 'Entrei na farmácia sem precisar de nada. Wendel pareceu contente.' },
  ],
  alice: [
    { titulo: 'Depois de fechar', falas: ['Vou baixar a porta. Se quiser ficar, fica.', 'Não precisa inventar mais um pedido para ter motivo.'], diario: 'Alice perguntou se eu queria ficar no bar depois de fechar. Fiquei.' },
    { titulo: 'Uma coisa minha', falas: ['Às vezes eu gosto do bar vazio. Não quer dizer que não gosto das pessoas.', 'Também preciso de um lugar que não esteja me pedindo nada.'], diario: 'Alice também precisa que a porta feche de vez em quando.' },
    { titulo: 'Sem conta', falas: ['Você está tentando pagar outra vez.', 'Amizade não é uma conta mal fechada. Deixa ficar um pouco sem somar.'], diario: 'Não consertei nada. Não paguei a companhia. Voltei para casa acompanhado por isso.' },
    { titulo: 'Quem cuida do bar', falas: ['Todo mundo desabafa aqui. Eu escuto, sirvo e fecho.', 'Hoje eu falei e não escutei ninguém. Estranho. Bom.'], diario: 'Alice falou e eu escutei. O bar ficou do outro lado da conversa.' },
    { titulo: 'A cadeira do canto', falas: ['Essa cadeira é sua. Não porque eu reservei; porque você senta sempre nela.', 'Quando você não vem, ela fica vazia. Só isso. Não é cobrança.'], diario: 'Tenho uma cadeira no bar. Ninguém decidiu isso; aconteceu.' },
  ],
  hiago: [
    { titulo: 'A rua de madrugada', falas: ['De bicicleta a cidade tem outro tamanho.', 'De madrugada parece maior. Ou eu que vou mais devagar.'], diario: 'Hiago conhece a cidade por outros horários.' },
    { titulo: 'O que cada um viu', falas: ['A gente pode ter passado pelo mesmo lugar e visto coisas diferentes.', 'Não estou dizendo que você inventou. Só que eu não estava dentro de você.'], diario: 'Hiago não viu o que eu vi. Continuamos conversando.' },
    { titulo: 'Parar no caminho', falas: ['Hoje eu trouxe a bicicleta e vim a pé metade do caminho.', 'Sente aqui. Ela espera.'], diario: 'A bicicleta ficou encostada. Não tínhamos pressa de ir embora.' },
    { titulo: 'A entrega que eu não fiz', falas: ['Um dia eu parei no meio de uma entrega e fiquei olhando o rio. Perdi o pagamento.', 'Não conto isso como erro. Conto como a única vez que eu parei sem motivo.'], diario: 'Hiago parou uma vez sem motivo. Ele guarda esse dia.' },
    { titulo: 'Um trecho de bicicleta', falas: ['Segura no guidão que eu empurro. Vai devagar, é ladeira.', 'A cidade inteira desce mais fácil do que sobe. Também serve para outras coisas.'], diario: 'Descemos a ladeira devagar. Não era pressa; era o trecho.' },
  ],
  vitor: [
    { titulo: 'Um lado do fone', falas: ['Quer ouvir? Essa parte fica melhor sem falar por cima.', 'Não precisa dizer que gostou só porque eu gosto.'], diario: 'Vitor me emprestou um lado do fone.' },
    { titulo: 'Silêncio gravado', falas: ['Gravei o som da praça. Quase apaguei porque achei que não tinha nada.', 'Depois ouvi de novo. Tinha bastante coisa.'], diario: 'O silêncio da praça tinha passos, folhas e uma conversa longe.' },
    { titulo: 'Deixa tocar', falas: ['Você pode ficar até acabar. Ou sair antes.', 'Não tem prova no fim da música.'], diario: 'Fiquei ouvindo até o fim. Porque quis.' },
    { titulo: 'A música que eu não toco', falas: ['Tem uma faixa que eu não coloco quando tem gente. Ela me desmonta um pouco.', 'Hoje eu vou colocar. Você pode ficar quieto que é melhor.'], diario: 'Vitor tocou a música que ele não toca com gente. Ficamos quietos.' },
    { titulo: 'Gravar a cidade', falas: ['Quer segurar o microfone? Fica parado e não fala.', 'Pronto. Isso é uma quinta-feira às seis. Ninguém vai ouvir e está guardado.'], diario: 'Gravamos uma quinta-feira às seis. Não tem plateia.' },
  ],
  davi: [
    { titulo: 'A mão que falhou', falas: ['A lesão não dói mais. O medo de errar na frente de alguém, sim.', 'Hoje eu amassei o pão com as duas mãos e não contei os minutos.'], diario: 'Davi amassou o pão com as duas mãos. Não perguntei da lesão.' },
    { titulo: 'Queimado do mesmo jeito', falas: ['Esse aqui queimou embaixo. Vou servir assim.', 'Cozinhar para alguém não é entregar a versão perfeita.'], diario: 'Comi um pão queimado embaixo e disse que estava bom. Estava.' },
    { titulo: 'A padaria que ainda não existe', falas: ['Eu já sei a cor da parede. Não sei o aluguel.', 'Conta para mais alguém e eu vou ter que fingir que é plano.'], diario: 'Davi me contou da padaria que ele imagina. Eu não dei conselho.' },
  ],
  luke: [
    { titulo: 'Como funciona', falas: ['Eu abro as coisas para ver por dentro. Quase sempre fecha de novo.', 'Você pode me ensinar a fechar melhor?'], diario: 'Luke quer aprender a fechar o que abre. Combinamos de tentar.' },
    { titulo: 'A peça sem nome', falas: ['Achei isso no terreno. Não sei o que é e gosto mais assim.', 'Se você descobrir, não me conta hoje.'], diario: 'Luke encontrou uma peça sem nome. Deixamos sem nome.' },
    { titulo: 'Errar alto', falas: ['Eu quebrei o ventilador da Jaqueline. Ela riu, mas eu fiquei mal.', 'Você já quebrou alguma coisa de alguém? Como é que passa?'], diario: 'Luke quebrou um ventilador e perguntou como é que passa. Falei a verdade.' },
  ],
  clara: [
    { titulo: 'O livro que ninguém pega', falas: ['Esse aqui não sai da estante há quatro anos. Eu continuo consertando a lombada.', 'Não é útil. É cuidado.'], diario: 'Clara conserta a lombada de um livro que ninguém pega.' },
    { titulo: 'Lucia decidindo', falas: ['Minha irmã acha que precisa escolher hoje o resto da vida.', 'Eu escolhi cedo e continuo mudando de ideia. Não digo isso para ela.'], diario: 'Clara não conta à irmã que ela também muda de ideia.' },
    { titulo: 'Uma hora sem sistema', falas: ['Fechei o catálogo. Sente, escolhe qualquer prateleira.', 'Hoje a biblioteca não é organizada. É só um lugar com livros.'], diario: 'Passei uma hora na biblioteca sem procurar nada.' },
  ],
  ilda: [
    { titulo: 'O que a cidade esquece', falas: ['Eu anoto relato de gente que não escreve. Nem tudo confere.', 'Quando duas versões brigam, eu guardo as duas.'], diario: 'Ilda guarda versões que se contradizem. Ela não escolhe uma.' },
    { titulo: 'Ravi calado', falas: ['Ele não pede ajuda; ele fica quieto perto de quem pode ajudar.', 'Eu aprendi a ficar por perto sem perguntar. Levou tempo.'], diario: 'Ilda aprendeu a ficar por perto sem perguntar. Anotei isso para mim.' },
    { titulo: 'Aula nenhuma', falas: ['Hoje eu não vou te explicar nada. Prometido.', 'Ficou difícil. Eu explico duas coisas e paro.'], diario: 'Ilda tentou não dar aula e conseguiu quase inteiro.' },
  ],
  roberto: [
    { titulo: 'O ruído dos portões', falas: ['Lembro do barulho do portão da usina antes de lembrar dos nomes.', 'Barulho é a última coisa que a memória solta.'], diario: 'Roberto lembra dos sons da usina. Não inventou nenhum nome.' },
    { titulo: 'A maquete parada', falas: ['A ferrovia em miniatura está na metade desde que eu me aposentei.', 'Eu monto um trecho por ano. Nesse ritmo ela dura mais que eu, e é o plano.'], diario: 'Roberto monta um trecho da maquete por ano. De propósito.' },
    { titulo: 'Ficar perdendo no xadrez', falas: ['Senta. Você perde as três primeiras, é assim com todo mundo.', 'Não estou ensinando. Estou jogando com alguém, que é diferente.'], diario: 'Perdi três partidas de xadrez. Roberto ficou satisfeito.' },
  ],
  joao: [
    { titulo: 'Céu fechado', falas: ['Eu leio o céu há trinta anos e erro todo ano.', 'O que aprendi foi outra coisa: plantar sabendo que pode não dar.'], diario: 'João erra a previsão todo ano e continua plantando.' },
    { titulo: 'O cansaço que ele chama de calor', falas: ['A Neide diz que eu esconto cansaço. Ela está certa.', 'Se eu parar um dia, eu penso demais. Trabalhar é mais fácil.'], diario: 'João trabalha para não pensar demais. Ele sabe disso.' },
    { titulo: 'Sentar na varanda', falas: ['Hoje eu não vou para a roça antes do almoço. Decidi ontem à noite.', 'Senta aí. A gente olha a estrada e conta os carros, que são poucos.'], diario: 'Contamos os carros da estrada da roça. Deu cinco em uma hora.' },
  ],
  neide: [
    { titulo: 'Conserva de tempo', falas: ['Conserva boa precisa de tempo. Gente também, e ninguém quer ouvir.', 'Prova essa. É de dois anos atrás e ficou melhor esse ano.'], diario: 'Provei uma conserva de dois anos. Neide esperou o tempo dela.' },
    { titulo: 'Desconfiar menos', falas: ['Eu demoro a convidar. Já me arrependi das duas coisas: convidar rápido e não convidar.', 'Você está convidado. Levei um tempo, mas está.'], diario: 'Neide levou um tempo para me convidar. Ela avisou que levaria.' },
    { titulo: 'A receita anotada', falas: ['Vou te ensinar a conserva. Anota, porque eu não repito medida.', 'Se der errado, você volta e a gente faz junto.'], diario: 'Anotei a receita de conserva de Neide. A medida é "até parecer certo".' },
  ],
  ravi: [
    { titulo: 'A regra que estraga', falas: ['Meu jogo tem uma regra que estraga as outras. Eu não acho qual.', 'Você joga comigo? Eu preciso ver alguém perdendo para entender.'], diario: 'Joguei o jogo de Ravi. A regra ruim apareceu na terceira rodada.' },
    { titulo: 'Sem dar trabalho', falas: ['Eu tento não dar trabalho para os meus avós.', 'Você acha que dá trabalho pedir uma coisa? Eu acho que dá.'], diario: 'Ravi tenta não dar trabalho. Disse a ele que pedir não é dar trabalho.' },
    { titulo: 'Ganhar de verdade', falas: ['Ganhei. Não foi sorte dessa vez, eu acho.', 'Pode dizer que eu ganhei? Só uma vez. Depois a gente joga de novo.'], diario: 'Ravi ganhou sem sorte. Falei em voz alta que ele ganhou.' },
  ],
};
export function vinculoDisponivel(c: ContextoSocial, id: string): { cena: CenaVinculo; indice: number } | null {
  const cenas = VINCULOS[id]; if (!cenas || c.worldEvents.obter(`vinculo:dia:${id}`) === c.dia) return null;
  const indice = cenas.findIndex((_, i) => !c.worldEvents.ativa(`vinculo:${id}:${i}`));
  // Cinco cenas nos moradores dos retratos, tres nos demais: o limiar acompanha.
  const limiares = cenas.length >= 5 ? [2, 4, 6, 8, 10] : [1, 3, 5];
  if (indice < 0 || c.relacoes.getScore(id) < (limiares[indice] ?? 12)) return null;
  if (id === 'wendel' && indice > 0 && !c.worldEvents.ativa('missaoWendelHdConcluida')) return null;
  return { cena: cenas[indice]!, indice };
}
export function concluirVinculo(c: ContextoSocial, id: string, indice: number): boolean {
  const v = vinculoDisponivel(c, id); if (!v || v.indice !== indice) return false;
  c.worldEvents.definir(`vinculo:${id}:${indice}`, true); c.worldEvents.definir(`vinculo:dia:${id}`, c.dia);
  if (id === 'leticia') c.worldEvents.definir('fotografia:liberada', true);
  if (id === 'wendel' && indice === 2) c.worldEvents.definir('social:jantarWendel', true);
  escreverDiario(c, `vinculo:${id}:${indice}`, v.cena.diario); return true;
}

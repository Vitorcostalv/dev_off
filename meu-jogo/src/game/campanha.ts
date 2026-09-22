import { registrarCenaNoDiario } from './diarioPessoal.ts';
/** Campanha autoral. Condições e escolhas persistem nas flags do save existente. */
export type CenarioNarrativo = 'apartamento' | 'estrada' | 'casa' | 'oficina' | 'praca' | 'rio' | 'bar' | 'represa';
export interface QuadroNarrativo {
  texto: string; nome?: string; cenario?: CenarioNarrativo; hora?: string;
  acao?: string; escolha?: readonly string[]; pausa?: number;
}
export interface CenaCampanha {
  id: string; titulo: string; capitulo: string; local: string; npc?: string;
  depois?: string; dia?: number; ficha?: number; missao?: string;
  quadros: readonly QuadroNarrativo[];
}
const q = (texto: string, nome = '', cenario?: CenarioNarrativo): QuadroNarrativo => ({ texto, nome, cenario });
export const CENAS_CAMPANHA: readonly CenaCampanha[] = [
  { id: 'prologo', titulo: 'Você não veio para começar de novo', capitulo: 'Prólogo', local: 'inicio', quadros: [
    { texto: 'Algumas semanas antes. Chove. O computador continua funcionando.', cenario: 'apartamento', hora: '23:48' },
    q('consegue ver uma coisa rapidinho?', 'Mensagem'),
    { texto: 'Ele responde. Outra mensagem. Outra.', hora: '01:17', acao: 'Responder' },
    { texto: 'O terceiro monitor acende. A janela continua escura.', hora: '02:43' },
    { texto: 'A tela apaga por um instante.', hora: '04:06', pausa: 1300 },
    { texto: 'Amanheceu. Ele ainda está sentado. Não consegue lembrar se jantou.', hora: '06:12' },
    q('Algum tempo depois. Pneus no asfalto molhado. O limpador atravessa o vidro.', '', 'estrada'),
    q('Uma placa velha. Uma cidade que ainda não sabe seu nome.'),
    { texto: 'A chave gira. Uma caixa encontra o chão da casa nova.', cenario: 'casa', acao: 'Abrir a porta' },
    q('É silencioso.', 'Você'), q('Silencioso demais.', 'Você'),
  ] },
  { id: 'caixas', titulo: 'Uma caixa fechada', capitulo: 'I — O homem que chegou', local: 'oficina', depois: 'prologo', dia: 1, quadros: [
    q('Você dormiu cedo. Mesmo assim, ficou sentado na cama antes de levantar.', '', 'casa'),
    q('A pia tem louça. As caixas continuam perto da parede. O celular vibra: propaganda.'),
    { texto: 'Dentro de uma caixa, o notebook antigo.', acao: 'Abrir o notebook' },
    q('A tela de login aparece. Você fecha a tampa antes de escrever qualquer coisa.'),
    q('“Queria algo mais tranquilo.” “Cansei da cidade.” Você ensaiou respostas. Ninguém perguntou.'),
  ] },
  { id: 'jaqueline', titulo: 'O cara novo', capitulo: 'I — O homem que chegou', local: 'farm', npc: 'jaqueline', depois: 'caixas', quadros: [
    q('Você encontrou o açúcar?', 'Jaqueline', 'praca'), q('Encontrei. Eu vim pra cá porque...', 'Você'),
    q('Prateleira de baixo tem o pacote menor. Se é só você, dura bastante.', 'Jaqueline'),
    q('Ela já está atendendo outra pessoa. Você não precisou explicar sua vida.'),
  ] },
  { id: 'oficina', titulo: 'O que tem conserto', capitulo: 'I — O homem que chegou', local: 'oficina', depois: 'jaqueline', quadros: [
    q('Medir. Encontrar o defeito. Trocar a peça. Testar.', '', 'oficina'),
    q('Uma placa queimada não diz que está bem. Um rádio não sente vergonha de precisar de ajuda.'),
    q('Aqui, por alguns minutos, os problemas têm começo e fim.'),
    q('Tem alguma coisa interessante aí dentro?', 'Luke'), q('Tem coisa quebrada.', 'Você'), q('Então tem!', 'Luke'),
  ] },
  { id: 'leticia', titulo: 'Amanhã talvez não esteja igual', capitulo: 'I — O homem que chegou', local: 'farm', npc: 'leticia', depois: 'oficina', quadros: [
    q('Uma janela. Uma poça. Uma bicicleta encostada. Letícia levanta a câmera.', '', 'praca'),
    q('Por que tirar foto disso?', 'Você'), q('Porque amanhã talvez não esteja igual.', 'Letícia'),
    q('Você pensa em perguntar sobre trabalho. Ela pensa em perguntar por que você veio. Nenhum dos dois pergunta.'),
    q('Os dois ficam no banco. O silêncio não precisa ser preenchido.'),
  ] },
  { id: 'edu', titulo: 'Quase nunca é', capitulo: 'I — O homem que chegou', local: 'farm', npc: 'edu', depois: 'leticia', quadros: [
    q('Edu fecha o notebook. Vai caminhar. Parece simples. Isso incomoda você.', '', 'praca'),
    q('Ele ainda consegue.', 'Você'),
    q('Já passei por épocas ruins. Agora, quando acaba o horário, fecho.', 'Edu'),
    q('Desde que perdi aquele notebook, passeio é sem mochila. Quando preciso levar trabalho, é outro caminho.', 'Edu'),
    q('Se alguém escreve às onze da noite, a mensagem continua existindo às oito da manhã.', 'Edu'),
    q('E se for urgente?', 'Você'), q('Quase nunca é.', 'Edu'),
  ] },
  { id: 'mari', titulo: 'Eu não consegui continuar', capitulo: 'I — O homem que chegou', local: 'farm', npc: 'mari', depois: 'edu', quadros: [
    q('Metas. Horários. Constância. Você vinha evitando essa conversa.', '', 'praca'),
    q('Como você conseguiu largar tudo?', 'Mari'), q('Eu não larguei.', 'Você'),
    q('Eu não consegui continuar.', 'Você'), q('Eu tenho medo de parar e ficar para trás.', 'Mari'),
    q('Pela primeira vez, a disciplina dela parece menos uma certeza e mais uma pergunta.'),
  ] },
  { id: 'alice', titulo: 'Aí você não conta', capitulo: 'I — O homem que chegou', local: 'bar', npc: 'alice', depois: 'mari', quadros: [
    q('Quase no fechamento. Alice limpa um copo.', '', 'bar'),
    q('Vai querer outra?', 'Alice'), q('Não.', 'Você'), q('Ótimo.', 'Alice'),
    q('Você nunca pergunta por que eu vim.', 'Você'), q('Se você quisesse contar, já tinha contado.', 'Alice'),
    q('E se eu não quiser?', 'Você'), q('Aí você não conta.', 'Alice'),
  ] },
  { id: 'wendel', titulo: 'Eu não pedi tudo', capitulo: 'II — Ele começa a melhorar', local: 'farmacia', npc: 'wendel', depois: 'alice', missao: 'wendel_hd', quadros: [
    q('Fotos. Documentos. Vídeos. Quase tudo voltou. Uma pasta continua corrompida.', '', 'oficina'),
    { texto: 'FALHA NA RECUPERAÇÃO. Não há outra cópia legível.', acao: 'Tentar novamente' },
    q('FALHA NA RECUPERAÇÃO. Você já fez o que era possível.'),
    q('Eu não consegui recuperar essa pasta.', 'Você'), q('E o resto?', 'Wendel'),
    q('Consegui recuperar.', 'Você'), q('Então já é mais do que eu tinha ontem.', 'Wendel'),
    q('Mas eu não consegui tudo.', 'Você'), q('Eu não pedi tudo.', 'Wendel'),
  ] },
  { id: 'cliente', titulo: 'Só você conhece esse sistema', capitulo: 'II — Ele começa a melhorar', local: 'oficina', depois: 'wendel', dia: 15, quadros: [
    q('A oficina funciona. Há um bilhete na bancada. A casa tem menos caixas fechadas.', '', 'oficina'),
    { texto: 'Oi. Sei que você não está pegando muita coisa, mas só você conhece esse sistema.', nome: 'Cliente antigo', escolha: ['Não posso assumir isso.', 'Só amanhã, dentro do expediente.'] },
    q('A mensagem foi enviada. Mesmo tendo colocado um limite, você passa a noite acordado.'),
    q('Fazer a escolha certa não trouxe imediatamente a sensação certa.'),
  ] },
  { id: 'estrada', titulo: 'Uma peça de reposição', capitulo: 'III — A represa', local: 'represa', depois: 'cliente', quadros: [
    q('Um equipamento antigo precisa de uma peça. Você resolveu olhar o almoxarifado da usina.', '', 'estrada'),
    q('Hiago reclamou dos buracos da estrada. Ninguém falou em monstros.'),
    q('O portão está aberto. O cadeado foi cortado por dentro.', '', 'represa'),
    q('Uma usina desativada. É só isso que parece ser, por enquanto.'),
  ] },
  { id: 'julgamento', titulo: 'Por que ele não parou?', capitulo: 'III — A represa', local: 'represa*', depois: 'estrada', ficha: 10, quadros: [
    q('4471. A série da turbina. 4471-C. O paciente. Você volta à primeira linha.', '', 'represa'),
    q('Que idiota. Por que ele não simplesmente parou?', 'Você'),
    q('As iniciais no papel não respondem. Você dobra a folha.'),
  ] },
  { id: 'hiago', titulo: 'Só concreto', capitulo: 'III — A represa', local: 'represa*', depois: 'julgamento', ficha: 30, quadros: [
    q('Hiago veio ajudar a carregar a peça. Vocês entram juntos no setor.', '', 'represa'),
    q('Você vê uma mesa, três monitores, a cadeira do apartamento.', '', 'apartamento'),
    q('Por que você está olhando para a parede?', 'Hiago', 'represa'),
    q('Você não está vendo a mesa?', 'Você'), q('Só concreto. Mas esse barulho eu também estou ouvindo.', 'Hiago'),
    q('A peça pesa nas mãos dele. Ela vai sair daqui. A estação de trabalho, não.'),
  ] },
  { id: 'reconhecimento', titulo: 'Eu escolhi vir ou fui trazido?', capitulo: 'IV — O protagonista piora novamente', local: 'represa*', depois: 'hiago', ficha: 40, quadros: [
    q('A oficina. Os clientes. A mudança. Não é a história de outra pessoa.', '', 'represa'),
    q('Eu escolhi vir ou fui trazido?', 'Você'),
    q('Não por alguém. Por tudo que aconteceu. Esta vida foi uma escolha ou o lugar onde você caiu?'),
  ] },
  { id: 'recaida', titulo: 'A oficina fechada', capitulo: 'IV — O protagonista piora novamente', local: 'oficina', depois: 'reconhecimento', quadros: [
    q('Você dormiu tarde. A placa da oficina ficou virada para FECHADO.', '', 'casa'),
    q('A praça parece longe. Edu parece longe. Até a porta de casa.'),
    q('Se aquilo não tivesse acontecido comigo, eu teria conhecido vocês?', 'Você'),
    q('Hoje você não precisa decidir se vai voltar à usina.'),
  ] },
  { id: 'rio', titulo: 'O sol estava lá mesmo assim', capitulo: 'IV — O protagonista piora novamente', local: 'farm', npc: 'leticia', depois: 'recaida', quadros: [
    q('Mais tarde, perto do rio. Você conta uma parte. Não tudo.', '', 'rio'),
    q('Eu fico pensando que essa vida só existe porque a outra deu errado.', 'Você'),
    q('Então parece que tudo daqui é consequência de uma coisa ruim.', 'Você'),
    q('Eu tirei uma foto depois de uma tempestade. Uma árvore tinha caído e aberto um espaço no mato.', 'Letícia'),
    q('O pôr do sol passava exatamente por ali.', 'Letícia'),
    q('Eu preferia que a árvore não tivesse caído.', 'Letícia'),
    q('Mas o sol estava lá mesmo assim.', 'Letícia'),
  ] },
  { id: 'sacola', titulo: 'Uma sacola na porta', capitulo: 'V — As relações começam a se inverter', local: 'oficina', depois: 'rio', quadros: [
    q('Jaqueline deixou uma sacola. Você não passou pelo mercado nos últimos dias.', '', 'casa'),
    q('O açúcar é o pacote menor. Não há cobrança nem pedido no bilhete.'),
  ] },
  { id: 'pao', titulo: 'Ainda está morno', capitulo: 'V — As relações começam a se inverter', local: 'oficina', depois: 'sacola', quadros: [
    q('Em outra manhã, Davi bate à porta.', '', 'oficina'),
    q('Sobrou pão. Ainda está morno.', 'Davi'), q('Eu posso consertar alguma coisa pra você.', 'Você'),
    q('Hoje eu só vim trazer pão.', 'Davi'),
  ] },
  { id: 'visita', titulo: 'Sem remetente', capitulo: 'V — As relações começam a se inverter', local: 'oficina', depois: 'pao', quadros: [
    q('Vitor entrega um embrulho. Não diz que foi ideia de Alice.', '', 'casa'),
    q('Luke aparece depois. Uma roda de brinquedo saiu do lugar. Ele quer companhia enquanto tenta encaixar.'),
    q('Você fica ao lado dele. Não pega a ferramenta das mãos dele.'),
  ] },
  { id: 'cuidado', titulo: 'Comeu?', capitulo: 'V — As relações começam a se inverter', local: 'farmacia', npc: 'wendel', depois: 'visita', quadros: [
    q('Dormindo?', 'Wendel', 'praca'), q('Mais ou menos.', 'Você'),
    q('Comeu?', 'Wendel'), q('Sim.', 'Você'), q('Certo.', 'Wendel'),
    q('Ele não oferece um discurso. Fica um instante e vai embora.'),
  ] },
  { id: 'divida', titulo: 'Amizade não tem nota fiscal', capitulo: 'V — As relações começam a se inverter', local: 'bar', npc: 'alice', depois: 'cuidado', quadros: [
    q('Você trouxe uma lista de coisas que poderia consertar de graça.', '', 'bar'),
    q('Você sabe que amizade não tem nota fiscal, né?', 'Alice'),
    q('Você ri. Depois fica quieto. A lista continua no bolso.'),
  ] },
  { id: 'retorno', titulo: 'Não tenho certeza', capitulo: 'VI — O retorno à represa', local: 'represa', depois: 'divida', quadros: [
    q('Você volta porque está cansado de não saber. Isso não significa estar pronto.', '', 'estrada'),
    q('Tem certeza?', 'Hiago'), q('Não.', 'Você'), q('Tudo bem. Eu sei por onde você foi.', 'Hiago'),
  ] },
  { id: 'andar50', titulo: 'A vida tranquila veio depois', capitulo: 'VI — O retorno à represa', local: 'represa_f50', depois: 'retorno', ficha: 50, quadros: [
    q('Você não veio pra cá porque quis uma vida tranquila.', 'Última folha', 'represa'),
    q('Você veio porque estava se acabando e essa foi a única coisa que sobrou pra tentar.', 'Última folha'),
    q('A vida tranquila veio depois, e foi você que fez.', 'Última folha'),
    { texto: 'Você se senta no chão. Só o concreto. Nenhuma máquina se aproxima.', pausa: 2500 },
    { texto: 'Você tenta levantar. As pernas ainda não acompanham.', acao: 'Levantar' },
    { texto: 'Você apoia a mão na parede. Respira.', acao: 'Levantar' },
    { texto: 'É difícil levantar. Mas você levanta.', acao: 'Levantar' },
    q('Além do arquivo, a escada continua. Há coisas que este prontuário ainda não contou.'),
  ] },
  { id: 'final', titulo: 'Vai levar cinco minutos', capitulo: 'Quem sou eu agora?', local: 'profundezas', depois: 'andar50', quadros: [
    q('Uma sala. Uma mesa. O mesmo computador do começo.', '', 'apartamento'),
    q('Precisamos de você.', 'Mensagem'), q('É urgente.', 'Mensagem'),
    q('Só você sabe resolver.', 'Mensagem'),
    { texto: 'Vai levar cinco minutos.', nome: 'Mensagem', acao: 'Responder' },
    q('Você começa a digitar. Para. Apaga.'),
    { texto: 'O telefone toca. Você olha. Continua tocando.', acao: 'Levantar' },
    { texto: 'Você não precisa entender tudo que aconteceu para continuar vivendo.', acao: 'Sair da sala' },
  ] },
  { id: 'epilogo', titulo: 'Amanhã de manhã', capitulo: 'Meses depois — outono', local: 'oficina', depois: 'final', quadros: [
    { texto: 'Chuva fraca. Um rádio na bancada. Uma xícara, uma caixa por organizar, uma planta torta.', cenario: 'oficina', hora: '17:58' },
    q('Consegue ver isso hoje?', 'Cliente'),
    { texto: 'Amanhã de manhã.', nome: 'Você', acao: 'Enviar' },
    { texto: 'Você desliga a luz e sai.', hora: '18:00', acao: 'Encerrar o expediente' },
    q('Na praça, alguém chama seu nome. Você volta. Fica um pouco.', '', 'praca'),
    q('O grupo vai embora aos poucos. A câmera fica. A praça se esvazia.'),
    q('Em casa, a caixa do notebook está aberta. Você não precisa escondê-lo. Também não precisa usá-lo.', '', 'casa'),
    { texto: 'De manhã. Uma bicicleta. Uma loja abrindo. Crianças indo para a escola. Você toma café.', hora: '08:00' },
    q('Letícia passa do lado de fora e levanta a câmera.'),
    q('Você tirou foto minha?', 'Você'), q('Talvez.', 'Letícia'),
    q('Ficou boa?', 'Você'), q('Ainda não sei.', 'Letícia'),
    q('Um pequeno sorriso. Você está aqui.'),
    q('A vida tranquila veio depois.'), q('E foi você que fez.'),
  ] },
];
export interface ContextoCampanha {
  dia: number; mapa: string;
  worldEvents: { obter(chave: string): boolean | string | number | undefined; ativa(chave: string): boolean; definir(chave: string, valor: boolean | string | number): void };
  arquivo: { tem(n: number): boolean };
  missoesNpc: { estado(id: string): string };
}
export const chaveCena = (id: string) => `campanha:cena:${id}`;
export function viuCena(c: ContextoCampanha, id: string): boolean { return c.worldEvents.ativa(chaveCena(id)); }
export function cenaPendente(c: ContextoCampanha): CenaCampanha | null {
  return CENAS_CAMPANHA.find(s => !viuCena(c, s.id)) ?? null;
}
export function motivoEspera(c: ContextoCampanha, s: CenaCampanha): string | null {
  if (s.depois && !viuCena(c, s.depois)) return 'Continue a história anterior.';
  if (s.dia !== undefined && c.dia < s.dia) return `Continue vivendo na cidade até o dia ${s.dia + 1}.`;
  if (s.missao && c.missoesNpc.estado(s.missao) !== 'concluida') return 'Ganhe a confiança de Wendel e conclua a recuperação do HD pelo app Trabalho.';
  if (s.ficha && !c.arquivo.tem(s.ficha)) return `Encontre a ficha ${s.ficha} na represa.`;
  if (['pao', 'visita'].includes(s.id)) {
    const anterior = c.worldEvents.obter(`campanha:dia:${s.depois}`);
    if (typeof anterior === 'number' && c.dia <= anterior) return 'Volte à oficina em outro dia.';
  }
  if (s.id === 'final' && Number(c.worldEvents.obter('campanha:profundidade') ?? 50) < 200) return 'Explore a escada além do arquivo do andar 50.';
  return null;
}
export function cenaNoContexto(c: ContextoCampanha, npc?: string): CenaCampanha | null {
  const s = cenaPendente(c);
  if (!s || motivoEspera(c, s) || s.local === 'inicio' || s.local === 'profundezas') return null;
  if (s.npc) return npc === s.npc ? s : null;
  if (npc) return null;
  const local = s.local === 'represa*' ? c.mapa.startsWith('represa') : s.local === c.mapa;
  return local ? s : null;
}
export function concluirCena(c: ContextoCampanha, id: string): boolean {
  const s = cenaPendente(c);
  if (!s || s.id !== id || motivoEspera(c, s)) return false;
  c.worldEvents.definir(chaveCena(id), true);
  registrarCenaNoDiario(c, id);
  c.worldEvents.definir(`campanha:dia:${id}`, c.dia);
  c.worldEvents.definir('campanha:quadro', 0);
  c.worldEvents.definir('campanha:ativa', '');
  return true;
}

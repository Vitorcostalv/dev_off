/**
 * ACERVO DA BIBLIOTECA — livros que se leem de verdade.
 *
 * Sete assuntos, catorze títulos, cada um com páginas curtas. Alguns só
 * aparecem depois de o jogador ter ido aonde o livro fala: os da represa
 * dependem de ter descido, os da ferrovia dependem de ter recolhido algum
 * documento dela. Nenhum livro explica a represa; o que eles fazem é dizer o
 * que a cidade registrou sobre si mesma.
 */
export type AssuntoDeLivro = 'historia' | 'represa' | 'ferrovia' | 'eletronica' | 'agricultura' | 'romance' | 'jornais';
export interface Livro {
  id: string;
  titulo: string;
  autor: string;
  assunto: AssuntoDeLivro;
  paginas: readonly string[];
  /** Flag exigida para o título aparecer no acervo. */
  requisito?: string;
}
export interface ContextoBiblioteca {
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}
export const NOME_DO_ASSUNTO: Record<AssuntoDeLivro, string> = {
  historia: 'História local', represa: 'A represa', ferrovia: 'A ferrovia', eletronica: 'Eletrônica',
  agricultura: 'Agricultura', romance: 'Romances', jornais: 'Jornais antigos',
};

export const LIVROS: readonly Livro[] = [
  { id: 'fundacao', titulo: 'Rio Claro: notas de fundação', autor: 'Prefeitura, edição de bolso', assunto: 'historia', paginas: [
    'A cidade não foi fundada: foi ficando. O entroncamento da ferrovia trouxe gente que ia embora e acabou construindo casa.',
    'O primeiro mapa oficial tem dezesseis construções e um erro de escala que sobreviveu a três reedições.',
    'A prefeitura funcionou onde hoje é o mercado. O balcão é o mesmo, e ninguém confirma isso oficialmente.',
  ] },
  { id: 'nomes', titulo: 'De onde vêm os nomes daqui', autor: 'Professora Ilda', assunto: 'historia', paginas: [
    'Rio Claro é nome do rio, e o rio já tinha nome antes da represa. Depois da represa, continuou tendo.',
    'Bairro da Estação é o único nome que descreve uma coisa que não existe mais. A cidade não quis trocar.',
    'Há um lugar que todo mundo chama de "curva da usina" e que não fica em curva nenhuma.',
  ] },
  { id: 'obra_represa', titulo: 'A obra da represa em números', autor: 'Companhia, relatório público', assunto: 'represa', requisito: 'campanha:cena:prologo', paginas: [
    'Três anos de obra, quatrocentos trabalhadores no pico, dois turnos e meio. O meio turno era a manutenção da madrugada.',
    'O relatório lista o que foi alagado: duas estradas vicinais, um cemitério pequeno transferido e onze benfeitorias indenizadas.',
    'A última página é um agradecimento genérico. Não há lista de nomes.',
  ] },
  { id: 'agua_luz', titulo: 'Água, luz e o que veio junto', autor: 'Clara, compilação do acervo', assunto: 'represa', requisito: 'campanha:profundidade', paginas: [
    'A energia chegou às casas em ordem de rua. A última rua a receber foi a que ficava mais perto da usina.',
    'Com a luz vieram o rádio, a geladeira e o turno da noite. O relatório não trata dos dois últimos.',
    'Há um parágrafo sobre "desativação parcial" datado de muitos anos depois. Não diz de qual parte.',
  ] },
  { id: 'ramal', titulo: 'O ramal que passava aqui', autor: 'Roberto, ferroviário aposentado', assunto: 'ferrovia', requisito: 'memoria:ferrovia', paginas: [
    'O ramal tinha dezenove quilômetros e três paradas. A nossa era a do meio, e por isso a mais movimentada.',
    'O maquinista buzinava duas vezes na curva de cima. Quem morava perto sabia a hora sem olhar relógio.',
    'Quando o serviço acabou, os trilhos ficaram. Viraram mourão, banco, batente de porta e peso de papel.',
  ] },
  { id: 'tuneis', titulo: 'Túneis e bocas de serviço', autor: 'Manual de engenharia, 2ª edição', assunto: 'ferrovia', requisito: 'memoria:ferrovia', paginas: [
    'Toda linha tem bocas de serviço menores que o gabarito do trem: drenagem, manutenção, abrigo de equipe.',
    'Fechá-las com alvenaria era prática comum ao desativar um ramal. O manual recomenda registrar a data em placa.',
    'Aqui não há placa. Isso não quer dizer nada além de que não há placa.',
  ] },
  { id: 'consertos', titulo: 'Consertos de bancada', autor: 'Apostila de curso técnico', assunto: 'eletronica', paginas: [
    'Antes de abrir, ouça o cliente. Metade do diagnóstico está na frase que ele repete sem perceber.',
    'Capacitor estufado, solda fria, trilha rompida: três causas para o mesmo sintoma. Descarte na ordem do mais barato.',
    'Anote o que você fez. O próximo a abrir esse aparelho pode ser você mesmo, daqui a dois anos.',
  ] },
  { id: 'medidas', titulo: 'Medir antes de trocar', autor: 'Apostila de curso técnico', assunto: 'eletronica', paginas: [
    'Multímetro não conserta nada. Ele só impede você de trocar peça boa.',
    'Tensão certa com comportamento errado é sinal de contato, não de componente.',
    'A peça que queima duas vezes não é a culpada: ela é a que avisa.',
  ] },
  { id: 'plantio', titulo: 'Calendário de plantio da região', autor: 'Cooperativa', assunto: 'agricultura', paginas: [
    'O calendário é um acordo entre a chuva e a paciência. A chuva não assinou.',
    'Aqui se planta pensando em dois anos: o que dá neste e o que a terra aguenta no próximo.',
    'A parte mais lida desta apostila é a tabela de conservas, no fim. Está manchada em todos os exemplares.',
  ] },
  { id: 'conservas', titulo: 'Conservas, defumados e o inverno', autor: 'Neide, anotações cedidas', assunto: 'agricultura', paginas: [
    'Conserva boa precisa de tempo, e de alguém que não abra o vidro para conferir.',
    'Medida certa é a que a sua mão já sabe. Escreva assim mesmo: "até parecer certo".',
    'Guarde uma parte para dar. Uma despensa cheia que não sai de casa azeda de outro jeito.',
  ] },
  { id: 'casa_vazia', titulo: 'A casa do meio da rua', autor: 'romance, autor local', assunto: 'romance', paginas: [
    'O livro conta três anos de uma casa em que um homem chega, arruma pouca coisa e fica.',
    'Não há reviravolta. Na metade, ele conserta uma torneira e a vizinha aparece com pão.',
    'O último capítulo é uma tarde inteira sem acontecimento nenhum. A edição tem uma errata pedindo desculpa por isso.',
  ] },
  { id: 'carta_marcada', titulo: 'Carta marcada', autor: 'romance policial de banca', assunto: 'romance', paginas: [
    'Um detetive de cidade pequena resolve um caso que não precisava de detetive.',
    'A melhor parte é a descrição do bar, que é igual ao daqui, inclusive no barulho da porta.',
    'O culpado é quem parecia. O livro sabe disso e faz piada com o leitor na última página.',
  ] },
  { id: 'jornal_1', titulo: 'Encadernado: os primeiros dez anos', autor: 'Jornal da cidade', assunto: 'jornais', paginas: [
    'Manchetes de obra, de festa e de chuva. Uma delas anuncia a chegada da energia com quatro exclamações.',
    'A coluna social listava quem viajava de trem. Deixou de existir junto com o ramal.',
    'Há um anúncio de oficina de consertos que funcionava onde hoje é a sua.',
  ] },
  { id: 'jornal_2', titulo: 'Encadernado: a década da usina', autor: 'Jornal da cidade', assunto: 'jornais', requisito: 'campanha:cena:prologo', paginas: [
    'A usina aparece em quase toda capa, sempre como promessa ou como número.',
    'Uma edição traz a foto do terceiro turno saindo ao amanhecer. A legenda erra dois nomes.',
    'A última menção é curta: "operação reduzida". Depois disso, o jornal volta a falar de chuva e de feira.',
  ] },
];

export function livrosDisponiveis(c: ContextoBiblioteca): Livro[] {
  return LIVROS.filter(l => !l.requisito || c.worldEvents.ativa(l.requisito) || typeof c.worldEvents.obter(l.requisito) === 'number');
}
export function livrosDoAssunto(c: ContextoBiblioteca, assunto: AssuntoDeLivro): Livro[] {
  return livrosDisponiveis(c).filter(l => l.assunto === assunto);
}
export function assuntosDisponiveis(c: ContextoBiblioteca): AssuntoDeLivro[] {
  const presentes = new Set(livrosDisponiveis(c).map(l => l.assunto));
  return (Object.keys(NOME_DO_ASSUNTO) as AssuntoDeLivro[]).filter(a => presentes.has(a));
}
export function jaLeu(c: ContextoBiblioteca, id: string): boolean { return c.worldEvents.ativa(`livro:${id}`); }
export function marcarLido(c: ContextoBiblioteca, id: string): boolean {
  if (!LIVROS.some(l => l.id === id) || jaLeu(c, id)) return false;
  c.worldEvents.definir(`livro:${id}`, true);
  return true;
}
export function quantosLidos(c: ContextoBiblioteca): number {
  return LIVROS.filter(l => jaLeu(c, l.id)).length;
}

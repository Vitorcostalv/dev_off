import { dataDoDia, DIAS_POR_ESTACAO } from './calendario.ts';
import { encontroDoDia } from './rotinaSocial.ts';
import { aniversariantesDoDia } from './aniversarios.ts';
import { PROJETOS_CIDADE } from './cidade.ts';
import type { IdProjetoCidade } from './cidade.ts';
import type { Clima } from './clima.ts';

/**
 * JORNAL SEMANAL — uma folha de quatro páginas que a cidade imprime às
 * segundas. Nada nele é inventado na hora: cada seção lê o mundo (obras,
 * encontros, clima da semana, aniversários, história e o que andou circulando)
 * e escreve a partir do que já aconteceu.
 *
 * A manchete reage ao que o jogador financiou. Sem obra nova, a manchete é da
 * cidade mesmo — o jornal não fica esperando o protagonista fazer alguma coisa.
 */
export interface ContextoJornal {
  dia: number;
  clima: { paraDia(dia: number): Clima };
  cidade: { construido(id: IdProjetoCidade): boolean };
  relacoes: { listaInteragidos(): string[] };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}
export interface SecaoDoJornal { titulo: string; texto: string }
export interface EdicaoDoJornal { numero: number; primeiroDia: number; manchete: string; secoes: SecaoDoJornal[] }

export function numeroDaEdicao(dia: number): number { return Math.floor(Math.max(0, dia) / 7) + 1; }
export function primeiroDiaDaEdicao(dia: number): number { return Math.floor(Math.max(0, dia) / 7) * 7; }

const HISTORIA: readonly string[] = [
  'A cidade nasceu de um entroncamento: a ferrovia passava, e quem descia para esperar acabava ficando.',
  'A usina empregou três gerações. O primeiro turno saía de bicicleta às quatro e meia da manhã.',
  'O nome Rio Claro veio antes da represa. Depois da represa, o rio continuou com o nome.',
  'A escola funcionou dez anos num galpão emprestado, até a construção do prédio atual.',
  'O último trem de passageiros parou aqui numa terça-feira. Não houve cerimônia; ninguém sabia que era o último.',
  'A praça teve um coreto que foi desmontado para virar material de obra. Ninguém lembra de qual obra.',
  'A biblioteca começou com uma estante numa sala da escola, com livros doados por dezessete famílias.',
  'O bar já foi armazém, depois mercearia, depois bar. O balcão é o mesmo das três vezes.',
];
const RUMORES: readonly string[] = [
  'Dizem que o gato laranja da praça é o mesmo há quinze anos. Não pode ser, e todo mundo repete.',
  'Falam de um som de máquina na estrada alta durante a madrugada. A companhia diz que é a ronda.',
  'Comentam que vai abrir uma loja nova no lote vago. Comentam isso desde o ano passado.',
  'Alguém jura ter visto luz na antiga usina. Outro alguém jura que era a lua no telhado.',
  'Há quem diga que existe um túnel da ferrovia fechado com alvenaria. Há quem diga que é porão.',
];

function secaoObras(c: ContextoJornal): SecaoDoJornal {
  const construidos = (Object.keys(PROJETOS_CIDADE) as IdProjetoCidade[]).filter(id => c.cidade.construido(id));
  if (!construidos.length) {
    return { titulo: 'Obras', texto: 'Nenhuma obra em andamento. Os lotes vagos continuam vagos, e o quadro da praça segue aceitando propostas.' };
  }
  const recentes = construidos.filter(id => {
    const quando = Number(c.worldEvents.obter(`jornal:obra:${id}`) ?? -99);
    return quando >= primeiroDiaDaEdicao(c.dia) - 7 && quando <= c.dia;
  });
  const nomes = construidos.map(id => PROJETOS_CIDADE[id].nome);
  return {
    titulo: 'Obras',
    texto: recentes.length
      ? `${recentes.map(id => PROJETOS_CIDADE[id].nome).join(' e ')} ${recentes.length > 1 ? 'entraram' : 'entrou'} em funcionamento. Em pé na cidade: ${nomes.join(', ')}.`
      : `Em funcionamento: ${nomes.join(', ')}. Nenhuma obra nova nesta semana.`,
  };
}
function secaoEventos(c: ContextoJornal): SecaoDoJornal {
  const inicio = primeiroDiaDaEdicao(c.dia);
  const encontros: string[] = [];
  for (let d = inicio; d < inicio + 7; d++) {
    const e = encontroDoDia(d);
    if (e) encontros.push(`${dataDoDia(d).diaEstacao} — ${e.nome}`);
  }
  return {
    titulo: 'Agenda',
    texto: encontros.length ? encontros.join('\n') : 'Semana sem encontro marcado. O bar abre no horário de sempre.',
  };
}
function secaoClima(c: ContextoJornal): SecaoDoJornal {
  const inicio = primeiroDiaDaEdicao(c.dia);
  const dias = Array.from({ length: 7 }, (_, i) => c.clima.paraDia(inicio + i));
  const contagem = new Map<Clima, number>();
  for (const clima of dias) contagem.set(clima, (contagem.get(clima) ?? 0) + 1);
  const dominante = [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
  const chuvosos = dias.filter(d => d === 'Chuva' || d === 'Temporal').length;
  return {
    titulo: 'Tempo',
    texto: `Semana predominantemente de ${dominante[0].toLowerCase()} (${dominante[1]} dias).` +
      (chuvosos ? ` ${chuvosos} dia(s) de chuva; quem planta agradece e quem seca roupa reclama.` : ' Sem chuva prevista para a semana.'),
  };
}
function secaoMoradores(c: ContextoJornal): SecaoDoJornal {
  const inicio = primeiroDiaDaEdicao(c.dia);
  const conhecidos = c.relacoes.listaInteragidos();
  const linhas: string[] = [];
  for (let d = inicio; d < inicio + 7; d++) {
    for (const npc of aniversariantesDoDia(d)) {
      if (conhecidos.includes(npc)) linhas.push(`${dataDoDia(d).diaEstacao}: ${npc} faz aniversário.`);
    }
  }
  return {
    titulo: 'Moradores',
    texto: linhas.length ? linhas.join('\n') : 'Nenhum aniversário de quem você conhece nesta semana. A coluna social da cidade é pequena de propósito.',
  };
}
function secaoHistoria(c: ContextoJornal): SecaoDoJornal {
  const semana = numeroDaEdicao(c.dia) - 1;
  const arquivadas = Number(c.worldEvents.obter('memoria:arquivados') ?? 0);
  const base = HISTORIA[semana % HISTORIA.length]!;
  return {
    titulo: 'Memória',
    texto: arquivadas >= 3
      ? `${base}\n\nA coluna desta semana saiu do arquivo histórico que está sendo organizado na biblioteca, com ${arquivadas} documento(s) já catalogado(s).`
      : base,
  };
}
function secaoRumores(c: ContextoJornal): SecaoDoJornal {
  const semana = numeroDaEdicao(c.dia) - 1;
  const linhas = [RUMORES[semana % RUMORES.length]!];
  // O jogador também dá assunto — sempre no tom de quem viu de longe.
  if (typeof c.worldEvents.obter('social:noiteRepresa') === 'number') {
    linhas.push('Viram alguém subindo a estrada alta de madrugada. Quem viu não perguntou nada.');
  }
  if (c.worldEvents.obter('companhia:nome')) {
    linhas.push(`Um bicho da rua agora tem casa e nome: ${String(c.worldEvents.obter('companhia:nome'))}.`);
  }
  if (Number(c.worldEvents.obter('oficina:servicos') ?? 0) >= 5) {
    linhas.push('A oficina do bairro anda cheia. Dizem que o moço devolve o aparelho explicando o que fez.');
  }
  return { titulo: 'Circulando', texto: linhas.join('\n') };
}

export function edicaoDaSemana(c: ContextoJornal): EdicaoDoJornal {
  const numero = numeroDaEdicao(c.dia);
  const obras = secaoObras(c);
  const construidos = (Object.keys(PROJETOS_CIDADE) as IdProjetoCidade[]).filter(id => c.cidade.construido(id));
  const recente = construidos.find(id => Number(c.worldEvents.obter(`jornal:obra:${id}`) ?? -99) >= primeiroDiaDaEdicao(c.dia) - 7);
  const museu = c.worldEvents.ativa('memoria:museu');
  const manchete = recente
    ? `${PROJETOS_CIDADE[recente].nome.toUpperCase()} ABRE AS PORTAS`
    : museu && numero % 2 === 0
      ? 'SALA DE MEMÓRIA REÚNE O QUE A CIDADE GUARDOU'
      : [
        'CIDADE PEDE REPARO NA PONTE DEPOIS DA CHUVA',
        'ESCOLA ABRE OFICINA NO CONTRATURNO',
        'FEIRA MUDA DE HORÁRIO A PEDIDO DOS PRODUTORES',
        'BIBLIOTECA RECEBE DOAÇÃO DE LIVROS E FOTOGRAFIAS',
      ][(numero - 1) % 4]!;
  return {
    numero,
    primeiroDia: primeiroDiaDaEdicao(c.dia),
    manchete,
    secoes: [obras, secaoEventos(c), secaoClima(c), secaoMoradores(c), secaoHistoria(c), secaoRumores(c)],
  };
}
export function jaLeuEdicao(c: ContextoJornal, numero: number): boolean {
  return c.worldEvents.ativa(`jornal:lido:${numero}`);
}
export function marcarEdicaoLida(c: ContextoJornal, numero: number): void {
  c.worldEvents.definir(`jornal:lido:${numero}`, true);
}
/** Quantas edições existem desde o começo do jogo, para o índice do acervo. */
export function edicoesAte(dia: number): number[] {
  return Array.from({ length: numeroDaEdicao(dia) }, (_, i) => i + 1).slice(-Math.min(numeroDaEdicao(dia), DIAS_POR_ESTACAO));
}

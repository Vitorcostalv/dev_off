import { dataDoDia, DIAS_POR_ESTACAO, ESTACOES } from './calendario.ts';
import { escreverDiario } from './diarioPessoal.ts';

/**
 * ANIVERSÁRIOS. Cada um dos 33 moradores tem uma data fixa no calendário de
 * quatro estações, e o protagonista também tem a dele. O sistema trata quatro
 * coisas que a data sozinha não dá:
 *
 *   PRESENTE    — entregar no dia conta diferente de entregar em outro dia;
 *   ESQUECIMENTO— não aparecer rende uma fala no dia seguinte, e nada além disso;
 *   VISITA      — no aniversário do protagonista, quem sabe da data bate na porta;
 *   CONVITE     — o aniversariante chama para a noite, sem tarefa e sem prazo.
 *
 * Ninguém sabe do aniversário do protagonista até ele contar. Depois de contar,
 * a lembrança é progressiva: quem convive mais lembra no primeiro ano, os
 * outros podem lembrar só no seguinte. Esquecer não tira ponto de ninguém.
 */
export interface DataDoAno { estacao: number; dia: number }
export interface ContextoAniversario {
  dia: number;
  relacoes: { getScore(id: string): number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export const ANIVERSARIOS: Record<string, DataDoAno> = {
  edu: { estacao: 0, dia: 3 }, mari: { estacao: 0, dia: 6 }, jaqueline: { estacao: 0, dia: 9 },
  leticia: { estacao: 0, dia: 12 }, livia: { estacao: 0, dia: 16 }, matheus: { estacao: 0, dia: 19 },
  cecilia: { estacao: 0, dia: 23 }, clara: { estacao: 0, dia: 26 },
  wendel: { estacao: 1, dia: 2 }, alice: { estacao: 1, dia: 5 }, hiago: { estacao: 1, dia: 10 },
  vitor: { estacao: 1, dia: 13 }, lucia: { estacao: 1, dia: 17 }, caio: { estacao: 1, dia: 20 },
  helena: { estacao: 1, dia: 23 }, julia: { estacao: 1, dia: 27 },
  luke: { estacao: 2, dia: 3 }, ravi: { estacao: 2, dia: 5 }, davi: { estacao: 2, dia: 8 },
  samanta: { estacao: 2, dia: 11 }, manuela: { estacao: 2, dia: 15 }, arthur: { estacao: 2, dia: 18 },
  rita: { estacao: 2, dia: 22 }, roberto: { estacao: 2, dia: 26 },
  suzan: { estacao: 3, dia: 2 }, ilda: { estacao: 3, dia: 4 }, lucas: { estacao: 3, dia: 8 },
  rafael: { estacao: 3, dia: 10 }, tulio: { estacao: 3, dia: 12 }, joao: { estacao: 3, dia: 16 },
  neide: { estacao: 3, dia: 19 }, priscila: { estacao: 3, dia: 23 }, bruno: { estacao: 3, dia: 26 },
};
/** O protagonista nasceu no outono; ninguém na cidade sabe disso ainda. */
export const ANIVERSARIO_PROTAGONISTA: DataDoAno = { estacao: 2, dia: 20 };

export function dataLegivel(data: DataDoAno): string { return `${data.dia} de ${ESTACOES[data.estacao]}`; }
export function ehAniversario(data: DataDoAno, dia: number): boolean {
  const d = dataDoDia(Math.max(0, dia));
  return d.estacao === data.estacao && d.diaEstacao === data.dia;
}
export function aniversarioDe(id: string): DataDoAno | null { return ANIVERSARIOS[id] ?? null; }
export function aniversariantesDoDia(dia: number): string[] {
  return Object.keys(ANIVERSARIOS).filter(id => ehAniversario(ANIVERSARIOS[id]!, dia));
}
/** Dia absoluto do próximo aniversário de alguém, para o calendário do celular. */
export function proximoAniversario(id: string, dia: number): number | null {
  const data = aniversarioDe(id);
  if (!data) return null;
  const inicio = Math.max(0, dia);
  for (let d = inicio; d < inicio + DIAS_POR_ESTACAO * 4 + 1; d++) if (ehAniversario(data, d)) return d;
  return null;
}
export function meuAniversarioHoje(dia: number): boolean { return ehAniversario(ANIVERSARIO_PROTAGONISTA, dia); }

// ------------------------------------------------- aniversário dos moradores --
const FALAS: Record<string, string> = {
  edu: 'É hoje, sim. Eu não ia comentar. Obrigado por saber sem eu ter que anunciar.',
  mari: 'Faço aniversário e treino igual. A diferença é que hoje eu paro no horário.',
  jaqueline: 'Eu fiz bolo para mim mesma. Fiz dois, porque eu sabia que alguém apareceria.',
  leticia: 'Ninguém me fotografa hoje. Regra minha. Você pode ficar, mesmo assim.',
  wendel: 'Não faço nada há alguns anos. Este ano abri a farmácia mais tarde.',
  alice: 'Aniversário no bar é assim: eu sirvo, todo mundo brinda, eu fico em pé.',
  hiago: 'Dei uma volta longa de manhã. É o que eu gosto de ganhar.',
  vitor: 'Escolhi as músicas da noite. Aniversário serve para isso.',
  luke: 'Ganhei uma peça nova. Não sei ainda o que vou fazer com ela!',
  davi: 'Fiz o meu próprio bolo. Antes que alguém faça um pior.',
  clara: 'Marquei a página e fechei o livro mais cedo. Já é bastante.',
  ilda: 'Na minha idade a gente comemora o ano que passou, não a idade.',
  roberto: 'Ilda faz questão. Eu reclamo e depois janto tudo.',
  joao: 'Dia de trabalho como os outros. À noite a Neide não deixa eu levantar da cadeira.',
  neide: 'Eu escondi a data e o João contou para meia cidade.',
  ravi: 'Meus avós fizeram uma festa pequena. Eu pedi pequena.',
};
export function falaDeAniversario(c: ContextoAniversario, id: string): string | null {
  const data = aniversarioDe(id);
  if (!data || !ehAniversario(data, c.dia)) return null;
  const chave = `aniversario:falou:${id}:${dataDoDia(c.dia).ano}`;
  if (c.worldEvents.ativa(chave)) return null;
  c.worldEvents.definir(chave, true);
  return FALAS[id] ?? 'É meu aniversário hoje. Não é grande coisa, mas é hoje.';
}
/** Convite para a noite. Sem tarefa, sem prazo e sem recompensa material. */
export function conviteDeAniversario(c: ContextoAniversario, id: string): string | null {
  const data = aniversarioDe(id);
  if (!data || !ehAniversario(data, c.dia) || c.relacoes.getScore(id) < 4) return null;
  return id === 'alice'
    ? 'Depois das nove eu baixo a porta pela metade. Se você estiver por aí, entra.'
    : 'Vou ficar um pouco no bar depois do jantar. Não precisa levar nada; só apareça se der.';
}
/** Estar presente no dia é o que fica registrado — com ou sem presente. */
export function lembrarDoAniversario(c: ContextoAniversario, id: string, comPresente: boolean): boolean {
  const data = aniversarioDe(id);
  if (!data || !ehAniversario(data, c.dia)) return false;
  const ano = dataDoDia(c.dia).ano;
  const chave = `aniversario:lembrei:${id}:${ano}`;
  if (c.worldEvents.ativa(chave)) return false;
  c.worldEvents.definir(chave, true);
  if (comPresente) c.worldEvents.definir(`aniversario:presente:${id}:${ano}`, true);
  escreverDiario(c, `aniversario:${id}:${ano}`, comPresente
    ? `Levei uma coisa pequena para ${id}. Chegar no dia foi a parte que importou.`
    : `Passei no aniversário de ${id}. Não levei nada. Ninguém pediu nada.`);
  return true;
}
/**
 * ESQUECIMENTO: no dia seguinte, quem fez aniversário e não viu o jogador
 * comenta uma vez. É uma fala, não uma perda de relação.
 */
export function comentarioDeEsquecimento(c: ContextoAniversario, id: string): string | null {
  const data = aniversarioDe(id);
  if (!data || !ehAniversario(data, c.dia - 1) || c.relacoes.getScore(id) < 2) return null;
  const ano = dataDoDia(Math.max(0, c.dia - 1)).ano;
  if (c.worldEvents.ativa(`aniversario:lembrei:${id}:${ano}`)) return null;
  const chave = `aniversario:cobrou:${id}:${ano}`;
  if (c.worldEvents.ativa(chave)) return null;
  c.worldEvents.definir(chave, true);
  return 'Ontem foi meu aniversário. Não estou cobrando; só achei que você gostaria de saber.';
}

// ---------------------------------------------- aniversário do protagonista --
/** Contar a data é uma escolha do jogador, e exige alguma intimidade. */
export function contarMeuAniversario(c: ContextoAniversario, id: string): boolean {
  if (c.relacoes.getScore(id) < 4 || c.worldEvents.ativa(`aniversario:sabe:${id}`)) return false;
  c.worldEvents.definir(`aniversario:sabe:${id}`, true);
  c.worldEvents.definir(`aniversario:contei:${id}`, c.dia);
  return true;
}
export function sabeDoMeuAniversario(c: ContextoAniversario, id: string): boolean {
  return c.worldEvents.ativa(`aniversario:sabe:${id}`);
}
export function quemSabeDoMeuAniversario(c: ContextoAniversario): string[] {
  return Object.keys(ANIVERSARIOS).filter(id => sabeDoMeuAniversario(c, id));
}
/**
 * LEMBRANÇA PROGRESSIVA: no primeiro ano só lembra quem é próximo; nos anos
 * seguintes, quem já soube antes lembra também. Um esquecimento não é castigo:
 * o texto de quem lembra depois diz isso.
 */
export function lembraDaMinhaData(c: ContextoAniversario, id: string): boolean {
  if (!sabeDoMeuAniversario(c, id)) return false;
  const contei = Number(c.worldEvents.obter(`aniversario:contei:${id}`) ?? 0);
  const anosDesde = Math.floor((c.dia - contei) / (DIAS_POR_ESTACAO * 4));
  return c.relacoes.getScore(id) >= 6 || anosDesde >= 1;
}
export function felicitacaoDeHoje(c: ContextoAniversario, id: string): string | null {
  if (!meuAniversarioHoje(c.dia) || !lembraDaMinhaData(c, id)) return null;
  const ano = dataDoDia(c.dia).ano;
  const chave = `aniversario:meu:${id}:${ano}`;
  if (c.worldEvents.ativa(chave)) return null;
  c.worldEvents.definir(chave, true);
  const primeira = !c.worldEvents.ativa(`aniversario:meu:${id}:${ano - 1}`);
  const falas: Record<string, string> = {
    edu: 'Hoje é o seu dia. Não vou fazer alarde. Só não vou deixar passar.',
    jaqueline: 'Você contou uma vez, de passagem. Eu anotei no caderno de receitas. Tem bolo.',
    leticia: 'Trouxe uma fotografia sua de outro dia. Hoje você não precisa posar.',
    alice: 'Sua conta está fechada hoje. Não discute.',
    wendel: 'Eu lembro das datas que as pessoas me contam. Feliz aniversário.',
    mari: 'Parabéns. Hoje o treino é opcional, e eu estou dizendo isso de verdade.',
    hiago: 'Parabéns! Se quiser, a gente dá uma volta sem destino.',
    vitor: 'Separei uma música que você ouviu uma vez e não comentou. Achei que tinha gostado.',
  };
  const base = falas[id] ?? 'Feliz aniversário. Eu lembrei sozinho, e isso me deixou contente.';
  return primeira ? base : `${base} Segundo ano que eu lembro.`;
}
export interface VisitaDeAniversario { npc: string; falas: readonly string[] }
/**
 * VISITA em casa, no aniversário do protagonista: vem uma pessoa só, a de maior
 * convivência entre quem lembra, e a cena não pede nada em troca.
 */
export function visitaDeAniversario(c: ContextoAniversario): VisitaDeAniversario | null {
  if (!meuAniversarioHoje(c.dia)) return null;
  const ano = dataDoDia(c.dia).ano;
  if (c.worldEvents.ativa(`aniversario:visita:${ano}`)) return null;
  const candidatos = quemSabeDoMeuAniversario(c).filter(id => lembraDaMinhaData(c, id));
  if (!candidatos.length) return null;
  const escolhido = candidatos.sort((a, b) =>
    (c.relacoes.getScore(b) - c.relacoes.getScore(a)) || (Number(c.worldEvents.obter(`social:dias:${b}`) ?? 0) - Number(c.worldEvents.obter(`social:dias:${a}`) ?? 0)) || a.localeCompare(b))[0]!;
  c.worldEvents.definir(`aniversario:visita:${ano}`, true);
  escreverDiario(c, `aniversario:visita:${ano}`, 'Alguém bateu na porta hoje. Não era serviço. Era só o dia.');
  return { npc: escolhido, falas: [
    'Bati na porta sem avisar. Se for hora ruim, eu volto amanhã.',
    'Não trouxe nada grande. Trouxe o dia, que é o que a gente tem.',
    'Você não precisa fazer nada com isso. Eu só não queria que hoje passasse sem ninguém.',
  ] };
}

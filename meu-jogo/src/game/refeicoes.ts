import { escreverDiario } from './diarioPessoal.ts';

/**
 * REFEIÇÕES E RECEITAS.
 *
 * Comer não restaura nada e não é obrigatório — o jogo não tem fome. O que uma
 * refeição faz é marcar o dia: comer sozinho em casa, comer no bar, jantar com
 * alguém ou cozinhar para quem foi convidado. As receitas vêm dos moradores, e
 * cada uma carrega a história de quem ensinou.
 */
export type TipoRefeicao = 'sozinho' | 'bar' | 'jantar' | 'cozinhar';
export interface ContextoRefeicao {
  dia: number;
  relogio: { minutos: number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export interface Prato {
  id: string;
  nome: string;
  /** Quem ensinou; a receita não existe sem a pessoa. */
  npc: string;
  /** Flag que libera a receita — sempre uma cena de vínculo já vivida. */
  requisito: string;
  historia: string;
  aoServir: string;
}
export const PRATOS: readonly Prato[] = [
  { id: 'pao', nome: 'Pão de Davi', npc: 'davi', requisito: 'vinculo:davi:1',
    historia: 'Davi mediu a farinha com a mão e disse que a receita é a mesma da padaria onde ele se machucou. Ele não fez cara de quem lembrou disso agora.',
    aoServir: 'O pão saiu denso demais. Ninguém devolveu o pedaço.' },
  { id: 'conserva', nome: 'Conserva de Neide', npc: 'neide', requisito: 'vinculo:neide:2',
    historia: 'Neide não deu medida: disse "até parecer certo". Anotei assim mesmo, e ela conferiu a anotação.',
    aoServir: 'Abri o vidro da conserva. O cheiro tomou a cozinha antes de qualquer conversa.' },
  { id: 'petisco', nome: 'Petisco do bar de Alice', npc: 'alice', requisito: 'vinculo:alice:2',
    historia: 'Alice ensinou entre um pedido e outro, sem parar de trabalhar. "Não é segredo. É só prática."',
    aoServir: 'Servi o petisco do bar em casa. Ficou parecido; o barulho do bar é que faltou.' },
  { id: 'sem_medida', nome: 'Receita sem medida de Jaqueline', npc: 'jaqueline', requisito: 'vinculo:jaqueline:0',
    historia: 'Jaqueline dizia "um pouco" para tudo. A mãe dela dizia igual. Eu escrevi "um pouco" quatro vezes no papel.',
    aoServir: 'Fiz a receita sem medida. Errei para mais, que é como ela erraria.' },
];
export function pratosAprendidos(c: ContextoRefeicao): Prato[] {
  return PRATOS.filter(p => c.worldEvents.ativa(p.requisito));
}
export function historiaDoPrato(c: ContextoRefeicao, id: string): string | null {
  const prato = pratosAprendidos(c).find(p => p.id === id);
  if (!prato) return null;
  // Ver a receita pela primeira vez deixa registro; reler não.
  escreverDiario(c, `receita:${prato.id}`, `${prato.historia}`);
  return prato.historia;
}

export interface Refeicao { texto: string; relacao: { npc: string; pontos: number } | null }
export function refeicaoDeHoje(c: ContextoRefeicao): TipoRefeicao | null {
  const tipo = c.worldEvents.obter('refeicao:tipo');
  return c.worldEvents.obter('refeicao:dia') === c.dia && typeof tipo === 'string' ? tipo as TipoRefeicao : null;
}
const JANTAR = (minuto: number): boolean => minuto >= 18 * 60 || minuto < 2 * 60;

/**
 * Uma refeição por dia entra no caderno; comer de novo continua permitido e só
 * muda o texto. Convidar alguém rende meio ponto de relação, nunca item.
 */
export function comer(c: ContextoRefeicao, tipo: TipoRefeicao, com?: string, prato?: string): Refeicao | null {
  const repetida = refeicaoDeHoje(c) !== null;
  const escolhido = prato ? pratosAprendidos(c).find(p => p.id === prato) : undefined;
  if (tipo === 'cozinhar' && !escolhido) return null;
  if (tipo === 'jantar' && !com) return null;
  let texto: string;
  if (tipo === 'sozinho') {
    texto = repetida
      ? 'Comi de novo, em pé, olhando a janela. Não foi por fome.'
      : c.worldEvents.ativa('campanha:cena:leticia')
        ? 'Comi sentado, com o prato na mesa e não no colo. Faz diferença e eu não sei explicar por quê.'
        : 'Comi direto da panela, em pé. A casa ainda não tem mesa posta.';
  } else if (tipo === 'bar') {
    texto = repetida
      ? 'Mais um prato no balcão. Alice não comenta a repetição.'
      : 'Comi no balcão do bar. Alice serviu sem perguntar o que eu queria e acertou.';
  } else if (tipo === 'jantar') {
    texto = JANTAR(c.relogio.minutos)
      ? `Jantei com ${com}. A conversa não teve assunto de serviço no meio.`
      : `Almocei com ${com}. Não era hora de jantar, e ninguém reclamou.`;
  } else {
    texto = `${escolhido!.aoServir}${com ? ` ${com} comeu duas vezes e disse que não ia comer.` : ' Comi sozinho o que aprendi com outra pessoa.'}`;
  }
  if (!repetida) {
    c.worldEvents.definir('refeicao:dia', c.dia);
    c.worldEvents.definir('refeicao:tipo', tipo);
    escreverDiario(c, `refeicao:${c.dia}`, texto);
  }
  const pontos = com && (tipo === 'jantar' || tipo === 'cozinhar') && !repetida ? 0.5 : 0;
  return { texto, relacao: com && pontos > 0 ? { npc: com, pontos } : null };
}
/** Convidar exige alguma relação e uma hora civilizada; não exige item. */
export function podeConvidar(c: ContextoRefeicao, score: number): boolean {
  return score >= 5 && (JANTAR(c.relogio.minutos) || (c.relogio.minutos >= 11 * 60 && c.relogio.minutos < 14 * 60));
}

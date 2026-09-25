import { escreverDiario } from './diarioPessoal.ts';

/**
 * FERIMENTO E CUIDADO.
 *
 * O HP continua sendo o número; isto é o que aparece por fora dele. Três níveis
 * de ferimento mudam as marcas desenhadas sobre o protagonista, o jeito de
 * andar e o que os moradores dizem quando o veem voltar da represa. Nenhum
 * nível tira velocidade, dinheiro ou acesso: o jogo não pune quem se machucou.
 *
 * A consulta no posto de saúde é uma cena, e a primeira delas guarda o
 * desconforto de estar num consultório — sem transformar isso em sintoma.
 */
export type NivelFerimento = 0 | 1 | 2 | 3;
export interface ContextoCuidado {
  dia: number;
  mapa: string;
  vida: { fracao: number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export function nivelDeFerimento(fracao: number): NivelFerimento {
  const f = Number.isFinite(fracao) ? fracao : 1;
  if (f >= 0.9) return 0;
  if (f >= 0.6) return 1;
  if (f >= 0.3) return 2;
  return 3;
}
export interface MarcaDeFerimento {
  parte: 'braco' | 'testa' | 'mao' | 'perna';
  /** deslocamento em unidades de sprite (48 px de altura), a partir dos pés */
  x: number; y: number; w: number; h: number; cor: number;
}
const MARCAS: Record<Exclude<NivelFerimento, 0>, readonly MarcaDeFerimento[]> = {
  1: [{ parte: 'braco', x: 5, y: -24, w: 3, h: 6, cor: 0xd6d1b9 }],
  2: [
    { parte: 'braco', x: 5, y: -24, w: 3, h: 6, cor: 0xd6d1b9 },
    { parte: 'testa', x: -4, y: -41, w: 8, h: 2, cor: 0xdcd6c0 },
  ],
  3: [
    { parte: 'braco', x: 5, y: -25, w: 4, h: 8, cor: 0xd6d1b9 },
    { parte: 'testa', x: -5, y: -41, w: 10, h: 2, cor: 0xdcd6c0 },
    { parte: 'mao', x: -8, y: -23, w: 3, h: 3, cor: 0xc9c2ab },
    { parte: 'perna', x: -6, y: -12, w: 4, h: 5, cor: 0xc9c2ab },
  ],
};
export function marcasDeFerimento(nivel: NivelFerimento): readonly MarcaDeFerimento[] {
  return nivel === 0 ? [] : MARCAS[nivel];
}
/** A partir do nível 2 o corpo denuncia: o passo fica torto, e só isso. */
export function mancando(nivel: NivelFerimento): boolean { return nivel >= 2; }
export function textoDoFerimento(nivel: NivelFerimento): string {
  return [
    'Nenhuma marca nova hoje.',
    'Um curativo no braço. Dá para trabalhar sem pensar nele.',
    'Curativo no braço e um corte na testa. O passo sai torto quando eu esqueço de prestar atenção.',
    'Curativos demais para um dia só. Nada disso é grave sozinho; junto, pesa.',
  ][nivel]!;
}

/** Marca o dia em que o jogador se machucou dentro da represa. */
export function registrarFerimentoNaRepresa(c: ContextoCuidado): void {
  if (!c.mapa.startsWith('represa') || nivelDeFerimento(c.vida.fracao) === 0) return;
  c.worldEvents.definir('cuidado:represa', c.dia);
}
export function voltouFeridoDaRepresa(c: ContextoCuidado): boolean {
  return c.worldEvents.obter('cuidado:represa') === c.dia
    && !c.mapa.startsWith('represa')
    && nivelDeFerimento(c.vida.fracao) > 0;
}
/**
 * QUEM VÊ COMENTA — uma vez por morador por dia, e sem cobrança. Ninguém
 * pergunta o que havia lá dentro; o que eles veem é o corpo de volta.
 */
export function falaDeQuemViu(c: ContextoCuidado, npcId: string): string | null {
  if (!voltouFeridoDaRepresa(c)) return null;
  const chave = `cuidado:viu:${npcId}:${c.dia}`;
  if (c.worldEvents.ativa(chave)) return null;
  const nivel = nivelDeFerimento(c.vida.fracao);
  const falas: Record<string, readonly [string, string]> = {
    wendel: ['Você veio de lá, não veio. Entra, que eu tenho gaze atrás do balcão.', 'Senta aí. Isso não é consulta, é curativo, e é de graça.'],
    mari: ['Esse braço está protegido demais. Hoje não force.', 'Você está apoiando o corpo todo de um lado só. Eu percebo isso de longe.'],
    jaqueline: ['Menino, o que foi isso? Não responde. Come alguma coisa antes.', 'Eu vou ferver água. Você senta e fica quieto.'],
    alice: ['Não vou perguntar. Só senta e bebe água antes de qualquer outra coisa.', 'Tem uma cadeira aqui com seu nome e um copo que não é conta.'],
    leticia: ['Você voltou. Isso já é o suficiente para hoje.', 'Não vou fotografar hoje. Guarda esse rosto para você.'],
    edu: ['Você está bem? Pergunta sincera, resposta opcional.', 'Se quiser, eu ando junto até sua porta. Sem conversa.'],
    hiago: ['Vi você subindo a rua devagar. Quer carona na garupa? Eu empurro.', 'A estrada de lá machuca mais do que parece.'],
    rafael: ['Isso aí vai doer amanhã mais que hoje. Gelo e descanso, nesta ordem.', 'Quando melhorar, me procura: tem exercício que evita a próxima.'],
  };
  const par = falas[npcId];
  if (!par) return null;
  c.worldEvents.definir(chave, true);
  return par[nivel >= 2 ? 1 : 0];
}

// ----------------------------------------------------------- consulta --
export interface FalaDaConsulta { nome: string; texto: string; npcId?: string }
export function consultasFeitas(c: ContextoCuidado): number {
  return Number(c.worldEvents.obter('cuidado:consultas') ?? 0);
}
/**
 * A cena muda com o número de consultas e com o estado do corpo. A primeira
 * guarda o desconforto do consultório; as seguintes mostram o lugar deixando de
 * ser estranho, sem nunca virar rotina alegre.
 */
export function cenaDaConsulta(c: ContextoCuidado, atendente: string | null, nomeAtendente: string): FalaDaConsulta[] {
  const vez = consultasFeitas(c);
  const nivel = nivelDeFerimento(c.vida.fracao);
  const abertura: FalaDaConsulta = vez === 0
    ? { nome: 'Você', texto: 'A cadeira, a luz branca e o papel na maca. Prendo a respiração antes que alguém diga qualquer coisa.' }
    : vez === 1
      ? { nome: 'Você', texto: 'Reconheço a cadeira. Dessa vez eu consigo apoiar as costas.' }
      : vez < 5
        ? { nome: 'Você', texto: 'Já sei onde ficam as coisas nesta sala. Isso ajuda mais do que eu esperava.' }
        : { nome: 'Você', texto: 'Cheguei, sentei, estendi o braço. Não precisei ensaiar o caminho.' };
  const cuidado: FalaDaConsulta = {
    nome: nomeAtendente, npcId: atendente ?? undefined,
    texto: nivel >= 2
      ? 'Vou limpar isso e explicar cada passo antes de tocar. Se precisar parar, você diz.'
      : 'Não é grave. Ainda assim eu vou olhar com calma, porque você veio até aqui.',
  };
  const resposta: FalaDaConsulta = vez === 0
    ? { nome: 'Você', texto: 'Eu peço um minuto. Ninguém discute o minuto.' }
    : { nome: 'Você', texto: 'Dessa vez eu não precisei do minuto. Guardei ele para depois.' };
  const pessoal: Record<string, string> = {
    rafael: 'Quando sarar, aparece na academia. Não para treinar: para o corpo aprender que ainda é seu.',
    priscila: 'Eu anoto tudo, inclusive o que você não conta. Não é fiscalização; é para a próxima ser mais rápida.',
    ilda: 'Já cuidei de gente que voltava daquela estrada. Eles também não explicavam.',
  };
  const final: FalaDaConsulta[] = atendente && pessoal[atendente]
    ? [{ nome: nomeAtendente, npcId: atendente, texto: pessoal[atendente]! }]
    : [];
  return [abertura, cuidado, resposta, ...final];
}
export function registrarConsulta(c: ContextoCuidado): number {
  const total = consultasFeitas(c) + 1;
  c.worldEvents.definir('cuidado:consultas', total);
  c.worldEvents.definir('cuidado:consulta', true);
  escreverDiario(c, `consulta:${total}`, total === 1
    ? 'Fui atendido. Não gosto de consultório, e mesmo assim fui.'
    : 'Segunda vez no posto. A sala continua a mesma; eu não.');
  return total;
}

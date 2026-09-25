import type { ContextoCampanha } from './campanha.ts';
export interface EntradaPessoal { id: string; dia: number; texto: string }
type Contexto = Pick<ContextoCampanha, 'dia' | 'worldEvents'>;
export function escreverDiario(c: Contexto, id: string, texto: string): void {
  if (c.worldEvents.obter(`diario:${id}`) !== undefined) return;
  c.worldEvents.definir(`diario:${id}`, JSON.stringify({ id, dia: c.dia, texto }));
}
export function lerDiario(flags: Record<string, unknown>): EntradaPessoal[] {
  return Object.entries(flags).flatMap(([k, v]) => {
    if (!k.startsWith('diario:') || typeof v !== 'string') return [];
    try {
      const e = JSON.parse(v);
      return typeof e?.id === 'string' && Number.isInteger(e.dia) && e.dia >= 0 && typeof e.texto === 'string' ? [e as EntradaPessoal] : [];
    } catch { return []; }
  }).sort((a, b) => a.dia - b.dia);
}
const CENAS: Record<string, string> = {
  prologo: 'Comprar madeira. Organizar a bancada. Não abrir o notebook hoje.',
  caixas: 'Ainda não desfiz todas as caixas. A chave agora fica ao lado da porta.',
  jaqueline: 'A vizinha pediu açúcar. Não perguntou por que vim.',
  oficina: 'Terminar o conserto. Separar os parafusos. Amanhã ver as peças do mercado.',
  leticia: 'Letícia tirou uma foto enquanto eu não prestava atenção. Ficamos um tempo sem falar.',
  edu: 'Edu desliga o computador e sai. Parece uma coisa pequena. Fiquei pensando nisso.',
  mari: 'Eu disse que não consegui continuar. Mari não tentou completar a frase por mim.',
  alice: 'Alice disse que eu não precisava contar. Pela primeira vez, a conversa não terminou por causa disso.',
  wendel: 'Uma pasta não voltou. Wendel disse que não tinha pedido tudo. Preciso lembrar disso.',
  cliente: 'Respondi ao cliente. Passei a noite revendo a resposta. Uma resposta pode terminar antes da preocupação.',
  reconhecimento: 'Fechei o arquivo. Saí da sala. Não consegui fechar o assunto.',
  recaida: 'As coisas parecem distantes outra vez. Não sei escrever sobre hoje.',
  rio: 'Ficamos perto do rio. A árvore continua caída. Letícia não tentou transformar isso numa coisa boa.',
  sacola: 'Jaqueline deixou compras. A sacola ficou na mesa. Não havia cobrança dentro.',
  pao: 'Davi trouxe pão. Comi enquanto ainda estava morno.',
  visita: 'Wendel ficou aqui um pouco. Não trouxemos assunto pronto.',
  divida: 'Alice perguntou se eu queria ficar. Fiquei. Não consertei nada em troca.',
  retorno: 'Voltei sem ter certeza. Ainda assim, fui eu quem decidiu voltar.',
  andar50: 'Precisei sentar. Depois levantei. Demorou o tempo que demorou.',
  final: 'O telefone continuou tocando quando eu saí.',
  epilogo: 'Hoje não fiz nada útil depois das seis. Foi um dia bom.',
};
export function registrarCenaNoDiario(c: Contexto, id: string): void {
  if (CENAS[id]) escreverDiario(c, `cena:${id}`, CENAS[id]);
}
/** Saves anteriores ganham só entradas de cenas já vistas, na data registrada. */
export function sincronizarDiario(c: Contexto): void {
  for (const id of Object.keys(CENAS)) {
    if (!c.worldEvents.ativa(`campanha:cena:${id}`)) continue;
    const dia = c.worldEvents.obter(`campanha:dia:${id}`);
    registrarCenaNoDiario({ ...c, dia: typeof dia === 'number' && dia >= 0 ? Math.min(c.dia, dia) : c.dia }, id);
  }
}

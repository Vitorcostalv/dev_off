import { escreverDiario } from './diarioPessoal.ts';
import type { Clima } from './clima.ts';

/**
 * ANIMAL DE COMPANHIA. Um bicho de rua já citado no quadro de avisos (o cachorro
 * manso da Zona Rural e o gato do muro do bairro) aceita companhia depois de
 * três dias de aproximação. Não há estatística de fome nem penalidade por
 * esquecer: quando ninguém alimenta, o texto diz que ele comeu na vizinhança. O
 * animal dorme em lugares diferentes, espera na porta, recolhe-se na chuva,
 * acompanha parte do caminho e fica na oficina durante o trabalho.
 */
export type EspecieCompanhia = 'cachorro' | 'gato';
export interface ContextoCompanhia {
  dia: number;
  relogio: { minutos: number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}
export interface Pretendente { id: string; especie: EspecieCompanhia; mapa: string; tile: { x: number; y: number }; apresentacao: string; nomes: readonly string[] }

export const PRETENDENTES: readonly Pretendente[] = [
  { id: 'cachorro_rural', especie: 'cachorro', mapa: 'rural', tile: { x: 29, y: 82 },
    apresentacao: 'O cachorro preto do aviso da praça está deitado na sombra. Ele levanta a cabeça e não se afasta.', nomes: ['Lasca', 'Pino', 'Vento'] },
  { id: 'gato_bairro', especie: 'gato', mapa: 'bairro', tile: { x: 46, y: 60 },
    apresentacao: 'Um gato cinza divide o muro com o sol. Ele não foge; também não vem.', nomes: ['Telha', 'Sombra', 'Grão'] },
];

const APROXIMACOES = [
  'Deixei a mão parada. Ele cheirou e voltou a deitar.',
  'Hoje ele veio antes de eu estender a mão. Ficamos os dois olhando a rua.',
  'Ele andou dois passos atrás de mim e parou na esquina, esperando eu decidir.',
] as const;

export function pretendenteNoMapa(c: ContextoCompanhia, mapa: string): Pretendente | null {
  if (companhia(c)) return null;
  return PRETENDENTES.find(p => p.mapa === mapa) ?? null;
}
/** Uma aproximação por dia por bicho; na terceira ele aceita ir junto. */
export function aproximar(c: ContextoCompanhia, id: string): { texto: string; adotavel: boolean } | null {
  const pretendente = PRETENDENTES.find(p => p.id === id);
  if (!pretendente || companhia(c)) return null;
  const total = Number(c.worldEvents.obter(`companhia:passos:${id}`) ?? 0);
  if (c.worldEvents.obter(`companhia:dia:${id}`) === c.dia) return { texto: APROXIMACOES[Math.min(total - 1, 2)] ?? APROXIMACOES[0], adotavel: total >= 3 };
  c.worldEvents.definir(`companhia:dia:${id}`, c.dia);
  c.worldEvents.definir(`companhia:passos:${id}`, total + 1);
  return { texto: APROXIMACOES[Math.min(total, 2)]!, adotavel: total + 1 >= 3 };
}
export function adotar(c: ContextoCompanhia, id: string, nome: string): boolean {
  const pretendente = PRETENDENTES.find(p => p.id === id);
  if (!pretendente || companhia(c)) return false;
  if (Number(c.worldEvents.obter(`companhia:passos:${id}`) ?? 0) < 3 || !pretendente.nomes.includes(nome)) return false;
  c.worldEvents.definir('companhia:id', id);
  c.worldEvents.definir('companhia:especie', pretendente.especie);
  c.worldEvents.definir('companhia:nome', nome);
  c.worldEvents.definir('companhia:desde', c.dia);
  escreverDiario(c, 'companhia', `${nome} veio comigo. Não precisei convencer ninguém de que eu daria conta.`);
  return true;
}
export interface Companhia { id: string; especie: EspecieCompanhia; nome: string; desde: number; convivio: number; comeuHoje: boolean }
export function companhia(c: ContextoCompanhia): Companhia | null {
  const id = c.worldEvents.obter('companhia:id'), nome = c.worldEvents.obter('companhia:nome');
  const especie = c.worldEvents.obter('companhia:especie');
  if (typeof id !== 'string' || typeof nome !== 'string' || (especie !== 'cachorro' && especie !== 'gato')) return null;
  const desde = Number(c.worldEvents.obter('companhia:desde') ?? 0);
  return { id, especie, nome, desde: Number.isSafeInteger(desde) ? desde : 0,
    convivio: Number(c.worldEvents.obter('companhia:convivio') ?? 0), comeuHoje: c.worldEvents.obter('companhia:comeu') === c.dia };
}
/** Alimentar é opcional e vale uma vez por dia. Esquecer não gera punição. */
export function alimentar(c: ContextoCompanhia): string | null {
  const bicho = companhia(c);
  if (!bicho) return null;
  if (bicho.comeuHoje) return `${bicho.nome} já comeu hoje. Ele encosta na perna e volta para o lugar dele.`;
  c.worldEvents.definir('companhia:comeu', c.dia);
  c.worldEvents.definir('companhia:convivio', bicho.convivio + 1);
  escreverDiario(c, 'companhia:comida', `Coloquei comida para ${bicho.nome}. Ele esperou eu sentar para começar.`);
  return bicho.convivio >= 14
    ? `${bicho.nome} já conhece o barulho do pote. Come sem pressa, do lado da cadeira.`
    : `${bicho.nome} come rápido e depois procura água. A tigela fica ao lado da porta.`;
}
export interface LugarDeDescanso { mapa: string; tile: { x: number; y: number }; texto: string }
const DESCANSOS: readonly LugarDeDescanso[] = [
  { mapa: 'oficina', tile: { x: 10.5, y: 15.5 }, texto: 'dormindo embaixo da bancada, entre as caixas de parafuso' },
  { mapa: 'oficina', tile: { x: 4.2, y: 10.4 }, texto: 'esticado no tapete perto da porta, de olho em quem chega' },
  { mapa: 'oficina', tile: { x: 16.2, y: 7.4 }, texto: 'na cadeira que eu ia usar, com a cara na almofada' },
  { mapa: 'oficina', tile: { x: 7.4, y: 4.3 }, texto: 'no quadrado de sol embaixo da janela' },
];
/** Chuva recolhe o bicho para dentro; o lugar muda com o dia, sem sorteio novo. */
export function lugarDoDescanso(c: ContextoCompanhia, clima: Clima): LugarDeDescanso {
  const bicho = companhia(c);
  const chuva = clima === 'Chuva' || clima === 'Temporal';
  const lugar = DESCANSOS[chuva ? 1 : Math.abs(c.dia + (bicho?.desde ?? 0)) % DESCANSOS.length]!;
  return chuva ? { ...lugar, texto: 'encolhido perto da porta, longe do barulho da chuva' } : lugar;
}
/**
 * O bicho acompanha PARTE do caminho: sai junto da casa e para quando a
 * distância passa do limite, esperando ali até o jogador voltar. Na chuva ele
 * desiste antes. Fora da casa e do bairro ele não vai.
 */
export const MAPAS_DE_COMPANHIA: readonly string[] = ['oficina', 'bairro'];
export function alcanceDaCompanhia(clima: Clima): number {
  return clima === 'Temporal' ? 4 : clima === 'Chuva' ? 7 : 14;
}
export function companhiaNoMapa(c: ContextoCompanhia, mapa: string): boolean {
  return companhia(c) !== null && MAPAS_DE_COMPANHIA.includes(mapa);
}
export function textoDaCompanhia(c: ContextoCompanhia, clima: Clima, dentro: boolean): string {
  const bicho = companhia(c);
  if (!bicho) return '';
  if (!dentro) return clima === 'Chuva' || clima === 'Temporal'
    ? `${bicho.nome} para debaixo do beiral e olha para mim. Daqui ele espera.`
    : `${bicho.nome} sentou na calçada. Ele vem até aqui e não mais. Eu volto por este caminho.`;
  return `${bicho.nome} está ${lugarDoDescanso(c, clima).texto}.`;
}
/** Os moradores reconhecem o bicho antes de reconhecerem a mudança em mim. */
export function falaSobreCompanhia(c: ContextoCompanhia, npcId: string): string | null {
  const bicho = companhia(c);
  if (!bicho || c.dia - bicho.desde < 1 || c.worldEvents.ativa(`companhia:fala:${npcId}`)) return null;
  const falas: Record<string, string> = {
    jaqueline: `Então ${bicho.nome} é seu agora? Ele já comia no meu quintal. Não vou disputar.`,
    hiago: `${bicho.nome} corre atrás da bicicleta até a esquina. Depois ele volta para o seu lado.`,
    leticia: `Fotografei ${bicho.nome} dormindo na sua porta. Você não estava em casa e ele estava.`,
    alice: `Pode trazer ${bicho.nome}. Fica do lado de fora, mas pode trazer.`,
    edu: `Bicho conhece horário melhor que a gente. ${bicho.nome} sabe quando você chega?`,
    wendel: `Se ${bicho.nome} aparecer com o pé machucado, me traga. Farmácia serve para isso também.`,
  };
  const fala = falas[npcId];
  if (!fala) return null;
  c.worldEvents.definir(`companhia:fala:${npcId}`, true);
  return fala;
}

import { dataDoDia } from './calendario.ts';
import type { Clima } from './clima.ts';

/**
 * GUARDA-ROUPA E APARÊNCIA. Cinco conjuntos (casual, chuva, inverno, trabalho e
 * represa) e quatro peças recebidas de moradores. A roupa não dá bônus de
 * combate nem penalidade: ela muda o acento visual sobre o sprite autoral, rende
 * um comentário do próprio protagonista quando não combina com o dia e é
 * percebida uma vez por quem a deu.
 *
 * Cabelo e barba crescem por tempo e por acontecimento narrativo, em três
 * estágios discretos, e voltam ao estágio 0 quando o jogador se cuida no
 * espelho. Não existe estado "descuidado" que puna nada.
 */
export interface ContextoAparencia {
  dia: number;
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}
export interface Conjunto {
  id: string;
  nome: string;
  /** Cores do acento desenhado sobre o sprite: gola/painel e detalhe. */
  cor: number;
  detalhe: number;
  climas: readonly Clima[];
  estacoes?: readonly number[];
  texto: string;
  origem: string;
  liberado(c: ContextoAparencia): boolean;
}
const chuvaJaCaiu = (c: ContextoAparencia): boolean =>
  ['bairro', 'farm', 'rural', 'represa'].some(m => typeof c.worldEvents.obter(`visual:chuva:${m}`) === 'number');

export const CONJUNTOS: readonly Conjunto[] = [
  { id: 'casual', nome: 'Roupa de todo dia', cor: 0x7d8c86, detalhe: 0x4a5a63, climas: ['Limpo', 'Nublado', 'Vento', 'Neblina', 'Calor'],
    texto: 'A camisa que eu já usava antes de chegar aqui. Ela serve para quase todos os dias.', origem: 'Veio na mala.', liberado: () => true },
  { id: 'chuva', nome: 'Capa de chuva', cor: 0x445f6d, detalhe: 0xb8c4bd, climas: ['Chuva', 'Temporal', 'Neblina'],
    texto: 'A capa range um pouco quando eu ando. Chegar em casa seco mudou mais o meu dia do que eu esperava.', origem: 'Estava numa das caixas; achei depois da primeira chuva.', liberado: chuvaJaCaiu },
  { id: 'inverno', nome: 'Agasalho de inverno', cor: 0x6b5a52, detalhe: 0x94836f, climas: ['Frio', 'Nublado', 'Vento'], estacoes: [3],
    texto: 'O agasalho é grosso e velho. No frio da praça ele é a diferença entre ficar e voltar.', origem: 'Comprado no mercado antes do primeiro inverno.',
    liberado: c => dataDoDia(Math.max(0, c.dia)).estacao === 3 || c.dia >= 84 },
  { id: 'trabalho', nome: 'Roupa de oficina', cor: 0x5c6470, detalhe: 0xa8a08c, climas: ['Limpo', 'Nublado', 'Calor', 'Frio', 'Vento', 'Neblina'],
    texto: 'Mancha de solda na manga. Essa roupa não tenta parecer outra coisa.', origem: 'Montada na oficina, com o que aguentou o primeiro mês.',
    liberado: c => c.worldEvents.ativa('campanha:cena:oficina') },
  { id: 'represa', nome: 'Roupa da represa', cor: 0x3f4f52, detalhe: 0xc0b08a, climas: ['Limpo', 'Nublado', 'Chuva', 'Neblina', 'Frio', 'Vento', 'Temporal', 'Calor'],
    texto: 'Botina, calça reforçada, lanterna no cinto. Eu não visto isso para ir ao bar.', origem: 'Separada depois da primeira descida.',
    liberado: c => Number(c.worldEvents.obter('campanha:profundidade') ?? 0) >= 1 },
];
export interface Peca { id: string; nome: string; npc: string; cor: number; texto: string; fala: string; liberado(c: ContextoAparencia): boolean }
export const PECAS: readonly Peca[] = [
  { id: 'cachecol', nome: 'Cachecol de Jaqueline', npc: 'jaqueline', cor: 0x9c6b5e,
    texto: 'Jaqueline disse que sobrou lã. Sobrou exatamente o tamanho do meu pescoço.', fala: 'Está usando! Ficou torto de um lado. Eu sei, eu fiz.',
    liberado: c => c.worldEvents.ativa('vinculo:jaqueline:2') },
  { id: 'bone', nome: 'Boné de Hiago', npc: 'hiago', cor: 0x4f6a74,
    texto: 'O boné tem a marca de uma loja que fechou. Hiago disse que eu ia precisar dele na estrada.', fala: 'Esse boné andou mais comigo que qualquer bicicleta. Agora é seu.',
    liberado: c => c.worldEvents.ativa('vinculo:hiago:2') },
  { id: 'luva', nome: 'Luvas de Wendel', npc: 'wendel', cor: 0x8a7a60,
    texto: 'Luvas de trabalho um número maior. Wendel disse que a mão não precisa doer para o serviço valer.', fala: 'As luvas serviram. Eu tinha comprado duas, há muito tempo.',
    liberado: c => c.worldEvents.ativa('casa:presenteWendel') },
  { id: 'avental', nome: 'Pano de Davi', npc: 'davi', cor: 0xb6a888,
    texto: 'O pano que veio com o pão virou avental. Ainda tem cheiro de forno em algum lugar dele.', fala: 'Você guardou o pano. Eu ia pedir de volta e desisti.',
    liberado: c => c.worldEvents.ativa('campanha:cena:pao') },
];

export function conjuntosDisponiveis(c: ContextoAparencia): Conjunto[] { return CONJUNTOS.filter(x => x.liberado(c)); }
export function conjuntoAtual(c: ContextoAparencia): Conjunto {
  const id = c.worldEvents.obter('roupa:conjunto');
  return conjuntosDisponiveis(c).find(x => x.id === id) ?? CONJUNTOS[0]!;
}
export function vestir(c: ContextoAparencia, id: string): boolean {
  if (!conjuntosDisponiveis(c).some(x => x.id === id)) return false;
  c.worldEvents.definir('roupa:conjunto', id);
  return true;
}
export function pecasDisponiveis(c: ContextoAparencia): Peca[] { return PECAS.filter(p => p.liberado(c)); }
export function pecaAtual(c: ContextoAparencia): Peca | null {
  const id = c.worldEvents.obter('roupa:peca');
  return pecasDisponiveis(c).find(p => p.id === id) ?? null;
}
/** Passar `null` guarda a peça; nenhuma peça é obrigatória. */
export function usarPeca(c: ContextoAparencia, id: string | null): boolean {
  if (id === null) { c.worldEvents.definir('roupa:peca', ''); return true; }
  if (!pecasDisponiveis(c).some(p => p.id === id)) return false;
  c.worldEvents.definir('roupa:peca', id);
  return true;
}
export function adequadoAoClima(conjunto: Conjunto, clima: Clima, estacao: number): boolean {
  return conjunto.climas.includes(clima) && (!conjunto.estacoes || conjunto.estacoes.includes(estacao));
}
/** Observação do próprio protagonista, sem dano, sem barra e uma vez por dia. */
export function comentarioDaRoupa(c: ContextoAparencia, clima: Clima, estacao: number): string | null {
  const conjunto = conjuntoAtual(c);
  if (adequadoAoClima(conjunto, clima, estacao)) return null;
  if (c.worldEvents.obter('roupa:comentou') === c.dia) return null;
  c.worldEvents.definir('roupa:comentou', c.dia);
  if (clima === 'Chuva' || clima === 'Temporal') return 'A chuva entrou pela manga. Tem uma capa em casa; hoje eu saí sem ela.';
  if (clima === 'Frio' || estacao === 3) return 'O frio acha o meio das costas. O agasalho está no armário, não em mim.';
  if (clima === 'Calor') return 'Roupa errada para esse sol. Vou procurar sombra antes de procurar assunto.';
  return 'Essa roupa não combina com o dia. Ninguém vai comentar, e eu já percebi.';
}
/** Quem deu a peça percebe uma vez. Depois disso vira rotina, e está bem. */
export function comentarioDaPeca(c: ContextoAparencia, npcId: string): string | null {
  const peca = pecaAtual(c);
  if (!peca || peca.npc !== npcId || c.worldEvents.ativa(`roupa:notou:${peca.id}`)) return null;
  c.worldEvents.definir(`roupa:notou:${peca.id}`, true);
  return peca.fala;
}
export interface Crescimento { cabelo: number; barba: number }
const ESTAGIO = (dias: number): number => (dias >= 30 ? 2 : dias >= 14 ? 1 : 0);
/**
 * Três estágios por parte. O tempo conta desde o último cuidado; a recaída da
 * campanha adianta um estágio, e o retorno não o desfaz sozinho — quem desfaz é
 * o jogador, no espelho.
 */
export function crescimento(c: ContextoAparencia): Crescimento {
  const desde = (chave: string): number => {
    const valor = c.worldEvents.obter(chave);
    const base = typeof valor === 'number' && Number.isSafeInteger(valor) ? valor : 0;
    return Math.max(0, c.dia - base);
  };
  const adianta = c.worldEvents.ativa('campanha:cena:recaida') && !c.worldEvents.ativa('aparencia:cuidouDepoisDaRecaida') ? 1 : 0;
  return {
    cabelo: Math.min(2, ESTAGIO(desde('aparencia:corte')) + adianta),
    barba: Math.min(2, ESTAGIO(desde('aparencia:barba')) + adianta),
  };
}
export function cuidar(c: ContextoAparencia, tipo: 'cabelo' | 'barba' | 'ambos'): string {
  const antes = crescimento(c);
  if (tipo !== 'barba') c.worldEvents.definir('aparencia:corte', c.dia);
  if (tipo !== 'cabelo') c.worldEvents.definir('aparencia:barba', c.dia);
  if (c.worldEvents.ativa('campanha:cena:recaida')) c.worldEvents.definir('aparencia:cuidouDepoisDaRecaida', true);
  if (antes.cabelo + antes.barba === 0) return 'Não havia muito a fazer. Fiz de novo, devagar, porque dava tempo.';
  return tipo === 'barba'
    ? 'Passei a máquina na barba. O rosto na pia continua sendo o meu.'
    : 'Cortei o cabelo sozinho, torto atrás. Ninguém vai olhar tão de perto.';
}
export function textoDoCrescimento(c: ContextoAparencia): string {
  const { cabelo, barba } = crescimento(c);
  if (cabelo + barba === 0) return 'Cabelo curto, barba feita. Hoje isso não significa nada além de ter acontecido.';
  if (cabelo + barba >= 3) return 'O cabelo passou da orelha e a barba já tem forma própria. Faz algum tempo que eu não olho com atenção.';
  return barba > cabelo ? 'A barba cresceu mais do que eu notei.' : 'O cabelo está pedindo corte. Não é urgente.';
}

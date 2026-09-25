import { escreverDiario } from './diarioPessoal.ts';

/**
 * CONVIVÊNCIA SEM TAREFA — sentar num banco, caminhar com alguém e acompanhar
 * um morador até onde ele já ia.
 *
 * Nenhuma das três é missão: não há objetivo, prazo, recompensa material nem
 * registro de fracasso. O que elas produzem é texto ligado ao LUGAR em que o
 * jogador está, e uma entrada de caderno quando termina.
 */
export interface ContextoConvivencia {
  dia: number;
  mapa: string;
  relogio: { minutos: number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export type Lugar = 'praca' | 'mercado' | 'rio' | 'escola' | 'estacao' | 'rua' | 'roca' | 'estrada' | 'interior';
export const NOME_DO_LUGAR: Record<Lugar, string> = {
  praca: 'a praça', mercado: 'a rua do mercado', rio: 'a margem do rio', escola: 'o muro da escola',
  estacao: 'o pátio da estação', rua: 'a rua', roca: 'a roça', estrada: 'a estrada da represa', interior: 'aqui dentro',
};
/** Retângulos largos: o lugar é aproximado de propósito, como a memória. */
export function lugarDoPonto(mapa: string, xTile: number, yTile: number): Lugar {
  if (mapa === 'farm') {
    // A praca inclui o parque com chafariz e playground, a oeste do cruzamento.
    if (xTile >= 28 && xTile <= 60 && yTile >= 34 && yTile <= 62) return 'praca';
    if (xTile >= 60 && yTile >= 44) return 'mercado';
    return 'rua';
  }
  if (mapa === 'bairro') {
    if (yTile >= 86) return 'rio';
    if (xTile >= 33 && xTile <= 45 && yTile >= 43 && yTile <= 56) return 'escola';
    if (xTile >= 60 && xTile <= 90 && yTile <= 45) return 'estacao';
    return 'rua';
  }
  if (mapa === 'rural') return 'roca';
  if (mapa === 'represa') return 'estrada';
  return 'interior';
}

// ------------------------------------------------------------- caminhadas --
export interface FalaDeCaminhada { lugar: Lugar; texto: string }
const CAMINHADAS: Record<string, readonly FalaDeCaminhada[]> = {
  edu: [
    { lugar: 'rua', texto: 'Eu conheço essa rua no horário em que ela está vazia. É outra rua.' },
    { lugar: 'praca', texto: 'Aqui eu sento quando não quero decidir nada. Ninguém pergunta o que estou fazendo.' },
    { lugar: 'escola', texto: 'Estudei aqui. Dei muita volta nesse muro para não chegar cedo demais.' },
    { lugar: 'rio', texto: 'A água faz um barulho que ocupa o lugar da conversa. Podemos ficar quietos.' },
    { lugar: 'estacao', texto: 'Quando o trem existia, dava para ir embora daqui sem avisar ninguém. Nunca fui.' },
    { lugar: 'mercado', texto: 'Compro sempre as mesmas coisas. Devia variar; não vario.' },
    { lugar: 'estrada', texto: 'Eu não subo essa estrada à noite. Não é medo, é escolha.' },
    { lugar: 'roca', texto: 'Aqui o dia começa cedo de verdade. Eu acho isso bonito de longe.' },
  ],
  leticia: [
    { lugar: 'rua', texto: 'Olha a sombra da grade no chão. Amanhã não vai estar assim.' },
    { lugar: 'praca', texto: 'Já fotografei essa praça cem vezes. Ainda não fotografei essa tarde.' },
    { lugar: 'escola', texto: 'Esse muro é o melhor cinza da cidade. Não ria; é verdade.' },
    { lugar: 'rio', texto: 'A luz aqui muda mais rápido que em qualquer outro lugar. Por isso eu volto.' },
    { lugar: 'estacao', texto: 'Gosto de lugar que já foi outra coisa. Ele guarda as duas.' },
    { lugar: 'mercado', texto: 'Aqui tem gente demais para fotografar sem pedir. Então eu só olho.' },
    { lugar: 'estrada', texto: 'Dessa curva dá para ver a cidade inteira. Não vamos além dela hoje.' },
    { lugar: 'roca', texto: 'Verde demais para uma foto só. Tem de escolher um pedaço.' },
  ],
};
export const ACOMPANHANTES: readonly string[] = Object.keys(CAMINHADAS);
export function podeCaminhar(npcId: string): boolean { return ACOMPANHANTES.includes(npcId); }

export interface Caminhada { npc: string; inicio: number; lugares: Lugar[] }
function lerCaminhada(c: ContextoConvivencia): Caminhada | null {
  const npc = c.worldEvents.obter('convivio:npc');
  if (typeof npc !== 'string' || !npc) return null;
  const inicio = Number(c.worldEvents.obter('convivio:inicio') ?? 0);
  let lugares: Lugar[] = [];
  try {
    const bruto = JSON.parse(String(c.worldEvents.obter('convivio:lugares') ?? '[]'));
    if (Array.isArray(bruto)) lugares = bruto.filter((l): l is Lugar => typeof l === 'string' && l in NOME_DO_LUGAR);
  } catch { lugares = []; }
  return { npc, inicio, lugares };
}
export function caminhadaAtual(c: ContextoConvivencia): Caminhada | null { return lerCaminhada(c); }
export function iniciarCaminhada(c: ContextoConvivencia, npcId: string): boolean {
  if (!podeCaminhar(npcId) || lerCaminhada(c)) return false;
  c.worldEvents.definir('convivio:npc', npcId);
  c.worldEvents.definir('convivio:inicio', c.dia * 1440 + c.relogio.minutos);
  c.worldEvents.definir('convivio:lugares', '[]');
  return true;
}
/** Cada lugar novo rende uma fala; lugar repetido não repete a fala. */
export function registrarLugar(c: ContextoConvivencia, lugar: Lugar): string | null {
  const caminhada = lerCaminhada(c);
  if (!caminhada || caminhada.lugares.includes(lugar)) return null;
  const falas = CAMINHADAS[caminhada.npc];
  const fala = falas?.find(f => f.lugar === lugar);
  c.worldEvents.definir('convivio:lugares', JSON.stringify([...caminhada.lugares, lugar]));
  return fala?.texto ?? null;
}
export function encerrarCaminhada(c: ContextoConvivencia): string | null {
  const caminhada = lerCaminhada(c);
  if (!caminhada) return null;
  c.worldEvents.definir('convivio:npc', '');
  const minutos = Math.max(0, c.dia * 1440 + c.relogio.minutos - caminhada.inicio);
  const quantos = caminhada.lugares.length;
  const texto = quantos <= 1
    ? 'Foi um trecho curto. Não precisava ser longo.'
    : `Atravessamos ${quantos} lugares: ${caminhada.lugares.map(l => NOME_DO_LUGAR[l]).join(', ')}. Nenhum deles era o destino.`;
  escreverDiario(c, `caminhada:${caminhada.npc}:${c.dia}`,
    `Caminhei com ${caminhada.npc} por ${Math.round(minutos)} minutos. ${quantos > 1 ? 'A conversa mudou junto com a rua.' : 'Foi pouco tempo e serviu.'}`);
  return texto;
}

// ------------------------------------------------------ acompanhar alguém --
export function iniciarAcompanhamento(c: ContextoConvivencia, npcId: string): boolean {
  if (c.worldEvents.obter('convivio:acompanhando')) return false;
  c.worldEvents.definir('convivio:acompanhando', npcId);
  c.worldEvents.definir('convivio:acompanhaDesde', c.dia * 1440 + c.relogio.minutos);
  return true;
}
export function acompanhamentoAtual(c: ContextoConvivencia): string | null {
  const npc = c.worldEvents.obter('convivio:acompanhando');
  return typeof npc === 'string' && npc ? npc : null;
}
/**
 * Chega ao fim quando o morador para onde ele ia. Não há recompensa: o texto
 * diz apenas que a pessoa chegou, e que você estava junto.
 */
export function encerrarAcompanhamento(c: ContextoConvivencia, chegou: boolean): string | null {
  const npc = acompanhamentoAtual(c);
  if (!npc) return null;
  c.worldEvents.definir('convivio:acompanhando', '');
  if (!chegou) return 'Seguimos por caminhos diferentes. Sem despedida formal.';
  escreverDiario(c, `acompanhar:${npc}:${c.dia}`, `Acompanhei ${npc} até onde ${npc} já ia. Não era um favor; era o mesmo caminho.`);
  return 'Chegamos. Ele agradece do jeito de quem não esperava companhia, e entra.';
}

// ------------------------------------------------------------ banco/sentar --
const OBSERVACOES: Record<Lugar, readonly string[]> = {
  praca: [
    'Duas pessoas discutem o preço de alguma coisa e riem no meio da discussão.',
    'Uma criança tenta equilibrar-se na borda do canteiro. Consegue na terceira vez.',
    'O sino da escola toca longe. Ninguém na praça se mexe por causa dele.',
    'A sombra da árvore andou até o meu pé enquanto eu estava aqui.',
  ],
  mercado: [
    'Alguém sai com sacola em cada mão e recusa ajuda duas vezes.',
    'Um carrinho range no mesmo ponto toda vez que passa pela porta.',
    'O cheiro de pão chega antes da pessoa que o carrega.',
    'Dois vizinhos conversam encostados na parede, sem pressa de entrar.',
  ],
  rio: [
    'A água leva uma folha até a pedra e a devolve.',
    'Um pássaro pousa no mesmo galho três vezes, como se testasse.',
    'A luz baixa e a margem fica mais barulhenta do que parecia.',
    'Alguém passa de bicicleta na trilha e não olha para o rio.',
  ],
  escola: [
    'O recreio acaba e o barulho some como se alguém fechasse uma porta.',
    'Uma mãe espera encostada no portão, olhando o relógio sem pressa.',
    'Dois meninos combinam um jogo para amanhã com regras impossíveis.',
    'O muro esquenta de sol e o gato escolhe exatamente esse pedaço.',
  ],
  estacao: [
    'O trilho antigo continua marcando o chão por baixo do asfalto.',
    'Um caminhão manobra devagar onde antes havia plataforma.',
    'Alguém para, olha os trilhos e segue. Não fui só eu que fiz isso hoje.',
    'O vento entra pelo galpão vazio e sai do outro lado.',
  ],
  rua: [
    'Uma janela acende do outro lado. Alguém também está em casa a esta hora.',
    'O poste pisca duas vezes antes de decidir ficar aceso.',
    'Um cachorro atravessa a rua com destino certo.',
    'Passos, depois silêncio, depois passos de novo.',
  ],
  roca: [
    'O motor de algum trator liga longe e desliga em seguida.',
    'A cerca range com o vento numa nota só.',
    'Alguém canta baixinho entre as fileiras e para quando percebe que ouvi.',
    'A terra cheira diferente quando o sol começa a baixar.',
  ],
  estrada: [
    'Um carro sobe devagar e some na curva.',
    'O mato do acostamento se move todo de uma vez.',
    'Daqui a cidade parece pequena e inteira.',
    'A luz lá em cima continua acesa. Eu continuo aqui embaixo.',
  ],
  interior: [
    'O relógio da parede mede um tempo que ninguém está usando.',
    'A cadeira range quando eu me acomodo melhor.',
    'A casa faz barulhos próprios quando fica quieta.',
    'A luz da janela atravessa o cômodo e para na parede.',
  ],
};
/** Observações em sequência estável; sentar de novo não repete a primeira. */
export function observacaoDoBanco(lugar: Lugar, indice: number): string {
  const lista = OBSERVACOES[lugar];
  return lista[Math.abs(Math.trunc(indice)) % lista.length]!;
}
export function textoAoSentar(c: ContextoConvivencia, lugar: Lugar): string {
  const noite = c.relogio.minutos >= 19 * 60 || c.relogio.minutos < 6 * 60;
  return `Sentei ${noite ? 'com a rua já escura' : 'sem nada para resolver'} em ${NOME_DO_LUGAR[lugar]}. O tempo passa mais rápido quando eu deixo.`;
}
/** Uma entrada por dia: ficar sentado é uma coisa que aconteceu, não um feito. */
export function registrarBanco(c: ContextoConvivencia, lugar: Lugar, minutos: number): void {
  if (minutos < 20) return;
  escreverDiario(c, `banco:${c.dia}`, `Fiquei sentado em ${NOME_DO_LUGAR[lugar]} por um tempo. Não estava esperando ninguém.`);
}
/** Alguém pode sentar junto. Quem já convive mais tem mais chance de parar. */
export function quemSenta(c: ContextoConvivencia, presentes: readonly string[], pontos: (id: string) => number): string | null {
  if (!presentes.length) return null;
  const candidatos = presentes.filter(id => pontos(id) >= 2);
  if (!candidatos.length) return null;
  return candidatos[(c.dia + Math.floor(c.relogio.minutos / 30)) % candidatos.length]!;
}
export function falaDeQuemSenta(npcId: string, lugar: Lugar): string {
  const por: Record<string, string> = {
    edu: 'Posso? Eu também não estou indo a lugar nenhum.',
    leticia: 'Você está bem aí. Não vou fotografar; só vou sentar.',
    alice: 'Cinco minutos. Depois eu volto para o balcão, prometo.',
    jaqueline: 'Ai, meus pés. Deixa eu sentar aqui com você um pouco.',
    wendel: 'A farmácia sobrevive dez minutos sem mim.',
    mari: 'Estou entre uma coisa e outra. Dá para sentar.',
    hiago: 'Encostei a bicicleta ali. Não me deixa esquecer dela.',
    vitor: 'Senta aí que eu já estou sentado. Isso é conversa de banco.',
  };
  return por[npcId] ?? `Boa tarde. ${NOME_DO_LUGAR[lugar][0]!.toUpperCase()}${NOME_DO_LUGAR[lugar].slice(1)} está boa hoje.`;
}

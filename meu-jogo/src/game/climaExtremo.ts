import { dataDoDia } from './calendario.ts';
import { escreverDiario } from './diarioPessoal.ts';
import type { Clima } from './clima.ts';

/**
 * EVENTOS RAROS DE CLIMA — seis acontecimentos que a cidade sente por inteiro:
 * temporal, neblina densa, primeira geada, onda de calor, chuva prolongada e a
 * cheia do Rio Claro.
 *
 * São determinísticos: saem do dia e da estação, sem sorteio e sem save. O que
 * o save guarda é só o que o jogador fez durante eles (ajudar com o gerador,
 * por exemplo).
 *
 * Nenhum evento tira vida, dinheiro ou acesso. Eles mudam o que se vê, o que os
 * moradores dizem e quais serviços atendem naquele dia.
 */
export type IdEventoClima = 'temporal' | 'neblina_densa' | 'geada' | 'onda_de_calor' | 'chuva_prolongada' | 'cheia';
export interface EventoClima {
  id: IdEventoClima;
  nome: string;
  /** Estações em que o evento pode acontecer. */
  estacoes: readonly number[];
  clima: Clima;
  aviso: string;
  texto: string;
  /** Serviços que fecham ou mudam de horário naquele dia. */
  servicos: string;
}
export interface ContextoClimaExtremo {
  dia: number;
  mapa: string;
  relogio: { minutos: number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export const EVENTOS_CLIMA: readonly EventoClima[] = [
  { id: 'temporal', nome: 'Temporal', estacoes: [0, 1], clima: 'Temporal',
    aviso: 'A tarde fechou de uma vez. O vento virou antes da chuva.',
    texto: 'O temporal derruba galho e tira a luz de parte do bairro. Dura algumas horas e passa.',
    servicos: 'Mercado e academia fecham cedo. O bar fica aberto com vela.' },
  { id: 'neblina_densa', nome: 'Neblina densa', estacoes: [2, 3], clima: 'Neblina',
    aviso: 'A neblina encostou no chão e não subiu. Dá para ver três postes à frente.',
    texto: 'A cidade some a vinte metros. Os sons chegam antes das pessoas, e ninguém anda depressa.',
    servicos: 'A linha de ônibus atrasa. A estrada da represa fica sem tráfego.' },
  { id: 'geada', nome: 'Primeira geada', estacoes: [3], clima: 'Frio',
    aviso: 'O capim amanheceu branco. É a primeira geada do ano.',
    texto: 'A geada queima a folha nova e deixa a manhã parada. Quem trabalha na roça começa mais tarde.',
    servicos: 'A feira abre reduzida. A padaria fica cheia antes das nove.' },
  { id: 'onda_de_calor', nome: 'Onda de calor', estacoes: [1], clima: 'Calor',
    aviso: 'Antes das dez o asfalto já devolve o calor do dia inteiro.',
    texto: 'O calor esvazia a rua entre meio-dia e quatro. A cidade volta a existir ao entardecer.',
    servicos: 'Comércio fecha ao meio-dia e reabre às quatro. A quadra fica interditada de tarde.' },
  { id: 'chuva_prolongada', nome: 'Chuva prolongada', estacoes: [0, 2], clima: 'Chuva',
    aviso: 'Chove sem parar desde ontem, sem aumentar nem diminuir.',
    texto: 'Três dias de chuva mansa. A roupa não seca, a estrada de terra amolece e todo mundo fala do assunto.',
    servicos: 'Entregas atrasam. A madeireira suspende o corte.' },
  { id: 'cheia', nome: 'Cheia do Rio Claro', estacoes: [0, 2], clima: 'Temporal',
    aviso: 'O rio subiu no meio da noite e encostou na marca da ponte.',
    texto: 'A margem sul fica embaixo d\'água. Ninguém se machuca; alguns quintais viram assunto pelo resto do ano.',
    servicos: 'A ponte fica interditada pela manhã. O posto de saúde atende em horário estendido.' },
];

/**
 * Um evento a cada dezessete dias, só onde a estação permite, e alternando
 * dentro da estação: o contador de eventos é que escolhe, então dois temporais
 * seguidos não acontecem por acaso de sorteio.
 */
export function eventoDoDia(dia: number): EventoClima | null {
  if (dia < 3 || Math.abs(Math.trunc(dia)) % 17 !== 5) return null;
  const estacao = dataDoDia(Math.max(0, dia)).estacao;
  const possiveis = EVENTOS_CLIMA.filter(e => e.estacoes.includes(estacao));
  if (!possiveis.length) return null;
  return possiveis[Math.floor(Math.abs(Math.trunc(dia)) / 17) % possiveis.length]!;
}
/** A chuva prolongada ocupa três dias; os outros, um só. */
export function eventoAtivo(dia: number): EventoClima | null {
  for (let d = dia; d >= dia - 2 && d >= 0; d--) {
    const evento = eventoDoDia(d);
    if (!evento) continue;
    if (d === dia) return evento;
    if (evento.id === 'chuva_prolongada') return evento;
  }
  return null;
}
export function climaDoEvento(dia: number, padrao: Clima): Clima {
  return eventoAtivo(dia)?.clima ?? padrao;
}
/** Aviso uma vez por evento, com registro no caderno. */
export function avisarEvento(c: ContextoClimaExtremo): EventoClima | null {
  const evento = eventoAtivo(c.dia);
  if (!evento) return null;
  const chave = `clima:avisado:${evento.id}:${c.dia}`;
  if (c.worldEvents.ativa(chave)) return null;
  c.worldEvents.definir(chave, true);
  escreverDiario(c, `clima:${evento.id}:${c.dia}`, `${evento.nome}. ${evento.aviso}`);
  return evento;
}

// ------------------------------------------------------------------ apagão --
/** O temporal tira a luz do bairro entre 19h e 23h, e só nesse intervalo. */
export function apagaoAtivo(dia: number, minuto: number): boolean {
  const evento = eventoAtivo(dia);
  return evento?.id === 'temporal' && minuto >= 19 * 60 && minuto < 23 * 60;
}
export function textoDoApagao(mapa: string): string {
  if (mapa === 'bar') return 'Alice acendeu velas no balcão. O bar é o único lugar da rua com gente dentro.';
  if (mapa === 'farmacia') return 'Wendel atende com lanterna na boca. Alguém precisa de remédio e não espera amanhecer.';
  if (mapa === 'oficina') return 'A casa ficou sem luz. A bancada, sem energia, vira só uma mesa com coisas em cima.';
  return 'A rua inteira apagou. As janelas acendem uma a uma, com vela ou lanterna.';
}
/**
 * A represa continua iluminada quando a cidade apaga. Não é dica nem ameaça: é
 * o que se vê do bairro, e o protagonista não conclui nada a respeito.
 */
export function represaIluminada(dia: number, minuto: number, mapa: string): boolean {
  return apagaoAtivo(dia, minuto) && (mapa === 'bairro' || mapa === 'farm');
}
export const TEXTO_REPRESA_ACESA = 'Do fim da rua dá para ver a represa acesa. Ela não apagou junto com a cidade.';

export interface AjudaComGerador { texto: string; npc: string; pontos: number }
/**
 * Ajudar com o gerador é opcional, dura uma noite e não paga. Uma vez por
 * apagão, e só de quem já convive com o jogador.
 */
export function ajudarComGerador(c: ContextoClimaExtremo, local: 'bar' | 'farmacia'): AjudaComGerador | null {
  if (!apagaoAtivo(c.dia, c.relogio.minutos)) return null;
  const chave = `clima:gerador:${c.dia}`;
  if (c.worldEvents.ativa(chave)) return null;
  c.worldEvents.definir(chave, true);
  const npc = local === 'bar' ? 'alice' : 'wendel';
  escreverDiario(c, `gerador:${c.dia}`,
    local === 'bar'
      ? 'Puxei o gerador do bar na chuva. Ninguém pediu; o barulho voltou e as pessoas continuaram conversando.'
      : 'Liguei o gerador da farmácia. A geladeira dos remédios voltou a zumbir antes de eu sair.');
  return {
    npc,
    pontos: 1,
    texto: local === 'bar'
      ? 'O gerador pega na terceira tentativa. A luz volta baixa, amarela, e o bar inteiro finge que não reparou.'
      : 'O gerador pega e a geladeira dos remédios volta a zumbir. Wendel só diz: “agora sim”.',
  };
}

// -------------------------------------------------- reações de moradores --
const REACOES: Record<IdEventoClima, Record<string, string>> = {
  temporal: {
    alice: 'Se faltar luz, eu acendo vela. O bar não fecha por causa de chuva.',
    jaqueline: 'Tirei tudo do varal correndo. Metade ainda molhou.',
    joao: 'Vento assim derruba mais do que a chuva. Amanhã a gente conta o estrago.',
    wendel: 'Se faltar energia, os remédios da geladeira têm seis horas. Depois disso eu preciso de gerador.',
  },
  neblina_densa: {
    hiago: 'Hoje eu não pego a estrada. De bicicleta, nessa neblina, é convite.',
    julia: 'A linha vai atrasar. Eu prefiro atrasar a adivinhar a curva.',
    leticia: 'Fotografei três postes e sumiu tudo atrás. Ficou melhor do que eu esperava.',
    roberto: 'Neblina assim me lembra o horário do primeiro trem. A gente ouvia antes de ver.',
  },
  geada: {
    neide: 'A geada pegou a folha nova. O que estava maduro aguentou.',
    joao: 'Hoje a roça começa depois das nove. Não adianta insistir com a terra dura.',
    rita: 'Ponho cobertor extra na cama do Arthur e ele tira no meio da noite. Todo ano igual.',
    davi: 'Com esse frio o pão cresce devagar. Fica melhor, mas ninguém tem paciência.',
  },
  onda_de_calor: {
    mari: 'Treino só cedo ou depois das cinco. Quem insistir no meio do dia eu mando parar.',
    alice: 'Gelo acaba antes das duas. Depois é água da geladeira mesmo.',
    cecilia: 'A professora deixou a gente sentar embaixo da árvore. Foi a melhor aula.',
    bruno: 'Máquina nesse calor pede pausa. A equipe também.',
  },
  chuva_prolongada: {
    jaqueline: 'Nada seca. A casa inteira cheira a roupa guardada úmida.',
    tulio: 'Serviço de rua some quando chove assim. Aparece outro, dentro de casa.',
    clara: 'A goteira do acervo voltou. Pus balde e estou de olho.',
    neide: 'Chuva mansa assim é boa, se parar a tempo. Ainda não parou.',
  },
  cheia: {
    joao: 'O rio subiu até a marca antiga. Ninguém se feriu; o quintal do vizinho virou lago.',
    matheus: 'Interditamos a ponte até a água baixar. Não é discussão.',
    ilda: 'Isso já aconteceu em outros anos. A cidade anota e esquece, e eu anoto de novo.',
    leticia: 'Fotografei a água na altura do banco. Daqui a um ano ninguém vai acreditar.',
  },
};
export function reacaoAoEvento(c: ContextoClimaExtremo, npcId: string): string | null {
  const evento = eventoAtivo(c.dia);
  if (!evento) return null;
  const fala = REACOES[evento.id][npcId];
  if (!fala) return null;
  const chave = `clima:fala:${npcId}:${c.dia}`;
  if (c.worldEvents.ativa(chave)) return null;
  c.worldEvents.definir(chave, true);
  return fala;
}

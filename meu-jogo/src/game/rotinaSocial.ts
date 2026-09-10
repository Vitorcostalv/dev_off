import { DIA_DA_SEMANA, dataDoDia, diaDaSemana } from './calendario.ts';
import type { Clima } from './clima.ts';
import type { AcaoRotinaNpc, DefinicaoNpc, PontoTile } from './npcs.ts';

/**
 * CLIMA, ESTACAO E ENCONTRO na rotina dos NPCs.
 *
 * O jogo tinha calendario (quatro estacoes, 28 dias) e clima determinístico por
 * dia desde a etapa do cotidiano, e a rotina dos 33 moradores nao consultava
 * nenhum dos dois: chovia e todo mundo continuava passeando na avenida, era
 * inverno as sete da noite e a praca seguia cheia. Este modulo e a camada que
 * faltava, e ele nao tem Phaser nem estado global — recebe a rotina, devolve a
 * rotina ajustada, e por isso a conferencia offline consegue rodar as 4
 * estacoes x 8 climas x 7 dias da semana pros 33 NPCs.
 *
 * A ordem das tres camadas importa, e e sempre a mesma:
 *
 *   1. ESTACAO desloca horario de atividade ao ar livre (verao empurra pra
 *      depois do calor, inverno encurta o fim da tarde);
 *   2. CLIMA recolhe quem esta na rua pro abrigo (chuva e temporal);
 *   3. ENCONTRO junta gente num lugar so, e vence as duas anteriores — festa de
 *      sabado no bar acontece com chuva, e e justamente por causa dela.
 *
 * O que NENHUMA camada faz: mexer em posto de trabalho, em compromisso de
 * emprego de obra urbana ou em quem esta dentro de construcao. Turno e turno, e
 * a missao pessoal que depende de achar alguem no trabalho continua valendo.
 */

/** Acao que deixa o NPC ao ar livre, e portanto sujeita a clima e estacao. */
const AO_AR_LIVRE = new Set<AcaoRotinaNpc['tipo']>(['vagar', 'vagar_rota', 'andar_rota']);

/** Chuva e temporal recolhem; neblina, vento, frio e calor nao tiram da rua. */
export const CLIMAS_DE_ABRIGO: readonly Clima[] = ['Chuva', 'Temporal'];

/**
 * QUEM NAO SE RECOLHE. A atividade ao ar livre da zona rural e TRABALHO — a
 * roca do Joao e da Neide, o pateo da madeireira do Bruno —, e trabalho de
 * roca nao para por chuva. Sem esta excecao a cidade inteira ficava vazia em
 * um dia de chuva a cada quatro, e o mundo parecia morto em vez de chuvoso.
 */
const MAPAS_DE_TRABALHO_AO_AR_LIVRE = new Set(['rural']);

function estaAoArLivre(acao: AcaoRotinaNpc): boolean {
  if (AO_AR_LIVRE.has(acao.tipo)) return true;
  return acao.tipo === 'assumir_lugar' && acao.construcao === null;
}

/**
 * ABRIGO de um NPC: o ponto DENTRO da propria casa em que ele comeca o dia.
 *
 * Sai de `posicaoInicial`/`dentroInicial`, que a conferencia de rotinas ja
 * valida tile por tile — nao ha coordenada nova pra manter em lugar nenhum.
 * Quem comeca o dia na rua (`dentroInicial: null`) nao tem abrigo declarado e
 * fica de fora do ajuste de clima.
 */
export function abrigoDe(def: DefinicaoNpc): { construcao: string; ponto: PontoTile } | null {
  if (!def.dentroInicial) return null;
  return { construcao: def.dentroInicial, ponto: def.posicaoInicial };
}

/**
 * ESTACAO. Verao empurra a atividade ao ar livre do meio do dia pra depois das
 * 16h; inverno tira a que comeca depois das 17h (escurece cedo e esfria).
 *
 * O deslocamento respeita a acao seguinte: empurrar por cima dela faria a
 * atividade deslocada ser engolida na hora de escolher, e o NPC ficaria parado.
 */
export function ajustarPorEstacao(rotina: readonly AcaoRotinaNpc[], estacao: number): AcaoRotinaNpc[] {
  const VERAO = 1;
  const INVERNO = 3;
  if (estacao !== VERAO && estacao !== INVERNO) return [...rotina];

  const ordenada = [...rotina].sort((a, b) => a.horario - b.horario);
  const saida: AcaoRotinaNpc[] = [];
  ordenada.forEach((acao, i) => {
    if (!estaAoArLivre(acao)) { saida.push(acao); return; }
    if (estacao === INVERNO && acao.horario >= 17 * 60) return; // escurece cedo: nao sai
    if (estacao === VERAO && acao.horario >= 11 * 60 && acao.horario < 15 * 60) {
      const proxima = ordenada[i + 1]?.horario ?? 24 * 60;
      const alvo = Math.min(16 * 60, proxima - 30);
      if (alvo > acao.horario) { saida.push({ ...acao, horario: alvo }); return; }
    }
    saida.push(acao);
  });
  return saida;
}

/**
 * CLIMA. Com chuva ou temporal, toda atividade ao ar livre vira uma so: o NPC
 * fica no abrigo dele. As acoes de rua sao removidas e uma unica troca de lugar
 * entra no horario da primeira delas — sem isso o NPC atravessaria a cidade na
 * chuva pra ficar parado num canteiro.
 */
export function ajustarPorClima(
  def: DefinicaoNpc,
  rotina: readonly AcaoRotinaNpc[],
  clima: Clima,
): AcaoRotinaNpc[] {
  if (!CLIMAS_DE_ABRIGO.includes(clima)) return [...rotina];
  if (MAPAS_DE_TRABALHO_AO_AR_LIVRE.has(def.mapa)) return [...rotina];
  const abrigo = abrigoDe(def);
  if (!abrigo) return [...rotina];

  const naRua = rotina.filter(estaAoArLivre);
  if (naRua.length === 0) return [...rotina];

  const primeira = Math.min(...naRua.map((a) => a.horario));
  const restante = rotina.filter((acao) => !estaAoArLivre(acao));
  const noAbrigo: AcaoRotinaNpc = {
    horario: primeira,
    tipo: 'assumir_lugar',
    construcao: abrigo.construcao,
    ponto: abrigo.ponto,
  };
  return [...restante, noAbrigo].sort((a, b) => a.horario - b.horario);
}

// ------------------------------------------------------------- encontros --
export interface Encontro {
  id: string;
  nome: string;
  /** Minuto de inicio e de fim; fora dessa faixa a rotina normal vale. */
  inicio: number;
  fim: number;
  /** Interior do encontro, ou null pra ar livre. */
  construcao: string | null;
  /** Mapa externo do encontro (usado quando `construcao` e null). */
  mapa: string;
  /** Um tile por participante: duas pessoas nao ocupam o mesmo. */
  vagas: readonly PontoTile[];
  /**
   * Quem vai. `favorito` casa com `vida.favoritos` do morador, e `ids` e a
   * lista fechada pra quem nao tem perfil declarado (os 9 NPCs originais).
   */
  favorito?: string;
  ids?: readonly string[];
  /** Dia da semana (0 = segunda) em que acontece; ausente = evento de estacao. */
  diaDaSemana?: number;
  /** Dia da estacao (1..28) em que acontece; ausente = encontro semanal. */
  diaDaEstacao?: number;
  /** Aviso que o quadro da praca mostra no dia. */
  aviso: string;
}

/**
 * Os encontros. Sao poucos e a mao de proposito: gente junta num lugar so e
 * coisa desenhada, e sortear participante daria uma praca com uma pessoa num
 * dia e doze no outro.
 *
 * As vagas de praca saem do calcamento das pracas de esquina do remap do centro
 * (ver docs/centro.md) e as do bar, do salao dele. A conferencia
 * `verificar-social` cobra tile livre e alcancavel em cada uma, nas 4 estacoes
 * e nos 8 climas.
 */
export const ENCONTROS: readonly Encontro[] = [
  {
    id: 'sabado_no_bar',
    nome: 'Sabado no bar',
    diaDaSemana: DIA_DA_SEMANA.sabado,
    inicio: 19 * 60,
    fim: 22 * 60,
    construcao: 'bar',
    mapa: 'farm',
    favorito: 'bar',
    vagas: [
      { x: 4.5, y: 8.5 }, { x: 6.5, y: 8.5 }, { x: 8.5, y: 8.5 },
      { x: 4.5, y: 10.5 }, { x: 6.5, y: 10.5 }, { x: 8.5, y: 10.5 },
    ],
    aviso: 'encontro_bar',
  },
  {
    id: 'domingo_na_praca',
    nome: 'Domingo na praca',
    diaDaSemana: DIA_DA_SEMANA.domingo,
    inicio: 10 * 60,
    fim: 12 * 60,
    construcao: null,
    mapa: 'farm',
    favorito: 'praca',
    vagas: [
      { x: 51.5, y: 49.5 }, { x: 53.5, y: 49.5 }, { x: 55.5, y: 49.5 },
      { x: 51.5, y: 50.5 }, { x: 53.5, y: 50.5 }, { x: 55.5, y: 50.5 },
    ],
    aviso: 'encontro_praca',
  },
  {
    id: 'feira_da_estacao',
    nome: 'Feira da estacao',
    diaDaEstacao: 14,
    inicio: 16 * 60,
    fim: 19 * 60,
    construcao: null,
    mapa: 'farm',
    favorito: 'mercado',
    // A praca noroeste tem o quiosque do quadro de avisos ocupando x 50-53 nas
    // linhas 40 e 41: as vagas ficam no que sobra dela.
    vagas: [
      { x: 54.5, y: 40.5 }, { x: 55.5, y: 40.5 },
      { x: 54.5, y: 41.5 }, { x: 55.5, y: 41.5 },
      { x: 51.5, y: 42.5 }, { x: 52.5, y: 42.5 },
    ],
    aviso: 'feira_da_estacao',
  },
];

/** O encontro de um dia, se houver. Semanal perde pro evento de estacao. */
export function encontroDoDia(dia: number): Encontro | null {
  const data = dataDoDia(dia);
  const doEstacao = ENCONTROS.find((e) => e.diaDaEstacao === data.diaEstacao);
  if (doEstacao) return doEstacao;
  return ENCONTROS.find((e) => e.diaDaSemana === diaDaSemana(dia)) ?? null;
}

/**
 * Participantes de um encontro, na ordem em que ocupam as vagas.
 *
 * `favoritos` vem do morador (`vida.favoritos`); quem nao e morador entra pela
 * lista fechada `ids`. A quantidade e limitada pelas vagas — encontro nao
 * empilha gente no mesmo tile.
 */
export function participantesDoEncontro(
  encontro: Encontro,
  favoritosPorNpc: ReadonlyMap<string, readonly string[]>,
  ordem: readonly string[],
): string[] {
  const escolhidos = ordem.filter((id) => {
    if (encontro.ids?.includes(id)) return true;
    if (!encontro.favorito) return false;
    return (favoritosPorNpc.get(id) ?? []).includes(encontro.favorito);
  });
  return escolhidos.slice(0, encontro.vagas.length);
}

/**
 * Poe o NPC no encontro: a faixa do encontro vira uma troca de lugar pra vaga
 * dele, e o que estava marcado DENTRO dessa faixa sai. O que vem depois do fim
 * do encontro fica — e assim ele volta pra rotina normal (e pra casa) sozinho.
 */
export function aplicarEncontro(
  rotina: readonly AcaoRotinaNpc[],
  encontro: Encontro,
  vaga: PontoTile,
): AcaoRotinaNpc[] {
  const fora = rotina.filter((acao) => acao.horario < encontro.inicio || acao.horario >= encontro.fim);
  const anterior = [...fora].filter((a) => a.horario < encontro.inicio).sort((a, b) => b.horario - a.horario)[0];
  // Duas trocas de lugar ao ar livre seguidas no mesmo mapa seriam teleporte na
  // frente do jogador (a conferencia de rotinas reprova). Quando a acao anterior
  // ja e ar livre no mesmo mapa, ela sai: o NPC vem de dentro pro encontro.
  const conflita = encontro.construcao === null
    && anterior?.tipo === 'assumir_lugar'
    && anterior.construcao === null;
  const base = conflita ? fora.filter((a) => a !== anterior) : fora;
  const noEncontro: AcaoRotinaNpc = {
    horario: encontro.inicio,
    tipo: 'assumir_lugar',
    construcao: encontro.construcao,
    ...(encontro.construcao === null ? { mapa: encontro.mapa } : {}),
    ponto: vaga,
  };
  return [...base, noEncontro].sort((a, b) => a.horario - b.horario);
}

/**
 * As tres camadas, na ordem. `favoritosPorNpc`/`ordem` existem pro encontro
 * saber quem vai; quem chama passa o registro de moradores.
 */
export function rotinaComCalendario(
  def: DefinicaoNpc,
  base: readonly AcaoRotinaNpc[],
  contexto: {
    dia: number;
    clima: Clima;
    favoritosPorNpc: ReadonlyMap<string, readonly string[]>;
    ordem: readonly string[];
  },
): AcaoRotinaNpc[] {
  const data = dataDoDia(contexto.dia);
  let rotina = ajustarPorEstacao(base, data.estacao);
  rotina = ajustarPorClima(def, rotina, contexto.clima);

  const encontro = encontroDoDia(contexto.dia);
  if (encontro) {
    const participantes = participantesDoEncontro(encontro, contexto.favoritosPorNpc, contexto.ordem);
    const indice = participantes.indexOf(def.id);
    if (indice >= 0) rotina = aplicarEncontro(rotina, encontro, encontro.vagas[indice]);
  }
  return rotina;
}

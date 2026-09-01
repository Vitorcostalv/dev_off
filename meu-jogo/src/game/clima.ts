/**
 * O TEMPO — que dia faz, e o que isso muda.
 *
 * O clima e DERIVADO da data, e nao sorteado e guardado. Um hash do dia
 * absoluto, pesado pela estacao, devolve sempre o mesmo tempo pro mesmo dia:
 * recarregar o save no dia 137 traz a mesma chuva de antes, em qualquer maquina,
 * sem um campo a mais no save e sem risco de o save e a tela discordarem.
 *
 * Foi essa a leitura da Parte 35 ("deterministico/persistido pra aquela data"):
 * deterministico e mais forte que persistido — nao ha estado pra corromper.
 *
 * O que o tempo muda:
 *
 *  - a CHUVA aparece nos mapas externos (nunca dentro de predio, e nunca nos
 *    andares da represa);
 *  - o mundo escurece um pouco, com o ceu fechado;
 *  - a ROTINA de alguns moradores troca de lugar (ver `chuva` em
 *    `LugarMorador`, src/game/moradores.ts).
 *
 * O que ele NAO muda, de proposito: nada dentro da usina. A Parte 38 pede que o
 * tempo nunca torne um enigma impossivel, e o jeito mais seguro de garantir isso
 * e o interior da represa nao consultar o clima em lugar nenhum.
 */

import { estacaoDoDia } from './calendario.ts';
import type { Estacao } from './calendario.ts';

export type EstadoDoTempo = 'limpo' | 'nublado' | 'chuva_fraca' | 'chuva_forte';

export interface DefinicaoTempo {
  id: EstadoDoTempo;
  nome: string;
  /** true = tem gota caindo */
  chuva: boolean;
  /** gotas na tela ao mesmo tempo; 0 quando nao chove */
  gotas: number;
  /** quanto o mundo escurece, 0 a 1 */
  escurecimento: number;
  /** cor do veu por cima do mundo */
  cor: number;
  /** linha curta pra HUD e pro blog */
  texto: string;
}

export const TEMPOS: Record<EstadoDoTempo, DefinicaoTempo> = {
  limpo: {
    id: 'limpo', nome: 'Ceu limpo', chuva: false, gotas: 0,
    escurecimento: 0, cor: 0x000000, texto: 'Ceu limpo.',
  },
  nublado: {
    id: 'nublado', nome: 'Nublado', chuva: false, gotas: 0,
    escurecimento: 0.1, cor: 0x8a93a6, texto: 'Nublado, sem chuva.',
  },
  chuva_fraca: {
    id: 'chuva_fraca', nome: 'Chuva fraca', chuva: true, gotas: 90,
    escurecimento: 0.18, cor: 0x6f7c93, texto: 'Chuva fina, daquelas que nao passam.',
  },
  chuva_forte: {
    id: 'chuva_forte', nome: 'Chuva forte', chuva: true, gotas: 220,
    escurecimento: 0.3, cor: 0x556076, texto: 'Chuva pesada. O barulho no telhado nao deixa pensar.',
  },
};

export function buscarTempo(id: unknown): DefinicaoTempo {
  return (typeof id === 'string' && TEMPOS[id as EstadoDoTempo]) || TEMPOS.limpo;
}

/**
 * PESO de cada tempo por estacao, no hemisferio sul.
 *
 * Verao chove muito e chove forte; inverno e seco e nublado. Os pesos sao
 * relativos e nao precisam somar nada — acrescentar um estado novo nao obriga a
 * recalcular os outros, que e a mesma regra das tabelas de salvado.
 */
const PESOS: Record<Estacao, Record<EstadoDoTempo, number>> = {
  verao: { limpo: 40, nublado: 22, chuva_fraca: 22, chuva_forte: 16 },
  outono: { limpo: 46, nublado: 28, chuva_fraca: 18, chuva_forte: 8 },
  inverno: { limpo: 48, nublado: 36, chuva_fraca: 12, chuva_forte: 4 },
  primavera: { limpo: 44, nublado: 26, chuva_fraca: 20, chuva_forte: 10 },
};

/** Hash de um inteiro -> [0,1). Mesma avalanche do resto do projeto. */
function hash01(n: number): number {
  let h = (n * 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * O tempo de um dia.
 *
 * A semente inclui um sal fixo pra a sequencia de tempo nao ser a mesma de
 * nenhuma outra coisa indexada por dia (o quadro de avisos da cidade, por
 * exemplo, tambem sorteia por dia).
 */
export function tempoDoDia(diaAbsoluto: number): DefinicaoTempo {
  const dia = Math.trunc(Number.isFinite(diaAbsoluto) ? diaAbsoluto : 0);
  const pesos = PESOS[estacaoDoDia(dia)];
  const total = Object.values(pesos).reduce((s, p) => s + p, 0);
  let sorteio = hash01(dia * 7919 + 104729) * total;
  for (const [id, peso] of Object.entries(pesos) as [EstadoDoTempo, number][]) {
    sorteio -= peso;
    if (sorteio <= 0) return TEMPOS[id];
  }
  return TEMPOS.limpo;
}

/** true quando esta caindo agua. */
export function chovendo(diaAbsoluto: number): boolean {
  return tempoDoDia(diaAbsoluto).chuva;
}

/**
 * Contagem dos quatro tempos numa faixa de dias — serve a conferencia e ao
 * relatorio, pra ninguem acertar os pesos no escuro.
 */
export function distribuicaoDeTempo(deDia: number, ateDia: number): Record<EstadoDoTempo, number> {
  const conta: Record<EstadoDoTempo, number> = {
    limpo: 0, nublado: 0, chuva_fraca: 0, chuva_forte: 0,
  };
  for (let d = deDia; d <= ateDia; d++) conta[tempoDoDia(d).id] += 1;
  return conta;
}

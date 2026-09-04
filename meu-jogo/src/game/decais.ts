/**
 * OS DECAIS — o que esta colado na parede dos andares 51 a 150.
 *
 * Um decal e uma marca: placa de seguranca, quadro de ordens, desenho de
 * crianca, contagem riscada, aviso escrito a mao, marca de sangue. A ARTE vem
 * das duas folhas de parede que o usuario entregou e e recortada por
 * `tools/gerar-decais.mjs`; aqui mora a REGRA — quantos, de que familia, em que
 * andar, e o que o jogador le ao examinar.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELES SAO OBJETO E NAO TILE
 * ---------------------------------------------------------------------------
 * A Parte 5 e explicita: o efeito depende da RARIDADE. A folha da infancia tem
 * desenho e sangue pintados na propria peca de parede — usada como tile, o
 * andar 104 teria desenho de crianca em toda parede de todo comodo, e a
 * primeira vez que o jogador visse um ja seria a centesima. Como objeto, o 104
 * tem UM, o 103 nao tem nenhum, e o primeiro assusta.
 *
 * ---------------------------------------------------------------------------
 * O DECAL E O TEXTO NASCEM JUNTOS
 * ---------------------------------------------------------------------------
 * Mesmo arranjo de `enigmas.ts`: `decaisDoAndar` devolve a peca E o texto de
 * exame dela. Nao ha caminho de codigo que cole um desenho na parede sem o que
 * se le ao chegar perto.
 */

import { capituloDoAndar } from './andares.ts';

// ------------------------------------------------------------------ hash --
function hash(andar: number, sal: string): number {
  let h = (andar * 2654435761) >>> 0;
  for (let i = 0; i < sal.length; i++) h = Math.imul(h ^ sal.charCodeAt(i), 0x01000193);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const dado = (andar: number, sal: string, n: number): number =>
  Math.min(n - 1, Math.floor(hash(andar, sal) * n));

// -------------------------------------------------------------- catalogo --
/**
 * As pecas por familia, na mesma ordem em que `gerar-decais.mjs` as declara.
 *
 * A lista esta escrita aqui e nao lida do JSON de runtime por uma razao de
 * conferencia: assim a conferencia offline compara as duas e reclama quando uma
 * peca sai da folha de arte sem sair daqui — que e o jeito de um decal virar
 * quadrado branco em jogo sem ninguem notar.
 */
export const PECAS_POR_FAMILIA: Record<string, readonly string[]> = {
  faixa: [
    'faixa_051_060', 'faixa_061_070', 'faixa_071_080', 'faixa_081_090', 'faixa_091_100',
    'faixa_101_110', 'faixa_111_120', 'faixa_121_130', 'faixa_131_140', 'faixa_141_150',
  ],
  quadro: ['quadro_mapa', 'quadro_registros', 'quadro_mural'],
  placa: [
    'placa_pressao', 'placa_contencao', 'placa_nivel',
    'placa_perigo', 'placa_silencio', 'placa_sem_luz',
  ],
  desenho: ['desenho_casa', 'desenho_familia', 'desenho_criancas'],
  escrita: ['escrita_contagem', 'escrita_olhos'],
  aviso: ['aviso_ouve', 'aviso_saida', 'aviso_fim'],
  sangue: ['sangue_maos', 'sangue_parede'],
};

/**
 * O texto de exame de cada peca.
 *
 * Ele descreve o que se ve, e nao o que significa. Uma parede que explica a
 * historia deixa de ser uma parede e vira legenda — e a Parte 8 pede
 * explicitamente que nem toda parede explique o que esta acontecendo.
 */
const TEXTO_DA_PECA: Record<string, readonly string[]> = {
  quadro_mapa: [
    'Mapa dos setores internos, sob vidro rachado.',
    'Alguem marcou a caneta vermelha os comodos ja vistoriados. A marcacao para no meio.',
  ],
  quadro_registros: [
    'Quadro de registros de manutencao, com a folha do mes ainda presa.',
    'Todas as linhas do turno da noite tem a mesma assinatura. Todas as do dia estao em branco.',
  ],
  quadro_mural: [
    'Mural de recados, com quatro tachinhas e nenhum papel.',
    'Restou o canto rasgado de uma folha, e nele meia palavra escrita a lapis de cor.',
  ],
  placa_pressao: ['ATENCAO — PRESSAO CRITICA.', 'Placa de fabrica, parafusada. A seta indica o piso abaixo.'],
  placa_contencao: ['CONTENCAO — ACESSO RESTRITO.', 'A restricao nunca foi revogada; o cadeado, sim.'],
  placa_nivel: ['NIVEL ABAIXO — SIGA AS ORIENTACOES.', 'As orientacoes deviam estar na placa ao lado. Nao ha placa ao lado.'],
  placa_perigo: ['PERIGO — QUEDA DE EQUIPAMENTOS.', 'Debaixo dela, no chao, nao ha equipamento nenhum ha muito tempo.'],
  placa_silencio: ['SILENCIO — COMUNICACAO POR RADIO.', 'O suporte do radio esta na parede, vazio.'],
  placa_sem_luz: ['NENHUMA LUZ ALEM DA PORTA.', 'Escrito como aviso de operacao. Le como outra coisa.'],
  desenho_casa: [
    'Uma casa com telhado triangular, um sol no canto e tres pessoas do lado de fora.',
    'Giz de cera sobre concreto. A altura do desenho e a de quem tem uns sete anos.',
  ],
  desenho_familia: [
    'Tres figuras de palito, tracadas em vermelho, de maos dadas.',
    'A do meio e menor e foi desenhada por ultimo: a linha passa por cima das outras duas.',
  ],
  desenho_criancas: [
    'Duas criancas desenhadas com traco firme, uma de azul e uma de vermelho.',
    'Ao lado delas, maos abertas carimbadas na parede. Sao maos de crianca, e sao menores que o desenho.',
  ],
  escrita_contagem: [
    'Contagem riscada na parede, em grupos de cinco.',
    'Sao trinta e sete. O ultimo risco esta incompleto.',
  ],
  escrita_olhos: [
    'Olhos desenhados um ao lado do outro, cobrindo o painel inteiro.',
    'Entre eles, mais contagem. Quem contava desistiu antes de quem desenhava.',
  ],
  aviso_ouve: [
    'ELE AINDA OUVE, escrito a mao, com letra de adulto apressado.',
    'A tinta e a mesma dos desenhos de crianca do corredor anterior.',
  ],
  aviso_saida: [
    'NAO HA SAIDA, em vermelho, escorrido.',
    'Abaixo, com letra menor e mais firme: "por aqui". A segunda linha e de outra pessoa.',
  ],
  aviso_fim: [
    'AQUI E O FIM, ocupando a parede inteira ao lado da porta lacrada.',
    'Nao diz o fim de que. A porta ao lado tem o visor aceso e nao abre.',
  ],
  sangue_maos: [
    'Marcas de mao na parede, na altura do peito.',
    'Sao maos de adulto, e apontam pro corredor de onde voce veio.',
  ],
  sangue_parede: [
    'Uma faixa escura escorrida do teto ate o rodape.',
    'Esta seca ha muito tempo. Nao ha mais nada aqui que explique como chegou.',
  ],
};

/** Texto da placa de faixa, montado do proprio nome da peca. */
function textoDaFaixa(peca: string): string[] {
  const m = /^faixa_(\d{3})_(\d{3})$/.exec(peca);
  if (!m) return ['Placa de setor.'];
  const de = Number(m[1]);
  const ate = Number(m[2]);
  return [
    `Placa de setor: ANDARES ${de} A ${ate}.`,
    'Chapa esmaltada, dessas que a usina parafusava em cada patamar da escada de servico.',
  ];
}

export function textoDoDecal(peca: string): string[] {
  return peca.startsWith('faixa_') ? textoDaFaixa(peca) : [...(TEXTO_DA_PECA[peca] ?? ['Uma marca na parede.'])];
}

// ---------------------------------------------------------------- decais --
export interface DecalDoAndar {
  /** id do aviso no tilemap */
  id: string;
  /** frame no atlas `decais` */
  peca: string;
  familia: string;
  linhas: readonly string[];
}

/** A placa de faixa do andar — uma por andar, do 51 ao 150. */
export function faixaDoAndar(andar: number): string | null {
  if (andar <= 50) return null;
  const inicio = Math.floor((andar - 1) / 10) * 10 + 1;
  return `faixa_${String(inicio).padStart(3, '0')}_${String(inicio + 9).padStart(3, '0')}`;
}

/**
 * Os decais do andar, na ordem em que o gerador deve posiciona-los.
 *
 * A quantidade por familia vem do CAPITULO (`decais` em `CAPITULOS`), nunca do
 * andar: e assim que a raridade sobe de capitulo em capitulo em vez de variar
 * andar a andar sem regra. Qual peca da familia cai em qual andar sai do hash.
 *
 * Os andares de TRABALHO (51-100) recebem placa e quadro; os de INFANCIA
 * (101-150) recebem o que o capitulo declarar. Nenhum andar recebe sangue antes
 * do capitulo 14 — que e o que a Parte 7 pede quando diz que sangue e raro e
 * escolhido.
 */
export function decaisDoAndar(andar: number): DecalDoAndar[] {
  if (andar <= 50) return [];
  const cap = capituloDoAndar(andar);
  const saida: DecalDoAndar[] = [];

  const empilhar = (familia: string, quantos: number) => {
    const pecas = PECAS_POR_FAMILIA[familia] ?? [];
    if (pecas.length === 0) return;
    for (let k = 0; k < quantos; k++) {
      const peca = pecas[dado(andar, `${familia}${k}`, pecas.length)];
      saida.push({
        id: `decal_${String(andar).padStart(3, '0')}_${saida.length}`,
        peca,
        familia,
        linhas: textoDoDecal(peca),
      });
    }
  };

  if (cap.kit === 'trabalho') {
    // O ambiente de trabalho aparece por PLACA e QUADRO — vocabulario de
    // escritorio aplicado a concreto de usina, que e o que a Parte 3 pede.
    // Sobe de um por andar no capitulo 6 pra tres no 10.
    empilhar('placa', 1 + Math.floor((cap.numero - 6) / 2));
    if (andar % 3 === 0) empilhar('quadro', 1);
  }
  for (const d of cap.decais ?? []) empilhar(d.familia, d.quantidade);

  // O andar 150 sempre termina com a parede que fecha o trecho.
  if (andar === 150) {
    saida.push({
      id: `decal_${andar}_fim`,
      peca: 'aviso_fim',
      familia: 'aviso',
      linhas: textoDoDecal('aviso_fim'),
    });
  }
  return saida;
}

/** Todo texto de decal por id de aviso — entra em `ITENS_DE_LEITURA`. */
export const TEXTOS_DE_DECAL: Record<string, string[]> = (() => {
  const saida: Record<string, string[]> = {};
  for (let andar = 51; andar <= 150; andar++) {
    const faixa = faixaDoAndar(andar);
    if (faixa) saida[`faixa_${String(andar).padStart(3, '0')}`] = textoDoDecal(faixa);
    for (const d of decaisDoAndar(andar)) saida[d.id] = [...d.linhas];
  }
  return saida;
})();

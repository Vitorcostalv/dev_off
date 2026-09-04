# -*- coding: utf-8 -*-
import io
p='src/game/andares.ts'; s=io.open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)

rep("""export const idDaFicha = (andar: number): string => `ficha_${String(andar).padStart(3, '0')}`;

export function diasDaFicha(andar: number): { de: number; ate: number } {
  return { de: (andar - 1) * 4 + 1, ate: andar * 4 };
}""",
"""/**
 * AS TRES SECOES DO ARQUIVO (Parte 9).
 *
 * O prontuario e o que ja existia e nao se toca: cinquenta fichas medicas
 * cobrindo duzentos dias. As duas secoes novas nao sao prontuario e nao se
 * fingem de prontuario — sao papel de trabalho e papel de escola, com formato
 * proprio. Sao artefatos de FICCAO: nao ha ali orientacao medica, dose,
 * diagnostico aproveitavel nem conduta que alguem deva seguir.
 */
export type SecaoDeArquivo = 'prontuario' | 'trabalho' | 'infancia';

export interface DefinicaoSecao {
  id: SecaoDeArquivo;
  /** rotulo na tela de Arquivos */
  nome: string;
  faixa: readonly [number, number];
  /** prefixo do id de documento */
  prefixo: string;
  /** uma linha explicando a secao, no cabecalho da aba */
  resumo: string;
}

export const SECOES_DE_ARQUIVO: readonly DefinicaoSecao[] = [
  {
    id: 'prontuario',
    nome: 'Prontuario',
    faixa: [1, 50],
    prefixo: 'ficha',
    resumo: 'Duzentos dias de acompanhamento, quatro por ficha.',
  },
  {
    id: 'trabalho',
    nome: 'Trabalho',
    faixa: [51, 100],
    prefixo: 'work_record',
    resumo: 'Papel de emprego: saude ocupacional, chamado, avaliacao, recado.',
  },
  {
    id: 'infancia',
    nome: 'Infancia',
    faixa: [101, 150],
    prefixo: 'childhood_record',
    resumo: 'Papel de escola e de casa, de muito antes do primeiro emprego.',
  },
];

export function secaoDoAndar(andar: number): DefinicaoSecao {
  const s = SECOES_DE_ARQUIVO.find((sec) => andar >= sec.faixa[0] && andar <= sec.faixa[1]);
  if (!s) throw new Error(`[andares] andar ${andar} esta fora das secoes de arquivo`);
  return s;
}

/**
 * Id do documento do andar.
 *
 * Os cinquenta primeiros mantem `ficha_001`..`ficha_050`, letra por letra: eles
 * ja estao gravados em save de quem desceu, e renomear apagaria o arquivo de
 * quem jogou. Os novos usam o prefixo da propria secao.
 */
export const idDaFicha = (andar: number): string =>
  `${secaoDoAndar(andar).prefixo}_${String(andar).padStart(3, '0')}`;

/**
 * Os quatro dias que a ficha cobre — SO no prontuario.
 *
 * A cronologia de duzentos dias fecha no andar 50 e nao continua: os documentos
 * de trabalho sao anteriores a ela e os de infancia sao anteriores a tudo.
 * Estender a conta pra baixo criaria um dia 201 que nao existe em lugar nenhum.
 */
export function diasDaFicha(andar: number): { de: number; ate: number } | null {
  if (andar > 50) return null;
  return { de: (andar - 1) * 4 + 1, ate: andar * 4 };
}""")

# mapa: aceitar 3 digitos na leitura
rep("""  const m = /^represa_f(\d{2})$/.exec(mapa);""",
"""  // dois OU tres digitos: `represa_f06` continua sendo o andar 6 e
  // `represa_f100` passa a ser o 100. O gerador ja escrevia tres digitos
  // sozinho (padStart nao corta), entao so a LEITURA precisava alargar.
  const m = /^represa_f(\d{2,3})$/.exec(mapa);""")

rep("""    ficha: string;
    dias: { de: number; ate: number };""", """    ficha: string;
    dias: { de: number; ate: number };""") if False else None

rep("""  /** id da ficha medica do andar */
  ficha: string;
  dias: { de: number; ate: number };""",
"""  /** secao do arquivo a que o documento do andar pertence */
  secao: SecaoDeArquivo;
  /** id do documento do andar */
  ficha: string;
  /** dias cobertos — so no prontuario (andares 1 a 50) */
  dias: { de: number; ate: number } | null;""")

rep("""      ficha: idDaFicha(andar),
      dias: diasDaFicha(andar),""",
"""      secao: secaoDoAndar(andar).id,
      ficha: idDaFicha(andar),
      dias: diasDaFicha(andar),""")

# codigo do HUD: 3 digitos quando passa de 99
rep("""      codigo: `A-${String(andar).padStart(2, '0')}`,""",
"""      codigo: `A-${String(andar).padStart(andar > 99 ? 3 : 2, '0')}`,""")

# luzes do andar entram na definicao
rep("""      escuridao: escuridaoDoAndar(andar),""",
"""      escuridao: escuridaoDoAndar(andar),
      luzesAcesas: luzesAcesasDoAndar(andar),
      kit: capituloDoAndar(andar).kit,""")
rep("""  escuridao: number;
  /** familia do enigma; null nos cinco andares autorais */""",
"""  escuridao: number;
  /** fracao das luminarias do andar que tem energia sem o painel resolvido */
  luzesAcesas: number;
  /** kit visual (folha de parede) do capitulo */
  kit: KitDeAndar;
  /** familia do enigma; null nos cinco andares autorais */""")
io.open(p,'w',encoding='utf-8').write(s); print('ok')

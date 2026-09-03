/**
 * O TEMA DA INTERFACE — uma paleta e um vocabulario de peca, num lugar so.
 *
 * A interface anterior era funcional e parecia protótipo: retangulo preto
 * chapado, sem hierarquia, com o dinheiro e a vida soltos um do lado do outro e
 * uma barra de HP com cara de medidor de depuracao. O que faltava nao era
 * enfeite — era um SISTEMA: as mesmas cores, as mesmas molduras e os mesmos
 * espacamentos em toda tela, pra a proxima tela nascer parecida com as que ja
 * existem em vez de inventar a propria aparencia.
 *
 * A DIRECAO e "RPG de pixel + cidade pequena + oficina": papel amarelado,
 * carvao, madeira, latao. Nao e Stardew (nao ha o verde-menta nem a moldura
 * arredondada de madeira clara dele) e nao e painel de aplicativo (nao ha
 * cinza-azulado nem sombra difusa). E ficha de papel velho em cima de bancada.
 *
 * TUDO em `TEMA` e token: nenhuma cor literal deve aparecer numa cena. Isso e o
 * que permite mexer na paleta inteira num arquivo e o que faz a Parte 48 do
 * plano (componentes reusaveis) ser possivel de verdade.
 */

/**
 * A paleta.
 *
 * Os numeros (`0x…`) sao pra Graphics e tint; as strings (`#…`) sao pra texto,
 * que o Phaser so aceita em CSS. Onde as duas formas existem, sao a MESMA cor —
 * a duplicacao e da API, nao da paleta.
 */
export const COR = {
  /** papel amarelado: o texto principal e o fundo de campo claro */
  papel: 0xf2ead7,
  papelTexto: '#f2ead7',
  /** papel na sombra: rotulo, unidade, dica de tecla */
  papelFraco: 0xbdb29a,
  papelFracoTexto: '#bdb29a',
  /** carvao: o fundo de todo painel */
  carvao: 0x14120e,
  /** carvao um tom acima: campo interno, linha alternada, slot vazio */
  carvaoClaro: 0x241f18,
  /** madeira escura: moldura externa e divisoria */
  madeira: 0x4a3c2c,
  /** latao: a cor de destaque — selecao, numero que importa, borda de foco */
  latao: 0xc9a227,
  lataoTexto: '#e8c34a',
  /** latao aceso, so pro que esta selecionado agora */
  lataoVivo: 0xffd97d,
  lataoVivoTexto: '#ffd97d',
  /** verde musgo: confirmacao, vida cheia, valor positivo */
  verde: 0x7ea55f,
  verdeTexto: '#a6d98b',
  /** ambar: atencao sem erro — vida na metade, tensao subindo */
  ambar: 0xd9903f,
  ambarTexto: '#f0a860',
  /** vermelho queimado: recusa, dano, vida baixa */
  alerta: 0xb85440,
  alertaTexto: '#ff9c7a',
  /** azul frio, so pra agua e chuva */
  agua: 0x6f96b8,
  aguaTexto: '#8fb6d8',
  preto: 0x000000,
} as const;

/** Tipografia. A fonte e monoespacada: a arte e pixel e o alinhamento importa. */
export const FONTE = {
  familia: 'monospace',
  /** 12 px: titulo de painel */
  titulo: '12px',
  /** 11 px: nome de item, linha de HUD */
  corpo: '11px',
  /** 10 px: descricao, valor */
  miudo: '10px',
  /** 9 px: dica de tecla, rodape */
  nota: '9px',
} as const;

/** Espacamento. Multiplos de 2, que e o que casa com a grade de pixel. */
export const ESPACO = {
  /** margem interna de painel */
  margem: 10,
  /** vao entre blocos de conteudo */
  vao: 8,
  /** vao curto, entre linhas de um mesmo bloco */
  linha: 4,
  /** altura da barra de titulo de um painel */
  cabecalho: 18,
  /** altura de uma linha de dica no rodape */
  rodape: 11,
} as const;

/** Medidas de peca. */
export const PECA = {
  /** lado do slot de inventario */
  slot: 26,
  /** vao entre slots */
  vaoSlot: 4,
  /** espessura da moldura de painel */
  borda: 1,
  /** altura de uma barra de progresso */
  barra: 7,
  /** lado da caixa de previa do item selecionado */
  previa: 56,
} as const;

/**
 * PROFUNDIDADE das camadas de interface.
 *
 * Ficam aqui, e nao espalhadas pelas cenas, porque a ordem entre elas e uma
 * decisao de interface: o aviso rapido tem de aparecer por cima do inventario,
 * o dialogo por cima de tudo e a caixa de confirmacao por cima do dialogo.
 */
export const CAMADA = {
  hud: 90,
  prompt: 92,
  aviso: 95,
  painel: 105,
  sobreposto: 106,
  modal: 110,
} as const;

/**
 * Cor de uma fracao de 0 a 1, pro que enche e esvazia (vida, tensao, carga).
 *
 * `invertido` troca o sentido: numa barra de VIDA, cheio e bom; numa de TENSAO,
 * cheio e ruim.
 */
export function corDaFracao(fracao: number, invertido = false): number {
  const f = invertido ? 1 - fracao : fracao;
  if (f > 0.6) return COR.verde;
  if (f > 0.3) return COR.ambar;
  return COR.alerta;
}

export function textoDaFracao(fracao: number, invertido = false): string {
  const cor = corDaFracao(fracao, invertido);
  if (cor === COR.verde) return COR.verdeTexto;
  if (cor === COR.ambar) return COR.ambarTexto;
  return COR.alertaTexto;
}

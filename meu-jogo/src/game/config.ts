import type { TipoInteragivel, TipoZona } from './tipos.ts';

/** Numeros que valem a pena mexer sem cacar no meio do codigo. */
export const CONFIG = {
  /** resolucao base; o Scale.FIT cuida do resto */
  largura: 480,
  altura: 270,

  /** Velocidades do player em pixels por segundo. */
  movimento: {
    andar: 91,
    correr: 143,
  },

  // Distancias em TILES, nao em pixels: o mundo escala com o tamanho do tile
  // (a FarmScene multiplica pelo valor lido do tilemap).
  interacao: {
    /** alcance, em tiles */
    raio: 1.75,
    /** cosseno minimo entre "pra onde o player olha" e "onde esta o alvo" */
    cosseno: 0.35,
    /** abaixo disso o alvo vale mesmo estando de costas (voce esta em cima dele) */
    distanciaLivre: 0.56,
  },
} as const;

/** Verbo mostrado no prompt para cada classe de objeto. */
export const ROTULOS: Record<TipoInteragivel, string> = {
  domestico: 'Examinar',
  atividade_rural: 'Cuidar',
  placa: 'Ler',
  npc: 'Falar',
  porta: 'Entrar',
  cama: 'Dormir',
  item: 'Pegar',
  loja: 'Comprar',
  computador: 'Usar',
  expansao: 'Ampliar casa',
  mobilia: 'Mobiliar',
  obra: 'Gerenciar obra',
  painel: 'Operar',
  sucata: 'Recolher',
  revenda: 'Despachar sucata',
  elevador: 'Chamar elevador',
  bicho: 'Observar',
};

/** Cor da demarcacao de cada tipo de zona reservada (overlay de debug, F6). */
export const COR_ZONA: Record<TipoZona, number> = {
  casa: 0x7fc9ff,
  mercado: 0xffd97d,
  academia: 0xff8f7f,
  parque: 0x9ee493,
  bar: 0xffa95c,
  farmacia: 0x7fe3d0,
  // Mapa 2
  oficina: 0xd8a6ff,
  escola: 0xffc4dd,
  biblioteca: 0xc9b6ff,
  quadra: 0x8fe0b8,
  terreno: 0x9a8f7c,
  servico: 0xb0b6c2,
  // Mapa 3
  madeireira: 0xc99a5c,
  pedreira: 0xbfc0c4,
  fazenda: 0xd7e08a,
  // Mapa 4
  represa: 0x8fb6d9,
  mirante: 0xa9c7b0,
};

/**
 * Paleta e medidas da interface. **Nenhuma tela escreve cor ou tamanho de fonte
 * direto** — quem precisa de um valor novo batiza um token aqui, e
 * `verificar-interface` recusa o build se um `fontSize` cru voltar a aparecer.
 *
 * A tela tem 270px de altura. A escala abaixo tem OITO degraus porque foram os
 * oito que as telas precisaram de verdade; antes eram dez valores acidentais
 * (8, 9, 10, 11, 12, 13, 15, 18, 20 e 22px) escritos setenta e quatro vezes,
 * com 10 e 11 repetidos a mao mesmo tendo token.
 */
export const UI = {
  fonte: 'monospace',

  // --- escala de texto, do menor pro maior ---
  /** rotulo desenhado DENTRO do mundo: placa de rua, nome de zona no mapa */
  tamanhoPlaca: '8px',
  /** legenda e contador: pilha no slot, rodape de app, unidade de preco */
  tamanhoMiudo: '9px',
  /** corpo: item de lista, opcao de menu, valor de HUD */
  tamanho: '10px',
  /** titulo de painel e rotulo de aba */
  tamanhoTitulo: '11px',
  /** corpo de fala: o texto mais lido do jogo, dois px acima do corpo comum */
  tamanhoFala: '12px',
  /** nome de quem fala, no alto da caixa de dialogo */
  tamanhoNome: '13px',
  /** numero que e a informacao em si: pontuacao, contagem de conquista */
  tamanhoNumero: '15px',
  /**
   * O maior texto do jogo, e o unico degrau acima de 15px: titulo de tela de
   * menu, glifo de icone do desktop, visor de calculadora, peca de jogo do PC.
   * Sao todos texto CENTRADO em caixa propria — nada aqui entra em lista, que e
   * o que faria dois px de diferenca refluir layout.
   */
  tamanhoGrande: '20px',

  // --- cores ---
  texto: '#f4efe2',
  textoFraco: '#b9b0a0',
  destaque: '#ffd97d',
  /** recusa e aviso: dinheiro que falta, inventario cheio */
  alerta: '#ff9c7a',
  /** confirmacao: compra feita, item usado */
  sucesso: '#a6d98b',
  fundo: 0x1a1712,
  fundoAlfa: 0.88,
  borda: 0x6b5f4c,
  /** vazio dentro de um painel: moldura de retrato, cova de slot */
  fundoProfundo: 0x0d0b08,
  /** linha selecionada de uma lista */
  selecao: 0x3a3226,
  /** borda da linha selecionada e do slot em foco */
  bordaViva: 0xffd97d,
  /**
   * Cova TRANSLUCIDA: slot de inventario e linha de lista. Preto com alfa em vez
   * de uma cor propria — escurece o painel que esta atras em vez de pintar sobre
   * ele, entao a mesma cova funciona no inventario (fundo a 96%) e na loja.
   */
  poco: 0x000000,
  /** o alfa do poco. Era 0,35 no slot e 0,25 na linha de lista, sem razao. */
  alfaPoco: 0.3,
  /** base branca de quem vai receber `setTint`: sem ela a tinta sai escura */
  tinta: 0xffffff,
  /** quadradinho de item sem arte propria, na lista da loja */
  iconeNeutro: 0xa79d8c,
  /** borda desse quadradinho */
  iconeBorda: 0xf4ead2,

  // --- opacidade de painel ---
  /**
   * Painel que abre sobre o MUNDO. Nao e 1: ver o cenario por tras lembra que o
   * jogo continua ali. Nao e 0,88 (o que era): com o cenario claro do meio-dia
   * o texto perdia contraste.
   */
  alfaPainel: 0.96,
  /**
   * Painel que abre sobre OUTRO PAINEL — confirmacao por cima da loja, menu de
   * assunto por cima da fala. Aqui qualquer transparencia deixa a lista de tras
   * vazando por entre as letras da pergunta.
   */
  alfaSobreposto: 1,
} as const;

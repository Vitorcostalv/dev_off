import type Phaser from 'phaser';
import { UI } from '../game/config.ts';

/**
 * Peliculas do "sistema operacional": todo app desenha com estas funcoes, entao
 * caixa, botao e texto ficam iguais nas sete telas sem cada uma repetir os
 * mesmos `fillStyle`/`strokeRect`.
 */
export const PC = {
  /** fundo do desktop e das areas de conteudo */
  fundo: 0x11151c,
  painel: 0x1b2230,
  painelClaro: 0x27303f,
  borda: 0x3d4a5e,
  bordaViva: 0x6f8fbf,
  texto: UI.texto,
  textoFraco: UI.textoFraco,
  destaque: '#8fc0ff',
  alerta: UI.alerta,
  sucesso: UI.sucesso,
  /** cinza dos apps ainda sem funcao */
  bloqueado: 0x2a3240,
  /**
   * Fundo de area de CONTEUDO dentro de um app: visor da calculadora, lista de
   * arquivos, corpo da pagina do navegador, foto do produto na loja. Mais escuro
   * que `painel` de proposito — e o que separa "onde o app desenha o dado" de
   * "onde o app desenha os proprios controles".
   */
  cova: 0x0d1119,
  /** cartao ou linha selecionada de uma lista */
  selecionado: 0x2f3c52,
  /** letra POR CIMA de um fundo de destaque, que e claro */
  sobreDestaque: '#0e1420',
  /** risco do papel de parede do desktop */
  parede: 0x1a2130,
  /** icone do desktop em foco */
  focado: 0x2a3550,
  /** glifo sobre o ladrilho colorido de um icone: branco em qualquer cor de app */
  glifo: '#ffffff',
} as const;

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Retangulo preenchido com borda de 1px, alinhado ao pixel. */
export function caixa(
  g: Phaser.GameObjects.Graphics,
  r: Retangulo,
  preenchimento: number,
  borda: number = PC.borda,
  alfa = 1,
): void {
  g.fillStyle(preenchimento, alfa);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, borda, 1);
  // o +0.5 e o que faz a linha cair EM CIMA do pixel em vez de entre dois
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

export function texto(
  cena: Phaser.Scene,
  x: number,
  y: number,
  conteudo: string,
  estilo: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return cena.add.text(x, y, conteudo, {
    fontFamily: UI.fonte,
    fontSize: UI.tamanho,
    color: PC.texto,
    ...estilo,
  });
}

/**
 * Corta o texto que nao cabe em `limite` caracteres e marca o corte com "…".
 * A fonte e monoespacada, entao contar caractere e o mesmo que medir largura —
 * e mais barato que perguntar a largura pro objeto a cada redesenho.
 */
export function encurtar(conteudo: string, limite: number): string {
  return conteudo.length <= limite ? conteudo : `${conteudo.slice(0, limite - 1)}…`;
}

/**
 * Um botao clicavel com estado de selecao. Devolve os dois objetos porque o
 * chamador precisa do texto (pra trocar rotulo) e do fundo (pra repintar).
 */
export interface Botao {
  fundo: Phaser.GameObjects.Rectangle;
  rotulo: Phaser.GameObjects.Text;
  destacar(ativo: boolean): void;
}

export function botao(
  cena: Phaser.Scene,
  r: Retangulo,
  conteudo: string,
  aoClicar: () => void,
): Botao {
  const fundo = cena.add
    .rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, PC.painelClaro)
    .setStrokeStyle(1, PC.borda)
    .setInteractive({ useHandCursor: true });
  const rotulo = cena.add
    .text(r.x + r.w / 2, r.y + r.h / 2, conteudo, {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: PC.textoFraco,
    })
    .setOrigin(0.5, 0.5);

  fundo.on('pointerdown', aoClicar);

  const destacar = (ativo: boolean): void => {
    fundo.setFillStyle(ativo ? PC.bordaViva : PC.painelClaro);
    fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
    rotulo.setColor(ativo ? PC.sobreDestaque : PC.textoFraco);
  };
  destacar(false);

  return { fundo, rotulo, destacar };
}

/**
 * Escala um icone do atlas `itens` pra caber num quadrado de `lado` px sem
 * distorcer. Os frames tem tamanhos diferentes (a arte sai por blob), entao
 * fixar `displayWidth` deformaria as pecas compridas.
 */
export function ajustarIcone(img: Phaser.GameObjects.Image, lado: number): void {
  img.setScale(lado / Math.max(img.frame.width, img.frame.height));
}

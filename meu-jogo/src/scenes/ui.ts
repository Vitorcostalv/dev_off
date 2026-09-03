import Phaser from 'phaser';
import { COR, ESPACO, FONTE, PECA } from '../game/tema';

/**
 * OS COMPONENTES DE INTERFACE — painel, campo, slot, barra, aba, dica.
 *
 * Sao funcoes de desenho, nao classes: cada uma recebe um `Graphics` e pinta
 * dentro dele. Isso e deliberado — as telas do jogo sao poucas e estaticas, e
 * uma hierarquia de widgets com estado seria mais codigo do que as telas
 * inteiras somadas.
 *
 * O que isto resolve e o que a Parte 48 do plano pediu: a proxima tela nasce
 * parecida com as que ja existem porque ela chama `painel()` e `campo()` em vez
 * de escolher a propria cor de fundo e a propria espessura de borda. Antes desta
 * leva cada painel do jogo tinha o proprio `fillStyle` copiado do vizinho, e eles
 * ja tinham divergido em alfa e em cor de borda.
 */

export interface Ret {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * PAINEL: a caixa de toda tela.
 *
 * Tres camadas, e cada uma tem razao de existir:
 *
 *  - a SOMBRA de um pixel embaixo e a direita separa o painel do mundo atras
 *    dele sem precisar de opacidade;
 *  - o CORPO em carvao quase opaco (0,96) deixa passar so o suficiente pra
 *    lembrar que o jogo continua atras;
 *  - a MOLDURA dupla — madeira por fora, latao por dentro — e o que da a leitura
 *    de peca de bancada em vez de retangulo de depuracao.
 */
export function painel(g: Phaser.GameObjects.Graphics, r: Ret, comCabecalho = true): void {
  g.fillStyle(COR.preto, 0.45);
  g.fillRect(r.x + 2, r.y + 2, r.w, r.h);

  g.fillStyle(COR.carvao, 0.96);
  g.fillRect(r.x, r.y, r.w, r.h);

  g.lineStyle(1, COR.madeira, 1);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.lineStyle(1, COR.latao, 0.55);
  g.strokeRect(r.x + 2.5, r.y + 2.5, r.w - 5, r.h - 5);

  if (!comCabecalho) return;
  // faixa de titulo: fundo um tom acima e um fio de latao embaixo
  g.fillStyle(COR.carvaoClaro, 1);
  g.fillRect(r.x + 3, r.y + 3, r.w - 6, ESPACO.cabecalho);
  g.lineStyle(1, COR.latao, 0.7);
  g.beginPath();
  g.moveTo(r.x + 3, r.y + 3 + ESPACO.cabecalho + 0.5);
  g.lineTo(r.x + r.w - 3, r.y + 3 + ESPACO.cabecalho + 0.5);
  g.strokePath();
}

/**
 * CAMPO: a area rebaixada dentro de um painel — a grade de slots, a caixa de
 * previa, o bloco de descricao. E o que separa "conteudo" de "fundo do painel"
 * sem usar mais uma cor.
 */
export function campo(g: Phaser.GameObjects.Graphics, r: Ret, aceso = false): void {
  g.fillStyle(COR.carvaoClaro, aceso ? 0.9 : 0.55);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, aceso ? COR.latao : COR.madeira, aceso ? 0.9 : 0.7);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

/**
 * SLOT de inventario.
 *
 * O slot SELECIONADO nao muda so de cor: ele ganha moldura de dois pixels e um
 * canto de latao em cada quina. A Parte 43 reclamou que o estado selecionado
 * estava fraco, e cor sozinha e o jeito mais fraco de marcar selecao — some no
 * meio de vinte slots iguais e nao funciona pra quem nao distingue as duas
 * cores.
 */
export function slot(
  g: Phaser.GameObjects.Graphics,
  r: Ret,
  estado: 'vazio' | 'cheio' | 'selecionado',
): void {
  g.fillStyle(COR.carvao, estado === 'vazio' ? 0.55 : 0.8);
  g.fillRect(r.x, r.y, r.w, r.h);
  if (estado === 'selecionado') {
    g.lineStyle(2, COR.lataoVivo, 1);
    g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    const q = 4;
    g.fillStyle(COR.lataoVivo, 1);
    for (const [cx, cy] of [
      [r.x, r.y], [r.x + r.w - q, r.y],
      [r.x, r.y + r.h - q], [r.x + r.w - q, r.y + r.h - q],
    ]) {
      g.fillRect(cx, cy, q, 2);
      g.fillRect(cx, cy, 2, q);
    }
    return;
  }
  g.lineStyle(1, estado === 'cheio' ? COR.madeira : COR.madeira, estado === 'cheio' ? 1 : 0.5);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

/**
 * BARRA de progresso — vida, tensao, recarga.
 *
 * Ela e SEGMENTADA e nao contínua: em 11 px de altura util, uma barra lisa nao
 * deixa ler quanto falta, e a leitura por blocos ("sete de dez") e a que serve
 * numa briga. Foi por isso que a barra antiga parecia medidor de depuracao — ela
 * era um retangulo cheio dentro de outro.
 */
export function barra(
  g: Phaser.GameObjects.Graphics,
  r: Ret,
  fracao: number,
  cor: number,
  blocos = 10,
): void {
  g.fillStyle(COR.carvao, 0.85);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, COR.madeira, 1);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  const vao = 1;
  const largura = (r.w - 4 - vao * (blocos - 1)) / blocos;
  const cheios = Math.round(Math.max(0, Math.min(1, fracao)) * blocos);
  for (let i = 0; i < blocos; i++) {
    g.fillStyle(i < cheios ? cor : COR.carvaoClaro, i < cheios ? 1 : 0.7);
    g.fillRect(r.x + 2 + i * (largura + vao), r.y + 2, largura, r.h - 4);
  }
}

/** ABA de filtro/secao. Ativa = fundo de latao fraco e texto claro. */
export function aba(g: Phaser.GameObjects.Graphics, r: Ret, ativa: boolean): void {
  g.fillStyle(ativa ? COR.latao : COR.carvaoClaro, ativa ? 0.35 : 0.6);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, ativa ? COR.latao : COR.madeira, ativa ? 1 : 0.6);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

/** Linha divisoria fina, pra separar dois blocos dentro do mesmo painel. */
export function divisoria(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y: number): void {
  g.lineStyle(1, COR.madeira, 0.8);
  g.beginPath();
  g.moveTo(x0, y + 0.5);
  g.lineTo(x1, y + 0.5);
  g.strokePath();
}

// ------------------------------------------------------------------ texto --
/** Texto de TITULO de painel: latao, 12 px. */
export const titulo = (cena: Phaser.Scene, x: number, y: number, texto = ''): Phaser.GameObjects.Text =>
  cena.add.text(x, y, texto, {
    fontFamily: FONTE.familia,
    fontSize: FONTE.titulo,
    color: COR.lataoVivoTexto,
  });

/** Texto de CORPO: papel, 11 px. */
export const corpo = (
  cena: Phaser.Scene,
  x: number,
  y: number,
  texto = '',
  largura?: number,
): Phaser.GameObjects.Text =>
  cena.add.text(x, y, texto, {
    fontFamily: FONTE.familia,
    fontSize: FONTE.corpo,
    color: COR.papelTexto,
    ...(largura ? { wordWrap: { width: largura } } : {}),
  });

/** Texto MIUDO: descricao e valor, 10 px. */
export const miudo = (
  cena: Phaser.Scene,
  x: number,
  y: number,
  texto = '',
  largura?: number,
  cor: string = COR.papelFracoTexto,
): Phaser.GameObjects.Text =>
  cena.add.text(x, y, texto, {
    fontFamily: FONTE.familia,
    fontSize: FONTE.miudo,
    color: cor,
    lineSpacing: 2,
    ...(largura ? { wordWrap: { width: largura } } : {}),
  });

/** DICA de tecla: 9 px, papel na sombra. */
export const nota = (
  cena: Phaser.Scene,
  x: number,
  y: number,
  texto = '',
  largura?: number,
): Phaser.GameObjects.Text =>
  cena.add.text(x, y, texto, {
    fontFamily: FONTE.familia,
    fontSize: FONTE.nota,
    color: COR.papelFracoTexto,
    ...(largura ? { wordWrap: { width: largura } } : {}),
  });

/**
 * CARTAO de HUD: painel pequeno sem cabecalho, pro relogio, o saldo e a vida.
 *
 * Ele e mais transparente que um painel de tela cheia (0,82 contra 0,96) porque
 * fica por cima do jogo o tempo todo — a Parte 41 pede que a HUD normal nao cubra
 * pedaco util da tela.
 */
export function cartao(g: Phaser.GameObjects.Graphics, r: Ret): void {
  g.fillStyle(COR.preto, 0.35);
  g.fillRect(r.x + 1, r.y + 1, r.w, r.h);
  g.fillStyle(COR.carvao, 0.82);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, COR.madeira, 0.9);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

/** Medidas de um painel centrado na tela. */
export function centrado(largura: number, alturaTela: number, larguraTela: number, altura: number): Ret {
  return {
    x: Math.round((larguraTela - largura) / 2),
    y: Math.round((alturaTela - altura) / 2),
    w: largura,
    h: altura,
  };
}

/** Retangulo interno de um painel, ja descontando margem e cabecalho. */
export function conteudo(r: Ret, comCabecalho = true): Ret {
  const topo = r.y + (comCabecalho ? ESPACO.cabecalho + 6 : 0) + ESPACO.margem;
  return {
    x: r.x + ESPACO.margem,
    y: topo,
    w: r.w - ESPACO.margem * 2,
    h: r.y + r.h - ESPACO.margem - topo,
  };
}

export { COR, ESPACO, FONTE, PECA };

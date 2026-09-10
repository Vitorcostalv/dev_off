import type Phaser from 'phaser';
import { UI } from '../game/config';

/**
 * Peliculas da interface do JOGO — o par do `src/pc/widgets.ts`, que faz o
 * mesmo pro sistema operacional do computador.
 *
 * Existe porque as cinco janelas da UIScene (fala, confirmacao, menu,
 * inventario e loja) desenhavam cada uma a sua propria moldura: cinco copias do
 * mesmo `fillRect` + `strokeRect`, com cinco opacidades diferentes, titulo em
 * quatro alturas diferentes (y+6, y+7, y+8 e y+13) e a dica de tecla ora no
 * canto de cima, ora no de baixo. Nada disso era decisao — era o resultado de
 * cada painel ter nascido num dia diferente.
 *
 * Agora a moldura sai daqui e as medidas sao UMA. Mexer no visual de todas as
 * janelas do jogo passou a ser mexer neste arquivo.
 */

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * CONTRASTE ALTO, a opcao de acessibilidade.
 *
 * Ela existia nas preferencias desde a etapa das opcoes e valia por UM
 * retangulo: o fundo do painel da tela de menu. O HUD, a caixa de fala, o
 * inventario, a loja e o computador ignoravam. Agora que toda moldura do jogo
 * passa por aqui, ligar a opcao muda todas de uma vez.
 *
 * O que ela faz e o que os proprios comentarios do codigo pediam: painel OPACO.
 * A caixa de fala tinha um comentario dizendo "o que atrapalhava a leitura era o
 * cenario claro vazando por tras das letras", e a resposta na epoca foi subir a
 * opacidade de 88% pra 97%. Com a opcao ligada ela vai a 100%, e a borda passa
 * de `UI.borda` (marrom fosco) pra `UI.bordaViva` (amarelo), que separa o painel
 * do mundo sem depender de o mundo estar escuro.
 *
 * Um modulo de nivel, e nao um parametro em cada chamada: sao cinco janelas
 * chamando `moldura`, e passar a preferencia em todas faria a opcao ser
 * esquecida na sexta. Quem liga e a UIScene, no `create` — que roda de novo a
 * cada troca de mapa e a cada volta do menu de pausa.
 */
let contrasteAlto = false;

export function definirContraste(alto: boolean): void {
  contrasteAlto = alto;
}

export function contrasteEstaAlto(): boolean {
  return contrasteAlto;
}

/** Onde o titulo, a dica e o rodape ficam dentro de qualquer painel. */
export const PAINEL = {
  /** respiro lateral do conteudo, contado da borda */
  margem: 8,
  /** linha de base do titulo, contada do topo do painel */
  titulo: 6,
  /** linha de base do rodape, contada do fundo do painel */
  rodape: 13,
} as const;

/**
 * Preenchimento + borda de 1px alinhada ao pixel.
 *
 * O `+0.5` e o que faz a linha cair EM CIMA da fileira de pixel em vez de entre
 * duas: sem ele a borda sai com 2px de cinza claro num canvas com
 * `roundPixels`, e o painel parece desfocado ao lado da arte.
 *
 * `sobreposto` e pra painel que abre por cima de outro painel — ver
 * `UI.alfaSobreposto`.
 */
export function moldura(
  g: Phaser.GameObjects.Graphics,
  r: Retangulo,
  { sobreposto = false, borda = UI.borda } = {},
): void {
  // contraste alto: opaco de verdade, e borda que nao depende do mundo escuro
  const alfa = contrasteAlto || sobreposto ? UI.alfaSobreposto : UI.alfaPainel;
  g.fillStyle(UI.fundo, alfa);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, contrasteAlto && borda === UI.borda ? UI.bordaViva : borda, 1);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  // o retangulo QUE FOI DESENHADO, pra quem precisa medir a moldura depois.
  // `getBounds` do container nao serve: ele soma os filhos, e o texto de titulo
  // ou um icone que passe da borda movem o canto que ele devolve — a conferencia
  // de navegador procurava o traco de 1px a tres pixels do lugar por isso.
  g.setData('painel', { ...r });
}

/** Cova escura de conteudo dentro de um painel: moldura de retrato, slot. */
export function cova(g: Phaser.GameObjects.Graphics, r: Retangulo): void {
  g.fillStyle(UI.fundoProfundo, 1);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, UI.borda, 1);
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
}

/** Titulo no alto e a esquerda. Toda janela do jogo tem um, na mesma altura. */
export function tituloDePainel(
  cena: Phaser.Scene,
  r: Retangulo,
  conteudo: string,
): Phaser.GameObjects.Text {
  return cena.add.text(r.x + PAINEL.margem, r.y + PAINEL.titulo, conteudo, {
    fontFamily: UI.fonte,
    fontSize: UI.tamanhoTitulo,
    color: UI.destaque,
  });
}

/**
 * Dica de tecla no alto e a DIREITA, na mesma linha do titulo.
 *
 * Fica em cima, nao embaixo, porque é onde o jogador olha ao abrir a janela: se
 * a unica instrucao de como sair estivesse no pe do painel, o jogador que abriu
 * o inventario sem querer teria de varrer a tela pra descobrir como fechar.
 */
export function dicaDePainel(
  cena: Phaser.Scene,
  r: Retangulo,
  conteudo: string,
): Phaser.GameObjects.Text {
  return cena.add
    .text(r.x + r.w - PAINEL.margem, r.y + PAINEL.titulo + 1, conteudo, {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoMiudo,
      color: UI.textoFraco,
    })
    .setOrigin(1, 0);
}

/** Rodape de comandos, no pe do painel. */
export function rodapeDePainel(
  cena: Phaser.Scene,
  r: Retangulo,
  conteudo = '',
): Phaser.GameObjects.Text {
  return cena.add.text(r.x + PAINEL.margem, r.y + r.h - PAINEL.rodape, conteudo, {
    fontFamily: UI.fonte,
    fontSize: UI.tamanhoMiudo,
    color: UI.textoFraco,
  });
}

/** Centraliza um retangulo de `w` x `h` na tela logica. */
export function centralizar(largura: number, altura: number, w: number, h: number): Retangulo {
  return { x: Math.round((largura - w) / 2), y: Math.round((altura - h) / 2), w, h };
}

import Phaser from 'phaser';
import { estado } from '../game/estado';
import { comportamentoDe } from '../game/equipar';
import type { AjustePorDirecao } from '../game/equipar';
import { buscarArma } from '../game/armas';
import type { Direcao } from '../game/tipos';

/**
 * A MAO DO JOGADOR — o item equipado, desenhado em cima do personagem.
 *
 * O jeito obvio de fazer isto seria uma folha de personagem por item: uma
 * `Player_com_pistola.png`, uma `Player_com_chave.png`, uma por ferramenta
 * futura. E o que este arquivo existe pra NAO fazer. O que ha e uma folha so, a
 * `Player_segurando`, em que o personagem segura um punho fechado vazio, e o
 * item e um sprite separado colado no punho.
 *
 * Isso precisa de tres informacoes, e as tres sao MEDIDAS e nao escritas a mao:
 *
 *  1. onde esta o punho em cada uma das quatro poses — sai de
 *     `maos_jogador.json`, que `tools/processar-sprites-jogador.mjs` produz
 *     achando o componente de cor de pele mais compacto de cada pose;
 *  2. onde esta a PRESA de cada item (o cabo da chave, o punho da pistola) e
 *     onde esta a BOCA DO CANO — sai de `equipamento.ancoras.json`, que
 *     `tools/gerar-equipamento.mjs` produz;
 *  3. como o item se acomoda na mao em cada direcao — este e o unico dado
 *     escrito a mao, e mora junto do item, em `COMPORTAMENTOS.ajuste`.
 *
 * O resultado e que a pistola, a chave inglesa e a lanterna usam o mesmo
 * caminho de codigo, e a proxima ferramenta tambem vai.
 */

/** Celula da folha do jogador. Tem de bater com `CELULA` do processador. */
const CELULA = { w: 200, h: 320 };

/** Ancora de punho por direcao, como o JSON traz. */
interface AncoraDeMao {
  x: number;
  y: number;
  lado: number;
}

/** Ancora de peca do atlas `equipamento`, como o JSON traz. */
interface AncoraDePeca {
  largura: number;
  altura: number;
  presa: { x: number; y: number };
  cano?: { x: number; y: number };
}

const AJUSTE_VAZIO: AjustePorDirecao = {};

/** Espessura e tamanho da mira, em px de tela (a mira nao escala com o zoom). */
const MIRA = { raio: 7, risco: 5, folga: 3, espessura: 1.5, cor: 0xffe9b0 };

export class MaoDoJogador {
  private cena: Phaser.Scene;
  private tamanhoTile: number;
  private maos: Record<string, AncoraDeMao>;
  private pecas: Record<string, AncoraDePeca>;

  private sprite: Phaser.GameObjects.Image | null = null;
  private mira: Phaser.GameObjects.Graphics | null = null;
  /** ms restantes do quadro de fogonete */
  private fogoneteMs = 0;
  /** ultimo frame aplicado, pra nao remandar o mesmo por quadro */
  private frameAtual = '';

  constructor(cena: Phaser.Scene, tamanhoTile: number) {
    this.cena = cena;
    this.tamanhoTile = tamanhoTile;
    this.maos = (cena.cache.json.get('maos-jogador')?.ancoras ?? {}) as Record<string, AncoraDeMao>;
    this.pecas = (cena.cache.json.get('equipamento-ancoras') ?? {}) as Record<string, AncoraDePeca>;
  }

  /**
   * PREFIXO de animacao do CORPO.
   *
   * Com algo na mao o corpo usa a folha de segurar; sem nada, as folhas
   * normais. E uma string e nao um `if` na cena porque a cena manda animacao em
   * seis lugares diferentes (parado, andando, correndo, menu aberto, mapa
   * aberto, golpe) e cada um teria de lembrar da regra.
   */
  prefixoDoCorpo(): string {
    return estado.equipamento.naMao ? 'seg-' : '';
  }

  /**
   * Nome da animacao do corpo. `run` na folha de segurar cai em `walk`: nao ha
   * arte de correr segurando, e correr com a pose parada faria o personagem
   * deslizar.
   */
  animacaoDoCorpo(tipo: 'idle' | 'walk' | 'run', direcao: Direcao): string {
    if (!estado.equipamento.naMao) return `${tipo}-${direcao}`;
    return `seg-${tipo === 'run' ? 'walk' : tipo}-${direcao}`;
  }

  // ------------------------------------------------------------- montagem --
  montar(): void {
    this.sprite = this.cena.add.image(0, 0, 'equipamento').setVisible(false);
    this.mira = this.cena.add.graphics().setDepth(99000).setVisible(false);
  }

  destruir(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.mira?.destroy();
    this.mira = null;
  }

  /** Acende o fogonete pela duracao declarada na arma. */
  piscarFogonete(): void {
    const arma = buscarArma(comportamentoDe(estado.equipamento.naMao)?.arma);
    this.fogoneteMs = arma?.duracaoFogonete ?? 0;
  }

  // ------------------------------------------------------------ atualizar --
  atualizar(deltaMs: number, player: Phaser.Physics.Arcade.Sprite, direcao: Direcao): void {
    if (this.fogoneteMs > 0) this.fogoneteMs = Math.max(0, this.fogoneteMs - deltaMs);
    const alvo = this.sprite;
    if (!alvo) return;

    const id = estado.equipamento.naMao;
    const c = comportamentoDe(id);
    if (!id || !c?.frameNaMao) {
      alvo.setVisible(false);
      return;
    }

    const arma = buscarArma(c.arma);
    const frame = this.fogoneteMs > 0 && arma?.fogonete ? arma.fogonete : c.frameNaMao;
    const peca = this.pecas[frame];
    if (!peca) {
      alvo.setVisible(false);
      return;
    }
    if (this.frameAtual !== frame) {
      this.frameAtual = frame;
      alvo.setFrame(frame);
    }

    const ajuste = c.ajuste?.[direcao] ?? AJUSTE_VAZIO;
    const pose = this.pose(player, direcao, ajuste);
    alvo.setVisible(true);
    alvo.setOrigin(peca.presa.x, peca.presa.y);
    alvo.setPosition(pose.x, pose.y);
    alvo.setScale(this.escalaDaPeca(c.alturaNaMao ?? 0.5, peca) * (ajuste.escala ?? 1));
    alvo.setFlipX(!!ajuste.espelhado);
    alvo.setAngle(ajuste.espelhado ? -(ajuste.giro ?? 0) : (ajuste.giro ?? 0));
    // Atras do corpo na pose de costas: a arma aponta pra longe da camera, e
    // desenhar por cima do tronco a faz parecer colada nas costas.
    alvo.setDepth(player.depth + (ajuste.atras ? -1 : 1));
  }

  /** Posicao MUNDO do punho, ja com o ajuste do item somado. */
  private pose(
    player: Phaser.Physics.Arcade.Sprite,
    direcao: Direcao,
    ajuste: AjustePorDirecao,
  ): { x: number; y: number } {
    const ancora = this.maos[direcao] ?? { x: CELULA.w / 2, y: CELULA.h * 0.6, lado: 20 };
    const escala = player.scaleY;
    // a origem do player e (0.5, 1): o centro da celula em x, o pe da celula em y
    return {
      x: player.x + (ancora.x + (ajuste.dx ?? 0) - CELULA.w / 2) * escala,
      y: player.y + (ancora.y + (ajuste.dy ?? 0) - CELULA.h) * escala,
    };
  }

  private escalaDaPeca(alturaTiles: number, peca: AncoraDePeca): number {
    return (alturaTiles * this.tamanhoTile) / peca.altura;
  }

  /**
   * BOCA DO CANO em coordenada de mundo — de onde o projetil nasce.
   *
   * Sai da mesma geometria do sprite (origem na presa, giro, espelho, escala),
   * porque o tiro tem de sair de onde o fogo aparece. Nascer o projetil no
   * centro do jogador foi o primeiro jeito e da pra ver a diferenca: o tiro
   * saia do peito e, de perto, atravessava o inimigo antes de aparecer.
   */
  pontaDoCano(player: Phaser.Physics.Arcade.Sprite, direcao: Direcao): { x: number; y: number } {
    const id = estado.equipamento.naMao;
    const c = comportamentoDe(id);
    const peca = c?.frameNaMao ? this.pecas[c.frameNaMao] : undefined;
    if (!c || !peca) return { x: player.x, y: player.y - this.tamanhoTile * 0.6 };
    const ajuste = c.ajuste?.[direcao] ?? AJUSTE_VAZIO;
    const base = this.pose(player, direcao, ajuste);
    const cano = peca.cano ?? { x: 1, y: 0.5 };
    const escala = this.escalaDaPeca(c.alturaNaMao ?? 0.5, peca) * (ajuste.escala ?? 1);
    let dx = (cano.x - peca.presa.x) * peca.largura * escala;
    const dy = (cano.y - peca.presa.y) * peca.altura * escala;
    if (ajuste.espelhado) dx = -dx;
    const giro = Phaser.Math.DegToRad(ajuste.espelhado ? -(ajuste.giro ?? 0) : (ajuste.giro ?? 0));
    return {
      x: base.x + dx * Math.cos(giro) - dy * Math.sin(giro),
      y: base.y + dx * Math.sin(giro) + dy * Math.cos(giro),
    };
  }

  // ----------------------------------------------------------------- mira --
  /**
   * A MIRA. Aparece so com arma de fogo na mao, e e desenhada em coordenada de
   * MUNDO (ela segue o cursor no mundo, nao na tela) mas com espessura fixa em
   * px: dividir pelo zoom da camera e o que impede o risco de virar um bloco.
   */
  atualizarMira(ponteiro: Pick<Phaser.Input.Pointer, 'worldX' | 'worldY'>, ativa: boolean): void {
    const g = this.mira;
    if (!g) return;
    if (!ativa) {
      g.setVisible(false);
      return;
    }
    const zoom = this.cena.cameras.main.zoom || 1;
    const r = MIRA.raio / zoom;
    const risco = MIRA.risco / zoom;
    const folga = MIRA.folga / zoom;
    g.clear();
    g.setVisible(true);
    g.lineStyle(MIRA.espessura / zoom, MIRA.cor, 0.9);
    g.strokeCircle(ponteiro.worldX, ponteiro.worldY, r);
    for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      g.beginPath();
      g.moveTo(ponteiro.worldX + ex * (r + folga), ponteiro.worldY + ey * (r + folga));
      g.lineTo(ponteiro.worldX + ex * (r + folga + risco), ponteiro.worldY + ey * (r + folga + risco));
      g.strokePath();
    }
  }
}

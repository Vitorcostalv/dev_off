import type Phaser from 'phaser';
import { PC, caixa, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';
import { UI } from '../../../game/config';

/**
 * Snake — implementacao propria, sem biblioteca nova.
 *
 * O tabuleiro e uma grade de celulas desenhada com `Rectangle` do proprio
 * Phaser: um retangulo por segmento vivo, reaproveitado a cada passo em vez de
 * criado e destruido. Sem canvas separado, sem textura nova, sem dependencia.
 *
 * A cobra anda por TICK, nao por frame: a velocidade nao muda se o navegador
 * variar o frame rate, e o passo continua legivel. `Math.random` so aparece pra
 * sortear onde cai a comida — nada disso vai pro save.
 *
 * NAO toca em dinheiro nem em inventario — e so diversao.
 */

const CELULA = 13;
/** ms por passo; cai um pouco a cada comida, ate `MS_MINIMO` */
const MS_INICIAL = 170;
const MS_MINIMO = 80;
const TAMANHO_INICIAL = 4;

type Direcao = { x: number; y: number };

const CIMA: Direcao = { x: 0, y: -1 };
const BAIXO: Direcao = { x: 0, y: 1 };
const ESQUERDA: Direcao = { x: -1, y: 0 };
const DIREITA: Direcao = { x: 1, y: 0 };

export class Snake implements Vista {
  private aoTerminar: (pontos: number) => void;

  private cena!: Phaser.Scene;
  private colunas = 0;
  private linhas = 0;
  private origem = { x: 0, y: 0 };

  /** corpo, da CABECA pra cauda, em celulas */
  private corpo: { x: number; y: number }[] = [];
  private direcao: Direcao = DIREITA;
  /** direcao pedida pelo jogador, aplicada no proximo tick */
  private proxima: Direcao = DIREITA;
  private comida = { x: 0, y: 0 };
  private pontos = 0;
  private msPorPasso = MS_INICIAL;
  private proximoPasso = 0;
  private morto = false;

  private segmentos: Phaser.GameObjects.Rectangle[] = [];
  private fruta!: Phaser.GameObjects.Rectangle;
  private placar!: Phaser.GameObjects.Text;
  private raiz!: Phaser.GameObjects.Container;

  constructor(aoTerminar: (pontos: number) => void) {
    this.aoTerminar = aoTerminar;
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    this.cena = cena;
    this.raiz = raiz;

    const g = cena.add.graphics();
    raiz.add(g);

    // o tabuleiro ocupa o maximo de celulas INTEIRAS que couberem, e fica
    // centrado — sem isso sobraria meia celula numa borda
    const alturaUtil = area.h - 22;
    this.colunas = Math.floor(area.w / CELULA);
    this.linhas = Math.floor(alturaUtil / CELULA);
    const largura = this.colunas * CELULA;
    const altura = this.linhas * CELULA;
    this.origem = {
      x: area.x + Math.floor((area.w - largura) / 2),
      y: area.y + 20 + Math.floor((alturaUtil - altura) / 2),
    };

    caixa(g, { x: this.origem.x - 2, y: this.origem.y - 2, w: largura + 4, h: altura + 4 }, 0x0a0d13, PC.borda);

    this.placar = texto(cena, area.x, area.y, '', { fontSize: UI.tamanho });
    raiz.add(this.placar);

    this.fruta = cena.add.rectangle(0, 0, CELULA - 3, CELULA - 3, 0xd66a6a);
    raiz.add(this.fruta);

    this.reiniciar();
  }

  atualizar(): void {
    if (this.morto) return;
    const agora = this.cena.time.now;
    if (agora < this.proximoPasso) return;
    this.proximoPasso = agora + this.msPorPasso;
    this.passo();
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;
    if (this.morto) {
      if (k === 'e' || k === 'E' || k === 'Enter') {
        this.reiniciar();
        return true;
      }
      return false;
    }
    const mapa: Record<string, Direcao> = {
      ArrowUp: CIMA, w: CIMA, W: CIMA,
      ArrowDown: BAIXO, s: BAIXO, S: BAIXO,
      ArrowLeft: ESQUERDA, a: ESQUERDA, A: ESQUERDA,
      ArrowRight: DIREITA, d: DIREITA, D: DIREITA,
    };
    const d = mapa[k];
    if (!d) return false;
    // meia-volta mataria na hora, entao e ignorada — e o que todo snake faz
    if (d.x === -this.direcao.x && d.y === -this.direcao.y) return true;
    this.proxima = d;
    return true;
  }

  // -------------------------------------------------------------- jogo --

  private reiniciar(): void {
    this.corpo = [];
    const meioY = Math.floor(this.linhas / 2);
    for (let i = 0; i < TAMANHO_INICIAL; i++) {
      this.corpo.push({ x: Math.floor(this.colunas / 3) - i, y: meioY });
    }
    this.direcao = DIREITA;
    this.proxima = DIREITA;
    this.pontos = 0;
    this.msPorPasso = MS_INICIAL;
    this.morto = false;
    this.proximoPasso = this.cena.time.now + MS_INICIAL;
    this.sortearComida();
    this.desenhar();
  }

  private passo(): void {
    this.direcao = this.proxima;
    const cabeca = this.corpo[0];
    const nova = { x: cabeca.x + this.direcao.x, y: cabeca.y + this.direcao.y };

    // parede
    if (nova.x < 0 || nova.y < 0 || nova.x >= this.colunas || nova.y >= this.linhas) {
      this.morrer('Bateu na parede.');
      return;
    }
    // o proprio corpo. A CAUDA nao conta: ela sai da celula no mesmo passo em
    // que a cabeca entra, entao encostar nela e legitimo.
    const corpoSemCauda = this.corpo.slice(0, -1);
    if (corpoSemCauda.some((s) => s.x === nova.x && s.y === nova.y)) {
      this.morrer('Bateu em si mesma.');
      return;
    }

    this.corpo.unshift(nova);
    if (nova.x === this.comida.x && nova.y === this.comida.y) {
      this.pontos += 1;
      this.msPorPasso = Math.max(MS_MINIMO, this.msPorPasso - 5);
      this.sortearComida();
    } else {
      this.corpo.pop();
    }
    this.desenhar();
  }

  private morrer(motivo: string): void {
    this.morto = true;
    this.placar.setColor(PC.alerta);
    this.placar.setText(`${motivo}  ${this.pontos} ponto(s).  [E] joga de novo   [Esc] sai`);
    this.aoTerminar(this.pontos);
  }

  /** Sorteia uma celula livre. Com o tabuleiro quase cheio, desiste e empata. */
  private sortearComida(): void {
    const livres: { x: number; y: number }[] = [];
    for (let y = 0; y < this.linhas; y++) {
      for (let x = 0; x < this.colunas; x++) {
        if (!this.corpo.some((s) => s.x === x && s.y === y)) livres.push({ x, y });
      }
    }
    if (livres.length === 0) {
      this.morrer('Tabuleiro cheio!');
      return;
    }
    this.comida = livres[Math.floor(Math.random() * livres.length)];
  }

  private desenhar(): void {
    // um retangulo por segmento, reaproveitado entre passos
    while (this.segmentos.length < this.corpo.length) {
      const r = this.cena.add.rectangle(0, 0, CELULA - 2, CELULA - 2, 0x7fc98a);
      this.raiz.add(r);
      this.segmentos.push(r);
    }
    this.segmentos.forEach((r, i) => {
      const s = this.corpo[i];
      if (!s) {
        r.setVisible(false);
        return;
      }
      r.setVisible(true);
      r.setPosition(this.origem.x + s.x * CELULA + CELULA / 2, this.origem.y + s.y * CELULA + CELULA / 2);
      // a cabeca sai mais clara, pra dar pra ver pra onde a cobra vai
      r.setFillStyle(i === 0 ? 0xbfe8c4 : 0x7fc98a);
    });

    this.fruta.setPosition(
      this.origem.x + this.comida.x * CELULA + CELULA / 2,
      this.origem.y + this.comida.y * CELULA + CELULA / 2,
    );

    if (!this.morto) {
      this.placar.setColor(PC.textoFraco);
      this.placar.setText(`Pontos ${this.pontos}   [setas/WASD] virar   [Esc] sai`);
    }
  }
}

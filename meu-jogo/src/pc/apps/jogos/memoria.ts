import type Phaser from 'phaser';
import { CATALOGO_ITENS } from '../../../game/itens.ts';
import { PC, ajustarIcone, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';

/**
 * Jogo da Memoria — seis pares de icones, virados pra baixo.
 *
 * A arte das cartas sai do atlas `itens`, o mesmo do inventario e da DevStore:
 * sao icones que o jogador ja reconhece, e nao custa nenhum asset novo.
 *
 * Aqui `Math.random` E aceitavel, ao contrario dos geradores em `tools/` e do
 * preco dos itens: o embaralhamento nao precisa ser reproduzivel em outra
 * maquina, nao vai pro save e nada depende dele depois que a partida acaba. Uma
 * memoria que da sempre a mesma disposicao seria decorada em duas partidas.
 *
 * NAO toca em dinheiro nem em inventario — e so diversao.
 */

const PARES = 6;
const GRADE = { colunas: 4, linhas: 3, gap: 8 };
/** Quanto tempo um par errado fica visivel antes de desvirar. */
const ESPIAR = 700;

interface Carta {
  fundo: Phaser.GameObjects.Rectangle;
  icone: Phaser.GameObjects.Image;
  /** id do par; duas cartas com o mesmo valor casam */
  par: number;
  virada: boolean;
  casada: boolean;
}

export class JogoDaMemoria implements Vista {
  private aoTerminar: (tentativas: number, segundos: number) => void;

  private cena!: Phaser.Scene;
  private cartas: Carta[] = [];
  private abertas: number[] = [];
  private tentativas = 0;
  private casados = 0;
  private inicio = 0;
  private fim: number | null = null;
  /** momento (time.now) em que o par errado deve desvirar */
  private desvirarEm: number | null = null;

  private placar!: Phaser.GameObjects.Text;
  private cursor = 0;

  constructor(aoTerminar: (tentativas: number, segundos: number) => void) {
    this.aoTerminar = aoTerminar;
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    this.cena = cena;
    this.inicio = cena.time.now;
    this.fim = null;
    this.tentativas = 0;
    this.casados = 0;
    this.abertas = [];
    this.cursor = 0;

    // seis icones distintos do catalogo, sorteados a cada partida
    const candidatos = CATALOGO_ITENS.filter((i) => i.categoria === 'normal');
    const escolhidos = embaralhar(candidatos.map((c) => c.frame)).slice(0, PARES);
    const baralho = embaralhar(escolhidos.flatMap((frame, par) => [{ frame, par }, { frame, par }]));

    const largura = Math.floor((area.w - (GRADE.colunas - 1) * GRADE.gap) / GRADE.colunas);
    const altura = Math.floor((area.h - 26 - (GRADE.linhas - 1) * GRADE.gap) / GRADE.linhas);

    this.cartas = baralho.map((carta, i) => {
      const col = i % GRADE.colunas;
      const linha = Math.floor(i / GRADE.colunas);
      const x = area.x + col * (largura + GRADE.gap);
      const y = area.y + 22 + linha * (altura + GRADE.gap);

      const fundo = cena.add
        .rectangle(x + largura / 2, y + altura / 2, largura, altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const icone = cena.add
        .image(x + largura / 2, y + altura / 2, 'itens', carta.frame)
        .setVisible(false);
      ajustarIcone(icone, Math.min(largura, altura) - 14);
      fundo.on('pointerdown', () => this.escolher(i));
      raiz.add(fundo);
      raiz.add(icone);
      return { fundo, icone, par: carta.par, virada: false, casada: false };
    });

    this.placar = texto(cena, area.x, area.y, '', { fontSize: '10px' });
    raiz.add(this.placar);
    this.desenhar();
  }

  atualizar(): void {
    if (this.desvirarEm !== null && this.cena.time.now >= this.desvirarEm) {
      for (const i of this.abertas) {
        const c = this.cartas[i];
        if (!c.casada) c.virada = false;
      }
      this.abertas = [];
      this.desvirarEm = null;
      this.desenhar();
    }
    if (this.fim === null) this.desenharPlacar();
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const passo: Record<string, number> = {
      ArrowLeft: -1, a: -1, A: -1,
      ArrowRight: 1, d: 1, D: 1,
      ArrowUp: -GRADE.colunas, w: -GRADE.colunas, W: -GRADE.colunas,
      ArrowDown: GRADE.colunas, s: GRADE.colunas, S: GRADE.colunas,
    };
    if (passo[evento.key] !== undefined) {
      this.cursor = Math.min(this.cartas.length - 1, Math.max(0, this.cursor + passo[evento.key]));
      this.desenhar();
      return true;
    }
    if (evento.key === 'e' || evento.key === 'E' || evento.key === 'Enter') {
      this.escolher(this.cursor);
      return true;
    }
    return false;
  }

  private escolher(i: number): void {
    if (this.fim !== null) return;
    // com duas cartas abertas espera desvirar; senao daria pra "varrer" a mesa
    if (this.desvirarEm !== null) return;
    const carta = this.cartas[i];
    if (!carta || carta.virada || carta.casada) return;

    this.cursor = i;
    carta.virada = true;
    this.abertas.push(i);

    if (this.abertas.length === 2) {
      this.tentativas += 1;
      const [a, b] = this.abertas.map((k) => this.cartas[k]);
      if (a.par === b.par) {
        a.casada = true;
        b.casada = true;
        this.abertas = [];
        this.casados += 1;
        if (this.casados === PARES) this.vencer();
      } else {
        this.desvirarEm = this.cena.time.now + ESPIAR;
      }
    }
    this.desenhar();
  }

  private vencer(): void {
    this.fim = this.cena.time.now;
    const segundos = Math.round((this.fim - this.inicio) / 1000);
    this.desenharPlacar();
    this.aoTerminar(this.tentativas, segundos);
  }

  private desenhar(): void {
    this.cartas.forEach((c, i) => {
      const mostrando = c.virada || c.casada;
      c.icone.setVisible(mostrando);
      c.icone.setAlpha(c.casada ? 0.55 : 1);
      c.fundo.setFillStyle(c.casada ? 0x25452c : mostrando ? 0x2f3c52 : PC.painelClaro);
      const ativo = i === this.cursor && this.fim === null;
      c.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : c.casada ? 0x8ac47a : PC.borda);
    });
    this.desenharPlacar();
  }

  private desenharPlacar(): void {
    const agora = this.fim ?? this.cena.time.now;
    const segundos = Math.max(0, Math.round((agora - this.inicio) / 1000));
    if (this.fim !== null) {
      this.placar.setColor(PC.sucesso);
      this.placar.setText(
        `Todos os pares! ${this.tentativas} tentativas em ${segundos}s.   [Esc] volta`,
      );
      return;
    }
    this.placar.setColor(PC.textoFraco);
    this.placar.setText(
      `Pares ${this.casados}/${PARES}   Tentativas ${this.tentativas}   ${segundos}s` +
        `   [setas] mover  [E] virar  [Esc] sair`,
    );
  }
}

/** Fisher-Yates. Devolve um array novo; o de entrada nao e tocado. */
function embaralhar<T>(lista: readonly T[]): T[] {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

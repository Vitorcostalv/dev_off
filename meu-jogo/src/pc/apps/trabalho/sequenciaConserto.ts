import type Phaser from 'phaser';
import { UI } from '../../../game/config.ts';
import type { DefinicaoAparelho } from '../../../game/aparelhos.ts';
import { frameDaPeca, frameDoAparelho } from '../../../game/aparelhos.ts';
import { PC, ajustarIcone, caixa, encurtar, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';

/**
 * Minigame de CONSERTAR APARELHO: o aparelho pisca a ordem em que as pecas
 * entram, o jogador repete.
 *
 * O pagamento e PROPORCIONAL aos passos acertados (ver `pagamentoDeConserto` em
 * game/trabalhos.ts): sao 4 a 7 passos entre 4 botoes, entao chutar a sequencia
 * inteira tem chance de 1/256 no pior caso, e pagar pelo trabalho parcial nao
 * abre brecha pra chute.
 *
 * ---------------------------------------------------------------------------
 * GANCHO FUTURO — economia de pecas
 * ---------------------------------------------------------------------------
 * As quatro pecas aqui sao SO ilustracao: sao os botoes, e o painel de baixo
 * mostra as que ja foram encaixadas. Nao ha peca no inventario, nao ha peca que
 * falta, nao ha custo de peca. Quando isso entrar (ver o cabecalho de
 * game/aparelhos.ts), o minigame nao muda — o que muda e o aceitar da vaga,
 * que passa a exigir as pecas, e o concluir, que passa a consumi-las.
 */

type Fase = 'espera' | 'mostrando' | 'repetindo' | 'fim';

/** Quanto tempo cada peca fica acesa na demonstracao, e a pausa entre elas. */
const ACESO = 430;
const PAUSA = 170;

const BOTOES = { colunas: 2, largura: 132, altura: 80, gap: 8 };

export class SequenciaConserto implements Vista {
  private aparelho: DefinicaoAparelho;
  private sequencia: readonly number[];
  private msTotal: number;
  private aoTerminar: (acertos: number, total: number) => void;

  private cena!: Phaser.Scene;
  private fase: Fase = 'espera';
  /** indice do proximo passo, tanto na demonstracao quanto na repeticao */
  private passo = 0;
  private acertos = 0;
  /** marca de tempo (cena.time.now) do proximo evento da demonstracao */
  private proximoEm = 0;
  private aceso: number | null = null;
  private prazoFinal = 0;

  private botoes: {
    fundo: Phaser.GameObjects.Rectangle;
    icone: Phaser.GameObjects.Image;
    rotulo: Phaser.GameObjects.Text;
  }[] = [];
  private encaixes: Phaser.GameObjects.Rectangle[] = [];
  private encaixeIcones: Phaser.GameObjects.Image[] = [];
  private estadoTexto!: Phaser.GameObjects.Text;
  private barra!: Phaser.GameObjects.Rectangle;
  private barraLargura = 0;

  constructor(
    aparelho: DefinicaoAparelho,
    sequencia: readonly number[],
    msTotal: number,
    aoTerminar: (acertos: number, total: number) => void,
  ) {
    this.aparelho = aparelho;
    this.sequencia = sequencia;
    this.msTotal = msTotal;
    this.aoTerminar = aoTerminar;
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    this.cena = cena;
    const g = cena.add.graphics();
    raiz.add(g);

    // --- o aparelho, a esquerda ---
    const vitrine = { x: area.x, y: area.y, w: 170, h: 150 };
    caixa(g, vitrine, 0x0a0d13, PC.borda);
    const foto = cena.add.image(
      vitrine.x + vitrine.w / 2,
      vitrine.y + vitrine.h / 2,
      'aparelhos',
      frameDoAparelho(this.aparelho.id),
    );
    ajustarIcone(foto, Math.min(vitrine.w, vitrine.h) - 18);
    raiz.add(foto);
    raiz.add(
      texto(cena, vitrine.x + 6, vitrine.y + 4, this.aparelho.nome, {
        fontSize: '9px',
        color: PC.textoFraco,
      }),
    );

    // --- painel "pecas encaixadas": um quadradinho por passo da sequencia ---
    const yEncaixes = vitrine.y + vitrine.h + 6;
    const lado = Math.min(20, Math.floor((vitrine.w - (this.sequencia.length - 1) * 3) / this.sequencia.length));
    this.encaixes = [];
    this.encaixeIcones = [];
    this.sequencia.forEach((_, i) => {
      const x = vitrine.x + i * (lado + 3);
      const fundo = cena.add
        .rectangle(x + lado / 2, yEncaixes + lado / 2, lado, lado, 0x0a0d13)
        .setStrokeStyle(1, PC.borda);
      const icone = cena.add.image(x + lado / 2, yEncaixes + lado / 2, 'aparelhos').setVisible(false);
      raiz.add(fundo);
      raiz.add(icone);
      this.encaixes.push(fundo);
      this.encaixeIcones.push(icone);
    });

    // --- os quatro botoes de peca, a direita ---
    const x0 = area.x + vitrine.w + 14;
    this.botoes = this.aparelho.pecas.map((p, i) => {
      const col = i % BOTOES.colunas;
      const linha = Math.floor(i / BOTOES.colunas);
      const x = x0 + col * (BOTOES.largura + BOTOES.gap);
      const y = area.y + linha * (BOTOES.altura + BOTOES.gap);

      const fundo = cena.add
        .rectangle(x + BOTOES.largura / 2, y + BOTOES.altura / 2, BOTOES.largura, BOTOES.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const icone = cena.add.image(
        x + BOTOES.largura / 2,
        y + BOTOES.altura / 2 - 6,
        'aparelhos',
        frameDaPeca(this.aparelho.id, p.id),
      );
      ajustarIcone(icone, 46);
      const rotulo = cena.add
        .text(x + BOTOES.largura / 2, y + BOTOES.altura - 14, `${i + 1}. ${encurtar(p.nome, 14)}`, {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0);
      fundo.on('pointerdown', () => this.apertar(i));
      raiz.add(fundo);
      raiz.add(icone);
      raiz.add(rotulo);
      return { fundo, icone, rotulo };
    });

    // --- estado e barra de tempo ---
    const yEstado = area.y + 176;
    this.estadoTexto = texto(cena, x0, yEstado, '', { fontSize: '10px' });
    raiz.add(this.estadoTexto);

    this.barraLargura = area.x + area.w - x0;
    const fundoBarra = cena.add
      .rectangle(x0 + this.barraLargura / 2, yEstado + 20, this.barraLargura, 6, 0x0a0d13)
      .setStrokeStyle(1, PC.borda);
    this.barra = cena.add
      .rectangle(x0, yEstado + 20, this.barraLargura, 5, 0x8ac47a)
      .setOrigin(0, 0.5)
      .setVisible(false);
    raiz.add(fundoBarra);
    raiz.add(this.barra);

    this.desenharEstado();
  }

  atualizar(): void {
    const agora = this.cena.time.now;

    if (this.fase === 'mostrando') {
      if (agora < this.proximoEm) return;
      if (this.aceso !== null) {
        this.aceso = null;
        this.proximoEm = agora + PAUSA;
        this.pintarBotoes();
        if (this.passo >= this.sequencia.length) this.comecarRepeticao(agora);
        return;
      }
      if (this.passo >= this.sequencia.length) {
        this.comecarRepeticao(agora);
        return;
      }
      this.aceso = this.sequencia[this.passo];
      this.passo += 1;
      this.proximoEm = agora + ACESO;
      this.pintarBotoes();
      this.desenharEstado();
      return;
    }

    if (this.fase === 'repetindo') {
      const restante = Math.max(0, this.prazoFinal - agora);
      this.barra.setScale(restante / this.msTotal, 1);
      // a barra fica amarela e depois vermelha, pra pressa ser visivel
      const fracao = restante / this.msTotal;
      this.barra.setFillStyle(fracao > 0.5 ? 0x8ac47a : fracao > 0.25 ? 0xd6c46a : 0xc47a7a);
      if (restante <= 0) this.encerrar('O tempo acabou.');
    }
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;
    if (this.fase === 'espera' && (k === 'e' || k === 'E' || k === 'Enter')) {
      this.comecarDemonstracao();
      return true;
    }
    if (this.fase !== 'repetindo') return false;
    if (k >= '1' && k <= String(this.aparelho.pecas.length)) {
      this.apertar(Number(k) - 1);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------- fases --

  private comecarDemonstracao(): void {
    this.fase = 'mostrando';
    this.passo = 0;
    this.acertos = 0;
    this.aceso = null;
    this.proximoEm = this.cena.time.now + 400;
    this.barra.setVisible(false);
    this.desenharEstado();
  }

  private comecarRepeticao(agora: number): void {
    this.fase = 'repetindo';
    this.passo = 0;
    this.aceso = null;
    this.prazoFinal = agora + this.msTotal;
    this.barra.setVisible(true).setScale(1, 1);
    this.pintarBotoes();
    this.desenharEstado();
  }

  private apertar(indice: number): void {
    if (this.fase !== 'repetindo') {
      if (this.fase === 'espera') this.comecarDemonstracao();
      return;
    }
    const esperado = this.sequencia[this.passo];
    // pisca o botao apertado, certo ou errado
    this.aceso = indice;
    this.pintarBotoes();
    this.cena.time.delayedCall(140, () => {
      if (this.fase === 'repetindo' || this.fase === 'fim') {
        this.aceso = null;
        this.pintarBotoes();
      }
    });

    if (indice !== esperado) {
      this.encerrar(`Peca errada no passo ${this.passo + 1}.`);
      return;
    }

    this.marcarEncaixe(this.passo, indice);
    this.passo += 1;
    this.acertos += 1;
    if (this.acertos >= this.sequencia.length) {
      this.encerrar('Aparelho montado.');
      return;
    }
    this.desenharEstado();
  }

  private marcarEncaixe(passo: number, peca: number): void {
    const icone = this.encaixeIcones[passo];
    if (!icone) return;
    icone.setTexture('aparelhos', frameDaPeca(this.aparelho.id, this.aparelho.pecas[peca].id));
    ajustarIcone(icone, this.encaixes[passo].width - 4);
    icone.setVisible(true);
    this.encaixes[passo].setStrokeStyle(1, 0x8ac47a);
  }

  private encerrar(motivo: string): void {
    if (this.fase === 'fim') return;
    this.fase = 'fim';
    this.barra.setVisible(false);
    this.pintarBotoes();
    const completo = this.acertos >= this.sequencia.length;
    this.estadoTexto.setColor(completo ? PC.sucesso : PC.alerta);
    this.estadoTexto.setText(`${motivo}  ${this.acertos}/${this.sequencia.length} passos.`);
    this.aoTerminar(this.acertos, this.sequencia.length);
  }

  // ------------------------------------------------------------ desenho --

  private pintarBotoes(): void {
    this.botoes.forEach((b, i) => {
      const ligado = this.aceso === i;
      b.fundo.setFillStyle(ligado ? 0x3f6f8f : PC.painelClaro);
      b.fundo.setStrokeStyle(1, ligado ? 0xbfe2ff : PC.borda);
      b.rotulo.setColor(ligado ? PC.texto : PC.textoFraco);
      b.icone.setAlpha(this.fase === 'mostrando' && !ligado ? 0.45 : 1);
    });
  }

  private desenharEstado(): void {
    if (this.fase === 'espera') {
      this.estadoTexto.setColor(PC.textoFraco);
      this.estadoTexto.setText(
        `${this.sequencia.length} pecas em ordem. [E] comecar — depois repita com [1-4] ou clique.`,
      );
      return;
    }
    if (this.fase === 'mostrando') {
      this.estadoTexto.setColor(PC.destaque);
      this.estadoTexto.setText(`Memorize a ordem...  ${this.passo}/${this.sequencia.length}`);
      return;
    }
    if (this.fase === 'repetindo') {
      this.estadoTexto.setColor(PC.texto);
      this.estadoTexto.setText(`Sua vez: repita a ordem.  ${this.acertos}/${this.sequencia.length}`);
    }
  }
}

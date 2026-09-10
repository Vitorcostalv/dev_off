import type Phaser from 'phaser';
import type { DefinicaoAparelho } from '../../../game/aparelhos.ts';
import { frameDaPeca, frameDoAparelho } from '../../../game/aparelhos.ts';
import { PC, ajustarIcone, caixa, encurtar, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';
import { UI } from '../../../game/config';

/**
 * Minigame de CONSERTAR APARELHO: quebra-cabeca de montagem por arraste.
 *
 * O aparelho fica a esquerda, os slots vazios ao lado dele e os componentes
 * soltos numa bandeja embaixo. O jogador arrasta cada peca ate o slot dela:
 * encaixe certo GRUDA (a peca centraliza no slot e o contorno fica verde),
 * encaixe errado devolve a peca pra bandeja.
 *
 * Substitui de vez o minigame de sequencia tipo Simon que existia antes.
 *
 * ---------------------------------------------------------------------------
 * CADA PECA APARECE UMA VEZ SO
 * ---------------------------------------------------------------------------
 * `pecasDoConserto` devolve indices DISTINTOS de proposito. Num jogo de
 * memoria, repetir o mesmo componente na sequencia era so mais um passo; num
 * quebra-cabeca de encaixe, isso deixaria o tabuleiro impossivel — a peca ja
 * encaixada nao volta pra bandeja pra preencher o segundo slot igual.
 *
 * ---------------------------------------------------------------------------
 * DIFICULDADE E PAGAMENTO
 * ---------------------------------------------------------------------------
 * Mais pecas e menos tempo = vaga mais dificil e que paga mais (ver
 * `CONSERTO_POR_DIFICULDADE`). O pagamento e PROPORCIONAL as pecas encaixadas
 * dentro do tempo, entao parar no meio ainda vale alguma coisa e chutar nao
 * vale nada — arrastar a peca errada so custa tempo.
 *
 * A vista NAO paga: avisa `aoTerminar(acertos, total)` e o app decide.
 */

type Fase = 'aguardando' | 'jogando' | 'fim';

/**
 * Geometria. A area util do app tem cerca de 456 x 213 px (o app reserva os
 * ultimos 16 px pra propria linha de status), e TUDO daqui tem de caber dentro
 * dela: vitrine + bandeja + linha de estado + barra de tempo.
 */
const VITRINE = { w: 116, h: 104 };
const SLOT = { lado: 54, gap: 6 };
const BANDEJA = { altura: 68, lado: 44, gap: 6 };
/** Quantos caracteres o rotulo de um slot comporta sem invadir o slot vizinho. */
const LIMITE_ROTULO = 9;
/** Distancia maxima, em px, entre o centro da peca solta e o centro do slot. */
const RAIO_DE_ENCAIXE = 34;

interface PecaArrastavel {
  imagem: Phaser.GameObjects.Image;
  /** onde ela descansa na bandeja */
  origem: { x: number; y: number };
  /** indice em `aparelho.pecas` */
  indice: number;
  encaixada: boolean;
}

interface SlotDoAparelho {
  moldura: Phaser.GameObjects.Rectangle;
  rotulo: Phaser.GameObjects.Text;
  x: number;
  y: number;
  /** indice em `aparelho.pecas` que este slot aceita */
  indice: number;
  ocupado: boolean;
}

export class QuebraCabecaConserto implements Vista {
  private aparelho: DefinicaoAparelho;
  private indices: readonly number[];
  private msTotal: number;
  private mostrarRotulos: boolean;
  private aoTerminar: (acertos: number, total: number) => void;

  private cena!: Phaser.Scene;
  private fase: Fase = 'aguardando';
  private acertos = 0;
  private prazoFinal = 0;

  private slots: SlotDoAparelho[] = [];
  private pecas: PecaArrastavel[] = [];
  private arrastando: PecaArrastavel | null = null;

  private estado!: Phaser.GameObjects.Text;
  private barra!: Phaser.GameObjects.Rectangle;
  private barraLargura = 0;

  // guardados pra poder remover: `input.off` precisa da MESMA referencia de
  // funcao que entrou no `on`. Foi o que faltava na versao anterior, e o
  // listener de arraste continuava vivo depois de fechar o app.
  private aoComecarArraste = (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject): void => {
    if (this.fase !== 'jogando') return;
    const peca = this.pecas.find((p) => p.imagem === obj);
    if (!peca || peca.encaixada) return;
    this.arrastando = peca;
    peca.imagem.setDepth(1000).setAlpha(0.85);
  };

  private aoArrastar = (
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.GameObject,
    x: number,
    y: number,
  ): void => {
    if (!this.arrastando || this.arrastando.imagem !== obj) return;
    this.arrastando.imagem.setPosition(x, y);
  };

  private aoSoltar = (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject): void => {
    const peca = this.arrastando;
    this.arrastando = null;
    if (!peca || peca.imagem !== obj) return;

    peca.imagem.setDepth(0).setAlpha(1);
    const alvo = this.slotSob(peca.imagem.x, peca.imagem.y);

    if (alvo && !alvo.ocupado && alvo.indice === peca.indice) {
      this.encaixar(peca, alvo);
      return;
    }
    // errou o slot (ou soltou no vazio): volta pra bandeja. Nao ha punicao alem
    // do tempo gasto — e o que impede o chute de valer a pena sem transformar
    // um erro de mira em perda de pagamento.
    peca.imagem.setPosition(peca.origem.x, peca.origem.y);
    if (alvo && alvo.indice !== peca.indice) {
      this.avisar(`${this.aparelho.pecas[peca.indice].nome} nao e ai.`, PC.alerta);
    }
  };

  constructor(
    aparelho: DefinicaoAparelho,
    indices: readonly number[],
    msTotal: number,
    mostrarRotulos: boolean,
    aoTerminar: (acertos: number, total: number) => void,
  ) {
    this.aparelho = aparelho;
    this.indices = indices;
    this.msTotal = msTotal;
    this.mostrarRotulos = mostrarRotulos;
    this.aoTerminar = aoTerminar;
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    this.cena = cena;
    this.fase = 'aguardando';
    this.acertos = 0;
    this.slots = [];
    this.pecas = [];

    const g = cena.add.graphics();
    raiz.add(g);

    // --- o aparelho montado, como referencia do que se esta consertando ---
    const vitrine = { x: area.x, y: area.y, w: VITRINE.w, h: VITRINE.h };
    caixa(g, vitrine, 0x0a0d13, PC.borda);
    const foto = cena.add.image(
      vitrine.x + vitrine.w / 2,
      vitrine.y + vitrine.h / 2 + 5,
      'aparelhos',
      frameDoAparelho(this.aparelho.id),
    );
    ajustarIcone(foto, Math.min(vitrine.w, vitrine.h) - 24);
    raiz.add(foto);
    raiz.add(
      texto(cena, vitrine.x + 6, vitrine.y + 4, this.aparelho.nome, {
        fontSize: UI.tamanho,
        color: PC.textoFraco,
      }),
    );

    // --- os slots do contorno, numa faixa a direita da vitrine ---
    const xSlots = vitrine.x + vitrine.w + 12;
    const larguraSlots = area.x + area.w - xSlots;
    caixa(g, { x: xSlots, y: area.y, w: larguraSlots, h: VITRINE.h }, 0x0a0d13, PC.borda);
    raiz.add(
      texto(cena, xSlots + 6, area.y + 4, 'Encaixe aqui', {
        fontSize: UI.tamanho,
        color: PC.textoFraco,
      }),
    );

    const porLinha = Math.max(1, Math.floor((larguraSlots - 12) / (SLOT.lado + SLOT.gap)));
    this.indices.forEach((indice, i) => {
      const col = i % porLinha;
      const linha = Math.floor(i / porLinha);
      const cx = xSlots + 10 + col * (SLOT.lado + SLOT.gap) + SLOT.lado / 2;
      const cy = area.y + 24 + linha * (SLOT.lado + SLOT.gap + 10) + SLOT.lado / 2;

      const moldura = cena.add
        .rectangle(cx, cy, SLOT.lado, SLOT.lado, 0x141a24)
        .setStrokeStyle(1, PC.borda);
      // o nome do componente e a dica de ONDE cada peca vai. Na dificuldade
      // alta ele some, e ai o jogador tem de reconhecer a peca pela arte
      const rotulo = cena.add
        .text(cx, cy + SLOT.lado / 2 + 2, this.mostrarRotulos ? encurtar(this.aparelho.pecas[indice].nome, LIMITE_ROTULO) : '?', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0);
      raiz.add(moldura);
      raiz.add(rotulo);
      this.slots.push({ moldura, rotulo, x: cx, y: cy, indice, ocupado: false });
    });

    // --- a bandeja com as pecas soltas ---
    const yBandeja = area.y + VITRINE.h + 10;
    const bandeja = { x: area.x, y: yBandeja, w: area.w, h: BANDEJA.altura };
    caixa(g, bandeja, 0x0a0d13, PC.borda);
    raiz.add(
      texto(cena, bandeja.x + 6, bandeja.y + 4, 'Pecas soltas', {
        fontSize: UI.tamanho,
        color: PC.textoFraco,
      }),
    );

    // so as pecas que o tabuleiro pede vao pra bandeja: peca que nao tem slot
    // seria um distrator que nunca encaixa, e o jogador nao teria como saber
    this.indices.forEach((indice, i) => {
      const x = bandeja.x + 16 + i * (BANDEJA.lado + BANDEJA.gap) + BANDEJA.lado / 2;
      const y = bandeja.y + 22 + BANDEJA.lado / 2;
      const imagem = cena.add
        .image(x, y, 'aparelhos', frameDaPeca(this.aparelho.id, this.aparelho.pecas[indice].id))
        .setInteractive({ useHandCursor: true, draggable: true });
      ajustarIcone(imagem, BANDEJA.lado);
      raiz.add(imagem);
      this.pecas.push({ imagem, origem: { x, y }, indice, encaixada: false });
    });
    this.reordenarBandeja();

    cena.input.on('dragstart', this.aoComecarArraste);
    cena.input.on('drag', this.aoArrastar);
    cena.input.on('dragend', this.aoSoltar);

    // --- estado e barra de tempo ---
    const yEstado = bandeja.y + bandeja.h + 6;
    this.estado = texto(cena, area.x, yEstado, '', { fontSize: UI.tamanho, wordWrap: { width: area.w } });
    raiz.add(this.estado);

    this.barraLargura = area.w;
    raiz.add(
      cena.add
        .rectangle(area.x + this.barraLargura / 2, yEstado + 17, this.barraLargura, 6, 0x0a0d13)
        .setStrokeStyle(1, PC.borda),
    );
    this.barra = cena.add
      .rectangle(area.x, yEstado + 17, this.barraLargura, 4, 0x8ac47a)
      .setOrigin(0, 0.5)
      .setVisible(false);
    raiz.add(this.barra);

    this.avisar(
      `Arraste as ${this.indices.length} pecas da bandeja pros slots certos. [E] comecar.`,
      PC.textoFraco,
    );
  }

  /**
   * Reordena a bandeja pra ela NAO sair na mesma ordem dos slots — senao o
   * quebra-cabeca vira "arraste da esquerda pra direita" e nao pede
   * reconhecimento nenhum.
   *
   * Os slots saem na ordem sorteada por `pecasDoConserto`; a bandeja sai na
   * ordem NATURAL do aparelho (indice do componente). Sao duas ordens
   * diferentes e, por serem as duas permutacoes do mesmo conjunto, cada peca
   * cai numa posicao propria — nada de duas pecas empilhadas no mesmo ponto.
   * Continua deterministico: o sorteio ja aconteceu em `pecasDoConserto`.
   */
  private reordenarBandeja(): void {
    const posicoes = this.pecas.map((p) => ({ ...p.origem }));
    const ordem = [...this.pecas].sort((a, b) => a.indice - b.indice);
    ordem.forEach((peca, i) => {
      peca.origem = { ...posicoes[i] };
      peca.imagem.setPosition(peca.origem.x, peca.origem.y);
    });
  }

  private slotSob(x: number, y: number): SlotDoAparelho | null {
    let melhor: SlotDoAparelho | null = null;
    let menor = RAIO_DE_ENCAIXE;
    for (const slot of this.slots) {
      const d = Math.hypot(x - slot.x, y - slot.y);
      if (d < menor) {
        menor = d;
        melhor = slot;
      }
    }
    return melhor;
  }

  private encaixar(peca: PecaArrastavel, slot: SlotDoAparelho): void {
    peca.encaixada = true;
    slot.ocupado = true;
    this.acertos += 1;

    peca.imagem.setPosition(slot.x, slot.y);
    ajustarIcone(peca.imagem, SLOT.lado - 8);
    peca.imagem.disableInteractive();

    slot.moldura.setStrokeStyle(2, 0x8ac47a);
    slot.moldura.setFillStyle(0x182a1c);
    slot.rotulo.setText(encurtar(this.aparelho.pecas[slot.indice].nome, LIMITE_ROTULO)).setColor(PC.sucesso);

    if (this.acertos >= this.indices.length) {
      this.terminar('Aparelho montado!');
      return;
    }
    this.avisar(`Encaixou. ${this.acertos}/${this.indices.length} pecas.`, PC.sucesso);
  }

  atualizar(): void {
    if (this.fase !== 'jogando') return;
    const restante = Math.max(0, this.prazoFinal - this.cena.time.now);
    if (restante <= 0) {
      this.terminar('Tempo acabou.');
      return;
    }
    const fracao = restante / this.msTotal;
    this.barra.setScale(fracao, 1);
    this.barra.setFillStyle(fracao > 0.5 ? 0x8ac47a : fracao > 0.25 ? 0xd6c46a : 0xc47a7a);
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;
    if (this.fase === 'aguardando' && (k === 'e' || k === 'E' || k === 'Enter')) {
      this.comecar();
      return true;
    }
    return false;
  }

  /** Remove os listeners de arraste da CENA — eles nao vivem dentro de `raiz`. */
  aoFechar(): void {
    this.cena?.input.off('dragstart', this.aoComecarArraste);
    this.cena?.input.off('drag', this.aoArrastar);
    this.cena?.input.off('dragend', this.aoSoltar);
    this.arrastando = null;
  }

  private comecar(): void {
    this.fase = 'jogando';
    this.prazoFinal = this.cena.time.now + this.msTotal;
    this.barra.setVisible(true).setScale(1, 1);
    this.avisar(`Vai! 0/${this.indices.length} pecas.`, PC.texto);
  }

  private terminar(motivo: string): void {
    if (this.fase === 'fim') return;
    this.fase = 'fim';
    this.barra.setVisible(false);
    // solta as pecas que sobraram pra o tabuleiro parar de responder ao mouse
    this.pecas.forEach((p) => {
      if (!p.encaixada) p.imagem.disableInteractive();
    });

    const completo = this.acertos >= this.indices.length;
    this.avisar(
      `${motivo}  ${this.acertos}/${this.indices.length} pecas.`,
      completo ? PC.sucesso : PC.alerta,
    );
    this.aoTerminar(this.acertos, this.indices.length);
  }

  private avisar(mensagem: string, cor: string): void {
    this.estado.setColor(cor);
    this.estado.setText(mensagem);
  }
}

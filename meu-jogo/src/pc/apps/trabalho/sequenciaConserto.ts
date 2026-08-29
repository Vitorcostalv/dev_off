import type Phaser from 'phaser';
import type { DefinicaoAparelho } from '../../../game/aparelhos.ts';
import { frameDaPeca, frameDoAparelho } from '../../../game/aparelhos.ts';
import { PC, ajustarIcone, caixa, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';

/**
 * Minigame de CONSERTAR APARELHO: o jogador arrasta pecas da bandeja (tray)
 * para encaix-las no aparelho.
 *
 * Este e um quebra-cabeca de arrastar: o aparelho esta a esquerda, as pecas
 * disponiveis a direita numa bandeja. O jogador arrasta cada peca para seu
 * slot correto no aparelho. Encaixes corretos ficam verdes; encaixes errados
 * retornam a bandeja.
 *
 * O pagamento e PROPORCIONAL aos componentes encaixados corretamente
 * (ver `pagamentoDeConserto` em game/trabalhos.ts).
 */

type Fase = 'aguardando' | 'jogando' | 'fim';

// Tamanho e posicionamento dos componentes visuais
const TAMANHO_PECA = 56;
const TAMANHO_SLOT = 70;
const GAP = 8;

interface EstruturaPeca {
  /** imagem que o jogador arrasta */
  imagem: Phaser.GameObjects.Image;
  /** posicao x,y inicial na bandeja */
  posicaoInicial: { x: number; y: number };
  /** id da peca */
  idPeca: string;
  /** indice na lista de pecas do aparelho */
  indicePeca: number;
}

export class SequenciaConserto implements Vista {
  private aparelho: DefinicaoAparelho;
  private sequencia: readonly number[];
  private msTotal: number;
  private aoTerminar: (acertos: number, total: number) => void;

  private cena!: Phaser.Scene;
  private fase: Fase = 'aguardando';
  private acertos = 0;
  private prazoFinal = 0;

  /** slot para peca: usado para validar encaixes */
  private slotsPorIndice: Map<number, { slot: Phaser.GameObjects.Rectangle; visual: Phaser.GameObjects.Image }> =
    new Map();
  /** peca em arrastar */
  private pecaArrastada: {
    estrutura: EstruturaPeca;
    inicialX: number;
    inicialY: number;
    pointer: Phaser.Input.Pointer;
  } | null = null;

  private pecas: EstruturaPeca[] = [];
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

    // --- Aparelho a esquerda, foto grande ---
    const vitrineX = area.x;
    const vitrineY = area.y;
    const vitrineLargura = 170;
    const vitrineAltura = 150;
    const vitrine = { x: vitrineX, y: vitrineY, w: vitrineLargura, h: vitrineAltura };
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

    // --- Criar slots (2 colunas) para as pecas encaixarem ---
    const xSlots = vitrineX + vitrineLargura + 14;
    const ySlots = vitrineY;
    const numColunas = 2;
    this.sequencia.forEach((_indicePeca, i) => {
      const col = i % numColunas;
      const linha = Math.floor(i / numColunas);
      const xSlot = xSlots + col * (TAMANHO_SLOT + GAP);
      const ySlot = ySlots + linha * (TAMANHO_SLOT + GAP);

      const slot = cena.add
        .rectangle(xSlot + TAMANHO_SLOT / 2, ySlot + TAMANHO_SLOT / 2, TAMANHO_SLOT, TAMANHO_SLOT, 0x0a0d13)
        .setStrokeStyle(2, PC.borda);
      raiz.add(slot);

      const visual = cena.add
        .image(xSlot + TAMANHO_SLOT / 2, ySlot + TAMANHO_SLOT / 2, 'aparelhos')
        .setVisible(false);
      raiz.add(visual);

      this.slotsPorIndice.set(i, { slot, visual });
    });

    // --- Bandeja de pecas a direita ---
    const xBandeja = xSlots;
    const yBandeja = ySlots + Math.ceil(this.sequencia.length / numColunas) * (TAMANHO_SLOT + GAP) + 8;

    const panelBandeja = { x: xBandeja, y: yBandeja, w: area.x + area.w - xBandeja, h: 90 };
    caixa(g, panelBandeja, 0x0a0d13, PC.borda);
    raiz.add(
      texto(cena, panelBandeja.x + 6, panelBandeja.y + 4, 'Pecas disponiveis', {
        fontSize: '9px',
        color: PC.textoFraco,
      }),
    );

    // Arranjar as pecas na bandeja
    this.pecas = [];
    const numColBandeja = Math.min(4, this.aparelho.pecas.length);
    this.aparelho.pecas.forEach((peca, i) => {
      const col = i % numColBandeja;
      const linha = Math.floor(i / numColBandeja);
      const xPeca = panelBandeja.x + 8 + col * (TAMANHO_PECA + 4);
      const yPeca = panelBandeja.y + 22 + linha * (TAMANHO_PECA + 4);

      const img = cena.add
        .image(xPeca, yPeca, 'aparelhos', frameDaPeca(this.aparelho.id, peca.id))
        .setInteractive({ useHandCursor: true, draggable: true });
      ajustarIcone(img, TAMANHO_PECA - 6);
      raiz.add(img);

      this.pecas.push({
        imagem: img,
        posicaoInicial: { x: xPeca, y: yPeca },
        idPeca: peca.id,
        indicePeca: i,
      });
    });

    // --- Eventos de arrastar ---
    cena.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const estrutura = this.pecas.find((p) => p.imagem === obj);
      if (estrutura && this.fase === 'jogando') {
        this.pecaArrastada = {
          estrutura,
          inicialX: obj.x,
          inicialY: obj.y,
          pointer: _pointer,
        };
        obj.setDepth(1000);
        obj.setAlpha(0.8);
      }
    });

    cena.input.on('drag', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (this.pecaArrastada && obj === this.pecaArrastada.estrutura.imagem) {
        obj.x = pointer.x;
        obj.y = pointer.y;
      }
    });

    cena.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (!this.pecaArrastada) return;
      const estrutura = this.pecaArrastada.estrutura;

      // Procurar se o drop foi proximo de um slot
      let encaixouEmSlot = false;
      for (const [indiceSlot, { slot }] of this.slotsPorIndice) {
        // Verificar se a peca esta proxima do slot (distancia < 40)
        const dx = obj.x - slot.x;
        const dy = obj.y - slot.y;
        const distancia = Math.sqrt(dx * dx + dy * dy);

        if (distancia < 40) {
          // Verificar se a peca encaixa neste slot (o index da peca deve coincidir)
          const sequenciaEsperada = this.sequencia[indiceSlot];
          if (estrutura.indicePeca === sequenciaEsperada) {
            // Encaixe correto!
            encaixouEmSlot = true;
            this.encaixarPeca(estrutura, indiceSlot);
            this.acertos += 1;

            if (this.acertos >= this.sequencia.length) {
              this.terminarMinigame('Aparelho consertado!');
            } else {
              this.estadoTexto.setText(`Encaixando...  ${this.acertos}/${this.sequencia.length} pecas.`);
            }
            break;
          } else {
            // Tentou encaixar no lugar errado
            break;
          }
        }
      }

      // Se nao encaixou em lugar nenhum, retornar a bandeja
      if (!encaixouEmSlot) {
        obj.x = this.pecaArrastada.inicialX;
        obj.y = this.pecaArrastada.inicialY;
      }

      obj.setDepth(0);
      obj.setAlpha(1);
      this.pecaArrastada = null;
    });

    // --- Estado e barra de tempo ---
    const yEstado = panelBandeja.y + panelBandeja.h + 8;
    this.estadoTexto = texto(cena, xBandeja, yEstado, '', { fontSize: '10px' });
    raiz.add(this.estadoTexto);

    this.barraLargura = area.x + area.w - xBandeja;
    const fundoBarra = cena.add
      .rectangle(xBandeja + this.barraLargura / 2, yEstado + 20, this.barraLargura, 6, 0x0a0d13)
      .setStrokeStyle(1, PC.borda);
    this.barra = cena.add
      .rectangle(xBandeja, yEstado + 20, this.barraLargura, 5, 0x8ac47a)
      .setOrigin(0, 0.5)
      .setVisible(false);
    raiz.add(fundoBarra);
    raiz.add(this.barra);

    this.desenharEstado();

    // Usar um evento de update do Phaser para atualizar a cada frame
    cena.events.on('update', () => this.atualizar());
  }

  private encaixarPeca(estrutura: EstruturaPeca, indiceSlot: number): void {
    const { slot, visual } = this.slotsPorIndice.get(indiceSlot)!;
    const peca = this.aparelho.pecas[estrutura.indicePeca];

    // Mover a imagem da peca para o slot
    estrutura.imagem.x = slot.x;
    estrutura.imagem.y = slot.y;
    estrutura.imagem.setInteractive(false); // Nao pode mais arrastar esta peca
    estrutura.imagem.setAlpha(0.5); // Indicar que foi colocada

    // Mostrar a peca no slot tambem
    visual.setTexture('aparelhos', frameDaPeca(this.aparelho.id, peca.id));
    ajustarIcone(visual, TAMANHO_SLOT - 10);
    visual.setVisible(true);

    // Mudar a cor do slot para verde
    slot.setStrokeStyle(2, 0x8ac47a);
  }

  atualizar(): void {
    if (this.fase !== 'jogando') return;

    const agora = this.cena.time.now;
    const restante = Math.max(0, this.prazoFinal - agora);

    if (restante <= 0) {
      this.terminarMinigame('Tempo acabou.');
      return;
    }

    this.barra.setScale(restante / this.msTotal, 1);
    // Mudar cor conforme o tempo passa
    const fracao = restante / this.msTotal;
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

  private comecar(): void {
    this.fase = 'jogando';
    this.acertos = 0;
    this.prazoFinal = this.cena.time.now + this.msTotal;
    this.barra.setVisible(true).setScale(1, 1);

    // Habilitar interatividade de todas as pecas
    this.pecas.forEach((p) => {
      p.imagem.setInteractive({ useHandCursor: true, draggable: true });
    });

    this.desenharEstado();
  }

  private terminarMinigame(motivo: string): void {
    if (this.fase === 'fim') return;
    this.fase = 'fim';
    this.barra.setVisible(false);

    // Desligar o evento de update (opcional, pois a cena sera destruida)
    this.cena.events.off('update', () => this.atualizar());

    const completo = this.acertos >= this.sequencia.length;
    this.estadoTexto.setColor(completo ? PC.sucesso : PC.alerta);
    this.estadoTexto.setText(`${motivo}  ${this.acertos}/${this.sequencia.length} pecas.`);

    this.aoTerminar(this.acertos, this.sequencia.length);
  }

  private desenharEstado(): void {
    if (this.fase === 'aguardando') {
      this.estadoTexto.setColor(PC.textoFraco);
      this.estadoTexto.setText(
        `Arraste as ${this.sequencia.length} pecas da bandeja para encaix-las no aparelho. [E] comecar.`,
      );
      return;
    }
    if (this.fase === 'jogando') {
      this.estadoTexto.setColor(PC.texto);
      this.estadoTexto.setText(`Arraste as pecas...  ${this.acertos}/${this.sequencia.length} encaixadas.`);
    }
  }
}

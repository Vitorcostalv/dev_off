import Phaser from 'phaser';
import { estado } from '../game/estado';
import { tempoDoDia } from '../game/clima';
import type { DefinicaoTempo } from '../game/clima';

/**
 * CHUVA — a agua na tela, e o ceu fechado por tras dela.
 *
 * Ela e desenhada EM CIMA da camera, e nao no mundo: as gotas tem
 * `scrollFactor` zero e caem sobre a area visivel, com o veu escuro por baixo
 * delas. Amarrar a chuva ao mundo obrigaria a emitir gota no mapa inteiro (o
 * Mapa 3 tem 150x120 tiles) pra o jogador ver algumas dezenas.
 *
 * A camada so existe em MAPA EXTERNO. Dentro de predio nao chove; dentro dos
 * andares da represa, muito menos — e a Parte 38 pedindo que o tempo nunca
 * mexa num enigma.
 *
 * NAO ha poca no chao nem reacao da agua do rio. As duas eram opcionais na Parte
 * 36 e as duas pedem arte que a pasta nao tem: poça em tile de terra, de asfalto
 * e de grama sao tres tiles novos, e ondulacao de rio pede quadro de animacao.
 * O que ha e o brilho do veu, que ja da a leitura de piso molhado.
 */

/** Textura gerada da gota. Um risco fino, nao um pingo — chuva em queda borra. */
const TEXTURA_GOTA = 'gota-de-chuva';
const GOTA = { largura: 1, altura: 7 };

/** Profundidade: abaixo da HUD e acima de tudo que e mundo. */
const DEPTH_VEU = 88000;
const DEPTH_GOTA = 88001;

/** Inclinacao da chuva, em graus a partir da vertical. */
const INCLINACAO = 14;

export class CamadaChuva {
  private cena: Phaser.Scene;
  private veu: Phaser.GameObjects.Rectangle | null = null;
  private emissor: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private tempoAtual: DefinicaoTempo | null = null;
  /** dia observado no ultimo quadro, pra pegar a virada de meia-noite */
  private diaObservado = -1;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
  }

  montar(): void {
    const { width, height } = this.cena.scale;
    this.veu = this.cena.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_VEU);

    if (!this.cena.textures.exists(TEXTURA_GOTA)) {
      const g = this.cena.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xbfd4e8, 1);
      g.fillRect(0, 0, GOTA.largura, GOTA.altura);
      g.generateTexture(TEXTURA_GOTA, GOTA.largura, GOTA.altura);
      g.destroy();
    }

    // A faixa de emissao comeca ACIMA da tela e e mais larga que ela: com a
    // chuva inclinada, emitir so na largura visivel deixa a coluna a barlavento
    // sem gota nenhuma.
    const folga = height * Math.tan(Phaser.Math.DegToRad(INCLINACAO));
    this.emissor = this.cena.add.particles(0, 0, TEXTURA_GOTA, {
      x: { min: -folga, max: width + folga },
      y: -GOTA.altura * 2,
      lifespan: 1400,
      speedY: { min: 420, max: 640 },
      speedX: { min: 60, max: 130 },
      scaleY: { min: 1, max: 2.2 },
      alpha: { min: 0.25, max: 0.6 },
      quantity: 2,
      frequency: 30,
      blendMode: Phaser.BlendModes.NORMAL,
    });
    this.emissor.setScrollFactor(0).setDepth(DEPTH_GOTA);
    this.emissor.stop();
    this.aplicar(tempoDoDia(estado.dia));
  }

  destruir(): void {
    this.veu?.destroy();
    this.veu = null;
    this.emissor?.destroy();
    this.emissor = null;
    this.tempoAtual = null;
  }

  /**
   * Um passo. So faz alguma coisa na VIRADA DO DIA: o tempo e do dia inteiro, e
   * conferir a cada quadro seria conferir sessenta vezes por segundo uma coisa
   * que muda uma vez por dia de jogo.
   */
  atualizar(): void {
    if (this.diaObservado === estado.dia) return;
    this.diaObservado = estado.dia;
    this.aplicar(tempoDoDia(estado.dia));
  }

  private aplicar(tempo: DefinicaoTempo): void {
    if (this.tempoAtual?.id === tempo.id) return;
    this.tempoAtual = tempo;
    if (this.veu) {
      this.veu.setFillStyle(tempo.cor, tempo.escurecimento);
      this.veu.setVisible(tempo.escurecimento > 0);
    }
    if (!this.emissor) return;
    if (!tempo.chuva) {
      this.emissor.stop();
      this.emissor.setVisible(false);
      return;
    }
    this.emissor.setVisible(true);
    // `frequency` menor = mais gota. A chuva forte emite quase tres vezes mais
    // que a fraca, e as duas ficam bem abaixo do teto de particulas do Phaser.
    this.emissor.frequency = tempo.id === 'chuva_forte' ? 12 : 34;
    this.emissor.start();
  }

  /** O tempo desenhado agora, pro relatorio e pra conferencia. */
  get tempo(): DefinicaoTempo | null {
    return this.tempoAtual;
  }
}

import Phaser from 'phaser';
import { estado } from '../game/estado';
import { UI } from '../game/config';
import { escreverDiario } from '../game/diarioPessoal';
import { paisagemDaViagem, falaDeViagem } from '../game/viagem';

/**
 * VIAGEM DE ÔNIBUS — o trecho entre dois mapas, visto pela janela.
 *
 * Dura cerca de quinze segundos e é pulável a qualquer momento ([E] ou Esc):
 * quem já viu não precisa ver de novo, e quem quer ver não é interrompido. Não
 * há escolha, acerto, recompensa nem risco — é o tempo do caminho.
 */
export class ViagemScene extends Phaser.Scene {
  private destino = 'farm';
  private aoChegar: () => void = () => {};
  private tempo = 0;
  private duracao = 15000;
  private raiz!: Phaser.GameObjects.Container;
  private legenda!: Phaser.GameObjects.Text;
  private fala!: Phaser.GameObjects.Text;
  private trechos: string[] = [];
  private trecho = -1;

  constructor() { super('ViagemScene'); }

  create(dados: { destino: string; aoChegar: () => void }): void {
    this.destino = dados.destino;
    this.aoChegar = dados.aoChegar;
    this.tempo = 0;
    this.trecho = -1;
    this.trechos = paisagemDaViagem(this.destino, estado.clima.paraDia(estado.dia), estado.relogio.minutos);
    this.scene.pause('FarmScene');
    this.scene.pause('UIScene');
    this.scene.setVisible(false, 'UIScene');
    this.scene.bringToTop();
    this.raiz = this.add.container(0, 0);
    this.legenda = this.add.text(28, 196, '', { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: UI.texto, wordWrap: { width: 424 } }).setDepth(4);
    this.fala = this.add.text(28, 232, '', { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: UI.destaque, wordWrap: { width: 424 } }).setDepth(4);
    this.add.text(28, 254, '[E] descer no ponto seguinte · a viagem passa sozinha', { fontFamily: UI.fonte, fontSize: UI.tamanhoMiudo, color: UI.textoFraco }).setDepth(4);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['Enter', 'e', 'E', ' ', 'Escape'].includes(e.key)) this.chegar();
    });
    this.input.on('pointerdown', () => this.chegar());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners('keydown'));
    const companheiro = falaDeViagem(estado, this.destino);
    if (companheiro) this.fala.setText(companheiro);
  }

  update(_tempo: number, delta: number): void {
    this.tempo += delta;
    const passo = Math.min(this.trechos.length - 1, Math.floor((this.tempo / this.duracao) * this.trechos.length));
    if (passo !== this.trecho) {
      this.trecho = passo;
      this.legenda.setText(this.trechos[passo] ?? '');
    }
    this.desenhar();
    if (this.tempo >= this.duracao) this.chegar();
  }

  /** Janela, paisagem correndo e chuva — tudo em formas simples, sem asset novo. */
  private desenhar(): void {
    this.raiz.removeAll(true);
    const g = this.add.graphics();
    this.raiz.add(g);
    const noite = estado.relogio.minutos >= 19 * 60 || estado.relogio.minutos < 6 * 60;
    const clima = estado.clima.paraDia(estado.dia);
    const chovendo = clima === 'Chuva' || clima === 'Temporal';
    const ceu = noite ? 0x1b2533 : chovendo ? 0x5a6672 : 0x7e9db0;
    const chao = noite ? 0x1d2a26 : chovendo ? 0x4b5a4a : 0x6f8a5c;
    g.fillStyle(0x15181e).fillRect(0, 0, 480, 270);
    // moldura da janela do ônibus
    g.fillStyle(ceu).fillRect(30, 26, 420, 100);
    g.fillStyle(chao).fillRect(30, 126, 420, 58);
    const avanco = (this.tempo / 1000) * 120;
    // postes e árvores passando; a distância entre eles não muda, a posição sim
    for (let i = 0; i < 9; i++) {
      const x = 30 + ((i * 60 - avanco) % 480 + 480) % 480;
      if (x < 34 || x > 442) continue;
      g.fillStyle(noite ? 0x2a3340 : 0x4c5a49).fillRect(x, 96, 3, 34);
      g.fillStyle(noite ? 0x28313c : 0x39502f).fillEllipse(x + 1, 92, 22, 16);
      if (noite) g.fillStyle(0xd8c88c, .5).fillCircle(x + 1, 92, 4);
    }
    for (let i = 0; i < 6; i++) {
      const x = 30 + ((i * 95 - avanco * .4) % 520 + 520) % 520;
      if (x < 34 || x > 430) continue;
      g.fillStyle(noite ? 0x222c38 : 0x8a8f78).fillRect(x, 108, 26, 18);
    }
    if (chovendo) {
      g.lineStyle(1, 0xc4dce7, .45);
      for (let i = 0; i < 26; i++) {
        const x = 30 + ((i * 53 + this.tempo * .25) % 416);
        const y = 26 + ((i * 37 + this.tempo * .55) % 158);
        g.lineBetween(x, y, x - 3, y + 9);
      }
    }
    g.lineStyle(4, 0x2b3038).strokeRect(30, 26, 420, 158);
    g.fillStyle(0x2b3038).fillRect(236, 26, 6, 158);
    // interior: encosto do banco da frente
    g.fillStyle(0x3a3f46).fillRect(0, 184, 480, 86).fillStyle(0x30343a).fillRect(60, 190, 150, 46);
  }

  private chegar(): void {
    if (!this.scene.isActive()) return;
    escreverDiario(estado, `viagem:${estado.dia}`, 'Peguei o ônibus. A janela fez o trabalho de pensar por mim durante o trecho.');
    this.scene.stop();
    this.scene.setVisible(true, 'UIScene');
    this.scene.resume('UIScene');
    this.aoChegar();
  }
}

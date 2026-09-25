import Phaser from 'phaser';
import { PALETA_PERSONAGEM, quadroDaPose } from '../game/visualPersonagem';
import type { AparenciaPersonagem, PosePersonagem, DirecaoVisual } from '../game/visualPersonagem';

/** Paper doll vetorial em camadas. Os moradores autorais mantêm suas folhas. */
export class PersonagemModular extends Phaser.GameObjects.Container {
  readonly camadas: Phaser.GameObjects.Graphics[];
  readonly aparencia: AparenciaPersonagem;
  private assinatura = '';
  constructor(cena: Phaser.Scene, x: number, y: number, aparencia: AparenciaPersonagem, altura: number) {
    super(cena, x, y);
    this.aparencia = aparencia;
    this.camadas = Array.from({ length: 6 }, () => cena.add.graphics());
    this.add(this.camadas); this.setScale(altura / 48); cena.add.existing(this);
    this.pose('idle', 'down', 0);
  }
  pose(pose: PosePersonagem, direcao: DirecaoVisual, tempo: number, reduzido = false): void {
    const frame = quadroDaPose(pose, tempo, reduzido), chave = `${pose}:${direcao}:${frame}`;
    if (chave === this.assinatura) return; this.assinatura = chave;
    this.camadas.forEach(c => c.clear());
    const [sombra, pernas, corpo, rosto, cabelo, acessorio] = this.camadas as [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
    const a = this.aparencia, pal = PALETA_PERSONAGEM;
    const corPele = pal.pele[a.pele % pal.pele.length]!;
    const camisa = pal.camisa[a.camisa % pal.camisa.length]!;
    const andando = pose === 'walk' || pose === 'run', sentado = pose === 'sit' || pose === 'sleep';
    const passo = andando ? [0, 3, 0, -3][frame]! : 0;
    const largura = 12 + a.corpo * 2, perfil = direcao === 'left' || direcao === 'right';
    const w = perfil ? largura * .7 : largura;
    const dy = sentado ? 9 : andando && frame % 2 ? -1 : 0;
    const elipse = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cor: number) => g.fillStyle(cor).fillEllipse(x, y, w, h);
    const peca = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, cor: number) => {
      g.fillStyle(0x242a30).fillRoundedRect(x - .7, y - .7, w + 1.4, h + 1.4, 2);
      g.fillStyle(cor).fillRoundedRect(x, y, w, h, 2);
    };
    sombra.fillStyle(0x111920, .15).fillEllipse(0, -1, 23, 7).fillStyle(0x111920, .16).fillEllipse(0, -1, 15, 4);
    for (const lado of [-1, 1]) {
      const px = lado < 0 ? -6 : 1, py = sentado ? -12 : -16 + lado * passo;
      peca(pernas, px, py, 5, sentado ? 8 : 13, pal.calca[a.calca % pal.calca.length]!);
      peca(pernas, px - (direcao === 'left' ? 2 : 0), py + (sentado ? 7 : 12), 7, 3, 0x333638);
    }
    peca(corpo, -w / 2, -32 + dy, w, 18, camisa);
    corpo.fillStyle(0xffffff, .09).fillRoundedRect(-w / 2 + 1, -31 + dy, 3, 14, 1);
    corpo.lineStyle(.6, 0x29343b, .4).lineBetween(0, -28 + dy, 0, -15 + dy);
    const usando = ['hold', 'tool', 'combat', 'work', 'read', 'phone', 'eat'].includes(pose);
    for (const lado of [-1, 1]) {
      const ax = lado * (w / 2 + 2), ay = -25 + dy + (usando ? -3 : lado * passo * .45);
      peca(corpo, ax - 2, ay - 5, 4, usando ? 8 : 11, camisa);
      elipse(rosto, ax, ay + (usando ? 4 : 7), 4.5, 5, corPele);
    }
    elipse(rosto, 0, -38 + dy, perfil ? 12 : 15, 17, corPele);
    rosto.fillStyle(0xffffff, .12).fillEllipse(-3, -39 + dy, 5, 10);
    const corCabelo = pal.cabelo[a.cabelo % pal.cabelo.length]!;
    elipse(cabelo, 0, -44 + dy, 16, 10, corCabelo);
    if (direcao === 'up') elipse(cabelo, 0, -39 + dy, 15, 16, corCabelo);
    else {
      cabelo.fillStyle(corCabelo).fillRoundedRect(-8, -44 + dy, 3, a.cabelo % 2 ? 14 : 8, 2);
      const olhoX = direcao === 'left' ? -5 : direcao === 'right' ? 5 : -3;
      rosto.fillStyle(0x302f31).fillEllipse(olhoX, -38 + dy, 1.5, 2);
      if (!perfil) rosto.fillEllipse(3, -38 + dy, 1.5, 2);
      rosto.lineStyle(.6, 0x865f52).lineBetween(-1, -33 + dy, 2, -33 + dy);
    }
    if (a.acessorio === 'gorro') { elipse(acessorio, 0, -46 + dy, 17, 8, 0x8c6d61); peca(acessorio, -9, -45 + dy, 18, 3, 0x9d8172); }
    if (a.acessorio === 'oculos' && direcao === 'down') acessorio.lineStyle(.7, 0x444b50).strokeRect(-6, -40 + dy, 5, 4).strokeRect(1, -40 + dy, 5, 4).lineBetween(-1, -38 + dy, 1, -38 + dy);
    if (usando) {
      const x = direcao === 'left' ? -12 : 8;
      if (['read', 'hold', 'work'].includes(pose)) peca(acessorio, -7, -24 + dy, 14, 9, pose === 'read' ? 0xb9ad8f : 0x8e9a98);
      else if (pose === 'phone') peca(acessorio, x, -39 + dy, 4, 8, 0x354b59);
      else if (pose === 'eat') peca(acessorio, x, -30 + dy, 5, 6, 0xbcb09c);
      else { acessorio.lineStyle(2, 0xb6b8a9).lineBetween(x, -20 + dy, x + (frame % 2 ? 5 : 0), -35 + dy); }
    }
    // Lean/sleep são poses de apresentação, sem alterar a âncora dos pés.
    for (const camada of this.camadas.slice(1)) camada.setRotation(pose === 'lean' ? -.10 : pose === 'sleep' ? .16 : 0);
  }
}

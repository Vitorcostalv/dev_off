import Phaser from 'phaser';
import { intensidadeNoturna } from '../game/clima';
import type { Clima } from '../game/clima';
import type { Settings } from '../game/settings';
import { estado } from '../game/estado';
/** Efeitos limitados à viewport; a vegetação é atualizada só na virada da estação. */
export class AmbienteMundo {
  private luz: Phaser.GameObjects.Rectangle;
  private efeitos: Phaser.GameObjects.Graphics;
  private plantas: Phaser.GameObjects.Image[] = [];
  private estacao = -1;
  private tempo = 0;
  private externo: boolean;
  private regiao: Phaser.GameObjects.Rectangle;
  private pocos: Phaser.GameObjects.Graphics;
  private cena: Phaser.Scene;
  private mapa: string;
  constructor(cena: Phaser.Scene, externo: boolean, mapa = '') {
    this.cena = cena; this.mapa = mapa;
    this.externo = externo;
    const cor = mapa.startsWith('represa') ? 0x416875 : mapa === 'rural' ? 0x788260 : mapa === 'bairro' ? 0x617a8d : ['farm', 'bar', 'oficina', 'biblioteca'].includes(mapa) ? 0xa78b65 : 0x71828d;
    this.regiao = cena.add.rectangle(0, 0, cena.scale.width, cena.scale.height, cor, .045).setOrigin(0).setScrollFactor(0).setDepth(849999);
    this.pocos = cena.add.graphics().setDepth(.5);
    this.luz = cena.add.rectangle(0, 0, cena.scale.width, cena.scale.height, 0x152134).setOrigin(0).setScrollFactor(0).setDepth(850000);
    this.efeitos = cena.add.graphics().setScrollFactor(0).setDepth(850001);
  }
  vegetacao(sprite: Phaser.GameObjects.Image): void { if (this.externo) this.plantas.push(sprite); }
  atualizar(delta: number, minuto: number, estacao: number, clima: Clima, opcoes: Settings): void {
    if (estacao !== this.estacao) {
      this.estacao = estacao; const tint = [0xffffff, 0xffedba, 0xe5ba86, 0xb8cdd1][estacao];
      this.plantas.forEach(p => p.setTint(tint));
    }
    this.luz.setAlpha(this.externo ? intensidadeNoturna(minuto) * 0.28 + (['Chuva', 'Temporal', 'Nublado'].includes(clima) ? 0.08 : 0) : 0);
    this.efeitos.clear();
    this.regiao.setAlpha(opcoes.altoContraste ? 0 : estado.worldEvents.ativa('campanha:cena:epilogo') ? .025 : .045);
    this.pocos.clear();
    if (this.externo) {
      const chovendo = clima === 'Chuva' || clima === 'Temporal', agora = estado.dia * 1440 + minuto;
      const flag = `visual:chuva:${this.mapa}`;
      if (chovendo) estado.worldEvents.definir(flag, agora);
      const ultima = estado.worldEvents.obter(flag);
      const umidade = typeof ultima === 'number' ? Math.max(0, 1 - Math.max(0, agora - ultima) / 180) : 0;
      if (umidade > 0 && opcoes.qualidade !== 'baixa') {
        const v = this.cena.cameras.main.worldView;
        // Padrão no chão em coordenadas de mundo, não preso à tela; paredes e móveis o cobrem.
        for (let gx = Math.floor(v.x / 110); gx <= Math.ceil(v.right / 110); gx++) {
          for (let gy = Math.floor(v.y / 100); gy <= Math.ceil(v.bottom / 100); gy++) {
            const x = gx * 110 + ((gy * 17) % 39), y = gy * 100 + ((gx * 23) % 31);
            this.pocos.fillStyle(0x203c49, umidade * .17).fillEllipse(x, y, 28 + ((gx + gy) % 3) * 4, 8);
            this.pocos.lineStyle(1, 0xadb9b5, umidade * .14).lineBetween(x - 8, y + 1, x + 5, y + 1);
          }
        }
      }
    }
    if (!this.externo || !opcoes.particulas || opcoes.movimentoReduzido) return;
    this.tempo += Math.min(100, delta) / 1000;
    const quantidade = opcoes.qualidade === 'baixa' ? 18 : opcoes.qualidade === 'alta' ? 64 : 36;
    if (clima === 'Chuva' || clima === 'Temporal') {
      this.efeitos.lineStyle(1, 0xc4dce7, 0.38);
      for (let i = 0; i < quantidade; i++) {
        const x = (i * 137 + this.tempo * 27) % 480, y = (i * 83 + this.tempo * 180) % 270;
        this.efeitos.lineBetween(x, y, x - 2, y + 7);
      }
    } else if (clima === 'Vento' || estacao === 2) {
      this.efeitos.fillStyle(0xd3ae75, 0.6);
      for (let i = 0; i < 8; i++) this.efeitos.fillRect((i * 113 + this.tempo * 24) % 480, (i * 71 + Math.sin(this.tempo + i) * 5) % 270, 2, 1);
    } else if (clima === 'Neblina') {
      this.efeitos.fillStyle(0xc4d2d4, 0.06);
      for (let i = 0; i < 4; i++) this.efeitos.fillEllipse((i * 157 + this.tempo * 5) % 600 - 60, 40 + i * 60, 280, 55);
    }
  }
}

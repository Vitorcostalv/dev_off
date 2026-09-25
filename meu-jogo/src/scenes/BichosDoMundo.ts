import Phaser from 'phaser';
import { estado } from '../game/estado';
import { FAUNA, faunaDoMomento, reconhecer, textoDoAnimal } from '../game/fauna';
import type { AnimalDeRua, EspecieFauna } from '../game/fauna';
import { companhia, companhiaNoMapa, lugarDoDescanso, alcanceDaCompanhia, pretendenteNoMapa } from '../game/companhia';
import type { Clima } from '../game/clima';
import type { Interagivel } from '../game/tipos';
import { texturaRadial } from './luzESombra';

interface Desenhado { animal: AnimalDeRua; conta: Phaser.GameObjects.Container; alvo: Interagivel; sombra: Phaser.GameObjects.Image[] }

/**
 * BICHOS DA CIDADE — fauna de rua e animal de companhia no mesmo lugar, porque
 * os dois são a mesma coisa para a cena: uma silhueta pequena que anda pouco,
 * ordena por Y e tem sombra de contato. A decisão de QUEM está presente vem de
 * `fauna.ts`/`companhia.ts`; aqui só se desenha e se move.
 *
 * A forma de cada espécie é desenhada UMA vez em coordenadas locais; o quadro
 * seguinte apenas move o container. Bando (pássaro, sapo, vagalume) desenha os
 * indivíduos no mesmo container, espalhados de forma determinística.
 */
export class BichosDoMundo {
  private cena: Phaser.Scene;
  private tile: number;
  private itens: Desenhado[] = [];
  private bicho: { conta: Phaser.GameObjects.Container; alvo: Interagivel; sombra: Phaser.GameObjects.Image } | null = null;
  private tempo = 0;
  constructor(cena: Phaser.Scene, tile: number) { this.cena = cena; this.tile = tile; }

  /** Cria as silhuetas do mapa e devolve os alvos de interação (tipo `bicho`). */
  montar(mapa: string): Interagivel[] {
    const alvos: Interagivel[] = [];
    for (const animal of FAUNA.filter(a => a.mapa === mapa)) {
      const conta = this.silhueta(animal.especie, animal.quantidade ?? 1, animal.id);
      conta.setVisible(false);
      const alvo: Interagivel = { id: `bicho:${animal.id}`, tipo: 'bicho', rotulo: 'Observar',
        x: animal.tile.x * this.tile, y: animal.tile.y * this.tile, props: { animal: animal.id, presente: false } };
      this.itens.push({ animal, conta, alvo, sombra: this.sombras(animal.quantidade ?? 1, animal.especie) });
      alvos.push(alvo);
    }
    const meu = companhia(estado);
    if (meu && companhiaNoMapa(estado, mapa)) {
      const conta = this.silhueta(meu.especie, 1, meu.id);
      const alvo: Interagivel = { id: 'bicho:companhia', tipo: 'bicho', rotulo: meu.nome,
        x: 0, y: 0, props: { companhia: true, presente: false } };
      this.bicho = { conta, alvo, sombra: this.sombras(1, meu.especie)[0]! };
      alvos.push(alvo);
    }
    const pretendente = pretendenteNoMapa(estado, mapa);
    if (pretendente) {
      alvos.push({ id: 'bicho:pretendente', tipo: 'bicho', rotulo: 'Aproximar-se',
        x: pretendente.tile.x * this.tile, y: pretendente.tile.y * this.tile, props: { pretendente: pretendente.id, presente: true } });
    }
    return alvos;
  }

  private sombras(quantidade: number, especie: EspecieFauna): Phaser.GameObjects.Image[] {
    if (especie === 'passaro' || especie === 'vagalume') return [];
    return Array.from({ length: quantidade }, () => this.cena.add.image(0, 0, texturaRadial(this.cena))
      .setDisplaySize(this.tile * .45, this.tile * .18).setTint(0x08121c).setAlpha(.5).setVisible(false));
  }

  private silhueta(especie: EspecieFauna, quantidade: number, semente: string): Phaser.GameObjects.Container {
    const conta = this.cena.add.container(0, 0);
    const base = this.tile / 32;
    const seed = semente.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
    for (let i = 0; i < quantidade; i++) {
      const g = this.cena.add.graphics();
      const dx = quantidade === 1 ? 0 : ((seed * (i + 3)) % 17 - 8) * base * 1.6;
      const dy = quantidade === 1 ? 0 : ((seed * (i + 7)) % 11 - 5) * base * 1.1;
      g.setPosition(dx, dy);
      if (especie === 'gato') {
        g.fillStyle(0x4a463f).fillEllipse(0, -4 * base, 13 * base, 7 * base);
        g.fillEllipse(6 * base, -7 * base, 5 * base, 5 * base);
        g.fillTriangle(4 * base, -9 * base, 6 * base, -12 * base, 8 * base, -9 * base);
        g.lineStyle(1.4 * base, 0x4a463f).beginPath().moveTo(-6 * base, -5 * base);
        g.lineTo(-10 * base, -9 * base); g.strokePath();
      } else if (especie === 'cachorro') {
        g.fillStyle(0x3b352f).fillEllipse(0, -5 * base, 17 * base, 9 * base);
        g.fillEllipse(8 * base, -9 * base, 7 * base, 6 * base);
        g.fillStyle(0x2c2721).fillRect(-9 * base, -4 * base, 2 * base, 4 * base).fillRect(6 * base, -4 * base, 2 * base, 4 * base);
        g.lineStyle(1.6 * base, 0x3b352f).beginPath().moveTo(-8 * base, -7 * base);
        g.lineTo(-12 * base, -10 * base); g.strokePath();
      } else if (especie === 'passaro') {
        g.fillStyle(0x51473c).fillEllipse(0, -2 * base, 5 * base, 4 * base);
        g.fillStyle(0x6d6154).fillEllipse(2 * base, -4 * base, 3 * base, 3 * base);
      } else if (especie === 'sapo') {
        g.fillStyle(0x4c5b44).fillEllipse(0, -2 * base, 8 * base, 5 * base);
        g.fillStyle(0x374331).fillEllipse(-2 * base, -4 * base, 2 * base, 2 * base).fillEllipse(2 * base, -4 * base, 2 * base, 2 * base);
      } else {
        g.fillStyle(0xd7e08a, .85).fillCircle(0, -6 * base, 1.6 * base);
        g.fillStyle(0xd7e08a, .22).fillCircle(0, -6 * base, 4 * base);
      }
      conta.add(g);
    }
    return conta;
  }

  /** Um encontro por dia por bicho, contado por aproximação, não por diálogo. */
  private aproximou(animal: AnimalDeRua, x: number, y: number, jogador: { x: number; y: number }): void {
    if (Math.hypot(x - jogador.x, y - jogador.y) < this.tile * 2.5) reconhecer(estado, animal.id);
  }

  atualizar(delta: number, mapa: string, minuto: number, clima: Clima, estacao: number, jogador: { x: number; y: number }, parado: boolean): void {
    if (!parado) this.tempo += Math.min(100, delta) / 1000;
    const presentes = new Set(faunaDoMomento(mapa, estado.dia, minuto, clima, estacao).map(a => a.id));
    const reduzido = estado.preferencias.valores.movimentoReduzido;
    for (const item of this.itens) {
      const visivel = presentes.has(item.animal.id);
      item.alvo.props.presente = visivel;
      item.conta.setVisible(visivel);
      item.sombra.forEach(s => s.setVisible(visivel));
      if (!visivel) continue;
      const fase = this.tempo * (item.animal.especie === 'passaro' ? .6 : .25) + item.animal.id.length;
      const raio = reduzido ? 0 : item.animal.raio;
      const x = (item.animal.tile.x + Math.sin(fase) * raio) * this.tile;
      const y = (item.animal.tile.y + Math.cos(fase * .7) * raio * .35) * this.tile;
      item.conta.setPosition(x, y).setDepth(y);
      item.conta.setScale(Math.cos(fase) < 0 ? -1 : 1, 1);
      if (item.animal.especie === 'vagalume') item.conta.setAlpha(reduzido ? .8 : .45 + Math.abs(Math.sin(this.tempo * 1.7)) * .55);
      item.sombra.forEach((s, i) => {
        const filho = item.conta.list[i] as Phaser.GameObjects.Graphics | undefined;
        s.setPosition(x + (filho?.x ?? 0), y + (filho?.y ?? 0) - 1).setDepth(y - .1);
      });
      item.alvo.x = x; item.alvo.y = y;
      this.aproximou(item.animal, x, y, jogador);
    }
    this.atualizarCompanhia(mapa, clima, jogador, reduzido);
  }

  private atualizarCompanhia(mapa: string, clima: Clima, jogador: { x: number; y: number }, reduzido: boolean): void {
    if (!this.bicho) return;
    const presente = companhiaNoMapa(estado, mapa);
    this.bicho.alvo.props.presente = presente;
    this.bicho.conta.setVisible(presente);
    this.bicho.sombra.setVisible(presente);
    if (!presente) return;
    let destino: { x: number; y: number };
    if (mapa === 'oficina') {
      const lugar = lugarDoDescanso(estado, clima);
      destino = { x: lugar.tile.x * this.tile, y: lugar.tile.y * this.tile };
    } else {
      // Fora de casa ele acompanha até o limite e espera ali, na direção do jogador.
      const porta = { x: 80 * this.tile, y: 39 * this.tile };
      const alcance = alcanceDaCompanhia(clima) * this.tile;
      const dx = jogador.x - porta.x, dy = jogador.y - porta.y;
      const distancia = Math.hypot(dx, dy) || 1;
      const passo = Math.min(distancia - this.tile * .8, alcance) / distancia;
      destino = { x: porta.x + dx * Math.max(0, passo), y: porta.y + dy * Math.max(0, passo) };
    }
    const atual = this.bicho.conta;
    const suave = reduzido ? 1 : .08;
    const x = atual.visible && atual.x !== 0 ? Phaser.Math.Linear(atual.x, destino.x, suave) : destino.x;
    const y = atual.visible && atual.y !== 0 ? Phaser.Math.Linear(atual.y, destino.y, suave) : destino.y;
    atual.setPosition(x, y).setDepth(y).setScale(destino.x < x - 1 ? -1 : 1, 1);
    this.bicho.sombra.setPosition(x, y - 1).setDepth(y - .1);
    this.bicho.alvo.x = x; this.bicho.alvo.y = y;
  }

  /** Texto de observação; o reconhecimento em si acontece pela aproximação. */
  textoDe(id: string): string {
    const animal = FAUNA.find(a => a.id === id);
    if (!animal) return '';
    reconhecer(estado, animal.id);
    return textoDoAnimal(estado, animal);
  }
}

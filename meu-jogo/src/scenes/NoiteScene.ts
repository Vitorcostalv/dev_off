import Phaser from 'phaser';
import { estado } from '../game/estado';
import { controles } from '../game/InputRouter';
import { UI } from '../game/config';
import { escreverDiario } from '../game/diarioPessoal';
import { carregarMobiliaNarrativa, movelNarrativo, pessoaNarrativa } from './arteNarrativa';
import type { FarmScene } from './FarmScene';
import type { UIScene } from './UIScene';

const ESCOLHAS = ['Levantar', 'Beber água', 'Olhar o celular', 'Sentar na varanda', 'Trabalhar', 'Tentar dormir'];
const TEXTOS = ['Os pés encontram o chão antes de eu saber o que fazer com a noite.', 'O copo está frio. Bebo devagar, ouvindo a torneira parar de pingar.', 'Nenhuma mensagem exige resposta. Apago a tela e ainda vejo o retângulo de luz.', 'O bairro não está vazio. Uma janela acesa, um cachorro longe. Posso ficar sentado.', 'A bancada tem coisas que sei resolver. Isso não significa que precisem ser resolvidas agora.', 'Ajeito o travesseiro. Não preciso vencer a noite para descansar.'];
const SONHO = [
  ['Apartamento', 'A porta da cozinha abre para o escritório. Eu tinha certeza de que conhecia o caminho.'],
  ['Escritório', 'As mesas terminam na calçada da minha rua. Um telefone toca num lugar que não consigo localizar.'],
  ['Rua', 'A luz da oficina continua acesa. A janela está do lado de dentro da sala.'],
  ['Casa', 'Atrás da porta do quarto, o corredor da represa. O chão continua o mesmo.'],
  ['Represa', 'O corredor acaba na minha cama. Não preciso atravessar outra porta.'],
] as const;
/** Interlúdios opcionais; nenhum erro, penalidade ou medidor psicológico. */
export class NoiteScene extends Phaser.Scene {
  private tipo: 'sonho' | 'insonia' = 'insonia';
  private etapa = 0; private escolha = 0; private x = 100;
  private raiz!: Phaser.GameObjects.Container;
  private pessoa!: Phaser.GameObjects.Image;
  private descricao!: Phaser.GameObjects.Text;
  private dormirDepois: () => void = () => {};
  constructor() { super('NoiteScene'); }
  preload(): void { carregarMobiliaNarrativa(this); }
  create(dados: { tipo: 'sonho' | 'insonia'; aoDormir: () => void }): void {
    this.tipo = dados.tipo; this.dormirDepois = dados.aoDormir; this.etapa = 0; this.escolha = 0; this.x = 100;
    this.scene.pause('FarmScene'); this.scene.pause('UIScene'); this.scene.setVisible(false, 'UIScene'); this.scene.bringToTop();
    this.raiz = this.add.container(0, 0); this.pessoa = pessoaNarrativa(this, this.x, 168).setDepth(2);
    this.descricao = this.add.text(24, 187, '', { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: UI.texto, wordWrap: { width: 432 } }).setDepth(3);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') this.finalizar(false);
      else if (['ArrowUp', 'ArrowDown'].includes(e.key)) { this.escolha = (this.escolha + (e.key === 'ArrowUp' ? -1 : 1) + ESCOLHAS.length) % ESCOLHAS.length; this.desenhar(); }
      else if (['Enter', 'e', 'E', ' '].includes(e.key)) this.acionar();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners('keydown'));
    this.desenhar();
  }
  private desenhar(): void {
    this.raiz.removeAll(true); const g = this.add.graphics(); this.raiz.add(g);
    g.fillStyle(0x111c25).fillRect(0, 0, 480, 270).fillStyle([0x3c4344, 0x34434c, 0x334b45, 0x494338, 0x293b43][this.etapa]!).fillRect(20, 40, 440, 133);
    g.lineStyle(1, 0x758381, .3); for (let y = 85; y < 174; y += 14) g.lineBetween(20, y, 460, y);
    const movel = movelNarrativo(this, this.etapa % 2 ? 'bancada_trabalho' : 'sofa_creme', 260, 143, 85, 61); if (movel) this.raiz.add(movel);
    g.fillStyle(0x10171e).fillRect(413, 69, 29, 96);
    this.raiz.add(this.add.text(24, 18, this.tipo === 'insonia' ? '02:47 · A casa está quieta' : `Sonho · ${SONHO[this.etapa]![0]}`, { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: UI.texto }));
    if (this.tipo === 'insonia') {
      this.pessoa.setVisible(false);
      ESCOLHAS.forEach((texto, i) => { this.raiz.add(this.add.text(38, 49 + i * 21, `${i === this.escolha ? '›' : ' '} ${texto}`, { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: i === this.escolha ? UI.destaque : UI.texto }).setInteractive().on('pointerdown', () => { this.escolha = i; this.acionar(); })); });
      this.descricao.setText('Setas: escolher · Enter/A: continuar · Esc/B: dormir');
    } else {
      this.pessoa.setVisible(true); this.descricao.setText(SONHO[this.etapa]![1]);
      this.raiz.add(this.add.text(24, 247, 'D/seta direita: caminhar · Enter/A: atravessar · Esc/B: acordar', { fontFamily: UI.fonte, fontSize: UI.tamanhoMiudo, color: UI.textoFraco }).setInteractive().on('pointerdown', () => this.acionar()));
    }
  }
  private acionar(): void {
    if (this.tipo === 'sonho') {
      if (++this.etapa >= SONHO.length) { escreverDiario(estado, `sonho:${estado.dia}`, 'A porta do apartamento dava para a rua da oficina. Quando acordei, a casa tinha suas próprias paredes outra vez.'); this.finalizar(false); }
      else { this.x = 100; this.desenhar(); } return;
    }
    if ([0, 4, 5].includes(this.escolha)) { this.finalizar(this.escolha !== 5, this.escolha === 4); return; }
    estado.worldEvents.definir(`noite:escolha:${estado.dia}:${this.escolha}`, true);
    escreverDiario(estado, `insonia:${estado.dia}:${this.escolha}`, TEXTOS[this.escolha]!);
    this.descricao.setText(TEXTOS[this.escolha]!);
    (this.scene.get('FarmScene') as FarmScene).salvarJogo();
  }
  private finalizar(levantar: boolean, trabalhar = false): void {
    estado.worldEvents.definir(`noite:vivida:${estado.dia}`, true);
    this.scene.resume('FarmScene'); this.scene.resume('UIScene'); this.scene.setVisible(true, 'UIScene'); controles.limpar(); this.scene.stop();
    if (!levantar) { this.dormirDepois(); return; }
    estado.dia++; estado.eventos.emit('DAY_STARTED', { dia: estado.dia }); estado.relogio.definir(167);
    estado.worldEvents.definir(`noite:vivida:${estado.dia}`, true);
    estado.worldEvents.definir('noite:amanhecer', estado.dia);
    (this.scene.get('FarmScene') as FarmScene).salvarJogo();
    if (trabalhar) (this.scene.get('UIScene') as UIScene).abrirComputador();
  }
  update(_t: number, delta: number): void {
    if (controles.padVoltar || controles.padPausa) { this.finalizar(false); return; }
    if (controles.apertouPad('cima') || controles.apertouPad('baixo')) { this.escolha = (this.escolha + (controles.apertouPad('cima') ? -1 : 1) + ESCOLHAS.length) % ESCOLHAS.length; this.desenhar(); }
    if (controles.apertouPad('interagir')) this.acionar();
    if (this.tipo === 'sonho' && controles.pressionada('direita')) { this.x += Math.min(delta, 40) * .09; if (this.x >= 413) this.acionar(); }
    this.pessoa.setPosition(this.x, 168);
  }
}

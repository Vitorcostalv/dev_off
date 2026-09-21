import Phaser from 'phaser';
import { estado } from '../game/estado';
import { viuCena } from '../game/campanha';
import { buscarRegistroPsicoterapia, tituloRegistroPsicoterapia } from '../game/fichas';
import { salaMemoria, bloqueadoNaMemoria } from '../game/profundezas';
import { UI } from '../game/config';
import { controles } from '../game/InputRouter';
import { som } from './Som';
import type { FarmScene } from './FarmScene';
import { carregarMobiliaNarrativa, pessoaNarrativa, movelNarrativo } from './arteNarrativa';

/** Continuação espacial 51–200. Cada sala tem documento, vestígio e escada. */
export class ProfundezasScene extends Phaser.Scene {
  private andar = 51;
  private x = 48; private y = 184;
  private raiz!: Phaser.GameObjects.Container;
  private corpo!: Phaser.GameObjects.Image;
  private ameaca!: Phaser.GameObjects.Graphics;
  private aviso!: Phaser.GameObjects.Text;
  private painel!: Phaser.GameObjects.Container;
  private leitura!: Phaser.GameObjects.Text;
  private paginas: string[] = [];
  private pagina = 0;
  private lendoRegistro = false;
  private protegidoAte = 0;
  private aceitarApos = 0;
  private setas!: Phaser.Types.Input.Keyboard.CursorKeys;
  constructor() { super('ProfundezasScene'); }
  preload(): void { carregarMobiliaNarrativa(this); }
  create(): void {
    if (!viuCena(estado, 'andar50')) { this.scene.stop(); return; }
    this.andar = Math.min(200, Math.max(51, Number(estado.worldEvents.obter('campanha:andarAtual')) || 51));
    this.scene.pause('FarmScene'); this.scene.pause('UIScene'); this.scene.bringToTop();
    this.raiz = this.add.container(0, 0); this.corpo = pessoaNarrativa(this, 48, 184).setDepth(2); this.ameaca = this.add.graphics().setDepth(1);
    this.aviso = this.add.text(15, 241, '', { fontFamily: UI.fonte, fontSize: '10px', color: '#d3d4c7' }).setDepth(3);
    this.painel = this.add.container(0, 0).setDepth(5).setVisible(false);
    this.painel.add(this.add.rectangle(240, 190, 464, 90, 0x101922).setStrokeStyle(1, 0x8c9a94));
    this.leitura = this.add.text(20, 156, '', { fontFamily: UI.fonte, fontSize: '12px', color: '#e3e5df', wordWrap: { width: 438 }, lineSpacing: 3 });
    this.painel.add(this.leitura);
    const continuar = this.add.text(20, 215, '[Enter/E/A] continuar · [Esc/B] fechar', { fontFamily: UI.fonte, fontSize: '10px', color: '#c7b38b' }).setInteractive().on('pointerdown', () => this.interagir());
    this.painel.add(continuar);
    this.setas = this.input.keyboard!.createCursorKeys();
    const tecla = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') this.voltar();
      else if (e.key === 'Enter' || controles.corresponde('interagir', e)) this.interagir();
    };
    this.input.keyboard?.on('keydown', tecla);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', tecla));
    this.montar();
  }
  private guardar(): void {
    estado.worldEvents.definir('campanha:andarAtual', this.andar);
    estado.worldEvents.definir('campanha:profundidade', Math.max(this.andar, Number(estado.worldEvents.obter('campanha:profundidade')) || 50));
    if (!(this.scene.get('FarmScene') as FarmScene).salvarJogo()) this.aviso.setText('Não foi possível salvar. Tente novamente antes de sair.');
  }
  private montar(): void {
    this.raiz.removeAll(true); this.x = 48; this.y = 184;
    this.paginas = []; this.painel.setVisible(false); this.aceitarApos = this.time.now + 200;
    const sala = salaMemoria(this.andar);
    som.musica(null); som.ambiente(this.andar >= 151 ? 'amb_interior' : 'amb_represa_fundo');
    const g = this.add.graphics(); this.raiz.add(g);
    g.fillStyle(0x0d131a).fillRect(0, 0, 480, 270);
    g.fillStyle(sala.tema === 'identidade' ? 0x393a39 : 0x293137).fillRect(20, 40, 440, 180);
    g.lineStyle(1, 0x414746, .45);
    for (let y = 42; y < 220; y += 16) g.lineBetween(20, y, 460, y);
    for (const o of sala.obstaculos) {
      g.fillStyle(o.tipo === 'cama' ? 0x707b79 : o.tipo === 'mesa' ? 0x71634f : 0x48565b).fillRect(o.x, o.y, o.w, o.h);
      if (o.tipo === 'mesa') { g.fillStyle(0x17232c).fillRect(o.x + 5, o.y + 3, 18, 12); g.fillStyle(0x6a9295).fillRect(o.x + 7, o.y + 5, 14, 8); }
      if (o.tipo === 'cama') g.fillStyle(0xa5aaa0).fillRect(o.x + 3, o.y + 2, 22, 6);
      const id = o.tipo === 'mesa' ? 'bancada_trabalho' : o.tipo === 'armario' ? 'estante_caixas' : o.tipo === 'cadeira' ? 'poltrona_creme' : 'sofa_creme';
      const sprite = movelNarrativo(this, id, o.x + o.w / 2, o.y + o.h, o.w + 8, o.h + 16);
      if (sprite) this.raiz.add(sprite);
    }
    g.fillStyle(0xc9c5b0).fillRect(90, 61, 12, 15);
    g.fillStyle(0x928f76).fillRect(55, 109, 17, 14);
    g.fillStyle(0x161d21).fillRect(409, 43, 36, 30);
    for (let i = 0; i < 5; i++) g.fillStyle(0x777e79).fillRect(412, 47 + i * 5, 29, 2);
    g.fillStyle(0x161d21).fillRect(26, 172, 21, 28);
    if (sala.tema === 'culpa' || this.andar >= 173) {
      g.lineStyle(1, 0xb99a59, .6); g.strokeCircle(348, 61, 8); g.lineBetween(370, 75, 382, 59); g.lineBetween(382, 59, 398, 75); g.strokeRect(374, 75, 20, 15);
    }
    const t = this.add.text(15, 13, `A-${this.andar} · ${this.andar <= 100 ? 'O que aconteceu comigo?' : this.andar <= 150 ? 'O que eu fiz comigo?' : 'Quem sou eu agora?'}`, { fontFamily: UI.fonte, fontSize: '12px', color: '#d1d6ce' });
    this.raiz.add(t);
    this.aviso.setText('Mover: WASD/setas · E: examinar · Esc: voltar ao arquivo');
    this.guardar();
  }
  private abrirTexto(texto: string, registro = false): void {
    this.lendoRegistro = registro; this.pagina = 0;
    const linhas = this.leitura.getWrappedText(texto);
    this.paginas = [];
    for (let i = 0; i < linhas.length; i += 3) this.paginas.push(linhas.slice(i, i + 3).join('\n'));
    this.leitura.setText(this.paginas[0] ?? ''); this.painel.setVisible(true);
  }
  private interagir(): void {
    if (this.time.now < this.aceitarApos) return;
    this.aceitarApos = this.time.now + 150;
    if (this.painel.visible) {
      this.pagina++;
      if (this.pagina < this.paginas.length) { this.leitura.setText(this.paginas[this.pagina]!); return; }
      this.painel.setVisible(false);
      if (this.lendoRegistro) {
        estado.arquivo.concluirRegistro(this.andar);
        if (this.andar === 173) estado.worldEvents.definir('campanha:desenhoReconhecido', true);
        this.guardar();
      }
      this.lendoRegistro = false; return;
    }
    if (Math.hypot(this.x - 96, this.y - 69) < 30) {
      if (!estado.arquivo.podeLerRegistro(this.andar)) { this.abrirTexto('Uma folha anterior ainda não foi lida. Você pode retomá-la nos Arquivos.'); return; }
      const r = buscarRegistroPsicoterapia(this.andar)!;
      this.abrirTexto(`${tituloRegistroPsicoterapia(this.andar)}. ${r.texto}`, true); return;
    }
    if (Math.hypot(this.x - 64, this.y - 119) < 29) {
      const observacao = salaMemoria(this.andar).observacao;
      if (observacao.includes('dobrada em quatro')) { estado.worldEvents.definir('campanha:papelEncontrado', true); this.guardar(); }
      this.abrirTexto(this.andar >= 173 && !estado.arquivo.tem(173)
        ? 'O sol e as três figuras reaparecem na parede. Você conhece esses traços.' : observacao);
      return;
    }
    if (Math.hypot(this.x - 427, this.y - 61) < 33) {
      if (!estado.arquivo.tem(this.andar)) { this.abrirTexto('Há uma folha neste andar. Você ainda não terminou de lê-la.'); return; }
      if (this.andar === 200) {
        this.guardar(); this.sair(); (this.scene.get('FarmScene') as FarmScene).iniciarCenaCampanha('final'); return;
      }
      this.andar++; this.montar(); return;
    }
    if (Math.hypot(this.x - 36, this.y - 186) < 27) {
      if (this.andar === 51) this.sair(); else { this.andar--; this.montar(); }
    }
  }
  private voltar(): void {
    if (this.painel.visible) { this.painel.setVisible(false); this.lendoRegistro = false; return; }
    this.sair();
  }
  private sair(): void {
    this.guardar(); controles.limpar(); som.silenciar();
    this.scene.resume('FarmScene'); this.scene.resume('UIScene'); this.scene.stop();
  }
  update(_time: number, delta: number): void {
    if (!this.raiz) return;
    if (controles.padVoltar || controles.padPausa) { this.voltar(); return; }
    if (controles.apertouPad('interagir')) this.interagir();
    const sala = salaMemoria(this.andar);
    if (!this.painel.visible) {
      let dx = Number(controles.pressionada('direita') || this.setas.right.isDown) - Number(controles.pressionada('esquerda') || this.setas.left.isDown);
      let dy = Number(controles.pressionada('baixo') || this.setas.down.isDown) - Number(controles.pressionada('cima') || this.setas.up.isDown);
      const tamanho = Math.hypot(dx, dy) || 1;
      dx = dx / tamanho * Math.min(delta, 40) * .105; dy = dy / tamanho * Math.min(delta, 40) * .105;
      if (!bloqueadoNaMemoria(sala, this.x + dx, this.y)) this.x += dx;
      if (!bloqueadoNaMemoria(sala, this.x, this.y + dy)) this.y += dy;
    }
    this.corpo.setPosition(this.x, this.y + 10);
    this.ameaca.clear();
    if (sala.ameacas) {
      const ax = 240 + Math.sin(this.time.now / 1300) * 90, ay = 184;
      this.ameaca.fillStyle(0x273b43).fillRect(ax - 9, ay - 11, 18, 20).fillStyle(0x93bdbe).fillRect(ax - 5, ay - 7, 10, 5);
      if (!this.painel.visible && Math.hypot(this.x - ax, this.y - ay) < 20 && this.time.now > this.protegidoAte) {
        this.x = 48; this.y = 184; this.protegidoAte = this.time.now + 1800;
        this.aviso.setText('A máquina avança. Você recua até a escada. Os documentos continuam com você.');
      }
    }
  }
}

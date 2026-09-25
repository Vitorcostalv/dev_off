import { UI } from '../game/config';
import Phaser from 'phaser';
import { estado } from '../game/estado';
import { controles } from '../game/InputRouter';
import { MADRUGADAS, OBJETOS_PROLOGO, textoObjetoPrologo } from '../game/prologoExploravel';
import { carregarMobiliaNarrativa, movelNarrativo, pessoaNarrativa } from './arteNarrativa';
import { som } from './Som';
import type { FarmScene } from './FarmScene';

/** Antiga casa explorável; nenhum relógio real bloqueia o avanço ou a saída. */
export class PrologoScene extends Phaser.Scene {
  private pessoa!: Phaser.GameObjects.Image;
  private x = 236; private y = 161;
  private etapa = 0; private escolha = 0; private modo: 'livre' | 'texto' | 'trabalho' = 'livre';
  private painel!: Phaser.GameObjects.Container; private texto!: Phaser.GameObjects.Text;
  private topo!: Phaser.GameObjects.Text; private prompt!: Phaser.GameObjects.Text;
  private paginas: string[] = []; private pagina = 0; private aposTexto: (() => void) | null = null;
  private setas!: Phaser.Types.Input.Keyboard.CursorKeys;
  private chuva!: Phaser.GameObjects.Graphics;
  constructor() { super('PrologoScene'); }
  preload(): void { carregarMobiliaNarrativa(this); }
  create(): void {
    this.x = Number(estado.worldEvents.obter('prologo:x')) || 236;
    this.y = Number(estado.worldEvents.obter('prologo:y')) || 161;
    this.etapa = Math.min(4, Math.max(0, Number(estado.worldEvents.obter('prologo:etapa')) || 0));
    this.modo = 'livre'; this.aposTexto = null;
    this.scene.pause('FarmScene'); this.scene.pause('UIScene'); this.scene.bringToTop();
    som.musica(null); som.ambiente('amb_chuva');
    const g = this.add.graphics(); g.fillStyle(0x101921).fillRect(0, 0, 480, 270);
    g.fillStyle(0x263039).fillRect(26, 36, 427, 186); g.fillStyle(0x354044).fillRect(28, 97, 423, 123);
    g.lineStyle(1, 0x434944, .4); for (let y = 99; y < 220; y += 16) g.lineBetween(28, y, 451, y);
    g.fillStyle(0x19313e).fillRect(32, 129, 33, 55); g.lineStyle(2, 0x62757b).strokeRect(32, 129, 33, 55);
    g.fillStyle(0x665546).fillRect(286, 60, 138, 30); g.fillStyle(0x243747).fillRect(316, 52, 31, 20);
    g.fillStyle(0x759799).fillRect(319, 55, 25, 13); g.fillStyle(0x819a9a).fillRect(386, 68, 9, 13);
    g.fillStyle(0x566464).fillRect(56, 63, 98, 28); g.fillStyle(0x2b454f).fillEllipse(136, 74, 24, 14);
    g.fillStyle(0xbeb49b).fillRect(78, 69, 7, 9); g.fillStyle(0x11191e).fillRect(220, 199, 27, 23);
    g.lineStyle(2, 0x939887).strokeCircle(210, 54, 9); g.lineBetween(210, 54, 210, 47); g.lineBetween(210, 54, 215, 55);
    movelNarrativo(this, 'sofa_creme', 388, 187, 59, 48); movelNarrativo(this, 'poltrona_creme', 326, 120, 27, 30);
    this.pessoa = pessoaNarrativa(this, this.x, this.y, 'Você', 32);
    this.topo = this.add.text(15, 12, '', { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: '#d0d5cd' });
    this.prompt = this.add.text(15, 236, '', { fontFamily: UI.fonte, fontSize: UI.tamanho, color: '#b8c4c3', wordWrap: { width: 450 } });
    this.painel = this.add.container(0, 0).setDepth(10).setVisible(false);
    this.painel.add(this.add.rectangle(240, 205, 464, 112, 0x101b24).setStrokeStyle(1, 0x7b8a89));
    this.texto = this.add.text(18, 158, '', { fontFamily: UI.fonte, fontSize: UI.tamanhoFala, color: '#e0dfd0', wordWrap: { width: 442 }, lineSpacing: 3 });
    this.painel.add(this.texto);
    const continuar = this.add.text(18, 245, 'Enter/E/A: continuar · setas: escolher', { fontFamily: UI.fonte, fontSize: UI.tamanhoMiudo, color: '#a9b8b8' }).setInteractive().on('pointerdown', () => this.interagir()); this.painel.add(continuar);
    this.chuva = this.add.graphics().setDepth(2);
    this.setas = this.input.keyboard!.createCursorKeys();
    const tecla = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') this.suspender();
      else if (e.key === 'Enter' || controles.corresponde('interagir', e)) this.interagir();
      else if (this.modo === 'trabalho' && ['ArrowDown', 'ArrowUp'].includes(e.key)) { this.escolha = (this.escolha + (e.key === 'ArrowDown' ? 1 : 2)) % 3; this.mostrarTrabalho(); }
    };
    this.input.keyboard?.on('keydown', tecla); this.events.once('shutdown', () => this.input.keyboard?.off('keydown', tecla));
    this.guardar();
    if (!estado.worldEvents.ativa('prologo:entrada')) { estado.worldEvents.definir('prologo:entrada', true); this.ler('Algumas semanas antes da mudança.\n\nVocê está em sua antiga casa. A chuva abafa a rua, mas não o computador. Caminhe com WASD ou as setas; aproxime-se dos objetos e use E. O celular acabou de acender.'); }
  }
  private guardar(): void {
    estado.worldEvents.definir('campanha:ativa', 'prologo');
    estado.worldEvents.definir('prologo:x', this.x); estado.worldEvents.definir('prologo:y', this.y);
    estado.worldEvents.definir('prologo:etapa', this.etapa);
    if (!(this.scene.get('FarmScene') as FarmScene).salvarJogo()) this.prompt.setText('Não foi possível salvar. Tente novamente antes de sair.');
  }
  private ler(t: string, depois?: () => void): void {
    const linhas = this.texto.getWrappedText(t); this.paginas = [];
    for (let i = 0; i < linhas.length; i += 4) this.paginas.push(linhas.slice(i, i + 4).join('\n'));
    this.pagina = 0; this.modo = 'texto'; this.aposTexto = depois ?? null; this.painel.setVisible(true); this.texto.setText(this.paginas[0] ?? '');
  }
  private mostrarTrabalho(): void {
    const turno = MADRUGADAS[this.etapa]; if (!turno) return;
    this.painel.setVisible(true); this.texto.setText(turno.opcoes.map((o, i) => `${i === this.escolha ? '›' : ' '} ${o}`).join('\n'));
  }
  private interagir(): void {
    if (this.modo === 'texto') {
      this.pagina++; if (this.pagina < this.paginas.length) { this.texto.setText(this.paginas[this.pagina]!); return; }
      this.modo = 'livre'; this.painel.setVisible(false); const cb = this.aposTexto; this.aposTexto = null; cb?.(); return;
    }
    if (this.modo === 'trabalho') {
      if (this.escolha !== MADRUGADAS[this.etapa]?.resposta) { this.ler('Você revê os registros. A hipótese não explica todas as pistas. É melhor conferir antes de enviar.', () => { this.modo = 'trabalho'; this.mostrarTrabalho(); }); return; }
      this.etapa++; this.guardar();
      this.ler(this.etapa === 4 ? '06:12. Amanheceu. O relatório foi enviado. Você ainda está sentado. Não consegue lembrar se jantou. Pela primeira vez na noite, não chega outra mensagem. Vá até a porta quando estiver pronto.' : 'A confirmação aparece na tela. Por alguns segundos, acabou. Então o celular acende de novo. Você precisa se levantar.'); return;
    }
    const objeto = OBJETOS_PROLOGO.find(o => Math.hypot(o.x - this.x, o.y - this.y) < 35); if (!objeto) return;
    if (objeto.id === 'porta' && this.etapa >= 4) {
      estado.worldEvents.definir('prologo:explorado', true); estado.worldEvents.definir('campanha:quadro', 6); this.guardar();
      this.scene.stop(); this.scene.launch('CampanhaScene', { id: 'prologo' }); return;
    }
    if (objeto.id === 'celular') {
      if (this.etapa >= 4) { this.ler('Nenhuma mensagem nova. Você olha uma segunda vez.'); return; }
      estado.worldEvents.definir(`prologo:mensagem:${this.etapa}`, true); this.guardar();
      this.ler(`Mensagem\n${MADRUGADAS[this.etapa]!.mensagem}\n\nVocê escreve: “Vou olhar”. A resposta chega quase imediatamente: “Obrigado. Sabia que podia contar com você”.`); return;
    }
    if (objeto.id === 'notebook') {
      if (this.etapa >= 4) { this.ler('O relatório está concluído. Você fecha a janela. Não aparece nenhum parabéns.'); return; }
      if (!estado.worldEvents.ativa(`prologo:mensagem:${this.etapa}`)) { this.ler('Uma notificação acende no celular. O computador espera sua resposta.'); return; }
      const turno = MADRUGADAS[this.etapa]!; this.ler(`${turno.relato}\n\nVocê lê o chamado e compara os registros:\n${turno.pistas.join('\n')}`, () => { this.modo = 'trabalho'; this.escolha = 0; this.mostrarTrabalho(); }); return;
    }
    estado.worldEvents.definir(`prologo:objeto:${objeto.id}`, true); this.guardar(); this.ler(textoObjetoPrologo(objeto.id, this.etapa));
  }
  private suspender(): void {
    this.guardar(); controles.limpar(); som.silenciar();
    (this.scene.get('FarmScene') as FarmScene).suspenderCampanha(true);
    this.scene.resume('FarmScene'); this.scene.resume('UIScene'); this.scene.stop();
    this.scene.launch('MenuScene', { pagina: 'historia' });
  }
  update(_t: number, delta: number): void {
    if (!this.pessoa) return;
    if (controles.padVoltar || controles.padPausa) { this.suspender(); return; }
    if (controles.apertouPad('interagir')) this.interagir();
    if (this.modo === 'trabalho' && (controles.apertouPad('cima') || controles.apertouPad('baixo'))) { this.escolha = (this.escolha + (controles.apertouPad('baixo') ? 1 : 2)) % 3; this.mostrarTrabalho(); }
    if (this.modo === 'livre') {
      const dx = Number(controles.pressionada('direita') || this.setas.right.isDown) - Number(controles.pressionada('esquerda') || this.setas.left.isDown);
      const dy = Number(controles.pressionada('baixo') || this.setas.down.isDown) - Number(controles.pressionada('cima') || this.setas.up.isDown);
      const passo = Math.min(delta, 40) * .085 / (Math.hypot(dx, dy) || 1);
      this.x = Phaser.Math.Clamp(this.x + dx * passo, 45, 435); this.y = Phaser.Math.Clamp(this.y + dy * passo, 103, 216);
      this.pessoa.setPosition(this.x, this.y).setDepth(this.y / 1000 + 1);
    }
    const objeto = OBJETOS_PROLOGO.find(o => Math.hypot(o.x - this.x, o.y - this.y) < 35);
    this.topo.setText(`Antes da mudança · ${MADRUGADAS[this.etapa]?.hora ?? '06:12'}`);
    this.prompt.setText(objeto ? `[${controles.rotulo('interagir')}] ${objeto.nome}` : 'WASD/setas: caminhar · E: examinar · Esc: guardar e pausar');
    this.chuva.clear(); if (!estado.preferencias.valores.movimentoReduzido) {
      this.chuva.lineStyle(1, 0xabc0cb, .3); for (let i = 0; i < 9; i++) { const y = 131 + (this.time.now * .04 + i * 13) % 48; this.chuva.lineBetween(35 + i * 3, y, 34 + i * 3, y + 4); }
    }
  }
}

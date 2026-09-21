import Phaser from 'phaser';
import { estado } from '../game/estado';
import { CENAS_CAMPANHA, cenaPendente, concluirCena, motivoEspera } from '../game/campanha';
import type { CenarioNarrativo, QuadroNarrativo } from '../game/campanha';
import { UI } from '../game/config';
import { controles } from '../game/InputRouter';
import { som } from './Som';
import type { FarmScene } from './FarmScene';
import { carregarPessoas, pessoaNarrativa, carregarMobiliaNarrativa, movelNarrativo } from './arteNarrativa';

/** Encenação em pixel art nativa: tempo e combate ficam pausados durante a cena. */
export class CampanhaScene extends Phaser.Scene {
  private id = '';
  private indice = 0;
  private escolha = 0;
  private prontoEm = 0;
  private cenario: CenarioNarrativo = 'casa';
  private hora = '';
  private raiz!: Phaser.GameObjects.Container;
  private chuva!: Phaser.GameObjects.Graphics;
  constructor() { super('CampanhaScene'); }
  init(dados: { id: string }): void { this.id = dados.id; }
  preload(): void {
    carregarMobiliaNarrativa(this);
    carregarPessoas(this, [...this.cena.quadros.map(q => q.nome ?? ''), this.cena.npc ?? '', 'Letícia', 'Hiago']);
  }
  create(dados: { id: string }): void {
    const cena = cenaPendente(estado);
    if (!cena || cena.id !== dados.id || motivoEspera(estado, cena)) { this.scene.stop(); return; }
    this.id = cena.id;
    this.indice = estado.worldEvents.obter('campanha:ativa') === this.id
      ? Math.max(0, Math.min(cena.quadros.length - 1, Number(estado.worldEvents.obter('campanha:quadro')) || 0)) : 0;
    this.escolha = 0; this.hora = ''; this.cenario = 'casa';
    this.scene.pause('FarmScene'); this.scene.pause('UIScene'); this.scene.bringToTop();
    this.raiz = this.add.container(0, 0);
    this.chuva = this.add.graphics().setDepth(1);
    som.silenciar();
    const tecla = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') this.sair(false);
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { this.escolha = 1 - this.escolha; this.desenhar(); }
      else if (e.key === 'Enter' || controles.corresponde('interagir', e)) this.avancar();
    };
    this.input.keyboard?.on('keydown', tecla);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', tecla));
    this.mostrar();
  }
  private get cena() { return CENAS_CAMPANHA.find(s => s.id === this.id)!; }
  private get quadro(): QuadroNarrativo { return this.cena.quadros[this.indice]!; }
  private salvar(): void {
    const mundo = this.scene.get('FarmScene') as FarmScene;
    if (!mundo.salvarJogo()) {
      this.add.text(15, 28, 'Não foi possível salvar. Seu progresso continua nesta sessão.', { fontFamily: UI.fonte, fontSize: '10px', color: '#f2c58b' }).setDepth(5);
    }
  }
  private mostrar(): void {
    // Reconstrói também o ambiente quando uma cena é retomada no meio.
    for (const q of this.cena.quadros.slice(0, this.indice + 1)) {
      if (q.cenario) this.cenario = q.cenario;
      if (q.hora) this.hora = q.hora;
    }
    this.prontoEm = this.time.now + (this.quadro.pausa ?? 220);
    estado.worldEvents.definir('campanha:ativa', this.id);
    estado.worldEvents.definir('campanha:quadro', this.indice);
    som.musica(null);
    som.ambiente(this.id === 'andar50' ? null : ['apartamento', 'estrada', 'casa'].includes(this.cenario) ? 'amb_chuva' : this.cenario === 'represa' ? 'amb_represa_fundo' : this.cenario === 'bar' ? 'amb_interior' : 'amb_bairro');
    this.desenhar(); this.salvar();
  }
  private avancar(): void {
    if (this.time.now < this.prontoEm) return;
    if (this.quadro.escolha) estado.worldEvents.definir(`campanha:escolha:${this.id}`, this.escolha);
    this.indice++; this.escolha = 0;
    if (this.indice >= this.cena.quadros.length) {
      if (concluirCena(estado, this.id)) this.sair(true);
      return;
    }
    this.mostrar();
  }
  private sair(concluida: boolean): void {
    this.salvar(); controles.limpar(); som.silenciar();
    (this.scene.get('FarmScene') as FarmScene).suspenderCampanha(!concluida);
    this.scene.resume('FarmScene'); this.scene.resume('UIScene'); this.scene.stop();
    if (concluida && this.id === 'prologo' && estado.dia === 0 && estado.relacoes.listaInteragidos().length === 0) {
      estado.mapa = 'oficina';
      (this.scene.get('FarmScene') as FarmScene).scene.restart({ mapa: 'oficina', salvar: true });
    }
  }
  update(): void {
    if (!this.raiz) return;
    if (controles.padVoltar || controles.padPausa) { this.sair(false); return; }
    if (controles.apertouPad('cima') || controles.apertouPad('baixo')) { this.escolha = 1 - this.escolha; this.desenhar(); }
    if (controles.apertouPad('interagir')) this.avancar();
    this.chuva.clear();
    if (estado.preferencias.valores.movimentoReduzido || !['apartamento', 'estrada', 'casa'].includes(this.cenario)) return;
    this.chuva.lineStyle(1, 0x97afb9, .22);
    for (let i = 0; i < 34; i++) {
      const x = (i * 71) % 480, y = 36 + ((this.time.now * .09 + i * 23) % 118);
      if (this.cenario === 'estrada' || x < 110) this.chuva.lineBetween(x, y, x - 3, y + 7);
    }
  }
  private desenhar(): void {
    this.raiz.removeAll(true);
    const g = this.add.graphics(); this.raiz.add(g);
    const rect = (x: number, y: number, w: number, h: number, c: number) => { g.fillStyle(c); g.fillRect(x, y, w, h); };
    const pessoa = (x: number, y: number, nome = 'Você') => {
      g.fillStyle(0x050b13, .3).fillEllipse(x, y + 13, 19, 6);
      this.raiz.add(pessoaNarrativa(this, x, y + 16, nome));
    };
    const movel = (id: string, x: number, y: number, w: number, h: number) => {
      const imagem = movelNarrativo(this, id, x, y, w, h); if (imagem) this.raiz.add(imagem);
    };
    rect(0, 0, 480, 270, 0x090e15); rect(0, 34, 480, 123, 0x1a242d);
    const interior = ['apartamento', 'casa', 'oficina', 'bar'].includes(this.cenario);
    if (interior) {
      rect(30, 40, 78, 55, 0x070f1c); rect(33, 43, 72, 49, this.hora.startsWith('06') || this.id === 'epilogo' ? 0x82999d : 0x253d51);
      rect(68, 41, 3, 54, 0x121c27); rect(31, 70, 77, 3, 0x121c27);
      rect(0, 110, 480, 47, 0x292b2c);
      for (let x = 0; x < 480; x += 28) rect(x, 110, 1, 47, 0x202426);
      rect(170, 93, 156, 8, 0x73604b); rect(179, 101, 5, 47, 0x403b36); rect(313, 101, 5, 47, 0x403b36);
      if (this.cenario === 'apartamento') {
        for (let i = 0; i < 3; i++) { rect(178 + i * 47, 56, 42, 33, 0x10171e); rect(181 + i * 47, 59, 36, 25, 0x3b727f); rect(195 + i * 47, 89, 6, 4, 0x18232d); }
        for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) rect(184 + i * 47, 63 + j * 4, 7 + ((j * 7 + i * 3) % 21), 1, 0x8daaa8);
        movel('poltrona_creme', 243, 144, 34, 43);
      } else {
        rect(192, 77, 28, 16, 0x8a8171); rect(195, 80, 8, 8, 0x303c46); rect(261, 84, 8, 9, 0xb0a68d);
        rect(366, 121, 30, 28, 0x79644e); rect(403, 128, 30, 21, 0x665443);
        if (this.id !== 'caixas' && this.id !== 'prologo') {
          rect(348, 53, 21, 24, 0x917957); rect(351, 56, 15, 18, 0xa4aaa0);
          rect(114, 105, 12, 13, 0x9a7056); rect(117, 89, 4, 18, 0x527765);
          movel('planta_alta', 120, 119, 22, 43);
          movel('quadro_paisagem', 358, 78, 23, 29);
        }
        movel('estante_caixas', 422, 142, 37, 60);
        movel('bancada_trabalho', 248, 107, 110, 36);
      }
      pessoa(this.cenario === 'casa' ? 118 : 243, 121);
      if (this.quadro.nome && !['Você', 'Mensagem', 'Cliente', 'Cliente antigo'].includes(this.quadro.nome)) pessoa(290, 125, this.quadro.nome);
    } else if (this.cenario === 'estrada') {
      rect(0, 73, 480, 78, 0x25312e); rect(0, 102, 480, 44, 0x3c4248);
      for (let x = 0; x < 480; x += 65) rect(x, 122, 28, 2, 0x9b9784);
      rect(293, 72, 6, 33, 0x766c5b); rect(270, 55, 75, 23, 0x626b5b);
      rect(127, 104, 84, 23, 0x666e76); rect(144, 92, 42, 17, 0x485766);
      rect(140, 125, 12, 8, 0x10161e); rect(189, 125, 12, 8, 0x10161e);
    } else if (this.cenario === 'represa') {
      rect(118, 37, 242, 120, 0x282f33); rect(176, 42, 123, 114, 0x141b22);
      for (let i = 0; i < 5; i++) { rect(122 + i * 19, 42 + i * 9, 3, 108 - i * 9, 0x404749); rect(352 - i * 12, 42 + i * 9, 2, 108 - i * 9, 0x404749); }
      pessoa(238, this.id === 'andar50' && this.indice >= 3 && this.indice <= 6 ? 142 : 124);
      if (this.id === 'hiago') pessoa(265, 127, 'Hiago');
    } else {
      rect(0, 87, 480, 70, 0x35483c); rect(0, 126, 480, 21, 0x7d786b);
      if (this.cenario === 'rio') rect(0, 91, 480, 25, 0x526f78);
      for (const x of [47, 123, 355, 434]) { rect(x, 75, 8, 52, 0x625446); rect(x - 18, 48, 45, 41, 0x42584b); }
      rect(201, 121, 71, 5, 0x987c5c); pessoa(223, 120); pessoa(251, 120, this.cena.npc ?? 'Letícia');
      if (this.id === 'epilogo') { pessoa(283, 122, 'Hiago'); pessoa(310, 119, 'Letícia'); }
    }
    const texto = (x: number, y: number, t: string, tamanho: string, cor = '#dadbd4', largura = 448) => {
      const o = this.add.text(x, y, t, { fontFamily: UI.fonte, fontSize: tamanho, color: cor, wordWrap: { width: largura }, lineSpacing: 3 }); this.raiz.add(o); return o;
    };
    texto(16, 9, this.cena.capitulo, '11px', '#9bafb9'); texto(403, 9, this.hora, '11px');
    rect(8, 161, 464, 78, 0x101922);
    texto(18, 166, this.quadro.nome || this.cena.titulo, '11px', '#c7b38b');
    texto(18, 184, this.quadro.texto, '12px', '#e3e5df', 437);
    if (this.quadro.escolha) {
      this.quadro.escolha.forEach((op, i) => {
        texto(16 + i * 232, 243, `${this.escolha === i ? '> ' : ''}${op}`, '10px', this.escolha === i ? '#e8d9ae' : '#8e9da8', 220)
          .setInteractive().on('pointerdown', () => { this.escolha = i; this.avancar(); });
      });
    } else {
      texto(16, 246, `[${controles.rotulo('interagir')}/Enter/A] ${this.quadro.acao ?? 'Continuar'}`, '10px', '#c7b38b')
        .setInteractive().on('pointerdown', () => this.avancar());
    }
    texto(403, 229, `${this.indice + 1}/${this.cena.quadros.length}`, '9px', '#7b8e9b');
    texto(383, 257, 'Esc/B: pausar', '9px', '#7b8e9b');
  }
}

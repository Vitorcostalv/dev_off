import Phaser from 'phaser';
import { nomeDoDia } from '../game/calendario';
import { CONFIG, UI } from '../game/config';
import { estado } from '../game/estado';
import type { Fala, MundoJogavel } from '../game/tipos';

const CAIXA = { x: 8, y: 188, w: CONFIG.largura - 16, h: 74 };
const CONFIRMA = { w: 180, h: 56 };

/**
 * Cena de interface, rodando em paralelo com a cena de mundo.
 * Concentra TODO o input de "acionar" (tecla E e clique) e decide quem trata:
 * confirmacao > dialogo > cena de mundo. Isso evita que o mesmo aperto de E
 * abra e feche algo no mesmo frame.
 */
export class UIScene extends Phaser.Scene {
  private prompt!: Phaser.GameObjects.Text;
  private rotuloAtual: string | null = null;

  private hud!: Phaser.GameObjects.Text;

  private dialogo!: Phaser.GameObjects.Container;
  private dialogoNome!: Phaser.GameObjects.Text;
  private dialogoTexto!: Phaser.GameObjects.Text;
  private falas: Fala[] = [];
  private indiceFala = 0;
  private aoFimDoDialogo: (() => void) | null = null;

  private confirmacao!: Phaser.GameObjects.Container;
  private confirmacaoTexto!: Phaser.GameObjects.Text;
  private opcoes: Phaser.GameObjects.Text[] = [];
  private indiceOpcao = 0;
  private aoSim: (() => void) | null = null;
  private aoNao: (() => void) | null = null;

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  /** true quando alguma janela da UI esta capturando o jogo (pausa movimento). */
  get bloqueado(): boolean {
    return this.dialogoAberto || this.confirmacaoAberta;
  }

  get dialogoAberto(): boolean {
    return this.dialogo?.visible ?? false;
  }

  get confirmacaoAberta(): boolean {
    return this.confirmacao?.visible ?? false;
  }

  create(): void {
    this.prompt = this.add
      .text(CONFIG.largura / 2, CONFIG.altura - 24, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.destaque,
        backgroundColor: '#1a1712cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.hud = this.add
      .text(6, 6, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.texto,
        backgroundColor: '#1a1712e0',
        padding: { x: 5, y: 3 },
      })
      .setDepth(90);

    this.dialogo = this.criarCaixaDeDialogo();
    this.confirmacao = this.criarCaixaDeConfirmacao();

    const teclado = this.input.keyboard;
    teclado?.on('keydown-E', () => this.acionar());
    teclado?.on('keydown-ESC', () => this.cancelar());
    teclado?.on('keydown-LEFT', () => this.moverOpcao(-1));
    teclado?.on('keydown-RIGHT', () => this.moverOpcao(1));
    teclado?.on('keydown-A', () => this.moverOpcao(-1));
    teclado?.on('keydown-D', () => this.moverOpcao(1));
    this.input.on('pointerdown', () => this.acionar());
  }

  update(): void {
    this.atualizarHud();
  }

  // ----------------------------------------------------------------- hud --

  private atualizarHud(): void {
    const texto = `${nomeDoDia(estado.dia)}  ${estado.relogio.texto}`;
    if (this.hud.text !== texto) this.hud.setText(texto);
  }

  // -------------------------------------------------------------- prompt --

  /** Mostra "[E] <rotulo>" ou some, se `rotulo` for null. */
  mostrarPrompt(rotulo: string | null): void {
    this.rotuloAtual = rotulo;
    this.desenharPrompt();
  }

  private desenharPrompt(): void {
    const visivel = this.rotuloAtual !== null && !this.bloqueado;
    if (visivel) this.prompt.setText(`[E] ${this.rotuloAtual}`);
    this.prompt.setVisible(visivel);
  }

  // ------------------------------------------------------------- dialogo --

  /** Abre a caixa de dialogo com uma sequencia de falas. */
  iniciarDialogo(falas: Fala[], aoFim?: () => void): void {
    if (falas.length === 0) return;
    this.falas = falas;
    this.indiceFala = 0;
    this.aoFimDoDialogo = aoFim ?? null;
    this.dialogo.setVisible(true);
    this.desenharFala();
    this.desenharPrompt();
  }

  private avancarDialogo(): void {
    this.indiceFala += 1;
    if (this.indiceFala >= this.falas.length) {
      this.fecharDialogo();
      return;
    }
    this.desenharFala();
  }

  private fecharDialogo(): void {
    this.dialogo.setVisible(false);
    this.falas = [];
    this.indiceFala = 0;
    const aoFim = this.aoFimDoDialogo;
    this.aoFimDoDialogo = null;
    this.desenharPrompt();
    aoFim?.();
  }

  private desenharFala(): void {
    const fala = this.falas[this.indiceFala];
    this.dialogoNome.setText(fala.nome);
    this.dialogoTexto.setText(fala.texto);
  }

  private criarCaixaDeDialogo(): Phaser.GameObjects.Container {
    const fundo = this.add.graphics();
    fundo.fillStyle(UI.fundo, UI.fundoAlfa);
    fundo.fillRect(CAIXA.x, CAIXA.y, CAIXA.w, CAIXA.h);
    fundo.lineStyle(1, UI.borda, 1);
    fundo.strokeRect(CAIXA.x + 0.5, CAIXA.y + 0.5, CAIXA.w - 1, CAIXA.h - 1);

    this.dialogoNome = this.add.text(CAIXA.x + 8, CAIXA.y + 7, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
    });

    this.dialogoTexto = this.add.text(CAIXA.x + 8, CAIXA.y + 24, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: UI.texto,
      wordWrap: { width: CAIXA.w - 16 },
      lineSpacing: 3,
    });

    const seta = this.add
      .text(CAIXA.x + CAIXA.w - 8, CAIXA.y + CAIXA.h - 6, '[E]', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.textoFraco,
      })
      .setOrigin(1, 1);

    this.tweens.add({ targets: seta, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    return this.add
      .container(0, 0, [fundo, this.dialogoNome, this.dialogoTexto, seta])
      .setDepth(100)
      .setVisible(false);
  }

  // --------------------------------------------------------- confirmacao --

  /** Pergunta Sim/Nao. Setas ou A/D escolhem, E ou clique confirma, ESC cancela. */
  confirmar(texto: string, aoSim: () => void, aoNao?: () => void): void {
    this.confirmacaoTexto.setText(texto);
    this.aoSim = aoSim;
    this.aoNao = aoNao ?? null;
    this.indiceOpcao = 0;
    this.destacarOpcao();
    this.confirmacao.setVisible(true);
    this.desenharPrompt();
  }

  private moverOpcao(passo: number): void {
    if (!this.confirmacaoAberta) return;
    this.indiceOpcao = (this.indiceOpcao + passo + this.opcoes.length) % this.opcoes.length;
    this.destacarOpcao();
  }

  private destacarOpcao(): void {
    this.opcoes.forEach((op, i) => {
      const ativo = i === this.indiceOpcao;
      const rotulo = op.getData('rotulo') as string;
      op.setColor(ativo ? UI.destaque : UI.textoFraco);
      op.setText(ativo ? `> ${rotulo}` : `  ${rotulo}`);
    });
  }

  private responderConfirmacao(): void {
    const sim = this.indiceOpcao === 0;
    const aoSim = this.aoSim;
    const aoNao = this.aoNao;
    this.fecharConfirmacao();
    if (sim) aoSim?.();
    else aoNao?.();
  }

  private fecharConfirmacao(): void {
    this.confirmacao.setVisible(false);
    this.aoSim = null;
    this.aoNao = null;
    this.desenharPrompt();
  }

  private cancelar(): void {
    if (!this.confirmacaoAberta) return;
    const aoNao = this.aoNao;
    this.fecharConfirmacao();
    aoNao?.();
  }

  private criarCaixaDeConfirmacao(): Phaser.GameObjects.Container {
    const x = (CONFIG.largura - CONFIRMA.w) / 2;
    const y = (CONFIG.altura - CONFIRMA.h) / 2;

    const fundo = this.add.graphics();
    fundo.fillStyle(UI.fundo, 0.95);
    fundo.fillRect(x, y, CONFIRMA.w, CONFIRMA.h);
    fundo.lineStyle(1, UI.borda, 1);
    fundo.strokeRect(x + 0.5, y + 0.5, CONFIRMA.w - 1, CONFIRMA.h - 1);

    this.confirmacaoTexto = this.add
      .text(x + CONFIRMA.w / 2, y + 13, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.texto,
        align: 'center',
        wordWrap: { width: CONFIRMA.w - 16 },
      })
      .setOrigin(0.5, 0);

    this.opcoes = ['Sim', 'Nao'].map((rotulo, i) => {
      const op = this.add
        .text(x + CONFIRMA.w * (i === 0 ? 0.32 : 0.68), y + CONFIRMA.h - 16, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoTitulo,
          color: UI.textoFraco,
        })
        .setOrigin(0.5, 0.5)
        .setData('rotulo', rotulo)
        .setInteractive({ useHandCursor: true });
      // passar o mouse ja seleciona; o clique confirma pelo handler global
      op.on('pointerover', () => {
        this.indiceOpcao = i;
        this.destacarOpcao();
      });
      return op;
    });

    return this.add
      .container(0, 0, [fundo, this.confirmacaoTexto, ...this.opcoes])
      .setDepth(110)
      .setVisible(false);
  }

  // --------------------------------------------------------------- input --

  /** Ponto unico de entrada do "acionar" (E / clique). */
  private acionar(): void {
    if (this.confirmacaoAberta) {
      this.responderConfirmacao();
      return;
    }
    if (this.dialogoAberto) {
      this.avancarDialogo();
      return;
    }
    const mundo = this.scene.get('FarmScene') as unknown as MundoJogavel | undefined;
    mundo?.interagir();
  }
}

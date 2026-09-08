import Phaser from 'phaser';
import { controles } from '../game/InputRouter';
import { som } from './Som';
import { nomeDoDia } from '../game/calendario';
import { CONFIG, UI } from '../game/config';
import { estado } from '../game/estado';
import { JanelaApp } from '../pc/JanelaApp';
import { criarApps } from '../pc/apps/index';
import { PC, caixa, encurtar, texto } from '../pc/widgets';
import type { AppDoPc } from '../pc/tipos';
import type { UIScene } from './UIScene';

/** Grade de icones do desktop: 4 por fileira. */
const ICONES = { colunas: 4, largura: 100, altura: 84, gap: 12, topo: 36 };
const BARRA = 16;

/**
 * O computador do protagonista: um "sistema operacional" de tela cheia por cima
 * da cena do mundo.
 *
 * Roda como CENA propria em vez de mais um painel da UIScene por dois motivos:
 * a UIScene ja passa de mil linhas, e o PC tem input proprio (o desktop e cada
 * app tratam teclado do seu jeito). Enquanto ele esta aberto a UIScene fica com
 * input DESLIGADO — e isso, mais `UIScene.bloqueado`, que congela o movimento
 * do player e o relogio, exatamente como o dialogo ja fazia.
 *
 * Quem abre e a `UIScene.abrirComputador`, chamada pela FarmScene quando o
 * jogador aciona o objeto de classe `computador`.
 */
export class ComputadorScene extends Phaser.Scene {
  private apps: AppDoPc[] = [];
  private janela!: JanelaApp;
  private cursor = 0;

  private desktop!: Phaser.GameObjects.Container;
  private celulas: {
    fundo: Phaser.GameObjects.Rectangle;
    ladrilho: Phaser.GameObjects.Rectangle;
  }[] = [];
  private relogio!: Phaser.GameObjects.Text;
  private saldo!: Phaser.GameObjects.Text;
  private dica!: Phaser.GameObjects.Text;

  /**
   * Trava de UM QUADRO. O mesmo aperto de E que abriu o PC pode ainda estar na
   * fila de input quando esta cena sobe; sem isto ele abriria na hora o
   * primeiro icone do desktop.
   *
   * A trava e contada em quadros, nao em milissegundos: com o rAF estrangulado
   * (aba em segundo plano) uma janela em ms fica aberta por muito mais tempo
   * que o previsto, e o jogador perde as primeiras teclas ao voltar.
   */
  private pronto = false;
  private aceitarPadApos = 0;

  constructor() {
    super({ key: 'ComputadorScene', active: false });
  }

  private get ui(): UIScene {
    return this.scene.get('UIScene') as UIScene;
  }

  create(): void {
    this.aceitarPadApos = this.time.now + 180;
    som.tocar('pc_ligar');
    this.apps = criarApps();
    this.janela = new JanelaApp(this);
    this.cursor = 0;
    this.pronto = false;
    this.time.delayedCall(1, () => {
      this.pronto = true;
    });

    this.desktop = this.montarDesktop();

    const teclado = this.input.keyboard;
    // Tab e usado pelas abas da DevStore; sem capturar, o navegador rouba o foco
    teclado?.addCapture('TAB');
    teclado?.on('keydown', (evento: KeyboardEvent) => this.aoTeclar(evento));

    // a cena sobe por cima de tudo; a do mundo continua desenhando por baixo
    this.scene.bringToTop();
  }

  update(): void {
    for (const [acao, key] of [['cima', 'ArrowUp'], ['baixo', 'ArrowDown'], ['esquerda', 'ArrowLeft'], ['direita', 'ArrowRight'], ['interagir', 'Enter']] as const) {
      if (this.time.now >= this.aceitarPadApos && controles.apertouPad(acao)) this.aoTeclar(new KeyboardEvent('keydown', { key }));
    }
    if (this.time.now >= this.aceitarPadApos && (controles.padVoltar || controles.padPausa)) this.aoTeclar(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (this.janela.aberta) {
      this.janela.atualizar();
      return;
    }
    const agora = `${nomeDoDia(estado.dia)}  ${estado.relogio.texto}`;
    if (this.relogio.text !== agora) this.relogio.setText(agora);
    const carteira = estado.carteira.texto;
    if (this.saldo.text !== carteira) this.saldo.setText(carteira);
  }

  // --------------------------------------------------------------- input --

  private aoTeclar(evento: KeyboardEvent): void {
    if (!this.pronto) return;

    if (this.janela.aberta) {
      // o app tem a primeira palavra: e ele que decide se Esc fecha um card
      // interno (DevStore) ou sai do app
      if (this.janela.teclar(evento)) return;
      if (evento.key === 'Escape') this.voltarAoDesktop();
      return;
    }

    const passo: Record<string, number> = {
      ArrowLeft: -1, a: -1, A: -1,
      ArrowRight: 1, d: 1, D: 1,
      ArrowUp: -ICONES.colunas, w: -ICONES.colunas, W: -ICONES.colunas,
      ArrowDown: ICONES.colunas, s: ICONES.colunas, S: ICONES.colunas,
    };
    if (passo[evento.key] !== undefined) {
      som.tocar('pc_tecla');
      this.mover(passo[evento.key]);
      return;
    }
    if (evento.key === 'e' || evento.key === 'E' || evento.key === 'Enter') {
      this.abrirApp(this.cursor);
      return;
    }
    if (evento.key === 'Escape') this.desligar();
  }

  private mover(passo: number): void {
    this.cursor = Math.min(this.apps.length - 1, Math.max(0, this.cursor + passo));
    this.desenharDesktop();
  }

  // ----------------------------------------------------------- navegacao --

  private abrirApp(indice: number): void {
    const app = this.apps[indice];
    if (!app) return;
    som.tocar('pc_app');
    this.cursor = indice;
    this.desktop.setVisible(false);
    this.janela.abrir(app, () => this.voltarAoDesktop());
  }

  private voltarAoDesktop(): void {
    this.janela.fechar();
    this.desktop.setVisible(true);
    this.desenharDesktop();
  }

  /** Fecha o PC inteiro e devolve o controle do personagem. */
  private desligar(): void {
    this.janela.fechar();
    this.ui.fecharComputador();
  }

  // -------------------------------------------------------------- visual --

  private montarDesktop(): Phaser.GameObjects.Container {
    const filhos: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics();
    filhos.push(g);

    g.fillStyle(PC.fundo, 1);
    g.fillRect(0, 0, CONFIG.largura, CONFIG.altura);
    // faixas diagonais discretas: papel de parede sem custo de asset
    g.lineStyle(1, 0x1a2130, 1);
    for (let x = -CONFIG.altura; x < CONFIG.largura; x += 14) {
      g.lineBetween(x, CONFIG.altura, x + CONFIG.altura, 0);
    }

    caixa(g, { x: 0, y: 0, w: CONFIG.largura, h: BARRA }, PC.painelClaro, PC.borda);
    filhos.push(
      texto(this, 7, 3, 'DevOS', { fontSize: UI.tamanhoTitulo, color: PC.destaque }),
    );
    this.relogio = this.add
      .text(CONFIG.largura - 7, 4, '', {
        fontFamily: UI.fonte,
        fontSize: '9px',
        color: PC.textoFraco,
      })
      .setOrigin(1, 0);
    this.saldo = this.add
      .text(CONFIG.largura - 126, 4, '', {
        fontFamily: UI.fonte,
        fontSize: '9px',
        color: PC.destaque,
      })
      .setOrigin(1, 0);
    filhos.push(this.relogio, this.saldo);

    // --- icones ---
    const larguraGrade =
      ICONES.colunas * ICONES.largura + (ICONES.colunas - 1) * ICONES.gap;
    const x0 = Math.floor((CONFIG.largura - larguraGrade) / 2);

    this.celulas = this.apps.map((app, i) => {
      const col = i % ICONES.colunas;
      const linha = Math.floor(i / ICONES.colunas);
      const x = x0 + col * (ICONES.largura + ICONES.gap);
      const y = ICONES.topo + linha * (ICONES.altura + ICONES.gap);

      const fundo = this.add
        .rectangle(x + ICONES.largura / 2, y + ICONES.altura / 2, ICONES.largura, ICONES.altura, PC.painel)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const ladrilho = this.add
        .rectangle(x + ICONES.largura / 2, y + 27, 40, 40, app.cor)
        .setStrokeStyle(1, PC.borda);
      const glifo = this.add
        .text(x + ICONES.largura / 2, y + 27, app.glifo, {
          fontFamily: UI.fonte,
          fontSize: '20px',
          color: '#ffffff',
        })
        .setOrigin(0.5, 0.5);
      const nome = this.add
        .text(x + ICONES.largura / 2, y + 52, app.titulo, {
          fontFamily: UI.fonte,
          fontSize: '10px',
          color: PC.texto,
        })
        .setOrigin(0.5, 0);
      const resumo = this.add
        .text(x + ICONES.largura / 2, y + 65, encurtar(app.resumo, 17), {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0);

      // so o clique seleciona. Com `pointerover` aqui, o ponteiro parado por
      // cima de um icone sequestrava o cursor assim que o desktop subia, e o
      // [E] seguinte abria o app errado.
      fundo.on('pointerdown', () => this.clicarIcone(i));
      filhos.push(fundo, ladrilho, glifo, nome, resumo);
      return { fundo, ladrilho };
    });

    this.dica = this.add
      .text(CONFIG.largura / 2, CONFIG.altura - 14, '', {
        fontFamily: UI.fonte,
        fontSize: '9px',
        color: PC.textoFraco,
      })
      .setOrigin(0.5, 0);
    filhos.push(this.dica);

    const container = this.add.container(0, 0, filhos).setDepth(10);
    this.desenharDesktop();
    return container;
  }

  /** Um clique so seleciona; o segundo abre — mesmo gesto do teclado. */
  private clicarIcone(indice: number): void {
    if (!this.pronto) return;
    if (this.cursor !== indice) {
      this.cursor = indice;
      this.desenharDesktop();
      return;
    }
    this.abrirApp(indice);
  }

  private desenharDesktop(): void {
    this.celulas.forEach((celula, i) => {
      const ativo = i === this.cursor;
      celula.fundo.setFillStyle(ativo ? 0x2a3550 : PC.painel);
      celula.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      celula.ladrilho.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
    });
    const app = this.apps[this.cursor];
    this.dica.setText(
      `${app.titulo} — ${app.resumo}    [setas] navegar   [E] abrir   [Esc] desligar`,
    );
  }
}

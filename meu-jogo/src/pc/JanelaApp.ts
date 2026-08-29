import type Phaser from 'phaser';
import { CONFIG, UI } from '../game/config.ts';
import { PC, caixa, texto } from './widgets.ts';
import type { AppDoPc, ContextoApp } from './tipos.ts';

/**
 * Geometria da janela. E a MESMA pros sete apps de proposito: e o que faz o PC
 * parecer um sistema operacional em vez de sete telas independentes. Mexer aqui
 * muda todos juntos.
 */
export const JANELA = {
  x: 5,
  y: 5,
  w: CONFIG.largura - 10,
  h: CONFIG.altura - 10,
  /** altura da barra de titulo */
  barra: 17,
  /** respiro entre a moldura e o conteudo */
  margem: 7,
} as const;

/** A area util que sobra pro app depois da barra de titulo e das margens. */
export const AREA_DO_APP = {
  x: JANELA.x + JANELA.margem,
  y: JANELA.y + JANELA.barra + JANELA.margem,
  w: JANELA.w - JANELA.margem * 2,
  h: JANELA.h - JANELA.barra - JANELA.margem * 2,
} as const;

/**
 * A moldura em que TODO app abre: fundo, barra de titulo com o nome do app,
 * botao de voltar e a area de conteudo.
 *
 * A moldura e dona do ciclo de vida do app: ela chama `montar`, guarda o que
 * foi criado e destroi tudo no `fechar`. O app nao precisa saber que existe uma
 * cena por tras.
 */
export class JanelaApp {
  private cena: Phaser.Scene;
  private raiz: Phaser.GameObjects.Container | null = null;
  private app: AppDoPc | null = null;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
  }

  get aberta(): boolean {
    return this.app !== null;
  }

  get appAtual(): AppDoPc | null {
    return this.app;
  }

  /** Abre `app` na moldura. `aoVoltar` e o que o botao "< Voltar" dispara. */
  abrir(app: AppDoPc, aoVoltar: () => void): void {
    this.fechar();
    this.app = app;

    const fundo = this.cena.add.graphics();
    caixa(fundo, JANELA, PC.painel, PC.bordaViva);
    // barra de titulo, um tom acima do corpo
    caixa(
      fundo,
      { x: JANELA.x, y: JANELA.y, w: JANELA.w, h: JANELA.barra },
      PC.painelClaro,
      PC.bordaViva,
    );

    const glifo = texto(this.cena, JANELA.x + 7, JANELA.y + 4, app.glifo, {
      fontSize: UI.tamanho,
      color: PC.destaque,
    });
    const titulo = texto(this.cena, JANELA.x + 24, JANELA.y + 4, app.titulo, {
      fontSize: UI.tamanhoTitulo,
      color: PC.texto,
    });

    // o botao de voltar e clicavel E responde a Esc (tratado na cena do PC)
    const voltar = this.cena.add
      .text(JANELA.x + JANELA.w - 7, JANELA.y + 4, '[Esc] Voltar', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: PC.textoFraco,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    voltar.on('pointerover', () => voltar.setColor(PC.destaque));
    voltar.on('pointerout', () => voltar.setColor(PC.textoFraco));
    voltar.on('pointerdown', aoVoltar);

    const ctx: ContextoApp = { cena: this.cena, area: AREA_DO_APP, voltar: aoVoltar };
    const conteudo = app.montar(ctx);

    this.raiz = this.cena.add
      .container(0, 0, [fundo, glifo, titulo, voltar, ...conteudo])
      .setDepth(20);
  }

  atualizar(): void {
    this.app?.atualizar?.();
  }

  /** Devolve true se o app consumiu a tecla. */
  teclar(evento: KeyboardEvent): boolean {
    return this.app?.aoTeclar?.(evento) ?? false;
  }

  fechar(): void {
    this.app?.aoFechar?.();
    this.raiz?.destroy(true);
    this.raiz = null;
    this.app = null;
  }
}

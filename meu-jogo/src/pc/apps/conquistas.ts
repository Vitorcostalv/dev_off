import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, encurtar, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

import { CONQUISTAS } from '../../game/progressao.ts';
import { estado } from '../../game/estado.ts';

const GRADE = { colunas: 5, gap: 8, largura: 84, altura: 76 };

export class Conquistas implements AppDoPc {
  readonly id = 'conquistas';
  readonly titulo = 'Conquistas';
  readonly glifo = '★';
  readonly cor = 0xc0a03d;
  readonly resumo = 'Trofeus do jogo';

  private cursor = 0;
  private celulas: {
    fundo: Phaser.GameObjects.Rectangle;
    medalha: Phaser.GameObjects.Rectangle;
  }[] = [];
  private rodape!: Phaser.GameObjects.Text;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    const objetos: Phaser.GameObjects.GameObject[] = [];

    objetos.push(
      texto(ctx.cena, area.x, area.y, 'Conquistas', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
      ctx.cena.add
        .text(area.x + area.w, area.y + 1, `${estado.progressao.total} / ${CONQUISTAS.length} desbloqueadas`, {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.textoFraco,
        })
        .setOrigin(1, 0),
    );

    const topo = area.y + 18;
    this.celulas = CONQUISTAS.map((c, i) => {
      const col = i % GRADE.colunas;
      const linha = Math.floor(i / GRADE.colunas);
      const x = area.x + col * (GRADE.largura + GRADE.gap);
      const y = topo + linha * (GRADE.altura + GRADE.gap);

      const fundo = ctx.cena.add
        .rectangle(x + GRADE.largura / 2, y + GRADE.altura / 2, GRADE.largura, GRADE.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      // medalha acinzentada = bloqueada; quando desbloquear, vira a cor do app
      const medalha = ctx.cena.add
        .rectangle(x + GRADE.largura / 2, y + 24, 30, 30, estado.progressao.desbloqueada(c.id) ? this.cor : PC.bloqueado)
        .setStrokeStyle(1, PC.borda);
      const glifo = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 24, c.glifo, {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoNumero,
          color: '#4d5769',
        })
        .setOrigin(0.5, 0.5);
      const titulo = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 44, encurtar(c.titulo, 12), {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0);
      const cadeado = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 57, estado.progressao.desbloqueada(c.id) ? 'CONQUISTADA' : 'Bloqueada', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: '#7d6a4a',
        })
        .setOrigin(0.5, 0);

      fundo.on('pointerdown', () => this.selecionar(i));
      objetos.push(fundo, medalha, glifo, titulo, cadeado);
      return { fundo, medalha };
    });

    this.rodape = texto(ctx.cena, area.x, area.y + area.h - 11, '', { fontSize: UI.tamanhoMiudo });
    objetos.push(this.rodape);

    this.desenhar();
    return objetos;
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const passo: Record<string, number> = {
      ArrowLeft: -1, a: -1, A: -1,
      ArrowRight: 1, d: 1, D: 1,
      ArrowUp: -GRADE.colunas, w: -GRADE.colunas, W: -GRADE.colunas,
      ArrowDown: GRADE.colunas, s: GRADE.colunas, S: GRADE.colunas,
    };
    if (passo[evento.key] === undefined) return false;
    this.selecionar(this.cursor + passo[evento.key]);
    return true;
  }

  private selecionar(indice: number): void {
    this.cursor = Math.min(CONQUISTAS.length - 1, Math.max(0, indice));
    this.desenhar();
  }

  private desenhar(): void {
    this.celulas.forEach((celula, i) => {
      const ativo = i === this.cursor;
      celula.fundo.setFillStyle(ativo ? PC.selecionado : PC.painelClaro);
      celula.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      celula.medalha.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
    });
    const c = CONQUISTAS[this.cursor];
    this.rodape.setColor(PC.textoFraco);
    const data = estado.progressao.desbloqueada(c.id);
    this.rodape.setText(data ? `${c.titulo} - Dia ${data.dia + 1}` : `${c.titulo}: ${c.dica}`);
  }
}

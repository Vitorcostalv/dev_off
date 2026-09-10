import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { estado } from '../../game/estado.ts';
import { LIMITE_DE_ENTRADAS, carimboDe } from '../../game/lixeira.ts';
import { PC, caixa, encurtar, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Lixeira — historico do que o jogador descartou no inventario.
 *
 * A fonte e uma so: `UIScene.descartarSelecionado()` chama
 * `estado.lixeira.registrar()` no mesmo passo em que tira o item do slot. Este
 * app so LE `estado.lixeira` — nao escreve nada.
 *
 * NAO ha recuperacao de item, de proposito. Descartar e uma decisao com peso
 * (o inventario tem 20 slots); poder desfazer tiraria esse peso e transformaria
 * a lixeira num vigesimo-primeiro slot. Se um dia isso mudar, o caminho e
 * `estado.inventario.cabe()` + `adicionar()`, recusando quando nao couber, do
 * mesmo jeito que a compra recusa — nunca escrevendo no slot direto.
 */

const LINHA = { altura: 17, visiveis: 10 };

export class Lixeira implements AppDoPc {
  readonly id = 'lixeira';
  readonly titulo = 'Lixeira';
  readonly glifo = '⊗';
  readonly cor = 0x6b6f78;
  readonly resumo = 'Itens excluidos';

  private topo = 0;
  private confirmando = false;
  private linhas: {
    fundo: Phaser.GameObjects.Rectangle;
    nome: Phaser.GameObjects.Text;
    quando: Phaser.GameObjects.Text;
  }[] = [];
  private vazio!: Phaser.GameObjects.Text;
  private contagem!: Phaser.GameObjects.Text;
  private rodape!: Phaser.GameObjects.Text;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    this.topo = 0;
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    objetos.push(
      texto(ctx.cena, area.x, area.y, 'Descartados', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
    );
    this.contagem = ctx.cena.add
      .text(area.x + area.w, area.y + 1, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoMiudo,
        color: PC.textoFraco,
      })
      .setOrigin(1, 0);
    objetos.push(this.contagem);

    // --- moldura da lista, com cabecalho de tabela ---
    const lista = { x: area.x, y: area.y + 18, w: area.w, h: LINHA.visiveis * LINHA.altura + 17 };
    caixa(g, lista, PC.cova, PC.borda);
    g.lineStyle(1, PC.borda, 0.7);
    g.lineBetween(lista.x, lista.y + 15, lista.x + lista.w, lista.y + 15);

    objetos.push(
      texto(ctx.cena, lista.x + 8, lista.y + 3, 'Item', { fontSize: UI.tamanhoMiudo, color: PC.textoFraco }),
      ctx.cena.add
        .text(lista.x + lista.w - 8, lista.y + 3, 'Descartado em', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.textoFraco,
        })
        .setOrigin(1, 0),
    );

    const topoLinhas = lista.y + 17;
    this.linhas = [];
    for (let i = 0; i < LINHA.visiveis; i++) {
      const y = topoLinhas + i * LINHA.altura;
      const fundo = ctx.cena.add
        .rectangle(lista.x + lista.w / 2, y + LINHA.altura / 2, lista.w - 4, LINHA.altura - 1, PC.painelClaro)
        .setVisible(false);
      const nome = texto(ctx.cena, lista.x + 8, y + 4, '', { fontSize: UI.tamanho });
      const quando = ctx.cena.add
        .text(lista.x + lista.w - 8, y + 4, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.textoFraco,
        })
        .setOrigin(1, 0);
      objetos.push(fundo, nome, quando);
      this.linhas.push({ fundo, nome, quando });
    }

    this.vazio = ctx.cena.add
      .text(lista.x + lista.w / 2, lista.y + lista.h / 2, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: PC.textoFraco,
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    objetos.push(this.vazio);

    this.rodape = texto(ctx.cena, area.x, area.y + area.h - 11, '', { fontSize: UI.tamanhoMiudo });
    objetos.push(this.rodape);

    this.desenhar();
    return objetos;
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    if (evento.key === 'Escape' && this.confirmando) { this.confirmando = false; this.desenhar(); return true; }
    if (evento.key.toLowerCase() === 'e' && !evento.repeat && !estado.lixeira.vazia) {
      if (!this.confirmando) { this.confirmando = true; this.rodape.setText('[E] confirmar limpeza do historico   [Esc] cancelar'); return true; }
      const quantidade = estado.lixeira.lista.length;
      estado.lixeira.restaurar([]); this.confirmando = false; this.topo = 0;
      estado.eventos.emit('TRASH_EMPTIED', { quantidade }); this.desenhar(); return true;
    }
    const passo: Record<string, number> = {
      ArrowUp: -1, w: -1, W: -1,
      ArrowDown: 1, s: 1, S: 1,
      PageUp: -LINHA.visiveis, PageDown: LINHA.visiveis,
    };
    if (passo[evento.key] === undefined) return false;
    this.rolar(passo[evento.key]);
    return true;
  }

  private rolar(passo: number): void {
    const maximo = Math.max(0, estado.lixeira.lista.length - LINHA.visiveis);
    this.topo = Math.min(maximo, Math.max(0, this.topo + passo));
    this.desenhar();
  }

  private desenhar(): void {
    const entradas = estado.lixeira.lista;
    const total = entradas.length;

    this.contagem.setText(`${total} de ${LIMITE_DE_ENTRADAS} registros`);
    this.vazio.setVisible(total === 0);
    if (total === 0) {
      this.vazio.setText(
        'Nenhum item excluido\n\nO que voce descartar no inventario aparece aqui.',
      );
    }

    this.linhas.forEach((linha, i) => {
      const entrada = entradas[this.topo + i];
      const tem = Boolean(entrada);
      // faixa zebrada, so pra a lista longa nao virar um bloco de texto
      linha.fundo.setVisible(tem && i % 2 === 1);
      linha.nome.setVisible(tem);
      linha.quando.setVisible(tem);
      if (!entrada) return;
      linha.nome.setText(
        entrada.qtd > 1
          ? `${encurtar(entrada.nome, 32)}  x${entrada.qtd}`
          : encurtar(entrada.nome, 32),
      );
      linha.quando.setText(carimboDe(entrada));
    });

    this.rodape.setColor(PC.textoFraco);
    this.rodape.setInteractive({ useHandCursor: true });
    if (this.rodape.listenerCount('pointerdown') === 0) this.rodape.on('pointerdown', () => this.aoTeclar({ key: 'e', repeat: false } as KeyboardEvent));
    this.rodape.setText(
      total === 0
        ? 'Sem recuperacao: a lixeira e so historico.'
        : `${this.topo + 1}-${Math.min(total, this.topo + LINHA.visiveis)} de ${total}` +
          `   [W/S] rolar   [E/clique] limpar historico   [Esc] sair`,
    );
  }
}

import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, caixa, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Lixeira — lista do que foi excluido.
 *
 * ===========================================================================
 * SHELL VISUAL. A lista esta vazia porque nada alimenta a lixeira ainda.
 * ===========================================================================
 * ONDE A LOGICA REAL VAI ENTRAR:
 *
 *  1. A lixeira precisa de uma FONTE. O candidato natural e o descarte do
 *     inventario: `UIScene.descartarSelecionado()` hoje chama
 *     `inventario.removerDoSlot()` e o item some pra sempre. Passa a empurrar
 *     `{ id, qtd, dia, hora }` pra uma lista em `game/estado.ts`.
 *  2. Essa lista entra no save (`game/save.ts`) com um teto de itens, senao ela
 *     cresce sem limite ao longo da partida.
 *  3. `restaurar(indice)` devolve o item pelo caminho normal
 *     (`estado.inventario.cabe` + `adicionar`) — e recusa quando nao couber, do
 *     mesmo jeito que a compra recusa.
 *  4. `esvaziar()` limpa a lista; e a unica acao destrutiva, entao pede
 *     confirmacao.
 *
 * Enquanto isso, o app existe pra o icone do desktop nao mentir.
 */

/** Vazia de proposito — ver o cabecalho. */
const EXCLUIDOS: readonly { nome: string; quando: string }[] = [];

export class Lixeira implements AppDoPc {
  readonly id = 'lixeira';
  readonly titulo = 'Lixeira';
  readonly glifo = '⊗';
  readonly cor = 0x6b6f78;
  readonly resumo = 'Itens excluidos';

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    objetos.push(
      texto(ctx.cena, area.x, area.y, 'Lixeira', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
      ctx.cena.add
        .text(area.x + area.w, area.y + 1, `${EXCLUIDOS.length} item(ns)`, {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.textoFraco,
        })
        .setOrigin(1, 0),
    );

    // cabecalho de lista, pra parecer uma tabela de verdade mesmo vazia
    const topo = area.y + 20;
    const lista = { x: area.x, y: topo, w: area.w, h: area.h - 20 - 26 };
    caixa(g, lista, 0x0d1119, PC.borda);
    g.lineStyle(1, PC.borda, 0.7);
    g.lineBetween(lista.x, lista.y + 15, lista.x + lista.w, lista.y + 15);

    objetos.push(
      texto(ctx.cena, lista.x + 8, lista.y + 3, 'Item', { fontSize: '9px', color: PC.textoFraco }),
      ctx.cena.add
        .text(lista.x + lista.w - 8, lista.y + 3, 'Excluido em', {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.textoFraco,
        })
        .setOrigin(1, 0),
      ctx.cena.add
        .text(lista.x + lista.w / 2, lista.y + lista.h / 2 - 8, 'Nenhum item excluido', {
          fontFamily: UI.fonte,
          fontSize: '11px',
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0.5),
      ctx.cena.add
        .text(
          lista.x + lista.w / 2,
          lista.y + lista.h / 2 + 8,
          'O que voce descartar no inventario vai aparecer aqui.',
          { fontFamily: UI.fonte, fontSize: '9px', color: '#4d5769' },
        )
        .setOrigin(0.5, 0.5),
    );

    // botoes desabilitados: mostram o que o app VAI fazer, sem fingir que faz
    const yBotoes = area.y + area.h - 22;
    for (const [i, rotulo] of ['Restaurar', 'Esvaziar lixeira'].entries()) {
      const largura = 104;
      const x = area.x + i * (largura + 8);
      caixa(g, { x, y: yBotoes, w: largura, h: 18 }, PC.bloqueado, PC.borda);
      objetos.push(
        ctx.cena.add
          .text(x + largura / 2, yBotoes + 9, rotulo, {
            fontFamily: UI.fonte,
            fontSize: '9px',
            color: '#4d5769',
          })
          .setOrigin(0.5, 0.5),
      );
    }

    return objetos;
  }
}

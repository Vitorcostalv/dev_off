import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, encurtar, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Conquistas — grade de troféus.
 *
 * ===========================================================================
 * SHELL VISUAL. Todas aparecem bloqueadas: nao existe tracking nenhum.
 * ===========================================================================
 * ONDE A LOGICA REAL VAI ENTRAR:
 *
 *  1. `CONQUISTAS` sai daqui e vira `src/game/conquistas.ts`, com id, titulo,
 *     dica e uma funcao `cumprida(estado): boolean` — assim a regra fica junto
 *     da definicao em vez de espalhada por quem dispara o evento.
 *  2. O conjunto de ids ja desbloqueados mora em `game/estado.ts` (um `Set`,
 *     como `estado.itensColetados` ja faz) e entra no save.
 *  3. Quem avalia e um passo unico — algo como `revisarConquistas()` chamado
 *     depois de compra, de dormir e de trocar de mapa. Nao espalhar
 *     `desbloquear()` por dentro da loja e do inventario: e assim que uma
 *     conquista some quando alguem mexe numa dessas telas.
 *  4. O aviso de "conquista desbloqueada" usa a UIScene (ela ja tem `avisar`),
 *     nao esta cena — a conquista pode cair com o PC fechado.
 */

interface Conquista {
  titulo: string;
  dica: string;
  glifo: string;
}

const CONQUISTAS: readonly Conquista[] = [
  { titulo: 'Primeira compra', dica: 'Compre qualquer coisa no mercado.', glifo: '✦' },
  { titulo: 'Setup montado', dica: 'Tenha teclado, mouse e monitor ao mesmo tempo.', glifo: '▣' },
  { titulo: 'Bom dia, cidade', dica: 'Fale com todos os moradores.', glifo: '☺' },
  { titulo: 'Madrugada', dica: 'Fique acordado ate as 3 da manha.', glifo: '☾' },
  { titulo: 'Colecionador', dica: 'Tenha 20 itens diferentes de uma vez.', glifo: '❖' },
  { titulo: 'Primeiro salario', dica: 'Conclua um trabalho.', glifo: '$' },
  { titulo: 'Semana cheia', dica: 'Jogue sete dias seguidos.', glifo: '▤' },
  { titulo: 'Gastador', dica: 'Gaste mil reais em eletronicos.', glifo: '▲' },
  { titulo: 'Faxina', dica: 'Esvazie a lixeira.', glifo: '⌫' },
  { titulo: 'Jogador', dica: 'Termine um minijogo.', glifo: '◆' },
];

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
        .text(area.x + area.w, area.y + 1, `0 / ${CONQUISTAS.length} desbloqueadas`, {
          fontFamily: UI.fonte,
          fontSize: '9px',
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
        .rectangle(x + GRADE.largura / 2, y + 24, 30, 30, PC.bloqueado)
        .setStrokeStyle(1, PC.borda);
      const glifo = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 24, c.glifo, {
          fontFamily: UI.fonte,
          fontSize: '15px',
          color: '#4d5769',
        })
        .setOrigin(0.5, 0.5);
      const titulo = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 44, encurtar(c.titulo, 12), {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0);
      const cadeado = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 57, '🔒', {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: '#7d6a4a',
        })
        .setOrigin(0.5, 0);

      fundo.on('pointerdown', () => this.selecionar(i));
      objetos.push(fundo, medalha, glifo, titulo, cadeado);
      return { fundo, medalha };
    });

    this.rodape = texto(ctx.cena, area.x, area.y + area.h - 11, '', { fontSize: '9px' });
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
      celula.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
      celula.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      celula.medalha.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
    });
    const c = CONQUISTAS[this.cursor];
    this.rodape.setColor(PC.textoFraco);
    this.rodape.setText(`${c.titulo} — ${c.dica}  (nada e rastreado ainda)`);
  }
}

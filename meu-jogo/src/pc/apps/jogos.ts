import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, encurtar, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Jogos — a biblioteca de minijogos do PC.
 *
 * ===========================================================================
 * SHELL VISUAL. Nenhum jogo existe; todos aparecem com cadeado.
 * ===========================================================================
 * ONDE A LOGICA REAL VAI ENTRAR:
 *
 *  1. Cada minijogo vira uma CENA propria (`src/scenes/minijogos/<nome>.ts`),
 *     lancada por cima da ComputadorScene como a ComputadorScene e lancada por
 *     cima da FarmScene — mesmo padrao, mesma pausa de input.
 *  2. `JOGOS` abaixo ganha um campo `cena: string` com a key dessa cena, e
 *     `abrir()` troca o stub por `ctx.cena.scene.launch(jogo.cena)`.
 *  3. `bloqueado` deixa de ser fixo e passa a consultar o estado (jogo comprado
 *     na DevStore? conquista liberada? dia da semana?), que mora em
 *     `game/estado.ts` e entra no save.
 *  4. Placar/recorde de cada jogo tambem vai pro estado salvo, nao pra ca.
 */

interface JogoDaLista {
  nome: string;
  genero: string;
  glifo: string;
  cor: number;
  /** hoje sempre true — ver o cabecalho */
  bloqueado: boolean;
}

const JOGOS: readonly JogoDaLista[] = [
  { nome: 'Campo Minado', genero: 'Puzzle', glifo: '✳', cor: 0x5a6f92, bloqueado: true },
  { nome: 'Paciencia', genero: 'Cartas', glifo: '♠', cor: 0x4c7a5a, bloqueado: true },
  { nome: 'Cobrinha', genero: 'Arcade', glifo: '§', cor: 0x7a6f45, bloqueado: true },
  { nome: 'Blocos', genero: 'Puzzle', glifo: '▦', cor: 0x7a4f5a, bloqueado: true },
  { nome: 'Corrida 8bits', genero: 'Corrida', glifo: '▲', cor: 0x45607a, bloqueado: true },
  { nome: 'Quiz da Cidade', genero: 'Quiz', glifo: '?', cor: 0x6a5a80, bloqueado: true },
  { nome: 'Datilografia', genero: 'Habilidade', glifo: '⌨', cor: 0x5a7a72, bloqueado: true },
  { nome: 'Xadrez', genero: 'Tabuleiro', glifo: '♜', cor: 0x6f6f6f, bloqueado: true },
];

const GRADE = { colunas: 4, gap: 10, largura: 104, altura: 84 };

export class Jogos implements AppDoPc {
  readonly id = 'jogos';
  readonly titulo = 'Jogos';
  readonly glifo = '◆';
  readonly cor = 0x9a5ac0;
  readonly resumo = 'Minijogos';

  private cursor = 0;
  private celulas: {
    fundo: Phaser.GameObjects.Rectangle;
    ladrilho: Phaser.GameObjects.Rectangle;
    glifoTexto: Phaser.GameObjects.Text;
    nome: Phaser.GameObjects.Text;
    cadeado: Phaser.GameObjects.Text;
  }[] = [];
  private aviso!: Phaser.GameObjects.Text;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    const objetos: Phaser.GameObjects.GameObject[] = [];

    objetos.push(
      texto(ctx.cena, area.x, area.y, 'Biblioteca', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
      texto(ctx.cena, area.x + area.w, area.y + 1, `0 de ${JOGOS.length} instalados`, {
        fontSize: '9px',
        color: PC.textoFraco,
      }).setOrigin(1, 0),
    );

    const topo = area.y + 18;
    this.celulas = JOGOS.map((jogo, i) => {
      const col = i % GRADE.colunas;
      const linha = Math.floor(i / GRADE.colunas);
      const x = area.x + col * (GRADE.largura + GRADE.gap);
      const y = topo + linha * (GRADE.altura + GRADE.gap);

      const fundo = ctx.cena.add
        .rectangle(x + GRADE.largura / 2, y + GRADE.altura / 2, GRADE.largura, GRADE.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });

      // ladrilho acinzentado: e o sinal visual de "bloqueado / em breve"
      const ladrilho = ctx.cena.add
        .rectangle(x + GRADE.largura / 2, y + 26, 38, 38, jogo.bloqueado ? PC.bloqueado : jogo.cor)
        .setStrokeStyle(1, PC.borda);
      const glifoTexto = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 26, jogo.glifo, {
          fontFamily: UI.fonte,
          fontSize: '18px',
          color: jogo.bloqueado ? '#4d5769' : '#ffffff',
        })
        .setOrigin(0.5, 0.5);
      const nome = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 50, encurtar(jogo.nome, 14), {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: jogo.bloqueado ? PC.textoFraco : PC.texto,
        })
        .setOrigin(0.5, 0);
      const cadeado = ctx.cena.add
        .text(x + GRADE.largura / 2, y + 63, jogo.bloqueado ? '🔒 em breve' : jogo.genero, {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: jogo.bloqueado ? '#7d6a4a' : PC.textoFraco,
        })
        .setOrigin(0.5, 0);

      fundo.on('pointerdown', () => this.selecionar(i));
      objetos.push(fundo, ladrilho, glifoTexto, nome, cadeado);
      return { fundo, ladrilho, glifoTexto, nome, cadeado };
    });

    this.aviso = texto(ctx.cena, area.x, area.y + area.h - 11, '', { fontSize: '9px' });
    objetos.push(this.aviso);

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
    if (passo[evento.key] !== undefined) {
      this.selecionar(this.cursor + passo[evento.key]);
      return true;
    }
    if (evento.key === 'e' || evento.key === 'E' || evento.key === 'Enter') {
      this.abrir();
      return true;
    }
    return false;
  }

  private selecionar(indice: number): void {
    this.cursor = Math.min(JOGOS.length - 1, Math.max(0, indice));
    this.desenhar();
  }

  /** Stub. Vira `scene.launch` da cena do minijogo — ver o topo do arquivo. */
  private abrir(): void {
    this.aviso.setColor(PC.alerta);
    this.aviso.setText(`"${JOGOS[this.cursor].nome}" ainda nao foi instalado neste computador.`);
  }

  private desenhar(): void {
    this.celulas.forEach((celula, i) => {
      const ativo = i === this.cursor;
      celula.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
      celula.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
    });
    const jogo = JOGOS[this.cursor];
    this.aviso.setColor(PC.textoFraco);
    this.aviso.setText(`${jogo.nome} — ${jogo.genero}   [setas] navegar   [E] abrir   [Esc] sair`);
  }
}

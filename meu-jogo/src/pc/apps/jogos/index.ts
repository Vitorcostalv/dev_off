import type Phaser from 'phaser';
import { UI } from '../../../game/config.ts';
import { PC, encurtar, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { AppDoPc, ContextoApp } from '../../tipos.ts';
import type { Vista } from '../../vista.ts';
import { JogoDaMemoria } from './memoria.ts';
import { Snake } from './snake.ts';
import { estado } from '../../../game/estado.ts';

/**
 * Jogos — a biblioteca de minijogos do PC.
 *
 * Os dois jogos abrem em tela cheia DENTRO da moldura do PC, como sub-vistas
 * (`Vista`), no mesmo esquema dos minigames do app Trabalho. A diferenca e o
 * que acontece no fim: no Trabalho o resultado vira dinheiro; aqui nao vira
 * nada. Nenhum dos dois toca em `estado.carteira` nem em `estado.inventario`.
 *
 * ---------------------------------------------------------------------------
 * GANCHO FUTURO — recorde
 * ---------------------------------------------------------------------------
 * A pontuacao e da SESSAO: `ultimoResultado` guarda a ultima partida e some ao
 * fechar o PC. Nao ha recorde salvo, de proposito — recorde e um sistema (que
 * numero guardar por jogo, o que fazer com empate, como mostrar) e nao era o
 * pedido desta etapa.
 *
 * Quando entrar, o caminho e o mesmo do resto: um `recordes: Record<string,
 * number>` em `game/estado.ts`, gravado em `game/save.ts` como campo NOVO (sem
 * subir a versao do save — ver o cabecalho de la), e `aoTerminar` abaixo
 * comparando e guardando. O jogo em si nao muda: ele ja devolve o numero.
 */

interface EntradaDeJogo {
  id: string;
  nome: string;
  genero: string;
  glifo: string;
  cor: number;
  criar(app: Jogos): Vista;
  /** como o resultado da partida vira texto no rodape */
  resumo(valores: number[]): string;
}

const JOGOS: readonly EntradaDeJogo[] = [
  {
    id: 'memoria',
    nome: 'Jogo da Memoria',
    genero: 'Puzzle',
    glifo: '❖',
    cor: 0x5a6f92,
    criar: (app) => new JogoDaMemoria((tentativas, segundos) => app.registrar('memoria', [tentativas, segundos])),
    resumo: ([tentativas, segundos]) => `${tentativas} tentativas em ${segundos}s`,
  },
  {
    id: 'snake',
    nome: 'Snake',
    genero: 'Arcade',
    glifo: '§',
    cor: 0x4c7a5a,
    criar: (app) => new Snake((pontos) => app.registrar('snake', [pontos])),
    resumo: ([pontos]) => `${pontos} ponto(s)`,
  },
];

const CELULA = { largura: 150, altura: 108, gap: 14 };

export class Jogos implements AppDoPc {
  readonly id = 'jogos';
  readonly titulo = 'Jogos';
  readonly glifo = '◆';
  readonly cor = 0x9a5ac0;
  readonly resumo = 'Minijogos';

  private cena!: Phaser.Scene;
  private areaDaVista!: Retangulo;
  private raiz!: Phaser.GameObjects.Container;
  private status!: Phaser.GameObjects.Text;

  private jogoAberto: Vista | null = null;
  private cursor = 0;
  /** ultimo resultado de cada jogo NESTA sessao; some ao fechar o PC */
  private ultimoResultado: Record<string, number[]> = {};

  private celulas: {
    fundo: Phaser.GameObjects.Rectangle;
    ladrilho: Phaser.GameObjects.Rectangle;
  }[] = [];

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    this.cena = ctx.cena;
    this.areaDaVista = { x: ctx.area.x, y: ctx.area.y, w: ctx.area.w, h: ctx.area.h - 16 };
    this.jogoAberto = null;
    this.cursor = 0;

    this.raiz = ctx.cena.add.container(0, 0);
    this.status = texto(ctx.cena, ctx.area.x, ctx.area.y + ctx.area.h - 11, '', {
      fontSize: UI.tamanhoMiudo,
      color: PC.textoFraco,
      wordWrap: { width: ctx.area.w },
    });

    this.abrirBiblioteca();
    return [this.raiz, this.status];
  }

  atualizar(): void {
    this.jogoAberto?.atualizar?.();
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    if (this.jogoAberto) {
      if (this.jogoAberto.aoTeclar?.(evento)) return true;
      if (evento.key === 'Escape') {
        this.abrirBiblioteca();
        return true;
      }
      return false;
    }

    const passo: Record<string, number> = {
      ArrowLeft: -1, a: -1, A: -1,
      ArrowRight: 1, d: 1, D: 1,
    };
    if (passo[evento.key] !== undefined) {
      this.selecionar(this.cursor + passo[evento.key]);
      return true;
    }
    if (evento.key === 'e' || evento.key === 'E' || evento.key === 'Enter') {
      this.jogar(this.cursor);
      return true;
    }
    return false;
  }

  /** Chamado pelos jogos ao terminar uma partida. So guarda; nao premia nada. */
  registrar(id: string, valores: number[]): void {
    estado.eventos.emit('MINIGAME_COMPLETED', { id });
    this.ultimoResultado[id] = valores;
  }

  // ------------------------------------------------------- biblioteca --

  private abrirBiblioteca(): void {
    this.raiz.removeAll(true);
    this.jogoAberto = null;

    const cena = this.cena;
    const area = this.areaDaVista;
    this.raiz.add(
      texto(cena, area.x, area.y, 'Biblioteca', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
    );

    const largura = JOGOS.length * CELULA.largura + (JOGOS.length - 1) * CELULA.gap;
    const x0 = area.x + Math.floor((area.w - largura) / 2);
    const y0 = area.y + 34;

    this.celulas = JOGOS.map((jogo, i) => {
      const x = x0 + i * (CELULA.largura + CELULA.gap);
      const fundo = cena.add
        .rectangle(x + CELULA.largura / 2, y0 + CELULA.altura / 2, CELULA.largura, CELULA.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const ladrilho = cena.add
        .rectangle(x + CELULA.largura / 2, y0 + 34, 46, 46, jogo.cor)
        .setStrokeStyle(1, PC.borda);
      const glifo = cena.add
        .text(x + CELULA.largura / 2, y0 + 34, jogo.glifo, {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoGrande,
          color: PC.glifo,
        })
        .setOrigin(0.5, 0.5);
      const nome = cena.add
        .text(x + CELULA.largura / 2, y0 + 64, encurtar(jogo.nome, 20), {
          fontFamily: UI.fonte,
          fontSize: UI.tamanho,
          color: PC.texto,
        })
        .setOrigin(0.5, 0);
      const genero = cena.add
        .text(x + CELULA.largura / 2, y0 + 78, jogo.genero, {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0);
      const ultimo = cena.add
        .text(x + CELULA.largura / 2, y0 + 91, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
          color: PC.destaque,
        })
        .setOrigin(0.5, 0);
      const resultado = this.ultimoResultado[jogo.id];
      if (resultado) ultimo.setText(encurtar(jogo.resumo(resultado), 22));

      fundo.on('pointerdown', () => this.clicar(i));
      for (const o of [fundo, ladrilho, glifo, nome, genero, ultimo]) this.raiz.add(o);
      return { fundo, ladrilho };
    });

    this.desenharBiblioteca();
  }

  private clicar(i: number): void {
    if (this.cursor !== i) {
      this.selecionar(i);
      return;
    }
    this.jogar(i);
  }

  private selecionar(indice: number): void {
    this.cursor = Math.min(JOGOS.length - 1, Math.max(0, indice));
    this.desenharBiblioteca();
  }

  private desenharBiblioteca(): void {
    this.celulas.forEach((celula, i) => {
      const ativo = i === this.cursor;
      celula.fundo.setFillStyle(ativo ? PC.selecionado : PC.painelClaro);
      celula.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      celula.ladrilho.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
    });
    const jogo = JOGOS[this.cursor];
    this.status.setColor(PC.textoFraco);
    // curto de proposito: a linha tem 456 px e a fonte e de 9 px
    this.status.setText(
      `${jogo.genero}. Sem premio.   [setas] escolher   [E] jogar   [Esc] sair`,
    );
  }

  private jogar(indice: number): void {
    const jogo = JOGOS[indice];
    if (!jogo) return;
    this.raiz.removeAll(true);
    this.jogoAberto = jogo.criar(this);
    this.jogoAberto.montar(this.cena, this.raiz, this.areaDaVista);
    this.status.setColor(PC.textoFraco);
    this.status.setText(`${jogo.nome}   [Esc] volta pra biblioteca`);
  }
}

import type Phaser from 'phaser';
import { UI } from '../../../game/config.ts';
import type { Pergunta } from '../../../game/trabalhos.ts';
import { PC, caixa, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';

/**
 * Minigame de COMPLETAR CODIGO: um trecho com uma lacuna e quatro opcoes.
 *
 * A vaga pode ter de 1 a 5 etapas (ver `etapasDeCodigo` em game/trabalhos.ts).
 * Errar uma etapa NAO encerra a vaga: a vista mostra a explicacao, o jogador
 * segue pra proxima e o placar de acertos vai ate o fim.
 *
 * A vista NAO paga nem toca no estado: no fim ela avisa `aoTerminar(acertos,
 * total)` e o app Trabalho decide qual regra de pagamento aplicar.
 */
export class QuizCodigo implements Vista {
  private perguntas: readonly Pergunta[];
  private aoTerminar: (acertos: number, total: number) => void;

  private cena!: Phaser.Scene;
  private raiz!: Phaser.GameObjects.Container;
  private area!: Retangulo;

  private etapa = 0;
  private acertos = 0;
  private cursor = 0;
  private respondida = false;

  private cabecalho!: Phaser.GameObjects.Text;
  private opcoes: {
    fundo: Phaser.GameObjects.Rectangle;
    rotulo: Phaser.GameObjects.Text;
  }[] = [];
  private resultado!: Phaser.GameObjects.Text;

  constructor(perguntas: readonly Pergunta[], aoTerminar: (acertos: number, total: number) => void) {
    this.perguntas = perguntas;
    this.aoTerminar = aoTerminar;
  }

  private get atual(): Pergunta {
    return this.perguntas[this.etapa];
  }

  private get multiEtapas(): boolean {
    return this.perguntas.length > 1;
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    this.cena = cena;
    this.raiz = raiz;
    this.area = area;
    this.desenharEtapa();
  }

  /**
   * Cada etapa redesenha a vista inteira. O trecho de codigo muda de altura de
   * uma pergunta pra outra, entao reaproveitar os objetos exigiria remontar a
   * geometria toda — sai mais simples e mais seguro refazer.
   */
  private desenharEtapa(): void {
    this.raiz.removeAll(true);
    this.opcoes = [];
    this.cursor = 0;
    this.respondida = false;

    const { cena, area } = this;
    const pergunta = this.atual;

    const g = cena.add.graphics();
    this.raiz.add(g);

    // --- contador de etapa (so aparece quando ha mais de uma) ---
    this.cabecalho = cena.add
      .text(area.x + area.w, area.y, '', {
        fontFamily: UI.fonte,
        fontSize: '10px',
        color: PC.textoFraco,
      })
      .setOrigin(1, 0);
    this.cabecalho.setText(
      this.multiEtapas
        ? `Etapa ${this.etapa + 1}/${this.perguntas.length}   acertos: ${this.acertos}`
        : '',
    );
    this.raiz.add(this.cabecalho);

    // --- trecho de codigo, em painel escuro tipo editor ---
    const linhas = pergunta.codigo.split('\n').length;
    const painel = { x: area.x, y: area.y + 14, w: area.w, h: 16 + linhas * 14 };
    caixa(g, painel, 0x0a0d13, PC.borda);
    this.raiz.add(
      cena.add.text(painel.x + 10, painel.y + 8, pergunta.codigo, {
        fontFamily: UI.fonte,
        fontSize: '12px',
        color: '#cfe3ff',
        lineSpacing: 2,
      }),
    );

    const yEnunciado = painel.y + painel.h + 8;
    this.raiz.add(
      texto(cena, area.x, yEnunciado, pergunta.enunciado, {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
        wordWrap: { width: area.w },
      }),
    );

    // --- alternativas ---
    const topo = yEnunciado + 18;
    const alturaOpcao = 19;
    this.opcoes = pergunta.opcoes.map((opcao, i) => {
      const y = topo + i * (alturaOpcao + 4);
      const fundo = cena.add
        .rectangle(area.x + area.w / 2, y + alturaOpcao / 2, area.w, alturaOpcao, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const rotulo = texto(cena, area.x + 10, y + 5, `${i + 1}.  ${opcao}`, { fontSize: '11px' });
      fundo.on('pointerdown', () => this.clicar(i));
      this.raiz.add(fundo);
      this.raiz.add(rotulo);
      return { fundo, rotulo };
    });

    this.resultado = texto(cena, area.x, area.y + area.h - 26, '', {
      fontSize: '10px',
      wordWrap: { width: area.w },
      lineSpacing: 2,
    });
    this.raiz.add(this.resultado);

    this.pintarOpcoes();
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;

    // ja respondeu: a unica tecla que vale e a que avanca
    if (this.respondida) {
      if (k === 'e' || k === 'E' || k === 'Enter') {
        this.avancar();
        return true;
      }
      return false;
    }

    if (k >= '1' && k <= String(this.atual.opcoes.length)) {
      this.escolher(Number(k) - 1);
      this.responder();
      return true;
    }
    const passo: Record<string, number> = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 };
    if (passo[k] !== undefined) {
      this.escolher(this.cursor + passo[k]);
      return true;
    }
    if (k === 'e' || k === 'E' || k === 'Enter') {
      this.responder();
      return true;
    }
    return false;
  }

  private clicar(i: number): void {
    if (this.respondida) {
      this.avancar();
      return;
    }
    // primeiro clique so seleciona, o segundo responde — mesmo gesto do resto
    // do sistema, e evita responder errado por clique perdido
    if (this.cursor !== i) {
      this.escolher(i);
      return;
    }
    this.responder();
  }

  private escolher(i: number): void {
    const total = this.atual.opcoes.length;
    this.cursor = Math.min(total - 1, Math.max(0, i));
    this.pintarOpcoes();
  }

  private responder(): void {
    if (this.respondida) return;
    this.respondida = true;

    const acertou = this.cursor === this.atual.correta;
    if (acertou) this.acertos += 1;
    this.pintarOpcoes();

    const ultima = this.etapa >= this.perguntas.length - 1;
    this.resultado.setColor(acertou ? PC.sucesso : PC.alerta);
    this.resultado.setText(
      `${acertou ? 'Certo.' : 'Errado.'} ${this.atual.explicacao}` +
        (this.multiEtapas ? `\n[E] ${ultima ? 'fechar o trabalho' : 'proxima etapa'}` : ''),
    );

    // vaga de etapa unica encerra na hora; multi-etapa espera o [E] pra o
    // jogador conseguir LER a explicacao antes de a tela trocar
    if (!this.multiEtapas) this.terminar();
  }

  private avancar(): void {
    if (this.etapa >= this.perguntas.length - 1) {
      this.terminar();
      return;
    }
    this.etapa += 1;
    this.desenharEtapa();
  }

  private terminar(): void {
    this.aoTerminar(this.acertos, this.perguntas.length);
  }

  private pintarOpcoes(): void {
    this.opcoes.forEach((op, i) => {
      const ativo = i === this.cursor;
      if (!this.respondida) {
        op.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
        op.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
        op.rotulo.setColor(ativo ? PC.destaque : PC.texto);
        return;
      }
      // depois de responder: verde na certa, vermelho so na errada escolhida
      const certa = i === this.atual.correta;
      const escolhidaErrada = ativo && !certa;
      op.fundo.setFillStyle(certa ? 0x25452c : escolhidaErrada ? 0x4a2a2a : PC.painelClaro);
      op.fundo.setStrokeStyle(1, certa ? 0x8ac47a : escolhidaErrada ? 0xc47a7a : PC.borda);
      op.rotulo.setColor(certa ? PC.sucesso : escolhidaErrada ? PC.alerta : PC.textoFraco);
    });
  }
}

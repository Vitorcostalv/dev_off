import type Phaser from 'phaser';
import { UI } from '../../../game/config.ts';
import type { Pergunta } from '../../../game/trabalhos.ts';
import { PC, caixa, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';

/**
 * Minigame de COMPLETAR CODIGO: um trecho com uma lacuna e quatro opcoes.
 *
 * Uma pergunta so por vaga. E por isso que a regra de pagamento e tudo-ou-nada
 * (ver `pagamentoDeCodigo` em game/trabalhos.ts): com quatro alternativas e meio
 * pagamento por erro, chutar renderia 62,5% do que rende acertar, e ler o codigo
 * viraria perda de tempo.
 *
 * A vista NAO paga nem toca no estado: ela avisa `aoResponder(acertou)` e o app
 * Trabalho decide o resto.
 */
export class QuizCodigo implements Vista {
  private pergunta: Pergunta;
  private aoResponder: (acertou: boolean) => void;

  private cursor = 0;
  private respondida = false;
  private opcoes: {
    fundo: Phaser.GameObjects.Rectangle;
    rotulo: Phaser.GameObjects.Text;
  }[] = [];
  private resultado!: Phaser.GameObjects.Text;

  constructor(pergunta: Pergunta, aoResponder: (acertou: boolean) => void) {
    this.pergunta = pergunta;
    this.aoResponder = aoResponder;
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    const g = cena.add.graphics();
    raiz.add(g);

    // --- trecho de codigo, em painel escuro tipo editor ---
    const linhas = this.pergunta.codigo.split('\n').length;
    const painel = { x: area.x, y: area.y, w: area.w, h: 16 + linhas * 14 };
    caixa(g, painel, 0x0a0d13, PC.borda);
    raiz.add(
      cena.add.text(painel.x + 10, painel.y + 8, this.pergunta.codigo, {
        fontFamily: UI.fonte,
        fontSize: '12px',
        color: '#cfe3ff',
        lineSpacing: 2,
      }),
    );

    const yEnunciado = painel.y + painel.h + 8;
    raiz.add(
      texto(cena, area.x, yEnunciado, this.pergunta.enunciado, {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
    );

    // --- alternativas ---
    const topo = yEnunciado + 18;
    const alturaOpcao = 19;
    this.opcoes = this.pergunta.opcoes.map((opcao, i) => {
      const y = topo + i * (alturaOpcao + 4);
      const fundo = cena.add
        .rectangle(area.x + area.w / 2, y + alturaOpcao / 2, area.w, alturaOpcao, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const rotulo = texto(cena, area.x + 10, y + 5, `${i + 1}.  ${opcao}`, { fontSize: '11px' });
      fundo.on('pointerdown', () => this.clicar(i));
      raiz.add(fundo);
      raiz.add(rotulo);
      return { fundo, rotulo };
    });

    this.resultado = texto(cena, area.x, area.y + area.h - 26, '', {
      fontSize: '10px',
      wordWrap: { width: area.w },
      lineSpacing: 2,
    });
    raiz.add(this.resultado);

    this.desenhar();
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    if (this.respondida) return false;
    const k = evento.key;
    if (k >= '1' && k <= String(this.pergunta.opcoes.length)) {
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
    if (this.respondida) return;
    // primeiro clique so seleciona, o segundo responde — mesmo gesto do resto
    // do sistema, e evita responder errado por clique perdido
    if (this.cursor !== i) {
      this.escolher(i);
      return;
    }
    this.responder();
  }

  private escolher(i: number): void {
    const total = this.pergunta.opcoes.length;
    this.cursor = Math.min(total - 1, Math.max(0, i));
    this.desenhar();
  }

  private responder(): void {
    if (this.respondida) return;
    this.respondida = true;
    const acertou = this.cursor === this.pergunta.correta;
    this.desenhar();
    this.resultado.setColor(acertou ? PC.sucesso : PC.alerta);
    this.resultado.setText(
      `${acertou ? 'Certo.' : 'Errado.'} ${this.pergunta.explicacao}`,
    );
    this.aoResponder(acertou);
  }

  private desenhar(): void {
    this.opcoes.forEach((op, i) => {
      const ativo = i === this.cursor;
      if (!this.respondida) {
        op.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
        op.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
        op.rotulo.setColor(ativo ? PC.destaque : PC.texto);
        return;
      }
      // depois de responder: verde na certa, vermelho so na errada escolhida
      const certa = i === this.pergunta.correta;
      const escolhidaErrada = ativo && !certa;
      op.fundo.setFillStyle(certa ? 0x25452c : escolhidaErrada ? 0x4a2a2a : PC.painelClaro);
      op.fundo.setStrokeStyle(1, certa ? 0x8ac47a : escolhidaErrada ? 0xc47a7a : PC.borda);
      op.rotulo.setColor(certa ? PC.sucesso : escolhidaErrada ? PC.alerta : PC.textoFraco);
    });
  }
}

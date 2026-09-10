import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, caixa, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Calculadora — FUNCIONAL de verdade, nao e shell.
 *
 * Entrou pronta porque uma calculadora de quatro operacoes nao depende de nada
 * do jogo: nao le estado, nao escreve estado, nao toca em dinheiro. Todo o
 * comportamento cabe nas tres variaveis de acumulador abaixo.
 *
 * (Se um dia ela precisar conversar com o jogo — somar o valor do inventario,
 * por exemplo — o lugar e um botao novo lendo `estado`, sem mexer nesta
 * maquina de estados.)
 */

type Operacao = '+' | '-' | '*' | '/';

const TECLAS: readonly (readonly string[])[] = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

/** Rotulo bonito -> operacao real. */
const SIMBOLO: Record<string, Operacao> = { '÷': '/', '×': '*', '−': '-', '+': '+' };

const DIGITOS_MAXIMOS = 12;

export class Calculadora implements AppDoPc {
  readonly id = 'calculadora';
  readonly titulo = 'Calculadora';
  readonly glifo = '=';
  readonly cor = 0x8a6a3d;
  readonly resumo = 'Quatro operacoes';

  private visor = '0';
  private acumulado: number | null = null;
  private operacao: Operacao | null = null;
  /** true quando a proxima tecla de digito comeca um numero novo */
  private reiniciar = true;
  private erro = false;

  private display!: Phaser.GameObjects.Text;
  private memoria!: Phaser.GameObjects.Text;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    // a calculadora e estreita: fica centrada, com espaco pra respirar
    const largura = 208;
    const x = area.x + Math.floor((area.w - largura) / 2);

    caixa(g, { x, y: area.y, w: largura, h: 40 }, PC.cova, PC.borda);
    this.memoria = ctx.cena.add
      .text(x + largura - 8, area.y + 5, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoMiudo,
        color: PC.textoFraco,
      })
      .setOrigin(1, 0);
    this.display = ctx.cena.add
      .text(x + largura - 8, area.y + 17, '0', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoGrande,
        color: PC.texto,
      })
      .setOrigin(1, 0);
    objetos.push(this.memoria, this.display);

    // --- teclado ---
    const gap = 5;
    const larguraTecla = Math.floor((largura - 3 * gap) / 4);
    const alturaTecla = 24;
    const topo = area.y + 48;

    TECLAS.forEach((linha, l) => {
      linha.forEach((rotulo, c) => {
        const tx = x + c * (larguraTecla + gap);
        const ty = topo + l * (alturaTecla + gap);
        const operador = rotulo in SIMBOLO || rotulo === '=';
        const fundo = ctx.cena.add
          .rectangle(
            tx + larguraTecla / 2,
            ty + alturaTecla / 2,
            larguraTecla,
            alturaTecla,
            operador ? 0x2f4664 : PC.painelClaro,
          )
          .setStrokeStyle(1, PC.borda)
          .setInteractive({ useHandCursor: true });
        const legenda = ctx.cena.add
          .text(tx + larguraTecla / 2, ty + alturaTecla / 2, rotulo, {
            fontFamily: UI.fonte,
            fontSize: UI.tamanhoNome,
            color: operador ? PC.destaque : PC.texto,
          })
          .setOrigin(0.5, 0.5);
        fundo.on('pointerdown', () => this.apertar(rotulo));
        fundo.on('pointerover', () => fundo.setStrokeStyle(1, PC.bordaViva));
        fundo.on('pointerout', () => fundo.setStrokeStyle(1, PC.borda));
        objetos.push(fundo, legenda);
      });
    });

    objetos.push(
      texto(
        ctx.cena,
        area.x,
        area.y + area.h - 11,
        'Funciona pelo teclado tambem: numeros, + - * /, Enter, Backspace, C.',
        { fontSize: UI.tamanhoMiudo, color: PC.textoFraco },
      ),
    );

    return objetos;
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;
    if (k >= '0' && k <= '9') return this.apertar(k);
    if (k === '.' || k === ',') return this.apertar('.');
    if (k === '+' || k === '-' || k === '*' || k === '/') {
      const rotulo = Object.keys(SIMBOLO).find((r) => SIMBOLO[r] === k);
      return rotulo ? this.apertar(rotulo) : false;
    }
    if (k === 'Enter' || k === '=') return this.apertar('=');
    if (k === 'Backspace') return this.apertar('⌫');
    if (k === 'c' || k === 'C' || k === 'Delete') return this.apertar('C');
    if (k === '%') return this.apertar('%');
    return false;
  }

  // ------------------------------------------------------------- maquina --

  private apertar(rotulo: string): boolean {
    if (rotulo === 'C') this.limpar();
    else if (rotulo === '⌫') this.apagarDigito();
    else if (rotulo === '±') this.inverterSinal();
    else if (rotulo === '%') this.percentual();
    else if (rotulo === '=') this.igual();
    else if (rotulo in SIMBOLO) this.acumularCom(SIMBOLO[rotulo]);
    else if (rotulo === '.') this.digitarPonto();
    else this.digitar(rotulo);
    this.desenhar();
    return true;
  }

  private limpar(): void {
    this.visor = '0';
    this.acumulado = null;
    this.operacao = null;
    this.reiniciar = true;
    this.erro = false;
  }

  private digitar(digito: string): void {
    if (this.erro) this.limpar();
    if (this.reiniciar) {
      this.visor = digito;
      this.reiniciar = false;
      return;
    }
    if (this.visor === '0') {
      this.visor = digito;
      return;
    }
    // conta o digito, nao o comprimento: sinal e ponto nao ocupam casa
    if (this.visor.replace(/[-.]/g, '').length >= DIGITOS_MAXIMOS) return;
    this.visor += digito;
  }

  private digitarPonto(): void {
    if (this.erro) this.limpar();
    if (this.reiniciar) {
      this.visor = '0.';
      this.reiniciar = false;
      return;
    }
    if (!this.visor.includes('.')) this.visor += '.';
  }

  private apagarDigito(): void {
    if (this.erro || this.reiniciar) return;
    this.visor = this.visor.length <= 1 ? '0' : this.visor.slice(0, -1);
    if (this.visor === '-') this.visor = '0';
  }

  private inverterSinal(): void {
    if (this.erro || this.visor === '0') return;
    this.visor = this.visor.startsWith('-') ? this.visor.slice(1) : `-${this.visor}`;
  }

  private percentual(): void {
    if (this.erro) return;
    this.visor = this.formatar(this.numero() / 100);
    this.reiniciar = true;
  }

  /**
   * Fecha a conta pendente (se houver) e guarda a proxima operacao. Apertar
   * dois operadores seguidos so troca o operador — nao aplica nada duas vezes,
   * porque `reiniciar` ja esta true e nao houve numero novo no meio.
   */
  private acumularCom(op: Operacao): void {
    if (this.erro) return;
    if (this.operacao !== null && !this.reiniciar) {
      const resultado = this.aplicar();
      if (resultado === null) return;
      this.acumulado = resultado;
      this.visor = this.formatar(resultado);
    } else {
      this.acumulado = this.numero();
    }
    this.operacao = op;
    this.reiniciar = true;
  }

  private igual(): void {
    if (this.erro || this.operacao === null) return;
    const resultado = this.aplicar();
    if (resultado === null) return;
    this.visor = this.formatar(resultado);
    this.acumulado = null;
    this.operacao = null;
    this.reiniciar = true;
  }

  /** Devolve null e entra em erro quando a conta nao existe (divisao por zero). */
  private aplicar(): number | null {
    const a = this.acumulado ?? 0;
    const b = this.numero();
    let r: number;
    switch (this.operacao) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/':
        if (b === 0) {
          this.entrarEmErro();
          return null;
        }
        r = a / b;
        break;
      default:
        return b;
    }
    if (!Number.isFinite(r)) {
      this.entrarEmErro();
      return null;
    }
    return r;
  }

  private entrarEmErro(): void {
    this.erro = true;
    this.visor = 'Erro';
    this.acumulado = null;
    this.operacao = null;
    this.reiniciar = true;
  }

  private numero(): number {
    const n = Number(this.visor);
    return Number.isFinite(n) ? n : 0;
  }

  /** Corta a cauda binaria (0.1+0.2) sem virar notacao cientifica na tela. */
  private formatar(valor: number): string {
    if (Number.isInteger(valor) && Math.abs(valor) < 1e12) return String(valor);
    const texto = valor.toPrecision(DIGITOS_MAXIMOS);
    return String(Number(texto));
  }

  private desenhar(): void {
    this.display.setColor(this.erro ? PC.alerta : PC.texto);
    // numero longo demais encolhe em vez de vazar pra fora do visor
    this.display.setFontSize(this.visor.length > 10 ? '13px' : '18px');
    this.display.setText(this.visor);
    this.memoria.setText(
      this.operacao !== null && this.acumulado !== null
        ? `${this.formatar(this.acumulado)} ${this.operacao}`
        : '',
    );
  }
}

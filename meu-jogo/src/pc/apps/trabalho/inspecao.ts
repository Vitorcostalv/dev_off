import type Phaser from 'phaser';
import { UI } from '../../../game/config.ts';
import { FALHAS, PRECOS, avaliarDiagnostico, falaDoCliente, opcoesDeDiagnostico } from '../../../game/oficina.ts';
import type { Avaliacao, ClienteRecorrente, Falha, Preco, Sintoma } from '../../../game/oficina.ts';
import { PC, caixa, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { Vista } from '../../vista.ts';

export interface ResultadoDaInspecao { falha: Falha; avaliacao: Avaliacao; preco: Preco }

/**
 * INSPEÇÃO — o que acontece antes de abrir o aparelho.
 *
 * Três passos curtos: ouvir o relato do cliente, dizer qual é a falha entre
 * quatro hipóteses e combinar o preço. Nenhum passo pode ser perdido: errar o
 * diagnóstico não cancela o serviço, só muda o pagamento e o texto.
 *
 * Como as outras vistas, esta não paga e não toca no estado — ela devolve a
 * escolha em `aoConcluir` e o app Trabalho decide o resto.
 */
type Passo = 'diagnostico' | 'preco';

export class InspecaoConserto implements Vista {
  private cliente: ClienteRecorrente;
  private visitas: number;
  private sintoma: Sintoma;
  private hipoteses: Falha[];
  private aoConcluir: (r: ResultadoDaInspecao) => void;

  private cena!: Phaser.Scene;
  private raiz!: Phaser.GameObjects.Container;
  private area!: Retangulo;

  private passo: Passo = 'diagnostico';
  private cursor = 0;
  private escolhida: Falha | null = null;
  private avaliacao: Avaliacao | null = null;
  private respondido = false;
  private opcoes: { fundo: Phaser.GameObjects.Rectangle; rotulo: Phaser.GameObjects.Text }[] = [];
  private resultado!: Phaser.GameObjects.Text;

  constructor(
    cliente: ClienteRecorrente,
    visitas: number,
    sintoma: Sintoma,
    idVaga: string,
    dia: number,
    aoConcluir: (r: ResultadoDaInspecao) => void,
  ) {
    this.cliente = cliente;
    this.visitas = visitas;
    this.sintoma = sintoma;
    this.hipoteses = opcoesDeDiagnostico(sintoma, idVaga, dia);
    this.aoConcluir = aoConcluir;
  }

  private get listaAtual(): string[] {
    return this.passo === 'diagnostico'
      ? this.hipoteses.map(f => FALHAS[f].nome)
      : (['baixo', 'justo', 'alto'] as Preco[]).map(p => PRECOS[p].nome);
  }

  montar(cena: Phaser.Scene, raiz: Phaser.GameObjects.Container, area: Retangulo): void {
    this.cena = cena;
    this.raiz = raiz;
    this.area = area;
    this.desenhar();
  }

  private desenhar(): void {
    this.raiz.removeAll(true);
    this.opcoes = [];
    this.cursor = 0;
    const { cena, area } = this;
    const g = cena.add.graphics();
    this.raiz.add(g);

    // --- quem é o cliente e o que ele conta ---
    const visita = this.visitas > 0 ? `${this.visitas + 1}ª visita` : 'primeira visita';
    const painel = { x: area.x, y: area.y, w: area.w, h: 92 };
    caixa(g, painel, 0x0a0d13, PC.borda);
    this.raiz.add(texto(cena, painel.x + 8, painel.y + 5, `${this.cliente.nome} · ${visita}`, { fontSize: UI.tamanhoTitulo, color: PC.destaque }));
    this.raiz.add(texto(cena, painel.x + 8, painel.y + 21, `"${this.sintoma.relato}"`, { fontSize: UI.tamanho, wordWrap: { width: painel.w - 16 } }));
    // No passo do preço as pistas já fizeram o trabalho delas, e o lugar passa
    // a ser da história de quem trouxe o aparelho.
    const rodape = this.passo === 'diagnostico'
      ? this.sintoma.pistas.map(p => `· ${p}`).join('\n')
      : `${this.cliente.nome}: "${falaDoCliente(this.cliente, this.visitas)}"`;
    this.raiz.add(texto(cena, painel.x + 8, painel.y + 51, rodape, {
      fontSize: UI.tamanhoMiudo, color: PC.textoFraco, lineSpacing: 1, wordWrap: { width: painel.w - 16 },
    }));

    const pergunta = this.passo === 'diagnostico' ? 'Qual é a falha?' : 'Quanto cobrar por este serviço?';
    const yPergunta = painel.y + painel.h + 6;
    this.raiz.add(texto(cena, area.x, yPergunta, pergunta, { fontSize: UI.tamanhoTitulo, color: PC.destaque }));

    const topo = yPergunta + 17;
    const altura = 18;
    this.opcoes = this.listaAtual.map((rotuloTexto, i) => {
      const y = topo + i * (altura + 3);
      const fundo = cena.add
        .rectangle(area.x + area.w / 2, y + altura / 2, area.w, altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const rotulo = texto(cena, area.x + 10, y + 4, `${i + 1}.  ${rotuloTexto}`, { fontSize: UI.tamanho });
      fundo.on('pointerdown', () => this.clicar(i));
      this.raiz.add(fundo);
      this.raiz.add(rotulo);
      return { fundo, rotulo };
    });

    // O resultado nasce logo abaixo da ultima opcao: ancorar no rodape fazia
    // o texto do diagnostico cair por cima da quarta hipotese.
    const yResultado = topo + this.listaAtual.length * (altura + 3) + 6;
    this.resultado = texto(cena, area.x, yResultado, '', { fontSize: UI.tamanho, wordWrap: { width: area.w }, lineSpacing: 2 });
    this.raiz.add(this.resultado);
    if (this.passo === 'preco' && this.avaliacao) {
      this.resultado.setColor(this.avaliacao.certo ? PC.sucesso : PC.alerta).setText(this.avaliacao.texto);
    }
    this.pintar();
  }

  private pintar(): void {
    this.opcoes.forEach((o, i) => {
      const alvo = i === this.cursor;
      o.fundo.setFillStyle(alvo ? PC.selecionado : PC.painelClaro);
      o.rotulo.setColor(alvo ? PC.destaque : PC.texto);
    });
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;
    if (this.respondido) return false;
    if (k >= '1' && k <= String(this.listaAtual.length)) {
      this.mover(Number(k) - 1);
      this.confirmar();
      return true;
    }
    const passo: Record<string, number> = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 };
    if (passo[k] !== undefined) { this.mover(this.cursor + passo[k]); return true; }
    if (k === 'e' || k === 'E' || k === 'Enter') { this.confirmar(); return true; }
    return false;
  }

  private clicar(i: number): void {
    if (this.cursor !== i) { this.mover(i); return; }
    this.confirmar();
  }

  private mover(i: number): void {
    this.cursor = Math.min(this.listaAtual.length - 1, Math.max(0, i));
    this.pintar();
  }

  private confirmar(): void {
    if (this.respondido) return;
    if (this.passo === 'diagnostico') {
      this.escolhida = this.hipoteses[this.cursor]!;
      this.avaliacao = avaliarDiagnostico(this.sintoma, this.escolhida);
      this.passo = 'preco';
      this.desenhar();
      return;
    }
    this.respondido = true;
    const preco = (['baixo', 'justo', 'alto'] as Preco[])[this.cursor]!;
    this.aoConcluir({ falha: this.escolhida!, avaliacao: this.avaliacao!, preco });
  }
}

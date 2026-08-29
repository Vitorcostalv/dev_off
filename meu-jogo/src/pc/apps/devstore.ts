import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { formatarDinheiro } from '../../game/dinheiro.ts';
import { estado } from '../../game/estado.ts';
import { CATALOGO_ITENS, SECOES_ELETRONICO } from '../../game/itens.ts';
import type { DefinicaoItemLoja, SecaoEletronico } from '../../game/itens.ts';
import { LIMITE_POR_COMPRA, comprar, quantidadeViavel } from '../../game/loja.ts';
import { PC, ajustarIcone, caixa, encurtar, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * DevStore — a loja online do computador.
 *
 * Diferencas de proposito pra loja fisica do mercado (`UIScene.abrirLoja`):
 * vitrine em GRADE com icone grande em vez de lista de texto, filtro por SECAO
 * em abas em vez de ciclo de prateleira, e um card de produto com seletor de
 * quantidade antes de comprar.
 *
 * O que NAO e diferente, e nao pode ser: o dinheiro. A compra passa inteira por
 * `comprar()` de game/loja.ts, que delega pra `Carteira.gastar` com a `Entrega`
 * do inventario — o mesmo confere-tudo-antes-de-aplicar. Nao ha nenhuma conta
 * de saldo neste arquivo, so leitura pra mostrar na tela.
 */

/** Grade da vitrine. 5 x 2 cartoes por pagina; o resto rola. */
const GRADE = { colunas: 5, linhas: 2, gap: 8, alturaCartao: 84 };
const ABAS = { colunas: 7, altura: 13, gap: 4, gapLinha: 3 };
const RODAPE = 12;
/** borda do botao de comprar; PC.sucesso e string de CSS, nao serve em stroke */
const VERDE_BOTAO = 0x8ac47a;

/** Uma aba do filtro: `null` e "Tudo". */
interface Aba {
  id: SecaoEletronico | null;
  rotulo: string;
}

const ABAS_DISPONIVEIS: readonly Aba[] = [
  { id: null, rotulo: 'Tudo' },
  ...SECOES_ELETRONICO.map((s) => ({ id: s.id, rotulo: s.aba })),
];

/**
 * O que a DevStore vende. Filtra SEMPRE por `categoria === 'eletronico'`, nao
 * por "o que nao e comida": se um dia entrar um item nao-alimenticio na
 * categoria `normal`, ele continua fora daqui sem ninguem precisar lembrar.
 */
function catalogoDaLoja(): DefinicaoItemLoja[] {
  return CATALOGO_ITENS.filter((i) => i.categoria === 'eletronico');
}

interface Cartao {
  fundo: Phaser.GameObjects.Rectangle;
  icone: Phaser.GameObjects.Image;
  nome: Phaser.GameObjects.Text;
  preco: Phaser.GameObjects.Text;
}

export class DevStore implements AppDoPc {
  readonly id = 'devstore';
  readonly titulo = 'DevStore';
  readonly glifo = '■';
  readonly cor = 0x3d7dd6;
  readonly resumo = 'Loja online';

  private itens: DefinicaoItemLoja[] = [];
  private aba = 0;
  private cursor = 0;
  /** primeira LINHA visivel da grade */
  private linhaTopo = 0;

  private abas: { fundo: Phaser.GameObjects.Rectangle; rotulo: Phaser.GameObjects.Text }[] = [];
  private cartoes: Cartao[] = [];
  private rodape!: Phaser.GameObjects.Text;
  private saldo!: Phaser.GameObjects.Text;

  /** card de produto aberto; null = vitrine */
  private produto: DefinicaoItemLoja | null = null;
  private quantidade = 1;
  private card!: Phaser.GameObjects.Container;
  private cardIcone!: Phaser.GameObjects.Image;
  private cardNome!: Phaser.GameObjects.Text;
  private cardSecao!: Phaser.GameObjects.Text;
  private cardTexto!: Phaser.GameObjects.Text;
  private cardQtd!: Phaser.GameObjects.Text;
  private cardTotal!: Phaser.GameObjects.Text;
  private cardAviso!: Phaser.GameObjects.Text;

  private get porPagina(): number {
    return GRADE.colunas * GRADE.linhas;
  }

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    this.aba = 0;
    this.cursor = 0;
    this.linhaTopo = 0;
    this.produto = null;
    this.quantidade = 1;

    const objetos: Phaser.GameObjects.GameObject[] = [];
    const { area } = ctx;
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    // --- abas de secao, em duas fileiras ---
    const larguraAba = Math.floor(
      (area.w - (ABAS.colunas - 1) * ABAS.gap) / ABAS.colunas,
    );
    this.abas = ABAS_DISPONIVEIS.map((item, i) => {
      const col = i % ABAS.colunas;
      const linha = Math.floor(i / ABAS.colunas);
      const x = area.x + col * (larguraAba + ABAS.gap);
      const y = area.y + linha * (ABAS.altura + ABAS.gapLinha);
      const fundo = ctx.cena.add
        .rectangle(x + larguraAba / 2, y + ABAS.altura / 2, larguraAba, ABAS.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const rotulo = ctx.cena.add
        .text(x + larguraAba / 2, y + ABAS.altura / 2, encurtar(item.rotulo, 9), {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0.5);
      fundo.on('pointerdown', () => this.trocarAba(i));
      objetos.push(fundo, rotulo);
      return { fundo, rotulo };
    });

    // --- grade de produtos ---
    const alturaAbas = 2 * ABAS.altura + ABAS.gapLinha;
    const topoGrade = area.y + alturaAbas + 8;
    const larguraCartao = Math.floor((area.w - (GRADE.colunas - 1) * GRADE.gap) / GRADE.colunas);

    this.cartoes = [];
    for (let i = 0; i < this.porPagina; i++) {
      const col = i % GRADE.colunas;
      const linha = Math.floor(i / GRADE.colunas);
      const x = area.x + col * (larguraCartao + GRADE.gap);
      const y = topoGrade + linha * (GRADE.alturaCartao + GRADE.gap);

      const fundo = ctx.cena.add
        .rectangle(
          x + larguraCartao / 2,
          y + GRADE.alturaCartao / 2,
          larguraCartao,
          GRADE.alturaCartao,
          PC.painelClaro,
        )
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const icone = ctx.cena.add.image(x + larguraCartao / 2, y + 26, 'itens').setVisible(false);
      const nome = ctx.cena.add
        .text(x + larguraCartao / 2, y + 48, '', {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: PC.texto,
          align: 'center',
          wordWrap: { width: larguraCartao - 6 },
        })
        .setOrigin(0.5, 0);
      const preco = ctx.cena.add
        .text(x + larguraCartao / 2, y + GRADE.alturaCartao - 13, '', {
          fontFamily: UI.fonte,
          fontSize: '10px',
          color: PC.destaque,
        })
        .setOrigin(0.5, 0);

      fundo.on('pointerdown', () => this.clicarCartao(i));
      objetos.push(fundo, icone, nome, preco);
      this.cartoes.push({ fundo, icone, nome, preco });
    }

    // --- rodape ---
    const yRodape = area.y + area.h - RODAPE;
    this.rodape = texto(ctx.cena, area.x, yRodape, '', {
      fontSize: '9px',
      color: PC.textoFraco,
    });
    this.saldo = ctx.cena.add
      .text(area.x + area.w, yRodape, '', {
        fontFamily: UI.fonte,
        fontSize: '10px',
        color: PC.destaque,
      })
      .setOrigin(1, 0);
    objetos.push(this.rodape, this.saldo);

    // separador entre a grade e o rodape
    g.lineStyle(1, PC.borda, 0.6);
    g.lineBetween(area.x, yRodape - 5, area.x + area.w, yRodape - 5);

    this.card = this.criarCardDeProduto(ctx);
    objetos.push(this.card);

    this.recarregar();
    return objetos;
  }

  atualizar(): void {
    // so o saldo muda sozinho (nada credita durante a loja, mas fica correto se
    // um dia algo creditar); o resto redesenha por evento
    const saldo = estado.carteira.texto;
    if (this.saldo.text !== saldo) this.saldo.setText(saldo);
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const tecla = evento.key;
    if (this.produto) {
      // com o card aberto, Esc volta pra vitrine em vez de fechar o app
      if (tecla === 'Escape') {
        this.fecharProduto();
        return true;
      }
      if (tecla === 'ArrowLeft' || tecla === 'a' || tecla === 'A') {
        this.mudarQuantidade(-1);
        return true;
      }
      if (tecla === 'ArrowRight' || tecla === 'd' || tecla === 'D') {
        this.mudarQuantidade(1);
        return true;
      }
      if (tecla === 'e' || tecla === 'E' || tecla === 'Enter') {
        this.comprarAtual();
        return true;
      }
      return false;
    }

    if (tecla === 'Tab') {
      this.trocarAba(this.aba + (evento.shiftKey ? -1 : 1));
      return true;
    }
    const passos: Record<string, number> = {
      ArrowLeft: -1,
      a: -1,
      A: -1,
      ArrowRight: 1,
      d: 1,
      D: 1,
      ArrowUp: -GRADE.colunas,
      w: -GRADE.colunas,
      W: -GRADE.colunas,
      ArrowDown: GRADE.colunas,
      s: GRADE.colunas,
      S: GRADE.colunas,
    };
    if (passos[tecla] !== undefined) {
      this.mover(passos[tecla]);
      return true;
    }
    if (tecla === 'e' || tecla === 'E' || tecla === 'Enter') {
      this.abrirProduto(this.itens[this.cursor]);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------- vitrine --

  private trocarAba(indice: number): void {
    if (this.produto) return;
    const total = ABAS_DISPONIVEIS.length;
    this.aba = ((indice % total) + total) % total;
    this.cursor = 0;
    this.linhaTopo = 0;
    this.recarregar();
  }

  private recarregar(): void {
    const secao = ABAS_DISPONIVEIS[this.aba].id;
    const todos = catalogoDaLoja();
    this.itens = secao === null ? todos : todos.filter((i) => i.secao === secao);
    this.cursor = Math.min(this.cursor, Math.max(0, this.itens.length - 1));
    this.ajustarRolagem();
    this.desenhar();
  }

  private mover(passo: number): void {
    if (this.itens.length === 0) return;
    this.cursor = Math.min(this.itens.length - 1, Math.max(0, this.cursor + passo));
    this.ajustarRolagem();
    this.desenhar();
  }

  /** Arrasta a janela de linhas o minimo necessario pro cursor caber nela. */
  private ajustarRolagem(): void {
    const linhaDoCursor = Math.floor(this.cursor / GRADE.colunas);
    if (linhaDoCursor < this.linhaTopo) this.linhaTopo = linhaDoCursor;
    if (linhaDoCursor >= this.linhaTopo + GRADE.linhas) {
      this.linhaTopo = linhaDoCursor - GRADE.linhas + 1;
    }
  }

  private clicarCartao(slot: number): void {
    const indice = this.linhaTopo * GRADE.colunas + slot;
    const item = this.itens[indice];
    if (!item) return;
    // primeiro clique so seleciona; e o mesmo gesto do teclado (mover, abrir)
    if (this.cursor !== indice) {
      this.cursor = indice;
      this.desenhar();
      return;
    }
    this.abrirProduto(item);
  }

  private desenhar(): void {
    this.abas.forEach((aba, i) => {
      const ativo = i === this.aba;
      aba.fundo.setFillStyle(ativo ? PC.bordaViva : PC.painelClaro);
      aba.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      aba.rotulo.setColor(ativo ? '#0e1420' : PC.textoFraco);
    });

    const inicio = this.linhaTopo * GRADE.colunas;
    this.cartoes.forEach((cartao, slot) => {
      const indice = inicio + slot;
      const item = this.itens[indice];
      cartao.fundo.setVisible(Boolean(item));
      cartao.icone.setVisible(Boolean(item));
      cartao.nome.setVisible(Boolean(item));
      cartao.preco.setVisible(Boolean(item));
      if (!item) return;

      const ativo = indice === this.cursor;
      cartao.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      cartao.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
      cartao.icone.setFrame(item.frame);
      ajustarIcone(cartao.icone, 34);
      const tem = estado.inventario.contar(item.id);
      cartao.nome.setText(tem > 0 ? `${item.nome} (${tem})` : item.nome);
      // o que o saldo nao cobre ja sai em cor de alerta, antes de tentar
      cartao.preco.setColor(estado.carteira.temSaldo(item.preco) ? PC.destaque : PC.alerta);
      cartao.preco.setText(formatarDinheiro(item.preco));
    });

    const total = this.itens.length;
    const mostrando = Math.min(total, inicio + this.porPagina);
    this.rodape.setText(
      total === 0
        ? 'Nenhum produto nesta secao.'
        : `${inicio + 1}-${mostrando} de ${total}   [setas] navegar   [E] abrir   [Tab] secao   [Esc] sair`,
    );
    this.saldo.setText(estado.carteira.texto);
  }

  // -------------------------------------------------------- card produto --

  private abrirProduto(item: DefinicaoItemLoja | undefined): void {
    if (!item) return;
    this.produto = item;
    // abre ja numa quantidade que da pra levar, pra ninguem tentar e falhar
    this.quantidade = Math.max(1, Math.min(quantidadeViavel(item.id), 1));
    this.cardAviso.setText('');
    this.card.setVisible(true);
    this.desenharProduto();
  }

  private fecharProduto(): void {
    this.produto = null;
    this.card.setVisible(false);
    this.desenhar();
  }

  private mudarQuantidade(passo: number): void {
    if (!this.produto) return;
    const teto = Math.max(1, Math.min(LIMITE_POR_COMPRA, quantidadeViavel(this.produto.id) || 1));
    this.quantidade = Math.min(teto, Math.max(1, this.quantidade + passo));
    this.cardAviso.setText('');
    this.desenharProduto();
  }

  /**
   * Compra o que esta no card. As duas recusas previsiveis viram aviso ANTES de
   * chamar `comprar()` — nao pra proteger o dinheiro (a carteira ja protege),
   * mas pra dar a mensagem certa em vez de um "recusado" generico.
   */
  private comprarAtual(): void {
    const item = this.produto;
    if (!item) return;
    const qtd = this.quantidade;
    const total = item.preco * qtd;

    if (!estado.carteira.temSaldo(total)) {
      this.avisar(
        `Saldo insuficiente: faltam ${formatarDinheiro(total - estado.carteira.saldo)}.`,
        PC.alerta,
      );
      return;
    }
    if (!estado.inventario.cabe(item.id, qtd)) {
      this.avisar('Inventario cheio: nao cabe essa quantidade.', PC.alerta);
      return;
    }

    const r = comprar(item.id, qtd);
    if (r.ok) {
      this.avisar(`Comprou ${item.nome} x${qtd} por ${formatarDinheiro(r.total)}.`, PC.sucesso);
      this.quantidade = 1;
      this.desenharProduto();
      this.desenhar();
      return;
    }
    // Chegar aqui significa que algo mudou entre a checagem e a compra. Em
    // nenhum caso sobrou saldo ou inventario pela metade: `comprar` so aplica
    // quando TUDO passou.
    const motivo: Record<string, string> = {
      saldo: 'Saldo insuficiente. Nada foi cobrado.',
      espaco: 'Inventario cheio. Nada foi cobrado.',
      duplicada: 'Compra ja registrada.',
      quantidade: 'Quantidade invalida.',
      item: 'Este produto saiu do catalogo.',
    };
    this.avisar(motivo[r.falha ?? 'item'] ?? 'Compra recusada.', PC.alerta);
    this.desenharProduto();
  }

  private avisar(mensagem: string, cor: string): void {
    this.cardAviso.setColor(cor);
    this.cardAviso.setText(mensagem);
  }

  private desenharProduto(): void {
    const item = this.produto;
    if (!item) return;
    this.cardIcone.setFrame(item.frame);
    ajustarIcone(this.cardIcone, 72);
    this.cardNome.setText(item.nome);
    const secao = SECOES_ELETRONICO.find((s) => s.id === item.secao);
    this.cardSecao.setText(secao ? secao.nome : 'Eletronico');
    const teto = quantidadeViavel(item.id);
    this.cardTexto.setText(
      `${item.descricao}\n\n` +
        `Unidade: ${formatarDinheiro(item.preco)}\n` +
        `Voce tem: ${estado.inventario.contar(item.id)}\n` +
        `Leva agora: ${teto}`,
    );
    this.cardQtd.setText(`x${this.quantidade}`);
    this.cardTotal.setText(formatarDinheiro(item.preco * this.quantidade));
  }

  private criarCardDeProduto(ctx: ContextoApp): Phaser.GameObjects.Container {
    const { area } = ctx;
    const r = { x: area.x, y: area.y, w: area.w, h: area.h - RODAPE - 6 };

    const g = ctx.cena.add.graphics();
    caixa(g, r, PC.painel, PC.bordaViva);
    // moldura do icone, pra ele nao flutuar no vazio
    caixa(g, { x: r.x + 14, y: r.y + 18, w: 88, h: 88 }, 0x0d1119, PC.borda);

    this.cardIcone = ctx.cena.add.image(r.x + 58, r.y + 62, 'itens');

    const xTexto = r.x + 118;
    this.cardNome = texto(ctx.cena, xTexto, r.y + 14, '', {
      fontSize: '12px',
      color: PC.texto,
    });
    this.cardSecao = texto(ctx.cena, xTexto, r.y + 30, '', {
      fontSize: '9px',
      color: PC.destaque,
    });
    this.cardTexto = texto(ctx.cena, xTexto, r.y + 46, '', {
      fontSize: '10px',
      color: PC.textoFraco,
      wordWrap: { width: r.w - 130 },
      lineSpacing: 2,
    });

    // --- seletor de quantidade ---
    const yQtd = r.y + r.h - 40;
    const menos = ctx.cena.add
      .text(r.x + 16, yQtd, '[-]', { fontFamily: UI.fonte, fontSize: '12px', color: PC.texto })
      .setInteractive({ useHandCursor: true });
    menos.on('pointerdown', () => this.mudarQuantidade(-1));
    this.cardQtd = ctx.cena.add
      .text(r.x + 62, yQtd, '', { fontFamily: UI.fonte, fontSize: '12px', color: PC.destaque })
      .setOrigin(0.5, 0);
    const mais = ctx.cena.add
      .text(r.x + 88, yQtd, '[+]', { fontFamily: UI.fonte, fontSize: '12px', color: PC.texto })
      .setInteractive({ useHandCursor: true });
    mais.on('pointerdown', () => this.mudarQuantidade(1));

    this.cardTotal = ctx.cena.add
      .text(r.x + 130, yQtd, '', { fontFamily: UI.fonte, fontSize: '12px', color: PC.texto })
      .setOrigin(0, 0);

    const comprar = ctx.cena.add
      .rectangle(r.x + r.w - 74, yQtd + 7, 120, 20, 0x2f6f3f)
      .setStrokeStyle(1, VERDE_BOTAO)
      .setInteractive({ useHandCursor: true });
    const rotuloComprar = ctx.cena.add
      .text(r.x + r.w - 74, yQtd + 7, 'Comprar  [E]', {
        fontFamily: UI.fonte,
        fontSize: '10px',
        color: '#eaf7e6',
      })
      .setOrigin(0.5, 0.5);
    comprar.on('pointerdown', () => this.comprarAtual());

    this.cardAviso = texto(ctx.cena, r.x + 14, r.y + r.h - 15, '', { fontSize: '9px' });

    const voltar = ctx.cena.add
      .text(r.x + r.w - 10, r.y + 8, '[Esc] voltar a vitrine', {
        fontFamily: UI.fonte,
        fontSize: '9px',
        color: PC.textoFraco,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    voltar.on('pointerdown', () => this.fecharProduto());

    return ctx.cena.add
      .container(0, 0, [
        g,
        this.cardIcone,
        this.cardNome,
        this.cardSecao,
        this.cardTexto,
        menos,
        this.cardQtd,
        mais,
        this.cardTotal,
        comprar,
        rotuloComprar,
        this.cardAviso,
        voltar,
      ])
      .setVisible(false);
  }
}

import Phaser from 'phaser';
import { nomeDoDia } from '../game/calendario';
import { CONFIG, UI } from '../game/config';
import { formatarDinheiro } from '../game/dinheiro';
import { estado } from '../game/estado';
import { ITENS } from '../game/inventario';
import type { DefinicaoItem } from '../game/inventario';
import type { CategoriaItem, DefinicaoItemLoja } from '../game/itens';
import { LIMITE_POR_COMPRA, buscarLoja, comprar, itensDaLoja, quantidadeViavel } from '../game/loja';
import type { PontoDeLoja } from '../game/loja';
import type { Fala, MundoJogavel } from '../game/tipos';

const CAIXA = { x: 8, y: 188, w: CONFIG.largura - 16, h: 74 };
const CONFIRMA = { w: 248, h: 64 };
const INV = {
  colunas: 5,
  linhas: 4,
  slot: 22,
  gap: 3,
  topo: 20,
  margem: 10,
  detalhes: 176,
};

/**
 * Janela da loja. A lista rola: o catalogo tem mais de cem itens, entao o
 * painel mostra `linhas` de cada vez e o cursor arrasta a janela — nada de
 * caber so o que couber na tela.
 */
const LOJA = {
  x: 12,
  y: 14,
  w: CONFIG.largura - 24,
  h: CONFIG.altura - 44,
  margem: 9,
  topo: 30,
  /** quantas linhas do catalogo aparecem por vez */
  linhas: 7,
  alturaLinha: 21,
  /** largura da coluna da lista; o resto e a coluna de detalhe */
  lista: 252,
};

/** Quanto o icone de item ocupa, em px, no slot do inventario e na lista da loja. */
const ICONE = { inventario: INV.slot - 6, loja: 17 };

/**
 * Cena de interface, rodando em paralelo com a cena de mundo.
 * Concentra TODO o input de "acionar" (tecla E e clique) e decide quem trata:
 * confirmacao > dialogo > cena de mundo. Isso evita que o mesmo aperto de E
 * abra e feche algo no mesmo frame.
 */
export class UIScene extends Phaser.Scene {
  private prompt!: Phaser.GameObjects.Text;
  private rotuloAtual: string | null = null;

  private hud!: Phaser.GameObjects.Text;
  private hudSaldo!: Phaser.GameObjects.Text;

  private dialogo!: Phaser.GameObjects.Container;
  private dialogoNome!: Phaser.GameObjects.Text;
  private dialogoTexto!: Phaser.GameObjects.Text;
  private falas: Fala[] = [];
  private indiceFala = 0;
  private aoFimDoDialogo: (() => void) | null = null;

  private confirmacao!: Phaser.GameObjects.Container;
  private confirmacaoTexto!: Phaser.GameObjects.Text;
  private opcoes: Phaser.GameObjects.Text[] = [];
  private indiceOpcao = 0;
  private aoSim: (() => void) | null = null;
  private aoNao: (() => void) | null = null;

  private inventario!: Phaser.GameObjects.Container;
  private icones: Phaser.GameObjects.Rectangle[] = [];
  /** icone de arte do slot; fica escondido nos itens que so tem cor placeholder */
  private sprites: Phaser.GameObjects.Image[] = [];
  private contadores: Phaser.GameObjects.Text[] = [];
  private seletores: Phaser.GameObjects.Rectangle[] = [];
  private itemSelecionado: number | null = null;
  private nomeItem!: Phaser.GameObjects.Text;
  private tipoItem!: Phaser.GameObjects.Text;
  private descricaoItem!: Phaser.GameObjects.Text;
  private avisoInventario!: Phaser.GameObjects.Text;

  /**
   * O PC roda em cena propria (`ComputadorScene`). Aqui so guardamos que ele
   * esta aberto, pra `bloqueado` congelar o player e o relogio e pra esconder a
   * HUD, que ficaria por baixo de uma janela de tela cheia.
   */
  private pcAberto = false;

  private loja!: Phaser.GameObjects.Container;
  private lojaPonto: PontoDeLoja | null = null;
  /** o catalogo do ponto aberto, ja filtrado pela categoria escolhida */
  private lojaItens: DefinicaoItemLoja[] = [];
  /** null = sem filtro; senao, so a categoria escolhida */
  private lojaFiltro: 'normal' | 'eletronico' | null = null;
  private lojaCursor = 0;
  /** primeiro item visivel — e o que faz a lista rolar */
  private lojaTopo = 0;
  private lojaQuantidade = 1;
  private lojaTitulo!: Phaser.GameObjects.Text;
  private lojaSaldo!: Phaser.GameObjects.Text;
  private lojaLinhas: {
    fundo: Phaser.GameObjects.Rectangle;
    icone: Phaser.GameObjects.Image;
    nome: Phaser.GameObjects.Text;
    preco: Phaser.GameObjects.Text;
  }[] = [];
  private lojaRodape!: Phaser.GameObjects.Text;
  private lojaDetalheNome!: Phaser.GameObjects.Text;
  private lojaDetalheTexto!: Phaser.GameObjects.Text;
  private lojaDetalheTotal!: Phaser.GameObjects.Text;
  private lojaAviso!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  /** true quando alguma janela da UI esta capturando o jogo (pausa movimento). */
  get bloqueado(): boolean {
    return (
      this.dialogoAberto ||
      this.confirmacaoAberta ||
      this.inventarioAberto ||
      this.lojaAberta ||
      this.computadorAberto
    );
  }

  get computadorAberto(): boolean {
    return this.pcAberto;
  }

  get lojaAberta(): boolean {
    return this.loja?.visible ?? false;
  }

  /** true enquanto uma janela modal esta por cima das outras. */
  private get modalPorCima(): boolean {
    return this.dialogoAberto || this.confirmacaoAberta;
  }

  get dialogoAberto(): boolean {
    return this.dialogo?.visible ?? false;
  }

  get confirmacaoAberta(): boolean {
    return this.confirmacao?.visible ?? false;
  }

  get inventarioAberto(): boolean {
    return this.inventario?.visible ?? false;
  }

  create(): void {
    this.prompt = this.add
      .text(CONFIG.largura / 2, CONFIG.altura - 24, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.destaque,
        backgroundColor: '#1a1712cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.hud = this.add
      .text(6, 6, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.texto,
        backgroundColor: '#1a1712e0',
        padding: { x: 5, y: 3 },
      })
      .setDepth(90);

    // saldo logo abaixo do relogio, na mesma caixa escura e na cor de destaque:
    // e o unico numero da HUD que o jogador muda, entao le melhor separado
    this.hudSaldo = this.add
      .text(6, 24, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.destaque,
        backgroundColor: '#1a1712e0',
        padding: { x: 5, y: 3 },
      })
      .setDepth(90);

    this.dialogo = this.criarCaixaDeDialogo();
    this.confirmacao = this.criarCaixaDeConfirmacao();
    this.inventario = this.criarPainelDeInventario();
    this.loja = this.criarPainelDeLoja();

    const teclado = this.input.keyboard;
    // sem isso o Tab move o foco do navegador em vez de chegar aqui
    teclado?.addCapture('TAB');
    teclado?.on('keydown-TAB', () => this.alternarInventario());
    teclado?.on('keydown-E', () => this.acionar());
    teclado?.on('keydown-ESC', () => this.cancelar());
    // horizontal: escolhe Sim/Nao na confirmacao ou a quantidade na loja
    teclado?.on('keydown-LEFT', (e: KeyboardEvent) => this.horizontal(-1, e));
    teclado?.on('keydown-RIGHT', (e: KeyboardEvent) => this.horizontal(1, e));
    teclado?.on('keydown-A', (e: KeyboardEvent) => this.horizontal(-1, e));
    teclado?.on('keydown-D', (e: KeyboardEvent) => this.horizontal(1, e));
    // vertical: so a lista da loja usa
    teclado?.on('keydown-UP', () => this.moverListaDaLoja(-1));
    teclado?.on('keydown-DOWN', () => this.moverListaDaLoja(1));
    teclado?.on('keydown-W', () => this.moverListaDaLoja(-1));
    teclado?.on('keydown-S', () => this.moverListaDaLoja(1));
    teclado?.on('keydown-PAGE_UP', () => this.moverListaDaLoja(-LOJA.linhas));
    teclado?.on('keydown-PAGE_DOWN', () => this.moverListaDaLoja(LOJA.linhas));
    teclado?.on('keydown-C', () => this.alternarFiltroDaLoja());
    // acoes do inventario
    teclado?.on('keydown-U', () => this.usarSelecionado());
    teclado?.on('keydown-X', () => this.descartarSelecionado());
    teclado?.on('keydown-O', () => this.organizarInventario());
    this.input.on('pointerdown', () => this.acionar());
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        if (this.lojaAberta && !this.modalPorCima) this.moverListaDaLoja(dy > 0 ? 1 : -1);
      },
    );
  }

  update(): void {
    this.atualizarHud();
    if (this.inventarioAberto) this.desenharInventario();
    if (this.lojaAberta) this.desenharLoja();
  }

  // ----------------------------------------------------------------- hud --

  private atualizarHud(): void {
    // A janela da loja cobre quase a tela toda e ja mostra o saldo no proprio
    // cabecalho; deixar a HUD por baixo so faz a caixa do relogio aparecer
    // cortada pela borda de cima do painel.
    const visivel = !this.lojaAberta && !this.pcAberto;
    this.hud.setVisible(visivel);
    this.hudSaldo.setVisible(visivel);
    if (!visivel) return;

    const texto = `${nomeDoDia(estado.dia)}  ${estado.relogio.texto}`;
    if (this.hud.text !== texto) this.hud.setText(texto);
    const saldo = estado.carteira.texto;
    if (this.hudSaldo.text !== saldo) this.hudSaldo.setText(saldo);
  }

  // -------------------------------------------------------------- prompt --

  /** Mostra "[E] <rotulo>" ou some, se `rotulo` for null. */
  mostrarPrompt(rotulo: string | null): void {
    this.rotuloAtual = rotulo;
    if (this.prompt) this.desenharPrompt();
  }

  private desenharPrompt(): void {
    const visivel = this.rotuloAtual !== null && !this.bloqueado;
    if (visivel) this.prompt.setText(`[E] ${this.rotuloAtual}`);
    this.prompt.setVisible(visivel);
  }

  // ------------------------------------------------------------- dialogo --

  /** Abre a caixa de dialogo com uma sequencia de falas. */
  iniciarDialogo(falas: Fala[], aoFim?: () => void): void {
    if (falas.length === 0) return;
    this.falas = falas;
    this.indiceFala = 0;
    this.aoFimDoDialogo = aoFim ?? null;
    this.dialogo.setVisible(true);
    this.desenharFala();
    this.desenharPrompt();
  }

  private avancarDialogo(): void {
    this.indiceFala += 1;
    if (this.indiceFala >= this.falas.length) {
      this.fecharDialogo();
      return;
    }
    this.desenharFala();
  }

  private fecharDialogo(): void {
    this.dialogo.setVisible(false);
    this.falas = [];
    this.indiceFala = 0;
    const aoFim = this.aoFimDoDialogo;
    this.aoFimDoDialogo = null;
    this.desenharPrompt();
    aoFim?.();
  }

  private desenharFala(): void {
    const fala = this.falas[this.indiceFala];
    this.dialogoNome.setText(fala.nome);
    this.dialogoTexto.setText(fala.texto);
  }

  private criarCaixaDeDialogo(): Phaser.GameObjects.Container {
    const fundo = this.add.graphics();
    fundo.fillStyle(UI.fundo, UI.fundoAlfa);
    fundo.fillRect(CAIXA.x, CAIXA.y, CAIXA.w, CAIXA.h);
    fundo.lineStyle(1, UI.borda, 1);
    fundo.strokeRect(CAIXA.x + 0.5, CAIXA.y + 0.5, CAIXA.w - 1, CAIXA.h - 1);

    this.dialogoNome = this.add.text(CAIXA.x + 8, CAIXA.y + 7, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
    });

    this.dialogoTexto = this.add.text(CAIXA.x + 8, CAIXA.y + 24, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: UI.texto,
      wordWrap: { width: CAIXA.w - 16 },
      lineSpacing: 3,
    });

    const seta = this.add
      .text(CAIXA.x + CAIXA.w - 8, CAIXA.y + CAIXA.h - 6, '[E]', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.textoFraco,
      })
      .setOrigin(1, 1);

    this.tweens.add({ targets: seta, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    return this.add
      .container(0, 0, [fundo, this.dialogoNome, this.dialogoTexto, seta])
      .setDepth(100)
      .setVisible(false);
  }

  // --------------------------------------------------------- confirmacao --

  /** Pergunta Sim/Nao. Setas ou A/D escolhem, E ou clique confirma, ESC cancela. */
  confirmar(texto: string, aoSim: () => void, aoNao?: () => void): void {
    this.confirmacaoTexto.setText(texto);
    this.aoSim = aoSim;
    this.aoNao = aoNao ?? null;
    this.indiceOpcao = 0;
    this.destacarOpcao();
    this.confirmacao.setVisible(true);
    this.desenharPrompt();
  }

  /**
   * Setas/A-D. So um dono por vez: a confirmacao tem prioridade sobre a loja,
   * porque ela e a janela que esta por cima.
   */
  private horizontal(passo: number, evento?: KeyboardEvent): void {
    if (this.confirmacaoAberta) {
      this.moverOpcao(passo);
      return;
    }
    if (this.lojaAberta) this.mudarQuantidade(passo * (evento?.shiftKey ? 10 : 1));
  }

  private moverOpcao(passo: number): void {
    if (!this.confirmacaoAberta) return;
    this.indiceOpcao = (this.indiceOpcao + passo + this.opcoes.length) % this.opcoes.length;
    this.destacarOpcao();
  }

  private destacarOpcao(): void {
    this.opcoes.forEach((op, i) => {
      const ativo = i === this.indiceOpcao;
      const rotulo = op.getData('rotulo') as string;
      op.setColor(ativo ? UI.destaque : UI.textoFraco);
      op.setText(ativo ? `> ${rotulo}` : `  ${rotulo}`);
    });
  }

  private responderConfirmacao(): void {
    const sim = this.indiceOpcao === 0;
    const aoSim = this.aoSim;
    const aoNao = this.aoNao;
    this.fecharConfirmacao();
    if (sim) aoSim?.();
    else aoNao?.();
  }

  private fecharConfirmacao(): void {
    this.confirmacao.setVisible(false);
    this.aoSim = null;
    this.aoNao = null;
    this.desenharPrompt();
  }

  private cancelar(): void {
    if (this.confirmacaoAberta) {
      const aoNao = this.aoNao;
      this.fecharConfirmacao();
      aoNao?.();
      return;
    }
    if (this.lojaAberta) this.fecharLoja();
  }

  private criarCaixaDeConfirmacao(): Phaser.GameObjects.Container {
    const x = (CONFIG.largura - CONFIRMA.w) / 2;
    const y = (CONFIG.altura - CONFIRMA.h) / 2;

    const fundo = this.add.graphics();
    // opaco, nao translucido: esta caixa abre por cima da janela da loja, e
    // qualquer transparencia deixa o texto da lista vazando por tras da pergunta
    fundo.fillStyle(UI.fundo, 1);
    fundo.fillRect(x, y, CONFIRMA.w, CONFIRMA.h);
    fundo.lineStyle(1, UI.borda, 1);
    fundo.strokeRect(x + 0.5, y + 0.5, CONFIRMA.w - 1, CONFIRMA.h - 1);

    this.confirmacaoTexto = this.add
      .text(x + CONFIRMA.w / 2, y + 13, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.texto,
        align: 'center',
        wordWrap: { width: CONFIRMA.w - 16 },
      })
      .setOrigin(0.5, 0);

    this.opcoes = ['Sim', 'Nao'].map((rotulo, i) => {
      const op = this.add
        .text(x + CONFIRMA.w * (i === 0 ? 0.32 : 0.68), y + CONFIRMA.h - 16, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoTitulo,
          color: UI.textoFraco,
        })
        .setOrigin(0.5, 0.5)
        .setData('rotulo', rotulo)
        .setInteractive({ useHandCursor: true });
      // passar o mouse ja seleciona; o clique confirma pelo handler global
      op.on('pointerover', () => {
        this.indiceOpcao = i;
        this.destacarOpcao();
      });
      return op;
    });

    return this.add
      .container(0, 0, [fundo, this.confirmacaoTexto, ...this.opcoes])
      .setDepth(110)
      .setVisible(false);
  }

  // ---------------------------------------------------------- inventario --

  private alternarInventario(): void {
    // nem abre nem fecha por baixo de dialogo/confirmacao: enquanto elas estao
    // na tela sao elas que mandam, e sumir com o inventario embaixo de uma
    // confirmacao de descarte deixaria a pergunta sem contexto
    if (this.modalPorCima) return;
    // a loja ja mostra o que o jogador tem de cada item; abrir os dois juntos
    // so empilharia painel
    if (!this.inventarioAberto && this.lojaAberta) return;
    this.inventario.setVisible(!this.inventarioAberto);
    if (this.inventarioAberto) {
      this.avisoInventario.setText('');
      this.desenharInventario();
    }
    this.desenharPrompt();
  }

  /** Aviso curto no rodape do inventario (usar/descartar/organizar). */
  private avisar(texto: string, cor: string = UI.textoFraco): void {
    this.avisoInventario.setColor(cor);
    this.avisoInventario.setText(texto);
  }

  /** O slot escolhido no painel, ou null se nao ha nada selecionado. */
  private get slotSelecionado(): { indice: number; def: DefinicaoItem; qtd: number } | null {
    if (this.itemSelecionado === null) return null;
    const slot = estado.inventario.slots[this.itemSelecionado];
    const def = slot ? ITENS[slot.id] : undefined;
    if (!slot || !def) return null;
    return { indice: this.itemSelecionado, def, qtd: slot.qtd };
  }

  /**
   * Usa uma unidade do item selecionado.
   *
   * O EFEITO ainda nao existe: nao ha stat de energia/fome pra mexer. O que ha e
   * o fluxo completo — consome a unidade e avisa — pra quando o efeito entrar
   * ser so preencher o trecho marcado abaixo, sem mexer em UI nem em inventario.
   */
  private usarSelecionado(): void {
    if (!this.inventarioAberto || this.modalPorCima) return;
    const alvo = this.slotSelecionado;
    if (!alvo) {
      this.avisar('Selecione um item primeiro.');
      return;
    }
    if (alvo.def.tipo !== 'consumivel') {
      this.avisar(`${alvo.def.nome} nao e consumivel.`, UI.alerta);
      return;
    }
    if (estado.inventario.removerDoSlot(alvo.indice, 1) !== 1) return;

    // TODO(efeito): plugar aqui o efeito real do consumivel — recuperar energia,
    // matar a fome, curar. Enquanto nao ha stat pra mexer, usar so gasta a
    // unidade. O ponto de entrada e este, com `alvo.def` em maos.

    this.avisar(`Voce usou ${alvo.def.nome}.`, UI.sucesso);
    if (estado.inventario.slots[alvo.indice] === null) this.itemSelecionado = null;
    this.desenharInventario();
  }

  /** Joga fora a pilha selecionada. Nao devolve nada ao mundo — some mesmo. */
  private descartarSelecionado(): void {
    if (!this.inventarioAberto || this.modalPorCima) return;
    const alvo = this.slotSelecionado;
    if (!alvo) {
      this.avisar('Selecione um item primeiro.');
      return;
    }
    this.confirmar(`Descartar ${alvo.def.nome} x${alvo.qtd}?`, () => {
      // reconfere no momento de aplicar: entre a pergunta e o Sim o slot pode
      // ter mudado (organizar, usar), e ai o indice guardado ja nao vale
      const agora = estado.inventario.slots[alvo.indice];
      if (agora?.id !== alvo.def.id) {
        this.avisar('O item saiu do slot antes de confirmar.', UI.alerta);
        return;
      }
      const fora = estado.inventario.removerDoSlot(alvo.indice, agora.qtd);
      // o descarte e a UNICA fonte do historico da lixeira; se um dia outro
      // caminho tirar item do inventario pra sempre, ele registra aqui tambem
      estado.lixeira.registrar({
        id: alvo.def.id,
        nome: alvo.def.nome,
        qtd: fora,
        dia: estado.dia,
        minutos: estado.relogio.minutos,
      });
      this.itemSelecionado = null;
      this.avisar(`Descartou ${alvo.def.nome} x${fora}.`, UI.alerta);
      this.desenharInventario();
    });
  }

  /** Junta as pilhas soltas e ordena por tipo. */
  private organizarInventario(): void {
    if (!this.inventarioAberto || this.modalPorCima) return;
    estado.inventario.organizar();
    // os itens trocaram de slot: manter a selecao apontaria pro item errado
    this.itemSelecionado = null;
    this.avisar('Inventario organizado por tipo.', UI.sucesso);
    this.desenharInventario();
  }

  private desenharInventario(): void {
    const slots = estado.inventario.slots;
    for (let i = 0; i < this.icones.length; i++) {
      const slot = slots[i];
      const def = slot ? ITENS[slot.id] : undefined;
      // item com arte propria mostra o frame do atlas; os de teste, que nao tem
      // correspondente nas folhas de item, seguem com o quadrado colorido
      const comArte = Boolean(def?.frame);
      this.icones[i].setVisible(Boolean(def) && !comArte);
      if (def && !comArte) this.icones[i].setFillStyle(def.icone, 1);
      this.sprites[i].setVisible(comArte);
      if (def?.frame) {
        this.sprites[i].setFrame(def.frame);
        ajustarIcone(this.sprites[i], ICONE.inventario);
      }

      const qtd = slot && slot.qtd > 1 ? `x${slot.qtd}` : '';
      if (this.contadores[i].text !== qtd) this.contadores[i].setText(qtd);
      this.seletores[i].setStrokeStyle(
        this.itemSelecionado === i ? 2 : 1,
        this.itemSelecionado === i ? 0xffd97d : UI.borda,
        this.itemSelecionado === i ? 1 : 0.7,
      );
    }

    const slot = this.itemSelecionado === null ? null : slots[this.itemSelecionado];
    const def = slot ? ITENS[slot.id] : undefined;
    this.nomeItem.setText(def && slot ? `${def.nome} x${slot.qtd}` : 'Selecione um item');
    const preco = def?.preco === undefined ? '' : `  ${formatarDinheiro(def.preco)}`;
    this.tipoItem.setText(def ? `Tipo: ${def.tipo}${preco}` : '');
    this.descricaoItem.setText(def?.descricao ?? '');
  }

  private criarPainelDeInventario(): Phaser.GameObjects.Container {
    const passo = INV.slot + INV.gap;
    const grade = {
      w: INV.colunas * passo - INV.gap,
      h: INV.linhas * passo - INV.gap,
    };
    const largura = grade.w + INV.detalhes + INV.margem * 3;
    // +24: as duas linhas de rodape (dicas de tecla e aviso da ultima acao)
    const altura = grade.h + INV.margem * 2 + INV.topo + 24;
    const x = Math.round((CONFIG.largura - largura) / 2);
    const y = Math.round((CONFIG.altura - altura) / 2);

    const fundo = this.add.graphics();
    fundo.fillStyle(UI.fundo, 0.95);
    fundo.fillRect(x, y, largura, altura);
    fundo.lineStyle(1, UI.borda, 1);
    fundo.strokeRect(x + 0.5, y + 0.5, largura - 1, altura - 1);

    const titulo = this.add.text(x + INV.margem, y + 6, 'Inventario', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
    });
    const dica = this.add
      .text(x + largura - INV.margem, y + 7, '[Tab] fechar', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.textoFraco,
      })
      .setOrigin(1, 0);

    const filhos: Phaser.GameObjects.GameObject[] = [fundo, titulo, dica];
    this.icones = [];
    this.contadores = [];
    this.seletores = [];

    for (let i = 0; i < INV.colunas * INV.linhas; i++) {
      const sx = x + INV.margem + (i % INV.colunas) * passo;
      const sy = y + INV.margem + INV.topo + Math.floor(i / INV.colunas) * passo;

      const seletor = this.add
        .rectangle(sx, sy, INV.slot, INV.slot, 0x000000, 0.35)
        .setOrigin(0, 0)
        .setStrokeStyle(1, UI.borda, 0.7)
        .setInteractive({ useHandCursor: true });
      seletor.on('pointerdown', () => {
        this.itemSelecionado = i;
        this.desenharInventario();
      });

      const icone = this.add
        .rectangle(sx + INV.slot / 2, sy + INV.slot / 2, INV.slot - 8, INV.slot - 8, 0xffffff)
        .setVisible(false);
      // icone de arte: mesma posicao do placeholder, so um dos dois aparece
      const sprite = this.add
        .image(sx + INV.slot / 2, sy + INV.slot / 2, 'itens')
        .setVisible(false);
      const contador = this.add
        .text(sx + INV.slot - 2, sy + INV.slot - 2, '', {
          fontFamily: UI.fonte,
          fontSize: '9px',
          color: UI.texto,
        })
        .setOrigin(1, 1);

      this.icones.push(icone);
      this.sprites.push(sprite);
      this.contadores.push(contador);
      this.seletores.push(seletor);
      filhos.push(seletor, icone, sprite, contador);
    }

    const detalhesX = x + INV.margem * 2 + grade.w;
    this.nomeItem = this.add.text(detalhesX, y + INV.margem + INV.topo, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
      wordWrap: { width: INV.detalhes },
    });
    this.tipoItem = this.add.text(detalhesX, y + INV.margem + INV.topo + 22, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: UI.textoFraco,
    });
    this.descricaoItem = this.add.text(detalhesX, y + INV.margem + INV.topo + 42, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: UI.texto,
      wordWrap: { width: INV.detalhes },
      lineSpacing: 3,
    });
    const dicas = this.add.text(
      x + INV.margem,
      y + altura - 22,
      '[U] usar  [X] descartar  [O] organizar',
      { fontFamily: UI.fonte, fontSize: '9px', color: UI.textoFraco },
    );
    this.avisoInventario = this.add.text(x + INV.margem, y + altura - 12, '', {
      fontFamily: UI.fonte,
      fontSize: '9px',
      color: UI.textoFraco,
      wordWrap: { width: largura - INV.margem * 2 },
    });
    filhos.push(this.nomeItem, this.tipoItem, this.descricaoItem, dicas, this.avisoInventario);

    return this.add.container(0, 0, filhos).setDepth(105).setVisible(false);
  }

  // ---------------------------------------------------------------- loja --

  /**
   * Abre a janela de compra de um ponto de loja. Chamada pela FarmScene quando
   * o jogador aciona o balcao.
   */
  abrirLoja(idPonto: string): void {
    const ponto = buscarLoja(idPonto);
    if (!ponto) {
      console.warn(`[ui] ponto de loja "${idPonto}" nao existe`);
      return;
    }
    if (this.modalPorCima) return;
    this.inventario.setVisible(false);
    this.lojaPonto = ponto;
    this.lojaFiltro = null;
    this.lojaCursor = 0;
    this.lojaTopo = 0;
    this.lojaQuantidade = 1;
    this.recarregarCatalogo();
    this.lojaAviso.setText('');
    this.loja.setVisible(true);
    this.desenharLoja();
    this.desenharPrompt();
  }

  private fecharLoja(): void {
    this.loja.setVisible(false);
    this.lojaPonto = null;
    this.lojaItens = [];
    this.desenharPrompt();
  }

  /** Refaz `lojaItens` pelo ponto e pelo filtro, sem perder o item sob o cursor. */
  private recarregarCatalogo(): void {
    if (!this.lojaPonto) return;
    const idAtual = this.lojaItens[this.lojaCursor]?.id;
    const todos = itensDaLoja(this.lojaPonto);
    this.lojaItens = this.lojaFiltro
      ? todos.filter((i) => i.categoria === this.lojaFiltro)
      : todos;
    const volta = idAtual ? this.lojaItens.findIndex((i) => i.id === idAtual) : -1;
    this.lojaCursor = volta >= 0 ? volta : 0;
    this.lojaQuantidade = 1;
    this.ajustarRolagem();
  }

  /** Cicla o filtro de prateleira: tudo -> mercado -> eletronico -> tudo. */
  private alternarFiltroDaLoja(): void {
    if (!this.lojaAberta || this.modalPorCima || !this.lojaPonto) return;
    const ordem: (CategoriaItem | null)[] = [null, ...this.lojaPonto.categorias];
    const atual = ordem.indexOf(this.lojaFiltro);
    this.lojaFiltro = ordem[(atual + 1) % ordem.length] ?? null;
    this.lojaCursor = 0;
    this.lojaTopo = 0;
    this.recarregarCatalogo();
    this.lojaAviso.setText('');
    this.desenharLoja();
  }

  private moverListaDaLoja(passo: number): void {
    if (!this.lojaAberta || this.modalPorCima || this.lojaItens.length === 0) return;
    const ultimo = this.lojaItens.length - 1;
    this.lojaCursor = Math.min(ultimo, Math.max(0, this.lojaCursor + passo));
    this.lojaQuantidade = 1;
    this.lojaAviso.setText('');
    this.ajustarRolagem();
    this.desenharLoja();
  }

  /** Arrasta a janela visivel o minimo necessario pro cursor caber nela. */
  private ajustarRolagem(): void {
    const ultimoTopo = Math.max(0, this.lojaItens.length - LOJA.linhas);
    this.lojaTopo = Math.min(
      ultimoTopo,
      Math.max(this.lojaTopo, this.lojaCursor - LOJA.linhas + 1),
    );
    this.lojaTopo = Math.min(this.lojaTopo, this.lojaCursor);
  }

  private mudarQuantidade(passo: number): void {
    const item = this.lojaItens[this.lojaCursor];
    if (!item) return;
    const teto = Math.max(1, Math.min(LIMITE_POR_COMPRA, quantidadeViavel(item.id) || 1));
    this.lojaQuantidade = Math.min(teto, Math.max(1, this.lojaQuantidade + passo));
    this.lojaAviso.setText('');
    this.desenharLoja();
  }

  /**
   * Pergunta antes de comprar. A compra em si so acontece no "Sim", e passa
   * inteira por `comprar()` — que confere saldo E espaco antes de mexer em
   * qualquer um dos dois.
   */
  private pedirCompra(): void {
    const item = this.lojaItens[this.lojaCursor];
    if (!item) return;
    const qtd = this.lojaQuantidade;
    const total = item.preco * qtd;

    // as duas recusas previsiveis viram aviso na hora: nao ha por que abrir uma
    // confirmacao pra perguntar algo que ja se sabe que vai falhar
    if (!estado.carteira.temSaldo(total)) {
      this.avisoDaLoja(
        `Saldo insuficiente: faltam ${formatarDinheiro(total - estado.carteira.saldo)}.`,
        UI.alerta,
      );
      return;
    }
    if (!estado.inventario.cabe(item.id, qtd)) {
      this.avisoDaLoja('Inventario cheio: nao cabe essa quantidade.', UI.alerta);
      return;
    }

    this.confirmar(`Comprar ${item.nome} x${qtd} por ${formatarDinheiro(total)}?`, () =>
      this.efetivarCompra(item, qtd),
    );
  }

  private efetivarCompra(item: DefinicaoItemLoja, qtd: number): void {
    const r = comprar(item.id, qtd);
    if (r.ok) {
      this.avisoDaLoja(
        `Comprou ${item.nome} x${qtd} por ${formatarDinheiro(r.total)}.`,
        UI.sucesso,
      );
      this.lojaQuantidade = 1;
      this.desenharLoja();
      return;
    }
    // Chegar aqui significa que algo mudou entre a pergunta e o Sim. Em nenhum
    // dos casos sobrou saldo ou inventario pela metade: `comprar` so aplica
    // quando TUDO passou.
    const aviso: Record<string, string> = {
      saldo: 'Saldo insuficiente. Nada foi cobrado.',
      espaco: 'Inventario cheio. Nada foi cobrado.',
      duplicada: 'Compra ja registrada.',
      quantidade: 'Quantidade invalida.',
      item: 'Este item nao esta a venda.',
    };
    this.avisoDaLoja(aviso[r.falha ?? 'item'] ?? 'Compra recusada.', UI.alerta);
    this.desenharLoja();
  }

  private avisoDaLoja(texto: string, cor: string): void {
    this.lojaAviso.setColor(cor);
    this.lojaAviso.setText(texto);
  }

  private desenharLoja(): void {
    if (!this.lojaPonto) return;
    const filtro =
      this.lojaFiltro === null ? 'tudo' : this.lojaFiltro === 'normal' ? 'mercado' : 'eletronico';
    this.lojaTitulo.setText(`${this.lojaPonto.nome} - ${filtro}`);
    this.lojaSaldo.setText(estado.carteira.texto);

    this.lojaLinhas.forEach((linha, i) => {
      const item = this.lojaItens[this.lojaTopo + i];
      const ativo = this.lojaTopo + i === this.lojaCursor;
      linha.fundo.setVisible(Boolean(item));
      linha.fundo.setFillStyle(ativo ? 0x3a3226 : 0x000000, ativo ? 1 : 0.25);
      linha.icone.setVisible(Boolean(item));
      linha.nome.setVisible(Boolean(item));
      linha.preco.setVisible(Boolean(item));
      if (!item) return;

      linha.icone.setFrame(item.frame);
      ajustarIcone(linha.icone, ICONE.loja);
      const tem = estado.inventario.contar(item.id);
      linha.nome.setColor(ativo ? UI.destaque : UI.texto);
      linha.nome.setText(tem > 0 ? `${item.nome}  (tem ${tem})` : item.nome);
      // o que o saldo nao cobre ja aparece na cor de alerta, antes de tentar
      linha.preco.setColor(estado.carteira.temSaldo(item.preco) ? UI.texto : UI.alerta);
      linha.preco.setText(formatarDinheiro(item.preco));
    });

    const total = this.lojaItens.length;
    this.lojaRodape.setText(
      total === 0
        ? 'Nada nesta prateleira.'
        : `${this.lojaCursor + 1}/${total}  [W/S] item  [A/D] qtd  [C] prateleira  [E] comprar  [ESC] sair`,
    );

    const item = this.lojaItens[this.lojaCursor];
    if (!item) {
      this.lojaDetalheNome.setText('');
      this.lojaDetalheTexto.setText('');
      this.lojaDetalheTotal.setText('');
      return;
    }
    const teto = quantidadeViavel(item.id);
    this.lojaDetalheNome.setText(item.nome);
    this.lojaDetalheTexto.setText(
      `${item.descricao}\n\nUnidade: ${formatarDinheiro(item.preco)}\nLeva agora: ${teto}`,
    );
    this.lojaDetalheTotal.setText(
      `x${this.lojaQuantidade}   ${formatarDinheiro(item.preco * this.lojaQuantidade)}`,
    );
  }

  // -------------------------------------------------------- computador --

  /**
   * Liga o computador de casa. Chamada pela FarmScene ao acionar o objeto de
   * classe `computador`.
   *
   * O input DESTA cena e desligado enquanto o PC estiver aberto: assim as
   * teclas de inventario, loja e dialogo nao disparam por baixo de uma janela
   * de tela cheia. `bloqueado` cuida do resto (player parado, relogio parado).
   */
  abrirComputador(): void {
    if (this.modalPorCima || this.pcAberto) return;
    this.inventario.setVisible(false);
    this.loja.setVisible(false);
    this.pcAberto = true;
    this.mostrarPrompt(null);
    this.input.enabled = false;
    if (this.input.keyboard) this.input.keyboard.enabled = false;
    this.scene.launch('ComputadorScene');
  }

  /** Chamada pela ComputadorScene ao desligar. Devolve o controle do player. */
  fecharComputador(): void {
    if (!this.pcAberto) return;
    this.pcAberto = false;
    this.scene.stop('ComputadorScene');
    // UM QUADRO de folga antes de reativar, nao um tempo em ms: o mesmo Esc que
    // fechou o PC ainda pode estar na fila de input deste quadro e cairia aqui
    // como "cancelar". Em ms, um loop com rAF estrangulado (aba em segundo
    // plano) deixaria o input desligado por muito mais tempo que o previsto.
    this.time.delayedCall(1, () => {
      this.input.enabled = true;
      if (this.input.keyboard) this.input.keyboard.enabled = true;
    });
    this.desenharPrompt();
  }

  private criarPainelDeLoja(): Phaser.GameObjects.Container {
    const { x, y, w, h } = LOJA;
    const fundo = this.add.graphics();
    fundo.fillStyle(UI.fundo, 0.96);
    fundo.fillRect(x, y, w, h);
    fundo.lineStyle(1, UI.borda, 1);
    fundo.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // divisa entre a lista e a coluna de detalhe
    const divisa = x + LOJA.margem + LOJA.lista + 5;
    fundo.lineStyle(1, UI.borda, 0.5);
    fundo.lineBetween(divisa, y + LOJA.topo - 6, divisa, y + h - 22);

    this.lojaTitulo = this.add.text(x + LOJA.margem, y + 7, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
    });
    this.lojaSaldo = this.add
      .text(x + w - LOJA.margem, y + 8, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.texto,
      })
      .setOrigin(1, 0);

    const filhos: Phaser.GameObjects.GameObject[] = [fundo, this.lojaTitulo, this.lojaSaldo];
    this.lojaLinhas = [];
    for (let i = 0; i < LOJA.linhas; i++) {
      const ly = y + LOJA.topo + i * LOJA.alturaLinha;
      const alvo = this.add
        .rectangle(x + LOJA.margem, ly, LOJA.lista, LOJA.alturaLinha - 2, 0x000000, 0.25)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      // passar o mouse ja escolhe e o clique confirma pelo handler global — o
      // mesmo arranjo das opcoes Sim/Nao da caixa de confirmacao
      alvo.on('pointerover', () => {
        const indice = this.lojaTopo + i;
        if (indice >= this.lojaItens.length) return;
        this.lojaCursor = indice;
        this.lojaQuantidade = 1;
        this.desenharLoja();
      });

      const icone = this.add
        .image(x + LOJA.margem + 12, ly + LOJA.alturaLinha / 2 - 1, 'itens')
        .setVisible(false);
      const nome = this.add.text(x + LOJA.margem + 26, ly + 4, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.texto,
      });
      const preco = this.add
        .text(x + LOJA.margem + LOJA.lista - 6, ly + 4, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanho,
          color: UI.texto,
        })
        .setOrigin(1, 0);

      this.lojaLinhas.push({ fundo: alvo, icone, nome, preco });
      filhos.push(alvo, icone, nome, preco);
    }

    const dx = divisa + 8;
    const dw = x + w - dx - LOJA.margem;
    this.lojaDetalheNome = this.add.text(dx, y + LOJA.topo, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
      wordWrap: { width: dw },
    });
    this.lojaDetalheTexto = this.add.text(dx, y + LOJA.topo + 24, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: UI.textoFraco,
      wordWrap: { width: dw },
      lineSpacing: 2,
    });
    this.lojaDetalheTotal = this.add.text(dx, y + h - 46, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
    });
    // Linha inteira, e nao a coluna de detalhe: as recusas sao frases longas
    // ("Saldo insuficiente: faltam R$ 1.088,90.") e nos 173px da coluna elas
    // quebravam em duas linhas por cima do rodape — quando nao passavam da
    // borda direita do painel.
    this.lojaAviso = this.add.text(x + LOJA.margem, y + h - 26, '', {
      fontFamily: UI.fonte,
      fontSize: '9px',
      color: UI.textoFraco,
      wordWrap: { width: w - LOJA.margem * 2 },
    });
    this.lojaRodape = this.add.text(x + LOJA.margem, y + h - 14, '', {
      fontFamily: UI.fonte,
      fontSize: '9px',
      color: UI.textoFraco,
    });
    filhos.push(
      this.lojaDetalheNome,
      this.lojaDetalheTexto,
      this.lojaDetalheTotal,
      this.lojaAviso,
      this.lojaRodape,
    );

    return this.add.container(0, 0, filhos).setDepth(106).setVisible(false);
  }

  // --------------------------------------------------------------- input --

  /**
   * Ponto unico de entrada do "acionar" (E / clique). A ordem e a de quem esta
   * por cima na tela: confirmacao > dialogo > loja > inventario > mundo.
   */
  private acionar(): void {
    if (this.confirmacaoAberta) {
      this.responderConfirmacao();
      return;
    }
    if (this.dialogoAberto) {
      this.avancarDialogo();
      return;
    }
    if (this.lojaAberta) {
      this.pedirCompra();
      return;
    }
    if (this.inventarioAberto) return;
    const mundo = this.scene.get('FarmScene') as unknown as MundoJogavel | undefined;
    mundo?.interagir();
  }
}

/**
 * Encaixa o icone de um item num quadrado de `lado` px sem distorcer: a arte de
 * item vai de 40 a 200 px e de retrato a paisagem, entao a escala sai do lado
 * MAIOR do frame. Sem isto uma TV apareceria do mesmo tamanho de um alho.
 */
function ajustarIcone(img: Phaser.GameObjects.Image, lado: number): void {
  const escala = lado / Math.max(img.frame.width, img.frame.height);
  img.setScale(escala);
}

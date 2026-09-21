import Phaser from 'phaser';
import { nomeDoDia, dataDoDia } from '../game/calendario';
import { CONFIG, UI } from '../game/config';
import { formatarDinheiro } from '../game/dinheiro';
import { estado } from '../game/estado';
import { naRepresa, setorDaRepresa } from '../game/represa';
import { ITENS } from '../game/inventario';
import type { DefinicaoItem } from '../game/inventario';
import type { CategoriaItem, DefinicaoItemLoja } from '../game/itens';
import {
  LIMITE_POR_COMPRA,
  buscarLoja,
  comprar,
  itensDaLoja,
  percentualDescontoNpc,
  precoNoPonto,
  quantidadeViavel,
} from '../game/loja';
import type { PontoDeLoja } from '../game/loja';
import { controles } from '../game/InputRouter';
import { som } from './Som';
import type { Fala, MundoJogavel } from '../game/tipos';
import {
  NOME_DO_SLOT,
  SLOTS_DE_EQUIPAMENTO,
  acoesDoItem,
  comportamentoDe,
  podeDescartar,
} from '../game/equipar';
import { buscarArma } from '../game/armas';
import { fichaDoAndar, linhasDaFicha, tituloDaFicha, buscarRegistroPsicoterapia, tituloRegistroPsicoterapia, REGISTROS_PSICOTERAPIA } from '../game/fichas';
import { viuCena } from '../game/campanha';
import { PilhaDeFoco } from '../game/foco';
import type { JanelaDaUi } from '../game/foco';
import {
  cova,
  definirContraste,
  dicaDePainel,
  moldura,
  rodapeDePainel,
  tituloDePainel,
} from './widgets';

/**
 * Caixa de dialogo. Subiu de 74 pra 82 px de altura e ganhou a coluna do
 * RETRATO a esquerda; o texto passou de 10 pra 12 px. O relato era de
 * dificuldade de leitura: em 480x270 escalado, 10 px de monoespacada com fundo
 * a 88% de opacidade fica no limite do legivel quando o cenario por tras e
 * claro (grama ao meio-dia, piso de loja).
 */
const CAIXA = { x: 8, y: 180, w: CONFIG.largura - 16, h: 82 };
/** Quantos blocos a barra de vida tem. 10 pra cada bloco valer 3 pontos. */
const BARRA_DE_VIDA = 10;

/**
 * Rotulo de cada acao de inventario, com a tecla.
 *
 * A LISTA de acoes de um item nao esta aqui — ela sai de `acoesDoItem`
 * (equipar.ts), que le o comportamento do item. Aqui fica so como cada uma se
 * escreve na tela, que e assunto de UI.
 */
const ROTULO_DE_ACAO: Record<string, string> = {
  usar: '[U] usar',
  equipar: '[F] equipar',
  desequipar: '[F] guardar',
  examinar: '[E] examinar',
  descartar: '[X] descartar',
};

/** Coluna do retrato dentro da caixa de dialogo. */
const RETRATO = { lado: 58, margem: 7 };
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

/**
 * Menu de escolha (temas de conversa e escolha de presente). Fica logo acima da
 * caixa de dialogo, que continua visivel por baixo — o jogador precisa ver COM
 * QUEM esta falando enquanto escolhe o que dizer.
 */
const MENU = {
  w: 300,
  margem: 8,
  alturaLinha: 15,
  /** quantas opcoes aparecem por vez; o resto rola */
  linhas: 6,
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
  /** Barra de VIDA. Escondida na cidade com a vida cheia — ver `atualizarHud`. */
  private hudVida!: Phaser.GameObjects.Text;
  /** Setor e tensao da represa. So aparece dentro da usina. */
  private hudRepresa!: Phaser.GameObjects.Text;

  private dialogo!: Phaser.GameObjects.Container;
  private dialogoNome!: Phaser.GameObjects.Text;
  private dialogoTexto!: Phaser.GameObjects.Text;
  private dialogoRetrato!: Phaser.GameObjects.Image;
  private dialogoMolduraRetrato!: Phaser.GameObjects.Graphics;
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
  /** Linha do equipamento no painel de inventario ("Mao: Pistola"). */
  private equipadoTexto!: Phaser.GameObjects.Text;
  /** Linha das acoes disponiveis pro item selecionado. */
  private acoesTexto!: Phaser.GameObjects.Text;

  /**
   * AVISO RAPIDO — a linha que aparece no rodape e some sozinha.
   *
   * Existe porque as mensagens de combate (carregador vazio, recarregou, guardou
   * a arma na mochila) nao tem onde caber: `avisar` escreve dentro do painel de
   * inventario, que esta fechado na hora da briga, e abrir caixa de dialogo pra
   * "sem municao" pausaria o jogo no pior momento possivel.
   */
  private aviso!: Phaser.GameObjects.Text;
  private avisoAte = 0;

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
  private lojaFiltro: CategoriaItem | null = null;
  private lojaCursor = 0;
  /** primeiro item visivel — e o que faz a lista rolar */
  private lojaTopo = 0;
  private lojaQuantidade = 1;
  private lojaTitulo!: Phaser.GameObjects.Text;
  private lojaSaldo!: Phaser.GameObjects.Text;
  private lojaLinhas: {
    fundo: Phaser.GameObjects.Rectangle;
    icone: Phaser.GameObjects.Image;
    iconeCor: Phaser.GameObjects.Rectangle;
    nome: Phaser.GameObjects.Text;
    preco: Phaser.GameObjects.Text;
  }[] = [];
  private lojaRodape!: Phaser.GameObjects.Text;
  private lojaDetalheNome!: Phaser.GameObjects.Text;
  private lojaDetalheTexto!: Phaser.GameObjects.Text;
  private lojaDetalheTotal!: Phaser.GameObjects.Text;
  private lojaAviso!: Phaser.GameObjects.Text;

  // --- menu de escolha (temas / presentes) ---
  private menu!: Phaser.GameObjects.Container;
  private menuFundo!: Phaser.GameObjects.Graphics;
  private menuTitulo!: Phaser.GameObjects.Text;
  private menuLinhas: Phaser.GameObjects.Text[] = [];
  private menuRodape!: Phaser.GameObjects.Text;
  private menuOpcoes: OpcaoDeMenu[] = [];
  private menuCursor = 0;
  private menuTopo = 0;
  private menuAoCancelar: (() => void) | null = null;

  /**
   * Quem esta com o teclado. Antes cada `abrir*` conferia as outras janelas
   * por conta propria, com uma lista diferente em cada uma; a regra agora esta
   * so em `game/foco.ts`, e nenhuma janela pergunta pelas outras.
   */
  private readonly foco = new PilhaDeFoco();

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  /** true quando alguma janela da UI esta capturando o jogo (pausa movimento). */
  get bloqueado(): boolean {
    return this.foco.bloqueado;
  }

  get menuAberto(): boolean {
    return this.foco.aberta('menu');
  }

  get computadorAberto(): boolean {
    return this.foco.aberta('computador');
  }

  get lojaAberta(): boolean {
    return this.foco.aberta('loja');
  }

  get dialogoAberto(): boolean {
    return this.foco.aberta('dialogo');
  }

  get confirmacaoAberta(): boolean {
    return this.foco.aberta('confirmacao');
  }

  get inventarioAberto(): boolean {
    return this.foco.aberta('inventario');
  }

  /**
   * Pede o foco pra uma janela e fecha o que tiver de sair pra ela caber.
   * `false` quando a pilha recusou — quem chamou nao abre nada.
   */
  private tomarFoco(janela: JanelaDaUi): boolean {
    const { ok, fechar } = this.foco.abrir(janela);
    if (!ok) return false;
    for (const outra of fechar) this.desmontar(outra);
    return true;
  }

  /** Solta o foco e desmonta a janela. */
  private soltarFoco(janela: JanelaDaUi): void {
    if (!this.foco.fechar(janela)) return;
    this.desmontar(janela);
  }

  /**
   * Esconde e limpa uma janela SEM mexer na pilha — a pilha ja tirou ela daqui.
   * E o unico lugar do arquivo que chama `setVisible(false)` numa janela, e e
   * por isso que pilha e tela nao podem divergir.
   */
  private desmontar(janela: JanelaDaUi): void {
    switch (janela) {
      case 'dialogo':
        this.dialogo.setVisible(false);
        this.falas = [];
        this.indiceFala = 0;
        break;
      case 'confirmacao':
        this.confirmacao.setVisible(false);
        this.aoSim = null;
        this.aoNao = null;
        break;
      case 'menu':
        this.menu.setVisible(false);
        this.menuOpcoes = [];
        this.menuAoCancelar = null;
        break;
      case 'inventario':
        this.inventario.setVisible(false);
        break;
      case 'loja':
        this.loja.setVisible(false);
        this.lojaPonto = null;
        this.lojaItens = [];
        break;
      case 'computador':
        this.desligarComputador();
        break;
    }
  }

  create(): void {
    // O contraste alto vale pra TODA moldura do jogo, e quem liga e aqui: o
    // `create` roda de novo a cada troca de mapa e a cada volta do menu de
    // pausa, que sao os dois momentos em que a preferencia pode ter mudado.
    definirContraste(estado.preferencias.valores.altoContraste);

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

    // VIDA. Fica embaixo do saldo, com a mesma caixa escura, e NAO se confunde
    // com a energia de trabalho: o rotulo e "HP", a barra e de blocos e a cor
    // muda com o quanto falta. Ela some quando o jogador esta cheio e fora de
    // area de risco — a HUD da cidade e de um jogo pacifico e nao devia carregar
    // barra de combate o tempo todo.
    this.hudVida = this.add
      .text(6, 42, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.sucesso,
        backgroundColor: '#1a1712e0',
        padding: { x: 5, y: 3 },
      })
      .setDepth(90)
      .setVisible(false);

    this.hudRepresa = this.add
      .text(6, 60, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.textoFraco,
        backgroundColor: '#1a1712e0',
        padding: { x: 5, y: 3 },
      })
      .setDepth(90)
      .setVisible(false);

    this.aviso = this.add
      .text(CONFIG.largura / 2, CONFIG.altura - 44, '', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.texto,
        backgroundColor: '#1a1712dd',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(95)
      .setVisible(false);

    this.dialogo = this.criarCaixaDeDialogo();
    this.confirmacao = this.criarCaixaDeConfirmacao();
    this.inventario = this.criarPainelDeInventario();
    this.loja = this.criarPainelDeLoja();
    this.menu = this.criarMenu();
    // Som dos eventos de dominio: quem emite nao precisa saber que ha audio.
    const desligarSons = [
      estado.eventos.on('ACHIEVEMENT_UNLOCKED', e => { som.tocar('conquista'); this.avisoRapido(`Conquista: ${e.titulo}`, UI.sucesso); }),
      estado.eventos.on('SHOP_PURCHASE', () => som.tocar('compra')),
      estado.eventos.on('JOB_COMPLETED', () => som.tocar('dinheiro')),
      estado.eventos.on('MINIGAME_COMPLETED', () => som.tocar('enigma_ok')),
    ];
    this.events.once('shutdown', () => { for (const desligar of desligarSons) desligar(); });

    const teclado = this.input.keyboard;
    // sem isso o Tab move o foco do navegador em vez de chegar aqui
    teclado?.addCapture('TAB');
    teclado?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (controles.corresponde('inventario', e)) this.alternarInventario();
      if (controles.corresponde('interagir', e)) this.acionar();
      if (controles.corresponde('usar', e)) this.usarSelecionado();
      if (controles.corresponde('equipar', e)) this.alternarEquipado();
      if (controles.corresponde('cima', e)) this.mover(-1);
      if (controles.corresponde('baixo', e)) this.mover(1);
      if (controles.corresponde('esquerda', e)) this.horizontal(-1, e);
      if (controles.corresponde('direita', e)) this.horizontal(1, e);
    });
    teclado?.on('keydown-ESC', () => this.cancelar());
    teclado?.on('keydown-ENTER', () => { if (this.bloqueado) this.acionar(); });
    // horizontal: escolhe Sim/Nao na confirmacao ou a quantidade na loja
    teclado?.on('keydown-LEFT', (e: KeyboardEvent) => this.horizontal(-1, e));
    teclado?.on('keydown-RIGHT', (e: KeyboardEvent) => this.horizontal(1, e));
    // vertical: so a lista da loja usa
    teclado?.on('keydown-UP', () => this.mover(-1));
    teclado?.on('keydown-DOWN', () => this.mover(1));
    teclado?.on('keydown-PAGE_UP', () => this.mover(-LOJA.linhas));
    teclado?.on('keydown-PAGE_DOWN', () => this.mover(LOJA.linhas));
    teclado?.on('keydown-C', () => this.alternarFiltroDaLoja());
    // acoes do inventario
    // J abre os ARQUIVOS: as fichas medicas ja recolhidas na represa.
    teclado?.on('keydown-J', () => this.abrirArquivo());
    teclado?.on('keydown-X', () => this.descartarSelecionado());
    teclado?.on('keydown-O', () => this.organizarInventario());
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Com arma na mao o clique esquerdo E o tiro. Sem esta guarda, cada tiro
      // tambem abriria a porta ou lia a placa que estivesse no alcance.
      if (p.leftButtonDown() && this.mundo?.mirandoComArma()) return;
      this.acionar();
    });
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        if (this.menuAberto) {
          this.moverMenu(dy > 0 ? 1 : -1);
          return;
        }
        if (this.foco.topo === 'loja') this.moverListaDaLoja(dy > 0 ? 1 : -1);
      },
    );
  }

  /**
   * ARQUIVOS — as cinquenta fichas medicas recolhidas na represa.
   *
   * A tela reusa o MENU de escolha que os temas de conversa e os presentes ja
   * usam, em vez de ganhar um painel proprio. Nao e economia: o menu ja rola,
   * ja tem cursor, ja fecha com ESC e ja sabe conviver com a caixa de dialogo
   * que abre por cima dele — e ler uma ficha e exatamente "escolher um item de
   * uma lista e abrir o texto dele".
   *
   * A ficha nao recolhida aparece como `?????` de proposito: e o que faz o
   * jogador saber que pulou um andar. Escolher uma delas nao abre nada.
   */
  abrirArquivo(): void {
    if (!this.foco.podeAbrir('menu') || this.lojaAberta || this.computadorAberto) return;
    const indice = estado.arquivo.indice();
    const total = estado.arquivo.quantasFichas;
    if (total === 0) {
      this.avisoRapido('Nenhuma ficha recolhida ainda.', UI.textoFraco);
      return;
    }
    // a lista de fichas ocupa a mesma altura do painel de inventario; deixar os
    // dois na tela poe texto sobre texto
    this.soltarFoco('inventario');
    this.abrirMenu(
      `Arquivos — ${total} de ${indice.length} fichas`,
      [...(estado.arquivo.psicoterapiaDisponivel ? [{
        rotulo: `Psicoterapia — ${estado.arquivo.quantosRegistros}/${REGISTROS_PSICOTERAPIA.length} registros lidos`,
        aoEscolher: () => this.abrirPsicoterapia(),
      }] : []), ...indice.map((linha) => ({
        rotulo: linha.titulo,
        aoEscolher: () => {
          if (!linha.tem) {
            this.avisoRapido('Esta folha ainda esta na usina.', UI.textoFraco);
            return;
          }
          this.lerFicha(linha.andar);
        },
      }))],
    );
  }

  /** Continuação do prontuário, sem expor títulos temáticos das folhas futuras. */
  private abrirPsicoterapia(): void {
    if (!estado.arquivo.psicoterapiaDisponivel) return;
    const indice = estado.arquivo.indicePsicoterapia();
    const proximo = estado.arquivo.proximoRegistro();
    this.abrirMenu(
      `Psicoterapia — ${estado.arquivo.quantosRegistros}/${indice.length}`,
      [
        { rotulo: 'Voltar aos arquivos', aoEscolher: () => this.abrirArquivo() },
        ...(proximo === null ? [] : [{
          rotulo: `Continuar: ${tituloRegistroPsicoterapia(proximo)}`,
          aoEscolher: () => this.lerRegistroPsicoterapia(proximo),
        }]),
        ...indice.map((r) => ({
          rotulo: r.titulo,
          aoEscolher: () => {
            if (!r.disponivel) {
              this.avisoRapido('Continue a leitura dos registros anteriores.', UI.textoFraco);
              return;
            }
            this.lerRegistroPsicoterapia(r.numero);
          },
        })),
      ],
    );
  }

  private lerRegistroPsicoterapia(numero: number): void {
    if (viuCena(estado, 'prologo') && !estado.arquivo.tem(numero)
      && numero > (Number(estado.worldEvents.obter('campanha:profundidade')) || 50)) {
      this.avisoRapido('Encontre esta folha na escada além do arquivo do andar 50.', UI.textoFraco);
      return;
    }
    if (!estado.arquivo.podeLerRegistro(numero)) return;
    const registro = buscarRegistroPsicoterapia(numero);
    if (!registro) return;
    // Mede com a própria fonte/largura da caixa, sem cortar frases por pontuação.
    this.desenharRetrato(undefined);
    const quebras = this.dialogoTexto.getWrappedText(registro.texto);
    const linhas: string[] = [];
    for (let i = 0; i < quebras.length; i += 2) linhas.push(quebras.slice(i, i + 2).join('\n'));
    this.iniciarDialogo(
      linhas.map((texto) => ({ nome: tituloRegistroPsicoterapia(numero), texto })),
      () => {
        const mudou = estado.arquivo.concluirRegistro(numero);
        if (mudou && !this.mundo?.salvarJogo()) {
          this.avisoRapido('Leitura concluída. Não foi possível salvar; tente salvar novamente.', UI.alerta);
        }
        this.abrirPsicoterapia();
      },
    );
  }

  /** Abre o texto de uma ficha e volta pra lista ao fim da leitura. */
  private lerFicha(andar: number): void {
    const ficha = fichaDoAndar(andar);
    if (!ficha) return;
    const linhas = linhasDaFicha(ficha);
    this.iniciarDialogo(
      linhas.map((texto) => ({ nome: tituloDaFicha(ficha), texto })),
      () => this.abrirArquivo(),
    );
  }

  /** A cena de mundo, pela interface. `undefined` antes de ela subir. */
  private get mundo(): MundoJogavel | undefined {
    return this.scene.get('FarmScene') as unknown as MundoJogavel | undefined;
  }

  /**
   * Escreve uma linha no rodape que some sozinha. Chamar de novo troca o texto e
   * reinicia o relogio, entao dois avisos seguidos nao se empilham.
   */
  avisoRapido(texto: string, cor: string = UI.texto, duracaoMs = 2200): void {
    if (cor === UI.alerta) som.tocar('ui_erro');
    this.aviso.setText(texto);
    this.aviso.setColor(cor);
    this.aviso.setVisible(true);
    this.aviso.setAlpha(1);
    this.avisoAte = this.time.now + duracaoMs;
  }

  update(): void {
    if (!this.pcAberto) {
      if (controles.apertouPad('interagir')) this.acionar();
      if (controles.apertouPad('inventario')) this.alternarInventario();
      if (controles.apertouPad('cima')) this.mover(-1);
      if (controles.apertouPad('baixo')) this.mover(1);
      if (controles.apertouPad('esquerda')) this.horizontal(-1);
      if (controles.apertouPad('direita')) this.horizontal(1);
      if (controles.apertouPad('usar')) this.usarSelecionado();
      if (controles.apertouPad('equipar')) this.alternarEquipado();
      if (controles.padPausa || controles.padVoltar) this.cancelar();
    }
    if (this.aviso.visible && this.time.now > this.avisoAte) {
      const restante = (this.avisoAte + 400 - this.time.now) / 400;
      if (restante <= 0) this.aviso.setVisible(false);
      else this.aviso.setAlpha(restante);
    }
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
    if (!visivel) {
      this.hudVida.setVisible(false);
      this.hudRepresa.setVisible(false);
      return;
    }

    const data = dataDoDia(estado.dia);
    const texto = `${nomeDoDia(estado.dia).slice(0, 3)} ${data.diaEstacao} ${data.nomeEstacao} A${data.ano}  ${estado.relogio.texto}`;
    if (this.hud.text !== texto) this.hud.setText(texto);
    const saldo = `${estado.carteira.texto}  ${estado.clima.paraDia(estado.dia)}`;
    if (this.hudSaldo.text !== saldo) this.hudSaldo.setText(saldo);
    this.atualizarVida();
  }

  /**
   * Barra de vida e leitura da represa.
   *
   * Regra de aparicao: a vida aparece DENTRO da represa sempre, e fora dela
   * so quando falta vida. Assim a HUD da cidade continua sendo relogio e saldo,
   * e a barra de combate le como "voce esta em area de risco" no momento em que
   * aparece.
   */
  private atualizarVida(): void {
    const naUsina = naRepresa(estado.mapa);
    const mostrar = naUsina || !estado.vida.cheio;
    this.hudVida.setVisible(mostrar);
    if (mostrar) {
      const cheios = Math.round(estado.vida.fracao * BARRA_DE_VIDA);
      const barra = '█'.repeat(cheios) + '░'.repeat(BARRA_DE_VIDA - cheios);
      const texto = `HP ${barra} ${estado.vida.hp}/${estado.vida.maxHp}`;
      if (this.hudVida.text !== texto) this.hudVida.setText(texto);
      const fracao = estado.vida.fracao;
      this.hudVida.setColor(fracao > 0.6 ? UI.sucesso : fracao > 0.3 ? UI.destaque : UI.alerta);
    }

    const setor = setorDaRepresa(estado.mapa);
    this.hudRepresa.setVisible(Boolean(setor));
    if (!setor) return;
    const tensao = Math.round(estado.represa.tensao * 100);
    // O CODIGO do andar (`A-06`) no lugar do "nivel -5" antigo: com cinquenta
    // andares a notacao negativa deixou de dizer algo — ninguem pensa "estou no
    // nivel menos quarenta e nove".
    const arma = buscarArma(comportamentoDe(estado.equipamento.naMao)?.arma);
    const municao = arma
      ? `  |  ${arma.nome} ${estado.armas.noCarregador(arma.id)}/${arma.carregador}`
        + ` (${estado.inventario.contar(arma.municao)})`
      : '';
    const texto = `${setor.codigo} ${setor.rotulo}  |  tensao ${tensao}%${municao}`;
    if (this.hudRepresa.text !== texto) this.hudRepresa.setText(texto);
    this.hudRepresa.setColor(
      tensao < 34 ? UI.textoFraco : tensao < 67 ? UI.destaque : UI.alerta,
    );
  }

  // -------------------------------------------------------------- prompt --

  /** Mostra "[E] <rotulo>" ou some, se `rotulo` for null. */
  mostrarPrompt(rotulo: string | null): void {
    this.rotuloAtual = rotulo;
    if (this.prompt) this.desenharPrompt();
  }

  private desenharPrompt(): void {
    const visivel = this.rotuloAtual !== null && !this.bloqueado;
    if (visivel) this.prompt.setText(`[${controles.rotulo('interagir')}/A] ${this.rotuloAtual}`);
    this.prompt.setVisible(visivel);
  }

  // ------------------------------------------------------------- dialogo --

  /** Abre a caixa de dialogo com uma sequencia de falas. */
  iniciarDialogo(falas: Fala[], aoFim?: () => void): void {
    if (falas.length === 0) return;
    // ja aberta (uma fala emendando na outra) nao pede foco de novo
    if (!this.dialogoAberto && !this.tomarFoco('dialogo')) return;
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
    this.soltarFoco('dialogo');
    const aoFim = this.aoFimDoDialogo;
    this.aoFimDoDialogo = null;
    this.desenharPrompt();
    aoFim?.();
  }

  private desenharFala(): void {
    const fala = this.falas[this.indiceFala];
    // o retrato vem ANTES do texto: e ele que decide de onde o texto comeca e
    // que largura ele tem pra quebrar
    this.desenharRetrato(fala.npcId);
    this.dialogoNome.setText(fala.nome);
    this.dialogoTexto.setText(fala.texto);
  }

  private criarCaixaDeDialogo(): Phaser.GameObjects.Container {
    const fundo = this.add.graphics();
    moldura(fundo, CAIXA);

    // moldura do retrato, sempre desenhada; o que aparece dentro dela muda
    this.dialogoMolduraRetrato = this.add.graphics();
    const r = this.caixaDoRetrato();
    cova(this.dialogoMolduraRetrato, r);

    this.dialogoRetrato = this.add.image(r.x + r.w / 2, r.y + r.h, '').setOrigin(0.5, 1);

    this.dialogoNome = this.add.text(0, CAIXA.y + 8, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoNome,
      color: UI.destaque,
    });

    this.dialogoTexto = this.add.text(0, CAIXA.y + 28, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoFala,
      color: UI.texto,
      lineSpacing: 4,
    });

    const seta = this.add
      .text(CAIXA.x + CAIXA.w - 8, CAIXA.y + CAIXA.h - 5, '[Enter]', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.textoFraco,
      })
      .setOrigin(1, 1);

    // A seta pisca PARA SEMPRE (`repeat: -1`) — e o unico elemento perpetuamente
    // animado da interface, e fica na caixa de fala, que e onde o jogador passa
    // mais tempo lendo. Com "movimento reduzido" ligado ela nao pisca: fica no
    // meio do caminho da piscada, visivel e parada.
    //
    // A opcao existia e valia por UMA coisa (desligar as particulas de clima);
    // esta e a segunda.
    if (estado.preferencias.valores.movimentoReduzido) seta.setAlpha(0.6);
    else this.tweens.add({ targets: seta, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    return this.add
      .container(0, 0, [
        fundo,
        this.dialogoMolduraRetrato,
        this.dialogoRetrato,
        this.dialogoNome,
        this.dialogoTexto,
        seta,
      ])
      .setDepth(100)
      .setVisible(false);
  }

  /** Onde a moldura do retrato fica dentro da caixa de dialogo. */
  private caixaDoRetrato(): { x: number; y: number; w: number; h: number } {
    return {
      x: CAIXA.x + RETRATO.margem,
      y: CAIXA.y + RETRATO.margem,
      w: RETRATO.lado,
      h: CAIXA.h - RETRATO.margem * 2,
    };
  }

  /**
   * O RETRATO do NPC que esta falando.
   *
   * Nao ha arte de retrato dedicada: o rosto sai do primeiro quadro da folha de
   * POSE PARADA olhando pra frente (`down-0` da textura `npc-<id>-parado`), o
   * mesmo recorte que o BootScene ja registra pro idle. Isso mantem o retrato
   * automaticamente igual ao boneco que anda pela cidade — e um NPC novo ganha
   * retrato sem passo nenhum a mais.
   *
   * A imagem e ampliada pra encher a moldura, com `NEAREST` preservado pelo
   * `pixelArt` do jogo, entao ela cresce em bloco em vez de borrar.
   */
  private desenharRetrato(npcId: string | undefined): void {
    const chaves = npcId ? [`npc-${npcId}-parado`, `npc-${npcId}-sprites`] : [];
    const chave = chaves.find((k) => this.textures.exists(k) && this.textures.get(k).has('down-0'));

    const r = this.caixaDoRetrato();
    this.dialogoMolduraRetrato.setVisible(Boolean(chave));
    this.dialogoRetrato.setVisible(Boolean(chave));

    if (chave) {
      this.dialogoRetrato.setTexture(chave, 'down-0');
      // encaixa pela dimensao mais apertada e nunca passa da moldura
      const escala = Math.min(
        (r.w - 6) / this.dialogoRetrato.width,
        (r.h - 6) / this.dialogoRetrato.height,
      );
      this.dialogoRetrato.setScale(escala);
      this.dialogoRetrato.setPosition(r.x + r.w / 2, r.y + r.h - 3);
    }

    // sem retrato (placa, item, aviso) o texto usa a largura toda da caixa
    const xTexto = chave ? r.x + r.w + 9 : CAIXA.x + 9;
    const largura = CAIXA.x + CAIXA.w - 9 - xTexto;
    this.dialogoNome.setX(xTexto);
    this.dialogoTexto.setX(xTexto);
    this.dialogoTexto.setWordWrapWidth(largura);
  }

  // --------------------------------------------------------- confirmacao --

  /** Pergunta Sim/Nao. Setas ou A/D escolhem, E ou clique confirma, ESC cancela. */
  confirmar(texto: string, aoSim: () => void, aoNao?: () => void): void {
    if (!this.tomarFoco('confirmacao')) return;
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
    if (this.foco.topo === 'confirmacao') {
      this.moverOpcao(passo);
      return;
    }
    if (this.foco.topo === 'loja') this.mudarQuantidade(passo * (evento?.shiftKey ? 10 : 1));
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
    this.soltarFoco('confirmacao');
    this.desenharPrompt();
  }

  /**
   * ESC. Fecha a janela do TOPO, uma por aperto.
   *
   * A ordem antiga testava o menu ANTES da confirmacao, e uma pergunta aberta
   * por cima de um menu saia pelo menu: o ESC cancelava a escolha de tras e
   * deixava a pergunta na tela sem dono.
   */
  private cancelar(): void {
    switch (this.foco.topo) {
      case null:
        this.scene.launch('MenuScene', { pagina: 'pausa' });
        return;
      case 'confirmacao': {
        const aoNao = this.aoNao;
        this.fecharConfirmacao();
        aoNao?.();
        return;
      }
      case 'menu':
        this.cancelarMenu();
        return;
      case 'dialogo':
        // a fala anda com E e acaba sozinha; ESC no meio dela nao pula o texto
        return;
      case 'loja':
        this.fecharLoja();
        return;
      case 'inventario':
        this.alternarInventario();
        return;
      case 'computador':
        // quem fecha o PC e a ComputadorScene: ela tem app aberto por dentro
        // pra fechar primeiro
        return;
    }
  }

  private criarCaixaDeConfirmacao(): Phaser.GameObjects.Container {
    const x = (CONFIG.largura - CONFIRMA.w) / 2;
    const y = (CONFIG.altura - CONFIRMA.h) / 2;

    const fundo = this.add.graphics();
    // `sobreposto`: esta caixa abre por cima da janela da loja, e qualquer
    // transparencia deixa a lista de tras vazando por entre as letras
    moldura(fundo, { x, y, w: CONFIRMA.w, h: CONFIRMA.h }, { sobreposto: true });

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

  // ------------------------------------------------------------------ menu --

  /**
   * Menu de escolha, usado pelos temas de conversa e pela escolha de presente.
   *
   * Fica ACIMA da caixa de dialogo e nao a esconde: o jogador continua vendo
   * com quem esta falando enquanto decide. Enquanto ele esta aberto, `bloqueado`
   * segura o movimento do player, do mesmo jeito que o dialogo ja fazia.
   */
  abrirMenu(
    titulo: string,
    opcoes: OpcaoDeMenu[],
    aoCancelar?: () => void,
    npcId?: string,
  ): void {
    if (opcoes.length === 0) {
      aoCancelar?.();
      return;
    }
    // o menu de tema/presente tambem e "tela com fala de um NPC": manter o
    // retrato aberto por baixo dele e o que evita o jogador escolher assunto
    // sem ver mais com quem esta falando
    if (!this.foco.podeAbrir('menu')) {
      aoCancelar?.();
      return;
    }
    // o retrato entra PRIMEIRO: ele e pano de fundo do menu, e quem entra por
    // ultimo na pilha e quem recebe o teclado
    if (npcId && this.tomarFoco('dialogo')) {
      this.desenharRetrato(npcId);
      this.dialogoNome.setText(titulo);
      this.dialogoTexto.setText('');
      this.dialogo.setVisible(true);
    }
    if (!this.tomarFoco('menu')) {
      aoCancelar?.();
      return;
    }
    this.menuOpcoes = opcoes;
    this.menuCursor = 0;
    this.menuTopo = 0;
    this.menuAoCancelar = aoCancelar ?? null;
    this.menuTitulo.setText(titulo);
    this.menu.setVisible(true);
    this.desenharMenu();
    this.desenharPrompt();
  }

  fecharMenu(): void {
    this.soltarFoco('menu');
    // a caixa so foi aberta pra segurar o retrato; sem falas dentro dela, ela
    // sai junto com o menu
    if (this.falas.length === 0) this.soltarFoco('dialogo');
    this.desenharPrompt();
  }

  private moverMenu(passo: number): void {
    if (!this.menuAberto) return;
    const ultimo = this.menuOpcoes.length - 1;
    this.menuCursor = Math.min(ultimo, Math.max(0, this.menuCursor + passo));
    const ultimoTopo = Math.max(0, this.menuOpcoes.length - MENU.linhas);
    this.menuTopo = Math.min(ultimoTopo, Math.max(this.menuTopo, this.menuCursor - MENU.linhas + 1));
    this.menuTopo = Math.min(this.menuTopo, this.menuCursor);
    this.desenharMenu();
  }

  /**
   * Confirma a opcao sob o cursor. O menu fecha ANTES de rodar a acao: quase
   * toda acao abre um dialogo, e deixar o menu aberto por baixo empilharia as
   * duas janelas.
   */
  private escolherNoMenu(): void {
    const opcao = this.menuOpcoes[this.menuCursor];
    if (!opcao) return;
    this.fecharMenu();
    opcao.aoEscolher();
  }

  private cancelarMenu(): void {
    const aoCancelar = this.menuAoCancelar;
    this.fecharMenu();
    aoCancelar?.();
  }

  private desenharMenu(): void {
    const visiveis = Math.min(MENU.linhas, this.menuOpcoes.length);
    const altura = MENU.margem * 2 + 15 + visiveis * MENU.alturaLinha + 12;
    const x = (CONFIG.largura - MENU.w) / 2;
    const y = CAIXA.y - altura - 4;

    this.menuFundo.clear();
    // sobreposto: o menu de assunto abre com o retrato de quem fala por baixo
    moldura(this.menuFundo, { x, y, w: MENU.w, h: altura }, { sobreposto: true });

    this.menuTitulo.setPosition(x + MENU.margem, y + MENU.margem);

    this.menuLinhas.forEach((linha, i) => {
      const opcao = this.menuOpcoes[this.menuTopo + i];
      const dentro = i < visiveis && Boolean(opcao);
      linha.setVisible(dentro);
      if (!dentro || !opcao) return;
      const ativo = this.menuTopo + i === this.menuCursor;
      linha.setPosition(x + MENU.margem, y + MENU.margem + 15 + i * MENU.alturaLinha);
      linha.setColor(ativo ? UI.destaque : UI.textoFraco);
      linha.setText(`${ativo ? '>' : ' '} ${encurtarMenu(opcao.rotulo)}`);
    });

    this.menuRodape.setPosition(x + MENU.margem, y + altura - 13);
    this.menuRodape.setText(
      this.menuOpcoes.length > MENU.linhas
        ? `${this.menuCursor + 1}/${this.menuOpcoes.length}  [setas] escolher  [Enter] confirmar  [ESC] sair`
        : '[setas] escolher   [Enter] confirmar   [ESC] sair',
    );
  }

  private criarMenu(): Phaser.GameObjects.Container {
    this.menuFundo = this.add.graphics();
    this.menuTitulo = this.add.text(0, 0, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoTitulo,
      color: UI.destaque,
    });
    this.menuLinhas = Array.from({ length: MENU.linhas }, (_, i) => {
      const linha = this.add
        .text(0, 0, '', { fontFamily: UI.fonte, fontSize: UI.tamanho, color: UI.textoFraco })
        .setInteractive({ useHandCursor: true });
      // passar o mouse ja seleciona; o clique confirma pelo handler global,
      // igual a confirmacao Sim/Nao
      linha.on('pointerover', () => {
        if (!this.menuAberto) return;
        const indice = this.menuTopo + i;
        if (indice >= this.menuOpcoes.length) return;
        this.menuCursor = indice;
        this.desenharMenu();
      });
      return linha;
    });
    // posicao vem do `desenharMenu`: a altura do menu muda com a contagem de
    // opcoes, entao o rodape nao tem um y fixo como nos outros paineis
    this.menuRodape = rodapeDePainel(this, { x: 0, y: 0, w: 0, h: 0 });

    return this.add
      .container(0, 0, [this.menuFundo, this.menuTitulo, ...this.menuLinhas, this.menuRodape])
      .setDepth(108)
      .setVisible(false);
  }

  // ---------------------------------------------------------- inventario --

  private alternarInventario(): void {
    if (this.inventarioAberto) {
      // nao fecha por baixo de fala ou pergunta: sumir com o inventario embaixo
      // de uma confirmacao de descarte deixaria a pergunta sem contexto
      if (this.foco.topo !== 'inventario') return;
      som.tocar('ui_cancelar');
      this.soltarFoco('inventario');
      this.desenharPrompt();
      return;
    }
    // a pilha e que recusa abrir sob fala/pergunta, e trocar a loja pelo
    // inventario so empilharia painel — as duas mostram o que o jogador tem
    if (this.lojaAberta || !this.tomarFoco('inventario')) return;
    som.tocar('gaveta');
    this.inventario.setVisible(true);
    this.avisoInventario.setText('');
    this.desenharInventario();
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
   * USA o item selecionado.
   *
   * O que ele faz nao esta escrito aqui: a UI pergunta a cena
   * (`usarItemDoInventario`), que consulta `COMPORTAMENTOS` e aplica o efeito. A
   * UI so cuida do que e dela — gastar a unidade DO SLOT selecionado e
   * redesenhar. Antes desta leva o efeito era um `TODO` no meio deste metodo, e
   * era esse acoplamento que a Parte 1 pediu pra desfazer.
   *
   * A unidade sai DEPOIS do efeito e so quando o efeito disse que consumiu: usar
   * um kit com a vida cheia nao gasta o kit.
   */
  private usarSelecionado(): void {
    if (this.foco.topo !== 'inventario') return;
    const alvo = this.slotSelecionado;
    if (!alvo) {
      this.avisar('Selecione um item primeiro.');
      return;
    }
    const r = this.mundo?.usarItemDoInventario(alvo.def.id);
    if (!r) return;
    if (r.ok && r.consumiu) {
      // reconfere o slot: entre selecionar e usar o inventario pode ter mudado
      const agora = estado.inventario.slots[alvo.indice];
      if (agora?.id !== alvo.def.id) {
        this.avisar('O item saiu do slot.', UI.alerta);
        return;
      }
      estado.inventario.removerDoSlot(alvo.indice, 1);
      estado.equipamento.sincronizarCom((id) => estado.inventario.contar(id));
      if (estado.inventario.slots[alvo.indice] === null) this.itemSelecionado = null;
    }
    this.avisar(r.aviso, r.cor ?? (r.ok ? UI.sucesso : UI.alerta));
    this.desenharInventario();
  }

  /**
   * EQUIPA ou DESEQUIPA o item selecionado (tecla F).
   *
   * Quem decide se pode e a cena, porque a regra depende do MAPA: a pistola so
   * equipa em zona perigosa (ver `podeEquipar` em equipar.ts).
   */
  private alternarEquipado(): void {
    if (this.foco.topo !== 'inventario') return;
    const alvo = this.slotSelecionado;
    if (!alvo) {
      this.avisar('Selecione um item primeiro.');
      return;
    }
    const c = comportamentoDe(alvo.def.id);
    if (!c?.slot) {
      this.avisar(`${alvo.def.nome} nao e equipavel.`, UI.alerta);
      return;
    }
    if (estado.equipamento.estaEquipado(alvo.def.id)) {
      this.mundo?.desequiparItem(alvo.def.id);
      this.avisar(`Guardou ${alvo.def.nome}.`);
    } else {
      this.mundo?.equiparItem(alvo.def.id);
      const entrou = estado.equipamento.estaEquipado(alvo.def.id);
      this.avisar(
        entrou
          ? `${alvo.def.nome} em ${NOME_DO_SLOT[c.slot].toLowerCase()}.`
          : (c.recusaDeZona ?? 'Nao da pra equipar isso aqui.'),
        entrou ? UI.sucesso : UI.alerta,
      );
    }
    this.desenharInventario();
  }

  /** Joga fora a pilha selecionada. Nao devolve nada ao mundo — some mesmo. */
  private descartarSelecionado(): void {
    if (this.foco.topo !== 'inventario') return;
    const alvo = this.slotSelecionado;
    if (!alvo) {
      this.avisar('Selecione um item primeiro.');
      return;
    }
    // item de missao nao se joga fora: descartar a encomenda deixava a entrega
    // aceita pra sempre, sem porta que a conclua e sem poder aceitar outra
    if (!podeDescartar(alvo.def)) {
      this.avisar(
        alvo.def.deMissao
          ? `${alvo.def.nome} e de um trabalho aceito — nao da pra jogar fora.`
          : `${alvo.def.nome} e unico. Melhor nao jogar fora.`,
        UI.alerta,
      );
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
    som.tocar('guardar');
    if (this.foco.topo !== 'inventario') return;
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
        this.itemSelecionado === i ? UI.bordaViva : UI.borda,
        this.itemSelecionado === i ? 1 : 0.7,
      );
    }

    const slot = this.itemSelecionado === null ? null : slots[this.itemSelecionado];
    const def = slot ? ITENS[slot.id] : undefined;
    this.nomeItem.setText(def && slot ? `${def.nome} x${slot.qtd}` : 'Selecione um item');
    const preco = def?.preco === undefined ? '' : `  ${formatarDinheiro(def.preco)}`;
    this.tipoItem.setText(def ? `Tipo: ${def.tipo}${preco}` : '');
    const c = def ? comportamentoDe(def.id) : null;
    const arma = buscarArma(c?.arma);
    const linhasDetalhe = [def?.descricao ?? ''];
    if (arma) {
      linhasDetalhe.push(
        `Dano ${arma.dano} | carregador ${estado.armas.noCarregador(arma.id)}/${arma.carregador}` +
          ` | reserva ${estado.inventario.contar(arma.municao)}`,
      );
    } else if (c?.danoCorpoACorpo) {
      linhasDetalhe.push(`Dano de golpe ${c.danoCorpoACorpo}`);
    }
    if (c?.detalhe) linhasDetalhe.push(c.detalhe);
    this.descricaoItem.setText(linhasDetalhe.filter(Boolean).join('\n'));

    const equipados = SLOTS_DE_EQUIPAMENTO.map((sl) => ({ sl, id: estado.equipamento.equipado(sl) }))
      .filter((e) => e.id)
      .map((e) => `${NOME_DO_SLOT[e.sl]}: ${ITENS[e.id as string]?.nome ?? '-'}`);
    this.equipadoTexto.setText(equipados.join('   ') || 'Nada equipado');
    this.acoesTexto.setText(
      def
        ? acoesDoItem(def.id, estado.equipamento.estaEquipado(def.id))
            .map((a) => ROTULO_DE_ACAO[a].replace('[U]', `[${controles.rotulo('usar')}]`).replace('[F]', `[${controles.rotulo('equipar')}]`).replace('[E]', `[${controles.rotulo('interagir')}]`))
            .join('   ')
        : '',
    );
  }

  private criarPainelDeInventario(): Phaser.GameObjects.Container {
    const passo = INV.slot + INV.gap;
    const grade = {
      w: INV.colunas * passo - INV.gap,
      h: INV.linhas * passo - INV.gap,
    };
    const largura = grade.w + INV.detalhes + INV.margem * 3;
    // +44: quatro linhas de rodape — equipamento, acoes do item selecionado,
    // dicas fixas de tecla e o aviso da ultima acao
    const altura = grade.h + INV.margem * 2 + INV.topo + 44;
    const x = Math.round((CONFIG.largura - largura) / 2);
    const y = Math.round((CONFIG.altura - altura) / 2);

    const painel = { x, y, w: largura, h: altura };
    const fundo = this.add.graphics();
    moldura(fundo, painel);

    const titulo = tituloDePainel(this, painel, 'Inventario');
    const dica = dicaDePainel(this, painel, '[Tab] fechar');

    const filhos: Phaser.GameObjects.GameObject[] = [fundo, titulo, dica];
    this.icones = [];
    this.contadores = [];
    this.seletores = [];

    for (let i = 0; i < INV.colunas * INV.linhas; i++) {
      const sx = x + INV.margem + (i % INV.colunas) * passo;
      const sy = y + INV.margem + INV.topo + Math.floor(i / INV.colunas) * passo;

      const seletor = this.add
        .rectangle(sx, sy, INV.slot, INV.slot, UI.poco, UI.alfaPoco)
        .setOrigin(0, 0)
        .setStrokeStyle(1, UI.borda, 0.7)
        .setInteractive({ useHandCursor: true });
      seletor.on('pointerdown', () => {
        this.itemSelecionado = i;
        this.desenharInventario();
      });

      const icone = this.add
        .rectangle(sx + INV.slot / 2, sy + INV.slot / 2, INV.slot - 8, INV.slot - 8, UI.tinta)
        .setVisible(false);
      // icone de arte: mesma posicao do placeholder, so um dos dois aparece
      const sprite = this.add
        .image(sx + INV.slot / 2, sy + INV.slot / 2, 'itens')
        .setVisible(false);
      const contador = this.add
        .text(sx + INV.slot - 2, sy + INV.slot - 2, '', {
          fontFamily: UI.fonte,
          fontSize: UI.tamanhoMiudo,
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
    // EQUIPAMENTO. Fica no rodape e nao numa coluna propria porque a janela tem
    // 176 px de detalhe e nada mais: uma quarta coluna deixaria a descricao com
    // duas palavras por linha. A redesenhada da interface e que vai dar a ele o
    // quadro visual que ele merece.
    this.equipadoTexto = this.add.text(x + INV.margem, y + altura - 42, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoMiudo,
      color: UI.destaque,
      wordWrap: { width: largura - INV.margem * 2 },
    });
    // ACOES DO ITEM. A lista muda com o item selecionado — e a Parte 1 pedindo
    // que as acoes dependam do item e nao de uma barra fixa de teclas.
    this.acoesTexto = this.add.text(x + INV.margem, y + altura - 32, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoMiudo,
      color: UI.texto,
      wordWrap: { width: largura - INV.margem * 2 },
    });
    const dicas = this.add.text(x + INV.margem, y + altura - 22, '[O] organizar  [Tab] fechar', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoMiudo,
      color: UI.textoFraco,
    });
    this.avisoInventario = this.add.text(x + INV.margem, y + altura - 12, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanhoMiudo,
      color: UI.textoFraco,
      wordWrap: { width: largura - INV.margem * 2 },
    });
    filhos.push(
      this.nomeItem,
      this.tipoItem,
      this.descricaoItem,
      this.equipadoTexto,
      this.acoesTexto,
      dicas,
      this.avisoInventario,
    );

    return this.add.container(0, 0, filhos).setDepth(105).setVisible(false);
  }

  // ---------------------------------------------------------------- loja --

  /**
   * Abre a janela de compra de um ponto de loja. Chamada pela FarmScene quando
   * o jogador aciona o balcao.
   */
  abrirLoja(idPonto: string | PontoDeLoja): void {
    const ponto = typeof idPonto === 'string' ? buscarLoja(idPonto) : idPonto;
    if (!ponto) {
      console.warn(`[ui] ponto de loja "${idPonto}" nao existe`);
      return;
    }
    if (!this.tomarFoco('loja')) return;
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
    this.soltarFoco('loja');
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
    som.tocar('ui_pagina');
    if (this.foco.topo !== 'loja' || !this.lojaPonto) return;
    const ordem: (CategoriaItem | null)[] = [null, ...this.lojaPonto.categorias];
    const atual = ordem.indexOf(this.lojaFiltro);
    this.lojaFiltro = ordem[(atual + 1) % ordem.length] ?? null;
    this.lojaCursor = 0;
    this.lojaTopo = 0;
    this.recarregarCatalogo();
    this.lojaAviso.setText('');
    this.desenharLoja();
  }

  /**
   * W/S e as setas verticais. Um dono por vez, na ordem de quem esta por cima:
   * o menu de escolha antes da lista da loja.
   */
  private mover(passo: number): void {
    if (this.menuAberto) {
      som.tocar('ui_mover');
      this.moverMenu(passo);
      return;
    }
    if (this.foco.topo === 'loja' && this.lojaItens.length > 0) som.tocar(Math.abs(passo) > 1 ? 'ui_pagina' : 'ui_mover');
    this.moverListaDaLoja(passo);
  }

  private moverListaDaLoja(passo: number): void {
    if (this.foco.topo !== 'loja' || this.lojaItens.length === 0) return;
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
    const teto = Math.max(
      1,
      Math.min(LIMITE_POR_COMPRA, quantidadeViavel(item.id, this.lojaPonto) || 1),
    );
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
    const total = precoNoPonto(item, this.lojaPonto) * qtd;

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
    const r = comprar(item.id, qtd, this.lojaPonto);
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
    const filtro = this.lojaFiltro === null
      ? 'tudo'
      : this.lojaFiltro === 'normal'
        ? 'mercado'
        : this.lojaFiltro === 'material' ? 'materiais' : 'eletronico';
    const descontoTitulo = percentualDescontoNpc(this.lojaPonto.npcDono);
    this.lojaTitulo.setText(
      `${this.lojaPonto.nome} - ${filtro}` +
        (descontoTitulo > 0 ? `   desconto de amizade -${Math.round(descontoTitulo * 100)}%` : ''),
    );
    this.lojaSaldo.setText(estado.carteira.texto);

    this.lojaLinhas.forEach((linha, i) => {
      const item = this.lojaItens[this.lojaTopo + i];
      const ativo = this.lojaTopo + i === this.lojaCursor;
      linha.fundo.setVisible(Boolean(item));
      linha.fundo.setFillStyle(ativo ? UI.selecao : UI.poco, ativo ? 1 : UI.alfaPoco);
      linha.icone.setVisible(Boolean(item?.frame));
      linha.iconeCor.setVisible(Boolean(item && !item.frame));
      linha.nome.setVisible(Boolean(item));
      linha.preco.setVisible(Boolean(item));
      if (!item) return;

      if (item.frame) {
        linha.icone.setFrame(item.frame);
        ajustarIcone(linha.icone, ICONE.loja);
      } else {
        linha.iconeCor.setFillStyle(item.icone ?? UI.iconeNeutro, 1);
      }
      const tem = estado.inventario.contar(item.id);
      linha.nome.setColor(ativo ? UI.destaque : UI.texto);
      linha.nome.setText(tem > 0 ? `${item.nome}  (tem ${tem})` : item.nome);
      // o que o saldo nao cobre ja aparece na cor de alerta, antes de tentar
      const unidade = precoNoPonto(item, this.lojaPonto);
      linha.preco.setColor(estado.carteira.temSaldo(unidade) ? UI.texto : UI.alerta);
      // com desconto o preco de tabela fica visivel ao lado do cobrado: sem
      // isso o jogador nao tem como saber que a relacao esta valendo alguma coisa
      linha.preco.setText(
        unidade === item.preco
          ? formatarDinheiro(unidade)
          : `${formatarDinheiro(item.preco)} > ${formatarDinheiro(unidade)}`,
      );
    });

    const total = this.lojaItens.length;
    this.lojaRodape.setText(
      total === 0
        ? 'Nada nesta prateleira.'
        : `${this.lojaCursor + 1}/${total}  [setas] item/qtd  [C] prateleira  [Enter] comprar  [ESC] sair`,
    );

    const item = this.lojaItens[this.lojaCursor];
    if (!item) {
      this.lojaDetalheNome.setText('');
      this.lojaDetalheTexto.setText('');
      this.lojaDetalheTotal.setText('');
      return;
    }
    // o mesmo `precoNoPonto` que a lista e o caixa usam: se o detalhe calculasse
    // por conta propria, a vitrine e a cobranca poderiam discordar
    const unidade = precoNoPonto(item, this.lojaPonto);
    const desconto = percentualDescontoNpc(this.lojaPonto.npcDono);
    const teto = quantidadeViavel(item.id, this.lojaPonto);
    this.lojaDetalheNome.setText(item.nome);
    this.lojaDetalheTexto.setText(
      `${item.descricao}\n\nUnidade: ${formatarDinheiro(unidade)}` +
        (desconto > 0 ? `  (de ${formatarDinheiro(item.preco)}, -${Math.round(desconto * 100)}%)` : '') +
        `\nLeva agora: ${teto}`,
    );
    this.lojaDetalheTotal.setText(
      `x${this.lojaQuantidade}   ${formatarDinheiro(unidade * this.lojaQuantidade)}`,
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
    if (!this.tomarFoco('computador')) return;
    this.mostrarPrompt(null);
    this.input.enabled = false;
    if (this.input.keyboard) this.input.keyboard.enabled = false;
    this.scene.launch('ComputadorScene');
  }

  /** Chamada pela ComputadorScene ao desligar. Devolve o controle do player. */
  fecharComputador(): void {
    this.soltarFoco('computador');
    this.desenharPrompt();
  }

  /** O desligamento em si. Chamado pela pilha, ao tirar o PC do foco. */
  private desligarComputador(): void {
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
    moldura(fundo, { x, y, w, h });
    // divisa entre a lista e a coluna de detalhe
    const divisa = x + LOJA.margem + LOJA.lista + 5;
    fundo.lineStyle(1, UI.borda, 0.5);
    fundo.lineBetween(divisa, y + LOJA.topo - 6, divisa, y + h - 22);

    this.lojaTitulo = tituloDePainel(this, LOJA, '');
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
        .rectangle(x + LOJA.margem, ly, LOJA.lista, LOJA.alturaLinha - 2, UI.poco, UI.alfaPoco)
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
      const iconeCor = this.add
        .rectangle(x + LOJA.margem + 12, ly + LOJA.alturaLinha / 2 - 1, 12, 12, UI.iconeNeutro)
        .setStrokeStyle(1, UI.iconeBorda, 0.8)
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

      this.lojaLinhas.push({ fundo: alvo, icone, iconeCor, nome, preco });
      filhos.push(alvo, icone, iconeCor, nome, preco);
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
      fontSize: UI.tamanhoMiudo,
      color: UI.textoFraco,
      wordWrap: { width: w - LOJA.margem * 2 },
    });
    this.lojaRodape = rodapeDePainel(this, LOJA);
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
   * Ponto unico de entrada do "acionar" (E / clique): vai pra janela que esta no
   * TOPO da pilha de foco, e pro mundo quando nao ha janela nenhuma.
   *
   * Antes era uma lista de `if` na ordem escrita a mao
   * (confirmacao > dialogo > menu > loja), e a ordem estava errada num caso: o
   * menu de assunto abre o retrato de quem fala por baixo dele, entao
   * `dialogoAberto` era true e o primeiro E ia pro dialogo — apagava o retrato
   * em vez de escolher o presente, e o jogador tinha de apertar E duas vezes.
   * Pelo topo da pilha isso nao tem como acontecer: quem abriu por ultimo e quem
   * recebe a tecla.
   */
  private acionar(): void {
    switch (this.foco.topo) {
      case 'confirmacao':
        som.tocar('ui_confirmar');
        this.responderConfirmacao();
        return;
      case 'menu':
        som.tocar('ui_confirmar');
        this.escolherNoMenu();
        return;
      case 'dialogo':
        som.tocar('ui_pagina');
        this.avancarDialogo();
        return;
      case 'loja':
        som.tocar('ui_confirmar');
        this.pedirCompra();
        return;
      case 'inventario':
      case 'computador':
        // o inventario usa outra tecla pra usar item, e o PC tem input proprio
        // na cena dele
        return;
      default: {
        const mundo = this.scene.get('FarmScene') as unknown as MundoJogavel | undefined;
        mundo?.interagir();
      }
    }
  }
}

/** Uma linha do menu de escolha. */
export interface OpcaoDeMenu {
  rotulo: string;
  aoEscolher(): void;
}

/** A fonte e monoespacada, entao contar caractere ja e medir largura. */
const LIMITE_MENU = Math.floor((MENU.w - MENU.margem * 2) / 6) - 2;

function encurtarMenu(conteudo: string): string {
  return conteudo.length <= LIMITE_MENU ? conteudo : `${conteudo.slice(0, LIMITE_MENU - 1)}…`;
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

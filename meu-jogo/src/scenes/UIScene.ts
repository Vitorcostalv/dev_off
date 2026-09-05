import Phaser from 'phaser';
import {
  MESES,
  dataDoDia,
  diaAbsolutoDe,
  diasDoMes,
  formatarDataCompleta,
  formatarDataCurta,
} from '../game/calendario';
import { tempoDoDia } from '../game/clima';
import { CAMADA, COR, FONTE, PECA, corDaFracao, textoDaFracao } from '../game/tema';
import * as ui from './ui';
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
import type { Fala, MundoJogavel } from '../game/tipos';
import {
  NOME_DO_SLOT,
  SLOTS_DE_EQUIPAMENTO,
  acoesDoItem,
  comportamentoDe,
  podeDescartar,
} from '../game/equipar';
import { buscarArma } from '../game/armas';
import { fichaDoAndar, linhasDaFicha, tituloDaFicha } from '../game/fichas';
import { documentoDoAndar, linhasDoDocumento, tituloDoDocumento } from '../game/documentos';
import { SECOES_DE_ARQUIVO } from '../game/andares';
import type { SecaoDeArquivo } from '../game/andares';

/**
 * Caixa de dialogo. Subiu de 74 pra 82 px de altura e ganhou a coluna do
 * RETRATO a esquerda; o texto passou de 10 pra 12 px. O relato era de
 * dificuldade de leitura: em 480x270 escalado, 10 px de monoespacada com fundo
 * a 88% de opacidade fica no limite do legivel quando o cenario por tras e
 * claro (grama ao meio-dia, piso de loja).
 */
const CAIXA = {
  x: 8,
  w: CONFIG.largura - 16,
  /** rodape da caixa: ela cresce PRA CIMA a partir daqui */
  base: CONFIG.altura - 8,
  /** altura minima — o retrato precisa dela pra nao virar selo */
  hMin: 62,
  /** altura maxima, com quatro linhas de fala */
  hMax: 92,
} as const;
/**
 * Medidas do CARTAO da HUD.
 *
 * `hSemVida` e a altura quando a barra de vida esta escondida — na cidade, com o
 * jogador inteiro, a HUD e so data, hora e saldo. Ver `desenharHud`.
 */
const HUD = { x: 6, y: 6, w: 116, h: 56, hSemVida: 34, wRepresa: 176 } as const;

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
/**
 * MEDIDAS do painel de inventario.
 *
 * A janela antiga tinha 20 slots de 22 px espremidos a esquerda e uma coluna de
 * detalhe de 176 px, com sobra vazia no meio — era o "retangulo escuro grande com
 * slot miudo" que a Parte 43 apontou. A nova ocupa quase a tela toda (456x238 de
 * 480x270), com tres blocos de leitura clara: GRADE a esquerda, ITEM no centro,
 * EQUIPAMENTO e ACOES no rodape.
 */
/**
 * OS FILTROS do inventario (Parte 63).
 *
 * Eles sao uma VISTA e nao uma ordenacao: trocar de aba nao mexe em slot
 * nenhum, e o save continua com os itens exatamente onde estavam. Isso importa
 * porque o slot e endereco — o jogador decora que a chave inglesa fica no
 * canto, e um filtro que reordenasse a mochila apagaria essa memoria toda vez
 * que alguem olhasse os consumiveis.
 *
 * `tipos` vazio = a aba TODOS, que nao filtra nada.
 */
const FILTROS_DE_INVENTARIO: readonly { id: string; nome: string; tipos: readonly string[] }[] = [
  { id: 'todos', nome: 'TUDO', tipos: [] },
  { id: 'consumiveis', nome: 'CONSUMO', tipos: ['consumivel'] },
  { id: 'ferramentas', nome: 'FERRAM.', tipos: ['ferramenta', 'acesso'] },
  { id: 'armas', nome: 'ARMAS', tipos: ['arma', 'municao'] },
  { id: 'componentes', nome: 'PECAS', tipos: ['componente', 'material'] },
  { id: 'eletronicos', nome: 'ELETRO', tipos: ['eletronico'] },
];

const INV = {
  colunas: 5,
  linhas: 4,
  /** painel */
  x: 12,
  y: 16,
  w: 456,
  h: 238,
  /** grade de slots */
  gradeX: 24,
  gradeY: 56,
  /** coluna do item selecionado */
  colunaX: 180,
  colunaW: 276,
  /**
   * rodape: equipamento a esquerda, acoes a direita.
   *
   * O numero e o que sobra pro poco da descricao: cada ponto que ele desce e
   * uma linha a mais de texto de item, e cada ponto que ele sobe e folga pras
   * acoes. Subiu de 176 pra 184 quando as abas de filtro empurraram a grade
   * doze pixels pra baixo — sem isso o poco perdia a quarta linha, e a frase
   * que explica o item ficava cortada.
   */
  rodapeY: 184,
  acoesX: 250,
};

/** O poco da descricao, derivado da grade — e o teto que o texto nao pode furar. */
const POCO_DESCRICAO = {
  y: INV.gradeY + PECA.previa + 8,
  h: INV.rodapeY - (INV.gradeY + PECA.previa + 8) - 4,
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
const ICONE = { inventario: PECA.slot - 8, loja: 17, previa: PECA.previa - 10 };

/**
 * Cena de interface, rodando em paralelo com a cena de mundo.
 * Concentra TODO o input de "acionar" (tecla E e clique) e decide quem trata:
 * confirmacao > dialogo > cena de mundo. Isso evita que o mesmo aperto de E
 * abra e feche algo no mesmo frame.
 */
export class UIScene extends Phaser.Scene {
  private prompt!: Phaser.GameObjects.Text;
  private rotuloAtual: string | null = null;

  /**
   * A HUD e um CARTAO desenhado, e nao quatro caixas de texto com
   * `backgroundColor`.
   *
   * O motivo e o da Parte 41: com quatro caixas independentes, data, hora, saldo
   * e vida ficavam alinhados por coincidencia e cada um com a propria moldura —
   * era o que dava a leitura de "quatro retangulos preto chapado" em vez de um
   * painel. Agora o `Graphics` desenha o cartao e os textos moram dentro dele.
   */
  private hudFundo!: Phaser.GameObjects.Graphics;
  private hudData!: Phaser.GameObjects.Text;
  private hudHora!: Phaser.GameObjects.Text;
  private hudSaldo!: Phaser.GameObjects.Text;
  /** Rotulo e numero da vida. A barra e desenhada em `hudFundo`. */
  private hudVida!: Phaser.GameObjects.Text;
  /** Andar e tensao da represa. So aparece dentro da usina. */
  private hudRepresa!: Phaser.GameObjects.Text;
  /** Arma e municao; so aparece com arma na mao. */
  private hudArma!: Phaser.GameObjects.Text;
  /** Tempo do dia; escondido quando o ceu esta limpo. */
  private hudTempo!: Phaser.GameObjects.Text;
  /**
   * Assinatura do que o cartao da HUD esta mostrando.
   *
   * Serve pra `desenharHud` repintar so quando a FORMA muda — a faixa de vida
   * entrar, a da represa sair, a barra perder um bloco. O texto muda muito mais
   * vezes que o desenho, e repintar `Graphics` a sessenta quadros por segundo por
   * causa de um relogio que virou um minuto seria desperdicio.
   */
  private hudAssinatura = '';

  /** Tela de CALENDARIO (tecla C). Montada sob demanda e destruida ao fechar. */
  private calendario: Phaser.GameObjects.Container | null = null;
  /** Mes mostrado no calendario, como deslocamento a partir do mes atual. */
  private mesDoCalendario = 0;

  private dialogo!: Phaser.GameObjects.Container;
  private dialogoNome!: Phaser.GameObjects.Text;
  private dialogoTexto!: Phaser.GameObjects.Text;
  private dialogoRetrato!: Phaser.GameObjects.Image;
  private dialogoFundo!: Phaser.GameObjects.Graphics;
  /** seta ▲/▼ ao lado do nome quando a fala mexeu no relacionamento */
  private dialogoReacao!: Phaser.GameObjects.Text;
  /** "2/4" quando a conversa tem mais de uma fala */
  private dialogoContador!: Phaser.GameObjects.Text;
  private dialogoSeta!: Phaser.GameObjects.Graphics;
  private dialogoDica!: Phaser.GameObjects.Text;
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
  /** Moldura, campos e slots do inventario — tudo que e desenhado, num Graphics. */
  private inventarioFundo!: Phaser.GameObjects.Graphics;
  /** Icone grande do item selecionado, na caixa de previa. */
  private previaSprite!: Phaser.GameObjects.Image;
  /** Quadrado colorido de previa, pros itens sem arte propria. */
  private previaCor!: Phaser.GameObjects.Rectangle;
  /** Preco do item selecionado. */
  private precoItem!: Phaser.GameObjects.Text;
  /** Slot selecionado desenhado por ultimo, pra nao repintar a grade por quadro. */
  private inventarioAssinatura = '';
  private icones: Phaser.GameObjects.Rectangle[] = [];
  /** icone de arte do slot; fica escondido nos itens que so tem cor placeholder */
  private sprites: Phaser.GameObjects.Image[] = [];
  private contadores: Phaser.GameObjects.Text[] = [];
  private seletores: Phaser.GameObjects.Rectangle[] = [];
  private itemSelecionado: number | null = null;
  /** indice do filtro ativo em `FILTROS_DE_INVENTARIO` */
  private filtroDeInventario = 0;
  /** rotulo de cada aba de filtro, criado uma vez */
  private abasDeFiltro: Phaser.GameObjects.Text[] = [];
  /** Tooltip compartilhado — a mesma peca em toda tela que precisa de uma. */
  private dica!: ui.Tooltip;
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

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  /** true quando alguma janela da UI esta capturando o jogo (pausa movimento). */
  get bloqueado(): boolean {
    return (
      this.dialogoAberto ||
      this.confirmacaoAberta ||
      this.inventarioAberto ||
      this.calendarioAberto ||
      this.lojaAberta ||
      this.menuAberto ||
      this.computadorAberto
    );
  }

  get menuAberto(): boolean {
    return this.menu?.visible ?? false;
  }

  get computadorAberto(): boolean {
    return this.pcAberto;
  }

  get lojaAberta(): boolean {
    return this.loja?.visible ?? false;
  }

  /** true enquanto uma janela modal esta por cima das outras. */
  private get modalPorCima(): boolean {
    return this.dialogoAberto || this.confirmacaoAberta || this.menuAberto;
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

    // ------------------------------------------------------------- HUD --
    // Um cartao so, no canto de cima a esquerda: data, hora, saldo e — quando
    // faz sentido — vida. A faixa da represa cresce por baixo dele.
    this.hudFundo = this.add.graphics().setDepth(CAMADA.hud);
    this.hudData = ui.nota(this, HUD.x + 8, HUD.y + 5).setDepth(CAMADA.hud + 1);
    this.hudHora = ui.titulo(this, HUD.x + 8, HUD.y + 14).setDepth(CAMADA.hud + 1);
    this.hudSaldo = ui
      .corpo(this, HUD.x + HUD.w - 8, HUD.y + 16)
      .setOrigin(1, 0)
      .setColor(COR.verdeTexto)
      .setDepth(CAMADA.hud + 1);
    this.hudVida = ui
      .nota(this, HUD.x + 8, HUD.y + 32)
      .setDepth(CAMADA.hud + 1)
      .setVisible(false);
    this.hudRepresa = ui
      .nota(this, HUD.x + 8, HUD.y + HUD.h + 5)
      .setDepth(CAMADA.hud + 1)
      .setVisible(false);
    this.hudArma = ui
      .nota(this, HUD.x + 8, HUD.y + HUD.h + 16)
      .setColor(COR.lataoTexto)
      .setDepth(CAMADA.hud + 1)
      .setVisible(false);
    this.hudTempo = ui
      .nota(this, CONFIG.largura - 10, 11)
      .setOrigin(1, 0)
      .setDepth(CAMADA.hud + 1)
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
    // O tooltip nasce antes dos paineis: eles registram os `pointerover` que o
    // usam, e um `undefined` ali daria erro no primeiro hover.
    this.dica = new ui.Tooltip(this, CAMADA.modal);
    this.inventario = this.criarPainelDeInventario();
    this.loja = this.criarPainelDeLoja();
    this.menu = this.criarMenu();

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
    teclado?.on('keydown-UP', () => this.mover(-1));
    teclado?.on('keydown-DOWN', () => this.mover(1));
    teclado?.on('keydown-W', () => this.mover(-1));
    teclado?.on('keydown-S', () => this.mover(1));
    teclado?.on('keydown-PAGE_UP', () => this.mover(-LOJA.linhas));
    teclado?.on('keydown-PAGE_DOWN', () => this.mover(LOJA.linhas));
    // C: filtro da loja com ela aberta, CALENDARIO com ela fechada. As duas
    // telas nunca convivem, entao a tecla nao precisa de duas.
    teclado?.on('keydown-C', () => {
      if (this.lojaAberta) this.alternarFiltroDaLoja();
      else this.alternarCalendario();
    });
    // Q/E trocam a ABA DE FILTRO do inventario (Parte 63). Sao as mesmas teclas
    // de aba do mapa e do painel de desenvolvimento — uma tecla, um verbo.
    teclado?.on('keydown-Q', () => this.trocarFiltro(-1));
    teclado?.on('keydown-E', (e: KeyboardEvent) => {
      // E tambem e "acionar" no mundo; so vale como aba com o inventario aberto
      if (!this.inventarioAberto || this.modalPorCima) return;
      e.preventDefault();
      this.trocarFiltro(1);
    });
    // acoes do inventario
    teclado?.on('keydown-U', () => this.usarSelecionado());
    teclado?.on('keydown-F', () => this.alternarEquipado());
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
        if (this.lojaAberta && !this.modalPorCima) this.moverListaDaLoja(dy > 0 ? 1 : -1);
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
  /**
   * A TELA DE ARQUIVOS, agora com as TRES SECOES.
   *
   * Ela abria so no prontuario, e as cem folhas de trabalho e de infancia nao
   * tinham por onde ser relidas — o jogador recolhia o documento do andar 87 e
   * ele sumia do jogo. A primeira tela e um indice das secoes; escolher uma
   * abre as cinquenta folhas dela.
   *
   * Sao dois passos e nao uma lista de 150 pelo mesmo motivo do navegador de
   * profundidade do mapa: cento e cinquenta linhas ninguem le.
   */
  abrirArquivo(): void {
    if (this.modalPorCima || this.lojaAberta || this.pcAberto) return;
    if (estado.arquivo.quantas === 0) {
      this.avisoRapido('Nenhum documento recolhido ainda.', UI.textoFraco);
      return;
    }
    this.inventario.setVisible(false);
    this.abrirMenu(
      `Arquivos — ${estado.arquivo.quantas} de 150 folhas`,
      SECOES_DE_ARQUIVO.map((secao) => ({
        rotulo: `${secao.nome}  ${estado.arquivo.quantasNaSecao(secao.id)}/50`,
        aoEscolher: () => this.abrirSecaoDoArquivo(secao.id),
      })),
    );
  }

  private abrirSecaoDoArquivo(secaoId: SecaoDeArquivo): void {
    const secao = SECOES_DE_ARQUIVO.find((s) => s.id === secaoId);
    if (!secao) return;
    const indice = estado.arquivo.indice(secaoId);
    this.abrirMenu(
      `${secao.nome} — ${estado.arquivo.quantasNaSecao(secaoId)} de 50`,
      indice.map((linha) => ({
        rotulo: linha.titulo,
        aoEscolher: () => {
          if (!linha.tem) {
            this.avisoRapido('Esta folha ainda esta na usina.', UI.textoFraco);
            return;
          }
          this.lerFicha(linha.andar, secaoId);
        },
      })),
      // ESC volta pro indice das secoes, e nao pro jogo: sair da secao errada
      // e mais comum do que querer fechar o arquivo inteiro.
      () => this.abrirArquivo(),
    );
  }

  /** Abre o texto de um documento e volta pra lista da secao ao fim da leitura. */
  private lerFicha(andar: number, secaoId: SecaoDeArquivo = 'prontuario'): void {
    const ficha = fichaDoAndar(andar);
    if (ficha) {
      this.iniciarDialogo(
        linhasDaFicha(ficha).map((texto) => ({ nome: tituloDaFicha(ficha), texto })),
        () => this.abrirSecaoDoArquivo(secaoId),
      );
      return;
    }
    const doc = documentoDoAndar(andar);
    if (!doc) return;
    this.iniciarDialogo(
      linhasDoDocumento(doc).map((texto) => ({ nome: tituloDoDocumento(doc), texto })),
      () => this.abrirSecaoDoArquivo(secaoId),
    );
  }

  // ----------------------------------------------------------- calendario --
  get calendarioAberto(): boolean {
    return this.calendario !== null;
  }

  /**
   * A TELA DE CALENDARIO: o mes inteiro, com o dia de hoje marcado.
   *
   * Ela e montada e destruida a cada abertura em vez de viver escondida como o
   * inventario e a loja. Sao ~45 objetos de texto que mudam de posicao a cada mes
   * navegado — reciclar os objetos entre meses de 28 e de 31 dias daria mais
   * codigo do que refazer.
   *
   * O que ela mostra hoje: mes, ano, dia de hoje e o tempo do dia. Aniversario,
   * evento e compromisso sao o gancho declarado da Parte 46 e ainda nao existem
   * como dado em lugar nenhum do jogo.
   */
  private alternarCalendario(): void {
    if (this.calendario) {
      this.fecharCalendario();
      return;
    }
    if (this.modalPorCima || this.pcAberto) return;
    this.inventario.setVisible(false);
    this.mesDoCalendario = 0;
    this.desenharCalendario();
  }

  private fecharCalendario(): void {
    this.calendario?.destroy(true);
    this.calendario = null;
    this.desenharPrompt();
  }

  /** Anda `passo` meses no calendario aberto. */
  private navegarCalendario(passo: number): void {
    if (!this.calendario) return;
    this.mesDoCalendario += passo;
    this.desenharCalendario();
  }

  private desenharCalendario(): void {
    this.calendario?.destroy(true);
    const hoje = dataDoDia(estado.dia);
    // desloca `mesDoCalendario` meses a partir do mes de hoje
    let mes = hoje.mes + this.mesDoCalendario;
    let ano = hoje.ano;
    while (mes > 12) {
      mes -= 12;
      ano += 1;
    }
    while (mes < 1) {
      mes += 12;
      ano -= 1;
    }

    const largura = 214;
    const altura = 150;
    const x = Math.round((CONFIG.largura - largura) / 2);
    const y = Math.round((CONFIG.altura - altura) / 2);
    const filhos: Phaser.GameObjects.GameObject[] = [];

    const fundo = this.add.graphics();
    ui.painel(fundo, { x, y, w: largura, h: altura });
    ui.campo(fundo, { x: x + 8, y: y + 26, w: largura - 16, h: 96 });
    filhos.push(fundo);

    filhos.push(ui.titulo(this, x + 12, y + 7, `${MESES[mes - 1]} de ${ano}`));

    // cabecalho dos dias da semana; a semana comeca na SEGUNDA, como `diaDaSemana`
    const celula = { w: 27, h: 15 };
    const grade = { x: x + 10, y: y + 28 };
    ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach((letra, i) => {
      filhos.push(
        ui.nota(this, grade.x + i * celula.w + celula.w / 2, grade.y, letra)
          .setOrigin(0.5, 0)
          .setColor(COR.lataoTexto),
      );
    });

    // Onde o dia 1 cai na semana. `diaAbsolutoDe` faz a ponte entre a data e o
    // contador do jogo, e e a mesma funcao que a conferencia usa.
    const primeiro = diaAbsolutoDe({ dia: 1, mes, ano });
    const colunaDoPrimeiro = ((primeiro % 7) + 7) % 7;
    const total = diasDoMes(mes, ano);
    for (let d = 1; d <= total; d++) {
      const indice = colunaDoPrimeiro + d - 1;
      const cx = grade.x + (indice % 7) * celula.w;
      const cy = grade.y + 12 + Math.floor(indice / 7) * celula.h;
      const absoluto = primeiro + d - 1;
      const hojeMesmo = absoluto === estado.dia;
      const tempo = tempoDoDia(absoluto);
      if (hojeMesmo) {
        const marca = this.add.graphics();
        marca.fillStyle(COR.latao, 0.28);
        marca.fillRect(cx + 1, cy - 2, celula.w - 2, celula.h - 2);
        marca.lineStyle(1, COR.lataoVivo, 1);
        marca.strokeRect(cx + 1.5, cy - 1.5, celula.w - 3, celula.h - 3);
        filhos.push(marca);
      }
      filhos.push(
        ui.nota(this, cx + celula.w / 2, cy, String(d))
          .setOrigin(0.5, 0)
          // dia com chuva sai na cor de agua: e a leitura rapida do mes
          .setColor(hojeMesmo ? COR.lataoVivoTexto : tempo.chuva ? COR.aguaTexto : COR.papelTexto),
      );
    }

    const tempoDeHoje = tempoDoDia(estado.dia);
    filhos.push(
      ui.nota(this, x + 12, y + altura - 24, `Hoje: ${formatarDataCompleta(estado.dia)}`)
        .setColor(COR.papelTexto),
    );
    filhos.push(ui.nota(this, x + 12, y + altura - 13, tempoDeHoje.texto, largura - 24));
    // A dica de tecla mora no RODAPE, nao no cabecalho: "Setembro de 2025" ja
    // ocupa dois tercos da barra de titulo, e as duas se sobrepunham no mes de
    // nome comprido. Aqui ela divide a linha com o tempo, que e curto.
    filhos.push(
      ui.nota(this, x + largura - 12, y + altura - 13, '[<][>] mes  [C] fechar').setOrigin(1, 0),
    );

    this.calendario = this.add.container(0, 0, filhos).setDepth(CAMADA.sobreposto);
    this.desenharPrompt();
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
    this.aviso.setText(texto);
    this.aviso.setColor(cor);
    this.aviso.setVisible(true);
    this.aviso.setAlpha(1);
    this.avisoAte = this.time.now + duracaoMs;
  }

  update(): void {
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
    // cabecalho; deixar a HUD por baixo so faz o cartao do relogio aparecer
    // cortado pela borda de cima do painel.
    const visivel = !this.lojaAberta && !this.pcAberto;
    for (const t of [this.hudData, this.hudHora, this.hudSaldo]) t.setVisible(visivel);
    if (!visivel) {
      this.hudFundo.clear();
      this.hudVida.setVisible(false);
      this.hudRepresa.setVisible(false);
      this.hudArma.setVisible(false);
      this.hudTempo.setVisible(false);
      this.hudAssinatura = '';
      return;
    }

    // DATA e HORA em duas linhas, e nao numa so: a data e referencia e a hora e
    // o numero que o jogador consulta toda hora. Juntas numa linha de 11 px elas
    // competiam. O ANO nao entra — ele quase nunca muda e come a largura do
    // cartao; quem o mostra e a tela de calendario (tecla C).
    const data = formatarDataCurta(estado.dia);
    if (this.hudData.text !== data) this.hudData.setText(data);
    if (this.hudHora.text !== estado.relogio.texto) this.hudHora.setText(estado.relogio.texto);
    const saldo = estado.carteira.texto;
    if (this.hudSaldo.text !== saldo) this.hudSaldo.setText(saldo);

    // O TEMPO fica no canto de cima a direita, e some com ceu limpo: a HUD de um
    // dia comum continua sendo data, hora e dinheiro.
    const tempo = tempoDoDia(estado.dia);
    if (this.hudTempo.text !== tempo.nome) this.hudTempo.setText(tempo.nome);
    this.hudTempo.setVisible(tempo.id !== 'limpo');

    this.atualizarVida();
    this.desenharHud();
  }

  /**
   * Redesenha o cartao da HUD.
   *
   * So repinta quando a ALTURA muda (a faixa de vida ou a da represa entra ou
   * sai). Repintar `Graphics` a sessenta quadros por segundo por causa de um
   * texto que mudou seria desperdicio — e a barra de vida, que muda de tamanho,
   * e a unica coisa que precisa de repintura por dano, o que acontece poucas
   * vezes por briga.
   */
  private desenharHud(): void {
    const comVida = this.hudVida.visible;
    const comRepresa = this.hudRepresa.visible;
    const fracao = estado.vida.fracao;
    const assinatura = [
      comVida ? Math.round(fracao * 10) : 'x',
      comRepresa ? 1 : 0,
      this.hudArma.visible ? 1 : 0,
      this.hudTempo.visible ? Math.round(this.hudTempo.width) : 'x',
    ].join('|');
    if (assinatura === this.hudAssinatura) return;
    this.hudAssinatura = assinatura;
    const g = this.hudFundo;
    g.clear();
    ui.cartao(g, { x: HUD.x, y: HUD.y, w: HUD.w, h: comVida ? HUD.h : HUD.hSemVida });
    if (comVida) {
      ui.barra(
        g,
        { x: HUD.x + 8, y: HUD.y + 42, w: HUD.w - 46, h: PECA.barra },
        fracao,
        corDaFracao(fracao),
      );
    }
    if (comRepresa) {
      const altura = this.hudArma.visible ? 26 : 15;
      ui.cartao(g, { x: HUD.x, y: HUD.y + HUD.h + 2, w: HUD.wRepresa, h: altura });
    }
    if (this.hudTempo.visible) {
      const largura = this.hudTempo.width + 16;
      ui.cartao(g, { x: CONFIG.largura - 6 - largura, y: 6, w: largura, h: 20 });
    }
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
      // A BARRA e desenhada em `Graphics` (ver `desenharHud`); aqui fica so o
      // numero, alinhado a direita dela. O rotulo continua sendo "HP" e nao
      // "energia": sao dois recursos diferentes e o jogador nao pode confundir.
      const texto = `HP  ${estado.vida.hp}/${estado.vida.maxHp}`;
      if (this.hudVida.text !== texto) this.hudVida.setText(texto);
      this.hudVida.setColor(textoDaFracao(estado.vida.fracao));
      this.hudVida.setPosition(HUD.x + HUD.w - 8, HUD.y + 41);
      this.hudVida.setOrigin(1, 0);
    }

    const setor = setorDaRepresa(estado.mapa);
    this.hudRepresa.setVisible(Boolean(setor));
    this.hudArma.setVisible(false);
    if (!setor) return;
    const tensao = Math.round(estado.represa.tensao * 100);
    // O CODIGO do andar (`A-06`) no lugar do "nivel -5" antigo: com cinquenta
    // andares a notacao negativa deixou de dizer algo — ninguem pensa "estou no
    // nivel menos quarenta e nove".
    const texto = `${setor.codigo}  ${setor.rotulo}   tensao ${tensao}%`;
    if (this.hudRepresa.text !== texto) this.hudRepresa.setText(texto);
    this.hudRepresa.setColor(
      tensao < 34 ? COR.papelFracoTexto : tensao < 67 ? COR.ambarTexto : COR.alertaTexto,
    );

    // ARMA E MUNICAO numa linha propria, e so com arma na mao: e a HUD tecnica
    // que a Parte 42 pediu, sem virar painel de estatistica.
    const arma = buscarArma(comportamentoDe(estado.equipamento.naMao)?.arma);
    if (!arma) return;
    const linha = `${arma.nome}  ${estado.armas.noCarregador(arma.id)} / `
      + `${estado.inventario.contar(arma.municao)}`;
    if (this.hudArma.text !== linha) this.hudArma.setText(linha);
    this.hudArma.setVisible(true);
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
    this.dialogoSeta.setVisible(true);
    this.dialogoDica.setVisible(true);
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

  /**
   * Monta a caixa de dialogo pra fala atual.
   *
   * A ALTURA sai do texto e nao de uma constante. A caixa antiga tinha 82 px
   * fixos: uma fala de uma linha deixava dois tercos dela vazios, e a Parte 57
   * pede explicitamente que nao haja painel grande e vazio. Aqui ela cresce PRA
   * CIMA a partir do rodape, entre um minimo (o retrato precisa de altura pra
   * nao virar selo) e um maximo de quatro linhas.
   */
  private desenharFala(): void {
    const fala = this.falas[this.indiceFala];
    const chave = this.texturaDeRetrato(fala.npcId);

    // 1. mede o texto com a largura que ele VAI ter, pra saber a altura da caixa
    const xTexto = CAIXA.x + (chave ? RETRATO.margem * 2 + RETRATO.lado + 2 : 10);
    const larguraTexto = CAIXA.x + CAIXA.w - 10 - xTexto;
    this.dialogoTexto.setWordWrapWidth(larguraTexto);
    this.dialogoTexto.setText(fala.texto);
    const alturaTexto = this.dialogoTexto.height;

    // 2. a caixa: cabecalho (placa do nome) + texto + rodape da dica
    const altura = Math.max(
      CAIXA.hMin,
      Math.min(CAIXA.hMax, 10 + 14 + alturaTexto + 12),
    );
    const y = CAIXA.base - altura;
    const r = { x: CAIXA.x + RETRATO.margem, y: y + RETRATO.margem, w: RETRATO.lado, h: altura - RETRATO.margem * 2 };

    const g = this.dialogoFundo;
    g.clear();
    ui.painel(g, { x: CAIXA.x, y, w: CAIXA.w, h: altura }, false);
    if (chave) ui.campo(g, r, true);

    // 3. PLACA DO NOME: um campo curto atras do nome, com fio de latao embaixo.
    //    Sem ela o nome era so um texto de outra cor, e "quem esta falando" e a
    //    primeira coisa que se procura numa caixa de dialogo.
    this.dialogoNome.setText(fala.nome);
    this.dialogoNome.setPosition(xTexto + 4, y + 7);
    const larguraPlaca = Math.min(this.dialogoNome.width + 8, larguraTexto);
    ui.campo(g, { x: xTexto, y: y + 5, w: larguraPlaca, h: 14 });
    g.lineStyle(1, COR.latao, 0.9);
    g.beginPath();
    g.moveTo(xTexto, y + 19.5);
    g.lineTo(xTexto + larguraPlaca, y + 19.5);
    g.strokePath();

    // 4. SETA DE REACAO (Parte 60): so o sentido, nunca o numero.
    if (fala.reacao) {
      this.dialogoReacao
        .setText(fala.reacao > 0 ? '▲' : '▼')
        .setColor(fala.reacao > 0 ? COR.verdeTexto : COR.alertaTexto)
        .setPosition(xTexto + larguraPlaca + 5, y + 7)
        .setVisible(true);
    } else this.dialogoReacao.setVisible(false);

    this.dialogoTexto.setPosition(xTexto, y + 24);

    // 5. retrato
    this.dialogoRetrato.setVisible(Boolean(chave));
    if (chave) {
      this.dialogoRetrato.setTexture(chave, 'down-0');
      const escala = Math.min(
        (r.w - 6) / this.dialogoRetrato.width,
        (r.h - 6) / this.dialogoRetrato.height,
      );
      this.dialogoRetrato.setScale(escala).setPosition(r.x + r.w / 2, r.y + r.h - 3);
    }

    // 6. quanto falta: "2/4" so quando a conversa tem mais de uma fala
    const total = this.falas.length;
    this.dialogoContador
      .setText(total > 1 ? `${this.indiceFala + 1}/${total}` : '')
      .setPosition(CAIXA.x + CAIXA.w - 34, CAIXA.base - 5);

    // 7. indicador de continuar: triangulo + [E]
    this.dialogoDica.setPosition(CAIXA.x + CAIXA.w - 8, CAIXA.base - 4);
    const sx = CAIXA.x + CAIXA.w - 30;
    const sy = CAIXA.base - 10;
    this.dialogoSeta.clear();
    this.dialogoSeta.fillStyle(COR.lataoVivo, 1);
    this.dialogoSeta.fillTriangle(sx - 3, sy - 2, sx + 3, sy - 2, sx, sy + 2);
  }

  /** A textura de retrato de um NPC, ou null quando a fala nao tem dono. */
  private texturaDeRetrato(npcId: string | undefined): string | null {
    const chaves = npcId ? [`npc-${npcId}-parado`, `npc-${npcId}-sprites`] : [];
    return chaves.find((k) => this.textures.exists(k) && this.textures.get(k).has('down-0')) ?? null;
  }

  private criarCaixaDeDialogo(): Phaser.GameObjects.Container {
    // Um Graphics so pra caixa, a moldura do retrato e a placa do nome: os tres
    // sao repintados juntos a cada fala, porque a ALTURA da caixa depende do
    // texto e as tres pecas se movem com ela.
    this.dialogoFundo = this.add.graphics();

    this.dialogoRetrato = this.add.image(0, 0, '').setOrigin(0.5, 1);

    this.dialogoNome = ui.corpo(this, 0, 0, '').setColor(COR.lataoVivoTexto);
    this.dialogoReacao = ui.corpo(this, 0, 0, '');
    this.dialogoTexto = this.add.text(0, 0, '', {
      fontFamily: FONTE.familia,
      fontSize: '12px',
      color: COR.papelTexto,
      lineSpacing: 4,
    });
    this.dialogoContador = ui.nota(this, 0, 0, '').setOrigin(1, 1);

    // O indicador de continuar e TRIANGULO mais texto, e nao so texto: quem
    // joga sem som e com a tela pequena reconhece a forma antes de ler.
    this.dialogoSeta = this.add.graphics();
    const dica = ui.nota(this, 0, 0, '[E]').setOrigin(1, 1);
    this.dialogoDica = dica;
    this.tweens.add({
      targets: [dica, this.dialogoSeta], alpha: 0.3, duration: 620, yoyo: true, repeat: -1,
    });

    return this.add
      .container(0, 0, [
        this.dialogoFundo,
        this.dialogoRetrato,
        this.dialogoNome,
        this.dialogoReacao,
        this.dialogoTexto,
        this.dialogoContador,
        this.dialogoSeta,
        dica,
      ])
      .setDepth(CAMADA.painel)
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
    if (this.calendario) {
      evento?.preventDefault();
      this.navegarCalendario(passo);
      return;
    }
    // o inventario vem antes da loja porque os dois nunca convivem, e antes da
    // confirmacao nao: com uma pergunta na tela e ela que manda
    if (this.inventarioAberto && !this.modalPorCima) {
      evento?.preventDefault();
      this.moverGradeDoInventario(passo);
      return;
    }
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
    if (this.calendario) {
      this.fecharCalendario();
      return;
    }
    if (this.menuAberto) {
      this.cancelarMenu();
      return;
    }
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
    ui.painel(fundo, { x, y, w: CONFIRMA.w, h: CONFIRMA.h }, false);

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
    if (npcId) {
      // Reusa a propria caixa de dialogo, com uma "fala" de texto vazio: e o
      // que mantem o retrato, a placa do nome e a moldura identicos aos da
      // conversa, sem uma segunda montagem de caixa so pro menu.
      this.falas = [{ nome: titulo, texto: '', npcId }];
      this.indiceFala = 0;
      this.desenharFala();
      this.dialogoSeta.setVisible(false);
      this.dialogoDica.setVisible(false);
      this.dialogo.setVisible(true);
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
    this.menu.setVisible(false);
    this.menuOpcoes = [];
    this.menuAoCancelar = null;
    // a caixa so foi aberta pra segurar o retrato; sem falas dentro dela, ela
    // sai junto com o menu
    if (this.falas.length === 0) this.dialogo.setVisible(false);
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
    const y = CAIXA.base - CAIXA.hMax - altura - 4;

    this.menuFundo.clear();
    ui.painel(this.menuFundo, { x, y, w: MENU.w, h: altura }, false);

    this.menuTitulo.setPosition(x + MENU.margem, y + MENU.margem);

    this.menuLinhas.forEach((linha, i) => {
      const opcao = this.menuOpcoes[this.menuTopo + i];
      const dentro = i < visiveis && Boolean(opcao);
      linha.setVisible(dentro);
      if (!dentro || !opcao) return;
      const ativo = this.menuTopo + i === this.menuCursor;
      const ly = y + MENU.margem + 15 + i * MENU.alturaLinha;
      /**
       * A ESCOLHA SELECIONADA TEM TRES MARCAS, e nao uma (Parte 59).
       *
       * Cor, sozinha, nao serve: quem nao distingue as duas nao ve escolha
       * nenhuma marcada. Aqui a linha ativa ganha tambem uma BARRA atras dela e
       * um TRACO de latao na margem esquerda — forma e posicao, que se leem sem
       * cor.
       */
      if (ativo) {
        this.menuFundo.fillStyle(COR.latao, 0.16);
        this.menuFundo.fillRect(x + 4, ly - 2, MENU.w - 8, MENU.alturaLinha);
        this.menuFundo.fillStyle(COR.lataoVivo, 1);
        this.menuFundo.fillRect(x + 4, ly - 2, 2, MENU.alturaLinha);
      }
      linha.setPosition(x + MENU.margem, ly);
      linha.setColor(ativo ? COR.lataoVivoTexto : COR.papelTexto);
      linha.setText(`${ativo ? '>' : ' '} ${encurtarMenu(opcao.rotulo)}`);
    });

    this.menuRodape.setPosition(x + MENU.margem, y + altura - 13);
    this.menuRodape.setText(
      this.menuOpcoes.length > MENU.linhas
        ? `${this.menuCursor + 1}/${this.menuOpcoes.length}  [W/S] escolher  [E] confirmar  [ESC] sair`
        : '[W/S] escolher   [E] confirmar   [ESC] sair',
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
    this.menuRodape = this.add.text(0, 0, '', {
      fontFamily: UI.fonte,
      fontSize: UI.tamanho,
      color: UI.textoFraco,
    });

    return this.add
      .container(0, 0, [this.menuFundo, this.menuTitulo, ...this.menuLinhas, this.menuRodape])
      .setDepth(108)
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
    this.dica.esconder();
    if (this.inventarioAberto) {
      this.avisoInventario.setText('');
      // Abrir com a grade cheia e a coluna da direita dizendo "nenhum item
      // selecionado" le como painel quebrado. Se o cursor nao aponta pra um
      // slot com item, ele cai no primeiro que tem.
      if (this.slotSelecionado === null) this.itemSelecionado = this.primeiroSlotCheio();
      this.desenharInventario();
    }
    this.desenharPrompt();
  }

  /**
   * Escreve a descricao do item SEM furar o poco dela.
   *
   * As linhas vem de fontes independentes (o texto do catalogo, os numeros da
   * arma, o efeito, o detalhe) e cada uma ainda pode quebrar em duas na largura
   * da coluna — nao da pra saber de antemao quantas cabem. Entao escreve tudo,
   * mede, e vai tirando a ULTIMA ate caber: o que se perde e sempre o detalhe
   * acessorio, nunca o nome nem o numero de dano. Sem isso a descricao da chave
   * inglesa passa por cima do rotulo ACOES.
   */
  private escreverDescricao(linhas: string[]): void {
    const teto = POCO_DESCRICAO.y + POCO_DESCRICAO.h - this.descricaoItem.y - 4;
    const restantes = [...linhas];
    while (restantes.length > 0) {
      this.descricaoItem.setText(restantes.join('\n'));
      if (this.descricaoItem.height <= teto) return;
      restantes.pop();
    }
    this.descricaoItem.setText('');
  }

  /**
   * O que cada celula da grade mostra: um indice de SLOT REAL, ou null.
   *
   * Na aba TUDO o mapa e a identidade — a celula 7 e o slot 7. E de proposito:
   * o slot e endereco, o jogador decora que a chave inglesa fica no canto de
   * cima, e reordenar a mochila apagaria essa memoria. Nas outras abas a grade
   * junta so o que casa com o filtro, sem tocar em slot nenhum: e uma VISTA, e
   * o save nao muda por causa dela (Parte 63).
   */
  private mapaDaGrade(): (number | null)[] {
    const celulas = INV.colunas * INV.linhas;
    const filtro = FILTROS_DE_INVENTARIO[this.filtroDeInventario];
    if (!filtro || filtro.tipos.length === 0) {
      return Array.from({ length: celulas }, (_, i) => (i < estado.inventario.slots.length ? i : null));
    }
    const casam: (number | null)[] = [];
    estado.inventario.slots.forEach((slot, i) => {
      if (!slot) return;
      const def = ITENS[slot.id];
      if (def && filtro.tipos.includes(def.tipo)) casam.push(i);
    });
    while (casam.length < celulas) casam.push(null);
    return casam.slice(0, celulas);
  }

  /** Troca a aba de filtro e leva o cursor pro primeiro item dela. */
  private trocarFiltro(passo: number): void {
    if (!this.inventarioAberto || this.modalPorCima) return;
    const n = FILTROS_DE_INVENTARIO.length;
    this.filtroDeInventario = (this.filtroDeInventario + passo + n) % n;
    const grade = this.mapaDaGrade();
    const primeiro = grade.find((a) => a !== null && estado.inventario.slots[a]);
    this.itemSelecionado = primeiro ?? null;
    this.avisoInventario.setText('');
    this.desenharInventario();
  }

  /** O indice do primeiro slot com item, ou null se a mochila esta vazia. */
  private primeiroSlotCheio(): number | null {
    const i = estado.inventario.slots.findIndex((slot) => slot !== null);
    return i === -1 ? null : i;
  }

  /**
   * Anda com o cursor pela GRADE do inventario.
   *
   * O passo e em slots, e a grade e uma so lista: `+1` anda pra direita e vira
   * a linha sozinho, `+INV.colunas` desce. O cursor nao circula — parar na
   * borda e o que deixa segurar a tecla sem perder de vista onde se estava.
   */
  private moverGradeDoInventario(passo: number): void {
    // Anda pela VISTA e nao pelo slot: com um filtro ativo a celula 3 pode ser
    // o slot 11, e mover "um pra direita" tem de ir pra proxima CELULA.
    const grade = this.mapaDaGrade();
    if (grade.length === 0) return;
    const atual = this.itemSelecionado === null
      ? (passo > 0 ? -1 : grade.length)
      : grade.indexOf(this.itemSelecionado);
    const alvo = Math.min(grade.length - 1, Math.max(0, (atual < 0 ? (passo > 0 ? -1 : grade.length) : atual) + passo));
    const slot = grade[alvo];
    if (slot === null || slot === this.itemSelecionado) return;
    this.itemSelecionado = slot;
    this.avisoInventario.setText('');
    this.desenharInventario();
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
    if (!this.inventarioAberto || this.modalPorCima) return;
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
    if (!this.inventarioAberto || this.modalPorCima) return;
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
    if (!this.inventarioAberto || this.modalPorCima) return;
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
    if (!this.inventarioAberto || this.modalPorCima) return;
    estado.inventario.organizar();
    // os itens trocaram de slot: manter a selecao apontaria pro item errado
    this.itemSelecionado = null;
    this.avisar('Inventario organizado por tipo.', UI.sucesso);
    this.desenharInventario();
  }

  /**
   * Redesenha o conteudo do inventario.
   *
   * O DESENHO (moldura, campos, slots) sai num `Graphics` e so e repintado
   * quando alguma coisa visivel muda — a assinatura junta o que cada slot tem e
   * qual esta selecionado. Os textos e os icones sao objetos de cena e mudam
   * sozinhos.
   */
  private desenharInventario(): void {
    const slots = estado.inventario.slots;
    const grade = this.mapaDaGrade();
    // A assinatura inclui o FILTRO: trocar de aba muda o que a grade desenha
    // sem mudar um slot sequer, e sem isto a moldura ficaria na aba anterior.
    const assinatura = `${this.filtroDeInventario}|${slots
      .map((s, i) => `${s ? `${s.id}:${s.qtd}` : '-'}${this.itemSelecionado === i ? '*' : ''}`)
      .join(',')}`;
    if (assinatura !== this.inventarioAssinatura) {
      this.inventarioAssinatura = assinatura;
      this.desenharGradeDeSlots();
    }

    for (let i = 0; i < this.icones.length; i++) {
      const alvo = grade[i];
      const slot = alvo === null ? null : slots[alvo];
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
      const qtd = slot && slot.qtd > 1 ? `${slot.qtd}` : '';
      if (this.contadores[i].text !== qtd) this.contadores[i].setText(qtd);
    }

    const slot = this.itemSelecionado === null ? null : slots[this.itemSelecionado];
    const def = slot ? ITENS[slot.id] : undefined;
    const c = def ? comportamentoDe(def.id) : null;
    const arma = buscarArma(c?.arma);

    // ---------------------------------------------------------- previa --
    const comArte = Boolean(def?.frame);
    this.previaSprite.setVisible(comArte);
    if (def?.frame) {
      this.previaSprite.setFrame(def.frame);
      ajustarIcone(this.previaSprite, ICONE.previa);
    }
    this.previaCor.setVisible(Boolean(def) && !comArte);
    if (def && !comArte) this.previaCor.setFillStyle(def.icone, 1);

    // ------------------------------------------------------ identidade --
    this.nomeItem.setText(def ? def.nome : 'Nenhum item selecionado');
    this.nomeItem.setColor(def ? COR.lataoVivoTexto : COR.papelFracoTexto);
    this.tipoItem.setText(
      def && slot ? `${def.tipo}${slot.qtd > 1 ? `  ·  ${slot.qtd} unidades` : ''}` : '',
    );
    this.precoItem.setText(def?.preco === undefined ? '' : formatarDinheiro(def.preco));

    // ------------------------------------------------------- descricao --
    const linhas = [def?.descricao ?? (def ? '' : 'Escolha um item na grade a esquerda.')];
    if (arma) {
      linhas.push(
        `Dano ${arma.dano}  ·  carregador ${estado.armas.noCarregador(arma.id)}/${arma.carregador}`
          + `  ·  reserva ${estado.inventario.contar(arma.municao)}`,
      );
    } else if (c?.danoCorpoACorpo) {
      linhas.push(`Dano de golpe ${c.danoCorpoACorpo}`);
    }
    if (c?.acao?.tipo === 'curar') linhas.push(`Recupera ${c.acao.quantidade} de vida.`);
    if (c?.detalhe) linhas.push(c.detalhe);
    this.escreverDescricao(linhas.filter(Boolean));

    // ----------------------------------------------------- equipamento --
    this.equipadoTexto.setText(
      SLOTS_DE_EQUIPAMENTO.map((sl) => {
        const id = estado.equipamento.equipado(sl);
        const nome = id ? (ITENS[id]?.nome ?? id) : '—';
        return `${NOME_DO_SLOT[sl].padEnd(11)} ${nome}`;
      }).join('\n'),
    );

    // ----------------------------------------------------------- acoes --
    if (!def) {
      this.acoesTexto.setText('');
      return;
    }
    const acoes = acoesDoItem(def.id, estado.equipamento.estaEquipado(def.id));
    // Duas acoes por linha, em vez de uma fila unica com quebra automatica: a
    // quebra automatica corta DENTRO do rotulo ("[X]" numa linha, "descartar"
    // na outra), e um par por linha cai sempre no mesmo lugar, entao a tecla
    // que o jogador procura nao muda de posicao quando o item muda.
    const rotulos = acoes.map((acao) => ROTULO_DE_ACAO[acao]);
    const pares: string[] = [];
    for (let i = 0; i < rotulos.length; i += 2) pares.push(rotulos.slice(i, i + 2).join('   '));
    this.acoesTexto.setText(pares.join('\n'));
    // EQUIPAR fora de zona: o rotulo continua na lista, mas a razao aparece
    // logo abaixo. Esconder a acao faria o jogador achar que a pistola nao e
    // equipavel; mostrar sem explicacao faria ele achar que o jogo travou.
    if (acoes.includes('equipar') && c?.zonas) {
      const podeAqui = estado.equipamento.podeEquipar(def.id, estado.mapa).ok;
      if (!podeAqui) this.avisar(c.recusaDeZona ?? 'So da pra equipar em area perigosa.', UI.alerta);
    }
  }

  /** Repinta a moldura, os campos e os vinte slots. */
  private desenharGradeDeSlots(): void {
    const g = this.inventarioFundo;
    const slots = estado.inventario.slots;
    g.clear();
    ui.painel(g, { x: INV.x, y: INV.y, w: INV.w, h: INV.h });

    // ABAS DE FILTRO, no topo do painel (Parte 63)
    const grade = this.mapaDaGrade();
    let ax = INV.gradeX;
    FILTROS_DE_INVENTARIO.forEach((f, i) => {
      const aba = this.abasDeFiltro[i];
      if (!aba) return;
      const ativa = i === this.filtroDeInventario;
      aba.setText(f.nome).setPosition(ax + 4, INV.gradeY - 21)
        .setColor(ativa ? COR.lataoVivoTexto : COR.papelFracoTexto);
      ui.aba(g, { x: ax, y: INV.gradeY - 24, w: aba.width + 8, h: 13 }, ativa);
      ax += aba.width + 12;
    });

    const passo = PECA.slot + PECA.vaoSlot;
    for (let i = 0; i < INV.colunas * INV.linhas; i++) {
      const sx = INV.gradeX + (i % INV.colunas) * passo;
      const sy = INV.gradeY + Math.floor(i / INV.colunas) * passo;
      const alvo = grade[i];
      const estadoDoSlot = alvo !== null && this.itemSelecionado === alvo
        ? 'selecionado'
        : alvo !== null && slots[alvo]
          ? 'cheio'
          : 'vazio';
      ui.slot(g, { x: sx, y: sy, w: PECA.slot, h: PECA.slot }, estadoDoSlot);
    }

    // caixa de previa e campo de descricao
    ui.campo(g, { x: INV.colunaX, y: INV.gradeY, w: PECA.previa, h: PECA.previa }, true);
    ui.campo(g, {
      x: INV.colunaX,
      y: POCO_DESCRICAO.y,
      w: INV.colunaW,
      h: POCO_DESCRICAO.h,
    });
    ui.divisoria(g, INV.gradeX, INV.x + INV.w - 12, INV.rodapeY);
    // fio vertical entre EQUIPADO e ACOES
    g.lineStyle(1, COR.madeira, 0.8);
    g.beginPath();
    g.moveTo(INV.acoesX - 12.5, INV.rodapeY + 6);
    g.lineTo(INV.acoesX - 12.5, INV.rodapeY + 50);
    g.strokePath();
  }

  /**
   * Monta o painel de inventario.
   *
   * A janela ficou com tres blocos, e a hierarquia da Parte 43 esta neles:
   *
   *   GRADE (esquerda)    vinte slots de 26 px, o dobro da area de antes
   *   ITEM (centro)       previa grande, nome, tipo, preco e descricao
   *   RODAPE              o que esta EQUIPADO, e as acoes do item selecionado
   *
   * O que e desenhado (moldura, campos, slots) sai de `desenharGradeDeSlots`;
   * aqui ficam so os objetos de cena que mudam de texto.
   */
  private criarPainelDeInventario(): Phaser.GameObjects.Container {
    const filhos: Phaser.GameObjects.GameObject[] = [];
    this.inventarioFundo = this.add.graphics();
    filhos.push(this.inventarioFundo);

    filhos.push(ui.titulo(this, INV.x + 12, INV.y + 7, 'INVENTARIO'));
    filhos.push(
      ui.nota(this, INV.x + INV.w - 12, INV.y + 9, '[Q/E] aba   [Tab] fechar').setOrigin(1, 0),
    );

    // ------------------------------------------------- abas de filtro --
    // Sao criadas uma vez e so REPOSICIONADAS por quadro: a largura de cada uma
    // depende do texto, e o texto nao muda.
    this.abasDeFiltro = FILTROS_DE_INVENTARIO.map((f) => {
      const t = ui.nota(this, 0, 0, f.nome);
      filhos.push(t);
      return t;
    });

    // ------------------------------------------------------------ grade --
    const passo = PECA.slot + PECA.vaoSlot;
    this.icones = [];
    this.sprites = [];
    this.contadores = [];
    this.seletores = [];
    for (let i = 0; i < INV.colunas * INV.linhas; i++) {
      const sx = INV.gradeX + (i % INV.colunas) * passo;
      const sy = INV.gradeY + Math.floor(i / INV.colunas) * passo;
      // O seletor continua sendo um retangulo INVISIVEL: ele existe pro clique e
      // pro cursor de mao. Quem desenha o slot e o `Graphics`.
      const seletor = this.add
        .rectangle(sx, sy, PECA.slot, PECA.slot, 0x000000, 0)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      seletor.on('pointerdown', () => {
        const alvo = this.mapaDaGrade()[i];
        if (alvo === null) return;
        this.itemSelecionado = alvo;
        this.desenharInventario();
      });
      // TOOLTIP no hover (Parte 66): o painel da direita ja mostra o item
      // SELECIONADO; o tooltip mostra o que esta debaixo do cursor, que e outra
      // pergunta — "o que e esse aqui?" sem perder o que ja estava escolhido.
      seletor.on('pointerover', () => {
        const alvo = this.mapaDaGrade()[i];
        const slot = alvo === null ? null : estado.inventario.slots[alvo];
        const def = slot ? ITENS[slot.id] : undefined;
        if (!def) {
          this.dica.esconder();
          return;
        }
        this.dica.mostrar(
          sx + PECA.slot, sy,
          def.nome,
          [def.descricao, slot && slot.qtd > 1 ? `${slot.qtd} unidades` : '']
            .filter(Boolean).join('\n'),
        );
      });
      seletor.on('pointerout', () => this.dica.esconder());
      const icone = this.add
        .rectangle(sx + PECA.slot / 2, sy + PECA.slot / 2, ICONE.inventario, ICONE.inventario, 0xffffff)
        .setVisible(false);
      const sprite = this.add
        .image(sx + PECA.slot / 2, sy + PECA.slot / 2, 'itens')
        .setVisible(false);
      const contador = this.add
        .text(sx + PECA.slot - 3, sy + PECA.slot - 3, '', {
          fontFamily: FONTE.familia,
          fontSize: FONTE.nota,
          color: COR.papelTexto,
        })
        .setOrigin(1, 1);

      this.icones.push(icone);
      this.sprites.push(sprite);
      this.contadores.push(contador);
      this.seletores.push(seletor);
      filhos.push(seletor, icone, sprite, contador);
    }

    // ------------------------------------------------------------ previa --
    const centroPrevia = {
      x: INV.colunaX + PECA.previa / 2,
      y: INV.gradeY + PECA.previa / 2,
    };
    this.previaCor = this.add
      .rectangle(centroPrevia.x, centroPrevia.y, ICONE.previa, ICONE.previa, 0xffffff)
      .setVisible(false);
    this.previaSprite = this.add.image(centroPrevia.x, centroPrevia.y, 'itens').setVisible(false);
    filhos.push(this.previaCor, this.previaSprite);

    // -------------------------------------------------------- identidade --
    const textoX = INV.colunaX + PECA.previa + 10;
    const larguraTexto = INV.colunaW - PECA.previa - 10;
    this.nomeItem = ui.corpo(this, textoX, INV.gradeY + 4, '', larguraTexto);
    this.tipoItem = ui.nota(this, textoX, INV.gradeY + 24, '', larguraTexto);
    this.precoItem = ui
      .corpo(this, textoX, INV.gradeY + 40)
      .setColor(COR.verdeTexto);
    filhos.push(this.nomeItem, this.tipoItem, this.precoItem);

    this.descricaoItem = ui.miudo(
      this,
      INV.colunaX + 6,
      INV.gradeY + PECA.previa + 14,
      '',
      INV.colunaW - 12,
      COR.papelTexto,
    );
    filhos.push(this.descricaoItem);

    // ------------------------------------------------------- equipamento --
    filhos.push(ui.nota(this, INV.gradeX, INV.rodapeY + 6, 'EQUIPADO').setColor(COR.lataoTexto));
    this.equipadoTexto = ui.miudo(this, INV.gradeX, INV.rodapeY + 18, '', 200, COR.papelTexto);
    filhos.push(this.equipadoTexto);

    // ------------------------------------------------------------ acoes --
    filhos.push(ui.nota(this, INV.acoesX, INV.rodapeY + 6, 'ACOES').setColor(COR.lataoTexto));
    this.acoesTexto = ui.miudo(
      this,
      INV.acoesX,
      INV.rodapeY + 18,
      '',
      INV.x + INV.w - 12 - INV.acoesX,
      COR.papelTexto,
    );
    filhos.push(this.acoesTexto);
    filhos.push(
      ui.nota(
        this,
        INV.acoesX,
        INV.rodapeY + 44,
        '[O] organizar   [setas] escolher',
        INV.x + INV.w - 12 - INV.acoesX,
      ),
    );

    this.avisoInventario = ui.nota(
      this,
      INV.gradeX,
      INV.y + INV.h - 18,
      '',
      INV.w - (INV.gradeX - INV.x) * 2,
    );
    filhos.push(this.avisoInventario);

    return this.add.container(0, 0, filhos).setDepth(CAMADA.painel).setVisible(false);
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

  /**
   * W/S e as setas verticais. Um dono por vez, na ordem de quem esta por cima:
   * o menu de escolha antes da lista da loja.
   */
  private mover(passo: number): void {
    if (this.menuAberto) {
      this.moverMenu(passo);
      return;
    }
    // vertical no inventario anda uma LINHA da grade, nao um slot
    if (this.inventarioAberto && !this.modalPorCima) {
      this.moverGradeDoInventario(passo * INV.colunas);
      return;
    }
    this.moverListaDaLoja(passo);
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
      linha.fundo.setFillStyle(ativo ? 0x3a3226 : 0x000000, ativo ? 1 : 0.25);
      linha.icone.setVisible(Boolean(item?.frame));
      linha.iconeCor.setVisible(Boolean(item && !item.frame));
      linha.nome.setVisible(Boolean(item));
      linha.preco.setVisible(Boolean(item));
      if (!item) return;

      if (item.frame) {
        linha.icone.setFrame(item.frame);
        ajustarIcone(linha.icone, ICONE.loja);
      } else {
        linha.iconeCor.setFillStyle(item.icone ?? 0xa79d8c, 1);
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
        : `${this.lojaCursor + 1}/${total}  [W/S] item  [A/D] qtd  [C] prateleira  [E] comprar  [ESC] sair`,
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
    ui.painel(fundo, { x, y, w, h });
    // divisa entre a lista e a coluna de detalhe
    const divisa = x + LOJA.margem + LOJA.lista + 5;
    fundo.lineStyle(1, COR.madeira, 0.8);
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
      const iconeCor = this.add
        .rectangle(x + LOJA.margem + 12, ly + LOJA.alturaLinha / 2 - 1, 12, 12, 0xa79d8c)
        .setStrokeStyle(1, 0xf4ead2, 0.8)
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
    // o menu vem antes da loja: quando o jogador escolhe presente com a loja
    // aberta por baixo, e o menu que esta na frente
    if (this.menuAberto) {
      this.escolherNoMenu();
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

import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { nomeDoDia } from '../../game/calendario.ts';
import { estado } from '../../game/estado.ts';
import { feedAte } from '../../game/blog.ts';
import type { PostDoBlog } from '../../game/blog.ts';
import { buscarNpc } from '../../game/npcs.ts';
import { PONTOS_DE_LOJA, percentualDescontoNpc } from '../../game/loja.ts';
import { SCORE_MAXIMO } from '../../game/relacoes.ts';
import { PC, caixa, texto } from '../widgets.ts';
import type { Retangulo } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Navegador — duas abas na mesma janela: Blog e Relacionamentos.
 *
 * BLOG: feed dos ultimos dias, gerado por `game/blog.ts` (deterministico por
 * dia). So leitura — nao ha curtir nem comentar nesta etapa.
 *
 * RELACIONAMENTOS: quem o jogador ja abordou, com coracoes, o rotulo do nivel
 * (com o override de rotulo do NPC) e o desconto ativo, quando o NPC vende
 * alguma coisa.
 *
 * ---------------------------------------------------------------------------
 * DESENHO
 * ---------------------------------------------------------------------------
 * O jogo roda em 480x270 e sobe por escala inteira, entao texto abaixo de 10px
 * fica ilegivel e emoji nao ergue nesta resolucao. Os coracoes sao desenhados
 * com `Graphics` — duas metades por coracao, o que da o meio-coracao dos scores
 * fracionarios de graca — e nenhum texto aqui desce de 10px.
 *
 * Trocar de aba RECONSTROI o conteudo (`redesenhar`). A versao anterior trocava
 * so o campo `abaAtiva` e nunca redesenhava, entao clicar na aba nao fazia nada
 * visivel.
 */

type AbaNavegador = 'blog' | 'relacionamento';

const ABAS: readonly { id: AbaNavegador; rotulo: string; largura: number }[] = [
  { id: 'blog', rotulo: 'Blog', largura: 62 },
  { id: 'relacionamento', rotulo: 'Relacionamentos', largura: 132 },
];

const ALTURA_ABA = 18;
/** altura de uma linha da lista de relacionamento */
const LINHA_RELACAO = 30;
/** altura reservada por post do blog (autor + duas linhas de texto) */
const LINHA_POST = 40;

const CORACAO = {
  /** quantos coracoes representam a escala inteira (0 a 12) */
  quantidade: SCORE_MAXIMO,
  raio: 4,
  passo: 10,
  cheio: 0xe06a72,
  vazio: 0x3a4150,
  quebrado: 0xc4562f,
} as const;

export class Navegador implements AppDoPc {
  readonly id = 'navegador';
  readonly titulo = 'Navegador';
  readonly glifo = '@';
  readonly cor = 0x3a7f8c;
  readonly resumo = 'Blog e Relacionamentos';

  private cena!: Phaser.Scene;
  private area!: Retangulo;
  private corpo!: Retangulo;
  /** container do CONTEUDO da aba; trocar de aba destroi os filhos dele */
  private conteudo!: Phaser.GameObjects.Container;
  private rodape!: Phaser.GameObjects.Text;

  private abaAtiva: AbaNavegador = 'blog';
  private abas: { fundo: Phaser.GameObjects.Rectangle; rotulo: Phaser.GameObjects.Text }[] = [];
  /** primeiro item visivel da aba atual — e o que faz a lista rolar */
  private topo = 0;
  /** quantos itens a aba atual tem, pra limitar a rolagem */
  private total = 0;
  private visiveis = 1;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    this.cena = ctx.cena;
    this.area = ctx.area;
    this.abaAtiva = 'blog';
    this.topo = 0;

    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    // --- abas ---
    let x = this.area.x;
    this.abas = ABAS.map((aba) => {
      const fundo = ctx.cena.add
        .rectangle(x + aba.largura / 2, this.area.y + ALTURA_ABA / 2, aba.largura, ALTURA_ABA, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const rotulo = ctx.cena.add
        .text(x + aba.largura / 2, this.area.y + ALTURA_ABA / 2, aba.rotulo, {
          fontFamily: UI.fonte,
          fontSize: UI.tamanho,
          color: PC.textoFraco,
        })
        .setOrigin(0.5, 0.5);
      fundo.on('pointerdown', () => this.trocarAba(aba.id));
      objetos.push(fundo, rotulo);
      x += aba.largura + 4;
      return { fundo, rotulo };
    });

    // --- moldura do conteudo ---
    this.corpo = {
      x: this.area.x,
      y: this.area.y + ALTURA_ABA,
      w: this.area.w,
      h: this.area.h - ALTURA_ABA - 14,
    };
    caixa(g, this.corpo, 0x0d1119, PC.borda);

    this.conteudo = ctx.cena.add.container(0, 0);
    objetos.push(this.conteudo);

    this.rodape = texto(ctx.cena, this.area.x, this.area.y + this.area.h - 11, '', {
      fontSize: UI.tamanho,
      color: PC.textoFraco,
    });
    objetos.push(this.rodape);

    this.redesenhar();
    return objetos;
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const k = evento.key;
    if (k === 'Tab' || k === 'a' || k === 'A' || k === 'ArrowLeft' || k === 'd' || k === 'D' || k === 'ArrowRight') {
      this.trocarAba(this.abaAtiva === 'blog' ? 'relacionamento' : 'blog');
      return true;
    }
    const passo: Record<string, number> = {
      ArrowUp: -1, w: -1, W: -1,
      ArrowDown: 1, s: 1, S: 1,
    };
    if (passo[k] !== undefined) {
      this.rolar(passo[k]);
      return true;
    }
    return false;
  }

  private trocarAba(aba: AbaNavegador): void {
    if (this.abaAtiva === aba) return;
    this.abaAtiva = aba;
    this.topo = 0;
    this.redesenhar();
  }

  private rolar(passo: number): void {
    const maximo = Math.max(0, this.total - this.visiveis);
    const novo = Math.min(maximo, Math.max(0, this.topo + passo));
    if (novo === this.topo) return;
    this.topo = novo;
    this.redesenhar();
  }

  /** Repinta as abas e reconstroi o conteudo da aba ativa. */
  private redesenhar(): void {
    this.abas.forEach((visual, i) => {
      const ativa = ABAS[i].id === this.abaAtiva;
      visual.fundo.setFillStyle(ativa ? PC.bordaViva : PC.painelClaro);
      visual.fundo.setStrokeStyle(1, ativa ? PC.bordaViva : PC.borda);
      visual.rotulo.setColor(ativa ? '#0e1420' : PC.textoFraco);
    });

    this.conteudo.removeAll(true);
    if (this.abaAtiva === 'blog') this.desenharBlog();
    else this.desenharRelacoes();
  }

  // ---------------------------------------------------------------- blog --

  private desenharBlog(): void {
    const posts = feedAte(estado.dia);
    this.total = posts.length;
    this.visiveis = Math.max(1, Math.floor((this.corpo.h - 12) / LINHA_POST));
    this.topo = Math.min(this.topo, Math.max(0, this.total - this.visiveis));

    if (posts.length === 0) {
      this.conteudo.add(
        texto(this.cena, this.corpo.x + 12, this.corpo.y + 12, 'O feed ainda esta vazio.', {
          fontSize: UI.tamanho,
          color: PC.textoFraco,
        }),
      );
      this.rodape.setText('[A/D] trocar de aba   [Esc] sair');
      return;
    }

    posts.slice(this.topo, this.topo + this.visiveis).forEach((post, i) => {
      const y = this.corpo.y + 10 + i * LINHA_POST;
      this.conteudo.add(
        texto(this.cena, this.corpo.x + 12, y, this.cabecalhoDoPost(post), {
          fontSize: UI.tamanho,
          color: PC.destaque,
        }),
      );
      this.conteudo.add(
        texto(this.cena, this.corpo.x + 12, y + 13, post.texto, {
          fontSize: UI.tamanho,
          color: PC.texto,
          wordWrap: { width: this.corpo.w - 26 },
          lineSpacing: 1,
        }),
      );
    });

    this.rodape.setText(
      `${this.topo + 1}-${Math.min(this.total, this.topo + this.visiveis)} de ${this.total}` +
        '   [W/S] rolar   [A/D] trocar de aba   [Esc] sair',
    );
  }

  private cabecalhoDoPost(post: PostDoBlog): string {
    const nome = buscarNpc(post.npcId)?.nome ?? post.npcId;
    const hora = `${String(Math.floor(post.minuto / 60)).padStart(2, '0')}:${String(post.minuto % 60).padStart(2, '0')}`;
    const quando =
      post.dia === estado.dia
        ? `hoje ${hora}`
        : post.dia === estado.dia - 1
          ? `ontem ${hora}`
          : `${nomeDoDia(post.dia)} ${hora}`;
    return `${nome}  ·  ${quando}`;
  }

  // ------------------------------------------------------- relacionamento --

  private desenharRelacoes(): void {
    const npcs = estado.relacoes.listaInteragidos();
    this.total = npcs.length;
    this.visiveis = Math.max(1, Math.floor((this.corpo.h - 12) / LINHA_RELACAO));
    this.topo = Math.min(this.topo, Math.max(0, this.total - this.visiveis));

    if (npcs.length === 0) {
      this.conteudo.add(
        texto(
          this.cena,
          this.corpo.x + 12,
          this.corpo.y + 12,
          'Voce ainda nao falou com ninguem.\nConverse com alguem na cidade pra a lista aparecer aqui.',
          { fontSize: UI.tamanho, color: PC.textoFraco, lineSpacing: 3 },
        ),
      );
      this.rodape.setText('[A/D] trocar de aba   [Esc] sair');
      return;
    }

    const g = this.cena.add.graphics();
    this.conteudo.add(g);

    npcs.slice(this.topo, this.topo + this.visiveis).forEach((npcId, i) => {
      const y = this.corpo.y + 8 + i * LINHA_RELACAO;
      const nome = buscarNpc(npcId)?.nome ?? npcId;
      const score = estado.relacoes.getScore(npcId);
      const rotulo = estado.relacoes.getRotulo(npcId);

      this.conteudo.add(
        texto(this.cena, this.corpo.x + 12, y, nome, { fontSize: UI.tamanhoTitulo, color: PC.texto }),
      );

      this.desenharCoracoes(g, this.corpo.x + 12, y + 19, score);

      const xTexto = this.corpo.x + 12 + CORACAO.quantidade * CORACAO.passo + 12;
      this.conteudo.add(
        texto(this.cena, xTexto, y + 14, `${rotulo}  (${score.toFixed(1).replace('.', ',')})`, {
          fontSize: UI.tamanho,
          color: score < 0 ? PC.alerta : PC.textoFraco,
        }),
      );

      const desconto = this.descontoDe(npcId);
      if (desconto > 0) {
        this.conteudo.add(
          this.cena.add
            .text(this.corpo.x + this.corpo.w - 12, y + 14, `desconto -${Math.round(desconto * 100)}%`, {
              fontFamily: UI.fonte,
              fontSize: UI.tamanho,
              color: PC.sucesso,
            })
            .setOrigin(1, 0),
        );
      }
    });

    this.rodape.setText(
      `${npcs.length} pessoa(s)   [W/S] rolar   [A/D] trocar de aba   [Esc] sair`,
    );
  }

  /**
   * O desconto que este NPC da HOJE, ou 0 se ele nao vende nada. Sai da lista
   * de pontos de loja, entao quando a farmacia e o bar ganharem venda propria a
   * linha deles aparece aqui sozinha, sem mexer neste arquivo.
   */
  private descontoDe(npcId: string): number {
    const vende = PONTOS_DE_LOJA.some((p) => p.npcDono === npcId);
    return vende ? percentualDescontoNpc(npcId) : 0;
  }

  /**
   * A barra de coracoes. Cada coracao vale 1 ponto e e desenhado em duas
   * metades, entao um score de 3,5 sai como tres coracoes cheios e um pela
   * metade — sem precisar de fonte nem de emoji.
   *
   * Score negativo troca a barra por coracoes PARTIDOS (as duas metades
   * afastadas, em laranja de alerta), um por ponto negativo: e uma leitura
   * diferente da barra vazia, que significa "ainda nao conheco voce".
   */
  private desenharCoracoes(g: Phaser.GameObjects.Graphics, x: number, y: number, score: number): void {
    if (score < 0) {
      const partidos = Math.min(CORACAO.quantidade, Math.ceil(Math.abs(score)));
      for (let i = 0; i < CORACAO.quantidade; i++) {
        const cx = x + i * CORACAO.passo + CORACAO.raio;
        if (i < partidos) {
          g.fillStyle(CORACAO.quebrado, 1);
          this.metadeDeCoracao(g, cx - 1, y, 'esquerda');
          this.metadeDeCoracao(g, cx + 1, y, 'direita');
        } else {
          g.fillStyle(CORACAO.vazio, 1);
          this.metadeDeCoracao(g, cx, y, 'esquerda');
          this.metadeDeCoracao(g, cx, y, 'direita');
        }
      }
      return;
    }

    for (let i = 0; i < CORACAO.quantidade; i++) {
      const cx = x + i * CORACAO.passo + CORACAO.raio;
      const preenchimento = Math.max(0, Math.min(1, score - i));
      // metade esquerda: cheia a partir de 0,5 de ponto neste coracao
      g.fillStyle(preenchimento >= 0.5 ? CORACAO.cheio : CORACAO.vazio, 1);
      this.metadeDeCoracao(g, cx, y, 'esquerda');
      g.fillStyle(preenchimento >= 1 ? CORACAO.cheio : CORACAO.vazio, 1);
      this.metadeDeCoracao(g, cx, y, 'direita');
    }
  }

  /**
   * Uma metade de coracao: o lobo (meio circulo) mais o triangulo da ponta.
   * Desenhar por metade e o que permite o meio-coracao sem mascara nenhuma —
   * as duas metades se encostam exatamente no eixo vertical do centro.
   */
  private metadeDeCoracao(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    lado: 'esquerda' | 'direita',
  ): void {
    const r = CORACAO.raio;
    const sinal = lado === 'esquerda' ? -1 : 1;
    g.fillCircle(cx + (sinal * r) / 2, cy - r / 4, r / 2);
    g.fillTriangle(cx, cy - r / 4, cx + sinal * r, cy - r / 4, cx, cy + r);
  }
}

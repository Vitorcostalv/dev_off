import type Phaser from 'phaser';
import { UI } from '../../../game/config.ts';
import { buscarAparelho } from '../../../game/aparelhos.ts';
import { formatarDinheiro } from '../../../game/dinheiro.ts';
import { estado } from '../../../game/estado.ts';
import { MAPAS } from '../../../game/mapas.ts';
import {
  CONSERTO_POR_DIFICULDADE,
  ITEM_ENCOMENDA,
  NOME_DE_DIFICULDADE,
  NOME_DE_TIPO,
  pagamentoDeCodigo,
  pagamentoDeConserto,
  perguntaDaVaga,
  quadroDoDia,
  sequenciaDoConserto,
} from '../../../game/trabalhos.ts';
import type { Vaga } from '../../../game/trabalhos.ts';
import { PC, caixa, encurtar, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { AppDoPc, ContextoApp } from '../../tipos.ts';
import { QuizCodigo } from './quizCodigo.ts';
import { SequenciaConserto } from './sequenciaConserto.ts';
import type { Vista } from '../../vista.ts';

/**
 * Trabalho — o quadro de vagas do computador.
 *
 * Tres tipos, cada um resolvido de um jeito:
 *   entrega  — poe uma encomenda no inventario e so paga quando o jogador
 *              chega na porta do destino, la no mundo (FarmScene.entregarNaPorta)
 *   codigo   — minigame de pergunta unica, resolvido aqui dentro
 *   conserto — minigame de sequencia, resolvido aqui dentro
 *
 * ---------------------------------------------------------------------------
 * DINHEIRO
 * ---------------------------------------------------------------------------
 * Este arquivo e o UNICO do app que credita, e credita so por
 * `estado.carteira.ganhar()`. `game/trabalhos.ts` calcula quanto vale e nao
 * encosta no saldo; as vistas de minigame so avisam o resultado.
 *
 * ---------------------------------------------------------------------------
 * QUANDO A VAGA SOME DO QUADRO
 * ---------------------------------------------------------------------------
 * Uma vaga e marcada como concluida quando PAGOU alguma coisa. Errar o quiz
 * paga zero e deixa a vaga no quadro, entao da pra tentar de novo (a pergunta e
 * a mesma — o custo do erro e o tempo, nao a vaga). Um conserto que acertou 3
 * de 7 passos pagou 3/7 e ESTA concluido: sem isso, daria pra repetir o mesmo
 * conserto ate raspar a recompensa inteira em pedacos.
 */

const LINHA = { altura: 27, gap: 4 };
const RODAPE = 16;

export class Trabalho implements AppDoPc {
  readonly id = 'trabalho';
  readonly titulo = 'Trabalho';
  readonly glifo = '▤';
  readonly cor = 0x4c8a5a;
  readonly resumo = 'Vagas e projetos';

  private cena!: Phaser.Scene;
  /** area util das vistas: tudo menos a linha de status, que e do app */
  private areaDaVista!: Retangulo;
  /** container das vistas; trocar de vista destroi os filhos dele */
  private raiz!: Phaser.GameObjects.Container;
  private status!: Phaser.GameObjects.Text;

  private minigame: Vista | null = null;
  private vagas: Vaga[] = [];
  private cursor = 0;

  private linhas: {
    fundo: Phaser.GameObjects.Rectangle;
    titulo: Phaser.GameObjects.Text;
    meta: Phaser.GameObjects.Text;
    valor: Phaser.GameObjects.Text;
  }[] = [];
  private detalhe!: Phaser.GameObjects.Text;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    this.cena = ctx.cena;
    this.areaDaVista = {
      x: ctx.area.x,
      y: ctx.area.y,
      w: ctx.area.w,
      h: ctx.area.h - RODAPE,
    };
    this.minigame = null;
    this.cursor = 0;

    this.raiz = ctx.cena.add.container(0, 0);
    this.status = texto(ctx.cena, ctx.area.x, ctx.area.y + ctx.area.h - 11, '', {
      fontSize: '9px',
      color: PC.textoFraco,
      wordWrap: { width: ctx.area.w },
    });

    this.abrirLista();
    return [this.raiz, this.status];
  }

  atualizar(): void {
    this.minigame?.atualizar?.();
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    if (this.minigame) {
      if (this.minigame.aoTeclar?.(evento)) return true;
      // Esc dentro do minigame volta pro quadro em vez de fechar o app
      if (evento.key === 'Escape') {
        this.abrirLista();
        return true;
      }
      return false;
    }

    const passo: Record<string, number> = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 };
    if (passo[evento.key] !== undefined) {
      this.selecionar(this.cursor + passo[evento.key]);
      return true;
    }
    if (evento.key === 'e' || evento.key === 'E' || evento.key === 'Enter') {
      this.acionarVaga();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------- quadro --

  private limparRaiz(): void {
    this.raiz.removeAll(true);
    this.minigame = null;
  }

  private abrirLista(): void {
    this.limparRaiz();
    this.vagas = quadroDoDia(estado.dia);
    this.cursor = Math.min(this.cursor, Math.max(0, this.vagas.length - 1));

    const cena = this.cena;
    const area = this.areaDaVista;
    const g = cena.add.graphics();
    this.raiz.add(g);

    const larguraLista = Math.floor(area.w * 0.6);
    this.raiz.add(
      texto(cena, area.x, area.y, 'Vagas de hoje', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
    );

    const topo = area.y + 18;
    this.linhas = this.vagas.map((vaga, i) => {
      const y = topo + i * (LINHA.altura + LINHA.gap);
      const fundo = cena.add
        .rectangle(area.x + larguraLista / 2, y + LINHA.altura / 2, larguraLista, LINHA.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const titulo = texto(cena, area.x + 7, y + 4, encurtar(vaga.titulo, 32), { fontSize: '10px' });
      const meta = texto(cena, area.x + 7, y + 16, '', { fontSize: '9px', color: PC.textoFraco });
      const valor = cena.add
        .text(area.x + larguraLista - 7, y + 8, formatarDinheiro(vaga.recompensa), {
          fontFamily: UI.fonte,
          fontSize: '10px',
          color: PC.destaque,
        })
        .setOrigin(1, 0);
      fundo.on('pointerdown', () => this.clicarLinha(i));
      this.raiz.add(fundo);
      this.raiz.add(titulo);
      this.raiz.add(meta);
      this.raiz.add(valor);
      return { fundo, titulo, meta, valor };
    });

    // --- coluna de detalhe ---
    const xDetalhe = area.x + larguraLista + 10;
    const larguraDetalhe = area.x + area.w - xDetalhe;
    caixa(g, { x: xDetalhe, y: area.y, w: larguraDetalhe, h: area.h }, 0x0d1119, PC.borda);
    this.detalhe = texto(cena, xDetalhe + 8, area.y + 8, '', {
      fontSize: '10px',
      color: PC.textoFraco,
      wordWrap: { width: larguraDetalhe - 16 },
      lineSpacing: 3,
    });
    this.raiz.add(this.detalhe);

    this.desenharLista();
    this.mostrarEntregaAtiva();
  }

  private clicarLinha(i: number): void {
    if (this.cursor !== i) {
      this.selecionar(i);
      return;
    }
    this.acionarVaga();
  }

  private selecionar(indice: number): void {
    if (this.vagas.length === 0) return;
    this.cursor = Math.min(this.vagas.length - 1, Math.max(0, indice));
    this.desenharLista();
  }

  private desenharLista(): void {
    this.linhas.forEach((linha, i) => {
      const vaga = this.vagas[i];
      const ativo = i === this.cursor;
      const feita = estado.trabalhos.concluida(estado.dia, vaga.id);
      const emAndamento = estado.trabalhos.entrega?.idVaga === vaga.id;

      linha.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
      linha.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      linha.titulo.setColor(feita ? '#4d5769' : ativo ? PC.destaque : PC.texto);
      linha.valor.setColor(feita ? '#4d5769' : PC.destaque);

      const estagio = feita ? ' · concluida' : emAndamento ? ' · em andamento' : '';
      linha.meta.setText(
        `${NOME_DE_TIPO[vaga.tipo]} · ${vaga.cliente} · ${NOME_DE_DIFICULDADE[vaga.dificuldade]}${estagio}`,
      );
      linha.meta.setColor(emAndamento ? PC.destaque : PC.textoFraco);
    });
    this.desenharDetalhe();
  }

  private desenharDetalhe(): void {
    const vaga = this.vagas[this.cursor];
    if (!vaga) {
      this.detalhe.setText('Nenhuma vaga hoje.');
      return;
    }
    const feita = estado.trabalhos.concluida(estado.dia, vaga.id);
    const linhas = [
      vaga.titulo,
      '',
      vaga.descricao,
      '',
      `Cliente: ${vaga.cliente}`,
      `Tipo: ${NOME_DE_TIPO[vaga.tipo]}`,
      `Dificuldade: ${NOME_DE_DIFICULDADE[vaga.dificuldade]}`,
      `Paga: ${formatarDinheiro(vaga.recompensa)}`,
    ];

    if (vaga.tipo === 'entrega') {
      linhas.push('', `Destino: ${vaga.moradorDestino} (${this.nomeDoMapa(vaga.destino)})`);
    }
    if (vaga.tipo === 'conserto') {
      const { passos } = CONSERTO_POR_DIFICULDADE[vaga.dificuldade];
      linhas.push('', `Sequencia de ${passos} pecas.`, 'Paga proporcional ao que acertar.');
    }
    if (vaga.tipo === 'codigo') {
      linhas.push('', 'Uma pergunta. Acertou, paga tudo;', 'errou, nao paga nada.');
    }

    linhas.push('', feita ? 'Ja concluida hoje.' : `[E] ${this.verboDaVaga(vaga)}`);
    this.detalhe.setColor(PC.textoFraco);
    this.detalhe.setText(linhas.join('\n'));
  }

  private verboDaVaga(vaga: Vaga): string {
    if (vaga.tipo === 'entrega') {
      return estado.trabalhos.entrega?.idVaga === vaga.id ? 'ja aceita' : 'aceitar';
    }
    return 'comecar';
  }

  private nomeDoMapa(chave: string | undefined): string {
    return chave && MAPAS[chave] ? chave.replace('_', ' ') : 'destino desconhecido';
  }

  // ------------------------------------------------------------- acoes --

  private acionarVaga(): void {
    const vaga = this.vagas[this.cursor];
    if (!vaga) return;
    if (estado.trabalhos.concluida(estado.dia, vaga.id)) {
      this.avisar('Essa vaga ja foi concluida hoje.', PC.alerta);
      return;
    }
    if (vaga.tipo === 'entrega') this.aceitarEntrega(vaga);
    else if (vaga.tipo === 'codigo') this.abrirQuiz(vaga);
    else this.abrirConserto(vaga);
  }

  /**
   * Aceita uma entrega: poe a encomenda no inventario e guarda o destino.
   *
   * Confere ANTES de mexer em qualquer coisa — inventario cheio recusa a vaga
   * inteira, sem encomenda solta e sem entrega registrada. E a mesma falha
   * segura da compra: nada pela metade.
   */
  private aceitarEntrega(vaga: Vaga): void {
    if (estado.trabalhos.entrega) {
      this.avisar(
        `Voce ja tem uma entrega em andamento: ${estado.trabalhos.entrega.titulo}.`,
        PC.alerta,
      );
      return;
    }
    if (!vaga.destino || !vaga.moradorDestino) {
      this.avisar('Essa vaga esta sem destino. Avise o suporte.', PC.alerta);
      return;
    }
    if (!estado.inventario.cabe(ITEM_ENCOMENDA, 1)) {
      this.avisar('Inventario cheio: sem espaco pra encomenda. Vaga nao aceita.', PC.alerta);
      return;
    }

    const sobra = estado.inventario.adicionar(ITEM_ENCOMENDA, 1);
    if (sobra > 0) {
      // inalcancavel: `cabe` e `adicionar` seguem a mesma regra de empilhamento
      console.error('[trabalho] BUG: cabe() aprovou mas a encomenda nao entrou');
      this.avisar('Nao consegui separar a encomenda. Nada foi aceito.', PC.alerta);
      return;
    }

    estado.trabalhos.entrega = {
      idVaga: vaga.id,
      titulo: vaga.titulo,
      destino: vaga.destino,
      morador: vaga.moradorDestino,
      recompensa: vaga.recompensa,
      dia: estado.dia,
    };
    this.desenharLista();
    this.avisar(
      `Encomenda no inventario. Leve ate ${vaga.moradorDestino}` +
        ` (${this.nomeDoMapa(vaga.destino)}) e use a porta.`,
      PC.sucesso,
    );
  }

  private abrirQuiz(vaga: Vaga): void {
    this.limparRaiz();
    const pergunta = perguntaDaVaga(vaga, estado.dia);
    this.minigame = new QuizCodigo(pergunta, (acertou) => this.pagarCodigo(vaga, acertou));
    this.minigame.montar(this.cena, this.raiz, this.areaDaVista);
    this.avisar(`${vaga.titulo} — ${formatarDinheiro(vaga.recompensa)} se acertar. [Esc] desiste.`);
  }

  private abrirConserto(vaga: Vaga): void {
    const aparelho = buscarAparelho(vaga.aparelho);
    if (!aparelho) {
      this.avisar('Aparelho nao encontrado no catalogo.', PC.alerta);
      return;
    }
    this.limparRaiz();
    const sequencia = sequenciaDoConserto(vaga, estado.dia);
    const { passos, msPorPasso } = CONSERTO_POR_DIFICULDADE[vaga.dificuldade];
    this.minigame = new SequenciaConserto(
      aparelho,
      sequencia,
      passos * msPorPasso,
      (acertos, total) => this.pagarConserto(vaga, acertos, total),
    );
    this.minigame.montar(this.cena, this.raiz, this.areaDaVista);
    this.avisar(`${vaga.titulo} — ${formatarDinheiro(vaga.recompensa)} pela sequencia inteira.`);
  }

  // ---------------------------------------------------------- pagamento --

  private pagarCodigo(vaga: Vaga, acertou: boolean): void {
    const valor = pagamentoDeCodigo(vaga, acertou);
    if (valor <= 0) {
      this.avisar('Resposta errada. Nao paga nada — a vaga continua no quadro. [Esc] volta.', PC.alerta);
      return;
    }
    this.creditar(vaga, valor, 'Acertou');
  }

  private pagarConserto(vaga: Vaga, acertos: number, total: number): void {
    const valor = pagamentoDeConserto(vaga, acertos, total);
    if (valor <= 0) {
      this.avisar('Nenhum passo certo. Nao paga nada — a vaga continua no quadro. [Esc] volta.', PC.alerta);
      return;
    }
    this.creditar(vaga, valor, `${acertos}/${total} passos`);
  }

  /** A unica porta de credito do app. */
  private creditar(vaga: Vaga, centavos: number, motivo: string): void {
    const r = estado.carteira.ganhar(centavos);
    if (!r.ok) {
      this.avisar('Nao foi possivel receber agora. A vaga continua no quadro.', PC.alerta);
      return;
    }
    estado.trabalhos.marcarConcluida(estado.dia, vaga.id);
    this.avisar(`${motivo}: recebeu ${formatarDinheiro(centavos)}. [Esc] volta ao quadro.`, PC.sucesso);
  }

  // ------------------------------------------------------------ status --

  private avisar(mensagem: string, cor: string = PC.textoFraco): void {
    this.status.setColor(cor);
    this.status.setText(mensagem);
  }

  private mostrarEntregaAtiva(): void {
    const e = estado.trabalhos.entrega;
    if (e) {
      const tem = estado.inventario.contar(ITEM_ENCOMENDA) > 0;
      this.avisar(
        tem
          ? `Entrega em andamento: leve a encomenda ate ${e.morador} (${this.nomeDoMapa(e.destino)}).`
          : `Entrega em andamento, mas a encomenda nao esta com voce. Sem encomenda nao ha pagamento.`,
        tem ? PC.destaque : PC.alerta,
      );
      return;
    }
    this.avisar('[W/S] escolher   [E] aceitar/comecar   [Esc] sair');
  }
}

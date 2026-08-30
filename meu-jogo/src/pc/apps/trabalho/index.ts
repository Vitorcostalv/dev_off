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
  pagamentoDeConserto,
  pagamentoDeVagaDeCodigo,
  pecasDoConserto,
  perguntasDaVaga,
  quadroDoDia,
  tempoDoConserto,
} from '../../../game/trabalhos.ts';
import type { Vaga } from '../../../game/trabalhos.ts';
import { PC, caixa, encurtar, texto } from '../../widgets.ts';
import type { Retangulo } from '../../widgets.ts';
import type { AppDoPc, ContextoApp } from '../../tipos.ts';
import { QuizCodigo } from './quizCodigo.ts';
import { QuebraCabecaConserto } from './quebraCabecaConserto.ts';
import type { Vista } from '../../vista.ts';

/**
 * Trabalho — o quadro de vagas do computador.
 *
 * Tres tipos, cada um resolvido de um jeito:
 *   entrega  — poe uma encomenda no inventario e so paga quando o jogador
 *              chega na porta do destino, la no mundo (FarmScene.entregarNaPorta)
 *   codigo   — minigame de 1 a 5 perguntas, resolvido aqui dentro
 *   conserto — quebra-cabeca de encaixe por arraste, resolvido aqui dentro
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
 * Uma vaga e marcada como concluida quando PAGOU alguma coisa. Zerar o quiz
 * paga zero e deixa a vaga no quadro, entao da pra tentar de novo (as perguntas
 * sao as mesmas — o custo do erro e o tempo, nao a vaga). Um conserto que
 * encaixou 3 de 4 pecas pagou 3/4 e ESTA concluido: sem isso, daria pra repetir
 * o mesmo conserto ate raspar a recompensa inteira em pedacos. Vale igual pra
 * vaga de codigo multi-etapa que acertou parte das perguntas.
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

  /**
   * Fecha a vista atual antes de destruir os objetos dela. `removeAll` so
   * alcanca o que esta DENTRO do container; listener de input registrado na
   * cena (o arraste do conserto) tem de sair pelo `aoFechar` da vista.
   */
  private limparRaiz(): void {
    this.minigame?.aoFechar?.();
    this.minigame = null;
    this.raiz.removeAll(true);
  }

  /** A moldura chama ao sair do app; sem isto o arraste sobreviveria ao Esc. */
  aoFechar(): void {
    this.minigame?.aoFechar?.();
    this.minigame = null;
  }

  private abrirLista(): void {
    this.limparRaiz();
    this.vagas = [...estado.missoesNpc.vagasDeConserto(), ...quadroDoDia(estado.dia)];
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
      const feita = this.vagaConcluida(vaga);
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
    const feita = this.vagaConcluida(vaga);
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
      const { pecas, segundos } = CONSERTO_POR_DIFICULDADE[vaga.dificuldade];
      linhas.push(
        '',
        `Montar ${pecas} pecas em ${segundos}s.`,
        'Paga proporcional ao que encaixar.',
      );
    }
    if (vaga.tipo === 'codigo') {
      const etapas = vaga.etapas ?? 1;
      linhas.push(
        '',
        etapas === 1
          ? 'Uma pergunta. Acertou, paga tudo; errou, nao paga nada.'
          : `${etapas} perguntas. Paga proporcional aos acertos.`,
      );
    }

    linhas.push('', feita ? 'Ja concluida hoje.' : `[E] ${this.verboDaVaga(vaga)}`);
    this.detalhe.setColor(PC.textoFraco);
    this.detalhe.setText(linhas.join('\n'));
  }

  private verboDaVaga(vaga: Vaga): string {
    if (vaga.tipo !== 'entrega') return 'comecar';
    const entrega = estado.trabalhos.entrega;
    const semEncomenda = entrega !== null && estado.inventario.contar(ITEM_ENCOMENDA) === 0;
    if (entrega?.idVaga === vaga.id) return semEncomenda ? 'pedir segunda via' : 'ja aceita';
    return semEncomenda ? 'largar a entrega atual' : 'aceitar';
  }

  private nomeDoMapa(chave: string | undefined): string {
    return chave && MAPAS[chave] ? chave.replace('_', ' ') : 'destino desconhecido';
  }

  // ------------------------------------------------------------- acoes --

  private acionarVaga(): void {
    const vaga = this.vagas[this.cursor];
    if (!vaga) return;
    if (this.vagaConcluida(vaga)) {
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
    const emAndamento = estado.trabalhos.entrega;
    if (emAndamento) {
      // Beco sem saida que ja existiu: entrega aceita SEM a encomenda em maos.
      // A porta do destino nao completa nada (ela exige o item) e o app recusava
      // qualquer vaga nova, entao o sistema de entrega travava pra sempre. Agora
      // a propria vaga em andamento reemite a encomenda; se nem isso couber, da
      // pra largar a vaga e aceitar outra depois.
      if (estado.inventario.contar(ITEM_ENCOMENDA) === 0) {
        this.reemitirEncomenda(emAndamento.idVaga === vaga.id);
        return;
      }
      this.avisar(`Voce ja tem uma entrega em andamento: ${emAndamento.titulo}.`, PC.alerta);
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
      npcId: vaga.npcDestino,
    };
    this.desenharLista();
    this.avisar(
      `Encomenda no inventario. Leve ate ${vaga.moradorDestino}` +
        ` (${this.nomeDoMapa(vaga.destino)}) e use a porta.`,
      PC.sucesso,
    );
  }

  /**
   * Repoe a encomenda de uma entrega ja aceita que ficou sem o item, ou larga a
   * vaga quando nem repor da. Nunca paga nada: o pagamento continua acontecendo
   * so na porta do destino.
   */
  private reemitirEncomenda(mesmaVaga: boolean): void {
    const entrega = estado.trabalhos.entrega;
    if (!entrega) return;

    if (!estado.inventario.cabe(ITEM_ENCOMENDA, 1)) {
      this.avisar(
        'Sem espaco pra segunda via da encomenda. Abra espaco no inventario' +
          ' ou [E] de novo nesta vaga pra largar a entrega.',
        PC.alerta,
      );
      return;
    }

    if (!mesmaVaga) {
      // pediu outra vaga com uma entrega orfa em andamento: larga a antiga
      const largada = estado.trabalhos.cancelarEntrega();
      this.desenharLista();
      this.avisar(
        `Larguei "${largada?.titulo}" — a encomenda nao estava com voce.` +
          ' A vaga voltou pro quadro; aceite de novo quando quiser.',
        PC.alerta,
      );
      return;
    }

    if (estado.inventario.adicionar(ITEM_ENCOMENDA, 1) > 0) {
      console.error('[trabalho] BUG: cabe() aprovou mas a segunda via nao entrou');
      this.avisar('Nao consegui separar a segunda via. Nada mudou.', PC.alerta);
      return;
    }
    this.desenharLista();
    this.avisar(
      `Segunda via da encomenda separada. Leve ate ${entrega.morador}` +
        ` (${this.nomeDoMapa(entrega.destino)}) e use a porta.`,
      PC.sucesso,
    );
  }

  private abrirQuiz(vaga: Vaga): void {
    this.limparRaiz();
    const perguntas = perguntasDaVaga(vaga, estado.dia);
    if (perguntas.length === 0) {
      this.avisar('Essa vaga esta sem pergunta. Avise o suporte.', PC.alerta);
      this.abrirLista();
      return;
    }
    this.minigame = new QuizCodigo(perguntas, (acertos, total) =>
      this.pagarCodigo(vaga, acertos, total),
    );
    this.minigame.montar(this.cena, this.raiz, this.areaDaVista);
    this.avisar(
      perguntas.length === 1
        ? `${vaga.titulo} — ${formatarDinheiro(vaga.recompensa)} se acertar. [Esc] desiste.`
        : `${vaga.titulo} — ${perguntas.length} etapas, paga proporcional aos acertos. [Esc] desiste.`,
    );
  }

  private abrirConserto(vaga: Vaga): void {
    const aparelho = buscarAparelho(vaga.aparelho);
    if (!aparelho) {
      this.avisar('Aparelho nao encontrado no catalogo.', PC.alerta);
      return;
    }
    const pecas = pecasDoConserto(vaga, estado.dia);
    if (pecas.length === 0) {
      this.avisar('Esse aparelho esta sem pecas no catalogo. Avise o suporte.', PC.alerta);
      return;
    }
    this.limparRaiz();
    this.minigame = new QuebraCabecaConserto(
      aparelho,
      pecas,
      tempoDoConserto(vaga),
      // na dificuldade alta o slot nao diz que peca aceita: reconhecer o
      // componente pela arte e parte do que a vaga esta pagando
      vaga.dificuldade !== 'dificil',
      (acertos, total) => this.pagarConserto(vaga, acertos, total),
    );
    this.minigame.montar(this.cena, this.raiz, this.areaDaVista);
    this.avisar(`${vaga.titulo} — ${formatarDinheiro(vaga.recompensa)} pelo aparelho inteiro.`);
  }

  // ---------------------------------------------------------- pagamento --

  private pagarCodigo(vaga: Vaga, acertos: number, total: number): void {
    const valor = pagamentoDeVagaDeCodigo(vaga, acertos, total);
    if (valor <= 0) {
      this.avisar(
        total > 1
          ? 'Nenhuma etapa certa. Nao paga nada — a vaga continua no quadro. [Esc] volta.'
          : 'Resposta errada. Nao paga nada — a vaga continua no quadro. [Esc] volta.',
        PC.alerta,
      );
      return;
    }
    this.creditar(vaga, valor, total > 1 ? `${acertos}/${total} etapas` : 'Acertou');
  }

  private pagarConserto(vaga: Vaga, acertos: number, total: number): void {
    if (vaga.missaoNpcId && acertos < total) {
      this.avisar(`${acertos}/${total} pecas: missao pessoal exige o conserto completo. Pode tentar novamente.`, PC.alerta);
      return;
    }
    const valor = pagamentoDeConserto(vaga, acertos, total);
    if (valor <= 0) {
      this.avisar('Nenhuma peca encaixada. Nao paga nada — a vaga continua no quadro. [Esc] volta.', PC.alerta);
      return;
    }
    this.creditar(vaga, valor, `${acertos}/${total} pecas`);
  }

  /** A unica porta de credito do app. */
  private creditar(vaga: Vaga, centavos: number, motivo: string): void {
    if (vaga.missaoNpcId) {
      const missao = estado.missoesNpc.concluirComRecompensas(vaga.missaoNpcId, estado);
      if (!missao) {
        this.avisar('Esta missao nao esta mais ativa; nenhum pagamento duplicado foi feito.', PC.alerta);
        return;
      }
    } else {
      const r = estado.carteira.ganhar(centavos);
      if (!r.ok) {
        this.avisar('Nao foi possivel receber agora. A vaga continua no quadro.', PC.alerta);
        return;
      }
      estado.trabalhos.marcarConcluida(estado.dia, vaga.id);
    }
    if (vaga.tipo === 'conserto') {
      estado.worldEvents.definir('protagonistaConsertouAlgo', true);
    }
    this.avisar(`${motivo}: recebeu ${formatarDinheiro(centavos)}. [Esc] volta ao quadro.`, PC.sucesso);
  }

  private vagaConcluida(vaga: Vaga): boolean {
    return vaga.missaoNpcId
      ? estado.missoesNpc.estado(vaga.missaoNpcId) === 'concluida'
      : estado.trabalhos.concluida(estado.dia, vaga.id);
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
          : `Entrega em andamento sem a encomenda. [E] nesta vaga pede a segunda via.`,
        tem ? PC.destaque : PC.alerta,
      );
      return;
    }
    this.avisar('[W/S] escolher   [E] aceitar/comecar   [Esc] sair');
  }
}

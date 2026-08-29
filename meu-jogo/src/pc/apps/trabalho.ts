import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, caixa, encurtar, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Trabalho — mural de vagas/projetos freelance.
 *
 * ===========================================================================
 * SHELL VISUAL. Nao ha nenhuma logica de trabalho ainda.
 * ===========================================================================
 * As vagas abaixo sao dados de exemplo declarados neste arquivo. Clicar numa
 * linha so a seleciona; nao aceita, nao paga, nao ocupa tempo.
 *
 * ONDE A LOGICA REAL VAI ENTRAR, quando este app for pedido:
 *
 *  1. `VAGAS_DE_EXEMPLO` sai daqui e vira `src/game/trabalhos.ts`, com o mesmo
 *     formato de catalogo que `game/itens.ts` e `game/npcs.ts` ja usam
 *     (definicao estatica + funcao de busca por id).
 *  2. O estado de "vaga aceita / em andamento / entregue" mora em
 *     `game/estado.ts` e entra no save (`game/save.ts`), como o inventario.
 *  3. O pagamento entra por `estado.carteira.ganhar(centavos)` — NUNCA
 *     escrevendo saldo direto. Ver a porta unica em game/dinheiro.ts.
 *  4. O custo em tempo usa `estado.relogio.avancar` / o mesmo caminho que
 *     `dormir()` da FarmScene usa pra pular horas.
 *  5. `aceitar()` abaixo e o unico ponto que precisa deixar de ser stub.
 */

interface VagaExemplo {
  titulo: string;
  cliente: string;
  prazo: string;
  pagamento: string;
  dificuldade: string;
}

const VAGAS_DE_EXEMPLO: readonly VagaExemplo[] = [
  { titulo: 'Landing page pra padaria', cliente: 'Padaria do Ze', prazo: '2 dias', pagamento: 'R$ 180,00', dificuldade: 'Facil' },
  { titulo: 'Consertar impressora de rede', cliente: 'Farmacia Central', prazo: '1 dia', pagamento: 'R$ 90,00', dificuldade: 'Facil' },
  { titulo: 'Sistema de caixa do mercado', cliente: 'Mercado', prazo: '5 dias', pagamento: 'R$ 950,00', dificuldade: 'Media' },
  { titulo: 'App de treino da academia', cliente: 'Academia', prazo: '7 dias', pagamento: 'R$ 1.400,00', dificuldade: 'Media' },
  { titulo: 'Migrar servidor do bar', cliente: 'Bar', prazo: '3 dias', pagamento: 'R$ 620,00', dificuldade: 'Dificil' },
  { titulo: 'Automacao de estoque', cliente: 'Mercado', prazo: '10 dias', pagamento: 'R$ 2.100,00', dificuldade: 'Dificil' },
];

const LINHA = { altura: 26, gap: 4 };

export class Trabalho implements AppDoPc {
  readonly id = 'trabalho';
  readonly titulo = 'Trabalho';
  readonly glifo = '▤';
  readonly cor = 0x4c8a5a;
  readonly resumo = 'Vagas e projetos';

  private cursor = 0;
  private linhas: {
    fundo: Phaser.GameObjects.Rectangle;
    titulo: Phaser.GameObjects.Text;
    meta: Phaser.GameObjects.Text;
    pagamento: Phaser.GameObjects.Text;
  }[] = [];
  private detalhe!: Phaser.GameObjects.Text;

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    const larguraLista = Math.floor(area.w * 0.62);
    objetos.push(
      texto(ctx.cena, area.x, area.y, 'Vagas abertas na cidade', {
        fontSize: UI.tamanhoTitulo,
        color: PC.destaque,
      }),
    );

    const topo = area.y + 18;
    this.linhas = VAGAS_DE_EXEMPLO.map((vaga, i) => {
      const y = topo + i * (LINHA.altura + LINHA.gap);
      const fundo = ctx.cena.add
        .rectangle(area.x + larguraLista / 2, y + LINHA.altura / 2, larguraLista, LINHA.altura, PC.painelClaro)
        .setStrokeStyle(1, PC.borda)
        .setInteractive({ useHandCursor: true });
      const titulo = texto(ctx.cena, area.x + 7, y + 4, encurtar(vaga.titulo, 34), {
        fontSize: '10px',
      });
      const meta = texto(ctx.cena, area.x + 7, y + 15, `${vaga.cliente} · ${vaga.prazo} · ${vaga.dificuldade}`, {
        fontSize: '9px',
        color: PC.textoFraco,
      });
      const pagamento = ctx.cena.add
        .text(area.x + larguraLista - 7, y + 8, vaga.pagamento, {
          fontFamily: UI.fonte,
          fontSize: '10px',
          color: PC.destaque,
        })
        .setOrigin(1, 0);
      fundo.on('pointerdown', () => this.selecionar(i));
      objetos.push(fundo, titulo, meta, pagamento);
      return { fundo, titulo, meta, pagamento };
    });

    // --- coluna de detalhe ---
    const xDetalhe = area.x + larguraLista + 10;
    const larguraDetalhe = area.x + area.w - xDetalhe;
    caixa(g, { x: xDetalhe, y: area.y, w: larguraDetalhe, h: area.h - 14 }, 0x0d1119, PC.borda);
    this.detalhe = texto(ctx.cena, xDetalhe + 8, area.y + 8, '', {
      fontSize: '10px',
      color: PC.textoFraco,
      wordWrap: { width: larguraDetalhe - 16 },
      lineSpacing: 3,
    });
    objetos.push(this.detalhe);

    objetos.push(
      texto(
        ctx.cena,
        area.x,
        area.y + area.h - 11,
        'Nenhuma vaga pode ser aceita ainda — este app e so a fachada.',
        { fontSize: '9px', color: PC.alerta },
      ),
    );

    this.desenhar();
    return objetos;
  }

  aoTeclar(evento: KeyboardEvent): boolean {
    const passo: Record<string, number> = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 };
    if (passo[evento.key] !== undefined) {
      this.selecionar(this.cursor + passo[evento.key]);
      return true;
    }
    if (evento.key === 'e' || evento.key === 'E' || evento.key === 'Enter') {
      this.aceitar();
      return true;
    }
    return false;
  }

  private selecionar(indice: number): void {
    this.cursor = Math.min(VAGAS_DE_EXEMPLO.length - 1, Math.max(0, indice));
    this.desenhar();
  }

  /** Stub. E aqui que a aceitacao de vaga vai entrar — ver o topo do arquivo. */
  private aceitar(): void {
    this.detalhe.setColor(PC.alerta);
    this.detalhe.setText(
      'Aceitar vaga ainda nao faz nada.\n\n' +
        'Quando o app de Trabalho for implementado, este e o botao que\n' +
        'registra a vaga no estado, consome tempo e paga por\n' +
        'estado.carteira.ganhar().',
    );
  }

  private desenhar(): void {
    this.linhas.forEach((linha, i) => {
      const ativo = i === this.cursor;
      linha.fundo.setFillStyle(ativo ? 0x2f3c52 : PC.painelClaro);
      linha.fundo.setStrokeStyle(1, ativo ? PC.bordaViva : PC.borda);
      linha.titulo.setColor(ativo ? PC.destaque : PC.texto);
    });
    const vaga = VAGAS_DE_EXEMPLO[this.cursor];
    this.detalhe.setColor(PC.textoFraco);
    this.detalhe.setText(
      `${vaga.titulo}\n\n` +
        `Cliente: ${vaga.cliente}\n` +
        `Prazo: ${vaga.prazo}\n` +
        `Dificuldade: ${vaga.dificuldade}\n` +
        `Pagamento: ${vaga.pagamento}\n\n` +
        `[E] aceitar (ainda sem efeito)`,
    );
  }
}

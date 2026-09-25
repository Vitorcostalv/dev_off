import { estado } from '../game/estado';
import { LIVROS, NOME_DO_ASSUNTO, assuntosDisponiveis, jaLeu, livrosDoAssunto, marcarLido, quantosLidos } from '../game/biblioteca';
import {
  ARQUIVISTAS, NOME_DO_TEMA, entregarAoArquivo, museuAberto, naMochila, progressoDoArquivo, secoesDoMuseu,
} from '../game/memoriaDaCidade';
import { edicaoDaSemana, jaLeuEdicao, marcarEdicaoLida } from '../game/jornal';
import type { Interagivel } from '../game/tipos';
import type { FarmScene } from './FarmScene';
import type { UIScene } from './UIScene';

const PONTOS = [
  ['acervo', 'Consultar o acervo', 320, 300],
  ['jornal', 'Ler o jornal da semana', 200, 300],
  ['arquivo', 'Arquivo histórico', 440, 300],
  ['memoria', 'Sala de memória', 560, 200],
] as const;

/**
 * BIBLIOTECA — acervo legível, jornal da semana, arquivo histórico e a sala de
 * memória. Os quatro pontos ficam no interior que já existia; a sala de memória
 * só aparece depois de o arquivo encher, e quem cataloga são Clara e Ilda.
 */
export class Biblioteca {
  private cena: FarmScene;
  private ui: UIScene;
  constructor(cena: FarmScene, ui: UIScene) { this.cena = cena; this.ui = ui; }

  montar(): Interagivel[] {
    if (estado.mapa !== 'biblioteca') return [];
    return PONTOS
      .filter(([id]) => id !== 'memoria' || museuAberto(estado))
      .map(([id, rotulo, x, y]) => ({ id: `biblioteca:${id}`, tipo: 'domestico' as const, rotulo, x, y, props: { acao: `biblioteca:${id}` } }));
  }

  private contar(texto: string): void {
    this.ui.iniciarDialogo([{ nome: 'Você', texto }], () => this.cena.salvarJogo());
  }

  interagir(acao: string): boolean {
    if (!acao.startsWith('biblioteca:')) return false;
    const id = acao.slice('biblioteca:'.length);
    if (id === 'acervo') this.acervo();
    if (id === 'jornal') this.jornal();
    if (id === 'arquivo') this.arquivo();
    if (id === 'memoria') this.salaDeMemoria();
    return true;
  }

  /** Assunto, depois título, depois as páginas — sem sair do menu de leitura. */
  private acervo(): void {
    const assuntos = assuntosDisponiveis(estado);
    this.ui.abrirMenu(`Acervo — ${quantosLidos(estado)} de ${LIVROS.length} lidos`, assuntos.map(assunto => ({
      rotulo: `${NOME_DO_ASSUNTO[assunto]} (${livrosDoAssunto(estado, assunto).length})`,
      aoEscolher: () => this.ui.abrirMenu(NOME_DO_ASSUNTO[assunto], livrosDoAssunto(estado, assunto).map(livro => ({
        rotulo: `${jaLeu(estado, livro.id) ? '• ' : ''}${livro.titulo}`,
        aoEscolher: () => this.ui.iniciarDialogo(
          livro.paginas.map(texto => ({ nome: `${livro.titulo} — ${livro.autor}`, texto })),
          () => { marcarLido(estado, livro.id); this.cena.salvarJogo(); this.acervo(); },
        ),
      })), () => this.acervo()),
    })));
  }

  private jornal(): void {
    const edicao = edicaoDaSemana(estado);
    const novo = !jaLeuEdicao(estado, edicao.numero);
    this.ui.iniciarDialogo([
      { nome: `Jornal da cidade — nº ${edicao.numero}`, texto: edicao.manchete },
      ...edicao.secoes.map(s => ({ nome: `${s.titulo} — nº ${edicao.numero}`, texto: s.texto })),
      ...(novo ? [{ nome: 'Você', texto: 'Dobrei o jornal e deixei na mesa para a próxima pessoa.' }] : []),
    ], () => { marcarEdicaoLida(estado, edicao.numero); this.cena.salvarJogo(); });
  }

  /** Entregar exige Clara ou Ilda presentes: o arquivo é trabalho delas. */
  private arquivo(): void {
    const progresso = progressoDoArquivo(estado);
    const pendentes = naMochila(estado);
    const presentes = ARQUIVISTAS.filter(id => {
      const npc = estado.rotinasNpc.porId(id);
      return npc?.dentro === 'biblioteca' || (npc?.mapaAtual === 'biblioteca' && npc.visivel);
    });
    if (!pendentes.length) { this.contar(`${progresso.texto} Não estou com documento nenhum para entregar hoje.`); return; }
    if (!presentes.length) { this.contar(`${progresso.texto} Clara e Ilda não estão. Volto quando uma das duas estiver aqui.`); return; }
    const arquivista = presentes[0]!;
    const nome = arquivista === 'ilda' ? 'Professora Ilda' : 'Clara';
    this.ui.abrirMenu(`Entregar a ${nome}`, pendentes.map(doc => ({
      rotulo: `${doc.nome} — ${NOME_DO_TEMA[doc.tema]}`,
      aoEscolher: () => {
        const resultado = entregarAoArquivo(estado, doc.id, arquivista);
        if (!resultado) return;
        this.cena.salvarJogo();
        this.ui.iniciarDialogo([
          { nome: 'Você', texto: doc.texto },
          { nome, npcId: arquivista, texto: resultado.fala },
          ...(resultado.abriuMuseu
            ? [{ nome, npcId: arquivista, texto: 'Com isto dá para abrir a sala dos fundos. Não é museu, é uma sala. Pode chamar do que quiser.' }]
            : [{ nome, npcId: arquivista, texto: `${resultado.total} documentos catalogados. Ainda falta, e não tem prazo.` }]),
        ], () => { this.cena.reconstruirPontos(); this.cena.salvarJogo(); });
      },
    })));
  }

  private salaDeMemoria(): void {
    const secoes = secoesDoMuseu(estado);
    if (!secoes.length) { this.contar('A sala está pronta e ainda vazia.'); return; }
    this.ui.abrirMenu('Sala de memória', secoes.map(secao => ({
      rotulo: `${secao.titulo} (${secao.pecas.length})`,
      aoEscolher: () => this.ui.iniciarDialogo([
        { nome: secao.titulo, texto: secao.texto },
        { nome: secao.titulo, texto: secao.pecas.map(p => `· ${p}`).join('\n') },
      ], () => this.salaDeMemoria()),
    })));
  }
}

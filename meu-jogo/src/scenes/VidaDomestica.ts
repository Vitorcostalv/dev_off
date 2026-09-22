import Phaser from 'phaser';
import { estado } from '../game/estado';
import { escreverDiario } from '../game/diarioPessoal';
import { lembrancasDaCasa, memoriasDisponiveis, programaRadio, textoEspelho } from '../game/memoriasPessoais';
import type { Interagivel } from '../game/tipos';
import type { FarmScene } from './FarmScene';
import type { UIScene } from './UIScene';
import { fotografiaEmMoldura, desenharObjetoLembranca } from './FotografiaMemoria';
import { alimentar, companhia, lugarDoDescanso } from '../game/companhia';
import { comentarioDaRoupa, CONJUNTOS, conjuntoAtual, conjuntosDisponiveis, crescimento, cuidar, pecaAtual, pecasDisponiveis, textoDoCrescimento, usarPeca, vestir } from '../game/guardaRoupa';
import { dataDoDia } from '../game/calendario';

const PONTOS = [
  ['cafe', 'Preparar café', 189, 431], ['banho', 'Tomar banho', 150, 624],
  ['espelho', 'Olhar o espelho', 280, 624], ['radio', 'Ouvir rádio', 606, 480],
  ['janela', 'Olhar pela janela', 300, 111], ['correio', 'Ver correspondência', 428, 627],
  ['lembrancas', 'Ver lembranças', 301, 269], ['bau', 'Abrir baú', 80, 263],
  ['armario', 'Abrir o armário', 333, 269],
] as const;
/** A tigela só existe quando há um bicho em casa. */
const PONTO_TIGELA = ['tigela', 'Cuidar do bicho', 221, 431] as const;
/** Pontos em cômodos básicos. Não mudam colisões nem exigem expansões. */
export class VidaDomestica {
  private marcas: Phaser.GameObjects.GameObject[] = [];
  private cena: FarmScene;
  private ui: UIScene;
  constructor(cena: FarmScene, ui: UIScene) { this.cena = cena; this.ui = ui; }
  montar(): Interagivel[] {
    if (estado.mapa !== 'oficina') return [];
    this.desenhar();
    const pontos = companhia(estado) ? [...PONTOS, PONTO_TIGELA] : [...PONTOS];
    return pontos.map(([id, rotulo, x, y]) => ({ id: `casa:${id}`, tipo: 'domestico', rotulo, x, y, props: { acao: id } }));
  }
  private contar(texto: string, id?: string): void {
    this.ui.iniciarDialogo([{ nome: 'Você', texto }], () => {
      if (id) escreverDiario(estado, `casa:${id}:${estado.dia}`, texto);
      this.cena.salvarJogo(); this.desenhar();
    });
  }
  interagir(id: string): void {
    if (id === 'cafe') this.contar('O cheiro chega antes da vontade de fazer qualquer coisa. Sento com a xícara. Ela pode esfriar um pouco.', id);
    if (id === 'banho') this.contar('A água começa fria. Aos poucos o barulho da rua fica distante. Quando saio, a toalha tem cheiro de casa.', id);
    if (id === 'espelho') this.espelho();
    if (id === 'armario') this.armario();
    if (id === 'tigela') this.cuidarDoBicho();
    if (id === 'radio') this.contar(programaRadio(estado.relogio.minutos, estado.dia), id);
    if (id === 'janela') this.contar(estado.relogio.minutos >= 1080 ? 'Uma janela acende do outro lado. Outra apaga. Não sou a única pessoa acordada.' : 'A cortina encosta no meu braço. Alguém passa com uma sacola. A rua continua sem precisar de mim.', id);
    if (id === 'correio') {
      const f = estado.worldEvents;
      if (f.ativa('campanha:cena:oficina') && !f.ativa('casa:presenteLuke')) {
        f.definir('casa:presenteLuke', true); this.contar('Luke deixou uma peça azul e um bilhete: “Não sei o que faz. Achei que você ia gostar.”', id);
      } else if (f.ativa('social:jantarWendel') && !f.ativa('casa:presenteWendel')) {
        f.definir('casa:presenteWendel', true); this.contar('Wendel deixou uma pequena peça de rádio. “A caixa de parafusos já estava cheia.” Não há pedido de conserto.', id);
      } else this.contar('Um folheto, uma conta, o barulho do papel. Hoje não há nada urgente.');
    }
    if (id === 'lembrancas') {
      const lembrancas = lembrancasDaCasa(estado);
      if (!lembrancas.length) this.contar('Ainda há espaço nessa prateleira.');
      else this.ui.abrirMenu('Coisas que ficaram', lembrancas.map(m => ({ rotulo: m.nome, aoEscolher: () => this.contar(m.texto) })));
    }
    if (id === 'bau') {
      const memorias = memoriasDisponiveis(estado);
      if (!memorias.length) { this.contar('A tampa continua fechada. Não preciso abrir hoje.'); return; }
      this.ui.abrirMenu('Baú de memórias', memorias.map(m => ({ rotulo: m.nome, aoEscolher: () => this.contar(m.texto, `memoria:${m.id}`) })));
    }
  }
  /** O espelho continua sendo texto; cabelo e barba entram como escolha. */
  private espelho(): void {
    const { cabelo, barba } = crescimento(estado);
    this.ui.iniciarDialogo([{ nome: 'Você', texto: textoEspelho(estado) }, { nome: 'Você', texto: textoDoCrescimento(estado) }], () => {
      const opcoes: { rotulo: string; aoEscolher: () => void }[] = [];
      if (cabelo > 0) opcoes.push({ rotulo: 'Cortar o cabelo', aoEscolher: () => this.contar(cuidar(estado, 'cabelo')) });
      if (barba > 0) opcoes.push({ rotulo: 'Fazer a barba', aoEscolher: () => this.contar(cuidar(estado, 'barba')) });
      if (cabelo > 0 && barba > 0) opcoes.push({ rotulo: 'Cuidar dos dois', aoEscolher: () => this.contar(cuidar(estado, 'ambos')) });
      if (!opcoes.length) { this.cena.salvarJogo(); return; }
      opcoes.push({ rotulo: 'Deixar como está', aoEscolher: () => this.cena.salvarJogo() });
      this.ui.abrirMenu('Espelho', opcoes);
    });
  }

  /** Conjuntos e peças recebidas de moradores. Nenhuma roupa dá vantagem. */
  private armario(): void {
    const atual = conjuntoAtual(estado), peca = pecaAtual(estado);
    const clima = estado.clima.paraDia(estado.dia), estacao = dataDoDia(estado.dia).estacao;
    const opcoes = conjuntosDisponiveis(estado).map(c => ({
      rotulo: `${c.id === atual.id ? '• ' : ''}${c.nome}`,
      aoEscolher: () => { vestir(estado, c.id); this.contar(c.texto); },
    }));
    for (const p of pecasDisponiveis(estado)) {
      opcoes.push({ rotulo: `${p.id === peca?.id ? '• ' : ''}${p.nome}`, aoEscolher: () => { usarPeca(estado, p.id === peca?.id ? null : p.id); this.contar(p.texto); } });
    }
    const aviso = comentarioDaRoupa(estado, clima, estacao);
    if (aviso) opcoes.push({ rotulo: 'Pensar no tempo de hoje', aoEscolher: () => this.contar(aviso) });
    const guardados = conjuntosDisponiveis(estado).length;
    this.ui.abrirMenu(`Armário — ${guardados} de ${CONJUNTOS.length} conjuntos`, opcoes);
  }

  private cuidarDoBicho(): void {
    const bicho = companhia(estado);
    if (!bicho) return;
    const clima = estado.clima.paraDia(estado.dia);
    this.ui.abrirMenu(bicho.nome, [
      { rotulo: bicho.comeuHoje ? 'Ver a tigela' : 'Pôr comida', aoEscolher: () => this.contar(alimentar(estado) ?? '', 'bicho') },
      { rotulo: 'Ver onde ele está', aoEscolher: () => this.contar(`${bicho.nome} está ${lugarDoDescanso(estado, clima).texto}.`) },
      { rotulo: 'Ficar por perto', aoEscolher: () => this.contar(bicho.convivio >= 10
        ? `Sentei no chão. ${bicho.nome} encostou as costas na minha perna e dormiu de novo.`
        : `${bicho.nome} abre um olho, confere que sou eu e volta a dormir.`) },
    ]);
  }

  private desenhar(): void {
    this.marcas.forEach(m => m.destroy()); this.marcas = [];
    const g = this.cena.add.graphics().setDepth(270); this.marcas.push(g);
    const fotos = this.cena.add.container(0, 0).setDepth(270); this.marcas.push(fotos);
    fotografiaEmMoldura(this.cena, fotos, 310, 238, 25);
    // Objetos pequenos sobre o mobiliário já existente; cada um tem identidade persistente.
    lembrancasDaCasa(estado).forEach((m, i) => {
      const x = 265 + i * 12;
      desenharObjetoLembranca(g, m.id, x, 247);
    });
    const habitada = estado.worldEvents.ativa('campanha:cena:leticia');
    g.fillStyle(habitada ? 0xaca88d : 0x697781, .75).fillRect(284, 76, habitada ? 4 : 15, 29).fillRect(318, 76, habitada ? 4 : 15, 29);
    g.fillStyle(0x8a795f).fillRect(95, 255, 18, 12);
    if (!habitada) g.fillRect(116, 260, 16, 13).fillRect(105, 245, 16, 12);
    g.fillStyle(0xc3bc9b).fillEllipse(186, 406, 12, 4);
    if (habitada) g.fillEllipse(203, 410, 12, 4);
  }
}

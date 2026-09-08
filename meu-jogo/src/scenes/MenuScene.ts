import Phaser from 'phaser';
import { estado } from '../game/estado';
import { dataDoDia, DIAS_POR_ESTACAO } from '../game/calendario';
import { MISSOES_NPC } from '../game/missoesNpc';
import { apagar } from '../game/save';

type Pagina = 'titulo' | 'pausa' | 'opcoes' | 'calendario' | 'diario' | 'estatisticas';
interface Opcao { texto: string; executar: () => void; }
const COR = { fundo: 0x172726, papel: 0x263b35, borda: 0xb59864, texto: '#f1e7ca', fraco: '#b2c4b6', foco: 0x426453 };

export class MenuScene extends Phaser.Scene {
  pagina: Pagina = 'pausa';
  private cursor = 0;
  private topo = 0;
  private opcoes: Opcao[] = [];
  private titulo = '';
  private mensagem = '';
  private raiz!: Phaser.GameObjects.Container;
  private veioDoTitulo = false;
  private padAntes = new Set<number>();
  constructor() { super({ key: 'MenuScene' }); }
  create(dados: { pagina?: Pagina } = {}): void {
    this.pagina = dados.pagina ?? 'pausa'; this.veioDoTitulo = this.pagina === 'titulo';
    this.scene.pause('FarmScene'); this.scene.pause('UIScene');
    this.scene.bringToTop(); this.raiz = this.add.container(0, 0);
    this.input.keyboard?.addCapture(['UP', 'DOWN', 'SPACE', 'ENTER', 'ESC', 'PAGE_UP', 'PAGE_DOWN']);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) this.mover(-1);
      else if (['ArrowDown', 's', 'S'].includes(e.key)) this.mover(1);
      else if (e.key === 'PageUp') this.mover(-6);
      else if (e.key === 'PageDown') this.mover(6);
      else if (['Enter', 'e', 'E', ' '].includes(e.key)) this.opcoes[this.cursor]?.executar();
      else if (e.key === 'Escape') this.voltar();
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _x: number, y: number) => this.mover(Math.sign(y)));
    this.abrir(this.pagina);
  }
  update(): void {
    const pad = navigator.getGamepads?.()[0]; if (!pad) return;
    const agora = new Set(pad.buttons.flatMap((b, i) => b.pressed ? [i] : []));
    for (const n of agora) if (!this.padAntes.has(n)) {
      if (n === 12) this.mover(-1); if (n === 13) this.mover(1);
      if (n === 0) this.opcoes[this.cursor]?.executar(); if (n === 1 || n === 9) this.voltar();
    }
    this.padAntes = agora;
  }
  fechar(): void { this.scene.resume('FarmScene'); this.scene.resume('UIScene'); this.scene.stop(); }
  private voltar(): void {
    if (this.pagina === 'titulo') return;
    if (this.pagina === 'pausa') this.fechar(); else this.abrir(this.veioDoTitulo ? 'titulo' : 'pausa');
  }
  private abrir(pagina: Pagina): void {
    this.pagina = pagina; this.cursor = 0; this.topo = 0; this.mensagem = '';
    const ir = (texto: string, p: Pagina): Opcao => ({ texto, executar: () => this.abrir(p) });
    this.titulo = ({ titulo: 'MEU JOGO', pausa: 'Um momento na cidade', opcoes: 'Opcoes', calendario: 'Calendario', diario: 'Diario', estatisticas: 'Sua jornada' })[pagina];
    this.opcoes = [];
    if (pagina === 'titulo') {
      this.mensagem = 'Uma oficina. Uma cidade. Algo sob a represa.';
      this.opcoes = [{ texto: 'Entrar na cidade', executar: () => this.fechar() }, ir('Opcoes', 'opcoes'), {
        texto: 'Novo jogo', executar: () => {
          this.titulo = 'Iniciar uma nova historia?'; this.mensagem = 'O save atual sera guardado em backup.';
          this.opcoes = [{ texto: 'Cancelar', executar: () => this.abrir('titulo') }, { texto: 'Confirmar novo jogo', executar: () => { if (apagar()) location.reload(); else { this.mensagem = 'Falha ao guardar backup. Save preservado.'; this.desenhar(); } } }];
          this.cursor = 0; this.desenhar();
        },
      }];
    } else if (pagina === 'pausa') {
      this.opcoes = [{ texto: 'Continuar', executar: () => this.fechar() }, ir('Calendario', 'calendario'), ir('Diario de missoes', 'diario'), ir('Estatisticas e colecoes', 'estatisticas'), ir('Opcoes', 'opcoes')];
    } else if (pagina === 'opcoes') {
      const v = estado.preferencias.valores;
      const alterar = (fn: () => void) => { fn(); const i = this.cursor; const t = this.topo; const salvo = estado.preferencias.salvar(); this.abrir('opcoes'); this.cursor = i; this.topo = t; if (!salvo) this.mensagem = 'Opcoes aplicadas; nao foi possivel salvar.'; this.desenhar(); };
      this.opcoes = [
        { texto: 'Tela cheia: alternar', executar: () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen() },
        { texto: `Tempo do mundo: ${v.tempo}x`, executar: () => alterar(() => { v.tempo = v.tempo === 0.5 ? 1 : v.tempo === 1 ? 2 : 0.5; }) },
        { texto: `Movimento reduzido: ${v.movimentoReduzido ? 'sim' : 'nao'}`, executar: () => alterar(() => { v.movimentoReduzido = !v.movimentoReduzido; }) },
        { texto: `Particulas: ${v.particulas ? 'sim' : 'nao'}`, executar: () => alterar(() => { v.particulas = !v.particulas; }) },
        { texto: `Contraste alto: ${v.altoContraste ? 'sim' : 'nao'}`, executar: () => alterar(() => { v.altoContraste = !v.altoContraste; }) },
        { texto: `Qualidade: ${v.qualidade}`, executar: () => alterar(() => { v.qualidade = v.qualidade === 'baixa' ? 'normal' : v.qualidade === 'normal' ? 'alta' : 'baixa'; }) },
      ];
    } else if (pagina === 'diario') {
      this.opcoes = MISSOES_NPC.filter(m => estado.missoesNpc.estado(m.id) !== 'disponivel').map(m => ({
        texto: `${estado.missoesNpc.estado(m.id) === 'concluida' ? '[OK]' : '[ ]'} ${m.titulo}`,
        executar: () => { this.mensagem = m.descricao; this.desenhar(); },
      }));
      if (!this.opcoes.length) this.mensagem = 'Nenhuma missao iniciada. Conheca os moradores.';
    } else if (pagina === 'estatisticas') {
      const p = estado.progressao.serializar();
      this.mensagem = `Dia ${estado.dia + 1} | ${estado.progressao.total}/10 conquistas\n${p.descobertos.length} itens descobertos | ${p.trabalhos} trabalhos\n${estado.relacoes.listaInteragidos().length} moradores conhecidos\n${estado.arquivo.serializar().length}/50 arquivos da represa`;
    }
    this.desenhar();
  }
  private mover(delta: number): void {
    this.cursor = Math.max(0, Math.min(this.opcoes.length - 1, this.cursor + delta));
    if (this.cursor < this.topo) this.topo = this.cursor;
    if (this.cursor >= this.topo + 6) this.topo = this.cursor - 5;
    this.desenhar();
  }
  private desenhar(): void {
    this.raiz.removeAll(true);
    const texte = (x: number, y: number, t: string, size = 11, color = COR.texto) => {
      const o = this.add.text(x, y, t, { fontFamily: 'monospace', fontSize: `${size}px`, color, wordWrap: { width: 392 }, lineSpacing: 3 }); this.raiz.add(o); return o;
    };
    this.raiz.add(this.add.rectangle(240, 135, 480, 270, COR.fundo, 0.98));
    this.raiz.add(this.add.rectangle(240, 133, 432, 224, estado.preferencias.valores.altoContraste ? 0x0c1712 : COR.papel).setStrokeStyle(2, COR.borda));
    texte(44, 34, this.titulo, 18);
    if (this.pagina === 'calendario') {
      const d = dataDoDia(estado.dia); texte(44, 63, `${d.nomeEstacao} / Ano ${d.ano} - ${estado.clima.paraDia(estado.dia)}`);
      ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].forEach((s, i) => texte(64 + i * 54, 86, s, 10, COR.fraco));
      for (let i = 0; i < DIAS_POR_ESTACAO; i++) {
        const x = 60 + (i % 7) * 54, y = 112 + Math.floor(i / 7) * 26;
        this.raiz.add(this.add.rectangle(x + 12, y + 8, 40, 23, i + 1 === d.diaEstacao ? COR.foco : COR.fundo).setStrokeStyle(1, COR.borda));
        texte(x + 4, y, String(i + 1));
      }
    } else {
      this.opcoes.slice(this.topo, this.topo + 6).forEach((op, n) => {
        const i = n + this.topo, y = 68 + n * 23;
        const fundo = this.add.rectangle(240, y + 8, 392, 21, i === this.cursor ? COR.foco : COR.fundo).setInteractive({ useHandCursor: true });
        fundo.on('pointerdown', () => { this.cursor = i; op.executar(); }); this.raiz.add(fundo);
        texte(53, y, `${i === this.cursor ? '> ' : '  '}${op.texto}`);
      });
      if (this.mensagem) texte(44, this.opcoes.length ? 212 : 74, this.mensagem, this.opcoes.length ? 9 : 12, COR.fraco);
    }
    const footer = texte(44, 249, this.pagina === 'titulo' ? 'Setas / E / clique para escolher' : '[Esc/B] Voltar   [E/A] Escolher   [setas] Navegar', 10);
    if (this.pagina !== 'titulo') footer.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.voltar());
  }
}

import Phaser from 'phaser';
import { estado } from '../game/estado';
import { dataDoDia, DIAS_POR_ESTACAO } from '../game/calendario';
import { MISSOES_NPC } from '../game/missoesNpc';
import { apagar } from '../game/save';
import { controles, CONTROLES } from '../game/InputRouter';
import { som } from './Som';
import type { Acao } from '../game/InputRouter';
import { MAPAS } from '../game/mapas';
import { ITENS } from '../game/inventario';
import { UI } from '../game/config';
import { CLIMAS } from '../game/clima';
import type { FarmScene } from './FarmScene';

type Pagina = 'titulo' | 'pausa' | 'opcoes' | 'som' | 'calendario' | 'diario' | 'estatisticas' | 'controles' | 'dev' | 'dev_mapas' | 'dev_itens';
/** `ajustar` existe nas linhas de escala (volume): setas laterais mexem no valor. */
interface Opcao { texto: string; executar: () => void; ajustar?: (delta: number) => void; }
/** Volumes ajustaveis, na ordem em que aparecem na tela. */
const VOLUMES = [
  ['master', 'Volume geral', 'ui_confirmar'],
  ['musica', 'Musica', null],
  ['ambiente', 'Ambiente', null],
  ['efeitos', 'Efeitos', 'pegar'],
  ['interface', 'Interface', 'ui_mover'],
] as const;
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
  private aceitarPadApos = 0;
  constructor() { super({ key: 'MenuScene' }); }
  create(dados: { pagina?: Pagina } = {}): void {
    this.pagina = dados.pagina ?? 'pausa'; this.veioDoTitulo = this.pagina === 'titulo';
    this.aceitarPadApos = this.time.now + 180;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => controles.cancelarCaptura());
    this.scene.pause('FarmScene'); this.scene.pause('UIScene');
    this.scene.bringToTop(); this.raiz = this.add.container(0, 0);
    this.input.keyboard?.addCapture(['UP', 'DOWN', 'SPACE', 'ENTER', 'ESC', 'PAGE_UP', 'PAGE_DOWN']);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) this.mover(-1);
      else if (['ArrowDown', 's', 'S'].includes(e.key)) this.mover(1);
      else if (e.key === 'PageUp') this.mover(-6);
      else if (e.key === 'PageDown') this.mover(6);
      else if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.opcoes[this.cursor]?.ajustar?.(-1);
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) this.opcoes[this.cursor]?.ajustar?.(1);
      else if (['Enter', 'e', 'E', ' '].includes(e.key)) this.opcoes[this.cursor]?.executar();
      else if (e.key === 'Escape') this.voltar();
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _x: number, y: number) => this.mover(Math.sign(y)));
    this.abrir(this.pagina);
  }
  update(): void {
    if (this.time.now < this.aceitarPadApos || controles.capturando) return;
    if (controles.apertouPad('cima')) this.mover(-1);
    if (controles.apertouPad('baixo')) this.mover(1);
    if (controles.apertouPad('esquerda')) this.opcoes[this.cursor]?.ajustar?.(-1);
    if (controles.apertouPad('direita')) this.opcoes[this.cursor]?.ajustar?.(1);
    if (controles.apertouPad('interagir')) this.opcoes[this.cursor]?.executar();
    if (controles.padVoltar || controles.padPausa) this.voltar();
  }
  fechar(): void { this.scene.resume('FarmScene'); this.scene.resume('UIScene'); this.scene.stop(); }
  private voltar(): void {
    if (this.pagina === 'titulo') return;
    som.tocar('ui_cancelar');
    if (this.pagina === 'pausa') this.fechar(); else this.abrir(this.veioDoTitulo ? 'titulo' : 'pausa');
  }
  private abrir(pagina: Pagina): void {
    if (!import.meta.env.DEV && pagina.startsWith('dev')) pagina = 'pausa';
    this.pagina = pagina; this.cursor = 0; this.topo = 0; this.mensagem = '';
    const ir = (texto: string, p: Pagina): Opcao => ({ texto, executar: () => { som.tocar('ui_confirmar'); this.abrir(p); } });
    // Os titulos de desenvolvimento ficam dentro do guarda de DEV pro bundle de
    // producao nao carregar nem o vocabulario das telas que ele nao alcanca.
    const titulos: Partial<Record<Pagina, string>> = { titulo: 'MEU JOGO', pausa: 'Um momento na cidade', opcoes: 'Opcoes', calendario: 'Calendario', diario: 'Diario', estatisticas: 'Sua jornada', som: 'Som e volume', controles: 'Controles' };
    if (import.meta.env.DEV) Object.assign(titulos, { dev: 'Desenvolvimento', dev_mapas: 'Desenvolvimento: mapas', dev_itens: 'Desenvolvimento: itens' });
    this.titulo = titulos[pagina] ?? '';
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
      if (import.meta.env.DEV) this.opcoes.push(ir('Desenvolvimento', 'dev'));
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
        ir('Som e volume', 'som'),
        ir('Teclas e controle', 'controles'),
      ];
    } else if (pagina === 'som') {
      const v = estado.preferencias.valores;
      // A barra em texto acompanha a porcentagem: nada aqui depende de cor.
      const barra = (valor: number) => `[${'#'.repeat(Math.round(valor * 10))}${'.'.repeat(10 - Math.round(valor * 10))}]`;
      const ajustar = (chave: typeof VOLUMES[number][0], delta: number, previa: string | null) => {
        const alvo = Math.max(0, Math.min(1, Math.round((v[chave] + delta) * 10) / 10));
        if (alvo === v[chave] && delta !== 0) return;
        v[chave] = alvo;
        som.aplicar(v);
        const i = this.cursor, t = this.topo; const salvo = estado.preferencias.salvar();
        this.abrir('som'); this.cursor = i; this.topo = t;
        this.mensagem = salvo ? this.mensagem : 'Volume aplicado; nao foi possivel salvar.';
        this.desenhar();
        if (previa) som.tocar(previa as never);
      };
      this.mensagem = som.disponivel
        ? 'Setas laterais ajustam de 10 em 10; E percorre a escala.'
        : 'Este navegador nao tem audio disponivel; os valores ficam guardados.';
      this.opcoes = VOLUMES.map(([chave, rotulo, previa]) => ({
        texto: `${rotulo}: ${String(Math.round(v[chave] * 100)).padStart(3)}% ${barra(v[chave])}`,
        executar: () => ajustar(chave, v[chave] >= 1 ? -1 : 0.1, previa),
        ajustar: (delta: number) => ajustar(chave, delta * 0.1, previa),
      }));
    } else if (pagina === 'controles') {
      this.mensagem = 'Menus: setas/E/Esc fixos. Pad: A interagir, Y bolsa, B voltar.';
      this.opcoes = (Object.keys(CONTROLES) as Acao[]).map(id => ({ texto: `${CONTROLES[id][0]}: ${controles.rotulo(id)}`, executar: () => {
        this.mensagem = 'Pressione a nova tecla. Esc cancela.'; this.desenhar();
        controles.aguardar(code => {
          const resposta = code === 'Escape' ? 'Alteracao cancelada.' : controles.atribuir(id, code);
          const i = this.cursor, t = this.topo; this.abrir('controles'); this.cursor = i; this.topo = t; this.mensagem = resposta; this.desenhar();
        });
      } }));
      this.opcoes.push({ texto: 'Restaurar teclas padrao', executar: () => { controles.restaurarPadroes(); this.abrir('controles'); } });
    } else if (import.meta.env.DEV && pagina === 'dev') {
      const mundo = this.scene.get('FarmScene') as FarmScene;
      const aplicar = (fn: () => void) => { fn(); this.abrir('dev'); };
      this.mensagem = `${Math.round(this.game.loop.actualFps)} FPS | ${mundo.children.length} objetos | ${this.textures.getTextureKeys().length} texturas`;
      this.opcoes = [
        ir('Viajar para mapa', 'dev_mapas'), ir('Adicionar item', 'dev_itens'),
        { texto: `Hora +1 (${estado.relogio.texto})`, executar: () => aplicar(() => {
          const antes = estado.dia; estado.dia += estado.relogio.avancarMinutos(60);
          if (estado.dia !== antes) estado.eventos.emit('DAY_STARTED', { dia: estado.dia });
          estado.eventos.emit('TIME_CHANGED', { dia: estado.dia, minuto: estado.relogio.minutos });
        }) },
        { texto: `Dia +1 (atual ${estado.dia + 1})`, executar: () => aplicar(() => { estado.dia++; estado.eventos.emit('DAY_STARTED', { dia: estado.dia }); }) },
        { texto: `Clima: ${estado.clima.paraDia(estado.dia)}`, executar: () => aplicar(() => { estado.rural.avancar(estado.dia, estado.clima); estado.clima.definir(estado.dia, CLIMAS[(CLIMAS.indexOf(estado.clima.paraDia(estado.dia)) + 1) % CLIMAS.length]); }) },
        { texto: 'Recuperar vida', executar: () => aplicar(() => estado.vida.restaurarTudo()) },
        { texto: 'Receber R$ 100', executar: () => aplicar(() => { estado.carteira.ganhar(10000); }) },
        { texto: 'Salvar e exportar JSON', executar: () => {
          if (!mundo.salvarJogo()) { this.mensagem = 'Falha ao salvar; exportacao cancelada.'; this.desenhar(); return; }
          const texto = localStorage.getItem('meu-jogo:save'); if (!texto) return;
          const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
          const a = document.createElement('a'); a.href = url; a.download = `meu-jogo-dia-${estado.dia + 1}.json`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } },
      ];
    } else if (import.meta.env.DEV && pagina === 'dev_mapas') {
      this.opcoes = Object.values(MAPAS).map(m => ({ texto: m.chave, executar: () => { this.fechar(); this.scene.get('FarmScene').scene.restart({ mapa: m.chave }); } }));
    } else if (import.meta.env.DEV && pagina === 'dev_itens') {
      this.opcoes = Object.entries(ITENS).map(([id, item]) => ({ texto: item.nome, executar: () => { const resto = estado.inventario.adicionar(id, 1); this.mensagem = resto ? 'Inventario cheio.' : `Adicionado: ${item.nome}`; this.desenhar(); } }));
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
    const antes = this.cursor;
    this.cursor = Math.max(0, Math.min(this.opcoes.length - 1, this.cursor + delta));
    if (this.cursor !== antes) som.tocar(Math.abs(delta) > 1 ? 'ui_pagina' : 'ui_mover');
    if (this.cursor < this.topo) this.topo = this.cursor;
    if (this.cursor >= this.topo + 6) this.topo = this.cursor - 5;
    this.desenhar();
  }
  private desenhar(): void {
    this.raiz.removeAll(true);
    // a tela de menu tem paleta propria (`COR`) porque e a moldura em volta do
    // jogo e nao o HUD dentro dele; a ESCALA de texto e a mesma do resto,
    // `UI.tamanho*`, senao o menu vira um sexto conjunto de tamanhos
    const texte = (x: number, y: number, t: string, size: string = UI.tamanhoTitulo, color = COR.texto) => {
      const o = this.add.text(x, y, t, { fontFamily: UI.fonte, fontSize: size, color, wordWrap: { width: 392 }, lineSpacing: 3 }); this.raiz.add(o); return o;
    };
    this.raiz.add(this.add.rectangle(240, 135, 480, 270, COR.fundo, 0.98));
    this.raiz.add(this.add.rectangle(240, 133, 432, 224, estado.preferencias.valores.altoContraste ? 0x0c1712 : COR.papel).setStrokeStyle(2, COR.borda));
    texte(44, 34, this.titulo, UI.tamanhoGrande);
    if (this.pagina === 'calendario') {
      const d = dataDoDia(estado.dia); texte(44, 63, `${d.nomeEstacao} / Ano ${d.ano} - ${estado.clima.paraDia(estado.dia)}`);
      ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].forEach((s, i) => texte(64 + i * 54, 86, s, UI.tamanho, COR.fraco));
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
      if (this.mensagem) texte(44, this.opcoes.length ? 212 : 74, this.mensagem, this.opcoes.length ? UI.tamanhoMiudo : UI.tamanhoFala, COR.fraco);
    }
    const rodape = this.pagina === 'titulo'
      ? 'Setas / E / clique para escolher'
      : this.opcoes.some(o => o.ajustar)
        ? '[Esc/B] Voltar   [<>] Ajustar   [E/A] Escolher'
        : '[Esc/B] Voltar   [E/A] Escolher   [setas] Navegar';
    const footer = texte(44, 249, rodape, UI.tamanho);
    if (this.pagina !== 'titulo') footer.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.voltar());
  }
}

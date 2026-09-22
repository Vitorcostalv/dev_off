import Phaser from 'phaser';
import { estado } from '../game/estado';
import { dataDoDia, DIAS_POR_ESTACAO } from '../game/calendario';
import { MISSOES_NPC } from '../game/missoesNpc';
import { TOTAL_DOCUMENTOS } from '../game/fichas';
import { cenaPendente, motivoEspera, viuCena } from '../game/campanha';
import { apagar, restaurarDados } from '../game/save';
import { listarPartidas, guardarPartida } from '../game/partidas';
import type { Partida } from '../game/partidas';
import { carregarMobiliaNarrativa } from './arteNarrativa';
import { desenharTelaInicial } from './TelaInicial';
import { lerDiario, sincronizarDiario } from '../game/diarioPessoal';
import { ANIVERSARIO_PROTAGONISTA, aniversarioDe, aniversariantesDoDia, dataLegivel, ehAniversario, meuAniversarioHoje, quemSabeDoMeuAniversario } from '../game/aniversarios';
import { mensagensDisponiveis, responderMensagem, conversaCelular, fotosPessoais } from '../game/celular';
import { feedAte } from '../game/blog';
import { naturezaDaRelacao } from '../game/vidaSocial';
import { memoriasDisponiveis } from '../game/memoriasPessoais';
import { encontroDoDia } from '../game/rotinaSocial';
import { controles, CONTROLES } from '../game/InputRouter';
import { som } from './Som';
import type { Acao } from '../game/InputRouter';
import { MAPAS } from '../game/mapas';
import { ITENS } from '../game/inventario';
import { UI } from '../game/config';
import { CLIMAS } from '../game/clima';
import type { FarmScene } from './FarmScene';

type Pagina = 'celular' | 'mensagens' | 'contatos' | 'blog' | 'fotos' | 'album' | 'titulo' | 'pausa' | 'opcoes' | 'som' | 'calendario' | 'diario' | 'pessoal' | 'entradaPessoal' | 'historia' | 'estatisticas' | 'controles' | 'carregar' | 'salvar' | 'creditos' | 'confirmar' | 'sair' | 'dev' | 'dev_mapas' | 'dev_itens';
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
  private climaTitulo?: Phaser.GameObjects.Graphics;
  private partidas: Partida[] = [];
  private previaId = 0;
  private texturaPrevia = '';
  constructor() { super({ key: 'MenuScene' }); }
  preload(): void { carregarMobiliaNarrativa(this); }
  create(dados: { pagina?: Pagina } = {}): void {
    this.pagina = dados.pagina ?? 'pausa'; this.veioDoTitulo = this.pagina === 'titulo';
    this.aceitarPadApos = this.time.now + 180;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { controles.cancelarCaptura(); this.previaId++; if (this.texturaPrevia) this.textures.remove(this.texturaPrevia); });
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
    if (this.pagina === 'titulo' && this.climaTitulo?.active) {
      const g = this.climaTitulo; g.clear();
      if (!estado.preferencias.valores.movimentoReduzido) {
        const inverno = dataDoDia(estado.dia).estacao === 3;
        g.lineStyle(1, 0x92b6c6, .22);
        for (let i = 0; i < 24; i++) {
          const x = 263 + (i * 31) % 101, y = 38 + (this.time.now * (inverno ? .018 : .07) + i * 23) % 95;
          if (inverno) g.lineBetween(x, y, x + 4, y + 1); else g.lineBetween(x, y, x - 2, y + 5);
        }
        if (estado.arquivo.tem(100) && this.time.now % 47000 < 130) g.fillStyle(0x10171e, .12).fillRect(355, 117, 47, 82);
      }
    }
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
    if (this.pagina === 'entradaPessoal') { this.abrir('pessoal'); return; }
    if (['mensagens', 'contatos', 'blog', 'fotos', 'album'].includes(this.pagina)) { this.abrir('celular'); return; }
    if (this.pagina === 'pausa') this.fechar(); else this.abrir(this.veioDoTitulo ? 'titulo' : 'pausa');
  }
  private abrir(pagina: Pagina): void {
    if (!import.meta.env.DEV && pagina.startsWith('dev')) pagina = 'pausa';
    this.pagina = pagina; this.cursor = 0; this.topo = 0; this.mensagem = '';
    const ir = (texto: string, p: Pagina): Opcao => ({ texto, executar: () => { som.tocar('ui_confirmar'); this.abrir(p); } });
    // Os titulos de desenvolvimento ficam dentro do guarda de DEV pro bundle de
    // producao nao carregar nem o vocabulario das telas que ele nao alcanca.
    const titulos: Partial<Record<Pagina, string>> = { titulo: 'MEU JOGO', pausa: 'Um momento na cidade', opcoes: 'Configurações', calendario: 'Calendario', diario: 'Diario', estatisticas: 'Sua jornada', som: 'Som e volume', controles: 'Controles', carregar: 'Voltar a um momento', salvar: 'Guardar este momento', creditos: 'Créditos', sair: 'Até outro dia' };
    if (import.meta.env.DEV) Object.assign(titulos, { dev: 'Desenvolvimento', dev_mapas: 'Desenvolvimento: mapas', dev_itens: 'Desenvolvimento: itens' });
    this.titulo = titulos[pagina] ?? '';
    this.opcoes = [];
    if (pagina === 'titulo') {
      const ativo = listarPartidas()[0];
      this.mensagem = ativo?.estado === 'disponivel' ? `${ativo.data}\n${ativo.lugar}` : 'Uma casa ainda por habitar.';
      this.opcoes = [
        { texto: ativo?.estado === 'disponivel' ? 'Continuar' : 'Continuar — indisponível', executar: () => {
          if (ativo?.estado === 'disponivel') this.entrar();
          else { this.mensagem = ativo?.estado === 'incompativel' ? 'Save de uma versão mais recente. Abra Carregar.' : 'Comece em Novo jogo ou escolha Carregar.'; this.desenhar(); }
        } },
        { texto: 'Novo jogo', executar: () => {
          if (ativo?.estado === 'vazio') { this.entrar(); return; }
          this.confirmar('Começar uma nova história?', 'O autosave atual ficará no backup. Suas quatro lembranças serão preservadas.', () => { if (apagar()) location.reload(); else this.falhaSave(); }, 'titulo');
        } },
        ir('Carregar', 'carregar'), ir('Configurações', 'opcoes'), ir('Créditos', 'creditos'), ir('Sair', 'sair'),
      ];
      if (ativo?.estado === 'vazio') this.cursor = 1;
      som.musica(null); som.ambiente('amb_interior');
    } else if (pagina === 'pausa') {
      this.opcoes = [{ texto: 'Continuar', executar: () => this.fechar() }, ir('Sua história', 'historia'), ir('Calendario', 'calendario'), ir('Diario de missoes', 'diario'), ir('Estatisticas e colecoes', 'estatisticas'), ir('Opcoes', 'opcoes')];
      this.opcoes.push(ir('Guardar momento', 'salvar'), ir('Carregar momento', 'carregar'), { texto: 'Tela inicial', executar: () => {
        if (!(this.scene.get('FarmScene') as FarmScene).salvarJogo()) { this.falhaSave(); return; }
        this.veioDoTitulo = true; this.abrir('titulo');
      } });
      this.opcoes.splice(2, 0, ir('Diário pessoal', 'pessoal'));
      this.opcoes.splice(3, 0, ir('Celular', 'celular'));
      if (import.meta.env.DEV) this.opcoes.push(ir('Desenvolvimento', 'dev'));
    } else if (pagina === 'celular') {
      this.titulo = `Celular · ${estado.relogio.texto}`;
      this.opcoes = [ir('Mensagens', 'mensagens'), ir('Blog da cidade', 'blog'), ir('Calendário', 'calendario'), ir('Contatos', 'contatos'), ir('Fotografias', 'fotos'), ir('Álbum antigo', 'album'),
        { texto: 'Trabalhos', executar: () => { this.fechar(); (this.scene.get('UIScene') as import('./UIScene').UIScene).abrirComputador(); } },
        { texto: 'Mapa', executar: () => { this.fechar(); (this.scene.get('FarmScene') as FarmScene).abrirMapaCelular(); } }];
    } else if (pagina === 'mensagens') {
      this.titulo = 'Mensagens';
      this.opcoes = mensagensDisponiveis(estado).map(m => ({ texto: m.npc, executar: () => {
        this.titulo = m.npc; this.mensagem = conversaCelular(estado, m);
        this.opcoes = estado.worldEvents.obter(`celular:resposta:${m.id}`) === undefined ? [{ texto: m.resposta, executar: () => { responderMensagem(estado, m.id); (this.scene.get('FarmScene') as FarmScene).salvarJogo(); this.abrir('mensagens'); } }] : [];
        this.cursor = 0; this.topo = 0; this.desenhar();
      } }));
      if (!this.opcoes.length) this.mensagem = 'Nenhuma mensagem nova.';
    } else if (pagina === 'contatos') {
      this.titulo = 'Contatos';
      this.opcoes = estado.relacoes.listaInteragidos().map(id => ({ texto: id, executar: () => {
        this.titulo = id;
        const data = aniversarioDe(id);
        const linhas = [naturezaDaRelacao(estado, id)];
        if (data) linhas.push(`Aniversário: ${dataLegivel(data)}`);
        this.mensagem = linhas.join('\n');
        this.opcoes = []; this.desenhar();
      } }));
    } else if (pagina === 'blog') {
      this.titulo = 'Blog da cidade';
      this.opcoes = feedAte(estado.dia, estado.relogio.minutos).map(p => ({ texto: `${p.npcId} · dia ${p.dia + 1}`, executar: () => { this.mensagem = p.texto; this.opcoes = []; this.desenhar(); } }));
    } else if (pagina === 'album') {
      this.titulo = 'Álbum antigo';
      this.opcoes = memoriasDisponiveis(estado).filter(m => ['foto', 'cartao', 'pendrive'].includes(m.id)).map(m => ({ texto: m.nome, executar: () => { this.mensagem = m.texto; this.opcoes = []; this.desenhar(); } }));
      if (!this.opcoes.length) this.mensagem = 'Ainda não abri essa pasta.';
    } else if (pagina === 'fotos') {
      this.titulo = 'Fotografias';
      const fotos = fotosPessoais(estado.worldEvents.serializar().flags);
      this.opcoes = fotos.map(f => ({ texto: `Dia ${f.dia + 1} · ${f.mapa}`, executar: () => {
        this.opcoes = []; this.mensagem = ''; this.desenhar();
        const key = `foto-pessoal-${f.id}`;
        const mostrar = () => { if (this.scene.isActive() && this.pagina === 'fotos') this.raiz.add(this.add.image(240, 138, key).setDisplaySize(288, 162)); };
        if (this.textures.exists(key)) mostrar(); else { this.textures.once(`addtexture-${key}`, mostrar); this.textures.addBase64(key, f.imagem); }
      } }));
      if (estado.worldEvents.ativa('fotografia:liberada') || estado.worldEvents.ativa('campanha:cena:leticia')) this.opcoes.unshift({ texto: fotos.length >= 20 ? 'Álbum cheio (20 fotos)' : 'Fotografar este lugar', executar: () => { if (fotos.length < 20) { this.fechar(); (this.scene.get('FarmScene') as FarmScene).fotografar(); } } });
      else this.mensagem = 'Talvez Letícia possa me ensinar por onde começar.';
    } else if (pagina === 'pessoal') {
      this.titulo = 'Meu caderno';
      sincronizarDiario(estado);
      const entradas = lerDiario(estado.worldEvents.serializar().flags).reverse();
      this.opcoes = entradas.map(e => ({ texto: `Dia ${e.dia + 1} · ${e.texto.slice(0, 31)}…`, executar: () => {
        this.pagina = 'entradaPessoal'; this.titulo = `Meu caderno · dia ${e.dia + 1}`; this.opcoes = []; this.mensagem = e.texto; this.desenhar();
      } }));
      if (!entradas.length) this.mensagem = 'Ainda não encontrei as palavras.';
    } else if (pagina === 'carregar' || pagina === 'salvar') {
      this.partidas = listarPartidas().filter(p => pagina === 'carregar' || !['auto', 'backup'].includes(p.id));
      this.opcoes = this.partidas.map(p => ({ texto: p.nome, executar: () => {
        if (pagina === 'salvar') {
          const guardar = () => {
            if (!(this.scene.get('FarmScene') as FarmScene).salvarJogo() || !guardarPartida(p.id)) { this.falhaSave(); return; }
            this.abrir('salvar'); this.cursor = this.partidas.findIndex(s => s.id === p.id); this.mensagem = 'Momento guardado.'; this.desenhar();
          };
          if (p.estado !== 'vazio') this.confirmar('Substituir esta lembrança?', `${p.nome}: ${p.data || p.estado}. O autosave e os outros espaços serão preservados.`, guardar, 'salvar'); else guardar();
        } else if (p.estado === 'disponivel') {
          this.confirmar('Voltar a este momento?', `${p.data}. A sessão atual será guardada no backup antes de carregar.`, () => {
            if (!this.veioDoTitulo && !(this.scene.get('FarmScene') as FarmScene).salvarJogo()) { this.falhaSave(); return; }
            if (p.dados && restaurarDados(p.dados)) location.reload(); else this.falhaSave();
          }, 'carregar');
        } else { this.mensagem = p.estado === 'incompativel' ? 'Save de uma versão mais recente. Dados preservados.' : p.estado === 'danificado' ? 'Não foi possível ler este save. Tente o backup.' : 'Este espaço ainda está vazio.'; this.desenhar(); }
      } }));
    } else if (pagina === 'creditos') {
      this.mensagem = 'História e direção\nVitor\n\nDesenvolvimento assistido por Codex\n\nMotor: Phaser 3\nTypeScript e Vite\n\nObrigado por habitar esta cidade.';
    } else if (pagina === 'sair') {
      this.mensagem = 'O jogo está pausado. Você pode fechar esta aba.\n\nSuas lembranças continuam aqui.';
      som.silenciar();
    } else if (pagina === 'historia') {
      this.titulo = 'Sua história';
      const cena = cenaPendente(estado);
      const lugares: Record<string, string> = { oficina: 'sua casa e oficina', farm: 'o centro', farmacia: 'a farmácia', bar: 'o bar', represa: 'a estrada da represa', 'represa*': 'o interior da represa', represa_f50: 'o arquivo do andar 50', profundezas: 'a escada além do arquivo do andar 50', inicio: 'a chegada à cidade' };
      this.mensagem = cena ? `${cena.capitulo}\n${motivoEspera(estado, cena) ?? (cena.npc ? `Converse com ${cena.npc === 'wendel' ? 'Wendel' : cena.npc[0]!.toUpperCase() + cena.npc.slice(1)}.` : `Volte para ${lugares[cena.local] ?? cena.local}.`)}` : 'A vida tranquila veio depois. E foi você que fez.\nA cidade continua aqui.';
      const retomar = cena && !motivoEspera(estado, cena) && (cena.id === 'prologo' || estado.worldEvents.obter('campanha:ativa') === cena.id);
      this.opcoes = [{ texto: 'Voltar', executar: () => this.abrir('pausa') }];
      if (retomar) this.opcoes.unshift({ texto: 'Retomar cena', executar: () => { this.fechar(); (this.scene.get('FarmScene') as FarmScene).iniciarCenaCampanha(cena.id); } });
      if (viuCena(estado, 'andar50') && estado.mapa === 'represa_f50') this.opcoes.unshift({ texto: 'Escada além do arquivo', executar: () => { this.fechar(); (this.scene.get('FarmScene') as FarmScene).entrarProfundezas(); } });
    } else if (pagina === 'opcoes') {
      const v = estado.preferencias.valores;
      const alterar = (fn: () => void) => { fn(); const i = this.cursor; const t = this.topo; const salvo = estado.preferencias.salvar(); this.abrir('opcoes'); this.cursor = i; this.topo = t; if (!salvo) this.mensagem = 'Opcoes aplicadas; nao foi possivel salvar.'; this.desenhar(); };
      this.opcoes = [
        { texto: 'Tela cheia: alternar', executar: () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen() },
        { texto: `Tempo do mundo: ${v.tempo}x`, executar: () => alterar(() => { v.tempo = v.tempo === 0.5 ? 1 : v.tempo === 1 ? 2 : 0.5; }) },
        { texto: `Movimento reduzido: ${v.movimentoReduzido ? 'sim' : 'nao'}`, executar: () => alterar(() => { v.movimentoReduzido = !v.movimentoReduzido; }) },
        { texto: `Particulas: ${v.particulas ? 'sim' : 'nao'}`, executar: () => alterar(() => { v.particulas = !v.particulas; }) },
        { texto: `Retratos ilustrados: ${v.retratos ? 'sim' : 'não'}`, executar: () => alterar(() => { v.retratos = !v.retratos; }) },
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
      this.mensagem = `Dia ${estado.dia + 1} | ${estado.progressao.total}/10 conquistas\n${p.descobertos.length} itens descobertos | ${p.trabalhos} trabalhos\n${estado.relacoes.listaInteragidos().length} moradores conhecidos\n${estado.arquivo.quantas}/${TOTAL_DOCUMENTOS} documentos arquivados`;
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
  private entrar(): void {
    this.fechar();
    const pendente = cenaPendente(estado);
    if (pendente && (pendente.id === 'prologo' || estado.worldEvents.obter('campanha:ativa') === pendente.id))
      (this.scene.get('FarmScene') as FarmScene).iniciarCenaCampanha(pendente.id);
  }
  private falhaSave(): void { this.mensagem = 'Não foi possível gravar. Libere espaço no navegador e tente novamente. Seus dados anteriores foram preservados.'; this.desenhar(); }
  private confirmar(titulo: string, mensagem: string, executar: () => void, retorno: Pagina): void {
    this.pagina = 'confirmar'; this.titulo = titulo; this.mensagem = mensagem; this.cursor = 0; this.topo = 0;
    this.opcoes = [{ texto: 'Cancelar', executar: () => this.abrir(retorno) }, { texto: 'Confirmar', executar }]; this.desenhar();
  }
  private desenhar(): void {
    this.previaId++;
    if (this.texturaPrevia) { this.textures.remove(this.texturaPrevia); this.texturaPrevia = ''; }
    this.raiz.removeAll(true);
    if (this.pagina === 'titulo') { this.desenharTitulo(); return; }
    if (this.pagina === 'carregar' || this.pagina === 'salvar') { this.desenharPartidas(); return; }
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
        const diaDoQuadro = estado.dia - d.diaEstacao + i + 1;
        const encontro = encontroDoDia(diaDoQuadro);
        // Aniversario de quem o jogador ja conhece, e o dele proprio, no mesmo quadro.
        const conhecidos = estado.relacoes.listaInteragidos();
        const temAniversario = aniversariantesDoDia(diaDoQuadro).some(npc => conhecidos.includes(npc));
        const meu = ehAniversario(ANIVERSARIO_PROTAGONISTA, diaDoQuadro);
        texte(x + 4, y, `${i + 1}${encontro?.diaDaEstacao ? '*' : ''}${meu ? '+' : temAniversario ? '°' : ''}`);
      }
      const hoje = encontroDoDia(estado.dia);
      texte(44, 221, hoje ? `${hoje.nome} · ${Math.floor(hoje.inicio / 60)}h–${Math.floor(hoje.fim / 60)}h` : '* Encontro comunitário   ° Aniversário   + O meu', UI.tamanhoMiudo);
      const aniversariantes = aniversariantesDoDia(estado.dia).filter(npc => estado.relacoes.listaInteragidos().includes(npc));
      const sabem = quemSabeDoMeuAniversario(estado).length;
      texte(44, 239, meuAniversarioHoje(estado.dia)
        ? `Hoje é o meu aniversário. ${sabem ? `${sabem} pessoa(s) sabem da data.` : 'Ninguém aqui sabe a data.'}`
        : aniversariantes.length ? `Aniversário hoje: ${aniversariantes.join(', ')}` : `Meu aniversário: ${dataLegivel(ANIVERSARIO_PROTAGONISTA)}`, UI.tamanhoMiudo);
    } else {
      const conversa = this.pagina === 'mensagens' && !!this.mensagem;
      this.opcoes.slice(this.topo, this.topo + 6).forEach((op, n) => {
        const i = n + this.topo, y = (conversa ? 205 : 68) + n * 23;
        const fundo = this.add.rectangle(240, y + 8, 392, 21, i === this.cursor ? COR.foco : COR.fundo).setInteractive({ useHandCursor: true });
        fundo.on('pointerdown', () => { this.cursor = i; op.executar(); }); this.raiz.add(fundo);
        texte(53, y, `${i === this.cursor ? '> ' : '  '}${op.texto}`);
      });
      if (this.mensagem) texte(44, conversa ? 70 : this.opcoes.length ? 212 : 74, this.mensagem, conversa ? UI.tamanho : this.opcoes.length ? UI.tamanhoMiudo : UI.tamanhoFala, COR.fraco);
    }
    const rodape = this.opcoes.some(o => o.ajustar)
        ? '[Esc/B] Voltar   [<>] Ajustar   [E/A] Escolher'
        : '[Esc/B] Voltar   [E/A] Escolher   [setas] Navegar';
    const footer = texte(44, 249, rodape, UI.tamanho);
    footer.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.voltar());
  }
  private desenharTitulo(): void {
    this.climaTitulo = desenharTelaInicial(this, this.raiz);
    const texto = (x: number, y: number, t: string, size: string, color: string) => {
      const o = this.add.text(x, y, t, { fontFamily: UI.fonte, fontSize: size, color, wordWrap: { width: 208 }, lineSpacing: 3 }); this.raiz.add(o); return o;
    };
    texto(26, 27, 'MEU JOGO', '24px', '#dddaca');
    texto(28, 61, 'A vida tranquila veio depois.', '10px', '#a7b5b3');
    this.opcoes.forEach((op, i) => {
      const y = 99 + i * 21;
      if (i === this.cursor) this.raiz.add(this.add.rectangle(122, y + 6, 202, 20, 0x425353, .58));
      texto(28, y, `${i === this.cursor ? '› ' : '  '}${op.texto}`, '12px', i === this.cursor ? '#f0dfb4' : '#a8b4b7')
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.cursor = i; op.executar(); });
    });
    texto(28, 234, this.mensagem, '9px', '#859797');
    texto(294, 253, 'Setas · Enter · clique', '9px', '#a2afad');
  }
  private desenharPartidas(): void {
    const texto = (x: number, y: number, t: string, width: number, size = '10px', color = COR.texto) => {
      const o = this.add.text(x, y, t, { fontFamily: UI.fonte, fontSize: size, color, wordWrap: { width }, lineSpacing: 2 }); this.raiz.add(o); return o;
    };
    this.raiz.add(this.add.rectangle(240, 135, 480, 270, 0x101c23));
    texto(20, 16, this.titulo, 440, '18px');
    this.partidas.forEach((p, i) => {
      const y = 49 + i * 29;
      const b = this.add.rectangle(125, y + 12, 214, 27, i === this.cursor ? 0x344b4c : 0x1b2b32).setInteractive({ useHandCursor: true });
      this.raiz.add(b); b.on('pointerdown', () => { if (this.cursor !== i) { this.cursor = i; this.desenhar(); } else this.opcoes[i]?.executar(); });
      texto(25, y + 2, `${p.nome} · ${p.estado === 'disponivel' ? p.data : p.estado === 'vazio' ? 'Vazio' : p.estado === 'incompativel' ? 'Incompatível' : 'Danificado'}`, 201, '9px');
    });
    const p = this.partidas[this.cursor];
    this.raiz.add(this.add.rectangle(353, 101, 208, 106, 0x253841).setStrokeStyle(1, 0x536667));
    if (p?.miniatura) {
      const id = this.previaId, imagem = new Image();
      imagem.onload = () => {
        if (id !== this.previaId || !this.scene.isActive()) return;
        const key = `partida-previa-${id}`; this.textures.addImage(key, imagem); this.texturaPrevia = key;
        this.raiz.add(this.add.image(353, 101, key).setDisplaySize(206, 104));
      };
      imagem.src = p.miniatura;
    } else texto(277, 95, 'Sem fotografia', 174, '10px', '#93a6a8');
    if (p?.dados) texto(249, 161, `${p.hora}\n${p.lugar}\nÚltimo marco: ${p.evento}\nTempo jogado: ${p.tempo}`, 211, '10px');
    else texto(249, 164, p?.estado === 'incompativel' ? 'Esta lembrança precisa de uma versão mais recente do jogo.' : p?.estado === 'danificado' ? 'Dados ilegíveis. O backup pode permitir a recuperação.' : 'Um espaço para guardar sua história.', 211, '11px');
    if (this.mensagem) texto(20, 228, this.mensagem, 440, '9px', '#e3c994');
    texto(20, 253, 'Esc/B: voltar · Enter/A: escolher · Clique duas vezes: escolher', 446, '9px', '#95a9a8')
      .setInteractive().on('pointerdown', () => this.voltar());
  }
}

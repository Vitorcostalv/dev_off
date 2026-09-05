/**
 * O PAINEL DE DESENVOLVIMENTO — F10.
 *
 * ELE NAO EXISTE NA BUILD DE PRODUCAO, e isso nao e uma flag lida em runtime: a
 * cena so entra na lista do Phaser dentro de um `if (import.meta.env.DEV)` em
 * main.ts, entao o empacotador remove o modulo inteiro do bundle publicado. Uma
 * flag verificada em execucao deixaria o codigo do painel no arquivo servido, e
 * bastaria um `window` bem escolhido pra abrir. Aqui nao ha o que abrir.
 *
 * ---------------------------------------------------------------------------
 * TELEPORTE E PROGRESSAO SAO COISAS SEPARADAS
 * ---------------------------------------------------------------------------
 * A Parte 48 e explicita, e a regra vale pro painel inteiro: ir pro andar 100
 * NAO destrava a parada do elevador do 100, NAO resolve o enigma dele e NAO
 * recolhe o documento. Sao itens de menu diferentes. Juntar as tres faria a
 * ferramenta de teste corromper o progresso de quem esta testando outra coisa —
 * que e o jeito mais rapido de uma ferramenta produzir um bug que nao existe.
 *
 * Toda acao que mexe em progressao de verdade pede DOIS Enter, e o segundo vem
 * depois de a acao dizer, por escrito, o que vai fazer.
 *
 * ---------------------------------------------------------------------------
 * COMO ELE E OPERADO
 * ---------------------------------------------------------------------------
 * Teclado, porque a tela tem 480x270 e um painel de mouse com campo de texto nao
 * cabe sem cobrir o jogo inteiro:
 *
 *   F10 / ESC   abre e fecha (e PAUSA o mundo enquanto esta aberto)
 *   Q / E       troca de aba
 *   cima/baixo  andam na lista
 *   esq/dir     ajustam o valor do item selecionado (com Shift, de dez em dez)
 *   Enter       executa
 */

import Phaser from 'phaser';
import { CONFIG } from '../game/config';
import { COR, ESPACO } from '../game/tema';
import * as ui from './ui';
import { estado } from '../game/estado';
import {
  ANDARES,
  ANDARES_DE_PARADA,
  ANDARES_TOTAIS,
  SECOES_DE_ARQUIVO,
  buscarAndar,
  flagDeCheckpoint,
} from '../game/andares';
import { flagDoEnigma } from '../game/enigmas';
import { ITENS } from '../game/inventario';
import { NPCS } from '../game/npcs';
import { MORADORES } from '../game/moradores';
import { tempoDoDia } from '../game/clima';
import { formatarDinheiro } from '../game/dinheiro';
import type { FarmScene } from './FarmScene';

/** Um item de menu. `ajustar` presente = o item tem valor e responde as setas. */
interface ItemDev {
  rotulo: string;
  valor?: () => string;
  executar?: () => string | void;
  ajustar?: (passo: number) => void;
  /** texto do primeiro Enter, pra acao que mexe em progressao real */
  perigo?: string;
}

const PAINEL = { x: 8, y: 8, w: CONFIG.largura - 16, h: CONFIG.altura - 16 };
const LISTA = { x: 88, y: 30, linhas: 11, altura: 15 };

const NOMES_DE_ABA = [
  'JOGADOR', 'MUNDO', 'REPRESA', 'ITENS', 'NPCS', 'ARQUIVO', 'DEBUG', 'SAVE',
] as const;

export class DevScene extends Phaser.Scene {
  private aberto = false;
  private abaAtual = 0;
  private cursor = 0;
  private topo = 0;
  private aviso = '';
  private confirmando: string | null = null;

  /** Fotografia do save. So em memoria — o localStorage nao e tocado. */
  private instantaneo: string | null = null;

  private fundo!: Phaser.GameObjects.Graphics;
  private tituloTexto!: Phaser.GameObjects.Text;
  private abasTexto: Phaser.GameObjects.Text[] = [];
  private linhas: { rotulo: Phaser.GameObjects.Text; valor: Phaser.GameObjects.Text }[] = [];
  private avisoTexto!: Phaser.GameObjects.Text;
  private raiz!: Phaser.GameObjects.Container;

  private andarAlvo = 1;
  private itemIndice = 0;
  private npcIndice = 0;
  private quantidade = 1;

  constructor() {
    super('DevScene');
  }

  private get mundo(): FarmScene | null {
    const cena = this.scene.get('FarmScene') as FarmScene | undefined;
    if (!cena) return null;
    // PAUSADA tambem vale: abrir o painel pausa a FarmScene de proposito, e
    // exigir `isActive()` aqui fazia todo item do painel responder "a cena de
    // mundo nao esta ativa" — inclusive o teleporte, que e o motivo de o painel
    // existir. O que se quer barrar e a cena ainda nao criada.
    return cena.scene.isActive() || cena.scene.isPaused() ? cena : null;
  }

  create(): void {
    this.raiz = this.add.container(0, 0).setDepth(400).setScrollFactor(0);
    this.fundo = this.add.graphics().setScrollFactor(0);
    this.raiz.add(this.fundo);

    this.tituloTexto = ui.titulo(this, PAINEL.x + 12, PAINEL.y + 5, 'DEV');
    this.raiz.add(this.tituloTexto);

    for (let i = 0; i < NOMES_DE_ABA.length; i++) {
      const t = ui.nota(this, PAINEL.x + 10, LISTA.y + i * 13, '');
      this.abasTexto.push(t);
      this.raiz.add(t);
    }
    for (let i = 0; i < LISTA.linhas; i++) {
      const y = LISTA.y + i * LISTA.altura;
      const rotulo = ui.corpo(this, LISTA.x, y, '');
      const valor = ui.corpo(this, PAINEL.x + PAINEL.w - 12, y, '').setOrigin(1, 0);
      this.linhas.push({ rotulo, valor });
      this.raiz.add(rotulo);
      this.raiz.add(valor);
    }
    this.avisoTexto = ui.miudo(
      this, LISTA.x, PAINEL.y + PAINEL.h - 32, '', PAINEL.w - 96, COR.lataoVivoTexto,
    );
    this.raiz.add(this.avisoTexto);
    this.raiz.add(
      ui.nota(
        this, PAINEL.x + 12, PAINEL.y + PAINEL.h - 14,
        '[Q/E] aba  [setas] mover e ajustar  [Enter] executar  [F10] fechar',
      ),
    );
    this.raiz.setVisible(false);

    const teclado = this.input.keyboard;
    teclado?.on('keydown-F10', () => this.alternar());
    teclado?.on('keydown-ESC', () => {
      if (this.aberto) this.alternar();
    });
    teclado?.on('keydown-UP', () => this.mover(-1));
    teclado?.on('keydown-DOWN', () => this.mover(1));
    teclado?.on('keydown-LEFT', (e: KeyboardEvent) => this.ajustar(-1, e));
    teclado?.on('keydown-RIGHT', (e: KeyboardEvent) => this.ajustar(1, e));
    teclado?.on('keydown-Q', () => this.trocarAba(-1));
    teclado?.on('keydown-E', () => this.trocarAba(1));
    teclado?.on('keydown-ENTER', () => this.executar());
  }

  // -------------------------------------------------------------- estado --
  private alternar(): void {
    this.aberto = !this.aberto;
    this.raiz.setVisible(this.aberto);
    this.confirmando = null;
    this.aviso = '';
    // PAUSA o mundo: mexer no dinheiro com o relogio andando e um inimigo
    // atravessando a tela nao e teste, e duas coisas acontecendo ao mesmo tempo.
    if (this.aberto) {
      this.scene.pause('FarmScene');
      this.scene.pause('UIScene');
      this.desenhar();
    } else {
      this.scene.resume('FarmScene');
      this.scene.resume('UIScene');
    }
  }

  private get itens(): ItemDev[] {
    switch (this.abaAtual) {
      case 0: return this.abaJogador();
      case 1: return this.abaMundo();
      case 2: return this.abaRepresa();
      case 3: return this.abaItens();
      case 4: return this.abaNpcs();
      case 5: return this.abaArquivo();
      case 6: return this.abaDepuracao();
      default: return this.abaSave();
    }
  }

  private trocarAba(passo: number): void {
    if (!this.aberto) return;
    this.abaAtual = (this.abaAtual + passo + NOMES_DE_ABA.length) % NOMES_DE_ABA.length;
    this.cursor = 0;
    this.topo = 0;
    this.aviso = '';
    this.confirmando = null;
    this.desenhar();
  }

  private mover(passo: number): void {
    if (!this.aberto) return;
    const total = this.itens.length;
    this.cursor = Math.min(total - 1, Math.max(0, this.cursor + passo));
    this.topo = Math.min(this.topo, this.cursor);
    this.topo = Math.max(this.topo, this.cursor - LISTA.linhas + 1);
    this.confirmando = null;
    this.desenhar();
  }

  private ajustar(passo: number, evento?: KeyboardEvent): void {
    if (!this.aberto) return;
    evento?.preventDefault();
    const item = this.itens[this.cursor];
    if (!item?.ajustar) return;
    item.ajustar(passo * (evento?.shiftKey ? 10 : 1));
    this.desenhar();
  }

  private executar(): void {
    if (!this.aberto) return;
    const item = this.itens[this.cursor];
    if (!item?.executar) return;
    if (item.perigo && this.confirmando !== item.rotulo) {
      this.confirmando = item.rotulo;
      this.aviso = `${item.perigo}. Enter de novo pra confirmar.`;
      this.desenhar();
      return;
    }
    this.confirmando = null;
    this.aviso = item.executar() || 'feito.';
    this.desenhar();
  }

  // ------------------------------------------------------------- desenho --
  private desenhar(): void {
    const itens = this.itens;
    this.fundo.clear();
    ui.painel(this.fundo, PAINEL);
    // tarja vermelha no canto: e o lembrete visual de que a build e de dev
    this.fundo.fillStyle(COR.alerta, 0.85);
    this.fundo.fillRect(PAINEL.x + PAINEL.w - 44, PAINEL.y + 5, 36, 10);
    ui.divisoria(this.fundo, PAINEL.x + 8, PAINEL.x + PAINEL.w - 8, PAINEL.y + ESPACO.cabecalho + 2);
    this.fundo.lineStyle(1, COR.madeira, 0.8);
    this.fundo.beginPath();
    this.fundo.moveTo(LISTA.x - 12.5, LISTA.y - 4);
    this.fundo.lineTo(LISTA.x - 12.5, PAINEL.y + PAINEL.h - 36);
    this.fundo.strokePath();

    this.tituloTexto.setText(`DEV  ·  ${NOMES_DE_ABA[this.abaAtual]}`);

    this.abasTexto.forEach((t, i) => {
      const ativa = i === this.abaAtual;
      t.setText(`${ativa ? '>' : ' '} ${NOMES_DE_ABA[i]}`);
      t.setColor(ativa ? COR.lataoVivoTexto : COR.papelFracoTexto);
    });

    this.linhas.forEach((linha, i) => {
      const item = itens[this.topo + i];
      if (!item) {
        linha.rotulo.setText('');
        linha.valor.setText('');
        return;
      }
      const ativo = this.topo + i === this.cursor;
      linha.rotulo.setText(`${ativo ? '>' : ' '} ${item.rotulo}`);
      linha.rotulo.setColor(ativo ? COR.lataoVivoTexto : COR.papelTexto);
      linha.valor.setText(item.valor ? item.valor() : '');
      linha.valor.setColor(ativo ? COR.lataoVivoTexto : COR.papelFracoTexto);
    });

    this.avisoTexto.setText(this.aviso);
    this.avisoTexto.setColor(this.confirmando ? COR.alertaTexto : COR.lataoVivoTexto);
  }

  // ------------------------------------------------------------ ajudantes --
  private levarPara(mapa: string, x?: number, y?: number): string {
    const mundo = this.mundo;
    if (!mundo) return 'a cena de mundo nao esta ativa.';
    this.alternar();
    mundo.teleportarDev(mapa, x, y);
    return '';
  }

  private listaDeItens(): string[] {
    return Object.keys(ITENS);
  }

  private listaDeNpcs(): string[] {
    return [...Object.keys(NPCS), ...Object.keys(MORADORES)];
  }

  // ------------------------------------------------------------ conteudo --
  private abaJogador(): ItemDev[] {
    return [
      {
        rotulo: 'Vida',
        valor: () => `${estado.vida.hp}/${estado.vida.maxHp}`,
        ajustar: (p) => {
          if (p > 0) estado.vida.curar(p);
          else estado.vida.definir(Math.max(0, estado.vida.hp + p));
        },
      },
      { rotulo: 'Curar tudo', executar: () => { estado.vida.restaurarTudo(); return 'vida cheia.'; } },
      {
        rotulo: 'Matar o jogador',
        perigo: 'Isto roda a derrota de verdade: hospital, +4h, metade do salvado',
        executar: () => {
          this.alternar();
          this.mundo?.matarJogadorDev();
          return '';
        },
      },
      {
        rotulo: 'Dinheiro',
        valor: () => formatarDinheiro(estado.carteira.saldo),
        ajustar: (p) => {
          const passo = p * 1000;
          if (passo > 0) estado.carteira.ganhar(passo);
          else estado.carteira.gastar(Math.min(estado.carteira.saldo, -passo));
        },
      },
      {
        rotulo: 'Zerar dinheiro',
        executar: () => {
          estado.carteira.gastar(estado.carteira.saldo);
          return 'saldo zerado.';
        },
      },
      {
        rotulo: 'Dia',
        valor: () => String(estado.dia),
        ajustar: (p) => { estado.dia = Math.max(0, estado.dia + p); },
      },
      {
        rotulo: 'Hora',
        valor: () => estado.relogio.texto,
        ajustar: (p) => estado.relogio.avancarMinutos(p * 30),
      },
      {
        rotulo: 'Tempo de hoje (sai da data, nao se ajusta)',
        valor: () => tempoDoDia(estado.dia).nome,
      },
      {
        rotulo: 'Guardar o que esta na mao',
        executar: () => {
          for (const slot of ['mao', 'acessorio', 'utilitario'] as const) {
            estado.equipamento.desequipar(slot);
          }
          return 'maos vazias.';
        },
      },
    ];
  }

  private abaMundo(): ItemDev[] {
    const destinos: [string, string][] = [
      ['Mapa 1 — cidade', 'farm'],
      ['Mapa 2 — bairro', 'bairro'],
      ['Mapa 3 — rural', 'rural'],
      ['Mapa 4 — represa', 'represa'],
      ['Hospital', 'hospital'],
    ];
    return destinos.map(([nome, chave]) => ({
      rotulo: `Ir para ${nome}`,
      executar: () => this.levarPara(chave),
    }));
  }

  private abaRepresa(): ItemDev[] {
    const def = buscarAndar(this.andarAlvo);
    return [
      {
        rotulo: 'Andar alvo',
        valor: () => `${this.andarAlvo}  ${def?.rotulo ?? ''}`,
        ajustar: (p) => {
          this.andarAlvo = Math.min(ANDARES_TOTAIS, Math.max(1, this.andarAlvo + p));
        },
      },
      {
        rotulo: 'Teleportar — chegada do andar',
        executar: () => (def ? this.levarPara(def.mapa, def.entrada.x, def.entrada.y) : 'andar invalido.'),
      },
      {
        rotulo: 'Teleportar — parada do elevador',
        executar: () => (def
          ? this.levarPara(def.mapa, def.paradaTile.x, def.paradaTile.y)
          : 'andar invalido.'),
      },
      {
        rotulo: 'Destravar a parada DESTE andar',
        valor: () => (def?.parada
          ? (estado.worldEvents.ativa(flagDeCheckpoint(this.andarAlvo)) ? 'ok' : 'travada')
          : 'nao e parada'),
        perigo: 'Isto mexe em progressao de verdade',
        executar: () => {
          if (!def?.parada) return `o andar ${this.andarAlvo} nao e parada de elevador.`;
          estado.worldEvents.definir(flagDeCheckpoint(this.andarAlvo), true);
          return `parada do andar ${this.andarAlvo} destravada.`;
        },
      },
      {
        rotulo: 'Destravar TODAS as paradas',
        perigo: `Isto destrava as ${ANDARES_DE_PARADA.length} paradas do save atual`,
        executar: () => {
          for (const n of ANDARES_DE_PARADA) estado.worldEvents.definir(flagDeCheckpoint(n), true);
          return `${ANDARES_DE_PARADA.length} paradas destravadas.`;
        },
      },
      {
        rotulo: 'Resolver o enigma DESTE andar',
        valor: () => (estado.worldEvents.ativa(flagDoEnigma(this.andarAlvo)) ? 'resolvido' : 'aberto'),
        perigo: 'Isto abre a descida do andar',
        executar: () => {
          estado.worldEvents.definir(flagDoEnigma(this.andarAlvo), true);
          return `enigma do andar ${this.andarAlvo} marcado como resolvido.`;
        },
      },
      {
        rotulo: 'Resolver os enigmas ATE este andar',
        perigo: 'Isto abre a descida inteira ate o andar alvo',
        executar: () => {
          for (let a = 1; a <= this.andarAlvo; a++) {
            estado.worldEvents.definir(flagDoEnigma(a), true);
          }
          return `enigmas 1 a ${this.andarAlvo} resolvidos.`;
        },
      },
      {
        rotulo: 'Recolher o documento DESTE andar',
        valor: () => (estado.arquivo.tem(this.andarAlvo) ? 'recolhido' : '—'),
        perigo: 'Isto mexe no arquivo do save',
        executar: () => {
          estado.arquivo.coletar(this.andarAlvo);
          return `documento do andar ${this.andarAlvo} arquivado.`;
        },
      },
    ];
  }

  private abaItens(): ItemDev[] {
    const lista = this.listaDeItens();
    const id = lista[Math.min(lista.length - 1, Math.max(0, this.itemIndice))] ?? '';
    const def = ITENS[id];
    return [
      {
        rotulo: 'Item',
        valor: () => `${def?.nome ?? '—'} (${this.itemIndice + 1}/${lista.length})`,
        ajustar: (p) => {
          this.itemIndice = Math.min(lista.length - 1, Math.max(0, this.itemIndice + p));
        },
      },
      {
        rotulo: 'Quantidade',
        valor: () => String(this.quantidade),
        // nunca negativa: pilha negativa e save corrompido, nao teste
        ajustar: (p) => { this.quantidade = Math.min(999, Math.max(1, this.quantidade + p)); },
      },
      {
        rotulo: 'Adicionar ao inventario',
        executar: () => {
          const sobrou = estado.inventario.adicionar(id, this.quantidade);
          return sobrou > 0 ? `nao coube ${sobrou}: mochila cheia.` : `+${this.quantidade} ${def?.nome}.`;
        },
      },
      {
        rotulo: 'Remover do inventario',
        executar: () => {
          const tirou = estado.inventario.remover(id, this.quantidade);
          return `-${tirou} ${def?.nome}.`;
        },
      },
      {
        rotulo: 'Remover TODOS deste item',
        executar: () => `${estado.inventario.remover(id, estado.inventario.contar(id))} removido(s).`,
      },
      {
        rotulo: 'Organizar a mochila',
        executar: () => { estado.inventario.organizar(); return 'organizada.'; },
      },
      {
        rotulo: 'Esvaziar a mochila',
        perigo: 'Isto apaga o inventario do save atual',
        executar: () => {
          for (const slot of [...estado.inventario.slots]) {
            if (slot) estado.inventario.remover(slot.id, slot.qtd);
          }
          for (const s of ['mao', 'acessorio', 'utilitario'] as const) estado.equipamento.desequipar(s);
          return 'mochila vazia.';
        },
      },
    ];
  }

  private abaNpcs(): ItemDev[] {
    const lista = this.listaDeNpcs();
    const id = lista[Math.min(lista.length - 1, Math.max(0, this.npcIndice))] ?? '';
    return [
      {
        rotulo: 'NPC',
        valor: () => `${id} (${this.npcIndice + 1}/${lista.length})`,
        ajustar: (p) => {
          this.npcIndice = Math.min(lista.length - 1, Math.max(0, this.npcIndice + p));
        },
      },
      { rotulo: 'Onde esta agora', valor: () => this.mundo?.ondeEstaDev(id) ?? '—' },
      { rotulo: 'Animacao / direcao', valor: () => this.mundo?.animacaoDev(id) ?? '—' },
      {
        rotulo: 'Amizade',
        valor: () => `${estado.relacoes.getScore(id)}  ${estado.relacoes.getRotulo(id)}`,
        ajustar: (p) => {
          if (p > 0) estado.relacoes.ganharRelacao(id, p);
          else estado.relacoes.perderRelacao(id, -p);
        },
      },
      {
        rotulo: 'Levar o jogador ate ele',
        executar: () => this.mundo?.irAteNpcDev(id) ?? 'a cena de mundo nao esta ativa.',
      },
      {
        rotulo: 'Adiantar uma hora (mexe a rotina de todos)',
        executar: () => {
          estado.relogio.avancarMinutos(60);
          return `relogio em ${estado.relogio.texto}.`;
        },
      },
    ];
  }

  private abaArquivo(): ItemDev[] {
    const itens: ItemDev[] = SECOES_DE_ARQUIVO.map((secao) => ({
      rotulo: `Recolher ${secao.nome} (${secao.faixa[0]}-${secao.faixa[1]})`,
      valor: () => `${estado.arquivo.quantasNaSecao(secao.id)}/50`,
      perigo: 'Isto mexe no arquivo do save',
      executar: () => {
        for (let a = secao.faixa[0]; a <= secao.faixa[1]; a++) estado.arquivo.coletar(a);
        return `secao ${secao.nome} recolhida.`;
      },
    }));
    itens.push({
      rotulo: 'Esvaziar o arquivo',
      valor: () => `${estado.arquivo.quantas}/150`,
      perigo: 'Isto apaga as folhas ja recolhidas',
      executar: () => {
        estado.arquivo.restaurar([]);
        return 'arquivo vazio.';
      },
    });
    return itens;
  }

  private abaDepuracao(): ItemDev[] {
    const alternavel = (
      chave: 'corpos' | 'aggro' | 'congelado' | 'inspecionarNpc',
      rotulo: string,
    ): ItemDev => ({
      rotulo,
      valor: () => (this.mundo?.depuracaoDev(chave) ? 'ligado' : 'desligado'),
      executar: () => {
        this.mundo?.alternarDepuracaoDev(chave);
        return '';
      },
    });
    return [
      alternavel('corpos', 'Caixas de colisao'),
      alternavel('aggro', 'Raio de deteccao dos inimigos'),
      alternavel('congelado', 'Congelar a IA dos inimigos'),
      alternavel('inspecionarNpc', 'Ficha do NPC ao clicar nele'),
      {
        rotulo: 'Limpar os inimigos deste andar',
        executar: () => this.mundo?.limparInimigosDev() ?? 'a cena de mundo nao esta ativa.',
      },
      {
        rotulo: 'Mostrar a resposta do painel deste andar',
        executar: () => this.mundo?.respostaDoPainelDev() ?? 'a cena de mundo nao esta ativa.',
      },
    ];
  }

  private abaSave(): ItemDev[] {
    return [
      {
        rotulo: 'Guardar instantaneo (so na memoria)',
        valor: () => (this.instantaneo ? 'tem um guardado' : 'vazio'),
        executar: () => {
          const dados = this.mundo?.saveDev();
          if (!dados) return 'a cena de mundo nao esta ativa.';
          this.instantaneo = JSON.stringify(dados);
          return 'instantaneo guardado.';
        },
      },
      {
        rotulo: 'Restaurar instantaneo',
        perigo: 'Isto sobrescreve o estado atual em memoria',
        executar: () => {
          if (!this.instantaneo) return 'nao ha instantaneo guardado.';
          const mundo = this.mundo;
          if (!mundo) return 'a cena de mundo nao esta ativa.';
          this.alternar();
          mundo.restaurarDev(JSON.parse(this.instantaneo));
          return '';
        },
      },
      {
        rotulo: 'Gravar no localStorage',
        perigo: 'Isto sobrescreve o save de verdade',
        executar: () => `gravado: ${this.mundo?.salvarDev() ? 'ok' : 'falhou'}.`,
      },
      { rotulo: 'Mapa atual', valor: () => estado.mapa },
      { rotulo: 'Andar mais fundo alcancado', valor: () => String(estado.represa.andarMaisFundo) },
      {
        rotulo: 'Paradas destravadas',
        valor: () => {
          const n = ANDARES_DE_PARADA.filter((a) => estado.worldEvents.ativa(flagDeCheckpoint(a))).length;
          return `${n}/${ANDARES_DE_PARADA.length}`;
        },
      },
      {
        rotulo: 'Enigmas resolvidos',
        valor: () => {
          let n = 0;
          for (let a = 1; a <= ANDARES_TOTAIS; a++) {
            if (estado.worldEvents.ativa(flagDoEnigma(a))) n++;
          }
          return `${n}/${ANDARES_TOTAIS}`;
        },
      },
      { rotulo: 'Andares no registro', valor: () => String(ANDARES.length) },
    ];
  }
}

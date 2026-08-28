import Phaser from 'phaser';
import { PROP_COLIDE } from '../game/colisao';
import { CONFIG, COR_ZONA, ROTULOS, UI } from '../game/config';
import { estado } from '../game/estado';
import { ITENS } from '../game/inventario';
import { lojasDoMapa } from '../game/loja';
import { buscarMapa } from '../game/mapas';
import { buscarNpc, LOCAIS_CIDADE } from '../game/npcs';
import { CONFIG_TEMPO } from '../game/relogio';
import type { EstadoNpc } from '../game/rotinasNpc';
import { apagar, salvar } from '../game/save';
import { USOS_DE_MORADIA, falasDe } from '../game/tipos';
import type {
  Direcao,
  Interagivel,
  PropObjeto,
  TipoInteragivel,
  TipoZona,
  UsoZona,
  ZonaReservada,
} from '../game/tipos';
import type { UIScene } from './UIScene';

/**
 * Quantos tiles cabem na largura da tela. E daqui que sai o zoom da camera:
 * o campo de visao fica fixo em tiles, entao mudar o tamanho do tile no
 * gerador nao muda o que o jogador ve — so a densidade de pixel da arte.
 */
const TILES_VISIVEIS_X = 15;
/** Altura do player em TILES (fica 1,5 tile, como antes). */
const ALTURA_PERSONAGEM_TILES = 1.5;
// Hitbox do player, em px do RECORTE (o frame tem 200x320), nao do mundo:
// o Arcade multiplica tanto setSize quanto setOffset pela escala do sprite
// (Body.js: `width = sourceWidth * _sx`, `position.x = ... + scaleX * offset.x`).
// Por isso estes quatro numeros nao mudam quando o tile muda de tamanho.
const CORPO_LARGURA = 70;
const CORPO_ALTURA = 50;
const CORPO_OFFSET_X = 65;
const CORPO_OFFSET_Y = 265;

/**
 * Altura desejada de cada estagio de arvore, em TILES. A escala do sprite sai
 * daqui dividido pela altura real do frame, entao a arte pode mudar de
 * resolucao sem mexer no jogo.
 */
const ALTURA_ARVORE = [0.7, 1.0, 1.5, 2.4, 2.4];
/** Idem para as flores (o estagio 0 e o mais aberto). */
const ALTURA_FLOR = [0.8, 0.7, 0.6, 0.5, 0.35, 0.5];
/** Do estagio 2 pra cima a arvore ja tem tronco que barra o player. */
const ARVORE_COLIDE_A_PARTIR_DE = 2;
/** Tronco: caixa de colisao na base do sprite, em TILES. */
const TRONCO_TILES = { largura: 0.56, altura: 0.375 };
/** Pedra menor que isto (em tiles de altura) e pedrisco: nao barra o player. */
const PEDRA_COLIDE_ACIMA_DE = 0.45;
/**
 * Caixa da pedra, como fracao do TAMANHO DO SPRITE (nao em tiles fixos como o
 * tronco): as pedras vao de pedrisco a matacao, entao a base acompanha cada uma.
 */
const PEDRA_CORPO = { largura: 0.78, altura: 0.34 };
/**
 * Caixa do movel de interior, tambem fracao do sprite. Mais funda que a da
 * pedra: gondola e balcao sao moveis de encostar, nao de passar atras.
 */
const MOVEL_CORPO = { largura: 0.92, altura: 0.5 };
/** Overlay de debug: acima de qualquer sprite ordenado por y. */
const DEPTH_OVERLAY = 100000;

const VETOR: Record<Direcao, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// 'loja' NAO entra: nenhum tilemap traz objeto dessa classe hoje. Os pontos de
// loja sao acrescentados depois da leitura, a partir de PONTOS_DE_LOJA — ver o
// cabecalho de src/game/loja.ts, que documenta a pendencia de ligacao.
const TIPOS_VALIDOS: TipoInteragivel[] = ['placa', 'npc', 'porta', 'cama', 'item'];
const TIPOS_ZONA_VALIDOS: TipoZona[] = [
  'casa', 'mercado', 'academia', 'parque', 'bar', 'farmacia',
];
const USOS_ZONA_VALIDOS: UsoZona[] = ['moradia', 'comercio', 'misto', 'praca'];

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclas!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private correr!: Phaser.Input.Keyboard.Key;
  private direcao: Direcao = 'down';

  private interagiveis: Interagivel[] = [];
  private alvo: Interagivel | null = null;
  private npcs: NpcVisual[] = [];
  private visuaisDeItens = new Map<string, Phaser.GameObjects.Rectangle>();
  /** areas reservadas pros predios da proxima etapa; sem colisao */
  private zonas: ZonaReservada[] = [];
  /** demarcacao das zonas na tela (F6); null = escondida */
  private overlayZonas: Phaser.GameObjects.Container | null = null;
  /** caixas de colisao dos obstaculos (a copa fica livre, pra andar atras) */
  private obstaculos: Phaser.GameObjects.Zone[] = [];
  /** trava o input durante fades (dormir, trocar de mapa) */
  private transicionando = false;
  /** mapa da cidade aberto pelo jogador com M. */
  private mapaAberto = false;
  private overlayMapa: Phaser.GameObjects.Container | null = null;
  private marcadorPlayer: Phaser.GameObjects.Arc | null = null;
  private marcadoresNpc: Phaser.GameObjects.Arc[] = [];
  private transformMapa = { x: 0, y: 0, escala: 1 };
  /**
   * Tamanho do tile lido do proprio tilemap. Escala do player, da flora, zoom
   * da camera e alcance de interacao saem daqui — assim trocar o tile no
   * `gerar-assets.mjs` nao deixa nenhum numero desatualizado do lado do jogo.
   */
  private tamanhoTile = 32;
  /** de onde o player entrou neste mapa; null = usa o spawn padrao */
  private spawn: { x: number; y: number } | null = null;
  /**
   * Tiles dos comodos marcados `privado` na camada `comodos` do mapa atual,
   * como "tx,ty". Sao os comodos atras de uma porta somente-NPC: o jogador nunca
   * chega neles (o flood-fill da conferencia prova isso), entao ele tambem nao
   * deve VER quem esta la dentro — senao o dono do bar apareceria andando por
   * cima da parede da propria moradia.
   */
  private tilesPrivados = new Set<string>();

  constructor() {
    super('FarmScene');
  }

  private get ui(): UIScene {
    return this.scene.get('UIScene') as UIScene;
  }

  /**
   * Roda a cada `scene.restart` — e onde o estado mutavel volta ao zero.
   * Campos de classe com inicializador NAO sao reexecutados no restart.
   */
  init(dados?: { mapa?: string; x?: number; y?: number }): void {
    if (dados?.mapa) estado.mapa = dados.mapa;
    this.spawn =
      dados?.x !== undefined && dados?.y !== undefined ? { x: dados.x, y: dados.y } : null;
    this.transicionando = false;
    this.mapaAberto = false;
    this.overlayMapa = null;
    this.marcadorPlayer = null;
    this.marcadoresNpc = [];
    this.interagiveis = [];
    this.npcs = [];
    this.visuaisDeItens.clear();
    this.zonas = [];
    this.overlayZonas = null;
    this.obstaculos = [];
    this.tilesPrivados = new Set();
    this.alvo = null;
  }

  /**
   * Todos os lotes do mapa atual, construidos e reservados (vazio nos mapas
   * sem a camada `zonas`).
   */
  get zonasReservadas(): readonly ZonaReservada[] {
    return this.zonas;
  }

  /** Só os lotes ainda sem construcao — o que a proxima etapa vai preencher. */
  get zonasLivres(): readonly ZonaReservada[] {
    return this.zonas.filter((z) => !z.construida);
  }

  /**
   * Lotes onde alguem pode morar: as seis casas mais os predios mistos (bar e
   * farmacia, que tem cama na metade de moradia). E a lista que o encaixe de um
   * NPC morador consulta — ver `MORADIAS` em src/game/npcs.ts.
   */
  get zonasDeMoradia(): readonly ZonaReservada[] {
    return this.zonas.filter((z) => z.moradia);
  }

  /** Acha um lote pelo id do Tiled, ex: `zonaPorId('mercado')`. */
  zonaPorId(id: string): ZonaReservada | null {
    return this.zonas.find((z) => z.id === id) ?? null;
  }

  /**
   * A porta que entra na construcao de um lote, se ele ja tiver uma. E o que
   * liga `casa_1` ao interior: a zona diz qual mapa, e este metodo acha o
   * objeto `porta` que fica dentro do lote e aponta pra esse mapa.
   */
  portaDaZona(id: string): Interagivel | null {
    const zona = this.zonaPorId(id);
    if (!zona?.mapaInterior) return null;
    return (
      this.interagiveis.find(
        (i) =>
          i.tipo === 'porta' &&
          i.props.destino === zona.mapaInterior &&
          i.x >= zona.x &&
          i.x <= zona.x + zona.largura &&
          i.y >= zona.y &&
          i.y <= zona.y + zona.altura,
      ) ?? null
    );
  }

  create(): void {
    const def = buscarMapa(estado.mapa);
    if (!def) throw new Error(`Mapa "${estado.mapa}" nao existe em MAPAS`);

    const map = this.make.tilemap({ key: def.tilemapKey });
    this.tamanhoTile = map.tileWidth;

    // 1o arg = nome do tileset DENTRO do JSON do Tiled, 2o = key carregada no BootScene.
    const tileset = map.addTilesetImage(def.tilesetNoJson, def.tilesetKey);
    if (!tileset) {
      throw new Error(`Tileset '${def.tilesetNoJson}' nao encontrado em ${def.tilemapKey}`);
    }

    const chao = map.createLayer('chao', tileset, 0, 0);
    // 'caminhos' e opcional: so os mapas externos tem malha de estradas.
    // Fica entre chao e objetos, entao a estrada cobre a grama sem cobrir nada.
    if (map.layers.some((l) => l.name === 'caminhos')) {
      map.createLayer('caminhos', tileset, 0, 0);
    }
    const objetos = map.createLayer('objetos', tileset, 0, 0);
    if (!chao || !objetos) {
      throw new Error(`Camadas chao/objetos nao encontradas em ${def.tilemapKey}`);
    }

    // Colisao do JOGADOR: vem da propriedade marcada nos tiles pelo gerador.
    // Ha uma segunda travessabilidade sobre a MESMA camada, a do NPC, em que a
    // porta somente-NPC nao bloqueia — ver src/game/colisao.ts. Ela nao precisa
    // de collider aqui porque o motor de rotinas nao usa fisica: ele anda em reta
    // entre waypoints, e sao as conferencias offline (verificar-mapas e
    // verificar-rotinas) que garantem que a rota so passa por onde o NPC pode.
    // Do lado do jogador, entao, a porta privada e parede e ponto final: andando
    // ou correndo, o collider abaixo barra do mesmo jeito.
    objetos.setCollisionByProperty({ [PROP_COLIDE]: true });

    this.interagiveis = this.lerInterativos(map).filter((item) => {
      if (item.tipo === 'npc') return false;
      return item.tipo !== 'item' || !estado.itensColetados.has(item.id);
    });
    this.interagiveis.push(...this.lerPontosDeLoja());
    this.zonas = this.lerZonas(map);
    this.tilesPrivados = this.lerComodosPrivados(map);

    const nasce =
      this.spawn ??
      {
        x: (def.spawnTile.x + 0.5) * this.tamanhoTile,
        y: (def.spawnTile.y + 0.5) * this.tamanhoTile,
      };
    this.player = this.physics.add.sprite(nasce.x, nasce.y, 'player-idle-sprites', 'down-0');
    this.configurarPersonagem(this.player);
    // hitbox menor que o sprite, so os pes -> parece melhor em top-down
    this.player.setCollideWorldBounds(true);

    this.criarNpcs();
    this.criarItensColetaveis();
    this.criarConstrucoes(map);
    this.criarMoveis(map);
    this.criarFlora(map);

    this.physics.add.collider(this.player, objetos);
    if (this.npcs.length > 0) {
      this.physics.add.collider(this.player, this.npcs.map((npc) => npc.sprite));
    }
    if (this.obstaculos.length > 0) this.physics.add.collider(this.player, this.obstaculos);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(this.zoomDeJogo());
    cam.fadeIn(220, 0, 0, 0);

    this.scene.setVisible(true, 'UIScene');
    this.ui.mostrarPrompt(null);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.teclas = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.teclas &
      Record<string, Phaser.Input.Keyboard.Key>;
    this.correr = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // M abre/fecha o mapa da cidade.
    this.input.keyboard!.on('keydown-M', () => this.alternarMapa());

    // F6 mostra/esconde a demarcacao das zonas reservadas (debug)
    this.input.keyboard!.on('keydown-F6', () => this.alternarZonas());

    // F7 avanca uma hora para inspecionar rotinas sem esperar (debug).
    this.input.keyboard!.on('keydown-F7', () => {
      estado.dia += estado.relogio.avancarMinutos(60);
      estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, 0);
      this.sincronizarNpcs();
      console.info(`[tempo] avancado para ${estado.relogio.texto}`);
    });

    // F2/F3 continuam uteis para testar capacidade sem depender do mapa.
    this.input.keyboard!.on('keydown-F2', () => estado.inventario.adicionar('cabo_usb', 1));
    this.input.keyboard!.on('keydown-F3', () => estado.inventario.adicionar('bateria', 1));

    // F9 salva na hora (debug); no jogo, quem salva e o dormir
    this.input.keyboard!.on('keydown-F9', () => {
      console.info('[save] gravado:', this.salvarJogo());
    });

    // F4 apaga o save (debug)
    this.input.keyboard!.on('keydown-F4', () => {
      apagar();
      console.info('[save] apagado');
    });

    // F1 liga/desliga o debug das colisoes
    this.input.keyboard!.on('keydown-F1', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) this.physics.world.debugGraphic?.clear();
    });
  }

  update(_tempo: number, delta: number): void {
    // reordena o player entre as arvores conforme ele anda
    this.player.setDepth(this.player.y);

    if (!this.ui.bloqueado && !this.transicionando) {
      estado.dia += estado.relogio.avancar(delta);
      estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, delta);
      this.sincronizarNpcs();
    }

    if (this.mapaAberto) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${this.direcao}`, true);
      this.atualizarMarcadoresMapa();
      return;
    }

    this.atualizarAlvo();

    // com dialogo/menu aberto o player fica parado e o relogio congela
    if (this.ui.bloqueado || this.transicionando) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${this.direcao}`, true);
      return;
    }

    const k = this.teclas as unknown as Record<string, Phaser.Input.Keyboard.Key>;
    const esquerda = this.cursors.left.isDown || k.A.isDown;
    const direita = this.cursors.right.isDown || k.D.isDown;
    const cima = this.cursors.up.isDown || k.W.isDown;
    const baixo = this.cursors.down.isDown || k.S.isDown;

    const vx = (direita ? 1 : 0) - (esquerda ? 1 : 0);
    const vy = (baixo ? 1 : 0) - (cima ? 1 : 0);

    const correndo = this.correr.isDown;
    const velocidade = correndo ? CONFIG.movimento.correr : CONFIG.movimento.andar;
    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(velocidade);
    this.player.setVelocity(v.x, v.y);

    if (vx !== 0 || vy !== 0) {
      // horizontal tem prioridade na escolha da animacao
      if (vx !== 0) this.direcao = vx > 0 ? 'right' : 'left';
      else this.direcao = vy > 0 ? 'down' : 'up';
      this.player.anims.play(`${correndo ? 'run' : 'walk'}-${this.direcao}`, true);
    } else {
      this.player.anims.play(`idle-${this.direcao}`, true);
    }
  }

  /** Chamado pela UIScene quando o jogador aperta E / clica. */
  interagir(): void {
    if (!this.alvo) return;
    switch (this.alvo.tipo) {
      case 'placa':
        this.ui.iniciarDialogo(
          falasDe('Placa', ['Isto e uma placa.', 'Nao tem nada escrito nela ainda.']),
        );
        break;
      case 'npc':
        this.falarCom(this.alvo);
        break;
      case 'cama':
        this.ui.confirmar('Dormir ate amanha?', () => this.dormir(estado.mapa));
        break;
      case 'item':
        this.coletarItem(this.alvo);
        break;
      case 'loja':
        this.ui.abrirLoja(String(this.alvo.props.loja));
        break;
      case 'porta':
        this.atravessarPorta(this.alvo);
        break;
      default:
        break;
    }
  }

  // -------------------------------------------------------------- portas --

  /** Fade, troca o tilemap e recoloca o player no ponto indicado pela porta. */
  private atravessarPorta(porta: Interagivel): void {
    const destino = buscarMapa(porta.props.destino);
    if (!destino) {
      console.warn(`[porta] "${porta.id}" aponta pra mapa inexistente:`, porta.props.destino);
      return;
    }
    const tx = Number(porta.props.destinoTx);
    const ty = Number(porta.props.destinoTy);
    // os dois mapas saem do mesmo gerador, entao compartilham o tamanho do tile
    const t = this.tamanhoTile;
    const posicao =
      Number.isFinite(tx) && Number.isFinite(ty)
        ? { x: tx * t + t / 2, y: ty * t + t / 2 }
        : { x: (destino.spawnTile.x + 0.5) * t, y: (destino.spawnTile.y + 0.5) * t };

    this.transicionando = true;
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapa: destino.chave, x: posicao.x, y: posicao.y });
    });
  }

  // -------------------------------------------------------------- dormir --

  /** Fluxo unico usado por qualquer cama, preservando o interior no save. */
  private dormir(zonaAtual: string): void {
    if (zonaAtual !== estado.mapa) {
      console.warn(`[dormir] zona mudou de "${zonaAtual}" para "${estado.mapa}" antes da confirmacao`);
      return;
    }
    this.transicionando = true;
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      estado.dia += 1;
      estado.relogio.definir(CONFIG_TEMPO.horaAoAcordar);
      this.salvarJogo();
      this.transicionando = false;
      cam.fadeIn(400, 0, 0, 0);
    });
  }

  /**
   * Interagiveis de loja do mapa atual. Vem de `PONTOS_DE_LOJA` e nao da camada
   * `interativos` do tilemap: o gerador de interior de comercio ainda nao emite
   * objeto dessa classe. A ligacao pendente esta documentada em game/loja.ts.
   */
  private lerPontosDeLoja(): Interagivel[] {
    const t = this.tamanhoTile;
    return lojasDoMapa(estado.mapa).map((ponto) => ({
      id: ponto.id,
      tipo: 'loja' as const,
      rotulo: ponto.rotulo,
      x: (ponto.tile.x + 0.5) * t,
      y: (ponto.tile.y + 0.5) * t,
      props: { loja: ponto.id },
    }));
  }

  private salvarJogo(): boolean {
    return salvar({
      dia: estado.dia,
      minutos: estado.relogio.minutos,
      mapa: estado.mapa,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      inventario: estado.inventario.serializar(),
      itensColetados: [...estado.itensColetados],
      dinheiro: estado.carteira.serializar(),
    });
  }

  // --------------------------------------------------------------- itens --

  private criarItensColetaveis(): void {
    for (const alvo of this.interagiveis) {
      if (alvo.tipo !== 'item') continue;
      const def = ITENS[String(alvo.props.itemId)];
      if (!def) {
        console.warn(`[item] "${alvo.id}" aponta para item desconhecido`);
        continue;
      }
      const visual = this.add
        .rectangle(alvo.x, alvo.y, this.tamanhoTile * 0.45, this.tamanhoTile * 0.45, def.icone)
        .setStrokeStyle(2, 0xffffff, 0.75)
        .setDepth(alvo.y);
      this.visuaisDeItens.set(alvo.id, visual);
    }
  }

  private coletarItem(alvo: Interagivel): void {
    const idItem = String(alvo.props.itemId ?? '');
    const def = ITENS[idItem];
    const quantidade = Math.max(1, Math.floor(Number(alvo.props.quantidade) || 1));
    if (!def) return;
    if (estado.inventario.adicionar(idItem, quantidade) > 0) {
      this.ui.iniciarDialogo(falasDe('Inventario', ['Nao ha espaco para este item.']));
      return;
    }

    estado.itensColetados.add(alvo.id);
    this.visuaisDeItens.get(alvo.id)?.destroy();
    this.visuaisDeItens.delete(alvo.id);
    this.interagiveis = this.interagiveis.filter((item) => item !== alvo);
    this.alvo = null;
    this.ui.mostrarPrompt(null);
    this.ui.iniciarDialogo(falasDe('Item', [`Voce pegou ${def.nome} x${quantidade}.`]));
  }

  // ----------------------------------------------------------------- npcs --

  /** Um sprite estatico por objeto `npc` do mapa. Nao anda ainda — so existe. */
  private criarNpcs(): void {
    estado.rotinasNpc.atualizar(estado.dia, estado.relogio.minutos, 0);
    for (const estadoNpc of estado.rotinasNpc.todos) {
      const def = buscarNpc(estadoNpc.id);
      if (!def) continue;
      const alvo: Interagivel = {
        id: `npc_${def.id}`,
        tipo: 'npc',
        rotulo: ROTULOS.npc,
        x: estadoNpc.x * this.tamanhoTile,
        y: estadoNpc.y * this.tamanhoTile,
        props: { npcId: def.id },
      };
      const textura = def.sprite ? `npc-${def.id}-sprites` : 'player-idle-sprites';
      const sprite = this.physics.add.sprite(alvo.x, alvo.y, textura, 'down-0');
      this.configurarNpc(sprite);
      sprite.setImmovable(true);
      if (def.tint !== undefined) sprite.setTint(def.tint);
      sprite.anims.play(`${def.sprite ? `npc-${def.id}-` : ''}idle-down`);
      this.interagiveis.push(alvo);
      this.npcs.push({ estado: estadoNpc, sprite, interagivel: alvo, animacao: def.sprite ? `npc-${def.id}-` : '' });
    }
    this.sincronizarNpcs();
  }

  private sincronizarNpcs(): void {
    for (const npc of this.npcs) {
      const { estado: atual, sprite, interagivel } = npc;
      const posicao = this.posicaoNpcNoMapa(atual);
      const visivel = posicao !== null;
      sprite.setVisible(visivel).setActive(visivel);
      if (sprite.body) sprite.body.enable = visivel;
      if (!visivel) continue;
      const x = posicao.x * this.tamanhoTile;
      const y = posicao.y * this.tamanhoTile;
      sprite.setPosition(x, y).setDepth(y);
      interagivel.x = x;
      interagivel.y = y;
      sprite.anims.play(`${npc.animacao}${atual.movendo ? 'walk' : 'idle'}-${atual.direcao}`, true);
    }
  }

  private posicaoNpcNoMapa(npc: EstadoNpc): { x: number; y: number } | null {
    if (estado.mapa === 'farm') return npc.visivel ? { x: npc.x, y: npc.y } : null;
    if (npc.dentro !== estado.mapa) return null;
    if (!LOCAIS_CIDADE[npc.dentro]) return null;
    // Dentro de comodo privado ele some da cena: o jogador ve o dono andar ate a
    // porta somente-NPC e sumir por ela, e reaparecer vindo dela — em vez de ve-lo
    // atravessar a parede da moradia (o sprite fica acima da camada de tiles).
    if (this.tilesPrivados.has(`${Math.floor(npc.x)},${Math.floor(npc.y)}`)) return null;
    return { x: npc.x, y: npc.y };
  }

  /**
   * Tiles dos comodos `privado` da camada de objetos `comodos`. A camada e
   * opcional: os mapas externos e os interiores de um comodo so nao a tem, e ai
   * o conjunto fica vazio e nada muda.
   */
  private lerComodosPrivados(map: Phaser.Tilemaps.Tilemap): Set<string> {
    const tiles = new Set<string>();
    const camada = map.getObjectLayer('comodos');
    if (!camada) return tiles;
    for (const obj of camada.objects) {
      if (lerProps(obj).privado !== true) continue;
      const x0 = Math.floor((obj.x ?? 0) / this.tamanhoTile);
      const y0 = Math.floor((obj.y ?? 0) / this.tamanhoTile);
      const largura = Math.round((obj.width ?? 0) / this.tamanhoTile);
      const altura = Math.round((obj.height ?? 0) / this.tamanhoTile);
      for (let y = y0; y < y0 + altura; y++) {
        for (let x = x0; x < x0 + largura; x++) tiles.add(`${x},${y}`);
      }
    }
    return tiles;
  }

  // ---------------------------------------------------------- construcoes --

  /**
   * Desenha a fachada de cada lote construido, da camada de objetos
   * `construcoes`. A colisao NAO vem daqui: a pegada da construcao ja esta
   * pintada com tiles que colidem na camada `objetos`, e a fachada so cobre
   * isso por cima. O ponto do objeto e o rodape da pegada, e a arte pode ser
   * mais alta que ela — o telhado sobe alem do que barra o player.
   */
  private criarConstrucoes(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('construcoes');
    if (!camada) return;

    for (const obj of camada.objects) {
      const quadro = String(lerProps(obj).frame ?? obj.name ?? '');
      if (!this.textures.getFrame('construcoes', quadro)) {
        console.warn(`[construcoes] frame "${quadro}" nao existe no atlas — ignorado`);
        continue;
      }
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      this.add.image(x, y, 'construcoes', quadro).setOrigin(0.5, 1).setDepth(y);
    }
  }

  /**
   * Moveis de interior, da camada de objetos `moveis`. Diferente da flora, aqui
   * o gerador ja resolve atlas, frame, altura e se colide — o jogo so posiciona
   * e ordena por y. Assim mudar o layout de uma loja e mexer so no gerador.
   */
  private criarMoveis(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('moveis');
    if (!camada) return;

    for (const obj of camada.objects) {
      const props = lerProps(obj);
      const textura = String(props.atlas ?? '');
      const quadro = String(props.frame ?? '');
      const alturaTiles = Number(props.alturaTiles);
      if (!Number.isFinite(alturaTiles)) continue;
      if (!this.textures.getFrame(textura, quadro)) {
        console.warn(`[moveis] frame "${quadro}" nao existe em "${textura}" — ignorado`);
        continue;
      }

      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const sprite = this.add.image(x, y, textura, quadro).setOrigin(0.5, 1);
      sprite.setScale((alturaTiles * this.tamanhoTile) / sprite.height);
      // peca de chao (tapete) desce uma camada: ela e o unico movel que espera
      // ter outro movel EM CIMA, e os dois costumam ter a base na mesma linha
      sprite.setDepth(props.chao === true ? y - 1 : y);

      if (props.colide === true) {
        this.corpoNaBase(
          x,
          y,
          sprite.displayWidth * MOVEL_CORPO.largura,
          sprite.displayHeight * MOVEL_CORPO.altura,
        );
      }
    }
  }

  // ---------------------------------------------------------------- flora --

  /**
   * Cria arvores, pedras e flores a partir da camada de objetos `flora`. Sao
   * sprites, nao tiles: passam de 1 tile e precisam ordenar profundidade com o
   * player. A colisao fica so na BASE (tronco da arvore, pe da pedra), entao da
   * pra andar atras delas. A camada e opcional — mapas de interior nao a tem.
   */
  private criarFlora(map: Phaser.Tilemaps.Tilemap): void {
    const camada = map.getObjectLayer('flora');
    if (!camada) return;

    for (const obj of camada.objects) {
      const classe = obj.type || (obj as { class?: string }).class || '';
      const props = lerProps(obj);
      const receita = receitaDeFlora(classe, props);
      if (!receita) continue;

      if (!this.textures.getFrame(receita.textura, receita.quadro)) {
        console.warn(
          `[flora] frame "${receita.quadro}" nao existe em "${receita.textura}" — ignorado`,
        );
        continue;
      }

      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const sprite = this.add.image(x, y, receita.textura, receita.quadro).setOrigin(0.5, 1);
      // escala vem da altura real do frame: a arte pode mudar de resolucao
      sprite.setScale((receita.alturaTiles * this.tamanhoTile) / sprite.height);
      // profundidade = y: quem esta mais "pra frente" na tela desenha por cima
      sprite.setDepth(y);

      if (classe === 'arvore' && receita.colide) {
        this.corpoNaBase(
          x,
          y,
          TRONCO_TILES.largura * this.tamanhoTile,
          TRONCO_TILES.altura * this.tamanhoTile,
        );
      } else if (classe === 'pedra' && receita.colide) {
        this.corpoNaBase(
          x,
          y,
          sprite.displayWidth * PEDRA_CORPO.largura,
          sprite.displayHeight * PEDRA_CORPO.altura,
        );
      }
    }
  }

  /** Caixa estatica de colisao encostada na base de um sprite de flora. */
  private corpoNaBase(x: number, y: number, largura: number, altura: number): void {
    const corpo = this.add.zone(x, y - altura / 2, largura, altura);
    this.physics.add.existing(corpo, true);
    this.obstaculos.push(corpo);
  }

  // --------------------------------------------------------- camera/mapa --

  /**
   * Zoom que mantem `TILES_VISIVEIS_X` tiles na largura da tela. Com tile 16
   * dava 2; com 32 da 1 — mesmo campo de visao, o dobro de pixel por tile.
   */
  private zoomDeJogo(): number {
    return CONFIG.largura / (TILES_VISIVEIS_X * this.tamanhoTile);
  }

  private alternarMapa(): void {
    this.mapaAberto = !this.mapaAberto;
    if (this.mapaAberto && !this.overlayMapa) this.criarOverlayMapa();
    this.overlayMapa?.setVisible(this.mapaAberto);
    this.scene.setVisible(!this.mapaAberto, 'UIScene');
    if (this.mapaAberto) this.atualizarMarcadoresMapa();
  }

  /** Monta uma representacao leve a partir do farm.json ja carregado. */
  private criarOverlayMapa(): void {
    const cache = this.cache.tilemap.get('farm-map') as { data?: MapaTiledCru } | undefined;
    const mapa = cache?.data;
    if (!mapa) {
      console.warn('[mapa] farm-map nao esta no cache');
      this.mapaAberto = false;
      return;
    }

    const margem = 16;
    const topo = 28;
    const larguraDisponivel = CONFIG.largura - margem * 2;
    const alturaDisponivel = CONFIG.altura - topo - margem;
    const larguraMundo = mapa.width * mapa.tilewidth;
    const alturaMundo = mapa.height * mapa.tileheight;
    const escala = Math.min(larguraDisponivel / larguraMundo, alturaDisponivel / alturaMundo);
    const largura = larguraMundo * escala;
    const altura = alturaMundo * escala;
    const x = (CONFIG.largura - largura) / 2;
    const y = topo + (alturaDisponivel - altura) / 2;
    this.transformMapa = { x, y, escala };

    const fundo = this.add.graphics().setScrollFactor(0);
    fundo.fillStyle(UI.fundo, 0.97);
    fundo.fillRect(0, 0, CONFIG.largura, CONFIG.altura);
    fundo.fillStyle(0x31533a, 1);
    fundo.fillRect(x, y, largura, altura);

    const caminhos = mapa.layers.find((l) => l.name === 'caminhos');
    if (caminhos?.data) {
      fundo.fillStyle(0xb88b57, 0.9);
      for (let ty = 0; ty < mapa.height; ty++) {
        let inicio = -1;
        for (let tx = 0; tx <= mapa.width; tx++) {
          const ocupado = tx < mapa.width && caminhos.data[ty * mapa.width + tx] !== 0;
          if (ocupado && inicio < 0) inicio = tx;
          if (!ocupado && inicio >= 0) {
            fundo.fillRect(
              x + inicio * mapa.tilewidth * escala,
              y + ty * mapa.tileheight * escala,
              (tx - inicio) * mapa.tilewidth * escala,
              mapa.tileheight * escala,
            );
            inicio = -1;
          }
        }
      }
    }

    const filhos: Phaser.GameObjects.GameObject[] = [fundo];
    const zonas = mapa.layers.find((l) => l.name === 'zonas')?.objects ?? [];
    for (const zona of zonas) {
      const cor = COR_ZONA[(zona.class || zona.type) as TipoZona] ?? 0xffffff;
      fundo.fillStyle(cor, 0.28);
      fundo.fillRect(
        x + zona.x * escala,
        y + zona.y * escala,
        zona.width * escala,
        zona.height * escala,
      );
      fundo.lineStyle(1, cor, 0.95);
      fundo.strokeRect(
        x + zona.x * escala,
        y + zona.y * escala,
        zona.width * escala,
        zona.height * escala,
      );
      filhos.push(
        this.add
          .text(
            x + (zona.x + zona.width / 2) * escala,
            y + (zona.y + zona.height / 2) * escala,
            zona.name.startsWith('casa_') ? zona.name.slice(5) : zona.name,
            { fontFamily: UI.fonte, fontSize: '8px', color: UI.texto, align: 'center' },
          )
          .setOrigin(0.5)
          .setScrollFactor(0),
      );
    }

    filhos.push(
      this.add.text(margem, 8, 'Mapa da cidade', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanhoTitulo,
        color: UI.destaque,
      }).setScrollFactor(0),
      this.add.text(CONFIG.largura - margem, 8, '[M] fechar', {
        fontFamily: UI.fonte,
        fontSize: UI.tamanho,
        color: UI.textoFraco,
      }).setOrigin(1, 0).setScrollFactor(0),
      this.add.text(margem, CONFIG.altura - 13, 'vermelho: voce   amarelo: NPC', {
        fontFamily: UI.fonte,
        fontSize: '8px',
        color: UI.textoFraco,
      }).setScrollFactor(0),
    );

    this.marcadorPlayer = this.add.circle(0, 0, 4, 0xff5b57).setStrokeStyle(1, 0xffffff);
    this.marcadorPlayer.setScrollFactor(0);
    filhos.push(this.marcadorPlayer);
    this.marcadoresNpc = estado.rotinasNpc.todos.map(() => {
      const marcador = this.add.circle(0, 0, 3, 0xffd34e).setStrokeStyle(1, 0x3a2b08);
      marcador.setScrollFactor(0);
      filhos.push(marcador);
      return marcador;
    });

    this.overlayMapa = this.add
      .container(0, 0, filhos)
      .setDepth(DEPTH_OVERLAY + 10)
      .setScrollFactor(0);
  }

  private atualizarMarcadoresMapa(): void {
    if (!this.marcadorPlayer) return;
    const posicaoPlayer = estado.mapa === 'farm'
      ? { x: this.player.x, y: this.player.y }
      : this.centroDaZonaNoMapa(estado.mapa);
    if (posicaoPlayer) {
      this.marcadorPlayer.setPosition(...this.paraCoordenadaDoMapa(posicaoPlayer.x, posicaoPlayer.y));
      this.marcadorPlayer.setVisible(true);
    } else this.marcadorPlayer.setVisible(false);

    this.marcadoresNpc.forEach((marcador, i) => {
      const npc = estado.rotinasNpc.todos[i];
      marcador.setVisible(Boolean(npc?.visivel));
      if (npc?.visivel) {
        marcador.setPosition(...this.paraCoordenadaDoMapa(
          npc.x * this.tamanhoTile,
          npc.y * this.tamanhoTile,
        ));
      }
    });
  }

  private paraCoordenadaDoMapa(x: number, y: number): [number, number] {
    return [
      this.transformMapa.x + x * this.transformMapa.escala,
      this.transformMapa.y + y * this.transformMapa.escala,
    ];
  }

  private centroDaZonaNoMapa(id: string): { x: number; y: number } | null {
    const cache = this.cache.tilemap.get('farm-map') as { data?: MapaTiledCru } | undefined;
    const zona = cache?.data?.layers
      .find((l) => l.name === 'zonas')?.objects?.find((obj) => obj.name === id);
    return zona ? { x: zona.x + zona.width / 2, y: zona.y + zona.height / 2 } : null;
  }

  // ------------------------------------------------------ zonas reservadas --

  /**
   * Desenha por cima do mapa o retangulo e o id de cada zona reservada, so
   * pra conferir o loteamento a olho. Nao cria colisao nem prende o player.
   */
  private alternarZonas(): void {
    if (this.overlayZonas) {
      this.overlayZonas.destroy(true);
      this.overlayZonas = null;
      return;
    }
    if (this.zonas.length === 0) {
      console.info('[zonas] este mapa nao tem camada "zonas"');
      return;
    }

    const traco = this.add.graphics();
    const rotulos: Phaser.GameObjects.Text[] = [];

    for (const zona of this.zonas) {
      const cor = COR_ZONA[zona.tipo];
      // lote construido: preenchimento mais forte e borda grossa. Reservado:
      // so um contorno fino, pra ficar claro o que ainda esta vazio.
      traco.fillStyle(cor, zona.construida ? 0.3 : 0.12);
      traco.fillRect(zona.x, zona.y, zona.largura, zona.altura);
      traco.lineStyle(zona.construida ? 3 : 1, cor, 0.9);
      traco.strokeRect(zona.x, zona.y, zona.largura, zona.altura);
      const marca = zona.construida ? `${zona.id} [${zona.mapaInterior ?? 'construida'}]` : zona.id;
      rotulos.push(
        this.add.text(zona.x + 3, zona.y + 3, marca, {
          fontFamily: UI.fonte,
          fontSize: '10px',
          color: zona.construida ? UI.destaque : UI.texto,
        }),
      );
    }

    this.overlayZonas = this.add.container(0, 0, [traco, ...rotulos]).setDepth(DEPTH_OVERLAY);
  }

  /** Reduz a arte original para a escala do mapa e deixa a colisao so nos pes. */
  private configurarPersonagem(sprite: Phaser.Physics.Arcade.Sprite): void {
    // escala tirada da altura real do recorte, igual a flora
    const escala = (ALTURA_PERSONAGEM_TILES * this.tamanhoTile) / sprite.height;
    // depth = y coloca o personagem na mesma ordenacao da flora: quem esta
    // mais pra baixo na tela desenha por cima. O player se reajusta no update.
    sprite.setOrigin(0.5, 1).setScale(escala).setDepth(sprite.y);
    sprite.body
      ?.setSize(CORPO_LARGURA, CORPO_ALTURA)
      .setOffset(CORPO_OFFSET_X, CORPO_OFFSET_Y);
  }

  private configurarNpc(sprite: Phaser.Physics.Arcade.Sprite): void {
    const escala = (ALTURA_PERSONAGEM_TILES * this.tamanhoTile) / sprite.height;
    sprite.setOrigin(0.5, 1).setScale(escala).setDepth(sprite.y);
    sprite.body
      ?.setSize(sprite.width * 0.34, sprite.height * 0.16)
      .setOffset(sprite.width * 0.33, sprite.height * 0.8);
  }

  private falarCom(alvo: Interagivel): void {
    const def = buscarNpc(alvo.props.npcId);
    if (!def) return;
    this.ui.iniciarDialogo(falasDe(def.nome, def.dialogoAtual));
  }

  // ------------------------------------------------------------ interacao --

  /**
   * Escolhe o interagivel mais proximo que esteja dentro do raio E no cone
   * da direcao que o player esta olhando. Se voce estiver praticamente em
   * cima do objeto, a direcao e ignorada.
   */
  private atualizarAlvo(): void {
    const { cosseno } = CONFIG.interacao;
    const raio = CONFIG.interacao.raio * this.tamanhoTile;
    const distanciaLivre = CONFIG.interacao.distanciaLivre * this.tamanhoTile;
    const dir = VETOR[this.direcao];
    const px = this.player.x;
    const py = this.player.y;

    let melhor: Interagivel | null = null;
    let melhorDist = Infinity;

    for (const alvo of this.interagiveis) {
      if (alvo.tipo === 'npc') {
        const npc = estado.rotinasNpc.porId(String(alvo.props.npcId));
        if (!npc || !this.posicaoNpcNoMapa(npc)) continue;
      }
      const dx = alvo.x - px;
      const dy = alvo.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > raio || dist >= melhorDist) continue;
      if (dist > distanciaLivre && (dx * dir.x + dy * dir.y) / dist < cosseno) continue;
      melhor = alvo;
      melhorDist = dist;
    }

    if (melhor !== this.alvo) {
      this.alvo = melhor;
      this.ui.mostrarPrompt(melhor ? melhor.rotulo : null);
    }
  }

  /** Converte a camada de objetos `interativos` do Tiled em dados do jogo. */
  private lerInterativos(map: Phaser.Tilemaps.Tilemap): Interagivel[] {
    const camada = map.getObjectLayer('interativos');
    if (!camada) return [];

    const lista: Interagivel[] = [];
    for (const obj of camada.objects) {
      // Tiled >= 1.9 grava 'class'; versoes antigas gravam 'type'
      const classe = (obj.type || (obj as { class?: string }).class || '') as TipoInteragivel;
      if (!TIPOS_VALIDOS.includes(classe)) {
        console.warn(`[interativos] classe desconhecida "${classe}" em "${obj.name}" — ignorado`);
        continue;
      }
      const props = lerProps(obj);
      lista.push({
        id: obj.name || `${classe}_${lista.length}`,
        tipo: classe,
        // o Tiled pode sobrescrever o verbo do prompt (ex: porta de saida -> "Sair")
        rotulo: typeof props.rotulo === 'string' ? props.rotulo : ROTULOS[classe],
        x: (obj.x ?? 0) + (obj.width ?? 0) / 2,
        y: (obj.y ?? 0) + (obj.height ?? 0) / 2,
        props,
      });
    }
    return lista;
  }

  /**
   * Converte a camada de objetos `zonas` do Tiled em areas reservadas.
   * A camada e opcional — mapas de interior simplesmente nao a tem.
   */
  private lerZonas(map: Phaser.Tilemaps.Tilemap): ZonaReservada[] {
    const camada = map.getObjectLayer('zonas');
    if (!camada) return [];

    const lista: ZonaReservada[] = [];
    for (const obj of camada.objects) {
      const classe = (obj.type || (obj as { class?: string }).class || '') as TipoZona;
      if (!TIPOS_ZONA_VALIDOS.includes(classe)) {
        console.warn(`[zonas] classe desconhecida "${classe}" em "${obj.name}" — ignorada`);
        continue;
      }
      const props = lerProps(obj);
      // `uso` diz o que a construcao E: moradia, comercio, misto (casa+comercio
      // no mesmo interior) ou praca. Quem gera o mapa e tools/gerar-assets.mjs,
      // que sempre escreve o campo — se ele nao vier, o lote esta malformado e
      // seguir em frente esconderia o problema.
      const uso = props.uso as UsoZona;
      if (!USOS_ZONA_VALIDOS.includes(uso)) {
        console.warn(`[zonas] uso desconhecido "${props.uso}" em "${obj.name}" — ignorada`);
        continue;
      }
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const largura = obj.width ?? 0;
      const altura = obj.height ?? 0;
      lista.push({
        id: obj.name || `${classe}_${lista.length}`,
        tipo: classe,
        uso,
        moradia: USOS_DE_MORADIA.includes(uso),
        construida: props.construida === true,
        mapaInterior: typeof props.mapaInterior === 'string' ? props.mapaInterior : null,
        x,
        y,
        largura,
        altura,
        centro: { x: x + largura / 2, y: y + altura / 2 },
      });
    }
    return lista;
  }
}

/** O que a cena precisa saber pra montar um sprite da camada `flora`. */
interface NpcVisual {
  estado: EstadoNpc;
  sprite: Phaser.Physics.Arcade.Sprite;
  interagivel: Interagivel;
  animacao: string;
}

interface ReceitaFlora {
  textura: string;
  quadro: string;
  /** altura no mundo, em tiles */
  alturaTiles: number;
  colide: boolean;
}

interface ObjetoTiledCru {
  name: string;
  class?: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CamadaTiledCru {
  name: string;
  data?: number[];
  objects?: ObjetoTiledCru[];
}

interface MapaTiledCru {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: CamadaTiledCru[];
}

/**
 * Traduz um objeto da camada `flora` em textura + frame + tamanho.
 *
 * Arvore e flor tem estagios discretos, e a altura de cada um mora aqui no
 * jogo. Pedra e tamanho continuo (pedrisco a matacao), entao o gerador ja
 * grava `alturaTiles` no objeto — com uma escala unica pra folha toda, pra
 * elas manterem o tamanho relativo entre si.
 */
function receitaDeFlora(
  classe: string,
  props: Record<string, PropObjeto>,
): ReceitaFlora | null {
  if (classe === 'pedra') {
    const indice = Number(props.indice);
    const alturaTiles = Number(props.alturaTiles);
    if (!Number.isFinite(indice) || !Number.isFinite(alturaTiles)) return null;
    return {
      textura: 'pedras',
      quadro: `pedra_${indice}`,
      alturaTiles,
      colide: alturaTiles > PEDRA_COLIDE_ACIMA_DE,
    };
  }

  const estagio = Number(props.estagio);
  const especie = Number(props.especie);
  if (!Number.isFinite(estagio) || !Number.isFinite(especie)) return null;

  if (classe === 'arvore') {
    return {
      textura: 'arvores',
      quadro: `arvore_${especie}_${estagio}`,
      alturaTiles: ALTURA_ARVORE[estagio] ?? 1,
      colide: estagio >= ARVORE_COLIDE_A_PARTIR_DE,
    };
  }
  if (classe === 'flor') {
    return {
      textura: `flores_${String(props.folha)}`,
      quadro: `flor_${especie}_${estagio}`,
      alturaTiles: ALTURA_FLOR[estagio] ?? 1,
      colide: false,
    };
  }
  console.warn(`[flora] classe desconhecida "${classe}" — ignorada`);
  return null;
}

function lerProps(obj: Phaser.Types.Tilemaps.TiledObject): Record<string, PropObjeto> {
  const props: Record<string, PropObjeto> = {};
  const brutas = obj.properties as { name: string; value: PropObjeto }[] | undefined;
  if (Array.isArray(brutas)) for (const p of brutas) props[p.name] = p.value;
  return props;
}

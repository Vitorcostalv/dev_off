import Phaser from 'phaser';
import { CONFIG, ROTULOS } from '../game/config';
import { estado } from '../game/estado';
import { buscarMapa } from '../game/mapas';
import { buscarNpc } from '../game/npcs';
import { CONFIG_TEMPO } from '../game/relogio';
import { apagar, salvar } from '../game/save';
import { falasDe } from '../game/tipos';
import type { Direcao, Interagivel, PropObjeto, TipoInteragivel } from '../game/tipos';
import type { UIScene } from './UIScene';

const VELOCIDADE = 70;
const TILE = 16;

const VETOR: Record<Direcao, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const TIPOS_VALIDOS: TipoInteragivel[] = ['placa', 'npc', 'porta', 'cama'];

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclas!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private direcao: Direcao = 'down';

  private interagiveis: Interagivel[] = [];
  private alvo: Interagivel | null = null;
  private npcs: Phaser.Physics.Arcade.Sprite[] = [];
  /** trava o input durante fades (dormir, trocar de mapa) */
  private transicionando = false;
  /** de onde o player entrou neste mapa; null = usa o spawn padrao */
  private spawn: { x: number; y: number } | null = null;

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
    this.interagiveis = [];
    this.npcs = [];
    this.alvo = null;
  }

  create(): void {
    const def = buscarMapa(estado.mapa);
    if (!def) throw new Error(`Mapa "${estado.mapa}" nao existe em MAPAS`);

    const map = this.make.tilemap({ key: def.tilemapKey });

    // 1o arg = nome do tileset DENTRO do JSON do Tiled, 2o = key carregada no BootScene.
    const tileset = map.addTilesetImage(def.tilesetNoJson, def.tilesetKey);
    if (!tileset) {
      throw new Error(`Tileset '${def.tilesetNoJson}' nao encontrado em ${def.tilemapKey}`);
    }

    const chao = map.createLayer('chao', tileset, 0, 0);
    const objetos = map.createLayer('objetos', tileset, 0, 0);
    if (!chao || !objetos) {
      throw new Error(`Camadas chao/objetos nao encontradas em ${def.tilemapKey}`);
    }

    // colisao vem da propriedade 'collides' marcada nos tiles no Tiled
    objetos.setCollisionByProperty({ collides: true });

    this.interagiveis = this.lerInterativos(map);

    const nasce = this.spawn ?? def.spawn;
    this.player = this.physics.add.sprite(nasce.x, nasce.y, 'player');
    this.player.setDepth(10);
    // hitbox menor que o sprite, so os pes -> parece melhor em top-down
    this.player.body?.setSize(8, 6);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(4, 10);
    this.player.setCollideWorldBounds(true);

    this.criarNpcs();

    this.physics.add.collider(this.player, objetos);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(2);
    cam.fadeIn(220, 0, 0, 0);

    this.ui.mostrarPrompt(null);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.teclas = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.teclas &
      Record<string, Phaser.Input.Keyboard.Key>;

    // F2/F3 jogam itens de teste no inventario (debug)
    this.input.keyboard!.on('keydown-F2', () => estado.inventario.adicionar('item_teste', 1));
    this.input.keyboard!.on('keydown-F3', () => estado.inventario.adicionar('item_teste_2', 1));

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
    this.atualizarAlvo();

    // com dialogo/menu aberto o player fica parado e o relogio congela
    if (this.ui.bloqueado || this.transicionando) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${this.direcao}`, true);
      return;
    }

    // passar da meia-noite acordado tambem vira o dia
    estado.dia += estado.relogio.avancar(delta);

    const k = this.teclas as unknown as Record<string, Phaser.Input.Keyboard.Key>;
    const esquerda = this.cursors.left.isDown || k.A.isDown;
    const direita = this.cursors.right.isDown || k.D.isDown;
    const cima = this.cursors.up.isDown || k.W.isDown;
    const baixo = this.cursors.down.isDown || k.S.isDown;

    const vx = (direita ? 1 : 0) - (esquerda ? 1 : 0);
    const vy = (baixo ? 1 : 0) - (cima ? 1 : 0);

    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(VELOCIDADE);
    this.player.setVelocity(v.x, v.y);

    if (vx !== 0 || vy !== 0) {
      // horizontal tem prioridade na escolha da animacao
      if (vx !== 0) this.direcao = vx > 0 ? 'right' : 'left';
      else this.direcao = vy > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${this.direcao}`, true);
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
        this.ui.confirmar('Dormir ate amanha?', () => this.dormir());
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
    const posicao =
      Number.isFinite(tx) && Number.isFinite(ty)
        ? { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }
        : destino.spawn;

    this.transicionando = true;
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapa: destino.chave, x: posicao.x, y: posicao.y });
    });
  }

  // -------------------------------------------------------------- dormir --

  private dormir(): void {
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

  private salvarJogo(): boolean {
    return salvar({
      dia: estado.dia,
      minutos: estado.relogio.minutos,
      mapa: estado.mapa,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      inventario: estado.inventario.serializar(),
    });
  }

  // ----------------------------------------------------------------- npcs --

  /** Um sprite estatico por objeto `npc` do mapa. Nao anda ainda — so existe. */
  private criarNpcs(): void {
    for (const alvo of this.interagiveis) {
      if (alvo.tipo !== 'npc') continue;
      const def = buscarNpc(alvo.props.npcId);
      if (!def) {
        console.warn(`[npc] "${alvo.id}" sem npcId valido (${String(alvo.props.npcId)})`);
        continue;
      }
      const sprite = this.physics.add.staticSprite(alvo.x, alvo.y, 'player');
      sprite.setTint(def.tint).setDepth(10);
      sprite.anims.play('idle-down');
      sprite.body.setSize(10, 8).setOffset(3, 8);
      sprite.body.updateFromGameObject();
      this.npcs.push(sprite);
    }
    if (this.npcs.length > 0) this.physics.add.collider(this.player, this.npcs);
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
    const { raio, cosseno, distanciaLivre } = CONFIG.interacao;
    const dir = VETOR[this.direcao];
    const px = this.player.x;
    const py = this.player.y;

    let melhor: Interagivel | null = null;
    let melhorDist = Infinity;

    for (const alvo of this.interagiveis) {
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
}

function lerProps(obj: Phaser.Types.Tilemaps.TiledObject): Record<string, PropObjeto> {
  const props: Record<string, PropObjeto> = {};
  const brutas = obj.properties as { name: string; value: PropObjeto }[] | undefined;
  if (Array.isArray(brutas)) for (const p of brutas) props[p.name] = p.value;
  return props;
}

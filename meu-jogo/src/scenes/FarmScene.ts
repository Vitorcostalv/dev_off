import Phaser from 'phaser';
import { CONFIG, ROTULOS } from '../game/config';
import { estado } from '../game/estado';
import { buscarNpc } from '../game/npcs';
import { falasDe } from '../game/tipos';
import type { Direcao, Interagivel, PropObjeto, TipoInteragivel } from '../game/tipos';
import type { UIScene } from './UIScene';

const VELOCIDADE = 70;

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

  constructor() {
    super('FarmScene');
  }

  private get ui(): UIScene {
    return this.scene.get('UIScene') as UIScene;
  }

  create(): void {
    const map = this.make.tilemap({ key: 'farm-map' });

    // 1o arg = nome do tileset DENTRO do JSON do Tiled, 2o = key carregada no BootScene.
    const tileset = map.addTilesetImage('terrain', 'tiles-terrain');
    if (!tileset) throw new Error("Tileset 'terrain' nao encontrado no farm.json");

    const chao = map.createLayer('chao', tileset, 0, 0);
    const objetos = map.createLayer('objetos', tileset, 0, 0);
    if (!chao || !objetos) throw new Error('Camadas chao/objetos nao encontradas no tilemap');

    // colisao vem da propriedade 'collides' marcada nos tiles no Tiled
    objetos.setCollisionByProperty({ collides: true });

    this.interagiveis = this.lerInterativos(map);

    this.player = this.physics.add.sprite(map.widthInPixels / 2, map.heightInPixels / 2, 'player');
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

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.teclas = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.teclas &
      Record<string, Phaser.Input.Keyboard.Key>;

    // F1 liga/desliga o debug das colisoes
    this.input.keyboard!.on('keydown-F1', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) this.physics.world.debugGraphic?.clear();
    });
  }

  update(_tempo: number, delta: number): void {
    this.atualizarAlvo();

    // com dialogo/menu aberto o player fica parado e o relogio congela
    if (this.ui.bloqueado) {
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
      default:
        break;
    }
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
      lista.push({
        id: obj.name || `${classe}_${lista.length}`,
        tipo: classe,
        rotulo: ROTULOS[classe],
        x: (obj.x ?? 0) + (obj.width ?? 0) / 2,
        y: (obj.y ?? 0) + (obj.height ?? 0) / 2,
        props: lerProps(obj),
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

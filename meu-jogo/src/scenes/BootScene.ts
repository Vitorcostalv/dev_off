import Phaser from 'phaser';
import { estado } from '../game/estado';
import { MAPAS, buscarMapa } from '../game/mapas';
import type { SpriteNpc } from '../game/npcs';
import { NPCS } from '../game/npcs';
import { carregar } from '../game/save';
import { CATALOGO_INIMIGOS } from '../game/inimigos';
import { Som, som } from './Som';

const PLAYER_FRAME = { largura: 200, altura: 320 };
const PLAYER_RECORTE = {
  idle: {
    textura: 'player-idle-sprites',
    colunas: [184, 412, 638, 864],
    linhas: { down: 0, left: 300, right: 590, up: 874 },
  },
  walk: {
    textura: 'player-walk-sprites',
    colunas: [184, 412, 638, 864],
    linhas: { down: 0, left: 300, right: 610, up: 920 },
  },
  run: {
    textura: 'player-run-sprites',
    colunas: [144, 404, 682, 948],
    linhas: { down: 0, left: 294, right: 582, up: 870 },
  },
} as const;

/** Carrega todos os assets e mostra uma barra de progresso. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.criarBarraDeProgresso();

    // tileset: a key ('tiles-terrain') e o que o Phaser usa;
    // o nome do tileset dentro do JSON do Tiled e 'terrain' (ver FarmScene).
    this.load.image('tiles-terrain', 'assets/tilesets/terrain.png');
    // Um tilemap por entrada de MAPAS: nao ha lista pra manter em dois lugares.
    //
    // Fora os marcados `sobDemanda` — os quarenta e cinco andares novos da
    // represa. Somados eles passam de um megabyte de JSON, e carregar tudo no
    // boot atrasaria a abertura pra quem nunca desceu na usina. Quem os busca e a
    // cena de mundo, ao chegar no andar (ver `garantirTilemap` na FarmScene).
    for (const def of Object.values(MAPAS)) {
      if (def.sobDemanda) continue;
      this.load.tilemapTiledJSON(def.tilemapKey, def.arquivo);
    }

    // fachadas das construcoes: um frame por lote, com o nome do lote
    this.load.atlas(
      'construcoes',
      'assets/sprites/construcoes.png',
      'assets/sprites/construcoes.atlas.json',
    );

    // flora: os atlas sao gerados por tools/gerar-assets.mjs a partir da grade
    // de cada spritesheet. Frames: arvore_<especie>_<estagio> / flor_<especie>_<estagio>.
    this.load.atlas('arvores', 'assets/sprites/Arvores.png', 'assets/sprites/arvores.atlas.json');
    this.load.atlas(
      'flores_v1',
      'assets/sprites/Flores_v1.png',
      'assets/sprites/flores_v1.atlas.json',
    );
    this.load.atlas(
      'flores_v2',
      'assets/sprites/Flores_v2.png',
      'assets/sprites/flores_v2.atlas.json',
    );
    // pedras soltas: frames `pedra_<i>`, do pedrisco ao matacao
    this.load.atlas('pedras', 'assets/sprites/pedras.png', 'assets/sprites/pedras.atlas.json');

    // MOVEIS DE INTERIOR NAO ENTRAM AQUI.
    //
    // As catorze folhas de `FOLHAS_DE_MOVEL` somam 35,79 MB, e carregar todas
    // no boot significava baixar a folha de banheiro e a de hospital antes de o
    // menu aparecer, pra um jogador que comeca na rua do bairro — mapa que nao
    // usa nenhuma delas. O mapa que usa mais, uma residencia, usa seis.
    //
    // Quem carrega e a cena de mundo, ao entrar no mapa, lendo a camada
    // `moveis` do proprio tilemap (ver `garantirAtlasDeMovel` na FarmScene). O
    // atlas fica em cache depois da primeira visita, entao a segunda entrada na
    // padaria e imediata.
    //
    // O PNG de cada folha e a versao LIMPA gerada por tools/gerar-assets.mjs, e
    // nao a arte crua: nela cada peca tem so os proprios pixels, senao o frame
    // de uma peca diagonal (tapete) leva lasca da vizinha.

    // Icone de item: um frame `item_<id>` por entrada do CATALOGO_ITENS. O par
    // PNG+atlas sai de tools/gerar-itens.mjs, que le o MESMO catalogo — entao
    // nao ha frame sobrando nem item do catalogo sem icone.
    this.load.atlas('itens', 'assets/sprites/itens.png', 'assets/sprites/itens.atlas.json');
    // aparelhos do minigame de conserto (tools/gerar-aparelhos.mjs)
    this.load.atlas(
      'aparelhos',
      'assets/sprites/aparelhos.png',
      'assets/sprites/aparelhos.atlas.json',
    );

    // Medidas das pecas do catalogo de mobilia compravel (atlas, frame e
    // tamanho em tiles). Sai de tools/gerar-assets.mjs lendo `CATALOGO_MOBILIA`
    // de src/game/casa.ts — ver o cabecalho de la.
    this.load.json('mobilia', 'assets/sprites/mobilia.json');

    this.load.image('player-idle-sprites', 'assets/sprites/player_sprites.png');
    // Folha GENERICA de segurar item, ja regravada na geometria das outras tres
    // por tools/processar-sprites-jogador.mjs — mesma celula de 200x320, mesmo
    // centro, mesmos pes. O par dela e `maos_jogador.json`, com o ponto de
    // presa medido em cada pose.
    this.load.image('player-hold-sprites', 'assets/sprites/player_segurando_runtime.png');
    this.load.json('maos-jogador', 'assets/sprites/maos_jogador.json');
    // O que o jogador SEGURA e o que ele DISPARA, mais as lampadas da usina.
    // Atlas a parte do de icone (`itens`) porque estes sao sprites de mundo e
    // precisam de ponto de ancoragem — ver tools/gerar-equipamento.mjs.
    this.load.atlas(
      'equipamento',
      'assets/sprites/equipamento.png',
      'assets/sprites/equipamento.atlas.json',
    );
    this.load.json('equipamento-ancoras', 'assets/sprites/equipamento.ancoras.json');
    this.load.image('player-walk-sprites', 'assets/sprites/Player_andando.png');
    this.load.image('player-run-sprites', 'assets/sprites/Player_correndo.png');
    for (const npc of Object.values(NPCS)) {
      if (npc.sprite) this.load.image(`npc-${npc.id}-sprites`, npc.sprite.arquivo);
      if (npc.spriteParado) this.load.image(`npc-${npc.id}-parado`, npc.spriteParado.arquivo);
    }

    // Monstros eletronicos da represa. As folhas saem de
    // tools/processar-sprites-monstro.mjs no MESMO formato 4x4 das de NPC — e
    // por isso elas passam pelo mesmo `recortarFolhaNpc` logo abaixo, sem um
    // segundo caminho de sprite no jogo.
    for (const id of Object.keys(CATALOGO_INIMIGOS)) {
      this.load.image(`monstro-${id}-sprites`, `assets/sprites/${id}_andando_runtime.png`);
      this.load.image(`monstro-${id}-parado`, `assets/sprites/${id}_parado_runtime.png`);
    }

    // Efeitos, ambientes e trilhas. Sao WAV gerados por tools/gerar-audio.mjs;
    // arquivo que falha no decode vira aviso no console e silencio naquele id,
    // sem impedir o boot (ver Som.existe).
    Som.precarregar(this);
  }

  create(): void {
    estado.preferencias.carregar();
    som.aplicar(estado.preferencias.valores);
    this.criarFramesPlayer('idle');
    this.criarFramesPlayer('walk');
    this.criarFramesPlayer('run');
    this.criarFramesDeSegurar();
    this.criarAnimacoes();
    this.criarSpritesNpcs();
    this.criarSpritesMonstros();
    const inicio = this.aplicarSave();

    // a UI roda em paralelo, por cima do mundo, na resolucao base (sem zoom).
    // Ela sobe primeiro: a cena de mundo fala com ela ja no create().
    this.scene.launch('UIScene');
    this.scene.start('FarmScene', inicio);
  }

  /**
   * Le o localStorage e joga tudo dentro do `estado`.
   * Devolve o ponto de entrada da cena de mundo (ou undefined = jogo novo).
   */
  private aplicarSave(): { mapa: string; x: number; y: number } | undefined {
    const save = carregar();
    if (!save) return undefined;

    const mapa = buscarMapa(save.mapa);
    if (!mapa) {
      console.warn(`[save] mapa "${save.mapa}" nao existe mais — comecando na fazenda`);
      return undefined;
    }

    estado.dia = Number.isFinite(save.dia) ? save.dia : 0;
    estado.relogio.definir(Number.isFinite(save.minutos) ? save.minutos : 0);
    estado.mapa = mapa.chave;
    estado.inventario.restaurar(save.inventario);
    // valida sozinho: save com NaN/negativo/string volta pro saldo inicial
    estado.carteira.restaurar(save.dinheiro);
    estado.lixeira.restaurar(save.lixeira);
    estado.trabalhos.restaurar(save.trabalhos);
    estado.relacoes.restaurar(save.relacoes);
    estado.casa.restaurar(save.casa);
    estado.worldEvents.restaurar(save.worldEvents);
    estado.missoesNpc.restaurar(save.missoesNpc);
    estado.cidade.restaurar(save.cidade);
    estado.vida.restaurar(save.vida);
    estado.represa.restaurar(save.represa);
    estado.equipamento.restaurar(save.equipamento);
    estado.armas.restaurar(save.armas);
    estado.arquivo.restaurar(save.arquivo);
    estado.progressao.restaurar(save.progressao);
    estado.clima.restaurar(save.clima);
    estado.rural.restaurar(save.rural);
    // O item pode ter saido do inventario por outro caminho (venda, descarte)
    // entre gravar e carregar; sem esta linha o save traria uma arma equipada
    // que nao esta mais na mochila.
    estado.equipamento.sincronizarCom((id) => estado.inventario.contar(id));
    estado.itensColetados = new Set(
      Array.isArray(save.itensColetados)
        ? save.itensColetados.filter((id): id is string => typeof id === 'string')
        : [],
    );

    console.info(
      `[save] carregado: dia ${estado.dia}, ${estado.relogio.texto}, ${mapa.chave},` +
        ` ${estado.carteira.texto}`,
    );
    return { mapa: mapa.chave, x: save.x, y: save.y };
  }

  /**
   * Recortes da folha de SEGURAR. Diferente das outras tres do jogador, esta ja
   * vem em grade uniforme (o processador a regravou assim), entao o recorte e
   * uma multiplicacao — nao ha coluna medida a mao aqui.
   *
   * A ordem das LINHAS e a mesma do `PLAYER_RECORTE`: baixo, esquerda, direita,
   * cima.
   */
  private criarFramesDeSegurar(): void {
    const textura = this.textures.get('player-hold-sprites');
    const linhas = ['down', 'left', 'right', 'up'];
    linhas.forEach((direcao, linha) => {
      for (let coluna = 0; coluna < 4; coluna++) {
        textura.add(
          `${direcao}-${coluna}`,
          0,
          coluna * PLAYER_FRAME.largura,
          linha * PLAYER_FRAME.altura,
          PLAYER_FRAME.largura,
          PLAYER_FRAME.altura,
        );
      }
    });
  }

  private criarAnimacoes(): void {
    const dirs = ['down', 'left', 'right', 'up'];

    for (const key of dirs) {
      const frames = PLAYER_RECORTE.walk.colunas.map((_, indice) => ({
        key: PLAYER_RECORTE.walk.textura,
        frame: `${key}-${indice}`,
      }));
      this.anims.create({
        key: `walk-${key}`,
        frames,
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `run-${key}`,
        frames: PLAYER_RECORTE.run.colunas.map((_, indice) => ({
          key: PLAYER_RECORTE.run.textura,
          frame: `${key}-${indice}`,
        })),
        frameRate: 11,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${key}`,
        frames: [{ key: PLAYER_RECORTE.idle.textura, frame: `${key}-0` }],
        frameRate: 1,
      });
      // As mesmas duas na folha de SEGURAR. Nao ha `seg-run`: correr segurando
      // uma pistola nao tem arte, e a cena cai em `seg-walk` (ver
      // `MaoDoJogador.animacaoDoCorpo`).
      this.anims.create({
        key: `seg-walk-${key}`,
        frames: [0, 1, 2, 3].map((i) => ({ key: 'player-hold-sprites', frame: `${key}-${i}` })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `seg-idle-${key}`,
        frames: [{ key: 'player-hold-sprites', frame: `${key}-0` }],
        frameRate: 1,
      });
    }
  }

  /**
   * Registra os recortes de uma folha de NPC e devolve os frames por direcao.
   * Os nomes de recorte (`down-0`...) sao por TEXTURA, e caminhada e parado sao
   * texturas diferentes, entao as duas folhas podem usar os mesmos nomes.
   */
  private recortarFolhaNpc(
    chaveTextura: string,
    folha: SpriteNpc,
  ): Record<string, Phaser.Types.Animations.AnimationFrame[]> {
    const textura = this.textures.get(chaveTextura);
    const fonte = textura.source[0];
    const porDirecao: Record<string, Phaser.Types.Animations.AnimationFrame[]> = {};
    for (const [direcao, faixa] of Object.entries(folha.frames)) {
      porDirecao[direcao] = faixa.colunas.map((coluna, indice) => {
        const x0 = Math.floor((coluna * fonte.width) / folha.colunas);
        const x1 = Math.floor(((coluna + 1) * fonte.width) / folha.colunas);
        const y0 = Math.floor((faixa.linha * fonte.height) / folha.linhas);
        const y1 = Math.floor(((faixa.linha + 1) * fonte.height) / folha.linhas);
        const nome = `${direcao}-${indice}`;
        textura.add(nome, 0, x0, y0, x1 - x0, y1 - y0);
        return { key: chaveTextura, frame: nome };
      });
    }
    return porDirecao;
  }

  /** Recortes e animacoes sao inteiramente descritos pela entrada do NPC. */
  private criarSpritesNpcs(): void {
    for (const npc of Object.values(NPCS)) {
      if (!npc.sprite) continue;
      const andando = this.recortarFolhaNpc(`npc-${npc.id}-sprites`, npc.sprite);
      // Sem folha de parado, o idle cai no 1o frame da caminhada — que e uma
      // pose de passo, e le como se o NPC estivesse andando no lugar.
      const parado = npc.spriteParado
        ? this.recortarFolhaNpc(`npc-${npc.id}-parado`, npc.spriteParado)
        : null;

      for (const [direcao, frames] of Object.entries(andando)) {
        if (!this.anims.exists(`npc-${npc.id}-walk-${direcao}`)) this.anims.create({
          key: `npc-${npc.id}-walk-${direcao}`,
          frames,
          frameRate: 8,
          repeat: -1,
        });
        if (!this.anims.exists(`npc-${npc.id}-idle-${direcao}`)) this.anims.create({
          key: `npc-${npc.id}-idle-${direcao}`,
          frames: [(parado?.[direcao] ?? frames)[0]],
          frameRate: 1,
        });
      }
    }
  }

  /**
   * Recortes e animacoes dos monstros. Identico ao dos NPCs, com o prefixo
   * `monstro-` em vez de `npc-`: as duas folhas ja saem do mesmo processador,
   * na mesma grade 4x4 e na mesma ordem de direcao.
   */
  private criarSpritesMonstros(): void {
    const folha: SpriteNpc = {
      arquivo: '',
      colunas: 4,
      linhas: 4,
      frames: {
        down: { linha: 0, colunas: [0, 1, 2, 3] },
        up: { linha: 1, colunas: [0, 1, 2, 3] },
        left: { linha: 2, colunas: [0, 1, 2, 3] },
        right: { linha: 3, colunas: [0, 1, 2, 3] },
      },
    };
    for (const id of Object.keys(CATALOGO_INIMIGOS)) {
      const andando = this.recortarFolhaNpc(`monstro-${id}-sprites`, folha);
      const parado = this.recortarFolhaNpc(`monstro-${id}-parado`, folha);
      for (const [direcao, quadros] of Object.entries(andando)) {
        this.anims.create({
          key: `monstro-${id}-walk-${direcao}`,
          frames: quadros,
          // um pouco mais lento que o passo humano: maquina se move em cadencia
          frameRate: 7,
          repeat: -1,
        });
        this.anims.create({
          key: `monstro-${id}-idle-${direcao}`,
          frames: [(parado[direcao] ?? quadros)[0]],
          frameRate: 1,
        });
      }
    }
  }

  /**
   * A imagem recebida tem espacamento irregular entre as poses, entao nao da
   * para usar frameWidth/frameHeight. Registramos cada recorte manualmente.
   */
  private criarFramesPlayer(tipo: keyof typeof PLAYER_RECORTE): void {
    const recorte = PLAYER_RECORTE[tipo];
    const textura = this.textures.get(recorte.textura);
    for (const [direcao, y] of Object.entries(recorte.linhas)) {
      recorte.colunas.forEach((x, indice) => {
        textura.add(
          `${direcao}-${indice}`,
          0,
          x,
          y,
          PLAYER_FRAME.largura,
          PLAYER_FRAME.altura,
        );
      });
    }
  }

  private criarBarraDeProgresso(): void {
    const { width, height } = this.scale;
    const barra = this.add.graphics();
    const moldura = this.add.graphics();
    moldura.lineStyle(1, 0xffffff, 0.5);
    moldura.strokeRect(width / 2 - 80, height / 2 - 6, 160, 12);

    this.load.on('progress', (valor: number) => {
      barra.clear();
      barra.fillStyle(0xa8c66c, 1);
      barra.fillRect(width / 2 - 78, height / 2 - 4, 156 * valor, 8);
    });

    this.load.on('complete', () => {
      barra.destroy();
      moldura.destroy();
    });
  }
}

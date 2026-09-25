import Phaser from 'phaser';
import type { SpriteNpc } from '../game/npcs';

/**
 * FOLHA DE NPC: carregar, recortar e animar — num lugar so.
 *
 * Isto morava na BootScene, que carregava as 66 folhas dos 33 moradores antes
 * do menu: 14,99 MB pra mostrar bonecos num mapa que usa nove deles. Agora a
 * cena de mundo pede as folhas de quem esta no mapa, e a BootScene nao pede
 * nenhuma — entao o recorte precisa rodar nas duas, e mora aqui.
 *
 * As tres funcoes sao IDEMPOTENTES. Isso nao e detalhe: a cena de mundo
 * reinicia ao trocar de mapa e ao receber asset novo, e um recorte repetido que
 * derrubasse o anterior apagaria a animacao de quem ja estava em cena.
 *
 * Os monstros da represa passam pelo mesmo caminho (mesma grade 4x4, mesmo
 * processador de folha), com o prefixo `monstro-` em vez de `npc-` — ver
 * `criarSpritesMonstros` na BootScene.
 */

/**
 * O minimo que estas funcoes precisam de um NPC: o id e as duas folhas.
 *
 * Nao e `DefinicaoNpc` de proposito. `buscarNpc` devolve `PerfilNpc`, que e
 * uniao de `DefinicaoNpc` com `Morador` — e o segundo nao tem rotina nem
 * posicao inicial. Pedir so o que se usa deixa as duas passarem.
 */
export interface NpcComFolha {
  id: string;
  sprite?: SpriteNpc | null;
  spriteParado?: SpriteNpc | null;
}

/** As duas chaves de textura de um NPC. `parado` e null quando nao ha folha. */
export function chavesDoNpc(def: NpcComFolha): { andando: string; parado: string | null } {
  return {
    andando: `npc-${def.id}-sprites`,
    parado: def.spriteParado ? `npc-${def.id}-parado` : null,
  };
}

/** Se as folhas do NPC ja estao no cache de textura da cena. */
export function folhasNoCache(cena: Phaser.Scene, def: NpcComFolha): boolean {
  if (!def.sprite) return true; // NPC sem arte usa a folha do jogador
  const { andando, parado } = chavesDoNpc(def);
  return cena.textures.exists(andando) && (parado === null || cena.textures.exists(parado));
}

/**
 * Enfileira o que falta das folhas de `def` no loader da cena.
 *
 * Nao inicia a carga: quem chama decide se dispara agora (`load.start()`) ou se
 * deixa o `preload` levar. Devolve quantos arquivos entraram na fila, pra quem
 * precisa saber se vale esperar.
 */
export function enfileirarFolhasNpc(cena: Phaser.Scene, def: NpcComFolha): number {
  if (!def.sprite) return 0;
  const { andando, parado } = chavesDoNpc(def);
  let pedidos = 0;
  if (!cena.textures.exists(andando)) {
    cena.load.image(andando, def.sprite.arquivo);
    pedidos += 1;
  }
  if (parado !== null && def.spriteParado && !cena.textures.exists(parado)) {
    cena.load.image(parado, def.spriteParado.arquivo);
    pedidos += 1;
  }
  return pedidos;
}

/**
 * Registra os recortes de uma folha e devolve os frames por direcao.
 *
 * Os nomes de recorte (`down-0`...) sao por TEXTURA, e caminhada e parado sao
 * texturas diferentes, entao as duas folhas podem usar os mesmos nomes.
 */
export function recortarFolhaNpc(
  cena: Phaser.Scene,
  chaveTextura: string,
  folha: SpriteNpc,
): Record<string, Phaser.Types.Animations.AnimationFrame[]> {
  const textura = cena.textures.get(chaveTextura);
  const fonte = textura.source[0];
  const porDirecao: Record<string, Phaser.Types.Animations.AnimationFrame[]> = {};
  for (const [direcao, faixa] of Object.entries(folha.frames)) {
    porDirecao[direcao] = faixa.colunas.map((coluna, indice) => {
      const x0 = Math.floor((coluna * fonte.width) / folha.colunas);
      const x1 = Math.floor(((coluna + 1) * fonte.width) / folha.colunas);
      const y0 = Math.floor((faixa.linha * fonte.height) / folha.linhas);
      const y1 = Math.floor(((faixa.linha + 1) * fonte.height) / folha.linhas);
      const nome = `${direcao}-${indice}`;
      if (!textura.has(nome)) textura.add(nome, 0, x0, y0, x1 - x0, y1 - y0);
      return { key: chaveTextura, frame: nome };
    });
  }
  return porDirecao;
}

/**
 * Deixa um NPC pronto pra entrar em cena: recorta as duas folhas e cria as oito
 * animacoes (`walk`/`idle` x quatro direcoes).
 *
 * Devolve `false` quando a folha ainda nao chegou — quem chama trata, em vez de
 * criar um sprite com a textura ausente, que o Phaser desenha como um quadrado
 * verde no meio da rua.
 */
export function prepararNpc(cena: Phaser.Scene, def: NpcComFolha): boolean {
  if (!def.sprite) return true;
  if (!folhasNoCache(cena, def)) return false;
  const { andando: chaveAndando, parado: chaveParado } = chavesDoNpc(def);

  const andando = recortarFolhaNpc(cena, chaveAndando, def.sprite);
  // Sem folha de parado, o idle cai no 1o frame da caminhada — que e uma pose
  // de passo, e le como se o NPC estivesse andando no lugar.
  const parado = chaveParado !== null && def.spriteParado
    ? recortarFolhaNpc(cena, chaveParado, def.spriteParado)
    : null;

  for (const [direcao, frames] of Object.entries(andando)) {
    if (!cena.anims.exists(`npc-${def.id}-walk-${direcao}`)) {
      cena.anims.create({
        key: `npc-${def.id}-walk-${direcao}`,
        frames,
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!cena.anims.exists(`npc-${def.id}-idle-${direcao}`)) {
      cena.anims.create({
        key: `npc-${def.id}-idle-${direcao}`,
        frames: [(parado?.[direcao] ?? frames)[0]],
        frameRate: 1,
      });
    }
  }
  return true;
}

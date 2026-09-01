import Phaser from 'phaser';
import { estado } from '../game/estado';
import { petsVisiveis } from '../game/pets';
import type { EstadoDePet } from '../game/pets';

/**
 * CAMADA DOS BICHOS — os cachorros e gatos do mundo.
 *
 * Ela desenha o que `src/game/pets.ts` decide. A divisao e a mesma do resto do
 * projeto: la mora a regra (onde o bicho esta e o que ele faz), aqui mora o
 * sprite.
 *
 * O deslocamento fino e uma LISSAJOUS: duas senoides de periodo incomensuravel
 * em volta do ponto declarado. Nao ha fisica, nao ha colisao e nao ha
 * pathfinding — e por isso o bicho nunca atravessa parede: ele nunca sai do
 * circulo de raio `lugar.raio`, e a conferencia prova que o circulo inteiro e
 * chao livre.
 *
 * `seguir` e a unica excecao: nesse modo o alvo e o DONO, e o passo e uma
 * interpolacao lenta na direcao dele. Se o dono nao estiver desenhado (ele pode
 * estar dentro de um predio), o bicho volta pro circulo — nunca fica parado no
 * vazio esperando.
 */

/** Altura do bicho em TILES, por especie. Cachorro maior que gato. */
const ALTURA = { cachorro: 0.8, gato: 0.55 } as const;

/** Velocidade de perambulacao, em tiles por segundo. Bem devagar. */
const VELOCIDADE_VAGAR = 0.55;
/** Velocidade quando esta seguindo o dono. */
const VELOCIDADE_SEGUIR = 1.6;
/** A que distancia do dono ele para de seguir, em tiles. */
const DISTANCIA_DE_CONFORTO = 1.4;

interface PetVisual {
  estado: EstadoDePet;
  sprite: Phaser.GameObjects.Sprite;
  /** fase da lissajous, pra dois bichos iguais nao andarem em sincronia */
  fase: number;
  /** ultima animacao aplicada */
  animacao: string;
  /** posicao em TILES */
  x: number;
  y: number;
}

export interface DependenciasPets {
  /** posicao do dono, em TILES, quando ele esta desenhado; null quando nao */
  posicaoDoDono(npcId: string): { x: number; y: number } | null;
}

export class CamadaPets {
  private cena: Phaser.Scene;
  private tamanhoTile: number;
  private deps: DependenciasPets;
  private pets: PetVisual[] = [];
  /** assinatura do conjunto visivel, pra remontar so quando ele muda */
  private assinatura = '';
  private tempo = 0;

  constructor(cena: Phaser.Scene, tamanhoTile: number, deps: DependenciasPets) {
    this.cena = cena;
    this.tamanhoTile = tamanhoTile;
    this.deps = deps;
  }

  montar(minutos: number): void {
    this.sincronizar(minutos);
  }

  destruir(): void {
    for (const p of this.pets) p.sprite.destroy();
    this.pets = [];
    this.assinatura = '';
  }

  /**
   * Refaz a lista de bichos desenhados quando ela muda.
   *
   * A assinatura inclui o MODO porque o modo troca a folha (andando x parado):
   * um gato que sentou tem de trocar de textura, e nao so de animacao.
   */
  private sincronizar(minutos: number): void {
    const visiveis = petsVisiveis(estado.mapa, minutos);
    const assinatura = visiveis.map((e) => `${e.pet.id}:${e.modo}`).join(',');
    if (assinatura === this.assinatura) return;
    this.assinatura = assinatura;
    for (const p of this.pets) p.sprite.destroy();
    this.pets = [];

    const t = this.tamanhoTile;
    for (const e of visiveis) {
      const parado = e.modo === 'dormir' || e.modo === 'sentar';
      const textura = `pet-${e.pet.variante}-${parado ? 'parado' : 'andando'}`;
      if (!this.cena.textures.exists(textura)) continue;
      const sprite = this.cena.add.sprite(
        e.lugar.ponto.x * t,
        e.lugar.ponto.y * t,
        textura,
        'down-0',
      );
      const alturaConteudo = this.alturaDoConteudo(e.pet.variante);
      sprite.setScale((ALTURA[e.pet.especie] * t) / alturaConteudo);
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(sprite.y);
      this.pets.push({
        estado: e,
        sprite,
        fase: [...e.pet.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 100,
        animacao: '',
        x: e.lugar.ponto.x,
        y: e.lugar.ponto.y,
      });
    }
  }

  /**
   * Altura do bicho DENTRO do frame, em px.
   *
   * Vem de `pets.json`, que o processador escreve. Escalar pela altura da celula
   * (128) faria um gato deitado, que ocupa 60 px da celula, sair do tamanho de um
   * cachorro sentado, que ocupa 116.
   */
  private alturaDoConteudo(variante: string): number {
    const dados = this.cena.cache.json.get('pets') as
      | Record<string, { alturaConteudo?: number }>
      | undefined;
    return dados?.[variante]?.alturaConteudo || 100;
  }

  atualizar(deltaMs: number, minutos: number, pausado: boolean): void {
    this.sincronizar(minutos);
    if (pausado || this.pets.length === 0) return;
    this.tempo += deltaMs;
    const t = this.tamanhoTile;
    const dt = Math.min(0.05, deltaMs / 1000);

    for (const p of this.pets) {
      const { lugar, modo, pet } = p.estado;
      let alvoX = lugar.ponto.x;
      let alvoY = lugar.ponto.y;
      let velocidade = 0;

      if (modo === 'vagar') {
        const raio = lugar.raio ?? 2;
        // Lissajous: 1 e 1,37 de periodo nao fecham em ciclo curto, entao o
        // trajeto nao repete de forma visivel — e continua deterministico.
        alvoX += Math.cos(this.tempo / 2600 + p.fase) * raio;
        alvoY += Math.sin(this.tempo / 3560 + p.fase * 1.37) * raio * 0.7;
        velocidade = VELOCIDADE_VAGAR;
      } else if (modo === 'seguir') {
        const dono = pet.dono ? this.deps.posicaoDoDono(pet.dono) : null;
        if (dono) {
          const dx = dono.x - p.x;
          const dy = dono.y - p.y;
          if (Math.hypot(dx, dy) > DISTANCIA_DE_CONFORTO) {
            alvoX = dono.x;
            alvoY = dono.y;
            velocidade = VELOCIDADE_SEGUIR;
          } else {
            alvoX = p.x;
            alvoY = p.y;
          }
        } else {
          const raio = lugar.raio ?? 2;
          alvoX += Math.cos(this.tempo / 2600 + p.fase) * raio;
          alvoY += Math.sin(this.tempo / 3560 + p.fase * 1.37) * raio * 0.7;
          velocidade = VELOCIDADE_VAGAR;
        }
      }

      let direcao: 'down' | 'up' | 'left' | 'right' = 'down';
      let andando = false;
      if (velocidade > 0) {
        const dx = alvoX - p.x;
        const dy = alvoY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.04) {
          const passo = Math.min(dist, velocidade * dt);
          p.x += (dx / dist) * passo;
          p.y += (dy / dist) * passo;
          andando = true;
          direcao = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
        }
      }

      p.sprite.setPosition(p.x * t, p.y * t);
      p.sprite.setDepth(p.sprite.y);
      const animacao = `pet-${pet.variante}-${andando ? 'walk' : 'idle'}-${direcao}`;
      if (p.animacao !== animacao && this.cena.anims.exists(animacao)) {
        p.animacao = animacao;
        p.sprite.anims.play(animacao, true);
      }
    }
  }

  /** Quantos bichos estao desenhados agora, pro relatorio e pra conferencia. */
  get contagem(): number {
    return this.pets.length;
  }
}

import type Phaser from 'phaser';
import { estado } from '../../game/estado.ts';
import { NPCS } from '../../game/npcs.ts';
import { percentualDescontoNpc } from '../../game/loja.ts';
import { PC, caixa, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Navegador — dois abas: Blog (posts diarios do NPCs) e Relacionamento (status).
 *
 * BLOG: Posts diarios gerados por NPC, com seed deterministica. Cada NPC tem
 * sua voz e personalidade. O mesmo seed (dia) sempre produz os mesmos posts.
 *
 * RELACIONAMENTO: Lista de NPCs com quem ja houve interacao (score != 0).
 * Mostra coracaozinho (hearts), nivel do relacionamento com override aplicado,
 * e desconto (se for comerciante).
 */

type AbaNavegador = 'blog' | 'relacionamento';

// Posts de exemplo por NPC. Em producao seria um gerador determinístico.
const POSTS_POR_NPC: Record<string, readonly string[]> = {
  edu: [
    'Acordei cedo hoje. A cidade fica mais silenciosa no comeco do dia.',
    'Alguem sabe onde arruma um coracao de arduino? Preciso consertar um projeto.',
    'Assistindo o mercado se encher de gente. Sempre frenético nos dias de feira.',
  ],
  mari: [
    'Treino da manha foi bom! O corpo agradece a consistencia.',
    'Aquele isotônico novo chegou na farmacia. Vale muito a pena.',
    'Pensando em aumentar a serie de abdominal. Mais desafio!',
  ],
  jaqueline: [
    'Novo lote de pâes saiu quente do forno. Vem quentinho!',
    'O mercado ficou uma bagunça hoje. Mas o movimento foi bom.',
    'Notei que a farmacia ao lado nao tinha as biscoitos que eu vendo. Vantagem pra gente!',
  ],
  leticia: [
    'Capturei uma foto linda do por do sol de cima da colina.',
    'Olha que interessante a forma como a luz bate nas cores aqui.',
    'Pensando em montar um portfolio com as melhores fotos do mes.',
  ],
  wendel: [
    'Organizei tudo no cômodo de trás da loja. Muito mais eficiente assim.',
    'Uma tomada foi instalada no local certo. Sistema melhorou bastante.',
    'Quando as coisas estao no lugar certo, tudo flui melhor.',
  ],
  alice: [
    'Que dia agitado no bar! Praticamente lotado.',
    'Alguem vai na festa de sabado? Vou estar na roda de amigos.',
    'Descobri um remix que ta impecavel pra tocar na sexta. So animação!',
  ],
};

export class Navegador implements AppDoPc {
  readonly id = 'navegador';
  readonly titulo = 'Navegador';
  readonly glifo = '@';
  readonly cor = 0x3a7f8c;
  readonly resumo = 'Blog e Relacionamentos';

  private abaAtiva: AbaNavegador = 'blog';

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area, cena } = ctx;
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = cena.add.graphics();
    objetos.push(g);

    // --- abas ---
    const alturaAbas = 20;
    const abaX1 = area.x + 6;
    const abaX2 = area.x + 90;
    const abaY = area.y + 4;

    // Desenhar abas
    const abaBlog = cena.add
      .rectangle(abaX1 + 28, abaY + alturaAbas / 2, 56, alturaAbas - 2, this.abaAtiva === 'blog' ? PC.painelClaro : 0x2a3a45)
      .setStrokeStyle(1, PC.borda)
      .setInteractive({ useHandCursor: true });
    abaBlog.on('pointerdown', () => {
      this.abaAtiva = 'blog';
      // Reconstruir (idealmente seria mais elegante, mas funciona)
    });
    objetos.push(abaBlog);

    const abaRel = cena.add
      .rectangle(abaX2 + 50, abaY + alturaAbas / 2, 100, alturaAbas - 2, this.abaAtiva === 'relacionamento' ? PC.painelClaro : 0x2a3a45)
      .setStrokeStyle(1, PC.borda)
      .setInteractive({ useHandCursor: true });
    abaRel.on('pointerdown', () => {
      this.abaAtiva = 'relacionamento';
    });
    objetos.push(abaRel);

    objetos.push(
      texto(cena, abaX1 + 28, abaY + 2, 'Blog', {
        fontSize: '10px',
        color: this.abaAtiva === 'blog' ? PC.texto : PC.textoFraco,
      }),
    );
    objetos.push(
      texto(cena, abaX2 + 50, abaY + 2, 'Relacionamentos', {
        fontSize: '9px',
        color: this.abaAtiva === 'relacionamento' ? PC.texto : PC.textoFraco,
      }),
    );

    // --- area de conteudo ---
    const corpo = {
      x: area.x,
      y: area.y + alturaAbas + 6,
      w: area.w,
      h: area.h - alturaAbas - 6 - 13,
    };
    caixa(g, corpo, 0xf2efe6, PC.borda);

    if (this.abaAtiva === 'blog') {
      objetos.push(...this.renderBlog(ctx, corpo));
    } else {
      objetos.push(...this.renderRelacionamentos(ctx, corpo));
    }

    objetos.push(
      texto(cena, area.x, area.y + area.h - 11, `Dia ${estado.dia}`, {
        fontSize: '9px',
        color: PC.textoFraco,
      }),
    );

    return objetos;
  }

  private renderBlog(ctx: ContextoApp, corpo: { x: number; y: number; w: number; h: number }): Phaser.GameObjects.GameObject[] {
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const { cena } = ctx;

    // Usar seed deterministica do dia para selecionar posts
    // Simples: cada NPC contribui 1-3 posts por dia
    const posts: Array<{ autor: string; texto: string }> = [];
    const NPCIds = ['edu', 'mari', 'jaqueline', 'leticia', 'wendel', 'alice'];

    NPCIds.forEach((id) => {
      const postsPorEste = POSTS_POR_NPC[id] || [];
      const indice = (estado.dia * 7919 + id.length * 131) % postsPorEste.length;
      const post = postsPorEste[indice];
      if (post) {
        posts.push({ autor: id, texto: post });
      }
    });

    // Renderizar posts em ordem inversa (mais novos primeiro)
    const postsOrdenados = posts.reverse();
    const y0 = corpo.y + 10;
    const lineHeight = 32;
    const maxLines = Math.floor((corpo.h - 10) / lineHeight);

    postsOrdenados.slice(0, maxLines).forEach((post, i) => {
      const y = y0 + i * lineHeight;
      const npcObj = NPCS[post.autor as keyof typeof NPCS];
      const nomeNpc = npcObj?.nome || post.autor;

      objetos.push(
        texto(cena, corpo.x + 12, y, `${nomeNpc}:`, {
          fontSize: '9px',
          color: '#5b6c7f',
          fontStyle: 'bold',
        }),
      );
      objetos.push(
        texto(cena, corpo.x + 12, y + 12, post.texto, {
          fontSize: '8px',
          color: '#2a2b2e',
          wordWrap: { width: corpo.w - 24 },
        }),
      );
    });

    return objetos;
  }

  private renderRelacionamentos(ctx: ContextoApp, corpo: { x: number; y: number; w: number; h: number }): Phaser.GameObjects.GameObject[] {
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const { cena } = ctx;

    // Listar NPCs com score != 0
    const npcInteragidos = estado.relacoes.npcsBocaAberta();
    if (npcInteragidos.length === 0) {
      objetos.push(
        texto(cena, corpo.x + 12, corpo.y + 10, 'Nenhum relacionamento ainda.', {
          fontSize: '9px',
          color: PC.textoFraco,
        }),
      );
      return objetos;
    }

    const y0 = corpo.y + 10;
    const lineHeight = 24;
    const maxLines = Math.floor((corpo.h - 10) / lineHeight);

    npcInteragidos.slice(0, maxLines).forEach((npcId, i) => {
      const y = y0 + i * lineHeight;
      const npcObj = NPCS[npcId as keyof typeof NPCS];
      const npcNome = npcObj?.nome || npcId;
      const score = estado.relacoes.getScore(npcId);
      const label = estado.relacoes.getNivel(npcId);

      // Coracaozinho visual (simples: X de 12, com metade pra meia unidade)
      const coracao = this.coracaozinho(score);

      // Desconto se aplicavel
      let textoDesconto = '';
      if (npcObj?.casa !== 'casa_1') {
        const desconto = percentualDescontoNpc(npcId);
        if (desconto > 0) {
          textoDesconto = ` (-${Math.round(desconto * 100)}%)`;
        }
      }

      objetos.push(
        texto(cena, corpo.x + 12, y, `${npcNome}  ${coracao}  ${label}${textoDesconto}`, {
          fontSize: '9px',
          color: '#2a2b2e',
        }),
      );
    });

    return objetos;
  }

  /** Criar representacao visual de hearts baseado no score (-12 a 12). */
  private coracaozinho(score: number): string {
    // Score vai de -12 a 12
    // Vamos representar como 6 posicoes no coracaozinho (0-12 = 0-6, negativo = quebrado)
    if (score < 0) {
      // Coração quebrado pra negativo
      return '💔';
    }
    if (score === 0) {
      return '  '; // Vazio
    }

    // Para score positivo, usar número de corações
    // score 0.5-2.5 = 1 coração, 3-4.5 = 2, etc
    const corações = Math.round(score / 2);
    return '❤'.repeat(Math.min(corações, 6));
  }
}

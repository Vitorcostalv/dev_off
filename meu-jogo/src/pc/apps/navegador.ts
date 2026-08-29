import type Phaser from 'phaser';
import { UI } from '../../game/config.ts';
import { PC, caixa, texto } from '../widgets.ts';
import type { AppDoPc, ContextoApp } from '../tipos.ts';

/**
 * Navegador — barra de endereco e uma pagina estatica.
 *
 * ===========================================================================
 * SHELL VISUAL. Nao ha navegacao: a barra nao aceita digitacao e os links da
 * pagina nao levam a lugar nenhum.
 * ===========================================================================
 * ONDE A LOGICA REAL VAI ENTRAR:
 *
 *  1. `PAGINAS` abaixo vira um catalogo de verdade em `src/game/paginas.ts`,
 *     com id, url, titulo e conteudo — o mesmo formato de catalogo estatico de
 *     `game/itens.ts`.
 *  2. A barra de endereco vira campo editavel: a ComputadorScene ja intercepta
 *     tudo do teclado e repassa em `aoTeclar`, entao basta este app acumular os
 *     caracteres em vez de devolver false.
 *  3. `ir(url)` resolve a url no catalogo e troca o conteudo. Url desconhecida
 *     cai numa pagina de erro — que ja e uma das paginas do catalogo.
 *  4. Se o navegador for a porta de entrada de algum sistema (banco, email,
 *     forum de vagas), a pagina correspondente chama o modulo de jogo direto;
 *     dinheiro continua so por `estado.carteira`.
 */

interface PaginaEstatica {
  url: string;
  titulo: string;
  linhas: readonly string[];
}

const PAGINAS: readonly PaginaEstatica[] = [
  {
    url: 'inicio://nova-aba',
    titulo: 'Nova aba',
    linhas: [
      'BEM-VINDO A INTERNET',
      '',
      'Esta e a pagina inicial do navegador. Ela ainda e estatica:',
      'a barra de endereco nao aceita digitacao e os links abaixo',
      'nao levam a lugar nenhum.',
      '',
      'Atalhos salvos',
      '  ·  devstore.local        loja de eletronicos (use o app)',
      '  ·  vagas.cidade          mural de trabalho (use o app)',
      '  ·  clima.cidade          previsao do tempo',
      '  ·  forum.dev             forum de programacao',
      '',
      'Historico',
      '  (vazio)',
    ],
  },
];

export class Navegador implements AppDoPc {
  readonly id = 'navegador';
  readonly titulo = 'Navegador';
  readonly glifo = '@';
  readonly cor = 0x3a7f8c;
  readonly resumo = 'Paginas da cidade';

  montar(ctx: ContextoApp): Phaser.GameObjects.GameObject[] {
    const { area } = ctx;
    const pagina = PAGINAS[0];
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const g = ctx.cena.add.graphics();
    objetos.push(g);

    // --- barra de navegacao ---
    const alturaBarra = 18;
    caixa(g, { x: area.x, y: area.y, w: area.w, h: alturaBarra }, PC.painelClaro, PC.borda);

    const setas = texto(ctx.cena, area.x + 7, area.y + 4, '<   >   ⟳', {
      fontSize: '10px',
      color: '#4d5769', // cinza de "sem historico pra voltar"
    });
    // campo de endereco: desenhado como caixa de input, mas inerte por enquanto
    const campo = { x: area.x + 56, y: area.y + 3, w: area.w - 66, h: alturaBarra - 6 };
    caixa(g, campo, 0x0d1119, PC.borda);
    const url = texto(ctx.cena, campo.x + 6, campo.y + 2, pagina.url, {
      fontSize: '9px',
      color: PC.textoFraco,
    });
    objetos.push(setas, url);

    // --- area da pagina ---
    const corpo = {
      x: area.x,
      y: area.y + alturaBarra + 5,
      w: area.w,
      h: area.h - alturaBarra - 5 - 13,
    };
    caixa(g, corpo, 0xf2efe6, PC.borda); // pagina "de papel", pra contrastar com o SO

    const conteudo = ctx.cena.add.text(corpo.x + 12, corpo.y + 10, pagina.linhas.join('\n'), {
      fontFamily: UI.fonte,
      fontSize: '9px',
      color: '#2a2b2e',
      lineSpacing: 2,
    });
    objetos.push(conteudo);

    objetos.push(
      texto(ctx.cena, area.x, area.y + area.h - 11, 'Navegacao ainda nao implementada.', {
        fontSize: '9px',
        color: PC.alerta,
      }),
    );

    return objetos;
  }
}

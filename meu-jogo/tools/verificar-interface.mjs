/**
 * Padronizacao da interface: tokens, molduras e dono de foco.
 *
 * Existe por causa de duas medicoes no codigo das telas:
 *
 *   1. SETENTA E QUATRO tamanhos de fonte escritos a mao, em dez valores
 *      diferentes (8, 9, 10, 11, 12, 13, 15, 18, 20 e 22px) numa tela de 270px
 *      de altura — com 10 e 11 repetidos a mao mesmo ja tendo token. Dez degraus
 *      de escala nao foi decisao de ninguem: foi cada tela ter nascido num dia
 *      diferente;
 *   2. CINCO molduras de painel copiadas, com cinco opacidades diferentes
 *      (0,95, 0,96, 0,97 e 1 duas vezes) e o titulo em quatro alturas
 *      diferentes (y+6, y+7, y+8 e y+13).
 *
 * E por causa de um bug que as duas escondiam: as seis janelas decidiam sozinhas
 * se podiam abrir, cada uma com a sua propria lista de guardas — e as listas
 * discordavam entre si.
 *
 * O que este validador cobra, lendo o FONTE das telas:
 *
 *   1. nenhum `fontSize` cru: todo tamanho sai da tabela `UI`;
 *   2. a escala de texto tem no maximo oito degraus e todos tem nome;
 *   3. nenhuma janela desenha a propria moldura: `fillRect` + `strokeRect` de
 *      painel sai de `scenes/widgets.ts` ou de `pc/widgets.ts`;
 *   4. a UIScene nao tem guarda de foco escrita a mao — todas passam pela pilha;
 *   5. a pilha de foco se comporta: as 6 janelas em toda ordem de abertura de
 *      ate 4 de profundidade sempre deixam UM dono do teclado, e a janela que
 *      recebe a tecla e sempre a ultima que abriu.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { UI } from '../src/game/config.ts';
import { PilhaDeFoco, JANELAS, camadaDaJanela } from '../src/game/foco.ts';

const raiz = new URL('../src/', import.meta.url);
let conferencias = 0;
const ok = (mensagem, condicao) => { assert(condicao, mensagem); conferencias += 1; };

// ------------------------------------------------------------------ fontes --

const fontes = [];
const varrer = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) varrer(f);
    else if (e.name.endsWith('.ts')) fontes.push(f);
  }
};
varrer(path.resolve(raiz.pathname.replace(/^\/([A-Za-z]:)/, '$1')));

const conteudo = new Map(fontes.map((f) => [f, readFileSync(f, 'utf8')]));
const relativo = (f) => path.relative(process.cwd(), f).split(path.sep).join('/');

/** As duas tabelas de cor. Sao os unicos arquivos que podem escrever cor crua. */
const KITS_DE_COR = new Set(['src/game/config.ts', 'src/pc/widgets.ts']);

/**
 * Branco e preto nao contam como cor repetida.
 *
 * Os dois sao IDENTIDADES, nao escolhas de paleta: branco e o "sem tinta" de
 * quem vai receber \`setTint\` e preto com alfa e "escurece o que esta atras". A
 * vegetacao de primavera usar branco (\`AmbienteMundo\`) e o slot vazio do
 * inventario usar preto nao e uma tela repetindo a decisao da outra — e as duas
 * usando o elemento neutro da operacao.
 */
const IDENTIDADES = new Set(['0xffffff', '0x000000', "'#ffffff'", "'#000000'"]);

// 1. nenhum tamanho de fonte cru
//
// As duas formas contam: a literal (`'12px'`) e a montada em template
// (`` `${size}px` ``). A segunda foi a que escondeu a escala inteira da
// MenuScene de uma versao anterior deste validador — cinco tamanhos passando
// por um parametro numerico.
for (const [f, texto] of conteudo) {
  const crus = [...texto.matchAll(/fontSize:\s*'(\d+)px'/g)].map((m) => m[1]);
  const montados = [...texto.matchAll(/fontSize:\s*`[^`]*\$\{[^}]*\}px`/g)].map(() => 'template');
  const todos = [...crus, ...montados];
  ok(
    `${relativo(f)}: ${todos.length} tamanho(s) de fonte cru(s) (${[...new Set(todos)].join(', ')}). ` +
      'Batize um token em game/config.ts e use ele — a escala nao pode crescer as escondidas.',
    todos.length === 0,
  );
}

// nem familia de fonte crua: uma tela com outra familia sai de escala junto
for (const [f, texto] of conteudo) {
  const rel = relativo(f);
  if (rel === 'src/game/config.ts') continue;
  const familias = [...texto.matchAll(/fontFamily:\s*'([^']+)'/g)].map((m) => m[1]);
  ok(`${rel}: familia de fonte crua (${familias.join(', ')}). Use UI.fonte.`, familias.length === 0);
}

// 2. a escala tem nome e nao passa de oito degraus
const degraus = Object.entries(UI).filter(([k, v]) => k.startsWith('tamanho') && typeof v === 'string');
ok(
  `a escala de texto tem ${degraus.length} degraus; oito e o teto pra uma tela de 270px`,
  degraus.length <= 8,
);
ok('todo degrau da escala e um valor em px', degraus.every(([, v]) => /^\d+px$/.test(v)));
const valores = degraus.map(([, v]) => parseInt(v, 10));
ok(
  `dois degraus da escala tem o mesmo tamanho: ${degraus.map(([k, v]) => `${k}=${v}`).join(' ')}`,
  new Set(valores).size === valores.length,
);

// ------------------------------------------------------------------ cores --

/**
 * As telas de MOLDURA — as que desenham o quadro em volta do conteudo — nao
 * escrevem cor: elas pedem pro token.
 *
 * Os APPS do PC ficam de fora de proposito: cada um tem a sua cor de identidade
 * (o azul da loja, o dourado das conquistas) e o navegador tem uma paleta
 * semantica propria pra pagina. O que os apps NAO podem e repetir um valor que
 * ja tem nome — e isso a conferencia seguinte cobra.
 */
const CHROME = [
  'src/scenes/UIScene.ts',
  'src/scenes/ComputadorScene.ts',
  'src/pc/JanelaApp.ts',
];
for (const rel of CHROME) {
  const f = [...conteudo.keys()].find((k) => relativo(k) === rel);
  ok(`${rel} existe`, Boolean(f));
  const cruas = [...conteudo.get(f).matchAll(/0x[0-9a-fA-F]{6}(?![0-9a-fA-F])|'#[0-9a-fA-F]{3,6}'/g)].map((m) => m[0]);
  ok(
    `${rel}: ${cruas.length} cor(es) crua(s) (${[...new Set(cruas)].join(', ')}). ` +
      'Moldura nao escolhe cor — batize o token em game/config.ts (UI) ou pc/widgets.ts (PC).',
    cruas.length === 0,
  );
}

// nenhuma cor com nome escrita crua em outro lugar
const nomeados = new Map();
for (const [rel, tabela] of [['src/game/config.ts', 'UI'], ['src/pc/widgets.ts', 'PC']]) {
  const f = [...conteudo.keys()].find((k) => relativo(k) === rel);
  // SO o bloco da tabela: `config.ts` tambem tem a cor de cada zona do mapa
  // (`academia: 0xff8f7f`), que e dado de mapa e nao token de interface —
  // varrer o arquivo inteiro fazia a cor do fantasma de movel bater com ela
  const texto = conteudo.get(f);
  const inicio = texto.indexOf(`export const ${tabela} = {`);
  ok(`${rel} declara a tabela ${tabela}`, inicio >= 0);
  const bloco = texto.slice(inicio, texto.indexOf('} as const;', inicio));
  for (const m of bloco.matchAll(/^ {2}(\w+):\s*(0x[0-9a-fA-F]{6}(?![0-9a-fA-F])|'#[0-9a-fA-F]{3,6}')/gm)) {
    nomeados.set(m[2].toLowerCase(), `${tabela}.${m[1]}`);
  }
}
ok(`as tabelas de cor tem nome pra ${nomeados.size} valores`, nomeados.size >= 15);
// so a camada de APRESENTACAO (`scenes/` e `pc/`). Uma tabela de dados como
// `game/inventario.ts` declara a cor de uma categoria de item, e ela coincidir
// com um token de interface e coincidencia — nao repeticao de decisao visual.
for (const [f, texto] of conteudo) {
  const rel = relativo(f);
  if (KITS_DE_COR.has(rel) || !rel.startsWith('src/scenes/') && !rel.startsWith('src/pc/')) continue;
  const repetidas = [...texto.matchAll(/0x[0-9a-fA-F]{6}(?![0-9a-fA-F])|'#[0-9a-fA-F]{3,6}'/g)]
    .map((m) => m[0])
    .filter((c) => !IDENTIDADES.has(c.toLowerCase()))
    .filter((c) => nomeados.has(c.toLowerCase()));
  ok(
    `${rel}: ${repetidas.length} cor(es) escrita(s) crua(s) tendo nome: ` +
      repetidas.map((c) => `${c} e ${nomeados.get(c.toLowerCase())}`).join(', '),
    repetidas.length === 0,
  );
}

// ---------------------------------------------------------------- molduras --

// 3. moldura de painel so nos dois kits de widget
const KITS = new Set(['src/scenes/widgets.ts', 'src/pc/widgets.ts']);
for (const [f, texto] of conteudo) {
  const rel = relativo(f);
  if (KITS.has(rel)) continue;
  // `strokeRect` com o +0.5 e a assinatura de moldura de painel alinhada ao
  // pixel; no mundo (FarmScene) o traco de zona nao usa o meio-pixel
  const molduras = [...texto.matchAll(/strokeRect\([^)]*\+ 0\.5/g)];
  ok(
    `${rel}: ${molduras.length} moldura(s) de painel desenhada(s) a mao. ` +
      'Use `moldura`/`cova` de scenes/widgets.ts (ou `caixa` de pc/widgets.ts).',
    molduras.length === 0,
  );
}

// os dois kits existem e exportam o que as telas usam
const kitJogo = conteudo.get([...conteudo.keys()].find((f) => relativo(f) === 'src/scenes/widgets.ts'));
ok('scenes/widgets.ts existe', Boolean(kitJogo));
for (const nome of ['moldura', 'cova', 'tituloDePainel', 'dicaDePainel', 'rodapeDePainel']) {
  ok(`scenes/widgets.ts exporta ${nome}`, kitJogo.includes(`export function ${nome}`));
}

// ------------------------------------------------------------------- foco --

// 4. a UIScene nao tem guarda de foco escrita a mao
const ui = conteudo.get([...conteudo.keys()].find((f) => relativo(f) === 'src/scenes/UIScene.ts'));
ok('UIScene.ts existe', Boolean(ui));
ok(
  'UIScene ainda tem `modalPorCima` — a regra de quem abre sobre quem voltou pra dentro da cena',
  !ui.includes('modalPorCima'),
);
ok('UIScene usa a pilha de foco', ui.includes('new PilhaDeFoco()'));
// so `desmontar` esconde janela: e o que impede pilha e tela de divergirem
const esconde = [...ui.matchAll(/this\.(dialogo|confirmacao|menu|inventario|loja)\.setVisible\(false\)/g)];
ok(
  `${esconde.length} janela(s) escondida(s) fora de \`desmontar\`: ${esconde.map((m) => m[1]).join(', ')}. ` +
    'Esconder por fora deixa a pilha achando que a janela esta aberta.',
  esconde.length === 5, // as cinco linhas do proprio `desmontar`
);
// a DECLARACAO do metodo, nao a chamada: procurar pelo nome com `indexOf`
// pegaria o primeiro `this.abrirArquivo()` do arquivo, que e outra coisa
const linhasUi = ui.split(/\r?\n/);
const semPilha = [];
for (let i = 0; i < linhasUi.length; i++) {
  const nome = /^ {2}(?:private )?(abrir[A-Z]\w*)\(/.exec(linhasUi[i])?.[1];
  if (!nome) continue;
  // do cabecalho ate o `  }` que fecha o metodo
  let fim = i + 1;
  while (fim < linhasUi.length && linhasUi[fim].trimEnd() !== '  }') fim += 1;
  const corpo = linhasUi.slice(i, fim).join('\n');
  if (!/tomarFoco|podeAbrir/.test(corpo)) semPilha.push(nome);
}
ok(
  `abridor(es) de janela sem passar pela pilha: ${semPilha.join(', ')}`,
  semPilha.length === 0,
);

// 5. a pilha se comporta em toda ordem de abertura
{
  ok('as seis janelas estao declaradas', JANELAS.length === 6);
  // toda sequencia de abrir de ate 4 de profundidade
  let sequencias = 0;
  const andar = (pilha, caminho, profundidade) => {
    sequencias += 1;
    // invariante 1: o topo e sempre a ultima que a pilha aceitou
    const abertas = pilha.abertas;
    if (abertas.length > 0) {
      assert.equal(pilha.topo, abertas[abertas.length - 1], `topo fora de ordem em ${caminho.join('>')}`);
    }
    // invariante 2: a camada nunca desce ao subir a pilha — senao uma janela
    // de baixo estaria recebendo tecla por cima de uma de cima
    for (let i = 1; i < abertas.length; i++) {
      assert(
        camadaDaJanela(abertas[i]) >= camadaDaJanela(abertas[i - 1]),
        `camada desce dentro da pilha em ${caminho.join('>')}: ${abertas.join(',')}`,
      );
    }
    // invariante 3: nunca duas janelas de conteudo ao mesmo tempo (as duas
    // usariam as mesmas setas pra coisas diferentes)
    const conteudo = abertas.filter((j) => camadaDaJanela(j) === 1);
    assert(conteudo.length <= 1, `duas janelas de conteudo abertas em ${caminho.join('>')}: ${conteudo}`);
    // invariante 4: bloqueado e o mesmo que ter alguem na pilha
    assert.equal(pilha.bloqueado, abertas.length > 0, `bloqueado divergiu em ${caminho.join('>')}`);
    if (profundidade === 0) return;
    for (const j of JANELAS) {
      const copia = new PilhaDeFoco();
      for (const aberta of abertas) copia.abrir(aberta);
      const { ok: aceitou } = copia.abrir(j);
      if (!aceitou) {
        // recusa nao muda nada: a pilha tem de sair igual a como entrou
        assert.deepEqual([...copia.abertas], [...abertas], `recusa mexeu na pilha em ${caminho.join('>')}+${j}`);
        continue;
      }
      andar(copia, [...caminho, j], profundidade - 1);
    }
  };
  andar(new PilhaDeFoco(), [], 4);
  conferencias += sequencias;
  console.log(`[interface] ${sequencias} sequencias de abertura conferidas`);

  // fechar devolve o teclado pra quem estava por baixo
  const pilha = new PilhaDeFoco();
  pilha.abrir('loja');
  pilha.abrir('dialogo');
  pilha.abrir('confirmacao');
  ok('a pergunta esta no topo', pilha.topo === 'confirmacao');
  pilha.fechar('confirmacao');
  ok('fechar a pergunta devolve o teclado pra fala', pilha.topo === 'dialogo');
  pilha.fechar('dialogo');
  ok('fechar a fala devolve o teclado pra loja', pilha.topo === 'loja');
  pilha.fechar('loja');
  ok('fechar a loja devolve o teclado pro jogo', pilha.topo === null && !pilha.bloqueado);

  // o caso que estava errado antes da pilha: pergunta por cima de menu
  const p2 = new PilhaDeFoco();
  p2.abrir('menu');
  ok('a pergunta abre por cima do menu', p2.abrir('confirmacao').ok);
  ok('e e ela que recebe o ESC', p2.topo === 'confirmacao');

  // e o outro: retrato aberto por baixo do menu de assunto
  const p3 = new PilhaDeFoco();
  p3.abrir('dialogo');
  p3.abrir('menu');
  ok('o retrato continua aberto por baixo do menu', p3.aberta('dialogo') && p3.aberta('menu'));
  ok('mas e o menu que recebe a tecla', p3.topo === 'menu');

  // trocar janela de conteudo fecha a de tras
  const p4 = new PilhaDeFoco();
  p4.abrir('inventario');
  const troca = p4.abrir('loja');
  ok('abrir a loja fecha o inventario', troca.ok && troca.fechar.includes('inventario'));
  ok('e sobra so a loja', p4.abertas.length === 1 && p4.topo === 'loja');

  // nada abre por cima da pergunta
  const p5 = new PilhaDeFoco();
  p5.abrir('confirmacao');
  for (const j of JANELAS.filter((j) => j !== 'confirmacao')) {
    ok(`${j} nao abre por cima da pergunta`, !p5.podeAbrir(j));
  }
}

console.log(`[interface] ${conferencias} conferencias passaram`);

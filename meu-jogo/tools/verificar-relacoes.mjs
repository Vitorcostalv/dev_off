// Conferencia do relacionamento: score, rotulo, limite diario, presentes,
// desconto no comercio, vagas de codigo multi-etapa e quebra-cabeca de conserto.
// Rode com: npm run verificar-relacoes
//
// Roda o codigo DE VERDADE do jogo fora do navegador, com um localStorage de
// mentira — mesma tecnica de `verificar-economia`. O que se prova aqui e o que
// nao da pra ver so jogando: que o limite diario sobrevive ao save, que o
// desconto realmente chega ao caixa, que uma vaga de 5 etapas monta 5 perguntas
// DIFERENTES e que nenhum tabuleiro de conserto sai impossivel.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (chave) => memoria.get(chave) ?? null,
  setItem: (chave, valor) => memoria.set(chave, String(valor)),
  removeItem: (chave) => memoria.delete(chave),
};

const [
  { SistemaRelacoes, nivelDeScore, rotuloRelacao },
  { PREFERENCIAS_NPCS, calcularTierPresente, reacaoPresente },
  { TEMAS_POR_NPC, PONTOS_POR_REACAO, esquecerVariacoes, falasDoTema, temasDoDia },
  { POSTS_POR_NPC, feedAte, postDoDia },
  { CATALOGO_ITENS },
  {
    CONSERTO_POR_DIFICULDADE,
    MAX_ETAPAS_CODIGO,
    PERGUNTAS,
    etapasDeCodigo,
    fatiaDeDificuldade,
    pagamentoDeVagaDeCodigo,
    DESTINOS_DE_ENTREGA,
    pagamentoDeConserto,
    pecasDoConserto,
    perguntasDaVaga,
    quadroDoDia,
  },
  { APARELHOS },
  { NPCS },
  { PONTOS_DE_LOJA, comprar, esquecerUltimaCompra, percentualDescontoNpc, precoNoPonto },
  { buscarItemDeLoja },
  { estado },
  { carregar, salvar },
] = await Promise.all([
  import('../src/game/relacoes.ts'),
  import('../src/game/presentes.ts'),
  import('../src/game/dialogo.ts'),
  import('../src/game/blog.ts'),
  import('../src/game/itens.ts'),
  import('../src/game/trabalhos.ts'),
  import('../src/game/aparelhos.ts'),
  import('../src/game/npcs.ts'),
  import('../src/game/loja.ts'),
  import('../src/game/itens.ts'),
  import('../src/game/estado.ts'),
  import('../src/game/save.ts'),
]);

let passos = 0;
function conferir(condicao, mensagem) {
  passos += 1;
  if (!condicao) {
    console.error(`[relacoes] FALHOU: ${mensagem}`);
    process.exit(1);
  }
}

// Os adultos com perfil escrito: 5 a 8 temas cada.
const NPCS_COM_PERFIL = [
  'edu', 'mari', 'jaqueline', 'leticia', 'wendel', 'alice', 'hiago', 'vitor',
];
// O Luke tem 12 anos e conversa menos: 3 a 4 temas bastam. Fica numa faixa
// propria pra a conferencia nao cobrar dele o repertorio de um adulto.
const NPCS_CRIANCA = ['luke'];
const TODOS_COM_PERFIL = [...NPCS_COM_PERFIL, ...NPCS_CRIANCA];

// ------------------------------------------------------------- score --
{
  const r = new SistemaRelacoes();
  conferir(r.getScore('edu') === 0, 'NPC novo devia comecar em 0');
  conferir(!r.jaInteragiu('edu'), 'NPC novo nao devia contar como interagido');

  r.ganharRelacao('edu', 0.5);
  conferir(r.getScore('edu') === 0.5, 'incremento de 0,5 nao aplicou');
  conferir(r.jaInteragiu('edu'), 'ganhar ponto devia marcar como interagido');

  r.ganharRelacao('edu', 100);
  conferir(r.getScore('edu') === 12, `teto de 12 furou: ${r.getScore('edu')}`);
  r.perderRelacao('edu', 100);
  conferir(r.getScore('edu') === -12, `piso de -12 furou: ${r.getScore('edu')}`);

  const r2 = new SistemaRelacoes();
  r2.ganharRelacao('mari', 0.3);
  conferir(r2.getScore('mari') === 0.5, 'valor fora do passo devia arredondar pra 0,5');

  // NPC neutro: interagiu, score 0, e mesmo assim aparece na lista
  const r3 = new SistemaRelacoes();
  r3.registrarInteracao('leticia');
  conferir(r3.getScore('leticia') === 0, 'registrarInteracao nao pode mexer no score');
  conferir(
    r3.listaInteragidos().includes('leticia'),
    'conversa neutra (score 0) tem de aparecer na lista de interagidos',
  );
  console.log('  score: passo de 0,5, piso -12, teto 12, e "interagido" separado do score');
}

// ------------------------------------------------------------ rotulo --
{
  const faixas = [
    [-0.5, 'Estranho'], [0, 'Conhecido'], [3.5, 'Conhecido'],
    [4, 'Amigo'], [7.5, 'Amigo'],
    [8, 'Namorando'], [11.5, 'Namorando'],
    [12, 'Casamento'],
  ];
  for (const [score, nivel] of faixas) {
    conferir(nivelDeScore(score) === nivel, `score ${score} devia ser ${nivel}, veio ${nivelDeScore(score)}`);
  }

  // Jaqueline e casada: o override vale pro TIER INTEIRO, nao so pro valor exato
  conferir(rotuloRelacao('jaqueline', 8) === 'Confianca profunda', 'override da Jaqueline em 8 falhou');
  conferir(
    rotuloRelacao('jaqueline', 9.5) === 'Confianca profunda',
    'override da Jaqueline devia valer no tier inteiro, nao so no 8 exato',
  );
  conferir(rotuloRelacao('jaqueline', 12) === 'Amizade de familia', 'override da Jaqueline em 12 falhou');
  conferir(rotuloRelacao('jaqueline', 4) === 'Amigo', 'Jaqueline nao devia ter override em Amigo');
  // Wendel e viuvo: disponivel pra romance, sem override
  conferir(rotuloRelacao('wendel', 8) === 'Namorando', 'Wendel nao devia ter override de rotulo');
  console.log('  rotulo: faixas certas e override da Jaqueline valendo no tier inteiro');
}

// ------------------------------------------------- limite diario + save --
{
  const r = new SistemaRelacoes();
  conferir(r.podeConversar('alice', 3), 'primeira conversa do dia devia poder pontuar');
  r.registrarConversa('alice', 3);
  conferir(!r.podeConversar('alice', 3), 'segunda conversa no MESMO dia nao pode pontuar');
  conferir(r.podeConversar('alice', 4), 'a trava tem de soltar quando o dia vira');

  conferir(r.podePresentear('alice', 3), 'primeiro presente do dia devia poder pontuar');
  r.registrarPresente('alice', 3);
  conferir(!r.podePresentear('alice', 3), 'segundo presente no MESMO dia nao pode pontuar');

  r.ganharRelacao('alice', 2.5);
  const copia = new SistemaRelacoes();
  copia.restaurar(JSON.parse(JSON.stringify(r.serializar())));
  conferir(copia.getScore('alice') === 2.5, 'o score nao sobreviveu ao save');
  conferir(!copia.podeConversar('alice', 3), 'o limite diario de conversa nao sobreviveu ao save');
  conferir(!copia.podePresentear('alice', 3), 'o limite diario de presente nao sobreviveu ao save');
  conferir(copia.jaInteragiu('alice'), 'a marca de interagido nao sobreviveu ao save');

  // formato antigo (so o array de scores) nao pode derrubar o save
  const antigo = new SistemaRelacoes();
  antigo.restaurar([['edu', 3], ['mari', 1.5]]);
  conferir(antigo.getScore('edu') === 3, 'save no formato antigo devia continuar carregando');

  // lixo nao pode derrubar nem contaminar
  const sujo = new SistemaRelacoes();
  sujo.restaurar({ scores: [['edu', 'x'], null, ['mari', 2]], interagidos: [1, 'alice'] });
  conferir(sujo.getScore('edu') === 0, 'entrada invalida devia ser ignorada');
  conferir(sujo.getScore('mari') === 2, 'entrada valida ao lado de lixo devia entrar');
  conferir(sujo.jaInteragiu('alice'), 'interagido valido ao lado de lixo devia entrar');
  console.log('  limite diario: conversa e presente pontuam 1x por dia e sobrevivem ao save');
}

// --------------------------------------------------------- presentes --
{
  const idsValidos = new Set(CATALOGO_ITENS.map((i) => i.id));
  for (const [npcId, prefs] of Object.entries(PREFERENCIAS_NPCS)) {
    for (const tier of ['amado', 'gosta', 'neutro', 'nao_gosta']) {
      for (const id of prefs[tier] ?? []) {
        conferir(idsValidos.has(id), `presente de ${npcId}: "${id}" nao existe no CATALOGO_ITENS`);
      }
    }
    // um item so pode estar num tier: em duas listas, a ordem do if decidiria
    // em silencio qual vale
    const todos = [...prefs.amado, ...prefs.gosta, ...(prefs.neutro ?? []), ...prefs.nao_gosta];
    conferir(new Set(todos).size === todos.length, `${npcId} tem o mesmo item em dois tiers`);
  }
  for (const npcId of TODOS_COM_PERFIL) {
    conferir(PREFERENCIAS_NPCS[npcId], `${npcId} esta sem tabela de presente`);
    conferir(PREFERENCIAS_NPCS[npcId].amado.length > 0, `${npcId} nao tem nenhum presente amado`);
    for (const tier of ['amado', 'gosta', 'neutro', 'nao_gosta']) {
      conferir(reacaoPresente(npcId, tier).length > 0, `${npcId} sem reacao de "${tier}"`);
    }
  }
  conferir(calcularTierPresente('jaqueline', 'cookies') === 'amado', 'cookies devia ser amado da Jaqueline');
  conferir(calcularTierPresente('jaqueline', 'drone') === 'nao_gosta', 'drone devia desagradar a Jaqueline');
  conferir(calcularTierPresente('jaqueline', 'arroz') === 'neutro', 'arroz devia ser neutro pra Jaqueline');
  conferir(
    calcularTierPresente('jaqueline', 'item_que_nao_existe') === 'neutro',
    'item desconhecido devia cair em neutro',
  );
  console.log(
    `  presentes: ${Object.keys(PREFERENCIAS_NPCS).length} tabelas, todas as ids batem com o catalogo`,
  );
}

// ------------------------------------------------------------- temas --
{
  for (const npcId of TODOS_COM_PERFIL) {
    const crianca = NPCS_CRIANCA.includes(npcId);
    const [minimo, maximo] = crianca ? [3, 4] : [5, 8];
    const temas = TEMAS_POR_NPC[npcId] ?? [];
    conferir(
      temas.length >= minimo && temas.length <= maximo,
      `${npcId} tem ${temas.length} temas; o combinado e ${minimo} a ${maximo}`,
    );
    conferir(new Set(temas.map((t) => t.id)).size === temas.length, `${npcId} tem tema com id repetido`);
    conferir(temas.some((t) => t.reacao === 'gosta'), `${npcId} nao tem nenhum tema que ele gosta`);
    conferir(temas.some((t) => t.reacao === 'nao_gosta'), `${npcId} nao tem nenhum tema que ele evita`);
    for (const tema of temas) {
      conferir(tema.rotulo.length > 0, `tema "${tema.id}" de ${npcId} esta sem rotulo`);
      // 2 a 3 variacoes por tema: e o que impede a mesma escolha devolver
      // sempre o mesmo texto
      conferir(
        tema.variacoes.length >= 2 && tema.variacoes.length <= 3,
        `tema "${tema.id}" de ${npcId} tem ${tema.variacoes.length} variacoes; o combinado e 2 ou 3`,
      );
      for (const variacao of tema.variacoes) {
        conferir(variacao.length > 0, `variacao vazia no tema "${tema.id}" de ${npcId}`);
        for (const fala of variacao) {
          conferir(typeof fala === 'string' && fala.length > 0, `fala vazia em "${tema.id}" de ${npcId}`);
        }
      }
      const textos = tema.variacoes.map((v) => v.join('|'));
      conferir(
        new Set(textos).size === textos.length,
        `tema "${tema.id}" de ${npcId} tem duas variacoes identicas`,
      );
    }

    // o menu do dia: 3 a 4 temas, deterministico, com as duas polaridades
    for (let dia = 0; dia < 30; dia++) {
      const doDia = temasDoDia(npcId, dia);
      conferir(doDia.length >= 3 && doDia.length <= 4, `${npcId} no dia ${dia}: ${doDia.length} temas`);
      conferir(new Set(doDia.map((t) => t.id)).size === doDia.length, `${npcId} repetiu tema no dia ${dia}`);
      conferir(
        doDia.some((t) => t.reacao === 'gosta') && doDia.some((t) => t.reacao === 'nao_gosta'),
        `${npcId} no dia ${dia} nao ofereceu escolha real (falta uma das polaridades)`,
      );
      const denovo = temasDoDia(npcId, dia);
      conferir(
        doDia.map((t) => t.id).join() === denovo.map((t) => t.id).join(),
        `temasDoDia nao foi deterministico pra ${npcId} no dia ${dia}`,
      );
    }
  }
  conferir(PONTOS_POR_REACAO.gosta === 0.5, 'tema que agrada devia valer +0,5');
  conferir(PONTOS_POR_REACAO.neutro === 0, 'tema neutro devia valer 0');
  conferir(PONTOS_POR_REACAO.nao_gosta === -1, 'tema que desagrada devia valer -1,0');

  // a variacao nunca repete a anterior do mesmo par NPC+tema
  for (const npcId of TODOS_COM_PERFIL) {
    for (const tema of TEMAS_POR_NPC[npcId] ?? []) {
      esquecerVariacoes();
      let anterior = null;
      for (let dia = 0; dia < 25; dia++) {
        const falas = falasDoTema(npcId, tema, dia).join('|');
        conferir(
          falas !== anterior,
          `${npcId}/${tema.id} repetiu a mesma variacao duas vezes seguidas (dia ${dia})`,
        );
        conferir(
          tema.variacoes.some((v) => v.join('|') === falas),
          `${npcId}/${tema.id} devolveu texto que nao esta nas variacoes`,
        );
        anterior = falas;
      }
    }
  }
  console.log(
    `  temas: ${TODOS_COM_PERFIL.length} NPCs com tema, 2-3 variacoes por tema e sem repetir a anterior`,
  );
}

// -------------------------------------------------------------- blog --
{
  for (const npcId of TODOS_COM_PERFIL) {
    const pool = POSTS_POR_NPC[npcId] ?? [];
    conferir(pool.length >= 6, `${npcId} tem ${pool.length} posts; o combinado e 6 a 10`);
    conferir(pool.length <= 10, `${npcId} tem ${pool.length} posts; o combinado e 6 a 10`);
    conferir(new Set(pool).size === pool.length, `${npcId} tem post repetido no pool`);
  }
  for (let dia = 0; dia < 20; dia++) {
    const a = feedAte(dia, 1439);
    const b = feedAte(dia, 1439);
    conferir(JSON.stringify(a) === JSON.stringify(b), `o feed do dia ${dia} nao foi deterministico`);
    for (let i = 1; i < a.length; i++) {
      const anterior = a[i - 1];
      const atual = a[i];
      conferir(
        anterior.dia > atual.dia || (anterior.dia === atual.dia && anterior.minuto >= atual.minuto),
        `o feed do dia ${dia} saiu fora de ordem cronologica`,
      );
    }
    for (const post of a) conferir(post.dia >= 0, 'o feed nao pode ter post de dia negativo');
  }
  // quem fala muito posta mais que quem e fechado
  const conta = (npcId) => {
    let n = 0;
    for (let dia = 0; dia < 60; dia++) if (postDoDia(npcId, dia)) n += 1;
    return n;
  };
  conferir(conta('jaqueline') > conta('wendel'), 'Jaqueline devia postar mais que Wendel');
  console.log(`  blog: ${feedAte(10, 1439).length} posts no feed do dia 10, em ordem e deterministicos`);
}

// -------------------------------------------------- desconto no comercio --
{
  const mercado = PONTOS_DE_LOJA.find((p) => p.id === 'loja_mercado');
  conferir(mercado?.npcDono === 'jaqueline', 'o mercado devia ter a Jaqueline como dona');

  const item = buscarItemDeLoja(mercado.categorias ? CATALOGO_ITENS[0].id : '');
  const alvo = CATALOGO_ITENS.find((i) => i.preco >= 1000) ?? CATALOGO_ITENS[0];

  const faixas = [
    [0, 0], [3.5, 0], [4, 0.05], [7.5, 0.05], [8, 0.1], [11.5, 0.1], [12, 0.15],
  ];
  for (const [score, esperado] of faixas) {
    estado.relacoes.restaurar({ scores: [['jaqueline', score]] });
    const pct = percentualDescontoNpc('jaqueline');
    conferir(pct === esperado, `score ${score} devia dar ${esperado * 100}%, deu ${pct * 100}%`);
    const preco = precoNoPonto(alvo, mercado);
    conferir(
      preco === Math.floor(alvo.preco * (1 - esperado)),
      `o preco com ${esperado * 100}% saiu errado: ${preco} vs ${alvo.preco}`,
    );
  }

  // sem dono (a DevStore) nao ha desconto, nem com relacao no maximo
  estado.relacoes.restaurar({ scores: [['jaqueline', 12]] });
  conferir(
    precoNoPonto(alvo, { id: 'x', mapa: 'x', tile: { x: 0, y: 0 }, nome: 'x', rotulo: 'x', categorias: [] }) ===
      alvo.preco,
    'ponto sem dono nao pode dar desconto',
  );

  // e o desconto tem de chegar ao CAIXA, nao so a vitrine
  const barato = [...CATALOGO_ITENS].sort((a, b) => a.preco - b.preco)[0];
  estado.carteira.restaurar(20000);
  estado.inventario.restaurar([]);
  estado.relacoes.restaurar({ scores: [['jaqueline', 12]] });
  esquecerUltimaCompra();
  const saldoAntes = estado.carteira.saldo;
  const r = comprar(barato.id, 1, mercado);
  conferir(r.ok, 'a compra com desconto foi recusada');
  const cobrado = saldoAntes - estado.carteira.saldo;
  conferir(
    cobrado === Math.floor(barato.preco * 0.85),
    `o caixa cobrou ${cobrado} em vez do preco com 15%: ${Math.floor(barato.preco * 0.85)}`,
  );
  conferir(cobrado < barato.preco, 'o desconto nao chegou ao caixa');

  // e sem relacao o preco volta a ser o cheio
  estado.relacoes.restaurar({ scores: [] });
  estado.carteira.restaurar(20000);
  estado.inventario.restaurar([]);
  esquecerUltimaCompra();
  const saldo2 = estado.carteira.saldo;
  conferir(comprar(barato.id, 1, mercado).ok, 'compra sem desconto foi recusada');
  conferir(saldo2 - estado.carteira.saldo === barato.preco, 'sem relacao o preco tem de ser o cheio');
  console.log('  desconto: 0/5/10/15% por nivel, aplicado na vitrine E no caixa; DevStore fora');
  void item;
}

// ------------------------------------------- vagas de codigo multi-etapa --
{
  for (const dificuldade of ['facil', 'media', 'dificil']) {
    const fatia = fatiaDeDificuldade(dificuldade);
    conferir(
      fatia.length >= MAX_ETAPAS_CODIGO,
      `a fatia "${dificuldade}" tem ${fatia.length} perguntas; uma vaga de ${MAX_ETAPAS_CODIGO} etapas nao caberia`,
    );
  }

  // o banco nao pode ter pergunta quebrada
  for (const [i, p] of PERGUNTAS.entries()) {
    conferir(p.opcoes.length >= 2, `pergunta ${i} tem menos de 2 opcoes`);
    conferir(p.correta >= 0 && p.correta < p.opcoes.length, `pergunta ${i} aponta pra opcao inexistente`);
    conferir(p.codigo.includes('___'), `pergunta ${i} nao tem lacuna`);
    conferir(new Set(p.opcoes).size === p.opcoes.length, `pergunta ${i} tem opcao repetida`);
  }

  // etapas correlacionam com a recompensa
  conferir(etapasDeCodigo(7500, 'x', 0) === 1, 'vaga barata devia ter 1 etapa so');
  conferir(etapasDeCodigo(32000, 'x', 0) >= 4, 'vaga cara devia ter 4+ etapas');
  for (let dia = 0; dia < 40; dia++) {
    const e = etapasDeCodigo(32000, 'codigo_api', dia);
    conferir(e >= 1 && e <= MAX_ETAPAS_CODIGO, `etapas fora da faixa 1-${MAX_ETAPAS_CODIGO}: ${e}`);
  }

  const vistos = new Set();
  let maxEtapasVistas = 0;
  for (let dia = 0; dia < 60; dia++) {
    for (const vaga of quadroDoDia(dia)) {
      if (vaga.tipo !== 'codigo') continue;
      const etapas = vaga.etapas ?? 1;
      vistos.add(etapas);
      maxEtapasVistas = Math.max(maxEtapasVistas, etapas);

      const perguntas = perguntasDaVaga(vaga, dia);
      conferir(perguntas.length === etapas, `vaga ${vaga.id} pediu ${etapas} etapas e veio ${perguntas.length}`);
      conferir(
        new Set(perguntas.map((p) => p.enunciado)).size === perguntas.length,
        `vaga ${vaga.id} repetiu pergunta dentro da mesma vaga`,
      );
      conferir(
        JSON.stringify(perguntasDaVaga(vaga, dia)) === JSON.stringify(perguntas),
        `perguntasDaVaga nao foi deterministica pra ${vaga.id}`,
      );

      // pagamento: 1 etapa e tudo-ou-nada; 2+ e proporcional
      if (etapas === 1) {
        conferir(pagamentoDeVagaDeCodigo(vaga, 0, 1) === 0, 'errar 1 etapa devia pagar zero');
        conferir(pagamentoDeVagaDeCodigo(vaga, 1, 1) === vaga.recompensa, 'acertar 1 etapa devia pagar cheio');
      } else {
        const parcial = pagamentoDeVagaDeCodigo(vaga, 1, etapas);
        conferir(parcial > 0, `acertar 1 de ${etapas} devia pagar algo (vaga ${vaga.id})`);
        conferir(parcial < vaga.recompensa, 'acerto parcial nao pode pagar cheio');
        conferir(
          parcial === Math.floor(vaga.recompensa / etapas),
          `pagamento parcial nao ficou proporcional na vaga ${vaga.id}`,
        );
        conferir(
          pagamentoDeVagaDeCodigo(vaga, etapas, etapas) === vaga.recompensa,
          'acertar tudo devia pagar cheio',
        );
        conferir(pagamentoDeVagaDeCodigo(vaga, 0, etapas) === 0, 'zerar devia pagar zero');
      }
    }
  }
  conferir(maxEtapasVistas >= 4, `nenhuma vaga chegou a 4 etapas em 60 dias (max ${maxEtapasVistas})`);
  console.log(
    `  codigo: ${PERGUNTAS.length} perguntas no banco; etapas vistas em 60 dias: ${[...vistos].sort().join(', ')}`,
  );
}

// -------------------------------------------------- conserto por arraste --
{
  for (const aparelho of APARELHOS) {
    conferir(aparelho.pecas.length >= 3, `${aparelho.id} tem menos de 3 pecas`);
    conferir(
      new Set(aparelho.pecas.map((p) => p.id)).size === aparelho.pecas.length,
      `${aparelho.id} tem peca com id repetido`,
    );
  }

  for (let dia = 0; dia < 60; dia++) {
    for (const vaga of quadroDoDia(dia)) {
      if (vaga.tipo !== 'conserto') continue;
      const pecas = pecasDoConserto(vaga, dia);
      const aparelho = APARELHOS.find((a) => a.id === vaga.aparelho);
      conferir(aparelho, `vaga ${vaga.id} aponta pra aparelho inexistente`);
      conferir(pecas.length > 0, `vaga ${vaga.id} montou tabuleiro vazio`);

      // ESTE e o bug que o minigame de sequencia tinha: peca repetida deixa o
      // quebra-cabeca IMPOSSIVEL, porque a peca ja encaixada nao volta pra bandeja
      conferir(
        new Set(pecas).size === pecas.length,
        `vaga ${vaga.id} no dia ${dia} repetiu peca — o tabuleiro seria impossivel`,
      );
      conferir(
        pecas.every((i) => i >= 0 && i < aparelho.pecas.length),
        `vaga ${vaga.id} apontou pra peca fora do aparelho`,
      );
      conferir(
        pecas.length <= aparelho.pecas.length,
        `vaga ${vaga.id} pediu mais pecas do que o aparelho tem`,
      );
      conferir(
        JSON.stringify(pecasDoConserto(vaga, dia)) === JSON.stringify(pecas),
        `pecasDoConserto nao foi deterministica pra ${vaga.id}`,
      );

      const total = pecas.length;
      conferir(pagamentoDeConserto(vaga, 0, total) === 0, 'zero peca devia pagar zero');
      conferir(pagamentoDeConserto(vaga, total, total) === vaga.recompensa, 'tudo encaixado paga cheio');
      if (total > 1) {
        const parcial = pagamentoDeConserto(vaga, total - 1, total);
        conferir(parcial > 0 && parcial < vaga.recompensa, 'encaixe parcial devia pagar parcial');
      }
    }
  }

  // dificuldade escala: mais peca e menos tempo
  const { facil, media, dificil } = CONSERTO_POR_DIFICULDADE;
  conferir(facil.pecas <= media.pecas && media.pecas <= dificil.pecas, 'as pecas deviam crescer com a dificuldade');
  conferir(facil.segundos >= media.segundos && media.segundos >= dificil.segundos, 'o tempo devia encurtar');
  console.log('  conserto: nenhum tabuleiro com peca repetida em 60 dias; pagamento proporcional');
}

// ---------------------------------------------------- entrega e save v6 --
{
  // a entrega guarda o NPC de destino, e ele TEM de sobreviver ao save: sem
  // isso o bonus de relacao da entrega some ao recarregar
  const { SistemaTrabalhos } = await import('../src/game/trabalhos.ts');
  const t = new SistemaTrabalhos();
  const comNpc = quadroDoDia(0).find((v) => v.tipo === 'entrega');
  conferir(comNpc?.npcDestino, 'a vaga de entrega devia trazer o NPC de destino');
  t.entrega = {
    idVaga: comNpc.id,
    titulo: comNpc.titulo,
    destino: comNpc.destino,
    morador: comNpc.moradorDestino,
    recompensa: comNpc.recompensa,
    dia: 0,
    npcId: comNpc.npcDestino,
  };
  const t2 = new SistemaTrabalhos();
  t2.restaurar(JSON.parse(JSON.stringify(t.serializar())));
  conferir(
    t2.entrega?.npcId === comNpc.npcDestino,
    'o NPC de destino da entrega nao sobreviveu ao save — o bonus de relacao sumiria',
  );

  // e todo destino de entrega tem de ser um NPC de verdade
  for (let dia = 0; dia < 30; dia++) {
    for (const vaga of quadroDoDia(dia)) {
      if (vaga.tipo !== 'entrega') continue;
      conferir(NPCS[vaga.npcDestino], `entrega do dia ${dia} aponta pra NPC inexistente: ${vaga.npcDestino}`);
    }
  }

  // save inteiro, com relacao
  estado.relacoes.restaurar({ scores: [] });
  estado.relacoes.ganharRelacao('wendel', 4.5);
  estado.relacoes.registrarConversa('wendel', 7);
  conferir(
    salvar({
      dia: 7,
      minutos: 600,
      mapa: 'farm',
      x: 10,
      y: 10,
      inventario: estado.inventario.serializar(),
      itensColetados: [],
      dinheiro: estado.carteira.serializar(),
      relacoes: estado.relacoes.serializar(),
    }),
    'salvar falhou',
  );
  const dados = carregar();
  conferir(dados !== null, 'carregar devolveu null');
  const voltou = new SistemaRelacoes();
  voltou.restaurar(dados.relacoes);
  conferir(voltou.getScore('wendel') === 4.5, 'o score do Wendel nao sobreviveu ao save v6');
  conferir(!voltou.podeConversar('wendel', 7), 'o limite diario nao sobreviveu ao save v6');
  console.log('  save v6: score, interagidos, limites e NPC da entrega preservados no reload');
}

// ------------------------------------------------ entrega ponta a ponta --
// Regressao do beco sem saida: a entrega so completa na porta do destino COM a
// encomenda em maos, entao qualquer caminho que tire o item do inventario
// travava o sistema inteiro (a porta nao completava e o app recusava outra
// vaga). Estas conferencias cobrem o fluxo todo fora do navegador.
{
  const fs = await import('node:fs');
  const { SistemaTrabalhos, ITEM_ENCOMENDA } = await import('../src/game/trabalhos.ts');
  const { ITENS, Inventario } = await import('../src/game/inventario.ts');

  // 1) todo destino de entrega tem porta apontando pra ele em ALGUM dos tres
  //    mapas externos. Desde que os 24 moradores entraram no motor de rotinas,
  //    a lista de destinos cobre tambem as casas do Bairro e da Zona Rural — os
  //    mapas sao ligados por borda, entao a entrega continua possivel a pe.
  const portas = [];
  for (const chave of ['farm', 'bairro', 'rural']) {
    const mapa = JSON.parse(fs.readFileSync(new URL(`../public/assets/tilemaps/${chave}.json`, import.meta.url), 'utf8'));
    const camada = mapa.layers.find((l) => l.name === 'interativos');
    conferir(camada, `o mapa ${chave} perdeu a camada "interativos"`);
    for (const o of camada.objects) {
      if ((o.type || o.class) !== 'porta') continue;
      portas.push({
        mapa: chave,
        nome: o.name,
        destino: (o.properties || []).find((p) => p.name === 'destino')?.value,
        tx: (o.properties || []).find((p) => p.name === 'destinoTx')?.value,
        ty: (o.properties || []).find((p) => p.name === 'destinoTy')?.value,
      });
    }
  }
  for (const d of DESTINOS_DE_ENTREGA) {
    const porta = portas.find((p) => p.destino === d.mapa);
    conferir(porta, `nenhum mapa externo tem porta pra "${d.mapa}" (destino de entrega de ${d.npcId})`);
    conferir(
      Number.isInteger(porta.tx) && Number.isInteger(porta.ty),
      `a porta "${porta.nome}" (${porta.mapa}) esta sem ponto de chegada`,
    );
  }

  // 2) a encomenda existe no registro do inventario e e item de MISSAO —
  //    sem a marca, o descarte no painel a joga fora e trava a entrega
  const enc = ITENS[ITEM_ENCOMENDA];
  conferir(enc, 'o item de encomenda sumiu do registro do inventario');
  conferir(enc.deMissao === true, 'a encomenda precisa ser item de missao pra nao poder ser descartada');

  // 3) aceitar poe a encomenda no inventario e registra a entrega
  const inv = new Inventario();
  conferir(inv.cabe(ITEM_ENCOMENDA, 1), 'a encomenda nao cabe num inventario vazio');
  conferir(inv.adicionar(ITEM_ENCOMENDA, 1) === 0, 'a encomenda nao entrou no inventario');
  conferir(inv.contar(ITEM_ENCOMENDA) === 1, 'a encomenda nao esta contando no inventario');

  // 4) a regra da porta: so completa com a entrega ativa, o destino batendo E a
  //    encomenda em maos. E a mesma condicao de `FarmScene.ehPortaDeEntrega`.
  const ehPortaDeEntrega = (destinoDaPorta, entrega, temEncomenda) =>
    entrega !== null && destinoDaPorta === entrega.destino && temEncomenda;
  const alvo = DESTINOS_DE_ENTREGA[0];
  const entrega = { idVaga: 'v', titulo: 't', destino: alvo.mapa, morador: alvo.morador, recompensa: 1000, dia: 0, npcId: alvo.npcId };
  conferir(ehPortaDeEntrega(alvo.mapa, entrega, true), 'a porta certa com encomenda devia completar');
  conferir(!ehPortaDeEntrega('farm', entrega, true), 'a porta de saida nao pode completar entrega');
  conferir(!ehPortaDeEntrega(alvo.mapa, entrega, false), 'sem encomenda a porta nao pode completar');
  conferir(!ehPortaDeEntrega(alvo.mapa, null, true), 'sem entrega ativa a porta nao completa');

  // 5) a saida do beco sem saida: cancelar larga a vaga sem pagar nem marcar
  const t = new SistemaTrabalhos();
  t.entrega = { ...entrega };
  const largada = t.cancelarEntrega();
  conferir(largada?.idVaga === 'v', 'cancelarEntrega devia devolver a entrega largada');
  conferir(t.entrega === null, 'cancelarEntrega devia limpar a entrega');
  conferir(!t.concluida(0, 'v'), 'cancelar NAO pode marcar a vaga como concluida');

  // 6) e a entrega (com o NPC de destino) sobrevive ao save
  const t2 = new SistemaTrabalhos();
  t2.entrega = { ...entrega };
  const t3 = new SistemaTrabalhos();
  t3.restaurar(JSON.parse(JSON.stringify(t2.serializar())));
  conferir(t3.entrega?.destino === alvo.mapa, 'o destino da entrega nao sobreviveu ao save');
  conferir(t3.entrega?.npcId === alvo.npcId, 'o NPC da entrega nao sobreviveu ao save');

  console.log(
    `  entrega: ${DESTINOS_DE_ENTREGA.length} destinos com porta nos tres mapas; encomenda protegida e vaga recuperavel`,
  );
}

// ------------------------------------- temas dos 24 moradores dos Mapas 2/3 --
/**
 * Contrato mais leve que o dos 9 originais (5 a 8 temas, blog proprio): aqui sao
 * 24 pessoas e o menu do dia mostra 3 a 4 de qualquer forma. O que se cobra e o
 * mesmo minimo de qualidade: quatro temas, as duas polaridades, 2 a 3 variacoes
 * por tema e nenhuma variacao repetida.
 */
{
  const { MORADORES } = await import('../src/game/moradores.ts');
  for (const id of Object.keys(MORADORES)) {
    const temas = TEMAS_POR_NPC[id] ?? [];
    conferir(temas.length >= 3 && temas.length <= 5, `${id} tem ${temas.length} temas; o combinado e 3 a 5`);
    conferir(new Set(temas.map((t) => t.id)).size === temas.length, `${id} tem tema com id repetido`);
    conferir(temas.some((t) => t.reacao === 'gosta'), `${id} nao tem nenhum tema que ele gosta`);
    conferir(temas.some((t) => t.reacao === 'nao_gosta'), `${id} nao tem nenhum tema que ele evita`);
    for (const tema of temas) {
      conferir(tema.rotulo.length > 0, `tema "${tema.id}" de ${id} esta sem rotulo`);
      conferir(
        tema.variacoes.length >= 2 && tema.variacoes.length <= 3,
        `tema "${tema.id}" de ${id} tem ${tema.variacoes.length} variacoes; o combinado e 2 ou 3`,
      );
      const textos = tema.variacoes.map((v) => v.join('|'));
      conferir(new Set(textos).size === textos.length, `tema "${tema.id}" de ${id} tem variacao repetida`);
      for (const variacao of tema.variacoes) {
        conferir(variacao.length > 0, `variacao vazia no tema "${tema.id}" de ${id}`);
        for (const fala of variacao) {
          conferir(typeof fala === 'string' && fala.length > 0, `fala vazia em "${tema.id}" de ${id}`);
        }
      }
    }
    // o menu do dia continua saindo com 3 a 4 temas e as duas polaridades
    for (let dia = 0; dia < 14; dia++) {
      const doDia = temasDoDia(id, dia);
      conferir(doDia.length >= 3 && doDia.length <= 4, `${id} no dia ${dia}: ${doDia.length} temas`);
    }
  }
  console.log(`  temas dos moradores: ${Object.keys(MORADORES).length} NPCs com 3-5 temas e as duas polaridades`);
}

// -------------------------------------------- cobertura: todo NPC tem tudo --
{
  for (const npcId of TODOS_COM_PERFIL) {
    conferir(NPCS[npcId], `${npcId} nao existe em NPCS`);
    conferir(TEMAS_POR_NPC[npcId], `${npcId} esta sem temas de conversa`);
    conferir(PREFERENCIAS_NPCS[npcId], `${npcId} esta sem preferencia de presente`);
    conferir(POSTS_POR_NPC[npcId], `${npcId} esta sem posts de blog`);
  }
  // e todo NPC do jogo precisa pelo menos nao quebrar a conversa
  for (const npcId of Object.keys(NPCS)) {
    conferir(
      TEMAS_POR_NPC[npcId] !== undefined,
      `${npcId} nao tem tema nenhum — a conversa dele abriria um menu vazio`,
    );
  }
  console.log(`  cobertura: ${Object.keys(NPCS).length} NPCs com tema, presente e blog`);
}

console.log(`[relacoes] ${passos} conferencias: passou`);

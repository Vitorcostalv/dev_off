// Conferencia da economia: carteira, catalogo de itens, compra e inventario.
// Rode com: npm run verificar-economia
//
// Roda o codigo DE VERDADE do jogo (game/dinheiro.ts, game/loja.ts,
// game/inventario.ts, game/itens.ts) fora do navegador, com um localStorage de
// mentira. O que se prova aqui e o que nao da pra ver so jogando: que uma compra
// recusada nao deixa rastro nem no saldo nem no inventario.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (chave) => memoria.get(chave) ?? null,
  setItem: (chave, valor) => memoria.set(chave, String(valor)),
  removeItem: (chave) => memoria.delete(chave),
};

const [
  { Carteira, SALDO_INICIAL, formatarDinheiro },
  { ITENS, Inventario, TAMANHO_PADRAO },
  { CATALOGO_ITENS, FAIXA_DE_PRECO, PRECO_MANUAL, SECOES_ELETRONICO, faixaDoItem, precoDe },
  { PONTOS_DE_LOJA, comprar, esquecerUltimaCompra, itensDaLoja, quantidadeViavel },
  { estado },
  { carregar, salvar },
] = await Promise.all([
  import('../src/game/dinheiro.ts'),
  import('../src/game/inventario.ts'),
  import('../src/game/itens.ts'),
  import('../src/game/loja.ts'),
  import('../src/game/estado.ts'),
  import('../src/game/save.ts'),
]);

let passos = 0;
function conferir(condicao, mensagem) {
  passos += 1;
  if (!condicao) throw new Error(`FALHOU: ${mensagem}`);
}

/** Reseta o estado global entre cenarios (a loja mexe no `estado` direto). */
function zerar(saldo = SALDO_INICIAL) {
  estado.inventario.slots.fill(null);
  estado.carteira.restaurar(saldo);
  esquecerUltimaCompra();
}

// ------------------------------------------------------------- carteira --
{
  const c = new Carteira();
  conferir(c.saldo === SALDO_INICIAL, 'carteira nova nao comeca no saldo inicial');
  conferir(c.gastar(5000).ok, 'gasto dentro do saldo foi recusado');
  conferir(c.saldo === SALDO_INICIAL - 5000, 'debito nao bateu');
  conferir(c.ganhar(2500).ok, 'credito valido foi recusado');
  conferir(c.saldo === SALDO_INICIAL - 2500, 'credito nao bateu');

  const antes = c.saldo;
  conferir(!c.gastar(antes + 1).ok, 'gasto acima do saldo foi aceito');
  conferir(c.saldo === antes, 'saldo mudou numa recusa por falta de dinheiro');

  for (const ruim of [-100, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '10']) {
    conferir(!c.gastar(ruim).ok, `gasto com valor invalido (${String(ruim)}) foi aceito`);
    conferir(!c.ganhar(ruim).ok, `credito com valor invalido (${String(ruim)}) foi aceito`);
  }
  conferir(c.saldo === antes, 'saldo mudou depois de valores invalidos');

  // saldo negativo e impossivel por construcao: nao ha caminho que subtraia
  // mais do que o saldo cobre
  conferir(c.saldo >= 0, 'carteira chegou a saldo negativo');

  // entrega que nao cabe: o debito nao pode acontecer
  const saldoAntes = c.saldo;
  const recusada = c.gastar(100, { cabe: () => false, entregar: () => {
    throw new Error('entregar() foi chamado mesmo com cabe() false');
  } });
  conferir(!recusada.ok && recusada.motivo === 'entrega', 'entrega impossivel nao foi recusada');
  conferir(c.saldo === saldoAntes, 'saldo foi debitado numa entrega que nao coube');

  // re-entrancia: uma compra disparada de dentro de outra e recusada
  let aninhada = null;
  c.gastar(100, { cabe: () => true, entregar: () => { aninhada = c.gastar(100); } });
  conferir(aninhada && !aninhada.ok && aninhada.motivo === 'ocupado', 're-entrancia nao foi barrada');

  console.log(`  carteira: ${passos} conferencias, saldo final ${c.texto}`);
}

// ------------------------------- save corrompido volta pro saldo inicial --
{
  for (const ruim of [Number.NaN, -1, '200', null, undefined, 1.5, 1e12]) {
    const c = new Carteira();
    c.restaurar(ruim);
    conferir(c.saldo === SALDO_INICIAL, `save com ${String(ruim)} nao voltou ao saldo inicial`);
  }
  const c = new Carteira();
  c.restaurar(12345);
  conferir(c.saldo === 12345, 'save valido nao foi restaurado');
  console.log('  save corrompido: NaN/negativo/string/fracao/absurdo -> saldo inicial');
}

// ------------------------------------------------------------- catalogo --
{
  conferir(CATALOGO_ITENS.length > 0, 'catalogo vazio');
  const ids = new Set();
  for (const item of CATALOGO_ITENS) {
    conferir(!ids.has(item.id), `id duplicado no catalogo: ${item.id}`);
    ids.add(item.id);
    conferir(Number.isSafeInteger(item.preco) && item.preco > 0, `preco invalido em ${item.id}`);
    const [minimo, maximo] = FAIXA_DE_PRECO[item.categoria];
    conferir(
      item.preco >= minimo && item.preco <= maximo,
      `${item.id} custa ${formatarDinheiro(item.preco)}, fora da faixa de ${item.categoria}`,
    );
    conferir(ITENS[item.id]?.frame === item.frame, `${item.id} nao chegou no registro de itens`);
  }
  // determinismo: o mesmo id sempre da o mesmo preco
  for (const item of CATALOGO_ITENS) {
    conferir(precoDe(item.id, item.categoria) === item.preco, `preco de ${item.id} nao e estavel`);
  }
  const eletronicos = CATALOGO_ITENS.filter((i) => i.categoria === 'eletronico');
  const normais = CATALOGO_ITENS.filter((i) => i.categoria === 'normal');

  // Todo eletronico tem secao, e o preco cai dentro da faixa DELA. E esta a
  // conferencia que substituiu a regra antiga "todo eletronico e mais caro que
  // todo item de mercado": aquela passava com um pendrive de R$ 1.200, porque
  // so olhava o envelope da categoria inteira.
  for (const item of eletronicos) {
    conferir(Boolean(item.secao), `${item.id} e eletronico e nao tem secao`);
    // preco fixado a mao pode sair da faixa de proposito — ver PRECO_MANUAL
    if (PRECO_MANUAL[item.id] !== undefined) continue;
    const [piso, teto] = faixaDoItem(item.id, item.categoria);
    conferir(
      item.preco >= piso && item.preco <= teto,
      `${item.id} custa ${formatarDinheiro(item.preco)}, fora da faixa da secao ${item.secao}`,
    );
  }

  // Toda secao declarada tem item, e nenhuma ficou com uma faixa larga demais:
  // quanto mais larga, mais espaco pro hash produzir vizinhos absurdos dentro
  // do MESMO tipo de produto (era o caso dos dois pendrives).
  // 8x e o limite empirico: acima disso a mesma secao comeca a produzir
  // vizinhos absurdos (era o caso de armazenamento com pendrive e SSD juntos,
  // um pendrive a R$ 466 ao lado de outro a R$ 47).
  const RAZAO_MAXIMA = 8;
  for (const secao of SECOES_ELETRONICO) {
    const dela = eletronicos.filter((i) => i.secao === secao.id);
    conferir(dela.length > 0, `secao "${secao.id}" nao tem nenhum item`);
    const [piso, teto] = secao.faixa;
    conferir(piso > 0 && teto > piso, `faixa invalida na secao "${secao.id}"`);
    conferir(
      teto / piso <= RAZAO_MAXIMA,
      `secao "${secao.id}" tem faixa larga demais (${(teto / piso).toFixed(1)}x)`,
    );
    // dentro da secao, o item mais caro nao pode ser um multiplo absurdo do mais
    // barato — e exatamente a comparacao que o jogador faz na vitrine
    const menor = Math.min(...dela.map((i) => i.preco));
    const maior = Math.max(...dela.map((i) => i.preco));
    conferir(
      maior / menor <= RAZAO_MAXIMA,
      `secao "${secao.id}": ${formatarDinheiro(menor)} ate ${formatarDinheiro(maior)} e absurdo`,
    );
  }

  // Preco fixado a mao continua ganhando do gerado.
  for (const [id, centavos] of Object.entries(PRECO_MANUAL)) {
    const item = CATALOGO_ITENS.find((i) => i.id === id);
    conferir(Boolean(item), `PRECO_MANUAL aponta pra "${id}", que nao esta no catalogo`);
    conferir(item.preco === centavos, `PRECO_MANUAL de "${id}" nao foi respeitado`);
    const [piso, teto] = FAIXA_DE_PRECO[item.categoria];
    conferir(
      centavos >= piso && centavos <= teto,
      `PRECO_MANUAL de "${id}" saiu do envelope da categoria — engano de digitacao?`,
    );
  }

  // As duas prateleiras agora SE SOBREPOEM na ponta de baixo de proposito (um
  // cabo custa menos que um bolo). O que segue valendo e que a eletronica, no
  // geral, e outro patamar: a mediana dela fica acima de todo item de mercado.
  const ordenados = eletronicos.map((i) => i.preco).sort((a, b) => a - b);
  const medianaEletronico = ordenados[Math.floor(ordenados.length / 2)];
  const maiorNormal = Math.max(...normais.map((i) => i.preco));
  conferir(
    medianaEletronico > maiorNormal,
    'a mediana dos eletronicos caiu abaixo do item de mercado mais caro',
  );

  console.log(
    `  catalogo: ${normais.length} normal + ${eletronicos.length} eletronico em` +
      ` ${SECOES_ELETRONICO.length} secoes, precos deterministicos e dentro da faixa`,
  );
  for (const secao of SECOES_ELETRONICO) {
    const dela = eletronicos.filter((i) => i.secao === secao.id);
    const precos = dela.map((i) => i.preco);
    console.log(
      `    ${secao.id.padEnd(14)} ${String(dela.length).padStart(2)} itens` +
        `  faixa ${formatarDinheiro(secao.faixa[0])}..${formatarDinheiro(secao.faixa[1])}` +
        `  real ${formatarDinheiro(Math.min(...precos))}..${formatarDinheiro(Math.max(...precos))}`,
    );
  }
}

// ------------------------------------------------------- compra que passa --
{
  zerar();
  const item = CATALOGO_ITENS.find((i) => i.categoria === 'normal');
  const saldoAntes = estado.carteira.saldo;
  const r = comprar(item.id, 3);
  conferir(r.ok, 'compra valida foi recusada');
  conferir(estado.carteira.saldo === saldoAntes - item.preco * 3, 'debito da compra nao bateu');
  conferir(estado.inventario.contar(item.id) === 3, 'item nao entrou no inventario');
  conferir(
    estado.inventario.slots.filter(Boolean).length === 1,
    'tres unidades iguais ocuparam mais de um slot',
  );

  // empilha na mesma pilha
  esquecerUltimaCompra();
  conferir(comprar(item.id, 2).ok, 'segunda compra do mesmo item foi recusada');
  conferir(estado.inventario.contar(item.id) === 5, 'a segunda compra nao empilhou');
  conferir(estado.inventario.slots.filter(Boolean).length === 1, 'a segunda compra abriu slot novo');
  console.log(`  compra: ${item.nome} x5 empilhado em 1 slot, saldo ${estado.carteira.texto}`);
}

// ------------------------------------------------- compra sem saldo: nada muda --
{
  const caro = [...CATALOGO_ITENS].sort((a, b) => b.preco - a.preco)[0];
  zerar(caro.preco - 1); // um centavo a menos do que o item custa
  const saldoAntes = estado.carteira.saldo;
  const r = comprar(caro.id, 1);
  conferir(!r.ok && r.falha === 'saldo', 'compra sem saldo nao foi recusada por saldo');
  conferir(estado.carteira.saldo === saldoAntes, 'saldo mudou numa compra sem dinheiro');
  conferir(estado.inventario.contar(caro.id) === 0, 'item entrou numa compra sem dinheiro');
  console.log(`  sem saldo: ${caro.nome} (${formatarDinheiro(caro.preco)}) recusado, nada mudou`);
}

// ------------------------- ROBUSTEZ: inventario cheio no meio da transacao --
{
  // Enche os 20 slots com itens DIFERENTES, cada um numa pilha propria: assim
  // nao ha nem slot vazio nem pilha do item pedido pra completar.
  zerar(SALDO_INICIAL * 10);
  const tampoes = CATALOGO_ITENS.slice(0, TAMANHO_PADRAO);
  conferir(tampoes.length === TAMANHO_PADRAO, 'catalogo pequeno demais pra encher o inventario');
  for (const t of tampoes) estado.inventario.adicionar(t.id, 1);
  conferir(estado.inventario.vagos === 0, 'o inventario de teste nao ficou cheio');

  const alvo = CATALOGO_ITENS.find((i) => !tampoes.some((t) => t.id === i.id));
  const saldoAntes = estado.carteira.saldo;
  const fotoAntes = JSON.stringify(estado.inventario.serializar());

  const r = comprar(alvo.id, 1);
  conferir(!r.ok && r.falha === 'espaco', 'compra com inventario cheio nao foi recusada por espaco');
  conferir(estado.carteira.saldo === saldoAntes, 'O SALDO FOI DEBITADO numa compra que nao coube');
  conferir(
    JSON.stringify(estado.inventario.serializar()) === fotoAntes,
    'o inventario mudou numa compra que nao coube',
  );

  // com pilha parcial do proprio item o espaco volta, e ai a compra passa
  estado.inventario.removerDoSlot(0, 1);
  esquecerUltimaCompra();
  conferir(comprar(alvo.id, 1).ok, 'compra nao passou depois de abrir um slot');
  conferir(estado.carteira.saldo === saldoAntes - alvo.preco, 'debito errado apos abrir slot');
  console.log('  inventario cheio: compra recusada com saldo E inventario intactos');
}

// ------------------------------------------------ duplo disparo da compra --
{
  zerar();
  const item = CATALOGO_ITENS.find((i) => i.categoria === 'normal');
  const saldoAntes = estado.carteira.saldo;
  const primeira = comprar(item.id, 1);
  const segunda = comprar(item.id, 1); // mesmo item, mesma qtd, mesmo instante
  conferir(primeira.ok, 'a primeira compra foi recusada');
  conferir(!segunda.ok && segunda.falha === 'duplicada', 'o disparo duplo passou');
  conferir(estado.carteira.saldo === saldoAntes - item.preco, 'o disparo duplo cobrou duas vezes');
  conferir(estado.inventario.contar(item.id) === 1, 'o disparo duplo entregou duas unidades');
  console.log('  duplo-clique: segunda chamada recusada, cobrado uma vez so');
}

// -------------------------------------------- quantidade invalida e teto --
{
  zerar();
  const item = CATALOGO_ITENS.find((i) => i.categoria === 'normal');
  const saldoAntes = estado.carteira.saldo;
  for (const qtd of [0, -3, 1.5, Number.NaN, 1000]) {
    const r = comprar(item.id, qtd);
    conferir(!r.ok, `quantidade invalida (${String(qtd)}) foi aceita`);
  }
  conferir(estado.carteira.saldo === saldoAntes, 'saldo mudou com quantidade invalida');
  conferir(!comprar('item_que_nao_existe', 1).ok, 'item fora do catalogo foi vendido');
  console.log('  quantidade: 0, negativa, fracionaria, NaN e acima do teto recusadas');
}

// --------------------------------------------- descartar, usar, organizar --
{
  zerar();
  const inv = new Inventario();
  const consumivel = CATALOGO_ITENS.find((i) => ITENS[i.id].tipo === 'consumivel');
  const eletronico = CATALOGO_ITENS.find((i) => ITENS[i.id].tipo === 'eletronico');

  inv.adicionar(eletronico.id, 1);
  inv.adicionar(consumivel.id, 4);
  conferir(inv.removerDoSlot(1, 1) === 1, 'usar nao consumiu uma unidade');
  conferir(inv.contar(consumivel.id) === 3, 'usar consumiu a quantidade errada');
  conferir(inv.removerDoSlot(1, 99) === 3, 'descartar nao levou a pilha inteira');
  conferir(inv.contar(consumivel.id) === 0, 'a pilha descartada continuou no inventario');
  conferir(inv.slots[1] === null, 'o slot descartado nao ficou vazio');

  // organizar: junta pilhas espalhadas e poe consumivel antes de eletronico
  inv.slots[3] = { id: consumivel.id, qtd: 5 };
  inv.slots[7] = { id: consumivel.id, qtd: 6 };
  inv.organizar();
  conferir(inv.slots[0]?.id === consumivel.id, 'organizar nao poe consumivel primeiro');
  conferir(inv.slots[0]?.qtd === 11, 'organizar nao juntou as pilhas soltas');
  conferir(inv.slots[1]?.id === eletronico.id, 'organizar nao poe eletronico depois');
  conferir(inv.contar(consumivel.id) === 11, 'organizar perdeu item');
  conferir(inv.contar(eletronico.id) === 1, 'organizar perdeu item');
  console.log('  inventario: usar (-1), descartar (pilha inteira) e organizar (junta e ordena)');
}

// ----------------------------------------------- save/load de ponta a ponta --
{
  // o eletronico mais barato: o saldo inicial tem de cobrir duas unidades
  zerar();
  const item = [...CATALOGO_ITENS]
    .filter((i) => i.categoria === 'eletronico')
    .sort((a, b) => a.preco - b.preco)[0];
  conferir(comprar(item.id, 2).ok, 'compra do cenario de save foi recusada');
  const saldoEsperado = estado.carteira.saldo;

  conferir(
    salvar({
      dia: 5,
      minutos: 600,
      mapa: 'mercado',
      x: 512,
      y: 416,
      inventario: estado.inventario.serializar(),
      itensColetados: [],
      dinheiro: estado.carteira.serializar(),
    }),
    'salvar falhou',
  );

  const dados = carregar();
  conferir(dados !== null, 'carregar devolveu null');
  const carteira = new Carteira();
  carteira.restaurar(dados.dinheiro);
  const inv = new Inventario();
  inv.restaurar(dados.inventario);
  conferir(carteira.saldo === saldoEsperado, 'o saldo nao sobreviveu ao save');
  conferir(inv.contar(item.id) === 2, 'o item comprado nao sobreviveu ao save');
  console.log(`  save v6: ${carteira.texto} e ${item.nome} x2 preservados no reload`);
}

// ----------------------------------------------------- pontos de loja --
{
  conferir(PONTOS_DE_LOJA.length > 0, 'nenhum ponto de loja declarado');
  for (const ponto of PONTOS_DE_LOJA) {
    const lista = itensDaLoja(ponto);
    conferir(lista.length > 0, `o ponto "${ponto.id}" nao vende nada`);
    conferir(
      Number.isInteger(ponto.tile.x) && Number.isInteger(ponto.tile.y),
      `o ponto "${ponto.id}" tem tile invalido`,
    );
  }
  zerar();
  const barato = [...CATALOGO_ITENS].sort((a, b) => a.preco - b.preco)[0];
  const viavel = quantidadeViavel(barato.id);
  conferir(viavel > 0, 'quantidadeViavel devolveu 0 com saldo cheio e inventario vazio');
  conferir(comprar(barato.id, viavel).ok, 'a quantidade que a UI oferece nao pode ser comprada');
  console.log(
    `  loja: ${PONTOS_DE_LOJA.length} ponto(s); quantidadeViavel(${barato.nome}) = ${viavel} e comprable`,
  );
}

console.log(`[economia] ${passos} conferencias: passou`);

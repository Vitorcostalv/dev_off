/**
 * Equilibrio da economia e do combate: renda, custo e TEMPO ATE A COMPRA.
 *
 * Existe porque o roteiro do overhaul pede, com estas palavras, "simular renda
 * diaria, custos e tempo ate compras ANTES de rebalancear". A conferencia de
 * economia que ja existia prova que uma transacao recusada nao deixa rastro —
 * prova correcao. Nao prova equilibrio: nada media quantos dias de jogo custa a
 * garagem, nem se descer na represa paga a municao que ela gasta.
 *
 * O que este arquivo faz e diferente dos outros validadores: ele SIMULA. Roda o
 * codigo de verdade do jogo (quadro de vagas por dia, tabela de sucata, preco de
 * item, arma, inimigo) e imprime o retrato da economia; depois cobra pisos e
 * tetos sobre esse retrato. Os pisos nao sao gosto — cada um tem escrito ao lado
 * o que o jogador sente quando o numero passa deles.
 *
 * Determinismo: o quadro de vagas sai de `hash01(dia)`, entao simular os 112
 * dias do ano da sempre o mesmo total. Nao ha sorteio nesta ferramenta.
 */
const memoria = new Map();
globalThis.localStorage = {
  getItem: (chave) => memoria.get(chave) ?? null,
  setItem: (chave, valor) => memoria.set(chave, String(valor)),
  removeItem: (chave) => memoria.delete(chave),
};

const [
  { SALDO_INICIAL, formatarDinheiro },
  { EXPANSOES, CATALOGO_MOBILIA, requisitosDoMovel },
  {
    quadroDoDia,
    VAGAS_POR_DIA,
    PECAS_DE_REPOSICAO,
    BONUS_DE_REPOSICAO,
    reposicaoDoConserto,
    pagamentoDeConserto,
  },
  { IDS_DE_SUCATA, FRACAO_DE_REVENDA, valorDeSucata, raridadeDeSucata, buscarTabelaDeSucata },
  { ARMAS, CARTUCHO_POR_DISPARO },
  { CATALOGO_INIMIGOS, ATAQUE_DO_JOGADOR },
  { CATALOGO_ITENS, precoDe },
  { HP_MAXIMO },
  { inimigosDoAndar, faunaDoAndar },
  { PROJETOS_CIDADE },
  { NOS_RURAIS },
] = await Promise.all([
  import('../src/game/dinheiro.ts'),
  import('../src/game/casa.ts'),
  import('../src/game/trabalhos.ts'),
  import('../src/game/sucata.ts'),
  import('../src/game/armas.ts'),
  import('../src/game/inimigos.ts'),
  import('../src/game/itens.ts'),
  import('../src/game/vida.ts'),
  import('../src/game/andares.ts'),
  import('../src/game/cidade.ts'),
  import('../src/game/atividadesRurais.ts'),
]);

let conferencias = 0;
const falhas = [];
/**
 * Junta as falhas em vez de parar na primeira.
 *
 * Um piso de equilibrio quebrado nao e um bug de codigo: e uma decisao de numero
 * pendente. Parar na primeira esconderia as outras, e quem for ajustar preco
 * precisa ver o quadro inteiro antes de mexer em qualquer numero — mexer no
 * preco da casa muda o tempo ate a compra de tudo.
 */
const ok = (mensagem, condicao) => {
  conferencias += 1;
  if (!condicao) falhas.push(mensagem);
};
const reais = (centavos) => formatarDinheiro(Math.round(centavos));

/** Um ano de jogo: quatro estacoes de 28 dias. */
const DIAS_DO_ANO = 112;

/**
 * A fronteira entre decoracao leve e movel no catalogo da casa, em centavos.
 * Decoracao vai de R$ 45 a R$ 135 e movel de R$ 270 a R$ 960; R$ 200 cai no vao
 * entre as duas metades e nao encosta em nenhuma peca.
 */
const PRECO_DE_MOVEL = 20_000;

// ============================================================== 1. RENDA ==
//
// O quadro de trabalho e a renda principal, e ele nao e uma media: e uma lista
// de cinco vagas sorteadas por dia. Simular os 112 dias diz qual e o teto e
// qual e o piso de um dia de trabalho — e a diferenca entre os dois e o que o
// jogador sente como "hoje o quadro estava ruim".

const porDia = [];
for (let dia = 0; dia < DIAS_DO_ANO; dia++) {
  const vagas = quadroDoDia(dia);
  porDia.push({
    dia,
    quantas: vagas.length,
    total: vagas.reduce((s, v) => s + v.recompensa, 0),
    melhor: Math.max(...vagas.map((v) => v.recompensa)),
    tipos: vagas.map((v) => v.tipo),
  });
}
const somaTotal = porDia.reduce((s, d) => s + d.total, 0);
const rendaMedia = somaTotal / DIAS_DO_ANO;
const piorDia = Math.min(...porDia.map((d) => d.total));
const melhorDia = Math.max(...porDia.map((d) => d.total));
const melhorVaga = Math.max(...porDia.map((d) => d.melhor));

console.log('--- renda do quadro de trabalho, um ano simulado ---');
console.log(`  ${DIAS_DO_ANO} dias, ${VAGAS_POR_DIA} vagas por dia`);
console.log(`  quadro cheio: media ${reais(rendaMedia)}/dia (pior ${reais(piorDia)}, melhor ${reais(melhorDia)})`);
console.log(`  melhor vaga do ano: ${reais(melhorVaga)}`);

ok(
  `todo dia do ano tem ${VAGAS_POR_DIA} vagas no quadro (o pior teve ${Math.min(...porDia.map((d) => d.quantas))})`,
  porDia.every((d) => d.quantas === VAGAS_POR_DIA),
);
// um dia sem nenhum trabalho e um dia em que o jogador nao tem o que fazer
ok(`o pior dia do ano ainda paga algo (${reais(piorDia)})`, piorDia > 0);
// se o pior dia paga menos de um terco do melhor, o quadro parece injusto: o
// jogador que abriu o app na terca ve metade do que viu na segunda
const razao = piorDia / melhorDia;
console.log(`  razao pior/melhor dia: ${(razao * 100).toFixed(0)}%`);
ok(
  `o pior dia paga ${(razao * 100).toFixed(0)}% do melhor; abaixo de 33% o quadro parece injusto`,
  razao >= 0.33,
);
// e os tres tipos aparecem todo dia, senao quem so gosta de um fica sem
const semTodosOsTipos = porDia.filter((d) => new Set(d.tipos).size < 3);
ok(
  `${semTodosOsTipos.length} dia(s) do ano sem os tres tipos de vaga — quem so joga um tipo fica sem trabalho`,
  semTodosOsTipos.length === 0,
);

// --------------------------------------------------------------- a sucata --
//
// A revenda e o outro ciclo de dinheiro. O valor de uma descida depende do que
// se acha; aqui mede-se o valor POR PECA, por raridade.
const porRaridade = {};
for (const id of IDS_DE_SUCATA) {
  (porRaridade[raridadeDeSucata(id)] ??= []).push(valorDeSucata(id) * FRACAO_DE_REVENDA);
}
console.log('--- revenda de sucata ---');
console.log(`  a revenda paga ${(FRACAO_DE_REVENDA * 100).toFixed(0)}% do valor de referencia`);
for (const [raridade, valores] of Object.entries(porRaridade)) {
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  console.log(
    `  ${raridade}: ${valores.length} pecas, ${reais(Math.min(...valores))} a ${reais(Math.max(...valores))}` +
      ` (media ${reais(media)})`,
  );
}
// a escada de raridade tem de ser escada: uma peca rara que paga menos que uma
// comum faz o jogador guardar a errada
const mediaDe = (r) => {
  const v = porRaridade[r] ?? [];
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};
ok(
  `a raridade e uma escada de valor: comum ${reais(mediaDe('comum'))} < incomum ` +
    `${reais(mediaDe('incomum'))} < raro ${reais(mediaDe('raro'))}`,
  mediaDe('comum') < mediaDe('incomum') && mediaDe('incomum') < mediaDe('raro'),
);
// e nenhuma peca comum pode pagar mais que a incomum mais barata, senao a
// escada existe na media e nao na prateleira
const maiorComum = Math.max(...(porRaridade.comum ?? [0]));
const menorIncomum = Math.min(...(porRaridade.incomum ?? [0]));
ok(
  `a peca comum mais valiosa (${reais(maiorComum)}) paga menos que a incomum mais barata ` +
    `(${reais(menorIncomum)}) — senao a escada de raridade so existe na media`,
  maiorComum < menorIncomum,
);

// ------------------------------- a ponte: sucata comum no conserto --
//
// As cinco pecas COMUNS de sucata valiam de R$ 1,60 a R$ 5,60 na revenda e nao
// serviam pra nada mais. Uma descida nos dez primeiros andares — que sorteia
// justamente essas — rendia R$ 158 contra R$ 736 de um dia de quadro: o raso da
// usina era pedagio de historia, nao um lugar onde se ganha algo.
//
// A peca de reposicao e a ponte. Um conserto COMPLETO aceita uma delas e paga
// `BONUS_DE_REPOSICAO` a mais. As conferencias abaixo cobram as tres coisas que
// fazem isso funcionar sem virar armadilha: que o bonus valha mais que vender a
// peca, que ele seja OPCIONAL, e que so o conserto completo consuma material.
console.log('--- peca de reposicao no conserto ---');
console.log(
  `  ${PECAS_DE_REPOSICAO.length} pecas aceitas, bonus de ${(BONUS_DE_REPOSICAO * 100).toFixed(0)}%`,
);
const consertos = porDia
  .flatMap((d) => quadroDoDia(d.dia))
  .filter((v) => v.tipo === 'conserto');
const temInventario = (id) => (PECAS_DE_REPOSICAO.includes(id) ? 1 : 0);
const bonus = consertos
  .map((v) => reposicaoDoConserto(v, 3, 3, temInventario))
  .filter(Boolean)
  .map((r) => r.bonus);
console.log(
  `  ${consertos.length} vagas de conserto no ano; bonus de ${reais(Math.min(...bonus))} a ` +
    `${reais(Math.max(...bonus))} (media ${reais(bonus.reduce((a, b) => a + b, 0) / bonus.length)})`,
);
for (const id of PECAS_DE_REPOSICAO) {
  ok(
    `"${id}" esta na lista de reposicao mas nao e uma peca de sucata`,
    IDS_DE_SUCATA.includes(id),
  );
  ok(
    `"${id}" e aceita como reposicao mas nao e uma peca COMUM — a ponte existe pra dar uso ao que ` +
      'nao vale nada, e gastar uma peca rara num conserto seria prejuizo escondido',
    raridadeDeSucata(id) === 'comum',
  );
}
// 1. o bonus vale mais que vender a peca, senao a ponte nao muda nada
const menorBonus = Math.min(...bonus);
const maiorRevendaComum = Math.max(...porRaridade.comum);
console.log(
  `  o menor bonus (${reais(menorBonus)}) contra a melhor revenda de peca comum ` +
    `(${reais(maiorRevendaComum)}): ${(menorBonus / maiorRevendaComum).toFixed(1)}x`,
);
ok(
  `o menor bonus de reposicao paga ${reais(menorBonus)} e a melhor revenda de peca comum paga ` +
    `${reais(maiorRevendaComum)}; se guardar a peca nao pagar mais que vender, a ponte nao muda nada`,
  menorBonus > maiorRevendaComum,
);
// 2. e OPCIONAL: sem nenhuma peca na mochila, o conserto paga igual
const semNada = () => 0;
const semPeca = consertos.filter((v) => reposicaoDoConserto(v, 3, 3, semNada) !== null);
ok(
  `${semPeca.length} vaga(s) de conserto pediram reposicao de quem nao tem nenhuma peca — ` +
    'quem nunca desceu na usina tem de poder trabalhar igual',
  semPeca.length === 0,
);
// 3. so o conserto COMPLETO consome: material de quem errou seria cobrar duas vezes
const incompletos = consertos.filter((v) => reposicaoDoConserto(v, 2, 3, temInventario) !== null);
ok(
  `${incompletos.length} conserto(s) pela metade consumiriam a peca de reposicao — a peca que ` +
    'sobrou de um conserto incompleto nao consertou nada',
  incompletos.length === 0,
);
// e o bonus nao pode passar do proprio pagamento: reposicao e bonus, nao a vaga
const excessivos = consertos.filter((v) => {
  const r = reposicaoDoConserto(v, 3, 3, temInventario);
  return r && r.bonus >= pagamentoDeConserto(v, 3, 3);
});
ok(
  `${excessivos.length} vaga(s) em que a reposicao paga mais que o proprio conserto — ` +
    'a peca e bonus do trabalho, nao o trabalho',
  excessivos.length === 0,
);

// ================================================= 2. TEMPO ATE A COMPRA ==
//
// A pergunta que o roteiro faz: quantos DIAS de jogo custa cada coisa. A conta
// usa a renda media do quadro, que e a renda que um jogador que trabalha todo
// dia realmente tem.
const dias = (centavos) => centavos / rendaMedia;
const metas = [
  ...EXPANSOES.map((e) => ({ nome: `expansao: ${e.nome}`, preco: e.preco, tipo: 'expansao' })),
  ...CATALOGO_MOBILIA.map((m) => ({ nome: `movel: ${m.nome}`, preco: m.preco, tipo: 'movel' })),
];
metas.sort((a, b) => a.preco - b.preco);

console.log('--- tempo ate a compra, na renda media do quadro ---');
console.log(`  saldo inicial: ${reais(SALDO_INICIAL)} (${dias(SALDO_INICIAL).toFixed(1)} dias de trabalho)`);
for (const m of metas.filter((x) => x.tipo === 'expansao')) {
  console.log(`  ${m.nome}: ${reais(m.preco)} = ${dias(m.preco).toFixed(1)} dias`);
}
const moveis = metas.filter((x) => x.tipo === 'movel');
console.log(
  `  ${moveis.length} moveis: ${reais(moveis[0].preco)} (${dias(moveis[0].preco).toFixed(1)} dias) a ` +
    `${reais(moveis[moveis.length - 1].preco)} (${dias(moveis[moveis.length - 1].preco).toFixed(1)} dias)`,
);
const casaCompleta = metas.reduce((s, m) => s + m.preco, 0);
console.log(
  `  casa completa (3 expansoes + ${moveis.length} moveis): ${reais(casaCompleta)} = ` +
    `${dias(casaCompleta).toFixed(0)} dias de trabalho, ${((dias(casaCompleta) / DIAS_DO_ANO) * 100).toFixed(0)}% do ano`,
);

// O primeiro movel e a primeira compra que o jogador faz por vontade propria, e
// nao pode custar um dia inteiro de trabalho: se custar, ele deixa de comprar
ok(
  `o movel mais barato custa ${dias(moveis[0].preco).toFixed(1)} dia(s) de trabalho; ` +
    'acima de um dia a primeira compra por vontade propria vira sacrificio',
  dias(moveis[0].preco) <= 1,
);
// e a primeira expansao e uma meta de CURTO prazo, como o proprio comentario de
// casa.ts diz ("umas 5 vagas boas")
const primeira = metas.find((m) => m.tipo === 'expansao');
ok(
  `a primeira expansao custa ${dias(primeira.preco).toFixed(1)} dias; ` +
    'de curto prazo quer dizer menos de uma semana de jogo',
  dias(primeira.preco) <= 7,
);
// a casa completa e a meta longa do jogo, mas nao pode passar do ano: um save
// que precisa de dois anos pra mobiliar a sala nao mostra o conteudo pro jogador
ok(
  `a casa completa custa ${dias(casaCompleta).toFixed(0)} dias, e o ano tem ${DIAS_DO_ANO} — ` +
    'passar do ano deixa metade do conteudo de casa invisivel pra quem termina a historia',
  dias(casaCompleta) <= DIAS_DO_ANO,
);
// nem tao curta: comprar tudo em duas semanas faz o dinheiro perder sentido
ok(
  `a casa completa custa ${dias(casaCompleta).toFixed(0)} dias; abaixo de 21 o dinheiro deixa de ser decisao`,
  dias(casaCompleta) >= 21,
);
// a escada das expansoes tem de subir: a garagem e a meta longa
const precosDeExpansao = EXPANSOES.map((e) => e.preco);
ok(
  `as tres expansoes sao uma escada de preco: ${precosDeExpansao.map(reais).join(' < ')}`,
  precosDeExpansao.every((p, i) => i === 0 || p > precosDeExpansao[i - 1]),
);
// e toda expansao pede material, senao ela e so um botao de dinheiro
ok(
  'toda expansao pede material alem de dinheiro',
  EXPANSOES.every((e) => e.materiais.length > 0 && e.materiais.every((m) => m.quantidade > 0)),
);
// ------------------------------------------------- material contra preco --
//
// `requisitosDoMovel` deriva a quantidade de material do PRECO. E economia de
// tabela, mas acopla duas escalas: quando o preco do movel subiu tres vezes, o
// pedido de madeira subiu tres vezes junto, e os dois limiares de material
// cairam ambos abaixo do movel mais barato — as tres faixas viraram uma, e
// ninguem decidiu isso.
//
// Estas conferencias existem pra que a proxima mudanca de preco nao possa fazer
// o mesmo em silencio.
const porMaterial = { madeira: [], pedra: [], concreto: [] };
for (const m of CATALOGO_MOBILIA) {
  for (const r of requisitosDoMovel(m)) {
    (porMaterial[r.itemId] ??= []).push({ nome: m.nome, qtd: r.quantidade, preco: m.preco });
  }
}
console.log('--- material por peca de mobilia ---');
for (const [material, pecas] of Object.entries(porMaterial)) {
  if (pecas.length === 0) {
    console.log(`  ${material}: NENHUMA peca pede`);
    continue;
  }
  const qtds = pecas.map((p) => p.qtd);
  console.log(
    `  ${material}: ${pecas.length} de ${CATALOGO_MOBILIA.length} pecas, ` +
      `${Math.min(...qtds)} a ${Math.max(...qtds)} unidades`,
  );
}
// as tres faixas de material tem de continuar povoadas: se uma esvazia, um dos
// tres materiais deixa de ter uso na casa e o jogador nao tem por que junta-lo
for (const [material, pecas] of Object.entries(porMaterial)) {
  ok(
    `nenhuma peca de mobilia pede ${material} — um material sem uso na casa e um material que o ` +
      'jogador nao tem motivo pra juntar, e os precos e que decidem quem pede o que',
    pecas.length > 0,
  );
}
// e nenhuma peca pode pedir mais material do que o jogador consegue carregar num
// slot: a compra e uma transacao so, e material que nao cabe na mochila trava a
// peca sem dizer por que
const MAX_PILHA_MATERIAL = 99;
for (const [material, pecas] of Object.entries(porMaterial)) {
  const pior = pecas.reduce((a, b) => (b.qtd > a.qtd ? b : a), pecas[0]);
  ok(
    `"${pior.nome}" pede ${pior.qtd} de ${material}, e a pilha maxima e ${MAX_PILHA_MATERIAL}`,
    pior.qtd <= MAX_PILHA_MATERIAL,
  );
}
// a decoracao leve nao pede material pesado: enfeite de parede com concreto e
// mais atrito do que a peca vale
const decoracaoComPesado = CATALOGO_MOBILIA.filter(
  (m) => m.preco < PRECO_DE_MOVEL &&
    requisitosDoMovel(m).some((r) => r.itemId === 'pedra' || r.itemId === 'concreto'),
);
ok(
  `${decoracaoComPesado.length} peca(s) de decoracao leve pedindo pedra ou concreto ` +
    `(${decoracaoComPesado.map((m) => m.nome).join(', ')}) — enfeite de parede com concreto e mais ` +
    'atrito do que a peca vale',
  decoracaoComPesado.length === 0,
);

// =============================================== 3. A RENDA DA REPRESA ==
//
// A pergunta certa nao e "quanto vale uma peca" — e quanto vale UM ANDAR. Cada
// andar tem `3 + (andar % 3)` recipientes de salvado (tres a cinco), todos da
// tabela da faixa de dez andares em que ele esta, mais o cofre do enigma quando
// o enigma nao trava a descida.
//
// O valor esperado sai da ARITMETICA da tabela, nao de amostragem: peso sobre
// peso total, vezes valor, vezes a fracao da revenda. `sortearSucata` recebe o
// aleatorio por parametro justamente pra a conferencia poder ser exata.
const valorEsperadoDaTabela = (id) => {
  const t = buscarTabelaDeSucata(id);
  if (!t) return 0;
  const pesoTotal = Object.values(t.pesos).reduce((a, b) => a + b, 0);
  const porPeca = Object.entries(t.pesos).reduce(
    (soma, [item, peso]) => soma + (peso / pesoTotal) * valorDeSucata(item) * FRACAO_DE_REVENDA,
    0,
  );
  // pecasMin..pecasMax, sorteado uniforme
  return porPeca * ((t.pecasMin + t.pecasMax) / 2);
};

console.log('--- renda da represa, por faixa de dez andares ---');
const porFaixa = [];
for (let faixa = 0; faixa < 5; faixa++) {
  const tabela = `nivel_${faixa}`;
  let total = 0;
  for (let andar = faixa * 10 + 1; andar <= faixa * 10 + 10; andar++) {
    total += (3 + (andar % 3)) * valorEsperadoDaTabela(tabela);
  }
  const premio = valorEsperadoDaTabela(`${tabela}_premio`);
  porFaixa.push({ faixa, tabela, total, media: total / 10, premio });
  console.log(
    `  andares ${faixa * 10 + 1}-${faixa * 10 + 10} (${tabela}): ` +
      `${reais(total / 10)}/andar, ${reais(total)} na faixa, cofre de enigma ${reais(premio)}`,
  );
}
const represaInteira = porFaixa.reduce((s, f) => s + f.total, 0);
console.log(`  descida completa dos 50 andares: ${reais(represaInteira)} de salvado`);

// A progressao de profundidade tem de PAGAR mais: descer custa municao, vida e
// tempo, e sem renda crescente o jogador otimiza ficando no andar raso
for (let i = 1; i < porFaixa.length; i++) {
  ok(
    `a faixa ${i} paga ${reais(porFaixa[i].media)}/andar contra ${reais(porFaixa[i - 1].media)} da ` +
      `faixa ${i - 1} — sem renda crescente com a profundidade o jogador otimiza ficando no raso`,
    porFaixa[i].media > porFaixa[i - 1].media,
  );
}
// e o cofre de enigma paga mais que um recipiente comum da mesma faixa, senao
// resolver o enigma nao vale o tempo
for (const f of porFaixa) {
  const comum = valorEsperadoDaTabela(f.tabela);
  ok(
    `o cofre de enigma da faixa ${f.faixa} paga ${reais(f.premio)} contra ${reais(comum)} de um ` +
      'recipiente comum — resolver o enigma tem de pagar melhor que abrir uma caixa',
    f.premio > comum,
  );
}

// ============================================================ 4. COMBATE ==
//
// O combate nao e fonte de renda: o salvado esta em caixa, nao em inimigo. Ele e
// CUSTO — municao e vida. A pergunta e se esse custo cabe na renda do andar.
console.log('--- combate ---');
console.log(`  vida do jogador: ${HP_MAXIMO}`);
console.log(
  `  golpe corpo a corpo: ${ATAQUE_DO_JOGADOR.dano} de dano, ` +
    `${ATAQUE_DO_JOGADOR.recarga}ms de recarga, de graca`,
);
const custoCartucho = precoDe('municao_pistola');
console.log(`  cartucho: ${reais(custoCartucho)}, ${CARTUCHO_POR_DISPARO} por disparo`);
for (const [id, a] of Object.entries(ARMAS)) {
  console.log(
    `  ${id}: ${a.dano} de dano, cadencia ${a.cadencia}ms, ` +
      `${reais((custoCartucho * CARTUCHO_POR_DISPARO) / a.dano)} por ponto de dano`,
  );
}
const inimigos = Object.entries(CATALOGO_INIMIGOS);
console.log(`  ${inimigos.length} tipos de inimigo:`);
for (const [id, i] of inimigos) console.log(`    ${id}: ${i.hpMax} hp, ${i.dano} de dano`);

const maiorDano = Math.max(...inimigos.map(([, i]) => i.dano));
ok(
  `o golpe mais forte do jogo tira ${maiorDano} de ${HP_MAXIMO} de vida; ` +
    'um golpe que mata de vida cheia nao da ao jogador a chance de recuar',
  maiorDano < HP_MAXIMO,
);
// o comentario de inimigos.ts promete que o pior encontro possivel nao mata de
// vida cheia; aqui o numero cobra a promessa
ok(
  `dois golpes do pior inimigo tiram ${maiorDano * 2} de ${HP_MAXIMO} — inimigos.ts promete que ` +
    'o pior encontro possivel nao mata de vida cheia',
  maiorDano * 2 < HP_MAXIMO,
);

// --- o custo de limpar um andar, contra o que ele paga ---
const arma = ARMAS.pistola ?? Object.values(ARMAS).find((a) => a.municao);
console.log('--- custo de municao contra renda do andar ---');
for (const faixa of porFaixa) {
  // o pior caso da faixa e o ultimo andar dela: mais inimigos e a fauna mais
  // pesada que ela sorteia
  const ultimo = faixa.faixa * 10 + 10;
  const quantos = inimigosDoAndar(ultimo);
  const especies = faunaDoAndar(ultimo)
    .map((f) => CATALOGO_INIMIGOS[f.tipo])
    .filter(Boolean);
  const hpMedio = especies.reduce((s, e) => s + e.hpMax, 0) / Math.max(1, especies.length);
  const cartuchos = quantos * Math.ceil(hpMedio / arma.dano) * CARTUCHO_POR_DISPARO;
  const custo = cartuchos * custoCartucho;
  console.log(
    `  andar ${ultimo}: ${quantos} inimigo(s) de ${hpMedio.toFixed(0)} hp medio = ${cartuchos} ` +
      `cartucho(s) (${reais(custo)}) contra ${reais(faixa.media)} de salvado — ` +
      `sobra ${reais(faixa.media - custo)}`,
  );
  ok(
    `o andar ${ultimo} rende ${reais(faixa.media)} de salvado e gasta ${reais(custo)} de municao ` +
      'se o jogador matar tudo a bala; um andar que da prejuizo transforma a represa num imposto, ' +
      'e a represa e o conteudo narrativo do jogo',
    faixa.media > custo,
  );
}
// e existe a saida de quem esta sem dinheiro: o golpe corpo a corpo nao gasta
// nada, e por isso ele tem de ser capaz de matar o pior bicho num numero de
// golpes que caiba numa briga
const hpMaisDuro = Math.max(...inimigos.map(([, i]) => i.hpMax));
const golpes = Math.ceil(hpMaisDuro / ATAQUE_DO_JOGADOR.dano);
ok(
  `o golpe corpo a corpo (${ATAQUE_DO_JOGADOR.dano} de dano) mata o inimigo mais duro ` +
    `(${hpMaisDuro} hp) em ${golpes} golpes, de graca — e a saida do jogador sem dinheiro`,
  golpes <= 12,
);
ok(
  `a pistola (${arma.dano} de dano) bate mais forte que o golpe de graca ` +
    `(${ATAQUE_DO_JOGADOR.dano}) — senao a municao e dinheiro jogado fora`,
  arma.dano > ATAQUE_DO_JOGADOR.dano,
);

// ================================================== 5. AS DUAS PONTAS ==
//
// A ultima pergunta: uma fonte de dinheiro APAGA a outra?
//
// A primeira versao desta conferencia cobrava uma razao — "o fundo nao paga mais
// de 3x um dia de quadro" — e a razao era numero escolhido no ar. O fundo da
// usina e o fim de uma descida de cinquenta andares, com municao, vida e leitura
// de cinquenta fichas no caminho: ele TEM de pagar mais que um dia de entregas.
// Uma razao proibia isso sem dizer por que.
//
// O que importa e outra coisa, e da pra medir: uma descida no fundo nao pode
// comprar a CASA INTEIRA. Se comprar, todo o resto do jogo — quadro de trabalho,
// loja, expansao, mobilia — deixa de existir no instante em que o jogador chega
// no andar 41, e ele nao decidiu isso; a tabela de loot decidiu por ele.
//
// A comparacao e por DIA DE JOGO. Uma descida de dez andares e um dia cheio.
const diaNoRaso = porFaixa[0].total;
const diaNoFundo = porFaixa[4].total;
console.log('--- as duas pontas, por dia de jogo ---');
console.log(`  um dia de quadro cheio: ${reais(rendaMedia)}`);
console.log(`  um dia de descida no raso (andares 1-10): ${reais(diaNoRaso)}`);
console.log(`  um dia de descida no fundo (andares 41-50): ${reais(diaNoFundo)}`);

// O RASO COM A PONTE: uma peca comum vale a revenda se for vendida e o bonus de
// reposicao se for guardada. A descida no raso sorteia quase so comum, entao a
// diferenca entre os dois usos e exatamente o que a ponte mudou.
const tabelaRaso = buscarTabelaDeSucata('nivel_0');
// quatro recipientes por andar, na media de `3 + (andar % 3)`, dez andares
const pecasComunsNoRaso = 4 * ((tabelaRaso.pecasMin + tabelaRaso.pecasMax) / 2) * 10;
const bonusMedio = bonus.reduce((a, b) => a + b, 0) / bonus.length;
// so cabe UMA reposicao por conserto, e o quadro traz um a dois consertos por
// dia: dez dias de descida dao dez dias de conserto pra gastar as pecas
const reposicoesAproveitaveis = Math.min(
  pecasComunsNoRaso,
  (consertos.length / DIAS_DO_ANO) * 10,
);
const rasoComPonte = diaNoRaso + reposicoesAproveitaveis * bonusMedio;
console.log(
  `  o raso rende ${pecasComunsNoRaso} pecas comuns; ${reposicoesAproveitaveis.toFixed(1)} cabem ` +
    `em consertos nos dez dias seguintes, a ${reais(bonusMedio)} de bonus cada`,
);

const razaoRaso = rendaMedia / diaNoRaso;
const razaoFundo = Math.max(rendaMedia, diaNoFundo) / Math.min(rendaMedia, diaNoFundo);
console.log(
  `  quadro contra raso: ${razaoRaso.toFixed(1)}x    quadro contra fundo: ${razaoFundo.toFixed(1)}x`,
);
const razaoComPonte = rendaMedia / rasoComPonte;
console.log(
  `  um dia de descida no raso, com a sucata usada como reposicao: ${reais(rasoComPonte)} ` +
    `(${razaoComPonte.toFixed(1)}x contra o quadro, era ${razaoRaso.toFixed(1)}x vendendo tudo)`,
);
ok(
  `o quadro paga ${razaoRaso.toFixed(1)}x uma descida no raso com a sucata VENDIDA; acima de 6x ` +
    'descer nos primeiros andares deixa de ser jeito de ganhar dinheiro e vira so pedagio da historia',
  razaoRaso <= 6,
);
ok(
  `com a sucata usada como reposicao no conserto o raso chega a ${reais(rasoComPonte)}, ` +
    `${razaoComPonte.toFixed(1)}x contra o quadro. A ponte tem de melhorar o raso de verdade: se ` +
    'guardar a sucata nao muda a conta, ela nao passa de mais um item ocupando a mochila',
  rasoComPonte > diaNoRaso * 1.5,
);
// a restricao que significa algo: quantas descidas no fundo pra mobiliar a casa
const descidasPelaCasa = casaCompleta / diaNoFundo;
console.log(
  `  descidas no fundo pra pagar a casa inteira (${reais(casaCompleta)}): ` +
    `${descidasPelaCasa.toFixed(1)}`,
);
ok(
  `uma descida no fundo paga ${reais(diaNoFundo)} e a casa inteira custa ${reais(casaCompleta)}: ` +
    `${descidasPelaCasa.toFixed(1)} descidas. Abaixo de duas, chegar no andar 41 apaga o quadro de ` +
    'trabalho, a loja e a casa de uma vez — e quem decidiu isso foi a tabela de loot, nao o jogador',
  descidasPelaCasa >= 2,
);
// e um teto largo por cima, so pra uma edicao futura nao poder multiplicar o
// fundo por dez sem alguem notar
ok(
  `o fundo paga ${razaoFundo.toFixed(1)}x um dia de quadro; o fundo pode pagar melhor que um dia ` +
    'de entregas, mas dez vezes melhor nao e recompensa por profundidade e sim erro de tabela',
  razaoFundo <= 10,
);


// ------------------------------------------------ as obras da cidade e o material
//
// Ate esta leva a cidade se construia so com saldo, e era a ultima ponte aberta
// do roteiro: os dois pontos de madeira e os dois de pedra da zona rural rendiam
// material que SO a casa do protagonista consumia. Quem nao mobiliava nao tinha
// motivo nenhum pra ir ate la.
//
// A conta que interessa nao e "quanto custa": e quanto do custo de uma obra e
// TRABALHO e quanto e saldo. Material se compra (madeireira e pedreira vendem),
// entao a exigencia nunca e tranca — e um segundo preco, pagavel dos dois
// jeitos. Se esse segundo preco for simbolico, a ponte nao existe na pratica.
const precoDoMaterial = (id) => CATALOGO_ITENS.find((i) => i.id === id)?.preco ?? 0;
const contaDaObra = (projeto) => {
  const material = projeto.materiais.reduce(
    (s, r) => s + precoDoMaterial(r.itemId) * r.quantidade,
    0,
  );
  return { material, dinheiro: projeto.custo, total: material + projeto.custo };
};

const obras = Object.values(PROJETOS_CIDADE);
console.log('\n--- obras da cidade: dinheiro contra material ---');
const totalDeMaterial = {};
for (const obra of obras) {
  const c = contaDaObra(obra);
  for (const r of obra.materiais) {
    totalDeMaterial[r.itemId] = (totalDeMaterial[r.itemId] ?? 0) + r.quantidade;
  }
  console.log(
    `  ${obra.nome.padEnd(20)} ${reais(c.dinheiro).padStart(11)} de saldo + ` +
      `${reais(c.material).padStart(11)} de material ` +
      `(${obra.materiais.map((r) => `${r.itemId} x${r.quantidade}`).join(', ')})`,
  );
  ok(
    `a obra "${obra.nome}" nao pede material nenhum. Obra publica que se levanta so com saldo e ` +
      'a ponte da zona rural fechada de novo',
    obra.materiais.length > 0,
  );
  ok(
    `a obra "${obra.nome}" pede material que nao existe no catalogo, ou de preco zero: ` +
      JSON.stringify(obra.materiais),
    obra.materiais.every((r) => r.quantidade > 0 && precoDoMaterial(r.itemId) > 0),
  );
  ok(
    `o material da obra "${obra.nome}" vale ${reais(c.material)} contra ${reais(c.dinheiro)} de ` +
      'saldo. Abaixo de metade do preco em dinheiro, exigir material vira enfeite: o jogador ' +
      'compra os tres itens no caminho e nunca descobre que os pontos de coleta existem',
    c.material >= c.dinheiro * 0.5,
  );
}

// O teto: a maior obra publica nao pode pedir mais material que o maior comodo
// da casa, que e a garagem. Passar disso inverteria a escala do jogo — a cidade
// sairia mais cara de construir que a casa inteira de quem a constroi.
const materialDaGaragem = Math.max(
  ...EXPANSOES.map((e) => e.materiais.reduce((s, r) => s + precoDoMaterial(r.itemId) * r.quantidade, 0)),
);
const maiorObra = obras.reduce((a, c) => (contaDaObra(c).material > contaDaObra(a).material ? c : a));
ok(
  `a obra "${maiorObra.nome}" pede ${reais(contaDaObra(maiorObra).material)} de material e o maior ` +
    `comodo da casa pede ${reais(materialDaGaragem)}. A cidade nao pode custar mais material que ` +
    'a casa de quem a levanta',
  contaDaObra(maiorObra).material <= materialDaGaragem,
);

// E a conta em DIAS: os quatro pontos rurais rendem 3 unidades a cada 2 dias
// cada um, e madeira e pedra se juntam no mesmo dia (sao pontos diferentes).
const porTipo = {};
for (const no of NOS_RURAIS) {
  if (no.tipo === 'canteiro') continue;
  porTipo[no.tipo] = (porTipo[no.tipo] ?? 0) + 3 / 2; // 3 unidades a cada 2 dias
}
const diasDeColeta = Math.max(
  ...Object.entries(totalDeMaterial)
    .filter(([id]) => porTipo[id])
    .map(([id, qtd]) => qtd / porTipo[id]),
);
const semPontoDeColeta = Object.keys(totalDeMaterial).filter((id) => !porTipo[id]);
console.log(
  `  a cidade inteira: ${Object.entries(totalDeMaterial).map(([id, q]) => `${id} x${q}`).join(', ')}` +
    ` — ${diasDeColeta.toFixed(0)} dia(s) de coleta no ritmo dos pontos rurais` +
    (semPontoDeColeta.length > 0 ? ` (${semPontoDeColeta.join(', ')} so na loja)` : ''),
);
ok(
  `juntar o material das quatro obras leva ${diasDeColeta.toFixed(0)} dia(s) de coleta, de um ano ` +
    'de 112. Menos de dez dias e uma ida a zona rural resolvendo a cidade toda, e a ponte volta a ' +
    'ser decorativa',
  diasDeColeta >= 10,
);
ok(
  `juntar o material das quatro obras leva ${diasDeColeta.toFixed(0)} dia(s) de coleta, de um ano ` +
    'de 112. Acima de sessenta o jogador compra tudo e os pontos de coleta viram cenario de novo, ' +
    'so que pelo motivo oposto',
  diasDeColeta <= 60,
);

if (falhas.length > 0) {
  console.error(`\n[equilibrio] ${falhas.length} de ${conferencias} conferencias FALHARAM:`);
  for (const f of falhas) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[equilibrio] ${conferencias} conferencias passaram`);

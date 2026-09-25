# Casa, economia e combate: medir antes de mexer

## Implemented
O roteiro do overhaul pede esta etapa com estas palavras: *"simular renda diária, custos e tempo até compras **antes** de rebalancear; conectar materiais, sucata, obras e reparos"*. A conferência de economia que já existia (1.458 checagens) prova que uma transação recusada não deixa rastro no saldo nem no inventário — prova **correção**. Não provava equilíbrio: nada media quantos dias de jogo custa a garagem, nem se descer na represa paga a munição que ela gasta.

`npm run verificar-equilibrio` é o simulador. Ele roda o código de verdade — o quadro de vagas dos 112 dias do ano, as onze tabelas de salvado, o catálogo de móveis, as armas, os sete inimigos — imprime o retrato da economia e depois cobra pisos e tetos sobre ele. Cada piso tem escrito ao lado o que o jogador sente quando o número passa dele; nenhum é gosto.

A primeira rodada achou dois problemas e três medidas mal formuladas minhas.

## O que a medição achou

**A casa inteira custava onze dias de trabalho.** Um dia de quadro cheio (cinco vagas) paga R$ 736,65 na média do ano. As três expansões mais os vinte e dois móveis somavam R$ 8.115 — dez por cento de um ano de jogo. Todo o conteúdo de casa acabava na segunda semana, e comprar deixava de ser decisão porque não havia o que escolher entre: o móvel mais caro do catálogo, o sofá, custava R$ 320, menos de meio dia de trabalho.

O comentário de `casa.ts` já prometia que o depósito seria "uma meta de curto prazo, umas 5 vagas boas". A R$ 800 ele custava duas vagas e meia. O preço havia derivado abaixo da própria intenção documentada.

**O fundo da represa pagava treze dias de trabalho por descida.** Dez andares do fundo rendiam R$ 9.730 de salvado — mais que a casa inteira. Quem chegasse ao andar 41 não tinha mais motivo para abrir o app Trabalho, nem para olhar preço de nada, e não foi ninguém que decidiu isso: foi a tabela de loot. A causa era medível: a tabela `nivel_4` dava **36% de chance de peça rara por peça sorteada**, e a `nivel_4_premio` dava 77%. Com trinta e seis por cento, "rara" era a peça que o jogador via em toda caixa do fundo — contra a palavra que o próprio comentário da tabela usava, "aparece".

**E o raso da represa não pagava nada.** As cinco peças comuns (ferro-velho, parafusos, cabo velho, fio de cobre, conector danificado) valem de R$ 1,60 a R$ 5,60 na revenda e não serviam para mais nada. Dez andares do raso rendiam R$ 158, quase cinco vezes menos que um dia de quadro. Os primeiros dez andares eram pedágio da história, não um lugar onde se ganha algo.

## O que mudou

**A casa passou a custar uma estação.** Expansões R$ 1.600 / R$ 4.000 / R$ 9.000 — o depósito agora custa as cinco vagas boas que o comentário sempre prometeu. A mobília subiu de forma **desigual, de propósito**: decoração ×1,5 e móvel ×3. A escada era estreita demais para se escolher dentro dela; com decoração entre R$ 45 e R$ 135 e móvel entre R$ 270 e R$ 960, o sofá passou a custar mais de um dia de trabalho, e comprar o sofá passou a ser *em vez de* outra coisa. A casa inteira: R$ 22.540, trinta e um dias, 27% do ano.

**A chance de peça rara virou uma escada declarada.** 0% até o `nivel_2`, 4% no `nivel_3`, 12% no `nivel_4` — três vezes a anterior, e ainda uma peça em cada oito. Os cofres de enigma ficaram no dobro do sorteio comum da sua faixa. O `nivel_4_cofre` continua 100% raro: ele é a fonte declarada de peça rara, é uma por descida, e é o gancho de história da usina. O fundo caiu de R$ 9.730 para R$ 5.625 na faixa — quatro descidas para pagar a casa, em vez de uma sobrando.

**E a peça de reposição fechou a ponte que faltava.** Um conserto **completo** aceita uma das cinco peças comuns de sucata: ela sai do inventário e o pagamento vem com 20% a mais. É o único lugar do jogo onde uma peça comum vale mais guardada que vendida — R$ 17 a R$ 56 de bônus contra R$ 5,60 da melhor revenda, três a dez vezes mais.

O efeito medido é o que a etapa procurava: **um dia de descida no raso passou de R$ 158 para R$ 736 quando a sucata é guardada em vez de vendida.** Exatamente um dia de trabalho. Os dez primeiros andares deixaram de ser pedágio e passaram a alimentar o app Trabalho, que é onde a sucata vira dinheiro de verdade.

## Architecture
`reposicaoDoConserto` recebe uma **função de contagem** em vez do inventário. É o que deixa a conferência offline rodar as combinações sem montar um inventário de verdade, e o que impede `trabalhos.ts` de importar `inventario.ts`.

No app, a peça sai **antes** do crédito e volta se o crédito falhar — `creditar` passou a devolver `boolean` justamente para isso. Uma peça gasta sem pagamento seria material perdido sem aviso.

Duas regras que não são detalhe:

- **o bônus é opcional.** Quem nunca desceu na usina trabalha igual, recebe o pagamento cheio e não vê mensagem de falta. Um requisito aqui trancaria o app Trabalho atrás da represa;
- **só o conserto completo consome.** A peça que sobrou de um conserto pela metade não consertou nada, e cobrar o material de quem errou seria cobrar duas vezes.

## Bugs Fixed
**Triplicar o preço triplicou o material em silêncio.** `requisitosDoMovel` deriva a quantidade de material do preço — economia de tabela que acopla duas escalas. Quando os móveis subiram três vezes, o pedido de madeira subiu três vezes junto, e os dois limiares (R$ 90 para pedra, R$ 200 para concreto) caíram **ambos** abaixo do móvel mais barato: as três faixas de material viraram uma, e ninguém decidiu isso. Os limiares estão na escala nova (pedra a partir de R$ 200, concreto a partir de R$ 600) e o simulador agora confere que as três faixas continuam povoadas — madeira em 22 peças de 22, pedra em 5, concreto em 7.

**Três das minhas quatro primeiras medidas estavam mal formuladas**, e vale registrar porque o erro é instrutivo: comparei o custo de matar um inimigo com o preço de *uma* peça comum (o salvado está em caixa, não em inimigo); procurei a arma sem munição em `ARMAS` quando o golpe corpo a corpo mora em `ATAQUE_DO_JOGADOR`; e modelei "uma descida" como seis peças comuns, um número que inventei. A medida certa saiu das tabelas de drop reais e do contador de recipientes por andar (`3 + (andar % 3)`), com valor esperado calculado pela aritmética dos pesos — não por amostragem.

**E uma medida minha que virou uma restrição melhor.** A primeira versão cobrava "o fundo não paga mais de 3x um dia de quadro", e o 3 era número escolhido no ar. O fundo da usina é o fim de uma descida de cinquenta andares, com munição, vida e cinquenta fichas no caminho: ele *tem* de pagar mais que um dia de entregas. A restrição que substituiu diz algo: **uma descida no fundo não pode comprar a casa inteira** — se comprar, todo o resto do jogo deixa de existir no instante em que o jogador chega ao andar 41. Hoje são quatro descidas.

## Gameplay
O combate não mudou, e a medição é a razão: ele passou em tudo. O golpe mais forte do jogo tira 8 de 30 de vida, dois golpes do pior inimigo tiram 16 — o comentário de `inimigos.ts` promete que o pior encontro possível não mata de vida cheia, e o número cumpre. Todo andar rende mais do que gasta de munição, do 10 (sobra R$ 5,84) ao 50 (sobra R$ 475). O golpe corpo a corpo é de graça e mata o inimigo mais duro em oito golpes, que é a saída de quem está sem dinheiro, e a pistola bate mais forte que ele, senão a munição seria dinheiro jogado fora.

## A ponte das obras: material, não só saldo
As quatro obras municipais subiam só com saldo, e era a última ponte aberta do roteiro: os dois pontos de madeira e os dois de pedra da zona rural rendiam material que **só** a casa do protagonista consumia. Quem não mobiliava não tinha motivo nenhum de ir até lá.

Agora cada obra declara `materiais`, na mesma escala de `EXPANSOES` — o depósito da casa sai por 20 de madeira e 12 de pedra:

| obra | saldo | material |
| --- | --- | --- |
| Ponto de Ônibus | R$ 40,00 | madeira ×8, concreto ×6 — R$ 92,00 |
| Cafeteria da Estação | R$ 80,00 | madeira ×24, pedra ×10 — R$ 156,00 |
| Padaria do Bairro | R$ 90,00 | madeira ×26, pedra ×12 — R$ 176,00 |
| Posto de Saúde | R$ 150,00 | madeira ×20, pedra ×18, concreto ×20 — R$ 388,00 |

Isso **não é uma tranca**, e o documento não vai fingir que é: madeira e concreto estão à venda na madeireira, pedra e concreto na pedreira. É um segundo preço, pagável em trabalho ou em dinheiro. O que ele muda é que os pontos de coleta passam a valer dinheiro de verdade — juntar o material das quatro obras é **26 dias** de coleta no ritmo dos pontos rurais (3 unidades a cada 2 dias, por ponto), de um ano de 112. O concreto não tem ponto de coleta: esse só na loja.

A transação tem o mesmo formato da compra de cômodo: a falta é avisada antes, `cabe()` confere de novo dentro da transação da carteira, e se o saldo não der **nada** é consumido.

### E o que a medição escancarou
Pôr as obras na tabela ao lado do resto deixou visível uma coisa que nenhuma das etapas anteriores tinha olhado: **o preço em dinheiro de uma obra pública ficou fora de escala**. Um Posto de Saúde custa R$ 150,00 num jogo em que um sofá custa R$ 960,00 e a casa inteira R$ 22.540,00. A etapa 6 multiplicou por três o catálogo de mobília e rebaseou as expansões, e não tocou nos quatro números das obras — eles são os mesmos de antes do rebalanceamento.

Com o material, o custo real de uma obra passou a ser majoritariamente material (o Posto de Saúde: R$ 150 de saldo contra R$ 388 de material), o que disfarça o problema sem resolvê-lo. **Não mexi no preço**: multiplicar por trinta o custo das quatro obras é uma decisão de jogo, não um conserto de bug, e não estava no que foi pedido. Fica registrado com o número na mão.

## Save Compatibility
Nenhuma versão de save mudou e nada novo é persistido. Preço de móvel e peso de tabela de loot são **tabelas**, não estado: um save antigo abre com o saldo que tinha e com a casa que já comprou, e vê os preços novos nas peças que ainda não comprou. A peça de reposição não guarda nada — ela é consultada no momento do pagamento.

O único efeito visível num save antigo é honesto: quem já tinha dinheiro guardado compra mais barato do que quem começa hoje. O contrário — retroagir preço — exigiria mexer no saldo de um save alheio.

## Tests
`npm run verificar-equilibrio`: **70 conferências**, e o retrato completo impresso antes delas. O quadro de trabalho nos 112 dias (cinco vagas todo dia, os três tipos todo dia, pior dia a 45% do melhor), a escada de raridade da sucata na média *e* na prateleira, o tempo até cada compra, as três faixas de material, a renda por faixa de dez andares crescendo com a profundidade, o cofre de enigma pagando mais que a caixa comum da mesma faixa, munição contra salvado em cada faixa, e as duas pontas.

Ele **junta** as falhas em vez de parar na primeira: um piso de equilíbrio quebrado não é bug de código, é decisão de número pendente, e quem for ajustar preço precisa ver o quadro inteiro antes de mexer em qualquer coisa — mexer no preço da casa muda o tempo até a compra de tudo.

`npm run test:equilibrio-browser`: quatro conferências no jogo de pé, pelo caminho de crédito **do app** (`pagarConserto`, o mesmo método que o quebra-cabeça chama ao encaixar a última peça) e não por uma conta reimplementada no teste. Conserto completo pagando R$ 85 sem peça e R$ 102 com uma de ferro-velho, com a peça saindo da mochila (3 → 2); pagamento cheio para quem não tem peça; conserto de 2/3 pagando proporcional (R$ 56,66) e **não** consumindo peça; e os preços novos chegando na tela.

Regressão: 19 validadores de domínio (incluindo as 1.458 checagens de economia e as de inventário), `test:browser` (77 mapas, sete apps, save/reload), save, e `npm run test:producao` contra o build.

## Performance
Nada muda por quadro. O simulador é ferramenta de linha de comando; `reposicaoDoConserto` roda uma vez por conserto concluído e varre cinco ids.

## Known Remaining Work
As duas pontes fechadas são **sucata → reparos** e **produção rural → obras urbanas**. O que continua aberto:

- o **preço em dinheiro das obras** continua o de antes do rebalanceamento da etapa 6 (R$ 40 a R$ 150), fora de escala com tudo o mais. Ver a seção das obras acima: está medido, e não foi mexido de propósito;
- **materiais → fabricação** tem exatamente **uma** receita (`RECEITAS` em `atividadesRurais.ts`: lanterna de manutenção, de dois cabos USB e três madeiras). Uma bancada com uma receita não é uma bancada;
- a **peça de reposição não aparece na tela do quebra-cabeça antes do pagamento** — o jogador só descobre o bônus quando ele já entrou. Anunciar antes ("você tem ferro-velho: +20%") transformaria o bônus em decisão em vez de surpresa;
- as **11 tabelas de loot** têm peso escrito à mão. A escada de raridade é hoje conferida, mas não gerada: uma tabela nova ainda pode nascer com o peso errado e só o validador avisa.

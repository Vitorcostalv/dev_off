# Interiores urbanos: densidade e leitura dos prédios públicos

## Implemented
Medi a mobília por área dos 23 interiores antes de mexer em nada, e o resultado apontou onde estava o problema — não nas casas, mas nos prédios públicos: biblioteca com 3,6 peças por 100 tiles, escola com 3,7, mercado com 5,5 e academia com 6,9, contra 8 a 9,3 das residências. Sala grande com quatro peças não lê como biblioteca; lê como caixa com props. A casa do protagonista, o interior mais visitado do jogo, era a menor de todas (4,1).

Agora: biblioteca 6,97 (12 → 23 peças), escola 6,77 (14 → 26), mercado 9,70 (18 → 32), academia 10,19 (15 → 22) e a casa+oficina do protagonista 5,75 (31 → 43). Média dos 23 interiores em 7,80.

## Architecture
Nada de novo: as peças entram nas mesmas tabelas que o projeto já usava — `CATALOGO_POR_COMODO` para os interiores multi-cômodo (a peça declara folha, endereço e se é sólida) e `MERCADO_PECAS`/`ACADEMIA_PECAS` para os dois salões de uma sala. Catorze entradas novas no catálogo, nas categorias `biblioteca`, `escola` e `comum`, respeitando a regra que já existia: cômodo só recebe peça da própria categoria mais as `comum`.

`tools/folha-contato.mjs` é novo e é ferramenta de autoria: monta a folha de contato de um atlas de móvel, com marcadores do endereço `[linha, indice]` em cada célula. Escolher peça é escolher endereço, e o atlas empacotado não diz o que cada endereço desenha — sem isso a escolha é tentativa e erro dentro do jogo.

## Gameplay
Biblioteca: o acervo ganhou periódicos e uma estante baixa quebrando a fileira de altas; a sala de leitura, que tinha uma mesa em dez tiles de largura, ganhou mesa redonda, mesa de estudo, poltrona, puff, tapete, luminária de pé e pendente. Mercado: frente de caixa com balança, terminal e fila, carrinhos e cestas na entrada, hortifruti em caixote a leste, área de reposição com palete e engradado a oeste, e sinalização. Academia: bebedouro, vestiário, lixeira, colchonetes, bosu, banquinho e toalhas — antes era fileira de aparelho e nada mais. Escola: a diretoria virou sala de direção de verdade (arquivo, quadro, relógio, planta) e o hall ganhou bancos de espera, armário, lixeira e tapete. Casa do protagonista: prateleira de livros e despertador no quarto, despenseiro e micro-ondas na cozinha, toalheiro e cesto no banheiro, estante e poltrona na sala.

## UI/Art
Todas as peças vêm de folhas que já estavam no projeto e não eram usadas por inteiro — `Mobilhas_v1`, `Mobilia_v2`, `Utensilios_mercado`, `Utensilios_academia`. A folha de mobília v2 tem 129 peças e o jogo usava 32.

## Save Compatibility
Nenhuma versão de save mudou. A mobília de interior é cenário do tilemap, não estado salvo — a única mobília com estado é a que o jogador compra e posiciona, e essa não foi tocada. Os três cômodos de expansão da casa do protagonista continuam nascendo vazios de propósito.

## Bugs Fixed
Nenhum bug de código; o que apareceu foram **oito** conflitos de layout, todos reprovados pelo `conferirInterior` do gerador antes de escrever mapa algum: peça dividindo tile de base com outra (bibliotecas, banheiro e oficina), peça ilhando o fundo de sala de aula, peça tapando a aproximação dos vãos de expansão da oficina e o despenseiro alto ilhando a bancada da cozinha. Duas conclusões ficaram registradas no código em vez de forçadas: as duas salas de aula não cabem mais mobília (seis a oito tiles de largura, e a carteira ocupa dois e meio), e a oficina do protagonista fica com as sete peças que tem, porque as três que tentei acrescentar tapavam a entrada do cômodo ou o caminho das expansões.

## Tests
`npm run verificar-interiores`: 131 conferências nos tilemaps escritos — densidade mínima por interior (com piso próprio para quem tem cômodo vazio de propósito), variedade de peças distintas (vinte cópias da mesma gôndola têm densidade boa e leitura ruim) e nenhum cômodo sem mobília, tirando corredor e expansão. `npm run test:interiores-browser`: os cinco interiores abrem sem erro nem aviso, a contagem de peças na cena bate com o mapa e o jogador percorre cada um andando de verdade, com colisão — 5,3 tiles na biblioteca, 6,3 na escola, 7,4 no corredor do mercado, 5,7 na academia e 11,4 na espinha de corredor da oficina. Densidade e circulação brigam entre si, e é essa segunda conferência que impede ganhar uma às custas da outra.

Regressão: 15 validadores de domínio, as suítes de navegador anteriores (77 mapas, centro, cotidiano, rural, serviços) e o build de produção passaram.

## Performance
Vinte e três peças de móvel a mais no total dos interiores; cada uma é um sprite estático posicionado na carga do mapa. Nenhum interior passou de 43 peças (a oficina, que é o maior, com 34x22 tiles).

## Known Remaining Work
Faltam os 50 andares da represa, que é a outra metade desta etapa. Os quatro interiores de comércio misto (bar, farmácia) estão em 7,5 a 8,2 e cabem mais peças; as casas do bairro (casa_b*) estão em 6,4 a 8,5 e são as próximas se a medição continuar valendo como critério. Nenhum interior tem variação por estação nem por hora além da luz.

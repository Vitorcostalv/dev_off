# Vida na cidade — etapa de 22/09/2026

Continuação da execução de [PENDENCIAS.md](PENDENCIAS.md), depois de [vida pessoal e convivência](vida-pessoal-convivencia.md). Esta etapa fecha os itens de companhia animal, fauna, roupas, aparência, cenas de vínculo e aniversários. O checklist permanece com o que ainda falta.

## Animal de companhia (`src/game/companhia.ts`)

O bicho não é comprado nem dado por missão: os dois pretendentes já estavam no quadro de avisos da cidade — o cachorro manso da Zona Rural e um gato do muro do bairro. Aproximar-se vale uma vez por dia; na terceira vez ele aceita ir junto e o jogador escolhe um nome entre três.

- Dorme em quatro lugares diferentes da casa/oficina, alternados pelo dia; com chuva ou temporal ele se recolhe perto da porta.
- Espera na calçada quando o jogador se afasta: acompanha até 14 tiles da porta com tempo bom, 7 na chuva e 4 no temporal.
- Aparece na oficina durante o trabalho e tem um ponto doméstico próprio (a tigela) para alimentar, ver onde ele está e ficar por perto.
- Alimentar vale uma vez por dia e é opcional. **Não existe fome, penalidade ou decaimento**: esquecer só muda o texto.
- Seis moradores comentam o bicho uma vez cada, pelo nome escolhido.

## Fauna de rua (`src/game/fauna.ts`, `src/scenes/BichosDoMundo.ts`)

Catorze pontos de fauna nos quatro mapas externos, entre gatos, cachorros, pássaros, sapos e vagalumes. A presença é consulta pura de mapa, hora, clima e estação — nada é sorteado, então recarregar um save mostra a mesma cidade. Em um dia de cada quatro o bicho não está no ponto dele.

- Sapos só com chuva e à noite; vagalumes só em noites secas de primavera e verão; pássaros da praça só em manhã seca.
- Aproximar-se conta um encontro por dia por bicho. No terceiro encontro o animal passa a ter nome: Farofa (o gato laranja do aviso da praça), Dona Preta, Régua e Bolacha.
- Os bichos e o animal de companhia usam a mesma silhueta em `Graphics`, com ordenação por Y e sombra de contato — o mesmo contrato visual dos personagens.

## Guarda-roupa e aparência (`src/game/guardaRoupa.ts`)

Cinco conjuntos (todo dia, capa de chuva, agasalho de inverno, roupa de oficina e roupa da represa), liberados por acontecimento: a primeira chuva observada, o primeiro inverno, a cena da oficina e a primeira descida na represa. Mais quatro peças recebidas de moradores: cachecol de Jaqueline, boné de Hiago, luvas de Wendel e o pano de Davi.

- Nenhuma roupa dá bônus de combate, dinheiro ou velocidade. Quando o conjunto não combina com o dia, o protagonista comenta uma vez por dia e nada mais acontece.
- Quem deu a peça percebe uma vez, na abertura da conversa.
- Cabelo e barba têm três estágios (14 e 30 dias desde o último cuidado). A recaída da campanha adianta um estágio; o espelho permite cortar o cabelo, fazer a barba ou deixar como está.
- No mundo, tudo isso é desenhado como acento sobre a folha autoral do protagonista, no mesmo `Graphics` que já desenhava o curativo: a arte ilustrada definitiva do paper doll entra depois sem desfazer nada.

## Cenas de vínculo (`src/game/vidaSocial.ts`)

Dezesseis moradores importantes têm cenas próprias: **cinco** para os oito dos retratos (Edu, Mari, Jaqueline, Letícia, Wendel, Alice, Hiago e Vitor) e **três** para Davi, Luke, Clara, Ilda, Roberto, João, Neide e Ravi — 64 cenas no total. Os limiares de relação acompanham o tamanho da lista (2/4/6/8/10 e 1/3/5), uma cena por morador por dia, e nenhuma delas paga em dinheiro ou item.

## Aniversários (`src/game/aniversarios.ts`)

Os 33 moradores têm data fixa no calendário de quatro estações, sem repetição, e o protagonista faz aniversário em 20 de Outono.

- No dia, o aniversariante comenta uma vez por ano e convida para a noite quando a relação passa de 4. Desejar feliz aniversário rende meio ponto; dar um presente no dia rende uma fala a mais.
- Esquecer gera uma fala no dia seguinte, uma vez, **sem perda de relação**.
- Ninguém sabe a data do protagonista até ele contar, e contar exige alguma intimidade. A lembrança é progressiva: relação alta lembra no primeiro ano, os outros no ano seguinte, e a fala reconhece a diferença.
- No aniversário do protagonista, uma pessoa — a de maior relação e convivência entre quem lembra — bate na porta de casa, uma vez por ano, sem pedir nada.
- O calendário do celular marca os aniversários de quem o jogador já conhece (`°`), o dele (`+`) e os encontros comunitários (`*`); a ficha de contato mostra a data.

## Validação

- `npm run build` (tsc + vite).
- `npm run verificar-vida-na-cidade`: adoção em três dias, alimentação opcional, quatro lugares de sono, alcance por clima, falas dos moradores; janelas de fauna por hora/clima/estação, consulta determinística e reconhecimento por nome; cinco conjuntos, peças por vínculo, comentário por clima, três estágios de cabelo/barba e persistência no save.
- `npm run verificar-aniversarios`: 33 datas únicas pertencentes a NPCs existentes, retorno anual da data, fala uma vez por ano, convite por relação, presente no dia, esquecimento no dia seguinte, lembrança progressiva em dois anos e visita única.
- `npm run verificar-vida-pessoal`: agora confere 16 moradores, 64 cenas e os limiares por tamanho de lista.
- `npm run test:vida-na-cidade-browser`: no Chrome, adoção em três dias na Zona Rural, tigela em casa, bicho parando entre 10 e 14 tiles da porta, três encontros com o gato do muro até virar “Régua”, armário com os cinco conjuntos e o cachecol, espelho cortando cabelo e barba, aniversário contado a Edu e a visita em casa no ano seguinte, calendário marcado e recarga preservando tudo. Evidências em `docs/evidence/fauna-e-companhia.png`, `aniversario-visita.png` e `calendario-aniversarios.png`.
- `npm run test:pendencias-browser`, `npm run test:campanha-browser` e `npm run test:partidas-browser` seguem passando; o primeiro passou a conferir nove pontos domésticos e o armário.
- Os raios de vaivém foram conferidos contra os obstáculos de cada mapa, para nenhum bicho ficar dentro de móvel ou barranco.

## O que esta etapa não entrega

Segue pendente o que está no checklist: prólogo de 10–15 minutos, oficina e clientes, refeições e receitas, caminhadas e bancos, consultas no posto, rádio/jornal/biblioteca/museu, clima extremo, represa ambiental, arte modular ilustrada, tilesets, iluminação, navegação e interfaces. A arte ilustrada de roupas e cabelos continua sob o item do paper doll definitivo.

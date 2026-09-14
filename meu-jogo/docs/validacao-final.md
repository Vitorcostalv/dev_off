# Validação final: a trava de história, a progressão inteira e o save antigo

## Implemented
Sete etapas mexeram em preço, peso de tabela de loot, tamanho de sprite, moldura de painel, pilha de foco e pasta de asset. Cada uma tem a sua conferência. Nenhuma delas responde às duas perguntas que só o fim responde:

**o canon narrativo continua o mesmo?** e **um save gravado antes de tudo isso ainda abre e joga?**

Duas ferramentas novas: `verificar-canon` (397 conferências) e `test:progressao-browser` (cinco, uma delas visitando os cinquenta andares).

## A trava de história
O escopo desta remasterizacão tem uma restrição acima de todas: o canon não se mexe. Não se troca nome de morador, nem família, nem onde ele mora; não se reescreve fala existente; não se acrescenta nem se tira missão pessoal, segredo ou ficha médica; não se renumera capítulo nem andar. Um mapa redesenhado pode *mudar de lugar* um objeto narrativo, mas preserva o id, o texto, a flag de progresso e a ordem em que ele se revela.

"Não devia mexer" não é verificação. `verificar-canon` é.

O que está travado, item por item: os **33 NPCs** com id e nome; os **24 moradores** com casa, mapa de residência e família declarada — as onze casas habitadas, quem mora com quem; as **6 missões pessoais** com id e dono; os **5 segredos** com id, mapa e posição; os **5 capítulos** com nome e faixa de andar, mais as bordas (o andar 10 é Rotina, o 11 é Pressão — um erro de um andar aqui deslocaria a leitura de cinquenta fichas); as **50 fichas médicas** com id e intervalo de dias, fechando a cronologia em 200 dias exatos; e as **11 paradas** do elevador de serviço.

E o que mais importa: **a escada de revelação do paciente**. Nos nove primeiros andares ele é um número de cadastro e nada mais — `PACIENTE 4471-C`. As iniciais chegam no 10, o nome e a profissão no 20, o regime de trabalho no 30, a mudança de endereço no 40, e o encerramento do prontuário no 50. O validador cobra os onze pontos dessa escada, mais duas coisas que a fazem funcionar: que o cadastro `4471-C` aparece **exatamente** nos dezenove primeiros andares, e que as iniciais `V. A.` aparecem em exatamente 41 — do 10 ao 50. Adiantar qualquer degrau desses entrega o fim da história no começo dela.

### De onde a lista veio, e isso importa
A lista foi **capturada do código** no commit que criou o validador, e não transcrita de um documento de design — não existe um no repositório. Então ela não prova que o canon está *certo*: prova que ele não **mudou** desde ali. É o que se pode afirmar com honestidade, e é o que serve ao propósito — as etapas seguintes não podem tocar no canon sem que este arquivo grite.

A primeira rodada do validador falhou em 21 conferências, e todas as 21 eram **minhas suposições erradas**: inventei a tabela de moradia (achei que Julia morava na `casa_5` quando mora na `casa_b4`), inventei ids de segredo que não existem (`segredo_escola`, `segredo_represa`, `segredo_oficina`, quando são `segredo_madeireira`, `segredo_pedreira` e `segredo_fazenda`) e procurei o cadastro do paciente no título da folha, quando ele está no campo `paciente`. Um validador com valores esperados adivinhados é pior que nenhum: ele mente com autoridade. Os valores foram então lidos do código uma vez, com a procedência escrita no cabeçalho do arquivo.

O jeito de travar é o de sempre no projeto: o número e o nome ficam **escritos** no validador, não lidos do mesmo lugar que deveriam validar. Um validador que conta 33 NPCs fazendo `NPCS.length` passa com 32; um que lista os 33 nomes falha dizendo qual sumiu.

## A progressão inteira
`test:progressao-browser` tem quatro partes, e cada uma responde algo que nenhuma suíte de sistema único responde.

**Um dia com tudo junto.** Os sistemas na mesma partida, em sequência, cada um deixando marca no estado: um conserto completo com peça de reposição (pagou R$ 102,00 numa vaga de R$ 85,00, e a sucata saiu do inventário), o catálogo de mobília abrindo com as 22 peças pela pilha de foco, o vaso de flores custando os R$ 45,00 novos e pedindo 1 madeira, a conversa com o Edu registrada, e o computador tomando e devolvendo o foco. O que se testa aqui não é cada um — as outras suítes fazem isso — é que nenhum atropela o outro.

**O que essa parte não cobre, e a diferença importa:** a compra de móvel termina num *clique de ponteiro* (a peça vira um fantasma preso ao cursor, verde onde cabe, e o dinheiro sai no clique válido). Isso é da suíte de interiores. Aqui se cobre o resto do caminho — o catálogo abre, o preço é o novo, o dinheiro sai e a peça posicionada entra no estado da casa.

**Os cinquenta andares.** Cada um carrega, com a ficha certa (`ficha_001` a `ficha_050`), o capítulo certo e o mapa certo — os cinco capítulos saindo na ordem Rotina → Pressão → Colapso → Negação → Reconhecimento, o andar 1 abrindo com o cadastro e o 50 com o prontuário encerrado. Os 45 andares sob demanda buscam tilemap na hora, e todos os cinquenta desenharam móvel com atlas buscado sob demanda.

As flags de porta entram pela mão, e vale dizer por quê: elas são progresso de enigma, e resolver cinquenta enigmas por teclado levaria mais que o tempo de vida do teste. O que se prova aqui é a **descida** — os enigmas são da suíte de represa.

**O save antigo.** Um save v6 escrito à mão, com dinheiro, dia, inventário, cidade construída, fichas recolhidas e relações, abrindo num jogo que desde então mudou preço de móvel, peso de tabela de loot, tamanho de sprite, pilha de foco e pasta de asset. Migra para v7 com tudo no lugar: R$ 138,20, dia 14, 2 cabos USB, 3 sucatas, 3 fichas e a relação com o Edu.

**E o save antigo jogável.** Abrir não basta. Com ele carregado, o mercado abre com 32 móveis (atlas sob demanda funcionando a partir de um save v6), a loja toma o foco, o dia vira, e os 33 moradores voltam com rotina — 15 na rua. Esse último número é o que prova que a camada de clima e estação do item 4 funciona a partir de um save que não sabia que ela existia.

## Save Compatibility
Nada mudou de save nesta etapa. O que ela faz é **provar** a compatibilidade que as sete anteriores prometeram, de duas formas: a conferência offline (`verificar-save`, campo por campo na migração v6 → v7) e a de navegador (v6 abrindo e jogando de verdade).

## Bugs Fixed
Os 21 falsos positivos do canon, descritos acima, e um do teste de progressão que valia registro: a parte da mobília tinha um `f.comprarMovel ? ... : null` que resolvia sempre para `null` — o método não existe com esse nome, e o teste passava sem exercitar nada. Um teste que passa por não testar é a pior categoria de teste, porque compra confiança sem entregar cobertura.

## Tests
`npm run verificar-canon`: 397 conferências de trava de história. Ele **junta** as falhas e imprime todas de uma vez, com uma nota explicando que falha ali não é bug de código — é mudança de canon, e se foi de propósito a lista deve ser atualizada junto, nunca só o código.

`npm run test:progressao-browser`: cinco conferências, incluindo a visita aos cinquenta andares em sequência.

O estado da bateria quando esta etapa fechou era: **20 validadores de domínio** e **16 suítes de navegador**.

As levas que vieram depois — corte do atlas de ícones, material nas obras municipais, folha de NPC por mapa, e o remap dos três mapas externos que faltavam — levaram a bateria a **23 validadores de domínio** (`verificar-tudo`) e **17 suítes de navegador**, mais `test:producao` contra o build. Somando as etapas: 29.605 conferências sociais, 1.458 de economia, 453 de interface, 397 de canon, 209 do centro, 153 do bairro, 79 da zona rural, 70 de equilíbrio, 52 da estrada da represa, e o resto.

**O canon continua travado nas 397 conferências, e as levas seguintes não o tocaram.** O remap dos três mapas move piso e cenário; nenhum nome, casa, família, id de missão, id de segredo, intervalo de ficha ou degrau da escada de revelação mudou — e é `verificar-canon` quem diz isso, não esta frase.

## Known Remaining Work
- **o canon travado é o estrutural, não o textual.** Nome, casa, família, id de missão, id de segredo, intervalo de ficha e escada de revelação estão presos. O **texto** das falas não está: `dialogo.ts` tem milhares de linhas e travar cada uma pediria um hash por fala, que quebraria em qualquer correção de acento. As cinco linhas de cada ficha médica também não estão presas, só o cabeçalho do paciente;
- **os objetos narrativos dos mapas** — id, texto, flag e ordem de revelação — são conferidos por `verificar-represa` e `verificar-mapas` para a usina, mas não há uma lista escrita deles como a que existe para NPC e ficha;
- **a progressão de enigma não é jogada**, é liberada por flag. Uma suíte que resolvesse os onze painéis por teclado provaria a coisa toda de ponta a ponta, e levaria minutos por rodada;
- **o save antigo testado é v6.** Não há amostra de v5 ou anterior no repositório para testar, e `SaveMigration` só declara caminho de v6 em diante;
- **nenhuma suíte mede FPS.** A base de desempenho pedia "FPS e tempo até jogável"; o tempo até jogável agora é medido (2.364 ms), o FPS não.

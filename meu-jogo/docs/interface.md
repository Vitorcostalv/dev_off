# Interfaces e DevOS: tokens, moldura e dono de foco

## Implemented
Duas medições no código das telas abriram esta etapa.

A primeira: **setenta e quatro** `fontSize` escritos à mão, em **dez** valores diferentes (8, 9, 10, 11, 12, 13, 15, 18, 20 e 22px) numa tela de 270px de altura — mais cinco montados em template na `MenuScene`, que passavam por um parâmetro numérico e por isso não apareciam em nenhuma busca por `px`. Dois desses valores (10 e 11) já tinham token e continuavam sendo escritos crus vinte e três vezes. Dez degraus de escala não foi decisão de ninguém: foi cada tela ter nascido num dia diferente.

A segunda: **cinco** molduras de painel copiadas — fala, confirmação, menu, inventário e loja —, com cinco opacidades (0,95, 0,96, 0,97 e 1 duas vezes), o título em quatro alturas (y+6, y+7, y+8 e y+13) e a dica de tecla ora no canto de cima, ora no de baixo.

Agora a escala tem **oito degraus, todos com nome**, e **nenhuma tela escreve tamanho, família de fonte ou cor de moldura**. As cinco molduras saem de uma função só. E o DevOS, que já tinha kit de widgets, ganhou nome para os seis valores que os nove apps repetiam entre si (a cova de conteúdo aparecia em quatro deles, o cartão selecionado em cinco).

Mas o que essas duas medições escondiam era um terceiro problema, e é dele que saiu o ganho de jogo.

## Architecture
As seis janelas — fala, confirmação, menu de assunto, inventário, loja e computador — decidiam **sozinhas** se podiam abrir, cada uma com a sua guarda escrita à mão:

```
abrirArquivo:     if (modalPorCima || lojaAberta || pcAberto) return;
abrirLoja:        if (modalPorCima) return;
abrirComputador:  if (modalPorCima || pcAberto) return;
```

Nenhuma das três conferia a mesma coisa, e as diferenças não eram decisão: **a loja abria com o computador ligado, e o computador abria com a loja aberta**. Uma sétima janela exigiria acertar seis listas, e cada uma que esquecesse a nova daria janela por baixo de janela com o teclado indo para a errada.

`src/game/foco.ts` é uma pilha com **três camadas**, e a regra é uma linha: a camada da janela nova tem de ser maior ou igual à do topo.

1. **conteúdo** — inventário, loja, computador. São excludentes entre si, e a razão é o teclado: inventário e loja navegam com as mesmas setas para coisas diferentes. Abrir a segunda fecha a primeira.
2. **fala** — caixa de diálogo e menu de assunto. Aqui a convivência é o efeito desejado: o retrato de quem fala fica aberto *por baixo* do menu, para o jogador não escolher presente sem ver com quem está falando. Exclusão é propriedade da camada, não da janela — foi o que essa convivência obrigou a separar.
3. **pergunta** — "confirma a compra?" abre sobre qualquer coisa e nada abre sobre ela.

A pilha é um módulo **puro**: sem Phaser e sem `estado`. É o que deixa a conferência offline rodar as 160 sequências de abertura possíveis até quatro de profundidade sem abrir o jogo.

Ela também não fecha janela por conta própria: `abrir` devolve a lista de quem tem de sair, e quem sabe esconder container e cena é a `UIScene`. Do lado da cena existe **um único** lugar que esconde janela (`desmontar`), e é isso que impede pilha e tela de divergirem — o validador conta as cinco linhas dele e recusa uma sexta em qualquer outro método.

`scenes/widgets.ts` é o par do `pc/widgets.ts` que o computador já tinha: `moldura`, `cova`, `tituloDePainel`, `dicaDePainel`, `rodapeDePainel`. A `MenuScene` mantém a paleta própria de propósito — ela é a moldura *em volta* do jogo, não o HUD dentro dele — mas passou a usar a mesma escala de texto, senão seria um sexto conjunto de tamanhos.

## Gameplay
Duas coisas que o jogador sentia e que agora não acontecem mais:

**Escolher assunto com um NPC pedia dois apertos de E.** Falar com um morador abre o menu de temas com o retrato dele por baixo. A ordem de despacho escrita à mão testava `dialogoAberto` antes do menu, então o primeiro E ia para o retrato: apagava a foto e deixava o menu aberto. O segundo E escolhia. Agora o despacho sai do topo da pilha — quem abriu por último recebe a tecla — e um aperto escolhe.

**ESC com uma pergunta aberta cancelava a coisa errada.** A ordem antiga testava o menu antes da confirmação, então uma pergunta aberta por cima de um menu saía pelo menu: o ESC cancelava a escolha de trás e deixava a pergunta na tela, sem dono. Agora ESC fecha o topo, uma janela por aperto.

Também mudou a leitura: a dica de como fechar ficou no alto e à direita de toda janela, na linha do título, em vez de no pé em algumas e no alto em outras. É onde o jogador olha ao abrir a janela — quem abriu o inventário sem querer não precisa varrer a tela para descobrir como sair.

O que **não** mudou: nenhuma janela nova, nenhuma tecla nova, nenhum texto de fala, nenhum preço. O balão de fala sobre a cabeça do NPC continua sendo a única superfície invertida do jogo (letra escura em papel claro), e agora com o motivo escrito no código: ele é desenhado *dentro* do mundo, sobre cenário de qualquer cor, e a moldura escura dos painéis desapareceria contra uma parede de sombra.

## Save Compatibility
Nenhuma versão de save mudou, e nada aqui é persistido. A pilha de foco nasce vazia a cada sessão; janela aberta na hora de salvar não existe, porque salvar acontece com o jogo andando.

## Bugs Fixed
Além dos dois de foco acima, três de conferência que valiam por bug de produto:

- o primeiro validador procurava a declaração do método com `indexOf`, e achava a primeira **chamada** — dava dois abridores como "sem pilha" quando os dois estavam certos;
- o regex de cor casava os seis primeiros dígitos de `0xffffffff`, uma máscara de hash em `encontrosNpc.ts`, e reportava cor de interface onde não havia nenhuma;
- o varredor de tokens lia o arquivo `config.ts` inteiro, e a cor da zona da academia no mapa (`0xff8f7f`) batia com a do fantasma de móvel — falso positivo de "cor repetida" entre duas coisas sem relação nenhuma.

E um do teste de navegador que ensinou algo sobre a `moldura`: medir a borda de 1px pelo `getBounds()` do container caía três pixels fora, porque `getBounds` soma os filhos e o texto do título passa da borda. A leitura dava verde de grama (`#4fa415`) em vez da borda. A correção foi a `moldura` passar a registrar no próprio Graphics o retângulo que desenhou — agora a geometria da moldura é consultável, que é justamente o que um teste precisa.

## Tests
`npm run verificar-interface`: **453 conferências** sobre o fonte das telas e sobre a pilha.

Do fonte: nenhum `fontSize` cru (literal ou montado em template), nenhuma família de fonte crua, a escala com no máximo oito degraus e sem dois degraus do mesmo tamanho, nenhuma moldura de painel desenhada à mão fora dos dois kits, nenhuma cor crua nas telas de moldura, nenhuma cor com nome reescrita crua na camada de apresentação, `modalPorCima` extinto, todo abridor de janela passando pela pilha e exatamente cinco `setVisible(false)` de janela — os cinco de `desmontar`.

Da pilha: as **160 sequências** de abertura de até quatro de profundidade, e em cada uma quatro invariantes — o topo é sempre a última que a pilha aceitou, a camada nunca desce ao subir a pilha, nunca há duas janelas de conteúdo abertas juntas, e "bloqueado" é exatamente o mesmo que ter alguém na pilha. Uma recusa também tem de deixar a pilha idêntica a como entrou.

`npm run test:interface-browser`: sete conferências no jogo de pé, com teclado de verdade — o E único no menu de assunto, o ESC indo para a pergunta e não para o menu, o segundo ESC fechando o menu, a loja fechando o inventário (e ele saindo da tela, não só da pilha), nem menu nem loja abrindo sobre uma pergunta, pilha vazia significando jogo andando, e a borda dos dois painéis medida no pixel: `#6b5f4c` nos dois. Evidência em `docs/evidence/interface-*.png` e `interface-browser.json`.

Regressão: 18 validadores de domínio, `test:browser` (77 mapas, sete apps, save/reload), cotidiano, save, social e controles, e `npm run test:producao` contra o build.

## Performance
Nada por quadro mudou. A pilha é um array de no máximo três posições, tocado só ao abrir e fechar janela. O `setData` da moldura roda uma vez por painel, na criação. O bundle ficou em 1.655,37 kB (gzip 467,82 kB), 2 kB acima do anterior — a pilha e o kit de widgets, menos as cinco cópias de moldura que saíram.

## Known Remaining Work
A padronização é de **token e de foco**, não de layout. O que fica:

- o inventário não passou pelo `rodapeDePainel`: ele tem quatro linhas empilhadas no pé (equipamento, ações, dicas, aviso) num painel de 176px, e mover qualquer uma exige redesenhar a coluna de detalhe — está anotado no código, não forçado;
- a `MenuScene` continua com paleta própria. É decisão, mas nunca foi escrita como tal em nenhum documento de arte;
- o alto contraste ainda troca só o fundo do painel de menu (`0x0c1712`), e não os tokens — uma opção de acessibilidade que mexesse em `UI.texto`/`UI.fundo` valeria para todas as telas de uma vez;
- as sete telas de app do DevOS têm cada uma o seu arranjo de título e rodapé; o kit padroniza a caixa, não a composição;
- o `dicaDePainel` foi para o alto à direita em toda janela, mas o rodapé de comandos da loja e do menu continua sendo texto livre montado por cada um.

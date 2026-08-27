# Meu Jogo

Phaser 3 + TypeScript + Vite. Top-down, pixel art, tilemaps feitos no Tiled.

## Rodar

```bash
npm run dev
```

Abre em http://localhost:5173. `npm run build` gera o `dist/`.
`npm run gerar-assets` remonta o tileset, os atlas de flora e os tilemaps a
partir da arte em `public/assets/sprites/`.

## Controles

| Tecla | Acao |
| --- | --- |
| Setas / WASD | mover |
| Shift + movimento | correr |
| E ou clique | interagir, avancar dialogo, confirmar |
| Setas ou A/D | escolher Sim/Nao na confirmacao |
| Esc | cancelar confirmacao |
| Tab | abrir/fechar inventario |
| M | abrir/fechar mapa da cidade |
| F1 | debug das colisoes |
| F6 | mostrar/esconder as zonas reservadas (debug) |
| F7 | avancar uma hora para testar rotinas (debug) |
| F2 / F3 | adicionar Cabo USB / Bateria no inventario (debug) |
| F4 | apagar o save (debug) |
| F9 | salvar na hora (debug) |

## Estrutura

```
src/
  main.ts              config do Phaser (resolucao, pixelArt, fisica, cenas)
  game/                regras e estado, sem Phaser (quase)
    config.ts          numeros de balanceamento + paleta da UI
    estado.ts          estado global: dia, relogio, inventario, mapa atual
    relogio.ts         tempo de jogo e formatacao da hora
    calendario.ts      dias da semana
    inventario.ts      slots, empilhamento, catalogo de itens
    mapas.ts           registro dos mapas (keys do Phaser + spawn)
    npcs.ts            catalogo, moradias, sprites, dialogos e rotinas dos NPCs
    rotinasNpc.ts      motor generico de agenda e movimento dos NPCs
    save.ts            localStorage
    tipos.ts           tipos compartilhados
  scenes/
    BootScene.ts       preload, animacoes, carga do save
    FarmScene.ts       cena de mundo: tilemap, player, colisao, camera, interacao
    UIScene.ts         HUD, prompt, dialogo, confirmacao, inventario
tools/
  png.mjs              encoder PNG minimo + hash deterministico
  imagem.mjs           decoder PNG, deteccao de grade e reducao de tile
  gerar-assets.mjs     monta tileset + atlas de flora + os dois tilemaps
public/assets/
  tilemaps/            farm.json (externo) + um por interior (casa_1..casa_6,
                       mercado, academia) — todos gerados
  tilesets/terrain.png tileset 32x32 montado pelo script (nao edite a mao)
  sprites/             folhas de runtime + spritesheets do player + atlas gerados
arte/                  arte-fonte consumida so em build (fora de public/)
```

### De onde vem cada asset

`npm run gerar-assets` **reescreve** `tilesets/terrain.png`, `construcoes.png`,
todos os tilemaps e os `*.atlas.json`. A arte de origem nunca e sobrescrita.

**Onde a arte mora importa.** Folha que o jogo carrega em runtime fica em
`public/assets/sprites/`; folha consumida so em build (entra assada no
`terrain.png` ou no `construcoes.png`) fica em `meu-jogo/arte/`, fora de
`public/`, pra nao ir pro `dist/`. Quem decide e o campo `runtime` de cada
entrada em `FOLHAS` — nao mova arquivo sem mexer nele.

| origem | pasta | usada como | quando |
| --- | --- | --- | --- |
| `Grama.png` (3 variantes) | `arte/` | tiles de grama | build |
| `estrada_de_terra.png` (3x3) | `arte/` | autotile de estrada + terra batida | build |
| `lago_v1.png` (3x3) | `arte/` | 9-slice de agua | build |
| `Paredes_casa_v1.png` (6x3) | `arte/` | parede das fachadas de casa | build |
| `Telhados_v1.png` (6x3, coluna 0) | `arte/` | laje de telhado | build |
| `Portas_v1.png` (4x5, coluna 0) | `arte/` | porta das fachadas | build |
| `Janelas_v1.png` (7x4) | `arte/` | janela das fachadas | build |
| `Mecado_academia.png` | `arte/` | fachadas prontas de mercado e academia | build |
| `Arvores.png` (3 especies x 6 estagios) | `public/` | atlas `arvores` | runtime |
| `Flores_v1.png` e `Flores_v2.png` (4 especies x 6 cada) | `public/` | atlas `flores_v1` / `flores_v2` | runtime |
| `pedras.png` | `public/` | calcamento (build) + atlas `pedras` (runtime) | ambos |
| `Utensilios_mercado.png` | `public/` | atlas `moveis_mercado` | runtime |
| `Utensilios_academia.png` | `public/` | atlas `moveis_academia` | runtime |
| `player_sprites.png`, `Player_andando.png`, `Player_correndo.png` | `public/` | poses do player | runtime |

`pedras.png` e o unico caso de folha usada nas duas pontas — por isso continua
em `public/` mesmo tendo parte consumida em build.

O script descobre a grade de cada folha **projetando o alfa** nos eixos, em vez
de guardar coordenadas fixas: reexportar a arte com outra margem continua
funcionando. Se a grade detectada nao bater com a esperada (ex: 3x3 na
estrada), a geracao falha com erro em vez de produzir mapa torto.

`pedras.png` e a excecao: nao tem grade. A metade esquerda traz tiles de piso e
um autotile de caminho de pedra (**ainda nao usados**), e a direita traz pedras
soltas em posicoes livres. Ela sai por **componente conexo** (`blobs()`), com a
fronteira entre as duas metades em `PEDRAS.xDecoracao` — a unica coordenada a
mao do pipeline, porque nada na imagem separa as metades. Tufos de capim da
mesma metade sao descartados pela cor. As pedras usam uma **escala unica**
ancorada na maior, entao mantem o tamanho relativo entre si (de pedrisco de
0,18 tile a matacao de 1,6).

O player parado usa `player_sprites.png`, a caminhada usa `Player_andando.png` e
a corrida usa `Player_correndo.png`, sempre com quatro poses por direcao.

## Como as pecas conversam

**Uma cena de mundo so.** `FarmScene` desenha qualquer mapa: quem manda e
`estado.mapa`, resolvido em `game/mapas.ts`. Trocar de mapa e um
`scene.restart({ mapa, x, y })` — por isso `init()` zera todo o estado mutavel
da cena (campos de classe com inicializador **nao** rodam de novo no restart).

**A UI e uma cena separada** (`UIScene`), rodando em paralelo na resolucao base,
sem o zoom da camera — por isso o texto fica nitido. Ela concentra *todo* o
input de "acionar" (E e clique) e decide quem trata, nessa ordem:
inventario > confirmacao > dialogo > cena de mundo. Isso e o que evita o mesmo
aperto de E abrir e fechar algo no mesmo frame.

`ui.bloqueado` e a fonte unica de "o jogo esta pausado": trava o movimento do
player e congela o relogio.

**Ordem de subida importa:** o `BootScene` da `launch('UIScene')` antes de
`start('FarmScene')`, porque a cena de mundo ja fala com a UI dentro do
`create()`.

## Fluxo do Tiled

1. Abra o projeto `Jogo.tiled-project` (na pasta acima desta).
2. Edite os JSONs em `meu-jogo/public/assets/tilemaps/`.
3. Salve/exporte como **JSON**, na mesma pasta. O Vite recarrega sozinho.

Se voce rodar `npm run gerar-assets` depois de editar a mao, **os mapas sao
sobrescritos**. A partir do momento em que voce comecar a editar no Tiled de
verdade, pare de rodar esse script (ou tire a geracao dos mapas dele).

Regras que quebram o jogo se forem violadas:

- O nome do tileset **dentro do JSON** e `terrain`, e e isso que esta em
  `tilesetNoJson` no `game/mapas.ts`. A key do PNG (`tiles-terrain`) e o
  `tilesetKey`. Sao coisas diferentes — nao confunda.
- As camadas de tiles se chamam `chao` e `objetos` em todos os mapas.
  `caminhos` (entre as duas) e opcional — so os mapas externos tem.
- Colisao vem da propriedade booleana `collides` marcada **nos tiles** do
  tileset (nao na camada). Hoje colidem: os tiles de agua (9-slice + rotacoes
  do miolo), o mato da borda, parede e os dois tiles de cama.
- As camadas de objetos `zonas` e `flora` tambem sao opcionais.

### Camada `interativos`

Camada de **objetos** chamada `interativos`. A *class* do objeto define o tipo:

| class | o que faz | propriedades |
| --- | --- | --- |
| `placa` | dialogo fixo de teste | — |
| `npc` | conversa (legado; NPCs novos nascem de `game/npcs.ts`) | `npcId` |
| `porta` | troca de mapa com fade | `destino` (chave em `game/mapas.ts`), `destinoTx`, `destinoTy` (em **tiles** do mapa de destino) |
| `cama` | pergunta e dorme | — |

Qualquer objeto aceita `rotulo` pra trocar o verbo do prompt (a porta de saida
da casa usa isso pra dizer "Sair" em vez de "Entrar").

O alvo da interacao e o mais proximo dentro do raio **e** dentro do cone da
direcao pra onde o player olha (`CONFIG.interacao`, em `game/config.ts`).

### Camada `caminhos` e o autotile de estrada

A malha viaria esta em `VIAS`, no `gerar-assets.mjs`: cada via e um segmento
reto declarado pelo **eixo** (`w` ou `h` = 1), com `LARGURA_VIA` de faixa. O
desenho sai em duas passadas — a faixa inteira de terra batida, e depois a
trilha clara so no eixo. Da uma estrada larga com a trilha gasta no meio; a
arte traz o caminho centralizado no tile, entao duas linhas coladas virariam
dois caminhos paralelos em vez de uma via larga.

O tile da trilha vem da conectividade com as vizinhas (N=1, E=2, S=4, W=8). A
folha traz 9 pecas; as mascaras que faltam (Ts girados) saem de rotacao e
espelho, e as 16 vao assadas no tileset.

### Camada `zonas`

Camada de **objetos** chamada `zonas`, sem tile e sem colisao: e a demarcacao
dos lotes. A *class* diz o tipo (`casa`, `mercado`, `academia`, `parque`) e o
*name* e o id (`casa_1`..`casa_6`, `mercado`, `academia`, `parque`).

| propriedade | o que diz |
| --- | --- |
| `tipo` | mesmo valor da *class* |
| `construida` | `true` = ja tem predio de pe; `false` = lote reservado |
| `mapaInterior` | chave em `game/mapas.ts` do interior, quando existe |

**Os 9 lotes estao construidos.** 8 tem predio e interior (6 casas, mercado,
academia) e vem de `CONSTRUCOES`; o parque e area externa e vem de `PRACAS`.
A posicao de cada construcao e **derivada do lote** (`construcaoDe()` centra a
pegada e encosta no topo), entao mover o lote leva o predio junto — nao ha duas
coordenadas pra sincronizar.

A porta fica sempre no meio da parede de BAIXO, porque a arte e elevacao
frontal: a fachada olha pro sul e a porta acompanha. Em `casa_5`/`casa_6`, que
ficam ao sul do anel, isso deixa a porta virada pro lado oposto da via — o
jogador entra pelas laterais do lote. O flood-fill confere que da.

No jogo, na `FarmScene`:

- `zonasReservadas` — todos os lotes
- `zonasLivres` — so os que ainda nao tem construcao (hoje vazio)
- `zonaPorId('mercado')` — o lote, com `construida: true` e `mapaInterior: 'mercado'`
- `portaDaZona('mercado')` — o objeto `porta` que entra nessa construcao
- **F6** desenha os retangulos; lote construido vem com borda grossa e o nome
  do interior no rotulo

### Camada `construcoes`

Camada de **objetos** com um ponto por lote construido e a propriedade `frame`
apontando pro atlas `construcoes`. O ponto e o RODAPE da pegada; a arte pode ser
mais alta que ela, entao o telhado sobe alem do que barra o player.

**A colisao nao vem daqui.** A pegada de cada construcao ja esta pintada com
`PAREDE` (e um `PORTA`, que nao colide) na camada `objetos`, e a fachada so cobre
isso por cima — o mesmo caminho que a casa inicial sempre usou, sem maquina de
colisao nova.

As 6 fachadas de casa sao **compostas no gerador** (`comporCasa`): laje de
telhado repetida no alto com beiral e sombra, parede repetida embaixo, duas
janelas e a porta centrada no rodape. Cada casa usa uma combinacao diferente de
`ESTILOS_CASA`. Mercado e academia nao sao compostos: as fachadas ja vem
montadas em `Mecado_academia.png`, so escaladas pra largura da pegada.

Do kit de telhado so a **coluna 0** (a laje) e usada. Cumeeira, chamine, lucarna
e rufo ficaram de fora: o encaixe delas nao da pra inferir com seguranca a
partir da folha, e chutar produziria telhado torto.

### Camada `moveis`

Camada de **objetos** dos interiores de comercio. Diferente da flora, aqui o
gerador ja resolve tudo — `atlas`, `frame`, `alturaTiles` e `colide` — e o jogo so
posiciona e ordena por y. Mexer no layout de uma loja e mexer so em
`MERCADO_PECAS` / `ACADEMIA_PECAS`, onde cada item e
`{ peca: [linha, indice], tx, ty }` com `tx`/`ty` no rodape do movel.

A peca e identificada por **[linha, indice na linha]**, nao por indice global: as
folhas de utensilio nao tem grade, saem por componente conexo agrupado em
linhas, e assim a arte ganhar ou perder um item no meio de uma linha nao
embaralha o resto.

A colisao fica na base (`MOVEL_CORPO`), mais funda que a da pedra — gondola e
balcao sao moveis de encostar, nao de passar atras.

### Camada `flora`

Camada de **objetos** com pontos, gerada deterministicamente pelo script.
Arvore, pedra e flor sao *sprites*, nao tiles, por dois motivos: passam de um
tile, e a profundidade precisa ser ordenada com o player (`depth = y`, entao da
pra andar atras delas). A colisao fica **so na base** (tronco da arvore, pe da
pedra); a copa e o topo da pedra ficam livres. Um tile recebe no maximo um dos
tres.

| class | propriedades | colide |
| --- | --- | --- |
| `arvore` | `especie` (linha da folha), `estagio` (coluna) | do estagio 2 pra cima |
| `pedra` | `indice` (frame no atlas), `alturaTiles` | acima de 0,45 tile de altura |
| `flor` | `folha` (`v1`/`v2`), `especie`, `estagio` | nunca |

Arvore e flor tem estagios discretos, e a altura de cada um mora no jogo
(`ALTURA_ARVORE` / `ALTURA_FLOR` na `FarmScene`, em **tiles**). Pedra e tamanho
continuo, entao o gerador grava `alturaTiles` no proprio objeto. Nos dois casos
a escala do sprite sai da altura-alvo dividida pela altura real do frame, entao
trocar a resolucao da arte nao exige reajuste.

A caixa de colisao da arvore e fixa em tiles (`TRONCO_TILES`); a da pedra e
fracao do **tamanho do sprite** (`PEDRA_CORPO`), porque as pedras variam de
pedrisco a matacao.

## Determinismo

Nada no mapa usa `Math.random()`. A variacao de terreno e a distribuicao da
flora saem de `hash01(x, y, semente)` (`tools/png.mjs`) com `SEMENTE` fixa no
`gerar-assets.mjs`: a mesma seed gera sempre o mesmo mapa, entao recarregar a
pagina (ou rodar o script de novo) nao mexe em nada. Trocar `SEMENTE` sorteia um
mundo novo inteiro.

Cada terreno que repete muito (grama, terra batida, miolo do lago) entra no
tileset nas **4 rotacoes**, e o sorteio escolhe entre elas. Sem isso o mesmo
tile lado a lado vira uma grade visivel.

## Tempo, dias e save

- `CONFIG_TEMPO` em `game/relogio.ts`: hoje **10 minutos de jogo a cada 10
  segundos reais**, dia comeca 06:00 ao acordar, jogo novo comeca 07:20.
- Passar da meia-noite acordado tambem vira o dia.
- Dia 0 e uma segunda-feira (`game/calendario.ts`).
- Dormir salva, avanca um dia e reseta a hora. O save v4 (`localStorage`,
  chave `meu-jogo:save`) guarda dia, hora, mapa, posicao, inventario e pickups coletados, e e
  carregado no boot. Save de versao diferente ou corrompido e ignorado com
  aviso no console, e o jogo comeca do zero.

## Rotinas de NPC

Cada entrada de `NPCS`, em `game/npcs.ts`, concentra nome, casa, posicao
inicial, spritesheet, dialogo e a lista ordenada de acoes. O motor aceita
`vagar`, `vagar_rota`, `andar_rota`, `entrar_construcao`, `sair_construcao` e
`voltar_para_casa`. NPC sem acao configurada depois das 18:00 recebe
automaticamente o retorno para sua casa. `vagar_rota` permite pausas entre
waypoints; saidas de interiores caminham ate a porta antes de trocar de mapa.

As rotas usam coordenadas de tile e nao fazem pathfinding. Rode
`npm run verificar-rotinas` para simular o dia, conferir os tiles percorridos e
validar entrada/saida das construcoes. `npm run processar-sprites-npc` regenera
as folhas transparentes e uniformes de caminhada/corrida de Edu e Mari.

## Notas

- `pixelArt: true` + `roundPixels: true` no `main.ts`: sem isso a arte borra ao
  escalar. `image-rendering: pixelated` no CSS faz o mesmo do lado do canvas.
- Resolucao base 480x270 com `Scale.FIT`. O zoom da camera **nao e fixo**: sai
  de `TILES_VISIVEIS_X` (15) dividido pelo tamanho do tile, entao o campo de
  visao fica travado em 15 tiles de largura. Com tile 16 dava zoom 2; com 32 da
  zoom 1 — a tela mostra a mesma coisa, com o dobro de pixel por tile.
- Em dev, `window.game` e `window.estado` estao expostos pro console.

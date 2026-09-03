# Meu Jogo

Phaser 3 + TypeScript + Vite. Top-down, pixel art, tilemaps feitos no Tiled.

## Rodar

```bash
npm run dev
```

Abre em http://localhost:5173. `npm run build` gera o `dist/`.
`npm run gerar-assets` remonta o tileset, os atlas de flora e os tilemaps a
partir da arte em `public/assets/sprites/`. `npm run gerar-itens` monta o atlas
de icone de item e `npm run gerar-aparelhos` o dos aparelhos do minigame de
conserto.

## Controles

| Tecla | Acao |
| --- | --- |
| Setas / WASD | mover |
| Shift + movimento | correr |
| E ou clique | interagir, avancar dialogo, confirmar |
| Setas ou A/D | escolher Sim/Nao na confirmacao |
| Esc | cancelar confirmacao |
| Tab | abrir/fechar inventario (e trocar de secao na DevStore) |
| U | usar o item selecionado no inventario |
| F | equipar/guardar o item selecionado |
| X | descartar a pilha selecionada |
| O | organizar o inventario |
| C | abrir/fechar o calendario (com a loja aberta, ele troca o filtro dela) |
| J | abrir os Arquivos — as fichas medicas ja recolhidas na represa |
| M | abrir/fechar o mapa do lugar onde voce esta |
| E no computador da oficina | ligar o PC (desktop com 7 apps); Esc desliga |
| E na bancada da oficina | abrir o catalogo de mobilia |
| Ponteiro + clique | posicionar a peca de mobilia escolhida; Esc desiste |
| F1 | debug das colisoes |
| F6 | mostrar/esconder as zonas reservadas (debug) |
| F7 | avancar uma hora para testar rotinas (debug) |
| F2 | adicionar Cabo USB no inventario (debug) |
| F3 | kit de exploracao: chave, lanterna, pistola, municao e kits (debug) |
| F4 | apagar o save (debug) |
| Espaco | golpear (so faz algo dentro da represa) |
| Botao esquerdo | atirar, com arma de fogo na mao |
| R | recarregar a arma |
| F9 | salvar na hora (debug) |

Com arma de fogo na mao aparece uma **mira** que segue o cursor, e a pose do
personagem passa a sair da direcao dela — da pra recuar atirando. A arma so
equipa **dentro da usina**; sair de la guarda ela na mochila, com a municao do
carregador junto.

## Estrutura

```
src/
  main.ts              config do Phaser (resolucao, pixelArt, fisica, cenas)
  game/                regras e estado, sem Phaser (quase)
    config.ts          numeros de balanceamento + paleta da UI
    estado.ts          estado global: dia, relogio, inventario, mapa atual
    relogio.ts         tempo de jogo e formatacao da hora
    calendario.ts      dias da semana, data completa e ano bissexto
    clima.ts           o tempo do dia, derivado da data
    inventario.ts      slots, empilhamento, catalogo de itens
    mapas.ts           registro dos mapas (keys do Phaser + spawn + mapa externo)
    casa.ts            casa do protagonista: comodos compraveis e catalogo de mobilia
    npcs.ts            catalogo, moradias, sprites, dialogos e rotinas dos 33 NPCs
    moradores.ts       ficha e agenda dos 24 moradores dos Mapas 2 e 3
    trabalhos.ts       quadro de vagas por dia, perguntas e regras de pagamento
    aparelhos.ts       catalogo dos aparelhos do minigame de conserto
    lixeira.ts         historico de descarte (o app Lixeira so le daqui)
    rotinasNpc.ts      motor generico de agenda e movimento dos NPCs
    vida.ts            HP do jogador (30/30) e a janela de invulnerabilidade
    inimigos.ts        catalogo dos 7 monstros e a IA — sem uma linha de Phaser
    sucata.ts          salvado da represa: itens, tabelas de sorteio e revenda
    represa.ts         setores autorais, tensao, os 7 enigmas e a derrota
    andares.ts         REGISTRO CENTRAL dos 50 andares: capitulo, fauna, planta, modulo
    enigmas.ts         as 10 familias de enigma gerado — painel e pista na mesma funcao
    fichas.ts          o prontuario de 200 dias e o arquivo do jogador
    equipar.ts         o que cada item faz, os slots e a mao do jogador
    armas.ts           catalogo de arma de fogo, carregador e o projetil
    luzes.ts           mapa de luz por tile, luminarias e oclusao
    pets.ts            os 6 bichos, seus donos e a agenda deles
    tema.ts            paleta, fonte, espacamento e camadas da interface
    avisos.ts          textos de exame; e aqui que as RESPOSTAS dos enigmas moram
    save.ts            localStorage
    tipos.ts           tipos compartilhados
  scenes/
    BootScene.ts       preload, animacoes, carga do save
    FarmScene.ts       cena de mundo: tilemap, player, colisao, camera, interacao
    CamadaRepresa.ts   componente da FarmScene: inimigos, combate e salvado
    CamadaLuz.ts       o mapa de luz virando textura de um texel por tile
    CamadaChuva.ts     particula de chuva, so em mapa externo
    CamadaPets.ts      os bichos andando
    ui.ts              pecas de desenho: painel, campo, slot, barra, aba, cartao
    UIScene.ts         HUD, prompt, dialogo, confirmacao, inventario, loja fisica
    ComputadorScene.ts o PC do protagonista: desktop de tela cheia e os apps
  pc/                  o "sistema operacional" do computador de casa
    JanelaApp.ts       moldura unica em que os 7 apps abrem
    widgets.ts         caixa/botao/texto/icone compartilhados pelos apps
    tipos.ts           contrato AppDoPc + ContextoApp
    vista.ts           contrato das sub-telas (minigames dentro de um app)
    apps/
      devstore.ts      loja online — compra por game/loja.ts
      trabalho/        quadro de vagas + quiz de codigo + sequencia de conserto
      jogos/           biblioteca + jogo da memoria + snake
      calculadora.ts   quatro operacoes, sem dependencia do jogo
      lixeira.ts       historico de descarte
      navegador.ts     FACHADA — o cabecalho diz onde a logica entra
      conquistas.ts    FACHADA — idem
tools/
  png.mjs              encoder PNG minimo + hash deterministico
  imagem.mjs           decoder PNG, deteccao de grade/blob e reducao de tile
  folha-personagem.mjs recortador de folha 4x4, compartilhado por NPC e monstro
  gerar-assets.mjs     monta tileset + folhas/atlas de sprite + todos os tilemaps
  processar-sprites-npc.mjs      as folhas dos 33 NPCs
  processar-sprites-monstro.mjs  as folhas dos 7 monstros da represa
  processar-sprites-jogador.mjs  a folha de segurar item + o ponto do punho
  processar-sprites-pet.mjs      as folhas dos cachorros e gatos
  gerar-equipamento.mjs          icone de item na mao + o ponto de presa
  andares-represa.mjs            templates, labirintos e modulos dos 45 andares novos
public/assets/
  tilemaps/            4 externos (farm, bairro, rural, represa) + um por
                       interior (casa_2..casa_6, casa_b1..b7, casa_c1/c2,
                       casa_rural_1/2, mercado, academia, bar, farmacia,
                       oficina, escola, biblioteca, hospital) + os 50 andares
                       da represa (represa_0..represa_4 autorais e
                       represa_f06..represa_f50 compostos, sob demanda)
  tilesets/terrain.png tileset 32x32 montado pelo script (nao edite a mao)
  sprites/             folhas de runtime, folhas de movel geradas, spritesheets
                       do player e os atlas
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
| `Grama.png` (3 variantes) | `arte/` | tiles de grama do Mapa 1 | build |
| `Grama_mapa_2.png` (3x2) | `arte/` | grama do Mapa 2 — so as 2 celulas lisas da linha 0 | build |
| `Grama_mapa_3.png` (3x2) | `arte/` | grama do Mapa 3 — so a celula lisa da linha 0 | build |
| `Grama_mapa_4.png` (3x2) | `arte/` | **so a celula do vertedouro**, como sprite de marco. As seis celulas sao cenas compostas e nao ladrilham | build |
| `Represa.png` (5 linhas) | `arte/` | fachada da casa de forca, portaria e galpao do Mapa 4 | build |
| `PAredes_internas_represa.png` (7 linhas) | `arte/` | 6 estilos de parede dos setores da represa | build |
| `Monstros/*.png` (9 folhas) | `public/assets/Monstros/` | 7 viram folha 4x4 de runtime; `Boss_v1` e `Micro-ondas` ficaram de fora | processar-sprites-monstro |
| `Arvores_mapa_4.png` | `arte/` | **SEM USO** — veio sobre gradiente verde opaco, que o removedor de fundo nao trata | — |
| `Rios_v1.png` / `RIos_v2.png` | `arte/` | **SEM USO** — sao pecas de composicao de rio, nao grade de tile; a agua sai do 9-slice de `lago_v1` | — |
| `PAredes_internas_represa_andar_50_100.png` (5 linhas uteis) | `arte/` | 5 estilos de parede do capitulo 5 (andares 41-50). As pecas com numero de andar pintado ficaram de fora | build |
| `Paredes_internas_represa_andar_101_150.png` | `arte/` | **SEM USO** — reservada pros andares 101+, fora do escopo desta fase | — |
| `Lampadas_v2.png` (4 luminarias) | `arte/` | atlas `lampadas`: so o frame ACESO entra; o apagado sai tingindo o mesmo frame | gerar-equipamento |
| `Lampadas_v1.png` | `arte/` | **SEM USO** — substituida pela v2, que tem as quatro luminarias na mesma grade | — |
| `itens_represa_v2.png` (18 icones) | `public/assets/sprites/` | atlas `itens_represa` (icone de inventario) e as pecas de mao | gerar-itens + gerar-equipamento |
| `Itens_represa.png` | `public/assets/sprites/` | **SEM USO** — fundo totalmente opaco; substituida pela v2 | — |
| `Pistola.png` | `public/assets/Armas/` | atlas `equipamento`: a arma na mao, o fogo do cano e o projetil | gerar-equipamento |
| `Shotgun.png` / `M4A1.png` | `public/assets/Armas/` | **SEM USO** — so a pistola entrou nesta fase | — |
| `Player_segurando.png` (4x4) | `public/assets/sprites/` | a folha GENERICA de segurar item; o punho de cada pose e MEDIDO, nao escrito | processar-sprites-jogador |
| `Cachorros.png` / `Gatos_v1.png` | `public/assets/sprites/` | folhas dos 3 cachorros e dos 3 gatos | processar-sprites-pet |
| `Gatos_v1_andando.png` | `public/assets/sprites/` | **SEM USO** — a folha parada ja cobre as quatro direcoes dos bichos | — |
| `Moveis_hospital.png` (7 linhas) | `arte/` | folha+atlas `moveis_hospital`: mobilia do hospital municipal | build |
| `Paredes_hospital.png` | `arte/` | fachada do hospital. Veio sobre fundo opaco e nao se segmenta por blob: parede, letreiro e porta sao retangulos enderecados a dedo em `ARTE_PROJETOS` | build |
| `estrada_de_terra.png` (3x3) | `arte/` | autotile de estrada + terra batida | build |
| `lago_v1.png` (3x3) | `arte/` | 9-slice de agua | build |
| `Paredes_casa_v1.png` (6x3) | `arte/` | parede das fachadas de casa | build |
| `Telhados_v1.png` (6x3, coluna 0) | `arte/` | laje de telhado | build |
| `Portas_v1.png` (4x5, coluna 0) | `arte/` | porta das fachadas | build |
| `Janelas_v1.png` (7x4) | `arte/` | janela das fachadas | build |
| `Mecado_academia.png`, `farmacia_bar.png` | `arte/` | fachadas PRONTAS — nao sao mais lidas; ficam como referencia de leitura de cada predio | — |
| `Arvores.png` (3 especies x 6 estagios) | `public/` | atlas `arvores` | runtime |
| `Flores_v1.png` e `Flores_v2.png` (4 especies x 6 cada) | `public/` | atlas `flores_v1` / `flores_v2` | runtime |
| `pedras.png` | `public/` | calcamento (build) + atlas `pedras` (runtime) | ambos |
| `Utensilios_mercado.png` | `arte/` | folha+atlas `moveis_mercado` | build |
| `Utensilios_academia.png` | `arte/` | folha+atlas `moveis_academia` | build |
| `Mobilhas_v1.png` e `Mobilia_v2.png` | `arte/` | folha+atlas `moveis_mobilia_v1` / `_v2` | build |
| `Moveis_farmacia_bar.png` | `arte/` | folha+atlas `moveis_farmacia_bar` (movel dos dois mistos) | build |
| `Moveis_quarto.png`, `Moveis_cozinha.png`, `Moveis_banheiro.png` | `arte/` | folha+atlas `moveis_quarto` / `_cozinha` / `_banheiro` (mobilia DEDICADA por comodo) | build |
| `Moveis_Eletronicos_v1.png` | `arte/` | folha+atlas `moveis_eletronicos` (TV, rack, setup de PC) | build |
| `paredes_casa_Internas_v1.png` (7x4 paineis) | `arte/` | parede INTERNA de casa: campo + rodape, 4 variantes de relevo cada | build |
| `paredes_academia.png`, `Paredes_mercado.png`, `Paredes_farmacia.png`, `Paredes_bar.png` | `arte/` | parede interna de cada ramo de comercio | build |
| `Portas_v2.png` (faixa de casa) | `arte/` | tiles de porta nos vaos entre comodos | build |
| `Paredes_escola.png` (5x3) | `arte/` | fachada e parede interna da escola | build |
| `Paredes_biblioteca.png` (6x3) | `arte/` | fachada e parede interna da biblioteca | build |
| `PAredes_predio.png` (6x3) | `arte/` | alvenaria neutra: oficina, madeireira e Central Telefonica | build |
| `Portas_predio.png` (4 linhas) | `arte/` | portas dos predios publicos e da oficina | build |
| `Pisos_banheiro.png` e `Pisos_cozinha.png` | `arte/` | tiles de piso de interior (madeira, azulejo, mosaico...) | build |
| `Nootbook_desmontado.png`, `Celular_desmontado.png`, `Consoles_e_controles_desmontados.png` | `public/` | atlas `aparelhos` do minigame de conserto | build |
| `player_sprites.png`, `Player_andando.png`, `Player_correndo.png` | `public/` | poses do player | runtime |
| `<Npc>_andando.png` e `<Npc>_parada.png` | `public/` | folhas `_runtime` de caminhada e de pose parada | build |

`pedras.png` e o unico caso de folha usada nas duas pontas — por isso continua
em `public/` mesmo tendo parte consumida em build.

**Arte encontrada e NAO usada nesta leva:**

- `Rios_v1.png` — folha de rio. Nao foi processada: o layout dela e irregular
  (a projecao de alfa nao acha grade, e os blobs saem em linhas de tamanhos
  diferentes), entao o rio do Mapa 2 usa o 9-slice de agua de `lago_v1.png`,
  que ja estava validado. Trocar depois e mexer so em `pintarLago`/`gerarBairro`.
- `Grama_mapa_4.png` — grama do **Mapa 4 (represa)**, que esta fora do escopo
  desta leva. A folha fica no repositorio, sem entrada em `FOLHAS`.
- A **linha 1** de `Grama_mapa_2.png` e `Grama_mapa_3.png` e a versao NOTURNA da
  linha 0 (mesmo pareamento de `Grama.png` com `Grama_noite.png`). O jogo nao
  troca tile por horario, entao ela ficou de fora — anotada aqui pra quem for
  implementar noite saber que a arte ja existe.
- As celulas com CENARIO desenhado dentro (caminho de pedra na grama do Mapa 2;
  fardo de feno, cerca e girassol na do Mapa 3) tambem ficaram de fora:
  ladrilhadas viram carimbo repetido.

**Superficies sem arte dedicada, pintadas proceduralmente** (como o `MATO` e o
`PISO` ja eram): ponte, muro/cerca, portao, plantacao, cascalho de pedreira e
piso de quadra. Cada uma tem um pintor curto e comentado em `TILES`; trocar por
arte dedicada e mexer so ali.

**Folha de movel e reempacotada, nao apontada.** As folhas de movel
(utensilio de mercado/academia, mobilia v1/v2 e as dedicadas de quarto,
cozinha, banheiro e eletronicos) nao tem grade: saem por
componente conexo agrupado em linhas, e uma peca e endereçada por
`[linha, indice na linha]` — sobrevive melhor a arte ganhar um item no meio de
uma linha do que um indice global. O atlas **nao** aponta pro PNG original: o
gerador escreve `moveis_<folha>.png` com cada peca numa celula propria, levando
so os proprios pixels. Sem isso o frame de uma peca diagonal (tapete) leva
lasca da vizinha — a caixa do atlas e retangular e a arte nao, e as caixas de
duas pecas vizinhas se sobrepoem de verdade na folha crua.

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

**Uma cena de mundo so.** `FarmScene` desenha qualquer mapa — os tres externos
e todos os interiores: quem manda e `estado.mapa`, resolvido em `game/mapas.ts`.
Trocar de mapa e um `scene.restart({ mapa, x, y })` — por isso `init()` zera todo
o estado mutavel da cena (campos de classe com inicializador **nao** rodam de
novo no restart). Nao ha cena por mapa, e nao deve haver: cada mapa novo e uma
entrada em `MAPAS` mais um tilemap.

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

## Os quatro mapas do mundo

O jogo tem **quatro mapas externos**, e o **Mapa 1 e o centro**: cada ponta de
avenida dele e uma saida.

```
                          Mapa 4
                    Estrada da Represa
                         (80x140)
                            |
                          norte
                            |
     Mapa 2                                        Mapa 3
Bairro da Estacao --oeste-- Mapa 1 --leste-- Zona Rural
   (140x110)                Cidade            (150x120)
                            (120x90)
                            |
                           sul
                            |
                   RESERVADO pro mapa futuro
              (estrada interditada por obra, com placa)
```

| mapa | chave | o que tem |
| --- | --- | --- |
| Mapa 1 | `farm` | a cidade original: 11 lotes, 9 NPCs, mercado, academia, bar, farmacia, parque, lago |
| Mapa 2 | `bairro` | casa+oficina do protagonista, escola, biblioteca, quadra, terreno abandonado, Central Telefonica, 9 casas ocupadas (2 num condominio fechado) e 3 lotes reservados, rio e ponte |
| Mapa 3 | `rural` | madeireira (loja de expansao), pedreira, duas fazendas, duas casas ocupadas |
| Mapa 4 | `represa` | a estrada da usina: mirante, canal com ponte, galpao, subestacao murada, cerca de area restrita, casa de forca, barragem e reservatorio. Nenhum morador. Ver **A represa** |

**A ligacao Mapa 2 <-> Mapa 3 nao existe mais.** Ela passava pela ponte da rua
da estacao e fazia o mundo ler como uma corrente de tres elos em vez de um centro
com radiais. A ponte e a rua continuam desenhadas e viraram **estrada local**,
que morre na mata da borda — e por isso nenhum lote, rota de NPC ou coordenada de
save precisou mudar de lugar.

**A ponta SUL do Mapa 1 e reserva** pro mapa futuro. A avenida vertical chega na
beira, mas ha uma **barreira de obra** atravessando a pista e uma placa de exame
que diz o motivo. Nao ha zona de transicao ali, e `npm run verificar-represa`
reprova se alguem puser uma.

**Cada NPC declara em que mapa vive** (`DefinicaoNpc.mapa`): 9 no Mapa 1, 20 no
Mapa 2 e 4 no Mapa 3 — 33 no total, todos no mesmo motor de rotinas. **Nenhum
mora no Mapa 4.** Ao ar livre o NPC aparece so no proprio mapa; dentro de
construcao ele aparece pra quem esta naquele interior, venha de onde vier. Ver
**Rotinas de NPC**.

**Jogo novo comeca no Mapa 2**, na porta da casa+oficina — que e onde o
protagonista mora desde que a `casa_1` do Mapa 1 foi desativada.

**A `casa_1` continua de pe no Mapa 1, mas fechada.** O lote virou `uso: 'vago'`:
o predio aparece, a porta nao abre e no lugar dela ha um objeto de exame
("Local desativado"). Nao ha interior gerado pra ela, e nenhum NPC mora la. E
espaco reservado pra uso narrativo futuro.

### Camada `bordas`

Camada de **objetos** dos mapas externos. Cada objeto e um retangulo de alguns
tiles na beira do mapa; encostar nele troca o mapa carregado, com o mesmo fade
da porta.

| propriedade | o que diz |
| --- | --- |
| `destino` | chave do mapa vizinho em `game/mapas.ts` |
| `destinoTx` / `destinoTy` | onde o jogador cai la, em **tiles** |

As bordas andam **aos pares** e `npm run verificar-mapas` cobra isso: se do
Mapa 1 sai uma pro Mapa 2, do Mapa 2 tem de sair uma de volta, o ponto de
chegada tem de ser alcancavel e **nao pode cair dentro da borda de volta** —
senao o jogador quicaria entre os dois mapas sem conseguir sair.

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
  do miolo), o mato da borda, toda parede (a pintada e as quatro variantes de
  relevo de cada estilo de parede interna) e os tiles de cama. A porta de vao
  **nao** colide: ela e so a arte da passagem.
- As camadas de objetos `zonas` e `flora` tambem sao opcionais.

### Camada `interativos`

Camada de **objetos** chamada `interativos`. A *class* do objeto define o tipo:

| class | o que faz | propriedades |
| --- | --- | --- |
| `placa` | dialogo fixo de teste | — |
| `npc` | conversa (legado; NPCs novos nascem de `game/npcs.ts`) | `npcId` |
| `porta` | troca de mapa com fade | `destino` (chave em `game/mapas.ts`), `destinoTx`, `destinoTy` (em **tiles** do mapa de destino) |
| `cama` | pergunta e dorme (salva) | — |
| `computador` | liga o PC dos 7 apps | — |
| `expansao` | balcao da madeireira: compra de comodo | — |
| `mobilia` | bancada da oficina: catalogo de mobilia | — |

Um `placa` com a propriedade `aviso` mostra o texto do predio FECHADO daquele
lote em vez do texto generico (`AVISOS_DE_PREDIO`, na `FarmScene`) — e o que a
`casa_1` desativada e a Central Telefonica usam.

Qualquer objeto aceita `rotulo` pra trocar o verbo do prompt (a porta de saida
da casa usa isso pra dizer "Sair" em vez de "Entrar").

O alvo da interacao e o mais proximo dentro do raio **e** dentro do cone da
direcao pra onde o player olha (`CONFIG.interacao`, em `game/config.ts`).

### Camada `caminhos` e o autotile de estrada

Ha dois jeitos de declarar via, e os dois caem no mesmo autotile:

- **Mapa 1 (`VIAS`)** — segmentos RETOS, declarados pelo eixo (`w` ou `h` = 1) e
  alargados perpendicularmente por `LARGURA_VIA`. E o que da o traçado
  quadriculado da cidade original.
- **Mapas 2 e 3 (`VIAS_BAIRRO`, `VIAS_RURAL`)** — POLILINHAS: uma lista de
  pontos ligada por Bresenham, entao o eixo desce em degraus e a rua sai torta
  de proposito. A faixa sai por **dilatacao quadrada** do eixo (raio 1 = 3
  tiles); num trecho diagonal nao existe "perpendicular" unica, e a dilatacao
  fecha o degrau sem deixar buraco.

Nos dois casos o autotile e o mesmo, porque ele so olha a vizinhanca de 4 do
eixo. O
desenho sai em duas passadas — a faixa inteira de terra batida, e depois a
trilha clara so no eixo. Da uma estrada larga com a trilha gasta no meio; a
arte traz o caminho centralizado no tile, entao duas linhas coladas virariam
dois caminhos paralelos em vez de uma via larga.

O tile da trilha vem da conectividade com as vizinhas (N=1, E=2, S=4, W=8). A
folha traz 9 pecas; as mascaras que faltam (Ts girados) saem de rotacao e
espelho, e as 16 vao assadas no tileset.

### Camada `zonas`

Camada de **objetos** chamada `zonas`, sem tile e sem colisao: e a demarcacao
dos lotes. A *class* diz o tipo (`casa`, `mercado`, `academia`, `parque`, `bar`,
`farmacia`, `oficina`, `escola`, `biblioteca`, `quadra`, `terreno`, `servico`,
`madeireira`, `pedreira`, `fazenda`) e o *name* e o id do lote. **Nome de lote e
chave global**: nenhum dos tres mapas repete um.

| propriedade | o que diz |
| --- | --- |
| `tipo` | mesmo valor da *class* |
| `uso` | `moradia`, `comercio`, `misto` (casa+comercio), `praca` ou `vago` |
| `moradia` | `true` quando o `uso` e `moradia` ou `misto` — alguem pode morar ai |
| `construida` | `true` = ja tem predio de pe; `false` = lote reservado |
| `mapaInterior` | chave em `game/mapas.ts` do interior, quando existe |

**`uso` e o que separa "como o lote se chama" de "o que ele e".** As seis casas
sao `moradia`, mercado e academia sao `comercio`, o parque e `praca`, e o bar e a
farmacia sao `misto`: um predio so, um interior so, com a moradia do dono de um
lado e o espaco de trabalho do outro. Como tem cama, os dois contam como
**moradia disponivel** na mesma validacao que impede dois NPCs na mesma casa
(`MORADIAS` em `game/npcs.ts`, conferida contra o mapa por `verificar-mapas`).

`vago` e o lote **sem interior ativo**: ou nunca teve construcao (os lotes
residenciais reservados do Mapa 2, as areas ambientadas do Mapa 3) ou tem predio
de pe com a porta fechada (a `casa_1` desativada, a Central Telefonica). Nao
recebe morador e nao entra em conta nenhuma de moradia.

**No Mapa 1, os 11 lotes estao construidos.** 9 tem predio e interior (5 casas de
NPC, mercado, academia, bar, farmacia) e vem de `CONSTRUCOES`; o parque e area
externa e vem de `PRACAS`; a `casa_1` tem predio e nenhum interior. Lote de misto tem 10x8 — maior que o de uma casa (8x6), porque o
predio tem duas funcoes dentro, e menor que o do mercado (12x8).
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
- `zonasDeMoradia` — os lotes onde alguem pode morar (5 casas de NPC + bar +
  farmacia no Mapa 1; no Mapa 2 e 3 os lotes de moradia estao reservados)
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
`ESTILOS_CASA`. Os predios de comercio e os desta leva (oficina, escola,
biblioteca, madeireira, Central Telefonica) sao compostos por `comporComercio`,
que ladrilha os paineis da folha do proprio predio em duas fileiras e troca o
painel do meio pelo letreiro (em cima) e pela porta (embaixo) — ver
`ESTILOS_COMERCIO`.

Do kit de telhado so a **coluna 0** (a laje) e usada. Cumeeira, chamine, lucarna
e rufo ficaram de fora: o encaixe delas nao da pra inferir com seguranca a
partir da folha, e chutar produziria telhado torto.

### Camada `moveis`

Camada de **objetos** de todo interior — as 6 casas, o mercado, a academia e os
dois mistos (bar e farmacia). Diferente da flora, aqui o gerador ja resolve tudo
— `atlas`, `frame`, `alturaTiles` e `colide` — e o jogo so posiciona e ordena
por y.

Mexer no layout de uma loja e mexer so em `MERCADO_PECAS` / `ACADEMIA_PECAS`,
onde cada item e `{ peca: [linha, indice], tx, ty }` com `tx`/`ty` no tile do
canto esquerdo-INFERIOR do movel (ele cresce pra cima e pra direita).

A peca e identificada por **[linha, indice na linha]**, nao por indice global: as
folhas de movel nao tem grade, saem por componente conexo agrupado em linhas, e
assim a arte ganhar ou perder um item no meio de uma linha nao embaralha o resto.

A colisao fica na base (`MOVEL_CORPO`), mais funda que a da pedra — gondola e
balcao sao moveis de encostar, nao de passar atras.

**Mobilia de casa: catalogo + layout.** As casas passam por uma indirecao a mais,
em duas tabelas:

- `MOVEIS_CASA` — o catalogo. Cada peca ganha nome, folha de origem, se **colide**
  e um `escala` opcional. O criterio da colisao e um so: colide o que tem volume
  pra esbarrar (guarda-roupa, comoda, estante, sofa, poltrona, mesa, rack, cama);
  nao colide o que esta deitado no chao (tapete, caminha de pet, puff), pendurado
  na parede (quadro, poster, relogio, prateleira, espelho encostado) ou e leve o
  bastante pra passar raspando (vaso, vela, difusor, cesto, violao). Cada peca
  solida a mais e um tile a menos pra circular num quarto de 14x9 uteis.
- `MOBILIA_CASA` — o layout, uma lista de `{ movel, tx, ty }` por casa. E o unico
  lugar onde as 6 casas diferem: planta, cama e saida seguem iguais. `casa_2` e
  `casa_3` tem dono (Edu e Mari, ver `npcs.ts`) e a mobilia acompanha.

O `escala` do catalogo e multiplicador de peca, pra arte desenhada em perspectiva
forte onde o retangulo do PNG e bem menor que a pegada real. Os tapetes usam
1,7 — na escala compartilhada saem mais estreitos que a mesa de centro que
deveria ficar em cima deles.

**A parede de cima do interior tem 2 tiles** (`PAREDE_TOPO`). Com 1 nao ha
superficie pra pendurar nada e o quadro sai flutuando no meio do chao; com 2 a
peca de parede fica com a base na borda de baixo da faixa e le como pendurada, e
o movel alto encostado passa a cobrir a parede, que e o certo.

**`conferirInterioresDeCasa()` roda na geracao** e reprova antes de escrever o
JSON: peca fora da sala, peca com a base na parede, duas pecas dividindo tile de
base (tapete e excecao — e camada de chao, movel em cima dele e o desejado) e
qualquer tile livre sem acesso a partir da frente da porta. Entre os tiles
exigidos estao a frente da cama e `(8,8)`, onde o NPC dono da casa nasce.

O que ela **nao** cobra e oclusao visual: peca de parede atras de movel alto passa
a checagem de tile e fica escondida na tela. Isso ainda sai olhando a previa.

**Interior misto: os dois ambientes no mesmo comodo.** O bar e a farmacia nao tem
interior de moradia e interior de comercio separados — tem UM mapa de 20x14, sem
parede nem porta interna entre as metades:

- a metade esquerda (colunas 1 a `MISTO_LIMITE_CASA`) e a moradia: chao de
  madeira, cama pintada no canto (o mesmo objeto `cama` das casas, entao dormir
  e salvar funcionam sem maquina nova) e mobilia tirada de `MOVEIS_CASA`;
- a metade direita e o trabalho: chao de ladrilho e mobilia da folha DEDICADA
  `moveis_farmacia_bar` (balcao, estanteria, mesa, banqueta, barril, letreiro);
- a troca de material do chao e o **unico** limite entre eles. A coluna do meio
  fica livre de cima a baixo: e por ela que se atravessa, e e o que faz o comodo
  ler como um espaco so.

O layout de cada um esta em `MISTOS`, em dois blocos (`casa` com nomes de
`MOVEIS_CASA`, `trabalho` com pares `[linha, indice]` da folha dedicada).
`conferirMistos()` roda a mesma conferencia das casas e cobra, alem dela, que
porta->cama, porta->area de trabalho, porta->spawn do dono e as duas pontas da
coluna de passagem continuem livres e alcancaveis. Nao ha venda nem atendimento
ainda: o espaco de trabalho e fisico, como no mercado e na academia.

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

## Conferencias

Uma por assunto, todas offline (`node --experimental-strip-types`), todas
reprovando com erro alto em vez de aviso:

| comando | o que prova |
| --- | --- |
| `npm run verificar-mapas` | topologia dos externos, par de borda, interior alcancavel, area privada dos mistos |
| `npm run verificar-rotinas` | os 33 NPCs nos 7 dias: rota livre, area/percurso conferido, lugar fixo alcancavel |
| `npm run verificar-relacoes` | tema, presente, blog e missao de cada NPC |
| `npm run verificar-economia` | preco, faixa, compra, save de dinheiro |
| `npm run verificar-inventario` | pilha, slot, save |
| `npm run verificar-ambientacao` | material, quadro, segredo, worldEvent |
| `npm run verificar-expansao-npcs` | os 24 moradores, as obras, as missoes |
| `npm run verificar-represa` | topologia em estrela, grafo dos andares, resposta dos enigmas autorais escrita em documento, dano por tipo, IA, tabela de salvado, revenda, derrota |
| `npm run verificar-andares` | os 50 andares, o prontuario de 200 dias, a resposta de cada enigma gerado, spawn de inimigo, luminaria e oclusao de luz, bichos, calendario e tempo |
| `npm run verificar-equipamento` | id de item, arte de mao, zona da arma, cadencia, recarga, projetil sem atravessar parede, oferta das lojas |

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
- Dia 0 e **segunda-feira, 1 de setembro de 2025** (`game/calendario.ts`). O
  calendario completo (dia, mes, ano, bissexto) e uma LEITURA de `estado.dia`,
  o contador que sempre existiu — nao ha segundo contador e nao ha migracao de
  save. Os 200 dias do prontuario da represa terminam em 20 de marco de 2026.
- O **tempo** (`game/clima.ts`) tambem e derivado da data: um hash do dia,
  pesado pela estacao do hemisferio sul, devolve limpo, nublado, chuva fraca ou
  chuva forte. Recarregar o save no dia 137 traz a mesma chuva, em qualquer
  maquina, sem campo nenhum no save. Chove em 27% dos dias do ano — 44% no verao
  e 14% no inverno. A chuva aparece so em mapa externo, escurece o mundo e troca
  o bloco ao ar livre da rotina de quem tem abrigo declarado.
- Dormir salva, avanca um dia e reseta a hora. O save **v6** (`localStorage`,
  chave `meu-jogo:save`) guarda dia, hora, **mapa atual e posicao nele**,
  inventario, pickups coletados, dinheiro, lixeira, trabalhos, relacoes e a
  **configuracao da casa** (comodos de expansao comprados e mobilia
  posicionada), e e carregado no boot. A v6 subiu porque o jogo passou de um
  mapa externo pra tres e a casa do protagonista mudou de lote: a chave de mapa
  gravada na v5 pode ser `casa_1`, que nao existe mais. Save de versao diferente ou corrompido e ignorado com
  aviso no console, e o jogo comeca do zero.
- A leva dos **cinquenta andares** NAO subiu a versao. Os campos novos
  (`vida`, `represa`, `equipamento`, `armas`, `arquivo`) sao aditivos: eles
  chegam ausentes num save v6 antigo e cada `restaurar` devolve o valor vazio —
  vida cheia, nada equipado, carregador vazio, arquivo sem ficha. Campo novo
  nao pede versao nova; so se sobe a versao quando o dado JA GRAVADO passa a
  significar outra coisa.

## Rotinas de NPC

Sao **33 NPCs**: os 9 do Mapa 1, escritos um por um, e os 24 moradores dos Mapas
2 e 3, montados a partir da agenda declarada em `MORADORES[].atividades`
(`game/moradores.ts`). Os dois grupos rodam no MESMO motor, `SistemaRotinasNpc`.

> Antes havia um segundo sistema em paralelo, que decidia a posicao dos 24 quadro
> a quadro dentro da `FarmScene`. Ele andava em circulo num quadrado de 5x5, nao
> entrava em predio nenhum (a diretora passava o dia na calcada da escola) e
> deixava os 24 impossiveis de abordar, porque a busca de alvo de interacao
> consulta o motor de rotinas. Uma agenda so, um motor so.

Cada entrada de `NPCS`, em `game/npcs.ts`, concentra nome, casa, **mapa externo**,
posicao inicial, spritesheet, dialogo e a lista ordenada de acoes. O motor aceita
`vagar`, `vagar_rota`, `andar_rota`, `assumir_lugar`, `posto_interior`,
`entrar_construcao`, `sair_construcao` e `voltar_para_casa`. NPC sem acao
configurada depois das 18:00 recebe automaticamente o retorno para sua casa.
`vagar_rota` permite pausas entre waypoints; saidas de interiores caminham ate a
porta antes de trocar de mapa.

**`DefinicaoNpc.mapa`** e o mapa externo a que o NPC pertence. Quem o usa e a
cena, em `posicaoNpcNoMapa`: ao ar livre o NPC aparece so no proprio mapa; dentro
de construcao ele aparece pra quem esta naquele interior, venha de onde vier — o
Rafael mora no Bairro e atende na academia do Mapa 1. O motor em si nao le esse
campo: pra ele bastam posicao e `dentro`.

**Rotina por dia da semana.** Alem de `rotina`, um NPC pode ter `rotinaSemanal`:
um mapa de indice do dia (0 = segunda, ver `DIA_DA_SEMANA` em `game/calendario.ts`)
pra uma lista que SUBSTITUI a rotina daquele dia. O motor escolhe uma vez por dia,
na virada, entao o dia inteiro roda com a mesma lista — nao ha `if` de dia da
semana espalhado pelas acoes. E o que da a viagem semanal ao mercado, e o que
separa o fim de semana dos 24 do dia util deles.

Ha ainda uma **substituicao dinamica** da rotina do dia, ligada em
`game/estado.ts`: quem foi designado a um projeto urbano troca o compromisso do
meio do dia pelo turno da obra. Como a escolha e feita na virada do dia, a
designacao vale a partir do dia seguinte — e o que o dialogo da prefeitura avisa.

### `assumir_lugar`: trocar de lugar sem caminhar

Das 24 folhas de arte dos moradores, **14 trazem apenas as quatro poses paradas**
(ver `npc-caminhada.json`, publicado por `npm run processar-sprites-npc`). Nao ha
como levar uma delas a pe sem deslizar uma pose de pe pelo chao. `assumir_lugar`
resolve isso assumindo o lugar de uma vez: `construcao` (ou `null`, pra ar livre)
mais `ponto`, e pronto.

A entrada e a saida de cena ganham um **esmaecimento de 220 ms**
(`aplicarVisibilidadeDeNpc`), o que faz o aparecer/desaparecer ler como
intencional em vez de falha.

Duas regras seguram o resto, e `npm run verificar-rotinas` cobra as duas:

- **todo lugar tem de estar livre e alcancavel** — nos interiores, o flood-fill
  parte da frente da porta da rua, entao ninguem fica de pe dentro de uma parede
  nem num comodo onde o jogador nao consegue chegar pra conversar;
- **no maximo UM bloco ao ar livre por dia**, cercado por interior. Duas trocas
  seguidas ao ar livre no mesmo mapa seriam um teleporte na cara do jogador —
  exatamente o que o sistema antigo fazia a cada mudanca de compromisso.

Quem TEM passada real na arte continua andando de verdade: a faixa de agenda
ganha uma **`rota`** (percurso de rua) ou uma **`area`** (retangulo de
perambulacao), e o motor roda `vagar_rota` ou `vagar` nela depois do
`assumir_lugar` que posiciona o NPC.

**Prefira `rota`.** A `area` tem de ser um retangulo convexo e inteiramente
livre, e num bairro com casa, cerca e arvore o maior retangulo livre perto de uma
porta e miudo — o da Samanta era 10x3, e o resultado em jogo era ela indo e
voltando num pedaco de gramado na frente da propria casa. O percurso nao tem essa
amarra: ele acompanha o EIXO das vias, que o gerador mantem livre (a flora
respeita a faixa da via e nenhum lote invade ela), entao o trajeto pode ter
dezenas de tiles e ainda ser feito de retas livres.

Seis percursos hoje, cada um combinando com o que a pessoa faz: a Julia percorre
a linha do onibus, o Caio desce a rua baixa de 20 a 55 atras de conserto, a
Samanta sai de casa e vai ate a escola, o Roberto anda a calcada de 66 a 100, a
Ilda faz a caminhada da tarde de 70 a 108 e a Suzan circula a quadra. A **roca do
Joao e da Neide continua sendo `area`**: sao 20x12 tiles de leira aberta, e quem
esta capinando anda mesmo sem rumo fixo — a objecao do retangulo pequeno nao vale
la.

### Onde cada um fica

| lugar | quem |
| --- | --- |
| escola, diretoria | Livia (diretora) |
| escola, sala de aula | Ilda (professora de historia, meio periodo) |
| escola, carteiras | Cecilia, Arthur, Ravi, Manuela, Helena |
| biblioteca, balcao | Clara (bibliotecaria) |
| biblioteca, acervo | Lucas (funcionario); Ravi de tarde; Lucia na leitura |
| madeireira, balcao | Bruno (encarregado) |
| academia do Mapa 1 | Rafael (fisioterapeuta) |
| lavoura da Zona Rural | Joao e Neide, perambulando |
| portao da escola | Matheus (policial comunitario) |
| quadra | as criancas de tarde e nos fins de semana; Suzan produzindo |
| a propria casa | Rita (costura), Davi (cozinha), Priscila (escritorio) |
| percurso de rua | Caio (consertos), Julia (linha do onibus), Roberto e Ilda (calcada), Samanta (clientes), Suzan (quadra) |
| patio da central | Tulio (bicos de reparo) |

A terceira sala da escola virou **diretoria** (piso proprio, mesa e estante, sem
carteira nem quadro): duas salas de aula bastam pras cinco criancas da cidade.

### Presenca interior fixa

O dono que **mora onde trabalha** nao tem trajeto: ele existe dentro do proprio
interior e alterna entre dois `postos`, so pelo relogio. E a acao
`posto_interior`, com `posto: 'trabalho' | 'moradia'`:

- `trabalho` — atras do balcao, no horario de funcionamento
- `moradia` — na metade residencial do MESMO interior, fora do horario

A troca NAO e teleporte: ele percorre a espinha do predio a pe, atravessando a
porta somente-NPC. Enquanto esta dentro ele fica com `dentro = casa` e
`visivel = false`, que e o mesmo par que esconde qualquer NPC "dentro de
construcao" — logo ele nao aparece no mapa externo nem no mapa da tecla M.

**Os postos sao do PREDIO, nao do NPC.** Ficam em `LOCAIS_CIDADE[lote].postos`,
ao lado de `frente` e `portaInterior`, e `conferirMistos()` no gerador exige que
os dois continuem livres e alcancaveis a partir da porta. Qualquer futuro dono do
mesmo lote herda as duas posicoes ja conferidas — nada disso e por personagem.

`corredorInterior` no mesmo registro e o caminho interno a percorrer antes da
porta ao sair: a reta do posto de moradia ate a porta atravessa mobilia nos dois
mistos, e o motor nao faz pathfinding.

Marcar o NPC com `presencaInteriorFixa: true` nao muda comportamento — e rotulo.
A validacao na carga de `npcs.ts` cobra que a marca, o uso de `posto_interior` e
os `postos` do lote existam juntos, e que `dentroInicial` seja o proprio lote.

### As folhas de sprite

**Duas folhas por personagem: caminhada e pose parada.** `npm run processar-sprites-npc`
normaliza cada uma numa grade 4x4 (linhas: baixo, cima, esquerda, direita) —
mas a ordem DENTRO da arte muda de personagem pra personagem, entao cada entrada
do script remapeia, e folha sem perfil esquerdo (Leticia, Mari) o gera
espelhando o direito. Sem a folha de parado o idle cai no 1o frame da
caminhada, que e uma pose de passo: o NPC parado parece andar no lugar.

Tres coisas no recorte custaram caro e por isso estao explicadas no proprio
script:

- **a escala sai da CAIXA OPACA**, nunca do tamanho da imagem de origem.
  `reduzirPara` reamostra somente a caixa opaca; no caminho `gradeFixa` a imagem
  e a celula inteira da grade, e medir por ela esticava a figura ate a proporcao
  da celula;
- **os cortes da grade sao BUSCADOS**, nao assumidos. As folhas de arte nao
  distribuem as poses em celulas iguais (na da Helena os vaos caem em 0,29 /
  0,54 / 0,77), e cortar em quartos exatos partia a figura no meio;
- **a remocao do fundo preto so roda em folha CHAPADA.** `removerFundoPreto`
  decide pela cor ignorando o alfa, entao numa folha que ja vem recortada a
  inundacao atravessa o fundo transparente e come o cabelo escuro do
  personagem.

A folha de caminhada do Wendel tem 8 colunas, e a saida usa as colunas 0/2/4/6
pro ciclo de 4 frames nao sair pela metade. Ela tambem precisa de
`separarEmpilhados: true`: numa das colunas o pe da pose de frente toca a cabeca
da pose de baixo, e sem o corte a deteccao por componente acha 31 sprites onde
deveria achar 32 — o corte pelos N maiores entra um rotulo da arte no lugar do
que faltou e todas as linhas saem embaralhadas.

**`npc-caminhada.json`** lista quem tem passada real na arte. E o mesmo padrao de
`mobilia.json`: a arte e a fonte, o gerador publica, o jogo e a conferencia leem.
`npm run verificar-expansao-npcs` compara o cadastro com esse arquivo, o que
impede um NPC voltar a receber `vagar` sem ter folha de caminhada — foi o caso do
Bruno, que deslizava pelo pateo da madeireira com quatro poses de pe.

### Moradias

| NPC | mora em | dia |
| --- | --- | --- |
| Edu | `casa_2` | vaga pela cidade inteira |
| Mari | `casa_3` | academia 09:00-13:00 |
| Jaqueline | `casa_4` | mercado 08:30-17:00 |
| Leticia | `casa_5` | sem destino fixo: avenida e gramado da praca |
| Hiago | `casa_6` | vaga pela cidade |
| Wendel | `farmacia` | presenca interior fixa; abre 09:00, fecha 18:00 |
| Alice | `bar` | presenca interior fixa; abre 12:00, fecha 20:00 |
| Livia, Matheus, Cecilia | `casa_b1` | escola / portao / carteira |
| Clara, Lucia | `casa_b2` | biblioteca |
| Caio, Helena | `casa_b3` | consertos na rua / escola e quadra |
| Julia, Arthur, Rita | `casa_b4` | linha de onibus / escola / costura em casa |
| Roberto, Ilda, Ravi | `casa_b5` | calcada / escola / biblioteca |
| Davi, Samanta, Manuela | `casa_b6` | cozinha de casa / rua / escola e quadra |
| Rafael, Suzan | `casa_b7` | academia do Mapa 1 / quadra |
| Lucas | `casa_c1` | acervo da biblioteca |
| Tulio | `casa_c2` | pateo da central |
| Joao, Neide, Priscila | `casa_rural_1` | lavoura / lavoura / escritorio em casa |
| Bruno | `casa_rural_2` | balcao da madeireira |

Luke divide a `casa_4` com a mae e Vitor divide a `casa_6` com o irmao; nas casas
dos Mapas 2 e 3 o **titular** e o primeiro morador dela na ordem de `MORADORES` e
os demais da familia recebem `compartilhaCasa`. A validacao em `npcs.ts` explode
na carga se dois titulares dividirem lote, ou se alguem for posto a morar em lote
que nao e moradia.

**Moradia disponivel** e o que `MORADIAS` lista: as 5 casas do Mapa 1, os 2 lotes
MISTOS (bar e farmacia, que tem cama), as 9 casas ocupadas do Bairro e as 2 da
Zona Rural — 18 no total. `MORADIAS_VAGAS` deriva daquela lista menos quem ja tem
morador, e hoje esta vazia. `npm run verificar-rotinas` confere que a frente de
cada moradia vaga esta livre.

### Conversa

Todos os 33 tem tema de conversa em `TEMAS_POR_NPC` (`game/dialogo.ts`): 5 a 8
temas pros 9 originais, 3 a 5 pros 24 moradores, sempre com um tema que a pessoa
gosta e um que ela evita, 2 ou 3 variacoes de fraseado por tema, e uma fala
propria de "a gente ja conversou hoje". `npm run verificar-relacoes` cobra esse
contrato inteiro, incluindo que o menu do dia saia com 3 a 4 temas e as duas
polaridades.

Os moradores tem ainda a opcao **"Perguntar sobre o dia"**, que le a agenda e
responde com o compromisso do momento — e a ponte entre a rotina e o texto.

### O que a conferencia cobra

Rode `npm run verificar-rotinas`. Ele simula 06:00-19:00 amostrado nos **tres
mapas** e confere:

- tile bloqueado, na grade do mapa de cada NPC — tiles solidos, as caixas de
  colisao de arvore e pedra **e** os moveis solidos ao ar livre (foi o que
  mostrou que a area de `vagar` da praca cobria os brinquedos do parque);
- cada area de `vagar` na definicao, incluindo as das rotinas semanais;
- cada `assumir_lugar`: livre e alcancavel, no mapa ou interior que ele diz;
- no maximo um bloco ao ar livre por dia, sem duas trocas seguidas ao ar livre;
- nenhum posto FIXO sobreposto — dois NPCs parados no mesmo tile viram um sprite
  so (quem esta andando ou perambulando se cruza de passagem, e isso e normal);
- que todo NPC termine o dia dentro da propria casa, e as transicoes pelas portas.

**As rotas usam coordenadas de tile e nao fazem pathfinding** — cada trecho e uma
reta. Duas consequencias que ja morderam:

- A **area de `vagar` e um retangulo** e o NPC anda em reta ate um ponto sorteado
  dentro dela. So funciona se o retangulo for INTEIRAMENTE livre; ai a
  convexidade garante o resto. Um retangulo "por cima da cidade" passa dentro de
  casa e de arvore. Pra cobrir regiao nao convexa, use varios turnos de `vagar`
  ligados por `andar_rota` — e o que a Leticia faz, um turno na avenida principal
  e outro no gramado sul da praca — ou, melhor, um **percurso** (`rota`) pelo
  eixo das vias.
- O **percurso de `vagar_rota` e um ciclo**, e a conferencia confere cada trecho
  em reta, incluindo o que fecha (ultimo -> primeiro) e a entrada a partir do
  `ponto` da faixa. Waypoint em cima do eixo de uma via e sempre seguro; waypoint
  no meio do gramado precisa ser conferido.
- O **fallback das 18:00 sai em reta** da posicao atual pro primeiro ponto de
  `rotaCasa`. Entao esse primeiro ponto tem de ser alcancavel em reta de onde o
  NPC costuma estar as 18:00 — no caso da Leticia, um ponto dentro da praca. Os
  24 moradores nao dependem dele: a agenda deles fecha com um `assumir_lugar` em
  casa as 22:00, e por isso a `rotaCasa` deles e vazia.

Casa que fica ENTRE a porta e a via (o caso de `casa_5` e `casa_6`, ao sul do
anel) precisa de rota contornando: subir reto da porta bate na parede da propria
casa.

Ele tambem simula a **semana inteira** pros NPCs de presenca interior fixa e
cobra o contrato: o dono aparece la fora APENAS no dia da viagem (e nesse dia
chega ao mercado e volta pro proprio predio), nunca fica visivel nos outros seis
dias, ocupa os dois postos todo dia, e nenhuma posicao dele — dentro ou fora,
parado ou andando — cai em tile bloqueado. A grade do interior usada nessa
conferencia inclui o corpo de cada movel solido, com a mesma caixa da FarmScene,
entao ela pega tambem a caminhada do posto ate a porta.

`npm run processar-sprites-npc` regenera as folhas transparentes e uniformes de
todos os 33.

## A represa (Mapa 4)

A primeira **area de risco** do jogo: uma usina hidroeletrica desativada ao
norte do Mapa 1. Ela e aditiva — nenhum sistema antigo mudou por causa dela, e
quem nunca subir a estrada nao ve diferenca nenhuma no jogo.

### O exterior

`represa`, 80x140 — estreito e comprido de proposito. E um corredor de mata
subindo de sul pra norte, com a **maior densidade de flora dos quatro mapas** e
nenhum morador. A estrada e polilinha com sete inflexoes e dois ramais que nao
levam a lugar obrigatorio, pra nao ler como corredor reto.

De sul pra norte: entrada do Mapa 1, mata, placa velha, cerca caida do
piquenique, **mirante** sobre o rio de jusante, **canal de drenagem** cruzando a
estrada (com ponte), **galpao de servico**, **subestacao murada**, **cerca de
alambrado de ponta a ponta com portao unico**, patio de concreto, **casa de
forca**, o corpo da **barragem** atravessando o mapa e o **reservatorio** de
78x21 tiles acima dela.

A agua e intransponivel e a cerca fecha o vale: a unica forma de chegar na porta
e o portao. `conferirExterno` (na geracao) recebe uma lista de **alvos
proibidos** — o miolo do reservatorio, a passarela da barragem e o rio — e
reprova se qualquer um deles ficar alcancavel. Um furo de 1 tile na cerca nao
passaria por uma conferencia que so olha o que E alcancavel.

### Os cinquenta andares

A usina tem **50 andares**. Os cinco primeiros sao os setores desenhados a mao da
leva anterior — mesmas chaves de mapa (`represa_0` a `represa_4`), mesmas
plantas, mesmas flags de puzzle. Um save gravado dentro do `represa_2` continua
abrindo no `represa_2`; **nao ha migracao**. Do 6 ao 50 as chaves sao
`represa_f06` a `represa_f50`.

O **registro central** e `src/game/andares.ts`, e ele e a razao de a coisa caber
na cabeca: nao ha `if (andar === 23)` em arquivo nenhum. Capitulo, escuridao,
fauna, tabela de salvado, ficha medica, parada de elevador e template saem de la,
e a maioria e DERIVADA por funcao em vez de escrita cinquenta vezes — escrever
cinquenta numeros que seguem uma curva e o jeito mais seguro de a curva ganhar um
degrau que ninguem nota.

| capitulo | andares | nome | escuridao | fauna dominante |
| --- | --- | --- | --- | --- |
| 1 | 1-10 | Rotina | 0,00 a 0,24 | esfera de choque e aparelho tomado |
| 2 | 11-20 | Pressao | 0,26 a 0,40 | aparelho tomado |
| 3 | 21-30 | Colapso | 0,41 a 0,55 | impressora arisca |
| 4 | 31-40 | Negacao | 0,57 a 0,71 | robo de servico |
| 5 | 41-50 | Reconhecimento | 0,72 a 0,86 | maquina pesada |

O capitulo 5 tem **parede propria**, da folha
`PAredes_internas_represa_andar_50_100.png`: concreto rachado, vidro blindado,
parede de painel e tubulacao. As pecas com numero de andar pintado (51-60,
61-70...) ficaram de fora — sao dos andares que esta fase nao implementa.

**Isto rebalanceou os andares 2 a 5**, e vale dizer alto: eles ficaram mais
claros (a curva de cinquenta andares vai de 0 a 0,86, e a de cinco ia de 0 a 0,8
em quatro passos) e os dois monstros mais pesados sairam de la pro capitulo 5.
Eles eram o fim de uma descida de cinco; agora sao a introducao de uma de
cinquenta.

### Como um andar novo e montado

Os 45 andares novos sao **compostos**, e composicao nao e geracao aleatoria:

- **nove geometrias escritas a mao** (`TEMPLATES` e `LABIRINTOS` em
  `tools/andares-represa.mjs`): oito parametricas — espinha de 3 e de 5 salas,
  cruzamento, galeria dupla, galeria com anexos, anel, poco, salao — e **tres
  labirintos autorais**, com cada corredor declarado como um segmento, no mesmo
  idioma de polilinha que as vias dos mapas externos usam;
- **dezesseis modulos industriais** (sala de controle, camara de turbina,
  corredor de manutencao, area alagada, sala eletrica, deposito, ventilacao,
  geradores, arquivo, tunel, casa de bombas, portaria, ferramentaria,
  servidores, galeria de cabos, baias de escritorio), cada um com piso, parede,
  escuridao relativa e categoria de mobilia proprios;
- **qual template e quais modulos** cada andar usa esta escrito andar por andar
  em `andares.ts`.

O que sobra pro automatico e so ONDE, dentro do comodo, cada objeto cai — e isso
sai de um hash do numero do andar. O andar 23 e igual em toda maquina e em todo
reload.

Os 50 passam pelo **mesmo `gerarSetorRepresa`** e pela **mesma conferencia de
geometria** dos cinco autorais: 19.276 tiles de comodo conferidos, tudo livre e
tudo alcancavel a partir do alcapao de chegada.

Os labirintos ficam nos andares **8, 17, 26, 34 e 43**, e cada um tem tres
**marcos** de navegacao (tubo colorido, porta numerada, cabo com anilha, painel
cego, baia numerada) — e por eles que o jogador aprende o caminho em vez de
decorar curvas. O mesmo labirinto e reusado em dois andares, e o texto dos marcos
muda com a profundidade, entao o reuso nao le como reuso.

### Enigmas

Sao **52 paineis**: os sete autorais dos cinco primeiros andares e **45 gerados**,
um por andar composto, de **dez familias**:

sequencia de alavancas · roteamento de energia · travessia de labirinto ·
codigo de terminal · sequencia de valvulas · reconexao de circuito ·
peso e pressao · energia contra o tempo · observacao · pista de outro andar

O painel e a PISTA nascem da **mesma funcao** (`gerarEnigma`, em
`src/game/enigmas.ts`). Nao existe caminho de codigo que produza um sem o outro —
que era o risco de escrever quarenta e cinco a mao e deixar metade das respostas
sem pista escrita em lugar nenhum.

`verificar-andares` prova, pros 45, que **cada palavra de peso da resposta esta
escrita num documento alcancavel ate aquele andar** — nunca num andar mais fundo,
que exigiria descer pra poder descer. As duas excecoes sao deliberadas e
conferidas como excecao: o labirinto nao tem resposta escrita (ele tem mapa da
secao, e o desafio e chegar), e o `multiandar` tem as duas METADES do codigo em
andares diferentes, nunca o codigo inteiro.

A cada cinco andares o enigma **trava a descida** — sao as nove portas de verdade
da usina. Nos outros trinta e seis ele abre um recipiente de salvado melhor.
Metade das luminarias de um andar depende do enigma dele: resolver o painel
acende o andar e revela caminho que estava ilegivel.

A curva da dificuldade e conferida: nenhum enigma profundo nos dez primeiros
andares, nenhum simples nos dez ultimos.

### O elevador de servico

Onze paradas: andares **1, 5, 10, 15, 20, 25, 30, 35, 40, 45 e 50**. Cada uma
precisa ser ATIVADA no proprio andar antes de valer — chegar na cabine e o que a
destrava. Nao ha como pular pra andar nao visitado; o elevador so encurta caminho
ja andado.

### O prontuario de 200 dias

Cada andar guarda **uma ficha medica**, cobrindo quatro dias: o andar 1 traz os
dias 1 a 4, o 50 traz os dias 197 a 200. As cinquenta estao em
`src/game/fichas.ts`.

E ficcao: um prontuario inventado, escrito pra contar uma historia. Nao ha ali
orientacao medica, dose, diagnostico aproveitavel nem conduta que alguem deva
seguir.

A revelacao e gradual, e a escada e conferida:

| andar | o que aparece |
| --- | --- |
| 1 a 9 | o paciente e um numero de cadastro e mais nada |
| 10 | as iniciais |
| 20 | a ocupacao: desenvolvedor de software |
| 30 | a historia comeca a bater com a do protagonista |
| 40 | da pra concluir de quem e o prontuario |
| 50 | nao ha mais como nao concluir |

O que o andar 50 estabelece: a mudanca pra cidade pequena **nao** foi um plano de
vida tranquila que apareceu do nada. O que ele NAO estabelece, de proposito: quem
levou o prontuario pra dentro da usina, o que sao os monstros, por que o setor
profundo tinha energia tres anos depois do desligamento e o que ha abaixo do
andar 50.

As fichas **nao entram no inventario** — sao cinquenta folhas, e ocupariam a
mochila inteira. Ler uma ARQUIVA o numero dela, e dai pra frente ela pode ser
relida na tela de **Arquivos** (tecla J). A ficha nao recolhida aparece como
`?????`, pra quem pulou um andar saber que pulou.

### Os dois eixos de dificuldade

**Profundidade** e o eixo permanente: cada andar escurece mais e a fauna do
capitulo e mais pesada. **Tensao** e o eixo temporario: ela sobe enquanto o
jogador esta DENTRO dos andares e zera quando ele sai.

A tensao acelera por **capitulo** (1x no primeiro, 3x no quinto) e nao por
profundidade absoluta — 49 vezes o fator antigo levaria a tensao ao teto em tres
minutos de jogo. Ela multiplica velocidade, raio de deteccao e cadencia dos
inimigos — **nunca dano nem HP** — e **desconta tentativas dos enigmas**.
Quarenta minutos no capitulo 1 nao passam de 0,25; quarenta no capitulo 5 passam
de 0,6.

### Iluminacao

Nao ha mais vinheta. O que ha e um **mapa de luz**: um valor por tile do andar,
somando cada luminaria acesa e a lanterna do jogador, com **linha de visao
conferida tile por tile**. A cena transforma isso numa textura de um texel por
tile e a desenha esticada com filtro LINEAR — e a interpolacao da GPU que faz o
degrade, sem shader e sem borda geometrica.

Os dois defeitos que isso corrige sao concretos: a luz era um circulo desenhado
(dava pra ver a borda dele) e ela atravessava parede.

- **Quatro tipos de luminaria** com arte de verdade (pendente de galpao, bulbo
  de gaiola, luminaria tubular, plafon de teto), de `Lampadas_v2.png`. So o
  estado ACESO entra no atlas; o apagado sai tingindo o mesmo frame, o que
  garante que acender a luz nao troque a silhueta do objeto.
- **Circuito**: metade das luminarias de um andar depende do enigma dele.
- **Lanterna** com facho direcional que segue a mira, para na parede e nao tem
  borda reta. Sem consumo de bateria.
- O mapa estatico e calculado **uma vez por andar** e so refeito quando um
  circuito muda — nao ha tracado de linha de visao por quadro.

### Combate, vida e derrota

| coisa | valor |
| --- | --- |
| vida | 30/30, independente da energia de trabalho |
| invulnerabilidade apos dano | 750 ms |
| golpe base | 4 de dano, arco de 1,5 tile a frente, trava de 260 ms, recarga de 460 ms |
| golpe com a chave inglesa equipada | 7 de dano |
| **pistola** | 6 de dano, 8 tiros, 300 ms de cadencia, 1,2 s de recarga, 9 tiles de alcance |
| inimigos | 7 tipos, 6 a 32 de HP, 2 a 8 de dano |

A pistola e **so pra dentro da usina**: ela fica na mochila em qualquer lugar do
mundo, mas so equipa em zona perigosa, e sair de la guarda ela — com a municao do
carregador de volta pra mochila. Ela nao substitui o corpo a corpo: resolve um
pesado em cinco tiros e acaba no meio de uma briga de tres, e ai a chave inglesa
volta a ser a arma.

O projetil avanca em passos de meio tile por quadro, e por isso **nao atravessa
parede** nem quando o quadro demora 250 ms — `verificar-equipamento` prova isso
em quatro taxas de quadro.

**Derrota nao e permadeath e nao encosta em nada critico.** Vida a zero: o
jogador acorda na enfermaria do **hospital municipal** (Mapa 1), passam 4 horas de
jogo, ele volta com a vida CHEIA e perde METADE do salvado recolhido NESTA
descida. Acordar dentro da propria usina, como era antes, fazia a derrota parecer
teletransporte de conveniencia — o jogador descia de novo no mesmo minuto.

Save, item de missao, item unico, arma, municao, mobilia, relacionamento, ficha
arquivada, enigma resolvido, parada de elevador e atalho aberto ficam todos
intactos.

### Salvado e dinheiro

15 itens de salvado em tres raridades, com **preco fixo escrito a mao**. Onze
tabelas de sorteio, uma por faixa de dez andares mais os premios de enigma e o
cofre profundo — e a conferencia cobra que o **valor esperado suba** com a
profundidade.

O ciclo fecha na **caixa de despacho da oficina**, que revende a 80% do valor de
referencia, e agora tem **onde gastar**: a madeireira vende chave inglesa,
lanterna e municao, e a farmacia do Wendel vende kit de primeiros socorros,
analgesico e energetico. Uma descida armada e abastecida custa cerca de R$ 60, e
um so modulo de controle do fundo paga R$ 144 na revenda.

### Desempenho

Os 45 tilemaps novos passam de um megabyte de JSON somados. Eles **nao entram no
boot**: `MAPAS` marca cada um como `sobDemanda`, o BootScene os pula e a cena de
mundo busca o do andar quando o jogador chega nele. Os andares distantes saem do
cache — so o atual e os dois vizinhos ficam.

### Arte

| arte | como entrou |
| --- | --- |
| `Represa.png` | fachada da casa de forca, portaria e galpao |
| `PAredes_internas_represa.png` | seis estilos de parede interna, capitulos 1 a 4 |
| `PAredes_internas_represa_andar_50_100.png` | cinco estilos do capitulo 5 |
| `Grama_mapa_4.png` | so a celula do vertedouro, como sprite de marco |
| `public/assets/Monstros/*.png` | 7 das 9 folhas, no formato 4x4 dos NPCs |
| `Lampadas_v2.png` | quatro luminarias industriais |
| `itens_represa_v2.png` | 18 icones de item (arma, municao, ferramenta, remedio, salvado) |
| `Pistola.png` | a arma na mao, o fogo do cano e o projetil |
| `Player_segurando.png` | a folha generica de segurar item |

**O que ficou sem uso, e por que:** `Boss_v1.png` (fundo degrade, que o removedor
de fundo nao trata) e `Micro-ondas.png` (mistura caminhada, morte e sopro de fogo
nas mesmas linhas) — chefe tambem estava fora de escopo; `Arvores_mapa_4.png`
(gradiente verde opaco); `Rios_v1.png` e `RIos_v2.png` (pecas de composicao, nao
grade de tile); `Itens_represa.png` (fundo opaco, substituida pela v2);
`Paredes_internas_represa_andar_101_150.png`, `M4A1.png` e `Shotgun.png`
(reservadas pra fase seguinte); `Cercas_fazenda.png` e `Paredes_fazenda.png`
(ainda sem lote que as peca).

### Persistencia

O save continua na **versao 6**: a leva inteira e aditiva.

| dado | onde mora |
| --- | --- |
| vida | campo `vida` (ausente no save antigo -> 30/30) |
| corrida atual e andar mais fundo | campo `represa` (ausente -> zerada) |
| o que esta equipado | campo `equipamento` (ausente -> nada equipado) |
| carregador de cada arma | campo `armas` (ausente -> vazio) |
| fichas medicas recolhidas | campo `arquivo` (ausente -> lista vazia) |
| enigma resolvido, atalho e parada de elevador | flag de `worldEvents` |
| recipiente ja saqueado | id em `itensColetados`, o mesmo Set dos pickups |

Nao ha um segundo sistema de save por causa da represa. Inimigo **nao** persiste
individualmente: ele volta a cada visita, de proposito.

## Itens com funcao, equipamento e a mao do jogador

O inventario deixou de ser so uma lista. `src/game/equipar.ts` diz **o que cada
item faz**, por id, em forma de dado — item que nao esta naquela tabela e inerte,
o que continua sendo o caso das 300 pecas de mercado e de eletronico. Antes desta
leva o efeito de "usar" era um `TODO` no meio da UIScene.

**Slots:** MAO e UTILITARIO funcionam; ACESSORIO existe na tabela e nao aceita
nada ainda — mas ja e serializado, restaurado e limpo junto com os outros, entao
o primeiro item de acessorio nao vai pedir migracao de save.

**A mao** nao e uma folha de personagem por ferramenta. Ha UMA folha
(`Player_segurando.png`, em que o personagem segura um punho fechado vazio) e o
item e um sprite colado no punho. Isso precisa de tres informacoes, e duas sao
MEDIDAS e nao escritas a mao:

1. onde esta o punho em cada pose — `tools/processar-sprites-jogador.mjs` acha o
   componente de cor de pele mais compacto de cada uma das quatro poses;
2. onde esta a presa e a boca do cano de cada item —
   `tools/gerar-equipamento.mjs`;
3. como o item se acomoda na mao em cada direcao — este e escrito a mao, e mora
   junto do item.

`npm run processar-sprites-jogador` e `npm run gerar-equipamento` regeneram os
dois primeiros.

## Hospital municipal (Mapa 1)

Um predio novo no lote a leste da avenida: recepcao na frente, consultorio e
enfermaria atras, 22x16. A mobilia sai de `Moveis_hospital.png`, que ja estava na
pasta e so servia a fachada do Posto de Saude.

Ele **nao** e o Posto de Saude que o jogador constroi no Mapa 2. Sao dois
predios, e a razao e de regra: o hospital e o ponto de recuperacao universal da
derrota, e ele nao pode depender de o jogador ter juntado quinze mil reais.

A planta e simples de proposito e extensivel: ha espaco declarado pra um segundo
consultorio e pra equipe, que entram quando alguem for morar neles.

## Calendario, tempo e chuva

O calendario completo (dia, mes, ano, bissexto) e uma **leitura** de
`estado.dia` — nao ha segundo contador e nao ha migracao. Dia 0 e segunda-feira,
1 de setembro de 2025.

O **tempo** e derivado da data pelo mesmo principio: um hash do dia, pesado pela
estacao do hemisferio sul. Recarregar o save no dia 137 traz a mesma chuva, em
qualquer maquina, sem campo nenhum no save — deterministico e mais forte que
persistido, porque nao ha estado pra corromper.

A chuva aparece **so em mapa externo** (nunca dentro de predio, nunca dentro da
usina — o interior da represa nao consulta o clima em lugar nenhum, e e assim que
o tempo nunca torna um enigma impossivel). Ela troca tambem o bloco ao ar livre
da rotina de quem tem abrigo declarado: quem anda na rua passa o bloco em casa, o
Ravi vai pro canto dele na biblioteca, e Edu e Leticia — cuja rotina inteira e ao
ar livre — nao saem. O emprego continua valendo: quem trabalha na cafeteria vai
trabalhar na chuva.

A tecla **C** abre o mes inteiro, com o dia de hoje marcado e os dias de chuva em
cor de agua.

## Bichos de estimacao

Seis, em vinte e quatro moradias: tres cachorros e tres gatos, de
`Cachorros.png` e `Gatos_v1.png`. Eles dormem, vagam, sentam e seguem o dono — e
**nao brigam, nao tem relacionamento e nao entram em conta de economia nenhuma**.

Eles nao usam o motor de rotina dos NPCs, e de proposito: aquele motor resolve
caminhada entre waypoints, entrada e saida de construcao, substituicao por
emprego e por chuva, e marcador no mapa da cidade. Um gato andando tres tiles em
volta de um poste nao precisa de nada disso.

O passinho e uma **lissajous** em volta de um ponto, sem fisica e sem colisao: o
bicho nunca sai do circulo declarado, e `verificar-andares` prova que o circulo
inteiro e chao livre.

`npm run processar-sprites-pet` regenera as folhas.

## A interface

`src/game/tema.ts` guarda a paleta e o vocabulario de medida; `src/scenes/ui.ts`
guarda as pecas de desenho (painel, campo, slot, barra, aba, divisoria, cartao).
Nenhuma cor literal deve aparecer numa cena.

A direcao e **RPG de pixel + cidade pequena + oficina**: papel amarelado, carvao,
madeira, latao. A interface anterior era funcional e parecia protótipo — retangulo
preto chapado, sem hierarquia, com o dinheiro e a vida soltos um do lado do outro
e uma barra de HP com cara de medidor de depuracao. O que faltava nao era
enfeite, era um sistema: as mesmas cores e as mesmas molduras em toda tela, pra a
proxima tela nascer parecida com as que ja existem.

| tela | o que mudou |
| --- | --- |
| HUD | um cartao so, com data e hora em duas linhas, saldo e — quando faz sentido — barra de vida segmentada. Some na cidade com o jogador inteiro |
| HUD da usina | faixa propria embaixo: codigo do andar (`A-17`), nome, tensao e, com arma na mao, arma e municao |
| Inventario | 456x238 (era 396x188), slots de 26 px (eram 22), previa grande do item, preco, equipamento e as acoes do item selecionado |
| Calendario | tela nova (tecla C) |
| Arquivos | tela nova (tecla J), com as fichas nao recolhidas mascaradas |
| Dialogo, menu, confirmacao, loja | mesma moldura de painel das outras |

## Expansao de casa e mobilia

O nucleo mecanico novo. Sao **duas compras diferentes, em dois balcoes
diferentes**, e as duas passam inteiras por `estado.carteira.gastar()` — ninguem
escreve saldo direto. A tabela de precos mora em `game/casa.ts` e e ajustavel.

### Comodo, na madeireira (Mapa 3)

A planta da casa+oficina ja nasce com **todos** os comodos construidos no
tilemap: piso, parede e vao. O que a compra faz e **destapar** o vao, e nao
construir. E o inverso do que parece natural, e e de proposito: nao ha geometria
inventada em tempo de jogo, so um tile pra apagar.

Enquanto o comodo nao foi comprado, a `FarmScene` poe um tile de parede no vao
— antes de ligar a colisao, entao ele barra como qualquer parede. O comodo
continua existindo do outro lado; ele so nao tem por onde entrar.

A camada de objetos `expansoes` do tilemap e o contrato entre gerador e jogo:

| propriedade | o que diz |
| --- | --- |
| `comodo` | nome do comodo na camada `comodos` |
| `vaoTx` / `vaoTy` | o tile de passagem que o jogo tapa/destapa |
| `gidParede` | o tile de parede usado pra lacrar |

`npm run verificar-mapas` roda o flood-fill **duas vezes** na casa: com as
expansoes abertas (o estado do tilemap) e com elas lacradas (o estado de jogo
novo). A segunda passada prova que lacrar nao ilha nenhum comodo basico, e que
nenhum comodo compravel e alcancavel sem a compra. O gerador faz a mesma
conferencia em duplicata antes de escrever o mapa.

### Movel, na bancada da oficina

O jogador escolhe a peca no catalogo, ela vira um **fantasma preso ao ponteiro**
(verde onde da, vermelho onde nao da) e ele solta com o clique. E o mesmo trio
`pointerdown`/`pointermove`/`pointerup` do minigame de conserto, sem lib nova.

Uma posicao so vale se as quatro coisas valerem, **conferidas em tempo de
jogo**:

1. a peca cabe inteira dentro de um comodo que o jogador ja possui;
2. o ponteiro nao esta longe demais do jogador (`ALCANCE_DE_MOBILIA`);
3. nenhuma outra peca divide tile com ela — colida ela ou nao (a mesma regra que
   a conferencia offline aplica na mobilia autoral);
4. com ela no lugar, **todo comodo possuido continua alcancavel a partir da
   porta** (flood-fill em runtime). E o que impede entulhar o corredor e se
   trancar.

Peca de chao (tapete) pula 3 e 4: ela nao tem corpo de colisao, entao pode ficar
debaixo de qualquer coisa e nao fecha passagem nenhuma.

O dinheiro so sai no clique, e a validade e **reconferida dentro do `cabe()`**
da transacao — a peca pode ter deixado de caber entre o ultimo movimento do
ponteiro e o clique.

**As medidas das pecas nao estao no codigo do jogo.** `game/casa.ts` lista id,
nome, preco e a chave em `MOVEIS_CASA`; o gerador le essa mesma lista, mede a
peca na propria folha de arte e escreve `assets/sprites/mobilia.json` com atlas,
frame, largura e altura em tiles. Assim o jogo valida a pegada com o mesmo
numero que a conferencia de interior usa, e nao ha medida de arte duplicada.

## Notas

- `pixelArt: true` + `roundPixels: true` no `main.ts`: sem isso a arte borra ao
  escalar. `image-rendering: pixelated` no CSS faz o mesmo do lado do canvas.
- Resolucao base 480x270 com `Scale.FIT`. O zoom da camera **nao e fixo**: sai
  de `TILES_VISIVEIS_X` (15) dividido pelo tamanho do tile, entao o campo de
  visao fica travado em 15 tiles de largura. Com tile 16 dava zoom 2; com 32 da
  zoom 1 — a tela mostra a mesma coisa, com o dobro de pixel por tile.
- Em dev, `window.game` e `window.estado` estao expostos pro console.

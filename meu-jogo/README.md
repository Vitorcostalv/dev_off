# Meu Jogo

### Campanha narrativa e registros 51–200

Ao entrar no jogo, o prólogo inicia a campanha de 25 cenas, com encontros na cidade,
recaída, cuidado dos moradores, retorno à represa, desfecho e epílogo.
**Pausa → Sua história** mostra o próximo encontro e permite retomar uma cena interrompida.
Depois da cena da ficha 50, examine novamente o documento para descer a escada:
são 150 salas compactas exploráveis, com registros, vestígios e progresso salvo.
Os primeiros 50 andares continuam nos mapas Tiled; a expansão usa uma cena própria.
**Arquivos [J] → Psicoterapia** permite reler os registros; durante a campanha,
novas leituras ficam limitadas à profundidade alcançada. Saves antigos são preservados.
Detalhes, gatilhos e adaptações estão no [roteiro consolidado](docs/narrativa-consolidada.md).

`npm run verificar-campanha` verifica a ordem das cenas e os caminhos das 150 salas.
`npm run test:campanha-browser` percorre a campanha no Chrome com Vite em
`http://127.0.0.1:5190` (ou `GAME_URL`), incluindo retomada de cena e exploração após reload.

`npm run importar-psicoterapia` recompõe o catálogo a partir da fonte autoral;
`npm run verificar-psicoterapia` confere os textos, a sequência e a persistência.
`npm run test:psicoterapia-browser` testa a leitura no Chrome com Vite em
`http://127.0.0.1:5189` (ou `GAME_URL`).

Phaser 3 + TypeScript + Vite. Top-down, pixel art, tilemaps feitos no Tiled.

## Rodar

```bash
npm run dev
```

Abre em http://localhost:5173. `npm run build` gera o `dist/`.
`npm run gerar-assets` remonta o tileset, os atlas de flora e os tilemaps a
partir da arte em `public/assets/sprites/`. `npm run gerar-itens` monta o atlas
de icone de item e `npm run gerar-aparelhos` o dos aparelhos do minigame de
conserto. `npm run gerar-audio` sintetiza os 46 WAV de
`public/assets/audio/` — efeitos, ambientes e trilhas; nenhum binario de som
entra no repositorio sem a receita que o gerou.

## Controles

As doze acoes de jogo passam pelo `src/game/InputRouter.ts` e sao
**remapeaveis** em Opcoes > Teclas e controle (menu de pausa ou tela de
titulo). A escolha fica em `localStorage["meu-jogo:controls"]`; teclas
duplicadas, invalidas ou reservadas sao recusadas com aviso, e "Restaurar
teclas padrao" volta a tabela abaixo.

| Padrao | Acao |
| --- | --- |
| W / S / A / D | mover (as setas movem sempre, mesmo remapeado) |
| Shift | correr |
| E | interagir, avancar dialogo, confirmar |
| Tab | abrir/fechar inventario (e trocar de secao na DevStore) |
| M | abrir/fechar o mapa do lugar onde voce esta |
| Espaco | golpear com a chave inglesa (so faz algo dentro da represa) |
| R | recarregar a arma equipada |
| U | usar o item selecionado |
| F | equipar/desequipar o item selecionado |

Teclas fixas, que nao entram no remapeamento porque as telas dependem delas:

| Tecla | Acao |
| --- | --- |
| Setas | navegar menus, listas e quantidade na loja |
| Enter | confirmar dialogo e menu |
| Esc | cancelar, fechar painel, desistir de posicionar mobilia |
| PageUp / PageDown | rolar listas longas (trabalhos, loja, mapas) |
| C | trocar a prateleira/secao da loja |
| J | abrir os ARQUIVOS (fichas recolhidas na represa) |
| X | descartar a pilha selecionada |
| O | organizar o inventario |
| Ponteiro + clique | interagir, mirar arma e posicionar mobilia |

Controle (gamepad) e detectado sozinho e funciona no mundo, nos menus, no
inventario e no DevOS:

| Botao | Acao |
| --- | --- |
| Analogico esquerdo / direcional | mover e navegar |
| A | interagir e confirmar |
| B | voltar/cancelar |
| X | golpear |
| Y | inventario |
| LB / RB | correr / recarregar |
| LT / RT | usar item / atirar |
| Analogico direito | mirar a arma |
| Clique no analogico esquerdo | equipar/desequipar |
| Start | pausa |
| Select | mapa |

### Som

Cinco volumes independentes em Opcoes > Som e volume: geral, musica, ambiente,
efeitos e interface. Cada linha mostra porcentagem e barra em texto; setas
laterais (ou o direcional do controle) ajustam de 10 em 10. Os valores ficam em
`localStorage["meu-jogo:settings"]`, fora do save do jogo.

Ambiente e trilha vem do lugar: centro, bairro, rural, interior e represa tem
ambiente proprio, chuva e vento trocam o ambiente do mapa aberto, a noite muda o
ambiente e silencia a musica da cidade, o bar tem trilha propria e a represa
ignora clima e hora — do andar 26 em diante o drone fica mais grave. Passo muda
com a superficie do mapa. Detalhes em [docs/audio.md](docs/audio.md).

### Modo de desenvolvimento

As teclas abaixo existem **somente em build de desenvolvimento**
(`import.meta.env.DEV`). O bundle de producao nao registra nenhuma delas, nao
expoe `window.game`/`window.estado` e nao mostra a pagina de
desenvolvimento no menu — `npm run test:producao` confere isso no `dist/`.

| Tecla | Acao |
| --- | --- |
| F10 | painel de desenvolvimento (mapas, itens, hora, dia, clima, vida, dinheiro, exportar save, FPS) |
| F1 | debug das colisoes |
| F6 | mostrar/esconder as zonas reservadas |
| F7 | avancar uma hora para testar rotinas |
| F2 / F3 | adicionar Cabo USB / kit de exploracao no inventario |
| F9 | salvar na hora |
| F4 | apagar o save com confirmacao e backup |
| F8 | escolher e restaurar backup com confirmacao |

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
    represa.ts         setores base, escuridao, tensao e derrota; andares/enigmas expandem para 50
    avisos.ts          textos de exame; e aqui que as RESPOSTAS dos enigmas moram
    save.ts            localStorage
    tipos.ts           tipos compartilhados
  scenes/
    BootScene.ts       preload, animacoes, carga do save
    FarmScene.ts       cena de mundo: tilemap, player, colisao, camera, interacao
    CamadaRepresa.ts   componente da FarmScene: escuridao, inimigos e combate
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
      navegador.ts     blog por dia/minuto e relacionamentos reais
      conquistas.ts    FACHADA — idem
tools/
  png.mjs              encoder PNG minimo + hash deterministico
  imagem.mjs           decoder PNG, deteccao de grade/blob e reducao de tile
  folha-personagem.mjs recortador de folha 4x4, compartilhado por NPC e monstro
  gerar-assets.mjs     monta tileset + folhas/atlas de sprite + todos os tilemaps
  processar-sprites-npc.mjs      as folhas dos 33 NPCs
  processar-sprites-monstro.mjs  as folhas dos 7 monstros da represa
public/assets/
  tilemaps/            4 externos (farm, bairro, rural, represa) + um por
                       interior (casa_2..casa_6, casa_b1..b7, casa_c1/c2,
                       casa_rural_1/2, mercado, academia, bar, farmacia,
                       oficina, escola, biblioteca) + os 5 setores base da represa
                       (represa_0..represa_4) + 45 andares adicionais — todos gerados
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
| `npm run verificar-represa` | topologia em estrela, grafo dos setores, resposta de enigma escrita em documento, dano por tipo, IA, tabela de salvado, revenda, derrota |

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
- Dormir salva, avanca um dia e reseta a hora. O save **v6** (`localStorage`,
  chave `meu-jogo:save`) guarda dia, hora, **mapa atual e posicao nele**,
  inventario, pickups coletados, dinheiro, lixeira, trabalhos, relacoes e a
  **configuracao da casa** (comodos de expansao comprados e mobilia
  posicionada), e e carregado no boot. A v6 subiu porque o jogo passou de um
  mapa externo pra tres e a casa do protagonista mudou de lote: a chave de mapa
  gravada na v5 pode ser `casa_1`, que nao existe mais. Save de versao diferente ou corrompido e ignorado com
  aviso no console, e o jogo comeca do zero.

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

### Os cinco setores

Cinco tilemaps desenhados a mao, ligados por alcapao e elevador. **Nao sao
interiores de predio**: tem varias portas, nenhuma cama, nenhum comodo privado, e
por isso `verificar-mapas` desvia deles (quem confere e a geracao e
`verificar-represa`).

| nivel | chave | escuridao | o que tem |
| --- | --- | --- | --- |
| 0 | `represa_0` | 0 | entrada, sala de controle e arquivo. **Zona segura**: sem inimigo, e onde o jogador acorda apos derrota |
| -1 | `represa_1` | 0,18 | manutencao em dois ramos (A e B) e um corredor; a porta de servico do ramo A e o primeiro atalho |
| -2 | `represa_2` | 0,38 | galeria das turbinas (tres vaos separados por pilar), corredor de servico (0,52) e casa de bombas |
| -3 | `represa_3` | 0,60 | galerias inferiores em ANEL — da pra fugir dando a volta — e o quadro geral |
| -4 | `represa_4` | 0,80 | poco de drenagem e a camara da placa mestre, com o cofre de peca rara |

A escuridao mora no **tilemap, por comodo** (`comodos[].escuridao`), com o valor
do setor como piso. Nao ha cadeia de `if` por nivel no codigo. Em jogo ela e uma
vinheta radial centrada no jogador, com o buraco de luz do tamanho do **raio de
lanterna** — 3,2 tiles sem lanterna, 5,6 com a lanterna de manutencao que o
primeiro enigma libera. Lampada de emergencia e painel aceso ficam ACIMA da
vinheta, com mistura aditiva: sao marcos de navegacao, e e o que separa escuridao
tensa de escuridao chata.

### Os dois eixos de dificuldade

**Profundidade** e o eixo permanente: cada nivel escurece mais e os bichos de la
doem mais. **Tensao** e o eixo temporario: ela sobe enquanto o jogador esta
DENTRO dos setores e zera quando ele sai (sair pro patio da casa de forca ja
conta como escapar).

A tensao multiplica velocidade, raio de deteccao e cadencia dos inimigos —
**nunca dano nem HP**, pra a conta de "quantos golpes eu aguento" continuar
previsivel — e **desconta tentativas dos enigmas**. Errar num painel tambem sobe
a tensao. Quarenta minutos de jogo no nivel 0 nao passam de 0,25; quarenta no
nivel -4 passam de 0,8.

### Enigmas

Sete paineis: uma alavanca, tres simples, dois intermediarios e um profundo de
tres passos. O conteudo mora em `src/game/represa.ts`; o tilemap so diz onde cada
um esta.

| painel | nivel | tipo | o que abre |
| --- | --- | --- | --- |
| quadro de disjuntores | 0 | sequencia de 3 | luz do hall, a gaveta do controle e a **lanterna** |
| painel de simbolos | -1 | escolha | armario de suprimentos |
| caixa de passagem | -1 | escolha | caixa de pecas da bomba |
| alavanca da porta de servico | -2 | um passo | **atalho permanente** pro nivel -1 |
| sinoptico dos geradores | -2 | sequencia de 4 | a descida pro nivel -3 |
| mesa de comportas | -3 | sequencia de 4 + **codigo de 2 digitos** | a descida pro nivel -4 |
| placa de controle mestre | -4 | escolha + **peca do inventario** + **codigo de 4 digitos** | o cofre de peca rara e o **elevador de servico** |

**A resposta de todo enigma esta escrita em algum documento do mapa**, e
`verificar-represa` prova isso lendo os documentos do proprio tilemap. O enigma
profundo junta pista de tres setores diferentes: o componente queimado esta no
arquivo do nivel 0, a primeira metade do codigo na placa da turbina (nivel -2) e
a segunda no terminal do nivel -4.

Nenhum enigma e obrigatorio pra sair da usina. Tres protegem so loot; os outros
abrem profundidade ou atalho.

### Combate, vida e derrota

| coisa | valor |
| --- | --- |
| vida | 30/30, independente da energia de trabalho |
| invulnerabilidade apos dano | 750 ms |
| golpe do jogador (chave inglesa) | 4 de dano, arco de 1,5 tile a frente, trava de 260 ms, recarga de 460 ms |
| inimigos | 7 tipos, 6 a 32 de HP, 2 a 8 de dano |

Nenhum inimigo mata o jogador cheio em menos de tres golpes — `verificar-represa`
cobra isso por tipo. A IA e uma maquina de estados simples (parado, patrulha,
alerta, perseguindo, atacando, atingido, morto) com **histerese** no aggro (o
raio de desistencia e sempre maior que o de deteccao, senao o bicho tremeria no
limite do circulo) e **linha de visao** (sem ela ele perseguiria atravessando
parede).

A IA vive em `src/game/inimigos.ts` e **nao tem uma linha de Phaser**: e por isso
que `verificar-represa` consegue provar sem navegador que ele persegue, desiste,
respeita a cadencia e para de agir depois de morto.

**Derrota nao e permadeath e nao encosta em nada critico.** Vida a zero: o
jogador acorda no nivel 0, passam 4 horas de jogo, ele volta com 60% da vida e
perde METADE do salvado recolhido NESTA descida (arredondando pra baixo — quem
achou uma peca so nao perde nada). Save, item de missao, mobilia, relacionamento,
flag de enigma e atalho aberto ficam todos intactos.

### Salvado e dinheiro

15 itens de salvado em tres raridades, com **preco fixo escrito a mao** (o valor
do salvado E a regra de balanceamento por profundidade, e sorteio nao se
equilibra). Dez tabelas de sorteio, uma por nivel mais os premios de enigma e o
cofre profundo — e `verificar-represa` cobra que o **valor esperado suba do nivel
0 ao -4**, senao nada garantiria que descer valha a pena.

O ciclo fecha na **caixa de despacho da oficina** (o canto sudoeste, tile 17,20):
ela revende salvado a 80% do valor de referencia. A diferenca existe pra usar a
peca na bancada continuar sendo uma opcao. A venda remove do inventario ANTES de
creditar, e por isso acionar de novo nao duplica dinheiro.

### Arte

| arte | como entrou |
| --- | --- |
| `Represa.png` | fachada da casa de forca, portaria e galpao, pelo sistema de PAINEL que a fachada de comercio ja usava |
| `PAredes_internas_represa.png` | seis estilos de parede interna, um por profundidade |
| `Grama_mapa_4.png` | so a celula do vertedouro, como sprite de marco. As seis celulas sao CENAS compostas e nao ladrilham |
| `public/assets/Monstros/*.png` | 7 das 9 folhas, processadas pro mesmo formato 4x4 dos NPCs |

Cinco tiles pintados a mais, pro que a arte nao cobre em planta baixa: patio de
concreto, corpo da barragem, grelha de aco, cerca de tela e barreira de obra.

**`Boss_v1.png` e `Micro-ondas.png` ficaram de fora**, com o motivo documentado
em `tools/processar-sprites-monstro.mjs`: a primeira veio sobre fundo degrade (o
removedor de fundo decide por preto chapado e nao encosta nele) e a segunda
mistura ciclo de caminhada com quadro de morte, sopro de fogo e pecas soltas nas
mesmas linhas. **`Arvores_mapa_4.png` tambem esta sem uso**: ela veio sobre
gradiente verde opaco, e a mata do Mapa 4 usa o atlas de arvore que ja existia.

### Persistencia

O save continua na **versao 6**: a leva e aditiva.

| dado | onde mora |
| --- | --- |
| vida | campo `vida` (ausente no save antigo -> 30/30) |
| corrida atual (tempo dentro, tensao, salvado recolhido) | campo `represa` (ausente -> zerada) |
| enigma resolvido e atalho aberto | flag de `worldEvents` |
| recipiente ja saqueado | id em `itensColetados`, o mesmo Set dos pickups |

Nao ha um segundo sistema de save por causa da represa. Inimigo **nao** persiste
individualmente: ele volta a cada visita, de proposito.

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

## Overhaul em andamento

Save atual: v7, com migracao automatica de v6, normalizacao por sistema e ate tres backups locais. Versoes futuras nao sao sobrescritas. Todos os atalhos de depuracao (F1–F10, painel de desenvolvimento incluso) estao desativados no build de producao. O mapa pausa o relogio.

Auditoria, lacunas e roteiro: [docs/overhaul.md](docs/overhaul.md). A remasterizacao completa ainda nao foi entregue.

Etapas com documento proprio: [controles e modo de desenvolvimento](docs/controles-dev.md),
[audio](docs/audio.md), [remap do centro](docs/centro.md),
[remap do bairro](docs/bairro.md),
[remap da zona rural](docs/zona-rural.md),
[remap da estrada da represa](docs/estrada-represa.md),
[interiores urbanos](docs/interiores.md),
[distorcao da represa](docs/represa-distorcao.md),
[clima, estacao e encontros](docs/social.md),
[interfaces e DevOS](docs/interface.md),
[casa, economia e combate](docs/equilibrio.md),
[performance e acessibilidade](docs/desempenho.md) e
[validacao final](docs/validacao-final.md). O centro (Mapa 1)
tem calcada nas duas margens de toda via, travessia calcada, caminho de acesso
por lote, quatro pracas de esquina, vielas de terra batida, sete patios com
funcao e 71 pecas de mobiliario urbano — 25 delas acendem a noite, cada halo no
poste onde ele esta. Os interiores publicos (biblioteca, escola, mercado,
academia) e a casa do protagonista ganharam mobilia: a densidade media dos 23
interiores subiu de 7,0 pra 7,8 pecas por 100 tiles, e `npm run
verificar-interiores` guarda o piso. Os cinquenta andares da usina ganharam
distorcao por capitulo: 1 e 2 industriais, 3 com repeticao encostada de peca
identica, 4 com mobilia de escritorio onde ela nao tem o que fazer e 5 com
escritorio e casa sobrepostos — nenhuma ficha, enigma, parada de elevador ou
regra de inimigo mudou. Os QUATRO mapas externos estao remapeados. O bairro ganhou calcada em toda via
(anel que segue a curva da rua, nao retangulo como no centro), treze acessos
ligando porta a rua, dois largos na rua da estacao, patio na escola e na
biblioteca, e 38 pecas de mobiliario — e a rua do condominio fechado passou a
entrar pelo portao e virar rua interna, que e o que tira as casas do Lucas e do
Tulio de cima do mato. A zona rural nao ganhou calcada de proposito (estrada de
terra na roca nao tem meio-fio) e ganhou o que faltava: serventia de cada uma
das tres portas ate a estrada, terreiro nas duas moradias, patio na madeireira,
eira nas fazendas e 22 pecas de mobiliario de roca. A estrada da represa ganhou
tres recuos e 16 pecas, com UMA lampada no mapa inteiro, no portao da usina.
Cada mapa tem conferencia propria: verificar-bairro (153 conferencias),
verificar-zona-rural (79) e verificar-estrada-represa (52). A rotina dos 33 moradores passou a consultar o calendario: verao
empurra a atividade ao ar livre do meio do dia pra depois das 16h, inverno tira
a que comeca depois das 17h, chuva e temporal recolhem quem esta na rua pro
abrigo de casa (dezessete pessoas na rua do bairro viram tres) e tres encontros
juntam gente no calendario — sabado no bar, domingo na praca e a feira no dia 14
de cada estacao, anunciada no quadro da praca. Turno de trabalho, posto de
emprego e trabalho de roca nao se mexem. A interface saiu de setenta e quatro
tamanhos de fonte crus em dez valores pra uma escala de oito degraus com nome, e
as cinco molduras de painel copiadas viraram uma: nenhuma tela escreve tamanho,
familia de fonte ou cor de moldura. As seis janelas passaram a ter UM dono de
foco (`game/foco.ts`), o que corrigiu dois bugs de teclado — escolher assunto
com um NPC pedia dois apertos de E, e o ESC com uma pergunta aberta cancelava o
menu de tras em vez da pergunta. A economia passou a ser MEDIDA antes de ser
mexida: `npm run verificar-equilibrio` simula o quadro de vagas dos 112 dias do
ano, as onze tabelas de salvado e o catalogo da casa, e diz quantos dias de jogo
custa cada compra. Ele achou dois problemas — a casa inteira custava onze dias de
trabalho, e dez andares do fundo da represa pagavam treze (mais que a casa
inteira, porque `nivel_4` dava 36% de chance de peca "rara"). A casa passou a
custar uma estacao, a chance de raro virou uma escada declarada, e a peca de
reposicao no conserto deu uso as cinco pecas comuns de sucata: um dia de descida
no raso passou de R$ 158 pra R$ 736 — um dia de trabalho — quando a sucata e
guardada em vez de vendida. O boot passou a ser MEDIDO na rede em vez de no
disco: baixava 127,89 MB em 210 arquivos antes de o menu aparecer, e agora baixa
36,18 MB em 169 — o tempo ate jogavel caiu de 6.290 pra 2.364 ms e o `dist/` de
266 pra 93 MB. Os tres achados: o sprite de personagem tinha 6,7x mais pixel do
que a tela mostra (o jogo desenha em 48px e o quadro tinha 320), as catorze
folhas de movel carregavam sempre todas, e as treze faixas longas de audio
carregavam no boot. Das quatro opcoes de acessibilidade, duas eram decorativas:
`altoContraste` valia por UM retangulo da tela de menu e agora vale pra toda
moldura do jogo, e `movimentoReduzido` so desligava particulas e agora tambem
para a seta [Enter], o unico elemento que piscava pra sempre. Por fim, a
validacao final: `npm run verificar-canon` trava o canon narrativo em 397
conferencias — os 33 NPCs, as onze casas com quem mora em cada uma, as 6 missoes
pessoais, os 5 segredos, os 5 capitulos com as bordas de andar, as 50 fichas
fechando a cronologia em 200 dias e a escada de revelacao do paciente (o cadastro
4471-C aparece exatamente nos dezenove primeiros andares). E
`npm run test:progressao-browser` joga os sistemas juntos numa partida, visita os
cinquenta andares em sequencia e prova que um save v6 nao so abre como continua
jogavel: mercado com 32 moveis, loja tomando o foco, dia virando e os 33
moradores voltando com rotina.

`npm run folha-contato <atlas>` monta a folha de contato de um atlas de movel
em `docs/folhas/`, com o endereco `[linha, indice]` marcado em cada peca — e
como se escolhe peca pra autorar interior.

`npm run verificar-overhaul` verifica regressao de cidade, emprego, mapa runtime, blog e listas. `npm run test:browser` requer Google Chrome instalado e o servidor Vite em http://127.0.0.1:5186 (ou GAME_URL); verifica os 77 mapas, sete apps, rolagem, trabalhador e save/reload.

`npm run verificar-tudo` roda os vinte validadores de dominio em sequencia e
grava a evidencia agregada em `docs/evidence/<rotulo>-tests.json`. As suites de
navegador (`test:browser`, `test:save-browser`, `test:cotidiano-browser`,
`test:rural-browser`, `test:servicos-browser`, `test:controles-browser`,
`test:dev-browser`, `test:audio-browser`, `test:centro-browser`,
`test:interiores-browser`, `test:represa-browser`, `test:social-browser`,
`test:interface-browser`, `test:equilibrio-browser`,
`test:desempenho-browser`, `test:progressao-browser`) precisam do Chrome e do
servidor de desenvolvimento
em http://127.0.0.1:5186 — ou em outro endereco, por `GAME_URL`. Rode uma por
vez, porque compartilham o mesmo `localStorage`, e rode contra um servidor
RECEM-SUBIDO: depois de muitas edicoes o HMR do Vite passa a servir duas
instancias do mesmo modulo, e a suite mede a que o jogo nao usa.
`npm run test:producao` e a unica que roda contra o build:
exige `npm run build` e `npx vite preview --port 5187 --strictPort --host 127.0.0.1`
(ou PRODUCTION_URL), e confere que o `dist/` nao carrega termos nem atalhos de
desenvolvimento, nao expoe globais de depuracao, ignora F1-F10 sem tocar no
save e ainda assim remapeia teclas pela tela de opcoes.

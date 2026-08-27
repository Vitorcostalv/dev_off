# Meu Jogo

Phaser 3 + TypeScript + Vite. Top-down, pixel art, tilemaps feitos no Tiled.

## Rodar

```bash
npm run dev
```

Abre em http://localhost:5173. `npm run build` gera o `dist/`.
`npm run gerar-assets` regera o tileset placeholder e os tilemaps.

## Controles

| Tecla | Acao |
| --- | --- |
| Setas / WASD | mover |
| Shift + movimento | correr |
| V | mostrar o mapa inteiro / voltar ao zoom normal |
| E ou clique | interagir, avancar dialogo, confirmar |
| Setas ou A/D | escolher Sim/Nao na confirmacao |
| Esc | cancelar confirmacao |
| Tab | abrir/fechar inventario |
| F1 | debug das colisoes |
| F2 / F3 | adicionar item de teste no inventario (debug) |
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
    npcs.ts            catalogo de NPCs
    save.ts            localStorage
    tipos.ts           tipos compartilhados
  scenes/
    BootScene.ts       preload, animacoes, carga do save
    FarmScene.ts       cena de mundo: tilemap, player, colisao, camera, interacao
    UIScene.ts         HUD, prompt, dialogo, confirmacao, inventario
tools/
  gerar-assets.mjs     gera o tileset e os dois tilemaps
public/assets/
  tilemaps/            farm.json (externo) e casa.json (interior)
  tilesets/terrain.png tileset 16x16, 10 tiles
  sprites/             spritesheets de pose/caminhada/corrida + referencias
```

O tileset ainda e **placeholder gerado por script**. O player parado usa
`player_sprites.png`, a caminhada usa `Player_andando.png` e a corrida usa
`Player_correndo.png`, sempre com quatro poses por direcao. As imagens
individuais ficam como referencia e nenhum desses arquivos e sobrescrito por
`npm run gerar-assets`.

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
- Colisao vem da propriedade booleana `collides` marcada **nos tiles** do
  tileset (nao na camada). Hoje colidem: agua, pedra, parede e os dois tiles
  de cama.

### Camada `interativos`

Camada de **objetos** chamada `interativos`. A *class* do objeto define o tipo:

| class | o que faz | propriedades |
| --- | --- | --- |
| `placa` | dialogo fixo de teste | — |
| `npc` | conversa | `npcId` -> chave em `game/npcs.ts` |
| `porta` | troca de mapa com fade | `destino` (chave em `game/mapas.ts`), `destinoTx`, `destinoTy` (em **tiles** do mapa de destino) |
| `cama` | pergunta e dorme | — |

Qualquer objeto aceita `rotulo` pra trocar o verbo do prompt (a porta de saida
da casa usa isso pra dizer "Sair" em vez de "Entrar").

O alvo da interacao e o mais proximo dentro do raio **e** dentro do cone da
direcao pra onde o player olha (`CONFIG.interacao`, em `game/config.ts`).

## Tempo, dias e save

- `CONFIG_TEMPO` em `game/relogio.ts`: hoje **10 minutos de jogo a cada 5
  segundos reais**, dia comeca 06:00 ao acordar, jogo novo comeca 07:20.
- Passar da meia-noite acordado tambem vira o dia.
- Dia 0 e uma segunda-feira (`game/calendario.ts`).
- Dormir salva, avanca um dia e reseta a hora. O save (`localStorage`,
  chave `meu-jogo:save`) guarda dia, hora, mapa, posicao e inventario, e e
  carregado no boot. Save de versao diferente ou corrompido e ignorado com
  aviso no console, e o jogo comeca do zero.

## Notas

- `pixelArt: true` + `roundPixels: true` no `main.ts`: sem isso a arte borra ao
  escalar. `image-rendering: pixelated` no CSS faz o mesmo do lado do canvas.
- Resolucao base 480x270 com `Scale.FIT`, camera com `zoom: 2`.
- Em dev, `window.game` e `window.estado` estao expostos pro console.

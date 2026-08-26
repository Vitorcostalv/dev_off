# Meu Jogo

Phaser 3 + TypeScript + Vite. Top-down, pixel art, tilemap feito no Tiled.

## Rodar

```bash
npm run dev
```

Abre em http://localhost:5173. `npm run build` gera o `dist/`.

## Controles

| Tecla | Acao |
| --- | --- |
| Setas / WASD | mover |
| F1 | liga/desliga o debug das colisoes |

## Estrutura

```
src/
  main.ts              config do Phaser (resolucao, pixelArt, fisica, cenas)
  scenes/
    BootScene.ts       preload dos assets + criacao das animacoes
    FarmScene.ts       gameplay: tilemap, player, colisao, camera
public/assets/
  tilemaps/farm.json   mapa exportado do Tiled
  tilesets/terrain.png tileset 16x16 (4 tiles: grama, terra, agua, pedra)
  sprites/player.png   spritesheet 16x16, 4 colunas x 4 linhas
```

A arte atual e **placeholder gerada por script** — substitua os PNGs pelos seus
do Aseprite mantendo as mesmas dimensoes e tudo continua funcionando.

## Fluxo do Tiled

1. Abra o projeto `Jogo.tiled-project` (na pasta acima desta).
2. Edite `meu-jogo/public/assets/tilemaps/farm.json`.
3. Salve/exporte como **JSON**, na mesma pasta. O Vite recarrega sozinho.

Regras que quebram o jogo se forem violadas:

- O nome do tileset **dentro do JSON** e `terrain`. E esse nome que aparece no
  primeiro argumento de `map.addTilesetImage('terrain', 'tiles-terrain')` em
  `src/scenes/FarmScene.ts`. Se renomear no Tiled, renomeie la tambem.
- O segundo argumento (`tiles-terrain`) e a key do `this.load.image(...)` no
  BootScene — sao coisas diferentes, nao confunda.
- As camadas se chamam `chao` e `objetos`. Renomeou? Atualize o `createLayer`.
- Colisao vem da propriedade booleana `collides` marcada **nos tiles** do
  tileset (nao na camada). Hoje agua e pedra colidem.

## Notas

- `pixelArt: true` + `roundPixels: true` no `main.ts`: sem isso a arte borra ao
  escalar. `image-rendering: pixelated` no CSS faz o mesmo do lado do canvas.
- Resolucao base 480x270 com `Scale.FIT`, camera com `zoom: 2`.
- Em dev, `window.game` expoe a instancia do Phaser pro console do navegador.

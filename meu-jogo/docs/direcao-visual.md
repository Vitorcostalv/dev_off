# Direção visual: 2D ilustrado, personagens modulares e luz

Mantemos Phaser, câmera top-down, mapas Tiled, interiores e represa. HD-2D é referência estética para profundidade, composição e luz; esta entrega não converte o jogo para 3D nem conclui a substituição da arte.

[Proposta integral do autor](narrativa-fontes/direcao-visual-modular.txt).

## Base técnica implementada

- **Paper doll:** `PersonagemModular` compõe seis camadas vetoriais: sombra, pernas, roupa/corpo, rosto, cabelo e acessórios. Configuração TS define corpo, pele, cabelo, camisa, calça e óculos/gorro. A semente produz combinações estáveis.
- **Primeira aplicação real:** figurantes ambientais do bairro e centro usam essa composição e caminhada direcional, substituindo círculos/retângulos. Moradores principais e protagonista conservam suas folhas autorais. A arte modular atual é um estudo estilizado de baixa resolução, ainda não a arte ilustrada final.
- **Contrato de poses:** idle, walk, run, hold, tool, combat, sit, lean, work, read, phone, eat e sleep compartilham âncora e quatro fases. Neste primeiro estudo, sit/lean/sleep têm silhuetas simplificadas, e ferramentas/objetos são genéricos. As rotinas dos figurantes usam walk/idle; a conexão das demais poses a pontos de atividade permanece pendente.
- **Colisão:** protagonista e NPCs usam retângulo de 0,33 × 0,24 tile nos pés, independente das dimensões e escala do frame. Origem inferior central e ordenação por Y existentes foram preservadas.
- **Sombras:** protagonista e moradores recebem contato suave, seguindo posição, visibilidade, fade e profundidade. A textura radial é compartilhada e os observadores são removidos ao destruir o sprite.
- **Luz:** halos de postes existentes passam a usar gradiente radial suave e mistura aditiva. É iluminação 2D de composição; ainda não há normal maps, oclusão física nem sombras projetadas.
- **Paleta:** matiz discreta por região — centro/casa/bar/biblioteca quentes, bairro frio, rural verde-terra, represa azul industrial. Alto contraste desativa essa camada. Após o epílogo, a camada se torna menos intensa.
- **Chão molhado:** pequenas poças determinísticas sob paredes e mobiliário duram até três horas de jogo depois da última chuva observada no mapa, com estado persistido. A qualidade baixa omite as poças. Ainda não desviam rotas nem respondem a passos.
- **Acessibilidade:** movimento reduzido mantém personagens modulares no quadro estático e preserva os limites de partículas anteriores.

## Próximas entregas da direção visual

1. **Arte de personagens:** corpo e camadas ilustradas definitivas, variações autorais, poses completas com pontos de atividade; retratos neutro/feliz/irritado/triste/preocupado, modo opcional de retratos e expressões sobre NPCs. Não substituir rostos autorais por combinações aleatórias.
2. **Cenários:** famílias de tiles maiores, identidade por prédio, paredes altas, quinas e desgaste; terreno orgânico, decals locais, vegetação variada, tronco/copa separados, telhados que desaparecem, verticalidade e foreground. O tamanho lógico dos tiles e a colisão permanecem independentes da arte.
3. **Atmosfera:** fontes emissivas em janelas/monitores/letreiros/carros, reflexos na chuva, vento nos objetos, neblina em camadas, pós-processamento leve opcional, objetos cotidianos animados, tráfego ocasional. Avaliar qualidade baixa e movimento reduzido desde o começo.
4. **Comportamento visual:** activityPoints e poses conectados às rotinas; auditoria do pathfinding já existente, recuperação de presos, portais e LOD por distância. Figurantes atuais ainda seguem suas rotas ambientais anteriores.
5. **Câmera e interface:** antecipação sutil, enquadramentos narrativos no próprio mapa, HUD contextual, mochila/mesa de trabalho, mapas desenhados e industriais distintos, loading contextual, transições de áudio/exposição, logo e tipografia, menus diegéticos.
6. **Continuidade narrativa:** casa e objetos de amigos, fotografias físicas, integração dessas composições à tela inicial dinâmica já existente. Coordenar com as [etapas de vida e memória](expansao-vida-e-memoria.md).

## Verificação

`npm run verificar-visual`: quatro proporções de frame × três tamanhos de tile, invariância de colisão, sementes e quadros das poses. `npm run test:visual-browser`: corpos Arcade reais, renderização das camadas, figurantes em suas rotas, persistência de umidade e capturas de luz/poses. O build e os verificadores existentes de rotina e ambientação também foram executados.

Evidências: `docs/evidence/visual-paper-doll.png`, `visual-ambiente.png` e `visual-luz-noturna.png`.

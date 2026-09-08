# Controles remapeáveis e painel de desenvolvimento

## Implemented
Roteador único de entrada com doze ações, teclado remapeável, controle (gamepad) no mundo/menus/inventário/DevOS e mira pelo analógico direito. Tela Opções > Teclas e controle grava, valida e restaura atalhos. Painel de desenvolvimento em F10 (mapas, itens, hora, dia, clima, vida, dinheiro, exportação do save, FPS/objetos/texturas), disponível somente em build de desenvolvimento.

## Architecture
`src/game/InputRouter.ts` é o dono do estado de entrada: teclas físicas, ações, atalhos persistidos, captura de remapeamento e leitura do gamepad. O ciclo do jogo chama `atualizarPad()` em PRE_STEP e `fimQuadro()` em POST_STEP, então cena nenhuma cria `addKey` próprio para as ações remapeáveis. FarmScene, UIScene, ComputadorScene e MenuScene consultam o roteador; as setas, Enter e Esc continuam fixas para o foco dos menus não depender de configuração. `blur` e troca de aba limpam as teclas presas.

## Gameplay
Teclas duplicadas, fora do conjunto aceito ou reservadas (C, J, X, O) são recusadas com aviso, sem alterar o mapeamento. Movimento pelo teclado remapeado e pelas setas coexistem. Com arma na mão o analógico direito assume a mira e RT atira; sem gamepad ativo o ponteiro continua no comando. O prompt de interação e os rodapés de inventário e loja mostram a tecla realmente configurada.

## UI/Art
Página de controles lista ação, tecla atual e a linha de restauração, no mesmo painel de papel/borda das outras telas do menu. Rodapés passaram a citar setas/Enter em vez de W/S/E fixos. Títulos das páginas de desenvolvimento ficam dentro do guarda de DEV, para o bundle de produção não carregar nem o vocabulário dessas telas.

## Save Compatibility
Atalhos vivem em `localStorage["meu-jogo:controls"]`, fora do save do jogo: nenhuma versão de save mudou nesta etapa. Configuração inválida ou incompleta é descartada em favor dos padrões, sem erro no boot. O save só é tocado pela exportação do painel de desenvolvimento, que salva antes de gerar o JSON e cancela a exportação se o salvamento falhar.

## Bugs Fixed
Menus abertos por gamepad não confirmavam a própria abertura: cada cena passou a ignorar a entrada do controle por 180 ms após `create`. Captura de tecla pendente é cancelada no shutdown da cena de menu. Esc no inventário fecha o inventário em vez de não fazer nada. A mira aceita um ponto sintético do analógico, sem depender de um `Pointer` real.

## Tests
Doze validadores de domínio passaram (`npm run verificar-tudo`). Navegador: `test:controles-browser` (persistência do remapeamento, tecla antiga inativa, tecla nova movendo, keyup parando, pausa/inventário/DevOS pelo gamepad), `test:dev-browser` (F10, evento de dia, paginação e viagem de mapa, concessão de item) e `test:producao`. Regressão dos 77 mapas, cotidiano, rural, serviços e save/migração passaram com console sem erros. Evidências em `docs/evidence/controles-*.json`, `dev-browser.json` e `producao-browser.json`.

## Production Validation
`npm run test:producao` roda contra o `dist/` servido por `vite preview` e cobre as duas frentes do fechamento: o bundle não contém os termos nem os atalhos de desenvolvimento (`Desenvolvimento`, `dev_mapas`, `dev_itens`, `keydown-F10`, `keydown-F6`, `window.estado`) mas mantém o remapeamento; e na tela não há `window.game`/`window.estado`, F1–F10 não abrem painel algum nem tocam no save, o remapeamento feito pela interface de produção persiste, a tecla antiga fica inativa e a nova vale desde o boot depois de recarregar. A prova de tela usa diferença média de pixels do canvas, calibrada entre o mundo parado e o mapa da cidade aberto.

## Performance
O roteador guarda conjuntos de teclas e faz uma leitura de gamepad por quadro; nenhuma cena registra listeners por ação. Bundle de produção em 1.641,58 kB (gzip 462,93 kB) — o aviso de tamanho continua pendente para a etapa de distribuição.

## Known Remaining Work
Esta etapa fecha controles e modo de desenvolvimento, não o overhaul. Seguem pendentes: áudio (sons, ambientes e volumes), remap autoral de cidade/interiores/represa, ampliação social e de calendário, padronização final de interfaces e DevOS, casa/economia/combate, performance e acessibilidade, e a validação final de progressão completa com saves antigos.

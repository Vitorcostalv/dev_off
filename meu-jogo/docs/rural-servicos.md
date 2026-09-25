# Atividades rurais e serviços urbanos

## Implemented
Três canteiros persistentes com tomate, cenoura e milho; estações permitidas, rega, chuva, maturação, limpeza de cultivo seco, colheita e venda. Quatro pontos de materiais renováveis a cada dois dias. Bancada preserva mobiliário e acrescenta fabricação de lanterna. Obras concluídas oferecem saúde, comércio e transporte.

## Architecture
AtividadesRurais pertence ao estado e recebe a virada do dia pelo barramento. A cena integra pontos, menus e apresentação. Crescimento tem limite de iterações para datas corrompidas/extremas. Horários urbanos usam TURNO_CIDADE, sem outra agenda paralela.

## Gameplay
Sementes são debitadas ao plantar. Inventário cheio impede colher/coletar. Venda paga 60% do preço de varejo. Materiais de fabricação são restaurados se o produto não couber. Hospital custa R$15; ônibus R$5 e 30 minutos. Serviços precisam de funcionário. Alimentos selecionados recuperam pouca vida; smartwatch equipado aumenta movimento em 5%.

## UI/Art
Canteiros mostram sulcos, água, brotos e produto maduro; materiais reutilizam o atlas existente. Menus exibem custo, duração e estoque para venda. Bancada mantém acesso ao catálogo de móveis.

## Save Compatibility
Campo rural aditivo na versão 7, normalizado na migração e restaurado pelo Boot. Sementes, crescimento, rega e última coleta sobrevivem ao reload. Consulta e venda salvam imediatamente; transporte salva débito e chegada.

## Bugs Fixed
Falha de download de um andar deixa de causar reinício contínuo. Loader tem timeout de 15 segundos e oferece tentar novamente ou retornar para casa, preservando progresso. Coordenadas de interação usam o tamanho real dos tiles.

## Tests
Doze validadores passaram. Navegador verificou sete pontos livres de colisão de tiles, menu rural, crescimento por eventos, save/reload e colheita; consulta paga, catálogo da padaria, ônibus e recuperação de mapa indisponível. Regressão dos 77 mapas/sete apps passou com console sem erros. Evidências em docs/evidence/rural-* e servicos-browser.json.

## Performance
Crescimento limitado a um ano por canteiro; sem geração de recursos por frame. Visuais rurais mudam em ações/virada de dia. Bundle ainda apresenta o aviso de tamanho que será tratado na etapa de distribuição.

## Known Remaining Work
Esta etapa não encerra o overhaul. Permanecem remap autoral completo, roteador/remapeamento de controles, áudio, painel de desenvolvimento, aprofundamento social e de calendário, revisão completa do DevOS/combate e critérios finais de acessibilidade/performance. As atividades rurais têm três cultivos e uma receita; coleta usa ferramentas compartilhadas do posto.

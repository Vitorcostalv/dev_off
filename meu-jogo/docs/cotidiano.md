# Etapa: eventos, progressão e tempo

## Implemented
Barramento tipado ligado a compras, inventário, trabalhos, conversas, relógio, limpeza da lixeira e minijogos. Dez conquistas funcionais e persistentes. Calendário de quatro estações/28 dias, clima determinístico persistido, luz gradual e efeitos limitados à viewport. Título, pausa, calendário, diário, estatísticas e opções.

## Architecture
GameEventBus e Progressao pertencem ao estado da sessão. Callbacks de domínio não são acionados por restauração. Clima é derivado de seed/dia/estação com override persistido. Preferências independentes do save. AmbienteMundo concentra os efeitos de apresentação.

## Gameplay
Conquistas desbloqueiam por ações reais; a primeira compra foi exercitada no mercado no navegador. Calendário preserva dias semanais anteriores. Tempo ajustável entre 0,5x/1x/2x. Diário apresenta somente missões iniciadas/concluídas. Limpeza de histórico da lixeira exige segunda confirmação.

## UI/Art
Menus com teclado, clique e navegação digital de gamepad. HUD com data/estação/ano/clima. Vegetação recebe variação de estação; chuva, neblina, vento e transição de luz não alteram colisões. Capturas `cotidiano-*.png`.

## Save Compatibility
Campos aditivos progressao/clima na v7, com normalização para saves anteriores. Datas de conquistas persistem. Configurações ficam em chave separada. Save/reload de outono chuvoso verificado.

## Bugs Fixed
Conquistas anteriormente sempre bloqueadas agora têm fontes de eventos. Lixeira agora pode ser esvaziada explicitamente. Não foram alterados fatos narrativos.

## Tests
Onze validadores e TypeScript/build passaram. Testes de 500 dias e dez conquistas. Navegador: título, pausa, calendário, opções persistidas, compra real desbloqueando conquista, clima/save/reload. Regressão dos 77 mapas e sete apps exercitada novamente. Evidências nos JSONs da etapa.

## Performance
JS 1.626,60 kB; gzip 457,78 kB antes das otimizações de payload. Partículas limitadas por qualidade; tint de vegetação só muda na transição de estação. Aviso de bundle permanece.

## Known Remaining Work
Eventos cobrem fluxos já conectados, não todos os domínios previstos. Gamepad de menus não equivale a suporte completo de gameplay/DevOS. Ainda faltam remapeamento, som, extensão de atividades do mundo, serviços urbanos, remap e polimento completo da represa. Calendário ainda não adiciona aniversários ou festivais autorais.

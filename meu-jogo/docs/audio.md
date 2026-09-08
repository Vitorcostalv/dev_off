# Áudio: efeitos, ambientes, trilhas e volumes

## Implemented
O jogo tinha zero áudio. Agora tem 46 sons: 26 efeitos de mundo e combate, 7 de interface, 9 ambientes em ciclo e 4 trilhas. Ambiente e trilha respondem a mapa, hora, clima e profundidade da represa; passos respondem à superfície; interface, compra, trabalho, conquista, conserto, computador, porta, coleta, elevador, tiro, recarga, golpe, dano e morte têm som próprio. Cinco volumes independentes (geral, música, ambiente, efeitos, interface) na tela Opções > Som e volume, com barra em texto e porcentagem.

## Architecture
`src/game/audio.ts` é o dono do catálogo e das regras: barramentos, ganho por som, variação de tom, intervalo mínimo, `volumeFinal`, `ambienteDoLugar`, `trilhaDoLugar` e `pisoDoMapa`. Nada de Phaser, então tudo isso entra em teste de nó. `src/scenes/Som.ts` é o tocador: vive no jogo e não numa cena, porque a FarmScene reinicia a cada troca de mapa e ambiente/trilha não podem recomeçar em cada porta. `main.ts` liga o tocador e chama `atualizar(delta)` por quadro — as transições entre camadas são feitas ali, sem depender do gerenciador de tweens de cena alguma. Sons de evento (compra, trabalho concluído, conquista, minigame) são assinados no barramento de eventos: quem emite não sabe que existe áudio.

## Assets
`tools/gerar-audio.mjs` sintetiza os WAV (mono, 22.050 Hz, 16 bits) do mesmo modo que `gerar-assets.mjs` gera tileset e atlas: nenhum binário sem a receita que o produziu. São osciladores, ruído determinístico por semente, filtros de um polo e corda pinçada (Karplus-Strong). Ambientes e trilhas são ciclos costurados — os últimos 0,5 s entram na cabeça com crossfade. O gerador recusa rodar se catálogo e receitas divergirem. Total de 7,52 MB para os 46 arquivos.

A identidade sonora acompanha a visual: centro com vento morno e pássaros, bairro mais quieto, rural com grilos, interior com zumbido baixo, represa com drone grave e pingos ressonantes, e o andar 26 em diante trocando o drone por um mais grave com rangido metálico lento. As trilhas seguem o mesmo contraste: cidade em escala maior, bar mais solto, represa em intervalos de segunda e trítono, uma oitava abaixo.

## Gameplay
Passo sai no ritmo da caminhada (380 ms andando, 260 ms correndo) e muda com a superfície do mapa: metal na represa, madeira em casa e oficina, terra no rural, grama nos mapas abertos da cidade, concreto no resto. Efeitos repetidos têm variação de tom e intervalo mínimo, então nem passo nem bipe soam mecânicos. Ambiente e trilha são reavaliados a cada 500 ms. A represa ignora clima e hora — lá dentro não existe tempo. No aberto, chuva vence vento, que vence noite. Interiores usam ambiente próprio e ficam sem trilha, exceto o bar. À noite a cidade fica sem música.

## UI/Art
A tela de som mostra rótulo, porcentagem e barra `[####......]`: a informação nunca depende de cor. Setas laterais ajustam de 10 em 10, E percorre a escala, e o direcional do controle também ajusta. Ajustar efeitos ou interface toca uma prévia no próprio barramento; música e ambiente não precisam, porque as camadas em execução mudam de volume na hora. Sem áudio disponível no navegador, a tela avisa e continua guardando os valores.

## Save Compatibility
Volumes ficam nas preferências (`meu-jogo:settings`), não no save do jogo: nenhuma versão de save mudou. `master`, `efeitos` e `ambiente` já existiam; `musica` e `interface` são novos e um arquivo antigo recebe o padrão nos dois sem perder os três antigos nem `tempo`/`qualidade`. Valor fora da faixa, não numérico ou negativo é corrigido individualmente.

## Bugs Fixed
Dois defeitos do próprio gerador, achados pelos testes: `criarRuido(n)()` chamado dentro do laço de amostras recriava o gerador a cada amostra e devolvia uma constante — sete efeitos (entre eles gaveta, golpe, tiro e dano) eram um nível contínuo com envelope, não ruído. E a remoção de DC por passa-alta, aplicada depois da costura, desfazia o ciclo: o transiente inicial do filtro deixava um estalo audível no ponto de emenda dos ambientes tonais. Em ciclo a remoção passou a ser por média, que num sinal periódico é a mesma correção e não mexe na junção.

## Tests
`npm run verificar-audio`: 554 conferências — catálogo contra pasta, cabeçalho e formato de cada WAV, arquivo mudo, arquivo estourado, offset contínuo, ciclo que não fecha (o salto da costura é comparado à variação típica do próprio material, porque chuva pula por natureza e drone não), matriz de 15 lugares para ambiente e trilha, pisos, mistura dos três estágios de volume e migração das preferências. `npm run test:audio-browser`: 12 conferências no navegador — 46 sons no cache do boot, ambiente do bairro, centro de dia com ambiente e trilha simultâneos audíveis, troca por chuva, troca por noite com trilha em silêncio, interior, represa funda, efeito pontual entrando no mixer, master zero silenciando as camadas e persistindo, volume voltando a subir, barramento de música isolado do de ambiente e volumes salvos valendo desde o boot. As sete suítes de navegador anteriores e o build de produção seguem passando.

## Performance
Uma leitura de gamepad e uma atualização de camadas por quadro; a escolha de ambiente/trilha roda duas vezes por segundo, não a cada quadro. Efeitos usam o próprio `play` do gerenciador, que descarta o som ao terminar. O boot carrega os 46 arquivos (7,7 MB); medido localmente, o tempo até jogável ficou em 4,7 s, dentro da variação das medições anteriores (4,7–6,1 s). Carregamento sob demanda das trilhas continua em aberto para a etapa de desempenho.

## Known Remaining Work
Falta o que a etapa de desempenho vai tratar: adiar o carregamento das trilhas e ambientes fora do lugar atual. Faltam também sons de estações e de eventos sociais (que dependem das etapas de calendário e NPC), variantes por estação nos ambientes externos e mixagem posicional (hoje o som não tem posição no mundo).

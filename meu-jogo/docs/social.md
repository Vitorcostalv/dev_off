# NPCs e calendário: clima, estação e encontros

## Implemented
O jogo tinha calendário completo (quatro estações de 28 dias, ano, clima determinístico por dia com oito estados) desde a etapa do cotidiano, e a rotina dos 33 moradores não consultava nenhum dos dois. Chovia e todo mundo continuava passeando na avenida; era inverno às sete da noite e a praça seguia cheia; e nenhum dia da semana era diferente do outro para ninguém.

Agora existem três camadas, aplicadas nesta ordem sobre a rotina do dia:

1. **Estação** — verão empurra a atividade ao ar livre do meio do dia para depois das 16h; inverno tira a que começa depois das 17h (escurece cedo);
2. **Clima** — chuva e temporal recolhem quem está na rua para o abrigo (o ponto dentro da própria casa). Os 17 moradores na rua do bairro às 15:00 viram 3 num dia de chuva;
3. **Encontro** — três encontros no calendário: sábado à noite no bar, domingo de manhã na praça e a feira da estação no dia 14 de cada estação. O encontro vence as duas camadas anteriores — a noite de sábado acontece com chuva, e é por causa dela.

O quadro de avisos da praça anuncia o encontro do dia, e é o único recado dele que muda de um dia para o outro.

## Architecture
`src/game/rotinaSocial.ts` é puro: recebe a rotina, devolve a rotina ajustada, sem Phaser e sem estado global. É por isso que a conferência offline consegue rodar as 4 estações × 8 climas × 7 dias da semana para os 33 NPCs — 29.568 rotinas — sem abrir o jogo.

A ligação fica em `estado.ts`, no `definirSubstituicaoDeRotina` que já existia para o emprego das obras urbanas. Agora aquele trecho declara a ordem das três fontes: emprego troca o compromisso do meio do dia, calendário e clima ajustam o que sobrou, e o encontro do dia junta os participantes. Nenhum dos módulos importa o outro — `rotinasNpc.ts` importar `cidade.ts` fecharia um ciclo, e a mesma razão vale para o novo.

O abrigo de cada NPC não é coordenada nova: sai de `posicaoInicial`/`dentroInicial`, que a conferência de rotinas já valida tile por tile. As vagas dos encontros saem do calçamento das praças de esquina do remap do centro e do salão do bar.

## Gameplay
O que nenhuma camada faz: mexer em posto de trabalho, em turno de obra urbana ou em quem já está dentro de construção. Turno é turno, e a missão pessoal que depende de achar alguém no trabalho continua valendo — a conferência compara a contagem de `posto_interior` antes e depois do ajuste, em todas as 29.568 rotinas.

Quem trabalha ao ar livre não se recolhe: a atividade externa da zona rural é a roça do João e da Neide e o pátio da madeireira do Bruno, e trabalho de roça não para por chuva. Sem essa exceção a cidade inteira ficava vazia num dia de chuva a cada quatro, e o mundo parecia morto em vez de chuvoso.

Participação em encontro sai do perfil do morador (`vida.favoritos`): quem tem 'bar' entre os favoritos vai ao sábado, quem tem 'praça' vai ao domingo, quem tem 'mercado' vai à feira. São seis vagas por encontro, uma por pessoa — encontro não empilha gente no mesmo tile. Na prática: sete pessoas no bar no sábado às 20:00 contra uma na quarta, e quatro na praça no domingo de manhã.

## Save Compatibility
Nenhuma versão de save mudou. A rotina do dia é escolhida na virada, a partir do dia e do clima daquele dia — ambos já persistidos. Um save antigo abre e no dia seguinte já reage ao clima.

## Bugs Fixed
Um bug de teste que valia por bug de produto: a primeira versão da conferência de navegador tirava dois retratos do MESMO dia com climas diferentes e comparava. O motor escolhe a rotina uma vez por dia, na virada, então o segundo retrato saía com a rotina do primeiro — e o teste passaria por engano se a diferença fosse pequena. Passou a usar dois dias diferentes da mesma quarta-feira (2 e 9), o que força a virada e mede o que se quer medir.

## Tests
`npm run verificar-social`: 29.605 conferências. A matriz inteira — 4 estações × 28 dias × 8 climas × 33 NPCs — e em cada rotina: todo `assumir_lugar` em tile livre no mapa ou interior que a ação declara, nenhuma troca de lugar ao ar livre seguida de outra no mesmo mapa (seria teleporte na frente do jogador), nenhum NPC sem ação no dia, contagem de posto de trabalho intacta, uma vaga própria por participante de encontro e ninguém com abrigo na rua em dia de chuva. Resultado: 6.208 recolhimentos por chuva e 1.344 presenças em encontro no ano.

`npm run test:social-browser`: cinco conferências no jogo — 17 pessoas na rua com tempo limpo contra 3 com chuva, sete no bar no sábado contra uma na quarta, quatro na praça no domingo e o quadro anunciando o encontro do dia. Evidência em `docs/evidence/social-*.png` e `social-browser.json`.

Regressão: 17 validadores de domínio (incluindo o de rotinas, que continua rodando as rotinas base), as suítes de navegador e o build de produção passaram.

## Performance
O ajuste roda uma vez por NPC por dia, na virada — 33 chamadas por dia de jogo, cada uma sobre uma lista de menos de vinte ações. Nada por quadro.

## Known Remaining Work
As reações são de POSIÇÃO. Faltam: diálogo que muda com o clima e com a estação (hoje a fala é a mesma na chuva e no sol), presente e afinidade reagindo à estação, encontro com conteúdo próprio além da presença (música no bar, barraca na feira), evento de estação com efeito mecânico (a feira não vende nada ainda) e reação de clima para os quatro NPCs da zona rural além de continuarem trabalhando. Nenhuma das três camadas mexe nas cinco encontros roteirizados de NPC que já existiam.

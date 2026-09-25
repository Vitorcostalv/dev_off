# Remap do centro (Mapa 1)

## Implemented
O centro tinha malha de rua e lote, e mais nada: entre o anel e as fachadas sobravam quadrantes inteiros de grama vazia, e nenhuma rua tinha borda. Agora tem calçada nas duas margens de toda via (dupla nas avenidas, simples no anel), travessia calçada onde um acesso cruza a rua, caminho de acesso de cada um dos dez lotes até a calçada mais próxima, quatro praças de esquina no cruzamento central, vielas de terra batida fechando volta atrás do comércio e das casas do norte, sete pátios com função (terraço do bar, apron de carga do mercado, entradas de farmácia e academia, mirante do lago, bosque de piquenique, pátio de serviço cercado) e 71 peças de mobiliário urbano, das quais 25 acendem à noite. As quatro pontas de avenida ganharam placa dizendo para onde vão.

## Architecture
Tudo em tabelas de dados no início de `tools/gerar-assets.mjs`, na mesma linguagem que o mapa já usava (`VIAS`, `ZONAS`, `CONSTRUCOES`): `LARGURA_DE_CALCADA`, `PRACAS_DO_CRUZAMENTO`, `ACESSOS_DE_LOTE`, `TRAVESSIAS`, `PATIOS`, `VIELAS`, `CERCA_PATIO_SERVICO`, `RALOS`, `MOBILIARIO_URBANO` e `PLACAS_DO_CENTRO`. Mover uma praça é mudar um retângulo. O mobiliário é lista à mão, e não sorteio, pelo mesmo motivo que o do parque já era: praça sorteada sai como entulho. A flora continua sorteada e passou a respeitar tudo que o remap desenhou (`areasSemFloraDoCentro`).

`conferirCentro()` roda na geração, antes de escrever o mapa, e reprova alto: calçamento sobre pegada de construção, móvel na frente de porta (que é âncora de rotina de NPC), móvel no respiro do spawn, móvel no meio da via e acesso que não encosta em calçada nem passa pela frente da própria porta.

## Gameplay
O que muda para quem joga: dá para ir da praça até qualquer porta andando por piso, e não cortando gramado. A arte de fachada é elevação frontal e toda porta olha para o sul, então mercado, farmácia, academia e bar dão as costas para a avenida — o acesso de cada um desce (ou sobe) até a rua que realmente serve aquela porta, e é essa volta que não existia. As avenidas ganharam calçada dupla por uma razão mecânica, não estética: o corpo de colisão de um móvel sobe meio sprite acima da base, então um poste de 3,5 tiles ocupa quase duas linhas e, com faixa única, fechava a passagem e empurrava pedestre — e NPC — para dentro da rua.

## UI/Art
Hierarquia de piso em três níveis: calçamento nas avenidas e praças, terra batida nas vielas e entradas de casa, brita nos pátios de serviço e no bosque. O quadro de avisos deixou de ser dois retângulos desenhados à mão no meio do gramado do parque e passou a ser o quiosque de verdade da praça noroeste. As peças vêm todas da folha `Estuturas_parque_v1.png`, que já estava no projeto e só era usada pelo parque: banco, poste de braço, poste alto, balizador, luminária de globo, lixeira, bicicletário, jardineira, canteiro, bebedouro, mesa com guarda-sol, mesa de piquenique, coreto, arbusto, pedra e toco.

## Bugs Fixed
Quatro, todos apontados pelas conferências e não por leitura:

- a marca `luz` das peças de iluminação não chegava ao tilemap: `objetosDeMovel` montava as propriedades à mão e a descartava em silêncio;
- o halo noturno ficava **embaixo** do véu da noite (depth 850000) e era escurecido junto com o resto — a luz do poste praticamente desaparecia. Subiu para 850002 e ganhou queda de intensidade em quatro anéis concêntricos, em vez de um disco de alfa única;
- o bicicletário (4 tiles de largura) ficava plantado em cima da faixa de acesso do mercado, e a cerca do pátio de serviço atravessava a da farmácia. O piso mostrava caminho e o corpo do móvel o fechava; virou regra no validador;
- a arte da brita é um hachurado diagonal: em área lê como brita, mas em faixa de um tile lê como barreira listrada. As vielas passaram a terra batida.

Além disso, o bebedouro da academia e uma luminária do apron encostavam na linha por onde Mari e Jaqueline andam — o validador de rotinas reprovou e as duas peças mudaram de lugar.

## Save Compatibility
Nenhuma versão de save mudou: o remap é geometria de tilemap e mobiliário de cenário. Nenhum lote mudou de posição, nenhuma porta mudou de tile e nenhum interior foi tocado, então save antigo abre no mesmo lugar. O único ponto de interação que mudou de lugar é o quadro de avisos, que não tem estado salvo.

## Tests
`npm run verificar-centro`: 209 conferências no mapa que o gerador escreveu — flood-fill do spawn cobrindo 9.173 tiles e alcançando a frente das nove portas e as treze áreas de estar, calçada de avenida com passagem livre de ponta a ponta nas quatro faixas, acesso de comércio livre da rua até a porta nas quatro faixas, placa com verbete em `ITENS_DE_LEITURA`, 71 peças de mobiliário (25 com luz) apontando para o atlas certo e a base de densidade (3.075 tiles de piso, 7.725 de área verde). `npm run test:centro-browser`: 5 conferências no navegador — 79 peças na cena, 25 halos vindos dos postes, poste apagado de dia e aceso de noite acima do véu, quadro de avisos abrindo com texto, placa do cruzamento com texto próprio e uma caminhada real de 13,2 tiles pelo acesso do mercado até parar na porta. Evidência em `docs/evidence/centro-*.png` e `centro-browser.json`.

Regressão: 14 validadores de domínio, as sete suítes de navegador anteriores (77 mapas, cotidiano, rural, serviços, save/migração, controles, dev, áudio) e o build de produção passaram, console sem erro nem aviso.

## Performance
O remap não acrescenta trabalho por quadro: é tilemap e sprite estático. O mapa 1 ganhou 71 objetos de móvel e 3.075 tiles de piso; a flora caiu de 290 para 281 árvores porque agora respeita o calçamento. Bundle em 1.650,27 kB (gzip 466,05 kB). Os halos noturnos passaram de 7 fixos para 25 vindos dos postes — são `Graphics` criados uma vez por carga de mapa, com quatro círculos cada.

## Known Remaining Work
Esta etapa fecha o centro, não o remap. Seguem pendentes: bairro, zona rural e acesso da represa (os outros três mapas externos), os 23 interiores urbanos e a remasterização dos 50 andares da usina. O centro ainda não tem variação por estação no piso nem poça de chuva, que dependem da etapa de estações; o pátio de serviço e o bosque são cenário, sem mecânica própria.

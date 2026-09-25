# Remap da zona rural (Mapa 3)

## Implemented
As três portas deste mapa eram **ilhas**. A casa do João, da Neide e da Priscila fica vinte tiles a oeste da estrada; a do Bruno, doze ao norte do ramal; o balcão da madeireira, sete. Entre a porta e a estrada havia mato e mais nada — chegar em qualquer uma era cortar gramado na diagonal, porque não havia por onde mais, e o mapa não dizia por onde.

Agora cada porta tem **serventia** até a estrada, cada moradia tem **terreiro**, a madeireira tem **pátio de carga**, as duas fazendas têm **eira**, a pedreira tem pátio, e há 22 peças de mobiliário de roça. Quatro placas dizem para onde vai cada saída e cada ramal.

## Architecture
Uma linha nova em `REMAPS`, e nada mais: a maquinaria genérica que o remap do bairro exigiu já servia. A diferença é o que a linha **não** tem.

O centro e o bairro ganharam calçada. A zona rural **não ganha**, e isso não é economia: estrada de terra no meio da roça não tem meio-fio, e num tile de cascalho de cada lado a arte lê como barreira listrada — foi exatamente o que tirou o cascalho das vielas do centro. O que falta aqui é outra coisa, e é o caminho da porta até a estrada.

Isso obrigou uma generalização a mais na conferência: `conferirRemap` cobra que todo acesso encoste em calçada, e num mapa sem calçada ele passou a cobrar contra a **faixa da própria estrada**. Uma serventia de roça chega na estrada, não num meio-fio que não existe.

E um erro que valeu registro: `calcadasDasVias` decidia "via curva não tem calçada retangular" pelo campo `calcadaPoli`. A zona rural tem via curva **e** `calcadaPoli` zero, então ela caía no caminho retangular, e `faixaDaVia` devolvia `NaN` em silêncio sobre uma polilinha — e retângulo `NaN` não encosta em nada, o que reprovava todo acesso do mapa com a mensagem errada. A decisão passou a sair da forma da via (`pontos` contra `x/y/w/h`), que é onde ela sempre esteve.

## Gameplay
Dá para chegar na madeireira, na casa do João e na do Bruno andando por chão batido, e o chão batido mostra o caminho de longe. A madeireira é o balcão de material — o mesmo que vende madeira, pedra e concreto para a casa e, desde a leva das obras, para as obras municipais — e ela agora tem pátio de carga com mourão, toco e pedra, em vez de um balcão plantado no mato.

## UI/Art
Mobiliário de roça, não de praça: mourão com corda, bebedouro de pedra, toco, pedra solta e arbusto. Nada de banco de jardim nem bicicletário.

**Os dois únicos postes do mapa ficam nas duas moradias.** A roça não tem iluminação pública, e uma luz acendendo no terreiro de cada casa é o que marca, à noite e de longe, que ali mora gente. É a única leitura noturna que o mapa tem, e ela é conferida: duas luzes às 23h, zero ao meio-dia — não "pelo menos duas".

## Save Compatibility
Nenhuma versão de save mudou, e nada de estado novo é persistido. É geometria de tilemap e cenário: nenhum lote mudou de posição, nenhuma porta mudou de tile.

## Bugs Fixed
Dois, os dois apontados por conferência:

- o `NaN` silencioso de `calcadasDasVias` descrito acima;
- o poste do terreiro da casa do João ficava **em cima da serventia** — a única faixa de um tile que liga aquela porta à estrada. O validador de mapa reprovou com o ponto fechado no texto, e o poste desceu uma linha. É o mesmo achado do poste do pátio da escola no bairro, e do bebedouro da academia no centro: peça alta plantada em caminho estreito, três vezes, três mapas.

E um terceiro, de teste, que essa leva escancarou: o percurso dos 77 mapas de `test:browser` esperava `pronto` **sem derrubar o `pronto` da cena velha**, e com a folha de NPC sob demanda a cena passou a reiniciar até três vezes por entrada (tilemap, atlas de móvel, folha de NPC). A espera enxergava a cena anterior e seguia adiante; uma rodada em três falhava com "77 mapas esperados". Agora ela derruba o `pronto` na mão antes do restart e cobra também o carregador ocioso — e a checagem do João passou a esperar o sprite dele existir, porque com carga sob demanda ele pode nascer `null`.

## Tests
`npm run verificar-zona-rural`: **79 conferências** no mapa que o gerador escreveu. Flood-fill do spawn cobrindo 16.244 tiles e chegando nas três portas; as três serventias livres de ponta a ponta; seis áreas de trabalho com chão sobrando e 100% alcançável; quatro placas com verbete; 22 peças apontando para o atlas certo; e a base de densidade (2.080 tiles de piso num mapa de 18.000, que continua sendo o mais vazio do jogo — é o que ele deve ser).

(O `verificar-rural` que já existia é outra coisa: ele confere a **mecânica** da roça — plantio, coleta, fabricação.)

`npm run test:rural-browser` ganhou duas conferências: as 22 peças na cena com `moveis_parque` vindo sob demanda, e as duas luzes acendendo às 23h e apagadas ao meio-dia. Evidência em `docs/evidence/rural-terreiro.png`.

Regressão: 22 validadores de domínio e as suítes de navegador, com o percurso dos 77 mapas rodado **três vezes** para provar que a espera endurecida não falha mais.

## Performance
Nada por quadro. O mapa ganhou 240 tiles de piso, 22 objetos de móvel e dois halos. A zona rural passou a ter camada `moveis`, então entrar nela pede `moveis_parque` — que a esta altura já está em cache, porque o jogo abre no bairro, que usa a mesma folha.

## Known Remaining Work
- **o acesso da represa (Mapa 4) continua com o mapa antigo.** É o último dos quatro externos;
- **as três conferências de mapa são o mesmo código três vezes.** `verificar-centro`, `verificar-bairro` e `verificar-zona-rural` compartilham umas cem linhas de construção de colisão e flood-fill, copiadas. Extrair isso é uma etapa de arrumação, e ela só vale a pena depois que o quarto mapa entrar;
- **as duas fazendas e a pedreira continuam cenário.** A eira e o pátio existem, e o que se faz neles é nada: o plantio do jogador é nos três canteiros, e a pedreira não tem mineração;
- **não há cerca dividindo propriedade.** O mapa tem lote demarcado e nada no chão que diga onde um termina e o outro começa. Cerca é tile de colisão, e pôr uma sem medir as rotas de quatro moradores é como plantar poste em serventia — a mesma coisa que deu errado três vezes nesta etapa.

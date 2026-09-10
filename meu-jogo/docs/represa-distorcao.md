# Represa: a distorção progressiva por capítulo

## Implemented
A usina tinha cinco capítulos de narrativa e um só vocabulário de cenário. A escuridão crescia (0 no andar 1 a 0,86 no 50), a fauna mudava por faixa, a tensão acelerava — mas os seis catálogos de móvel eram industriais nos cinquenta andares, e um andar do capítulo 5 era mobiliado igual a um do capítulo 1. A progressão psicológica estava toda no texto das cinquenta fichas; o cenário não acompanhava.

Agora cada capítulo tem uma gramática própria de objeto:

| Capítulo | Andares | O que aparece |
| --- | --- | --- |
| 1 Rotina | 1–10 | nada. Arquitetura industrial plausível |
| 2 Pressão | 11–20 | nada de móvel. Água, dano e escuridão já estão na curva e nos módulos alagados |
| 3 Colapso | 21–30 | **repetição**: uma sala do andar recebe a mesma peça encostada de ponta a ponta (5 a 23 cópias) |
| 4 Negação | 31–40 | **escritório** onde não tem o que fazer: mesa com monitor, armário de aço, bebedouro, relógio de parede |
| 5 Reconhecimento | 41–50 | escritório **e casa**, sobrepostos: cama, sofá, mesa de jantar, televisão, tapete |

## Architecture
Uma tabela, `DISTORCAO_POR_CAPITULO` em `tools/andares-represa.mjs`, e duas passadas no construtor de planta que já existia: a de repetição entra no laço normal de mobília (a sala escolhida usa uma peça só, e sem o tile de folga que o resto usa), e a de intrusão vem depois, pondo peças no piso e não na prateleira da parede. Cada andar passou a declarar um retrato do que a distorção fez (`distorcao: { capitulo, modo, salaRepetida, intrusas }`), e é dele que a conferência lê em vez de tentar adivinhar pelo nome das peças.

As onze peças de intrusão entram em `CATALOGO_POR_COMODO` na categoria `comum`, porque cômodo de represa aceita `oficina` e `comum` e uma cama não é peça de oficina. O prefixo `intrusa_` não é enfeite: `verificar-distorcao` reprova qualquer planta urbana que cite uma peça `intrusa_*`, e é isso que impede a cama do andar 47 de vazar para dentro de uma casa da cidade.

## Story Lock
Nada de narrativa mudou. As cinquenta fichas continuam nos mesmos andares com o mesmo texto, os 52 painéis de enigma com a mesma lógica e a mesma ordem de revelação, as onze paradas de elevador nos mesmos andares, os 193 inimigos nas mesmas regras de nascimento e os cinco capítulos com os mesmos limites. A distorção é composição de cenário: ela reforça o que as fichas já dizem, na ordem em que elas dizem.

## Gameplay
A intrusão vai no piso, no meio do cômodo, e não encostada na parede — mesa de escritório na parede passa por mobília de usina; no meio da câmara de turbina não passa. As peças colidem (menos o tapete e o relógio), então elas mudam a leitura do espaço e também a rota: um sofá no meio de um corredor de manutenção é obstáculo, não só imagem. A escolha é determinística pelo mesmo `dado` do resto do arquivo — o andar 37 tem sempre as mesmas intrusas, nas mesmas salas, em toda máquina e em todo reload.

## UI/Art
Todas as peças vêm de `Mobilia_v2` e `Utensilios_academia`, folhas que já estavam no projeto. Nenhuma arte nova: a estranheza vem do contexto, não de um asset especial — que é exatamente o efeito buscado, porque uma cama comum numa casa de bombas incomoda mais do que uma cama desenhada como "assustadora".

## Save Compatibility
Nenhuma versão de save mudou. Mobília de andar é cenário de tilemap; flags de enigma, fichas recolhidas, progresso de elevador e andar mais fundo alcançado não foram tocados.

## Bugs Fixed
Dois problemas de método, encontrados pela medição e não pela leitura:

- a régua errada. A primeira conferência da repetição contava **cópias** da mesma peça por andar, e reprovou: os capítulos 1 e 2 já chegam a dez cópias de uma peça (os catálogos têm seis nomes e as salas são largas). O que a repetição do capítulo 3 faz é **encostar** as peças, e a régua passou a ser a maior fileira encostada — nos capítulos limpos ela é 1, no capítulo 3 vai de 5 a 23;
- a repetição não acontecia em três dos dez andares do capítulo, porque a sala sorteada podia ser uma sem catálogo de mobília (sai vazia) ou estreita demais para caber duas peças. A escolha passou a ser entre salas com catálogo e ao menos seis tiles de largura.

## Tests
`npm run verificar-distorcao`: 141 conferências nos 45 andares compostos — capítulos 1 e 2 sem nenhuma peça de intrusão, capítulos 1, 2 e 4 sem fileira encostada, todo andar do capítulo 3 com fileira de quatro ou mais peças idênticas, capítulo 4 com escritório em pelo menos 60% dos andares e casa em nenhum, capítulo 5 com casa em pelo menos metade e mais intrusas que o 4, nenhuma planta urbana citando peça de intrusão e determinismo de leitura. `npm run test:represa-browser`: um andar de cada capítulo aberto no jogo (8, 25, 36, 47), com a contagem do que entra na cena e captura de evidência — o validador de nó confere o arquivo, este confere o que o jogador vê.

Regressão: 16 validadores de domínio, as suítes de navegador (77 mapas, centro, interiores) e o build de produção passaram, console sem erro nem aviso.

## Performance
Quarenta e seis peças de móvel a mais nos cinquenta andares (1.170 → 1.216), todas sprites estáticos posicionados na carga do andar. Os andares 6 a 50 continuam carregando sob demanda.

## Known Remaining Work
A distorção é de OBJETO. Faltam as outras alavancas que o capítulo pediria: geometria sutilmente errada (sala que não fecha, corredor que volta ao mesmo lugar), som próprio por capítulo além do drone mais grave do andar 26, falha de luminária no capítulo 2 e variedade de template — os doze templates atuais se repetem entre capítulos, e um andar do capítulo 5 ainda tem a mesma planta de um do capítulo 1.

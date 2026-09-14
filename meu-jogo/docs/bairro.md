# Remap do bairro (Mapa 2)

## Implemented
O bairro tinha rua e lote e mais nada. A rua principal descia torta pelo meio do gramado **sem borda nenhuma**, nenhuma das doze portas tinha caminho até ela, o condomínio fechado era grama pelada com duas casas soltas dentro, e o "Bairro da Estação" não tinha estação nem largo — só o nome.

Agora tem calçada em toda via, treze acessos ligando porta a rua, dois largos ladeando a rua da estação, pátio na frente da escola e da biblioteca, apron na oficina do protagonista, recuo na quadra, jardim nos dois lados do condomínio, cabeceira calçada na ponte, cinco vielas de terra fechando volta, seis travessias e **38 peças de mobiliário urbano, nove delas acendendo à noite**. Quatro placas dizem onde cada saída dá.

## Architecture
A maquinaria do centro virou genérica antes de qualquer coisa nova entrar. As tabelas do remap do centro continuam onde estavam e passaram a ser a linha `farm` de uma tabela `REMAPS`; as seis funções que as liam (`areasDoRemap`, `conferirRemap`, `pavimentarRemap`, `moveisDoRemap`, `areasSemFloraDoRemap`, `calcadasDasVias`) deixaram de conhecer mapa nenhum e passaram a ler de lá. **A prova de que o refactor não mudou nada é o md5**: `farm.json` sai byte a byte idêntico ao de antes dele.

A diferença real entre os dois mapas está na geometria da via. O centro tem avenida reta, e por isso a calçada dele é retângulo. Aqui a rua é **polilinha dilatada**, e a calçada é um anel: o eixo dilatado por `RAIO_FAIXA + n` menos a própria faixa de terra (`anelDeCalcada`). O resultado em leitura é o mesmo — a rua ganha margem, e o que é passagem para de se confundir com o que é terreno.

Uma faixa só, e não duas como nas avenidas do centro. A razão é a mesma que lá levou a duas, invertida: com calçada estreita não se põe móvel alto nela sem fechar a passagem, então **no bairro móvel nenhum vai na calçada** — todo ele mora nos largos e nos pátios, que têm folga. A lição do centro chegou aqui de graça.

`conferirRemap('bairro')` roda na geração, antes de escrever o mapa, e reprova alto: calçamento sobre pegada de construção, móvel na frente de porta, móvel no meio da via, e acesso que não encosta em calçada nem passa pela frente da própria porta.

## Gameplay
O que muda para quem joga: dá para ir de qualquer porta até a rua andando por piso.

E uma mudança de verdade, não cosmética: **a rua do condomínio passou a entrar pelo portão**. Ela parava do lado de fora, e o miolo do condomínio era grama pelada com duas casas plantadas nela — as portas do Lucas e do Túlio davam para o mato, e chegar nelas era cortar gramado. Agora a rua atravessa o portão e vira a rua interna, com calçada dos dois lados e jardim entre as casas. Um condomínio fechado tem rua por dentro.

O polilinha dela ganhou uma dobra em vez de subir reto, e isso não é enfeite: os quatro lotes do condomínio ocupam até a coluna 103 e a partir da 107, e uma reta na coluna 104 fazia a faixa de terra invadir o lote da casa_c3. A dobra passa pelo portão em 104 e sobe em 105, entre os lotes. Quem reprovou a versão reta foi o gerador, não a leitura.

A casa_b7 fica espremida entre a rua baixa e o rio, e a porta dela olha para o rio. O acesso sai pela frente, contorna a casa pelo leste e sobe — mesma solução que as casas do sul do centro receberam, pelo mesmo motivo: a arte de fachada é elevação frontal e toda porta olha para o sul.

## UI/Art
Hierarquia de piso em três níveis, igual à do centro: calçamento nas vias, nos largos e no comércio; terra batida nas vielas e nas entradas de casa; cascalho nos jardins, no recuo da quadra e na cabeceira da ponte. As peças vêm todas de `Estuturas_parque_v1.png`, a mesma folha do parque e do centro.

O largo da estação é o único lugar do mapa com quadro de avisos, e ele responde uma pergunta que o bairro fazia havia muito tempo: o nome. A placa diz que a plataforma foi desmontada antes de o protagonista nascer e que o largo ficou. **Nenhuma das quatro placas conta história nova** — o bairro já se chamava assim em toda fala do jogo, e condomínio, ponte e quadra já estavam desenhados no mapa. O que faltava era o lugar dizer isso de si mesmo.

## Save Compatibility
Nenhuma versão de save mudou. O remap é geometria de tilemap e mobiliário de cenário: nenhum lote mudou de posição, nenhuma porta mudou de tile, nenhum interior foi tocado. Save antigo abre no mesmo lugar, agora com calçada embaixo.

## Bugs Fixed
Três, e as três apontadas por conferência, não por leitura:

- a viela dos fundos da escola atravessava a **pegada da biblioteca**. O gerador parou a geração com o tile no texto;
- a rua do condomínio, esticada em reta, punha faixa de terra **dentro do lote da casa_c3** — e depois dentro do da casa_c1. Foi o que levou à dobra;
- o poste do pátio da escola ficava em cima da linha por onde o **Matheus** passa o dia inteiro. `verificar-rotinas` reprovou com o tile e a hora, e o poste mudou de canto. É o mesmo tipo de achado que tirou o bebedouro da academia do lugar no remap do centro.

## Tests
`npm run verificar-bairro`: **153 conferências** no mapa que o gerador escreveu. Flood-fill do spawn cobrindo 13.135 tiles e alcançando a frente das doze portas e as nove áreas de estar; as duas casas de dentro do muro alcançáveis **pelo portão**; a ponte ainda passando; seis entradas de casa livres da porta até a rua; 38 peças apontando para o atlas certo; quatro placas com verbete em `ITENS_DE_LEITURA`; e a base de densidade (2.845 tiles de piso, onde antes havia rua e nada mais).

A conferência do condomínio existe porque ele é o único lugar do jogo cercado por muro com uma entrada só: se o portão fechar ou a rua não chegar nas portas, as duas casas ficam inacessíveis **e ninguém percebe até tentar visitar**.

`npm run test:bairro-browser`: cinco conferências no jogo de pé — 38 peças na cena com `moveis_parque` vindo sob demanda, nove halos acesos às 23h e zero ao meio-dia, a placa do largo abrindo com o texto dela, uma caminhada real de 5,2 tiles pelo pátio da escola, e a entrada de verdade na casa do Lucas pelo portão do condomínio. Evidência em `docs/evidence/bairro-*.png` e `bairro-browser.json`.

Regressão: 21 validadores de domínio (`verificar-tudo`) e as suítes de navegador, com atenção às que andam pelo bairro — social, cotidiano, progressão e os 77 mapas.

## Performance
O remap custou **3,06 MB no boot**, e vale dizer por quê em vez de esconder: o bairro passou a ter camada `moveis`, e é dela que a cena de mundo tira quais atlas pedir. Como o jogo abre no bairro, `moveis_parque` virou asset do primeiro quadro jogável. O boot foi de 19,86 para 22,51 MB.

Isso é a carga sob demanda funcionando, não falhando — as outras treze folhas continuam fora. A conferência de desempenho foi ajustada para cobrar o que passou a ser verdade: **no máximo uma folha de móvel no boot**, a do mapa em que o jogo abre. Antes ela cobrava zero, e cobrava com razão: o jogador começava numa rua que não usava folha nenhuma.

Nada muda por quadro: é tilemap e sprite estático. O bairro ganhou 2.845 tiles de piso, 38 objetos de móvel e nove halos noturnos, que são `Graphics` criados uma vez por carga de mapa.

## Known Remaining Work
- **a zona rural e o acesso da represa** continuam com o mapa antigo. São os dois últimos mapas externos, e a maquinaria genérica agora existe para os dois;
- **a folha `moveis_parque` tem peça de 490 px** para um móvel que na tela nunca passa de 118 px de altura. É a mesma conta que cortou `itens.png` pela metade, e as catorze folhas de móvel somam 35,79 MB. A correção é diferente da dos ícones: aqui o tamanho na tela sai da folha (`tamanhoDeMovel`), então reduzir os pixels exige compensar `escala` na mesma proporção — e o tilemap tem de sair idêntico depois;
- **o bairro não tem variação por estação no piso** nem poça de chuva, como o centro também não tem;
- **o terreno abandonado e a quadra esportiva continuam cenário**, sem mecânica própria;
- **os quatro lotes do condomínio são dois**: `casa_c3` e `casa_c4` seguem reservados, sem construção e sem morador. O jardim leste é grande porque ele ocupa o lugar de uma casa que não existe.

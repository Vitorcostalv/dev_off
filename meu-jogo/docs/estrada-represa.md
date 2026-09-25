# Remap da estrada da represa (Mapa 4)

## Implemented
Este é o menor dos quatro remaps, porque o mapa já tinha o que os outros três não tinham: dez placas, pátio de concreto entre a porta da casa de força e a estrada, mirante calçado e ramal até ele. O que ele **não** tinha era um único objeto de cenário — nem camada `moveis`. Onze mil e duzentos tiles de mata, estrada e água, e nada no chão além de árvore sorteada.

Agora tem três recuos (o do portão, a área de piquenique abandonada e o pátio do galpão) e **16 peças**, com **uma única lâmpada no mapa inteiro**.

## Architecture
Uma linha em `REMAPS` com três campos: `acessos`, `patios` e `mobiliario`. Sem calçada, pela mesma razão da zona rural — estrada de mata não tem meio-fio.

O acesso declarado é o pátio de concreto que já existia entre a porta da casa de força e a estrada. Ele não muda nada no desenho; o que muda é que agora ele passa pela conferência, e um remap futuro que o encurtasse seria reprovado na geração em vez de descoberto andando.

## Gameplay
Nada de mecânica nova. O que muda é a leitura da subida: antes ela tinha três marcos (a cerca caída, o canal, o portão) e todos eram tile de chão. Agora a área de piquenique tem mesa apodrecendo e mato crescendo por cima, o mirante tem guarda-corpo virado para o rio, e o portão tem onde parar.

## UI/Art
**Uma luz só no mapa inteiro, no portão da usina.** As três cidades têm iluminação pública; esta estrada não tem nenhuma, e a lâmpada acesa no portão de uma usina desativada diz mais sobre o lugar do que qualquer texto de placa. É a única peça com `luz` do mapa, e o validador cobra exatamente **uma** — não "pelo menos uma". Se aparecer uma segunda, alguém mobiliou sem ler o que o lugar é.

O resto do mobiliário é o que sobrou de um lugar que funcionou e parou: mourão de guarda-corpo, mesa de piquenique apodrecida, toco, pedra e arbusto tomando de volta.

## Save Compatibility
Nenhuma versão de save mudou e nada novo é persistido. É geometria de tilemap e cenário.

## Bugs Fixed
Um, e ele vale registro porque o validador o pegou e a leitura não pegaria: a camada de móveis da estrada foi **parar no bairro**. O trecho `camadaObjetos('bordas', 8, bordas),` aparece nos quatro geradores de mapa externo, e a substituição pegou o primeiro. O bairro ficou com duas camadas `moveis` (uma com as 16 peças da represa, outra com as 38 dele) e a estrada com nenhuma.

Isso não levanta erro: o jogo desenha as duas camadas e segue. Quem reprovou foi `verificar-bairro`, com "mobiliário urbano posto no mapa (0 peças)" — porque ele conta por prefixo de nome, e o prefixo errado não bate. E `verificar-rotinas` reprovou junto, porque uma das peças da represa caiu em cima do caminho da Júlia no bairro.

## Tests
`npm run verificar-estrada-represa`: **52 conferências**. (O `verificar-represa` que já existia é outra coisa: ele confere os cinquenta **andares** da usina.)

Três delas são as que importam, e nenhuma é sobre mobiliário:

- **o portão continua sendo a única entrada.** A cerca corre em y 40 de ponta a ponta com portão de três tiles, e o recuo de concreto novo encosta nela. A conferência varre as 75 colunas da cerca e cobra que nenhuma, fora as três do portão, seja atravessável a pé;
- **a água continua fechando o mapa.** Nenhum dos 1.400 tiles do reservatório pode ser alcançável a pé;
- **o flood-fill da boca da estrada chega na porta da casa de força**, subindo os 140 tiles.

Mais os três recuos e o mirante com chão sobrando e 100% alcançável, a lâmpada única, e a densidade (851 tiles de piso em 11.200 — o mapa continua sendo mata).

Regressão: 23 validadores de domínio, os 77 mapas, a suíte da represa, desempenho e progressão. Evidência em `docs/evidence/represa-portao.png` e `represa-piquenique.png`.

## Performance
Nada por quadro. O mapa ganhou 111 tiles de piso e 16 objetos. Ele passou a ter camada `moveis`, então entrar nele pede `moveis_parque` — que já está em cache, porque o jogo abre no bairro e usa a mesma folha.

## Known Remaining Work
Com este, os **quatro mapas externos** estão remapeados. O que segue aberto no assunto:

- **os 23 interiores urbanos e os 50 andares da usina** nunca passaram por remap. Os interiores têm mobília; o que eles não têm é a mesma disciplina de "conferir o layout antes de escrever";
- **as quatro conferências de mapa são o mesmo código quatro vezes.** `verificar-centro`, `verificar-bairro`, `verificar-zona-rural` e `verificar-estrada-represa` compartilham umas cem linhas de construção de colisão e flood-fill, copiadas. Agora que o quarto entrou e o formato parou de mudar, extrair isso virou arrumação de verdade e não especulação;
- **nenhum dos quatro mapas varia com a estação** no piso, nem tem poça de chuva;
- **o mirante não tem nada para olhar.** Ele é chão calçado com guarda-corpo virado para o rio de jusante, e o rio é tile de água. Um evento ali — qualquer coisa que recompense a parada — transformaria um ramal decorativo em um motivo.

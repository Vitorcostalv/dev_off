# Performance e acessibilidade: medir o que o navegador baixa

## Implemented
A base de desempenho de [docs/overhaul.md](overhaul.md) registrava *"public soma 268.978.461 bytes (tamanho distribuído, não tráfego de boot)"* e dizia, com razão, que o tráfego ainda precisava de medição própria. Esta etapa é ela — e a medição achou coisas que contar bytes no disco não mostra.

**O boot baixava 127,89 MB em 210 arquivos, tudo antes de o menu aparecer.** Agora baixa **36,18 MB em 169**, e o tempo até jogável caiu de **6.290 ms para 2.364 ms**.

**O deploy carregava 266 MB, dos quais 211 MB o jogo nunca pede.** Agora são **93 MB**.

## O que a medição achou

Três coisas, e nenhuma delas aparece olhando o tamanho de `public/`.

**Os sprites de personagem tinham 6,7 vezes mais pixel do que a tela mostra.** O jogo desenha personagem a `ALTURA_PERSONAGEM_TILES` (1,5) vezes o tile de 32px — quarenta e oito pixels de altura. O quadro da folha de runtime tinha 320. Os 33 NPCs mais os 7 monstros somavam 66,9 MB baixados antes do menu para mostrar bonecos de 48px.

A correção foi **uma constante**: `FRAME` em `tools/folha-personagem.mjs`, de 256×320 para 128×160. O jogo não tem número para acertar junto — a escala sai de `sprite.height` em runtime. NPCs de 54,85 para 14,99 MB, monstros de 12,07 para 3,16. E a qualidade não caiu: `reduzirPara` reamostra com filtro de caixa ponderado por alfa, enquanto quem estava reduzindo 320 para 48 era o canvas com `pixelArt: true`, isto é, vizinho mais próximo jogando fora 85% dos pixels por arredondamento. A 128×160 o personagem ainda tem 3,3 vezes a altura que ocupa na tela.

O sprite do **jogador** não passou por isso e continua em 1254×1254 (4,23 MB). Ele não usa este pipeline, e `maos_jogador.json` e `equipamento.ancoras.json` têm coordenada em pixel casada com a folha: mexer no tamanho quebraria a âncora de toda mão e todo equipamento.

**As catorze folhas de móvel eram carregadas sempre, todas.** 35,79 MB — a folha de banheiro e a de hospital baixadas antes do menu, para um jogador que começa na rua do bairro, mapa que não usa nenhuma delas. O mapa que usa mais, uma residência, usa seis (15,64 MB).

Agora quem carrega é a cena de mundo, ao entrar no mapa, lendo a camada `moveis` do próprio tilemap — que o gerador já escreve com `atlas` em cada objeto, então não há segunda lista para manter em sincronia. Na casa do protagonista entra também o catálogo de mobília comprável, que não está na camada: as peças que o jogador ainda não comprou aparecem na pré-visualização da loja, e as que ele comprou estão em `estado.casa`.

**E o áudio carregava os 46 WAV, 7,52 MB.** Sete deles são ambiente (3,11) e trilha (4,04): treze arquivos longos que entram com fade de 900 ms. Efeito e som de interface juntos são 0,37 MB, e são os únicos que precisam estar prontos no instante em que o jogador aperta uma tecla — um passo que sai meio segundo depois do passo é um bug. Ambiente e trilha entram na primeira vez que o lugar pede.

## Architecture
`garantirAtlasDeMovel` segue o mesmo formato de `garantirTilemap`, que já existia para os 45 andares sob demanda da represa: corta o `create` no mesmo lugar, dispara a carga e reinicia a cena quando ela termina. Sem tarja de "carregando", ao contrário do tilemap — o atlas só falta na primeira vez que se entra num tipo de interior, o arquivo está no mesmo servidor do tilemap que acabou de chegar, e uma tarja que pisca por dois quadros é mais ruído que informação.

O áudio ganhou **cena própria só para carregar**. Sem ela o som usaria o loader da cena de mundo — e a FarmScene escuta `COMPLETE` nesse mesmo loader para reiniciar depois de buscar tilemap e atlas: uma faixa de ambiente chegando no meio disso dispararia o `restart` dela.

E o `arte/` deixou de ser convenção só no comentário. `gerar-assets.mjs` já dizia *"fica fora de public/ pra não inflar o build"*, mas 70 folhas de origem continuavam em `public/assets/sprites`, mais as pastas `Monstros` (19 MB) e `Armas` (3,4 MB). O Vite copia `public/` inteiro, então tudo aquilo ia para o `dist/` e ninguém baixava. Foram para `arte/`: folha de NPC, de monstro, de arma, as três de "desmontado" do minigame de conserto, a de estruturas de parque, e as quinze que nem o gerador lê (carro, gatos, cachorros, poses antigas do jogador) — essas **movidas, não apagadas**.

## Acessibilidade
Aqui a medição foi mais simples e o resultado mais direto: das quatro opções de acessibilidade, **duas eram decorativas**.

`altoContraste` existia nas preferências desde a etapa das opções e valia por **um retângulo**: o fundo do painel da tela de menu. HUD, caixa de fala, inventário, loja e computador ignoravam. `movimentoReduzido` valia por **uma coisa**: desligar as partículas de clima.

O trabalho de tokens do item anterior é o que tornou o conserto barato. Toda moldura do jogo passa por `moldura` em `scenes/widgets.ts`, então contraste alto virou uma decisão num lugar: o painel fica **opaco** e a borda passa de `UI.borda` (marrom fosco) para `UI.bordaViva` (amarelo). É exatamente o que os comentários do código pediam — a caixa de fala tinha escrito que *"o que atrapalhava a leitura era o cenário claro vazando por trás das letras"*, e a resposta na época foi subir a opacidade de 88% para 97%.

Medido no pixel, com a caixa de fala aberta sobre o centro ao meio-dia (o cenário mais claro do jogo): o painel sai de `#1e1b16` — doze de distância de `UI.fundo`, que é o cenário vazando — para `#1a1712`, distância zero.

`movimentoReduzido` ganhou dois usos reais. A seta `[Enter]` da caixa de fala piscava **para sempre** (`repeat: -1`): é o único elemento perpetuamente animado da interface, e fica onde o jogador passa mais tempo lendo. Com a opção ligada ela para no meio do caminho da piscada, visível e parada em alpha 0,6 — parar de piscar não pode ser sumir. E o fade de entrada e saída de NPC passou a usar o caminho instantâneo que já existia para montagem de cena.

O que ficou de fora e por quê: os dois tweens da represa (clarão do tiro, inimigo caindo) **continuam** com movimento reduzido ligado. São retorno de combate, não enfeite — tirar o clarão do disparo esconde do jogador se a arma disparou.

## Save Compatibility
Nada mudou de save e nada novo é persistido. As preferências de acessibilidade já eram salvas.

Um save antigo abre igual: os sprites são menores em bytes, não em tiles, e o atlas de móvel que falta chega quando o mapa pede. Um save gravado dentro de qualquer interior carrega o atlas dele na abertura, o que custa uma reinicialização de cena que o jogador não vê — a mesma que a represa já fazia.

## Bugs Fixed
**Duas ferramentas passaram a ler de `arte/` porque liam de `public/` por acidente de história**: `gerar-aparelhos` (as três folhas de "desmontado", 7 MB) e a folha de estruturas de parque em `gerar-assets`, que estava marcada `runtime: true` — flag que só diz *de onde ler*, e o jogo nunca carregou essa folha; ela é reempacotada em `moveis_parque.png`.

**A conferência de áudio cobrava "os 46 no cache" como se fosse requisito.** Não era: ela codificava "tudo no boot". Passou a cobrar o que importa — efeito e interface prontos, e das treze faixas longas só a do lugar.

**E duas armadilhas de teste que valem registro**, porque as duas passariam por bug de produto:

A suíte de desempenho esperava 400 ms fixos depois de entrar num mapa. A cena reinicia **duas** vezes num interior (uma para pedir os atlas, outra com eles em cache) e a casa do protagonista puxa 15,6 MB: com 400 ms o teste media a cena velha e dava a casa como **vazia** — exatamente o sintoma que ele existe para pegar. Agora espera o mapa certo pronto **e** o carregador ocioso.

E o servidor de desenvolvimento acumulava estado de HMR. Depois de dezenas de edições em `Som.ts`, `import('/src/scenes/Som.ts')` de dentro do navegador devolvia uma instância **diferente** da que o jogo usa, e a suíte de áudio media um tocador que nunca tocou nada — falhando de um jeito que parecia bug de produto e não era. As catorze suítes de navegador passaram a aceitar `GAME_URL`, e rodar contra um servidor recém-subido é a única forma de não medir estado velho.

## Tests
`npm run test:desempenho-browser`: **nove conferências**, todas medidas na rede ou no pixel.

O peso do boot por categoria; que nenhum atlas de móvel entra nele; que o áudio do boot cabe em 2 MB; que o total cabe num teto de **40 MB** — não é meta, é o valor de hoje com dez por cento de folga, e existe para ninguém devolver ao boot uma leva de 35 MB sem notar. Depois, que o atlas sob demanda **chega**: o mercado com 32 móveis e um atlas, a casa com 40 móveis e sete, a rua sem pedir atlas de interior nenhum — carga sob demanda que não carrega é sala vazia em silêncio, porque `criarMoveis` avisa no console e segue. E as duas de acessibilidade, com o contraste medido em pixel e a seta conferida contra a lista de tweens da cena.

Regressão: 19 validadores de domínio, as **catorze** suítes de navegador e o build de produção. Todos os geradores foram rodados novamente depois da mudança de pasta (`gerar-assets`, `processar-sprites-npc`, `processar-sprites-monstro`, `gerar-itens`, `gerar-aparelhos`, `gerar-equipamento`, `gerar-audio`, `andares-represa`), porque mover arquivo de entrada quebra pipeline em silêncio.

## Performance
Os números, lado a lado:

| | antes | depois |
| --- | --- | --- |
| boot até o menu | 127,89 MB / 210 arquivos | 36,18 MB / 169 |
| tempo até jogável | 6.290 ms | 2.364 ms |
| deploy (`dist/`) | 266 MB | 93 MB |
| sprites de NPC e monstro | 66,92 MB | 17,81 MB |
| atlas de móvel no boot | 35,79 MB | 0 |
| áudio no boot | 7,52 MB (46) | 0,37 MB (33) |
| bundle JS | 1.655 kB (gzip 468) | 1.657 kB (gzip 468) |

O bundle não mudou: nada aqui é código a mais de qualquer monta.

## Known Remaining Work
- **os 32 tilemaps do boot (4,05 MB)** carregam todos, e o jogador está em um deles. O padrão `sobDemanda` que os 45 andares da represa usam serve igual para os interiores urbanos;
- **os 33 NPCs carregam os 14,99 MB de sprite no boot**, e num mapa qualquer aparecem no máximo dezessete. Carregar por mapa é o próximo maior ganho, e é o mais arriscado: um NPC que entra andando de fora da tela com o sprite ausente fica invisível, sem erro nenhum. Precisaria sair da rotina do dia (`rotinasNpc`), não da posição atual;
- **`itens.png` tem 3,64 MB para 209 ícones** de 14px na tela — a mesma conta dos sprites de personagem, e a mesma correção provavelmente cabe;
- **os WAV são sem compressão.** 7,52 MB para 46 faixas; qualquer formato comprimido cortaria isso por cinco, mas o gerador escreve WAV byte a byte e não há encoder no projeto;
- **o alto contraste mexe na moldura, não no texto.** Cor de letra é aplicada na criação de cada `Text`, e trocá-la ao vivo pede uma paleta mutável no lugar do `UI` congelado;
- **o DevOS não segue o alto contraste**: ele tem paleta própria (`PC`), e a opção não chega lá;
- **as quinze folhas que ninguém lê** (carro, gatos, cachorros, caminhonete, poses antigas do jogador, `Itens_represa.png`) foram movidas para `arte/`, não apagadas. São 21,55 MB esperando uma decisão de quem desenhou.

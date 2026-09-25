# Cuidado, cultura e memória — etapa de 25/09/2026

Quarta etapa da execução de [PENDENCIAS.md](PENDENCIAS.md), depois de [oficina e convivência](oficina-e-convivencia.md). Fecha os blocos de **noites, sonhos e cuidado** e de **animais, cultura e memória da cidade**. O checklist segue com o que falta.

## Ferimento e cuidado (`src/game/cuidado.ts`)

- Três níveis de ferimento derivados do HP, com marcas desenhadas sobre a folha autoral: curativo no braço, corte na testa, mão e perna enfaixadas. A partir do segundo nível o passo sai torto — um giro de dois graus alternado, que **não tira velocidade nem trava ação**.
- O espelho de casa passa a comentar o corpo antes de qualquer morador.
- Voltar ferido da represa é registrado no dia. Oito moradores têm falas próprias para isso, uma por dia cada, com versão leve e versão grave. Ninguém pergunta o que havia lá dentro.
- A consulta no posto de saúde virou cena com quatro aberturas (a primeira guarda o desconforto do consultório), uma fala de cuidado que muda com a gravidade e uma fala pessoal de quem atende — Rafael, Priscila ou Ilda, conforme quem a prefeitura designou.

## Rádio (`src/game/radio.ts`)

Quatro faixas com grade própria: madrugada de gravação antiga, manhã de notícia (com dia, data e tempo), tarde musical e recados da noite. A programação gira com o dia, sem sorteio. A cada sete dias entra uma referência à represa — sempre serviço: neblina na estrada, manutenção, ronda da madrugada.

## Jornal semanal (`src/game/jornal.ts`)

Uma edição por semana, lida na biblioteca ou pelo celular, em seis seções: Obras, Agenda, Tempo, Moradores, Memória e Circulando. Tudo sai do mundo — projetos construídos, encontros da semana, clima dos sete dias, aniversários de quem o jogador conhece, uma nota histórica e o que andou circulando (a estrada alta de madrugada, o bicho que ganhou casa, a oficina cheia). **A manchete reage à obra que o jogador financiou** na semana; sem obra nova, a manchete é da cidade mesmo.

## Biblioteca (`src/game/biblioteca.ts`, `src/scenes/Biblioteca.ts`)

Catorze livros em sete assuntos — história local, represa, ferrovia, eletrônica, agricultura, romances e jornais antigos —, cada um com três páginas de texto. Alguns só aparecem depois de o jogador ter ido aonde o livro fala: os da represa pedem o prólogo e a primeira descida; os da ferrovia pedem um documento dela. Nenhum livro explica a represa.

## Memória da cidade (`src/game/memoriaDaCidade.ts`)

- **Doze documentos** espalhados pelos quatro mapas externos, em lugares que já existiam: a plataforma da estação, o pátio da roça, a curva da estrada, o canto da praça.
- Recolher é opcional. Quem cataloga são **Clara e Ilda**, na biblioteca, cada uma com leitura própria por tema — e é delas a conclusão, não do protagonista.
- **A ferrovia** ganha quatro documentos e dois livros, incluindo um bilhete de serviço mandando fechar uma boca de túnel. O manual de engenharia explica que isso era prática comum ao desativar um ramal, e observa que aqui não há placa com a data. O arquivo registra a pergunta em aberto; ninguém monta conspiração.
- Com oito documentos catalogados abre a **sala de memória** na sala dos fundos da biblioteca, com seções por tema (usina, ferrovia, cidade, fotografias, relatos). É o museu do checklist: numa cidade deste tamanho, ele é uma sala da biblioteca organizada por duas pessoas, e não um prédio novo — nenhum lote vago foi ocupado por ele.

## Viagem de ônibus (`src/game/viagem.ts`, `src/scenes/ViagemScene.ts`)

A linha municipal deixou de ser teletransporte: agora há um trecho de quinze segundos com a janela do ônibus — postes e casas passando, chuva quando chove, meio-reflexo do rosto à noite —, cinco a sete legendas de paisagem conforme o destino e, de vez em quando, um conhecido no banco do lado. **É pulável a qualquer momento** com [E], Esc ou clique, e quem pula chega exatamente no mesmo ponto.

## Validação

- `npm run build` (tsc + vite).
- `npm run verificar-cuidado`: níveis e marcas dentro do corpo, passo torto a partir do nível 2, registro da volta da represa, falas por morador uma vez ao dia, quatro aberturas de consulta e fala pessoal dos três candidatos do posto.
- `npm run verificar-cultura`: faixas do rádio por minuto (inclusive minuto negativo), grade rotativa, represa a cada sete dias; edição semanal com seis seções, manchete reagindo à obra e rumores lidos do mundo; catorze livros nos sete assuntos com requisitos; doze documentos em mapas existentes, catalogação só por Clara e Ilda, sala aberta uma única vez; paisagem do ônibus por destino, clima e hora.
- `npm run test:cuidado-browser`: marcas desenhadas a mais com o corpo ferido, fala de Wendel na volta da represa, espelho e cena de consulta.
- `npm run test:cultura-browser`: documento recolhido some do mapa, acervo com assunto/título/páginas, jornal na mesa, arquivo recusando sem Clara e catalogando com ela, sala de memória aparecendo sem recarregar o mapa, rádio da manhã e viagem de ônibus pulável chegando ao destino. Evidências em `docs/evidence/biblioteca-acervo.png`, `sala-de-memoria.png`, `jornal-semana.png` e `viagem-onibus.png`.
- `npm run verificar-tudo -- bloco6`: 34/34 conferências offline; as suítes de navegador anteriores (pendências, vida na cidade, oficina) seguem passando.

## O que esta etapa não entrega

Continuam no checklist: prólogo de 10–15 minutos, álbum e mural de fotografias, clima extremo e mudanças urbanas ao longo dos anos, represa ambiental (200 andares, atos, gravações, vigilância, conquistas), arte modular ilustrada, tilesets, iluminação, rotinas/câmera e interfaces.

## Adendo de 25/09/2026 — clima extremo e a cidade ao longo dos anos

Fecha também o bloco 7 do checklist.

- **Seis eventos raros** (`src/game/climaExtremo.ts`): temporal, neblina densa, primeira geada, onda de calor, chuva prolongada e cheia do Rio Claro. Acontecem a cada dezessete dias, só na estação que os permite, alternando dentro dela — nada é sorteado e nada vai para o save além do que o jogador fez. A chuva prolongada ocupa três dias; os outros, um. Cada evento tem aviso, texto, efeito sobre os serviços e falas próprias de quatro moradores, uma por dia cada.
- **Apagão**: no temporal, entre 19h e 23h, a luz pública do bairro cai — os postes apagam, a noite escurece, o bar acende vela, a farmácia atende com lanterna. Ajudar com o gerador é opcional, vale uma vez por apagão, rende um ponto de relação e nenhum dinheiro. Do bairro se vê **a represa acesa**, e o protagonista não conclui nada a respeito.
- **A cidade ao longo dos anos** (`src/game/mudancasUrbanas.ts`): doze marcas — pintura de fachada, bancos novos, grafite, árvores plantadas, placa trocada e pontos ocupados — aparecem conforme o ano ou a obra que o jogador financiou, desenhadas por cima do tilemap existente. A janela de casa resume o que mudou.
- **Estações por dentro e por fora**: interiores ganham janela fechada e cobertor no inverno, janela aberta e ventilador no verão; os figurantes mudam de roupa (gorro, camisa) e de horário — no inverno ninguém fica na rua à noite, no verão o meio do dia sai do sol.
- Validação: `npm run verificar-clima-extremo` (eventos por estação, duração, apagão por horário, gerador uma vez, reações uma por dia, mudanças por ano e por obra, interiores e trajes por estação), `npm run verificar-tudo -- bloco7` (35/35) e as suítes de navegador de pendências e cultura, que seguem passando com a cena nova.

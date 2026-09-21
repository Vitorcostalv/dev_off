# Pendências consolidadas do jogo

Atualizado em **21/09/2026**, considerando as entregas até o commit `dfdc1f2`.

Este arquivo reúne as pendências das propostas de narrativa, vida na cidade e direção visual. Uma caixa desmarcada indica trabalho restante. **Parcial** significa que já existe uma base, mas a proposta completa ainda não está entregue. Sistemas antigos semelhantes devem ser reaproveitados, sem serem confundidos com a implementação das novas propostas.

## Direção e regras permanentes

- Manter o jogo **2D top-down**, com os mapas, interiores, represa e tilemaps existentes.
- Buscar uma direção **2D ilustrada / HD-2D melancólica**, com personagens modulares e iluminação moderna; isso não exige converter o jogo para 3D.
- Implementar em etapas, preservando saves, controles, economia e identidade dos moradores.
- Evitar jumpscares, barra de depressão/sanidade e penalidades pesadas por dificuldades psicológicas.
- Manter a ambiguidade da represa e não inventar causa, culpado ou detalhes das mortes.
- Preservar a ordem das revelações: casamento em 126, morte da esposa em 142, filha em 155–157, mesmo evento em 159 e desenho em 173.
- Marcar itens como concluídos somente depois de integrados e verificados no jogo.

## O que já existe e deve ser preservado

- Campanha com 25 cenas, do prólogo ao epílogo, com progresso e retomada.
- Missão de Wendel com recuperação parcial do HD.
- Primeiras 50 fichas e 150 registros de psicoterapia; leitura e releitura persistentes.
- 50 andares nos mapas originais e 150 salas compactas exploráveis. As novas salas ainda não representam toda a expansão ambiental proposta.
- Tela inicial dinâmica; Continuar, Novo jogo, Carregar, Configurações, Créditos e Sair.
- Quatro espaços manuais, autosave, backup anterior, miniaturas, contexto da partida, tempo jogado e aviso de incompatibilidade.
- Paper doll vetorial inicial aplicado aos figurantes do bairro e centro; contrato com 13 poses. Protagonista e moradores principais ainda usam suas folhas autorais.
- Hitbox fixa nos pés, origem inferior central, ordenação por Y e sombras de contato nos personagens.
- Halos suaves nos postes, matiz regional discreta e poças persistentes após chuva observada no mapa.

## 1. Prólogo, casa e diário pessoal

- [ ] **Parcial — prólogo:** transformar a encenação atual em uma sequência explorável de aproximadamente 10–15 minutos na antiga casa, antes da mudança.
- [ ] Permitir interações com notebook, celular, café, pia, relógio, mensagens e trabalho durante a madrugada, sem combate.
- [ ] Fazer a passagem da noite e os pedidos urgentes serem vividos pelo jogador; encerrar com o carro chegando à cidade.
- [ ] Criar diário pessoal automático, separado do diário de missões.
- [ ] Alterar gradualmente a escrita do diário: tarefas objetivas, convivência, descanso e pertencimento.
- [ ] Criar interações domésticas opcionais: café, banho, rádio, janela, correio e alimentar o animal.
- [ ] Fazer a casa evoluir visualmente com a narrativa: caixas, cortinas, louça e sinais de vida, sem exigir uma casa perfeita.
- [ ] Materializar presentes e lembranças específicas dos moradores: foto de Letícia, pão de Davi, lembrança de Luke e peça de Wendel.
- [ ] Criar interações narrativas com o espelho, conforme o momento da história.
- [ ] Criar conjuntos de roupa casual, chuva, inverno, trabalho e represa, incluindo peças recebidas de NPCs.
- [ ] Avaliar crescimento discreto de cabelo e barba associado à passagem do tempo e a acontecimentos narrativos.

## 2. Relações, memória social e eventos

- [ ] **Parcial — relações:** complementar o score existente com confiança, proximidade, conhecimento sobre o protagonista e afeto.
- [ ] Registrar padrões de vida, além de acontecimentos isolados: trabalho noturno recorrente, ausência do bar, visitas à praça e entradas na represa estando ferido.
- [ ] Criar falas de Edu, Alice, Letícia e Wendel reagindo a esses padrões.
- [ ] **Parcial — encontros:** ampliar conversas entre NPCs que acontecem independentemente do jogador e variam com as relações.
- [ ] Criar rumores que circulam no dia seguinte, com interpretações distintas de Jaqueline, Hiago, Alice e outros moradores.
- [ ] Criar de 3 a 6 cenas de vínculo para cada morador importante, sem reduzir a recompensa a dinheiro ou itens.
- [ ] Ampliar o arco de Wendel com conversas íntimas, convite para jantar e encerramento sem recompensa material.
- [ ] Criar cenas em grupo: Alice/Wendel, Mari/Letícia/Edu, Jaqueline/Luke, Vitor/Hiago, família de João e Roberto/Ilda/Ravi.
- [ ] Criar os cinco eventos propostos: feira da cidade, noite junto ao rio, Festival da Estação, jantar comunitário e memorial da antiga usina.
- [ ] Variar os diálogos dos eventos entre os anos.
- [ ] Ampliar aniversários com presentes, esquecimentos, visitas e convites.
- [ ] Fazer os moradores conhecerem e lembrarem progressivamente do aniversário do protagonista.
- [ ] Integrar os eventos sociais reais aos resumos das partidas; atualmente o último marco considera cenas da campanha.

## 3. Celular, fotografia e memórias pessoais

- [ ] Criar celular com mensagens, blog da cidade, calendário, contatos, fotos, trabalhos e mapa, reaproveitando os sistemas existentes.
- [ ] Criar pequenas mensagens de moradores e respostas que podem demorar conforme a narrativa.
- [ ] Introduzir fotografia por meio de Letícia.
- [ ] Permitir fotografar cidade, NPCs, animais, eventos, paisagens e objetos da represa.
- [ ] Criar diferenças visuais raras em fotografias da represa, com progressão gradual e sem antecipar o sobrenatural.
- [ ] Criar álbum de fotografias antigas desbloqueado pela história.
- [ ] Incluir lembranças felizes e banais de esposa, filha, apartamento, aniversário e viagem.
- [ ] Criar baú de memórias inicialmente fechado, com abertura vinculada à progressão.
- [ ] Incluir aliança, desenho, brinquedo, foto, crachá, celular antigo, cartão, recibo e pen drive.
- [ ] Vincular objetos a cenas curtas, sem revelar seu significado antes da hora.
- [ ] **Parcial — arquivo clínico:** implementar trechos inicialmente censurados e revelados depois, mantendo o texto integral no catálogo.
- [ ] Fazer fotografias de eventos aparecerem em porta-retratos, mural, casa e tela inicial.

## 4. Trabalho, refeições e descanso

- [ ] **Parcial — oficina:** ampliar o minigame de conserto para inspeção e 4–5 tipos de diagnóstico, envolvendo capacitor, cabo, fusível, bateria, solda e placa.
- [ ] Criar clientes recorrentes, com evolução dos equipamentos e pequenas histórias pessoais.
- [ ] Criar reputação por confiabilidade, velocidade, qualidade e preço, influenciando os trabalhos recebidos.
- [ ] Permitir escolher quantos contratos aceitar e registrar consequências narrativas de excesso de trabalho.
- [ ] Criar dias livres sem tarefas, prazos ou bônus obrigatórios.
- [ ] Permitir sentar em bancos enquanto o tempo passa e moradores circulam ou se aproximam.
- [ ] Criar caminhadas com Edu e Letícia, com conversas ligadas aos lugares atravessados.
- [ ] Permitir acompanhar um NPC até seu destino, sem transformar isso em missão.
- [ ] Criar refeições sociais: comer sozinho, comer no bar, jantar com alguém e cozinhar para convidados.
- [ ] Integrar receitas ensinadas pelos moradores: pão de Davi, conservas de Neide e pratos do bar de Alice, com histórias associadas.

## 5. Noites, sonhos e cuidado

- [ ] Criar sonhos raros que conectam apartamento, escritório, casa, rua e represa de maneira impossível.
- [ ] Criar noites de insônia às 02:47, com escolhas de levantar, beber água, olhar o celular, sentar na varanda, trabalhar ou tentar dormir.
- [ ] Fazer essas escolhas gerarem textos e cenas, sem uma barra de sanidade.
- [ ] Representar ferimentos com curativos e alterações visuais/animações, além do HP.
- [ ] Fazer moradores perceberem a volta da represa com ferimentos.
- [ ] Transformar algumas consultas no posto de saúde em cenas, incluindo desconforto inicial com o consultório.

## 6. Animais, cultura e memória da cidade

- [ ] Criar animal de companhia que dorme em lugares diferentes, espera o protagonista, reage à chuva, acompanha parte do caminho e aparece na oficina.
- [ ] Ampliar animais de rua e fauna: gatos conhecidos, cachorros, pássaros, sapos na chuva e vagalumes.
- [ ] Criar programação de rádio por horário: notícias de manhã, música à tarde, mensagens à noite e música antiga de madrugada.
- [ ] Incluir referências ocasionais à represa na programação.
- [ ] Criar jornal semanal sobre obras, eventos, clima, moradores, história e rumores.
- [ ] Fazer manchetes reagirem aos projetos financiados pelo jogador.
- [ ] Tornar os livros da biblioteca conteúdo legível: história local, represa, ferrovia, eletrônica, agricultura, romances e jornais antigos.
- [ ] Criar arquivo histórico construído com Clara e Ilda a partir de documentos coletados.
- [ ] Criar museu como projeto tardio, com peças da usina, ferrovia, fotografias, relatos e objetos.
- [ ] Ampliar exploração e memória da ferrovia com trilhos antigos, fotos e possíveis túneis, sem impor uma conspiração.
- [ ] **Parcial — ônibus:** acrescentar viagem curta e pulável, com janela, paisagem, chuva e presença ocasional de NPC.

## 7. Clima, passagem dos anos e mudanças urbanas

- [ ] Criar eventos raros: temporal intenso, neblina densa, primeira geada, onda de calor, chuva prolongada e cheia do Rio Claro.
- [ ] Fazer moradores e serviços reagirem a esses eventos.
- [ ] Criar apagão durante temporal, com velas, bar funcionando, emergência na farmácia e possibilidade de ajudar com gerador.
- [ ] Contrastar o apagão da cidade com a represa iluminada à distância.
- [ ] Ampliar transformações urbanas: pintura, bancos, grafite, árvores, comércio, placas e uso dos lotes.
- [ ] Fazer a cidade dos anos seguintes diferir visualmente do começo.
- [ ] Fazer interiores acompanharem a estação: cobertores/janelas fechadas no inverno e ventiladores/janelas abertas no verão.
- [ ] Fazer roupas e comportamento dos moradores acompanharem as estações.

## 8. Represa, revelações e conquistas

- [ ] **Parcial — 200 andares:** ampliar as salas compactas com identidade ambiental e progressão espacial próprias.
- [ ] Organizar a apresentação em quatro atos: 1–50 trabalho; 51–100 relações/solidão; 101–150 infância/trauma; 151–200 esposa, filha, culpa e identidade, preservando a ordem original das revelações dos textos.
- [ ] Fazer a arquitetura passar do industrial para espaços domésticos, geometria impossível e memória.
- [ ] Criar salas seguras para sentar, ouvir o ambiente e ler, incluindo uma semelhante à antiga casa.
- [ ] Criar atalhos físicos a cada 10–20 níveis: elevadores, escadas, painéis ou chaves.
- [ ] Criar mapa da represa progressivamente rabiscado, com corredores inconsistentes e anotações.
- [ ] Distribuir objetos pessoais raros, sem repetir lembranças familiares em todas as salas.
- [ ] Criar gravações de trabalhadores, ruídos, conversas, sessões e mensagens; avaliar a aparição posterior da voz do protagonista.
- [ ] Criar terminais de vigilância e imagens em que o protagonista aparece antes de chegar ao andar.
- [ ] Criar confrontos ambientais: máquina de ponto, servidor central e linha de montagem.
- [ ] **Parcial — retorno:** acrescentar escolhas narrativas explícitas de continuar descendo ou voltar para casa após documentos importantes; sair das profundezas já é possível.
- [ ] Refinar a cena do andar 50 com animação corporal e enquadramento próprios; atualmente silêncio e tentativas de levantar usam quadros interativos.
- [ ] Criar conquistas temáticas: “Hoje não”, “Fica mais um pouco”, “Nenhum compromisso”, “Eu lembro” e “Casa”, ligadas aos sistemas correspondentes.

## 9. Personagens modulares e expressões

- [ ] **Parcial — paper doll:** substituir a arte vetorial de estudo por corpo e camadas ilustradas definitivas.
- [ ] Produzir frames universais completos de parado, andar, correr, segurar item, usar ferramenta, combate e sentar, com quatro direções.
- [ ] Refinar poses idle, sit, lean, work, read, phone, eat e sleep; várias poses atuais têm apenas silhueta simplificada.
- [ ] Produzir catálogo de cabelos, peles, camisas, calças, roupas e acessórios compatíveis com a mesma base.
- [ ] Expandir combinações válidas por configuração JSON/TS para NPCs secundários.
- [ ] Criar combinações autorais para protagonista e moradores importantes, preservando suas identidades.
- [ ] Produzir bustos ilustrados dos moradores importantes com expressões neutra, feliz, irritada, triste e preocupada.
- [ ] Integrar retratos aos diálogos e permitir escolher retratos grandes ou diálogo simples.
- [ ] Criar expressões sobre NPCs secundários: surpresa, dúvida, raiva, sono e tristeza.
- [ ] Ampliar sombras de contato para animais, móveis externos e objetos grandes.

## 10. Tilesets, terreno e composição visual

- [ ] Criar famílias modulares de paredes, rodapés, telhados, janelas, portas, quinas, rachaduras, sujeira e placas.
- [ ] Produzir tilesets ilustrados maiores mantendo a grade lógica e a colisão independentes da resolução da arte.
- [ ] Criar identidade por prédio: mercado fluorescente, bar quente, farmácia fria, biblioteca em madeira/papel, academia com luz dura e oficina com luz de bancada.
- [ ] Criar decals de folhas, chuva, rachaduras, papéis, musgo, marcas de pneu, bueiros e galhos.
- [ ] Criar transições orgânicas entre grama, terra, pedra e lama, com cantos variados.
- [ ] Ampliar verticalidade com muros, árvores, postes, telhados, fios, placas, escadas, barrancos e elevações visuais.
- [ ] Criar telhados que desaparecem ou ficam transparentes quando necessário.
- [ ] Criar paredes internas visualmente mais altas, especialmente na casa, biblioteca, escola e represa.
- [ ] Separar tronco e copa das árvores; tornar a copa parcialmente transparente quando cobrir o personagem.
- [ ] Criar 10–20 variações pequenas de vegetação, pedras e galhos, distribuídas de forma determinística.
- [ ] Criar camadas de foreground com galhos, grades, portas, folhas e sombras.

## 11. Iluminação e atmosfera

- [ ] **Parcial — iluminação:** ampliar os halos existentes para janelas, interiores, faróis, letreiros, televisões, monitores, velas e lâmpadas.
- [ ] Avaliar iluminação com oclusão, normal maps ou sombras projetadas conforme necessidade e desempenho; não são entregues pelos halos aditivos atuais.
- [ ] Refinar paletas regionais na própria arte, além da camada de matiz atual.
- [ ] Ampliar variações discretas de saturação, contraste e luz conforme a narrativa, sem reduzir estados emocionais a preto e branco.
- [ ] **Parcial — chuva:** melhorar patches de piso molhado, highlights e reflexos sob fontes de luz.
- [ ] Fazer NPCs contornarem poças e permitir reações de crianças/passos; a persistência visual básica já existe.
- [ ] Animar vento em árvores, plantas, varais, placas e papéis.
- [ ] Animar objetos cotidianos: ventilador, televisão, academia, letreiro, relógio, bandeira, chaminé, água e animais em repouso.
- [ ] Criar deslocamentos ocasionais de carros e bicicletas por horário.
- [ ] Refinar neblina em camadas de profundidade e velocidades distintas.
- [ ] Avaliar grain, vinheta e ajustes de cor muito leves; reservar desalinhamento visual discreto para a represa profunda.

## 12. Rotinas, navegação e câmera

- [ ] **Parcial — poses e rotinas:** criar activityPoints em banco, balcão, cadeira, mesa, máquina, árvore e janela.
- [ ] Conectar esses pontos às poses genéricas, separando decisão de rotina e animação.
- [ ] Auditar e ampliar navegação existente com grid/navgraph e recálculo diante de novos bloqueios.
- [ ] Detectar NPC preso, recalcular caminho, procurar posição válida e, como último recurso, reposicionar fora da câmera.
- [ ] Ampliar portais internos e atualização lógica de moradores em mapas não observados.
- [ ] Aplicar LOD comportamental: simulação completa perto, simplificada longe e horário/destino em outros mapas.
- [ ] Refinar a câmera existente com antecipação suave na direção de caminhada e zoom pontual em diálogos/eventos.
- [ ] Criar enquadramentos especiais no próprio ambiente, ocultando HUD quando apropriado.
- [ ] Respeitar movimento reduzido e evitar movimentos de câmera desconfortáveis.

## 13. Interface, transições e continuidade visual

- [ ] Tornar o HUD mais contextual, exibindo elementos quando necessários.
- [ ] Redesenhar inventário como mochila/mesa de trabalho, com ícones maiores, categorias e arquivo separado.
- [ ] Criar mapa da cidade com aparência impressa ou desenhada e anotações de descoberta.
- [ ] Diferenciar o mapa industrial da represa do mapa cotidiano da cidade.
- [ ] Criar loading contextual com arte, fotografia ou trechos do diário, sem prolongar carregamentos rápidos desnecessariamente.
- [ ] Melhorar transições de interior com fade, mudança de exposição e tratamento de áudio/reverberação.
- [ ] Criar logo e tipografia próprios, coerentes com o tom psicológico e os elementos industriais.
- [ ] Refinar menus diegéticos: prontuários, e-mails/classificados, álbum, fichário histórico e terminal industrial.
- [ ] **Parcial — tela inicial:** integrar a composição da casa e os objetos/fotografias específicos da partida, substituindo símbolos genéricos de progresso.
- [ ] Fazer casa, mural, porta-retratos e tela inicial compartilharem as mesmas memórias visuais.

## Ordem sugerida de execução

1. Prólogo explorável, diário pessoal e interações domésticas.
2. Arte modular definitiva e pontos de atividade, em paralelo à preparação de conteúdo social.
3. Relações, memória social, encontros, eventos e aniversários.
4. Celular, fotografia, álbum, baú e continuidade visual da casa.
5. Oficina, clientes, refeições, caminhadas e descanso.
6. Cidade viva, clima, cultura, animais e passagem dos anos.
7. Sonhos, insônia, consultas e cuidado.
8. Represa ambiental, gravações, vigilância, confrontos e conquistas.
9. Consolidar a direção ilustrada, câmera, interfaces e transições ao longo das entregas anteriores.

Essa ordem é uma proposta de organização, não uma indicação de que os itens já foram implementados. As bases técnicas já entregues devem ser reaproveitadas em cada etapa.

## Verificação de cada entrega

- Preservar migração de saves, leituras e escolhas narrativas.
- Conferir continuidade e ausência de revelações antecipadas em títulos, imagens e índices.
- Verificar controles, colisão, profundidade, rotinas e transições afetados pela mudança.
- Verificar legibilidade, movimento reduzido, alto contraste e qualidade baixa.
- Executar build e testes pertinentes, incluindo teste no navegador quando houver mudança de interação ou renderização.
- Atualizar este checklist e a documentação específica com o que foi efetivamente entregue.

## Fontes e documentos de referência

- [Tratamento original da campanha](narrativa-fontes/tratamento-campanha.txt).
- [Registros de psicoterapia 51–200](narrativa-fontes/registros-051-200.txt).
- [Proposta de expansão da vida e memória](narrativa-fontes/expansao-vida-e-memoria.txt).
- [Proposta de direção visual modular](narrativa-fontes/direcao-visual-modular.txt).
- [Narrativa consolidada](narrativa-consolidada.md).
- [Etapas da expansão de vida e memória](expansao-vida-e-memoria.md).
- [Estado da direção visual](direcao-visual.md).

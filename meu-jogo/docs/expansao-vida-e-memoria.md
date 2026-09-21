# Expansão da vida e da memória

Fonte: [texto integral enviado pelo autor](narrativa-fontes/expansao-vida-e-memoria.txt).
Direção aprovada: implementar o texto em etapas. A tabela separa entregas verificadas de trabalho ainda pendente; a existência de sistemas parecidos no jogo não significa que a proposta nova esteja pronta.

| Etapa | Escopo | Estado |
| --- | --- | --- |
| 1 — Entrada e partidas | Tela inicial dinâmica, menu completo, quatro espaços manuais, autosave, backup, miniatura, contexto emocional, tempo jogado, incompatibilidade | Implementada nesta entrega |
| 2 — Habitar a casa | Prólogo explorável de 10–15 minutos antes da mudança; notebook, celular, café, pia, relógio e mensagens; diário pessoal automático separado das missões; café, banho, rádio, janela, correio e cuidados com o animal; espelho e aparência; roupas por situação | Pendente; o prólogo atual continua sendo a encenação anterior |
| 3 — Pessoas e pertencimento | Confiança/proximidade/conhecimento/afeto; padrões de vida percebidos; conversas entre NPCs; rumores com interpretações distintas; 3–6 cenas por morador importante; encontros em grupo; cinco festivais com variação anual; aniversários, visitas e mensagens | Pendente |
| 4 — Comunicação e memória | Celular com mensagens, blog, calendário, contatos, fotos, trabalhos e mapa; fotografia de cidade/NPCs/animais/eventos/paisagens/represa; fotos antigas felizes e banais liberadas pela história; baú com aliança, desenho, brinquedo, foto, crachá, celular, cartão, recibo e pen drive; revelações progressivas no arquivo clínico | Pendente; arquivo de psicoterapia já existe, mas censuras contextuais e álbum ainda não |
| 5 — Trabalho e descanso | Oficina com cinco diagnósticos; clientes recorrentes; reputação por confiabilidade/velocidade/qualidade/preço; quantidade de contratos escolhida; consequências narrativas de excesso; dias livres; bancos para sentar; caminhadas e acompanhamento de NPCs; refeições compartilhadas, convites e receitas de moradores | Pendente; preservar a economia e atividades existentes |
| 6 — Cidade viva | Animal de companhia; animais de rua e fauna; rádio por horário; jornal semanal; biblioteca legível; arquivo histórico e museu; ferrovia; viagem de ônibus animada e pulável; clima raro, cheia, apagão e gerador; alterações urbanas anuais; interiores e comportamento sazonais | Pendente |
| 7 — Noites e cuidado | Sonhos raros ligando espaços; insônia às 02:47 com escolhas; ferimentos visíveis e percebidos por NPCs; consultas encenadas; sem barra de depressão/sanidade nem punições pesadas | Pendente |
| 8 — Represa e encerramento | Quatro atos biográficos; deterioração arquitetônica; salas seguras; atalhos a cada 10–20 níveis; mapa anotado e inconsistente; objetos pessoais raros; gravações e terminais de vigilância; confrontos ambientais; decisão continuar/voltar; conquistas temáticas | Pendente; existem 200 documentos, 50 mapas originais e 150 salas compactas, não toda esta expansão |

## Etapa 1: uso e limites

- **Tela inicial:** Continuar, Novo jogo, Carregar, Configurações, Créditos e Sair. Sem partida, Novo jogo começa selecionado. No navegador, Sair mantém o jogo pausado e informa que a aba pode ser fechada.
- **Ambiente:** janela com chuva (vento visual no inverno), luminária, caixas e represa distante. Uma amizade com score 4 ou mais acrescenta planta, fotografia, ferramentas, caneca e luz quente. O documento 159 libera a moldura virada; o 100 altera o corredor. Movimento reduzido desativa chuva animada e oscilação da luz. Não há jumpscare.
- **Partidas:** quatro lembranças manuais em Pausa → Guardar momento. Carregar mostra autosave, quatro lembranças e backup anterior. Substituição e carregamento têm confirmação dentro do jogo. Novo jogo preserva lembranças manuais e guarda o autosave no backup.
- **Contexto:** estação/ano, dia da semana/horário, local, último marco da campanha e tempo jogado. O título do último marco usa somente cenas já concluídas, sem inventar eventos sociais ainda não implementados.
- **Miniaturas:** captura reduzida da partida a cada cinco segundos de jogo visível; os menus não entram na foto. Saves feitos antes da primeira captura mostram “Sem fotografia”. O tempo de saves antigos começa a ser contado a partir desta versão.
- **Autosave:** a cada minuto de jogo ativo, quando o mundo está disponível e sem diálogo aberto, além dos pontos de salvamento já existentes. Tempo no menu e aba oculta não conta. Cenas narrativas continuam salvando seus quadros.
- **Compatibilidade:** migração existente mantida. Saves futuros são identificados e não carregados; dados danificados indicam o backup como recuperação. As cópias continuam locais ao navegador e não são sincronizadas pela rede.

Validação automatizada: `verificar-partidas` cobre espaços, migração, metadados, incompatibilidade e falhas de escrita; `test:partidas-browser` verifica navegação, fotografia, salvar/carregar, backup e estados visuais. Evidências visuais ficam em `docs/evidence`.

## Continuidade a preservar nas próximas etapas

Os atos propostos não autorizam reordenar silenciosamente os prontuários: os textos atuais mencionam casamento em 126, morte da esposa em 142 e filha em 155–157. A classificação espacial pode mudar mantendo essa ordem de revelação. Censuras futuras devem ocultar somente trechos explicitamente selecionados, preservar o texto integral no catálogo e jamais antecipar títulos ou parentesco. A natureza da represa continua ambígua.

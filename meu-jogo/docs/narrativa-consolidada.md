# Narrativa consolidada — identidade depois do colapso

## Estado deste documento

Consolidação dos dois textos fornecidos pelo autor e das 50 fichas existentes. O runtime atual possui 50 andares, as 50 fichas médicas originais e os 150 registros de psicoterapia integrados ao arquivo. As cenas de campanha descritas abaixo continuam sendo direção narrativa, não cenas já implementadas.

### Primeira entrega jogável: continuação do prontuário

Após recolher a ficha 50, abra **Arquivos [J] → Psicoterapia → Continuar**. Cada registro só libera o seguinte quando a leitura termina. É possível reler os anteriores e sair do menu entre registros. Os títulos das folhas futuras não revelam temas. O progresso é salvo ao concluir cada registro e sobrevive ao carregamento de saves antigos; saves que já possuem a ficha 50 recebem acesso à seção.

Este acesso pelo anexo permite ler a continuação na versão atual. Não representa a distribuição final dos registros pelos andares 51–200: esses mapas e as novas cenas ainda precisam ser implementados. Não foram acrescentados andares vazios nem datas de sessões inventadas.

Os registros preservam o texto autoral, com duas edições de continuidade: o 141 não antecipa a palavra “falecimento” e o 173 usa “dobrado em quatro”. As notas de direção entre blocos ficam na fonte, fora das falas do prontuário. As primeiras 50 fichas permanecem intactas.

Validação desta entrega: build de produção, 397 verificações do cânone existente, regressão de save, comparação dos 150 textos com a fonte, leitura sequencial completa e teste no Chrome de 199 páginas renderizadas, incluindo retomada após recarregar e verificação de que o texto cabe na caixa.

Fontes preservadas integralmente:

- [Tratamento de campanha fornecido pelo autor](narrativa-fontes/tratamento-campanha.txt).
- [Registros 51–200 e notas do autor](narrativa-fontes/registros-051-200.txt).
- [Primeiras 50 fichas implementadas](../src/game/fichas.ts).

As propostas de conciliação são identificadas como propostas, sem alterar silenciosamente os textos originais.

## Essência

“Consertar não significa voltar a ser como antes.”

O protagonista aprende a existir fora do trabalho, da utilidade e da obrigação de reparar tudo. O colapso profissional é uma camada de sua história, atravessada por isolamento, experiências de controle, violência na infância e luto pela esposa e pela filha. A história não estabelece que ele tenha causado suas mortes.

A cidade oferece convivência, limites e espaço para receber ajuda. Seus moradores mantêm desejos e conflitos próprios. O desfecho não apaga perdas nem exige felicidade permanente: mostra presença, capacidade de encerrar o expediente e disponibilidade para companhia.

## Estrutura da campanha

Os capítulos da campanha são distintos dos cinco capítulos industriais já implementados na represa.

| Etapa | Ação dramática | Cenas centrais |
| --- | --- | --- |
| Prólogo | Mostrar a perda de presença antes da mudança | Mensagens durante a madrugada; jantar esquecido; chegada chuvosa; silêncio da casa. |
| I — O homem que chegou | Descobrir uma convivência que não exige justificativa | Caixas fechadas, notebook antigo, primeiros contatos, oficina como lugar de controle. |
| II — Ele começa a melhorar | Construir rotina sem confundir melhora com resolução | Amigos, projetos locais, mensagem do antigo cliente, culpa mesmo depois da recusa. |
| III — A represa | Aproximar o prontuário de quem o lê | Entrada por motivo cotidiano; anomalias industriais; julgamento do paciente; reconhecimento gradual. |
| IV — O protagonista piora novamente | Confrontar a crença de que sua nova vida é falsa | Retraimento, dificuldade com rotinas, conversa de Letícia sobre a árvore caída. |
| V — As relações começam a se inverter | Receber cuidado sem transformá-lo em dívida | Compras de Jaqueline, pão de Davi, presença de Wendel, intervenção de Alice. |
| VI — O retorno à represa | Continuar sem exigir certeza ou controle total | Retorno admitindo dúvida; ficha 50; aprofundamento nos registros 51–200. |
| Desfecho | Agir de outro modo diante de uma solicitação conhecida | Sala do prólogo; mensagens urgentes; saída sem combate final; expediente encerrado às 18h. |
| Epílogo | Habitar a cidade e a própria história | Caixa aberta, memória acessível, café junto à janela, fotografia de Letícia. |

O prólogo antecipa o esgotamento, mas não a esposa, a filha ou a origem das fichas na usina. O suspense inicial passa a envolver reconhecimento e presença impossível dos documentos, além da identidade do paciente.

## Documentos e revelações

| Registros | Eixo | Revelações e fechamento |
| --- | --- | --- |
| 1–50 | Trabalho e mudança | 4471-C → V. A. → desenvolvedor → trabalho remoto → mudança e oficina. A vida tranquila foi construída depois da crise. |
| 51–75 | Solidão | Vínculos funcionais, isolamento, desconforto com cuidado gratuito, medo de incomodar. “Eu sei ficar sozinho. Não sei se sei ficar acompanhado.” |
| 76–100 | Relacionamentos, abandono e controle | Relação anterior controladora; resposta imediata como tentativa de segurança; afastamentos praticados pelo próprio protagonista; limites sem abandono. |
| 101–125 | Infância, negligência e abuso | Vigilância do humor do pai, violência doméstica, punição física, humilhação e associação entre desempenho e segurança. |
| 126–150 | A esposa | Casamento seguro, dificuldade de presença, objetos guardados, morte e trabalho usado para evitar a ausência. |
| 151–175 | A filha | Quarto evitado, existência da filha, morte no mesmo evento que a esposa, lembranças cotidianas e desenho preservado. |
| 176–200 | Culpa, luto e reconstrução | Culpa sem evidência objetiva de responsabilidade, limites, memória imperfeita, companhia e identidade ainda aberta. |

### Marcos que precisam permanecer distinguíveis

- 125: o emprego é comparado a uma casa onde era necessário merecer permanecer.
- 126: primeira menção explícita ao casamento.
- 137: o registro diz que ele informa o nome da esposa, mas o texto fornecido não apresenta esse nome. Não inventar um nome como se já fosse canônico.
- 141: a versão original já usa a palavra “falecimento”.
- 142: o protagonista verbaliza “Ela morreu”.
- 155–156: revela a existência da filha.
- 157: o texto já revela que ela morreu; não atribuir essa primeira revelação ao 159.
- 159: estabelece que esposa e filha morreram no mesmo evento.
- 160: recusa detalhar o evento. Não inventar acidente, crime, doença, data, culpado ou ligação causal com o trabalho.
- 163–164: a filha ganha características pessoais além da morte.
- 173: identifica um desenho da filha, guardado dobrado.
- 188–190: conta as perdas a alguém da cidade; a pessoa não é identificada no texto.
- 200: reconhece não saber quem será, sem urgência em fechar a resposta.

## Conciliações necessárias

### Cronologia e transferência

As primeiras 50 fichas cobrem 200 dias: quatro dias por ficha. Os 150 registros novos são sessões numeradas, sem datas declaradas. Não correspondem automaticamente a outros 150 dias nem precisam herdar blocos de quatro dias.

Proposta: preservar a cronologia das fichas 1–50 e apresentar 51–200 como seção de psicoterapia sem datas inventadas. A transferência da ficha 50 fornece a ligação entre os dois conjuntos. Os textos antigos já mencionam acompanhamento psicológico; portanto, a transferência não deve ser descrita como a primeira terapia de sua vida.

### Ordem de informação sobre a esposa

O tratamento deseja retardar a descoberta da morte até 142, mas 141 já a explicita. Proposta editorial para 141: “Questionado sobre o que aconteceu depois, pede mudança de assunto. Solicitação respeitada.” A fonte original permanece preservada.

Desde 126 o leitor sabe que houve casamento. O suspense de 138 pode ser sobre ausência e destino da esposa, não sobre a existência dela. A parceira controladora de 78 não deve ser automaticamente identificada como a esposa da relação segura de 128.

### O papel dobrado

No código atual, a ficha 40 identifica um papel com a pergunta “eu escolhi vir ou fui trazido?”; a ficha 48 retoma esse papel. A anotação técnica na usina também usa uma folha dobrada. Esses conteúdos não podem ser simplesmente declarados o mesmo desenho.

Proposta: conservar os documentos existentes e introduzir um papel distinto, com identidade persistente, encontrado na represa e inicialmente descrito apenas por dobra, textura e traços parcialmente visíveis. O registro 173 permite reconhecê-lo como desenho da filha. A identidade precisa ser sustentada por características reconhecíveis, não apenas pelo formato da dobra.

“Dobrado em quatro” e “dobrado quatro vezes” não são equivalentes. Normalizar a descrição do novo objeto na edição destinada ao jogo, mantendo intacta a transcrição original.

### Recuperação e recaída

O acompanhamento pode registrar melhora enquanto a campanha apresenta dificuldades posteriores. A ordem entre leitura, sessões e cenas precisa ser explícita no roteiro de implementação para que a recaída não transforme todos os registros em acontecimentos do mesmo dia.

### Edu e o notebook

A missão atual envolve perder o notebook durante uma caminhada. A nova fala propõe que ele nunca leve notebook ao caminhar. Proposta: distinguir passeio de deslocamento para trabalho, ou tratar a regra como aprendizado posterior à perda. Não apagar a missão silenciosamente.

### Wendel

A missão atual conclui a recuperação do HD sem uma pasta irrecuperável. A nova versão exige estado próprio para recuperação parcial, diálogo correspondente e conclusão bem-sucedida mesmo sem recuperar tudo. “Eu não pedi tudo” deve encerrar o arco sem exigir que o jogador continue tentando uma solução inexistente.

### Escopo dos andares

200 documentos e 200 andares são entregas diferentes. A extensão requer novas definições de mapas, capítulos, pistas, encontros, elevador, arquivo, persistência e verificações. Aumentar uma constante não implementa a campanha.

Os cinco capítulos atuais continuam organizando 1–50. Para a expansão, o tratamento propõe memória em 51–100, culpa em 101–150 e identidade em 151–200. Os blocos documentais de 25 registros atravessam essas divisões; sua relação deve ser de contraponto, sem forçar equivalência entre tema de sessão e decoração de cada andar.

## Arcos dos moradores

- **Wendel:** o HD parcialmente recuperado ensina que recuperar não é obter tudo de volta. Seu luto não substitui o do protagonista nem revela antecipadamente as perdas dele.
- **Letícia:** companhia silenciosa e fotografia antes de qualquer romance. A árvore caída permanece uma perda; a luz posterior não a justifica. As cenas centrais devem funcionar também em amizade.
- **Edu:** demonstra limites possíveis no trabalho remoto, sem ser apresentado como comparação moral que torna o protagonista culpado por adoecer.
- **Mari:** a disciplina encobre medo de ficar para trás. “Eu não consegui continuar” inicia uma conversa, não uma solução instantânea.
- **Alice:** respeita o direito de não contar e confronta a tentativa de pagar por amizade.
- **Jaqueline, Davi, Vitor, Luke e Wendel:** cuidados pequenos e separados sustentam o retorno à convivência.
- **Demais moradores:** preservar seus conflitos próprios, como a recuperação da mão de Davi, os turnos de Júlia e o projeto de memória de Roberto. A cidade não existe apenas para tratar o protagonista.

## Represa e ambiguidade

A represa possui evidências materiais: objetos retirados, energia, registros, calor e alterações físicas. A cena proposta com Hiago introduz percepção divergente; ela não confirma que toda a usina seja imaginária.

Manter sem resposta definitiva a origem dos documentos, a natureza dos monstros, o religamento, a coincidência 4471 e o conhecimento impossível sobre o desenho. A expansão substitui a antiga fronteira de exploração do andar 50, mas não deve transformar a pergunta sobre as profundezas em uma explicação total.

Os desenhos infantis em 101–150 podem antecipar formas reconhecidas apenas em 173. Evitar legendas, títulos de itens e índices que revelem “filha” antes da leitura correspondente.

## Encenação e conclusão

O silêncio do andar 50 marca reconhecimento, sem chefe ou fanfarra. A proposta de três tentativas de levantar ainda precisa ser resolvida como interação: recomendação de mostrar esforço numa animação com resposta perceptível ao comando, sem aparentar falha de controle.

Nos últimos andares, reduzir o combate e ampliar o vazio. O confronto final retoma as mensagens do prólogo: o protagonista interrompe a resposta, levanta e sai. Não atribuir vitória a eliminar uma criatura que represente sua condição.

No epílogo, responde “Amanhã de manhã” às 17h58 e fecha às 18h. A caixa do notebook está aberta; isso não exige voltar a usá-lo. A fotografia de Letícia e a presença junto à janela encerram o arco sem apagar dias difíceis.

Frase final: “A vida tranquila veio depois. E foi você que fez.”

# Vida pessoal e convivência — entrega de 22/09/2026

Esta entrega é parte da execução de `PENDENCIAS.md`. Não representa a conclusão de todas as propostas. O checklist permanece com os trabalhos restantes e com o complemento visual enviado pelo autor.

## O que está integrado

- Prólogo explorável na antiga casa: quatro momentos da madrugada, chamados com diagnósticos, objetos opcionais, posição e progresso persistentes, seguida da chegada já escrita. A duração de 10–15 minutos ainda precisa de expansão e avaliação humana; não foi artificialmente imposta por um cronômetro.
- Diário pessoal no menu de pausa. Cenas da campanha, vínculos, ações domésticas, eventos e noites deixam entradas. Saves anteriores recebem apenas textos das cenas que já viram, com as datas registradas.
- Oito pontos domésticos: café, banho, espelho, rádio, janela, correio, lembranças e baú. Não exigem compra de cômodos. Alimentar e conviver com um animal ainda dependem do sistema de companhia.
- Caixas, cortinas e louça mudam com o progresso. Foto de Letícia, pão/pano de Davi, peça de Luke e peça de Wendel têm condições próprias, aparência e textos. Correspondência entrega os dois últimos.
- Confiança, proximidade, conhecimento e afeto se apoiam em score, dias de conversa e confidências. Não convertem automaticamente amizade em romance. Há três cenas para cada um dos oito moradores dos retratos; expandir os outros moradores importantes continua pendente.
- Padrões sociais usam uma janela de 28 dias. Edu comenta trabalho tarde; Alice, ausência; Letícia, praça; Wendel, ferimentos recorrentes. Jaqueline, Hiago e Alice interpretam a noite anterior na represa.
- Conversas de grupo dependem da presença no mesmo lugar. A convivência altera uma fala adicional. Os eventos seguem rotinas e preservam postos interiores: noite no rio, feira, festival, jantar e memorial, nos dias 7, 14, 21, 25 e 28 de cada estação. Há textos de retorno para outros anos e registro do último marco no resumo dos saves.
- Celular acessível pelo menu: mensagens, blog, calendário, contatos, fotografias, álbum antigo em texto, trabalhos e mapa. Trabalhos reaproveitam a interface do computador. Mensagens têm demora em minutos do mundo; não exigem resposta imediata.
- Captura real sem HUD, armazenada em JPEG reduzido, até 20 imagens por partida. Fotografia liberada por Letícia. A moldura da casa e a do título compartilham a captura mais recente. A captura na cena separada das profundezas, o mural e fotografias autorais do álbum antigo ainda estão pendentes.
- Baú com nove memórias, filtradas antes de montar o índice: crachá 50, celular 75, recibo 110, aliança 126, foto 142, brinquedo 157, cartão 159, desenho 173 e pen drive 188. Não há causa ou culpado novo para as mortes.
- Tarjas de apresentação em cinco registros secundários, liberadas em releituras posteriores. O catálogo original não é modificado, e os registros das revelações centrais não recebem tarjas.
- Sonhos ocasionais com cinco espaços conectados e insônia às 02:47. Água, celular e varanda geram textos; levantar devolve o controle à casa; trabalhar abre a bancada digital; dormir retoma a manhã. Não há penalidade psicológica. Voltar à cama depois de levantar às 02:47 não pula mais um dia.
- Curativo visual abaixo de 75% de vida, falas de cuidado e cena após atendimento hospitalar bem-sucedido. Animações corporais adicionais de ferimentos ainda estão pendentes.

## Retratos e proveniência

Os oito atlas em `public/assets/retratos/` foram gerados com `image_gen.imagegen`, usando as folhas existentes como referência de identidade. Cada arquivo tem 1536×1024, seis células 512×512: neutro, feliz, preocupado, triste, irritado, surpreso. O fundo entregue é castanho; não se presume transparência.

Personagens: Edu, Mari, Jaqueline, Letícia, Wendel, Alice, Hiago e Vitor. Expressões explícitas podem ser definidas em `Fala.expressao`; a inferência por texto é apenas fallback. Configurações permitem desligar retratos. Os prompts finais estão em [retratos-prompts.json](retratos-prompts.json). Os sprites autorais no mapa foram preservados.

## Validação

- `npm run build`.
- `npm run verificar-tudo -- pendencias`: relatório em `evidence/pendencias-tests.json`.
- `npm run test:pendencias-browser`: movimento, quatro diagnósticos, reload, chegada, oito atlas × seis expressões, modo simples, interações domésticas, captura/álbum/save, cinco eventos e paginação, insônia e manhã sem salto extra, cinco salas do sonho.
- `npm run test:campanha-browser`: campanha completa e 150 salas/documentos, incluindo retomada, final e epílogo.
- `npm run test:partidas-browser`: quatro espaços, backup, miniaturas e retomada.

As duas últimas suítes exercitam o prólogo legado deliberadamente, para verificar saves anteriores; a suíte nova percorre a abertura explorável real. As novas flags usam a estrutura existente do save.

## Trabalho ainda aberto

O checklist é a referência completa. Entre os blocos restantes estão arte modular definitiva, roupas e poses, tilesets, fauna e companhia, culinária e consertos ampliados, aniversários, cultura e projetos tardios, clima extremo, reforma ambiental da represa, navegação/câmera, mural e interfaces. Não remover `PENDENCIAS.md` até concluir e verificar esses trabalhos.

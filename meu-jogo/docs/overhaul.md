# Overhaul — auditoria e execução

Base: revisão `08bb66f`, relatório local de 344 páginas, texto extraído e evidências em `relatorios/auditoria-projeto`. Branch de implementação: `feat/game-overhaul`. A narrativa, IDs e ordem dos 50 arquivos são protegidos.

## Arquitetura real e propriedade do save

`main.ts` inicia quatro cenas. `BootScene` carrega assets, registra animações e restaura o save. `FarmScene` (3.811 linhas) integra movimento, mapas, colisão, interação, construção, arquivo e puzzles; `CamadaRepresa` isola renderização/combate; `MaoDoJogador` apresenta equipamento. `UIScene` (1.721 linhas) possui HUD e modais. `ComputadorScene` e `JanelaApp` possuem foco e ciclo de vida dos sete aplicativos.

`game/estado.ts` é o proprietário persistente. `FarmScene.salvarJogo` reúne snapshots; `save.ts` grava localStorage; `BootScene.aplicarSave` distribui os dados aos restauradores. Inventário, carteira, relações, trabalhos, casa, cidade, vida, equipamento, armas e arquivo possuem serialização própria. `worldEvents` guarda progresso permanente da represa; `itensColetados` impede coleta repetida; `represa` guarda somente a corrida atual. Rotinas são reconstruídas do dia e emprego, não serializadas. Teclas são distribuídas entre cenas e aplicativos, sem roteador único.

`npcs.ts` já incorpora os 24 moradores ao registro dos 33 NPCs. `rotinasNpc.ts` executa agendas e waypoints. `cidade.ts` substitui atividades, mas conserva os limites antigos e o mapa da atividade se perde na conversão para ação. Interações e marcadores consultam a residência estática. `loja.ts` verifica capacidade/saldo antes das transações; carteira usa centavos. Relações limitam interações diárias; missões pessoais concedem recompensas via sistema próprio. Itens têm registro e comportamentos em `equipar.ts`; não criar outro registro paralelo.

## Matriz de lacunas e riscos

| Área | Base real | Lacuna / próxima intervenção |
| --- | --- | --- |
| Save | v6 sem validação da raiz | Reparar campos isolados; migrações e backups transacionais |
| Emprego | 4 projetos, 12 combinações | Horário autoritativo e mapa em runtime |
| Trabalho | 5 vagas + missões | Viewport limitado, seleção visível e roda |
| Blog | 9 autores, determinístico | Corte por minuto e atualização da publicação |
| Animação | Registro duplicado no boot | Usar NPCS e criação idempotente |
| Mundo | 4 externos + 23 interiores + 50 andares | Remap por região com validação de acessos |
| Tempo | Semana e relógio | Estações, ano, clima e calendário persistentes |
| UI | Widgets próprios no PC, painéis nas cenas | Tokens, componentes, foco, acessibilidade e gamepad |
| Progressão | Missões, relações, casa e obras | Conquistas reais, coleções, economia simulada |
| Produção rural | Cenário e lojas | Cultivo, extração e reciclagem opcionais |
| Dev | Teclas de depuração públicas | Proteção DEV e confirmação de exclusão |
| Assets | Fontes de arte em public | Manifesto; separar fontes preservando geradores |

Discrepâncias relevantes: carregamento sob demanda dos andares **já existe**; melhorá-lo, não duplicá-lo. O arquivo de narrativa já tem 50 fichas; os cinco setores antigos não representam todos os andares. Navegador não é fachada; conquistas ainda são somente apresentação. Topologia atual radial: bairro a oeste, rural a leste, represa ao norte do centro.

## Plano dos bugs

1. BUG-01: Array.isArray por campo, validar IDs próprios e candidatos, preservar entradas válidas; testar estruturas malformadas.
2. BUG-02: objeto de turno compartilhado, recortar agendas nas bordas de 08h/17h, derivar diálogo da mesma configuração; testar todas as combinações e finais de semana.
3. BUG-03: modelo reutilizável de janela de linhas, ocultar/desativar entradas externas, PageUp/Down e roda com limpeza no fechamento; verificar oito linhas no navegador.
4. BUG-04: mapa atual no estado de NPC e nas ações; renderização, colisão e marcadores usam runtime; residência permanece estática.
5. BUG-05: consulta exige dia e minuto; determinismo preservado, refresh quando minuto muda.
6. BUG-06: registro canônico no carregamento e proteção por chave no registro das animações.

## Estratégias das fases seguintes

Remap: centro com ruas, circuitos e marcos comerciais; bairro com oficina como âncora e lotes de obras; rural com percursos e áreas de produção; acesso da represa com transição industrial gradual. Revisar os 23 interiores por uso e personalidade, preservando residências. Remasterizar os 50 andares por capítulos de dez, mantendo IDs/textos/flags e sequência de revelação. Validar spawns, passagens, missões e colisões antes de substituir cada mapa.

UI: extrair tokens e listas do que existe; padronizar HUD, inventário, lojas, diário e DevOS em 480×270. Um dono de foco por modal; planejamento pausa a simulação. Acrescentar título, pausa e opções antes de redesenhar todas as telas.

Tempo: derivar dia semanal, estação, dia da estação e ano do dia absoluto (28 dias por estação, configurável); clima determinístico por dia/estação, persistir seed e overrides. Evento de virada aciona recursos, rotinas e visuais. Luz interpolada por hora; variantes de vegetação, sem depender apenas de overlay.

NPCs: manter agendas autorais, explicitar mapa/atividade/posição e prioridades; emprego sobrepõe horário, chuva desloca atividades opcionais para abrigo; missões importantes continuam acessíveis. Preservar famílias e restrições de romance. Melhorar transições por waypoints/off-screen com testes dos 33 NPCs.

Economia: simular renda diária, custos e tempo até compras antes de rebalancear; conectar materiais, sucata, obras e reparos. Conquistas e coleções observam eventos tipados reais de transação/conclusão, com data persistente. Hospital e ônibus ganham serviços após obra, sem alterar resgate narrativo.

Dev: guardas de compilação DEV, painel explícito por domínio; ações destrutivas confirmadas, exportação/backup antes de importar. Medidas de FPS e frame time, contagens de entidades e assets carregados.

## Base de desempenho

Build inicial passou: JS 1.608,96 kB, gzip 451,24 kB; public soma 268.978.461 bytes (tamanho distribuído, não tráfego de boot). Vite: 9,87 s, aviso de chunk >500 kB. FPS e tempo até jogável ainda precisam de medição própria. Evidências antigas são referência, não resultados desta execução.

## Roteiro e critérios

0 auditoria/base → 1 seis bugs/documentação → 2 migração/eventos/input → 3 UI/opções/título → 4 remap → 5 estações/clima → 6 NPC/social → 7 economia/itens → 8 atividades rurais → 9 trabalho/DevOS → 10 represa → 11 dev → 12 acessibilidade/áudio → 13 desempenho → 14 regressão/release.

Cada fase exige typecheck/build, validadores existentes, testes direcionados, navegador, save/reload e console. Registrar evidências e pendências; não declarar a remasterização concluída enquanto fases e critérios de release estiverem pendentes.

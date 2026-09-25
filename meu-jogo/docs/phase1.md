# Fase 1 — correções da auditoria

## Implemented
Tratamento defensivo da cidade, horários compartilhados, mapa runtime, lista de trabalho limitada ao viewport, corte temporal do blog e registro único das animações. README e comentários corrigidos para a topologia e funcionalidades atuais.

## Architecture
`turnoDoFuncionario` alimenta texto e agenda; `TURNO_CIDADE` fornece limites compartilhados. `EstadoNpc.mapaAtual` é propagado das atividades às ações, à renderização, colisão e aos marcadores. `ListaRolavel` mantém seleção e janela de linhas coerentes, sem dependência de Phaser.

## Gameplay
Os 12 vínculos de emprego cumprem 08h–17h nos dias úteis; João aparece na padaria no bairro, mantendo sua residência rural. Posts só aparecem na hora de publicação. Vagas pessoais e diárias continuam acessíveis juntas.

## UI/Art
Lista com cinco linhas inteiras, indicação de intervalo, roda, setas, PageUp/Down e Home/End. Linhas externas são ocultas e têm hit area desativada. Descrição compactada para caber no painel. Capturas em `docs/evidence/phase1-*.png`. Sem alteração de arte ou mapas nesta fase.

## Save Compatibility
Permanece v6; cidade repara cada array e descarta apenas entradas inválidas. Snapshot válido de cidade preserva construções e funcionário; save/reload confirmado no navegador. Migração completa é trabalho da próxima fase.

## Bugs Fixed
BUG-01 a BUG-06 têm cobertura de regras e/ou navegador. DOC-01 corrigido nos trechos identificados. Nenhum texto de narrativa foi alterado.

## Tests
TypeScript e build passaram. Os oito validadores existentes e `verificar-overhaul` passaram. Chrome/Playwright abriu 77/77 mapas e sete apps, percorreu oito vagas, testou teclado/PageUp/roda, presença e colisão de João, save/reload e cidade com null/número/string. Console: zero erros e zero warnings. Resultados em `phase1-tests.json` e `phase1-browser.json`.

## Performance
JS passou de 1.608,96 para 1.611,15 kB; gzip de 451,24 para 451,91 kB. Não houve otimização de payload nesta fase. Tempo até jogável no servidor de desenvolvimento/Chrome local: 4.609 ms (amostra única; não comparar com produção). Aviso de tamanho do bundle continua.

## Known Remaining Work
Fases 2–14 do roteiro permanecem abertas. Não há remap, redesign completo, novo calendário/clima, produção rural, conquistas funcionais ou suporte completo a gamepad nesta entrega. A ativação de emprego continua com o ciclo diário existente. O teste de navegador é uma regressão direcionada, não substitui toda a campanha de gameplay exigida para release.

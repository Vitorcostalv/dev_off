# Fase 2 — proteção de persistência e desenvolvimento

## Implemented
Save v7 com migração de v6, normalização, validação, reparo e criação de save padrão. Escrita temporária validada antes de substituir o ativo; até três backups. Seleção/restauração com confirmação no F8 em desenvolvimento. F4 exige confirmação e backup. Atalhos de depuração só são registrados em builds DEV. Mapa pausa relógio e rotinas. Coordenadas fora dos limites do mapa usam o spawn padrão.

## Architecture
`SaveMigration.ts` normaliza usando os restauradores que já pertencem a cada domínio, sem duplicar a propriedade do estado. `save.ts` controla storage, staging e snapshots. Migração é idempotente. Versões futuras são preservadas e não sobrescritas por este cliente.

## Gameplay
Dados recuperáveis deixam de impedir o carregamento; corrupção em cidade não apaga dinheiro, relações ou arquivos. A recuperação escolhe uma cópia anterior e recarrega a sessão somente após confirmar a escrita. Ao abrir o mapa, o planejamento não consome tempo de jogo.

## UI/Art
Reutiliza menus e confirmação existentes para backups. Sem alteração de narrativa, assets ou mapas nesta etapa.

## Save Compatibility
v6 → v7 automático, preservando posição válida, data/hora, inventário, dinheiro, relações, trabalhos, móveis, obras, flags, vida, equipamento, carregadores e arquivo. Campos inválidos são normalizados pelos domínios. Falta de espaço para migration não impede ler a cópia reparada em memória; o arquivo ativo anterior permanece intacto. JSON não parseável não é automaticamente substituído.

## Bugs Fixed
Amplia a proteção de BUG-01 para a fronteira de save. Corrige avanço do relógio com mapa aberto e atalhos destrutivos sem confirmação em produção. Quantidades fracionárias e IDs herdados do protótipo não entram no inventário restaurado.

## Tests
Os oito validadores existentes, `verificar-overhaul` e `verificar-save` passaram. Save: formato antigo/atual, cada campo com dados inválidos, idempotência, versão futura, snapshot/restore e falhas em backup/staging/ativo. Chrome: migração real v6, preservação de dinheiro/arquivos, mapa congelando relógio, cancelamento de F4/F8, teclas F sem mutação no build de produção e ausência dos globais de debug.

A regressão completa do navegador foi repetida após a migração: 77/77 mapas, sete apps, oito vagas, trabalhador com colisão no bairro e save/reload; zero erros e zero warnings. Evidências em `phase2-regression-browser.json` e capturas com o mesmo prefixo. A janela de Trabalho foi inspecionada visualmente.

## Performance
Build com JS de 1.612,64 kB e gzip de 452,53 kB. O aviso de bundle acima de 500 kB permanece. Não se reivindica melhoria de desempenho.

## Known Remaining Work
Esta é uma **parte da Fase 2**, não a fase completa: barramento tipado de eventos, roteador de ações e extração adicional das responsabilidades de cena continuam pendentes. O painel completo de desenvolvimento pertence à etapa posterior. Ainda faltam as fases de UI, remap, estações/clima, NPCs, economia/produção, expansão do DevOS, represa, acessibilidade/áudio e otimização. A remasterização integral não está concluída.

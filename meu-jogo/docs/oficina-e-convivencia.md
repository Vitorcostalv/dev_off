# Oficina e convivência — etapa de 25/09/2026

Terceira etapa da execução de [PENDENCIAS.md](PENDENCIAS.md), depois de [vida pessoal e convivência](vida-pessoal-convivencia.md) e [vida na cidade](vida-na-cidade.md). Esta etapa fecha o bloco de trabalho, refeições e descanso inteiro. O checklist permanece com o que falta.

## Oficina (`src/game/oficina.ts`, `src/pc/apps/trabalho/inspecao.ts`)

O quebra-cabeça de encaixe continua sendo a parte de habilidade. O que entrou foi o serviço em volta dele.

- **Inspeção antes de abrir**: seis falhas (capacitor, cabo, fusível, bateria, solda e trilha de placa), doze sintomas — dois por falha —, três pistas cada e quatro hipóteses por vaga, sempre com a certa entre elas. Tudo determinístico por vaga e dia: o mesmo aparelho no mesmo dia chega com a mesma história.
- Acertar o diagnóstico paga 15% a mais; errar paga 15% a menos e rende uma fala dizendo qual era a falha. **Errar não cancela o serviço** e não impede o conserto.
- **Preço combinado**: cobrar menos (0,75), o justo (1,0) ou mais (1,3). O eixo de preço da reputação piora nos dois extremos, e mais depressa no caro.
- **Seis clientes recorrentes** (Dona Ilza, Seu Tarcísio, Bel, a clínica, Bruno e a escola). O aparelho que cada um traz muda conforme as visitas e a fala acompanha: a quarta já é a de quem conhece a porta da oficina.
- **Reputação em quatro eixos** — confiabilidade (serviços concluídos), velocidade (tempo que sobrou), qualidade (diagnósticos certos) e preço. Sem histórico, todos ficam em 50: a cidade ainda não tem opinião. Média alta traz até duas vagas a mais no quadro do dia, e nunca tira as que já existiam.
- **Carga de contratos**: o jogador combina consigo mesmo de 1 a 5 serviços por dia, no painel Oficina do celular. Passar disso não bloqueia nada — rende uma observação e uma entrada no caderno. Sete dias seguidos de bancada rendem outra.
- **Dia livre**: declarável enquanto o dia não teve serviço, fecha o quadro de vagas (as missões pessoais continuam), escreve no caderno e pode ser desfeito. Domingo já chega mais vazio por conta própria.

## Convivência (`src/game/convivencia.ts`)

- **Bancos de praça**: os sete bancos dos mapas externos viraram pontos de interação. Sentado, o relógio corre seis vezes mais rápido, o lugar rende observações a cada quinze minutos de jogo e, depois de vinte e cinco, alguém com quem já se convive pode sentar junto. Levantar é [E] ou qualquer direção.
- **Caminhadas com Edu e Letícia**: a rotina do morador é pausada e ele acompanha o jogador pelo mapa — inclusive atravessando mapas. Cada lugar novo (praça, mercado, rio, escola, estação, rua, roça, estrada) rende uma fala própria daquele morador, uma vez cada. Encerrar é uma opção de conversa; fica registro no caderno e nenhuma recompensa.
- **Acompanhar um morador**: o contrário — a rotina dele segue e o jogador vai junto. Termina quando ele para onde ia. Se vocês se separarem, o texto diz isso e nada mais acontece.

## Refeições e receitas (`src/game/refeicoes.ts`)

Comer não restaura nada: o jogo não tem fome. Uma refeição por dia entra no caderno; comer de novo continua permitido e só muda o texto.

- Comer sozinho em casa (o texto muda quando a casa fica habitada), comer no balcão do bar com Alice, jantar ou almoçar com alguém (meio ponto de relação, exige 5 de relação e hora de refeição) e cozinhar para quem foi convidado.
- Quatro receitas, cada uma vinda de uma cena de vínculo já vivida: pão de Davi, conserva de Neide, petisco do bar de Alice e a receita sem medida de Jaqueline. Ler a receita pela primeira vez registra a história de quem ensinou.

## Validação

- `npm run build` (tsc + vite).
- `npm run verificar-oficina`: doze sintomas e seis falhas, quatro hipóteses distintas e estáveis em 180 combinações de vaga e dia, ajuste de pagamento nos dois sentidos, seis clientes com aparelho existente no catálogo, quatro eixos de reputação, vagas extras com teto, carga do dia, excesso registrado uma vez, sete dias seguidos, dia livre reversível e persistência no save.
- `npm run verificar-convivencia`: lugares por mapa e tile, caminhada com fala por lugar e sem repetição, acompanhamento que só vira registro quando chega, observações de banco em ciclo, quem senta junto, refeições nos quatro modos, as quatro receitas presas a cenas de vínculo e o save.
- `npm run test:oficina-browser`: no Chrome, sentar num banco do parque com o relógio correndo, caminhada com Edu (ele sai da rotina, se aproxima e comenta o lugar), cozinha com receita aprendida, painel da oficina com carga e dia livre, quadro fechado no dia livre, inspeção antes do quebra-cabeça, escolha de preço e registro de reputação, visita e carga ao terminar o conserto. Evidências em `docs/evidence/banco-praca.png`, `oficina-inspecao.png`, `oficina-reputacao.png` e `oficina-conserto.png`.
- `npm run verificar-tudo -- bloco4`: 32/32 conferências offline.
- `npm run test:vida-na-cidade-browser` e `npm run test:pendencias-browser` seguem passando (os pontos domésticos agora são dez, ou onze com bicho em casa).

## O que esta etapa não entrega

Segue pendente o que está no checklist: prólogo de 10–15 minutos, álbum e mural de fotografias, ferimentos visuais e consultas, rádio/jornal/biblioteca/museu/ferrovia/ônibus, clima extremo e mudanças urbanas, represa ambiental e conquistas, arte modular ilustrada, tilesets, iluminação, rotinas/câmera e interfaces.

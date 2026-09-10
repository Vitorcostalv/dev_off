import { TEXTOS_DE_FICHA } from './fichas.ts';
import { TEXTOS_DE_PISTA } from './enigmas.ts';

/**
 * TEXTOS DE EXAME da represa — placa de estrada e documento de manutencao.
 *
 * Sao o unico lugar onde as RESPOSTAS dos enigmas existem. A regra que todos os
 * paineis seguem e que nada e adivinhavel: a ordem dos disjuntores, o par de
 * cabos, a sequencia dos geradores, o codigo da comporta e os dois pedacos do
 * codigo de manutencao estao escritos aqui, cada um num documento que fica no
 * setor onde faz sentido estar.
 *
 * A distribuicao e deliberada, e e o que faz o enigma profundo exigir ter
 * andado a usina inteira:
 *
 *   quadro de disjuntores  -> log_entrada        (nivel 0)
 *   par de cabos           -> legenda_cabos      (nivel -1)
 *   simbolo de risco       -> log_manutencao     (nivel -1)
 *   ordem dos geradores    -> log_geradores      (nivel -2)
 *   codigo da comporta     -> log_comportas      (nivel -3)
 *   componente queimado    -> log_placa          (nivel 0)
 *   codigo, primeira metade-> placa_turbina      (nivel -2)
 *   codigo, segunda metade -> terminal_profundo   (nivel -4)
 *
 * A chave de cada entrada e o `aviso` do objeto no tilemap; os documentos dos
 * setores levam o prefixo `represa_` (ver `gerarSetorRepresa`).
 */
/**
 * MARCOS DE LABIRINTO — o texto de cada ponto de referencia, por andar.
 *
 * Os tres labirintos autorais sao reusados em cinco andares (8, 17, 26, 34 e 43),
 * e o mesmo marco aparece duas vezes na descida. O texto muda: no andar 8 o tubo
 * azul e uma informacao de manutencao, no 34 ele e a mesma informacao escrita por
 * cima de outra coisa. E o que faz o reuso de layout nao ler como reuso.
 */
const MARCOS_DE_LABIRINTO: Record<string, Record<number, string[]>> = {
  tubo_azul: {
    8: [
      'Um tubo azul de agua de servico, com a legenda ainda legivel.',
      'AGUA DE SERVICO — segue pro fundo da galeria. A seta aponta pra baixo e pra frente.',
    ],
    34: [
      'O mesmo tubo azul, e por cima da legenda alguem escreveu com fita crepe: "ATE AQUI".',
      'A fita e nova. A legenda de baixo continua dizendo que o tubo segue pro fundo.',
    ],
  },
  tubo_vermelho: {
    8: [
      'Tubo vermelho de incendio, com o registro fechado e lacrado.',
      'A legenda diz: RETORNO — sobe pra escada. Quem se perder segue o vermelho.',
    ],
    34: [
      'Tubo vermelho. O lacre do registro foi cortado e refeito com arame.',
      'A legenda de retorno continua ali, e alguem riscou a palavra "escada".',
    ],
  },
  porta_numerada: {
    8: [
      'Porta de servico com um numero pintado a estencil: 14.',
      'A numeracao da usina sobe no sentido do fundo. A 14 e a antepenultima deste ramal.',
    ],
    34: [
      'Porta de servico numerada 14 — a mesma numeracao, no mesmo lugar do ramal.',
      'A tinta esta fresca. A usina nao tem tinta fresca em lugar nenhum.',
    ],
  },
  cabo_marcado: {
    17: [
      'Um feixe de cabos com anilha de identificacao a cada metro.',
      'As anilhas contam pra cima na direcao da saida: 01 na escada, 09 no fim do ramal.',
    ],
    43: [
      'O feixe de cabos, e as anilhas contando pra cima como sempre.',
      'Depois da 09 ha uma 10, escrita a mao. O ramal deveria acabar na 09.',
    ],
  },
  painel_cego: {
    17: [
      'Um painel de comando sem botao nenhum: chapa lisa, parafusada, sem etiqueta.',
      'Quem instalou nao deixou registro. Serve de referencia: e o unico painel cego do andar.',
    ],
    43: [
      'O painel cego. A chapa lisa agora tem um furo de fechadura no canto.',
      'A fechadura e do tipo que a usina usa nas portas de cracha.',
    ],
  },
  maquina_parada: {
    17: [
      'Uma bomba de recalque parada no meio do ciclo, com o eixo travado.',
      'Ela e o marco de meio caminho do ramal leste. Da pra ouvir agua atras dela.',
    ],
    43: [
      'A bomba de recalque, parada no mesmo ponto do ciclo.',
      'O eixo esta morno, e o piso em volta dela esta seco num raio de dois metros.',
    ],
  },
  baia_23: {
    26: [
      'Uma divisoria de baia de escritorio, com a etiqueta 23 na aba de plastico.',
      'Nao ha escritorio nenhum nesta usina. A divisoria esta parafusada no concreto.',
      'As baias contam de 01 a 40 e a numeracao sobe no sentido do fundo.',
    ],
  },
  monitor_ligado: {
    26: [
      'Um monitor de tubo, ligado, sem cabo de dados nem de energia.',
      'Na tela, uma planilha de horas com o cabecalho cortado pela borda.',
      'A coluna da direita soma sessenta e cinco.',
    ],
  },
  quadro_prazos: {
    26: [
      'Um quadro branco parafusado na parede, com tres datas e uma seta entre elas.',
      'As datas nao sao de calendario nenhum que a usina use: sao de tres anos depois do ' +
        'desligamento dela.',
      'A ultima esta circulada duas vezes.',
    ],
  },
};

/**
 * Todo texto de marco de labirinto, na chave `<id>_<andar>` que o gerador usa.
 * Um marco sem texto pro andar em que ele aparece derruba a conferencia — e o
 * mesmo contrato de qualquer aviso do mundo.
 */
const TEXTOS_DE_MARCO: Record<string, string[]> = Object.fromEntries(
  Object.entries(MARCOS_DE_LABIRINTO).flatMap(([id, porAndar]) =>
    Object.entries(porAndar).map(([andar, linhas]) => [
      `${id}_${String(andar).padStart(2, '0')}`,
      linhas,
    ]),
  ),
);

const AVISOS_ESCRITOS_A_MAO: Record<string, string[]> = {
  // ------------------------------------------------- predios FECHADOS --
  // Predio de pe cuja porta nao abre: no lugar dela o mapa poe um objeto de
  // exame com estes textos. Estavam na FarmScene e vieram pra ca quando a
  // conferencia passou a cobrar texto pra TODO aviso do mundo — deixar metade
  // dos textos numa cena e metade aqui era o caminho pra sobrar placa muda.
  casa_1: [
    'A porta esta fechada com um cadeado velho.',
    'Local desativado. Ninguem mora aqui agora.',
  ],
  central: [
    'Central Telefonica Municipal — parece abandonada ha muitos anos.',
  ],
  portaria_represa: [
    'PORTARIA — apresentar credencial. Registro de entrada e saida obrigatorio.',
    'O livro de registro esta aberto no balcao, atras do vidro. A ultima linha e ' +
      'de tres anos atras e a letra dela e a mesma das anotacoes lá dentro.',
  ],
  galpao_represa: [
    'GALPAO DE SERVICO 2 — ferramentaria e almoxarifado.',
    'A porta de enrolar esta emperrada a meio metro do chao e por baixo dela sai ' +
      'um cheiro de oleo queimado.',
  ],

  // --------------------------------------- placas de rua do centro (Mapa 1) --
  /**
   * As quatro placas do centro remapeado. Elas resolvem uma falta antiga: o
   * cruzamento das avenidas nao dizia pra onde ia nenhuma das pontas, e quem
   * chegava descobria o mundo por tentativa. Cada texto diz o rumo e uma coisa
   * so sobre o lugar — placa nao e folheto.
   */
  centro_cidade: [
    'PRACA CENTRAL — Cruzamento da Avenida com a Rua do Anel.',
    'O mapa esbocado na placa mostra o anel em volta do centro, o bairro a oeste, '
      + 'a zona rural a leste e a estrada da represa subindo ao norte.',
    'Alguem colou um papel no canto: "conserto de eletronico, oficina no bairro". '
      + 'A letra e a sua.',
  ],
  rumo_bairro: [
    'BAIRRO DA ESTACAO — 1 km a oeste. Oficina, escola, biblioteca.',
    'A tinta da seta foi refeita mais de uma vez, sempre um pouco fora do lugar.',
  ],
  rumo_rural: [
    'ZONA RURAL — estrada de terra. Madeireira, pedreira e as chacaras.',
    'Embaixo, uma placa menor e mais nova: "cuidado com maquina agricola na pista".',
  ],
  rumo_represa: [
    'ESTRADA DA REPRESA — 9 km ao norte. Trafego de servico.',
    'O poste da placa esta torto e ninguem endireitou. A seta continua apontando '
      + 'pro norte, e nao ha o que discutir com ela.',
  ],

  /**
   * A INTERDICAO da ponta sul do Mapa 1 — a reserva pro mapa futuro.
   *
   * O texto e a unica coisa que impede a barreira de ler como bug: sem ele, uma
   * parede no meio da estrada e so uma parede no meio da estrada. Ver
   * `INTERDICAO_SUL` em tools/gerar-assets.mjs.
   */
  estrada_sul: [
    'ESTRADA INTERDITADA — Obras de recuperacao da pista. Sem previsao.',
    'Atras da barreira a estrada continua, mas o asfalto cedeu num trecho longo.',
    'Alguem escreveu a caneta embaixo do aviso: "quando abrir, da pra chegar no distrito".',
  ],

  // ------------------------------------------- marcos do Mapa 4 (estrada) --
  estrada_represa: [
    'USINA DA REPRESA — 9 km. Trafego de servico somente.',
    'A placa esta furada de tiro de chumbinho e a seta aponta pra cima, pro norte.',
  ],
  piquenique_represa: [
    'AREA DE LAZER DA USINA — churrasqueira, bebedouro, banheiros.',
    'Do que a placa promete sobrou uma cerca caida e tres bases de concreto no mato.',
  ],
  mirante_represa: [
    'MIRANTE DO VERTEDOURO — nao apoie no guarda-corpo.',
    'Daqui de cima da pra ver o rio saindo estreito e revolto por baixo da barragem.',
    'A agua faz um barulho constante, grave, que parece vir de dentro do concreto.',
  ],
  canal_represa: [
    'CANAL DE DRENAGEM 3 — vazao maxima 1,2 m3/s.',
    'O canal esta seco, mas o fundo dele e limpo, sem folha nem limo. Como se ainda passasse agua.',
  ],
  subestacao_represa: [
    'SUBESTACAO DESATIVADA — equipamento removido. Risco eletrico remanescente.',
    'Nao ha equipamento nenhum dentro do muro, so cascalho e as bases dos transformadores.',
    'Uma delas esta quente.',
  ],
  portao_represa: [
    'AREA RESTRITA — SOMENTE AUTORIZADOS. Portaria obrigatoria.',
    'A guarita esta vazia e o portao esta destravado. O cadeado foi cortado por dentro.',
  ],
  barragem: [
    'BARRAGEM DA USINA — 1961. Concreto gravidade, 78 m de crista.',
    'A crista atravessa o vale de ponta a ponta. Nao ha passagem pelo coroamento: ' +
      'a unica porta e a da casa de forca, aqui embaixo.',
  ],

  // -------------------------------------------------- documentos do nivel 0 --
  /** PISTA do puzzle 1 — a ordem do quadro de disjuntores. */
  represa_log_entrada: [
    'DIARIO DE ENTRADA — folha solta, presa com clipe enferrujado.',
    '"Religamento apos parada: BOMBA DE DRENAGEM primeiro, ILUMINACAO depois, ' +
      'VENTILACAO por ultimo."',
    '"O comando geral fica DESLIGADO. Quem religar o comando geral antes dos tres ' +
      'derruba o quadro inteiro outra vez."',
  ],
  represa_mapa_setores: [
    'MAPA DA USINA — quadro emoldurado no hall.',
    'Cinco niveis: 0 casa de forca, -1 manutencao, -2 galeria das turbinas, ' +
      '-3 galerias inferiores, -4 poco de drenagem.',
    'Alguem passou caneta sobre o nivel -4 e escreveu ao lado: "nao esta no projeto original".',
  ],
  /** PISTA do puzzle 6, passo 1 — o componente queimado. */
  represa_log_placa: [
    'REGISTRO DE MANUTENCAO 114/C — arquivo do nivel 0.',
    '"Placa mestre desligada. Sintoma: reinicia sozinha sob carga. Ondulacao de 4 V ' +
      'na saida de 12 V."',
    '"Ondulacao dessa ordem e CAPACITOR DE FILTRO estufado. Ja foi o terceiro. Pedi ' +
      'reposicao e ninguem mandou."',
  ],

  // ------------------------------------------------- documentos do nivel -1 --
  /** PISTA do puzzle 3 — o par de cabos do comando da bomba. */
  represa_legenda_cabos: [
    'LEGENDA DE CABEAMENTO — placa de aluminio parafusada na parede.',
    'FORCA: azul e cinza.   TERRA: verde-amarelo.   COMANDO: MARROM (fase) e PRETO (retorno).',
    'Abaixo, a lapis: "o vermelho nao vai em par com nada, e sinal de teste".',
  ],
  /** PISTA do puzzle 2 — o simbolo de risco eletrico. */
  represa_log_manutencao: [
    'ORDEM DE SERVICO 88 — presa num prego.',
    '"Armario de suprimentos fechado com trava de simbolo. O simbolo e o mesmo da ' +
      'porta do quadro: TRIANGULO COM RAIO."',
    '"O de gota e agua de servico, o de chama e o extintor e o de engrenagem e ' +
      'ferramentaria. Nao confunda outra vez."',
  ],

  // ------------------------------------------------- documentos do nivel -2 --
  /** PISTA do puzzle 6, passo 3 — a primeira metade do codigo. */
  represa_placa_turbina: [
    'PLACA DE IDENTIFICACAO — Turbina 2, fundida no proprio corpo.',
    'FABRICACAO 19 . . / SERIE 4471 / ROTACAO 300 rpm',
    'Os dois digitos do ano depois do 19 foram limados. Debaixo da placa, a lapis de ' +
      'cera: "a manutencao usa os DOIS PRIMEIROS: 19".',
  ],
  /** PISTA do puzzle 4 — a ordem de partida dos geradores. */
  represa_log_geradores: [
    'DIARIO DE OPERACAO — caderno aberto na bancada, letra apressada.',
    '"Partida em vazio, sempre nesta ordem: G3, G1, G4, G2."',
    '"O G3 e o unico com excitatriz propria, por isso vai na frente. Fora dessa ordem ' +
      'o disjuntor de campo abre e tem de comecar tudo de novo."',
  ],
  represa_camera_quebrada: [
    'Uma camera de teto, arrancada do suporte e pendurada pelo cabo.',
    'A lente esta intacta e o LED de gravacao esta ACESO. O cabo dela nao chega a ' +
      'lugar nenhum: foi cortado a uns trinta centimetros.',
  ],

  // ------------------------------------------------- documentos do nivel -3 --
  /** PISTA do puzzle 5 — a sequencia das valvulas e o codigo de liberacao. */
  represa_log_comportas: [
    'PROCEDIMENTO DE COMPORTA — folha plastificada, colada no vidro.',
    '"1) ALIVIO.  2) BYPASS.  3) SERVICO.  Nunca antes de a pressao cair."',
    '"O fecho de emergencia NAO entra na sequencia — quem abre o fecho trava a mesa."',
    'No rodape, impresso: "Liberacao: 47".',
  ],
  represa_terminal_morto: [
    'Um terminal de operacao com a tela partida em diagonal.',
    'Ele esta LIGADO. A metade que ainda mostra imagem repete uma linha so: ' +
      '"AGUARDANDO PLACA MESTRE".',
  ],
  represa_modificacao_estranha: [
    'Alguem soldou um segundo barramento por cima do original, sem etiqueta e sem norma.',
    'A solda e recente — o fluxo ainda esta brilhante. Os cabos dela descem pelo ' +
      'furo de drenagem, na direcao do nivel -4.',
  ],

  // ------------------------------------------------- documentos do nivel -4 --
  /** PISTA do puzzle 6, passo 3 — a segunda metade do codigo. */
  represa_terminal_profundo: [
    'Um terminal montado a mao, com peca de tres epocas diferentes.',
    'Na tela, uma linha de registro: "SESSAO 82 — ENCERRADA PELO OPERADOR".',
    'Colado na moldura, um papel: "codigo de manutencao = ano da turbina + numero da ' +
      'sessao". A sessao e 82.',
  ],
  represa_placa_fabricante: [
    'Uma placa de fabricante sem fabricante: so o numero de patrimonio e um logotipo ' +
      'que nao e o da usina.',
    'O logotipo e uma onda dentro de um circulo. Nao aparece em nenhum outro lugar ' +
      'da represa.',
  ],
  represa_anotacao_final: [
    'Uma folha de caderno, dobrada em quatro, presa atras de um armario.',
    '"Desliguei tudo em marco. Voltei em maio e o nivel -4 estava com energia."',
    '"Nao fui eu. Nao foi a concessionaria. Nao vou descer de novo."',
    'A folha nao esta assinada, e a data esta rasgada.',
  ],
};

/**
 * TODO texto de exame do jogo, num registro so.
 *
 * Sao quatro fontes e nenhuma quinta:
 *
 *   AVISOS_ESCRITOS_A_MAO   placa de rua, predio fechado, marco do Mapa 4 e os
 *                           onze documentos autorais dos cinco primeiros andares;
 *   TEXTOS_DE_FICHA         as cinquenta fichas medicas (src/game/fichas.ts);
 *   TEXTOS_DE_PISTA         as pistas dos quarenta e cinco enigmas gerados, que
 *                           nascem junto do proprio enigma (src/game/enigmas.ts);
 *   TEXTOS_DE_MARCO         os pontos de referencia dos cinco labirintos.
 *
 * Chave repetida entre as fontes derruba a carga em vez de um texto sobrescrever
 * o outro em silencio — foi por um texto sobrescrito que a placa da portaria
 * ficou muda na leva anterior.
 */
export const ITENS_DE_LEITURA: Record<string, string[]> = (() => {
  const registro: Record<string, string[]> = {};
  const fontes: [string, Record<string, string[]>][] = [
    ['escritos a mao', AVISOS_ESCRITOS_A_MAO],
    ['fichas medicas', TEXTOS_DE_FICHA],
    ['pistas de enigma', TEXTOS_DE_PISTA],
    ['marcos de labirinto', TEXTOS_DE_MARCO],
  ];
  for (const [origem, fonte] of fontes) {
    for (const [chave, linhas] of Object.entries(fonte)) {
      if (registro[chave]) {
        throw new Error(`[avisos] o texto "${chave}" (${origem}) ja existe em outra fonte`);
      }
      registro[chave] = linhas;
    }
  }
  return registro;
})();

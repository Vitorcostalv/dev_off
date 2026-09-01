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
export const ITENS_DE_LEITURA: Record<string, string[]> = {
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

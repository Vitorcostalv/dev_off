/**
 * GEOMETRIAS DOS ANDARES 51 A 150.
 *
 * Mesmo idioma de `TEMPLATES`/`LABIRINTOS` de andares-represa.mjs — retangulo de
 * parede, tile de vao, comodo com slot — e mesmo consumidor. Estao num arquivo
 * proprio so por tamanho: dezesseis geometrias novas dentro do arquivo que ja
 * tinha nove deixariam a lista longa demais pra achar qualquer coisa.
 *
 * Os TRES TILES DE SERVICO (chegada, descida, parada do elevador) continuam em
 * `PLANTAS_DE_ANDAR`, em src/game/andares.ts, pelo mesmo motivo de sempre:
 * `MAPAS.spawnTile` precisa do tile de chegada em tempo de jogo.
 *
 * A divisao por capitulo NAO e arbitraria:
 *
 *  - as oito do TRABALHO (51-100) sao geometrias de ocupacao: baia numerada,
 *    corredor comprido com sala de um lado so, pente de bancada, atrio. Sao
 *    plantas de gente trabalhando, aplicadas a concreto de usina;
 *  - as oito da INFANCIA (101-150) sao geometrias de repeticao e simetria: sala
 *    igual do lado da sala igual, anel que nao fecha, espiral, espelho. Sao
 *    plantas que incomodam por serem regulares demais.
 */

// =========================================================== TRABALHO ==
export const TEMPLATES_TRABALHO = {
  // ------------------------------------ seis baias, eixo central de servico --
  baias_6: {
    largura: 34,
    altura: 22,
    paredes: [
      [15, 2, 1, 19], [19, 2, 1, 19], // as duas faces do eixo
      [1, 8, 14, 1], [1, 14, 14, 1], // divisas do lado oeste
      [20, 8, 13, 1], [20, 14, 13, 1], // divisas do lado leste
    ],
    vaos: [[15, 4], [15, 11], [15, 17], [19, 4], [19, 11], [19, 17]],
    comodos: [
      { nome: 'oeste_a', rect: [1, 2, 14, 6], slot: 0 },
      { nome: 'oeste_b', rect: [1, 9, 14, 5], slot: 1 },
      { nome: 'oeste_c', rect: [1, 15, 14, 6], slot: 2 },
      { nome: 'leste_a', rect: [20, 2, 13, 6], slot: 3 },
      { nome: 'leste_b', rect: [20, 9, 13, 5], slot: 4 },
      { nome: 'leste_c', rect: [20, 15, 13, 6], slot: 5 },
      { nome: 'eixo', rect: [16, 2, 3, 19], modulo: 'corredor' },
    ],
  },

  // ----------------------------- corredor comprido, salas de um lado so --
  corredor_longo: {
    largura: 38,
    altura: 18,
    paredes: [
      [10, 2, 1, 8], [19, 2, 1, 8], [28, 2, 1, 8],
      [1, 10, 36, 2],
    ],
    vaos: [
      [5, 10], [5, 11], [15, 10], [15, 11], [24, 10], [24, 11], [32, 10], [32, 11],
    ],
    comodos: [
      { nome: 'a', rect: [1, 2, 9, 8], slot: 0 },
      { nome: 'b', rect: [11, 2, 8, 8], slot: 1 },
      { nome: 'c', rect: [20, 2, 8, 8], slot: 2 },
      { nome: 'd', rect: [29, 2, 8, 8], slot: 3 },
      { nome: 'passagem', rect: [1, 12, 36, 5], modulo: 'corredor' },
    ],
  },

  // --------------------------------------------- dois aneis concentricos --
  duplo_anel: {
    largura: 32,
    altura: 24,
    paredes: [
      [6, 5, 20, 1], [6, 18, 20, 1], [6, 5, 1, 14], [25, 5, 1, 14], // anel externo
      [11, 9, 10, 1], [11, 14, 10, 1], [11, 9, 1, 6], [20, 9, 1, 6], // anel interno
    ],
    vaos: [[16, 5], [16, 18], [15, 9], [15, 14]],
    comodos: [
      { nome: 'nucleo', rect: [12, 10, 8, 4], slot: 0 },
      { nome: 'meio_norte', rect: [7, 6, 18, 3], slot: 1 },
      { nome: 'meio_sul', rect: [7, 15, 18, 3], slot: 2 },
      { nome: 'externo_norte', rect: [1, 2, 30, 3], slot: 3 },
      { nome: 'meio_oeste', rect: [7, 9, 4, 6], modulo: 'corredor' },
      { nome: 'meio_leste', rect: [21, 9, 4, 6], modulo: 'corredor' },
      { nome: 'externo_sul', rect: [1, 19, 30, 3], modulo: 'corredor' },
      { nome: 'externo_oeste', rect: [1, 5, 5, 14], modulo: 'corredor' },
      { nome: 'externo_leste', rect: [26, 5, 5, 14], modulo: 'corredor' },
    ],
  },

  // ------------------------------- quatro faixas, portas em degrau --
  escalonado: {
    largura: 32,
    altura: 24,
    paredes: [
      [21, 2, 1, 20],
      [1, 6, 20, 1], [1, 11, 20, 1], [1, 16, 20, 1],
    ],
    vaos: [[21, 3], [21, 9], [21, 14], [21, 19]],
    comodos: [
      { nome: 'a', rect: [1, 2, 20, 4], slot: 0 },
      { nome: 'b', rect: [1, 7, 20, 4], slot: 1 },
      { nome: 'c', rect: [1, 12, 20, 4], slot: 2 },
      { nome: 'd', rect: [1, 17, 20, 5], slot: 3 },
      { nome: 'servico', rect: [22, 2, 9, 20], modulo: 'corredor' },
    ],
  },

  // --------------------------------- atrio central com quatro anexos --
  atrio: {
    largura: 30,
    altura: 24,
    paredes: [
      [9, 7, 12, 1], [9, 16, 12, 1],
      [9, 8, 1, 8], [20, 8, 1, 8],
    ],
    vaos: [[14, 7], [14, 16], [9, 11], [20, 11]],
    comodos: [
      { nome: 'norte', rect: [1, 2, 28, 5], slot: 0 },
      { nome: 'sul', rect: [1, 17, 28, 5], slot: 1 },
      { nome: 'oeste', rect: [1, 8, 8, 8], slot: 2 },
      { nome: 'leste', rect: [21, 8, 8, 8], slot: 3 },
      { nome: 'atrio', rect: [10, 8, 10, 8], modulo: 'corredor' },
    ],
  },

  // ------------------------------------- corredor central, sete salas --
  espinha_7: {
    largura: 40,
    altura: 22,
    paredes: [
      [6, 2, 1, 8], [11, 2, 1, 8], [16, 2, 1, 8], [21, 2, 1, 8],
      [26, 2, 1, 8], [31, 2, 1, 8],
      [1, 10, 38, 2],
    ],
    vaos: [
      [3, 10], [3, 11], [9, 10], [9, 11], [14, 10], [14, 11], [19, 10], [19, 11],
      [24, 10], [24, 11], [29, 10], [29, 11], [34, 10], [34, 11],
    ],
    comodos: [
      { nome: 'a', rect: [1, 2, 5, 8], slot: 0 },
      { nome: 'b', rect: [7, 2, 4, 8], slot: 1 },
      { nome: 'c', rect: [12, 2, 4, 8], slot: 2 },
      { nome: 'd', rect: [17, 2, 4, 8], slot: 3 },
      { nome: 'e', rect: [22, 2, 4, 8], slot: 4 },
      { nome: 'f', rect: [27, 2, 4, 8], slot: 5 },
      { nome: 'g', rect: [32, 2, 6, 8], slot: 6 },
      { nome: 'passagem', rect: [1, 12, 38, 9], modulo: 'corredor' },
    ],
  },

  // ------------------------------ pente: galeria no topo, cinco dentes --
  pente: {
    largura: 34,
    altura: 22,
    paredes: [
      [1, 6, 32, 1],
      [7, 7, 1, 14], [13, 7, 1, 14], [19, 7, 1, 14], [25, 7, 1, 14],
    ],
    vaos: [[3, 6], [10, 6], [16, 6], [22, 6], [29, 6]],
    comodos: [
      { nome: 'galeria', rect: [1, 2, 32, 4], modulo: 'corredor' },
      { nome: 'dente_a', rect: [1, 7, 6, 14], slot: 0 },
      { nome: 'dente_b', rect: [8, 7, 5, 14], slot: 1 },
      { nome: 'dente_c', rect: [14, 7, 5, 14], slot: 2 },
      { nome: 'dente_d', rect: [20, 7, 5, 14], slot: 3 },
      { nome: 'dente_e', rect: [26, 7, 7, 14], slot: 4 },
    ],
  },
};

// =========================================================== INFANCIA ==
export const TEMPLATES_INFANCIA = {
  // ------------------------------------ cruzamento com seis salas iguais --
  cruz_6: {
    largura: 34,
    altura: 24,
    paredes: [
      [1, 10, 32, 1], [1, 14, 32, 1],
      [14, 2, 1, 8], [18, 2, 1, 8], [14, 15, 1, 7], [18, 15, 1, 7],
      [7, 2, 1, 8], [26, 2, 1, 8],
    ],
    vaos: [
      // faixa central <-> as quatro salas de cima, e <-> o eixo vertical
      [3, 10], [10, 10], [16, 10], [22, 10], [29, 10],
      // faixa central <-> as duas salas de baixo e o eixo
      [7, 14], [16, 14], [26, 14],
      // divisa entre as salas irmas de cima
      [7, 5], [26, 5],
      // eixo vertical <-> as salas vizinhas dele. Sem estes quatro o eixo fica
      // lacrado, e a chegada do andar nasce dentro dele
      [14, 5], [18, 5], [14, 18], [18, 18],
    ],
    comodos: [
      { nome: 'no_a', rect: [1, 2, 6, 8], slot: 0 },
      { nome: 'no_b', rect: [8, 2, 6, 8], slot: 1 },
      { nome: 'ne_a', rect: [19, 2, 7, 8], slot: 2 },
      { nome: 'ne_b', rect: [27, 2, 6, 8], slot: 3 },
      { nome: 'so', rect: [1, 15, 13, 7], slot: 4 },
      { nome: 'se', rect: [19, 15, 14, 7], slot: 5 },
      { nome: 'faixa', rect: [1, 11, 32, 3], modulo: 'corredor' },
      { nome: 'eixo_norte', rect: [15, 2, 3, 8], modulo: 'corredor' },
      { nome: 'eixo_sul', rect: [15, 15, 3, 7], modulo: 'corredor' },
    ],
  },

  // ------------------------------- tres galerias empilhadas com anexos --
  galeria_6: {
    largura: 34,
    altura: 24,
    paredes: [
      [1, 9, 32, 1], [1, 17, 32, 1],
      [23, 2, 1, 7], [23, 10, 1, 7], [23, 18, 1, 4],
    ],
    vaos: [[23, 5], [23, 13], [23, 19], [11, 9], [11, 17]],
    comodos: [
      { nome: 'a', rect: [1, 2, 22, 7], slot: 0 },
      { nome: 'a2', rect: [24, 2, 9, 7], slot: 1 },
      { nome: 'b', rect: [1, 10, 22, 7], slot: 2 },
      { nome: 'b2', rect: [24, 10, 9, 7], slot: 3 },
      { nome: 'c', rect: [1, 18, 22, 4], slot: 4 },
      { nome: 'c2', rect: [24, 18, 9, 4], slot: 5 },
    ],
  },

  // ---------------------------------------------- poco de tres estagios --
  poco_duplo: {
    largura: 22,
    altura: 26,
    paredes: [[1, 9, 19, 1], [1, 17, 19, 1]],
    // vao de UM tile: as duas divisas sao paredes de 1 tile de altura, e a
    // porta interna so sabe cobrir vao de 1 ou de 2 EMPILHADOS
    vaos: [[10, 9], [10, 17]],
    comodos: [
      { nome: 'a', rect: [1, 2, 19, 7], slot: 0 },
      { nome: 'b', rect: [1, 10, 19, 7], slot: 1 },
      { nome: 'c', rect: [1, 18, 19, 6], slot: 2 },
    ],
  },

  // ------------------------------- anel que nao fecha: falta um trecho --
  anel_partido: {
    largura: 30,
    altura: 22,
    paredes: [
      [8, 6, 14, 1], [8, 15, 14, 1],
      [8, 7, 1, 8],
      // a face leste do anel para no y10: o trecho de y11 a y14 nunca foi
      // fechado, e e por ele que se entra no nucleo sem passar pela porta
      [21, 7, 1, 4],
    ],
    vaos: [[14, 6]],
    comodos: [
      { nome: 'nucleo', rect: [9, 7, 12, 8], slot: 0 },
      { nome: 'norte', rect: [1, 2, 28, 3], slot: 1 },
      { nome: 'sul', rect: [1, 16, 28, 5], slot: 2 },
      { nome: 'oeste', rect: [1, 6, 7, 10], modulo: 'corredor' },
      { nome: 'leste', rect: [22, 6, 7, 10], modulo: 'corredor' },
    ],
  },

  // ------------------------------- dois corredores paralelos, salas no meio --
  corredor_duplo: {
    largura: 32,
    altura: 22,
    paredes: [
      [1, 6, 30, 1], [1, 15, 30, 1],
      [11, 7, 1, 8], [21, 7, 1, 8],
    ],
    vaos: [[5, 6], [16, 6], [26, 6], [5, 15], [16, 15], [26, 15]],
    comodos: [
      { nome: 'norte', rect: [1, 2, 30, 4], modulo: 'corredor' },
      { nome: 'meio_a', rect: [1, 7, 10, 8], slot: 0 },
      { nome: 'meio_b', rect: [12, 7, 9, 8], slot: 1 },
      { nome: 'meio_c', rect: [22, 7, 9, 8], slot: 2 },
      { nome: 'sul', rect: [1, 16, 30, 5], modulo: 'corredor' },
    ],
  },

  // ------------------------- espelho: duas metades iguais, uma so porta --
  sala_espelho: {
    largura: 30,
    altura: 22,
    paredes: [
      [14, 2, 1, 7], [14, 14, 1, 7],
      [1, 9, 13, 1], [16, 9, 13, 1],
      [1, 13, 13, 1], [16, 13, 13, 1],
    ],
    vaos: [[7, 9], [22, 9], [7, 13], [22, 13]],
    comodos: [
      { nome: 'oeste_norte', rect: [1, 2, 13, 7], slot: 0 },
      { nome: 'leste_norte', rect: [16, 2, 13, 7], slot: 1 },
      { nome: 'oeste_sul', rect: [1, 14, 13, 7], slot: 2 },
      { nome: 'leste_sul', rect: [16, 14, 13, 7], slot: 3 },
      /**
       * A faixa central tem TRES tiles de altura, e nao um.
       *
       * A mobilia de um comodo e posta na primeira linha dele. Num corredor de
       * uma linha so, isso e o corredor inteiro: o andar 110 saiu com as duas
       * metades separadas por uma fileira de armario, e a conferencia pegou o
       * inimigo do lado de la sem ligacao com a chegada. Com tres linhas, a de
       * cima leva o movel e as duas de baixo continuam passagem.
       */
      { nome: 'faixa', rect: [1, 10, 28, 3], modulo: 'corredor' },
    ],
  },
};

// ======================================================== LABIRINTOS ==
export const LABIRINTOS_FUNDOS = {
  // ----------------------------------- TRABALHO: malha de corredor de baia --
  labirinto_d: {
    largura: 34,
    altura: 22,
    // Corredor de escritorio: avenidas retas e travessas que nem sempre
    // atravessam. Le como planta de andar corporativo, e e de proposito.
    corredores: [
      [1, 2, 32, 2], // avenida norte
      [1, 19, 32, 19], // avenida sul
      [1, 2, 1, 19], // ramal oeste
      [32, 2, 32, 19], // ramal leste
      [8, 2, 8, 19], // avenida vertical 1
      [16, 2, 16, 12], // avenida vertical 2 (nao chega ao sul)
      [24, 6, 24, 19], // avenida vertical 3 (nao chega ao norte)
      [1, 7, 8, 7], // travessa 1 (oeste)
      [8, 11, 16, 11],
      [16, 12, 24, 12],
      [24, 15, 32, 15],
      [8, 15, 16, 15], // travessa que termina em beco
      [12, 2, 12, 7],
      [20, 15, 20, 19],
      [28, 2, 28, 6],
      [24, 6, 28, 6],
    ],
    comodos: [
      { nome: 'a', rect: [2, 3, 5, 3], slot: 0 },
      { nome: 'b', rect: [17, 2, 6, 3], slot: 1 },
      { nome: 'c', rect: [25, 16, 7, 3], slot: 2 },
      { nome: 'd', rect: [2, 15, 5, 4], slot: 3 },
    ],
  },

  // -------------------------------------------- INFANCIA: espiral fechada --
  labirinto_e: {
    largura: 28,
    altura: 24,
    // Espiral: um corredor unico que se enrola ate o centro. Nao ha bifurcacao
    // nenhuma — o desconforto e nao saber quanto falta, nao se perder.
    corredores: [
      [1, 2, 26, 2],
      [26, 2, 26, 21],
      [1, 21, 26, 21],
      [1, 2, 1, 21],
      [4, 5, 23, 5],
      [23, 5, 23, 18],
      [4, 18, 23, 18],
      [4, 5, 4, 18],
      [7, 8, 20, 8],
      [20, 8, 20, 15],
      [7, 15, 20, 15],
      [7, 8, 7, 15],
      [10, 11, 17, 11],
      [17, 11, 17, 12],
      [10, 12, 17, 12],
      // as duas passagens que ligam uma volta a seguinte
      [13, 2, 13, 5],
      [13, 15, 13, 18],
      [4, 8, 7, 8],
      [17, 11, 20, 11],
    ],
    comodos: [
      { nome: 'centro', rect: [11, 11, 5, 2], slot: 0 },
      { nome: 'a', rect: [2, 3, 4, 2], slot: 1 },
      { nome: 'b', rect: [22, 19, 4, 2], slot: 2 },
    ],
  },

  // ------------------------------ INFANCIA: salas iguais em malha regular --
  labirinto_f: {
    largura: 32,
    altura: 24,
    // Malha perfeitamente regular, com duas ligacoes que quebram a simetria.
    // A regularidade e o que incomoda: cada cruzamento parece o anterior.
    corredores: [
      [1, 2, 30, 2],
      [1, 21, 30, 21],
      [1, 2, 1, 21],
      [30, 2, 30, 21],
      [7, 2, 7, 21],
      [14, 2, 14, 21],
      [22, 2, 22, 21],
      [1, 7, 30, 7],
      [1, 12, 30, 12],
      [1, 17, 30, 17],
      // as duas quebras
      [10, 7, 10, 12],
      [26, 12, 26, 21],
    ],
    comodos: [
      { nome: 'a', rect: [2, 3, 4, 3], slot: 0 },
      { nome: 'b', rect: [15, 8, 6, 3], slot: 1 },
      { nome: 'c', rect: [23, 18, 6, 2], slot: 2 },
      { nome: 'd', rect: [8, 18, 5, 2], slot: 3 },
    ],
  },
};

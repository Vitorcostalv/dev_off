import { Relogio } from './relogio';

/**
 * Estado global do jogo — o que sobrevive a troca de mapa e vai pro save.
 * Cenas leem e escrevem daqui; ninguem guarda copia.
 */
export const estado = {
  /** dia absoluto desde o inicio do jogo; 0 = a primeira segunda-feira */
  dia: 0,
  relogio: new Relogio(),
};

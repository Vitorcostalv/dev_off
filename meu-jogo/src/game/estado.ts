import { Inventario } from './inventario';
import { Relogio } from './relogio';
import { SistemaRotinasNpc } from './rotinasNpc';

/**
 * Estado global do jogo — o que sobrevive a troca de mapa e vai pro save.
 * Cenas leem e escrevem daqui; ninguem guarda copia.
 */
export const estado = {
  /** chave do mapa em que o player esta */
  mapa: 'farm',
  /** dia absoluto desde o inicio do jogo; 0 = a primeira segunda-feira */
  dia: 0,
  relogio: new Relogio(),
  inventario: new Inventario(),
  /** IDs unicos dos objetos de mundo que ja foram recolhidos. */
  itensColetados: new Set<string>(),
  rotinasNpc: new SistemaRotinasNpc(),
};

import { Carteira } from './dinheiro.ts';
import { Inventario } from './inventario.ts';
import { Lixeira } from './lixeira.ts';
import { Relogio } from './relogio.ts';
import { SistemaRotinasNpc } from './rotinasNpc.ts';
import { SistemaTrabalhos } from './trabalhos.ts';

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
  /** saldo em R$ do jogador; so ganhar()/gastar() escrevem nele */
  carteira: new Carteira(),
  /** IDs unicos dos objetos de mundo que ja foram recolhidos. */
  itensColetados: new Set<string>(),
  /** historico de descarte, mostrado pelo app Lixeira do computador */
  lixeira: new Lixeira(),
  /** vagas aceitas/concluidas do app Trabalho */
  trabalhos: new SistemaTrabalhos(),
  rotinasNpc: new SistemaRotinasNpc(),
};

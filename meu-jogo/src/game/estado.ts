import { Carteira } from './dinheiro.ts';
import { SistemaCasa } from './casa.ts';
import { Inventario } from './inventario.ts';
import { Lixeira } from './lixeira.ts';
import { Relogio } from './relogio.ts';
import { SistemaRotinasNpc } from './rotinasNpc.ts';
import { SistemaTrabalhos } from './trabalhos.ts';
import { SistemaRelacoes } from './relacoes.ts';
import { SistemaWorldEvents } from './worldEvents.ts';

/**
 * Estado global do jogo — o que sobrevive a troca de mapa e vai pro save.
 * Cenas leem e escrevem daqui; ninguem guarda copia.
 */
export const estado = {
  /**
   * Chave do mapa em que o player esta. Jogo novo comeca no MAPA 2, na porta da
   * casa+oficina — e onde o protagonista mora desde esta leva. O Mapa 1, com os
   * 9 NPCs e o comercio, fica a leste; a zona rural, ao sul, depois da ponte.
   */
  mapa: 'bairro',
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
  /** relacionamento com cada NPC */
  relacoes: new SistemaRelacoes(),
  /** comodos comprados e mobilia posicionada na casa+oficina do protagonista */
  casa: new SistemaCasa(),
  /** flags e falas unicas que registram consequencias no mundo */
  worldEvents: new SistemaWorldEvents(),
};

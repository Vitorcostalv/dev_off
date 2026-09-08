import { Carteira } from './dinheiro.ts';
import { SistemaCasa } from './casa.ts';
import { Inventario } from './inventario.ts';
import { Lixeira } from './lixeira.ts';
import { Relogio } from './relogio.ts';
import { SistemaRotinasNpc } from './rotinasNpc.ts';
import { SistemaTrabalhos } from './trabalhos.ts';
import { SistemaRelacoes } from './relacoes.ts';
import { SistemaWorldEvents } from './worldEvents.ts';
import { SistemaMissoesNpc } from './missoesNpc.ts';
import { SistemaEncontrosNpc } from './encontrosNpc.ts';
import { atividadesComEmprego, SistemaCidade } from './cidade.ts';
import { buscarMorador } from './moradores.ts';
import { acoesDeAtividades } from './npcs.ts';
import { SistemaVida } from './vida.ts';
import { SistemaRepresa } from './represa.ts';
import { SistemaEquipamento } from './equipar.ts';
import { SistemaArmas } from './armas.ts';
import { SistemaArquivo } from './fichas.ts';

/**
 * Estado global do jogo — o que sobrevive a troca de mapa e vai pro save.
 * Cenas leem e escrevem daqui; ninguem guarda copia.
 */
export const estado = {
  /**
   * Chave do mapa em que o player esta. Jogo novo comeca no MAPA 2, na porta da
   * casa+oficina — e onde o protagonista mora desde esta leva. O Mapa 1, com os
   * comercio, fica a leste; a zona rural fica a leste do centro, e a represa ao norte.
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
  /** questlines pessoais dos seis NPCs principais */
  missoesNpc: new SistemaMissoesNpc(),
  encontrosNpc: new SistemaEncontrosNpc(),
  /** predios construidos pelo jogador e trabalhadores atribuidos no bairro */
  cidade: new SistemaCidade(),
  /** vida do jogador, independente da energia de trabalho */
  vida: new SistemaVida(),
  /** corrida atual dentro da represa: tempo dentro, tensao e salvado recolhido */
  represa: new SistemaRepresa(),
  /** o que esta na mao e no cinto do jogador */
  equipamento: new SistemaEquipamento(),
  /** carregador, cadencia e recarga das armas de fogo */
  armas: new SistemaArmas(),
  /** quais das cinquenta fichas medicas da represa ja foram recolhidas */
  arquivo: new SistemaArquivo(),
};

/**
 * Liga o motor de rotinas ao sistema de projetos urbanos.
 *
 * Fica aqui, e nao dentro de nenhum dos dois, porque `rotinasNpc.ts` importar
 * `cidade.ts` (ou o contrario) fecharia um ciclo. O motor pergunta uma vez por
 * dia; quem responde e a cidade. Ver `definirSubstituicaoDeRotina`.
 */
estado.rotinasNpc.definirSubstituicaoDeRotina((def, dia) => {
  const morador = buscarMorador(def.id);
  if (!morador) return null;
  const atividades = atividadesComEmprego(estado.cidade, morador, dia);
  return atividades ? acoesDeAtividades(atividades) : null;
});

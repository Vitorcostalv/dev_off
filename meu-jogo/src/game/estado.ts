import { Carteira } from './dinheiro.ts';
import { SistemaCasa } from './casa.ts';
import { Inventario } from './inventario.ts';
import { Lixeira } from './lixeira.ts';
import { Relogio } from './relogio.ts';
import { SistemaRotinasNpc } from './rotinasNpc.ts';
import { rotinaComCalendario } from './rotinaSocial.ts';
import { diaDaSemana } from './calendario.ts';
import { SistemaTrabalhos } from './trabalhos.ts';
import { SistemaRelacoes } from './relacoes.ts';
import { SistemaWorldEvents } from './worldEvents.ts';
import { SistemaMissoesNpc } from './missoesNpc.ts';
import { SistemaEncontrosNpc } from './encontrosNpc.ts';
import { atividadesComEmprego, SistemaCidade } from './cidade.ts';
import { MORADORES, buscarMorador } from './moradores.ts';
import { acoesDeAtividades } from './npcs.ts';
import { SistemaVida } from './vida.ts';
import { SistemaRepresa } from './represa.ts';
import { SistemaEquipamento } from './equipar.ts';
import { SistemaArmas } from './armas.ts';
import { SistemaArquivo } from './fichas.ts';
import { GameEventBus } from './GameEvents.ts';
import { Progressao } from './progressao.ts';
import { NPCS } from './npcs.ts';
import { SistemaClima } from './clima.ts';
import { Preferencias } from './settings.ts';
import { AtividadesRurais } from './atividadesRurais.ts';

/**
 * Estado global do jogo — o que sobrevive a troca de mapa e vai pro save.
 * Cenas leem e escrevem daqui; ninguem guarda copia.
 */
export const estado = {
  rural: new AtividadesRurais(),
  clima: new SistemaClima(),
  preferencias: new Preferencias(),
  tituloVisto: false,
  eventos: new GameEventBus(),
  progressao: new Progressao(),
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

estado.progressao.conectar(estado.eventos, () => ({
  dia: estado.dia, minuto: Math.floor(estado.relogio.minutos),
  itens: [...new Set(estado.inventario.slots.flatMap(s => s ? [s.id] : []))],
  conhecidos: estado.relacoes.listaInteragidos().filter(id => Object.hasOwn(NPCS, id)).length,
  totalNpcs: Object.keys(NPCS).length,
}));
estado.inventario.aoAdicionar = (id, quantidade) => estado.eventos.emit('ITEM_ADDED', { id, quantidade });
estado.relacoes.aoConversar = id => estado.eventos.emit('NPC_TALKED', { id });
estado.trabalhos.aoConcluir = id => estado.eventos.emit('JOB_COMPLETED', { id });
estado.eventos.on('DAY_STARTED', ({ dia }) => estado.rural.avancar(dia, estado.clima));

/**
 * FAVORITOS por NPC, pro encontro do dia saber quem vai. Sai de
 * `vida.favoritos` do morador; os 9 NPCs originais nao tem perfil declarado e
 * entram nos encontros so por lista fechada (ver `Encontro.ids`).
 */
const FAVORITOS_POR_NPC = new Map(
  Object.values(MORADORES).map((m) => [m.id, m.vida.favoritos] as const),
);
/** Ordem estavel de ocupacao das vagas de encontro. */
const ORDEM_DE_NPC = Object.keys(NPCS);

/**
 * Liga o motor de rotinas ao resto do jogo. Sao TRES fontes, e a ordem e a
 * unica coisa que este trecho decide:
 *
 *   1. o EMPREGO de obra urbana troca o compromisso do meio do dia (`cidade`);
 *   2. CALENDARIO E CLIMA ajustam o que sobrou — estacao desloca a atividade ao
 *      ar livre, chuva recolhe pro abrigo (`rotinaSocial`);
 *   3. o ENCONTRO do dia, quando existe, junta os participantes num lugar so.
 *
 * Fica aqui, e nao dentro de nenhum dos modulos, porque `rotinasNpc.ts`
 * importar `cidade.ts` (ou o contrario) fecharia um ciclo. O motor pergunta
 * uma vez por dia; quem responde e este trecho. Ver
 * `definirSubstituicaoDeRotina`.
 */
estado.rotinasNpc.definirSubstituicaoDeRotina((def, dia) => {
  const morador = buscarMorador(def.id);
  const doEmprego = morador ? atividadesComEmprego(estado.cidade, morador, dia) : null;
  const base = doEmprego
    ? acoesDeAtividades(doEmprego)
    : def.rotinaSemanal?.[diaDaSemana(dia)] ?? def.rotina;
  return rotinaComCalendario(def, base, {
    dia,
    clima: estado.clima.paraDia(dia),
    favoritosPorNpc: FAVORITOS_POR_NPC,
    ordem: ORDEM_DE_NPC,
  });
});

import type { EntradaDeLixeira } from './lixeira.ts';
import type { DadosRelacoes } from './relacoes.ts';
import type { Slot } from './inventario.ts';
import type { DadosCasa } from './casa.ts';
import type { DadosWorldEvents } from './worldEvents.ts';
import type { DadosMissoesNpc } from './missoesNpc.ts';
import type { DadosCidade } from './cidade.ts';
import type { DadosVida } from './vida.ts';
import type { DadosRepresa } from './represa.ts';

const CHAVE = 'meu-jogo:save';
// 2: o tile passou de 16 pra 32 px, entao x/y gravados na versao 1 apontam
//    pra metade da posicao certa.
// 3: o interior 'casa' virou 'casa_1'..'casa_6', entao a chave de mapa gravada
//    na versao 2 pode nao existir mais.
// 4: passa a persistir os pickups removidos do mundo junto com o inventario.
// 5: entra o dinheiro (em centavos) e o inventario passa a guardar itens do
//    CATALOGO_ITENS, que a versao 4 nao conhecia.
// 6: o jogo passou de um mapa externo pra tres, e a casa do protagonista mudou
//    da `casa_1` (Mapa 1) pra `oficina` (Mapa 2). A chave de mapa gravada na
//    versao 5 pode ser `casa_1`, que nao existe mais, e as coordenadas gravadas
//    dentro dela nao querem dizer nada no mapa novo.
// A leva da represa (Mapa 4) NAO subiu a versao. Ela e aditiva: nenhum lote,
// interior ou coordenada existente mudou de lugar, e os tres campos novos
// (`vida`, `represa` e as flags da usina dentro de `worldEvents`) chegam
// ausentes no save v6 antigo e caem em valor vazio. O que mudou no mundo foi a
// TOPOLOGIA das bordas — e borda nao vai pro save.
// Subir a versao descarta os saves antigos em vez de restaurar posicao errada.
//
// Campo NOVO nao pede versao nova. So se sobe a versao quando o dado gravado
// pela versao anterior passa a significar outra coisa (foi o caso de 1->2, com
// o tile mudando de tamanho, e de 2->3, com a chave de mapa mudando). Um campo
// acrescentado chega como `undefined` no save velho, e cada `restaurar` ja
// trata isso devolvendo o valor vazio — descartar o save do jogador por causa
// disso seria pior que carregar sem o historico da lixeira.
const VERSAO = 6;

export interface DadosSave {
  versao: number;
  dia: number;
  minutos: number;
  mapa: string;
  x: number;
  y: number;
  inventario: (Slot | null)[];
  itensColetados: string[];
  /** saldo em CENTAVOS; ver src/game/dinheiro.ts */
  dinheiro: number;
  /** historico de descarte; ausente nos saves gravados antes do app Lixeira */
  lixeira?: EntradaDeLixeira[];
  /** entrega em andamento e vagas ja concluidas; ausente nos saves antigos */
  trabalhos?: unknown;
  /**
   * relacionamento com NPCs: score, quem ja foi abordado e as travas de limite
   * diario. Ausente nos saves gravados antes deste recurso; `restaurar` tambem
   * aceita o formato antigo (so o array de scores) sem descartar o save.
   */
  relacoes?: DadosRelacoes;
  /**
   * Comodos de expansao comprados e mobilia posicionada na casa+oficina. Campo
   * novo da versao 6; `SistemaCasa.restaurar` aceita ausente e devolve a casa
   * como ela sai da geracao.
   */
  casa?: DadosCasa;
  /** flags genericas e falas condicionais ja vistas */
  worldEvents?: DadosWorldEvents;
  /** estados disponivel/em andamento/concluida das missoes pessoais */
  missoesNpc?: DadosMissoesNpc;
  /** projetos urbanos construidos e seus trabalhadores; ausente em saves antigos */
  cidade?: DadosCidade;
  /**
   * Vida do jogador. Campo NOVO, sem subir a versao: save antigo chega sem ele e
   * `SistemaVida.restaurar` devolve 30/30 — que e o estado certo pra quem nunca
   * entrou na represa. Ver o comentario de VERSAO acima.
   */
  vida?: DadosVida;
  /**
   * CORRIDA atual na represa (tempo dentro, tensao e o salvado recolhido desde a
   * ultima saida). O progresso PERMANENTE da usina nao esta aqui: puzzle
   * resolvido e atalho aberto sao flag de `worldEvents`, e recipiente saqueado e
   * id em `itensColetados` — os dois mecanismos que o jogo ja tinha. Ausente em
   * save antigo, e ai a corrida comeca zerada.
   */
  represa?: DadosRepresa;
}

export function salvar(dados: Omit<DadosSave, 'versao'>): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ versao: VERSAO, ...dados }));
    return true;
  } catch (erro) {
    console.warn('[save] nao consegui gravar', erro);
    return false;
  }
}

export function carregar(): DadosSave | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as Partial<DadosSave>;
    if (dados.versao !== VERSAO) {
      console.warn(`[save] versao ${dados.versao} incompativel com ${VERSAO} — ignorando`);
      return null;
    }
    return dados as DadosSave;
  } catch (erro) {
    console.warn('[save] save corrompido, ignorando', erro);
    return null;
  }
}

export function apagar(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch (erro) {
    console.warn('[save] nao consegui apagar', erro);
  }
}

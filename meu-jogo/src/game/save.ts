import type { EntradaDeLixeira } from './lixeira.ts';
import type { Slot } from './inventario.ts';

const CHAVE = 'meu-jogo:save';
// 2: o tile passou de 16 pra 32 px, entao x/y gravados na versao 1 apontam
//    pra metade da posicao certa.
// 3: o interior 'casa' virou 'casa_1'..'casa_6', entao a chave de mapa gravada
//    na versao 2 pode nao existir mais.
// 4: passa a persistir os pickups removidos do mundo junto com o inventario.
// 5: entra o dinheiro (em centavos) e o inventario passa a guardar itens do
//    CATALOGO_ITENS, que a versao 4 nao conhecia.
// Subir a versao descarta os saves antigos em vez de restaurar posicao errada.
//
// Campo NOVO nao pede versao nova. So se sobe a versao quando o dado gravado
// pela versao anterior passa a significar outra coisa (foi o caso de 1->2, com
// o tile mudando de tamanho, e de 2->3, com a chave de mapa mudando). Um campo
// acrescentado chega como `undefined` no save velho, e cada `restaurar` ja
// trata isso devolvendo o valor vazio — descartar o save do jogador por causa
// disso seria pior que carregar sem o historico da lixeira.
const VERSAO = 5;

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
  /** relacionamento com NPCs; ausente nos saves gravados antes deste recurso */
  relacoes?: Array<[string, number]>;
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

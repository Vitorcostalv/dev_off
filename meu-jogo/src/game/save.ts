import type { Slot } from './inventario';

const CHAVE = 'meu-jogo:save';
// 2: o tile passou de 16 pra 32 px, entao x/y gravados na versao 1 apontam
//    pra metade da posicao certa.
// 3: o interior 'casa' virou 'casa_1'..'casa_6', entao a chave de mapa gravada
//    na versao 2 pode nao existir mais.
// 4: passa a persistir os pickups removidos do mundo junto com o inventario.
// Subir a versao descarta os saves antigos em vez de restaurar posicao errada.
const VERSAO = 4;

export interface DadosSave {
  versao: number;
  dia: number;
  minutos: number;
  mapa: string;
  x: number;
  y: number;
  inventario: (Slot | null)[];
  itensColetados: string[];
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

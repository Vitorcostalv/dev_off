const CHAVE = 'meu-jogo:save';
const VERSAO = 1;

export interface DadosSave {
  versao: number;
  dia: number;
  minutos: number;
  mapa: string;
  x: number;
  y: number;
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

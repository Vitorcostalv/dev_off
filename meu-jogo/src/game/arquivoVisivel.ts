/** Tarjas só na apresentação; o catálogo autoral permanece integral e imutável. */
const RELEITURAS: Record<number, number> = { 52: 75, 78: 100, 108: 125, 132: 150, 160: 180 };
export function textoClinicoVisivel(numero: number, texto: string, arquivo: { tem(n: number): boolean }): string {
  const depois = RELEITURAS[numero];
  if (!depois || arquivo.tem(depois)) return texto;
  const separacao = texto.indexOf('. ');
  if (separacao < 0) return texto;
  return `${texto.slice(0, separacao + 1)} [████████ — trecho encoberto; releia depois de encontrar o registro ${depois}.]`;
}

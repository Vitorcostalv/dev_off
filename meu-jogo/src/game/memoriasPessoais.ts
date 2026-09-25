import type { ContextoCampanha } from './campanha.ts';
export interface MemoriaPessoal { id: string; nome: string; ficha: number; texto: string }
// Os nomes também são revelações: filtrar antes de montar qualquer índice.
export const MEMORIAS: readonly MemoriaPessoal[] = [
  { id: 'cracha', nome: 'Crachá antigo', ficha: 50, texto: 'O plástico está gasto onde o polegar segurava. Uma foto séria demais. Lembro do elevador antes de lembrar da mesa.' },
  { id: 'celular', nome: 'Celular antigo', ficha: 75, texto: 'A tela permanece desligada. Por um instante meu corpo espera a vibração. Deixo o aparelho onde está.' },
  { id: 'recibo', nome: 'Recibo do apartamento', ficha: 110, texto: 'Uma compra pequena. Lembro de subir a escada com uma sacola em cada mão e procurar a chave no bolso errado.' },
  { id: 'alianca', nome: 'Aliança', ficha: 126, texto: 'Não é uma resposta. É um objeto que esteve na minha mão por muitos dias comuns. Uma manhã de café. Alguém rindo da minha pressa.' },
  { id: 'foto', nome: 'Fotografia de uma viagem', ficha: 142, texto: 'Minha esposa está fora de foco. O vento ganhou a fotografia. Naquele dia isso foi motivo para rir, não para tirar outra.' },
  { id: 'brinquedo', nome: 'Brinquedo guardado', ficha: 157, texto: 'Minha filha inventava uma voz para ele. Às vezes eu precisava perguntar quem estava falando. Ela achava graça de eu nunca saber.' },
  { id: 'cartao', nome: 'Cartão de aniversário', ficha: 159, texto: 'O bolo ficou torto. Ficamos olhando antes de cortar. Há uma tarde inteira nessa letra, e ela não é feita só de ausência.' },
  { id: 'desenho', nome: 'Desenho', ficha: 173, texto: 'O papel tem uma dobra antiga. Não aliso com força. Hoje consigo olhar por um pouco mais de tempo.' },
  { id: 'pendrive', nome: 'Pen drive', ficha: 188, texto: 'Uma pasta de fotografias comuns. Apartamento, almoço, uma mala aberta. Não preciso abrir todas hoje.' },
];
export function memoriasDisponiveis(c: Pick<ContextoCampanha, 'arquivo'>): MemoriaPessoal[] { return MEMORIAS.filter(m => c.arquivo.tem(m.ficha)); }
export interface LembrancaCasa { id: string; nome: string; cor: number; texto: string }
export function lembrancasDaCasa(c: Pick<ContextoCampanha, 'worldEvents'>): LembrancaCasa[] {
  const f = c.worldEvents;
  return [
    { id: 'leticia', nome: 'Foto de Letícia', cor: 0x91a999, texto: 'Uma tarde na praça. Eu não estava tentando parecer bem.', visivel: f.ativa('vinculo:leticia:2') || f.ativa('campanha:cena:epilogo') },
    { id: 'davi', nome: 'Pão de Davi', cor: 0xb18d55, texto: 'O pano que envolvia o pão ficou. Lembro dele ainda morno.', visivel: f.ativa('campanha:cena:pao') },
    { id: 'luke', nome: 'Peça encontrada por Luke', cor: 0x8194aa, texto: 'Luke disse que parecia importante. Não encontrei utilidade. Guardei mesmo assim.', visivel: f.ativa('casa:presenteLuke') },
    { id: 'wendel', nome: 'Peça de Wendel', cor: 0xb29c75, texto: 'Uma peça do rádio que consertamos juntos. Ele disse que a caixa de parafusos já estava cheia.', visivel: f.ativa('casa:presenteWendel') },
  ].filter(m => m.visivel);
}
// A grade do rádio virou modulo proprio (game/radio.ts); este reexporte existe
// para quem ja importava daqui.
export { programaRadio } from './radio.ts';
export function textoEspelho(c: Pick<ContextoCampanha, 'worldEvents' | 'arquivo'>): string {
  if (c.worldEvents.ativa('campanha:cena:epilogo')) return 'Ainda sou eu. Hoje isso não parece uma cobrança.';
  if (c.arquivo.tem(159)) return 'Há dias em que reconheço meu rosto antes de tentar explicar o que ele carrega.';
  if (c.worldEvents.ativa('campanha:cena:leticia')) return 'O rosto parece menos uma coisa que preciso apresentar aos outros.';
  return 'Lavo o rosto. Demoro um pouco antes de levantar os olhos.';
}

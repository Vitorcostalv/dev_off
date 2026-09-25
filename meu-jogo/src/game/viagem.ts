import type { Clima } from './clima.ts';

/**
 * O TRECHO DE ÔNIBUS em texto: o que passa pela janela entre um mapa e outro, e
 * quem às vezes senta ao lado. A cena é pulável, então nada aqui pode ser
 * informação necessária — é paisagem.
 */
export interface ContextoViagem {
  dia: number;
  relacoes: { getScore(id: string): number };
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

const PAISAGENS: Record<string, readonly string[]> = {
  farm: [
    'O ônibus sai do bairro e pega a avenida. As casas ficam mais próximas umas das outras.',
    'Passa a escola, o muro pintado e a fila de bicicletas encostadas.',
    'Uma senhora acena para o motorista, que buzina duas vezes sem parar.',
    'A praça aparece pela janela, com as árvores altas primeiro e os bancos depois.',
    'O ônibus encosta no ponto do centro. A porta range antes de abrir.',
  ],
  rural: [
    'A rua termina e a estrada de terra começa com um solavanco que todo mundo conhece.',
    'Cercas, mourões e um cavalo que não levanta a cabeça quando o ônibus passa.',
    'Uma plantação inteira corre pela janela, verde e depois verde de outro jeito.',
    'O motorista desvia de um buraco que existe há anos e que ninguém tapou.',
    'O ponto da zona rural é uma placa e um banco de madeira. É o suficiente.',
  ],
  bairro: [
    'Saindo do centro, o comércio vai rareando até virar muro e portão.',
    'Os trilhos antigos cruzam a rua num ângulo torto; o ônibus atravessa devagar.',
    'A estação fechada passa pela janela, com o telhado remendado.',
    'O bairro começa onde a calçada volta a ser estreita.',
    'O ônibus para no ponto. Daqui até a sua porta é caminhada curta.',
  ],
};
const NOITE = 'As luzes de dentro do ônibus deixam a janela meio espelho: metade paisagem, metade o meu rosto.';
const CHUVA = 'A chuva risca o vidro na diagonal. O limpador do para-brisa marca o tempo lá na frente.';

export function paisagemDaViagem(destino: string, clima: Clima, minuto: number): string[] {
  const base = [...(PAISAGENS[destino] ?? PAISAGENS.farm!)];
  if (clima === 'Chuva' || clima === 'Temporal') base.splice(2, 0, CHUVA);
  if (minuto >= 19 * 60 || minuto < 6 * 60) base.splice(1, 0, NOITE);
  return base;
}

const COMPANHIA: readonly { npc: string; texto: string }[] = [
  { npc: 'julia', texto: 'Júlia, na direção: "Senta onde quiser. A essa hora o ônibus é quase só meu e seu."' },
  { npc: 'hiago', texto: 'Hiago, com a bicicleta no bagageiro: "Hoje eu deixei ela descansar. Acontece."' },
  { npc: 'jaqueline', texto: 'Jaqueline, com duas sacolas: "Não, não precisa segurar. Eu carrego pior que isso todo dia."' },
  { npc: 'ravi', texto: 'Ravi, olhando pela janela: "Eu conto os postes. Sempre dá um número diferente."' },
  { npc: 'clara', texto: 'Clara, com um livro fechado no colo: "Eu não consigo ler no ônibus. Fico olhando mesmo."' },
];
/**
 * Um conhecido no banco do lado, de vez em quando. Nunca duas vezes seguidas no
 * mesmo dia, e só quem o jogador já conhece.
 */
export function falaDeViagem(c: ContextoViagem, destino: string): string | null {
  const dia = Math.abs(Math.trunc(c.dia));
  if (dia % 3 === 1) return null;
  const candidatos = COMPANHIA.filter(x => c.relacoes.getScore(x.npc) >= 1);
  if (!candidatos.length) return null;
  const escolhido = candidatos[(dia + destino.length) % candidatos.length]!;
  return escolhido.texto;
}

import { dataDoDia, nomeDoDia } from './calendario.ts';
import type { Clima } from './clima.ts';

/**
 * RÁDIO DA CIDADE — quatro faixas por horário, com grade própria.
 *
 * Manhã dá notícia, tarde toca música, noite lê recados e a madrugada passa
 * gravação antiga. A programação é determinística: o mesmo dia e a mesma hora
 * devolvem o mesmo programa, e o que muda entre um dia e outro é a rotação da
 * grade, não um sorteio.
 *
 * A represa aparece de vez em quando, sempre como assunto de serviço — estrada,
 * neblina, obra, horário — e nunca como mistério anunciado.
 */
export type FaixaDoRadio = 'madrugada' | 'manha' | 'tarde' | 'noite';
export interface ProgramaDeRadio { faixa: FaixaDoRadio; titulo: string; texto: string }

export const NOME_DA_FAIXA: Record<FaixaDoRadio, string> = {
  madrugada: 'Madrugada', manha: 'Manhã na Rio Claro', tarde: 'Tarde musical', noite: 'Recados da noite',
};
export function faixaDoMinuto(minuto: number): FaixaDoRadio {
  const m = ((Math.trunc(minuto) % 1440) + 1440) % 1440;
  if (m < 6 * 60) return 'madrugada';
  if (m < 12 * 60) return 'manha';
  if (m < 18 * 60) return 'tarde';
  return 'noite';
}

const GRADE: Record<FaixaDoRadio, readonly string[]> = {
  madrugada: [
    'Uma gravação antiga, com chiado entre as músicas. Ninguém pede que eu responda.',
    'O locutor da madrugada não fala. Só troca os discos e deixa o silêncio entre eles.',
    'Música de outro tempo, dessas que alguém dançou antes de eu nascer.',
    'A fita pula num trecho e volta. A emissora nunca trocou essa fita.',
    'Um bolero termina e a agulha continua correndo no vazio por alguns segundos.',
  ],
  manha: [
    'Bom dia, Rio Claro. A feira abre no horário de sempre; Dona Ilda recebe fotografias antigas na biblioteca.',
    'Bom dia. A prefeitura pede cuidado com a ponte depois da chuva desta semana.',
    'Notícias da manhã: a escola procura sucata eletrônica para a feira de ciências.',
    'Bom dia. O mutirão de limpeza da margem do rio continua neste fim de semana.',
    'Notícia curta: consertaram o poste da rua da estação. Levou três meses e um abaixo-assinado.',
    'Bom dia. A cooperativa avisa que a entrega de sementes atrasou dois dias.',
  ],
  tarde: [
    'Uma canção termina; o locutor demora um pouco para voltar. Ouço a chaleira na casa ao lado.',
    'Tarde musical: um pedido de alguém que não quis dizer o nome.',
    'Toca uma música que era de propaganda e virou saudade de alguém.',
    'O locutor erra o nome da banda, se corrige e ri sozinho.',
    'Bloco de música instrumental. Dá para trabalhar ouvindo isso.',
  ],
  noite: [
    '“Para quem chegou há pouco: a luz da varanda pode ficar acesa. Tem lugar aqui.” Depois, música.',
    '“Recado para a casa da esquina: o portão continua aberto, e ninguém está bravo.”',
    '“Quem perdeu um molho de chaves perto do bar, está na farmácia.”',
    '“A família do sítio agradece quem ajudou na colheita. Foi mais gente do que cabe no recado.”',
    '“Se você está ouvindo sozinho a esta hora, o recado é este mesmo: alguém está ouvindo junto.”',
  ],
};
/** Uma referência à represa a cada sete dias, sempre em tom de serviço. */
const REPRESA: readonly string[] = [
  'Aviso de tráfego: a estrada da represa amanheceu com neblina. Motoristas, reduzam a velocidade.',
  'A concessionária informa manutenção no acesso da antiga usina. Não há previsão de reabertura ao público.',
  'Moradores relatam luz acesa na represa durante a madrugada. A companhia diz que é a equipe de ronda.',
  'Recado da administração: a área da usina continua sem visitação. Quem trabalha lá entra pelo portão de serviço.',
];
export function temReferenciaDaRepresa(dia: number): boolean {
  return Math.abs(Math.trunc(dia)) % 7 === 3;
}
export function programaDoMomento(dia: number, minuto: number, clima?: Clima): ProgramaDeRadio {
  const faixa = faixaDoMinuto(minuto);
  const d = Math.abs(Math.trunc(dia));
  const lista = GRADE[faixa];
  let texto = lista[d % lista.length]!;
  if (faixa === 'manha') {
    const data = dataDoDia(Math.max(0, Math.trunc(dia)));
    const tempo = clima ? ` Tempo para hoje: ${clima.toLowerCase()}.` : '';
    texto = `${nomeDoDia(dia)}, ${data.diaEstacao} de ${data.nomeEstacao}. ${texto}${tempo}`;
  }
  if (temReferenciaDaRepresa(dia) && (faixa === 'manha' || faixa === 'madrugada')) {
    texto = `${texto}\n\n${REPRESA[Math.floor(d / 7) % REPRESA.length]!}`;
  }
  return { faixa, titulo: NOME_DA_FAIXA[faixa], texto };
}
/** Texto único para quem só quer ligar o rádio e ouvir o que estiver tocando. */
export function programaRadio(minuto: number, dia: number, clima?: Clima): string {
  const p = programaDoMomento(dia, minuto, clima);
  return `${p.titulo}: ${p.texto}`;
}

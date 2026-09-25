import { escreverDiario } from './diarioPessoal.ts';

/**
 * MEMÓRIA DA CIDADE — documentos espalhados, arquivo histórico e a sala de
 * memória da biblioteca.
 *
 * Os documentos ficam em lugares que já existem: a plataforma da estação, o
 * pátio da madeireira, a curva da estrada. Recolher é opcional; entregar a
 * Clara ou a Ilda é o que constrói o arquivo, e é delas a leitura do material —
 * o protagonista carrega papel, não conclusões.
 *
 * Nada aqui fecha uma explicação sobre a represa. A ferrovia tem um túnel que
 * ninguém sabe explicar, e o arquivo registra isso como pergunta em aberto.
 */
export type TemaDeDocumento = 'usina' | 'ferrovia' | 'cidade' | 'fotografia' | 'relato';
export interface DocumentoHistorico {
  id: string;
  nome: string;
  tema: TemaDeDocumento;
  mapa: string;
  tile: { x: number; y: number };
  texto: string;
  /** Flag exigida; sem ela o documento ainda não está acessível. */
  requisito?: string;
}
export interface ContextoMemoria {
  dia: number;
  worldEvents: { obter(k: string): string | number | boolean | undefined; definir(k: string, v: string | number | boolean): void; ativa(k: string): boolean };
}

export const NOME_DO_TEMA: Record<TemaDeDocumento, string> = {
  usina: 'A usina', ferrovia: 'A ferrovia', cidade: 'A cidade', fotografia: 'Fotografias', relato: 'Relatos',
};

export const DOCUMENTOS: readonly DocumentoHistorico[] = [
  { id: 'horario_trem', nome: 'Quadro de horários do trem', tema: 'ferrovia', mapa: 'bairro', tile: { x: 74, y: 41 },
    texto: 'Um quadro de horários preso com dois parafusos. A última coluna, de sábado, foi riscada à caneta e nunca reescrita.' },
  { id: 'foto_plataforma', nome: 'Fotografia da plataforma', tema: 'fotografia', mapa: 'bairro', tile: { x: 68, y: 43 },
    texto: 'Gente esperando, chapéu na mão, um cachorro no canto. Atrás, escrito a lápis: "último domingo de serviço".' },
  { id: 'bilhete_tunel', nome: 'Bilhete sobre o túnel', tema: 'ferrovia', mapa: 'bairro', tile: { x: 83, y: 47 },
    texto: 'Um bilhete de serviço: "fechar a boca menor com alvenaria". Não diz por quê, e não há segunda folha.' },
  { id: 'trilho_marcado', nome: 'Pedaço de trilho numerado', tema: 'ferrovia', mapa: 'rural', tile: { x: 96, y: 40 },
    texto: 'Um pedaço de trilho com número de lote e ano. Serviu de mourão por tempo demais para reclamar de ferrugem.' },
  { id: 'folha_ponto', nome: 'Folha de ponto da usina', tema: 'usina', mapa: 'represa', tile: { x: 41, y: 128 },
    texto: 'Quarenta nomes e a hora de entrada. Um deles aparece duas vezes no mesmo dia, com letras diferentes.' },
  { id: 'manual_comporta', nome: 'Manual da comporta', tema: 'usina', mapa: 'represa', tile: { x: 38, y: 116 },
    texto: 'Instruções de operação, redigidas com paciência. A página da manutenção anual foi arrancada.' },
  { id: 'cartaz_inauguracao', nome: 'Cartaz de inauguração', tema: 'usina', mapa: 'farm', tile: { x: 58, y: 49 },
    texto: 'O cartaz promete luz para toda a região. A data está impressa; o nome da empresa, carimbado por cima de outro.' },
  { id: 'foto_turma', nome: 'Fotografia da turma de 3º turno', tema: 'fotografia', mapa: 'farm', tile: { x: 63, y: 53 },
    texto: 'Onze pessoas em fila, capacete na mão. Alguém escreveu apelidos embaixo, e três deles estão borrados.' },
  { id: 'ata_moradores', nome: 'Ata de reunião de moradores', tema: 'cidade', mapa: 'farm', tile: { x: 50, y: 42 },
    texto: 'Pauta única: o coreto da praça. Decidiram desmontar e guardar as peças. Não diz onde guardaram.' },
  { id: 'lista_doacao', nome: 'Lista de doações da biblioteca', tema: 'cidade', mapa: 'bairro', tile: { x: 52, y: 44 },
    texto: 'Dezessete famílias, cada uma com o número de livros doados. A caligrafia muda três vezes na mesma página.' },
  { id: 'relato_cheia', nome: 'Relato da cheia', tema: 'relato', mapa: 'rural', tile: { x: 120, y: 84 },
    texto: 'Alguém escreveu, dias depois: "a água chegou no terceiro degrau e parou. Ficamos olhando, e depois voltamos a trabalhar".' },
  { id: 'caderno_vizinha', nome: 'Caderno de uma vizinha', tema: 'relato', mapa: 'rural', tile: { x: 32, y: 82 },
    texto: 'Anotações de safra, chuva e nascimento, na mesma página e com a mesma letra. Um dia tem só: "silêncio bom".' },
];

export function documentosDoMapa(mapa: string): DocumentoHistorico[] {
  return DOCUMENTOS.filter(d => d.mapa === mapa);
}
export function documentoDisponivel(c: ContextoMemoria, d: DocumentoHistorico): boolean {
  return !d.requisito || c.worldEvents.ativa(d.requisito);
}
export function temDocumento(c: ContextoMemoria, id: string): boolean {
  return c.worldEvents.ativa(`memoria:doc:${id}`);
}
export function arquivado(c: ContextoMemoria, id: string): boolean {
  return c.worldEvents.ativa(`memoria:arquivo:${id}`);
}
export function coletarDocumento(c: ContextoMemoria, id: string): DocumentoHistorico | null {
  const doc = DOCUMENTOS.find(d => d.id === id);
  if (!doc || temDocumento(c, id) || !documentoDisponivel(c, doc)) return null;
  c.worldEvents.definir(`memoria:doc:${id}`, true);
  if (doc.tema === 'ferrovia') c.worldEvents.definir('memoria:ferrovia', true);
  escreverDiario(c, `memoria:${id}`, `Recolhi ${doc.nome.toLowerCase()}. Não é meu; é da cidade. Vou levar para a biblioteca.`);
  return doc;
}
export function naMochila(c: ContextoMemoria): DocumentoHistorico[] {
  return DOCUMENTOS.filter(d => temDocumento(c, d.id) && !arquivado(c, d.id));
}
export function documentosArquivados(c: ContextoMemoria): DocumentoHistorico[] {
  return DOCUMENTOS.filter(d => arquivado(c, d.id));
}
/** Quem cataloga é Clara ou Ilda; o protagonista entrega e escuta. */
export const ARQUIVISTAS: readonly string[] = ['clara', 'ilda'];
export interface Catalogacao { documento: DocumentoHistorico; fala: string; total: number; abriuMuseu: boolean }
const FALAS_CLARA: Record<TemaDeDocumento, string> = {
  ferrovia: 'Isso entra na caixa da ferrovia. Já são algumas peças, e nenhuma delas explica o túnel.',
  usina: 'Vou catalogar com a data que está impressa, não com a que a gente supõe.',
  cidade: 'Papel de reunião é bom: diz o que decidiram, e às vezes o que evitaram decidir.',
  fotografia: 'Fotografia sem legenda vale mais com a legenda de quem reconhece. Vou mostrar para a Ilda.',
  relato: 'Relato a gente guarda inteiro, inclusive quando contradiz outro relato.',
};
const FALAS_ILDA: Record<TemaDeDocumento, string> = {
  ferrovia: 'Meu pai trabalhou nessa linha. Não vou escrever isso na ficha; escrevo o que o papel diz.',
  usina: 'Eu conheço três pessoas dessa lista. Duas ainda moram aqui.',
  cidade: 'A cidade se explica melhor pelas atas do que pelas histórias que ela conta de si mesma.',
  fotografia: 'Essa é do terceiro turno. Reconheço a mão do que escreveu embaixo.',
  relato: 'Relato é a única coisa que a gente não pode conferir. Por isso é o que mais falta.',
};
export function entregarAoArquivo(c: ContextoMemoria, id: string, arquivista: string): Catalogacao | null {
  const doc = DOCUMENTOS.find(d => d.id === id);
  if (!doc || !temDocumento(c, id) || arquivado(c, id) || !ARQUIVISTAS.includes(arquivista)) return null;
  c.worldEvents.definir(`memoria:arquivo:${id}`, true);
  const total = documentosArquivados(c).length;
  c.worldEvents.definir('memoria:arquivados', total);
  const abriuMuseu = total >= 8 && !c.worldEvents.ativa('memoria:museu');
  if (abriuMuseu) {
    c.worldEvents.definir('memoria:museu', true);
    escreverDiario(c, 'memoria:museu', 'A sala dos fundos da biblioteca virou exposição. Clara chamou de sala de memória; Ilda chamou de museu, rindo.');
  }
  const fala = (arquivista === 'ilda' ? FALAS_ILDA : FALAS_CLARA)[doc.tema];
  return { documento: doc, fala, total, abriuMuseu };
}
export function progressoDoArquivo(c: ContextoMemoria): { arquivados: number; total: number; texto: string } {
  const arquivados = documentosArquivados(c).length;
  const texto = arquivados === 0
    ? 'O arquivo ainda é uma caixa vazia com etiqueta.'
    : arquivados < 4
      ? `${arquivados} de ${DOCUMENTOS.length} documentos catalogados. Clara separou uma prateleira.`
      : arquivados < 8
        ? `${arquivados} de ${DOCUMENTOS.length}. Ilda começou a escrever fichas com a letra dela, que ninguém discute.`
        : `${arquivados} de ${DOCUMENTOS.length}. A sala dos fundos já recebe visita.`;
  return { arquivados, total: DOCUMENTOS.length, texto };
}

// ------------------------------------------------------------ sala de memória --
export function museuAberto(c: ContextoMemoria): boolean { return c.worldEvents.ativa('memoria:museu'); }
export interface SecaoDoMuseu { tema: TemaDeDocumento; titulo: string; pecas: string[]; texto: string }
const APRESENTACAO: Record<TemaDeDocumento, string> = {
  usina: 'Uma bancada com peças de manutenção, o manual aberto e a folha de ponto sob vidro.',
  ferrovia: 'Um trilho numerado apoiado na parede, o quadro de horários e o bilhete do túnel, emoldurados lado a lado.',
  cidade: 'As atas e a lista de doações, com a caligrafia de três pessoas diferentes marcada em azul.',
  fotografia: 'Fotografias em fila, na altura dos olhos de uma criança. Foi a Ilda quem decidiu a altura.',
  relato: 'Cadernos abertos em páginas escolhidas. Um deles está aberto na linha que diz apenas "silêncio bom".',
};
export function secoesDoMuseu(c: ContextoMemoria): SecaoDoMuseu[] {
  const arquivados = documentosArquivados(c);
  return (Object.keys(NOME_DO_TEMA) as TemaDeDocumento[])
    .map(tema => ({
      tema,
      titulo: NOME_DO_TEMA[tema],
      pecas: arquivados.filter(d => d.tema === tema).map(d => d.nome),
      texto: APRESENTACAO[tema],
    }))
    .filter(s => s.pecas.length > 0);
}

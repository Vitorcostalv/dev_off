import type { ContextoSocial } from './vidaSocial.ts';
export interface MensagemPessoal { id: string; npc: string; texto: string; resposta: string; retorno: string; demora: number }
export const MENSAGENS: readonly MensagemPessoal[] = [
  { id: 'edu', npc: 'edu', texto: 'Vou dar uma volta depois. Se quiser ir, não precisa responder agora.', resposta: 'Hoje eu vou tentar sair.', retorno: 'Estou por perto. Mesmo que hoje não dê.', demora: 90 },
  { id: 'leticia', npc: 'leticia', texto: 'A luz estava bonita na praça. Guardei uma foto para te mostrar.', resposta: 'Quero ver.', retorno: 'Quando a gente se encontrar. Não tem pressa.', demora: 150 },
  { id: 'alice', npc: 'alice', texto: 'Sobrou sopa. Se passar aqui, tem.', resposta: 'Obrigado por lembrar.', retorno: 'Ainda tem. Esquentei de novo.', demora: 30 },
  { id: 'wendel', npc: 'wendel', texto: 'O rádio voltou a tocar. Achei que você gostaria de saber.', resposta: 'Fico feliz que esteja funcionando.', retorno: 'Também. Estou ouvindo agora.', demora: 360 },
  { id: 'jaqueline', npc: 'jaqueline', texto: 'Se ouvir um barulho, é a prateleira. Não é um pedido de serviço!', resposta: 'Se precisar de companhia, eu passo.', retorno: 'Companhia pode. Trabalho fica para outro dia.', demora: 45 },
];
export function mensagensDisponiveis(c: ContextoSocial): readonly MensagemPessoal[] { return MENSAGENS.filter(m => c.relacoes.getScore(m.npc) >= 2); }
export function responderMensagem(c: ContextoSocial, id: string): boolean {
  if (!mensagensDisponiveis(c).some(m => m.id === id) || c.worldEvents.obter(`celular:resposta:${id}`) !== undefined) return false;
  c.worldEvents.definir(`celular:resposta:${id}`, c.dia * 1440 + c.relogio.minutos); return true;
}
export function conversaCelular(c: ContextoSocial, m: MensagemPessoal): string {
  const enviada = c.worldEvents.obter(`celular:resposta:${m.id}`);
  return `${m.texto}${typeof enviada === 'number' ? `\n\nVocê: ${m.resposta}\n\n${c.dia * 1440 + c.relogio.minutos >= enviada + m.demora ? m.retorno : 'A mensagem foi enviada. Ainda não houve resposta.'}` : ''}`;
}
export interface FotoPessoal { id: string; dia: number; mapa: string; imagem: string }
export function fotosPessoais(flags: Record<string, unknown>): FotoPessoal[] {
  return Object.entries(flags).flatMap(([k, v]) => {
    if (!k.startsWith('foto:') || typeof v !== 'string') return [];
    try { const f = JSON.parse(v); return typeof f.id === 'string' && Number.isSafeInteger(f.dia) && typeof f.mapa === 'string' && /^data:image\/jpeg;base64,/.test(f.imagem) && f.imagem.length < 60000 ? [f as FotoPessoal] : []; } catch { return []; }
  }).sort((a, b) => b.dia - a.dia);
}

import { encontroDoDia } from './rotinaSocial.ts';
import { dataDoDia } from './calendario.ts';
import { escreverDiario } from './diarioPessoal.ts';
import type { ContextoSocial } from './vidaSocial.ts';
import type { Fala } from './tipos.ts';
const falas: Record<string, readonly (readonly [string, string])[]> = {
  feira_da_estacao: [['jaqueline', 'Esse pão chegou agora. Pode pegar uma ponta antes de escolher.'], ['davi', 'Na primeira fornada eu sempre faço um a mais. Para quem vem só olhar.'], ['leticia', 'A praça muda quando tem gente parada em volta de uma mesa.']],
  noite_rio: [['mari', 'Eu achei que a gente ia caminhar.'], ['edu', 'A gente veio até aqui. Agora pode ficar.'], ['leticia', 'Não precisa fazer uma coisa com essa noite. Olha a água.']],
  festival_estacao: [['jaqueline', 'Luke, deixa o fio. Está funcionando!'], ['luke', 'É justamente agora que dá para entender como funciona.'], ['vitor', 'Hiago, você ficou para ouvir?'], ['hiago', 'A bicicleta não reclamou.']],
  jantar_comunitario: [['joao', 'A Neide disse para eu não oferecer trabalho durante o jantar.'], ['neide', 'E você conseguiu quase dois minutos.'], ['alice', 'Wendel, esse prato não é para levar para a farmácia.'], ['wendel', 'Já entendi. Vou sentar.']],
  memorial_usina: [['roberto', 'Lembro mais do barulho dos portões do que dos nomes.'], ['ilda', 'Então conta o barulho. Também é história.'], ['ravi', 'Posso gravar? Sem cortar quando alguém fica quieto.'], ['clara', 'Podemos guardar o que sabemos sem preencher o que falta.']],
};
export function eventoNoLugar(c: ContextoSocial): ReturnType<typeof encontroDoDia> {
  const e = encontroDoDia(c.dia);
  return e && falas[e.id] && c.relogio.minutos >= e.inicio && c.relogio.minutos < e.fim && c.mapa === (e.construcao ?? e.mapa) ? e : null;
}
export function dialogoDoEvento(c: ContextoSocial): Fala[] {
  const e = eventoNoLugar(c); if (!e) return [];
  const ano = dataDoDia(c.dia).ano;
  const retornos: Record<string, readonly [string, string]> = {
    feira_da_estacao: ['Na outra feira você ficou olhando da ponta. Hoje já sabe onde deixamos os pratos.', 'Davi mudou a receita outra vez. A gente pode gostar da anterior e provar essa.'],
    noite_rio: ['A margem mudou desde a última vez. Eu também não cheguei exatamente igual.', 'Trouxe uma manta. Na outra noite a gente ficou até sentir frio.'],
    festival_estacao: ['Esse fio aguentou mais um festival. Luke acha que foi porque não deixei ele mexer.', 'A gente esqueceu a ordem das músicas. Ninguém pareceu sentir falta.'],
    jantar_comunitario: ['Este ano eu trouxe só a comida. As contas da roça ficaram em casa.', 'A mesa ficou pequena. Puxamos outra, diferente. Não precisa combinar.'],
    memorial_usina: ['Trouxemos relatos que não estavam aqui no ano passado. Alguns se contradizem.', 'Ravi encontrou um silêncio na gravação e quis saber se devia cortar. Deixamos.'],
  };
  const base = falas[e.id]!.map(([npcId, texto], i) => ({ nome: npcId[0]!.toUpperCase() + npcId.slice(1), npcId, texto: ano > 1 && i === 0 ? retornos[e.id]![(ano - 2) % 2]! : texto }));
  return base;
}
export function concluirEvento(c: ContextoSocial): boolean {
  const e = eventoNoLugar(c); if (!e) return false;
  const id = `${e.id}:${c.dia}`; if (c.worldEvents.ativa(`social:evento:${id}`)) return false;
  c.worldEvents.definir(`social:evento:${id}`, true);
  c.worldEvents.definir('social:ultimoMarco', e.nome); c.worldEvents.definir('social:diaMarco', c.dia);
  escreverDiario(c, `evento:${id}`, `${e.nome}. Fiquei um pouco. Não precisei justificar estar ali.`); return true;
}

import type { EstadoNpc } from './rotinasNpc.ts';

export interface FalaEncontro { npcId: string; texto: string }
export interface DefinicaoEncontro { id: string; participantes: readonly string[]; falas: readonly FalaEncontro[] }

export const ENCONTROS_NPC: readonly DefinicaoEncontro[] = [
  { id: 'mari_leticia_edu', participantes: ['mari', 'leticia', 'edu'], falas: [{ npcId: 'mari', texto: 'Vocês vieram caminhando tão devagar.' }, { npcId: 'edu', texto: 'A gente parou.' }, { npcId: 'leticia', texto: 'Mais de uma vez. Quer tentar também?' }] },
  { id: 'jaqueline_luke', participantes: ['jaqueline', 'luke'], falas: [{ npcId: 'jaqueline', texto: 'Dessa vez você vai guardar os parafusos?' }, { npcId: 'luke', texto: 'Eu guardei. Só não lembro em qual aparelho.' }, { npcId: 'jaqueline', texto: 'Isso explica bastante coisa.' }] },
  { id: 'vitor_hiago', participantes: ['vitor', 'hiago'], falas: [{ npcId: 'vitor', texto: 'Trouxe uma música.' }, { npcId: 'hiago', texto: 'Trouxe a bicicleta. Mas ela pode esperar.' }] },
  { id: 'familia_joao', participantes: ['joao', 'neide', 'priscila'], falas: [{ npcId: 'joao', texto: 'Anotei tudo no papel.' }, { npcId: 'priscila', texto: 'Esse papel embrulhava um pão.' }, { npcId: 'neide', texto: 'O pão eu guardei. O papel é de vocês.' }] },
  { id: 'roberto_ilda_ravi', participantes: ['roberto', 'ilda', 'ravi'], falas: [{ npcId: 'ravi', texto: 'Vocês lembram da mesma história diferente.' }, { npcId: 'ilda', texto: 'A gente estava em lugares diferentes.' }, { npcId: 'roberto', texto: 'E um de nós estava prestando atenção.' }] },
  { id:'edu_leticia', participantes:['edu','leticia'], falas:[
    {npcId:'edu',texto:'Voce anda demais.'},{npcId:'leticia',texto:'Voce tambem.'},
    {npcId:'edu',texto:'Eu tenho lugares para nao chegar.'},{npcId:'leticia',texto:'...faz sentido.'},
  ]},
  { id:'mari_leticia', participantes:['mari','leticia'], falas:[
    {npcId:'mari',texto:'Voce precisava escolher um rumo.'},{npcId:'leticia',texto:'E voce precisava parar pra respirar.'},
    {npcId:'mari',texto:'Depois do treino.'},{npcId:'leticia',texto:'Eu sabia.'},
  ]},
  { id:'jaqueline_alice', participantes:['jaqueline','alice'], falas:[
    {npcId:'jaqueline',texto:'Eu soube de uma coisa otima. Nada grave.'},{npcId:'alice',texto:'Entao pode contar devagar.'},
    {npcId:'jaqueline',texto:'Devagar eu nao prometo.'},{npcId:'alice',texto:'Era o que eu esperava.'},
  ]},
  { id:'alice_wendel', participantes:['alice','wendel'], falas:[
    {npcId:'alice',texto:'Voce nao mora em cima da farmacia.'},{npcId:'wendel',texto:'Moro, sim.'},
    {npcId:'alice',texto:'Voce e um movel da farmacia.'},{npcId:'wendel',texto:'Um movel util.'},
  ]},
  { id:'edu_mari', participantes:['edu','mari'], falas:[
    {npcId:'mari',texto:'Hoje voce vai treinar de verdade?'},{npcId:'edu',texto:'Eu vim ate a academia. Ja conta cardio.'},
    {npcId:'mari',texto:'Nao conta.'},{npcId:'edu',texto:'Eu tentei.'},
  ]},
];

export interface EncontroAtivo {
  definicao: DefinicaoEncontro;
  indiceFala: number;
  restanteFalaMs: number;
}

export const ALCANCE_BALAO_TILES = 8;
export const jogadorOuveEncontro = (distanciaTiles: number): boolean => distanciaTiles <= ALCANCE_BALAO_TILES;

const hash = (texto: string): number => {
  let n = 2166136261;
  for (const c of texto) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
};

export class SistemaEncontrosNpc {
  ativo: EncontroAtivo | null = null;
  private tentados = new Set<string>();
  private dia = -1;

  /** Retorna os IDs que devem ser pausados quando um encontro acaba de iniciar. */
  atualizar(dia: number, deltaMs: number, estados: readonly EstadoNpc[], forcar = false, relacao: (id: string) => number = () => 0): readonly string[] {
    if (dia !== this.dia) { this.dia = dia; this.tentados.clear(); this.ativo = null; }
    if (this.ativo) {
      this.ativo.restanteFalaMs -= deltaMs;
      if (this.ativo.restanteFalaMs <= 0) {
        this.ativo.indiceFala += 1;
        this.ativo.restanteFalaMs = 1450;
        if (this.ativo.indiceFala >= this.ativo.definicao.falas.length) this.ativo = null;
      }
      return [];
    }
    const porId = new Map(estados.map((e) => [e.id, e]));
    for (const encontro of ENCONTROS_NPC) {
      const chave = `${dia}:${encontro.id}`;
      if (this.tentados.has(chave)) continue;
      const presentes = encontro.participantes.map((id) => porId.get(id));
      const a = presentes[0];
      if (!a || presentes.some(p => !p || (!p.visivel && !p.dentro) || p.dentro !== a.dentro || p.mapaAtual !== a.mapaAtual || Math.hypot(a.x - p.x, a.y - p.y) > 3.2)) continue;
      this.tentados.add(chave);
      const acontece = forcar || hash(chave) / 0xffffffff < 0.36;
      if (!acontece) continue;
      const proximos = encontro.participantes.every(id => relacao(id) >= 5);
      const definicao = proximos ? { ...encontro, falas: [...encontro.falas, { npcId: encontro.participantes[0]!, texto: 'Depois a gente passa na oficina. Hoje só para conversar.' }] } : encontro;
      this.ativo = { definicao, indiceFala:0, restanteFalaMs:1450 };
      return encontro.participantes;
    }
    return [];
  }
}

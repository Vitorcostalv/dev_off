import type { EstadoNpc } from './rotinasNpc.ts';

export interface FalaEncontro { npcId: string; texto: string }
export interface DefinicaoEncontro { id: string; participantes: readonly [string, string]; falas: readonly FalaEncontro[] }

export const ENCONTROS_NPC: readonly DefinicaoEncontro[] = [
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
  atualizar(dia: number, deltaMs: number, estados: readonly EstadoNpc[], forcar = false): readonly string[] {
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
      const [a,b] = encontro.participantes.map((id) => porId.get(id));
      if (!a || !b || !a.visivel || !b.visivel || a.dentro !== b.dentro) continue;
      if (Math.hypot(a.x-b.x,a.y-b.y) > 2.2) continue;
      this.tentados.add(chave);
      const acontece = forcar || hash(chave) / 0xffffffff < 0.36;
      if (!acontece) continue;
      this.ativo = { definicao:encontro, indiceFala:0, restanteFalaMs:1450 };
      return encontro.participantes;
    }
    return [];
  }
}

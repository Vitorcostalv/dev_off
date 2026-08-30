import type { Dificuldade, Vaga } from './trabalhos.ts';

export type EstadoMissaoNpc = 'disponivel' | 'em_andamento' | 'concluida';
export type TipoConclusaoMissao = 'encontrar_e_devolver' | 'entregar_item_no_local' | 'conserto';

export interface MissaoNpc {
  id: string;
  npcId: 'edu' | 'mari' | 'jaqueline' | 'leticia' | 'wendel' | 'alice';
  titulo: string;
  requisitoRelacao: number;
  descricao: string;
  tipo: TipoConclusaoMissao;
  recompensa: number;
  bonusRelacao: number;
  worldEvent: string;
  itemId?: string;
  localEntrega?: string;
  aparelho?: string;
  dificuldade?: Dificuldade;
  falaInicio: string[];
  falaConclusao: string[];
}

export const MISSOES_NPC: readonly MissaoNpc[] = [
  { id:'edu_notebook', npcId:'edu', titulo:'O notebook esquecido', requisitoRelacao:2, descricao:'Encontre o notebook que Edu esqueceu durante uma caminhada e devolva a ele.', tipo:'encontrar_e_devolver', recompensa:42000, bonusRelacao:2, worldEvent:'missaoEduNotebookConcluida', itemId:'notebook_edu', falaInicio:['Eu perdi meu notebook numa caminhada. Sim, eu sei como isso soa.','Se encontrar uma mochila preta perto da avenida, me avisa?'], falaConclusao:['Era esse. Voce acabou de salvar uma semana inteira de trabalho.','Obrigado. De verdade.'] },
  { id:'mari_equipamento', npcId:'mari', titulo:'Equipamento novo', requisitoRelacao:2, descricao:'Compre um Fone Esportivo e entregue a Mari dentro da academia durante o expediente.', tipo:'entregar_item_no_local', recompensa:44000, bonusRelacao:2, worldEvent:'missaoMariEquipamentoConcluida', itemId:'fone_esportivo', localEntrega:'academia', falaInicio:['Meu fone de treino desistiu antes de mim. Preciso de um Fone Esportivo da DevStore.','Traz aqui na academia durante meu turno que eu te pago pelo corre.'], falaConclusao:['ISSO. Agora sim equipamento que acompanha o treino.','Voce resolveu rapido. Gostei.'] },
  { id:'jaqueline_caixa', npcId:'jaqueline', titulo:'O caixa quebrado', requisitoRelacao:3, descricao:'Conserte o caixa registrador do mercado pelo app Trabalho.', tipo:'conserto', recompensa:48000, bonusRelacao:2.5, worldEvent:'missaoJaquelineCaixaConcluida', aparelho:'console', dificuldade:'media', falaInicio:['O caixa resolveu somar tudo errado justo hoje. Eu disse que conhecia alguem competente.','A vaga esta no seu computador. Nao me faz perder a fofoca de que eu estava certa.'], falaConclusao:['Olha... ficou melhor que antes. Nao espalha que eu fiquei impressionada.','Quer dizer, pode espalhar um pouquinho.'] },
  { id:'leticia_camera', npcId:'leticia', titulo:'A camera antiga', requisitoRelacao:2, descricao:'Encontre a camera antiga de Leticia e devolva quando ela estiver na praca a tarde.', tipo:'encontrar_e_devolver', recompensa:43000, bonusRelacao:2.5, worldEvent:'missaoLeticiaCameraConcluida', itemId:'camera_leticia', localEntrega:'praca', falaInicio:['Acho que deixei minha camera antiga perto do parque, num dia em que andei sem perceber a hora.','Nao vale muito, mas tem fotos que eu ainda nao revelei.'], falaConclusao:['Voce guardou com cuidado... eu reparei.','Foi um gesto muito atencioso. Obrigada, sem alarde.'] },
  { id:'wendel_hd', npcId:'wendel', titulo:'O HD da esposa', requisitoRelacao:7, descricao:'Recupere no app Trabalho o HD que guarda arquivos da falecida esposa de Wendel.', tipo:'conserto', recompensa:60000, bonusRelacao:3, worldEvent:'missaoWendelHdConcluida', aparelho:'notebook', dificuldade:'dificil', falaInicio:['Tenho um HD antigo. Era da minha esposa. Nao preciso de tudo; so nao quero perder sem tentar.','Se aceitar, a ordem esta no seu computador.'], falaConclusao:['Voce recuperou. Certo.','...obrigado. Eu vou guardar no lugar certo.'] },
  { id:'alice_vitrola', npcId:'alice', titulo:'A vitrola do bar', requisitoRelacao:3, descricao:'Conserte a vitrola antiga do bar pelo app Trabalho.', tipo:'conserto', recompensa:50000, bonusRelacao:2.5, worldEvent:'missaoAliceVitrolaConcluida', aparelho:'console', dificuldade:'media', falaInicio:['A vitrola decidiu que silencio combina com bar. Discordo profundamente.','A ordem de conserto esta no seu computador.'], falaConclusao:['Voltou a tocar. Milagre tecnico com garantia, espero.','Wendel vai fingir que nao sentiu falta dela. Eu conheco aquele movel de farmacia.'] },
];

export interface DadosMissoesNpc { estados: Array<[string, EstadoMissaoNpc]> }

export class SistemaMissoesNpc {
  private estados = new Map<string, EstadoMissaoNpc>();
  estado(id: string): EstadoMissaoNpc {
    return this.estados.get(id) ?? 'disponivel';
  }
  iniciar(id: string): boolean {
    if (!MISSOES_NPC.some((m) => m.id === id) || this.estado(id) !== 'disponivel') return false;
    this.estados.set(id, 'em_andamento');
    return true;
  }
  concluir(id: string): MissaoNpc | null {
    const missao = MISSOES_NPC.find((m) => m.id === id);
    if (!missao || this.estado(id) !== 'em_andamento') return null;
    this.estados.set(id, 'concluida');
    return missao;
  }
  concluirComRecompensas(
    id: string,
    destino: {
      carteira: { ganhar(valor: number): { ok: boolean } };
      relacoes: { ganharRelacao(npcId: string, valor: number): void };
      worldEvents: { definir(chave: string, valor: boolean): void };
    },
  ): MissaoNpc | null {
    const missao = MISSOES_NPC.find((m) => m.id === id);
    if (!missao || this.estado(id) !== 'em_andamento') return null;
    const pagamento = destino.carteira.ganhar(missao.recompensa);
    if (!pagamento.ok) return null;
    this.estados.set(id, 'concluida');
    destino.relacoes.ganharRelacao(missao.npcId, missao.bonusRelacao);
    destino.worldEvents.definir(missao.worldEvent, true);
    return missao;
  }
  porNpc(npcId: string): MissaoNpc | null {
    return MISSOES_NPC.find((m) => m.npcId === npcId) ?? null;
  }
  vagasDeConserto(): Vaga[] {
    return MISSOES_NPC.filter((m) => m.tipo === 'conserto' && this.estado(m.id) === 'em_andamento').map((m) => ({
      id: `missao_${m.id}`, missaoNpcId: m.id, tipo:'conserto', titulo:m.titulo,
      descricao:m.descricao, cliente:m.npcId, dificuldade:m.dificuldade ?? 'media',
      recompensa:m.recompensa, aparelho:m.aparelho,
    }));
  }
  serializar(): DadosMissoesNpc { return { estados: [...this.estados.entries()] }; }
  restaurar(bruto: unknown): void {
    this.estados.clear();
    if (!bruto || typeof bruto !== 'object') return;
    for (const entrada of Array.isArray((bruto as Partial<DadosMissoesNpc>).estados) ? (bruto as DadosMissoesNpc).estados : []) {
      if (!Array.isArray(entrada) || entrada.length !== 2) continue;
      const [id, valor] = entrada;
      if (MISSOES_NPC.some((m) => m.id === id) && ['disponivel','em_andamento','concluida'].includes(valor)) this.estados.set(id, valor);
    }
  }
}

export const PONTOS_ITENS_MISSAO = [
  { missaoId:'edu_notebook', mapa:'farm', tile:{x:96,y:70}, itemId:'notebook_edu', titulo:'Mochila esquecida' },
  { missaoId:'leticia_camera', mapa:'farm', tile:{x:43,y:58}, itemId:'camera_leticia', titulo:'Estojo antigo' },
] as const;

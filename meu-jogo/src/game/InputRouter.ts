export const CONTROLES = {
  cima: ['Subir', 'KeyW'], baixo: ['Descer', 'KeyS'], esquerda: ['Esquerda', 'KeyA'], direita: ['Direita', 'KeyD'],
  interagir: ['Interagir', 'KeyE'], correr: ['Correr', 'ShiftLeft'], inventario: ['Inventario', 'Tab'], mapa: ['Mapa', 'KeyM'],
  atacar: ['Golpear', 'Space'], recarregar: ['Recarregar', 'KeyR'], usar: ['Usar item', 'KeyU'], equipar: ['Equipar', 'KeyF'],
} as const;
export type Acao = keyof typeof CONTROLES;
export class InputRouter {
  private teclas = new Set<string>();
  private novas = new Set<string>();
  private pad = new Set<Acao>();
  private padNovas = new Set<Acao>();
  private atalhos = Object.fromEntries(Object.entries(CONTROLES).map(([id, v]) => [id, v[1]])) as Record<Acao, string>;
  private capturar: ((code: string) => void) | null = null;
  private ignorar = new Set<string>();
  padPausa = false;
  padVoltar = false;
  private botoesAntes = new Set<number>();
  atirando = false;
  mira = { x: 0, y: 1 };
  usandoMiraPad = false;
  constructor() {
    try { const d = JSON.parse(localStorage.getItem('meu-jogo:controls') ?? '{}');
      const candidato = { ...this.atalhos, ...Object.fromEntries((Object.keys(CONTROLES) as Acao[]).filter(id => typeof d?.[id] === 'string').map(id => [id, d[id]])) };
      if (Object.values(candidato).every(code => /^(Key[A-Z]|Digit[0-9]|Space|Tab|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(code)) && new Set(Object.values(candidato)).size === Object.keys(CONTROLES).length) this.atalhos = candidato;
    } catch { /* padroes continuam disponiveis */ }
    window.addEventListener('keydown', e => {
      if (this.capturar) {
        e.preventDefault(); e.stopImmediatePropagation(); this.ignorar.add(e.code);
        if (!e.repeat) { const cb = this.capturar; this.capturar = null; cb(e.code); } return;
      }
      if (this.ignorar.has(e.code)) { e.stopImmediatePropagation(); return; }
      if (!this.teclas.has(e.code)) this.novas.add(e.code); this.teclas.add(e.code);
    }, true);
    window.addEventListener('keyup', e => { this.teclas.delete(e.code); this.ignorar.delete(e.code); }, true);
    window.addEventListener('blur', () => this.limpar());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.limpar(); });
  }
  limpar(): void { this.teclas.clear(); this.novas.clear(); this.pad.clear(); this.padNovas.clear(); this.botoesAntes.clear(); }
  get capturando(): boolean { return this.capturar !== null; }
  aguardar(cb: (code: string) => void): void { this.limpar(); this.capturar = cb; }
  cancelarCaptura(): void { this.capturar = null; }
  rotulo(id: Acao): string { return this.atalhos[id].replace('Key', '').replace('Digit', '').replace('Left', '').replace('Right', ''); }
  corresponde(id: Acao, e: KeyboardEvent): boolean { return e.code === this.atalhos[id]; }
  pressionada(id: Acao): boolean { return this.teclas.has(this.atalhos[id]) || this.pad.has(id); }
  apertou(id: Acao): boolean { return this.novas.has(this.atalhos[id]) || this.padNovas.has(id); }
  apertouPad(id: Acao): boolean { return this.padNovas.has(id); }
  atribuir(id: Acao, code: string, salvar = true): string {
    if (['KeyC', 'KeyJ', 'KeyX', 'KeyO'].includes(code)) return 'C, J, X e O ficam reservados para loja, arquivo e inventario.';
    if (!/^(Key[A-Z]|Digit[0-9]|Space|Tab|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(code)) return 'Use uma letra, numero, Shift, Ctrl, Tab ou Espaco.';
    if (Object.entries(this.atalhos).some(([outro, valor]) => outro !== id && valor === code)) return 'Esta tecla ja pertence a outra acao.';
    this.atalhos[id] = code;
    if (salvar) try { localStorage.setItem('meu-jogo:controls', JSON.stringify(this.atalhos)); } catch { return 'Aplicado; nao foi possivel salvar.'; }
    return 'Controle atualizado.';
  }
  restaurarPadroes(): void {
    for (const id of Object.keys(CONTROLES) as Acao[]) this.atalhos[id] = CONTROLES[id][1];
    try { localStorage.removeItem('meu-jogo:controls'); } catch { /* sessao permanece funcional */ }
  }
  atualizarPad(): void {
    const p = Array.from(navigator.getGamepads?.() ?? []).find(Boolean);
    const agora = new Set<Acao>(), botoes = new Set<number>();
    this.atirando = false; this.usandoMiraPad = false;
    if (p) {
      p.buttons.forEach((b, i) => { if (b.pressed) botoes.add(i); });
      this.atirando = botoes.has(7);
      const mx = p.axes[2] ?? 0, my = p.axes[3] ?? 0;
      if (Math.hypot(mx, my) > .3) { this.mira = { x: mx, y: my }; this.usandoMiraPad = true; }
      this.usandoMiraPad ||= this.atirando;
      const adicionar = (id: Acao, condicao: boolean) => { if (condicao) agora.add(id); };
      adicionar('esquerda', (p.axes[0] ?? 0) < -.3 || botoes.has(14)); adicionar('direita', (p.axes[0] ?? 0) > .3 || botoes.has(15));
      adicionar('cima', (p.axes[1] ?? 0) < -.3 || botoes.has(12)); adicionar('baixo', (p.axes[1] ?? 0) > .3 || botoes.has(13));
      for (const [id, b] of [['interagir', 0], ['atacar', 2], ['inventario', 3], ['correr', 4], ['recarregar', 5], ['mapa', 8], ['usar', 6], ['equipar', 10]] as [Acao, number][]) adicionar(id, botoes.has(b));
    }
    this.padNovas = new Set([...agora].filter(id => !this.pad.has(id))); this.pad = agora;
    this.padPausa = botoes.has(9) && !this.botoesAntes.has(9); this.padVoltar = botoes.has(1) && !this.botoesAntes.has(1); this.botoesAntes = botoes;
  }
  fimQuadro(): void { this.novas.clear(); this.padNovas.clear(); this.padPausa = false; this.padVoltar = false; }
}

// Criado no browser; modulos de dominio e migracao nao dependem deste singleton.
export const controles = new InputRouter();

/** Janela de linhas inteiras: seleção e viewport nunca divergem. */
export class ListaRolavel {
  topo = 0;
  cursor = 0;
  capacidade = 1;
  total = 0;

  configurar(total: number, capacidade: number, cursor = this.cursor): void {
    this.total = Math.max(0, Math.floor(total));
    this.capacidade = Math.max(1, Math.floor(capacidade));
    this.selecionar(cursor);
  }

  selecionar(indice: number): void {
    this.cursor = Math.max(0, Math.min(this.total - 1, indice));
    this.topo = Math.max(0, Math.min(this.topo, this.total - this.capacidade));
    if (this.cursor < this.topo) this.topo = this.cursor;
    if (this.cursor >= this.topo + this.capacidade) this.topo = this.cursor - this.capacidade + 1;
  }

  visivel(indice: number): boolean {
    return indice >= this.topo && indice < Math.min(this.total, this.topo + this.capacidade);
  }

  get indicador(): string {
    return this.total ? `${this.topo + 1}–${Math.min(this.total, this.topo + this.capacidade)} / ${this.total}` : '0 / 0';
  }
}

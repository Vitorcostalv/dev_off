const memoria = new Map();
globalThis.localStorage = {
  getItem: (chave) => memoria.get(chave) ?? null,
  setItem: (chave, valor) => memoria.set(chave, String(valor)),
  removeItem: (chave) => memoria.delete(chave),
};

const [{ Inventario }, { carregar, salvar }] = await Promise.all([
  import('../src/game/inventario.ts'),
  import('../src/game/save.ts'),
]);

const inventario = new Inventario();
const coletados = ['pickup_cabo_usb_1', 'pickup_cabo_usb_2'];
for (const _pickup of coletados) {
  if (inventario.adicionar('cabo_usb', 1) !== 0) throw new Error('pickup nao coube no inventario');
}
if (inventario.contar('cabo_usb') !== 2) throw new Error('quantidade empilhada incorreta');
if (inventario.slots.filter(Boolean).length !== 1) throw new Error('itens iguais ocuparam mais de um slot');

if (!salvar({
  dia: 3,
  minutos: 420,
  mapa: 'farm',
  x: 1920,
  y: 1440,
  inventario: inventario.serializar(),
  itensColetados: coletados,
})) throw new Error('save falhou');

const dados = carregar();
if (!dados) throw new Error('load falhou');
const restaurado = new Inventario();
restaurado.restaurar(dados.inventario);
if (restaurado.contar('cabo_usb') !== 2) throw new Error('pilha nao foi restaurada');
if (dados.itensColetados.join(',') !== coletados.join(',')) {
  throw new Error('pickups coletados nao foram restaurados');
}

console.log('[inventario] pegar x2 -> empilhar em 1 slot -> salvar -> restaurar: passou');

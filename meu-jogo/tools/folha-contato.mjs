/**
 * Folha de contato de um atlas de movel: cada peca numa celula, na ordem
 * [linha, indice], com marcadores legiveis do endereco.
 *
 * Existe porque autorar interior e escolher peca por endereco (`peca: [4, 4]`),
 * e o atlas empacotado nao diz o que cada endereco desenha. Sem isto a escolha
 * e tentativa e erro dentro do jogo.
 *
 * Marcadores: quadradinhos AMARELOS no topo contam a linha (um a mais que o
 * indice da linha) e os AZUIS embaixo contam o indice na linha.
 *
 *   npm run folha-contato moveis_parque
 *   npm run folha-contato moveis_mobilia_v1 docs/folhas
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerPng } from './imagem.mjs';
import { Img } from './png.mjs';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const atlas = process.argv[2];
const destino = process.argv[3] ?? path.join(raiz, 'docs', 'folhas');

if (!atlas) {
  console.error('uso: npm run folha-contato <atlas> [pasta]');
  console.error('atlas disponiveis:');
  for (const n of fs.readdirSync(path.join(raiz, 'public', 'assets', 'sprites'))) {
    if (n.endsWith('.atlas.json')) console.error(`  ${n.replace('.atlas.json', '')}`);
  }
  process.exit(1);
}

const base = path.join(raiz, 'public', 'assets', 'sprites', atlas);
const folha = lerPng(`${base}.png`);
const bruto = JSON.parse(fs.readFileSync(`${base}.atlas.json`, 'utf8'));
const frames = bruto.frames ?? bruto.textures?.[0]?.frames;
const lista = (Array.isArray(frames)
  ? frames.map((f) => ({ nome: f.filename, ...f.frame }))
  : Object.entries(frames).map(([nome, f]) => ({ nome, ...f.frame })))
  .map((f) => {
    const partes = f.nome.split('_');
    return { ...f, linha: Number(partes.at(-2)), indice: Number(partes.at(-1)) };
  })
  .sort((a, b) => (a.linha - b.linha) || (a.indice - b.indice));

const CELULA = 96;
const COLUNAS = 10;
const filas = Math.ceil(lista.length / COLUNAS);
const saida = new Img(CELULA * COLUNAS, CELULA * filas);
saida.rect(0, 0, saida.w, saida.h, [24, 28, 32, 255]);

lista.forEach((f, k) => {
  const cx = (k % COLUNAS) * CELULA;
  const cy = Math.floor(k / COLUNAS) * CELULA;
  saida.rect(cx, cy, CELULA, 1, [70, 80, 90, 255]);
  saida.rect(cx, cy, 1, CELULA, [70, 80, 90, 255]);

  const escala = Math.min((CELULA - 16) / f.w, (CELULA - 16) / f.h);
  const w = Math.max(1, Math.round(f.w * escala));
  const h = Math.max(1, Math.round(f.h * escala));
  const ox = cx + Math.floor((CELULA - w) / 2);
  const oy = cy + Math.floor((CELULA - h) / 2) + 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = f.x + Math.floor(x / escala);
      const sy = f.y + Math.floor(y / escala);
      const o = (sy * folha.w + sx) * 4;
      if (folha.px[o + 3] > 16) saida.set(ox + x, oy + y, [folha.px[o], folha.px[o + 1], folha.px[o + 2], 255]);
    }
  }
  for (let b = 0; b <= f.linha; b++) saida.rect(cx + 3 + b * 4, cy + 2, 3, 3, [255, 220, 90, 255]);
  for (let d = 0; d <= f.indice; d++) saida.rect(cx + 3 + d * 4, cy + CELULA - 5, 3, 3, [120, 220, 255, 255]);
});

fs.mkdirSync(destino, { recursive: true });
const arquivo = path.join(destino, `${atlas}.contato.png`);
fs.writeFileSync(arquivo, saida.png());
console.log(`[folha] ${lista.length} pecas de ${atlas} em ${path.relative(raiz, arquivo)} (${COLUNAS} por fila, ordem linha/indice)`);

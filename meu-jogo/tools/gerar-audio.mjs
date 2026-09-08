/**
 * Gera os WAV de `public/assets/audio/` por sintese, do mesmo jeito que
 * `gerar-assets.mjs` gera tileset e atlas: nada de binario opaco no repositorio
 * sem a receita que o produziu.
 *
 * Mono, 22.050 Hz, 16 bits. Os efeitos sao curtos e o runtime varia o tom
 * (`rate`) pra um mesmo arquivo nao soar identico duas vezes. Os ambientes e as
 * trilhas sao ciclos costurados: os ultimos `COSTURA` segundos sao misturados no
 * inicio, entao o loop nao estala.
 *
 * A identidade sonora segue a visual: cidade morna e organica, represa fria,
 * industrial e cada vez mais errada.
 *
 *   npm run gerar-audio
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGO_AUDIO } from '../src/game/audio.ts';

const SR = 22050;
const COSTURA = 0.5;
const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'audio');

// --------------------------------------------------------------- osciladores
/** Ruido determinístico: a mesma semente sempre gera o mesmo arquivo. */
function criarRuido(semente = 1) {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}
const seno = (f, t) => Math.sin(2 * Math.PI * f * t);
const quadrada = (f, t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1);
const triangulo = (f, t) => 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;
const dente = (f, t) => 2 * ((f * t) % 1) - 1;

/** Envelope ataque/decaimento simples, em fracao do trecho. */
const env = (i, n, ataque = 0.01, curva = 3) => {
  const x = i / n;
  const sobe = ataque <= 0 ? 1 : Math.min(1, x / ataque);
  return sobe * Math.pow(1 - x, curva);
};

/** Passa-baixa de um polo, aplicado no lugar. */
function passaBaixa(buf, corte) {
  const a = Math.exp((-2 * Math.PI * corte) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y = (1 - a) * buf[i] + a * y; buf[i] = y; }
  return buf;
}
/** Passa-alta de um polo, aplicado no lugar. */
function passaAlta(buf, corte) {
  const copia = Float64Array.from(buf);
  passaBaixa(copia, corte);
  for (let i = 0; i < buf.length; i++) buf[i] -= copia[i];
  return buf;
}

/** Corda pinçada (Karplus-Strong): a base dos toques melodicos. */
function pincar(freq, dur, brilho = 0.5, semente = 7) {
  const n = Math.round(dur * SR);
  const ruido = criarRuido(semente);
  const tam = Math.max(2, Math.round(SR / freq));
  const linha = Array.from({ length: tam }, () => ruido());
  const buf = new Float64Array(n);
  const perda = 0.5 - brilho * 0.2;
  for (let i = 0; i < n; i++) {
    const atual = linha[i % tam];
    const proximo = linha[(i + 1) % tam];
    linha[i % tam] = (atual * (1 - perda) + proximo * perda) * 0.996;
    buf[i] = atual * Math.pow(1 - i / n, 1.2);
  }
  return buf;
}

/** Soma `fonte` em `alvo` a partir de `inicio` (em segundos), com ganho. */
function somar(alvo, fonte, inicio, ganho = 1) {
  const off = Math.round(inicio * SR);
  for (let i = 0; i < fonte.length; i++) {
    const j = off + i;
    if (j >= 0 && j < alvo.length) alvo[j] += fonte[i] * ganho;
  }
  return alvo;
}

/** Trecho novo de `dur` segundos preenchido por `fn(t, i, n)`. */
function trecho(dur, fn) {
  const n = Math.round(dur * SR);
  const buf = new Float64Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / SR, i, n);
  return buf;
}

/** Normaliza pro pico virar `alvo` e evita clipping na escrita. */
function normalizar(buf, alvo = 0.9) {
  let pico = 0;
  for (const v of buf) pico = Math.max(pico, Math.abs(v));
  if (pico === 0) return buf;
  const g = alvo / pico;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

/**
 * Costura o ciclo: gera COSTURA segundos extras e mistura na cabeça com
 * crossfade, pro fim encontrar o inicio sem estalo.
 */
function costurar(buf, dur) {
  const n = Math.round(dur * SR);
  const extra = Math.min(Math.round(COSTURA * SR), n);
  const saida = buf.slice(0, n);
  for (let i = 0; i < extra; i++) {
    const cauda = buf[n + i] ?? 0;
    const p = i / extra;
    saida[i] = saida[i] * p + cauda * (1 - p);
  }
  return saida;
}

/**
 * Grava o WAV, tirando antes o offset continuo — Karplus-Strong e envelopes
 * sobre ruido deixam DC, e DC empurra o alto-falante.
 *
 * Em CICLO a remocao e por media, nao por filtro: o passa-alta comeca com
 * estado zero e o transiente dele desfaz a costura que acabamos de fazer. Num
 * sinal periodico, subtrair a media e exatamente a mesma correcao e nao mexe na
 * juncao.
 */
function escrever(nome, buf, ciclo = false) {
  if (ciclo) {
    let soma = 0;
    for (const v of buf) soma += v;
    const media = soma / buf.length;
    for (let i = 0; i < buf.length; i++) buf[i] -= media;
  } else {
    passaAlta(buf, 22);
  }
  const n = buf.length;
  const cabecalho = Buffer.alloc(44);
  cabecalho.write('RIFF', 0);
  cabecalho.writeUInt32LE(36 + n * 2, 4);
  cabecalho.write('WAVE', 8);
  cabecalho.write('fmt ', 12);
  cabecalho.writeUInt32LE(16, 16);
  cabecalho.writeUInt16LE(1, 20);   // PCM
  cabecalho.writeUInt16LE(1, 22);   // mono
  cabecalho.writeUInt32LE(SR, 24);
  cabecalho.writeUInt32LE(SR * 2, 28);
  cabecalho.writeUInt16LE(2, 32);
  cabecalho.writeUInt16LE(16, 34);
  cabecalho.write('data', 36);
  cabecalho.writeUInt32LE(n * 2, 40);
  const dados = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    dados.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  fs.writeFileSync(path.join(destino, `${nome}.wav`), Buffer.concat([cabecalho, dados]));
  return 44 + n * 2;
}

// ------------------------------------------------------------------- efeitos
/** Estalo de passo: ruido filtrado + corpo, por superficie. */
function passo(corte, corpo, dur, semente, aspereza = 1) {
  const ruido = criarRuido(semente);
  const buf = trecho(dur, (t, i, n) => ruido() * env(i, n, 0.005, 4) * aspereza);
  passaBaixa(buf, corte);
  passaAlta(buf, 180);
  if (corpo) somar(buf, trecho(dur * 0.6, (t, i, n) => seno(corpo, t) * env(i, n, 0.004, 6)), 0, 0.5);
  return normalizar(buf, 0.55);
}

/** Dois tons: a gramatica dos avisos da interface. */
function bipe(f1, f2, dur, onda = quadrada, ganho = 0.5) {
  return normalizar(trecho(dur, (t, i, n) => {
    const f = f1 + (f2 - f1) * (i / n);
    return onda(f, t) * env(i, n, 0.02, 2.5);
  }), ganho);
}

const EFEITOS = {
  ui_mover: () => bipe(620, 660, 0.05, quadrada, 0.32),
  ui_confirmar: () => bipe(660, 990, 0.1, quadrada, 0.42),
  ui_cancelar: () => bipe(480, 300, 0.1, quadrada, 0.4),
  ui_erro: () => normalizar(trecho(0.16, (t, i, n) => (quadrada(196, t) + quadrada(203, t)) * 0.5 * env(i, n, 0.01, 1.6)), 0.42),
  ui_pagina: () => bipe(400, 520, 0.07, triangulo, 0.3),

  passo_grama: () => passo(2600, 0, 0.1, 11, 0.8),
  passo_terra: () => passo(900, 90, 0.09, 23),
  passo_madeira: () => passo(1800, 180, 0.08, 37),
  passo_concreto: () => passo(1500, 0, 0.07, 41, 0.9),
  passo_metal: () => {
    const buf = passo(3000, 0, 0.14, 53, 0.7);
    somar(buf, trecho(0.14, (t, i, n) => (seno(2150, t) * 0.6 + seno(3310, t) * 0.4) * env(i, n, 0.002, 5)), 0, 0.35);
    return normalizar(buf, 0.5);
  },

  porta: () => {
    const buf = new Float64Array(Math.round(0.42 * SR));
    const ranger = trecho(0.34, (t, i, n) => dente(210 + 90 * (i / n), t) * env(i, n, 0.25, 1.4) * 0.3);
    passaBaixa(ranger, 1400);
    somar(buf, ranger, 0.02);
    somar(buf, passo(2200, 150, 0.07, 61), 0.34, 0.8);
    return normalizar(buf, 0.5);
  },
  gaveta: () => {
    const ruido = criarRuido(67);
    const buf = trecho(0.26, (t, i, n) => ruido() * env(i, n, 0.3, 1.2));
    passaBaixa(buf, 1100);
    return normalizar(buf, 0.4);
  },
  pegar: () => {
    const buf = new Float64Array(Math.round(0.16 * SR));
    somar(buf, pincar(880, 0.14, 0.6, 71), 0);
    somar(buf, bipe(1200, 1500, 0.05, triangulo, 0.4), 0, 0.4);
    return normalizar(buf, 0.5);
  },
  guardar: () => normalizar(pincar(440, 0.16, 0.4, 73), 0.45),
  compra: () => {
    const buf = new Float64Array(Math.round(0.34 * SR));
    [[1180, 0], [1560, 0.06], [1980, 0.13]].forEach(([f, atraso], k) => somar(buf, pincar(f, 0.18, 0.8, 79 + k), atraso, 0.8));
    return normalizar(buf, 0.5);
  },
  dinheiro: () => {
    const buf = new Float64Array(Math.round(0.2 * SR));
    somar(buf, pincar(1560, 0.16, 0.9, 83), 0);
    somar(buf, pincar(2080, 0.12, 0.9, 89), 0.05, 0.7);
    return normalizar(buf, 0.45);
  },

  golpe: () => {
    const ruido = criarRuido(97);
    const buf = trecho(0.16, (t, i, n) => ruido() * env(i, n, 0.12, 2.2));
    passaBaixa(buf, 3800);
    passaAlta(buf, 500);
    return normalizar(buf, 0.5);
  },
  acerto: () => {
    const ruido = criarRuido(101);
    const buf = trecho(0.14, (t, i, n) => (seno(130, t) * 0.7 + ruido() * 0.5) * env(i, n, 0.004, 4));
    passaBaixa(buf, 2200);
    return normalizar(buf, 0.6);
  },
  tiro: () => {
    const ruido = criarRuido(103);
    const buf = trecho(0.24, (t, i, n) => ruido() * env(i, n, 0.001, 6));
    passaAlta(buf, 400);
    somar(buf, trecho(0.12, (t, i, n) => seno(85 - 30 * (i / n), t) * env(i, n, 0.002, 4)), 0, 0.8);
    return normalizar(buf, 0.85);
  },
  recarregar: () => {
    const buf = new Float64Array(Math.round(0.3 * SR));
    somar(buf, passo(3200, 220, 0.06, 107, 0.8), 0);
    somar(buf, passo(2600, 160, 0.07, 109, 0.8), 0.14);
    return normalizar(buf, 0.45);
  },
  inimigo_dano: () => {
    const ruido = criarRuido(113);
    const buf = trecho(0.2, (t, i, n) => (quadrada(96, t) * 0.5 + ruido() * 0.6) * env(i, n, 0.01, 3));
    passaBaixa(buf, 1500);
    return normalizar(buf, 0.55);
  },
  inimigo_morte: () => {
    const buf = trecho(0.4, (t, i, n) => quadrada(210 - 150 * (i / n), t) * env(i, n, 0.02, 2));
    passaBaixa(buf, 2000);
    const chiado = criarRuido(127);
    somar(buf, trecho(0.4, (t, i, n) => chiado() * env(i, n, 0.05, 2.5)), 0, 0.35);
    return normalizar(buf, 0.55);
  },
  dano_jogador: () => {
    const ruido = criarRuido(131);
    const buf = trecho(0.26, (t, i, n) => (seno(78, t) * 0.8 + ruido() * 0.4) * env(i, n, 0.003, 3));
    passaBaixa(buf, 1000);
    return normalizar(buf, 0.7);
  },

  conquista: () => {
    const buf = new Float64Array(Math.round(0.9 * SR));
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => somar(buf, pincar(f, 0.6, 0.8, 137 + k), k * 0.09, 0.8));
    return normalizar(buf, 0.55);
  },
  missao: () => {
    const buf = new Float64Array(Math.round(0.5 * SR));
    somar(buf, pincar(587.33, 0.34, 0.7, 139), 0);
    somar(buf, pincar(880, 0.34, 0.7, 149), 0.1);
    return normalizar(buf, 0.5);
  },
  dormir: () => {
    const buf = trecho(0.9, (t, i, n) => (triangulo(220 - 90 * (i / n), t) * 0.6 + triangulo(110 - 40 * (i / n), t) * 0.4) * env(i, n, 0.2, 1.6));
    passaBaixa(buf, 1400);
    return normalizar(buf, 0.4);
  },

  pc_ligar: () => {
    const buf = trecho(0.6, (t, i, n) => seno(180 + 620 * (i / n), t) * env(i, n, 0.3, 1.2));
    somar(buf, passo(2800, 120, 0.06, 151), 0.02, 0.7);
    return normalizar(buf, 0.4);
  },
  pc_tecla: () => normalizar(passo(3400, 0, 0.035, 157, 0.7), 0.28),
  pc_app: () => bipe(880, 1170, 0.09, triangulo, 0.35),

  enigma_ok: () => {
    const buf = new Float64Array(Math.round(0.4 * SR));
    somar(buf, pincar(783.99, 0.3, 0.8, 163), 0);
    somar(buf, pincar(1046.5, 0.3, 0.8, 167), 0.08);
    return normalizar(buf, 0.5);
  },
  enigma_erro: () => normalizar(trecho(0.3, (t, i, n) => (quadrada(140, t) * 0.6 + quadrada(147, t) * 0.4) * env(i, n, 0.02, 1.2)), 0.45),
  elevador: () => {
    const buf = trecho(0.8, (t, i, n) => (dente(58, t) * 0.5 + seno(116, t) * 0.3) * Math.min(1, (i / n) * 6) * Math.pow(1 - i / n, 0.8));
    passaBaixa(buf, 700);
    return normalizar(buf, 0.4);
  },
  lanterna: () => normalizar(passo(3600, 260, 0.045, 173, 0.8), 0.3),
};

// ------------------------------------------------------------------ ambientes
/** Vento: ruido de banda larga com corte modulado devagar. */
function vento(dur, semente, base = 380, profundidade = 260, ganho = 0.5) {
  const ruido = criarRuido(semente);
  const total = dur + COSTURA;
  const bruto = trecho(total, () => ruido());
  const saida = new Float64Array(bruto.length);
  let y = 0;
  for (let i = 0; i < bruto.length; i++) {
    const t = i / SR;
    const corte = base + profundidade * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / (dur / 2)));
    const a = Math.exp((-2 * Math.PI * corte) / SR);
    y = (1 - a) * bruto[i] + a * y;
    saida[i] = y * (0.6 + 0.4 * Math.sin((2 * Math.PI * t) / (dur / 3)));
  }
  return normalizar(saida, ganho);
}

/** Grilo: rajada curta de chiado agudo, repetida em intervalo fixo. */
function grilos(dur, intervalo, semente, ganho = 0.35) {
  const total = dur + COSTURA;
  const buf = new Float64Array(Math.round(total * SR));
  const ruido = criarRuido(semente);
  for (let t = 0; t < total; t += intervalo) {
    const rajada = trecho(0.09, (tt, i, n) => ruido() * env(i, n, 0.1, 1.4) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 34 * tt)));
    passaAlta(rajada, 3600);
    somar(buf, rajada, t, 0.9);
  }
  return normalizar(buf, ganho);
}

/** Passarinho: dois toques agudos com leve glissando. */
function passaros(dur, intervalo, semente, ganho = 0.3) {
  const total = dur + COSTURA;
  const buf = new Float64Array(Math.round(total * SR));
  const ruido = criarRuido(semente);
  let k = 0;
  for (let t = 0.4; t < total; t += intervalo) {
    const alto = 2100 + ruido() * 400;
    for (const atraso of [0, 0.08]) {
      somar(buf, trecho(0.06, (tt, i, n) => seno(alto + 500 * (i / n), tt) * env(i, n, 0.15, 2)), t + atraso, 0.8);
    }
    k++;
  }
  return normalizar(buf, ganho);
}

/** Pingo: toque ressonante curto, a assinatura da represa. */
function pingos(dur, intervalo, semente, ganho = 0.4) {
  const total = dur + COSTURA;
  const buf = new Float64Array(Math.round(total * SR));
  const ruido = criarRuido(semente);
  let k = 0;
  for (let t = 0.3; t < total; t += intervalo) {
    const f = 900 + Math.abs(ruido()) * 900;
    somar(buf, trecho(0.14, (tt, i, n) => seno(f * (1 + 0.4 * (i / n)), tt) * env(i, n, 0.004, 5)), t, 0.9 - (k % 3) * 0.2);
    k++;
  }
  return normalizar(buf, ganho);
}

/** Zumbido: drone com batimento, corpo dos interiores e da usina. */
function zumbido(dur, freq, semente, ganho = 0.4, harmonico = 0.3) {
  const total = dur + COSTURA;
  const ruido = criarRuido(semente);
  const buf = trecho(total, (t) => seno(freq, t) * 0.7 + seno(freq * 2.01, t) * harmonico + ruido() * 0.08);
  passaBaixa(buf, freq * 6);
  return normalizar(buf, ganho);
}

const AMBIENTES = {
  amb_cidade: () => {
    const dur = 8;
    const buf = vento(dur, 211, 300, 180, 0.5);
    somar(buf, passaros(dur, 2.6, 223), 0, 0.5);
    somar(buf, zumbido(dur, 62, 227, 0.3, 0.15), 0, 0.4);
    return costurar(normalizar(buf, 0.7), dur);
  },
  amb_bairro: () => {
    const dur = 8;
    const buf = vento(dur, 229, 420, 260, 0.45);
    somar(buf, passaros(dur, 3.4, 233), 0, 0.7);
    return costurar(normalizar(buf, 0.62), dur);
  },
  amb_rural: () => {
    const dur = 8;
    const buf = vento(dur, 239, 500, 340, 0.5);
    somar(buf, grilos(dur, 1.1, 241), 0, 0.5);
    somar(buf, passaros(dur, 4.1, 251), 0, 0.5);
    return costurar(normalizar(buf, 0.62), dur);
  },
  amb_interior: () => {
    const dur = 6;
    const buf = zumbido(dur, 58, 257, 0.45, 0.2);
    somar(buf, vento(dur, 263, 240, 120, 0.25), 0, 0.5);
    return costurar(normalizar(buf, 0.45), dur);
  },
  amb_noite: () => {
    const dur = 8;
    const buf = grilos(dur, 0.85, 269, 0.45);
    somar(buf, vento(dur, 271, 260, 140, 0.35), 0, 0.7);
    return costurar(normalizar(buf, 0.55), dur);
  },
  amb_chuva: () => {
    const dur = 8;
    const ruido = criarRuido(277);
    const total = dur + COSTURA;
    const buf = trecho(total, (t) => ruido() * (0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 3.2)));
    passaAlta(buf, 700);
    passaBaixa(buf, 6500);
    somar(buf, vento(dur, 281, 300, 200, 0.3), 0, 0.6);
    return costurar(normalizar(buf, 0.72), dur);
  },
  amb_vento: () => {
    const dur = 8;
    return costurar(vento(dur, 283, 320, 420, 0.7), dur);
  },
  amb_represa: () => {
    const dur = 10;
    const buf = zumbido(dur, 41, 293, 0.5, 0.25);
    somar(buf, pingos(dur, 2.3, 307), 0, 0.6);
    somar(buf, vento(dur, 311, 180, 120, 0.3), 0, 0.6);
    return costurar(normalizar(buf, 0.6), dur);
  },
  amb_represa_fundo: () => {
    const dur = 10;
    const buf = zumbido(dur, 33, 313, 0.55, 0.35);
    somar(buf, pingos(dur, 1.4, 317), 0, 0.5);
    // rangido metalico lento: a geometria da usina reclamando
    const rangido = trecho(dur + COSTURA, (t) => dente(47 + 6 * Math.sin((2 * Math.PI * t) / 7), t) * (0.3 + 0.3 * Math.sin((2 * Math.PI * t) / 4.5)));
    passaBaixa(rangido, 320);
    somar(buf, rangido, 0, 0.45);
    return costurar(normalizar(buf, 0.62), dur);
  },
};

// -------------------------------------------------------------------- trilhas
/**
 * Trilha: acorde longo em triangulo mais uma linha pinçada sobre a escala.
 * `graus` sao semitons a partir da tonica.
 */
function trilha({ dur, tonica, acordes, escala, passos, semente, brilho = 0.6, ganho = 0.5, oitava = 0 }) {
  const total = dur + COSTURA;
  const nota = (grau) => tonica * Math.pow(2, (grau + oitava * 12) / 12);
  const buf = new Float64Array(Math.round(total * SR));
  const compasso = dur / acordes.length;

  acordes.forEach((acorde, k) => {
    for (const grau of acorde) {
      const f = nota(grau);
      const pad = trecho(compasso * 1.15, (t, i, n) => {
        const suave = Math.min(1, (i / n) * 5) * Math.min(1, ((n - i) / n) * 5);
        return (triangulo(f, t) * 0.6 + seno(f * 2, t) * 0.2) * suave;
      });
      passaBaixa(pad, f * 5);
      somar(buf, pad, k * compasso, 0.22);
    }
  });

  const ruido = criarRuido(semente);
  const espaco = dur / passos;
  for (let k = 0; k < passos; k++) {
    const grau = escala[Math.floor(Math.abs(ruido()) * escala.length) % escala.length];
    const salto = ruido() > 0.55 ? 12 : 0;
    somar(buf, pincar(nota(grau + 12 + salto), espaco * 1.6, brilho, semente + k), k * espaco, 0.5 + Math.abs(ruido()) * 0.3);
  }
  return costurar(normalizar(buf, ganho), dur);
}

const TRILHAS = {
  mus_titulo: () => trilha({
    dur: 24, tonica: 146.83, // Re
    acordes: [[0, 3, 7], [0, 3, 10], [-2, 5, 8], [0, 3, 7]],
    escala: [0, 3, 5, 7, 10], passos: 24, semente: 331, brilho: 0.5, ganho: 0.5,
  }),
  mus_cidade: () => trilha({
    dur: 24, tonica: 164.81, // Mi
    acordes: [[0, 4, 7], [-3, 4, 9], [2, 5, 9], [0, 4, 7]],
    escala: [0, 2, 4, 7, 9], passos: 32, semente: 337, brilho: 0.7, ganho: 0.48,
  }),
  mus_bar: () => trilha({
    dur: 20, tonica: 110, // La
    acordes: [[0, 3, 7, 10], [-2, 5, 8, 12], [0, 3, 7, 10], [-4, 3, 8, 12]],
    escala: [0, 3, 5, 6, 7, 10], passos: 28, semente: 347, brilho: 0.8, ganho: 0.46,
  }),
  mus_represa: () => trilha({
    dur: 28, tonica: 97.999, // Sol grave
    acordes: [[0, 1, 7], [0, 6, 11], [-1, 5, 8], [0, 1, 6]],
    escala: [0, 1, 5, 6, 8, 11], passos: 12, semente: 353, brilho: 0.3, ganho: 0.42, oitava: -1,
  }),
};

// ------------------------------------------------------------------- execucao
fs.mkdirSync(destino, { recursive: true });
const receitas = { ...EFEITOS, ...AMBIENTES, ...TRILHAS };

const doCatalogo = Object.keys(CATALOGO_AUDIO).sort();
const geradas = Object.keys(receitas).sort();
const faltando = doCatalogo.filter((id) => !geradas.includes(id));
const sobrando = geradas.filter((id) => !doCatalogo.includes(id));
if (faltando.length || sobrando.length) {
  console.error(`[audio] catalogo e receitas divergem. Sem receita: ${faltando.join(', ') || '-'} | sem catalogo: ${sobrando.join(', ') || '-'}`);
  process.exit(1);
}

let bytes = 0;
for (const id of doCatalogo) {
  const buf = receitas[id]();
  bytes += escrever(id, buf, CATALOGO_AUDIO[id].loop === true);
}
console.log(`[audio] ${doCatalogo.length} arquivos, ${(bytes / 1024 / 1024).toFixed(2)} MB em public/assets/audio`);

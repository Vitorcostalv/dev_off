/**
 * Confere o catalogo de audio, os arquivos gerados e as regras de escolha.
 *
 * Nao ha como um teste "ouvir", entao ele mede o que um som quebrado revela:
 * arquivo mudo, arquivo estourado, offset continuo (o estalo no alto-falante) e
 * ciclo que nao fecha. As regras de ambiente/trilha sao funcoes puras e entram
 * como tabela de casos.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BARRAMENTOS,
  CATALOGO_AUDIO,
  IDS_DE_AUDIO,
  ambienteDoLugar,
  pisoDoMapa,
  somDoPasso,
  trilhaDoLugar,
  volumeFinal,
} from '../src/game/audio.ts';
import { DEFAULT_SETTINGS, Preferencias } from '../src/game/settings.ts';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pasta = path.join(raiz, 'public', 'assets', 'audio');
let conferencias = 0;
const ok = (mensagem, condicao) => { assert(condicao, mensagem); conferencias++; };

// ------------------------------------------------------------------ catalogo
const arquivos = fs.readdirSync(pasta).filter((n) => n.endsWith('.wav')).map((n) => n.replace(/\.wav$/, ''));
ok('catalogo e pasta com a mesma quantidade', arquivos.length === IDS_DE_AUDIO.length);
for (const id of IDS_DE_AUDIO) {
  const def = CATALOGO_AUDIO[id];
  ok(`${id}: arquivo existe`, arquivos.includes(id));
  ok(`${id}: barramento valido`, BARRAMENTOS.includes(def.barramento));
  ok(`${id}: volume entre 0 e 1`, def.volume > 0 && def.volume <= 1);
  ok(`${id}: variacao razoavel`, (def.variacao ?? 0) >= 0 && (def.variacao ?? 0) <= 0.3);
}
for (const nome of arquivos) ok(`${nome}: esta no catalogo`, IDS_DE_AUDIO.includes(nome));

// -------------------------------------------------------------------- ondas
function lerWav(id) {
  const b = fs.readFileSync(path.join(pasta, `${id}.wav`));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${id}: nao e RIFF`);
  assert.equal(b.toString('ascii', 8, 12), 'WAVE', `${id}: nao e WAVE`);
  const canais = b.readUInt16LE(22);
  const taxa = b.readUInt32LE(24);
  const bits = b.readUInt16LE(34);
  const amostras = b.readUInt32LE(40) / 2;
  const px = new Float64Array(amostras);
  for (let i = 0; i < amostras; i++) px[i] = b.readInt16LE(44 + i * 2) / 32768;
  return { canais, taxa, bits, dur: amostras / taxa, px };
}

const relatorio = [];
for (const id of IDS_DE_AUDIO) {
  const def = CATALOGO_AUDIO[id];
  const w = lerWav(id);
  ok(`${id}: mono 16 bits a 22050 Hz`, w.canais === 1 && w.bits === 16 && w.taxa === 22050);

  let pico = 0; let soma = 0; let dc = 0;
  for (const v of w.px) { pico = Math.max(pico, Math.abs(v)); soma += v * v; dc += v; }
  const rms = Math.sqrt(soma / w.px.length);
  const offset = Math.abs(dc / w.px.length);

  ok(`${id}: nao esta mudo (rms ${rms.toFixed(4)})`, rms > 0.01);
  ok(`${id}: nao estoura (pico ${pico.toFixed(2)})`, pico <= 0.95);
  ok(`${id}: sem offset continuo (${offset.toFixed(4)})`, offset < 0.01);

  if (def.loop) {
    ok(`${id}: ciclo com duracao de ambiente/trilha (${w.dur}s)`, w.dur >= 5);
    // Costura. O estalo do loop nao e um salto qualquer: e um salto MAIOR do que
    // o proprio material ja tem entre amostras vizinhas. Chuva pula muito por
    // natureza; drone quase nao pula, e ai a regua fica severa sozinha.
    let variacao = 0;
    for (let i = 1; i < w.px.length; i++) variacao += Math.abs(w.px[i] - w.px[i - 1]);
    variacao /= w.px.length - 1;
    const salto = Math.abs(w.px[w.px.length - 1] - w.px[0]);
    ok(`${id}: ciclo fecha sem estalo (salto ${salto.toFixed(3)} vs variacao ${variacao.toFixed(3)})`, salto <= Math.max(0.05, variacao * 6));
    // e o volume dos dois lados da costura tem de casar
    const bloco = Math.round(0.05 * w.taxa);
    const energia = (inicio) => { let soma = 0; for (let i = 0; i < bloco; i++) soma += w.px[inicio + i] ** 2; return Math.sqrt(soma / bloco); };
    const cabeca = energia(0);
    const cauda = energia(w.px.length - bloco);
    ok(`${id}: energia casa na costura (${cabeca.toFixed(3)} vs ${cauda.toFixed(3)})`, Math.abs(cabeca - cauda) < 0.12 + Math.min(cabeca, cauda));
  } else {
    ok(`${id}: efeito curto (${w.dur.toFixed(2)}s)`, w.dur <= 1);
  }
  relatorio.push({ id, barramento: def.barramento, dur: Number(w.dur.toFixed(2)), pico: Number(pico.toFixed(2)), rms: Number(rms.toFixed(3)) });
}

// ------------------------------------------------------------------ mistura
const cheio = { master: 1, efeitos: 1, ambiente: 1, musica: 1, interface: 1 };
ok('volume final multiplica os tres estagios', Math.abs(volumeFinal('tiro', cheio) - CATALOGO_AUDIO.tiro.volume) < 1e-9);
ok('master em zero silencia tudo', volumeFinal('tiro', { ...cheio, master: 0 }) === 0);
ok('barramento em zero silencia so o dele', volumeFinal('tiro', { ...cheio, efeitos: 0 }) === 0 && volumeFinal('ui_mover', { ...cheio, efeitos: 0 }) > 0);
ok('valores absurdos nao escapam da faixa', volumeFinal('tiro', { ...cheio, master: 9 }) <= CATALOGO_AUDIO.tiro.volume && volumeFinal('tiro', { ...cheio, master: Number.NaN }) === 0);
ok('volume negativo vira zero', volumeFinal('tiro', { ...cheio, efeitos: -3 }) === 0);

// ------------------------------------------------------------------ escolha
const base = { minuto: 12 * 60, clima: 'Limpo', externo: true };
const casos = [
  ['centro de dia', { ...base, mapa: 'farm' }, 'amb_cidade', 'mus_cidade'],
  ['bairro de dia', { ...base, mapa: 'bairro' }, 'amb_bairro', 'mus_cidade'],
  ['rural de dia', { ...base, mapa: 'rural' }, 'amb_rural', 'mus_cidade'],
  ['centro de noite', { ...base, mapa: 'farm', minuto: 23 * 60 }, 'amb_noite', null],
  ['centro na chuva', { ...base, mapa: 'farm', clima: 'Chuva' }, 'amb_chuva', 'mus_cidade'],
  ['centro no temporal', { ...base, mapa: 'farm', clima: 'Temporal' }, 'amb_chuva', 'mus_cidade'],
  ['centro no vento', { ...base, mapa: 'farm', clima: 'Vento' }, 'amb_vento', 'mus_cidade'],
  ['chuva de noite continua chuva', { ...base, mapa: 'farm', minuto: 23 * 60, clima: 'Chuva' }, 'amb_chuva', null],
  ['casa por dentro', { ...base, mapa: 'casa_2', externo: false }, 'amb_interior', null],
  ['mercado por dentro', { ...base, mapa: 'mercado', externo: false }, 'amb_interior', null],
  ['bar tem trilha propria', { ...base, mapa: 'bar', externo: false }, 'amb_interior', 'mus_bar'],
  ['represa rasa', { ...base, mapa: 'represa_f10', externo: false, andar: 10 }, 'amb_represa', 'mus_represa'],
  ['represa funda', { ...base, mapa: 'represa_f30', externo: false, andar: 30 }, 'amb_represa_fundo', 'mus_represa'],
  ['represa ignora chuva e hora', { mapa: 'represa_f40', minuto: 3 * 60, clima: 'Temporal', externo: false, andar: 40 }, 'amb_represa_fundo', 'mus_represa'],
  ['entrada da represa', { ...base, mapa: 'represa', andar: null }, 'amb_represa', 'mus_represa'],
];
for (const [nome, lugar, ambiente, trilha] of casos) {
  ok(`${nome}: ambiente ${ambiente}`, ambienteDoLugar(lugar) === ambiente);
  ok(`${nome}: trilha ${trilha ?? 'silencio'}`, trilhaDoLugar(lugar) === trilha);
}
ok('todo ambiente escolhido existe no catalogo', casos.every(([, l]) => IDS_DE_AUDIO.includes(ambienteDoLugar(l))));
ok('toda trilha escolhida existe no catalogo', casos.every(([, l]) => { const t = trilhaDoLugar(l); return t === null || IDS_DE_AUDIO.includes(t); }));

// a noite entra e sai em horarios coerentes com a iluminacao
ok('meia-noite e noite', ambienteDoLugar({ ...base, mapa: 'farm', minuto: 0 }) === 'amb_noite');
ok('meio-dia nao e noite', ambienteDoLugar({ ...base, mapa: 'farm', minuto: 720 }) === 'amb_cidade');

// -------------------------------------------------------------------- pisos
const pisos = [
  ['represa_f22', 'metal'], ['represa', 'metal'], ['casa_b3', 'madeira'], ['oficina', 'madeira'],
  ['rural', 'terra'], ['farm', 'grama'], ['bairro', 'grama'], ['mercado', 'concreto'], ['biblioteca', 'concreto'],
];
for (const [mapa, piso] of pisos) ok(`${mapa}: piso ${piso}`, pisoDoMapa(mapa) === piso);
for (const [mapa] of pisos) ok(`${mapa}: som de passo no catalogo`, IDS_DE_AUDIO.includes(somDoPasso(pisoDoMapa(mapa))));
ok('piso desconhecido cai em grama', somDoPasso('marmore-de-carrara') === 'passo_grama' && somDoPasso(null) === 'passo_grama');

// --------------------------------------------------------------- preferencias
ok('padrao tem os cinco volumes', ['master', ...BARRAMENTOS].every((k) => typeof DEFAULT_SETTINGS[k] === 'number'));
const p = new Preferencias();
p.restaurar({ master: 5, musica: -2, interface: 'alto', ambiente: 0.3, efeitos: Number.NaN });
ok('volume acima de 1 e cortado', p.valores.master === 1);
ok('volume negativo vira 0', p.valores.musica === 0);
ok('volume nao numerico volta ao padrao', p.valores.interface === DEFAULT_SETTINGS.interface && p.valores.efeitos === DEFAULT_SETTINGS.efeitos);
ok('volume valido e preservado', p.valores.ambiente === 0.3);
p.restaurar(null);
ok('preferencia corrompida volta inteira ao padrao', ['master', ...BARRAMENTOS].every((k) => p.valores[k] === DEFAULT_SETTINGS[k]));

// save de versao antiga nao tem os volumes novos e nao pode perder os antigos
const antigo = new Preferencias();
antigo.restaurar({ master: 0.2, efeitos: 0.1, ambiente: 0.9, tempo: 2, qualidade: 'alta' });
ok('save antigo mantem volumes antigos', antigo.valores.master === 0.2 && antigo.valores.efeitos === 0.1 && antigo.valores.ambiente === 0.9);
ok('save antigo recebe padrao nos volumes novos', antigo.valores.musica === DEFAULT_SETTINGS.musica && antigo.valores.interface === DEFAULT_SETTINGS.interface);
ok('save antigo mantem o resto', antigo.valores.tempo === 2 && antigo.valores.qualidade === 'alta');

const bytes = arquivos.reduce((soma, id) => soma + fs.statSync(path.join(pasta, `${id}.wav`)).size, 0);
const porBarramento = BARRAMENTOS.map((b) => `${b} ${relatorio.filter((r) => r.barramento === b).length}`).join(', ');
console.log(`[audio] ${conferencias} conferencias: ${IDS_DE_AUDIO.length} arquivos (${porBarramento}), ${(bytes / 1024 / 1024).toFixed(2)} MB`);

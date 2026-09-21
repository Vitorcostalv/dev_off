import assert from 'node:assert/strict';
import { caixaDosPes, aparenciaPorSemente, quadroDaPose, POSES_PERSONAGEM } from '../src/game/visualPersonagem.ts';
for (const tile of [16, 32, 48]) {
  for (const [w, h] of [[200, 320], [64, 96], [512, 512], [96, 180]]) {
    const escala = tile * 1.5 / h, c = caixaDosPes(tile, w, h, escala);
    assert(Math.abs(c.fonteLargura * escala - tile * .33) < .000001);
    assert(Math.abs(c.fonteAltura * escala - tile * .24) < .000001);
    assert(Math.abs((c.offsetY + c.fonteAltura - h) * escala + tile * .025) < .000001);
  }
}
for (let n = 0; n < 100; n++) assert.deepEqual(aparenciaPorSemente(n), aparenciaPorSemente(n));
for (const p of POSES_PERSONAGEM) {
  assert.equal(quadroDaPose(p, 375, true), 0);
  for (let t = 0; t < 1000; t += 19) assert(quadroDaPose(p, t) >= 0 && quadroDaPose(p, t) < 4);
}
console.log('Visual: colisão física invariável em quatro proporções de arte, sementes e 13 poses passaram.');

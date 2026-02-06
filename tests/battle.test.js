import test from 'node:test';
import assert from 'node:assert/strict';
import { defenseMultiplier, calcDamage, hitRate } from '../src/battle.js';

test('defense multiplier floor is 0.1', () => {
  assert.equal(defenseMultiplier({ def: 1000, adef: 1000 }), 0.1);
});

test('damage uses total attack and defense correction', () => {
  const dmg = calcDamage({ str: 10, watk: 4 }, { def: 30, adef: 0 });
  assert.equal(dmg, Math.round(14 * (1 - 30 / 300)));
});

test('hit rate uses SPD diff and clamps', () => {
  assert.equal(hitRate({ spd: 200 }, { spd: 0 }), 100);
  assert.equal(hitRate({ spd: -200 }, { spd: 100 }), 5);
});

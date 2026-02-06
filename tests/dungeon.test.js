import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, TILE } from '../src/dungeon.js';

test('creates rooms >=2x2 and has stairs/item/monster', () => {
  const d = generateDungeon(40, 22, 25);
  assert.ok(d.rooms.length > 1);
  d.rooms.forEach((r) => {
    assert.ok(r.w >= 2);
    assert.ok(r.h >= 2);
  });
  assert.equal(d.grid[d.stairs.y][d.stairs.x], TILE.STAIRS);
  assert.ok(d.items.length > 0);
  assert.ok(d.monsters.length > 0);
});

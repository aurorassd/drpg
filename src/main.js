import { Game } from './game.js';
import { TILE } from './dungeon.js';

const mapEl = document.getElementById('map');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const levelupEl = document.getElementById('levelup');
const choiceEl = levelupEl.querySelector('.choices');
const policyEl = document.getElementById('policy');

let timer;
let game = new Game();

function render() {
  const monsters = new Map(game.monsters.map((m) => [`${m.x},${m.y}`, m]));
  const items = new Set(game.items.map((i) => `${i.x},${i.y}`));

  mapEl.innerHTML = game.grid
    .map((row, y) =>
      row
        .map((cell, x) => {
          if (game.playerPos.x === x && game.playerPos.y === y) return `<span class="player">@</span>`;
          if (monsters.has(`${x},${y}`)) return `<span class="monster">M</span>`;
          if (items.has(`${x},${y}`)) return `<span class="item">*</span>`;
          if (game.stairs.x === x && game.stairs.y === y) return `<span class="stairs">&gt;</span>`;
          return cell === TILE.WALL ? '■' : '·';
        })
        .join('')
    )
    .join('\n');

  statusEl.innerHTML = `Floor:${game.floor} HP:${game.player.hp}/${game.player.maxHp} SP:${game.player.sp} STR:${game.player.str} DEF:${game.player.def} SPD:${game.player.spd} LUK:${game.player.luk} WATK:${game.player.watk} ADEF:${game.player.adef} | Monsters:${game.monsters.length} Items:${game.items.length}`;
  logEl.innerHTML = game.logs.map((l) => `<div>${l}</div>`).join('');

  if (game.awaitingLevelUp) {
    levelupEl.classList.remove('hidden');
    const choices = ['str', 'def', 'spd', 'luk'];
    choiceEl.innerHTML = choices.map((c) => `<button data-stat="${c}">${c.toUpperCase()} +1</button>`).join('');
    choiceEl.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => {
        game.levelUp(btn.dataset.stat);
        levelupEl.classList.add('hidden');
        render();
      };
    });
  }
}

function tick() {
  game.step();
  render();
}

document.getElementById('startBtn').onclick = () => {
  clearInterval(timer);
  game = new Game();
  game.setPolicy(policyEl.value);
  render();
  timer = setInterval(tick, 250);
};

document.getElementById('stepBtn').onclick = () => tick();
policyEl.onchange = () => game.setPolicy(policyEl.value);

render();

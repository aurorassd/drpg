export const TILE = {
  WALL: '#',
  FLOOR: '.',
  STAIRS: '>',
  ITEM: '*'
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function generateDungeon(width = 40, height = 22, roomAttempts = 22) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => TILE.WALL));
  const rooms = [];

  for (let i = 0; i < roomAttempts; i++) {
    const w = randInt(2, 8);
    const h = randInt(2, 6);
    const x = randInt(1, width - w - 2);
    const y = randInt(1, height - h - 2);

    const collides = rooms.some((r) => !(x + w + 1 < r.x || r.x + r.w + 1 < x || y + h + 1 < r.y || r.y + r.h + 1 < y));
    if (collides) continue;

    const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
    rooms.push(room);

    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) grid[yy][xx] = TILE.FLOOR;
    }
  }

  if (rooms.length < 2) return generateDungeon(width, height, roomAttempts);

  const sorted = [...rooms].sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < sorted.length; i++) {
    carveCorridor(grid, sorted[i - 1].cx, sorted[i - 1].cy, sorted[i].cx, sorted[i].cy);
  }

  const floorTiles = allFloors(grid);
  const playerStart = floorTiles[randInt(0, floorTiles.length - 1)];

  const occupied = new Set([`${playerStart.x},${playerStart.y}`]);
  const placeUnique = (symbol) => {
    const candidates = shuffle(floorTiles).find((p) => !occupied.has(`${p.x},${p.y}`));
    occupied.add(`${candidates.x},${candidates.y}`);
    grid[candidates.y][candidates.x] = symbol;
    return candidates;
  };

  const stairs = placeUnique(TILE.STAIRS);
  const items = Array.from({ length: randInt(3, 6) }, () => placeUnique(TILE.ITEM));
  const monsters = Array.from({ length: randInt(4, 8) }, (_, id) => ({ id, ...placeUnique(TILE.FLOOR), hp: randInt(16, 28), maxHp: 28, str: randInt(4, 7), def: randInt(2, 5), spd: randInt(5, 9), luk: 4 }));

  return { grid, rooms, playerStart, stairs, items, monsters, width, height };
}

function carveCorridor(grid, x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  while (x !== x2) {
    grid[y][x] = TILE.FLOOR;
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    grid[y][x] = TILE.FLOOR;
    y += y < y2 ? 1 : -1;
  }
  grid[y][x] = TILE.FLOOR;
}

export function allFloors(grid) {
  const floors = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== TILE.WALL) floors.push({ x, y });
    }
  }
  return floors;
}

export function neighbors(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
}

export function isWalkable(grid, x, y) {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length && grid[y][x] !== TILE.WALL;
}

export function nextStepToward(grid, from, targets, blocked = new Set()) {
  const queue = [{ ...from, dist: 0 }];
  const seen = new Set([`${from.x},${from.y}`]);
  const parent = new Map();
  const targetSet = new Set(targets.map((t) => `${t.x},${t.y}`));
  let found = null;

  while (queue.length) {
    const cur = queue.shift();
    if (targetSet.has(`${cur.x},${cur.y}`)) {
      found = cur;
      break;
    }
    for (const n of neighbors(cur.x, cur.y)) {
      const key = `${n.x},${n.y}`;
      if (seen.has(key) || blocked.has(key) || !isWalkable(grid, n.x, n.y)) continue;
      seen.add(key);
      parent.set(key, `${cur.x},${cur.y}`);
      queue.push({ ...n, dist: cur.dist + 1 });
    }
  }

  if (!found) return from;

  let key = `${found.x},${found.y}`;
  let prev = parent.get(key);
  while (prev && prev !== `${from.x},${from.y}`) {
    key = prev;
    prev = parent.get(key);
  }
  const [nx, ny] = key.split(',').map(Number);
  return { x: nx, y: ny };
}

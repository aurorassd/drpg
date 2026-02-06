import { generateDungeon, nextStepToward, TILE, isWalkable, neighbors } from './dungeon.js';
import { attemptAttack } from './battle.js';

export class Game {
  constructor() {
    this.floor = 1;
    this.policy = 'balanced';
    this.logs = [];
    this.awaitingLevelUp = false;
    this.player = {
      hp: 55,
      maxHp: 55,
      sp: 10,
      str: 8,
      def: 7,
      spd: 7,
      luk: 5,
      watk: 2,
      adef: 1
    };
    this.newFloor();
  }

  newFloor() {
    const d = generateDungeon();
    this.grid = d.grid;
    this.items = d.items;
    this.stairs = d.stairs;
    this.monsters = d.monsters;
    this.playerPos = { ...d.playerStart };
    this.log(`Floor ${this.floor} に到達`);
  }

  log(message) {
    this.logs.unshift(message);
    this.logs = this.logs.slice(0, 10);
  }

  setPolicy(policy) {
    this.policy = policy;
  }

  step() {
    if (this.awaitingLevelUp || this.player.hp <= 0) return { battle: false };

    const monsterAtPlayer = this.monsters.find((m) => m.x === this.playerPos.x && m.y === this.playerPos.y);
    if (monsterAtPlayer) return this.battle(monsterAtPlayer);

    this.playerMove();
    this.monsterMove();

    const engaged = this.monsters.find((m) => m.x === this.playerPos.x && m.y === this.playerPos.y);
    if (engaged) return this.battle(engaged);
    return { battle: false };
  }

  playerMove() {
    const targets = this.getTargetsByPolicy();
    if (!targets.length) return;
    const blocked = new Set(this.monsters.map((m) => `${m.x},${m.y}`));
    const next = nextStepToward(this.grid, this.playerPos, targets, blocked);
    this.playerPos = next;

    const onItem = this.items.findIndex((i) => i.x === next.x && i.y === next.y);
    if (onItem >= 0) {
      this.items.splice(onItem, 1);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10);
      this.player.watk += 1;
      this.log('アイテム獲得: HP+10/武器+1');
    }

    if (next.x === this.stairs.x && next.y === this.stairs.y && this.monsters.length === 0) {
      this.floor += 1;
      this.newFloor();
    }
  }

  getTargetsByPolicy() {
    if (this.policy === 'aggressive' && this.monsters.length) return this.monsters;
    if (this.policy === 'greedy' && this.items.length) return this.items;
    if (this.policy === 'exit') return [this.stairs];
    return this.items.length ? this.items : this.monsters.length ? this.monsters : [this.stairs];
  }

  monsterMove() {
    const occupied = new Set([`${this.playerPos.x},${this.playerPos.y}`]);
    for (const m of this.monsters) {
      const step = nextStepToward(this.grid, m, [this.playerPos], occupied);
      if (isWalkable(this.grid, step.x, step.y)) {
        m.x = step.x;
        m.y = step.y;
      } else {
        const move = neighbors(m.x, m.y).find((n) => isWalkable(this.grid, n.x, n.y));
        if (move) {
          m.x = move.x;
          m.y = move.y;
        }
      }
    }
  }

  battle(monster) {
    let turn = 'player';
    const lines = [];

    while (this.player.hp > 0 && monster.hp > 0) {
      if (turn === 'player') {
        const res = attemptAttack(this.player, monster);
        lines.push(res.hit ? `プレイヤー攻撃 ${res.damage}ダメージ` : 'プレイヤー攻撃は外れた');
        turn = 'monster';
      } else {
        const res = attemptAttack(monster, this.player);
        lines.push(res.hit ? `モンスター攻撃 ${res.damage}ダメージ` : 'モンスター攻撃は外れた');
        turn = 'player';
      }
    }

    if (this.player.hp <= 0) {
      this.log('敗北... 再生成してください');
      return { battle: true, won: false, lines };
    }

    this.monsters = this.monsters.filter((m) => m.id !== monster.id);
    this.awaitingLevelUp = true;
    this.log('モンスターを倒した！');
    return { battle: true, won: true, lines };
  }

  levelUp(stat) {
    this.awaitingLevelUp = false;
    this.player[stat] += 1;
    this.log(`${stat.toUpperCase()} が 1 上昇`);
  }
}

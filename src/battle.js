export function totalAttack(unit) {
  return (unit.str ?? 0) + (unit.watk ?? 0);
}

export function totalDefense(unit) {
  return (unit.def ?? 0) + (unit.adef ?? 0);
}

export function defenseMultiplier(defender) {
  return Math.max(0.1, 1 - totalDefense(defender) / 300);
}

export function hitRate(attacker, defender, correction = 0) {
  const raw = (1 + ((attacker.spd ?? 0) - (defender.spd ?? 0)) / 100) * 100 + correction;
  return Math.max(5, Math.min(100, raw));
}

export function calcDamage(attacker, defender) {
  const dmg = Math.round(totalAttack(attacker) * defenseMultiplier(defender));
  return Math.max(1, dmg);
}

export function attemptAttack(attacker, defender) {
  const hit = Math.random() * 100 <= hitRate(attacker, defender);
  if (!hit) return { hit: false, damage: 0 };
  const damage = calcDamage(attacker, defender);
  defender.hp = Math.max(0, defender.hp - damage);
  return { hit: true, damage };
}

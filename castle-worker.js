// Analyse des coups du simulateur du château : rejoue la suite du combat des dizaines de fois pour chaque coup possible.
importScripts('castle-engine.js?v=36');
const E = self.BFCastle.engine;
const alive = b => b.enemies.map((e, i) => i).filter(i => b.enemies[i].hp > 0 && !b.enemies[i].banished);
function options(b) {
  const out = [], T = alive(b);
  b.players.forEach((p, i) => {
    if (!(p.hp > 0) || p.acted) return;
    const acts = ['attack'];
    if (!(p.cooldown > 0) && !E.combatSpentSpecial(p) && !E.atomicLocked(p, p, b)) acts.push('skill');
    if (E.canHollowPurple(p)) acts.push('purple'); if (E.canRage(p)) acts.push('rage'); if (E.canFullPower(p)) acts.push('ultimate');
    for (const a of acts) for (const t of T) out.push({ i, a, t });
  });
  return out;
}
function tryMove(b, m) { try { return E.advance(b, m.a, m.i, m.t); } catch (e) { return null; } }
// Suite du combat : chaque carte joue sa technique dès qu'elle est prête, sinon attaque, en visant l'ennemi le plus bas.
function rollout(b) {
  for (let g = 0; g < 400 && !b.result; g++) {
    const i = b.players.findIndex(p => p.hp > 0 && !p.acted); if (i < 0) break;
    const p = b.players[i], T = alive(b); if (!T.length) break;
    const t = T.reduce((x, j) => b.enemies[j].hp < b.enemies[x].hp ? j : x, T[0]);
    const order = [E.canFullPower(p) && 'ultimate', E.canHollowPurple(p) && 'purple', E.canRage(p) && 'rage', !(p.cooldown > 0) && !E.combatSpentSpecial(p) && 'skill', 'attack'].filter(Boolean);
    let nb = null; for (const a of order) { nb = tryMove(b, { i, a, t }); if (nb) break; }
    if (!nb) break; b = nb;
  }
  return b.result === 'win';
}
onmessage = ({ data }) => {
  const { id, from, chosen, n } = data;
  const opts = options(from), res = [];
  for (const m of opts) {
    let w = 0, ok = 0;
    for (let k = 0; k < n; k++) { const nb = tryMove(from, m); if (!nb) break; ok++; if (nb.result === 'win' || (!nb.result && rollout(nb))) w++; }
    if (ok) res.push({ m, p: w / ok });
  }
  postMessage({ id, res, chosen });
};

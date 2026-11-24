// Analyse des coups du simulateur du château.
// Pour chaque coup possible (carte, action, cible), on rejoue la suite de la chambre avec les mêmes tirages au sort
// pour tous les coups (comparaison juste), puis on rejoue beaucoup plus de fois les meilleurs pour départager.
importScripts('castle-engine.js?v=44');
const E = self.BFCastle.engine;
const RND = Math.random;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
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
const tryMove = (b, m) => { try { return E.advance(b, m.a, m.i, m.t); } catch (e) { return null; } };
function rollout(b) {
  for (let g = 0; g < 400 && !b.result; g++) {
    const i = b.players.findIndex(p => p.hp > 0 && !p.acted); if (i < 0) break;
    const p = b.players[i], T = alive(b); if (!T.length) break;
    const t = T.reduce((x, j) => b.enemies[j].hp < b.enemies[x].hp ? j : x, T[0]);
    const order = [E.canFullPower(p) && 'ultimate', E.canHollowPurple(p) && 'purple', E.canRage(p) && 'rage', !(p.cooldown > 0) && !E.combatSpentSpecial(p) && 'skill', 'attack'].filter(Boolean);
    let nb = null; for (const a of order) { nb = tryMove(b, { i, a, t }); if (nb) break; }
    if (!nb) break; b = nb;
  }
  return b;
}
// Joue le coup puis la suite, avec les tirages n°k. Renvoie le résultat et les effets immédiats du coup.
function play(from, m, k) {
  Math.random = seeded(1000003 * (k + 1));
  const nb = tryMove(from, m); if (!nb) { Math.random = RND; return null; }
  const dealt = from.enemies.reduce((a, e, j) => a + Math.max(0, e.hp - (nb.enemies[j]?.hp ?? e.hp)), 0);
  const kills = from.enemies.filter((e, j) => e.hp > 0 && nb.enemies[j] && nb.enemies[j].hp <= 0).length;
  const lost = from.players.reduce((a, p, j) => a + Math.max(0, p.hp - (nb.players[j]?.hp ?? p.hp)), 0);
  const healed = from.players.reduce((a, p, j) => a + Math.max(0, (nb.players[j]?.hp ?? p.hp) - p.hp), 0);
  const frozen = nb.enemies.filter((e, j) => e.frozen > 0 && !(from.enemies[j].frozen > 0)).length;
  const end = nb.result ? nb : rollout(nb);
  Math.random = RND;
  return { win: end.result === 'win', alive: end.players.filter(p => p.hp > 0).length, turns: end.turn, dealt, kills, lost, healed, frozen };
}
function score(from, m, k0, n) {
  const s = { m, n: 0, w: 0, alive: 0, turns: 0, dealt: 0, kills: 0, lost: 0, healed: 0, frozen: 0 };
  for (let k = k0; k < k0 + n; k++) { const r = play(from, m, k); if (!r) return null; s.n++; if (r.win) s.w++; for (const f of ['alive', 'turns', 'dealt', 'kills', 'lost', 'healed', 'frozen']) s[f] += r[f]; }
  return s;
}
const merge = (a, b) => { for (const f of ['n', 'w', 'alive', 'turns', 'dealt', 'kills', 'lost', 'healed', 'frozen']) a[f] += b[f]; return a; };
const fin = s => ({ m: s.m, p: s.w / s.n, n: s.n, alive: s.alive / s.n, turns: s.turns / s.n, dealt: s.dealt / s.n, kills: s.kills / s.n, lost: s.lost / s.n, healed: s.healed / s.n, frozen: s.frozen / s.n });
onmessage = ({ data }) => {
  const { id, from, chosen, n } = data;
  let all = options(from).map(m => score(from, m, 0, n)).filter(Boolean);
  all.sort((a, b) => b.w - a.w || b.alive - a.alive);
  // Départage : les 4 meilleurs et le coup joué sont rejoués 6 fois plus.
  const same = (x, y) => x.i === y.i && x.a === y.a && x.t === y.t;
  const refine = all.slice(0, 4); const mine = all.find(s => chosen && same(s.m, chosen)); if (mine && !refine.includes(mine)) refine.push(mine);
  for (const s of refine) { const extra = score(from, s.m, n, n * 5); if (extra) merge(s, extra); }
  const res = all.map(fin).sort((a, b) => b.p - a.p || b.alive - a.alive);
  postMessage({ id, res });
};

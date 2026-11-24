// Analyse des coups du simulateur ranked (moteur et techniques du jeu).
// Pour chaque coup possible (carte, action, cible) du camp qui joue, on rejoue la suite du match avec les mêmes tirages
// au sort pour tous les coups, puis on rejoue beaucoup plus de fois les meilleurs pour départager.
importScripts('castle-engine.js?v=58');
const E = self.BFDuel.engine;
const RND = Math.random;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const tryMove = (D, m) => { try { return E.step(D, m); } catch (e) { return null; } };
function rollout(D) { for (let g = 0; g < 300 && D.winner == null; g++) { const x = E.policyStep(D); if (!x) break; D = x.D; } return D; }
const team = (D, s) => s ? D.b.enemies : D.b.players;
function play(from, m, k) {
  const side = from.s;
  Math.random = seeded(1000003 * (k + 1));
  const nd = tryMove(from, m); if (!nd) { Math.random = RND; return null; }
  const me0 = team(from, side), fo0 = team(from, 1 - side), me1 = team(nd, side), fo1 = team(nd, 1 - side);
  const dealt = fo0.reduce((a, e, j) => a + Math.max(0, e.hp - (fo1[j]?.hp ?? e.hp)), 0);
  const kills = fo0.filter((e, j) => e.hp > 0 && fo1[j] && fo1[j].hp <= 0).length;
  const healed = me0.reduce((a, p, j) => a + Math.max(0, (me1[j]?.hp ?? p.hp) - p.hp), 0);
  const frozen = fo1.filter((e, j) => e.frozen > 0 && !(fo0[j]?.frozen > 0)).length;
  const end = nd.winner != null ? nd : rollout(nd);
  Math.random = RND;
  return { win: end.winner === side, alive: team(end, side).filter(p => p.hp > 0).length, turns: end.b.turn, dealt, kills, healed, frozen };
}
const F = ['alive', 'turns', 'dealt', 'kills', 'healed', 'frozen'];
function score(from, m, k0, n) {
  const s = { m, n: 0, w: 0 }; F.forEach(f => s[f] = 0);
  for (let k = k0; k < k0 + n; k++) { const r = play(from, m, k); if (!r) return null; s.n++; if (r.win) s.w++; for (const f of F) s[f] += r[f]; }
  return s;
}
const merge = (a, b) => { for (const f of ['n', 'w', ...F]) a[f] += b[f]; return a; };
const fin = s => { const o = { m: s.m, p: s.w / s.n, n: s.n }; F.forEach(f => o[f] = s[f] / s.n); return o; };
onmessage = ({ data }) => {
  const { id, from, chosen, n } = data;
  let all = E.options(from).map(m => score(from, m, 0, n)).filter(Boolean);
  all.sort((a, b) => b.w - a.w || b.alive - a.alive);
  const same = (x, y) => x.i === y.i && x.a === y.a && x.t === y.t;
  const refine = all.slice(0, 4); const mine = all.find(s => chosen && same(s.m, chosen)); if (mine && !refine.includes(mine)) refine.push(mine);
  for (const s of refine) { const extra = score(from, s.m, n, n * 5); if (extra) merge(s, extra); }
  postMessage({ id, res: all.map(fin).sort((a, b) => b.p - a.p || b.alive - a.alive) });
};

// Évaluation d'équipes avec le moteur de combat du jeu (le même que les simulateurs).
// - château : chambre sûre (90 %), jouable (50 %), max (20 %) et plafond réel (dernière chambre encore gagnable, avec son % de victoire) ;
// - ranked : % de victoire contre une liste d'équipes adverses, chaque camp commençant à tour de rôle.
importScripts('castle-engine.js?v=52');
const C = self.BFCastle.engine, D = self.BFDuel.engine;
const RND = Math.random;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const isAya = p => /ayanokouji/i.test(p.name), isHeal = p => /seiichi|rimuru/i.test(p.name);
const mk = u => ({ key: u.name, name: u.name, image: u.image || '', rarity: u.rarity || 'Secret', maxHp: u.hp, hp: u.hp, attack: u.atk, cooldown: 0 });

// Jeu du château : techniques dès qu'elles sont prêtes, sauf l'échange d'Aya (quand elle est basse) et le soin (quand l'équipe en a besoin).
function castleMove(b) {
  const i = b.players.findIndex(p => p.hp > 0 && !p.acted); if (i < 0) return null;
  const p = b.players[i], T = b.enemies.map((e, j) => j).filter(j => b.enemies[j].hp > 0 && !b.enemies[j].banished); if (!T.length) return null;
  const low = T.reduce((x, j) => b.enemies[j].hp < b.enemies[x].hp ? j : x, T[0]), high = T.reduce((x, j) => b.enemies[j].hp > b.enemies[x].hp ? j : x, T[0]);
  const ready = !(p.cooldown > 0) && !C.combatSpentSpecial(p) && !C.atomicLocked(p, p, b);
  const order = [];
  if (C.canFullPower(p)) order.push(['ultimate', low]); if (C.canHollowPurple(p)) order.push(['purple', low]); if (C.canRage(p)) order.push(['rage', low]);
  if (ready) {
    if (isAya(p)) { if (p.hp / p.maxHp <= .35) order.push(['skill', high]); }
    else if (isHeal(p)) { const al = b.players.filter(u => u.hp > 0), miss = al.reduce((a, u) => a + (u.maxHp - u.hp), 0), tot = al.reduce((a, u) => a + u.maxHp, 0); if (miss >= tot * .25 || al.some(u => u.hp / u.maxHp < .35)) order.push(['skill', low]); }
    else order.push(['skill', low]);
  }
  order.push(['attack', low]);
  return { i, order };
}
function castleFight(room, team, catalog, seed) {
  Math.random = seeded(seed);
  try {
    let b = C.towerCreateBattle(room, team.map(mk), catalog); b.players = team.map(mk);
    for (let g = 0; g < 500 && !b.result; g++) {
      const m = castleMove(b); if (!m) break; let nb = null;
      for (const [a, t] of m.order) { try { nb = C.advance(b, a, m.i, t); break; } catch (e) { } }
      if (!nb) break; b = nb;
    }
    return b.result === 'win';
  } finally { Math.random = RND; }
}
function castleReport(team, catalog, n) {
  const cache = new Map();
  const wr = (room, k = n) => { const key = room + ':' + k; if (!cache.has(key)) { let w = 0; for (let s = 0; s < k; s++) if (castleFight(room, team, catalog, 1 + s * 7919 + room * 104729)) w++; cache.set(key, w / k); } return cache.get(key); };
  // Dernière chambre où le % de victoire reste au-dessus du seuil (recherche par dichotomie, le % baisse avec la chambre).
  const last = (th, k) => { if (wr(1, k) < th) return 0; let lo = 1, hi = 1; while (hi < 6000 && wr(hi, k) >= th) { lo = hi; hi *= 2; } hi = Math.min(hi, 6000); while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (wr(mid, k) >= th) lo = mid; else hi = mid; } return lo; };
  const sure = last(.9, n), play = last(.5, n), max = last(.2, n), ceil = last(.02, n * 2);
  return { sure, play, max, ceil, ceilP: wr(ceil, n * 2), n };
}

// Ranked : les deux camps jouent avec le même jeu simple (techniques dès qu'elles sont prêtes, cible la plus basse).
function duelGame(A, B, starter, seed) {
  Math.random = seeded(seed);
  try { let S = D.start(A, B, starter); for (let g = 0; g < 400 && S.winner == null; g++) { const x = D.policyStep(S); if (!x) break; S = x.D; } return S.winner; }
  finally { Math.random = RND; }
}
function duelRate(A, B, n) { let w = 0, t = 0; for (let s = 0; s < n; s++) for (const st of [0, 1]) { const r = duelGame(A, B, st, 1 + s * 7919 + st * 31337); t++; if (r === 0) w++; else if (r === 'draw') w += .5; } return w / t; }

onmessage = ({ data }) => {
  const { id, kind } = data;
  if (kind === 'castle') { postMessage({ id, r: castleReport(data.team, data.catalog, data.n || 100) }); return; }
  if (kind === 'ranked') { const res = data.opps.map(o => ({ name: o.name, w: duelRate(data.A, o.B, data.n || 6) })); postMessage({ id, r: { avg: res.reduce((a, x) => a + x.w, 0) / Math.max(1, res.length), res } }); return; }
  if (kind === 'rankedMany') { const out = data.teams.map(A => { const res = data.opps.map(o => duelRate(A, o.B, data.n || 3)); return res.reduce((a, x) => a + x, 0) / Math.max(1, res.length); }); postMessage({ id, r: out }); }
};

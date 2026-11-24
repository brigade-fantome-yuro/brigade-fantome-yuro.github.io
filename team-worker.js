// Évaluation d'équipes avec le moteur de combat du jeu (le même que les simulateurs).
// - château : chambre sûre (90 %), jouable (50 %), max (20 %) et plafond réel (dernière chambre encore gagnable, avec son % de victoire) ;
// - ranked : % de victoire contre une liste d'équipes adverses, chaque camp commençant à tour de rôle.
importScripts('castle-engine.js?v=73');
const C = self.BFCastle.engine, D = self.BFDuel.engine;
const RND = Math.random;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const isAya = p => /ayanokouji/i.test(p.name), isHeal = p => /seiichi|rimuru/i.test(p.name);
const mk = u => ({ key: u.name, name: u.name, image: u.image || '', rarity: u.rarity || 'Secret', maxHp: u.hp, hp: u.hp, attack: u.atk, cooldown: 0 });

// Jeu du château : techniques dès qu'elles sont prêtes, sauf l'échange d'Aya (quand elle est basse) et le soin (quand l'équipe en a besoin).
// Sans soigneur et au-delà du 1er seuil (Aya meurt en 2 coups) : elle échange avec le gardien le MOINS plein qui lui laisse de quoi encaisser un coup de plus, et garde les gardiens pleins pour un échange plus rentable ensuite (boucle de secours sans soigneur ; testé : ×3 à ×4 de victoires sans soigneur après le seuil).
function ayaTarget(b, p, T, gAtk, high) { if (p.maxHp > 2 * gAtk || b.players.some(u => u.hp > 0 && isHeal(u))) return high; const pc = j => b.enemies[j].hp / b.enemies[j].maxHp; const ok = T.filter(j => Math.round(pc(j) * p.maxHp) > gAtk); return ok.length ? ok.reduce((x, j) => pc(j) < pc(x) ? j : x, ok[0]) : high; }
let ORD = 0;
function castleMove(b) {
  // Ordre de jeu : ORD=1 → Aya joue en dernier dans le tour, ORD=0 → ordre de l'équipe. Selon l'équipe et la chambre, l'un ou l'autre gagne bien plus souvent : les calculs gardent le meilleur des deux (un joueur peut choisir).
  let i = ORD ? b.players.findIndex(p => p.hp > 0 && !p.acted && !isAya(p)) : -1; if (i < 0) i = b.players.findIndex(p => p.hp > 0 && !p.acted); if (i < 0) return null;
  const p = b.players[i], T = b.enemies.map((e, j) => j).filter(j => b.enemies[j].hp > 0 && !b.enemies[j].banished); if (!T.length) return null;
  const low = T.reduce((x, j) => b.enemies[j].hp < b.enemies[x].hp ? j : x, T[0]), high = T.reduce((x, j) => b.enemies[j].hp > b.enemies[x].hp ? j : x, T[0]);
  const ready = !(p.cooldown > 0) && !C.combatSpentSpecial(p) && !C.atomicLocked(p, p, b);
  const order = [];
  if (C.canFullPower(p)) order.push(['ultimate', low]); if (C.canHollowPurple(p)) order.push(['purple', low]); if (C.canRage(p)) order.push(['rage', low]);
  if (ready) {
    // Boucle de la Brigade : le soin passe dès qu'un allié mourrait au prochain coup de gardien ; Aya échange quand un coup de plus la tuerait.
    const gAtk = Math.max(...b.enemies.filter(e => e.hp > 0).map(e => e.attack || 0), 0);
    if (isAya(p)) { if (p.hp <= gAtk || p.hp / p.maxHp <= .35) order.push(['skill', ayaTarget(b, p, T, gAtk, high)]); }
    else if (isHeal(p)) { const al = b.players.filter(u => u.hp > 0), miss = al.reduce((a, u) => a + (u.maxHp - u.hp), 0), tot = al.reduce((a, u) => a + u.maxHp, 0); if (al.some(u => u.hp <= gAtk && u.hp + Math.round(u.maxHp * .3) > gAtk) || miss >= tot * .3) order.push(['skill', low]); }
    else order.push(['skill', low]);
  }
  order.push(['attack', low]);
  return { i, order };
}
function castleFight(room, team, catalog, seed, ord = 0) {
  Math.random = seeded(seed); ORD = ord;
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
// Combat gagnant à regarder en spectateur : on rejoue la chambre avec des tirages différents jusqu'à une victoire, en gardant chaque état du combat.
function castleWin(room, team, catalog, tries) {
  for (let s = 0; s < tries; s++) {
    const seed = 7 + (s >> 1) * 7919 + room * 104729; Math.random = seeded(seed); ORD = s & 1;
    try {
      let b = C.towerCreateBattle(room, team.map(mk), catalog); b.players = team.map(mk); const steps = [{ b }]; let swaps = 0, heals = 0;
      for (let g = 0; g < 500 && !b.result; g++) {
        const m = castleMove(b); if (!m) break; let nb = null, act = null, tg = null;
        for (const [a, t] of m.order) { try { nb = C.advance(b, a, m.i, t); act = a; tg = t; break; } catch (e) { } }
        if (!nb) break; if (act === 'skill' && isAya(b.players[m.i])) swaps++; if (act === 'skill' && isHeal(b.players[m.i])) heals++;
        steps.push({ b: nb, action: act, active: m.i, target: tg }); b = nb;
      }
      if (b.result === 'win') return { ok: true, steps, tries: s + 1, swaps, heals, turns: b.turn };
    } finally { Math.random = RND; }
  }
  return { ok: false, tries };
}
function castleReport(team, catalog, n) {
  const cache = new Map();
  const wr = (room, k = n) => { const key = room + ':' + k; if (!cache.has(key)) { let best = 0; for (const ord of [0, 1]) { let w = 0; for (let s = 0; s < k; s++) if (castleFight(room, team, catalog, 1 + s * 7919 + room * 104729, ord)) w++; best = Math.max(best, w / k); } cache.set(key, best); } return cache.get(key); };
  // Dernière chambre où le % de victoire reste au-dessus du seuil (recherche par dichotomie, le % baisse avec la chambre).
  const last = (th, k) => { if (wr(1, k) < th) return 0; let lo = 1, hi = 1; while (hi < 6000 && wr(hi, k) >= th) { lo = hi; hi *= 2; } hi = Math.min(hi, 6000); while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (wr(mid, k) >= th) lo = mid; else hi = mid; } return lo; };
  const sure = last(.9, n), play = last(.5, n), max = last(.2, n);
  // Plafond réel : balayage de 10 en 10 au-delà de la chambre max (le % est trop bas pour une dichotomie fiable), puis affinage.
  const k = n * 2; let ceil = max, zeros = 0;
  for (let r = max + 10; r <= 6000 && zeros < 6; r += 10) { const p = wr(r, k); if (p >= .03) { ceil = r; zeros = 0; } else if (p === 0) zeros++; }
  for (let r = ceil + 1; r < ceil + 10; r++) if (wr(r, k) >= .03) ceil = r;
  return { sure, play, max, ceil, ceilP: wr(ceil, k), n };
}

// Ranked : les deux camps jouent avec le même jeu simple (techniques dès qu'elles sont prêtes, cible la plus basse).
function duelGame(A, B, starter, seed) {
  self.__pn = .25;
  Math.random = seeded(seed);
  try { let S = D.start(A, B, starter); for (let g = 0; g < 400 && S.winner == null; g++) { const x = D.policyStep(S); if (!x) break; S = x.D; } return S.winner; }
  finally { Math.random = RND; }
}
function duelRate(A, B, n) { let w = 0, t = 0; for (let s = 0; s < n; s++) for (const st of [0, 1]) { const r = duelGame(A, B, st, 1 + s * 7919 + st * 31337); t++; if (r === 0) w++; else if (r === 'draw') w += .5; } return w / t; }

onmessage = ({ data }) => {
  const { id, kind } = data;
  if (kind === 'castleWin') { postMessage({ id, r: castleWin(data.room, data.team, data.catalog, data.tries || 400) }); return; }
  if (kind === 'castle') { postMessage({ id, r: castleReport(data.team, data.catalog, data.n || 100) }); return; }
  if (kind === 'ranked') { const res = data.opps.map(o => ({ name: o.name, w: duelRate(data.A, o.B, data.n || 6) })); postMessage({ id, r: { avg: res.reduce((a, x) => a + x.w, 0) / Math.max(1, res.length), res } }); return; }
  if (kind === 'rankedMany') { const out = data.teams.map(A => { const res = data.opps.map(o => duelRate(A, o.B, data.n || 3)); return res.reduce((a, x) => a + x, 0) / Math.max(1, res.length); }); postMessage({ id, r: out }); }
};

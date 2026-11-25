// Évaluation d'équipes avec le moteur de combat du jeu (le même que les simulateurs).
// - château : chambre sûre (90 %), jouable (50 %), max (20 %) et plafond réel (dernière chambre encore gagnable, avec son % de victoire) ;
// - ranked : % de victoire contre une liste d'équipes adverses, chaque camp commençant à tour de rôle.
importScripts('castle-engine.js?v=175');
const C = self.BFCastle.engine, D = self.BFDuel.engine;
const RND = Math.random;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const isAya = p => /ayanokouji/i.test(p.name), isHeal = p => /seiichi|rimuru/i.test(p.name);
const mk = u => ({ key: u.name, name: u.name, image: u.image || '', rarity: u.rarity || 'Secret', maxHp: u.hp, hp: u.hp, attack: u.atk, cooldown: 0 });

// Jeu du château : techniques dès qu'elles sont prêtes, sauf l'échange d'Aya (quand elle est basse) et le soin (quand l'équipe en a besoin).
// Sans soigneur et au-delà du 1er seuil (Aya meurt en 2 coups) : elle échange avec le gardien le MOINS plein qui lui laisse de quoi encaisser un coup de plus, et garde les gardiens pleins pour un échange plus rentable ensuite (boucle de secours sans soigneur ; testé : ×3 à ×4 de victoires sans soigneur après le seuil).
function ayaTarget(b, p, T, gAtk, high) { if (p.maxHp > 2 * gAtk || b.players.some(u => u.hp > 0 && isHeal(u))) return high; const pc = j => b.enemies[j].hp / b.enemies[j].maxHp; const ok = T.filter(j => Math.round(pc(j) * p.maxHp) > gAtk); return ok.length ? ok.reduce((x, j) => pc(j) < pc(x) ? j : x, ok[0]) : high; }
let ORD = 0, POL = null; // POL : ordre de jeu imposé (perm) et cible de la Domination de Makima (dom), testés pour chaque équipe
const isMakima = p => /makima/i.test(p.name);
function castleMove(b) {
  // Ordre de jeu : POL.perm impose l'ordre ; sinon ORD=1 → Aya joue en dernier dans le tour, ORD=0 → ordre de l'équipe.
  let i = -1; if (POL?.perm) { for (const k of POL.perm) { const q = b.players[k]; if (q && q.hp > 0 && !q.acted) { i = k; break; } } }
  if (i < 0) { i = ORD ? b.players.findIndex(p => p.hp > 0 && !p.acted && !isAya(p)) : -1; if (i < 0) i = b.players.findIndex(p => p.hp > 0 && !p.acted); } if (i < 0) return null;
  const p = b.players[i], T = b.enemies.map((e, j) => j).filter(j => b.enemies[j].hp > 0 && !b.enemies[j].banished); if (!T.length) return null;
  const low = T.reduce((x, j) => b.enemies[j].hp < b.enemies[x].hp ? j : x, T[0]), high = T.reduce((x, j) => b.enemies[j].hp > b.enemies[x].hp ? j : x, T[0]);
  const kill = T.filter(j => b.enemies[j].hp <= p.attack), atkT = kill.length ? kill[0] : low;
  const ready = !(p.cooldown > 0) && !C.combatSpentSpecial(p) && !C.atomicLocked(p, p, b);
  const gAtk = Math.max(...b.enemies.filter(e => e.hp > 0).map(e => e.attack || 0), 0);
  const order = [];
  if (C.canFullPower(p)) order.push(['ultimate', low]); if (C.canHollowPurple(p)) order.push(['purple', low]); if (C.canRage(p)) order.push(['rage', low]);
  if (ready) {
    // Boucle de la Brigade : le soin passe dès qu'un allié mourrait au prochain coup de gardien ; Aya échange quand un coup de plus la tuerait.
    if (isAya(p)) {
      if (p.hp <= gAtk || p.hp / p.maxHp <= .35) order.push(['skill', ayaTarget(b, p, T, gAtk, high)]);
    }
    else if (isHeal(p)) { const al = b.players.filter(u => u.hp > 0), miss = al.reduce((a, u) => a + (u.maxHp - u.hp), 0), tot = al.reduce((a, u) => a + u.maxHp, 0); if (al.some(u => u.hp <= gAtk && u.hp + Math.round(u.maxHp * .3) > gAtk) || miss >= tot * .3) order.push(['skill', low]); }
    else if (isMakima(p) && POL?.dom === 'unstruck') { const U = T.filter(j => !b.enemies[j].struck && !(b.enemies[j].frozen > 0)); order.push(['skill', U.length ? U.reduce((x, j) => b.enemies[j].hp < b.enemies[x].hp ? j : x, U[0]) : low]); }
    else order.push(['skill', low]);
  }
  order.push(['attack', atkT]);
  return { i, order };
}
// Fin de combat : 1 = victoire ; sinon part des PV des gardiens retirée (sert à classer les équipes qui ne gagnent pas encore).
let LASTB = null;
function castleFight(room, team, catalog, seed, ord = 0, pol = null) {
  Math.random = seeded(seed); ORD = ord; POL = pol;
  try {
    let b = C.towerCreateBattle(room, team.map(mk), catalog); b.players = team.map(mk);
    for (let g = 0; g < 500 && !b.result; g++) {
      const m = castleMove(b); if (!m) break; let nb = null;
      for (const [a, t] of m.order) { try { nb = C.advance(b, a, m.i, t); break; } catch (e) { } }
      if (!nb) break; b = nb;
    }
    LASTB = b; return b.result === 'win';
  } finally { Math.random = RND; POL = null; }
}
// Combat gagnant à regarder en spectateur : on rejoue la chambre avec des tirages différents jusqu'à une victoire, en gardant chaque état du combat.
function castleWin(room, team, catalog, tries, pol = null) {
  for (let s = 0; s < tries; s++) {
    const seed = 7 + (s >> 1) * 7919 + room * 104729; Math.random = seeded(seed); ORD = pol ? 0 : s & 1; POL = pol || null;
    try {
      let b = C.towerCreateBattle(room, team.map(mk), catalog); b.players = team.map(mk); const steps = [{ b }]; let swaps = 0, heals = 0;
      for (let g = 0; g < 500 && !b.result; g++) {
        const m = castleMove(b); if (!m) break; let nb = null, act = null, tg = null;
        for (const [a, t] of m.order) { try { nb = C.advance(b, a, m.i, t); act = a; tg = t; break; } catch (e) { } }
        if (!nb) break; if (act === 'skill' && isAya(b.players[m.i])) swaps++; if (act === 'skill' && isHeal(b.players[m.i])) heals++;
        steps.push({ b: nb, action: act, active: m.i, target: tg }); b = nb;
      }
      if (b.result === 'win') return { ok: true, steps, tries: s + 1, swaps, heals, turns: b.turn };
    } finally { Math.random = RND; POL = null; }
  }
  return { ok: false, tries };
}
// Ordres de jeu et cibles testés (25/11) : l'ordre dans lequel les cartes jouent change énormément le résultat
// (ex. Xebec 4★ / Janemba 5★ / Makima 4★ : Xebec, puis Makima, puis Janemba, Domination sur un gardien qui n'a pas encore frappé → 28 % à la chambre 615 au lieu de 0 %).
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
function bestPolicy(team, catalog, rooms, k) {
  let best = null;
  for (const pol of polsFor(team)) { let sc = 0;
    for (const [r, wgt] of rooms) { let w = 0; for (let s = 0; s < k; s++) if (castleFight(r, team, catalog, 3 + s * 7919 + r * 104729, 0, pol)) w++; sc += wgt * w / k; }
    if (!best || sc > best.sc) best = { pol, sc }; }
  return best.pol;
}
function castleReport(team, catalog, n) {
  const cache = new Map(); let POLB = null;
  const wr = (room, k = n) => { const key = room + ':' + k; if (!cache.has(key)) { let best = 0; for (const ord of [0, 1, 2]) { if (ord === 2 && !POLB) continue; let w = 0; for (let s = 0; s < k; s++) if (castleFight(room, team, catalog, 1 + s * 7919 + room * 104729, ord === 2 ? 0 : ord, ord === 2 ? POLB : null)) w++; best = Math.max(best, w / k); } cache.set(key, best); } return cache.get(key); };
  // Dernière chambre où le % de victoire reste au-dessus du seuil (recherche par dichotomie, le % baisse avec la chambre).
  const last = (th, k) => { if (wr(1, k) < th) return 0; let lo = 1, hi = 1; while (hi < 6000 && wr(hi, k) >= th) { lo = hi; hi *= 2; } hi = Math.min(hi, 6000); while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (wr(mid, k) >= th) lo = mid; else hi = mid; } return lo; };
  // Stratégie : on repère la zone difficile avec le jeu de base, puis on garde le meilleur ordre de jeu sur cette zone.
  { const m0 = last(.2, Math.max(20, n >> 2)); POLB = bestPolicy(team, catalog, [[Math.max(1, m0 - 20), 1], [m0 + 20, 2], [m0 + 50, 3]], Math.max(20, n >> 2)); cache.clear(); }
  const sure = last(.9, n), play = last(.5, n), max = last(.2, n);
  // Plafond réel (consigne Nicolas 24/11) : dernière chambre où l'équipe gagne ENCORE AU MOINS UNE FOIS, même 1 %. Balayage de 5 en 5 au-delà de la chambre max
  // (arrêt après 6 paliers sans aucune victoire), puis chambre par chambre jusqu'à la première chambre à 0 victoire.
  const k = n * 2; let ceil = max, zeros = 0;
  for (let r = max + 5; r <= 6000 && zeros < 6; r += 5) { if (wr(r, k) > 0) { ceil = r; zeros = 0; } else zeros++; }
  let r1 = ceil + 1; while (r1 < 6000 && wr(r1, k) > 0) { ceil = r1; r1++; }
  for (let r = ceil + 2; r <= ceil + 5; r++) if (wr(r, k) > 0) { ceil = r; }
  return { sure, play, max, ceil, ceilP: wr(ceil, k), n, nc: k * 3, pol: POLB };
}

// Ranked : les deux camps jouent avec le même jeu simple (techniques dès qu'elles sont prêtes, cible la plus basse).
function duelGame(A, B, starter, seed) {
  self.__pn = .25;
  Math.random = seeded(seed);
  try { let S = D.start(A, B, starter); for (let g = 0; g < 400 && S.winner == null; g++) { const x = D.policyStep(S); if (!x) break; S = x.D; } return S.winner; }
  finally { Math.random = RND; }
}
function duelRate(A, B, n) { let w = 0, t = 0; for (let s = 0; s < n; s++) for (const st of [0, 1]) { const r = duelGame(A, B, st, 1 + s * 7919 + st * 31337); t++; if (r === 0) w++; else if (r === 'draw') w += .5; } return w / t; }


// « Je veux atteindre la chambre X » (corrigé le 25/11) :
// - stratégies testées pour chaque équipe : 6 ordres de jeu × cible de la Domination ;
// - plus de pré-test à la chambre X-150 : le % ne baisse pas toujours avec la chambre (paliers où Aya meurt en 2 coups), ce pré-test écartait à tort de bonnes équipes ;
// - au-delà de la chambre 600, une victoire tient souvent à quelques % : le tri garde aussi la progression (PV des gardiens retirés) et le % final se mesure sur 150 combats.
function polsFor(team) {
  const doms = team.some(isMakima) ? ['low', 'unstruck'] : ['low'], out = [];
  for (const perm of PERMS) for (const dom of doms) out.push({ perm: perm.filter(x => x < team.length), dom });
  return out;
}
const fightScore = (room, team, catalog, seed, pol) => { if (castleFight(room, team, catalog, seed, 0, pol)) return 1; const b = LASTB; if (!b) return 0; const tot = b.enemies.reduce((a, e) => a + e.maxHp, 0) || 1; return .4 * (1 - b.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0) / tot); };
// Tri rapide : 6 ordres × cible de la Domination × 2 tirages → victoires + progression moyenne.
function roomQuick(room, team, catalog) {
  let s = 0, n = 0; const P = polsFor(team);
  for (let k = 0; k < P.length; k++) for (let r = 0; r < 2; r++) { s += fightScore(room, team, catalog, 11 + (k * 2 + r) * 7919 + room * 104729, P[k]); n++; }
  return s / n;
}
function roomRate(room, team, catalog, n) {
  let best = null; for (const pol of polsFor(team)) { let w = 0; for (let s = 0; s < 20; s++) { const f = fightScore(room, team, catalog, 5 + s * 7919 + room * 104729, pol); w += f === 1 ? 1 : f * .1; } if (!best || w > best.w) best = { pol, w }; }
  let w = 0; for (let s = 0; s < n; s++) if (castleFight(room, team, catalog, 900001 + s * 7919 + room * 104729, 0, best.pol)) w++;
  return { p: w / n, pol: best.pol, n };
}

onmessage = ({ data }) => {
  const { id, kind } = data;
  if (kind === 'roomQuick') { postMessage({ id, r: data.teams.map(t => roomQuick(data.room, t, data.catalog)) }); return; }
  if (kind === 'roomRate') { postMessage({ id, r: data.teams.map(t => roomRate(data.room, t, data.catalog, data.n || 150)) }); return; }
  if (kind === 'castleWin') { postMessage({ id, r: castleWin(data.room, data.team, data.catalog, data.tries || 400, data.pol || null) }); return; }
  if (kind === 'castle') { postMessage({ id, r: castleReport(data.team, data.catalog, data.n || 100) }); return; }
  if (kind === 'ranked') { const res = data.opps.map(o => ({ name: o.name, w: duelRate(data.A, o.B, data.n || 6) })); postMessage({ id, r: { avg: res.reduce((a, x) => a + x.w, 0) / Math.max(1, res.length), res } }); return; }
  if (kind === 'rankedMany') { const out = data.teams.map(A => { const res = data.opps.map(o => duelRate(A, o.B, data.n || 3)); return res.reduce((a, x) => a + x, 0) / Math.max(1, res.length); }); postMessage({ id, r: out }); }
};

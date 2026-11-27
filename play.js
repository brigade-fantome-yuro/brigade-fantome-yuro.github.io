// Mode « Jouer un match » : moteur de match ranked pas à pas (mêmes règles que ranked.js), IA adverse,
// et analyse de chaque coup par simulations (on rejoue la suite du match des dizaines de fois pour chaque coup possible).
import { KIND } from './castle.js?v=268';

const kindOf = id => KIND[id] || { k: 'hit', m: 1.8, cd: 3 };
const R0 = s => { let x = s >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const clone = o => JSON.parse(JSON.stringify(o));

export function newGame(A, B, starter, seed = Date.now() % 1e9) {
  const mk = (c, side, i) => { const k = kindOf(c.id); return { id: c.id, n: c.n, tn: c.tn, img: c.img, side, i, k, hp: c.hp, max: c.hp, atk: c.atk, cd: 0, ward: k.ward || 0 }; };
  const st = { U: [A.map((c, i) => mk(c, 0, i)), B.map((c, i) => mk(c, 1, i))], round: 1, first: 0, s: 0, last: 0, seed, over: null };
  const r = R0(seed); st.first = starter == null ? (r() < .5 ? 0 : 1) : starter; st.s = st.first; st.seed = (seed * 16807 + 7) % 2147483647;
  return st;
}
const rnd = st => { st.seed = (st.seed * 16807) % 2147483647 || 1; return st.seed / 2147483647; };
export const alive = (st, s) => st.U[s].filter(u => u.hp > 0);
export const prot = u => u.mui > 0 || u.dodges > 0 || u.haki;
export const avail = (st, s) => alive(st, s).filter(u => !u.done && !(u.frozen > 0));
export function techReady(st, u) { const k = u.k; return k.k !== 'none' && u.cd === 0 && !(k.once && u.spent) && !(k.uses && (u.uses || 0) >= k.uses) && !(k.fromTurn && st.round < k.fromTurn); }
export const needsTarget = k => ['hit', 'aoe', 'door', 'steal', 'dom', 'swap', 'stunall'].includes(k.k);
const mult = p => (p.berserk ? 1 + .1 * (p.rage || 0) : 1) * (p.empowered ? 1.5 : 1) * (p.titanT > 0 ? .95 : 1);
export const dmgOf = (p, tech) => Math.round(p.atk * (tech ? (p.k.m || 1) : 1) * mult(p));

function rise(t) { if (t.hp > 0 || t.dead) return; const k = t.k; if (t.overlord) { t.hp = 1; t.overlord = false; return; } if (t.almighty > 0) { t.hp = Math.max(1, Math.round(t.max * .5)); t.almighty = 0; return; } if (k.rise && !t.rose) { t.hp = Math.max(1, Math.round(t.max * k.rise)); t.rose = true; } }
function hurt(t, d, from) {
  if (t.hp <= 0) return 'mort';
  if (t.mui > 0) return 'ui'; if (t.dodges > 0) { t.dodges--; return 'esquive'; } if (t.haki) { t.haki = false; return 'haki'; }
  if (t.mirror > 0 && from) { from.hp = Math.max(0, from.hp - d); rise(from); return 'miroir'; }
  if (t.titanT > 0) d *= .85; if (t.mark > 0) d *= 1.3;
  if (t.ward > 0) { t.ward--; d *= .5; }
  d = Math.max(1, Math.round(d));
  if (t.armor > 0) { const keep = Math.max(1, Math.round(d * .5)); t.store = (t.store || 0) + d - keep; d = keep; }
  if (t.berserk) t.rage = Math.min(6, (t.rage || 0) + 1);
  t.hp = Math.max(0, t.hp - d); rise(t); return '';
}
const stun = (e, world) => { if (e.hp <= 0) return; if (!world && e.guardStun > 0) return; e.frozen = 1; e.stunType = world ? 'world' : 'stun'; };

// Exécute un coup : p = carte qui joue, tech = technique ou attaque, t = carte visée (ou null).
function exec(st, p, tech, t) {
  const s = p.side, me = alive(st, s), e = alive(st, 1 - s); if (!e.length) return;
  const k = p.k, m = mult(p);
  if (!t || t.hp <= 0) { const ok = e.filter(u => !u.banished); t = (ok.length ? ok : e)[0]; }
  if (tech) {
    p.cd = k.cd || 0; if (k.once) p.spent = true; if (k.uses) p.uses = (p.uses || 0) + 1;
    switch (k.k) {
      case 'swap': { const a = p.hp / p.max, b = t.hp / t.max; p.hp = Math.max(1, Math.round(b * p.max)); t.hp = Math.max(1, Math.round(a * t.max)); return; }
      case 'heal': for (const u of me) if (k.self || u !== p) u.hp = Math.min(u.max, u.hp + Math.round(u.max * .3)); return;
      case 'dom': if (t.dodges > 0) { t.dodges--; return; } if (t.haki) { t.haki = false; return; } if (t.guardStun > 0) return; t.hp = Math.max(0, t.hp - Math.round(t.atk * 1.5)); rise(t); if (t.hp > 0) { t.frozen = 1; t.stunType = 'control'; } return;
      case 'armor': p.armor = 2; p.store = 0; return;
      case 'haki': for (const u of me) u.haki = true; return;
      case 'almighty': p.almighty = 2; return;
      case 'overlord': p.overlord = true; return;
      case 'vamp': p.vamp = true; return;
      case 'berserk': p.berserk = true; p.rage = 1; return;
      case 'titan': { const add = Math.round(p.max * .5); p.max += add; p.hp += add; p.titanT = 4; return; }
      case 'buff': { const add = Math.round(p.max * k.hpUp); p.max += add; p.hp = Math.min(p.max, p.hp + add); p.atk = Math.round(p.atk * k.atkUp); return; }
      case 'mirror': p.mirror = k.turns; return;
      case 'rinnegan': p.dodges = (p.dodges || 0) + 1; p.empowered = true; return;
      case 'steal': { const g = Math.max(1, Math.round(t.atk * .25)); p.atk += g; t.atk = Math.max(1, t.atk - g); return; }
      case 'sacrifice': for (const u of e) hurt(u, p.atk * k.m * m, p); p.hp = 0; p.dead = true; return;
      case 'stunall': for (const u of e) stun(u, false); if (k.hitAll) for (const u of e) hurt(u, p.atk * k.hitAll * m, p); if (k.hit2) { hurt(t, p.atk * k.hit2 * m, p); const o = e.filter(u => u !== t && u.hp > 0)[0]; if (o) hurt(o, p.atk * k.hit2 * m, p); } return;
      case 'timestop': for (const u of e) stun(u, true); return;
      case 'door': if (e.length > 1) { t.frozen = 1; t.stunType = 'door'; t.banished = true; } return;
      case 'aoe': { const burst = p.rose && k.burstM; for (const u of e) { hurt(u, p.atk * (u === t ? (burst ? k.burstM : k.m) : (burst ? k.burstSide : k.side)) * m, p); if (k.bleed && u.hp > 0) { u.bleed = k.bleed[0]; u.bleedDmg = Math.round(p.atk * k.bleed[1]); } } if (k.mark && t.hp > 0) t.mark = k.mark + 1; return; }
      case 'hit': hurt(t, p.atk * k.m * m, p); if (k.bleed && t.hp > 0) { t.bleed = k.bleed[0]; t.bleedDmg = Math.round(p.atk * k.bleed[1]); } if (k.dodges && !p.dodgeUsed) { p.dodges = k.dodges; p.dodgeUsed = true; } if (k.mui) p.mui = k.mui + 1; return;
    }
    return;
  }
  hurt(t, p.atk * m, p); if (p.empowered) p.empowered = false;
  if (p.vamp && p.hp > 0) p.hp = Math.min(p.max, p.hp + Math.round(p.max * .12));
}

function endRound(st) {
  for (const side of st.U) for (const u of side) {
    if (u.armor > 0) { u.armor--; if (!u.armor && u.hp > 0 && u.store > 0) { const e = alive(st, 1 - u.side); for (const t of e) t.hp = Math.max(0, t.hp - Math.round(u.store / e.length)); u.store = 0; } }
    for (const f of ['almighty', 'mui', 'mirror', 'titanT', 'mark']) if (u[f] > 0) u[f]--;
    if (u.bleed > 0 && u.hp > 0) { u.hp = Math.max(0, u.hp - u.bleedDmg); u.bleed--; rise(u); }
    if (u.frozen > 0) { u.frozen--; if (!u.frozen) { if (u.stunType === 'stun' || u.stunType === 'control') u.guardStun = 1; u.banished = false; } } else if (u.guardStun > 0) u.guardStun--;
    u.cd = Math.max(0, u.cd - 1); if (u.k.regen && u.hp > 0) u.hp = Math.min(u.max, u.hp + Math.round(u.max * u.k.regen));
    u.done = false;
  }
  st.first = 1 - st.last; st.s = st.first; st.round++;
}
function checkOver(st) {
  if (!alive(st, 1).length) st.over = 0; else if (!alive(st, 0).length) st.over = 1;
  else if (st.round > 60) { const hp = s => st.U[s].reduce((a, u) => a + u.hp / u.max, 0); st.over = hp(0) >= hp(1) ? 0 : 1; }
  return st.over != null;
}
// Passe au prochain camp qui peut jouer (fin de manche si plus personne).
function normalize(st) {
  for (let g = 0; g < 4 && !checkOver(st); g++) {
    if (avail(st, st.s).length) return;
    if (avail(st, 1 - st.s).length) { st.s = 1 - st.s; return; }
    endRound(st);
  }
}
export function start(st) { normalize(st); return st; }

// Joue un coup (mv = { i: index de la carte, tech: bool, t: index de la cible ou null }). Renvoie le nouvel état + le texte du coup.
export function play(st0, mv) {
  const st = clone(st0); const s = st.s, p = st.U[s][mv.i], tgt = mv.t != null ? st.U[1 - s][mv.t] : null;
  const before = st.U.map(side => side.map(u => ({ hp: u.hp, frozen: u.frozen || 0, dodges: u.dodges || 0, haki: !!u.haki })));
  exec(st, p, !!mv.tech, tgt); p.done = true; st.last = s; st.s = 1 - s;
  const fx = [];
  st.U.forEach((side, si) => side.forEach((u, ui) => { const b = before[si][ui], d = u.hp - b.hp;
    if (d < 0) fx.push(`${u.n} −${-d}${u.hp <= 0 ? ' (K.O.)' : ''}`); else if (d > 0) fx.push(`${u.n} +${d}`);
    if ((u.frozen || 0) > b.frozen) fx.push(`${u.n} figé`); if (b.dodges > (u.dodges || 0) && d === 0) fx.push(`${u.n} esquive`); if (b.haki && !u.haki && d === 0) fx.push(`Haki de ${u.n} absorbe le coup`); }));
  const what = mv.tech ? (p.tn || 'technique') : 'attaque';
  const txt = `${p.n} : ${what}${tgt && (!mv.tech || needsTarget(p.k)) ? ' → ' + tgt.n : ''}${fx.length ? ' · ' + fx.join(', ') : ''}`;
  normalize(st); return { st, txt };
}

// Coups possibles pour le camp qui doit jouer.
export function moves(st) {
  const s = st.s, out = [], e = alive(st, 1 - s), ok = e.filter(u => !u.banished), T = ok.length ? ok : e;
  for (const p of avail(st, s)) {
    for (const t of T) out.push({ i: p.i, tech: false, t: t.i });
    if (techReady(st, p)) { if (needsTarget(p.k)) for (const t of T) out.push({ i: p.i, tech: true, t: t.i }); else out.push({ i: p.i, tech: true, t: null }); }
  }
  return out;
}

// IA : mêmes réflexes que le simulateur ranked (technique quand elle est utile, sinon achever ou frapper le plus bas).
export function aiMove(st, noise = .25) {
  const s = st.s, me = alive(st, s), e = alive(st, 1 - s), p = avail(st, s)[0]; if (!p) return null;
  const k = p.k, eAtk = Math.max(...e.map(u => u.atk)), m = mult(p);
  const pick = dmg => { const ok = e.filter(u => !u.banished); const pool = ok.length ? ok : e;
    const kill = pool.filter(u => !prot(u) && u.hp <= dmg).sort((a, b) => b.atk - a.atk)[0]; if (kill) return kill;
    const open = pool.filter(u => !prot(u)); const L = open.length ? open : pool;
    if (rnd(st) < noise) return L[Math.floor(rnd(st) * L.length)];
    return L.reduce((x, u) => u.hp < x.hp ? u : x, L[0]); };
  if (techReady(st, p)) {
    if (k.k === 'swap' && p.hp <= eAtk) { const full = e.reduce((a, u) => u.hp / u.max > a.hp / a.max ? u : a, e[0]); return { i: p.i, tech: true, t: full.i }; }
    if (k.k === 'heal') { const gain = me.filter(u => k.self || u !== p).reduce((a, u) => a + Math.min(u.max - u.hp, Math.round(u.max * .3)), 0); if (gain >= eAtk * 1.5 || me.some(u => u.hp <= eAtk && (k.self || u !== p))) return { i: p.i, tech: true, t: null }; }
    if (k.k === 'dom') { const t = e.filter(u => !(u.dodges > 0) && !u.haki && !(u.guardStun > 0)).sort((a, b) => b.atk - a.atk)[0]; if (t) return { i: p.i, tech: true, t: t.i }; }
    if (!['swap', 'heal', 'dom', 'none'].includes(k.k)) { const t = pick(p.atk * (k.m || 1) * m); return { i: p.i, tech: true, t: needsTarget(k) ? t.i : null }; }
  }
  return { i: p.i, tech: false, t: pick(p.atk * m).i };
}

// Fin de match jouée par l'IA des deux côtés. Renvoie le camp gagnant.
export function rollout(st0, seed) { const st = clone(st0); st.seed = seed; for (let g = 0; g < 800 && st.over == null; g++) { const mv = aiMove(st); if (!mv) { normalize(st); continue; } const r = play(st, mv); Object.assign(st, r.st); } return st.over; }

// Chances de victoire du camp `side` pour chaque coup possible (mêmes tirages pour tous les coups : comparaison juste).
export function evalMoves(st, side, n = 40) {
  const list = moves(st), seeds = Array.from({ length: n }, (_, j) => 1 + j * 7919 + st.round * 104729);
  return list.map(mv => { const nx = play(st, mv).st; let w = 0; for (const sd of seeds) if (rollout(nx, sd) === side) w++; return { mv, p: w / n }; });
}

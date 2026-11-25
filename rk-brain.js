// Cerveau ranked unique (25/11, consigne Nicolas : « garde uniquement un simulateur fiable »).
// Tourne dans un Worker, après le moteur du site (castle-engine.js = fonctions de combat du jeu).
// À chaque décision : toutes les actions possibles (carte × action × cible) sont jouées puis la suite du match est simulée
// des centaines de fois contre plusieurs styles d'adversaire, pondérés par ce que CET adversaire a vraiment joué (fiche + coups du match).
// On joue l'action qui gagne le plus souvent.
const D = self.BFDuel.engine;
const RND = Math.random;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hpf = t => t.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, t.reduce((a, u) => a + u.maxHp, 0));
const isHealer = u => /seiichi|rimuru|alucard/i.test(u.name);
const isSei = u => /seiichi|rimuru/i.test(u.name);
const isThief = u => /chrollo|all for one/i.test(u.name);
// Techniques les plus intéressantes à voler (ordre des voleurs observés : la plus forte d'abord).
const TECH_PRI = ['makima', 'pucci', 'gojou', 'seiichi', 'janemba', 'boros', 'dio', 'julius', 'goku', 'alucard', 'xebec', 'broly', 'sukuna', 'madara', 'escanor', 'itachi', 'aizen', 'ichigo'];
const techRank = u => { const n = String(u.name).toLowerCase(); const k = TECH_PRI.findIndex(x => n.includes(x)); return k < 0 ? 99 : k; };
const alive = (pb) => pb.enemies.map((e, j) => j).filter(j => pb.enemies[j].hp > 0 && !pb.enemies[j].banished);
const prot = u => u.janembaDodges > 0 || u.mui > 0 || u.xebecWard > 0 || u.dodges > 0;
const ready = u => D.ready(u);
const healGain = (pb) => pb.players.reduce((a, u) => a + (u.hp > 0 ? Math.min(u.maxHp - u.hp, Math.round(u.maxHp * .3)) : 0), 0);
const canSkill = (pb, p) => !(p.cooldown > 0) && D.options ? true : true;

// Coups d'un camp (vu de lui : pb.players = lui). Chaque style renvoie une liste de coups {i,a,t} par ordre de préférence.
function actsOf(S, i) { return D.options(S).filter(o => o.i === i); }
function pick(S, list) { for (const m of list) { if (!m) continue; try { return D.step(S, m); } catch (e) { } } return null; }
function sideView(S) { return D.persp(S.b, S.s); }
function lowest(pb, T) { return T.reduce((x, j) => pb.enemies[j].hp < pb.enemies[x].hp ? j : x, T[0]); }

const STYLES = {
  // Jeu du site (même jeu que le mode auto : techniques dès qu'elles sont prêtes, achever, éviter les protégés).
  ai(S) { const m = D.policy(S); return m ? m.order.map(a => ({ i: m.i, a, t: m.t })) : []; },
  // Techniques dès que prêtes, toujours sur la cible la plus basse.
  asapLow(S) { const pb = sideView(S), T = alive(pb); if (!T.length) return []; const R = pb.players.map((u, i) => i).filter(i => ready(pb.players[i])); const out = []; for (const i of R) { const t = lowest(pb, T); for (const a of ['purple', 'rage', 'ultimate', 'skill', 'attack']) out.push({ i, a, t }); } return out; },
  // Voleur d'abord : Chrollo / All For One volent la meilleure technique adverse au premier coup possible.
  thief(S) { const pb = sideView(S), T = alive(pb); if (!T.length) return []; const ti = pb.players.findIndex(u => isThief(u) && ready(u) && !(u.cooldown > 0)); const out = []; if (ti >= 0) { const t = T.reduce((x, j) => techRank(pb.enemies[j]) < techRank(pb.enemies[x]) ? j : x, T[0]); out.push({ i: ti, a: 'skill', t }); } return out.concat(STYLES.ai(S)); },
  // Le soigneur adverse d'abord (Seiichi, Alucard, Rimuru), techniques dès que prêtes.
  healer(S) { const pb = sideView(S), T = alive(pb); if (!T.length) return []; const H = T.filter(j => isHealer(pb.enemies[j])); if (!H.length) return STYLES.ai(S); const t = H[0]; const R = pb.players.map((u, i) => i).filter(i => ready(pb.players[i])); const out = []; for (const i of R) for (const a of ['purple', 'rage', 'ultimate', 'skill', 'attack']) out.push({ i, a, t }); return out; },
  // La carte adverse la plus forte (attaque) d'abord.
  strong(S) { const pb = sideView(S), T = alive(pb); if (!T.length) return []; const t = T.reduce((x, j) => pb.enemies[j].attack > pb.enemies[x].attack ? j : x, T[0]); const R = pb.players.map((u, i) => i).filter(i => ready(pb.players[i])); const out = []; for (const i of R) for (const a of ['purple', 'rage', 'ultimate', 'skill', 'attack']) out.push({ i, a, t }); return out; },
  // Joueur fort : essaie chaque coup possible et garde celui qui laisse la meilleure position (PV, cartes tuées, contrôles).
  smart(S) { const o = D.options(S); if (!o.length) return []; const me = S.s; let best = null;
    for (const m of o) { let nx; try { nx = D.step(S, m); } catch (e) { continue; } const v = evalFor(nx, me); if (!best || v > best.v) best = { m, v }; }
    return best ? [best.m].concat(STYLES.ai(S)) : STYLES.ai(S); },
  // Joueur imprévisible.
  random(S) { const o = D.options(S); if (!o.length) return []; const m = o[Math.floor(Math.random() * o.length)]; return [m].concat(STYLES.ai(S)); },
};
const STYLE_NAMES = Object.keys(STYLES);
// Valeur d'une position pour le camp « side » (0 = nous) : PV restants des deux côtés, cartes tuées, cartes figées ou privées de technique.
function evalFor(S, side) {
  if (S.winner === side) return 9; if (S.winner != null && S.winner !== 'draw') return -9;
  const own = side === 0 ? S.b.players : S.b.enemies, en = side === 0 ? S.b.enemies : S.b.players;
  const dead = t => t.filter(u => !(u.hp > 0)).length, ctl = t => t.filter(u => u.hp > 0 && (u.frozen > 0 || u.sealed)).length;
  return hpf(own) - hpf(en) + .35 * (dead(en) - dead(own)) + .12 * (ctl(en) - ctl(own));
}

// Notre jeu pour la suite des simulations : le jeu du site, sans soin inutile (SUZAKU seulement s'il rend au moins 1× l'ATQ du soigneur).
function ourMoves(S) {
  const pb = sideView(S); const m = D.policy(S); if (!m) return [];
  let order = m.order;
  const p = pb.players[m.i];
  if (p && isSei(p) && healGain(pb) < p.attack) order = order.filter(a => a !== 'skill');
  return order.map(a => ({ i: m.i, a, t: m.t }));
}
function pickStyle(w) { let s = 0; for (const k of STYLE_NAMES) s += w[k] || 0; let r = Math.random() * s; for (const k of STYLE_NAMES) { r -= w[k] || 0; if (r <= 0) return k; } return 'ai'; }
// Suite du match : nous (camp 0) avec notre jeu, l'adversaire avec un style tiré selon ses poids (un style par simulation, comme un vrai joueur qui garde sa façon de jouer).
function rollout(S, w) {
  const style = pickStyle(w); let om = 0;
  for (let g = 0; g < 300 && S.winner == null; g++) {
    let nx;
    if (S.s === 0) nx = pick(S, ourMoves(S));
    else { const st = style === 'smart' || (om < 4 && style !== 'random') ? (om < 4 ? 'smart' : style) : style; om++; nx = pick(S, STYLES[st](S)) || pick(S, STYLES.ai(S)); }
    if (!nx) break; S = nx;
  }
  return S;
}
// Note d'une fin de simulation : la victoire d'abord, puis la marge (PV qui nous restent / PV qui leur restent), pour préférer
// la ligne qui gagne avec le plus de marge : c'est elle qui tient encore si l'adversaire joue mieux que nos modèles.
const score = S => {
  if (S.winner === 0) return .6 + .4 * hpf(S.b.players);
  if (S.winner === 'draw') return .5;
  if (S.winner === 1) return .4 * (1 - hpf(S.b.enemies));
  return hpf(S.b.players) > hpf(S.b.enemies) ? .5 : .3;
};
// Décision : toutes les options, simulées à tour de rôle avec les mêmes tirages pour chaque option (comparaison juste), jusqu'au budget de temps.
function decide(S, w, ms) {
  const opts = D.options(S); if (!opts.length) return { best: null, res: [] };
  const R = opts.map(o => ({ o, n: 0, s: 0, w: 0, ok: true }));
  const t0 = Date.now(); let k = 0;
  while (Date.now() - t0 < ms && k < 4000) {
    for (const r of R) { if (!r.ok) continue; Math.random = seeded(1000003 * (k + 1)); try { const nx = D.step(S, r.o); const E = nx.winner != null ? nx : rollout(nx, w); r.s += score(E); if (E.winner === 0) r.w++; r.n++; } catch (e) { r.ok = false; } }
    Math.random = RND; k++;
    if (k === 30) { const top = R.filter(r => r.ok).sort((a, b) => b.s / b.n - a.s / a.n); const cut = top[Math.min(top.length - 1, 7)]; if (cut) for (const r of R) if (r.ok && r.s / r.n < cut.s / cut.n - .1) r.ok = false; }
  }
  Math.random = RND;
  const res = R.filter(r => r.n).map(r => ({ i: r.o.i, a: r.o.a, t: r.o.t, p: r.w / r.n, v: r.s / r.n, n: r.n }))
    .sort((a, b) => b.v - a.v);
  return { best: res[0] || null, res: res.slice(0, 8), iters: k };
}
// Quels styles expliquent les coups observés de cet adversaire ? (état avant le coup, coup joué)
function fitStyles(obs, prior) {
  const w = {}; for (const k of STYLE_NAMES) w[k] = (prior && prior[k] != null ? prior[k] : 1);
  for (const ob of obs || []) {
    for (const k of STYLE_NAMES) {
      if (k === 'random') continue;
      Math.random = seeded(7);
      try { const L = STYLES[k](ob.S); const f = L.find(m => { try { D.step(ob.S, m); return true; } catch (e) { return false; } }); if (f && f.i === ob.m.i && f.a === ob.m.a && f.t === ob.m.t) w[k] += 2; else if (f && f.i === ob.m.i && f.t === ob.m.t) w[k] += .7; } catch (e) { }
      Math.random = RND;
    }
  }
  w.random = Math.max(.3, (w.random || 1) * .5);
  return w;
}
onmessage = ({ data }) => {
  try {
    if (data.kind === 'decide') { const w = fitStyles(data.obs, data.prior); const r = decide(data.S, w, data.ms || 1500); postMessage({ id: data.id, r: { ...r, w } }); return; }
    if (data.kind === 'fit') { postMessage({ id: data.id, r: fitStyles(data.obs, data.prior) }); return; }
  } catch (e) { postMessage({ id: data.id, err: String(e && e.message || e) }); }
};

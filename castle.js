// Simulateur du Château de l'infini (Brigade Fantôme).
// Reproduit le déroulé d'une chambre : 3 gardiens aux stats fixes de la chambre, chaque action de ton équipe
// est suivie de la riposte d'un gardien (cible au hasard, jamais deux fois de suite la même carte),
// puis les gardiens qui n'ont pas encore frappé frappent en fin de tour. Pas de garde : la Brigade ne l'utilise pas.

export function towerAt(room) {
  const scale = .5 + room * .018 + Math.floor(room / 10) * .02;
  return { hp: Math.round((155 + Math.min(90, (room - 1) * 3)) * scale), atk: Math.max(1, Math.round((32 + Math.min(26, (room - 1) * .9)) * scale * .95)) };
}

// Techniques des LR (relevées dans le déroulé réel des combats). once = une seule fois par combat.
export const KIND = {
  953: { k: 'swap', cd: 4 }, 3248: { k: 'heal', cd: 3, self: true, rise: .5 }, 408: { k: 'heal', cd: 3, self: false },
  340: { k: 'dom', cd: 3 }, 329: { k: 'armor', cd: 4 }, 499: { k: 'haki', cd: 3 },
  1070: { k: 'hit', m: 1.6, cd: 3, dodges: 2, dodgesOnce: true },
  961: { k: 'hit', m: 1.7, cd: 1, once: true, mui: 3 },
  3247: { k: 'aoe', m: 1.3, side: 1.3, burstM: 2, burstSide: .9, cd: 4, rise: .6, regen: .05 },
  175: { k: 'aoe', m: 1.5, side: 1.5, cd: 3, once: true }, 451: { k: 'aoe', m: 1.5, side: 1.5, cd: 3, once: true, fromTurn: 3 }, 369: { k: 'aoe', m: 1.5, side: 1.5, cd: 0, once: true },
  972: { k: 'aoe', m: 1, side: 1, cd: 3, bleed: [2, .2] }, 1071: { k: 'aoe', m: 1.3, side: .5, cd: 3 }, 222: { k: 'aoe', m: 1.2, side: .5, cd: 3, mark: 2 },
  941: { k: 'hit', m: 1.5, cd: 3 }, 3246: { k: 'hit', m: 1.5, cd: 3 }, 3240: { k: 'hit', m: 1.6, cd: 3 },
  546: { k: 'hit', m: 1.6, cd: 3, bleed: [4, .3] }, 320: { k: 'hit', m: 1.3, cd: 3, bleed: [3, .3] }, 419: { k: 'hit', m: 1, cd: 3, bleed: [4, .3] },
  474: { k: 'hit', m: 1.3, cd: 1, once: true },
  1083: { k: 'sacrifice', m: 2.5 },
  3241: { k: 'stunall', cd: 1, once: true, hit2: 1.1 }, 3239: { k: 'stunall', cd: 1, once: true, hitAll: .6 },
  230: { k: 'stunall', cd: 4, uses: 2 }, 183: { k: 'timestop', cd: 4, uses: 2 }, 308: { k: 'timestop', cd: 4, uses: 2 },
  122: { k: 'door', cd: 3 },
  68: { k: 'buff', cd: 3, once: true, hpUp: .3, atkUp: 1.3 }, 973: { k: 'buff', cd: 1, once: true, hpUp: .2, atkUp: 1.2 },
  156: { k: 'titan', cd: 1, once: true }, 105: { k: 'almighty', cd: 1, once: true }, 190: { k: 'overlord', cd: 1, once: true },
  128: { k: 'vamp', cd: 1, once: true }, 247: { k: 'berserk', cd: 1, once: true },
  385: { k: 'mirror', cd: 3, turns: 2 }, 3244: { k: 'mirror', cd: 3, turns: 1, ward: 2 },
  363: { k: 'steal', cd: 1, once: true }, 256: { k: 'steal', cd: 1, once: true }, 117: { k: 'rinnegan', cd: 0, once: true },
  290: { k: 'none' }, 3243: { k: 'hit', m: 1.8, cd: 3 },
};
// Cartes dont la technique n'est qu'approchée par le simulateur.
export const APPROX = new Set([290, 363, 256, 117, 68, 973, 247, 474, 3246, 122, 329]);
const kindOf = id => KIND[id] || { k: 'hit', m: 1.8, cd: 3 };

function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

// team : [{id, hp, atk}] (stats exactes à leurs étoiles)
export function fight(room, team, seed = 1, opts = {}) {
  const R = rng(seed), g = towerAt(room);
  const P = team.map(c => ({ id: c.id, k: kindOf(c.id), hp: c.hp, max: c.hp, atk: c.atk, cd: 0, rose: false, ward: kindOf(c.id).ward || 0 }));
  const E = [0, 1, 2].map(() => ({ hp: g.hp, max: g.hp, atk: g.atk, frozen: 0, fresh: false, guardStun: 0, struck: false, bleed: 0, bleedDmg: 0 }));
  let last = -1, turn = 0;
  const aliveP = () => P.filter(p => p.hp > 0), aliveE = () => E.filter(e => e.hp > 0);
  const rise = t => { if (t.hp > 0 || t.dead) return; const k = t.k; if (t.overlord) { t.hp = 1; t.overlord = false; return; } if (t.almighty > 0) { t.hp = Math.max(1, Math.round(t.max * .5)); t.almighty = 0; return; } if (k.rise && !t.rose) { t.hp = Math.max(1, Math.round(t.max * k.rise)); t.rose = true; } };
  const strike = e => {
    const al = aliveP(); if (!al.length) return;
    const pool = al.length > 1 ? al.filter(u => P.indexOf(u) !== last) : al; const t = pool[Math.min(pool.length - 1, Math.floor(R() * pool.length))]; last = P.indexOf(t);
    if (t.mui > 0) return; if (t.dodges > 0) { t.dodges--; return; }
    if (t.haki) { t.haki = false; return; }
    let d = e.atk;
    if (t.berserk) t.rage = Math.min(6, (t.rage || 0) + 1);
    if (t.mirror > 0) { e.hp = Math.max(0, e.hp - d); if (t.k.turns === 2) t.mirror = 0; return; }
    if (t.titanT > 0) d = Math.max(1, Math.round(d * .85));
    if (t.armor > 0) { e.bleed = 2; e.bleedDmg = Math.max(1, Math.round(t.atk * .2)); }
    if (t.ward > 0) { t.ward--; d = Math.max(1, Math.round(d * .5)); }
    if (t.armor > 0) { const keep = Math.max(1, Math.round(d * .5)); t.store = (t.store || 0) + d - keep; d = keep; }
    t.hp = Math.max(0, t.hp - d); rise(t);
  };
  const focus = () => { if (!E.some(e => e.hp > 0 && !e.banished)) for (const e of E) e.banished = false; const a = aliveE(); return a.length ? a.reduce((m, e) => e.hp < m.hp ? e : m, a[0]) : null; };
  // Choix de la prochaine carte qui joue, réévalué après chaque riposte : l'échange d'Aya s'il est prêt et
  // qu'elle ne survivrait pas au prochain coup, sinon le soin si un allié est en danger, sinon les autres cartes,
  // Aya en dernier.
  const next = done => {
    const al = P.filter(p => p.hp > 0 && !done.has(p)); if (!al.length) return null; const atk = g.atk;
    const aya = al.find(p => p.k.k === 'swap'); if (aya && aya.cd === 0 && aya.hp <= atk * (opts.swapAt || 1)) return aya;
    const healer = al.find(p => p.k.k === 'heal' && p.cd === 0);
    if (healer && P.some(p => p.hp > 0 && p.hp <= atk && !(p.k.k === 'swap' && p.cd === 0))) return healer;
    return al.find(p => p !== aya) || aya;
  };
  const mult = p => (p.berserk ? 1 + .1 * (p.rage || 0) : 1) * (p.empowered ? 1.5 : 1) * (p.titanT > 0 ? .95 : 1);
  const hitE = (e, d) => { e.hp = Math.max(0, e.hp - Math.max(1, Math.round(d * (e.mark > 0 ? 1.3 : 1)))); };
  const stunE = (e, timestop) => { if (!(e.hp > 0)) return; if (!timestop && e.guardStun > 0) return; e.frozen = Math.max(e.frozen, 1); e.stunType = timestop ? 'world' : 'stun'; if (e.struck) e.fresh = true; };
  const act = p => {
    const tgt = focus(); if (!tgt) return;
    const k = p.k; const atk = g.atk; const ready = p.cd === 0 && !(k.once && p.spent) && !(k.uses && (p.uses || 0) >= k.uses) && !(k.fromTurn && turn < k.fromTurn);
    const useSkill = () => { p.cd = k.cd || 0; if (k.once) p.spent = true; if (k.uses) p.uses = (p.uses || 0) + 1; };
    if (k.k === 'swap' && ready && p.hp <= atk * (opts.swapAt || 1)) {
      const al = aliveE(); const full = al.reduce((m, e) => e.hp / e.max > m.hp / m.max ? e : m, al[0]);
      const a = p.hp / p.max, t = full.hp / full.max; p.hp = Math.max(1, Math.min(p.max, Math.round(t * p.max))); full.hp = Math.max(1, Math.min(full.max, Math.round(a * full.max))); useSkill(); return;
    }
    if (k.k === 'heal' && ready && P.some(u => u.hp > 0 && u.hp <= atk && (k.self || u !== p))) { for (const u of P) if (u.hp > 0 && (k.self || u !== p)) u.hp = Math.min(u.max, u.hp + Math.max(1, Math.round(u.max * .3))); useSkill(); return; }
    if (k.k === 'dom' && ready) { const t = aliveE().filter(e => !(e.guardStun > 0)).sort((a, b) => a.hp - b.hp)[0]; if (t) { t.hp = Math.max(0, t.hp - Math.max(1, Math.round(t.atk * 1.5))); if (t.hp > 0) { t.frozen = Math.max(t.frozen, 1); t.stunType = 'control'; if (t.struck) t.fresh = true; } useSkill(); return; } }
    if (ready && !['swap', 'heal', 'dom', 'none'].includes(k.k)) {
      const m = mult(p);
      switch (k.k) {
        case 'armor': p.armor = 2; p.store = 0; break;
        case 'haki': for (const u of P) if (u.hp > 0) u.haki = true; break;
        case 'almighty': p.almighty = 2; break;
        case 'overlord': p.overlord = true; break;
        case 'vamp': p.vamp = true; break;
        case 'berserk': p.berserk = true; p.rage = 1; break;
        case 'titan': { const add = Math.round(p.max * .5); p.max += add; p.hp += add; p.titanT = 4; break; }
        case 'buff': { const add = Math.round(p.max * k.hpUp); p.max += add; p.hp = Math.min(p.max, p.hp + add); p.atk = Math.round(p.atk * k.atkUp); break; }
        case 'mirror': p.mirror = k.turns; break;
        case 'rinnegan': p.dodges = (p.dodges || 0) + 1; p.empowered = true; break;
        case 'steal': { const gain = Math.max(1, Math.round(tgt.atk * .25)); p.atk += gain; tgt.atk = Math.max(1, tgt.atk - gain); break; }
        case 'sacrifice': for (const e of aliveE()) hitE(e, p.atk * k.m * m); p.hp = 0; p.dead = true; break;
        case 'stunall': { const st = []; for (const e of aliveE()) { const before = e.frozen; stunE(e, false); if (e.frozen > before || e.stunType === 'stun') st.push(e); } if (k.hitAll) for (const e of st) hitE(e, p.atk * k.hitAll * m); if (k.hit2) { const al = aliveE(); const first = tgt, second = al.filter(e => e !== first).sort((a, b) => b.hp - a.hp)[0]; for (const e of [first, second]) if (e) hitE(e, p.atk * k.hit2 * m); } break; }
        case 'timestop': for (const e of aliveE()) stunE(e, true); break;
        case 'door': if (aliveE().length > 1) { tgt.frozen = Math.max(tgt.frozen, 1); tgt.stunType = 'door'; tgt.banished = true; if (tgt.struck) tgt.fresh = true; } break;
        case 'aoe': { const burst = p.rose && k.burstM; for (const e of aliveE()) { hitE(e, p.atk * (e === tgt ? (burst ? k.burstM : k.m) : (burst ? k.burstSide : k.side)) * m); if (k.bleed && e.hp > 0) { e.bleed = k.bleed[0]; e.bleedDmg = Math.max(1, Math.round(p.atk * k.bleed[1])); } } if (k.mark && tgt.hp > 0) tgt.mark = k.mark + 1; break; }
        case 'hit': hitE(tgt, p.atk * k.m * m); if (k.bleed && tgt.hp > 0) { tgt.bleed = k.bleed[0]; tgt.bleedDmg = Math.max(1, Math.round(p.atk * k.bleed[1])); } if (k.dodges && !p.dodgeUsed) { p.dodges = k.dodges; p.dodgeUsed = true; } if (k.mui) p.mui = k.mui + 1; break;
      }
      useSkill(); if (p.berserk && !['berserk'].includes(k.k)) p.rage = Math.min(6, (p.rage || 0) + 1); return;
    }
    hitE(tgt, p.atk * mult(p)); if (p.empowered && k.k === 'rinnegan') p.empowered = false;
    if (p.vamp && p.hp > 0) p.hp = Math.min(p.max, p.hp + Math.max(1, Math.round(p.max * .12)));
    if (p.berserk) p.rage = Math.min(6, (p.rage || 0) + 1);
  };
  while (turn < 80) {
    turn++;
    const done = new Set();
    for (;;) {
      const p = next(done); if (!p) break; done.add(p); act(p);
      if (!E.some(e => e.hp > 0)) return { win: true, turn };
      if (P.some(q => q.hp > 0 && !done.has(q))) { const c = E.find(e => e.hp > 0 && !e.struck && !(e.frozen > 0)); if (c) { c.struck = true; strike(c); } if (!aliveP().length) return { win: false, turn }; }
      else break;
    }
    for (const c of E.filter(e => e.hp > 0 && !(e.frozen > 0) && !e.struck)) { strike(c); if (!aliveP().length) return { win: false, turn }; }
    // fin de tour
    for (const u of P) { if (u.armor > 0) { u.armor--; if (!u.armor && u.hp > 0 && u.store > 0) { const al = aliveE(); const per = Math.max(1, Math.round(u.store / al.length)); for (const e of al) e.hp = Math.max(0, e.hp - per); u.store = 0; } } if (u.almighty > 0) u.almighty--; if (u.mui > 0) u.mui--; if (u.mirror > 0) u.mirror--; if (u.titanT > 0) u.titanT--; }
    for (const e of E) if (e.mark > 0) e.mark--;
    for (const e of E) if (e.bleed > 0 && e.hp > 0) { e.hp = Math.max(0, e.hp - e.bleedDmg); e.bleed--; }
    if (!E.some(e => e.hp > 0)) return { win: true, turn };
    for (const e of E) { if (!(e.frozen > 0)) { if (e.guardStun > 0) e.guardStun--; } else if (e.fresh) e.fresh = false; else { e.frozen--; if (!e.frozen) { if (e.stunType === 'stun' || e.stunType === 'control') e.guardStun = 1; e.banished = false; } } e.struck = false; }
    for (const u of P) { u.cd = Math.max(0, u.cd - 1); if (u.k.regen && u.hp > 0 && u.hp < u.max) u.hp = Math.min(u.max, u.hp + Math.max(1, Math.round(u.max * u.k.regen))); }
  }
  return { win: false, turn };
}

export function winRate(room, team, n = 200, opts) { let w = 0; for (let i = 0; i < n; i++) if (fight(room, team, 1 + i * 7919 + room * 104729, opts).win) w++; return w / n; }

// On doit passer les chambres dans l'ordre : la limite est la première chambre où le taux tombe sous le seuil.
// (Le taux n'est pas toujours décroissant : quand l'attaque des gardiens franchit un palier de PV, il peut remonter.)
export function castleReport(team, n = 200, opts = {}, onp) {
  const step = 10, coarse = Math.max(40, n >> 2), out = {}; const th = [['sure', .9], ['play', .5], ['max', .2]];
  let r = 1, k = 0; const cache = new Map(); const wr = (room, m) => { const key = room + ':' + m; if (!cache.has(key)) cache.set(key, winRate(room, team, m, opts)); return cache.get(key); };
  while (k < th.length && r <= 2000) {
    if (wr(r, coarse) < th[k][1]) {
      let lo = Math.max(1, r - step + 1); let found = r;
      for (let x = lo; x <= r; x++) if (wr(x, n) < th[k][1]) { found = x; break; }
      if (wr(found, n) < th[k][1]) { out[th[k][0]] = found - 1; k++; continue; }
    }
    onp?.(r); r += step;
  }
  for (; k < th.length; k++) out[th[k][0]] = 2000;
  return out;
}

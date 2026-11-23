// Simulateur de match ranked (Brigade Fantôme) : 3 cartes contre 3 cartes, chacune avec sa vraie technique
// (même table que le simulateur du château). Les deux camps jouent une carte chacun leur tour ; le camp qui
// commence est tiré au hasard. Chaque carte joue au mieux : technique dès qu'elle est utile, et sinon
// achève une cible tuable, ou frappe la plus basse en évitant les cibles protégées (esquives, UI, Haki).
// Une part de hasard (1 coup sur 4 vers une autre cible) imite les façons de jouer différentes.
import { KIND } from './castle.js?v=41';

const kindOf = id => KIND[id] || { k: 'hit', m: 1.8, cd: 3 };
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

const mk = c => { const k = kindOf(c.id); return { id: c.id, k, hp: c.hp, max: c.hp, atk: c.atk, cd: 0, ward: k.ward || 0, side: 0 }; };

export function duel(A, B, seed = 1) {
  const R = rng(seed);
  const S = [A.map(mk), B.map(mk)]; S[1].forEach(u => u.side = 1);
  const alive = s => S[s].filter(u => u.hp > 0);
  const prot = u => u.mui > 0 || u.dodges > 0 || u.haki;
  const rise = t => { if (t.hp > 0 || t.dead) return; const k = t.k; if (t.overlord) { t.hp = 1; t.overlord = false; return; } if (t.almighty > 0) { t.hp = Math.max(1, Math.round(t.max * .5)); t.almighty = 0; return; } if (k.rise && !t.rose) { t.hp = Math.max(1, Math.round(t.max * k.rise)); t.rose = true; } };
  // Dégâts d'une attaque (esquives, UI, Haki, miroir, armure, réduction).
  const hurt = (t, d, from) => {
    if (t.hp <= 0) return;
    if (t.mui > 0) return; if (t.dodges > 0) { t.dodges--; return; } if (t.haki) { t.haki = false; return; }
    if (t.mirror > 0 && from) { from.hp = Math.max(0, from.hp - d); rise(from); return; }
    if (t.titanT > 0) d *= .85; if (t.mark > 0) d *= 1.3;
    if (t.ward > 0) { t.ward--; d *= .5; }
    d = Math.max(1, Math.round(d));
    if (t.armor > 0) { const keep = Math.max(1, Math.round(d * .5)); t.store = (t.store || 0) + d - keep; d = keep; }
    if (t.berserk) t.rage = Math.min(6, (t.rage || 0) + 1);
    t.hp = Math.max(0, t.hp - d); rise(t);
  };
  const mult = p => (p.berserk ? 1 + .1 * (p.rage || 0) : 1) * (p.empowered ? 1.5 : 1) * (p.titanT > 0 ? .95 : 1);
  const pick = (p, e, dmg) => { // cible : tuable d'abord, puis non protégée la plus basse
    const ok = e.filter(u => !u.banished); const pool = ok.length ? ok : e;
    const kill = pool.filter(u => !prot(u) && u.hp <= dmg).sort((a, b) => b.atk - a.atk)[0]; if (kill) return kill;
    const open = pool.filter(u => !prot(u)); const L = open.length ? open : pool;
    if (R() < .25) return L[Math.floor(R() * L.length)]; // les joueurs ne jouent pas tous pareil
    return L.reduce((m, u) => u.hp < m.hp ? u : m, L[0]);
  };
  const stun = (e, world) => { if (e.hp <= 0) return; if (!world && e.guardStun > 0) return; e.frozen = 1; e.stunType = world ? 'world' : 'stun'; };
  const act = p => {
    const s = p.side, me = alive(s), e = alive(1 - s); if (!e.length) return;
    const k = p.k, eAtk = Math.max(...e.map(u => u.atk));
    const ready = p.cd === 0 && !(k.once && p.spent) && !(k.uses && (p.uses || 0) >= k.uses);
    const use = () => { p.cd = k.cd || 0; if (k.once) p.spent = true; if (k.uses) p.uses = (p.uses || 0) + 1; };
    const m = mult(p);
    if (ready) {
      if (k.k === 'swap' && p.hp <= eAtk) { const full = e.reduce((a, u) => u.hp / u.max > a.hp / a.max ? u : a, e[0]); const a = p.hp / p.max, t = full.hp / full.max; p.hp = Math.max(1, Math.round(t * p.max)); full.hp = Math.max(1, Math.round(a * full.max)); use(); return; }
      if (k.k === 'heal') { const gain = me.filter(u => k.self || u !== p).reduce((a, u) => a + Math.min(u.max - u.hp, Math.round(u.max * .3)), 0); if (gain >= eAtk * 1.5 || me.some(u => u.hp <= eAtk && (k.self || u !== p))) { for (const u of me) if (k.self || u !== p) u.hp = Math.min(u.max, u.hp + Math.round(u.max * .3)); use(); return; } }
      if (k.k === 'dom') { const t = e.filter(u => !(u.dodges > 0) && !u.haki && !(u.guardStun > 0)).sort((a, b) => b.atk - a.atk)[0]; if (t) { t.hp = Math.max(0, t.hp - Math.round(t.atk * 1.5)); rise(t); if (t.hp > 0) { t.frozen = 1; t.stunType = 'control'; } use(); return; } }
      if (!['swap', 'heal', 'dom', 'none'].includes(k.k)) {
        const tgt = pick(p, e, p.atk * (k.m || 1) * m);
        switch (k.k) {
          case 'armor': p.armor = 2; p.store = 0; break;
          case 'haki': for (const u of me) u.haki = true; break;
          case 'almighty': p.almighty = 2; break;
          case 'overlord': p.overlord = true; break;
          case 'vamp': p.vamp = true; break;
          case 'berserk': p.berserk = true; p.rage = 1; break;
          case 'titan': { const add = Math.round(p.max * .5); p.max += add; p.hp += add; p.titanT = 4; break; }
          case 'buff': { const add = Math.round(p.max * k.hpUp); p.max += add; p.hp = Math.min(p.max, p.hp + add); p.atk = Math.round(p.atk * k.atkUp); break; }
          case 'mirror': p.mirror = k.turns; break;
          case 'rinnegan': p.dodges = (p.dodges || 0) + 1; p.empowered = true; break;
          case 'steal': { const g = Math.max(1, Math.round(tgt.atk * .25)); p.atk += g; tgt.atk = Math.max(1, tgt.atk - g); break; }
          case 'sacrifice': for (const u of e) hurt(u, p.atk * k.m * m, p); p.hp = 0; p.dead = true; break;
          case 'stunall': for (const u of e) stun(u, false); if (k.hitAll) for (const u of e) hurt(u, p.atk * k.hitAll * m, p); if (k.hit2) { hurt(tgt, p.atk * k.hit2 * m, p); const o = e.filter(u => u !== tgt && u.hp > 0)[0]; if (o) hurt(o, p.atk * k.hit2 * m, p); } break;
          case 'timestop': for (const u of e) stun(u, true); break;
          case 'door': if (e.length > 1) { tgt.frozen = 1; tgt.stunType = 'door'; tgt.banished = true; } break;
          case 'aoe': { const burst = p.rose && k.burstM; for (const u of e) { hurt(u, p.atk * (u === tgt ? (burst ? k.burstM : k.m) : (burst ? k.burstSide : k.side)) * m, p); if (k.bleed && u.hp > 0) { u.bleed = k.bleed[0]; u.bleedDmg = Math.round(p.atk * k.bleed[1]); } } if (k.mark && tgt.hp > 0) tgt.mark = k.mark + 1; break; }
          case 'hit': hurt(tgt, p.atk * k.m * m, p); if (k.bleed && tgt.hp > 0) { tgt.bleed = k.bleed[0]; tgt.bleedDmg = Math.round(p.atk * k.bleed[1]); } if (k.dodges && !p.dodgeUsed) { p.dodges = k.dodges; p.dodgeUsed = true; } if (k.mui) p.mui = k.mui + 1; break;
        }
        use(); return;
      }
    }
    const tgt = pick(p, e, p.atk * m); hurt(tgt, p.atk * m, p); if (p.empowered) p.empowered = false;
    if (p.vamp && p.hp > 0) p.hp = Math.min(p.max, p.hp + Math.round(p.max * .12));
  };
  let first = R() < .5 ? 0 : 1;
  for (let round = 1; round <= 60; round++) {
    const done = new Set(); let s = first, last = first;
    for (let guard = 0; guard < 12; guard++) {
      let p = alive(s).find(u => !done.has(u) && !(u.frozen > 0));
      if (!p) { s = 1 - s; p = alive(s).find(u => !done.has(u) && !(u.frozen > 0)); if (!p) break; }
      done.add(p); act(p); last = s;
      if (!alive(0).length || !alive(1).length) break;
      s = 1 - s;
    }
    if (!alive(1).length) return { win: true, first, round };
    if (!alive(0).length) return { win: false, first, round };
    for (const side of S) for (const u of side) {
      if (u.armor > 0) { u.armor--; if (!u.armor && u.hp > 0 && u.store > 0) { const e = alive(1 - u.side); for (const t of e) t.hp = Math.max(0, t.hp - Math.round(u.store / e.length)); u.store = 0; } }
      for (const f of ['almighty', 'mui', 'mirror', 'titanT', 'mark']) if (u[f] > 0) u[f]--;
      if (u.bleed > 0 && u.hp > 0) { u.hp = Math.max(0, u.hp - u.bleedDmg); u.bleed--; rise(u); }
      if (u.frozen > 0) { u.frozen--; if (!u.frozen) { if (u.stunType === 'stun' || u.stunType === 'control') u.guardStun = 1; u.banished = false; } } else if (u.guardStun > 0) u.guardStun--;
      u.cd = Math.max(0, u.cd - 1); if (u.k.regen && u.hp > 0) u.hp = Math.min(u.max, u.hp + Math.round(u.max * u.k.regen));
    }
    if (!alive(1).length) return { win: true, first, round };
    if (!alive(0).length) return { win: false, first, round };
    first = 1 - last;
  }
  const hp = s => S[s].reduce((a, u) => a + u.hp / u.max, 0);
  return { win: hp(0) > hp(1), first, round: 60 };
}

export function duelRate(A, B, n = 40, salt = 0) { let w = 0; for (let i = 0; i < n; i++) if (duel(A, B, 1 + i * 7919 + salt * 104729).win) w++; return w / n; }

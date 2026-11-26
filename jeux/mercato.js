// Mini-jeu « Mercato YURO » (Brigade Fantôme) : enchères en ligne à 2 joueurs sur les cartes YURO,
// puis deux combats PvP en 3 contre 3 avec le moteur du simulateur (BFDuel), et une mort subite si 1-1.
// Le créateur de la partie (l'hôte) fait tourner les enchères ; l'invité envoie ses actions.
// Les combats tournent sur les deux appareils avec les mêmes coups et le même tirage au sort (moteur « graine »).

const K = 10000;                 // une tranche de mise : 10 000 KI
const BUDGET = 1000000;          // budget de départ
const MAIN = { n: 6, per: 2 };   // mercato principal : 6 cartes, 2 au plus par rôle
const SD = { n: 3, per: 1 };     // mort subite : 3 cartes de 3 rôles différents
const TIME = { nominate: 40, open: 20, sealed: 30, pick: 40, compose: 150, done: 4, fres: 6, move: 45, away: 60 };
// Répartitions des rôles qui ne bloquent jamais un joueur (vérifiées sur toutes les façons d'acheter).
const DIST14 = [[3, 3, 3, 3, 2], [4, 3, 3, 3, 1], [4, 4, 3, 3, 0], [4, 4, 4, 1, 1], [4, 4, 4, 2, 0], [5, 4, 4, 1, 0], [5, 5, 4, 0, 0], [6, 4, 4, 0, 0]];
const DIST8 = [[2, 2, 2, 1, 1], [2, 2, 2, 2, 0], [3, 2, 2, 1, 0], [3, 3, 2, 0, 0], [4, 2, 2, 0, 0]];
const ENV_MAIN = 3, ENV_SD = 1;

let X = null;   // la partie ouverte (une seule à la fois)

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ki = v => Math.round(v || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' KI';
// arrondi à la tranche de 10 000 la plus proche (12 000 → 10 000, 18 500 → 20 000) ; le minimum et le maximum restent possibles tels quels
const roundK = (v, min, max) => v === min || v === max ? v : Math.round(v / K) * K;
const grp = v => v === '' || v == null || isNaN(v) ? '' : Math.round(v).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
const nkey = n => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const initials = n => String(n || '?').replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const other = i => 1 - i;
const floorK = v => Math.floor(Math.max(0, v) / K) * K;

/* ===================== Cartes ===================== */
function buildPool(ctx) {
  const { S, statsAt, lrImg, ROLE } = ctx, out = [];
  const all = [...(S.kb?.cards || []), ...(S.kb?.ex_cards || []).filter(c => c.r === 'Exclusive').map(c => ({ ...c, ex: true }))];
  for (const c of all) {
    if (!c || !c.c || !ROLE[c.c]) continue;
    const s = c.ex ? (c.st?.[5] ? { hp: c.st[5][0], atk: c.st[5][1] } : null) : statsAt(c, 5);
    if (!s || !(s.hp > 0) || !(s.atk > 0)) continue;
    const rar = c.ex ? 'Exclusive' : c.r === 'Transcendant' ? 'Transcendant' : 'LR';
    out.push({ k: (c.ex ? 'x' : 'c') + c.id, n: c.n, role: c.c, rar, eng: c.ex ? 'Exclusive' : rar === 'Transcendant' ? 'Transcendant' : 'Secret',
      img: (c.ex ? c.img : lrImg(c)) || '', hp: s.hp, atk: s.atk, tn: c.t?.[0]?.[0] || '', td: c.t?.[0]?.[1] || '', an: c.a || '' });
  }
  return out;
}
// Tire un marché de n cartes : répartition des rôles sûre, noms tous différents, cartes rares un peu moins fréquentes.
function drawMarket(pool, roles, dists, envN, exclude) {
  const used = new Set(exclude), byRole = {};
  for (const r of roles) byRole[r] = pool.filter(c => c.role === r && !used.has(nkey(c.n)));
  const distinctCount = r => new Set(byRole[r].map(c => nkey(c.n))).size;
  let plan = null;
  for (const d of dists) {
    for (let t = 0; t < 60 && !plan; t++) { const rs = shuffle(roles.slice()); if (d.every((n, i) => distinctCount(rs[i]) >= n)) plan = rs.map((r, i) => [r, d[i]]); }
    if (plan) break;
  }
  if (!plan) throw new Error('Pas assez de cartes avec un rôle pour tirer le marché.');
  const out = [];
  for (const [r, n] of plan) {
    for (let j = 0; j < n; j++) {
      const L = byRole[r].filter(c => !used.has(nkey(c.n))), w = c => c.rar === 'LR' ? 1 : .55;
      let x = Math.random() * L.reduce((s, c) => s + w(c), 0), pick = L[L.length - 1];
      for (const c of L) { x -= w(c); if (x <= 0) { pick = c; break; } }
      used.add(nkey(pick.n)); out.push(pick);
    }
  }
  const order = roles.reduce((o, r, i) => (o[r] = i, o), {}), rr = { Transcendant: 0, Exclusive: 1, LR: 2 };
  out.sort((a, b) => order[a.role] - order[b.role] || rr[a.rar] - rr[b.rar] || a.n.localeCompare(b.n));
  const env = new Set(shuffle(out.map((_, i) => i)).slice(0, envN));
  return out.map((c, i) => ({ c, env: env.has(i) }));
}

/* ===================== Règles (fonctions pures sur l'état G) ===================== */
const isSD = G => G.stage === 'sd';
const cfg = G => isSD(G) ? SD : MAIN;
const mkt = G => (isSD(G) ? G.sdm : G.market) || [];
const owned = (G, i) => isSD(G) ? G.players[i].sd : G.players[i].own;
const slots = (G, i) => cfg(G).n - owned(G, i).length;
const roleN = (G, i, role) => owned(G, i).filter(k => G.cards[k].role === role).length;
const item = (G, k) => mkt(G).find(m => m.k === k);
const canUse = (G, i, k) => { const m = item(G, k); return !!m && m.by == null && slots(G, i) > 0 && roleN(G, i, G.cards[k].role) < cfg(G).per; };
const usable = (G, i) => mkt(G).filter(m => canUse(G, i, m.k)).map(m => m.k);
// Mise maximale : tout le budget moins une réserve de 10 000 KI par carte qu'il restera à acheter.
const maxBid = (G, i) => floorK(G.players[i].budget - K * Math.max(0, slots(G, i) - 1));
const minBid = (G, i) => Math.min(K, maxBid(G, i));

function trioOk(G, ks) { return ks.length === 3 && new Set(ks).size === 3 && new Set(ks.map(k => G.cards[k].role)).size === 3; }
function autoSplit(G, own) {
  const idx = [0, 1, 2, 3, 4, 5];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c = b + 1; c < 6; c++) {
    const t1 = [own[a], own[b], own[c]], t2 = idx.filter(x => ![a, b, c].includes(x)).map(x => own[x]);
    if (trioOk(G, t1) && trioOk(G, t2)) return [t1, t2];
  }
  return [own.slice(0, 3), own.slice(3, 6)];
}

/* ===================== Moteur des enchères (chez l'hôte) ===================== */
function newState(row, pool, roles) {
  const first = Math.random() < .5 ? 0 : 1;
  const G = { v: 1, code: row.code, seq: 0, pid: 0, stage: 'main', first, nom: first, score: [0, 0], fights: [], comp: null, log: [], over: null, dl: 0,
    players: [{ uid: row.host, name: row.host_name || 'Joueur 1', budget: BUDGET, own: [], sd: [] }, { uid: row.guest, name: row.guest_name || 'Joueur 2', budget: BUDGET, own: [], sd: [] }],
    cards: {}, market: [], sdm: null, roles };
  G.market = drawMarket(pool, roles, DIST14, ENV_MAIN, []).map(({ c, env }) => { G.cards[c.k] = c; return { k: c.k, env, by: null, price: 0 }; });
  addLog(G, `Tirage au sort : ${G.players[first].name} met la première carte en vente.`);
  return G;
}
function addLog(G, t) { G.log.unshift(t); G.log.length = Math.min(G.log.length, 60); }
function setPh(G, ph, secs) { G.ph = ph; G.pid++; G.dl = secs ? Date.now() + secs * 1000 : 0; if (X) X.hid = { bids: [null, null], comp: [null, null] }; }

function nextTurn(G) {
  const P = G.players;
  if (slots(G, 0) === 0 && slots(G, 1) === 0) return endStage(G);
  let who = G.nom; if (slots(G, who) === 0) who = other(who);
  if (slots(G, other(who)) === 0) return setPh(G, { k: 'pick', who }, TIME.pick);
  setPh(G, { k: 'nominate', who }, TIME.nominate);
  void P;
}
function award(G, w, price, extra = {}) {
  const k = G.ph.c, p = G.players[w], m = item(G, k), c = G.cards[k];
  p.budget -= price; owned(G, w).push(k); m.by = w; m.price = price;
  addLog(G, `${p.name} recrute ${c.n} ${extra.free ? 'gratuitement' : 'pour ' + ki(price)}${extra.sealed ? ' (sous enveloppe)' : ''}.`);
  if (G.ph.k !== 'pick') G.nom = other(G.ph.nom ?? G.nom);
  setPh(G, { k: 'done', c: k, w, price, ...extra }, TIME.done);
}
function endStage(G) {
  if (G.stage === 'main') {
    G.stage = 'compose'; setPh(G, { k: 'compose', ready: [false, false] }, TIME.compose);
    addLog(G, 'Les deux équipes sont complètes : chacun prépare ses deux trios en secret.');
  } else if (G.stage === 'sd') startFight(G, 3, G.players[0].sd.slice(), G.players[1].sd.slice());
}
function startFight(G, n, A, B, starter) {
  G.stage = 'fight';
  const prev = G.fights[G.fights.length - 1];
  const st = starter != null ? starter : n === 2 && prev ? other(G.fights.find(f => f.n === 1)?.starter ?? 0) : (Math.random() < .5 ? 0 : 1);
  G.fights.push({ n, A, B, starter: st, seed: 1 + Math.floor(Math.random() * 2147483000), moves: [], w: null });
  setPh(G, { k: 'fight', n }, 0);
  addLog(G, `Combat ${n === 3 ? 'de mort subite' : n} : ${G.players[st].name} commence.`);
}
function fightEnd(G, w) {
  const f = G.fights[G.fights.length - 1]; if (!f || f.w != null || G.ph.k !== 'fight') return;
  f.w = w;
  if (w === 'draw') { addLog(G, `Combat ${f.n} : égalité, il est rejoué.`); setPh(G, { k: 'fres', w, n: f.n }, TIME.fres); return; }
  G.score[w]++;
  addLog(G, `${G.players[w].name} gagne le combat ${f.n === 3 ? 'de mort subite' : f.n} (${G.score[0]}-${G.score[1]}).`);
  setPh(G, { k: 'fres', w, n: f.n }, TIME.fres);
}
function afterFight(G) {
  const f = G.fights[G.fights.length - 1];
  if (f.w === 'draw') return startFight(G, f.n, f.A, f.B, other(f.starter));
  if (G.score[0] === 2 || G.score[1] === 2 || f.n === 3) return finish(G, G.score[0] > G.score[1] ? 0 : 1, 'score');
  if (f.n === 1) return startFight(G, 2, G.comp[0][1], G.comp[1][1]);
  // 1-1 : mort subite, avec 8 nouvelles cartes et l'argent restant.
  const ex = G.market.map(m => nkey(G.cards[m.k].n));
  G.stage = 'sd';
  G.sdm = drawMarket(X.pool, G.roles, DIST8, ENV_SD, ex).map(({ c, env }) => { G.cards[c.k] = c; return { k: c.k, env, by: null, price: 0 }; });
  G.nom = other(G.first);
  addLog(G, '1-1 : mort subite ! 8 nouvelles cartes, payées avec l\'argent restant. Un trio neuf de 3 rôles différents.');
  nextTurn(G);
}
function finish(G, w, why) { G.stage = 'over'; G.over = { w, why }; setPh(G, { k: 'over' }, 0); addLog(G, `${G.players[w].name} remporte le Mercato${why === 'ff' ? ' (forfait)' : why === 'away' ? ' (adversaire absent)' : ''} !`); }

// Applique l'action d'un joueur si elle est valable ; sinon elle est ignorée.
function apply(G, who, a) {
  if (!G || G.over) return false;
  const ph = G.ph, P = G.players, H = X.hid;
  if (a.t === 'ff') { finish(G, other(who), 'ff'); return true; }
  if (a.t === 'claim') { if (X.awayFor(other(who)) < TIME.away * 1000) return false; finish(G, who, 'away'); return true; }
  if (a.pid !== G.pid) return false;
  const inR = (v, lo, hi) => Number.isInteger(v) && v % K === 0 && v >= lo && v <= hi || (Number.isInteger(v) && v === hi && v >= lo);
  switch (ph.k) {
    case 'nominate': {
      if (who !== ph.who || a.t !== 'nom' || !canUse(G, who, a.k)) return false;
      const m = item(G, a.k), o = other(who), oCan = canUse(G, o, a.k);
      if (m.env) { setPh(G, { k: 'sealed', c: a.k, nom: who, has: [false, false] }, TIME.sealed); if (!oCan) { X.hid.bids[o] = 0; G.ph.has[o] = true; } addLog(G, `${P[who].name} met ${G.cards[a.k].n} en vente : sous enveloppe !`); return true; }
      if (!inR(a.v, minBid(G, who), maxBid(G, who))) return false;
      G.ph = { k: 'open', c: a.k, nom: who, high: a.v, lead: who, turn: o };
      addLog(G, `${P[who].name} met ${G.cards[a.k].n} en vente et ouvre à ${ki(a.v)}.`);
      if (!oCan || maxBid(G, o) < a.v + K) { award(G, who, a.v); return true; }
      G.pid++; G.dl = Date.now() + TIME.open * 1000; return true;
    }
    case 'open': {
      if (who !== ph.turn) return false;
      if (a.t === 'pass') { addLog(G, `${P[who].name} passe.`); award(G, ph.lead, ph.high); return true; }
      if (a.t !== 'bid' || !inR(a.v, ph.high + K, maxBid(G, who))) return false;
      addLog(G, `${P[who].name} surenchérit à ${ki(a.v)}.`);
      Object.assign(ph, { high: a.v, lead: who, turn: other(who) });
      if (maxBid(G, other(who)) < a.v + K) { award(G, who, a.v); return true; }
      G.pid++; G.dl = Date.now() + TIME.open * 1000; return true;
    }
    case 'sealed': {
      if (a.t !== 'seal' || ph.has[who]) return false;
      const v = a.v, isNom = who === ph.nom;
      if (isNom ? !inR(v, minBid(G, who), maxBid(G, who)) : !(v === 0 || inR(v, K, maxBid(G, who)))) return false;
      H.bids[who] = v; ph.has[who] = true;
      if (ph.has[0] && ph.has[1]) { const o = other(ph.nom), w = H.bids[o] > H.bids[ph.nom] ? o : ph.nom; award(G, w, H.bids[w], { sealed: true, bids: H.bids.slice() }); }
      return true;
    }
    case 'pick': if (who !== ph.who || a.t !== 'pick' || !canUse(G, who, a.k)) return false; ph.c = a.k; award(G, who, 0, { free: true }); return true;
    case 'compose': {
      if (a.t !== 'comp' || ph.ready[who] || !Array.isArray(a.v) || a.v.length !== 2) return false;
      const all = [...a.v[0], ...a.v[1]];
      if (all.length !== 6 || new Set(all).size !== 6 || !all.every(k => P[who].own.includes(k)) || !trioOk(G, a.v[0]) || !trioOk(G, a.v[1])) return false;
      H.comp[who] = a.v; ph.ready[who] = true;
      if (ph.ready[0] && ph.ready[1]) { G.comp = H.comp.slice(); addLog(G, 'Trios révélés !'); startFight(G, 1, G.comp[0][0], G.comp[1][0]); }
      return true;
    }
  }
  return false;
}
// Temps écoulé : action automatique la plus simple.
function timeout(G) {
  const ph = G.ph, H = X.hid;
  switch (ph.k) {
    case 'nominate': { const L = usable(G, ph.who); const k = L[Math.floor(Math.random() * L.length)]; if (!k) return nextTurn(G); addLog(G, `${G.players[ph.who].name} n'a pas choisi à temps : carte tirée au hasard.`); return apply(G, ph.who, { t: 'nom', k, v: minBid(G, ph.who), pid: G.pid }); }
    case 'open': addLog(G, `Temps écoulé pour ${G.players[ph.turn].name}.`); return apply(G, ph.turn, { t: 'pass', pid: G.pid });
    case 'sealed': for (const i of [0, 1]) if (!ph.has[i]) apply(G, i, { t: 'seal', v: i === ph.nom ? minBid(G, i) : 0, pid: G.pid }); return true;
    case 'pick': { const L = usable(G, ph.who); if (L[0]) apply(G, ph.who, { t: 'pick', k: L[Math.floor(Math.random() * L.length)], pid: G.pid }); return true; }
    case 'done': return nextTurn(G);
    case 'compose': for (const i of [0, 1]) if (!ph.ready[i]) { addLog(G, `${G.players[i].name} n'a pas validé à temps : trios faits automatiquement.`); apply(G, i, { t: 'comp', v: autoSplit(G, G.players[i].own), pid: G.pid }); } return true;
    case 'fres': return afterFight(G);
  }
}

/* ===================== Accès aux données et au réseau ===================== */
function supaDB(sb, uid) {
  const T = () => sb.from('mercato_parties');
  return {
    create: code => T().insert({ code, host_name: X?.myName || '' }).select().single(),
    get: code => T().select('*').eq('code', code).maybeSingle(),
    join: (code, name) => T().update({ guest: uid, guest_name: name, status: 'playing' }).eq('code', code).is('guest', null).select().maybeSingle(),
    save: (code, patch) => T().update(patch).eq('code', code),
    mine: () => T().select('code,host,guest,host_name,guest_name,status,updated_at').or(`host.eq.${uid},guest.eq.${uid}`).order('updated_at', { ascending: false }).limit(12),
    del: code => T().delete().eq('code', code)
  };
}
function supaNet(sb, code, uid) {
  const ch = sb.channel('mercato-' + code, { config: { broadcast: { self: false }, presence: { key: uid } } });
  const api = {
    on: (ev, fn) => ch.on('broadcast', { event: ev }, ({ payload }) => fn(payload)),
    onPresence: fn => ch.on('presence', { event: 'sync' }, () => fn(Object.keys(ch.presenceState()))),
    start: () => new Promise(ok => { let done = false; ch.subscribe(s => { if (s === 'SUBSCRIBED' && !done) { done = true; ch.track({ uid, t: Date.now() }); ok(); } }); setTimeout(() => { if (!done) { done = true; ok(); } }, 8000); }),
    send: (ev, payload) => ch.send({ type: 'broadcast', event: ev, payload }),
    close: () => { try { sb.removeChannel(ch); } catch (e) { /* rien */ } }
  };
  return api;
}

/* ===================== Page ===================== */
export async function page(m, arg, ctx) {
  cleanup();
  ensureCss(ctx);
  const parts = String(arg || '').split('/').filter(Boolean);
  if (parts[0] !== 'mercato') return hub(m);
  const code = (parts[1] || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return lobby(m, ctx);
  return game(m, ctx, code);
}
function ensureCss(ctx) { if (document.getElementById('mxCss')) return; const l = document.createElement('link'); l.id = 'mxCss'; l.rel = 'stylesheet'; l.href = 'jeux/mercato.css?v=' + (ctx.APP_V || ''); document.head.appendChild(l); }
function cleanup() {
  if (!X) return;
  try { X.net?.close(); } catch (e) { /* rien */ }
  (X.timers || []).forEach(t => clearInterval(t));
  try { X.W?.BFDuel?.stop(); } catch (e) { /* rien */ }
  window.removeEventListener('hashchange', X.onHash);
  X = null;
}

function hub(m) {
  m.innerHTML = `<section class="hero mx-hero"><span class="chip red">Mini-jeux</span><h1 style="margin-top:12px">Mini-jeux de la Brigade</h1><p class="mute">Des jeux entre membres, avec les cartes YURO et le moteur de combat du simulateur.</p></section>
  <div class="grid mx-games"><a class="card mx-game" href="#jeux/mercato"><div class="mx-game-ico">⚖️</div><div><h2>Mercato YURO</h2><p class="mute small">Enchères en ligne contre un ami : 1 000 000 KI pour recruter 6 cartes, puis deux combats en 3 contre 3. Mort subite à 1-1.</p><span class="btn primary" style="margin-top:8px">Jouer</span></div></a></div>`;
}

const RULES = `<ul class="mx-rules">
  <li>Partie en ligne à 2 : chacun a <b>1 000 000 KI</b> et recrute <b>6 cartes</b> parmi les <b>14 du marché</b>, visibles dès le début (stats à 5★).</li>
  <li><b>Une carte par rôle dans un trio</b>, comme dans le jeu : au plus 2 cartes du même rôle sur tes 6.</li>
  <li><b>Chacun son tour</b>, un joueur choisit la carte mise en vente et ouvre l'enchère (10 000 KI minimum). On surenchérit par tranches de 10 000 KI, jusqu'à ce que l'un passe.</li>
  <li>📩 <b>3 cartes sont sous enveloppe</b> (connues dès le début) : chacun mise en secret, la plus haute mise l'emporte. À égalité, c'est celui qui l'a mise en vente.</li>
  <li>Il te reste toujours au moins 10 000 KI par carte qu'il te manque. Quand un joueur a ses 6 cartes, l'autre complète gratuitement.</li>
  <li>Ensuite, chacun forme <b>deux trios en secret</b> (le trio 1 joue le combat 1). Deux combats en 3 contre 3, joués en direct, 45 s par coup.</li>
  <li><b>1-1 : mort subite</b>. 8 nouvelles cartes, payées avec l'argent qu'il te reste : un trio neuf de 3 rôles différents pour le dernier combat. L'argent mis de côté peut tout changer !</li>
</ul>`;

async function lobby(m, ctx) {
  const { sb, S } = ctx, uid = S.user.id, name = S.profile?.discord || 'Membre';
  X = { timers: [], myName: name }; const db = ctx.db || supaDB(sb, uid);
  m.innerHTML = `<p><a class="btn ghost" href="#jeux" style="min-height:36px">← Mini-jeux</a></p><h1>Mercato YURO</h1>
  <div class="mx-lobby"><div class="card"><h2>Créer une partie</h2><p class="small mute">Tu reçois un code à envoyer à ton ami.</p><button class="btn primary" id="mxNew">Créer la partie</button></div>
  <div class="card"><h2>Rejoindre une partie</h2><p class="small mute">Entre le code reçu (4 lettres).</p><div class="row"><input id="mxCode" maxlength="4" placeholder="CODE" autocomplete="off" style="text-transform:uppercase;max-width:140px"><button class="btn primary" id="mxJoin">Rejoindre</button></div></div></div>
  <p class="red small" id="mxErr"></p><div id="mxMine"></div>
  <div class="card section"><h2>Règles</h2>${RULES}</div>`;
  const err = t => { m.querySelector('#mxErr').textContent = t; };
  m.querySelector('#mxNew').onclick = async () => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let t = 0; t < 6; t++) {
      const code = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
      const { error } = await db.create(code, name);
      if (!error) { location.hash = '#jeux/mercato/' + code; return; }
      if (!/duplicate|unique/i.test(error.message || '')) return err('Impossible de créer la partie : ' + error.message);
    }
    err('Impossible de créer la partie, réessaie.');
  };
  const join = () => { const c = m.querySelector('#mxCode').value.trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(c)) return err('Le code fait 4 lettres.'); location.hash = '#jeux/mercato/' + c; };
  m.querySelector('#mxJoin').onclick = join; m.querySelector('#mxCode').onkeydown = e => { if (e.key === 'Enter') join(); };
  const { data } = await db.mine();
  const L = (data || []).filter(r => r.status !== 'over' || Date.now() - new Date(r.updated_at) < 864e5);
  if (L.length) m.querySelector('#mxMine').innerHTML = `<div class="card section"><h2>Mes parties</h2>${L.map(r => { const opp = r.host === uid ? r.guest_name : r.host_name; return `<a class="mx-row" href="#jeux/mercato/${esc(r.code)}"><b>${esc(r.code)}</b><span>${opp ? 'contre ' + esc(opp) : 'en attente d\'un adversaire'}</span><span class="chip">${r.status === 'over' ? 'Terminée' : r.status === 'lobby' ? 'Salon' : 'En cours'}</span></a>`; }).join('')}</div>`;
}

/* ===================== Partie ===================== */
async function game(m, ctx, code) {
  const { sb, S } = ctx, uid = S.user.id, name = S.profile?.discord || 'Membre';
  const db = ctx.db || supaDB(sb, uid);
  X = { ctx, db, code, uid, myName: name, me: null, host: false, G: null, hid: { bids: [null, null], comp: [null, null] }, timers: [], online: new Set(), away: [0, 0], seen: [Date.now(), Date.now()],
    draft: null, sel: null, myBid: {}, compSel: null, F: null, W: null, frame: null, saveT: 0, off: 0 };
  X.onHash = () => { if (!location.hash.startsWith('#jeux/mercato/' + code)) cleanup(); };
  window.addEventListener('hashchange', X.onHash);
  X.awayFor = i => X.online.has(X.G?.players[i]?.uid) ? 0 : Date.now() - (X.seen[i] || Date.now());
  m.innerHTML = `<div class="mx" id="mx"><div class="mx-top" id="mxTop"></div><div class="mx-hud" id="mxHud"></div><div class="card mx-act" id="mxAct"><div class="mute">Chargement…</div></div>
    <div id="mxMain"></div><div id="mxFight" class="mx-fight" hidden></div><details class="card mx-logw"><summary><b>Journal</b></summary><div class="mx-log" id="mxLog"></div></details></div>`;
  X.root = m;
  let { data: row, error } = await db.get(code);
  if (error) { m.querySelector('#mxAct').innerHTML = `<p class="red">Erreur : ${esc(error.message)}</p>`; return; }
  if (!row) { m.querySelector('#mxAct').innerHTML = `<p>Aucune partie avec le code <b>${esc(code)}</b>.</p><a class="btn" href="#jeux/mercato">Retour</a>`; return; }
  if (row.host !== uid && row.guest !== uid) {
    if (row.guest || row.status !== 'lobby') { m.querySelector('#mxAct').innerHTML = `<p>Cette partie est déjà complète.</p><a class="btn" href="#jeux/mercato">Retour</a>`; return; }
    const r = await db.join(code, name); if (r.error || !r.data) { m.querySelector('#mxAct').innerHTML = `<p class="red">Impossible de rejoindre : ${esc(r.error?.message || 'partie déjà prise')}</p>`; return; }
    row = r.data;
  }
  if (!X) return;
  X.host = row.host === uid; X.me = X.host ? 0 : 1; X.row = row; X.hs = Math.random().toString(36).slice(2, 8);
  X.pool = buildPool(ctx); X.roles = Object.keys(ctx.ROLE);
  const net = X.net = (ctx.net || supaNet)(sb, code, uid);
  net.onPresence(ids => { const now = Date.now(); X.online = new Set(ids); if (X.G) X.G.players.forEach((p, i) => { if (X.online.has(p.uid)) X.seen[i] = now; }); else if (X.host && ids.length > 1) hostStart(); render(); });
  if (X.host) {
    net.on('act', a => { if (!X.G || a.uid !== X.G.players[1].uid) return; if (apply(X.G, 1, a)) commit(); });
    net.on('hello', () => { if (X.G) sendState(); else hostStart(); });
  } else {
    net.on('state', s => { if (!s || (X.G && s.hs === X.G.hs && s.seq < X.G.seq)) return; X.off = Date.now() - (s.now || Date.now()); X.G = s; resendMoves(); render(); });
  }
  net.on('mv', p => onRemoteMove(p));
  await net.start(); if (!X) return;
  if (row.state && row.state.v) {
    X.G = row.state;
    if (X.host && !X.G.over) { // les mises secrètes et les trios non révélés étaient restés en mémoire : on les redemande
      const ph = X.G.ph; if (ph.k === 'sealed') { ph.has = [false, false]; X.G.pid++; X.G.dl = Date.now() + TIME.sealed * 1000; }
      if (ph.k === 'compose') { ph.ready = [false, false]; X.G.pid++; X.G.dl = Date.now() + TIME.compose * 1000; }
      else if (X.G.dl) X.G.dl = Date.now() + (TIME[ph.k] || 20) * 1000;
      commit();
    }
  }
  if (row.status === 'over' && row.state?.over) X.G = row.state;
  if (X.host && !X.G && row.guest) hostStart();
  if (!X.host) net.send('hello', { uid });
  X.timers.push(setInterval(tick, 500));
  render();
}
async function hostStart() {
  if (!X || X.G || X.starting) return; X.starting = true;
  const { data: row } = await X.db.get(X.code); X.starting = false;
  if (!X || X.G || !row?.guest) return;
  try { X.G = newState(row, X.pool, X.roles); } catch (e) { X.root.querySelector('#mxAct').innerHTML = `<p class="red">${esc(e.message)}</p>`; return; }
  nextTurn(X.G); commit();
}
function commit() {
  const G = X.G; G.seq++; G.now = Date.now(); G.hs = X.hs;
  if (X.host) sendState();
  render();
  clearTimeout(X.saveT); X.saveT = setTimeout(save, G.over ? 0 : 600);
}
function sendState() { if (!X?.G) return; X.G.now = Date.now(); X.net.send('state', X.G); }
function save() { if (!X?.G) return; const G = X.G; X.db.save(X.code, { state: G, status: G.over ? 'over' : 'playing', ...(G.over ? { winner: G.players[G.over.w].uid } : {}) }).then(r => { if (r?.error) console.warn('[mercato] enregistrement', r.error.message); }); }
function act(t, v, extra = {}) {
  const G = X.G; if (!G) return;
  const a = { t, v, pid: G.pid, uid: X.uid, ...extra };
  if (t === 'seal') X.myBid[G.pid] = v;
  if (X.host) { if (apply(G, 0, a)) commit(); } else X.net.send('act', a);
  if (!X.host && t === 'claim') { // l'hôte est absent : l'invité enregistre lui-même la victoire
    if (X.awayFor(0) >= TIME.away * 1000) { finish(G, 1, 'away'); G.seq++; render(); save(); }
  }
}
function tick() {
  if (!X) return;
  const G = X.G, now = Date.now();
  if (X.host && G && !G.over && G.dl && now > G.dl && G.ph.k !== 'fight') { G.dl = 0; timeout(G); commit(); }
  if (G) G.players.forEach((p, i) => { if (X.online.has(p.uid)) X.seen[i] = now; });
  X.root.querySelectorAll('[data-dl]').forEach(el => { const s = Math.max(0, Math.ceil((+el.dataset.dl - (now - (X.host ? 0 : X.off))) / 1000)); el.textContent = s + ' s'; el.classList.toggle('hot', s <= 5); });
  if (X.F) fightTick();
  const o = other(X.me ?? 0); const aw = G && !G.over && G.players[o]?.uid && X.awayFor(o) >= TIME.away * 1000;
  const cb = X.root.querySelector('#mxClaim'); if (cb) cb.hidden = !aw; else if (aw) render();
}

/* ===================== Affichage ===================== */
function cardImg(c, cls = '') { return c.img ? `<img class="${cls}" src="${esc(c.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'mx-fb',textContent:'${esc(initials(c.n))}'}))">` : `<div class="mx-fb">${esc(initials(c.n))}</div>`; }
const roleLbl = r => X.ctx.ROLE[r] || r;
function tile(G, m, opt = {}) {
  const c = G.cards[m.k], me = X.me, sold = m.by != null;
  const cls = ['mx-card', sold ? 'sold' : '', !sold && !canUse(G, me, m.k) ? 'nouse' : '', opt.sel ? 'sel' : '', opt.live ? 'live' : '', opt.click ? 'click' : ''].join(' ');
  return `<button class="${cls}" data-k="${esc(m.k)}" data-r="${esc(c.rar)}"><div class="mx-pic">${cardImg(c)}${m.env ? '<span class="mx-env" title="Sous enveloppe">📩</span>' : ''}<span class="mx-rar">${c.rar === 'Transcendant' ? 'TRS' : c.rar === 'Exclusive' ? 'EX' : 'LR'}</span></div>
    <div class="mx-cap"><b class="mx-n">${esc(c.n)}</b><span class="mx-role" data-role="${esc(c.role)}">${esc(roleLbl(c.role))}</span><span class="mx-st">${fmtN(c.hp)} PV · ${fmtN(c.atk)} ATQ</span>${c.tn ? `<span class="mx-tn">${esc(c.tn)}</span>` : ''}</div>
    ${sold ? `<div class="mx-sold">${m.by === me ? 'Toi' : esc(G.players[m.by].name)} · ${m.price ? ki(m.price) : 'gratuit'}</div>` : !canUse(G, me, m.k) ? `<div class="mx-no">${slots(G, me) ? 'Rôle complet' : 'Équipe complète'}</div>` : ''}</button>`;
}
const fmtN = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
function render() {
  if (!X || !X.root) return;
  const G = X.G, R = X.root, $ = s => R.querySelector(s);
  if (!$('#mx')) return;
  if (!G) {
    const link = location.origin + location.pathname + '#jeux/mercato/' + X.code;
    $('#mxTop').innerHTML = `<a class="btn ghost" href="#jeux/mercato" style="min-height:36px">← Quitter</a>`;
    $('#mxAct').innerHTML = X.host ? `<h2>Salon ${esc(X.code)}</h2><p>Envoie ce code à ton ami : <b class="mx-code">${esc(X.code)}</b></p><div class="row"><button class="btn" id="mxCopy">Copier le lien</button>${navigator.share ? '<button class="btn" id="mxShare">Partager</button>' : ''}</div><p class="small mute">La partie commence dès que ton ami a rejoint.</p>`
      : `<h2>Salon ${esc(X.code)}</h2><p class="mute">Connexion à la partie de ${esc(X.row?.host_name || 'l\'hôte')}… Elle commence dès que l'hôte est en ligne.</p>`;
    $('#mxCopy') && ($('#mxCopy').onclick = () => { navigator.clipboard?.writeText(link).then(() => X.ctx.toast?.('Lien copié')); });
    $('#mxShare') && ($('#mxShare').onclick = () => navigator.share({ title: 'Mercato YURO', text: 'Rejoins ma partie de Mercato YURO : code ' + X.code, url: link }).catch(() => {}));
    $('#mxMain').innerHTML = `<div class="card section"><h2>Règles</h2>${RULES}</div>`; return;
  }
  const P = G.players, me = X.me, o = other(me), ph = G.ph;
  const stageLbl = { main: 'Mercato', compose: 'Composition des trios', fight: 'Combats', sd: 'Mort subite', over: 'Fin de partie' }[G.stage];
  $('#mxTop').innerHTML = `<div class="mx-title"><b>Mercato YURO</b><span class="chip">${stageLbl}</span><span class="small mute">Partie ${esc(G.code)}</span></div>
    <div class="mx-score"><span>${esc(P[0].name)}</span><b>${G.score[0]} - ${G.score[1]}</b><span>${esc(P[1].name)}</span></div>
    <div class="row mx-topb">${G.over ? '<a class="btn ghost" href="#jeux/mercato">Retour</a>' : `<button class="btn ghost" id="mxClaim" hidden>Réclamer la victoire (adversaire absent)</button><button class="btn ghost" id="mxFF">Abandonner</button>`}</div>`;
  $('#mxHud').innerHTML = [me, o].map(i => hudHTML(G, i)).join('');
  // zone d'action
  $('#mxAct').innerHTML = actHTML(G);
  $('#mxLog').innerHTML = G.log.map(l => `<div>${esc(l)}</div>`).join('');
  // zone principale
  if (G.over && X.F) { try { X.W?.BFDuel?.stop(); } catch (e) { /* rien */ } X.F = null; }
  const inFight = G.stage === 'fight' && (ph.k === 'fight' || ph.k === 'fres');
  $('#mxFight').hidden = !inFight;
  if (inFight) { $('#mxMain').innerHTML = fightSide(G); mountFight(); syncMoves(); }
  else if (G.stage === 'compose') $('#mxMain').innerHTML = composeHTML(G);
  else if (G.stage === 'over') $('#mxMain').innerHTML = overHTML(G);
  else $('#mxMain').innerHTML = `<div class="mx-mkh"><h2>${isSD(G) ? 'Marché de la mort subite' : 'Le marché'}</h2><span class="small mute">${mkt(G).filter(m => m.by == null).length} cartes à vendre · touche une carte pour voir sa technique</span></div><div class="mx-grid">${mkt(G).map(m => tile(G, m, { sel: X.sel === m.k && ph.k === 'nominate', live: ph.c === m.k && ['open', 'sealed', 'done'].includes(ph.k), click: (ph.k === 'nominate' || ph.k === 'pick') && ph.who === me && canUse(G, me, m.k) })).join('')}</div>`;
  wire(G);
}
function hudHTML(G, i) {
  const p = G.players[i], me = X.me, list = owned(G, i), on = X.online.has(p.uid);
  const active = (G.ph.k === 'nominate' || G.ph.k === 'pick') ? G.ph.who === i : G.ph.k === 'open' ? G.ph.turn === i : G.ph.k === 'sealed' ? !G.ph.has[i] : false;
  return `<div class="mx-pl ${active ? 'on' : ''}"><div class="mx-pln"><b>${esc(p.name)}</b>${i === me ? '<span class="chip">toi</span>' : ''}<i class="mx-dot ${on ? 'ok' : ''}" title="${on ? 'En ligne' : 'Hors ligne'}"></i></div>
    <div class="mx-money">${ki(p.budget)}</div><div class="mx-bar"><i style="width:${Math.max(0, p.budget / BUDGET * 100)}%"></i></div>
    <div class="mx-slots">${Array.from({ length: cfg(G).n }, (_, k) => { const c = list[k] && G.cards[list[k]]; return `<span class="mx-slot" title="${c ? esc(c.n + ' · ' + roleLbl(c.role)) : ''}">${c ? cardImg(c) : ''}</span>`; }).join('')}</div>
    ${G.stage === 'main' || G.stage === 'sd' ? `<div class="small mute">${slots(G, i) ? `Mise max : ${ki(maxBid(G, i))}` : 'Équipe complète'}</div>` : ''}</div>`;
}
const timer = G => G.dl ? `<span class="mx-timer" data-dl="${G.dl}">…</span>` : '';
const wait = t => `<div class="mx-wait"><span class="mx-dots"><i></i><i></i><i></i></span>${t}</div>`;
function bigCard(G, k) { const c = G.cards[k]; return `<div class="mx-big" data-r="${esc(c.rar)}"><div class="mx-bigpic">${cardImg(c)}</div><div><b class="mx-bign">${esc(c.n)}</b><div class="row" style="gap:6px;margin:4px 0"><span class="mx-role" data-role="${esc(c.role)}">${esc(roleLbl(c.role))}</span><span class="chip">${esc(c.rar)}</span>${item(G, k)?.env ? '<span class="chip warn">📩 Enveloppe</span>' : ''}</div><div class="small">${fmtN(c.hp)} PV · ${fmtN(c.atk)} ATQ (5★)</div>${c.tn ? `<div class="small mute"><b>${esc(c.tn)}</b>${c.td ? ' : ' + esc(c.td) : ''}</div>` : ''}</div></div>`; }
function bidBox(G, min, max, label, opt = {}) {
  const key = G.pid + ':' + label, d = X.draft && X.draft.k === key ? X.draft.v : (opt.def ?? min);
  return `<div class="mx-bid" data-min="${min}" data-max="${max}" data-key="${esc(key)}"><label class="small mute" for="mxBid">Ta mise (tranches de 10 000 KI) · de ${ki(min)} à ${ki(max)}</label>
    <div class="mx-bidin"><input id="mxBid" type="text" inputmode="numeric" value="${grp(d)}" autocomplete="off" aria-label="Ta mise en KI"><span>KI</span></div>
    <div class="mx-quick"><button data-add="${K}">+10 000</button><button data-add="${5 * K}">+50 000</button><button data-add="${10 * K}">+100 000</button><button data-set="${min}">Min</button><button data-set="${max}">Max</button></div>
    <div class="row"><button class="btn primary" id="mxBidGo">${label}</button>${opt.pass ? `<button class="btn ghost" id="mxPass">${opt.pass}</button>` : ''}</div><div class="red small" id="mxBidErr"></div></div>`;
}
function actHTML(G) {
  const P = G.players, me = X.me, o = other(me), ph = G.ph, c = ph.c && G.cards[ph.c];
  const head = (t, sub) => `<div class="mx-acth"><h2>${t}</h2>${timer(G)}</div>${sub ? `<p class="mute small">${sub}</p>` : ''}`;
  switch (ph.k) {
    case 'nominate':
      if (ph.who !== me) return head(`${esc(P[o].name)} choisit une carte`, 'Il choisit quelle carte du marché passe aux enchères.') + wait('En attente…');
      if (!X.sel || !canUse(G, me, X.sel)) return head('À toi de mettre une carte en vente', 'Touche une carte du marché que tu peux recruter. Tu ouvres l\'enchère : si ton adversaire ne surenchérit pas, elle est à toi.');
      return head('Mettre en vente', '') + bigCard(G, X.sel) + (item(G, X.sel).env ? `<p class="small">📩 Carte sous enveloppe : vous misez chacun en secret, la plus haute mise l'emporte.</p><div class="row"><button class="btn primary" id="mxNomEnv">Mettre en vente sous enveloppe</button><button class="btn ghost" id="mxUnsel">Choisir une autre carte</button></div>`
        : bidBox(G, minBid(G, me), maxBid(G, me), 'Mettre en vente et ouvrir', { pass: 'Choisir une autre carte' }));
    case 'open': {
      const lead = ph.lead === me ? 'Tu mènes' : `${esc(P[ph.lead].name)} mène`;
      const top = head(`Enchère : ${ki(ph.high)}`, `${lead} l'enchère.`) + bigCard(G, ph.c);
      if (ph.turn !== me) return top + wait(`${esc(P[o].name)} réfléchit : surenchérir ou passer…`);
      const mn = ph.high + K, mx = maxBid(G, me);
      return top + (mx >= mn ? bidBox(G, mn, mx, 'Surenchérir', { pass: `Passer (${esc(P[ph.lead].name)} l'emporte)` }) : `<p>Tu ne peux pas monter plus haut.</p><button class="btn primary" id="mxPass">Passer</button>`);
    }
    case 'sealed': {
      const top = head('📩 Enchère sous enveloppe', `Chacun mise en secret. La plus haute mise l'emporte ; à égalité, ${ph.nom === me ? 'toi (tu l\'as mise en vente)' : esc(P[ph.nom].name) + ' (il l\'a mise en vente)'}.`) + bigCard(G, ph.c);
      if (ph.has[me]) return top + (X.myBid[G.pid] != null ? `<p>Ta mise : <b>${ki(X.myBid[G.pid])}</b></p>` : '<p>Ta mise est envoyée.</p>') + (ph.has[o] ? '' : wait(`${esc(P[o].name)} prépare sa mise…`));
      if (!canUse(G, me, ph.c)) return top + '<p class="mute">Tu ne peux pas recruter cette carte.</p>';
      const isNom = ph.nom === me, mx = maxBid(G, me);
      return top + (ph.has[o] ? `<p class="small mute">${esc(P[o].name)} a déjà misé.</p>` : '') + (isNom ? bidBox(G, minBid(G, me), mx, 'Envoyer ma mise secrète', { secret: true })
        : mx >= K ? bidBox(G, K, mx, 'Envoyer ma mise secrète', { secret: true, pass: 'Ne pas miser' }) : '<button class="btn" id="mxPass">Ne pas miser</button>');
    }
    case 'pick':
      if (ph.who !== me) return head(`${esc(P[o].name)} complète son équipe`, 'Ton équipe est complète : il choisit gratuitement parmi les cartes restantes.') + wait('En attente…');
      return head('Complète ton équipe gratuitement', `${esc(P[o].name)} a toutes ses cartes : touche une carte du marché compatible avec tes rôles.`);
    case 'done': {
      const w = ph.w === me ? 'Tu recrutes' : `${esc(P[ph.w].name)} recrute`;
      return head(`${w} ${esc(c.n)}`, ph.free ? 'Gratuitement.' : `Pour ${ki(ph.price)}.`) + (ph.bids ? `<p class="small">Mises sous enveloppe : ${esc(P[0].name)} ${ki(ph.bids[0])} · ${esc(P[1].name)} ${ki(ph.bids[1])}</p>` : '') + bigCard(G, ph.c);
    }
    case 'compose':
      return head('Prépare tes deux trios', 'En secret : ton adversaire ne voit rien avant que les deux aient validé. Le trio 1 joue le combat 1, le trio 2 le combat 2. Une carte par rôle dans chaque trio.') + (ph.ready[me] ? wait(ph.ready[o] ? 'Révélation…' : `Tes trios sont prêts. ${esc(P[o].name)} prépare les siens…`) : '');
    case 'fight': { const f = G.fights[G.fights.length - 1]; return head(f.n === 3 ? 'Combat de mort subite' : `Combat ${f.n} sur 2`, 'Joue tes coups dans l\'écran de combat. 45 s par coup : sinon une attaque simple est jouée pour toi (3 fois de suite = forfait).') + '<div id="mxMoveT" class="mx-movet"></div>'; }
    case 'fres': return head(ph.w === 'draw' ? 'Égalité : le combat est rejoué' : ph.w === me ? `Tu gagnes le combat ${ph.n === 3 ? 'de mort subite' : ph.n} !` : `${esc(P[ph.w].name)} gagne le combat ${ph.n === 3 ? 'de mort subite' : ph.n}`, `Score : ${G.score[0]} - ${G.score[1]}.`);
    case 'over': { const w = G.over.w; return `<div class="mx-acth"><h2>${w === me ? '🏆 Victoire !' : 'Défaite'}</h2></div><p>${w === me ? 'Tu remportes' : esc(P[w].name) + ' remporte'} le Mercato ${G.score[w]} - ${G.score[other(w)]}${G.over.why === 'ff' ? ' par forfait' : G.over.why === 'away' ? ' (adversaire absent)' : ''}.</p>`; }
  }
  return '';
}
function composeHTML(G) {
  const me = X.me, own = G.players[me].own;
  if (G.ph.ready?.[me]) return teamsHTML(G);
  if (!X.compSel || X.compSel.pid !== G.pid) { const s = autoSplit(G, own); X.compSel = { pid: G.pid, t: Object.fromEntries(own.map(k => [k, s[0].includes(k) ? 0 : 1])) }; }
  const T = [0, 1].map(t => own.filter(k => X.compSel.t[k] === t)), ok = T.map(t => trioOk(G, t));
  return `<div class="mx-comp">${[0, 1].map(t => `<div class="card mx-trio ${ok[t] ? 'ok' : 'bad'}"><h3>Trio ${t + 1} <span class="small mute">· combat ${t + 1}</span></h3><div class="mx-trioc">${T[t].map(k => { const c = G.cards[k]; return `<button class="mx-mini" data-mv="${esc(k)}">${cardImg(c)}<b>${esc(c.n)}</b><span class="mx-role" data-role="${esc(c.role)}">${esc(roleLbl(c.role))}</span><span class="small">${fmtN(c.hp)} PV · ${fmtN(c.atk)} ATQ</span><span class="small mute">→ trio ${2 - t}</span></button>`; }).join('')}</div>
    <p class="small ${ok[t] ? 'mute' : 'red'}">${ok[t] ? '3 rôles différents : valide.' : T[t].length !== 3 ? 'Il faut exactement 3 cartes.' : 'Deux cartes du même rôle : change de trio.'}</p></div>`).join('')}</div>
    <div class="row"><button class="btn ghost" id="mxSwapT">Inverser l'ordre des trios</button><button class="btn primary" id="mxComp" ${ok[0] && ok[1] ? '' : 'disabled'}>Valider mes trios</button></div>`;
}
function teamsHTML(G) {
  return `<div class="mx-teams">${[X.me, other(X.me)].map(i => { const p = G.players[i]; return `<div class="card"><h3>${esc(p.name)}</h3><div class="mx-trioc">${p.own.map(k => { const c = G.cards[k], m = G.market.find(x => x.k === k); return `<div class="mx-mini">${cardImg(c)}<b>${esc(c.n)}</b><span class="mx-role" data-role="${esc(c.role)}">${esc(roleLbl(c.role))}</span><span class="small mute">${m?.price ? ki(m.price) : 'gratuit'}</span></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
}
function fightSide(G) {
  const f = G.fights[G.fights.length - 1], P = G.players, row = (i, ks) => `<div class="mx-fteam"><b>${esc(P[i].name)}</b>${ks.map(k => `<span>${esc(G.cards[k].n)}</span>`).join('')}</div>`;
  return `<div class="mx-fhead">${row(0, f.A)}<span class="mx-vs">VS</span>${row(1, f.B)}</div>`;
}
function overHTML(G) {
  const P = G.players;
  return `<div class="mx-teams">${[0, 1].map(i => `<div class="card"><h3>${esc(P[i].name)} ${G.over.w === i ? '🏆' : ''}</h3><p class="small mute">Reste : ${ki(P[i].budget)}</p>
    ${(G.comp ? G.comp[i] : [P[i].own]).map((t, j) => `<div class="small"><b>${G.comp ? 'Trio ' + (j + 1) : 'Équipe'}</b> : ${t.map(k => esc(G.cards[k].n)).join(', ')}</div>`).join('')}
    ${P[i].sd.length ? `<div class="small"><b>Mort subite</b> : ${P[i].sd.map(k => esc(G.cards[k].n)).join(', ')}</div>` : ''}</div>`).join('')}</div>
    <div class="card section"><h3>Combats</h3>${G.fights.map(f => `<div class="small">${f.n === 3 ? 'Mort subite' : 'Combat ' + f.n} : ${f.w == null ? '—' : f.w === 'draw' ? 'égalité' : esc(P[f.w].name)}</div>`).join('') || '<p class="small mute">Aucun combat joué.</p>'}</div>
    <div class="row"><a class="btn primary" href="#jeux/mercato">Nouvelle partie</a></div>`;
}
function cardModal(G, k) {
  const d = document.createElement('div'); d.className = 'mx-modal'; d.innerHTML = `<div class="card mx-modalc">${bigCard(G, k)}<button class="btn" style="margin-top:12px">Fermer</button></div>`;
  d.onclick = e => { if (e.target === d || e.target.closest('button')) d.remove(); }; document.body.appendChild(d);
}
function wire(G) {
  const R = X.root, $ = s => R.querySelector(s), me = X.me, ph = G.ph;
  let ffT = null;
  $('#mxFF') && ($('#mxFF').onclick = e => { const b = e.currentTarget; if (b.dataset.sure) return act('ff'); b.dataset.sure = 1; b.textContent = 'Confirmer l\'abandon ?'; b.classList.add('red'); ffT = setTimeout(() => { delete b.dataset.sure; b.textContent = 'Abandonner'; b.classList.remove('red'); }, 3000); void ffT; });
  $('#mxClaim') && ($('#mxClaim').onclick = () => act('claim'));
  R.querySelectorAll('.mx-grid .mx-card').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (ph.k === 'nominate' && ph.who === me && canUse(G, me, k)) { X.sel = k; X.draft = null; render(); X.root.querySelector('#mxAct')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (ph.k === 'pick' && ph.who === me && canUse(G, me, k)) { act('pick', null, { k }); return; }
    cardModal(G, k);
  });
  $('#mxUnsel') && ($('#mxUnsel').onclick = () => { X.sel = null; render(); });
  $('#mxNomEnv') && ($('#mxNomEnv').onclick = () => act('nom', 0, { k: X.sel }));
  const box = R.querySelector('.mx-bid');
  if (box) {
    const inp = $('#mxBid'), min = +box.dataset.min, max = +box.dataset.max, key = box.dataset.key;
    const num = () => parseInt(inp.value.replace(/\D/g, ''), 10);
    const set = v => { inp.value = grp(v); X.draft = { k: key, v }; };
    // Saisie à la main : espaces entre les milliers pendant la frappe, arrondi à la tranche de 10 000 la plus proche en sortant du champ.
    inp.oninput = () => { const v = num(); inp.value = isNaN(v) ? '' : grp(v); X.draft = { k: key, v: isNaN(v) ? '' : v }; };
    inp.onblur = () => { const v = num(); if (!isNaN(v)) set(roundK(v, min, max)); };
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const v = num(); set(Math.min(max, roundK(isNaN(v) ? min : v, min, max) + +b.dataset.add)); });
    box.querySelectorAll('[data-set]').forEach(b => b.onclick = () => set(+b.dataset.set));
    const go = () => {
      const err = t => { $('#mxBidErr').textContent = t; }; let v = num();
      if (isNaN(v)) return err('Entre un montant.');
      v = roundK(v, min, max); set(v);
      if (v < min) return err(`Mise minimum : ${ki(min)}.`);
      if (v > max) return err(`Mise maximum : ${ki(max)}.`);
      X.draft = null;
      if (ph.k === 'nominate') act('nom', v, { k: X.sel }); else if (ph.k === 'open') act('bid', v); else if (ph.k === 'sealed') act('seal', v);
    };
    $('#mxBidGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  $('#mxPass') && ($('#mxPass').onclick = () => { if (ph.k === 'nominate') { X.sel = null; render(); } else if (ph.k === 'open') act('pass'); else if (ph.k === 'sealed') act('seal', 0); });
  R.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const k = b.dataset.mv; X.compSel.t[k] = 1 - X.compSel.t[k]; render(); });
  $('#mxSwapT') && ($('#mxSwapT').onclick = () => { for (const k in X.compSel.t) X.compSel.t[k] = 1 - X.compSel.t[k]; render(); });
  $('#mxComp') && ($('#mxComp').onclick = () => { const own = G.players[me].own, t = [0, 1].map(i => own.filter(k => X.compSel.t[k] === i)); act('comp', t); });
}

/* ===================== Combats PvP (moteur du simulateur) ===================== */
let SEED = 1;
function loadFrame() {
  if (X.W && X.W.__bfReady && X.W.BFDuel) return Promise.resolve(X.W);
  if (X.framePromise) return X.framePromise;
  return (X.framePromise = new Promise((ok, ko) => {
    const host = X.root.querySelector('#mxFight'); host.innerHTML = '';
    const f = document.createElement('iframe'); f.className = 'mx-frame'; f.title = 'Combat'; f.setAttribute('allow', 'fullscreen; autoplay'); f.src = 'battle-frame.html?v=' + (X.ctx.APP_V || ''); host.appendChild(f);
    const fit = () => { f.style.height = Math.round(Math.min(900, Math.max(560, window.innerHeight - 30))) + 'px'; }; fit(); window.addEventListener('resize', fit);
    const t0 = Date.now();
    const chk = () => { if (!X) return; const W = f.contentWindow; if (W && W.__bfReady && W.BFDuel) { X.W = W; prepFrame(W); ok(W); } else if (Date.now() - t0 > 30000) ko(new Error('timeout')); else setTimeout(chk, 150); };
    chk();
  }));
}
// Tirage au sort du moteur rendu identique sur les deux appareils (graine partagée), et boutons hors jeu masqués.
function prepFrame(W) {
  W.__bfNotify = t => X?.ctx.toast?.(t);
  const st = W.document.createElement('style');
  st.textContent = '[data-infinity-action="guard"],[data-infinity-autoplay],[data-infinity-replay],[data-infinity-lobby],[data-infinity-start],.story-end-screen{display:none!important}';
  W.document.head.appendChild(st);
  if (W.__mxSeeded) return; W.__mxSeeded = 1; X.rmOrig = W.reducedMotion;
  const run = (seed, fn) => { let x = (seed >>> 0) || 1; const o = W.Math.random; W.Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; try { return [fn(), x || 1]; } finally { W.Math.random = o; } };
  const oS = W.duelStart, oA = W.duelAdvanceCore, oF = W.duelAfter;
  W.duelStart = function (A, B, s) { const R = oS(A, B, s); R.b.rngState = SEED >>> 0 || 1; return R; };
  W.duelAdvanceCore = function (p, a, i, t) { const [nx, x] = run(p && p.rngState, () => oA(p, a, i, t)); nx.rngState = x; return nx; };
  W.duelAfter = function (side, next) { const [R, x] = run(next && next.rngState, () => oF(side, next)); R.b.rngState = x; return R; };
}
const sig = D => D && D.b ? [D.b.turn, ...D.b.players.map(u => u.hp), ...D.b.enemies.map(u => u.hp)].join(',') : '';
async function mountFight() {
  const G = X.G, f = G.fights[G.fights.length - 1], fid = G.fights.length;
  if (!f || (X.F && X.F.id === fid) || X.mounting === fid) return;
  X.mounting = fid;
  let W; try { W = await loadFrame(); } catch (e) { X.mounting = 0; X.root.querySelector('#mxFight').innerHTML = '<p class="red">Impossible de charger l\'écran de combat. Recharge la page.</p>'; return; }
  if (X) X.mounting = 0;
  if (!X || !X.G || X.G.fights.length !== fid) return;
  const me = X.me, F = X.F = { id: fid, replay: (f.moves || []).length, moves: (f.moves || []).slice(), sigs: [], wait: {}, seen: [], ai: [true, true], done: false, miss: 0, dl: 0, tk: -1, auto: false };
  const toU = k => { const c = G.cards[k]; return { name: c.n, rarity: c.eng, image: c.img, hp: c.hp, atk: c.atk }; };
  const aiPick = D => new Promise(res => {
    if (X?.F !== F) return;
    const k = W.BFDuel.info().hist.length - 1;
    if (F.moves[k]) { if (k < F.replay) W.reducedMotion = () => true; return res(F.moves[k]); }
    if (X.rmOrig) W.reducedMotion = X.rmOrig;
    if (D.s === me) { F.ai[me] = false; setTimeout(() => { try { W.renderInfinity(); } catch (e) { /* rien */ } }, 0); return; }
    F.wait[k] = res;
  });
  SEED = f.seed; W.reducedMotion = F.replay ? () => true : (X.rmOrig || W.reducedMotion);
  W.BFDuel.mount(null, { frame: true, A: f.A.map(toU), B: f.B.map(toU), names: [G.players[0].name, G.players[1].name], ai: F.ai, aiPick, onChange: info => onDuel(info, F), onQuit: () => {} });
  W.BFDuel.start(f.starter);
}
function onDuel(info, F) {
  if (!X || X.F !== F) return;
  const H = info.hist, me = X.me, D = info.D;
  for (let j = 1; j < H.length; j++) {
    const k = j - 1, h = H[j]; if (F.seen[k]) continue; F.seen[k] = 1;
    const s = sig(h.D);
    if (h.side === me && !F.moves[k]) {
      F.moves[k] = h.mv; F.dl = 0; if (!F.auto) F.miss = 0; F.auto = false;
      X.net.send('mv', { f: F.id, k, mv: h.mv, sig: s });
      storeMove(F.id, k, h.mv);
    } else if (F.sigs[k] && F.sigs[k] !== s) console.warn('[mercato] écart de calcul au coup', k);
  }
  if (D.winner != null) {
    if (!F.done) { F.done = true; F.dl = 0; if (X.host) setTimeout(() => { if (X?.G && X.F === F) { fightEnd(X.G, D.winner === 'draw' ? 'draw' : D.winner); commit(); } }, 2800); }
  } else if (D.s === me && !F.ai[me] && H.length - 1 === info.idx) {
    if (F.tk !== H.length) { F.tk = H.length; F.dl = Date.now() + TIME.move * 1000; }
  }
  if (me === 1) patchLabels();
}
function storeMove(fid, k, mv) { if (!X.host) return; const f = X.G.fights[fid - 1]; if (!f) return; f.moves[k] = mv; clearTimeout(X.saveT); X.saveT = setTimeout(save, 800); }
function onRemoteMove(p) {
  if (!X) return;
  if (X.host) storeMove(p.f, p.k, p.mv);
  const F = X.F; if (!F || F.id !== p.f) return;
  if (!F.moves[p.k]) F.moves[p.k] = p.mv; if (p.sig) F.sigs[p.k] = p.sig;
  const w = F.wait[p.k]; if (w) { delete F.wait[p.k]; w(p.mv); }
}
// Coups connus de l'état partagé mais pas encore reçus en direct (après un rechargement) : on les reprend.
function syncMoves() {
  const F = X.F, f = F && X.G.fights[F.id - 1]; if (!f) return;
  (f.moves || []).forEach((mv, k) => { if (mv && !F.moves[k]) { F.moves[k] = mv; const w = F.wait[k]; if (w) { delete F.wait[k]; w(mv); } } });
}
// L'hôte a rechargé avec un état un peu ancien : l'invité lui renvoie les coups qui manquent.
function resendMoves() {
  const F = X.F, f = F && X.G.fights[F.id - 1]; if (!f) return;
  F.moves.forEach((mv, k) => { if (mv && !(f.moves || [])[k]) X.net.send('mv', { f: F.id, k, mv, sig: '' }); });
}
function fightTick() {
  const F = X.F, W = X.W, el = X.root.querySelector('#mxMoveT');
  if (!F || !W) return;
  const D = W.BFDuel.info().D, mine = D && D.winner == null && D.s === X.me && !F.ai[X.me];
  if (el) { if (mine && F.dl) { const s = Math.max(0, Math.ceil((F.dl - Date.now()) / 1000)); el.innerHTML = `À toi de jouer : <b class="${s <= 10 ? 'hot' : ''}">${s} s</b>${F.miss ? ` · coups manqués : ${F.miss}/3` : ''}`; } else el.textContent = D && D.winner == null && D.s !== X.me ? `Au tour de ${X.G.players[other(X.me)].name}…` : ''; }
  if (mine && F.dl && Date.now() > F.dl && !W.infinityPlayback.animating) {
    F.miss++; F.dl = 0;
    if (F.miss >= 3) { act('ff'); return; }
    const pb = W.BFDuel.engine.persp(D.b, X.me), n0 = W.BFDuel.info().hist.length;
    for (let i = 0; i < pb.players.length && W.BFDuel.info().hist.length === n0; i++) {
      if (!W.BFDuel.engine.ready(pb.players[i])) continue;
      W.infinityPlayback.active = i; F.auto = true;
      for (const a of ['attack', 'skill']) { try { W.performInfinityAction(a); } catch (e) { /* rien */ } if (W.BFDuel.info().hist.length !== n0) break; }
    }
    if (W.BFDuel.info().hist.length === n0) F.auto = false;
  }
}
// Chez l'invité, le bandeau du moteur parle du point de vue de l'hôte : on le remet de son point de vue (les cartes, elles, sont déjà dans le bon sens).
function patchLabels() {
  const W = X.W, G = X.G; if (!W || !G) return;
  const a = G.players[0].name, b = G.players[1].name, A = a.toUpperCase(), B = b.toUpperCase();
  const map = [['À TOI DE JOUER', 'AU TOUR DE ' + A], ['AU TOUR DE ' + B, 'À TOI DE JOUER'], ['TON ACTION', 'ACTION DE ' + A], ['ACTION DE ' + B, 'TON ACTION'], ['Tu passes à l’action', a + ' passe à l’action'], [b + ' passe à l’action', 'Tu passes à l’action']];
  const root = W.document.getElementById('bfStage'); if (!root) return;
  const tw = W.document.createTreeWalker(root, 4); let n;
  while ((n = tw.nextNode())) { const t = n.nodeValue.trim(); if (!t || n.parentElement?.closest('.story-fighter')) continue; const hit = map.find(([x]) => x === t); if (hit) n.nodeValue = n.nodeValue.replace(hit[0], hit[1]); }
}

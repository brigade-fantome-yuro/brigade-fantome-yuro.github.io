// Mini-jeu « Mercato YURO » (Brigade Fantôme) : enchères en ligne à 2 joueurs sur les cartes YURO,
// puis deux combats PvP en 3 contre 3 avec le moteur du simulateur (BFDuel), et une mort subite si 1-1.
// Le créateur de la partie (l'hôte) fait tourner les enchères ; l'invité envoie ses actions.
// Les combats tournent sur les deux appareils avec les mêmes coups et le même tirage au sort (moteur « graine »).

const K = 10000;                 // une tranche de mise : 10 000 KI
const BUDGET = 1000000;          // budget de départ
const MAIN = { n: 6, per: 2 };   // mercato principal : 6 cartes, 2 au plus par rôle
const SD = { n: 3, per: 1 };     // mort subite : 3 cartes de 3 rôles différents
const TIME = { nominate: 40, open: 30, sealed: 30, reveal: 7, pick: 40, compose: 150, done: 4, fres: 6, move: 45, away: 60 };
// Répartitions des rôles qui ne bloquent jamais un joueur (vérifiées sur toutes les façons d'acheter).
// [répartition, poids du tirage] : la plupart des parties ont les 5 rôles, mais un rôle peut être rare ou absent.
const DIST14 = [[[3, 3, 3, 3, 2], 4], [[4, 3, 3, 3, 1], 3], [[4, 4, 3, 3, 0], 2], [[4, 4, 4, 1, 1], 1], [[4, 4, 4, 2, 0], 1], [[5, 4, 4, 1, 0], 0], [[5, 5, 4, 0, 0], 0], [[6, 4, 4, 0, 0], 0]];
const DIST8 = [[[2, 2, 2, 1, 1], 3], [[2, 2, 2, 2, 0], 2], [[3, 2, 2, 1, 0], 1], [[3, 3, 2, 0, 0], 0], [[4, 2, 2, 0, 0], 0]];
// Cartes très jouées en ranked : elles passent en priorité sous enveloppe quand elles sont dans le marché.
const META = ['seiichi samura'];   // en plus de la tier list, au cas où elle ne serait pas à jour
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
// Force d'une carte pour choisir les enveloppes : bonus de rareté + PV/1000 + ATQ/100 (même échelle que le guide des rôles).
// Tier list PvP de la Brigade (content.ranked_meta.tiers = [[id, valeur, tier]]) : chargée par l'hôte au début de la partie.
let TIERS = new Map();
const TIER_PTS = { S: 50, A: 40, B: 30, C: 20, D: 10 };
async function loadTiers(sb) {
  try { const { data } = await sb.from('content').select('data').eq('key', 'ranked_meta').maybeSingle(); TIERS = new Map((data?.data?.tiers || []).map(([id, v, t]) => ['c' + id, { t, v: +v || 0 }])); } catch (e) { TIERS = new Map(); }
}
// Force d'une carte pour les enveloppes : d'abord la tier list (S > A > B…), puis la liste méta, puis rareté et stats.
const power = c => { const t = TIERS.get(c.k); return (t ? (TIER_PTS[t.t] || 0) + Math.min(9, t.v / 100) : 0) + (META.includes(nkey(c.n)) ? 45 : 0) + (c.rar === 'Transcendant' ? 2 : c.rar === 'Exclusive' ? 1 : 0) + c.hp / 1000 + c.atk / 100; };
// Tire un marché de n cartes : répartition des rôles sûre, noms tous différents, cartes rares un peu moins fréquentes.
function drawMarket(pool, roles, dists, envN, exclude, capSmall) {
  const used = new Set(exclude), byRole = {};
  for (const r of roles) byRole[r] = pool.filter(c => c.role === r && !used.has(nkey(c.n)));
  const distinctCount = r => new Set(byRole[r].map(c => nkey(c.n))).size;
  // Un rôle qui a peu de personnages (les healers) n'est jamais vidé dans le marché principal : il en reste pour la mort subite.
  const cap = r => { const n = distinctCount(r); return capSmall && n <= 3 ? n - 1 : n; };
  const order = []; const left = dists.filter(d => d[1] > 0).slice();
  while (left.length) { let x = Math.random() * left.reduce((a, d) => a + d[1], 0), k = 0; for (; k < left.length - 1; k++) { x -= left[k][1]; if (x <= 0) break; } order.push(left.splice(k, 1)[0][0]); }
  // Les petits nombres vont aux rôles qui ont peu de personnages (un marché sans Dégâts n'arrive plus) ; un peu de hasard garde de la variété.
  const tryPlans = (list, lim) => { for (const d of list) {
    for (let t = 0; t < 12; t++) { const rs = roles.slice().sort((a, b) => distinctCount(a) * (.7 + Math.random() * .6) - distinctCount(b) * (.7 + Math.random() * .6)), ds = d.slice().sort((x, y) => x - y); if (ds.every((n, i) => lim(rs[i]) >= n)) return rs.map((r, i) => [r, ds[i]]); }
    for (let t = 0; t < 80; t++) { const rs = shuffle(roles.slice()); if (d.every((n, i) => lim(rs[i]) >= n)) return rs.map((r, i) => [r, d[i]]); }
  } return null; };
  const plan = tryPlans(order, cap) || tryPlans(dists.map(d => d[0]), distinctCount);
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
  const ro = roles.reduce((o, r, i) => (o[r] = i, o), {}), rr = { Transcendant: 0, Exclusive: 1, LR: 2 };
  out.sort((a, b) => ro[a.role] - ro[b.role] || rr[a.rar] - rr[b.rar] || a.n.localeCompare(b.n));
  // Sous enveloppe : les cartes les plus fortes du marché (rareté puis stats à 5★), une seule par rôle.
  const env = new Set(), roleTaken = new Set();
  for (const i of out.map((_, i) => i).sort((a, b) => power(out[b]) - power(out[a]))) {
    if (env.size >= envN) break;
    if (roleTaken.has(out[i].role)) continue;
    env.add(i); roleTaken.add(out[i].role);
  }
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
  G.market = drawMarket(pool, roles, DIST14, ENV_MAIN, [], true).map(({ c, env }) => { G.cards[c.k] = c; return { k: c.k, env, by: null, price: 0 }; });
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
  setPh(G, { k: 'done', c: k, w, price, ...extra }, extra.sealed ? TIME.reveal : TIME.done);
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
  if (a.pid !== G.pid && !(ph.k === 'open' && a.c === ph.c)) return false;   // enchère chrono : les mises arrivent librement pendant 30 s
  const inR = (v, lo, hi) => Number.isInteger(v) && v % K === 0 && v >= lo && v <= hi || (Number.isInteger(v) && v === hi && v >= lo);
  switch (ph.k) {
    case 'nominate': {
      if (who !== ph.who || a.t !== 'nom' || !canUse(G, who, a.k)) return false;
      const m = item(G, a.k), o = other(who), oCan = canUse(G, o, a.k);
      if (m.env && !oCan) { G.ph = { k: 'open', c: a.k, nom: who }; addLog(G, `${P[who].name} met ${G.cards[a.k].n} en vente.`); award(G, who, minBid(G, who), { why: slots(G, o) ? 'role' : 'full' }); return true; }   // personne en face : pas d'enveloppe à attendre
      if (m.env) { setPh(G, { k: 'sealed', c: a.k, nom: who, has: [false, false] }, TIME.sealed); addLog(G, `${P[who].name} met ${G.cards[a.k].n} en vente : sous enveloppe !`); return true; }
      if (!inR(a.v, minBid(G, who), maxBid(G, who))) return false;
      G.ph = { k: 'open', c: a.k, nom: who, high: a.v, lead: who, hist: [[who, a.v]] };
      addLog(G, `${P[who].name} met ${G.cards[a.k].n} en vente et ouvre à ${ki(a.v)}.`);
      if (!oCan || maxBid(G, o) < a.v + K) { award(G, who, a.v, { why: !oCan ? (slots(G, o) ? 'role' : 'full') : 'money' }); return true; }
      G.pid++; G.dl = Date.now() + TIME.open * 1000; return true;   // chrono de 30 s, qui ne repart jamais en arrière
    }
    case 'open': {
      // Enchère chrono : chacun mise quand il veut ; celui qui n'est pas en tête peut passer pour finir tout de suite.
      if (a.t === 'pass') { if (who === ph.lead) return false; addLog(G, `${P[who].name} passe.`); award(G, ph.lead, ph.high, { why: 'pass' }); return true; }
      if (a.t !== 'bid' || who === ph.lead || !canUse(G, who, ph.c) || !inR(a.v, ph.high + K, maxBid(G, who))) return false;
      addLog(G, `${P[who].name} surenchérit à ${ki(a.v)}.`);
      ph.high = a.v; ph.lead = who; ph.hist = [[who, a.v], ...(ph.hist || [])].slice(0, 8);
      if (maxBid(G, other(who)) < a.v + K) { award(G, who, a.v, { why: 'money' }); return true; }
      return true;
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
    case 'open': addLog(G, 'Fin du chrono.'); return award(G, ph.lead, ph.high, { why: 'clock' });
    // enveloppe non validée à temps : mise minimale de 10 000 KI (ou ce qu'il reste) pour chaque joueur qui peut recruter la carte
    case 'sealed': for (const i of [0, 1]) if (!ph.has[i]) apply(G, i, { t: 'seal', v: canUse(G, i, ph.c) ? minBid(G, i) : 0, pid: G.pid }); return true;
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
function supaNet(sb, code, uid, quiet) {
  const ch = sb.channel('mercato-' + code, { config: { broadcast: { self: false }, presence: { key: uid } } });
  const api = {
    on: (ev, fn) => ch.on('broadcast', { event: ev }, ({ payload }) => fn(payload)),
    onPresence: fn => ch.on('presence', { event: 'sync' }, () => fn(Object.keys(ch.presenceState()))),
    start: () => new Promise(ok => { let done = false; ch.subscribe(s => { if (s === 'SUBSCRIBED' && !done) { done = true; if (!quiet) ch.track({ uid, t: Date.now() }); ok(); } }); setTimeout(() => { if (!done) { done = true; ok(); } }, 8000); }),
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
/* Match de tournoi (arène de la Brigade) : la partie est créée par le serveur pour les deux joueurs du match.
   ctx.arena = { back: lien de retour, keep: début du lien de la salle, onOver: fonction appelée à la fin }.
   Les autres membres regardent en spectateur, avec 5 s de différé. À garder dans les prochaines versions du jeu. */
export async function arenaGame(m, code, ctx) { cleanup(); ensureCss(ctx); return game(m, ctx, code); }
export function arenaStop() { cleanup(); }
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
  <div class="grid mx-games"><a class="card mx-game" href="#jeux/mercato"><div class="mx-game-ico">${SEAL}</div><div><h2>Mercato YURO</h2><p class="mute small">Enchères en ligne contre un ami : 1 000 000 KI pour recruter 6 cartes, puis deux combats en 3 contre 3. Mort subite à 1-1.</p><span class="btn primary" style="margin-top:8px">Jouer</span></div></a></div>`;
}

const RULES = `<ul class="mx-rules">
  <li>Partie en ligne à 2 : chacun a <b>1 000 000 KI</b> et recrute <b>6 cartes</b> parmi les <b>14 du marché</b>, visibles dès le début (stats à 5★).</li>
  <li><b>Une carte par rôle dans un trio</b>, comme dans le jeu : au plus 2 cartes du même rôle sur tes 6.</li>
  <li><b>Chacun son tour</b>, un joueur choisit la carte mise en vente et l'ouvre (10 000 KI minimum). <b>Enchère chrono de 30 s</b> : les deux joueurs surenchérissent quand ils veulent, par tranches de 10 000 KI, et le chrono ne repart jamais en arrière. À zéro, le meilleur enchérisseur l'emporte : on peut sniper à la dernière seconde. Celui qui ne veut plus enchérir peut passer.</li>
  <li>📩 <b>Les 3 cartes les mieux classées du marché sont sous enveloppe</b>, d'après la tier list PvP de la Brigade (une par rôle, connues dès le début) : chacun mise en secret et valide son enveloppe en 30 s (sinon : 10 000 KI). La plus haute mise l'emporte ; à égalité, c'est celui qui l'a mise en vente.</li>
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
    draft: null, sel: null, myBid: {}, compSel: null, F: null, W: null, frame: null, saveT: 0, off: null, spec: false, arena: ctx.arena || null, back: ctx.arena?.back || '#jeux/mercato' };
  X.onHash = () => { if (!location.hash.startsWith(ctx.arena?.keep || ('#jeux/mercato/' + code))) cleanup(); };
  window.addEventListener('hashchange', X.onHash);
  m.addEventListener('pointerdown', () => { if (SFX.on) audio(); }, { once: true });
  X.awayFor = i => X.online.has(X.G?.players[i]?.uid) ? 0 : Date.now() - (X.seen[i] || Date.now());
  m.innerHTML = `<div class="mx" id="mx"><div class="mx-top" id="mxTop"></div><div class="mx-hud" id="mxHud"></div><div class="card mx-act" id="mxAct"><div class="mute">Chargement…</div></div>
    <div id="mxMain"></div><div id="mxFight" class="mx-fight" hidden></div><details class="card mx-logw"><summary><b>Journal</b></summary><div class="mx-log" id="mxLog"></div></details></div>`;
  X.root = m;
  let { data: row, error } = await db.get(code);
  if (error) { m.querySelector('#mxAct').innerHTML = `<p class="red">Erreur : ${esc(error.message)}</p>`; return; }
  if (!row) { m.querySelector('#mxAct').innerHTML = `<p>Aucune partie avec le code <b>${esc(code)}</b>.</p><a class="btn" href="#jeux/mercato">Retour</a>`; return; }
  if (row.host !== uid && row.guest !== uid && X.arena) X.spec = true;
  else if (row.host !== uid && row.guest !== uid) {
    if (row.guest || row.status !== 'lobby') { m.querySelector('#mxAct').innerHTML = `<p>Cette partie est déjà complète.</p><a class="btn" href="#jeux/mercato">Retour</a>`; return; }
    const r = await db.join(code, name); if (r.error || !r.data) { m.querySelector('#mxAct').innerHTML = `<p class="red">Impossible de rejoindre : ${esc(r.error?.message || 'partie déjà prise')}</p>`; return; }
    row = r.data;
  }
  if (!X) return;
  X.host = !X.spec && row.host === uid; X.me = X.host || X.spec ? 0 : 1; X.row = row; X.hs = Math.random().toString(36).slice(2, 8);
  X.pool = buildPool(ctx); X.roles = Object.keys(ctx.ROLE);
  const net = X.net = (ctx.net || supaNet)(sb, code, uid, X.spec);
  const later = fn => X.spec ? (p => setTimeout(() => { if (X) fn(p); }, 5000)) : fn;   // spectateurs : 5 s de différé
  net.onPresence(ids => { const now = Date.now(), before = [...X.online].sort().join(); X.online = new Set(ids); const same = before === [...X.online].sort().join(); if (X.G) X.G.players.forEach((p, i) => { if (X.online.has(p.uid)) X.seen[i] = now; }); else if (X.host && ids.length > 1) hostStart(); if (!same) render(); });
  if (X.host) {
    net.on('act', a => { if (!X.G || a.uid !== X.G.players[1].uid) return; if (apply(X.G, 1, a)) commit(); });
    net.on('hello', () => { if (X.G) sendState(); else hostStart(); });
  } else {
    net.on('state', later(s => { if (!s || (X.G && s.hs === X.G.hs && s.seq < X.G.seq)) return; { const d = Date.now() - (s.now || Date.now()); X.off = X.off == null || X.offAt < Date.now() - 60000 ? d : Math.min(X.off, d); X.offAt = X.offAt && X.offAt > Date.now() - 60000 ? X.offAt : Date.now(); } X.G = s; if (!X.spec) resendMoves(); render(); }));
  }
  net.on('mv', later(p => onRemoteMove(p)));
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
  if (!X.host && !X.spec) net.send('hello', { uid });
  X.timers.push(setInterval(tick, 500));
  // le chrono a son propre rafraîchissement, plus fin, pour que les secondes tombent régulièrement
  X.timers.push(setInterval(() => { if (!X) return; X.root.querySelectorAll('[data-dl]').forEach(el => { const t = timerState(+el.dataset.dl, +el.dataset.tot || 30), b = el.querySelector('b'), u = el.querySelector('u'); if (b && b.textContent !== t.s + ' s') b.textContent = t.s + ' s'; if (u) u.style.transform = `scaleX(${t.k.toFixed(3)})`; el.classList.toggle('hot', t.s <= 5); }); }, 100));
  render();
}
async function hostStart() {
  if (!X || X.G || X.starting) return; X.starting = true;
  if (X.ctx.sb && !TIERS.size) await loadTiers(X.ctx.sb);
  const { data: row } = await X.db.get(X.code); X.starting = false;
  if (!X || X.G || !row?.guest) return;
  try { X.G = newState(row, X.pool, X.roles); } catch (e) { X.root.querySelector('#mxAct').innerHTML = `<p class="red">${esc(e.message)}</p>`; return; }
  nextTurn(X.G); commit();
}
function commit() {
  const G = X.G; G.seq++; if (G.over && X.arena?.onOver) setTimeout(() => { try { X?.arena?.onOver(G); } catch (e) { /* rien */ } }, 1500); G.now = Date.now(); G.hs = X.hs;
  if (X.host) sendState();
  render();
  clearTimeout(X.saveT); X.saveT = setTimeout(save, G.over ? 0 : 600);
}
function sendState() { if (!X?.G) return; X.G.now = Date.now(); X.net.send('state', X.G); }
function save() { if (!X?.G) return; const G = X.G; X.db.save(X.code, { state: G, status: G.over ? 'over' : 'playing', ...(G.over ? { winner: G.players[G.over.w].uid } : {}) }).then(r => { if (r?.error) console.warn('[mercato] enregistrement', r.error.message); }); }
function act(t, v, extra = {}) {
  const G = X.G; if (!G || X.spec) return;
  const a = { t, v, pid: G.pid, c: G.ph?.c, uid: X.uid, ...extra };
  if (t === 'seal') X.myBid[G.pid] = v;
  if (X.host) { if (apply(G, 0, a)) commit(); } else X.net.send('act', a);
  if (!X.host && t === 'claim') { // l'hôte est absent : l'invité enregistre lui-même la victoire
    if (X.awayFor(0) >= TIME.away * 1000) { finish(G, 1, 'away'); G.seq++; render(); save(); }
  }
}
function tick() {
  if (!X) return;
  const G = X.G, now = Date.now();
  if (X.host && G && !G.over && G.dl && now > G.dl + (G.ph.k === 'open' ? 300 : 0) && G.ph.k !== 'fight') {   // 0,3 s de grâce pour les mises de dernière seconde
    G.dl = 0; timeout(G); commit(); }
  if (G) G.players.forEach((p, i) => { if (X.online.has(p.uid)) X.seen[i] = now; });
  if (G && (X.snd?.myTurn || X.snd?.behind) && G.dl) { const s5 = Math.ceil((G.dl - (now - (X.host ? 0 : X.off || 0))) / 1000); if (s5 <= 5 && s5 > 0 && s5 !== X.lastTick) { X.lastTick = s5; sfx('tick'); } }

  if (X.F) fightTick();
  const o = other(X.me ?? 0); const aw = !X.spec && G && !G.over && G.players[o]?.uid && X.awayFor(o) >= TIME.away * 1000;
  const cb = X.root.querySelector('#mxClaim'); if (cb) cb.hidden = !aw; else if (aw) render();
}

/* ===================== Affichage ===================== */
function cardImg(c, cls = '') { return c.img ? `<img class="${cls}" src="${esc(c.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'mx-fb',textContent:'${esc(initials(c.n))}'}))">` : `<div class="mx-fb">${esc(initials(c.n))}</div>`; }
const roleLbl = r => X.ctx.ROLE[r] || r;
// Pictos de rôle (traits blancs, comme les icônes du menu du site).
const ROLE_ICO = { degats: 'M5 19 17 7M14 4h6v6M7 13l4 4', tank: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', healer: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z', stunner: 'M13 3 5 14h6l-1 7 8-11h-6z', polyvalence: 'M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z' };
const roleIco = r => `<svg class="mx-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ROLE_ICO[r] || ROLE_ICO.polyvalence}"/></svg>`;
const roleTag = c => `<span class="mx-role" data-role="${esc(c.role)}">${roleIco(c.role)}${esc(roleLbl(c.role))}</span>`;
// Sceau de cire à l'araignée : la carte part sous enveloppe.
const SEAL = `<span class="mx-seal" title="Sous enveloppe : mises secrètes"><svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M19 17 13 9 6 7M18 21 9 18 2 20M18 26 9 30 4 37M20 30 15 38 14 46M29 17 35 9 42 7M30 21 39 18 46 20M30 26 39 30 44 37M28 30 33 38 34 46"/></g><circle cx="24" cy="17" r="5" fill="currentColor"/><ellipse cx="24" cy="31" rx="7.5" ry="10" fill="currentColor"/></svg></span>`;
const rarShort = c => c.rar === 'Transcendant' ? 'TRS' : c.rar === 'Exclusive' ? 'EX' : 'LR';
const statsHTML = c => `<span class="mx-st"><span><i>PV</i>${fmtN(c.hp)}</span><span><i>ATQ</i>${fmtN(c.atk)}</span></span>`;
// Face de carte façon TCG : illustration pleine, reflet selon la rareté, plaque du nom en bas.
function face(c, opt = {}) {
  return `<span class="mx-face" data-r="${esc(c.rar)}">${cardImg(c)}<span class="mx-foil"></span>${opt.env ? SEAL + '<span class="mx-envtag">Enveloppe</span>' : ''}<span class="mx-rar">${rarShort(c)}</span>
    <span class="mx-plate"><b class="mx-n">${esc(c.n)}</b>${opt.mini ? '' : roleTag(c) + statsHTML(c)}</span></span>`;
}
const SWAY = [4.6, 5.4, 6.2];
function tile(G, m, i, opt = {}) {
  const c = G.cards[m.k], me = X.me, sold = m.by != null, use = canUse(G, me, m.k);
  const dur = SWAY[i % 3], delay = -((Date.now() / 1000) % dur).toFixed(2);
  const cls = ['mx-card', sold ? 'sold' : '', !sold && !use ? 'nouse' : '', opt.sel ? 'sel' : '', opt.live ? 'mx-live' : '', opt.click ? 'click' : ''].join(' ');
  return `<div class="mx-cell"><button class="${cls}" data-k="${esc(m.k)}" style="--dur:${dur}s;--del:${delay}s" aria-label="${esc(c.n)}">${face(c, { env: m.env })}
    ${sold ? `<span class="mx-sold"><b>${m.by === me ? 'À toi' : esc(G.players[m.by].name)}</b>${m.price ? ki(m.price) : 'gratuit'}</span>` : !use ? `<span class="mx-no">${slots(G, me) ? 'Rôle complet' : 'Équipe complète'}</span>` : ''}</button></div>`;
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
  $('#mxTop').innerHTML = `<div class="mx-title"><b>Mercato</b><span class="mx-stage-lbl">${stageLbl}</span><span class="small mute">Partie ${esc(G.code)}</span></div>
    <div class="mx-score" aria-label="Score"><span>${esc(P[0].name)}</span><b>${G.score[0]}<i></i>${G.score[1]}</b><span>${esc(P[1].name)}</span></div>
    <div class="row mx-topb">${G.over ? `<a class="btn ghost" href="${X.back}">Retour</a>` : `<button class="btn ghost" id="mxClaim" hidden>Réclamer la victoire (adversaire absent)</button><button class="btn ghost" id="mxFF">Abandonner</button>`}<button class="btn ghost mx-snd" id="mxSnd" aria-pressed="${SFX.on}" title="${SFX.on ? 'Couper le son' : 'Remettre le son'}"><svg class="mx-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z${SFX.on ? 'M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' : 'M16 9l5 6M21 9l-5 6'}"/></svg>${SFX.on ? 'Son' : 'Muet'}</button></div>`;
  $('#mx').classList.toggle('mx-spec', !!X.spec);
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
  else $('#mxMain').innerHTML = marketHTML(G);
  wire(G);
  motion(G);
  sounds(G);
}
/* ===================== Bruitages (synthétisés, sans fichier audio) ===================== */
const SFX = { on: (() => { try { return localStorage.getItem('mx_sfx') !== '0'; } catch (e) { return true; } })(), ac: null };
function audio() {
  if (!SFX.ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; SFX.ac = new C(); }
  if (SFX.ac.state === 'suspended') SFX.ac.resume().catch(() => {});
  return SFX.ac;
}
// une note : fréquence (avec glissé), enveloppe courte, type d'onde
function tone(a, f, d, o = {}) {
  const t = a.currentTime + (o.at || 0), g = a.createGain(), osc = a.createOscillator();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || .15, t + (o.atk || .006)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(g).connect(a.destination); osc.start(t); osc.stop(t + d + .02);
}
// un souffle filtré : froissement, fil qui file, coup sourd
function hiss(a, d, o = {}) {
  const t = a.currentTime + (o.at || 0), n = Math.ceil(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, o.decay || 2);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.f || 1200, t); if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + d); f.Q.value = o.q || 1;
  g.gain.value = o.vol || .2; src.connect(f).connect(g).connect(a.destination); src.start(t);
}
const SOUNDS = {
  drop: a => { hiss(a, .45, { filter: 'bandpass', f: 400, fTo: 3200, q: 2, vol: .16, decay: 1 }); tone(a, 120, .25, { to: 60, vol: .3, at: .42 }); hiss(a, .08, { f: 900, vol: .25, at: .42 }); },      // la carte file le long de son fil puis se pose
  select: a => { tone(a, 660, .12, { type: 'triangle', vol: .1 }); tone(a, 990, .1, { type: 'triangle', vol: .06, at: .04 }); },
  bid: a => { tone(a, 1320, .09, { type: 'square', vol: .05 }); tone(a, 1760, .16, { type: 'triangle', vol: .09, at: .06 }); hiss(a, .06, { filter: 'highpass', f: 5000, vol: .08 }); }, // pièce posée sur la table
  pass: a => { tone(a, 300, .28, { to: 190, vol: .12 }); },
  outbid: a => { tone(a, 880, .1, { type: 'square', vol: .06 }); tone(a, 660, .14, { type: 'square', vol: .06, at: .1 }); tone(a, 1760, .12, { type: 'triangle', vol: .08, at: .02 }); },   // tu viens d'être dépassé
  seal: a => { hiss(a, .09, { filter: 'bandpass', f: 2600, q: 3, vol: .3 }); tone(a, 420, .2, { to: 260, type: 'triangle', vol: .1, at: .03 }); }, // cire qui craque
  stamp: a => { hiss(a, .18, { f: 380, vol: .55 }); tone(a, 75, .35, { to: 45, vol: .5 }); tone(a, 640, .05, { type: 'triangle', vol: .12, at: .01 }); },  // tampon « Adjugé »
  free: a => { tone(a, 784, .14, { vol: .1 }); tone(a, 1046, .22, { vol: .1, at: .1 }); },
  turn: a => { tone(a, 587, .22, { vol: .1 }); tone(a, 880, .35, { vol: .1, at: .12 }); },   // à toi de jouer
  tick: a => { tone(a, 1500, .03, { type: 'square', vol: .035 }); },
  swap: a => { hiss(a, .22, { filter: 'bandpass', f: 1800, fTo: 600, q: 1.5, vol: .14, decay: 1.3 }); tone(a, 520, .08, { type: 'triangle', vol: .06, at: .16 }); },
  reveal: a => { [220, 277, 330, 440].forEach((f, i) => tone(a, f, 1.1 - i * .1, { vol: .07, atk: .25, at: i * .07 })); hiss(a, .9, { filter: 'highpass', f: 3000, vol: .05, decay: 1 }); },
  win: a => { [523, 659, 784, 1046].forEach((f, i) => tone(a, f, i === 3 ? .6 : .18, { type: 'triangle', vol: .12, at: i * .11 })); },
  lose: a => { [392, 330, 262].forEach((f, i) => tone(a, f, i === 2 ? .6 : .25, { vol: .12, at: i * .18 })); },
  over: a => { tone(a, 75, .5, { to: 50, vol: .45 }); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(a, f, .5, { type: 'triangle', vol: .1, at: .1 + i * .09 })); }
};
function sfx(name) { if (!SFX.on) return; try { const a = audio(); if (a) SOUNDS[name]?.(a); } catch (e) { /* rien */ } }
// Les sons suivent ce qui change dans la partie (pour les deux joueurs), jamais au premier affichage.
function sounds(G) {
  const ph = G.ph, me = X.me, prev = X.snd;
  const myTurn = !G.over && ((ph.k === 'nominate' || ph.k === 'pick') && ph.who === me ||  ph.k === 'sealed' && !ph.has[me] && canUse(G, me, ph.c) || ph.k === 'compose' && !ph.ready[me]);
  const behind = !G.over && ph.k === 'open' && ph.lead !== me && canUse(G, me, ph.c);
  const cur = { pid: G.pid, k: ph.k, c: ph.c, high: ph.high, lead: ph.lead, log: G.log[0], stage: G.stage, fights: G.fights.length, myTurn, behind, over: !!G.over };
  X.snd = cur;
  if (!prev) return;
  if (cur.over && !prev.over) return sfx(G.over.w === me ? 'over' : 'lose');
  if (cur.k !== prev.k || cur.c !== prev.c) {
    if ((cur.k === 'open' || cur.k === 'sealed') && cur.c !== prev.c) { sfx('drop'); if (cur.k === 'sealed') setTimeout(() => sfx('seal'), 450); return; }
    if (cur.k === 'done') { if (ph.bids) { setTimeout(() => sfx('seal'), 500); setTimeout(() => sfx('seal'), 1000); setTimeout(() => sfx('stamp'), 2000); } else sfx(ph.free ? 'free' : 'stamp'); return; }
    if (cur.k === 'fight' && prev.stage === 'compose') return sfx('reveal');
    if (cur.k === 'fres') return sfx(ph.w === me ? 'win' : ph.w === 'draw' ? 'pass' : 'lose');
  }
  if (cur.k === 'open' && prev.k === 'open' && cur.c === prev.c && cur.high > prev.high) return sfx(prev.lead === me && cur.lead !== me ? 'outbid' : 'bid');
  if (cur.log !== prev.log && / passe\.$/.test(cur.log || '')) sfx('pass');
  if (cur.myTurn && !prev.myTurn) setTimeout(() => sfx('turn'), cur.k === 'open' || cur.k === 'sealed' ? 650 : 0);
}
// Mouvement : entrée de la carte en vente, tampon « Adjugé », montant qui défile, carte qui pivote sous le doigt.
function motion(G) {
  const R = X.root, ph = G.ph, hold = R.querySelector('.mx-hold');
  if (hold) { const key = ph.k === 'done' ? 'v:' + ph.c : 'c:' + (ph.c || X.sel); if (X.lastStage !== key) { hold.classList.add('enter'); X.lastStage = key; } bindTilt(hold); }
  const fd = R.querySelector('.mx-feed'); if (fd) { if (X.lastFeed === ph.c + ':' + ph.high) fd.classList.add('mx-still'); X.lastFeed = ph.c + ':' + ph.high; }
  const rv = R.querySelector('.mx-reveal');
  if (rv) { if (X.lastReveal === G.pid) { rv.classList.add('mx-still'); R.querySelector('.mx-late')?.classList.add('mx-still'); } X.lastReveal = G.pid; }
  const st = R.querySelector('.mx-stamp'); if (st && X.lastStamp !== G.pid) { st.classList.add('slam'); X.lastStamp = G.pid; }
  const amt = R.querySelector('.mx-amt');
  if (amt) { const to = +amt.dataset.v, from = X.lastAmt ?? to; X.lastAmt = to; if (from !== to && !matchMedia('(prefers-reduced-motion: reduce)').matches) { const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / 520), e = 1 - Math.pow(1 - k, 3); amt.firstChild.nodeValue = grp(Math.round((from + (to - from) * e) / 1000) * 1000) + ' '; if (k < 1 && amt.isConnected) requestAnimationFrame(f); }; requestAnimationFrame(f); amt.classList.add('bump'); } }
  else X.lastAmt = null;
}
function bindTilt(hold) {
  const card = hold.querySelector('.mx-big3d'); if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const set = (x, y) => { card.style.setProperty('--rx', (y * -16).toFixed(2) + 'deg'); card.style.setProperty('--ry', (x * 22).toFixed(2) + 'deg'); card.style.setProperty('--mx', (50 + x * 60).toFixed(1) + '%'); card.style.setProperty('--my', (50 + y * 60).toFixed(1) + '%'); };
  hold.onpointermove = e => { const r = hold.getBoundingClientRect(); hold.classList.add('held'); set((e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5); };
  hold.onpointerleave = hold.onpointerup = hold.onpointercancel = () => { hold.classList.remove('held'); set(0, 0); };
}
// Le marché, avec le filtre par rôle : tout, une ligne par rôle, ou un seul rôle.
function marketHTML(G) {
  const ph = G.ph, me = X.me, M = mkt(G), roles = Object.keys(X.ctx.ROLE).filter(r => M.some(m => G.cards[m.k].role === r));
  const f = X.filter && (X.filter === 'all' || X.filter === 'rows' || roles.includes(X.filter)) ? X.filter : 'all';
  const optOf = m => ({ sel: X.sel === m.k && ph.k === 'nominate', live: ph.c === m.k && ['open', 'sealed', 'done'].includes(ph.k), click: (ph.k === 'nominate' || ph.k === 'pick') && ph.who === me && canUse(G, me, m.k) });
  const idx = new Map(M.map((m, i) => [m.k, i]));
  const web = list => `<div class="mx-web">${list.map(m => tile(G, m, idx.get(m.k), optOf(m))).join('')}</div>`;
  const left = r => M.filter(m => G.cards[m.k].role === r && m.by == null).length;
  const btn = (v, label, ico) => `<button class="mx-fbtn ${f === v ? 'on' : ''}" data-filter="${v}" ${ico ? `data-role="${v}"` : ''} aria-pressed="${f === v}">${ico || ''}${label}</button>`;
  const bar = `<div class="mx-filter" role="toolbar" aria-label="Filtrer le marché">${btn('all', 'Tout')}${btn('rows', 'Par rôle')}${roles.map(r => btn(r, `${esc(roleLbl(r))}<small>${left(r)}</small>`, roleIco(r))).join('')}</div>`;
  let body;
  if (f === 'rows') body = roles.map(r => `<section class="mx-rrow"><h3 class="mx-rrowh" data-role="${r}">${roleIco(r)}${esc(roleLbl(r))}<small>${left(r)} à vendre</small></h3>${web(M.filter(m => G.cards[m.k].role === r))}</section>`).join('');
  else body = web(f === 'all' ? M : M.filter(m => G.cards[m.k].role === f));
  const legend = M.some(m => m.env) ? `<p class="mx-legend">${SEAL}<span><b>Sceau rouge : carte sous enveloppe.</b> Quand elle est mise en vente, chacun mise en secret et la plus haute mise l'emporte. Ce sont les cartes les mieux classées de la tier list PvP.</span></p>` : '';
  return `<div class="mx-mkh"><h2>${isSD(G) ? 'Marché de la mort subite' : 'Le marché'}</h2><span class="small mute">${M.filter(m => m.by == null).length} cartes à vendre. Touche une carte pour lire sa technique.</span></div>${legend}${bar}${body}`;
}
function hudHTML(G, i) {
  const p = G.players[i], me = X.me, list = owned(G, i), on = X.online.has(p.uid);
  const active = (G.ph.k === 'nominate' || G.ph.k === 'pick') ? G.ph.who === i : G.ph.k === 'open' ? G.ph.lead === i : G.ph.k === 'sealed' ? !G.ph.has[i] : false;
  return `<div class="mx-pl ${active ? 'on' : ''} ${i === me ? 'mx-me' : 'mx-opp'}"><div class="mx-pln"><b>${esc(p.name)}</b>${i === me ? '<span class="mx-you">toi</span>' : ''}<i class="mx-dot ${on ? 'ok' : ''}" title="${on ? 'En ligne' : 'Hors ligne'}"></i></div>
    <div class="mx-money">${grp(p.budget)}<small>KI</small></div><div class="mx-bar"><i style="width:${Math.max(0, p.budget / BUDGET * 100)}%"></i></div>
    <div class="mx-slots" style="--n:${cfg(G).n}">${Array.from({ length: cfg(G).n }, (_, k) => { const c = list[k] && G.cards[list[k]]; return `<span class="mx-slot ${c ? 'full' : ''}" title="${c ? esc(c.n + ', ' + roleLbl(c.role)) : 'Place libre'}">${c ? cardImg(c) + `<span class="mx-slotr" data-role="${esc(c.role)}">${roleIco(c.role)}</span>` : ''}</span>`; }).join('')}</div>
    ${G.stage === 'main' || G.stage === 'sd' ? `<div class="small mute">${slots(G, i) ? `Mise max : ${ki(maxBid(G, i))}` : 'Équipe complète'}</div>` : ''}</div>`;
}
const timerState = (dl, tot) => { const left = dl - (Date.now() - (X.host ? 0 : X.off || 0)), s = Math.max(0, Math.ceil(left / 1000)); return { s, k: Math.max(0, Math.min(1, left / 1000 / tot)) }; };
const timerTot = G => G.ph.k === 'done' && G.ph.sealed ? TIME.reveal : TIME[G.ph.k] || 30;
const timer = G => { if (!G.dl || G.ph.k === 'done' || G.ph.k === 'fres') return ''; const tot = timerTot(G), t = timerState(G.dl, tot); return `<span class="mx-timer ${t.s <= 5 ? 'hot' : ''}" data-dl="${G.dl}" data-tot="${tot}"><b>${t.s} s</b><i><u style="transform:scaleX(${t.k.toFixed(3)})"></u></i></span>`; };
const wait = t => `<div class="mx-wait"><span class="mx-dots"><i></i><i></i><i></i></span>${t}</div>`;
function bigCard(G, k, opt = {}) {
  const c = G.cards[k], env = item(G, k)?.env;
  return `<div class="mx-stage"><div class="mx-hold"><div class="mx-big3d">${face(c, { env })}</div>${opt.stamp || ''}</div>
    <div class="mx-info"><b class="mx-bign">${esc(c.n)}</b><div class="mx-tags">${roleTag(c)}<span class="mx-rtag" data-r="${esc(c.rar)}">${esc(c.rar)}</span>${env ? '<span class="mx-rtag env">Sous enveloppe</span>' : ''}</div>
    ${statsHTML(c)}<span class="small mute">Stats à 5★${c.an ? ', ' + esc(c.an) : ''}</span>${c.tn ? `<p class="mx-tech"><b>${esc(c.tn)}</b>${c.td ? esc(c.td) : ''}</p>` : ''}</div></div>`;
}
function bidBox(G, min, max, label, opt = {}) {
  const key = G.pid + ':' + label, d = X.draft && X.draft.k === key ? X.draft.v : (opt.def ?? min);
  return `<div class="mx-bid" data-min="${min}" data-max="${max}" data-key="${esc(key)}"><label class="small mute" for="mxBid">Ta mise, par tranches de 10 000 KI : de ${ki(min)} à ${ki(max)}</label>
    <div class="mx-bidin"><input id="mxBid" type="text" inputmode="numeric" value="${grp(d)}" autocomplete="off" aria-label="Ta mise en KI"><span>KI</span></div>
    ${opt.noquick ? '' : `<div class="mx-quick"><button data-add="${K}">+10 000</button><button data-add="${5 * K}">+50 000</button><button data-add="${10 * K}">+100 000</button><button data-set="${min}">Min</button><button data-set="${max}">Max</button></div>`}
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
      const leadMe = ph.lead === me, feed = (ph.hist || []).map(([w, v], n) => `<li class="${w === me ? 'me' : ''} ${n ? '' : 'top'}"><b>${w === me ? 'Toi' : esc(P[w].name)}</b><span>${ki(v)}</span></li>`).join('');
      const top = head('Enchère chrono', leadMe ? 'Tu es en tête : si personne ne surenchérit avant la fin du chrono, la carte est à toi.' : `${esc(P[ph.lead].name)} est en tête. Surenchéris avant la fin du chrono, jusqu'à la dernière seconde, ou passe.`)
        + `<div class="mx-amtw"><div class="mx-amt ${leadMe ? 'lead' : 'behind'}" data-v="${ph.high}">${grp(ph.high)} <small>KI</small></div><span class="mx-leader ${leadMe ? 'me' : ''}">${leadMe ? 'Tu mènes' : esc(P[ph.lead].name) + ' mène'}</span></div>`
        + bigCard(G, ph.c) + `<ol class="mx-feed" aria-label="Dernières mises">${feed}</ol>`;
      if (leadMe) return top + wait(`${esc(P[o].name)} peut encore surenchérir…`);
      if (!canUse(G, me, ph.c)) return top + '<p class="mute">Tu ne peux pas recruter cette carte.</p>';
      const mn = ph.high + K, mx = maxBid(G, me);
      if (mx < mn) return top + `<p>Tu ne peux pas monter plus haut.</p><button class="btn primary" id="mxPass">Passer</button>`;
      const quick = [[K, '+10 000'], [5 * K, '+50 000'], [10 * K, '+100 000']].filter(([d]) => ph.high + d <= mx);
      return top + `<div class="mx-snipe">${quick.map(([d, l]) => `<button class="mx-sbtn" data-bid="${ph.high + d}"><b>${l}</b><small>${ki(ph.high + d)}</small></button>`).join('')}</div>`
        + bidBox(G, mn, mx, 'Miser ce montant', { pass: 'Je passe', noquick: true });
    }
    case 'sealed': {
      const top = head('Enchère sous enveloppe', `Chacun mise en secret et valide son enveloppe. Sans validation à la fin du chrono, c'est la mise minimale (10 000 KI). La plus haute mise l'emporte ; à égalité, ${ph.nom === me ? 'toi (tu l\'as mise en vente)' : esc(P[ph.nom].name) + ' (il l\'a mise en vente)'}.`) + bigCard(G, ph.c);
      if (ph.has[me]) return top + (X.myBid[G.pid] != null ? `<p>Ta mise : <b>${ki(X.myBid[G.pid])}</b></p>` : '<p>Ta mise est envoyée.</p>') + (ph.has[o] ? '' : wait(`${esc(P[o].name)} prépare sa mise…`));
      if (!canUse(G, me, ph.c)) return top + '<p class="mute">Tu ne peux pas recruter cette carte.</p>';
      const isNom = ph.nom === me, mx = maxBid(G, me);
      return top + (ph.has[o] ? `<p class="small mx-ready">${esc(P[o].name)} a validé son enveloppe.</p>` : '') + (isNom ? bidBox(G, minBid(G, me), mx, 'Valider mon enveloppe', { secret: true })
        : mx >= K ? bidBox(G, K, mx, 'Valider mon enveloppe', { secret: true, pass: 'Ne pas miser' }) : '<button class="btn" id="mxPass">Ne pas miser</button>');
    }
    case 'pick':
      if (ph.who !== me) return head(`${esc(P[o].name)} complète son équipe`, 'Ton équipe est complète : il choisit gratuitement parmi les cartes restantes.') + wait('En attente…');
      return head('Complète ton équipe gratuitement', `${esc(P[o].name)} a toutes ses cartes : touche une carte du marché compatible avec tes rôles.`);
    case 'done': {
      const w = ph.w === me ? 'Tu recrutes' : `${esc(P[ph.w].name)} recrute`;
      const stamp = `<span class="mx-stamp"><b>Adjugé</b><small>${ph.w === me ? 'à toi' : 'à ' + esc(P[ph.w].name)}</small></span>`;
      if (ph.sealed && ph.bids) {   // ouverture des deux enveloppes, puis le tampon
        const env = i => `<div class="mx-env3d ${ph.w === i ? 'win' : 'lose'}" style="--d:${.45 + i * .5}s"><div class="mx-envin"><div class="mx-envf">${SEAL}<b>${i === me ? 'Toi' : esc(P[i].name)}</b></div><div class="mx-envb"><b>${i === me ? 'Toi' : esc(P[i].name)}</b><span>${ki(ph.bids[i])}</span>${ph.w === i ? '<i>Remporte la carte</i>' : ''}</div></div></div>`;
        return head('Ouverture des enveloppes', '') + `<div class="mx-reveal">${env(0)}<span class="mx-vs2">contre</span>${env(1)}</div><div class="mx-late"><p class="mx-verdict">${w} ${esc(c.n)} pour ${ki(ph.price)}.</p>${bigCard(G, ph.c, { stamp })}</div>`;
      }
      const other_ = esc(P[other(ph.w)].name), why = { pass: `${ph.w === me ? other_ + ' a passé' : 'Tu as passé'} : adjugé sans attendre la fin du chrono.`, clock: 'Fin du chrono.', role: `${ph.w === me ? other_ + ' ne peut pas la recruter (rôle déjà complet)' : 'Tu ne peux pas la recruter (rôle déjà complet)'} : adjugé tout de suite.`, full: `${ph.w === me ? other_ + ' a déjà toute son équipe' : 'Ton équipe est déjà complète'} : adjugé tout de suite.`, money: `${ph.w === me ? other_ + ' n\'a plus assez de KI' : 'Tu n\'as plus assez de KI'} pour surenchérir : adjugé tout de suite.` }[ph.why];
      return head(`${w} ${esc(c.n)}`, (ph.free ? 'Gratuitement.' : `Pour ${ki(ph.price)}.`) + (why ? ' ' + why : '')) + (ph.bids ? `<p class="small mx-bids">Mises secrètes : ${esc(P[0].name)} ${ki(ph.bids[0])}, ${esc(P[1].name)} ${ki(ph.bids[1])}</p>` : '') + bigCard(G, ph.c, { stamp });
    }
    case 'compose':
      return head('Prépare tes deux trios', 'En secret : ton adversaire ne voit rien avant que les deux soient prêts. Dès que vous l\'êtes tous les deux, le combat commence.') + (ph.ready[o] && !ph.ready[me] ? `<p class="small mx-ready">${esc(P[o].name)} a ses trios prêts.</p>` : '') + (ph.ready[me] ? wait(ph.ready[o] ? 'Révélation…' : `Tes trios sont prêts. ${esc(P[o].name)} prépare les siens…`) : '');
    case 'fight': { const f = G.fights[G.fights.length - 1]; return head(f.n === 3 ? 'Combat de mort subite' : `Combat ${f.n} sur 2`, 'Joue tes coups dans l\'écran de combat. 45 s par coup : sinon une attaque simple est jouée pour toi (3 fois de suite = forfait).') + '<div id="mxMoveT" class="mx-movet"></div>'; }
    case 'fres': return head(ph.w === 'draw' ? 'Égalité : le combat est rejoué' : ph.w === me ? `Tu gagnes le combat ${ph.n === 3 ? 'de mort subite' : ph.n} !` : `${esc(P[ph.w].name)} gagne le combat ${ph.n === 3 ? 'de mort subite' : ph.n}`, `Score : ${G.score[0]} - ${G.score[1]}.`);
    case 'over': { const w = G.over.w; return `<div class="mx-acth"><h2>${w === me ? '🏆 Victoire !' : 'Défaite'}</h2></div><p>${w === me ? 'Tu remportes' : esc(P[w].name) + ' remporte'} le Mercato ${G.score[w]} - ${G.score[other(w)]}${G.over.why === 'ff' ? ' par forfait' : G.over.why === 'away' ? ' (adversaire absent)' : ''}.</p>`; }
  }
  return '';
}
function composeHTML(G) {
  const me = X.me, own = G.players[me].own;
  if (G.ph.ready?.[me]) return teamsHTML(G);
  if (!X.compSel || X.compSel.pid !== G.pid) { const sp = autoSplit(G, own); X.compSel = { pid: G.pid, t: Object.fromEntries(own.map(k => [k, sp[0].includes(k) ? 0 : 1])), pick: null }; }
  const S2 = X.compSel, T = [0, 1].map(t => own.filter(k => S2.t[k] === t)), ok = T.map(t => trioOk(G, t));
  const pickT = S2.pick ? S2.t[S2.pick] : null;
  const dupOf = t => { const n = {}; T[t].forEach(k => { const r = G.cards[k].role; n[r] = (n[r] || 0) + 1; }); return r => n[r] > 1; };
  const cardBtn = (k, t, dup) => { const c = G.cards[k], cls = ['mx-mini', S2.pick === k ? 'picked' : '', pickT != null && pickT !== t ? 'target' : '', dup(c.role) ? 'dup' : ''].join(' ');
    return `<button class="${cls}" data-mv="${esc(k)}" aria-pressed="${S2.pick === k}" aria-label="${esc(c.n)}">${face(c, { mini: true })}${roleTag(c)}${statsHTML(c)}</button>`; };
  const help = S2.pick ? `${esc(G.cards[S2.pick].n)} est sélectionné : touche une carte de l'autre trio pour les échanger.` : 'Touche une carte, puis une carte de l\'autre trio : elles changent de place.' + (matchMedia('(pointer: fine)').matches ? ' Tu peux aussi les glisser.' : '');
  return `<p class="mx-comphelp">${help}</p><div class="mx-comp">${[0, 1].map(t => { const dup = dupOf(t); return `<div class="card mx-trio ${ok[t] ? 'mx-ok' : 'mx-bad'}" data-trio="${t}"><div class="mx-trioh"><h3>Trio ${t + 1}</h3><span class="small mute">joue le combat ${t + 1}</span></div>
    <div class="mx-trioc">${T[t].map(k => cardBtn(k, t, dup)).join('')}</div>
    <p class="small mx-triost">${ok[t] ? 'Trois rôles différents : prêt.' : 'Deux cartes du même rôle (en rouge) : échange l\'une avec l\'autre trio.'}</p></div>`; }).join('')}</div>
    <div class="row"><button class="btn ghost" id="mxSwapT">Inverser l'ordre des combats</button><button class="btn primary" id="mxComp" ${ok[0] && ok[1] ? '' : 'disabled'}>Mes trios sont prêts</button></div>`;
}
function teamsHTML(G) {
  return `<div class="mx-teams">${[X.me, other(X.me)].map(i => { const p = G.players[i]; return `<div class="card"><h3>${esc(p.name)}</h3><div class="mx-trioc">${p.own.map(k => { const c = G.cards[k], m = G.market.find(x => x.k === k); return `<div class="mx-mini">${face(c, { mini: true })}${roleTag(c)}<span class="small mute">${m?.price ? ki(m.price) : 'gratuit'}</span></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
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
    <div class="row">${X.arena ? `<a class="btn primary" href="${X.back}">Retour au match</a>` : '<a class="btn primary" href="#jeux/mercato">Nouvelle partie</a>'}</div>`;
}
// Échange de deux cartes entre les trios : toucher l'une puis l'autre, ou glisser à la souris.
function swapCards(a, b) { const S2 = X.compSel; if (!a || !b || a === b || S2.t[a] === S2.t[b]) return false; [S2.t[a], S2.t[b]] = [S2.t[b], S2.t[a]]; S2.pick = null; sfx('swap'); S2.flash = [a, b]; render(); return true; }
function wireCompose(R) {
  const S2 = X.compSel; if (!S2) return;
  (S2.flash || []).forEach(k => R.querySelector(`[data-mv="${CSS.escape(k)}"]`)?.classList.add('swapped')); S2.flash = null;
  R.querySelectorAll('[data-mv]').forEach(b => {
    const k = b.dataset.mv;
    b.onclick = () => { if (b.dataset.dragged) { delete b.dataset.dragged; return; } if (!S2.pick || S2.pick === k) { S2.pick = S2.pick === k ? null : k; if (S2.pick) sfx('select'); } else if (S2.t[S2.pick] === S2.t[k]) S2.pick = k; else return swapCards(S2.pick, k); render(); };
    // glisser-déposer à la souris (sur téléphone, on touche les deux cartes)
    b.onpointerdown = e => {
      if (e.pointerType !== 'mouse' || e.button) return;
      const x0 = e.clientX, y0 = e.clientY; let ghost = null;
      const mv = ev => { if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
        if (!ghost) { ghost = b.cloneNode(true); ghost.className += ' mx-ghost'; ghost.style.width = b.offsetWidth + 'px'; document.body.appendChild(ghost); b.classList.add('lifting'); S2.pick = k; R.querySelectorAll('[data-mv]').forEach(o => o.classList.toggle('target', S2.t[o.dataset.mv] !== S2.t[k])); }
        ghost.style.transform = `translate(${ev.clientX - b.offsetWidth / 2}px,${ev.clientY - 40}px) rotate(-6deg)`;
        R.querySelectorAll('.mx-mini.over').forEach(o => o.classList.remove('over'));
        const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-mv]'); if (under && S2.t[under.dataset.mv] !== S2.t[k]) under.classList.add('over'); };
      const up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (!ghost) return; ghost.remove(); b.classList.remove('lifting'); b.dataset.dragged = 1;
        const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-mv]');
        if (!(under && swapCards(k, under.dataset.mv))) { S2.pick = null; render(); } };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    };
  });
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
  $('#mxSnd') && ($('#mxSnd').onclick = () => { SFX.on = !SFX.on; try { localStorage.setItem('mx_sfx', SFX.on ? '1' : '0'); } catch (e) { /* rien */ } if (SFX.on) sfx('select'); render(); });
  R.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { X.filter = b.dataset.filter; render(); });
  R.querySelectorAll('.mx-web .mx-card').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (ph.k === 'nominate' && ph.who === me && canUse(G, me, k)) { X.sel = k; X.draft = null; sfx('select'); render(); X.root.querySelector('#mxAct')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
  R.querySelectorAll('[data-bid]').forEach(b => b.onclick = () => { act('bid', +b.dataset.bid); b.classList.add('sent'); });
  $('#mxPass') && ($('#mxPass').onclick = () => { if (ph.k === 'nominate') { X.sel = null; render(); } else if (ph.k === 'open') act('pass'); else if (ph.k === 'sealed') act('seal', 0); });
  wireCompose(R);
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
    if (D.s === me && !X.spec) { F.ai[me] = false; setTimeout(() => { try { W.renderInfinity(); } catch (e) { /* rien */ } }, 0); return; }
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
    if (h.side === me && !F.moves[k] && !X.spec) {
      F.moves[k] = h.mv; F.dl = 0; if (!F.auto) F.miss = 0; F.auto = false;
      X.net.send('mv', { f: F.id, k, mv: h.mv, sig: s });
      storeMove(F.id, k, h.mv);
    } else if (F.sigs[k] && F.sigs[k] !== s) console.warn('[mercato] écart de calcul au coup', k);
  }
  if (D.winner != null) {
    if (!F.done) { F.done = true; F.dl = 0; if (X.host) setTimeout(() => { if (X?.G && X.F === F) { fightEnd(X.G, D.winner === 'draw' ? 'draw' : D.winner); commit(); } }, 2800); }
  } else if (D.s === me && !F.ai[me] && !X.spec && H.length - 1 === info.idx) {
    if (F.tk !== H.length) { F.tk = H.length; F.dl = Date.now() + TIME.move * 1000; }
  }
  if (me === 1 || X.spec) patchLabels();
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
  const D = W.BFDuel.info().D, mine = !X.spec && D && D.winner == null && D.s === X.me && !F.ai[X.me];
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
  const map = X.spec ? [['À TOI DE JOUER', 'AU TOUR DE ' + A], ['TON ACTION', 'ACTION DE ' + A], ['Tu passes à l’action', a + ' passe à l’action']]
    : [['À TOI DE JOUER', 'AU TOUR DE ' + A], ['AU TOUR DE ' + B, 'À TOI DE JOUER'], ['TON ACTION', 'ACTION DE ' + A], ['ACTION DE ' + B, 'TON ACTION'], ['Tu passes à l’action', a + ' passe à l’action'], [b + ' passe à l’action', 'Tu passes à l’action']];
  const root = W.document.getElementById('bfStage'); if (!root) return;
  const tw = W.document.createTreeWalker(root, 4); let n;
  while ((n = tw.nextNode())) { const t = n.nodeValue.trim(); if (!t || n.parentElement?.closest('.story-fighter')) continue; const hit = map.find(([x]) => x === t); if (hit) n.nodeValue = n.nodeValue.replace(hit[0], hit[1]); }
}

// Mini-jeu « Mercato YURO » (Brigade Fantôme) : enchères en ligne à 2 joueurs sur les cartes YURO,
// puis deux combats PvP en 3 contre 3 avec le moteur du simulateur (BFDuel), et une mort subite si 1-1.
// Le créateur de la partie (l'hôte) fait tourner les enchères ; l'invité envoie ses actions.
// Les combats tournent sur les deux appareils avec les mêmes coups et le même tirage au sort (moteur « graine »).

const K = 10000;                 // une tranche de mise : 10 000 KI
const BUDGET = 1000000;          // budget de départ
const MAIN = { n: 6, per: 2 };   // mercato principal : 6 cartes, 2 au plus par rôle
const SD = { n: 3, per: 1 };     // mort subite : 3 cartes de 3 rôles différents
const TIME = { draft: 20, nominate: 40, open: 30, sealed: 30, reveal: 7, unseal: 12, recap: 30, order: 60, pick: 40, compose: 150, done: 4, fres: 25, move: 45, away: 60 };
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
function setPh(G, ph, secs) { G.ph = ph; G.pid++; G.dl = secs ? Date.now() + secs * 1000 : 0; if (X) X.hid = { bids: [null, null], comp: [null, null], proof: [null, null] }; }
function openSeal(G) { const ph = G.ph; ph.reveal = true; ph.rv = [false, false]; ph.rt = (ph.rt || 0) + 1; G.dl = Date.now() + TIME.unseal * 1000; }
function closeSeal(G) { const ph = G.ph, H = X.hid, o = other(ph.nom), w = H.bids[o] > H.bids[ph.nom] ? o : ph.nom; award(G, w, H.bids[w], { sealed: true, bids: H.bids.slice(), com: ph.com.slice(), proof: H.proof.slice(), spid: G.pid }); }

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
    G.stage = 'compose'; setPh(G, { k: 'compose', ready: [false, false], com: [null, null] }, TIME.compose);
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
  f.w = w; if (X?.sum?.[G.fights.length]) f.sum = X.sum[G.fights.length];
  if (w === 'draw') { addLog(G, `Combat ${f.n} : égalité, il est rejoué.`); setPh(G, { k: 'fres', w, n: f.n }, TIME.fres); return; }
  G.score[w]++;
  addLog(G, `${G.players[w].name} gagne le combat ${f.n === 3 ? 'de mort subite' : f.n} (${G.score[0]}-${G.score[1]}).`);
  setPh(G, { k: 'fres', w, n: f.n }, TIME.fres);
}
function afterFight(G) {
  const f = G.fights[G.fights.length - 1];
  if (f.w === 'draw') return startFight(G, f.n, f.A, f.B, other(f.starter));
  if (G.single) return finish(G, f.w, 'score');   // combat unique d'un Mercato à plusieurs
  if (G.score[0] === 2 || G.score[1] === 2 || f.n === 3) return finish(G, G.score[0] > G.score[1] ? 0 : 1, 'score');
  if (f.n === 1) return startFight(G, 2, G.comp[0][1], G.comp[1][1]);
  // 1-1 : mort subite, avec 8 nouvelles cartes et l'argent restant.
  const ex = G.market.map(m => nkey(G.cards[m.k].n));
  G.stage = 'sd';
  G.sdm = drawMarket(X.pool, G.roles, DIST8, 0, ex).map(({ c, env }) => { G.cards[c.k] = c; return { k: c.k, env, by: null, price: 0 }; });
  // Mort subite en draft : le joueur qui a gardé le plus d'argent choisit en premier, puis chacun son tour (cartes gratuites).
  const b = G.players.map(p => p.budget), first = b[0] === b[1] ? other(G.first) : b[0] > b[1] ? 0 : 1;
  G.draftNext = first;
  addLog(G, `1-1 : mort subite en draft ! ${G.players[first].name} a gardé le plus de KI (${ki(b[first])} contre ${ki(b[other(first)])}) et choisit en premier.`);
  draftTurn(G);
}
function draftTurn(G) {
  if (slots(G, 0) === 0 && slots(G, 1) === 0) return endStage(G);
  let who = G.draftNext; if (slots(G, who) === 0) who = other(who);
  setPh(G, { k: 'draft', who }, TIME.draft);
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
      if (m.env) { setPh(G, { k: 'sealed', c: a.k, nom: who, has: [false, false], com: [null, null] }, TIME.sealed); addLog(G, `${P[who].name} met ${G.cards[a.k].n} en vente : sous enveloppe !`); return true; }
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
    // Enveloppe inviolable : chacun envoie d'abord l'empreinte chiffrée de sa mise (engagement), puis la mise elle-même
    // une fois que les deux ont validé. Personne, même l'appareil qui arbitre, ne peut lire une mise avant d'avoir validé la sienne.
    case 'sealed': {
      if (a.t === 'commit') { if (ph.has[who] || ph.reveal || typeof a.v !== 'string' || a.v.length !== 64) return false; ph.com[who] = a.v; ph.has[who] = true; if (ph.has[0] && ph.has[1]) openSeal(G); return true; }
      if (a.t === 'revealed') {
        if (!ph.reveal || ph.rv[who]) return false;
        const v = a.v, isNom = who === ph.nom, ok = isNom ? inR(v, minBid(G, who), maxBid(G, who)) : (v === 0 || inR(v, K, maxBid(G, who)));
        H.bids[who] = ok ? v : (canUse(G, who, ph.c) ? minBid(G, who) : 0); H.proof[who] = a.proof || null; ph.rv[who] = true;
        if (ph.rv[0] && ph.rv[1]) closeSeal(G);
        return true;
      }
      return false;
    }
    case 'pick': if (who !== ph.who || a.t !== 'pick' || !canUse(G, who, a.k)) return false; ph.c = a.k; award(G, who, 0, { free: true }); return true;
    case 'draft': {
      if (who !== ph.who || a.t !== 'pick' || !canUse(G, who, a.k)) return false;
      const m = item(G, a.k); owned(G, who).push(a.k); m.by = who; m.price = 0;
      addLog(G, `${P[who].name} choisit ${G.cards[a.k].n}.`); G.lastDraft = { k: a.k, w: who };
      G.draftNext = other(who); draftTurn(G); return true;
    }
    case 'compose': {
      if (a.t === 'commit') { if (ph.ready[who] || ph.reveal || typeof a.v !== 'string' || a.v.length !== 64) return false; ph.com[who] = a.v; ph.ready[who] = true; if (ph.ready[0] && ph.ready[1]) { ph.reveal = true; ph.rv = [false, false]; ph.rt = (ph.rt || 0) + 1; G.dl = Date.now() + TIME.unseal * 1000; } return true; }
      if (a.t === 'revealed') {
        if (!ph.reveal || ph.rv[who]) return false;
        const t = a.v, all = Array.isArray(t) && t.length === 2 ? [...t[0], ...t[1]] : [];
        const ok = all.length === 6 && new Set(all).size === 6 && all.every(k => P[who].own.includes(k)) && trioOk(G, t[0]) && trioOk(G, t[1]);
        H.comp[who] = ok ? t : autoSplit(G, P[who].own); H.proof[who] = a.proof || null; ph.rv[who] = true;
        if (ph.rv[0] && ph.rv[1]) { G.comp = H.comp.slice(); G.compProof = { com: ph.com.slice(), proof: H.proof.slice() }; addLog(G, 'Trios révélés !'); startFight(G, 1, G.comp[0][0], G.comp[1][0]); }
        return true;
      }
      return false;
    }
    // après un combat : les deux joueurs peuvent passer au suivant sans attendre
    case 'fres': { if (a.t !== 'next' || ph.ok?.[who]) return false; ph.ok = ph.ok || [false, false]; ph.ok[who] = true; if (ph.ok[0] && ph.ok[1]) afterFight(G); return true; }
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
    case 'sealed': {
      const def = i => canUse(G, i, ph.c) ? minBid(G, i) : 0;
      if (!ph.reveal) { for (const i of [0, 1]) if (!ph.has[i]) { ph.has[i] = true; ph.com[i] = 'defaut'; } openSeal(G); for (const i of [0, 1]) if (ph.com[i] === 'defaut') { H.bids[i] = def(i); ph.rv[i] = true; } if (ph.rv[0] && ph.rv[1]) closeSeal(G); return true; }
      for (const i of [0, 1]) if (!ph.rv[i]) { H.bids[i] = def(i); ph.rv[i] = true; addLog(G, `${G.players[i].name} n'a pas ouvert son enveloppe : mise minimale.`); }
      return closeSeal(G);
    }
    case 'pick': { const L = usable(G, ph.who); if (L[0]) apply(G, ph.who, { t: 'pick', k: L[Math.floor(Math.random() * L.length)], pid: G.pid }); return true; }
    case 'draft': { const L = usable(G, ph.who); if (L[0]) { addLog(G, `${G.players[ph.who].name} n'a pas choisi à temps : carte tirée au hasard.`); apply(G, ph.who, { t: 'pick', k: L[Math.floor(Math.random() * L.length)], pid: G.pid }); } return true; }
    case 'done': return nextTurn(G);
    case 'compose': {
      ph.rv = ph.rv || [false, false];
      for (const i of [0, 1]) if (!(ph.reveal ? ph.rv[i] : ph.ready[i])) { addLog(G, `${G.players[i].name} n'a pas validé à temps : trios faits automatiquement.`); H.comp[i] = autoSplit(G, G.players[i].own); ph.ready[i] = true; ph.rv[i] = true; }
      if (!ph.reveal) { ph.reveal = true; ph.rt = (ph.rt || 0) + 1; G.dl = Date.now() + TIME.unseal * 1000; if (!(ph.rv[0] && ph.rv[1])) return true; }
      G.comp = H.comp.slice(); addLog(G, 'Trios révélés !'); return startFight(G, 1, G.comp[0][0], G.comp[1][0]);
    }
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
    mine: () => T().select('code,host,guest,host_name,guest_name,status,updated_at,winner,mode,score:state->score').or(`host.eq.${uid},guest.eq.${uid}`).order('updated_at', { ascending: false }).limit(30),
    live: () => T().select('code,host,guest,host_name,guest_name,updated_at').eq('status', 'playing').order('updated_at', { ascending: false }).limit(12),
    over: () => T().select('host,guest,host_name,guest_name,winner,updated_at').eq('status', 'over').not('winner', 'is', null).order('updated_at', { ascending: false }).limit(2000),
    del: code => T().delete().eq('code', code),
    createMulti: (code, mode, max, name) => T().insert({ code, mode, max_players: max, players: [uid], names: { [uid]: name }, host_name: name, status: 'lobby' }).select().single(),
    joinMulti: (code, name) => sb.rpc('mercato_join', { p_code: code, p_name: name }),
    leaveMulti: code => sb.rpc('mercato_leave', { p_code: code }),
    createFight: row => T().insert(row).select().single(),
    fights: codes => T().select('code,host,guest,status,winner,f:state->fights').in('code', codes),
    liveMulti: () => T().select('code,mode,max_players,names,status,updated_at').neq('mode', 'duel').in('status', ['lobby', 'playing']).order('updated_at', { ascending: false }).limit(12)
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
  cleanup(); multiCleanup();
  ensureCss(ctx); LBL = ctx.ROLE || LBL;
  const parts = String(arg || '').split('/').filter(Boolean);
  if (parts[0] !== 'mercato') return hub(m);
  if (parts[1] === 'classement') return ranking(m, ctx);
  if (parts[1] === 'salon' && /^[A-Z]{5}$/.test((parts[2] || '').toUpperCase())) return multiGame(m, ctx, parts[2].toUpperCase());
  const code = (parts[1] || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return lobby(m, ctx);
  return game(m, ctx, code);
}
/* Match de tournoi (arène de la Brigade) : la partie est créée par le serveur pour les deux joueurs du match.
   ctx.arena = { back: lien de retour, keep: début du lien de la salle, onOver: fonction appelée à la fin }.
   Les autres membres regardent en spectateur, avec 5 s de différé. À garder dans les prochaines versions du jeu. */
export async function arenaGame(m, code, ctx) { cleanup(); multiCleanup(); ensureCss(ctx); LBL = ctx.ROLE || LBL; return game(m, ctx, code); }
export function arenaStop() { cleanup(); }
function ensureCss(ctx) { if (document.getElementById('mxCss')) return; const l = document.createElement('link'); l.id = 'mxCss'; l.rel = 'stylesheet'; l.href = 'jeux/mercato.css?v=' + (ctx.APP_V || ''); document.head.appendChild(l); }
function cleanup() {
  if (!X) return;
  try { X.net?.close(); } catch (e) { /* rien */ }
  (X.timers || []).forEach(t => clearInterval(t));
  try { X.W?.BFDuel?.stop(); } catch (e) { /* rien */ }
  window.removeEventListener('hashchange', X.onHash);
  document.getElementById('mxEmo')?.remove(); document.getElementById('mxSpecFx')?.remove();
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
  <li><b>1-1 : mort subite en draft</b>. 8 nouvelles cartes : le joueur qui a gardé le plus de KI choisit en premier, puis chacun son tour, gratuitement, jusqu'à avoir un trio de 3 rôles différents pour le dernier combat. L'argent mis de côté donne le premier choix !</li>
</ul>`;

async function lobby(m, ctx) {
  const { sb, S } = ctx, uid = S.user.id, name = S.profile?.discord || 'Membre';
  X = { timers: [], myName: name }; const db = ctx.db || supaDB(sb, uid);
  m.innerHTML = `<p><a class="btn ghost" href="#jeux" style="min-height:36px">← Mini-jeux</a></p><h1>Mercato YURO</h1>
  <div class="mx-lobby"><div class="card"><h2>Créer une partie</h2><p class="small mute">Tu reçois un code à envoyer à ton ami.</p><button class="btn primary" id="mxNew">Créer la partie</button></div>
  <div class="card"><h2>Rejoindre une partie</h2><p class="small mute">Entre le code reçu (4 lettres pour un duel, 5 pour un salon à plusieurs).</p><div class="row"><input id="mxCode" maxlength="5" placeholder="CODE" autocomplete="off" style="text-transform:uppercase;max-width:140px"><button class="btn primary" id="mxJoin">Rejoindre</button></div></div></div>
  <div class="card section mx-multic"><h2>À plusieurs</h2><p class="small mute">Un seul marché pour tout le salon, chaque joueur achète un trio. Les combats sont des duels joués en même temps.</p>
    <div class="mx-lobby"><div><h3>Mercato royale</h3><p class="small mute">Chacun pour soi. 4 joueurs : demi-finales et finale. 6 : deux poules de 3 puis finale. 8 : quarts, demies, finale.</p><div class="row"><select id="mxRoyN" style="width:auto"><option value="4">4 joueurs</option><option value="6">6 joueurs</option><option value="8">8 joueurs</option></select><button class="btn primary" id="mxRoy">Créer le salon</button></div></div>
    <div><h3>Équipes</h3><p class="small mute">Deux équipes, un chef par équipe. On ne surenchérit pas contre un coéquipier, puis chaque chef range ses joueurs en secret.</p><div class="row"><select id="mxEqN" style="width:auto"><option value="4">2 contre 2</option><option value="6">3 contre 3</option></select><button class="btn primary" id="mxEq">Créer le salon</button></div></div></div></div>
  <p class="red small" id="mxErr"></p><div id="mxStats"></div><div id="mxSalons"></div><div id="mxLive"></div><div id="mxMine"></div>
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
  const join = () => { const c = m.querySelector('#mxCode').value.trim().toUpperCase(); if (/^[A-Z]{5}$/.test(c)) { location.hash = '#jeux/mercato/salon/' + c; return; } if (!/^[A-Z]{4}$/.test(c)) return err('Le code fait 4 lettres (duel) ou 5 lettres (salon à plusieurs).'); location.hash = '#jeux/mercato/' + c; };
  m.querySelector('#mxRoy').onclick = async () => { const e = await createMulti(ctx, 'royale', +m.querySelector('#mxRoyN').value); if (e) err(e); };
  m.querySelector('#mxEq').onclick = async () => { const e = await createMulti(ctx, 'equipes', +m.querySelector('#mxEqN').value); if (e) err(e); };
  m.querySelector('#mxJoin').onclick = join; m.querySelector('#mxCode').onkeydown = e => { if (e.key === 'Enter') join(); };
  const [{ data }, { data: live }, { data: salons }] = await Promise.all([db.mine(), db.live ? db.live() : { data: [] }, db.liveMulti ? db.liveMulti() : { data: [] }]);
  const SL = (salons || []).filter(r => r.status === 'lobby' && Date.now() - new Date(r.updated_at) < 3 * 3600e3);
  if (SL.length) m.querySelector('#mxSalons').innerHTML = `<div class="card section"><h2>Salons ouverts</h2>${SL.map(r => `<a class="mx-row" href="#jeux/mercato/salon/${esc(r.code)}"><b>${esc(r.code)}</b><span>${r.mode === 'royale' ? 'Mercato royale' : 'Équipes ' + (r.max_players / 2) + ' contre ' + (r.max_players / 2)} · ${Object.keys(r.names || {}).length}/${r.max_players} joueurs</span><span class="chip">Rejoindre</span></a>`).join('')}</div>`;
  const L = (data || []).filter(r => !r.mode || r.mode === 'duel'), rec = recordOf(L, uid);
  m.querySelector('#mxStats').innerHTML = `<div class="card section mx-statc"><div><h2>Mes résultats</h2><p class="small mute">Sur tes parties terminées.</p></div>${recordHTML(rec)}<a class="btn ghost" href="#jeux/mercato/classement">Classement</a></div>`;
  const W = (live || []).filter(r => r.host !== uid && r.guest !== uid && r.guest && Date.now() - new Date(r.updated_at) < 2 * 3600e3);   // parties actives depuis moins de 2 h
  if (W.length) m.querySelector('#mxLive').innerHTML = `<div class="card section"><h2>Parties en cours</h2><p class="small mute">Regarde en direct et réagis.</p>${W.map(r => `<a class="mx-row" href="#jeux/mercato/${esc(r.code)}"><b>${esc(r.code)}</b><span>${esc(r.host_name)} contre ${esc(r.guest_name)}</span><span class="chip">Regarder</span></a>`).join('')}</div>`;
  if (L.length) m.querySelector('#mxMine').innerHTML = `<div class="card section"><h2>Mes parties</h2>${L.slice(0, 15).map(r => { const opp = r.host === uid ? r.guest_name : r.host_name, me0 = r.host === uid, sc = Array.isArray(r.score) ? (me0 ? r.score : [r.score[1], r.score[0]]) : null;
    const res = r.status !== 'over' ? (r.status === 'lobby' ? 'Salon' : 'En cours') : r.winner === uid ? `Victoire${sc ? ' ' + sc[0] + '-' + sc[1] : ''}` : `Défaite${sc ? ' ' + sc[0] + '-' + sc[1] : ''}`;
    return `<a class="mx-row" href="#jeux/mercato/${esc(r.code)}"><b>${esc(r.code)}</b><span>${opp ? 'contre ' + esc(opp) : 'en attente d\'un adversaire'}</span><span class="chip ${r.status === 'over' ? (r.winner === uid ? 'mx-w' : 'mx-l') : ''}">${res}</span></a>`; }).join('')}</div>`;
}

/* ===================== Résultats et classement ===================== */
function recordOf(rows, uid) { const r = { w: 0, l: 0 }; for (const g of rows || []) { if (g.status && g.status !== 'over') continue; if (!g.winner || (g.host !== uid && g.guest !== uid)) continue; if (g.winner === uid) r.w++; else r.l++; } r.n = r.w + r.l; r.ratio = r.l ? r.w / r.l : r.w; r.pct = r.n ? Math.round(r.w / r.n * 100) : 0; return r; }
const ratioTxt = r => r.n ? (r.l ? (r.w / r.l).toFixed(2).replace('.', ',') : r.w + ',00') : '—';
function recordHTML(r) { return `<div class="mx-rec"><span><b>${r.w}</b>victoires</span><span><b>${r.l}</b>défaites</span><span><b>${ratioTxt(r)}</b>ratio V/D</span><span><b>${r.n ? r.pct + ' %' : '—'}</b>de victoires</span></div>`; }
async function ranking(m, ctx) {
  const { sb, S } = ctx, uid = S.user.id; X = { timers: [] }; const db = ctx.db || supaDB(sb, uid);
  m.innerHTML = `<p><a class="btn ghost" href="#jeux/mercato" style="min-height:36px">← Mercato</a></p><h1>Classement du Mercato</h1><p class="mute">Toutes les parties terminées entre membres. Classé par nombre de victoires, puis par ratio victoires / défaites.</p><div class="card section" id="mxRank"><p class="mute">Chargement…</p></div>`;
  const { data } = await (db.over ? db.over() : { data: [] }); const P = new Map();
  for (const g of data || []) for (const [id, nm] of [[g.host, g.host_name], [g.guest, g.guest_name]]) { if (!id) continue; const p = P.get(id) || { id, name: nm, w: 0, l: 0 }; if (!p.name && nm) p.name = nm; if (g.winner === id) p.w++; else p.l++; P.set(id, p); }
  const L = [...P.values()].map(p => ({ ...p, n: p.w + p.l })).sort((a, b) => b.w - a.w || (b.w / Math.max(1, b.l)) - (a.w / Math.max(1, a.l)) || a.l - b.l);
  m.querySelector('#mxRank').innerHTML = L.length ? `<table class="mx-rank"><thead><tr><th>#</th><th>Membre</th><th>V</th><th>D</th><th>Ratio V/D</th></tr></thead><tbody>${L.map((p, i) => `<tr class="${p.id === uid ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name || 'Membre')}</td><td>${p.w}</td><td>${p.l}</td><td>${ratioTxt(p)}</td></tr>`).join('')}</tbody></table>` : '<p class="mute">Aucune partie terminée pour l\'instant.</p>';
}
// Pour la fiche d'un membre (page Profils) : ses résultats au Mercato. Renvoie du HTML prêt à insérer.
export async function profileHTML(sb, uid, opts = {}) {
  ensureCss({ APP_V: opts.APP_V || '' });
  const { data } = await sb.from('mercato_parties').select('host,guest,winner,status').or(`host.eq.${uid},guest.eq.${uid}`).eq('status', 'over').limit(2000);
  const r = recordOf(data, uid);
  return `<div class="mx-profile"><b>Mercato YURO</b>${r.n ? recordHTML(r) : '<span class="small mute">Aucune partie terminée.</span>'}</div>`;
}
export async function record(sb, uid) { const { data } = await sb.from('mercato_parties').select('host,guest,winner,status').or(`host.eq.${uid},guest.eq.${uid}`).eq('status', 'over').limit(2000); return recordOf(data, uid); }

/* ===================== Secrets inviolables (engagement chiffré) ===================== */
async function sha(str) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const secretKey = (kind, pid) => `mx:${X.code}:${kind}:${pid}`;
const hashOf = (kind, pid, v, salt) => sha(`${X.code}:${pid}:${kind}:${JSON.stringify(v)}:${salt}`);
async function commitSecret(kind, v) {
  const G = X.G, pid = G.pid, salt = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
  try { sessionStorage.setItem(secretKey(kind, pid), JSON.stringify({ v, salt })); } catch (e) { /* rien */ }
  X.secrets[secretKey(kind, pid)] = { v, salt };
  act('commit', await hashOf(kind, pid, v, salt));
}
function mySecret(kind, pid) { const k = secretKey(kind, pid); if (X.secrets[k]) return X.secrets[k]; try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
// Quand les deux ont validé, chaque appareil ouvre automatiquement sa propre enveloppe.
function autoReveal(G) {
  const ph = G.ph, me = X.me; if (me == null || G.over || !(ph.k === 'sealed' || ph.k === 'compose') || !ph.reveal || ph.rv?.[me]) return;
  const kind = ph.k === 'sealed' ? 'seal' : 'comp', key = G.pid + ':' + ph.rt; if (X.revSent === key) return;
  const sec = mySecret(kind, G.pid); if (!sec) return; X.revSent = key;
  act('reveal', sec.v, { proof: { salt: sec.salt }, kind });
}
// L'arbitre vérifie que la mise ouverte correspond bien à l'empreinte envoyée avant.
async function handleAct(who, a) {
  const G = X.G; if (!G) return;
  if (a.t === 'reveal') {
    const ph = G.ph; if (!ph.reveal || ph.rv?.[who]) return;
    const ok = ph.com?.[who] && ph.com[who] === await hashOf(a.kind, G.pid, a.v, a.proof?.salt);
    if (X.G !== G || G.ph !== ph) return;
    if (!ok) addLog(G, `${G.players[who].name} : enveloppe invalide, mise minimale appliquée.`);
    if (apply(G, who, { t: 'revealed', v: ok ? a.v : null, proof: ok ? a.proof : null, pid: G.pid })) commit();
    return;
  }
  if (apply(G, who, a)) commit();
}
// Chaque joueur peut vérifier lui-même les deux enveloppes une fois ouvertes.
async function checkProofs(kind, pid, vals, com, proof) { for (const i of [0, 1]) { if (!com?.[i] || com[i] === 'defaut' || !proof?.[i]) continue; if (com[i] !== await hashOf(kind, pid, vals[i], proof[i].salt)) return false; } return true; }

/* ===================== Réactions rapides ===================== */
const isTxt = e => !/\p{Extended_Pictographic}/u.test(e);
const EMOTES = ['😂', '👏', '😱', '😡', '🔥', '🤑', '💀', '😏', 'GG', 'Bien joué !', 'Merci !', 'Oups…'];
function emoteBar() {
  if (document.getElementById('mxEmo')) return;
  const w = document.createElement('div'); w.id = 'mxEmo'; w.className = 'mx-emo';
  w.innerHTML = `<div class="mx-emop" hidden>${EMOTES.map(e => `<button data-emo="${esc(e)}" class="${isTxt(e) ? 'txt' : ''}">${esc(e)}</button>`).join('')}</div><button class="mx-emob" aria-label="Réagir" aria-expanded="false">😀</button>`;
  document.body.appendChild(w);
  const pan = w.querySelector('.mx-emop'), btn = w.querySelector('.mx-emob');
  btn.onclick = () => { pan.hidden = !pan.hidden; btn.setAttribute('aria-expanded', String(!pan.hidden)); };
  pan.onclick = e => { const b = e.target.closest('[data-emo]'), Z = Y || X; if (!b || !Z?.net) return; if (Date.now() - (Z.lastEmo || 0) < 2000) return; Z.lastEmo = Date.now(); const p = { uid: Z.uid, name: Z.myName, e: b.dataset.emo }; Z.net.send('emote', p); (Y ? mShowEmote : showEmote)(p); pan.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
}
function showEmote(p) {
  if (!X?.root || !EMOTES.includes(p.e)) return;
  const G = X.G, i = G ? G.players.findIndex(q => q.uid === p.uid) : -1, el = document.createElement('div');
  el.className = 'mx-bubble ' + (isTxt(p.e) ? 'txt' : '');
  // la bulle vit dans un calque à part, posé sur le bloc du joueur : elle survit aux mises à jour de l'écran
  if (i >= 0) { const pl = X.root.querySelector(`.mx-pl[data-i="${i}"]`), mx = X.root.querySelector('#mx'); if (!pl || !mx) return; const a = pl.getBoundingClientRect(), b = mx.getBoundingClientRect(); el.textContent = p.e; el.style.left = (a.right - b.left - 10) + 'px'; el.style.top = (a.top - b.top - 14) + 'px'; el.classList.add('pin'); mx.appendChild(el); }
  else { let col = document.getElementById('mxSpecFx'); if (!col) { col = document.createElement('div'); col.id = 'mxSpecFx'; col.className = 'mx-specfx'; document.body.appendChild(col); } el.innerHTML = `<b>${esc(p.name || 'Spectateur')}</b><span>${esc(p.e)}</span>`; col.appendChild(el); }
  sfx('pop'); setTimeout(() => el.remove(), 2600);
}

// Dans un salon à plusieurs : la bulle se pose sur le bloc du joueur (bandeau du mercato ou liste du salon).
function mShowEmote(p) {
  if (!Y?.root || !EMOTES.includes(p.e)) return;
  const mx = Y.root.querySelector('#mx'), pl = Y.G && Y.G.members.some(m => m.uid === p.uid) ? Y.root.querySelector(`[data-uid="${CSS.escape(p.uid)}"]`) : null, el = document.createElement('div');
  el.className = 'mx-bubble ' + (isTxt(p.e) ? 'txt' : '');
  if (pl && mx) { const a = pl.getBoundingClientRect(), b = mx.getBoundingClientRect(); el.textContent = p.e; el.style.left = (a.right - b.left - 10) + 'px'; el.style.top = (a.top - b.top - 14) + 'px'; el.classList.add('pin'); mx.appendChild(el); }
  else { let col = document.getElementById('mxSpecFx'); if (!col) { col = document.createElement('div'); col.id = 'mxSpecFx'; col.className = 'mx-specfx'; document.body.appendChild(col); } el.innerHTML = `<b>${esc(p.name || 'Spectateur')}</b><span>${esc(p.e)}</span>`; col.appendChild(el); }
  sfx('pop'); setTimeout(() => el.remove(), 2600);
}

/* ===================== Partie ===================== */
async function game(m, ctx, code) {
  const { sb, S } = ctx, uid = S.user.id, name = S.profile?.discord || 'Membre';
  const db = ctx.db || supaDB(sb, uid);
  X = { ctx, db, code, uid, myName: name, me: null, role: 'spec', host: false, G: null, hid: { bids: [null, null], comp: [null, null], proof: [null, null] }, timers: [], online: new Set(), away: [0, 0], seen: [Date.now(), Date.now()],
    draft: null, sel: null, secrets: {}, compSel: null, F: null, W: null, frame: null, saveT: 0, off: null, authGone: 0, spec: false, arena: ctx.arena || null, back: ctx.arena?.back || '#jeux/mercato' };
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
  if (!X.arena && row.host !== uid && row.guest !== uid && !row.guest && row.status === 'lobby') {
    const r = await db.join(code, name); if (r.data) row = r.data;
  }
  if (!X) return;
  X.role = row.host === uid ? 'host' : row.guest === uid ? 'guest' : 'spec';   // un membre qui n'est pas joueur regarde la partie
  X.me = X.role === 'host' ? 0 : X.role === 'guest' ? 1 : null; X.spec = X.role === 'spec'; X.row = row; X.hs = Math.random().toString(36).slice(2, 8);
  X.pool = buildPool(ctx); X.roles = Object.keys(ctx.ROLE);
  const net = X.net = (ctx.net || supaNet)(sb, code, uid, X.spec && !!X.arena);   // en tournoi, les spectateurs restent invisibles
  const later = fn => X.spec ? (p => setTimeout(() => { if (X) fn(p); }, 5000)) : fn;   // spectateurs : 5 s de différé
  const idx = u => X.G ? X.G.players.findIndex(p => p.uid === u) : -1;
  net.onPresence(ids => { const now = Date.now(), before = [...X.online].sort().join(); X.online = new Set(ids); const same = before === [...X.online].sort().join(); if (X.G) X.G.players.forEach((p, i) => { if (X.online.has(p.uid)) X.seen[i] = now; }); else if (X.host && ids.length > 1) hostStart(); if (!same) render(); });
  // l'arbitre (le créateur, ou l'invité s'il a repris la main) reçoit les actions des joueurs
  net.on('act', a => { if (!X.host || !X.G) return; const w = idx(a.uid); if (w < 0) return; handleAct(w, a); });
  net.on('hello', () => { if (X.host) { if (X.G) sendState(); else hostStart(); } });
  net.on('state', later(s => {
    if (!s) return;
    if (X.host) {
      if (s.auth === X.uid) return;
      // deux arbitres : le créateur de la partie reprend toujours la main
      if (X.me === 0 && s.auth !== X.uid) { if (!X.G || s.seq >= X.G.seq || s.hs !== X.G.hs) { X.G = s; } resumeAuthority(); commit(); net.send('takeback', { uid: X.uid }); return; }
      if (s.auth === X.G?.players[0]?.uid) { X.host = false; }
      else return;
    }
    if (X.G && s.hs === X.G.hs && s.seq < X.G.seq) return;
    { const d = Date.now() - (s.now || Date.now()); X.off = X.off == null || X.offAt < Date.now() - 60000 ? d : Math.min(X.off, d); X.offAt = X.offAt && X.offAt > Date.now() - 60000 ? X.offAt : Date.now(); }
    X.G = s; X.authGone = 0; if (!X.spec) resendMoves(); render();
  }));
  net.on('takeback', p => { if (X.G && p.uid === X.G.players[0].uid && X.me !== 0) X.host = false; });
  net.on('mv', later(p => onRemoteMove(p)));
  net.on('emote', p => showEmote(p));
  net.on('rematch', p => { if (X.me == null || p.uid === X.uid) return; X.rematch = p; render(); sfx('turn'); });
  await net.start(); if (!X) return;
  if (row.status === 'over' && row.state?.over) X.G = row.state;
  else if (X.me === 0) {
    // le créateur revient : si l'invité a repris la main entre-temps, on récupère son état avant d'arbitrer
    net.send('hello', { uid });
    await new Promise(r => setTimeout(r, 1500)); if (!X) return;
    if (!X.G && row.state?.v) X.G = row.state;
    X.host = true;
    if (X.G && !X.G.over) { resumeAuthority(); commit(); } else if (!X.G && row.guest) hostStart();
  } else {
    if (row.state?.v) X.G = row.state;
    if (!X.spec) net.send('hello', { uid });
  }
  X.timers.push(setInterval(tick, 500));
  // le chrono a son propre rafraîchissement, plus fin, pour que les secondes tombent régulièrement
  X.timers.push(setInterval(() => { if (!X) return; X.root.querySelectorAll('[data-dl]').forEach(el => { const t = timerState(+el.dataset.dl, +el.dataset.tot || 30), b = el.querySelector('b'), u = el.querySelector('u'); if (b && b.textContent !== t.s + ' s') b.textContent = t.s + ' s'; if (u) u.style.transform = `scaleX(${t.k.toFixed(3)})`; el.classList.toggle('hot', t.s <= 5); }); }, 100));
  emoteBar();
  render();
}
// Nouvel arbitre (créateur qui revient ou invité qui reprend la main) : on relance les étapes en cours.
function resumeAuthority() {
  const G = X.G; if (!G || G.over) return;
  X.hid = { bids: [null, null], comp: [null, null], proof: [null, null] };
  const ph = G.ph;
  if ((ph.k === 'sealed' || ph.k === 'compose') && ph.reveal) { ph.rv = [false, false]; ph.rt = (ph.rt || 0) + 1; G.dl = Date.now() + TIME.unseal * 1000; }   // chacun rouvre son enveloppe (gardée sur son appareil)
  else if (G.dl) G.dl = Date.now() + (TIME[ph.k] || 20) * 1000;
  if (ph.k === 'fight') { const f = G.fights[G.fights.length - 1]; if (f && f.w == null && X.F && X.F.id === G.fights.length) { const D = X.W?.BFDuel?.info().D; if (D && D.winner != null) setTimeout(() => { if (X?.host && X.G === G) { fightEnd(G, D.winner); commit(); } }, 500); } }
  G.pid++;
}
async function hostStart() {
  if (!X || X.G || X.starting || !X.host) return; X.starting = true;
  if (X.ctx.sb && !TIERS.size) await loadTiers(X.ctx.sb);
  const { data: row } = await X.db.get(X.code); X.starting = false;
  if (!X || X.G || !row?.guest) return;
  try { X.G = newState(row, X.pool, X.roles); } catch (e) { X.root.querySelector('#mxAct').innerHTML = `<p class="red">${esc(e.message)}</p>`; return; }
  nextTurn(X.G); commit();
}
function commit() {
  const G = X.G; G.seq++; if (G.over && X.arena?.onOver && !X.overSent) { X.overSent = true; setTimeout(() => { try { X?.arena?.onOver(G); } catch (e) { /* rien */ } }, 1500); } G.now = Date.now(); G.hs = X.hs; G.auth = X.uid;
  if (X.host) sendState();
  render();
  clearTimeout(X.saveT); X.saveT = setTimeout(save, G.over ? 0 : 600);
}
function sendState() { if (!X?.G) return; X.G.now = Date.now(); X.net.send('state', X.G); }
function save() { if (!X?.G) return; const G = X.G; X.db.save(X.code, { state: G, status: G.over ? 'over' : 'playing', ...(G.over ? { winner: G.players[G.over.w].uid } : {}) }).then(r => { if (r?.error) console.warn('[mercato] enregistrement', r.error.message); }); }
function act(t, v, extra = {}) {
  const G = X.G; if (!G || X.me == null) return;
  const a = { t, v, pid: G.pid, c: G.ph?.c, uid: X.uid, ...extra };
  if (X.host) handleAct(X.me, a); else X.net.send('act', a);
  if (!X.host && t === 'claim') { // l'adversaire est absent : on enregistre soi-même la victoire
    if (X.awayFor(other(X.me)) >= TIME.away * 1000) { finish(G, X.me, 'away'); G.seq++; render(); save(); }
  }
}
// Revanche : une nouvelle partie contre le même adversaire, l'autre n'a qu'à accepter.
async function rematch() {
  if (X.rematch) { location.hash = '#jeux/mercato/' + X.rematch.code; return; }
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let t = 0; t < 6; t++) {
    const code = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
    const { error } = await X.db.create(code, X.myName);
    if (!error) { X.net.send('rematch', { uid: X.uid, name: X.myName, code }); location.hash = '#jeux/mercato/' + code; return; }
  }
  X.ctx.toast?.('Impossible de créer la revanche, réessaie.');
}
function tick() {
  if (!X) return;
  const G = X.G, now = Date.now();
  if (G && !G.over && !X.host && X.me != null) {
    const gone = G.auth && !X.online.has(G.auth) && X.online.size > 0;
    if (gone) { X.authGone = X.authGone || now; if (now - X.authGone > 20000) { X.host = true; X.authGone = 0; addLog(G, `${X.myName} reprend la main : ${G.players.find(p => p.uid === G.auth)?.name || 'l\'arbitre'} s'est déconnecté.`); resumeAuthority(); commit(); return; } }
    else X.authGone = 0;
    const pb = X.root.querySelector('#mxPause'); if (pb) pb.hidden = !gone; else if (gone) render();
    const ps = X.root.querySelector('#mxPauseS'); if (ps && X.authGone) ps.textContent = Math.max(0, Math.ceil((20000 - (now - X.authGone)) / 1000));
  }
  if (X.host && G && !G.over && G.dl && now > G.dl + (G.ph.k === 'open' ? 300 : 0) && G.ph.k !== 'fight') {   // 0,3 s de grâce pour les mises de dernière seconde
    G.dl = 0; timeout(G); commit(); }
  if (G) G.players.forEach((p, i) => { if (X.online.has(p.uid)) X.seen[i] = now; });
  if (G && (X.snd?.myTurn || X.snd?.behind) && G.dl) { const s5 = Math.ceil((G.dl - (now - (X.host ? 0 : X.off || 0))) / 1000); if (s5 <= 5 && s5 > 0 && s5 !== X.lastTick) { X.lastTick = s5; sfx('tick'); } }

  if (X.F) fightTick();
  const o = other(X.me ?? 0); const aw = X.me != null && G && !G.over && G.players[o]?.uid && X.awayFor(o) >= TIME.away * 1000;
  const cb = X.root.querySelector('#mxClaim'); if (cb) cb.hidden = !aw; else if (aw) render();
}

/* ===================== Affichage ===================== */
function cardImg(c, cls = '') { return c.img ? `<img class="${cls}" src="${esc(c.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'mx-fb',textContent:'${esc(initials(c.n))}'}))">` : `<div class="mx-fb">${esc(initials(c.n))}</div>`; }
let LBL = {};
const roleLbl = r => LBL[r] || r;
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
  const c = G.cards[m.k], me = X.me, sold = m.by != null, use = me == null || canUse(G, me, m.k);
  const dur = SWAY[i % 3], delay = -((Date.now() / 1000) % dur).toFixed(2);
  const cls = ['mx-card', sold ? 'sold' : '', !sold && !use ? 'nouse' : '', opt.sel ? 'sel' : '', opt.live ? 'mx-live' : '', opt.click ? 'click' : ''].join(' ');
  return `<div class="mx-cell"><button class="${cls}" data-k="${esc(m.k)}" style="--dur:${dur}s;--del:${delay}s" aria-label="${esc(c.n)}">${face(c, { env: m.env })}
    ${sold ? `<span class="mx-sold"><b>${m.by === me && me != null ? 'À toi' : esc(G.players[m.by].name)}</b>${m.price ? ki(m.price) : 'gratuit'}</span>` : !use ? `<span class="mx-no">${slots(G, me) ? 'Rôle complet' : 'Équipe complète'}</span>` : ''}</button></div>`;
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
  const P = G.players, me = X.me, spec = me == null, o = spec ? 1 : other(me), ph = G.ph;
  if (G.back) X.back = G.back;
  const nSpec = [...X.online].filter(u => !P.some(p => p.uid === u)).length;
  const stageLbl = { main: 'Mercato', compose: 'Composition des trios', fight: 'Combats', sd: 'Mort subite', over: 'Fin de partie' }[G.stage];
  $('#mxTop').innerHTML = `<div class="mx-title"><b>Mercato</b><span class="mx-stage-lbl">${stageLbl}</span><span class="small mute">Partie ${esc(G.code)}</span></div>
    <div class="mx-score" aria-label="Score"><span>${esc(P[0].name)}</span><b>${G.score[0]}<i></i>${G.score[1]}</b><span>${esc(P[1].name)}</span></div>
    <div class="row mx-topb">${nSpec ? `<span class="mx-specn" title="Spectateurs">👁 ${nSpec}</span>` : ''}${spec ? `<a class="btn ghost" href="${X.back}">Quitter</a>` : G.over ? `<a class="btn ghost" href="${X.back}">Retour</a>` : `<button class="btn ghost" id="mxClaim" hidden>Réclamer la victoire (adversaire absent)</button><button class="btn ghost" id="mxFF">Abandonner</button>`}<button class="btn ghost mx-snd" id="mxSnd" aria-pressed="${SFX.on}" title="${SFX.on ? 'Couper le son' : 'Remettre le son'}"><svg class="mx-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z${SFX.on ? 'M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' : 'M16 9l5 6M21 9l-5 6'}"/></svg>${SFX.on ? 'Son' : 'Muet'}</button></div>`;
  $('#mx').classList.toggle('mx-spec', !!spec);
  $('#mxHud').innerHTML = (spec ? [0, 1] : [me, o]).map(i => hudHTML(G, i)).join('');
  // zone d'action (avec le bandeau de pause si l'arbitre s'est déconnecté)
  const authName = P.find(p => p.uid === G.auth)?.name || 'L\'arbitre';
  const pause = !G.over && !X.host ? `<div class="mx-pause" id="mxPause" ${G.auth && !X.online.has(G.auth) && X.online.size ? '' : 'hidden'}><b>Partie en pause : ${esc(authName)} s'est déconnecté.</b>${spec ? '' : ` <span>Tu reprends la main dans <i id="mxPauseS">20</i> s s'il ne revient pas.</span>`}</div>` : '';
  const rem = X.rematch && G.over && !spec ? `<div class="mx-remb"><b>${esc(X.rematch.name)} te propose une revanche.</b><button class="btn primary" id="mxRemOk">Accepter la revanche</button></div>` : '';
  $('#mxAct').innerHTML = pause + rem + (spec ? specHTML(G) : actHTML(G));
  $('#mxLog').innerHTML = G.log.map(l => `<div>${esc(l)}</div>`).join('');
  // zone principale
  if (G.over && X.F) { try { X.W?.BFDuel?.stop(); } catch (e) { /* rien */ } X.F = null; }
  const inFight = G.stage === 'fight' && (ph.k === 'fight' || ph.k === 'fres');
  $('#mxFight').hidden = !inFight;
  if (inFight) { $('#mxMain').innerHTML = fightSide(G); mountFight(); syncMoves(); }
  else if (G.stage === 'compose') $('#mxMain').innerHTML = spec ? teamsHTML(G) : composeHTML(G);
  else if (G.stage === 'over') $('#mxMain').innerHTML = overHTML(G);
  else $('#mxMain').innerHTML = marketHTML(G);
  wire(G);
  motion(G);
  sounds(G);
  autoReveal(G);
}
// Vue des spectateurs : tout se voit, rien ne se touche (les mises secrètes restent secrètes).
function specHTML(G) {
  const P = G.players, ph = G.ph, c = ph.c && G.cards[ph.c], nm = i => esc(P[i].name);
  const head = (t, sub) => `<div class="mx-acth"><h2>${t}</h2>${timer(G)}</div>${sub ? `<p class="mute small">${sub}</p>` : ''}`;
  switch (ph.k) {
    case 'nominate': case 'pick': case 'draft': return head(`${nm(ph.who)} choisit une carte`, ph.k === 'draft' ? 'Mort subite en draft : chacun son tour.' : ph.k === 'pick' ? 'Complément gratuit de son équipe.' : 'Il choisit quelle carte passe aux enchères.') + wait('En attente…');
    case 'open': return head('Enchère chrono', `${nm(ph.lead)} est en tête.`) + `<div class="mx-amtw"><div class="mx-amt" data-v="${ph.high}">${grp(ph.high)} <small>KI</small></div><span class="mx-leader">${nm(ph.lead)} mène</span></div>` + bigCard(G, ph.c) + `<ol class="mx-feed">${(ph.hist || []).map(([w, v], n) => `<li class="${n ? '' : 'top'}"><b>${nm(w)}</b><span>${ki(v)}</span></li>`).join('')}</ol>`;
    case 'sealed': return head('Enchère sous enveloppe', [0, 1].map(i => `${nm(i)} : ${ph.has[i] ? 'enveloppe validée' : 'réfléchit…'}`).join(' · ')) + bigCard(G, ph.c);
    case 'fight': { const f = G.fights[G.fights.length - 1]; return head(G.single ? (G.label || 'Combat') : f.n === 3 ? 'Combat de mort subite' : `Combat ${f.n} sur 2`, 'Les joueurs jouent leurs coups en direct.') + '<div id="mxMoveT" class="mx-movet"></div>'; }
    case 'compose': return head('Les joueurs préparent leurs trios', [0, 1].map(i => `${nm(i)} : ${ph.ready[i] ? 'prêt' : 'en cours'}`).join(' · '));
    default: { const me0 = X.me; X.me = 0; const h = actHTML(G).replace(/id="mx(Next|Rem|Pass|BidGo|NomEnv|Comp)[^"]*"/g, '').replace(/<button class="btn primary"[^>]*>[^<]*<\/button>/g, ''); X.me = me0; return h; }
  }
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
  pop: a => { tone(a, 520, .09, { to: 900, type: 'triangle', vol: .09 }); },
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
  const myTurn = me != null && !G.over && ((ph.k === 'nominate' || ph.k === 'pick' || ph.k === 'draft') && ph.who === me ||  ph.k === 'sealed' && !ph.has[me] && canUse(G, me, ph.c) || ph.k === 'compose' && !ph.ready[me]);
  const behind = me != null && !G.over && ph.k === 'open' && ph.lead !== me && canUse(G, me, ph.c);
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
  if (G.lastDraft && prev.k === 'draft' && cur.log !== prev.log && /choisit /.test(cur.log || '')) sfx('drop');
  if (cur.k === 'open' && prev.k === 'open' && cur.c === prev.c && cur.high > prev.high) return sfx(prev.lead === me && cur.lead !== me ? 'outbid' : 'bid');
  if (cur.log !== prev.log && / passe\.$/.test(cur.log || '')) sfx('pass');
  if (cur.myTurn && !prev.myTurn) setTimeout(() => sfx('turn'), cur.k === 'open' || cur.k === 'sealed' ? 650 : 0);
}
// Mouvement : entrée de la carte en vente, tampon « Adjugé », montant qui défile, carte qui pivote sous le doigt.
function motion(G) {
  const R = X.root, ph = G.ph, hold = R.querySelector('.mx-hold');
  if (hold) { const key = ph.k === 'done' ? 'v:' + ph.c : 'c:' + (ph.c || X.sel); if (X.lastStage !== key) { hold.classList.add('enter'); X.lastStage = key; } bindTilt(hold); }
  const pf = R.querySelector('[data-proof="seal"]');
  if (pf && ph.com) { const key = 'p' + G.pid; if (X.proofOk?.[key] != null) pf.textContent = X.proofOk[key] ? 'Enveloppes vérifiées : les deux mises correspondent à ce qui avait été validé.' : 'Attention : une enveloppe ne correspond pas à ce qui avait été validé.'; else checkProofs('seal', ph.spid, ph.bids, ph.com, ph.proof).then(ok => { X.proofOk = X.proofOk || {}; X.proofOk[key] = ok; if (pf.isConnected) pf.textContent = ok ? 'Enveloppes vérifiées : les deux mises correspondent à ce qui avait été validé.' : 'Attention : une enveloppe ne correspond pas à ce qui avait été validé.'; }); }
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
  const optOf = m => ({ sel: X.sel === m.k && ph.k === 'nominate', live: ph.c === m.k && ['open', 'sealed', 'done'].includes(ph.k), click: (ph.k === 'nominate' || ph.k === 'pick' || ph.k === 'draft') && ph.who === me && canUse(G, me, m.k) });
  const idx = new Map(M.map((m, i) => [m.k, i]));
  const web = list => `<div class="mx-web">${list.map(m => tile(G, m, idx.get(m.k), optOf(m))).join('')}</div>`;
  const left = r => M.filter(m => G.cards[m.k].role === r && m.by == null).length;
  const btn = (v, label, ico) => `<button class="mx-fbtn ${f === v ? 'on' : ''}" data-filter="${v}" ${ico ? `data-role="${v}"` : ''} aria-pressed="${f === v}">${ico || ''}${label}</button>`;
  const bar = `<div class="mx-filter" role="toolbar" aria-label="Filtrer le marché">${btn('all', 'Tout')}${btn('rows', 'Par rôle')}${roles.map(r => btn(r, `${esc(roleLbl(r))}<small>${left(r)}</small>`, roleIco(r))).join('')}</div>`;
  let body;
  if (f === 'rows') body = roles.map(r => `<section class="mx-rrow"><h3 class="mx-rrowh" data-role="${r}">${roleIco(r)}${esc(roleLbl(r))}<small>${left(r)} à vendre</small></h3>${web(M.filter(m => G.cards[m.k].role === r))}</section>`).join('');
  else body = web(f === 'all' ? M : M.filter(m => G.cards[m.k].role === f));
  const legend = M.some(m => m.env) ? `<p class="mx-legend">${SEAL}<span><b>Sceau rouge : carte sous enveloppe.</b> Quand elle est mise en vente, chacun mise en secret et la plus haute mise l'emporte. Ce sont les cartes les mieux classées de la tier list PvP.</span></p>` : '';
  return `<div class="mx-mkh"><h2>${isSD(G) ? 'Draft de la mort subite' : 'Le marché'}</h2><span class="small mute">${M.filter(m => m.by == null).length} cartes ${isSD(G) ? 'à choisir' : 'à vendre'}. Touche une carte pour lire sa technique.</span></div>${legend}${bar}${body}`;
}
function hudHTML(G, i) {
  const p = G.players[i], me = X.me, list = owned(G, i), on = X.online.has(p.uid);
  const active = (G.ph.k === 'nominate' || G.ph.k === 'pick' || G.ph.k === 'draft') ? G.ph.who === i : G.ph.k === 'open' ? G.ph.lead === i : G.ph.k === 'sealed' ? !G.ph.has[i] : false;
  const per = cfg(G).per, tally = (G.stage === 'main' || G.stage === 'sd') ? `<div class="mx-tally" title="Cartes par rôle (au plus ${per} par rôle)">${X.roles.filter(r => G.roles.includes(r)).map(r => { const n = list.filter(k => G.cards[k].role === r).length; return `<span class="mx-tr ${n >= per ? 'full' : ''}" data-role="${r}" title="${esc(roleLbl(r))} : ${n}/${per}">${roleIco(r)}<i>${n}/${per}</i></span>`; }).join('')}</div>` : '';
  const need = (G.stage === 'main' || G.stage === 'sd') && slots(G, i) && i !== me ? `<div class="mx-need">Peut encore prendre : ${X.roles.filter(r => list.filter(k => G.cards[k].role === r).length < per).map(r => `<span data-role="${r}">${roleIco(r)}${esc(roleLbl(r))}</span>`).join('')}</div>` : '';
  return `<div class="mx-pl ${active ? 'on' : ''} ${i === me ? 'mx-me' : 'mx-opp'}" data-i="${i}"><div class="mx-pln"><b>${esc(p.name)}</b>${i === me ? '<span class="mx-you">toi</span>' : ''}<i class="mx-dot ${on ? 'ok' : ''}" title="${on ? 'En ligne' : 'Hors ligne'}"></i></div>
    <div class="mx-money">${grp(p.budget)}<small>KI</small></div><div class="mx-bar"><i style="width:${Math.max(0, p.budget / BUDGET * 100)}%"></i></div>
    <div class="mx-slots" style="--n:${cfg(G).n}">${Array.from({ length: cfg(G).n }, (_, k) => { const c = list[k] && G.cards[list[k]]; return `<span class="mx-slot ${c ? 'full' : ''}" title="${c ? esc(c.n + ', ' + roleLbl(c.role)) : 'Place libre'}">${c ? cardImg(c) + `<span class="mx-slotr" data-role="${esc(c.role)}">${roleIco(c.role)}</span>` : ''}</span>`; }).join('')}</div>
    ${tally}${need}${G.stage === 'main' || G.stage === 'sd' ? `<div class="small mute">${!slots(G, i) ? 'Équipe complète' : G.stage === 'sd' ? `Encore ${slots(G, i)} carte${slots(G, i) > 1 ? 's' : ''} à choisir` : `Mise max : ${ki(maxBid(G, i))}`}</div>` : ''}</div>`;
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
  const key = G.pid + ':' + label, d = X?.draft && X.draft.k === key ? X.draft.v : (opt.def ?? min);
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
      if (!X.sel || !canUse(G, me, X.sel)) return head('À toi de vendre une carte', 'Touche une carte du marché que tu peux recruter, puis ouvre l\'enchère.');
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
      return top + `<div class="mx-snipe"><span class="mx-snipeh"><b>${grp(ph.high)} KI</b> · ${esc(P[ph.lead].name)} mène</span>${quick.map(([d, l]) => `<button class="mx-sbtn" data-bid="${ph.high + d}"><b>${l}</b><small>${ki(ph.high + d)}</small></button>`).join('')}<button class="mx-sbtn pass" data-pass><b>Je passe</b><small>${esc(P[ph.lead].name)} l'emporte</small></button></div>`
        + bidBox(G, mn, mx, 'Miser ce montant', { pass: 'Je passe', noquick: true });
    }
    case 'sealed': {
      const top = head('Enchère sous enveloppe', `Chacun mise en secret et valide son enveloppe. Sans validation à la fin du chrono, c'est la mise minimale (10 000 KI). La plus haute mise l'emporte ; à égalité, ${ph.nom === me ? 'toi (tu l\'as mise en vente)' : esc(P[ph.nom].name) + ' (il l\'a mise en vente)'}.`) + bigCard(G, ph.c);
      if (ph.has[me]) { const sec = mySecret('seal', G.pid); return top + (sec ? `<p>Ta mise secrète : <b>${ki(sec.v)}</b></p>` : '<p>Ton enveloppe est validée.</p>') + (ph.reveal ? wait('Ouverture des enveloppes…') : ph.has[o] ? '' : wait(`${esc(P[o].name)} prépare sa mise…`)); }
      if (!canUse(G, me, ph.c)) return top + '<p class="mute">Tu ne peux pas recruter cette carte.</p>';
      const isNom = ph.nom === me, mx = maxBid(G, me);
      return top + (ph.has[o] ? `<p class="small mx-ready">${esc(P[o].name)} a validé son enveloppe.</p>` : '') + (isNom ? bidBox(G, minBid(G, me), mx, 'Valider mon enveloppe', { secret: true })
        : mx >= K ? bidBox(G, K, mx, 'Valider mon enveloppe', { secret: true, pass: 'Ne pas miser' }) : '<button class="btn" id="mxPass">Ne pas miser</button>');
    }
    case 'draft': {
      const last = G.lastDraft && G.cards[G.lastDraft.k], lastTxt = last ? `<p class="small">${G.lastDraft.w === me ? 'Tu as pris' : esc(P[G.lastDraft.w].name) + ' a pris'} <b>${esc(last.n)}</b>.</p>` : '';
      if (ph.who !== me) return head(`${esc(P[o].name)} choisit une carte`, 'Mort subite en draft : chacun son tour, une carte gratuite, un rôle différent à chaque fois.') + lastTxt + wait('En attente…');
      return head('À toi de choisir', 'Mort subite en draft : touche une carte du marché (gratuite). Ton trio doit avoir 3 rôles différents.') + lastTxt;
    }
    case 'pick':
      if (ph.who !== me) return head(`${esc(P[o].name)} complète son équipe`, 'Ton équipe est complète : il choisit gratuitement parmi les cartes restantes.') + wait('En attente…');
      return head('Complète ton équipe gratuitement', `${esc(P[o].name)} a toutes ses cartes : touche une carte du marché compatible avec tes rôles.`);
    case 'done': {
      const w = ph.w === me ? 'Tu recrutes' : `${esc(P[ph.w].name)} recrute`;
      const stamp = `<span class="mx-stamp"><b>Adjugé</b><small>${ph.w === me ? 'à toi' : 'à ' + esc(P[ph.w].name)}</small></span>`;
      if (ph.sealed && ph.bids) {   // ouverture des deux enveloppes, puis le tampon
        const env = i => `<div class="mx-env3d ${ph.w === i ? 'win' : 'lose'}" style="--d:${.45 + i * .5}s"><div class="mx-envin"><div class="mx-envf">${SEAL}<b>${i === me ? 'Toi' : esc(P[i].name)}</b></div><div class="mx-envb"><b>${i === me ? 'Toi' : esc(P[i].name)}</b><span>${ki(ph.bids[i])}</span>${ph.w === i ? '<i>Remporte la carte</i>' : ''}</div></div></div>`;
        return head('Ouverture des enveloppes', '<span class="mx-proof" data-proof="seal">Vérification des enveloppes…</span>') + `<div class="mx-reveal">${env(0)}<span class="mx-vs2">contre</span>${env(1)}</div><div class="mx-late"><p class="mx-verdict">${w} ${esc(c.n)} pour ${ki(ph.price)}.</p>${bigCard(G, ph.c, { stamp })}</div>`;
      }
      const other_ = esc(P[other(ph.w)].name), why = { pass: `${ph.w === me ? other_ + ' a passé' : 'Tu as passé'} : adjugé sans attendre la fin du chrono.`, clock: 'Fin du chrono.', role: `${ph.w === me ? other_ + ' ne peut pas la recruter (rôle déjà complet)' : 'Tu ne peux pas la recruter (rôle déjà complet)'} : adjugé tout de suite.`, full: `${ph.w === me ? other_ + ' a déjà toute son équipe' : 'Ton équipe est déjà complète'} : adjugé tout de suite.`, money: `${ph.w === me ? other_ + ' n\'a plus assez de KI' : 'Tu n\'as plus assez de KI'} pour surenchérir : adjugé tout de suite.` }[ph.why];
      return head(`${w} ${esc(c.n)}`, (ph.free ? 'Gratuitement.' : `Pour ${ki(ph.price)}.`) + (why ? ' ' + why : '')) + (ph.bids ? `<p class="small mx-bids">Mises secrètes : ${esc(P[0].name)} ${ki(ph.bids[0])}, ${esc(P[1].name)} ${ki(ph.bids[1])}</p>` : '') + bigCard(G, ph.c, { stamp });
    }
    case 'compose':
      return head('Prépare tes deux trios', 'En secret : ton adversaire ne voit rien avant que les deux soient prêts. Dès que vous l\'êtes tous les deux, le combat commence.') + (ph.ready[o] && !ph.ready[me] ? `<p class="small mx-ready">${esc(P[o].name)} a ses trios prêts.</p>` : '') + (ph.ready[me] ? wait(ph.reveal ? 'Révélation des trios…' : `Tes trios sont prêts. ${esc(P[o].name)} prépare les siens…`) : '');
    case 'fight': { const f = G.fights[G.fights.length - 1]; return head(G.single ? (G.label || 'Combat') : f.n === 3 ? 'Combat de mort subite' : `Combat ${f.n} sur 2`, 'Joue tes coups dans l\'écran de combat. 45 s par coup : sinon une attaque simple est jouée pour toi (3 fois de suite = forfait).') + '<div id="mxMoveT" class="mx-movet"></div>'; }
    case 'fres': return fresHTML(G) || head(ph.w === 'draw' ? 'Égalité : le combat est rejoué' : ph.w === me ? `Tu gagnes le combat ${ph.n === 3 ? 'de mort subite' : ph.n} !` : `${esc(P[ph.w].name)} gagne le combat ${ph.n === 3 ? 'de mort subite' : ph.n}`, `Score : ${G.score[0]} - ${G.score[1]}.`);
    case 'over': { const w = G.over.w; return `<div class="mx-acth"><h2>${w === me ? '🏆 Victoire !' : me == null ? esc(P[w].name) + ' gagne' : 'Défaite'}</h2></div><p>${w === me ? 'Tu remportes' : esc(P[w].name) + ' remporte'} le Mercato ${G.score[w]} - ${G.score[other(w)]}${G.over.why === 'ff' ? ' par forfait' : G.over.why === 'away' ? ' (adversaire absent)' : ''}.</p>${G.back && !X.arena ? `<div class="row"><a class="btn primary" href="${G.back}">Retour au salon</a></div>` : ''}${me != null && !X.rematch && !X.arena && !G.back ? '<div class="row"><button class="btn primary" id="mxRem">Revanche</button><a class="btn ghost" href="#jeux/mercato">Retour</a></div><p class="small mute">Une nouvelle partie contre le même adversaire, avec un nouveau marché.</p>' : ''}`; }
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
  return `<div class="mx-teams">${(X.me == null ? [0, 1] : [X.me, other(X.me)]).map(i => { const p = G.players[i]; return `<div class="card"><h3>${esc(p.name)}</h3><div class="mx-trioc">${p.own.map(k => { const c = G.cards[k], m = G.market.find(x => x.k === k); return `<div class="mx-mini">${face(c, { mini: true })}${roleTag(c)}<span class="small mute">${m?.price ? ki(m.price) : 'gratuit'}</span></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
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
    <div class="card section"><h3>Combats</h3>${G.fights.map((f, i) => `<details class="mx-fsum"><summary><b>${f.n === 3 ? 'Mort subite' : 'Combat ' + f.n}</b> : ${f.w == null ? '—' : f.w === 'draw' ? 'égalité' : esc(P[f.w].name) + ' gagne'}</summary>${(f.sum || X.sum?.[i + 1]) ? sumHTML(G, f, f.sum || X.sum[i + 1]) : '<p class="small mute">Bilan indisponible.</p>'}</details>`).join('') || '<p class="small mute">Aucun combat joué.</p>'}</div>
    <div class="row">${X.arena || G.back ? `<a class="btn primary" href="${X.back}">${G.back ? 'Retour au salon' : 'Retour au match'}</a>` : '<a class="btn primary" href="#jeux/mercato">Nouvelle partie</a>'}</div>`;
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
    if ((ph.k === 'pick' || ph.k === 'draft') && ph.who === me && canUse(G, me, k)) { sfx('select'); act('pick', null, { k }); return; }
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
      if (ph.k === 'nominate') act('nom', v, { k: X.sel }); else if (ph.k === 'open') act('bid', v); else if (ph.k === 'sealed') commitSecret('seal', v);
    };
    $('#mxBidGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  R.querySelectorAll('[data-bid]').forEach(b => b.onclick = () => { act('bid', +b.dataset.bid); b.classList.add('sent'); });
  R.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => act('pass'));
  $('#mxPass') && ($('#mxPass').onclick = () => { if (ph.k === 'nominate') { X.sel = null; render(); } else if (ph.k === 'open') act('pass'); else if (ph.k === 'sealed') commitSecret('seal', 0); });
  wireCompose(R);
  $('#mxSwapT') && ($('#mxSwapT').onclick = () => { for (const k in X.compSel.t) X.compSel.t[k] = 1 - X.compSel.t[k]; render(); });
  $('#mxComp') && ($('#mxComp').onclick = () => { const own = G.players[me].own, t = [0, 1].map(i => own.filter(k => X.compSel.t[k] === i)); commitSecret('comp', t); });
  $('#mxNext') && ($('#mxNext').onclick = () => act('next'));
  $('#mxRem') && ($('#mxRem').onclick = e => { e.currentTarget.disabled = true; rematch(); });
  $('#mxRemOk') && ($('#mxRemOk').onclick = () => { location.hash = '#jeux/mercato/' + X.rematch.code; });
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
    if (!F.done) { X.sum = X.sum || {}; try { X.sum[F.id] = fightSummary(H); } catch (e) { /* rien */ } }
    if (!F.done) { F.done = true; F.dl = 0; if (X.host) setTimeout(() => { if (X?.G && X.F === F) { fightEnd(X.G, D.winner === 'draw' ? 'draw' : D.winner); commit(); } }, 2800); }
  } else if (D.s === me && !F.ai[me] && H.length - 1 === info.idx) {
    if (F.tk !== H.length) { F.tk = H.length; F.dl = Date.now() + TIME.move * 1000; }
  }
  if (me === 1 || X.spec) patchLabels();
}
// Bilan d'un combat à partir de l'historique des coups : dégâts, soins et K.O. de chaque carte, PV restants.
function fightSummary(H) {
  const st = { A: [0, 1, 2].map(() => ({ dmg: 0, heal: 0, ko: 0 })), B: [0, 1, 2].map(() => ({ dmg: 0, heal: 0, ko: 0 })) };
  const team = (b, t) => t === 'A' ? b.players : b.enemies;
  for (let j = 1; j < H.length; j++) {
    const h = H[j], a = h.from?.b, b = h.D?.b; if (!a || !b || !h.mv) continue;
    const mine = h.side === 0 ? 'A' : 'B', op = mine === 'A' ? 'B' : 'A'; let dmg = 0, heal = 0, ko = 0;
    team(a, op).forEach((u, k) => { const v = team(b, op)[k]; if (!v) return; dmg += Math.max(0, u.hp - v.hp); if (u.hp > 0 && v.hp === 0) ko++; });
    team(a, mine).forEach((u, k) => { const v = team(b, mine)[k]; if (v) heal += Math.max(0, v.hp - u.hp); });
    const x = st[mine][h.mv.i]; if (x) { x.dmg += dmg; x.heal += heal; x.ko += ko; }
  }
  const last = H[H.length - 1].D.b;
  return { A: st.A.map((x, k) => ({ ...x, hp: last.players[k]?.hp || 0, max: last.players[k]?.maxHp || 1 })), B: st.B.map((x, k) => ({ ...x, hp: last.enemies[k]?.hp || 0, max: last.enemies[k]?.maxHp || 1 })), turns: last.turn };
}
const priceOf = (G, k) => { const m = [...G.market, ...(G.sdm || [])].find(x => x.k === k); return m ? m.price : 0; };
function sumHTML(G, f, sum) {
  const P = G.players, all = [...f.A.map((k, i) => ({ k, side: 0, ...sum.A[i] })), ...f.B.map((k, i) => ({ k, side: 1, ...sum.B[i] }))];
  const mvp = all.reduce((a, b) => b.dmg + b.heal * .5 > a.dmg + a.heal * .5 ? b : a, all[0]), mc = G.cards[mvp.k];
  const col = (side, ks) => `<div class="mx-sumc"><h4>${esc(P[side].name)}${f.w === side ? ' <span>victoire</span>' : ''}</h4>${ks.map((k, i) => { const x = (side ? sum.B : sum.A)[i], c = G.cards[k]; return `<div class="mx-sumr ${x.hp ? '' : 'ko'}"><span class="mx-sumn">${esc(c.n)}</span><span title="Dégâts infligés">${fmtN(x.dmg)}<i>dégâts</i></span>${x.heal ? `<span title="Soins">${fmtN(x.heal)}<i>soins</i></span>` : ''}${x.ko ? `<span>${x.ko}<i>K.O.</i></span>` : ''}<span class="mx-sumhp"><u style="width:${Math.round(x.hp / x.max * 100)}%"></u></span></div>`; }).join('')}<p class="small mute">Trio payé ${ki(ks.reduce((a, k) => a + priceOf(G, k), 0))}</p></div>`;
  return `<div class="mx-sum"><div class="mx-mvp"><div class="mx-mvpc">${face(mc, { mini: true })}</div><div><span class="mx-mvpl">Meilleure carte du combat</span><b>${esc(mc.n)}</b><span class="small mute">${esc(P[mvp.side].name)} : ${fmtN(mvp.dmg)} dégâts${mvp.heal ? ', ' + fmtN(mvp.heal) + ' PV soignés' : ''}${mvp.ko ? ', ' + mvp.ko + ' K.O.' : ''}</span></div></div>
    <div class="mx-sumg">${col(0, f.A)}${col(1, f.B)}</div><p class="small mute">${sum.turns} tours.</p></div>`;
}
function fresHTML(G) {
  const ph = G.ph, f = G.fights[G.fights.length - 1], sum = f?.sum || X.sum?.[G.fights.length]; if (!sum) return '';
  const me = X.me, P = G.players, ok = ph.ok || [false, false];
  const title = ph.w === 'draw' ? 'Égalité : le combat est rejoué' : ph.w === me ? `Tu gagnes le combat ${ph.n === 3 ? 'de mort subite' : ph.n} !` : `${esc(P[ph.w].name)} gagne le combat ${ph.n === 3 ? 'de mort subite' : ph.n}`;
  const btn = me == null ? '' : ok[me] ? wait(`En attente de ${esc(P[other(me)].name)}…`) : `<button class="btn primary" id="mxNext">${G.single || G.score[0] === 2 || G.score[1] === 2 || ph.n === 3 ? 'Voir le résultat' : 'Combat suivant'}</button>`;
  return `<div class="mx-acth"><h2>${title}</h2>${G.dl ? `<span class="mx-timer" data-dl="${G.dl}" data-tot="${TIME.fres}"><b>${timerState(G.dl, TIME.fres).s} s</b><i><u></u></i></span>` : ''}</div><p class="mute small">Score : ${G.score[0]} - ${G.score[1]}.</p>${sumHTML(G, f, sum)}${btn}`;
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
  if (el) { if (mine && F.dl) { const s = Math.max(0, Math.ceil((F.dl - Date.now()) / 1000)); el.innerHTML = `À toi de jouer : <b class="${s <= 10 ? 'hot' : ''}">${s} s</b>${F.miss ? ` · coups manqués : ${F.miss}/3` : ''}`; } else el.textContent = D && D.winner == null && D.s !== X.me ? `Au tour de ${X.G.players[X.me == null ? D.s : other(X.me)].name}…` : ''; }
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
  const map = X.spec ? [['À TOI DE JOUER', 'AU TOUR DE ' + A], ['TON ACTION', 'ACTION DE ' + A], ['Tu passes à l’action', a + ' passe à l’action']] : [['À TOI DE JOUER', 'AU TOUR DE ' + A], ['AU TOUR DE ' + B, 'À TOI DE JOUER'], ['TON ACTION', 'ACTION DE ' + A], ['ACTION DE ' + B, 'TON ACTION'], ['Tu passes à l’action', a + ' passe à l’action'], [b + ' passe à l’action', 'Tu passes à l’action']];
  const root = W.document.getElementById('bfStage'); if (!root) return;
  const tw = W.document.createTreeWalker(root, 4); let n;
  while ((n = tw.nextNode())) { const t = n.nodeValue.trim(); if (!t || n.parentElement?.closest('.story-fighter')) continue; const hit = map.find(([x]) => x === t); if (hit) n.nodeValue = n.nodeValue.replace(hit[0], hit[1]); }
}

/* ===================== Mercato à plusieurs : royale (4, 6 en poules, 8) et équipes (2 contre 2, 3 contre 3) =====================
   Un seul marché pour tout le salon. Chaque joueur achète un trio (3 cartes de 3 rôles différents) avec son propre budget.
   En équipes, on ne peut pas enchérir contre un coéquipier, et le chef de chaque équipe range ses joueurs en secret.
   Les combats sont de vrais duels (combat unique) joués en même temps, chacun sur son téléphone ; le salon suit les résultats. */
let Y = null;
const MULTI_SIZES = { royale: [4, 6, 8], equipes: [4, 6] };
const TEAM_NAMES = ['Équipe rouge', 'Équipe bleue'];
function multiCleanup() { if (!Y) return; try { Y.net?.close(); } catch (e) { /* rien */ } (Y.timers || []).forEach(t => clearInterval(t)); window.removeEventListener('hashchange', Y.onHash); document.getElementById('mxEmo')?.remove(); document.getElementById('mxSpecFx')?.remove(); Y = null; }
const mkCode = n => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
async function createMulti(ctx, mode, size) {
  const { sb, S } = ctx, uid = S.user.id, name = S.profile?.discord || 'Membre', db = ctx.db || supaDB(sb, uid);
  for (let t = 0; t < 6; t++) { const code = mkCode(5); const { error } = await db.createMulti(code, mode, size, name); if (!error) { location.hash = '#jeux/mercato/salon/' + code; return null; } if (!/duplicate|unique/i.test(error.message || '')) return error.message; }
  return 'Impossible de créer le salon, réessaie.';
}
// Marché de T cartes : chaque rôle au plus « cap » cartes (personne ne peut en prendre plus), noms tous différents.
function drawMarketN(pool, roles, T, cap, envN) {
  const used = new Set(), byRole = {};
  for (const r of roles) byRole[r] = pool.filter(c => c.role === r);
  const dc = r => new Set(byRole[r].map(c => nkey(c.n))).size;
  const n = {}; roles.forEach(r => { n[r] = Math.min(dc(r), cap); });
  // Garantie sans blocage : 3 rôles ont chacun autant de cartes que de joueurs. Un joueur à qui il manque une carte manque
  // d'au moins 3 rôles, donc d'au moins un de ces 3 rôles « pleins » ; les autres ne peuvent y prendre qu'une carte chacun,
  // il en reste donc toujours une pour lui. Les 3 rôles pleins sont tirés au sort parmi ceux qui ont assez de cartes.
  const full = shuffle(roles.filter(r => dc(r) >= cap)).slice(0, 3);
  if (full.length === 3) { const rest = roles.filter(r => !full.includes(r)); let room = T - 3 * cap; rest.forEach(r => { n[r] = 0; }); while (room > 0 && rest.some(r => n[r] < Math.min(dc(r), cap))) { const r = rest.filter(x => n[x] < Math.min(dc(x), cap)).sort((a, b) => n[a] - n[b] || Math.random() - .5)[0]; n[r]++; room--; } }
  let tot = roles.reduce((a, r) => a + n[r], 0);
  while (tot > T) { const r = roles.slice().sort((a, b) => n[b] - n[a] || Math.random() - .5)[0]; n[r]--; tot--; }
  const out = [];
  for (const r of roles) for (let j = 0; j < n[r]; j++) {
    const L = byRole[r].filter(c => !used.has(nkey(c.n))), w = c => c.rar === 'LR' ? 1 : .55; if (!L.length) break;
    let x = Math.random() * L.reduce((a, c) => a + w(c), 0), pick = L[L.length - 1]; for (const c of L) { x -= w(c); if (x <= 0) { pick = c; break; } }
    used.add(nkey(pick.n)); out.push(pick);
  }
  const ro = roles.reduce((o, r, i) => (o[r] = i, o), {}); out.sort((a, b) => ro[a.role] - ro[b.role] || a.n.localeCompare(b.n));
  const env = new Set(), rt = new Set();
  for (const i of out.map((_, i) => i).sort((a, b) => power(out[b]) - power(out[a]))) { if (env.size >= envN) break; if (rt.has(out[i].role)) continue; env.add(i); rt.add(out[i].role); }
  return out.map((c, i) => ({ c, env: env.has(i) }));
}

/* ---------- règles (chez l'arbitre = le créateur du salon) ---------- */
const mSlots = (MG, i) => 3 - MG.bid[i].own.length;
const mFits = (MG, i, k) => { const m = MG.market.find(x => x.k === k); return !!m && m.by == null && mSlots(MG, i) > 0 && !MG.bid[i].own.some(o => MG.cards[o].role === MG.cards[k].role); };
const mCanUse = mFits;
const mMax = (MG, i) => floorK(MG.bid[i].budget - K * Math.max(0, mSlots(MG, i) - 1));
const mMin = (MG, i) => Math.min(K, mMax(MG, i));
const mates = (MG, i, j) => MG.mode === 'equipes' && i !== j && MG.members[i].team === MG.members[j].team;
// peut miser sur la carte en cours : pas en tête, carte utile, assez de KI, et pas contre un coéquipier qui mène
const mCanBid = (MG, i) => { const ph = MG.ph; return ph.k === 'open' && i !== ph.lead && !ph.out.includes(i) && !mates(MG, i, ph.lead) && mCanUse(MG, i, ph.c) && mMax(MG, i) >= ph.high + K; };
function mLog(MG, t) { MG.log.unshift(t); MG.log.length = Math.min(MG.log.length, 60); }
function mPh(MG, ph, secs) { MG.ph = ph; MG.pid++; MG.dl = secs ? Date.now() + secs * 1000 : 0; }
function mStart(MG) {
  const N = MG.members.length, roles = MG.roles;
  MG.bid = MG.members.map(m => ({ uid: m.uid, budget: BUDGET, own: [] }));
  const T = N * 3 + Math.max(3, Math.ceil(N / 2) + 2);
  MG.market = drawMarketN(Y.pool, roles, T, N, MG.mode === 'royale' ? 2 : 0).map(({ c, env }) => { MG.cards[c.k] = c; return { k: c.k, env, by: null, price: 0 }; });
  MG.stage = 'auction'; MG.nom = Math.floor(Math.random() * N);
  mLog(MG, `Le mercato commence : ${N} joueurs, ${MG.market.length} cartes. ${MG.members[MG.nom].name} met la première carte en vente.`);
  mNext(MG, true);
}
// carte gratuite de la réserve quand plus aucune carte du marché ne convient à un joueur
function mReserve(MG, i) {
  const own = MG.bid[i].own.map(k => MG.cards[k].role), names = new Set(Object.values(MG.cards).map(c => nkey(c.n)));
  const L = Y.pool.filter(c => !own.includes(c.role) && !names.has(nkey(c.n))); if (!L.length) return false;
  // filet de sécurité (ne sert jamais à 4 ou 6 joueurs grâce à la composition du marché) : la carte la plus faible, jamais une carte forte au hasard
  const c = L.sort((a, b) => power(a) - power(b))[0]; MG.cards[c.k] = c; MG.market.push({ k: c.k, env: false, by: i, price: 0, res: true }); MG.bid[i].own.push(c.k);
  mLog(MG, `${MG.members[i].name} reçoit ${c.n} (carte la plus faible de la réserve, gratuite) : plus aucune carte du marché ne lui convenait.`); return true;
}
function mNext(MG, keepNom) {
  const N = MG.members.length;
  for (let i = 0; i < N; i++) while (mSlots(MG, i) > 0 && !MG.market.some(m => mCanUse(MG, i, m.k))) if (!mReserve(MG, i)) break;
  const need = MG.bid.map((_, i) => i).filter(i => mSlots(MG, i) > 0);
  if (!need.length) return mAfterAuction(MG);
  if (need.length === 1) return mPh(MG, { k: 'pick', who: need[0] }, TIME.pick);
  let who = keepNom ? MG.nom : (MG.nom + 1) % N, g = 0; while (!need.includes(who) && g++ < N) who = (who + 1) % N;
  MG.nom = who; mPh(MG, { k: 'nominate', who }, TIME.nominate);
}
function mAward(MG, w, price, extra = {}) {
  const k = MG.ph.c, m = MG.market.find(x => x.k === k); MG.bid[w].budget -= price; MG.bid[w].own.push(k); m.by = w; m.price = price;
  mLog(MG, `${MG.members[w].name} recrute ${MG.cards[k].n} ${price ? 'pour ' + ki(price) : 'gratuitement'}${extra.sealed ? ' (sous enveloppe)' : ''}.`);
  mPh(MG, { k: 'done', c: k, w, price, ...extra }, extra.sealed ? TIME.reveal : TIME.done);
}
function mOpenEnd(MG) { const ph = MG.ph; const any = MG.members.some((_, i) => mCanBid(MG, i)); if (!any) mAward(MG, ph.lead, ph.high, { why: 'none' }); }
function mApply(MG, who, a) {
  if (!MG || MG.stage === 'over') return false;
  const ph = MG.ph, inR = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi && (v % K === 0 || v === hi);
  if (MG.stage === 'lobby') {
    if (a.t === 'team' && MG.mode === 'equipes' && (a.v === 0 || a.v === 1)) { const per = MG.size / 2; if (MG.members.filter(m => m.team === a.v).length >= per) return false; MG.members[who].team = a.v; MG.members[who].chef = false; return true; }
    if (a.t === 'chef' && MG.mode === 'equipes') { const t = MG.members[who].team; MG.members.forEach(m => { if (m.team === t) m.chef = false; }); MG.members[who].chef = true; return true; }
    return false;
  }
  if (a.pid !== MG.pid && !(ph.k === 'open' && a.c === ph.c)) return false;
  switch (ph.k) {
    case 'nominate': {
      if (who !== ph.who || a.t !== 'nom' || !mCanUse(MG, who, a.k)) return false;
      const m = MG.market.find(x => x.k === a.k);
      if (m.env) { mPh(MG, { k: 'sealed', c: a.k, nom: who, com: {}, ct: {}, rv: {}, vals: {}, reveal: false }, TIME.sealed); mLog(MG, `${MG.members[who].name} met ${MG.cards[a.k].n} en vente : sous enveloppe !`); return true; }
      if (!inR(a.v, mMin(MG, who), mMax(MG, who))) return false;
      MG.ph = { k: 'open', c: a.k, nom: who, high: a.v, lead: who, out: [], hist: [[who, a.v]] }; MG.pid++; MG.dl = Date.now() + TIME.open * 1000;
      mLog(MG, `${MG.members[who].name} met ${MG.cards[a.k].n} en vente et ouvre à ${ki(a.v)}.`); mOpenEnd(MG); return true;
    }
    case 'open': {
      if (a.t === 'pass') { if (who === ph.lead || ph.out.includes(who)) return false; ph.out.push(who); mOpenEnd(MG); return true; }
      if (a.t !== 'bid' || !mCanBid(MG, who) || !inR(a.v, ph.high + K, mMax(MG, who))) return false;
      ph.high = a.v; ph.lead = who; ph.hist = [[who, a.v], ...ph.hist].slice(0, 8); mLog(MG, `${MG.members[who].name} surenchérit à ${ki(a.v)}.`); mOpenEnd(MG); return true;
    }
    case 'sealed': {
      const elig = MG.members.map((_, i) => i).filter(i => mCanUse(MG, i, ph.c));
      // on ne reçoit qu'une empreinte : personne, pas même l'arbitre, ne voit la mise avant que tout le monde ait validé
      if (a.t === 'seal' && !ph.reveal && elig.includes(who) && ph.com[who] == null && isHash(a.v)) { ph.com[who] = a.v; ph.ct[who] = Date.now(); if (elig.every(i => ph.com[i] != null)) mSealReveal(MG, elig); return true; }
      return false;
    }
    case 'pick': { if (who !== ph.who || a.t !== 'pick' || !mCanUse(MG, who, a.k)) return false; ph.c = a.k; mAward(MG, who, 0, { free: true }); return true; }
    case 'order': {
      if (a.t !== 'order' || !MG.members[who].chef || ph.reveal) return false; const t = MG.members[who].team;
      if (ph.com[t] != null || !isHash(a.v)) return false;
      ph.com[t] = a.v; ph.ready[t] = true; if (ph.ready[0] && ph.ready[1]) mOrderReveal(MG); return true;
    }
  }
  return false;
}
/* ---------- secrets inviolables du salon : empreinte d'abord, ouverture ensuite (comme le duel) ---------- */
const isHash = v => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const mHash = (kind, pid, uid, v, salt) => sha(`${Y.code}:${pid}:${uid}:${kind}:${JSON.stringify(v)}:${salt}`);
const mKey = (kind, pid) => `mx:${Y.code}:${kind}:${pid}`;
function mSecret(kind, pid) { try { return JSON.parse(sessionStorage.getItem(mKey(kind, pid)) || 'null') || Y.secrets[mKey(kind, pid)] || null; } catch (e) { return Y.secrets[mKey(kind, pid)] || null; } }
async function mCommitSecret(kind, t, v) {
  const MG = Y.G, pid = MG.pid, salt = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
  Y.secrets[mKey(kind, pid)] = { v, salt }; try { sessionStorage.setItem(mKey(kind, pid), JSON.stringify({ v, salt })); } catch (e) { /* rien */ }
  mAct(t, await mHash(kind, pid, Y.uid, v, salt));
}
// quand l'ouverture commence, chaque appareil envoie lui-même sa mise et la preuve (renvoyée toutes les 3 s si besoin)
function mAutoReveal(MG) {
  const ph = MG.ph, me = Y.me; if (me == null || !ph.reveal) return;
  const kind = ph.k === 'sealed' ? 'mseal' : ph.k === 'order' && MG.members[me].chef ? 'morder' : null; if (!kind) return;
  const slot = kind === 'mseal' ? me : MG.members[me].team; if (ph.rv[slot] || !isHash(ph.com[slot])) return;
  const key = MG.pid + ':' + kind; if (Y.rev?.key === key && Date.now() - Y.rev.t < 3000) return;
  const sec = mSecret(kind, MG.pid); if (!sec) return; Y.rev = { key, t: Date.now() };
  mAct('reveal', sec.v, { salt: sec.salt, kind });
}
// l'arbitre vérifie que la mise ouverte correspond bien à l'empreinte envoyée avant
async function mHandle(w, a) {
  const MG = Y.G; if (!MG || a.t === 'revealed') return;
  if (a.t !== 'reveal') { if (mApply(MG, w, a)) mCommit(); return; }
  const ph = MG.ph; if (!ph.reveal || a.pid !== MG.pid) return;
  const slot = ph.k === 'sealed' && a.kind === 'mseal' ? w : ph.k === 'order' && a.kind === 'morder' && MG.members[w].chef ? MG.members[w].team : null;
  if (slot == null || ph.rv[slot] || !isHash(ph.com[slot])) return;
  const ok = ph.com[slot] === await mHash(a.kind, MG.pid, MG.members[w].uid, a.v, a.salt);
  if (Y?.G !== MG || MG.ph !== ph || ph.rv[slot]) return;
  if (ph.k === 'sealed') mSealOpened(MG, slot, ok ? a.v : null); else mOrderOpened(MG, slot, ok ? a.v : null);
  mCommit();
}
const mElig = MG => MG.members.map((_, i) => i).filter(i => mCanUse(MG, i, MG.ph.c));
function mSealReveal(MG, elig) {
  const ph = MG.ph; for (const i of elig) if (ph.com[i] == null) { ph.com[i] = 'defaut'; ph.rv[i] = true; }
  ph.reveal = true; MG.dl = Date.now() + TIME.unseal * 1000; mLog(MG, 'Toutes les enveloppes sont fermées : ouverture.');
  if (elig.every(i => ph.rv[i])) mSealClose(MG, elig);
}
function mSealOpened(MG, i, v) {
  const ph = MG.ph, inR = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi && (x % K === 0 || x === hi);
  const ok = v != null && (i === ph.nom ? inR(v, mMin(MG, i), mMax(MG, i)) : (v === 0 || inR(v, K, mMax(MG, i))));
  ph.rv[i] = true; if (ok) ph.vals[i] = v; else mLog(MG, `${MG.members[i].name} : enveloppe invalide, mise minimale appliquée.`);
  const elig = mElig(MG); if (elig.every(j => ph.rv[j])) mSealClose(MG, elig);
}
function mSealClose(MG, elig) {
  const ph = MG.ph, bids = {}; for (const i of elig) bids[i] = ph.vals[i] ?? (i === ph.nom ? mMin(MG, i) : 0);
  let w = ph.nom; for (const i of elig) { const b = bids[i], bw = bids[w] ?? -1; if (b > bw || (b === bw && i !== w && w !== ph.nom && (ph.ct[i] || 9e15) < (ph.ct[w] || 9e15))) w = i; }
  mAward(MG, w, bids[w] || 0, { sealed: true, bids, proof: elig.every(i => ph.com[i] === 'defaut' || ph.vals[i] != null) });
}
const mTeam = (MG, t) => MG.members.map((m, i) => i).filter(i => MG.members[i].team === t);
function mOrderReveal(MG) {
  const ph = MG.ph; for (const t of [0, 1]) if (ph.com[t] == null) { ph.com[t] = 'defaut'; ph.ready[t] = true; ph.rv[t] = true; ph.vals[t] = mTeam(MG, t); mLog(MG, `${TEAM_NAMES[t]} : ordre par défaut (temps écoulé).`); }
  ph.reveal = true; MG.dl = Date.now() + TIME.unseal * 1000;
  if (ph.rv[0] && ph.rv[1]) mOrderDone(MG);
}
function mOrderOpened(MG, t, v) {
  const ph = MG.ph, team = mTeam(MG, t), ok = Array.isArray(v) && v.length === team.length && v.every(i => team.includes(i)) && new Set(v).size === team.length;
  ph.rv[t] = true; ph.vals[t] = ok ? v : team; if (!ok) mLog(MG, `${TEAM_NAMES[t]} : ordre invalide, ordre par défaut.`);
  if (ph.rv[0] && ph.rv[1]) mOrderDone(MG);
}
function mOrderDone(MG) { const ph = MG.ph; for (const t of [0, 1]) if (!ph.rv[t]) ph.vals[t] = mTeam(MG, t); MG.order = [ph.vals[0], ph.vals[1]]; mFightsStart(MG); }
function mTimeout(MG) {
  const ph = MG.ph;
  switch (ph.k) {
    case 'nominate': { const L = MG.market.filter(m => mCanUse(MG, ph.who, m.k)); const m = L[Math.floor(Math.random() * L.length)]; if (!m) return mNext(MG); mLog(MG, `${MG.members[ph.who].name} n'a pas choisi à temps : carte tirée au hasard.`); return mApply(MG, ph.who, { t: 'nom', k: m.k, v: mMin(MG, ph.who), pid: MG.pid }); }
    case 'open': mLog(MG, 'Fin du chrono.'); return mAward(MG, ph.lead, ph.high, { why: 'clock' });
    case 'sealed': { const elig = mElig(MG); if (!ph.reveal) return mSealReveal(MG, elig); for (const i of elig) if (!ph.rv[i]) mLog(MG, `${MG.members[i].name} n'a pas ouvert son enveloppe : mise minimale.`); return mSealClose(MG, elig); }
    case 'pick': { const L = MG.market.filter(m => mCanUse(MG, ph.who, m.k)); if (L[0]) mApply(MG, ph.who, { t: 'pick', k: L[Math.floor(Math.random() * L.length)].k, pid: MG.pid }); return true; }
    case 'done': return mNext(MG);
    case 'recap': mPh(MG, { k: 'order', ready: [false, false], com: {}, rv: {}, vals: {}, reveal: false }, TIME.order); mLog(MG, 'Chaque chef range maintenant ses joueurs en secret.'); return true;
    case 'order': return ph.reveal ? mOrderDone(MG) : mOrderReveal(MG);
  }
}
function mAfterAuction(MG) {
  if (MG.mode === 'equipes') { MG.stage = 'order'; mPh(MG, { k: 'recap' }, TIME.recap); mLog(MG, 'Mercato terminé : récap des deux équipes, puis chaque chef range ses joueurs en secret (qui affronte qui).'); return; }
  mFightsStart(MG);
}
// tableau des combats
function mFightsStart(MG) {
  MG.stage = 'fights'; MG.matches = []; MG.round = 0; mPh(MG, { k: 'fights' }, 0);
  const N = MG.members.length, ids = shuffle(MG.members.map((_, i) => i));
  if (MG.mode === 'equipes') { const k = MG.order[0].length; for (let p = 0; p < k; p++) mMatch(MG, MG.order[0][p], MG.order[1][p], 1, `Position ${p + 1}`); mLog(MG, 'Les combats commencent : position 1 contre position 1, et ainsi de suite.'); return; }
  if (N === 6) { MG.groups = [ids.slice(0, 3), ids.slice(3)]; mPoolRound(MG); return; }
  MG.bracket = [ids]; for (let j = 0; j < ids.length; j += 2) mMatch(MG, ids[j], ids[j + 1], 1, N === 8 ? 'Quart de finale' : 'Demi-finale');
  mLog(MG, `Tableau tiré au sort : ${N === 8 ? 'quarts de finale' : 'demi-finales'} en cours.`);
}
function mMatch(MG, a, b, round, label) { MG.matches.push({ id: MG.matches.length, code: mkCode(4), a, b, w: null, hp: null, round, label }); MG.round = round; }
const POOL_PAIRS = [[0, 1], [0, 2], [1, 2]];
function mPoolRound(MG) { const r = MG.round + 1; if (r > 3) return mPoolFinal(MG); for (const [g, grp] of MG.groups.entries()) { const [x, y] = POOL_PAIRS[r - 1]; mMatch(MG, grp[x], grp[y], r, `Poule ${g ? 'B' : 'A'}, tour ${r}`); } mLog(MG, `Poules : tour ${r} sur 3.`); }
function mPoolStand(MG, grp) { return grp.map(i => { const M = MG.matches.filter(m => m.label?.startsWith('Poule') && (m.a === i || m.b === i) && m.w != null); return { i, w: M.filter(m => m.w === i).length, hp: M.reduce((s, m) => s + (m.hp ? (m.a === i ? m.hp[0] : m.hp[1]) : 0), 0) }; }).sort((p, q) => q.w - p.w || q.hp - p.hp); }
function mPoolFinal(MG) { const a = mPoolStand(MG, MG.groups[0])[0].i, b = mPoolStand(MG, MG.groups[1])[0].i; mMatch(MG, a, b, 4, 'Finale'); mLog(MG, `Finale : ${MG.members[a].name} contre ${MG.members[b].name}.`); }
// un résultat de combat est arrivé : on avance le tableau quand le tour est fini
function mRoundDone(MG) {
  const cur = MG.matches.filter(m => m.round === MG.round); if (cur.some(m => m.w == null)) return false;
  if (MG.mode === 'equipes') {
    const wins = [0, 0], hp = [0, 0]; for (const m of cur) { const t = MG.members[m.w].team; wins[t]++; if (m.hp) { hp[MG.members[m.a].team] += m.hp[0]; hp[MG.members[m.b].team] += m.hp[1]; } }
    const wt = wins[0] !== wins[1] ? (wins[0] > wins[1] ? 0 : 1) : hp[0] >= hp[1] ? 0 : 1;
    MG.teamScore = wins; mOver(MG, { team: wt, why: wins[0] === wins[1] ? 'hp' : 'wins' }); return true;
  }
  if (MG.groups) { if (MG.round < 3) { mPoolRound(MG); return true; } if (MG.round === 3) { mPoolFinal(MG); return true; } mOver(MG, { champ: cur[0].w }); return true; }
  const win = cur.map(m => m.w); if (win.length === 1) { mOver(MG, { champ: win[0] }); return true; }
  const nr = MG.round + 1; for (let j = 0; j < win.length; j += 2) mMatch(MG, win[j], win[j + 1], nr, win.length === 4 ? 'Demi-finale' : 'Finale');
  mLog(MG, win.length === 4 ? 'Demi-finales en cours.' : `Finale : ${MG.members[win[0]].name} contre ${MG.members[win[1]].name}.`); return true;
}
function mOver(MG, r) { MG.stage = 'over'; MG.result = r; mPh(MG, { k: 'over' }, 0); mLog(MG, r.team != null ? `${TEAM_NAMES[r.team]} remporte le match (${MG.teamScore[r.team]}-${MG.teamScore[1 - r.team]}${r.why === 'hp' ? ', aux PV restants' : ''}) !` : `${MG.members[r.champ].name} remporte le Mercato royale !`); }

/* ---------- combat d'un match : un vrai duel « combat unique » créé par le premier des deux joueurs qui arrive ---------- */
function fightState(MG, m, meIdx) {
  const oIdx = meIdx === m.a ? m.b : m.a, P = [meIdx, oIdx].map(i => ({ uid: MG.members[i].uid, name: MG.members[i].name, budget: MG.bid[i].budget, own: MG.bid[i].own.slice(), sd: [] }));
  const cards = {}, market = []; for (const i of [meIdx, oIdx]) for (const k of MG.bid[i].own) { cards[k] = MG.cards[k]; const mm = MG.market.find(x => x.k === k); market.push({ k, env: false, by: i === meIdx ? 0 : 1, price: mm?.price || 0 }); }
  const G = { v: 1, code: m.code, seq: 1, pid: 1, stage: 'fight', first: 0, nom: 0, score: [0, 0], comp: [[P[0].own], [P[1].own]], log: [`${m.label} du salon ${MG.code}.`], over: null, dl: 0, players: P, cards, market, sdm: null, roles: MG.roles, single: true, label: m.label, back: '#jeux/mercato/salon/' + MG.code, ph: { k: 'fight', n: 1 },
    fights: [{ n: 1, A: P[0].own.slice(), B: P[1].own.slice(), starter: Math.random() < .5 ? 0 : 1, seed: 1 + Math.floor(Math.random() * 2147483000), moves: [], w: null }] };
  return G;
}
async function playMatch(m) {
  const MG = Y.G, me = Y.me; if (me == null || (me !== m.a && me !== m.b)) return;
  const o = me === m.a ? m.b : m.a, G = fightState(MG, m, me);
  const { error } = await Y.db.createFight({ code: m.code, host_name: Y.myName, guest: MG.members[o].uid, guest_name: MG.members[o].name, status: 'playing', state: G });
  if (error && !/duplicate|unique/i.test(error.message || '')) { Y.ctx.toast?.('Impossible de lancer le combat : ' + error.message); return; }
  location.hash = '#jeux/mercato/' + m.code;
}
// l'arbitre du salon relève les résultats des combats terminés
async function mPoll() {
  const MG = Y?.G; if (!Y?.host || !MG || MG.stage !== 'fights') return;
  const open = MG.matches.filter(m => m.w == null); if (!open.length) return;
  const { data } = await Y.db.fights(open.map(m => m.code)); if (!Y || Y.G !== MG) return;
  let changed = false;
  for (const r of data || []) {
    const m = MG.matches.find(x => x.code === r.code); if (!m || m.w != null || r.status !== 'over' || !r.winner) continue;
    const ua = MG.members[m.a].uid; m.w = r.winner === ua ? m.a : m.b;
    const sum = Array.isArray(r.f) ? r.f[r.f.length - 1]?.sum : null;
    if (sum) { const pct = side => (side || []).reduce((s, x) => s + x.hp / (x.max || 1), 0) / 3; const aIsHost = r.host === ua; m.hp = aIsHost ? [pct(sum.A), pct(sum.B)] : [pct(sum.B), pct(sum.A)]; }
    mLog(MG, `${m.label} : ${MG.members[m.w].name} bat ${MG.members[m.w === m.a ? m.b : m.a].name}.`); changed = true;
  }
  if (changed) { mRoundDone(MG); mCommit(); }
}

/* ---------- réseau, page du salon ---------- */
async function multiGame(m, ctx, code) {
  const { sb, S } = ctx, uid = S.user.id, name = S.profile?.discord || 'Membre', db = ctx.db || supaDB(sb, uid);
  Y = { ctx, db, code, uid, myName: name, me: null, host: false, G: null, timers: [], online: new Set(), secrets: {}, rev: null, sel: null, draft: null, off: null };
  Y.onHash = () => { if (!location.hash.startsWith('#jeux/mercato/salon/' + code)) multiCleanup(); };
  window.addEventListener('hashchange', Y.onHash);
  m.innerHTML = `<div class="mx mx-multi" id="mx"><div class="mx-top" id="myTop"></div><div class="mx-mhud" id="myHud"></div><div class="card mx-act" id="myAct"><div class="mute">Chargement…</div></div><div id="myMain"></div><details class="card mx-logw"><summary><b>Journal</b></summary><div class="mx-log" id="myLog"></div></details></div>`;
  Y.root = m;
  let { data: row } = await db.get(code);
  if (!row) { m.querySelector('#myAct').innerHTML = `<p>Aucun salon avec le code <b>${esc(code)}</b>.</p><a class="btn" href="#jeux/mercato">Retour</a>`; return; }
  if (!(row.players || []).includes(uid) && row.status === 'lobby') { const r = await db.joinMulti(code, name); if (r.error) { m.querySelector('#myAct').innerHTML = `<p class="red">${esc(r.error.message)}</p><a class="btn" href="#jeux/mercato">Retour</a>`; return; } row = r.data || row; }
  if (!Y) return;
  Y.row = row; Y.host = row.host === uid; Y.pool = buildPool(ctx); Y.roles = Object.keys(ctx.ROLE);
  const net = Y.net = (ctx.net || supaNet)(sb, code, uid);
  // l'arbitre du salon est le premier joueur présent (le créateur s'il est là) : le tableau avance même si le créateur joue son combat
  net.onPresence(async ids => { Y.online = new Set(ids); await mElect(); mRender(); });
  net.on('act', a => { if (!Y.host || !Y.G) return; const w = Y.G.members.findIndex(x => x.uid === a.uid); if (w < 0) return; mHandle(w, a); });
  net.on('hello', async () => { if (!Y.host) return; await mSyncMembers(); if (Y.G) mSend(); });
  net.on('emote', p => mShowEmote(p));
  net.on('state', s => { if (!s) return; if (Y.host && s.seq <= (Y.G?.seq || 0)) return; if (Y.G && s.seq < Y.G.seq) return; if (Y.host) Y.host = false; const d = Date.now() - (s.now || Date.now()); Y.off = Y.off == null ? d : Math.min(Y.off, d); Y.G = s; mRender(); });
  await net.start(); if (!Y) return;
  Y.G = row.state?.multi ? row.state : null;
  if (Y.G && Y.G.stage !== 'lobby') { Y.host = false; await new Promise(r => setTimeout(r, 1200)); if (!Y) return; await mElect(); if (!Y.host) net.send('hello', { uid }); }
  else if (Y.host) { if (!Y.G) { Y.G = { v: 1, multi: true, mode: row.mode, size: row.max_players, code, seq: 0, pid: 0, stage: 'lobby', members: [], cards: {}, market: [], bid: [], log: [], roles: Y.roles, ph: { k: 'lobby' }, dl: 0 }; } await mSyncMembers(); if (Y.G.dl) Y.G.dl = Date.now() + 20000; mCommit(); }
  else net.send('hello', { uid });
  Y.timers.push(setInterval(mTick, 500));
  Y.timers.push(setInterval(() => { if (!Y) return; Y.root.querySelectorAll('[data-dl]').forEach(el => { const left = +el.dataset.dl - (Date.now() - (Y.host ? 0 : Y.off || 0)), s = Math.max(0, Math.ceil(left / 1000)), b = el.querySelector('b'), u = el.querySelector('u'); if (b) b.textContent = s + ' s'; if (u) u.style.transform = `scaleX(${Math.max(0, Math.min(1, left / 1000 / (+el.dataset.tot || 30))).toFixed(3)})`; el.classList.toggle('hot', s <= 5); }); }, 100));
  Y.timers.push(setInterval(mPoll, 4000));
  emoteBar();
  mRender();
}
async function mElect() {
  const MG = Y?.G; if (!MG || !MG.members.length) return;
  const auth = MG.stage === 'lobby' ? Y.row.host : MG.members.find(m => Y.online.has(m.uid))?.uid, was = Y.host;
  Y.host = auth === Y.uid;
  if (Y.host && !was) { const { data } = await Y.db.get(Y.code); if (Y && data?.state?.multi && data.state.seq > (Y.G?.seq || 0)) Y.G = data.state; if (Y?.G) { if (Y.G.dl) Y.G.dl = Date.now() + 15000; mCommit(); } }
}
// le salon reprend la liste des joueurs inscrits (table) ; en équipes, chacun est placé dans l'équipe la moins remplie
async function mSyncMembers() {
  const { data: row } = await Y.db.get(Y.code); if (!row || !Y?.G || Y.G.stage !== 'lobby') return;
  const MG = Y.G, names = row.names || {};
  for (const u of row.players || []) if (!MG.members.some(x => x.uid === u)) { const t = MG.mode === 'equipes' ? (MG.members.filter(x => x.team === 0).length <= MG.members.filter(x => x.team === 1).length ? 0 : 1) : null; MG.members.push({ uid: u, name: names[u] || (u === row.host ? row.host_name : 'Membre'), team: t, chef: false }); }
  MG.members = MG.members.filter(x => (row.players || []).includes(x.uid));
  mCommit();
}
function mCommit() { const MG = Y.G; MG.seq++; MG.now = Date.now(); mSend(); mRender(); clearTimeout(Y.saveT); Y.saveT = setTimeout(() => Y?.db.save(Y.code, { state: Y.G, status: Y.G.stage === 'lobby' ? 'lobby' : Y.G.stage === 'over' ? 'over' : 'playing', ...(Y.G.stage === 'over' && Y.G.result?.champ != null ? { winner: Y.G.members[Y.G.result.champ].uid } : {}) }), 500); }
function mSend() { if (Y?.host && Y.G) { Y.G.now = Date.now(); Y.net.send('state', Y.G); } }
function mAct(t, v, extra = {}) { const MG = Y.G; if (!MG || Y.me == null) return; const a = { t, v, pid: MG.pid, c: MG.ph?.c, uid: Y.uid, ...extra }; if (Y.host) mHandle(Y.me, a); else Y.net.send('act', a); }
function mTick() { const MG = Y?.G; if (!Y?.host || !MG || MG.stage === 'lobby' || MG.stage === 'over' || !MG.dl) return; if (Date.now() > MG.dl + (MG.ph.k === 'open' ? 300 : 0)) { MG.dl = 0; mTimeout(MG); mCommit(); } }
async function mStartGame() {
  const MG = Y.G; if (!Y.host || MG.stage !== 'lobby') return;
  if (Y.ctx.sb && !TIERS.size) await loadTiers(Y.ctx.sb);
  mStart(MG); mCommit();
}

/* ---------- affichage ---------- */
const mTimer = MG => { if (!MG.dl || MG.ph.k === 'done') return ''; const tot = MG.ph.reveal ? TIME.unseal : MG.ph.k === 'order' ? TIME.order : TIME[MG.ph.k] || 30, left = MG.dl - (Date.now() - (Y.host ? 0 : Y.off || 0)), s = Math.max(0, Math.ceil(left / 1000)); return `<span class="mx-timer ${s <= 5 ? 'hot' : ''}" data-dl="${MG.dl}" data-tot="${tot}"><b>${s} s</b><i><u style="transform:scaleX(${Math.max(0, Math.min(1, left / 1000 / tot)).toFixed(3)})"></u></i></span>`; };
function mRender() {
  if (!Y?.root) return; const MG = Y.G, R = Y.root, $ = s => R.querySelector(s); if (!$('#mx') || !MG) return;
  Y.me = MG.members.findIndex(x => x.uid === Y.uid); if (Y.me < 0) Y.me = null;
  const me = Y.me, ph = MG.ph, link = location.origin + location.pathname + '#jeux/mercato/salon/' + Y.code;
  const modeLbl = MG.mode === 'royale' ? `Mercato royale à ${MG.size}` : `Équipes ${MG.size / 2} contre ${MG.size / 2}`;
  const stageLbl = { lobby: 'Salon', auction: 'Mercato', order: 'Ordre des équipes', fights: 'Combats', over: 'Fin' }[MG.stage];
  $('#myTop').innerHTML = `<div class="mx-title"><b>${modeLbl}</b><span class="mx-stage-lbl">${stageLbl}</span><span class="small mute">Salon ${esc(Y.code)}</span></div><div class="row mx-topb"><a class="btn ghost" href="#jeux/mercato">Quitter</a></div>`;
  $('#myHud').innerHTML = MG.stage === 'lobby' ? '' : mHud(MG);
  $('#myLog').innerHTML = MG.log.map(l => `<div>${esc(l)}</div>`).join('');
  if (MG.stage === 'lobby') { $('#myAct').innerHTML = mLobbyHTML(MG, link); $('#myMain').innerHTML = ''; }
  else if (MG.stage === 'auction') { $('#myAct').innerHTML = mActHTML(MG); $('#myMain').innerHTML = mMarketHTML(MG); }
  else if (MG.stage === 'order') { $('#myAct').innerHTML = mOrderHTML(MG); $('#myMain').innerHTML = mRecapHTML(MG); }
  else { $('#myAct').innerHTML = mBoardHTML(MG); $('#myMain').innerHTML = ''; }
  mWire(MG); mAutoReveal(MG);
  // sons : nouvelle mise, adjugé, à toi
  const prev = Y.snd, cur = { pid: MG.pid, k: ph.k, high: ph.high, mine: me != null && ((ph.k === 'nominate' || ph.k === 'pick') && ph.who === me) }; Y.snd = cur;
  if (prev) { if (cur.k === 'open' && prev.k === 'open' && cur.high > prev.high) sfx('bid'); else if (cur.k === 'done' && prev.k !== 'done') sfx(ph.free ? 'free' : 'stamp'); else if ((cur.k === 'open' || cur.k === 'sealed') && prev.k !== cur.k) sfx('drop'); if (cur.mine && !prev.mine) sfx('turn'); if (cur.k === 'over' && prev.k !== 'over') sfx('over'); }
}
function mLobbyHTML(MG, link) {
  const me = Y.me, full = MG.members.length === MG.size, per = MG.size / 2;
  const ok = MG.mode === 'royale' ? full : full && [0, 1].every(t => MG.members.filter(m => m.team === t).length === per && MG.members.some(m => m.team === t && m.chef));
  const person = (m, i) => `<li class="${m.uid === Y.uid ? 'me' : ''}" data-uid="${esc(m.uid)}"><i class="mx-dot ${Y.online.has(m.uid) ? 'ok' : ''}"></i><b>${esc(m.name)}</b>${m.chef ? '<span class="mx-chef">Chef</span>' : ''}${i === 0 ? '<span class="small mute">créateur</span>' : ''}</li>`;
  const list = MG.mode === 'royale' ? `<ul class="mx-roster">${MG.members.map(person).join('')}${Array.from({ length: MG.size - MG.members.length }, () => '<li class="empty">Place libre</li>').join('')}</ul>`
    : `<div class="mx-teamsel">${[0, 1].map(t => { const L = MG.members.map((m, i) => [m, i]).filter(([m]) => m.team === t), mine = me != null && MG.members[me].team === t;
      return `<div class="mx-tcol" data-team="${t}"><h3>${TEAM_NAMES[t]} <span class="small mute">${L.length}/${per}</span></h3><ul class="mx-roster">${L.map(([m, i]) => person(m, i)).join('')}${Array.from({ length: per - L.length }, () => '<li class="empty">Place libre</li>').join('')}</ul>
        ${me != null && !mine && L.length < per ? `<button class="btn ghost" data-team-go="${t}">Rejoindre ${TEAM_NAMES[t].toLowerCase()}</button>` : ''}${mine && !MG.members[me].chef ? '<button class="btn ghost" data-chef>Devenir chef</button>' : ''}</div>`; }).join('')}</div>`;
  const why = !full ? `En attente : ${MG.members.length}/${MG.size} joueurs.` : !ok ? 'Chaque équipe doit avoir un chef.' : 'Tout le monde est là.';
  return `<div class="mx-acth"><h2>Salon ${esc(Y.code)}</h2></div><p>Envoie ce code à tes amis : <b class="mx-code">${esc(Y.code)}</b> <button class="btn ghost" id="myCopy">Copier le lien</button></p>${list}
    <p class="small ${ok ? '' : 'mute'}">${why}</p>${Y.host ? `<button class="btn primary" id="myStart" ${ok ? '' : 'disabled'}>Lancer le mercato</button>` : '<p class="small mute">Le créateur lance la partie quand tout le monde est prêt.</p>'}
    <div class="card section"><h3>Règles</h3><ul class="mx-rules"><li>Un seul marché pour tout le salon. <b>Chaque joueur achète un trio</b> (3 cartes de 3 rôles différents) avec son propre budget de 1 000 000 KI.</li><li>Chacun son tour, un joueur met une carte en vente ; enchère chrono de 30 s ouverte à tous. Celui qui ne veut plus enchérir passe.</li>
    ${MG.mode === 'equipes' ? '<li><b>On ne peut pas enchérir contre un coéquipier</b> qui mène. Avant les combats, chaque chef range ses joueurs en secret : position 1 contre position 1, et ainsi de suite. L\'équipe qui gagne le plus de combats l\'emporte (à égalité : PV restants).</li>' : `<li>Combats : ${MG.size === 6 ? 'deux poules de 3 (chacun affronte les deux autres), puis finale entre les premiers de poule' : MG.size === 8 ? 'quarts, demi-finales et finale' : 'demi-finales et finale'}. Chaque combat est un duel en direct, tous en même temps.</li>`}</ul></div>`;
}
function mHud(MG) {
  return `<div class="mx-mlist">${MG.members.map((m, i) => { const b = MG.bid[i] || { budget: BUDGET, own: [] }, act = (MG.ph.k === 'nominate' || MG.ph.k === 'pick') ? MG.ph.who === i : MG.ph.k === 'open' ? MG.ph.lead === i : false;
    return `<div class="mx-mp ${act ? 'on' : ''} ${i === Y.me ? 'me' : ''}" data-uid="${esc(m.uid)}" ${m.team != null ? `data-team="${m.team}"` : ''}><div class="mx-pln"><b>${esc(m.name)}</b>${m.chef ? '<span class="mx-chef">Chef</span>' : ''}<i class="mx-dot ${Y.online.has(m.uid) ? 'ok' : ''}"></i></div><div class="mx-money">${grp(b.budget)}<small>KI</small></div>
      <div class="mx-slots" style="--n:3">${[0, 1, 2].map(k => { const c = b.own[k] && MG.cards[b.own[k]]; return `<span class="mx-slot ${c ? 'full' : ''}" title="${c ? esc(c.n) : 'Place libre'}">${c ? cardImg(c) + `<span class="mx-slotr" data-role="${esc(c.role)}">${roleIco(c.role)}</span>` : ''}</span>`; }).join('')}</div></div>`; }).join('')}</div>`;
}
function mActHTML(MG) {
  const me = Y.me, ph = MG.ph, nm = i => i === me ? 'Tu' : esc(MG.members[i].name), c = ph.c && MG.cards[ph.c];
  const head = (t, sub) => `<div class="mx-acth"><h2>${t}</h2>${mTimer(MG)}</div>${sub ? `<p class="mute small">${sub}</p>` : ''}`;
  switch (ph.k) {
    case 'nominate':
      if (ph.who !== me) return head(`${esc(MG.members[ph.who].name)} choisit une carte`, 'Il choisit la carte mise en vente.') + wait('En attente…');
      if (!Y.sel || !mCanUse(MG, me, Y.sel)) return head('À toi de vendre une carte', 'Touche une carte du marché que tu peux recruter.');
      return head('Mettre en vente', '') + bigCard(MG, Y.sel) + (MG.market.find(x => x.k === Y.sel).env ? `<div class="row"><button class="btn primary" id="myNomEnv">Mettre en vente sous enveloppe</button><button class="btn ghost" id="myUnsel">Autre carte</button></div>` : bidBox(MG, mMin(MG, me), mMax(MG, me), 'Mettre en vente et ouvrir', { pass: 'Autre carte' }));
    case 'open': {
      const leadMe = ph.lead === me, mate = me != null && mates(MG, me, ph.lead), can = me != null && mCanBid(MG, me);
      const top = head('Enchère chrono', leadMe ? 'Tu es en tête.' : `${esc(MG.members[ph.lead].name)} est en tête.`) + `<div class="mx-amtw"><div class="mx-amt" data-v="${ph.high}">${grp(ph.high)} <small>KI</small></div><span class="mx-leader ${leadMe ? 'me' : ''}">${leadMe ? 'Tu mènes' : esc(MG.members[ph.lead].name) + ' mène'}</span></div>` + bigCard(MG, ph.c) + `<ol class="mx-feed">${ph.hist.map(([w, v], n) => `<li class="${n ? '' : 'top'} ${w === me ? 'me' : ''}"><b>${w === me ? 'Toi' : esc(MG.members[w].name)}</b><span>${ki(v)}</span></li>`).join('')}</ol>`;
      if (me == null || leadMe) return top + wait('Les autres peuvent encore surenchérir…');
      if (mate) return top + `<p class="small mx-ready">Ton coéquipier ${esc(MG.members[ph.lead].name)} mène : tu ne peux pas enchérir contre lui.</p>`;
      if (ph.out.includes(me)) return top + '<p class="small mute">Tu as passé sur cette carte.</p>';
      if (!can) return top + '<p class="small mute">Tu ne peux pas enchérir sur cette carte (rôle déjà pris ou KI insuffisants).</p>';
      const mx = mMax(MG, me), quick = [[K, '+10 000'], [5 * K, '+50 000'], [10 * K, '+100 000']].filter(([d]) => ph.high + d <= mx);
      return top + `<div class="mx-snipe"><span class="mx-snipeh"><b>${grp(ph.high)} KI</b> · ${esc(MG.members[ph.lead].name)} mène</span>${quick.map(([d, l]) => `<button class="mx-sbtn" data-mbid="${ph.high + d}"><b>${l}</b><small>${ki(ph.high + d)}</small></button>`).join('')}<button class="mx-sbtn pass" data-mpass><b>Je passe</b><small>sur cette carte</small></button></div>`;
    }
    case 'sealed': {
      const elig = me != null && mCanUse(MG, me, ph.c), done = me != null && ph.com[me] != null, n = Object.keys(ph.com).length;
      if (ph.reveal) { const o = Object.keys(ph.rv).length; return head('Ouverture des enveloppes', `${o}/${Object.keys(ph.com).length} ouvertes. Chaque mise est vérifiée avec son empreinte.`) + bigCard(MG, ph.c) + wait('Ouverture…'); }
      const top = head('Enchère sous enveloppe', `Chacun mise en secret (${n} enveloppe${n > 1 ? 's' : ''} validée${n > 1 ? 's' : ''}). Les mises restent cachées, même pour l'arbitre, jusqu'à l'ouverture.`) + bigCard(MG, ph.c);
      if (!elig) return top + '<p class="small mute">Tu ne peux pas recruter cette carte.</p>';
      if (done) return top + wait('Enveloppe validée. En attente des autres…');
      return top + bidBox(MG, me === ph.nom ? mMin(MG, me) : K, mMax(MG, me), 'Valider mon enveloppe', { secret: true, pass: me === ph.nom ? null : 'Ne pas miser' });
    }
    case 'pick': return ph.who === me ? head('Complète ton trio gratuitement', 'Touche une carte compatible du marché.') : head(`${esc(MG.members[ph.who].name)} complète son trio`, '') + wait('En attente…');
    case 'done': { const bids = ph.bids ? Object.entries(ph.bids).map(([i, v]) => `${esc(MG.members[i].name)} ${ki(v)}`).join(', ') : ''; return head(`${nm(ph.w)} ${ph.w === me ? 'recrutes' : 'recrute'} ${esc(c.n)}`, ph.free ? 'Gratuitement.' : `Pour ${ki(ph.price)}.` + (bids ? ` Enveloppes : ${bids}${ph.proof ? ' (vérifiées)' : ''}.` : '')) + bigCard(MG, ph.c, { stamp: `<span class="mx-stamp slam"><b>Adjugé</b><small>${ph.w === me ? 'à toi' : 'à ' + esc(MG.members[ph.w].name)}</small></span>` }); }
  }
  return '';
}
function mMarketHTML(MG) {
  const me = Y.me, ph = MG.ph;
  return `<div class="mx-mkh"><h2>Le marché</h2><span class="small mute">${MG.market.filter(m => m.by == null).length} cartes à vendre. Touche une carte pour lire sa technique.</span></div><div class="mx-web">${MG.market.filter(m => !m.res).map((m, i) => { const c = MG.cards[m.k], sold = m.by != null, use = me == null || mCanUse(MG, me, m.k), click = (ph.k === 'nominate' || ph.k === 'pick') && ph.who === me && use && !sold, dur = SWAY[i % 3], del = -((Date.now() / 1000) % dur).toFixed(2);
    return `<div class="mx-cell"><button class="mx-card ${sold ? 'sold' : ''} ${!sold && !use ? 'nouse' : ''} ${click ? 'click' : ''} ${Y.sel === m.k ? 'sel' : ''} ${ph.c === m.k ? 'mx-live' : ''}" data-mk="${esc(m.k)}" style="--dur:${dur}s;--del:${del}s">${face(c, { env: m.env })}${sold ? `<span class="mx-sold"><b>${m.by === me ? 'À toi' : esc(MG.members[m.by].name)}</b>${m.price ? ki(m.price) : 'gratuit'}</span>` : ''}</button></div>`; }).join('')}</div>`;
}
function mOrderHTML(MG) {
  const me = Y.me, ph = MG.ph, t = me != null ? MG.members[me].team : null, chef = me != null && MG.members[me].chef;
  if (ph.k === 'recap') return `<div class="mx-acth"><h2>Récap des équipes</h2>${mTimer(MG)}</div><p class="mute small">Le mercato est fini : voici les personnages de chaque joueur, dans ton camp et dans le camp adverse. Ensuite, chaque chef range ses joueurs en secret.</p>`;
  const head = `<div class="mx-acth"><h2>${ph.reveal ? 'Ouverture des ordres' : 'Ordre des équipes'}</h2>${mTimer(MG)}</div><p class="mute small">Chaque chef range ses joueurs en secret : position 1 contre position 1 de l'autre équipe, et ainsi de suite. L'ordre reste caché, même pour l'arbitre, jusqu'à ce que les deux chefs aient validé. ${[0, 1].map(x => `${TEAM_NAMES[x]} : ${ph.ready[x] ? 'prête' : 'en cours'}`).join(' · ')}</p>`;
  if (!chef || ph.ready[t]) return head + wait(chef ? 'Ton ordre est validé.' : 'Ton chef choisit l\'ordre…');
  const team = MG.members.map((m, i) => i).filter(i => MG.members[i].team === t); if (!Y.ord || Y.ord.pid !== MG.pid) Y.ord = { pid: MG.pid, v: team.slice() };
  return head + `<ol class="mx-order">${Y.ord.v.map((i, p) => `<li><b>Position ${p + 1}</b><span>${esc(MG.members[i].name)}</span><span class="mx-otrio">${MG.bid[i].own.map(k => `<span class="mx-oimg" title="${esc(MG.cards[k].n)}">${cardImg(MG.cards[k])}</span>`).join('')}</span>${p ? `<button class="btn ghost" data-up="${p}">Monter</button>` : ''}</li>`).join('')}</ol><button class="btn primary" id="myOrder">Valider l'ordre</button>`;
}
// récap visuel : les trios de chaque joueur, ton camp d'abord, puis le camp adverse
function mRecapHTML(MG) {
  const me = Y.me, mt = me != null ? MG.members[me].team : 0, order = [mt, 1 - mt];
  return `<div class="mx-recap">${order.map(t => { const ids = mTeam(MG, t), spent = ids.reduce((a, i) => a + BUDGET - MG.bid[i].budget, 0);
    return `<section class="mx-rcol" data-team="${t}"><div class="mx-rhead"><h3>${TEAM_NAMES[t]}</h3><span class="small mute">${me != null ? (t === mt ? 'Ton camp' : 'Camp adverse') : ''} · ${ki(spent)} dépensés</span></div>
      ${ids.map(i => { const m = MG.members[i]; return `<div class="mx-rpl ${i === me ? 'me' : ''}" data-uid="${esc(m.uid)}"><div class="mx-rname"><b>${esc(m.name)}</b>${m.chef ? '<span class="mx-chef">Chef</span>' : ''}<span class="small mute">reste ${ki(MG.bid[i].budget)}</span></div>
        <div class="mx-rtrio">${MG.bid[i].own.map(k => { const c = MG.cards[k], mm = MG.market.find(x => x.k === k); return `<button class="mx-rcard" data-rk="${esc(k)}">${face(c, { mini: true })}${roleTag(c)}<span class="small mute">${mm?.price ? ki(mm.price) : 'gratuit'}</span></button>`; }).join('')}</div></div>`; }).join('')}</section>`; }).join('')}</div>`;
}
function mBoardHTML(MG) {
  const me = Y.me, nm = i => esc(MG.members[i].name);
  const matchRow = m => { const mine = me === m.a || me === m.b; return `<div class="mx-match ${m.w != null ? 'done' : ''} ${mine ? 'mine' : ''}"><span class="mx-mlbl">${esc(m.label)}</span><span class="mx-mvs"><b class="${m.w === m.a ? 'win' : ''}">${nm(m.a)}</b><i>contre</i><b class="${m.w === m.b ? 'win' : ''}">${nm(m.b)}</b></span>
    ${m.w != null ? `<span class="mx-mres">${nm(m.w)} gagne</span>` : mine ? `<button class="btn primary" data-play="${m.id}">Jouer mon combat</button>` : `<a class="btn ghost" href="#jeux/mercato/${m.code}">Regarder</a>`}</div>`; };
  const cur = MG.matches.filter(m => m.round === MG.round), past = MG.matches.filter(m => m.round !== MG.round);
  let head;
  if (MG.stage === 'over') { const r = MG.result; head = `<div class="mx-acth"><h2>${r.team != null ? '🏆 ' + TEAM_NAMES[r.team] + ' gagne' : '🏆 ' + nm(r.champ) + ' gagne le Mercato royale'}</h2></div>${r.team != null ? `<p>Score ${MG.teamScore[r.team]} - ${MG.teamScore[1 - r.team]}${r.why === 'hp' ? ', départagé aux PV restants' : ''}.</p>` : ''}`; }
  else head = `<div class="mx-acth"><h2>${MG.mode === 'equipes' ? 'Combats des équipes' : cur[0]?.label?.replace(/, tour.*/, '') || 'Combats'}</h2></div><p class="mute small">Chaque combat est un duel en direct. Le salon se met à jour tout seul quand un combat se termine.</p>`;
  const pools = MG.groups ? `<div class="mx-pools">${MG.groups.map((g, gi) => `<div class="mx-tcol"><h3>Poule ${gi ? 'B' : 'A'}</h3><table class="mx-rank"><tbody>${mPoolStand(MG, g).map((p, r) => `<tr class="${p.i === me ? 'me' : ''}"><td>${r + 1}</td><td>${nm(p.i)}</td><td>${p.w} V</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>` : '';
  return head + `<div class="mx-matches">${(MG.stage === 'over' ? [] : cur).map(matchRow).join('')}</div>${pools}${past.length || MG.stage === 'over' ? `<details class="mx-fsum" ${MG.stage === 'over' ? 'open' : ''}><summary><b>Tous les combats</b></summary><div class="mx-matches">${MG.matches.filter(m => m.w != null).map(matchRow).join('')}</div></details>` : ''}${MG.stage === 'over' ? '<div class="row"><a class="btn primary" href="#jeux/mercato">Retour</a></div>' : ''}`;
}
function mWire(MG) {
  const R = Y.root, $ = s => R.querySelector(s), me = Y.me, ph = MG.ph;
  $('#myCopy') && ($('#myCopy').onclick = () => navigator.clipboard?.writeText(location.origin + location.pathname + '#jeux/mercato/salon/' + Y.code).then(() => Y.ctx.toast?.('Lien copié')));
  $('#myStart') && ($('#myStart').onclick = () => mStartGame());
  R.querySelectorAll('[data-team-go]').forEach(b => b.onclick = () => mAct('team', +b.dataset.teamGo));
  R.querySelectorAll('[data-chef]').forEach(b => b.onclick = () => mAct('chef'));
  R.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { const k = b.dataset.mk; if (ph.k === 'nominate' && ph.who === me && mCanUse(MG, me, k)) { Y.sel = k; sfx('select'); mRender(); Y.root.querySelector('#myAct')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } if (ph.k === 'pick' && ph.who === me && mCanUse(MG, me, k)) { mAct('pick', null, { k }); return; } cardModal(MG, k); });
  $('#myUnsel') && ($('#myUnsel').onclick = () => { Y.sel = null; mRender(); });
  $('#myNomEnv') && ($('#myNomEnv').onclick = () => mAct('nom', 0, { k: Y.sel }));
  R.querySelectorAll('[data-mbid]').forEach(b => b.onclick = () => { mAct('bid', +b.dataset.mbid); b.classList.add('sent'); });
  R.querySelectorAll('[data-mpass]').forEach(b => b.onclick = () => mAct('pass'));
  const box = R.querySelector('.mx-bid');
  if (box) {
    const inp = $('#mxBid'), min = +box.dataset.min, max = +box.dataset.max, num = () => parseInt(inp.value.replace(/\D/g, ''), 10);
    inp.oninput = () => { const v = num(); inp.value = isNaN(v) ? '' : grp(v); }; inp.onblur = () => { const v = num(); if (!isNaN(v)) inp.value = grp(roundK(v, min, max)); };
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const v = num(); inp.value = grp(Math.min(max, roundK(isNaN(v) ? min : v, min, max) + +b.dataset.add)); });
    box.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { inp.value = grp(+b.dataset.set); });
    const go = () => { let v = num(); const err = t => { $('#mxBidErr').textContent = t; }; if (isNaN(v)) return err('Entre un montant.'); v = roundK(v, min, max); if (v < min) return err(`Mise minimum : ${ki(min)}.`); if (v > max) return err(`Mise maximum : ${ki(max)}.`); if (ph.k === 'nominate') mAct('nom', v, { k: Y.sel }); else if (ph.k === 'sealed') mCommitSecret('mseal', 'seal', v); };
    $('#mxBidGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  $('#mxPass') && ($('#mxPass').onclick = () => { if (ph.k === 'nominate') { Y.sel = null; mRender(); } else if (ph.k === 'sealed') mCommitSecret('mseal', 'seal', 0); });
  R.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => cardModal(MG, b.dataset.rk));
  R.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const p = +b.dataset.up, v = Y.ord.v; [v[p - 1], v[p]] = [v[p], v[p - 1]]; mRender(); });
  $('#myOrder') && ($('#myOrder').onclick = () => { $('#myOrder').disabled = true; mCommitSecret('morder', 'order', Y.ord.v.slice()); });
  R.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { b.disabled = true; playMatch(MG.matches[+b.dataset.play]); });
}

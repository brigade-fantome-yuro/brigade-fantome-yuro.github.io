// Kakashi Bot : moteur de réponses gratuit, sans IA payante.
// Il cherche dans la base de connaissances (fiches, guides, lexique, prix, FAQ).
// Même fichier pour le site et pour le bot Discord.

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9★ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR');

export const ROLE = { degats: 'Dégâts', tank: 'Tank', healer: 'Healer', stunner: 'Contrôle', polyvalence: 'Polyvalence' };

// Formule exacte des gardiens du château (identique au jeu)
export function towerAt(_t, room) {
  room = Math.max(1, Math.floor(room)); const scale = .5 + room * .018 + Math.floor(room / 10) * .02, pr = room - 1;
  return { hp: Math.round((155 + Math.min(90, pr * 3)) * scale), atk: Math.max(1, Math.round((32 + Math.min(26, pr * .9)) * scale * .95)) };
}
let TS = null;
export function setTwoShot(t) { TS = {}; for (const r of t || []) TS[r.id] = r.s; }
// Stats exactes par étoile (relevées dans le jeu) ; repli : +8 % par étoile
export function statsAt(card, stars) {
  const s = Math.max(0, Math.min(5, stars || 0));
  const r = TS && TS[card.id]; if (r) return { hp: r[s][0], atk: r[s][1] };
  const k = 1 + 0.08 * s; return { hp: Math.round(card.hp * k), atk: Math.round(card.atk * k) };
}
// Dernière chambre où la carte survit à 2 coups de gardien en gardant au moins 1 % de vie.
// Avec soin : un soin de 30 % des PV max (arrondi comme dans le jeu) entre les deux coups.
export function twoShotRoom(_t, card, stars, heal) {
  const hp = statsAt(card, stars).hp; let last = 0;
  for (let room = 1; room <= 3000; room++) {
    const atk = towerAt(null, room).atk; let v = hp - atk; if (v <= 0) break;
    if (heal) v = Math.min(hp, v + Math.max(1, Math.round(hp * .3)));
    v -= atk; if (v >= hp * .01) last = room; else break;
  }
  return last;
}
const q = (a, f) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const i = (s.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(s[lo] + (s[hi] - s[lo]) * (i - lo)); };
const r1 = v => v == null ? null : Math.round(v / 1000) * 1000;
// Même calcul que le guide des prix : médiane, bon prix (25 %), max conseillé (75 %)
export function priceStats(sales, card, days, offsetDays = 0) {
  const now = Date.now(), from = now - (days + offsetDays) * 864e5, to = now - offsetDays * 864e5;
  const ps = sales.filter(x => x.card === card && x.ts >= from && x.ts < to).map(x => x.price);
  return { n: ps.length, med: q(ps, .5), good: r1(q(ps, .25)), max: r1(q(ps, .75)), lo: ps.length ? Math.min(...ps) : null, hi: ps.length ? Math.max(...ps) : null };
}

function findCard(cards, q) {
  const nq = ' ' + norm(q) + ' '; let best = null, bl = 0;
  for (const c of cards) {
    const base = norm(c.n.replace(/\(.*\)/, ''));
    const full = norm(c.n);
    const words = base.split(' ').filter(w => w.length > 2);
    let hit = 0;
    if (nq.includes(' ' + full + ' ')) hit = full.length + 10;
    else if (nq.includes(' ' + base + ' ')) hit = base.length + 5;
    else for (const w of words) if (nq.includes(' ' + w + ' ')) hit = Math.max(hit, w.length);
    if (/aya/.test(nq) && /ayanokouji/.test(full)) hit = Math.max(hit, 12);
    if (hit > bl) { bl = hit; best = c; }
  }
  return bl >= 4 ? best : null;
}

function cardAnswer(c, prices, stars) {
  const s = statsAt(c, stars || 0);
  const lines = [`**${c.n}** · ${c.a}${c.r ? ' · ' + c.r : ' · LR'}${c.c ? ' · ' + (ROLE[c.c] || c.c) : ''}${c.p ? ' · version éveillée' : ''}`,
    `PV ${fmt(s.hp)} · ATQ ${fmt(s.atk)}${stars ? ` (à ${stars}★)` : ' (à 0★)'}`];
  for (const t of c.t || []) lines.push(`• **${t[0]}** : ${t[1]}`);
  const p = (prices || []).find(x => norm(x.card) === norm(c.n));
  if (p) lines.push(`Prix (7 j) : médiane ${fmt(p.median)} KI · bon prix ${fmt(p.good)} · max conseillé ${fmt(p.max)}`);
  return lines.join('\n');
}

export function answer(question, kb) {
  const q = norm(question);
  if (/^(salut|bonjour|yo|hello|coucou|hey)\b/.test(q) && q.split(' ').length < 4) return "Yo ! Moi c'est Kakashi. Demande-moi une carte (« Janemba »), un calcul (« two shot Aya 3 étoiles », « chambre 650 »), un prix (« prix Makima ») ou un guide (château, prestige, salle du temps, ranked).";
  if (!q) return "Pose-moi une question sur une carte, le château, le prestige, la salle du temps, le ranked ou les prix.";
  const cards = (kb.cards || []).filter(c => !c.r), prices = kb.prices || [];
  if (kb.twoshot && !TS) setTwoShot(kb.twoshot);
  const starM = q.match(/(\d)\s*(★|etoile|etoiles|e\b)/); const stars = starM ? Math.min(5, +starM[1]) : null;
  const card = findCard(cards, question);

  if (card && /(two shot|2 shot|deux coups|2 coups|chambre max|jusqu ou|survit|tank)/.test(q)) {
    const lines = [`**${card.n}** : dernière chambre où elle survit à 2 coups (au moins 1 % de vie)`];
    const ss = card.p ? [0] : stars != null ? [stars] : [0, 1, 2, 3, 4, 5];
    for (const s of ss) lines.push(`${card.p ? 'Prestige' : s + '★'} : chambre ${twoShotRoom(null, card, s, false)} sans soin · ${twoShotRoom(null, card, s, true)} avec 1 soin de 30 %`);
    return lines.join('\n');
  }
  if (card && /(prix|vaut|combien|cote|vendre|acheter)/.test(q)) {
    const p = prices.find(x => norm(x.card) === norm(card.n));
    return p ? `**${card.n}** sur 7 jours : médiane ${fmt(p.median)} KI (${p.sales} ventes) · bon prix ${fmt(p.good)} · prix max conseillé ${fmt(p.max)}.`
             : `Pas assez de ventes récentes de **${card.n}** pour donner un prix fiable.`;
  }
  if (card) return cardAnswer(card, prices, stars);

  const room = q.match(/chambre\s*(\d{1,4})/);
  if (room) { const t = towerAt(null, +room[1]); return `Chambre ${room[1]} : 3 gardiens à ${fmt(t.hp)} PV et ${fmt(t.atk)} ATQ chacun. Un échange d'Aya à 5 % de vie leur retire ≈ ${fmt(t.hp * 0.95)} PV, une Domination ≈ ${fmt(t.atk * 1.5)}.`; }

  for (const [term, def] of kb.lexique || []) { const nt = norm(term); if (nt.length > 1 && (' ' + q + ' ').includes(' ' + nt.split(' ')[0] + ' ') && /(c est quoi|definition|veut dire|signifie|qu est ce|quoi)/.test(q)) return `**${term}** : ${def}`; }
  for (const [keys, ans] of kb.faq || []) if (keys.split('|').some(k => q.includes(norm(k)))) {
    const g = bestSection(q, kb.guides); return ans + (g ? `\n\n📖 ${g}` : '');
  }
  const g = bestSection(q, kb.guides); if (g) return g;
  for (const [term, def] of kb.lexique || []) { const nt = norm(term); if (nt.length > 2 && (' ' + q + ' ').includes(' ' + nt + ' ')) return `**${term}** : ${def}`; }
  return "Je n'ai pas trouvé de réponse sûre dans ma base. Essaie avec le nom d'une carte, « chambre 600 », « jetons prestige » ou « two shot Aya 3 étoiles ». Tu peux aussi poser ta question dans la boîte à questions de la Brigade.";
}

function bestSection(q, guides) {
  const words = q.split(' ').filter(w => w.length > 3); if (!words.length) return null;
  let best = null, bs = 0;
  for (const g of Object.values(guides || {})) for (const s of g.sections) {
    const txt = norm([g.title, s.h, ...(s.p || []), ...(s.list || [])].join(' '));
    let sc = 0; for (const w of words) if (txt.includes(w) || (w.length > 4 && txt.includes(w.slice(0, -1)))) sc += w.length > 6 ? 2 : 1;
    for (const w of words) { if (norm(g.title).includes(w)) sc += 2; if (norm(s.h).includes(w.slice(0, 5))) sc += 2; }
    if (sc > bs) { bs = sc; best = { g, s }; }
  }
  if (!best || bs < 2) return null;
  const s = best.s; const body = [...(s.p || []), ...(s.list || []).map(x => '• ' + x)].join('\n');
  return `**${best.g.title} — ${s.h}**\n${body}`;
}

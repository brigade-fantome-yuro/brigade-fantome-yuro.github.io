import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DISCORD_INVITE, EMAIL_DOMAIN } from './config.js';
import { answer, statsAt, towerAt, twoShotRoom, ROLE, setTwoShot, priceStats } from './kakashi.js';

// Session gardée dans le navigateur et renouvelée automatiquement : on reste connecté.
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'brigade-auth' } });

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('fr-FR');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const app = $('#app');
const S = { user: null, profile: null, kb: null, prices: [], sales: [], timers: [] };

const ICON = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6z',
  users: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h2M14 12h2M8 16h2M14 16h2',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  check: 'M4 12l5 5L20 6',
  text: 'M4 6h16M4 12h10M4 18h7',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  bot: 'M5 8h14v10H5zM12 4v4M9 13h.01M15 13h.01',
  chat: 'M4 5h16v11H8l-4 4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k]}"/></svg>`;
const SPIDER = `<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M20 2v10"/><path d="M14 17 4 10M14 21 2 21M14 25 4 33M16 28 10 38M26 17l10-7M26 21h12M26 25l10 8M24 28l6 10"/></g><ellipse cx="20" cy="17" rx="5" ry="5" fill="currentColor"/><ellipse cx="20" cy="27" rx="7" ry="8" fill="currentColor"/></svg>`;

const ROUTES = [
  ['accueil', 'Accueil', 'home'], ['kakashi', 'Kakashi Bot', 'bot'],
  ['sep', 'Guides'], ['guide/chateau', 'Château 500+', 'book'], ['guide/prestige', 'Prestige', 'book'], ['guide/temps', 'Salle du temps', 'book'], ['guide/ranked', 'Ranked', 'book'],
  ['sep', 'Outils'], ['persos', 'Fiches perso', 'users'], ['calculs', 'Calculateurs', 'calc'], ['prix', 'Prix en direct', 'chart'], ['simulateur', 'Simulateur de compo', 'layers'], ['checklist', 'Checklist Prestige', 'check'],
  ['sep', 'Brigade'], ['calendrier', 'Calendrier', 'cal'], ['nouveautes', 'Nouveautés', 'bell'], ['lexique', 'Lexique', 'text'], ['discord', 'Espace Discord', 'chat']
];

function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const slug = d => String(d).trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');

/* ---------- Authentification ---------- */
function authView(mode = 'login', note = '') {
  app.innerHTML = `<div class="auth"><div class="auth-card"><div class="moon"></div>
    <div class="brand" style="margin:0 0 6px">${SPIDER}<b>Brigade Fantôme</b></div>
    <h1>Le repaire de la Brigade</h1>
    <p class="mute">Guides, fiches, prix en direct et Kakashi Bot. Réservé aux membres de la Brigade sur Discord.</p>
    <div class="tabs"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">Se connecter</button><button data-m="signup" class="${mode === 'signup' ? 'on' : ''}">Demander l'accès</button></div>
    <form id="af">
      <label for="dc">Ton @ Discord</label><input id="dc" autocomplete="username" placeholder="@pseudo" required>
      <label for="pw">Mot de passe</label><input id="pw" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="6" required>
      ${mode === 'signup' ? '<p class="small mute">Un admin vérifie que tu es bien sur le Discord de la Brigade, puis valide ton accès.</p>' : ''}
      <button class="btn primary" style="width:100%;margin-top:16px">${mode === 'login' ? 'Entrer' : 'Envoyer ma demande'}</button>
    </form>${note ? `<div class="msg">${esc(note)}</div>` : ''}</div></div>`;
  app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => authView(b.dataset.m));
  $('#af').onsubmit = async e => {
    e.preventDefault(); const d = slug($('#dc').value), pw = $('#pw').value;
    if (d.length < 2) return authView(mode, 'Pseudo Discord invalide.');
    const email = `${d}@${EMAIL_DOMAIN}`;
    if (mode === 'signup') {
      const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { discord: '@' + d } } });
      if (error) return authView('signup', /registered|exists/i.test(error.message) ? 'Ce pseudo a déjà demandé l\'accès : connecte-toi.' : error.message);
      const r = await sb.auth.signInWithPassword({ email, password: pw }); if (r.error) return authView('login', 'Demande envoyée. Connecte-toi une fois validé.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) return authView('login', 'Pseudo ou mot de passe incorrect.');
    }
    boot();
  };
}

function pendingView(p) {
  app.innerHTML = `<div class="auth"><div class="auth-card"><div class="moon pulse"></div>
    <div class="brand" style="margin:0 0 6px">${SPIDER}<b>Brigade Fantôme</b></div>
    <h1>${p.status === 'refused' ? 'Accès refusé' : 'Demande envoyée'}</h1>
    <p>${p.status === 'refused' ? 'Ta demande n\'a pas été acceptée. Parle à un admin sur le Discord.' : `Merci <b>${esc(p.discord)}</b>. Un admin vérifie que tu es sur le Discord de la Brigade. Cette page s'ouvrira dès que c'est validé.`}</p>
    <div class="row"><button class="btn" id="rf">Vérifier</button><button class="btn ghost" id="lo">Changer de compte</button></div></div></div>`;
  $('#rf').onclick = boot; $('#lo').onclick = async () => { await sb.auth.signOut(); authView(); };
  if (p.status === 'pending') S.timers.push(setTimeout(boot, 30000));
}

/* ---------- Données ---------- */
async function loadKB() {
  const { data, error } = await sb.from('content').select('key,data');
  if (error) throw error;
  const kb = {}; for (const r of data) kb[r.key] = r.data; S.kb = kb;
  setTwoShot(kb.twoshot);
  await loadPrices();
}
async function loadPrices() {
  const since = new Date(Date.now() - 31 * 864e5).toISOString(); let all = [], from = 0;
  for (;;) { const { data, error } = await sb.from('sales').select('card,price,sold_at').gte('sold_at', since).order('sold_at').range(from, from + 999); if (error || !data || !data.length) break; all = all.concat(data); if (data.length < 1000) break; from += 1000; }
  S.sales = all.map(r => ({ card: r.card, price: r.price, ts: new Date(r.sold_at).getTime() }));
  const names = [...new Set(S.sales.map(x => x.card))];
  S.prices = names.map(card => { const w = priceStats(S.sales, card, 7), p = priceStats(S.sales, card, 7, 7); const last = Math.max(...S.sales.filter(x => x.card === card).map(x => x.ts));
    return { card, sales: w.n, median: w.med, good: w.good, max: w.max, prev_median: p.med, updated_at: new Date(last).toISOString() }; })
    .filter(p => p.sales > 0).sort((a, b) => b.sales - a.sales);
  S.kb.prices = S.prices;
}

/* ---------- Coquille ---------- */
function shell(route) {
  const isAdmin = S.profile.role === 'admin';
  const links = ROUTES.map(r => r[0] === 'sep' ? `<div class="sep">${r[1]}</div>` : `<a href="#${r[0]}" class="${route === r[0] ? 'on' : ''}">${ico(r[2])}${r[1]}</a>`).join('')
    + (isAdmin ? `<div class="sep">Admin</div><a href="#admin" class="${route === 'admin' ? 'on' : ''}">${ico('shield')}Administration</a>` : '');
  app.innerHTML = `<div class="top"><button class="btn" id="mn" aria-label="Menu">☰</button><div class="brand" style="margin:0">${SPIDER}<b>Brigade Fantôme</b></div></div>
  <div class="shell"><aside class="side" id="side"><div class="brand">${SPIDER}<b>Brigade Fantôme</b></div><nav class="nav">${links}</nav>
  <div class="me"><div class="mute small">Connecté</div><b>${esc(S.profile.discord)}</b><div><button class="btn ghost" id="lo" style="margin-top:8px;min-height:36px">Se déconnecter</button></div></div></aside>
  <main id="main"></main></div>`;
  $('#lo').onclick = async () => { if (confirmBox('Te déconnecter ? Il faudra retaper ton mot de passe.')) { await sb.auth.signOut(); authView(); } };
  const side = $('#side');
  $('#mn').onclick = () => { side.classList.add('open'); const sc = document.createElement('div'); sc.className = 'scrim'; sc.onclick = () => { side.classList.remove('open'); sc.remove(); }; document.body.appendChild(sc); };
  side.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { side.classList.remove('open'); document.querySelector('.scrim')?.remove(); }));
  return $('#main');
}
function confirmBox(msg) { return window.confirm ? (() => { try { return window.confirm(msg); } catch { return true; } })() : true; }

/* ---------- Pages ---------- */
const P = {};

P.accueil = m => {
  const top = S.prices.slice(0, 4);
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Carnet de guilde</span>
    <h1 style="margin-top:12px">Bienvenue dans le repaire, ${esc(S.profile.discord)}</h1>
    <p class="mute">Tout ce qu'il faut pour progresser sur YURO : guides, fiches des LR, calculateurs, prix réels du marché et Kakashi pour répondre à tes questions.</p>
    <div class="row" style="margin-top:14px"><a class="btn primary" href="#kakashi">${ico('bot')} Demander à Kakashi</a><a class="btn" href="#prix">${ico('chart')} Voir les prix</a></div></section>
    <div class="grid">
      ${[['guide/chateau', 'Château 500+', 'La boucle Aya, le focus et les chambres limites par étoile.'], ['guide/prestige', 'Prestige', 'Jetons, univers à compléter, booster Prestige.'], ['guide/temps', 'Salle du temps', 'Farmer du KI et des boosters efficacement.'], ['guide/ranked', 'Ranked', 'Construire son équipe et gagner ses matchs.']]
      .map(g => `<a class="card" href="#${g[0]}"><span class="chip">Guide</span><h3 style="margin-top:10px">${g[1]}</h3><p class="mute small">${g[2]}</p></a>`).join('')}
    </div>
    <div class="section"><div class="row"><h2 style="margin:0">Le marché en ce moment</h2><span class="sp"></span><a href="#prix" class="btn ghost">Tout voir</a></div>
    <div class="grid" style="margin-top:12px">${top.map(p => `<div class="card"><div class="k">${esc(p.card)}</div><div class="v">${fmt(p.median)} <span class="small mute">KI</span></div>${trend(p)}</div>`).join('') || '<div class="empty">Pas encore de prix.</div>'}</div></div>
    <div class="section" id="nextev"></div>`;
  loadEvents().then(ev => { const el = $('#nextev'); if (!el || !ev.length) return; el.innerHTML = `<h2>Prochaine échéance</h2>${eventCard(ev[0])}`; tickCountdowns(); });
};

function trend(p) {
  if (!p.prev_median) return '<span class="chip">Nouveau</span>';
  const d = p.median - p.prev_median, pc = d / p.prev_median * 100;
  return `<span class="${d >= 0 ? 'up' : 'down'} small">${d >= 0 ? '▲' : '▼'} ${fmt(Math.abs(d))} KI (${pc >= 0 ? '+' : ''}${pc.toFixed(1)} %)</span>`;
}

P.guide = (m, key) => {
  const g = S.kb.guides?.[key]; if (!g) { m.innerHTML = '<div class="empty">Guide introuvable.</div>'; return; }
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">${esc(g.title)}</h1></section>
    ${key === 'chateau' ? castleWidget() : ''}
    ${g.sections.map(s => `<div class="card section"><h2>${esc(s.h)}</h2>${(s.p || []).map(x => `<p>${esc(x)}</p>`).join('')}${s.list ? `<ul class="list">${s.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}`;
  if (key === 'chateau') bindCastle();
};

function castleWidget() {
  return `<div class="card section"><h2>Où en est ta tour ?</h2><div class="row"><div style="flex:1;min-width:160px"><label for="cr">Chambre</label><input id="cr" type="number" min="1" max="1500" value="600"></div></div><div id="co" style="margin-top:12px"></div></div>`;
}
function bindCastle() {
  const f = () => { const r = +$('#cr').value || 1; const t = towerAt(S.kb.tower, r); $('#co').innerHTML = `<div class="grid"><div><div class="k mute small">PV d'un gardien</div><div class="cd">${fmt(t.hp)}</div></div><div><div class="k mute small">Attaque d'un gardien</div><div class="cd">${fmt(t.atk)}</div></div><div><div class="k mute small">Échange d'Aya à 5 %</div><div class="cd">${fmt(t.hp * .95)}</div></div><div><div class="k mute small">Domination</div><div class="cd">${fmt(t.atk * 1.5)}</div></div></div>`; };
  $('#cr').oninput = f; f();
}

P.persos = m => {
  const all = S.kb.cards || []; let cards = all.filter(c => !c.r);
  m.innerHTML = `<h1>Fiches perso</h1><p class="mute">Les ${all.filter(c => !c.r).length} LR du jeu, avec leurs techniques et leurs stats exactes de 0★ à 5★ (les versions prestige ont des stats fixes). Les ${all.filter(c => c.r).length} Transcendantes sont dans leur propre onglet.</p>
    <div class="row"><input id="q" placeholder="Rechercher une carte ou un anime" style="flex:1;min-width:200px"><select id="rf" style="width:auto"><option value="">Tous les rôles</option>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <select id="st" style="width:auto">${[0, 1, 2, 3, 4, 5].map(s => `<option value="${s}">${s}★</option>`).join('')}</select><div class="tabs" style="margin:0" id="rt"><button data-r="lr" class="on">LR</button><button data-r="tr">Transcendantes</button></div></div>
    <div class="grid" id="cl" style="margin-top:16px"></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), rf = $('#rf').value, st = +$('#st').value;
    $('#cl').innerHTML = cards.filter(c => (!q || (c.n + ' ' + c.a).toLowerCase().includes(q)) && (!rf || c.c === rf)).map(c => {
      const s = statsAt(c, st); const p = S.prices.find(x => x.card === c.n);
      return `<div class="card"><div class="row"><span class="chip ${c.r === 'Transcendant' ? 'warn' : 'red'}">${c.r || 'LR'}</span>${c.c ? `<span class="chip">${ROLE[c.c] || c.c}</span>` : ''}${c.p ? '<span class="chip">Prestige</span>' : ''}</div>
      <h3 style="margin-top:10px">${esc(c.n)}</h3><div class="mute small">${esc(c.a)}</div>
      <div class="row" style="margin:10px 0"><span><b>${fmt(s.hp)}</b> <span class="mute small">PV</span></span><span><b>${fmt(s.atk)}</b> <span class="mute small">ATQ</span></span>${p ? `<span class="sp"></span><span class="small bone">${fmt(p.median)} KI</span>` : ''}</div>
      ${(c.t || []).map(t => `<div class="tech"><b>${esc(t[0])}</b><div class="small mute">${esc(t[1])}</div></div>`).join('') || '<div class="small mute">Pas de technique spéciale.</div>'}</div>`;
    }).join('') || '<div class="empty">Aucune carte.</div>';
  };
  ['q', 'rf', 'st'].forEach(id => $('#' + id).oninput = draw); $('#rt').querySelectorAll('button').forEach(b => b.onclick = () => { cards = all.filter(c => b.dataset.r === 'lr' ? !c.r : c.r); $('#rt').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw(); }); draw();
};

P.calculs = m => {
  const cards = S.kb.cards.filter(c => !c.r);
  const opts = cards.map(c => `<option value="${c.id}" ${c.id === 953 ? 'selected' : ''}>${esc(c.n)}</option>`).join('');
  m.innerHTML = `<h1>Calculateurs du château</h1>
  <div class="card section"><span class="chip ok">✓ Vérifié avec les formules du jeu</span><p class="small mute" style="margin-top:10px">Stats des gardiens chambre par chambre, stats exactes de chaque carte par étoile, soin de 30 % des PV max arrondi comme dans le jeu, et dégâts reçus égaux à l'attaque du gardien (contrôlé en combat). Les passifs ne sont pas comptés (bouclier de Frieren, résurrections de Boros et Seiichi, esquives).</p></div>
  <div class="card section"><h2>Two-shot</h2><p class="mute small">Dernière chambre où ta carte survit à 2 coups de gardien en gardant au moins 1 % de vie : sans soin, et avec un soin de 30 % entre les deux coups (Seiichi ou Rimuru).</p>
    <div class="row"><div style="flex:2;min-width:200px"><label for="c1">Carte</label><select id="c1">${opts}</select></div><div style="flex:1;min-width:110px"><label for="s1">Étoiles</label><select id="s1">${[0, 1, 2, 3, 4, 5].map(s => `<option>${s}</option>`).join('')}</select></div></div>
    <div id="o1" class="grid" style="margin-top:14px"></div>
    <div class="tablewrap" style="margin-top:16px"><table><thead><tr><th>Étoiles</th><th class="n">PV</th><th class="n">Sans soin</th><th class="n">Avec 1 soin</th></tr></thead><tbody id="t1"></tbody></table></div></div>
  <div class="card section"><h2>Au combientième coup ma carte meurt</h2>
    <div class="row"><div style="flex:2;min-width:200px"><label for="c2">Carte</label><select id="c2">${opts}</select></div><div style="flex:1;min-width:110px"><label for="s2">Étoiles</label><select id="s2">${[0, 1, 2, 3, 4, 5].map(s => `<option>${s}</option>`).join('')}</select></div><div style="flex:1;min-width:110px"><label for="r2">Chambre</label><input id="r2" type="number" value="600" min="1" max="3000"></div><div style="flex:1;min-width:150px"><label for="h2">Soins de 30 % reçus</label><select id="h2">${[0, 1, 2, 3].map(s => `<option>${s}</option>`).join('')}</select></div></div>
    <div id="o2" style="margin-top:14px"></div></div>`;
  const byId = id => cards.find(c => c.id === +id);
  const f1 = () => { const c = byId($('#c1').value), s = c.p ? 0 : +$('#s1').value; $('#s1').disabled = !!c.p;
    $('#o1').innerHTML = `<div><div class="mute small">Sans soin</div><div class="cd">Chambre ${twoShotRoom(null, c, s, false)}</div></div><div><div class="mute small">Avec 1 soin de 30 %</div><div class="cd">Chambre ${twoShotRoom(null, c, s, true)}</div></div><div><div class="mute small">PV${c.p ? ' (prestige, fixes)' : ''}</div><div class="cd">${fmt(statsAt(c, s).hp)}</div></div>`;
    $('#t1').innerHTML = (c.p ? [0] : [0, 1, 2, 3, 4, 5]).map(k => `<tr><td>${c.p ? 'Prestige' : k + '★'}</td><td class="n">${fmt(statsAt(c, k).hp)}</td><td class="n">${twoShotRoom(null, c, k, false)}</td><td class="n"><b>${twoShotRoom(null, c, k, true)}</b></td></tr>`).join(''); };
  const f2 = () => { const c = byId($('#c2').value), s = c.p ? 0 : +$('#s2').value, r = Math.max(1, +$('#r2').value || 1), heals = +$('#h2').value; const hp = statsAt(c, s).hp, atk = towerAt(null, r).atk;
    let v = hp, n = 0, h = heals; while (v > 0 && n < 99) { v -= atk; n++; if (v > 0 && h > 0) { v = Math.min(hp, v + Math.max(1, Math.round(hp * .3))); h--; } }
    $('#o2').innerHTML = `<p>Chambre <b>${r}</b> : un gardien a <b>${fmt(towerAt(null, r).hp)}</b> PV et tape <b>${fmt(atk)}</b>. ${esc(c.n)}${c.p ? '' : ' ' + s + '★'} a <b>${fmt(hp)}</b> PV${heals ? ` et reçoit ${heals} soin${heals > 1 ? 's' : ''} de 30 % entre les coups` : ''} : elle meurt au <b class="red">${n}e coup</b>.</p>`; };
  ['c1', 's1'].forEach(i => $('#' + i).oninput = f1); ['c2', 's2', 'r2', 'h2'].forEach(i => $('#' + i).oninput = f2); f1(); f2();
};

function series(card, win) {
  const now = Date.now(), span = { '24h': 864e5, '7j': 7 * 864e5, '30j': 30 * 864e5 }[win], step = win === '24h' ? 36e5 : 864e5, n = Math.round(span / step);
  const pts = []; for (let i = n - 1; i >= 0; i--) { const a = now - (i + 1) * step, b = now - i * step; const ps = S.sales.filter(x => x.card === card && x.ts >= a && x.ts < b).map(x => x.price).sort((x, y) => x - y); pts.push({ t: b, v: ps.length ? ps[Math.floor((ps.length - 1) / 2)] : null, n: ps.length }); }
  return pts;
}
function spark(card) {
  const h = series(card, '7j').map(p => p.v).filter(v => v != null); if (h.length < 2) return '<span class="small mute">—</span>';
  const min = Math.min(...h), max = Math.max(...h), W = 96, H = 28;
  const pts = h.map((v, i) => `${(i / (h.length - 1) * W).toFixed(1)},${(H - 3 - (max === min ? .5 : (v - min) / (max - min)) * (H - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="${h[h.length - 1] >= h[0] ? '#7fc79a' : '#ff6b7d'}" stroke-width="2"/></svg>`;
}
function bigChart(el, card, win) {
  const pts = series(card, win), vals = pts.filter(p => p.v != null);
  if (vals.length < 2) { el.innerHTML = '<div class="empty">Pas assez de ventes sur cette période pour tracer une courbe.</div>'; return; }
  const draw = () => {
    const W = el.clientWidth || 600, H = 220, l = 64, r = 12, t = 14, b = 28; const min = Math.min(...vals.map(p => p.v)), max = Math.max(...vals.map(p => p.v)), pad = (max - min) * .1 || max * .05;
    const x = i => l + i / (pts.length - 1) * (W - l - r), y = v => t + (1 - (v - (min - pad)) / ((max + pad) - (min - pad))) * (H - t - b);
    let g = ''; for (let k = 0; k <= 3; k++) { const v = (min - pad) + k * ((max + pad) - (min - pad)) / 3; g += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#2a2328"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#9b928a">${fmt(v)}</text>`; }
    const path = pts.map((p, i) => p.v == null ? null : `${x(i)},${y(p.v)}`).filter(Boolean).join(' ');
    g += `<polyline points="${path}" fill="none" stroke="#ff3b54" stroke-width="2.5"/>`;
    pts.forEach((p, i) => { if (p.v != null) g += `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" fill="#ff3b54"><title>${new Date(p.t).toLocaleString('fr-FR')} : ${fmt(p.v)} KI (${p.n} vente${p.n > 1 ? 's' : ''})</title></circle>`; });
    const lab = i => win === '24h' ? new Date(pts[i].t).toLocaleTimeString('fr-FR', { hour: '2-digit' }) : new Date(pts[i].t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    g += `<text x="${l}" y="${H - 8}" font-size="11" fill="#9b928a">${lab(0)}</text><text x="${W - r}" y="${H - 8}" text-anchor="end" font-size="11" fill="#9b928a">${lab(pts.length - 1)}</text>`;
    el.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
  };
  draw(); const ro = new ResizeObserver(draw); ro.observe(el);
}

P.prix = m => {
  let key = 'sales', dir = -1, win = '7j', open = null;
  const days = { '24h': 1, '7j': 7, '30j': 30 };
  m.innerHTML = `<div class="row"><h1 style="margin:0">Prix en direct</h1><span class="sp"></span><span class="chip ok">● En direct</span></div>
    <p class="mute">Ventes réelles du marché (LR classiques), calculées comme le guide des prix : <b class="bone">médiane</b>, <b class="bone">bon prix</b> (bonne affaire) et <b class="bone">max conseillé</b> (au-delà tu paies trop cher). La tendance compare les 7 derniers jours à la semaine d'avant. Touche une carte pour voir sa courbe.</p>
    <div class="row"><input id="q" placeholder="Rechercher une carte" style="flex:1;min-width:200px"><div class="tabs" style="margin:0" id="wn">${['24h', '7j', '30j'].map(w => `<button data-w="${w}" class="${w === win ? 'on' : ''}">${w}</button>`).join('')}</div></div>
    <div class="tablewrap" style="margin-top:14px"><table><thead><tr><th data-k="card">Carte</th><th class="n" data-k="median">Médiane</th><th class="n hide-sm" data-k="good">Bon prix</th><th class="n hide-sm" data-k="max">Max conseillé</th><th class="n" data-k="trend">Tendance 7 j</th><th class="hide-sm">7 jours</th><th class="n hide-sm" data-k="sales">Ventes</th></tr></thead><tbody id="tb"></tbody></table></div>
    <p class="small mute" id="upd"></p>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), d = days[win];
    const rows = S.prices.filter(p => !q || p.card.toLowerCase().includes(q)).map(p => { const w = priceStats(S.sales, p.card, d); return { ...p, median: w.med, good: w.good, max: w.max, sales: w.n, trend: p.prev_median ? (p.median - p.prev_median) / p.prev_median : 0, base: p }; }).filter(p => p.sales > 0 || win !== '24h');
    rows.sort((a, b) => ((a[key] ?? -1) > (b[key] ?? -1) ? 1 : (a[key] ?? -1) < (b[key] ?? -1) ? -1 : 0) * dir);
    $('#tb').innerHTML = rows.map(p => `<tr data-c="${esc(p.card)}" style="cursor:pointer"><td><b>${esc(p.card)}</b></td><td class="n">${fmt(p.median)}</td><td class="n hide-sm">${fmt(p.good)}</td><td class="n hide-sm">${fmt(p.max)}</td><td class="n">${trend(p.base)}</td><td class="hide-sm">${spark(p.card)}</td><td class="n hide-sm">${p.sales}${p.sales && p.sales < 3 ? ' <span class="chip warn">peu</span>' : ''}</td></tr>${open === p.card ? `<tr><td colspan="7" style="background:#0f0c10"><div class="row" style="margin-bottom:8px"><b>${esc(p.card)}</b><span class="sp"></span><span class="small mute">Médiane ${fmt(p.median)} · bon prix ${fmt(p.good)} · max conseillé ${fmt(p.max)} · ${p.sales} ventes (${win})</span></div><div id="bc"></div></td></tr>` : ''}`).join('') || '<tr><td colspan="7" class="mute">Aucune vente sur cette période.</td></tr>';
    $('#tb').querySelectorAll('tr[data-c]').forEach(tr => tr.onclick = () => { open = open === tr.dataset.c ? null : tr.dataset.c; draw(); });
    if (open && $('#bc')) bigChart($('#bc'), open, win);
    const last = S.prices.reduce((a, p) => p.updated_at > a ? p.updated_at : a, ''); $('#upd').textContent = last ? 'Dernière vente enregistrée : ' + new Date(last).toLocaleString('fr-FR') : 'Pas encore de ventes enregistrées.';
  };
  m.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k; dir = key === k ? -dir : (k === 'card' ? 1 : -1); key = k; draw(); });
  $('#wn').querySelectorAll('button').forEach(b => b.onclick = () => { win = b.dataset.w; $('#wn').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#q').oninput = draw; draw();
  S.timers.push(setInterval(async () => { await loadPrices(); if ($('#tb')) draw(); }, 60000));
};

/* ---------- Simulateur de match ranked + test A/B (modèle simplifié, à brancher sur le moteur officiel avec l'accord du dev) ---------- */
const TECH = { // id -> modèle simplifié
  340: { k: 'dom', cd: 3 }, 308: { k: 'stunAll', cd: 4, uses: 2 }, 183: { k: 'stunAll', cd: 4, uses: 2 }, 230: { k: 'stunAll', cd: 4, uses: 2 }, 3239: { k: 'stunAll', cd: 3, m: .6 },
  3241: { k: 'stunAll', cd: 4, m: 1.1, hits: 2 }, 1070: { k: 'hit', m: 1.6, cd: 3, dodge: 2 }, 961: { k: 'hit', m: 1.7, uses: 1, mui: 3 }, 3248: { k: 'healAll', cd: 3, self: true },
  408: { k: 'healAll', cd: 3 }, 499: { k: 'veil', cd: 3 }, 3247: { k: 'aoe', m: 1.3, cd: 3 }, 175: { k: 'aoe', m: 1.5, cd: 3 }, 369: { k: 'aoe', m: 1.5, cd: 3 }, 451: { k: 'aoe', m: 1.5, cd: 3 },
  1083: { k: 'aoe', m: 2.5, uses: 1, die: true }, 953: { k: 'swap', cd: 4 }, 941: { k: 'hit', m: 1.5, cd: 3 }, 3246: { k: 'hit', m: 1.5, cd: 3 }, 68: { k: 'hit', m: 2.2, cd: 4 }, 3240: { k: 'hit', m: 1.6, cd: 3 }
};
const PASSIVE = { 3247: { revive: .6, regen: .05 }, 3248: { revive: .5 }, 105: { revive: .5 }, 190: { revive: 0 } };
function mkUnit(c, s) { const st = statsAt(c, s), t = TECH[c.id] ? { ...TECH[c.id] } : null; return { c, n: c.n, hp: st.hp, max: st.hp, atk: st.atk, t, cd: 0, uses: (t || {}).uses ?? 99, stun: 0, dodge: 0, veil: 0, pas: { ...(PASSIVE[c.id] || {}) } }; }
function checkDeath(u) { if (u.hp <= 0 && u.pas.revive != null) { u.hp = Math.max(1, Math.round(u.max * u.pas.revive)); u.pas.revive = null; } }
function pickTarget(foes, plan) { const a = foes.filter(u => u.hp > 0); if (!a.length) return null; if (plan.focus === 'low') return a.reduce((x, y) => y.hp < x.hp ? y : x); if (plan.focus === 'atk') return a.reduce((x, y) => y.atk > x.atk ? y : x); return a[0]; }
function hitUnit(u, dmg) { if (u.dodge > 0) { u.dodge--; return; } if (u.veil > 0) { u.veil = 0; return; } u.hp -= Math.round(dmg); checkDeath(u); }
function act(u, mine, foes, plan) {
  if (u.pas.regen) u.hp = Math.min(u.max, u.hp + Math.round(u.max * u.pas.regen));
  if (u.stun > 0) { u.stun--; return; }
  const tgt = pickTarget(foes, plan); if (!tgt) return; const t = u.t, ready = t && u.cd <= 0 && u.uses > 0 && plan.tech;
  if (ready) {
    u.cd = t.cd || 99; u.uses--;
    if (t.k === 'hit') { hitUnit(tgt, u.atk * t.m); if (t.dodge) u.dodge = t.dodge, t.dodge = 0; if (t.mui) u.dodge = 99, u.mui = t.mui; return; }
    if (t.k === 'aoe') { foes.forEach(f => f.hp > 0 && hitUnit(f, u.atk * t.m)); if (t.die) { u.hp = 0; u.pas.revive = null; } return; }
    if (t.k === 'stunAll') { foes.forEach(f => { if (f.hp > 0) { if (f.veil || f.dodge) { f.veil ? f.veil = 0 : f.dodge--; } else { f.stun = 1; if (t.m) { f.hp -= Math.round(u.atk * t.m); checkDeath(f); } } } }); return; }
    if (t.k === 'dom') { if (tgt.veil || tgt.dodge) { tgt.veil ? tgt.veil = 0 : tgt.dodge--; return; } tgt.hp -= Math.round(tgt.atk * 1.5); checkDeath(tgt); tgt.stun = 1; return; }
    if (t.k === 'healAll') { mine.forEach(a => { if (a.hp > 0 && (t.self || a !== u)) a.hp = Math.min(a.max, a.hp + Math.round(a.max * .3)); }); return; }
    if (t.k === 'veil') { mine.forEach(a => a.hp > 0 && (a.veil = 1)); return; }
    if (t.k === 'swap') { const full = foes.filter(f => f.hp > 0).reduce((x, y) => y.hp / y.max > x.hp / x.max ? y : x); const pa = u.hp / u.max, pb = full.hp / full.max; if (pb > pa) { u.hp = Math.round(pb * u.max); full.hp = Math.round(pa * full.max); return; } u.cd = 0; u.uses++; }
  }
  hitUnit(tgt, u.atk); if (u.cd > 0) u.cd--;
}
function simMatch(A, B, planA, planB, starter) {
  const a = A.map(x => mkUnit(x.c, x.s)), b = B.map(x => mkUnit(x.c, x.s)); let side = starter;
  for (let round = 0; round < 60; round++) {
    for (let i = 0; i < 3; i++) for (const s of side ? [b, a] : [a, b]) { const u = s[i]; if (u && u.hp > 0) act(u, s, s === a ? b : a, s === a ? planA : planB); if (!a.some(x => x.hp > 0) || !b.some(x => x.hp > 0)) return a.some(x => x.hp > 0) ? 1 : 0; }
    [...a, ...b].forEach(u => { if (u.mui && --u.mui <= 0) u.dodge = 0; u.veil = 0; }); side = 1 - side;
  }
  return a.reduce((s, x) => s + Math.max(0, x.hp) / x.max, 0) > b.reduce((s, x) => s + Math.max(0, x.hp) / x.max, 0) ? 1 : 0;
}
P.simulateur = m => {
  const cards = S.kb.cards.filter(c => !c.r);
  const pick = (p, i, def) => `<div style="flex:1;min-width:160px"><label for="${p}${i}">Carte ${i + 1}</label><select id="${p}${i}">${cards.map(c => `<option value="${c.id}" ${c.id === def ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select><label for="${p}s${i}">Étoiles</label><select id="${p}s${i}">${[0, 1, 2, 3, 4, 5].map(s => `<option>${s}</option>`).join('')}</select></div>`;
  const plan = p => `<div style="flex:1;min-width:200px"><label for="${p}f">Cible</label><select id="${p}f"><option value="first">Focus le premier</option><option value="low">Le plus bas en PV</option><option value="atk">La plus grosse attaque</option></select><label for="${p}t">Techniques</label><select id="${p}t"><option value="1">Dès qu'elles sont prêtes</option><option value="0">Jamais (attaques seules)</option></select></div>`;
  m.innerHTML = `<h1>Simulateur de match ranked</h1><p class="mute">Simule des centaines de matchs entre ton équipe et une équipe adverse, et compare deux façons de jouer (test A/B) pour savoir laquelle gagne le plus souvent.</p>
  <div class="soon"><div class="card section"><h2>Ton équipe</h2><div class="row">${pick('a', 0, 1070)}${pick('a', 1, 3248)}${pick('a', 2, 3247)}</div></div>
  <div class="card section"><h2>Équipe adverse</h2><div class="row">${pick('b', 0, 3241)}${pick('b', 1, 973)}${pick('b', 2, 68)}</div><div class="row">${plan('o')}</div></div>
  <div class="grid"><div class="card"><h2>Plan A</h2><div class="row">${plan('pa')}</div></div><div class="card"><h2>Plan B</h2><div class="row">${plan('pb')}</div></div></div>
  <div class="row section"><label for="nn" style="margin:0">Matchs par plan</label><select id="nn" style="width:auto"><option>100</option><option selected>500</option><option>2000</option></select><button class="btn primary" id="go">Lancer la simulation</button></div>
  <div id="res"></div></div>`;
  $('#pbt').value = '1'; $('#pbf').value = 'low';
  $('#go').onclick = () => {
    const team = p => [0, 1, 2].map(i => ({ c: cards.find(c => c.id === +$('#' + p + i).value), s: +$('#' + p + 's' + i).value }));
    const pl = p => ({ focus: $('#' + p + 'f').value, tech: $('#' + p + 't').value === '1' }); const A = team('a'), B = team('b'), N = +$('#nn').value, opp = pl('o');
    const run = P => { let w = 0, wf = 0, ws = 0; for (let k = 0; k < N; k++) { const st = k % 2, r = simMatch(A, B, P, opp, st); w += r; if (st) ws += r; else wf += r; } return { w: w / N, first: wf / (N / 2), second: ws / (N / 2) }; };
    const ra = run(pl('pa')), rb = run(pl('pb')); const pc = v => (v * 100).toFixed(0) + ' %';
    $('#res').innerHTML = `<div class="grid">${[['Plan A', ra], ['Plan B', rb]].map(([n, r]) => `<div class="card"><div class="k">${n}</div><div class="cd">${pc(r.w)}</div><div class="small mute">Tu commences : ${pc(r.first)} · Il commence : ${pc(r.second)}</div></div>`).join('')}</div><p class="small mute">Modèle simplifié : il ne reproduit pas encore tous les effets du jeu.</p>`;
  };
};

async function loadEvents() {
  const { data } = await sb.from('events').select('*').order('ends_at');
  const now = Date.now();
  return (data || []).map(e => { let t = new Date(e.ends_at).getTime(); if (e.repeat_days) while (t < now) t += e.repeat_days * 864e5; return { ...e, t }; }).filter(e => e.t > now - 6e4).sort((a, b) => a.t - b.t);
}
const eventCard = e => `<div class="card" style="margin:10px 0"><div class="row"><span class="chip ${e.kind === 'ranked' ? 'red' : e.kind === 'prestige' ? 'warn' : ''}">${esc(e.kind || 'événement')}</span><span class="sp"></span><span class="small mute">${new Date(e.t).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span></div><h3 style="margin-top:8px">${esc(e.title)}</h3>${e.detail ? `<p class="mute small">${esc(e.detail)}</p>` : ''}<div class="cd" data-cd="${e.t}"></div></div>`;
function tickCountdowns() {
  const f = () => document.querySelectorAll('[data-cd]').forEach(el => { let d = Math.max(0, +el.dataset.cd - Date.now()) / 1000; const j = Math.floor(d / 86400); d -= j * 86400; const h = Math.floor(d / 3600); d -= h * 3600; const mi = Math.floor(d / 60), s = Math.floor(d - mi * 60); el.textContent = `${j ? j + ' j ' : ''}${String(h).padStart(2, '0')} h ${String(mi).padStart(2, '0')} min ${String(s).padStart(2, '0')} s`; });
  f(); S.timers.push(setInterval(f, 1000));
}
P.calendrier = async m => {
  m.innerHTML = `<h1>Calendrier</h1><p class="mute">Comptes à rebours en temps réel jusqu'aux échéances du jeu (fin de saison ranked, boosters Prestige, événements).</p><div id="ev"><div class="empty">Chargement…</div></div>`;
  const ev = await loadEvents(); $('#ev').innerHTML = ev.map(eventCard).join('') || '<div class="empty">Aucune échéance pour l\'instant.</div>'; tickCountdowns();
};

P.checklist = async m => {
  const U = S.kb.universes || [];
  const { data } = await sb.from('checklist').select('*'); const st = {}; for (const r of data || []) st[r.universe] = r;
  const draw = () => {
    const done = U.filter(u => st[u[0]]?.done).length;
    m.innerHTML = `<h1>Checklist Prestige</h1><p class="mute">Coche les univers que tu as complétés (3 jetons chacun) et note les cartes qui te manquent. Sauvegardé sur ton compte.</p>
    <div class="card section"><div class="row"><b>${done} / ${U.length} univers</b><span class="sp"></span><span class="bone">${done * 3} jetons gagnés</span></div><div class="bar" style="margin-top:10px"><i style="width:${U.length ? done / U.length * 100 : 0}%"></i></div></div>
    <div class="row"><input id="q" placeholder="Rechercher un univers" style="flex:1;min-width:200px"><select id="fl" style="width:auto"><option value="">Tous</option><option value="todo">À compléter</option><option value="done">Complétés</option></select></div>
    <div id="ul" style="display:grid;gap:8px;margin-top:14px"></div>`;
    const list = () => {
      const q = $('#q').value.toLowerCase(), fl = $('#fl').value;
      $('#ul').innerHTML = U.filter(u => (!q || u[0].toLowerCase().includes(q)) && (!fl || (fl === 'done') === !!st[u[0]]?.done)).map(u => { const r = st[u[0]] || {}; return `<div class="check ${r.done ? 'done' : ''}"><input type="checkbox" data-u="${esc(u[0])}" ${r.done ? 'checked' : ''} aria-label="${esc(u[0])} complété"><div style="flex:1"><b>${esc(u[0])}</b> <span class="small mute">${u[1]} cartes</span><input class="miss" data-u="${esc(u[0])}" placeholder="Cartes manquantes…" value="${esc(r.missing || '')}" style="min-height:36px;margin-top:6px;font-size:14px"></div></div>`; }).join('');
      $('#ul').querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = async () => { const u = cb.dataset.u; st[u] = { ...(st[u] || {}), universe: u, done: cb.checked }; await save(u); draw(); });
      $('#ul').querySelectorAll('.miss').forEach(inp => inp.onchange = async () => { const u = inp.dataset.u; st[u] = { ...(st[u] || {}), universe: u, missing: inp.value }; await save(u); toast('Enregistré'); });
    };
    $('#q').oninput = list; $('#fl').oninput = list; list();
  };
  const save = u => sb.from('checklist').upsert({ user_id: S.user.id, universe: u, done: !!st[u].done, missing: st[u].missing || '' });
  draw();
};

P.lexique = m => {
  const L = S.kb.lexique || [];
  m.innerHTML = `<h1>Lexique</h1><p class="mute">Les mots du jeu, pour les nouveaux comme pour les anciens.</p><input id="q" placeholder="Chercher un mot"><div class="grid" id="lx" style="margin-top:14px"></div>`;
  const d = () => { const q = $('#q').value.toLowerCase(); $('#lx').innerHTML = L.filter(x => !q || (x[0] + x[1]).toLowerCase().includes(q)).map(x => `<div class="card"><h3>${esc(x[0])}</h3><p class="mute small">${esc(x[1])}</p></div>`).join(''); };
  $('#q').oninput = d; d();
};

P.nouveautes = async m => {
  m.innerHTML = `<h1>Nouveautés</h1><p class="mute">Ce qui change dans le jeu, et ce que ça change pour vos cartes et vos stratégies.</p><div id="nw"><div class="empty">Chargement…</div></div>`;
  const { data } = await sb.from('news').select('*').order('at', { ascending: false }).limit(50);
  $('#nw').innerHTML = (data || []).map(n => `<div class="card section"><span class="small mute">${new Date(n.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><h2 style="margin-top:6px">${esc(n.title)}</h2><p style="white-space:pre-wrap">${esc(n.body)}</p></div>`).join('') || '<div class="empty">Pas encore de nouveautés.</div>';
};

P.kakashi = m => {
  m.innerHTML = `<div class="row"><h1 style="margin:0">Kakashi Bot</h1><span class="sp"></span><span class="chip">Aussi sur Discord : /kakashi</span></div>
    <p class="mute">Pose une question sur une carte, le château, le prestige, la salle du temps, le ranked ou les prix.</p>
    <div class="chat" id="ch"></div>
    <form id="kf" class="row" style="margin-top:12px"><input id="kq" placeholder="Ex. two shot Aya 3 étoiles" autocomplete="off" style="flex:1;min-width:200px"><button class="btn primary">Envoyer</button></form>
    <div class="row" style="margin-top:10px">${['Janemba', 'two shot Aya 5 étoiles', 'chambre 650', 'prix Makima', 'jetons prestige', 'meilleure compo ranked'].map(x => `<button class="chip" data-q="${x}" style="cursor:pointer">${x}</button>`).join('')}</div>`;
  const ch = $('#ch');
  const say = (t, who) => { const b = document.createElement('div'); b.className = 'bubble ' + who; b.innerHTML = md(t); ch.appendChild(b); ch.scrollTop = ch.scrollHeight; };
  say("Yo. Je connais les fiches des LR, les guides de la Brigade, les chambres du château et les prix du marché. Qu'est-ce que tu veux savoir ?", 'k');
  const ask = q => { if (!q.trim()) return; say(q, 'me'); setTimeout(() => say(answer(q, S.kb), 'k'), 180); };
  $('#kf').onsubmit = e => { e.preventDefault(); ask($('#kq').value); $('#kq').value = ''; };
  m.querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
};

P.discord = async m => {
  m.innerHTML = `<h1>Espace Discord</h1>${DISCORD_INVITE && !DISCORD_INVITE.startsWith('__') ? `<p><a class="btn primary" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener">Rejoindre le Discord</a></p>` : ''}
  <div class="grid">
   <div class="card"><h2>Boîte à questions</h2><form id="qf"><textarea id="qb" placeholder="Ta question pour la Brigade"></textarea><button class="btn primary" style="margin-top:8px">Envoyer</button></form><div id="ql" style="margin-top:14px"></div></div>
   <div class="card"><h2>Mur des records</h2><form id="rf" class="row"><input id="rc" type="number" placeholder="Record château" style="flex:1;min-width:120px"><input id="re" type="number" placeholder="Elo ranked" style="flex:1;min-width:120px"><button class="btn">Mettre à jour</button></form><div id="rl" style="margin-top:14px"></div></div>
   <div class="card"><h2>Échanges</h2><form id="tf"><input id="th" placeholder="J'ai (doublons)"><input id="tw" placeholder="Je cherche" style="margin-top:8px"><button class="btn" style="margin-top:8px">Publier</button></form><div id="tl" style="margin-top:14px"></div></div>
  </div>`;
  const { data: profs } = await sb.from('profiles').select('id,discord').eq('status', 'approved'); const who = id => (profs || []).find(p => p.id === id)?.discord || 'Membre';
  const loadQ = async () => { const { data } = await sb.from('questions').select('*').order('at', { ascending: false }).limit(30); $('#ql').innerHTML = (data || []).map(q => `<div style="border-top:1px solid var(--line);padding:10px 0"><div class="small mute">${esc(who(q.user_id))}</div><div>${esc(q.body)}</div>${q.answer ? `<div class="small bone" style="margin-top:4px">↳ ${esc(q.answer)}</div>` : ''}</div>`).join('') || '<div class="small mute">Aucune question.</div>'; };
  const loadR = async () => { const { data } = await sb.from('records').select('*').order('castle', { ascending: false, nullsFirst: false }); $('#rl').innerHTML = `<table><thead><tr><th>Membre</th><th class="n">Château</th><th class="n">Elo</th></tr></thead><tbody>${(data || []).map(r => `<tr><td>${esc(who(r.user_id))}</td><td class="n">${fmt(r.castle)}</td><td class="n">${fmt(r.elo)}</td></tr>`).join('')}</tbody></table>`; };
  const loadT = async () => { const { data } = await sb.from('trades').select('*').order('at', { ascending: false }).limit(40); $('#tl').innerHTML = (data || []).map(t => `<div style="border-top:1px solid var(--line);padding:10px 0"><div class="row"><b>${esc(who(t.user_id))}</b><span class="sp"></span>${t.user_id === S.user.id ? `<button class="chip" data-del="${t.id}" style="cursor:pointer">Retirer</button>` : ''}</div><div class="small"><span class="mute">A :</span> ${esc(t.has || '—')}</div><div class="small"><span class="mute">Cherche :</span> ${esc(t.wants || '—')}</div></div>`).join('') || '<div class="small mute">Aucun échange.</div>'; $('#tl').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await sb.from('trades').delete().eq('id', b.dataset.del); loadT(); }); };
  $('#qf').onsubmit = async e => { e.preventDefault(); const b = $('#qb').value.trim(); if (!b) return; await sb.from('questions').insert({ body: b }); $('#qb').value = ''; loadQ(); };
  $('#rf').onsubmit = async e => { e.preventDefault(); await sb.from('records').upsert({ user_id: S.user.id, castle: +$('#rc').value || null, elo: +$('#re').value || null, updated_at: new Date().toISOString() }); loadR(); toast('Record enregistré'); };
  $('#tf').onsubmit = async e => { e.preventDefault(); await sb.from('trades').insert({ has: $('#th').value, wants: $('#tw').value }); $('#th').value = $('#tw').value = ''; loadT(); };
  loadQ(); loadR(); loadT();
};

P.admin = async m => {
  if (S.profile.role !== 'admin') { m.innerHTML = '<div class="empty">Réservé aux admins.</div>'; return; }
  m.innerHTML = `<h1>Administration</h1>
  <div class="card section"><h2>Demandes d'accès</h2><div id="pd"></div></div>
  <div class="grid">
   <div class="card"><h2>Calendrier</h2><form id="ef"><label>Titre</label><input id="et" required><label>Détail</label><input id="ed"><label>Type</label><select id="ek"><option value="ranked">ranked</option><option value="prestige">prestige</option><option value="event">événement</option></select><label>Fin (heure de Paris)</label><input id="ee" type="datetime-local" required><label>Se répète tous les … jours (vide = non)</label><input id="er" type="number" min="1"><button class="btn primary" style="margin-top:10px">Ajouter</button></form><div id="el" style="margin-top:12px"></div></div>
   <div class="card"><h2>Nouveauté</h2><form id="nf"><label>Titre</label><input id="nt" required><label>Texte</label><textarea id="nb" required></textarea><button class="btn primary" style="margin-top:10px">Publier</button></form></div>
   <div class="card"><h2>Questions sans réponse</h2><div id="qa"></div></div>
  </div>`;
  const loadP = async () => { const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false }); $('#pd').innerHTML = `<div class="tablewrap"><table><thead><tr><th>@ Discord</th><th>Statut</th><th>Demande</th><th></th></tr></thead><tbody>${(data || []).map(p => `<tr><td><b>${esc(p.discord)}</b>${p.role === 'admin' ? ' <span class="chip red">admin</span>' : ''}</td><td><span class="chip ${p.status === 'approved' ? 'ok' : p.status === 'refused' ? 'red' : 'warn'}">${{ approved: 'validé', refused: 'refusé', pending: 'en attente' }[p.status]}</span></td><td class="small mute">${new Date(p.created_at).toLocaleString('fr-FR')}</td><td class="n">${p.role === 'admin' ? '' : `<button class="btn" data-a="${p.id}" data-s="approved" style="min-height:36px">Valider</button> <button class="btn ghost" data-a="${p.id}" data-s="refused" style="min-height:36px">Refuser</button>`}</td></tr>`).join('')}</tbody></table></div>`; $('#pd').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { await sb.from('profiles').update({ status: b.dataset.s }).eq('id', b.dataset.a); loadP(); }); };
  const loadE = async () => { const { data } = await sb.from('events').select('*').order('ends_at'); $('#el').innerHTML = (data || []).map(e => `<div class="row small" style="border-top:1px solid var(--line);padding:8px 0"><span>${esc(e.title)} · ${new Date(e.ends_at).toLocaleString('fr-FR')}${e.repeat_days ? ` · tous les ${e.repeat_days} j` : ''}</span><span class="sp"></span><button class="chip" data-x="${e.id}" style="cursor:pointer">Supprimer</button></div>`).join(''); $('#el').querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { await sb.from('events').delete().eq('id', b.dataset.x); loadE(); }); };
  const loadQA = async () => { const { data } = await sb.from('questions').select('*').is('answer', null).order('at'); $('#qa').innerHTML = (data || []).map(q => `<div style="border-top:1px solid var(--line);padding:8px 0"><div>${esc(q.body)}</div><div class="row" style="margin-top:6px"><input data-qa="${q.id}" placeholder="Réponse" style="flex:1;min-height:38px"><button class="btn" data-qs="${q.id}" style="min-height:38px">OK</button></div></div>`).join('') || '<div class="small mute">Rien à répondre.</div>'; $('#qa').querySelectorAll('[data-qs]').forEach(b => b.onclick = async () => { const v = $(`[data-qa="${b.dataset.qs}"]`).value; await sb.from('questions').update({ answer: v }).eq('id', b.dataset.qs); loadQA(); }); };
  $('#ef').onsubmit = async e => { e.preventDefault(); const r = await sb.from('events').insert({ title: $('#et').value, detail: $('#ed').value || null, kind: $('#ek').value, ends_at: new Date($('#ee').value).toISOString(), repeat_days: +$('#er').value || null }); if (r.error) return toast(r.error.message); e.target.reset(); loadE(); };
  $('#nf').onsubmit = async e => { e.preventDefault(); await sb.from('news').insert({ title: $('#nt').value, body: $('#nb').value }); e.target.reset(); toast('Publié'); };
  loadP(); loadE(); loadQA();
};

/* ---------- Routeur ---------- */
async function render() {
  S.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); S.timers = [];
  const h = (location.hash || '#accueil').slice(1);
  const [base, arg] = h.split('/');
  const route = base === 'guide' ? h : base;
  const m = shell(route);
  try { await (P[base] || P.accueil)(m, arg); } catch (e) { m.innerHTML = `<div class="empty">Erreur de chargement : ${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
}

async function boot() {
  S.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); S.timers = [];
  if (SUPABASE_URL.startsWith('__')) { app.innerHTML = '<div class="auth"><div class="auth-card"><h1>Configuration manquante</h1><p class="mute">Le site n\'est pas encore relié à sa base de données.</p></div></div>'; return; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return authView();
  S.user = session.user;
  const { data: p } = await sb.from('profiles').select('*').eq('id', S.user.id).single();
  if (!p) return authView('login', 'Profil introuvable.');
  S.profile = p;
  if (p.status !== 'approved') return pendingView(p);
  try { await loadKB(); } catch (e) { app.innerHTML = `<div class="auth"><div class="auth-card"><h1>Oups</h1><p>${esc(e.message)}</p></div></div>`; return; }
  window.onhashchange = render; render();
}
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') authView(); });
boot();

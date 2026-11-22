import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import * as CFG from './config.js?v=6';
const { SUPABASE_URL, SUPABASE_ANON_KEY, DISCORD_INVITE, EMAIL_DOMAIN } = CFG;
import { answer, statsAt, towerAt, twoShotRoom, ROLE, setTwoShot, priceStats } from './kakashi.js?v=6';

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
const SPIDER = `<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 3v9"/><path d="M19 17 13 9 6 7M18 21 9 18 2 20M18 26 9 30 4 37M20 30 15 38 14 46"/><path d="M29 17 35 9 42 7M30 21 39 18 46 20M30 26 39 30 44 37M28 30 33 38 34 46"/></g><path d="M24 12c3 0 5 2.3 5 5.2S27 22 24 22s-5-1.9-5-4.8S21 12 24 12z" fill="currentColor"/><path d="M24 21c4.4 0 7.5 4.2 7.5 9.4 0 5.6-3.4 10.6-7.5 10.6s-7.5-5-7.5-10.6C16.5 25.2 19.6 21 24 21z" fill="currentColor"/><path d="M24 26.5l2.2 3.5L24 33.5 21.8 30z" fill="#070607"/></svg>`;

const ROUTES = [
  ['accueil', 'Accueil', 'home'], ['kakashi', 'Kakashi Bot', 'bot'], ['meslr', 'Mes LR', 'users'],
  ['sep', 'Château de l\'infini'], ['guide/chateau', 'Guide du château', 'book'], ['equipe/chateau', 'Meilleure équipe', 'layers'], ['calculs', 'Calculateurs', 'calc'],
  ['sep', 'Ranked'], ['guide/ranked', 'Guide ranked', 'book'], ['equipe/ranked', 'Meilleure équipe', 'layers'], ['simulateur', 'Simulateur de match', 'layers'],
  ['sep', 'Salle du temps'], ['guide/temps', 'Guide salle du temps', 'book'],
  ['sep', 'Collection et Prestige'], ['checklist', 'Collection Prestige', 'check'], ['guide/prestige', 'Guide Prestige', 'book'], ['guide/eveil', 'Éveil des cartes', 'book'], ['guide/raids', 'Raids et farm', 'book'],
  ['sep', 'Cartes'], ['persos', 'Fiches perso', 'users'], ['guide/roles', 'Cartes par rôle', 'book'],
  ['sep', 'Marché'], ['prix', 'Prix en direct', 'chart'], ['alertes', 'Alertes prix', 'bell'],
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
${CFG.DISCORD_LOGIN ? `<button class="btn discord" id="dl" style="width:100%;margin-top:14px"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20 4.6A18 18 0 0 0 15.6 3l-.6 1.2a16 16 0 0 0-6 0L8.4 3A18 18 0 0 0 4 4.6C1.2 8.8.5 12.8.8 16.8A18 18 0 0 0 6.3 19.6l1.2-1.9a11 11 0 0 1-1.8-.9l.4-.3a12.8 12.8 0 0 0 11.8 0l.4.3a11 11 0 0 1-1.8.9l1.2 1.9a18 18 0 0 0 5.5-2.8c.4-4.6-.7-8.6-3.2-12.2zM8.7 14.4c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2zm6.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2z"/></svg>Se connecter avec Discord</button>
    <p class="small mute" style="margin:8px 0 0">On vérifie automatiquement que tu es sur le serveur de la Brigade : accès immédiat, aucun mot de passe.</p>` : ''}
    <details class="alt"${!CFG.DISCORD_LOGIN || mode === 'signup' || note ? ' open' : ''}><summary>Connexion avec mot de passe (anciens comptes)</summary>
    <div class="tabs"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">Se connecter</button><button data-m="signup" class="${mode === 'signup' ? 'on' : ''}">Demander l'accès</button></div>
    <form id="af">
      <label for="dc">Ton @ Discord</label><input id="dc" autocomplete="username" placeholder="@pseudo" required>
      <label for="pw">Mot de passe</label><input id="pw" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="6" required>
      ${mode === 'signup' ? '<p class="small mute">Un admin vérifie que tu es bien sur le Discord de la Brigade, puis valide ton accès.</p>' : ''}
      <button class="btn primary" style="width:100%;margin-top:16px">${mode === 'login' ? 'Entrer' : 'Envoyer ma demande'}</button>
    </form></details>${note ? `<div class="msg">${esc(note)}</div>` : ''}</div></div>`;
  if ($('#dl')) $('#dl').onclick = () => sb.auth.signInWithOAuth({ provider: 'discord', options: { scopes: 'identify guilds', redirectTo: location.origin + location.pathname } });
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
    <p>${p.status === 'refused' ? (p.why === 'not_member' ? 'Ton compte Discord n\'est pas sur le serveur de la Brigade Fantôme. Rejoins le serveur puis reconnecte-toi.' : 'Ta demande n\'a pas été acceptée. Parle à un admin sur le Discord.') : `Merci <b>${esc(p.discord)}</b>. Un admin vérifie que tu es sur le Discord de la Brigade. Cette page s'ouvrira dès que c'est validé.`}</p>
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
  <main id="mainw"><div id="alertbar"></div><div id="main"></div></main></div>`;
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
      ${[['guide/chateau', 'Château de l\'infini', 'La boucle Aya, le focus et les chambres limites par étoile.'], ['guide/prestige', 'Prestige', 'Jetons, univers à compléter, booster Prestige.'], ['guide/temps', 'Salle du temps', 'Farmer du KI et des boosters efficacement.'], ['guide/ranked', 'Ranked', 'Construire son équipe et gagner ses matchs.']]
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
  if (key === 'eveil') return evoGuide(m); if (key === 'raids') return raidGuide(m); if (key === 'roles') return rolesGuide(m);
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
      const ih = S.kb.card_images?.byName?.[c.n];
      return `<div class="card pcard">${ih ? `<div class="pimg"><img loading="lazy" src="${S.kb.card_images.base}${ih}.webp" alt="${esc(c.n)}"></div>` : ''}<div class="row"><span class="chip ${c.r === 'Transcendant' ? 'warn' : 'red'}">${c.r || 'LR'}</span>${c.c ? `<span class="chip">${ROLE[c.c] || c.c}</span>` : ''}${c.p ? '<span class="chip">Prestige</span>' : ''}</div>
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

/* ---------- Collection Prestige : ma collection, membres, échanges ---------- */
const RN = { S: 'LR', M: 'Mythique', L: 'SSR', E: 'Épique', R: 'Rare', C: 'Commune', T: 'Transcendante' };
const img = h => h ? `${S.kb.prestige_series?.base || 'https://yurocollection.fr/card-art/'}${h}.webp` : '';
async function loadCollections() {
  const [{ data: rows }, { data: profs }] = await Promise.all([sb.from('checklist').select('user_id,universe,owned,dupes'), sb.from('profiles').select('id,discord,share,status').eq('status', 'approved')]);
  const C = {}; for (const r of rows || []) { const u = (C[r.user_id] = C[r.user_id] || {}); u[r.universe] = { owned: new Set(r.owned || []), dupes: new Set(r.dupes || []) }; }
  S.coll = C; S.members = profs || []; return C;
}
const myColl = () => (S.coll[S.user.id] = S.coll[S.user.id] || {});
const uget = (coll, u) => coll[u] || (coll[u] = { owned: new Set(), dupes: new Set() });
const ownN = (coll, u) => { const r = coll[u.s]; return r ? u.c.filter(c => r.owned.has(c[0])).length : 0; };

P.checklist = async (m, tab = 'moi') => {
  const PS = S.kb.prestige_series; const U = PS?.series || [];
  if (!U.length) { m.innerHTML = '<h1>Collection Prestige</h1><div class="empty">La liste des univers arrive bientôt.</div>'; return; }
  await loadCollections();
  m.innerHTML = `<h1>Collection Prestige</h1>
    <div class="tabs" id="ct" style="max-width:560px"><button data-t="moi">Ma collection</button><button data-t="membres">Membres</button><button data-t="echanges">Échanges</button></div><div id="cv" style="margin-top:16px"></div>`;
  const go = t => { $('#ct').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); history.replaceState(null, '', '#checklist/' + t); ({ moi: viewMine, membres: viewMembers, echanges: viewTrades })[t]?.($('#cv'), U, PS); };
  $('#ct').querySelectorAll('button').forEach(b => b.onclick = () => go(b.dataset.t));
  go(['moi', 'membres', 'echanges'].includes(tab) ? tab : tab?.startsWith('m:') ? 'membres' : 'moi');
  if (tab?.startsWith('m:')) viewProfile($('#cv'), U, tab.slice(2));
};

function viewMine(el, U, PS) {
  const coll = myColl(); const open = new Set(); let mode = 'own';
  const save = u => { const r = uget(coll, u.s); return sb.from('checklist').upsert({ user_id: S.user.id, universe: u.s, done: ownN(coll, u) === u.c.length, owned: [...r.owned], dupes: [...r.dupes], missing: '' }); };
  el.innerHTML = `<p class="mute">Les ${U.length} univers qui comptent pour le Prestige (au moins ${PS.min} cartes, hors Exclusives et Transcendantes). Touche les cartes que tu as : un univers complet rapporte <b>${PS.tokens || 3} jetons</b> avec « Récupérer +3 » dans l'onglet Prestige du jeu.</p>
    <div class="card section" id="sum"></div>
    <div class="card section"><div class="row"><div style="flex:1;min-width:220px"><b>Partager ma collection avec la Brigade</b><div class="small mute">Les membres voient tes cartes manquantes et tes doublons pour te proposer des échanges. Tu peux l'enlever quand tu veux.</div></div><label class="switch"><input type="checkbox" id="sh" ${S.profile.share ? 'checked' : ''}><span></span></label></div></div>
    <div class="row"><div class="tabs" id="md" style="margin:0"><button data-m="own" class="on">Je l'ai</button><button data-m="dupe">Doublon à échanger</button></div><input id="q" placeholder="Rechercher un univers ou une carte" style="flex:1;min-width:200px"><select id="fl" style="width:auto"><option value="">Tous</option><option value="near">Presque complets (≤ 3 manquantes)</option><option value="todo">À compléter</option><option value="done">Complétés</option></select></div>
    <p class="small mute" id="mh" style="margin-top:8px"></p><div id="ul" style="display:grid;gap:10px;margin-top:6px"></div>`;
  $('#sh').onchange = async e => { const { error } = await sb.rpc('set_share', { v: e.target.checked }); if (error) { toast(error.message); e.target.checked = !e.target.checked; return; } S.profile.share = e.target.checked; toast(e.target.checked ? 'Collection partagée avec la Brigade' : 'Collection privée'); };
  const mh = () => $('#mh').textContent = mode === 'own' ? 'Touche une carte pour dire que tu l\'as. En gris : celles qui te manquent.' : 'Touche une carte que tu as en double : elle apparaîtra dans les échanges de la Brigade.';
  $('#md').querySelectorAll('button').forEach(b => b.onclick = () => { mode = b.dataset.m; $('#md').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); mh(); list(); }); mh();
  const sum = () => { const done = U.filter(u => ownN(coll, u) === u.c.length).length, cards = U.reduce((a, u) => a + u.c.length, 0), got = U.reduce((a, u) => a + ownN(coll, u), 0), du = U.reduce((a, u) => a + (coll[u.s]?.dupes.size || 0), 0);
    $('#sum').innerHTML = `<div class="row"><b>${done} / ${U.length} univers complétés</b><span class="sp"></span><span class="bone">${done * (PS.tokens || 3)} jetons</span></div><div class="bar" style="margin-top:10px"><i style="width:${done / U.length * 100}%"></i></div><div class="small mute" style="margin-top:8px">${fmt(got)} / ${fmt(cards)} cartes · ${du} doublon${du > 1 ? 's' : ''} à échanger</div>`; };
  const list = () => {
    const q = $('#q').value.toLowerCase().trim(), fl = $('#fl').value;
    const rows = U.filter(u => { const miss = u.c.length - ownN(coll, u);
      if (fl === 'done' && miss) return false; if (fl === 'todo' && !miss) return false; if (fl === 'near' && (miss === 0 || miss > 3)) return false;
      return !q || u.s.toLowerCase().includes(q) || u.c.some(c => c[0].toLowerCase().includes(q)); });
    if (fl === 'near') rows.sort((a, b) => (a.c.length - ownN(coll, a)) - (b.c.length - ownN(coll, b)));
    $('#ul').innerHTML = rows.map(u => { const o = ownN(coll, u), miss = u.c.length - o, r = uget(coll, u.s), byQ = q && !u.s.toLowerCase().includes(q), isO = open.has(u.s) || byQ;
      return `<div class="check uni ${miss ? '' : 'done'}" data-u="${esc(u.s)}"><button class="uhead" data-t="${esc(u.s)}" aria-expanded="${isO}"><div style="flex:1;text-align:left"><b>${esc(u.s)}</b><div class="small mute">${miss ? `${miss} manquante${miss > 1 ? 's' : ''}` : 'Complet ✓'} · ${o}/${u.c.length}${r.dupes.size ? ` · ${r.dupes.size} doublon${r.dupes.size > 1 ? 's' : ''}` : ''}</div></div><div class="ring" style="--p:${o / u.c.length * 100}"><span>${Math.round(o / u.c.length * 100)}%</span></div></button>
      ${isO ? `<div class="tiles">${u.c.filter(c => !byQ || c[0].toLowerCase().includes(q)).map(c => tile(c, r.owned.has(c[0]), r.dupes.has(c[0]))).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn ghost" data-all="1" style="min-height:36px">Tout cocher</button><button class="btn ghost" data-all="0" style="min-height:36px">Tout décocher</button></div>` : ''}</div>`; }).join('') || '<div class="empty">Aucun univers.</div>';
    $('#ul').querySelectorAll('.uhead').forEach(b => b.onclick = () => { const u = b.dataset.t; open.has(u) ? open.delete(u) : open.add(u); list(); });
    $('#ul').querySelectorAll('.uni').forEach(box => { const u = U.find(x => x.s === box.dataset.u); if (!u) return;
      box.querySelectorAll('.tile').forEach(b => b.onclick = async () => { const r = uget(coll, u.s), n = b.dataset.c;
        if (mode === 'own') { if (r.owned.has(n)) { r.owned.delete(n); r.dupes.delete(n); } else r.owned.add(n); }
        else { if (r.dupes.has(n)) r.dupes.delete(n); else { r.dupes.add(n); r.owned.add(n); } }
        open.add(u.s); await save(u); sum(); list(); });
      box.querySelectorAll('[data-all]').forEach(b => b.onclick = async () => { const r = uget(coll, u.s); r.owned = new Set(b.dataset.all === '1' ? u.c.map(c => c[0]) : []); if (b.dataset.all !== '1') r.dupes = new Set(); await save(u); sum(); list(); }); });
  };
  $('#q').oninput = list; $('#fl').oninput = list; sum(); list();
}
const tile = (c, own, dupe, extra = '') => `<button class="tile r${c[1]} ${own ? 'on' : ''}" data-c="${esc(c[0])}" title="${esc(c[0])} · ${RN[c[1]] || ''}">${c[2] ? `<img loading="lazy" decoding="async" src="${img(c[2])}" alt="">` : '<div class="noimg"></div>'}${dupe ? '<b class="dup">×2</b>' : ''}<span>${esc(c[0])}</span>${extra}</button>`;

function memberStats(id, U) { const coll = S.coll[id] || {}; const done = U.filter(u => ownN(coll, u) === u.c.length).length; const got = U.reduce((a, u) => a + ownN(coll, u), 0); const du = U.reduce((a, u) => a + (coll[u.s]?.dupes.size || 0), 0); return { done, got, du }; }
function viewMembers(el, U) {
  const sharing = S.members.filter(p => p.share && p.id !== S.user.id);
  el.innerHTML = `<p class="mute">Les membres qui partagent leur collection. Touche un profil pour voir ses cartes manquantes et ses doublons.</p>
    <div class="card section"><h2>Qui cherche quoi</h2><input id="wq" placeholder="Tape une carte : qui la cherche, qui l'a en double ?"><div id="wr" style="margin-top:10px"></div></div>
    <div class="grid" id="ml">${sharing.map(p => { const s = memberStats(p.id, U); return `<a class="card" href="#checklist/m:${p.id}"><h3>${esc(p.discord)}</h3><div class="small mute">${s.done} univers complets · ${fmt(s.got)} cartes · ${s.du} doublon${s.du > 1 ? 's' : ''}</div></a>`; }).join('') || '<div class="empty">Personne ne partage encore sa collection. Active le partage dans « Ma collection » pour lancer le mouvement.</div>'}</div>`;
  $('#wq').oninput = () => { const q = $('#wq').value.toLowerCase().trim(); if (q.length < 2) { $('#wr').innerHTML = ''; return; }
    const hits = []; for (const u of U) for (const c of u.c) if (c[0].toLowerCase().includes(q)) hits.push([u, c]);
    $('#wr').innerHTML = hits.slice(0, 12).map(([u, c]) => { const need = [], has = [];
      for (const p of S.members) { if (!p.share && p.id !== S.user.id) continue; const r = S.coll[p.id]?.[u.s]; if (!r?.owned.has(c[0])) need.push(p.discord); if (r?.dupes.has(c[0])) has.push(p.discord); }
      return `<div class="whorow">${c[2] ? `<img src="${img(c[2])}" alt="" loading="lazy">` : ''}<div><b>${esc(c[0])}</b> <span class="small mute">${esc(u.s)} · ${RN[c[1]]}</span><div class="small"><span class="up">En double chez :</span> ${has.map(esc).join(', ') || '<span class="mute">personne</span>'}</div><div class="small"><span class="red">Cherchée par :</span> ${need.map(esc).join(', ') || '<span class="mute">personne</span>'}</div></div></div>`; }).join('') || '<div class="mute small">Aucune carte trouvée.</div>'; };
}
function viewProfile(el, U, id) {
  const p = S.members.find(x => x.id === id); if (!p || (!p.share && id !== S.user.id)) { el.innerHTML = '<div class="empty">Ce membre ne partage pas sa collection.</div>'; return; }
  const coll = S.coll[id] || {}, mine = myColl(), s = memberStats(id, U);
  const inc = U.map(u => ({ u, miss: u.c.filter(c => !coll[u.s]?.owned.has(c[0])) })).filter(x => x.miss.length && x.miss.length < x.u.c.length).sort((a, b) => a.miss.length - b.miss.length);
  const dupes = U.flatMap(u => u.c.filter(c => coll[u.s]?.dupes.has(c[0])).map(c => [u, c]));
  el.innerHTML = `<a href="#checklist/membres" class="btn ghost" style="min-height:36px">← Membres</a>
    <section class="hero" style="margin-top:12px"><div class="moon"></div><span class="chip red">Profil</span><h1 style="margin-top:12px">${esc(p.discord)}</h1><p class="mute">${s.done} univers complets · ${fmt(s.got)} cartes · ${s.du} doublons</p></section>
    <div class="section"><h2>Ses doublons</h2><p class="small mute">En vert : ceux qui te manquent.</p><div class="tiles">${dupes.map(([u, c]) => tile(c, !mine[u.s]?.owned.has(c[0]), false)).join('') || '<div class="mute">Aucun doublon déclaré.</div>'}</div></div>
    <div class="section"><h2>Ses cartes manquantes</h2><p class="small mute">Univers commencés, du plus proche de la fin au plus lointain. En vert : celles que tu as en double.</p>
    ${inc.map(x => `<div class="card" style="margin:10px 0"><div class="row"><b>${esc(x.u.s)}</b><span class="sp"></span><span class="small mute">${x.miss.length} manquante${x.miss.length > 1 ? 's' : ''}</span></div><div class="tiles" style="margin-top:10px">${x.miss.map(c => tile(c, !!mine[x.u.s]?.dupes.has(c[0]), false)).join('')}</div></div>`).join('') || '<div class="mute">Rien à afficher.</div>'}</div>`;
}
function viewTrades(el, U) {
  const mine = myColl(); const out = [];
  for (const p of S.members) { if (!p.share || p.id === S.user.id) continue; const th = S.coll[p.id] || {}; const give = [], get = [];
    for (const u of U) for (const c of u.c) { if (th[u.s]?.dupes.has(c[0]) && !mine[u.s]?.owned.has(c[0])) get.push(c); if (mine[u.s]?.dupes.has(c[0]) && !th[u.s]?.owned.has(c[0])) give.push(c); }
    if (give.length || get.length) out.push({ p, give, get, score: Math.min(give.length, get.length) * 10 + give.length + get.length }); }
  out.sort((a, b) => b.score - a.score);
  el.innerHTML = `<p class="mute">Les échanges possibles avec les membres qui partagent leur collection : ce qu'ils ont en double et qui te manque, et ce que tu as en double et qui leur manque. Pense à déclarer tes doublons dans « Ma collection ».</p>
    ${S.profile.share ? '' : '<div class="msg">Ta collection n\'est pas partagée : les autres ne te voient pas dans leurs échanges.</div>'}
    ${out.map(o => `<div class="card section"><div class="row"><h3 style="margin:0">${esc(o.p.discord)}</h3><span class="sp"></span>${o.give.length && o.get.length ? '<span class="chip ok">Échange gagnant-gagnant</span>' : ''}<a class="btn ghost" href="#checklist/m:${o.p.id}" style="min-height:36px">Profil</a></div>
      <div class="small mute" style="margin-top:10px">Il peut te donner (${o.get.length})</div><div class="tiles">${o.get.map(c => tile(c, true, false)).join('') || '<span class="mute small">—</span>'}</div>
      <div class="small mute" style="margin-top:10px">Tu peux lui donner (${o.give.length})</div><div class="tiles">${o.give.map(c => tile(c, true, false)).join('') || '<span class="mute small">—</span>'}</div></div>`).join('') || '<div class="empty">Pas encore d\'échange possible. Plus il y a de membres qui partagent et déclarent leurs doublons, plus il y en aura.</div>'}`;
}

/* ---------- Alertes prix ---------- */
async function loadWatch() { const { data } = await sb.from('content').select('data').eq('key', 'market_watch').maybeSingle(); S.watch = data?.data || { cards: {} }; return S.watch; }
async function loadAlerts() { const { data } = await sb.from('alerts').select('*'); S.alerts = data || []; return S.alerts; }
const alertLimit = a => a.max_price || S.prices.find(p => p.card === a.card)?.good || null;
function firedAlerts() { const W = S.watch?.cards || {}; return (S.alerts || []).filter(a => { const w = W[a.card], lim = alertLimit(a); return w && w.min != null && lim && w.min <= lim; }).map(a => ({ ...a, now: W[a.card].min, lim: alertLimit(a) })); }

P.alertes = async m => {
  await Promise.all([loadWatch(), loadAlerts()]);
  const lr = S.kb.cards.filter(c => !c.r && !c.p).map(c => c.n).sort((a, b) => a.localeCompare(b));
  m.innerHTML = `<h1>Alertes prix</h1><p class="mute">Choisis les LR que tu veux acheter. Dès qu'une annonce passe sous ton prix (par défaut le « bon prix » du guide), elle s'allume ici et sur l'accueil. Les annonces du marché sont relevées toutes les 5 minutes.</p>
    <div class="card section"><h2>Nouvelle alerte</h2><div class="row"><div style="flex:2;min-width:200px"><label for="ac">Carte</label><select id="ac">${lr.map(n => `<option>${esc(n)}</option>`).join('')}</select></div><div style="flex:1;min-width:150px"><label for="ap">Prix max (KI)</label><input id="ap" type="number" min="1" placeholder="Bon prix"></div><div style="align-self:flex-end"><button class="btn primary" id="aa">Ajouter</button></div></div><p class="small mute" id="ah"></p>
    <div class="row" style="margin-top:6px"><button class="btn ghost" id="an" style="min-height:36px">${ico('bell')} Notifications de ce navigateur</button><span class="small mute" id="ans"></span></div></div>
    <div id="al"></div><div class="section"><h2>Moins chères en vente en ce moment</h2><p class="small mute" id="wat"></p><div class="tablewrap"><table><thead><tr><th>Carte</th><th class="n">En vente</th><th class="n">Moins chère</th><th class="n">Bon prix</th><th class="n">Écart</th></tr></thead><tbody id="wt"></tbody></table></div></div>`;
  const hint = () => { const p = S.prices.find(x => x.card === $('#ac').value); $('#ah').textContent = p ? `Bon prix ${fmt(p.good)} KI · prix médian ${fmt(p.median)} KI · max conseillé ${fmt(p.max)} KI (ventes des 7 derniers jours)` : 'Pas assez de ventes récentes pour un bon prix : indique ton prix max.'; };
  const draw = () => { const W = S.watch.cards || {}, fired = new Set(firedAlerts().map(a => a.card));
    $('#al').innerHTML = S.alerts.length ? `<div class="grid">${S.alerts.map(a => { const w = W[a.card], lim = alertLimit(a), on = fired.has(a.card);
      return `<div class="card ${on ? 'fire' : ''}"><div class="row"><span class="chip ${on ? 'ok' : ''}">${on ? '🔔 Sous ton prix' : 'En veille'}</span><span class="sp"></span><button class="btn ghost" data-d="${esc(a.card)}" style="min-height:32px;padding:0 10px" aria-label="Supprimer">✕</button></div><h3 style="margin-top:10px">${esc(a.card)}</h3>
      <div class="row small"><span>Ton prix : <b>${lim ? fmt(lim) + ' KI' : '—'}</b>${a.max_price ? '' : ' <span class="mute">(bon prix)</span>'}</span><span class="sp"></span><span>${w ? `Moins chère : <b class="${on ? 'up' : ''}">${fmt(w.min)} KI</b>` : '<span class="mute">Aucune en vente</span>'}</span></div></div>`; }).join('')}</div>` : '<div class="empty">Aucune alerte pour l\'instant.</div>';
    $('#al').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { await sb.from('alerts').delete().eq('user_id', S.user.id).eq('card', b.dataset.d); await loadAlerts(); draw(); });
    const rows = Object.entries(W).map(([n, w]) => { const p = S.prices.find(x => x.card === n); return { ...w, card: n, good: p?.good, gap: p?.good ? (w.min - p.good) / p.good * 100 : null }; }).sort((a, b) => (a.gap ?? 999) - (b.gap ?? 999));
    $('#wt').innerHTML = rows.map(r => `<tr><td><b>${esc(r.card)}</b></td><td class="n">${r.n}</td><td class="n">${fmt(r.min)}</td><td class="n">${fmt(r.good)}</td><td class="n ${r.gap != null && r.gap <= 0 ? 'up' : ''}">${r.gap == null ? '—' : (r.gap > 0 ? '+' : '') + r.gap.toFixed(0) + ' %'}</td></tr>`).join('') || '<tr><td colspan="5" class="mute">Aucune LR en vente.</td></tr>';
    $('#wat').textContent = S.watch.at ? `Relevé ${new Date(S.watch.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''; };
  $('#ac').oninput = hint; hint();
  $('#aa').onclick = async () => { const card = $('#ac').value, v = +$('#ap').value || null; const { error } = await sb.from('alerts').upsert({ user_id: S.user.id, card, max_price: v }); if (error) return toast(error.message); toast('Alerte ajoutée'); $('#ap').value = ''; await loadAlerts(); draw(); };
  const ns = () => { $('#ans').textContent = !('Notification' in window) ? 'Non disponible sur ce navigateur.' : Notification.permission === 'granted' ? 'Activées : tu es prévenu tant que le site est ouvert.' : Notification.permission === 'denied' ? 'Bloquées dans les réglages du navigateur.' : ''; };
  $('#an').onclick = async () => { if ('Notification' in window) { await Notification.requestPermission(); ns(); } }; ns();
  draw();
  S.timers.push(setInterval(async () => { if (!$('#al')) return; await loadWatch(); draw(); }, 60000));
};

// Surveillance en arrière-plan : bandeau + notification du navigateur quand une alerte s'allume.
async function alertLoop() {
  try { await Promise.all([loadWatch(), loadAlerts()]); } catch { return; }
  const fired = firedAlerts(); let seen = {}; try { seen = JSON.parse(localStorage.getItem('bf-alert-seen') || '{}'); } catch {}
  for (const a of fired) { const k = a.card + ':' + a.now; if (seen[k]) continue; seen[k] = Date.now();
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('Brigade Fantôme · alerte prix', { body: `${a.card} à ${fmt(a.now)} KI (ton prix ${fmt(a.lim)} KI)` }); } catch {} } }
  try { localStorage.setItem('bf-alert-seen', JSON.stringify(seen)); } catch {}
  const el = $('#alertbar'); if (el) el.innerHTML = fired.length ? `<a class="alertbar" href="#alertes">🔔 ${fired.map(a => `<b>${esc(a.card)}</b> ${fmt(a.now)} KI`).join(' · ')}</a>` : '';
}


/* ---------- Mes LR + meilleure équipe (château / ranked) ---------- */
async function loadMyLR() { if (S.mylr) return S.mylr; const { data } = await sb.from('my_lr').select('*').eq('user_id', S.user.id).maybeSingle(); S.mylr = data || { cards: {}, teams: {} }; return S.mylr; }
const saveMyLR = () => sb.from('my_lr').upsert({ user_id: S.user.id, cards: S.mylr.cards, teams: S.mylr.teams || {}, updated_at: new Date().toISOString() });
const lrImg = c => { const h = S.kb.card_images?.byName?.[c.n]; return h ? `${S.kb.card_images.base}${h}.webp` : ''; };
const LRS = () => S.kb.cards.filter(c => !c.r);

P.meslr = async m => {
  await loadMyLR(); const own = S.mylr.cards;
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Indispensable</span><h1 style="margin-top:12px">Mes LR</h1><p class="mute">Indique les LR que tu possèdes et leurs étoiles. C'est la base de « Meilleure équipe » au château et en ranked : sans ça, on ne peut pas te conseiller. Ça prend une minute.</p></section>
    <div class="card section" id="lsum"></div><div class="lrgrid" id="lg"></div>`;
  const sum = () => { const n = Object.keys(own).length; $('#lsum').innerHTML = `<div class="row"><b>${n} / ${LRS().length} LR possédées</b><span class="sp"></span><a class="btn primary" href="#equipe/chateau" style="min-height:40px">Meilleure équipe château</a><a class="btn" href="#equipe/ranked" style="min-height:40px">Meilleure équipe ranked</a></div><p class="small mute" style="margin:8px 0 0">Touche une carte pour l'ajouter, puis choisis ses étoiles. Les versions prestige ont des étoiles fixes.</p>`; };
  const draw = () => { $('#lg').innerHTML = LRS().map(c => { const st = own[c.id]; const has = st != null;
    return `<div class="lr ${has ? 'on' : ''}" data-id="${c.id}"><button class="lrimg" data-t="${c.id}" aria-pressed="${has}">${lrImg(c) ? `<img loading="lazy" src="${lrImg(c)}" alt="">` : ''}<span>${esc(c.n)}</span></button>
      ${has && !c.p ? `<div class="stars">${[0, 1, 2, 3, 4, 5].map(k => `<button data-s="${k}" class="${st === k ? 'on' : ''}" aria-label="${k} étoiles">${k}★</button>`).join('')}</div>` : has ? '<div class="stars"><span class="small mute">Prestige</span></div>' : ''}</div>`; }).join('');
    $('#lg').querySelectorAll('.lrimg').forEach(b => b.onclick = async () => { const id = b.dataset.t; if (own[id] != null) delete own[id]; else own[id] = 0; draw(); sum(); await saveMyLR(); });
    $('#lg').querySelectorAll('.stars button').forEach(b => b.onclick = async () => { const id = b.closest('.lr').dataset.id; own[id] = +b.dataset.s; draw(); await saveMyLR(); }); };
  sum(); draw();
};

const HEALERS = [3248, 408], AYA = 953;
const roleOk = t => new Set(t.map(c => c.c || c.id)).size === t.length;
// Course aux dégâts simplifiée (attaques simples, soin de 30 % tous les 3 tours) : sert pour les équipes sans Aya.
function raceWins(team, own, room) {
  const g = towerAt(null, room); const st = c => (c.p ? 0 : own[c.id] || 0);
  const us = team.map(c => { const s = statsAt(c, st(c)); return { hp: s.hp, max: s.hp, atk: s.atk, heal: HEALERS.includes(c.id) }; });
  const en = [g.hp, g.hp, g.hp];
  for (let t = 1; t < 60; t++) {
    for (const u of us) { if (u.hp <= 0) continue; if (u.heal && t % 3 === 0) { for (const v of us) if (v.hp > 0) v.hp = Math.min(v.max, v.hp + Math.max(1, Math.round(v.max * .3))); continue; }
      const i = en.findIndex(x => x > 0); if (i < 0) return true; en[i] -= u.atk; }
    if (en.every(x => x <= 0)) return true;
    for (let k = 0; k < 3; k++) { if (en[k] <= 0) continue; const alive = us.filter(u => u.hp > 0); if (!alive.length) return false; alive.sort((a, b) => a.hp - b.hp)[0].hp -= g.atk; }
    if (us.every(u => u.hp <= 0)) return false;
  }
  return false;
}
function raceRoom(team, own) { let lo = 1, hi = 1500; if (!raceWins(team, own, 1)) return 0; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (raceWins(team, own, mid)) lo = mid; else hi = mid - 1; } return lo; }
function castleEval(team, own) {
  const st = c => (c.p ? 0 : own[c.id] || 0); const heal = team.some(c => HEALERS.includes(c.id)); const aya = team.find(c => c.id === AYA);
  const race = raceRoom(team, own);
  if (aya) return { room: Math.max(twoShotRoom(null, aya, st(aya), heal), race), aya: true, heal };
  return { room: race, aya: false, heal };
}
function rankedScore(team, own) {
  const st = c => (c.p ? 0 : own[c.id] || 0); let sc = 0;
  for (const c of team) { const s = statsAt(c, st(c)); sc += s.hp / 100 + s.atk / 10; }
  const ids = team.map(c => c.id); const has = id => ids.includes(id);
  if (team.some(c => HEALERS.includes(c.id))) sc += 6; if (team.some(c => c.c === 'stunner')) sc += 4;
  if (has(1070) || has(961)) sc += 5; if (has(3247)) sc += 6; if (has(499)) sc += 3;
  return Math.round(sc);
}
const META = [[1070, 3248, 3247], [308, 1070, 3247], [340, 1070, 3248], [961, 3247, 3248]];
function bestTeam(mode, own) {
  const C = LRS().filter(c => own[c.id] != null); if (C.length < 3) return null;
  if (mode === 'ranked') { for (const t of META) if (t.every(id => own[id] != null)) return { team: t.map(id => C.find(c => c.id === id)), meta: true }; }
  let best = null;
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) for (let k = j + 1; k < C.length; k++) { const t = [C[i], C[j], C[k]]; if (!roleOk(t)) continue;
    const v = mode === 'chateau' ? (() => { if (!t.some(c => c.id === AYA) && C.some(c => c.id === AYA)) return -1; const e = castleEval(t, own); return e.room * 1000 + (e.aya ? 500 : 0) + (t.some(c => [340, 329, 499].includes(c.id)) ? 100 : 0) + rankedScore(t, own) / 10; })() : rankedScore(t, own);
    if (!best || v > best.v) best = { team: t, v }; }
  return best;
}
function teamPicker(team, own, mode) {
  const C = LRS().filter(c => own[c.id] != null);
  return [0, 1, 2].map(i => `<select data-slot="${i}" aria-label="Carte ${i + 1}"><option value="">— carte ${i + 1} —</option>${C.map(c => `<option value="${c.id}" ${team[i]?.id === c.id ? 'selected' : ''}>${esc(c.n)}${c.p ? '' : ' ' + (own[c.id] || 0) + '★'}</option>`).join('')}</select>`).join('');
}
const teamCards = (team, own) => `<div class="teamrow">${team.map(c => `<div class="tm">${lrImg(c) ? `<img src="${lrImg(c)}" alt="">` : ''}<b>${esc(c.n)}</b><span class="small mute">${ROLE[c.c] || 'Sans rôle'} · ${c.p ? 'prestige' : (own[c.id] || 0) + '★'}</span></div>`).join('')}</div>`;

function castleWhy(team, own, e) {
  const n = id => team.find(c => c.id === id); const out = [];
  if (e.aya) out.push(`<b>Ayanokouji</b> est la clé : son ÉCHANGE fait tomber un gardien plein presque à 0 en remontant Aya à 100 %. C'est la seule arme qui grandit avec la tour.`);
  else out.push('Sans Ayanokouji, tu n\'as pas d\'arme qui grandit avec la tour : tu montes tant que tes cartes encaissent 2 coups, puis ça devient très dur. Cette chambre est une estimation.');
  if (e.heal) out.push(`<b>${esc((n(3248) || n(408)).n)}</b> soigne 30 % des PV : Aya peut encaisser un coup, être soignée, puis en encaisser un second. C'est ce qui repousse la chambre max.`);
  else if (e.aya) out.push('Pas de soigneur : dès qu\'Aya meurt en 2 coups, la boucle s\'arrête. Un soigneur (Seiichi, Rimuru) repousserait la limite.');
  if (n(340)) out.push('<b>Makima</b> : DOMINATION fait se frapper le gardien pour 150 % de sa propre attaque. Ses dégâts suivent la tour.');
  if (n(329)) out.push('<b>Escanor</b> : ARMURE DE FEU encaisse moitié moins et renvoie le reste.');
  return out;
}
const castleStrat = e => e.aya ? (e.heal ? ['Tout le monde focus le même gardien tant que l\'échange n\'est pas fait.', 'Aya encaisse un coup, soin de 30 %, Aya encaisse un 2e coup en restant au plus près de 1 PV.', 'ÉCHANGE sur un gardien plein : il tombe presque à 0, on l\'achève tout de suite.', 'On revient sur le gardien focus au départ, et on répète la boucle une 2e fois.'] : ['Tout le monde focus le même gardien tant que l\'échange n\'est pas fait.', 'Aya encaisse 2 coups et tombe au plus près de 1 PV (pas à 20 % : sinon le gardien échangé ne tombe pas en un coup).', 'ÉCHANGE sur un gardien plein, puis on l\'achève tout de suite.', 'Retour sur le gardien focus, et on répète une 2e fois.']) : ['Focus un seul gardien à la fois, toujours le plus entamé.', 'Garde tes techniques de dégâts pour achever, pas pour entamer.', 'Monte les étoiles de ta carte la plus solide : +8 % de PV par étoile repoussent la chambre max.'];

P.equipe = async (m, mode = 'chateau') => {
  mode = mode === 'ranked' ? 'ranked' : 'chateau'; await loadMyLR(); const own = S.mylr.cards; S.mylr.teams = S.mylr.teams || {};
  const title = mode === 'chateau' ? 'Château de l\'infini' : 'Ranked';
  if (Object.keys(own).length < 3) { m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${title}</span><h1 style="margin-top:12px">Meilleure équipe</h1><p class="mute">Pour te conseiller, il faut d'abord savoir quelles LR tu possèdes et à combien d'étoiles.</p><a class="btn primary" href="#meslr">Renseigner mes LR</a></section>`; return; }
  const byId = id => LRS().find(c => c.id === +id);
  let team = (S.mylr.teams[mode] || []).map(byId).filter(Boolean);
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${title}</span><h1 style="margin-top:12px">Meilleure équipe</h1><p class="mute">${mode === 'chateau' ? 'Choisis ton équipe actuelle pour voir la chambre max qu\'elle peut atteindre, ou laisse le site trouver la meilleure parmi tes LR.' : 'Choisis ton équipe actuelle, ou laisse le site proposer la meilleure parmi tes LR selon les stats, les rôles et la méta.'}</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="af">⚡ Auto-remplir la meilleure équipe</button><a class="btn ghost" href="#meslr">Modifier mes LR</a></div></section>
    <div class="card section"><h2>Mon équipe</h2><p class="small mute">Une seule carte par rôle, comme dans le jeu.</p><div class="row picks">${teamPicker(team, own)}</div><div id="cur" style="margin-top:14px"></div></div>
    <div id="rec"></div>`;
  const show = () => {
    const ok = team.length === 3 && roleOk(team);
    if (!ok) { $('#cur').innerHTML = team.length === 3 ? '<div class="msg">Deux cartes ont le même rôle : le jeu ne l\'accepte pas.</div>' : '<p class="mute small">Choisis 3 cartes.</p>'; }
    else if (mode === 'chateau') { const e = castleEval(team, own); $('#cur').innerHTML = `${teamCards(team, own)}<div class="grid" style="margin-top:14px"><div><div class="mute small">Chambre max estimée</div><div class="cd">${e.room}</div></div><div><div class="mute small">Méthode</div><div><b>${e.aya ? (e.heal ? 'Boucle Aya avec soin' : 'Boucle Aya sans soin') : 'Sans Aya'}</b></div></div></div>`; }
    else $('#cur').innerHTML = `${teamCards(team, own)}<div style="margin-top:14px"><span class="mute small">Indice de force</span> <span class="cd">${rankedScore(team, own)}</span></div>`;
    const b = bestTeam(mode, own); if (!b) { $('#rec').innerHTML = ''; return; }
    const same = ok && b.team.every(c => team.some(x => x.id === c.id));
    const bt = b.team;
    let body = '';
    if (mode === 'chateau') { const e = castleEval(bt, own), cur = ok ? castleEval(team, own) : null;
      body = `${teamCards(bt, own)}<div class="grid" style="margin-top:14px"><div><div class="mute small">Chambre max estimée</div><div class="cd">${e.room}</div></div>${cur && !same ? `<div><div class="mute small">Gain</div><div class="cd ${e.room > cur.room ? 'up' : ''}">${e.room - cur.room >= 0 ? '+' : ''}${e.room - cur.room}</div></div>` : ''}</div>
        <h3 style="margin-top:18px">Pourquoi cette équipe</h3><ul class="list">${castleWhy(bt, own, e).map(x => `<li>${x}</li>`).join('')}</ul>
        <h3>La stratégie</h3><ol class="list">${castleStrat(e).map(x => `<li>${x}</li>`).join('')}</ol>
        <p class="small mute">${e.aya ? 'Chambre max = dernière chambre où Aya encaisse 2 coups de gardien (formules exactes du jeu, stats exactes par étoile).' : 'Chambre max = combat simulé en attaques simples contre 3 gardiens de la chambre (formules exactes du jeu), sans les techniques : c\'est une estimation prudente.'} Les passifs et le hasard ne sont pas comptés : vise cette chambre, pas plus.</p>`; }
    else { body = `${teamCards(bt, own)}<h3 style="margin-top:18px">Pourquoi cette équipe</h3><ul class="list">${b.meta ? '<li>C\'est un des meilleurs trios de la méta actuelle, et tu as les 3 cartes.</li>' : '<li>Meilleur équilibre entre stats (à tes étoiles), rôles et techniques parmi tes LR.</li>'}
        ${bt.some(c => HEALERS.includes(c.id)) ? '<li>Un soigneur qui rend 30 % à toute l\'équipe te fait survivre à un coup de plus à chaque cycle.</li>' : '<li>Pas de soigneur dans tes LR : Seiichi est la carte qui ferait le plus progresser ton équipe.</li>'}
        ${bt.some(c => [1070, 961].includes(c.id)) ? '<li>Janemba ou Goku MUI esquivent : l\'adversaire perd des tours à taper dans le vide.</li>' : ''}
        ${bt.some(c => c.id === 3247) ? '<li>Boros Second Form revient à la vie une fois et son canon frappe toute l\'équipe adverse.</li>' : ''}</ul>
        <h3>La stratégie</h3><ol class="list"><li>Focus d'abord l'adversaire qui n'est pas protégé (pas d'esquive, pas de voile Haki).</li><li>Ne gaspille pas un contrôle ou un gros coup sur une carte qui esquive encore : fais-lui d'abord perdre ses esquives avec des attaques simples.</li><li>Achève en priorité un adversaire qu'on peut tuer en un coup.</li><li>Garde le soin pour sauver un allié d'un coup fatal, pas pour remonter quelques PV.</li></ol>`; }
    $('#rec').innerHTML = `<div class="card section reco"><span class="chip ${same ? 'ok' : 'red'}">${same ? '✓ Ton équipe est déjà la meilleure' : 'Recommandation'}</span><h2 style="margin-top:10px">${same ? 'Garde cette équipe' : 'Équipe conseillée'}</h2>${body}${same ? '' : '<button class="btn primary" id="use" style="margin-top:12px">Utiliser cette équipe</button>'}</div>`;
    const u = $('#use'); if (u) u.onclick = async () => { team = bt.slice(); S.mylr.teams[mode] = team.map(c => c.id); await saveMyLR(); $('.picks').innerHTML = teamPicker(team, own); bind(); show(); toast('Équipe enregistrée'); };
  };
  const bind = () => $('.picks').querySelectorAll('select').forEach(sel => sel.onchange = async () => { const i = +sel.dataset.slot; team[i] = byId(sel.value); team = team.filter(Boolean); S.mylr.teams[mode] = team.map(c => c.id); await saveMyLR(); show(); });
  $('#af').onclick = async () => { const b = bestTeam(mode, own); if (!b) return; team = b.team.slice(); S.mylr.teams[mode] = team.map(c => c.id); await saveMyLR(); $('.picks').innerHTML = teamPicker(team, own); bind(); show(); toast('Meilleure équipe placée'); };
  bind(); show();
};

/* ---------- Guides générés depuis les données du jeu ---------- */
function evoGuide(m) {
  const E = S.kb.evolutions?.list || [];
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">Éveil des cartes</h1><p class="mute">Les ${E.length} éveils du jeu : la carte de départ, la version éveillée, et tout ce qu'il faut réunir. Les objets et leurs taux sont ceux affichés dans l'écran Évolution du jeu.</p></section>
    <div class="card section"><h2>À savoir avant d'éveiller</h2><ul class="list"><li>L'éveil est définitif : la carte de départ est consommée et remplacée par la version éveillée.</li><li>Une version éveillée (prestige) a des stats fixes : <b>elle ne monte pas en étoiles</b>. Monte d'abord tes étoiles ailleurs si tu en as besoin, et ne paie jamais une version éveillée au prix d'une LR qui progresse.</li><li>Les objets à 0,5 % demandent en moyenne environ 200 victoires chacun : calcule le temps de farm avant de te lancer.</li><li>Garde l'œil sur le marché : la carte de départ coûte parfois moins cher que le farm.</li></ul></div>
    <div class="row"><input id="q" placeholder="Rechercher une carte, un objet, un lieu" style="flex:1;min-width:200px"></div><div class="grid" id="el" style="margin-top:14px"></div>`;
  const draw = () => { const q = $('#q').value.toLowerCase();
    $('#el').innerHTML = E.filter(e => !q || JSON.stringify(e).toLowerCase().includes(q)).map(e => `<div class="card"><div class="row"><span class="chip">${esc(e.from.r)}</span>→<span class="chip red">${esc(e.to.r)}</span></div>
      <h3 style="margin-top:10px">${esc(e.to.n)}</h3><div class="small mute">depuis ${esc(e.from.n)} · ${esc(e.to.s)}</div>
      <ul class="list small">${e.ki ? `<li><b>${fmt(e.ki)}</b> KI</li>` : ''}${(e.cards || []).map(c => `<li>${c.q} × <b>${esc(c.n)}</b> <span class="mute">(${esc(c.r)})</span></li>`).join('')}${e.items.map(i => `<li>${i.q} × <b>${esc(i.n)}</b> <span class="mute">(${esc(i.r)})</span><div class="mute">${i.src.length ? i.src.map(esc).join(' / ') : 'Introuvable pour le moment'}</div></li>`).join('')}</ul></div>`).join('') || '<div class="empty">Aucun résultat.</div>'; };
  $('#q').oninput = draw; draw();
}
function raidGuide(m) {
  const E = S.kb.evolutions?.list || []; const by = {};
  for (const e of E) for (const i of e.items) for (const s of i.src) { const [place, act, ch] = s.split(' · '); const k = place + ' · ' + act; (by[k] = by[k] || { place, act, items: new Map() }).items.set(i.n, { n: i.n, r: i.r, ch, for: [...((by[k].items.get(i.n) || {}).for || []), e.to.n] }); }
  const L = Object.values(by).sort((a, b) => a.place.localeCompare(b.place) || a.act.localeCompare(b.act));
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">Raids et lieux de farm</h1><p class="mute">Où tombe chaque objet d'éveil, avec le taux affiché par le jeu, et à quoi il sert.</p></section>
    <div class="card section"><h2>Bien farmer</h2><ul class="list"><li>Choisis le niveau qui donne l'objet qui te manque, pas le plus difficile : le taux ne dépend que du niveau.</li><li>Ton équipe doit gagner vite et sans risque : 3 gardiens qui tombent en quelques tours valent mieux qu'un combat serré.</li><li>Les objets Communs (30 %) viennent vite. Les objets Secret (0,5 %) sont une affaire de patience : environ 200 victoires en moyenne, sans garantie.</li><li>Vérifie avant de farmer que l'éveil t'est vraiment utile : une version éveillée ne monte pas en étoiles.</li></ul></div>
    <div class="grid">${L.map(l => `<div class="card"><span class="chip">${esc(l.act)}</span><h3 style="margin-top:10px">${esc(l.place)}</h3><ul class="list small">${[...l.items.values()].map(i => `<li><b>${esc(i.n)}</b> <span class="mute">(${esc(i.r)})</span> · <span class="bone">${esc(i.ch)}</span><div class="mute">pour ${[...new Set(i.for)].map(esc).join(', ')}</div></li>`).join('')}</ul></div>`).join('') || '<div class="empty">Données à venir.</div>'}</div>`;
}
function rolesGuide(m) {
  const C = S.kb.cards.filter(c => !c.r); const roles = Object.keys(ROLE);
  const best = r => C.filter(c => c.c === r).map(c => ({ c, s: statsAt(c, c.p ? 0 : 5) })).sort((a, b) => (b.s.hp / 1000 + b.s.atk / 100) - (a.s.hp / 1000 + a.s.atk / 100));
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">Les meilleures cartes par rôle</h1><p class="mute">Le jeu n'accepte qu'une carte par rôle dans une équipe. Voici les LR de chaque rôle, avec leurs stats à 5★ (les versions prestige ont des stats fixes) et ce qu'elles apportent.</p></section>
    <div class="card section"><h2>Construire son trio</h2><ul class="list"><li>Un trio gagnant combine en général des dégâts qui ignorent les protections, un soin ou une résurrection, et une carte qui contrôle ou encaisse.</li><li>En ranked, les esquives (Janemba, Goku MUI) et les boucliers font perdre des tours à l'adversaire : vise d'abord ce qui n'est pas protégé.</li><li>Un soigneur qui rend 30 % des PV à toute l'équipe (Seiichi) change la donne au château comme en ranked : il permet de survivre à un coup de plus.</li><li>Les étoiles comptent beaucoup : +8 % de PV et d'attaque par étoile. Une LR 5★ d'un rôle moyen bat souvent une LR 0★ d'un rôle fort.</li></ul></div>
    ${roles.map(r => `<div class="section"><h2>${ROLE[r]}</h2><div class="grid">${best(r).map(({ c, s }, i) => `<div class="card"><div class="row"><span class="chip ${i < 3 ? 'red' : ''}">${i < 3 ? 'Top ' + (i + 1) : ROLE[r]}</span>${c.p ? '<span class="chip">Prestige</span>' : ''}</div><h3 style="margin-top:10px">${esc(c.n)}</h3><div class="small mute">${esc(c.a)} · <b>${fmt(s.hp)}</b> PV · <b>${fmt(s.atk)}</b> ATQ</div>${(c.t || []).slice(0, 2).map(t => `<div class="tech"><b>${esc(t[0])}</b><div class="small mute">${esc(t[1])}</div></div>`).join('')}</div>`).join('')}</div></div>`).join('')}`;
}

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
  const [base, ...rest] = h.split('/'); const arg = rest.join('/');
  const route = ['guide', 'equipe'].includes(base) ? h : base;
  let m = $('#main');
  if (!m || !$('#side')) m = shell(route);
  else { $('#side').querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + route)); m.innerHTML = ''; }
  try { await (P[base] || P.accueil)(m, arg); } catch (e) { m.innerHTML = `<div class="empty">Erreur de chargement : ${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
  alertLoop();
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
  if (p.status !== 'approved' && session.provider_token) {
    app.innerHTML = '<div class="auth"><div class="auth-card"><div class="moon pulse"></div><h1>Vérification…</h1><p class="mute">On regarde si tu es sur le serveur Discord de la Brigade.</p></div></div>';
    const { data: v, error } = await sb.functions.invoke('verify-guild', { body: { provider_token: session.provider_token } });
    if (!error && v?.ok) { const r = await sb.from('profiles').select('*').eq('id', S.user.id).single(); if (r.data) S.profile = r.data; }
    else if (!error && v && !v.ok) return pendingView({ ...p, status: 'refused', why: v.reason });
  }
  if (S.profile.status !== 'approved') return pendingView(S.profile);
  try { await loadKB(); } catch (e) { app.innerHTML = `<div class="auth"><div class="auth-card"><h1>Oups</h1><p>${esc(e.message)}</p></div></div>`; return; }
  window.onhashchange = render; render(); setInterval(alertLoop, 5 * 60000);
}
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') authView(); });
boot();

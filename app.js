import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import * as CFG from './config.js?v=18';
const { SUPABASE_URL, SUPABASE_ANON_KEY, DISCORD_INVITE, EMAIL_DOMAIN } = CFG;
import { answer, statsAt, towerAt, twoShotRoom, ROLE, setTwoShot, priceStats } from './kakashi.js?v=18';
import { castleReport, APPROX, KIND } from './castle.js?v=18';
const KIND_OF = id => (KIND[id] || {}).k;
import { duelRate } from './ranked.js?v=18';

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
  ['sep', 'Salle du temps'], ['guide/temps', 'Guide et calculateur', 'calc'],
  ['sep', 'Collection et Prestige'], ['checklist', 'Collection Prestige', 'check'], ['guide/prestige', 'Guide Prestige', 'book'], ['guide/eveil', 'Éveil des cartes', 'book'], ['guide/raids', 'Raids et farm', 'book'],
  ['sep', 'Cartes'], ['persos', 'Fiches perso', 'users'],
  ['sep', 'Marché'], ['prix', 'Prix marché', 'chart'], ['alertes', 'Alertes prix', 'bell'],
  ['sep', 'Guilde'], ['guilde', 'Profils de la guilde', 'users'], ['discord', 'Espace Discord', 'chat'],
  ['sep', 'Brigade'], ['calendrier', 'Calendrier', 'cal'], ['nouveautes', 'Nouveautés', 'bell'], ['lexique', 'Lexique', 'text']
];

// Nouvelle version publiée : on recharge une fois pour ne pas garder l'ancien site en cache.
const APP_V = '18';
fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(v => { v = v.trim(); if (v && v !== APP_V && !sessionStorage.getItem('bfv' + v)) { sessionStorage.setItem('bfv' + v, '1'); location.replace(location.pathname + '?v=' + v + location.hash); } }).catch(() => {});
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const slug = d => String(d).trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');

/* ---------- Authentification ---------- */
function authView(mode = 'login', note = '') {
  app.innerHTML = `<div class="auth"><div class="auth-card"><div class="moon"></div>
    <div class="brand" style="margin:0 0 6px">${SPIDER}<b>Brigade Fantôme</b></div>
    <h1>Le repaire de la Brigade</h1>
    <p class="mute">Guides, fiches, prix du marché et Kakashi Bot. Réservé aux membres de la Brigade sur Discord.</p>
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
  const { data, error } = await sb.from('content').select('key,data').neq('key', 'prestige_imgs');
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
  if (key === 'eveil') return evoGuide(m); if (key === 'raids') return raidGuide(m); if (key === 'roles') { location.hash = '#persos'; return; }
  const g = S.kb.guides?.[key]; if (!g) { m.innerHTML = '<div class="empty">Guide introuvable.</div>'; return; }
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">${esc(g.title)}</h1></section>
    ${key === 'temps' ? tempsCalc() : ''}
    ${key === 'chateau' ? castleWidget() + `<div class="card section"><h2 class="ctitle">Les deux boucles</h2><p class="focusnote"><b>Le focus :</b> tout le monde tape le même gardien tant que l'échange n'est pas fait. Dès qu'un gardien est échangé, on l'achève en priorité, puis on revient au gardien de départ.</p><div class="loops">${loopSVG(false)}${loopSVG(true)}</div></div>` : ''}
    ${g.sections.map(s => `<div class="card section"><h2>${esc(s.h)}</h2>${(s.p || []).map(x => `<p>${esc(x)}</p>`).join('')}${s.list ? `<ul class="list">${s.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}`;
  if (key === 'chateau') bindCastle();
  if (key === 'temps') bindTemps();
  if (key === 'prestige') prestigeImgs(m);
};
async function prestigeImgs(m) {
  const { data } = await sb.from('content').select('data').eq('key', 'prestige_imgs').maybeSingle(); const L = data?.data?.imgs || []; if (!L.length) return;
  const d = document.createElement('div'); d.className = 'card section'; d.innerHTML = `<h2>Le tuto en images</h2><div class="pimgs">${L.map((u, i) => `<img src="${u}" alt="Tuto Prestige, image ${i + 1}" loading="lazy">`).join('')}</div>`; m.appendChild(d);
}
// Salle du temps : chiffres du salon #salle-du-temps du Discord de la Brigade.
const TEMPS = { kiWin: 20, p: .06, pity: 16, lrPerBooster: .000205 };
const winsPerBooster = (() => { let e = 0, q = 1; for (let k = 0; k < TEMPS.pity; k++) { e += q; q *= 1 - TEMPS.p; } return e; })(); // ≈ 10,5
function tempsCalc() {
  return `<div class="card section"><h2>Calculateur de farm</h2><p class="mute small">Choisis ton équipe (ou saisis ton KI par minute) et la durée : le site estime le KI, les boosters et ta chance d'avoir au moins une LR.</p>
  <label>Ton équipe de farm</label><div class="tabs" id="tm" style="margin:6px 0 12px;flex-wrap:wrap"><button data-v="200" class="on">Vegeta + 2 Communes</button><button data-v="120">3 Communes</button><button data-v="mine">Importer mes LR</button><button data-v="man">Saisir à la main</button></div>
  <div class="row"><div style="flex:1;min-width:120px"><label for="tk">KI par minute</label><input id="tk" type="number" min="1" value="200"></div><div style="flex:1;min-width:80px"><label for="td">Jours</label><input id="td" type="number" min="0" value="0"></div><div style="flex:1;min-width:80px"><label for="th">Heures</label><input id="th" type="number" min="0" value="8"></div><div style="flex:1;min-width:80px"><label for="tn">Minutes</label><input id="tn" type="number" min="0" value="0"></div></div>
  <p class="small mute" id="tmh" style="margin-top:8px"></p><div id="to" class="calcout"></div>
  <p class="small mute" style="margin-top:12px">Ce sont des estimations, pas des garanties : le rythme varie selon la vitesse du serveur, et les boosters et les LR dépendent du hasard des taux de drop. Base : +${TEMPS.kiWin} KI par victoire, booster dans ${TEMPS.p * 100} % des victoires et garanti au ${TEMPS.pity}e combat sans booster (≈ 1 booster toutes les ${winsPerBooster.toFixed(1).replace('.', ',')} victoires).</p></div>`;
}
function bindTemps() {
  const f = () => { const k = Math.max(0, +$('#tk').value || 0), min = (+$('#td').value || 0) * 1440 + (+$('#th').value || 0) * 60 + (+$('#tn').value || 0);
    const ki = k * min, wins = ki / TEMPS.kiWin, bo = wins / winsPerBooster, lr = 1 - Math.pow(1 - TEMPS.lrPerBooster, bo);
    $('#to').innerHTML = `<div><div class="mute small">KI gagné</div><div class="cd">${fmt(Math.round(ki))}</div></div><div><div class="mute small">Victoires</div><div class="cd">${fmt(Math.round(wins))}</div></div><div><div class="mute small">Boosters gagnés</div><div class="cd">≈ ${fmt(Math.round(bo))}</div></div><div><div class="mute small">Chance d'au moins 1 LR</div><div class="cd">${lr < .1 ? (lr * 100).toFixed(1).replace('.', ',') : Math.round(lr * 100)} %</div></div>${wins >= 1 ? `<div><div class="mute small">Palier Cid Kagenou (1 000 victoires)</div><div class="cd">${wins >= 1000 ? '✓' : Math.round(wins / 10) + ' %'}</div></div>` : ''}`; };
  const set = v => { const own = S.mylr?.cards || {}; let k = 200, h = 'Vegeta en tête : son EXPLOSION FINALE met les 3 gardiens K.O. d\'un coup (~200 KI/min en Replay auto ×2).';
    if (v === '120') { k = 120; h = '3 Communes 0★ : les gardiens s\'adaptent à ton équipe, des cartes faibles finissent vite (~120 KI/min).'; }
    if (v === 'mine') { const veg = own[1083] != null; k = veg ? 200 : 120; h = veg ? 'Tu as Majin Vegeta dans tes LR : mets-le en tête avec 2 Communes 0★ (~200 KI/min).' : 'Pas de Vegeta dans tes LR : 3 Communes 0★ (~120 KI/min). Vegeta ferait +67 % de KI et de boosters.'; }
    if (v === 'man') { h = 'Mesure ton KI avant et après 10 minutes de farm, divise par 10 et saisis le résultat.'; $('#tk').focus(); } else $('#tk').value = k;
    $('#tmh').textContent = h; f(); };
  $('#tm').querySelectorAll('button').forEach(b => b.onclick = () => { $('#tm').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); set(b.dataset.v); });
  ['#tk', '#td', '#th', '#tn'].forEach(id => $(id).oninput = f); loadMyLR().catch(() => {}); set('200');
}

function castleWidget() {
  return `<div class="card section"><h2>Où en est ta tour ?</h2><div class="row"><div style="flex:1;min-width:160px"><label for="cr">Chambre</label><input id="cr" type="number" min="1" max="1500" value="600"></div></div><div id="co" style="margin-top:12px"></div></div>`;
}
function bindCastle() {
  const f = () => { const r = +$('#cr').value || 1; const t = towerAt(S.kb.tower, r); $('#co').innerHTML = `<div class="grid"><div><div class="k mute small">PV d'un gardien</div><div class="cd">${fmt(t.hp)}</div></div><div><div class="k mute small">Attaque d'un gardien</div><div class="cd">${fmt(t.atk)}</div></div><div><div class="k mute small">Échange d'Aya à 5 %</div><div class="cd">${fmt(t.hp * .95)}</div></div><div><div class="k mute small">Domination</div><div class="cd">${fmt(t.atk * 1.5)}</div></div></div>`; };
  $('#cr').oninput = f; f();
}

P.persos = m => {
  const all = S.kb.cards || []; const EX = (S.kb.ex_cards || []).filter(c => c.r === 'Exclusive').map(c => ({ ...c, ex: true, t: c.t }));
  const TR = all.filter(c => c.r); const LR = all.filter(c => !c.r); let tab = 'lr';
  const statsOf = (c, st) => c.ex ? { hp: c.st[st][0], atk: c.st[st][1] } : statsAt(c, st);
  m.innerHTML = `<h1>Fiches perso</h1><p class="mute">Les ${LR.length} LR, les ${EX.length} EX et les ${TR.length} Transcendantes du jeu, avec leurs techniques et leurs stats exactes de 0★ à 5★.</p>
    <div class="row"><input id="q" placeholder="Rechercher une carte ou un anime" style="flex:1;min-width:200px"><select id="rf" style="width:auto"><option value="">Tous les rôles</option>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <select id="st" style="width:auto">${[0, 1, 2, 3, 4, 5].map(s => `<option value="${s}">${s}★</option>`).join('')}</select>
    <select id="so" style="width:auto" aria-label="Trier"><option value="">Ordre du jeu</option><option value="hyb">Meilleures stats (PV + ATQ)</option><option value="atk">Attaque</option><option value="hp">PV</option></select>
    <button class="btn" id="dir" style="min-height:46px" aria-label="Sens du tri">↓ Décroissant</button></div>
    <div class="tabs" style="margin:12px 0 0;max-width:520px" id="rt"><button data-r="lr" class="on">LR</button><button data-r="ex">EX</button><button data-r="tr">Transcendantes</button></div>
    <div class="grid" id="cl" style="margin-top:16px"></div>`;
  let desc = true;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), rf = $('#rf').value, st = +$('#st').value, so = $('#so').value;
    let list = (tab === 'lr' ? LR : tab === 'ex' ? EX : TR).filter(c => (!q || (c.n + ' ' + c.a).toLowerCase().includes(q)) && (!rf || c.c === rf)).map(c => ({ c, s: statsOf(c, st) }));
    const key = x => so === 'atk' ? x.s.atk : so === 'hp' ? x.s.hp : x.s.hp + x.s.atk;
    if (so) list.sort((a, b) => desc ? key(b) - key(a) : key(a) - key(b));
    $('#cl').innerHTML = list.map(({ c, s }, i) => {
      const p = S.prices.find(x => x.card === c.n); const iu = c.ex ? c.img : lrImg(c);
      return `<div class="card pcard">${iu ? `<div class="pimg">${so ? `<span class="rank">${i + 1}</span>` : ''}<img loading="lazy" src="${iu}" alt="${esc(c.n)}"></div>` : ''}<div class="row"><span class="chip ${c.r === 'Transcendant' ? 'warn' : 'red'}">${c.ex ? 'EX' : c.r || 'LR'}</span>${c.c ? `<span class="chip">${ROLE[c.c] || c.c}</span>` : ''}${c.p ? '<span class="chip">Éveil</span>' : ''}</div>
      <h3 style="margin-top:10px">${esc(c.n)}</h3><div class="mute small">${esc(c.a)}</div>
      <div class="row" style="margin:10px 0"><span><b>${fmt(s.hp)}</b> <span class="mute small">PV</span></span><span><b>${fmt(s.atk)}</b> <span class="mute small">ATQ</span></span>${so === 'hyb' ? `<span class="small mute">= ${fmt(s.hp + s.atk)}</span>` : ''}${p ? `<span class="sp"></span><span class="small bone">${fmt(p.median)} KI</span>` : ''}</div>
      ${(c.t || []).map(t => `<div class="tech"><b>${esc(t[0])}</b><div class="small mute">${esc(t[1])}</div></div>`).join('') || '<div class="small mute">Pas de technique spéciale.</div>'}</div>`;
    }).join('') || '<div class="empty">Aucune carte.</div>';
  };
  ['q', 'rf', 'st', 'so'].forEach(id => $('#' + id).oninput = draw);
  $('#dir').onclick = () => { desc = !desc; $('#dir').textContent = desc ? '↓ Décroissant' : '↑ Croissant'; if (!$('#so').value) $('#so').value = 'hyb'; draw(); };
  $('#rt').querySelectorAll('button').forEach(b => b.onclick = () => { tab = b.dataset.r; $('#rt').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw(); }); draw();
};

P.calculs = m => {
  const cards = S.kb.cards.filter(c => !c.r);
  const opts = cards.map(c => `<option value="${c.id}" ${c.id === 953 ? 'selected' : ''}>${esc(c.n)}</option>`).join('');
  m.innerHTML = `<h1>Calculateurs du château</h1>
  <div class="card section"><span class="chip ok">✓ Vérifié avec les formules du jeu</span><p class="small mute" style="margin-top:10px">Stats des gardiens chambre par chambre, stats exactes de chaque carte par étoile, soin de 30 % des PV max arrondi comme dans le jeu, et dégâts reçus égaux à l'attaque du gardien (contrôlé en combat). Les passifs ne sont pas comptés (bouclier de Frieren, résurrections de Boros et Seiichi, esquives).</p></div>
  <div class="card section"><h2>Two-shot</h2><p class="mute small">Dernière chambre où ta carte survit à 2 coups de gardien <b>en gardant au moins 1 % de vie</b> (marge pour que l'échange d'Aya fasse tomber le gardien presque à 0) : sans soin, et avec un soin de 30 % entre les deux coups (Seiichi ou Rimuru). C'est la limite de la boucle ; la chambre que ton équipe atteint vraiment se lit dans <a href="#equipe/chateau">Meilleure équipe</a> (combats simulés).</p>
    <div class="row"><div style="flex:2;min-width:200px"><label for="c1">Carte</label><select id="c1">${opts}</select></div><div style="flex:1;min-width:110px"><label for="s1">Étoiles</label><select id="s1">${[0, 1, 2, 3, 4, 5].map(s => `<option>${s}</option>`).join('')}</select></div></div>
    <div id="o1" class="grid" style="margin-top:14px"></div>
    <div class="tablewrap" style="margin-top:16px"><table><thead><tr><th>Étoiles</th><th class="n">PV</th><th class="n">Sans soin</th><th class="n">Avec 1 soin</th></tr></thead><tbody id="t1"></tbody></table></div></div>
  <div class="card section"><h2>Au combientième coup ma carte meurt</h2>
    <div class="row"><div style="flex:2;min-width:200px"><label for="c2">Carte</label><select id="c2">${opts}</select></div><div style="flex:1;min-width:110px"><label for="s2">Étoiles</label><select id="s2">${[0, 1, 2, 3, 4, 5].map(s => `<option>${s}</option>`).join('')}</select></div><div style="flex:1;min-width:110px"><label for="r2">Chambre</label><input id="r2" type="number" value="600" min="1" max="3000"></div><div style="flex:1;min-width:150px"><label for="h2">Soins de 30 % reçus</label><select id="h2">${[0, 1, 2, 3].map(s => `<option>${s}</option>`).join('')}</select></div></div>
    <div id="o2" style="margin-top:14px"></div></div>`;
  const byId = id => cards.find(c => c.id === +id);
  const f1 = () => { const c = byId($('#c1').value), s = +$('#s1').value;
    $('#o1').innerHTML = `<div><div class="mute small">Sans soin</div><div class="cd">Chambre ${twoShotRoom(null, c, s, false)}</div></div><div><div class="mute small">Avec 1 soin de 30 %</div><div class="cd">Chambre ${twoShotRoom(null, c, s, true)}</div></div><div><div class="mute small">PV</div><div class="cd">${fmt(statsAt(c, s).hp)}</div></div>`;
    $('#t1').innerHTML = [0, 1, 2, 3, 4, 5].map(k => `<tr><td>${k}★</td><td class="n">${fmt(statsAt(c, k).hp)}</td><td class="n">${twoShotRoom(null, c, k, false)}</td><td class="n"><b>${twoShotRoom(null, c, k, true)}</b></td></tr>`).join(''); };
  const f2 = () => { const c = byId($('#c2').value), s = +$('#s2').value, r = Math.max(1, +$('#r2').value || 1), heals = +$('#h2').value; const hp = statsAt(c, s).hp, atk = towerAt(null, r).atk;
    let v = hp, n = 0, h = heals, after2 = null; while (v > 0 && n < 99) { v -= atk; n++; if (n === 2) after2 = v; if (v > 0 && h > 0) { v = Math.min(hp, v + Math.max(1, Math.round(hp * .3))); h--; } }
    $('#o2').innerHTML = `<p>Chambre <b>${r}</b> : un gardien a <b>${fmt(towerAt(null, r).hp)}</b> PV et tape <b>${fmt(atk)}</b>. ${esc(c.n)} ${s}★ a <b>${fmt(hp)}</b> PV${heals ? ` et reçoit ${heals} soin${heals > 1 ? 's' : ''} de 30 % entre les coups` : ''} : elle meurt au <b class="red">${n}e coup</b>.${after2 > 0 ? ` Après 2 coups il lui reste <b>${fmt(after2)} PV</b> (${(after2 / hp * 100).toFixed(1).replace('.', ',')} %)${after2 / hp < .01 ? ' : moins de 1 %, donc cette chambre est au-delà de la limite « two-shot » du tableau ci-dessus' : ''}.` : ''}</p>`; };
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
  m.innerHTML = `<div class="row"><h1 style="margin:0">Prix marché</h1></div>
    <p class="mute">Ventes réelles du marché (LR classiques), calculées comme le guide des prix : <b class="bone">médiane</b>, <b class="bone">bon prix</b> (bonne affaire) et <b class="bone">max conseillé</b> (au-delà tu paies trop cher). La tendance compare les 7 derniers jours à la semaine d'avant. Touche une carte pour voir sa courbe.</p>
    <div class="msg" style="margin:0 0 14px">Nous sommes des humains : les ventes sont relevées à la main via le comptoir du marché, il peut donc arriver qu'on rate des transactions.</div>
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
    const last = S.prices.reduce((a, p) => p.updated_at > a ? p.updated_at : a, ''); $('#upd').textContent = last ? '' : 'Pas encore de ventes enregistrées.';
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
const SHARE_TXT = 'En activant le partage, les membres de la Brigade connectés au site verront : tes LR et leurs étoiles, tes équipes château et ranked, tes doublons et tes cartes manquantes par univers. Rien d\'autre : ni ton KI, ni ton compte, ni tes échanges privés. Tu peux le désactiver quand tu veux.';
const RN = { S: 'LR', M: 'Mythique', L: 'SSR', E: 'Épique', R: 'Rare', C: 'Commune', T: 'Transcendante' };
const img = h => !h ? '' : /^https?:/.test(h) ? h : `${S.kb.prestige_series?.base || 'https://yurocollection.fr/card-art/'}${h}.webp`;
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
    <div class="card section"><div class="row"><div style="flex:1;min-width:220px"><b>Partager ma collection avec la Brigade</b><div class="small mute">${SHARE_TXT}</div></div><label class="switch"><input type="checkbox" id="sh" ${S.profile.share ? 'checked' : ''}><span></span></label></div></div>
    <div class="card section"><b>Remplir automatiquement</b><p class="small mute" style="margin:4px 0 10px">Envoie des captures de ta collection dans le jeu : le site lit les noms des cartes et les coche pour toi. Tu valides avant l'ajout.</p><div class="row">${scanButton('Importer depuis des captures', () => U.flatMap(u => u.c.map(c => ({ key: u.s + '|' + c[0], name: c[0], sub: u.s, img: img(c[2]) }))), async sel => { const touched = new Set(); for (const f of sel) { const [us, n] = [f.sub, f.name]; uget(coll, us).owned.add(n); touched.add(us); } for (const us of touched) await save(U.find(x => x.s === us)); sum(); list(); toast(sel.length + ' cartes ajoutées'); })}</div></div>
    <div class="row"><div class="tabs" id="md" style="margin:0"><button data-m="own" class="on">Je l'ai</button><button data-m="dupe">Doublon à échanger</button></div><input id="q" placeholder="Rechercher un univers ou une carte" style="flex:1;min-width:200px"><select id="fl" style="width:auto"><option value="">Tous</option><option value="near">Presque complets (≤ 3 manquantes)</option><option value="todo">À compléter</option><option value="done">Complétés</option></select></div>
    <p class="small mute" id="mh" style="margin-top:8px"></p><div id="ul" style="display:grid;gap:10px;margin-top:6px"></div>`;
  $('#sh').onchange = async e => { if (e.target.checked && !confirmBox(SHARE_TXT + '\n\nActiver le partage ?')) { e.target.checked = false; return; } const { error } = await sb.rpc('set_share', { v: e.target.checked }); if (error) { toast(error.message); e.target.checked = !e.target.checked; return; } S.profile.share = e.target.checked; toast(e.target.checked ? 'Collection partagée avec la Brigade' : 'Collection privée'); };
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
  const lr = S.kb.cards.filter(c => !c.r).map(c => c.n).sort((a, b) => a.localeCompare(b));
  m.innerHTML = `<h1>Alertes prix</h1><p class="mute">Choisis les LR que tu veux acheter. Dès qu'une annonce passe sous ton prix (par défaut le « bon prix » du guide), elle s'allume ici et sur l'accueil. Les annonces du marché sont relevées toutes les 5 minutes.</p>
    <div class="card section"><h2>Nouvelle alerte</h2><div class="row"><div style="flex:2;min-width:200px"><label for="ac">Carte</label><select id="ac">${lr.map(n => `<option>${esc(n)}</option>`).join('')}</select></div><div style="flex:1.4;min-width:220px"><label>Prix d'alerte</label><div class="tabs" id="am" style="margin:0 0 8px"><button data-m="good" class="on">Bon prix du guide</button><button data-m="man">Mon prix</button></div><input id="ap" type="number" min="1" placeholder="Ton prix max en KI" style="display:none"></div><div style="align-self:flex-end"><button class="btn primary" id="aa">Ajouter</button></div></div><p class="small mute" id="ah"></p>
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
  let amode = 'good'; $('#am').querySelectorAll('button').forEach(b => b.onclick = () => { amode = b.dataset.m; $('#am').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('#ap').style.display = amode === 'man' ? '' : 'none'; if (amode === 'man') $('#ap').focus(); });
  $('#aa').onclick = async () => { const card = $('#ac').value, v = amode === 'man' ? (+$('#ap').value || null) : null; if (amode === 'man' && !v) return toast('Indique ton prix max'); if (amode === 'good' && !S.prices.find(x => x.card === card)?.good) return toast('Pas encore de bon prix pour cette carte : choisis « Mon prix »'); const { error } = await sb.from('alerts').upsert({ user_id: S.user.id, card, max_price: v }); if (error) return toast(error.message); toast('Alerte ajoutée'); $('#ap').value = ''; await loadAlerts(); draw(); };
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



/* ---------- Import depuis des captures d'écran (lecture du texte dans le navigateur, gratuit) ---------- */
const norm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
let OCR = null;
async function ocrWorker(onp) { if (OCR) return OCR; const T = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js'); const create = T.createWorker || T.default?.createWorker;
  OCR = await create('fra+eng', 1, { logger: m => m.status && onp?.(m.status, m.progress) }); return OCR; }
// candidates : [{key, name}] ; renvoie les clés trouvées avec un score
async function scanImages(files, candidates, onp) {
  const w = await ocrWorker(onp); let words = [], lines = [];
  for (let i = 0; i < files.length; i++) { onp?.(`Lecture de la capture ${i + 1}/${files.length}`, 0); const { data } = await w.recognize(files[i]);
    lines = lines.concat((data.lines || []).map(l => norm(l.text)).filter(Boolean)); words = words.concat(norm(data.text).split(' ').filter(x => x.length > 1)); }
  const W = new Set(words), text = ' ' + lines.join(' | ') + ' ';
  const has = tok => W.has(tok) || (tok.length >= 5 && words.some(x => Math.abs(x.length - tok.length) <= 1 && lev(x, tok) <= 1)) || (tok.length >= 6 && words.some(x => x.length >= 4 && tok.startsWith(x)));
  const found = [];
  for (const c of candidates) { const n = norm(c.name); if (!n) continue;
    if (text.includes(' ' + n + ' ') || text.includes(' ' + n + ' |')) { found.push({ ...c, sure: true }); continue; }
    const toks = n.split(' ').filter(t => t.length >= 3); if (!toks.length) continue; const hit = toks.filter(has).length;
    if (hit === toks.length || (toks.length >= 3 && hit >= toks.length - 1)) found.push({ ...c, sure: hit === toks.length }); }
  return found;
}
function importDialog(found, onAdd) {
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="modal-card"><h2>${found.length ? `${found.length} carte${found.length > 1 ? 's' : ''} reconnue${found.length > 1 ? 's' : ''}` : 'Aucune carte reconnue'}</h2>
    <p class="small mute">${found.length ? 'Décoche celles qui ne sont pas à toi, puis valide.' : 'Essaie une capture plus nette, sans zoom, où les noms des cartes sont lisibles.'}</p>
    <div class="flist">${found.map((f, i) => `<label class="fitem">${f.img ? `<img src="${f.img}" alt="">` : ''}<span><b>${esc(f.name)}</b>${f.sub ? `<small class="mute">${esc(f.sub)}</small>` : ''}</span><input type="checkbox" data-i="${i}" ${f.sure ? 'checked' : ''}></label>`).join('')}</div>
    <div class="row" style="margin-top:14px"><span class="sp"></span><button class="btn ghost" data-x>Annuler</button>${found.length ? '<button class="btn primary" data-ok>Ajouter à ma collection</button>' : ''}</div></div>`;
  document.body.appendChild(d); const close = () => d.remove();
  d.querySelector('[data-x]').onclick = close; d.onclick = e => { if (e.target === d) close(); };
  const ok = d.querySelector('[data-ok]'); if (ok) ok.onclick = async () => { const sel = [...d.querySelectorAll('input:checked')].map(x => found[+x.dataset.i]); ok.disabled = true; await onAdd(sel); close(); };
}
function scanButton(label, getCandidates, onAdd) {
  const id = 'sc' + Math.random().toString(36).slice(2, 7);
  setTimeout(() => { const inp = document.getElementById(id); if (!inp) return; const st = document.getElementById(id + 's');
    inp.onchange = async () => { const files = [...inp.files]; if (!files.length) return; st.textContent = 'Préparation de la lecture… (la première fois, quelques secondes)';
      try { const found = await scanImages(files, getCandidates(), (m, p) => { st.textContent = ({ 'recognizing text': 'Lecture du texte', 'loading language traineddata': 'Chargement du dictionnaire', 'initializing tesseract': 'Démarrage' }[m] || m) + (p ? ` ${Math.round(p * 100)} %` : ''); });
        st.textContent = ''; importDialog(found, onAdd); } catch (e) { st.textContent = 'La lecture a échoué : ' + e.message; } inp.value = ''; }; });
  return `<label class="btn" style="cursor:pointer">📷 ${label}<input id="${id}" type="file" accept="image/*" multiple hidden></label><span class="small mute" id="${id}s"></span>`;
}

/* ---------- Mes LR + meilleure équipe (château / ranked) ---------- */
async function loadMyLR() { if (S.mylr) return S.mylr; const { data } = await sb.from('my_lr').select('*').eq('user_id', S.user.id).maybeSingle(); S.mylr = data || { cards: {}, teams: {} }; return S.mylr; }
const saveMyLR = () => sb.from('my_lr').upsert({ user_id: S.user.id, cards: S.mylr.cards, teams: S.mylr.teams || {}, updated_at: new Date().toISOString() });
const nsp = x => String(x).replace(/\s+/g, ' ').trim().toLowerCase();
const lrImg = c => { const B = S.kb.card_images?.byName || {}; const h = B[c.n] ?? B[Object.keys(B).find(k => nsp(k) === nsp(c.n))]; return !h ? '' : /^https?:/.test(h) ? h : `${S.kb.card_images.base}${h}.webp`; };
const LRS = () => S.kb.cards.filter(c => !c.r);

P.meslr = async m => {
  await loadMyLR(); const own = S.mylr.cards;
  const onb = !S.mylr.teams?.done;
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${onb ? 'Bienvenue · étape obligatoire' : 'Indispensable'}</span><h1 style="margin-top:12px">${onb ? 'Avant d\'entrer : tes LR' : 'Mes LR'}</h1><p class="mute">${onb ? 'Pour que le site te conseille (meilleure équipe au château et en ranked, chambre max, Kakashi), indique tes LR et leurs étoiles : à la main en touchant les cartes, ou en envoyant des captures de ta collection.' : 'Indique les LR que tu possèdes et leurs étoiles. C\'est la base de « Meilleure équipe » au château et en ranked.'}</p>${onb ? '<button class="btn primary" id="obd" style="margin-top:12px">C\'est bon, entrer dans le repaire →</button>' : ''}</section>
    <div class="card section" id="lsum"></div><div class="lrgrid" id="lg"></div>`;
  const sum = () => { const n = Object.keys(own).length; $('#lsum').innerHTML = `<div class="row"><b>${n} / ${LRS().length} LR possédées</b><span class="sp"></span><a class="btn primary" href="#equipe/chateau" style="min-height:40px">Meilleure équipe château</a><a class="btn" href="#equipe/ranked" style="min-height:40px">Meilleure équipe ranked</a></div><p class="small mute" style="margin:8px 0 0">Touche une carte pour l'ajouter, puis choisis ses étoiles.</p>
    <div class="row" style="margin-top:10px">${scanButton('Importer depuis des captures de ma collection', () => LRS().map(c => ({ key: c.id, name: c.n, img: lrImg(c) })), async sel => { for (const f of sel) if (own[f.key] == null) own[f.key] = 0; await saveMyLR(); draw(); sum(); toast(sel.length + ' LR ajoutées : règle leurs étoiles'); })}</div>
    <p class="small mute" style="margin:6px 0 0">Dans le jeu : Collection → filtre LR → Possédées, puis une ou plusieurs captures. Les étoiles ne se lisent pas sur la capture : règle-les ensuite.</p>`; };
  const draw = () => { $('#lg').innerHTML = LRS().map(c => { const st = own[c.id]; const has = st != null;
    return `<div class="lr ${has ? 'on' : ''}" data-id="${c.id}"><button class="lrimg" data-t="${c.id}" aria-pressed="${has}">${lrImg(c) ? `<img loading="lazy" src="${lrImg(c)}" alt="">` : ''}<span>${esc(c.n)}</span></button>
      ${has ? `<div class="stars">${[0, 1, 2, 3, 4, 5].map(k => `<button data-s="${k}" class="${st === k ? 'on' : ''}" aria-label="${k} étoiles">${k}★</button>`).join('')}</div>` : ''}</div>`; }).join('');
    $('#lg').querySelectorAll('.lrimg').forEach(b => b.onclick = async () => { const id = b.dataset.t; if (own[id] != null) delete own[id]; else own[id] = 0; draw(); sum(); await saveMyLR(); });
    $('#lg').querySelectorAll('.stars button').forEach(b => b.onclick = async () => { const id = b.closest('.lr').dataset.id; own[id] = +b.dataset.s; draw(); await saveMyLR(); }); };
  sum(); draw();
  const ob = $('#obd'); if (ob) ob.onclick = async () => { if (!Object.keys(own).length && !confirmBox('Tu n\'as indiqué aucune LR. Entrer quand même ?')) return; S.mylr.teams = { ...(S.mylr.teams || {}), done: true }; await saveMyLR(); location.hash = '#accueil'; };
};

const HEALERS = [3248, 408], AYA = 953;
const roleOk = t => new Set(t.map(c => c.c || c.id)).size === t.length;
// Course aux dégâts simplifiée (attaques simples, soin de 30 % tous les 3 tours) : sert pour les équipes sans Aya.
function raceWins(team, own, room) {
  const g = towerAt(null, room); const st = c => (own[c.id] || 0);
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
  const st = c => (own[c.id] || 0); const heal = team.some(c => HEALERS.includes(c.id)); const aya = team.find(c => c.id === AYA);
  const race = raceRoom(team, own);
  if (aya) return { room: Math.max(twoShotRoom(null, aya, st(aya), heal), race), aya: true, heal };
  return { room: race, aya: false, heal };
}
const SIMC = new Map();
function simCastle(team, own, n = 150) {
  const key = team.map(c => c.id + ':' + (own[c.id] || 0)).sort().join(',') + '|' + n;
  if (!SIMC.has(key)) SIMC.set(key, castleReport(team.map(c => { const s = statsAt(c, own[c.id] || 0); return { id: c.id, hp: s.hp, atk: s.atk }; }), n));
  return SIMC.get(key);
}
const nextFrame = () => new Promise(r => setTimeout(r, 0));
// Meilleure équipe château : présélection rapide (seuil d'Aya / course aux dégâts), puis vrais combats simulés sur les meilleures.
async function bestCastleSim(own, onp, current) {
  const C = LRS().filter(c => own[c.id] != null); if (C.length < 3) return null;
  const cand = [];
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) for (let k = j + 1; k < C.length; k++) { const t = [C[i], C[j], C[k]]; if (!roleOk(t)) continue; const e = castleEval(t, own);
    const pw = t.reduce((n, c) => { const s = statsAt(c, own[c.id] || 0); return n + s.hp / 100 + s.atk / 10; }, 0);
    cand.push({ t, v: e.room + (e.aya ? 400 : 0) + (t.some(c => HEALERS.includes(c.id)) ? 200 : 0) + (t.some(c => [340, 499, 329].includes(c.id)) ? 80 : 0) + pw }); }
  cand.sort((a, b) => b.v - a.v); const pool = cand.slice(0, 40);
  if (current?.length === 3 && roleOk(current) && !pool.some(x => x.t.every(c => current.some(y => y.id === c.id)))) pool.push({ t: current });
  const quick = []; for (let i = 0; i < pool.length; i++) { if (i % 4 === 0) { onp?.(i, pool.length + 5); await nextFrame(); } const r = simCastle(pool[i].t, own, 40); quick.push({ t: pool[i].t, sc: r.play * 1000 + r.sure }); }
  quick.sort((a, b) => b.sc - a.sc); let best = null; const fin = quick.slice(0, 5);
  for (let i = 0; i < fin.length; i++) { onp?.(pool.length + i + 1, pool.length + 5); await nextFrame(); const r = simCastle(fin[i].t, own); const sc = r.play * 1000 + r.sure + r.max / 1000; if (!best || sc > best.sc) best = { team: fin[i].t, r, sc }; }
  return best;
}
function rankedScore(team, own) {
  const st = c => (own[c.id] || 0); let sc = 0;
  for (const c of team) { const s = statsAt(c, st(c)); sc += s.hp / 100 + s.atk / 10; }
  const ids = team.map(c => c.id); const has = id => ids.includes(id);
  if (team.some(c => HEALERS.includes(c.id))) sc += 6; if (team.some(c => c.c === 'stunner')) sc += 4;
  if (has(1070) || has(961)) sc += 5; if (has(3247)) sc += 6; if (has(499)) sc += 3;
  return Math.round(sc);
}
// Équipes adverses de la méta (relevées en ranked), simulées à 4★.
const OPP = [[1070, 3248, 3247], [308, 1070, 3247], [340, 1070, 3248], [961, 3247, 3248], [183, 1070, 128], [499, 128, 1070]], OPP_ST = 4;
const unitOf = (c, st) => { const s = statsAt(c, st); return { id: c.id, hp: s.hp, atk: s.atk }; };
const oppTeams = () => OPP.map(ids => ids.map(id => LRS().find(c => c.id === id))).filter(t => t.every(Boolean));
function rankedSim(team, own, n = 40) {
  const A = team.map(c => unitOf(c, own[c.id] || 0));
  const res = oppTeams().map(t => ({ t, w: duelRate(A, t.map(c => unitOf(c, OPP_ST)), n) }));
  return { avg: res.length ? res.reduce((a, r) => a + r.w, 0) / res.length : 0, res };
}
async function bestRankedSim(own, onp, cur) {
  const C = LRS().filter(c => own[c.id] != null); if (C.length < 3) return null; let trios = [];
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) for (let k = j + 1; k < C.length; k++) { const t = [C[i], C[j], C[k]]; if (roleOk(t)) trios.push(t); }
  if (trios.length > 260) { trios.sort((a, b) => rankedScore(b, own) - rankedScore(a, own)); trios = trios.slice(0, 260); }
  if (cur && !trios.some(t => t.every(c => cur.includes(c)))) trios.push(cur);
  const q = []; for (let i = 0; i < trios.length; i++) { if (i % 10 === 0) { onp?.(i, trios.length + 8); await nextFrame(); } q.push({ t: trios[i], v: rankedSim(trios[i], own, 12).avg + rankedScore(trios[i], own) / 1e5 }); }
  q.sort((a, b) => b.v - a.v); let best = null; const fin = q.slice(0, 8);
  for (let i = 0; i < fin.length; i++) { onp?.(trios.length + i + 1, trios.length + 8); await nextFrame(); const r = rankedSim(fin[i].t, own, 80); if (!best || r.avg > best.r.avg) best = { team: fin[i].t, r }; }
  return best;
}
const forceTxt = r => `<div class="grid" style="margin-top:14px"><div><div class="mute small">Indice de force</div><div class="cd">${Math.round(r.avg * 100)}<span class="small mute">/100</span></div></div></div>
  <div class="opps">${r.res.map(x => `<div class="opp"><span class="small">${x.t.map(c => esc(c.n.replace(/\s*\(.*$/, ''))).join(' · ')}</span><span class="bar"><i style="width:${Math.round(x.w * 100)}%"></i></span><b class="small">${Math.round(x.w * 100)} %</b></div>`).join('')}</div>
  <p class="small mute">Victoires simulées contre les ${r.res.length} équipes de la méta (adversaires à ${OPP_ST}★), avec les stats exactes de tes cartes à leurs étoiles et la vraie technique de chacune. C'est une estimation : le joueur d'en face peut jouer autrement.</p>`;
function synergy(bt) {
  const has = id => bt.some(c => c.id === id), k = c => KIND_OF(c.id), L = [];
  const heal = bt.find(c => HEALERS.includes(c.id)), stun = bt.find(c => ['stunall', 'timestop', 'dom', 'door'].includes(k(c))), dodge = bt.find(c => [1070, 961].includes(c.id)), aoe = bt.find(c => k(c) === 'aoe');
  if (heal && has(3247)) L.push(`<b>${esc(heal.n)} + Boros Second Form</b> : le soin remonte Boros avant sa résurrection, il encaisse donc deux vies pleines.`);
  if (heal && dodge) L.push(`<b>${esc(dodge.n)}</b> fait taper l'adversaire dans le vide pendant que <b>${esc(heal.n)}</b> remonte l'équipe : les dégâts adverses sont perdus deux fois.`);
  if (stun && aoe) L.push(`<b>${esc(stun.n)}</b> bloque l'adversaire un tour pendant que <b>${esc(aoe.n)}</b> touche toute son équipe.`);
  if (has(499)) L.push('<b>Xebec</b> : le HAKI annule le prochain coup sur chaque allié, et bloque les contrôles adverses.');
  if (has(953) && heal) L.push('<b>Ayanokouji + soin</b> : Aya descend bas, échange ses PV avec l\'adversaire le plus plein, puis le soin la remonte.');
  return L;
}
const META = [[1070, 3248, 3247], [308, 1070, 3247], [340, 1070, 3248], [961, 3247, 3248]];
function bestTeam(mode, own) {
  const C = LRS().filter(c => own[c.id] != null); if (C.length < 3) return null;
  if (mode === 'ranked') { for (const t of META) if (t.every(id => own[id] != null)) return { team: t.map(id => C.find(c => c.id === id)), meta: true }; }
  let best = null;
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) for (let k = j + 1; k < C.length; k++) { const t = [C[i], C[j], C[k]]; if (!roleOk(t)) continue;
    const v = mode === 'chateau' ? (() => { if (!t.some(c => c.id === AYA) && C.some(c => c.id === AYA)) return -1; const e = castleEval(t, own); return e.room * 1000 + (e.aya ? 500 : 0) + (t.some(c => c.id === 340) ? 300 : t.some(c => c.id === 329) ? 200 : t.some(c => c.id === 499) ? 100 : 0) + rankedScore(t, own) / 10; })() : rankedScore(t, own);
    if (!best || v > best.v) best = { team: t, v }; }
  return best;
}
function teamPicker(team, own, mode) {
  const C = LRS().filter(c => own[c.id] != null);
  return [0, 1, 2].map(i => `<select data-slot="${i}" aria-label="Carte ${i + 1}"><option value="">— carte ${i + 1} —</option>${C.map(c => `<option value="${c.id}" ${team[i]?.id === c.id ? 'selected' : ''}>${esc(c.n)} ${own[c.id] || 0}★</option>`).join('')}</select>`).join('');
}
const teamCards = (team, own) => `<div class="teamrow">${team.map(c => `<div class="tm">${lrImg(c) ? `<img src="${lrImg(c)}" alt="">` : ''}<b>${esc(c.n)}</b><span class="small mute">${ROLE[c.c] || 'Sans rôle'} · ${own[c.id] || 0}★</span></div>`).join('')}</div>`;

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


// Schéma des deux boucles d'Aya (texte centré dans chaque cercle, lisible sur téléphone).
function loopSVG(heal) {
  const N = heal ? [['Aya encaisse', '1er coup', 'r'], ['Soin 30 %', 'Seiichi / Rimuru', 'g'], ['Aya encaisse', '2e coup', 'r'], ['ÉCHANGE', 'au plus près', 'b', 'de 1 PV'], ['Achever', "l'échangé", 'g']]
    : [['Aya encaisse', '2 coups', 'r'], ['ÉCHANGE', 'au plus près', 'b', 'de 1 PV'], ['Achever', "l'échangé", 'g'], ['Retour', 'au focus', 'm']];
  const C = { r: '#d0122f', g: '#8fb59a', b: '#e9dcc0', m: '#9a8f88' }; const W = 380, cx = W / 2, cy = W / 2, R = 128, r = 54;
  const pts = N.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N.length; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const arrows = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; const a1 = Math.atan2(q[1] - p[1], q[0] - p[0]); const s = [p[0] + (r + 6) * Math.cos(a1), p[1] + (r + 6) * Math.sin(a1)], e = [q[0] - (r + 10) * Math.cos(a1), q[1] - (r + 10) * Math.sin(a1)]; return `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" stroke="#5a4d55" stroke-width="2" marker-end="url(#ah${heal ? 1 : 0})"/>`; }).join('');
  const nodes = N.map((n, i) => { const [x, y] = pts[i]; const col = C[n[2]]; const sub = n[3] ? [n[1], n[3]] : [n[1]];
    return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#0c0a0d" stroke="${col}" stroke-width="3"/><text x="${x}" y="${y - (sub.length > 1 ? 10 : 4)}" text-anchor="middle" font-size="13" font-weight="800" fill="${col}">${n[0]}</text>${sub.map((t, k) => `<text x="${x}" y="${y + 12 + k * 14 - (sub.length > 1 ? 6 : 0)}" text-anchor="middle" font-size="11" fill="#b9aea7">${t}</text>`).join('')}</g>`; }).join('');
  return `<figure class="loopfig"><figcaption>${heal ? 'Avec soigneur (quand Aya meurt en 2 coups)' : 'Sans soigneur'}</figcaption><svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Boucle Aya ${heal ? 'avec' : 'sans'} soigneur"><defs><marker id="ah${heal ? 1 : 0}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5a4d55"/></marker></defs>${arrows}${nodes}<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="26" font-weight="700" fill="#efe6dc">Boucle</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="12" fill="#9a8f88">à faire 2 fois</text></svg></figure>`;
}
function simBlock(r, team) {
  const approx = team.filter(c => APPROX.has(c.id));
  return `<div class="grid" style="margin-top:14px"><div><div class="mute small">Chambre sûre (9 fois sur 10)</div><div class="cd">${r.sure}</div></div><div><div class="mute small">Chambre jouable (1 fois sur 2)</div><div class="cd">${r.play}</div></div><div><div class="mute small">Chambre max (1 fois sur 5)</div><div class="cd">${r.max}</div></div></div>
  <p class="small mute" style="margin-top:8px">150 combats simulés par chambre, avec les stats exactes de tes cartes et la boucle de la Brigade.${approx.length ? ` Technique approchée pour : ${approx.map(c => esc(c.n)).join(', ')}.` : ''}</p>`;
}
function renderCastleReco(best, team, ok, own, mode, use) {
  const bt = best.team, r = best.r; const same = ok && bt.every(c => team.some(x => x.id === c.id)); const e = castleEval(bt, own);
  const cur = ok ? simCastle(team, own) : null;
  $('#rec').innerHTML = `<div class="card section reco"><span class="chip ${same ? 'ok' : 'red'}">${same ? '✓ Ton équipe est déjà la meilleure' : 'Recommandation'}</span><h2 style="margin-top:10px">${same ? 'Garde cette équipe' : 'Équipe conseillée'}</h2>
    ${teamCards(bt, own)}${simBlock(r, bt)}${cur && !same ? `<p><b>Gain par rapport à ton équipe :</b> chambre jouable ${r.play - cur.play >= 0 ? '+' : ''}${r.play - cur.play}, chambre sûre ${r.sure - cur.sure >= 0 ? '+' : ''}${r.sure - cur.sure}.</p>` : ''}
    <h3 style="margin-top:18px">Pourquoi cette équipe</h3><ul class="list">${castleWhy(bt, own, e).map(x => `<li>${x}</li>`).join('')}</ul>
    <h3>La stratégie</h3>${e.aya ? loopSVG(e.heal) : ''}<ol class="list">${castleStrat(e).map(x => `<li>${x}</li>`).join('')}</ol>
    ${same ? '' : '<button class="btn primary" id="use" style="margin-top:12px">Utiliser cette équipe</button>'}</div>`;
  const u = $('#use'); if (u) u.onclick = () => use(bt);
}
function renderRankedReco(best, team, ok, own, use) {
  const bt = best.team, r = best.r; const same = ok && bt.every(c => team.some(x => x.id === c.id)); const cur = ok && !same ? rankedSim(team, own, 80) : null;
  const syn = synergy(bt);
  $('#rec').innerHTML = `<div class="card section reco"><span class="chip ${same ? 'ok' : 'red'}">${same ? '✓ Ton équipe est déjà la meilleure' : 'Recommandation'}</span><h2 style="margin-top:10px">${same ? 'Garde cette équipe' : 'Équipe conseillée'}</h2>
    ${teamCards(bt, own)}${forceTxt(r)}${cur ? `<p><b>Gain par rapport à ton équipe :</b> ${Math.round((r.avg - cur.avg) * 100) >= 0 ? '+' : ''}${Math.round((r.avg - cur.avg) * 100)} points d'indice de force.</p>` : ''}
    <h3 style="margin-top:18px">Pourquoi cette équipe</h3><ul class="list"><li>Testée en match simulé contre chaque équipe de la méta, avec les stats de tes cartes à leurs étoiles, leurs techniques et une seule carte par rôle : c'est le trio qui gagne le plus souvent parmi tes LR.</li>${syn.map(x => `<li>${x}</li>`).join('')}
    ${bt.some(c => HEALERS.includes(c.id)) ? '' : '<li>Pas de soigneur dans ce trio : Seiichi est la carte qui ferait le plus progresser ton équipe.</li>'}</ul>
    <h3>La stratégie</h3><ol class="list"><li>Focus d'abord l'adversaire qui n'est pas protégé (pas d'esquive, pas d'UI, pas de voile Haki).</li><li>Ne gaspille pas un contrôle ou un gros coup sur une carte qui esquive encore : fais-lui d'abord perdre ses esquives avec des attaques simples.</li><li>Achève en priorité un adversaire qu'on peut tuer en un coup.</li><li>Garde le soin pour sauver un allié d'un coup fatal, pas pour remonter quelques PV.</li></ol>
    ${same ? '' : '<button class="btn primary" id="use" style="margin-top:12px">Utiliser cette équipe</button>'}</div>`;
  const u = $('#use'); if (u) u.onclick = () => use(bt);
}
P.equipe = async (m, mode = 'chateau') => {
  mode = mode === 'ranked' ? 'ranked' : 'chateau'; await loadMyLR(); const own = S.mylr.cards; S.mylr.teams = S.mylr.teams || {};
  const title = mode === 'chateau' ? 'Château de l\'infini' : 'Ranked';
  if (Object.keys(own).length < 3) { m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${title}</span><h1 style="margin-top:12px">Meilleure équipe</h1><p class="mute">Pour te conseiller, il faut d'abord savoir quelles LR tu possèdes et à combien d'étoiles.</p><a class="btn primary" href="#meslr">Renseigner mes LR</a></section>`; return; }
  const byId = id => LRS().find(c => c.id === +id);
  let team = (S.mylr.teams[mode] || []).map(byId).filter(Boolean);
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${title}</span><h1 style="margin-top:12px">Meilleure équipe</h1><p class="mute">${mode === 'chateau' ? 'Choisis ton équipe actuelle pour voir la chambre max qu\'elle peut atteindre, ou laisse le site trouver la meilleure parmi tes LR.' : 'Choisis ton équipe actuelle, ou laisse le site trouver la meilleure parmi tes LR : chaque trio est testé en matchs simulés contre les équipes de la méta, avec les stats à tes étoiles, les techniques et les synergies.'}</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="af">⚡ Auto-remplir la meilleure équipe</button><a class="btn ghost" href="#meslr">Modifier mes LR</a></div></section>
    <div class="card section"><h2>Mon équipe</h2><p class="small mute">Une seule carte par rôle, comme dans le jeu.</p><div class="row picks">${teamPicker(team, own)}</div><div id="cur" style="margin-top:14px"></div></div>
    <div id="rec"></div>`;
  const use = async bt => { team = bt.slice(); S.mylr.teams[mode] = team.map(c => c.id); await saveMyLR(); $('.picks').innerHTML = teamPicker(team, own); bind(); show(); toast('Équipe enregistrée'); };
  const show = () => {
    const ok = team.length === 3 && roleOk(team);
    if (!ok) { $('#cur').innerHTML = team.length === 3 ? '<div class="msg">Deux cartes ont le même rôle : le jeu ne l\'accepte pas.</div>' : '<p class="mute small">Choisis 3 cartes.</p>'; }
    else if (mode === 'chateau') { const r = simCastle(team, own); $('#cur').innerHTML = `${teamCards(team, own)}${simBlock(r, team)}`; }
    else $('#cur').innerHTML = `${teamCards(team, own)}${forceTxt(rankedSim(team, own, 40))}`;
    if (mode === 'chateau') { $('#rec').innerHTML = '<div class="card section"><div class="row"><span class="chip red">Simulation</span><span class="mute small" id="simp">Combats simulés en cours…</span></div><div class="bar" style="margin-top:10px"><i id="simbar" style="width:0%"></i></div></div>'; const tok = (S.simTok = (S.simTok || 0) + 1);
      bestCastleSim(own, (i, n) => { if (S.simTok !== tok) return; const b = $('#simbar'); if (b) b.style.width = (i / n * 100) + '%'; const t = $('#simp'); if (t) t.textContent = `Combats simulés : ${Math.round(i / n * 100)} %…`; }, ok ? team : null).then(best => { if (S.simTok !== tok || !best) return; renderCastleReco(best, team, ok, own, mode, use); });
      return; }
    $('#rec').innerHTML = '<div class="card section"><div class="row"><span class="chip red">Simulation</span><span class="mute small" id="simp">Matchs simulés contre la méta…</span></div><div class="bar" style="margin-top:10px"><i id="simbar" style="width:0%"></i></div></div>'; const tok = (S.simTok = (S.simTok || 0) + 1);
    bestRankedSim(own, (i, n) => { if (S.simTok !== tok) return; const b = $('#simbar'); if (b) b.style.width = (i / n * 100) + '%'; const t = $('#simp'); if (t) t.textContent = `Matchs simulés : ${Math.round(i / n * 100)} %…`; }, ok ? team : null).then(best => { if (S.simTok !== tok || !best) return; renderRankedReco(best, team, ok, own, use); });
  };
  const showOld = () => { const ok = false;
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
  $('#af').onclick = async () => { const b = mode === 'chateau' ? await bestCastleSim(own) : await bestRankedSim(own); if (!b) return; team = b.team.slice(); S.mylr.teams[mode] = team.map(c => c.id); await saveMyLR(); $('.picks').innerHTML = teamPicker(team, own); bind(); show(); toast('Meilleure équipe placée'); };
  bind(); show();
};

/* ---------- Guides générés depuis les données du jeu ---------- */
async function loadEvoItems() { if (S.evoItems) return S.evoItems; const { data } = await sb.from('content').select('data').eq('key', 'evo_items').maybeSingle(); S.evoItems = data?.data || {}; return S.evoItems; }
const RC = { Commun: 'C', Rare: 'R', 'Épique': 'E', 'Légendaire': 'L', Mythique: 'M', Secret: 'S' };
async function evoGuide(m) {
  const E = S.kb.evolutions?.list || []; const IT = await loadEvoItems();
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">Éveil des cartes</h1><p class="mute">Les ${E.length} éveils du jeu, présentés comme dans l'écran Évolution : la carte de départ, la version éveillée, et tout ce qu'il faut réunir (taux de drop affichés par le jeu).</p></section>
    <div class="card section"><h2>À savoir avant d'éveiller</h2><ul class="list"><li>L'éveil est définitif : la carte de départ est consommée et remplacée par la version éveillée.</li><li>La version éveillée a des stats de base plus hautes et <b>monte en étoiles</b> comme les autres LR (+8 % de PV et d'attaque par étoile).</li><li>Une version <b>prestige</b> est autre chose : c'est la version prestige d'une carte non éveillée, et elle ne peut pas se transformer (Boros prestige ne devient pas Boros Second Form, Sukuna prestige non plus).</li><li>Les objets à 0,5 % demandent en moyenne environ 200 victoires chacun : calcule le temps de farm avant de te lancer.</li><li>Garde l'œil sur le marché : la carte de départ coûte parfois moins cher que le farm.</li></ul></div>
    <div class="row"><input id="q" placeholder="Rechercher une carte, un objet, un lieu" style="flex:1;min-width:200px"></div><div class="evolist" id="el" style="margin-top:14px"></div>`;
  const cardT = (c, extra = '') => `<div class="evc r${RC[c.r] || 'C'}">${c.img ? `<img loading="lazy" src="${c.img}" alt="">` : '<div class="noimg"></div>'}<span>${esc(c.n)}</span>${extra}</div>`;
  const itemT = i => `<div class="evi r${RC[i.r] || 'C'}">${IT[i.id] ? `<img loading="lazy" src="${IT[i.id]}" alt="">` : '<div class="noimg"></div>'}<b class="qty">×${i.q}</b><div><b>${esc(i.n)}</b><small class="mute">${esc(i.r)}</small><small>${i.src.length ? i.src.map(esc).join(' / ') : 'Introuvable pour le moment'}</small></div></div>`;
  const draw = () => { const q = $('#q').value.toLowerCase();
    $('#el').innerHTML = E.filter(e => !q || JSON.stringify(e).toLowerCase().includes(q)).map(e => `<div class="card evo"><div class="evhead">${cardT(e.from)}<span class="evarrow">→</span>${cardT(e.to, '<i class="evtag">Éveillée</i>')}</div>
      <div class="evreq"><div class="small mute" style="margin-bottom:6px">Il faut :</div>${e.ki ? `<div class="evki"><b>${fmt(e.ki)}</b> KI</div>` : ''}<div class="evcards">${(e.cards || []).map(c => cardT(c, `<b class="qty">×${c.q}</b>`)).join('')}</div>${e.items.map(itemT).join('')}</div></div>`).join('') || '<div class="empty">Aucun résultat.</div>'; };
  $('#q').oninput = draw; draw();
}
async function raidGuide(m) {
  const E = S.kb.evolutions?.list || []; const by = {}; const IT = await loadEvoItems();
  for (const e of E) for (const i of e.items) for (const s of i.src) { const [place, act, ch] = s.split(' · '); const k = place + ' · ' + act; (by[k] = by[k] || { place, act, items: new Map() }).items.set(i.n, { n: i.n, id: i.id, r: i.r, ch, for: [...((by[k].items.get(i.n) || {}).for || []), e.to.n] }); }
  const L = Object.values(by).sort((a, b) => a.place.localeCompare(b.place) || a.act.localeCompare(b.act));
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">Raids et lieux de farm</h1><p class="mute">Où tombe chaque objet d'éveil, avec le taux affiché par le jeu, et à quoi il sert.</p></section>
    <div class="card section"><h2>Bien farmer</h2><ul class="list"><li>Chaque niveau de raid a ses propres objets, chacun avec un taux fixe (celui affiché par le jeu). Choisis donc le niveau qui donne l'objet qui te manque : un niveau plus difficile ne donne pas un meilleur taux.</li><li>Ton équipe doit gagner vite et sans risque : 3 gardiens qui tombent en quelques tours valent mieux qu'un combat serré.</li><li>Les objets Communs (30 %) viennent vite. Les objets Secret (0,5 %) sont une affaire de patience : environ 200 victoires en moyenne, sans garantie.</li><li>Vérifie avant de farmer que l'éveil t'est vraiment utile pour ton équipe.</li></ul></div>
    <div class="grid">${L.map(l => `<div class="card"><span class="chip">${esc(l.act)}</span><h3 style="margin-top:10px">${esc(l.place)}</h3><ul class="list small rlist">${[...l.items.values()].map(i => `<li>${IT[i.id] ? `<img src="${IT[i.id]}" alt="" class="ricon">` : ''}<b>${esc(i.n)}</b> <span class="mute">(${esc(i.r)})</span> · <span class="bone">${esc(i.ch)}</span><div class="mute">pour ${[...new Set(i.for)].map(esc).join(', ')}</div></li>`).join('')}</ul></div>`).join('') || '<div class="empty">Données à venir.</div>'}</div>`;
}
function rolesGuide(m) {
  const C = S.kb.cards.filter(c => !c.r); const roles = Object.keys(ROLE);
  const best = r => C.filter(c => c.c === r).map(c => ({ c, s: statsAt(c, 5) })).sort((a, b) => (b.s.hp / 1000 + b.s.atk / 100) - (a.s.hp / 1000 + a.s.atk / 100));
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">Les meilleures cartes par rôle</h1><p class="mute">Le jeu n'accepte qu'une carte par rôle dans une équipe. Voici les LR de chaque rôle, avec leurs stats à 5★ et ce qu'elles apportent.</p></section>
    <div class="card section"><h2>Construire son trio</h2><ul class="list"><li>Un trio gagnant combine en général des dégâts qui ignorent les protections, un soin ou une résurrection, et une carte qui contrôle ou encaisse.</li><li>En ranked, les esquives (Janemba, Goku MUI) et les boucliers font perdre des tours à l'adversaire : vise d'abord ce qui n'est pas protégé.</li><li>Un soigneur qui rend 30 % des PV à toute l'équipe (Seiichi) change la donne au château comme en ranked : il permet de survivre à un coup de plus.</li><li>Les étoiles comptent beaucoup : +8 % de PV et d'attaque par étoile. Une LR 5★ d'un rôle moyen bat souvent une LR 0★ d'un rôle fort.</li></ul></div>
    ${roles.map(r => `<div class="section"><h2>${ROLE[r]}</h2><div class="grid">${best(r).map(({ c, s }, i) => `<div class="card"><div class="row"><span class="chip ${i < 3 ? 'red' : ''}">${i < 3 ? 'Top ' + (i + 1) : ROLE[r]}</span>${c.p ? '<span class="chip">Éveil</span>' : ''}</div><h3 style="margin-top:10px">${esc(c.n)}</h3><div class="small mute">${esc(c.a)} · <b>${fmt(s.hp)}</b> PV · <b>${fmt(s.atk)}</b> ATQ</div>${(c.t || []).slice(0, 2).map(t => `<div class="tech"><b>${esc(t[0])}</b><div class="small mute">${esc(t[1])}</div></div>`).join('')}</div>`).join('')}</div></div>`).join('')}`;
}

P.lexique = m => {
  const L = S.kb.lexique || [];
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Brigade Fantôme</span><h1 style="margin-top:12px">Lexique</h1><p class="mute">Les mots du jeu, pour les nouveaux comme pour les anciens.</p></section><input id="q" placeholder="Chercher un mot"><div class="grid" id="lx" style="margin-top:14px"></div>`;
  const d = () => { const q = $('#q').value.toLowerCase(); $('#lx').innerHTML = L.filter(x => !q || (x[0] + x[1]).toLowerCase().includes(q)).map(x => `<div class="card lexi"><h3>${esc(x[0])}</h3><p class="mute small">${esc(x[1])}</p></div>`).join(''); };
  $('#q').oninput = d; d();
};

P.nouveautes = async m => {
  m.innerHTML = `<h1>Nouveautés</h1><p class="mute">Ce qui change dans le jeu, et ce que ça change pour vos cartes et vos stratégies.</p><div id="nw"><div class="empty">Chargement…</div></div>`;
  const { data } = await sb.from('news').select('*').order('at', { ascending: false }).limit(50);
  $('#nw').innerHTML = (data || []).map(n => `<div class="card section"><span class="small mute">${new Date(n.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><h2 style="margin-top:6px">${esc(n.title)}</h2><p style="white-space:pre-wrap">${esc(n.body)}</p></div>`).join('') || '<div class="empty">Pas encore de nouveautés.</div>';
};

async function shrinkImage(file, max = 1024) {
  const url = URL.createObjectURL(file); const im = new Image(); await new Promise((ok, ko) => { im.onload = ok; im.onerror = ko; im.src = url; });
  const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c.toDataURL('image/jpeg', .82);
}
async function kakashiCtx() {
  try { await loadMyLR(); const own = S.mylr.cards || {}; if (Object.keys(own).length < 3) return '';
    const L = []; const bc = await bestCastleSim(own); if (bc) L.push(`Meilleure équipe château (combats simulés) : ${bc.team.map(c => `${c.n} ${own[c.id] || 0}★`).join(', ')} → chambre sûre ${bc.r.sure} (gagnée 9 fois sur 10), jouable ${bc.r.play} (1 fois sur 2), max ${bc.r.max} (1 fois sur 5).`);
    const br = bestTeam('ranked', own); if (br) L.push(`Équipe ranked conseillée : ${br.team.map(c => `${c.n} ${own[c.id] || 0}★`).join(', ')}${br.meta ? ' (trio de la méta)' : ''}.`);
    for (const md of ['chateau', 'ranked']) { const t = (S.mylr.teams?.[md] || []).map(id => LRS().find(c => c.id === +id)).filter(Boolean); if (t.length === 3) { const r = md === 'chateau' ? simCastle(t, own) : null; L.push(`Équipe ${md} actuelle du membre : ${t.map(c => c.n).join(', ')}${r ? ` (chambre sûre ${r.sure}, jouable ${r.play}, max ${r.max})` : ''}.`); } }
    return L.join('\n'); } catch { return ''; }
}
P.kakashi = m => {
  m.innerHTML = `<div class="row"><h1 style="margin:0">Kakashi</h1><span class="sp"></span><span class="chip red">IA de la Brigade</span></div>
    <p class="mute">Pose n'importe quelle question sur YURO : équipe, château, ranked, prix, éveils… Tu peux joindre une capture d'écran (collection, équipe, combat). Kakashi connaît tes LR.</p>
    <div class="chat" id="ch"></div>
    <div id="kimg" class="small mute" style="margin-top:8px"></div>
    <form id="kf" class="row" style="margin-top:8px"><label class="btn" title="Joindre une capture" style="cursor:pointer;padding:0 14px">📷<input id="kfile" type="file" accept="image/*" hidden></label><input id="kq" placeholder="Ex. quelle équipe pour passer la chambre 700 ?" autocomplete="off" style="flex:1;min-width:180px"><button class="btn primary" id="ks">Envoyer</button></form>
    <div class="row" style="margin-top:10px">${['Quelle est ma meilleure équipe au château ?', 'Comment battre une équipe avec Janemba ?', 'Que vaut Makima au prix actuel ?', 'Quel éveil me rapporterait le plus ?'].map(x => `<button class="chip" data-q="${x}" style="cursor:pointer">${x}</button>`).join('')}</div>`;
  const ch = $('#ch'); const hist = []; let pending = null;
  const say = (t, who, img) => { const b = document.createElement('div'); b.className = 'bubble ' + who; b.innerHTML = (img ? `<img src="${img}" alt="" style="max-width:220px;border-radius:10px;display:block;margin-bottom:6px">` : '') + md(t); ch.appendChild(b); ch.scrollTop = ch.scrollHeight; return b; };
  say("Yo. Je connais toutes les LR et leurs stats exactes, les formules du château, les prix réels du marché, les éveils, la méta ranked et tes propres LR. Pose ta question, ou envoie une capture.", 'k');
  $('#kfile').onchange = async e => { const f = e.target.files[0]; if (!f) return; pending = await shrinkImage(f); $('#kimg').innerHTML = `📎 Capture jointe <button class="chip" id="kx" style="cursor:pointer">retirer</button>`; $('#kx').onclick = () => { pending = null; $('#kimg').innerHTML = ''; }; e.target.value = ''; };
  const ask = async q => { q = q.trim(); if (!q && !pending) return; const img = pending; pending = null; $('#kimg').innerHTML = '';
    say(q || 'Analyse cette capture.', 'me', img); hist.push({ role: 'user', content: q || 'Analyse cette capture.' });
    const wait = say('…', 'k'); $('#ks').disabled = true;
    try { const ctx = await kakashiCtx(); const { data, error } = await sb.functions.invoke('kakashi-ai', { body: { messages: hist.slice(-8), image: img, ctx } });
      let txt = data?.answer; if (error || !txt) { let msg = data?.error; try { msg = msg || (await error?.context?.json?.())?.error; } catch {} txt = (msg ? msg + '\n\n' : '') + 'Réponse rapide depuis la base :\n' + answer(q, S.kb); }
      wait.innerHTML = md(txt); hist.push({ role: 'assistant', content: txt }); } catch (e) { wait.innerHTML = md(answer(q, S.kb)); }
    $('#ks').disabled = false; ch.scrollTop = ch.scrollHeight; };
  $('#kf').onsubmit = e => { e.preventDefault(); const v = $('#kq').value; $('#kq').value = ''; ask(v); };
  m.querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
};


P.guilde = async (m, id) => {
  const PS = S.kb.prestige_series; const U = PS?.series || [];
  await loadCollections(); const { data: lrs } = await sb.from('my_lr').select('user_id,cards,teams'); const LRm = {}; for (const r of lrs || []) LRm[r.user_id] = r;
  const byId = x => LRS().find(c => c.id === +x);
  const sharing = S.members.filter(p => p.share);
  if (id) {
    const p = S.members.find(x => x.id === id); if (!p || (!p.share && id !== S.user.id)) { m.innerHTML = '<div class="empty">Ce membre ne partage pas son profil.</div>'; return; }
    const lr = LRm[id] || { cards: {}, teams: {} }; const own = lr.cards || {};
    const team = k => (lr.teams?.[k] || []).map(byId).filter(Boolean);
    const tblock = (k, label) => { const t = team(k); if (t.length !== 3) return `<div class="card"><h3>${label}</h3><p class="mute small">Pas encore renseignée.</p></div>`; const r = k === 'chateau' ? simCastle(t, own) : null; return `<div class="card"><h3>${label}</h3>${teamCards(t, own)}${r ? `<p class="small" style="margin-top:10px">Chambre sûre <b>${r.sure}</b> · jouable <b>${r.play}</b> · max <b>${r.max}</b></p>` : ''}</div>`; };
    const coll = S.coll[id] || {}, mine = myColl();
    const dupes = U.flatMap(u => u.c.filter(c => coll[u.s]?.dupes.has(c[0])).map(c => [u, c]));
    const inc = U.map(u => ({ u, miss: u.c.filter(c => !coll[u.s]?.owned.has(c[0])) })).filter(x => x.miss.length && x.miss.length < x.u.c.length).sort((a, b) => a.miss.length - b.miss.length);
    const lrOwned = LRS().filter(c => own[c.id] != null).sort((a, b) => (own[b.id] || 0) - (own[a.id] || 0));
    m.innerHTML = `<a href="#guilde" class="btn ghost" style="min-height:36px">← Guilde</a>
      <section class="hero" style="margin-top:12px"><div class="moon"></div><span class="chip red">Profil</span><h1 style="margin-top:12px">${esc(p.discord)}</h1><p class="mute">${lrOwned.length} LR · ${dupes.length} doublons</p></section>
      <div class="grid">${tblock('chateau', 'Équipe château')}${tblock('ranked', 'Équipe ranked')}</div>
      <div class="section"><h2>Ses LR</h2><div class="tiles">${lrOwned.map(c => `<div class="tile on rS">${lrImg(c) ? `<img loading="lazy" src="${lrImg(c)}" alt="">` : '<div class="noimg"></div>'}<b class="dup">${own[c.id] || 0}★</b><span>${esc(c.n)}</span></div>`).join('') || '<div class="mute">Pas encore renseignées.</div>'}</div></div>
      <div class="section"><h2>Ses doublons</h2><p class="small mute">En vert : ceux qui te manquent.</p><div class="tiles">${dupes.map(([u, c]) => tile(c, !mine[u.s]?.owned.has(c[0]), false)).join('') || '<div class="mute">Aucun doublon déclaré.</div>'}</div></div>
      <div class="section"><h2>Ses cartes manquantes</h2><p class="small mute">Par univers, du plus proche de la fin au plus lointain. En vert : celles que tu as en double.</p>
      ${inc.map(x => `<div class="card" style="margin:10px 0"><div class="row"><b>${esc(x.u.s)}</b><span class="sp"></span><span class="small mute">${x.miss.length} manquante${x.miss.length > 1 ? 's' : ''}</span></div><div class="tiles" style="margin-top:10px">${x.miss.map(c => tile(c, !!mine[x.u.s]?.dupes.has(c[0]), false)).join('')}</div></div>`).join('') || '<div class="mute">Rien à afficher.</div>'}</div>`;
    return;
  }
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guilde</span><h1 style="margin-top:12px">Profils de la guilde</h1><p class="mute">Les membres qui partagent leur profil : leurs équipes château et ranked, leurs LR, leurs doublons et les cartes qui leur manquent.</p>${S.profile.share ? '' : '<a class="btn primary" href="#discord">Partager mon profil</a>'}</section>
    <div class="grid">${sharing.map(p => { const lr = LRm[p.id] || {}; const own = lr.cards || {}; const ct = (lr.teams?.chateau || []).map(byId).filter(Boolean); const rt = (lr.teams?.ranked || []).map(byId).filter(Boolean); const s = memberStats(p.id, U);
      return `<a class="card" href="#guilde/${p.id}"><h3>${esc(p.discord)}</h3><div class="small mute">${Object.keys(own).length} LR · ${s.done} univers complets · ${s.du} doublons</div>${ct.length ? `<div class="small" style="margin-top:8px"><span class="mute">Château :</span> ${ct.map(c => esc(c.n)).join(', ')}</div>` : ''}${rt.length ? `<div class="small"><span class="mute">Ranked :</span> ${rt.map(c => esc(c.n)).join(', ')}</div>` : ''}</a>`; }).join('') || '<div class="empty">Personne ne partage encore son profil.</div>'}</div>`;
};

P.discord = async m => {
  m.innerHTML = `<h1>Espace Discord</h1>${DISCORD_INVITE && !DISCORD_INVITE.startsWith('__') ? `<p><a class="btn primary" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener">Rejoindre le Discord</a></p>` : ''}
  <div class="grid">
   <div class="card"><h2>Boîte à questions</h2><form id="qf"><textarea id="qb" placeholder="Ta question pour la Brigade"></textarea><button class="btn primary" style="margin-top:8px">Envoyer</button></form><div id="ql" style="margin-top:14px"></div></div>
   <div class="card"><h2>Mur des records</h2><form id="rf" class="row"><input id="rc" type="number" placeholder="Record château" style="flex:1;min-width:120px"><input id="re" type="number" placeholder="Elo ranked" style="flex:1;min-width:120px"><button class="btn">Mettre à jour</button></form><div id="rl" style="margin-top:14px"></div></div>
   <div class="card" style="grid-column:1/-1"><h2>Mon profil d'échange</h2><p class="small mute">Rempli automatiquement depuis ta <a href="#checklist">Collection Prestige</a> : tes doublons et les cartes qui te manquent dans les univers presque complets.</p><div id="mp"></div>
     <div class="row" style="margin-top:12px;align-items:flex-start"><label class="switch"><input type="checkbox" id="sh2"><span></span></label><div style="flex:1;min-width:220px"><b>Partager mon profil avec la guilde</b><div class="small mute">${SHARE_TXT}</div></div></div></div>
  </div>`;
  const { data: profs } = await sb.from('profiles').select('id,discord').eq('status', 'approved'); const who = id => (profs || []).find(p => p.id === id)?.discord || 'Membre';
  const loadQ = async () => { const { data } = await sb.from('questions').select('*').order('at', { ascending: false }).limit(30); $('#ql').innerHTML = (data || []).map(q => `<div style="border-top:1px solid var(--line);padding:10px 0"><div class="small mute">${esc(who(q.user_id))}</div><div>${esc(q.body)}</div>${q.answer ? `<div class="small bone" style="margin-top:4px">↳ ${esc(q.answer)}</div>` : ''}</div>`).join('') || '<div class="small mute">Aucune question.</div>'; };
  const loadR = async () => { const { data } = await sb.from('records').select('*').order('castle', { ascending: false, nullsFirst: false }); $('#rl').innerHTML = `<table><thead><tr><th>Membre</th><th class="n">Château</th><th class="n">Elo</th></tr></thead><tbody>${(data || []).map(r => `<tr><td>${esc(who(r.user_id))}</td><td class="n">${fmt(r.castle)}</td><td class="n">${fmt(r.elo)}</td></tr>`).join('')}</tbody></table>`; };
  const loadT = async () => { return; };
  const loadT0 = async () => { const { data } = await sb.from('trades').select('*').order('at', { ascending: false }).limit(40); $('#tl').innerHTML = (data || []).map(t => `<div style="border-top:1px solid var(--line);padding:10px 0"><div class="row"><b>${esc(who(t.user_id))}</b><span class="sp"></span>${t.user_id === S.user.id ? `<button class="chip" data-del="${t.id}" style="cursor:pointer">Retirer</button>` : ''}</div><div class="small"><span class="mute">A :</span> ${esc(t.has || '—')}</div><div class="small"><span class="mute">Cherche :</span> ${esc(t.wants || '—')}</div></div>`).join('') || '<div class="small mute">Aucun échange.</div>'; $('#tl').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await sb.from('trades').delete().eq('id', b.dataset.del); loadT(); }); };
  $('#qf').onsubmit = async e => { e.preventDefault(); const b = $('#qb').value.trim(); if (!b) return; await sb.from('questions').insert({ body: b }); $('#qb').value = ''; loadQ(); };
  $('#rf').onsubmit = async e => { e.preventDefault(); await sb.from('records').upsert({ user_id: S.user.id, castle: +$('#rc').value || null, elo: +$('#re').value || null, updated_at: new Date().toISOString() }); loadR(); toast('Record enregistré'); };
  { await loadCollections(); const U = S.kb.prestige_series?.series || []; const mine = myColl();
    const du = U.flatMap(u => u.c.filter(c => mine[u.s]?.dupes.has(c[0])));
    const near = U.map(u => ({ u, miss: u.c.filter(c => !mine[u.s]?.owned.has(c[0])) })).filter(x => x.miss.length && x.miss.length <= 3).sort((a, b) => a.miss.length - b.miss.length);
    $('#mp').innerHTML = `<div class="small mute" style="margin-top:6px">Mes doublons (${du.length})</div><div class="tiles">${du.map(c => tile(c, true, true)).join('') || '<span class="small mute">Aucun doublon déclaré : marque-les dans Collection Prestige (mode « Doublon à échanger »).</span>'}</div>
      <div class="small mute" style="margin-top:12px">Je cherche (univers presque complets)</div>${near.map(x => `<div style="margin-top:8px"><b class="small">${esc(x.u.s)}</b><div class="tiles" style="margin-top:6px">${x.miss.map(c => tile(c, false, false)).join('')}</div></div>`).join('') || '<span class="small mute">Rien pour l\'instant : coche tes cartes dans Collection Prestige.</span>'}`;
    const sh = $('#sh2'); sh.checked = !!S.profile.share; sh.onchange = async e => { if (e.target.checked && !confirmBox(SHARE_TXT + '\n\nActiver le partage ?')) { e.target.checked = false; return; } const { error } = await sb.rpc('set_share', { v: e.target.checked }); if (error) { toast(error.message); e.target.checked = !e.target.checked; return; } S.profile.share = e.target.checked; toast(e.target.checked ? 'Profil partagé avec la guilde' : 'Profil privé'); }; }
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
  await loadMyLR();
  if (!S.mylr.teams?.done && base !== 'meslr') { location.hash = '#meslr'; return; }
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

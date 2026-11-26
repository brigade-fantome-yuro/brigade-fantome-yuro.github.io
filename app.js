import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import * as CFG from './config.js?v=189';
const { SUPABASE_URL, SUPABASE_ANON_KEY, DISCORD_INVITE, EMAIL_DOMAIN } = CFG;
import { answer, statsAt, towerAt, twoShotRoom, ROLE, setTwoShot, priceStats } from './kakashi.js?v=189';
import { castleReport, APPROX, KIND, farmRate } from './castle.js?v=189';
const KIND_OF = id => (KIND[id] || {}).k;
import { duelRate } from './ranked.js?v=189';
import * as SCAN from './scan.js?v=189';

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
  ['sep', 'Château de l\'infini'], ['chateausim', 'Jouer une chambre (simulateur)', 'layers'], ['guide/chateau', 'Guide du château', 'book'], ['equipe/chateau', 'Meilleure équipe', 'layers'], ['calculs', 'Calculateurs', 'calc'],
  ['sep', 'Ranked'], ['guide/ranked', 'Guide ranked', 'book'], ['equipe/ranked', 'Meilleure équipe', 'layers'], ['simulateur', 'Jouer un match (simulateur)', 'layers'],
  ['sep', 'Salle du temps'], ['guide/temps', 'Guide et calculateur', 'calc'],
  ['sep', 'Collection et Prestige'], ['collection', 'Ma collection', 'check'], ['checklist', 'Collection Prestige', 'check'], ['guide/prestige', 'Guide Prestige', 'book'], ['guide/eveil', 'Éveil des cartes', 'book'], ['guide/raids', 'Raids et farm', 'book'],
  ['sep', 'Cartes'], ['persos', 'Fiches perso', 'users'],
  ['sep', 'Marché'], ['prix', 'Prix marché', 'chart'], ['transactions', 'Dernières transactions', 'chart'], ['alertes', 'Alertes marché', 'bell'],
  ['sep', 'Tournoi'], ['tournoi', 'Tournoi de guildes', 'layers'],
  ['sep', 'Guilde'], ['guilde', 'Profils de la guilde', 'users'], ['discord', 'Espace Discord', 'chat'],
  ['sep', 'Brigade'], ['calendrier', 'Calendrier', 'cal'], ['nouveautes', 'Nouveautés', 'bell'], ['lexique', 'Lexique', 'text']
];

// Import en 1 clic : le favori ouvre le site avec la collection dans l'adresse (#clic=…). On la garde de côté (elle survit à la connexion Discord)
// et on retire ces données de l'adresse. Rien n'est envoyé tant que le membre n'a pas validé.
try { if (location.hash.startsWith('#clic=')) { localStorage.setItem('bf_clic', JSON.stringify({ t: Date.now(), d: decodeURIComponent(location.hash.slice(6)) })); history.replaceState(null, '', location.pathname + location.search + '#clic'); } } catch (e) { /* rien */ }
// Nouvelle version publiée : on recharge une fois pour ne pas garder l'ancien site en cache.
const APP_V = '189';
fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(v => { v = v.trim(); if (v && v !== APP_V && !sessionStorage.getItem('bfv' + v)) { sessionStorage.setItem('bfv' + v, '1'); location.replace(location.pathname + '?v=' + v + location.hash); } }).catch(() => {});
// Installation comme une app (Android, ordinateur) : le navigateur propose l'installation, on garde l'événement pour le bouton.
let INSTALL = null;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL = e; wireInstall(); });
window.addEventListener('appinstalled', () => { INSTALL = null; document.querySelectorAll('.installcard').forEach(x => x.remove()); });
function wireInstall() { const b = document.getElementById('inst'); if (!b) return; if (!INSTALL) { b.style.display = 'none'; return; } b.style.display = ''; b.onclick = async () => { const e = INSTALL; INSTALL = null; e.prompt(); try { await e.userChoice; } catch (_) { /* rien */ } wireInstall(); }; }
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const slug = d => String(d).trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');

/* ---------- Authentification ---------- */
function authView(mode = 'login', note = '') {
  app.innerHTML = `<div class="auth"><div class="auth-card"><div class="moon"></div>
    <div class="brand" style="margin:0 0 6px">${SPIDER}<b>Brigade Fantôme</b></div>
    <h1>Le repaire de la Brigade</h1>
    <p class="mute">Guides, fiches, prix du marché et Kakashi Bot. Réservé aux membres de la Brigade sur Discord.</p>
${CFG.DISCORD_LOGIN ? `<button class="btn discord" id="dl" style="width:100%;margin-top:14px"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20 4.6A18 18 0 0 0 15.6 3l-.6 1.2a16 16 0 0 0-6 0L8.4 3A18 18 0 0 0 4 4.6C1.2 8.8.5 12.8.8 16.8A18 18 0 0 0 6.3 19.6l1.2-1.9a11 11 0 0 1-1.8-.9l.4-.3a12.8 12.8 0 0 0 11.8 0l.4.3a11 11 0 0 1-1.8.9l1.2 1.9a18 18 0 0 0 5.5-2.8c.4-4.6-.7-8.6-3.2-12.2zM8.7 14.4c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2zm6.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2z"/></svg>Se connecter avec Discord</button>
    <p class="small mute" style="margin:8px 0 0">On vérifie automatiquement que tu es sur le serveur de la Brigade : accès immédiat, aucun mot de passe.</p>${/Discord|Instagram|FBAN|FBAV|Snapchat|Line\/|TikTok|; wv\)/i.test(navigator.userAgent) ? '<div class="msg" style="margin-top:10px">📱 Tu es dans le navigateur intégré de Discord : il oublie la connexion à chaque fois. Ouvre ce lien dans <b>Safari</b> ou <b>Chrome</b> (menu ⋯ → « Ouvrir dans le navigateur ») pour rester connecté.</div>' : ''}` : ''}
${note ? `<div class="msg">${esc(note)}</div>` : ''}</div></div>`;
  if ($('#dl')) $('#dl').onclick = () => discordLogin();
}

function pendingView(p) {
  app.innerHTML = `<div class="auth"><div class="auth-card"><div class="moon pulse"></div>
    <div class="brand" style="margin:0 0 6px">${SPIDER}<b>Brigade Fantôme</b></div>
    <h1>${p.status === 'refused' ? 'Accès refusé' : 'Demande envoyée'}</h1>
    <p>${p.status === 'refused' ? (p.why === 'revoked' ? 'Ton accès au site a été révoqué par un admin de la Brigade. Contacte le Chef sur Discord si tu penses que c\'est une erreur.' : p.why === 'not_member' ? 'Tu n\'es pas membre de la guilde Brigade Fantôme sur Discord : accès refusé. Rejoins le serveur de la guilde puis reconnecte-toi.' : p.why === 'verif' ? 'La vérification avec Discord n\'a pas abouti. Reconnecte-toi avec Discord pour réessayer.' : 'Ta demande n\'a pas été acceptée. Parle à un admin sur le Discord.') : `Merci <b>${esc(p.discord)}</b>. Un admin vérifie que tu es sur le Discord de la Brigade. Cette page s'ouvrira dès que c'est validé.`}</p>
    <div class="row"><button class="btn" id="rf">${p.status === 'refused' ? 'Se reconnecter avec Discord' : 'Vérifier'}</button><button class="btn ghost" id="lo">Changer de compte</button></div></div></div>`;
  $('#rf').onclick = p.status === 'refused' ? async () => { await sb.auth.signOut(); discordLogin(); } : boot; $('#lo').onclick = async () => { await sb.auth.signOut(); authView(); };
  if (p.status === 'pending') S.timers.push(setTimeout(boot, 30000));
}

/* ---------- Données ---------- */
async function loadKB() {
  const { data, error } = await sb.from('content').select('key,data').not('key', 'in', '(prestige_imgs,ranked_meta,card_feats)');
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

// Connexion Discord : on garde l'adresse demandée (ex. ?apercu#bienvenue) pour y revenir après la connexion.
function discordLogin() { try { if (location.search || (location.hash && !location.hash.includes('access_token'))) localStorage.setItem('bf_after', location.search + location.hash); } catch (e) {}
  return sb.auth.signInWithOAuth({ provider: 'discord', options: { scopes: 'identify guilds', redirectTo: location.origin + location.pathname } }); }
const isPreview = () => S.profile?.role === 'admin' && new URLSearchParams(location.search).has('apercu');
// Didacticiel forcé : tant que la collection n'est pas importée (ou en aperçu admin), pas de menu, seulement les étapes d'import.
const onbMode = () => !S.mylr?.teams?.done || isPreview();
// Ré-import obligatoire (Nicolas 26/11) : les membres déjà accueillis doivent refaire l'import en 1 clic (PC ou téléphone) une fois après cette date.
const REIMPORT_AT = Date.parse('2026-11-26T00:40:00Z');
const reimpMode = () => !!S.mylr?.teams?.done && !(+S.mylr.teams.clic >= REIMPORT_AT) && !isPreview();
const onbAllowed = (base, arg) => base === 'bienvenue' || base === 'clic' || base === 'meslr' || base === 'basses' || (base === 'collection' && /^[LM]\/moi\/(import|all)$/.test(arg || '')) || (base === 'collection' && arg === 'L/moi/all');
// Pendant l'accueil : aucun lien vers une autre page n'est affiché ni cliquable, seulement les étapes.
const onbLinkOk = a => { const h = a.getAttribute('href') || ''; if (!h.startsWith('#')) return !/^https?:/.test(h) || a.target === '_blank'; const [b, ...r] = h.slice(1).split('/'); return !b || onbAllowed(b, r.join('/')); };
function lockOnb(root) { if (app.dataset.mode !== 'onb') return; root.querySelectorAll('a[href]').forEach(a => { if (!onbLinkOk(a)) a.remove(); }); }
document.addEventListener('click', e => { if (app.dataset.mode !== 'onb') return; const a = e.target.closest?.('a[href]'); if (a && !onbLinkOk(a)) { e.preventDefault(); e.stopPropagation(); } }, true);
let ONB_OBS = null;
function shellOnb() {
  app.innerHTML = `<div class="onbtop"><div class="brand" style="margin:0">${SPIDER}<b>Brigade Fantôme</b></div><span class="sp"></span><span class="small mute">${esc(S.profile.discord)}</span><button class="btn ghost" id="lo" style="min-height:36px">Se déconnecter</button></div>
  <main id="mainw" class="onbmain"><div id="alertbar"></div><div id="onbback"></div><div id="main"></div></main>`;
  app.dataset.mode = 'onb';
  try { ONB_OBS?.disconnect(); ONB_OBS = new MutationObserver(() => lockOnb(app)); ONB_OBS.observe(app, { childList: true, subtree: true }); } catch (e) { /* rien */ }
  $('#lo').onclick = async () => { if (confirmBox('Te déconnecter ? Tu pourras reprendre l\'import plus tard.')) { await sb.auth.signOut(); authView(); } };
  return $('#main');
}

/* ---------- Coquille ---------- */
// Cloche : mises à jour du site (news.json). Non lues = id plus grand que le dernier vu (localStorage bfNewsSeen).
const BELL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
let NEWS = null;
const newsSeen = () => { try { return +localStorage.getItem('bfNewsSeen') || 0; } catch (e) { return 0; } };
async function loadNews() { if (NEWS) return NEWS; try { NEWS = await (await fetch(`news.json?v=${APP_V}`)).json(); } catch (e) { NEWS = []; } return NEWS; }
function bellDots() { const seen = newsSeen(); const n = (NEWS || []).filter(x => x.id > seen).length; const k = seen ? n : Math.min(n, 3);
  document.querySelectorAll('[data-bell] .bfdot').forEach(d => { d.hidden = !k; d.textContent = k > 9 ? '9+' : k; }); }
async function initBell() {
  document.querySelectorAll('[data-bell]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); openBell(); });
  await loadNews(); bellDots();
}
async function openBell() {
  await loadNews(); const seen = newsSeen(); const top = NEWS.reduce((a, x) => Math.max(a, x.id), 0);
  const d = document.createElement('div'); d.className = 'modal';
  const fd = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  d.innerHTML = `<div class="modal-card bfnews"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">Quoi de neuf sur le site</h2><button class="btn ghost" data-x aria-label="Fermer" style="min-height:36px">✕</button></div>
    <p class="small mute" style="margin:6px 0 12px">Les améliorations du site, au fil des mises à jour. Une idée ? Pose-la dans la boîte à questions.</p>
    ${NEWS.map(n => `<div class="bfn${seen && n.id > seen ? ' new' : ''}"><div class="small mute">${fd(n.d)}${seen && n.id > seen ? ' · <b class="bfnew">Nouveau</b>' : ''}</div><b>${esc(n.t)}</b><div class="small" style="margin-top:3px;opacity:.85">${esc(n.x)}</div>${n.h ? `<a class="small bfgo" href="${n.h}" data-x>Voir →</a>` : ''}</div>`).join('') || '<div class="empty">Rien pour l\'instant.</div>'}</div>`;
  document.body.appendChild(d);
  const close = () => d.remove(); d.onclick = e => { if (e.target === d || e.target.closest('[data-x]')) close(); };
  try { localStorage.setItem('bfNewsSeen', top); } catch (e) { /* rien */ } bellDots();
}

// Fusion Collection Prestige → Ma collection (aperçu admin avec ?fusion tant que FUSION_LIVE est false).
const FUSION_LIVE = true;
const FUS = () => FUSION_LIVE || (S.profile?.role === 'admin' && new URLSearchParams(location.search).has('fusion'));
const CG_LIVE = true;
const CGV2 = () => CG_LIVE || (S.profile?.role === 'admin' && new URLSearchParams(location.search).has('cgv2'));
const memHref = id => FUS() ? '#collection/L/m:' + id : '#checklist/m:' + id;
function shell(route) {
  const isAdmin = S.profile.role === 'admin';
  const links = ROUTES.filter(r => !(FUS() && r[0] === 'checklist')).map(r => r[0] === 'sep' ? `<div class="sep">${r[1]}</div>` : `<a href="#${r[0]}" class="${route === r[0] ? 'on' : ''}">${ico(r[2])}${r[1]}</a>`).join('')
    + (isAdmin ? `<div class="sep">Admin</div><a href="#admin" class="${route === 'admin' ? 'on' : ''}">${ico('shield')}Administration</a>` : '');
  app.innerHTML = `<div class="top"><button class="btn" id="mn" aria-label="Menu">☰</button><div class="brand" style="margin:0">${SPIDER}<b>Brigade Fantôme</b></div><span class="sp"></span><button class="bfbell" data-bell aria-label="Mises à jour du site">${BELL}<i class="bfdot" hidden></i></button></div>
  <div class="shell"><aside class="side" id="side"><div class="brand">${SPIDER}<b>Brigade Fantôme</b></div><nav class="nav">${links}</nav>
  <div class="me"><div class="mute small">Connecté</div><b>${esc(S.profile.discord)}</b><div class="row" style="margin-top:8px;gap:6px"><a class="btn ghost" href="#reglages" style="min-height:36px">⚙️ Réglages</a><button class="btn ghost" id="lo" style="min-height:36px">Se déconnecter</button></div></div></aside>
  <main id="mainw"><button class="bfbell dsk" data-bell aria-label="Mises à jour du site">${BELL}<i class="bfdot" hidden></i></button><div id="alertbar"></div><div id="main"></div></main></div>`;
  app.dataset.mode = 'full'; try { ONB_OBS?.disconnect(); } catch (e) { /* rien */ }
  initBell();
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
    <h1 style="margin-top:12px">Bienvenue dans le repaire, ${esc(S.profile.discord)}</h1>${S.profile.nen ? `<p style="margin:6px 0 0"><span class="chip">🕷 Rôle Nen : ${esc(S.profile.nen)}${S.profile.level != null ? ' · niveau ' + S.profile.level : ''}</span> <span class="small mute">Gagne de l'XP en étant actif sur le Discord.</span></p>` : ''}
    <p class="mute">Tout ce qu'il faut pour progresser sur YURO : guides, fiches des LR, calculateurs, prix réels du marché et Kakashi pour répondre à tes questions.</p>
    <div class="row" style="margin-top:14px"><a class="btn primary" href="#kakashi">${ico('bot')} Demander à Kakashi</a><a class="btn" href="#prix">${ico('chart')} Voir les prix</a></div></section>
    ${standalone() ? '' : `<div class="card section installcard"><div class="row"><div style="flex:1;min-width:220px"><b>📲 Installer le site comme une app</b><div class="small mute">${isIOS() ? 'Sur iPhone : touche <b>Partager</b> (le carré avec une flèche) puis <b>Sur l\'écran d\'accueil</b>. Ouvre ensuite la Brigade depuis l\'icône : c\'est aussi obligatoire pour recevoir les alertes sur iPhone.' : 'Une icône sur ton écran d\'accueil, le site en plein écran et les alertes du marché comme une vraie app. Si le bouton n\'apparaît pas : menu du navigateur (⋮) → <b>Installer l\'application</b> ou <b>Ajouter à l\'écran d\'accueil</b>.'}</div></div>${isIOS() ? '' : '<button class="btn primary" id="inst" style="display:none">Installer</button>'}</div></div>`}
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

// Seuils d'Aya (calculés pour chaque niveau d'étoiles) + % de victoires par fourchette (mesurés 23/11, relatifs aux seuils).
function castleReal() {
  const aya = (S.kb?.cards || []).find(c => c.id === 953);
  const A = r => towerAt(null, r).atk;
  const seuils = k => { const H = statsAt(aya, k).hp; let s1 = 1; while (s1 < 5000 && A(s1) * 2 < H) s1++; let s2 = 1; while (s2 < 5000 && A(s2) * 2 < H + Math.round(H * .3)) s2++; return { H, s1, s2 }; };
  const st = aya ? [0, 1, 2, 3, 4, 5].map(k => ({ k, ...seuils(k) })) : [];
  const rows = [['Avant le 1er seuil', '15 à 25 %', 'Boucle confortable : Aya encaisse 2 coups sans soin'], ['Du 1er seuil au 2e seuil', '2 à 3,5 %', 'Aya ne survit à 2 coups que si le soin tombe au bon moment'], ['2e seuil et au-delà', '0 %', 'Aya meurt au 2e coup même soignée : boucle impossible']];
  return `<div class="card section"><h2>Les deux seuils d'Aya</h2>
  <p><b>C'est quoi un seuil ?</b> Plus tu montes dans le château, plus les gardiens tapent fort (tous les 10 chambres : environ +49 PV et +11 d'attaque par gardien), alors que tes cartes plafonnent à 5★. Toute la boucle repose sur une chose : Aya doit <b>encaisser 2 coups de gardien</b> sans mourir, le temps que son échange (ou le soin) soit prêt. Un seuil, c'est le <b>numéro de chambre à partir duquel ça ne passe plus</b>.</p>
  <ul class="list"><li><b>1er seuil, « mort en 2 coups sans soin » :</b> à partir de cette chambre, un coup de gardien enlève la moitié des PV d'Aya (ou plus). Deux coups = Aya morte. Sans soigneur dans l'équipe, la boucle s'arrête ici. Avec un soigneur, ça passe encore, mais seulement si le soin tombe entre les deux coups.</li>
  <li><b>2e seuil, « mort en 2 coups même soignée » :</b> à partir de cette chambre, deux coups de gardien font plus de dégâts que les PV d'Aya + un soin de 30 %. Même soignée au bon moment, elle meurt : la boucle est impossible.</li>
  <li><b>Exemple :</b> Aya 5★ a 1 488 PV, son soin de 30 % rend 446 PV. Chambre 852 : coup de 966, soin, coup de 966 → il lui reste <b>2 PV</b>, elle survit. Chambre 853 : 2 × 967 = 1 934 = 1 488 + 446 → <b>0 PV</b>, elle meurt. Sa limite avec soigneur est donc la chambre 852. Sans soin : chambre 649 (2 × 742 → 4 PV), morte à la 650 (2 × 744 = 1 488).</li>
  <li><b>La règle :</b> il suffit qu'il reste 1 PV pour survivre. À 0 PV, la carte est morte.</li>
  <li>Les limites ne dépendent que des PV d'Aya, donc de ses étoiles. Trouve ta ligne :</li></ul>
  ${st.length ? `<table class="tbl"><thead><tr><th>Aya</th><th class="n">PV</th><th class="n">Sans soigneur : jouable jusqu'à</th><th class="n">Avec soigneur : jouable jusqu'à</th></tr></thead><tbody>${st.map(x => `<tr><td>${x.k}★</td><td class="n">${fmt(x.H)}</td><td class="n">Chambre ${x.s1 - 1}</td><td class="n"><b>Chambre ${x.s2 - 1}</b></td></tr>`).join('')}</tbody></table>` : ''}
  <h3 style="margin-top:14px">Chances de victoire par fourchette de chambres</h3>
  <table class="tbl"><thead><tr><th>Fourchette</th><th class="n">Victoires</th><th>Ce qui se passe</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
  <p class="small mute">Prends les seuils de ta ligne d'étoiles dans le tableau du dessus. Pourcentages mesurés avec une boucle Aya + soigneur + tank (combats simulés avec les règles du jeu, et 150 combats réels juste après le 1er seuil : 3 victoires, soit 2 %). Sans soigneur, la boucle s'arrête au 1er seuil.</p>
  <ul class="list"><li>Une défaite ne coûte rien : le record est conservé et chaque nouvel essai tire de nouvelles cibles. Entre les deux seuils, compte une cinquantaine d'essais par chambre.</li>
  <li>Le hasard des cibles des gardiens décide de presque tout : la même boucle gagne ou perd selon qui est visé au mauvais moment.</li>
  <li>Pour monter plus haut, ce sont les PV qui comptent : chaque étoile d'Aya (+8 % de PV) repousse les deux seuils.</li>
  <li>Une seule carte par rôle : Aya et Janemba sont tous les deux <b>Polyvalence</b>, ils ne peuvent pas être dans la même équipe.</li>
  <li>Tes seuils exacts, avec tes étoiles, se lisent aussi dans les <a href="#calculs">Calculateurs</a> (Two-shot).</li></ul></div>`;
}

// Guide château : la meilleure équipe SANS Aya et sa boucle (25/11, moteur du jeu, 5 330 équipes testées). Brouillon visible par l'admin avec ?brouillon tant que Nicolas n'a pas validé.
const CASTLE_NOAYA_LIVE = true;
function noAyaBlock() {
  // Résultats 25/11, moteur du jeu, gardiens tirés dans tout le catalogue, cartes à 5★ (sauf mention).
  const T = [
    ['Xebec · Makima · Chrollo', 'Xebec → Chrollo → Makima', 482, 624, 658, 733, 'SKILL HUNTER au 1er tour : un gardien sans technique perd 25 % de son attaque pour tout le combat, et Chrollo la gagne.'],
    ['Xebec · Makima · All For One', 'Xebec → All For One → Makima', 444, 620, 667, 669, 'ALTER au 1er tour : All For One gagne +25 % d\'attaque, mais le gardien ne perd rien. Moins fort que Chrollo, qui affaiblit aussi le gardien (−25 % pour tout le combat) : prends Chrollo si tu l\'as.'],
    ['Xebec · Makima · Mihawk', 'Xebec → Makima → Mihawk', 444, 640, 641, 669, 'Lame noire (recharge 3) : 1,2× sur la cible, 0,5× sur les 2 autres, puis la cible est marquée 2 tours : +30 % de dégâts sur les attaques et techniques de tes cartes contre elle. Exception : la Domination de Makima n’en profite pas, car c’est le gardien qui se frappe lui-même.'],
    ['Xebec · Makima · Lelouch', 'Xebec → Makima → Lelouch', 439, 493, 638, 680, 'GEASS : la prochaine attaque qu\'il reçoit (≈ 700) est renvoyée au gardien. Défense et dégâts en même temps.'],
    ['Xebec · Makima · Janemba', 'Xebec → Makima → Janemba', 547, 551, 639, 669, 'DIMENSION 1,6× et 2 esquives au premier lancement seulement : la plus sûre jusqu\'à ~550.']];
  const step = (n, t, d) => `<div class="nastep"><b class="nan">${n}</b><div><b>${t}</b><div class="small mute">${d}</div></div></div>`;
  return `<details class="card section noaya"><summary class="nasum"><span>Vous n'avez pas Ayanokouji&nbsp;? 👇🏼</span><small class="mute">La boucle Xebec · Makima · 3e carte</small></summary><div class="nabody">
    <p class="mute">Les meilleures équipes sans Ayanokouji parmi les 5 330 possibles, vérifiées une par une avec le moteur du jeu : toutes reposent sur <b>Xebec + Makima</b>. On n'échange pas de PV : on <b>annule</b> les coups avec le Haki, on <b>retourne</b> un gardien contre lui-même avec la Domination, et la 3e carte affaiblit ou marque les gardiens.</p>
    <div class="nasteps">
      ${step(1, 'Xebec ouvre : HAKI', 'Toujours en premier dès qu\'il est prêt (tous les 3 tours) : la prochaine attaque sur chacune de tes 3 cartes est annulée.')}
      ${step(2, 'La 3e carte (vol, marque ou miroir)', 'Chrollo vole 25 % de l\'attaque d\'un gardien au 1er tour : le gardien tape 25 % moins fort et Chrollo 25 % plus fort (une fois par combat) ; All For One ne fait que la 2e moitié (+25 % pour lui, le gardien ne perd rien) ; Mihawk marque la cible (+30 % de dégâts reçus 2 tours) ; Lelouch renvoie une seule attaque. Voir l\'ordre exact de chaque équipe plus bas.')}
      ${step(3, 'Makima : DOMINATION', 'Sur le gardien que tu tapes, <b>avant qu\'il ait riposté ce tour</b> : il se frappe pour 1,5× son attaque et reste figé, donc il perd sa riposte.')}
      ${step(4, 'Focus', 'Les 3 cartes tapent le même gardien, le plus bas, jusqu\'à sa mort. Techniques relancées dès qu\'elles sont prêtes, dans le même ordre.')}
      ${step(5, 'Le dernier gardien', 'Garde la Domination pour l\'achever : 1,5× son attaque finit souvent les derniers PV.')}
    </div>
    <div class="nateams">${T.map(r => `<div class="nateam"><b>${r[0]}</b><div class="small" style="color:var(--blood2);margin-top:2px">🎯 ${r[1]}</div><div class="small mute" style="margin-top:4px">${r[6]}</div><div class="nag"><div><small>Sûre 90 %</small><b>${r[2]}</b></div><div><small>Jouable 50 %</small><b>${r[3]}</b></div><div><small>Max 20 %</small><b>${r[4]}</b></div><div class="r"><small>Plafond</small><b>${r[5]}</b></div></div></div>`).join('')}</div>
    <p class="small mute" style="margin:8px 0 0">Avec moins d'étoiles (Xebec 4★, Makima 4★) : Janemba 5★ → max 619, plafond 629 · Chrollo 3★ → jouable 568, max 572, plafond 672 · Mihawk 3★ → jouable 565, max 589. Vérifié avec un vrai joueur de la guilde : Xebec 4★ / Janemba 5★ / Makima 4★ a passé la chambre 628, notre plafond. Escanor et Xebec ont le même rôle (tank) : ils ne vont pas ensemble, et sans Xebec Escanor plafonne vers 500-570.</p></div></details>`;
}

P.guide = (m, key) => {
  if (key === 'eveil') return evoGuide(m); if (key === 'raids') return raidGuide(m); if (key === 'roles') { location.hash = '#persos'; return; }
  const g = S.kb.guides?.[key]; if (!g) { m.innerHTML = '<div class="empty">Guide introuvable.</div>'; return; }
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guide</span><h1 style="margin-top:12px">${esc(g.title)}</h1></section>
    ${key === 'temps' ? tempsCalc() : ''}
    ${key === 'chateau' && (CASTLE_NOAYA_LIVE || (S.profile.role === 'admin' && new URLSearchParams(location.search).has('brouillon'))) ? noAyaBlock() : ''}
    ${key === 'chateau' ? castleWidget() + `<div class="card section"><h2 class="ctitle">Les boucles d'Aya</h2><p class="focusnote"><b>Le focus :</b> tout le monde tape le même gardien tant que l'échange n'est pas fait. Dès qu'un gardien est échangé, on l'achève en priorité, puis on revient au gardien de départ.</p><div class="loops">${loopSVG(false)}${loopSVG(true)}</div>
      <div class="wzc"><h3 style="margin-top:16px">Boucle de secours sans soigneur (après le 1er seuil)</h3>
      <p class="small">Elle permet de <b>repousser le plafond de la boucle sans soigneur</b> et d'aller chercher <b>quelques chambres de plus</b> après le 1er seuil, là où la boucle normale ne gagne plus.</p>
      <p class="small"><b>Uniquement si l'équipe n'a aucun soigneur</b> (ni Seiichi ni Rimuru), et seulement <b>après le 1er seuil</b>, quand Aya meurt en 2 coups. Avant le seuil, ou avec un soigneur, joue les boucles du dessus : celle-ci y fait moins bien.</p>
      <div class="loops">${loopSVG('wz')}</div>
      <ol class="list small"><li>Aya encaisse un coup.</li><li>Elle échange avec un gardien <b>pas plein</b> qui lui laisse de quoi encaisser <b>un coup de plus</b> (ex. Aya 3★ : 1 318 PV, gardien à 60 % → Aya remonte à 790 PV et l'échangé tombe à son ancien pourcentage).</li><li>Elle encaisse ce coup de plus (790 → 130 PV) et doit <b>tenir</b> jusqu'à ce que son échange soit de nouveau prêt (4 tours de recharge) : il faut que les gardiens visent les autres cartes.</li><li>2e échange avec un gardien <b>plein</b>, Aya au plus bas : le gardien tombe presque à 0, on l'achève.</li></ol>
      <p class="small"><b>Chances de réussite :</b> environ <b>5 à 7 % de victoires par essai</b> juste après le seuil (chambres seuil +4 à seuil +20 ; ex. Aya 3★ / Makima 3★ / Xebec 4★ : 6 % à la 576, 7 % à la 580, 5 % à la 590, 0 % à la 600), d'après nos simulations avec le moteur du jeu. C'est donc <b>une grosse part de hasard</b> : tout dépend du fait qu'Aya survive assez longtemps pour récupérer son 2e échange, c'est-à-dire que les gardiens ne la visent pas au mauvais moment. Une défaite ne coûte rien : compte 15 à 20 essais par chambre.</p></div></div>${castleReal()}` : ''}
    ${g.sections.filter(s => !(key === 'chateau' && /mur des 500/i.test(s.h))).map(s => `<div class="card section"><h2>${esc(s.h)}</h2>${(s.p || []).map(x => `<p>${esc(x)}</p>`).join('')}${s.list ? `<ul class="list">${s.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}`;
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
const GEN = { c: ['Commune', 150, 29], r: ['Rare', 201, 40], e: ['Épique', 269, 54], l: ['Légendaire', 356, 75], m: ['Mythique', 648, 121] };
function tempsCalc() {
  return `<div class="card section"><h2>Calculateur de farm</h2><p class="mute small">Choisis ton équipe de farm et la durée : le site calcule ton KI par minute en simulant tes combats de la salle (formule exacte des gardiens), calé sur nos mesures en jeu, puis estime le KI, les boosters et ta chance d'avoir au moins une LR.</p>
  <label>Ton équipe de farm</label><div class="row picks" id="tp" style="margin:6px 0 12px"></div>
  <div class="grid" style="margin-bottom:12px"><div><div class="mute small">KI par minute (mesure simulée)</div><div class="cd" id="tk">—</div></div><div><div class="mute small">Durée d'un combat</div><div class="cd" id="tf">—</div></div></div>
  <div class="row"><div style="flex:1;min-width:80px"><label for="td">Jours</label><input id="td" type="number" min="0" value="0"></div><div style="flex:1;min-width:80px"><label for="th">Heures</label><input id="th" type="number" min="0" value="8"></div><div style="flex:1;min-width:80px"><label for="tn">Minutes</label><input id="tn" type="number" min="0" value="0"></div></div>
  <p class="small mute" id="tmh" style="margin-top:8px"></p><div id="to" class="calcout"></div>
  <p class="small mute" style="margin-top:12px">Ce sont des estimations, pas des garanties : le rythme varie selon la vitesse du serveur, et les boosters et les LR dépendent du hasard des taux de drop. Base : Replay auto + vitesse ×2, +${TEMPS.kiWin} KI par victoire, booster dans ${TEMPS.p * 100} % des victoires et garanti au ${TEMPS.pity}e combat sans booster (≈ 1 booster toutes les ${winsPerBooster.toFixed(1).replace('.', ',')} victoires).</p></div>`;
}
function bindTemps() {
  let team = [];
  const unit = v => { if (!v) return null; if (v[0] === 'g') { const g = GEN[v[1]]; return { id: -1, n: g[0] + ' 0★', hp: g[1], atk: g[2], k: v[1] === 'm' ? { k: 'hit', m: 1.8, cd: 3 } : { k: 'none' } }; } const c = LRS().find(x => x.id === +v); if (!c) return null; const st = S.mylr?.cards?.[c.id] || 0; const s = statsAt(c, st); return { id: c.id, n: `${c.n} ${st}★`, hp: s.hp, atk: s.atk }; };
  const opts = sel => { const own = S.mylr?.cards || {}; const L = LRS().filter(c => own[c.id] != null);
    return `<option value="">— vide —</option><optgroup label="Cartes peu chères (0★)">${Object.entries(GEN).map(([k, g]) => `<option value="g${k}" ${sel === 'g' + k ? 'selected' : ''}>${g[0]} 0★</option>`).join('')}</optgroup>${L.length ? `<optgroup label="Mes LR">${L.map(c => `<option value="${c.id}" ${sel === String(c.id) ? 'selected' : ''}>${esc(c.n)} ${own[c.id] || 0}★</option>`).join('')}</optgroup>` : ''}`; };
  const f = () => { const T = team.map(unit).filter(Boolean); const min = (+$('#td').value || 0) * 1440 + (+$('#th').value || 0) * 60 + (+$('#tn').value || 0);
    if (!T.length) { $('#tk').textContent = '—'; $('#tf').textContent = '—'; $('#to').innerHTML = ''; return; }
    const r = farmRate(T); const k = r.ki;
    $('#tk').textContent = fmt(k); $('#tf').textContent = r.secPerFight.toFixed(1).replace('.', ',') + ' s';
    const veg = T.some(u => u.id === 1083), lr = T.filter(u => u.id > 0 && u.id !== 1083).length;
    $('#tmh').textContent = r.winRate < .95 ? `Attention : ton équipe perd ${Math.round((1 - r.winRate) * 100)} % de ses combats, et une défaite ne rapporte rien.` : veg ? 'Vegeta en tête : son EXPLOSION FINALE met les 3 gardiens K.O. d\'un coup. C\'est la meilleure équipe de farm.' : lr ? 'Des LR dans l\'équipe : les gardiens prennent leurs PV, les combats sont plus longs et les techniques plus lentes. Des Communes 0★ farment plus vite.' : 'Les gardiens s\'adaptent à ton équipe : des cartes faibles finissent vite les combats. Avec Vegeta en tête, tu ferais environ +67 %.';
    const ki = k * min, wins = ki / TEMPS.kiWin, bo = wins / winsPerBooster, p = 1 - Math.pow(1 - TEMPS.lrPerBooster, bo);
    $('#to').innerHTML = `<div><div class="mute small">KI gagné</div><div class="cd">${fmt(Math.round(ki))}</div></div><div><div class="mute small">Victoires</div><div class="cd">${fmt(Math.round(wins))}</div></div><div><div class="mute small">Boosters gagnés</div><div class="cd">≈ ${fmt(Math.round(bo))}</div></div><div><div class="mute small">Chance d'au moins 1 LR</div><div class="cd">${p < .1 ? (p * 100).toFixed(1).replace('.', ',') : Math.round(p * 100)} %</div></div>`; };
  const draw = () => { $('#tp').innerHTML = [0, 1, 2].map(i => `<select data-slot="${i}" aria-label="Carte ${i + 1}">${opts(team[i] || '')}</select>`).join(''); $('#tp').querySelectorAll('select').forEach(sl => sl.onchange = () => { team[+sl.dataset.slot] = sl.value; f(); }); f(); };
  ['#td', '#th', '#tn'].forEach(id => $(id).oninput = f);
  team = ['gc', 'gc', 'gc']; draw();
  loadMyLR().then(() => { if (S.mylr?.cards?.[1083] != null) team = ['1083', 'gc', 'gc']; draw(); }).catch(() => {});
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
    <p class="small mute" style="margin:10px 0 0">Touche une carte pour voir ses techniques.</p><div class="pgrid4" id="cl" style="margin-top:10px"></div>`;
  let desc = true;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), rf = $('#rf').value, st = +$('#st').value, so = $('#so').value;
    let list = (tab === 'lr' ? LR : tab === 'ex' ? EX : TR).filter(c => (!q || (c.n + ' ' + c.a).toLowerCase().includes(q)) && (!rf || c.c === rf)).map(c => ({ c, s: statsOf(c, st) }));
    const key = x => so === 'atk' ? x.s.atk : so === 'hp' ? x.s.hp : x.s.hp + x.s.atk;
    if (so) list.sort((a, b) => desc ? key(b) - key(a) : key(a) - key(b));
    const full = ({ c, s }, i) => {
      const p = S.prices.find(x => x.card === c.n); const iu = c.ex ? c.img : lrImg(c);
      return `<div class="card pcard">${iu ? `<div class="pimg"><img loading="lazy" src="${iu}" alt="${esc(c.n)}"></div>` : ''}<div class="row"><span class="chip ${c.r === 'Transcendant' ? 'warn' : 'red'}">${c.ex ? 'EX' : c.r || 'LR'}</span>${c.c ? `<span class="chip">${ROLE[c.c] || c.c}</span>` : ''}${c.p ? '<span class="chip">Éveil</span>' : ''}</div>
      <h3 style="margin-top:10px">${esc(c.n)}</h3><div class="mute small">${esc(c.a)}</div>
      <div class="row" style="margin:10px 0"><span><b>${fmt(s.hp)}</b> <span class="mute small">PV</span></span><span><b>${fmt(s.atk)}</b> <span class="mute small">ATQ</span></span>${so === 'hyb' ? `<span class="small mute">= ${fmt(s.hp + s.atk)}</span>` : ''}${p ? `<span class="sp"></span><span class="small bone">${fmt(p.median)} KI</span>` : ''}</div>
      ${(c.t || []).map(t => `<div class="tech"><b>${esc(t[0])}</b><div class="small mute">${esc(t[1])}</div></div>`).join('') || '<div class="small mute">Pas de technique spéciale.</div>'}</div>`;
    };
    $('#cl').innerHTML = list.map(({ c, s }, i) => { const iu = c.ex ? c.img : lrImg(c); return `<button class="pmini" data-i="${i}">${iu ? `<img loading="lazy" src="${iu}" alt="">` : '<div class="noimg" style="aspect-ratio:3/3.8"></div>'}<span class="pm-r">${c.ex ? 'EX' : c.r === 'Transcendant' ? 'TR' : 'LR'}</span>${so ? `<span class="rank">${i + 1}</span>` : ''}<span class="pm-b"><b>${esc(c.n)}</b><small>${fmt(s.hp)} PV · ${fmt(s.atk)} ATQ</small></span></button>`; }).join('') || '<div class="empty">Aucune carte.</div>';
    $('#cl').querySelectorAll('.pmini').forEach(b => b.onclick = () => { const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="mbox">${full(list[+b.dataset.i], +b.dataset.i)}<div class="row" style="margin-top:12px"><button class="btn ghost" data-x>Fermer</button></div></div>`; d.onclick = e => { if (e.target === d || e.target.closest('[data-x]')) d.remove(); }; document.body.appendChild(d); });
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
  <div class="card section"><h2>Two-shot</h2><p class="mute small">Dernière chambre où ta carte survit à 2 coups de gardien <b>avec au moins 1 PV</b> (à 0 PV, elle est morte) : sans soin, et avec un soin de 30 % entre les deux coups (Seiichi ou Rimuru). C'est la limite de la boucle ; la chambre que ton équipe atteint vraiment se lit dans <a href="#equipe/chateau">Meilleure équipe</a> (combats simulés).</p>
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
    $('#o2').innerHTML = `<p>Chambre <b>${r}</b> : un gardien a <b>${fmt(towerAt(null, r).hp)}</b> PV et tape <b>${fmt(atk)}</b>. ${esc(c.n)} ${s}★ a <b>${fmt(hp)}</b> PV${heals ? ` et reçoit ${heals} soin${heals > 1 ? 's' : ''} de 30 % entre les coups` : ''} : elle meurt au <b class="red">${n}e coup</b>.${after2 > 0 ? ` Après 2 coups il lui reste <b>${fmt(after2)} PV</b> (${(after2 / hp * 100).toFixed(1).replace('.', ',')} %).` : ''}</p>`; };
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
  m.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h1 style="margin:0">Prix marché</h1><span class="live" title="Mis à jour en direct"><i></i>EN DIRECT</span></div>
    <p class="mute">Ventes réelles du marché (LR classiques), calculées comme le guide des prix : <b class="bone">médiane</b>, <b class="bone">bon prix</b> (bonne affaire) et <b class="bone">max conseillé</b> (au-delà tu paies trop cher). La tendance compare les 7 derniers jours à la semaine d'avant. Touche une carte pour voir sa courbe.</p>
    <div class="row"><input id="q" placeholder="Rechercher une carte" style="flex:1;min-width:200px"><div class="tabs" style="margin:0" id="wn">${['24h', '7j', '30j'].map(w => `<button data-w="${w}" class="${w === win ? 'on' : ''}">${w}</button>`).join('')}</div></div>
    <div class="tablewrap" style="margin-top:14px"><table><thead><tr><th data-k="card">Carte</th><th class="n" data-k="median">Médiane</th><th class="n hide-sm" data-k="good">Bon prix</th><th class="n hide-sm" data-k="max">Max conseillé</th><th class="n" data-k="trend">Tendance 7 j</th><th class="hide-sm">7 jours</th><th class="n hide-sm" data-k="sales">Ventes</th></tr></thead><tbody id="tb"></tbody></table></div><details class="card section cmpbox"><summary><b>Comment lire ces prix ?</b></summary><div class="small" style="margin-top:8px;line-height:1.6"><p><b>Cote (médiane)</b> : le prix habituel. Sur les vraies ventes des 7 derniers jours, la moitié s’est vendue plus cher, l’autre moitié moins cher.</p><p><b>Bon prix</b> : un prix bas mais réaliste. On classe les ventes des 7 derniers jours du moins cher au plus cher : 25 % des ventes se sont faites à ce prix ou moins (arrondi au millier). Ce n’est pas une moyenne.</p><p><b>Max conseillé</b> : au-dessus, 75 % des ventes se sont faites moins cher : tu paies trop.</p><p><b>Écart</b> : de combien l’annonce la moins chère dépasse le bon prix. 0 % ou moins (en vert) : vraie bonne affaire. Une carte à +15 % peut encore être sous sa cote.</p><p class="mute">Seules les vraies ventes comptent (pas les prix affichés des annonces). Les versions prestige ne sont pas comptées.</p></div></details>
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

/* ---------- Dernières transactions (comme le comptoir du jeu, LR + UR évo, 24 h) ---------- */
P.transactions = async m => {
  let mode = 'all', card = '', rows = [];
  await loadAlerts().catch(() => {});
  m.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h1 style="margin:0">Dernières transactions</h1><span class="live" title="Mis à jour en direct"><i></i>EN DIRECT</span></div><p class="mute">Toutes les ventes réelles des 24 dernières heures sur les LR et les UR d'évolution, comme le comptoir du jeu : heure, carte, prix, vendeur et acheteur. La plus récente en haut.</p>
    <div class="row"><div class="tabs" style="margin:0" id="txm"><button data-m="all" class="on">Toutes</button><button data-m="al">Mes alertes${S.alerts?.length ? ` (${S.alerts.length})` : ''}</button></div>
    <input id="txq" list="txcards" placeholder="Une carte en particulier" style="flex:1;min-width:200px"><datalist id="txcards"></datalist></div>
    <div id="txl" class="section"><div class="empty">Chargement…</div></div>
    <p class="small mute">Les pseudos viennent du comptoir du marché, relevé toutes les 15 secondes depuis le 25/11 au soir. Les ventes plus anciennes peuvent rester « non relevé ». Les versions prestige ne sont pas comptées.</p>`;
  const img = r => r.img || lrImg({ n: r.card }) || '';
  const hh = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dd = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const draw = () => {
    const q = card.trim().toLowerCase(), al = new Set((S.alerts || []).map(a => String(a.card).toLowerCase()));
    const list = rows.filter(r => (!q || r.card.toLowerCase().includes(q)) && (mode !== 'al' || al.has(r.card.toLowerCase())));
    $('#txl').innerHTML = !list.length ? `<div class="empty">${mode === 'al' && !al.size ? "Tu n'as pas encore d'alerte : crée-en dans « Alertes marché »." : 'Aucune vente sur 24 h pour ce filtre.'}</div>` :
      `<div class="txlist">${list.map(r => { const d = new Date(r.sold_at); return `<div class="txrow"><div class="txt"><b>${hh(d)}</b><span>${dd(d)}</span></div>${img(r) ? `<img src="${esc(img(r))}" alt="" loading="lazy">` : '<i class="txi"></i>'}<div class="txc"><b>${esc(r.card)}</b><span>${r.rarity === 'Mythique' ? 'UR évolution' : 'LR'}</span></div><div class="txp">${fmt(r.price)} <small>ki</small></div><div class="txw"><span><small>Vendeur</small>${r.seller ? '@' + esc(r.seller) : '<i class="mute" title="Pseudo non relevé sur le comptoir du marché">non relevé</i>'}</span><span><small>Acheteur</small>${r.buyer ? '@' + esc(r.buyer) : '<i class="mute" title="Pseudo non relevé sur le comptoir du marché">non relevé</i>'}</span></div></div>`; }).join('')}</div>`;
  };
  const load = async () => { const since = new Date(Date.now() - 864e5).toISOString(); const { data } = await sb.from('tx').select('card,rarity,img,price,sold_at,buyer,seller').gte('sold_at', since).order('sold_at', { ascending: false }).limit(1000); rows = data || [];
    const dl = $('#txcards'); if (dl) dl.innerHTML = [...new Set(rows.map(r => r.card))].sort((a, b) => a.localeCompare(b)).map(c => `<option value="${esc(c)}">`).join(''); if ($('#txl')) draw(); };
  $('#txm').querySelectorAll('button').forEach(b => b.onclick = () => { mode = b.dataset.m; $('#txm').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#txq').oninput = e => { card = e.target.value; draw(); };
  await load(); S.timers.push(setInterval(load, 30000));
};

/* ---------- Jouer un match ranked (simulateur jouable + analyse de chaque coup) ---------- */
// Écran de combat du jeu dans un cadre (iframe) : les cinématiques du jeu y fonctionnent comme dans le jeu.
function loadBattleFrame(host) {
  if (host.__bfW && host.__bfW.__bfReady) return Promise.resolve(host.__bfW);
  return new Promise((ok, ko) => {
    host.innerHTML = ''; const f = document.createElement('iframe'); f.className = 'cs-frame'; f.title = 'Combat'; f.setAttribute('allow', 'fullscreen; autoplay'); f.setAttribute('allowfullscreen', ''); f.src = 'battle-frame.html?v=' + APP_V; host.appendChild(f);
    const t0 = Date.now();
    const chk = () => { const W = f.contentWindow; if (W && W.__bfReady && W.BFDuel) { host.__bfW = W; window.BFCastle = W.BFCastle; window.BFDuel = W.BFDuel; W.__bfNotify = m => toast(m);
        // Hauteur fixe : l'écran de combat du jeu se cale sur la hauteur de la fenêtre (vh), une hauteur automatique le ferait grandir sans fin.
        const fit = () => { f.style.height = Math.round(Math.min(980, Math.max(600, window.innerHeight - 40))) + 'px'; }; fit(); window.addEventListener('resize', fit); ok(W); }
      else if (Date.now() - t0 > 25000) ko(new Error('timeout')); else setTimeout(chk, 120); };
    chk();
  });
}
// Choix d'une carte (illustration + nom + étoiles), partagé par les simulateurs.
function pickRow(ALL, lab, p, i, id, list, sp) {
  const c = ALL.find(x => x.id === id) || ALL[0], sid = (sp || p + 's') + i, im = c.ex ? c.img : lrImg(c);
  return `<div class="pl-pick"><img class="pl-thumb" data-thumb="${p}${i}" src="${esc(im || '')}" alt="" loading="lazy"><div class="pl-pick-f"><label for="${p}${i}">Carte ${i + 1}</label><input id="${p}${i}" list="${list}" value="${esc(lab(c))}" autocomplete="off" data-pick></div><div class="pl-pick-s"><label for="${sid}">Étoiles</label><select id="${sid}">${[0, 1, 2, 3, 4, 5].map(s => `<option value="${s}" ${s === 5 ? 'selected' : ''}>${s}★</option>`).join('')}</select></div></div>`;
}
function bindPicks(root, byName, lab) {
  root.querySelectorAll('input[data-pick]').forEach(inp => inp.addEventListener('input', () => { const c = byName.get(inp.value.trim().toLowerCase()), im = root.querySelector(`[data-thumb="${inp.id}"]`); inp.classList.toggle('bad', !c && inp.value.trim().length > 0); if (im && c) im.src = c.ex ? c.img : lrImg(c); }));
}
P.simulateur = m => {
  const EXS = (S.kb.ex_cards || []).filter(c => c.r === 'Exclusive').map(c => ({ ...c, ex: true }));
  const ALL = [...(S.kb.cards || []), ...EXS];
  const cnt = {}; ALL.forEach(c => cnt[c.n] = (cnt[c.n] || 0) + 1);
  const lab = c => cnt[c.n] > 1 ? `${c.n} (${c.ex ? 'Exclusive' : c.p ? 'prestige' : c.r || 'LR'} #${c.id})` : c.n;
  const byName = new Map(ALL.map(c => [lab(c).toLowerCase(), c]));
  const stOf = (c, st) => c.ex ? { hp: c.st[st][0], atk: c.st[st][1] } : statsAt(c, st);
  const rar = c => c.ex ? 'Exclusive' : c.r === 'Transcendant' ? 'Transcendant' : 'Secret';
  const def = [[1070, 3248, 3247], [308, 1070, 128]];
  const slot = (p, i, id) => pickRow(ALL, lab, p, i, id, 'plCards');
  m.innerHTML = `<h1>Jouer un match ranked</h1><p class="mute">Le vrai combat du jeu : même écran de duel, mêmes techniques (RAGE de Broly, HOLLOW PURPLE, Haki de Roger et de Xebec…) et mêmes animations. Choisis les deux équipes (n'importe quelles cartes, n'importe quelles étoiles), puis jouez chacun votre tour. Chaque coup est analysé par le coach : bon coup, imprécision ou erreur, avec la raison. Les flèches ‹ › te ramènent à n'importe quel coup pour en essayer un autre.</p>
  <datalist id="plCards">${ALL.map(c => `<option value="${esc(lab(c))}">`).join('')}</datalist>
  <div id="plSetup"><div class="pl-vs"><div class="card pl-teamcard"><h2>Ton équipe</h2>${def[0].map((id, i) => slot('a', i, id)).join('')}</div><div class="pl-vsmark" aria-hidden="true">VS</div>
  <div class="card pl-teamcard"><h2>Équipe adverse</h2>${def[1].map((id, i) => slot('b', i, id)).join('')}</div></div>
  <div class="card section"><div class="pl-row"><div class="pl-slot"><label for="plStart">Qui commence</label><select id="plStart"><option value="0">Moi</option><option value="1">L'adversaire</option><option value="r">Au hasard</option></select></div>
  <div class="pl-slot"><label for="plMode">L'adversaire est joué par</label><select id="plMode"><option value="fort">L'ordinateur fort (coups du coach)</option><option value="ia">L'ordinateur simple</option><option value="moi">Moi (je joue les deux camps)</option></select></div>
  <div class="pl-slot"><label for="plN">Précision de l'analyse</label><select id="plN"><option value="12">Rapide</option><option value="24" selected>Normale</option><option value="48">Fine (plus lent)</option></select></div></div>
  <div class="row section"><button class="btn primary" id="plGo">Commencer le match</button><span id="plErr" class="red small"></span></div></div></div>
  <div id="plGame" style="display:none"><div class="cs-wrap"><div class="cs-stage" id="plHost"></div><aside class="card cs-side"><div class="pl-nav"><button class="btn" id="plPrev" aria-label="Coup précédent">‹</button><span class="small mute" id="plPos">Coup 0</span><button class="btn" id="plNext" aria-label="Coup suivant">›</button></div><div id="plAn"></div><ol class="pl-hist" id="plHist"></ol><div class="row section"><button class="btn ghost" id="plNew">Changer les équipes</button></div></aside></div></div>
  <p class="small mute section">Comment le coach juge : pour chaque coup possible (quelle carte, quelle action, quelle cible), il rejoue la suite du match des dizaines de fois avec le moteur du jeu et compare les chances de victoire. Les mêmes tirages au sort servent pour tous les coups, et les meilleurs sont rejoués 6 fois plus pour les départager. Un coup reste « bon » tant qu'il n'y avait pas nettement mieux : moins de 8 points d'écart (ou dans la marge des tirages) = bon coup, 8 à 20 = imprécision, plus de 20 = vraie erreur. L'ordinateur fort joue à chaque fois le coup que le coach juge le meilleur (il réfléchit environ une seconde) ; ses coups ne sont pas notés.</p>`;
  bindPicks(m, byName, lab);
  if (!document.getElementById('csFonts')) { const l = document.createElement('link'); l.id = 'csFonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Roboto+Condensed:wght@400;500;600;700&family=Caprasimo&family=Dela+Gothic+One&family=JetBrains+Mono:wght@500;600&family=Archivo:wdth,wght@125,900&family=Saira+Condensed:wght@500;600;700;800;900&family=Kanit:ital,wght@0,700;1,600;1,800;1,900&family=Chakra+Petch:wght@500;600;700&display=swap'; document.head.appendChild(l); }
  const loadEngine = () => loadBattleFrame($('#plHost'));
  let worker = null, aiWorker = null, aiSeq = 0, aiWait = new Map(), techOf = {}, AN = new Map(), seq = 0, N = 24, names = ['Toi', 'Adversaire'], ai = [false, true];
  const pc = v => Math.round(v * 100) + ' %';
  const fmt = v => Math.round(v).toLocaleString('fr-FR');
  const persp = (D, s) => BFDuel.engine.persp(D.b, s);
  const actName = (name, a) => a === 'attack' ? 'Attaque' : a === 'purple' ? 'HOLLOW PURPLE' : a === 'rage' ? 'RAGE' : a === 'ultimate' ? 'FULL POWER' : (techOf[name] || 'Technique');
  const mvTxt = (D, side, mv) => { const b = persp(D, side), p = b.players[mv.i], t = b.enemies[mv.t]; return `${p?.name || '?'} : ${actName(p?.name, mv.a)}${t ? ' → ' + (t.shadowName || t.name) : ''}`; };
  const same = (x, y) => x.i === y.i && x.a === y.a && x.t === y.t;
  function why(D, side, best, mine) {
    const b = persp(D, side), q = b.players[best.m.i], bt = b.enemies[best.m.t], out = [];
    const tech = actName(q.name, best.m.a), sk = best.m.a !== 'attack';
    const foe = bt ? bt.shadowName || bt.name : '';
    if (best.kills >= 0.5 && bt) out.push(`Il achève ${foe} (${bt.hp} PV) : une carte adverse en moins, c'est une action de moins contre toi à chaque tour.`);
    if (sk && best.frozen >= 0.5) out.push(`${tech} fige ${best.frozen >= 1.5 ? 'plusieurs cartes adverses' : 'une carte adverse'} : elles ne jouent pas pendant ce tour, tes cartes enchaînent.`);
    if (sk && best.healed > 0 && best.healed >= (mine?.healed || 0) + 100) out.push(`${tech} rend environ ${fmt(best.healed)} PV utiles maintenant, au moment où ton équipe en a besoin.`);
    if (sk && best.dealt > (mine?.dealt || 0) * 1.2 && best.dealt > 0) out.push(`${tech} inflige environ ${fmt(best.dealt)} dégâts, contre ${fmt(mine?.dealt || 0)} pour ton coup.`);
    if (!sk && mine && mine.m.a !== 'attack') {
      const mp = b.players[mine.m.i];
      if (/ayanokouji/i.test(mp.name)) out.push(`${mp.name} est à ${Math.round(mp.hp / mp.maxHp * 100)} % de ses PV : l'échange ne sert que quand il est bas. Là, il échange ses PV contre ceux d'une carte adverse sans rien gagner, et sa technique part en recharge.`);
      else if (mine.healed > 0 && mine.healed < b.players.reduce((a, p) => a + (p.hp > 0 ? Math.round(p.maxHp * .3) : 0), 0) * .6) out.push(`Ton ${actName(mp.name, mine.m.a)} ne rendait que ${fmt(mine.healed)} PV : ton équipe était encore trop pleine. Garde-le pour plus tard, il soignera bien plus.`);
      else out.push(`Garder ${actName(mp.name, mine.m.a)} pour plus tard rapporte davantage : il sera disponible au moment où il compte vraiment.`);
    }
    if (!out.length && mine && best.m.i !== mine.m.i) out.push(`Faire jouer ${q.name} en premier : ${b.players[mine.m.i].name} gagne à jouer après lui.`);
    if (!out.length && mine && best.m.t !== mine.m.t && bt) out.push(`Viser ${foe} (${bt.hp} PV) : c'est la cible qui fait gagner le plus souvent.`);
    if (!out.length) out.push(`C'est le coup qui gagne le plus souvent quand on rejoue la suite.`);
    out.push(`Résultat : ${pc(best.p)} de victoire${mine && !same(mine.m, best.m) ? ` contre ${pc(mine.p)} avec ton coup` : ''}, avec en moyenne ${best.alive.toFixed(1).replace('.', ',')} carte${best.alive >= 1.5 ? 's' : ''} encore debout à la fin (sur ${best.n} matchs rejoués).`);
    return out;
  }
  function anHtml(h) {
    if (ai[h.side]) return '';
    const a = AN.get(h); if (!a) return '<div class="pl-an mute small">Le coach analyse toutes les combinaisons…</div>';
    const best = a.res[0]; if (!best) return '';
    const mine = a.res.find(r => same(r.m, h.mv)) || { p: 0, m: h.mv }, d = (best.p - mine.p) * 100;
    const noise = 100 * Math.sqrt(Math.max(.05, best.p * (1 - best.p)) / Math.max(1, Math.min(best.n, mine.n || best.n)));
    const top = same(best.m, h.mv), g = top || d < Math.max(8, noise * 1.5) ? '✅' : d <= 20 ? '⚠️' : '❌';
    a.grade = g;
    const head = top ? 'C\'est le meilleur coup' : g === '✅' ? 'Bon coup (presque aussi bon que le meilleur)' : g === '⚠️' ? 'Imprécision' : 'Erreur';
    return `<div class="pl-an ${g === '✅' ? 'g' : g === '⚠️' ? 'w' : 'b'}"><b>${g} ${head}</b>${h.side ? ' <span class="small mute">(camp adverse)</span>' : ''}
      ${top || g === '✅' ? '' : `<p class="small">Le meilleur coup selon le coach : <b>${esc(mvTxt(h.from, h.side, best.m))}</b></p>`}
      ${g === '✅' && !top ? `<p class="small">Ton coup se vaut avec le meilleur : ${pc(mine.p)} de victoire contre ${pc(best.p)}, l'écart est dans la marge du hasard. Rien à corriger.</p>` : `<p class="small"><b>Pourquoi :</b></p><ul class="small cs-why">${why(h.from, h.side, best, top ? null : mine).map(w => `<li>${esc(w)}</li>`).join('')}</ul>`}
      ${g !== '✅' ? '<button class="btn ghost small" data-pl-try>‹ Revenir avant ce coup et jouer le meilleur</button>' : ''}</div>`;
  }
  function side(info) {
    const H = info.hist; $('#plPos').textContent = `Coup ${info.idx} / ${H.length - 1}`; $('#plPrev').disabled = info.idx <= 0; $('#plNext').disabled = info.idx >= H.length - 1;
    $('#plHist').innerHTML = H.slice(1).map((h, j) => { const a = AN.get(h); const ic = ai[h.side] ? '' : a ? (a.grade || '') : '…'; return `<li class="${j + 1 === info.idx ? 'on' : ''} ${j + 1 > info.idx ? 'fut' : ''}" data-j="${j + 1}"><span class="pl-ic">${ic}</span> <span class="mute small">${h.side ? esc(names[1]) : 'Toi'}</span> ${esc(mvTxt(h.from, h.side, h.mv))}</li>`; }).join('') || '<li class="mute small">Aucun coup joué.</li>';
    const cur = H[info.idx]; $('#plAn').innerHTML = cur && cur.from ? anHtml(cur) : '';
    if (info.D?.winner != null && info.idx === H.length - 1) { const L = H.slice(1).filter(h => !ai[h.side]).map(h => AN.get(h)).filter(Boolean); const c = g => L.filter(a => a.grade === g).length; $('#plAn').innerHTML += `<div class="pl-an"><b>Bilan · ${info.D.winner === 0 ? 'Victoire' : info.D.winner === 'draw' ? 'Égalité' : 'Défaite'}</b><p class="small">${c('✅')} bons coups · ${c('⚠️')} imprécisions · ${c('❌')} erreurs.</p></div>`; }
  }
  function onChange(info) {
    const last = info.hist[info.hist.length - 1];
    if (last.from && !ai[last.side] && !AN.has(last) && !last.sent) { last.sent = ++seq; worker.postMessage({ id: last.sent, from: last.from, chosen: last.mv, n: N }); }
    side(info);
  }
  const quit = () => { BFDuel.stop(); $('#plGame').style.display = 'none'; $('#plSetup').style.display = ''; };
  $('#plGo').onclick = async () => {
    const team = p => [0, 1, 2].map(i => { const c = byName.get($('#' + p + i).value.trim().toLowerCase()); if (!c) return null; const s = stOf(c, +$('#' + p + 's' + i).value); techOf[c.n] = c.t?.[0]?.[0] || 'Technique'; return { name: c.n, rarity: rar(c), image: c.ex ? c.img : lrImg(c), hp: s.hp, atk: s.atk }; });
    const A = team('a'), B = team('b');
    if (A.includes(null) || B.includes(null)) { $('#plErr').textContent = 'Une carte n\'est pas reconnue : choisis-la dans la liste.'; return; }
    N = +$('#plN').value; const mode = $('#plMode').value; ai = [false, mode !== 'moi']; names = ['Toi', ai[1] ? 'Ordinateur' : 'Adversaire'];
    $('#plErr').textContent = 'Chargement du combat…';
    try { await loadEngine(); } catch { $('#plErr').textContent = 'Impossible de charger le moteur du jeu.'; return; }
    $('#plErr').textContent = '';
    if (!worker) { worker = new Worker('duel-worker.js?v=189'); worker.onmessage = ({ data }) => { const info = BFDuel.info(); const h = info.hist.find(x => x.sent === data.id); if (h) { AN.set(h, { res: data.res }); side(BFDuel.info()); } }; }
    $('#plSetup').style.display = 'none'; $('#plGame').style.display = '';
    const sv = $('#plStart').value;
    if (mode === 'fort' && !aiWorker) { aiWorker = new Worker('duel-worker.js?v=189'); aiWorker.onmessage = ({ data }) => { const f = aiWait.get(data.id); if (f) { aiWait.delete(data.id); f(data.res?.[0]?.m || null); } }; }
    const aiPick = mode === 'fort' ? D => new Promise(ok => { const id = ++aiSeq; aiWait.set(id, ok); aiWorker.postMessage({ id, from: D, chosen: null, n: 10 }); setTimeout(() => { if (aiWait.has(id)) { aiWait.delete(id); ok(null); } }, 15000); }) : null;
    BFDuel.mount(null, { frame: true, A, B, names, ai, aiPick, onChange, onQuit: quit });
    AN = new Map(); BFDuel.start(sv === 'r' ? null : +sv);
  };
  $('#plPrev').onclick = () => BFDuel.go(BFDuel.info().idx - 1);
  $('#plNext').onclick = () => BFDuel.go(BFDuel.info().idx + 1);
  $('#plNew').onclick = quit;
  $('#plHist').onclick = e => { const li = e.target.closest('[data-j]'); if (li) BFDuel.go(+li.dataset.j); };
  $('#plAn').onclick = e => { if (e.target.closest('[data-pl-try]')) BFDuel.go(BFDuel.info().idx - 1); };
  document.onkeydown = e => { if (!window.BFDuel || $('#plGame')?.style.display === 'none' || /input|select|textarea/i.test(e.target.tagName)) return; if (e.key === 'ArrowLeft') BFDuel.go(BFDuel.info().idx - 1); if (e.key === 'ArrowRight') BFDuel.go(BFDuel.info().idx + 1); };
};

/* ---------- Simulateur du Château de l'infini : écran de combat et moteur du jeu, analyse de chaque coup ---------- */
P.chateausim = m => {
  const EXS = (S.kb.ex_cards || []).filter(c => c.r === 'Exclusive').map(c => ({ ...c, ex: true }));
  const ALL = [...(S.kb.cards || []), ...EXS];
  const cnt = {}; ALL.forEach(c => cnt[c.n] = (cnt[c.n] || 0) + 1);
  const lab = c => cnt[c.n] > 1 ? `${c.n} (${c.ex ? 'Exclusive' : c.p ? 'prestige' : c.r || 'LR'} #${c.id})` : c.n;
  const byName = new Map(ALL.map(c => [lab(c).toLowerCase(), c]));
  const stOf = (c, st) => c.ex ? { hp: c.st[st][0], atk: c.st[st][1] } : statsAt(c, st);
  const rar = c => c.ex ? 'Exclusive' : c.r === 'Transcendant' ? 'Transcendant' : 'Secret';
  const slot = (i, id) => pickRow(ALL, lab, 'cs', i, id, 'csCards', 'css');
  m.innerHTML = `<h1>Jouer une chambre du château</h1><p class="mute">Le vrai combat du jeu : même écran, mêmes techniques, mêmes gardiens et mêmes animations. Choisis ton équipe (n'importe quelles cartes, n'importe quelles étoiles) et la chambre, puis joue. Chaque coup est analysé : bon coup, imprécision ou erreur, avec la raison. Les flèches ‹ › te ramènent à n'importe quel coup pour en essayer un autre.</p>
  <datalist id="csCards">${ALL.map(c => `<option value="${esc(lab(c))}">`).join('')}</datalist>
  <div id="csGoal" class="card section"><h2>🎯 Je veux atteindre la chambre…</h2><p class="small mute" style="margin-top:4px">Le site teste toutes les équipes possibles (une carte par rôle) avec le moteur du jeu et les 6 ordres de jeu, puis te montre celles qui passent cette chambre. Choisis-en une pour regarder un combat gagnant.</p>
    <div class="pl-row"><div class="pl-slot"><label for="cgRoom">Chambre visée</label><input id="cgRoom" type="number" min="1" max="5000" value="600"></div><div class="pl-slot"><label for="cgMode">Avec quelles cartes</label><select id="cgMode"><option value="mine">Mes LR</option><option value="all">Toutes les LR (5★)</option></select></div></div>
    <div class="row section"><button class="btn primary" id="cgGo">Trouver les équipes</button><span id="cgErr" class="small mute"></span></div><div id="cgOut"></div></div>
  <div id="csSetup" class="card section"><h2>Ton équipe</h2><div class="pl-picks3">${[953, 3248, 499].map((id, i) => slot(i, id)).join('')}</div>
  <div class="pl-row"><div class="pl-slot"><label for="csRoom">Chambre</label><input id="csRoom" type="number" min="1" max="5000" value="500"></div><div class="pl-slot"><label for="csN">Précision de l'analyse</label><select id="csN"><option value="12">Rapide</option><option value="24" selected>Normale</option><option value="48">Fine (plus lent)</option></select></div></div>
  <div class="row section"><button class="btn primary" id="csGo">Entrer dans la chambre</button><button class="btn ghost" id="csSpecB">👁 Voir une victoire à cette chambre</button><button class="btn ghost" id="csCeilB">📊 Plafond de cette équipe</button><span id="csErr" class="red small"></span></div><div id="csCeil"></div></div>
  <div id="csGame" style="display:none"><div class="cs-wrap"><div class="cs-stage" id="csHost"></div><aside class="card cs-side"><div class="pl-nav"><button class="btn" id="csPrev" aria-label="Coup précédent">‹</button><span class="small mute" id="csPos">Coup 0</span><button class="btn" id="csNext" aria-label="Coup suivant">›</button></div><div id="csAn"></div><ol class="pl-hist" id="csHist"></ol><div class="row section"><button class="btn ghost" id="csNew">Changer d'équipe</button></div></aside></div></div>
  <p class="small mute section">Comment l'IA juge : pour chaque coup possible (quelle carte, quelle action, quelle cible), elle rejoue la suite de la chambre des dizaines de fois (les gardiens visent au hasard, comme dans le jeu) et compare tes chances de victoire. Les mêmes tirages au sort servent pour tous les coups, et les meilleurs sont rejoués 6 fois plus pour les départager. Le coach donne alors un seul meilleur coup et explique pourquoi. Un coup reste « bon » tant qu'il n'y avait pas nettement mieux : moins de 8 points d'écart (ou dans la marge des tirages) = bon coup, 8 à 20 = imprécision, plus de 20 = vraie erreur.</p>`;
  bindPicks(m, byName, lab);
  if (!document.getElementById('csFonts')) { const l = document.createElement('link'); l.id = 'csFonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Roboto+Condensed:wght@400;500;600;700&family=Caprasimo&family=Dela+Gothic+One&family=JetBrains+Mono:wght@500;600&family=Archivo:wdth,wght@125,900&family=Saira+Condensed:wght@500;600;700;800;900&family=Kanit:ital,wght@0,700;1,600;1,800;1,900&family=Chakra+Petch:wght@500;600;700&display=swap'; document.head.appendChild(l); }
  const loadEngine = () => loadBattleFrame($('#csHost'));
  let worker = null, techOf = {}, AN = new Map(), seq = 0, N = 32;
  const pc = v => Math.round(v * 100) + ' %';
  const actName = (name, a) => a === 'attack' ? 'Attaque' : a === 'purple' ? 'HOLLOW PURPLE' : a === 'rage' ? 'RAGE' : a === 'ultimate' ? 'FULL POWER' : (techOf[name] || 'Technique');
  const mvTxt = (b, mv) => { const p = b.players[mv.i], t = b.enemies[mv.t]; return `${p?.name || '?'} : ${actName(p?.name, mv.a)}${t ? ' → ' + (t.shadowName || t.name) : ''}`; };
  const same = (x, y) => x.i === y.i && x.a === y.a && x.t === y.t;
  const fmt = v => Math.round(v).toLocaleString('fr-FR');
  // Le coach donne UN meilleur coup et explique pourquoi, à partir des combats rejoués.
  function why(b, best, mine) {
    const q = b.players[best.m.i], bt = b.enemies[best.m.t], out = [];
    const tech = actName(q.name, best.m.a), sk = best.m.a !== 'attack';
    if (best.kills >= 0.5) out.push(`Il achève ${bt.shadowName || bt.name} (${bt.hp} PV) : un gardien en moins, c'est une riposte de moins à chaque tour.`);
    if (sk && best.frozen >= 0.5) out.push(`${tech} fige ${best.frozen >= 1.5 ? 'plusieurs gardiens' : 'un gardien'} : ils ne ripostent pas ce tour-ci.`);
    if (sk && best.healed > 0 && best.healed >= (mine?.healed || 0) + 100) out.push(`${tech} rend environ ${fmt(best.healed)} PV utiles maintenant, au moment où ton équipe en a besoin.`);
    if (sk && best.dealt > (mine?.dealt || 0) * 1.2 && best.dealt > 0) out.push(`${tech} inflige environ ${fmt(best.dealt)} dégâts, contre ${fmt(mine?.dealt || 0)} pour ton coup.`);
    if (!sk && mine && mine.m.a !== 'attack') {
      const mp = b.players[mine.m.i];
      if (/ayanokouji/i.test(mp.name)) out.push(`${mp.name} est à ${Math.round(mp.hp / mp.maxHp * 100)} % de ses PV : l'échange ne sert que quand il est bas (idéalement après 2 coups encaissés). Là, il échange ses PV contre ceux d'un gardien sans rien gagner, et sa technique part en recharge pour 4 tours.`);
      else if (mine.healed > 0 && mine.healed < b.players.reduce((a, p) => a + (p.hp > 0 ? Math.round(p.maxHp * .3) : 0), 0) * .6) out.push(`Ton ${actName(b.players[mine.m.i].name, mine.m.a)} ne rendait que ${fmt(mine.healed)} PV : ton équipe était encore trop pleine. Garde-le pour plus tard, il soignera bien plus.`);
      else out.push(`Garder ${actName(b.players[mine.m.i].name, mine.m.a)} pour plus tard rapporte davantage : il sera disponible au moment où il compte vraiment.`);
    }
    if (!out.length && mine && best.m.i !== mine.m.i) out.push(`Faire jouer ${q.name} en premier : ${b.players[mine.m.i].name} gagne à jouer après lui.`);
    if (!out.length && mine && best.m.t !== mine.m.t) out.push(`Viser ${bt.shadowName || bt.name} (${bt.hp} PV) : c'est la cible qui fait tomber la chambre le plus souvent.`);
    if (!out.length) out.push(`C'est le coup qui gagne le plus souvent quand on rejoue la suite.`);
    out.push(`Résultat : ${pc(best.p)} de victoire${mine && !same(mine.m, best.m) ? ` contre ${pc(mine.p)} avec ton coup` : ''}, avec en moyenne ${best.alive.toFixed(1).replace('.', ',')} carte${best.alive >= 1.5 ? 's' : ''} encore debout à la fin (sur ${best.n} combats rejoués).`);
    return out;
  }
  function anHtml(h) {
    const a = AN.get(h); if (!a) return h.from ? '<div class="pl-an mute small">Le coach analyse toutes les combinaisons…</div>' : '';
    const best = a.res[0], mine = a.res.find(r => same(r.m, h.mv)) || { p: 0, m: h.mv }, d = (best.p - mine.p) * 100;
    // Écart de moins de 6 points (ou dans la marge des tirages) : le coup se vaut.
    const noise = 100 * Math.sqrt(Math.max(.05, best.p * (1 - best.p)) / Math.max(1, Math.min(best.n, mine.n || best.n)));
    const top = same(best.m, h.mv), g = top || d < Math.max(8, noise * 1.5) ? '✅' : d <= 20 ? '⚠️' : '❌';
    a.grade = g;
    const head = top ? 'C\'est le meilleur coup' : g === '✅' ? 'Bon coup (presque aussi bon que le meilleur)' : g === '⚠️' ? 'Imprécision' : 'Erreur';
    return `<div class="pl-an ${g === '✅' ? 'g' : g === '⚠️' ? 'w' : 'b'}"><b>${g} ${head}</b>
      ${top || g === '✅' ? '' : `<p class="small">Le meilleur coup selon le coach : <b>${esc(mvTxt(h.from, best.m))}</b></p>`}
      ${g === '✅' && !top ? `<p class="small">Ton coup se vaut avec le meilleur : ${pc(mine.p)} de victoire contre ${pc(best.p)}, l'écart est dans la marge du hasard. Rien à corriger.</p>` : `<p class="small"><b>Pourquoi :</b></p><ul class="small cs-why">${why(h.from, best, top ? null : mine).map(w => `<li>${esc(w)}</li>`).join('')}</ul>`}
      ${g !== '✅' ? '<button class="btn ghost small" data-cs-try>‹ Revenir avant ce coup et jouer le meilleur</button>' : ''}</div>`;
  }
  function side(info) {
    const H = info.hist; $('#csPos').textContent = `Coup ${info.idx} / ${H.length - 1}`; $('#csPrev').disabled = info.idx <= 0; $('#csNext').disabled = info.idx >= H.length - 1;
    $('#csHist').innerHTML = H.slice(1).map((h, j) => { const a = AN.get(h); return `<li class="${j + 1 === info.idx ? 'on' : ''} ${j + 1 > info.idx ? 'fut' : ''}" data-j="${j + 1}"><span class="pl-ic">${a ? (a.grade || '') : '…'}</span> ${esc(mvTxt(h.from, h.mv))}</li>`; }).join('') || '<li class="mute small">Aucun coup joué.</li>';
    const cur = H[info.idx]; $('#csAn').innerHTML = cur && cur.from ? anHtml(cur) : '';
    if (info.battle?.result && info.idx === H.length - 1) { const L = H.slice(1).map(h => AN.get(h)).filter(Boolean); const c = g => L.filter(a => a.grade === g).length; $('#csAn').innerHTML += `<div class="pl-an"><b>Bilan · ${info.battle.result === 'win' ? 'Victoire' : 'Défaite'}</b><p class="small">${c('✅')} bons coups · ${c('⚠️')} imprécisions · ${c('❌')} erreurs.</p></div>`; }
  }
  function onChange(info) {
    const H = info.hist; for (const h of H) if (h.from && !h.mv) h.mv = { i: h.active, a: h.action, t: h.target };
    const last = H[H.length - 1]; if (last.from && !AN.has(last) && !last.sent) { last.sent = ++seq; worker.postMessage({ id: last.sent, from: last.from, chosen: { i: last.active, a: last.action, t: last.target }, n: N }); }
    side(info);
  }
  // Chiffres de l'équipe choisie (même avec des cartes qu'on n'a pas) : chambre sûre, jouable, max et plafond réel, avec le moteur du jeu.
  $('#csCeilB').onclick = async () => {
    const T = [0, 1, 2].map(i => { const c = byName.get($('#cs' + i).value.trim().toLowerCase()); return c ? engUnit(c, +$('#css' + i).value) : null; });
    if (T.includes(null)) { $('#csErr').textContent = 'Une carte n\'est pas reconnue : choisis-la dans la liste.'; return; }
    $('#csErr').textContent = ''; const btn = $('#csCeilB'); btn.disabled = true; $('#csCeil').innerHTML = '<p class="mute small" style="margin-top:12px">Combats simulés chambre par chambre avec le moteur du jeu (quelques secondes)…</p>';
    const r = await twCall({ kind: 'castle', team: T, catalog: castleCatalog(), n: 100 }); btn.disabled = false; lastCeil = r.ceil; lastPol = r.pol || null;
    if ($('#csCeil')) $('#csCeil').innerHTML = `<h3 style="margin-top:16px">Ce que cette équipe peut atteindre</h3>${simBlock(r, [0, 1, 2].map(i => byName.get($('#cs' + i).value.trim().toLowerCase())), Object.fromEntries([0, 1, 2].map(i => [byName.get($('#cs' + i).value.trim().toLowerCase())?.id, +$('#css' + i).value])))}<div class="card" style="margin-top:12px"><h3 style="margin:0">Comment dépasser la chambre max (${r.max}) jusqu'au plafond (${r.ceil})</h3>
      ${r.pol ? `<p class="small" style="margin:8px 0 0">🎯 <b>Ordre de jeu conseillé</b> (le meilleur des 6 ordres possibles, testé avec le moteur du jeu) : ${r.pol.perm.map(i => esc(T[i]?.name || '')).join(' → ')}${r.pol.dom === 'unstruck' ? ' · Domination de Makima sur un gardien qui n\'a pas encore frappé ce tour (il perd sa riposte)' : ''}.</p>` : ''}<ul class="list small" style="margin-top:8px"><li><b>Jusqu'à la chambre max</b>, la boucle normale gagne au moins 1 fois sur 5 : Aya encaisse, échange ses PV avec le gardien le plus plein, le soin remonte l'équipe.</li>
      <li><b>Au-delà</b>, les gardiens tapent assez fort pour casser la boucle s'ils visent mal pour toi. Une victoire demande que le hasard tombe bien : les coups doivent se répartir pour qu'<b>Aya ne prenne jamais plus de 2 coups avant son échange</b>, que <b>le soin passe entre deux coups</b> sur la carte basse, et qu'aucune autre carte ne tombe avant que l'échange ait vidé un gardien.</li>
      <li><b>Sans soigneur, après le 1er seuil (Aya meurt en 2 coups) :</b> au lieu d'échanger avec le gardien le plus plein, échange avec un gardien <b>pas plein</b> (ex. 60 % : Aya 3★ remonte à 790 PV) mais qui lui laisse de quoi encaisser <b>un coup de plus</b>. Les gardiens pleins restent pour un échange bien plus rentable quelques tours plus tard, quand Aya est au plus bas. C'est ce qui débloque quelques chambres après le seuil (×2 à ×4 de victoires dans nos simulations, et un plafond réel plus haut). Avec un soigneur, on garde l'échange sur le gardien le plus plein : le soin fait mieux.</li>
      <li><b>Ce que tu contrôles :</b> n'échange qu'après 2 coups encaissés (jamais avant), échange sur le gardien qui a le plus de PV, garde le soin pour le moment où une carte mourrait au prochain coup, et achève toujours un gardien tuable.</li>
      <li><b>Le reste, c'est la répétition :</b> une défaite ne coûte rien. À ${Math.round((r.ceilP || .03) * 100)} % par essai à la chambre ${r.ceil}, compte en moyenne ${Math.round(1 / Math.max(.01, r.ceilP || .03))} essais.</li></ul>
      <p class="small mute" style="margin:6px 0 0">Le mieux : regarde une vraie victoire, coup par coup.</p></div>
      <div class="row" style="margin-top:8px"><button class="btn primary small" data-spec="${r.ceil}">👁 Voir une victoire à la chambre ${r.ceil} (plafond)</button><button class="btn ghost small" data-spec="${r.max}">👁 Voir une victoire à la chambre ${r.max} (max)</button><button class="btn ghost small" id="csAtCeil">Jouer la chambre ${r.ceil} moi-même</button></div>`;
    const a = $('#csAtCeil'); if (a) a.onclick = () => { $('#csRoom').value = r.ceil; $('#csGo').click(); };
    $('#csCeil').querySelectorAll('[data-spec]').forEach(b => b.onclick = () => spectate(+b.dataset.spec, T));
  };
  // Spectateur : le moteur rejoue la chambre jusqu'à une victoire, puis on la regarde (×2, flèches ‹ ›), sans pouvoir la modifier.
  let lastCeil = null, lastPol = null; m.querySelectorAll('#csSetup input, #csSetup select').forEach(e => { if (!['csRoom', 'csN'].includes(e.id)) e.addEventListener('change', () => { lastCeil = null; lastPol = null; }); });
  $('#csSpecB').onclick = () => {
    const T = [0, 1, 2].map(i => { const c = byName.get($('#cs' + i).value.trim().toLowerCase()); return c ? engUnit(c, +$('#css' + i).value) : null; });
    if (T.includes(null)) { $('#csErr').textContent = 'Une carte n\'est pas reconnue : choisis-la dans la liste.'; return; }
    const room = Math.max(1, Math.min(5000, +$('#csRoom').value || 1));
    if (lastCeil && room > lastCeil) { $('#csErr').textContent = `Chambre ${room} au-delà du plafond réel de cette équipe (${lastCeil}) : je cherche quand même, mais une victoire y est quasi impossible.`; }
    spectate(room, T);
  };
  async function spectate(room, T) {
    $('#csErr').textContent = `Recherche d'une victoire à la chambre ${room}…`;
    const catalog = castleCatalog(); const r = await twCall({ kind: 'castleWin', room, team: T, catalog, tries: 800, pol: lastPol });
    if (!r.ok) { $('#csErr').textContent = `Aucune victoire trouvée en ${r.tries} essais à la chambre ${room} : cette chambre est hors de portée de cette équipe.`; return; }
    try { await loadEngine(); } catch { $('#csErr').textContent = 'Impossible de charger le moteur du jeu.'; return; }
    $('#csErr').textContent = ''; [0, 1, 2].forEach(i => { const c = byName.get($('#cs' + i).value.trim().toLowerCase()); if (c) techOf[c.n] = c.t?.[0]?.[0] || 'Technique'; });
    $('#csSetup').style.display = 'none'; $('#csGoal').style.display = 'none'; $('#csGame').style.display = '';
    const sideS = info => { const H = info.hist; $('#csPos').textContent = `Coup ${info.idx} / ${H.length - 1}`; $('#csPrev').disabled = info.idx <= 0; $('#csNext').disabled = info.idx >= H.length - 1;
      $('#csHist').innerHTML = H.slice(1).map((h, j) => `<li class="${j + 1 === info.idx ? 'on' : ''} ${j + 1 > info.idx ? 'fut' : ''}" data-j="${j + 1}">${esc(mvTxt(h.from, { i: h.active, a: h.action, t: h.target }))}</li>`).join('');
      $('#csAn').innerHTML = `<div class="pl-an"><b>👁 Mode spectateur · chambre ${room}</b><p class="small">Victoire trouvée au ${r.tries}${r.tries === 1 ? 'er' : 'e'} essai (le hasard des gardiens change à chaque essai). ${r.swaps} échange${r.swaps > 1 ? 's' : ''} d'Aya, ${r.heals} soin${r.heals > 1 ? 's' : ''}, ${r.turns} tours.</p><p class="small mute">Combat joué par le moteur du jeu : tu regardes, tu ne peux pas le modifier. ‹ › pour revenir coup par coup.</p><button class="btn ghost small" id="csPlay">${info.playing ? '⏸ Pause' : '▶ Lecture'}</button></div>`;
      const pb = $('#csPlay'); if (pb) pb.onclick = () => BFCastle.play(); };
    BFCastle.mount(null, { frame: true, team: T, catalog, room, onChange: sideS, onQuit: () => { BFCastle.stop(); $('#csGame').style.display = 'none'; $('#csSetup').style.display = ''; $('#csGoal').style.display = ''; } });
    BFCastle.spectate(r.steps, room);
  }
  $('#csGo').onclick = async () => {
    const team = [0, 1, 2].map(i => { const c = byName.get($('#cs' + i).value.trim().toLowerCase()); if (!c) return null; const s = stOf(c, +$('#css' + i).value); techOf[c.n] = c.t?.[0]?.[0] || 'Technique'; return { name: c.n, rarity: rar(c), image: c.ex ? c.img : lrImg(c), hp: s.hp, atk: s.atk }; });
    if (team.includes(null)) { $('#csErr').textContent = 'Une carte n\'est pas reconnue : choisis-la dans la liste.'; return; }
    const room = Math.max(1, Math.min(5000, +$('#csRoom').value || 1)); N = +$('#csN').value;
    $('#csErr').textContent = 'Chargement du combat…';
    try { await loadEngine(); } catch { $('#csErr').textContent = 'Impossible de charger le moteur du jeu.'; return; }
    $('#csErr').textContent = '';
    if (!worker) { worker = new Worker('castle-worker.js?v=189'); worker.onmessage = ({ data }) => { const info = BFCastle.info(); const h = info.hist.find(x => x.sent === data.id); if (h) { AN.set(h, { res: data.res.sort((a, b) => b.p - a.p) }); side(BFCastle.info()); } }; }
    const catalog = (S.kb.cards || []).filter(c => !c.r).map(c => ({ name: c.n, rarity: 'Secret', image: lrImg(c) })).filter(c => c.image);
    $('#csSetup').style.display = 'none'; $('#csGoal').style.display = 'none'; $('#csGame').style.display = '';
    BFCastle.mount(null, { frame: true, team, catalog, room, onChange, onQuit: () => { BFCastle.stop(); $('#csGame').style.display = 'none'; $('#csSetup').style.display = ''; $('#csGoal').style.display = ''; } });
    AN = new Map(); BFCastle.start(room);
  };
  // Objectif chambre : toutes les équipes testées en parallèle (plusieurs workers), tri rapide puis % précis sur les finalistes.
  let cgTok = 0;
  const pool = n => Array.from({ length: n }, () => new Worker('team-worker.js?v=' + APP_V));
  const runPool = (W, kind, items, extra, chunk, onProg) => new Promise(ok => { const out = new Array(items.length); let next = 0, done = 0; if (!items.length) { ok(out); return; }
    const feed = w => { if (next >= items.length) return; const from = next; next = Math.min(items.length, next + chunk); w.onmessage = ({ data }) => { data.r.forEach((v, k) => out[from + k] = v); done += data.r.length; onProg(done, items.length); if (done >= items.length) ok(out); else feed(w); }; w.postMessage({ id: from, kind, teams: items.slice(from, next).map(x => x.T), ...extra }); };
    W.forEach(feed); });
  $('#cgGo').onclick = async () => {
    const room = Math.max(1, Math.min(5000, +$('#cgRoom').value || 1)), mode = $('#cgMode').value, tok = ++cgTok;
    await loadMyLR(); const own = S.mylr?.cards || {};
    const cards = LRS().filter(c => mode === 'all' || own[c.id] != null);
    if (cards.length < 3) { $('#cgErr').textContent = 'Il faut au moins 3 LR dans ta collection (Mes LR), ou choisis « Toutes les LR ».'; return; }
    const st = c => mode === 'all' ? 5 : (+own[c.id] || 0); const items = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) for (let k = j + 1; k < cards.length; k++) { const t = [cards[i], cards[j], cards[k]]; if (!roleOk(t)) continue; items.push({ t, s: t.map(st), T: t.map(c => engUnit(c, st(c))) }); }
    const btn = $('#cgGo'); btn.disabled = true; const catalog = castleCatalog();
    const W = pool(Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1)));
    const prog = (lab, a, n) => { if (tok !== cgTok || !$('#cgOut')) return; $('#cgOut').innerHTML = `<p class="small mute" style="margin:10px 0 6px">${lab} ${Math.round(a / n * 100)} %</p><div class="bar"><i style="width:${a / n * 100}%"></i></div>`; };
    try {
      $('#cgErr').textContent = `${items.length.toLocaleString('fr-FR')} équipes à tester…`;
      const q = await runPool(W, 'roomQuick', items, { room, catalog }, 40, (a, n) => prog(`Tri des ${n.toLocaleString('fr-FR')} équipes :`, a, n));
      if (tok !== cgTok) return;
      const fin = items.map((x, i) => ({ ...x, q: q[i] })).filter(x => x.q > 0).sort((a, b) => b.q - a.q).slice(0, 60);
      const r = await runPool(W, 'roomRate', fin, { room, catalog, n: 150 }, 1, (a, n) => prog(`Combats précis sur les ${n} meilleures :`, a, n));
      if (tok !== cgTok) return;
      fin.forEach((x, i) => Object.assign(x, r[i])); const ok = fin.filter(x => x.p > 0).sort((a, b) => b.p - a.p);
      $('#cgErr').textContent = '';
      const nm = c => esc(c.n.replace(/\s*\(.*$/, ''));
      const allOwn = x => x.t.every(c => own[c.id] != null);
      $('#cgOut').innerHTML = !ok.length ? `<div class="msg" style="margin-top:10px">Aucune équipe ${mode === 'mine' ? 'de ta collection ' : ''}ne gagne la chambre ${room} dans nos combats simulés. ${mode === 'mine' ? 'Essaie « Toutes les LR » pour voir quelles cartes il te manque, ou ' : 'Essaie '}une chambre plus basse.</div>`
        : `<p class="small" style="margin:12px 0 8px"><b>${ok.length} équipe${ok.length > 1 ? 's' : ''}</b> ${ok.length > 1 ? 'passent' : 'passe'} la chambre ${room}${ok.length >= 40 ? ' (les 40 meilleures)' : ''}. % = part des essais gagnés à cette chambre, en attaquant dans l'ordre indiqué à chaque tour (150 combats simulés par équipe, les gardiens visent au hasard : au-delà de la chambre 600, quelques % suffisent, une défaite ne coûte rien et on relance).</p>
          ${CGV2() ? `<div class="cggrid">${ok.map((x, i) => { const ord = x.pol?.perm || [0, 1, 2]; return `<div class="cgcard"><div class="cghead"><span class="cgpct ${x.p >= .5 ? 'up' : ''}">${Math.round(x.p * 100)} %</span><span class="small mute">de victoires à la chambre ${room}${x.p < .2 ? ` (≈ 1 essai sur ${Math.round(1 / x.p)})` : ''}</span>${mode === 'all' && allOwn(x) ? '<span class="chip ok" style="font-size:10px;margin-left:auto">tu les as</span>' : ''}</div>
            <div class="cgimgs">${ord.map((k, n) => { const c = x.t[k]; return `<figure class="cgimg"><span class="cgn">${n + 1}</span><img src="${esc(lrImg(c))}" alt="${esc(c.n)}" loading="lazy"><figcaption><b>${nm(c)}</b><span>${x.s[k]}★</span></figcaption></figure>`; }).join('')}</div>
            <div class="small cgord">🎯 <b>Ordre d'attaque recommandé, à chaque tour :</b> ${ord.map(k => nm(x.t[k])).join(' → ')}${x.pol?.dom === 'unstruck' && x.t.some(c => /makima/i.test(c.n)) ? ' · Domination sur un gardien qui n\'a pas encore frappé' : ''}${x.pol?.ayaGuard && x.t.some(c => /ayanokouji/i.test(c.n)) ? ' · Aya garde quand un coup la tuerait (au-dessus de 35 % de PV), puis échange au tour suivant' : ''}${x.pol?.guard ? ' · une carte qu’un coup tuerait garde au lieu d’attaquer' : ''}</div>
            <div class="cgbtns"><button class="btn primary small" data-cgw="${i}">👁 Voir le combat gagnant</button><button class="btn ghost small" data-cgp="${i}">Jouer moi-même</button></div></div>`; }).join('')}</div>` : `<div class="cggrid">${ok.map((x, i) => `<div class="cgrow"><div class="cgpct ${x.p >= .5 ? 'up' : ''}">${Math.round(x.p * 100)} %</div><div style="flex:1;min-width:0"><b>${x.t.map((c, k) => `${nm(c)} <span class="small mute">${x.s[k]}★</span>`).join(' · ')}</b>${mode === 'all' && allOwn(x) ? ' <span class="chip ok" style="font-size:10px">tu les as</span>' : ''}
            <div class="small" style="color:var(--blood2);margin-top:2px">🎯 <b>Ordre d'attaque recommandé, à chaque tour :</b> ${(x.pol?.perm || [0, 1, 2]).map(k => nm(x.t[k])).join(' → ')}${x.pol?.dom === 'unstruck' && x.t.some(c => /makima/i.test(c.n)) ? ' · Domination sur un gardien qui n\'a pas encore frappé' : ''}${x.pol?.ayaGuard && x.t.some(c => /ayanokouji/i.test(c.n)) ? ' · Aya garde quand un coup la tuerait (au-dessus de 35 % de PV), puis échange au tour suivant' : ''}${x.pol?.guard ? ' · une carte qu’un coup tuerait garde au lieu d’attaquer' : ''}</div>
            <div class="row" style="margin-top:6px;gap:6px"><button class="btn primary small" data-cgw="${i}">👁 Voir le combat gagnant</button><button class="btn ghost small" data-cgp="${i}">Jouer moi-même</button></div></div></div>`).join('')}</div>`}`;
      const put = x => { x.t.forEach((c, k) => { const inp = $('#cs' + k); inp.value = lab(c); inp.dispatchEvent(new Event('input')); $('#css' + k).value = x.s[k]; }); $('#csRoom').value = room; };
      $('#cgOut').querySelectorAll('[data-cgw]').forEach(b => b.onclick = () => { const x = ok[+b.dataset.cgw]; put(x); lastCeil = null; lastPol = x.pol || null; spectate(room, x.T); });
      $('#cgOut').querySelectorAll('[data-cgp]').forEach(b => b.onclick = () => { const x = ok[+b.dataset.cgp]; put(x); $('#csGo').click(); });
    } finally { W.forEach(w => w.terminate()); btn.disabled = false; }
  };
  $('#csPrev').onclick = () => BFCastle.go(BFCastle.info().idx - 1);
  $('#csNext').onclick = () => BFCastle.go(BFCastle.info().idx + 1);
  $('#csNew').onclick = () => { BFCastle.stop(); $('#csGame').style.display = 'none'; $('#csSetup').style.display = ''; $('#csGoal').style.display = ''; };
  $('#csHist').onclick = e => { const li = e.target.closest('[data-j]'); if (li) BFCastle.go(+li.dataset.j); };
  $('#csAn').onclick = e => { if (e.target.closest('[data-cs-try]')) BFCastle.go(BFCastle.info().idx - 1); };
  document.onkeydown = e => { if (!window.BFCastle || $('#csGame')?.style.display === 'none' || /input|select|textarea/i.test(e.target.tagName)) return; if (e.key === 'ArrowLeft') BFCastle.go(BFCastle.info().idx - 1); if (e.key === 'ArrowRight') BFCastle.go(BFCastle.info().idx + 1); };
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
  const ev = await loadEvents(); if (!$('#ev')) return; $('#ev').innerHTML = ev.map(eventCard).join('') || '<div class="empty">Aucune échéance pour l\'instant.</div>'; tickCountdowns();
};

/* ---------- Collection Prestige : ma collection, membres, échanges ---------- */
const SHARE_TXT = 'En activant le partage, les membres de la Brigade connectés au site verront : tes LR et leurs étoiles, tes équipes château et ranked, tes doublons et tes cartes manquantes par univers. Rien d\'autre : ni ton KI, ni ton compte, ni tes échanges privés. Tu peux le désactiver quand tu veux.';
const RN = { S: 'LR', M: 'Mythique', L: 'SSR', E: 'Épique', R: 'Rare', C: 'Commune', T: 'Transcendante' };
const img = h => !h ? '' : /^https?:/.test(h) ? h : `${S.kb.prestige_series?.base || 'https://yurocollection.fr/card-art/'}${h}.webp`;
async function loadCollections() {
  // La base renvoie au plus 1 000 lignes par demande : avec tous les membres il y en a bien plus (≈ 9 000 le 25/11). Sans pagination, les collections
  // des membres arrivés en dernier (et leurs mises à jour) n'étaient pas lues : la page Collection montrait l'ancienne version.
  // Lecture page par page « après la dernière ligne lue » (pas de décalage ni de comptage : 10 demandes en parallèle avec décalage faisaient expirer la base, « statement timeout » chez zakiel28).
  const sel = 'user_id,universe,owned,dupes,qty';
  const allRows = async () => { const out = []; let last = null; for (let k = 0; k < 60; k++) { let q = sb.from('checklist').select(sel).order('user_id').order('universe').limit(1000); if (last) q = q.or(`user_id.gt.${last.u},and(user_id.eq.${last.u},universe.gt."${String(last.s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`); const { data, error } = await q; if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) break; last = { u: data[data.length - 1].user_id, s: data[data.length - 1].universe }; } return out; };
  const mineOnly = async () => { const { data } = await sb.from('checklist').select(sel).eq('user_id', S.user.id); return data || []; };
  const safeRows = async () => { try { return await allRows(); } catch (e) { console.warn('collections', e); try { toast('Collections des membres indisponibles pour l’instant : ta collection reste affichée.'); } catch (_) { } return mineOnly(); } };
  const [rows, { data: profs }] = await Promise.all([safeRows(), sb.from('profiles').select('id,discord,share,status,nen,level,avatar').eq('status', 'approved')]);
  const C = {}; for (const r of rows || []) { const u = (C[r.user_id] = C[r.user_id] || {}); u[r.universe] = { owned: new Set(r.owned || []), dupes: new Set(r.dupes || []), qty: r.qty || {} }; }
  S.coll = C; S.members = profs || []; return C;
}
const myColl = () => (S.coll[S.user.id] = S.coll[S.user.id] || {});
const uget = (coll, u) => { const r = coll[u] || (coll[u] = { owned: new Set(), dupes: new Set(), qty: {} }); if (!r.qty) r.qty = {}; return r; };
const ownN = (coll, u) => { const r = coll[u.s]; return r ? u.c.filter(c => r.owned.has(c[0])).length : 0; };

P.checklist = async (m, tab = 'moi') => {
  if (FUS()) { location.hash = tab?.startsWith('m:') ? '#collection/L/' + tab : '#collection/L/' + (['completer', 'classement', 'membres'].includes(tab) ? tab : 'completer'); return; }
  const PS = S.kb.prestige_series; const U = PS?.series || [];
  if (!U.length) { m.innerHTML = '<h1>Collection Prestige</h1><div class="empty">La liste des univers arrive bientôt.</div>'; return; }
  await loadCollections();
  m.innerHTML = `<h1>Collection Prestige</h1>
    <div class="tabs" id="ct" style="max-width:860px"><button data-t="moi">Ma collection</button><button data-t="completer">À compléter</button><button data-t="manquantes">Manquantes</button><button data-t="classement">Classement</button><button data-t="membres">Membres</button><button data-t="echanges">Échanges</button></div><div id="cv" style="margin-top:16px"></div>`;
  const go = t => { $('#ct').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); history.replaceState(null, '', '#checklist/' + t); ({ moi: viewMine, completer: viewComplete, manquantes: viewMissing, classement: viewRanking, membres: viewMembers, echanges: viewTrades })[t]?.($('#cv'), U, PS); };
  $('#ct').querySelectorAll('button').forEach(b => b.onclick = () => go(b.dataset.t));
  go(['moi', 'completer', 'manquantes', 'classement', 'membres', 'echanges'].includes(tab) ? tab : tab?.startsWith('m:') ? 'membres' : 'moi');
  if (tab?.startsWith('m:')) viewProfile($('#cv'), U, tab.slice(2));
};

// Assistant d'import : SSR puis UR, avec contrôle du nombre de cartes affiché par le jeu.
function collectionWizard(U, coll, save, refresh) {
  const steps = [{ r: 'L', label: 'SSR', tag: 'SSR (伝)' }, { r: 'M', label: 'UR', tag: 'UR (神)' }]; const res = {}; let k = 0;
  const d = document.createElement('div'); d.className = 'modal'; document.body.appendChild(d);
  const keyOf = (n, s) => nsp(n) + '|' + nsp(s);
  const draw = () => {
    if (k < steps.length) { const st = steps[k];
      d.innerHTML = `<div class="mbox"><span class="chip red">Étape ${k + 1} / 2</span><h2 style="margin-top:10px">Tes cartes ${st.label}</h2>
        <ol class="list"><li>Dans le jeu : <b>Collection</b> → filtre <b>${st.tag}</b> → <b>Possédées</b>.</li><li>Fais défiler et prends des captures jusqu'à voir <b>toutes</b> tes cartes ${st.label} (une carte coupée en haut ou en bas d'une capture est ignorée : fais-les se chevaucher un peu).</li><li>Note le nombre affiché par le jeu à côté du filtre ${st.label} (par ex. « 392 / 414 » → 392).</li></ol>
        <div class="row" style="margin-top:10px"><div style="flex:1;min-width:160px"><label for="wn">Nombre de ${st.label} possédées affiché par le jeu</label><input id="wn" type="number" min="0" placeholder="ex. 392"></div></div>
        <div class="row" style="margin-top:12px">${scanFiles('wf', `Envoyer mes captures ${st.label}`, async files => { const t = $('#wst'); try { res[st.r] = { ...(await runScan(files, [st.r], true, t)), expected: +$('#wn').value || null }; k++; draw(); } catch (e) { t.textContent = 'La lecture a échoué : ' + e.message; } })}<button class="btn ghost" id="wskip">Passer cette étape</button><button class="btn ghost" id="wx">Fermer</button></div><p class="small mute" id="wst"></p></div>`;
      d.querySelector('#wx').onclick = () => d.remove(); d.querySelector('#wskip').onclick = () => { k++; draw(); }; lockUntilCount(d.querySelector('#wn'), 'wf'); return; }
    // résumé
    const plan = []; let own = 0, dup = 0, miss = 0;
    for (const st of steps) { const r = res[st.r]; if (!r) continue; const got = new Map(r.cards.map(c => [keyOf(c.name, c.series), c]));
      const complete = r.expected ? Math.abs(r.cards.length - r.expected) <= Math.max(1, r.expected * .01) : false; r.complete = complete;
      for (const u of U) for (const c of u.c) { if (c[1] !== st.r) continue; const g = got.get(keyOf(c[0], u.s));
        if (g) { plan.push([u, c[0], true, g.qty >= 2]); own++; if (g.qty >= 2) dup++; } else if (complete) { plan.push([u, c[0], false, false]); miss++; } } }
    const lines = steps.filter(st => res[st.r]).map(st => { const r = res[st.r]; return `<li><b>${st.label}</b> : ${r.cards.length} cartes reconnues${r.expected ? ` sur ${r.expected} annoncées par le jeu` : ''}${r.unknown ? `, ${r.unknown} non reconnue${r.unknown > 1 ? 's' : ''}` : ''}. ${r.complete ? '✓ Le compte est bon : les cartes non vues sont marquées manquantes.' : (r.expected ? '⚠️ Le compte ne correspond pas : je coche ce qui est reconnu, sans rien marquer manquant. Ajoute les captures oubliées.' : 'Sans le nombre affiché par le jeu, je coche seulement ce qui est reconnu.')}</li>`; }).join('');
    d.innerHTML = `<div class="mbox"><h2>Résumé de l'import</h2><ul class="list">${lines || '<li>Aucune capture envoyée.</li>'}</ul>
      <div class="grid" style="margin-top:10px"><div><div class="mute small">Cartes cochées</div><div class="cd">${own}</div></div><div><div class="mute small">Doublons à échanger</div><div class="cd">${dup}</div></div><div><div class="mute small">Manquantes (recherchées)</div><div class="cd">${miss}</div></div></div>
      <p class="small mute">Seuls les univers du Prestige (au moins 10 cartes) sont concernés.</p>
      <div class="row" style="margin-top:14px">${plan.length ? '<button class="btn primary" id="wok">Enregistrer dans ma collection</button>' : ''}<button class="btn ghost" id="wx">Fermer</button></div></div>`;
    d.querySelector('#wx').onclick = () => d.remove();
    const ok = d.querySelector('#wok'); if (ok) ok.onclick = async () => { ok.disabled = true; ok.textContent = 'Enregistrement…'; const touched = new Set();
      for (const [u, n, has, dupe] of plan) { const r = uget(coll, u.s); if (has) { r.owned.add(n); if (dupe) r.dupes.add(n); else r.dupes.delete(n); } else { r.owned.delete(n); r.dupes.delete(n); } touched.add(u); }
      for (const u of touched) await save(u); d.remove(); refresh(); toast('Collection mise à jour'); };
  };
  draw();
}

// Prix médian réel d'une carte (ventes des 14 derniers jours, toutes raretés), publié depuis le marché.
// Index nom → clés construit une seule fois par table de prix (avant : parcours de toutes les clés pour chaque carte, très lent).
const CPX = new WeakMap();
function cpIdx(M) { let ix = CPX.get(M); if (!ix) { ix = new Map(); for (const k of Object.keys(M)) { const n = k.slice(0, k.lastIndexOf('|')); const a = ix.get(n); if (a) a.push(k); else ix.set(n, [k]); } CPX.set(M, ix); } return ix; }
function cardPrice(name, series) { const pick = M => { let v = M[name + '|' + series]; if (v == null) { const ks = cpIdx(M).get(name) || []; if (ks.length === 1) v = M[ks[0]]; } return v; };
  const v = pick(S.kb.card_prices?.p || {}); if (v) return { med: v[0], n: v[1] }; const l = pick(S.kb.card_prices?.l || {}); return l ? { med: l, list: true } : null; }
// Ce qu'il manque pour compléter chaque univers du Prestige, avec le prix réel de chaque carte manquante.
function viewComplete(el, U, PS) {
  const coll = myColl(); let lim = 10;
  const rows = U.map(u => { const miss = u.c.filter(c => !coll[u.s]?.owned.has(c[0])); const pr = miss.map(c => cardPrice(c[0], u.s)); const known = pr.filter(Boolean); return { u, miss, pr, cost: known.reduce((a, x) => a + x.med, 0), unk: pr.length - known.length }; }).filter(x => x.miss.length).sort((a, b) => a.miss.length - b.miss.length || a.cost - b.cost);
  const draw = () => { const L = rows.filter(x => x.miss.length <= lim);
    el.innerHTML = `<p class="mute">Les univers du Prestige qui te restent à compléter, du plus proche au plus lointain. Sous chaque carte : son <b class="bone">prix médian réel</b> sur le marché (ventes des 14 derniers jours) ou, s'il n'y a pas eu de vente, le prix de l'annonce la moins chère en ce moment (« en vente »). Un univers complété rapporte <b>${PS.tokens || 3} jetons</b>.</p>
      <div class="row" style="margin-bottom:10px"><label class="small mute" for="clim" style="margin:0">Afficher les univers à</label><select id="clim" style="width:auto">${[3, 5, 10, 20, 999].map(n => `<option value="${n}" ${n === lim ? 'selected' : ''}>${n === 999 ? 'toutes' : n + ' cartes ou moins'}</option>`).join('')}</select><span class="small mute">${L.length} univers</span></div>
      ${L.map(x => `<div class="card section"><div class="row"><b>${esc(x.u.s)}</b><span class="sp"></span><span class="small">${x.miss.length} manquante${x.miss.length > 1 ? 's' : ''} · coût estimé <b class="bone">${fmt(x.cost)} KI</b>${x.unk ? ` <span class="mute">(+ ${x.unk} sans prix connu)</span>` : ''}</span></div>
        <div class="tiles" style="margin-top:10px">${x.miss.map((c, i) => tile(c, false, false, `<i class="price">${x.pr[i] ? (x.pr[i].list ? 'en vente ' : '') + fmt(x.pr[i].med) + ' KI' : 'pas de vente'}</i>`)).join('')}</div></div>`).join('') || '<div class="empty">Aucun univers dans cette tranche.</div>'}`;
    el.querySelector('#clim').onchange = e => { lim = +e.target.value; draw(); }; };
  draw();
}
// Classement de la Brigade : pourcentage de toutes les cartes du jeu possédées (collection déclarée sur le site).
async function viewRanking(el) {
  el.innerHTML = '<div class="empty">Chargement…</div>';
  const { data, error } = await sb.rpc('collection_ranking'); if (error) { el.innerHTML = `<div class="empty">Classement indisponible : ${esc(error.message)}</div>`; return; }
  const L = data || [], me = L.findIndex(r => r.user_id === S.user.id);
  el.innerHTML = `<p class="mute">Le pourcentage de toutes les cartes du jeu que chaque membre possède (hors Exclusives et Transcendantes), d'après la collection remplie sur le site : Communes, Rares, SR, SSR, UR et LR. Plus ta collection est à jour, plus ton rang est juste.</p>
    ${me >= 0 ? `<div class="card section"><div class="row"><b>Ton rang : ${me + 1}${me === 0 ? 'er' : 'e'} sur ${L.length}</b><span class="sp"></span><b class="bone">${String(L[me].pct).replace('.', ',')} %</b></div><div class="bar" style="margin-top:10px"><i style="width:${L[me].pct}%"></i></div><div class="small mute" style="margin-top:6px">${fmt(L[me].owned)} / ${fmt(L[me].total)} cartes</div></div>` : '<div class="msg">Tu n\'apparais pas encore : remplis ta collection pour entrer dans le classement.</div>'}
    <div class="tablewrap"><table class="webrank"><thead><tr><th class="n">#</th><th>Membre</th><th class="hide-sm">Rôle Nen</th><th>Collection</th><th class="n">%</th></tr></thead><tbody>${L.map((r, i) => `<tr ${r.user_id === S.user.id ? 'style="background:#1a1013"' : ''}><td class="n">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td><b>${esc(r.discord)}</b></td><td class="hide-sm">${r.nen ? `<span class="chip">${esc(r.nen)}</span>${r.level != null ? ` <span class="small mute">niv. ${r.level}</span>` : ''}` : '<span class="mute small">—</span>'}</td><td style="min-width:110px"><div class="bar"><i style="width:${r.pct}%"></i></div><div class="small mute">${fmt(r.owned)} / ${fmt(r.total)}</div></td><td class="n"><b>${String(r.pct).replace('.', ',')}</b></td></tr>`).join('') || '<tr><td colspan="5" class="mute">Personne n\'a encore rempli sa collection.</td></tr>'}</tbody></table></div>`;
}
// Mosaïque des cartes manquantes, comme dans la collection du jeu.
function viewMissing(el, U) {
  const coll = myColl(); let rf = '';
  const draw = () => { const L = U.flatMap(u => u.c.filter(c => !coll[u.s]?.owned.has(c[0]) && (!rf || c[1] === rf)).map(c => [u, c]));
    el.innerHTML = `<div class="row"><p class="mute" style="flex:1;margin:0">${L.length} carte${L.length > 1 ? 's' : ''} te manque${L.length > 1 ? 'nt' : ''} dans les univers du Prestige.</p><div class="tabs" id="mrf" style="margin:0">${[['', 'Toutes'], ['M', 'UR'], ['L', 'SSR'], ['R', 'R'], ['C', 'C']].map(([k, l]) => `<button data-r="${k}" class="${rf === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="mosaic">${L.map(([u, c]) => `<figure class="mcard r${c[1]}">${c[2] ? `<img loading="lazy" src="${img(c[2])}" alt="">` : ''}<span class="mtag">${RN[c[1]] || ''}</span><figcaption><b>${esc(c[0])}</b><small>${esc(u.s)}</small></figcaption></figure>`).join('') || '<div class="empty">Rien ne te manque 🎉</div>'}</div>`;
    el.querySelectorAll('#mrf button').forEach(b => b.onclick = () => { rf = b.dataset.r; draw(); }); };
  draw();
}

function viewMine(el, U, PS) {
  const coll = myColl(); const open = new Set(); let mode = 'own';
  const save = u => { const r = uget(coll, u.s); return sb.from('checklist').upsert({ user_id: S.user.id, universe: u.s, done: ownN(coll, u) === u.c.length, owned: [...r.owned], dupes: [...r.dupes], missing: '' }); };
  el.innerHTML = `<p class="mute">Les ${U.length} univers qui comptent pour le Prestige (au moins ${PS.min} cartes, hors Exclusives et Transcendantes). Touche les cartes que tu as : un univers complet rapporte <b>${PS.tokens || 3} jetons</b> avec « Récupérer +3 » dans l'onglet Prestige du jeu.</p>
    <div class="card section" id="sum"></div>
    <div class="row"><div class="tabs" id="md" style="margin:0"><button data-m="own" class="on">Je l'ai</button><button data-m="dupe">Doublon à échanger</button></div><input id="q" placeholder="Rechercher un univers ou une carte" style="flex:1;min-width:200px"><select id="fl" style="width:auto"><option value="">Tous</option><option value="near">Presque complets (≤ 3 manquantes)</option><option value="todo">À compléter</option><option value="done">Complétés</option></select></div>
    <p class="small mute" id="mh" style="margin-top:8px"></p><div id="ul" style="display:grid;gap:10px;margin-top:6px"></div>`;
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
const tile = (c, own, dupe, extra = '') => `<button class="tile r${c[1]} ${own ? 'on' : ''}" data-c="${esc(c[0])}" title="${esc(c[0])} · ${RN[c[1]] || ''}">${c[2] ? `<img loading="lazy" decoding="async" src="${img(c[2])}" alt="">` : '<div class="noimg"></div>'}${dupe ? `<b class="dup">×${typeof dupe === 'number' && dupe > 1 ? dupe : 2}</b>` : ''}<span>${esc(c[0])}</span>${extra}</button>`;

function memberStats(id, U) { const coll = S.coll[id] || {}; const done = U.filter(u => ownN(coll, u) === u.c.length).length; const got = U.reduce((a, u) => a + ownN(coll, u), 0); const du = U.reduce((a, u) => a + (coll[u.s]?.dupes.size || 0), 0); return { done, got, du }; }
function viewMembers(el, U) {
  const sharing = S.members.filter(p => p.share && p.id !== S.user.id);
  el.innerHTML = `<p class="mute">Les membres qui partagent leur collection. Touche un profil pour voir ses cartes manquantes et ses doublons.</p>
    <div class="card section"><h2>Qui cherche quoi</h2><input id="wq" placeholder="Tape une carte : qui la cherche, qui l'a en double ?"><div id="wr" style="margin-top:10px"></div></div>
    <div class="grid" id="ml">${sharing.map(p => { const s = memberStats(p.id, U); return `<a class="card" href="${memHref(p.id)}"><h3>${esc(p.discord)}</h3><div class="small mute">${s.done} univers complets · ${fmt(s.got)} cartes · ${s.du} doublon${s.du > 1 ? 's' : ''}</div></a>`; }).join('') || '<div class="empty">Personne ne partage encore sa collection. Active le partage dans ⚙️ Réglages pour lancer le mouvement.</div>'}</div>`;
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
  el.innerHTML = `<a href="${FUS() ? '#collection/L/membres' : '#checklist/membres'}" class="btn ghost" style="min-height:36px">← Membres</a>
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
  const tg = out.reduce((a, o) => a + o.get.length, 0), tv = out.reduce((a, o) => a + o.give.length, 0);
  el.innerHTML = `<div class="card section"><span class="chip red">Match automatique</span><h2 style="margin-top:10px">${out.length} membre${out.length > 1 ? 's' : ''} avec qui échanger</h2><p class="mute" style="margin:0">Le site croise en un clic les doublons et les cartes recherchées de tous les membres qui partagent leur collection : <b>${tg}</b> carte${tg > 1 ? 's' : ''} qu'on peut te donner, <b>${tv}</b> que tu peux donner. Il ne reste qu'à les contacter sur le Discord.</p><p class="small mute" style="margin:8px 0 0">Doublons et manquantes viennent de « Ma collection » (import SSR / UR ou à la main).</p></div>
    ${S.profile.share ? '' : '<div class="msg">Ta collection n\'est pas partagée : les autres ne te voient pas dans leurs échanges.</div>'}
    ${out.map(o => `<div class="card section"><div class="row"><h3 style="margin:0">${esc(o.p.discord)}</h3><span class="sp"></span>${o.give.length && o.get.length ? '<span class="chip ok">Échange gagnant-gagnant</span>' : ''}<button class="btn ghost" data-msg="${esc(o.p.id)}" style="min-height:36px">Copier un message</button><a class="btn ghost" href="${memHref(o.p.id)}" style="min-height:36px">Profil</a></div>
      <div class="small mute" style="margin-top:10px">Il peut te donner (${o.get.length})</div><div class="tiles">${o.get.map(c => tile(c, true, false)).join('') || '<span class="mute small">—</span>'}</div>
      <div class="small mute" style="margin-top:10px">Tu peux lui donner (${o.give.length})</div><div class="tiles">${o.give.map(c => tile(c, true, false)).join('') || '<span class="mute small">—</span>'}</div></div>`).join('') || '<div class="empty">Pas encore d\'échange possible. Plus il y a de membres qui partagent et déclarent leurs doublons, plus il y en aura.</div>'}`;
  el.querySelectorAll('[data-msg]').forEach(b => b.onclick = async () => { const o = out.find(x => x.p.id === b.dataset.msg); const txt = `Salut ${o.p.discord} ! Sur le site de la Brigade je vois que tu as en double : ${o.get.map(c => c[0]).join(', ') || '—'}. De mon côté j'ai en double ${o.give.map(c => c[0]).join(', ') || '—'}, qui te manque${o.give.length > 1 ? 'nt' : ''}. Ça te dit d'échanger ?`; try { await navigator.clipboard.writeText(txt); toast('Message copié : colle-le sur Discord'); } catch (e) { prompt('Copie ce message :', txt); } });
}

/* ---------- Collection SSR / UR : toutes les cartes de ces raretés (pas seulement les univers Prestige) ---------- */
// Univers construits à partir de la base de reconnaissance des cartes (toutes les SSR et toutes les UR du jeu).
function rarUniverses(r) {
  const base = S.feats?.base || 'https://yurocollection.fr/card-art/', by = new Map();
  for (const row of S.feats?.rows || []) { if (row[1] !== r) continue; const s = row[3] || '—'; if (!by.has(s)) by.set(s, { s, c: [] }); by.get(s).c.push([row[2], r, row[4] ? (/^https?:/.test(row[4]) ? row[4] : base + row[4] + '.webp') : '', Number(row[0])]); }
  return [...by.values()].sort((a, b) => a.s.localeCompare(b.s));
}
P.collection = async (m, tab = '') => {
  m.innerHTML = '<div class="empty">Chargement…</div>';
  await Promise.all([loadCollections(), loadFeats()]);
  const PSU = S.kb.prestige_series?.series || [];
  // Communes, Rares et SR : construites depuis le catalogue (comme dans le jeu), remplies par « ✍️ Communes / Rares / SR ».
  const catU = r => { const by = new Map(); for (const c of S.kb.card_catalog?.cards || []) { if (c[3] !== r || c[5]) continue; const s2 = c[2] || '—'; if (!by.has(s2)) by.set(s2, { s: s2, c: [] }); by.get(s2).c.push([c[1], r, c[4] || '', Number(c[0])]); } return [...by.values()].sort((a, b) => a.s.localeCompare(b.s)); };
  const R = { C: { label: 'C', tag: 'Commune', U: catU('C'), low: true }, R: { label: 'R', tag: 'Rare', U: catU('R'), low: true }, E: { label: 'SR', tag: 'Épique', U: catU('E'), low: true }, L: { label: 'SSR', tag: 'SSR (伝)', U: rarUniverses('L') }, M: { label: 'UR', tag: 'UR (神)', U: rarUniverses('M') }, S: { label: 'LR', tag: 'LR (秘)', U: rarUniverses('S'), lr: true } };
  const impFor = k => k === 'S' ? (location.hash = '#meslr') : R[k]?.low ? (location.hash = '#basses/' + k) : rarImport(k);
  await loadMyLR();
  let [rk, view, autoImp] = (tab || 'L/moi').split('/'); if (!R[rk]) rk = 'L'; const memId = view?.startsWith('m:') && FUS() ? view.slice(2) : null; if (memId) view = 'membres'; if (!['moi', 'doublons', 'manquantes', 'echanges', ...(FUS() ? ['completer', 'classement', 'membres'] : [])].includes(view)) view = 'moi';
  const realColl = myColl(); let coll = realColl;
  // Les LR (et leurs étoiles) vivent dans « Mes LR » : on les présente comme une collection pour l'affichage.
  const lrCollOf = (cards, dupes) => { const o = {}; for (const u of R.S.U) for (const c of u.c) if (cards?.[c[3]] != null) { const r = uget(o, u.s); r.owned.add(c[0]); const x = +(dupes?.[c[3]] || 0); if (x > 0) { r.dupes.add(c[0]); r.qty[c[0]] = x + 1; } } return o; };
  const lrColl = () => lrCollOf(S.mylr.cards, S.mylr.dupes);
  // LR des autres membres (profils partagés) pour les échanges de doublons LR.
  let lrRows = []; try { const { data } = await sb.from('my_lr').select('user_id,cards,dupes'); lrRows = data || []; } catch (e) { /* rien */ }
  const lrOf = id => { const r = lrRows.find(x => x.user_id === id); return r ? lrCollOf(r.cards, r.dupes) : {}; };
  const save = async u => { const r = uget(coll, u.s), pu = PSU.find(x => x.s === u.s); return sb.from('checklist').upsert({ user_id: S.user.id, universe: u.s, done: pu ? ownN(coll, pu) === pu.c.length : false, owned: [...r.owned], dupes: [...r.dupes], qty: r.qty || {}, missing: '' }); };
  // plusieurs univers d'un coup (par paquets de 100) : bien plus rapide sur téléphone qu'un envoi par univers
  const saveMany = async us => { const L = [...new Map([...us].map(u => [u.s, u])).values()].map(u => { const r = uget(coll, u.s), pu = PSU.find(x => x.s === u.s); return { user_id: S.user.id, universe: u.s, done: pu ? ownN(coll, pu) === pu.c.length : false, owned: [...r.owned], dupes: [...r.dupes], qty: r.qty || {}, missing: '' }; }); for (let i = 0; i < L.length; i += 100) { const { error } = await sb.from('checklist').upsert(L.slice(i, i + 100)); if (error) return error; } return null; };
  const has = (cl, u, n) => !!cl[u.s]?.owned.has(n), dup = (cl, u, n) => cl[u.s]?.dupes.has(n) ? (cl[u.s].qty?.[n] || true) : false;
  const draw = () => {
    coll = rk === 'S' ? lrColl() : realColl;
    const X = R[rk], U = X.U, total = U.reduce((a, u) => a + u.c.length, 0), got = U.reduce((a, u) => a + u.c.filter(c => has(coll, u, c[0])).length, 0), nd = U.reduce((a, u) => a + u.c.filter(c => dup(coll, u, c[0])).length, 0);
    history.replaceState(null, '', `#collection/${rk}/${view}`);
    m.innerHTML = `<div class="row" style="align-items:center"><h1 style="margin:0">Ma collection</h1><span class="sp"></span>${got ? `<button class="btn ghost" id="cupd" style="min-height:40px">${X.low ? '✍️ Mettre à jour' : '📷 Importer / mettre à jour'} mes ${X.label}</button>` : ''}<a class="btn ghost" href="#basses/C" style="min-height:40px">✍️ Communes / Rares / SR</a>${CLIC() ? '<a class="btn primary" href="#clic" style="min-height:40px">⚡ Import en 1 clic</a>' : ''}</div><p class="mute">Toutes tes SSR, UR et LR, rangées comme dans le jeu. ${CLIC() ? 'Sur ordinateur, l\'import en 1 clic remplit tout depuis le jeu ; sur téléphone, importe tes captures. Ensuite, ajuste à la main avec − / + (ou les étoiles pour les LR) quand ta collection change, ou relance l\'import en 1 clic.' : 'Importe tes captures pour tout remplir d\'un coup, puis ajuste à la main avec − / + (ou les étoiles pour les LR) quand ta collection change dans le jeu : le site ne peut pas lire ton compte YURO tout seul.'}</p>
      <div id="chist"></div>
      <div class="rtabs" id="cr">${Object.entries(R).map(([k, x]) => { const cl = k === 'S' ? lrColl() : realColl; const t = x.U.reduce((a, u) => a + u.c.length, 0), g = x.U.reduce((a, u) => a + u.c.filter(c => has(cl, u, c[0])).length, 0); return `<button data-k="${k}" class="rt-${k} ${k === rk ? 'on' : ''}"><i>${{ C: 'C', R: 'R', E: 'SR', L: '伝', M: '神', S: '秘' }[k]}</i><span><b>${x.label}</b><small>${g}/${t}</small></span></button>`; }).join('')}</div>
      <div class="card section" ${got ? 'style="display:none"' : ''}><div class="row"><b>${X.label} : ${got} / ${total} possédées</b><span class="sp"></span><span class="small mute">${nd} doublon${nd > 1 ? 's' : ''} · ${total - got} manquante${total - got > 1 ? 's' : ''}</span></div><div class="bar" style="margin-top:10px"><i style="width:${total ? got / total * 100 : 0}%"></i></div>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="cimp">📷 Importer seulement mes ${X.label}</button><span class="small mute">Étape ${rk === 'L' ? '1 : les SSR' : '2 : les UR'}. Les deux raretés sont importées et rangées séparément.</span></div>
        ${S.profile.share ? '' : '<p class="small mute" style="margin:8px 0 0">Ta collection n\'est pas partagée : active le partage dans <a href="#reglages">Réglages</a> pour apparaître dans les échanges.</p>'}</div>
      <div class="tabs" id="cv2" style="max-width:${FUS() ? 980 : 640}px">${[['moi', 'Ma collection'], ['doublons', 'Mes doublons'], ['manquantes', 'Manquantes'], ['echanges', 'Échanges'], ...(FUS() ? [['completer', '🏆 Univers à compléter'], ['classement', 'Classement'], ['membres', 'Membres']] : [])].map(([k, l]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="cbody" style="margin-top:14px"></div>`;
    // Sélection affichée tout de suite, puis la grille est construite à l'image suivante (plus de délai ressenti au clic).
    const later = f => requestAnimationFrame(() => setTimeout(f, 0));
    m.querySelectorAll('#cr button').forEach(b => b.onclick = () => { if (b.dataset.k === rk) return; rk = b.dataset.k; m.querySelectorAll('#cr button').forEach(x => x.classList.toggle('on', x === b)); $('#cbody').style.opacity = '.35'; later(draw); });
    m.querySelectorAll('#cv2 button').forEach(b => b.onclick = () => { if (b.dataset.v === view) return; view = b.dataset.v; m.querySelectorAll('#cv2 button').forEach(x => x.classList.toggle('on', x === b)); $('#cbody').style.opacity = '.35'; later(draw); });
    $('#cimp').onclick = () => impFor(rk); const cu = $('#cupd'); if (cu) cu.onclick = () => impFor(rk); 
    const PSX = S.kb.prestige_series || { series: [] }; const glob = ['completer', 'classement', 'membres'].includes(view);
    { const cr = m.querySelector('#cr'); if (cr) cr.style.display = glob ? 'none' : ''; }
    if (view === 'membres' && memId) { viewProfile($('#cbody'), PSX.series, memId); $('#cbody').style.opacity = ''; }
    else ({ moi: vMine, doublons: vDupes, manquantes: vMiss, echanges: vTrades, completer: el => { viewComplete(el, PSX.series, PSX); el.style.opacity = ''; }, classement: el => { viewRanking(el); el.style.opacity = ''; }, membres: el => { viewMembers(el, PSX.series); el.style.opacity = ''; } })[view]($('#cbody'), X);
    drawHist();
  };
  // Valeur estimée de la collection (prix médians réels) et % du jeu possédé, enregistrés une fois par jour pour suivre l'évolution.
  const collValue = () => { const seen = new Set(); let v = 0, n = 0; const add = (name, ser) => { const k = name + '|' + ser; if (seen.has(k)) return; seen.add(k); const p = cardPrice(name, ser); if (p && !p.list) { v += p.med; n++; } };
    for (const [ser, r] of Object.entries(realColl)) for (const name of r.owned || []) add(name, ser);
    for (const u of R.S.U) for (const c of u.c) if (S.mylr.cards[c[3]] != null) add(c[0], u.s); return { v, n }; };
  let hist = null, cvC = null; const collValueC = () => cvC || (cvC = collValue());
  const drawHist = () => { const el = $('#chist'); if (!el || !hist) return; const cv = collValueC(), H = hist.slice(-60), me = hist.me;
    const pts = H.filter(h => h.lr_value != null); const max = Math.max(1, ...pts.map(h => +h.lr_value)), min = Math.min(...pts.map(h => +h.lr_value), max);
    const dd = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), kfmt = v => v >= 1e6 ? (v / 1e6).toFixed(2).replace('.', ',') + ' M' : Math.round(v / 1000) + ' k';
    // Graphique : axe vertical = valeur de la collection (KI), axe horizontal = jours (une mesure par jour).
    const W = 300, X0 = 44, Y0 = 8, Y1 = 66, xs = i => X0 + (pts.length > 1 ? i / (pts.length - 1) : 0) * (W - X0 - 4), ys = v => Y1 - ((v - min) / Math.max(1, max - min)) * (Y1 - Y0);
    const path = pts.length > 1 ? pts.map((h, i) => `${xs(i).toFixed(1)},${ys(+h.lr_value).toFixed(1)}`).join(' ') : '';
    const first = pts[0], diff = first ? cv.v - first.lr_value : 0;
    el.innerHTML = `<div class="card section"><div class="row"><div><div class="small mute">Valeur estimée de ta collection</div><div class="cd">${fmt(cv.v)} <span class="small mute">KI</span></div></div><div><div class="small mute">Du jeu possédé</div><div class="cd">${me ? String(me.pct).replace('.', ',') + ' %' : '—'}</div></div>${first && pts.length > 1 ? `<div><div class="small mute">Gagné depuis ta 1re mesure (${dd(first.day)})</div><div class="cd ${diff >= 0 ? 'up' : 'red'}">${diff >= 0 ? '+' : ''}${fmt(diff)} <span class="small mute">KI</span></div></div>` : ''}<span class="sp"></span><a class="btn ghost" href="#checklist/classement" style="min-height:36px">🏆 Classement</a></div>
      ${path ? `<div class="small mute" style="margin-top:10px">Évolution de la valeur de ta collection (KI), une mesure par jour</div><svg viewBox="0 0 ${W} 84" class="spark" style="width:100%;height:auto;margin-top:4px;overflow:visible" role="img" aria-label="Valeur de la collection par jour">
        <line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}" stroke="#333" stroke-width="1"/><line x1="${X0}" y1="${Y1}" x2="${W - 4}" y2="${Y1}" stroke="#333" stroke-width="1"/>
        <line x1="${X0}" y1="${Y0}" x2="${W - 4}" y2="${Y0}" stroke="#222" stroke-dasharray="3 3"/>
        <text x="${X0 - 4}" y="${Y0 + 3}" text-anchor="end" font-size="8" fill="#9a9a9a">${kfmt(max)}</text><text x="${X0 - 4}" y="${Y1 + 3}" text-anchor="end" font-size="8" fill="#9a9a9a">${kfmt(min)}</text>
        <text x="${X0}" y="${Y1 + 13}" font-size="8" fill="#9a9a9a">${dd(first.day)}</text><text x="${W - 4}" y="${Y1 + 13}" text-anchor="end" font-size="8" fill="#9a9a9a">${dd(pts[pts.length - 1].day)}</text>
        <polyline points="${path}" fill="none" stroke="#ff3b54" stroke-width="2" stroke-linejoin="round"/>${pts.map((h, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(+h.lr_value).toFixed(1)}" r="2.2" fill="#ff3b54"><title>${dd(h.day)} : ${fmt(h.lr_value)} KI</title></circle>`).join('')}</svg>` : '<p class="small mute" style="margin:8px 0 0">La courbe d\'évolution apparaîtra dès demain (une mesure par jour).</p>'}
      <p class="small mute" style="margin:6px 0 0">Valeur = somme des prix médians réels (ventes des 14 derniers jours) de tes cartes, ${cv.n} cartes avec un prix connu, doublons non comptés. Elle monte quand tu ajoutes des cartes ou quand leurs prix montent.</p></div>`; };
  (async () => { try { const [{ data: h }, { data: rk }] = await Promise.all([sb.from('coll_snap').select('day,pct,lr_value').eq('user_id', S.user.id).order('day'), sb.rpc('collection_ranking')]);
    hist = h || []; hist.me = (rk || []).find(r => r.user_id === S.user.id) || null; const today = new Date().toISOString().slice(0, 10), cv = collValueC();
    if (cv.v > 0 && !hist.some(x => x.day === today)) { const row = { user_id: S.user.id, day: today, pct: hist.me?.pct ?? null, owned: hist.me?.owned ?? null, total: hist.me?.total ?? null, lr_value: Math.round(cv.v) }; await sb.from('coll_snap').upsert(row); hist.push(row); }
    drawHist(); } catch (e) { /* rien */ } })();
  function vMine(el, X) {
    let q = '', show = 'all', uni = '';
    const total = X.U.reduce((a, u) => a + u.c.length, 0), got = X.U.reduce((a, u) => a + u.c.filter(c => has(coll, u, c[0])).length, 0);
    if (!got) {
      el.innerHTML = `<div class="card section" style="text-align:center"><h2>Ta collection ${X.label} est vide pour l'instant</h2><p class="mute">Tu n'as rien à cocher toi-même : envoie tes captures du jeu et le site remplit tout seul tes ${X.label} possédées, tes doublons avec leur nombre (×2, ×3…) et les cartes qui te manquent.</p><button class="btn primary" id="cimp2" style="margin-top:8px">📷 Importer mes ${X.label}</button></div>`;
      el.querySelector('#cimp2').onclick = () => impFor(rk); return;
    }
    const st = u => ({ n: u.c.filter(c => has(coll, u, c[0])).length, t: u.c.length });
    const full = X.U.filter(u => st(u).n === u.c.length), part = X.U.filter(u => st(u).n < u.c.length);
    el.innerHTML = `<p class="small mute" style="margin-top:0">Comme dans le jeu, rangées par numéro : en couleur tes ${X.label} (×N = exemplaires), en gris celles qui te manquent. Sous chaque carte, <b>− / +</b> règle le nombre d'exemplaires (pour une LR : ses étoiles, puis − / + pour ses doublons en plus) : c'est comme ça que tu tiens ta collection à jour quand elle change dans le jeu.</p>
      <div class="cfilters"><input id="cq" placeholder="Rechercher une carte ou un univers">
        <div class="tabs" id="cs" style="margin:0">${[['all', `Toutes ${total}`], ['own', `Possédées ${got}`], ['miss', `Manquantes ${total - got}`]].map(([k, l]) => `<button data-s="${k}" class="${k === show ? 'on' : ''}">${l}</button>`).join('')}</div>
        <select id="cuf"><option value="">✅ Univers complets (${full.length})</option>${full.map(u => `<option value="${esc(u.s)}">${esc(u.s)} · ${u.c.length}/${u.c.length}</option>`).join('')}</select>
        <select id="cup"><option value="">🧩 Univers incomplets (${part.length})</option>${part.map(u => { const k = st(u); return `<option value="${esc(u.s)}">${esc(u.s)} · ${k.n}/${k.t}</option>`; }).join('')}</select>
        <button class="btn ghost" id="cux" style="min-height:40px;display:none">✕ Tous les univers</button></div>
      <p class="small mute" id="cinfo" style="margin:8px 0 0"></p><div id="cl"></div>`;
    const list = () => {
      let L = X.U.flatMap(u => u.c.map(c => [u, c, coll[u.s]?.qty?.[c[0]] || (dup(coll, u, c[0]) ? 2 : 1), has(coll, u, c[0])]));
      if (uni) L = L.filter(x => x[0].s === uni);
      if (q) L = L.filter(x => x[1][0].toLowerCase().includes(q) || x[0].s.toLowerCase().includes(q));
      if (show === 'own') L = L.filter(x => x[3]); else if (show === 'miss') L = L.filter(x => !x[3]);
      L.sort((a, b) => (S.serial?.get(a[1][3]) || 9e9) - (S.serial?.get(b[1][3]) || 9e9));
      el.querySelector('#cinfo').textContent = `${L.length} carte${L.length > 1 ? 's' : ''} affichée${L.length > 1 ? 's' : ''}${uni ? ' · ' + uni : ''}`;
      el.querySelector('#cl').innerHTML = mosaic(L, 'Aucune carte.', true);
      bindEdit(el.querySelector('#cl'), X, list);
    };
    const pickUni = v => { uni = v; el.querySelector('#cuf').value = full.some(u => u.s === v) ? v : ''; el.querySelector('#cup').value = part.some(u => u.s === v) ? v : ''; el.querySelector('#cux').style.display = v ? '' : 'none'; list(); };
    el.querySelector('#cuf').onchange = e => pickUni(e.target.value); el.querySelector('#cup').onchange = e => pickUni(e.target.value); el.querySelector('#cux').onclick = () => pickUni('');
    el.querySelectorAll('#cs button').forEach(b => b.onclick = () => { show = b.dataset.s; el.querySelectorAll('#cs button').forEach(x => x.classList.toggle('on', x === b)); list(); });
    el.querySelector('#cq').oninput = e => { q = e.target.value.toLowerCase().trim(); list(); }; list();
  }
  // Correction à la main, carte par carte : − / + règle le nombre d'exemplaires (SSR, UR), les étoiles règlent une LR.
  function bindEdit(box, X, after) {
    box.querySelectorAll('.mstep').forEach(bar => bar.onclick = async e => {
      const bt = e.target.closest('button'); if (!bt || bt.disabled) return;
      const u = X.U.find(x => x.s === bar.dataset.u), c = u?.c.find(x => x[0] === bar.dataset.c); if (!c) return;
      if (c[1] === 'S') { S.mylr.dupes = S.mylr.dupes || {}; if (bt.dataset.ld != null) { const x = Math.max(0, Math.min(99, (+S.mylr.dupes[c[3]] || 0) + (+bt.dataset.ld))); if (x) S.mylr.dupes[c[3]] = x; else delete S.mylr.dupes[c[3]]; } else if (bt.dataset.x != null) { delete S.mylr.cards[c[3]]; delete S.mylr.dupes[c[3]]; } else if (bt.dataset.sk != null) { const k = +bt.dataset.sk, cur = +(S.mylr.cards[c[3]] || 0); S.mylr.cards[c[3]] = cur === k ? k - 1 : k; } else S.mylr.cards[c[3]] = +bt.dataset.st; cvC = null; await saveMyLR(); after(); return; }
      const r = uget(realColl, u.s); let n = r.owned.has(c[0]) ? (r.dupes.has(c[0]) ? (r.qty[c[0]] || 2) : 1) : 0; n = Math.max(0, Math.min(999, n + (+bt.dataset.d)));
      if (n === 0) { r.owned.delete(c[0]); r.dupes.delete(c[0]); delete r.qty[c[0]]; } else { r.owned.add(c[0]); if (n >= 2) { r.dupes.add(c[0]); r.qty[c[0]] = n; } else { r.dupes.delete(c[0]); delete r.qty[c[0]]; } }
      bar.querySelector('b') && (bar.querySelector('b').textContent = n ? '×' + n : 'Manquante');
      cvC = null; clearTimeout(bindEdit.t); bindEdit.t = setTimeout(async () => { await save(u); after(); }, 500);
    });
  }
  const mosaic = (L, empty, color) => `<div class="mosaic">${L.map(([u, c, n, own]) => { const sn = S.serial?.get(c[3]); const o = color ? own : true; const lr = c[1] === 'S'; const st = lr ? S.mylr.cards[c[3]] : null;
    const ctl = !color ? '' : lr ? `<div class="mstep" data-u="${esc(u.s)}" data-c="${esc(c[0])}">${own ? `<span class="stars5" role="group" aria-label="Étoiles">${[1, 2, 3, 4, 5].map(k => `<button data-sk="${k}" class="${st >= k ? 'on' : ''}" aria-label="${k} étoile${k > 1 ? 's' : ''}">★</button>`).join('')}</span><button data-x="0" class="rm" title="Je ne l'ai pas" aria-label="Je ne l'ai pas">✕</button>` : '<button data-st="0" class="add">+ Je l\'ai</button>'}</div>${own ? `<div class="mstep ldup" data-u="${esc(u.s)}" data-c="${esc(c[0])}" title="Exemplaires en plus de ta carte (après les montées d'étoiles)"><button data-ld="-1" ${n > 1 ? '' : 'disabled'}>−</button><b class="dlb"><small>doublons</small>${n - 1}</b><button data-ld="1">+</button></div>` : ''}`
      : `<div class="mstep" data-u="${esc(u.s)}" data-c="${esc(c[0])}"><button data-d="-1" ${own ? '' : 'disabled'}>−</button><b>${own ? '×' + n : 'Manquante'}</b><button data-d="1">+</button></div>`;
    return `<div class="mcell"><figure class="mcard r${c[1]} ${color ? (own ? 'own' : 'miss') : ''}" data-u="${esc(u.s)}" data-c="${esc(c[0])}">${c[2] ? `<img loading="lazy" src="${img(c[2])}" alt="">` : ''}<span class="mtag">${({ M: 'UR', L: 'SSR', S: 'LR', E: 'SR', R: 'R', C: 'C' })[c[1]] || RN[c[1]] || ''}${lr && own ? ` · <span class="st">${st}★</span>${n > 1 ? ` · ×${n}` : ''}` : o && n > 1 ? ` · ×${n}` : ''}</span>${sn ? `<span class="mnum">#${String(sn).padStart(3, '0')}</span>` : ''}<figcaption><b>${esc(c[0])}</b><small>${esc(u.s)}</small></figcaption></figure>${ctl}</div>`; }).join('') || `<div class="empty">${empty}</div>`}</div>`;
  function vDupes(el, X) { const L = X.U.flatMap(u => u.c.filter(c => dup(coll, u, c[0])).map(c => [u, c, coll[u.s]?.qty?.[c[0]] || 2, true])); const extra = L.reduce((a, x) => a + x[2] - 1, 0); el.innerHTML = `<p class="mute">${L.length} ${X.label} en double, soit ${extra} exemplaire${extra > 1 ? 's' : ''} à échanger (on garde toujours 1 exemplaire de chaque).</p>` + mosaic(L, 'Aucun doublon. Importe tes captures : les cartes à ×2 et plus y sont ajoutées avec leur nombre.', true); bindEdit(el, X, () => vDupes(el, X)); }
  function vMiss(el, X) { const L = X.U.flatMap(u => u.c.filter(c => !has(coll, u, c[0])).map(c => [u, c, 0, false])); el.innerHTML = `<p class="mute">${L.length} ${X.label} te manquent : elles sont affichées comme recherchées auprès de la Brigade. Touche une carte pour voir qui l’a en double.</p>` + mosaic(L, 'Rien ne te manque 🎉', true); bindEdit(el, X, () => vMiss(el, X));
    // Touche une carte manquante : qui l'a en double dans la Brigade (pour lui proposer un échange sur Discord).
    el.querySelectorAll('figure.mcard').forEach(f => { f.style.cursor = 'pointer'; f.onclick = () => { const u = X.U.find(x => x.s === f.dataset.u), cn = f.dataset.c; if (!u) return;
      const who = []; for (const p of S.members) { if (!p.share || p.id === S.user.id) continue; const th = X.lr ? lrOf(p.id) : (S.coll[p.id] || {}); const q = dup(th, u, cn); if (q) who.push({ p, n: q === true ? 2 : +q }); }
      who.sort((a, b) => b.n - a.n);
      const d = document.createElement('div'); d.className = 'modal'; document.body.appendChild(d);
      d.innerHTML = `<div class="mbox"><span class="chip red">${X.label}</span><h2 style="margin-top:10px">${esc(cn)}</h2><p class="small mute" style="margin-top:0">${esc(u.s)} · ${who.length ? `${who.length} membre${who.length > 1 ? 's l\u2019ont' : ' l\u2019a'} en double : contacte-${who.length > 1 ? 'les' : 'le'} sur Discord pour proposer un échange.` : 'Personne ne l\u2019a en double pour l\u2019instant (parmi les membres qui partagent leur collection).'}</p>`
        + who.map(w => `<div class="row" style="align-items:center;margin:6px 0"><b style="flex:1">${esc(w.p.discord || '?')}</b><span class="small mute">${w.n - 1} en plus</span><a class="btn ghost" href="${memHref(w.p.id)}" style="min-height:34px">Profil</a></div>`).join('')
        + `<div class="row" style="margin-top:12px"><button class="btn ghost" id="wx">Fermer</button></div></div>`;
      d.querySelector('#wx').onclick = () => d.remove(); d.onclick = e => { if (e.target === d) d.remove(); }; d.querySelectorAll('a').forEach(a => a.addEventListener('click', () => d.remove())); }; });
  }
  function vTrades(el, X) {
    const out = [];
    for (const p of S.members) { if (!p.share || p.id === S.user.id) continue; const th = X.lr ? lrOf(p.id) : (S.coll[p.id] || {}); const give = [], get = [];
      for (const u of X.U) for (const c of u.c) { if (dup(th, u, c[0]) && !has(coll, u, c[0])) get.push(c); if (dup(coll, u, c[0]) && !has(th, u, c[0])) give.push(c); }
      if (give.length || get.length) out.push({ p, give, get, score: Math.min(give.length, get.length) * 10 + give.length + get.length }); }
    out.sort((a, b) => b.score - a.score);
    el.innerHTML = `<p class="mute">Le site croise tes doublons ${X.label} avec les ${X.label} qui manquent aux autres membres, et inversement.</p>` + (out.map(o => `<div class="card section"><div class="row"><h3 style="margin:0">${esc(o.p.discord)}</h3><span class="sp"></span>${o.give.length && o.get.length ? '<span class="chip ok">Échange gagnant-gagnant</span>' : ''}<a class="btn ghost" href="${memHref(o.p.id)}" style="min-height:36px">Profil</a></div>
      <div class="small mute" style="margin-top:10px">Il peut te donner (${o.get.length})</div><div class="tiles">${o.get.map(c => tile(c, true, false)).join('') || '<span class="mute small">—</span>'}</div>
      <div class="small mute" style="margin-top:10px">Tu peux lui donner (${o.give.length})</div><div class="tiles">${o.give.map(c => tile(c, true, false)).join('') || '<span class="mute small">—</span>'}</div></div>`).join('') || '<div class="empty">Pas encore d\'échange possible sur les ' + X.label + '. Plus il y a de membres qui importent leur collection et la partagent, plus il y en aura.</div>');
  }
  // Import d'une seule rareté (SSR ou UR) : reconnaissance par l'illustration, ×N lu sur la capture, contrôle du nombre affiché par le jeu.
  function rarImport(r) {
    const X = R[r], keyOf = (n, s2) => nsp(n) + '|' + nsp(s2);
    const d = document.createElement('div'); d.className = 'modal'; document.body.appendChild(d);
    d.innerHTML = `<div class="mbox"><span class="chip red">${r === 'L' ? 'Étape 1 / 2 · SSR' : 'Étape 2 / 2 · UR'}</span><h2 style="margin-top:10px">Importer tes ${X.label}</h2>
      <ol class="list"><li>Dans le jeu : <b>Collection</b> → filtre <b>${X.tag}</b> → <b>Possédées</b>.</li><li>Fais défiler et prends des captures jusqu'à voir <b>toutes</b> tes ${X.label} (tu peux aussi envoyer un <b>.zip</b> de captures). Fais-les se chevaucher un peu : une carte coupée en haut ou en bas est ignorée, et une carte vue deux fois n'est comptée qu'une fois.</li><li>Note le nombre affiché par le jeu à côté du filtre (par ex. « 392 / 414 » → 392).</li></ol>
      <label for="rn">Nombre de ${X.label} possédées affiché par le jeu (au plus ${X.U.reduce((a, u) => a + u.c.length, 0)})</label><input id="rn" type="number" min="0" max="${X.U.reduce((a, u) => a + u.c.length, 0)}" placeholder="ex. 392" oninput="if(+this.value>+this.max)this.value=this.max;if(+this.value<0)this.value=0">
      <div class="row" style="margin-top:12px">${scanFiles('rf', `Envoyer mes captures ${X.label}`, async files => { const t = d.querySelector('#rst'); try { const res = await runScan(files, [r], true, t); res.expected = +d.querySelector('#rn').value || null; summary(res); } catch (e) { t.textContent = 'La lecture a échoué : ' + e.message; } })}<button class="btn ghost" id="rx">Fermer</button></div><p class="small mute" id="rst"></p></div>`;
    d.querySelector('#rx').onclick = () => d.remove();
    lockUntilCount(d.querySelector('#rn'), 'rf');
    if (isPreview() && new URLSearchParams(location.search).has('demo')) { const all = X.U.flatMap(u => u.c.map(c => ({ name: c[0], series: u.s, qty: 1 }))); [2, 1, 3, 1, 4, 2, 1, 2].forEach((q, i) => { if (all[i]) { all[i].qty = q; all[i].unsure = i % 2 === 0 || i === 7; } }); summary({ cards: all, expected: all.length }); const ok = document.querySelector('#rok'); if (ok) { ok.disabled = true; ok.textContent = 'Enregistrer (désactivé en démo)'; ok.onclick = null; } }
    function summary(res) {
      const got = new Map(res.cards.map(c => [keyOf(c.name, c.series), c]));
      const complete = res.expected ? Math.abs(res.cards.length - res.expected) <= Math.max(1, res.expected * .01) : false;
      const plan = []; let own = 0, dupN = 0, miss = 0;
      for (const u of X.U) for (const c of u.c) { const g = got.get(keyOf(c[0], u.s)); if (g) { plan.push([u, c, true, g.qty >= 2, g.qty, g]); own++; if (g.qty >= 2) dupN++; } else if (complete) { plan.push([u, c, false, false, 0]); miss++; } }
      const dl = plan.filter(p => p[3]).sort((a, b) => b[4] - a[4]);
      d.innerHTML = `<div class="mbox"><h2>${X.label} : résultat de l'import</h2>
        <p>${res.cards.length} ${X.label} reconnue${res.cards.length > 1 ? 's' : ''}${res.expected ? ` sur ${res.expected} annoncées par le jeu` : ''}${res.unknown ? `, ${res.unknown} carte${res.unknown > 1 ? 's' : ''} non reconnue${res.unknown > 1 ? 's' : ''}` : ''}.</p>
        <p class="small ${complete ? 'up' : 'mute'}">${complete ? '✓ Le compte est bon : les cartes non vues sont marquées manquantes (recherchées).' : res.expected ? '⚠️ Le compte ne correspond pas tout à fait : j\'enregistre ce qui est reconnu, sans rien marquer manquant. Tu pourras compléter plus tard (Ma collection → − / +, ou refaire l\'import).' : 'Sans le nombre affiché par le jeu, je coche seulement ce qui est reconnu, sans marquer de manquantes.'}</p>
        <div class="grid" style="margin-top:10px"><div><div class="mute small">Possédées</div><div class="cd">${own}</div></div><div><div class="mute small">Doublons (×2 et plus)</div><div class="cd">${dupN}</div></div><div><div class="mute small">Manquantes</div><div class="cd">${miss}</div></div></div>
        ${dl.length ? `<details class="small" style="margin-top:8px"><summary>Voir les doublons lus (${dl.length})</summary><div class="tiles" style="margin-top:8px">${dl.map(p => tile(p[1], true, true, `<i class="small">×${p[4]}</i>`)).join('')}</div></details>` : ''}
        ${miss ? `<details class="small" style="margin-top:8px"><summary>Voir les manquantes (${miss})</summary><div class="tiles" style="margin-top:8px">${plan.filter(p => !p[2]).map(p => tile(p[1], false, false)).join('')}</div></details>` : ''}
        ${(() => { const un = plan.filter(p => p[5]?.unsure); return un.length ? `<div class="card" style="margin-top:12px;border-color:#f3c26b"><b>⚠️ ${un.length} nombre${un.length > 1 ? 's' : ''} d'exemplaires à vérifier</b><p class="small mute" style="margin:4px 0 8px">La capture est trop floue pour lire le ×N sans risque d'erreur. Compare avec le jeu et corrige avec − / + avant d'enregistrer.</p><div class="mosaic">${un.map((p, i) => `<div class="mcell"><figure class="mcard own r${p[1][1]}">${p[1][2] ? `<img src="${img(p[1][2])}" alt="">` : ''}<figcaption><b>${esc(p[1][0])}</b><small>${esc(p[0].s)}</small></figcaption></figure><div class="mstep" data-ui="${plan.indexOf(p)}"><button data-d="-1">−</button><b>×${p[5].qty}</b><button data-d="1">+</button></div></div>`).join('')}</div></div>` : ''; })()}
        <div class="row" style="margin-top:14px">${plan.length ? '<button class="btn primary" id="rok">Enregistrer</button>' : ''}<button class="btn ghost" id="rx">Fermer</button></div></div>`;
      d.querySelector('#rx').onclick = () => d.remove();
      d.querySelectorAll('[data-ui]').forEach(bar => bar.onclick = e => { const bt = e.target.closest('button'); if (!bt) return; const g = plan[+bar.dataset.ui][5]; g.qty = Math.max(1, g.qty + (+bt.dataset.d)); bar.querySelector('b').textContent = '×' + g.qty; });
      const ok = d.querySelector('#rok'); if (ok) ok.onclick = async () => { ok.disabled = true; ok.textContent = 'Enregistrement…'; const touched = new Set();
        for (const p of plan) { if (p[5]) { p[3] = p[5].qty >= 2; p[4] = p[5].qty; } }
        for (const [u, c, h, du, qn] of plan) { const rr = uget(coll, u.s); if (h) { rr.owned.add(c[0]); if (du) { rr.dupes.add(c[0]); rr.qty[c[0]] = qn; } else { rr.dupes.delete(c[0]); delete rr.qty[c[0]]; } } else { rr.owned.delete(c[0]); rr.dupes.delete(c[0]); delete rr.qty[c[0]]; } touched.add(u); }
        const er = await saveMany(touched); if (er) { toast('Enregistrement refusé : ' + er.message + ' — réessaie.'); ok.disabled = false; ok.textContent = 'Enregistrer'; return; } d.remove(); toast(`${X.label} enregistrées`);
        const onb = !S.mylr?.teams?.done; if (complete || res.expected === 0 || res.cards.length) { S.mylr.teams = { ...(S.mylr.teams || {}), [r === 'L' ? 'ssr' : 'ur']: true }; await saveMyLR(); }
        if (onb) { const T2 = S.mylr.teams || {}; location.hash = r === 'L' && T2.ssr && !T2.ur ? '#collection/M/moi/import' : r === 'M' && T2.ur && !T2.lr ? '#meslr' : '#bienvenue'; return; } if (r === 'L') { rk = 'M'; } draw(); };
    }
  }
  // Import de toute la collection en une fois (captures ou .zip mélangeant LR, SSR et UR) : chaque carte est rangée selon sa rareté.
  function allImport() {
    const keyOf = (n, s2) => nsp(n) + '|' + nsp(s2), tot = k => R[k].U.reduce((a, u) => a + u.c.length, 0);
    const d = document.createElement('div'); d.className = 'modal'; document.body.appendChild(d);
    d.innerHTML = `<div class="mbox"><span class="chip red">LR + SSR + UR</span><h2 style="margin-top:10px">Importer toute ta collection</h2>
      <ol class="list"><li>Dans le jeu : <b>Collection</b> → <b>Possédées</b>, puis prends des captures de tes LR, de tes SSR et de tes UR (un filtre après l'autre, en faisant défiler jusqu'en bas). Fais-les se chevaucher un peu.</li><li>Envoie tout d'un coup : les images, ou un <b>.zip</b> qui les regroupe. Le site range chaque carte selon sa rareté.</li><li>Note les nombres affichés par le jeu à côté des filtres SSR et UR (ex. « 402 / 414 » → 402).</li></ol>
      <div class="grid"><div><label for="an1">SSR possédées (au plus ${tot('L')})</label><input id="an1" type="number" min="0" max="${tot('L')}" placeholder="ex. 402" oninput="if(+this.value>+this.max)this.value=this.max"></div><div><label for="an2">UR possédées (au plus ${tot('M')})</label><input id="an2" type="number" min="0" max="${tot('M')}" placeholder="ex. 153" oninput="if(+this.value>+this.max)this.value=this.max"></div></div>
      <div class="row" style="margin-top:12px">${scanFiles('af2', 'Envoyer mes captures (ou un .zip)', async files => { const t = d.querySelector('#ast'); try { const res = await runScan(files, ['S', 'L', 'M'], true, t); const e1 = d.querySelector('#an1').value, e2 = d.querySelector('#an2').value; step(res, e1 === '' ? null : +e1, e2 === '' ? null : +e2); } catch (e) { t.textContent = 'La lecture a échoué : ' + e.message; } })}<button class="btn ghost" id="ax">Fermer</button></div><p class="small mute" id="ast"></p></div>`;
    d.querySelector('#ax').onclick = () => d.remove(); lockUntilCount([d.querySelector('#an1'), d.querySelector('#an2')], 'af2');
    function step(res, e1, e2) {
      const lr = { ...res, cards: res.cards.filter(c => c.r === 'S') };
      d.innerHTML = '<div class="mbox"><p class="mute">Vérifie d\'abord tes LR et leurs étoiles…</p></div>';
      const goOn = async () => { d.remove(); summary(res, e1, e2); };
      if (lr.cards.length) lrScanDialog(lr, S.mylr.cards, async n => { if (n) { S.mylr.teams = { ...(S.mylr.teams || {}), lr: true }; await saveMyLR(); } await goOn(); }); else goOn();
    }
    function summary(res, e1, e2) {
      const out = { L: { exp: e1 }, M: { exp: e2 } };
      for (const k of ['L', 'M']) { const cards = res.cards.filter(c => c.r === k), got = new Map(cards.map(c => [keyOf(c.name, c.series), c])), o = out[k];
        o.n = cards.length; o.complete = o.exp != null && (o.exp === 0 ? cards.length === 0 : Math.abs(cards.length - o.exp) <= Math.max(1, o.exp * .01)); o.plan = []; o.own = 0; o.dup = 0; o.miss = 0;
        for (const u of R[k].U) for (const c of u.c) { const g = got.get(keyOf(c[0], u.s)); if (g) { o.plan.push([u, c, true, g.qty >= 2, g.qty]); o.own++; if (g.qty >= 2) o.dup++; } else if (o.complete) { o.plan.push([u, c, false, false, 0]); o.miss++; } } }
      const line = k => { const o = out[k]; return `<div class="card" style="margin:8px 0"><b>${R[k].label} : ${o.n} reconnue${o.n > 1 ? 's' : ''}${o.exp != null ? ` sur ${o.exp}` : ''}</b><p class="small ${o.complete ? 'up' : 'mute'}" style="margin:4px 0">${o.complete ? '✓ Le compte est bon' : o.exp != null ? '⚠️ Le compte ne correspond pas : rien n\'est marqué manquant, ajoute les captures oubliées et relance.' : 'Sans le nombre du jeu, rien n\'est marqué manquant.'}</p><span class="small mute">${o.own} possédées · ${o.dup} en double · ${o.miss} manquantes</span></div>`; };
      const d2 = document.createElement('div'); d2.className = 'modal'; document.body.appendChild(d2);
      d2.innerHTML = `<div class="mbox"><h2>Résultat de l'import</h2>${res.unknown ? `<p class="small mute">${res.unknown} carte${res.unknown > 1 ? 's' : ''} non reconnue${res.unknown > 1 ? 's' : ''} (coupées ou floues).</p>` : ''}${line('L')}${line('M')}<div class="row" style="margin-top:14px"><button class="btn primary" id="aok">Enregistrer</button><button class="btn ghost" id="ax2">Fermer</button></div></div>`;
      d2.querySelector('#ax2').onclick = () => d2.remove();
      d2.querySelector('#aok').onclick = async () => { const b = d2.querySelector('#aok'); b.disabled = true; b.textContent = 'Enregistrement…'; const touched = new Set();
        for (const k of ['L', 'M']) for (const [u, c, h, du, qn] of out[k].plan) { const rr = uget(coll, u.s); if (h) { rr.owned.add(c[0]); if (du) { rr.dupes.add(c[0]); rr.qty[c[0]] = qn; } else { rr.dupes.delete(c[0]); delete rr.qty[c[0]]; } } else { rr.owned.delete(c[0]); rr.dupes.delete(c[0]); delete rr.qty[c[0]]; } touched.add(u); }
        const er = await saveMany(touched); if (er) { toast('Enregistrement refusé : ' + er.message + ' — réessaie.'); b.disabled = false; b.textContent = 'Enregistrer'; return; }
        const f = { ...(S.mylr.teams || {}) }; if (out.L.complete || out.L.n) f.ssr = true; if (out.M.complete || out.M.n) f.ur = true; S.mylr.teams = f; await saveMyLR();
        d2.remove(); toast('Collection enregistrée'); if (!S.mylr.teams.done) { location.hash = '#bienvenue'; return; } draw(); };
    }
  }
  draw(); if (autoImp === 'import' || autoImp === 'all') rarImport(rk);
};

/* ---------- Alertes marché : notification dès qu'une carte est mise en vente à ton prix ou moins ---------- */
// UR (Mythiques) de base qui servent aux évolutions : on peut aussi poser une alerte dessus.
const ALERT_UR = ['Enrico Pucci', 'Ichigo Kurosaki', 'Saitama', 'Sousuke Aizen', 'Sukuna', 'Vegeta'];
const VAPID_PUBLIC = 'BAro-7SSHwAMamNqEF6atBsW5IEsJR5L_64Mg0yvxWlVFCb5J4lPuRzKfW7KhoOHuswxKImQZt7-inCXV_tPnZ8';
async function loadWatch() { const { data } = await sb.from('content').select('data').eq('key', 'market_watch').maybeSingle(); S.watch = data?.data || { cards: {} }; return S.watch; }
async function loadAlerts() { const { data } = await sb.from('alerts').select('*').eq('user_id', S.user.id); S.alerts = data || []; return S.alerts; }
function firedAlerts() { const W = S.watch?.cards || {}; return (S.alerts || []).filter(a => { const w = W[a.card]; return a.max_price && w && w.min != null && w.min <= a.max_price; }).map(a => ({ ...a, now: W[a.card].min, lim: a.max_price })); }
const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function pushSub(create) {
  if (!pushOk()) return null;
  const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) { const k = Uint8Array.from(atob(VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID_PUBLIC.length % 4) % 4)), c => c.charCodeAt(0)); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: k }); }
  if (sub) { const j = sub.toJSON(); await sb.from('push_subs').upsert({ endpoint: j.endpoint, user_id: S.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 200) }); }
  return sub;
}

P.alertes = async m => {
  await Promise.all([loadWatch(), loadAlerts()]);
  const lr = S.kb.cards.filter(c => !c.r).map(c => c.n).sort((a, b) => a.localeCompare(b));
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Marché</span><h1 style="margin-top:12px">Alertes marché</h1><p class="mute">Choisis une LR (ou une UR d'évolution : Pucci, Ichigo, Saitama, Aizen, Sukuna, Vegeta) et ton prix max. Dès qu'elle est mise en vente à ton prix <b>ou moins</b>, tu reçois une notification, même site fermé.</p></section>
    <div class="notifcard" id="ncard"><div class="nc-ico">${SPIDER}</div><div class="nc-t"><b>Notifications Brigade</b><span id="ans">Vérification…</span></div><div class="nc-act"><button class="btn primary" id="an">${ico('bell')} Activer</button><button class="btn ghost" id="at" style="display:none">Tester</button></div><ol class="nc-ios" id="nios" style="display:none"><li><i>⬆️</i>Touche <b>Partager</b> en bas de Safari</li><li><i>➕</i>Choisis <b>Sur l'écran d'accueil</b></li><li><i>🕷</i>Ouvre le site depuis l'icône, puis reviens ici</li></ol></div>
    <div class="card section"><h2>Nouvelle alerte</h2><div class="row"><div style="flex:2;min-width:200px"><label for="ac">Carte</label><select id="ac"><optgroup label="LR">${lr.map(n => `<option>${esc(n)}</option>`).join('')}</optgroup><optgroup label="UR (pour les évolutions)">${ALERT_UR.map(n => `<option>${esc(n)}</option>`).join('')}</optgroup></select></div><div style="flex:1;min-width:160px"><label for="ap">Ton prix max (KI)</label><input id="ap" type="number" min="1" placeholder="ex. 60000"></div><div style="align-self:flex-end"><button class="btn primary" id="aa">Ajouter</button></div></div><p class="small mute" id="ah"></p></div>
    <div id="al"></div><div class="section"><h2>Dernières alertes reçues</h2><p class="small mute">Les notifications envoyées pour tes alertes, avec le repère du guide des prix : en vert, une vraie bonne affaire (sous le bon prix).</p><div class="tablewrap"><table><thead><tr><th>Quand</th><th>Carte</th><th class="n">Prix</th><th class="n hide-sm">Bon prix</th><th class="n">Écart</th></tr></thead><tbody id="ahist"><tr><td colspan="5" class="mute">Chargement…</td></tr></tbody></table></div></div><details class="card section cmpbox"><summary><b>Nos alertes ou celles du jeu ?</b><span class="small mute"> Ce qui change</span></summary><div class="cmp"><div class="cmp-r cmp-h"><div></div><div>Brigade</div><div>Jeu</div></div><div class="cmp-r"><div class="cmp-l">Nombre d\'alertes</div><div class="cmp-a win">Illimité</div><div class="cmp-b ">20 maximum</div></div><div class="cmp-r"><div class="cmp-l">Où tu es prévenu</div><div class="cmp-a win">Notification sur ton téléphone ou ton ordinateur</div><div class="cmp-b ">Seulement dans le jeu</div></div><div class="cmp-r"><div class="cmp-l">Jeu fermé</div><div class="cmp-a win">Tu es prévenu quand même</div><div class="cmp-b ">Rien</div></div><div class="cmp-r"><div class="cmp-l">Inactif sur le jeu</div><div class="cmp-a win">Tu es prévenu quand même</div><div class="cmp-b ">Plus de vérification</div></div><div class="cmp-r"><div class="cmp-l">Plusieurs appareils</div><div class="cmp-a win">Liées à ton compte, partout</div><div class="cmp-b ">À refaire sur chaque appareil</div></div><div class="cmp-r"><div class="cmp-l">Rapidité</div><div class="cmp-a ">≈ 3 min après la mise en vente</div><div class="cmp-b win">Chaque minute, jeu ouvert</div></div></div></details><div class="section"><h2>Moins chères en vente</h2><p class="small mute" id="wat"></p><div class="tablewrap"><table><thead><tr><th>Carte</th><th class="n hide-sm">En vente</th><th class="n">Moins chère</th><th class="n">Bon prix</th><th class="n">Écart</th></tr></thead><tbody id="wt"></tbody></table></div><details class="card section cmpbox"><summary><b>Comment lire ces prix ?</b></summary><div class="small" style="margin-top:8px;line-height:1.6"><p><b>Cote (médiane)</b> : le prix habituel. Sur les vraies ventes des 7 derniers jours, la moitié s’est vendue plus cher, l’autre moitié moins cher.</p><p><b>Bon prix</b> : un prix bas mais réaliste. On classe les ventes des 7 derniers jours du moins cher au plus cher : 25 % des ventes se sont faites à ce prix ou moins (arrondi au millier). Ce n’est pas une moyenne.</p><p><b>Max conseillé</b> : au-dessus, 75 % des ventes se sont faites moins cher : tu paies trop.</p><p><b>Écart</b> : de combien l’annonce la moins chère dépasse le bon prix. 0 % ou moins (en vert) : vraie bonne affaire. Une carte à +15 % peut encore être sous sa cote.</p><p class="mute">Seules les vraies ventes comptent (pas les prix affichés des annonces). Les versions prestige ne sont pas comptées.</p></div></details></div>`;
  const hint = () => { const p = S.prices.find(x => x.card === $('#ac').value); $('#ah').textContent = p ? `Repère : bon prix ${fmt(p.good)} KI · prix médian ${fmt(p.median)} KI (ventes des 7 derniers jours)` : ALERT_UR.includes($('#ac').value) ? 'UR de base (pas la version éveillée) : l\'alerte ne concerne que la carte normale.' : ''; };
  const draw = () => { const W = S.watch.cards || {}, fired = new Set(firedAlerts().map(a => a.card));
    $('#al').innerHTML = S.alerts.length ? `<div class="grid">${S.alerts.map(a => { const w = W[a.card], on = fired.has(a.card);
      return `<div class="card ${on ? 'fire' : ''}"><div class="row"><span class="chip ${on ? 'ok' : ''}">${!a.max_price ? 'Prix à indiquer' : on ? '🔔 En vente à ton prix' : 'En veille'}</span><span class="sp"></span><button class="btn ghost" data-d="${esc(a.card)}" style="min-height:32px;padding:0 10px" aria-label="Supprimer">✕</button></div><h3 style="margin-top:10px">${esc(a.card)}</h3>
      <div class="row small"><span>Ton prix : <b>${a.max_price ? fmt(a.max_price) + ' KI' : '—'}</b></span><span class="sp"></span><span>${w ? `Moins chère : <b class="${on ? 'up' : ''}">${fmt(w.min)} KI</b>` : '<span class="mute">Aucune en vente</span>'}</span></div>${(() => { const p = S.prices.find(x => x.card === a.card); return p ? `<div class="small mute" style="margin-top:6px">Guide des prix : bon prix <b class="bone">${fmt(p.good)}</b> · médiane ${fmt(p.median)} · max conseillé ${fmt(p.max)}${a.max_price && a.max_price > p.max ? ' · <span class="red">ton prix dépasse le max conseillé</span>' : ''}</div>` : '<div class="small mute" style="margin-top:6px">Pas assez de ventes cette semaine pour un repère de prix.</div>'; })()}${a.max_price ? '' : '<p class="small red">Cette ancienne alerte suivait le prix moyen : ajoute-la de nouveau avec ton prix max pour être prévenu.</p>'}</div>`; }).join('')}</div>` : '<div class="empty">Aucune alerte pour l\'instant.</div>';
    $('#al').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { await sb.from('alerts').delete().eq('user_id', S.user.id).eq('card', b.dataset.d); await loadAlerts(); draw(); });
    const rows = Object.entries(W).map(([n, w]) => { const p = S.prices.find(x => x.card === n); return { ...w, card: n, good: p?.good, gap: p?.good ? (w.min - p.good) / p.good * 100 : null }; }).sort((a, b) => (a.gap ?? 999) - (b.gap ?? 999));
    $('#wt').innerHTML = rows.map(r => `<tr><td><b>${esc(r.card)}</b></td><td class="n hide-sm">${r.n}</td><td class="n">${fmt(r.min)}</td><td class="n">${fmt(r.good)}</td><td class="n ${r.gap != null && r.gap <= 0 ? 'up' : ''}">${r.gap == null ? '—' : (r.gap > 0 ? '+' : '') + r.gap.toFixed(0) + ' %'}</td></tr>`).join('') || '<tr><td colspan="5" class="mute">Aucune LR en vente.</td></tr>';
    $('#wat').textContent = S.watch.at ? `Relevé ${new Date(S.watch.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (annonces de plus de 3 minutes)` : ''; };
  $('#ac').oninput = hint; hint();
  $('#aa').onclick = async () => { const card = $('#ac').value, v = Math.round(+$('#ap').value) || null; if (!v) return toast('Indique ton prix max'); const { error } = await sb.from('alerts').upsert({ user_id: S.user.id, card, max_price: v }); if (error) return toast(error.message); toast('Alerte ajoutée'); $('#ap').value = ''; await loadAlerts(); draw(); };
  const ns = async () => { if (!$('#ans')) return; const t = $('#ans'), on = $('#an'), test = $('#at');
    const nc = $('#ncard'); nc.classList.remove('ok', 'warn');
    if (isIOS() && !standalone()) { t.textContent = 'Sur iPhone, ajoute d\'abord le site à ton écran d\'accueil (exigé par Apple, iOS 16.4+) :'; on.style.display = 'none'; $('#nios').style.display = ''; nc.classList.add('warn'); return; }
    if (!pushOk()) { t.textContent = 'Ce navigateur ne sait pas recevoir de notifications. Essaie Chrome, Edge, Firefox ou Safari récent.'; on.disabled = true; return; }
    if (Notification.permission === 'denied') { t.textContent = 'Les notifications sont bloquées pour ce site dans les réglages du navigateur : autorise-les puis recharge la page.'; return; }
    let sub = null; if (Notification.permission === 'granted') { try { sub = await pushSub(false); } catch {} }
    if (!$('#ans')) return;
    on.style.display = sub ? 'none' : ''; test.style.display = sub ? '' : 'none';
    nc.classList.toggle('ok', !!sub); t.textContent = sub ? 'Activées sur cet appareil. Fais pareil sur chaque appareil où tu veux être prévenu.' : 'Pas encore activées sur cet appareil.'; };
  $('#an').onclick = async () => { try { if (await Notification.requestPermission() !== 'granted') return ns(); await pushSub(true); toast('Notifications activées'); } catch (e) { toast('Impossible d\'activer : ' + e.message); } ns(); };
  $('#at').onclick = async () => { const { data, error } = await sb.functions.invoke('market-alert', { body: { test: true } }); toast(error ? 'Échec du test : ' + error.message : data?.sent ? 'Notification envoyée' : 'Aucun appareil abonné : réactive les notifications'); };
  const hist = async () => { const { data } = await sb.from('alert_sent').select('card,price,sent_at').eq('user_id', S.user.id).order('sent_at', { ascending: false }).limit(30); const el = $('#ahist'); if (!el) return;
    el.innerHTML = (data || []).map(h => { const p = S.prices.find(x => x.card === h.card), gap = p?.good ? (h.price - p.good) / p.good * 100 : null; return `<tr><td class="small">${new Date(h.sent_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td><b>${esc(h.card)}</b></td><td class="n">${fmt(h.price)}</td><td class="n hide-sm">${p ? fmt(p.good) : '—'}</td><td class="n ${gap != null && gap <= 0 ? 'up' : ''}">${gap == null ? '—' : (gap > 0 ? '+' : '') + gap.toFixed(0) + ' %'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="mute">Aucune alerte reçue pour l\'instant.</td></tr>'; };
  ns(); draw(); hist();
  S.timers.push(setInterval(async () => { if (!$('#al')) return; await loadWatch(); if ($('#al')) { draw(); hist(); } }, 60000));
};

// Bandeau en haut du site quand une de tes alertes a une annonce en vente à ton prix (les notifications passent par le service worker).
async function alertLoop() {
  try { await Promise.all([loadWatch(), loadAlerts()]); } catch { return; }
  const fired = firedAlerts();
  const el = $('#alertbar'); if (el) el.innerHTML = fired.length ? `<a class="alertbar" href="#alertes">🔔 ${fired.map(a => `<b>${esc(a.card)}</b> ${fmt(a.now)} KI`).join(' · ')}</a>` : '';
  if (pushOk() && Notification.permission === 'granted') pushSub(false).catch(() => {});
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

// Lecture des captures par l'illustration des cartes (voir scan.js) : étoiles et exemplaires compris.
async function loadFeats() { if (S.feats) return S.feats; const { data } = await sb.from('content').select('data').eq('key', 'card_feats').maybeSingle(); S.feats = data?.data || { rows: [] }; SCAN.setFeats(S.feats.rows);
  try { const { data: sr } = await sb.from('content').select('data').eq('key', 'card_serials').maybeSingle(); SCAN.setSerials(sr?.data?.order || []); S.serial = new Map((sr?.data?.order || []).map((id, i) => [Number(id), i + 1])); } catch (e) { /* sans numéros : reconnaissance carte par carte */ }
  return S.feats; }
async function qtyOCR() { const w = await ocrWorker(() => {}); try { await w.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '7' }); } catch (e) { /* ancien moteur */ } return w; }
let NAMEOCR = null;
async function nameOCR() { if (NAMEOCR) return NAMEOCR; try { const T = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js'); const create = T.createWorker || T.default?.createWorker;
  const w = await create('eng', 1, {}); await w.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ-' .0123456789", tessedit_pageseg_mode: '6' }); NAMEOCR = w; } catch (e) { NAMEOCR = null; } return NAMEOCR; }
async function runScan(files, rar, withQty, st) {
  st.textContent = 'Chargement des cartes du jeu…'; await loadFeats(); const w = withQty ? await qtyOCR() : null; st.textContent = 'Chargement de la lecture des noms…'; const nw = await nameOCR();
  const r = await SCAN.analyze(files, rar, w, (fi, nf, bi, nb) => { st.textContent = `Capture ${fi + 1}/${nf} · carte ${bi + 1}/${nb}`; }, nw);
  if (w) { try { await w.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' }); } catch (e) { /* rien */ } }
  st.textContent = ''; return r;
}
// Captures envoyées une par une ou dans un .zip : les images du zip sont extraites dans le navigateur, rien n'est envoyé ailleurs.
async function expandZips(files) {
  const out = [];
  for (const f of files) {
    if (!/\.zip$/i.test(f.name) && !/zip/.test(f.type)) { out.push(f); continue; }
    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    const z = await JSZip.loadAsync(f);
    const entries = Object.values(z.files).filter(e => !e.dir && /\.(png|jpe?g|webp)$/i.test(e.name) && !/(^|\/)__MACOSX\//.test(e.name)).sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
    for (const e of entries) { const blob = await e.async('blob'); const ext = e.name.split('.').pop().toLowerCase(); out.push(new File([blob], e.name.split('/').pop(), { type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' })); }
  }
  return out;
}
// Le bouton d'envoi des captures reste bloqué tant que le nombre affiché par le jeu n'est pas indiqué.
function lockUntilCount(inp, fileId) {
  setTimeout(() => { const f = document.getElementById(fileId); const ins = (Array.isArray(inp) ? inp : [inp]).filter(Boolean); if (!ins.length || !f) return; const lab = f.closest('label');
    const upd = () => { const ok = ins.every(i => i.value !== '' && +i.value >= 0); f.disabled = !ok; if (lab) { lab.style.opacity = ok ? '' : '.45'; lab.style.pointerEvents = ok ? '' : 'none'; lab.title = ok ? '' : 'Indique d\'abord le nombre affiché par le jeu'; } };
    ins.forEach(i => i.addEventListener('input', upd)); upd(); }, 0);
}
function scanFiles(id, label, onFiles) {
  setTimeout(() => { const inp = document.getElementById(id); if (!inp) return; inp.onchange = async () => { let files = [...inp.files]; inp.value = ''; if (!files.length) return; try { files = await expandZips(files); } catch (e) { toast('Impossible d\'ouvrir le zip : ' + e.message); return; } if (!files.length) { toast('Aucune image trouvée dans le zip.'); return; } await onFiles(files); }; });
  return `<label class="btn primary" style="cursor:pointer">📷 ${label}<input id="${id}" type="file" accept="image/*,.zip,application/zip,application/x-zip-compressed" multiple hidden></label>`;
}
function lrScanDialog(res, own, onDone) {
  const d = document.createElement('div'); d.className = 'modal'; const L = res.cards.slice().sort((a, b) => a.name.localeCompare(b.name));
  d.innerHTML = `<div class="mbox"><h2>${L.length} LR reconnues</h2><p class="small mute">${res.nCards} cartes repérées sur tes captures${res.unknown ? `, ${res.unknown} non reconnue${res.unknown > 1 ? 's' : ''}` : ''}. Vérifie les étoiles et les doublons (lus sur la capture : « ×2 » = 1 doublon en plus de ta carte) avant de valider.</p>
    <div class="scanlist">${L.map((c, i) => `<label class="scanrow"><input type="checkbox" data-i="${i}" checked><img src="${S.feats.base}${c.img}.webp" alt=""><span><b>${esc(c.name)}</b><span class="small mute">${esc(c.series || '')}</span></span><select data-s="${i}">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === c.stars ? 'selected' : ''}>${n}★</option>`).join('')}</select><select data-q="${i}" title="Doublons en plus de ta carte">${Array.from({ length: 21 }, (_, n) => `<option value="${n}" ${n === Math.max(0, (c.qty || 1) - 1) ? 'selected' : ''}>${n ? '+' + n + ' doublon' + (n > 1 ? 's' : '') : '0 doublon'}</option>`).join('')}</select></label>`).join('') || '<div class="empty">Aucune LR reconnue. Vérifie que la capture montre bien la collection (filtre LR → Possédées).</div>'}</div>
    <div class="row" style="margin-top:14px"><button class="btn primary" id="sok">Ajouter à mes LR</button><button class="btn ghost" id="sno">Annuler</button></div></div>`;
  document.body.appendChild(d); d.querySelector('#sno').onclick = () => d.remove();
  d.querySelector('#sok').onclick = async () => { let n = 0; d.querySelectorAll('[data-i]').forEach(cb => { if (!cb.checked) return; const c = L[+cb.dataset.i]; own[c.id] = +d.querySelector(`[data-s="${cb.dataset.i}"]`).value; const q = +(d.querySelector(`[data-q="${cb.dataset.i}"]`)?.value || 0); S.mylr.dupes = S.mylr.dupes || {}; if (q) S.mylr.dupes[c.id] = q; else delete S.mylr.dupes[c.id]; n++; }); d.remove(); await onDone(n); };
}

/* ---------- Mes LR + meilleure équipe (château / ranked) ---------- */
async function loadMyLR() { if (S.mylr) return S.mylr; const { data } = await sb.from('my_lr').select('*').eq('user_id', S.user.id).maybeSingle(); S.mylr = data || { cards: {}, teams: {} }; if (!S.mylr.dupes) S.mylr.dupes = {}; return S.mylr; }
const saveMyLR = () => sb.from('my_lr').upsert({ user_id: S.user.id, cards: S.mylr.cards, teams: S.mylr.teams || {}, dupes: S.mylr.dupes || {}, updated_at: new Date().toISOString() });
const nsp = x => String(x).replace(/\s+/g, ' ').trim().toLowerCase();
const lrImg = c => { const B = S.kb.card_images?.byName || {}; const h = B[c.n] ?? B[Object.keys(B).find(k => nsp(k) === nsp(c.n))]; return !h ? '' : /^https?:/.test(h) ? h : `${S.kb.card_images.base}${h}.webp`; };
const LRS = () => S.kb.cards.filter(c => !c.r);

// Arrivée d'un nouveau membre : il importe toute sa collection (LR, SSR, UR) avant d'accéder au site, pour que tout soit réglé sur son profil.
P.bienvenue = async m => {
  await loadMyLR(); const prev = S.profile?.role === 'admin' && new URLSearchParams(location.search).has('apercu'); const T = prev ? {} : (S.mylr.teams || {});
  if (T.done) { location.hash = '#accueil'; return; }
  // Partage de la collection activé par défaut pendant l'accueil (une seule fois : s'il le coupe ensuite, on ne le rallume pas).
  if (!prev && !S.profile.share && !T.shareAuto) { try { const { error } = await sb.rpc('set_share', { v: true }); if (!error) S.profile.share = true; } catch (e) { /* rien */ } S.mylr.teams = { ...(S.mylr.teams || {}), shareAuto: true }; await saveMyLR(); }
  const steps = [['c', 'Tes Communes', 'Collection → filtre Commune → Possédées', '#basses/C'], ['r', 'Tes Rares', 'Collection → filtre Rare → Possédées', '#basses/R'], ['sr', 'Tes SR', 'Collection → filtre Épique → Possédées', '#basses/E'], ['ssr', 'Tes SSR (et tes doublons)', 'Collection → filtre SSR → Possédées', '#collection/L/moi/import'], ['ur', 'Tes UR (et tes doublons)', 'Collection → filtre UR → Possédées', '#collection/M/moi/import'], ['lr', 'Tes LR et leurs étoiles', 'Collection → filtre LR → Possédées', '#meslr']];
  const all = steps.every(x => T[x[0]]);
  if (!T.video && !(prev && window.__bfVidSeen)) {
    m.innerHTML = `${prev ? '<div class="card section" style="border-color:#f3c26b"><b>👁 Aperçu admin</b> : c\'est ce que voit un nouveau membre juste après sa première connexion. Ton compte n\'est pas modifié.</div>' : ''}<section class="hero"><div class="moon"></div><span class="chip red">Bienvenue</span><h1 style="margin-top:12px">Bienvenue dans la Brigade Fantôme</h1><p class="mute">Regarde cette courte vidéo (environ 1 minute) : elle te montre tout ce que tu vas trouver sur le site et comment remplir ta collection. Elle ne s'affiche qu'une fois. Ensuite, compte environ 5 minutes pour la remplir : c'est à faire une seule fois, au démarrage.</p></section>
      <div class="card section"><video id="tv" src="tuto.mp4?v=${APP_V}" poster="tuto-poster.jpg?v=${APP_V}" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;display:block"></video>
        <div class="row" style="margin-top:10px;align-items:center"><span class="small mute">Vitesse</span><button class="btn primary" data-sp="1" style="min-height:36px">×1</button><button class="btn ghost" data-sp="1.5" style="min-height:36px">×1,5</button><span class="sp"></span><button class="btn primary" id="tgo" style="min-height:42px" disabled>▶ Regarde la vidéo jusqu'au bout</button></div><p class="small mute" id="tgh" style="margin:8px 0 0">La vidéo est obligatoire : le bouton se débloque à la fin.</p></div>`;
    const v = $('#tv'); let seen = 0; const tg = $('#tgo'); const unlock = () => { tg.disabled = false; tg.textContent = 'Remplir ma collection →'; $('#tgh').textContent = 'Merci ! Étape suivante : importer ta collection.'; };
    v.addEventListener('timeupdate', () => { if (v.currentTime <= seen + 1 + 1.2 * v.playbackRate) seen = Math.max(seen, v.currentTime); if (tg.disabled && v.duration) { const left = Math.max(0, Math.ceil(v.duration - seen)); tg.textContent = left > 1 ? `▶ Encore ${left} s de vidéo` : '▶ Presque fini…'; if (seen >= v.duration - 1) unlock(); } });
    v.addEventListener('seeking', () => { if (tg.disabled && v.currentTime > seen + 1 + 1.2 * v.playbackRate) v.currentTime = seen; });
    v.addEventListener('ended', () => { if (seen >= (v.duration || 0) - 3) unlock(); });
    m.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { v.playbackRate = +b.dataset.sp; m.querySelectorAll('[data-sp]').forEach(x => { x.classList.toggle('primary', x === b); x.classList.toggle('ghost', x !== b); }); });
    $('#tgo').onclick = async () => { if ($('#tgo').disabled) return; if (prev) { window.__bfVidSeen = true; P.bienvenue(m); return; } S.mylr.teams = { ...(S.mylr.teams || {}), video: true }; await saveMyLR(); P.bienvenue(m); };
    return;
  }
  m.innerHTML = `${prev ? '<div class="card section" style="border-color:#f3c26b"><b>👁 Aperçu admin</b> : c\'est ce que voit un nouveau membre juste après sa connexion. Ton compte n\'est pas modifié.</div>' : ''}<section class="hero"><div class="moon"></div><span class="chip red">Bienvenue · étape obligatoire</span><h1 style="margin-top:12px">Importe ta collection</h1><p class="mute">Avant d'entrer, envoie les captures de ta collection du jeu. Le site lit tout seul tes cartes, leurs étoiles et tes doublons : meilleures équipes, chambre max, échanges avec la Brigade et Kakashi sont alors réglés sur ton profil. D'abord Communes, Rares et SR en donnant juste ton nombre de cartes, puis SSR, UR et LR par captures.</p></section>
    ${CLIC_PHONE() ? `<div class="card section" style="border-color:#e3123a"><div class="row" style="flex-wrap:nowrap;align-items:center"><b style="flex:1;min-width:0">⚡ Recommandé : import en 1 clic</b><a class="btn primary" href="#clic" style="min-height:40px;flex-shrink:0;white-space:nowrap">⚡ Importer</a></div><p class="small mute" style="margin:6px 0 0">${isIOSdev() ? 'Sur iPhone : un signet « Import Brigade » (à créer une fois) envoie toute ta collection en un toucher, sans captures. Tuto en images inclus.' : 'Sur Android : un favori « Import Brigade » (à créer une fois) envoie toute ta collection en un toucher, sans captures. Tuto en images inclus.'}</p></div>` : ''}${CLIC() && isDesktop() ? `<div class="card section" style="border-color:#e3123a"><div class="row" style="flex-wrap:nowrap;align-items:center"><b style="flex:1;min-width:0">⚡ Recommandé sur ordinateur : import en 1 clic</b><a class="btn primary" href="#clic" style="min-height:40px;flex-shrink:0;white-space:nowrap">⚡ Importer en 1 clic</a></div><p class="small mute" style="margin:6px 0 0">Un simple copier-coller de ta sauvegarde du jeu remplit les 6 étapes d'un coup : toutes tes cartes, tes doublons et les étoiles de tes LR, sans captures.</p></div>` : ''}
    ${steps.map(([k, t, how, href], i) =>  `<div class="card section"><div class="row" style="flex-wrap:nowrap;align-items:center"><b style="flex:1;min-width:0">${T[k] ? '✅' : (i + 1) + '.'} ${t}</b>${T[k] ? '<span class="small up">Importé</span>' : ''}<a class="btn ${T[k] ? 'ghost' : 'primary'}" href="${href}" style="min-height:40px;flex-shrink:0;white-space:nowrap">${T[k] ? 'Refaire' : ['c', 'r', 'sr'].includes(k) ? '✍️ Remplir' : '📷 Importer'}</a></div><p class="small mute" style="margin:6px 0 0">Dans le jeu : ${how}${['c', 'r', 'sr'].includes(k) ? ', note le nombre affiché, puis cherche par nom les cartes qui te manquent (pas de captures).' : ', puis des captures en faisant défiler jusqu\'en bas.'}${['ssr', 'ur'].includes(k) ? ' Note aussi le nombre affiché par le jeu (ex. 402 / 414) : l\'import n\'est validé que si le compte est bon.' : ''}</p></div>`).join('')}
    <div class="row section"><button class="btn primary" id="wgo" ${all ? '' : 'disabled'}>Entrer dans le repaire →</button>${all ? '' : '<span class="small mute">Toutes les étapes sont nécessaires pour entrer.</span>'}</div>`;
  const ws = $('#wsh'); if (ws) ws.onchange = async e => { if (prev) return; const { error } = await sb.rpc('set_share', { v: e.target.checked }); if (error) { toast(error.message); e.target.checked = !e.target.checked; return; } S.profile.share = e.target.checked; };
  const g = $('#wgo'); if (g && prev) g.onclick = () => toast('Aperçu : rien n\'est enregistré.'); else if (g) g.onclick = async () => { S.mylr.teams = { ...(S.mylr.teams || {}), done: true }; await saveMyLR(); location.hash = '#accueil'; };
};

// Communes / Rares / SR : pas de captures. Le membre donne son nombre de cartes, puis cherche par nom les quelques cartes qui lui manquent.
const LOW = { C: { k: 'c', label: 'Communes', tag: 'Commune' }, R: { k: 'r', label: 'Rares', tag: 'Rare' }, E: { k: 'sr', label: 'SR', tag: 'Épique (SR)' } };
P.basses = async (m, r = 'C') => {
  if (!LOW[r]) r = 'C'; const X = LOW[r], prev = isPreview();
  const cat = (S.kb.card_catalog?.cards || []).filter(c => c[3] === r && !c[5]);
  if (!cat.length) { m.innerHTML = '<div class="empty">La liste des cartes du jeu n\'est pas encore disponible. Réessaie plus tard.</div>'; return; }
  await loadCollections(); const coll = myColl(); const total = cat.length;
  const had = cat.filter(c => coll[c[2]]?.owned.has(c[1])).length;
  const missing = new Set(S.mylr.teams?.[X.k] && !prev ? cat.filter(c => !coll[c[2]]?.owned.has(c[1])).map(c => c[0]) : []);
  const order = [['C', 'Communes'], ['R', 'Rares'], ['E', 'SR']];
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${onbMode() ? 'Bienvenue · étape obligatoire' : 'Ma collection'}</span><h1 style="margin-top:12px">Tes ${X.label}</h1><p class="mute">Pas besoin de captures ici. Dans le jeu : <b>Collection</b> → filtre <b>${X.tag}</b> → <b>Possédées</b>, et note le nombre affiché (par ex. « 812 / ${total} » → 812). Ensuite cherche par leur nom les quelques cartes qui te manquent. Les doublons ne comptent pas pour cette rareté.</p></section>
    <div class="rtabs section">${order.map(([k, l]) => `<a class="btn ${k === r ? 'primary' : 'ghost'}" href="#basses/${k}" style="min-height:40px">${S.mylr.teams?.[LOW[k].k] && !prev ? '✅ ' : ''}${l}</a>`).join('')}</div>
    <div class="card section"><label for="bn">Nombre de ${X.label} possédées affiché par le jeu (sur ${total})</label><input id="bn" type="number" min="0" max="${total}" placeholder="ex. ${Math.round(total * .9)}" value="${S.mylr.teams?.[X.k] && !prev ? had : ''}">
      <p class="small" id="bneed" style="margin:8px 0 0"></p></div>
    <div class="card section" id="bsearch"><label for="bq">Cherche une carte qui te manque (nom du personnage)</label><input id="bq" placeholder="ex. Naruto" autocomplete="off"><div class="tiles" id="bres" style="margin-top:10px"></div>
      <h3 style="margin:16px 0 6px">Cartes qui te manquent (<span id="bk">0</span>)</h3><div class="tiles" id="bmiss"></div></div>
    <div class="row section"><button class="btn primary" id="bok" disabled>Enregistrer mes ${X.label}</button><span class="small mute" id="bst"></span></div>`;
  const byId = new Map(cat.map(c => [c[0], c])), T = c => [c[1], r, c[4]];
  const need = () => { const n = $('#bn').value === '' ? null : Math.max(0, Math.min(total, +$('#bn').value)); return n == null ? null : total - n; };
  const upd = () => { const nd = need(), k = missing.size; $('#bk').textContent = k;
    $('#bmiss').innerHTML = [...missing].map(id => byId.get(id)).filter(Boolean).map(c => tile(T(c), false, false, '<i class="small" style="position:absolute;top:4px;right:6px">✕</i>').replace('data-c=', `data-m="${c[0]}" data-c=`)).join('') || '<p class="small mute" style="grid-column:1/-1">Aucune pour l\'instant.</p>';
    $('#bmiss').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { missing.delete(+b.dataset.m); upd(); search(); });
    const ok = $('#bok'), msg = $('#bneed');
    if (nd == null) { msg.innerHTML = ''; ok.disabled = true; $('#bst').textContent = 'Indique d\'abord ton nombre de cartes.'; return; }
    if (nd === 0) msg.innerHTML = '<span class="up">✓ Aucune carte manquante : tu peux enregistrer et passer à la rareté suivante.</span>';
    else msg.innerHTML = k === nd ? `<span class="up">✓ ${nd} carte${nd > 1 ? 's' : ''} manquante${nd > 1 ? 's' : ''} trouvée${nd > 1 ? 's' : ''} : le compte est bon.</span>` : `Il te manque <b>${nd}</b> carte${nd > 1 ? 's' : ''}. Sélectionnées : <b>${k}</b>${k > nd ? ' (trop : retire celles en trop)' : ''}.`;
    ok.disabled = k !== nd; $('#bst').textContent = k === nd ? '' : 'Le nombre de cartes manquantes sélectionnées doit être égal à ' + nd + '.'; };
  const search = () => { const q = nsp($('#bq').value); const res = q.length < 2 ? [] : cat.filter(c => !missing.has(c[0]) && (nsp(c[1]).includes(q) || nsp(c[2]).includes(q))).slice(0, 24);
    $('#bres').innerHTML = q.length < 2 ? '<p class="small mute" style="grid-column:1/-1">Tape au moins 2 lettres.</p>' : res.map(c => tile(T(c), true, false, `<i class="small" style="position:absolute;top:4px;right:6px">+</i>`).replace('data-c=', `data-a="${c[0]}" data-c=`)).join('') || '<p class="small mute" style="grid-column:1/-1">Aucune carte trouvée.</p>';
    $('#bres').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { missing.add(+b.dataset.a); upd(); search(); }); };
  $('#bn').oninput = () => { if (+$('#bn').value > total) $('#bn').value = total; if (+$('#bn').value < 0) $('#bn').value = 0; upd(); }; $('#bq').oninput = search;
  $('#bok').onclick = async () => {
    if (prev) { toast('Aperçu : rien n\'est enregistré.'); return; }
    const ok = $('#bok'); ok.disabled = true; ok.textContent = 'Enregistrement…'; const PSU = S.kb.prestige_series?.series || [], touched = new Set();
    for (const c of cat) { const u = uget(coll, c[2]); if (missing.has(c[0])) u.owned.delete(c[1]); else u.owned.add(c[1]); touched.add(c[2]); }
    const rows = [...touched].map(s2 => { const u = coll[s2], pu = PSU.find(x => x.s === s2); return { user_id: S.user.id, universe: s2, done: pu ? ownN(coll, pu) === pu.c.length : false, owned: [...u.owned], dupes: [...u.dupes], qty: u.qty || {}, missing: '' }; });
    for (let i = 0; i < rows.length; i += 100) { const { error } = await sb.from('checklist').upsert(rows.slice(i, i + 100)); if (error) { toast('Enregistrement refusé : ' + error.message); ok.disabled = false; ok.textContent = 'Enregistrer mes ' + X.label; return; } }
    S.mylr.teams = { ...(S.mylr.teams || {}), [X.k]: true }; await saveMyLR();
    toast(`${total - missing.size} ${X.label} enregistrées`); const nx = order.find(([k]) => !S.mylr.teams[LOW[k].k]);
    location.hash = nx ? '#basses/' + nx[0] : onbMode() ? (S.mylr.teams.ssr ? '#bienvenue' : '#collection/L/moi/import') : (FUS() ? '#collection/L/completer' : '#checklist');
  };
  upd(); search();
};

// Favori « Import Brigade » : lancé sur yurocollection.fr, il lit la collection affichée par le jeu (cartes, exemplaires, étoiles des LR)
// et ouvre le site avec ces données. Gratuit, rien à installer, sur ordinateur.
const CLIC_CODE = `(()=>{const T=m=>{const d=document.createElement('div');d.textContent=m;d.style.cssText='position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:2147483647;background:#14141a;color:#fff;border:2px solid #e3123a;border-radius:12px;padding:14px 18px;font:15px system-ui;max-width:90vw;box-shadow:0 8px 30px #000a';document.body.appendChild(d);setTimeout(()=>d.remove(),7000)};try{if(!/(^|\\.)yurocollection\\.fr$/.test(location.hostname)){T('Import Brigade : ouvre d\\'abord yurocollection.fr (connecté à ton compte), puis clique à nouveau sur ce favori.');return}const S=state,C=cards,by=new Map(C.map(c=>[c.id,c])),o=[];for(const k in S.qty){const q=+S.qty[k];if(!(q>0))continue;const c=by.get(+k);if(!c)continue;const s=/secret/i.test(c.rarity||'')?cardStarCount(c):0;o.push(k+'.'+q+(s?'.'+s:''))}if(o.length<5){T('Import Brigade : ta collection n\\'est pas encore chargée. Attends que le jeu soit ouvert, puis réessaie.');return}T('Import Brigade : '+o.length+' cartes lues, ouverture du site…');location.href='https://brigade-fantome-yuro.github.io/#clic='+o.join(',')}catch(e){T('Import Brigade : ouvre le jeu (page chargée, connecté), puis réessaie.')}})()`;
const CLIC_LIVE = true; const isDesktop = () => !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) && !matchMedia('(pointer:coarse)').matches;
const CLIC = () => (CLIC_LIVE && (isDesktop() || CLIC_PHONE_LIVE)) || (S.profile?.role === 'admin' && new URLSearchParams(location.search).has('clic'));
const isIOSdev = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const CLIC_PHONE_LIVE = true; const CLIC_PHONE = () => !isDesktop() && (CLIC_PHONE_LIVE || (S.profile?.role === 'admin' && new URLSearchParams(location.search).has('clic')));
const clicTuto = () => { const ios = isIOSdev(); setTimeout(() => document.querySelectorAll('[data-tuto]').forEach(b => b.onclick = () => { const k = b.dataset.tuto; document.querySelectorAll('[data-tuto]').forEach(x => { x.classList.toggle('primary', x === b); x.classList.toggle('ghost', x !== b); }); const im = document.getElementById('clicTutoImg'); if (im) im.src = 'tuto-' + k + '.jpg?v=' + APP_V; }), 0);
  return `<details class="card section" open><summary><b>📸 Tuto en images</b></summary><div class="row" style="margin:10px 0"><button class="btn ${ios ? 'primary' : 'ghost'}" data-tuto="ios" style="min-height:36px">iPhone</button><button class="btn ${ios ? 'ghost' : 'primary'}" data-tuto="android" style="min-height:36px">Android</button></div><img id="clicTutoImg" src="tuto-${ios ? 'ios' : 'android'}.jpg?v=${APP_V}" alt="Tuto import en 1 clic" style="width:100%;border-radius:12px" loading="lazy"></details>`; };
const clicHref = () => 'javascript:' + encodeURIComponent(CLIC_CODE);
P.clic = async m => {
  const prev = isPreview(); let pay = null; try { pay = JSON.parse(localStorage.getItem('bf_clic') || 'null'); } catch (e) { pay = null; }
  const back = reimpMode() ? '#clic' : onbMode() ? '#bienvenue' : '#collection';
  const reBan = reimpMode() ? '<div class="card section" style="border-color:#e3123a"><b>🔄 Mise à jour obligatoire de ta collection</b><p class="small mute" style="margin:6px 0 0">Certains imports faits avant la nouvelle méthode étaient incomplets (doublons et cartes manquants). Pour que ton profil, tes équipes et les échanges soient justes, refais une fois l\'import en 1 clic ci-dessous. Le site se débloque dès que c\'est enregistré.</p></div>' : '';
  if (!pay?.d && !isDesktop()) {
    m.innerHTML = `${reBan}<section class="hero"><div class="moon"></div><span class="chip red">Téléphone · gratuit</span><h1 style="margin-top:12px">Import en 1 clic</h1><p class="mute">On crée une fois ${isIOSdev() ? 'un signet' : 'un favori'} « Import Brigade ». Ensuite, depuis le jeu, un seul toucher dessus envoie toute ta collection ici (cartes, doublons, étoiles des LR).</p></section>
      ${clicTuto()}
      <div class="card section"><h3 style="margin-top:0">1. Copie le code ${isIOSdev() ? 'du signet' : 'du favori'}</h3><button class="btn primary" id="clicCopy">📋 Copier le code</button> <span id="clicOk" class="up small"></span></div>
      <div class="card section"><h3 style="margin-top:0">2. Crée ${isIOSdev() ? 'le signet' : 'le favori'} (une seule fois)</h3><p class="small mute">${isIOSdev() ? 'Sur cette page : menu <b>•••</b> (en bas) → <b>Ajouter à Signets</b> → Enregistrer. Puis menu <b>•••</b> → <b>Signets</b> → <b>Modifier</b> → touche ce signet → nom <b>Import Brigade</b>, adresse : efface tout et <b>colle</b> le code → <b>OK</b>.' : 'Sur cette page : menu <b>⋮</b> → étoile <b>☆</b> → <b>Modifier</b> → nom <b>Import Brigade</b>, URL : efface tout et <b>colle</b> le code, puis reviens en arrière.'}</p></div>
      <div class="card section"><h3 style="margin-top:0">3. À chaque import</h3><p class="small mute">Ouvre <a href="https://yurocollection.fr" target="_blank" rel="noopener">yurocollection.fr</a> (connecté, jeu chargé). ${isIOSdev() ? 'Menu <b>•••</b> → <b>Signets</b> → touche <b>Import Brigade</b> (dans « Enregistrés récemment » ou la liste).' : 'Tape <b>Import Brigade</b> dans la barre d\'adresse et touche la suggestion avec l\'étoile.'} Le site de la Brigade s'ouvre avec ta collection : vérifie, puis <b>Enregistrer</b>.</p></div>
      <div class="row section"><a class="btn ghost" href="${back}">← Retour</a></div>`;
    $('#clicCopy').onclick = async () => { const t = 'javascript:' + CLIC_CODE; try { await navigator.clipboard.writeText(t); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } $('#clicOk').textContent = '✓ Copié'; toast('Code copié'); };
    return;
  }
  if (!pay?.d) {
    m.innerHTML = `${reBan}<section class="hero"><div class="moon"></div><span class="chip red">${isDesktop() ? 'Sur ordinateur · gratuit' : 'Gratuit · sans captures'}</span><h1 style="margin-top:12px">Import en 1 clic</h1><p class="mute">Plus de captures : le site lit ta sauvegarde du jeu (toutes tes cartes, tes exemplaires et les étoiles de tes LR). Rien à installer, 3 gestes.</p></section>
      <div class="card section"><h3 style="margin-top:0">1. Ouvre ta sauvegarde du jeu</h3><p class="small mute">Tu dois être connecté au jeu dans ce navigateur. Une page pleine de texte s'ouvre : c'est normal.</p>
        <a class="btn primary" href="https://yurocollection.fr/api/save" target="_blank" rel="noopener" style="margin-top:6px">📂 Ouvrir ma sauvegarde YURO</a></div>
      <div class="card section"><h3 style="margin-top:0">2. ${isDesktop() ? 'Copie tout' : 'Enregistre la page en fichier'}</h3><p class="small mute">${isDesktop() ? 'Sur cette page : <b>Ctrl + A</b> puis <b>Ctrl + C</b> (Mac : <b>Cmd + A</b> puis <b>Cmd + C</b>).' : '<b>iPhone (Safari)</b> : bouton <b>Partager</b> (carré avec une flèche) → touche <b>En voir plus</b> si besoin → <b>Enregistrer dans Fichiers</b> → <b>Enregistrer</b>. (« Copier » ne copie que le lien : ça ne marche pas.)<br><b>Android (Chrome)</b> : menu <b>⋮</b> → icône <b>Télécharger</b> (flèche vers le bas).<br>Le texte est trop long pour être copié sur téléphone : on passe par un fichier.'}</p></div>
      <div class="card section"><h3 style="margin-top:0">3. ${isDesktop() ? 'Reviens ici et colle' : 'Reviens ici et choisis le fichier'}</h3><p class="small mute">${isDesktop() ? 'Clique dans la case puis <b>Ctrl + V</b> (Mac : <b>Cmd + V</b>).' : 'Touche <b>📂 Choisir le fichier de sauvegarde</b> ci-dessous, puis sélectionne le fichier que tu viens d\'enregistrer (dans Fichiers ou Téléchargements, nommé « save »).'}</p>
        <textarea id="clicTa" rows="3" placeholder="Colle ici (Ctrl + V)" style="width:100%;margin-top:6px"></textarea>
        <div class="row" style="margin-top:10px;align-items:center"><span class="small mute">ou</span><label class="btn ghost" style="cursor:pointer;min-height:40px">📂 Choisir le fichier de sauvegarde<input id="clicFile" type="file" hidden></label></div>
        <p class="small" id="clicMsg" style="margin:6px 0 0"></p></div>
      <p class="small mute section">Le texte collé reste dans ton navigateur : le site n'en garde que la liste de tes cartes, et seulement quand tu cliques sur Enregistrer.</p>
      <div class="row section"><a class="btn ghost" href="${back}">← Retour</a></div>`;
    const ta = $('#clicTa'), msg = $('#clicMsg');
    const take = txt => { if (/^\s*https?:\/\/\S+\s*$/.test(txt)) { msg.innerHTML = '<span class="down">C\'est le lien de la page qui a été copié, pas son contenu. ' + (isDesktop() ? 'Ouvre la sauvegarde puis fais Ctrl + A et Ctrl + C sur la page.' : 'Sur iPhone : Partager → Enregistrer dans Fichiers, puis « Choisir le fichier de sauvegarde ».') + '</span>'; return; } let j = null; try { j = JSON.parse(txt); } catch (e) { const a = txt.indexOf('{"configured"') >= 0 ? txt.indexOf('{"configured"') : txt.indexOf('{"'), b = txt.lastIndexOf('}'); if (a >= 0 && b > a) { try { j = JSON.parse(txt.slice(a, b + 1)); } catch (e2) { j = null; } } }
      if (!j) { msg.innerHTML = '<span class="down">Ce n\'est pas le bon texte. Ouvre ta sauvegarde (étape 1), fais Ctrl + A puis Ctrl + C, et recolle.</span>'; return; }
      const g = j?.save?.game || j?.game || j; const q = g?.qty, st = g?.story?.cardStars || {};
      if (!Array.isArray(q) && !(q && typeof q === 'object')) { msg.innerHTML = '<span class="down">Sauvegarde vide : connecte-toi au jeu dans ce navigateur, puis recommence l\'étape 1.</span>'; return; }
      const o = []; for (const k of Object.keys(q)) { const n = +q[k]; if (n > 0) { const s2 = +st[k] || 0; o.push(k + '.' + n + (s2 ? '.' + s2 : '')); } }
      if (o.length < 5) { msg.innerHTML = '<span class="down">Aucune carte trouvée : vérifie que tu es connecté au bon compte YURO.</span>'; return; }
      try { localStorage.setItem('bf_clic', JSON.stringify({ t: Date.now(), d: o.join(',') })); } catch (e) { toast('Impossible de garder la collection : ' + e.message); return; }
      ta.value = ''; P.clic(m); };
    ta.addEventListener('paste', async e => { const cd = e.clipboardData; const f = cd?.files?.[0] || [...(cd?.items || [])].find(it => it.kind === 'file')?.getAsFile(); if (f) { e.preventDefault(); msg.textContent = 'Lecture…'; try { take(await f.text()); } catch (er) { msg.innerHTML = '<span class="down">Impossible de lire : ' + esc(er.message) + '</span>'; } return; } const t = cd?.getData('text'); if (t) { e.preventDefault(); msg.textContent = 'Lecture…'; setTimeout(() => take(t), 30); } });
    ta.addEventListener('input', () => { if (ta.value.length > 50) take(ta.value); });
    $('#clicFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; msg.textContent = 'Lecture du fichier…'; try { take(await f.text()); } catch (er) { msg.innerHTML = '<span class="down">Impossible de lire ce fichier : ' + esc(er.message) + '</span>'; } };
    return;
  }
  m.innerHTML = '<div class="empty">Lecture de ta collection…</div>';
  const got = new Map(); for (const t of String(pay.d).split(',')) { const [id, q, st] = t.split('.').map(Number); if (id > 0 && q > 0) got.set(id, { q, s: Math.max(0, Math.min(5, st || 0)) }); }
  await loadFeats(); await loadCollections(); const coll = myColl(); const catAll = S.kb.card_catalog?.cards || [];
  const lowU = r => { const by = new Map(); for (const c of catAll) { if (c[3] !== r || c[5]) continue; const s2 = c[2] || '—'; if (!by.has(s2)) by.set(s2, { s: s2, c: [] }); by.get(s2).c.push([c[1], r, c[4] || '', Number(c[0])]); } return [...by.values()]; };
  const U = { C: lowU('C'), R: lowU('R'), E: lowU('E'), L: rarUniverses('L'), M: rarUniverses('M') };
  const lrIds = new Set(catAll.filter(c => c[3] === 'S').map(c => Number(c[0]))); for (const u of rarUniverses('S')) for (const c of u.c) lrIds.add(c[3]);
  const lrName = id => (catAll.find(c => Number(c[0]) === id) || [])[1] || ('#' + id);
  const st = {}; for (const k of Object.keys(U)) { let own = 0, tot = 0, dup = 0; for (const u of U[k]) for (const c of u.c) { tot++; const g = got.get(c[3]); if (g) { own++; if (g.q >= 2) dup++; } } st[k] = { own, tot, dup }; }
  const lrs = [...lrIds].filter(id => got.has(id)).map(id => ({ id, n: lrName(id), ...got.get(id) })).sort((a, b) => b.s - a.s || a.n.localeCompare(b.n));
  const age = Math.round((Date.now() - (pay.t || Date.now())) / 60000);
  const lab = { C: 'Communes', R: 'Rares', E: 'SR', L: 'SSR', M: 'UR' };
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Import en 1 clic</span><h1 style="margin-top:12px">Ta collection est arrivée</h1><p class="mute">Lue directement dans le jeu${age > 1 ? ` il y a ${age} min` : ''}. Vérifie le résumé, puis enregistre : ta collection sur le site sera remplacée par celle du jeu.</p></section>
    <div class="card section"><div class="grid">${Object.keys(lab).map(k => `<div><div class="mute small">${lab[k]}</div><div class="cd">${st[k].own} <span class="small mute">/ ${st[k].tot}</span></div><div class="small mute">${st[k].dup} en double</div></div>`).join('')}<div><div class="mute small">LR</div><div class="cd">${lrs.length}</div><div class="small mute">${lrs.filter(x => x.q > 1).length} en double</div></div></div></div>
    <div class="card section"><h3 style="margin-top:0">Tes LR et leurs étoiles</h3><div class="small" style="columns:2;column-gap:24px">${lrs.map(x => `<div>${esc(x.n)} · <b>${x.s}★</b>${x.q > 1 ? ` <span class="mute">(+${x.q - 1} doublon${x.q > 2 ? 's' : ''})</span>` : ''}</div>`).join('') || '<span class="mute">Aucune LR</span>'}</div></div>
    <div class="row section"><button class="btn primary" id="cok">Enregistrer ma collection</button><button class="btn ghost" id="cno">Annuler</button><span class="small mute" id="cst"></span></div>`;
  $('#cno').onclick = () => { try { localStorage.removeItem('bf_clic'); } catch (e) {} location.hash = back; };
  $('#cok').onclick = async () => {
    if (prev) { toast('Aperçu : rien n\'est enregistré.'); return; }
    const b = $('#cok'); b.disabled = true; b.textContent = 'Enregistrement…'; const touched = new Set(), PSU = S.kb.prestige_series?.series || [];
    for (const k of Object.keys(U)) for (const u of U[k]) for (const c of u.c) { const r = uget(coll, u.s), g = got.get(c[3]); touched.add(u.s);
      if (g) r.owned.add(c[0]); else r.owned.delete(c[0]);
      if (g && g.q >= 2) { r.dupes.add(c[0]); r.qty[c[0]] = g.q; } else { r.dupes.delete(c[0]); delete r.qty[c[0]]; } }
    const rows = [...touched].map(s2 => { const u = coll[s2], pu = PSU.find(x => x.s === s2); return { user_id: S.user.id, universe: s2, done: pu ? ownN(coll, pu) === pu.c.length : false, owned: [...u.owned], dupes: [...u.dupes], qty: u.qty || {}, missing: '' }; });
    for (let i = 0; i < rows.length; i += 100) { $('#cst').textContent = `${Math.min(rows.length, i + 100)} / ${rows.length} univers…`; const { error } = await sb.from('checklist').upsert(rows.slice(i, i + 100)); if (error) { toast('Enregistrement refusé : ' + error.message); b.disabled = false; b.textContent = 'Enregistrer ma collection'; return; } }
    const cards = {}, dupes = {}; for (const x of lrs) { cards[x.id] = x.s; if (x.q > 1) dupes[x.id] = x.q - 1; }
    S.mylr.cards = cards; S.mylr.dupes = dupes; S.mylr.teams = { ...(S.mylr.teams || {}), c: true, r: true, sr: true, ssr: true, ur: true, lr: true, clic: Date.now() };
    const { error: e2 } = await saveMyLR(); if (e2) { toast('Enregistrement refusé : ' + e2.message); b.disabled = false; b.textContent = 'Enregistrer ma collection'; return; }
    try { localStorage.removeItem('bf_clic'); } catch (e) {}
    toast('Collection enregistrée ✓'); location.hash = onbMode() ? '#bienvenue' : '#collection';
  };
};

P.meslr = async m => {
  await loadMyLR(); const own = S.mylr.cards;
  const onb = onbMode();
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">${onb ? 'Bienvenue · étape obligatoire' : 'Indispensable'}</span><h1 style="margin-top:12px">${onb ? 'Avant d\'entrer : tes LR' : 'Mes LR'}</h1><p class="mute">${onb ? 'Pour que le site te conseille (meilleure équipe au château et en ranked, chambre max, Kakashi), indique tes LR et leurs étoiles : à la main en touchant les cartes, ou en envoyant des captures de ta collection.' : 'Indique les LR que tu possèdes et leurs étoiles. C\'est la base de « Meilleure équipe » au château et en ranked.'}</p>${onb ? '<button class="btn primary" id="obd" style="margin-top:12px">Mes LR sont importées → étape suivante</button>' : ''}</section>
    <div class="card section" id="lsum"></div><div class="lrgrid" id="lg"></div>`;
  const sum = () => { const n = Object.keys(own).length; $('#lsum').innerHTML = `<div class="row"><b>${n} / ${LRS().length} LR possédées</b><span class="sp"></span>${onb ? '' : '<a class="btn primary" href="#equipe/chateau" style="min-height:40px">Meilleure équipe château</a><a class="btn" href="#equipe/ranked" style="min-height:40px">Meilleure équipe ranked</a>'}</div><p class="small mute" style="margin:8px 0 0">Touche une carte pour l'ajouter, puis touche ses étoiles (retouche la dernière pour en enlever une) et, avec − / +, ses doublons (exemplaires en plus, après tes montées d'étoiles).</p>
    <div class="row" style="margin-top:10px">${scanFiles('lrscan', 'Importer depuis des captures de ma collection', async files => { const st = $('#lrst'); try { const r = await runScan(files, ['S'], true, st); lrScanDialog(r, own, async n => { if (n) S.mylr.teams = { ...(S.mylr.teams || {}), lr: true }; await saveMyLR(); draw(); sum(); toast(n + ' LR enregistrées avec leurs étoiles'); if (onb && n) location.hash = '#bienvenue'; }); } catch (e) { st.textContent = 'La lecture a échoué : ' + e.message; } })}<span class="small mute" id="lrst"></span></div>
    <p class="small mute" style="margin:6px 0 0">Dans le jeu : Collection → filtre LR → Possédées, puis une ou plusieurs captures (fais défiler pour tout montrer). Le site reconnaît chaque carte et lit ses étoiles : tu vérifies avant de valider.</p>`; };
  const draw = () => { $('#lg').innerHTML = LRS().map(c => { const st = own[c.id]; const has = st != null; const dp = +(S.mylr.dupes?.[c.id] || 0);
    return `<div class="lr ${has ? 'on' : ''}" data-id="${c.id}"><button class="lrimg" data-t="${c.id}" aria-pressed="${has}">${lrImg(c) ? `<img loading="lazy" src="${lrImg(c)}" alt="">` : ''}<span>${esc(c.n)}</span></button>
      ${has ? `<div class="stars stars5">${[1, 2, 3, 4, 5].map(k => `<button data-s="${k}" class="${st >= k ? 'on' : ''}" aria-label="${k} étoile${k > 1 ? 's' : ''}">★</button>`).join('')}</div><div class="mstep ldup"><button data-ld="-1" ${dp ? '' : 'disabled'} aria-label="Un doublon de moins">−</button><b><small>doubl.</small>${dp}</b><button data-ld="1" aria-label="Un doublon de plus">+</button></div>` : ''}</div>`; }).join('');
    $('#lg').querySelectorAll('.lrimg').forEach(b => b.onclick = async () => { const id = b.dataset.t; if (own[id] != null) { delete own[id]; if (S.mylr.dupes) delete S.mylr.dupes[id]; } else own[id] = 0; draw(); sum(); await saveMyLR(); });
    $('#lg').querySelectorAll('.stars button').forEach(b => b.onclick = async () => { const id = b.closest('.lr').dataset.id, k = +b.dataset.s; own[id] = (+own[id] || 0) === k ? k - 1 : k; draw(); await saveMyLR(); });
    $('#lg').querySelectorAll('.ldup button').forEach(b => b.onclick = async () => { const id = b.closest('.lr').dataset.id; S.mylr.dupes = S.mylr.dupes || {}; const x = Math.max(0, Math.min(99, (+S.mylr.dupes[id] || 0) + (+b.dataset.ld))); if (x) S.mylr.dupes[id] = x; else delete S.mylr.dupes[id]; draw(); await saveMyLR(); }); };
  sum(); draw();
  const ob = $('#obd'); if (ob) ob.onclick = async () => { if (!Object.keys(own).length && !confirmBox('Aucune LR importée. Tu n\'as vraiment aucune LR ?')) return; S.mylr.teams = { ...(S.mylr.teams || {}), lr: true }; await saveMyLR(); location.hash = '#bienvenue'; };
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
// Calculs d'équipe avec le moteur de combat du jeu (le même que les simulateurs), dans un worker.
let TW = null, twSeq = 0; const twWait = new Map();
function twCall(msg) { if (!TW) { TW = new Worker('team-worker.js?v=189'); TW.onmessage = ({ data }) => { const f = twWait.get(data.id); if (f) { twWait.delete(data.id); f(data.r); } }; } return new Promise(ok => { const id = ++twSeq; twWait.set(id, ok); TW.postMessage({ ...msg, id }); }); }
const engUnit = (c, st) => { const s = c.ex ? { hp: c.st[st][0], atk: c.st[st][1] } : statsAt(c, st); return { name: c.n, rarity: c.ex ? 'Exclusive' : c.r === 'Transcendant' ? 'Transcendant' : 'Secret', image: c.ex ? c.img : lrImg(c), hp: s.hp, atk: s.atk }; };
// Gardiens du château tirés dans TOUT le catalogue du jeu (comme le vrai jeu) : leur nom compte (ex. SKILL HUNTER de Chrollo ne vole une technique que si le gardien en a une, sinon il vole 25 % de son attaque).
const CAT_RAR = { C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire', M: 'Mythique', S: 'Secret' };
let CASTLE_CAT = null;
const castleCatalog = () => CASTLE_CAT || (CASTLE_CAT = (() => { const all = (S.kb.card_catalog?.cards || []).filter(c => CAT_RAR[c[3]] && !c[5]).map(c => ({ name: c[1], rarity: CAT_RAR[c[3]], image: c[4] || '' })); return all.length > 100 ? all : (S.kb.cards || []).filter(c => !c.r).map(c => ({ name: c.n, rarity: 'Secret', image: lrImg(c) })); })());
const SIMC = new Map();
function simCastle(team, own, n = 100) {
  const key = team.map(c => c.id + ':' + (own[c.id] || 0)).sort().join(',') + '|' + n + '|e11';
  if (!SIMC.has(key)) { let c = null; try { c = JSON.parse(localStorage.getItem('bfc:' + key) || 'null'); } catch {}
    SIMC.set(key, c ? Promise.resolve(c) : twCall({ kind: 'castle', team: team.map(x => engUnit(x, own[x.id] || 0)), catalog: castleCatalog(), n }).then(r => { try { localStorage.setItem('bfc:' + key, JSON.stringify(r)); } catch {} return r; })); }
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
  cand.sort((a, b) => b.v - a.v); const pool = cand.slice(0, 24);
  if (current?.length === 3 && roleOk(current) && !pool.some(x => x.t.every(c => current.some(y => y.id === c.id)))) pool.push({ t: current });
  const quick = []; for (let i = 0; i < pool.length; i++) { if (i % 4 === 0) { onp?.(i, pool.length + 5); await nextFrame(); } const r = await simCastle(pool[i].t, own, 30); quick.push({ t: pool[i].t, sc: r.play * 1000 + r.sure }); }
  quick.sort((a, b) => b.sc - a.sc); let best = null; const fin = quick.slice(0, 5);
  for (let i = 0; i < fin.length; i++) { onp?.(pool.length + i + 1, pool.length + 5); await nextFrame(); const r = await simCastle(fin[i].t, own); const sc = r.play * 1000 + r.sure + r.max / 1000; if (!best || sc > best.sc) best = { team: fin[i].t, r, sc }; }
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
// Résultats calculés avec le moteur de combat du jeu (tous les trios autorisés contre la méta réelle, à 0★ et à 5★).
async function loadRMeta() { if (S.rmeta !== undefined) return S.rmeta; const { data } = await sb.from('content').select('data').eq('key', 'ranked_meta').maybeSingle(); const d = data?.data; if (!d) { S.rmeta = null; return null; }
  const map = new Map(); for (const row of d.trios.split(';')) { const [ids, q0, q5, f0, f5, p0, p5, o] = row.split(','); map.set(ids.split('-').map(Number).sort((x, y) => x - y).join(','), { q0: +q0 / 1000, q5: +q5 / 1000, f0: f0 ? +f0 / 1000 : null, f5: f5 ? +f5 / 1000 : null, p0, p5, o: o ? o.split('-').map(Number) : null }); }
  S.rmeta = { ...d, map }; return S.rmeta; }
const metaName = ids => ids.map(id => (LRS().find(c => c.id === id)?.n || '?').replace(/\s*\(.*$/, '')).join(' · ');
// Force ranked avec le moteur du jeu : matchs contre les équipes de la méta (à 4★), chaque camp commençant à tour de rôle.
const RSIM = new Map();
function rankedSim(team, own, n = 10) {
  const key = team.map(c => c.id + ':' + (own[c.id] || 0)).sort().join(',') + '|' + n + '|e1';
  if (!RSIM.has(key)) RSIM.set(key, twCall({ kind: 'ranked', A: team.map(c => engUnit(c, own[c.id] || 0)), opps: oppTeams().map(t => ({ name: metaName(t.map(c => c.id)), B: t.map(c => engUnit(c, OPP_ST)) })), n }).then(r => ({ ...r, key: r.avg, engine: true })));
  return RSIM.get(key);
}
async function bestRankedSim(own, onp, cur) {
  const sig = JSON.stringify(own); if (S.brBest && S.brBest.sig === sig) return S.brBest.v;
  const C = LRS().filter(c => own[c.id] != null); if (C.length < 3) return null; const trios = [];
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) for (let k = j + 1; k < C.length; k++) { const t = [C[i], C[j], C[k]]; if (roleOk(t)) trios.push(t); }
  const opps = oppTeams().map(t => ({ name: metaName(t.map(c => c.id)), B: t.map(c => engUnit(c, OPP_ST)) }));
  const sc = []; const step = 12;
  for (let i = 0; i < trios.length; i += step) { onp?.(i, trios.length + 8); const part = trios.slice(i, i + step); const r = await twCall({ kind: 'rankedMany', teams: part.map(t => t.map(c => engUnit(c, own[c.id] || 0))), opps, n: 2 }); part.forEach((t, k) => sc.push({ t, v: r[k] })); }
  sc.sort((a, b) => b.v - a.v); let best = null; const fin = sc.slice(0, 8);
  if (cur?.length === 3 && roleOk(cur) && !fin.some(x => x.t.every(c => cur.some(y => y.id === c.id)))) fin.push({ t: cur });
  for (let i = 0; i < fin.length; i++) { onp?.(trios.length + i, trios.length + 8); const r = await rankedSim(fin[i].t, own); if (!best || r.avg > best.r.avg) best = { team: fin[i].t, r }; }
  S.brBest = { sig, v: best }; return best;
}
const forceTxt = r => { const byId = id => LRS().find(c => c.id === id);
  const obs = r.res.filter(x => !x.sim), sim = r.res.filter(x => x.sim);
  const rows = L => L.map(x => `<div class="opp"><span class="small">${esc(x.name)}${x.f && !x.sim ? ` <span class="mute">(${x.f}×)</span>` : ''}</span><span class="bar"><i style="width:${Math.round(x.w * 100)}%"></i></span><b class="small">${Math.round(x.w * 100)} %</b></div>`).join('');
  return `<div class="grid" style="margin-top:14px"><div><div class="mute small">Indice de force</div><div class="cd">${Math.round(r.avg * 100)}<span class="small mute">/100</span></div></div>${r.order ? `<div><div class="mute small">Placement conseillé</div><div style="font-weight:700;margin-top:6px">${r.order.map(id => esc((byId(id)?.n || '').replace(/\s*\(.*$/, ''))).join(' → ')}</div></div>` : ''}</div>
  ${obs.length ? `<h3 style="margin-top:14px">Contre les équipes les plus jouées</h3><div class="opps">${rows(obs)}</div>` : ''}${sim.length ? `<h3 style="margin-top:14px">Contre la méta simulée</h3><div class="opps">${rows(sim)}</div>` : ''}
  <p class="small" style="color:#f3c26b">Indication : un vrai joueur peut jouer mieux ou autrement que la simulation.</p>
  <p class="small mute">${r.engine ? `Calculé avec le moteur de combat du jeu (le même que le simulateur « Jouer un match ») : ton trio, à tes étoiles, joue contre chacune des ${r.res.length} équipes de la méta à 4★, chaque camp commençant à tour de rôle. Les deux camps jouent leurs techniques dès qu'elles sont prêtes, achèvent ce qui peut l'être, évitent les cartes protégées (esquives, UI, Haki) et gardent Ayanokouji pour la fin (son échange ne sert plus en 2 contre 1) ; le soin est gardé pour quand l'équipe en a besoin.` : r.full ? 'Calculé avec le moteur de combat du jeu : chaque camp commence à tour de rôle, ton trio joue avec son meilleur placement, et tes étoiles sont prises en compte. Méta = les équipes les plus jouées en ranked (entre parenthèses : combien de fois) + les meilleures équipes trouvées par simulation.' : r.real ? 'Calculé avec le moteur de combat du jeu contre les 3 équipes les plus jouées en ranked (ce trio n\'est pas dans le haut du classement, il n\'a pas été testé contre la méta complète).' : 'Estimation.'} Le joueur d'en face peut jouer autrement.</p>`; };
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
  const N = heal === 'wz' ? [['Aya encaisse', '1 coup', 'r'], ['ÉCHANGE', 'gardien pas', 'b', 'plein (60 %)'], ['Aya encaisse', '1 coup', 'r', 'de plus'], ['Tenir', "jusqu'au", 'm', '2e échange'], ['ÉCHANGE', 'gardien plein', 'b', 'Aya au plus bas'], ['Achever', "l'échangé", 'g']]
    : heal ? [['Aya encaisse', '1er coup', 'r'], ['Soin 30 %', 'Seiichi / Rimuru', 'g'], ['Aya encaisse', '2e coup', 'r'], ['ÉCHANGE', 'au plus près', 'b', 'de 1 PV'], ['Achever', "l'échangé", 'g']]
    : [['Aya encaisse', '2 coups', 'r'], ['ÉCHANGE', 'au plus près', 'b', 'de 1 PV'], ['Achever', "l'échangé", 'g'], ['Retour', 'au focus', 'm']];
  const C = { r: '#d0122f', g: '#8fb59a', b: '#e9dcc0', m: '#9a8f88' }; const W = 380, cx = W / 2, cy = W / 2, R = 128, r = 54;
  const pts = N.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N.length; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const arrows = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; const a1 = Math.atan2(q[1] - p[1], q[0] - p[0]); const s = [p[0] + (r + 6) * Math.cos(a1), p[1] + (r + 6) * Math.sin(a1)], e = [q[0] - (r + 10) * Math.cos(a1), q[1] - (r + 10) * Math.sin(a1)]; return `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" stroke="#5a4d55" stroke-width="2" marker-end="url(#ah${heal === 'wz' ? 2 : heal ? 1 : 0})"/>`; }).join('');
  const nodes = N.map((n, i) => { const [x, y] = pts[i]; const col = C[n[2]]; const sub = n[3] ? [n[1], n[3]] : [n[1]];
    return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#0c0a0d" stroke="${col}" stroke-width="3"/><text x="${x}" y="${y - (sub.length > 1 ? 10 : 4)}" text-anchor="middle" font-size="13" font-weight="800" fill="${col}">${n[0]}</text>${sub.map((t, k) => `<text x="${x}" y="${y + 12 + k * 14 - (sub.length > 1 ? 6 : 0)}" text-anchor="middle" font-size="11" fill="#b9aea7">${t}</text>`).join('')}</g>`; }).join('');
  return `<figure class="loopfig"><figcaption>${heal === 'wz' ? 'Sans soigneur, après le 1er seuil (Aya meurt en 2 coups)' : heal ? 'Avec soigneur (quand Aya meurt en 2 coups)' : 'Sans soigneur'}</figcaption><svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Boucle Aya ${heal === 'wz' ? 'sans soigneur après le seuil' : heal ? 'avec soigneur' : 'sans soigneur'}"><defs><marker id="ah${heal === 'wz' ? 2 : heal ? 1 : 0}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5a4d55"/></marker></defs>${arrows}${nodes}<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="26" font-weight="700" fill="#efe6dc">Boucle</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="12" fill="#9a8f88">à faire 2 fois</text></svg></figure>`;
}
// Plafond de la boucle Aya : dernière chambre où Aya survit à 2 coups (avec un soin de 30 % si l'équipe a un soigneur). Suit les étoiles d'Aya.
function ayaCeiling(team, own) {
  const aya = team.find(c => c.id === 953); if (!aya) return null;
  const H = statsAt(aya, own?.[953] || 0).hp, heal = team.some(c => HEALERS.includes(c.id)), A = r => towerAt(null, r).atk;
  const lim = heal ? H + Math.round(H * .3) : H; let r = 1; while (r < 5000 && A(r) * 2 < lim) r++;
  let s1 = 1; while (s1 < 5000 && A(s1) * 2 < H) s1++;
  return { last: r - 1, stop: r, heal, seuil1: s1, stars: own?.[953] || 0 };
}
function simBlock(r, team, own) {
  const pc = v => Math.round(v * 100), ppc = v => v >= .01 ? String(Math.round(v * 100)) : v > 0 ? (Math.round(v * 1000) / 10).toString().replace('.', ',') : '0'; const ce = team ? ayaCeiling(team, own) : null;
  return `<div class="grid" style="margin-top:14px"><div><div class="mute small">Chambre sûre (9 fois sur 10)</div><div class="cd">${r.sure}</div></div><div><div class="mute small">Chambre jouable (1 fois sur 2)</div><div class="cd">${r.play}</div></div><div><div class="mute small">Chambre max (1 fois sur 5)</div><div class="cd">${r.max}</div></div><div><div class="mute small">Plafond réel</div><div class="cd">${r.ceil}</div><div class="small mute">${ppc(r.ceilP)} % de victoire par essai</div></div></div>
  <p class="small" style="margin-top:8px"><b>Plafond réel :</b> dernière chambre où cette équipe gagne encore, même rarement (au moins une victoire sur ${r.nc || r.n * 4} combats simulés par chambre). À la chambre ${r.ceil}, elle gagne environ ${ppc(r.ceilP)} fois sur 100 ; à la chambre ${r.ceil + 1}, plus aucune victoire.</p>
  ${r.play === r.max || r.sure === r.play ? `<p class="small" style="margin-top:8px"><b>Pourquoi ${r.play === r.max ? 'jouable et max' : 'sûre et jouable'} sont identiques :</b> c'est un mur. Jusqu'à la chambre ${r.play === r.max ? r.max : r.play}, l'équipe gagne souvent ; juste après, ses chances chutent d'un coup (${ce && ce.seuil1 - 1 === r.max ? `c'est le 1er seuil d'Aya ${ce.stars}★ : à partir de la chambre ${ce.seuil1}, deux coups de gardien la tuent` : 'les gardiens tapent assez fort pour casser la boucle'}). Il n'y a donc pas de chambre intermédiaire à « 1 fois sur 2 » ou « 1 fois sur 5 ».</p>` : ''}
  ${ce ? (ce.last >= r.ceil ? `<p class="small" style="margin-top:8px"><b>Plafond théorique de la boucle d'Aya ${ce.stars}★ : chambre ${ce.last}.</b> C'est la dernière chambre où Aya survit à 2 coups de gardien${ce.heal ? ' avec un soin de 30 %' : ''} : la boucle parfaite y est encore possible, et devient impossible dès la chambre ${ce.stop}. Entre ${r.ceil} et ${ce.last}, il faut que tout tombe bien (les gardiens visent au hasard : il faut qu'ils tapent Aya au bon moment et épargnent les autres), ce qui arrive moins d'une fois sur ${r.nc || r.n * 4} dans nos simulations.</p>` : `<p class="small" style="margin-top:8px"><b>Seuil de la boucle d'Aya ${ce.stars}★ : chambre ${ce.last}.</b> C'est la dernière chambre où Aya survit à 2 coups de gardien${ce.heal ? ' avec un soin de 30 %' : ''}. Au-delà, jusqu'au plafond réel (${r.ceil}), les victoires ne viennent plus de la boucle parfaite mais du hasard${ce.heal ? '' : ' et de la boucle de secours sans soigneur (voir le guide du château)'} : il faut que les gardiens épargnent Aya au bon moment.</p>`) : ''}
  <p class="small mute" style="margin-top:8px">${r.n} combats simulés par chambre avec le moteur de combat du jeu (le même que le simulateur « Jouer une chambre ») : vraies techniques, stats exactes à tes étoiles, gardiens qui visent au hasard comme dans le jeu. L'équipe joue ses techniques dès qu'elles sont prêtes, l'échange d'Aya quand elle est basse et le soin quand l'équipe en a besoin ; un joueur précis peut faire un peu mieux.</p>`;
}
async function renderCastleReco(best, team, ok, own, mode, use) {
  const bt = best.team, r = best.r; const same = ok && bt.every(c => team.some(x => x.id === c.id)); const e = castleEval(bt, own);
  const cur = ok ? await simCastle(team, own) : null; if (!$('#rec')) return;
  $('#rec').innerHTML = `<div class="card section reco"><span class="chip ${same ? 'ok' : 'red'}">${same ? '✓ Ton équipe est déjà la meilleure' : 'Recommandation'}</span><h2 style="margin-top:10px">${same ? 'Garde cette équipe' : 'Équipe conseillée'}</h2>
    ${teamCards(bt, own)}${simBlock(r, bt, own)}${cur && !same ? `<p><b>Gain par rapport à ton équipe :</b> chambre jouable ${r.play - cur.play >= 0 ? '+' : ''}${r.play - cur.play}, chambre sûre ${r.sure - cur.sure >= 0 ? '+' : ''}${r.sure - cur.sure}.</p>` : ''}
    <h3 style="margin-top:18px">Pourquoi cette équipe</h3><ul class="list">${castleWhy(bt, own, e).map(x => `<li>${x}</li>`).join('')}</ul>
    <h3>La stratégie</h3>${e.aya ? loopSVG(e.heal) : ''}<ol class="list">${castleStrat(e).map(x => `<li>${x}</li>`).join('')}</ol>
    ${same ? '' : '<button class="btn primary" id="use" style="margin-top:12px">Utiliser cette équipe</button>'}</div>`;
  const u = $('#use'); if (u) u.onclick = () => use(bt);
}
function renderTop5(el, M) {
  let lvl = '0', tl = 'bf';
  const draw = () => { const L = M.top?.[lvl] || []; const byId = id => LRS().find(c => c.id === id);
    el.innerHTML = !L.length ? '' : `<div class="card section"><span class="chip red">Analyse approfondie</span><h2 style="margin-top:10px">Top 5 des compos ranked</h2>
      <p class="mute small">Les ${fmt(M.n)} trios autorisés par le jeu (une carte par rôle, pas deux versions du même personnage), testés avec le moteur de combat du jeu, le même que le simulateur « Jouer un match », avec toutes les techniques. Chaque trio joue contre la méta, chaque camp commençant à tour de rôle : on part des ${M.observed || 6} équipes les plus jouées en ranked, on ajoute les meilleures équipes trouvées, puis on rejoue les 60 meilleurs trios contre cette méta élargie. Les deux camps gardent Ayanokouji pour la fin : on la tape seulement si on peut l'achever, pour finir en 2 contre 1 où son échange ne sert plus. Les deux camps au même niveau d'étoiles.</p>
      <div class="tabs" id="tl" style="max-width:360px"><button data-l="0" class="${lvl === '0' ? 'on' : ''}">Tout à 0★</button><button data-l="5" class="${lvl === '5' ? 'on' : ''}">Tout à 5★</button></div>
      ${M.note ? `<p class="small" style="margin-top:10px">${esc(M.note)}</p>` : ''}
      ${L.map((t, i) => { const T = t.ids.map(byId).filter(Boolean); return `<div class="topc"><div class="row"><span class="rk">${i + 1}</span><h3 style="margin:0">${T.map(c => esc(c.n.replace(/\s*\(.*$/, ''))).join(' · ')}</h3><span class="sp"></span>${t.w != null ? `<span class="cd" style="font-size:22px">${Math.round(t.w * 100)}<span class="small mute">/100</span></span>` : ''}</div>
        <div class="teamrow mini">${T.map(c => `<div class="tm">${lrImg(c) ? `<img src="${lrImg(c)}" alt="">` : ''}<b>${esc(c.n)}</b><span class="small mute">${ROLE[c.c] || ''}</span></div>`).join('')}</div>
        ${t.build ? `<p><b>Le build :</b> ${esc(t.build)}</p>` : ''}${t.combo ? `<p><b>Les combinaisons :</b> ${esc(t.combo)}</p>` : ''}${t.strat ? `<p><b>Stratégie de jeu :</b> ${esc(t.strat)}</p>` : ''}${t.weak ? `<p class="small mute"><b>Point faible :</b> ${esc(t.weak)}</p>` : ''}</div>`; }).join('')}</div>`;
    if (M.tiers || M.tiers2) { const src = tl === 'off' && M.tiers2 ? { list: M.tiers2.list, order: M.tiers2.order, labels: {} } : { list: M.tiers, order: ['S', 'A', 'B', 'C', 'D'], labels: M.tierLabels || {} };
      const byT = {}; for (const [id, v, t] of src.list || []) { const c = byId(id); if (c) (byT[t] = byT[t] || []).push(c); }
      el.insertAdjacentHTML('beforeend', `<div class="card section"><span class="chip red">Tier list</span><h2 style="margin-top:10px">Tier list des LR en ranked</h2>
        ${M.tiers2 ? `<div class="tabs" id="tt" style="max-width:520px"><button data-t="bf" class="${tl === 'bf' ? 'on' : ''}">Brigade Fantôme</button><button data-t="off" class="${tl === 'off' ? 'on' : ''}">Équipe d'équilibrage YURO</button></div>` : ''}
        <p class="mute small" style="margin-top:8px">${tl === 'off' ? `Tier list de l'équipe d'équilibrage du jeu (mise à jour ${esc(M.tiers2.date || '')}). Selon l'équipe elle-même, c'est son avis et pas forcément la meilleure ; elle sert aussi de repère pour éviter les arnaques au trade.` : 'La tier list de la Brigade : l\'avis des joueurs, confronté aux matchs ranked.'}</p>
        ${src.order.filter(t => byT[t]).map(t => `<div class="tierrow"><span class="tier t${t}">${esc(src.labels[t] || t)}</span><div class="tierc">${byT[t].map(c => `<span class="tchip">${lrImg(c) ? `<img src="${lrImg(c)}" alt="">` : ''}${esc(c.n.replace(/\s*\(.*$/, ''))}</span>`).join('')}</div></div>`).join('')}</div>`);
      el.querySelectorAll('#tt button').forEach(b => b.onclick = () => { tl = b.dataset.t; draw(); }); }
    el.querySelectorAll('#tl button').forEach(b => b.onclick = () => { lvl = b.dataset.l; draw(); }); };
  draw();
}
async function renderRankedReco(best, team, ok, own, use) {
  const bt = best.team, r = best.r; const same = ok && bt.every(c => team.some(x => x.id === c.id)); const cur = ok && !same ? await rankedSim(team, own) : null; if (!$('#rec')) return;
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
    <div id="rec"></div>${mode === 'ranked' ? '<div id="top5"></div>' : ''}`;
  if (mode === 'ranked') loadRMeta().then(M => { const el = $('#top5'); if (el && M) renderTop5(el, M); });
  const use = async bt => { team = bt.slice(); S.mylr.teams[mode] = team.map(c => c.id); await saveMyLR(); $('.picks').innerHTML = teamPicker(team, own); bind(); show(); toast('Équipe enregistrée'); };
  const show = () => {
    const ok = team.length === 3 && roleOk(team);
    if (!ok) { $('#cur').innerHTML = team.length === 3 ? '<div class="msg">Deux cartes ont le même rôle : le jeu ne l\'accepte pas.</div>' : '<p class="mute small">Choisis 3 cartes.</p>'; }
    else if (mode === 'chateau') { $('#cur').innerHTML = `${teamCards(team, own)}<p class="mute small">Combats simulés avec le moteur du jeu…</p>`; const tk = team.map(c => c.id).join(); simCastle(team, own).then(r => { if ($('#cur') && team.map(c => c.id).join() === tk) $('#cur').innerHTML = `${teamCards(team, own)}${simBlock(r, team, own)}`; }); }
    else { $('#cur').innerHTML = `${teamCards(team, own)}<p class="mute small">Matchs simulés avec le moteur du jeu…</p>`; const tk = team.map(c => c.id).join(); rankedSim(team, own).then(r => { if ($('#cur') && team.map(c => c.id).join() === tk) $('#cur').innerHTML = `${teamCards(team, own)}${forceTxt(r)}`; }); }
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

// Outils de calcul pour l'administration (recalcul du top des compos ranked).
window.__bf = { S, twCall: (...a) => twCall(...a), engUnit: (...a) => engUnit(...a), roleOk: t => roleOk(t), LRS: () => LRS(), synergy: t => synergy(t), metaName: ids => metaName(ids), OPP };

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
  if (!$('#nw')) return;
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
    const br = await bestRankedSim(own); if (br) L.push(`Équipe ranked conseillée (matchs simulés avec le moteur du jeu contre la méta) : ${br.team.map(c => `${c.n} ${own[c.id] || 0}★`).join(', ')}, indice de force ${Math.round(br.r.avg * 100)}/100.`);
    for (const md of ['chateau', 'ranked']) { const t = (S.mylr.teams?.[md] || []).map(id => LRS().find(c => c.id === +id)).filter(Boolean); if (t.length === 3) { const r = md === 'chateau' ? await simCastle(t, own) : null; L.push(`Équipe ${md} actuelle du membre : ${t.map(c => c.n).join(', ')}${r ? ` (chambre sûre ${r.sure}, jouable ${r.play}, max ${r.max})` : ''}.`); } }
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
    const wait = say('', 'k'); wait.classList.add('think'); wait.innerHTML = '<span class="kdots"><i></i><i></i><i></i></span><span class="kth">Kakashi réfléchit</span>'; const thT = ['Kakashi réfléchit', 'Il fouille les stats et les prix', 'Il simule les combats', 'Presque prêt'], thI = setInterval(() => { const e = wait.querySelector('.kth'); if (!e) return clearInterval(thI); e.textContent = thT[Math.min(thT.length - 1, ++wait._n || (wait._n = 1))]; }, 4500); $('#ks').disabled = true;
    try { const ctx = await kakashiCtx(); const { data, error } = await sb.functions.invoke('kakashi-ai', { body: { messages: hist.slice(-8), image: img, ctx } });
      let txt = data?.answer; if (error || !txt) { let msg = data?.error; try { msg = msg || (await error?.context?.json?.())?.error; } catch {} txt = (msg ? msg + '\n\n' : '') + 'Réponse rapide depuis la base :\n' + answer(q, S.kb); }
      clearInterval(thI); wait.classList.remove('think'); wait.innerHTML = md(txt); hist.push({ role: 'assistant', content: txt }); } catch (e) { clearInterval(thI); wait.classList.remove('think'); wait.innerHTML = md(answer(q, S.kb)); }
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
    const tblock = (k, label) => { const t = team(k); if (t.length !== 3) return `<div class="card"><h3>${label}</h3><p class="mute small">Pas encore renseignée.</p></div>`; if (k === 'chateau') simCastle(t, own).then(r => { const el = document.getElementById('tb-' + k); if (el) el.innerHTML = `Chambre sûre <b>${r.sure}</b> · jouable <b>${r.play}</b> · max <b>${r.max}</b> · plafond <b>${r.ceil}</b>`; }); return `<div class="card"><h3>${label}</h3>${teamCards(t, own)}${k === 'chateau' ? `<p class="small" style="margin-top:10px" id="tb-${k}">Calcul…</p>` : ''}</div>`; };
    const coll = S.coll[id] || {}, mine = myColl();
    const dupes = U.flatMap(u => u.c.filter(c => coll[u.s]?.dupes.has(c[0])).map(c => [u, c]));
    const inc = U.map(u => ({ u, miss: u.c.filter(c => !coll[u.s]?.owned.has(c[0])) })).filter(x => x.miss.length && x.miss.length < x.u.c.length).sort((a, b) => a.miss.length - b.miss.length);
    const lrOwned = LRS().filter(c => own[c.id] != null).sort((a, b) => (own[b.id] || 0) - (own[a.id] || 0));
    m.innerHTML = `<a href="#guilde" class="btn ghost" style="min-height:36px">← Guilde</a>
      <section class="hero" style="margin-top:12px"><div class="moon"></div><span class="chip red">Profil</span>${p.nen ? ` <span class="chip">🕷 ${esc(p.nen)}${p.level != null ? ' · niv. ' + p.level : ''}</span>` : ''}<div class="row" style="margin-top:12px;align-items:center;gap:12px;flex-wrap:nowrap">${brAv({ name: p.discord, avatar: p.avatar }).replace('class="bav', 'class="bav bav-l')}<h1 style="margin:0">${esc(p.discord)}</h1></div><p class="mute">${lrOwned.length} LR · ${dupes.length} doublons</p></section>
      <div class="grid">${tblock('chateau', 'Équipe château')}${tblock('ranked', 'Équipe ranked')}</div>
      <div class="section"><h2>Ses LR</h2><div class="tiles">${lrOwned.map(c => `<div class="tile on rS">${lrImg(c) ? `<img loading="lazy" src="${lrImg(c)}" alt="">` : '<div class="noimg"></div>'}<b class="dup">${own[c.id] || 0}★</b><span>${esc(c.n)}</span></div>`).join('') || '<div class="mute">Pas encore renseignées.</div>'}</div></div>
      <div class="section"><h2>Ses doublons</h2><p class="small mute">En vert : ceux qui te manquent.</p><div class="tiles">${dupes.map(([u, c]) => tile(c, !mine[u.s]?.owned.has(c[0]), false)).join('') || '<div class="mute">Aucun doublon déclaré.</div>'}</div></div>
      <div class="section"><h2>Ses cartes manquantes</h2><p class="small mute">Par univers, du plus proche de la fin au plus lointain. En vert : celles que tu as en double.</p>
      ${inc.map(x => `<div class="card" style="margin:10px 0"><div class="row"><b>${esc(x.u.s)}</b><span class="sp"></span><span class="small mute">${x.miss.length} manquante${x.miss.length > 1 ? 's' : ''}</span></div><div class="tiles" style="margin-top:10px">${x.miss.map(c => tile(c, !!mine[x.u.s]?.dupes.has(c[0]), false)).join('')}</div></div>`).join('') || '<div class="mute">Rien à afficher.</div>'}</div>`;
    return;
  }
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Guilde</span><h1 style="margin-top:12px">Profils de la guilde</h1><p class="mute">Les membres qui partagent leur profil : leurs équipes château et ranked, leurs LR, leurs doublons et les cartes qui leur manquent.</p>${S.profile.share ? '' : '<a class="btn primary" href="#reglages">Partager mon profil</a>'}</section>
    <div class="grid">${sharing.map(p => { const lr = LRm[p.id] || {}; const own = lr.cards || {}; const ct = (lr.teams?.chateau || []).map(byId).filter(Boolean); const rt = (lr.teams?.ranked || []).map(byId).filter(Boolean); const s = memberStats(p.id, U);
      return `<a class="card gcard" href="#guilde/${p.id}"><div class="row" style="flex-wrap:nowrap;align-items:center;gap:10px">${brAv({ name: p.discord, avatar: p.avatar })}<h3 style="margin:0">${esc(p.discord)}</h3></div><div class="small mute">${Object.keys(own).length} LR · ${s.done} univers complets · ${s.du} doublons</div>${ct.length ? `<div class="small" style="margin-top:8px"><span class="mute">Château :</span> ${ct.map(c => esc(c.n)).join(', ')}</div>` : ''}${rt.length ? `<div class="small"><span class="mute">Ranked :</span> ${rt.map(c => esc(c.n)).join(', ')}</div>` : ''}</a>`; }).join('') || '<div class="empty">Personne ne partage encore son profil.</div>'}</div>`;
};

P.discord = async m => {
  m.innerHTML = `<h1>Espace Discord</h1>${DISCORD_INVITE && !DISCORD_INVITE.startsWith('__') ? `<p><a class="btn primary" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener">Rejoindre le Discord</a></p>` : ''}
  <div class="grid">
   <div class="card"><h2>Boîte à questions</h2><form id="qf"><textarea id="qb" placeholder="Ta question pour la Brigade"></textarea><button class="btn primary" style="margin-top:8px">Envoyer</button></form><div id="ql" style="margin-top:14px"></div></div>
   <div class="card"><h2>Mur des records</h2><form id="rf" class="row"><input id="rc" type="number" placeholder="Record château" style="flex:1;min-width:120px"><input id="re" type="number" placeholder="Elo ranked" style="flex:1;min-width:120px"><button class="btn">Mettre à jour</button></form><div id="rl" style="margin-top:14px"></div></div>
   <div class="card" style="grid-column:1/-1"><h2>Mon profil d'échange</h2><p class="small mute">Rempli automatiquement depuis ta <a href="${FUS() ? '#collection/L/completer' : '#checklist'}">${FUS() ? 'collection' : 'Collection Prestige'}</a> : tes doublons et les cartes qui te manquent dans les univers presque complets.</p><div id="mp"></div>
     <p class="small mute" style="margin-top:12px">${S.profile.share ? '🕷 Ton profil est partagé avec la guilde.' : 'Ton profil n\'est pas partagé.'} Ça se règle dans <a href="#reglages">Réglages</a>.</p></div>
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
  }
  loadQ(); loadR(); loadT();
};

P.reglages = async m => {
  m.innerHTML = `<h1>Réglages</h1><p class="mute">Ton profil sur le site de la Brigade.</p>
    <div class="card section"><div class="row" style="flex-wrap:nowrap;align-items:center"><div style="flex:1;min-width:0"><b>Partager ma collection avec la Brigade</b><div class="small mute">${SHARE_TXT}</div></div><label class="switch"><input type="checkbox" id="rsh" ${S.profile.share ? 'checked' : ''}><span></span></label></div></div>
    <div class="card section"><b>Compte</b><p class="small mute" style="margin:4px 0 10px">Connecté avec Discord : ${esc(S.profile.discord)}</p><button class="btn ghost" id="rlo">Se déconnecter</button></div>`;
  $('#rsh').onchange = async e => { const { error } = await sb.rpc('set_share', { v: e.target.checked }); if (error) { toast(error.message); e.target.checked = !e.target.checked; return; } S.profile.share = e.target.checked; toast(e.target.checked ? 'Collection partagée avec la Brigade' : 'Collection privée'); };
  $('#rlo').onclick = async () => { if (confirmBox('Te déconnecter ?')) { await sb.auth.signOut(); authView(); } };
};

P.admin = async m => {
  if (S.profile.role !== 'admin') { m.innerHTML = '<div class="empty">Réservé aux admins.</div>'; return; }
  m.innerHTML = `<h1>Administration</h1>
  <div class="card section"><h2>Arrivée des nouveaux membres</h2><p class="small mute">Combien de membres ont passé chaque étape de l'accueil obligatoire. La plus grosse chute montre l'étape qui fait décrocher. Un membre qui part reprend automatiquement là où il s'était arrêté à sa prochaine connexion.</p><div id="fun"></div></div>
  <div class="card section"><h2>Demandes d'accès</h2><div id="pd"></div></div>
  <div class="grid">
   <div class="card"><h2>Calendrier</h2><form id="ef"><label>Titre</label><input id="et" required><label>Détail</label><input id="ed"><label>Type</label><select id="ek"><option value="ranked">ranked</option><option value="prestige">prestige</option><option value="event">événement</option></select><label>Fin (heure de Paris)</label><input id="ee" type="datetime-local" required><label>Se répète tous les … jours (vide = non)</label><input id="er" type="number" min="1"><button class="btn primary" style="margin-top:10px">Ajouter</button></form><div id="el" style="margin-top:12px"></div></div>
   <div class="card"><h2>Nouveauté</h2><form id="nf"><label>Titre</label><input id="nt" required><label>Texte</label><textarea id="nb" required></textarea><button class="btn primary" style="margin-top:10px">Publier</button></form></div>
   <div class="card"><h2>Questions sans réponse</h2><div id="qa"></div></div>
  </div>`;
  (async () => { const { data: f, error } = await sb.rpc('onboarding_funnel'); const el = $('#fun'); if (!el) return; if (error || !f) { el.innerHTML = '<p class="small mute">Indisponible.</p>'; return; }
    const st = [['inscrits', 'Inscrits sur le site'], ['video', 'Vidéo de bienvenue vue'], ['c', 'Communes remplies'], ['r', 'Rares remplies'], ['sr', 'SR remplies'], ['ssr', 'SSR importées'], ['ur', 'UR importées'], ['lr', 'LR importées'], ['done', 'Accueil terminé']];
    const top = Math.max(1, f.inscrits || 0); let prev = null;
    el.innerHTML = st.map(([k, l]) => { const n = f[k] || 0, drop = prev != null && prev > 0 ? Math.round((prev - n) / prev * 100) : null; prev = n; return `<div class="funrow"><span class="small">${l}</span><div class="bar"><i style="width:${n / top * 100}%"></i></div><b class="small">${n}</b><span class="small ${drop >= 30 ? 'red' : 'mute'}">${drop ? '−' + drop + ' %' : ''}</span></div>`; }).join(''); })();
  const loadP = async () => { const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false }); $('#pd').innerHTML = `<div class="tablewrap"><table><thead><tr><th>@ Discord</th><th>Statut</th><th>Demande</th><th></th></tr></thead><tbody>${(data || []).map(p => `<tr><td><b>${esc(p.discord)}</b>${p.role === 'admin' ? ' <span class="chip red">admin</span>' : ''}</td><td><span class="chip ${p.status === 'approved' ? 'ok' : p.status === 'refused' ? 'red' : 'warn'}">${p.status === 'refused' && p.revoked ? 'révoqué' : { approved: 'validé', refused: 'refusé', pending: 'en attente' }[p.status]}</span></td><td class="small mute">${new Date(p.created_at).toLocaleString('fr-FR')}</td><td class="n">${p.role === 'admin' || p.id === S.user.id ? '' : p.status === 'approved' ? `<button class="btn ghost" data-a="${p.id}" data-s="revoke" style="min-height:36px">🚫 Révoquer l'accès</button>` : p.status === 'refused' ? `<button class="btn" data-a="${p.id}" data-s="approved" style="min-height:36px">Rétablir l'accès</button>` : `<button class="btn" data-a="${p.id}" data-s="approved" style="min-height:36px">Valider</button> <button class="btn ghost" data-a="${p.id}" data-s="refused" style="min-height:36px">Refuser</button>`}</td></tr>`).join('')}</tbody></table></div>`; $('#pd').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { const p = (data || []).find(x => x.id === b.dataset.a); let patch;
    if (b.dataset.s === 'revoke') { if (!confirmBox(`Révoquer l'accès de ${p.discord} ? Il sera déconnecté du site et ne pourra plus entrer, même s'il reste sur le Discord.`)) return; patch = { status: 'refused', revoked: true }; } else patch = { status: b.dataset.s, revoked: b.dataset.s === 'refused' };
    const r = await sb.from('profiles').update(patch).eq('id', b.dataset.a); if (r.error) toast(r.error.message); else toast(b.dataset.s === 'revoke' ? 'Accès révoqué' : 'Fait'); loadP(); }); };
  const loadE = async () => { const { data } = await sb.from('events').select('*').order('ends_at'); $('#el').innerHTML = (data || []).map(e => `<div class="row small" style="border-top:1px solid var(--line);padding:8px 0"><span>${esc(e.title)} · ${new Date(e.ends_at).toLocaleString('fr-FR')}${e.repeat_days ? ` · tous les ${e.repeat_days} j` : ''}</span><span class="sp"></span><button class="chip" data-x="${e.id}" style="cursor:pointer">Supprimer</button></div>`).join(''); $('#el').querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { await sb.from('events').delete().eq('id', b.dataset.x); loadE(); }); };
  const loadQA = async () => { const { data } = await sb.from('questions').select('*').is('answer', null).order('at'); $('#qa').innerHTML = (data || []).map(q => `<div style="border-top:1px solid var(--line);padding:8px 0"><div>${esc(q.body)}</div><div class="row" style="margin-top:6px"><input data-qa="${q.id}" placeholder="Réponse" style="flex:1;min-height:38px"><button class="btn" data-qs="${q.id}" style="min-height:38px">OK</button></div></div>`).join('') || '<div class="small mute">Rien à répondre.</div>'; $('#qa').querySelectorAll('[data-qs]').forEach(b => b.onclick = async () => { const v = $(`[data-qa="${b.dataset.qs}"]`).value; await sb.from('questions').update({ answer: v }).eq('id', b.dataset.qs); loadQA(); }); };
  $('#ef').onsubmit = async e => { e.preventDefault(); const r = await sb.from('events').insert({ title: $('#et').value, detail: $('#ed').value || null, kind: $('#ek').value, ends_at: new Date($('#ee').value).toISOString(), repeat_days: +$('#er').value || null }); if (r.error) return toast(r.error.message); e.target.reset(); loadE(); };
  $('#nf').onsubmit = async e => { e.preventDefault(); await sb.from('news').insert({ title: $('#nt').value, body: $('#nb').value }); e.target.reset(); toast('Publié'); };
  loadP(); loadE(); loadQA();
};


/* ---------- Tournoi de guildes ---------- */
const T_RULES = [
  ['Univers', 'Même univers : les 3 cartes viennent du même anime.'],
  ['Rôles', 'Interdit : healer.'],
  ['Rôles', 'Interdit : stunner (pas d\'arrêt du temps, pas de domination).'],
  ['Rôles', '1 healer obligatoire dans l\'équipe.'],
  ['Rareté', 'Pas de LR : Mythique maximum.'],
  ['Rareté', '1 LR maximum par équipe.'],
  ['Rareté', 'Cartes à 0 étoile uniquement (règle d\'honneur).'],
  ['Rareté', 'Interdit : les LR du rang S de la tier list.'],
  ['Draft', 'Draft à budget : 10 points maximum pour l\'équipe, selon le barème de la tier list ci-dessous.'],
  ['Draft', 'Phase de ban : chaque joueur bannit 1 carte avant de composer son équipe (comme en ranked Brawl Stars). Les cartes bannies sont interdites aux deux joueurs.'],
  ['Draft', 'Carte imposée : une carte est tirée au sort parmi celles que les deux joueurs possèdent, elle doit être dans les deux équipes.'],
  ['Format', 'Interdit de reprendre la même compo au tour suivant.'],
  ['Format', 'BO3 à partir des demi-finales : entre deux manches, chaque joueur peut changer toute son équipe.'],
  ['Fun', 'Équipe « méchants » uniquement.'],
  ['Fun', 'Équipe de personnages féminins uniquement.']
];
const T_FIXED = ['Les compos restent secrètes : chaque joueur envoie son équipe à l\'arbitre en MP avant le duel, sans voir celle de l\'adversaire.', 'Une carte par rôle, comme dans le jeu.'];
const T_POINTS = [['LR rang S', 5], ['LR rang A', 4], ['LR rang B', 3], ['LR rang C', 2], ['LR rang D ou non classée', 2], ['Mythique', 1], ['Légendaire et moins', 0]];
const T_PAY = n => n <= 8 ? [65, 35] : n <= 16 ? [50, 30, 20] : n <= 32 ? [40, 25, 15, 10, 5, 5] : [30, 20, 14, 10, 8, 6, 4, 4, 2, 2];
const T_BRACKETS = [[8, 'Jusqu\'à 8 joueurs'], [16, 'De 9 à 16 joueurs'], [32, 'De 17 à 32 joueurs'], [999, 'Plus de 32 joueurs']];
/* ---------- Tournoi : tableau (bracket) avec tirage au sort ---------- */
const BR_KEY = 'tournoi_bracket';
const brRoundName = (k, total) => { const fromEnd = total - 1 - k; return ['Finale', 'Demi-finales', 'Quarts de finale', '8es de finale', '16es de finale', '32es de finale'][fromEnd] || `Tour ${k + 1}`; };
function brBuild(players) {
  const n = players.length; let size = 4; while (size < n) size *= 2;
  // Ordre classique des têtes de série : les exempts tombent sur des matchs différents, répartis des deux côtés.
  let order = [1, 2]; while (order.length < size) { const m = order.length * 2 + 1; order = order.flatMap(s => [s, m - s]); }
  const sh = players.slice().sort(() => Math.random() - .5);
  const slot = order.map(seed => seed <= n ? seed - 1 : null);
  const rounds = []; let cur = []; for (let i = 0; i < size; i += 2) cur.push({ a: slot[i], b: slot[i + 1], w: null }); rounds.push(cur);
  while (cur.length > 1) { const nx = []; for (let i = 0; i < cur.length; i += 2) nx.push({ a: null, b: null, w: null }); rounds.push(nx); cur = nx; }
  const t = { at: Date.now(), n, size, players: sh, rounds }; brPropagate(t); return t;
}
function brPropagate(t) {
  for (let k = 0; k < t.rounds.length; k++) t.rounds[k].forEach((m, i) => {
    if (k > 0) { const p = t.rounds[k - 1]; m.a = p[2 * i].w; m.b = p[2 * i + 1].w; if (m.w != null && m.w !== m.a && m.w !== m.b) m.w = null; }
    const firstRound = k === 0; if (m.w == null && firstRound && (m.a == null) !== (m.b == null)) m.w = m.a ?? m.b; // exempt : passe direct
  });
}
const brAv = p => p?.avatar ? `<img class="bav" src="${esc(p.avatar)}" alt="" loading="lazy">` : `<span class="bav bav0">${esc((p?.name || '?').replace('@', '').charAt(0).toUpperCase())}</span>`;
function brSlot(t, idx, m, k, i, side, admin) {
  if (idx == null) return `<div class="bslot empty">${k === 0 ? 'Exempt' : '—'}</div>`;
  const p = t.players[idx], win = m.w === idx, lose = m.w != null && m.w !== idx;
  return `<div class="bslot${win ? ' win' : ''}${lose ? ' lose' : ''}"${admin && m.a != null && m.b != null ? ` data-bw="${k}:${i}:${idx}" role="button" tabindex="0"` : ''}>${brAv(p)}<span class="bn">${esc(p.name)}</span></div>`;
}
const brDrawRules = k => { const out = [], cats = new Set(); for (const i of T_RULES.map((_, i) => i).sort(() => Math.random() - .5)) { if (out.length >= k) break; if (cats.has(T_RULES[i][0])) continue; cats.add(T_RULES[i][0]); out.push(T_RULES[i]); } return out; };
const brRulesTxt = rs => rs.map(r => `<b>${esc(r[0])}</b> · ${esc(r[1])}`).join('<br>');
function brHTML(t, admin) {
  const R = t.rounds, L = R.length;
  const rr = k => t.rules?.mode === 'tour' && t.rules.list[k] ? `<div class="brule">${brRulesTxt(t.rules.list[k])}</div>` : '';
  const col = (k, from, to, side) => `<div class="bcol"><div class="bround">${brRoundName(k, L)}</div>${rr(k)}<div class="bms">${R[k].slice(from, to).map((m, j) => { const i = from + j; return `<div class="bm ${side}">${brSlot(t, m.a, m, k, i, side, admin)}${brSlot(t, m.b, m, k, i, side, admin)}</div>`; }).join('')}</div></div>`;
  const left = [], right = [];
  for (let k = 0; k < L - 1; k++) { const h = R[k].length / 2; left.push(col(k, 0, h, 'l')); right.unshift(col(k, h, R[k].length, 'r')); }
  const f = R[L - 1][0], champ = f.w != null ? t.players[f.w] : null;
  return `<div class="bracket"><div class="bside">${left.join('')}</div>
    <div class="bcenter"><div class="btitle">Tournoi<br><b>de la Brigade</b></div><div class="bround">Finale</div>${rr(L - 1)}<div class="bm final">${brSlot(t, f.a, f, L - 1, 0, 'c', admin)}${brSlot(t, f.b, f, L - 1, 0, 'c', admin)}</div>
      <div class="bchamp"><div class="bround">Champion</div>${champ ? `<div class="bslot win big">${brAv(champ)}<span class="bn">${esc(champ.name)}</span></div>` : '<div class="bslot empty big">À venir</div>'}</div></div>
    <div class="bside">${right.join('')}</div></div>`;
}
async function brSection(el) {
  const admin = S.profile.role === 'admin';
  const [{ data: row }, { data: mem }] = await Promise.all([sb.from('content').select('data').eq('key', BR_KEY).maybeSingle(), sb.from('profiles').select('id,discord,avatar').eq('status', 'approved')]);
  let t = row?.data?.rounds ? row.data : null; const members = (mem || []).filter(p => p.discord).sort((a, b) => a.discord.localeCompare(b.discord));
  const save = async () => { const { error } = await sb.from('content').upsert({ key: BR_KEY, data: t }); if (error) toast('Enregistrement refusé : ' + error.message); };
  const draw = () => {
    el.innerHTML = `<div class="card section"><div class="row"><h2 style="margin:0">Le tableau</h2><span class="sp"></span>${t ? `<span class="chip">${t.n} joueurs · tableau de ${t.size}</span>` : ''}</div>
      ${t?.rules?.mode === 'all' ? `<div class="focusnote" style="margin-top:10px"><b>Règle${t.rules.list[0].length > 1 ? 's' : ''} du tournoi :</b><br>${brRulesTxt(t.rules.list[0])}</div>` : t?.rules?.mode === 'tour' ? '<p class="small mute" style="margin-top:8px">Une règle différente à chaque tour : elle est affichée sous le nom du tour.</p>' : ''}${t ? `<div class="bwrap">${brHTML(t, admin)}</div><p class="small mute">${admin ? 'Touche le joueur qui a gagné son duel pour le faire avancer (touche à nouveau pour corriger). ' : ''}Les exempts passent directement au tour suivant. BO3 à partir des demi-finales.</p>` : '<p class="mute">Le tableau n\'a pas encore été tiré au sort.</p>'}
      ${admin && t ? `<div class="row" style="margin-top:12px;flex-wrap:wrap;gap:8px"><b>Règles tirées au sort :</b><select id="brm"><option value="all"${t.rules?.mode === 'all' ? ' selected' : ''}>Une pour tout le tournoi</option><option value="tour"${t.rules?.mode === 'tour' ? ' selected' : ''}>Une différente à chaque tour</option></select><select id="brk2">${[1, 2, 3].map(k => `<option value="${k}">${k} règle${k > 1 ? 's' : ''}</option>`).join('')}</select><button class="btn primary" id="brr" style="min-height:36px">🎲 Tirer les règles</button>${t.rules ? '<button class="btn ghost" id="brx" style="min-height:36px">Retirer les règles</button>' : ''}</div>` : ''}
      ${admin ? `<details${t ? '' : ' open'} style="margin-top:12px"><summary><b>${t ? 'Nouveau tirage' : 'Lancer le tournoi'}</b></summary>
        <p class="small mute">Coche les participants (membres connectés au site, avec leur photo Discord) et ajoute ceux qui n'ont pas de compte. De 4 à 50 joueurs : tableau de 8, 16, 32 ou 64 places, les places vides donnent un exempt. Idéal sans exempt : 8, 16 ou 32 joueurs.</p>
        <div class="row" style="margin:8px 0"><button class="btn primary" id="bimp" style="min-height:36px">📥 Inscrits Discord</button><button class="btn ghost" id="ball" style="min-height:36px">Tout cocher</button><button class="btn ghost" id="bnone" style="min-height:36px">Tout décocher</button><span class="sp"></span><b id="bcount"></b></div>
        <div class="bpick">${members.map(p => `<label class="bpk"><input type="checkbox" value="${p.id}">${brAv({ name: p.discord, avatar: p.avatar })}<span>${esc(p.discord)}</span></label>`).join('')}</div>
        <label class="small" style="display:block;margin-top:10px">Autres joueurs (un @ Discord par ligne)<br><textarea id="bextra" rows="3" style="width:100%"></textarea></label>
        <div class="row" style="margin-top:10px"><button class="btn primary" id="bgo">🎲 Tirer au sort le tableau</button>${t ? '<button class="btn ghost" id="bdel">Effacer le tableau</button>' : ''}</div></details>` : ''}</div><div id="bets">${t ? '' : '<div class="card section"><h2>Paris</h2><p class="small mute">Les paris ouvriront dès que le tableau sera tiré au sort : 5 000 KI par pari sur le vainqueur de chaque duel, définitif une fois validé.</p></div>'}</div>`;
    if (t) betSection($('#bets'), t, admin, save);
    if (t && admin) el.querySelectorAll('[data-bw]').forEach(b => b.onclick = async () => { const [k, i, idx] = b.dataset.bw.split(':').map(Number); const m = t.rounds[k][i]; m.w = m.w === idx ? null : idx; brPropagate(t); draw(); await save(); });
    if (!admin) return;
    if ($('#brr')) $('#brr').onclick = async () => { const mode = $('#brm').value, k = +$('#brk2').value; if (t.rules && !confirm('Remplacer les règles déjà tirées ?')) return; t.rules = { mode, list: mode === 'all' ? [brDrawRules(k)] : t.rounds.map(() => brDrawRules(k)) }; draw(); await save(); toast('Règles tirées au sort'); };
    if ($('#brx')) $('#brx').onclick = async () => { delete t.rules; draw(); await save(); };
    const boxes = () => [...el.querySelectorAll('.bpick input')], extra = () => ($('#bextra').value || '').split('\n').map(s => s.trim()).filter(Boolean);
    const cnt = () => { const n = boxes().filter(b => b.checked).length + extra().length; let sz = 4; while (sz < n) sz *= 2; $('#bcount').textContent = n < 4 ? `${n} joueur${n > 1 ? 's' : ''} (minimum 4)` : n > 50 ? `${n} joueurs (maximum 50)` : `${n} joueurs · tableau de ${sz}${sz - n ? ` · ${sz - n} exempt${sz - n > 1 ? 's' : ''}` : ''}`; };
    boxes().forEach(b => b.onchange = cnt); $('#bextra').oninput = cnt; $('#ball').onclick = () => { boxes().forEach(b => b.checked = true); cnt(); }; $('#bnone').onclick = () => { boxes().forEach(b => b.checked = false); cnt(); }; cnt();
    $('#bimp').onclick = async () => {
      const [{ data: c }, { data: ents }] = await Promise.all([sb.from('content').select('key,data').in('key', ['tournoi_inscriptions', 'tournoi_paid']), sb.from('tourn_entries').select('discord_id,username,handle')]);
      const C = Object.fromEntries((c || []).map(r => [r.key, r.data])), ins = C.tournoi_inscriptions;
      if (!ins) { toast('Aucune inscription ouverte sur Discord (commande /tournoi).'); return; }
      const paid = new Set((C.tournoi_paid?.list || []).filter(x => x[1] >= ins.at && +x[2] === +(ins.price || 5000)).map(x => String(x[0])));
      const ok = (ents || []).filter(e => paid.has(e.discord_id)); let n = 0; const ex = [];
      ok.forEach(e => { const p = members.find(m => (m.discord || '').toLowerCase() === (e.handle || '').toLowerCase()); const box = p && boxes().find(b => b.value === p.id); if (box) { box.checked = true; n++; } else ex.push(e.handle || e.username); });
      const ta = $('#bextra'); const cur = new Set(extra()); ex.forEach(h => cur.add(h)); ta.value = [...cur].join('\n'); cnt();
      toast(`${ok.length} inscrit${ok.length > 1 ? 's' : ''} validé${ok.length > 1 ? 's' : ''} (achat vérifié) ajouté${ok.length > 1 ? 's' : ''}.`);
    };
    if ($('#bdel')) $('#bdel').onclick = async () => { if (!confirm('Effacer le tableau en cours ?')) return; await sb.from('content').delete().eq('key', BR_KEY); t = null; draw(); };
    $('#bgo').onclick = async () => {
      const ps = boxes().filter(b => b.checked).map(b => { const p = members.find(x => x.id === b.value); return { name: p.discord, avatar: p.avatar || null }; });
      extra().forEach(s => ps.push({ name: s.startsWith('@') ? s : '@' + s, avatar: null }));
      if (ps.length < 4 || ps.length > 50) { toast('Il faut entre 4 et 50 joueurs.'); return; }
      if (t && !confirm('Remplacer le tableau en cours par un nouveau tirage ?')) return;
      t = brBuild(ps); draw(); await save(); toast('Tableau tiré au sort');
    };
  };
  draw();
}

/* ---------- Paris du tournoi : 5 000 KI par pari, engagement définitif (le site ne déplace aucun KI) ---------- */
const BET = 5000;
async function betSection(el, t, admin, save) {
  const tour = t.at, L = t.rounds.length, me = S.user?.id;
  const [{ data: bets }, { data: board }, { data: pr }] = await Promise.all([
    sb.from('tbets').select('user_id,k,i,pick,created_at').eq('tour', tour).order('created_at'),
    sb.rpc('tb_board', { tr: tour }), sb.from('profiles').select('id,discord')]);
  const B = bets || [], lock = new Set(t.lock || []), who = Object.fromEntries((pr || []).map(p => [p.id, p.discord || '?']));
  const myName = (S.profile.discord || '').toLowerCase().replace(/^@/, '');
  const pn = idx => t.players[idx]?.name || '?';
  const share = (nw, nl) => nw ? Math.floor(BET * nl / nw) : 0;
  const duels = []; t.rounds.forEach((r, k) => r.forEach((m, i) => { if (m.a != null && m.b != null) duels.push({ k, i, m }); }));
  const names = arr => arr.length ? arr.map(b => esc(who[b.user_id] || '?')).join(', ') : '<span class="mute">personne</span>';
  const card = ({ k, i, m }) => {
    const mb = B.filter(b => b.k === k && b.i === i), on = idx => mb.filter(b => b.pick === idx);
    const mine = mb.find(b => b.user_id === me), done = m.w != null, closed = done || lock.has(k + ':' + i);
    const own = [m.a, m.b].some(x => pn(x).toLowerCase().replace(/^@/, '') === myName);
    const opt = idx => { const n = on(idx).length, other = on(idx === m.a ? m.b : m.a).length, g = share(n + (mine ? 0 : 1), other);
      return `<button class="bopt${mine?.pick === idx ? ' mine' : ''}${done && m.w === idx ? ' won' : ''}${done && m.w !== idx ? ' lost' : ''}" data-bp="${k}:${i}:${idx}" ${closed || mine || own ? 'disabled' : ''}>${brAv(t.players[idx])}<span class="bn">${esc(pn(idx))}</span><small>${n} pari${n > 1 ? 's' : ''}${!closed && !mine && !own ? ` · si tu gagnes : +${fmt(g)} KI` : ''}</small></button>`; };
    let res = '';
    if (done) { const W = on(m.w), Lo = mb.filter(b => b.pick !== m.w), g = share(W.length, Lo.length);
      res = `<div class="bres small"><b>Résultat :</b> ${esc(pn(m.w))} gagne.<br>✅ Gagnants (${W.length}) : ${names(W)} → chacun récupère ses 5 000 KI ${g ? `<b>+ ${fmt(g)} KI</b>` : '(personne en face : pas de gain)'}<br>❌ Perdants (${Lo.length}) : ${names(Lo)} → chacun paie 5 000 KI</div>`; }
    else res = `<details class="small"><summary>Qui a parié ?</summary>${esc(pn(m.a))} : ${names(on(m.a))}<br>${esc(pn(m.b))} : ${names(on(m.b))}</details>`;
    let foot = '';
    if (mine) foot = `<p class="small">🔒 Tu as parié <b>5 000 KI</b> sur <b>${esc(pn(mine.pick))}</b> · définitif</p>`;
    else if (own) foot = '<p class="small mute">Tu joues ce duel : pas de pari possible.</p>';
    else if (closed && !done) foot = '<p class="small mute">Paris fermés : le duel a commencé.</p>';
    else if (!closed) foot = '<p class="small mute">Touche un joueur pour parier 5 000 KI sur lui.</p>';
    return `<div class="bbet${closed ? ' closed' : ''}"><div class="row"><b class="small">${brRoundName(k, L)}</b><span class="sp"></span><span class="small mute">${mb.length} pari${mb.length > 1 ? 's' : ''} · ${fmt(mb.length * BET)} KI</span>${admin && !done ? `<button class="btn ghost" data-lk="${k}:${i}" style="min-height:28px;padding:0 8px">${lock.has(k + ':' + i) ? '🔓 Rouvrir' : '🔒 Fermer les paris'}</button>` : ''}</div><div class="bopts">${opt(m.a)}<span class="bvs">VS</span>${opt(m.b)}</div>${res}${foot}</div>`;
  };
  const open = duels.filter(d => d.m.w == null), past = duels.filter(d => d.m.w != null).reverse();
  const myNet = (board || []).find(r => r.user_id === me)?.bal || 0;
  el.innerHTML = `<div class="card section"><div class="row"><h2 style="margin:0">Paris</h2><span class="sp"></span><span class="chip red">Ton bilan : <b>${myNet > 0 ? '+' : ''}${fmt(myNet)} KI</b></span></div>
    <p class="small mute">Pari fixe de <b>5 000 KI</b> sur le vainqueur de chaque duel, un pari par membre et par duel. <b>Un pari validé est définitif : impossible de le modifier ou de l'effacer.</b> Si ton joueur gagne, tu récupères ta mise et les gagnants se partagent à parts égales les mises de ceux qui ont parié sur l'autre joueur. Le site ne déplace aucun KI : il enregistre les engagements et affiche qui doit quoi, le règlement se fait dans le jeu. Les paris ferment quand le duel commence.</p>
    <h3>Duels ouverts</h3>${open.length ? `<div class="bbets">${open.map(card).join('')}</div>` : '<p class="mute small">Aucun duel ouvert pour l\'instant.</p>'}
    ${past.length ? `<h3 style="margin-top:16px">Duels terminés</h3><div class="bbets">${past.map(card).join('')}</div>` : ''}
    ${(board || []).length ? `<h3 style="margin-top:16px">Bilan des parieurs</h3><table class="tbl"><tr><th>Membre</th><th>Paris</th><th>Bilan</th></tr>${board.map(r => `<tr><td>${esc(r.discord)}</td><td>${r.n}</td><td><b style="color:${r.bal > 0 ? '#7be3a4' : r.bal < 0 ? '#ff6b6b' : 'inherit'}">${r.bal > 0 ? '+' : ''}${fmt(r.bal)} KI</b></td></tr>`).join('')}</table><p class="small mute">Bilan = gains moins mises perdues sur les duels terminés (positif : à recevoir, négatif : à payer).</p>` : ''}</div>`;
  el.querySelectorAll('[data-bp]').forEach(b => b.onclick = async () => {
    const [k, i, idx] = b.dataset.bp.split(':').map(Number);
    if (!confirm(`Parier 5 000 KI sur ${pn(idx)} ?\n\nCe pari est DÉFINITIF : tu ne pourras ni le modifier ni l'effacer. Si ${pn(idx)} perd, tu dois 5 000 KI.`)) return;
    b.disabled = true;
    const { error } = await sb.from('tbets').insert({ tour, k, i, pick: idx, stake: BET });
    if (error) { toast(/duplicate/i.test(error.message) ? 'Tu as déjà parié sur ce duel.' : error.message); b.disabled = false; return; }
    toast('Pari enregistré 🔒'); betSection(el, t, admin, save);
  });
  el.querySelectorAll('[data-lk]').forEach(b => b.onclick = async () => { const key = b.dataset.lk; lock.has(key) ? lock.delete(key) : lock.add(key); t.lock = [...lock]; await save(); betSection(el, t, admin, save); });
}

P.tournoi = async m => {
  const pool = T_RULES;
  const { data: rm } = await sb.from('content').select('data').eq('key', 'ranked_meta').maybeSingle();
  const tiers = rm?.data?.tiers || []; const byT = {}; tiers.forEach(([id, , t]) => { const c = LRS().find(x => x.id === id); if (c) (byT[t] = byT[t] || []).push(c.n); });
  m.innerHTML = `<section class="hero"><div class="moon"></div><span class="chip red">Tournoi</span><h1 style="margin-top:12px">Tournoi de duels entre guildes</h1>
    <p class="mute">Mise de 5 000 à 10 000 KI par joueur, cagnotte redistribuée comme au poker, et des règles tirées au sort pour que tout le monde puisse jouer avec sa collection.</p></section>
    <div id="brk"></div>
    <div class="card section"><h2>Calculer la cagnotte</h2>
      <div class="row" style="flex-wrap:wrap;gap:10px">
        <label class="small">Participants<br><input id="tn" type="number" min="2" value="16" style="width:110px"></label>
        <label class="small">Mise par joueur (KI)<br><input id="tm" type="number" min="5000" max="10000" step="500" value="5000" style="width:130px"></label>
        <label class="small">Dons des chefs (KI)<br><input id="td" type="number" min="0" step="1000" value="0" style="width:130px"></label>
      </div><div id="tout" style="margin-top:12px"></div></div>
    <div class="card section"><h2>Règles fixes</h2><ul class="list">${T_FIXED.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    <div class="card section"><h2>Tirer les règles au sort</h2>
      <div class="row"><label class="small">Nombre de règles <select id="tk">${[1, 2, 3].map(k => `<option${k === 2 ? ' selected' : ''}>${k}</option>`).join('')}</select></label><span class="sp"></span><button class="btn primary" id="tdraw">🎲 Tirer au sort</button></div>
      <p class="small mute">Jamais deux règles de la même famille dans un tirage.</p>
      <div id="tres" style="margin-top:12px"></div>
      <details style="margin-top:12px"><summary class="small">Toutes les règles possibles (${pool.length})</summary><ul class="list">${pool.map(r => `<li><b>${esc(r[0])}</b> · ${esc(r[1])}</li>`).join('')}</ul></details></div>
    <div class="card section"><h2>Barème du draft à budget</h2><p class="small mute">Budget de 10 points pour les 3 cartes. Rangs de la tier list ranked de la Brigade.</p>
      <table class="tbl"><tr><th>Carte</th><th>Points</th></tr>${T_POINTS.map(p => `<tr><td>${esc(p[0])}</td><td><b>${p[1]}</b></td></tr>`).join('')}</table>
      ${['S', 'A', 'B', 'C', 'D'].filter(t => byT[t]).map(t => `<p class="small" style="margin-top:8px"><b>Rang ${t}</b> : ${byT[t].map(esc).join(', ')}</p>`).join('')}</div>`;
  const calc = () => {
    const n = Math.max(2, +$('#tn').value || 0), mi = Math.min(10000, Math.max(5000, +$('#tm').value || 0)), d = Math.max(0, +$('#td').value || 0);
    const tot = n * mi + d, pc = T_PAY(n), place = i => i ? (i + 1) + 'e' : '1er';
    $('#tout').innerHTML = `<div class="k">Cagnotte finale</div><div class="v">${fmt(tot)} <span class="small mute">KI</span></div>
      <p class="small mute">${n} joueurs × ${fmt(mi)} KI${d ? ` + ${fmt(d)} KI de dons des chefs` : ''} · ${pc.length} places payées</p>
      <div class="grid" style="margin-top:10px">${pc.map((p, i) => `<div class="card"><div class="k">${i < 3 ? ['🥇', '🥈', '🥉'][i] + ' ' : ''}${place(i)}</div><div class="v">${fmt(Math.floor(tot * p / 100))} <span class="small mute">KI</span></div><div class="small mute">${p} % de la cagnotte</div></div>`).join('')}</div>
      <details style="margin-top:12px"><summary class="small">Gains selon le nombre de joueurs (même mise et mêmes dons)</summary>
      <table class="tbl"><tr><th>Joueurs</th><th>Cagnotte</th><th>Gains</th></tr>${[8, 16, 24, 32, 48].map(k => { const t = k * mi + d; return `<tr><td>${k}</td><td>${fmt(t)}</td><td class="small">${T_PAY(k).map((p, i) => `${place(i)} ${fmt(Math.floor(t * p / 100))}`).join(' · ')}</td></tr>`; }).join('')}</table>
      <p class="small mute">Paliers : ${T_BRACKETS.map(([k, l]) => `${l} : ${T_PAY(k).join(' / ')} %`).join(' · ')}.</p></details>`;
  };
  ['#tn', '#tm', '#td'].forEach(k => $(k).oninput = calc); calc();
  brSection($('#brk'));
  $('#tdraw').onclick = () => {
    const k = +$('#tk').value, out = [], cats = new Set();
    for (const i of pool.map((_, i) => i).sort(() => Math.random() - .5)) { if (out.length >= k) break; if (cats.has(pool[i][0])) continue; cats.add(pool[i][0]); out.push(pool[i]); }
    $('#tres').innerHTML = out.map(r => `<div class="focusnote"><b>${esc(r[0])} :</b> ${esc(r[1])}</div>`).join('');
  };
};

/* ---------- Routeur ---------- */
async function render() {
  S.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); S.timers = [];
  const h = (location.hash || '#accueil').slice(1);
  const [base, ...rest] = h.split('/'); const arg = rest.join('/');
  const route = ['guide', 'equipe'].includes(base) ? h : base;
  await loadMyLR();
  const reimp = reimpMode();
  if (reimp && base !== 'clic') { location.hash = '#clic'; return; }
  const onb = onbMode() || reimp;
  if (onbMode() && (!onbAllowed(base, arg) || (base !== 'bienvenue' && !S.mylr?.teams?.video && !isPreview()))) { if (location.hash !== '#bienvenue') { location.hash = '#bienvenue'; return; } }
  let m = $('#main');
  if (onb) { if (!m || app.dataset.mode !== 'onb') m = shellOnb(); else m.innerHTML = '';
    $('#onbback').innerHTML = (base !== 'bienvenue' && !reimp ? '<a class="btn ghost" href="#bienvenue" style="min-height:38px;margin-bottom:12px">← Retour aux étapes</a>' : '') + (isPreview() ? ' <a class="btn ghost" id="qprev" href="#" style="min-height:38px;margin-bottom:12px">Quitter l\'aperçu</a>' : '');
    const q = $('#qprev'); if (q) q.onclick = e => { e.preventDefault(); location.href = location.pathname + '#accueil'; }; }
  else if (!m || !$('#side') || app.dataset.mode !== 'full') m = shell(route);
  else { $('#side').querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + route)); m.innerHTML = ''; }
  // Thème « La toile » partout sauf dans les simulateurs de jeu.
  const sim = ['chateausim', 'simulateur'].includes(base); document.body.classList.toggle('th-c', !sim);
  try { await (P[base] || P.accueil)(m, arg); } catch (e) { m.innerHTML = `<div class="empty">Erreur de chargement : ${esc(e.message)}</div>`; }
  if (!sim) { m.classList.remove('th-in'); void m.offsetWidth; m.classList.add('th-in'); const w = $('#mainw'); if (w) { w.querySelector('.th-spider')?.remove(); const sp = document.createElement('div'); sp.className = 'th-spider'; sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = '<i></i><svg viewBox="0 0 48 48"><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M19 17 13 9 6 7M18 21 9 18 2 20M18 26 9 30 4 37M20 30 15 38 14 46M29 17 35 9 42 7M30 21 39 18 46 20M30 26 39 30 44 37M28 30 33 38 34 46"/></g><ellipse cx="24" cy="17" rx="5" ry="5" fill="#fff"/><ellipse cx="24" cy="30" rx="7.5" ry="10" fill="#fff"/><path d="M24 26.5l2.2 3.5L24 33.5 21.8 30z" fill="#e3123a"/></svg>'; w.appendChild(sp); } }
  else { m.classList.remove('th-in'); $('#mainw')?.querySelector('.th-spider')?.remove(); }
  window.scrollTo(0, 0);
  wireInstall();
  try { if (Date.now() - (+localStorage.bf_lurkr || 0) > 3600000) { localStorage.bf_lurkr = String(Date.now()); sb.functions.invoke('lurkr-sync', { body: {} }).catch(() => {}); } } catch (e) { /* rien */ }
  alertLoop();
}

async function boot() {
  S.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); S.timers = [];
  if (SUPABASE_URL.startsWith('__')) { app.innerHTML = '<div class="auth"><div class="auth-card"><h1>Configuration manquante</h1><p class="mute">Le site n\'est pas encore relié à sa base de données.</p></div></div>'; return; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { const q = new URLSearchParams((location.hash.includes('error') ? location.hash.slice(1) : '') || location.search); const err = q.get('error_description');
    if (err) { history.replaceState(null, '', location.pathname); return authView('login', 'Connexion Discord impossible : ' + err.replace(/\+/g, ' ')); } return authView(); }
  S.user = session.user;
  // La connexion est gardée sur l'appareil (jeton renouvelé automatiquement) ; on demande au navigateur de ne pas effacer ce stockage.
  try { navigator.storage?.persist?.(); } catch (e) {}
  try { const a = localStorage.getItem('bf_after'); if (a) { localStorage.removeItem('bf_after'); history.replaceState(null, '', location.pathname + a); } } catch (e) {}
  const { data: p } = await sb.from('profiles').select('*').eq('id', S.user.id).single();
  if (!p) return authView('login', 'Profil introuvable.');
  // Ancien compte « mot de passe » dont les données sont passées sur le compte Discord : on renvoie vers la connexion Discord.
  if (/\(ancien [0-9a-f]{6}\)$/.test(p.discord || '')) { await sb.auth.signOut(); return authView('login', 'Ton compte a été transféré sur ta connexion Discord (LR, collection, alertes). Reconnecte-toi avec le bouton Discord.'); }
  S.profile = p;
  try { const av = S.user.user_metadata?.avatar_url; if (av && av !== p.avatar) sb.rpc('set_my_avatar', { url: av }).then(() => {}, () => {}); } catch (e) {}
  const viaDiscord = (S.user.identities || []).some(i => i.provider === 'discord') || S.user.app_metadata?.provider === 'discord';
  // Seule la connexion Discord donne accès au site.
  if (!viaDiscord) { await sb.auth.signOut(); return authView('login', 'La connexion se fait uniquement avec Discord.'); }
  if (p.status === 'refused' && p.revoked) return pendingView({ ...p, why: 'revoked' });
  if (p.status !== 'approved' && viaDiscord) {
    // Vérification automatique et immédiate : le compte Discord doit être sur le serveur de la Brigade.
    if (!session.provider_token) { await sb.auth.signOut(); return authView('login', 'Reconnecte-toi avec Discord pour vérifier ton accès.'); }
    app.innerHTML = '<div class="auth"><div class="auth-card"><div class="moon pulse"></div><h1>Vérification…</h1><p class="mute">On regarde si tu es sur le serveur Discord de la Brigade.</p></div></div>';
    const { data: v, error } = await sb.functions.invoke('verify-guild', { body: { provider_token: session.provider_token } });
    if (!error && v?.ok) { const r = await sb.from('profiles').select('*').eq('id', S.user.id).single(); if (r.data) S.profile = r.data; }
    else return pendingView({ ...p, status: 'refused', why: v?.reason === 'not_member' ? 'not_member' : 'verif' });
  }
  if (S.profile.status !== 'approved') return pendingView(S.profile);
  try { await loadKB(); } catch (e) { app.innerHTML = `<div class="auth"><div class="auth-card"><h1>Oups</h1><p>${esc(e.message)}</p></div></div>`; return; }
  window.onhashchange = render; render(); setInterval(alertLoop, 5 * 60000);
}
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') authView(); });
boot();
// Glisser du bord gauche de l'écran vers la droite : retour à l'accueil (sans ouvrir le menu).
(() => { let x0 = null, y0 = 0, t0 = 0;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = (e.touches.length === 1 && t.clientX < 28) ? t.clientX : null; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  document.addEventListener('touchend', e => { if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0); x0 = null;
    if (dx > 80 && dy < 60 && Date.now() - t0 < 700 && app.dataset.mode === 'full' && !document.querySelector('.modal') && !$('#side')?.classList.contains('open') && (location.hash || '#accueil') !== '#accueil') location.hash = '#accueil'; }, { passive: true });
})();

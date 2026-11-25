/*__obScript 25/11 (Nicolas : « garde uniquement un simulateur fiable ») — cerveau ranked unique.
 Toutes les décisions de match passent par rk-brain.js (moteur du site = fonctions de combat du jeu) dans un Worker.
 Les anciens moteurs du bot ne peuvent plus envoyer d'action en match (porte sur rankedSend) ; filet de sécurité : si le cerveau
 ne répond pas en 8 s pendant notre tour, la porte s'ouvre pour ce coup (jamais de tour perdu par absence).
 À la fin du match : la fiche de l'adversaire reçoit le modèle de son jeu (poids des styles) appris sur ses vrais coups. */
(function () {
  if (window.__ob && window.__ob.alive) return;
  const BASE = 'https://brigade-fantome-yuro.github.io/';
  const OB = window.__ob = { alive: true, on: !window.__obStartOff, armNext: !!window.__obStartOff, log: [], obs: [], seen: new Set(), pending: null, matchId: null, prior: null, saved: new Set(), lastErr: null, decisions: 0, fallback: 0 };
  if (window.__obStartOff) { try { OB.matchId = rankedUI.data.match && rankedUI.data.match.id; } catch (e) { } }
  const L = m => { OB.log.push(new Date().toISOString().slice(11, 19) + ' ' + m); if (OB.log.length > 200) OB.log.shift(); };
  let W = null, seq = 0; const wait = new Map();
  OB.build = async () => {
    const v = (await (await fetch(BASE + 'version.txt?' + Date.now())).text()).trim();
    const eng = await (await fetch(BASE + 'castle-engine.js?v=' + v)).text();
    const brain = await (await fetch(BASE + 'rk-brain.js?v=' + v)).text();
    if (W) W.terminate();
    W = new Worker(URL.createObjectURL(new Blob([eng + '\n;\n' + brain], { type: 'text/javascript' })));
    W.onmessage = ({ data }) => { const f = wait.get(data.id); if (f) { wait.delete(data.id); f(data); } };
    W.onerror = e => { OB.lastErr = 'worker: ' + (e.message || e); L(OB.lastErr); };
    OB.version = v; L('cerveau prêt v' + v);
  };
  const ask = (msg, ms) => new Promise(ok => { const id = ++seq; const tm = setTimeout(() => { wait.delete(id); ok({ err: 'timeout' }); }, ms); wait.set(id, d => { clearTimeout(tm); ok(d); }); W.postMessage({ ...msg, id }); });
  const cut = n => String(n).split('(')[0].trim();
  const teamKey = t => t.map(u => cut(u.name)).sort().join('|');
  const clone = x => JSON.parse(JSON.stringify(x));
  const mkS = (teams, me, toMove) => ({ b: { room: 1, players: clone(teams[me]), enemies: clone(teams[1 - me]), turn: 1, alt: 0, result: null, log: [] }, s: toMove === me ? 0 : 1, last: 1, winner: null });
  const actOf = a => a === 'attack' ? 'attack' : /purple/.test(a) ? 'purple' : a === 'rage' ? 'rage' : /ultimate|fullpower/.test(a) ? 'ultimate' : 'skill';
  const fiches = () => { try { return JSON.parse(localStorage.__rkFiches || '{}'); } catch (e) { return {}; } };
  // Porte : en match, seules les actions du cerveau partent (et celles du filet de sécurité).
  // La porte lit toujours window.__ob (le cerveau en cours), pour qu'un rechargement du cerveau ne laisse jamais une vieille porte fermée.
  if (!window.rankedSend.__obGate) {
    const prev = window.rankedSend;
    const g = async function (a) {
      const O = window.__ob;
      if (O && O.alive && O.on && a !== 'join' && a !== 'cancel' && a !== 'abandon' && !O.sending && !O.open) { O.blocked = (O.blocked || 0) + 1; return null; }
      return prev.apply(this, arguments);
    };
    g.__obGate = true; window.rankedSend = g;
  }
  async function tick() {
    try {
      if (!W) return;
      const d = typeof rankedUI !== 'undefined' && rankedUI.data, m = d && d.match;
      if (!m || !m.battle) return;
      const b = m.battle, me = m.side, opp = (m.names || [])[1 - me];
      if (m.id !== OB.matchId) { OB.matchId = m.id; OB.obs = []; OB.seen = new Set(); OB.open = false; const F = fiches(); const key = teamKey(b.teams[1 - me]); OB.prior = F[opp]?.scenarios?.[key]?.brain?.w || null; if (!OB.prior && b.teams[1 - me].some(u => /chrollo|all for one/i.test(u.name))) OB.prior = { ai: 1, asapLow: 1, thief: 4, healer: 1, strong: 1, smart: 2, random: .5 }; OB.oppKey = key; OB.opp = opp; OB.turnSince = 0; if (OB.armNext && m.status === 'active') { OB.on = true; OB.armNext = false; L('cerveau activé'); } L('match ' + m.id.slice(0, 8) + ' vs ' + opp + ' [' + key + ']' + (OB.prior ? ' (fiche)' : '')); }
      if (!OB.on) return;
      // Coups de l'adversaire observés (état juste avant + coup joué)
      const last = b.last, lk = m.id + ':' + m.revision;
      if (last && last.side === 1 - me && last.oldTeams && !OB.seen.has(lk)) { OB.seen.add(lk); OB.obs.push({ S: mkS(last.oldTeams, 1 - me, 1 - me), m: { i: last.active, a: actOf(last.action), t: last.target } }); if (OB.obs.length > 60) OB.obs.shift(); }
      if (m.status === 'finished') { await finish(m); return; }
      if (m.status !== 'active' || b.turn !== me) { OB.turnSince = 0; return; }
      // Le chrono du filet ne court que quand l'écran est prêt (pas pendant les animations).
      if (rankedUI.busy || rankedUI.animating) { OB.turnSince = Date.now(); return; }
      if (!OB.turnSince) OB.turnSince = Date.now();
      // Filet : 15 s de notre tour sans action → l'ancien bot peut jouer ce coup.
      if (Date.now() - OB.turnSince > 15000 && !OB.open) { OB.open = true; OB.fallback++; L('filet de sécurité : porte ouverte'); setTimeout(() => { OB.open = false; }, 4000); }
      if (OB.pending === lk) return;
      OB.pending = lk;
      const S = mkS(b.teams, me, me);
      const r = await ask({ kind: 'decide', S, obs: OB.obs, prior: OB.prior, ms: 2500 }, 8000);
      const m2 = rankedUI.data && rankedUI.data.match;
      if (!m2 || m2.id !== m.id || m2.revision !== m.revision || m2.battle.turn !== me) { OB.pending = null; return; }
      if (r.err || !r.r || !r.r.best) { OB.lastErr = r.err || 'aucun coup'; L('erreur cerveau : ' + OB.lastErr); OB.pending = null; return; }
      const mv = r.r.best; OB.lastW = r.r.w; OB.lastRes = r.r.res;
      const sendA = mv.a === 'purple' ? 'purple' : mv.a;
      rankedUI.active = mv.i; rankedUI.target = mv.t;
      OB.sending = true; try { await window.rankedSend(sendA); } finally { OB.sending = false; }
      OB.decisions++; OB.turnSince = 0;
      L(cut(b.teams[me][mv.i].name) + ' ' + mv.a + ' → ' + cut(b.teams[1 - me][mv.t]?.name || '?') + ' (' + Math.round(mv.p * 100) + ' %, ' + mv.n + ' simulations)');
    } catch (e) { OB.lastErr = String(e && e.message || e); L('erreur : ' + OB.lastErr); OB.pending = null; }
  }
  async function finish(m) {
    if (OB.saved.has(m.id)) return; OB.saved.add(m.id);
    try {
      const me = m.side, opp = (m.names || [])[1 - me], key = teamKey(m.battle.teams[1 - me]);
      const win = m.battle.winner === me;
      const r = OB.obs.length ? await ask({ kind: 'fit', obs: OB.obs, prior: OB.prior }, 8000) : null;
      const F = fiches(); F[opp] = F[opp] || { player: opp, notes: [] }; F[opp].scenarios = F[opp].scenarios || {};
      const sc = F[opp].scenarios[key] = F[opp].scenarios[key] || { team: key };
      sc.brain = { w: r && r.r ? r.r : (OB.prior || null), obs: OB.obs.length, last: win ? 'V' : 'D', t: Date.now(), id: m.id, n: ((sc.brain && sc.brain.n) || 0) + 1 };
      localStorage.__rkFiches = JSON.stringify(F);
      L('fiche ' + opp + ' [' + key + '] mise à jour (' + (win ? 'victoire' : 'défaite') + ', ' + OB.obs.length + ' coups adverses)');
    } catch (e) { L('fiche : erreur ' + (e && e.message)); }
  }
  OB.tick = tick; OB.finish = finish;
  OB.build().then(() => { clearInterval(window.__obInt); window.__obInt = setInterval(tick, 400); }).catch(e => { OB.lastErr = 'build: ' + e.message; L(OB.lastErr); OB.on = false; });
})();

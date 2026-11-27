// Ordinateur du simulateur PvP = LE STRATÈGE (même cerveau que le bot ranked, rk-brain.js) :
// à chaque coup, toutes les actions possibles sont essayées puis la suite du match est simulée des centaines de fois
// contre plusieurs styles d'adversaire, pondérés par ce que le joueur a vraiment joué depuis le début du match.
// Le cerveau joue le camp 0 : quand l'ordinateur est le camp 1, on retourne la partie (mêmes règles des deux côtés).
importScripts('castle-engine.js?v=276', 'rk-brain.js?v=276');
const EN = self.BFDuel.engine;
const flip = D => ({ b: EN.persp(D.b, 1), s: 1 - D.s, last: 1 - (D.last ?? 0), winner: D.winner == null ? null : D.winner === 'draw' ? 'draw' : 1 - D.winner });
onmessage = ({ data }) => {
  try {
    const side = data.side || 0, F = side ? flip(data.from) : data.from;
    const obs = (data.obs || []).map(o => ({ S: side ? flip(o.S) : o.S, m: o.m }));
    const w = fitStyles(obs, null);
    const r = decide(F, w, data.ms || 2500);
    postMessage({ id: data.id, m: r.best ? { i: r.best.i, a: r.best.a, t: r.best.t } : null, p: r.best ? r.best.p : null, iters: r.iters });
  } catch (e) { postMessage({ id: data.id, m: null, err: String(e && e.message || e) }); }
};

// Lecture des captures de la collection YURO : repère chaque carte sur la capture, la reconnaît par son
// illustration (comparée aux empreintes des cartes du jeu), lit les étoiles allumées et le nombre d'exemplaires (×N).
// Géométrie relevée sur la carte du jeu (cadre 131×183) : illustration 3 %→96 % en largeur, 2 %→97 % en hauteur,
// étoiles à 92 % de la hauteur (centres 51,5 / 56,5 / 62,5 / 67,5 / 73,5 % de la largeur), ×N à droite sur la même ligne.

const STAR_X = [.515, .565, .625, .675, .735], STAR_Y = .92;

function loadImg(file) { return new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; }); }

// Repère les cartes : zones claires séparées par le fond sombre, au format d'une carte (≈ 0,72).
function findCards(ctx, W, H) {
  const step = Math.max(2, Math.round(W / 500)); const gw = Math.ceil(W / step), gh = Math.ceil(H / step);
  const d = ctx.getImageData(0, 0, W, H).data; const m = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = ((Math.min(H - 1, y * step)) * W + Math.min(W - 1, x * step)) * 4; m[y * gw + x] = Math.max(d[i], d[i + 1], d[i + 2]) > 100 ? 1 : 0; }
  const seen = new Uint8Array(gw * gh); let boxes = [];
  for (let s = 0; s < gw * gh; s++) { if (!m[s] || seen[s]) continue; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const st = [s]; seen[s] = 1;
    while (st.length) { const p = st.pop(), x = p % gw, y = (p / gw) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && m[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; st.push(p - 1); } if (x < gw - 1 && m[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; st.push(p + 1); }
      if (y > 0 && m[p - gw] && !seen[p - gw]) { seen[p - gw] = 1; st.push(p - gw); } if (y < gh - 1 && m[p + gw] && !seen[p + gw]) { seen[p + gw] = 1; st.push(p + gw); } }
    const bw = (x1 - x0 + 1) * step, bh = (y1 - y0 + 1) * step; if (bh < H * .08 || bw < 40) continue;
    // plusieurs cartes collées : on découpe selon le format d'une carte (0,72)
    const ar = bw / bh, k = Math.round(ar / .72); if (k < 1 || Math.abs(ar / k - .72) > .1) continue;
    for (let j = 0; j < k; j++) boxes.push({ x: x0 * step + j * bw / k, y: y0 * step, w: bw / k, h: bh }); }
  const hs = boxes.map(b => b.h).sort((a, b) => a - b), med = hs[hs.length >> 1] || 0;
  // une carte collée en bas de l'écran garde sa taille : seule la hauteur décide (une carte coupée est plus petite)
  boxes = boxes.filter(b => b.h > med * .85 && b.h < med * 1.15);
  // grille : on complète une case manquante (carte collée à un bouton flottant, etc.) si elle est bien occupée par une carte
  if (boxes.length >= 4) {
    const mw = boxes.map(b => b.w).sort((a, b) => a - b)[boxes.length >> 1];
    const clus = (v, t) => { v = [...v].sort((a, b) => a - b); const out = []; for (const x of v) { const c = out[out.length - 1]; if (c && Math.abs(x - c[c.length - 1]) < t) c.push(x); else out.push([x]); } return out.map(c => c.reduce((a, b) => a + b, 0) / c.length); };
    const cols = clus(boxes.map(b => b.x), mw * .4), rows = clus(boxes.map(b => b.y), med * .4);
    for (const ry of rows) for (const cx of cols) {
      if (boxes.some(b => Math.abs(b.x - cx) < mw * .4 && Math.abs(b.y - ry) < med * .4)) continue;
      if (ry < -2 || ry + med * .9 > H + 2) continue;
      const x0 = Math.max(0, Math.round(cx)), y0 = Math.max(0, Math.round(ry)), w = Math.min(W - x0, Math.round(mw)), h = Math.min(H - y0, Math.round(med)); if (w < 10 || h < 10) continue;
      const dd = ctx.getImageData(x0, y0, w, h).data; let br = 0, n = 0; for (let i = 0; i < dd.length; i += 16) { n++; if (Math.max(dd[i], dd[i + 1], dd[i + 2]) > 100) br++; }
      if (br / n > .5) boxes.push({ x: cx, y: ry, w: mw, h: med });
    }
  }
  return boxes.sort((a, b) => (Math.abs(a.y - b.y) < a.h * .3 ? a.x - b.x : a.y - b.y));
}

function featOf(src, b) {
  const fx = b.x + b.w * .03, fy = b.y + b.h * .02, fw = b.w * .93, fh = b.h * .95;
  const c = document.createElement('canvas'); c.width = 8; c.height = 10; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(src, fx + fw * .08, fy + fh * .14, fw * .80, fh * .52, 0, 0, 8, 10);
  const d = g.getImageData(0, 0, 8, 10).data; const out = new Uint8Array(240); let k = 0;
  for (let i = 0; i < d.length; i += 4) { out[k++] = d[i] >> 4; out[k++] = d[i + 1] >> 4; out[k++] = d[i + 2] >> 4; }
  return out;
}

// Étoiles allumées : on compte les petites taches dorées sur la ligne des étoiles (le badge « +8 % » est plus large, ignoré).
function starsOf(ctx, b) {
  const x0 = Math.round(b.x + b.w * .46), x1 = Math.round(b.x + b.w * .79), y0 = Math.round(b.y + b.h * .88), y1 = Math.round(b.y + b.h * .935);
  const w = x1 - x0, h = y1 - y0; if (w < 5 || h < 2) return 0; const d = ctx.getImageData(x0, y0, w, h).data; const col = new Uint8Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, r = d[i], g = d[i + 1], bl = d[i + 2]; if (r > 140 && g > 120 && bl < 160 && r - bl > 40) col[x] = 1; }
  let n = 0, run = 0; const mn = Math.max(1, b.w * .012), mx = b.w * .075;
  for (let x = 0; x <= w; x++) { if (x < w && col[x]) run++; else { if (run >= mn && run <= mx) n++; run = 0; } }
  return Math.min(5, n);
}

// ×N (exemplaires) : on ne garde que les chiffres à droite du « × », agrandis et contrastés pour l'OCR.
function qtyCrop(src, b) {
  const x0 = b.x + b.w * .835, y0 = b.y + b.h * .87, w = b.w * .125, h = b.h * .09, k = Math.max(4, Math.round(60 / h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k) + 40; c.height = Math.round(h * k) + 40;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high'; g.drawImage(src, x0, y0, w, h, 20, 20, c.width - 40, c.height - 40);
  const id = g.getImageData(0, 0, c.width, c.height); const d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; const o = v > 100 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = o; }
  g.putImageData(id, 0, 0); return c;
}

const hexToArr = h => { const a = new Uint8Array(h.length); for (let i = 0; i < h.length; i++) a[i] = parseInt(h[i], 16); return a; };
let REF = null, SER = null;
// Numéro de collection du jeu (#001…) : les cartes sont rangées dans cet ordre sur l'écran Collection.
export function setSerials(order) { SER = new Map(); (order || []).forEach((id, i) => SER.set(Number(id), i + 1)); }
function zn(a) { const n = a.length; let m = 0; for (const v of a) m += v; m /= n; let s = 0; for (const v of a) s += (v - m) * (v - m); s = Math.sqrt(s / n) || 1; return Array.from(a, v => (v - m) / s); }
const norm = t => String(t || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export function setFeats(rows) { REF = rows.map(r => ({ id: r[0], r: r[1], n: r[2], s: r[3], img: r[4], z: zn(hexToArr(r[5])), nn: norm(r[2]), ws: String(r[2] || '').split(/\s+/).map(norm).filter(w => w.length >= 3) })); }
// Nom imprimé sur la carte (bas de l'illustration) : lu par OCR, c'est le repère le plus sûr ; l'illustration départage les homonymes.
function nameCrop(src, b) {
  const sw = b.w * .9, sh = b.h * .175, c = document.createElement('canvas'); c.width = Math.round(sw * 4); c.height = Math.round(sh * 4);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, b.x + b.w * .05, b.y + b.h * .70, sw, sh, 0, 0, c.width, c.height);
  const id = g.getImageData(0, 0, c.width, c.height); const d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; const o = v > 150 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = o; }
  g.putImageData(id, 0, 0); return c;
}
function lev(a, b) { let p = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c.push(Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] !== b[j - 1]))); p = c; } return p[b.length]; }
function nameSim(q, c) { if (q.length < 2) return 0; let r = 1 - lev(q, c.nn) / Math.max(q.length, c.nn.length); if (q.length >= 3) for (const w of c.ws) r = Math.max(r, .95 * (1 - lev(q, w) / Math.max(q.length, w.length))); return r; }
function distAll(f, rar) { const z = zn(f); const out = []; for (const c of REF) { if (rar && !rar.includes(c.r)) continue; let d = 0; for (let i = 0; i < 240; i++) { const t = z[i] - c.z[i]; d += t * t; } out.push({ c, d }); } return out; }
function pickCard(all, q) {
  if (q && q.length >= 2) {
    const sc = all.map(x => ({ ...x, s: nameSim(q, x.c) })).sort((a, b) => b.s - a.s); const top = sc[0];
    if (top) { const sec = (sc.find(x => x.c.nn !== top.c.nn) || { s: 0 }).s;
      if (top.s >= .7 && top.s - sec >= .1) { const same = sc.filter(x => x.c.nn === top.c.nn).sort((a, b) => a.d - b.d); return { ...same[0], via: 'nom' }; } }
    const srt = [...all].sort((a, b) => a.d - b.d); const b1 = srt[0], b2 = srt[1];
    if (b1 && b1.d <= 240 && (!b2 || b1.d <= .85 * b2.d)) return { ...b1, via: 'image' };
    const cand = sc.slice(0, 8).filter(x => x.s >= .4).sort((a, b) => a.d - b.d)[0];
    if (cand && cand.d < 260) return { ...cand, via: 'nom+image' };
    return null;
  }
  const srt = [...all].sort((a, b) => a.d - b.d); const b1 = srt[0], b2 = srt[1];
  return b1 && b1.d <= 240 && (!b2 || b1.d <= .85 * b2.d) ? { ...b1, via: 'image' } : null;
}
function match(f, rar) { const z = zn(f); let best = null, second = null; for (const c of REF) { if (rar && !rar.includes(c.r)) continue; let d = 0; for (let i = 0; i < 240; i++) { const t = z[i] - c.z[i]; d += t * t; } if (!best || d < best.d) { second = best; best = { c, d }; } else if (!second || d < second.d) second = { c, d }; } return { best, second }; }

// Analyse plusieurs captures. rar : lettres de rareté autorisées ('S' = LR, 'M' = UR, 'L' = SSR).
export async function analyze(files, rar, ocrWorker, onp, nameWorker) {
  if (!REF) throw Error('empreintes des cartes non chargées');
  const found = new Map(); let nCards = 0, unknown = 0; const dbg = [];
  // cartes candidates rangées par numéro de collection (si connu)
  const cands = REF.filter(c => !rar || rar.includes(c.r)); const useSer = SER && SER.size && cands.filter(c => SER.has(Number(c.id))).length >= cands.length * .95;
  const ordC = useSer ? cands.filter(c => SER.has(Number(c.id))).sort((a, b) => SER.get(Number(a.id)) - SER.get(Number(b.id))) : cands;
  for (let fi = 0; fi < files.length; fi++) {
    const im = await loadImg(files[fi]); const sc = Math.min(1, 1800 / im.naturalWidth);
    const W = Math.round(im.naturalWidth * sc), H = Math.round(im.naturalHeight * sc);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(im, 0, 0, W, H);
    const boxes = findCards(ctx, W, H); const info = [];
    for (let bi = 0; bi < boxes.length; bi++) {
      onp?.(fi, files.length, bi, boxes.length); const b = boxes[bi]; nCards++;
      let q = ''; if (nameWorker) { try { const r = await nameWorker.recognize(nameCrop(cv, b)); q = norm(r.data.text); } catch (e) { /* on garde l'illustration */ } }
      const z = zn(featOf(cv, b)); const d = ordC.map(c => { let s = 0; for (let i = 0; i < 240; i++) { const t = z[i] - c.z[i]; s += t * t; } return s; });
      info.push({ b, q, d });
    }
    // Alignement : sur une capture, les cartes se suivent dans l'ordre des numéros. On choisit la suite croissante qui colle le mieux
    // aux noms lus et aux illustrations : une carte douteuse est tranchée par ses voisines.
    let pick = null;
    if (useSer && info.length) {
      const m = ordC.length, n = info.length, sc2 = info.map(it => ordC.map((c, j) => 3 * (it.q.length >= 2 ? nameSim(it.q, c) : 0) - it.d[j] / 100));
      let prev = Float64Array.from(sc2[0]); const back = [];
      for (let i = 1; i < n; i++) { const cur = new Float64Array(m).fill(-1e9), bk = new Int32Array(m); let bm = -1e9, bj = -1;
        for (let j = 1; j < m; j++) { if (prev[j - 1] > bm) { bm = prev[j - 1]; bj = j - 1; } cur[j] = sc2[i][j] + bm; bk[j] = bj; }
        back.push(bk); prev = cur; }
      let j = 0; for (let k = 1; k < m; k++) if (prev[k] > prev[j]) j = k; const path = [j]; for (let i = n - 2; i >= 0; i--) { j = back[i][j]; path.push(j); } path.reverse();
      // contrôle : la suite doit s'accorder avec les noms bien lus (sinon le tri du jeu n'est pas « par numéro » : on revient au cas par cas)
      let agree = 0, sure = 0; info.forEach((it, i) => { if (it.q.length >= 4) { const bst = ordC.reduce((a, c, k) => { const v = nameSim(it.q, c); return v > a.v ? { v, k } : a; }, { v: 0, k: -1 }); if (bst.v >= .8) { sure++; if (ordC[bst.k].nn === ordC[path[i]].nn) agree++; } } });
      if (!sure || agree / sure >= .8) pick = path.map((k, i) => ({ c: ordC[k], d: info[i].d[k], via: 'ordre' }));
    }
    for (let bi = 0; bi < info.length; bi++) {
      const it = info[bi], b = it.b;
      const best = pick ? pick[bi] : pickCard(ordC.map((c, j) => ({ c, d: it.d[j] })), it.q); dbg.push([Math.round(b.x), Math.round(b.y), it.q, best?.c.n, best?.d, best?.via]);
      if (!best) { unknown++; continue; }
      let qty = 1;
      if (ocrWorker) { try { const r = await ocrWorker.recognize(qtyCrop(cv, b)); const mm = String(r.data.text).match(/(\d{1,3})/); if (mm) qty = Math.max(1, +mm[1]); } catch (e) { /* on garde 1 */ } }
      const prev = found.get(best.c.id);
      const itm = { id: best.c.id, name: best.c.n, series: best.c.s, r: best.c.r, img: best.c.img, stars: starsOf(ctx, b), qty, conf: Math.max(0, Math.min(1, 1 - best.d / 260)) };
      const reads = [...(prev?.reads || []), itm.qty];
      // plusieurs captures de la même carte : on garde la lecture la plus fréquente (à égalité, la plus petite)
      const cnt = {}; reads.forEach(v => cnt[v] = (cnt[v] || 0) + 1); const qBest = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a - b)[0];
      found.set(best.c.id, { ...(prev && prev.conf > itm.conf ? prev : itm), qty: qBest, reads });
    }
  }
  return { cards: [...found.values()], nCards, unknown, dbg };
}

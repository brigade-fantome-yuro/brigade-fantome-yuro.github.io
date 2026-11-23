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
  boxes = boxes.filter(b => b.h > med * .85 && b.h < med * 1.15 && b.y > 1 && b.y + b.h < H - 1);
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

function qtyCrop(src, b) {
  const c = document.createElement('canvas'); const w = b.w * .17, h = b.h * .085; c.width = Math.round(w * 5); c.height = Math.round(h * 5);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, b.x + b.w * .78, b.y + b.h * .865, w, h, 0, 0, c.width, c.height);
  // texte blanc sur fond sombre → on inverse pour l'OCR
  const id = g.getImageData(0, 0, c.width, c.height); const d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; const o = v > 150 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = o; }
  g.putImageData(id, 0, 0); return c;
}

const hexToArr = h => { const a = new Uint8Array(h.length); for (let i = 0; i < h.length; i++) a[i] = parseInt(h[i], 16); return a; };
let REF = null;
function zn(a) { const n = a.length; let m = 0; for (const v of a) m += v; m /= n; let s = 0; for (const v of a) s += (v - m) * (v - m); s = Math.sqrt(s / n) || 1; return Array.from(a, v => (v - m) / s); }
export function setFeats(rows) { REF = rows.map(r => ({ id: r[0], r: r[1], n: r[2], s: r[3], img: r[4], z: zn(hexToArr(r[5])) })); }
function match(f, rar) { const z = zn(f); let best = null, second = null; for (const c of REF) { if (rar && !rar.includes(c.r)) continue; let d = 0; for (let i = 0; i < 240; i++) { const t = z[i] - c.z[i]; d += t * t; } if (!best || d < best.d) { second = best; best = { c, d }; } else if (!second || d < second.d) second = { c, d }; } return { best, second }; }

// Analyse plusieurs captures. rar : lettres de rareté autorisées ('S' = LR, 'M' = UR, 'L' = SSR).
export async function analyze(files, rar, ocrWorker, onp) {
  if (!REF) throw Error('empreintes des cartes non chargées');
  const found = new Map(); let nCards = 0, unknown = 0; const dbg = [];
  for (let fi = 0; fi < files.length; fi++) {
    const im = await loadImg(files[fi]); const sc = Math.min(1, 1800 / im.naturalWidth);
    const W = Math.round(im.naturalWidth * sc), H = Math.round(im.naturalHeight * sc);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(im, 0, 0, W, H);
    const boxes = findCards(ctx, W, H);
    for (let bi = 0; bi < boxes.length; bi++) {
      onp?.(fi, files.length, bi, boxes.length); const b = boxes[bi]; nCards++;
      const { best, second } = match(featOf(cv, b), rar); dbg.push([Math.round(b.x), Math.round(b.y), best?.c.n, best?.d, second?.c.n, second?.d]);
      if (!best || best.d > 240 || (second && best.d > 0.85 * second.d)) { unknown++; continue; }
      let qty = 1;
      if (ocrWorker) { try { const r = await ocrWorker.recognize(qtyCrop(cv, b)); const m = String(r.data.text).match(/(\d{1,2})/); if (m) qty = Math.max(1, +m[1]); } catch (e) { /* on garde 1 */ } }
      const prev = found.get(best.c.id);
      const it = { id: best.c.id, name: best.c.n, series: best.c.s, r: best.c.r, img: best.c.img, stars: starsOf(ctx, b), qty, conf: Math.max(0, Math.min(1, 1 - best.d / 260)) };
      if (!prev || it.conf > prev.conf) found.set(best.c.id, it);
    }
  }
  return { cards: [...found.values()], nCards, unknown, dbg };
}

/* Vectorisation haute définition du logo LBV (source 1080 px) pour la charte graphique.
   node tools/trace-brand.mjs  →  brand/lbv-geometry.json + brand/*.svg
   Chrome headless décode l'image dans un canvas (image en data URI : pas de canvas « tainted »),
   suréchantillonne ×2, extrait l'isocontour (marching squares), simplifie (Ramer–Douglas–Peucker),
   sépare le symbole « lbv » du mot PRODUCTION et écrit les fichiers. */
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SRC = 'images/hero-slide-1-image-1773436640771.png';
const b64 = (await readFile(SRC)).toString('base64');

const pageScript = `
window.run = () => new Promise((res) => {
  const img = new Image();
  img.onload = () => {
    const S = 2, cx = 150, cy = 280, cw = 790, ch = 520;           // zone utile de l'image source
    const w = cw * S, h = ch * S;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.drawImage(img, cx, cy, cw, ch, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const W2 = w + 2, f = new Float32Array(W2 * (h + 2));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = (j * w + i) * 4; f[(j + 1) * W2 + i + 1] = (d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11) / 255; }
    const iso = .5, segs = [];
    const lerp = (a, b, va, vb) => a + (iso - va) / ((vb - va) || 1e-6) * (b - a);
    for (let j = 0; j < h + 1; j++) for (let i = 0; i < w + 1; i++) {
      const v0 = f[j * W2 + i], v1 = f[j * W2 + i + 1], v2 = f[(j + 1) * W2 + i + 1], v3 = f[(j + 1) * W2 + i];
      const k = (v0 > iso ? 8 : 0) | (v1 > iso ? 4 : 0) | (v2 > iso ? 2 : 0) | (v3 > iso ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const T = [lerp(i, i + 1, v0, v1), j], R = [i + 1, lerp(j, j + 1, v1, v2)], B = [lerp(i, i + 1, v3, v2), j + 1], L = [i, lerp(j, j + 1, v0, v3)];
      const a = (p, q) => segs.push([p, q]);
      switch (k) { case 1: a(L, B); break; case 2: a(B, R); break; case 3: a(L, R); break; case 4: a(R, T); break; case 5: a(L, T); a(R, B); break; case 6: a(B, T); break; case 7: a(L, T); break; case 8: a(T, L); break; case 9: a(T, B); break; case 10: a(T, R); a(B, L); break; case 11: a(T, R); break; case 12: a(R, L); break; case 13: a(R, B); break; case 14: a(B, L); break; }
    }
    const key = (p) => Math.round(p[0] * 64) + ',' + Math.round(p[1] * 64);
    const byStart = new Map(); segs.forEach((s, n) => { const kk = key(s[0]); (byStart.get(kk) || byStart.set(kk, []).get(kk)).push(n); });
    const used = new Uint8Array(segs.length), loops = [];
    for (let n = 0; n < segs.length; n++) {
      if (used[n]) continue; const loop = [segs[n][0]]; let cur = n; used[n] = 1;
      for (let g = 0; g < segs.length; g++) { const end = segs[cur][1]; loop.push(end); const cand = (byStart.get(key(end)) || []).filter((m) => !used[m]); if (!cand.length) break; cur = cand[0]; used[cur] = 1; }
      if (loop.length > 12) loops.push(loop);
    }
    const rdp = (pts, eps) => { if (pts.length < 4) return pts; let dm = 0, ix = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; const len = Math.hypot(bx - ax, by - ay) || 1e-6;
      for (let i = 1; i < pts.length - 1; i++) { const dd = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len; if (dd > dm) { dm = dd; ix = i; } }
      if (dm > eps) { const l = rdp(pts.slice(0, ix + 1), eps), r = rdp(pts.slice(ix), eps); return l.slice(0, -1).concat(r); } return [pts[0], pts[pts.length - 1]]; };
    const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
    const rdpClosed = (l, eps) => { const m = l.length >> 1; return rdp(l.slice(0, m + 1), eps).slice(0, -1).concat(rdp(l.slice(m), eps).slice(0, -1)); };
    const polys = loops.map((l) => rdpClosed(l, .55)).filter((l) => Math.abs(area(l)) > 60)
      .map((l) => l.map(([px, py]) => [Math.round((px / S + cx) * 100) / 100, Math.round((py / S + cy) * 100) / 100]));
    res({ polys, areas: polys.map(area) });
  };
  img.src = 'data:image/png;base64,${b64}';
});`;
await mkdir('tools/tmp', { recursive: true });
await writeFile('tools/tmp/trace-brand.html', `<script>${pageScript}</script>`);

const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/tools/tmp/trace-brand.html' });
await sleep(1500);
const r = await send('Runtime.evaluate', { expression: 'window.run()', awaitPromise: true, returnByValue: true });
ws.close(); chrome.kill();
const v = r.result?.result?.value;
if (!v) { console.error(JSON.stringify(r.result).slice(0, 600)); process.exit(1); }

/* Classement : symbole (au-dessus de y 690) et mot PRODUCTION (en dessous) ; trous = aire de signe opposé */
const bbox = (ps) => { const b = [1e9, 1e9, -1e9, -1e9]; for (const p of ps) for (const [x, y] of p) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } return b; };
const toD = (ps) => ps.map((p) => 'M' + p.map(([x, y]) => `${x} ${y}`).join('L') + 'Z').join('');
const mark = [], word = [];
v.polys.forEach((p) => { const b = bbox([p]); (b[1] > 690 ? word : mark).push(p); });
const mb = bbox(mark), wb = bbox(word), all = bbox([...mark, ...word]);
const r1 = (n) => Math.round(n * 10) / 10;
const geo = {
  source: SRC,
  mark: { d: toD(mark), box: mb.map(r1), contours: mark.length, parts: mark.map((p) => bbox([p]).map(r1)) },
  word: { d: toD(word), box: wb.map(r1), contours: word.length },
  lockup: { box: all.map(r1) },
};
await mkdir('brand', { recursive: true });
await writeFile('brand/lbv-geometry.json', JSON.stringify(geo));

/* Fichiers SVG livrés */
const pad = (b, p) => [b[0] - p, b[1] - p, b[2] - b[0] + 2 * p, b[3] - b[1] + 2 * p].map(r1).join(' ');
const svg = (box, d, fill, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${bg ? `<rect x="${box.split(' ')[0]}" y="${box.split(' ')[1]}" width="${box.split(' ')[2]}" height="${box.split(' ')[3]}" fill="${bg}"/>` : ''}<path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>\n`;
const X = wb[3] - wb[1];                                   // unité X = hauteur du mot PRODUCTION
const files = {
  'lbv-logo-os.svg': [pad(all, 0), geo.mark.d + geo.word.d, '#E7E3DA'],
  'lbv-logo-noir.svg': [pad(all, 0), geo.mark.d + geo.word.d, '#0A0A0A'],
  'lbv-logo-oxblood.svg': [pad(all, 0), geo.mark.d + geo.word.d, '#7A0A0A'],
  'lbv-logo-braise.svg': [pad(all, 0), geo.mark.d + geo.word.d, '#D8261E'],
  'lbv-symbole-os.svg': [pad(mb, 0), geo.mark.d, '#E7E3DA'],
  'lbv-symbole-noir.svg': [pad(mb, 0), geo.mark.d, '#0A0A0A'],
  'lbv-symbole-braise.svg': [pad(mb, 0), geo.mark.d, '#D8261E'],
};
for (const [name, [box, d, fill]] of Object.entries(files)) await writeFile('brand/' + name, svg(box, d, fill));
await writeFile('brand/lbv-avatar-noir.svg', svg(pad(mb, (mb[2] - mb[0]) * 0.32).replace(/^([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)$/, (m, a, b, c) => { const s = +c; const cyy = (mb[1] + mb[3]) / 2; return `${a} ${r1(cyy - s / 2)} ${s} ${s}`; }), geo.mark.d, '#E7E3DA', '#0A0A0A'));
console.log('symbole', mark.length, 'contours', geo.mark.box, '· mot', word.length, 'contours', geo.word.box, '· X =', r1(X), 'px');

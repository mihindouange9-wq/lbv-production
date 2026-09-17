/* Contours du symbole (brand/lbv-geometry.json) → js/logo-shape.js pour le logo en volume (js/logo3d.js).
   Même repère que l'ancien tracé (w/h choisis pour garder taille et position à l'écran). node tools/brand-to-3d.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
const G = JSON.parse(readFileSync('brand/lbv-geometry.json', 'utf8'));
const polys = G.mark.d.split('Z').filter(Boolean).map((s) => s.replace(/^M/, '').split('L').map((p) => p.trim().split(/\s+/).map(Number)));
const rdp = (pts, eps) => { if (pts.length < 4) return pts; let dm = 0, ix = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; const len = Math.hypot(bx - ax, by - ay) || 1e-6;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len; if (d > dm) { dm = d; ix = i; } }
  if (dm > eps) { const l = rdp(pts.slice(0, ix + 1), eps), r = rdp(pts.slice(ix), eps); return l.slice(0, -1).concat(r); } return [pts[0], pts[pts.length - 1]]; };
const closed = (l, eps) => { const m = l.length >> 1; return rdp(l.slice(0, m + 1), eps).slice(0, -1).concat(rdp(l.slice(m), eps).slice(0, -1)); };
const W = 1081, H = 692, dy = 1.4;
const outers = polys.map((p) => closed(p, 0.6).map(([x, y]) => [Math.round(x * 10) / 10, Math.round((y + dy) * 10) / 10]));
writeFileSync('js/logo-shape.js', '/* Contours du symbole LBV (tools/trace-brand.mjs → tools/brand-to-3d.mjs), source 1080 px */\nwindow.LBV_LOGO_SHAPE = ' + JSON.stringify({ w: W, h: H, outers, holes: [] }) + ';\n');
console.log('contours', outers.length, 'points', outers.map((o) => o.length).join(' / '));

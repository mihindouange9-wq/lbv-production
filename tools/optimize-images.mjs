/* Allège les visuels du site : déplace dans source/ ceux qui ne sont pas utilisés par la page,
   et ré-encode les autres (largeur maximale, JPEG de qualité 82) via un canvas de Chrome headless.
   node tools/optimize-images.mjs [largeurMax=1400] */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, renameSync } from 'node:fs';

const MAXW = +(process.argv[2] || 1400);
const sources = ['index.html', 'js/data.js', 'js/main.js', 'css/style.css'].map((f) => readFileSync(f, 'utf8')).join('\n');
const used = new Set([...sources.matchAll(/images\/([\w.\-]+\.(?:jpg|jpeg|png|svg|webp))/g)].map((m) => m[1]));
const all = readdirSync('images');
const ko = (n) => (n / 1024).toFixed(0).padStart(6) + ' Ko';

/* 1. Les visuels non utilisés par la page sortent du dossier livré (ils restent disponibles dans source/) */
mkdirSync('source', { recursive: true });
let moved = 0, movedBytes = 0;
for (const f of all) {
  if (used.has(f)) continue;
  movedBytes += statSync('images/' + f).size; moved++;
  renameSync('images/' + f, 'source/' + f);
}
console.log('déplacés dans source/ :', moved, 'fichiers,', (movedBytes / 1048576).toFixed(1), 'Mo');

/* 2. Ré-encodage des visuels conservés */
const list = readdirSync('images').filter((f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('lbv-icon') && !f.startsWith('lbv-symbole'));
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
let before = 0, after = 0;
for (const f of list) {
  const src = 'images/' + f, size = statSync(src).size;
  const mime = /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
  const data = readFileSync(src).toString('base64');
  const expr = `new Promise((res) => { const i = new Image(); i.onload = () => { const k = Math.min(1, ${MAXW} / i.naturalWidth); const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); res([c.toDataURL('image/jpeg', 0.82).split(',')[1], c.width, c.height]); }; i.onerror = () => res(null); i.src = 'data:${mime};base64,${data}'; })`;
  const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  if (!r) { console.log('illisible', f); continue; }
  const buf = Buffer.from(r[0], 'base64');
  before += size;
  if (buf.length < size * 0.95) { writeFileSync(src.replace(/\.png$/i, '.jpg'), buf); if (/\.png$/i.test(f)) console.log('PNG converti en JPEG :', f); after += buf.length; console.log(ko(size), '→', ko(buf.length), f, `(${r[1]}×${r[2]})`); }
  else after += size;
}
console.log('images du site :', (before / 1048576).toFixed(1), 'Mo →', (after / 1048576).toFixed(1), 'Mo');
ws.close(); chrome.kill();

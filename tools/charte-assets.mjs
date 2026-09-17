/* Prépare les visuels de la charte (charte/img/) : redimensionnés et convertis en JPEG par un canvas de Chrome headless.
   node tools/charte-assets.mjs */
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const L = [
  // [source, sortie, largeur max]
  ['images/789880b2-6ba6-4d84-8aa4-34253cb707ec.jpg', 'scene-lbv-show.jpg', 1600],
  ['images/chinois-v.jpg', 'nuit-rouge.jpg', 1200],
  ['images/1781437891816-a1yc3o3ucyk.jpg', 'neon-goat.jpg', 1000],
  ['images/img-0298.jpg', 'neon-porsche.jpg', 1000],
  ['images/hero-slide-3-bg-1787658862958.jpg', 'nuit-bleue.jpg', 1000],
  ['images/1777091931479.jpg', 'cover-wobebie.jpg', 900],
  ['images/img-666.jpg', 'cover-hotel.jpg', 900],
  ['images/talents-gabonais-live.jpg', 'live.jpg', 1200],
  ['images/1781445631906-5ihdir8prgr.jpg', 'plage.jpg', 1000],
  ['images/1781444415268.jpg', 'cover-allo.jpg', 900],
  ['images/1777093778745.jpg', 'cover-10dih.jpg', 900],
  ['images/1781439013684-h4m1bt4q40b.jpg', 'cover-money-dance.jpg', 900],
  ['images/1777103268304.jpg', 'cover-heroes.jpg', 900],
  ['images/le-t-hey.jpg', 'cover-hey-le-t.jpg', 900],
  ['images/img-0766.jpg', 'carty.jpg', 1000],
  ['images/whatsapp-image-2026-02-08-at-11-31-02.jpg', 'dom.jpg', 1000],
  ['images/img-0769.jpg', 'le-t.jpg', 1000],
  ['images/img-9991.jpg', 'dac-m.jpg', 1000],
  ['images/img-0772.jpg', 'xquality.jpg', 1000],
  ['images/img-999.jpg', 'lunxy.jpg', 1000],
  ['tools/shots/feu-seul.png', 'feu.jpg', 1600],
  ['tools/shots/hero-desktop.png', 'site-hero.jpg', 1440],
];

const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await mkdir('charte/img', { recursive: true });
let total = 0;
for (const [src, out, maxW] of L) {
  const mime = src.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const data = (await readFile(src)).toString('base64');
  const expr = `new Promise((res) => { const i = new Image(); i.onload = () => { const k = Math.min(1, ${maxW} / i.naturalWidth); const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.84).split(',')[1]); }; i.src = 'data:${mime};base64,${data}'; })`;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  const b = Buffer.from(r.result.result.value, 'base64');
  await writeFile('charte/img/' + out, b); total += b.length;
}
console.log(L.length, 'visuels,', Math.round(total / 1024), 'Ko');
ws.close(); chrome.kill();

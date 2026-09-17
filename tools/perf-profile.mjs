/* Profil processeur du premier défilement : quelles fonctions coûtent le plus.
   node tools/perf-profile.mjs [largeur] [hauteur] */
import { spawn } from 'node:child_process';
const [W = '1440', H = '900'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Profiler.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html' });
await sleep(13000);
await ev('document.body.click(); true'); await sleep(2500);
await ev('window.scrollTo(0, 0); true'); await sleep(800);

await send('Profiler.setSamplingInterval', { interval: 200 });
await send('Profiler.start');
await ev(`new Promise((done) => { const wheel = setInterval(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 140, bubbles: true, cancelable: true })), 50); setTimeout(() => { clearInterval(wheel); done(1); }, 12000); })`);
const { result } = await send('Profiler.stop');
const prof = result.profile;
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = prof.timeDeltas.reduce((a, b) => a + Math.max(0, b), 0);
prof.samples.forEach((sid, i) => { const dt = Math.max(0, prof.timeDeltas[i] || 0); self.set(sid, (self.get(sid) || 0) + dt); });
const rows = [...self.entries()].map(([sid, us]) => { const n = byId.get(sid); const f = n?.callFrame || {}; const file = (f.url || '').split('/').pop() || '—'; return { name: f.functionName || '(anonyme)', file, line: f.lineNumber, ms: us / 1000 }; })
  .sort((a, b) => b.ms - a.ms).slice(0, 18);
console.log('durée du profil', (total / 1000).toFixed(0), 'ms · temps JS mesuré');
for (const r of rows) console.log(String(r.ms.toFixed(0)).padStart(6), 'ms ', ((r.ms / (total / 1000)) * 100).toFixed(1).padStart(5) + ' %', ' ', r.name.padEnd(28), r.file + (r.line >= 0 ? ':' + (r.line + 1) : ''));
ws.close(); chrome.kill();

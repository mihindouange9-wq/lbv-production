/* Mesure la fluidité en conditions téléphone : 390 × 844, processeur ralenti (×4 par défaut), réseau non simulé.
   node tools/perf-mobile.mjs [ralenti] [largeur] [hauteur] */
import { spawn } from 'node:child_process';
const [THROTTLE = '4', W = '390', H = '844'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 2, mobile: true, screenWidth: +W, screenHeight: +H });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setCPUThrottlingRate', { rate: +THROTTLE });
const t0 = Date.now();
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html' });
await sleep(16000);
await ev('document.body.click(); true'); await sleep(3000);

const pass = async (label) => {
  const res = await ev(`new Promise((done) => {
    const frames = []; let last = performance.now(); const t0 = last;
    const step = (t) => { frames.push(t - last); last = t; if (t - t0 < 8000) requestAnimationFrame(step); else done(frames); };
    requestAnimationFrame(step);
    let y = window.scrollY;
    const tick = setInterval(() => { y += 220; window.scrollTo(0, y); }, 100);
    setTimeout(() => clearInterval(tick), 8000);
  })`);
  const f = res.slice(5).sort((a, b) => a - b);
  if (!f.length) { console.log(label, 'aucune image'); return; }
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  console.log(label.padEnd(22), 'fps moy', (1000 / avg).toFixed(1).padStart(5), '· médiane', f[Math.floor(f.length / 2)].toFixed(1).padStart(6), 'ms · p95', f[Math.floor(f.length * 0.95)].toFixed(1).padStart(6), 'ms · pire', f[f.length - 1].toFixed(0).padStart(5), 'ms');
};
const setup = async (css) => { await ev(); };
const cycle = async (label, css) => { await setup(css); await ev('window.scrollTo(0, 0); true'); await sleep(1200); await pass(label); };
await cycle('chauffe', '');
await cycle('tel quel', '');
await cycle('sans feu', '.fire-canvas{display:none}');
await cycle('sans filtres image', 'img{filter:none!important}');
await cycle('sans feu ni filtres', '.fire-canvas{display:none} img{filter:none!important}');
await cycle('tel quel (contrôle)', '');
const state = await ev(`JSON.stringify({ hauteur: document.body.scrollHeight, canvasVisibles: [...document.querySelectorAll('canvas')].filter((c) => c.getBoundingClientRect().width > 0).length, debordement: document.documentElement.scrollWidth > innerWidth })`);
console.log('chargement', ((Date.now() - t0) / 1000).toFixed(0), 's ·', state);
ws.close(); chrome.kill();

/* Mesure la fluidité du défilement : images par seconde et pires images, avec et sans certains calques.
   node tools/perf-scroll.mjs [largeur] [hauteur]  (les chiffres sont indicatifs : le rendu headless est logiciel) */
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
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html' });
await sleep(13000);
await ev('document.body.click(); true'); await sleep(2500);

/* Une passe : molette simulée pendant 6 s, mesure des durées d'image */
const run = async (label, setup = 'true') => {
  await ev(setup);
  await ev('window.scrollTo(0, 0); true'); await sleep(1200);
  const res = await ev(`new Promise((done) => {
    const frames = []; let last = performance.now(); const t0 = last; let raf;
    const step = (t) => { frames.push(t - last); last = t; if (t - t0 < 6000) raf = requestAnimationFrame(step); else done(frames); };
    raf = requestAnimationFrame(step);
    const wheel = setInterval(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })), 60);
    setTimeout(() => clearInterval(wheel), 6000);
  })`);
  const f = res.slice(5).sort((a, b) => a - b);
  const med = f[Math.floor(f.length / 2)], p95 = f[Math.floor(f.length * 0.95)], worst = f[f.length - 1];
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  console.log(label.padEnd(30), 'fps moy', (1000 / avg).toFixed(1).padStart(5), '· médiane', med.toFixed(1).padStart(6), 'ms · p95', p95.toFixed(1).padStart(6), 'ms · pire', worst.toFixed(0).padStart(5), 'ms · images', f.length);
};

await run('chauffe (ignorer)');
await run('premier défilement');
await run('défilement chaud');
const info = await ev(`JSON.stringify({ lenis: !!window.lenis, layers: document.querySelectorAll('canvas').length, dpr: devicePixelRatio, h: document.body.scrollHeight })`);
console.log('contexte', info);
ws.close(); chrome.kill();

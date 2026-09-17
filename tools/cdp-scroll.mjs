/* Capture après défilement jusqu'à un sélecteur (+ décalage) : node tools/cdp-scroll.mjs <page> <selecteur> <decalagePx> <sortie.png> [W] [H] [mobile] */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const [page = 'index.html', sel = 'body', off = '0', out = 'tools/shots/scroll.png', W = '1440', H = '900', mobile = ''] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then((r) => r.result?.result?.value);
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: !!mobile, screenWidth: +W, screenHeight: +H });
if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/' + page });
await sleep(12500);
await ev(`document.body.click(); true`); await sleep(1200);
// Défilement progressif jusqu'à la cible (les ScrollTrigger épinglés ont besoin de passer par les étapes)
const target = await ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return -1; return el.getBoundingClientRect().top + window.scrollY + (${+off});})()`);
if (target < 0) { console.log('sélecteur introuvable', sel); process.exit(1); }
let y = 0; while (y < target) { y = Math.min(target, y + Math.round(+H * 0.6)); await ev(`window.scrollTo(0, ${y}); true`); await sleep(120); }
await ev(`window.scrollTo(0, ${target}); true`); await sleep(2500);
const { data } = await send('Page.captureScreenshot', { format: 'png' }).then((r) => r.result);
await writeFile(out, Buffer.from(data, 'base64'));
console.log('écrit', out, 'y=', target);
ws.close(); chrome.kill();

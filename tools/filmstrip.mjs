/* Planche-contact d'une page : captures régulières du haut en bas.
   node tools/filmstrip.mjs <largeur> <hauteur> <pas en écrans> <prefixe> [mobile] */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const [W = '390', H = '844', STEP = '0.9', PREFIX = 'tools/shots/film', MOBILE = '1'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(d.params).slice(0, 200)); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: MOBILE === '1', screenWidth: +W, screenHeight: +H });
if (MOBILE === '1') await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html' });
await sleep(13000); await ev('document.body.click(); true'); await sleep(2000);
await mkdir(PREFIX.replace(/\/[^/]+$/, ''), { recursive: true });
const total = await ev('document.body.scrollHeight');
const step = Math.round(+H * +STEP);
let n = 0;
for (let y = 0; y < total - +H * 0.5 && n < 40; y += step) {
  await ev(`window.scrollTo(0, ${y}); true`); await sleep(1400);
  const { data } = (await send('Page.captureScreenshot', { format: 'jpeg', quality: 76 })).result;
  await writeFile(`${PREFIX}-${String(++n).padStart(2, '0')}.jpg`, Buffer.from(data, 'base64'));
}
const over = await ev(`JSON.stringify([...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).slice(0, 6).map((e) => e.className || e.tagName))`);
console.log('captures', n, '· hauteur', total, '· erreurs', errs.length, errs.join(' | '), '· hors cadre', over);
ws.close(); chrome.kill();

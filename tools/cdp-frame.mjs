/* Capture une image à un instant donné après le chargement (préchargeur, transition…).
   node tools/cdp-frame.mjs <page> <delaiMs> <sortie.png> [clickSelector] [largeur] [hauteur] */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const [page = 'index.html', delay = '1200', out = 'tools/shots/frame.png', click = '', W = '1440', H = '900'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/claude/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/' + page });
if (click) {
  await sleep(12500);
  await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(click)}).click()` });
}
await sleep(+delay);
const { data } = await send('Page.captureScreenshot', { format: 'png' }).then((r) => r.result);
await writeFile(out, Buffer.from(data, 'base64'));
console.log('écrit', out);
ws.close(); chrome.kill();

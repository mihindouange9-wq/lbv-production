/* Liste les requêtes en échec de la page (utile après un changement d'assets). node tools/check-network.mjs */
import { spawn } from 'node:child_process';
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const reqs = new Map(); const fails = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
  if (d.method === 'Network.requestWillBeSent') reqs.set(d.params.requestId, d.params.request.url);
  if (d.method === 'Network.loadingFailed') fails.push([reqs.get(d.params.requestId) || '?', d.params.errorText, d.params.type]);
  if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) fails.push([d.params.response.url, 'HTTP ' + d.params.response.status, d.params.type]);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Network.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html' });
await sleep(14000);
await send('Runtime.evaluate', { expression: 'document.body.click(); window.scrollTo(0, document.body.scrollHeight / 3); true' });
await sleep(4000);
console.log('requêtes', reqs.size, '· échecs', fails.length);
fails.forEach(([u, e, t]) => console.log(' -', e, '·', t, '·', u.slice(0, 120)));
ws.close(); chrome.kill();

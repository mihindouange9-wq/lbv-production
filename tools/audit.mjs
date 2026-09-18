/* Audit du site : console (erreurs, avertissements, exceptions), images cassées, ancres, ids dupliqués, au chargement puis après défilement.
   node tools/audit.mjs [largeur] [hauteur] [mobile] */
import { spawn } from 'node:child_process';
const [W = '1440', H = '900', mobile = '', PAGE = 'index.html'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/claude/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Runtime.consoleAPICalled') { if (d.params.type !== 'log') logs.push(d.params.type + ': ' + d.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 220)); } else if (d.method === 'Runtime.exceptionThrown') { logs.push('EXCEPTION: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)); } else if (d.method === 'Network.loadingFailed') { logs.push('NETWORK: ' + d.params.errorText + ' ' + (d.params.requestId || '')); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: mobile === 'mobile' });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/' + PAGE });
await sleep(14000);
const checks = await evaluate(`(() => {
  const out = {};
  out.brokenImages = [...document.images].filter((i) => i.getAttribute('src') && !i.getAttribute('src').startsWith('data:') && i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
  out.emptySrc = [...document.images].filter((i) => !i.getAttribute('src')).length;
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); out.dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
  out.deadAnchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.querySelector(h));
  out.noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
  out.emptyLinks = [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length;
  out.docHeight = document.documentElement.scrollHeight;
  out.overflowX = document.documentElement.scrollWidth > window.innerWidth;
  return out;
})()`);
// Défilement complet
const h = checks.docHeight;
for (let y = 0; y < h; y += 700) { await evaluate(`window.scrollTo(0, ${y})`); await sleep(350); }
await sleep(1500);
await evaluate('window.scrollTo(0, 0)'); await sleep(800);
const after = await evaluate(`(() => ({ brokenImages: [...document.images].filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')), overflowX: document.documentElement.scrollWidth > window.innerWidth }))()`);
console.log(JSON.stringify({ viewport: W + 'x' + H + (mobile ? ' mobile' : ''), ...checks, afterScroll: after }, null, 1));
console.log('CONSOLE (' + logs.length + ') :');
const uniq = [...new Set(logs)]; uniq.slice(0, 40).forEach((l) => console.log('  ' + l));
ws.close(); chrome.kill();

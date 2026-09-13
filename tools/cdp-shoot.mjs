/**
 * Captures d'écran par défilement via Chrome DevTools Protocol (sans dépendance).
 *   node tools/cdp-shoot.mjs <page.html> <largeur> <hauteur> <prefixe> [mobile]
 * Produit tools/shots/<prefixe>-NN.png et une planche tools/shots/<prefixe>-sheet.png
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [page = 'index.html', W = '1440', H = '900', prefix = 'home', mobile = ''] = process.argv.slice(2);
const width = +W, height = +H, isMobile = mobile === 'mobile';
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --autoplay-policy=no-user-gesture-required', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/claude/chrome-cdp-${port}`,
  `--window-size=${width},${height}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outDir = join(ROOT, 'tools/shots');
await mkdir(outDir, { recursive: true });

let wsUrl;
for (let i = 0; i < 40 && !wsUrl; i++) {
  await sleep(250);
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
}
if (!wsUrl) { chrome.kill(); throw new Error('Chrome DevTools injoignable'); }
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: isMobile, screenWidth: width, screenHeight: height });
if (isMobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.navigate', { url: 'file:///' + ROOT.replace(/\\/g, '/') + '/' + page });
for (let i = 0; i < 80; i++) { await sleep(100); if (events.some((e) => e.method === 'Page.loadEventFired')) break; }
await sleep(12500); // préchargeur + intro
const docH = await evaluate('document.documentElement.scrollHeight');
const shots = [];
let y = 0, n = 0;
while (y < docH && n < 40) {
  // Défilement à la molette pour déclencher Lenis / ScrollTrigger / IntersectionObserver
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: width / 2, y: height / 2, deltaX: 0, deltaY: 0 });
  await evaluate(`window.scrollTo(0, ${y})`);
  await sleep(1400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }).then((r) => r.result);
  const file = join(outDir, `${prefix}-${String(n).padStart(2, '0')}.png`);
  await writeFile(file, Buffer.from(data, 'base64'));
  shots.push(file);
  n++; y += Math.round(height * 0.92);
}
// Planche-contact assemblée dans le navigateur
const cols = isMobile ? 5 : 2;
const scale = isMobile ? 0.48 : 0.5;
const cw = Math.round(width * scale), ch = Math.round(height * scale);
const rows = Math.ceil(shots.length / cols);
const sheetW = cols * (cw + 10) + 10, sheetH = rows * (ch + 26) + 10;
const html = `<style>body{margin:0;background:#222;font:11px monospace;color:#ddd}.g{display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:10px;padding:10px}.g div{height:${ch + 16}px}.g img{width:${cw}px;height:${ch}px;display:block;object-fit:cover;object-position:top}</style><div class="g">${shots.map((s, i) => `<div><img src="file:///${s.replace(/\\/g, '/')}"><span>${prefix} ${i} · y=${i * Math.round(height * 0.92)}</span></div>`).join('')}</div>`;
const sheetFile = join(outDir, `${prefix}-sheet.html`);
await writeFile(sheetFile, html);
await send('Emulation.setDeviceMetricsOverride', { width: sheetW, height: sheetH, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///' + sheetFile.replace(/\\/g, '/') });
await sleep(2500);
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then((r) => r.result);
await writeFile(join(outDir, `${prefix}-sheet.png`), Buffer.from(data, 'base64'));
console.log(`${prefix}: ${shots.length} captures, hauteur ${docH}px → tools/shots/${prefix}-sheet.png (${sheetW}x${sheetH})`);
ws.close(); chrome.kill();

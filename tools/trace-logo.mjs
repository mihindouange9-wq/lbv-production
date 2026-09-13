import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/claude/chrome-cdp-${port}`, '--window-size=800,600', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/tools/tmp/trace.html' });
await sleep(1500);
const r = await send('Runtime.evaluate', { expression: 'window.run()', awaitPromise: true, returnByValue: true });
const v = r.result?.result?.value;
if (!v) { console.log(JSON.stringify(r.result).slice(0, 500)); } else {
  const round = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  const out = { w: v.w, h: v.h, outers: v.outers.map((o) => o.map(round)), holes: v.holes.map((o) => o.map(round)) };
  await writeFile('js/logo-shape.js', '/* Contours du logo LBV vectorisés hors ligne (tools/trace-logo.mjs) */\nwindow.LBV_LOGO_SHAPE = ' + JSON.stringify(out) + ';\n');
  console.log('outers', out.outers.length, 'holes', out.holes.length, 'points', out.outers.flat().length + out.holes.flat().length, 'w', out.w, 'h', out.h);
}
ws.close(); chrome.kill();

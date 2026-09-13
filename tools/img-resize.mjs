/* Redimensionne/convertit des images via Chrome headless + canvas (sharp est bloqué sur cette machine).
   node tools/img-resize.mjs <dossierSource> <dossierSortie> [maxWidth=1600] [quality=0.82] */
import { spawn } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve, extname, basename } from 'node:path';
const [src, out, maxW = '1600', q = '0.82'] = process.argv.slice(2);
const SRC = resolve(src), OUT = resolve(out);
await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/claude/chrome-cdp-${port}`, '--window-size=800,600', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: 'file:///' + SRC.replace(/\\/g, '/') + '/' });
await sleep(1200);
for (const f of files) {
  const keepPng = /logo|hero_slide_1_image|hero_slide_2_image/i.test(f) && /\.png$/i.test(f);
  const expr = `new Promise(async (res) => { try {
    const img = new Image(); img.src = ${JSON.stringify('file:///' + SRC.replace(/\\/g, '/') + '/' + encodeURIComponent(f))}; await img.decode();
    const s = Math.min(1, ${+maxW} / img.naturalWidth); const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    res({ data: c.toDataURL(${keepPng ? "'image/png'" : "'image/jpeg', " + (+q)}), w, h });
  } catch (e) { res({ error: String(e) }); } })`;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  const v = r.result?.result?.value;
  if (!v || v.error) { console.log('ERREUR', f, v?.error); continue; }
  const name = basename(f, extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (keepPng ? '.png' : '.jpg');
  await writeFile(join(OUT, name), Buffer.from(v.data.split(',')[1], 'base64'));
  console.log(name, v.w + 'x' + v.h);
}
ws.close(); chrome.kill();

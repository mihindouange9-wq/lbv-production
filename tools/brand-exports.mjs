/* Exports de marque pour le site, conformes à la charte :
   images/favicon.svg, images/lbv-icon-180.png (apple-touch), images/lbv-symbole-512.png (données structurées),
   images/og-image.jpg (partage 1200 × 630). node tools/brand-exports.mjs */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const G = JSON.parse(readFileSync('brand/lbv-geometry.json', 'utf8'));
const MB = G.mark.box, LB = G.lockup.box;
const r1 = (n) => Math.round(n * 10) / 10;
const NOIR = '#0A0A0A', OS = '#E7E3DA', BRAISE = '#D8261E';

/* Carré noir, symbole os centré : largeur du symbole = k × côté */
const squareSvg = (k) => {
  const w = MB[2] - MB[0], h = MB[3] - MB[1], side = w / k;
  const x = MB[0] - (side - w) / 2, y = MB[1] - (side - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(x)} ${r1(y)} ${r1(side)} ${r1(side)}"><rect x="${r1(x)}" y="${r1(y)}" width="${r1(side)}" height="${r1(side)}" fill="${NOIR}"/><path fill="${OS}" fill-rule="evenodd" d="${G.mark.d}"/></svg>`;
};
writeFileSync('images/favicon.svg', squareSvg(0.86) + '\n');

const og = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Stack+Sans+Headline:wght@200;400&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000}
#og{position:relative;width:1200px;height:630px;background:${NOIR};overflow:hidden;font-family:"Stack Sans Headline",Arial,sans-serif;color:${OS}}
#og img{position:absolute;left:0;bottom:0;width:100%;height:55%;object-fit:cover;object-position:center 88%;opacity:.95}
#og::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,${NOIR} 50%,rgba(10,10,10,.05) 100%)}
.in{position:absolute;inset:0;z-index:2;padding:64px 72px;display:flex;flex-direction:column}
.logo{height:150px;width:auto;display:block;align-self:flex-start}
.line{margin-top:58px;font-weight:200;font-size:60px;line-height:1;letter-spacing:-.035em}.line em{font-style:normal;color:${BRAISE}}
.meta{margin-top:18px;font-weight:400;font-size:15px;letter-spacing:.28em;text-transform:uppercase}
.sq{display:inline-block}</style></head><body>
<div id="og"><img src="../../charte/img/feu.jpg" alt=""><div class="in">
<svg class="logo" viewBox="${LB[0]} ${LB[1]} ${r1(LB[2] - LB[0])} ${r1(LB[3] - LB[1])}"><path fill="${OS}" fill-rule="evenodd" d="${G.mark.d}${G.word.d}"/></svg>
<p class="line">Libreville a une <em>voix.</em></p><p class="meta">Label indépendant · Akanda · Libreville · Gabon</p></div></div>
<div id="i180" class="sq" style="width:180px;height:180px">${squareSvg(0.74).replace('<svg ', '<svg width="180" height="180" ')}</div>
<div id="i512" class="sq" style="width:512px;height:512px">${squareSvg(0.74).replace('<svg ', '<svg width="512" height="512" ')}</div>
</body></html>`;
writeFileSync('tools/tmp/brand-exports.html', og);

const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1300, height: 1500, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/lbv-production/tools/tmp/brand-exports.html' });
await sleep(1500); await ev('document.fonts.ready.then(() => true)'); await sleep(500);
const shot = async (sel, format, file) => {
  const r = await ev(`(() => { const b = document.querySelector('${sel}').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; })()`);
  const { data } = (await send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? 88 : undefined, clip: { x: r[0], y: r[1], width: r[2], height: r[3], scale: 1 } })).result;
  writeFileSync(file, Buffer.from(data, 'base64'));
};
await shot('#og', 'jpeg', 'images/og-image.jpg');
await shot('#i180', 'png', 'images/lbv-icon-180.png');
await shot('#i512', 'png', 'images/lbv-symbole-512.png');
console.log('écrit favicon.svg, lbv-icon-180.png, lbv-symbole-512.png, og-image.jpg');
ws.close(); chrome.kill();

/* Vérifie que les panneaux superposés (fiche artiste, actualité, contact) défilent bien et se referment.
   node tools/check-panels.mjs [largeur] [hauteur] [mobile] */
import { spawn } from 'node:child_process';
const [W = '1440', H = '900', MOBILE = '', URL = 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(d.params.exceptionDetails?.text || d.params).slice(0, 160)); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: !!MOBILE, screenWidth: +W, screenHeight: +H });
if (MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL });
await sleep(13000); await ev('document.body.click(); true'); await sleep(2000);

const test = async (label, openExpr, panelSel) => {
  await ev('window.scrollTo(0, 0); true'); await sleep(600);
  await ev(openExpr); await sleep(2600);
  const before = await ev(`document.querySelector('${panelSel}').scrollTop`);
  // vraie molette envoyée par le navigateur (un événement fabriqué en JS ne fait jamais défiler)
  const box = await ev(`(() => { const r = document.querySelector(${JSON.stringify(panelSel)}).getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })()`);
  for (let k = 0; k < 5; k++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box[0], y: box[1], deltaX: 0, deltaY: 220, pointerType: 'mouse' }); await sleep(140); }
  await sleep(700);
  let after = await ev(`document.querySelector('${panelSel}').scrollTop`);
  if (after === before) { // repli : défilement programmatique, pour distinguer « bloqué par Lenis » de « pas de contenu à défiler »
    await ev(`document.querySelector('${panelSel}').scrollTop = 400; true`); await sleep(300);
    const forced = await ev(`document.querySelector('${panelSel}').scrollTop`);
    console.log(label.padEnd(22), 'molette :', after > before ? 'ok' : 'SANS EFFET', '· défilement possible :', forced > 0 ? 'oui (' + forced + ' px)' : 'non (contenu court ?)');
  } else console.log(label.padEnd(22), 'molette : ok (' + Math.round(after) + ' px)');
  const avantClavier = await ev(`document.querySelector(${JSON.stringify(panelSel)}).scrollTop`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'PageDown', windowsVirtualKeyCode: 34, code: 'PageDown' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'PageDown', windowsVirtualKeyCode: 34, code: 'PageDown' });
  await sleep(500);
  const apresClavier = await ev(`document.querySelector(${JSON.stringify(panelSel)}).scrollTop`);
  if (apresClavier !== avantClavier) console.log(label.padEnd(22), 'clavier : ok (' + Math.round(apresClavier - avantClavier) + ' px)');
};

const touchScroll = async (panelSel) => {
  const box = await ev(`(() => { const r = document.querySelector(${JSON.stringify(panelSel)}).getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height * 0.7)]; })()`);
  const pt = (y) => [{ x: box[0], y, radiusX: 2, radiusY: 2, force: 1 }];
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(box[1]) });
  for (let y = box[1]; y > box[1] - 260; y -= 40) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y) }); await sleep(40); }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(700);
  return ev(`document.querySelector(${JSON.stringify(panelSel)}).scrollTop`);
};

await test('fiche artiste', `document.querySelectorAll('.artist-card')[0].click(); true`, '.artist-panel');
if (MOBILE) {
  await ev(`document.querySelector('.artist-panel').scrollTop = 0; true`); await sleep(400);
  const t = await touchScroll('.artist-panel');
  console.log('fiche artiste (doigt)  ·', t > 0 ? 'ok (' + Math.round(t) + ' px)' : 'SANS EFFET');
}
await ev(`document.querySelector('.close-sidebar').click(); true`); await sleep(2200);
await test('modale actualité', `document.querySelectorAll('.news-cards .news-card')[0].click(); true`, '.modal-blogs');
await ev(`document.querySelector('.close-sidebar-blog').click(); true`); await sleep(1800);
await test('modale contact', `document.querySelector('.cta-footer').click(); true`, '.modal-contact-us');
await ev(`document.querySelector('.close-sidebar-contact').click(); true`); await sleep(1800);
const afterClose = await ev(`({ lenisArrete: !!document.documentElement.classList.contains('lenis-stopped'), corpsFige: getComputedStyle(document.body).overflow, y: Math.round(window.scrollY) })`);
await ev('window.scrollBy(0, 500); true'); await sleep(900);
const scrolled = await ev('Math.round(window.scrollY)');
console.log('après fermeture         · page défile de nouveau :', scrolled > (afterClose.y || 0) ? 'oui' : 'NON', '·', JSON.stringify(afterClose));
console.log('erreurs JS :', errs.length ? errs.join(' | ') : 'aucune');
ws.close(); chrome.kill();

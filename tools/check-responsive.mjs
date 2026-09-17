/* Contrôle responsive : pour chaque largeur, débordement horizontal, éléments trop larges,
   taille de texte minimale, zones tactiles trop petites, sections présentes.
   node tools/check-responsive.mjs [url] */
import { spawn } from 'node:child_process';

const URL = process.argv[2] || 'file:///C:/Users/mihin/Documents/geek/lbv-production/index.html';
const TAILLES = [
  [360, 780, true, 'téléphone étroit'],
  [390, 844, true, 'téléphone courant'],
  [414, 896, true, 'grand téléphone'],
  [768, 1024, true, 'tablette portrait'],
  [844, 390, true, 'téléphone paysage'],
  [1024, 768, false, 'tablette paysage'],
  [1280, 800, false, 'ordinateur portable'],
  [1440, 900, false, 'ordinateur'],
  [1920, 1080, false, 'grand écran'],
];
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails?.text || '') + ' ' + (d.params.exceptionDetails?.exception?.description || '').slice(0, 90)); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');

const SONDE = `(() => {
  const vw = innerWidth, res = { debordement: document.documentElement.scrollWidth > vw + 1, largeurDoc: document.documentElement.scrollWidth, trop: [], petitTexte: [], cibles: [], sections: 0, hauteur: document.body.scrollHeight };
  const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  document.querySelectorAll('body *').forEach((e) => {
    if (!visible(e)) return;
    const r = e.getBoundingClientRect();
    if (r.width > vw + 2 && !['CANVAS', 'IMG', 'svg'].includes(e.tagName) && !e.closest('.marquee, .label-thumbs, .logo-stage')) res.trop.push((e.className || e.tagName).toString().slice(0, 28) + ' ' + Math.round(r.width) + 'px');
    const cs = getComputedStyle(e);
    const texte = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 12);
    if (texte && parseFloat(cs.fontSize) < 12) res.petitTexte.push((e.className || e.tagName).toString().slice(0, 24) + ' ' + cs.fontSize);
    if ((e.tagName === 'A' || e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') && (r.height < 30 || r.width < 30) && innerWidth <= 900) res.cibles.push((e.className || e.tagName).toString().slice(0, 24) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  });
  res.sections = document.querySelectorAll('.hero-section-home, .about-us, .facts-figure-container, .label-section, .container, .method-section, .releases-section, .blog-section, .before-footer-cta, .footer-hit').length;
  return JSON.stringify(res);
})()`;

console.log('largeur  appareil               débordement  éléments trop larges  texte < 12px  cibles < 30px  hauteur');
for (const [w, h, mobile, nom] of TAILLES) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile, screenWidth: w, screenHeight: h });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: URL });
  await sleep(13500);
  await ev('document.body.click(); true'); await sleep(1200);
  // parcours complet pour déclencher les animations puis retour en haut
  await ev(`(async () => { const pas = innerHeight * 0.8; for (let y = 0; y < document.body.scrollHeight; y += pas) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } window.scrollTo(0, 0); return true; })()`);
  await sleep(1500);
  const r = JSON.parse(await ev(SONDE));
  const f = (n) => String(n).padStart(2);
  console.log(
    String(w).padEnd(8), nom.padEnd(22),
    (r.debordement ? 'OUI (' + r.largeurDoc + 'px)' : 'non').padEnd(13),
    f(r.trop.length).padEnd(22),
    f(r.petitTexte.length).padEnd(14),
    f(r.cibles.length).padEnd(15),
    r.hauteur + 'px',
  );
  if (r.trop.length) console.log('         trop larges :', [...new Set(r.trop)].slice(0, 4).join(' | '));
  if (r.petitTexte.length) console.log('         petit texte :', [...new Set(r.petitTexte)].slice(0, 4).join(' | '));
  if (r.cibles.length) console.log('         cibles :', [...new Set(r.cibles)].slice(0, 4).join(' | '));
}
console.log('\nerreurs JS :', errs.length ? [...new Set(errs)].join(' | ') : 'aucune');
ws.close(); chrome.kill();

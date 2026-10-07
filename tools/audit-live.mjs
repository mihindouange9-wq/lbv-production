// Audit du site en ligne : performance (métriques navigateur), accessibilité (axe-core), console, requêtes.
// node tools/audit-live.mjs [url] [largeur] [hauteur]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('C:/Users/mihin/Documents/geek/locagab/package.json');
const puppeteer = require('puppeteer-core');
const [url = 'https://lbv-production.onrender.com/', W = '1440', H = '900'] = process.argv.slice(2);
const width = +W, height = +H, mobile = width < 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const axe = readFileSync('C:/Users/mihin/Documents/geek/pme-app/node_modules/axe-core/axe.min.js', 'utf8');
let browser; for (let i = 0; i < 3 && !browser; i++) { try { browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' }); } catch {} }
const page = await browser.newPage();
await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
if (mobile) await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36');
const requests = [];
const errors = [];
page.on('response', async (r) => { try { const h = r.headers(); requests.push({ url: r.url(), status: r.status(), type: r.request().resourceType(), size: +(h['content-length'] || 0), enc: h['content-encoding'] || '' }); } catch {} });
page.on('pageerror', (e) => errors.push('exception : ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console : ' + m.text().slice(0, 600)));
await page.evaluateOnNewDocument(() => {
  window.__lcp = 0; window.__cls = 0; window.__long = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long += e.duration; }).observe({ type: 'longtask', buffered: true });
});
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
const loadMs = Date.now() - t0;
await sleep(13000); // préchargeur
const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint'); return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(p.find((x) => x.name === 'first-contentful-paint')?.startTime || 0), lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), longTasks: Math.round(window.__long), transfer: Math.round(performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024), resources: performance.getEntriesByType('resource').length }; });
// défilement complet pour charger les images paresseuses, puis mesure de fluidité
const fps = await page.evaluate(async () => {
  const total = document.documentElement.scrollHeight; let frames = 0, start = performance.now();
  const tick = () => { frames++; if (performance.now() - start < 6000) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  for (let y = 0; y < total; y += 40) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r)); if (performance.now() - start > 6000) break; }
  await new Promise((r) => setTimeout(r, Math.max(0, 6000 - (performance.now() - start) + 100)));
  return Math.round(frames / 6);
});
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(500);
// accessibilité
await page.addScriptTag({ content: axe });
const a11y = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }); return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })), passes: r.passes.length }; });
const imgs = await page.evaluate(() => [...document.images].filter((i) => i.offsetParent).map((i) => ({ src: i.currentSrc.split('/').pop(), natural: i.naturalWidth + '×' + i.naturalHeight, shown: Math.round(i.getBoundingClientRect().width * devicePixelRatio) + '×' + Math.round(i.getBoundingClientRect().height * devicePixelRatio) })).filter((i) => i.natural !== '0×0'));
const big = requests.filter((r) => r.size > 300 * 1024).map((r) => `${r.url.split('/').pop().split('?')[0]} ${Math.round(r.size / 1024)} Ko`);
const byType = {}; for (const r of requests) { byType[r.type] = (byType[r.type] || 0) + 1; }
console.log(JSON.stringify({ viewport: `${width}×${height}`, loadMs, nav, fps, requests: requests.length, byType, big, failed: requests.filter((r) => r.status >= 400).map((r) => r.status + ' ' + r.url), errors, a11y, oversized: imgs.filter((i) => { const [nw] = i.natural.split('×').map(Number); const [sw] = i.shown.split('×').map(Number); return sw && nw > sw * 2.2; }) }, null, 1));
await browser.close();

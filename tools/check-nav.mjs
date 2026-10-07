// Contrôle de la navigation : retour en haut au rechargement, liens du menu latéral, ancre dans l'adresse.
// node tools/check-nav.mjs [largeur] [hauteur]   (ex. 390 844 pour téléphone)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'locagab', 'package.json'));
const puppeteer = require('puppeteer-core');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [W = '1440', H = '900'] = process.argv.slice(2);
const width = +W, height = +H, mobile = width < 900;
const url = pathToFileURL(join(ROOT, 'index.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
const ok = (name, pass, detail = '') => out.push(`${pass ? 'OK   ' : 'ÉCHEC'} ${name}${detail ? ' — ' + detail : ''}`);

let browser;
for (let i = 0; i < 3 && !browser; i++) {
  try { browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); } catch {}
}
const page = await browser.newPage();
await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await sleep(12500); // préchargeur complet au premier chargement
const enter = await page.$('.loader-enter, .enter-btn, #enter, .preloader-cta');
if (enter) { await enter.click(); await sleep(1500); }

// 1. Rechargement : la page revient en haut
await page.evaluate(() => window.scrollTo(0, 3000));
await sleep(800);
const before = await page.evaluate(() => window.scrollY);
await page.reload({ waitUntil: 'load' });
await sleep(2500);
const after = await page.evaluate(() => window.scrollY);
ok('rechargement : retour en haut', after === 0, `avant ${before}, après ${after}`);

// 2. Menu latéral : chaque entrée amène sa section sous le haut de l'écran
const targets = ['#about', '#services', '#work', '#sorties', '#blog', '#contact', '#home'];
for (const t of targets) {
  await page.click('.menu-2-bar');
  await sleep(1500);
  await page.click(`.menu-navigate-scroll a[href="${t}"]`);
  await sleep(5200);
  const r = await page.evaluate((t) => { const el = document.querySelector(t); const b = el.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), y: Math.round(window.scrollY), menu: getComputedStyle(document.querySelector('.navigation-menu')).visibility }; }, t);
  const reached = t === '#home' ? r.y < 40 : r.top <= 120 && r.top > -r.h;
  ok(`menu → ${t}`, reached && r.menu === 'hidden', `haut ${r.top}px, scrollY ${r.y}, menu ${r.menu}`);
}

// 3. Adresse avec ancre : on arrive en haut, puis la section vient en douceur
await page.goto('about:blank'); await page.goto(url + '#work', { waitUntil: 'load' });
await sleep(16000);
const anchored = await page.evaluate(() => ({ top: Math.round(document.querySelector('#work').getBoundingClientRect().top), hash: location.hash }));
ok('adresse avec #work : section atteinte, ancre retirée', anchored.top <= 120 && anchored.hash === '', JSON.stringify(anchored));
ok('aucune erreur de script', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(`${width}×${height}\n` + out.join('\n'));

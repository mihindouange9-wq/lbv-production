/* Patch : le rail du hero défile en boucle sur tous les appareils, vitesse liée au scroll ; tailles responsives. */
import { readFile, writeFile } from 'node:fs/promises';
let s = await readFile('js/main.js', 'utf8');
const old = "  K.to('.scrolling-text .rail h4', { y: 0, delay: D, duration: 2 });";
if (!s.includes(old)) throw new Error('rail hero introuvable');
s = s.replace(old, `  // Rail du hero : monte à l'entrée puis défile en boucle (tous appareils), accélère et s'incline au scroll
  K.to('.hero-section-home .scrolling-text .rail h4', { y: 0, delay: D, duration: 2 });
  const heroRail = $('.hero-section-home .scrolling-text .rail');
  if (heroRail) {
    const heroMarquee = K.to(heroRail, { xPercent: -50, duration: 22, ease: 'none', repeat: -1, delay: D + 0.6 });
    let hv = 0;
    lenis.on('scroll', (e) => { hv = e.velocity || 0; });
    const heroSkew = K.quickTo(heroRail, 'skewX', { duration: 0.6, ease: 'power3' });
    K.ticker.add(() => { const boost = Math.min(Math.abs(hv) / 10, 4); heroMarquee.timeScale(K.utils.interpolate(heroMarquee.timeScale(), 1 + boost, 0.08)); heroSkew(Math.max(-10, Math.min(10, -hv / 5))); });
  }`);
await writeFile('js/main.js', s);
let c = await readFile('css/style.css', 'utf8');
const oldRail = '.scrolling-text .rail { display: flex; pointer-events: none; overflow: hidden; color: #fff; }';
if (!c.includes(oldRail)) throw new Error('css rail');
c = c.replace(oldRail, '.scrolling-text .rail { display: flex; pointer-events: none; overflow: visible; color: #fff; will-change: transform; }');
const oldH4 = '.scrolling-text .rail h4 { white-space: nowrap; font-size: 19rem; transform: translateY(100%); font-weight: 500; text-transform: uppercase; font-family: var(--light-font); line-height: 1em; margin: 0 30px 0 0; color: var(--white); }';
if (!c.includes(oldH4)) throw new Error('css h4');
c = c.replace(oldH4, '.scrolling-text .rail h4 { white-space: nowrap; font-size: clamp(6rem, 13.5vw, 19rem); transform: translateY(100%); font-weight: 500; text-transform: uppercase; font-family: var(--light-font); line-height: 1em; margin: 0; padding-right: .3em; color: var(--white); }');
c = c.replace('  .scrolling-text .rail h4 { font-size: 9rem; }\n', '');
await writeFile('css/style.css', c);
console.log('rail du hero : défilement continu + tailles fluides');

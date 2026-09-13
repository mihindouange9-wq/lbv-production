/* Patch : animation du texte du pied de page (rail qui monte, défile en boucle, vitesse liée au scroll, colonnes en cascade). */
import { readFile, writeFile } from 'node:fs/promises';
let s = await readFile('js/main.js', 'utf8');
const start = s.indexOf('  /* ---------- Pied de page : rail qui monte');
const anchor = '  /* ---------- Logo LBV en 3D (calque fixe du haut de page) ---------- */';
const end = s.indexOf(anchor);
if (end < 0) throw new Error('ancre logo 3D introuvable');
if (start >= 0 && start < end) s = s.slice(0, start) + s.slice(end);
const block = `  /* ---------- Pied de page : rail qui monte puis défile en boucle, vitesse liée au scroll, colonnes en cascade ---------- */
  const footRail = $('.footer-hit .scrolling-text .rail');
  if (footRail) {
    const rows = footRail.querySelectorAll('h4');
    K.set(rows, { yPercent: 100, opacity: 0 });
    ST.create({ trigger: '.footer-hit', start: 'top 70%',
      onEnter: () => K.to(rows, { yPercent: 0, opacity: 1, duration: 1.6, ease: 'power4.out', stagger: 0.08, overwrite: true }),
      onLeaveBack: () => K.to(rows, { yPercent: 100, opacity: 0, duration: 0.8, ease: 'power3.in', overwrite: true }) });
    const marquee = K.to(footRail, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
    let vel = 0;
    lenis.on('scroll', (e) => { vel = e.velocity || 0; });
    const skew = K.quickTo(footRail, 'skewX', { duration: 0.6, ease: 'power3' });
    K.ticker.add(() => { const boost = Math.min(Math.abs(vel) / 10, 4); marquee.timeScale(K.utils.interpolate(marquee.timeScale(), 1 + boost, 0.08)); skew(Math.max(-10, Math.min(10, -vel / 5))); });
    // Le rail se décale légèrement avec le défilement (parallaxe)
    K.fromTo('.footer-hit .scrolling-text', { yPercent: 18 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.footer-hit', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  }
  const footCols = $$('.footer-infos > div');
  if (footCols.length) {
    K.set(footCols, { y: 40, opacity: 0 });
    ST.create({ trigger: '.footer-infos', start: 'top 92%', once: true, onEnter: () => K.to(footCols, { y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out' }) });
  }

`;
s = s.replace(anchor, block + anchor);
await writeFile('js/main.js', s);
let c = await readFile('css/style.css', 'utf8');
const oldCss = '.footer-hit .scrolling-text .rail h4 { transform: translateY(0); font-size: 16rem; color: var(--red); }';
if (c.includes(oldCss)) c = c.replace(oldCss, '.footer-hit .scrolling-text .rail { overflow: visible; will-change: transform; }\n.footer-hit .scrolling-text .rail h4 { transform: translateY(0); font-size: 16rem; color: var(--red); padding-right: .35em; margin: 0; }');
await writeFile('css/style.css', c);
console.log('patch pied de page appliqué');

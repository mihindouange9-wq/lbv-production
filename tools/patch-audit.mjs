import { readFile, writeFile } from 'node:fs/promises';
let h = await readFile('index.html', 'utf8');
const blank = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const n0 = (h.match(/src=""/g) || []).length;
h = h.split('src=""').join(`src="${blank}"`);
h = h.replace('<a class="by-who" href="#" target="_blank" rel="noopener"></a>', '<a class="by-who" href="https://www.youtube.com/@LBVProduction-241" target="_blank" rel="noopener"></a>');
await writeFile('index.html', h);
let s = await readFile('js/main.js', 'utf8');
const anchor = '  /* ---------- Logo LBV en 3D (calque fixe du haut de page) ---------- */';
if (!s.includes(anchor)) throw new Error('ancre');
s = s.replace(anchor, `  /* ---------- Clavier : Entrée / Espace activent les éléments à rôle bouton ---------- */
  document.querySelectorAll('[role="button"]').forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } }));

` + anchor);
await writeFile('js/main.js', s);
let l = await readFile('js/logo3d.js', 'utf8');
const oldTick = "  const tick = () => { const t = clock.getElapsedTime(); key.position.set(Math.sin(t * 0.35) * 4, 5, Math.cos(t * 0.35) * 6); rend.render(scene, cam); requestAnimationFrame(tick); };\n  tick();";
if (!l.includes(oldTick)) throw new Error('tick');
l = l.replace(oldTick, `  // Rendu seulement tant que le logo est dans le champ (il quitte l'écran après la section services)
  let active = true;
  window.ScrollTrigger.create({ trigger: opts.leaveTrigger || '.box-section-ups', start: 'top top', end: '+=2600', onLeave: () => { active = false; }, onEnterBack: () => { active = true; } });
  const tick = () => { if (active) { const t = clock.getElapsedTime(); key.position.set(Math.sin(t * 0.35) * 4, 5, Math.cos(t * 0.35) * 6); rend.render(scene, cam); } requestAnimationFrame(tick); };
  tick();`);
await writeFile('js/logo3d.js', l);
console.log('src vides remplacés :', n0, '· clavier + rendu conditionnel ajoutés');

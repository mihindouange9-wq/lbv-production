/* Charte graphique LBV Production : génère charte/index.html (pages 16:9, 1200 × 675).
   node tools/charte-assets.mjs   (une fois : visuels allégés dans charte/img/)
   node tools/trace-brand.mjs     (une fois : géométrie du logo dans brand/)
   node tools/build-charte.mjs    →  charte/index.html
   node tools/pdf-charte.mjs      →  charte/LBV_Production_Charte_Graphique.pdf */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const G = JSON.parse(readFileSync('brand/lbv-geometry.json', 'utf8'));
const LB = G.lockup.box, MB = G.mark.box, WB = G.word.box;
const X = WB[3] - WB[1];
const r1 = (n) => Math.round(n * 10) / 10;
const vb = (b, p = 0) => [b[0] - p, b[1] - p, b[2] - b[0] + 2 * p, b[3] - b[1] + 2 * p].map(r1).join(' ');
const fr = (n, d = 1) => n.toFixed(d).replace('.', ',');

/* ---------- Couleurs ---------- */
const C = {
  noir: '#0A0A0A', charbon: '#161616', graphite: '#1E1E1E', os: '#E7E3DA', os2: '#CFCAC0', cendre: '#8C8A85', cendre2: '#5F5D59',
  ox: '#7A0A0A', braise: '#D8261E', sang: '#1C0505', nuit: '#0E1626', flamme: '#F2A03D',
};
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbStr = (h) => hex2rgb(h).join(' · ');
const cmjn = (h) => { const [r, g, b] = hex2rgb(h).map((v) => v / 255); const k = 1 - Math.max(r, g, b); if (k >= 1) return '0 · 0 · 0 · 100'; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100)).join(' · '); };
const lum = (h) => { const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const level = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grand texte' : 'Décor seulement');

/* ---------- Logo ---------- */
const svgDefs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><path id="lbv-mark" fill-rule="evenodd" d="${G.mark.d}"/><path id="lbv-word" fill-rule="evenodd" d="${G.word.d}"/></defs></svg>`;
const lockup = (h, color = C.os, extra = '') => `<svg class="lg" viewBox="${vb(LB)}" style="height:${h}px;color:${color};${extra}" role="img" aria-label="LBV Production"><use href="#lbv-mark"/><use href="#lbv-word"/></svg>`;
const mark = (h, color = C.os, extra = '') => `<svg class="lg" viewBox="${vb(MB)}" style="height:${h}px;color:${color};${extra}" role="img" aria-label="LBV"><use href="#lbv-mark"/></svg>`;
const markW = (w, color = C.os, extra = '') => `<svg class="lg" viewBox="${vb(MB)}" style="width:${w}px;color:${color};${extra}" role="img" aria-label="LBV"><use href="#lbv-mark"/></svg>`;

/* ---------- Pages ---------- */
const CH = {
  univers: ['01', 'Univers'], logo: ['02', 'Le logo'], couleur: ['03', 'Couleur'], typo: ['04', 'Typographie'], image: ['05', 'Image'],
  signes: ['06', 'Signes et mouvement'], voix: ['07', 'Voix'], app: ['08', 'Applications'], fichiers: ['09', 'Fichiers'],
};
const pages = [];
const page = ({ ch, title, body, cls = '', bare = false }) => pages.push({ ch, title, body, cls, bare });

/* 1 — Couverture */
page({ cls: 'cover', bare: true, body: `
  <img class="cover-img" src="img/nuit-rouge.jpg" alt="">
  <div class="cover-top"><span>Charte graphique</span><span>Édition 01 · Septembre 2026</span></div>
  <div class="cover-logo">${lockup(250)}</div>
  <div class="cover-bottom"><p class="cover-line">Libreville a une <em>voix.</em></p><span>Akanda · Libreville · Gabon</span></div>` });

/* 2 — Sommaire (rempli à la fin) */
page({ cls: 'toc-page', title: 'Sommaire', body: `%%TOC%%
  <div class="howto">
    <div><span class="eyebrow">Pour qui</span><p>L’équipe du label, les artistes, les graphistes, photographes, imprimeurs et développeurs qui travaillent pour LBV Production.</p></div>
    <div><span class="eyebrow">En cas de doute</span><p>Choisir le noir, l’os et le symbole. Retirer plutôt qu’ajouter. Un seul mot en braise.</p></div>
    <div><span class="eyebrow">Validation</span><p>Toute création non prévue ici est montrée au label avant diffusion.</p></div>
  </div>` });

/* ================= 01 UNIVERS ================= */
page({ ch: 'univers', title: 'Manifeste', cls: 'manifesto', body: `
  <div class="mani">
    <p class="mani-big">Libreville a une <em>voix.</em><br>On lui donne une scène.</p>
    <div class="mani-cols">
      <p>LBV Production est un label indépendant gabonais installé à Akanda, aux portes de Libreville. Il signe, produit et diffuse des artistes de la scène urbaine : rap, afrobeat, underground, mélodique, ambiances.</p>
      <p>Sa mission est simple : donner une vraie visibilité et une vraie plateforme d’écoute à toutes les musiques du Gabon, sans distinction de genre, de style ou d’origine, et sans orientation politique.</p>
      <p>LBV est aussi le code de l’aéroport de Libreville : le label porte le nom de sa ville comme une étiquette de bagage. La marque parle comme ses artistes, peu de mots et beaucoup de présence. Elle est sombre parce que la scène est sombre, et rouge parce que la scène brûle.</p>
    </div>
    <div class="pillars">
      <div><span class="eyebrow">Mission</span><p>Faire entendre toutes les musiques du Gabon, au Gabon et au-delà.</p></div>
      <div><span class="eyebrow">Promesse</span><p>Ça va sonner différent.</p></div>
      <div><span class="eyebrow">Positionnement</span><p>Le label indépendant qui traite chaque artiste gabonais comme une signature internationale.</p></div>
      <div><span class="eyebrow">Les trois piliers</span><p>Talent · Son · Scène</p></div>
    </div>
  </div>` });

page({ ch: 'univers', title: 'L’aura : sombre, pas noir et blanc', cls: 'mood-page', body: `
  <div class="mood">
    <figure class="m1"><img src="img/nuit-rouge.jpg" alt=""></figure>
    <figure class="m2"><img src="img/neon-goat.jpg" alt=""></figure>
    <figure class="m3"><img src="img/scene-lbv-show.jpg" alt=""></figure>
    <figure class="m4"><img src="img/nuit-bleue.jpg" alt=""></figure>
    <figure class="m5"><img src="img/neon-porsche.jpg" alt=""></figure>
    <figure class="m6"><img src="img/live.jpg" alt=""></figure>
  </div>
  <div class="mood-side">
    <p>L’aura LBV naît de la nuit : peu de lumière, mais une lumière qui a une couleur. Rouge des néons, orange des projecteurs, bleu d’une rue à deux heures du matin, peau éclairée de côté.</p>
    <p>Le noir domine l’espace, la couleur vit dans l’image. On ne désature jamais par défaut : on assombrit.</p>
    <ul class="keywords"><li>Nuit</li><li>Néon rouge</li><li>Chrome</li><li>Fumée</li><li>Scène</li><li>Béton</li></ul>
  </div>` });

/* ================= 02 LOGO ================= */
page({ ch: 'logo', title: 'Le logo principal', body: `
  <div class="logo-hero">${lockup(330)}</div>
  <div class="logo-hero-cap"><p>Le logo associe le symbole « lbv », dessiné en lettres pleines et inclinées, au mot PRODUCTION en capitales espacées. C’est la signature de toutes les prises de parole officielles : site, pochettes, affiches, documents.</p><p class="small">Version principale : os sur noir. Toujours reproduit à partir des fichiers vectoriels fournis, jamais redessiné ni recomposé.</p></div>` });

{
  const APAD = 110, AH = 400, s = AH / (MB[3] - MB[1] + 2 * APAD);
  const P = G.mark.parts; // 0 : haut du l · 1 : b · 2 : v · 3 : bas du l
  const note = (x, y, tx, ty, label, anchor = 'start') => `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}"/><circle cx="${x}" cy="${y}" r="${5 / s}"/><text x="${tx + (anchor === 'end' ? -10 / s : 10 / s)}" y="${ty + 5 / s}" text-anchor="${anchor}" font-size="${14 / s}">${label}</text>`;
  page({ ch: 'logo', title: 'Anatomie du symbole', body: `
  <div class="anat">
    <svg class="anat-svg" viewBox="${vb(MB, APAD)}" style="height:${AH}px">
      <use href="#lbv-mark" fill="${C.os}"/>
      <g class="ann" stroke-width="${1 / s}">
        ${note((P[0][0] + P[0][2]) / 2 - 20, P[0][1] + 40, P[0][0] - 30, P[0][1] - 50, 'Le trait détaché', 'end')}
        ${note((P[3][0] + P[3][2]) / 2, P[3][3] - 40, P[3][0] + 10, P[3][3] + 70, 'Le fût coupé', 'end')}
        ${note(466, 545, 520, MB[3] + 95, 'L’étoile en réserve')}
        ${note((P[2][0] + P[2][2]) / 2 + 30, P[2][1] + 30, P[2][2] - 90, P[2][1] - 80, 'Le v en appui')}
      </g>
    </svg>
    <ul class="anat-list">
      <li><b>Le l fendu</b><span>Un trait interrompu, comme une coupe dans le beat. Il se lit aussi comme un i et son point : la marque joue sur les deux lectures.</span></li>
      <li><b>L’étoile en réserve</b><span>L’étoile n’est pas ajoutée, elle est creusée dans la panse du b. Le talent est déjà dans la lettre, le label le révèle.</span></li>
      <li><b>Le v en appui</b><span>Pointe vers le sol, bras ouverts vers le haut : la voix qui monte.</span></li>
      <li><b>L’inclinaison</b><span>Environ 10° vers la droite. Les lettres avancent, comme un départ.</span></li>
    </ul>
  </div>` });
}

{
  const pad = 2.2 * X, box = [LB[0] - pad, LB[1] - pad, LB[2] + pad, LB[3] + pad];
  const W = box[2] - box[0], H = box[3] - box[1];
  const s = 372 / H;
  const hl = (y, lbl) => `<line x1="${box[0]}" x2="${box[2]}" y1="${y}" y2="${y}"/>` + (lbl ? `<text x="${box[0] + 6 / s}" y="${y - 6 / s}" font-size="${12 / s}">${lbl}</text>` : '');
  const vl = (x) => `<line y1="${box[1]}" y2="${box[3]}" x1="${x}" x2="${x}"/>`;
  const dim = (x1, y1, x2, y2, lbl, dx = 0, dy = 0) => `<line class="dim" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="dimt" x="${(x1 + x2) / 2 + dx}" y="${(y1 + y2) / 2 + dy}" font-size="${17 / s}" text-anchor="middle">${lbl}</text>`;
  const squares = Array.from({ length: 8 }, (_, i) => `<rect x="${LB[2] + 0.6 * X}" y="${LB[3] - (i + 1) * X}" width="${X}" height="${X}"/>`).join('');
  page({ ch: 'logo', title: 'Construction', body: `
  <div class="constr">
    <svg viewBox="${vb(box)}" style="height:372px;width:${r1(W * s)}px" class="constr-svg">
      <g class="grid" stroke-width="${1 / s}">${hl(MB[1])}${hl(MB[3])}${hl(WB[1])}${hl(WB[3])}${vl(LB[0])}${vl(WB[2])}${vl(LB[2])}</g>
      <g class="xsq" stroke-width="${1 / s}">${squares}</g>
      <use href="#lbv-mark" fill="${C.os}"/><use href="#lbv-word" fill="${C.os}"/>
      <g class="dims" stroke-width="${1 / s}">
        ${dim(LB[0] - 0.9 * X, MB[1], LB[0] - 0.9 * X, MB[3], '6,4 X', -0.75 * X, 6 / s)}
        ${dim(LB[0] - 0.9 * X, WB[1], LB[0] - 0.9 * X, WB[3], '1 X', -0.62 * X, 6 / s)}
        ${dim(LB[0], LB[3] + 1.1 * X, WB[2], LB[3] + 1.1 * X, '9,9 X', 0, -8 / s)}
        ${dim(LB[0], LB[1] - 0.9 * X, LB[2], LB[1] - 0.9 * X, '12,6 X', 0, -8 / s)}
      </g>
    </svg>
    <div class="constr-side">
      <p class="lead">Tout se mesure en X : la hauteur du mot PRODUCTION.</p>
      <table class="kv">
        <tr><td>Hauteur du symbole</td><td>${fr((MB[3] - MB[1]) / X)} X</td></tr>
        <tr><td>Écart symbole / mot</td><td>${fr((WB[1] - MB[3]) / X, 2)} X</td></tr>
        <tr><td>Largeur du mot</td><td>${fr((WB[2] - WB[0]) / X)} X</td></tr>
        <tr><td>Largeur totale</td><td>${fr((LB[2] - LB[0]) / X)} X</td></tr>
        <tr><td>Hauteur totale</td><td>${fr((LB[3] - LB[1]) / X)} X</td></tr>
        <tr><td>Zone de protection</td><td>1 X</td></tr>
      </table>
      <p class="small">Le mot est aligné à gauche sur le fût du l et s’arrête avant le v : le symbole garde toujours la plus grande masse. Aucun texte, bord de page ni élément contrasté n’entre dans la zone de protection de 1 X (2 X sur une pochette ou un post).</p>
      <div class="mins">
        <div><div class="min-demo">${lockup(34)}</div><b>Logo complet</b><span>30 mm de large · 120 px</span></div>
        <div><div class="min-demo">${mark(22)}</div><b>Symbole seul</b><span>8 mm de haut · 24 px — en dessous de 120 px de large, il remplace le logo</span></div>
      </div>

    </div>
  </div>` });
}


page({ ch: 'logo', title: 'Versions de couleur', body: `
  <div class="grid4 versions">
    <div class="ver"><div class="plate" style="background:${C.noir};border:1px solid rgba(231,227,218,.14)">${lockup(120, C.os)}</div><b>Principale</b><span>Os sur Noir Akanda. Par défaut, partout.</span></div>
    <div class="ver"><div class="plate" style="background:${C.os}">${lockup(120, C.noir)}</div><b>Inversée</b><span>Noir sur Os. Papier, documents, fonds clairs.</span></div>
    <div class="ver"><div class="plate" style="background:${C.noir};border:1px solid rgba(231,227,218,.14)">${lockup(120, C.braise)}</div><b>Signature braise</b><span>Braise sur noir. Événements, LBV Show, merch.</span></div>
    <div class="ver"><div class="plate" style="background:${C.os}">${lockup(120, C.ox)}</div><b>Oxblood</b><span>Oxblood sur os. Papeterie, gaufrage, étiquettes.</span></div>
  </div>
  <p class="small wide">Le logo n’existe qu’en aplat d’une seule couleur. Aucune autre combinaison n’est autorisée. En impression une couleur, utiliser la version noire ou la version os en réserve.</p>` });

page({ ch: 'logo', title: 'Le symbole seul', body: `
  <div class="grid4 sym">
    <div class="ver"><div class="plate tall" style="background:${C.charbon}"><div class="avatar">${markW(96)}</div></div><b>Avatar</b><span>Instagram, YouTube, TikTok. Symbole os sur fond noir, centré, 62 % du cercle.</span></div>
    <div class="ver"><div class="plate tall" style="background:${C.charbon}"><div class="appicon">${markW(64)}</div><div class="fav32">${markW(22)}</div><div class="fav16">${markW(12)}</div></div><b>Icônes et favicon</b><span>512, 32 et 16 px. Sous 24 px, le symbole reste plein, sans contour.</span></div>
    <div class="ver"><div class="plate tall" style="background:${C.noir}">${markW(190, C.braise)}</div><b>Tampon</b><span>Au dos d’une pochette, sur un sticker, sur une manche.</span></div>
    <div class="ver"><div class="plate tall" style="background:${C.os}">${markW(190, C.noir)}</div><b>Marquage</b><span>Gravure, gaufrage, broderie : toujours en une couleur.</span></div>
  </div>
  <p class="small wide">Le symbole seul remplace le logo complet dans les formats carrés et petits. Il ne remplace jamais le logo complet sur un document officiel.</p>` });

page({ ch: 'logo', title: 'Le logo sur une image', body: `
  <div class="grid3 onimg">
    <figure class="ok"><div class="shot"><img src="img/scene-lbv-show.jpg" alt="" style="object-position:50% 30%"><div class="veil"></div><div class="shot-logo">${lockup(62)}</div></div><figcaption><b>Oui</b> Zone sombre et calme, voile noir en pied d’image.</figcaption></figure>
    <figure class="ok"><div class="shot"><img src="img/carty.jpg" alt="" style="object-position:50% 45%;filter:contrast(1.08) saturate(.78) brightness(.72)"><div class="shot-logo tl">${mark(40)}</div></div><figcaption><b>Oui</b> Symbole en tampon, dans un coin sombre, marge de 2 X.</figcaption></figure>
    <figure class="no"><div class="shot"><img src="img/neon-goat.jpg" alt=""><div class="shot-logo mid">${lockup(62)}</div></div><figcaption><b>Non</b> Sur une zone chargée ou lumineuse, le logo disparaît.</figcaption></figure>
  </div>` });

{
  const t = (inner, label, bg = C.charbon) => `<div class="ver no"><div class="plate" style="background:${bg}">${inner}</div><b>${label}</b></div>`;
  page({ ch: 'logo', title: 'Ce qu’on ne fait jamais', body: `
  <div class="grid4 donts">
    ${t(lockup(84, C.os, 'transform:scaleX(1.45)'), 'Déformer')}
    ${t(lockup(84, C.os, 'transform:rotate(-14deg)'), 'Faire pivoter')}
    ${t(lockup(84, '#2f6fe0'), 'Changer de couleur')}
    ${t(lockup(84, 'transparent', 'stroke:#e7e3da;stroke-width:3px'), 'Détourer au trait')}
    ${t(lockup(84, C.os, 'filter:drop-shadow(0 0 14px #d8261e) drop-shadow(0 6px 4px #000)'), 'Ajouter lueur ou ombre')}
    ${t(`<div style="display:flex;align-items:center;gap:14px">${mark(58)}<span style="font:400 15px/1 var(--display);letter-spacing:.3em;color:${C.os}">PRODUCTION</span></div>`, 'Recomposer le logo')}
    ${t(lockup(84, C.ox), 'Oxblood sur noir', C.noir)}
    ${t(`<div style="position:relative">${lockup(84)}<span style="position:absolute;left:42.5%;top:36%;width:15px;height:15px;background:#f2a03d;border-radius:50%"></span></div>`, 'Remplir l’étoile')}
  </div>` });
}

/* ================= 03 COULEUR ================= */
{
  const sw = (key, name, role, dark = true) => `<div class="swatch"><div class="chip" style="background:${C[key]};${key === 'noir' ? 'border:1px solid rgba(231,227,218,.16)' : ''}"><span style="color:${dark ? C.os : C.noir}">${name}</span></div>
    <dl><dt>HEX</dt><dd>${C[key]}</dd><dt>RVB</dt><dd>${rgbStr(C[key])}</dd><dt>CMJN</dt><dd>${cmjn(C[key])}</dd></dl><p>${role}</p></div>`;
  page({ ch: 'couleur', title: 'Palette principale', body: `
  <div class="dom-bar"><div style="background:${C.noir}"><span>70 %</span><b>Noir Akanda</b></div><div style="background:${C.os};color:${C.noir}"><span>20 %</span><b>Os</b></div><div style="background:${C.ox}"><span>7 %</span><b>Oxblood</b></div><div style="background:${C.braise}"><span>3 %</span><b>Braise</b></div></div>
  <div class="grid4">
    ${sw('noir', 'Noir Akanda', 'Fonds et grandes surfaces.')}
    ${sw('os', 'Os', 'Texte, logo, filets.', false)}
    ${sw('ox', 'Oxblood', 'Couleur de marque, surfaces rouges.')}
    ${sw('braise', 'Braise', 'Accent : un mot, un signe.')}
  </div>
  <p class="small wide">CMJN : conversion indicative, à valider sur épreuve chez l’imprimeur. Pour une impression en ton direct, faire choisir la référence Pantone la plus proche sur nuancier physique, en particulier pour l’oxblood.</p>` });

  const mini = (key, name, role) => `<div class="mini"><i style="background:${C[key]};${['noir', 'charbon', 'graphite', 'sang', 'nuit'].includes(key) ? 'border:1px solid rgba(231,227,218,.16)' : ''}"></i><div><b>${name}</b><code>${C[key]} · ${rgbStr(C[key])}</code><span>${role}</span></div></div>`;
  page({ ch: 'couleur', title: 'Neutres et couleurs d’ambiance', body: `
  <div class="two top">
    <div><span class="eyebrow">Neutres d’interface</span>
      ${mini('charbon', 'Charbon', 'Deuxième fond : cartes, sections alternées.')}
      ${mini('graphite', 'Graphite', 'Troisième niveau : champs, survols, séparations.')}
      ${mini('os2', 'Os voilé', 'Texte courant sur noir.')}
      ${mini('cendre', 'Cendre', 'Légendes, métadonnées, labels.')}
    </div>
    <div><span class="eyebrow">Ambiance, jamais pour le texte</span>
      ${mini('sang', 'Sang séché', 'Fond de panneau chaud, remplace le noir pour une section « feu ».')}
      ${mini('nuit', 'Nuit bleue', 'Uniquement dans les images et vidéos : la nuit froide qui répond au rouge.')}
      ${mini('flamme', 'Flamme', 'Uniquement dans le feu, la lumière de scène, les braises.')}
      <p class="small">Ces couleurs existent déjà dans les photos et les pochettes du label. Elles ne deviennent jamais des aplats d’interface ni des couleurs de logo.</p>
    </div>
  </div>` });

  const pairs = [['Os', C.os, 'Noir Akanda', C.noir], ['Os voilé', C.os2, 'Noir Akanda', C.noir], ['Os', C.os, 'Charbon', C.charbon], ['Cendre', C.cendre, 'Noir Akanda', C.noir], ['Braise', C.braise, 'Noir Akanda', C.noir], ['Os', C.os, 'Oxblood', C.ox], ['Os', C.os, 'Sang séché', C.sang], ['Noir Akanda', C.noir, 'Os', C.os], ['Oxblood', C.ox, 'Os', C.os], ['Oxblood', C.ox, 'Noir Akanda', C.noir]];
  page({ ch: 'couleur', title: 'Contrastes et lisibilité', body: `
  <table class="contrast"><thead><tr><th>Exemple</th><th>Texte</th><th>Fond</th><th>Ratio</th><th>Usage</th></tr></thead><tbody>
  ${pairs.map(([tn, t, bn, b]) => { const r = ratio(t, b); const lv = level(r); return `<tr class="${r < 3 ? 'fail' : ''}"><td><span class="sample" style="background:${b};color:${t}">Aa</span></td><td>${tn}</td><td>${bn}</td><td class="num">${fr(r, 2)} : 1</td><td>${lv}</td></tr>`; }).join('')}
  </tbody></table>
  <p class="small wide">Ratios WCAG 2.1. Texte courant : 4,5 : 1 minimum. Titres de plus de 24 px : 3 : 1 minimum. La braise sur noir est réservée aux titres et aux signes ; l’oxblood ne porte jamais de texte sur fond noir.</p>` });
}

/* ================= 04 TYPOGRAPHIE ================= */
page({ ch: 'typo', title: 'Les deux caractères', body: `
  <div class="specimen">
    <div class="aa">Aa</div>
    <div>
      <div class="weights"><span style="font-weight:200">Extra-light 200</span><span style="font-weight:300">Light 300</span><span style="font-weight:400">Regular 400</span><span style="font-weight:500">Medium 500</span><span style="font-weight:700">Bold 700</span></div>
      <div class="alphabet">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>àâçéèêëîïôùûü 0123456789 « » ! ? — ·</div>
      <p><b>Stack Sans Headline</b> porte la voix : titres, textes, navigation, mot PRODUCTION du logo. Capitales tendues, approche serrée ; plus le titre est grand, plus la graisse est fine (200 et 300).</p>
    </div>
  </div>
  <div class="bebas-strip">
    <div class="big-num">06<span>·</span>20+<span>·</span>241</div>
    <p><b>Bebas Neue</b> porte les chiffres et les repères : compteurs, dates, numéros de piste, durées. Jamais plus de trois mots, jamais une phrase.</p>
  </div>` });

page({ ch: 'typo', title: 'Hiérarchie et règles', body: `
  <div class="hier">
    <div class="sample-comp">
      <span class="h-eyebrow">Nouveau single · Dac-M</span>
      <div class="h-display">Ça va <em>sonner</em><br>différent.</div>
      <div class="h-title">Allô, le clip officiel</div>
      <p class="h-body">Damier noir et blanc, sourire en coin et refrain qui reste. Dac-M signe son titre le plus solaire, disponible sur toutes les plateformes.</p>
      <div class="h-meta"><span class="h-num">03.05.26</span><span>Clip · 3 min 12</span></div>
    </div>
    <table class="scale">
      <tr><td>Sur-titre</td><td>Stack Sans 400 · capitales · 11,5 px · approche +0,28 em · Cendre</td></tr>
      <tr><td>Display</td><td>Stack Sans 200 · 64 à 180 px · interligne 0,96 · approche −0,03 em</td></tr>
      <tr><td>Titre</td><td>Stack Sans 300 · 24 à 40 px · approche −0,02 em</td></tr>
      <tr><td>Corps</td><td>Stack Sans 300 · 16 px · interligne 1,5 · 60 caractères par ligne · Os voilé</td></tr>
      <tr><td>Chiffres</td><td>Bebas Neue 400 · approche +0,04 em · Os</td></tr>
      <tr><td>Accent</td><td>Un seul mot en Braise par titre, même graisse</td></tr>
    </table>
  </div>
  <div class="grid3 rules-strip">
    <p><b>Un mot brûle.</b> Un seul mot par titre passe en braise : le verbe, le lieu, la promesse. Jamais deux.</p>
    <p><b>Capitales courtes.</b> Réservées aux libellés, à la navigation et aux titres de trois mots au plus, toujours espacées.</p>
    <p><b>Serré et fin.</b> Grands titres en graisse légère, approche négative, alignés à gauche. Ni cursive, ni contour, ni dégradé dans les lettres.</p>
  </div>` });

page({ ch: 'typo', title: 'Ce qu’on ne fait jamais en typographie', body: `
  <div class="grid4 donts type-donts">
    <div class="ver no"><div class="plate"><span style="font-family:'Brush Script MT',cursive;font-size:44px">Libreville</span></div><b>Cursive ou script</b></div>
    <div class="ver no"><div class="plate"><span style="font-size:44px;font-weight:300;-webkit-text-stroke:1px #e7e3da;color:transparent">Libreville</span></div><b>Lettres en contour</b></div>
    <div class="ver no"><div class="plate"><span style="font-size:44px;font-weight:300;background:linear-gradient(90deg,#d8261e,#f2a03d);-webkit-background-clip:text;color:transparent">Libreville</span></div><b>Dégradé dans le texte</b></div>
    <div class="ver no"><div class="plate"><span style="font-size:44px;font-weight:300;text-shadow:0 3px 10px rgba(216,38,30,.9)">Libreville</span></div><b>Ombre ou lueur</b></div>
    <div class="ver no"><div class="plate"><p style="font-size:13px;line-height:1.5;text-transform:uppercase;max-width:22ch;color:var(--os-2)">Le label signe, produit et diffuse des artistes de la scène urbaine gabonaise.</p></div><b>Paragraphe en capitales</b></div>
    <div class="ver no"><div class="plate"><p style="font-size:13px;line-height:1.7;letter-spacing:.22em;max-width:22ch;color:var(--os-2)">Le label signe, produit et diffuse des artistes de la scène urbaine.</p></div><b>Approche large sur du texte courant</b></div>
    <div class="ver no"><div class="plate"><span style="font-size:38px;font-weight:300">Chaque <em>titre</em> est un <em>pas</em></span></div><b>Deux mots en braise</b></div>
    <div class="ver no"><div class="plate"><span style="font-size:38px;font-weight:700;letter-spacing:.04em">Libreville</span></div><b>Graisse lourde sur un grand titre</b></div>
  </div>
  <div class="two tight fonts-legal">
    <div><h3>Polices de secours</h3><p class="small">Web : <code>"Stack Sans Headline", "Helvetica Neue", Arial, sans-serif</code> et <code>"Bebas Neue", Impact, sans-serif</code>. Bureautique et courrier : Arial pour le texte, Impact pour les chiffres. Jamais de police à empattements, jamais de condensée pour le texte courant.</p></div>
    <div><h3>Licences</h3><p class="small">Stack Sans Headline et Bebas Neue sont distribuées par Google Fonts sous licence SIL Open Font License 1.1 : usage commercial, impression et web autorisés sans redevance, y compris pour un prestataire travaillant pour le label.</p></div>
  </div>` });

/* ================= 05 IMAGE ================= */
{
  const A = [['carty.jpg', 'Carty', 'Rap · Afro-urbain', '58% 42%', 1.3, '60% 45%'], ['dom.jpg', 'D.O.M', 'Alternatif', '50% 32%', 1.3, '50% 38%'], ['le-t.jpg', 'Le T', 'Underground', '48% 52%', 1.6, '45% 50%'], ['dac-m.jpg', 'Dac-M', 'Afrobeat · Humour', '38% 6%', 1.3, '32% 16%'], ['xquality.jpg', 'Xquality', 'Rap mélodique', '52% 18%', 1.35, '52% 22%'], ['lunxy.jpg', 'Lunxy', 'Ambiances', '50% 12%', 1.7, '50% 18%']];
  page({ ch: 'image', title: 'Étalonnage et cadrage', cls: 'image-page', body: `
  <div class="grid3 grade">
    <figure><div class="g-img"><img src="img/dom.jpg" alt="" style="object-position:50% 30%"></div><figcaption><b>Brut</b> La photo telle que livrée.</figcaption></figure>
    <figure><div class="g-img"><img src="img/dom.jpg" alt="" style="object-position:50% 30%;filter:contrast(1.08) saturate(.78) brightness(.86)"><div class="vign"></div></div><figcaption><b>LBV</b> Contraste + 8 %, saturation − 22 %, luminosité − 14 %, vignettage doux.</figcaption></figure>
    <figure class="no"><div class="g-img"><img src="img/dom.jpg" alt="" style="object-position:50% 30%;filter:grayscale(1) contrast(1.2)"></div><figcaption><b>Non</b> Le noir et blanc systématique éteint la scène.</figcaption></figure>
  </div>
  <div class="artists">${A.map(([f, n, t, pos, z, o]) => `<figure><div class="sq"><img src="img/${f}" alt="${n}" style="object-position:${pos};transform:scale(${z});transform-origin:${o}"></div><figcaption><b>${n}</b><span>${t}</span></figcaption></figure>`).join('')}</div>
  <p class="small wide">Réglage web : <code>filter: contrast(1.08) saturate(.78) brightness(.86)</code> — la photo reprend sa pleine couleur au survol.</p>
  <p class="small wide">Portrait carré, yeux dans le tiers supérieur, visage sur au moins un tiers du cadre. On recadre, on ne déforme pas. Lumière de nuit, de scène ou de studio ; jamais de fond blanc, jamais de sourire publicitaire.</p>` });
}

page({ ch: 'image', title: 'Pochettes : la direction existante', body: `
  <div class="covers-wrap"><div class="covers">
    <img src="img/cover-allo.jpg" alt="Allô, Dac-M"><img src="img/cover-10dih.jpg" alt="10 DIH"><img src="img/cover-money-dance.jpg" alt="Money Dance, Le T"><img src="img/cover-heroes.jpg" alt="Heroes and Villains"><img src="img/cover-wobebie.jpg" alt="Wobebie"><img src="img/cover-hotel.jpg" alt="Hotel">
  </div>
  <div class="covers-text">
    <p>Les pochettes du label partagent déjà un langage : lettrage massif, rouge et noir, grain, photographie de nuit. La charte ne l’efface pas, elle le cadre.</p>
    <ul class="checks"><li>Le titre et l’artiste dominent, le symbole LBV signe en tampon : 7 % de la largeur, marge de 5 %.</li><li>Une couleur vive au plus par pochette, le reste descend vers le noir.</li><li>Formats : 3000 × 3000 px, RVB, sans texte dans les 5 % de bord.</li></ul>
  </div></div>` });

/* ================= 06 SIGNES ET MOUVEMENT ================= */
page({ ch: 'signes', title: 'Signes et mouvement', body: `
  <div class="signs">
    <figure class="s-fire"><img src="img/feu.jpg" alt=""><figcaption><b>Le feu</b><span>Flammes réelles ou générées, montant du bas de l’image. Il sépare les chapitres forts : chiffres, annonces, LBV Show.</span></figcaption></figure>
    <figure><div class="s-demo"><span class="line-demo"></span><span class="line-demo short"></span></div><figcaption><b>Le filet</b><span>1 px, Os à 12 %. Il structure sans enfermer : pas de cadres, pas de coins arrondis.</span></figcaption></figure>
    <figure><div class="s-demo cross">${(() => { const c = '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 1v18M1 10h18" stroke="#d8261e" stroke-width="1.2"/></svg>'; return c + '<span class="cw">TALENT</span>' + c + '<span class="cw">SON</span>' + c + '<span class="cw">SCÈNE</span>' + c; })()}</div><figcaption><b>La croix</b><span>Repère fin entre les mots d’une ligne de base : TALENT + SON + SCÈNE. Elle tourne au défilement.</span></figcaption></figure>
    <figure><div class="s-demo"><svg viewBox="0 0 100 100" width="86" height="86"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(231,227,218,.14)" stroke-width="2"/><circle cx="50" cy="50" r="40" fill="none" stroke="#d8261e" stroke-width="2" stroke-dasharray="251" stroke-dashoffset="88" transform="rotate(-90 50 50)"/><text x="50" y="58" text-anchor="middle" font-family="Bebas Neue" font-size="24" fill="#e7e3da">03</text></svg></div><figcaption><b>L’anneau</b><span>Progression d’une série (artistes, pistes). Seul usage de la braise en trait.</span></figcaption></figure>
    <figure><div class="s-demo curve-demo"><svg viewBox="-6 -6 252 252" width="128" height="128"><rect x="0" y="0" width="240" height="240" fill="none" stroke="rgba(231,227,218,.12)"/><path d="M0 240C52.8 240 86.4 0 240 0" fill="none" stroke="#d8261e" stroke-width="4"/></svg></div><figcaption><b>Le mouvement</b><span><code>cubic-bezier(.22, 1, .36, 1)</code> : départ franc, arrivée longue. Les mots montent de leur ligne en 1,2 à 1,4 s, les images s’ouvrent par un masque. Ni flou, ni rebond, ni clignotement ; une apparition ne se rejoue pas.</span></figcaption></figure>
  </div>` });

/* ================= 07 VOIX ================= */
page({ ch: 'voix', title: 'Ton et écriture', cls: 'voice-page', body: `
  <div class="grid4 voice">
    <div><h3>Direct</h3><p>Une idée par phrase. Le sujet, le verbe, la date. On coupe tout ce qui explique trop.</p></div>
    <div><h3>Fier</h3><p>On dit Libreville, Akanda, le Gabon. On nomme les artistes en premier.</p></div>
    <div><h3>Sobre</h3><p>Pas de superlatif, pas de « incroyable », un point d’exclamation par mois.</p></div>
    <div><h3>Situé</h3><p>Tutoiement sur les réseaux, vouvoiement dans les échanges professionnels et les contrats.</p></div>
  </div>
  <div class="voice-ex">
    <div><span class="eyebrow">Réseaux · annonce</span><q>Allô. Le nouveau single de Dac-M est disponible partout. Le clip sort vendredi.</q></div>
    <div><span class="eyebrow">Affiche · événement</span><q>LBV Show. Six artistes, une scène, une nuit à Libreville.</q></div>
    <div><span class="eyebrow">Site · accroche</span><q>Chaque grand titre commence par une rencontre.</q></div>
    <div class="bad"><span class="eyebrow">À éviter</span><q>🔥🔥 Le MEILLEUR label du Gabon vous présente son incroyable nouveau son !!! 🔥🔥</q></div>
  </div>` });

/* ================= 08 APPLICATIONS ================= */
page({ ch: 'app', title: 'Réseaux sociaux', body: `
  <div class="social">
    <figure><div class="ig post"><img src="img/dac-m.jpg" alt="" style="object-position:38% 10%;filter:contrast(1.08) saturate(.78) brightness(.8)"><div class="post-veil"></div><div class="post-mark">${mark(22)}</div><div class="post-txt"><span class="eyebrow">Nouveau single</span><b>Allô</b><span class="post-art">DAC-M</span></div><span class="post-num">03.05</span></div><figcaption>Post 1080 × 1080</figcaption></figure>
    <figure><div class="ig story"><img src="img/feu.jpg" alt="" class="story-fire"><div class="story-top">${lockup(34)}</div><div class="story-mid"><span class="eyebrow">Libreville</span><b>LBV<br>SHOW</b><span class="post-num big">2026</span></div><div class="story-names">Carty · D.O.M · Le T<br>Dac-M · Xquality · Lunxy</div></div><figcaption>Story 1080 × 1920</figcaption></figure>
    <figure><div class="ig post quote"><span class="eyebrow">LBV Production</span><b>Libreville a une <em>voix.</em></b><div class="post-mark br">${mark(22)}</div></div><figcaption>Citation 1080 × 1080</figcaption></figure>
    <figure class="avatars"><div class="av">${markW(70)}</div><div class="profile"><b>lbv_production</b><span>Label indépendant · Libreville, Gabon</span><span class="cendre">Talent · Son · Scène</span></div><figcaption>Profil</figcaption></figure>
  </div>` });

page({ ch: 'app', title: 'Pochettes de single', body: `
  <div class="grid3 sleeves">
    <figure><div class="sleeve"><img src="img/carty.jpg" alt="" style="object-position:58% 40%;filter:contrast(1.1) saturate(.8) brightness(.8)"><div class="sl-title">CARTY</div><div class="sl-sub">Nouvelle ère</div><div class="sl-mark">${mark(26)}</div></div><figcaption>Portrait, titre en capitales</figcaption></figure>
    <figure><div class="sleeve red"><div class="sl-big">Money<br><em>Dance</em></div><div class="sl-sub dark">Le T</div><div class="sl-mark">${mark(26, C.noir)}</div></div><figcaption>Aplat Oxblood, un mot en os</figcaption></figure>
    <figure><div class="sleeve"><img src="img/lunxy.jpg" alt="" style="object-position:50% 20%;filter:contrast(1.1) brightness(.75)"><div class="sl-fire"></div><div class="sl-title low">LUNXY</div><div class="sl-sub low">Nuit 01</div><div class="sl-mark">${mark(26, C.braise)}</div></div><figcaption>Photo de scène, tampon braise</figcaption></figure>
  </div>
  <p class="small wide">Gabarits de principe : titres et visuels fictifs composés à partir des photos du label. Chaque artiste garde la liberté de sa pochette dans ce cadre.</p>` });


page({ ch: 'app', title: 'Écrans : site et YouTube', body: `
  <div class="screens">
    <figure class="site"><div class="browser"><div class="b-bar"><i></i><i></i><i></i><span>lbvproduction.com</span></div><img src="img/site-hero.jpg" alt="Accueil du site LBV Production"></div><figcaption><b>Site</b> Noir, portrait assombri, logo en volume chrome rouge, grand titre en os.</figcaption></figure>
    <figure class="yt"><div class="banner"><img src="img/feu.jpg" alt="" class="banner-fire"><div class="safe"><span class="safe-lbl">Zone visible sur tous les écrans · 1546 × 423</span>${lockup(58)}<span class="banner-line">Libreville a une <em>voix.</em></span></div></div><figcaption><b>Bannière YouTube</b> 2560 × 1440 px. Tout le contenu dans la zone centrale.</figcaption></figure>
  </div>` });

/* ================= 09 FICHIERS ================= */
page({ ch: 'fichiers', title: 'Fichiers livrés et contacts', body: `
  <div class="two top">
    <table class="files">
      <tr><td><code>lbv-logo-os.svg</code></td><td>Logo principal, fonds sombres</td></tr>
      <tr><td><code>lbv-logo-noir.svg</code></td><td>Logo inversé, fonds clairs</td></tr>
      <tr><td><code>lbv-logo-braise.svg</code></td><td>Signature événementielle</td></tr>
      <tr><td><code>lbv-logo-oxblood.svg</code></td><td>Papeterie, gaufrage</td></tr>
      <tr><td><code>lbv-symbole-os.svg</code> · <code>-noir</code> · <code>-braise</code></td><td>Symbole seul</td></tr>
      <tr><td><code>lbv-avatar-noir.svg</code></td><td>Avatar carré des réseaux</td></tr>
      <tr><td><code>lbv-geometry.json</code></td><td>Tracés et mesures du logo</td></tr>
    </table>
    <div>
      <p>Les fichiers vectoriels se trouvent dans le dossier <code>brand/</code> du projet. Ils sont tracés à partir du logo officiel en haute définition. Pour un PNG, exporter depuis le SVG à la taille voulue, jamais agrandir un PNG existant.</p>
      <h3>Contact de la marque</h3>
      <p>LBV Production<br>Cité Magnolia, Villa 163, Akanda, Libreville, Gabon<br>contact@lbvproduction.com · +241 077 04 75 64<br>Instagram @lbv_production · YouTube @LBVProduction-241</p>
      <p class="small">Toute application non prévue dans ce document est soumise à la validation du label avant diffusion.</p>
    </div>
  </div>` });

/* Dos */
page({ cls: 'back-cover', bare: true, body: `
  <img class="back-fire" src="img/feu.jpg" alt="">
  <div class="back-inner">${mark(120)}<p class="cover-line">Ça va sonner <em>différent.</em></p><span>© LBV Production 2026 · Charte graphique, édition 01</span></div>` });

/* ---------- Assemblage ---------- */
const TOTAL = pages.length;
const pad2 = (n) => String(n).padStart(2, '0');
const firstPage = {};
pages.forEach((p, i) => { if (p.ch && !(p.ch in firstPage)) firstPage[p.ch] = i + 1; });
const toc = `<ol class="toc">${Object.entries(CH).map(([k, [n, t]]) => `<li><span class="toc-n">${n}</span><span class="toc-t">${t}</span><span class="toc-p">${pad2(firstPage[k])}</span></li>`).join('')}</ol>`;
const html = pages.map((p, i) => {
  const num = pad2(i + 1);
  const body = p.body.replace('%%TOC%%', toc);
  if (p.bare) return `<section class="sheet"><div class="page ${p.cls}">${body}${p.cls === 'divider' ? `<footer><span>LBV Production · Charte graphique</span><span class="pnum">${num} / ${TOTAL}</span></footer>` : ''}</div></section>`;
  const head = p.ch ? `<span><b>${CH[p.ch][0]}</b> ${CH[p.ch][1]}</span>` : '<span>LBV Production</span>';
  return `<section class="sheet"><div class="page ${p.cls}"><header>${head}<span>Charte graphique · 2026</span></header><h2 class="title">${p.title}</h2><div class="body">${body}</div><footer><span>LBV Production · Charte graphique</span><span class="pnum">${num} / ${TOTAL}</span></footer></div></section>`;
}).join('\n');

const css = readFileSync('tools/charte.css', 'utf8');
const out = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Charte graphique LBV Production</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Stack+Sans+Headline:wght@200;300;400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
${svgDefs}
<main class="deck">
${html}
</main>
<script>
(function () {
  var fit = function () { var w = Math.min(1200, document.documentElement.clientWidth - 32); document.documentElement.style.setProperty('--k', (w / 1200).toFixed(4)); };
  fit(); window.addEventListener('resize', fit);
  window.addEventListener('beforeprint', function () { document.documentElement.style.setProperty('--k', '1'); });
  window.addEventListener('afterprint', fit);
})();
</script>
</body>
</html>
`;
mkdirSync('charte', { recursive: true });
writeFileSync('charte/index.html', out);
console.log('pages :', TOTAL, '→ charte/index.html');

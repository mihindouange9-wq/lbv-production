/* Génère index.html et js/data.js à partir de content/content.json (source unique, éditée par l'espace admin).
   node tools/build-content.mjs            → écrit index.html et js/data.js
   node tools/build-content.mjs --template → fabrique templates/page.html depuis index.html (opération unique) */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'templates/page.html');
const content = JSON.parse(readFileSync(join(ROOT, 'content/content.json'), 'utf8'));

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const dateFr = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : String(iso || ''); };
const framingStyle = (f) => (f ? ` style="object-position:${f.position};--z:${f.zoom};transform-origin:${f.origin}"` : '');
const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));
const abs = (p) => (/^https?:/.test(p) ? p : content.site.url.replace(/\/$/, '') + '/' + p);

/** Chaque fragment est le HTML exact d'une zone de la page. */
export function fragments(c) {
  const s = c.site, h = c.hero, k = c.contact, soc = k.socials;
  const ldJson = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'LBV Production', url: s.url, logo: 'images/lbv-symbole-512.png', description: s.ogDescription, address: { '@type': 'PostalAddress', streetAddress: k.address[0], addressLocality: 'Akanda', addressRegion: 'Libreville', addressCountry: 'GA' }, telephone: k.phone.replace(/\s/g, ''), email: k.email, sameAs: [soc.instagram, soc.youtube, soc.facebook, soc.x].filter(Boolean) });
  const news = [...c.news.items].sort(byDateDesc);
  const releases = [...c.releases.cards].sort(byDateDesc);
  return {
    title: `<title>${esc(s.title)}</title>`,
    description: `<meta name="description" content="${esc(s.description)}">`,
    canonical: `<link rel="canonical" href="${esc(s.url)}">`,
    ogTitle: `<meta property="og:title" content="${esc(s.title)}">`,
    ogDescription: `<meta property="og:description" content="${esc(s.ogDescription)}">`,
    ogUrl: `<meta property="og:url" content="${esc(s.url)}">`,
    ogImage: `<meta property="og:image" content="${esc(abs(s.ogImage))}">`,
    twTitle: `<meta name="twitter:title" content="${esc(s.title)}">`,
    twDescription: `<meta name="twitter:description" content="${esc(s.twitterDescription)}">`,
    twImage: `<meta name="twitter:image" content="${esc(abs(s.ogImage))}">`,
    ldJson: `<script type="application/ld+json">\n  ${ldJson}\n  </script>`,
    menuSocials: `<span class="menu-socials">
          <a href="${esc(soc.instagram)}" target="_blank" rel="noopener">INSTAGRAM</a>
          <a href="${esc(soc.youtube)}" target="_blank" rel="noopener">YOUTUBE</a>
          <a href="${esc(soc.facebook)}" target="_blank" rel="noopener">FACEBOOK</a>
          <a href="${esc(soc.x)}" target="_blank" rel="noopener" class="link-x">X</a>
        </span>`,
    navSocials: `<ul>
      <li><a class="active-animate" href="${esc(soc.instagram)}" target="_blank" rel="noopener">INSTAGRAM</a><div class="nav-cross"><span class="plus-svg"></span></div></li>
      <li><a class="active-animate" href="${esc(soc.youtube)}" target="_blank" rel="noopener">YOUTUBE</a><div class="nav-cross"><span class="plus-svg"></span></div></li>
      <li><a class="active-animate" href="${esc(soc.facebook)}" target="_blank" rel="noopener">FACEBOOK</a><div class="nav-cross"><span class="plus-svg"></span></div></li>
    </ul>`,
    menuMail: `<a href="mailto:${esc(k.email)}?subject=Contact%20LBV%20Production" class="menu-mail-link">${esc(k.email)}</a>`,
    formAction: `action="mailto:${esc(k.email)}"`,
    audio: `<source src="${esc(c.audio.src)}" type="audio/mpeg">`,
    soundLabel: `<div class="sound-label">${esc(c.audio.label)}</div>`,
    heroTags: `<div class="hero-tags">\n${h.tags.map((t) => `      <span>${esc(t)}</span>`).join('\n')}\n    </div>`,
    heroIntro: `<div class="hero-intro">\n      ${esc(h.intro)}<span class="more"> ${esc(h.introMore)}</span>\n    </div>`,
    portrait: `<img class="hero-portrait-img" src="${esc(h.portrait.src)}" alt="${esc(h.portrait.alt)}"${h.portrait.width ? ` width="${h.portrait.width}" height="${h.portrait.height}"` : ''} fetchpriority="high">`,
    h1: `<h1 class="sr-only">${esc(h.h1)}</h1>`,
    rail: `<span class="rail-item">${esc(h.rail)} <span class="accent">${esc(h.railAccent)}</span></span>`,
    aboutTitle: `<h2 class="cinematic-title">${esc(c.about.titleLines[0])} <br> <span class="accent"> ${esc(c.about.titleLines[1])} </span> <br> ${esc(c.about.titleLines[2])}</h2>`,
    aboutText: `<p class="cinematic-text readmore"><span class="space"></span> ${esc(c.about.text)}</p>`,
    facts: c.facts.map((f) => `<div class="facts-box">\n      <p class="numbers-facts">${esc(f.number)}</p>\n      <p class="para-facts">${esc(f.text)}</p>\n    </div>`).join('\n    '),
    labelIntro: `<p class="label-text readmore">${esc(c.label.intro)}</p>`,
    labelHeading: `<div class="label-heading"><div class="breaks">${esc(c.label.heading)}</div></div>`,
    labelThumbs: `<div class="label-thumbs">\n${c.label.thumbs.map((t) => `      <div class="label-thumb ${t.side}"><img src="${esc(t.src)}"${framingStyle(t.framing)} alt="${esc(t.alt)}" loading="lazy" decoding="async"></div>`).join('\n')}\n    </div>`,
    labelWords: `<div class="label-words">\n${c.label.words.map((w) => `        <div class="word1">${esc(w)}</div>`).join('\n')}\n      </div>`,
    labelLists: `<div class="label-lists">\n${c.label.lists.map((l, i) => `      <div class="label-list set-${i + 1}">\n${l.map((p) => `        <div class="points">${esc(p)}</div>`).join('\n')}\n      </div>`).join('\n')}\n    </div>`,
    panelTitle: `<div class="label-panel-title">${esc(c.label.panelTitle)} <span class="accent">${esc(c.label.panelAccent)}</span> ${esc(c.label.panelTitleEnd)}</div>`,
    panelPara: `<p class="label-panel-para">${esc(c.label.panelPara)}</p>`,
    panelPhoto: `<div class="label-panel-photo"><img src="${esc(c.label.panelPhoto)}" alt="" loading="lazy" decoding="async"></div>`,
    artistsLegend: `<div class="artists-legend">\n      <h2>${esc(c.artistsSection.title)}</h2>\n      <p>${esc(c.artistsSection.hint)}</p>\n    </div>`,
    artistCards: c.artists.map((a, i) => `<div class="artist-card"${i === 0 ? ' id="step-1"' : ''}><img src="${esc(a.img)}"${framingStyle(a.framing)} alt="${esc(a.alt || a.name)}" loading="lazy" decoding="async"></div>`).join('\n    '),
    methodSteps: `<div class="method-steps">\n${c.method.steps.map((st, i) => `      <div class="method-step${i === 2 ? ' moving-out' : ''}">\n        <h3>${esc(st.title)}</h3>\n        <p class="readmore">${esc(st.text)}</p>\n      </div>`).join('\n')}\n    </div>`,
    methodIntro: `<div class="method-intro readmore">${esc(c.method.intro)}</div>\n    <img src="${esc(c.method.photo)}" alt="" loading="lazy" decoding="async">`,
    methodHeading: `<h2>${esc(c.method.heading)} <span class="accent"> ${esc(c.method.headingAccent)}</span></h2>`,
    releasesHeading: `<p class="blog-heading releases-heading">${esc(c.releases.heading)} <span class="accent">${esc(c.releases.accent)}</span></p>`,
    releasesPara: `<span class="blog-para releases-para readmore">${esc(c.releases.para)}</span>`,
    releaseCards: `<div class="news-cards releases-cards">\n${releases.map((r) => `      <a class="news-card release-card" href="${esc(r.link)}" target="_blank" rel="noopener">\n        <div class="news-image"><img src="${esc(r.cover)}" alt="${esc(r.alt || r.title)}" loading="lazy" decoding="async"><div class="follow-blog"></div></div>\n        <p>${esc(r.title)}${r.artists ? ' · ' + esc(r.artists) : ''}</p>\n        <span>${esc([r.type, r.genre, dateFr(r.date)].filter(Boolean).join(' · '))}</span>\n      </a>`).join('\n')}\n    </div>`,
    releasesMore: `<div class="releases-more">\n${c.releases.more.map((r) => `      <a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}${r.artists ? ' · ' + esc(r.artists) : ''}</a>`).join('\n')}\n    </div>`,
    newsHeading: `<p class="blog-heading">${esc(c.news.heading)} <span class="accent"><span class="accent-off">${esc(c.news.accentOff)}</span> ${esc(c.news.accent)}</span></p>`,
    newsPara: `<span class="blog-para readmore">${esc(c.news.para)}</span>`,
    newsCards: `<div class="news-cards">\n${news.map((n, i) => `      <div class="news-card" data-blog="${i}">\n        <div class="news-image"><img src="${esc(n.img)}" alt="${esc(n.alt || n.title)}" loading="lazy" decoding="async"><div class="follow-blog"></div></div>\n        <p>${esc(n.title)}</p>\n        <span>${esc(dateFr(n.date))}</span>\n      </div>`).join('\n')}\n    </div>`,
    ctaTitle: `<h2 class="cta-title">${esc(c.cta.title)} <span class="accent">${esc(c.cta.accent)}</span></h2>`,
    ctaButton: `${esc(c.cta.button)} <span class="accent">${esc(c.cta.buttonAccent)}</span>`,
    footerInfos: `<div class="footer-infos">
      <div>
        <p class="f-label">LBV PRODUCTION</p>
        <p>${k.address.map(esc).join('<br>')}</p>
      </div>
      <div>
        <p class="f-label">CONTACT</p>
        <p><a href="tel:${esc(k.phone.replace(/\s/g, ''))}">${esc(k.phone)}</a><br><a href="mailto:${esc(k.email)}">${esc(k.email)}</a><br>${esc(k.hours)}</p>
      </div>
      <div>
        <p class="f-label">SUIVRE</p>
        <p><a href="${esc(soc.instagram)}" target="_blank" rel="noopener">Instagram</a> · <a href="${esc(soc.youtube)}" target="_blank" rel="noopener">YouTube</a> · <a href="${esc(soc.facebook)}" target="_blank" rel="noopener">Facebook</a> · <a href="${esc(soc.x)}" target="_blank" rel="noopener" class="link-x">X</a></p>
      </div>
      <div>
        <p class="f-label">© ${esc(c.contact.year)}</p>
        <p>${esc(k.copyright)}<br>${esc(k.copyrightLine2)}</p>
      </div>
    </div>`,
  };
}

/** js/data.js : les données que le moteur d'animation lit (fiches artistes, actualités). */
export function renderData(c) {
  const artists = c.artists.map(({ name, slug, img, short, bio, tags, gallery, links }) => ({ name, slug, img, short, bio, tags, gallery, links }));
  const blogs = [...c.news.items].sort(byDateDesc).map((n) => ({ title: n.title, date: dateFr(n.date), author: n.author, img: n.img, link: n.link, desc: n.desc }));
  return `/* Données LBV Production — générées par tools/build-content.mjs depuis content/content.json. Ne pas modifier à la main. */\nwindow.LBV = ${JSON.stringify({ artists, blogs }, null, 2)};\n`;
}

export function renderPage(c) {
  let html = readFileSync(TEMPLATE, 'utf8');
  for (const [name, frag] of Object.entries(fragments(c))) html = html.split(`<!--@${name}-->`).join(frag);
  const left = html.match(/<!--@[a-zA-Z]+-->/g);
  if (left) throw new Error('marqueurs non remplis : ' + left.join(' '));
  return html;
}

const here = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (here && process.argv.includes('--template')) {
  // Fabrication du gabarit : chaque fragment rendu depuis le contenu actuel est remplacé par son marqueur.
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const frags = fragments(content);
  const missing = [];
  for (const [name, frag] of Object.entries(frags)) {
    if (name === 'ldJson') { html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<!--@ldJson-->'); continue; }
    if (!html.includes(frag)) { missing.push(name); continue; }
    html = html.split(frag).join(`<!--@${name}-->`);
  }
  if (missing.length) { console.error('fragments introuvables dans index.html :', missing.join(', ')); process.exit(1); }
  mkdirSync(dirname(TEMPLATE), { recursive: true });
  writeFileSync(TEMPLATE, html);
  console.log('gabarit écrit :', TEMPLATE);
} else if (here) {
  if (!existsSync(TEMPLATE)) throw new Error('templates/page.html manquant : lancer --template une fois');
  writeFileSync(join(ROOT, 'index.html'), renderPage(content));
  writeFileSync(join(ROOT, 'js/data.js'), renderData(content));
  console.log('index.html et js/data.js générés depuis content/content.json');
}

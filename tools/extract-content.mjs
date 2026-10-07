/* Extraction unique du contenu de la page vers content/content.json (point de départ de l'espace admin). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const w = {};
vm.runInNewContext(readFileSync(join(ROOT, 'js/data.js'), 'utf8'), { window: w });
const data = w.LBV;

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const toIso = (fr) => { const m = fr.trim().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/); if (!m) return fr; const mo = MOIS.indexOf(m[2].toLowerCase()) + 1; return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
const one = (re) => { const m = html.match(re); if (!m) throw new Error('introuvable : ' + re); return m[1].trim(); };
const all = (re) => [...html.matchAll(re)];
const framing = (style = '') => { const m = style.match(/object-position:([^;]+);--z:([^;]+);transform-origin:([^;"]+)/); return m ? { position: m[1].trim(), zoom: +m[2], origin: m[3].trim() } : { position: '50% 50%', zoom: 1, origin: '50% 50%' }; };

const content = {
  site: {
    title: one(/<title>([^<]+)<\/title>/),
    description: one(/<meta name="description" content="([^"]+)"/),
    url: 'https://lbvproduction.com/',
    ogImage: 'images/og-image.jpg',
  },
  hero: {
    tags: all(/<div class="hero-tags">([\s\S]*?)<\/div>/g)[0][1].match(/<span>([^<]+)<\/span>/g).map((s) => s.replace(/<\/?span>/g, '')),
    intro: one(/<div class="hero-intro">\s*([^<]+)<span class="more">/),
    introMore: one(/<span class="more">\s*([^<]+)<\/span>/),
    portrait: { src: one(/hero-portrait-img" src="([^"]+)"/), alt: one(/hero-portrait-img" src="[^"]+" alt="([^"]+)"/) },
    h1: one(/<h1 class="sr-only">([^<]+)<\/h1>/),
    rail: 'Libreville a une',
    railAccent: 'voix.',
  },
  about: {
    titleLines: ['Ça va', 'Sonner', 'Différent'],
    text: one(/<p class="cinematic-text readmore"><span class="space"><\/span>\s*([^<]+)<\/p>/),
  },
  facts: all(/<p class="numbers-facts">([^<]+)<\/p>\s*<p class="para-facts">([^<]+)<\/p>/g).map((m) => ({ number: m[1].trim(), text: m[2].trim() })),
  label: {
    intro: one(/<p class="label-text readmore">([^<]+)<\/p>/),
    heading: 'Le Label',
    thumbs: all(/<div class="label-thumb (right1|left1)"><img src="([^"]+)"(?: style="([^"]*)")? alt="([^"]*)"/g).map((m) => ({ side: m[1], src: m[2], alt: m[4], framing: m[3] ? framing(m[3]) : null })),
    words: ['PRODUIRE', 'DIFFUSER'],
    lists: html.slice(html.indexOf('<div class="label-lists">'), html.indexOf('<div class="label-panel">')).split('label-list set-').slice(1).map((chunk) => [...chunk.matchAll(/<div class="points">([^<]+)<\/div>/g)].map((x) => x[1].trim())),
    panelTitle: 'Chaque titre est un',
    panelAccent: 'pas',
    panelTitleEnd: 'de plus.',
    panelPara: one(/<p class="label-panel-para">([^<]+)<\/p>/),
    panelPhoto: one(/<div class="label-panel-photo"><img src="([^"]+)"/),
  },
  artistsSection: { title: one(/<div class="artists-legend">\s*<h2>([^<]+)<\/h2>/), hint: one(/<div class="artists-legend">\s*<h2>[^<]+<\/h2>\s*<p>([^<]+)<\/p>/) },
  artists: data.artists.map((a, i) => {
    const card = all(/<div class="artist-card"(?: id="step-1")?><img src="([^"]+)" style="([^"]*)" alt="([^"]*)"/g)[i];
    return { ...a, framing: framing(card?.[2] ?? '') };
  }),
  method: {
    steps: all(/<div class="method-step(?: moving-out)?">\s*<h3>([^<]+)<\/h3>\s*<p class="readmore">([^<]+)<\/p>/g).map((m) => ({ title: m[1].trim(), text: m[2].trim() })),
    intro: one(/<div class="method-intro readmore">([^<]+)<\/div>/),
    photo: one(/<div class="method-intro readmore">[^<]+<\/div>\s*<img src="([^"]+)"/),
    heading: 'De la première maquette à la scène, chaque étape est pensée pour faire entendre le',
    headingAccent: 'Gabon.',
  },
  releases: {
    heading: 'NOS',
    accent: 'Sorties',
    para: one(/<span class="blog-para releases-para readmore">([^<]+)<\/span>/),
    cards: all(/<a class="news-card release-card" href="([^"]+)"[^>]*>\s*<div class="news-image"><img src="([^"]+)" alt="([^"]*)"[^>]*><div class="follow-blog"><\/div><\/div>\s*<p>([^<]+)<\/p>\s*<span>([^<]+)<\/span>/g).map((m) => {
      const [title, artists] = m[4].split(' · ');
      const [type, genre, date] = m[5].split(' · ');
      return { title: title.trim(), artists: (artists || '').trim(), type: type.trim(), genre: (genre || '').trim(), date: toIso(date || ''), link: m[1], cover: m[2], alt: m[3] };
    }),
    more: all(/<div class="releases-more">([\s\S]*?)<\/div>/g)[0][1].match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g).map((s) => { const m = s.match(/href="([^"]+)"[^>]*>([^<]+)</); const [title, artists] = m[2].split(' · '); return { title: title.trim(), artists: (artists || '').trim(), link: m[1] }; }),
  },
  news: {
    heading: 'ACTUALITÉS',
    accentOff: 'du',
    accent: 'label',
    para: one(/<span class="blog-para readmore">([^<]+)<\/span>/),
    items: data.blogs.map((b) => ({ ...b, date: toIso(b.date) })),
  },
  cta: { title: 'Chaque grand titre commence par une', accent: 'Rencontre.', button: 'PARLONS', buttonAccent: 'Musique' },
  contact: {
    address: ['Cité Magnolia (Villa 163)', 'Akanda, Libreville, Gabon'],
    phone: '+241 077 04 75 64',
    email: 'contact@lbvproduction.com',
    hours: 'Lundi – vendredi, 10 h – 19 h',
    copyright: 'LBV Production. Tous droits réservés.',
    copyrightLine2: 'Label indépendant gabonais.',
    socials: { instagram: 'https://www.instagram.com/lbv_production/', youtube: 'https://www.youtube.com/@LBVProduction-241', facebook: 'https://www.facebook.com/people/LBV-Production/61575781109680/', x: 'https://x.com/Lbvproduction1' },
  },
  audio: { src: one(/<source src="([^"]+)" type="audio\/mpeg">/) },
};

mkdirSync(join(ROOT, 'content'), { recursive: true });
writeFileSync(join(ROOT, 'content/content.json'), JSON.stringify(content, null, 2) + '\n');
console.log('content.json :', content.artists.length, 'artistes,', content.releases.cards.length, 'sorties +', content.releases.more.length, ',', content.news.items.length, 'actualités,', content.label.thumbs.length, 'visuels Label,', content.facts.length, 'chiffres,', content.method.steps.length, 'étapes');

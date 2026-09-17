/* Renommage des classes CSS pour un vocabulaire cohérent (une passe, vérifiable).
   Remplace des jetons complets dans index.html, css/style.css et js/*.js.
   node tools/rename-classes.mjs [--verifier] */
import { readFileSync, writeFileSync } from 'node:fs';

const MAP = {
  // calques et repères
  'roman-statue-viewer': 'logo-stage',
  'site-pre-loader': 'loader',
  'sound-follow': 'loader-hint',
  'number-count': 'loader-counter',
  'fixed-bar-ledger': 'ledger',
  'Name-plus': 'ledger-label',
  'plus-rotate': 'ledger-cross',
  'plus-rotates': 'menu-cross',
  'plus-for-hover': 'nav-cross',
  'circle-follow-view': 'cursor-view',
  'scrolling-text': 'marquee',
  'logo-3d': 'brand-link',
  // accueil
  'my-face-animate': 'hero-portrait',
  'face-image': 'hero-portrait-img',
  'para-introduce-hero': 'hero-intro',
  'expertise-text': 'hero-tags',
  // le label
  'services-project': 'label-section',
  'services-change-1': 'label-words',
  'services-heading': 'label-heading',
  'services-char': 'label-char',
  'services-text': 'label-text',
  'services-para': 'label-para',
  'pictures-services': 'label-thumbs',
  'uiux': 'label-thumb',
  'svg-strokee': 'label-lines',
  'scroll-downn': 'label-center',
  'another-fall': 'label-panel',
  'men-fall': 'label-panel-photo',
  'content-section-fall': 'label-panel-text',
  'heading-fall': 'label-panel-title',
  'fall-para': 'label-panel-para',
  'expertise-wrapper': 'label-lists',
  'expertise-set': 'label-list',
  // artistes
  'step': 'artist-card',
  'step-media': 'artist-thumb',
  'step-caption': 'artist-name',
  'steps-overlay-bg-change': 'artists-backdrop',
  'text-chnage-on-steps': 'artists-legend',
  'time-steps-slider': 'artists-progress',
  'circle-steps': 'progress-ring',
  'case-study-side-bar': 'artist-panel',
  // méthode
  'step-of-work': 'method-section',
  'heading-of-step-work': 'method-heading',
  'para-for-stepss': 'method-intro',
  'boxes-for-step': 'method-steps',
  'box-step-main': 'method-step',
  // sorties et actualités
  'card-1': 'news-card',
  'cards-blogs': 'news-cards',
  'cards-releases': 'releases-cards',
  'blogs-main-headings': 'section-headings',
  'image-blog': 'news-image',
  'content-blogs': 'news-modal-text',
  'Date-blog': 'news-modal-date',
  'by-who': 'news-modal-link',
  // menu et formulaire
  'gapss': 'menu-socials',
  'gapss-1': 'menu-mail',
  'mailss': 'menu-mail-link',
  // mot d'accent (charte : un seul mot en braise par titre)
  'fonts': 'accent',
  'fancy': 'accent',
  'fonts-c': 'accent',
  'fonts-change': 'accent',
  'os-word': 'accent-off',
};

const FILES = ['index.html', 'css/style.css', 'js/main.js', 'js/fire.js', 'js/logo3d.js'];
const verify = process.argv.includes('--verifier');
const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
let changes = 0, left = [];
for (const f of FILES) {
  let s = readFileSync(f, 'utf8');
  if (verify) {
    for (const k of keys) { const re = new RegExp('(^|[^\\w-])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\w-])', 'g'); const n = (s.match(re) || []).length; if (n) left.push(`${f} : ${k} × ${n}`); }
    continue;
  }
  for (const k of keys) {
    const re = new RegExp('(^|[^\\w-])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\w-])', 'g');
    s = s.replace(re, (m, a, b) => { changes++; return a + MAP[k] + b; });
  }
  writeFileSync(f, s);
}
if (verify) console.log(left.length ? 'restes :\n' + left.join('\n') : 'aucun ancien nom de classe ne subsiste');
else console.log('remplacements :', changes);

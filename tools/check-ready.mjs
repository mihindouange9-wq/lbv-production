/* Contrôle de mise en ligne : fichiers référencés présents, métadonnées, formulaire, liens externes, accessibilité de base.
   node tools/check-ready.mjs [dossier=.] */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const html = readFileSync(join(root, 'index.html'), 'utf8');
const ok = [], ko = [], warn = [];
const say = (list, msg) => list.push(msg);

/* 1. Fichiers référencés */
const refs = [...html.matchAll(/(?:src|href)="((?!https?:|mailto:|tel:|data:|#)[^"]+)"/g)].map((m) => m[1]);
const dataRefs = [...readFileSync(join(root, 'js/data.js'), 'utf8').matchAll(/'((?:images|audio)\/[^']+)'/g)].map((m) => m[1]);
const missing = [...new Set([...refs, ...dataRefs])].filter((f) => !existsSync(join(root, f)));
missing.length ? say(ko, 'fichiers référencés absents : ' + missing.join(', ')) : say(ok, `${new Set([...refs, ...dataRefs]).size} fichiers référencés, tous présents`);

/* 2. Métadonnées */
const meta = {
  'titre': /<title>[^<]{10,70}<\/title>/,
  'description': /name="description" content="[^"]{60,170}"/,
  'canonique': /rel="canonical" href="https:/,
  'image de partage absolue': /property="og:image" content="https:/,
  'carte Twitter': /name="twitter:card"/,
  'langue': /<html lang="fr"/,
  'favicon': /rel="icon"/,
  'données structurées': /application\/ld\+json/,
};
for (const [k, re] of Object.entries(meta)) (re.test(html) ? say(ok, 'métadonnée présente : ' + k) : say(ko, 'métadonnée manquante : ' + k));

/* 3. Formulaire */
const form = html.match(/<form[\s\S]*?<\/form>/);
if (!form) say(ko, 'aucun formulaire trouvé');
else {
  const f = form[0];
  /data-netlify="true"/.test(f) ? say(ok, 'formulaire prêt pour Netlify Forms') : say(ko, 'formulaire sans data-netlify');
  /netlify-honeypot/.test(f) ? say(ok, 'piège à robots en place') : say(warn, 'pas de piège à robots sur le formulaire');
  /name="contact"/.test(f) ? say(ok, 'formulaire nommé (contact)') : say(ko, 'formulaire sans attribut name');
  const fields = [...f.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
  say(ok, 'champs du formulaire : ' + fields.join(', '));
  /required/.test(f) ? say(ok, 'champs obligatoires déclarés') : say(warn, 'aucun champ obligatoire');
}

/* 4. Images et accessibilité */
const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
const noAlt = imgs.filter((i) => !/alt=/.test(i));
noAlt.length ? say(ko, noAlt.length + ' images sans attribut alt') : say(ok, imgs.length + ' images, toutes avec un attribut alt');
const lazy = imgs.filter((i) => /loading="lazy"/.test(i)).length;
say(ok, lazy + ' images en chargement différé');
/aria-label/.test(html) ? say(ok, 'libellés aria présents sur les boutons') : say(warn, 'pas de libellé aria');
(html.match(/<h1/g) || []).length === 1 ? say(ok, 'un seul titre de niveau 1') : say(ko, (html.match(/<h1/g) || []).length + ' titres de niveau 1');

/* 5. Poids livré */
const weigh = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? weigh(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
for (const d of ['images', 'js', 'css', 'audio']) if (existsSync(join(root, d))) { const mo = weigh(join(root, d)) / 1048576; say(mo > 4 ? warn : ok, `${d} : ${mo.toFixed(1)} Mo`); }

/* 6. Fichiers de déploiement */
for (const f of ['robots.txt', 'sitemap.xml', 'netlify.toml']) existsSync(join(root, f)) ? say(ok, f + ' présent') : say(warn, f + ' absent');

/* 7. Liens externes déclarés */
const ext = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))].filter((u) => !u.includes('fonts.googleapis') && !u.includes('gstatic') && !u.includes('schema.org') && !u.includes('lbvproduction.com'));
say(ok, 'liens externes : ' + ext.length);
const noRel = [...html.matchAll(/<a[^>]*href="https?:\/\/[^"]*"[^>]*>/g)].filter((a) => !/rel="noopener/.test(a[0]) && !/rel='noopener/.test(a[0]));
noRel.length ? say(warn, noRel.length + ' liens externes sans rel="noopener"') : say(ok, 'tous les liens externes ont rel="noopener"');

console.log('\n✔ CONFORME');
ok.forEach((m) => console.log('  ·', m));
if (warn.length) { console.log('\n▲ À SURVEILLER'); warn.forEach((m) => console.log('  ·', m)); }
if (ko.length) { console.log('\n✘ À CORRIGER'); ko.forEach((m) => console.log('  ·', m)); }
console.log('\nrésultat :', ko.length ? 'corrections nécessaires' : 'prêt à publier' + (warn.length ? ' (points à surveiller)' : ''));
console.log('liens externes déclarés :'); ext.forEach((u) => console.log('  ', u));

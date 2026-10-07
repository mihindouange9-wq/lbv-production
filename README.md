# LBV Production — site officiel

Site du label indépendant gabonais LBV Production (Akanda, Libreville) : accueil, présentation du label, chiffres, prestations, artistes, méthode, sorties, actualités, contact.

Page unique en HTML, CSS et JavaScript, sans framework ni étape de compilation. Les animations reposent sur GSAP (ScrollTrigger, SplitText, Flip), Lenis pour le défilement doux, three.js pour le feu et le symbole en volume.

## Espace de pilotage

`admin/` : interface de mise à jour du contenu (textes, images, son, artistes, sorties, actualités) qui publie
directement sur GitHub ; Render reconstruit le site. Source du contenu : `content/content.json` ; gabarit de la page :
`templates/page.html` ; génération : `node tools/build-content.mjs`. Détails dans `DEPLOIEMENT.md`.

## Dossier

```
lbv-production/
  index.html          La page : accueil, label, chiffres, prestations, artistes, méthode, sorties, actualités, appel, pied de page
  css/style.css       Feuille de style unique (jetons de la charte, mise en page, responsive)
  js/data.js          Données éditoriales : artistes, sorties, actualités
  js/main.js          Moteur d'animation et interactions
  js/fire.js          Flammes en shader (qualité adaptée à l'appareil)
  js/logo3d.js        Symbole LBV extrudé en volume (ordinateur)
  js/logo-shape.js    Contours du symbole, générés hors ligne
  images/             Visuels publiés (photos d'artistes, pochettes, symbole, icônes, image de partage)
  audio/              Extrait « Amiricher » de Le T, musique de fond
  source/             Visuels d'archive et sources haute définition, non publiés
  brand/              Fichiers de marque : logo et symbole en SVG, géométrie du logo
  charte/             Charte graphique (26 planches) et son PDF
  tools/              Scripts de génération, de mesure et de vérification
  robots.txt · sitemap.xml · netlify.toml
```

## Charte graphique

La charte fait foi pour toute évolution : `charte/index.html` (26 planches, générées par `tools/build-charte.mjs`).

Repères principaux : noir Akanda `#0A0A0A` dominant, os `#E7E3DA` pour le texte, oxblood `#7A0A0A` comme couleur de marque, braise `#D8261E` en accent (un seul mot par titre, à la graisse du titre). Stack Sans Headline pour la voix, Bebas Neue pour les chiffres. Photos en couleur, étalonnées sombres. Capitales réservées aux titres de trois mots au plus et aux libellés.

## Développement

Aucune installation : ouvrir `index.html`. Les scripts de vérification pilotent Chrome en mode headless.

```bash
node tools/audit.mjs 1440 900            # console, images, ancres, doublons d'id, débordements
node tools/audit.mjs 390 844 mobile
node tools/filmstrip.mjs 390 844 0.9 tools/shots/m 1   # planche-contact de toute la page
node tools/perf-scroll.mjs 1440 900      # fluidité du défilement (ordinateur)
node tools/perf-mobile.mjs 4 390 844     # fluidité avec processeur ralenti (téléphone)
node tools/perf-profile.mjs 1440 900     # profil processeur du premier défilement
node tools/check-network.mjs             # requêtes en échec
```

Génération des visuels et de la marque :

```bash
node tools/trace-brand.mjs        # vectorise le logo → brand/*.svg + brand/lbv-geometry.json
node tools/brand-to-3d.mjs        # contours du symbole pour le volume → js/logo-shape.js
node tools/brand-exports.mjs      # favicon, icône 180 px, logo 512 px, image de partage
node tools/optimize-images.mjs    # allège images/ et déplace les visuels non utilisés dans source/
node tools/charte-assets.mjs && node tools/build-charte.mjs && node tools/pdf-charte.mjs
```

## Performance

Le coût est concentré dans trois calques : le feu (shader), le symbole en volume et le fluide qui suit la souris. Règles tenues :

- Les shaders sont compilés au chargement, pendant le préchargeur. Compilés à l'entrée de la section, ils bloquaient le fil principal près de deux secondes.
- Coût mesuré de ce choix, processeur quatre fois ralenti : environ 30 images par seconde sur téléphone avec tous les effets, contre 58 avec la version simplifiée. Sur un téléphone récent non bridé, la différence ne se voit pas ; sur un appareil d'entrée de gamme, elle se sent.
- Le feu s'adapte : quatre octaves de bruit et 24 images par seconde sur téléphone, cinq octaves et 30 sur ordinateur, résolution réduite dans les deux cas, rendu seulement quand il est à l'écran.
- Le téléphone reçoit les mêmes effets que l'ordinateur (séquence épinglée du Label, pile d'artistes, fluide, feu, logo en volume) : seules les tailles changent. Ce qui est allégé est invisible à l'œil : GSAP cadencé à 45 images par seconde, rappels de ScrollTrigger limités, fluide rendu à 40 % puis agrandi, feu à 20 images par seconde et à 26 % de résolution, volume plafonné à 30 images par seconde.
- Aucun calque fixe plein écran avec fusion ou filtre : il force le repaint de tout l'écran à chaque image.

## Déploiement

`node tools/export-netlify.mjs` (Netlify) ou `tools/build-dist.mjs` → `dist/` (Render, voir `render.yaml`) ; marche à suivre dans `DEPLOIEMENT.md`
<!-- -->` ` produit `../lbv-production-netlify/`, à déposer sur l'hébergeur. Le formulaire de contact est prêt pour Netlify Forms ; hors Netlify, il ouvre le client de messagerie. La charte, les sources et les outils ne sont pas exportés.

## Contenu

Textes, artistes, sorties, actualités et coordonnées viennent du label. Les bios de D.O.M et Lunxy ont été rédigées faute de texte fourni : à valider. Polices Stack Sans Headline et Bebas Neue (Google Fonts, licence SIL Open Font License 1.1).

# LBV Production — site immersif

Refonte du site du label gabonais LBV Production (lbvproduction.com), construite en reprenant **dans les moindres détails la structure et les animations de meermohsin.me** (site de référence), avec les contenus réels du label.

## Dossier

```
lbv-production/
  index.html          Page unique : hero, le label, chiffres, services, artistes, méthode, sorties, actualités, appel, pied de page
  css/style.css       Styles portés de la référence (mêmes classes, mêmes valeurs), adaptés au label
  js/data.js          Données : 6 artistes (bios, liens, galeries), 3 actualités
  js/fire.js          Flammes en shader (sections chiffres)
  js/logo3d.js        Logo LBV extrudé en 3D (remplace la statue GLB de la référence), js/logo-shape.js = contours précalculés
  js/main.js          Moteur d'animation (port du code de la référence, GSAP 3.13 + ScrollTrigger + SplitText + Flip, Lenis, three.js r128, webgl-fluid)
  images/             56 visuels du label (photos d'artistes, covers, clips, logo), redimensionnés à 1600 px max
  audio/              Extrait exclusif « Amiricher » de Le T (musique de fond, tel que proposé sur le site actuel)
  tools/              Vérification (captures Chrome headless), redimensionnement d'images, export Netlify, liste de fichiers
  research/           Analyse des deux sites : captures, DOM, données Supabase, code de la référence (non déployé)
  netlify.toml        En-têtes de cache
```

Déploiement : `node tools/export-netlify.mjs` produit `../lbv-production-netlify/` à glisser-déposer sur Netlify. Le formulaire de contact est prêt pour Netlify Forms (`data-netlify`) ; hors Netlify, il ouvre le client mail.

## Animations reproduites (référence → LBV)

| Référence | Reproduction |
|---|---|
| Préchargeur : plan rouge dissous par bruit de Perlin (shader three.js), compteur 000→100 en Ruthie, « click anywhere » | Identique, texte en français, musique de fond = exclu Le T |
| Fluide WebGL plein écran qui suit la souris | `webgl-fluid` avec la configuration exacte de la référence (SIM 48, DYE 384, dissipation 5.5/3.8, curl 1.2, splat .035/1700) |
| Hero : portrait révélé (brightness/scale), rail géant qui monte, lignes en blur, dégradé rouge, barre du bas avec croix qui tournent au défilement | Identique avec le portrait de Dac-M, « Libreville a une voix. », TALENT · SON · SCÈNE |
| Nav en lettres qui se cachent à la descente et reviennent à la montée ; bouton flottant magnétique qui se cache | Identique (WhatsApp du label) |
| Titre cinématique lettres aléatoires, texte mots aléatoires flous | « Ça va Sonner Différent » + mission du label |
| Chiffres avec feu (GIF de flammes rouges sur noir, retourné en haut de section) | Flammes en shader WebGL (`js/fire.js` : bruit fractal animé, langues distinctes, dégradé noir → rouge → orange), retournées en haut, droites en bas, rendues seulement à l'écran ; 3 chiffres du label |
| « LEGACY » : titre déplacé (Flip), lettres qui grossissent puis montent, section épinglée 690 %, lignes SVG tracées, images révélées par clip + parallaxe, mots et listes, panneau noir qui monte, papier déchiré, silhouette | « Le Label » : identique, PRODUIRE / DIFFUSER, prestations, panneau rouge déchiré (CSS clip-path) avec photo d'artiste traitée |
| Portfolio épinglé : pile de vignettes, fond flou, titre/desc mot à mot, cercle de progression, « VIEW », sidebar clip-path avec galerie, tags, rôles | Artistes : 6 fiches (photo, bio, tags, sorties, liens plateformes) |
| Processus : fond en parallaxe, 4 boîtes mot à mot, grand titre | Signature → Direction artistique → Production → Sortie et promotion |
| Journal : titre mots flous, 3 cartes, carte centrale décalée, modale rotative clip-path | Sorties (Spotify) + Actualités (modale, lien YouTube) |
| Appel final lettres 3D, bouton anneau, modale contact | « Chaque grand titre commence par une Rencontre. » / « Parlons Musique » |
| Statue 3D (GLB) en calque fixe au-dessus du hero, entrée par les côtés, suivi de la souris, culbute et rotation au scroll, éloignement à la section services | **Logo LBV en 3D** : le PNG du logo est vectorisé (marching squares, `tools/trace-logo.mjs` → `js/logo-shape.js`) puis extrudé avec biseau fin dans three.js, matériau métallique rouge (metalness 1, reflets d'un studio virtuel en carte d'environnement, tone mapping ACES) ; mêmes lumières, mêmes mouvements (`js/logo3d.js`) |
| Menu à 5 barres, liens en masque, curseur personnalisé, logo 3D qui tourne | Identique, logo LBV |

Sur mobile : fluide, curseur, inclinaison et magnétisme désactivés ; sections épinglées conservées ; `prefers-reduced-motion` coupe préchargeur et fluide.

## Données et médias

- Textes, artistes, sorties, actualités et coordonnées proviennent du site actuel (base publique du site, septembre 2026). Bios de D.O.M et Lunxy complétées sobrement (la base n'en contient presque pas) : à valider.
- Visuels : photos et covers du label. La photo de hero (Dac-M) pèse 10 Mo à l'origine, redimensionnée à 1600 px.
- Polices : Stack Sans Headline, Ruthie, Bebas Neue (Google Fonts), équivalentes à celles de la référence.
- Ce qui ne vient pas de la référence : ses visuels (logo tribal, GIF de feu, papier, statue) ont été remplacés par des équivalents générés ou par les visuels LBV.

## Vérifier

```bash
node tools/cdp-shoot.mjs index.html 1440 900 desktop      # planche-contact au défilement (attend le préchargeur)
node tools/cdp-shoot.mjs index.html 390 844 mobile mobile
node tools/cdp-frame.mjs index.html 2500 tools/shots/menu.png ".menu-2-bar"   # capture après un clic
```

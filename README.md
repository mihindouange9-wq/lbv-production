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

## Direction « dark et select » (17 septembre 2026)

Sur demande du client (site trop chargé sur téléphone, rendu à débarrasser de ses tics de site généré, ambiance sombre et premium façon Rick Owens) :

- Palette : noir profond `#0a0a0a`, os `#e7e3da`, charbon ; un seul accent oxblood `#7a0a0a` (préchargeur, sélection), jamais en aplat. Plus de sections rouge vif, plus de cursive Ruthie : capitales grotesques en Stack Sans Headline, Bebas Neue pour les grands chiffres.
- Photos en monochrome, couleur au survol. Coins nets, filets fins, aucune lueur, aucun dégradé animé, aucun anneau qui tourne, aucun flou sur les apparitions.
- Téléphone : textes courts par défaut avec « Lire la suite » (classe `readmore`, bouton posé par `js/main.js`), section Le Label statique (titre, phrase, quatre visuels, deux listes), calque 3D désactivé, hauteurs réduites.
- Fluidité : Lenis `lerp 0.075`, `lagSmoothing(0)`, scrubs plus longs (1 à 1,2), courbes `expo.out`, révélations jouées une fois.
- Feu (`js/fire.js`) : densité en bruit fractal à sept octaves doublement déformé, couleur par température (noir → rouge → orange → jaune → blanc), lueur, fumée, braises, distorsion de chaleur, grain.
- Logo 3D : chrome rouge profond, reflets d'un studio monochrome.

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

## Charte graphique (17 septembre 2026)

Charte complète en 45 planches 16:9 : univers et plateforme de marque, logo (anatomie, construction en unité X, zone de protection, tailles minimales, versions, symbole seul, logo sur image, interdits, co-signature), couleur (dominante, palette HEX / RVB / CMJN, neutres et couleurs d'ambiance, contrastes WCAG), typographie (Stack Sans Headline, Bebas Neue, hiérarchie, règles), image (étalonnage, portraits carrés, pochettes), signes et mouvement, voix, applications (réseaux, pochettes, LBV Show, merch, papeterie, écrans), fichiers.

```bash
node tools/trace-brand.mjs     # vectorise le logo 1080 px → brand/*.svg + brand/lbv-geometry.json
node tools/charte-assets.mjs   # visuels allégés → charte/img/
node tools/build-charte.mjs    # → charte/index.html (mise en page : tools/charte.css)
node tools/pdf-charte.mjs      # → charte/LBV_Production_Charte_Graphique.pdf (non versionné, 28 Mo)
node tools/charte-shots.mjs 1  # captures de relecture → tools/shots/charte/
```

Fichiers de marque livrés dans `brand/` : logo os, noir, braise, oxblood ; symbole os, noir, braise ; avatar carré. La charte n'est pas exportée avec le site (`tools/export-netlify.mjs`).

### Site conforme à la charte

- Symbole vectoriel (`#lbv-mark`, défini une fois en haut de `index.html`) dans l'en-tête et le bouton WhatsApp ; plus de PNG de logo ni de carte qui tourne. Favicon, icône 180 px, logo 512 px et image de partage générés par `node tools/brand-exports.mjs`.
- Logo en volume : contours issus du tracé HD (`node tools/brand-to-3d.mjs` → `js/logo-shape.js`).
- Palette réduite aux couleurs de la charte (jetons dans `css/style.css`), préchargeur en oxblood exact, grain à 6 %.
- Typographie : phrases longues en casse normale, graisses légères, un seul mot en braise par titre, même graisse que le titre.
- Mouvement : plus de rebond, de flou d'apparition, de clignotement ni de rotation continue ; révélation du pied de page jouée une fois.

### Performance du défilement

`node tools/perf-scroll.mjs [largeur] [hauteur]` mesure les images par seconde pendant un défilement simulé (première passe et passe chaude) ; `node tools/perf-profile.mjs` donne le profil processeur de la première passe.

Ce qui a été corrigé le 17 septembre 2026 : le shader du feu se compilait au moment où la section entrait à l'écran et bloquait le fil principal environ 1,9 s (image la plus longue mesurée : 1 900 ms). La compilation est faite au chargement dans `js/fire.js` (`rend.compile` + une première image), pendant le préchargeur : la première passe de défilement passe d'environ 21 à 47 images par seconde et la pire image à 100 ms. Le calque de grain plein écran a été retiré (un calque fixe force le repaint de tout l'écran à chaque image).

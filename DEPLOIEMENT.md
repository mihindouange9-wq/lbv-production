# Mettre le site en ligne

Document de référence pour publier le site LBV Production. Deux hébergeurs sont préparés : **Render** (déploiement
automatique depuis GitHub, retenu) et Netlify (dépôt manuel d'un dossier, conservé en solution de repli).

## Render : mise en ligne depuis GitHub

Le dépôt contient `render.yaml` : Render y lit tout (commande de build `node tools/build-dist.mjs`, dossier publié
`dist/`, en-têtes de sécurité et de cache). Rien à configurer à la main.

### Première mise en ligne

1. Pousser le dépôt sur GitHub (compte `mihindouange9-wq`, dépôt `lbv-production`, branche `main`).
2. Sur **dashboard.render.com** : **New → Blueprint**, choisir le dépôt `lbv-production`, valider. Render crée le site
   statique `lbv-production` et lance le premier build (une minute environ).
3. Le site est en ligne sur une adresse en `.onrender.com`. Plan gratuit : les sites statiques ne se mettent pas en
   veille, contrairement aux services Node.

### Mettre à jour

`git push` sur `main` : Render reconstruit et publie. Onglet **Events** du site pour suivre ; **Rollback** sur un
déploiement précédent pour revenir en arrière en une action.

### Nom de domaine

**Settings → Custom Domains → Add** : saisir `lbvproduction.com` et `www.lbvproduction.com`. Render indique les
enregistrements DNS à créer chez le registraire (`A` vers son adresse pour la racine, `CNAME` pour `www`). Le
certificat HTTPS est automatique une fois la propagation faite. Le site déclare déjà `https://lbvproduction.com/`
comme adresse de référence (lien canonique, plan de site, métadonnées de partage).

### Formulaire de contact sur Render

Render n'héberge pas de formulaires. Le formulaire est prêt pour un service d'envoi : créer un formulaire sur
**formspree.io** (gratuit jusqu'à 50 messages par mois), copier son adresse (`https://formspree.io/f/xxxxxxxx`) et
la coller dans l'attribut `data-endpoint` du formulaire, dans `index.html` (ligne `<form name="contact" …>`).
Tant que cet attribut est vide, le bouton **Envoyer** ouvre la messagerie du visiteur avec le message pré-rempli :
rien n'est perdu, mais l'envoi dépend alors de son logiciel de messagerie.

### Vérifier le build en local

```bash
node tools/build-dist.mjs      # assemble dist/, exactement ce que Render publie
node tools/check-ready.mjs dist
```

---

## Netlify (solution de repli)

Tout ce qui est à déposer se trouve dans un seul dossier.

## 1. Préparer le dossier à déposer

```bash
cd lbv-production
node tools/export-netlify.mjs
```

La commande crée (ou remplace) le dossier `lbv-production-netlify/`, à côté du dossier de travail. C'est **ce dossier** que l'on dépose sur Netlify, pas le dossier du projet.

Contenu et poids :

| Élément | Poids | Rôle |
|---|---|---|
| `index.html` | 32 Ko | La page |
| `css/` | 50 Ko | Feuille de style |
| `js/` | 90 Ko | Animations, données éditoriales |
| `images/` | 3,0 Mo | Photos, pochettes, symbole, icônes, image de partage |
| `audio/` | 3,4 Mo | Extrait « Amiricher » de Le T, chargé seulement après le clic d'entrée |
| `robots.txt`, `sitemap.xml`, `netlify.toml` | 2 Ko | Indexation et en-têtes de cache |

Ne sont volontairement pas publiés : la charte graphique, les fichiers de marque, les visuels d'archive et les scripts de vérification.

## 2. Déposer sur Netlify

### Première mise en ligne

1. Aller sur **app.netlify.com**, se connecter.
2. Onglet **Sites**, puis **Add new site → Deploy manually**.
3. Faire glisser le dossier `lbv-production-netlify` dans la zone de dépôt.
4. Attendre la fin du transfert : le site est en ligne sur une adresse en `.netlify.app`.

### Mettre à jour un site déjà en ligne

1. Ouvrir le site dans Netlify, onglet **Deploys**.
2. Faire glisser le dossier `lbv-production-netlify` dans la zone **Drag and drop your site output folder here**.
3. Le nouveau dépôt devient automatiquement la version publiée. En cas de problème, **Published deploy → Publish deploy** sur une version précédente permet de revenir en arrière en une action.

## 3. Nom de domaine

Dans **Site configuration → Domain management** :

1. **Add a domain** : saisir `lbvproduction.com`.
2. Netlify indique les enregistrements à créer chez le registraire du domaine : un `A` vers l'adresse fournie, ou un `CNAME` pour `www`.
3. Une fois la propagation faite (de quelques minutes à quelques heures), activer **HTTPS** : le certificat est gratuit et automatique.
4. Vérifier que `www.lbvproduction.com` redirige bien vers `lbvproduction.com`, ou l'inverse selon le choix retenu.

Le site déclare déjà `https://lbvproduction.com/` comme adresse de référence, dans le lien canonique, le plan de site et les métadonnées de partage. Si le domaine final diffère, me le dire : ces trois endroits sont à mettre à jour.

## 4. Formulaire de contact

Sur Netlify, le formulaire peut utiliser **Netlify Forms** : rétablir alors les attributs `data-netlify="true"` et `netlify-honeypot="bot-field"` sur la balise `<form>`, plus le champ caché `form-name`. Sinon, le service d'envoi configuré dans `data-endpoint` (voir la partie Render) fonctionne sur tout hébergeur.

Après le premier dépôt :

1. Onglet **Forms** du site : le formulaire `contact` apparaît dès la première soumission.
2. **Form notifications → Add notification → Email notification** : saisir `contact@lbvproduction.com` pour recevoir chaque message.
3. Envoyer un message de test depuis le site et vérifier sa réception.

Hors Netlify (ouverture directe du fichier, autre hébergeur), le formulaire bascule sur l'ouverture du logiciel de messagerie : rien n'est perdu.

## 5. Vérifications après mise en ligne

À faire une fois, sur ordinateur et sur téléphone :

- La page charge, le préchargeur va jusqu'à 100, le clic fait entrer.
- Le menu ouvre et ferme, chaque entrée mène à la bonne section.
- Un clic sur un artiste ouvre sa fiche, la fiche défile, la croix la referme.
- Une actualité ouvre sa fenêtre, le lien YouTube fonctionne.
- Le bouton WhatsApp ouvre la conversation.
- Le formulaire envoie et le message arrive.
- Le lien du site collé dans WhatsApp affiche bien l'image de partage.
- Sur téléphone : les artistes forment une grille, rien ne dépasse, les textes se déplient avec « Lire la suite ».

## 6. Ce qui reste à fournir

- **Liens d'artistes manquants** : la chaîne YouTube de Xquality, la chaîne YouTube et le Spotify de Lunxy. Les anciens liens étaient morts et ont été retirés.
- **Bios de D.O.M et Lunxy** : rédigées faute de texte fourni, à valider par le label.
- **Mentions légales** : un site qui collecte un nom, un téléphone et un e-mail devrait les afficher. À ajouter en pied de page dès que le texte est décidé.
- **Mesure d'audience** : aucune n'est installée. Netlify Analytics ou un outil respectueux de la vie privée peuvent être ajoutés.

## 7. Repères techniques

- **Performance mesurée** : 59 images par seconde dès la première descente sur ordinateur ; 44 puis 60 sur téléphone avec un processeur quatre fois plus lent.
- **Responsive** : vérifié de 360 à 1920 px, portrait et paysage, sans débordement horizontal.
- **Polices** : Stack Sans Headline et Bebas Neue, chargées depuis Google Fonts.
- **Navigateurs** : Chrome, Edge, Firefox, Safari récents. Les effets lourds se désactivent seuls sur téléphone et si le système demande des animations réduites.
- **Cache** : `netlify.toml` fixe les en-têtes ; après une mise à jour, une actualisation forcée peut être nécessaire pour voir les changements immédiatement.

## 8. Régénérer et revérifier

```bash
node tools/audit.mjs 1440 900          # console, images, ancres, débordements
node tools/audit.mjs 390 844 mobile
node tools/check-ready.mjs .           # fichiers, métadonnées, formulaire, poids
node tools/check-responsive.mjs        # neuf largeurs, du téléphone au grand écran
node tools/check-panels.mjs 1440 900   # défilement et fermeture des panneaux
node tools/export-netlify.mjs          # régénère le dossier à déposer
```

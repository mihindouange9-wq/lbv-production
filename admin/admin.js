/* Espace de pilotage LBV Production.
   Le contenu du site vit dans content/content.json sur GitHub. L'admin le charge, le modifie, puis publie
   un commit (contenu + nouveaux médias) : Render reconstruit le site et le met en ligne tout seul. */
(function () {
  'use strict';
  const REPO = { owner: 'mihindouange9-wq', name: 'lbv-production', branch: 'main' };
  const SITE = location.origin.includes('localhost') || location.protocol === 'file:' ? 'https://lbv-production.onrender.com' : location.origin;
  const API = 'https://api.github.com';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, children = []) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k === 'html') n.innerHTML = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v); } for (const c of [].concat(children)) if (c != null) n.append(c); return n; };

  let token = '';
  let content = null; // contenu en cours d'édition
  let published = ''; // JSON tel que publié (pour savoir s'il y a des modifications)
  let contentSha = '';
  const pending = new Map(); // chemin → { blob: Blob } nouveaux médias à envoyer
  let current = 'accueil';

  /* ---------- GitHub ---------- */
  const gh = async (path, opts = {}) => {
    const res = await fetch(API + path, { ...opts, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) } });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`GitHub ${res.status} sur ${path} : ${t.slice(0, 160)}`); }
    return res.status === 204 ? null : res.json();
  };
  const repoPath = (p) => `/repos/${REPO.owner}/${REPO.name}${p}`;
  const utf8ToB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  const b64ToUtf8 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
  const blobToB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

  async function loadContent() {
    const file = await gh(repoPath(`/contents/content/content.json?ref=${REPO.branch}`));
    contentSha = file.sha;
    published = b64ToUtf8(file.content);
    const draft = localStorage.getItem('lbv-draft');
    content = JSON.parse(published);
    if (draft) {
      try { const d = JSON.parse(draft); if (d.base === published) content = d.content; else localStorage.removeItem('lbv-draft'); } catch { localStorage.removeItem('lbv-draft'); }
    }
  }

  /* ---------- État ---------- */
  const isDirty = () => JSON.stringify(content, null, 2) + '\n' !== published || pending.size > 0;
  function refreshStatus(text, cls) {
    const s = $('#status');
    s.className = 'topbar-status' + (cls ? ' ' + cls : '');
    if (text) { s.textContent = text; return; }
    if (isDirty()) { s.textContent = 'Modifications non publiées'; s.classList.add('is-dirty'); } else { s.textContent = 'Site à jour'; s.classList.add('is-live'); }
    $('#publish').disabled = !isDirty();
  }
  function changed() {
    localStorage.setItem('lbv-draft', JSON.stringify({ base: published, content }));
    refreshStatus();
  }
  let toastTimer;
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600); };

  /* ---------- Médias ---------- */
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'media';
  async function resizeImage(file, max = 1600, quality = 0.84) {
    const img = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return { blob, w, h };
  }
  const previewUrl = (path) => pending.has(path) ? URL.createObjectURL(pending.get(path).blob) : SITE + '/' + path;

  /* ---------- Fabrique de champs ---------- */
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const set = (obj, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => (o[k] ??= {}), obj)[last] = v; };

  function text(obj, key, label, { hint, long, type = 'text', placeholder } = {}) {
    const input = el(long ? 'textarea' : 'input', { type: long ? undefined : type, value: long ? undefined : get(obj, key) ?? '', placeholder, oninput: (e) => { set(obj, key, e.target.value); changed(); } });
    if (long) input.value = get(obj, key) ?? '';
    return el('div', { class: 'field' }, [el('label', {}, label), input, hint && el('p', { class: 'hint' }, hint)]);
  }
  function date(obj, key, label) { return text(obj, key, label, { type: 'date' }); }
  function url(obj, key, label, hint) { return text(obj, key, label, { type: 'url', placeholder: 'https://…', hint }); }

  function tags(obj, key, label, hint) {
    const box = el('div', { class: 'tags' });
    const render = () => {
      box.innerHTML = '';
      (get(obj, key) || []).forEach((t, i) => box.append(el('span', { class: 'tag' }, [t, el('button', { type: 'button', 'aria-label': 'Retirer', onclick: () => { get(obj, key).splice(i, 1); changed(); render(); } }, '×')])));
      const input = el('input', { placeholder: 'Ajouter puis Entrée', onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v) { (get(obj, key) || set(obj, key, []) || get(obj, key)).push(v); changed(); render(); } } } });
      box.append(input);
    };
    render();
    return el('div', { class: 'field' }, [el('label', {}, label), box, hint && el('p', { class: 'hint' }, hint)]);
  }

  function image(obj, key, label, { folder = 'images', wide = false, hint, framingKey, max = 1600, onChange } = {}) {
    const preview = el('div', { class: 'media-preview' + (wide ? ' is-wide' : '') });
    const path = el('p', { class: 'path' });
    const render = () => { const p = get(obj, key); preview.innerHTML = ''; preview.append(p ? el('img', { src: previewUrl(p), alt: '' }) : 'Aucune image'); path.textContent = p || ''; };
    const file = el('input', { type: 'file', accept: 'image/*', onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const { blob } = await resizeImage(f, max);
        const name = `${folder}/${slug(f.name.replace(/\.[^.]+$/, ''))}-${Date.now().toString(36)}.jpg`;
        pending.set(name, { blob }); set(obj, key, name); onChange && onChange(name); changed(); render(); toast('Image prête à publier');
      } catch (err) { alert('Image illisible : ' + err.message); }
      e.target.value = '';
    } });
    const tools = el('div', { class: 'media-tools' }, [el('button', { type: 'button', class: 'btn-small', onclick: () => file.click() }, get(obj, key) ? 'Remplacer l’image' : 'Choisir une image'), file, path, hint && el('p', { class: 'hint' }, hint)]);
    render();
    const wrap = el('div', { class: 'field' }, [el('label', {}, label), el('div', { class: 'media' }, [preview, tools])]);
    if (framingKey) wrap.append(framing(obj, framingKey, preview));
    return wrap;
  }
  // Cadrage : position du point fort de la photo et zoom, visibles tout de suite dans l'aperçu
  function framing(obj, key, preview) {
    const f = get(obj, key) || set(obj, key, { position: '50% 50%', zoom: 1, origin: '50% 50%' }) || get(obj, key);
    const [px, py] = f.position.split(' ').map(parseFloat);
    const apply = () => { const img = preview.querySelector('img'); if (img) { img.style.objectPosition = f.position; img.style.transform = `scale(${f.zoom})`; img.style.transformOrigin = f.origin; } };
    const range = (lab, val, min, max, step, on) => el('div', {}, [el('label', {}, lab), el('input', { type: 'range', min, max, step, value: val, oninput: (e) => { on(+e.target.value); changed(); apply(); } })]);
    setTimeout(apply, 0);
    return el('div', { class: 'framing' }, [
      range('Horizontal', px, 0, 100, 1, (v) => { f.position = `${v}% ${f.position.split(' ')[1]}`; f.origin = f.position; }),
      range('Vertical', py, 0, 100, 1, (v) => { f.position = `${f.position.split(' ')[0]} ${v}%`; f.origin = f.position; }),
      range('Zoom', f.zoom, 1, 2, 0.05, (v) => { f.zoom = v; }),
    ]);
  }
  function audio(obj, key, label, hint) {
    const path = el('p', { class: 'path' }, get(obj, key) || '');
    const player = el('audio', { controls: true, src: get(obj, key) ? previewUrl(get(obj, key)) : false });
    const file = el('input', { type: 'file', accept: 'audio/mpeg,audio/mp3', onchange: (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 15 * 1024 * 1024) { alert('Fichier trop lourd (15 Mo maximum). Exportez un extrait en MP3 128 kbit/s.'); return; }
      const name = `audio/${slug(f.name.replace(/\.[^.]+$/, ''))}-${Date.now().toString(36)}.mp3`;
      pending.set(name, { blob: f }); set(obj, key, name); path.textContent = name; player.src = previewUrl(name); changed(); toast('Extrait prêt à publier');
      e.target.value = '';
    } });
    return el('div', { class: 'field' }, [el('label', {}, label), el('div', { class: 'media-tools' }, [player, el('button', { type: 'button', class: 'btn-small', onclick: () => file.click() }, 'Remplacer l’extrait (MP3)'), file, path, hint && el('p', { class: 'hint' }, hint)])]);
  }

  // Liste d'éléments (artistes, sorties, actualités…) : ajouter, retirer, monter, descendre
  function list(arr, { title, item, blank, label = 'Ajouter' }) {
    const box = el('div', { class: 'list' });
    const render = () => {
      box.innerHTML = '';
      arr.forEach((it, i) => {
        const tools = el('div', { class: 'card-tools' }, [
          el('button', { type: 'button', class: 'btn-small', title: 'Monter', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; changed(); render(); } }, '↑'),
          el('button', { type: 'button', class: 'btn-small', title: 'Descendre', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; changed(); render(); } }, '↓'),
          el('button', { type: 'button', class: 'btn-small danger', onclick: () => { if (confirm(`Retirer « ${title(it) || 'cet élément'} » ?`)) { arr.splice(i, 1); changed(); render(); } } }, 'Retirer'),
        ]);
        const head = el('div', { class: 'card-head' }, [el('span', { class: 'num' }, String(i + 1).padStart(2, '0')), el('h3', {}, title(it) || 'Sans titre'), tools]);
        box.append(el('div', { class: 'card' }, [head, ...item(it, i)]));
      });
      box.append(el('button', { type: 'button', class: 'btn-ghost list-add', onclick: () => { arr.push(blank()); changed(); render(); box.lastElementChild.previousElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, '+ ' + label));
    };
    render();
    return box;
  }
  const row = (...items) => el('div', { class: 'row' }, items);
  const section = (title, intro, ...fields) => [el('div', { class: 'section-head' }, [el('h2', {}, title), intro && el('p', {}, intro)]), el('div', { class: 'fields' }, fields)];

  /* ---------- Rubriques ---------- */
  const SECTIONS = {
    accueil: { label: 'Accueil', build: (c) => section('Accueil', 'Le premier écran : mots-clés, phrase d’accueil, portrait et phrase défilante.',
      tags(c.hero, 'tags', 'Mots-clés sous le menu', 'Trois courts libellés en capitales.'),
      text(c.hero, 'intro', 'Phrase d’accueil', { long: true }),
      text(c.hero, 'introMore', 'Suite de la phrase (dépliée au clic)', { long: true }),
      image(c.hero, 'portrait.src', 'Portrait du hero', { hint: 'Photo verticale de préférence. Elle est recadrée automatiquement.' }),
      text(c.hero, 'portrait.alt', 'Description du portrait (accessibilité)'),
      row(text(c.hero, 'rail', 'Phrase défilante'), text(c.hero, 'railAccent', 'Mot en braise')),
      text(c.hero, 'h1', 'Titre pour les moteurs de recherche (invisible)'),
    ) },
    label: { label: 'Le Label', build: (c) => section('Le Label', 'Présentation, chiffres clés et la scène « Produire / Diffuser ».',
      row(text(c.about.titleLines, '0', 'Titre, ligne 1'), text(c.about.titleLines, '1', 'Ligne 2 (en braise)')), text(c.about.titleLines, '2', 'Ligne 3'),
      text(c.about, 'text', 'Texte de présentation', { long: true }),
      el('h3', {}, 'Chiffres clés'),
      ...c.facts.map((f, i) => row(text(f, 'number', `Chiffre ${i + 1}`), text(f, 'text', 'Légende'))),
      text(c.label, 'intro', 'Phrase d’introduction des services', { long: true }),
      row(text(c.label.words, '0', 'Premier mot de la scène'), text(c.label.words, '1', 'Second mot')),
      row(tags(c.label.lists, '0', 'Liste « Produire »'), tags(c.label.lists, '1', 'Liste « Diffuser »')),
      el('h3', {}, 'Visuels de la scène (dix cadres)'),
      list(c.label.thumbs, { title: (t) => t.alt, label: 'Ajouter un visuel', blank: () => ({ side: 'left1', src: '', alt: '' }), item: (t) => [image(t, 'src', 'Image'), text(t, 'alt', 'Description')] }),
      el('h3', {}, 'Panneau final'),
      row(text(c.label, 'panelTitle', 'Début du titre'), text(c.label, 'panelAccent', 'Mot en braise')), text(c.label, 'panelTitleEnd', 'Fin du titre'),
      text(c.label, 'panelPara', 'Phrase du panneau'), image(c.label, 'panelPhoto', 'Photo du panneau'),
    ) },
    artistes: { label: 'Artistes', count: (c) => c.artists.length, build: (c) => section('Artistes', 'Chaque fiche : photo, cadrage, présentation, galerie et liens d’écoute.',
      row(text(c.artistsSection, 'title', 'Titre de la section'), text(c.artistsSection, 'hint', 'Sous-titre')),
      list(c.artists, { title: (a) => a.name, label: 'Ajouter un artiste', blank: () => ({ name: '', slug: '', alt: '', img: '', short: '', bio: '', tags: [], gallery: [], links: [], framing: { position: '50% 30%', zoom: 1.2, origin: '50% 30%' } }), item: (a) => [
        row(text(a, 'name', 'Nom de scène', { hint: 'Tel qu’affiché dans la fiche.' }), text(a, 'alt', 'Nom lisible (accessibilité)')),
        image(a, 'img', 'Photo principale', { framingKey: 'framing', hint: 'Réglez le cadrage : le point fort de la photo et le zoom.' }),
        text(a, 'short', 'Accroche (une phrase)', { long: true }),
        text(a, 'bio', 'Biographie', { long: true }),
        tags(a, 'tags', 'Styles', 'Trois mots au maximum, le premier est repris dans la fiche.'),
        el('h3', {}, 'Galerie (pochettes, photos)'),
        list(a.gallery = a.gallery || [], { title: () => 'Visuel', label: 'Ajouter un visuel', blank: () => '', item: (g, i) => [imageIn(a.gallery, i)] }),
        el('h3', {}, 'Écouter et suivre'),
        list(a.links = a.links || [], { title: (l) => l[0], label: 'Ajouter un lien', blank: () => ['Instagram', ''], item: (l) => [row(text(l, '0', 'Plateforme'), url(l, '1', 'Adresse'))] }),
      ] }),
    ) },
    sorties: { label: 'Sorties', count: (c) => c.releases.cards.length, build: (c) => section('Sorties', 'Les trois sorties mises en avant (pochette, lien d’écoute) et la liste des autres titres. Les plus récentes passent devant.',
      row(text(c.releases, 'heading', 'Titre'), text(c.releases, 'accent', 'Mot en braise')), text(c.releases, 'para', 'Introduction', { long: true }),
      list(c.releases.cards, { title: (r) => [r.title, r.artists].filter(Boolean).join(' · '), label: 'Ajouter une sortie', blank: () => ({ title: '', artists: '', type: 'Single', genre: '', date: new Date().toISOString().slice(0, 10), link: '', cover: '', alt: '' }), item: (r) => [
        row(text(r, 'title', 'Titre'), text(r, 'artists', 'Artistes')),
        row(text(r, 'type', 'Format', { hint: 'Single, EP, Album, Clip…' }), text(r, 'genre', 'Genre')),
        row(date(r, 'date', 'Date de sortie'), url(r, 'link', 'Lien d’écoute (Spotify, YouTube…)')),
        image(r, 'cover', 'Pochette', { max: 1000 }),
      ] }),
      el('h3', {}, 'Autres sorties (liste de liens)'),
      list(c.releases.more, { title: (r) => [r.title, r.artists].filter(Boolean).join(' · '), label: 'Ajouter un titre', blank: () => ({ title: '', artists: '', link: '' }), item: (r) => [row(text(r, 'title', 'Titre'), text(r, 'artists', 'Artistes')), url(r, 'link', 'Lien')] }),
    ) },
    actualites: { label: 'Actualités', count: (c) => c.news.items.length, build: (c) => section('Actualités', 'Clips, sorties, événements. Les plus récentes passent devant ; chaque actualité ouvre une fenêtre avec son texte et son lien.',
      text(c.news, 'para', 'Introduction', { long: true }),
      list(c.news.items, { title: (n) => n.title, label: 'Ajouter une actualité', blank: () => ({ title: '', date: new Date().toISOString().slice(0, 10), author: '', img: '', alt: '', link: '', desc: '' }), item: (n) => [
        text(n, 'title', 'Titre'),
        row(date(n, 'date', 'Date'), text(n, 'author', 'Signature', { hint: 'Ex. LE T · CLIP' })),
        image(n, 'img', 'Visuel', { wide: true }),
        url(n, 'link', 'Lien (YouTube, Spotify, article…)'),
        text(n, 'desc', 'Texte de l’actualité', { long: true }),
      ] }),
    ) },
    methode: { label: 'Méthode', build: (c) => section('Méthode', 'Les quatre étapes de l’accompagnement et le texte qui les relie.',
      ...c.method.steps.map((s, i) => el('div', { class: 'card' }, [el('h3', {}, `Étape ${i + 1}`), text(s, 'title', 'Titre'), text(s, 'text', 'Texte', { long: true })])),
      text(c.method, 'intro', 'Texte d’introduction', { long: true }),
      row(text(c.method, 'heading', 'Grand titre'), text(c.method, 'headingAccent', 'Mot en braise')),
      image(c.method, 'photo', 'Photo de la section'),
    ) },
    contact: { label: 'Contact & réseaux', build: (c) => section('Contact et réseaux', 'Coordonnées affichées dans le pied de page, le menu et le formulaire ; liens des réseaux.',
      row(text(c.cta, 'title', 'Appel final'), text(c.cta, 'accent', 'Mot en braise')),
      row(text(c.contact.address, '0', 'Adresse, ligne 1'), text(c.contact.address, '1', 'Adresse, ligne 2')),
      row(text(c.contact, 'phone', 'Téléphone'), text(c.contact, 'email', 'E-mail', { type: 'email' })),
      text(c.contact, 'hours', 'Horaires'),
      row(url(c.contact.socials, 'instagram', 'Instagram'), url(c.contact.socials, 'youtube', 'YouTube')),
      row(url(c.contact.socials, 'facebook', 'Facebook'), url(c.contact.socials, 'x', 'X')),
      row(text(c.contact, 'year', 'Année du copyright'), text(c.contact, 'copyright', 'Mention')),
    ) },
    son: { label: 'Son & référencement', build: (c) => section('Son et référencement', 'L’extrait joué en fond (après le clic d’entrée) et les textes lus par Google et les réseaux.',
      audio(c.audio, 'src', 'Extrait musical', 'MP3, 15 Mo maximum. Le son ne démarre qu’après le clic d’entrée du visiteur.'),
      text(c.audio, 'label', 'Étiquette du son', { hint: 'Ex. EXCLU · LE T — AMIRICHER' }),
      text(c.site, 'title', 'Titre de la page (onglet, Google)'),
      text(c.site, 'description', 'Description Google', { long: true }),
      text(c.site, 'ogDescription', 'Description pour WhatsApp, Facebook', { long: true }),
      image(c.site, 'ogImage', 'Image de partage (1200 × 630)', { wide: true, max: 1200 }),
    ) },
  };
  // Image dans un tableau de chemins (galerie d'un artiste)
  function imageIn(arr, i) { const holder = { v: arr[i] }; return image(holder, 'v', 'Image', { onChange: (v) => { arr[i] = v; } }); }

  function renderNav() {
    const nav = $('#sidenav'); nav.innerHTML = '';
    for (const [id, s] of Object.entries(SECTIONS)) {
      nav.append(el('button', { type: 'button', class: id === current ? 'is-active' : '', onclick: () => { current = id; renderNav(); renderSection(); nav.classList.remove('is-open'); window.scrollTo(0, 0); } }, [s.label, s.count && el('span', { class: 'count' }, String(s.count(content)))]));
    }
  }
  function renderSection() { const main = $('#content'); main.innerHTML = ''; main.append(...SECTIONS[current].build(content)); }

  /* ---------- Publication : un seul commit avec le contenu et les médias ---------- */
  async function publish() {
    const modal = $('#publish-modal'), steps = $('#publish-steps'), note = $('#publish-note'), close = $('#publish-close');
    modal.hidden = false; close.hidden = true; note.textContent = ''; steps.innerHTML = '';
    const names = ['Préparation des fichiers', 'Envoi des médias', 'Enregistrement du contenu', 'Reconstruction du site par Render', 'Mise en ligne'];
    const items = names.map((n) => el('li', {}, n)); steps.append(...items);
    const mark = (i, cls) => { items[i].className = cls; };
    refreshStatus('Publication en cours…', 'is-busy'); $('#publish').disabled = true;
    try {
      mark(0, 'is-busy');
      const json = JSON.stringify(content, null, 2) + '\n';
      const ref = await gh(repoPath(`/git/ref/heads/${REPO.branch}`));
      const head = await gh(repoPath(`/git/commits/${ref.object.sha}`));
      mark(0, 'is-done'); mark(1, 'is-busy');
      const tree = [];
      for (const [path, { blob }] of pending) {
        const b = await gh(repoPath('/git/blobs'), { method: 'POST', body: JSON.stringify({ content: await blobToB64(blob), encoding: 'base64' }) });
        tree.push({ path, mode: '100644', type: 'blob', sha: b.sha });
      }
      mark(1, 'is-done'); mark(2, 'is-busy');
      const cb = await gh(repoPath('/git/blobs'), { method: 'POST', body: JSON.stringify({ content: utf8ToB64(json), encoding: 'base64' }) });
      tree.push({ path: 'content/content.json', mode: '100644', type: 'blob', sha: cb.sha });
      const newTree = await gh(repoPath('/git/trees'), { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
      const when = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      const commit = await gh(repoPath('/git/commits'), { method: 'POST', body: JSON.stringify({ message: `Contenu mis à jour depuis l'espace de pilotage (${when})`, tree: newTree.sha, parents: [head.sha] }) });
      await gh(repoPath(`/git/refs/heads/${REPO.branch}`), { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
      mark(2, 'is-done'); mark(3, 'is-busy');
      published = json; pending.clear(); localStorage.removeItem('lbv-draft');
      note.textContent = 'Le site se reconstruit : comptez une à deux minutes. Vous pouvez fermer cette fenêtre, la publication continue.';
      close.hidden = false;
      // Le site en ligne porte le numéro du commit dans l'adresse de ses fichiers : on attend qu'il apparaisse
      const short = commit.sha.slice(0, 7);
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 15000));
        try { const html = await (await fetch(SITE + '/?n=' + Date.now(), { cache: 'no-store' })).text(); if (html.includes('?v=' + short)) break; } catch {}
        if (i === 23) throw new Error('Le site ne s’est pas encore mis à jour. Vérifiez sur dashboard.render.com.');
      }
      mark(3, 'is-done'); mark(4, 'is-done');
      note.textContent = 'En ligne. Un rafraîchissement du site suffit pour voir les changements.';
      refreshStatus('Site à jour', 'is-live'); toast('Publié');
    } catch (err) {
      const i = items.findIndex((li) => li.className === 'is-busy'); if (i >= 0) mark(i, 'is-error');
      note.textContent = 'Erreur : ' + err.message;
      close.hidden = false; refreshStatus();
    }
  }

  /* ---------- Connexion et démarrage ---------- */
  async function start() {
    $('#login').hidden = true; $('#app').hidden = false; refreshStatus('Chargement du contenu…', 'is-busy');
    try { await loadContent(); } catch (err) { $('#app').hidden = true; $('#login').hidden = false; $('#login-error').hidden = false; $('#login-error').textContent = 'Connexion impossible : ' + err.message; return; }
    renderNav(); renderSection(); refreshStatus();
  }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    token = $('#token').value.trim();
    $('#login-error').hidden = true;
    try { await gh(repoPath('')); } catch (err) { $('#login-error').hidden = false; $('#login-error').textContent = 'Clé refusée. Vérifiez-la, ou demandez une nouvelle clé.'; return; }
    if ($('#remember').checked) localStorage.setItem('lbv-key', token); else sessionStorage.setItem('lbv-key', token);
    start();
  });
  $('#logout').addEventListener('click', () => { localStorage.removeItem('lbv-key'); sessionStorage.removeItem('lbv-key'); location.reload(); });
  $('#publish').addEventListener('click', () => { if (confirm('Publier ces modifications sur le site ?')) publish(); });
  $('#publish-close').addEventListener('click', () => { $('#publish-modal').hidden = true; });
  $('#menu-toggle').addEventListener('click', () => $('#sidenav').classList.toggle('is-open'));
  window.addEventListener('beforeunload', (e) => { if (content && isDirty() && pending.size) { e.preventDefault(); e.returnValue = ''; } });

  token = localStorage.getItem('lbv-key') || sessionStorage.getItem('lbv-key') || '';
  if (token) start(); else $('#login').hidden = false;
})();

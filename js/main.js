/* LBV Production — moteur d'animation du site.
   Dépendances : GSAP 3.13 (ScrollTrigger, SplitText, Flip), Lenis, three.js r128, webgl-fluid.
   Principes de la charte : courbe expo.out (.22, 1, .36, 1), révélations jouées une seule fois,
   ni flou, ni rebond, ni clignotement. Tout ce qui est coûteux est désactivé sur téléphone. */
(function () {
  'use strict';
  const K = window.gsap;
  const ST = window.ScrollTrigger;
  const Split = window.SplitText;
  K.registerPlugin(ST, Split, window.Flip);
  K.ticker.lagSmoothing(0);
  ST.config({ ignoreMobileResize: true });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => window.innerWidth <= 800;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Rechargement, préchargeur joué une fois par session ---------- */
  const navEntry = performance.getEntriesByType('navigation')[0];
  const isReload = navEntry?.type === 'reload';
  const loaderPlayed = sessionStorage.getItem('loaderPlayed') === 'true';
  const playLoader = !isReload && !loaderPlayed && !reduce;
  const D = playLoader ? 8.5 : 0.1; // délai des animations d'entrée
  window.history.scrollRestoration = 'manual';
  const refresh = () => requestAnimationFrame(() => requestAnimationFrame(() => ST.refresh()));
  if (isReload) { window.scrollTo(0, 0); setTimeout(() => { window.scrollTo(0, 0); refresh(); }, 50); }

  /* ---------- Lenis ---------- */
  const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6 });
  lenis.on('scroll', ST.update);
  K.ticker.add((t) => lenis.raf(t * 1000));

  /* ---------- Préchargeur : plan rouge dissous par bruit (shader) + compteur ---------- */
  const preloader = $('.loader');
  const counter = $('.loader-counter');
  const loaderCanvas = $('#loader-canvas');
  if (!playLoader) {
    if (preloader) preloader.remove();
  } else if (window.THREE) {
    const T = window.THREE;
    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new T.WebGLRenderer({ canvas: loaderCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile() ? 1 : Math.min(window.devicePixelRatio, 1.25));
    renderer.setClearColor(0, 0);
    const uniforms = { uTransition: { value: 0 }, uResolution: { value: new T.Vector2(window.innerWidth, window.innerHeight) }, uTime: { value: 0 }, uBorderColor: { value: new T.Color('#7a0a0a') } };
    const mat = new T.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, depthTest: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
      fragmentShader: `
        precision highp float; varying vec2 vUv; uniform float uTransition; uniform vec2 uResolution; uniform float uTime; uniform vec3 uBorderColor;
        vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
        vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
        float cnoise(vec3 P){vec3 Pi0=floor(P);vec3 Pi1=Pi0+vec3(1.0);Pi0=mod289(Pi0);Pi1=mod289(Pi1);vec3 Pf0=fract(P);vec3 Pf1=Pf0-vec3(1.0);
          vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);vec4 iy=vec4(Pi0.yy,Pi1.yy);vec4 iz0=Pi0.zzzz;vec4 iz1=Pi1.zzzz;
          vec4 ixy=permute(permute(ix)+iy);vec4 ixy0=permute(ixy+iz0);vec4 ixy1=permute(ixy+iz1);
          vec4 gx0=ixy0*(1.0/7.0);vec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5;gx0=fract(gx0);vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);vec4 sz0=step(gz0,vec4(0.0));gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
          vec4 gx1=ixy1*(1.0/7.0);vec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5;gx1=fract(gx1);vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);vec4 sz1=step(gz1,vec4(0.0));gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
          vec3 g000=vec3(gx0.x,gy0.x,gz0.x);vec3 g100=vec3(gx0.y,gy0.y,gz0.y);vec3 g010=vec3(gx0.z,gy0.z,gz0.z);vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001=vec3(gx1.x,gy1.x,gz1.x);vec3 g101=vec3(gx1.y,gy1.y,gz1.y);vec3 g011=vec3(gx1.z,gy1.z,gz1.z);vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
          vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
          vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
          float n000=dot(g000,Pf0);float n100=dot(g100,vec3(Pf1.x,Pf0.yz));float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
          float n001=dot(g001,vec3(Pf0.xy,Pf1.z));float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));float n011=dot(g011,vec3(Pf0.x,Pf1.yz));float n111=dot(g111,Pf1);
          vec3 fade_xyz=fade(Pf0);vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);return 2.2*n_xyz;}
        void main(){
          float pixelSize = 6.0; vec2 grid = uResolution / pixelSize; vec2 pixelatedUv = floor(vUv * grid) / grid;
          float aspect = uResolution.x / uResolution.y; vec2 correctedUv = (pixelatedUv - 0.5) * vec2(aspect, 1.0) + 0.5;
          float reveal = mix(-1.5, 1.5, correctedUv.y);
          float noise = cnoise(vec3(correctedUv * 4.0, uTime * 0.15)) * 0.35 + cnoise(vec3(correctedUv * 12.0, uTime * 0.30)) * 0.18 + cnoise(vec3(correctedUv * 24.0, uTime * 0.50)) * 0.08;
          float threshold = mix(-3.0, 2.0, uTransition);
          float rawStrength = reveal + noise - threshold;
          float strength = clamp(rawStrength, 0.0, 2.0);
          float edge = 1.0 - abs(rawStrength); edge = pow(clamp(edge, 0.0, 1.0), 8.0); edge *= min(uTransition, 1.0);
          vec3 deepMidnightColor = vec3(0.16, 0.02, 0.02); vec3 richGlowingColor = uBorderColor * 1.5;
          vec3 edgeColor = mix(deepMidnightColor, richGlowingColor, sin(uTime * 1.5) * 0.5 + 0.5);
          vec3 baseRed = vec3(0.478, 0.039, 0.039); // Oxblood #7A0A0A (charte)
          vec3 planeColor = mix(baseRed, edgeColor * 4.5, edge);
          float finalAlpha = max(strength, edge);
          planeColor += sin(gl_FragCoord.y * 2.5) * 0.02;
          float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711, 0.00584)))); planeColor += (grain - 0.5) * 0.02;
          gl_FragColor = vec4(planeColor * finalAlpha, finalAlpha); // alpha prémultiplié : la couleur reste exacte sur le fond
        }`,
    });
    const mesh = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
    scene.add(mesh);
    const clock = new T.Clock();
    let running = true, raf = 0;
    const onResize = () => { renderer.setSize(window.innerWidth, window.innerHeight); uniforms.uResolution.value.set(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', onResize);
    const loop = () => { if (!running) return; uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    let done = false;
    setTimeout(() => {
      if (done) return; done = true;
      sessionStorage.setItem('loaderPlayed', 'true');
      K.to(uniforms.uTransition, { value: 1, duration: 3, ease: 'power2.inOut', onComplete: () => {
        running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
        mat.dispose(); mesh.geometry.dispose(); renderer.dispose(); preloader.remove(); refresh();
      } });
    }, 2900);
  }
  if (playLoader && counter) {
    const n = { value: 0 };
    K.to(n, { value: 100, duration: 3.5, ease: 'power2.inOut',
      onUpdate() { counter.textContent = Math.floor(n.value).toString().padStart(3, '0'); },
      onComplete() { const tl = K.timeline(); tl.to(counter, { opacity: 0, duration: 1.45, ease: 'power3.out' }).to('.loader', { duration: 2.85 }).to('.loader', { autoAlpha: 0, duration: 0.5 }); } });
    K.fromTo('.loader-hint', { opacity: 0 }, { opacity: 0.85, duration: 1.4, ease: 'expo.out', delay: 0.6 });
  }

  /* ---------- Lecture progressive (téléphone) : court par défaut, « Lire la suite » ---------- */
  const armReadMore = (el) => {
    let btn = el.nextElementSibling && el.nextElementSibling.classList.contains('readmore-btn') ? el.nextElementSibling : null;
    if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'readmore-btn'; el.insertAdjacentElement('afterend', btn); btn.addEventListener('click', () => { const open = el.classList.toggle('is-open'); btn.classList.toggle('is-open', open); btn.textContent = open ? 'Réduire' : 'Lire la suite'; ST.refresh(); }); }
    const clipped = window.innerWidth <= 800 && el.scrollHeight > el.clientHeight + 2;
    btn.style.display = clipped || el.classList.contains('is-open') ? '' : 'none';
    btn.textContent = el.classList.contains('is-open') ? 'Réduire' : 'Lire la suite';
  };
  const armAllReadMore = () => $$('.readmore').forEach(armReadMore);
  window.addEventListener('resize', () => setTimeout(armAllReadMore, 250));

  const init = () => {
  armAllReadMore();
  /* ---------- Séquence d'entrée du hero ---------- */
  // Rail du hero : monte à l'entrée puis défile en boucle (tous appareils), accélère et s'incline au scroll
  K.to('.hero-section-home .marquee .rail .rail-item', { y: 0, delay: D, duration: 2 });
  const heroRail = $('.hero-section-home .marquee .rail');
  if (heroRail) {
    const heroMarquee = K.to(heroRail, { xPercent: -50, duration: 22, ease: 'none', repeat: -1, delay: D + 0.6 });
    let hv = 0;
    lenis.on('scroll', (e) => { hv = e.velocity || 0; });
    const heroSkew = K.quickTo(heroRail, 'skewX', { duration: 0.6, ease: 'power3' });
    K.ticker.add(() => { const boost = Math.min(Math.abs(hv) / 10, 4); heroMarquee.timeScale(K.utils.interpolate(heroMarquee.timeScale(), 1 + boost, 0.08)); heroSkew(Math.max(-10, Math.min(10, -hv / 5))); });
  }
  const introLines = new Split('.hero-intro', { type: 'lines', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  K.set(introLines.lines, { yPercent: 100, opacity: 0 });
  K.to(introLines.lines, { yPercent: 0, opacity: 1, stagger: 0.04, duration: 1.6, ease: 'expo.out', delay: D });
  const expLines = new Split('.hero-tags', { type: 'lines', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  K.set(expLines.lines, { yPercent: 100, opacity: 0 });
  K.to(expLines.lines, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 1.6, ease: 'expo.out', delay: D });
  K.to('.hero-portrait-img', { y: 0, duration: 3.8, filter: 'brightness(0.72) saturate(0.82) contrast(1.14)', scale: 1, ease: 'power2.out', delay: isReload ? 0.1 : D + 0.5 });
  K.to('.hero-section-home', { backgroundImage: 'linear-gradient(250deg, #240707 0%, #0a0a0a 100%)', duration: 3, delay: D });
  K.to('.menu-2-bar', { opacity: 1, delay: D, pointerEvents: 'auto', duration: 1.5, ease: 'power3.out' });
  K.to('.brand-link', { opacity: 1, delay: D });
  K.to('.cta-connect', { opacity: 1, delay: isReload ? 0.1 : D + 0.5 });
  K.to('.ledger-cross', { rotate: 0, duration: 1, scale: 1, ease: 'power3.out', delay: isReload ? 0.1 : D + 0.5 });
  const ledger = new Split('.ledger-label', { type: 'chars', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  K.set(ledger.chars, { yPercent: 100, opacity: 0 });
  K.to(ledger.chars, { yPercent: 0, opacity: 1, stagger: 0.03, duration: 0.8, ease: 'power3.out', delay: D });
  const navChars = new Split('.active-animate', { type: 'chars', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  K.set(navChars.chars, { yPercent: 100, opacity: 0 });
  K.to(navChars.chars, { yPercent: 0, opacity: 1, stagger: 0.03, duration: 0.8, ease: 'power3.out', delay: D });
  let navTimer;
  const navShow = () => K.to(navChars.chars, { yPercent: 0, duration: 0.35, ease: 'power3.out', overwrite: true });
  const navHide = () => K.to(navChars.chars, { yPercent: 100, duration: 0.35, ease: 'power3.out', overwrite: true });
  ST.create({ start: 0, end: 'max', onUpdate: (self) => { if (ST.isInViewport('#footer')) return; clearTimeout(navTimer); self.direction === 1 ? navHide() : navShow(); navTimer = setTimeout(navShow, 3000); } });
  ST.create({ trigger: '.footer-hit', start: 'top bottom',
    onEnter: () => K.to(navChars.chars, { yPercent: 0, opacity: 1, stagger: 0.03, duration: 0.5, ease: 'power2.out', overwrite: true }),
    onEnterBack: () => K.to(navChars.chars, { yPercent: 100, opacity: 0, duration: 0.5, ease: 'power2.out', overwrite: true }) });

  /* ---------- Croix de la barre du bas : rotation au défilement ---------- */
  let lastY = window.scrollY, rot = 0;
  const pluses = $$('.ledger-cross .plus-svg');
  window.addEventListener('scroll', () => { const y = window.scrollY; rot += (y - lastY) * 0.3; pluses.forEach((p) => { p.style.transform = `rotate(${rot}deg)`; }); lastY = y; }, { passive: true });

  /* ---------- Bouton WhatsApp : magnétique, se cache à la descente ---------- */
  const connect = $('.cta-connect');
  connect.addEventListener('mousemove', (e) => { const r = connect.getBoundingClientRect(); K.to(connect, { x: (e.clientX - r.left - r.width / 2) * 0.2, y: (e.clientY - r.top - r.height / 2) * 0.2, duration: 0.4, ease: 'power3.out' }); });
  connect.addEventListener('mouseleave', () => K.to(connect, { x: 0, y: 0, duration: 1.2, ease: 'expo.out' }));
  connect.addEventListener('click', () => window.open('https://wa.me/241077047564?text=' + encodeURIComponent('Bonjour LBV Production, '), '_blank'));
  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => { const y = window.scrollY; K.to(connect, { x: y > lastScroll && y > 100 ? '300%' : 0, duration: 0.5, ease: 'power3.out', overwrite: true }); lastScroll = y; }, { passive: true });

  /* ---------- Curseur ---------- */
  const cursor = $('.custom-cursor');
  if (cursor && fine && window.innerWidth > 800) {
    window.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; cursor.style.opacity = '1'; });
    window.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    window.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
    document.addEventListener('mouseover', (e) => { cursor.querySelector('span').style.transform = e.target.closest('a, button, .artist-card, .news-card, .cta-footer, .menu-2-bar, .sound-wave, .cta-connect, input, textarea, [role="button"]') ? 'scale(2.2)' : 'scale(1)'; });
  }

  /* ---------- Logo 3D ---------- */
  $('.brand-link').addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(0); });

  /* ---------- Musique et onde ---------- */
  const music = $('#bgMusic');
  const wave = $('.sound-wave');
  const soundLabel = $('.sound-label');
  let playing = false, firstClick = false;
  music.loop = true; music.volume = 0;
  for (let i = 0; i < 40; i++) { const b = document.createElement('div'); b.className = 'bar'; b.style.animationDuration = (Math.random() * 0.5 + 0.2) + 's'; b.style.animationDelay = Math.random() + 's'; wave.appendChild(b); }
  const bars = $$('.bar');
  wave.classList.add('off');
  const waveOn = () => { wave.classList.remove('off'); K.fromTo(bars, { opacity: 0.25, scaleY: 0.35 }, { opacity: 1, scaleY: 1, duration: 0.35, ease: 'power2.out', stagger: 0.003, onComplete: () => wave.classList.add('on') }); K.to(soundLabel, { opacity: 0.8, duration: 0.6 }); };
  const waveOff = () => { wave.classList.remove('on'); K.to(bars, { opacity: 0.25, scaleY: 0.15, duration: 0.35, ease: 'power2.inOut', stagger: 0.003, onComplete: () => wave.classList.add('off') }); K.to(soundLabel, { opacity: 0, duration: 0.4 }); };
  const playMusic = () => { if (playing) return; music.play().catch(() => {}); K.killTweensOf(music); K.to(music, { volume: 0.5, duration: 1.5, ease: 'power2.out' }); waveOn(); playing = true; };
  const stopMusic = () => { if (!playing) return; K.killTweensOf(music); K.to(music, { volume: 0, duration: 1.5, ease: 'power2.out', onComplete: () => { music.pause(); music.currentTime = 0; } }); waveOff(); playing = false; };
  document.addEventListener('click', () => { if (!firstClick) { firstClick = true; playMusic(); } }, { once: true });
  wave.addEventListener('click', (e) => { e.stopPropagation(); playing ? stopMusic() : playMusic(); });

  /* ---------- Menu à barres ---------- */
  new Split('.menu-navigate-scroll a', { type: 'lines', wordsClass: 'word', charsClass: 'char', linesClass: 'line-mask' });
  new Split('.bottom-contact-ctas p, .bottom-contact-ctas a', { type: 'lines', linesClass: 'line-mask' });
  const menuTl = K.timeline({ paused: true });
  menuTl.to('.line-1', { xPercent: 0, y: 4.5, rotation: 45, background: '#000', duration: 0.35, ease: 'power3.inOut' }, 0)
    .to('.line-2', { xPercent: 0, y: -4, rotation: -45, background: '#000', duration: 0.35, ease: 'power3.inOut' }, 0)
    .to('.brand-link', { filter: 'brightness(0)', duration: 0.35 }, 0)
    .from('.line-mask', { yPercent: 100, opacity: 0, stagger: 0.03, duration: 1.2, ease: 'expo.out' }, 0);
  let menuOpen = false;
  const openMenu = () => { lenis.stop(); K.fromTo('.bar-bgs', { scaleX: 0, transformOrigin: 'right center' }, { scaleX: 1, duration: 0.8, stagger: 0.06, ease: 'power4.inOut', onComplete: () => menuTl.play(0) }); K.set('.navigation-menu', { visibility: 'visible', pointerEvents: 'auto' }); K.set('.menu-2-bar', { mixBlendMode: 'normal' }); menuOpen = true; };
  const closeMenu = () => { menuTl.reverse(); K.delayedCall(0.45, () => K.to('.bar-bgs', { scaleX: 0, transformOrigin: 'left center', duration: 0.8, stagger: 0.06, ease: 'power4.inOut', onComplete: () => { K.set('.navigation-menu', { visibility: 'hidden', pointerEvents: 'none' }); K.set('.menu-2-bar', { mixBlendMode: 'difference' }); lenis.start(); } })); menuOpen = false; };
  $('.menu-2-bar').addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  $$('.menu-navigate-scroll a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    K.to('.menu-cross', { scale: 0, rotation: 0, duration: 0.3, ease: 'power3.out' });
    K.to(a.querySelector('.menu-cross'), { scale: 1, rotation: 90, duration: 0.8, ease: 'expo.out' });
    closeMenu();
    const target = $(a.getAttribute('href'));
    if (target) K.delayedCall(0.9, () => lenis.scrollTo(target, { offset: 0, duration: 1.6 }));
  }));
  $$('nav a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = $(a.getAttribute('href')); if (t) lenis.scrollTo(t, { duration: 1.6 }); }));

  /* ---------- Titre cinématique et texte du label ---------- */
  const cine = $('.cinematic-title');
  if (cine) {
    cine.innerHTML = cine.innerHTML.replace(/(<[^>]+>)|([^<\s]+)/g, (m, tag, word) => tag || ('<span class="title-word">' + [...word].map((ch) => `<span class="title-letter">${ch}</span>`).join('') + '</span>'));
    K.from($('.title-letter', cine), { opacity: 0, yPercent: 40, duration: 1.4, stagger: { each: 0.035, from: 'start' }, ease: 'expo.out', scrollTrigger: { trigger: cine, start: 'top 60%', once: true } });
  }
  const cineText = new Split('.cinematic-text', { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  K.set(cineText.words, { opacity: 0, y: 24 });
  K.to(cineText.words, { opacity: 1, y: 0, duration: 1.6, ease: 'expo.out', stagger: { each: 0.02, from: 'start' }, scrollTrigger: { trigger: '.cinematic-text', start: 'top 85%', once: true } });

  /* ---------- Chiffres ---------- */
  $$('.facts-box').forEach((box) => {
    const num = new Split(box.querySelector('.numbers-facts'), { type: 'chars', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
    const para = new Split(box.querySelector('.para-facts'), { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
    K.set(num.chars, { opacity: 0, y: 40 });
    K.set(para.words, { opacity: 0, y: 16 });
    K.timeline({ scrollTrigger: { trigger: box, start: 'top 70%', once: true } })
      .to(num.chars, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06 })
      .to(para.words, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.02 }, '-=0.9');
  });

  /* ---------- Feu : flammes en shader (js/fire.js) ---------- */
  if (window.LBVFire && !reduce) window.LBVFire('.fire-canvas');

  /* ---------- Services : titre déplacé (Flip), lettres, pin, lignes SVG, mots, chute ---------- */
  const heading = $('.label-heading');
  const scrollDown = $('.label-center');
  if (isMobile()) {
    // Téléphone : un bloc court et lisible, aucun épinglage, aucun titre déplacé
    K.fromTo('.label-section .label-thumb', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.label-thumbs', start: 'top 85%', once: true } });
    K.fromTo('.label-section .label-list, .label-section .label-panel-text', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.label-lists', start: 'top 85%', once: true } });
    // les quatre visuels glissent à des vitesses différentes : la profondeur sans coût
    $$('.label-section .label-thumb img').forEach((img, i) => K.fromTo(img, { yPercent: -6 - i * 2 }, { yPercent: 6 + i * 2, ease: 'none', scrollTrigger: { trigger: img.closest('.label-thumb'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
    // le panneau oxblood monte et son titre se découvre
    K.fromTo('.label-panel', { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.label-panel', start: 'top 88%', once: true } });
    K.fromTo('.label-panel-title, .label-panel-para', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.label-panel', start: 'top 82%', once: true } });
  } else {
  const flipState = window.Flip.getState(heading);
  scrollDown.appendChild(heading);
  window.Flip.from(flipState, { duration: 1, ease: 'none', absolute: true, scrollTrigger: { trigger: '.label-section', start: 'top 60%', end: 'center 50%', scrub: 1 } });
  const breaks = $('.label-heading .breaks');
  breaks.innerHTML = breaks.textContent.split('').map((c) => `<span class="label-char">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  K.timeline({ scrollTrigger: { trigger: '.box-section-ups', start: 'top top', end: '100% top', scrub: 1 } })
    .to('.label-char', { fontSize: '16rem', stagger: 0.1, ease: 'none' })
    .to('.breaks', { transform: 'translateX(0%)', ease: 'none' }, '0');
  const charify = (sel) => $$(sel).forEach((el) => { const t = el.textContent; el.innerHTML = ''; t.split('').forEach((c) => { const s = document.createElement('span'); s.textContent = c === ' ' ? ' ' : c; el.appendChild(s); }); });
  charify('.word1'); charify('.points');
  K.set('.word1 span, .points span', { y: '120%' });
  const strokes = $$('.label-lines svg *');
  strokes.forEach((el) => { if (typeof el.getTotalLength === 'function') { const len = el.getTotalLength(); K.set(el, { strokeDasharray: len, strokeDashoffset: len }); } });
  const fallHead = new Split('.label-panel-title', { type: 'lines', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  const fallPara = new Split('.label-panel-para', { type: 'lines', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  [...fallHead.lines, ...fallPara.lines].forEach((l) => { l.innerHTML = `<span>${l.innerHTML}</span>`; });
  const svcTl = K.timeline({ scrollTrigger: { trigger: '.label-section', start: 'top top', end: '+=690%', scrub: 1.1, pin: true, anticipatePin: 1, invalidateOnRefresh: true } });
  svcTl.to(strokes, { strokeDashoffset: 0, duration: 3, stagger: 0.11 }, '0');
  svcTl.to('.label-char', { y: '-130%', delay: 0.5, stagger: 0.1 });
  svcTl.to('.label-words .word1:nth-child(1) span', { y: '0%', stagger: 0.03, duration: 1 });
  svcTl.to('.set-1 .points span', { y: '0%', stagger: 0.04, duration: 0.6 }, '<');
  svcTl.to('.label-words .word1:nth-child(1) span', { y: '-120%', stagger: 0.02, duration: 1 }, '+=0.2');
  svcTl.to('.set-1 .points span', { y: '-120%', stagger: 0.02, duration: 1 }, '<');
  svcTl.to('.label-words .word1:nth-child(2) span', { y: '0%', stagger: 0.03, ease: 'power4.out', duration: 0.6 });
  svcTl.to('.set-2 .points span', { y: '0%', stagger: 0.04, ease: 'power4.out', duration: 0.6 }, '<');
  svcTl.to('.label-panel', { y: '0%', stagger: 0.04, duration: 2 });
  svcTl.to('.label-panel', { scale: 1, width: '100vw', height: '100vh', stagger: 0.04, duration: 0.6 });
  svcTl.to('.paper-tear', { scale: 1, stagger: 0.04, duration: 0.6 });
  svcTl.to('.label-panel-para .line span', { y: '0%', stagger: 0.04, duration: 0.6 }, '18');
  svcTl.to('.label-panel-title .line span', { y: '0%', stagger: 0.04, duration: 0.6 }, '18');
  K.timeline({ scrollTrigger: { trigger: '.label-section', start: 'top top', end: '700% bottom', scrub: 1.2, invalidateOnRefresh: true } })
    .to('.label-thumb', { clipPath: 'inset(0% 0% 0% 0%)', stagger: 0.08, ease: 'power3.out' }, 0)
    .fromTo('.label-thumb img', { yPercent: 40 }, { yPercent: -40, stagger: 0.08, ease: 'none' }, 0);
  const pics = $('.label-thumbs');
  if (window.innerWidth > 768) {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy;
    window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    K.ticker.add(() => { cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06; K.set(pics, { x: (cx - window.innerWidth / 2) * 0.6, y: (cy - window.innerHeight / 2) * 0.6, rotationX: K.utils.mapRange(0, window.innerHeight, 14, -14, cy), rotationY: K.utils.mapRange(0, window.innerWidth, -24, 24, cx), transformPerspective: 1400, transformOrigin: 'center center', force3D: true }); });
  }
  } // fin du bloc ordinateur du Label

  /* ---------- Artistes : pile épinglée, fond, texte, cercle, sidebar ---------- */
  const ARTISTS = window.LBV.artists;
  const steps = K.utils.toArray('.artist-card'), total = steps.length;
  if (isMobile()) {
    // Téléphone : une grille de six vignettes carrées, nom et style sous chaque photo, aucun épinglage
    const legende = document.querySelector('.artists-legend p');
    if (legende) legende.textContent = 'Touchez une fiche pour la découvrir';
    steps.forEach((s, i) => {
      const a = ARTISTS[i];
      if (!a) return;
      // la photo va dans un cadre carré qui la rogne : le zoom de cadrage ne déborde pas sur le nom
      const img = s.querySelector('img');
      if (img && !img.parentElement.classList.contains('artist-thumb')) {
        const media = document.createElement('div');
        media.className = 'artist-thumb';
        s.insertBefore(media, img);
        media.appendChild(img);
      }
      const cap = document.createElement('div');
      cap.className = 'artist-name';
      cap.innerHTML = '<b>' + a.name + '</b><span>' + a.tags.slice(0, 2).join(' · ') + '</span>';
      s.appendChild(cap);
    });
    K.fromTo(steps, { opacity: 0, y: 26, clipPath: 'inset(18% 0% 18% 0%)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.container', start: 'top 85%', once: true } });
    // la photo glisse dans son cadre pendant le défilement
    steps.forEach((s) => { const img = s.querySelector('img'); if (img) K.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }); });
  } else {
    const bgImg = $('.artists-backdrop img');
    const textBox = $('.artists-legend'), textH1 = textBox.querySelector('h2'), textP = textBox.querySelector('p');
    const circle = $('.progress-ring circle'), circleNum = $('.progress-ring .progress-value');
    const R = 35, CIRC = 2 * Math.PI * R;
    K.set(circle, { strokeDasharray: CIRC, strokeDashoffset: CIRC });
    const posFor = (rel) => rel === 0 ? { top: '25%', scale: 1, opacity: 1, pointerEvents: 'auto' }
      : rel === -1 ? { top: '-10%', scale: 0.3, opacity: 0.4, pointerEvents: 'none' }
      : rel <= -2 ? { top: '-25%', scale: 0, opacity: 0, pointerEvents: 'none' }
      : rel === 1 ? { top: '60%', scale: 0.3, opacity: 0.4, pointerEvents: 'none' }
      : { top: '80%', scale: 0.1, opacity: 0.1, pointerEvents: 'none' };
    steps.forEach((s, i) => K.set(s, { ...posFor(i), zIndex: total - i }));
    let inSteps = false, lastBg = -1, lastText = -1, textTl;
    const setBg = (i) => { if (i === lastBg) return; lastBg = i; const img = steps[i]?.querySelector('img'); if (!img) return; K.to(bgImg, { opacity: 0, duration: 0.25, overwrite: 'auto', onComplete: () => { bgImg.src = img.src; if (inSteps) K.to(bgImg, { opacity: 1, duration: 0.6, overwrite: 'auto' }); } }); };
    const setText = (i) => {
      if (i === lastText) return; lastText = i; const a = ARTISTS[i]; if (!a) return;
      textTl && textTl.kill(); textH1.innerHTML = ''; textP.innerHTML = '';
      a.name.split(' ').forEach((w) => { const s = document.createElement('span'); s.className = 'word'; s.textContent = w; textH1.appendChild(s); });
      a.short.split(' ').forEach((w) => { const s = document.createElement('span'); s.className = 'word'; s.textContent = w; textP.appendChild(s); });
      const hw = textH1.querySelectorAll('.word'), pw = textP.querySelectorAll('.word');
      K.set([...hw, ...pw], { y: 40, opacity: 0 });
      textTl = K.timeline().to(hw, { y: 0, opacity: 1, stagger: 0.035, duration: 0.45, ease: 'power2.out' }).to(pw, { y: 0, opacity: 1, stagger: 0.018, duration: 0.35, ease: 'power2.out' }, '-=0.2');
    };
    const stepsTl = K.timeline({ scrollTrigger: { trigger: '.container', start: 'top top', end: '+=' + total * 100 + '%', scrub: 0.6, pin: true,
      onEnter() { inSteps = true; K.to('.artists-backdrop', { opacity: 1, duration: 0.5, overwrite: 'auto' }); },
      onEnterBack() { inSteps = true; K.to('.artists-backdrop', { opacity: 1, duration: 0.5, overwrite: 'auto' }); },
      onLeave() { inSteps = false; K.to('.artists-backdrop', { opacity: 0, duration: 0.5, overwrite: 'auto' }); },
      onLeaveBack() { inSteps = false; K.to('.artists-backdrop', { opacity: 0, duration: 0.5, overwrite: 'auto' }); },
      onUpdate(self) {
        const p = Math.min(self.progress * total, total - 1), idx = Math.floor(p), frac = p - idx;
        steps.forEach((s, i) => K.to(s, { ...posFor(i - idx), duration: 0.9, ease: 'expo.out', overwrite: true }));
        setBg(idx); setText(idx);
        circle.style.strokeDashoffset = CIRC * (1 - frac); circleNum.innerText = String(idx + 1).padStart(2, '0');
      } } });
    for (let r = 0; r < total; r++) steps.forEach((s, i) => stepsTl.to(s, { ...posFor(i - r), ease: 'none', duration: 1 }, r));
    bgImg.src = steps[0].querySelector('img').src;
    // « VOIR » qui suit la souris sur les vignettes
    const follow = $('.cursor-view');
    const moveFollow = (e) => { follow.style.transform = `translate(${e.clientX - follow.offsetWidth / 2}px, ${e.clientY - follow.offsetHeight / 2}px)`; };
    if (fine) { window.addEventListener('mousemove', moveFollow); steps.forEach((s) => { s.addEventListener('mouseenter', () => K.to(follow, { opacity: 1, duration: 0.4 })); s.addEventListener('mouseleave', () => K.to(follow, { opacity: 0, duration: 0.6 })); }); }
  }

  // Sidebar artiste
  const sidebar = $('.artist-panel');
  const sbClose = $('.close-sidebar', sidebar);
  const sbHero = $('.image-hero-side', sidebar), sbBg = $('.image-bg-hero img', sidebar), sbH1 = $('.artist-panel-title'), sbDate = $('.artist-panel-meta'), sbP = $('.artist-panel-bio'), sbTags = $('.project-tags'), sbGallery = $('.gallery-grid'), sbRoles = $('.role-list');
  let sidebarOpen = false;
  if (fine) { window.addEventListener('mousemove', (e) => { sbClose.style.transform = `translate(${e.clientX - 30}px, ${e.clientY - 30}px)`; }); sidebar.addEventListener('mouseenter', () => { sbClose.style.opacity = 1; }); sidebar.addEventListener('mouseleave', () => { sbClose.style.opacity = 0; }); }
  else { sbClose.style.opacity = 1; sbClose.style.transform = 'translate(calc(100vw - 76px), 16px)'; }
  /* ---------- Défilement des panneaux superposés ----------
     Le défilement doux écoute la fenêtre entière : tant qu'un panneau est ouvert, il faut lui retirer
     la molette, le doigt et le clavier, sinon le panneau reste figé. On déplace nous-mêmes son contenu. */
  const panelScroll = (el) => {
    let touchY = 0;
    const onWheel = (e) => { el.scrollTop += e.deltaY; e.preventDefault(); e.stopPropagation(); };
    const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => { const y = e.touches[0].clientY; el.scrollTop += touchY - y; touchY = y; e.preventDefault(); e.stopPropagation(); };
    const onKey = (e) => {
      const pas = { ArrowDown: 80, ArrowUp: -80, PageDown: el.clientHeight * 0.9, PageUp: -el.clientHeight * 0.9, Home: -el.scrollHeight, End: el.scrollHeight, ' ': el.clientHeight * 0.9 }[e.key];
      if (pas === undefined || e.target.closest('input, textarea')) return;
      el.scrollTop += pas; e.preventDefault();
    };
    return {
      on() { el.addEventListener('wheel', onWheel, { passive: false, capture: true }); el.addEventListener('touchstart', onTouchStart, { passive: true }); el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true }); window.addEventListener('keydown', onKey); },
      off() { el.removeEventListener('wheel', onWheel, { capture: true }); el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove, { capture: true }); window.removeEventListener('keydown', onKey); },
    };
  };
  const sidebarScroll = panelScroll(sidebar);

  const openArtist = (i) => {
    const a = ARTISTS[i]; if (!a || sidebarOpen) return;
    sidebarOpen = true; lenis.stop(); sidebar.scrollTop = 0; document.body.classList.add('sidebar-open');
    sidebarScroll.on();
    sbClose.style.pointerEvents = 'auto';
    sbGallery.innerHTML = a.gallery.map((g) => `<div class="gallery-item"><img src="${g}" alt=""></div>`).join('');
    sbRoles.innerHTML = a.links.map(([l, h]) => `<li><a href="${h}" target="_blank" rel="noopener">${l}</a></li>`).join('');
    sbHero.innerHTML = `<img src="${a.img}" alt="${a.name}">`; sbBg.src = a.img; sbDate.textContent = 'Artiste LBV Production · ' + a.tags[0]; sbH1.textContent = a.name;
    sbP.textContent = a.bio; sbP.classList.add('readmore'); sbP.classList.remove('is-open'); armReadMore(sbP);
    sbTags.innerHTML = a.tags.map((t) => `<span>${t}</span>`).join('');
    K.to(sidebar, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'power4.inOut', onStart: () => { sidebar.style.pointerEvents = 'all'; } });
    K.to('.container', { opacity: 0.3, duration: 1.7, ease: 'power4.inOut' });
    K.fromTo($$('.gallery-item', sbGallery), { y: 80, opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' }, { y: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', stagger: 0.12, duration: 1.2, delay: 1.2, ease: 'power4.out' });
    K.fromTo($$('span', sbTags), { y: 20, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, stagger: 0.05, duration: 0.6, delay: 1, ease: 'power3.out' });
    K.fromTo(sbHero.querySelector('img'), { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 2.5, ease: 'power4.inOut' });
    K.fromTo([sbDate, sbH1, sbP], { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, delay: 0.8, stagger: 0.12, ease: 'power3.out' });
  };
  const closeArtist = () => {
    if (!sidebarOpen) return; sidebarOpen = false; sidebarScroll.off(); lenis.start(); document.body.classList.remove('sidebar-open');
    K.to(sidebar, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut', onComplete: () => { sidebar.style.pointerEvents = 'none'; ST.refresh(true); } });
    K.to('.container', { opacity: 1, duration: 1.7, ease: 'power4.inOut' });
  };
  steps.forEach((s, i) => s.addEventListener('click', () => openArtist(i)));
  sbClose.addEventListener('click', closeArtist);
  window.addEventListener('wheel', (e) => { if (sidebarOpen && !e.target.closest('.artist-panel')) e.preventDefault(); }, { passive: false, capture: true });

  /* ---------- Méthode ---------- */
  new Split('.method-heading h2', { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  new Split('.method-intro', { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  $$('.method-step h3, .method-step p').forEach((el) => new Split(el, { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' }));
  K.set('.method-heading .word', { opacity: 0, y: 80 });
  K.set('.method-intro .word', { opacity: 0, y: 40 });
  K.set('.method-step h3 .word', { opacity: 0, y: 60 });
  K.set('.method-step p .word', { opacity: 0, y: 30 });
  K.to('.method-section > img', { yPercent: -20, scale: 1, ease: 'none', scrollTrigger: { trigger: '.method-section', start: 'top bottom', end: 'bottom top', scrub: true } });
  K.to('.method-heading .word', { opacity: 1, y: 0, stagger: 0.04, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.method-heading', start: 'top 75%', once: true } });
  K.to('.method-intro .word', { opacity: 1, y: 0, stagger: 0.012, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.method-intro', start: 'top 80%', once: true } });
  $$('.method-step').forEach((box) => {
    K.timeline({ scrollTrigger: { trigger: box, start: 'top 80%', once: true } })
      .from(box, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out' })
      .to(box.querySelectorAll('h3 .word'), { opacity: 1, y: 0, stagger: 0.05, duration: 0.8, ease: 'expo.out' }, '-=0.8')
      .to(box.querySelectorAll('p .word'), { opacity: 1, y: 0, stagger: 0.012, duration: 0.7, ease: 'expo.out' }, '-=0.6');
  });

  /* ---------- Sorties et actualités : cartes, titres ---------- */
  $$('.blog-section').forEach((sec) => {
    if (!isMobile()) K.timeline({ scrollTrigger: { trigger: sec, start: 'top 10%', end: '120% bottom', scrub: 1 } }).to(sec.querySelector('.news-card:nth-child(2)'), { y: 0 }, '0');
    else K.fromTo(sec.querySelectorAll('.news-card'), { opacity: 0, y: 30, clipPath: 'inset(14% 0% 14% 0%)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: sec.querySelector('.news-cards, .releases-cards') || sec, start: 'top 88%', once: true } });
    new Split(sec.querySelector('.blog-heading'), { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
    new Split(sec.querySelector('.blog-para'), { type: 'words', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
    K.set(sec.querySelectorAll('.blog-heading .word, .blog-para .word'), { yPercent: 120, opacity: 0 });
    K.timeline({ scrollTrigger: { trigger: sec, start: 'top 60%', once: true } })
      .to(sec.querySelectorAll('.blog-heading .word'), { yPercent: 0, opacity: 1, duration: 1.4, stagger: 0.05, ease: 'expo.out' }, 0)
      .to(sec.querySelectorAll('.blog-para .word'), { yPercent: 0, opacity: 1, duration: 1, stagger: 0.015, ease: 'expo.out' }, 0.3);
    if (isMobile()) K.utils.toArray('.news-card', sec).forEach((c, i) => K.from(c, { opacity: 0, y: 40, duration: 0.8, ease: 'power2.out', delay: i * 0.1, scrollTrigger: { trigger: c, start: 'top 90%' } }));
  });

  /* ---------- Modale actualité ---------- */
  const BLOGS = window.LBV.blogs;
  const modal = $('.modal-blogs');
  const blogScroll = panelScroll(modal);
  const mH1 = $('.news-modal-text h2'), mDate = $('.news-modal-date'), mP = $('.news-modal-text p'), mBy = $('.news-modal-link'), mImg = $('.modal-blogs .news-image img');
  const mClose = $('.close-sidebar-blog');
  let modalBusy = false;
  let followClose = () => {};
  if (fine) { const qx = K.quickTo(mClose, 'x', { duration: 0.3, ease: 'power3.out' }), qy = K.quickTo(mClose, 'y', { duration: 0.3, ease: 'power3.out' }); followClose = (e) => { qx(e.clientX - 28); qy(e.clientY - 28); }; }
  else K.set(mClose, { x: window.innerWidth - 72, y: 16 });
  const showClose = () => { K.to(mClose, { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out' }); window.addEventListener('mousemove', followClose); };
  const hideClose = () => { K.to(mClose, { scale: 0, opacity: 0, duration: 0.3, ease: 'power3.in' }); window.removeEventListener('mousemove', followClose); };
  const openBlog = (i) => {
    if (modalBusy) return; modalBusy = true; lenis.stop(); blogScroll.on();
    const b = BLOGS[i]; mH1.textContent = b.title; mDate.textContent = b.date; mP.textContent = b.desc; mBy.textContent = b.author + ' · Voir sur YouTube'; mBy.href = b.link; mImg.src = b.img;
    K.killTweensOf(modal); K.killTweensOf(mImg);
    K.set(modal, { pointerEvents: 'all', clipPath: 'inset(50% 50% 50% 50%)', rotate: -10, scale: 0.7, opacity: 0 });
    K.set(mImg, { clipPath: 'inset(100% 0 0 0)' });
    K.timeline({ onComplete: () => { modalBusy = false; } })
      .to(modal, { clipPath: 'inset(0% 0% 0% 0%)', rotate: 0, scale: 1, opacity: 1, duration: 1.6, ease: 'power4.inOut' })
      .from(mDate, { y: 20, opacity: 0, duration: 0.6 }, '-=0.8').from(mH1, { y: 40, opacity: 0, duration: 0.8 }, '-=0.6').from(mP, { y: 40, opacity: 0, duration: 0.8 }, '-=0.6').from(mBy, { y: 20, opacity: 0, duration: 0.6 }, '-=0.5')
      .to(mImg, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'power4.out' }, '-=1');
    showClose();
  };
  const closeBlog = () => {
    if (modalBusy || +getComputedStyle(modal).opacity === 0) return; modalBusy = true; blogScroll.off(); hideClose(); lenis.start();
    K.timeline({ onComplete: () => { K.set(modal, { pointerEvents: 'none', opacity: 0, clipPath: 'inset(50% 50% 50% 50%)', rotate: -10, scale: 0.7 }); K.set(mImg, { clipPath: 'inset(100% 0 0 0)' }); modalBusy = false; } })
      .to(mImg, { clipPath: 'inset(100% 0 0 0)', duration: 0.6, ease: 'power4.in' })
      .to(modal, { clipPath: 'inset(50% 50% 50% 50%)', rotate: -10, scale: 0.7, opacity: 0, duration: 1, ease: 'power4.inOut' }, '-=0.3');
  };
  $$('.news-card[data-blog]').forEach((c) => c.addEventListener('click', () => openBlog(+c.dataset.blog)));
  mClose.addEventListener('click', closeBlog);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeBlog(); closeContact(); closeArtist(); if (menuOpen) closeMenu(); } });

  /* ---------- Appel + modale contact ---------- */
  const ctaSplit = new Split('.cta-title', { type: 'lines,chars', wordsClass: 'word', charsClass: 'char', linesClass: 'line' });
  K.from(ctaSplit.chars, { yPercent: 110, opacity: 0, duration: 1.4, stagger: 0.012, ease: 'expo.out', scrollTrigger: { trigger: '.before-footer-cta', start: 'top 70%', once: true } });
  const contactModal = $('.modal-contact-us');
  const contactScroll = panelScroll(contactModal);
  let contactOpen = false;
  const openContact = () => { if (contactOpen) return; contactOpen = true; lenis.stop(); contactScroll.on(); K.set(contactModal, { visibility: 'visible' }); K.fromTo(contactModal, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.inOut' }); K.from('.modal-contact-us h1, .modal-contact-us > img, .modal-contact-us form', { y: 60, opacity: 0, stagger: 0.08, duration: 0.8, delay: 0.35, ease: 'power3.out' }); };
  const closeContact = (cb) => { if (!contactOpen) { cb && cb(); return; } contactOpen = false; contactScroll.off(); lenis.start(); K.to(contactModal, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'power4.inOut', onComplete() { K.set(contactModal, { visibility: 'hidden' }); cb && cb(); } }); };
  $('#contactopen').addEventListener('click', openContact);
  $('.close-sidebar-contact').addEventListener('click', () => closeContact());
  const form = $('.modal-contact-us form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const btn = form.querySelector('.cta-submit');
    btn.value = 'Envoi…';
    try {
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
      if (!res.ok) throw new Error('form');
      btn.value = 'Message envoyé';
      setTimeout(() => { closeContact(); form.reset(); btn.value = 'Envoyer'; }, 1200);
    } catch {
      // Hors Netlify : ouverture du client mail avec le message pré-rempli
      const body = `Nom : ${data.get('name')}\nTéléphone : ${data.get('phone')}\nE-mail : ${data.get('email')}\n\n${data.get('message')}`;
      window.location.href = 'mailto:contact@lbvproduction.com?subject=' + encodeURIComponent('Contact via lbvproduction.com') + '&body=' + encodeURIComponent(body);
      btn.value = 'Envoyer';
    }
  });

  /* ---------- Fluide plein écran (encre rouge) ---------- */
  if (window.WebGLFluid && !reduce && fine) {
    try {
      window.WebGLFluid($('#fluid2'), { IMMEDIATE: true, TRIGGER: 'hover', SIM_RESOLUTION: 32, DYE_RESOLUTION: 256, DENSITY_DISSIPATION: 4.2, VELOCITY_DISSIPATION: 3.2, PRESSURE: 0.12, PRESSURE_ITERATIONS: 6, CURL: 1.0, SPLAT_RADIUS: 0.03, SPLAT_FORCE: 1300, SHADING: false, COLORFUL: false, COLOR_UPDATE_SPEED: 0.5, PAUSED: false, BACK_COLOR: { r: 0, g: 0, b: 0 }, TRANSPARENT: true, BLOOM: false, SUNRAYS: false });
      const fluidCanvas = $('#fluid2');
      fluidCanvas.style.pointerEvents = 'none';
      // Le paquet écoute le canvas : on lui relaie les mouvements de la page.
      window.addEventListener('pointermove', (e) => fluidCanvas.dispatchEvent(new MouseEvent('mousemove', { clientX: e.clientX, clientY: e.clientY, bubbles: true })), { passive: true });
    } catch (err) { console.warn('Fluide indisponible', err); }
  } else { const c = $('#fluid2'); if (c) c.remove(); }

  /* ---------- Pied de page : rail qui monte puis défile en boucle, vitesse liée au scroll, colonnes en cascade ---------- */
  const footRail = $('.footer-hit .marquee .rail');
  if (footRail) {
    const rows = footRail.querySelectorAll('.rail-item');
    K.set(rows, { yPercent: 100, opacity: 0 });
    ST.create({ trigger: '.footer-hit', start: 'top 70%', once: true,
      onEnter: () => K.to(rows, { yPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out', stagger: 0.08, overwrite: true }) });
    const marquee = K.to(footRail, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
    let vel = 0;
    lenis.on('scroll', (e) => { vel = e.velocity || 0; });
    const skew = K.quickTo(footRail, 'skewX', { duration: 0.6, ease: 'power3' });
    K.ticker.add(() => { const boost = Math.min(Math.abs(vel) / 10, 4); marquee.timeScale(K.utils.interpolate(marquee.timeScale(), 1 + boost, 0.08)); skew(Math.max(-10, Math.min(10, -vel / 5))); });
    // Le rail se décale légèrement avec le défilement (parallaxe)
    K.fromTo('.footer-hit .marquee', { yPercent: 18 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.footer-hit', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  }
  const footCols = $('.footer-infos > div');
  if (footCols.length) {
    K.set(footCols, { y: 40, opacity: 0 });
    ST.create({ trigger: '.footer-infos', start: 'top 92%', once: true, onEnter: () => K.to(footCols, { y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out' }) });
  }

  /* ---------- Clavier : Entrée / Espace activent les éléments à rôle bouton ---------- */
  document.querySelectorAll('[role="button"]').forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } }));

  /* ---------- Logo LBV en 3D (calque fixe du haut de page) ---------- */
  // Le logo en volume tourne aussi sur téléphone ; il n'est écarté que si l'appareil est manifestement trop juste
  const appareilJuste = (navigator.hardwareConcurrency || 8) <= 3 || (navigator.deviceMemory || 8) <= 2;
  if (window.LBVLogo3D && !reduce && !appareilJuste) window.LBVLogo3D({ container: '.logo-stage', delay: isReload ? 0 : (playLoader ? 5 : 0.5), leaveTrigger: isMobile() ? '.facts-figure-container' : '.box-section-ups' });

  };
  // Polices : on attend au plus 2,5 s (Google Fonts), puis on démarre quoi qu’il arrive
  let started = false; const startOnce = () => { if (!started) { started = true; init(); } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(startOnce);
  setTimeout(startOnce, 2500);

  /* ---------- Rafraîchissements ---------- */
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ST.refresh(), 200); });
  window.addEventListener('load', () => { document.fonts?.ready.then(refresh); refresh(); });
  window.addEventListener('pageshow', () => { if (isReload) window.scrollTo(0, 0); refresh(); });
})();

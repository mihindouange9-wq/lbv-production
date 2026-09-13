/* Logo LBV en 3D — remplace la statue GLB de la référence.
   Contours vectorisés hors ligne (tools/trace-logo.mjs → js/logo-shape.js), lissés, extrudés avec biseau,
   matériau physique laqué avec reflets d'un studio virtuel, étoile en métal clair.
   Mouvements identiques à la référence : entrée par les côtés, culbute, souris, rotation et fuite au défilement. */
window.LBVLogo3D = function (opts) {
  const T = window.THREE, K = window.gsap;
  const holder = document.querySelector(opts.container);
  if (!T || !holder || !window.LBV_LOGO_SHAPE) return;
  const SH = window.LBV_LOGO_SHAPE;
  const mobile = window.innerWidth <= 768;

  /* ---------- Géométrie ---------- */
  const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
  const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
  // Lissage de Chaikin : arrondit les marches de la vectorisation sans perdre la forme
  const chaikin = (pts, n) => { let p = pts; for (let k = 0; k < n; k++) { const out = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = out; } return p; };
  const size = mobile ? 5.6 : 7.4, depth = 0.9;
  const s = size / Math.max(SH.w, SH.h);
  const toV = (p) => new T.Vector2((p[0] - SH.w / 2) * s, -(p[1] - SH.h / 2) * s);
  const outers = [...SH.outers].sort((a, b) => area(b) - area(a));
  const shapeOf = (o) => { const sh = new T.Shape(chaikin(o, 2).map(toV)); SH.holes.filter((hl) => inside(hl[0], o)).forEach((hl) => sh.holes.push(new T.Path(chaikin(hl, 2).map(toV)))); return sh; };
  const extrude = (shapes) => { const g = new T.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelOffset: 0, bevelSegments: 6, curveSegments: 6 }); g.computeVertexNormals(); return g; };
  // Lettres (3 plus grandes formes) et étoile (les autres)
  const letters = outers, star = [];
  const gLetters = extrude(letters.map(shapeOf));
  const gStar = star.length ? extrude(star.map(shapeOf)) : null;
  const bbox = new T.Box3().setFromBufferAttribute(gLetters.attributes.position); const center = new T.Vector3(); bbox.getCenter(center);
  gLetters.translate(-center.x, -center.y, -center.z); if (gStar) gStar.translate(-center.x, -center.y, -center.z);

  /* ---------- Rendu ---------- */
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(35, holder.clientWidth / holder.clientHeight, 0.1, 100);
  cam.position.set(0, 0, mobile ? 20 : 14);
  const rend = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  rend.setSize(holder.clientWidth, holder.clientHeight);
  rend.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  rend.outputEncoding = T.sRGBEncoding;
  rend.toneMapping = T.ACESFilmicToneMapping;
  rend.toneMappingExposure = 0.9;
  rend.physicallyCorrectLights = true;
  holder.appendChild(rend.domElement);

  // Studio virtuel pour les reflets : quelques panneaux lumineux autour d'une pièce sombre
  const studio = new T.Scene();
  studio.background = new T.Color('#050505');
  const panel = (w, h, color, intensity, x, y, z, rx, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); studio.add(m); };
  panel(6, 2, '#fff2e6', 6, 0, 5, 0, Math.PI / 2, 0);        // plafond chaud
  panel(2, 6, '#ffffff', 4, -6, 1, 0, 0, Math.PI / 2);        // côté gauche blanc
  panel(2, 6, '#ff3b3b', 5, 6, 1, 0, 0, -Math.PI / 2);        // côté droit rouge
  panel(8, 3, '#ff1a1a', 3, 0, 0, -6, 0, 0);                  // fond rouge
  panel(3, 1, '#ffffff', 8, 2, 3, 5, -0.4, Math.PI);         // reflet clé
  const pmrem = new T.PMREMGenerator(rend); pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromScene(studio, 0.04).texture;

  const matLetters = new T.MeshPhysicalMaterial({ color: '#8e0000', metalness: 0.3, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1, envMap, envMapIntensity: 0.95, emissive: '#240000', emissiveIntensity: 0.3 });
  const matStar = new T.MeshPhysicalMaterial({ color: '#f5f5f5', metalness: 0.95, roughness: 0.18, clearcoat: 0.6, envMap, envMapIntensity: 2, emissive: '#331111', emissiveIntensity: 0.2 });
  const matBack = new T.MeshPhysicalMaterial({ color: '#7a0000', metalness: 0.5, roughness: 0.3, clearcoat: 0.8, envMap, envMapIntensity: 1.2, emissive: '#200000', emissiveIntensity: 0.4 });

  const makeLogo = (mat) => { const g = new T.Group(); g.add(new T.Mesh(gLetters, mat)); if (gStar) g.add(new T.Mesh(gStar, matStar)); return g; };
  const A = makeLogo(matLetters);
  // Ombre volumique : une copie sombre légèrement en retrait donne de la profondeur sans doublon visible
  const B = makeLogo(matBack); B.scale.set(1.02, 1.02, 0.6); B.position.z = -0.75;

  // Lumières : clé chaude, contre-jour rouge, remplissages rouges (comme la référence, calibrés en mode physique)
  const key = new T.DirectionalLight('#ffe9d6', 1.7); key.position.set(3, 5, 6); scene.add(key);
  const rim = new T.DirectionalLight('#ff2a2a', 4); rim.position.set(-4, 2, -6); scene.add(rim);
  const p1 = new T.PointLight('#ff1f1f', 60, 20, 2); p1.position.set(3, 2, 4); scene.add(p1);
  const p2 = new T.PointLight('#8b0000', 40, 15, 2); p2.position.set(-3, 1, 3); scene.add(p2);
  const p3 = new T.PointLight('#ff0000', 90, 20, 2); p3.position.set(0, 2, -5); scene.add(p3);
  scene.add(new T.HemisphereLight('#5a0a0a', '#000000', 0.5));
  scene.add(new T.AmbientLight('#7a0707', 0.2));

  const group = new T.Group(); scene.add(group);
  const inner = new T.Group(); group.add(inner);
  // Entrée par les côtés (référence) : A vient de la gauche, B de la droite et se cale dos à dos derrière A
  A.position.set(-25, 0, 0); B.position.set(25, 0, -0.75);
  inner.add(A, B);
  group.position.y = mobile ? 0.3 : 1.3; group.position.z = -2.5;
  const delay = opts.delay ?? 5;
  K.to(B.position, { x: 0, duration: 4, ease: 'power4.inOut', delay });
  K.to(A.position, { x: 0, duration: 4, ease: 'power4.inOut', delay });
  K.to(group.rotation, { x: -6.4, delay, duration: 5, ease: 'power2.out' });
  // Respiration : légère oscillation permanente pour que le volume vive
  K.to(inner.rotation, { z: 0.04, y: 0.12, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  K.to(inner.position, { y: 0.18, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  if (!mobile) window.addEventListener('mousemove', (e) => {
    const mx = (e.clientX / window.innerWidth - 0.5) * 2, my = (e.clientY / window.innerHeight - 0.5) * 2;
    K.to(group.rotation, { x: my * 0.08, y: mx * 0.12, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
    K.to(group.position, { x: mx * 0.2, y: 2.3 + my * 0.12, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
  });
  K.to(group.rotation, { y: Math.PI * 10, ease: 'none', scrollTrigger: { trigger: opts.container, start: 'top top', end: '900% top', scrub: true } });
  K.timeline({ scrollTrigger: { trigger: opts.container, start: 'top top', end: () => (window.innerWidth <= 800 ? '270% bottom' : '450% bottom'), scrub: 0.8, invalidateOnRefresh: true } })
    .to(group.position, { z: 1, ease: 'none' }, 0).to(A.rotation, { x: 12.6, ease: 'none' }, 0).to(B.rotation, { x: 12.6, ease: 'none' }, 0);
  K.timeline({ scrollTrigger: { trigger: opts.leaveTrigger || '.box-section-ups', start: 'top top', end: '+=2500', scrub: 0.8, invalidateOnRefresh: true } })
    .to(group.position, { z: -35, y: 12, ease: 'none', duration: 8 }).to(group.position, { y: 20, ease: 'none' });

  // La lumière clé tourne lentement : les reflets glissent sur les faces
  const clock = new T.Clock();
  const tick = () => { const t = clock.getElapsedTime(); key.position.set(Math.sin(t * 0.35) * 4, 5, Math.cos(t * 0.35) * 6); rend.render(scene, cam); requestAnimationFrame(tick); };
  tick();
  window.addEventListener('resize', () => { cam.aspect = holder.clientWidth / holder.clientHeight; cam.updateProjectionMatrix(); rend.setSize(holder.clientWidth, holder.clientHeight); });
};

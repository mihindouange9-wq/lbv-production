/* Logo LBV en 3D — remplace la statue GLB de la référence.
   Le PNG du logo est vectorisé à la volée (marching squares + simplification), extrudé avec three.js,
   puis animé exactement comme le modèle de la référence : deux exemplaires qui entrent par les côtés,
   lumières rouges, suivi de la souris, rotation et éloignement au défilement. */
window.LBVLogo3D = function (opts) {
  const T = window.THREE, K = window.gsap;
  const holder = document.querySelector(opts.container);
  if (!T || !holder) return;

  /* ---------- 1. Vectorisation du PNG ---------- */
  const traceImage = (img, cols, cropBottom) => {
    const w = cols, h = Math.round(cols * (img.naturalHeight * cropBottom) / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * cropBottom, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    // Champ scalaire : luminance × alpha, lissé (le logo est blanc sur fond transparent/noir)
    const f = new Float32Array((w + 2) * (h + 2));
    const W2 = w + 2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = (j * w + i) * 4; f[(j + 1) * W2 + i + 1] = (d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11) / 255 * (d[p + 3] / 255); }
    // Marching squares → segments, puis assemblage en boucles
    const iso = 0.5, segs = [];
    const lerp = (a, b, va, vb) => a + (iso - va) / (vb - va || 1e-6) * (b - a);
    for (let j = 0; j < h + 1; j++) for (let i = 0; i < w + 1; i++) {
      const v0 = f[j * W2 + i], v1 = f[j * W2 + i + 1], v2 = f[(j + 1) * W2 + i + 1], v3 = f[(j + 1) * W2 + i];
      const idx = (v0 > iso ? 8 : 0) | (v1 > iso ? 4 : 0) | (v2 > iso ? 2 : 0) | (v3 > iso ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const top = [lerp(i, i + 1, v0, v1), j], right = [i + 1, lerp(j, j + 1, v1, v2)], bottom = [lerp(i, i + 1, v3, v2), j + 1], left = [i, lerp(j, j + 1, v0, v3)];
      const add = (a, b) => segs.push([a, b]);
      switch (idx) {
        case 1: add(left, bottom); break; case 2: add(bottom, right); break; case 3: add(left, right); break; case 4: add(right, top); break;
        case 5: add(left, top); add(right, bottom); break; case 6: add(bottom, top); break; case 7: add(left, top); break; case 8: add(top, left); break;
        case 9: add(top, bottom); break; case 10: add(top, right); add(bottom, left); break; case 11: add(top, right); break; case 12: add(right, left); break;
        case 13: add(right, bottom); break; case 14: add(bottom, left); break;
      }
    }
    const key = (p) => (Math.round(p[0] * 64)) + ',' + (Math.round(p[1] * 64));
    const byStart = new Map();
    segs.forEach((s, n) => { const k = key(s[0]); (byStart.get(k) || byStart.set(k, []).get(k)).push(n); });
    const used = new Uint8Array(segs.length); const loops = [];
    for (let n = 0; n < segs.length; n++) {
      if (used[n]) continue;
      const loop = [segs[n][0]]; let cur = n; used[n] = 1;
      for (let guard = 0; guard < segs.length; guard++) {
        const end = segs[cur][1]; loop.push(end);
        const cands = (byStart.get(key(end)) || []).filter((m) => !used[m]);
        if (!cands.length) break;
        cur = cands[0]; used[cur] = 1;
        if (key(segs[cur][1]) === key(loop[0])) { used[cur] = 1; break; }
      }
      if (loop.length > 8) loops.push(loop);
    }
    // Simplification (Ramer–Douglas–Peucker)
    const rdp = (pts, eps) => {
      if (pts.length < 4) return pts;
      let dmax = 0, idx = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
      const len = Math.hypot(bx - ax, by - ay) || 1e-6;
      for (let i = 1; i < pts.length - 1; i++) { const dd = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len; if (dd > dmax) { dmax = dd; idx = i; } }
      if (dmax > eps) { const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps); return l.slice(0, -1).concat(r); }
      return [pts[0], pts[pts.length - 1]];
    };
    const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
    const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
    const polys = loops.map((l) => rdp(l, 0.35)).filter((l) => Math.abs(area(l)) > w * h * 0.0008);
    // Extérieurs et trous : un contour contenu dans un autre est un trou
    const outers = [], holes = [];
    polys.forEach((p) => { const parents = polys.filter((q) => q !== p && Math.abs(area(q)) > Math.abs(area(p)) && inside(p[0], q)); (parents.length % 2 === 1 ? holes : outers).push(p); });
    return { outers, holes, w, h, inside };
  };

  /* ---------- 2. Géométrie extrudée ---------- */
  const buildMesh = (trace, size, depth, material) => {
    const { outers, holes, w, h, inside } = trace;
    const s = size / Math.max(w, h);
    const toV = (p) => new T.Vector2((p[0] - w / 2) * s, -(p[1] - h / 2) * s);
    const shapes = outers.map((o) => {
      const sh = new T.Shape(o.map(toV));
      holes.filter((hl) => inside(hl[0], o)).forEach((hl) => sh.holes.push(new T.Path(hl.map(toV))));
      return sh;
    });
    const geo = new T.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: depth * 0.14, bevelSegments: 2, curveSegments: 2 });
    geo.center();
    return new T.Mesh(geo, material);
  };

  /* ---------- 3. Scène (identique à la référence) ---------- */
  const scene = new T.Scene();
  const mobile = window.innerWidth <= 768;
  const cam = new T.PerspectiveCamera(35, holder.clientWidth / holder.clientHeight, 0.1, 100);
  cam.position.set(0, 0, mobile ? 20 : 14);
  const rend = new T.WebGLRenderer({ antialias: !mobile, alpha: true });
  rend.setSize(holder.clientWidth, holder.clientHeight);
  rend.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  holder.appendChild(rend.domElement);
  const light = (color, intensity, dist, x, y, z) => { const l = new T.PointLight(color, intensity, dist, 2); l.position.set(x, y, z); scene.add(l); return l; };
  light('#ff1f1f', 1.6, 15, 0, 2, 5); light('#ff1f1f', 3, 20, 3, 2, 4); light('#8b0000', 2.2, 15, -3, 1, 3); light('#ff0000', 4, 20, 0, 2, -5);
  scene.add(new T.HemisphereLight('#450606', '#000000', 0.9));
  scene.add(new T.AmbientLight('#b90707', 0.25));
  const group = new T.Group(); scene.add(group);
  let A = null, B = null;
  const img = new Image();
  const start = (trace) => {
    if (!trace.outers.length) { console.warn('Logo 3D : aucun contour'); return; }
    A = buildMesh(trace, 5.5, 0.55, new T.MeshStandardMaterial({ color: '#7a0000', metalness: 0.25, roughness: 0.35, emissive: '#2a0000', emissiveIntensity: 0.35 }));
    B = buildMesh(trace, 5.5, 0.55, new T.MeshStandardMaterial({ color: '#8a0000', metalness: 0.45, roughness: 0.2, emissive: '#2a0000', emissiveIntensity: 0.3 }));
    // Un seul logo lisible : les deux exemplaires entrent par les côtés et se superposent (B dos à dos derrière A)
    A.position.set(-25, 3, 0); B.position.set(25, 3, 0); B.rotation.y = Math.PI;
    group.add(A, B); group.position.y = mobile ? -2 : 1;
    const delay = opts.delay ?? 5;
    K.to(B.position, { x: 0, duration: 4, ease: 'power4.inOut', delay });
    K.to(A.position, { x: 0, duration: 4, ease: 'power4.inOut', delay });
    K.to(group.rotation, { x: -6.4, delay, duration: 5, ease: 'power2.out' });
    A.position.y = 0; B.position.y = 0;
    group.position.y = mobile ? 0.3 : 1.3; group.position.z = -2.5;
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
  };
  if (window.LBV_LOGO_SHAPE) {
    const sh = window.LBV_LOGO_SHAPE;
    const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
    start({ outers: sh.outers, holes: sh.holes, w: sh.w, h: sh.h, inside });
  } else {
    img.crossOrigin = 'anonymous';
    img.onload = () => start(traceImage(img, 220, opts.cropBottom || 1));
    img.src = opts.src;
  }
  const tick = () => { rend.render(scene, cam); requestAnimationFrame(tick); };
  tick();
  window.addEventListener('resize', () => { cam.aspect = holder.clientWidth / holder.clientHeight; cam.updateProjectionMatrix(); rend.setSize(holder.clientWidth, holder.clientHeight); });
};

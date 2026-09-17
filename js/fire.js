/* Flammes en shader (WebGL via three.js), rendu proche de la photographie :
   - un champ de densité en bruit fractal déformé (domain warping) qui monte, s'étire et s'amincit avec la hauteur ;
   - des langues qui se détachent et s'éteignent en volutes ;
   - une couleur par température (corps noir) : noir → rouge sombre → orange → jaune → blanc au cœur ;
   - une lueur douce autour des langues (échantillonnage élargi), des braises qui montent, une distorsion de chaleur ;
   - un grain fin qui casse le lissage numérique.
   Un rendu par canvas .fire-canvas, actif seulement quand il est à l'écran. data-flip="1" retourne les flammes (elles pendent). */
window.LBVFire = function (selector) {
  const T = window.THREE;
  if (!T) return;
  // Qualité selon l'appareil : le coût du shader est proportionnel au nombre d'octaves,
  // au nombre d'échantillons de lueur, à la surface rendue et à la cadence.
  const small = window.innerWidth <= 900 || !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const OCTAVES = small ? 4 : 5;
  const SCALE = small ? 0.26 : 0.55;      // pixels rendus par pixel CSS
  const FPS = small ? 20 : 30;
  const frag = `
    precision highp float;
    #define OCTAVES ${OCTAVES}
    varying vec2 vUv;
    uniform float uTime; uniform vec2 uRes; uniform float uFlip; uniform float uSeed;

    vec3 hash3(vec2 p) { vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9))); return fract(sin(q) * 43758.5453); }
    float hash1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash3(i).x, b = hash3(i + vec2(1.0, 0.0)).x, c = hash3(i + vec2(0.0, 1.0)).x, d = hash3(i + vec2(1.0, 1.0)).x;
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    // bruit fractal : 7 octaves, rotation entre les octaves pour casser les alignements
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }
    // Densité de flamme en un point : la matière monte, se tord, s'amincit vers le haut
    float flame(vec2 p, float t) {
      // les flammes s'élèvent : le motif défile vers le bas ; la base est plus lente que les pointes
      float rise = t * 1.35;
      // première déformation : de grands remous lents (le tirage de la flamme)
      vec2 w1 = vec2(fbm(p * 0.9 + vec2(0.0, -rise * 0.55) + uSeed), fbm(p * 0.9 + vec2(5.2, -rise * 0.55) + uSeed));
      // seconde déformation : turbulence plus fine qui tord les langues
      vec2 w2 = vec2(fbm(p * 2.2 + 4.0 * w1 + vec2(1.7, -rise * 1.15)), fbm(p * 2.2 + 4.0 * w1 + vec2(8.3, -rise * 1.15)));
      float n = fbm(p * 1.8 + 3.2 * w2 + vec2(0.0, -rise * 1.6));
      // silhouette : la base est pleine, les langues s'amincissent ; les bords s'effilochent
      float y = p.y;
      float profile = 1.0 - smoothstep(0.0, 1.05, y);
      float tongues = fbm(vec2(p.x * 3.2 + w2.x * 2.0, y * 1.2 - rise * 2.0)) - 0.5;
      float d = n * 0.95 + tongues * 0.55 + profile * 0.85 - 0.62;
      // vacillement d'ensemble : la flamme respire
      d += 0.05 * sin(t * 6.3 + p.x * 4.0) * (1.0 - y);
      return d;
    }
    // Température → couleur (approximation de corps noir, tirée vers le rouge-orangé d'un feu de bois)
    vec3 blackbody(float k) {
      vec3 c = vec3(0.0);
      c = mix(c, vec3(0.32, 0.02, 0.0), smoothstep(0.00, 0.22, k));   // braise sombre
      c = mix(c, vec3(0.86, 0.12, 0.0), smoothstep(0.18, 0.46, k));   // rouge
      c = mix(c, vec3(1.00, 0.44, 0.04), smoothstep(0.40, 0.68, k));  // orange
      c = mix(c, vec3(1.00, 0.80, 0.30), smoothstep(0.62, 0.86, k));  // jaune
      c = mix(c, vec3(1.00, 0.97, 0.88), smoothstep(0.84, 1.00, k));  // presque blanc au cœur
      return c;
    }
    void main() {
      vec2 uv = vUv; if (uFlip > 0.5) uv.y = 1.0 - uv.y;
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2(uv.x * aspect * 1.6, uv.y * 1.35);
      float t = uTime;
      // distorsion de chaleur : l'air tremble au-dessus des flammes
      p.x += 0.012 * sin(p.y * 22.0 + t * 9.0) * smoothstep(0.35, 1.0, uv.y);
      float d = flame(p, t);
      // densité et température : le cœur (densité forte, bas) est plus chaud que les pointes
      float body = smoothstep(0.02, 0.42, d);
      float heat = clamp(d * 1.25 - uv.y * 0.55, 0.0, 1.0);
      heat = pow(heat, 1.35);
      vec3 col = blackbody(heat) * body;
      // lueur : la lumière déborde des langues (échantillons voisins, plus larges vers le haut)
      // deux échantillons suffisent : la lueur est diffuse, l'œil ne voit pas la différence
      float glow = 0.0; float r = 0.035 + 0.05 * uv.y;
      glow += smoothstep(0.0, 0.5, flame(p + vec2(r, r * 0.7), t));
      glow += smoothstep(0.0, 0.5, flame(p - vec2(r, r * 0.7), t));
      glow = glow * 0.5 * (1.0 - body);
      col += vec3(0.62, 0.14, 0.02) * glow * 0.55 * (1.0 - uv.y * 0.6);
      // fumée : au-dessus des langues, une matière sombre et froide se dilue
      float smoke = smoothstep(-0.25, 0.05, d) * (1.0 - body) * smoothstep(0.35, 1.0, uv.y);
      col = mix(col, vec3(0.05, 0.035, 0.03), smoke * 0.35);
      // braises : points qui montent en vacillant, plus denses près de la base
      vec2 ep = vec2(uv.x * aspect * 34.0, uv.y * 26.0 - t * 4.2);
      vec2 ei = floor(ep), ef = fract(ep);
      float h = hash1(ei + uSeed);
      vec2 center = vec2(hash1(ei + 7.1), hash1(ei + 3.7));
      float ember = 1.0 - smoothstep(0.0, 0.09 + 0.06 * h, length(ef - center));
      float emberLife = step(0.86, h) * smoothstep(1.0, 0.15, uv.y) * (0.6 + 0.4 * sin(t * 12.0 + h * 40.0));
      col += vec3(1.0, 0.55, 0.15) * ember * emberLife * 0.9;
      // grain fin
      float grain = (hash1(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.045;
      col += grain * (0.3 + body);
      float alpha = clamp(body * 1.05 + glow * 0.9 + ember * emberLife + smoke * 0.35, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }`;
  document.querySelectorAll(selector).forEach((canvas, k) => {
    const rend = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    rend.setPixelRatio(1);
    const uniforms = { uTime: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uFlip: { value: canvas.dataset.flip === '1' ? 1 : 0 }, uSeed: { value: k * 3.7 + 1.3 } };
    const scene = new T.Scene();
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, depthTest: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }', fragmentShader: frag })));
    const scale = SCALE;
    const resize = () => { const r = canvas.getBoundingClientRect(); const w = Math.max(2, Math.round(r.width * scale)), h = Math.max(2, Math.round(r.height * scale)); rend.setSize(w, h, false); uniforms.uRes.value.set(w, h); };
    resize();
    window.addEventListener('resize', resize);
    const clock = new T.Clock();
    let visible = false, raf = 0;
    // Compilation immédiate : le programme est lourd (bruit à 7 octaves, lueur, fumée) et la compilation bloque le fil principal.
    // Faite ici, elle tombe pendant le préchargeur ; sinon elle tombait au premier passage devant les flammes.
    rend.compile(scene, cam);
    rend.render(scene, cam);
    // Cadence limitée : au-delà de 30 images par seconde, le feu ne gagne rien et vole du temps au défilement
    const interval = 1000 / FPS; let lastDraw = 0;
    const loop = (now) => {
      if (!visible) return;
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < interval) return;
      lastDraw = now;
      uniforms.uTime.value = clock.getElapsedTime();
      rend.render(scene, cam);
    };
    new IntersectionObserver((en) => { const v = en[0].isIntersecting; if (v && !visible) { visible = true; loop(performance.now()); } else if (!v) { visible = false; cancelAnimationFrame(raf); } }, { threshold: 0.01 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { visible = false; cancelAnimationFrame(raf); } });
  });
};

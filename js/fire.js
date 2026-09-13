/* Flammes en shader (WebGL via three.js) : bruit fractal animé, montée des flammes, dégradé noir → rouge → orange → jaune.
   Un rendu par canvas .fire-canvas, actif seulement quand il est à l'écran. data-flip="1" retourne les flammes (elles pendent). */
window.LBVFire = function (selector) {
  const T = window.THREE;
  if (!T) return;
  const frag = `
    precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes; uniform float uFlip;
    vec3 hash3(vec2 p){ vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9))); return fract(sin(q) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash3(i).x, b = hash3(i + vec2(1.0, 0.0)).x, c = hash3(i + vec2(0.0, 1.0)).x, d = hash3(i + vec2(1.0, 1.0)).x;
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= 0.5; } return v; }
    void main(){
      vec2 uv = vUv; if (uFlip > 0.5) uv.y = 1.0 - uv.y;
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2(uv.x * aspect, uv.y);
      float t = uTime;
      // Distorsion horizontale et montée : les flammes ondulent en s'élevant
      float sway = fbm(vec2(p.x * 1.6, p.y * 1.1 - t * 0.8)) * 0.5;
      vec2 q = vec2(p.x * 2.4 + sway, p.y * 3.0 - t * 2.1);
      float n = fbm(q);
      float tongues = fbm(vec2(p.x * 4.5 + sway * 2.0, p.y * 1.6 - t * 2.8));
      float fine = fbm(q * 2.6 + vec2(t * 0.5, -t * 3.2));
      // Forme : langues nettes, noir entre elles, extinction vers le haut
      float shape = n * 0.85 + tongues * 0.75 + fine * 0.25 - uv.y * 1.75 + 0.12;
      float f = smoothstep(0.08, 0.55, shape);
      float hot = smoothstep(0.45, 0.85, shape);
      float core = smoothstep(0.78, 1.05, shape);
      // Couleurs : noir → rouge sombre → rouge vif → orange ; jaune seulement au cœur des langues
      vec3 c = vec3(0.0);
      c = mix(c, vec3(0.30, 0.0, 0.0), smoothstep(0.0, 0.3, f));
      c = mix(c, vec3(0.80, 0.02, 0.03), smoothstep(0.25, 0.7, f));
      c = mix(c, vec3(1.0, 0.22, 0.05), hot);
      c = mix(c, vec3(1.0, 0.62, 0.22), core * 0.7);
      // Braises scintillantes à la base
      float ember = smoothstep(0.0, 0.12, 1.0 - uv.y) * noise(vec2(p.x * 60.0, t * 8.0 + p.y * 30.0));
      c += vec3(0.8, 0.15, 0.0) * ember * 0.5;
      float alpha = clamp(f * 1.15, 0.0, 1.0);
      gl_FragColor = vec4(c, alpha);
    }`;
  document.querySelectorAll(selector).forEach((canvas) => {
    const rend = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    rend.setPixelRatio(1);
    const uniforms = { uTime: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uFlip: { value: canvas.dataset.flip === '1' ? 1 : 0 } };
    const scene = new T.Scene();
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, depthTest: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }', fragmentShader: frag })));
    const resize = () => { const r = canvas.getBoundingClientRect(); const w = Math.max(2, Math.round(r.width * 0.6)), h = Math.max(2, Math.round(r.height * 0.6)); rend.setSize(w, h, false); uniforms.uRes.value.set(w, h); };
    resize();
    window.addEventListener('resize', resize);
    const clock = new T.Clock();
    let visible = false, raf = 0;
    const loop = () => { if (!visible) return; uniforms.uTime.value = clock.getElapsedTime(); rend.render(scene, cam); raf = requestAnimationFrame(loop); };
    new IntersectionObserver((en) => { const v = en[0].isIntersecting; if (v && !visible) { visible = true; loop(); } else if (!v) { visible = false; cancelAnimationFrame(raf); } }, { threshold: 0.01 }).observe(canvas);
  });
};

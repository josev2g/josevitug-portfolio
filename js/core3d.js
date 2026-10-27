/* The "automation core": one procedural Three.js model shared by About, Services and Case Studies.
   Scroll state (x, rotY, rotX, scale, opacity, pulse) comes from window.coreScroll (main.js). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const canvas = document.getElementById('coreCanvas');
const fallback = document.getElementById('coreFallback');
const zone = document.getElementById('coreZone');
const mobile = matchMedia('(max-width: 767px)').matches;
const seg = mobile ? 0.6 : 1; // geometry detail multiplier

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch {
  document.documentElement.classList.add('no-webgl');
}

if (renderer) init();
else runFallback();

function runFallback() {
  const tick = () => {
    const s = window.coreScroll;
    fallback.style.opacity = s ? s.opacity : 0.25;
    if (s && !mobile) fallback.style.left = `${50 + s.x * 100}%`;
    requestAnimationFrame(tick);
  };
  tick();
}

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.25, 6.9);
  camera.lookAt(0, 0, 0);

  // Lighting: soft white key, cyan rim from behind, small mint accent.
  const key = new THREE.DirectionalLight(0xe8edf5, 1.6);
  key.position.set(-3, 4, 4);
  const rim = new THREE.PointLight(0x60bce7, 30, 12);
  rim.position.set(2.5, 1.5, -3);
  const mint = new THREE.PointLight(0x10e891, 6, 8);
  mint.position.set(-2.5, -2, 1.5);
  scene.add(key, rim, mint, new THREE.AmbientLight(0x1a1f2b, 0.6));

  // Materials
  const brushed = new THREE.MeshPhysicalMaterial({
    color: 0xa3abb8, metalness: 1, roughness: 0.32, anisotropy: 0.7, envMapIntensity: 1.2
  });
  const gunmetal = new THREE.MeshPhysicalMaterial({
    color: 0x626a78, metalness: 1, roughness: 0.4, anisotropy: 0.5, envMapIntensity: 1
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xcfeeff, metalness: 0, roughness: 0.28, transmission: 1, thickness: 0.12, ior: 1.45,
    attenuationColor: new THREE.Color(0x60bce7), attenuationDistance: 1.2, clearcoat: 1, clearcoatRoughness: 0.2,
    envMapIntensity: 1.2
  });
  const glow = new THREE.MeshStandardMaterial({ color: 0x0a1a24, emissive: 0x60bce7, emissiveIntensity: 2.2 });
  const glowMint = new THREE.MeshStandardMaterial({ color: 0x06140e, emissive: 0x10e891, emissiveIntensity: 1.6 });

  const core = new THREE.Group();
  scene.add(core);

  // --- Gear geometry: toothed disc with lightening holes, beveled extrusion.
  function gearGeometry(r, teeth, depth, thick, holeR, holes) {
    const shape = new THREE.Shape();
    const steps = teeth * 4;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const rr = (i % 4 === 1 || i % 4 === 2) ? r : r - depth;
      i === 0 ? shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const axle = new THREE.Path().absarc(0, 0, holeR, 0, Math.PI * 2, true);
    shape.holes.push(axle);
    for (let i = 0; i < holes; i++) {
      const a = (i / holes) * Math.PI * 2;
      const d = (holeR + r - depth) / 2;
      const hr = (r - depth - holeR) * 0.3;
      shape.holes.push(new THREE.Path().absarc(Math.cos(a) * d, Math.sin(a) * d, hr, 0, Math.PI * 2, true));
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thick, bevelEnabled: true, bevelThickness: thick * 0.15, bevelSize: thick * 0.12,
      bevelSegments: 2, curveSegments: Math.round(24 * seg)
    });
    g.center();
    return g;
  }

  const gears = [];
  function addGear(r, teeth, opts) {
    const g = new THREE.Mesh(gearGeometry(r, teeth, r * 0.13, opts.thick ?? 0.06, r * 0.22, opts.holes ?? 5), opts.mat ?? brushed);
    g.position.copy(opts.pos);
    g.rotation.set(...(opts.rot ?? [0, 0, 0]));
    // Hub cap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, (opts.thick ?? 0.06) * 1.8, 32), gunmetal);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    core.add(g);
    gears.push({ mesh: g, speed: opts.speed, axis: opts.axis ?? 'z' });
    return g;
  }

  // Side gear train (left face, like the concept) + inner horizontal gears on the spindle.
  addGear(0.46, 24, { pos: new THREE.Vector3(-0.62, -0.05, 0.42), rot: [0, -0.75, 0], speed: 0.25, thick: 0.08, holes: 6 });
  addGear(0.26, 14, { pos: new THREE.Vector3(-0.2, -0.12, 0.7), rot: [0, -0.4, 0], speed: -0.43, mat: gunmetal });
  addGear(0.2, 11, { pos: new THREE.Vector3(0.55, -0.55, 0.45), rot: [0, 0.7, 0], speed: 0.55 });
  addGear(0.3, 18, { pos: new THREE.Vector3(0.62, 0.25, -0.3), rot: [0, 1.9, 0], speed: -0.35, mat: gunmetal });
  addGear(0.42, 26, { pos: new THREE.Vector3(0, -0.02, 0), rot: [Math.PI / 2, 0, 0], speed: 0.2, axis: 'z', holes: 6 });
  addGear(0.34, 20, { pos: new THREE.Vector3(0, -0.42, 0), rot: [Math.PI / 2, 0, 0], speed: -0.27, axis: 'z', mat: gunmetal });

  // --- Central spindle with glowing core and bearing rings.
  const spindle = new THREE.Group();
  spindle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.1, 40), brushed));
  const coreLight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.14, 16), glow);
  spindle.add(coreLight);
  [-0.95, -0.82, 0.86, 0.98].forEach((y, i) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.015, 0.2 - i * 0.015, 0.05, 40), i % 2 ? gunmetal : brushed);
    ring.position.y = y;
    spindle.add(ring);
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 48), brushed);
  cap.position.y = 0.92;
  spindle.add(cap);
  core.add(spindle);

  // --- Layered frosted-glass circuit plates (partial annuli) with glowing traces and nodes.
  const plates = [];
  const traceMats = [];
  const nodeGeo = new THREE.SphereGeometry(0.018, 10, 8);
  [0.66, 0.38, 0.1, -0.22, -0.58].forEach((y, i) => {
    const outer = Math.sqrt(1 - y * y) * 0.98;
    const inner = Math.max(0.28, outer * 0.48);
    const span = Math.PI * (1.1 + (i % 3) * 0.3);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, span, false);
    shape.absarc(0, 0, inner, span, 0, true);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.045, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: Math.round(64 * seg)
    });
    geo.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(geo, glass);
    const pg = new THREE.Group();
    pg.position.y = y;
    pg.rotation.y = i * 1.3;
    pg.add(plate);

    // Circuit traces: arcs at a few radii joined by radial jogs, sitting on the plate's top face.
    const mat = glow.clone();
    traceMats.push(mat);
    const tubes = [];
    for (let k = 0; k < 3; k++) {
      const r1 = inner + (outer - inner) * (0.25 + k * 0.25);
      const r2 = inner + (outer - inner) * (0.25 + ((k + 1) % 3) * 0.25);
      const a0 = span * (0.08 + k * 0.1), a1 = span * (0.45 + k * 0.12), a2 = Math.min(span * 0.95, a1 + span * 0.25);
      const pts = [];
      for (let s = 0; s <= 12; s++) { const a = a0 + (a1 - a0) * s / 12; pts.push(new THREE.Vector3(Math.cos(a) * r1, 0.06, -Math.sin(a) * r1)); }
      for (let s = 0; s <= 12; s++) { const a = a1 + (a2 - a1) * s / 12; pts.push(new THREE.Vector3(Math.cos(a) * r2, 0.06, -Math.sin(a) * r2)); }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), Math.round(60 * seg), 0.0065, 6));
      [pts[0], pts[12], pts[13], pts[pts.length - 1]].forEach(p => {
        const n = new THREE.Mesh(nodeGeo, mat);
        n.position.copy(p);
        pg.add(n);
      });
    }
    pg.add(new THREE.Mesh(mergeGeometries(tubes), mat));
    core.add(pg);
    plates.push({ group: pg, speed: (i % 2 ? -1 : 1) * (0.06 + i * 0.015) });
  });

  // --- Outer meridian bands (brushed metal) with mint emissive inserts.
  const bands = new THREE.Group();
  const bandMat = new THREE.MeshPhysicalMaterial({ color: 0x8a92a0, metalness: 1, roughness: 0.36, anisotropy: 0.8, side: THREE.DoubleSide });
  // [rotation around Y, tilt, arc length]; each arc is centered on the sphere's side (x = r, y = 0)
  [[0.2, 0.0, 2.6], [Math.PI * 0.75, 0.25, 2.2], [Math.PI * 1.35, -0.2, 2.4]].forEach(([ry, tilt, len]) => {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(1.08, 1.08, 0.14, Math.round(96 * seg), 1, true, Math.PI / 2 - len / 2, len),
      bandMat
    );
    band.rotation.x = Math.PI / 2; // cylinder axis now points at the camera, so the band is a vertical meridian arc
    const holder = new THREE.Group();
    holder.rotation.set(tilt, ry, 0);
    holder.add(band);
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 - len / 2 + len * (0.2 + k * 0.3);
      const x = Math.sin(a) * 1.1, y = -Math.cos(a) * 1.1; // same mapping as the rotated cylinder
      const insert = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.16), glowMint);
      insert.position.set(x, y, 0);
      insert.rotation.z = Math.atan2(y, x) + Math.PI / 2;
      holder.add(insert);
    }
    bands.add(holder);
  });
  core.add(bands);

  // --- Soft glow halo behind the core (cheap stand-in for bloom).
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(96,188,231,0.55)'); grd.addColorStop(0.4, 'rgba(96,188,231,0.12)'); grd.addColorStop(1, 'rgba(96,188,231,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(4.2, 4.2, 1);
  halo.position.z = -0.8;
  scene.add(halo);

  // --- Resize + viewport math so core.x is a fraction of the visible width.
  let halfW = 1;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 46 : 32;
    camera.updateProjectionMatrix();
    halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
  }
  addEventListener('resize', resize);
  resize();

  // --- Render loop. Smoothly chase the scroll state; skip work while invisible.
  const s = window.coreScroll;
  const cur = { x: s ? s.x : 0, rotY: 0, rotX: 0.25, scale: 1, opacity: 0, pulse: 0 };
  const clock = new THREE.Clock();
  let zoneVisible = false;
  new IntersectionObserver(([e]) => { zoneVisible = e.isIntersecting; }).observe(zone);

  if (!s) {
    // Reduced motion: one static frame, centered, dimmed behind content.
    cur.x = 0; cur.opacity = 0.25;
    const draw = () => { core.position.x = 0; core.rotation.set(0.25, 0.6, 0); renderer.render(scene, camera); };
    canvas.style.opacity = 0;
    new IntersectionObserver(([e]) => { canvas.style.opacity = e.isIntersecting ? 0.25 : 0; }).observe(zone);
    addEventListener('resize', draw);
    draw();
    return;
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = 1 - Math.pow(0.0015, dt); // ~1.5s settle on top of Lenis

    cur.x += (s.x - cur.x) * k;
    cur.rotY += (s.rotY - cur.rotY) * k;
    cur.rotX += (s.rotX - cur.rotX) * k;
    cur.scale += (s.scale - cur.scale) * k;
    cur.opacity += (s.opacity - cur.opacity) * k;
    s.pulse = Math.max(0, s.pulse - dt * 0.6);
    cur.pulse += (s.pulse - cur.pulse) * Math.min(1, dt * 6);

    canvas.style.opacity = cur.opacity.toFixed(3);
    if (!zoneVisible || cur.opacity < 0.01) return;

    core.position.x = cur.x * halfW * 2;
    core.rotation.set(cur.rotX, cur.rotY + t * 0.05, 0);
    const sc = cur.scale * (mobile ? 0.82 : 1);
    core.scale.setScalar(sc);
    halo.position.x = core.position.x;
    halo.material.opacity = 0.6 + cur.pulse * 0.6;

    gears.forEach(g => { g.mesh.rotation[g.axis] += g.speed * dt; });
    plates.forEach(p => { p.group.rotation.y += p.speed * dt; });
    traceMats.forEach((m, i) => { m.emissiveIntensity = 1.6 + Math.sin(t * 1.4 + i * 1.1) * 0.5 + cur.pulse * 3.2; });
    glow.emissiveIntensity = 2 + cur.pulse * 3;
    glowMint.emissiveIntensity = 1.4 + cur.pulse * 1.5;
    rim.intensity = 30 + cur.pulse * 40;

    renderer.render(scene, camera);
  }
  frame();
}

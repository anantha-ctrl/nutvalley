import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { skinMaterial } from './skin';

/**
 * Procedural 3D nuts — modelled in code so the landing page has real 3D product
 * visuals without shipping any model files. Each kind is built once (geometry +
 * material are cached and shared by every mesh of that kind).
 *
 * Kinds: almond, cashew, pistachio, walnut, date, raisin, seed, apricot.
 */

export const KINDS = ['almond', 'cashew', 'pistachio', 'walnut', 'date', 'raisin', 'seed', 'apricot'];

/* ── tiny deterministic 3D value noise (no deps) ── */
const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t) => t * t * (3 - 2 * t);
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}
const fbm = (x, y, z, oct = 4) => {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return v;
};

/** Displace vertices along their normals and bake a mottled vertex colour. */
function finish(geo, { base, dark, disp = () => 0, tint = () => 0 }) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const cBase = new THREE.Color(base), cDark = new THREE.Color(dark), c = new THREE.Color();
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const d = disp(p);
    p.addScaledVector(n, d);
    pos.setXYZ(i, p.x, p.y, p.z);
    c.copy(cBase).lerp(cDark, THREE.MathUtils.clamp(tint(p, d), 0, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ── individual nut builders (unit-ish size, ~1 across) ── */

function almond() {
  // Teardrop lathe profile, flattened — pointed tip, round base, fine lengthwise grooves.
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const r = Math.sin(Math.PI * t) ** 0.85 * (1 - 0.42 * t) * 0.5;
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), (t - 0.45) * 1.55));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.scale(1, 1, 0.56);
  // Real almonds are slightly curved and fuller on one side.
  const ap = geo.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    const y = ap.getY(i), x = ap.getX(i);
    ap.setX(i, x * (x > 0 ? 1.06 : 0.95) + 0.07 * (y + 0.2) ** 2);
  }
  return finish(geo, {
    base: '#a35f2f', dark: '#5c2c10',
    disp: (p) => (fbm(p.x * 9, p.y * 2.2, p.z * 9) - 0.5) * 0.035 + Math.sin(Math.atan2(p.z, p.x) * 22) * 0.004,
    tint: (p) => fbm(p.x * 6 + 3, p.y * 9, p.z * 6) * 1.1 - 0.15,
  });
}

function cashew() {
  // Kidney "C" — sweep a circle along an arc with a radius that swells mid-way.
  const geo = new THREE.BufferGeometry();
  const seg = 56, rad = 28, pos = [], idx = [];
  const arc = Math.PI * 1.18, R = 0.48;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = -arc / 2 + arc * t;
    const cx = Math.cos(a) * R, cy = Math.sin(a) * R;
    const nx = Math.cos(a), ny = Math.sin(a);            // outward normal in-plane
    const swell = Math.sin(Math.PI * t) ** 0.42;
    // Tapers to 0 at both tips so the ends close; one end plumper, like a real cashew.
    const r = (0.215 + (t < 0.5 ? 0.0 : 0.035)) * swell;
    for (let j = 0; j <= rad; j++) {
      const b = (j / rad) * Math.PI * 2;
      // Shallow seam along the outer curve where the two halves of the kernel meet.
      const sb = Math.sin(b);
      const seam = Math.cos(b) > 0 ? 1 - 0.07 * Math.exp(-(sb * sb) / 0.006) : 1;
      const ox = Math.cos(b) * r * seam, oz = sb * r * 0.82;
      pos.push(cx + nx * ox, cy + ny * ox, oz);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.rotateZ(Math.PI / 2);
  return finish(geo, {
    base: '#e4c48b', dark: '#a46d34',
    disp: (p) => (fbm(p.x * 7, p.y * 7, p.z * 7) - 0.5) * 0.018,
    tint: (p) => fbm(p.x * 4, p.y * 4 + 7, p.z * 4) * 1.1 - 0.2,
  });
}

function pistachioShell() {
  const geo = new THREE.SphereGeometry(0.5, 48, 32);
  geo.scale(0.78, 1, 0.66);
  return finish(geo, {
    base: '#d6b27e', dark: '#8a6236',
    disp: (p) => (fbm(p.x * 8, p.y * 8, p.z * 8) - 0.5) * 0.02
      // the open seam along one side
      - Math.max(0, 0.06 - Math.abs(p.x) * 0.9) * (p.z > 0 ? 1 : 0),
    tint: (p) => fbm(p.x * 5, p.y * 5, p.z * 5 + 2) * 1.1 - 0.3,
  });
}
function pistachioKernel() {
  const geo = new THREE.SphereGeometry(0.34, 32, 24);
  geo.scale(0.72, 1.05, 0.7);
  return finish(geo, {
    base: '#8db342', dark: '#5f2d3a',
    disp: (p) => (fbm(p.x * 10, p.y * 10, p.z * 10) - 0.5) * 0.02,
    tint: (p) => (fbm(p.x * 6, p.y * 6, p.z * 6) > 0.62 ? 0.55 : 0.05), // purple skin flecks
  });
}

function walnut() {
  // Walnut kernel half: heart-shaped outline of two lobes split by a deep centre
  // valley, covered in sharp brain-like folds; flat back; pale crests, dark grooves.
  const geo = new THREE.SphereGeometry(0.5, 128, 96);
  geo.scale(1, 0.86, 0.7);
  const wp = geo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i);
    let y = wp.getY(i), z = wp.getZ(i);
    const mid = Math.exp(-(x * x) / 0.012);
    if (y > 0) y -= 0.09 * mid;            // notch at the top -> heart outline
    else y += 0.05 * mid;                  // and a smaller one at the bottom
    if (z < -0.1) z = -0.1 + (z + 0.1) * 0.2; // flat back of a half kernel
    wp.setXYZ(i, x, y, z);
  }
  return finish(geo, {
    base: '#c48b4c', dark: '#43220a',
    disp: (p) => {
      const n = fbm(p.x * 4.6, p.y * 6.8, p.z * 4.6 + 11);
      const crest = 1 - Math.abs(n - 0.47) * 2.6;               // 1 on a fold, <0 in a groove
      const folds = Math.max(crest, 0) ** 2 * 0.12 - 0.05;
      const valley = Math.exp(-(p.x * p.x) / 0.004) * (p.z > -0.06 ? 0.15 : 0.04);
      return folds - valley;
    },
    tint: (_p, d) => 0.5 - d * 7.5,
  });
}

function date() {
  const geo = new THREE.SphereGeometry(0.5, 56, 40);
  geo.scale(0.5, 1, 0.48);
  return finish(geo, {
    base: '#6b2e14', dark: '#2a0f05',
    disp: (p) => (fbm(p.x * 6, p.y * 12, p.z * 6) - 0.5) * 0.06, // wrinkled skin
    tint: (p) => fbm(p.x * 3, p.y * 3, p.z * 3) * 1.2 - 0.2,
  });
}

function raisin() {
  // Icosahedron is non-indexed (flat facets) — weld it so the skin shades smoothly.
  const ico = new THREE.IcosahedronGeometry(0.32, 5);
  ico.deleteAttribute('normal'); // per-face normals/uvs would stop the weld
  ico.deleteAttribute('uv');
  const geo = mergeVertices(ico);
  geo.scale(1, 0.8, 0.85);
  return finish(geo, {
    base: '#4a1c22', dark: '#140508',
    disp: (p) => (fbm(p.x * 9, p.y * 9, p.z * 9) - 0.5) * 0.12,
    tint: (_p, d) => 0.5 - d * 5,
  });
}

function seed() {
  // Pumpkin seed — flat oval with a pointed end.
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    pts.push(new THREE.Vector2(Math.max(Math.sin(Math.PI * t) ** 0.7 * (1 - 0.35 * t) * 0.36, 0.0001), (t - 0.5) * 1.1));
  }
  const geo = new THREE.LatheGeometry(pts, 36);
  geo.scale(1, 1, 0.28);
  return finish(geo, {
    base: '#7d9a3c', dark: '#3f5a1c',
    disp: (p) => (fbm(p.x * 10, p.y * 10, p.z * 10) - 0.5) * 0.012,
    tint: (p) => fbm(p.x * 5, p.y * 5, p.z * 5) * 1.2 - 0.3,
  });
}

function apricot() {
  const geo = new THREE.SphereGeometry(0.42, 56, 40);
  geo.scale(1, 0.92, 0.36); // dried apricots are pressed flat
  return finish(geo, {
    base: '#e8832a', dark: '#9a3d12',
    disp: (p) => (fbm(p.x * 5, p.y * 5, p.z * 5) - 0.5) * 0.07,
    tint: (p) => fbm(p.x * 4, p.y * 4, p.z * 4) * 1.2 - 0.25,
  });
}

/* ── caches + public API ── */
let cache = null;
function build() {
  const cream = new THREE.Color('#fff2d0');
  cache = {
    almond: { geo: almond(), mat: skinMaterial('almond', { roughness: 0.72, clearcoat: 0.12, clearcoatRoughness: 0.6 }) },
    cashew: { geo: cashew(), mat: skinMaterial('cashew', { roughness: 0.62, sheen: 0.5, sheenRoughness: 0.6, sheenColor: cream }) },
    pistachio: [
      { geo: pistachioShell(), mat: skinMaterial('pistachioShell', { roughness: 0.66, clearcoat: 0.08 }) },
      { geo: pistachioKernel(), mat: skinMaterial('pistachioKernel', { roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color('#d8f0a0') }), offset: [0, 0.02, 0.06] },
    ],
    walnut: { geo: walnut(), mat: skinMaterial('walnut', { roughness: 0.78 }) },
    date: { geo: date(), mat: skinMaterial('date', { roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.3 }) },
    raisin: { geo: raisin(), mat: skinMaterial('raisin', { roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.45 }) },
    seed: { geo: seed(), mat: skinMaterial('seed', { roughness: 0.58, clearcoat: 0.1 }) },
    apricot: { geo: apricot(), mat: skinMaterial('apricot', { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 }) },
  };
  return cache;
}

/** A ready-to-place Object3D for one nut of the given kind. */
export function makeNut(kind) {
  const parts = (cache || build())[kind] || cache.almond;
  if (!Array.isArray(parts)) return new THREE.Mesh(parts.geo, parts.mat);
  const g = new THREE.Group();
  for (const p of parts) {
    const m = new THREE.Mesh(p.geo, p.mat);
    if (p.offset) m.position.set(...p.offset);
    g.add(m);
  }
  return g;
}

/** Cinematic three-point studio lighting tuned for warm, food-photography tones. */
const envCache = new WeakMap();
/** Soft studio reflections (pre-filtered RoomEnvironment) — what makes gloss and skin read as real. */
export function addEnvironment(scene, renderer, intensity = 0.55) {
  let env = envCache.get(renderer);
  if (!env) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    envCache.set(renderer, env);
  }
  scene.environment = env;
  scene.environmentIntensity = intensity;
}

export function addStudioLights(scene, { rim = '#e3bd5b' } = {}) {
  scene.add(new THREE.HemisphereLight('#fff4dc', '#1a4d23', 0.45));
  const key = new THREE.DirectionalLight('#ffe6bf', 2.4);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(rim, 2.2);
  rimLight.position.set(5, 2, -6);
  scene.add(rimLight);
  const fill = new THREE.DirectionalLight('#cfe3c0', 0.6);
  fill.position.set(6, -3, 4);
  scene.add(fill);
}

/** Maps a category / product slug or name to the nut kind that best represents it. */
export function kindFor(text = '') {
  const s = String(text).toLowerCase();
  if (/almond|badam/.test(s)) return 'almond';
  if (/cashew|kaju/.test(s)) return 'cashew';
  if (/pista/.test(s)) return 'pistachio';
  if (/walnut|akhrot/.test(s)) return 'walnut';
  if (/date|khajur|medjool|ajwa/.test(s)) return 'date';
  if (/raisin|kishmish|fig|anjeer|prune|berr/.test(s)) return 'raisin';
  if (/apricot/.test(s)) return 'apricot';
  if (/seed|chia|flax|pumpkin|sunflower/.test(s)) return 'seed';
  if (/dried|dry.?fruit/.test(s)) return 'apricot';
  return 'mix';
}

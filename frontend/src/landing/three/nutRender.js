import * as THREE from 'three';
import { makeNut, addStudioLights, addEnvironment, KINDS } from './nuts';

/**
 * Renders a studio "pile" of one nut kind to a transparent PNG data-URL, using a
 * single shared offscreen WebGL renderer (so a page full of cards never runs out
 * of WebGL contexts). Results are cached per kind+size and queued, so cards can
 * call `renderNut()` freely.
 */

const cache = new Map();
let renderer = null;
let queue = Promise.resolve();

function getRenderer() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

let shadowTex = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(40,25,10,0.42)');
  grad.addColorStop(0.55, 'rgba(40,25,10,0.14)');
  grad.addColorStop(1, 'rgba(40,25,10,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

// Seeded PRNG so each kind always renders the same composition.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function pile(kind, seed) {
  const rand = rng(seed);
  const group = new THREE.Group();
  const kinds = kind === 'mix' ? ['almond', 'cashew', 'pistachio', 'walnut', 'raisin', 'date'] : [kind];
  const count = kind === 'date' || kind === 'apricot' ? 9 : kind === 'raisin' || kind === 'seed' ? 22 : 14;
  // Mound: nuts spiral outward and downward from a top centre.
  for (let i = 0; i < count; i++) {
    const n = makeNut(kinds[i % kinds.length]);
    const a = i * 2.399 + rand() * 0.4;            // golden-angle spiral
    const r = Math.sqrt(i / count) * 1.55;
    n.position.set(Math.cos(a) * r, 0.9 - r * 0.62 + rand() * 0.12, Math.sin(a) * r * 0.75);
    n.rotation.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI);
    n.scale.setScalar(0.9 + rand() * 0.25);
    group.add(n);
  }
  // Hero nut on top, upright and slightly larger.
  const hero = makeNut(kinds[0]);
  hero.position.set(0.05, 1.25, 0.35);
  hero.rotation.set(-0.35, 0.5, 0.25);
  hero.scale.setScalar(1.35);
  group.add(hero);
  return group;
}

function draw(kind, w, h) {
  const r = getRenderer();
  r.setSize(w, h, false);
  const scene = new THREE.Scene();
  addStudioLights(scene);
  addEnvironment(scene, r, 0.6);
  const group = pile(kind, (KINDS.indexOf(kind) + 3) * 7919);
  scene.add(group);
  // Soft contact shadow under the pile — a radial falloff, not a hard disc.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.3;
  scene.add(shadow);

  // Frame the whole pile whatever the aspect: back off further on narrow frames.
  const aspect = w / h;
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
  const dist = 8.2 / Math.min(1, aspect + 0.15);
  camera.position.set(0, dist * 0.36, dist);
  camera.lookAt(0, 0.4, 0);
  r.render(scene, camera);
  const url = r.domElement.toDataURL('image/png');
  shadow.geometry.dispose();
  shadow.material.dispose();
  return url;
}

/** Promise<dataURL> of a rendered pile for `kind` ('mix' = assorted). */
export function renderNut(kind = 'mix', w = 600, h = 750) {
  const key = `${kind}:${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const p = (queue = queue.then(() => new Promise((resolve) => {
    // Yield between renders so the page stays responsive while cards appear.
    const run = () => {
      try { resolve(draw(kind, w, h)); } catch { resolve(null); }
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 16)))(run);
  })));
  cache.set(key, p);
  return p;
}

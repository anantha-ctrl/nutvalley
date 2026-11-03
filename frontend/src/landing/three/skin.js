import * as THREE from 'three';

/**
 * Photoreal "skin" for the procedural nuts: per-pixel 3D-noise bump + colour/
 * roughness variation injected into MeshPhysicalMaterial. Works in object space,
 * so it needs no UVs or texture files and stays sharp at any zoom.
 *
 * Each recipe defines, in GLSL, for an object-space point `p` (nut ≈ 1 unit):
 *   height — surface relief (veins, wrinkles, pits…), bump — its strength,
 *   tone   — -1..1 darkening/lightening of the base colour,
 *   rough  — extra roughness variation.
 */

// Simplex noise — Stefan Gustavson / Ian McEwan (Ashima Arts), MIT licence.
const NOISE = /* glsl */ `
vec3 nv_mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 nv_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 nv_perm(vec4 x) { return nv_mod289(((x * 34.0) + 10.0) * x); }
vec4 nv_tis(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float nv_snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = nv_mod289(i);
  vec4 p = nv_perm(nv_perm(nv_perm(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = nv_tis(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float nv_fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * nv_snoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
// 1 on the crest of a fold, falling to 0 between folds (veins, wrinkles, convolutions).
float nv_ridge(vec3 p) { float r = 1.0 - abs(nv_snoise(p)); return r * r; }
float nv_ridgeFbm(vec3 p) {
  float v = 0.0, a = 0.6;
  for (int i = 0; i < 2; i++) { v += a * nv_ridge(p); p *= 2.1; a *= 0.45; }
  return v;
}
// Detail levels from the on-screen size of the surface (object units per pixel):
// fine (>=20/unit) and mid (~8-14/unit) relief fade out before they alias into sparkle.
float nvFine = 1.0;
float nvMid = 1.0;

// Screen-space bump (same maths as three.js perturbNormalArb).
vec3 nv_perturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surfPos));
  vec3 sy = normalize(dFdy(surfPos));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

export const SKINS = {
  // Fine lengthwise veins + pitted skin; veins a touch darker.
  almond: {
    height: 'nv_ridgeFbm(vec3(p.x * 11.0, p.y * 3.2, p.z * 11.0)) * 0.7 * nvMid + nv_fbm(p * 42.0) * 0.18 * nvFine',
    bump: 4.2,
    tone: 'nv_fbm(vec3(p.x * 6.0, p.y * 2.0, p.z * 6.0)) * 0.35 - nv_ridge(vec3(p.x * 11.0, p.y * 3.2, p.z * 11.0)) * 0.22 * nvMid',
    rough: 'nv_fbm(p * 20.0) * 0.08 * nvFine',
  },
  // Smooth, matte, faintly speckled; slightly darker at the tips.
  cashew: {
    height: 'nv_fbm(p * 24.0) * 0.3 * nvFine',
    bump: 1.5,
    tone: 'nv_fbm(p * 5.0) * 0.12 - smoothstep(0.55, 0.9, nv_snoise(p * 38.0)) * 0.18 * nvFine - smoothstep(0.35, 0.55, abs(p.y)) * 0.15',
    rough: 'nv_fbm(p * 12.0) * 0.06 * nvMid',
  },
  // Shell: fine growth ridges around it + mottled beige.
  pistachioShell: {
    height: 'sin(p.y * 46.0 + nv_fbm(p * 4.0) * 4.0) * 0.12 * nvFine + nv_fbm(p * 30.0) * 0.28 * nvFine',
    bump: 2.6,
    tone: 'nv_fbm(p * 6.0) * 0.3 + nv_fbm(p * 18.0) * 0.1 * nvMid',
    rough: 'nv_fbm(p * 10.0) * 0.08 * nvMid',
  },
  pistachioKernel: {
    height: 'nv_fbm(p * 28.0) * 0.3 * nvFine',
    bump: 1.6,
    tone: 'nv_fbm(p * 7.0) * 0.25',
    rough: '0.0',
  },
  // Folds come from the geometry; the skin adds the fine papery texture of the pellicle.
  walnut: {
    height: 'nv_fbm(p * 30.0) * 0.25 * nvFine + nv_ridge(p * 14.0) * 0.3 * nvMid',
    bump: 2.4,
    tone: 'nv_fbm(p * 3.0) * 0.12 + nv_fbm(p * 20.0) * 0.1 * nvFine',
    rough: '0.0',
  },
  // Glossy skin with long wrinkles; wrinkle troughs darker and less glossy.
  date: {
    height: 'nv_ridgeFbm(vec3(p.x * 13.0, p.y * 4.5, p.z * 13.0)) * 0.75 * nvMid + nv_fbm(p * 30.0) * 0.12 * nvFine',
    bump: 3.4,
    tone: 'nv_fbm(p * 3.0) * 0.3 + (nv_ridge(vec3(p.x * 13.0, p.y * 4.5, p.z * 13.0)) - 0.5) * 0.3 * nvMid',
    rough: '(0.5 - nv_ridge(vec3(p.x * 13.0, p.y * 4.5, p.z * 13.0))) * 0.25 * nvMid',
  },
  raisin: {
    height: 'nv_ridgeFbm(p * 11.0) * 0.9 * nvMid + nv_fbm(p * 32.0) * 0.12 * nvFine',
    bump: 4.0,
    tone: '(nv_ridgeFbm(p * 11.0) - 0.5) * 0.6 * nvMid',
    rough: '(0.5 - nv_ridge(p * 11.0)) * 0.3 * nvMid',
  },
  seed: {
    height: 'nv_fbm(p * 26.0) * 0.25 * nvFine',
    bump: 1.4,
    tone: 'nv_fbm(p * 8.0) * 0.25 * nvMid + smoothstep(0.42, 0.5, length(p.xy * vec2(2.6, 1.0))) * 0.25',
    rough: '0.0',
  },
  apricot: {
    height: 'nv_ridgeFbm(p * 8.0) * 0.7 * nvMid + nv_fbm(p * 26.0) * 0.12 * nvFine',
    bump: 3.0,
    tone: 'nv_fbm(p * 4.0) * 0.3 + (nv_ridge(p * 8.0) - 0.5) * 0.25 * nvMid',
    rough: '(0.5 - nv_ridge(p * 8.0)) * 0.2 * nvMid',
  },
};

/** MeshPhysicalMaterial (vertex-coloured) with the given nut skin injected. */
export function skinMaterial(skin, params = {}) {
  const s = SKINS[skin];
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, ...params });
  if (!s) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNvPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNvPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vNvPos;
${NOISE}
float nvHeight(vec3 p) { return ${s.height}; }
float nvTone(vec3 p) { return ${s.tone}; }
float nvRough(vec3 p) { return ${s.rough}; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float nvLod = length(fwidth(vNvPos));
  nvFine = 1.0 - smoothstep(0.0035, 0.008, nvLod);   // ~30-110 cycles/unit: needs >=4 px per cycle
  nvMid = 1.0 - smoothstep(0.011, 0.024, nvLod);     // ~8-14 cycles/unit
}
diffuseColor.rgb *= clamp(1.0 + nvTone(vNvPos), 0.25, 1.6);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + nvRough(vNvPos), 0.05, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float nvH = nvHeight(vNvPos);
  normal = nv_perturb(-vViewPosition, normal, vec2(dFdx(nvH), dFdy(nvH)) * ${s.bump.toFixed(2)}, faceDirection);
}`);
  };
  mat.customProgramCacheKey = () => `nv-skin-${skin}`;
  return mat;
}

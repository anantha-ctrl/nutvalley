import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeNut, addStudioLights, addEnvironment } from './nuts';

/**
 * Cinematic 3D hero: a slow vortex of almonds, cashews, pistachios, walnuts and
 * dates drifting through warm golden haze on deep forest green.
 *  - Intro: the camera flies in from far away (≈3.5 s ease-out) with a slight roll.
 *  - Mouse: soft camera parallax.  Scroll (`progress` 0→1): the camera pushes
 *    through the nuts while they spin up and the haze thickens.
 *  - Pauses when off-screen or the tab is hidden; reduced-motion renders a still.
 *  - Falls back to a plain gradient if WebGL is unavailable.
 */
const MIX = ['almond', 'cashew', 'pistachio', 'walnut', 'almond', 'cashew', 'date', 'pistachio', 'raisin', 'apricot'];
const BG = '#0f3316';

export default function NutHeroScene({ progress, className = '' }) {
  const mount = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.innerWidth < 768;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(BG, 1);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG, 0.03);
    addStudioLights(scene);
    addEnvironment(scene, renderer, 0.45);
    // Warm glow behind the vortex — reads like a back-lit studio set.
    const glow = new THREE.PointLight('#f2c25c', 40, 30, 1.6);
    glow.position.set(3, 1, -6);
    scene.add(glow);

    const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.1, 200);

    /* ── the nut vortex ── */
    const count = mobile ? 46 : 84;
    const nuts = [];
    const vortex = new THREE.Group();
    // On desktop the vortex sits right of centre so the headline has room on the left.
    vortex.position.set(mobile ? 0.6 : 4.4, mobile ? 1.6 : 0.2, 0);
    scene.add(vortex);
    for (let i = 0; i < count; i++) {
      const n = makeNut(MIX[i % MIX.length]);
      const t = i / count;
      const radius = 0.9 + t * 5.2 + Math.random() * 1.1;
      const angle = i * 2.399;
      const s = 0.55 + Math.random() * 0.75 + (i < 10 ? 0.5 : 0); // a few big hero nuts in front
      n.scale.setScalar(s);
      n.rotation.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
      const d = {
        n, angle, radius,
        y: (Math.random() - 0.5) * 7,
        z: -Math.random() * 14 + 3,
        speed: (0.04 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : -1) * (1.6 - t),
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.9),
        bob: Math.random() * Math.PI * 2,
      };
      nuts.push(d);
      vortex.add(n);
    }

    /* ── golden dust motes ── */
    const dustCount = mobile ? 260 : 600;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, -Math.random() * 30 + 6], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,230,160,1)');
      grad.addColorStop(1, 'rgba(255,230,160,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.09, map: dustTex, transparent: true, depthWrite: false, opacity: 0.8,
      blending: THREE.AdditiveBlending, color: '#e3bd5b',
    }));
    scene.add(dust);

    /* ── sizing ── */
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    /* ── input ── */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    /* ── loop ── */
    const clock = new THREE.Clock();
    let visible = true, raf = 0, elapsed = 0;
    const born = performance.now(); // intro runs on wall-clock time, so a slow frame rate never stretches it
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;
      const p = progress?.get?.() ?? 0;                // scroll 0..1 through the hero
      const intro = reduce ? 1 : easeOut(Math.min((performance.now() - born) / 3600, 1));

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // Fly-in from deep space, then scroll pushes the camera through the vortex.
      camera.position.set(
        mouse.x * 0.9,
        -mouse.y * 0.6 + (1 - intro) * 2.5,
        THREE.MathUtils.lerp(34, 12, intro) - p * 13,
      );
      camera.rotation.set(0, 0, 0);
      camera.lookAt(mobile ? 0 : 1.8, mobile ? 0.6 : 0, -6);
      camera.rotation.z += (1 - intro) * 0.18 + mouse.x * 0.02;

      const spinBoost = 1 + p * 3;
      for (const d of nuts) {
        d.angle += d.speed * dt * spinBoost;
        d.n.position.set(
          Math.cos(d.angle) * d.radius,
          d.y + Math.sin(elapsed * 0.6 + d.bob) * 0.25,
          d.z + Math.sin(d.angle) * d.radius * 0.6,
        );
        d.n.rotation.x += d.spin.x * dt * spinBoost;
        d.n.rotation.y += d.spin.y * dt * spinBoost;
        d.n.rotation.z += d.spin.z * dt;
      }
      vortex.rotation.z = Math.sin(elapsed * 0.08) * 0.08;
      dust.rotation.y = elapsed * 0.015;
      dust.position.y = Math.sin(elapsed * 0.2) * 0.3;
      scene.fog.density = 0.03 + p * 0.05;
      glow.intensity = 40 + Math.sin(elapsed * 0.7) * 6;

      renderer.render(scene, camera);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!raf && !reduce) { clock.getDelta(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === 'visible';
      if (visible) start(); else stop();
    }, { threshold: 0 });
    io.observe(el);
    const onVis = () => { visible = document.visibilityState === 'visible'; if (visible) start(); else stop(); };
    document.addEventListener('visibilitychange', onVis);

    if (reduce) frame(); else start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      dustGeo.dispose();
      dust.material.dispose();
      dustTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      // Nut geometries/materials are a shared cache (also used by card renders) — kept.
    };
  }, [progress]);

  return (
    <div ref={mount} className={`absolute inset-0 ${failed ? 'bg-hero-gradient' : ''} ${className}`} aria-hidden="true" />
  );
}

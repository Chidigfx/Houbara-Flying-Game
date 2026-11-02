import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import GAME_CONFIG from '../config/gameConfig';

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  REUSABLE CHECKPOINT DOME (3D WORLD ELEMENT + VIDEO OVERLAY)      ║
 * ║                                                                    ║
 * ║  Visual Reference Match:                                           ║
 * ║  - Large, semi-transparent golden/warm-amber hemispherical dome    ║
 * ║  - Thin illuminated Fresnel outline & glowing ground contact rim   ║
 * ║  - Subtle animated golden caustic/cellular web filigree texture    ║
 * ║  - Transparent interior so the landscape remains clearly visible   ║
 * ║  - Invisible trigger zone, one-shot lock, light ripple & chime     ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/* ── Subtle Harmonic Success Chime (Web Audio API, 100% Offline) ────── */
let sharedAudioCtx = null;

export function playCheckpointChime() {
  if (GAME_CONFIG.checkpointDome?.soundEnabled === false) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const now = sharedAudioCtx.currentTime;
    // Warm golden major-9th harmonic arpeggio (D5, F#5, A5, E6)
    const freqs = [587.33, 739.99, 880.0, 1318.51];
    freqs.forEach((f, i) => {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = i === 3 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.055);

      const start = now + i * 0.055;
      const peak = 0.045 / (1 + i * 0.25);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.45);

      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(start);
      osc.stop(start + 1.5);
    });
  } catch {
    // Ignore audio context restrictions if un-interacted
  }
}

/* ── GLSL Shaders for the 3D Semi-Transparent Golden Checkpoint Dome ── */
const DOME_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vLocalPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const DOME_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRimColor;
  uniform float uOpacity;
  uniform float uGlowIntensity;
  uniform float uSurfaceOpacity;
  uniform float uFiligreeScale;
  uniform float uTime;
  uniform float uPulse;
  uniform float uRipple;
  uniform float uRadius;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec2 vUv;

  // Smooth 3D cellular/caustic light network for the dome's upper shell
  vec3 hash33(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
  }

  float causticVoronoi(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int k = -1; k <= 1; k++) {
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec3 b = vec3(float(i), float(j), float(k));
          vec3 r = b - f + hash33(p + b);
          float d = dot(r, r);
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) {
            d2 = d;
          }
        }
      }
    }
    return sqrt(max(d2, 0.0)) - sqrt(max(d1, 0.0));
  }

  void main() {
    if (uOpacity <= 0.005) discard;

    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // 1. Thin illuminated Fresnel outline around the dome silhouette
    float ndotv = abs(dot(N, V));
    float fresnelRim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 2.35);
    float sharpOutline = smoothstep(0.68, 0.96, 1.0 - ndotv);

    // 2. Normalized height on the dome (0 at ground base, 1 at top crown)
    float hNorm = clamp(vLocalPos.y / max(uRadius, 1.0), 0.0, 1.0);

    // 3. Glowing ground-contact rim where the dome meets the terrain
    float baseGlow = exp(-hNorm * 16.0) * 0.95;

    // 4. Subtle animated golden caustic/cellular web filigree across the surface
    // Strongest near the upper crown and outer rim, just like the reference image
    vec3 samplePos = vLocalPos * uFiligreeScale + vec3(uTime * 0.14, -uTime * 0.09, uTime * 0.11);
    float edgeDist = causticVoronoi(samplePos);
    float fineEdge = causticVoronoi(samplePos * 2.15 + vec3(3.7));

    float webLine = (1.0 - smoothstep(0.015, 0.11, edgeDist)) * 0.75
                  + (1.0 - smoothstep(0.01, 0.08, fineEdge)) * 0.35;
    float crownWeight = smoothstep(0.15, 0.85, hNorm) * 0.75 + fresnelRim * 0.65;
    float filigree = webLine * crownWeight * (0.85 + 0.15 * uPulse);

    // 5. Entry Light Ripple (expands from the front/center over the dome when triggered)
    float rippleWave = 0.0;
    if (uRipple > 0.001 && uRipple < 0.999) {
      float ringPos = uRipple * 1.25 - 0.1;
      float distFromWave = abs(hNorm - ringPos);
      rippleWave = exp(-distFromWave * 14.0) * sin(uRipple * 3.14159) * 1.45;
    }

    // Combine soft interior wash + thin illuminated rim + base glow + caustic filigree + ripple
    float alpha = uSurfaceOpacity * (0.45 + 0.55 * fresnelRim)
                + fresnelRim * 0.48
                + sharpOutline * 0.38
                + baseGlow * 0.55
                + filigree * 0.42
                + rippleWave * 0.55;

    alpha = clamp(alpha * uGlowIntensity * uOpacity * (0.92 + 0.08 * uPulse), 0.0, 0.92);

    vec3 finalColor = mix(uColor, uRimColor, clamp(fresnelRim * 0.7 + filigree * 0.6 + baseGlow * 0.5 + rippleWave, 0.0, 1.0));
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/**
 * Creates a reusable Three.js 3D Checkpoint Dome with an invisible trigger
 * volume, gradual distance fade-in, gentle pulse, and one-shot entry ripple.
 */
export function createCheckpointDome3D(customOptions = {}) {
  const cfg = { ...GAME_CONFIG.checkpointDome, ...customOptions };
  const group = new THREE.Group();

  const radius = cfg.radius || 64;
  const heightScale = cfg.heightScale || 0.88;

  const uniforms = {
    uColor: { value: new THREE.Color(cfg.color || '#F5C96B') },
    uRimColor: { value: new THREE.Color(cfg.rimColor || '#FFF0B8') },
    uOpacity: { value: 0.0 },
    uGlowIntensity: { value: cfg.glowIntensity ?? 0.88 },
    uSurfaceOpacity: { value: cfg.surfaceOpacity ?? 0.14 },
    uFiligreeScale: { value: cfg.filigreeScale ?? 0.095 },
    uTime: { value: 0.0 },
    uPulse: { value: 0.0 },
    uRipple: { value: 0.0 },
    uRadius: { value: radius },
  };

  // Hemispherical dome geometry (open slightly below ground so base ring sits cleanly)
  const domeGeo = new THREE.SphereGeometry(
    radius,
    72,
    44,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.51
  );
  domeGeo.scale(1.0, heightScale, 1.0);

  const domeMat = new THREE.ShaderMaterial({
    vertexShader: DOME_VERTEX_SHADER,
    fragmentShader: DOME_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.frustumCulled = false;
  group.add(domeMesh);

  // Thin luminous ground-contact ring where the dome base meets the valley terrain
  const baseRingGeo = new THREE.RingGeometry(radius * 0.975, radius * 1.015, 96);
  baseRingGeo.rotateX(-Math.PI / 2);
  baseRingGeo.translate(0, 0.35, 0);
  const baseRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cfg.rimColor || '#FFF0B8'),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
  baseRing.frustumCulled = false;
  group.add(baseRing);

  // Reusable state & update controller for this dome instance
  const state = {
    triggered: false,
    rippleActive: false,
    rippleTime: 0,
    cfg,
    uniforms,
  };

  group.userData = {
    get triggered() {
      return state.triggered;
    },
    set triggered(val) {
      state.triggered = Boolean(val);
    },
    reset() {
      state.triggered = false;
      state.rippleActive = false;
      state.rippleTime = 0;
      uniforms.uRipple.value = 0;
      uniforms.uOpacity.value = 0;
    },
    /**
     * Updates dome visibility, shimmer pulse, ripple animation, and checks
     * whether the bird has entered the invisible trigger volume.
     */
    update({ birdX, birdY, birdZ, elapsed, dt, onTrigger }) {
      uniforms.uTime.value = elapsed;
      uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(elapsed * (cfg.pulseSpeed || 1.8) * Math.PI * 2.0);

      // Signed forward distance from bird to dome center (+ when dome is ahead)
      const distAheadZ = birdZ - group.position.z;
      const dx = birdX - group.position.x;
      const dy = (birdY - group.position.y) / heightScale;
      const dist3D = Math.hypot(dx, dy, distAheadZ);

      // 1. Gradual fade-in as the bird approaches from afar, and smooth fade-out behind
      const fadeIn = clamp(
        (cfg.fadeStartDistance - distAheadZ) /
          Math.max(1, cfg.fadeStartDistance - cfg.fullVisibleDistance),
        0,
        1
      );
      const fadeOut = distAheadZ < -radius * 0.35
        ? clamp(1.0 - (Math.abs(distAheadZ) - radius * 0.35) / (radius * 0.85), 0, 1)
        : 1.0;

      const opacity = fadeIn * fadeOut;
      uniforms.uOpacity.value = opacity;
      baseRingMat.opacity = opacity * 0.55 * (0.85 + 0.15 * uniforms.uPulse.value);
      group.visible = opacity > 0.005;

      // 2. Invisible trigger check when the bird flies into the dome shell
      const triggerDist = cfg.triggerDistance || radius * 0.82;
      if (
        !state.triggered &&
        distAheadZ >= -radius * 0.5 &&
        (distAheadZ <= triggerDist * 0.65 || dist3D <= triggerDist)
      ) {
        state.triggered = true;
        state.rippleActive = true;
        state.rippleTime = 0;
        playCheckpointChime();
        if (onTrigger) {
          const aligned = Math.abs(dx) <= radius * 0.95;
          onTrigger(aligned);
        }
      }

      // 3. Animate short golden light ripple across the dome surface upon entry
      if (state.rippleActive) {
        state.rippleTime += dt * 1000;
        const rNorm = clamp(state.rippleTime / (cfg.rippleDurationMs || 1400), 0, 1);
        uniforms.uRipple.value = rNorm;
        if (rNorm >= 1) {
          state.rippleActive = false;
        }
      }
    },
  };

  return group;
}

/**
 * Screen-space Semi-Transparent Golden Dome Overlay (used when running in
 * pre-rendered Video mode so both modes share the exact same dome aesthetic).
 */
const CheckpointDome = forwardRef(function CheckpointDome(_, ref) {
  const rootRef = useRef(null);
  const groupRef = useRef(null);
  const rippleRef = useRef(null);

  useImperativeHandle(ref, () => ({
    update({ cx, cy, r, opacity, ripple = 0 }) {
      if (!rootRef.current || !groupRef.current) return;
      rootRef.current.style.opacity = opacity;
      groupRef.current.setAttribute(
        'transform',
        `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(r / 100).toFixed(4)})`
      );
      if (rippleRef.current) {
        const rr = 30 + ripple * 110;
        rippleRef.current.setAttribute('r', rr.toFixed(1));
        rippleRef.current.setAttribute(
          'stroke-opacity',
          (Math.sin(ripple * Math.PI) * 0.85).toFixed(3)
        );
      }
    },
  }));

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0,
        zIndex: 12,
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="domeShellGrad" cx="0.5" cy="0.55" r="0.55">
            <stop offset="0%" stopColor="#f5c96b" stopOpacity="0.06" />
            <stop offset="68%" stopColor="#f5c96b" stopOpacity="0.16" />
            <stop offset="92%" stopColor="#ffe59e" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#fff4cc" stopOpacity="0.88" />
          </radialGradient>
          <filter id="domeSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g ref={groupRef} filter="url(#domeSoftGlow)">
          {/* Semi-transparent golden hemispherical dome arch */}
          <path
            d="M -135,28 A 135,118 0 0,1 135,28 Q 0,42 -135,28 Z"
            fill="url(#domeShellGrad)"
            stroke="#fff0b8"
            strokeWidth="2.2"
          />
          {/* Subtle golden caustic filigree arcs */}
          <path
            d="M -112,8 A 115,92 0 0,1 112,8"
            fill="none"
            stroke="#ffe89e"
            strokeOpacity="0.32"
            strokeWidth="0.9"
            strokeDasharray="14 8 6 10"
          />
          <path
            d="M -85,-22 A 90,68 0 0,1 85,-22"
            fill="none"
            stroke="#fff0b8"
            strokeOpacity="0.38"
            strokeWidth="0.8"
            strokeDasharray="9 12 18 7"
          />
          {/* Entry light ripple */}
          <circle
            ref={rippleRef}
            cx="0"
            cy="-20"
            r="40"
            fill="none"
            stroke="#fff4cc"
            strokeWidth="3"
            strokeOpacity="0"
          />
        </g>
      </svg>
    </div>
  );
});

export default CheckpointDome;

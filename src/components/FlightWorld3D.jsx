import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import GAME_CONFIG from '../config/gameConfig';
import { createCheckpointDome3D } from './CheckpointDome';

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  REAL-TIME 3D MIGRATION FLIGHT ENVIRONMENT (Three.js / WebGL)     ║
 * ║                                                                    ║
 * ║  - 100% NaN-safe GLSL math (fixes missing triangle stripe glitch)  ║
 * ║  - Reusable 3D Semi-Transparent Golden Checkpoint Domes            ║
 * ║  - 4 Distinct Color-Graded Biomes:                                 ║
 * ║     Stage 0 (Green Forest): Winding blue river, green hills/trees  ║
 * ║     Stage 1 (Mountains):    Dry rocky canyon, towering cliff walls ║
 * ║     Stage 2 (Desert Dunes): Sweeping sand dunes & blowing dust     ║
 * ║     Stage 3 (Cold Snow):    Icy blue-white snow peaks & snowfall   ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const posMod = (n, m) => ((n % m) + m) % m;

/* ── Shared Deterministic Terrain Math (Identical in JS & GLSL) ─────── */
function riverCenterX(z) {
  return Math.sin(z * 0.0055) * 34.0 + Math.cos(z * 0.012 + 0.8) * 12.0;
}

function migrationRouteX(z) {
  return Math.sin(z * 0.0055 - 0.35) * 26.0 + Math.cos(z * 0.011 + 0.5) * 10.0;
}

function getValleySurfaceY(worldX, worldZ, biome) {
  const rCenter = riverCenterX(worldZ);
  const dist = Math.abs(worldX - rCenter);

  const forestWeight = clamp(1.0 - biome, 0.0, 1.0);
  const riverCut = smoothstep(0.0, 16.0, dist);
  const riverDepth = -2.6 * (1.0 - riverCut) * forestWeight;

  const wave1 = Math.sin(worldX * 0.045 + worldZ * 0.032) * Math.cos(worldX * 0.028 - worldZ * 0.041);
  const wave2 = Math.sin(worldX * 0.085 - worldZ * 0.065 + 1.7) * 0.5;
  const floorUndulation = (wave1 * 0.5 + 0.5) * 4.2 + (wave2 * 0.5 + 0.5) * 2.4;
  const valleyFloor = floorUndulation * lerp(1.0, smoothstep(12.0, 28.0, dist), forestWeight);

  return riverDepth + valleyFloor;
}

/* ── GLSL Shared Noise & 100% NaN-Safe 4-Biome Terrain Generator ───── */
const GLSL_NOISE = /* glsl */ `
  // Safe power helper: guarantees base is strictly positive so D3D11/ANGLE never emits NaN
  float safePow(float base, float expVal) {
    return pow(max(base, 0.0001), expVal);
  }

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise2D(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 3; i++) {
      v += a * noise2D(p);
      p = rot * p * 2.02 + vec2(13.7, 29.3);
      a *= 0.5;
    }
    return v;
  }

  float smoothRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    float weight = 1.0;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 3; i++) {
      float raw = clamp(noise2D(p), -1.0, 1.0);
      float n = max(0.0, 1.0 - sqrt(raw * raw + 0.015));
      n = n * n * weight;
      weight = clamp(n * 1.65, 0.0, 1.0);
      v += n * a;
      p = rot * p * 1.98 + vec2(7.1, 19.4);
      a *= 0.48;
    }
    return v;
  }

  // Broad, sweeping Barchan / Crescent Sand Dunes (100% NaN-safe polynomial crests)
  float getSandDuneHeight(vec2 worldXZ) {
    float warp = fbm3(worldXZ * 0.0075) * 34.0;
    float d1 = sin(worldXZ.x * 0.026 + worldXZ.y * 0.015 + warp * 0.09);
    float c1 = max(0.0, 1.0 - sqrt(d1 * d1 + 0.01) * 0.98);
    float crest1 = (c1 * c1) * 11.5;

    float d2 = sin(worldXZ.x * 0.016 - worldXZ.y * 0.024 + warp * 0.07 + 1.4);
    float c2 = max(0.0, 1.0 - sqrt(d2 * d2 + 0.015) * 0.98);
    float crest2 = (c2 * c2) * 7.5;

    float rolling = (noise2D(worldXZ * 0.009) * 0.5 + 0.5) * 4.5;
    return crest1 + crest2 + rolling - 3.5;
  }

  float getRiverCenter(float z) {
    return sin(z * 0.0055) * 34.0 + cos(z * 0.012 + 0.8) * 12.0;
  }

  float getTerrainHeight(vec2 worldXZ, float biome, out float outRiverDist) {
    float rCenter = getRiverCenter(worldXZ.y);
    float dist = abs(worldXZ.x - rCenter);
    outRiverDist = dist;

    float wForest   = clamp(1.0 - biome, 0.0, 1.0);
    float wMountain = clamp(1.0 - abs(biome - 1.0), 0.0, 1.0);
    float wDesert   = clamp(1.0 - abs(biome - 2.0), 0.0, 1.0);
    float wSnow     = clamp(biome - 2.0, 0.0, 1.0);

    // 1. River channel depression ONLY in Biome 0 (Green Forest)
    float riverCut = smoothstep(0.0, 16.0, dist);
    float riverDepth = -2.6 * (1.0 - riverCut) * wForest;

    // 2. Analytic valley floor for Forest/Mountain/Snow
    float wave1 = sin(worldXZ.x * 0.045 + worldXZ.y * 0.032) * cos(worldXZ.x * 0.028 - worldXZ.y * 0.041);
    float wave2 = sin(worldXZ.x * 0.085 - worldXZ.y * 0.065 + 1.7) * 0.5;
    float floorUndulation = (wave1 * 0.5 + 0.5) * 4.2 + (wave2 * 0.5 + 0.5) * 2.4;
    float standardFloor = floorUndulation * mix(1.0, smoothstep(12.0, 28.0, dist), wForest);

    // 3. Sweeping Desert Sand Dunes in Biome 2 (Desert)
    float desertDunes = wDesert > 0.001 ? getSandDuneHeight(worldXZ) : 0.0;
    float floorHeight = mix(standardFloor, desertDunes, wDesert);

    // 4. Flanking Mountains per biome
    float wallStart = 58.0 * wForest + 26.0 * wMountain + 135.0 * wDesert + 44.0 * wSnow;
    float wallEnd   = 170.0 * wForest + 105.0 * wMountain + 245.0 * wDesert + 145.0 * wSnow;
    float mtnHeight = 62.0 * wForest + 135.0 * wMountain + 38.0 * wDesert + 112.0 * wSnow;

    float valleyWallMask = smoothstep(wallStart, wallEnd, dist);
    float outerPeakMask  = smoothstep(wallStart + 45.0, wallEnd + 75.0, dist);

    float ridges = smoothRidged(worldXZ * 0.0082);
    float hills  = fbm3(worldXZ * 0.012) * 0.5 + 0.5;
    float cliffTerrace = sin(ridges * 18.0) * 2.5 * wMountain;

    float mountains = (ridges * mtnHeight + hills * 16.0 + cliffTerrace) * valleyWallMask;
    mountains += smoothRidged(worldXZ * 0.0045 + vec2(4.2, 1.9)) * (mtnHeight * 0.82) * outerPeakMask;

    return riverDepth + floorHeight + mountains;
  }
`;

/* ── Terrain Vertex & Fragment Shaders ──────────────────────────────── */
const TERRAIN_VERTEX_SHADER = /* glsl */ `
  uniform float uWorldZ;
  uniform float uBiome;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vRiverDist;
  varying float vElevation;

  ${GLSL_NOISE}

  void main() {
    vec2 worldXZ = vec2(position.x, position.z + uWorldZ);

    float rDist;
    float h = getTerrainHeight(worldXZ, uBiome, rDist);

    float eps = 2.2;
    float dummy;
    float hX = getTerrainHeight(worldXZ + vec2(eps, 0.0), uBiome, dummy);
    float hZ = getTerrainHeight(worldXZ + vec2(0.0, eps), uBiome, dummy);
    vec3 calcNormal = normalize(vec3(h - hX, eps, h - hZ));

    vec3 displaced = vec3(position.x, h, position.z);
    vWorldPos = vec3(worldXZ.x, h, worldXZ.y);
    vNormal = calcNormal;
    vRiverDist = rDist;
    vElevation = h;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const TERRAIN_FRAGMENT_SHADER = /* glsl */ `
  uniform float uBiome;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform vec3 uZenithColor;
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vRiverDist;
  varying float vElevation;

  ${GLSL_NOISE}

  void main() {
    vec3 N = normalize(vNormal);
    float slope = 1.0 - clamp(N.y, 0.0, 1.0);

    float detail = fbm3(vWorldPos.xz * 0.085);
    float micro = noise2D(vWorldPos.xz * 0.35);
    float strata = sin(vElevation * 0.75 + detail * 4.0) * 0.5 + 0.5;
    float windRipples = sin(vWorldPos.x * 2.2 + vWorldPos.z * 0.9 + detail * 3.0) * 0.5 + 0.5;

    float wForest   = clamp(1.0 - uBiome, 0.0, 1.0);
    float wMountain = clamp(1.0 - abs(uBiome - 1.0), 0.0, 1.0);
    float wDesert   = clamp(1.0 - abs(uBiome - 2.0), 0.0, 1.0);
    float wSnow     = clamp(uBiome - 2.0, 0.0, 1.0);

    vec3 detailN = normalize(
      N + vec3((micro - 0.5) * 0.15, 0.0, (detail - 0.5) * 0.15) * (0.4 + slope)
        + vec3(windRipples - 0.5, 0.0, 0.0) * 0.08 * wDesert
    );

    // BIOME 0: GREEN FOREST & RIVER VALLEY
    vec3 forestMeadow = mix(vec3(0.18, 0.42, 0.11), vec3(0.45, 0.65, 0.20), detail * 0.5 + 0.5);
    forestMeadow = mix(forestMeadow, vec3(0.28, 0.52, 0.16), micro * 0.4 + 0.3);
    vec3 limestoneRock = mix(vec3(0.58, 0.60, 0.57), vec3(0.78, 0.80, 0.76), strata);
    float forestRockMask = smoothstep(0.18, 0.42, slope + micro * 0.08);
    vec3 colForest = mix(forestMeadow, limestoneRock, forestRockMask);
    float shoreMask = (1.0 - smoothstep(10.0, 16.5, vRiverDist)) * wForest;
    colForest = mix(colForest, vec3(0.52, 0.49, 0.38), shoreMask * 0.75);

    // BIOME 1: ROCKY MOUNTAIN CANYON
    vec3 canyonFloor = mix(vec3(0.72, 0.55, 0.36), vec3(0.84, 0.68, 0.48), detail * 0.5 + 0.5);
    float canyonScrub = smoothstep(0.28, 0.62, micro) * (1.0 - smoothstep(0.12, 0.25, slope));
    canyonFloor = mix(canyonFloor, vec3(0.32, 0.38, 0.22), canyonScrub * 0.65);
    vec3 cliffRock = mix(vec3(0.48, 0.34, 0.22), vec3(0.76, 0.56, 0.38), strata);
    cliffRock = mix(cliffRock, vec3(0.32, 0.23, 0.16), smoothstep(0.55, 0.85, slope));
    float mtnRockMask = smoothstep(0.10, 0.28, slope + vElevation * 0.004);
    vec3 colMountain = mix(canyonFloor, cliffRock, mtnRockMask);

    // BIOME 2: GOLDEN DESERT DUNES & DUST
    vec3 duneGold  = mix(vec3(0.86, 0.56, 0.24), vec3(0.95, 0.68, 0.34), windRipples);
    vec3 duneCrest = vec3(0.99, 0.78, 0.44);
    vec3 colDesert = mix(duneGold, duneCrest, smoothstep(6.0, 18.0, vElevation));
    float desertRimMask = smoothstep(22.0, 48.0, vElevation);
    colDesert = mix(colDesert, vec3(0.42, 0.28, 0.18), desertRimMask);

    // BIOME 3: COLD WINTER SNOW ENVIRONMENT
    vec3 powderSnow = mix(vec3(0.88, 0.94, 0.99), vec3(0.97, 0.99, 1.0), detail * 0.5 + 0.5);
    vec3 frozenSlate = mix(vec3(0.16, 0.22, 0.29), vec3(0.30, 0.38, 0.46), strata);
    float exposedCrag = smoothstep(0.30, 0.58, slope - detail * 0.12);
    vec3 colSnow = mix(powderSnow, frozenSlate, exposedCrag);

    vec3 albedo = colForest * wForest + colMountain * wMountain + colDesert * wDesert + colSnow * wSnow;

    // Biome-Specific Lighting & Color Grading
    vec3 L = normalize(uSunDir);
    float NdotL = max(dot(detailN, L), 0.0);

    vec3 sunCol = vec3(1.10, 0.98, 0.82) * wForest
                + vec3(1.12, 0.95, 0.78) * wMountain
                + vec3(1.22, 0.82, 0.42) * wDesert
                + vec3(0.92, 0.98, 1.12) * wSnow;

    vec3 shadowCol = vec3(0.22, 0.36, 0.46) * wForest
                   + vec3(0.28, 0.26, 0.30) * wMountain
                   + vec3(0.38, 0.20, 0.10) * wDesert
                   + vec3(0.32, 0.50, 0.72) * wSnow;

    vec3 litColor = albedo * (sunCol * NdotL * 0.92 + shadowCol * 0.68);

    // Blowing sand-dust veil sweeping across the desert dunes in Biome 2
    if (wDesert > 0.01) {
      float dustWave = fbm3(vWorldPos.xz * vec2(0.025, 0.06) + vec2(-uTime * 0.85, uTime * 0.25));
      float dustVeil = smoothstep(-0.1, 0.55, dustWave) * exp(-max(vElevation - 16.0, 0.0) * 0.08);
      litColor = mix(litColor, vec3(0.95, 0.72, 0.42), dustVeil * 0.36 * wDesert);
    }

    float distToCam = length(cameraPosition - vWorldPos);
    float fogDensity = 0.00165 + 0.00055 * wDesert + 0.00035 * wSnow;
    float distFog = 1.0 - exp(-safePow(distToCam * fogDensity, 1.6));

    vec3 mtnHaze = vec3(0.48, 0.64, 0.82) * wForest
                 + vec3(0.68, 0.64, 0.58) * wMountain
                 + vec3(0.92, 0.64, 0.34) * wDesert
                 + vec3(0.68, 0.80, 0.92) * wSnow;

    vec3 aerialTint = mix(mtnHaze, uFogColor, exp(-max(vElevation - 12.0, 0.0) * 0.022));
    vec3 finalColor = mix(litColor, aerialTint, clamp(distFog, 0.0, 0.95));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/* ── Forest River Water Shader (Visible ONLY in Stage 0 Green Forest) ─ */
const WATER_VERTEX_SHADER = /* glsl */ `
  uniform float uWorldZ;
  varying vec3 vWorldPos;

  void main() {
    vec3 worldPos = vec3(position.x, -0.45, position.z + uWorldZ);
    vWorldPos = worldPos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, -0.45, position.z, 1.0);
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uWaterOpacity;
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;

  varying vec3 vWorldPos;

  ${GLSL_NOISE}

  void main() {
    if (uWaterOpacity < 0.01) discard;

    vec2 p1 = vWorldPos.xz * vec2(0.18, 0.12) + vec2(uTime * 0.15, -uTime * 0.22);
    vec2 p2 = vWorldPos.xz * vec2(0.32, 0.24) + vec2(-uTime * 0.12, uTime * 0.18);
    float n1 = noise2D(p1);
    float n2 = noise2D(p2);
    vec3 N = normalize(vec3((n1 - n2) * 0.08, 1.0, (n1 + n2) * 0.08));

    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 R = reflect(-V, N);

    float fresnel = safePow(clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0), 2.4);
    vec3 riverBlue = vec3(0.08, 0.34, 0.52);
    vec3 skyReflect = mix(uFogColor, vec3(0.30, 0.62, 0.88), clamp(R.y * 1.8 + 0.35, 0.0, 1.0));

    vec3 H = normalize(L + V);
    float spec = safePow(max(dot(N, H), 0.0), 72.0) * 1.15;

    vec3 waterCol = mix(riverBlue, skyReflect, clamp(0.42 + fresnel * 0.58, 0.0, 1.0));
    waterCol += vec3(1.0, 0.94, 0.76) * spec;

    float distToCam = length(cameraPosition - vWorldPos);
    float fog = 1.0 - exp(-safePow(distToCam * 0.00165, 1.6));
    waterCol = mix(waterCol, uFogColor, clamp(fog, 0.0, 0.95));

    gl_FragColor = vec4(waterCol, 0.95 * uWaterOpacity);
  }
`;

/* ── Sky Dome & Distant Horizon Mountain Silhouette Shader ──────────── */
const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform float uBiome;
  uniform float uTime;

  varying vec3 vDir;

  ${GLSL_NOISE}

  void main() {
    vec3 d = normalize(vDir);
    vec3 L = normalize(uSunDir);

    float y = clamp(d.y, 0.0, 1.0);
    float skyCurve = smoothstep(0.0, 0.28, y);
    vec3 sky = mix(uHorizonColor, uZenithColor, skyCurve);

    float wDesert = clamp(1.0 - abs(uBiome - 2.0), 0.0, 1.0);
    float wSnow   = clamp(uBiome - 2.0, 0.0, 1.0);

    float sunCos = max(dot(d, L), 0.0);
    float mieHalo = safePow(sunCos, 6.0) * 0.45 + safePow(sunCos, 36.0) * 0.55;
    float sunDisc = smoothstep(0.9980, 0.9995, sunCos);

    vec3 haloCol = mix(vec3(1.0, 0.85, 0.52), vec3(1.0, 0.62, 0.22), wDesert);
    haloCol = mix(haloCol, vec3(0.85, 0.94, 1.0), wSnow);

    sky += haloCol * mieHalo;
    sky = mix(sky, vec3(1.0, 0.98, 0.92), sunDisc);

    float azimuth = atan(d.x, -d.z);
    float farPeaks = (sin(azimuth * 6.0 + 0.8) * 0.42 + sin(azimuth * 15.0 + 2.1) * 0.28 + cos(azimuth * 27.0) * 0.15 + 0.85) * 0.055;
    float mtnMask = smoothstep(farPeaks + 0.004, farPeaks - 0.002, d.y) * step(-0.02, d.y);

    vec3 farMtnCol = mix(uHorizonColor * 0.72, vec3(0.32, 0.46, 0.64), 0.55);
    farMtnCol = mix(farMtnCol, vec3(0.38, 0.26, 0.18), wDesert * 0.85);
    farMtnCol = mix(farMtnCol, vec3(0.75, 0.85, 0.95), wSnow * 0.75);

    sky = mix(sky, farMtnCol, mtnMask * 0.78);

    if (d.y > 0.04) {
      vec2 cloudUV = d.xz / (d.y + 0.20) * 1.35 + vec2(uTime * 0.006, -uTime * 0.004);
      float c = fbm3(cloudUV);
      float cloudAlpha = smoothstep(0.08, 0.52, c) * smoothstep(0.04, 0.16, d.y) * (1.0 - smoothstep(0.55, 0.90, d.y));
      vec3 cloudColor = mix(vec3(0.96, 0.98, 1.0), haloCol, safePow(sunCos, 1.5) * 0.65);
      sky = mix(sky, cloudColor, cloudAlpha * 0.72);
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

/* ── 3D Articulated Wing-Flapping Houbara Bird Shader ───────────────── */
const BIRD_VERTEX_SHADER = /* glsl */ `
  uniform float uFlapPhase;
  uniform float uFlapAmp;
  uniform float uGlideFactor;
  uniform float uTurnBank;
  uniform float uTime;

  varying vec2 vUv;
  varying float vWingLift;
  varying float vSpan;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float span = (uv.x - 0.5) * 2.0;
    float absSpan = abs(span);
    vSpan = span;

    float wingMask = smoothstep(0.12, 0.25, absSpan);
    float outerTipMask = smoothstep(0.48, 0.95, absSpan);

    float wave = sin(uFlapPhase - absSpan * 1.95);
    float tipFlex = cos(uFlapPhase - absSpan * 2.5) * outerTipMask * 0.35;
    float glideArch = sin(absSpan * 3.14159) * 0.14 * uGlideFactor;
    float featherFlutter = sin(uTime * 20.0 + absSpan * 15.0) * 0.012 * outerTipMask;

    float lift = wingMask * ((wave + tipFlex) * uFlapAmp + glideArch + featherFlutter);

    pos.y += lift * 0.65;
    pos.z += lift * 0.45;
    pos.x -= sign(span) * abs(lift) * 0.09 * wingMask;

    float tailMask = (1.0 - smoothstep(0.0, 0.30, absSpan)) * (1.0 - smoothstep(0.10, 0.42, uv.y));
    pos.y += span * uTurnBank * tailMask * 0.18;

    vWingLift = lift;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const BIRD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uBirdTex;
  uniform vec3 uTint;

  varying vec2 vUv;
  varying float vWingLift;
  varying float vSpan;

  void main() {
    vec4 tex = texture2D(uBirdTex, vUv);
    if (tex.a < 0.08) discard;

    float wingShade = 1.0 + vWingLift * 0.18 - vSpan * 0.04;
    vec3 col = tex.rgb * uTint * clamp(wingShade, 0.86, 1.18);
    gl_FragColor = vec4(col, tex.a);
  }
`;

/* ── 4 Distinct Color-Graded Biome Palettes ─────────────────────────── */
const BIOME_PALETTES = [
  {
    // Stage 0: GREEN FOREST & RIVER VALLEY
    zenith: new THREE.Color('#1d6fb8'),
    horizon: new THREE.Color('#d8ecfa'),
    fog: new THREE.Color('#c8e2f0'),
    sunDir: new THREE.Vector3(-0.60, 0.36, -0.71).normalize(),
    foliageColor: new THREE.Color('#2e6318'),
    rockColor: new THREE.Color('#9ea39b'),
    birdTint: new THREE.Color('#fffcf5'),
    particleColor: new THREE.Color('#fff5cc'),
  },
  {
    // Stage 1: ROCKY MOUNTAIN CANYON
    zenith: new THREE.Color('#2b6ca3'),
    horizon: new THREE.Color('#eadac3'),
    fog: new THREE.Color('#dfd0b8'),
    sunDir: new THREE.Vector3(0.58, 0.44, -0.68).normalize(),
    foliageColor: new THREE.Color('#3e4f24'),
    rockColor: new THREE.Color('#b08052'),
    birdTint: new THREE.Color('#fff6e6'),
    particleColor: new THREE.Color('#f5dfb8'),
  },
  {
    // Stage 2: GOLDEN DESERT DUNES & BLOWING DUST
    zenith: new THREE.Color('#6e4826'),
    horizon: new THREE.Color('#f7a640'),
    fog: new THREE.Color('#eb9638'),
    sunDir: new THREE.Vector3(0.62, 0.19, -0.76).normalize(),
    foliageColor: new THREE.Color('#8c6230'),
    rockColor: new THREE.Color('#a66c38'),
    birdTint: new THREE.Color('#ffebd0'),
    particleColor: new THREE.Color('#ffbe66'),
  },
  {
    // Stage 3: COLD WINTER SNOW ENVIRONMENT
    zenith: new THREE.Color('#123557'),
    horizon: new THREE.Color('#b8d4eb'),
    fog: new THREE.Color('#b0cce6'),
    sunDir: new THREE.Vector3(-0.45, 0.38, -0.81).normalize(),
    foliageColor: new THREE.Color('#d8e6f2'),
    rockColor: new THREE.Color('#344354'),
    birdTint: new THREE.Color('#edf6ff'),
    particleColor: new THREE.Color('#ffffff'),
  },
];

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255, 248, 220, 1.0)');
  grad.addColorStop(0.25, 'rgba(243, 215, 149, 0.80)');
  grad.addColorStop(0.60, 'rgba(200, 169, 107, 0.22)');
  grad.addColorStop(1.0, 'rgba(200, 169, 107, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

const FlightWorld3D = forwardRef(function FlightWorld3D(
  { getInput, onProgress, onCheckpoint, onComplete },
  ref
) {
  const mountRef = useRef(null);
  const getInputRef = useRef(getInput);
  getInputRef.current = getInput;

  const callbacksRef = useRef({ onProgress, onCheckpoint, onComplete });
  callbacksRef.current = { onProgress, onCheckpoint, onComplete };

  const initialStage = (() => {
    const s = Number(new URLSearchParams(window.location.search).get('stage'));
    return Number.isFinite(s) && s >= 0 && s <= 3 ? s : 0;
  })();

  const stateRef = useRef({
    worldZ: 0,
    totalDistance: 4140,
    birdX: 0,
    birdY: 16.5,
    birdTilt: 0,
    birdPitch: 0,
    speed: GAME_CONFIG.world3d.cruiseSpeed,
    onRouteFactor: 0,
    sceneIndex: initialStage,
    currentBiome: initialStage,
    targetBiome: initialStage,
    completed: false,
    bloomFlash: 0,
  });

  useImperativeHandle(ref, () => ({
    skipToNextGate() {
      const s = stateRef.current;
      const cpFractions = [0.25, 0.50, 0.75, 0.98];
      const currentProgress = Math.abs(s.worldZ) / s.totalDistance;
      const nextFrac = cpFractions.find((f) => f > currentProgress + 0.02) || 0.98;
      const targetFrac = Math.max(0, nextFrac - 0.042);
      s.worldZ = -targetFrac * s.totalDistance;
      s.birdX = migrationRouteX(s.worldZ);
    },
    getState() {
      return stateRef.current;
    },
  }));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const isStatic = new URLSearchParams(window.location.search).has('static');
    const cfg3d = GAME_CONFIG.world3d;
    const totalDist = cfg3d.journeyDurationSec * cfg3d.cruiseSpeed;
    stateRef.current.totalDistance = totalDist;

    const nearGate = new URLSearchParams(window.location.search).has('gate');
    if (nearGate) {
      stateRef.current.worldZ = -((initialStage + 1) * 0.25 - 0.032) * totalDist;
    } else if (initialStage > 0) {
      stateRef.current.worldZ = -(initialStage * 0.25 + 0.03) * totalDist;
    }

    const startPalette = BIOME_PALETTES[initialStage];

    /* ── 1. Scene, Camera & Renderer ────────────────────────────────── */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(startPalette.fog.getHex(), 0.0016);

    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / Math.max(1, container.clientHeight),
      1.5,
      1100
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: isStatic,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    /* ── 2. Sky Dome ────────────────────────────────────────────────── */
    const skyUniforms = {
      uSunDir: { value: startPalette.sunDir.clone() },
      uZenithColor: { value: startPalette.zenith.clone() },
      uHorizonColor: { value: startPalette.horizon.clone() },
      uBiome: { value: initialStage },
      uTime: { value: 0 },
    };
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(950, 32, 24),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    skyMesh.frustumCulled = false;
    scene.add(skyMesh);

    /* ── 3. Smooth C2 Continuous 4-Biome Terrain ────────────────────── */
    const TERRAIN_DEPTH = 720;
    const terrainGeo = new THREE.PlaneGeometry(540, TERRAIN_DEPTH, 200, 220);
    terrainGeo.rotateX(-Math.PI / 2);
    terrainGeo.translate(0, 0, -320);

    const terrainUniforms = {
      uWorldZ: { value: stateRef.current.worldZ },
      uBiome: { value: initialStage },
      uSunDir: { value: startPalette.sunDir.clone() },
      uFogColor: { value: startPalette.fog.clone() },
      uZenithColor: { value: startPalette.zenith.clone() },
      uTime: { value: 0 },
    };

    const terrainMesh = new THREE.Mesh(
      terrainGeo,
      new THREE.ShaderMaterial({
        vertexShader: TERRAIN_VERTEX_SHADER,
        fragmentShader: TERRAIN_FRAGMENT_SHADER,
        uniforms: terrainUniforms,
      })
    );
    terrainMesh.frustumCulled = false;
    scene.add(terrainMesh);

    /* ── 4. Forest River Water Plane (ONLY in Biome 0 Green Forest!) ── */
    const waterGeo = new THREE.PlaneGeometry(140, TERRAIN_DEPTH, 16, 40);
    waterGeo.rotateX(-Math.PI / 2);
    waterGeo.translate(0, 0, -320);

    const waterUniforms = {
      uWorldZ: { value: stateRef.current.worldZ },
      uTime: { value: 0 },
      uWaterOpacity: { value: initialStage === 0 ? 1.0 : 0.0 },
      uSunDir: { value: startPalette.sunDir.clone() },
      uFogColor: { value: startPalette.fog.clone() },
    };

    const waterMesh = new THREE.Mesh(
      waterGeo,
      new THREE.ShaderMaterial({
        vertexShader: WATER_VERTEX_SHADER,
        fragmentShader: WATER_FRAGMENT_SHADER,
        uniforms: waterUniforms,
        transparent: true,
      })
    );
    waterMesh.frustumCulled = false;
    waterMesh.visible = initialStage === 0;
    scene.add(waterMesh);

    /* ── 5. Instanced Forest Trees & Canyon/Limestone Boulders ──────── */
    const ambLight = new THREE.HemisphereLight(0xfff6e5, 0x3d3528, 0.95);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffe6b0, 1.55);
    dirLight.position.copy(startPalette.sunDir).multiplyScalar(300);
    scene.add(dirLight);

    const TREE_COUNT = 300;
    const treeGeo = new THREE.DodecahedronGeometry(1.6, 1);
    treeGeo.scale(1.15, 0.95, 1.15);
    treeGeo.translate(0, 1.0, 0);
    const treeMat = new THREE.MeshLambertMaterial({
      color: startPalette.foliageColor,
      flatShading: true,
    });
    const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, TREE_COUNT);
    treeInst.frustumCulled = false;

    const ROCK_COUNT = 280;
    const rockGeo = new THREE.DodecahedronGeometry(2.1, 0);
    rockGeo.scale(1.35, 0.78, 1.15);
    rockGeo.translate(0, 0.55, 0);
    const rockMat = new THREE.MeshLambertMaterial({
      color: startPalette.rockColor,
      flatShading: true,
    });
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, ROCK_COUNT);
    rockInst.frustumCulled = false;

    const propSpanZ = 600;
    const fract = (v) => v - Math.floor(v);
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();
    const euler = new THREE.Euler();

    const treeData = Array.from({ length: TREE_COUNT }, (_, i) => {
      const r1 = fract(Math.sin(i * 12.9898 + 78.233) * 43758.5453);
      const r2 = fract(Math.sin(i * 93.9898 + 12.456) * 23421.6312);
      const r3 = fract(Math.sin(i * 45.164 + 39.112) * 65432.1234);
      const side = r1 > 0.5 ? 1 : -1;
      const bankOffset = 18.0 + Math.pow(r2, 1.2) * 44.0;
      const baseZ = -(r3 * propSpanZ);
      const scale = 0.45 + fract(r1 * 7.3) * 0.65;
      return { side, bankOffset, baseZ, scale, wraps: -1 };
    });

    const rockData = Array.from({ length: ROCK_COUNT }, (_, i) => {
      const r1 = fract(Math.sin(i * 27.13 + 51.7) * 43758.5453);
      const r2 = fract(Math.sin(i * 63.71 + 88.2) * 19842.3141);
      const r3 = fract(Math.sin(i * 81.42 + 17.9) * 51923.8712);
      const side = r1 > 0.5 ? 1 : -1;
      const bankOffset = 19.0 + Math.pow(r2, 1.15) * 48.0;
      const baseZ = -(r3 * propSpanZ);
      const sx = 0.55 + fract(r1 * 5.1) * 0.95;
      const sy = 0.38 + fract(r2 * 6.7) * 0.72;
      const sz = 0.55 + fract(r3 * 4.3) * 0.95;
      const rotY = r1 * Math.PI * 2;
      return { side, bankOffset, baseZ, sx, sy, sz, rotY, wraps: -1 };
    });

    scene.add(treeInst);
    scene.add(rockInst);

    /* ── 6. Delicate Winding 3D Golden Migration Route Trail ────────── */
    const glowTex = createGlowTexture();
    const ORB_COUNT = 32;
    const orbGroup = new THREE.Group();
    const orbs = [];

    const orbCoreGeo = new THREE.SphereGeometry(0.24, 10, 10);
    const orbCoreMat = new THREE.MeshBasicMaterial({ color: 0xffefb8 });

    for (let i = 0; i < ORB_COUNT; i++) {
      const holder = new THREE.Group();
      const core = new THREE.Mesh(orbCoreGeo, orbCoreMat);
      holder.add(core);

      const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xf3d795,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(2.1, 2.1, 1);
      holder.add(halo);

      orbGroup.add(holder);
      orbs.push({ holder, halo, haloMat, index: i });
    }
    scene.add(orbGroup);

    /* ── 7. Reusable Semi-Transparent Golden Checkpoint Domes ───────── */
    const checkpoints = GAME_CONFIG.checkpoints;
    const domeCfg = GAME_CONFIG.checkpointDome || {};
    const cpFractions = [0.25, 0.50, 0.75];

    const checkpointDomes = checkpoints.map((cp, idx) => {
      const dome = createCheckpointDome3D(domeCfg);
      const zPos = -cpFractions[idx] * totalDist;
      const xPos = migrationRouteX(zPos);
      dome.position.set(xPos, domeCfg.baseY ?? -1.5, zPos);
      if (initialStage > idx) {
        dome.userData.triggered = true;
      }
      scene.add(dome);
      return { dome, cp, zPos, xPos, idx };
    });

    /* ── 8. Dynamic Weather Particles (Desert Blowing Dust / Snowfall) ─ */
    const PARTICLE_COUNT = 320;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPositions[i * 3 + 0] = posMod(i * 31.3, 180) - 90;
      pPositions[i * 3 + 1] = 2 + posMod(i * 13.7, 36);
      pPositions[i * 3 + 2] = stateRef.current.worldZ - posMod(i * 19.1, 240);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleMat = new THREE.PointsMaterial({
      map: glowTex,
      color: startPalette.particleColor,
      size: 1.15,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.frustumCulled = false;
    scene.add(particles);

    /* ── 9. 3D Articulated Wing-Flapping Houbara Bustard ────────────── */
    const birdGroup = new THREE.Group();
    scene.add(birdGroup);

    let staticFrames = 0;
    const texLoader = new THREE.TextureLoader();
    const birdTexture = texLoader.load(GAME_CONFIG.assets.bird.image, () => {
      if (isStatic) renderer.render(scene, camera);
    });
    birdTexture.colorSpace = THREE.SRGBColorSpace;

    const birdUniforms = {
      uBirdTex: { value: birdTexture },
      uFlapPhase: { value: 0 },
      uFlapAmp: { value: 0.65 },
      uGlideFactor: { value: 0.35 },
      uTurnBank: { value: 0 },
      uTime: { value: 0 },
      uTint: { value: startPalette.birdTint.clone() },
    };

    const birdGeo = new THREE.PlaneGeometry(4.3, 1.9, 64, 32);
    const birdMat = new THREE.ShaderMaterial({
      vertexShader: BIRD_VERTEX_SHADER,
      fragmentShader: BIRD_FRAGMENT_SHADER,
      uniforms: birdUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    const birdMesh = new THREE.Mesh(birdGeo, birdMat);
    birdMesh.rotation.x = -0.14;
    birdGroup.add(birdMesh);

    const shadowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x050a08,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const birdShadow = new THREE.Sprite(shadowMat);
    birdShadow.scale.set(5.5, 5.5, 1);
    scene.add(birdShadow);

    /* ── 10. Companion Flock in Stage 4 ─────────────────────────────── */
    const flockGroup = new THREE.Group();
    const flockBirds = [];
    for (let i = 0; i < 5; i++) {
      const fMat = birdMat.clone();
      fMat.uniforms = {
        uBirdTex: { value: birdTexture },
        uFlapPhase: { value: i * 1.3 },
        uFlapAmp: { value: 0.7 },
        uGlideFactor: { value: 0.3 },
        uTurnBank: { value: 0 },
        uTime: { value: 0 },
        uTint: { value: startPalette.birdTint.clone() },
      };
      const fMesh = new THREE.Mesh(birdGeo, fMat);
      fMesh.rotation.x = -0.16;
      const side = i % 2 === 0 ? 1 : -1;
      const rank = Math.floor(i / 2) + 1;
      const offset = new THREE.Vector3(side * rank * 7.5, 2.2 + rank * 1.3, -18 - rank * 9);
      fMesh.scale.setScalar(0.5);
      flockGroup.add(fMesh);
      flockBirds.push({ mesh: fMesh, mat: fMat, offset, phaseOffset: i * 1.7 });
    }
    flockGroup.visible = false;
    scene.add(flockGroup);

    /* ── Resize Handler ─────────────────────────────────────────────── */
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    /* ── Main 60fps Flight & Render Loop ────────────────────────────── */
    let rafId;
    let lastTime = performance.now();
    let elapsed = 0;
    let flapPhase = 0;

    stateRef.current.birdX = migrationRouteX(stateRef.current.worldZ);
    camera.position.set(stateRef.current.birdX + 1.15, 17.35, stateRef.current.worldZ + 8.0);

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      const s = stateRef.current;
      const input = getInputRef.current ? getInputRef.current() : { horizontal: 0 };

      /* 1. Steering & Route Slipstream Physics */
      const routeTargetX = migrationRouteX(s.worldZ - 24);
      const riverCenter = riverCenterX(s.worldZ);

      s.birdX += input.horizontal * cfg3d.steerResponsiveness * dt;
      const minX = riverCenter - cfg3d.lateralRange;
      const maxX = riverCenter + cfg3d.lateralRange;
      s.birdX = clamp(s.birdX, minX, maxX);

      const distFromRoute = Math.abs(s.birdX - routeTargetX);
      const targetOnRoute = clamp(1.0 - distFromRoute / 18.0, 0, 1);
      s.onRouteFactor = lerp(s.onRouteFactor, targetOnRoute, dt * 3.0);

      const targetSpeed = cfg3d.cruiseSpeed * lerp(1.0, cfg3d.routeBoostMultiplier, s.onRouteFactor);
      s.speed = lerp(s.speed, targetSpeed, dt * 2.5);
      if (!isStatic) {
        s.worldZ -= s.speed * dt;
      }

      const targetTilt = -input.horizontal * (GAME_CONFIG.bird.maxTilt * (Math.PI / 180)) * 1.25;
      s.birdTilt = lerp(s.birdTilt, targetTilt, dt * 6.5);

      const targetY = 16.5 + Math.sin(s.worldZ * 0.008) * 1.0 + Math.abs(input.horizontal) * 0.8;
      const prevY = s.birdY;
      s.birdY = lerp(s.birdY, targetY, dt * 3.5);
      s.birdPitch = lerp(s.birdPitch, (s.birdY - prevY) * 2.0, dt * 5.0);

      /* 2. Wingbeat Cycle */
      const cycle = elapsed % 5.8;
      const isTurning = Math.abs(input.horizontal) > 0.15;
      const wantsFlap = cycle < 3.4 || isTurning;
      const targetFlapAmp = wantsFlap ? (isTurning ? 0.82 : 0.65) : 0.06;
      const targetGlide = wantsFlap ? 0.20 : 0.85;

      birdUniforms.uFlapAmp.value = lerp(birdUniforms.uFlapAmp.value, targetFlapAmp, dt * 4.0);
      birdUniforms.uGlideFactor.value = lerp(birdUniforms.uGlideFactor.value, targetGlide, dt * 4.0);

      flapPhase += dt * cfg3d.wingFlapSpeed * Math.PI * 2.0 * (isTurning ? 1.2 : 1.0);
      birdUniforms.uFlapPhase.value = isStatic ? 0.45 : flapPhase;
      birdUniforms.uTurnBank.value = -s.birdTilt;
      birdUniforms.uTime.value = elapsed;

      const wingBob = isStatic ? 0 : Math.sin(flapPhase) * birdUniforms.uFlapAmp.value * 0.14;

      /* 3. Position Bird & Chase Camera */
      birdGroup.position.set(s.birdX, s.birdY + wingBob, s.worldZ);
      birdGroup.rotation.set(s.birdPitch * 0.25, -input.horizontal * 0.16, s.birdTilt);

      birdShadow.position.set(s.birdX, 0.35, s.worldZ);

      const desiredCamX = s.birdX + 1.15;
      const desiredCamY = s.birdY + 0.85;
      const camX = isStatic ? desiredCamX : lerp(camera.position.x, desiredCamX, dt * 6.5);
      const camY = isStatic ? desiredCamY : lerp(camera.position.y, desiredCamY, dt * 6.5);
      camera.position.set(camX, camY, s.worldZ + 8.0);

      const lookAheadX = lerp(s.birdX + 1.15, migrationRouteX(s.worldZ - 80), 0.28);
      camera.lookAt(lookAheadX, s.birdY + 1.8, s.worldZ - 80);
      camera.rotation.z += s.birdTilt * cfg3d.cameraBankFactor;

      /* 4. Update Terrain, Water & Sky Position */
      terrainMesh.position.z = s.worldZ;
      terrainUniforms.uWorldZ.value = s.worldZ;
      terrainUniforms.uTime.value = elapsed;

      waterMesh.position.z = s.worldZ;
      waterUniforms.uWorldZ.value = s.worldZ;
      waterUniforms.uTime.value = elapsed;

      skyMesh.position.copy(camera.position);
      skyUniforms.uTime.value = elapsed;

      /* 5. Update 3D Checkpoint Domes & Trigger Environment Transitions */
      checkpointDomes.forEach((cd) => {
        cd.dome.userData.update({
          birdX: s.birdX,
          birdY: s.birdY,
          birdZ: s.worldZ,
          elapsed,
          dt,
          onTrigger: (aligned) => {
            s.bloomFlash = 1.0;
            s.targetBiome = cd.idx + 1;
            s.sceneIndex = cd.idx + 1;
            if (callbacksRef.current.onCheckpoint) {
              callbacksRef.current.onCheckpoint(cd.cp, aligned, cd.idx + 1);
            }
          },
        });
      });

      /* 6. Stepwise Biome Blending (Transitions smoothly when entering a Dome!) */
      const progress = clamp(Math.abs(s.worldZ) / s.totalDistance, 0, 1);
      const stageFromProgress = Math.min(3, Math.floor(progress * 4));
      if (stageFromProgress > s.targetBiome) {
        s.targetBiome = stageFromProgress;
        s.sceneIndex = stageFromProgress;
      }

      s.currentBiome = isStatic
        ? s.targetBiome
        : lerp(s.currentBiome, s.targetBiome, dt * 2.0);

      const biome = s.currentBiome;
      terrainUniforms.uBiome.value = biome;
      skyUniforms.uBiome.value = biome;

      // Water is ONLY visible in Biome 0 (Green Forest)!
      const waterOpacity = clamp(1.0 - biome * 1.35, 0, 1);
      waterUniforms.uWaterOpacity.value = waterOpacity;
      waterMesh.visible = waterOpacity > 0.01;

      // Trees ONLY in Biome 0 (Green Forest)
      treeInst.visible = biome < 0.75;
      // Rocks ONLY in Biome 0 (Forest limestone) and Biome 1 (Mountain canyon boulders)
      rockInst.visible = biome < 1.55;

      const bIdx = Math.min(Math.floor(biome), 2);
      const bFrac = clamp(biome - bIdx, 0, 1);
      const pA = BIOME_PALETTES[bIdx];
      const pB = BIOME_PALETTES[bIdx + 1];

      skyUniforms.uZenithColor.value.lerpColors(pA.zenith, pB.zenith, bFrac);
      skyUniforms.uHorizonColor.value.lerpColors(pA.horizon, pB.horizon, bFrac);
      skyUniforms.uSunDir.value.lerpVectors(pA.sunDir, pB.sunDir, bFrac).normalize();

      terrainUniforms.uFogColor.value.lerpColors(pA.fog, pB.fog, bFrac);
      terrainUniforms.uZenithColor.value.copy(skyUniforms.uZenithColor.value);
      terrainUniforms.uSunDir.value.copy(skyUniforms.uSunDir.value);
      scene.fog.color.copy(terrainUniforms.uFogColor.value);

      waterUniforms.uFogColor.value.copy(terrainUniforms.uFogColor.value);
      waterUniforms.uSunDir.value.copy(skyUniforms.uSunDir.value);

      treeMat.color.lerpColors(pA.foliageColor, pB.foliageColor, bFrac);
      rockMat.color.lerpColors(pA.rockColor, pB.rockColor, bFrac);
      birdUniforms.uTint.value.lerpColors(pA.birdTint, pB.birdTint, bFrac);
      particleMat.color.lerpColors(pA.particleColor, pB.particleColor, bFrac);

      s.bloomFlash = Math.max(0, s.bloomFlash - dt * 2.0);
      renderer.toneMappingExposure = 1.08 + s.bloomFlash * 0.32;

      /* 7. Update World-Locked Instanced Trees & Boulders */
      if (treeInst.visible) {
        let treesChanged = false;
        for (let i = 0; i < TREE_COUNT; i++) {
          const td = treeData[i];
          const distBehind = td.baseZ - (s.worldZ + 18);
          const wraps = Math.max(0, Math.ceil(distBehind / propSpanZ));
          if (wraps !== td.wraps) {
            td.wraps = wraps;
            const wz = td.baseZ - wraps * propSpanZ;
            const wx = riverCenterX(wz) + td.side * td.bankOffset;
            const wy = getValleySurfaceY(wx, wz, biome);
            dummyPos.set(wx, wy, wz);
            dummyQuat.setFromEuler(euler.set(0, i * 1.1, 0));
            dummyScale.set(td.scale, td.scale, td.scale);
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            treeInst.setMatrixAt(i, dummyMatrix);
            treesChanged = true;
          }
        }
        if (treesChanged) treeInst.instanceMatrix.needsUpdate = true;
      }

      if (rockInst.visible) {
        let rocksChanged = false;
        const mtnRockScale = 1.0 + clamp(1.0 - Math.abs(biome - 1.0), 0, 1) * 0.55;
        for (let i = 0; i < ROCK_COUNT; i++) {
          const rd = rockData[i];
          const distBehind = rd.baseZ - (s.worldZ + 18);
          const wraps = Math.max(0, Math.ceil(distBehind / propSpanZ));
          if (wraps !== rd.wraps) {
            rd.wraps = wraps;
            const wz = rd.baseZ - wraps * propSpanZ;
            const wx = riverCenterX(wz) + rd.side * rd.bankOffset;
            const wy = getValleySurfaceY(wx, wz, biome);
            dummyPos.set(wx, wy, wz);
            dummyQuat.setFromEuler(euler.set(0, rd.rotY, 0));
            dummyScale.set(rd.sx * mtnRockScale, rd.sy * mtnRockScale, rd.sz * mtnRockScale);
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            rockInst.setMatrixAt(i, dummyMatrix);
            rocksChanged = true;
          }
        }
        if (rocksChanged) rockInst.instanceMatrix.needsUpdate = true;
      }

      /* 8. Update Winding Golden Migration Route Orbs */
      const orbSpacing = 11.0;
      const baseOrbIndex = Math.floor(Math.abs(s.worldZ - 22) / orbSpacing);
      for (let i = 0; i < ORB_COUNT; i++) {
        const orbIdx = baseOrbIndex + i;
        const oz = -orbIdx * orbSpacing;
        const ox = migrationRouteX(oz);
        const oy = 13.0 + Math.sin(oz * 0.015) * 1.0;

        const orb = orbs[i];
        orb.holder.position.set(ox, oy, oz);

        const distAhead = s.worldZ - oz;
        const fadeNear = clamp((distAhead - 18.0) / 14.0, 0, 1);
        const fadeFar = clamp(1.0 - distAhead / 360.0, 0, 1);
        const pulse = 1.0 + 0.14 * Math.sin(elapsed * 3.5 + orbIdx * 0.6);
        orb.halo.scale.setScalar(2.0 * pulse);
        orb.haloMat.opacity = fadeNear * fadeFar * 0.72;
        orb.holder.visible = distAhead > 16.0;
      }

      /* 9. Update Biome Weather Particles (Blowing Desert Sand / Falling Snow) */
      const isDesert = Math.abs(biome - 2.0) < 0.6;
      const isSnow = biome > 2.2;
      particleMat.size = isSnow ? 1.45 : isDesert ? 1.65 : 0.85;
      particleMat.opacity = isSnow ? 0.78 : isDesert ? 0.62 : 0.30;

      const posAttr = particleGeo.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let px = posAttr.getX(i);
        let py = posAttr.getY(i);
        let pz = posAttr.getZ(i);

        if (!isStatic) {
          if (isDesert) {
            px -= dt * 28.0;
            py += Math.sin(elapsed * 3.0 + i) * dt * 1.5;
          } else if (isSnow) {
            py -= dt * 7.5;
            px += Math.sin(elapsed * 1.8 + i) * dt * 3.2;
          }
        }

        if (pz > s.worldZ - 6 || py < 1.0 || Math.abs(px - s.birdX) > 95) {
          pz = s.worldZ - 180 - posMod(i * 19.7 + elapsed * 10, 70);
          px = s.birdX + (posMod(i * 31.3 + elapsed * 23, 170) - 85);
          py = 4 + posMod(i * 13.1, 34);
        }
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;

      /* 10. Stage 4 Companion Flock */
      if (progress > 0.76) {
        flockGroup.visible = true;
        const flockEnter = clamp((progress - 0.76) / 0.12, 0, 1);
        flockGroup.position.set(
          lerp(s.birdX, routeTargetX, 0.6),
          s.birdY + (1.0 - flockEnter) * 18.0,
          s.worldZ
        );
        flockBirds.forEach((fb) => {
          fb.mesh.position.copy(fb.offset);
          fb.mesh.position.y += Math.sin(elapsed * 2.0 + fb.phaseOffset) * 0.6;
          fb.mat.uniforms.uFlapPhase.value = flapPhase + fb.phaseOffset;
          fb.mat.uniforms.uTime.value = elapsed;
          fb.mat.uniforms.uTint.value.copy(birdUniforms.uTint.value);
        });
      } else {
        flockGroup.visible = false;
      }

      /* 11. Report Progress & Completion to Parent UI */
      if (callbacksRef.current.onProgress) {
        const normalizedBirdX = clamp(
          0.5 + (s.birdX - riverCenter) / (cfg3d.lateralRange * 2),
          0.08,
          0.92
        );
        callbacksRef.current.onProgress({
          progress,
          sceneIndex: s.sceneIndex,
          elapsedSec: progress * cfg3d.journeyDurationSec,
          totalSec: cfg3d.journeyDurationSec,
          birdX: normalizedBirdX,
          birdTiltDeg: -(s.birdTilt * 180) / Math.PI,
          onRoute: s.onRouteFactor > 0.55,
        });
      }

      if (progress >= 1.0 && !s.completed) {
        s.completed = true;
        if (callbacksRef.current.onComplete) {
          callbacksRef.current.onComplete();
        }
      }

      renderer.render(scene, camera);
      if (!isStatic || ++staticFrames < 15) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [initialStage]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        overflow: 'hidden',
      }}
    />
  );
});

export default FlightWorld3D;

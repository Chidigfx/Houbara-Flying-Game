/**
 * Standalone Scene Exporter to GLB for Blender Customization
 *
 * Exports all 4 flight biomes as standard binary .glb files:
 *  - Stage 0: Arabian Oasis & Dunes (River Valley)
 *  - Stage 1: Zagros Mountain Crossing (Canyon & Cliffs)
 *  - Stage 2: Karakum Desert Passage (Crescent Sand Dunes)
 *  - Stage 3: Northern Breeding Grounds (Snowy Steppes)
 *
 * Features:
 *  - High-res displaced terrain mesh (43,000+ vertices with baked elevations)
 *  - Riverbed water plane (for Oasis/Forest)
 *  - Reusable golden Checkpoint Dome & ground contact ring
 *  - Golden migration route waypoints
 *  - Standard PBR materials ready for Blender EEVEE & Cycles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Node.js DOM FileReader Mock for GLTFExporter
class MockFileReader {
  constructor() {
    this._listeners = {};
  }
  addEventListener(event, callback) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(callback);
  }
  _dispatch(event) {
    if (this['on' + event]) this['on' + event]({ target: this });
    if (this._listeners[event]) {
      this._listeners[event].forEach((fn) => fn({ target: this }));
    }
  }
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this._dispatch('load');
      this._dispatch('loadend');
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result =
        'data:' +
        (blob.type || 'application/octet-stream') +
        ';base64,' +
        Buffer.from(buf).toString('base64');
      this._dispatch('load');
      this._dispatch('loadend');
    });
  }
}
global.FileReader = MockFileReader;

/* ── Terrain Height Math (Identical to WebGL Shaders) ─────────────── */
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

function riverCenterX(z) {
  return Math.sin(z * 0.0055) * 34.0 + Math.cos(z * 0.012 + 0.8) * 12.0;
}

function migrationRouteX(z) {
  return Math.sin(z * 0.0055 - 0.35) * 26.0 + Math.cos(z * 0.011 + 0.5) * 10.0;
}

function getDisplacedY(worldX, worldZ, biome) {
  const rCenter = riverCenterX(worldZ);
  const dist = Math.abs(worldX - rCenter);

  const wForest = clamp(1.0 - biome, 0.0, 1.0);
  const wMountain = clamp(1.0 - Math.abs(biome - 1.0), 0.0, 1.0);
  const wDesert = clamp(1.0 - Math.abs(biome - 2.0), 0.0, 1.0);
  const wSnow = clamp(biome - 2.0, 0.0, 1.0);

  // River channel depression
  const riverCut = smoothstep(0.0, 16.0, dist);
  const riverDepth = -2.6 * (1.0 - riverCut) * wForest;

  // Valley floor undulation
  const wave1 = Math.sin(worldX * 0.045 + worldZ * 0.032) * Math.cos(worldX * 0.028 - worldZ * 0.041);
  const wave2 = Math.sin(worldX * 0.085 - worldZ * 0.065 + 1.7) * 0.5;
  const floorUndulation = (wave1 * 0.5 + 0.5) * 4.2 + (wave2 * 0.5 + 0.5) * 2.4;
  const standardFloor = floorUndulation * lerp(1.0, smoothstep(12.0, 28.0, dist), wForest);

  // Barchan / Crescent Sand Dunes (Desert)
  let desertDunes = standardFloor;
  if (wDesert > 0.001) {
    const warp = Math.sin(worldX * 0.0075 + worldZ * 0.0075) * 34.0;
    const d1 = Math.sin(worldX * 0.026 + worldZ * 0.015 + warp * 0.09);
    const c1 = Math.max(0.0, 1.0 - Math.sqrt(d1 * d1 + 0.01) * 0.98);
    const d2 = Math.sin(worldX * 0.012 - worldZ * 0.022 - warp * 0.06 + 2.1);
    const c2 = Math.max(0.0, 1.0 - Math.sqrt(d2 * d2 + 0.01) * 0.98);
    const ripples = Math.sin(worldX * 0.28 + worldZ * 0.22) * 0.35;
    desertDunes = (c1 * 18.0 + c2 * 26.0 + ripples + floorUndulation * 0.4) * wDesert;
  }

  // Valley walls / cliffs
  const wallDist = Math.max(0.0, dist - 48.0);
  const forestWalls = Math.pow(wallDist * 0.048, 1.7) * 22.0 * wForest;

  // Mountain canyon sheer rock cliffs
  const canyonWall = Math.pow(Math.max(0.0, dist - 34.0) * 0.075, 1.55) * 46.0 * wMountain;

  // Snow peaks
  const snowWalls = Math.pow(Math.max(0.0, dist - 42.0) * 0.055, 1.85) * 58.0 * wSnow;

  const yBase = riverDepth + lerp(standardFloor, desertDunes, wDesert) + forestWalls + canyonWall + snowWalls;
  return clamp(yBase, -4.0, 120.0);
}

const STAGES = [
  {
    biome: 0,
    slug: '01_arabian_oasis',
    name: 'Arabian Oasis & Dunes (River Valley)',
    terrainColor: 0x3d6635,
    terrainRoughness: 0.88,
    hasRiver: true,
  },
  {
    biome: 1,
    slug: '02_zagros_mountains',
    name: 'Zagros Mountain Crossing (Canyon Cliffs)',
    terrainColor: 0x8a6a4d,
    terrainRoughness: 0.92,
    hasRiver: false,
  },
  {
    biome: 2,
    slug: '03_karakum_desert',
    name: 'Karakum Desert Passage (Sand Dunes)',
    terrainColor: 0xd49b52,
    terrainRoughness: 0.95,
    hasRiver: false,
  },
  {
    biome: 3,
    slug: '04_northern_steppe',
    name: 'Northern Breeding Grounds (Snow Steppe)',
    terrainColor: 0xe0eaf2,
    terrainRoughness: 0.72,
    hasRiver: false,
  },
];

async function exportBiome(stage) {
  const exportGroup = new THREE.Group();
  exportGroup.name = `Houbara_Flight_${stage.slug}`;

  // 1. Terrain Mesh (High-Fidelity Displaced 180x240 Grid)
  const TERRAIN_DEPTH = 720;
  const terrainGeo = new THREE.PlaneGeometry(540, TERRAIN_DEPTH, 180, 240);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -320);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getDisplacedY(x, z, stage.biome);
    posAttr.setY(i, y);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: stage.terrainColor,
    roughness: stage.terrainRoughness,
    metalness: 0.05,
    name: `Mat_Terrain_${stage.slug}`,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.name = `Terrain_${stage.slug}`;
  exportGroup.add(terrainMesh);

  // 2. River Water Surface (Oasis stage)
  if (stage.hasRiver) {
    const riverGeo = new THREE.PlaneGeometry(38, TERRAIN_DEPTH, 16, 120);
    riverGeo.rotateX(-Math.PI / 2);
    riverGeo.translate(0, 0, -320);
    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const xLocal = rPos.getX(i);
      const zLocal = rPos.getZ(i);
      const rc = riverCenterX(zLocal);
      rPos.setX(i, rc + xLocal);
      rPos.setY(i, -0.6);
    }
    rPos.needsUpdate = true;
    riverGeo.computeVertexNormals();

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x1f5c6e,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.82,
      name: 'Mat_River_Water',
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.name = 'River_Water';
    exportGroup.add(riverMesh);
  }

  // 3. Golden Checkpoint Dome & Ground Rim
  const domeGeo = new THREE.SphereGeometry(64, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.51);
  domeGeo.scale(1.0, 0.88, 1.0);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xf5c96b,
    emissive: 0x5a4112,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.25,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    name: 'Mat_Checkpoint_Dome',
  });
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.name = 'Golden_Checkpoint_Dome';

  const ringGeo = new THREE.RingGeometry(64 * 0.975, 64 * 1.015, 64);
  ringGeo.rotateX(-Math.PI / 2);
  ringGeo.translate(0, 0.35, 0);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfff0b8,
    emissive: 0x886618,
    emissiveIntensity: 0.5,
    metalness: 0.9,
    roughness: 0.15,
    name: 'Mat_Dome_BaseRing',
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = 'Golden_Ground_Ring';

  const domeHolder = new THREE.Group();
  domeHolder.name = 'Checkpoint_Structure';
  domeHolder.add(domeMesh);
  domeHolder.add(ringMesh);
  domeHolder.position.set(migrationRouteX(-320), -1.5, -320);
  exportGroup.add(domeHolder);

  // 4. Migration Waypoint Trail
  const waypointsGroup = new THREE.Group();
  waypointsGroup.name = 'Migration_Waypoints_Trail';
  const orbGeo = new THREE.SphereGeometry(0.55, 12, 12);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xffefb8,
    emissive: 0xf3d795,
    emissiveIntensity: 0.8,
    metalness: 0.6,
    roughness: 0.2,
    name: 'Mat_Waypoint_Orb',
  });
  for (let k = 0; k < 28; k++) {
    const wz = -k * 22;
    const wx = migrationRouteX(wz);
    const wy = 14.5 + Math.sin(k * 0.45) * 1.8;
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.name = `Waypoint_${k + 1}`;
    orb.position.set(wx, wy, -k * 22);
    waypointsGroup.add(orb);
  }
  exportGroup.add(waypointsGroup);

  // 5. Lighting
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
  sun.name = 'Sun_Light';
  sun.position.set(70, 140, 60);
  exportGroup.add(sun);

  const amb = new THREE.AmbientLight(0xdbe6f0, 0.65);
  amb.name = 'Sky_Ambient';
  exportGroup.add(amb);

  // 6. Export to GLB
  const outDir = path.join(projectRoot, 'exported_glb');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `houbara_flight_${stage.slug}.glb`);

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      exportGroup,
      (gltfBinary) => {
        try {
          fs.writeFileSync(outPath, Buffer.from(gltfBinary));
          const stats = fs.statSync(outPath);
          console.log(
            `✔ Exported: ${path.basename(outPath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB) - ${stage.name}`
          );
          resolve(outPath);
        } catch (err) {
          reject(err);
        }
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

async function run() {
  console.log('--- Exporting 3D Flight Biomes to .GLB for Blender ---');
  for (const stage of STAGES) {
    await exportBiome(stage);
  }
  console.log('--- All scenes exported successfully to /exported_glb/ ---');
}

run().catch((err) => {
  console.error('Export error:', err);
  process.exit(1);
});

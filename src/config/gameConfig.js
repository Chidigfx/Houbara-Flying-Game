/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  HOUBARA MIGRATION — MASTER EXHIBITION CONFIGURATION              ║
 * ║                                                                    ║
 * ║  All exhibition settings, asset paths, bird physics, checkpoints, ║
 * ║  journey stages, map markers, and timing parameters live here.    ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const asset = (path) => {
  const base = import.meta.env.BASE_URL || './';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${clean}`;
};

const GAME_CONFIG = {

  /* ── Exhibition & Display ────────────────────────────────────────── */
  display: {
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16 / 9',
    fullscreenEnabled: true,
    renderMode: '3d',         // '3d' = real-time interactive 3D world | 'video' = pre-rendered MP4s
  },

  /* ── Real-Time 3D Flight World Configuration ─────────────────────── */
  world3d: {
    journeyDurationSec: 90,   // Total base flight duration (seconds) across all 4 biomes
    cruiseSpeed: 46,          // Base forward flight speed (world units / sec)
    routeBoostMultiplier: 1.25,// Speed multiplier when flying along the golden migration trail
    lateralRange: 48,         // Max left/right steering distance from valley center
    steerResponsiveness: 42,  // Lateral steering speed in 3D world units
    cameraBankFactor: 0.35,   // How much the chase camera banks when turning
    wingFlapSpeed: 3.2,       // Wingbeat frequency (Hz) during active flapping
  },

  /* ── Bird Configuration ──────────────────────────────────────────── */
  bird: {
    // Start position as percentage of viewport (50% width, 61% height as per specification)
    startX: 0.50,
    startY: 0.61,

    // Movement & banking physics
    speed: 11,                // Horizontal steering speed (px/normalised 60fps frame)
    maxTilt: 18,              // Max banking rotation in degrees
    tiltSmoothing: 0.12,      // Rotation interpolation (higher = snappier, lower = smoother)
    returnSmoothing: 0.08,    // Auto-centering rotation recovery when steering released

    // Bounds & scaling
    boundaryPadding: 100,     // Screen edge padding (px) to prevent bird going off-screen
    widthVw: 24,              // Bird width as % of screen width (24 = ~460px at 1920)
    scale: 1.0,               // Multiplier on top of widthVw

    // Clear of bottom-right map: bird max right bound stops before map panel
    avoidMapPanel: true,
    mapPanelMarginRight: 0.82,// fraction of width where map starts
  },

  /* ── Asset Paths ─────────────────────────────────────────────────── */
  assets: {
    // Background images for menu screens
    backgrounds: {
      welcome: asset('/assets/backgrounds/welcome-bg.jpg'),
      instructions: asset('/assets/backgrounds/instructions-bg.jpg'),
      completion: asset('/assets/backgrounds/completion-bg.jpg'),
    },

    // Bird assets
    bird: {
      image: asset('/assets/bird/bird.png'),           // Transparent PNG cutout
      welcomeHero: asset('/assets/bird/bird_welcome_crop.png'),
      completionPerched: asset('/assets/bird/bird_perched_crop.png'),
      modelGlb: asset('/assets/bird/bird.glb'),
    },

    // Map & icons
    map: {
      background: asset('/assets/map/minimap_reference.png'),
    },
    icons: {
      controllersHold: asset('/assets/icons/controllers_hold.png'),
      controllersSteer: asset('/assets/icons/controllers_steer.png'),
      routeCard: asset('/assets/icons/route_card.png'),
    },

    // Pre-rendered Journey Videos
    video: {
      fullJourney: asset('/assets/video/scene1-valley.mp4'),
      scenes: [
        {
          id: 'valley',
          name: 'Arabian Oasis & Dunes',
          subtitle: 'UAE Wintering Habitat',
          src: asset('/assets/video/scene1-valley.mp4'),
          durationSec: 22,
        },
        {
          id: 'mountains',
          name: 'Zagros Mountain Crossing',
          subtitle: 'High Altitude Pass — Iran',
          src: asset('/assets/video/scene2-mountains.mp4'),
          durationSec: 22,
        },
        {
          id: 'desert',
          name: 'Karakum Desert Passage',
          subtitle: 'Arid Steppe & Canyons — Turkmenistan',
          src: asset('/assets/video/scene3-desert.mp4'),
          durationSec: 22,
        },
        {
          id: 'snow',
          name: 'Northern Breeding Grounds',
          subtitle: 'Central Asian Steppe — Kazakhstan',
          src: asset('/assets/video/scene4-snow.mp4'),
          durationSec: 24,
        },
      ],
    },
  },

  /* ── Migration Journey panel (bottom-right) ──────────────────────── */
  journeyPanel: {
    title: 'MIGRATION JOURNEY',
    routeLabel: 'ILLUSTRATIVE ROUTE',
    destinationLabel: 'CURRENT DESTINATION',
    mapImage: asset('/assets/map/region-map.svg'),
    nodes: [
      { name: 'UAE',          lonLat: [54.4, 24.45], labelSide: 'right' },
      { name: 'IRAN',         lonLat: [58.5, 31.0],  labelSide: 'left', showLabel: false },
      { name: 'TURKMENISTAN', lonLat: [62.5, 37.2],  labelSide: 'left', showLabel: false },
      { name: 'KAZAKHSTAN',   lonLat: [68.0, 43.0],  labelSide: 'left'  },
    ],
    labels: [
      { text: 'IRAN', lonLat: [54.0, 32.6] },
    ],
  },

  /* ── Checkpoint gates ────────────────────────────────────────────── */
  checkpoints: [
    {
      id: 'cp-1',
      scene: 0,
      x: 0.62,
      name: 'Zagros Foothills Waypoint',
      fact: 'Houbara bustards migrate over 2,000 km between seasonal breeding and wintering habitats.',
      message: 'CHECKPOINT REACHED',
      displayDurationMs: 4200,
    },
    {
      id: 'cp-2',
      scene: 1,
      x: 0.38,
      name: 'High Ridge Mountain Pass',
      fact: 'Migrating Houbara can reach altitudes up to 4,000 metres to cross rugged mountain ranges.',
      message: 'CHECKPOINT REACHED',
      displayDurationMs: 4200,
    },
    {
      id: 'cp-3',
      scene: 2,
      x: 0.58,
      name: 'Karakum Steppe Oasis',
      fact: 'Conservation breeding and release programs have restored over 300,000 birds to wild habitats.',
      message: 'CHECKPOINT REACHED',
      displayDurationMs: 4200,
    },
  ],

  /* ── Gate & Checkpoint Dome Configuration ────────────────────────── */
  // Reusable semi-transparent golden dome positioned near the end of each
  // environment. Size, position, colour, glow, and trigger area are all adjustable.
  checkpointDome: {
    radius: 64,                 // 3D dome radius in world units (large enough to fly into comfortably)
    heightScale: 0.88,          // Vertical arch ratio of the dome hemisphere
    baseY: -1.5,                // Ground contact elevation of the dome base
    color: '#F5C96B',           // Warm amber/gold surface tint
    rimColor: '#FFF0B8',        // Thin illuminated outline & caustic filigree colour
    glowIntensity: 0.88,        // Overall soft glow multiplier (0.0 – 1.5)
    surfaceOpacity: 0.14,       // Interior transparency (low so landscape stays clearly visible)
    filigreeScale: 0.095,       // Scale of the subtle animated cellular/caustic surface texture
    pulseSpeed: 1.8,            // Gentle shimmer/pulse speed (Hz)
    fadeStartDistance: 440,     // Distance (m) where the dome begins fading in on the horizon
    fullVisibleDistance: 150,   // Distance (m) where the dome reaches full visibility
    triggerDistance: 52,        // Invisible trigger radius (m) when the bird enters the dome
    rippleDurationMs: 1400,     // Duration of the golden light ripple on entry
    soundEnabled: true,         // Play subtle harmonic success chime on checkpoint entry
  },

  gate: {
    appearBeforeEndSec: 5.5,
    crossBeforeEndSec: 1.9,
    crossingMs: 1700,
    diameterVw: 52,
    hitToleranceVw: 22,
    startScale: 0.14,
    horizonY: 0.48,
    finalFadeMs: 900,
  },

  /* ── Conservation Facts (Rotates in Bottom-Right Panel) ───────────── */
  facts: [
    'Some Houbara populations migrate between seasonal habitats.',
    'Tracking with satellite transmitters reveals epic migrations of thousands of kilometres.',
    'Flocks navigate ancient flyways across mountain ranges and desert valleys.',
    'Protected reserves and breeding centres ensure future generations can take flight.',
  ],

  /* ── Exhibition Timing & Flow ────────────────────────────────────── */
  timing: {
    objectiveFadeDelayMs: 6000,
    steeringPromptFadeMs: 5000,
    inactivityResetDelayMs: 20000,
    instructionsAutoSkipMs: 12000,
  },

  /* ── Developer & Exhibition Mode ─────────────────────────────────── */
  dev: {
    showDebugPanel: false,
    showGamepadStatus: true,
    allowSkipWithKey: true,
  },
};

export default GAME_CONFIG;

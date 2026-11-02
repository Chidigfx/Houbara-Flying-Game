import React, { useCallback, useEffect, useRef, useState } from 'react';
import GAME_CONFIG from '../config/gameConfig';
import useInput from '../hooks/useInput';
import Bird from './Bird';
import SceneVideoStack from './SceneVideoStack';
import CheckpointDome, { playCheckpointChime } from './CheckpointDome';
import FlightWorld3D from './FlightWorld3D';
import ObjectiveBanner from './ObjectiveBanner';
import SteeringPrompt from './SteeringPrompt';
import MigrationMapPanel from './MigrationMapPanel';
import CheckpointNotification from './CheckpointNotification';
import DevPanel from './DevPanel';
import MobileControls from './MobileControls';

/**
 * GAMEPLAY SCREEN
 *
 * Supports two exhibition rendering engines:
 *   1. '3d' (default): Real-Time 3D Procedural Flight World (Three.js / WebGL)
 *      with true steering, camera banking, winding golden migration trail,
 *      4 seamless biomes, 3D astrolabe checkpoint gates, and an articulated
 *      wing-flapping 3D Houbara bustard.
 *   2. 'video': Pre-rendered MP4 video stack with circular iris gate transitions.
 *
 * Press [M] at any time (or use the Operator Dev Panel [D]) to toggle between
 * '3d' and 'video' modes live.
 */

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function GameScreen({ onComplete, onExit }) {
  const {
    getInput,
    gamepadConnected,
    gamepadId,
    isTouchDevice,
    setLeftDown,
    setRightDown,
  } = useInput();
  const config = GAME_CONFIG;
  const scenes = config.assets.video.scenes;

  const initialMode = (() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'video' || m === '3d') return m;
    return config.display.renderMode || '3d';
  })();

  const [renderMode, setRenderMode] = useState(initialMode);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [mapProgress, setMapProgress] = useState(0);
  const [clock, setClock] = useState({ t: 0, d: config.world3d.journeyDurationSec });
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [currentFact, setCurrentFact] = useState(config.facts[0]);
  const [showObjective, setShowObjective] = useState(true);
  const [showSteeringPrompt, setShowSteeringPrompt] = useState(true);
  const [showDevPanel, setShowDevPanel] = useState(config.dev.showDebugPanel);
  const [videoError, setVideoError] = useState(null);
  const [exportNotice, setExportNotice] = useState(null);
  const [endFade, setEndFade] = useState(false);
  const [mounted, setMounted] = useState(() => new URLSearchParams(window.location.search).has('static'));

  const world3dRef = useRef(null);
  const stackRef = useRef(null);
  const gateRef = useRef(null);
  const birdWrapRef = useRef(null);
  const posRef = useRef({ x: config.bird.startX, tilt: 0 });
  const S = useRef({ idx: 0, phase: 'flying', fbT: 0, uiAt: 0 });
  const lastUiUpdateRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  onCompleteRef.current = onComplete;
  onExitRef.current = onExit;

  /* ── Mount fade-in ──────────────────────────────────────────────── */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Video stack initialization (only when in 'video' mode) ──────── */
  useEffect(() => {
    if (renderMode !== 'video') return undefined;
    let cancelled = false;
    S.current = { idx: 0, phase: 'flying', fbT: 0, uiAt: 0 };
    setSceneIndex(0);
    setVideoError(null);

    (async () => {
      const ok = await stackRef.current?.start(scenes[0].src);
      if (cancelled) return;
      if (ok === false) {
        setVideoError(`Could not load the background video: ${scenes[0].src}`);
        return;
      }
      if (scenes[1]) stackRef.current?.loadStandby(scenes[1].src);
    })();

    return () => {
      cancelled = true;
    };
  }, [renderMode, scenes]);

  /* ── Objective / steering prompts fade away ─────────────────────── */
  useEffect(() => {
    const a = setTimeout(() => setShowObjective(false), config.timing.objectiveFadeDelayMs);
    const b = setTimeout(() => setShowSteeringPrompt(false), config.timing.steeringPromptFadeMs);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [config.timing.objectiveFadeDelayMs, config.timing.steeringPromptFadeMs]);

  /* ── Skip to next gate helper ───────────────────────────────────── */
  const skipToGate = useCallback(() => {
    if (renderMode === '3d') {
      world3dRef.current?.skipToNextGate();
      return;
    }
    const v = stackRef.current?.getActive();
    if (v && v.duration) {
      v.currentTime = Math.max(0, v.duration - config.gate.appearBeforeEndSec - 0.1);
    }
  }, [renderMode, config.gate.appearBeforeEndSec]);

  const toggleRenderMode = useCallback(() => {
    setRenderMode((prev) => (prev === '3d' ? 'video' : '3d'));
  }, []);

  const handleExportGLB = useCallback(async () => {
    if (renderMode !== '3d' || !world3dRef.current?.exportSceneToGLB) {
      setExportNotice('GLB Export is only available in 3D Flight Mode. Switch with [M].');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }
    try {
      setExportNotice('Exporting high-fidelity 3D scene to Blender (.GLB)...');
      const res = await world3dRef.current.exportSceneToGLB();
      setExportNotice(`Downloaded ${res.fileName}! Ready to edit in Blender.`);
      setTimeout(() => setExportNotice(null), 4500);
    } catch (err) {
      console.error('Export error:', err);
      setExportNotice('Export failed: ' + (err.message || err));
      setTimeout(() => setExportNotice(null), 4500);
    }
  }, [renderMode]);

  /* ── Dev keys: Backquote/` or F2 panel, M mode toggle, N next gate, X export GLB, F fullscreen ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Backquote' || e.code === 'F2' || (e.code === 'KeyD' && e.shiftKey)) {
        setShowDevPanel((v) => !v);
      } else if (e.code === 'KeyM') toggleRenderMode();
      else if (e.code === 'KeyN' && config.dev.allowSkipWithKey) skipToGate();
      else if (e.code === 'KeyX') handleExportGLB();
      else if (e.code === 'KeyF') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config.dev.allowSkipWithKey, skipToGate, toggleRenderMode, handleExportGLB]);

  /* ── 3D Mode Callbacks ──────────────────────────────────────────── */
  const handle3DProgress = useCallback(
    ({ progress, sceneIndex: sIdx, elapsedSec, totalSec, birdX, birdTiltDeg }) => {
      const input = getInput();
      if (input.cancel) {
        onExitRef.current();
        return;
      }
      posRef.current.x = birdX;
      posRef.current.tilt = birdTiltDeg;

      const now = performance.now();
      if (now - lastUiUpdateRef.current > 95) {
        lastUiUpdateRef.current = now;
        setMapProgress(progress);
        setSceneIndex(sIdx);
        setClock({ t: elapsedSec, d: totalSec });
      }
    },
    [getInput]
  );

  const handle3DCheckpoint = useCallback(
    (cp, aligned, nextStageIdx) => {
      if (cp) {
        setActiveCheckpoint({
          ...cp,
          message: aligned ? 'CHECKPOINT REACHED' : 'WAYPOINT PASSED',
        });
        setCurrentFact(cp.fact);
      } else {
        setCurrentFact(config.facts[nextStageIdx % config.facts.length]);
      }
    },
    [config.facts]
  );

  const handle3DComplete = useCallback(() => {
    setEndFade(true);
    setTimeout(() => onCompleteRef.current(), config.gate.finalFadeMs);
  }, [config.gate.finalFadeMs]);

  /* ── Video Mode Loop (only runs when renderMode === 'video') ─────── */
  useEffect(() => {
    if (renderMode !== 'video') return undefined;

    const G = config.gate;
    const checkpoints = config.checkpoints;
    let raf;
    let last = performance.now();

    const startCrossing = (cp, hit, now, gx, gy) => {
      const s = S.current;
      s.phase = 'crossing';
      s.crossStart = now;
      s.cp = cp;
      s.hit = hit;
      s.startCx = gx;
      s.startCy = gy;
      s.r1 = ((G.diameterVw / 100) * window.innerWidth) / 2;
      stackRef.current?.playStandby();
      if (cp) playCheckpointChime();
      if (hit && cp) {
        setTimeout(() => setActiveCheckpoint(cp), 250);
        setCurrentFact(cp.fact);
      } else {
        setCurrentFact(config.facts[(s.idx + 1) % config.facts.length]);
      }
    };

    const loop = (now) => {
      const rawDt = now - last;
      last = now;
      const dt = Math.min(rawDt / 16.667, 3);
      const W = window.innerWidth;
      const H = window.innerHeight;
      const s = S.current;

      const input = getInput();
      if (input.cancel) {
        onExitRef.current();
        return;
      }

      const speed = config.bird.speed / W;
      posRef.current.x += input.horizontal * speed * dt;
      const minX = config.bird.boundaryPadding / W;
      const maxX = config.bird.avoidMapPanel ? config.bird.mapPanelMarginRight : 1 - minX;
      posRef.current.x = clamp(posRef.current.x, minX, maxX);
      const targetTilt = input.horizontal * config.bird.maxTilt;
      const smoothing = input.horizontal !== 0 ? config.bird.tiltSmoothing : config.bird.returnSmoothing;
      posRef.current.tilt += (targetTilt - posRef.current.tilt) * smoothing * dt;
      if (birdWrapRef.current) {
        birdWrapRef.current.style.left = `${posRef.current.x * 100}%`;
        birdWrapRef.current.style.transform = `translate(-50%, -50%) rotate(${posRef.current.tilt.toFixed(2)}deg)`;
      }

      const vid = stackRef.current?.getActive();
      let t = vid?.currentTime || 0;
      let D = vid?.duration || 0;
      if (!(D > 0)) {
        s.fbT += rawDt / 1000;
        t = s.fbT;
        D = scenes[s.idx]?.durationSec || 8;
      }
      const remaining = D - t;
      const ended = !!vid?.ended;
      const birdPxX = posRef.current.x * W;
      const birdPxY = config.bird.startY * H;
      const cp = checkpoints.find((c) => c.scene === s.idx);
      const lastScene = s.idx >= scenes.length - 1;

      if (s.phase === 'flying') {
        if (cp) {
          if (remaining <= G.appearBeforeEndSec) {
            const span = G.appearBeforeEndSec - G.crossBeforeEndSec;
            const u = clamp((G.appearBeforeEndSec - remaining) / span);
            const sc = G.startScale + (1 - G.startScale) * u * u;
            const r1 = ((G.diameterVw / 100) * W) / 2;
            const cx = W * (0.5 + (cp.x - 0.5) * sc);
            const cy = H * lerp(G.horizonY, config.bird.startY, u * u);
            const r = r1 * sc;
            const aligned = Math.abs(birdPxX - W * cp.x) < (G.hitToleranceVw / 100) * W;
            gateRef.current?.update({
              cx,
              cy,
              r,
              opacity: clamp(u * 4),
              aligned,
              label: `CHECKPOINT ${String(checkpoints.indexOf(cp) + 1).padStart(2, '0')}`,
              labelOpacity: clamp((u - 0.2) * 3),
              front: false,
            });
            stackRef.current?.setIris(cx, cy, r * 0.97);
            s.gx = cx;
            s.gy = cy;
            s.aligned = aligned;
            if (remaining <= G.crossBeforeEndSec || ended) {
              startCrossing(cp, aligned, now, W * cp.x, config.bird.startY * H);
            }
          }
        } else if (!lastScene && (remaining <= 0.15 || ended)) {
          startCrossing(null, false, now, W / 2, H / 2);
        } else if (lastScene && (remaining <= G.finalFadeMs / 1000 + 0.1 || ended)) {
          s.phase = 'finishing';
          setEndFade(true);
          setTimeout(() => onCompleteRef.current(), G.finalFadeMs);
        }
      }

      if (s.phase === 'crossing') {
        const tau = clamp((now - s.crossStart) / G.crossingMs);
        const diag = Math.hypot(W, H) * 1.12;
        const sEnd = diag / s.r1;
        const sc = 1 + (sEnd - 1) * tau * tau;
        const r = s.r1 * sc;

        let cx;
        let cy;
        if (s.hit) {
          const k = easeOutCubic(clamp(tau * 2.2));
          cx = lerp(s.startCx, birdPxX, k);
          cy = lerp(s.startCy, birdPxY, k);
        } else {
          cx = s.cp ? W * (0.5 + (s.cp.x - 0.5) * sc) : W / 2;
          cy = s.startCy;
        }

        if (s.hit || !s.cp) {
          stackRef.current?.setIris(cx, cy, r * 0.98);
          if (!s.cp) stackRef.current?.setIris(W / 2, H / 2, diag * smooth(tau));
        } else {
          const k = smooth(clamp((tau - 0.45) / 0.55));
          stackRef.current?.setIris(lerp(cx, W / 2, k), lerp(cy, H / 2, k), lerp(r * 0.98, diag, k));
        }

        if (s.cp) {
          gateRef.current?.update({
            cx,
            cy,
            r,
            opacity: 1 - smooth(clamp((tau - 0.7) / 0.3)),
            aligned: s.hit,
            label: '',
            labelOpacity: 0,
            front: true,
          });
        }

        if (tau >= 1) {
          stackRef.current?.promote();
          gateRef.current?.update({ cx: 0, cy: 0, r: 1, opacity: 0, aligned: false, label: '', labelOpacity: 0, front: false });
          s.idx += 1;
          s.phase = 'flying';
          s.fbT = 0;
          setSceneIndex(s.idx);
          if (scenes[s.idx + 1]) stackRef.current?.loadStandby(scenes[s.idx + 1].src);
        }
      }

      if (now - s.uiAt > 100) {
        s.uiAt = now;
        const sp = clamp(t / D);
        const segments = scenes.length - 1;
        setMapProgress(s.idx >= segments ? 1 : (s.idx + sp) / segments);
        setClock({ t, d: D });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [renderMode, config, scenes, getInput]);

  const currentScene = scenes[Math.min(sceneIndex, scenes.length - 1)];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#08120e',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}
    >
      {renderMode === '3d' ? (
        <FlightWorld3D
          ref={world3dRef}
          gateRef={gateRef}
          getInput={getInput}
          onProgress={handle3DProgress}
          onCheckpoint={handle3DCheckpoint}
          onComplete={handle3DComplete}
        />
      ) : (
        <>
          <SceneVideoStack
            ref={stackRef}
            onError={() =>
              setVideoError('A background video failed to load. Check the paths in src/config/gameConfig.js.')
            }
          />
          <div
            ref={birdWrapRef}
            style={{
              position: 'absolute',
              left: `${config.bird.startX * 100}%`,
              top: `${config.bird.startY * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              pointerEvents: 'none',
              willChange: 'left, transform',
            }}
          >
            <Bird scale={config.bird.scale} />
          </div>
        </>
      )}

      {renderMode === 'video' && <CheckpointDome ref={gateRef} />}

      <div className="screen-frame" />
      <ObjectiveBanner visible={showObjective} />
      <CheckpointNotification checkpoint={activeCheckpoint} />
      <SteeringPrompt
        visible={showSteeringPrompt}
        isTouch={isTouchDevice}
        onLeftDown={() => setLeftDown(true)}
        onLeftUp={() => setLeftDown(false)}
        onRightDown={() => setRightDown(true)}
        onRightUp={() => setRightDown(false)}
      />
      <MigrationMapPanel progress={mapProgress} currentFact={currentFact} />

      {isTouchDevice && (
        <MobileControls
          onLeftDown={() => setLeftDown(true)}
          onLeftUp={() => setLeftDown(false)}
          onRightDown={() => setRightDown(true)}
          onRightUp={() => setRightDown(false)}
          onSkipGate={skipToGate}
          onExit={onExit}
        />
      )}

      <DevPanel
        visible={showDevPanel}
        renderMode={renderMode}
        onToggleMode={toggleRenderMode}
        sceneIndex={sceneIndex}
        totalScenes={scenes.length}
        sceneName={currentScene.name}
        videoTime={clock.t}
        videoDuration={clock.d}
        birdX={posRef.current.x}
        birdTilt={posRef.current.tilt}
        gamepadConnected={gamepadConnected}
        gamepadId={gamepadId}
        onSkipScene={skipToGate}
        onExportGLB={handleExportGLB}
        onComplete={() => onCompleteRef.current()}
      />

      {/* Export notification toast */}
      {exportNotice && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(8, 18, 14, 0.94)',
            border: '1px solid #F5C96B',
            borderRadius: 8,
            padding: '10px 22px',
            color: '#F5C96B',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 'bold',
            letterSpacing: '0.04em',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {exportNotice}
        </div>
      )}

      {/* End-of-journey fade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 60,
          pointerEvents: 'none',
          background: '#07120e',
          opacity: endFade ? 1 : 0,
          transition: `opacity ${config.gate.finalFadeMs}ms ease`,
        }}
      />

      {videoError && renderMode === 'video' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: 'rgba(10, 20, 16, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-serif)', color: '#DEC38B', marginBottom: 12 }}>Video Playback Notice</h2>
          <p style={{ color: 'var(--color-ivory-dim)', maxWidth: 520, marginBottom: 24 }}>{videoError}</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => setRenderMode('3d')} className="btn-gold-pill">
              Switch to 3D Flight World
            </button>
            <button onClick={onExit} className="btn-gold-pill">
              Return to Welcome Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

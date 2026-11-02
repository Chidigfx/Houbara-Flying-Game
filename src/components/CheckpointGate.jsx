import React, { forwardRef, useImperativeHandle, useRef } from 'react';

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  GAME CHECKPOINT GATE OVERLAY (PROJECTED 3D + EXHIBITION HUD)     ║
 * ║                                                                    ║
 * ║  Renders a large, high-visibility game waypoint gate with:         ║
 * ║  - Rotating outer astrolabe ring & cardinal diamond Lock-On nodes  ║
 * ║  - Counter-rotating inner segmented game target reticle            ║
 * ║  - Dynamic alignment feedback (glows bright gold/emerald on lock)  ║
 * ║  - Live distance countdown & directional steering cues             ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);
const CARDINALS = [0, 90, 180, 270];

const CheckpointGate = forwardRef(function CheckpointGate(_, ref) {
  const group = useRef(null);
  const outerSpin = useRef(null);
  const innerSpin = useRef(null);
  const outerRing = useRef(null);
  const innerRing = useRef(null);
  const coreWash = useRef(null);
  const glowRing = useRef(null);
  const root = useRef(null);
  const badgeEl = useRef(null);
  const titleEl = useRef(null);
  const statusEl = useRef(null);
  const angleRef = useRef(0);

  useImperativeHandle(ref, () => ({
    update({
      cx,
      cy,
      r,
      opacity,
      aligned,
      label,
      sublabel,
      distanceMeters,
      steerHint, // -1 = steer left, 0 = aligned, +1 = steer right
      labelOpacity = 1,
      front = false,
    }) {
      if (!group.current || !root.current) return;

      angleRef.current = (angleRef.current + 0.45) % 360;
      const a = angleRef.current;

      group.current.setAttribute(
        'transform',
        `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(r / 100).toFixed(4)})`
      );
      if (outerSpin.current) {
        outerSpin.current.setAttribute('transform', `rotate(${a.toFixed(1)})`);
      }
      if (innerSpin.current) {
        innerSpin.current.setAttribute('transform', `rotate(${(-a * 1.4).toFixed(1)})`);
      }

      root.current.style.opacity = opacity;
      root.current.style.zIndex = front ? 24 : 12;

      const mainColor = aligned ? '#ffe89e' : '#e3c37b';
      const accentColor = aligned ? '#7ef7b8' : '#f3d795';

      outerRing.current?.setAttribute('stroke', mainColor);
      innerRing.current?.setAttribute('stroke', accentColor);
      glowRing.current?.setAttribute('stroke', mainColor);

      const big = clamp01(1.35 - r / (window.innerWidth * 0.65));
      coreWash.current?.setAttribute('opacity', ((aligned ? 0.68 : 0.34) * big).toFixed(3));

      if (badgeEl.current) {
        badgeEl.current.style.opacity = label ? labelOpacity : 0;
        badgeEl.current.style.left = `${cx}px`;
        badgeEl.current.style.top = `${Math.max(95, cy - r - 54)}px`;
        badgeEl.current.style.borderColor = aligned
          ? 'rgba(126, 247, 184, 0.85)'
          : 'rgba(243, 215, 149, 0.75)';
        badgeEl.current.style.boxShadow = aligned
          ? '0 0 24px rgba(126, 247, 184, 0.35), 0 6px 20px rgba(0,0,0,0.65)'
          : '0 0 18px rgba(243, 215, 149, 0.25), 0 6px 20px rgba(0,0,0,0.65)';
      }

      if (titleEl.current) {
        const distText =
          typeof distanceMeters === 'number' && distanceMeters > 0
            ? ` • ${Math.round(distanceMeters)}M`
            : '';
        titleEl.current.textContent = `${label || ''}${distText}`;
      }

      if (statusEl.current) {
        if (sublabel) {
          statusEl.current.textContent = sublabel;
        } else if (aligned) {
          statusEl.current.textContent = '◆ TARGET LOCKED — FLY THROUGH ◆';
          statusEl.current.style.color = '#7ef7b8';
        } else if (steerHint < 0) {
          statusEl.current.textContent = '◀ STEER LEFT TO ENTER GATE';
          statusEl.current.style.color = '#ffe299';
        } else if (steerHint > 0) {
          statusEl.current.textContent = 'STEER RIGHT TO ENTER GATE ▶';
          statusEl.current.style.color = '#ffe299';
        } else {
          statusEl.current.textContent = 'FLY THROUGH THE WAYPOINT RING';
          statusEl.current.style.color = '#f3d795';
        }
      }
    },
  }));

  return (
    <div
      ref={root}
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
          <radialGradient id="gatePortalWash" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.0" stopColor="#fff6d6" stopOpacity="0.12" />
            <stop offset="0.62" stopColor="#f3d795" stopOpacity="0.06" />
            <stop offset="0.88" stopColor="#f3d795" stopOpacity="0.45" />
            <stop offset="1.0" stopColor="#ffe89e" stopOpacity="0.78" />
          </radialGradient>
          <filter id="gateBloom" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g ref={group} filter="url(#gateBloom)">
          {/* Radiant Portal Wash */}
          <circle ref={coreWash} r="100" fill="url(#gatePortalWash)" opacity="0.38" />

          {/* Outer Soft Halo Ring */}
          <circle
            ref={glowRing}
            r="105"
            fill="none"
            stroke="#f3d795"
            strokeOpacity="0.32"
            strokeWidth="6"
          />

          {/* Primary Bold Golden Ring */}
          <circle
            ref={outerRing}
            r="100"
            fill="none"
            stroke="#f3d795"
            strokeWidth="4.2"
          />

          {/* Rotating Outer Astrolabe Ticks & Cardinal Diamonds */}
          <g ref={outerSpin}>
            {TICKS.map((deg) => (
              <line
                key={deg}
                x1="0"
                y1="-103"
                x2="0"
                y2={deg % 30 === 0 ? -114 : -108}
                stroke="#ffe6a3"
                strokeOpacity={deg % 30 === 0 ? '0.9' : '0.55'}
                strokeWidth={deg % 30 === 0 ? '1.8' : '1.0'}
                transform={`rotate(${deg})`}
              />
            ))}
            {CARDINALS.map((deg) => (
              <polygon
                key={deg}
                points="0,-119 4.5,-112 0,-105 -4.5,-112"
                fill="#ffe89e"
                transform={`rotate(${deg})`}
              />
            ))}
          </g>

          {/* Counter-Rotating Inner Game Reticle Dashed Ring */}
          <g ref={innerSpin}>
            <circle
              ref={innerRing}
              r="88"
              fill="none"
              stroke="#f3d795"
              strokeOpacity="0.82"
              strokeWidth="2.2"
              strokeDasharray="28 18"
            />
            {/* Inner Corner Brackets */}
            {CARDINALS.map((deg) => (
              <path
                key={deg}
                d="M -12,-76 L 0,-82 L 12,-76"
                fill="none"
                stroke="#ffe89e"
                strokeWidth="2.0"
                strokeOpacity="0.75"
                transform={`rotate(${deg + 45})`}
              />
            ))}
          </g>

          {/* Subtle Center Aim Crosshair */}
          <circle r="4" fill="#ffe89e" fillOpacity="0.45" />
          <circle r="14" fill="none" stroke="#ffe89e" strokeOpacity="0.3" strokeWidth="1" />
        </g>
      </svg>

      {/* Game Waypoint HUD Pill above the ring */}
      <div
        ref={badgeEl}
        style={{
          position: 'absolute',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'rgba(10, 26, 20, 0.88)',
          border: '1.5px solid rgba(243, 215, 149, 0.8)',
          borderRadius: '999px',
          padding: '7px 22px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          whiteSpace: 'nowrap',
          opacity: 0,
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        <div
          ref={titleEl}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '0.95vw',
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: '#fff6e0',
          }}
        />
        <div
          ref={statusEl}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.72vw',
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: '#f3d795',
          }}
        />
      </div>
    </div>
  );
});

export default CheckpointGate;

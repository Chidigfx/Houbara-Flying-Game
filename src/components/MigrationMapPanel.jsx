import React, { useMemo } from 'react';
import GAME_CONFIG from '../config/gameConfig';
import { MAP_VIEW, project } from '../utils/mapProjection';

/**
 * Migration Journey panel (bottom-right of gameplay).
 *
 * - Left: regional map artwork (public/assets/map/region-map.svg) with a live
 *   route overlay: solid line = distance flown, dashed = remaining, bird marker
 *   follows journey progress (video playback).
 * - Right: title, 4 stage dots, current destination, conservation fact.
 *
 * All content comes from GAME_CONFIG.journeyPanel (route/place names are
 * placeholders until approved). Sizes use container units (cqw) so the whole
 * panel scales with its own width.
 */

const lerp = (a, b, t) => a + (b - a) * t;

function useRoute(progress) {
  const { nodes } = GAME_CONFIG.journeyPanel;
  const pts = useMemo(() => nodes.map((n) => project(n.lonLat)), [nodes]);

  return useMemo(() => {
    const last = pts.length - 1;
    const seg = Math.max(0, Math.min(1, progress)) * last;
    const k = Math.min(Math.floor(seg), last - 1);
    const f = seg - k;
    const pos = [lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)];
    const angle =
      (Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0]) * 180) / Math.PI + 90;
    const solid = [...pts.slice(0, k + 1), pos];
    const dashed = [pos, ...pts.slice(k + 1)];
    const active = Math.min(Math.floor(seg + 1e-6), last);
    return { pts, pos, angle, solid, dashed, active };
  }, [pts, progress]);
}

const toPoints = (arr) => arr.map((p) => p.join(',')).join(' ');

const GOLD = '#e3c987';
const GOLD_BRIGHT = '#f3d795';

function BirdMarker({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(1.15)`}>
      <path
        d="M0,-18 C2,-12 3,-8 3,-4 L16,6 C18,7 18,9 15,9 L3,3 L2,12 L7,16 C8,17 7,18 5,18 L0,15 L-5,18 C-7,18 -8,17 -7,16 L-2,12 L-3,3 L-15,9 C-18,9 -18,7 -16,6 L-3,-4 C-3,-8 -2,-12 0,-18Z"
        fill={GOLD_BRIGHT}
        stroke="#0b1a14"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Pin() {
  return (
    <svg viewBox="0 0 24 32" style={{ width: '2.3cqw', height: 'auto', flexShrink: 0 }} fill="none" stroke={GOLD} strokeWidth="1.8">
      <path d="M12 30 C12 30 3 19 3 12 a9 9 0 0 1 18 0 c0 7 -9 18 -9 18z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export default function MigrationMapPanel({ progress = 0, currentFact = GAME_CONFIG.facts[0] }) {
  const cfg = GAME_CONFIG.journeyPanel;
  const { pts, pos, angle, solid, dashed, active } = useRoute(progress);
  const nodes = cfg.nodes;
  const destination = nodes[Math.min(active + 1, nodes.length - 1)].name;
  const lastIdx = nodes.length - 1;

  const labelStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 2.5,
    paintOrder: 'stroke',
    stroke: 'rgba(6,18,14,0.75)',
    strokeWidth: 4,
    strokeLinejoin: 'round',
  };

  return (
    <div className="migration-map-panel">
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '3.4cqw',
          padding: '2.2cqw',
          borderRadius: '3cqw',
          border: '1.5px solid rgba(227,201,135,0.85)',
          background: 'linear-gradient(135deg, rgba(14,42,32,0.94), rgba(8,28,21,0.95))',
          boxShadow: '0 1.4cqw 4cqw rgba(0,0,0,0.5), inset 0 0 0 1px rgba(227,201,135,0.12)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        {/* ── Map ── */}
        <div
          className="migration-map-artwork"
          style={{
            position: 'relative',
            flex: '0 0 46%',
            aspectRatio: `${MAP_VIEW.width} / ${MAP_VIEW.height}`,
            borderRadius: '1.3cqw',
            overflow: 'hidden',
            border: '1px solid rgba(227,201,135,0.5)',
            background: '#0b262b',
          }}
        >
          <img
            src={cfg.mapImage}
            alt=""
            draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          />
          <svg
            viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {/* remaining route */}
            <polyline
              points={toPoints(dashed)}
              fill="none"
              stroke={GOLD}
              strokeWidth="4"
              strokeDasharray="12 9"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            {/* flown route */}
            <polyline
              points={toPoints(solid)}
              fill="none"
              stroke={GOLD_BRIGHT}
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(243,215,149,0.55))' }}
            />

            {/* extra country labels */}
            {cfg.labels.map((l) => {
              const [x, y] = project(l.lonLat);
              return (
                <text key={l.text} x={x} y={y} textAnchor="middle" fill="rgba(245,240,230,0.88)" style={labelStyle}>
                  {l.text}
                </text>
              );
            })}

            {/* route nodes */}
            {nodes.map((n, i) => {
              const [x, y] = pts[i];
              const endpoint = i === 0 || i === lastIdx;
              const dx = n.labelSide === 'right' ? 24 : -24;
              return (
                <g key={n.name}>
                  {endpoint ? (
                    <>
                      <circle cx={x} cy={y} r="17" fill="rgba(8,24,18,0.55)" stroke={GOLD} strokeWidth="3" />
                      <circle cx={x} cy={y} r="7.5" fill={GOLD_BRIGHT} />
                    </>
                  ) : (
                    <>
                      <circle cx={x} cy={y} r="11" fill="rgba(8,24,18,0.7)" stroke={GOLD} strokeWidth="3" />
                      <circle cx={x} cy={y} r="4.5" fill={GOLD_BRIGHT} />
                    </>
                  )}
                  {n.showLabel !== false && (
                    <text
                      x={x + dx}
                      y={y + (i === 0 ? 20 : -6)}
                      textAnchor={n.labelSide === 'right' ? 'start' : 'end'}
                      fill={GOLD_BRIGHT}
                      style={labelStyle}
                    >
                      {n.name}
                    </text>
                  )}
                </g>
              );
            })}

            <BirdMarker x={pos[0]} y={pos[1]} angle={angle} />

            <text
              x="16"
              y={MAP_VIEW.height - 16}
              fill="rgba(245,240,230,0.7)"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 15, letterSpacing: 3.2, fontWeight: 500 }}
            >
              {cfg.routeLabel}
            </text>
          </svg>
        </div>

        {/* ── Info column ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.6cqw 0.4cqw 0.2cqw 0' }}>
          <h3
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(10px, 2.45cqw, 15px)',
              fontWeight: 500,
              letterSpacing: '0.24em',
              color: 'var(--color-ivory)',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {cfg.title}
          </h3>

          {/* stage dots */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', margin: '0 0.4cqw' }}>
            <div style={{ position: 'absolute', left: '1.2cqw', right: '1.2cqw', top: '1.1cqw', height: 2, background: 'rgba(227,201,135,0.75)' }} />
            {nodes.map((n, i) => {
              const isActive = i === active;
              const isPast = i < active;
              return (
                <div key={n.name} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7cqw' }}>
                  <div
                    style={{
                      width: 'clamp(8px, 2.4cqw, 14px)',
                      height: 'clamp(8px, 2.4cqw, 14px)',
                      borderRadius: '50%',
                      boxSizing: 'border-box',
                      border: `2px solid ${GOLD}`,
                      background: isActive || isPast ? GOLD_BRIGHT : '#0c241b',
                      boxShadow: isActive ? '0 0 0 0.45cqw rgba(243,215,149,0.22)' : 'none',
                      transition: 'all 0.4s ease',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(8px, 1.45cqw, 11px)', letterSpacing: '0.12em', color: isActive ? GOLD_BRIGHT : 'var(--color-ivory-dim)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: 'rgba(227,201,135,0.35)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.4cqw', whiteSpace: 'nowrap' }}>
            <Pin />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(8px, 1.55cqw, 12px)', letterSpacing: '0.14em', color: 'var(--color-ivory-dim)' }}>
              {cfg.destinationLabel}:
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(9px, 2cqw, 13px)', fontWeight: 700, letterSpacing: '0.06em', color: GOLD_BRIGHT }}>
              {destination}
            </span>
          </div>

          <div style={{ height: 1, background: 'rgba(227,201,135,0.35)' }} />

          <p style={{ margin: 0, paddingLeft: '3.7cqw', fontFamily: 'var(--font-sans)', fontSize: 'clamp(8.5px, 2.1cqw, 13px)', lineHeight: 1.4, fontWeight: 400, color: 'var(--color-ivory)' }}>
            {currentFact}
          </p>
        </div>
      </div>
    </div>
  );
}

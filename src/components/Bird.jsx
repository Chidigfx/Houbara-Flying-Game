import React, { useState } from 'react';
import GAME_CONFIG from '../config/gameConfig';

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  BIRD COMPONENT (REAR-VIEW FLYING HOUBARA BUSTARD)                ║
 * ║                                                                    ║
 * ║  Renders the Houbara bird flying towards the horizon.              ║
 * ║  Currently loads a transparent PNG asset with an inline SVG        ║
 * ║  fallback if the PNG is missing or loading.                        ║
 * ║                                                                    ║
 * ║  EXTENSION PATHS:                                                  ║
 * ║  1. High-res Transparent PNG:                                      ║
 * ║     Place in `public/assets/bird/bird.png` (already supplied).     ║
 * ║                                                                    ║
 * ║  2. Animated Sprite Sheet:                                         ║
 * ║     Swap the <img> for a sprite-sheet element cycling wing-beat    ║
 * ║     frames in requestAnimationFrame.                               ║
 * ║                                                                    ║
 * ║  3. Animated 3D Model (.GLB):                                      ║
 * ║     Replace this component with a Three.js / React Three Fiber     ║
 * ║     <Canvas> loading `public/assets/bird/bird.glb` with an ambient ║
 * ║     + directional light rig and play the flight animation clip.    ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const BASE_WIDTH = 340;
const BASE_HEIGHT = 150;

/** Vector fallback matching the Houbara bustard plumage pattern */
export function HoubaraVectorSilhouette({ width, height }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 680 300"
      style={{ display: 'block', filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.55))' }}
    >
      <defs>
        <linearGradient id="wingGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d2b278" />
          <stop offset="40%" stopColor="#b48c4d" />
          <stop offset="85%" stopColor="#4a3725" />
          <stop offset="100%" stopColor="#251a10" />
        </linearGradient>
        <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dfc596" />
          <stop offset="70%" stopColor="#c39d5e" />
          <stop offset="100%" stopColor="#6e4f2d" />
        </linearGradient>
      </defs>

      {/* Outstretched Wings */}
      <g>
        {/* Left Wing Primary Feathers */}
        <path
          d="M 320 170 Q 220 190 70 120 Q 30 100 15 85 Q 40 120 120 170 Q 240 210 320 190 Z"
          fill="url(#wingGradient)"
        />
        {/* Left Wing Primary Feathers tips */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={`lp-${i}`}
            d={`M ${20 + i * 20} ${88 + i * 10} Q ${35 + i * 20} ${115 + i * 8} ${60 + i * 20} ${135 + i * 6}`}
            stroke="#251a10"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        ))}

        {/* Right Wing Primary Feathers */}
        <path
          d="M 360 170 Q 460 190 610 120 Q 650 100 665 85 Q 640 120 560 170 Q 440 210 360 190 Z"
          fill="url(#wingGradient)"
        />
        {/* Right Wing Primary Feathers tips */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={`rp-${i}`}
            d={`M ${660 - i * 20} ${88 + i * 10} Q ${645 - i * 20} ${115 + i * 8} ${620 - i * 20} ${135 + i * 6}`}
            stroke="#251a10"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        ))}

        {/* Wing Upper Coverts - sandy buff speckles */}
        <path
          d="M 330 160 Q 240 175 130 135 Q 230 170 330 180 Z"
          fill="#d8b97d"
          opacity="0.9"
        />
        <path
          d="M 350 160 Q 440 175 550 135 Q 450 170 350 180 Z"
          fill="#d8b97d"
          opacity="0.9"
        />

        {/* Speckled Barring along wings */}
        {[...Array(14)].map((_, i) => (
          <g key={`bar-${i}`}>
            <line
              x1={310 - i * 16}
              y1={165 - Math.sin(i * 0.25) * 20}
              x2={300 - i * 16}
              y2={175 - Math.sin(i * 0.25) * 20}
              stroke="#5a3e23"
              strokeWidth="2.5"
              opacity="0.65"
            />
            <line
              x1={370 + i * 16}
              y1={165 - Math.sin(i * 0.25) * 20}
              x2={380 + i * 16}
              y2={175 - Math.sin(i * 0.25) * 20}
              stroke="#5a3e23"
              strokeWidth="2.5"
              opacity="0.65"
            />
          </g>
        ))}

        {/* Tail Fan */}
        <polygon
          points="315,190 300,265 325,275 340,278 355,275 380,265 365,190"
          fill="#b88f4e"
        />
        {[...Array(7)].map((_, i) => (
          <line
            key={`tail-${i}`}
            x1={315 + i * 8}
            y1={195}
            x2={305 + i * 11}
            y2={270}
            stroke="#4a341e"
            strokeWidth="2.5"
          />
        ))}

        {/* Body Oval */}
        <ellipse cx="340" cy="180" rx="34" ry="42" fill="url(#bodyGradient)" />
        {/* Plumage detail */}
        {[...Array(8)].map((_, i) => (
          <ellipse
            key={`spot-${i}`}
            cx={330 + (i % 3) * 10}
            cy={155 + i * 6}
            rx="4"
            ry="2.5"
            fill="#4a341e"
            opacity="0.5"
          />
        ))}

        {/* Neck */}
        <polygon points="332,150 335,95 345,95 348,150" fill="#e0c89a" />
        {/* Distinctive black neck fringes of the Houbara */}
        <line x1="334" y1="145" x2="336" y2="105" stroke="#1d1610" strokeWidth="2.5" />
        <line x1="346" y1="145" x2="344" y2="105" stroke="#1d1610" strokeWidth="2.5" />

        {/* Head */}
        <ellipse cx="340" cy="85" rx="10" ry="12" fill="#d8b97d" />
        {/* White crest feathers */}
        <path d="M 338 80 Q 330 68 326 62" stroke="#faf6ee" strokeWidth="2" strokeLinecap="round" />
        <path d="M 342 80 Q 350 68 354 62" stroke="#faf6ee" strokeWidth="2" strokeLinecap="round" />
        {/* Beak forward */}
        <polygon points="337,76 343,76 340,65" fill="#887050" />
      </g>
    </svg>
  );
}

/**
 * `width` is any CSS length. The default scales with the screen (vw) so the
 * bird keeps its proportion on any 16:9 display.
 */
export default function Bird({ scale = GAME_CONFIG.bird.scale, width }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = GAME_CONFIG.assets.bird.image;
  const w = width || `${GAME_CONFIG.bird.widthVw * scale}vw`;

  if (imgFailed || !src) {
    return <HoubaraVectorSilhouette width={w} height="auto" />;
  }

  return (
    <img
      src={src}
      alt="Houbara bustard flying"
      onError={() => setImgFailed(true)}
      draggable={false}
      style={{
        width: w,
        height: 'auto',
        display: 'block',
        filter: 'drop-shadow(0 1.8vh 2.4vh rgba(0,0,0,0.45))',
        pointerEvents: 'none',
      }}
    />
  );
}

import React from 'react';

/**
 * Placeholder illustrations for the How To Play cards.
 * Pure SVG so they can be swapped for final hardware art later:
 * replace the component used in InstructionsScreen.jsx (or point
 * `cards[n].illustration` at an <img>).
 */

function Controller({ x = 0, y = 0, rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="-13" y="-34" width="26" height="62" rx="13" fill="#eef0ee" stroke="#c8a96b" strokeWidth="1" />
      <ellipse cx="0" cy="-16" rx="7" ry="8" fill="#2b3430" />
      <circle cx="0" cy="-16" r="3" fill="#c8a96b" opacity="0.8" />
      <circle cx="0" cy="4" r="3" fill="#cfd3d0" />
      <rect x="-4" y="14" width="8" height="3" rx="1.5" fill="#cfd3d0" />
    </g>
  );
}

const svgProps = { viewBox: '0 0 200 130', width: '100%', height: '100%', style: { display: 'block' } };

export function HoldIllustration() {
  return (
    <svg {...svgProps}>
      <ellipse cx="68" cy="112" rx="22" ry="5" fill="none" stroke="#c8a96b" strokeWidth="1.2" />
      <ellipse cx="132" cy="112" rx="22" ry="5" fill="none" stroke="#c8a96b" strokeWidth="1.2" />
      <Controller x={68} y={70} />
      <Controller x={132} y={70} />
    </svg>
  );
}

export function SteerIllustration() {
  return (
    <svg {...svgProps}>
      <path d="M 58 24 Q 78 10 96 22" fill="none" stroke="#c8a96b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 90 17 L 97 22 L 89 26" fill="none" stroke="#c8a96b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 142 24 Q 122 10 104 22" fill="none" stroke="#c8a96b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 110 17 L 103 22 L 111 26" fill="none" stroke="#c8a96b" strokeWidth="1.6" strokeLinecap="round" />
      <Controller x={66} y={78} rot={-22} />
      <Controller x={134} y={78} rot={22} />
    </svg>
  );
}

export function RouteIllustration() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="routeSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a4a52" />
          <stop offset="55%" stopColor="#c9a56a" />
          <stop offset="100%" stopColor="#1b2f25" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="188" height="118" rx="10" fill="url(#routeSky)" opacity="0.85" />
      <path d="M 6 78 L 44 56 L 70 72 L 112 48 L 150 70 L 194 54 L 194 124 L 6 124 Z" fill="#14261d" opacity="0.9" />
      <path d="M 40 104 Q 90 92 120 78 T 172 56" fill="none" stroke="#e0c58a" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      {[[48, 103], [96, 90], [136, 73], [172, 56]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.4 - i * 0.4} fill="none" stroke="#e0c58a" strokeWidth="1.3" />
      ))}
    </svg>
  );
}


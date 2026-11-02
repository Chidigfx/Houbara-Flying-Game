import React from 'react';

/**
 * Bottom-left steering instruction prompt matching the reference screen.
 * Shows left/right keycaps and text inside a dark translucent pill.
 */
export default function SteeringPrompt({ visible = true }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: 36,
        zIndex: 25,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(13, 30, 24, 0.82)',
          border: '1px solid rgba(200, 169, 107, 0.4)',
          borderRadius: 9999,
          padding: '10px 22px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <KeyPill label="<" />
          <KeyPill label=">" />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory)',
          }}
        >
          Steer Left Or Right
        </span>
      </div>
    </div>
  );
}

function KeyPill({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '1px solid rgba(200, 169, 107, 0.5)',
        background: 'rgba(200, 169, 107, 0.12)',
        color: 'var(--color-gold)',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}



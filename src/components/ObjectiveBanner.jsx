import React from 'react';

/**
 * Top-center Objective Banner matching the gameplay screen in the reference.
 * Translucent forest-green glass pill with gold accents.
 */
export default function ObjectiveBanner({ visible = true }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(13, 30, 24, 0.82)',
          border: '1px solid rgba(200, 169, 107, 0.45)',
          borderRadius: 9999,
          padding: '12px 42px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,169,107,0.3)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.22em',
            color: 'var(--color-ivory)',
            textTransform: 'uppercase',
          }}
        >
          Guide The Houbara
        </span>

        {/* Small gold emblem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 1, background: 'rgba(200,169,107,0.4)' }} />
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="#C8A96B" strokeWidth="1" />
            <circle cx="5" cy="5" r="1.2" fill="#C8A96B" />
          </svg>
          <span style={{ width: 18, height: 1, background: 'rgba(200,169,107,0.4)' }} />
        </div>

        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.18em',
            color: 'var(--color-gold)',
            textTransform: 'uppercase',
          }}
        >
          Follow The Migration Route
        </span>
      </div>
    </div>
  );
}


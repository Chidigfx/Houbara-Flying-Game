import React, { useEffect, useState } from 'react';

/**
 * Exhibition Checkpoint Notification Banner.
 * Appears when a checkpoint waypoint is reached, displays:
 * "CHECKPOINT REACHED" with the checkpoint name and fact.
 */
export default function CheckpointNotification({ checkpoint }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!checkpoint) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
    }, (checkpoint.displayDurationMs || 4000) - 500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [checkpoint]);

  if (!checkpoint) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 110,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(13, 30, 24, 0.92)',
          border: '1px solid #C8A96B',
          borderRadius: 12,
          padding: '16px 36px',
          maxWidth: 520,
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(200, 169, 107, 0.25)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.96)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 14, height: 1, background: '#C8A96B' }} />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.24em',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
            }}
          >
            {checkpoint.message || 'CHECKPOINT REACHED'}
          </span>
          <span style={{ width: 14, height: 1, background: '#C8A96B' }} />
        </div>

        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--color-ivory)',
            letterSpacing: '0.08em',
          }}
        >
          {checkpoint.name}
        </h3>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--color-ivory-dim)',
            marginTop: 4,
          }}
        >
          {checkpoint.fact}
        </p>
      </div>
    </div>
  );
}


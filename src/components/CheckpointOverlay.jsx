import React, { useEffect, useState } from 'react';

/**
 * Checkpoint overlay — slides in from the top, pauses, then fades out.
 */
export default function CheckpointOverlay({ checkpoint }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!checkpoint) return;
    // Trigger enter animation next frame
    const raf = requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
    }, checkpoint.displayDuration - 600); // start fade-out 600 ms before removal

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      setVisible(false);
    };
  }, [checkpoint]);

  if (!checkpoint) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '5vh',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16,
          padding: '28px 48px',
          maxWidth: 560,
          textAlign: 'center',
          transform: visible ? 'translateY(0)' : 'translateY(-30px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(.22,1,.36,1), opacity 0.5s ease',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#C4A265',
            marginBottom: 10,
          }}
        >
          {checkpoint.title}
        </p>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 400,
          }}
        >
          {checkpoint.fact}
        </p>
      </div>
    </div>
  );
}


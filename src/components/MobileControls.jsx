import React, { useState, useEffect } from 'react';

/**
 * Mobile On-Screen Controls & Orientation Overlay
 *
 * Provides dedicated thumb buttons for steering on touchscreens,
 * a quick-skip button for mobile testers, and a landscape orientation tip.
 */
export default function MobileControls({
  onLeftDown,
  onLeftUp,
  onRightDown,
  onRightUp,
  onSkipGate,
  onExit,
}) {
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleLeftStart = (e) => {
    e.preventDefault();
    setLeftPressed(true);
    onLeftDown?.();
  };
  const handleLeftEnd = (e) => {
    e.preventDefault();
    setLeftPressed(false);
    onLeftUp?.();
  };

  const handleRightStart = (e) => {
    e.preventDefault();
    setRightPressed(true);
    onRightDown?.();
  };
  const handleRightEnd = (e) => {
    e.preventDefault();
    setRightPressed(false);
    onRightUp?.();
  };

  return (
    <>
      {/* ── Portrait orientation helper ────────────────────────────── */}
      {isPortrait && (
        <div
          data-no-touch-steer="true"
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'rgba(10, 24, 18, 0.92)',
            border: '1px solid rgba(243, 215, 149, 0.45)',
            borderRadius: 12,
            padding: '10px 18px',
            color: '#dec38b',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 18 }}>📱↻</span>
          <span>Rotate phone to landscape for the flight view</span>
        </div>
      )}

      {/* ── Mobile top-right testing helper pill ───────────────────── */}
      <div
        data-no-touch-steer="true"
        style={{
          position: 'absolute',
          top: 18,
          right: 20,
          zIndex: 35,
          display: 'flex',
          gap: 8,
        }}
      >
        {onSkipGate && (
          <button
            type="button"
            onClick={onSkipGate}
            style={{
              background: 'rgba(13, 30, 24, 0.78)',
              border: '1px solid rgba(200, 169, 107, 0.45)',
              borderRadius: 20,
              padding: '6px 14px',
              color: 'var(--color-gold)',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            Next Checkpoint ›
          </button>
        )}
      </div>

      {/* ── Left thumb steering button (mid-left edge) ─────────────── */}
      <div
        data-no-touch-steer="true"
        style={{
          position: 'absolute',
          top: '54%',
          left: 16,
          transform: 'translateY(-50%)',
          zIndex: 35,
        }}
      >
        <button
          type="button"
          aria-label="Steer Left"
          onPointerDown={handleLeftStart}
          onPointerUp={handleLeftEnd}
          onPointerCancel={handleLeftEnd}
          onPointerLeave={handleLeftEnd}
          style={{
            width: 58,
            height: 74,
            borderRadius: 16,
            background: leftPressed
              ? 'rgba(243, 215, 149, 0.45)'
              : 'rgba(13, 30, 24, 0.82)',
            border: leftPressed
              ? '2px solid #f3d795'
              : '1.5px solid rgba(200, 169, 107, 0.55)',
            color: '#f3d795',
            fontSize: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'none',
            userSelect: 'none',
            boxShadow: leftPressed
              ? '0 0 22px rgba(243, 215, 149, 0.55)'
              : '0 4px 16px rgba(0,0,0,0.5)',
            transform: leftPressed ? 'scale(0.92)' : 'none',
            transition: 'transform 0.08s ease, background 0.08s ease',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          ‹
        </button>
      </div>

      {/* ── Right thumb steering button (mid-right edge) ────────────── */}
      <div
        data-no-touch-steer="true"
        style={{
          position: 'absolute',
          top: '54%',
          right: 16,
          transform: 'translateY(-50%)',
          zIndex: 35,
        }}
      >
        <button
          type="button"
          aria-label="Steer Right"
          onPointerDown={handleRightStart}
          onPointerUp={handleRightEnd}
          onPointerCancel={handleRightEnd}
          onPointerLeave={handleRightEnd}
          style={{
            width: 58,
            height: 74,
            borderRadius: 16,
            background: rightPressed
              ? 'rgba(243, 215, 149, 0.45)'
              : 'rgba(13, 30, 24, 0.82)',
            border: rightPressed
              ? '2px solid #f3d795'
              : '1.5px solid rgba(200, 169, 107, 0.55)',
            color: '#f3d795',
            fontSize: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'none',
            userSelect: 'none',
            boxShadow: rightPressed
              ? '0 0 22px rgba(243, 215, 149, 0.55)'
              : '0 4px 16px rgba(0,0,0,0.5)',
            transform: rightPressed ? 'scale(0.92)' : 'none',
            transition: 'transform 0.08s ease, background 0.08s ease',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          ›
        </button>
      </div>
    </>
  );
}

import React, { useState } from 'react';

/**
 * Bottom-left steering instruction prompt.
 * Supports physical keyboard caps as well as interactive touch buttons for mobile.
 */
export default function SteeringPrompt({
  visible = true,
  isTouch = false,
  onLeftDown,
  onLeftUp,
  onRightDown,
  onRightUp,
}) {
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);

  const handleLeftStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLeftActive(true);
    onLeftDown?.();
  };

  const handleLeftEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLeftActive(false);
    onLeftUp?.();
  };

  const handleRightStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRightActive(true);
    onRightDown?.();
  };

  const handleRightEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRightActive(false);
    onRightUp?.();
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: 36,
        zIndex: 25,
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
      data-no-touch-steer="true"
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            aria-label="Steer Left"
            onPointerDown={handleLeftStart}
            onPointerUp={handleLeftEnd}
            onPointerCancel={handleLeftEnd}
            onPointerLeave={handleLeftEnd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: leftActive
                ? '1.5px solid #f3d795'
                : '1px solid rgba(200, 169, 107, 0.5)',
              background: leftActive
                ? 'rgba(243, 215, 149, 0.35)'
                : 'rgba(200, 169, 107, 0.15)',
              color: 'var(--color-gold)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
              transform: leftActive ? 'scale(0.92)' : 'none',
              transition: 'transform 0.1s ease, background 0.1s ease',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Steer Right"
            onPointerDown={handleRightStart}
            onPointerUp={handleRightEnd}
            onPointerCancel={handleRightEnd}
            onPointerLeave={handleRightEnd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: rightActive
                ? '1.5px solid #f3d795'
                : '1px solid rgba(200, 169, 107, 0.5)',
              background: rightActive
                ? 'rgba(243, 215, 149, 0.35)'
                : 'rgba(200, 169, 107, 0.15)',
              color: 'var(--color-gold)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
              transform: rightActive ? 'scale(0.92)' : 'none',
              transition: 'transform 0.1s ease, background 0.1s ease',
            }}
          >
            ›
          </button>
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
          {isTouch ? 'Touch Or Drag To Steer' : 'Steer Left Or Right'}
        </span>
      </div>
    </div>
  );
}




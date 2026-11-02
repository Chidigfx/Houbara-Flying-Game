import React, { useEffect, useState, useRef } from 'react';
import GAME_CONFIG from '../config/gameConfig';

/**
 * End-of-journey completion screen with auto-return countdown.
 */
export default function CompletionScreen({ onReset }) {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(
    Math.ceil(GAME_CONFIG.completion.resetDelay / 1000)
  );
  const timerRef = useRef(null);

  const config = GAME_CONFIG.completion;

  // Fade in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-reset countdown
  useEffect(() => {
    const resetTimer = setTimeout(onReset, config.resetDelay);

    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [config.resetDelay, onReset]);

  // Allow space / escape to return early
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        onReset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onReset]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 55%, #1a1510 0%, #0a0a0a 70%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      {/* Decorative line */}
      <div
        style={{
          width: 48,
          height: 2,
          background: '#C4A265',
          marginBottom: 36,
          borderRadius: 1,
        }}
      />

      {/* Success icon */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4A265"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: 28, opacity: 0.8 }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l3 3 5-6" />
      </svg>

      <h1
        style={{
          fontSize: 'clamp(28px, 4vw, 52px)',
          fontWeight: 300,
          letterSpacing: '0.05em',
          marginBottom: 16,
          color: '#ffffff',
        }}
      >
        {config.title}
      </h1>

      <p
        style={{
          fontSize: 'clamp(14px, 1.4vw, 19px)',
          color: 'rgba(255,255,255,0.55)',
          fontWeight: 300,
          maxWidth: 480,
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: 60,
        }}
      >
        {config.subtitle}
      </p>

      <p
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.03em',
        }}
      >
        Returning in {countdown}s · Press <span style={{ color: 'rgba(255,255,255,0.4)' }}>SPACE</span> to restart
      </p>
    </div>
  );
}


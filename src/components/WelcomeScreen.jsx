import React, { useEffect, useState } from 'react';
import GAME_CONFIG from '../config/gameConfig';
import MenuBackdrop from './MenuBackdrop';
import Bird from './Bird';

/** WELCOME / idle screen. Hero bird is a placeholder (replace with final art). */
export default function WelcomeScreen({ onStart }) {
  const [mounted, setMounted] = useState(false);
  const { backgrounds, video } = GAME_CONFIG.assets;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#07120e', opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease' }}>
      <MenuBackdrop video={video.scenes[0].src} poster={backgrounds.welcome} side="right" />

      {/* Bird and text: responsive grid (stacked on mobile portrait, side-by-side on desktop/landscape) */}
      <div className="menu-content-grid">
        <div className="menu-bird-wrap">
          <Bird width="100%" />
        </div>

        <div className="menu-text-wrap">
          <div className="emblem" />
          <h1 className="display-title" style={{ fontSize: 'calc(var(--u) * 4.6)' }}>
            Houbara<br />Migration
          </h1>
          <p className="eyebrow" style={{ marginTop: '1.6vh', marginBottom: '6vh' }}>
            A Journey Across Vast Landscapes
          </p>
          <button onClick={onStart} className="btn-gold-pill">
            <span>Begin The Journey</span>
            <span className="chev">›</span>
          </button>
          <p className="hint">Press <b>Space</b> or tap to start</p>
        </div>
      </div>
    </div>
  );
}

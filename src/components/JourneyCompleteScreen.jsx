import React, { useEffect, useState } from 'react';
import GAME_CONFIG from '../config/gameConfig';
import MenuBackdrop from './MenuBackdrop';
import Bird from './Bird';

/** JOURNEY COMPLETE screen with configurable inactivity reset. */
export default function JourneyCompleteScreen({ onPlayAgain, onReturnWelcome }) {
  const [mounted, setMounted] = useState(false);
  const resetMs = GAME_CONFIG.timing.inactivityResetDelayMs || 20000;
  const [secs, setSecs] = useState(Math.ceil(resetMs / 1000));
  const { backgrounds, video } = GAME_CONFIG.assets;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = setTimeout(onReturnWelcome, resetMs);
    const i = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [resetMs, onReturnWelcome]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onPlayAgain(); }
      else if (e.code === 'Escape') { e.preventDefault(); onReturnWelcome(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPlayAgain, onReturnWelcome]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#07120e', opacity: mounted ? 1 : 0, transition: 'opacity 0.9s ease' }}>
      <MenuBackdrop video={video.scenes[2].src} poster={backgrounds.completion} side="right" />

      {/* Bird and text: responsive grid (stacked on mobile portrait, side-by-side on desktop/landscape) */}
      <div className="menu-content-grid">
        <div className="menu-bird-wrap">
          <Bird width="100%" />
        </div>

        <div className="menu-text-wrap">
          <h1 className="display-title" style={{ fontSize: 'calc(var(--u) * 3.8)' }}>
            Journey<br />Complete
          </h1>
          <div className="emblem" style={{ margin: '2.4vh 0' }} />
          <p className="body-lg" style={{ marginBottom: '5.5vh' }}>
            Thank you for joining the Houbara’s journey.
          </p>
          <button onClick={onPlayAgain} className="btn-gold-pill">
            <span>Play Again</span>
            <span className="chev">›</span>
          </button>
          <p className="hint">Returning to the start in <b>{secs}s</b></p>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import GAME_CONFIG from '../config/gameConfig';
import MenuBackdrop from './MenuBackdrop';
import { HoldIllustration, SteerIllustration, RouteIllustration } from './InstructionIllustrations';

// Edit card copy/illustrations here when the final hardware is confirmed.
const CARDS = [
  { heading: 'Hold', text: 'Hold the controllers in each hand.', Art: HoldIllustration },
  { heading: 'Steer', text: 'Move your hands to guide the Houbara.', Art: SteerIllustration },
  { heading: 'Follow the Route', text: 'Guide the Houbara along the migration journey.', Art: RouteIllustration },
];

/** HOW TO PLAY screen. */
export default function InstructionsScreen({ onStartFlight }) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const autoSkipMs = GAME_CONFIG.timing.instructionsAutoSkipMs || 15000;
  const { backgrounds, video } = GAME_CONFIG.assets;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const start = performance.now();
    let id;
    const tick = (now) => {
      const p = Math.min((now - start) / autoSkipMs, 1);
      setProgress(p);
      if (p >= 1) return onStartFlight();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [autoSkipMs, onStartFlight]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStartFlight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartFlight]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#07120e', opacity: mounted ? 1 : 0, transition: 'opacity 0.7s ease' }}>
      <MenuBackdrop video={video.scenes[1].src} poster={backgrounds.instructions} side="right" dim={1.6} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,18,14,0.45)' }} />

      <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6%' }}>
        <h2 className="display-title" style={{ fontSize: 'clamp(28px, 2.9vw, 56px)', letterSpacing: '0.3em' }}>How to Play</h2>
        <div className="emblem" style={{ margin: '1.6vh 0 5vh' }} />

        <div style={{ display: 'flex', gap: '2vw', width: '100%', maxWidth: 1400 }}>
          {CARDS.map(({ heading, text, Art }) => (
            <div key={heading} className="glass-card" style={{ flex: 1, padding: '3vh 1.8vw 3.4vh', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '100%', height: '17vh', marginBottom: '2.6vh' }}><Art /></div>
              <h3 className="card-heading">{heading}</h3>
              <p className="card-text">{text}</p>
            </div>
          ))}
        </div>

        <p className="eyebrow" style={{ marginTop: '4.4vh' }}>
          Keyboard: use the <b>left</b> and <b>right</b> arrow keys to steer.
        </p>
        <button onClick={onStartFlight} className="btn-gold-pill" style={{ marginTop: '3vh' }}>
          <span>Start Flight</span>
          <span className="chev">›</span>
        </button>
        <div style={{ marginTop: '3vh', width: 160, height: 2, background: 'rgba(200,169,107,0.18)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: '#c8a96b' }} />
        </div>
      </div>
    </div>
  );
}

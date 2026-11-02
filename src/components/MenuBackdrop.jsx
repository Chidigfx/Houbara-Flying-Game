import React from 'react';

/**
 * Cinematic backdrop for menu screens: a muted looping clip (with a still
 * poster as fallback) under soft gradients. `side` places the darker
 * gradient behind the text column.
 */
export default function MenuBackdrop({ video, poster, side = 'right', dim = 0.35 }) {
  const toward = side === 'right' ? 'to left' : 'to right';
  return (
    <>
      <video
        src={video}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${toward}, rgba(7,18,14,0.88) 0%, rgba(7,18,14,0.55) 38%, rgba(7,18,14,${dim * 0.3}) 70%),
                       linear-gradient(to top, rgba(7,18,14,0.7) 0%, transparent 35%)`,
        }}
      />
      <div className="contour-overlay" />
      <div className="screen-frame" />
    </>
  );
}


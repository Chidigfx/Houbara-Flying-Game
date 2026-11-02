import React from 'react';

/**
 * Optional Development Overlay Panel for Exhibition Operators.
 * Displays playback/flight time, scene state, bird coordinates,
 * render mode toggle (3D vs Video), and gamepad connectivity.
 */
export default function DevPanel({
  visible,
  renderMode = '3d',
  onToggleMode,
  sceneIndex,
  totalScenes,
  sceneName,
  videoTime,
  videoDuration,
  birdX,
  birdTilt,
  gamepadConnected,
  gamepadId,
  onSkipScene,
  onComplete,
}) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 18,
        left: 18,
        zIndex: 9999,
        background: 'rgba(8, 18, 14, 0.92)',
        border: '1px solid rgba(200, 169, 107, 0.6)',
        borderRadius: 8,
        padding: '12px 18px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#f5f0e6',
        lineHeight: 1.6,
        maxWidth: 340,
        boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ color: '#C8A96B', fontWeight: 'bold', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>OPERATOR DEV PANEL</span>
        <span style={{ opacity: 0.6 }}>[D] to hide</span>
      </div>

      <div>
        Engine: <span style={{ color: '#f3d795', fontWeight: 'bold' }}>
          {renderMode === '3d' ? 'Real-Time 3D World' : 'Pre-Rendered Video'}
        </span>
      </div>
      <div>Stage: {sceneIndex + 1} / {totalScenes} ({sceneName})</div>
      <div>Time: {videoTime.toFixed(1)}s / {videoDuration.toFixed(1)}s</div>
      <div>Bird X: {(birdX * 100).toFixed(1)}% | Bank: {birdTilt.toFixed(1)}°</div>
      <div>
        Gamepad: <span style={{ color: gamepadConnected ? '#4ade80' : '#888' }}>
          {gamepadConnected ? `Connected (${gamepadId?.slice(0, 20)})` : 'None'}
        </span>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          onClick={onToggleMode}
          style={{
            background: 'rgba(200, 169, 107, 0.28)',
            border: '1px solid #C8A96B',
            color: '#f3d795',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          Mode: {renderMode === '3d' ? 'Switch to Video [M]' : 'Switch to 3D [M]'}
        </button>
        <button
          onClick={onSkipScene}
          style={{
            background: 'rgba(200, 169, 107, 0.2)',
            border: '1px solid #C8A96B',
            color: '#DEC38B',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          Next Gate [N]
        </button>
        <button
          onClick={onComplete}
          style={{
            background: 'rgba(200, 169, 107, 0.2)',
            border: '1px solid #C8A96B',
            color: '#DEC38B',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          End Flight
        </button>
      </div>
    </div>
  );
}

import React from 'react';

/**
 * Small dev-mode overlay showing gamepad connection status.
 * Only rendered when `config.dev.showGamepadStatus` is true.
 */
export default function GamepadStatus({ connected, gamepadId }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '6px 14px',
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#4ade80' : '#6b7280',
          flexShrink: 0,
        }}
      />
      <span>
        {connected
          ? `Gamepad: ${gamepadId?.slice(0, 36) || 'Connected'}`
          : 'No gamepad detected'}
      </span>
    </div>
  );
}


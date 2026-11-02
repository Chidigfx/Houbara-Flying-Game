import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Polls the browser Gamepad API each frame and exposes the same
 * { horizontal, confirm, cancel } interface as useKeyboard.
 *
 * Supports any standard-layout gamepad:
 *  - Left-stick X axis  → horizontal (-1 … 1)
 *  - D-pad left / right → horizontal
 *  - Button 0 (A / ✕)   → confirm
 *  - Button 1 (B / ○)   → cancel
 */
export default function useGamepad() {
  const prevButtons = useRef({});
  const [connected, setConnected] = useState(false);
  const [gamepadId, setGamepadId] = useState('');

  // Dead-zone for analog sticks
  const DEAD_ZONE = 0.15;

  useEffect(() => {
    const onConnect = (e) => {
      setConnected(true);
      setGamepadId(e.gamepad.id);
    };
    const onDisconnect = () => {
      setConnected(false);
      setGamepadId('');
    };

    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);

    // Check if a gamepad is already connected at mount time
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp) {
        setConnected(true);
        setGamepadId(gp.id);
        break;
      }
    }

    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  /**
   * Returns the current gamepad input snapshot.
   * Button actions (confirm / cancel) are edge-triggered (pressed this frame).
   */
  const getInput = useCallback(() => {
    const result = { horizontal: 0, confirm: false, cancel: false };

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const g of gamepads) {
      if (g) { gp = g; break; }
    }
    if (!gp) return result;

    // ── Horizontal axis ──
    const axisX = gp.axes[0] || 0;
    if (Math.abs(axisX) > DEAD_ZONE) {
      result.horizontal = axisX;
    }

    // D-pad fallback (buttons 14 = left, 15 = right on standard layout)
    if (gp.buttons[14]?.pressed) result.horizontal = -1;
    if (gp.buttons[15]?.pressed) result.horizontal = 1;

    // ── Action buttons (edge-triggered) ──
    const prev = prevButtons.current;
    const btn0 = gp.buttons[0]?.pressed ?? false;
    const btn1 = gp.buttons[1]?.pressed ?? false;

    if (btn0 && !prev.btn0) result.confirm = true;
    if (btn1 && !prev.btn1) result.cancel = true;

    prev.btn0 = btn0;
    prev.btn1 = btn1;

    return result;
  }, []);

  return { getInput, connected, gamepadId };
}


import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Mobile Touch & Motion Controls Hook
 *
 * Provides three seamless mobile steering methods:
 * 1. Screen Touch / Drag: touching or dragging left/right steers the bird smoothly.
 * 2. On-screen Touch Buttons: virtual Left / Right thumb pads.
 * 3. Device Gyroscope / Tilt: tilting phone in landscape steers the bird.
 */
export default function useTouch() {
  const touchSteer = useRef(0);
  const buttonSteer = useRef(0);
  const gyroSteer = useRef(0);
  const actions = useRef({ confirm: false, cancel: false });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(isTouch);
  }, []);

  /* ── 1. Full-screen Touch & Drag Steering ────────────────────────── */
  useEffect(() => {
    let startX = null;
    let activeTouchId = null;

    const onTouchStart = (e) => {
      // Ignore touches on interactive buttons/inputs
      if (e.target.closest('button, a, input, select, textarea, [data-no-touch-steer]')) {
        return;
      }
      const touch = e.changedTouches[0];
      if (!touch) return;

      activeTouchId = touch.identifier;
      startX = touch.clientX;

      // Tap on left/right half gives immediate directional steer
      const screenW = window.innerWidth;
      const normalizedX = touch.clientX / screenW;
      if (normalizedX < 0.44) {
        touchSteer.current = -0.75;
      } else if (normalizedX > 0.56) {
        touchSteer.current = 0.75;
      }
    };

    const onTouchMove = (e) => {
      if (startX === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          const deltaX = touch.clientX - startX;
          const range = window.innerWidth * 0.18; // 18% of screen width = full steer
          const steer = Math.max(-1, Math.min(1, deltaX / range));
          touchSteer.current = steer;
          break;
        }
      }
    };

    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          startX = null;
          activeTouchId = null;
          touchSteer.current = 0;
          break;
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  /* ── 2. Device Orientation (Gyroscope Tilt) ──────────────────────── */
  useEffect(() => {
    const onOrientation = (e) => {
      // In landscape mode, phone tilt left/right corresponds to beta or gamma
      const isLandscape = window.innerWidth > window.innerHeight;
      const tilt = isLandscape ? (e.beta || 0) : (e.gamma || 0);
      // Deadzone of 3 degrees, max steering at 24 degrees tilt
      const deadzone = 3.0;
      if (Math.abs(tilt) > deadzone) {
        const sign = Math.sign(tilt);
        const mag = Math.min(1, (Math.abs(tilt) - deadzone) / 21.0);
        gyroSteer.current = sign * mag;
      } else {
        gyroSteer.current = 0;
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', onOrientation);
      }
    };
  }, []);

  /* ── 3. Virtual Button Helpers ───────────────────────────────────── */
  const setLeftDown = useCallback((down) => {
    buttonSteer.current = down ? -1 : 0;
  }, []);

  const setRightDown = useCallback((down) => {
    buttonSteer.current = down ? 1 : 0;
  }, []);

  const triggerConfirm = useCallback(() => {
    actions.current.confirm = true;
  }, []);

  const triggerCancel = useCallback(() => {
    actions.current.cancel = true;
  }, []);

  /* ── 4. Polling function for useInput ────────────────────────────── */
  const getInput = useCallback(() => {
    let horizontal = 0;
    if (Math.abs(buttonSteer.current) > 0.01) {
      horizontal = buttonSteer.current;
    } else if (Math.abs(touchSteer.current) > 0.01) {
      horizontal = touchSteer.current;
    } else if (Math.abs(gyroSteer.current) > 0.01) {
      horizontal = gyroSteer.current;
    }

    const confirm = actions.current.confirm;
    const cancel = actions.current.cancel;
    actions.current.confirm = false;
    actions.current.cancel = false;

    return { horizontal, confirm, cancel };
  }, []);

  return {
    getInput,
    isTouchDevice,
    setLeftDown,
    setRightDown,
    triggerConfirm,
    triggerCancel,
  };
}

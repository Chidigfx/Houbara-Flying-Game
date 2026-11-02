import React, { forwardRef, useImperativeHandle, useRef } from 'react';

/**
 * Two stacked <video> elements:
 *   - ACTIVE  : the scene currently playing.
 *   - STANDBY : the next scene, preloaded and paused on its first frame, shown
 *               only through a circular "iris" that follows the checkpoint gate.
 *
 * Because the next clip is already decoded before the gate arrives, crossing a
 * checkpoint never waits on a network/decoder load (the old source of glitches).
 * Styles are written directly to the elements for per-frame smoothness.
 */

const BASE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
  background: '#0a1410',
};

const HIDDEN_CLIP = 'circle(0px at 50% 50%)';

// A parked video is fully hidden (not just clipped to 0px) to avoid stray specks.
const hide = (v) => { v.style.clipPath = HIDDEN_CLIP; v.style.visibility = 'hidden'; };
const show = (v) => { v.style.visibility = 'visible'; };

const SceneVideoStack = forwardRef(function SceneVideoStack({ onError }, ref) {
  const a = useRef(null);
  const b = useRef(null);
  const activeIsA = useRef(true);

  const active = () => (activeIsA.current ? a.current : b.current);
  const standby = () => (activeIsA.current ? b.current : a.current);

  const prepare = (vid, src) =>
    new Promise((resolve) => {
      if (!vid) return resolve(false);
      vid.muted = true;
      vid.preload = 'auto';
      const done = () => {
        vid.removeEventListener('loadeddata', done);
        vid.removeEventListener('error', fail);
        resolve(true);
      };
      const fail = () => {
        vid.removeEventListener('loadeddata', done);
        vid.removeEventListener('error', fail);
        resolve(false);
      };
      vid.addEventListener('loadeddata', done);
      vid.addEventListener('error', fail);
      vid.src = src;
      vid.load();
    });

  useImperativeHandle(ref, () => ({
    getActive: active,

    /** Load + play the first scene. */
    async start(src) {
      const v = active();
      const ok = await prepare(v, src);
      if (!ok) return false;
      v.currentTime = 0;
      try { await v.play(); } catch (e) { /* autoplay blocked or aborted */ }
      return true;
    },

    /** Preload the next scene on the standby element (paused, hidden). */
    async loadStandby(src) {
      const v = standby();
      if (!v) return false;
      v.pause();
      hide(v);
      v.style.opacity = '1';
      return prepare(v, src);
    },

    /** Reveal the standby scene through a circle (px, relative to screen). */
    setIris(cx, cy, r) {
      const v = standby();
      if (!v) return;
      if (r > 0.5) {
        show(v);
        v.style.clipPath = `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
      } else hide(v);
    },

    /** Soft reveal without an iris (used when the gate is missed). */
    setStandbyFade(opacity) {
      const v = standby();
      if (!v) return;
      v.style.clipPath = 'none';
      v.style.opacity = String(opacity);
    },

    playStandby() {
      const v = standby();
      if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    },

    /** Standby becomes the active scene; the old one is parked. */
    promote() {
      const old = active();
      activeIsA.current = !activeIsA.current;
      const now = active();
      now.style.clipPath = 'none';
      show(now);
      now.style.opacity = '1';
      now.style.zIndex = '1';
      if (old) {
        old.pause();
        hide(old);
        old.style.zIndex = '2';
      }
    },
  }));

  return (
    <>
      <video ref={a} muted playsInline preload="auto" style={{ ...BASE, zIndex: 1 }} onError={onError} />
      <video ref={b} muted playsInline preload="auto" style={{ ...BASE, zIndex: 2, clipPath: HIDDEN_CLIP, visibility: 'hidden' }} onError={onError} />
    </>
  );
});

export default SceneVideoStack;



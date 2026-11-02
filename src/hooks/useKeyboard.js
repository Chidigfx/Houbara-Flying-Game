import { useEffect, useRef, useCallback } from 'react';

/**
 * Tracks currently-held keys and fires one-shot action flags
 * (confirm / cancel) that are consumed once per read.
 */
export default function useKeyboard() {
  const keys = useRef(new Set());
  const actions = useRef({ confirm: false, cancel: false });

  useEffect(() => {
    const onDown = (e) => {
      keys.current.add(e.code);

      if (e.code === 'Space') {
        e.preventDefault();
        actions.current.confirm = true;
      }
      if (e.code === 'Escape') {
        actions.current.cancel = true;
      }
    };

    const onUp = (e) => {
      keys.current.delete(e.code);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /**
   * Returns the current keyboard input snapshot.
   * Action flags are consumed (reset to false) after reading.
   */
  const getInput = useCallback(() => {
    let horizontal = 0;
    if (keys.current.has('ArrowLeft') || keys.current.has('KeyA')) horizontal -= 1;
    if (keys.current.has('ArrowRight') || keys.current.has('KeyD')) horizontal += 1;

    const confirm = actions.current.confirm;
    const cancel = actions.current.cancel;
    actions.current.confirm = false;
    actions.current.cancel = false;

    return { horizontal, confirm, cancel };
  }, []);

  return { getInput };
}


import { useCallback } from 'react';
import useKeyboard from './useKeyboard';
import useGamepad from './useGamepad';

/**
 * Merges keyboard + gamepad into a single input snapshot.
 *
 * Horizontal: if either source has a non-zero value the one
 * with the larger absolute magnitude wins.
 * Actions: OR-ed together (either source can trigger).
 */
export default function useInput() {
  const { getInput: getKeyboardInput } = useKeyboard();
  const { getInput: getGamepadInput, connected, gamepadId } = useGamepad();

  const getInput = useCallback(() => {
    const kb = getKeyboardInput();
    const gp = getGamepadInput();

    const horizontal =
      Math.abs(gp.horizontal) > Math.abs(kb.horizontal)
        ? gp.horizontal
        : kb.horizontal;

    return {
      horizontal,
      confirm: kb.confirm || gp.confirm,
      cancel: kb.cancel || gp.cancel,
    };
  }, [getKeyboardInput, getGamepadInput]);

  return {
    getInput,
    gamepadConnected: connected,
    gamepadId,
  };
}

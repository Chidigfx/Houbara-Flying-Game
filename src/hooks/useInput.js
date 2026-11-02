import { useCallback } from 'react';
import useKeyboard from './useKeyboard';
import useGamepad from './useGamepad';
import useTouch from './useTouch';

/**
 * Merges keyboard + gamepad + mobile touch / gyro into a single input snapshot.
 *
 * Horizontal: the source with the largest absolute magnitude wins.
 * Actions: OR-ed together (any source can trigger).
 */
export default function useInput() {
  const { getInput: getKeyboardInput } = useKeyboard();
  const { getInput: getGamepadInput, connected, gamepadId } = useGamepad();
  const {
    getInput: getTouchInput,
    isTouchDevice,
    setLeftDown,
    setRightDown,
    triggerConfirm,
    triggerCancel,
  } = useTouch();

  const getInput = useCallback(() => {
    const kb = getKeyboardInput();
    const gp = getGamepadInput();
    const tc = getTouchInput();

    let horizontal = kb.horizontal;
    if (Math.abs(gp.horizontal) > Math.abs(horizontal)) {
      horizontal = gp.horizontal;
    }
    if (Math.abs(tc.horizontal) > Math.abs(horizontal)) {
      horizontal = tc.horizontal;
    }

    return {
      horizontal,
      confirm: kb.confirm || gp.confirm || tc.confirm,
      cancel: kb.cancel || gp.cancel || tc.cancel,
    };
  }, [getKeyboardInput, getGamepadInput, getTouchInput]);

  return {
    getInput,
    gamepadConnected: connected,
    gamepadId,
    isTouchDevice,
    setLeftDown,
    setRightDown,
    triggerConfirm,
    triggerCancel,
  };
}

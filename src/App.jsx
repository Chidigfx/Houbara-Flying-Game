import React, { useState, useCallback, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import InstructionsScreen from './components/InstructionsScreen';
import GameScreen from './components/GameScreen';
import JourneyCompleteScreen from './components/JourneyCompleteScreen';
import useInput from './hooks/useInput';
import './App.css';

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  HOUBARA MIGRATION — TOP-LEVEL STATE MACHINE                       ║
 * ║                                                                    ║
 * ║   WELCOME  ──[Start / Space]──▶  INSTRUCTIONS                      ║
 * ║      ▲                                │                            ║
 * ║      │                         [Start Flight]                      ║
 * ║      │                                ▼                            ║
 * ║  COMPLETION  ◀──[Video End]──────  PLAYING                         ║
 * ║      │                                                             ║
 * ║      └───[Auto 20s / Esc]───────▶ WELCOME                          ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const SCREENS = {
  WELCOME: 'WELCOME',
  INSTRUCTIONS: 'INSTRUCTIONS',
  PLAYING: 'PLAYING',
  COMPLETION: 'COMPLETION',
};

export default function App() {
  // Dev convenience: http://localhost:3000/?screen=PLAYING (WELCOME | INSTRUCTIONS | PLAYING | COMPLETION)
  const [screen, setScreen] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('screen');
    return SCREENS[requested?.toUpperCase()] || SCREENS.WELCOME;
  });
  const { getInput } = useInput();

  // Navigation handlers
  const goToInstructions = useCallback(() => {
    setScreen(SCREENS.INSTRUCTIONS);
  }, []);

  const goToPlaying = useCallback(() => {
    setScreen(SCREENS.PLAYING);
  }, []);

  const goToCompletion = useCallback(() => {
    setScreen(SCREENS.COMPLETION);
  }, []);

  const goToWelcome = useCallback(() => {
    setScreen(SCREENS.WELCOME);
  }, []);

  // Gamepad menu navigation listener (paused during active gameplay where GameScreen owns the loop)
  useEffect(() => {
    if (screen === SCREENS.PLAYING) return undefined;
    let animId;
    const pollGamepadMenu = () => {
      const input = getInput();
      if (input.confirm) {
        if (screen === SCREENS.WELCOME) {
          goToInstructions();
        } else if (screen === SCREENS.INSTRUCTIONS) {
          goToPlaying();
        } else if (screen === SCREENS.COMPLETION) {
          goToPlaying();
        }
      }
      if (input.cancel) {
        if (screen !== SCREENS.WELCOME) {
          goToWelcome();
        }
      }
      animId = requestAnimationFrame(pollGamepadMenu);
    };

    animId = requestAnimationFrame(pollGamepadMenu);
    return () => cancelAnimationFrame(animId);
  }, [screen, getInput, goToInstructions, goToPlaying, goToWelcome]);

  return (
    <div className="app-root">
      {screen === SCREENS.WELCOME && (
        <WelcomeScreen onStart={goToInstructions} />
      )}

      {screen === SCREENS.INSTRUCTIONS && (
        <InstructionsScreen onStartFlight={goToPlaying} />
      )}

      {screen === SCREENS.PLAYING && (
        <GameScreen
          onComplete={goToCompletion}
          onExit={goToWelcome}
        />
      )}

      {screen === SCREENS.COMPLETION && (
        <JourneyCompleteScreen
          onPlayAgain={goToPlaying}
          onReturnWelcome={goToWelcome}
        />
      )}
    </div>
  );
}

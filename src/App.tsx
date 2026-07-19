/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import BackgroundShader from './components/BackgroundShader';
import MainMenu from './components/MainMenu';
import GameScreen from './components/GameScreen';
import { GameSettings } from './types';
import { initializeMonetization, showBannerAd, hideBannerAd } from './utils/ads';

export default function App() {
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    const initAds = async () => {
      await initializeMonetization();
      await showBannerAd();
    };
    initAds();

    return () => {
      // Cleanup if needed (though app usually just closes)
      hideBannerAd();
    };
  }, []);

  return (
    // pb-16 added to avoid overlapping with bottom banner ad
    <div id="app-root-container" className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto font-sans relative pb-16">
      {/* 1. Cinematic Fluid background animation */}
      <BackgroundShader />

      {/* 2. Interactive Screens depending on current game settings */}
      {gameSettings === null ? (
        <MainMenu onStartGame={(settings) => setGameSettings(settings)} />
      ) : (
        <GameScreen settings={gameSettings} onQuit={() => setGameSettings(null)} />
      )}
    </div>
  );
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, ArrowRight, User, Users, Lock, Sparkles, Award, BarChart3, ArrowLeft, Crown } from 'lucide-react';
import { GameStage, GameSettings, Player, RGBColor } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { prepareInterstitialAd, showInterstitialAd, checkIsPremium } from '../utils/ads';
import { generateTargetColor, calculateScore, rgbToHex, getFeedback, calculateDeltaE, triggerHaptic, hsvToRgb, getColorNameTR, rgbToHsv, getFinalRank } from '../utils/colorMath';

interface GameScreenProps {
  settings: GameSettings;
  onQuit: () => void;
}

// Zero-dependency Offline Sound FX Synthesizer using Web Audio API
const playSound = (type: 'CLICK' | 'SPIN' | 'BURN_OUT' | 'REVEAL' | 'WINNER') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'CLICK') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'SPIN') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'BURN_OUT') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } else if (type === 'REVEAL') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'WINNER') {
      // Arpeggio sound
      [0, 150, 300, 450].forEach((delay, idx) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const freqs = [261.63, 329.63, 392.00, 523.25]; // C major chord
          osc.frequency.setValueAtTime(freqs[idx], ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }, delay);
      });
    }
  } catch (err) {
    console.warn('Audio Context failed to initialize', err);
  }
};

// Gentle vibration trigger respecting user preference
const playHaptic = (duration = 20) => {
  const isHapticEnabled = localStorage.getItem('haptic_enabled') !== 'false';
  if (isHapticEnabled) {
    triggerHaptic(duration);
  }
};

export default function GameScreen({ settings, onQuit }: GameScreenProps) {
  const { t, language } = useLanguage();
  const isPremium = checkIsPremium();
  
  useEffect(() => {
    prepareInterstitialAd();
  }, []);
  const [players, setPlayers] = useState<Player[]>(() =>
    settings.playerNames.map((name, idx) => ({
      id: `player-${idx}`,
      name,
      scores: [],
      guesses: []
    }))
  );

  const [stage, setStage] = useState<GameStage>(GameStage.SPIN);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [targetColor, setTargetColor] = useState<RGBColor>({ r: 128, g: 128, b: 128 });

  // Spin phase animation colors
  const [spinColor, setSpinColor] = useState<RGBColor>({ r: 128, g: 128, b: 128 });

  // Guess slider state
  const [rVal, setRVal] = useState(128);
  const [gVal, setGVal] = useState(128);
  const [bVal, setBVal] = useState(128);

  const [activeInputSlider, setActiveInputSlider] = useState<'R' | 'G' | 'B' | null>('R');

  // HSV color picker state
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0);
  const [val, setVal] = useState(50);
  const [colorName, setColorName] = useState('Gri');

  // Refs for touch-based custom RGB sliders
  const rBarRef = useRef<HTMLDivElement>(null);
  const gBarRef = useRef<HTMLDivElement>(null);
  const bBarRef = useRef<HTMLDivElement>(null);
  const isDraggingR = useRef(false);
  const isDraggingG = useRef(false);
  const isDraggingB = useRef(false);

  // Multi-reveal helper state
  // tracks which players have been animated or revealed so far
  const [revealIndex, setRevealIndex] = useState(0);

  // Time tracker for state transitions
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Core gameplay cycle
  useEffect(() => {
    if (stage === GameStage.SPIN) {
      playSound('SPIN');
      const target = generateTargetColor();
      setTargetColor(target);

      // Start rapid color wheel spin animation for 2 seconds
      let ticks = 0;
      spinIntervalRef.current = setInterval(() => {
        setSpinColor({
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256)
        });
        ticks++;
        if (ticks % 3 === 0) playSound('CLICK');
      }, 100);

      const timer = setTimeout(() => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        setSpinColor(target);
        setStage(GameStage.BURN);
      }, 2000);

      return () => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        clearTimeout(timer);
      };
    } else if (stage === GameStage.BURN) {
      // 5 seconds memory countdown
      const timer = setTimeout(() => {
        playSound('BURN_OUT');
        setStage(GameStage.INPUT);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [stage, currentRound]);

  // Sync R, G, B to HSV to get color name
  useEffect(() => {
    // Simple RGB to HSV conversion for the name calculation
    const r = rVal / 255;
    const g = gVal / 255;
    const b = bVal / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    setColorName(getColorNameTR(Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)));
  }, [rVal, gVal, bVal]);

  // Global drag event handlers for custom RGB sliders
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDraggingR.current && rBarRef.current) {
        const rect = rBarRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        setRVal(Math.round(255 - (y / rect.height) * 255));
      }
      if (isDraggingG.current && gBarRef.current) {
        const rect = gBarRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        setGVal(Math.round(255 - (y / rect.height) * 255));
      }
      if (isDraggingB.current && bBarRef.current) {
        const rect = bBarRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        setBVal(Math.round(255 - (y / rect.height) * 255));
      }
    };
    const handleEnd = () => { isDraggingR.current = false; isDraggingG.current = false; isDraggingB.current = false; };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingR.current || isDraggingG.current || isDraggingB.current) e.preventDefault();
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  // Handle locking in guess
  const handleLockInGuess = () => {
    playSound('CLICK');
    playHaptic(40);
    const guess: RGBColor = { r: rVal, g: gVal, b: bVal };
    const score = calculateScore(targetColor, guess);

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIdx].guesses[currentRound - 1] = guess;
    updatedPlayers[currentPlayerIdx].scores[currentRound - 1] = score;
    setPlayers(updatedPlayers);

    // If multiplayer mode
    if (settings.mode === 'MULTI') {
      // If there are more players left to guess in the current round
      if (currentPlayerIdx < players.length - 1) {
        setStage(GameStage.HANDOVER);
      } else {
        // Everyone has guessed for this round, reveal results!
        playSound('REVEAL');
        setRevealIndex(0);
        setStage(GameStage.REVEAL);
      }
    } else {
      // Single player, go straight to reveal
      playSound('REVEAL');
      setStage(GameStage.REVEAL);
    }
  };

  // Turn handover confirmation
  const handleHandoverNextPlayer = () => {
    playSound('CLICK');
    playHaptic(30);
    setCurrentPlayerIdx(currentPlayerIdx + 1);
    setRVal(128); setGVal(128); setBVal(128);
    setStage(GameStage.BURN); // Trigger memory phase for next player with the same target color
  };

  // Move to next round or end of game
  const handleNextRound = () => {
    playSound('CLICK');
    playHaptic(30);
    if (currentRound < settings.maxRounds) {
      setCurrentRound(currentRound + 1);
      setCurrentPlayerIdx(0);
      setRVal(128); setGVal(128); setBVal(128);
      setStage(GameStage.SPIN);
    } else {
      playSound('WINNER');
      showInterstitialAd();
      setStage(GameStage.RESULTS);
    }
  };

  // Calculate winner statistics
  const getWinner = () => {
    let bestPlayer = players[0];
    let bestAvg = 0;

    players.forEach(p => {
      const avg = p.scores.reduce((a, b) => a + b, 0) / settings.maxRounds;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestPlayer = p;
      }
    });

    return { player: bestPlayer, avgScore: Math.round(bestAvg * 10) / 10 };
  };

  const springTransition = { type: 'spring', stiffness: 220, damping: 18 };

  return (
    <div id="game-canvas" className="w-full h-full flex flex-col justify-between px-4 sm:px-6 py-4 md:py-8 pt-[env(safe-area-inset-top)] relative z-10 overflow-hidden bg-slate-950 text-slate-100">
      {/* HUD Header info bar - wide bento layout */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-xl backdrop-blur-xl mb-4 md:mb-6">
        <button
          onClick={onQuit}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 font-sans text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.giveUp}</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-widest font-extrabold">{t.roundLabel}</span>
          <span className="font-mono text-xl text-white font-black">
            {currentRound} <span className="text-slate-500 text-xs font-normal">/ {settings.maxRounds}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 font-sans font-semibold bg-slate-950 border border-slate-800/80 px-3 py-1.5 rounded-xl">
          {settings.mode === 'MULTI' ? (
            <>
              <Users className="w-4 h-4 text-[#ff003c]" />
              <span className="font-bold text-white">{players[currentPlayerIdx].name}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-bold text-white">{t.singlePlayerLabel}</span>
              {isPremium && (
                <div className="ml-2 flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] uppercase font-black border border-yellow-500/50">
                  <Crown className="w-3 h-3" /> VIP
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Primary Gameplay Zone */}
      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-5xl mx-auto my-2 relative">
        <AnimatePresence mode="wait">
          {/* STAGE 1: SPIN PHASE */}
          {stage === GameStage.SPIN && (
            <motion.div
              key="stage-spin"
              className="flex flex-col items-center space-y-6 w-full text-center max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={springTransition}
            >
              <div className="text-center space-y-1.5">
                <span className="font-mono text-xs text-[#00f0ff] tracking-widest uppercase font-extrabold animate-pulse bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  {t.chromaticRoulette}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">{t.spinning}</h2>
              </div>

              {/* Spinning color box */}
              <div className="relative w-40 h-40 md:w-64 md:h-64 flex items-center justify-center">
                {/* Visual backplate blur */}
                <div className="absolute inset-0 bg-slate-950/60 rounded-[32px] border border-slate-800 shadow-[0_15px_35px_rgba(0,0,0,0.5)]" />
                
                {/* Spinning swatch color */}
                <motion.div
                  className="w-[84%] h-[84%] rounded-2xl z-10 shadow-[inset_0px_1px_0px_rgba(255,255,255,0.1)]"
                  style={{
                    backgroundColor: `rgb(${spinColor.r}, ${spinColor.g}, ${spinColor.b})`,
                    boxShadow: `0 0 40px rgba(${spinColor.r}, ${spinColor.g}, ${spinColor.b}, 0.25)`
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <p className="text-xs text-slate-400 font-sans">{t.spinSub}</p>
            </motion.div>
          )}

          {/* STAGE 2: BURN (MEMORY PHASE) */}
          {stage === GameStage.BURN && (
            <motion.div
              key="stage-burn"
              className="flex flex-col items-center space-y-6 w-full text-center max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={springTransition}
            >
              {/* Melting timer bar at top of screen container */}
              <div className="fixed top-0 left-0 w-full h-1 bg-slate-900 z-50">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#00f0ff] to-[#ff003c]"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>

              <div className="space-y-1.5 text-center">
                <span className="font-mono text-xs text-[#ff003c] tracking-widest uppercase font-extrabold bg-slate-950 px-3 py-1 rounded-full border border-slate-800 animate-pulse">
                  PALET: {rgbToHsv(targetColor.r, targetColor.g, targetColor.b).h}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight">{t.timerStarted}</h2>
              </div>

              {/* Displaying giant target color */}
              <div className="relative w-40 h-40 md:w-64 md:h-64 flex items-center justify-center">
                {/* Glass bevel effect behind */}
                <div className="absolute inset-0 bg-slate-950/60 rounded-[32px] border border-slate-800 shadow-[0_25px_50px_rgba(0,0,0,0.6)]" />

                <div
                  className="w-[84%] h-[84%] rounded-2xl z-10 overflow-hidden relative border-4 border-slate-800"
                  style={{
                    backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`
                  }}
                >
                  {/* Subtle inner reflection */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
                  <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              </div>

            </motion.div>
          )}

          {/* STAGE 3: INPUT / GUESSING - Visual HSV Color Picker */}
          {stage === GameStage.INPUT && (
            <motion.div
              key="stage-input"
              className="w-full flex flex-col gap-3 flex-1 min-h-0"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={springTransition}
            >
              {/* Color Preview + Animated Name */}
              <div className="flex items-center gap-4 w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl relative overflow-hidden shrink-0">
                {/* Ambient glow */}
                <div
                  className="absolute inset-0 opacity-20 transition-all duration-200"
                  style={{ backgroundColor: `rgb(${rVal}, ${gVal}, ${bVal})` }}
                />
                <div
                  className="w-14 h-14 rounded-xl border-2 border-slate-700 shadow-lg shrink-0 z-10 relative"
                  style={{
                    backgroundColor: `rgb(${rVal}, ${gVal}, ${bVal})`,
                    boxShadow: `0 0 20px rgba(${rVal}, ${gVal}, ${bVal}, 0.3)`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent rounded-xl" />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={colorName}
                      className="font-sans text-sm font-black text-white block truncate"
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -16, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                    >
                      {colorName}
                    </motion.span>
                  </AnimatePresence>
                  <span className="font-mono text-[10px] text-slate-400 mt-0.5 block">
                    R:{rVal} G:{gVal} B:{bVal}
                  </span>
                </div>
                <div className="z-10 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 shrink-0">
                  <span className="font-mono text-[8px] text-[#00f0ff] uppercase tracking-widest font-extrabold">{t.guessSpectrum}</span>
                </div>
              </div>

              {/* Color Picker Area - 3 RGB Pods with Dynamic Gradients */}
              <motion.div layout className="grid grid-cols-3 gap-3 w-full flex-1 min-h-0">
                {/* Red Pod */}
                <motion.div
                  layout
                  className={`bg-slate-900 border rounded-2xl p-2 flex flex-col items-center justify-between transition-colors duration-200 ${
                    activeInputSlider === 'R' ? 'border-[#ff525c] bg-slate-900/90 shadow-[0_0_15px_rgba(255,82,92,0.1)]' : 'border-slate-800'
                  }`}
                  onClick={() => { setActiveInputSlider('R'); playHaptic(15); }}
                >
                  <span className="font-mono text-xs font-bold text-white mb-2">{rVal}</span>
                  <div
                    ref={rBarRef}
                    className="flex-1 w-full relative cursor-pointer touch-none flex justify-center"
                    onMouseDown={(e) => { isDraggingR.current = true; setActiveInputSlider('R'); const rect = rBarRef.current!.getBoundingClientRect(); const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height)); setRVal(Math.round(255 - (y / rect.height) * 255)); }}
                    onTouchStart={(e) => { isDraggingR.current = true; setActiveInputSlider('R'); const rect = rBarRef.current!.getBoundingClientRect(); const y = Math.max(0, Math.min(e.touches[0].clientY - rect.top, rect.height)); setRVal(Math.round(255 - (y / rect.height) * 255)); }}
                  >
                    <div 
                      className="absolute top-0 bottom-0 w-6 md:w-8 rounded-full shadow-inner pointer-events-none"
                      style={{ background: `linear-gradient(to top, rgb(0, ${gVal}, ${bVal}), rgb(255, ${gVal}, ${bVal}))` }}
                    />
                    <div
                      className="absolute z-10 pointer-events-none"
                      style={{ top: `${100 - (rVal / 255) * 100}%`, transform: 'translateY(-50%)' }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-[#ff525c] tracking-widest font-extrabold mt-2">KIRMIZI</span>
                </motion.div>

                {/* Green Pod */}
                <motion.div
                  layout
                  className={`bg-slate-900 border rounded-2xl p-2 flex flex-col items-center justify-between transition-colors duration-200 ${
                    activeInputSlider === 'G' ? 'border-green-400 bg-slate-900/90 shadow-[0_0_15px_rgba(74,222,128,0.1)]' : 'border-slate-800'
                  }`}
                  onClick={() => { setActiveInputSlider('G'); playHaptic(15); }}
                >
                  <span className="font-mono text-xs font-bold text-white mb-2">{gVal}</span>
                  <div
                    ref={gBarRef}
                    className="flex-1 w-full relative cursor-pointer touch-none flex justify-center"
                    onMouseDown={(e) => { isDraggingG.current = true; setActiveInputSlider('G'); const rect = gBarRef.current!.getBoundingClientRect(); const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height)); setGVal(Math.round(255 - (y / rect.height) * 255)); }}
                    onTouchStart={(e) => { isDraggingG.current = true; setActiveInputSlider('G'); const rect = gBarRef.current!.getBoundingClientRect(); const y = Math.max(0, Math.min(e.touches[0].clientY - rect.top, rect.height)); setGVal(Math.round(255 - (y / rect.height) * 255)); }}
                  >
                    <div 
                      className="absolute top-0 bottom-0 w-6 md:w-8 rounded-full shadow-inner pointer-events-none"
                      style={{ background: `linear-gradient(to top, rgb(${rVal}, 0, ${bVal}), rgb(${rVal}, 255, ${bVal}))` }}
                    />
                    <div
                      className="absolute z-10 pointer-events-none"
                      style={{ top: `${100 - (gVal / 255) * 100}%`, transform: 'translateY(-50%)' }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-green-400 tracking-widest font-extrabold mt-2">YEŞİL</span>
                </motion.div>

                {/* Blue Pod */}
                <motion.div
                  layout
                  className={`bg-slate-900 border rounded-2xl p-2 flex flex-col items-center justify-between transition-colors duration-200 ${
                    activeInputSlider === 'B' ? 'border-[#00f0ff] bg-slate-900/90 shadow-[0_0_15px_rgba(0,240,255,0.1)]' : 'border-slate-800'
                  }`}
                  onClick={() => { setActiveInputSlider('B'); playHaptic(15); }}
                >
                  <span className="font-mono text-xs font-bold text-white mb-2">{bVal}</span>
                  <div
                    ref={bBarRef}
                    className="flex-1 w-full relative cursor-pointer touch-none flex justify-center"
                    onMouseDown={(e) => { isDraggingB.current = true; setActiveInputSlider('B'); const rect = bBarRef.current!.getBoundingClientRect(); const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height)); setBVal(Math.round(255 - (y / rect.height) * 255)); }}
                    onTouchStart={(e) => { isDraggingB.current = true; setActiveInputSlider('B'); const rect = bBarRef.current!.getBoundingClientRect(); const y = Math.max(0, Math.min(e.touches[0].clientY - rect.top, rect.height)); setBVal(Math.round(255 - (y / rect.height) * 255)); }}
                  >
                    <div 
                      className="absolute top-0 bottom-0 w-6 md:w-8 rounded-full shadow-inner pointer-events-none"
                      style={{ background: `linear-gradient(to top, rgb(${rVal}, ${gVal}, 0), rgb(${rVal}, ${gVal}, 255))` }}
                    />
                    <div
                      className="absolute z-10 pointer-events-none"
                      style={{ top: `${100 - (bVal / 255) * 100}%`, transform: 'translateY(-50%)' }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-[#00f0ff] tracking-widest font-extrabold mt-2">MAVİ</span>
                </motion.div>
              </motion.div>

              {/* Lock-In Button - Added pb-6 so it stays well above the banner on all devices */}
              <motion.button
                id="btn-lock-guess"
                onClick={handleLockInGuess}
                className="w-full relative group overflow-hidden rounded-full p-[2px] shrink-0 pb-6 mb-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-[#00f0ff] opacity-40 blur-[4px] rounded-full group-hover:opacity-60 transition-opacity" />
                <div className="relative w-full bg-[#050505] rounded-full py-3.5 flex items-center justify-center gap-2 border-2 border-[#00f0ff] shadow-[inset_0_-4px_2px_rgba(0,240,255,0.2)] hover:bg-[#00f0ff]/10 transition-all">
                  <Lock className="w-5 h-5 text-[#00f0ff] fill-[#00f0ff]/20" />
                  <span className="font-mono text-xs text-[#00f0ff] font-black tracking-[0.2em] uppercase">
                    KİLİTLE
                  </span>
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* STAGE 4: REVEAL / SCORES */}
          {stage === GameStage.REVEAL && (
            <motion.div
              key="stage-reveal"
              className="w-full grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={springTransition}
            >
              {/* Columns 1 & 2: Dual Swatch Comparison & Feedback */}
              <div className="md:col-span-2 flex flex-col space-y-4">
                {/* Dual Swatch Comparison Box */}
                <div className="w-full aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden border border-slate-800 flex relative shadow-2xl">
                  {/* Left side: Target Color */}
                  <div
                    className="w-1/2 h-full flex flex-col justify-between p-5 relative"
                    style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
                  >
                    <span className="font-mono text-[9px] bg-black/50 text-white border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md self-start font-bold uppercase tracking-widest">
                      {t.targetColor}
                    </span>
                    <span className="font-mono text-xs text-white/95 drop-shadow-md font-extrabold self-start bg-black/25 px-2 py-1 rounded-md">
                      {rgbToHex(targetColor)}
                    </span>
                  </div>

                  {/* Right side: Player's Guess */}
                  <div
                    className="w-1/2 h-full flex flex-col justify-between p-5 relative border-l border-slate-950/20"
                    style={{
                      backgroundColor: `rgb(${
                        players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].guesses[currentRound - 1]?.r ?? 128
                      }, ${
                        players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].guesses[currentRound - 1]?.g ?? 128
                      }, ${
                        players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].guesses[currentRound - 1]?.b ?? 128
                      })`
                    }}
                  >
                    <span className="font-mono text-[9px] bg-black/50 text-white border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md self-end font-bold uppercase tracking-widest">
                      {t.yourGuess}
                    </span>
                    <span className="font-mono text-xs text-white/95 drop-shadow-md font-extrabold self-end bg-black/25 px-2 py-1 rounded-md">
                      {rgbToHex(
                        players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].guesses[currentRound - 1] ?? { r: 128, g: 128, b: 128 }
                      )}
                    </span>
                  </div>

                  {/* Floating pill with exact Score inside */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl px-6 py-4 flex flex-col items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.7)]">
                      <span className="font-mono text-[9px] text-slate-400 tracking-wider uppercase font-bold">{t.matchScore}</span>
                      <span className="font-mono text-3xl font-black text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                        {players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].scores[currentRound - 1]}
                        <span className="text-xs text-slate-500 font-bold"> / 10</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Feedback & Multiplier Comparisons */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-1.5 shadow-lg">
                  <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">{t.chromaticDecision}</span>
                  <p className="font-sans font-black text-white text-base">
                    {getFeedback(
                      players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].scores[currentRound - 1] ?? 0,
                      language
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400 bg-slate-950/50 inline-block px-3 py-1 rounded-full border border-slate-800/60">
                    {t.deviation}
                    {Math.round(
                      calculateDeltaE(
                        targetColor,
                        players[settings.mode === 'MULTI' ? revealIndex : currentPlayerIdx].guesses[currentRound - 1] ?? { r: 128, g: 128, b: 128 }
                      ) * 10
                    ) / 10}
                  </p>
                </div>
              </div>

              {/* Column 3: Multi-player Leaderboard & Next Round action */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-extrabold block">
                    {settings.mode === 'MULTI' ? t.roundScores : t.roundSummary}
                  </span>

                  {settings.mode === 'MULTI' ? (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {players.map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => setRevealIndex(idx)}
                          className={`flex justify-between items-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                            idx === revealIndex ? 'bg-[#ff003c]/10 border-[#ff003c]/40' : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/80'
                          }`}
                        >
                          <span className="font-sans text-xs font-bold text-white flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-white/10"
                              style={{
                                backgroundColor: `rgb(${p.guesses[currentRound - 1]?.r ?? 128}, ${p.guesses[currentRound - 1]?.g ?? 128}, ${p.guesses[currentRound - 1]?.b ?? 128})`
                              }}
                            />
                            {p.name} {idx === revealIndex && <span className="text-[9px] text-[#ff003c] font-mono">{t.visibleNote}</span>}
                          </span>
                          <span className="font-mono text-xs font-black text-[#00f0ff]">
                            {p.scores[currentRound - 1] ?? '0.0'} / 10
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/60 text-xs text-slate-400 leading-relaxed">
                      {t.singlePlayerPraise}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <motion.button
                  id="btn-next-round"
                  onClick={handleNextRound}
                  className="w-full bg-[#00f0ff] text-[#050505] p-4 rounded-xl flex items-center justify-center gap-2 font-mono text-xs font-black tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span>
                    {currentRound < settings.maxRounds ? t.nextRoundBtn : t.gameResultsBtn}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STAGE 5: HANDOVER / CO-OP TURN HANDOFF (Keeps players guesses completely concealed!) */}
          {stage === GameStage.HANDOVER && (
            <motion.div
              key="stage-handover"
              className="w-full flex flex-col items-center justify-center text-center space-y-6 max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={springTransition}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#ff003c]/10 border border-[#ff003c]/30 flex items-center justify-center animate-bounce mb-2">
                <Users className="w-8 h-8 text-[#ff003c]" />
              </div>

              <div className="space-y-3">
                <span className="font-mono text-xs text-[#ff003c] tracking-widest font-extrabold uppercase bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  {t.handoverLabel}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                  {t.nextPlayerLabel} <br />
                  <span className="text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                    {players[currentPlayerIdx + 1]?.name}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto px-4 leading-relaxed">
                  {t.handoverDesc}
                </p>
              </div>

              <motion.button
                id="btn-player-ready"
                onClick={handleHandoverNextPlayer}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ff003c] p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:brightness-110 active:scale-[0.98] transition-all"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Sparkles className="w-5 h-5 fill-white" />
                <span>{t.imReady}</span>
              </motion.button>
            </motion.div>
          )}

          {/* STAGE 6: RESULTS / GAME OVER */}
          {stage === GameStage.RESULTS && (
            <motion.div
              key="stage-results"
              className="w-full grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={springTransition}
            >
              {/* Column 1: Award Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center relative overflow-hidden">
                {/* Crown Champion Award Pod */}
                {settings.mode === 'MULTI' ? (
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
                      <Award className="text-yellow-400 w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-yellow-500 uppercase tracking-widest font-black">
                        {getFinalRank(getWinner().avgScore, language)}
                      </span>
                      <h3 className="font-sans font-black text-white text-2xl leading-tight mt-1">
                        {getWinner().player.name}
                      </h3>
                      <p className="font-mono text-xs text-slate-400 mt-2">
                        {t.avgScore} <span className="text-yellow-400 font-bold">{getWinner().avgScore} / 10</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#00f0ff]/10 flex items-center justify-center border border-[#00f0ff]/30">
                      <BarChart3 className="text-[#00f0ff] w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-widest font-black">
                        {t.analysisLabel}
                      </span>
                      <h3 className="font-sans font-black text-white text-xl leading-tight mt-1">
                        {getFinalRank(Math.round((players[0].scores.reduce((a, b) => a + b, 0) / settings.maxRounds) * 10) / 10, language)}
                      </h3>
                      <p className="font-mono text-xs text-slate-400 mt-2">
                        {t.overallRate}{' '}
                        <span className="text-[#00f0ff] font-bold">
                          {Math.round(
                            (players[0].scores.reduce((a, b) => a + b, 0) / settings.maxRounds) * 10
                          ) / 10}{' '}
                          / 10
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Round Score breakdowns for all players */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  {t.roundDetails}
                </span>

                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {players.map((p) => {
                    const avg = p.scores.reduce((a, b) => a + b, 0) / settings.maxRounds;
                    return (
                      <div key={p.id} className="space-y-2 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="font-sans text-xs font-black text-white">{p.name}</span>
                          <span className="font-mono text-xs font-bold text-[#00f0ff]">
                            {t.avgShort} {Math.round(avg * 10) / 10} / 10
                          </span>
                        </div>

                        {/* Visual round circles showing colors */}
                        <div className="flex gap-2">
                          {Array.from({ length: settings.maxRounds }).map((_, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center space-y-1">
                              <div
                                className="w-6 h-6 rounded-full border border-slate-800 shadow-sm relative group"
                                style={{
                                  backgroundColor: `rgb(${p.guesses[idx]?.r ?? 128}, ${p.guesses[idx]?.g ?? 128}, ${p.guesses[idx]?.b ?? 128})`
                                }}
                                title={`Raunt ${idx + 1}: ${p.scores[idx] ?? '0.0'}`}
                              />
                              <span className="font-mono text-[9px] text-slate-500">
                                {p.scores[idx] ?? '0.0'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 3: Restart / Menu Button options */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Oyun Tamamlandı!</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Eğlenceli mücadele sona erdi. Arkadaşlarınla rövanş yapabilir veya ayarlardan raunt sayısını değiştirerek tekrar deneyebilirsin!
                  </p>
                </div>

                <div className="space-y-3">
                  <motion.button
                    id="btn-rematch"
                    onClick={() => {
                      playSound('CLICK');
                      // Reset all player scores
                      setPlayers(
                        players.map(p => ({
                          ...p,
                          scores: [],
                          guesses: []
                        }))
                      );
                      setCurrentRound(1);
                      setCurrentPlayerIdx(0);
                      setStage(GameStage.SPIN);
                    }}
                    className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ff003c] text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all text-sm"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Yeniden Oyna</span>
                  </motion.button>

                  <motion.button
                    id="btn-return-lobby"
                    onClick={onQuit}
                    className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-950/80 text-slate-300 p-4 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all text-sm"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Ana Menüye Dön</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Embedded Dynamic Keyframe Animations for melt countdown */}
      <style>{`
        @keyframes melt {
          0% { width: 100%; opacity: 1; }
          100% { width: 0%; opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

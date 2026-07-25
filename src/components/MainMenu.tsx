/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, ArrowRight, User, Users, Lock, Sparkles, Award, Play, Crown, Monitor, Maximize, Smartphone, Heart, Volume2, HelpCircle, Download, Minimize, CheckCircle2, X } from 'lucide-react';
import { GameStage, GameSettings } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { purchaseRemoveAds, purchaseSupport, checkIsPremium } from '../utils/ads';
import { triggerHaptic, calculateScore } from '../utils/colorMath';

interface MainMenuProps {
  onStartGame: (settings: GameSettings) => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isPremium, setIsPremium] = useState(checkIsPremium());
  
  const handleRemoveAds = async () => {
    const success = await purchaseRemoveAds();
    if (success) setIsPremium(true);
  };

  const handleSupport = async () => {
    await purchaseSupport();
  };
  const [mode, setMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [playerNames, setPlayerNames] = useState<string[]>(['Oyuncu 1', 'Oyuncu 2']);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Android-specific PWA and UI States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHapticEnabled, setIsHapticEnabled] = useState(() => {
    const saved = localStorage.getItem('haptic_enabled');
    return saved !== 'false'; // default to true
  });

  // Demo simulator states
  const [demoColor, setDemoColor] = useState({ r: 0, g: 240, b: 255 });
  const [demoSliders, setDemoSliders] = useState({ r: 128, g: 128, b: 128 });
  const [demoState, setDemoState] = useState<'SPIN' | 'BURN' | 'GUESS' | 'REVEAL'>('SPIN');

  const playHaptic = (duration = 20) => {
    if (isHapticEnabled) {
      triggerHaptic(duration);
    }
  };

  // Skip introduction after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Monitor Android PWA and Fullscreen events
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsPwaInstalled(true);
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Demo state-machine simulator logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (demoState === 'SPIN') {
      const interval = setInterval(() => {
        setDemoColor({
          r: Math.floor(Math.random() * 200) + 30,
          g: Math.floor(Math.random() * 200) + 30,
          b: Math.floor(Math.random() * 200) + 30,
        });
      }, 150);

      timer = setTimeout(() => {
        clearInterval(interval);
        setDemoState('BURN');
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else if (demoState === 'BURN') {
      timer = setTimeout(() => {
        setDemoState('GUESS');
      }, 3000);
    } else if (demoState === 'GUESS') {
      // Simulate slider moving towards target color over 2.5 seconds
      const steps = 25;
      let step = 0;
      const initialR = 128, initialG = 128, initialB = 128;
      
      const interval = setInterval(() => {
        step++;
        const ratio = step / steps;
        setDemoSliders({
          r: Math.round(initialR + (demoColor.r - initialR) * ratio),
          g: Math.round(initialG + (demoColor.g - initialG) * ratio),
          b: Math.round(initialB + (demoColor.b - initialB) * ratio),
        });

        if (step >= steps) {
          clearInterval(interval);
          setDemoState('REVEAL');
        }
      }, 80);

      return () => clearInterval(interval);
    } else if (demoState === 'REVEAL') {
      timer = setTimeout(() => {
        setDemoSliders({ r: 128, g: 128, b: 128 });
        setDemoState('SPIN');
      }, 2500);
    }

    return () => clearTimeout(timer);
  }, [demoState, demoColor]);

  const handleAddPlayer = () => {
    playHaptic(20);
    if (playerNames.length < 4) {
      setPlayerNames([...playerNames, `Oyuncu ${playerNames.length + 1}`]);
    }
  };

  const handleRemovePlayer = () => {
    playHaptic(20);
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.slice(0, -1));
    }
  };

  const handlePlayerNameChange = (index: number, val: string) => {
    const updated = [...playerNames];
    updated[index] = val;
    setPlayerNames(updated);
  };

  const handleLaunch = () => {
    playHaptic(45);
    onStartGame({
      mode,
      playerNames: mode === 'SINGLE' ? ['Gezgin'] : playerNames.filter(n => n.trim() !== ''),
      maxRounds: 5
    });
  };

  const handleInstallClick = async () => {
    playHaptic(30);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      alert('{t.installPrompt}');
    }
  };

  const toggleFullscreen = () => {
    playHaptic(30);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleHaptic = () => {
    const nextVal = !isHapticEnabled;
    setIsHapticEnabled(nextVal);
    localStorage.setItem('haptic_enabled', String(nextVal));
    if (nextVal) {
      triggerHaptic(50);
    }
  };

  const springTransition = { type: 'spring', stiffness: 260, damping: 20 };

  return (
    <div id="main-menu-container" className="w-full h-full overflow-y-auto flex flex-col justify-between px-4 sm:px-6 py-6 md:py-8 relative z-10 overflow-x-hidden">
      {/* Intro Overlay Animation */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            id="intro-splash"
            className="fixed inset-0 bg-[#020617] z-50 flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
            >
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#00f0ff] to-[#4f2eff] p-[2px] flex items-center justify-center animate-pulse mb-6 shadow-[0_0_50px_rgba(0,240,255,0.4)]">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00f0ff] via-indigo-600 to-[#4f2eff]" />
                </div>
              </div>
              <h1 className="font-sans font-black text-4xl tracking-tighter text-white uppercase italic">
                {t.gameTitle.split(" ")[0]} <span className="text-[#00f0ff] drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">{t.gameTitle.split(" ")[1]}</span>
              </h1>
              <p className="font-mono text-xs text-neutral-400 tracking-widest uppercase mt-3">
                {t.gameSubtitle.split(" // ")[0]}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 max-w-5xl mx-auto gap-4"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springTransition}
      >
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-cyan-400">{t.gameTitle}</h1>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">{t.gameSubtitle}</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end items-end">
          <div className="flex gap-2">
            {!isPremium && (
              <button onClick={() => setIsStoreOpen(true)} className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg hover:scale-105 transition">
                <Crown className="w-4 h-4" /> {t.removeAds}
              </button>
            )}
            {isPremium && (
              <div className="bg-gradient-to-r from-yellow-600/20 to-amber-400/20 text-yellow-400 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)] backdrop-blur-sm cursor-pointer" onClick={() => setIsStoreOpen(true)}>
                <Crown className="w-4 h-4 text-yellow-400 animate-pulse" /> {t.vipBadge}
              </div>
            )}
            <button onClick={() => setLanguage(language === 'TR' ? 'EN' : 'TR')} className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-lg flex items-center justify-center hover:bg-slate-700 transition">
              {language === 'TR' ? '🇹🇷' : '🇬🇧'}
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{t.systemStatus}</div>
            <div className="text-emerald-400 text-xs font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> {t.systemReady}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Bento Grid Layout Container */}
      <div className="w-full max-w-5xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-3 md:grid-rows-[auto_auto] gap-4 sm:gap-6 my-2">
        
        {/* CARD 1: HERO / GAME SELECTION & CONFIGURATION (Spans 2 cols, 2 rows on desktop) */}
        <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-indigo-950/80 to-slate-900 rounded-2xl border border-indigo-500/30 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[400px]">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div>
            <span className="bg-indigo-600/60 text-[10px] font-bold px-2 py-1 rounded mb-4 inline-block uppercase tracking-wider text-indigo-200 border border-indigo-400/20">{t.chapter1}</span>
            <h2 className="text-3xl sm:text-4xl font-black mb-3 leading-none tracking-tight text-white uppercase italic">{t.heroTitle}</h2>
            <p className="text-slate-300 leading-relaxed text-sm max-w-xl">
              {t.heroDesc}
            </p>
          </div>

          <div className="space-y-4 mt-6 z-10">
            {/* Mode Selection buttons inside Hero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                id="btn-single-mode"
                onClick={() => {
                  playHaptic(25);
                  setMode('SINGLE');
                  setIsLobbyOpen(true);
                }}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-300 relative overflow-hidden group ${
                  mode === 'SINGLE' && isLobbyOpen
                    ? 'bg-white/10 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 group-hover:bg-[#00f0ff]/10 transition-all">
                    <User className="text-[#00f0ff] w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-[#00f0ff] transition-colors">{t.singlePlayer}</h3>
                    <p className="text-[10px] text-neutral-400">{t.singlePlayerDesc}</p>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-[#00f0ff] border border-[#00f0ff]/30 px-1.5 py-0.5 rounded-full bg-[#00f0ff]/10">
                  TEKİL
                </span>
              </motion.button>

              <motion.button
                id="btn-multi-mode"
                onClick={() => {
                  playHaptic(25);
                  setMode('MULTI');
                  setIsLobbyOpen(true);
                }}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-300 relative overflow-hidden group ${
                  mode === 'MULTI' && isLobbyOpen
                    ? 'bg-white/10 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 group-hover:bg-indigo-400/10 transition-all">
                    <Users className="text-indigo-400 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-indigo-300 transition-colors">{t.multiPlayer}</h3>
                    <p className="text-[10px] text-neutral-400">{t.multiPlayerDesc}</p>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-indigo-400 border border-indigo-400/30 px-1.5 py-0.5 rounded-full bg-indigo-400/10">
                  DÜELLO
                </span>
              </motion.button>
            </div>

            {/* Dynamic Lobby configuration panel inside Hero */}
            <AnimatePresence mode="wait">
              {isLobbyOpen && (
                <motion.div
                  id="lobby-panel"
                  className="w-full bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-4 shadow-lg"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={springTransition}
                >
                  {mode === 'MULTI' ? (
                    <div className="space-y-3" id="multi-setup">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-neutral-300 tracking-wider">{t.playerSettings}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleRemovePlayer}
                            disabled={playerNames.length <= 2}
                            className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white font-black disabled:opacity-30 border border-slate-700 hover:bg-slate-700 transition-all"
                          >
                            -
                          </button>
                          <button
                            onClick={handleAddPlayer}
                            disabled={playerNames.length >= 4}
                            className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white font-black disabled:opacity-30 border border-slate-700 hover:bg-slate-700 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {playerNames.map((name, i) => (
                          <div key={i} className="relative">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                              placeholder={`${i + 1}. ${t.playerPlaceholder}`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-sans text-xs focus:border-indigo-500 outline-none transition-all"
                            />
                            <span className="absolute right-2 top-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-neutral-400 py-1 font-sans">
                      {t.singlePlayerInfo}
                    </div>
                  )}

                  {/* Start Button */}
                  <motion.button
                    id="btn-start-game"
                    onClick={handleLaunch}
                    className="w-full bg-gradient-to-r from-[#00f0ff] to-[#4f2eff] py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:brightness-115 active:scale-[0.98] transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span className="font-mono text-xs tracking-widest font-extrabold uppercase">{t.startGame}</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>



        {/* CARD 3: PERFECT TARGET SCORE STATUS (1 col, 1 row) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl">
          <div className="text-5xl font-black text-amber-400 mb-1 tracking-tighter">10.0</div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t.perfectScore}</div>
          <div className="w-full bg-slate-950 h-1.5 mt-4 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-300 w-full h-full animate-pulse"></div>
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-3 uppercase tracking-widest">
            {t.perfectScoreDesc}
          </div>
        </div>

        {/* CARD 4: LIVE SIMULATOR DEMO SHOWCASE (Spans 3 cols on desktop) */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#00f0ff] tracking-widest uppercase">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>{t.howToPlay}</span>
            </div>
            <span className="font-mono text-[9px] text-neutral-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {demoState === 'SPIN' && t.spinState}
              {demoState === 'BURN' && t.burnState}
              {demoState === 'GUESS' && t.guessState}
              {demoState === 'REVEAL' && t.revealState}
            </span>
          </div>

          <div className="flex flex-col gap-4 items-center justify-center w-full max-w-lg mx-auto py-2">
            {/* Split Color Display area */}
            <div className="w-full aspect-video sm:aspect-[2/1] rounded-xl overflow-hidden border-2 border-slate-700 flex bg-slate-950 shadow-inner relative">
              {/* Left Side (Target Color) */}
              <div className="w-1/2 h-full flex flex-col relative border-r border-slate-800">
                {(demoState === 'SPIN' || demoState === 'BURN' || demoState === 'GUESS' || demoState === 'REVEAL') && (
                  <div
                    className={`absolute inset-0 transition-all ${demoState === 'SPIN' ? 'duration-150' : 'duration-300'}`}
                    style={{ backgroundColor: `rgb(${demoColor.r}, ${demoColor.g}, ${demoColor.b})` }}
                  />
                )}
                {/* Always-on Label for Left Side */}
                <div className="absolute bottom-2 left-0 w-full flex justify-center">
                  <span className="bg-slate-950/70 text-slate-200 px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-widest uppercase backdrop-blur-sm">
                    HEDEF
                  </span>
                </div>
              </div>

              {/* Right Side (Guess Color) */}
              <div className="w-1/2 h-full flex flex-col relative">
                {(demoState === 'GUESS' || demoState === 'REVEAL') ? (
                  <div
                    className="absolute inset-0 transition-all duration-75"
                    style={{ backgroundColor: `rgb(${demoSliders.r}, ${demoSliders.g}, ${demoSliders.b})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
                    <span className="text-xl text-neutral-400 font-sans font-black uppercase tracking-widest">?</span>
                  </div>
                )}
                {/* Always-on Label for Right Side */}
                <div className="absolute bottom-2 left-0 w-full flex justify-center">
                  <span className="bg-slate-950/70 text-[#00f0ff] px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-widest uppercase backdrop-blur-sm">
                    TAHMİN
                  </span>
                </div>
              </div>

              {/* Center Live Score Badge */}
              {(demoState === 'GUESS' || demoState === 'REVEAL') && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 border-2 border-slate-700 rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md z-20">
                  <span className="text-xl font-black text-white tabular-nums leading-none">
                    {calculateScore(demoColor, demoSliders).toFixed(1)}
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold tracking-widest mt-0.5">/ 10</span>
                </div>
              )}

              {/* Simulated Timer line (State 2) */}
              {demoState === 'BURN' && (
                <div className="absolute top-0 left-0 h-1 bg-[#00f0ff] animate-[melt_3s_linear_forwards] w-full z-10" />
              )}
            </div>
          </div>

          {/* Slider Controls Display area (Restored for simulation) */}
          <div className="w-full max-w-xl mx-auto mt-6 space-y-2.5 py-1">
            {/* Red slider */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-bold font-mono">
                <span className="text-[#ff525c]">{t.red}</span>
                <span className="text-neutral-400">{demoSliders.r}</span>
              </div>
              <div className="h-4 bg-slate-950 border border-slate-800 rounded-full relative overflow-hidden flex items-center px-1">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-transparent to-[#ff525c]/45 transition-all"
                  style={{ width: `${(demoSliders.r / 255) * 100}%` }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full bg-white absolute shadow-[0_0_8px_rgba(255,82,92,0.8)] transition-all"
                  style={{ left: `calc(${(demoSliders.r / 255) * 90}% + 4px)` }}
                />
              </div>
            </div>

            {/* Green slider */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-bold font-mono">
                <span className="text-green-400">{t.green}</span>
                <span className="text-neutral-400">{demoSliders.g}</span>
              </div>
              <div className="h-4 bg-slate-950 border border-slate-800 rounded-full relative overflow-hidden flex items-center px-1">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-transparent to-green-500/45 transition-all"
                  style={{ width: `${(demoSliders.g / 255) * 100}%` }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full bg-white absolute shadow-[0_0_8px_rgba(34,197,94,0.8)] transition-all"
                  style={{ left: `calc(${(demoSliders.g / 255) * 90}% + 4px)` }}
                />
              </div>
            </div>

            {/* Blue slider */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-bold font-mono">
                <span className="text-[#00f0ff]">{t.blue}</span>
                <span className="text-neutral-400">{demoSliders.b}</span>
              </div>
              <div className="h-4 bg-slate-950 border border-slate-800 rounded-full relative overflow-hidden flex items-center px-1">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-transparent to-[#00f0ff]/45 transition-all"
                  style={{ width: `${(demoSliders.b / 255) * 100}%` }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full bg-white absolute shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all"
                  style={{ left: `calc(${(demoSliders.b / 255) * 90}% + 4px)` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 5: CHROMATIC SCIENCE & TIPS (1 col, 1 row) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">{t.chromaticTips}</h3>
            <ul className="text-xs space-y-3">
              <li className="flex gap-2.5">
                <span className="text-cyan-400 font-mono font-bold">01</span>
                <span className="text-slate-400 leading-normal">{t.tip1}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-cyan-400 font-mono font-bold">02</span>
                <span className="text-slate-400 leading-normal">{t.tip2}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-cyan-400 font-mono font-bold">03</span>
                <span className="text-slate-400 leading-normal">{t.tip3}</span>
              </li>
            </ul>
          </div>
          <div className="text-[9px] text-slate-500 font-mono border-t border-slate-800/80 pt-3 mt-4 flex justify-between uppercase tracking-wider">
            <span>{t.modeLabel}</span>
            <span className="text-[#00f0ff] font-bold">{t.activeLabel}</span>
          </div>
        </div>



      </div>

      {/* Store Modal */}
      <AnimatePresence>
        {isStoreOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={springTransition}
            >
              {/* Decorative background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-indigo-500/20 to-transparent pointer-events-none"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{t.storeAndSupport}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">Uygulamayı geliştirerek daha iyi hale getirmemize yardımcı olun.</p>
                </div>
                <button 
                  onClick={() => setIsStoreOpen(false)}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                {/* Remove Ads Widget */}
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/60 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
                  <div>
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-300 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                      <Crown className="w-6 h-6 text-black" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase">{t.removeAds}</h3>
                    <p className="text-xs text-slate-400 mt-2 mb-6">Tüm reklamları kalıcı olarak kaldırır ve profilinizde şık bir VIP rozeti sergiler.</p>
                  </div>
                  
                  {isPremium ? (
                    <div className="w-full bg-slate-800 text-amber-400 py-3 rounded-xl font-black text-sm text-center uppercase tracking-wider flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {t.adsRemoved}
                    </div>
                  ) : (
                    <button onClick={handleRemoveAds} className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black py-3 rounded-xl font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      14.99 ₺ Satın Al
                    </button>
                  )}
                </div>

                {/* Support Developer Widget */}
                <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/60 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                  <div>
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-300 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <Heart className="w-6 h-6 text-black" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase">{t.supportDev}</h3>
                    <p className="text-xs text-slate-400 mt-2 mb-6">Oyunun gelişimine doğrudan katkıda bulunun. Desteğiniz bizim için çok değerli!</p>
                  </div>
                  
                  <button onClick={handleSupport} className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-black py-3 rounded-xl font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    29.99 ₺ Satın Al
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="w-full text-center py-4 border-t border-slate-900 flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] max-w-5xl mx-auto mt-4">
        <div className="flex gap-6 sm:gap-8">
          <span>{t.code}</span>
          <span>{t.latency}</span>
          <span>{t.server}</span>
        </div>
        <div className="text-slate-500 font-sans hidden sm:block">
          TEMSİLİ SÜRÜM: <span className="text-cyan-400">[BENTO GRID]</span>
        </div>
      </footer>
    </div>
  );
}

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
import { User, Users, Play, Sparkles, Volume2, HelpCircle, Smartphone, Download, Maximize, Minimize, CheckCircle2, Crown } from 'lucide-react';
import { GameSettings } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { purchaseRemoveAds, checkIsPremium } from '../utils/ads';
import { triggerHaptic } from '../utils/colorMath';

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
  const [mode, setMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [playerNames, setPlayerNames] = useState<string[]>(['Oyuncu 1', 'Oyuncu 2']);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
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
    <div id="main-menu-container" className="w-full min-h-screen flex flex-col justify-between px-4 sm:px-6 py-6 md:py-8 relative z-10 overflow-x-hidden">
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
              <button onClick={handleRemoveAds} className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg hover:scale-105 transition">
                <Crown className="w-4 h-4" /> {t.removeAds}
              </button>
            )}
            {isPremium && (
              <div className="bg-slate-800 text-yellow-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border border-yellow-500/30">
                <Crown className="w-4 h-4" /> {t.adsRemoved}
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

        {/* CARD 2: CONTROLS & SCIENCE (1 col, 1 row) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-cyan-500/10 rounded flex items-center justify-center border border-cyan-500/20">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">{t.systemPhases}</span>
          </div>
          <div className="space-y-3 my-2">
            <div className="flex justify-between text-xs border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">{t.phase1}</span>
              <span className="font-bold text-cyan-400 text-[10px] font-mono">{t.phase1Name}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">{t.phase2}</span>
              <span className="font-bold text-indigo-400 text-[10px] font-mono">{t.phase2Name}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">{t.phase3}</span>
              <span className="font-bold text-amber-400 text-[10px] font-mono">{t.phase3Name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t.engine}</span>
              <span className="font-bold text-[#ff003c] text-[10px] font-mono">{t.engineName}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono italic leading-normal">
            {t.deltaNote}
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

        {/* CARD 4: LIVE SIMULATOR DEMO SHOWCASE (Spans 2 cols on desktop) */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Target Color Display area */}
            <div className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center bg-slate-950 shadow-inner">
              {demoState === 'SPIN' && (
                <div
                  className="absolute inset-0 transition-all duration-150"
                  style={{ backgroundColor: `rgb(${demoColor.r}, ${demoColor.g}, ${demoColor.b})` }}
                />
              )}
              {demoState === 'BURN' && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: `rgb(${demoColor.r}, ${demoColor.g}, ${demoColor.b})` }}
                />
              )}
              {demoState === 'GUESS' && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[10px] text-neutral-400 font-sans font-bold uppercase tracking-widest">{t.memoryPhase}</span>
                  <span className="text-[8px] text-neutral-500 font-mono mt-1">{t.colorSaved}</span>
                </div>
              )}
              {demoState === 'REVEAL' && (
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 h-full" style={{ backgroundColor: `rgb(${demoColor.r}, ${demoColor.g}, ${demoColor.b})` }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: `rgb(${demoSliders.r}, ${demoSliders.g}, ${demoSliders.b})` }} />
                </div>
              )}

              {/* Simulated Timer line (State 2) */}
              {demoState === 'BURN' && (
                <div className="absolute top-0 left-0 h-1 bg-[#00f0ff] animate-[melt_3s_linear_forwards] w-full" />
              )}

              <div className="z-10 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-[9px] font-bold text-white backdrop-blur-sm uppercase tracking-wider font-mono">
                {demoState === 'SPIN' && t.step1}
                {demoState === 'BURN' && t.step2}
                {demoState === 'GUESS' && t.step3}
                {demoState === 'REVEAL' && t.step4}
              </div>
            </div>

            {/* Slider Controls Display area */}
            <div className="space-y-2.5 py-1">
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

          {/* Simulated accuracy score reveal banner */}
          <AnimatePresence>
            {demoState === 'REVEAL' && (
              <motion.div
                className="bg-gradient-to-r from-[#00f0ff]/10 to-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-center text-xs font-mono flex items-center justify-between mt-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={springTransition}
              >
                <div className="text-left">
                  <div className="text-[9px] text-neutral-400 font-sans uppercase font-bold tracking-wider">{t.perfectMatchRate}</div>
                  <div className="font-extrabold text-white text-xs">{t.deviationTolerance}</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                    9.4 <span className="text-xs text-neutral-500">/ 10</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

        {/* CARD 6: ANDROID INTEGRATION CENTER (1 col, 1 row) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00f0ff]/5 rounded-full blur-2xl" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00f0ff]/10 rounded flex items-center justify-center border border-[#00f0ff]/20">
                <Smartphone className="w-5 h-5 text-[#00f0ff]" />
              </div>
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-400">{t.androidIntegration}</span>
            </div>

            <div className="space-y-2.5">
              {/* Fullscreen controller */}
              <button
                onClick={toggleFullscreen}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/85 rounded-xl text-xs transition-all text-left group cursor-pointer"
              >
                <span className="text-slate-300 font-sans group-hover:text-white transition-colors">{t.fullscreen}</span>
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 text-[#ff003c]" />
                ) : (
                  <Maximize className="w-4 h-4 text-[#00f0ff]" />
                )}
              </button>

              {/* Haptic controller */}
              <button
                onClick={toggleHaptic}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/85 rounded-xl text-xs transition-all text-left cursor-pointer"
              >
                <span className="text-slate-300 font-sans">{t.haptic}</span>
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                  isHapticEnabled 
                    ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/25' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                }`}>
                  {isHapticEnabled ? '{t.on}' : '{t.off}'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4">
            {isPwaInstalled ? (
              <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="font-sans font-bold">{t.appReady}</div>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 hover:border-[#00f0ff]/40 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] text-xs font-mono tracking-wider cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#00f0ff]" />
                <span>{t.installApp}</span>
              </button>
            )}
          </div>
        </div>

      </div>

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

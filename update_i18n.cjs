const fs = require('fs');
const path = require('path');

const mainMenuPath = path.join(__dirname, 'src', 'components', 'MainMenu.tsx');
let mainContent = fs.readFileSync(mainMenuPath, 'utf8');

// Imports
mainContent = mainContent.replace(
  "import { GameSettings } from '../types';",
  "import { GameSettings } from '../types';\nimport { useLanguage } from '../i18n/LanguageContext';\nimport { purchaseRemoveAds, checkIsPremium } from '../utils/ads';"
);

mainContent = mainContent.replace(
  "import { User, Users, Play, Sparkles, Volume2, HelpCircle, Smartphone, Download, Maximize, Minimize, CheckCircle2 } from 'lucide-react';",
  "import { User, Users, Play, Sparkles, Volume2, HelpCircle, Smartphone, Download, Maximize, Minimize, CheckCircle2, Crown } from 'lucide-react';"
);

// Component Body
mainContent = mainContent.replace(
  "export default function MainMenu({ onStartGame }: MainMenuProps) {",
  `export default function MainMenu({ onStartGame }: MainMenuProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isPremium, setIsPremium] = useState(checkIsPremium());
  
  const handleRemoveAds = async () => {
    const success = await purchaseRemoveAds();
    if (success) setIsPremium(true);
  };`
);

// Header replacements
mainContent = mainContent.replace('COLOR <span className="text-[#00f0ff] drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">FINDER</span>', '{t.gameTitle.split(" ")[0]} <span className="text-[#00f0ff] drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">{t.gameTitle.split(" ")[1]}</span>');
mainContent = mainContent.replace('KROMATİK SİSTEM SÜRÜM 4.2.0', '{t.gameSubtitle.split(" // ")[0]}');

mainContent = mainContent.replace(
  '<h1 className="text-4xl font-black tracking-tighter uppercase italic text-cyan-400">COLOR FINDER</h1>\n          <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">KROMATİK SİSTEM SÜRÜM 4.2.0 // GÖZLERİNE GÜVEN</p>',
  '<h1 className="text-4xl font-black tracking-tighter uppercase italic text-cyan-400">{t.gameTitle}</h1>\n          <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">{t.gameSubtitle}</p>'
);

mainContent = mainContent.replace(
  '<div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end">',
  `<div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end items-end">
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
          </div>`
);

mainContent = mainContent.replace('SİSTEM DURUMU', '{t.systemStatus}');
mainContent = mainContent.replace('SİSTEM HAZIR', '{t.systemReady}');
mainContent = mainContent.replace('BÖLÜM 01: ALGILAMA VE HAFIZA', '{t.chapter1}');
mainContent = mainContent.replace('MÜKEMMEL TONU<br/>EZBERE YAKALA', '{t.heroTitle}');
mainContent = mainContent.replace('Color Finder, insan gözünün renk sapmalarına duyarlılığını test eden bilimsel bir kromatik analiz oyunudur. Hedef rengi 3 saniye inceleyin, ardından kırmızı, yeşil ve mavi kanallarını eşleyerek en düşük Delta E sapmasını elde edin!', '{t.heroDesc}');

mainContent = mainContent.replace('>TEK OYUNCU<', '>{t.singlePlayer}<');
mainContent = mainContent.replace('>Gözlerini test et.<', '>{t.singlePlayerDesc}<');
mainContent = mainContent.replace('>TEKİL<', '>{t.singleBadge}<');
mainContent = mainContent.replace('>SIRA SIRA OYNA<', '>{t.multiPlayer}<');
mainContent = mainContent.replace('>Çoklu cihaz düellosu.<', '>{t.multiPlayerDesc}<');
mainContent = mainContent.replace('>DÜELLO<', '>{t.multiBadge}<');
mainContent = mainContent.replace('OYUNCU AYARLARI (2-4 KİŞİ)', '{t.playerSettings}');
mainContent = mainContent.replace('1. Oyuncu', '{`1. ${t.playerPlaceholder}`}').replace('2. Oyuncu', '{`2. ${t.playerPlaceholder}`}');
mainContent = mainContent.replace(' placeholder={`${i + 1}. Oyuncu`}', ' placeholder={`${i + 1}. ${t.playerPlaceholder}`}');
mainContent = mainContent.replace('🚀 Tek Kişilik modda 5 raunt boyunca kendi rekorunu kırmak için yarışacaksın. En yüksek puan için odaklan!', '{t.singlePlayerInfo}');
mainContent = mainContent.replace('OYUNU BAŞLAT', '{t.startGame}');

mainContent = mainContent.replace('SİSTEM FAZLARI', '{t.systemPhases}');
mainContent = mainContent.replace('>1. Faz<', '>{t.phase1}<');
mainContent = mainContent.replace('DÖNDÜRME', '{t.phase1Name}');
mainContent = mainContent.replace('>2. Faz<', '>{t.phase2}<');
mainContent = mainContent.replace('EZBERE ALIM', '{t.phase2Name}');
mainContent = mainContent.replace('>3. Faz<', '>{t.phase3}<');
mainContent = mainContent.replace('RENK TAHMİNİ', '{t.phase3Name}');
mainContent = mainContent.replace('>Motor<', '>{t.engine}<');
mainContent = mainContent.replace('CIE76 ANALİZİ', '{t.engineName}');
mainContent = mainContent.replace('* Delta E sapması 0.0\'a yaklaştıkça aldığın uyum skoru 10.0\'a yaklaşır.', '{t.deltaNote}');

mainContent = mainContent.replace('HEDEF KUSURSUZ SKOR', '{t.perfectScore}');
mainContent = mainContent.replace('KUSURSUZ GÖZLER İÇİN &lt; 1.0 DELTA E', '{t.perfectScoreDesc}');
mainContent = mainContent.replace('NASIL OYNANIR? (CANLI SİMÜLASYON)', '{t.howToPlay}');

mainContent = mainContent.replace("{demoState === 'SPIN' && 'Döndürme...'}", "{demoState === 'SPIN' && t.spinState}");
mainContent = mainContent.replace("{demoState === 'BURN' && 'Hafızaya Al!'}", "{demoState === 'BURN' && t.burnState}");
mainContent = mainContent.replace("{demoState === 'GUESS' && 'Tahmin Yapılıyor...'}", "{demoState === 'GUESS' && t.guessState}");
mainContent = mainContent.replace("{demoState === 'REVEAL' && 'Sonuç!'}", "{demoState === 'REVEAL' && t.revealState}");

mainContent = mainContent.replace('Hafıza Fazı', '{t.memoryPhase}');
mainContent = mainContent.replace('Renk Saklandı', '{t.colorSaved}');
mainContent = mainContent.replace("{demoState === 'SPIN' && '1. DÖNDÜR'}", "{demoState === 'SPIN' && t.step1}");
mainContent = mainContent.replace("{demoState === 'BURN' && '2. EZBERLE (3S)'}", "{demoState === 'BURN' && t.step2}");
mainContent = mainContent.replace("{demoState === 'GUESS' && '3. TAHMİN ET'}", "{demoState === 'GUESS' && t.step3}");
mainContent = mainContent.replace("{demoState === 'REVEAL' && '4. SKOR!'}", "{demoState === 'REVEAL' && t.step4}");

mainContent = mainContent.replace('KIRMIZI', '{t.red}');
mainContent = mainContent.replace('YEŞİL', '{t.green}');
mainContent = mainContent.replace('MAVİ', '{t.blue}');
mainContent = mainContent.replace('MÜKEMMEL EŞLEŞME ORANI', '{t.perfectMatchRate}');
mainContent = mainContent.replace('Sapma Toleransı (Delta E)', '{t.deviationTolerance}');
mainContent = mainContent.replace('KROMATİK İPUÇLARI', '{t.chromaticTips}');
mainContent = mainContent.replace('Kırmızı, yeşil ve mavi tonlar birleştiğinde beyaz ışığa yaklaşır.', '{t.tip1}');
mainContent = mainContent.replace('Delta E &lt; 2.0 değeri insan gözünün ayırt edemeyeceği kadar kusursuzdur.', '{t.tip2}');
mainContent = mainContent.replace('Sıra Sıra oynayarak aynı cihazda arkadaşlarınla yarışabilirsin!', '{t.tip3}');
mainContent = mainContent.replace('MOD: DUELLO', '{t.modeLabel}');
mainContent = mainContent.replace('AKTİF', '{t.activeLabel}');

mainContent = mainContent.replace('ANDROID ENTEGRASYONU', '{t.androidIntegration}');
mainContent = mainContent.replace('Tam Ekran (Fullscreen)', '{t.fullscreen}');
mainContent = mainContent.replace('Dokunsal Titreşim (Haptic)', '{t.haptic}');
mainContent = mainContent.replace('AÇIK', '{t.on}');
mainContent = mainContent.replace('KAPALI', '{t.off}');
mainContent = mainContent.replace('Android Uygulaması Hazır', '{t.appReady}');
mainContent = mainContent.replace('UYGULAMAYI YÜKLE', '{t.installApp}');
mainContent = mainContent.replace('Android cihazınızda Google Chrome kullanıyorsanız:\\nSağ üstteki seçenekler menüsüne (üç nokta) dokunup "Ana Ekrana Ekle" veya "Uygulamayı Yükle" seçeneğini seçerek Color Finder\\\'ı telefonunuza native uygulama olarak kurabilirsiniz.', '{t.installPrompt}');

mainContent = mainContent.replace('KOD: ANTIGRAVITY', '{t.code}');
mainContent = mainContent.replace('GECİKME: 0MS', '{t.latency}');
mainContent = mainContent.replace('SUNUCU: YEREL', '{t.server}');
mainContent = mainContent.replace('TEMSİLİ SÜRÜM: [BENTO GRID]', '{t.demoVersion}');

fs.writeFileSync(mainMenuPath, mainContent);


// ================= GAME SCREEN ==================
const gameScreenPath = path.join(__dirname, 'src', 'components', 'GameScreen.tsx');
let gameContent = fs.readFileSync(gameScreenPath, 'utf8');

gameContent = gameContent.replace(
  "import { GameStage, GameSettings, Player, RGBColor } from '../types';",
  "import { GameStage, GameSettings, Player, RGBColor } from '../types';\nimport { useLanguage } from '../i18n/LanguageContext';\nimport { prepareInterstitialAd, showInterstitialAd } from '../utils/ads';"
);

gameContent = gameContent.replace(
  "export default function GameScreen({ settings, onQuit }: GameScreenProps) {",
  `export default function GameScreen({ settings, onQuit }: GameScreenProps) {
  const { t } = useLanguage();
  
  useEffect(() => {
    prepareInterstitialAd();
  }, []);`
);

// Override handleNextRound to show Interstitial on game end
gameContent = gameContent.replace(
  "playSound('WINNER');\n      setStage(GameStage.RESULTS);",
  "playSound('WINNER');\n      showInterstitialAd();\n      setStage(GameStage.RESULTS);"
);

gameContent = gameContent.replace('>Vazgeç<', '>{t.giveUp}<');
gameContent = gameContent.replace('KROMATİK RAUNT', '{t.roundLabel}');
gameContent = gameContent.replace('Tek Oyuncu', '{t.singlePlayerLabel}');
gameContent = gameContent.replace('RENK SEÇİLİYOR...', '{t.spinning}');
gameContent = gameContent.replace('Slot motoru rastgele bir ton kilitliyor.', '{t.spinSub}');
gameContent = gameContent.replace('KROMATİK RULET', '{t.chromaticRoulette}');
gameContent = gameContent.replace('HAFIZAYA KAZI!', '{t.burnLabel}');
gameContent = gameContent.replace('3 SANİYE BAŞLADI', '{t.timerStarted}');
gameContent = gameContent.replace('TAHMİN TAYFINIZ', '{t.guessSpectrum}');
gameContent = gameContent.replace('KILAVUZ KARTI', '{t.guideCard}');
gameContent = gameContent.replace('Kromatik Hedefler', '{t.chromaticTargets}');
gameContent = gameContent.replace('Aklında kalan hedef rengi oluşturmak için RGB kaydırıcılarını kullan. Uyum puanı Delta E formülü ile hesaplanır.', '{t.guideDesc}');
gameContent = gameContent.replace('9+ Puan: Mükemmel (Delta < 5)', '{t.score9}');
gameContent = gameContent.replace('7+ Puan: Çok Yakın (Delta < 15)', '{t.score7}');
gameContent = gameContent.replace('Düşük Puan: Uzak Sapma', '{t.scoreLow}');
gameContent = gameContent.replace('>KİLİTLE<', '>{t.lockIn}<');
gameContent = gameContent.replace('HEDEF RENK', '{t.targetColor}');
gameContent = gameContent.replace('TAHMİNİNİZ', '{t.yourGuess}');
gameContent = gameContent.replace('UYUM SKORU', '{t.matchScore}');
gameContent = gameContent.replace('KROMATİK KARAR', '{t.chromaticDecision}');
gameContent = gameContent.replace('Sapma: Delta E ~', '{t.deviation}');
gameContent = gameContent.replace("BU TURUN SKORLARI' : 'RAUNT ÖZETİ", "BU TURUN SKORLARI' : t.roundSummary");
gameContent = gameContent.replace("BU TURUN SKORLARI'", "t.roundScores'");
gameContent = gameContent.replace('(Görünüyor)', '{t.visibleNote}');
gameContent = gameContent.replace('Harika gidiyorsun! Renk frekanslarına olan duyarlılığın her rauntta hafızanı daha da güçlendirecektir. Sıradaki hedef tona hazırlan!', '{t.singlePlayerPraise}');
gameContent = gameContent.replace("'SIRADAKİ RAUNT' : 'OYNANIŞ SONUÇLARI'", "t.nextRoundBtn : t.gameResultsBtn");
gameContent = gameContent.replace('TELEFONU DEVRET', '{t.handoverLabel}');
gameContent = gameContent.replace('Sıradaki Oyuncu:', '{t.nextPlayerLabel}');
gameContent = gameContent.replace('Önceki tahminlerin gizli kalması için cihazı arkadaşına teslim et. Hazır olduğunda aşağıdaki butona tıklasın!', '{t.handoverDesc}');
gameContent = gameContent.replace('BEN HAZIRIM, BAŞLAT!', '{t.imReady}');
gameContent = gameContent.replace('RENK ŞAMPİYONU', '{t.championLabel}');
gameContent = gameContent.replace('Ortalama Skor:', '{t.avgScore}');
gameContent = gameContent.replace('PERFORMANS ANALİZİ', '{t.analysisLabel}');
gameContent = gameContent.replace('Kromatik Kaşif', '{t.explorerLabel}');
gameContent = gameContent.replace('Genel Uyum Oranı:', '{t.overallRate}');
gameContent = gameContent.replace('RAUNT DETAYLARI', '{t.roundDetails}');
gameContent = gameContent.replace('Ort:', '{t.avgShort}');
gameContent = gameContent.replace('>YENİDEN OYNA<', '>{t.playAgain}<');
gameContent = gameContent.replace('>ANA MENÜ<', '>{t.mainMenu}<');

fs.writeFileSync(gameScreenPath, gameContent);

console.log('Update finished');

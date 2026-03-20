import React, { useState, useEffect } from 'react';
import { GameMode, Settings, Lesson, GameStats, Category, SubLesson } from './types';
import { categories } from './data/categories';
import { perfectMessages, goodMessages, tryAgainMessages } from './data/messages';
import { GameStandard } from './components/GameStandard';
import { GameShooter } from './components/GameShooter';
import { GameWordShooter } from './components/GameWordShooter';
import { GameChallenge } from './components/GameChallenge';
import { Keyboard } from './components/Keyboard';
import { VerticalTimer } from './components/VerticalTimer';
import { Settings as SettingsIcon, Play, Target, Clock, Trophy, ArrowLeft, RotateCcw, Map as MapIcon, Dumbbell, Star, X, CheckCircle2, HelpCircle, ArrowRight, Keyboard as KeyboardIcon, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

type Screen = 'menu' | 'game' | 'evaluation';
type Tab = 'path' | 'practice';

export default function App() {
  type InfiniteRunSummary = GameStats & {
    playedAt: string;
    mode: 'standard' | 'shooter';
    difficulty: 'easy' | 'medium' | 'hard';
    progressive: boolean;
    durationSec: number | null;
  };

  const [screen, setScreen] = useState<Screen>('menu');
  const [currentTab, setCurrentTab] = useState<Tab>('path');
  const [selectedLesson, setSelectedLesson] = useState<SubLesson>(categories[0].subLessons[0]);
  const [selectedMode, setSelectedMode] = useState<GameMode>('standard');
  const [stats, setStats] = useState<GameStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [lastCompletedLessonId, setLastCompletedLessonId] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [lessonInfiniteSettings, setLessonInfiniteSettings] = useState<Record<string, { mode: 'standard' | 'shooter'; difficulty: 'easy' | 'medium' | 'hard'; progressive: boolean; durationSec: number | null }>>({});
  const [infiniteResults, setInfiniteResults] = useState<Record<string, InfiniteRunSummary>>(() => {
    const saved = localStorage.getItem('ninjaInfiniteResults');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('ninjaSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      showTimer: parsed.showTimer ?? true,
      showErrors: parsed.showErrors ?? true,
      strictMode: parsed.strictMode ?? false,
      darkMode: parsed.darkMode ?? false,
      shooterDifficulty: parsed.shooterDifficulty ?? 'medium',
    };
  });

  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    const saved = localStorage.getItem('ninjaProgress');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [infiniteDifficulty, setInfiniteDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const pathContainerRef = React.useRef<HTMLDivElement>(null);

  const learnedLetters = React.useMemo(() => {
    const letters = new Set<string>();
    // Basic home row letters are always "learned" in a way, but let's stick to what's completed
    categories.forEach(cat => {
      cat.subLessons.forEach(lesson => {
        if (completedLessons.includes(lesson.id.toString()) && lesson.newLetters) {
          lesson.newLetters.split('').forEach(l => letters.add(l.toLowerCase()));
        }
      });
    });
    return letters;
  }, [completedLessons]);

  useEffect(() => {
    if (!pathContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(pathContainerRef.current);
    return () => observer.disconnect();
  }, [currentTab]);

  useEffect(() => {
    if (selectedCategory) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedCategory]);

  useEffect(() => {
    localStorage.setItem('ninjaSettings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('ninjaProgress', JSON.stringify(completedLessons));
  }, [completedLessons]);

  useEffect(() => {
    localStorage.setItem('ninjaInfiniteResults', JSON.stringify(infiniteResults));
  }, [infiniteResults]);

  const startGame = () => {
    setScreen('game');
  };

  // Create AudioContext once
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      const audioCtx = getAudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
      osc.start(audioCtx.currentTime + startTime);
      osc.stop(audioCtx.currentTime + startTime + duration);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  const handleGameComplete = (gameStats: GameStats) => {
    setStats(gameStats);
    setScreen('evaluation');
    setLastCompletedLessonId(selectedLesson.id.toString());

    if (selectedLesson.mode === 'infinite') {
      const originalLessonId = selectedLesson.id.toString().startsWith('infinite-')
        ? selectedLesson.id.toString().slice('infinite-'.length)
        : selectedLesson.id.toString();

      setInfiniteResults(prev => ({
        ...prev,
        [originalLessonId]: {
          ...gameStats,
          playedAt: new Date().toISOString(),
          mode: selectedLesson.infiniteMode || 'standard',
          difficulty: selectedLesson.infiniteDifficulty || 'medium',
          progressive: selectedLesson.infiniteProgressive ?? true,
          durationSec: selectedLesson.infiniteDurationSec ?? 120
        }
      }));
    }

    if (selectedLesson.mode !== 'infinite' && !completedLessons.includes(selectedLesson.id.toString())) {
      setCompletedLessons([...completedLessons, selectedLesson.id.toString()]);
    }

    // Trigger sound
    const earnedStars = gameStats.accuracy >= 95 ? 3 : gameStats.accuracy >= 85 ? 2 : gameStats.accuracy >= 70 ? 1 : 0;

    if (earnedStars === 3) {
      // Success arpeggio
      playTone(523.25, 0, 0.1, 'triangle'); // C5
      playTone(659.25, 0.05, 0.1, 'triangle'); // E5
      playTone(783.99, 0.1, 0.1, 'triangle'); // G5
      playTone(1046.50, 0.15, 0.3, 'triangle'); // C6
      
      // Little pop for confetti
      playTone(800, 0, 0.05, 'square');

      // Trigger confetti
      const duration = 1500; // Shorter
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#3b82f6', '#eab308', '#f43f5e', '#a855f7'],
          shapes: ['star', 'circle']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22c55e', '#3b82f6', '#eab308', '#f43f5e', '#a855f7'],
          shapes: ['star', 'circle']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else if (earnedStars > 0) {
      playTone(523.25, 0, 0.1, 'triangle');
      playTone(659.25, 0.05, 0.2, 'triangle');
    } else {
      playTone(300, 0, 0.3, 'sawtooth');
    }
  };

  const resetProgress = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setCompletedLessons([]);
    localStorage.removeItem('ninjaProgress');
    setShowResetConfirm(false);
  };

  const cheatProgress = () => {
    const allIds = categories.flatMap(c => c.subLessons.map(l => l.id.toString()));
    setCompletedLessons(allIds);
  };

  const nextLesson = React.useMemo(() => {
    const currentCat = categories.find(c => c.subLessons.some(l => l.id === selectedLesson.id));
    if (!currentCat) return null;
    const currentIndex = currentCat.subLessons.findIndex(l => l.id === selectedLesson.id);
    if (currentIndex < currentCat.subLessons.length - 1) {
      return currentCat.subLessons[currentIndex + 1];
    }
    // If last in category, maybe next category?
    const catIndex = categories.findIndex(c => c.id === currentCat.id);
    if (catIndex < categories.length - 1) {
      return categories[catIndex + 1].subLessons[0];
    }
    return null;
  }, [selectedLesson]);

  const selectedCategoryLessons = selectedCategory?.subLessons.filter(lesson => lesson.mode !== 'infinite') || [];
  const selectedCategoryInfiniteLessons = selectedCategory?.subLessons.filter(lesson => lesson.mode === 'infinite') || [];
  const formatInfiniteDuration = (durationSec: number | null | undefined) => {
    if (durationSec == null) return 'Infinite';
    if (durationSec < 60) return `${durationSec}s`;
    const minutes = durationSec / 60;
    return Number.isInteger(minutes) ? `${minutes} min` : `${durationSec}s`;
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      setSelectedLesson(nextLesson);
      setSelectedMode(nextLesson.mode || 'standard');
      setScreen('game');
      setStats(null);
      
      // If the next lesson is in a different category, update selectedCategory
      const nextCat = categories.find(c => c.subLessons.some(l => l.id === nextLesson.id));
      if (nextCat) {
        setSelectedCategory(nextCat);
      }
    } else {
      setScreen('menu');
    }
  };

  const handleBackToMenu = () => {
    setScreen('menu');
    setCurrentTab('path');
    
    // Find the category of the last lesson
    const cat = categories.find(c => c.subLessons.some(l => l.id === selectedLesson.id));
    if (cat) {
      setSelectedCategory(cat);
      // Scroll to the category node after a short delay to allow menu to render
      setTimeout(() => {
        const element = document.getElementById(`category-${cat.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleCancel = () => {
    setScreen('menu');
    const cat = categories.find(c => c.subLessons.some(l => l.id === selectedLesson.id));
    if (cat) {
      setSelectedCategory(cat);
    }
  };

  const renderGame = () => {
    const props = {
      lesson: selectedLesson,
      settings: settings,
      onComplete: handleGameComplete,
      onCancel: handleCancel,
      setIsWriting: setIsWriting,
    };
    
    if (selectedMode === 'infinite') {
      if (selectedLesson.infiniteMode === 'shooter') {
        return <GameShooter {...props} />;
      } else {
        return <GameStandard {...props} />;
      }
    }
    
    switch (selectedMode) {
      case 'standard':
      case 'random':
        return <GameStandard {...props} />;
      case 'shooter':
        return <GameShooter {...props} />;
      case 'wordShooter':
        return <GameWordShooter {...props} />;
      case 'challenge':
        return <GameChallenge {...props} />;
    }
  };

  // Helper to check if a category is fully completed
  const isCategoryCompleted = (category: Category) => {
    return category.subLessons.every(l => completedLessons.includes(l.id.toString()));
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-200 transition-colors duration-300 ${settings.darkMode ? 'dark bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      {settings.showTimer && <VerticalTimer isWriting={isWriting} />}
      {/* Header */}
      <header className="flex justify-between items-center p-4 sm:p-6 border-b-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors duration-300">
        <button 
          onClick={() => { setScreen('menu'); setCurrentTab('path'); }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-green-500 rounded-2xl border-b-4 border-green-600 flex items-center justify-center">
            <span className="text-white font-extrabold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-700 dark:text-slate-100 tracking-tight">
            Psaní Ninja
          </h1>
        </button>
        
        {screen === 'menu' && (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setCurrentTab('path')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold transition-all ${
                  currentTab === 'path' ? 'bg-white dark:bg-slate-700 text-blue-500 dark:text-blue-400 shadow-sm border-2 border-slate-200 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-2 border-transparent'
                }`}
              >
                <MapIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Cesta</span>
              </button>
              <button
                onClick={() => setCurrentTab('practice')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold transition-all ${
                  currentTab === 'practice' ? 'bg-white dark:bg-slate-700 text-blue-500 dark:text-blue-400 shadow-sm border-2 border-slate-200 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-2 border-transparent'
                }`}
              >
                <Dumbbell className="w-5 h-5" />
                <span className="hidden sm:inline">Trénink</span>
              </button>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
          </div>
        )}
        
        {screen !== 'menu' && (
          <button 
            onClick={() => setScreen('menu')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 border-b-4 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0 rounded-2xl font-bold transition-all text-slate-500 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Zpět
          </button>
        )}
      </header>

      <main className="p-4 sm:p-6 max-w-4xl mx-auto relative">
        <AnimatePresence mode="wait">
          {screen === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              {showSettings && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-extrabold text-xl text-slate-700 dark:text-slate-200">Nastavení</h3>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">Tmavý režim</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Šetří oči v noci</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={settings.darkMode}
                        onChange={(e) => setSettings({...settings, darkMode: e.target.checked})}
                        className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-500 focus:ring-blue-500/50"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">Zobrazit časomíru</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ukazuje ubíhající čas</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={settings.showTimer}
                        onChange={(e) => setSettings({...settings, showTimer: e.target.checked})}
                        className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-500 focus:ring-blue-500/50"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">Zobrazit chyby</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Počítá chyby během psaní</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={settings.showErrors}
                        onChange={(e) => setSettings({...settings, showErrors: e.target.checked})}
                        className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-500 focus:ring-blue-500/50"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">Přísný mód</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Musíš opravit každou chybu</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={settings.strictMode}
                        onChange={(e) => setSettings({...settings, strictMode: e.target.checked})}
                        className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-500 focus:ring-blue-500/50"
                      />
                    </label>

                    <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                      <div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">Obtížnost střílečky</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Rychlost padajících slov</div>
                      </div>
                      <select
                        value={settings.shooterDifficulty}
                        onChange={(e) => setSettings({...settings, shooterDifficulty: e.target.value as any})}
                        className="p-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="easy">Lehká</option>
                        <option value="medium">Střední</option>
                        <option value="hard">Těžká</option>
                      </select>
                    </div>

                    <div className="pt-4 mt-4 border-t-2 border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                      <button onClick={resetProgress} className="w-full px-4 py-3 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors">
                        Resetovat postup
                      </button>
                      <button onClick={cheatProgress} className="w-full px-4 py-3 bg-purple-100 text-purple-600 font-bold rounded-xl hover:bg-purple-200 transition-colors">
                        Odemknout vše
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showResetConfirm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl max-w-sm w-full">
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Opravdu smazat postup?</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">Tato akce je nevratná. Všechny tvé hvězdičky a odemčené lekce budou ztraceny.</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Zrušit
                      </button>
                      <button 
                        onClick={confirmReset}
                        className="flex-1 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                      >
                        Smazat
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {currentTab === 'path' && (
                  <motion.div 
                    key="path"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center py-8 gap-8"
                  >
                  {/* Keyboard Helper */}
                  <div className="w-full max-w-5xl mx-auto mb-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8 z-10">
                    <h3 className="text-xl font-extrabold text-center mb-4 text-slate-700 dark:text-slate-200">Moje naučená písmenka</h3>
                    <Keyboard activeChar="" showAllColors={true} learnedLetters={learnedLetters} />
                  </div>

                  <div ref={pathContainerRef} className="relative w-full max-w-md mx-auto flex flex-col items-center gap-8 py-4">
                    {/* SVG Path Line */}
                    <svg 
                      className="absolute top-0 bottom-0 w-full h-full z-0 pointer-events-none" 
                      viewBox={`0 0 ${containerWidth || 400} ${categories.length * 182}`}
                      preserveAspectRatio="none"
                    >
                      <path 
                        d={`M ${(containerWidth || 400) / 2} 64 ${categories.map((_, i) => {
                          const offset = Math.sin(i * 0.7) * 80;
                          const nextOffset = Math.sin((i + 1) * 0.7) * 80;
                          const y = i * 182 + 64; // 150px height + 32px gap + 16px padding
                          const nextY = (i + 1) * 182 + 64;
                          if (i === categories.length - 1) return '';
                          return `C ${(containerWidth || 400) / 2 + offset} ${y + 80}, ${(containerWidth || 400) / 2 + nextOffset} ${nextY - 80}, ${(containerWidth || 400) / 2 + nextOffset} ${nextY}`;
                        }).join(' ')}`}
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="24" 
                        strokeLinecap="round"
                        className="text-slate-200 dark:text-slate-700"
                      />
                    </svg>

                    {categories.map((category, i) => {
                      const offset = Math.sin(i * 0.7) * 80;
                      const isCompleted = isCategoryCompleted(category);
                      const isUnlocked = i === 0 || isCategoryCompleted(categories[i - 1]);
                      
                      let colorClass = 'bg-slate-300 border-slate-400 text-slate-500';
                      if (isUnlocked) {
                        colorClass = isCompleted 
                          ? 'bg-yellow-400 border-yellow-500 hover:bg-yellow-300 text-white' 
                          : 'bg-blue-500 border-blue-600 hover:bg-blue-400 text-white';
                      }
                      
                      return (
                        <div key={category.id} id={`category-${category.id}`} className="relative w-full flex justify-center h-[150px]">
                          <div 
                            className="flex flex-col items-center relative z-10"
                            style={{ transform: `translateX(${offset}px)` }}
                          >
                            <button
                              disabled={!isUnlocked}
                              onClick={() => setSelectedCategory(category)}
                              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${colorClass} border-b-[8px] font-extrabold text-2xl sm:text-3xl flex items-center justify-center ${isUnlocked ? 'hover:translate-y-1 hover:border-b-[4px] active:translate-y-2 active:border-b-0 cursor-pointer' : 'opacity-80 cursor-not-allowed'} transition-all shadow-sm`}
                            >
                              {isCompleted ? <Star className="w-10 h-10 fill-white" /> : <Star className="w-10 h-10 fill-white/20" />}
                            </button>
                            <div className="mt-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-b-4 font-bold text-slate-600 dark:text-slate-300 text-sm sm:text-base whitespace-nowrap shadow-sm">
                              {category.title}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {currentTab === 'practice' && (
                <motion.div 
                  key="practice"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                >
                  {/* Left Column: Lessons */}
                  <div className="space-y-6">
                    <h2 className="text-2xl font-extrabold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Target className="w-6 h-6 text-blue-500" />
                      Vyber si lekci
                    </h2>
                    <div className="flex flex-col gap-6 max-h-[600px] overflow-y-auto pr-2 pb-4">
                      {categories.map(category => (
                        <div key={category.id} className="space-y-3">
                          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50 dark:bg-slate-900 py-2 z-10">
                            {category.title}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {category.subLessons.map(lesson => (
                              <button
                                key={lesson.id}
                                onClick={() => {
                                  setSelectedLesson(lesson);
                                  setSelectedMode(lesson.mode || 'standard');
                                }}
                                className={`p-4 rounded-2xl border-2 border-b-4 text-left transition-all ${
                                  selectedLesson.id === lesson.id 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <div className="font-extrabold text-sm dark:text-slate-200">{lesson.title}</div>
                                  {completedLessons.includes(lesson.id.toString()) && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Modes */}
                  <div className="space-y-6">
                    <h2 className="text-2xl font-extrabold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Play className="w-6 h-6 text-green-500" />
                      Herní mód
                    </h2>
                    
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={() => setSelectedMode('standard')}
                        className={`p-5 rounded-3xl border-2 border-b-4 flex items-center gap-4 transition-all ${
                          selectedMode === 'standard' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                        }`}
                      >
                        <div className={`p-4 rounded-2xl ${selectedMode === 'standard' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <Target className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-xl text-slate-700 dark:text-slate-200">Klasika</div>
                          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Trénuj přesnost a rychlost</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedMode('shooter')}
                        className={`p-5 rounded-3xl border-2 border-b-4 flex items-center gap-4 transition-all ${
                          selectedMode === 'shooter' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                        }`}
                      >
                        <div className={`p-4 rounded-2xl ${selectedMode === 'shooter' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <Target className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-xl text-slate-700 dark:text-slate-200">Střílečka</div>
                          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Sestřel padající písmena</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedMode('wordShooter')}
                        className={`p-5 rounded-3xl border-2 border-b-4 flex items-center gap-4 transition-all ${
                          selectedMode === 'wordShooter' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                        }`}
                      >
                        <div className={`p-4 rounded-2xl ${selectedMode === 'wordShooter' ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <Target className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-xl text-slate-700 dark:text-slate-200">Word Shooter</div>
                          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Střílej slova</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedMode('infinite')}
                        className={`p-5 rounded-3xl border-2 border-b-4 flex items-center gap-4 transition-all ${
                          selectedMode === 'infinite' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                        }`}
                      >
                        <div className={`p-4 rounded-2xl ${selectedMode === 'infinite' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <Target className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-xl text-slate-700 dark:text-slate-200">Infinite</div>
                          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Neomezená lekce (zvyšující se obtížnost)</div>
                        </div>
                      </button>
                    </div>

                    <div className="mt-4 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Obtížnost (pouze infinite)</div>
                      <div className="flex items-center gap-2">
                        {(['easy','medium','hard'] as const).map(level => (
                          <button
                            key={level}
                            onClick={() => setInfiniteDifficulty(level)}
                            className={`flex-1 py-2 rounded-lg font-bold transition ${infiniteDifficulty === level ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={startGame}
                      className="w-full mt-4 py-5 bg-green-500 text-white rounded-3xl font-extrabold text-2xl border-b-[6px] border-green-600 hover:bg-green-400 hover:translate-y-[2px] hover:border-b-[4px] active:translate-y-[6px] active:border-b-0 transition-all"
                    >
                      START!
                    </button>
                  </div>
                </motion.div>
              )}

              {currentTab === 'help' && (
                <motion.div 
                  key="help"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl mx-auto space-y-8"
                >
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8">
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
                      <HelpCircle className="w-8 h-8 text-blue-500" />
                      Jak psát všemi deseti
                    </h2>
                    
                    <div className="space-y-6 text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                      <section>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Základní postavení rukou</h3>
                        <p>
                          Položte ruce na klávesnici tak, aby ukazováčky ležely na klávesách <strong>F</strong> a <strong>J</strong>. 
                          Tyto klávesy mají na sobě malý výstupek, díky kterému je najdete i poslepu. 
                          Ostatní prsty položte na vedlejší klávesy v prostřední řadě (A, S, D, F a J, K, L, Ů). 
                          Palce nechte volně nad mezerníkem.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Pohyb prstů</h3>
                        <p>
                          Každý prst má na starosti určitou skupinu kláves. Po stisku klávesy se prst vždy vrací do základního postavení. 
                          Snažte se pohybovat pouze prsty, ne celou rukou.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Dívejte se na obrazovku</h3>
                        <p>
                          Nejdůležitější pravidlo: <strong>Nedívejte se na klávesnici!</strong> 
                          I když to ze začátku půjde pomalu a budete dělat chyby, je klíčové naučit se polohu kláves po hmatu. 
                          Dívejte se pouze na obrazovku.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Přesnost před rychlostí</h3>
                        <p>
                          Ze začátku se soustřeďte na to, abyste psali bez chyb. Rychlost přijde sama s tréninkem. 
                          Pokud děláte hodně chyb, zpomalte.
                        </p>
                      </section>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          )}

          {screen === 'game' && (
            <motion.div 
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-4 sm:py-8"
            >
              {renderGame()}
            </motion.div>
          )}

          {screen === 'evaluation' && stats && (
            <motion.div 
              key="evaluation"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mt-12 text-center space-y-8 bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8"
              onAnimationStart={() => {
                // Play star sounds timed with their animations
                const earnedStars = stats.accuracy >= 95 ? 3 : stats.accuracy >= 85 ? 2 : stats.accuracy >= 70 ? 1 : 0;
                for (let i = 0; i < earnedStars; i++) {
                  setTimeout(() => {
                    playTone(600 + i * 200, 0, 0.1, 'sine');
                  }, (i * 0.2 + 0.5) * 1000);
                }
              }}
            >
              <div className="flex justify-center gap-4 mb-8">
                {[...Array(3)].map((_, i) => {
                  const isEarned = i < (stats.accuracy >= 95 ? 3 : stats.accuracy >= 85 ? 2 : stats.accuracy >= 70 ? 1 : 0);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                        delay: i * 0.2 + 0.5 
                      }}
                    >
                      <Star 
                        className={`w-16 h-16 ${isEarned ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-slate-200 dark:text-slate-700'}`} 
                      />
                    </motion.div>
                  );
                })}
              </div>
              
              <motion.h2 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
                className="text-4xl font-extrabold text-slate-800 dark:text-slate-100"
              >
                {(() => {
                  if (stats.accuracy >= 95) {
                    return perfectMessages[Math.floor(Math.random() * perfectMessages.length)];
                  } else if (stats.accuracy >= 85) {
                    return goodMessages[Math.floor(Math.random() * goodMessages.length)];
                  } else {
                    return tryAgainMessages[Math.floor(Math.random() * tryAgainMessages.length)];
                  }
                })()}
              </motion.h2>
              <p className="text-xl font-medium text-slate-500 dark:text-slate-400">Dokončil jsi lekci <strong className="text-blue-500 dark:text-blue-400">{selectedLesson.title}</strong></p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                  className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border-2 border-blue-200 dark:border-blue-800/50 border-b-4"
                >
                  <div className="text-blue-600 dark:text-blue-400 font-bold mb-2 uppercase tracking-wider text-sm">Rychlost</div>
                  <div className="text-4xl font-extrabold text-blue-500">{stats.wpm} <span className="text-lg text-blue-400">WPM</span></div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border-2 border-green-200 dark:border-green-800/50 border-b-4"
                >
                  <div className="text-green-600 dark:text-green-400 font-bold mb-2 uppercase tracking-wider text-sm">Přesnost</div>
                  <div className="text-4xl font-extrabold text-green-500">{stats.accuracy}%</div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 }}
                  className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border-2 border-red-200 dark:border-red-800/50 border-b-4"
                >
                  <div className="text-red-600 dark:text-red-400 font-bold mb-2 uppercase tracking-wider text-sm">Chyby</div>
                  <div className="text-4xl font-extrabold text-red-500">{stats.errors}</div>
                </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="flex flex-col sm:flex-row justify-center gap-4 mt-12"
              >
                <button
                  onClick={handleBackToMenu}
                  className="px-8 py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 border-b-4 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-extrabold text-lg transition-all hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                >
                  Zpět do menu
                </button>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 border-b-4 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-extrabold text-lg transition-all hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-6 h-6" />
                  Znovu
                </button>
                {nextLesson && (
                  <button
                    onClick={handleNextLesson}
                    className="px-8 py-4 bg-blue-500 border-b-4 border-blue-600 hover:bg-blue-400 text-white rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-2 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                  >
                    DALŠÍ
                    <ArrowRight className="w-6 h-6" />
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Category Modal/Sidebar */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setSelectedCategory(null)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b-2 border-slate-200 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{selectedCategory.title}</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {selectedCategoryLessons.filter(l => completedLessons.includes(l.id.toString())).length} / {selectedCategoryLessons.length}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-medium">
                  {selectedCategory.description}
                </p>
                
                <div className="space-y-3">
                  {selectedCategoryLessons.map((lesson, index) => {
                    const isCompleted = completedLessons.includes(lesson.id.toString());

                    return (
                      <div key={lesson.id} className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedLesson(lesson);
                            setSelectedCategory(null);
                            setSelectedMode(lesson.mode || 'standard');
                            startGame();
                          }}
                          className={`w-full p-4 rounded-2xl border-2 border-b-4 text-left transition-all flex items-center justify-between group ${
                            isCompleted 
                              ? 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40' 
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-bold mb-1 uppercase tracking-wider ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                              Cviceni {index + 1}
                            </div>
                            <div className={`font-extrabold text-lg ${isCompleted ? 'text-green-800 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                              {lesson.title}
                            </div>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                                {lesson.mode === 'random' ? 'Nahodne' : lesson.mode === 'challenge' ? 'Vyzva' : lesson.mode === 'shooter' || lesson.mode === 'wordShooter' ? 'Strilecka' : 'Klasika'}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                                {lesson.mode === 'random' ? '3 strany' : lesson.mode === 'shooter' || lesson.mode === 'wordShooter' ? 'Nekonecno' : '1 strana'}
                              </span>
                            </div>
                          </div>
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-all" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {selectedCategoryInfiniteLessons.length > 0 && (
                  <div className="mt-8 pt-6 border-t-2 border-dotted border-slate-300 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      <TrendingUp className="w-4 h-4" />
                      Nekonečný režim
                    </div>

                    {selectedCategoryInfiniteLessons.map(lesson => {
                      const isExpanded = expandedLessonId === lesson.id.toString();
                      const infiniteSettings = lessonInfiniteSettings[lesson.id] || {
                        mode: (lesson.infiniteMode as 'standard' | 'shooter') || 'standard',
                        difficulty: (lesson.infiniteDifficulty as 'easy' | 'medium' | 'hard') || 'medium',
                        progressive: lesson.infiniteProgressive ?? true,
                        durationSec: lesson.infiniteDurationSec ?? 120
                      };
                      const lastResult = infiniteResults[lesson.id];

                      return (
                        <div key={lesson.id} className="space-y-2">
                          <button
                            onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id.toString())}
                            className="w-full p-4 rounded-2xl border-2 border-b-4 text-left transition-all flex items-center justify-between group border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                          >
                            <div>
                              <div className="text-xs font-bold mb-1 uppercase tracking-wider text-blue-500 dark:text-blue-300">
                                Nekonecny trening
                              </div>
                              <div className="font-extrabold text-lg text-slate-700 dark:text-slate-100">
                                {lesson.title}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-white/80 dark:bg-slate-800 rounded text-slate-500">
                                  {formatInfiniteDuration(infiniteSettings.durationSec)}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-white/80 dark:bg-slate-800 rounded text-slate-500">
                                  Ulozeny vysledek
                                </span>
                              </div>
                            </div>
                            <ArrowRight className={`w-6 h-6 text-blue-300 group-hover:text-blue-500 transition-all ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>

                          

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4"
                            >
                              <div className="text-sm font-bold text-slate-600 dark:text-slate-300">Naposledy</div>
                              {lastResult && (
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
                                    <div className="text-[11px] uppercase font-bold tracking-wide text-slate-400">WPM</div>
                                    <div className="text-xl font-extrabold text-blue-500">{lastResult.wpm}</div>
                                  </div>
                                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
                                    <div className="text-[11px] uppercase font-bold tracking-wide text-slate-400">Presnost</div>
                                    <div className="text-xl font-extrabold text-green-500">{lastResult.accuracy}%</div>
                                  </div>
                                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
                                    <div className="text-[11px] uppercase font-bold tracking-wide text-slate-400">Chyby</div>
                                    <div className="text-xl font-extrabold text-amber-500">{lastResult.errors}</div>
                                  </div>
                                </div>
                              )}
                              <br></br>
                              <div className="space-y-4">
                                <div>
                                  <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Mod</div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [lesson.id]: { ...infiniteSettings, mode: 'standard' } }))}
                                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all border-2 ${
                                        infiniteSettings.mode === 'standard'
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                      }`}
                                    >
                                      <KeyboardIcon className="w-5 h-5" />
                                      Psaní
                                    </button>
                                    <button
                                      onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [lesson.id]: { ...infiniteSettings, mode: 'shooter' } }))}
                                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all border-2 ${
                                        infiniteSettings.mode === 'shooter'
                                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                      }`}
                                    >
                                      <Target className="w-5 h-5" />
                                      Střílení
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Obtiznost</div>
                                  <div className="flex gap-2">
                                    {(['easy', 'medium', 'hard'] as const).map(level => (
                                      <button
                                        key={level}
                                        onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [lesson.id]: { ...infiniteSettings, difficulty: level } }))}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 ${
                                          infiniteSettings.difficulty === level
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                        }`}
                                      >
                                        {level === 'easy' ? 'Lehká' : level === 'medium' ? 'Střední' : 'Těžká'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold text-slate-600 dark:text-slate-300">Zvýšující se obtížnost</div>
                                  <button
                                    onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [lesson.id]: { ...infiniteSettings, progressive: !infiniteSettings.progressive } }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                      infiniteSettings.progressive ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        infiniteSettings.progressive ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-bold text-slate-600 dark:text-slate-300">Délka</div>
                                    <button
                                      onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [lesson.id]: { ...infiniteSettings, durationSec: infiniteSettings.durationSec === null ? 120 : null } }))}
                                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                                        infiniteSettings.durationSec === null
                                          ? 'bg-blue-500 text-white'
                                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {infiniteSettings.durationSec === null ? 'Nekonečná' : 'Přepnout'}
                                    </button>
                                  </div>

                                  {infiniteSettings.durationSec !== null && (
                                    <div className="space-y-2">
                                      <input
                                        type="range"
                                        min={30}
                                        max={300}
                                        step={30}
                                        value={infiniteSettings.durationSec}
                                        onChange={e => setLessonInfiniteSettings(prev => ({ ...prev, [lesson.id]: { ...infiniteSettings, durationSec: Number(e.target.value) } }))}
                                        className="w-full accent-blue-500"
                                      />
                                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {formatInfiniteDuration(infiniteSettings.durationSec)}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2">
                                  <button
                                    onClick={() => {
                                      const categoryLetters = selectedCategory.subLessons
                                        .flatMap(l => (l.newLetters || l.letters || '').split(''))
                                        .filter((l, i, arr) => arr.indexOf(l) === i && l.trim())
                                        .join('');

                                      const infiniteLesson: SubLesson = {
                                        ...lesson,
                                        id: `infinite-${lesson.id}`,
                                        title: `${lesson.title} (Infinite)`,
                                        mode: 'infinite',
                                        letters: categoryLetters,
                                        infiniteMode: infiniteSettings.mode,
                                        infiniteDifficulty: infiniteSettings.difficulty,
                                        infiniteProgressive: infiniteSettings.progressive,
                                        infiniteDurationSec: infiniteSettings.durationSec
                                      };

                                      setSelectedLesson(infiniteLesson);
                                      setSelectedCategory(null);
                                      setSelectedMode('infinite');
                                      setInfiniteDifficulty(infiniteSettings.difficulty);
                                      setExpandedLessonId(null);
                                      startGame();
                                    }}
                                    className="w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                                  >
                                    Spustit nekonečný režim
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

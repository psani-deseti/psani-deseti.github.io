import React, { useState, useEffect } from 'react';
import { GameMode, Settings, GameStats, Category, SubLesson, PracticeBundle, BundleLesson } from './types';
import { categories } from './data/categories';
import { perfectMessages, goodMessages, tryAgainMessages } from './data/messages';
import { GameStandard } from './components/GameStandard';
import { GameShooter } from './components/GameShooter';
import { GameWordShooter } from './components/GameWordShooter';
import { GameChallenge } from './components/GameChallenge';
import { PracticeHub, PracticeSettings } from './components/PracticeHub';
import { Keyboard } from './components/Keyboard';
import { VerticalTimer } from './components/VerticalTimer';
import { Settings as SettingsIcon, Play, Target, Clock, Trophy, ArrowLeft, RotateCcw, Map as MapIcon, Dumbbell, Star, X, CheckCircle2, HelpCircle, ArrowRight, Keyboard as KeyboardIcon, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

type Screen = 'menu' | 'game' | 'evaluation' | 'bundle-summary';
type Tab = 'path' | 'practice';

type LessonStats = {
  [lessonId: string]: {
    stars: number;
    attempts: number;
    bestWpm: number;
  };
};

type PracticeProgressSummary = {
  attempts: number;
  bestWpm: number;
  bestAccuracy: number;
  bestErrors: number;
  lastPlayedAt: string;
  lastResult: GameStats;
};

const EMPTY_LESSON_STATS = {
  stars: 0,
  attempts: 0,
  bestWpm: 0,
};

const PRACTICE_LESSON_PREFIX = 'practice-custom-';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${seconds} sekund`;
  } else if (remainingSeconds === 0) {
    return minutes === 1 ? '1 minuta' : `${minutes} minuty`;
  } else {
    const minuteText = minutes === 1 ? '1 minuta' : `${minutes} minuty`;
    const secondText = remainingSeconds === 1 ? '1 sekunda' : `${remainingSeconds} sekund`;
    return `${minuteText} a ${secondText}`;
  }
};

const createPracticeKey = (settings: PracticeSettings) => {
  const normalizedLetters = normalizePracticeLetters(settings.letters);
  return `${settings.mode}__${settings.lengthType}__${settings.length}__${normalizedLetters.join('')}`;
};

const createPracticeLesson = (settings: PracticeSettings): { lesson: SubLesson; mode: GameMode } => {
  const letters = normalizePracticeLetters(settings.letters).join('');
  const modeLabel = settings.mode === 'classic' ? 'Classic writing' : 'Shooting letters';
  const lengthLabel = settings.lengthType === 'time' ? `${settings.length} sec` : `${settings.length} chars`;

  if (settings.lengthType === 'time') {
    return {
      mode: 'infinite',
      lesson: {
        id: `${PRACTICE_LESSON_PREFIX}${createPracticeKey(settings)}`,
        title: `${modeLabel} · ${letters.toUpperCase()}`,
        mode: 'infinite',
        letters,
        infiniteMode: settings.mode === 'classic' ? 'standard' : 'shooter',
        infiniteDifficulty: 'medium',
        infiniteProgressive: false,
        infiniteDurationSec: settings.length,
      },
    };
  }

  if (settings.mode === 'classic') {
    return {
      mode: 'random',
      lesson: {
        id: `${PRACTICE_LESSON_PREFIX}${createPracticeKey(settings)}`,
        title: `${modeLabel} · ${letters.toUpperCase()}`,
        mode: 'random',
        letters,
        pageCount: 1,
        pageLength: settings.length,
        max_comb: 2,
      },
    };
  }

  return {
    mode: 'shooter',
    lesson: {
      id: `${PRACTICE_LESSON_PREFIX}${createPracticeKey(settings)}`,
      title: `${modeLabel} · ${letters.toUpperCase()}`,
      mode: 'shooter',
      letters,
      targetScore: settings.length,
      text: letters,
      examples: [lengthLabel],
    },
  };
};

const generatePracticeBundle = (letters: string[], duration: number): PracticeBundle => {
  const bundleId = `bundle-${Date.now()}`;
  const bundleLessons: BundleLesson[] = [];
  const availableLessons = categories.flatMap(cat => cat.subLessons.filter(lesson => 
    lesson.newLetters && lesson.newLetters.split('').some(l => letters.includes(l.toLowerCase()))
  ));

  // Determine number of exercises based on duration
  const numExercises = duration <= 60 ? 3 : duration <= 120 ? 4 : duration <= 180 ? 5 : 6;

  // Add shooter lesson
  bundleLessons.push({
    id: `${bundleId}-shooter`,
    title: 'Střelba písmen',
    lesson: {
      id: `${bundleId}-shooter-lesson`,
      title: 'Střelba písmen',
      mode: 'shooter',
      letters: letters.join(''),
      targetScore: Math.min(100, duration), // Rough estimate
      text: letters.join(''),
      examples: [`${Math.min(100, duration)} bodů`],
    },
    mode: 'shooter',
  });

  // Add time-based typing lesson
  bundleLessons.push({
    id: `${bundleId}-time-typing`,
    title: 'Psaní na čas',
    lesson: {
      id: `${bundleId}-time-typing-lesson`,
      title: 'Psaní na čas',
      mode: 'infinite',
      letters: letters.join(''),
      infiniteMode: 'standard',
      infiniteDifficulty: 'medium',
      infiniteProgressive: false,
      infiniteDurationSec: Math.min(duration, 120), // Cap at 2 minutes
    },
    mode: 'infinite',
  });

  // Add random lessons from the tree if available
  const lessonsToAdd = Math.min(numExercises - 2, availableLessons.length);
  for (let i = 0; i < lessonsToAdd; i++) {
    const randomLesson = availableLessons[Math.floor(Math.random() * availableLessons.length)];
    bundleLessons.push({
      id: `${bundleId}-tree-lesson-${i}`,
      title: randomLesson.title,
      lesson: randomLesson,
      mode: randomLesson.mode || 'standard',
    });
  }

  // Fill remaining slots with additional exercises
  const remainingSlots = numExercises - bundleLessons.length;
  for (let i = 0; i < remainingSlots; i++) {
    if (Math.random() > 0.5) {
      bundleLessons.push({
        id: `${bundleId}-bonus-shooter-${i}`,
        title: 'Bonus střelba',
        lesson: {
          id: `${bundleId}-bonus-shooter-lesson-${i}`,
          title: 'Bonus střelba',
          mode: 'shooter',
          letters: letters.join(''),
          targetScore: Math.min(50, duration / 2),
          text: letters.join(''),
          examples: [`${Math.min(50, duration / 2)} bodů`],
        },
        mode: 'shooter',
      });
    } else {
      bundleLessons.push({
        id: `${bundleId}-bonus-typing-${i}`,
        title: 'Bonus psaní',
        lesson: {
          id: `${bundleId}-bonus-typing-lesson-${i}`,
          title: 'Bonus psaní',
          mode: 'random',
          letters: letters.join(''),
          pageCount: 1,
          pageLength: Math.min(200, duration * 2),
          max_comb: 2,
        },
        mode: 'random',
      });
    }
  }

  return {
    id: bundleId,
    createdAt: new Date().toISOString(),
    letters,
    duration,
    lessons: bundleLessons,
    completed: false,
  };
};

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
  const [isWriting, setIsWriting] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [lessonInfiniteSettings, setLessonInfiniteSettings] = useState<Record<string, { mode: 'standard' | 'shooter'; difficulty: 'easy' | 'medium' | 'hard'; progressive: boolean; durationSec: number | null }>>({});
  const [infiniteResults, setInfiniteResults] = useState<Record<string, InfiniteRunSummary>>(() => {
    const saved = localStorage.getItem('ninjaInfiniteResults');
    return saved ? JSON.parse(saved) : {};
  });
  const [activePracticeSettings, setActivePracticeSettings] = useState<PracticeSettings | null>(null);
  const [practiceProgress, setPracticeProgress] = useState<Record<string, PracticeProgressSummary>>(() => {
    const saved = localStorage.getItem('ninjaPracticeProgress');
    return saved ? JSON.parse(saved) : {};
  });
  const [dailyPracticeSettings, setDailyPracticeSettings] = useState<{ letters: string[]; duration: number }>(() => {
    const saved = localStorage.getItem('ninjaDailyPracticeSettings');
    return saved ? JSON.parse(saved) : { letters: [], duration: 60 };
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

  const [lessonStats, setLessonStats] = useState<LessonStats>(() => {
    const saved = localStorage.getItem('ninjaLessonStats');
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, Partial<{ stars: number; attempts: number; bestWpm: number }>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([lessonId, value]) => [
        lessonId,
        {
          stars: value.stars ?? 0,
          attempts: value.attempts ?? 0,
          bestWpm: value.bestWpm ?? 0,
        },
      ])
    );
  });

  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    const saved = localStorage.getItem('ninjaProgress');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const pathContainerRef = React.useRef<HTMLDivElement>(null);

  // Bundle states
  const [currentBundle, setCurrentBundle] = useState<PracticeBundle | null>(null);
  const [currentBundleIndex, setCurrentBundleIndex] = useState(0);
  const [bundleHistory, setBundleHistory] = useState<PracticeBundle[]>(() => {
    const saved = localStorage.getItem('ninjaBundleHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [previewBundle, setPreviewBundle] = useState<PracticeBundle | null>(null);

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
    if (learnedLetters.size > 0 && dailyPracticeSettings.letters.length === 0) {
      setDailyPracticeSettings(prev => ({ ...prev, letters: Array.from(learnedLetters) }));
    }
  }, [learnedLetters, dailyPracticeSettings.letters.length]);

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
    localStorage.setItem('ninjaDailyPracticeSettings', JSON.stringify(dailyPracticeSettings));
  }, [dailyPracticeSettings]);

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

  useEffect(() => {
    localStorage.setItem('ninjaPracticeProgress', JSON.stringify(practiceProgress));
  }, [practiceProgress]);

  useEffect(() => {
    localStorage.setItem('ninjaLessonStats', JSON.stringify(lessonStats));
  }, [lessonStats]);

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
    const isCustomPractice = selectedLesson.id.toString().startsWith(PRACTICE_LESSON_PREFIX);

    if (isCustomPractice && activePracticeSettings) {
      const practiceKey = createPracticeKey(activePracticeSettings);
      setPracticeProgress(prev => {
        const previous = prev[practiceKey];
        return {
          ...prev,
          [practiceKey]: {
            attempts: (previous?.attempts ?? 0) + 1,
            bestWpm: Math.max(previous?.bestWpm ?? 0, gameStats.wpm),
            bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, gameStats.accuracy),
            bestErrors: Math.min(previous?.bestErrors ?? gameStats.errors, gameStats.errors),
            lastPlayedAt: new Date().toISOString(),
            lastResult: gameStats,
          },
        };
      });
    }

    if (!isCustomPractice && selectedLesson.mode === 'infinite') {
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

    const earnedStars = gameStats.accuracy >= 95 ? 3 : gameStats.accuracy >= 85 ? 2 : gameStats.accuracy >= 70 ? 1 : 0;
    if (!isCustomPractice && selectedLesson.mode !== 'infinite') {
      const lessonId = selectedLesson.id.toString();
      setLessonStats(prev => {
        const newStats = { ...prev };
        const currentStats = newStats[lessonId] || EMPTY_LESSON_STATS;
        newStats[lessonId] = {
          stars: Math.max(currentStats.stars, earnedStars),
          attempts: currentStats.attempts + 1,
          bestWpm: Math.max(currentStats.bestWpm, gameStats.wpm),
        };
        return newStats;
      });
      if (!completedLessons.includes(lessonId)) {
        setCompletedLessons([...completedLessons, lessonId]);
      }
    }

    // Trigger sound

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
    setLessonStats({});
    localStorage.removeItem('ninjaProgress');
    localStorage.removeItem('ninjaLessonStats');
    setShowResetConfirm(false);
  };

  const cheatProgress = () => {
    const allIds = categories.flatMap(c => c.subLessons.map(l => l.id.toString()));
    setCompletedLessons(allIds);
    const newLessonStats: LessonStats = {};
    allIds.forEach(id => {
      if (!id.includes('infinite')) {
        newLessonStats[id] = { stars: 3, attempts: 1, bestWpm: 0 };
      }
    });
    setLessonStats(newLessonStats);
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
  const selectedLessonBaseId = selectedLesson.id.toString().startsWith('infinite-') ? selectedLesson.id.toString().slice('infinite-'.length) : selectedLesson.id.toString();
  const selectedLessonCategory = categories.find(category => category.subLessons.some(lesson => lesson.id.toString() === selectedLessonBaseId));
  const selectedPracticeInfiniteSettings = lessonInfiniteSettings[selectedLessonBaseId] || {
    mode: (selectedLesson.infiniteMode as 'standard' | 'shooter') || 'standard',
    difficulty: (selectedLesson.infiniteDifficulty as 'easy' | 'medium' | 'hard') || 'medium',
    progressive: selectedLesson.infiniteProgressive ?? true,
    durationSec: selectedLesson.infiniteDurationSec ?? 120
  };
  const practiceLessonCount = categories.reduce((sum, category) => sum + category.subLessons.filter(lesson => lesson.mode !== 'infinite').length, 0);
  const completedPracticeLessonCount = categories.reduce((sum, category) => sum + category.subLessons.filter(lesson => lesson.mode !== 'infinite' && completedLessons.includes(lesson.id.toString())).length, 0);
  const isCustomPracticeLesson = selectedLesson.id.toString().startsWith(PRACTICE_LESSON_PREFIX);
  const activePracticeKey = activePracticeSettings ? createPracticeKey(activePracticeSettings) : null;
  const activePracticeSummary = activePracticeKey ? practiceProgress[activePracticeKey] : null;
  const formatInfiniteDuration = (durationSec: number | null | undefined) => {
    if (durationSec == null) return 'Infinite';
    if (durationSec < 60) return `${durationSec}s`;
    const minutes = durationSec / 60;
    return Number.isInteger(minutes) ? `${minutes} min` : `${durationSec}s`;
  };
  const getLessonStats = (lessonId: string) =>
    lessonStats[lessonId] || (completedLessons.includes(lessonId) ? { ...EMPTY_LESSON_STATS, attempts: 1 } : EMPTY_LESSON_STATS);
  const formatAttemptLabel = (attempts: number) => `pokus${attempts === 1 ? '' : attempts >= 2 && attempts <= 4 ? 'y' : 'u'}`;
  const startCustomPractice = (practiceSettings: PracticeSettings) => {
    const practiceSession = createPracticeLesson(practiceSettings);
    setActivePracticeSettings(practiceSettings);
    setSelectedLesson(practiceSession.lesson);
    setSelectedMode(practiceSession.mode);
    setSelectedCategory(null);
    setStats(null);
    setScreen('game');
  };

  const startDailyPractice = () => {
    if (dailyPracticeSettings.letters.length === 0) return;
    
    const bundle = generatePracticeBundle(dailyPracticeSettings.letters, dailyPracticeSettings.duration);
    setPreviewBundle(bundle);
  };

  const startBundlePractice = () => {
    if (!previewBundle) return;
    
    setCurrentBundle(previewBundle);
    setCurrentBundleIndex(0);
    setPreviewBundle(null);
    
    // Start first lesson
    const firstLesson = previewBundle.lessons[0];
    setSelectedLesson(firstLesson.lesson);
    setSelectedMode(firstLesson.mode);
    setSelectedCategory(null);
    setStats(null);
    setScreen('game');
  };
  const startPracticeGame = () => {
    if (selectedMode === 'infinite') {
      const categoryLetters = (selectedLessonCategory?.subLessons || [])
        .flatMap(l => (l.newLetters || l.letters || '').split(''))
        .filter((l, i, arr) => arr.indexOf(l) === i && l.trim())
        .join('');

      const infiniteLesson: SubLesson = {
        ...selectedLesson,
        id: `infinite-${selectedLesson.id}`,
        title: `${selectedLesson.title} (Infinite)`,
        mode: 'infinite',
        letters: categoryLetters || selectedLesson.letters,
        infiniteMode: selectedPracticeInfiniteSettings.mode,
        infiniteDifficulty: selectedPracticeInfiniteSettings.difficulty,
        infiniteProgressive: selectedPracticeInfiniteSettings.progressive,
        infiniteDurationSec: selectedPracticeInfiniteSettings.durationSec
      };

      setSelectedLesson(infiniteLesson);
      setScreen('game');
      return;
    }

    setScreen('game');
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      setActivePracticeSettings(null);
      setSelectedLesson(nextLesson);
      setSelectedMode(nextLesson.mode || 'standard');
      setSelectedCategory(null);
      setScreen('game');
      setStats(null);
    } else {
      setScreen('menu');
    }
  };

  const handleBundleNextLesson = () => {
    if (!currentBundle || !stats) return;

    // Update current lesson with stats
    const updatedBundle = { ...currentBundle };
    updatedBundle.lessons[currentBundleIndex].completed = true;
    updatedBundle.lessons[currentBundleIndex].stats = stats;
    setCurrentBundle(updatedBundle);

    const nextIndex = currentBundleIndex + 1;
    if (nextIndex < currentBundle.lessons.length) {
      // Start next lesson
      setCurrentBundleIndex(nextIndex);
      const nextLesson = currentBundle.lessons[nextIndex];
      setSelectedLesson(nextLesson.lesson);
      setSelectedMode(nextLesson.mode);
      setStats(null);
      setScreen('game');
    } else {
      // Bundle completed
      finishBundle(updatedBundle);
    }
  };

  const finishBundle = (bundle: PracticeBundle) => {
    const completedBundle = {
      ...bundle,
      completed: true,
      overallStats: {
        totalTime: bundle.lessons.reduce((sum, lesson) => sum + (lesson.stats?.timeMs || 0), 0),
        averageWpm: bundle.lessons.reduce((sum, lesson) => sum + (lesson.stats?.wpm || 0), 0) / bundle.lessons.length,
        averageAccuracy: bundle.lessons.reduce((sum, lesson) => sum + (lesson.stats?.accuracy || 0), 0) / bundle.lessons.length,
        totalErrors: bundle.lessons.reduce((sum, lesson) => sum + (lesson.stats?.errors || 0), 0),
      }
    };

    // Save to history
    const newHistory = [completedBundle, ...bundleHistory];
    setBundleHistory(newHistory);
    localStorage.setItem('ninjaBundleHistory', JSON.stringify(newHistory));

    setCurrentBundle(completedBundle);
    setScreen('bundle-summary');
  };

  const handleBundleRestart = () => {
    if (!currentBundle) return;
    setCurrentBundleIndex(0);
    const firstLesson = currentBundle.lessons[0];
    setSelectedLesson(firstLesson.lesson);
    setSelectedMode(firstLesson.mode);
    setStats(null);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    setScreen('menu');
    if (isCustomPracticeLesson) {
      setCurrentTab('practice');
      setSelectedCategory(null);
      return;
    }

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

  useEffect(() => {
    if (screen !== 'evaluation' || !nextLesson) return;

    const handleEvaluationSpace = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return;
      event.preventDefault();
      handleNextLesson();
    };

    window.addEventListener('keydown', handleEvaluationSpace);
    return () => window.removeEventListener('keydown', handleEvaluationSpace);
  }, [handleNextLesson, nextLesson, screen]);

  const handleCancel = () => {
    setScreen('menu');
    if (isCustomPracticeLesson) {
      setCurrentTab('practice');
      setSelectedCategory(null);
      return;
    }

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
    return category.subLessons.filter(l => l.mode !== 'infinite').every(l => completedLessons.includes(l.id.toString()));
  };

  const isCategoryPerfect = (category: Category) => {
    return category.subLessons
      .filter(l => l.mode !== 'infinite')
      .every(l => getLessonStats(l.id.toString()).stars === 3);
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
              <button
                onClick={() => setCurrentTab('daily')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold transition-all ${
                  currentTab === 'daily' ? 'bg-white dark:bg-slate-700 text-blue-500 dark:text-blue-400 shadow-sm border-2 border-slate-200 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-2 border-transparent'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="hidden sm:inline">Denní</span>
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
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowSettings(false)}
                  >
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 18, scale: 0.97 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full space-y-4"
                    onClick={e => e.stopPropagation()}
                  >
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
                  </motion.div>
                </motion.div>
              )}
              </AnimatePresence>

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
                      const isPerfect = isCategoryPerfect(category);
                      const isUnlocked = i === 0 || isCategoryCompleted(categories[i - 1]);
                      
                      let colorClass = 'bg-slate-300 border-slate-400 text-slate-500';
                      if (isUnlocked) {
                        colorClass = isPerfect
                          ? 'bg-yellow-400 border-yellow-500 hover:bg-yellow-300 text-white'
                          : isCompleted
                            ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400 text-white'
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
                              {isPerfect ? <Star className="w-10 h-10 fill-white" /> : <Star className="w-10 h-10 fill-white/20" />}
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
                  className="space-y-8"
                >
                  <PracticeHub onStartPractice={startCustomPractice} learnedLetters={learnedLetters} />
                  {false && (
                  <>
                  <div className="relative overflow-hidden rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-b-[10px] p-6 sm:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.10),_transparent_30%)]" />
                    <div className="relative grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
                      <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-700/70 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                          <Dumbbell className="w-4 h-4 text-blue-500" />
                          Practice Hub
                        </div>
                        <div>
                          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                            Trénink psaní
                          </h2>
                          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              Vyber si lekci, nastav režim a spusť trénink z jednoho místa. Practice je rychlý přístup k jakékoli části obsahu bez ohledu na postup v mapě.
                          </p>
                        </div>
                      </div>

                      <div className="relative rounded-[1.75rem] border-2 border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/70 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Aktivně vybráno</div>
                            <h3 className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">{selectedLesson.title}</h3>
                            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                              {selectedLessonCategory?.title || 'Vlastní trénink'} {completedLessons.includes(selectedLessonBaseId) ? 'Dokončeno' : 'Připraveno ke spuštění'}
                            </p>
                          </div>
                          {completedLessons.includes(selectedLessonBaseId) && (
                            <div className="rounded-2xl bg-green-100 dark:bg-green-900/30 p-3 text-green-600 dark:text-green-300">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {selectedMode === 'standard' ? 'Klasika' : selectedMode === 'shooter' ? 'Střílečka' : selectedMode === 'wordShooter' ? 'Střílečka Slov' : selectedMode === 'infinite' ? 'Nekonečný' : selectedMode === 'challenge' ? 'Výzva' : 'Random'}
                          </span>
                          {selectedLesson.newLetters && (
                            <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Nová písmena: {selectedLesson.newLetters}
                            </span>
                          )}
                          {selectedMode === 'infinite' && (
                            <span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {formatInfiniteDuration(selectedPracticeInfiniteSettings.durationSec)}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={startPracticeGame}
                          className="mt-6 w-full py-4 bg-green-500 text-white rounded-3xl font-extrabold text-xl border-b-[6px] border-green-600 hover:bg-green-400 hover:translate-y-[2px] hover:border-b-[4px] active:translate-y-[6px] active:border-b-0 transition-all"
                        >
                          Spustit trénink
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-2xl font-extrabold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                          <Target className="w-6 h-6 text-blue-500" />
                          Vyber si lekci
                        </h2>
                        <div className="text-sm font-bold text-slate-400">{completedPracticeLessonCount}/{practiceLessonCount}</div>
                      </div>

                      <div className="space-y-5 max-h-[780px] overflow-y-auto pr-2 pb-4">
                        {categories.map(category => (
                          <section key={category.id} className="rounded-[1.75rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-b-8 p-5">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{category.title}</h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{category.description}</p>
                              </div>
                              <div className="text-sm font-black text-slate-400">
                                {category.subLessons.filter(lesson => lesson.mode !== 'infinite' && completedLessons.includes(lesson.id.toString())).length}/{category.subLessons.filter(lesson => lesson.mode !== 'infinite').length}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {category.subLessons.filter(lesson => lesson.mode !== 'infinite').map(lesson => {
                                const isSelected = selectedLessonBaseId === lesson.id.toString();
                                const isCompleted = completedLessons.includes(lesson.id.toString());
                                const lessonProgress = getLessonStats(lesson.id.toString());

                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => {
                                      setSelectedLesson(lesson);
                                      setSelectedMode(lesson.mode || 'standard');
                                    }}
                                    className={`p-4 rounded-2xl border-2 border-b-4 text-left transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{lesson.title}</div>
                                        <div className="mt-2 text-[11px] uppercase font-black tracking-wider text-slate-400">
                                          {lesson.mode === 'random' ? 'Random' : lesson.mode === 'challenge' ? 'Vyzva' : lesson.mode === 'shooter' ? 'Strilecka' : lesson.mode === 'wordShooter' ? 'Word Shooter' : 'Klasika'}
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                          <div className="flex items-center gap-0.5">
                                            {[0, 1, 2].map(starIndex => (
                                              <Star
                                                key={starIndex}
                                                className={`w-3.5 h-3.5 ${
                                                  starIndex < lessonProgress.stars
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-slate-300 dark:text-slate-600'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {lessonProgress.attempts} {formatAttemptLabel(lessonProgress.attempts)}
                                          </span>
                                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                            Best {lessonProgress.bestWpm} WPM
                                          </span>
                                        </div>
                                      </div>
                                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 xl:sticky xl:top-24">
                      <div className="rounded-[1.75rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-b-8 p-5 sm:p-6 space-y-5">
                        <h2 className="text-2xl font-extrabold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                          <Play className="w-6 h-6 text-green-500" />
                          Jak chceš trénovat
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { id: 'standard', label: 'Klasika', desc: 'Přesnost a rytmus', tone: 'green', icon: Target },
                            { id: 'shooter', label: 'Střílečka', desc: 'Reakce na písmena', tone: 'red', icon: Target },
                            { id: 'wordShooter', label: 'Střílečka Slov', desc: 'Slova pod tlakem', tone: 'orange', icon: Trophy },
                            { id: 'infinite', label: 'Nekonečný', desc: 'Bez konce nebo s časem', tone: 'blue', icon: TrendingUp }
                          ].map(mode => {
                            const Icon = mode.icon;
                            const selected = selectedMode === mode.id;

                            return (
                              <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id as GameMode)}
                                className={`rounded-2xl border-2 border-b-4 p-4 text-left transition-all ${
                                  selected
                                    ? mode.tone === 'green'
                                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                      : mode.tone === 'red'
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : mode.tone === 'orange'
                                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-700 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0'
                                }`}
                              >
                                <div className={`mb-3 inline-flex rounded-2xl p-3 ${
                                  selected
                                    ? mode.tone === 'green'
                                      ? 'bg-green-500 text-white'
                                      : mode.tone === 'red'
                                        ? 'bg-red-500 text-white'
                                        : mode.tone === 'orange'
                                          ? 'bg-orange-500 text-white'
                                          : 'bg-blue-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                }`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="font-black text-slate-800 dark:text-slate-100">{mode.label}</div>
                                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{mode.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedMode === 'infinite' && (
                          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-4">
                            <div>
                              <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Typ infinite</div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [selectedLessonBaseId]: { ...selectedPracticeInfiniteSettings, mode: 'standard' } }))}
                                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                                    selectedPracticeInfiniteSettings.mode === 'standard'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                  }`}
                                >
                                  Psaní
                                </button>
                                <button
                                  onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [selectedLessonBaseId]: { ...selectedPracticeInfiniteSettings, mode: 'shooter' } }))}
                                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                                    selectedPracticeInfiniteSettings.mode === 'shooter'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                  }`}
                                >
                                  Střílečka
                                </button>
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Obtiznost</div>
                              <div className="flex gap-2">
                                {(['easy', 'medium', 'hard'] as const).map(level => (
                                  <button
                                    key={level}
                                    onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [selectedLessonBaseId]: { ...selectedPracticeInfiniteSettings, difficulty: level } }))}
                                    className={`flex-1 py-3 rounded-xl font-bold transition ${
                                      selectedPracticeInfiniteSettings.difficulty === level
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                    }`}
                                  >
                                    {level === 'easy' ? 'Lehká' : level === 'medium' ? 'Střední' : 'Těžká'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-slate-600 dark:text-slate-300">Zvysujici se obtiznost</div>
                              <button
                                onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [selectedLessonBaseId]: { ...selectedPracticeInfiniteSettings, progressive: !selectedPracticeInfiniteSettings.progressive } }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedPracticeInfiniteSettings.progressive ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedPracticeInfiniteSettings.progressive ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-bold text-slate-600 dark:text-slate-300">Delka</div>
                                <button
                                  onClick={() => setLessonInfiniteSettings(prev => ({ ...prev, [selectedLessonBaseId]: { ...selectedPracticeInfiniteSettings, durationSec: selectedPracticeInfiniteSettings.durationSec === null ? 120 : null } }))}
                                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                                    selectedPracticeInfiniteSettings.durationSec === null
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {selectedPracticeInfiniteSettings.durationSec === null ? 'Infinite' : 'Casovac'}
                                </button>
                              </div>
                              {selectedPracticeInfiniteSettings.durationSec !== null && (
                                <>
                                  <input
                                    type="range"
                                    min={30}
                                    max={300}
                                    step={30}
                                    value={selectedPracticeInfiniteSettings.durationSec}
                                    onChange={e => setLessonInfiniteSettings(prev => ({ ...prev, [selectedLessonBaseId]: { ...selectedPracticeInfiniteSettings, durationSec: Number(e.target.value) } }))}
                                    className="w-full accent-blue-500"
                                  />
                                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {formatInfiniteDuration(selectedPracticeInfiniteSettings.durationSec)}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-4 py-4">
                          <div className="text-xs uppercase tracking-wider font-black text-slate-400">Co se spustí</div>
                          <div className="mt-2 text-base font-black text-slate-800 dark:text-slate-100">
                              {selectedLesson.title} � {selectedMode === 'standard' ? 'Klasika' : selectedMode === 'shooter' ? 'Střílečka' : selectedMode === 'wordShooter' ? 'Střílečka Slov' : selectedMode === 'infinite' ? 'Nekonečný' : selectedMode}
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {selectedMode === 'infinite'
                              ? `${selectedPracticeInfiniteSettings.mode === 'standard' ? 'Psaní' : 'Střílečka'}, ${selectedPracticeInfiniteSettings.difficulty === 'easy' ? 'lehká' : selectedPracticeInfiniteSettings.difficulty === 'medium' ? 'střední' : 'těžká'} obtížnost, ${formatInfiniteDuration(selectedPracticeInfiniteSettings.durationSec)}`
                              : 'Okamžitý start se současnou lekcí'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                  )}
                </motion.div>
              )}

              {currentTab === 'daily' && (
                <motion.div 
                  key="daily"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-6 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:from-emerald-950/20 dark:to-blue-950/20 sm:p-8">
                    <div className="flex flex-col gap-6">
                      <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          <Clock className="h-4 w-4" />
                          Dailz Practice
                        </div>
                        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                          Vytvoř svůj tréninkový balíček
                        </h2>
                        <p className="mt-3 text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                          Vyber písmena, která chceš procvičit, a nastav délku tréninku. Systém automaticky vytvoří balíček cvičení přizpůsobený tvým potřebám.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                          <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Vybráno písmen</div>
                          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-50">{dailyPracticeSettings.letters.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                          <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Délka tréninku</div>
                          <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-50">
                            {formatTime(dailyPracticeSettings.duration)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                          <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Počet cvičení</div>
                          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-50">
                            {dailyPracticeSettings.duration <= 60 ? '3' : dailyPracticeSettings.duration <= 120 ? '4' : dailyPracticeSettings.duration <= 180 ? '5' : '6'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800 sm:p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">1. Vyber písmena</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDailyPracticeSettings(prev => ({ ...prev, letters: Array.from(learnedLetters) }))}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                        >
                          Reset na naučená
                        </button>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:p-4">
                        <div className="flex justify-end mb-3">
                          <button
                            onClick={() => setDailyPracticeSettings(prev => ({ ...prev, letters: Array.from(learnedLetters) }))}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors text-sm"
                            title="Resetovat na naučená písmena"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                          </button>
                        </div>
                        <Keyboard
                          activeChar=""
                          showAllColors={false}
                          learnedLetters={new Set()}
                          onKeyClick={(key) => {
                            setDailyPracticeSettings(prev => {
                              const letters = [...prev.letters];
                              const index = letters.indexOf(key);
                              if (index > -1) {
                                letters.splice(index, 1);
                              } else {
                                letters.push(key);
                              }
                              return { ...prev, letters: letters.sort() };
                            });
                          }}
                          selectedLetters={new Set(dailyPracticeSettings.letters)}
                        />
                      </div>
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                        {dailyPracticeSettings.letters.length > 0
                          ? `Vybraná písmena: ${dailyPracticeSettings.letters.join(' ')}`
                          : 'Vyber aspoň jedno písmeno.'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-500" />
                        2. Nastav délku
                      </h3>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((time) => (
                          <button
                            key={time}
                            onClick={() => setDailyPracticeSettings(prev => ({ ...prev, duration: time }))}
                            className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:translate-y-[1px] ${
                              dailyPracticeSettings.duration === time
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-md'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">{formatTime(time)}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {time <= 60 ? '3 cvičení' : time <= 120 ? '4 cvičení' : time <= 180 ? '5 cvičení' : '6 cvičení'}
                                </div>
                              </div>
                              {dailyPracticeSettings.duration === time && (
                                <div className="rounded-full bg-emerald-500 p-1.5">
                                  <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-r from-emerald-500 to-blue-500 p-6 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700">
                    <div className="text-center space-y-4">
                      <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                        <Play className="w-6 h-6" />
                        3. Spusť trénink
                      </h3>
                      <p className="text-white/90 text-base font-medium">
                        {dailyPracticeSettings.letters.length > 0
                          ? `Vygeneruje balíček ${dailyPracticeSettings.duration <= 60 ? '3' : dailyPracticeSettings.duration <= 120 ? '4' : dailyPracticeSettings.duration <= 180 ? '5' : '6'} cvičení pro procvičení písmen ${dailyPracticeSettings.letters.join(', ')} na ${formatTime(dailyPracticeSettings.duration).toLowerCase()}.`
                          : 'Bez vybraných písmen balíček nevygeneruješ.'}
                      </p>
                      <button
                        onClick={startDailyPractice}
                        disabled={dailyPracticeSettings.letters.length === 0}
                        className="inline-flex items-center justify-center gap-3 rounded-[1.25rem] bg-white px-8 py-4 text-lg font-black text-emerald-600 border-b-[6px] border-white/30 transition-all hover:bg-slate-50 hover:translate-y-[2px] hover:border-b-[4px] active:translate-y-[6px] active:border-b-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        <Play className="h-6 w-6 fill-current" />
                        Vygenerovat balíček
                      </button>
                    </div>
                  </div>

                  {previewBundle && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800 sm:p-6"
                    >
                      <div className="space-y-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Vygenerovaný balíček</h3>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          Balíček obsahuje {previewBundle.lessons.length} lekcí pro procvičení písmen {previewBundle.letters.join(', ')}.
                        </p>
                        
                        <div className="space-y-3">
                          {previewBundle.lessons.map((lesson, index) => (
                            <div key={lesson.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-600">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-100">{lesson.title}</div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">
                                    {lesson.mode === 'shooter' ? 'Střelba písmen' : lesson.mode === 'infinite' ? 'Psaní na čas' : 'Psaní textu'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setPreviewBundle(null)}
                            className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Zpět
                          </button>
                          <button
                            onClick={startBundlePractice}
                            className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Play className="h-5 w-5 fill-current" />
                            Spustit balíček
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {bundleHistory.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800 sm:p-6"
                    >
                      <div className="space-y-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Historie balíčků</h3>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {bundleHistory.slice(0, 10).map((bundle) => (
                            <div key={bundle.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-600">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                                    ✓
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-100">
                                      Balíček z {new Date(bundle.createdAt).toLocaleDateString('cs-CZ')}
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                      {bundle.lessons.length} lekcí · {bundle.letters.join('')} · {formatTime(Math.round((bundle.overallStats?.totalTime || 0) / 1000)).toLowerCase()}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setCurrentBundle(bundle);
                                      setCurrentBundleIndex(0);
                                      const firstLesson = bundle.lessons[0];
                                      setSelectedLesson(firstLesson.lesson);
                                      setSelectedMode(firstLesson.mode);
                                      setStats(null);
                                      setScreen('game');
                                    }}
                                    className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                                    title="Opakovat balíček"
                                  >
                                    <RotateCcw className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setBundleHistory(prev => prev.filter(b => b.id !== bundle.id));
                                      localStorage.setItem('ninjaBundleHistory', JSON.stringify(bundleHistory.filter(b => b.id !== bundle.id)));
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Smazat z historie"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                              
                              {bundle.overallStats && (
                                <div className="grid grid-cols-4 gap-3 text-center">
                                  <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase">WPM</div>
                                    <div className="text-lg font-bold text-blue-500">{Math.round(bundle.overallStats.averageWpm)}</div>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Přesnost</div>
                                    <div className="text-lg font-bold text-green-500">{Math.round(bundle.overallStats.averageAccuracy)}%</div>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Čas</div>
                                    <div className="text-lg font-bold text-purple-500">{Math.round(bundle.overallStats.totalTime / 1000)}s</div>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Chyby</div>
                                    <div className="text-lg font-bold text-red-500">{bundle.overallStats.totalErrors}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
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
              <p className="text-xl font-medium text-slate-500 dark:text-slate-400">
                {isCustomPracticeLesson ? 'Dokoncil jsi trenink' : 'Dokoncil jsi lekci'} <strong className="text-blue-500 dark:text-blue-400">{selectedLesson.title}</strong>
              </p>
              
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

              {isCustomPracticeLesson && activePracticeSettings && activePracticeSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7 }}
                  className="rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-left"
                >
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Tvuj progres</div>
                  <div className="mt-3 text-lg font-black text-slate-800 dark:text-slate-100">
                    {activePracticeSettings.mode === 'classic' ? 'Classic writing' : 'Shooting letters'} · {activePracticeSettings.letters.join(' ').toUpperCase()}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {activePracticeSettings.lengthType === 'time' ? `${activePracticeSettings.length} sec` : `${activePracticeSettings.length} chars`}
                  </div>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-400">Attempts</div>
                      <div className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{activePracticeSummary.attempts}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-400">Best WPM</div>
                      <div className="mt-2 text-3xl font-black text-blue-500">{activePracticeSummary.bestWpm}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-400">Best accuracy</div>
                      <div className="mt-2 text-3xl font-black text-emerald-500">{activePracticeSummary.bestAccuracy}%</div>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="flex flex-col sm:flex-row justify-center gap-4 mt-12"
              >
                {currentBundle ? (
                  <>
                    <button
                      onClick={handleBackToMenu}
                      className="px-8 py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 border-b-4 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-extrabold text-lg transition-all hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                    >
                      Zpět do menu
                    </button>
                    <button
                      onClick={handleBundleRestart}
                      className="px-8 py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 border-b-4 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-extrabold text-lg transition-all hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-6 h-6" />
                      Znovu balíček
                    </button>
                    {currentBundleIndex < currentBundle.lessons.length - 1 ? (
                      <button
                        onClick={handleBundleNextLesson}
                        className="px-8 py-4 bg-blue-500 border-b-4 border-blue-600 hover:bg-blue-400 text-white rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-2 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                      >
                        DALŠÍ LEKCE
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    ) : (
                      <button
                        onClick={handleBundleNextLesson}
                        className="px-8 py-4 bg-emerald-500 border-b-4 border-emerald-600 hover:bg-emerald-400 text-white rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-2 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                      >
                        DOKONČIT BALÍČEK
                        <CheckCircle2 className="w-6 h-6" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
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
                    {!isCustomPracticeLesson && nextLesson && (
                      <button
                        onClick={handleNextLesson}
                        className="px-8 py-4 bg-blue-500 border-b-4 border-blue-600 hover:bg-blue-400 text-white rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-2 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                      >
                        DALŠÍ
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}

          {screen === 'bundle-summary' && currentBundle && currentBundle.overallStats && (
            <motion.div 
              key="bundle-summary"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mt-12 text-center space-y-8 bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8"
            >
              <div className="flex justify-center gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                >
                  <Trophy className="w-20 h-20 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </motion.div>
              </div>
              
              <motion.h2 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="text-4xl font-extrabold text-slate-800 dark:text-slate-100"
              >
                Balíček dokončen!
              </motion.h2>
              <p className="text-xl font-medium text-slate-500 dark:text-slate-400">
                Skvělá práce! Dokončil jsi všechny lekce v balíčku.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mt-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border-2 border-blue-200 dark:border-blue-800/50 border-b-4"
                >
                  <div className="text-blue-600 dark:text-blue-400 font-bold mb-2 uppercase tracking-wider text-sm">Celkový čas</div>
                  <div className="text-3xl font-extrabold text-blue-500">{Math.round(currentBundle.overallStats.totalTime / 1000)} <span className="text-lg text-blue-400">sek</span></div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border-2 border-green-200 dark:border-green-800/50 border-b-4"
                >
                  <div className="text-green-600 dark:text-green-400 font-bold mb-2 uppercase tracking-wider text-sm">Průměrná přesnost</div>
                  <div className="text-3xl font-extrabold text-green-500">{Math.round(currentBundle.overallStats.averageAccuracy)}%</div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl border-2 border-purple-200 dark:border-purple-800/50 border-b-4"
                >
                  <div className="text-purple-600 dark:text-purple-400 font-bold mb-2 uppercase tracking-wider text-sm">Průměrná rychlost</div>
                  <div className="text-3xl font-extrabold text-purple-500">{Math.round(currentBundle.overallStats.averageWpm)} <span className="text-lg text-purple-400">WPM</span></div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border-2 border-red-200 dark:border-red-800/50 border-b-4"
                >
                  <div className="text-red-600 dark:text-red-400 font-bold mb-2 uppercase tracking-wider text-sm">Celkové chyby</div>
                  <div className="text-3xl font-extrabold text-red-500">{currentBundle.overallStats.totalErrors}</div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-left"
              >
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Lekce v balíčku</div>
                <div className="mt-4 space-y-3">
                  {currentBundle.lessons.map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          lesson.completed ? 'bg-green-500 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                        }`}>
                          {lesson.completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">{lesson.title}</div>
                          {lesson.stats && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {lesson.stats.wpm} WPM · {lesson.stats.accuracy}% · {Math.round(lesson.stats.timeMs / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex flex-col sm:flex-row justify-center gap-4 mt-12"
              >
                <button
                  onClick={handleBackToMenu}
                  className="px-8 py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 border-b-4 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-extrabold text-lg transition-all hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                >
                  Zpět do menu
                </button>
                <button
                  onClick={handleBundleRestart}
                  className="px-8 py-4 bg-blue-500 border-b-4 border-blue-600 hover:bg-blue-400 text-white rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-2 hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0"
                >
                  <RotateCcw className="w-6 h-6" />
                  Znovu balíček
                </button>
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
                    const lessonProgress = getLessonStats(lesson.id.toString());

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
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[0, 1, 2].map(starIndex => (
                                  <Star
                                    key={starIndex}
                                    className={`w-4 h-4 ${
                                      starIndex < lessonProgress.stars
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-300 dark:text-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {lessonProgress.attempts} {formatAttemptLabel(lessonProgress.attempts)}
                              </span>
                              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                Best {lessonProgress.bestWpm} WPM
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


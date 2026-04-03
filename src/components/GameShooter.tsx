import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SubLesson, Settings, GameStats } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Target, Timer, AlertCircle } from 'lucide-react';
import { playCountdownBeep, playCorrectHitSound, playErrorSound, playStartHorn } from '../utils/gameAudio';

interface GameShooterProps {
  lesson: SubLesson;
  settings: Settings;
  onComplete: (stats: GameStats) => void;
  onCancel?: () => void;
  setIsWriting: (isWriting: boolean) => void;
  bundleMistakes?: number;
}

interface Enemy {
  id: number;
  char: string;
  x: number;
  y: number;
  speed: number;
}

export const GameShooter: React.FC<GameShooterProps> = ({ lesson, settings, onComplete, onCancel, setIsWriting, bundleMistakes = 0 }) => {
  const isInfinite = lesson.mode === 'infinite';
  const difficulty = lesson.infiniteDifficulty || 'medium';
  const progressive = lesson.infiniteProgressive ?? true;
  const infiniteDurationSec = lesson.infiniteDurationSec ?? 120;
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [shake, setShake] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const enemyIdCounter = useRef(0);
  const requestRef = useRef<number>();
  const countdownTimeoutsRef = useRef<number[]>([]);
  const lastSpawnTime = useRef<number>(0);
  const enemiesRef = useRef<Enemy[]>([]);
  const scoreRef = useRef(0);
  const errorsRef = useRef(0);

  const targetScore = isInfinite ? Infinity : lesson.targetScore || 30; // Infinite mode has no target score
  const gameDuration = isInfinite && infiniteDurationSec !== null ? infiniteDurationSec * 1000 : null;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  useEffect(() => {
    scoreRef.current = score;
    errorsRef.current = errors;
  }, [score, errors]);

  const finishGame = useCallback((finalScore = scoreRef.current, finalErrors = errorsRef.current) => {
    setGameState('finished');
    setIsWriting(false);
    const endTime = Date.now();
    const timeMs = endTime - (startTime || endTime);
    const minutes = Math.max(timeMs / 60000, 1 / 60000);
    const correctChars = Math.max(0, finalScore);
    const wpm = Math.round((correctChars / 5) / minutes);
    const accuracy = Math.max(0, Math.round((finalScore / (finalScore + finalErrors)) * 100)) || 100;
    onComplete({ wpm, accuracy, errors: finalErrors, timeMs });
  }, [onComplete, setIsWriting, startTime]);

  const startGame = () => {
    setGameState('playing');
    setCountdownValue(null);
    setStartTime(Date.now());
    setIsWriting(true);
    setEnemies([]);
    enemiesRef.current = [];
    setScore(0);
    setErrors(0);
    setShake(false);
    enemyIdCounter.current = 0;
    if (containerRef.current) containerRef.current.focus();
  };

  const clearCountdown = useCallback(() => {
    countdownTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    countdownTimeoutsRef.current = [];
  }, []);

  const beginCountdown = () => {
    clearCountdown();
    setGameState('countdown');
    setCountdownValue(3);
    setIsWriting(false);

    [3, 2, 1].forEach((count, index) => {
      countdownTimeoutsRef.current.push(
        window.setTimeout(() => {
          setCountdownValue(count);
          playCountdownBeep(count);
        }, index * 1000),
      );
    });

    countdownTimeoutsRef.current.push(
      window.setTimeout(() => {
        playStartHorn();
        startGame();
      }, 3000),
    );
  };

  // Handle infinite mode timer
  useEffect(() => {
    if (isInfinite && gameState === 'playing' && gameDuration && startTime) {
      const timer = setTimeout(() => {
        finishGame();
      }, gameDuration);
      return () => clearTimeout(timer);
    }
  }, [finishGame, gameDuration, gameState, isInfinite, startTime]);

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    if (!lastSpawnTime.current) lastSpawnTime.current = time;

    const currentScore = scoreRef.current;
    const currentErrors = errorsRef.current;
    const difficultyMultiplier = settings.shooterDifficulty === 'hard' ? 1.5 : settings.shooterDifficulty === 'easy' ? 0.7 : 1;
    
    // Bundle difficulty scaling: increase difficulty based on mistakes in previous bundle lessons
    const bundleDifficultyMultiplier = 1 + (bundleMistakes * 0.1); // 10% harder for each mistake
    
    const timeFactor = (Date.now() - (startTime || Date.now())) / 60000; // minutes passed
    const performanceFactor = currentScore / targetScore;
    
    const speedBase = 0.2 + (timeFactor * 0.2) + (performanceFactor * 0.3);
    const speedMultiplier = speedBase * difficultyMultiplier * bundleDifficultyMultiplier;
    
    const spawnInterval = Math.max(400, 1200 - (performanceFactor * 600) - (timeFactor * 400)) / (difficultyMultiplier * bundleDifficultyMultiplier);

    let newEnemies = [...enemiesRef.current];
    let shouldUpdate = false;

    // Spawn new enemies - allow more simultaneous
    const maxEnemies = 5 + Math.floor(performanceFactor * 5);
    if (time - lastSpawnTime.current > spawnInterval && newEnemies.length < maxEnemies) {
      const sourceText = (lesson as any).chars || lesson.text || lesson.letters || 'fj';
      const chars = sourceText.replace(/ /g, '');
      const uniqueChars = Array.from(new Set(chars.split(''))).join('');
      
      if (uniqueChars.length > 0) {
        const randomChar = uniqueChars[Math.floor(Math.random() * uniqueChars.length)];
        newEnemies.push({
          id: enemyIdCounter.current++,
          char: randomChar,
          x: Math.random() * 80 + 10,
          y: -10,
          speed: (0.8 + Math.random() * 0.4) * speedMultiplier
        });
        lastSpawnTime.current = time;
        shouldUpdate = true;
      }
    }

    // Move enemies
    if (newEnemies.length > 0) {
      newEnemies = newEnemies.map(e => ({ ...e, y: e.y + e.speed }));
      
      const reachedBottom = newEnemies.filter(e => e.y > 100);
      if (reachedBottom.length > 0) {
        playErrorSound();
        setErrors(err => err + reachedBottom.length);
        triggerShake();
        newEnemies = newEnemies.filter(e => e.y <= 100);
      }
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      enemiesRef.current = newEnemies;
      setEnemies(newEnemies);
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, startTime, settings.shooterDifficulty, lesson]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(update);
      const timer = setInterval(() => {
        setTimeElapsed(Date.now() - (startTime || Date.now()));
      }, 1000);
      return () => {
        cancelAnimationFrame(requestRef.current!);
        clearInterval(timer);
      };
    }
  }, [gameState, update, startTime]);

  useEffect(() => () => {
    clearCountdown();
  }, [clearCountdown]);

  useEffect(() => {
    if (gameState === 'waiting' || gameState === 'countdown') {
      containerRef.current?.focus();
    }
  }, [gameState]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (gameState === 'waiting' && e.code === 'Space') {
      e.preventDefault();
      beginCountdown();
      return;
    }

    if (gameState === 'countdown' && e.code === 'Space') {
      e.preventDefault();
      return;
    }

    if (gameState !== 'playing') return;
    if (e.key.length > 1) return;

    const typedChar = e.key.toLowerCase();
    const targetEnemy = [...enemiesRef.current]
      .filter(en => en.char.toLowerCase() === typedChar)
      .sort((a, b) => b.y - a.y)[0];

    if (targetEnemy) {
      const remaining = enemiesRef.current.filter(en => en.id !== targetEnemy.id);
      enemiesRef.current = remaining;
      setEnemies(remaining);
      playCorrectHitSound();
      
      const newScore = score + 1;
      setScore(newScore);
      
      if (newScore >= targetScore) {
        finishGame(newScore, errorsRef.current);
      }
    } else {
      playErrorSound();
      setErrors(err => err + 1);
      triggerShake();
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={containerRef}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-slate-800 dark:text-white">{lesson.title}</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Střílečka</div>
            {isInfinite && (
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {infiniteDurationSec === null ? 'Infinite rezim' : `${infiniteDurationSec}s`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="font-black text-slate-700 dark:text-slate-200">
              {isInfinite ? score : `${score}/${targetScore}`}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="font-black text-slate-700 dark:text-slate-200">{errors}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 flex items-center gap-3">
            <Timer className="w-5 h-5 text-slate-400" />
            <span className="font-black text-slate-700 dark:text-slate-200 font-mono">
              {isInfinite && gameDuration && startTime 
                ? `${Math.max(0, Math.floor((gameDuration - (Date.now() - startTime)) / 1000))}s` 
                : `${Math.floor(timeElapsed / 1000)}s`}
            </span>
          </div>
        </div>
      </div>

      <motion.div 
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.2 }}
        className="w-full h-[500px] bg-slate-100 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-700 border-b-[12px] relative overflow-hidden shadow-xl"
      >
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-px h-full bg-slate-300 dark:bg-slate-600" />
          <div className="absolute top-0 left-2/4 w-px h-full bg-slate-300 dark:bg-slate-600" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <AnimatePresence>
          {(gameState === 'waiting' || gameState === 'countdown') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8 text-center max-w-sm mx-4">
                {gameState === 'countdown' ? (
                  <>
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <span className="text-5xl font-black tabular-nums">{countdownValue ?? 3}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Připravit, pozor, ...</h3>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Play className="w-8 h-8 fill-current" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Připraveni?</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                      {isInfinite 
                        ? 'Sestřelte co nejvíce písmen během 2 minut. Hra se bude postupně zrychlovat!' 
                        : `Sestřelte ${targetScore} písmen dříve, než dopadnou na zem. Hra se bude postupně zrychlovat!`
                      }
                    </p>
                    <button
                      onClick={beginCountdown}
                      className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      START
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {enemies.map(enemy => (
            <motion.div
              key={enemy.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5, filter: 'blur(8px)' }}
              className="absolute flex items-center justify-center w-14 h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 border-b-4 rounded-2xl shadow-lg"
              style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="text-3xl font-black text-slate-800 dark:text-white font-mono uppercase">{enemy.char}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Player Base / Danger Zone */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-rose-500/20 to-transparent border-t-2 border-rose-500/30 flex items-center justify-center">
          <div className="text-[10px] font-black text-rose-500/50 uppercase tracking-[0.5em]">NEBEZPEČNÁ ZÓNA</div>
        </div>
      </motion.div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={isInfinite && gameState === 'playing' ? () => finishGame() : onCancel}
          className="px-6 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold transition-colors"
        >
          {isInfinite && gameState === 'playing' ? 'Skončit' : 'Zrušit hru'}
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SubLesson, Settings, GameStats } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Target, Timer, AlertCircle, Keyboard as KeyboardIcon } from 'lucide-react';

interface GameWordShooterProps {
  lesson: SubLesson;
  settings: Settings;
  onComplete: (stats: GameStats) => void;
  onCancel?: () => void;
  setIsWriting: (isWriting: boolean) => void;
}

interface WordEnemy {
  id: number;
  word: string;
  typedLength: number;
  x: number;
  y: number;
  speed: number;
}

export const GameWordShooter: React.FC<GameWordShooterProps> = ({ lesson, settings, onComplete, onCancel, setIsWriting }) => {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [enemies, setEnemies] = useState<WordEnemy[]>([]);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lockedEnemyId, setLockedEnemyId] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const enemyIdCounter = useRef(0);
  const requestRef = useRef<number>();
  const lastSpawnTime = useRef<number>(0);
  const enemiesRef = useRef<WordEnemy[]>([]);
  const scoreRef = useRef(0);
  const errorsRef = useRef(0);
  const lockedIdRef = useRef<number | null>(null);

  const targetScore = 15; // Fewer words needed than single letters

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  useEffect(() => {
    scoreRef.current = score;
    errorsRef.current = errors;
    lockedIdRef.current = lockedEnemyId;
  }, [score, errors, lockedEnemyId]);

  const startGame = () => {
    setGameState('playing');
    setStartTime(Date.now());
    setIsWriting(true);
    setEnemies([]);
    enemiesRef.current = [];
    setScore(0);
    setErrors(0);
    setLockedEnemyId(null);
    setShake(false);
    enemyIdCounter.current = 0;
    if (containerRef.current) containerRef.current.focus();
  };

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    if (!lastSpawnTime.current) lastSpawnTime.current = time;

    const currentScore = scoreRef.current;
    const difficultyMultiplier = settings.shooterDifficulty === 'hard' ? 1.3 : settings.shooterDifficulty === 'easy' ? 0.6 : 1;
    
    const timeFactor = (Date.now() - (startTime || Date.now())) / 60000;
    const performanceFactor = currentScore / targetScore;
    
    // Slower than single letter shooter
    const speedBase = 0.1 + (timeFactor * 0.1) + (performanceFactor * 0.15);
    const speedMultiplier = speedBase * difficultyMultiplier;
    
    const spawnInterval = Math.max(1500, 3000 - (performanceFactor * 1000) - (timeFactor * 500)) / difficultyMultiplier;

    let newEnemies = [...enemiesRef.current];
    let shouldUpdate = false;

    const maxEnemies = 3 + Math.floor(performanceFactor * 2);
    if (time - lastSpawnTime.current > spawnInterval && newEnemies.length < maxEnemies) {
      const wordList = lesson.words || ['houba', 'kůň', 'les', 'voda', 'tráva', 'květina', 'strom', 'mrak', 'slunce', 'déšť'];
      const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
      
      newEnemies.push({
        id: enemyIdCounter.current++,
        word: randomWord,
        typedLength: 0,
        x: Math.random() * 60 + 20, // Keep away from edges
        y: -10,
        speed: (0.7 + Math.random() * 0.3) * speedMultiplier
      });
      lastSpawnTime.current = time;
      shouldUpdate = true;
    }

    if (newEnemies.length > 0) {
      newEnemies = newEnemies.map(e => ({ ...e, y: e.y + e.speed }));
      
      const reachedBottom = newEnemies.filter(e => e.y > 100);
      if (reachedBottom.length > 0) {
        setErrors(err => err + reachedBottom.length);
        triggerShake();
        // If locked enemy reached bottom, unlock
        if (reachedBottom.some(e => e.id === lockedIdRef.current)) {
          setLockedEnemyId(null);
        }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (gameState !== 'playing') return;
    if (e.key.length > 1) return;

    const typedChar = e.key.toLowerCase();
    let currentEnemies = [...enemiesRef.current];
    let targetEnemy: WordEnemy | undefined;

    if (lockedIdRef.current !== null) {
      targetEnemy = currentEnemies.find(en => en.id === lockedIdRef.current);
      if (targetEnemy) {
        const expectedChar = targetEnemy.word[targetEnemy.typedLength].toLowerCase();
        if (typedChar === expectedChar) {
          targetEnemy.typedLength += 1;
          
          if (targetEnemy.typedLength === targetEnemy.word.length) {
            // Word finished!
            const remaining = currentEnemies.filter(en => en.id !== targetEnemy!.id);
            enemiesRef.current = remaining;
            setEnemies(remaining);
            setLockedEnemyId(null);
            
            const newScore = score + 1;
            setScore(newScore);
            
            if (newScore >= targetScore) {
              setGameState('finished');
              setIsWriting(false);
              const endTime = Date.now();
              const timeMs = endTime - (startTime || endTime);
              const minutes = timeMs / 60000;
              const wpm = minutes > 0 ? Math.round((newScore * 5) / minutes) : 0; // Rough estimate
              const accuracy = Math.max(0, Math.round((newScore / (newScore + errors)) * 100)) || 100;
              onComplete({ wpm, accuracy, errors, timeMs });
            }
          } else {
            setEnemies(currentEnemies);
            enemiesRef.current = currentEnemies;
          }
        } else {
          setErrors(err => err + 1);
          triggerShake();
        }
      }
    } else {
      // Look for a new target
      targetEnemy = currentEnemies
        .filter(en => en.word[0].toLowerCase() === typedChar)
        .sort((a, b) => b.y - a.y)[0];

      if (targetEnemy) {
        setLockedEnemyId(targetEnemy.id);
        targetEnemy.typedLength = 1;
        
        if (targetEnemy.typedLength === targetEnemy.word.length) {
          // One-letter word?
          const remaining = currentEnemies.filter(en => en.id !== targetEnemy!.id);
          enemiesRef.current = remaining;
          setEnemies(remaining);
          setLockedEnemyId(null);
          setScore(s => s + 1);
        } else {
          setEnemies(currentEnemies);
          enemiesRef.current = currentEnemies;
        }
      } else {
        setErrors(err => err + 1);
        triggerShake();
      }
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
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <KeyboardIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-slate-800 dark:text-white">{lesson.title}</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slovní střílečka</div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 flex items-center gap-3">
            <Target className="w-5 h-5 text-purple-500" />
            <span className="font-black text-slate-700 dark:text-slate-200">{score}/{targetScore}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="font-black text-slate-700 dark:text-slate-200">{errors}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 flex items-center gap-3">
            <Timer className="w-5 h-5 text-slate-400" />
            <span className="font-black text-slate-700 dark:text-slate-200 font-mono">{Math.floor(timeElapsed / 1000)}s</span>
          </div>
        </div>
      </div>

      <motion.div 
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.2 }}
        className="w-full h-[600px] bg-slate-100 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-700 border-b-[12px] relative overflow-hidden shadow-xl"
      >
        <AnimatePresence>
          {gameState === 'waiting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8 text-center max-w-sm mx-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Play className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Slovní výzva!</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  Pište celá slova, abyste je sestřelili. Jakmile začnete psát slovo, musíte ho dokončit!
                </p>
                <button
                  onClick={startGame}
                  className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-purple-500/25 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-current" />
                  START
                </button>
              </div>
            </motion.div>
          )}

          {enemies.map(enemy => {
            const isLocked = lockedEnemyId === enemy.id;
            return (
              <motion.div
                key={enemy.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.2, filter: 'blur(8px)' }}
                className={`absolute px-4 py-2 bg-white dark:bg-slate-800 border-2 rounded-2xl shadow-lg flex items-center gap-1 whitespace-nowrap transition-colors ${
                  isLocked ? 'border-purple-500 ring-4 ring-purple-500/20' : 'border-slate-200 dark:border-slate-600'
                }`}
                style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, transform: 'translateX(-50%)' }}
              >
                {enemy.word.split('').map((char, i) => (
                  <span 
                    key={i} 
                    className={`text-2xl font-black font-mono uppercase ${
                      i < enemy.typedLength 
                        ? 'text-purple-500' 
                        : 'text-slate-800 dark:text-white opacity-40'
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Player Base / Danger Zone */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-rose-500/20 to-transparent border-t-2 border-rose-500/30 flex items-center justify-center">
          <div className="text-[10px] font-black text-rose-500/50 uppercase tracking-[0.5em]">NEBEZPEČNÁ ZÓNA</div>
        </div>
      </motion.div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold transition-colors"
        >
          Zrušit hru
        </button>
      </div>
    </div>
  );
};

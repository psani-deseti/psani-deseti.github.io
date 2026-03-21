import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SubLesson, Settings, GameStats } from '../types';
import { Keyboard } from './Keyboard';
import { motion, AnimatePresence } from 'motion/react';
import { generateRandomText, generateRandomWords } from '../utils/generator';
import { Info, CheckCircle2, Keyboard as KeyboardIcon, ArrowRight } from 'lucide-react';

interface GameStandardProps {
  lesson: SubLesson;
  settings: Settings;
  onComplete: (stats: GameStats) => void;
  onCancel?: () => void;
  setIsWriting: (isWriting: boolean) => void;
}

const FINGER_MAP: Record<string, { hand: 'left' | 'right', finger: string, color: string }> = {
  'f': { hand: 'left', finger: 'ukazováček', color: 'bg-blue-400' },
  'd': { hand: 'left', finger: 'prostředníček', color: 'bg-green-400' },
  's': { hand: 'left', finger: 'prsteníček', color: 'bg-yellow-400' },
  'a': { hand: 'left', finger: 'malíček', color: 'bg-red-400' },
  'g': { hand: 'left', finger: 'ukazováček (vpravo)', color: 'bg-blue-400' },
  'r': { hand: 'left', finger: 'ukazováček (nahoru)', color: 'bg-blue-400' },
  'e': { hand: 'left', finger: 'prostředníček (nahoru)', color: 'bg-green-400' },
  'w': { hand: 'left', finger: 'prsteníček (nahoru)', color: 'bg-yellow-400' },
  'q': { hand: 'left', finger: 'malíček (nahoru)', color: 'bg-red-400' },
  't': { hand: 'left', finger: 'ukazováček (vpravo nahoru)', color: 'bg-blue-400' },
  'v': { hand: 'left', finger: 'ukazováček (dolů)', color: 'bg-blue-400' },
  'c': { hand: 'left', finger: 'prostředníček (dolů)', color: 'bg-green-400' },
  'x': { hand: 'left', finger: 'prsteníček (dolů)', color: 'bg-yellow-400' },
  'z': { hand: 'left', finger: 'malíček (dolů)', color: 'bg-red-400' },
  'b': { hand: 'left', finger: 'ukazováček (vpravo dolů)', color: 'bg-blue-400' },
  
  'j': { hand: 'right', finger: 'ukazováček', color: 'bg-blue-400' },
  'k': { hand: 'right', finger: 'prostředníček', color: 'bg-green-400' },
  'l': { hand: 'right', finger: 'prsteníček', color: 'bg-yellow-400' },
  'ů': { hand: 'right', finger: 'malíček', color: 'bg-red-400' },
  'h': { hand: 'right', finger: 'ukazováček (vlevo)', color: 'bg-blue-400' },
  'u': { hand: 'right', finger: 'ukazováček (nahoru)', color: 'bg-blue-400' },
  'i': { hand: 'right', finger: 'prostředníček (nahoru)', color: 'bg-green-400' },
  'o': { hand: 'right', finger: 'prsteníček (nahoru)', color: 'bg-yellow-400' },
  'p': { hand: 'right', finger: 'malíček (nahoru)', color: 'bg-red-400' },
  'ú': { hand: 'right', finger: 'malíček (nahoru)', color: 'bg-red-400' },
  'n': { hand: 'right', finger: 'ukazováček (vlevo dolů)', color: 'bg-blue-400' },
  'm': { hand: 'right', finger: 'ukazováček (dolů)', color: 'bg-blue-400' },
  ',': { hand: 'right', finger: 'prostředníček (dolů)', color: 'bg-green-400' },
  '.': { hand: 'right', finger: 'prsteníček (dolů)', color: 'bg-yellow-400' },
  '-': { hand: 'right', finger: 'malíček (dolů)', color: 'bg-red-400' },
  'y': { hand: 'right', finger: 'ukazováček (vlevo nahoru)', color: 'bg-blue-400' },

  // Diacritics (Top row)
  '1': { hand: 'left', finger: 'malíček', color: 'bg-red-400' },
  '2': { hand: 'left', finger: 'prsteníček', color: 'bg-yellow-400' },
  'ě': { hand: 'left', finger: 'prsteníček', color: 'bg-yellow-400' },
  '3': { hand: 'left', finger: 'prostředníček', color: 'bg-green-400' },
  'š': { hand: 'left', finger: 'prostředníček', color: 'bg-green-400' },
  '4': { hand: 'left', finger: 'ukazováček', color: 'bg-blue-400' },
  'č': { hand: 'left', finger: 'ukazováček', color: 'bg-blue-400' },
  '5': { hand: 'left', finger: 'ukazováček', color: 'bg-blue-400' },
  'ř': { hand: 'left', finger: 'ukazováček', color: 'bg-blue-400' },
  '6': { hand: 'right', finger: 'ukazováček', color: 'bg-blue-400' },
  'ž': { hand: 'right', finger: 'ukazováček', color: 'bg-blue-400' },
  '7': { hand: 'right', finger: 'ukazováček', color: 'bg-blue-400' },
  'ý': { hand: 'right', finger: 'ukazováček', color: 'bg-blue-400' },
  '8': { hand: 'right', finger: 'prostředníček', color: 'bg-green-400' },
  'á': { hand: 'right', finger: 'prostředníček', color: 'bg-green-400' },
  '9': { hand: 'right', finger: 'prsteníček', color: 'bg-yellow-400' },
  'í': { hand: 'right', finger: 'prsteníček', color: 'bg-yellow-400' },
  '0': { hand: 'right', finger: 'malíček', color: 'bg-red-400' },
  'é': { hand: 'right', finger: 'malíček', color: 'bg-red-400' },
  '´': { hand: 'right', finger: 'malíček', color: 'bg-red-400' },
  'ˇ': { hand: 'right', finger: 'malíček', color: 'bg-red-400' },
};

export const GameStandard: React.FC<GameStandardProps> = ({ lesson, settings, onComplete, onCancel, setIsWriting }) => {
  const isInfinite = lesson.mode === 'infinite';
  const difficulty = lesson.infiniteDifficulty || 'medium';
  const progressive = lesson.infiniteProgressive ?? true;
  const infiniteDurationSec = lesson.infiniteDurationSec ?? 120;
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showFingerGuide, setShowFingerGuide] = useState(!!lesson.newLetters);
  
  const pages = useMemo(() => {
    const normalize = (text: string) => text.replace(/^[\s\u00A0]+/, '');

    if (lesson.mode === 'random' && (lesson.letters || lesson.words)) {
      const generatedPages = [];
      const count = lesson.pageCount || 3;
      const baseLength = lesson.pageLength || 40;
      const baseWordCount = lesson.wordCount || 10;
      const baseMaxComb = lesson.max_comb || 2;

      for (let i = 0; i < count; i++) {
        if (lesson.words && lesson.words.length > 0) {
          generatedPages.push(normalize(generateRandomWords(lesson.words, baseWordCount)));
        } else if (lesson.letters) {
          const pageLength = lesson.pageLength ? baseLength : (baseLength + i * 20);
          const pageMaxComb = lesson.max_comb ? baseMaxComb : (baseMaxComb + i);
          generatedPages.push(normalize(generateRandomText(lesson.letters, pageLength, pageMaxComb)));
        }
      }
      return generatedPages;
    }
    if (lesson.pages && lesson.pages.length > 0) {
      return lesson.pages.map(normalize);
    }
    return [normalize(lesson.text || '')];
  }, [lesson]);

  const [infiniteStage, setInfiniteStage] = useState(0);

  const infiniteText = useMemo(() => {
    if (!isInfinite) return '';
    const letters = (lesson.letters || 'abcdefghijklmnopqrstuvwxyz').replace(/\s+/g, '') || 'abcdefghijklmnopqrstuvwxyz';
    const difficultyFactor = difficulty === 'easy' ? 0.5 : difficulty === 'hard' ? 1.5 : 1;
    const baseLength = 50;
    const stageFactor = progressive ? (1 + infiniteStage * 0.2) : 1;
    const targetLength = Math.floor(baseLength * difficultyFactor * stageFactor);
    
    let result = '';
    let previousWasSpace = true;
    for (let i = 0; i < targetLength; i++) {
      const remaining = targetLength - i;
      const shouldInsertSpace = !previousWasSpace && i > 1 && remaining > 2 && Math.random() < 0.14;

      if (shouldInsertSpace) {
        result += ' ';
        previousWasSpace = true;
        continue;
      }

      result += letters[Math.floor(Math.random() * letters.length)];
      previousWasSpace = false;
    }
    return result.replace(/\s+/g, ' ').trim();
  }, [isInfinite, infiniteStage, lesson.letters, difficulty, progressive]);

  useEffect(() => {
    if (isInfinite) {
      setInfiniteStage(0);
      setCurrentPageIndex(0);
      setInput('');
      setErrors(0);
      setIsFinished(false);
      setStartTime(null);
      setTimeElapsed(0);
      totalTypedCharsRef.current = 0;
      totalErrorsRef.current = 0;
    }
  }, [isInfinite, lesson.id]);

  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalTypedCharsRef = useRef(0);
  const totalErrorsRef = useRef(0);

  const targetText = (isInfinite ? infiniteText : pages[currentPageIndex]) || '';
  const currentIndex = input.length;
  const activeChar = targetText[currentIndex] || '';

  useEffect(() => {
    containerRef.current?.focus();
  }, [showFingerGuide, currentPageIndex]);

  useEffect(() => {
    let interval: number;
    if (startTime && !isFinished) {
      interval = window.setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  const buildInfiniteStats = useCallback((completedChars: number, totalErrors: number) => {
    const endTime = Date.now();
    const timeMs = endTime - (startTime || endTime);
    const minutes = Math.max(timeMs / 60000, 1 / 60000);
    const words = completedChars / 5;
    const attempts = completedChars + totalErrors;
    const wpm = Math.round(words / minutes);
    const accuracy = attempts > 0 ? Math.max(0, Math.round((completedChars / attempts) * 100)) : 100;

    return { wpm, accuracy, errors: totalErrors, timeMs };
  }, [startTime]);

  const finishInfiniteRun = useCallback(() => {
    setIsFinished(true);
    setIsWriting(false);

    const completedChars = totalTypedCharsRef.current + input.length;
    const totalErrors = totalErrorsRef.current + errors;
    onComplete(buildInfiniteStats(completedChars, totalErrors));
  }, [buildInfiniteStats, errors, input.length, onComplete, setIsWriting]);

  useEffect(() => {
    if (!isInfinite || infiniteDurationSec === null || !startTime || isFinished) return;

    const remainingMs = infiniteDurationSec * 1000 - (Date.now() - startTime);
    if (remainingMs <= 0) {
      finishInfiniteRun();
      return;
    }

    const timeout = window.setTimeout(finishInfiniteRun, remainingMs);
    return () => clearTimeout(timeout);
  }, [finishInfiniteRun, infiniteDurationSec, isFinished, isInfinite, startTime]);

  const completeGame = (finalErrors: number) => {
    if (isInfinite) {
      totalTypedCharsRef.current += targetText.length;
      totalErrorsRef.current += finalErrors;
      setInfiniteStage(prev => prev + 1);
      setInput('');
      setErrors(0);
      setShake(false);
      return;
    }

    setIsFinished(true);
    setIsWriting(false);
    const endTime = Date.now();
    const timeMs = endTime - (startTime || endTime);
    const minutes = timeMs / 60000;
    
    const totalLength = pages.reduce((acc, p) => acc + p.length, 0);
    const words = totalLength / 5;
    const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
    const accuracy = Math.max(0, Math.round(((totalLength - finalErrors) / totalLength) * 100));
    
    onComplete({ wpm, accuracy, errors: finalErrors, timeMs });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isFinished) return;

    // Prevent space from scrolling
    if (e.key === ' ') {
      e.preventDefault();
    }

    if (showFingerGuide) {
      if (e.key === ' ') {
        setShowFingerGuide(false);
      }
      return;
    }

    // If page is finished, spacebar advances to next page
    if (input.length === targetText.length && e.key === ' ') {
      if (currentPageIndex < pages.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
        setInput('');
        return;
      } else {
        completeGame(errors);
        return;
      }
    }

    if (e.key.length > 1 && e.key !== 'Backspace') return;

    if (!startTime) {
      setStartTime(Date.now());
      setIsWriting(true);
    }

    if (e.key === 'Backspace') {
      if (input.length > 0) {
        setInput(input.slice(0, -1));
      }
      return;
    }

    const expectedChar = targetText[currentIndex];
    
    if (e.key === expectedChar) {
      const newInput = input + e.key;
      setInput(newInput);
      setShake(false);
      
      if (newInput.length === targetText.length) {
        if (isInfinite) {
          completeGame(errors);
        } else if (currentPageIndex < pages.length - 1) {
          setTimeout(() => {
            setCurrentPageIndex(prev => prev + 1);
            setInput('');
          }, 300);
        } else {
          completeGame(errors);
        }
      }
    } else {
      const newErrors = errors + 1;
      setErrors(newErrors);
      setShake(true);
      setTimeout(() => setShake(false), 200);
      
      if (!settings.strictMode) {
        const newInput = input + e.key;
        setInput(newInput);
        
        if (newInput.length === targetText.length) {
          if (isInfinite) {
            completeGame(newErrors);
          } else if (currentPageIndex < pages.length - 1) {
            setTimeout(() => {
              setCurrentPageIndex(prev => prev + 1);
              setInput('');
            }, 300);
          } else {
            completeGame(newErrors);
          }
        }
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto outline-none" onKeyDown={handleKeyDown} tabIndex={0} ref={containerRef}>
      <AnimatePresence mode="wait">
        {showFingerGuide ? (
          <motion.div
            key="finger-guide"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-slate-800 p-4 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8 text-center"
          >
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Nová písmena!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
              V této lekci se naučíme: <span className="font-bold text-blue-500">{lesson.newLetters}</span>
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {lesson.newLetters?.split('').map(char => {
                const guide = FINGER_MAP[char.toLowerCase()];
                return (
                  <div key={char} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-slate-100 dark:border-slate-600 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black text-white ${guide?.color || 'bg-slate-400'}`}>
                      {char.toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{guide?.hand === 'left' ? 'Levá ruka' : 'Pravá ruka'}</div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{guide?.finger || 'Neznámý prst'}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-6 opacity-50 scale-75 origin-center">
              <Keyboard 
                activeChar={lesson.newLetters?.[0] || ''} 
                learnedLetters={new Set((lesson.newLetters || '').toLowerCase().split(''))}
              />
            </div>

            <button
              onClick={() => setShowFingerGuide(false)}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <span>Jdeme na to</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="game-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 border-b-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <KeyboardIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 dark:text-white">{lesson.title}</h2>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {isInfinite
                      ? (infiniteDurationSec === null ? 'Infinite rezim' : `${Math.max(0, Math.ceil((infiniteDurationSec * 1000 - timeElapsed) / 1000))} s`)
                      : `Strana ${currentPageIndex + 1} z ${pages.length}`}
                  </div>
                </div>
              </div>
              <button
                onClick={isInfinite ? finishInfiniteRun : onCancel}
                className="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold transition-colors"
              >
                                {isInfinite ? 'Skončit' : 'Zrušit'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${(input.length / targetText.length) * 100}%` }}
              />
            </div>

            {/* Typing Area */}
            <motion.div 
              animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.2 }}
              className="relative bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-700 border-b-[12px] shadow-xl"
            >
              <div className="flex flex-wrap gap-x-[0.15em] gap-y-4 font-mono text-lg sm:text-xl leading-relaxed select-none">
                {targetText.split('').map((char, i) => {
                  let colorClass = 'text-slate-300 dark:text-slate-600';
                  let bgClass = '';
                  let borderClass = '';
                  let isCurrent = i === input.length;

                  if (i < input.length) {
                    const isCorrect = input[i] === char;
                    colorClass = isCorrect ? 'text-slate-800 dark:text-white' : 'text-red-500';
                    bgClass = isCorrect ? '' : 'bg-red-50 dark:bg-red-900/20 rounded';
                  } else if (isCurrent) {
                    colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
                    bgClass = 'bg-blue-100 dark:bg-blue-900/50 rounded';
                    borderClass = 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800';
                  }

                  return (
                    <span key={i} className={`relative px-1 ${colorClass} ${bgClass} ${borderClass} transition-all duration-150 rounded`}>
                      {char === ' ' ? '\u00A0' : char}
                      {isCurrent && (
                        <motion.div
                          layoutId="cursor"
                          className="absolute -bottom-1 left-0 w-full h-1 bg-blue-500 rounded-full"
                          initial={false}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </motion.div>

            <Keyboard activeChar={activeChar} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

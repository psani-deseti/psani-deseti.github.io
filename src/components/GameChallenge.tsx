import React, { useState, useEffect, useMemo } from 'react';
import { SubLesson, Settings, GameStats } from '../types';
import { GameStandard } from './GameStandard';
import { GameShooter } from './GameShooter';
import { GameWordShooter } from './GameWordShooter';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Target, Keyboard as KeyboardIcon, Rocket } from 'lucide-react';

interface GameChallengeProps {
  lesson: SubLesson;
  settings: Settings;
  onComplete: (stats: GameStats) => void;
  onCancel?: () => void;
  setIsWriting: (isWriting: boolean) => void;
}

type ChallengeMode = 'standard' | 'shooter' | 'wordShooter';

export const GameChallenge: React.FC<GameChallengeProps> = ({ lesson, settings, onComplete, onCancel, setIsWriting }) => {
  const parts = useMemo(() => lesson.challengeParts || ['standard', 'shooter'], [lesson.challengeParts]);
  const [activeTab, setActiveTab] = useState<ChallengeMode>(parts[0]);
  const [partStats, setPartStats] = useState<Record<string, GameStats | null>>({});

  const allCompleted = useMemo(() => {
    return parts.every(part => partStats[part]);
  }, [parts, partStats]);

  useEffect(() => {
    if (allCompleted) {
      // All parts completed! Calculate combined stats
      const statsArray = parts.map(part => partStats[part]!);
      const combinedStats: GameStats = {
        wpm: Math.round(statsArray.reduce((acc, s) => acc + s.wpm, 0) / statsArray.length),
        accuracy: Math.round(statsArray.reduce((acc, s) => acc + s.accuracy, 0) / statsArray.length),
        errors: statsArray.reduce((acc, s) => acc + s.errors, 0),
        timeMs: statsArray.reduce((acc, s) => acc + s.timeMs, 0),
      };
      
      const timer = setTimeout(() => {
        onComplete(combinedStats);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, parts, partStats, onComplete]);

  const handlePartComplete = (mode: ChallengeMode, stats: GameStats) => {
    setPartStats(prev => ({ ...prev, [mode]: stats }));
    
    // Auto-switch to next uncompleted part
    const nextPart = parts.find(p => p !== mode && !partStats[p]);
    if (nextPart) {
      setTimeout(() => setActiveTab(nextPart), 1500);
    }
  };

  const getPartIcon = (mode: ChallengeMode) => {
    switch (mode) {
      case 'standard': return <KeyboardIcon className="w-5 h-5" />;
      case 'shooter': return <Target className="w-5 h-5" />;
      case 'wordShooter': return <Rocket className="w-5 h-5" />;
    }
  };

  const getPartTitle = (mode: ChallengeMode) => {
    switch (mode) {
      case 'standard': return 'Psaní';
      case 'shooter': return 'Střílečka';
      case 'wordShooter': return 'Slovní bitva';
    }
  };

  const getPartColor = (mode: ChallengeMode) => {
    switch (mode) {
      case 'standard': return 'blue';
      case 'shooter': return 'purple';
      case 'wordShooter': return 'orange';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-wrap justify-center mb-8 gap-4">
        {parts.map((part, index) => {
          const color = getPartColor(part);
          const isActive = activeTab === part;
          const isDone = !!partStats[part];
          
          const colorClasses = {
            blue: isActive ? 'bg-blue-500 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
            purple: isActive ? 'bg-purple-500 text-white border-purple-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
            orange: isActive ? 'bg-orange-500 text-white border-orange-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
          };

          return (
            <button
              key={part}
              onClick={() => setActiveTab(part)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border-2 border-b-4 shadow-sm ${colorClasses[color as keyof typeof colorClasses]} ${!isActive && 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {getPartIcon(part)}
              Část {index + 1}: {getPartTitle(part)}
              {isDone && <CheckCircle2 className="w-5 h-5 text-green-400 ml-2" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {partStats[activeTab] ? (
            <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8">
              <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-extrabold text-slate-700 dark:text-slate-200 mb-4">
                {getPartTitle(activeTab)} dokončeno!
              </h2>
              <p className="text-xl text-slate-500 dark:text-slate-400 mb-8">
                {allCompleted ? 'Všechny části výzvy jsou hotové!' : 'Skvělá práce. Pokračuj na další část.'}
              </p>
              {!allCompleted && (
                <div className="flex flex-wrap justify-center gap-4">
                  {parts.filter(p => !partStats[p]).map(p => {
                    const color = getPartColor(p);
                    const btnClasses = {
                      blue: 'bg-blue-500 hover:bg-blue-600 border-blue-700',
                      purple: 'bg-purple-500 hover:bg-purple-600 border-purple-700',
                      orange: 'bg-orange-500 hover:bg-orange-600 border-orange-700',
                    };
                    return (
                      <button
                        key={p}
                        onClick={() => setActiveTab(p)}
                        className={`px-8 py-4 text-white font-bold rounded-2xl border-b-4 transition-colors text-xl ${btnClasses[color as keyof typeof btnClasses]}`}
                      >
                        Jít na {getPartTitle(p)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'standard' && (
                <GameStandard 
                  lesson={lesson} 
                  settings={settings} 
                  onComplete={(stats) => handlePartComplete('standard', stats)} 
                  onCancel={onCancel}
                  setIsWriting={setIsWriting}
                />
              )}
              {activeTab === 'shooter' && (
                <GameShooter 
                  lesson={lesson} 
                  settings={settings} 
                  onComplete={(stats) => handlePartComplete('shooter', stats)} 
                  onCancel={onCancel}
                  setIsWriting={setIsWriting}
                />
              )}
              {activeTab === 'wordShooter' && (
                <GameWordShooter 
                  lesson={lesson} 
                  settings={settings} 
                  onComplete={(stats) => handlePartComplete('wordShooter', stats)} 
                  onCancel={onCancel}
                  setIsWriting={setIsWriting}
                />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, ChevronsRight } from 'lucide-react';

interface VerticalTimerProps {
  isWriting: boolean;
}

export const VerticalTimer: React.FC<VerticalTimerProps> = ({ isWriting }) => {
  const [time, setTime] = useState(10 * 60); // 10 minutes in seconds
  const [maxTime, setMaxTime] = useState(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && isWriting) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isWriting]);

  useEffect(() => {
    if (isWriting && !isRunning) {
      setIsRunning(true);
    }
  }, [isWriting, isRunning]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const addTime = (seconds: number) => {
    setTime(prevTime => prevTime + seconds);
    setMaxTime(prevMax => Math.max(prevMax, time + seconds));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = maxTime > 0 ? Math.max(0, Math.min(1, time / maxTime)) : 0;

  if (isCollapsed) {
    return (
      <div
        className="fixed left-0 top-1/2 -translate-y-1/2 p-2 cursor-pointer"
        onClick={() => setIsCollapsed(false)}
      >
        <div className="relative w-6 h-128 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
          <div
            className="absolute bottom-0 left-0 right-0 bg-blue-500/60 dark:bg-blue-400/70 transition-all"
            style={{ height: `${progress * 100}%` }}
          />
          <div className="relative z-10 w-full h-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 opacity-0">
            {/* keep invisible text for layout stability */}
            {formatTime(time)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-lg border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4">
      <button onClick={() => setIsCollapsed(true)} className="absolute -right-2 -top-2 bg-slate-200 dark:bg-slate-700 rounded-full p-1">
        <ChevronsRight className="w-5 h-5 text-slate-600 dark:text-slate-300 transform rotate-180" />
      </button>

      <div className="text-4xl font-extrabold text-slate-700 dark:text-slate-200 font-mono" style={{ fontFeatureSettings: "'tnum'" }}>
        {formatTime(time)}
      </div>

      <button
        onClick={handleStartStop}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all text-white ${
          isRunning ? 'bg-red-500 border-b-4 border-red-600 hover:bg-red-400' : 'bg-green-500 border-b-4 border-green-600 hover:bg-green-400'
        }`}
      >
        {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        <span>{isRunning ? 'Pauza' : 'Start'}</span>
      </button>

      <div className="flex gap-2 w-full">
        <button
          onClick={() => addTime(60)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold rounded-lg border-b-2 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900"
        >
          <Plus className="w-4 h-4" />
          1m
        </button>
        <button
          onClick={() => addTime(5 * 60)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold rounded-lg border-b-2 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900"
        >
          <Plus className="w-4 h-4" />
          5m
        </button>
      </div>
    </div>
  );
};

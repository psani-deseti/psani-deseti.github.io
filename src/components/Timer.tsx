import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, RotateCw } from 'lucide-react';

interface TimerProps {
  isWriting: boolean;
  onTimeUp: () => void;
}

export const Timer: React.FC<TimerProps> = ({ isWriting, onTimeUp }) => {
  const [time, setTime] = useState(10 * 60); // 10 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && isWriting) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            onTimeUp();
            return 0;
          }
          return prevTime - 1;
        });
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
  }, [isRunning, isWriting, onTimeUp]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const addTime = (seconds: number) => {
    setTime(prevTime => prevTime + seconds);
  };

  const resetTimer = () => {
    setTime(10 * 60);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="fixed top-1/2 -translate-y-1/2 right-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4">
      <div className="text-4xl font-extrabold text-slate-700 dark:text-slate-200" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(time)}
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleStartStop}
          className={`w-full px-3 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
            isRunning 
              ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          <span>{isRunning ? 'Pauza' : 'Start'}</span>
        </button>
        <div className="flex gap-2">
          <button onClick={() => addTime(60)} className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-blue-600 transition-colors">
            <Plus className="w-4 h-4" />1m
          </button>
          <button onClick={() => addTime(300)} className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-blue-600 transition-colors">
            <Plus className="w-4 h-4" />5m
          </button>
        </div>
        <button onClick={resetTimer} className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
          <RotateCw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  );
};

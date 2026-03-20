import React from 'react';

interface KeyboardProps {
  activeChar: string;
  showAllColors?: boolean;
  learnedLetters?: Set<string>;
}

const fingerColors: Record<number, string> = {
  1: 'bg-pink-400',
  2: 'bg-purple-400',
  3: 'bg-blue-400',
  4: 'bg-cyan-400',
  5: 'bg-emerald-400',
  6: 'bg-yellow-400',
  7: 'bg-orange-400',
  8: 'bg-red-400',
  9: 'bg-slate-300',
};

const fingerBorders: Record<number, string> = {
  1: 'border-pink-500',
  2: 'border-purple-500',
  3: 'border-blue-500',
  4: 'border-cyan-500',
  5: 'border-emerald-500',
  6: 'border-yellow-500',
  7: 'border-orange-500',
  8: 'border-red-500',
  9: 'border-slate-400',
};

const keyFingerMap: Record<string, number> = {
  ';': 1, '+': 1, 'q': 1, 'a': 1, 'y': 1, 'Q': 1, 'A': 1, 'Y': 1,
  'ě': 2, 'w': 2, 's': 2, 'x': 2, 'W': 2, 'S': 2, 'X': 2,
  'š': 3, 'e': 3, 'd': 3, 'c': 3, 'E': 3, 'D': 3, 'C': 3,
  'č': 4, 'r': 4, 'f': 4, 'v': 4, 'ř': 4, 't': 4, 'g': 4, 'b': 4, 'R': 4, 'F': 4, 'V': 4, 'T': 4, 'G': 4, 'B': 4,
  'ž': 5, 'z': 5, 'h': 5, 'n': 5, 'ý': 5, 'u': 5, 'j': 5, 'm': 5, 'Z': 5, 'H': 5, 'N': 5, 'U': 5, 'J': 5, 'M': 5,
  'á': 6, 'i': 6, 'k': 6, ',': 6, 'I': 6, 'K': 6,
  'í': 7, 'o': 7, 'l': 7, '.': 7, 'O': 7, 'L': 7,
  'é': 8, 'p': 8, 'ů': 8, '-': 8, '=': 8, 'ú': 8, '§': 8, ')': 8, 'P': 8, 'Ů': 8,
  ' ': 9,
};

const rows = [
  [';', '+', 'ě', 'š', 'č', 'ř', 'ž', 'ý', 'á', 'í', 'é', '=', '´', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ú', ')', 'Enter'],
  ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ů', '§', '\\'],
  ['ShiftLeft', 'y', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-', 'ShiftRight'],
  ['Ctrl', 'Win', 'Alt', 'Space', 'AltGr', 'Win', 'Menu', 'CtrlRight']
];

export const Keyboard: React.FC<KeyboardProps> = ({ activeChar, showAllColors = false, learnedLetters }) => {
  const isUpper = activeChar !== activeChar.toLowerCase() && activeChar.toLowerCase() !== activeChar.toUpperCase();
  const lowerChar = activeChar.toLowerCase();

  const isShiftActive = isUpper;

  return (
    <div className="flex flex-col gap-4">
      {showAllColors && !learnedLetters && (
        <div className="flex justify-center gap-2 sm:gap-6 mb-2 flex-wrap">
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-pink-400"></div><span className="text-xs font-bold text-slate-500">Levý malíček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-purple-400"></div><span className="text-xs font-bold text-slate-500">Levý prsteníček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-blue-400"></div><span className="text-xs font-bold text-slate-500">Levý prostředníček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-cyan-400"></div><span className="text-xs font-bold text-slate-500">Levý ukazováček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-emerald-400"></div><span className="text-xs font-bold text-slate-500">Pravý ukazováček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-yellow-400"></div><span className="text-xs font-bold text-slate-500">Pravý prostředníček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-orange-400"></div><span className="text-xs font-bold text-slate-500">Pravý prsteníček</span></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-red-400"></div><span className="text-xs font-bold text-slate-500">Pravý malíček</span></div>
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-4 sm:p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-b-8 select-none overflow-x-auto scrollbar-hide">
        {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5 min-w-max">
          {row.map((key) => {
            const displayKey = key === 'ShiftLeft' || key === 'ShiftRight' ? 'Shift' : key === 'CtrlRight' ? 'Ctrl' : key;
            let isKeyActive = false;
            if (key === 'Space' && activeChar === ' ') isKeyActive = true;
            else if (key === 'ShiftLeft' && isShiftActive && keyFingerMap[lowerChar] >= 5) isKeyActive = true;
            else if (key === 'ShiftRight' && isShiftActive && keyFingerMap[lowerChar] <= 4) isKeyActive = true;
            else if (key.length === 1 && key.toLowerCase() === lowerChar) isKeyActive = true;

            let finger = keyFingerMap[key.toLowerCase()] || 8;
            if (key === 'Space') finger = 9;
            if (key === 'ShiftLeft' || key === 'Caps' || key === 'Tab' || key === 'Ctrl' || key === 'Win' || key === 'Alt') finger = 1;
            if (key === 'Enter' || key === 'Backspace' || key === 'ShiftRight' || key === 'CtrlRight' || key === 'Menu' || key === 'AltGr' || key === '\\') finger = 8;

            const baseClasses = "flex items-center justify-center rounded-xl font-mono text-sm font-extrabold transition-all duration-100 border-2";
            
            const isLearned = learnedLetters ? learnedLetters.has(key.toLowerCase()) : true;
            const isSpecialKey = key.length > 1;

            let inactiveClasses = `bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 border-b-4`;
            if (showAllColors) {
              inactiveClasses = `${fingerColors[finger]} text-white border-b-4 ${fingerBorders[finger]} opacity-80`;
            }

            if (learnedLetters && !isLearned && !isSpecialKey) {
              inactiveClasses = `bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 border-b-2 opacity-30`;
            } else if (learnedLetters && isLearned && !isSpecialKey) {
              inactiveClasses = `${fingerColors[finger]} text-white border-b-4 ${fingerBorders[finger]} shadow-[0_0_10px_rgba(0,0,0,0.1)] outline outline-2 outline-white/30`;
            }

            const activeClasses = `${fingerColors[finger]} text-white border-b-0 translate-y-1 ${fingerBorders[finger]}`;
            
            let widthClass = "w-10 h-10 sm:w-12 sm:h-12";
            if (key === 'Space') widthClass = "w-64 h-10 sm:h-12";
            if (key === 'ShiftLeft') widthClass = "w-20 h-10 sm:h-12";
            if (key === 'ShiftRight') widthClass = "w-28 h-10 sm:h-12";
            if (key === 'Caps') widthClass = "w-16 h-10 sm:h-12";
            if (key === 'Tab') widthClass = "w-14 h-10 sm:h-12";
            if (key === 'Enter') widthClass = "w-24 h-10 sm:h-12";
            if (key === 'Backspace') widthClass = "w-24 h-10 sm:h-12";
            if (key === 'Ctrl' || key === 'CtrlRight' || key === 'Win' || key === 'Alt' || key === 'AltGr' || key === 'Menu') widthClass = "w-12 h-10 sm:w-14 sm:h-12";

            return (
              <div
                key={key}
                className={`${baseClasses} ${widthClass} ${isKeyActive ? activeClasses : inactiveClasses}`}
              >
                {key === 'Space' ? '' : displayKey}
              </div>
            );
          })}
        </div>
      ))}
      
      {/* Hand indicators */}
      <div className="flex justify-center gap-16 mt-8">
        <Hand isLeft activeFinger={showAllColors ? null : (isShiftActive && keyFingerMap[lowerChar] >= 5 ? 1 : (keyFingerMap[lowerChar] <= 4 ? keyFingerMap[lowerChar] : (activeChar === ' ' ? 9 : null)))} showAllColors={showAllColors} />
        <Hand isLeft={false} activeFinger={showAllColors ? null : (isShiftActive && keyFingerMap[lowerChar] <= 4 ? 8 : (keyFingerMap[lowerChar] >= 5 && keyFingerMap[lowerChar] <= 8 ? keyFingerMap[lowerChar] : (activeChar === ' ' ? 9 : null)))} showAllColors={showAllColors} />
      </div>
    </div>
    </div>
  );
};

const Hand: React.FC<{ isLeft: boolean; activeFinger: number | null; showAllColors?: boolean }> = ({ isLeft, activeFinger, showAllColors }) => {
  const fingers = isLeft ? [1, 2, 3, 4, 9] : [9, 5, 6, 7, 8];
  
  return (
    <div className="flex items-end gap-1 h-24">
      {fingers.map((f) => {
        const isActive = showAllColors || activeFinger === f;
        let height = 'h-16';
        if (f === 3 || f === 6) height = 'h-24';
        else if (f === 2 || f === 7 || f === 4 || f === 5) height = 'h-20';
        else if (f === 9) height = 'h-12';

        let width = f === 9 ? 'w-8' : 'w-6';
        const color = isActive ? fingerColors[f] : 'bg-slate-200 dark:bg-slate-600';
        const border = isActive ? fingerBorders[f] : 'border-slate-300 dark:border-slate-500';
        
        let transform = '';
        if (f === 9) {
          transform = isLeft ? 'ml-4 rotate-[30deg] origin-bottom-left' : 'mr-4 -rotate-[30deg] origin-bottom-right';
        }
        
        return (
          <div
            key={f}
            className={`${width} ${height} ${color} rounded-t-full border-2 ${border} transition-colors duration-200 ${transform}`}
          />
        );
      })}
    </div>
  );
};

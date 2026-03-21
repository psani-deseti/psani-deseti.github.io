import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Crosshair, Keyboard as KeyboardIcon, Play, Type } from 'lucide-react';
import { Keyboard } from './Keyboard';

export interface PracticeSettings {
  letters: string[];
  mode: 'classic' | 'shooter';
  lengthType: 'time' | 'chars';
  length: number;
}

interface PracticeHubProps {
  onStartPractice: (settings: PracticeSettings) => void;
  learnedLetters?: Set<string>;
}

const MODE_CARDS = [
  {
    id: 'classic' as const,
    icon: KeyboardIcon,
    title: 'Klasicke psani',
    description: 'Opisujes nahodne vygenerovany text z vybranych pismen.',
    activeClasses: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
  },
  {
    id: 'shooter' as const,
    icon: Crosshair,
    title: 'Strileni pismen',
    description: 'Trefuj padajici pismena co nejrychleji a co nejpresneji.',
    activeClasses: 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
  },
];

const LENGTH_CARDS = [
  {
    id: 'chars' as const,
    icon: Type,
    title: 'Podle znaku',
    description: 'Cviceni skonci po urcenem poctu znaku.',
    min: 25,
    max: 300,
    step: 25,
    suffix: 'znaku',
    defaultValue: 100,
    activeClasses: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  },
  {
    id: 'time' as const,
    icon: Clock3,
    title: 'Podle casu',
    description: 'Cviceni pobezi po nastavenou dobu.',
    min: 30,
    max: 300,
    step: 30,
    suffix: 'sek',
    defaultValue: 60,
    activeClasses: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  },
];

export const PracticeHub: React.FC<PracticeHubProps> = ({ onStartPractice, learnedLetters }) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [gameMode, setGameMode] = useState<'classic' | 'shooter'>('classic');
  const [gameLength, setGameLength] = useState<'time' | 'chars'>('chars');
  const [gameLengthValue, setGameLengthValue] = useState<number>(100);

  const selectedLetters = useMemo(() => Array.from(selectedKeys).sort(), [selectedKeys]);
  const selectedLengthCard = LENGTH_CARDS.find((card) => card.id === gameLength) ?? LENGTH_CARDS[0];

  useEffect(() => {
    if (!learnedLetters || learnedLetters.size === 0) return;
    setSelectedKeys(new Set(Array.from(learnedLetters).map((letter) => String(letter).toLowerCase())));
  }, [learnedLetters]);

  useEffect(() => {
    setGameLengthValue(selectedLengthCard.defaultValue);
  }, [selectedLengthCard]);

  const handleKeyClick = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleStartClick = () => {
    if (selectedLetters.length === 0) return;

    onStartPractice({
      letters: selectedLetters,
      mode: gameMode,
      lengthType: gameLength,
      length: gameLengthValue,
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-700 dark:text-slate-200">
                <KeyboardIcon className="h-3.5 w-3.5 text-blue-500" />
                Vlastni trenink
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                Vyber pismena a hned hraj
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                Po otevreni jsou predvybrana vsechna naucena pismena. Kliknutim na klavesy vyber upravis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[360px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Vybrano</div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{selectedLetters.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Rezim</div>
                <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">
                  {gameMode === 'classic' ? 'Psani' : 'Strilecka'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50 col-span-2 sm:col-span-1">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Delka</div>
                <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">
                  {gameLengthValue} {selectedLengthCard.suffix}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40 sm:p-4">
            <Keyboard
              activeChar=""
              showAllColors={false}
              learnedLetters={new Set()}
              onKeyClick={handleKeyClick}
              selectedLetters={selectedKeys}
            />
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            {selectedLetters.length > 0
              ? `Vybrana pismena: ${selectedLetters.join(' ')}`
              : 'Vyber aspon jedno pismeno.'}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.8)] dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">1. Rezim</h3>
            <div className="mt-4 grid gap-3">
              {MODE_CARDS.map((card) => {
                const Icon = card.icon;
                const isActive = gameMode === card.id;

                return (
                  <button
                    key={card.id}
                    onClick={() => setGameMode(card.id)}
                    className={`rounded-[1.25rem] border-2 p-4 text-left transition-all ${
                      isActive
                        ? card.activeClasses
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-slate-800/80">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-black">{card.title}</div>
                        <p className="mt-1 text-sm font-medium opacity-80">{card.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">2. Delka</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {LENGTH_CARDS.map((card) => {
                const Icon = card.icon;
                const isActive = gameLength === card.id;

                return (
                  <button
                    key={card.id}
                    onClick={() => setGameLength(card.id)}
                    className={`rounded-[1.25rem] border-2 p-4 text-left transition-all ${
                      isActive
                        ? card.activeClasses
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-slate-800/80">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-black">{card.title}</div>
                        <p className="mt-1 text-sm font-medium opacity-80">{card.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Nastaveni</div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-50">{gameLengthValue}</div>
                </div>
                <div className="pb-1 text-sm font-bold text-slate-400">{selectedLengthCard.suffix}</div>
              </div>

              <input
                type="range"
                min={selectedLengthCard.min}
                max={selectedLengthCard.max}
                step={selectedLengthCard.step}
                value={gameLengthValue}
                onChange={(e) => setGameLengthValue(Number(e.target.value))}
                className="mt-4 w-full accent-blue-500"
              />
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">3. Spusteni</div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {selectedLetters.length > 0
                ? `Procvicis ${selectedLetters.join(', ')} v rezimu ${gameMode === 'classic' ? 'psani' : 'strilecka'} na ${gameLengthValue} ${selectedLengthCard.suffix}.`
                : 'Bez vybranych pismen trenink nespustis.'}
            </p>

            <button
              onClick={handleStartClick}
              disabled={selectedLetters.length === 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] bg-emerald-500 px-6 py-4 text-lg font-black text-white border-b-[6px] border-emerald-600 transition-all hover:bg-emerald-400 hover:translate-y-[2px] hover:border-b-[4px] active:translate-y-[6px] active:border-b-0 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-300"
            >
              <Play className="h-5 w-5 fill-current" />
              Spustit
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

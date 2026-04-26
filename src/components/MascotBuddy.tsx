import { useMemo, useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface ConversationOption {
  text: string;
  responses: string[];
  weight: number; // Probability weight for selection
}

interface MascotBuddyProps {
  messages: string[];
  onOpenCalendar: () => void;
  accuracy?: number;
  screen: string;
  isWriting: boolean;
}

type MascotState = 'idle' | 'bored1' | 'bored2' | 'bored3' | 'click' | 'speaking' | 'sleeping' | 'happy' | 'motivational';

const conversationOptions: ConversationOption[] = [
    {
        text: 'Ahoj!',
        responses: [
            'Ahojkyyy 🦔✨',
            'Čauuu! Ježurečka tě vítá 😄',
            'Nazdárek! Jdeme psát?',
            'ahoj'
        ],
        weight: 2
    },
    {
        text: 'Jak se máš?',
        responses: [
            'super',
            'mam se pinbove',
            '67676767',
            'Funguju na 670% energie ✨',
            'Jsem ready na psaní! 🎮'
        ],
        weight: 2
    },
    {
        text: 'Motivuj mě',
        responses: [
            'Ty to zvládneš! 🦔💪',
            'Malý krok = velký ježek 🧠✨',
            'Pinba ti věří! 🌟',
            'Když spadneš, vstaneš ještě silnější! 💛',
            'Jsi šikula, fakt jo! 😄',
            'Pinbítko to dá'
        ],
        weight: 4
    },
    {
        text: 'Co děláš?',
        responses: [
            'Hlídám ti dobrodružství 🦔👀',
            'koukám',
            'povídám si s tebou',
            'Hraju roblox',
            'nudim se',
            'píšu všema deseti, jako ty, tak šup šup'
        ],
        weight: 4
    },
    {
        text: 'Pomoz mi',
        responses: [
            'Pinba ti pomůže! 🦔💛',
            'Neboj, jsem tady s tebou 😊',
            'Řekni mi to pomalu, já poslouchám 👂✨',
            'Společně to zvládneme 💪'
        ],
        weight: 3
    },
    {
        text: 'Díky',
        responses: [
            'Není zač! 🦔✨',
            'Rádo se stalo 😄',
            'Jupíí, pomohl jsem! 🎉',
            'Ježurka má radost'
        ],
        weight: 3
    },
    {
        text: 'Jaký je tvůj oblíbený písmeno?',
        responses: [
            'Všechna písmena mám rád, ale asi nejradši mám P jako Pinba! 🦔✨',
            'Všechna písmena mám rád, ale asi nejradši mám K jako Kuba',
            'Všechna písmena mám rád, ale asi nejradši mám J jako ježek 😄',
            'Všechna písmena mám rád!'
        ],
        weight: 1
    },
    {
        text: 'Jsem unavený',
        responses: [
            'Odpočiň si, je to v pohodě 💤🦔',
            'tak si dej pauzu',
            'tak se vyspi, já taky pudu spát (můžes se koukat)',
            'tak se za chvíli zas uvidíme, ok?'
        ],
        weight: 2
    },

    {
        text: 'Chci si hrát',
        responses: [
            'psaní je zábava, pojďme na to! 🦔✨',
            'už se těším',
            'Co budeme dělat? Psát nebo psát a pak hrát? 🎮',
            'Psaní time'
        ],
        weight: 3
    },

    {
        text: 'Mám nápad',
        responses: [
            'Povídej povídej! 🧠✨',
            'mmm, tak prvně dopiš a pak mi řekni! 🦔😄',
            'to mi ho napiš všema deseti!',
            'už se těšim'
        ],
        weight: 3
    },

    {
        text: 'SUPER TAJNÁ ZPRÁVA',
        responses: [
            'Wow, to je tajné! 🤫🦔',
            'Já jsem zvědavý! 👀✨',
            'Můžeš mi to říct? 😄',
            'řekni mi to PLS'
        ],
        weight: 4
    },

    {
        text: 'Už chci na Roblox',
        responses: [
            'JOOOO ROBLOX TIME 🎮🔥 (prvně ale dopiš)',
            'prvně psát, a pak Roblox',
            'ž za chvíli',
            'mmmmm tak dopiš a pak Roblox, slibuju! 🦔✨',
            'Roblox je super, ale Pinba je nejlepší! 😄'
        ],
        weight: 5
    },

    {
        text: 'Co je Pinba?',
        responses: [
            'všichni',
            'Ty!',
            '...',
            'to snad víě pinbítko'
        ],
        weight: 2
    }
];

const getRandomMessageIndex = (currentIndex: number, length: number) => {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === currentIndex) {
    next = Math.floor(Math.random() * length);
  }
  return next;
};

// Select 3 random conversation options based on weights
const selectRandomConversationOptions = (): ConversationOption[] => {
  let totalWeight = conversationOptions.reduce((sum, option) => sum + option.weight, 0);
  const selected: ConversationOption[] = [];
  const available = [...conversationOptions];

  for (let i = 0; i < 4 && available.length > 0; i++) {
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let j = 0; j < available.length; j++) {
      random -= available[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }
    
    selected.push(available[selectedIndex]);
    totalWeight -= available[selectedIndex].weight;
    available.splice(selectedIndex, 1);
  }
  
  return selected;
};

export const MascotBuddy = ({ messages, onOpenCalendar, accuracy, screen, isWriting }: MascotBuddyProps) => {
  const [open, setOpen] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [state, setState] = useState<MascotState>('idle');
  const [showConversation, setShowConversation] = useState(false);
  const [conversationResponse, setConversationResponse] = useState<string>('');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [currentConversationOptions, setCurrentConversationOptions] = useState<ConversationOption[]>([]);
  const [talkingFrame, setTalkingFrame] = useState(0);
  const boredTimerRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const talkingTimerRef = useRef<number | null>(null);
  const specialCycleRef = useRef<number | null>(null);
  const textTimerRef = useRef<number | null>(null);

  const currentMessage = useMemo(() => messages[currentMessageIndex] ?? '', [messages, currentMessageIndex]);

  // Determine mascot state based on accuracy and activity
  useEffect(() => {
    if (accuracy !== undefined && accuracy >= 95 && screen === 'evaluation') {
      setState('idle');
    } else if (accuracy !== undefined && accuracy >= 80 && screen === 'evaluation') {
      setState('happy');
    } else if (accuracy !== undefined && accuracy < 80 && screen === 'evaluation') {
      setState('motivational');
    } else if (!isWriting && screen !== 'game') {
      // Start sleep timer if not writing and not in game
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = setTimeout(() => {
        setState('sleeping');
      }, 20000); // 20 seconds
    } else {
      // Reset to idle if writing or in game
      if (state === 'sleeping' || state === 'happy' || state === 'motivational') {
        setState('idle');
      }
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    }
  }, [accuracy, screen, isWriting]);

  useEffect(() => {
    if (accuracy !== undefined && accuracy >= 95 && screen === 'evaluation') {
      const cycleStates: MascotState[] = ['idle', 'motivational', 'idle', 'happy'];
      let cycleIndex = 0;
      setState(cycleStates[cycleIndex]);
      if (specialCycleRef.current) {
        window.clearInterval(specialCycleRef.current);
      }
      specialCycleRef.current = window.setInterval(() => {
        cycleIndex = (cycleIndex + 1) % cycleStates.length;
        setState((current: MascotState) => {
          if (current === 'click' || current === 'speaking' || current === 'sleeping') {
            return current;
          }
          return cycleStates[cycleIndex];
        });
      }, 800);
      return () => {
        if (specialCycleRef.current) {
          window.clearInterval(specialCycleRef.current);
          specialCycleRef.current = null;
        }
      };
    }
    if (specialCycleRef.current) {
      window.clearInterval(specialCycleRef.current);
      specialCycleRef.current = null;
    }
  }, [accuracy, screen]);

  // Bored animations every 8 seconds (only when idle and not sleeping / not on evaluation)
  useEffect(() => {
    const scheduleBoredAnimation = () => {
      boredTimerRef.current = window.setTimeout(() => {
        if (state === 'idle' && !isWriting && screen !== 'evaluation') {
          const boredStates: MascotState[] = ['bored1', 'bored2', 'bored3'];
          const randomBored = boredStates[Math.floor(Math.random() * boredStates.length)];
          setState(randomBored);
          window.setTimeout(() => {
            setState((current: MascotState) => current === randomBored ? 'idle' : current);
          }, 3000); // Assume 3 seconds for bored animation
        }
        scheduleBoredAnimation();
      }, 8000); // 8 seconds
    };
    scheduleBoredAnimation();
    return () => {
      if (boredTimerRef.current) window.clearTimeout(boredTimerRef.current);
    };
  }, [state, isWriting, screen]);

  // Talking animation (alternate between idle and talking/motivational/happy every 0.2 seconds)
  useEffect(() => {
    if (state === 'speaking' || state === 'motivational' || state === 'happy') {
      talkingTimerRef.current = window.setInterval(() => {
        setTalkingFrame((prev: number) => prev + 1);
      }, 150);
    } else {
      if (talkingTimerRef.current) window.clearInterval(talkingTimerRef.current);
      setTalkingFrame(0);
    }
    return () => {
      if (talkingTimerRef.current) window.clearInterval(talkingTimerRef.current);
    };
  }, [state]);

  // Typewriter effect for conversation responses
  useEffect(() => {
    if (!conversationResponse || state !== 'speaking') {
      return;
    }

    if (textTimerRef.current) {
      clearTimeout(textTimerRef.current);
      textTimerRef.current = null;
    }

    const response = conversationResponse;
    setDisplayedText('');
    let index = 0;
    const typeText = () => {
      if (index < response.length) {
        setDisplayedText(response.slice(0, index + 1));
        index++;
        textTimerRef.current = window.setTimeout(typeText, 50); // 50ms per character
      } else {
        setState('idle');
        setCurrentConversationOptions(selectRandomConversationOptions());
      }
    };
    typeText();

    return () => {
      if (textTimerRef.current) {
        clearTimeout(textTimerRef.current);
        textTimerRef.current = null;
      }
    };
  }, [conversationResponse, state]);

  const getImageSrc = () => {
    switch (state) {
      case 'bored1': return '/images/bored1.png';
      case 'bored2': return '/images/bored2.png';
      case 'bored3': return '/images/bored3.png';
      case 'click': return '/images/click.png';
      case 'speaking': return talkingFrame % 2 === 0 ? '/images/idle.png' : '/images/talking.png';
      case 'sleeping': return '/images/sleeping.png';
      case 'happy': return talkingFrame % 2 === 0 ? '/images/idle.png' : '/images/happy.png';
      case 'motivational': return talkingFrame % 2 === 0 ? '/images/idle.png' : '/images/motivational.png';
      default: return '/images/idle.png';
    }
  };

  const handleToggle = () => {
    setOpen((prev: boolean) => !prev);
    if (!open) {
      // Wake up if sleeping
      if (state === 'sleeping') {
        setState('idle');
        if (sleepTimerRef.current) {
          clearTimeout(sleepTimerRef.current);
          sleepTimerRef.current = null;
        }
      }
      setState('click');
      setShowConversation(true);
      setConversationResponse('');
      setDisplayedText('');
      // Generate new random conversation options
      setCurrentConversationOptions(selectRandomConversationOptions());
    } else {
      setState('idle');
      setShowConversation(false);
      setConversationResponse('');
      setDisplayedText('');
    }
  };

  const handleNext = () => {
    setCurrentMessageIndex((prev: number) => getRandomMessageIndex(prev, messages.length));
  };

  const handleConversationOption = (option: ConversationOption) => {
    const randomResponse = option.responses.length > 0
      ? option.responses[Math.floor(Math.random() * option.responses.length)]
      : '';
    setConversationResponse(randomResponse || '');
    setState('speaking');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-black text-emerald-600">Ježurka</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenCalendar}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Otevřít kalendář"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
          </div>

          {showConversation ? (
            <div className="mt-4 space-y-3">
              {conversationResponse && (
                <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-slate-700 dark:bg-emerald-900/20 dark:text-emerald-200">
                  {displayedText}
                  {state === 'speaking' && displayedText.length < conversationResponse.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Co chceš říct?</div>
                <div className="grid grid-cols-2 gap-2">
                  {currentConversationOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleConversationOption(option)}
                      className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-sm text-slate-700 dark:bg-emerald-900/20 dark:text-emerald-200">
              {currentMessage}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            {!showConversation && (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 rounded-2xl bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-colors"
              >
                Další
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setState('idle');
                setShowConversation(false);
              }}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <img
          src={getImageSrc()}
          className="shadow-lg object-contain"
          onClick={handleToggle}
          style={{ cursor: 'pointer', width: 108.8, height: 145.5 }}
          alt="Ježurka"
        />
        {!open && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            ?
          </div>
        )}
      </div>
    </div>
  );
};

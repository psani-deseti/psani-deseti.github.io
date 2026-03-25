let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor();
  }

  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume();
  }

  return sharedAudioContext;
};

const playTone = (
  audioCtx: AudioContext,
  {
    frequency,
    duration,
    type = 'sine',
    volume = 0.04,
    startOffset = 0,
  }: {
    frequency: number;
    duration: number;
    type?: OscillatorType;
    volume?: number;
    startOffset?: number;
  },
) => {
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const startAt = audioCtx.currentTime + startOffset;
  const attackAt = startAt + 0.01;
  const endAt = startAt + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, attackAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt);
};

export const playCountdownBeep = (count: number) => {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  const frequencyMap: Record<number, number> = {
    3: 523.25,
    2: 587.33,
    1: 659.25,
  };

  playTone(audioCtx, {
    frequency: frequencyMap[count] ?? 523.25,
    duration: 0.18,
    type: 'triangle',
    volume: 0.03,
  });
};

export const playStartHorn = () => {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  playTone(audioCtx, {
    frequency: 392,
    duration: 0.45,
    type: 'sawtooth',
    volume: 0.025,
  });
  playTone(audioCtx, {
    frequency: 523.25,
    duration: 0.45,
    type: 'triangle',
    volume: 0.02,
    startOffset: 0.02,
  });
};

export const playCorrectHitSound = () => {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  playTone(audioCtx, {
    frequency: 740,
    duration: 0.08,
    type: 'triangle',
    volume: 0.018,
  });
  playTone(audioCtx, {
    frequency: 880,
    duration: 0.09,
    type: 'sine',
    volume: 0.012,
    startOffset: 0.03,
  });
};

export const playErrorSound = () => {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  playTone(audioCtx, {
    frequency: 220,
    duration: 0.12,
    type: 'sawtooth',
    volume: 0.016,
  });
};

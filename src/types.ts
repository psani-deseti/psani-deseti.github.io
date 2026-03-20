export type GameMode = 'standard' | 'shooter' | 'wordShooter' | 'random' | 'challenge';
export type ShooterDifficulty = 'easy' | 'medium' | 'hard';

export interface Settings {
  showTimer: boolean;
  showErrors: boolean;
  strictMode: boolean;
  darkMode: boolean;
  shooterDifficulty: ShooterDifficulty;
}

export interface Lesson {
  id: string | number;
  title: string;
  chars?: string;
  text: string;
}

export interface SubLesson {
  id: string;
  title: string;
  text?: string; // Optional if mode is 'random'
  mode?: GameMode;
  letters?: string;
  examples?: string[];
  words?: string[]; // For random word generation
  max_comb?: number;
  pageCount?: number; // Number of pages to generate in random mode
  pageLength?: number; // Length of text per page in random mode
  wordCount?: number; // Number of words per page in random mode
  pages?: string[]; // For multi-page exercises
  challengeParts?: ('standard' | 'shooter' | 'wordShooter')[]; // Modes included in challenge
  newLetters?: string; // New letters introduced in this lesson
}

export interface Category {
  id: string;
  title: string;
  description: string;
  subLessons: SubLesson[];
}

export interface GameStats {
  wpm: number;
  accuracy: number;
  errors: number;
  timeMs: number;
}

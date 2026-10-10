import { A4_MIDI } from './game/pitch';

export type ReferenceMode = 'a4' | 'fixed' | 'random';

export interface Settings {
  /** 'sine' or a General MIDI soundfont instrument name. */
  instrument: string;
  referenceMode: ReferenceMode;
  /** MIDI note used when referenceMode is 'fixed'. */
  fixedNote: number;
  /** Length of each tone in seconds. */
  toneDuration: number;
}

export interface Stats {
  highScore: number;
  bestLevel: number;
}

const SETTINGS_KEY = 'tones.settings';
const STATS_KEY = 'tones.stats';

export const DEFAULT_SETTINGS: Settings = {
  instrument: 'sine',
  referenceMode: 'a4',
  fixedNote: A4_MIDI,
  toneDuration: 1,
};

const DEFAULT_STATS: Stats = { highScore: 0, bestLevel: 0 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (e.g. private mode); settings just won't persist.
  }
}

export const loadSettings = (): Settings => read(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveSettings = (settings: Settings): void => write(SETTINGS_KEY, settings);

export const loadStats = (): Stats => read(STATS_KEY, DEFAULT_STATS);
export const resetStats = (): void => write(STATS_KEY, DEFAULT_STATS);

/** Record a finished game; returns true if it set a new high score. */
export function recordGame(score: number, levelsCleared: number): boolean {
  const stats = loadStats();
  const isHighScore = score > stats.highScore;
  write(STATS_KEY, {
    highScore: Math.max(stats.highScore, score),
    bestLevel: Math.max(stats.bestLevel, levelsCleared),
  });
  return isHighScore;
}

import type { ClickSound } from './audio/clicks';
import { A4_MIDI } from './game/pitch';

export type ReferenceMode = 'a4' | 'fixed' | 'random';

export interface Settings {
  /** 'sine' or a General MIDI soundfont instrument name. */
  instrument: string;
  referenceMode: ReferenceMode;
  /** MIDI note used when referenceMode is 'fixed'. */
  fixedNote: number;
  /** Inclusive MIDI range used when referenceMode is 'random'. */
  randomMin: number;
  randomMax: number;
  /** Length of each tone in seconds. */
  toneDuration: number;
}

export interface Stats {
  highScore: number;
  bestLevel: number;
}

export interface DroneSettings {
  startNote: number;
  barsPerKey: number;
  /** Semitones from one key to the next. */
  interval: number;
  jumps: number;
  repeat: boolean;
  bpm: number;
  beatsPerBar: number;
  accent: boolean;
  countIn: boolean;
  droneOn: boolean;
  metronomeOn: boolean;
  droneInstrument: string;
  droneVolume: number;
  clickSound: ClickSound;
  clickVolume: number;
  /** Re-strike a sustainable drone every bar; null = decide by instrument. */
  restrike: boolean | null;
}

const SETTINGS_KEY = 'tones.settings';
const STATS_KEY = 'tones.stats';
const DRONE_KEY = 'tones.drones';

export const DEFAULT_SETTINGS: Settings = {
  instrument: 'sine',
  referenceMode: 'random',
  fixedNote: A4_MIDI,
  randomMin: 57, // A3
  randomMax: 84, // C6
  toneDuration: 1,
};

export const DEFAULT_DRONE_SETTINGS: DroneSettings = {
  startNote: 48, // C3
  barsPerKey: 4,
  interval: 7,
  jumps: 11,
  repeat: false,
  bpm: 80,
  beatsPerBar: 4,
  accent: true,
  countIn: true,
  droneOn: true,
  metronomeOn: true,
  droneInstrument: 'sine',
  droneVolume: 0.6,
  clickSound: 'wood',
  clickVolume: 0.8,
  restrike: null,
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

export const loadDroneSettings = (): DroneSettings => read(DRONE_KEY, DEFAULT_DRONE_SETTINGS);
export const saveDroneSettings = (settings: DroneSettings): void => write(DRONE_KEY, settings);

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

import { getAudioContext } from './context';
import { SampledVoice } from './sampledVoice';
import { SineVoice } from './sineVoice';

export interface Voice {
  /** Resolves once the voice can play (samples loaded). */
  readonly ready: Promise<void>;
  /** Schedule a note at `midi` offset by `cents`, starting at AudioContext time `when`. */
  play(midi: number, cents: number, when: number, duration: number): void;
  stop(): void;
}

export const INSTRUMENTS: { id: string; label: string }[] = [
  { id: 'sine', label: 'Sine wave' },
  { id: 'acoustic_grand_piano', label: 'Piano' },
  { id: 'alto_sax', label: 'Alto sax' },
  { id: 'tenor_sax', label: 'Tenor sax' },
  { id: 'flute', label: 'Flute' },
  { id: 'clarinet', label: 'Clarinet' },
  { id: 'oboe', label: 'Oboe' },
  { id: 'trumpet', label: 'Trumpet' },
  { id: 'violin', label: 'Violin' },
  { id: 'cello', label: 'Cello' },
  { id: 'contrabass', label: 'Double bass' },
  { id: 'acoustic_guitar_nylon', label: 'Nylon guitar' },
  { id: 'electric_piano_1', label: 'Electric piano' },
  { id: 'vibraphone', label: 'Vibraphone' },
];

export function instrumentLabel(id: string): string {
  return INSTRUMENTS.find((i) => i.id === id)?.label ?? id;
}

const voices = new Map<string, Voice>();

/** One voice per instrument, kept for the app's lifetime so samples load once. */
export function getVoice(instrument: string): Voice {
  let voice = voices.get(instrument);
  if (!voice) {
    const ctx = getAudioContext();
    voice = instrument === 'sine' ? new SineVoice(ctx) : new SampledVoice(ctx, instrument);
    voices.set(instrument, voice);
    // Let a failed load be retried later (e.g. once back online).
    voice.ready.catch(() => voices.delete(instrument));
  }
  return voice;
}

import { getAudioContext } from './context';
import type { Voice } from './voice';

export const GAP = 0.5;
const LEAD_IN = 0.1;

export interface PairTiming {
  /** Milliseconds from now until each tone starts, and until both have finished. */
  firstStartMs: number;
  secondStartMs: number;
  endMs: number;
}

/** Play the reference tone, a gap, then the comparison tone. */
export function playPair(voice: Voice, midi: number, cents: number, duration: number): PairTiming {
  const ctx = getAudioContext();
  voice.stop();
  const t0 = ctx.currentTime + LEAD_IN;
  const t1 = t0 + duration + GAP;
  voice.play(midi, 0, t0, duration);
  voice.play(midi, cents, t1, duration);
  return {
    firstStartMs: LEAD_IN * 1000,
    secondStartMs: (t1 - ctx.currentTime) * 1000,
    endMs: (t1 + duration - ctx.currentTime) * 1000,
  };
}

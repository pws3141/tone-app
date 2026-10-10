import { Soundfont } from 'smplr';
import type { Voice } from './voice';

/**
 * A General MIDI instrument from the MusyngKite soundfont. Both tones of a trial
 * use the same sample and differ only in detune, so their relative pitch is exact.
 */
export class SampledVoice implements Voice {
  readonly ready: Promise<void>;
  private readonly instrument: Soundfont;

  constructor(ctx: AudioContext, name: string) {
    this.instrument = Soundfont(ctx, { instrument: name, kit: 'MusyngKite' });
    this.ready = this.instrument.ready;
  }

  play(midi: number, cents: number, when: number, duration: number): void {
    this.instrument.start({ note: midi, detune: cents, time: when, duration });
  }

  stop(): void {
    this.instrument.stop();
  }
}

import { Soundfont } from 'smplr';
import { midiToFreq } from '../game/pitch';

/** Instruments with soundfont loop points, so a held note can sustain indefinitely. */
const LOOPABLE = new Set(['tenor_sax', 'flute', 'oboe', 'trumpet', 'violin', 'cello', 'contrabass', 'vibraphone']);
/** Loopable, but naturally dies away, so re-struck by default. */
const DECAYING = new Set(['vibraphone']);

export function canSustain(instrument: string): boolean {
  return instrument === 'sine' || LOOPABLE.has(instrument);
}

/** Whether the drone re-strikes every bar: always for unloopable samples, else the user's choice. */
export function restrikes(instrument: string, preference: boolean | null): boolean {
  if (instrument === 'sine') return false;
  if (!LOOPABLE.has(instrument)) return true;
  return preference ?? DECAYING.has(instrument);
}

export interface Drone {
  readonly ready: Promise<void>;
  /** Start `midi` at `when`, fading out any current note. */
  start(midi: number, when: number): void;
  /** Re-attack the current note (sampled instruments only). */
  restrike(when: number): void;
  stop(when: number): void;
}

const SINE_LEVEL = 0.35;
const FADE = 0.03; // time constant, ~80 ms to settle

class SineDrone implements Drone {
  readonly ready = Promise.resolve();
  private current: { osc: OscillatorNode; gain: GainNode } | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly dest: AudioNode,
  ) {}

  start(midi: number, when: number): void {
    this.stop(when);
    const osc = this.ctx.createOscillator();
    osc.frequency.value = midiToFreq(midi);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.setTargetAtTime(SINE_LEVEL, when, FADE);
    osc.connect(gain).connect(this.dest);
    osc.start(when);
    this.current = { osc, gain };
  }

  restrike(): void {}

  stop(when: number): void {
    if (!this.current) return;
    const { osc, gain } = this.current;
    const t = Math.max(when, this.ctx.currentTime);
    // setTargetAtTime fades from whatever the level is at `t`, so it never jumps.
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, FADE);
    osc.stop(t + FADE * 10);
    osc.onended = () => gain.disconnect();
    this.current = null;
  }
}

class SampledDrone implements Drone {
  readonly ready: Promise<void>;
  private readonly instrument: Soundfont;
  private midi: number | null = null;
  private stopNote: ((time?: number) => void) | null = null;

  constructor(
    ctx: AudioContext,
    dest: AudioNode,
    name: string,
    private readonly restriking: boolean,
  ) {
    this.instrument = Soundfont(ctx, {
      instrument: name,
      kit: 'MusyngKite',
      destination: dest,
      loadLoopData: LOOPABLE.has(name),
    });
    this.ready = this.instrument.ready;
  }

  start(midi: number, when: number): void {
    this.stop(when);
    this.midi = midi;
    // Held until stopped; sustaining instruments loop, re-struck ones just ring out.
    this.stopNote = this.instrument.start({ note: midi, time: when, duration: null, loop: !this.restriking });
  }

  restrike(when: number): void {
    if (this.restriking && this.midi !== null) this.start(this.midi, when);
  }

  stop(when: number): void {
    this.stopNote?.(when);
    this.stopNote = null;
    this.midi = null;
  }
}

export function createDrone(ctx: AudioContext, dest: AudioNode, instrument: string, restrike: boolean): Drone {
  return instrument === 'sine' ? new SineDrone(ctx, dest) : new SampledDrone(ctx, dest, instrument, restrike);
}

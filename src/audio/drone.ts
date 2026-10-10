import { midiToFreq } from '../game/pitch';
import { loadNoteBuffer, loadSoundfontFile } from './soundfontSamples';

/** Instruments whose notes die away: they can't be held, so they're re-struck every bar. */
const DECAYING = new Set(['acoustic_grand_piano', 'acoustic_guitar_nylon', 'electric_piano_1', 'vibraphone']);

export function canSustain(instrument: string): boolean {
  return !DECAYING.has(instrument);
}

/** Whether the drone re-strikes every bar: always for decaying samples, else the user's choice. */
export function restrikes(instrument: string, preference: boolean | null): boolean {
  if (instrument === 'sine') return false;
  if (DECAYING.has(instrument)) return true;
  return preference ?? false;
}

export interface Drone {
  /** Resolves once the instrument can be prepared (sample file fetched). */
  readonly ready: Promise<void>;
  /** Decode the notes about to be played. */
  prepare(midis: number[]): Promise<void>;
  /** Start `midi` at `when`, fading out any current note. */
  start(midi: number, when: number): void;
  /** Re-attack the current note (sampled instruments only). */
  restrike(when: number): void;
  /** Make sure the held note is scheduled up to `until` (call regularly while playing). */
  extend(until: number): void;
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

  prepare(): Promise<void> {
    return Promise.resolve();
  }

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

  extend(): void {}

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

// MusyngKite samples are ~3.1 s: an attack, a steady sustain, then a fade over the last ~0.25 s.
// Held notes loop the steady part by crossfading overlapping copies of it.
const LOOP_START = 0.75;
const LOOP_END = 2.85;
const CROSSFADE = 0.4;
/** Target loudness (RMS) for samples, roughly matching the sine drone. */
const TARGET_RMS = 0.12;
const MAX_GAIN = 12;
const RELEASE = 0.08; // time constant

const fadeIn = Float32Array.from({ length: 64 }, (_, i) => Math.sin(((i / 63) * Math.PI) / 2));
const fadeOut = fadeIn.slice().reverse();

/** Gain that brings a sample's sustain section to TARGET_RMS. */
function normalisingGain(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const from = Math.floor(LOOP_START * buffer.sampleRate);
  const to = Math.min(data.length, Math.floor(LOOP_END * buffer.sampleRate));
  let sum = 0;
  for (let i = from; i < to; i++) sum += data[i] * data[i];
  const rms = Math.sqrt(sum / Math.max(1, to - from));
  return rms > 0 ? Math.min(MAX_GAIN, TARGET_RMS / rms) : 1;
}

interface HeldNote {
  buffer: AudioBuffer;
  output: GainNode;
  sources: Set<AudioBufferSourceNode>;
  /** When the next loop segment should start (Infinity if not sustaining). */
  nextSegment: number;
}

class SampleDrone implements Drone {
  readonly ready: Promise<void>;
  private readonly decoded = new Map<number, { buffer: AudioBuffer; gain: number }>();
  private note: HeldNote | null = null;
  private midi: number | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly dest: AudioNode,
    private readonly instrument: string,
    private readonly restriking: boolean,
  ) {
    this.ready = loadSoundfontFile(instrument).then(() => undefined);
  }

  async prepare(midis: number[]): Promise<void> {
    await Promise.all(
      [...new Set(midis)]
        .filter((m) => !this.decoded.has(m))
        .map(async (m) => {
          const buffer = await loadNoteBuffer(this.ctx, this.instrument, m);
          this.decoded.set(m, { buffer, gain: normalisingGain(buffer) });
        }),
    );
  }

  start(midi: number, when: number): void {
    this.stop(when);
    const sample = this.decoded.get(midi);
    if (!sample) return;
    this.midi = midi;

    const output = this.ctx.createGain();
    output.gain.value = sample.gain;
    output.connect(this.dest);
    const note: HeldNote = { buffer: sample.buffer, output, sources: new Set(), nextSegment: Infinity };
    this.note = note;

    const gain = this.ctx.createGain();
    gain.connect(output);
    const first = this.play(note, gain, when);
    if (!this.restriking && sample.buffer.duration > LOOP_END) {
      // The first play-through fades out as the first loop segment fades in.
      gain.gain.setValueCurveAtTime(fadeOut, when + LOOP_END - CROSSFADE, CROSSFADE);
      first.stop(when + LOOP_END);
      note.nextSegment = when + LOOP_END - CROSSFADE;
      this.extend(when + 4);
    }
  }

  extend(until: number): void {
    const note = this.note;
    if (!note) return;
    const length = LOOP_END - LOOP_START;
    while (note.nextSegment < until) {
      const t = note.nextSegment;
      const gain = this.ctx.createGain();
      // Start silent: the default gain of 1 would leak through for a sample before the curve.
      gain.gain.value = 0;
      gain.connect(note.output);
      gain.gain.setValueCurveAtTime(fadeIn, t, CROSSFADE);
      gain.gain.setValueCurveAtTime(fadeOut, t + length - CROSSFADE, CROSSFADE);
      this.play(note, gain, t, LOOP_START, length);
      note.nextSegment = t + length - CROSSFADE;
    }
  }

  restrike(when: number): void {
    if (this.restriking && this.midi !== null) this.start(this.midi, when);
  }

  stop(when: number): void {
    const note = this.note;
    if (!note) return;
    const t = Math.max(when, this.ctx.currentTime);
    note.output.gain.cancelScheduledValues(t);
    note.output.gain.setTargetAtTime(0, t, RELEASE);
    for (const src of note.sources) src.stop(t + RELEASE * 8);
    this.note = null;
    this.midi = null;
  }

  private play(note: HeldNote, dest: GainNode, when: number, offset = 0, duration?: number): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = note.buffer;
    src.connect(dest);
    src.start(when, offset, duration);
    note.sources.add(src);
    src.onended = () => {
      note.sources.delete(src);
      dest.disconnect();
      if (note.sources.size === 0 && this.note !== note) note.output.disconnect();
    };
    return src;
  }
}

export function createDrone(ctx: AudioContext, dest: AudioNode, instrument: string, restrike: boolean): Drone {
  return instrument === 'sine' ? new SineDrone(ctx, dest) : new SampleDrone(ctx, dest, instrument, restrike);
}

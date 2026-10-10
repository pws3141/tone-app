import { midiToFreq } from '../game/pitch';
import type { Voice } from './voice';

const PEAK_GAIN = 0.25;
const ATTACK = 0.02;
const RELEASE = 0.05;

export class SineVoice implements Voice {
  readonly ready = Promise.resolve();
  private active = new Set<OscillatorNode>();

  constructor(private readonly ctx: AudioContext) {}

  play(midi: number, cents: number, when: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToFreq(midi, cents);

    // Short linear ramps avoid clicks at the start and end of the tone.
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, when + ATTACK);
    gain.gain.setValueAtTime(PEAK_GAIN, when + duration - RELEASE);
    gain.gain.linearRampToValueAtTime(0, when + duration);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(when);
    osc.stop(when + duration);
    this.active.add(osc);
    osc.onended = () => {
      this.active.delete(osc);
      gain.disconnect();
    };
  }

  stop(): void {
    for (const osc of this.active) osc.stop();
    this.active.clear();
  }
}

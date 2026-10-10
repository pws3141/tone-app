export const CLICK_SOUNDS = [
  { id: 'wood', label: 'Wood block' },
  { id: 'clave', label: 'Clave' },
  { id: 'click', label: 'Click' },
  { id: 'beep', label: 'Beep' },
  { id: 'cowbell', label: 'Cowbell' },
] as const;

export type ClickSound = (typeof CLICK_SOUNDS)[number]['id'];

let noise: AudioBuffer | null = null;

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A gain node with a near-instant attack and exponential decay. */
function envelope(ctx: BaseAudioContext, dest: AudioNode, time: number, peak: number, decay: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  gain.connect(dest);
  return gain;
}

function tone(ctx: BaseAudioContext, type: OscillatorType, freq: number, time: number, length: number, dest: AudioNode) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  osc.connect(dest);
  osc.start(time);
  osc.stop(time + length);
  return osc;
}

function noiseBurst(ctx: BaseAudioContext, filter: BiquadFilterType, freq: number, q: number, time: number, dest: AudioNode) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f).connect(dest);
  src.start(time);
  src.stop(time + 0.05);
}

/** Synthesised metronome click; accented clicks are higher and louder. */
export function playClick(ctx: BaseAudioContext, sound: ClickSound, accent: boolean, time: number, dest: AudioNode): void {
  const level = accent ? 1 : 0.6;
  const pitch = accent ? 1.3 : 1;
  switch (sound) {
    case 'wood': {
      const f = 1000 * pitch;
      const osc = tone(ctx, 'sine', f * 1.6, time, 0.08, envelope(ctx, dest, time, 0.9 * level, 0.07));
      osc.frequency.exponentialRampToValueAtTime(f, time + 0.012);
      noiseBurst(ctx, 'bandpass', f * 2.5, 4, time, envelope(ctx, dest, time, 0.5 * level, 0.012));
      break;
    }
    case 'clave':
      tone(ctx, 'sine', 2500 * pitch, time, 0.06, envelope(ctx, dest, time, 0.8 * level, 0.05));
      break;
    case 'click':
      noiseBurst(ctx, 'highpass', 3500 * pitch, 0.7, time, envelope(ctx, dest, time, 1.0 * level, 0.015));
      break;
    case 'beep': {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.4 * level, time + 0.003);
      gain.gain.setValueAtTime(0.4 * level, time + 0.05);
      gain.gain.linearRampToValueAtTime(0, time + 0.06);
      gain.connect(dest);
      tone(ctx, 'sine', 880 * pitch, time, 0.07, gain);
      break;
    }
    case 'cowbell': {
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1000 * pitch;
      band.Q.value = 1;
      band.connect(envelope(ctx, dest, time, 0.5 * level, 0.25));
      tone(ctx, 'square', 540 * pitch, time, 0.3, band);
      tone(ctx, 'square', 800 * pitch, time, 0.3, band);
      break;
    }
  }
}

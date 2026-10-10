import { describe, expect, it } from 'vitest';
import { centsBetween, midiToFreq, noteName, RANDOM_MAX_MIDI, RANDOM_MIN_MIDI, randomMidi } from '../src/game/pitch';

describe('pitch', () => {
  it('uses A4 = 440 Hz standard tuning', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(81)).toBeCloseTo(880, 10);
    expect(midiToFreq(57)).toBeCloseTo(220, 10);
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 4);
  });

  it('applies cent offsets', () => {
    expect(midiToFreq(69, 1200)).toBeCloseTo(880, 10);
    expect(midiToFreq(69, 100)).toBeCloseTo(midiToFreq(70), 10);
    expect(centsBetween(440, midiToFreq(69, 7.3))).toBeCloseTo(7.3, 10);
    expect(centsBetween(440, midiToFreq(69, -1))).toBeCloseTo(-1, 10);
  });

  it('names notes', () => {
    expect(noteName(69)).toBe('A4');
    expect(noteName(60)).toBe('C4');
    expect(noteName(48)).toBe('C3');
    expect(noteName(61)).toBe('C♯4');
  });

  it('picks random notes within C3–C6', () => {
    expect(randomMidi(() => 0)).toBe(RANDOM_MIN_MIDI);
    expect(randomMidi(() => 0.999999)).toBe(RANDOM_MAX_MIDI);
  });
});

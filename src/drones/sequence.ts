export const INTERVALS: { semitones: number; label: string }[] = [
  { semitones: 7, label: '5th up (circle of 5ths)' },
  { semitones: 5, label: '4th up (cycle of 4ths)' },
  { semitones: 1, label: 'Semitone up' },
  { semitones: 11, label: 'Semitone down' },
  { semitones: 2, label: 'Tone up' },
  { semitones: 10, label: 'Tone down' },
  { semitones: 3, label: 'Minor 3rd up' },
  { semitones: 9, label: 'Minor 3rd down' },
  { semitones: 4, label: 'Major 3rd up' },
  { semitones: 8, label: 'Major 3rd down' },
  { semitones: 6, label: 'Tritone' },
];

/**
 * The drone notes for a practice run: `jumps + 1` keys, each `interval` semitones
 * on from the last, placed in the octave nearest the start note ([start − 6, start + 5]).
 */
export function buildKeySequence(startMidi: number, interval: number, jumps: number): number[] {
  return Array.from({ length: jumps + 1 }, (_, k) => {
    const pitchClassOffset = (((k * interval) % 12) + 12) % 12;
    return startMidi + (pitchClassOffset > 5 ? pitchClassOffset - 12 : pitchClassOffset);
  });
}

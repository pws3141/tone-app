export const A4_MIDI = 69;
export const A4_FREQ = 440;

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Frequency of a 12-TET MIDI note (A4 = 440 Hz), optionally offset by cents. */
export function midiToFreq(midi: number, cents = 0): number {
  return A4_FREQ * 2 ** ((midi - A4_MIDI) / 12 + cents / 1200);
}

/** Signed distance in cents from f1 to f2. */
export function centsBetween(f1: number, f2: number): number {
  return 1200 * Math.log2(f2 / f1);
}

export function noteName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Key names as musicians usually spell them (flats for the flat keys). */
const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function keyName(midi: number): string {
  return KEY_NAMES[((midi % 12) + 12) % 12];
}

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** A random MIDI note between `min` and `max` inclusive. */
export function randomMidi(min: number, max: number, rand: () => number = Math.random): number {
  return min + Math.floor(rand() * (max - min + 1));
}

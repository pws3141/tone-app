export const A4_MIDI = 69;
export const A4_FREQ = 440;

/** Random reference notes are drawn from C3–C6 inclusive. */
export const RANDOM_MIN_MIDI = 48;
export const RANDOM_MAX_MIDI = 84;

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

export function randomMidi(rand: () => number = Math.random): number {
  return RANDOM_MIN_MIDI + Math.floor(rand() * (RANDOM_MAX_MIDI - RANDOM_MIN_MIDI + 1));
}

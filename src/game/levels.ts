/** Gap between the two tones (in cents) for each level; the last entry repeats forever. */
export const LEVEL_CENTS = [50, 40, 30, 22, 16, 12, 9, 7, 5, 4, 3, 2, 1];

export const ROUNDS_PER_LEVEL = 5;
export const PASS_THRESHOLD = 4;

const JITTER = 0.1;

export function centsForLevel(level: number): number {
  const index = Math.min(Math.max(level, 1), LEVEL_CENTS.length) - 1;
  return LEVEL_CENTS[index];
}

/** The level's gap with ±10% jitter, rounded to 0.1¢, so it isn't perfectly predictable. */
export function jitteredCents(level: number, rand: () => number = Math.random): number {
  const base = centsForLevel(level);
  const cents = base * (1 + (rand() * 2 - 1) * JITTER);
  return Math.round(cents * 10) / 10;
}

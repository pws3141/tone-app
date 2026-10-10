const SCALE = 500;

/** Points for a correct answer: the smaller the gap, the more points. */
export function pointsFor(cents: number): number {
  return Math.round(SCALE / Math.abs(cents));
}

import { describe, expect, it } from 'vitest';
import { centsForLevel, jitteredCents, LEVEL_CENTS } from '../src/game/levels';
import { pointsFor } from '../src/game/scoring';

describe('levels', () => {
  it('starts at half a semitone and gets strictly closer', () => {
    expect(centsForLevel(1)).toBe(50);
    for (let i = 1; i < LEVEL_CENTS.length; i++) expect(LEVEL_CENTS[i]).toBeLessThan(LEVEL_CENTS[i - 1]);
  });

  it('stays at the smallest gap after the last level', () => {
    expect(centsForLevel(LEVEL_CENTS.length)).toBe(1);
    expect(centsForLevel(50)).toBe(1);
  });

  it('jitters by at most ±10%', () => {
    expect(jitteredCents(1, () => 0)).toBe(45);
    expect(jitteredCents(1, () => 0.5)).toBe(50);
    expect(jitteredCents(1, () => 0.999999)).toBe(55);
  });
});

describe('scoring', () => {
  it('gives more points for smaller gaps', () => {
    expect(pointsFor(50)).toBe(10);
    expect(pointsFor(10)).toBe(50);
    expect(pointsFor(1)).toBe(500);
    expect(pointsFor(-5)).toBe(100);
    expect(pointsFor(2)).toBeGreaterThan(pointsFor(3));
  });
});

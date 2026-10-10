import { describe, expect, it } from 'vitest';
import { buildKeySequence } from '../src/drones/sequence';
import { keyName } from '../src/game/pitch';

const C3 = 48;

describe('buildKeySequence', () => {
  it('goes round the circle of fifths through all 12 keys near the start note', () => {
    const keys = buildKeySequence(C3, 7, 11);
    expect(keys).toHaveLength(12);
    expect(keys.map(keyName).join(' ')).toBe('C G D A E B F♯ D♭ A♭ E♭ B♭ F');
    expect(new Set(keys.map((m) => m % 12)).size).toBe(12);
    for (const m of keys) {
      expect(m).toBeGreaterThanOrEqual(C3 - 6);
      expect(m).toBeLessThanOrEqual(C3 + 5);
    }
    expect(keys.slice(0, 4)).toEqual([48, 43, 50, 45]); // C3 G2 D3 A2
  });

  it('goes round the cycle of fourths', () => {
    expect(buildKeySequence(C3, 5, 3).map(keyName)).toEqual(['C', 'F', 'B♭', 'E♭']);
  });

  it('plays just the start note with 0 jumps', () => {
    expect(buildKeySequence(57, 7, 0)).toEqual([57]);
  });

  it('wraps past 12 keys when there are more jumps', () => {
    const keys = buildKeySequence(C3, 7, 13);
    expect(keys[12]).toBe(C3);
    expect(keys[13]).toBe(43);
  });

  it('handles descending intervals', () => {
    expect(buildKeySequence(C3, 11, 2).map(keyName)).toEqual(['C', 'B', 'B♭']);
  });
});

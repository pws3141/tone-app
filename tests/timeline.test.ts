import { describe, expect, it } from 'vitest';
import { beatInfo, type TimelineConfig } from '../src/drones/timeline';

const cfg: TimelineConfig = { beatsPerBar: 4, barsPerKey: 2, keys: 3, countInBars: 1, repeat: false };

describe('beatInfo', () => {
  it('starts with a count-in bar with no key change', () => {
    for (let n = 0; n < 4; n++) {
      const b = beatInfo(n, cfg);
      expect(b.countIn).toBe(true);
      expect(b.keyStart).toBe(false);
      expect(b.beatInBar).toBe(n);
    }
  });

  it('changes key every barsPerKey bars', () => {
    const keyStarts = Array.from({ length: 28 }, (_, n) => n).filter((n) => beatInfo(n, cfg).keyStart);
    expect(keyStarts).toEqual([4, 12, 20]);
    expect(beatInfo(4, cfg).keyIndex).toBe(0);
    expect(beatInfo(11, cfg).keyIndex).toBe(0);
    expect(beatInfo(12, cfg).keyIndex).toBe(1);
    expect(beatInfo(13, cfg)).toMatchObject({ bar: 0, beatInBar: 1, barStart: false });
    expect(beatInfo(16, cfg)).toMatchObject({ bar: 1, beatInBar: 0, barStart: true, keyStart: false });
  });

  it('is done after the last key', () => {
    expect(beatInfo(27, cfg).done).toBe(false);
    expect(beatInfo(28, cfg)).toMatchObject({ done: true, keyStart: false });
  });

  it('wraps round when repeating', () => {
    const repeat = { ...cfg, repeat: true };
    expect(beatInfo(28, repeat)).toMatchObject({ done: false, keyIndex: 0, keyStart: true });
    expect(beatInfo(36, repeat)).toMatchObject({ keyIndex: 1, keyStart: true });
  });

  it('works without a count-in and with other time signatures', () => {
    const waltz = { ...cfg, beatsPerBar: 3, countInBars: 0 };
    expect(beatInfo(0, waltz)).toMatchObject({ countIn: false, keyStart: true });
    expect(beatInfo(6, waltz)).toMatchObject({ keyIndex: 1, keyStart: true });
    expect(beatInfo(18, waltz).done).toBe(true);
  });
});

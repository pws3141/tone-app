export interface TimelineConfig {
  beatsPerBar: number;
  barsPerKey: number;
  /** Number of keys in the sequence. */
  keys: number;
  countInBars: number;
  repeat: boolean;
}

export interface BeatInfo {
  countIn: boolean;
  /** Bar within the current key (or within the count-in), from 0. */
  bar: number;
  beatInBar: number;
  keyIndex: number;
  /** First beat of a key: the drone changes note here. */
  keyStart: boolean;
  barStart: boolean;
  /** The sequence has finished; nothing plays on this beat. */
  done: boolean;
}

/** What happens on global beat `n` (from 0, count-in included). */
export function beatInfo(n: number, cfg: TimelineConfig): BeatInfo {
  const beatInBar = n % cfg.beatsPerBar;
  const barStart = beatInBar === 0;
  const countInBeats = cfg.countInBars * cfg.beatsPerBar;

  if (n < countInBeats) {
    const bar = Math.floor(n / cfg.beatsPerBar);
    return { countIn: true, bar, beatInBar, keyIndex: 0, keyStart: false, barStart, done: false };
  }

  const totalBars = Math.floor((n - countInBeats) / cfg.beatsPerBar);
  const bar = totalBars % cfg.barsPerKey;
  let keyIndex = Math.floor(totalBars / cfg.barsPerKey);
  const done = keyIndex >= cfg.keys && !cfg.repeat;
  if (done) keyIndex = cfg.keys - 1;
  else keyIndex %= cfg.keys;

  return { countIn: false, bar, beatInBar, keyIndex, keyStart: !done && barStart && bar === 0, barStart, done };
}

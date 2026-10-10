import { noteName } from '../game/pitch';

export const NOTE_MIN = 36; // C2
export const NOTE_MAX = 96; // C7

/** <option> elements for every note from `min` to `max`, with `selected` chosen. */
export function noteOptions(selected: number, min = NOTE_MIN, max = NOTE_MAX): string {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
    .map((m) => `<option value="${m}" ${m === selected ? 'selected' : ''}>${noteName(m)}</option>`)
    .join('');
}

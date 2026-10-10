import { A4_MIDI, noteName, RANDOM_MAX_MIDI, RANDOM_MIN_MIDI, randomMidi } from '../game/pitch';
import type { Settings } from '../storage';

export function referenceLabel(settings: Settings): string {
  switch (settings.referenceMode) {
    case 'a4':
      return 'Reference A4 (440 Hz)';
    case 'fixed':
      return `Reference ${noteName(settings.fixedNote)}`;
    case 'random':
      return `Random reference ${noteName(RANDOM_MIN_MIDI)}–${noteName(RANDOM_MAX_MIDI)}`;
  }
}

export function referencePicker(settings: Settings): () => number {
  switch (settings.referenceMode) {
    case 'a4':
      return () => A4_MIDI;
    case 'fixed':
      return () => settings.fixedNote;
    case 'random':
      return () => randomMidi();
  }
}

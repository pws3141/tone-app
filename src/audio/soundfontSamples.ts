const BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/';
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const files = new Map<string, Promise<Record<string, string>>>();
const buffers = new Map<string, Promise<AudioBuffer>>();

/** Fetch an instrument's MIDI.js soundfont file: one base64 MP3 per note. */
export function loadSoundfontFile(instrument: string): Promise<Record<string, string>> {
  let file = files.get(instrument);
  if (!file) {
    file = fetch(`${BASE_URL}${instrument}-mp3.js`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${instrument} (${res.status})`);
        return res.text();
      })
      .then((text) => {
        // The file is a script: `MIDI.Soundfont.<name> = { "A0": "data:…", … }`.
        const start = text.indexOf('{', text.indexOf(`MIDI.Soundfont.${instrument}`));
        const body = text.slice(start, text.lastIndexOf('}') + 1).replace(/,\s*}$/, '}');
        return JSON.parse(body) as Record<string, string>;
      });
    file.catch(() => files.delete(instrument));
    files.set(instrument, file);
  }
  return file;
}

function midiToSampleName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** The decoded sample for one note, cached. */
export function loadNoteBuffer(ctx: BaseAudioContext, instrument: string, midi: number): Promise<AudioBuffer> {
  const key = `${instrument}:${midi}`;
  let buffer = buffers.get(key);
  if (!buffer) {
    buffer = loadSoundfontFile(instrument).then((file) => {
      const dataUrl = file[midiToSampleName(midi)];
      if (!dataUrl) throw new Error(`No ${instrument} sample for MIDI ${midi}`);
      const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0));
      return ctx.decodeAudioData(bytes.buffer);
    });
    buffer.catch(() => buffers.delete(key));
    buffers.set(key, buffer);
  }
  return buffer;
}

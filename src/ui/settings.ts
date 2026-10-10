import { unlockAudio, getAudioContext } from '../audio/context';
import { getVoice, INSTRUMENTS } from '../audio/voice';
import { noteName, RANDOM_MAX_MIDI, RANDOM_MIN_MIDI } from '../game/pitch';
import { loadSettings, type ReferenceMode, resetStats, saveSettings, type Settings } from '../storage';
import type { Screen } from './nav';
import { referencePicker } from './reference';

const FIXED_NOTE_MIN = 36; // C2
const FIXED_NOTE_MAX = 96; // C7
const DURATIONS = [0.5, 0.75, 1, 1.5, 2];

export const renderSettings: Screen = (root, nav) => {
  let settings: Settings = loadSettings();

  const noteOptions = Array.from({ length: FIXED_NOTE_MAX - FIXED_NOTE_MIN + 1 }, (_, i) => FIXED_NOTE_MIN + i)
    .map((m) => `<option value="${m}" ${m === settings.fixedNote ? 'selected' : ''}>${noteName(m)}</option>`)
    .join('');

  const radio = (mode: ReferenceMode, label: string, extra = '') => `
    <label class="radio">
      <input type="radio" name="referenceMode" value="${mode}" ${settings.referenceMode === mode ? 'checked' : ''}>
      <span>${label}</span>${extra}
    </label>`;

  root.innerHTML = `
    <main class="screen settings">
      <header class="screen-header">
        <button class="btn ghost" data-action="back" aria-label="Back">←</button>
        <h1>Settings</h1>
      </header>

      <section class="card field">
        <label for="instrument">Sound</label>
        <select id="instrument">
          ${INSTRUMENTS.map((i) => `<option value="${i.id}" ${i.id === settings.instrument ? 'selected' : ''}>${i.label}</option>`).join('')}
        </select>
        <p class="hint" data-status></p>
        <button class="btn secondary" data-action="test">▶ Test sound</button>
      </section>

      <section class="card field">
        <span class="field-label">Reference note</span>
        ${radio('a4', 'A4 (440 Hz)')}
        ${radio('fixed', 'Fixed note', `<select id="fixedNote" aria-label="Fixed reference note">${noteOptions}</select>`)}
        ${radio('random', `Random, ${noteName(RANDOM_MIN_MIDI)}–${noteName(RANDOM_MAX_MIDI)}`)}
        <p class="hint">All notes use standard tuning, A = 440 Hz.</p>
      </section>

      <section class="card field">
        <label for="duration">Tone length</label>
        <select id="duration">
          ${DURATIONS.map((d) => `<option value="${d}" ${d === settings.toneDuration ? 'selected' : ''}>${d} s</option>`).join('')}
        </select>
      </section>

      <section class="card field">
        <button class="btn danger" data-action="reset">Reset high score</button>
      </section>
    </main>
  `;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const status = $('[data-status]');

  function update(patch: Partial<Settings>): void {
    settings = { ...settings, ...patch };
    saveSettings(settings);
  }

  function preload(): void {
    if (settings.instrument === 'sine') {
      status.textContent = '';
      return;
    }
    const instrument = settings.instrument;
    status.textContent = 'Loading samples…';
    getVoice(instrument).ready.then(
      () => instrument === settings.instrument && (status.textContent = 'Ready.'),
      () => instrument === settings.instrument && (status.textContent = "Couldn't load samples (offline?)."),
    );
  }

  $<HTMLSelectElement>('#instrument').addEventListener('change', (e) => {
    update({ instrument: (e.target as HTMLSelectElement).value });
    preload();
  });

  root.querySelectorAll<HTMLInputElement>('input[name="referenceMode"]').forEach((input) =>
    input.addEventListener('change', () => update({ referenceMode: input.value as ReferenceMode })),
  );

  $<HTMLSelectElement>('#fixedNote').addEventListener('change', (e) => {
    update({ fixedNote: Number((e.target as HTMLSelectElement).value), referenceMode: 'fixed' });
    $<HTMLInputElement>('input[value="fixed"]').checked = true;
  });

  $<HTMLSelectElement>('#duration').addEventListener('change', (e) =>
    update({ toneDuration: Number((e.target as HTMLSelectElement).value) }),
  );

  $('[data-action="test"]').addEventListener('click', async () => {
    void unlockAudio();
    const voice = getVoice(settings.instrument);
    try {
      await voice.ready;
    } catch {
      status.textContent = "Couldn't load samples (offline?).";
      return;
    }
    voice.stop();
    voice.play(referencePicker(settings)(), 0, getAudioContext().currentTime + 0.05, settings.toneDuration);
  });

  const resetButton = $<HTMLButtonElement>('[data-action="reset"]');
  resetButton.addEventListener('click', () => {
    if (resetButton.dataset.confirm) {
      resetStats();
      resetButton.textContent = 'High score reset';
      resetButton.disabled = true;
    } else {
      resetButton.dataset.confirm = '1';
      resetButton.textContent = 'Tap again to confirm';
    }
  });

  $('[data-action="back"]').addEventListener('click', () => nav.home());

  preload();
};

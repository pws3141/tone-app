import { unlockAudio, getAudioContext } from '../audio/context';
import { getVoice, INSTRUMENTS } from '../audio/voice';
import { loadSettings, type ReferenceMode, resetStats, saveSettings, type Settings } from '../storage';
import type { Screen } from './nav';
import { noteOptions } from './notes';
import { referencePicker } from './reference';

const DURATIONS = [0.5, 0.75, 1, 1.5, 2];

export const renderSettings: Screen = (root, nav) => {
  let settings: Settings = loadSettings();

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
        ${radio('random', 'Random')}
        <div class="range">
          <label>From <select id="randomMin">${noteOptions(settings.randomMin)}</select></label>
          <label>To <select id="randomMax">${noteOptions(settings.randomMax)}</select></label>
        </div>
        ${radio('a4', 'A4 (440 Hz)')}
        ${radio('fixed', 'Fixed note', `<select id="fixedNote" aria-label="Fixed reference note">${noteOptions(settings.fixedNote)}</select>`)}
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

  const randomMin = $<HTMLSelectElement>('#randomMin');
  const randomMax = $<HTMLSelectElement>('#randomMax');

  // Keep From ≤ To by moving the other end to match.
  function updateRange(changed: 'min' | 'max'): void {
    let min = Number(randomMin.value);
    let max = Number(randomMax.value);
    if (min > max) {
      if (changed === 'min') max = min;
      else min = max;
      randomMin.value = String(min);
      randomMax.value = String(max);
    }
    update({ randomMin: min, randomMax: max, referenceMode: 'random' });
    $<HTMLInputElement>('input[value="random"]').checked = true;
  }

  randomMin.addEventListener('change', () => updateRange('min'));
  randomMax.addEventListener('change', () => updateRange('max'));

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

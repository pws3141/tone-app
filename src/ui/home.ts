import { unlockAudio } from '../audio/context';
import { instrumentLabel } from '../audio/voice';
import { LEVEL_CENTS } from '../game/levels';
import { loadSettings, loadStats } from '../storage';
import { referenceLabel } from './reference';
import type { Screen } from './nav';

export const renderHome: Screen = (root, nav) => {
  const stats = loadStats();
  const settings = loadSettings();

  root.innerHTML = `
    <main class="screen home">
      <header class="hero">
        <h1>Tones</h1>
        <p class="tagline">Train your ear for microtonal pitch</p>
      </header>

      <section class="card stats">
        <div>
          <span class="stat-label">High score</span>
          <span class="stat-value">${stats.highScore}</span>
        </div>
        <div>
          <span class="stat-label">Best level</span>
          <span class="stat-value">${stats.bestLevel || '–'}</span>
        </div>
      </section>

      <p class="current-setup">${instrumentLabel(settings.instrument)} · ${referenceLabel(settings)}</p>

      <div class="actions">
        <button class="btn primary big" data-action="start">Start</button>
        <button class="btn secondary" data-action="settings">Settings</button>
      </div>

      <details class="card how-to">
        <summary>How to play</summary>
        <p>You'll hear an in-tune reference note (A = 440 Hz), then a second note that is slightly
        <strong>higher</strong> or <strong>lower</strong>. Say which.</p>
        <p>Each level has 5 pairs. Get 4 right to move up a level, where the gap shrinks:
        from ${LEVEL_CENTS[0]} cents (half a semitone) down to ${LEVEL_CENTS[LEVEL_CENTS.length - 1]} cent.
        Smaller gaps score more points.</p>
      </details>
    </main>
  `;

  root.querySelector('[data-action="start"]')!.addEventListener('click', () => {
    void unlockAudio();
    nav.game();
  });
  root.querySelector('[data-action="settings"]')!.addEventListener('click', () => nav.settings());
};

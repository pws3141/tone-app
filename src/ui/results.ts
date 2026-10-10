import { unlockAudio } from '../audio/context';
import { loadStats } from '../storage';
import type { Nav } from './nav';

export interface GameSummary {
  score: number;
  level: number;
  levelsCleared: number;
  isHighScore: boolean;
  lastAnswer: string;
}

export function renderResults(root: HTMLElement, nav: Nav, summary: GameSummary): void {
  const stats = loadStats();
  root.innerHTML = `
    <main class="screen results">
      <h1>Game over</h1>
      <p class="last-answer">${summary.lastAnswer}</p>
      ${summary.isHighScore ? '<p class="banner">🎉 New high score!</p>' : ''}
      <section class="card final">
        <span class="stat-label">Score</span>
        <span class="stat-value huge">${summary.score}</span>
        <p>Missed level ${summary.level} · cleared ${summary.levelsCleared} level${summary.levelsCleared === 1 ? '' : 's'}</p>
      </section>
      <section class="card stats">
        <div><span class="stat-label">High score</span><span class="stat-value">${stats.highScore}</span></div>
        <div><span class="stat-label">Best level</span><span class="stat-value">${stats.bestLevel || '–'}</span></div>
      </section>
      <div class="actions">
        <button class="btn primary big" data-action="again">Play again</button>
        <button class="btn secondary" data-action="home">Home</button>
      </div>
    </main>
  `;
  root.querySelector('[data-action="again"]')!.addEventListener('click', () => {
    void unlockAudio();
    nav.game();
  });
  root.querySelector('[data-action="home"]')!.addEventListener('click', () => nav.home());
}

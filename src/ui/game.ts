import { unlockAudio } from '../audio/context';
import { playPair } from '../audio/player';
import { getVoice, instrumentLabel } from '../audio/voice';
import { centsForLevel, ROUNDS_PER_LEVEL } from '../game/levels';
import { noteName } from '../game/pitch';
import { type AnswerResult, type Direction, Session } from '../game/session';
import { loadSettings, recordGame, saveSettings } from '../storage';
import type { Screen } from './nav';
import { referencePicker } from './reference';
import { renderResults } from './results';

type Phase = 'loading' | 'listening' | 'answering' | 'answered' | 'levelPassed' | 'over';

export const renderGame: Screen = (root, nav) => {
  const settings = loadSettings();
  const session = new Session(referencePicker(settings));
  const voice = getVoice(settings.instrument);
  let phase: Phase = 'loading';
  let history: boolean[] = [];
  let timers: number[] = [];
  let finished = false;
  let lastPlayed: { midi: number; cents: number } | null = null;

  root.innerHTML = `
    <main class="screen game">
      <header class="game-header">
        <button class="btn ghost" data-action="quit" aria-label="Quit">✕</button>
        <div class="level">
          <span class="level-number"></span>
          <span class="level-gap"></span>
        </div>
        <div class="score"><span class="stat-label">Score</span> <span class="score-value">0</span></div>
      </header>

      <ol class="rounds" aria-label="Rounds in this level"></ol>

      <section class="tones" aria-hidden="true">
        <div class="tone" data-tone="1"><span>1</span><small>reference</small></div>
        <div class="tone" data-tone="2"><span>2</span><small>higher or lower?</small></div>
      </section>

      <p class="feedback" role="status" aria-live="polite"></p>

      <section class="answer-buttons">
        <button class="btn answer" data-answer="lower">↓ Lower</button>
        <button class="btn answer" data-answer="higher">↑ Higher</button>
      </section>

      <section class="next-buttons" hidden>
        <button class="btn primary big" data-action="next">Next</button>
      </section>

      <button class="btn secondary" data-action="replay">↻ Replay</button>
    </main>
  `;

  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T & HTMLElement>(sel)!;
  const levelNumber = $('.level-number');
  const levelGap = $('.level-gap');
  const scoreValue = $('.score-value');
  const rounds = $('.rounds');
  const tone1 = $('[data-tone="1"]');
  const tone2 = $('[data-tone="2"]');
  const feedback = $('.feedback');
  const answerButtons = $('.answer-buttons');
  const nextButtons = $('.next-buttons');
  const nextButton = $<HTMLButtonElement>('[data-action="next"]');
  const replayButton = $<HTMLButtonElement>('[data-action="replay"]');

  function clearTimers(): void {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function after(ms: number, fn: () => void): void {
    timers.push(window.setTimeout(fn, ms));
  }

  function setPhase(next: Phase): void {
    phase = next;
    const canAnswer = phase === 'answering';
    answerButtons.querySelectorAll('button').forEach((b) => (b.disabled = !canAnswer));
    answerButtons.hidden = phase === 'answered' || phase === 'levelPassed';
    nextButtons.hidden = !answerButtons.hidden;
    replayButton.disabled = phase === 'loading' || phase === 'over' || !lastPlayed;
  }

  function renderHeader(): void {
    levelNumber.textContent = `Level ${session.level}`;
    levelGap.textContent = `±${centsForLevel(session.level)}¢`;
    scoreValue.textContent = String(session.score);
    rounds.innerHTML = Array.from({ length: ROUNDS_PER_LEVEL }, (_, i) => {
      const state = i < history.length ? (history[i] ? 'right' : 'wrong') : i === history.length ? 'current' : '';
      return `<li class="${state}"></li>`;
    }).join('');
  }

  function play(): void {
    if (!lastPlayed) return;
    void unlockAudio();
    clearTimers();
    tone1.classList.remove('on');
    tone2.classList.remove('on');
    const timing = playPair(voice, lastPlayed.midi, lastPlayed.cents, settings.toneDuration);
    const duration = settings.toneDuration * 1000;
    after(timing.firstStartMs, () => tone1.classList.add('on'));
    after(timing.firstStartMs + duration, () => tone1.classList.remove('on'));
    after(timing.secondStartMs, () => {
      tone2.classList.add('on');
      // Let the player answer as soon as the second tone starts.
      if (phase === 'listening') setPhase('answering');
    });
    after(timing.endMs, () => tone2.classList.remove('on'));
  }

  function newTrial(): void {
    const trial = session.nextTrial();
    lastPlayed = { midi: trial.referenceMidi, cents: trial.cents };
    feedback.textContent = settings.referenceMode === 'random' ? `Reference: ${noteName(trial.referenceMidi)}` : '';
    feedback.className = 'feedback';
    renderHeader();
    setPhase('listening');
    play();
  }

  function describe(result: AnswerResult): string {
    const gap = Math.abs(result.trial.cents).toFixed(1).replace(/\.0$/, '');
    return `${gap}¢ ${result.trial.direction}`;
  }

  function answer(direction: Direction): void {
    if (phase !== 'answering') return;
    const result = session.answer(direction);
    history.push(result.correct);
    renderHeader();

    feedback.className = `feedback ${result.correct ? 'right' : 'wrong'}`;
    feedback.textContent = result.correct
      ? `Correct! It was ${describe(result)} · +${result.points}`
      : `Not quite — it was ${describe(result)}`;

    if (result.outcome === 'failed') {
      endGame();
      return;
    }
    if (result.outcome === 'passed') {
      const correct = history.filter(Boolean).length;
      feedback.textContent += ` · Level ${session.level} cleared (${correct}/${ROUNDS_PER_LEVEL})! Next gap ±${centsForLevel(session.level + 1)}¢`;
      nextButton.textContent = 'Next level';
      setPhase('levelPassed');
    } else {
      nextButton.textContent = 'Next';
      setPhase('answered');
    }
    nextButton.focus();
  }

  function next(): void {
    if (phase === 'levelPassed') {
      session.startNextLevel();
      history = [];
    } else if (phase !== 'answered') {
      return;
    }
    newTrial();
  }

  function endGame(): void {
    finished = true;
    clearTimers();
    setPhase('over');
    const isHighScore = recordGame(session.score, session.levelsCleared);
    const summary = {
      score: session.score,
      level: session.level,
      levelsCleared: session.levelsCleared,
      isHighScore,
      lastAnswer: feedback.textContent ?? '',
    };
    // Give the last answer's feedback a moment before switching screens.
    after(1200, () => renderResults(root, nav, summary));
  }

  async function start(): Promise<void> {
    renderHeader();
    setPhase('loading');
    if (settings.instrument !== 'sine') feedback.textContent = `Loading ${instrumentLabel(settings.instrument)}…`;
    try {
      await voice.ready;
    } catch {
      feedback.className = 'feedback wrong';
      feedback.innerHTML = `Couldn't load ${instrumentLabel(settings.instrument)} (are you offline?)
        <button class="btn secondary" data-action="use-sine">Use sine wave</button>`;
      feedback.querySelector('[data-action="use-sine"]')!.addEventListener('click', () => {
        saveSettings({ ...settings, instrument: 'sine' });
        void unlockAudio();
        nav.game();
      });
      return;
    }
    if (!finished) newTrial();
  }

  answerButtons.addEventListener('click', (e) => {
    const button = (e.target as Element).closest<HTMLElement>('[data-answer]');
    if (button) answer(button.dataset.answer as Direction);
  });
  nextButton.addEventListener('click', next);
  replayButton.addEventListener('click', play);
  $('[data-action="quit"]').addEventListener('click', () => {
    if (!finished && session.score > 0) recordGame(session.score, session.levelsCleared);
    nav.home();
  });

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') answer('higher');
    else if (e.key === 'ArrowDown') answer('lower');
    else if (e.key === 'r') play();
    else if (e.key === 'Enter' && document.activeElement !== nextButton) next();
    else return;
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  void start();

  return () => {
    finished = true;
    clearTimers();
    voice.stop();
    document.removeEventListener('keydown', onKey);
  };
};

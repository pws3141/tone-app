import { describe, expect, it } from 'vitest';
import { ROUNDS_PER_LEVEL } from '../src/game/levels';
import { type Direction, Session } from '../src/game/session';

/** Answer every round of the level, getting `correct` of them right. */
function playLevel(session: Session, correct: number) {
  let last;
  for (let i = 0; i < ROUNDS_PER_LEVEL; i++) {
    const trial = session.nextTrial();
    const wrong: Direction = trial.direction === 'higher' ? 'lower' : 'higher';
    last = session.answer(i < correct ? trial.direction : wrong);
  }
  return last!;
}

describe('Session', () => {
  it('builds trials around the chosen reference', () => {
    const session = new Session(() => 60, () => 0.25);
    const trial = session.nextTrial();
    expect(trial.referenceMidi).toBe(60);
    expect(trial.direction).toBe('higher');
    expect(trial.cents).toBeGreaterThan(0);

    const lower = new Session(() => 69, () => 0.75).nextTrial();
    expect(lower.direction).toBe('lower');
    expect(lower.cents).toBeLessThan(0);
  });

  it('scores correct answers only', () => {
    const session = new Session(() => 69, () => 0.25);
    const trial = session.nextTrial();
    const right = session.answer(trial.direction);
    expect(right.correct).toBe(true);
    expect(right.points).toBeGreaterThan(0);
    expect(right.outcome).toBe('continue');

    session.nextTrial();
    const wrong = session.answer('lower');
    expect(wrong.correct).toBe(false);
    expect(wrong.points).toBe(0);
    expect(session.score).toBe(right.points);
  });

  it('passes a level with 4/5 and moves to a closer gap', () => {
    const session = new Session(() => 69);
    const result = playLevel(session, 4);
    expect(result.outcome).toBe('passed');
    expect(session.levelsCleared).toBe(1);

    session.startNextLevel();
    expect(session.level).toBe(2);
    expect(session.round).toBe(0);
    expect(session.correctInLevel).toBe(0);
    expect(Math.abs(session.nextTrial().cents)).toBeLessThan(45);
  });

  it('fails a level with 3/5', () => {
    const session = new Session(() => 69);
    expect(playLevel(session, 3).outcome).toBe('failed');
    expect(session.levelsCleared).toBe(0);
  });

  it('throws if answering without a trial', () => {
    expect(() => new Session(() => 69).answer('higher')).toThrow();
  });
});

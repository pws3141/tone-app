import { jitteredCents, PASS_THRESHOLD, ROUNDS_PER_LEVEL } from './levels';
import { pointsFor } from './scoring';

export type Direction = 'higher' | 'lower';

export interface Trial {
  referenceMidi: number;
  /** Signed offset of the second tone from the reference. */
  cents: number;
  direction: Direction;
}

/** 'continue' = more rounds in this level; 'passed' / 'failed' = the level just finished. */
export type LevelOutcome = 'continue' | 'passed' | 'failed';

export interface AnswerResult {
  correct: boolean;
  points: number;
  trial: Trial;
  outcome: LevelOutcome;
}

export class Session {
  level = 1;
  /** Rounds answered in the current level. */
  round = 0;
  correctInLevel = 0;
  score = 0;
  levelsCleared = 0;
  current: Trial | null = null;

  constructor(
    private readonly pickReference: () => number,
    private readonly rand: () => number = Math.random,
  ) {}

  nextTrial(): Trial {
    const direction: Direction = this.rand() < 0.5 ? 'higher' : 'lower';
    const cents = jitteredCents(this.level, this.rand);
    this.current = {
      referenceMidi: this.pickReference(),
      cents: direction === 'higher' ? cents : -cents,
      direction,
    };
    return this.current;
  }

  answer(direction: Direction): AnswerResult {
    const trial = this.current;
    if (!trial) throw new Error('No trial in progress');
    this.current = null;

    const correct = direction === trial.direction;
    const points = correct ? pointsFor(trial.cents) : 0;
    this.round += 1;
    if (correct) this.correctInLevel += 1;
    this.score += points;

    let outcome: LevelOutcome = 'continue';
    if (this.round >= ROUNDS_PER_LEVEL) {
      outcome = this.correctInLevel >= PASS_THRESHOLD ? 'passed' : 'failed';
      if (outcome === 'passed') this.levelsCleared = this.level;
    }
    return { correct, points, trial, outcome };
  }

  startNextLevel(): void {
    this.level += 1;
    this.round = 0;
    this.correctInLevel = 0;
  }
}

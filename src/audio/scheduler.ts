const LOOKAHEAD = 0.12;
const TICK_MS = 25;

/**
 * Called once per beat. `late` beats were missed (e.g. timers paused in the background)
 * and should update state without making sound. Return false to stop scheduling.
 */
export type BeatCallback = (beat: number, time: number, late: boolean) => boolean | void;

const LATE = 0.05;

/**
 * Look-ahead beat scheduler: a timer ticks often, and each tick schedules any
 * beats due in the next LOOKAHEAD seconds on the AudioContext clock.
 */
export class BeatScheduler {
  private nextBeat = 0;
  private nextTime = 0;
  private worker: Worker | null = null;
  private interval: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly ctx: AudioContext,
    private bpm: number,
    private readonly onBeat: BeatCallback,
  ) {}

  start(): void {
    this.stop();
    this.nextBeat = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    try {
      this.worker = new Worker(new URL('./tick.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = () => this.tick();
      this.worker.postMessage('start');
    } catch {
      this.interval = setInterval(() => this.tick(), TICK_MS);
    }
    this.tick();
  }

  /** Takes effect from the next beat not yet scheduled. */
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  stop(): void {
    this.worker?.terminate();
    this.worker = null;
    clearInterval(this.interval);
    this.interval = undefined;
  }

  private tick(): void {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      const late = this.nextTime < this.ctx.currentTime - LATE;
      const keepGoing = this.onBeat(this.nextBeat, late ? this.ctx.currentTime : this.nextTime, late);
      this.nextBeat += 1;
      this.nextTime += 60 / this.bpm;
      if (keepGoing === false) {
        this.stop();
        return;
      }
    }
  }
}

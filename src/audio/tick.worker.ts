// Worker timers aren't throttled like main-thread ones, so the metronome keeps steady time.
let timer: ReturnType<typeof setInterval> | undefined;

self.onmessage = (e: MessageEvent<'start' | 'stop'>) => {
  clearInterval(timer);
  timer = e.data === 'start' ? setInterval(() => self.postMessage('tick'), 25) : undefined;
};

let ctx: AudioContext | null = null;

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

export function getAudioContext(): AudioContext {
  if (!ctx) {
    // Safari 16.4+: play through the ring/silent switch like a music app would.
    const nav = navigator as Navigator & AudioSessionNavigator;
    if (nav.audioSession) {
      try {
        nav.audioSession.type = 'playback';
      } catch {
        // Not supported; audio will respect the silent switch.
      }
    }
    ctx = new AudioContext();
  }
  return ctx;
}

/**
 * Must be called from a tap/click handler. iOS only starts (or restarts after
 * backgrounding) an AudioContext in response to a user gesture.
 */
export function unlockAudio(): Promise<void> {
  const c = getAudioContext();
  // Playing a silent buffer inside the gesture is the reliable iOS unlock.
  const source = c.createBufferSource();
  source.buffer = c.createBuffer(1, 1, c.sampleRate);
  source.connect(c.destination);
  source.start();
  return c.state === 'running' ? Promise.resolve() : c.resume();
}

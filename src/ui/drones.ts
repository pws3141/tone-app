import { CLICK_SOUNDS, type ClickSound, playClick } from '../audio/clicks';
import { getAudioContext, unlockAudio } from '../audio/context';
import { canSustain, createDrone, type Drone, restrikes } from '../audio/drone';
import { BeatScheduler } from '../audio/scheduler';
import { INSTRUMENTS, instrumentLabel } from '../audio/voice';
import { buildKeySequence, INTERVALS } from '../drones/sequence';
import { type BeatInfo, beatInfo, type TimelineConfig } from '../drones/timeline';
import { keyName, octaveOf } from '../game/pitch';
import { type DroneSettings, loadDroneSettings, saveDroneSettings } from '../storage';
import type { Screen } from './nav';
import { noteOptions } from './notes';
import { renderTabBar } from './tabbar';

const BPM_MIN = 30;
const BPM_MAX = 240;

// Audio buses and drones outlive the screen so samples only load once.
let buses: { drone: GainNode; click: GainNode } | null = null;
const drones = new Map<string, Drone>();

function getBuses() {
  if (!buses) {
    const ctx = getAudioContext();
    buses = { drone: ctx.createGain(), click: ctx.createGain() };
    buses.drone.connect(ctx.destination);
    buses.click.connect(ctx.destination);
  }
  return buses;
}

function getDrone(instrument: string, restrike: boolean): Drone {
  const key = `${instrument}:${restrike}`;
  let drone = drones.get(key);
  if (!drone) {
    drone = createDrone(getAudioContext(), getBuses().drone, instrument, restrike);
    drones.set(key, drone);
    drone.ready.catch(() => drones.delete(key));
  }
  return drone;
}

const options = (items: { value: string | number; label: string }[], selected: string | number) =>
  items.map((i) => `<option value="${i.value}" ${i.value === selected ? 'selected' : ''}>${i.label}</option>`).join('');

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const renderDrones: Screen = (root, nav) => {
  let s: DroneSettings = loadDroneSettings();
  const ctx = getAudioContext();
  const bus = getBuses();
  const restrike = () => restrikes(s.droneInstrument, s.restrike);

  let playing = false;
  let scheduler: BeatScheduler | null = null;
  let drone: Drone | null = null;
  let keys: number[] = buildKeySequence(s.startNote, s.interval, s.jumps);
  let queue: { time: number; info: BeatInfo }[] = [];
  let raf = 0;
  let wakeLock: WakeLockSentinel | null = null;

  root.innerHTML = `
    <main class="screen drones with-tabbar">
      <header class="screen-header"><h1>Drones</h1></header>

      <section class="card now-playing" aria-live="polite">
        <div class="now-key"><span class="key-name"></span><span class="key-octave"></span></div>
        <p class="now-status"></p>
        <ol class="beats" aria-hidden="true"></ol>
        <ol class="key-preview" aria-label="Keys in order"></ol>
      </section>

      <section class="card transport">
        <div class="tempo">
          <button class="btn secondary step" data-bpm="-1" aria-label="Slower">−</button>
          <label class="bpm"><span class="bpm-value"></span> <small>BPM</small></label>
          <button class="btn secondary step" data-bpm="1" aria-label="Faster">+</button>
        </div>
        <input type="range" id="bpm" min="${BPM_MIN}" max="${BPM_MAX}" value="${s.bpm}" aria-label="Tempo">
        <div class="switches">
          <label class="switch-row"><span>Drone</span><input type="checkbox" class="switch" id="droneOn" ${s.droneOn ? 'checked' : ''}></label>
          <label class="switch-row"><span>Metronome</span><input type="checkbox" class="switch" id="metronomeOn" ${s.metronomeOn ? 'checked' : ''}></label>
        </div>
        <button class="btn primary big" data-action="play">Start</button>
        <p class="hint" data-status></p>
      </section>

      <fieldset class="card field" data-lock>
        <legend class="field-label">Sequence</legend>
        <label class="row">Start note <select id="startNote">${noteOptions(s.startNote, 36, 84)}</select></label>
        <label class="row">Bars per key <select id="barsPerKey">${options(range(1, 16).map((n) => ({ value: n, label: String(n) })), s.barsPerKey)}</select></label>
        <label class="row">Jump <select id="interval">${options(INTERVALS.map((i) => ({ value: i.semitones, label: i.label })), s.interval)}</select></label>
        <label class="row">Jumps <select id="jumps">${options(range(0, 24).map((n) => ({ value: n, label: n === 11 ? '11 (all keys)' : String(n) })), s.jumps)}</select></label>
        <label class="switch-row"><span>Repeat</span><input type="checkbox" class="switch" id="repeat" ${s.repeat ? 'checked' : ''}></label>
      </fieldset>

      <section class="card field">
        <span class="field-label">Sound</span>
        <label class="row">Drone <select id="droneInstrument" data-lock>${options(INSTRUMENTS.map((i) => ({ value: i.id, label: i.label })), s.droneInstrument)}</select></label>
        <label class="switch-row" id="restrikeRow"><span>Re-strike every bar</span><input type="checkbox" class="switch" id="restrike" data-lock></label>
        <label class="row">Drone volume <input type="range" id="droneVolume" min="0" max="1" step="0.05" value="${s.droneVolume}"></label>
        <label class="row">Click <select id="clickSound">${options(CLICK_SOUNDS.map((c) => ({ value: c.id, label: c.label })), s.clickSound)}</select></label>
        <label class="row">Click volume <input type="range" id="clickVolume" min="0" max="1" step="0.05" value="${s.clickVolume}"></label>
        <label class="row">Beats per bar <select id="beatsPerBar" data-lock>${options(range(2, 7).map((n) => ({ value: n, label: String(n) })), s.beatsPerBar)}</select></label>
        <label class="switch-row"><span>Accent beat 1</span><input type="checkbox" class="switch" id="accent" ${s.accent ? 'checked' : ''}></label>
        <label class="switch-row"><span>Count-in bar</span><input type="checkbox" class="switch" id="countIn" data-lock ${s.countIn ? 'checked' : ''}></label>
      </section>
    </main>
  `;

  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const keyNameEl = $('.key-name');
  const keyOctaveEl = $('.key-octave');
  const statusEl = $('.now-status');
  const beatsEl = $('.beats');
  const previewEl = $('.key-preview');
  const bpmValue = $('.bpm-value');
  const bpmSlider = $<HTMLInputElement>('#bpm');
  const playButton = $<HTMLButtonElement>('[data-action="play"]');
  const loadStatus = $('[data-status]');
  const restrikeBox = $<HTMLInputElement>('#restrike');
  const restrikeRow = $('#restrikeRow');

  function update(patch: Partial<DroneSettings>): void {
    s = { ...s, ...patch };
    saveDroneSettings(s);
  }

  function applyMix(): void {
    const now = ctx.currentTime;
    bus.drone.gain.setTargetAtTime(s.droneOn ? s.droneVolume : 0, now, 0.02);
    if (playing) bus.click.gain.setTargetAtTime(s.clickVolume, now, 0.02);
  }

  function renderIdle(): void {
    keys = buildKeySequence(s.startNote, s.interval, s.jumps);
    showKey(keys[0]);
    const last = keys.length > 1 ? `, ending on ${keyName(keys[keys.length - 1])}` : '';
    statusEl.textContent = `${keys.length} key${keys.length === 1 ? '' : 's'} · ${s.barsPerKey} bar${s.barsPerKey === 1 ? '' : 's'} each${s.repeat ? ', repeating' : last}`;
    renderBeats(-1);
    renderPreview(-1);
  }

  function showKey(midi: number): void {
    keyNameEl.textContent = keyName(midi);
    keyOctaveEl.textContent = String(octaveOf(midi));
  }

  function renderBeats(current: number): void {
    beatsEl.innerHTML = range(0, s.beatsPerBar - 1)
      .map((i) => `<li class="${i === 0 && s.accent ? 'accent' : ''} ${i === current ? 'on' : ''}"></li>`)
      .join('');
  }

  function renderPreview(current: number): void {
    previewEl.innerHTML = keys
      .map((m, i) => `<li class="${i === current ? 'current' : i < current ? 'past' : ''}">${keyName(m)}</li>`)
      .join('');
  }

  function showBeat(info: BeatInfo): void {
    renderBeats(info.beatInBar);
    if (!info.barStart && !info.keyStart) return;
    if (info.countIn) {
      showKey(keys[0]);
      statusEl.textContent = 'Count-in…';
      renderPreview(-1);
      return;
    }
    showKey(keys[info.keyIndex]);
    const barsLeft = s.barsPerKey - info.bar;
    const nextIndex = info.keyIndex + 1;
    const next =
      nextIndex < keys.length
        ? `Next: ${keyName(keys[nextIndex])} in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`
        : s.repeat
          ? `Next: ${keyName(keys[0])} in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`
          : barsLeft === 1
            ? 'Last bar'
            : `Last key · ${barsLeft} bars left`;
    statusEl.textContent = `Key ${info.keyIndex + 1} of ${keys.length} · Bar ${info.bar + 1} of ${s.barsPerKey} · ${next}`;
    renderPreview(info.keyIndex);
  }

  function setPlaying(next: boolean): void {
    playing = next;
    playButton.textContent = playing ? 'Stop' : 'Start';
    playButton.classList.toggle('stop', playing);
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement>('[data-lock]').forEach(
      (el) => (el.disabled = playing),
    );
    updatePlayEnabled();
  }

  function updatePlayEnabled(): void {
    playButton.disabled = !playing && !s.droneOn && !s.metronomeOn;
  }

  function frame(): void {
    const now = ctx.currentTime;
    while (queue.length && queue[0].time <= now) {
      const { info } = queue.shift()!;
      if (info.done) {
        stop();
        return;
      }
      showBeat(info);
    }
    raf = requestAnimationFrame(frame);
  }

  async function requestWakeLock(): Promise<void> {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null; // Not supported or not allowed; the screen may sleep.
    }
  }

  async function start(): Promise<void> {
    void unlockAudio();
    const d = getDrone(s.droneInstrument, restrike());
    if (s.droneInstrument !== 'sine') loadStatus.textContent = `Loading ${instrumentLabel(s.droneInstrument)}…`;
    playButton.disabled = true;
    try {
      await d.ready;
    } catch {
      loadStatus.textContent = `Couldn't load ${instrumentLabel(s.droneInstrument)} (offline?). Try the sine wave.`;
      updatePlayEnabled();
      return;
    }
    loadStatus.textContent = '';
    drone = d;
    keys = buildKeySequence(s.startNote, s.interval, s.jumps);
    const cfg: TimelineConfig = {
      beatsPerBar: s.beatsPerBar,
      barsPerKey: s.barsPerKey,
      keys: keys.length,
      countInBars: s.countIn ? 1 : 0,
      repeat: s.repeat,
    };
    queue = [];
    bus.click.gain.cancelScheduledValues(ctx.currentTime);
    bus.click.gain.setValueAtTime(s.clickVolume, ctx.currentTime);
    applyMix();

    scheduler = new BeatScheduler(ctx, s.bpm, (n, time, late) => {
      const info = beatInfo(n, cfg);
      queue.push({ time, info });
      if (info.done) {
        d.stop(time);
        return false;
      }
      if (s.metronomeOn && !late) playClick(ctx, s.clickSound, s.accent && info.barStart, time, bus.click);
      if (info.keyStart) d.start(keys[info.keyIndex], time);
      else if (info.barStart && !info.countIn && !late) d.restrike(time);
    });
    setPlaying(true);
    scheduler.start();
    raf = requestAnimationFrame(frame);
    void requestWakeLock();
  }

  function stop(): void {
    scheduler?.stop();
    scheduler = null;
    const now = ctx.currentTime;
    drone?.stop(now);
    // Silence clicks that were already scheduled ahead.
    bus.click.gain.cancelScheduledValues(now);
    bus.click.gain.setTargetAtTime(0, now, 0.005);
    cancelAnimationFrame(raf);
    queue = [];
    void wakeLock?.release();
    wakeLock = null;
    setPlaying(false);
    renderIdle();
  }

  function syncRestrike(): void {
    // Only instruments that can hold a note get a choice.
    restrikeRow.hidden = s.droneInstrument === 'sine' || !canSustain(s.droneInstrument);
    restrikeBox.checked = restrike();
  }

  function preload(): void {
    if (s.droneInstrument === 'sine') {
      loadStatus.textContent = '';
      return;
    }
    const instrument = s.droneInstrument;
    loadStatus.textContent = `Loading ${instrumentLabel(instrument)}…`;
    getDrone(instrument, restrike()).ready.then(
      () => instrument === s.droneInstrument && (loadStatus.textContent = ''),
      () => instrument === s.droneInstrument && (loadStatus.textContent = `Couldn't load ${instrumentLabel(instrument)} (offline?).`),
    );
  }

  function setBpm(bpm: number): void {
    const clamped = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
    update({ bpm: clamped });
    bpmValue.textContent = String(clamped);
    bpmSlider.value = String(clamped);
    scheduler?.setBpm(clamped);
  }

  // --- Events

  playButton.addEventListener('click', () => (playing ? stop() : void start()));

  root.querySelectorAll<HTMLButtonElement>('[data-bpm]').forEach((b) =>
    b.addEventListener('click', () => setBpm(s.bpm + Number(b.dataset.bpm))),
  );
  bpmSlider.addEventListener('input', () => setBpm(Number(bpmSlider.value)));

  const onSelect = (id: string, apply: (value: string) => void) =>
    $<HTMLSelectElement>(`#${id}`).addEventListener('change', (e) => apply((e.target as HTMLSelectElement).value));
  const onSwitch = (id: string, apply: (checked: boolean) => void) =>
    $<HTMLInputElement>(`#${id}`).addEventListener('change', (e) => apply((e.target as HTMLInputElement).checked));

  onSelect('startNote', (v) => (update({ startNote: Number(v) }), renderIdle()));
  onSelect('barsPerKey', (v) => (update({ barsPerKey: Number(v) }), renderIdle()));
  onSelect('interval', (v) => (update({ interval: Number(v) }), renderIdle()));
  onSelect('jumps', (v) => (update({ jumps: Number(v) }), renderIdle()));
  onSwitch('repeat', (c) => (update({ repeat: c }), renderIdle()));

  onSelect('droneInstrument', (v) => {
    update({ droneInstrument: v, restrike: null });
    syncRestrike();
    preload();
  });
  onSwitch('restrike', (c) => (update({ restrike: c }), preload()));
  onSelect('clickSound', (v) => update({ clickSound: v as ClickSound }));
  onSelect('beatsPerBar', (v) => (update({ beatsPerBar: Number(v) }), renderIdle()));
  onSwitch('accent', (c) => (update({ accent: c }), playing || renderBeats(-1)));
  onSwitch('countIn', (c) => update({ countIn: c }));
  onSwitch('droneOn', (c) => (update({ droneOn: c }), applyMix(), updatePlayEnabled()));
  onSwitch('metronomeOn', (c) => (update({ metronomeOn: c }), updatePlayEnabled()));
  $<HTMLInputElement>('#droneVolume').addEventListener('input', (e) => {
    update({ droneVolume: Number((e.target as HTMLInputElement).value) });
    applyMix();
  });
  $<HTMLInputElement>('#clickVolume').addEventListener('input', (e) => {
    update({ clickVolume: Number((e.target as HTMLInputElement).value) });
    applyMix();
  });

  function onVisibility(): void {
    if (document.visibilityState === 'visible' && playing) void requestWakeLock();
  }
  document.addEventListener('visibilitychange', onVisibility);

  bpmValue.textContent = String(s.bpm);
  syncRestrike();
  applyMix();
  setPlaying(false);
  renderIdle();
  preload();
  renderTabBar(root, nav, 'drones');

  return () => {
    if (playing) stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
};

# Tones and Drones

An ear-training and practice app for musicians, built as an installable web app (PWA) for iPhone.

- **Tones:** train your ear to hear microtonal pitch differences, down to 1 cent.
- **Drones:** practise scales and patterns around a cycle of keys, with a drone and a metronome.

**Live:** https://pws3141.github.io/tone-app/

## Install on iPhone

1. Open the link above in Safari, or in Chrome, Firefox or Edge (iOS 16.4+).
2. Tap **Share → Add to Home Screen**.
3. Launch **Tones and Drones** from the home screen.

It runs full-screen and works offline once loaded. Instruments work offline after you've played them once. Sound plays even with the ring/silent switch on silent (iOS 16.4+).

## Tones

You hear an in-tune reference note (A = 440 Hz, equal temperament), then a second note that is slightly higher or lower. Say which.

- **Levels:**
  - Each level is 5 pairs. Get at least 4 right to advance; fewer ends the game.
  - The gap shrinks each level: 50 → 40 → 30 → 22 → 16 → 12 → 9 → 7 → 5 → 4 → 3 → 2 → 1 cent (100 cents = 1 semitone), with ±10% jitter.
- **Scoring:**
  - A correct answer scores `round(500 / cents)`: 10 points at 50¢, 100 at 5¢ and 500 at 1¢.
  - The high score and best level are shown on the home screen.
- **Replay:** tap the **1** or **2** circle to hear that note again, or **Replay** to hear the pair.
- **Settings:**
  - Sound: sine wave or a sampled instrument.
  - Reference note: random from an adjustable range (default A3–C6), A4, or a fixed note.
  - Note length.
- **Keyboard:** ↑ higher, ↓ lower, `1`/`2` replay one note, `r` replay the pair, Enter next.

## Drones

- **Sequence:**
  - Choose the start note, the bars per key, the jump between keys (default a 5th up, for the circle of fifths), and the number of jumps (default 11, which covers all 12 keys).
  - Each new key goes in the octave nearest the start note, so the drone stays in your register.
  - **Repeat** cycles back to the start note until you press Stop.
- **Metronome:**
  - 30–240 BPM, adjustable while playing.
  - Sounds: wood block (default), clave, click, beep or cowbell, with an optional accent on beat 1.
  - Choose the beats per bar and which beats click (e.g. just 2 and 4). An optional count-in bar clicks every beat.
- **Drone:**
  - Uses the same sounds as Tones.
  - Bowed and wind instruments hold the note; piano, guitar, electric piano and vibraphone are re-struck every bar. **Re-strike every bar** re-attacks a held instrument too.
- The drone and metronome can each be switched off and have their own volume.
- The screen stays awake while playing.

## Sounds

Sampled instruments come from the MusyngKite General MIDI soundfont:
- **Piano, keys and guitar:** piano, electric piano, nylon guitar and vibraphone.
- **Winds:** alto sax, tenor sax, flute, clarinet, oboe and trumpet.
- **Strings:** violin, cello and double bass.

In Tones, both notes of a pair use the same sample and differ only by detune, so the pitch difference is exact. Held drones crossfade the steady middle of each sample into itself, and volume is evened out across instruments and notes. Metronome sounds are synthesised.

## Development

```sh
npm install
npm run dev      # http://localhost:5173/tone-app/
npm test         # unit tests (Vitest)
npm run build    # production build in dist/
npm run preview  # serve the build, including the service worker
```

Built with Vite, TypeScript and the Web Audio API, with no UI framework. Tones plays its instruments through [smplr](https://github.com/danigb/smplr). Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`, with the Pages source set to **GitHub Actions**.

| Path | Contents |
|---|---|
| `src/game/` | Tones logic: pitch maths, levels, scoring, session state |
| `src/drones/` | Drones logic: key sequence, beat timeline |
| `src/audio/` | Web Audio: instrument voices, drones, metronome clicks, look-ahead beat scheduler |
| `src/ui/` | Screens and tab bar |
| `tests/` | Unit tests |

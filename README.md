## Tones and Drones iOS app

### Aim

#### Tones

To improve my ear to help with music practice. I want to be able to hear micro-tonal differences.

Create an iOS app, hosted using a free service (I assume it will run in a browser wrapper somehow) that does:

1. For each level, play two tones, one tone in tune (using standard 440 hrz tuning), and one either higher or lower.
2. Each level, the second tone gets closer to the first tone:
  - Level 1, the second tone is around half a semi-tone away from the first one;
  - Level 2, the second tone is less than half a semi-tone away from the first one;
  - each level, the second tone gets closer to the first tone.
3. A scoring system: you get points by correctly determining whether a tone is higher or lower than the original tone -- the closer the second tone is to the first, the more points you get. The high score is displayed on the home-page.

Use a sine wave for the tones, but also have the ability to select other sounds (probably MIDI) e.g. piano, saxophone etc.

#### Drones

A separate page for playing drones alongside a metronome that I can use when practising scales and patterns.

The aim is to practice patterns around e.g. a circle of fifths, alongside a metronome and a drone that changes when I change the key of the scale / pattern.

1. The metronome and drone play concurrently, but there is on option to turn either off.
2. The same sine wave and instruments can be selected for the drone as in the 'Tones' section.
3. The metronome by default uses a wood click but there are other options available.
4. The drone works like this:
  - Select the starting note;
  - Select how many bars the note lasts for;
  - Select the jump in the next note (e.g. a 5th);
  - Select how many jumps before it stops (default 11 such that it goes through all keys.).



---

## Using the app

**Live:** https://pws3141.github.io/tone-app/

### Install on iPhone
1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch **Tones** from the home screen. It runs full-screen and works offline once loaded. Instruments work offline after you've played them once.

Sound plays even with the ring/silent switch on silent (iOS 16.4+).

### How it plays
- Each level is 5 tone pairs: an in-tune reference (A = 440 Hz, equal temperament), then a second tone that is higher or lower.
- Get at least 4 of 5 right to advance. Fewer than 4 ends the game.
- The gap shrinks each level: 50 → 40 → 30 → 22 → 16 → 12 → 9 → 7 → 5 → 4 → 3 → 2 → 1 cent (100 cents = 1 semitone), with ±10% jitter.
- A correct answer scores `round(500 / cents)`: 10 points at 50¢, 100 at 5¢ and 500 at 1¢. The high score and best level are kept on the device.
- **Settings:** sound (sine wave, or sampled piano, sax, flute, violin and more), reference note (random by default, from an adjustable range that starts at A3–C6; or A4; or a fixed note) and tone length.
- Tap the **1** or **2** circle to hear that tone again, or **Replay** to hear the pair.
- Keyboard: ↑ higher, ↓ lower, `1`/`2` replay one tone, `r` replay the pair, Enter next.

### Drones
Open the **Drones** tab to practise scales and patterns around a cycle of keys, with a drone and a metronome.
- **Sequence:**
  - Choose the start note (C2–C6), the bars per key (1–16), the jump between keys (default a 5th up, for the circle of fifths), and the number of jumps (default 11, which covers all 12 keys).
  - Turn on **Repeat** to cycle back to the start note until you press Stop.
  - Each new key goes in the octave nearest the start note, so the drone stays in your chosen register.
- **Transport:**
  - Tempo runs from 30 to 240 BPM and can be changed while playing.
  - The Drone and Metronome switches can each be turned off while playing.
  - An optional count-in bar plays before the drone starts.
- **Sound:**
  - Drone sound uses the same sounds as Tones.
  - The metronome click can be a wood block (default), clave, click, beep or cowbell, with an accented beat 1.
  - You can set the beats per bar and the volume of each.
- **How sampled drones play:**
  - Cello, double bass, violin, flute, oboe, trumpet and tenor sax hold the note.
  - Piano, guitar, electric piano, alto sax and clarinet have no loop points, so they're re-struck every bar.
  - Vibraphone is re-struck by default; its toggle lets you hold it instead.
- The screen stays awake while a drone is playing (Screen Wake Lock).

Instrument samples come from the MusyngKite General MIDI soundfont via [smplr](https://github.com/danigb/smplr). Both tones of a pair use the same sample and differ only by detune, so the pitch difference is exact.

## Development

```sh
npm install
npm run dev      # http://localhost:5173/tone-app/
npm test         # unit tests (Vitest)
npm run build    # production build in dist/
npm run preview  # serve the build, including the service worker
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`. The repo's Pages source must be set to **GitHub Actions**.

Code layout:
- `src/game/` holds the Tones game logic: pitch math, levels, scoring and session state.
- `src/drones/` holds the Drones logic: the key sequence and beat timeline.
- `src/audio/` holds the Web Audio code: voices, drones, metronome clicks and the look-ahead beat scheduler.
- `src/ui/` holds the screens.

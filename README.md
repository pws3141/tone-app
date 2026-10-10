## Tones iOS app

### Aim

To improve my ear to help with music practice. I want to be able to hear micro-tonal differences.

Create an iOS app, hosted using a free service (I assume it will run in a browser wrapper somehow) that does:

1. For each level, play two tones, one tone in tune (using standard 440 hrz tuning), and one either higher or lower.
2. Each level, the second tone gets closer to the first tone:
  - Level 1, the second tone is around half a semi-tone away from the first one;
  - Level 2, the second tone is less than half a semi-tone away from the first one;
  - each level, the second tone gets closer to the first tone.
3. A scoring system: you get points by correctly determining whether a tone is higher or lower than the original tone -- the closer the second tone is to the first, the more points you get. The high score is displayed on the home-page.

Use a sine wave for the tones, but also have the ability to select other sounds (probably MIDI) e.g. piano, saxophone etc.


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
- **Settings:** sound (sine wave, or sampled piano, sax, flute, violin and more), reference note (A4, a fixed note, or random C3–C6) and tone length.
- Keyboard: ↑ higher, ↓ lower, `r` replay, Enter next.

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

Code layout: `src/game/` holds pure game logic (pitch math, levels, scoring, session state). `src/audio/` holds Web Audio voices (sine and sampled). `src/ui/` holds the screens.

# Beat Buddies

A tiny music-pad app for kids. Tap 16 chunky pads to make beats, switch between
three sound kits, jam over an auto beat, then record and play back your song.

Runs in any modern browser and installs as an app on Android (and Windows) —
after the first visit it works with no internet at all.

## Features

- **16 big pads**, colour-coded, with multi-touch support (drag across them like a real pad controller)
- **3 kits** — Drums, Melody (C major pentatonic, so nothing sounds wrong), Funny sounds
- **Auto Beat** backing groove with an adjustable speed (60–170 BPM)
- **Record → Play → Save**, saved songs kept on the device
- **Keyboard play** on a computer: `1 2 3 4 / Q W E R / A S D F / Z X C V`, spacebar toggles recording
- **Zero downloads** — every sound is synthesized live with the Web Audio API
- **Installable PWA**, works offline, fullscreen button for tablets and phones

## Run it locally

Any static file server works, for example:

```bash
npx serve .
```

Then open the printed address. Installing (the "Install app" button, or the
browser's "Add to home screen") is what enables offline use.

## Files

| File | What it is |
| --- | --- |
| `index.html` | markup and layout |
| `styles.css` | design system, pads, responsive layout |
| `app.js` | sound synthesis, kits, input, recorder, storage |
| `sw.js` | service worker, offline caching |
| `manifest.webmanifest` | install metadata |
| `icons/` | app icons |

No build step, no dependencies.

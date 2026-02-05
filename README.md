# BSharp: Perfect Pitch Trainer

An Android app for teaching absolute pitch to young children using Eguchi's Chord Identification Method. Children learn to associate piano chords with colors, progressing through increasingly difficult levels.

## How It Works

Children listen to a chord and tap the matching colored flag. The app tracks accuracy, adjusts chord frequency using an adaptive weighting algorithm (presenting harder chords more often), and supports multiple user profiles.

**Chord progression:**

| Level | Color | Chord |
|-------|-------|-------|
| 1 | Yellow | F/C |
| 2 | Blue | G/B |
| 3 | Black | F/A |
| 4 | Green | G/D |
| 5 | Orange | C/E |
| 6 | Purple | F |
| 7 | Pink | G |
| 8 | Brown | C/G |

After mastering the 9 white-key chords, 5 black-key chords are introduced (Gray, Tan, Light Green, Light Purple, Sky Blue).

## Building

Requires Node.js.

```bash
npm install
make build
```

This produces `dist/` with the bundled app.

## Android

```bash
make android-deploy
```

Then open `android/` in Android Studio, sync Gradle, and run on a device or emulator.

## Attribution

Derived from [pganssle/cim](https://github.com/pganssle/cim) by Paul Ganssle. Licensed under the Apache License 2.0. See [NOTICE](NOTICE) for details.

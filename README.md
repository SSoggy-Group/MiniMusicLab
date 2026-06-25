# MiniMusicLab

A polished, one-key 16-step beat sequencer in the browser.

## Requirements

- [pnpm](https://pnpm.io/) (v8+)
- Node.js 18+

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
pnpm build
pnpm preview
```

## How to Use

**All app interactions use a single key: `Space` (or `0` as alternative).**

| Action | How |
|---|---|
| Place a note | Hover over an empty cell, press `Space` |
| Remove a note | Hover over a filled note, press `Space` |
| Preview a sound | Hover over any cell or instrument, hold `Space` |
| Select instrument | Hover the instrument in the left sidebar, press `Space` |
| Play / Stop | Hover the Play button in the top bar, press `Space` |
| Increase BPM | Hover the `+` BPM button, press `Space` |
| Decrease BPM | Hover the `−` BPM button, press `Space` |
| Save pattern | Hover Save, press `Space` (saves to localStorage) |
| Clear grid | Hover Clear, press `Space` |

Your pattern is saved in `localStorage` and reloaded on next visit.

## Instruments

| Track | Sound |
|---|---|
| Kick | `MembraneSynth` — deep bass drum |
| Snare | `NoiseSynth` — white noise snap |
| Hi-hat | `MetalSynth` — short metallic tick |
| Bass | `MonoSynth` — sawtooth bass line |
| Pluck | `PluckSynth` — Karplus-Strong pluck |

## Tech Stack

- [Vite](https://vitejs.dev/) — build tool
- [TypeScript](https://www.typescriptlang.org/)
- [Tone.js](https://tonejs.github.io/) — Web Audio synthesis
- Plain HTML/CSS (no UI framework)

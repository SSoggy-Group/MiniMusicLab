# MiniMusicLab

A browser-based 16-step beat sequencer. Or you can just call it a music lab or like fl studio mini hehe

Live at [ssoggy-group.github.io/MiniMusicLab](https://ssoggy-group.github.io/MiniMusicLab)

---

## Running locally

You need [pnpm](https://pnpm.io/) and Node 18+.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to GitHub Pages

```bash
pnpm build
pnpm deploy
```

This pushes the `dist/` folder to the `gh-pages` branch. Make sure GitHub Pages is set to serve from `gh-pages` in your repo settings. Idk why you would wnat to do this yourself but 

---

## How it works

Click on cells in the grid to toggle notes on/off. Hit **Play** to hear it loop.

You can also switch to **Spacebar mode** from the dropdown (dropdowns are a little janky rn might fix later), then hovering a cell and pressing space places or removes a note instead of clicking. Good for playing things more "live". Ph and you can also import local audio and fetch from my ionstants. and i made like 3 systems for how external audio works if you have a long file so yeah.

| Thing         | How to do it                                                       |
| ---------------| --------------------------------------------------------------------|
| Toggle note   | Click a cell (or hover + Space in spacebar mode)                   |
| Preview sound | Hover over an instrument name in the sidebar                       |
| Change kit    | Use the kit dropdown                                               |
| BPM           | +/− buttons top right                                              |
| Add pages     | The +/− next to the page indicator                                 |
| Import sounds | "+ Sound" uploads your own file, "+ MyInstants" pulls from the web |
| Record mic    | "+ Mic"                                                            |
| Export        | "Export WAV" — exports what you've currently got                   |
| Save          | "Save" — persists to localStorage so it's there when you come back |
| Clear         | "Clear" — wipes the grid                                           |

---

## Kits

- **House** — classic four-on-the-floor stuff
- **Trap** — 808s, fast hi-hats
- **Synthwave** — big reverby pads
- **Tuff Phonk** — phonk samples including Low Honor, bark fart, bone crack, etc.
- **Lo-Fi** — muted, warm sounds
- **Techno** — industrial kicks and bass

---

## stuff i used

- [Vite](https://vitejs.dev/) + TypeScript
- [Tone.js](https://tonejs.github.io/) for all the synthesis and scheduling
- Vanilla CSS, no UI framework
- [gh-pages](https://www.npmjs.com/package/gh-pages) for deployment
- pnpm 8 or later (better than npm since it has a p hehehehe)
- thats it i think?
- typescript
-  myinstants api from https://github.com/abdipr/myinstants-api (and thus also myinstants itself)


## ai usage:
i used ai for a first prtotype to work further on, and for a little help with css and typescript here and there. me is the coder tho so no vibecode roaar
oh and i used ai for debugging 2 bugs i had, and for help with lamejs and/or ffmpeg.wasm which was a pain haha
and i had inline suggestions by gemini which were nice but annoying too lmao
thats about it i think 
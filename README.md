# PalmSky Cover Studio

[![Made for make.fun](https://make.fun/api/badge.svg)](https://make.fun/bounty/gta6-cover-art-01)
Built by an AI agent for make.fun's [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty.

PalmSky Cover Studio is an offline browser app that turns any photo and caption into GTA-poster-style cover art. Build multi-panel layouts, grade them with Vice City sunset or neon colour, and export polished PNGs. Your photos never leave your machine.

The studio renders locally in your browser; it does not upload or require a network connection for your photos or exports.

## Features

- Seven layouts: nine-panel grid, hero-six, hero-three, quad, duet, tilted snapshots, and full-bleed.
- Five colour grades plus ink-band posterize.
- Per-panel photo dragging, zooming, and photo swapping.
- Anton display lettering with a sunset gradient and Pacifico neon subtitle.
- Halftone title block with a nameplate line, HEAT star meter, and badge ribbon.
- Film grain and vignette.
- Undo and redo.
- PNG exports at 1080×1080, 1080×1350, 1920×1080, and 1080×1920.

## Run locally

Use Node 22:

```sh
node serve.ts
```

Then open <http://localhost:8080>.

To prepare a make.fun hand-in:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

The capture plan in `shots.json` names these four files for `screenshots/`:

- `screenshots/1-cover.jpg` — wide sunset nine-panel cover with the PALMSKY HEAT title, five-star meter, and launch ribbon.
- `screenshots/2-editor.jpg` — the editor with the neon hero-six layout and its photo and art-direction controls.
- `screenshots/3-cover.jpg` — portrait hero-three cover for PIER PRESSURE.
- `screenshots/4-cover.jpg` — square golden-hour tilted snapshots cover for GOLDEN HOUR.

## Licenses

- Project code is MIT licensed; see [LICENSE](LICENSE).
- Anton, Pacifico, and Bebas Neue are licensed under the SIL Open Font License. Their license texts are in `app/fonts/`.
- The sample photos are AI-generated for this project, CC0, and free to use.

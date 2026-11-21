# PalmSky Cover Studio

![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/jembot21/palmsky-cover-studio/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/jembot21/palmsky-cover-studio/reward.svg)

Your camera roll, recast as a sunburned crime-film cover. PalmSky layers asymmetric photo panels, punchy inked titles, little gold edition seals and palm silhouettes into an original poster you can save immediately. It runs entirely on your device without accounts, analytics, uploads or external dependencies.

Created for [make.fun gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01); see the [cover-art bounty](https://make.fun/bounty/gta6-cover-art-01).

## Run the studio

Use a modern desktop browser and Node 22 or newer. Run `node serve.ts` and visit `http://localhost:8080`. A different port works with `node serve.ts --port 8765`. The `app/` directory is a portable static website; it needs no package install or build. Once served locally, all assets and processing stay local. Opening the HTML directly through file:// is not supported because it uses browser modules.

## Make your cover

1. Try Boulevard or The pier, or add one or several personal images.
2. Click a panel in the preview, then click a photo thumbnail to assign it. Reuse one image across all panels or mix several. Drag inside the preview to position the crop and adjust Crop / Zoom for a closer view.
3. Choose Coastline, Afterhours or Crossroads. Edit the cover title, script accent, edition and bottom caption. Pick Sunset, Neon or Mono.
4. Choose a format and press Download PNG. A finished-cover proof appears with another save link.

Exports are actual PNG images: square **1080 × 1080**, portrait **1080 × 1350**, and landscape **1920 × 1080**. Canvas rendering uses the full export resolution rather than resizing a browser screenshot. The landscape composition adapts to three panels; portrait and square layouts use three or four panels.

## Inside the package

`src/cover.js` holds deterministic canvas composition and effects. `src/main.js` manages the photo library, crop gestures, editing and downloads. `src/shots.js` implements the query modes in the starter `shots.json`: `?shot=cover` isolates the finished cover, while `?shot=editor` keeps the studio visible. Both accept `photo=pier` or `photo=boulevard` and a `caption` cover title. `window.palmskyReady` signals that fonts and photos are ready; `window.palmsky` exposes rendering and export controls for browser verification.

Run `MAKEFUN_OUTPUT_DIR=/tmp/out-r5 node main.ts` to package `app/`, `screenshots/` and the canonical `dossier.json`. Without that environment variable the destination is `/output`. The build prints a source inventory but adds no inventory file to the dossier output. The three screenshot proofs show two exported covers and the working editor.

## Rights

Application code is MIT licensed; see LICENSE. Anton, Bebas Neue and Pacifico are bundled under SIL OFL 1.1 with full license notices in `app/fonts/`. The two sample photographs were supplied by the challenge starter as free-to-use AI images. The design, lettering treatments, canvas ornament and code are original. No Rockstar logos, official GTA artwork or proprietary GTA fonts are included. Your own photos remain yours; use photos you have permission to reproduce.

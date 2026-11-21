# PalmSky Cover Studio

![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/jembot21/palmsky-cover-studio/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/jembot21/palmsky-cover-studio/reward.svg)

A little sunset, a little trouble. PalmSky turns ordinary photographs into
original crime-poster covers: sliced photo panels, oversized inked lettering,
sunburst printwork and a skyline of silhouetted palms. Start with a bundled
portrait or bring your own camera roll, then take home an actual PNG.

Built for the [make.fun cover-art challenge](https://make.fun/c/gta6-cover-art-01)
and its [cover studio bounty](https://make.fun/bounty/gta6-cover-art-01).

## Open the studio

Use Node 22 or newer. There is no installation, dependency download or bundler.

```sh
node serve.ts --port 8765
```

Open http://localhost:8765 in a modern browser. The default server port is 8080
if you omit the argument. All runtime assets live in `app/`; once served locally,
the studio needs no internet connection. User photographs stay inside the browser.

## From photo to poster

1. Choose Boulevard or Pier, or use **Add your photos** to pick several images.
2. Select one of four panels and click a library thumbnail to assign its photo.
   A single imported photo fills every panel; multiple photos fill consecutive panels.
3. Drag a panel in the live canvas to reframe. Zoom exposes tighter crops; reset
   returns that panel to its centered framing. The focused canvas also accepts
   arrow keys, and the panel selector provides a keyboard route to every panel.
4. Write a two-line title, top caption and small script accent. Try Vice split,
   Triptych or Crossfire, with Sunset, Neon or Mono print treatments.
5. Pick a format and press **Export PNG**. The export downloads immediately and
   opens an artwork proof with a second Save button.

Every format is rendered anew at its native size: **1080 × 1080** square,
**1080 × 1350** portrait, and **1920 × 1080** landscape. Exported artwork has
no editor controls, panel selection marks or watermark. The print treatment
combines tonal quantization, color mapping, fine halftone, seeded grain and vignette.

## Package and check

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out-r5 node main.ts
```

The entry point copies the app and three screenshots, then uses the unchanged
kit dossier builder to produce `dossier.json`. A console inventory reports the
packaged filenames and byte total without adding anything to the output folder.
The screenshot routes in `shots.json` are handled by `src/shots.js`: `?shot=cover`
displays a real app-generated PNG; `?shot=editor` keeps the working editor visible.
Both routes accept the supplied `photo` and `caption` parameters.

## Credits and licenses

The application is MIT licensed; see `LICENSE`. The bundled Anton, Bebas Neue
and Pacifico typefaces are under the SIL Open Font License 1.1, reproduced in
`app/fonts/OFL-Anton.txt`, `OFL-BebasNeue.txt` and `OFL-Pacifico.txt`.
The two starter photographs were generated for make.fun and supplied for free use.
PalmSky's composition, lettering treatment and drawn ornaments are original.
This project contains no Rockstar mark, official GTA illustration or official GTA font.

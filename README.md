# PalmSky Cover Studio

![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/jembot21/palmsky-cover-studio/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/reward.svg)

A private, offline poster workshop for sunlit mischief and neon nights. Turn local photographs into an original crime-cinema cover with angular panels, ink-heavy titles, print texture, and palm silhouettes. Created for the [make.fun cover art challenge](https://make.fun/c/gta6-cover-art-01).

Run `node serve.ts` with Node 22 and open http://localhost:8080. Alternatively serve the static `app/` directory with any local HTTP server. No installation, build step, external service, or account is required. Run `node main.ts` to package the app and screenshots into a dossier; set `MAKEFUN_OUTPUT_DIR` to choose its destination.

Choose a bundled demo or add several photos. Select one of the numbered panels and assign a photo, drag it to position, and adjust zoom. Change the headline, script accent, and edition. Three panel arrangements and sunset, neon, or monochrome treatments update the canvas immediately. Keyboard arrows also move the crop when the preview has focus.

Export real PNG artwork at **1080 × 1080**, **1080 × 1350**, or **1920 × 1080**. The last export can be opened at full size and downloaded again. Photographs remain in the browser; all fonts and sample assets are bundled. The query-driven screenshot mode follows the repository's `shots.json` cover/editor requests and displays a real PNG export for cover shots.

Application code is MIT licensed; see LICENSE. Anton, Bebas Neue, and Pacifico are distributed under SIL OFL 1.1, included beside the fonts. The two starter sample photographs were generated for make.fun and are free to use. Lettering, layout, and decorative artwork are original to this app; it includes no official game artwork, logos, or proprietary game fonts.

# RollPhase: contour colour fix and visual pass for the tab-icon packs

Repo `Mpdev007/rollphase`, branch **`glyph/contour`**. Push your commits to this branch. Open no PR, don't force-push, and leave `master` alone.
Edit only `prototype/glyph-preview/**` and `docs/research/2026-09-24-contour/**`. Don't bump the version or run `scripts/ship.ps1`.

## What the page is

`prototype/glyph-preview/mocks.html` previews five theme packs for RollPhase's bottom-tab icons:
Fight night (`f-`), Neon (`n-`), Chalk (`k-`), Ice (`i-`) and Bright (`r-`). Each pack has five icons: `home` (house), `gyms` (map pin),
`partners` (two athletes), `feed` (stack of cards) and `profile` (a head). The files are named `<art>-<job>.png`. Each is an RGBA cut-out of 3D-rendered art,
from 571 to 883 px square. The page has a Hue slider (0 to 360, plus colour chips), a Visibility slider (0 to 100) and pack buttons.
URL params: `?pack=fight&hue=218&vis=100`. `document.body.dataset.ready` becomes `"1"` once the page has painted.
The other files in that folder (`a-`, `b-`, `c-`, `tab-`, `sport-*.jpg`) are older rounds. Leave them. `sport-*.png` is used by the page.

To serve it: `cd prototype && python -m http.server 8876 --bind 127.0.0.1`, then open `/glyph-preview/mocks.html`.

## What the owner wants (his asks, in order)

- The gold "light" along each icon's outline is the accent. Moving Hue must change the colour of **the whole line, all the way around**,
  on every icon in every pack.
- Visibility makes the outline stronger and thicker for screens that wash colour out. It changes the outline and nothing else.
- The line is crisp. No colour bleeds into the icon, and no "cracks" or "squiggles" appear on faces, eyebrows, windows or seams.
- Faces, eyes, skin, windows and the body of each icon stay exactly as they are.
- All five packs behave the same way and show the same five things.
- High-end 3D and crisp, never fuzzy.

## The bug

The owner's screenshot is `docs/research/2026-09-24-contour/mike-half-line.png` (Fight night, Hue about 218 blue, Visibility about 46).
**Only half of each outline changed colour.** The left edges went blue and the right edges stayed gold.

Root cause, reproduced by `docs/research/2026-09-24-contour/rim_probe.py`, a Python port of the page's `paintAccent()`.
The before sheet is `sheet-fight-before.png`. Its rows are the original, hue 218 at vis 46, a map of where the recolour lands, and hue 218 at vis 100.
In the map, blue is the recoloured band and gold is gold that was left alone.

- `paintAccent()` (mocks.html, about line 257) recolours a **fixed-width ring measured inward from the blurred silhouette edge**:
  `rim = (1.5 + vis/100 * 4.5) * (w/104)` source px. That is about 23 to 30 px at vis 46 and about 38 to 50 px at vis 100.
- The gold bevel is baked into the art. On the lit (right) side it runs **30 to 50 px deep**, so only its outer sliver changes and the rest
  stays gold. On the shadow (left) side it is thin and changes completely. That is the "half the line" the owner saw.
- The gold edges between the stacked cards (`feed`) sit inside the silhouette, so they never change.
- An earlier attempt recoloured every gold-looking pixel through `isAccent()` (about line 251). Skin tones, eyebrows and window bars also match
  that test, which caused the cracks. Don't rely on `isAccent()` alone.

## How to fix it

- **The artwork is fixed for this pass.** Don't regenerate, redraw or replace the icon pictures. Fix how the page finds and
  recolours the light.
- Recommended: add an offline step (Python with Pillow and numpy, `pip install` is fine) that writes one **trim mask per icon**,
  `<art>-<job>-trim.png` (8-bit, soft edges). The mask holds the gold trim that belongs to the outline light. Find it by flooding
  from the silhouette boundary through gold pixels. That catches the full depth of the bevel on the lit side and the card-stack edges,
  and it leaves out skin, eyes, faces, windows and inside details. Per-pack tuning and per-icon overrides are fine. Commit the
  script and the masks.
- At runtime, recolour the masked pixels by **shifting their hue while keeping the light's own shading**: bright where it's lit and
  dark where it's in shadow. It should still read as a lit 3D edge in the new colour, not flat paint.
- **Visibility** strengthens the outline from the outside: an outer stroke or glow on the silhouette edge, plus more saturation and brightness
  on the trim. It never widens an inward band into the icon body. At vis 0 the trim still takes the hue. At vis 100 the line is
  clearly thicker and brighter. Every value in between works.
- **Chalk** is the white set with no gold. It gets the same outline behaviour, with the stroke or edge carrying the hue.
- Keep the page one self-contained HTML file with no frameworks. Slider drags must stay smooth: precompute per icon and don't rerun distance
  transforms on every input event.
- **Consistency:** all 25 icons must sit at the same visual size and baseline in the tab bar and in the strip. Right now the padding
  varies. Fix that by normalising the trim box or scale in the page, or by re-exporting tightly trimmed cut-outs, without changing the art.

## Check it before you push (required)

- For every pack, render a contact sheet: rows are vis 0, 46 and 100, columns are the five icons, one sheet per hue for **43** (gold),
  **218** (royal blue) and **322** (magenta). Use headless Chromium or Playwright against the served page if you can. If you use a
  Python port instead, say so. Commit them as `docs/research/2026-09-24-contour/after/<pack>-h<hue>.png`.
- Look at every icon yourself at full size:
  - the whole outline changes colour, on both sides;
  - no gold is left on the outline at any hue other than gold;
  - faces, eyes, skin, windows, doors and trophies take no colour;
  - no cracks or squiggles;
  - the edge is crisp, with no mushy halo.
- Write `docs/research/2026-09-24-contour/REPORT.md` covering:
  - what changed;
  - how the mask is built;
  - the checks you ran, naming the sheet files;
  - anything you could not fix.

  Also note in it that `f-`, `i-`, `n-` and `r-profile.png` are the same file, so four packs share one head. Report that and don't change it.

## Rules

- Push only to `glyph/contour`. No PR, no force-push, no `master`.
- Change nothing outside `prototype/glyph-preview/` and `docs/research/2026-09-24-contour/`. Don't touch the app files
  (`index.html`, `app.js`, `sw.js`, `version.json`).
- Don't delete the existing icon PNGs.

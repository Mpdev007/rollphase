# Follow-up 3: replace the head, and make the outline crisp

Start with `git pull` on `glyph/contour`. The reviewer pushed new evidence to `docs/research/2026-09-24-contour/review/`: the `*-r3.png` files, taken at a
normal screen scale (DPR 1), which is how the owner sees the page.

Round 3 is accepted. The light line recolours on the people icons and skin stays clean. Keep all of it. The owner looked at the page and
gave two new orders.

## 1. The outline looks like a blurry second copy of the icon (fix it)

The owner calls it "a blur, like it's overlapping images, especially on the head." At DPR 1 (`review/strip-dpr1-x4-r3.png`) the outer stroke
from `renderSheet()` is a **dark, semi-transparent, feathered band**. At vis 46 it is navy with about 0.8 alpha and a soft outer edge. On a dark
background that reads as a blurred shadow or ghost copy of the icon, not as a line. The head makes it worse: the stroke wraps the face and the dark side slab, so it looks
like two heads.

Make the stroke a **crisp line**:
- Fully opaque, with only about 1 source px of anti-aliasing. No soft outer feather and no glow.
- Bright at every Visibility setting: HSV value 0.85 or more and high saturation, so it never goes muddy or dark.
- Visibility sets only the width: from 0 (no stroke, the trim alone carries the hue) up to about 3 CSS px at 100, measured at the 104 px strip size.
- Check it at DPR 1 and DPR 1.25, in both the 104 px strip and the 42 px tab bar. Compare against a plain high-quality downscale of the
  source PNG. The icon itself must stay as sharp as that.

## 2. Replace the profile icon (the human head) in all five packs

The owner: "the person's head — change that with something else, it doesn't look good. I don't want human-like, just make a cool icon."

- New `profile` art for **every** pack. Replace `f-`, `n-`, `k-`, `i-` and `r-profile.png` and their `-trim.png`. Don't touch the other 20 icons.
- Concept: the classic **profile bust, but premium 3D with no face**. A smooth rounded head (a slightly flattened sphere), a short neck and
  rounded shoulders, like a sculpted trophy bust or a chess piece. No face, eyes, hair or skin. It must read as "me / my profile" at 42 px.
  It should sit in the same family as the house, pin and cards: a solid, bevelled object in a 3/4 view, lit from the upper right.
- **Model and render it** yourself. Blender with Cycles (bpy from PyPI, or Blender from apt) is preferred. three.js with PBR materials rendered in headless
  Chromium is fine too. Use real geometry with generous bevels, soft area lights and ambient occlusion, a transparent background, and at least 1024 px.
  **Never a flat or extruded silhouette.** That was rejected before as "horrible."
- One mesh, five materials, matching each pack's other icons (look at their `-home`, `-gyms` and `-feed` art):
  - `f` Fight night: matte black body with a polished gold trim band.
  - `n` Neon: gloss black body with a glowing gold edge.
  - `k` Chalk: white ceramic with no gold. It follows the Chalk outline rule.
  - `i` Ice: frosted translucent ice or glass with a gold edge.
  - `r` Bright: cream enamel with gold trim.
- Put the gold trim on its **own object** (for example, a thin band along the shoulder rim and the head's outline). Render it as a separate
  pass to produce `-trim.png` directly, so the recolour mask is exact rather than guessed.
- Commit the model or scene script (for example `docs/research/2026-09-24-contour/profile_bust.py`) so it can be re-rendered.

## Check it and report

- Re-render the `after/` sheets for every pack at hues 43, 218 and 322 and vis 0, 46 and 100. Also render **DPR 1** strips at 4x nearest-neighbour
  zoom, in `after/dpr1-<pack>.png`, so the crispness is visible.
- Look at them yourself before you push. The outline is a clean line, not a halo. The new bust matches each pack's material and reads at
  42 px. The whole trim changes colour.
- Update `REPORT.md`. Push to `glyph/contour` only.

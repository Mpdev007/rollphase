# Follow-up 1: colour is bleeding onto skin (blocker)

Start with `git pull` on `glyph/contour`. The reviewer pushed evidence to `docs/research/2026-09-24-contour/review/`.

The half-line bug is fixed: every outline now recolours on both sides, in every pack. Keep that.

**Blocker: the recolour lands on skin and eyes.** The owner's first rule was that faces, eyes and skin stay as they are.
The reviewer checked the served page in headless Chrome, driving the real sliders:

- `review/zoom-skin.png` (Fight night; rows are hue 43/vis 46, 218/46, 322/46 and 218/0):
  - **partners**: the woman's face, neck, arm and hand turn blue or pink. Even at gold (43) her skin goes saturated yellow.
  - **profile** (the head shared by fight, neon, ice and bright): a large patch on the right cheek, jaw and temple takes the colour at every hue,
    including gold. At vis 0 it already shows as a blue smear.
- `review/mask-overlay.png`: every `-trim.png` drawn in red over its icon. Problems:
  - the shared head's mask (`f/n/i/r-profile-trim.png`) covers that cheek, jaw and temple area;
  - `k-profile-trim.png` covers the **right eye**;
  - the partners masks spill onto the women's skin. The soft, low mask values are the problem: `renderSheet()` recolours any
    pixel with mask > 0.02, and `shiftHue()` lifts saturation to a floor of 0.32 or more, so a mask of 0.3 on skin still reads as a strong colour.
- `review/overview-packs.png`: all five packs at hue 218/vis 46 and hue 43/vis 100, for reference.

## What to do

1. Make every mask **exactly 0 on skin, faces, eyes, lips, hair and hands** on all 25 icons. The art is fixed, so per-icon exclusion
   regions are fine and expected: polygons or ellipses in `build_trim.py`, or a hand-made `-keep.png` that zeroes the mask. Skin hues
   (roughly 10 to 38 degrees, medium saturation) must not be flooded, even where they touch the silhouette. The only colour allowed on the head
   is the head's rim or bevel and the outer stroke. Nothing reaches the face.
2. Drop the soft low-value tail: clamp mask values under about 0.15 to 0. Also make sure `shiftHue()` never raises the saturation of
   a pixel whose mask is low. Blend by the mask, don't push colour into it.
3. Re-check with the same sheets as before (every pack at hues 43, 218 and 322, vis 0, 46 and 100), and add a **zoomed sheet of every
   partners and profile icon** at hue 218, vis 0. That's where the bleed shows most, because there is no stroke. Replace the files in
   `after/`, and add `after/zoom-skin-<pack>.png`.
4. Nice to have: a slider change repaints in about 130 ms per input event now (5 icons, full-image loops). If it's cheap, precompute
   the list of mask and stroke pixel indices per icon so a drag only touches those pixels.

Don't change the outer-stroke look or the artwork. The owner judges the vis 100 stroke himself.
Update `REPORT.md`: what changed, and a line per icon for anything still not clean. Push to `glyph/contour` only.

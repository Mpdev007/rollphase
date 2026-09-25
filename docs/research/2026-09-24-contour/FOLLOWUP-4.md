# Follow-up 4: the bust failed review. Make a profile medallion instead.

Start with `git pull` on `glyph/contour`. New evidence is in `docs/research/2026-09-24-contour/review/`: the `*-r4.png` files.

**Accepted from round 4: the crisp outline.** At DPR 1 it's a clean, solid line in the strip and the tab bar. Don't touch the stroke code again.

**Rejected: the bust** (`review/bust-src-and-trim-r4.png`, `review/dpr1-all-r4.png`):
- The "gold trim" object is a large triangular sheet or veil hanging from the head to the shoulders. At any hue other than gold it becomes a big
  translucent blue or pink cone, so the icon reads as a hooded ghost.
- The shoulders are a lumpy puddle, and the head is a plain mannequin egg on a thin neck. It doesn't sit with the house, pin and cards.
- The trim mask is that whole sheet, not a thin line.

## Build this instead: a profile medallion

It's one clean object that reads as "my profile" at 42 px and matches the pin's round gold ring:
- **Disc:** diameter 2.0, thickness about 0.32. Round the edges with bevels. Show it in the same 3/4 view as the pin (tilted about 25 degrees back,
  turned about 20 degrees) and lit from the upper right.
- **Rim:** a separate **torus-profile band** around the disc's edge, about 0.09 thick. This is the only gold object and the only trim
  pass. That gives `-trim.png` = the rim ring and nothing else.
- **Face:** a shallow recessed field (about 0.04 deep) with a **raised relief of the classic profile bust**:
  - a round head (circle about 0.62 of the field's height, including the shoulders);
  - a smooth shoulder arc below it, clipped by the field's circle;
  - raised about 0.07, with soft bevels, so the lighting separates it from the field.

  It's the universal "user" glyph, sculpted into a coin. There's no face and nothing else.
- **Readability:** at 42 px the relief must still read as a head-and-shoulders mark. If it doesn't, raise it higher, add a thin groove
  where the relief meets the field, or give the relief a slightly brighter finish than the field.
- **Materials,** matched to each pack's other icons:
  - Fight night: a matte black disc and relief with a polished gold rim.
  - Neon: gloss black with a gold rim that also emits a soft light.
  - Chalk: white ceramic with no gold. The rim is white ceramic too, and it follows the Chalk outline rule.
  - Ice: frosted glass or ice with a gold rim.
  - Bright: cream enamel with a gold rim.
- Render in Cycles at 1280 px or more, with a transparent background. Replace the five `-profile.png` files and their `-trim.png` masks. Delete
  `profile_bust.py`, or rewrite it as `profile_medallion.py`, so it stays reproducible.

## Check it before you push

- Put each pack's new profile icon next to that pack's pin at 104 px and at 42 px, at DPR 1. It should look like the same family.
- At hues 218 and 322, only the rim ring and the outer stroke change colour. No cones, no sheets, no colour on the face.
- Re-render `after/` and `after/dpr1-<pack>.png`, and add `after/profile-medallion-<pack>.png` (the source art at 400 px next to its trim mask).
  Update `REPORT.md`. Push to `glyph/contour` only.

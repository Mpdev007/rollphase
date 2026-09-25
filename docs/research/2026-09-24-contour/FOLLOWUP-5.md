# Follow-up 5: the medallion failed too. Build the profile figure to this exact recipe.

Start with `git pull` on `glyph/contour`. The evidence is `review/medallion-src-trim-r5.png` and `review/dpr1-medallion-r5.png`.

The outline stroke stays exactly as it is (accepted). Only the five `profile` icons change.

**Why the medallion failed:**
- The raised relief renders as a lumpy, crumpled shape with shading artefacts, not a clean head and shoulders.
- At 42 px (tab bar) it reads as a plain grey button, and on Chalk, Ice and Bright as an empty plate.
- Fight night's disc is mid-grey, not matte black like the pack's pin.
- The trim mask is a full ring, even where the rim is hidden behind the disc.

## Build exactly this (Blender Cycles; numbers are Blender units, Z up)

**Object: a free-standing 3D "user" figure.** It's the universal profile glyph as a solid sculpted object: a head sphere over a shoulder dome. No face.
- **Head:** a UV sphere with radius 0.58, centred at (0, 0, 1.72), 64×32 segments, smooth shaded.
- **Shoulders:** a UV sphere scaled (1.05, 0.55, 0.75), centred at (0, 0, 0.35), cut flat at z = 0 (bisect, fill the cap). Add a bevel modifier on the
  flat bottom edge (width 0.06, 4 segments). Smooth shade it and add weighted normals. Its top is at z = 1.10, which leaves a **0.04 gap** under the head (keep the gap).
- **Gold trim**, two separate objects, both on the gold material and both **only** in the trim pass:
  1. **Base ring:** a torus along the shoulders' bottom edge, major radius 1.0, minor radius 0.035, scaled Y by 0.55/1.05 so it follows the elliptical
     footprint. It sits at z = 0.04.
  2. **Head ring:** a torus with major radius 0.585 and minor radius 0.022, centred on the head, with its axis **pointed at the camera**, so it reads as a thin
     lit rim around the head's outline.
- **Camera:** 85 mm. Position it in front and to the right, about 20 degrees to the side and 12 degrees above, aimed at (0, 0, 0.95). Frame the figure to fill about 80 % of
  the frame height. Match the 3/4 feel of the pack's pin.
- **Lights:**
  - key: a large area light at the upper right front (soft);
  - rim: an area light behind and to the left, strong enough to separate a black body from the dark app background;
  - fill: a low, weak light at the front left.

  Film is transparent. Use 128+ samples with denoise, at **1280 px**.
- **Materials** (Principled BSDF):
  - `f` Fight night: body base 0.02 grey, roughness 0.5 (it must read **black**, like the pin); trim gold metallic 1, base (1.0, 0.77, 0.34), roughness 0.25.
  - `n` Neon: body gloss black, roughness 0.12; gold trim plus emission strength 2.
  - `k` Chalk: body white ceramic (base 0.92, roughness 0.35, light coat); trim uses the **same white ceramic** (Chalk has no gold) and keeps the Chalk outline rule.
  - `i` Ice: body frosted glass (transmission 1, roughness 0.35, faint cyan tint); gold trim.
  - `r` Bright: body cream enamel (0.93, 0.89, 0.78), roughness 0.3; gold trim.
- **Trim mask pass:** render again with the body set to **holdout** and the trim as flat white emission. The mask then holds only the trim pixels that are
  **actually visible**. Save it as `<art>-profile-trim.png`, with the same size and framing as the beauty render.
- Keep the scene script in `docs/research/2026-09-24-contour/profile_figure.py`. Delete `profile_medallion.py`.

## Check it before you push

- At DPR 1, put each pack's profile icon next to that pack's pin in the 104 px strip **and** the 42 px tab bar. It must read clearly as a head over shoulders
  at 42 px, and look like the same family as the pin (same black, white, glass or cream body, with gold where the pin has gold).
- At hues 218 and 322, only the two thin rings and the outer stroke change colour.
- Re-render `after/`, `after/dpr1-<pack>.png` and `after/profile-figure-<pack>.png` (the art at 400 px next to its mask). Update `REPORT.md`. Push
  to `glyph/contour` only.

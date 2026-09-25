# Follow-up 2: the people icons lost their light

Run `git pull` on `glyph/contour` first. The reviewer pushed new evidence to `docs/research/2026-09-24-contour/review/` (the `*-r2.png` files).

The skin fix worked: faces, eyes, skin and hands are clean on all 25 icons. **Keep that exactly.** It overcorrected on the people icons, though:
**their gold light no longer changes colour at all.** That is the owner's original complaint ("I try to change the yellow and I cannot").
Checked in headless Chrome through the real sliders:

- `review/zoom-fight-people-r2.png` (rows: hue 218/vis 0, 218/46, 322/46): the **head** (`f/n/i/r-profile`, one shared file) has a thin, bright gold
  line running down the face edge and around the jaw, where the face meets the dark side slab. It **stays gold at every hue**, inside the blue or
  magenta stroke. At vis 0 the head shows no hue at all.
- `review/zoom-people-r2.png` (rows neon, ice, bright, chalk; columns partners 218/0, partners 218/46, head 218/0, head 322/46):
  - **neon partners**: the gold glow hugging both bodies stays gold at 218, both at vis 0 and inside the vis 46 stroke.
  - **ice partners**: the gold edge light down the man's left side and the woman's right side stays gold.
  - bright and chalk partners have no gold outline light, so they're fine as they are.

## What to do

1. Put the **gold light line** back into the mask for `profile` (shared head) and for `n-partners` and `i-partners`, and check `f-partners`
   and `r-partners` the same way. That line is separable from skin:
   - **light line:** hue about 38 to 60 degrees, saturation 0.45 or more, value 0.62 or more, thin (a few px at source size);
   - **skin:** hue about 10 to 35 degrees, lower value and saturation.

   Select the line by those thresholds, restricted to a narrow band next to the silhouette or next to the face-to-slab edge. Then dilate it by 1 px and feather it, so it recolours cleanly without a gold fringe. Skin stays 0.
2. Acceptance, for every pack at hues 218 and 322 and vis 0, 46 and 100: **no gold left on any outline light**, faces still untouched.
   The only gold allowed at hue 218 is interior detail: window glow, trophies, outfit piping and logos.
3. Re-render `after/` and `after/zoom-skin-<pack>.png`, and add `after/zoom-light-<pack>.png` (partners and profile, hue 218 at vis 0,
   zoomed) so the light line is visible. Update `REPORT.md`.

Don't change anything else: the stroke look, the other icons' masks, the art, the performance work. Push to `glyph/contour` only.

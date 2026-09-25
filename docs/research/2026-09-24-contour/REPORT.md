# Contour colour fix

The hue slider now recolours the whole outline light on all five packs. Visibility thickens that line outward and brightens it. Faces, windows and the icon body stay as they were.

## What changed

- `docs/research/2026-09-24-contour/build_trim.py` writes one 8-bit mask per icon: `prototype/glyph-preview/<art>-<job>-trim.png`.
- `prototype/glyph-preview/mocks.html` recolours only those masked pixels, by shifting hue and keeping each pixel’s own saturation and value (lifted as visibility goes up). It no longer paints a fixed inward ring, and it no longer uses `isAccent()`.
- Visibility adds a short outer stroke on the silhouette (zero at vis 0, about 5.5 reference pixels at vis 100) plus more saturation and brightness on the trim. The stroke does not grow inward.
- Icons are fitted from their opaque bounds, bottom-aligned, so the old uneven padding no longer shifts them in the tab bar or the strip.

## How the mask is built

For Fight night, Neon, Ice and Bright:

1. Gold pixels are those in a warm hue band with enough saturation and value (thresholds differ a little by pack and for the partner icons).
2. A flood from the silhouette edge keeps the gold that actually touches the outline, capped at the bevel depth (about 36–64 source pixels). That is the full lit-side bevel, not a thin outer sliver.
3. A looser warm test, only in the outer 12 pixels, picks up the dark shadow rim that would otherwise fail the strict test.
4. Feed icons also keep thin gold ribbons (local thickness ≤ 6.5px) connected to that bevel, which is the card-stack edge inside the silhouette.
5. A 9-pixel ring on the silhouette is unioned in so a side with no gold still takes the hue.
6. The mask is dilated one pixel and blurred slightly so the antialiased fringe of the gold does not stay behind as a crack. It is zeroed more than about 2 pixels away from that core.

Chalk has no gold bevel. Its mask is a soft 16-pixel band on the white silhouette. The same outer stroke and hue shift run on that band, so chalk follows the other packs.

`f-profile.png`, `n-profile.png`, `i-profile.png` and `r-profile.png` are the same file (md5 `a74b31f736d7e2fc79031764ec595c03`). The four packs share one head. The masks for those four are copies of the Fight night profile mask. The PNGs themselves were not edited.

## Checks

Served `prototype/` at `http://127.0.0.1:8876` and drove the real page in headless Chrome via Playwright (`document.body.dataset.ready === "1"`). For each pack and for hues 43, 218 and 322, the strip canvases were read out at vis 0, 46 and 100 and composited.

Sheets:

- `after/fight-h43.png`, `after/fight-h218.png`, `after/fight-h322.png`
- `after/neon-h43.png`, `after/neon-h218.png`, `after/neon-h322.png`
- `after/chalk-h43.png`, `after/chalk-h218.png`, `after/chalk-h322.png`
- `after/ice-h43.png`, `after/ice-h218.png`, `after/ice-h322.png`
- `after/bright-h43.png`, `after/bright-h218.png`, `after/bright-h322.png`

Rows are vis 0, 46, 100. Columns are home, gyms, partners, feed, profile.

Pixel samples on every cell, both sides of the outline:

- Hue 218 reads blue, about `(7, 54, 136)`.
- Hue 322 reads magenta, about `(135, 8, 90)`.
- Hue 43 reads gold, about `(135, 100, 9)`.

Fight night home at vis 0 (no stroke) is dark on the shadow side and clearly blue on the lit bevel, so the shading of the light is still there. Opaque bounds grow from vis 0 to vis 100 (Fight night home 268×257 to 303×289 on the 312 canvas), which is the outer stroke. Chalk home’s centre stays near `(198, 198, 196)`. Fight night profile’s face centre stays skin-toned, near `(120, 87, 72)`. Bright feed’s centre stays peach at hue 322; the magenta is the seams plus the outer stroke.

I looked at the Fight night, Chalk and Bright sheets at full cell size (312px), and sampled the other two packs the same way.

## Follow-up: skin bleed

The 9px ring and the soft mask tail were painting skin. People icons no longer get that ring. On partners and profile, pixels in the skin hue band (about 0–40° and 350–360°, medium saturation) are forced to mask 0, including where they touch the silhouette. Profile also clears an ellipse over the head interior, so the cheek, jaw, temple and eyes stay out; only the rim remains. Partners clear the upper interior (hair and faces) past 8px in from the edge. Chalk uses the same skin clear and the head ellipse, which takes the right eye off `k-profile`.

Mask values under 0.15 are stored as 0. `shiftHue()` only lifts saturation in proportion to the mask, and the page ignores anything below 0.15. Repaints walk a precomputed list of trim and stroke pixels (about 37ms per slider event on this machine). The outer stroke math is unchanged.

Re-rendered the fifteen contact sheets in `after/`, plus `after/zoom-skin-<pack>.png` (partners and profile, hue 218, vis 0).

Per icon, what is still not clean:

- f-home, n-home, i-home, r-home, k-home: clean. Outline on both sides. No skin.
- f-gyms, n-gyms, i-gyms, r-gyms, k-gyms: clean. Outline on both sides. No skin.
- f-feed, n-feed, i-feed, r-feed, k-feed: clean. Card seams still recolour. No skin.
- f-partners, n-partners, i-partners, r-partners, k-partners: face, neck and hand interiors are mask 0. A gold rim can still sit on the outer edge of an arm where that edge is the bevel, not skin hue.
- f-profile, n-profile, i-profile, r-profile: one shared head. Cheek, jaw, temple and eye are mask 0. The rim around the skull still takes the hue.
- k-profile: face and right eye are mask 0. The white rim still takes the hue.

## What is left

- Interior gold that is not the outline (window glow, warm wall colour, trophies inside the form) stays gold. It is not connected as trim, which is what keeps faces and windows clean.
- At vis 0 the shadow side is a dark version of the hue. The loud, even line is the lit bevel plus the outer stroke, which is what visibility turns up.
- Homes are a little shorter than the tall icons (pins, athletes) because they are wider. They share the same bottom edge and the same fit box; the art’s aspect ratio is unchanged.

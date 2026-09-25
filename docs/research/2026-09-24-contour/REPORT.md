# Contour colour fix

The hue slider now recolours the whole outline light on all five packs. Visibility thickens that line outward and brightens it. Faces, windows and the icon body stay as they were.

## What changed

- `docs/research/2026-09-24-contour/build_trim.py` writes one 8-bit mask per icon: `prototype/glyph-preview/<art>-<job>-trim.png`.
- `prototype/glyph-preview/mocks.html` recolours only those masked pixels, by shifting hue and keeping each pixel’s own saturation and value (lifted as visibility goes up). It no longer paints a fixed inward ring, and it no longer uses `isAccent()`.
- Visibility adds a short outer stroke on the silhouette. Follow-up 3 replaced the old dark feather (about 5.5 reference pixels) with a bright opaque line, zero at vis 0 and about 3 CSS px at vis 100 on the 104px strip. The stroke does not grow inward.
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

## Follow-up 2: people outline light

The skin clear stays. On the shared head and on the partner icons, the bright gold line is added back on top of that clear: hue 38–60, saturation at least 0.45, value at least 0.62, only where the line is thin and sits next to the silhouette or a darker edge (the face-to-slab line). It is dilated one pixel and feathered, then any pixel in the skin hue band (about 10–35°) is set back to 0. Chalk is unchanged. Home, gyms and feed masks are unchanged.

At hue 218 and vis 0, that line is no longer gold: a few pixels at most remain on partners and profile (`after/zoom-light-<pack>.png`). Face centers stay skin-toned. The same sheets as before were re-rendered.

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

## Follow-up 3: crisp stroke, and a faceless bust

The outer stroke is no longer a dark feathered band. In `renderSheet()` the width is `visibility/100 * 3 * (imageWidth/104)` source pixels, so at the 104px strip it is 0 at vis 0 and about 3 CSS px at vis 100. The colour is fixed at saturation 0.96 and value 0.92 (hue 218 is `(9, 92, 235)`). Coverage is fully opaque inside that width and falls off over 1 source pixel. There is no glow and no soft outer feather.

Measured on the Fight night home strip at DPR 1: vis 46 is one solid CSS pixel of that blue, vis 100 stays inside about 3 CSS px of the vis-0 silhouette (median 2, max 3.2). The tab bar at 42px is about 1.4 CSS px at vis 100, which is the same stroke scaled with the icon. The icon edge at vis 0 jumps from the background in a single CSS pixel, and the page’s edge energy matches a Lanczos downscale of the source PNG (about 9.1 vs 9.0). DPR 1.25 shows the same canvases at 130px and 53px.

The profile icon is a new mesh in all five packs. `profile_bust.py` builds one metaball bust (flattened head, short neck, rounded shoulders) and a separate gold trim (shoulder rim and a band around the head), lit from the upper right, and renders it with Cycles at 1280px on a transparent background. Fight night is matte black with polished gold, Neon is gloss black with a glowing gold edge, Ice is frosted glass with a gold edge, Bright is cream enamel with gold trim, and Chalk is white ceramic with no gold. The gold packs’ `-trim.png` is the trim object’s alpha from its own pass, with values under 0.15 stored as 0. Chalk uses the same soft silhouette rim as the other chalk icons. The other twenty icons are unchanged.

`f-profile.png`, `n-profile.png`, `i-profile.png` and `r-profile.png` are no longer one shared file. On the Fight night bust, hue 43, 218 and 322 at vis 0 move the same trim pixels (about 7.7k on the 312 canvas) from gold to blue to magenta.

Sheets in `after/` were rendered again for every pack at hues 43, 218 and 322 and vis 0, 46 and 100. `after/dpr1-<pack>.png` is the DPR 1 strip at hue 218 and vis 100, scaled 4× with nearest-neighbour.

## Follow-up 4: profile medallion

The crisp stroke is unchanged. The bust is gone. `profile_bust.py` is deleted. `profile_medallion.py` builds a coin: a disc of diameter 2 and thickness 0.32 with bevelled edges, a recessed field, and a raised head-and-shoulders relief (a round head and a shoulder arc clipped by the field). The only gold object is a torus around the disc edge, about 0.09 thick. The coin is tilted 25 degrees back, turned 20 degrees, and lit from the upper right. Cycles renders it at 1280px on a transparent background.

Fight night is matte black with a polished gold rim. Neon is gloss black with a gold rim that emits. Ice is frosted glass with a gold rim. Bright is cream enamel with a gold rim. Chalk is white ceramic, rim included, and its mask is the chalk outline rule. For the gold packs, `-trim.png` is the rim’s own alpha pass, and the centre of that mask is empty. The relief is a slightly lighter finish than the field so it still reads at 42px.

At vis 0, hue 218 against hue 43 changes no pixels in the inner 45% of the profile icon. Fight night moves 6889 outer pixels, Neon 7828, Chalk 1300, Ice 10572, Bright 10521. The same is true at hue 322. There is no sheet and no cone.

`after/profile-medallion-<pack>.png` is the source art at 400px beside its trim mask. The contact sheets and DPR 1 strips were rendered again.

## Follow-up 5: profile figure

The stroke is unchanged. The medallion is gone. `profile_medallion.py` is deleted. `profile_figure.py` builds the figure to the given sizes: a UV sphere head at z = 1.72 and a shoulder dome cut flat at z = 0, with the 0.04 gap left between them. The shoulder bottom edge is bevelled. Two toruses are the only gold: an elliptical base ring, and a head ring whose axis points at the camera. The camera is 85 mm, 20 degrees to the side and 12 degrees up, aimed at (0, 0, 0.95). Cycles renders at 1280 px. This Blender build has no OpenImageDenoise, so the render is 128 samples with denoising off.

Fight night’s body is base 0.02, roughness 0.5. On the 312 canvas at vis 0 the lit head stays about `(71, 69, 68)` at hues 43, 218 and 322. Neon is gloss black with emission 2 on the gold. Chalk is white ceramic, rings included, and its mask is the chalk outline. Ice is frosted glass. Bright is cream enamel. For the gold packs the mask pass sets the body to holdout and the rings to flat white, so hidden ring pixels are not in the mask.

At vis 0 the head centre does not change between hues 43, 218 and 322 on any pack. The pixels that do change are the two rings: Fight night 2962, Neon 3810, Chalk 2008, Ice 3058, Bright 3107.

`after/profile-figure-<pack>.png` is the art at 400 px beside its mask. The contact sheets and DPR 1 strips were rendered again.

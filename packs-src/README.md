# packs-src — icon-pack sources (not shipped)

Everything an image lane needs, kept outside `prototype/` so nothing here is served.

| Folder | What it is |
|---|---|
| `fight/ neon/ chalk/ ice/ bright/` | The five theme packs' tab art (home, gyms, partners, feed, profile) as 1024-px RGBA cut-outs, plus each `-trim.png` recolour mask. Profile = the generated fight headgear. |
| `classic/` | The 21 sport icons as RGBA cut-outs (1024 px). Lane F exports the Classic pack from these. |
| `tools/key_green.py` | Cuts a flat chroma-green generation out to RGBA (floods from the border, pulls spill). |
| `tools/build_trim.py` | Builds a `-trim.png` mask: the gold trim that connects to the silhouette, minus skin. |
| `ref/headgear-concept.jpg` | The profile-icon concept (empty headgear, no person). |
| `ref/pack-style-sheet.png` | Each pack's home / gyms / feed art side by side: the style reference for generations. |

Shipped pack files go under `prototype/packs/<pack>/` (see `docs/qa/QA-MAXDEEP-2026-09-26.md`, section 5.5 for the manifest and section 7b for the image lanes).

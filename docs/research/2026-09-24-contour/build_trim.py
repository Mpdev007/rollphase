"""Build an 8-bit trim mask for each tab icon.

The mask is the outline light: gold bevel flooded in from the silhouette,
plus the thin card-stack seams on feed icons. Chalk has no gold, so its
mask is a soft band on the silhouette edge. Skin, windows and interior
detail stay out because they are not boundary-connected gold.

Writes prototype/glyph-preview/<art>-<job>-trim.png
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "prototype", "glyph-preview"))

ARTS = ["f", "n", "k", "i", "r"]
JOBS = ["home", "gyms", "partners", "feed", "profile"]

# hue lo/hi, sat, val, bevel depth in source px
PACK = {
    "f": dict(hue=(24, 68), sat=0.28, val=0.18, bevel=62),
    "n": dict(hue=(24, 70), sat=0.30, val=0.18, bevel=64),
    "i": dict(hue=(26, 68), sat=0.26, val=0.20, bevel=62),
    "r": dict(hue=(24, 68), sat=0.32, val=0.22, bevel=58),
    "k": dict(hue=(24, 68), sat=0.45, val=0.30, bevel=8),
}
# per-icon overrides (art-job)
ICON = {
    "f-partners": dict(hue=(22, 64), sat=0.22, val=0.12, bevel=36),
    "n-partners": dict(hue=(24, 68), sat=0.28, val=0.16, bevel=48),
    "i-partners": dict(hue=(24, 66), sat=0.26, val=0.16, bevel=40),
    "r-partners": dict(hue=(24, 66), sat=0.30, val=0.18, bevel=46),
    "k-partners": dict(bevel=10),
    "r-home": dict(sat=0.34, bevel=52),
    "r-feed": dict(sat=0.34),
    "n-home": dict(sat=0.32, bevel=58),
    "i-gyms": dict(sat=0.22, val=0.16, bevel=64),
}


def hsv(rgb):
    x = rgb.astype(np.float64)
    r, g, b = x[:, :, 0] / 255, x[:, :, 1] / 255, x[:, :, 2] / 255
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm = m & (mx == r)
    gm = m & (mx == g)
    bm = m & (mx == b) & ~rm
    h[rm] = ((g[rm] - b[rm]) / d[rm]) % 6
    h[gm] = (b[gm] - r[gm]) / d[gm] + 2
    h[bm] = (r[bm] - g[bm]) / d[bm] + 4
    sat = np.where(mx == 0, 0, d / np.maximum(mx, 1e-8))
    return (h / 6) * 360, sat, mx


def params(art, job):
    p = dict(PACK[art])
    p.update(ICON.get(f"{art}-{job}", {}))
    return p


def connected_to_edge(cand, edge):
    lab, _ = ndimage.label(cand, structure=np.ones((3, 3), np.uint8))
    labs = np.unique(lab[edge & cand])
    labs = labs[labs > 0]
    if len(labs) == 0:
        return np.zeros(cand.shape, bool)
    return np.isin(lab, labs)


def soften(binary, sigma=1.15):
    hard = binary.astype(np.float64)
    # 1px of growth so the antialiased gold fringe is included, then a short blur
    grown = ndimage.binary_dilation(binary, iterations=1)
    field = grown.astype(np.float64)
    soft = ndimage.gaussian_filter(field, sigma)
    soft = np.clip(soft, 0, 1)
    # keep the core opaque and stop the blur wandering into the body
    dist_out = ndimage.distance_transform_edt(~grown)
    soft[dist_out > 2.2] = 0
    soft[hard > 0] = np.maximum(soft[hard > 0], 0.92)
    soft[soft < 0.04] = 0
    return soft


def chalk_mask(on, dist):
    # soft outer band of the white shape; falls off within ~16px so the body stays white
    width = 16.0
    t = np.clip(1 - dist / width, 0, 1)
    # ease so the outer pixels are solid and the inner edge is short
    t = t * t * (3 - 2 * t)
    t[dist > width] = 0
    t[~on] = 0
    rim = on & (dist <= 2.5)
    t[rim] = np.maximum(t[rim], 0.85)
    return t


def gold_mask(im, art, job):
    p = params(art, job)
    h, s, v = hsv(im[:, :, :3])
    on = im[:, :, 3] > 24
    dist = ndimage.distance_transform_edt(on)
    lo, hi = p["hue"]
    strict = on & (h >= lo) & (h <= hi) & (s >= p["sat"]) & (v >= p["val"])
    # looser warm pixels only in the outer fringe, so a dark shadow rim still joins
    loose = (
        on
        & (dist <= 12)
        & (h >= lo - 6)
        & (h <= hi + 6)
        & (s >= max(0.14, p["sat"] - 0.14))
        & (v >= 0.08)
    )
    edge = on & (dist <= 2.0)
    bevel = connected_to_edge(strict & (dist <= p["bevel"]), edge)
    fringe = connected_to_edge(loose & (dist <= 12), edge | ndimage.binary_dilation(bevel, iterations=1))
    mask = bevel | fringe
    # Every pack keeps a thin ring on the silhouette so the shadow side
    # changes even when that side of the bevel is too dark to count as gold.
    ring = on & (dist <= 9)
    mask = mask | ring
    if job == "feed" and art != "k":
        thick = ndimage.distance_transform_edt(strict)
        ribbon = strict & (thick <= 6.5)
        touch = ndimage.binary_dilation(mask, iterations=2)
        ribs = connected_to_edge(ribbon, touch & ribbon)
        mask = mask | ribs
    return soften(mask), on, dist


def build_one(art, job):
    path = os.path.join(SRC, f"{art}-{job}.png")
    im = np.asarray(Image.open(path).convert("RGBA"))
    if art == "k":
        on = im[:, :, 3] > 24
        dist = ndimage.distance_transform_edt(on)
        # chalk profile/partners still have skin; the rim is the white edge, not a gold flood
        soft = chalk_mask(on, dist)
    else:
        soft, on, dist = gold_mask(im, art, job)
    out = np.clip(np.round(soft * 255), 0, 255).astype(np.uint8)
    dest = os.path.join(SRC, f"{art}-{job}-trim.png")
    Image.fromarray(out, "L").save(dest)
    ys, xs = np.nonzero(on)
    print(
        f"{art}-{job}: mask {int((out > 16).sum())} "
        f"p50 {np.percentile(dist[out > 128], 50) if (out > 128).any() else 0:.1f} "
        f"bbox {xs.max()-xs.min()+1}x{ys.max()-ys.min()+1}"
    )


def main():
    for art in ARTS:
        for job in JOBS:
            build_one(art, job)
    # f-, n-, i- and r-profile.png are the same picture, so they share one mask.
    shared = os.path.join(SRC, "f-profile-trim.png")
    raw = open(shared, "rb").read()
    for art in ("n", "i", "r"):
        dest = os.path.join(SRC, f"{art}-profile-trim.png")
        open(dest, "wb").write(raw)
        print(f"copied f-profile-trim -> {art}-profile-trim")


if __name__ == "__main__":
    main()

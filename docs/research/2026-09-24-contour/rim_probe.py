"""Read-only port of mocks.html paintAccent() to see where the recolour lands.

Usage: python rim_probe.py f-home.png f-gyms.png ...  (writes debug PNGs to ./rim_probe_out)
"""
import sys, os, hashlib, glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "prototype", "glyph-preview"))
OUT = os.path.join(HERE, "rim_probe_out")
os.makedirs(OUT, exist_ok=True)


def box_blur(a, r):
    # same clamp-edge running box as the JS boxBlur, horizontal then vertical
    h, w = a.shape
    pad = np.pad(a, ((0, 0), (r, r + 1)), mode="edge")
    c = np.cumsum(pad, axis=1, dtype=np.float64)
    c = np.concatenate([np.zeros((h, 1)), c], axis=1)
    tmp = (c[:, 2 * r + 1: 2 * r + 1 + w] - c[:, 0:w]) / (2 * r + 1)
    pad = np.pad(tmp, ((r, r + 1), (0, 0)), mode="edge")
    c = np.cumsum(pad, axis=0, dtype=np.float64)
    c = np.concatenate([np.zeros((1, w)), c], axis=0)
    return (c[2 * r + 1: 2 * r + 1 + h, :] - c[0:h, :]) / (2 * r + 1)


def edt1d(f):
    n = len(f)
    d = np.empty(n)
    v = np.zeros(n, dtype=np.int64)
    z = np.empty(n + 1)
    k = 0
    z[0] = -np.inf
    z[1] = np.inf
    for q in range(1, n):
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while s <= z[k]:
            k -= 1
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = np.inf
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        dx = q - v[k]
        d[q] = dx * dx + f[v[k]]
    return d


def distance_to_zero(zero_at):
    h, w = zero_at.shape
    INF = 1e15
    tmp = np.empty((h, w))
    for x in range(w):
        tmp[:, x] = edt1d(np.where(zero_at[:, x], 0.0, INF))
    out = np.empty((h, w))
    for y in range(h):
        out[y, :] = np.sqrt(np.maximum(0, edt1d(tmp[y, :])))
    return out


def hsv_to_rgb(h, s, v):
    i = int(np.floor(h * 6)) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i]


def is_accent(r, g, b):
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx == 0, 0, (mx - mn) / np.maximum(mx, 1))
    ok = (sat >= 0.32) & (mx >= 100)
    return ok & (r > 130) & (g > 95) & (b < 200) & ((r - g) < 48) & ((g - b) > 28)


def probe(name, hue=218, vis=46):
    im = np.asarray(Image.open(os.path.join(SRC, name)).convert("RGBA")).astype(np.float64)
    h, w, _ = im.shape
    alpha = im[:, :, 3].copy()
    blur = max(2, round(w * 0.012))
    alpha = box_blur(box_blur(alpha, blur), blur)
    on = alpha > 48
    inside = distance_to_zero(~on)      # distance from the (blurred) silhouette edge, inward
    r, g, b, a = im[:, :, 0], im[:, :, 1], im[:, :, 2], im[:, :, 3]
    acc = is_accent(r, g, b) & (a >= 24)

    css_px = 1.5 + (vis / 100) * 4.5
    rim = css_px * (w / 104)
    aa = max(1.15, rim * 0.18)
    band = (a >= 24) & (inside > 0) & (inside < rim + aa)
    enter = np.minimum(1, inside / aa)
    leave = np.minimum(1, (rim + aa - inside) / (aa * 2))
    cover = enter * leave
    band &= cover >= 0.04
    m = np.where(acc, np.maximum(cover, 0.85), cover * 0.55) * band
    lit = np.maximum(np.maximum(r, g), b) / 255
    tr, tg, tb = hsv_to_rgb(((hue % 360) + 360) % 360 / 360, 0.92, 1.0)
    val = np.minimum(1, 0.42 + 0.58 * lit)
    out = im.copy()
    out[:, :, 0] = r * (1 - m) + tr * 255 * val * m
    out[:, :, 1] = g * (1 - m) + tg * 255 * val * m
    out[:, :, 2] = b * (1 - m) + tb * 255 * val * m
    stem = os.path.splitext(name)[0]
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(
        os.path.join(OUT, f"{stem}-h{hue}-v{vis}.png"))

    # debug map: grey = icon, blue = recoloured band, gold = accent pixels left untouched
    dbg = np.zeros((h, w, 3), np.uint8)
    dbg[a >= 24] = (40, 40, 40)
    dbg[acc & ~band] = (230, 180, 60)
    dbg[band & ~acc] = (40, 90, 200)
    dbg[band & acc] = (90, 200, 255)
    Image.fromarray(dbg, "RGB").save(os.path.join(OUT, f"{stem}-map-v{vis}.png"))

    # which side of the icon gets a strong recolour (m >= 0.5) vs weak
    ys, xs = np.nonzero(a >= 24)
    cx = xs.mean()
    strong = m >= 0.5
    weak = (m > 0) & (m < 0.5)
    left = np.zeros_like(strong)
    left[:, : int(cx)] = True
    acc_edge_d = inside[acc]
    print(f"{name}: {w}px rim={rim:.1f}px(src) aa={aa:.1f} blur={blur} | "
          f"accent px={acc.sum()} accent-in-band={int((acc & band).sum())} "
          f"accent depth p10/p50/p90={np.percentile(acc_edge_d,10):.1f}/"
          f"{np.percentile(acc_edge_d,50):.1f}/{np.percentile(acc_edge_d,90):.1f} | "
          f"strong L/R={int((strong & left).sum())}/{int((strong & ~left).sum())} "
          f"weak L/R={int((weak & left).sum())}/{int((weak & ~left).sum())}")


if __name__ == "__main__":
    names = sys.argv[1:] or ["f-home.png"]
    vis_list = [46, 100]
    for n in names:
        for v in vis_list:
            probe(n, 218, v)

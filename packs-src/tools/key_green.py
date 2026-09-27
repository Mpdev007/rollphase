"""Key a chroma-green icon by flooding from the border. Interior color stays."""
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

def key(path, out):
    bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.int16)
    corners = np.concatenate([
        rgb[:12, :12].reshape(-1, 3),
        rgb[:12, -12:].reshape(-1, 3),
        rgb[-12:, :12].reshape(-1, 3),
        rgb[-12:, -12:].reshape(-1, 3),
    ])
    keyc = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - keyc, axis=2)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    shadow = (g > r + 22) & (g > b + 22) & (np.maximum(np.maximum(r, g), b) < 150)
    vivid = (g > r + 35) & (g > b + 35) & (g > 90)
    gone = (dist < 52) | shadow | vivid
    alpha = np.where(gone, 0, 255).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    # pull green spill on the fringe
    edge = alpha < 250
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    g2 = g.copy()
    g2[edge] = np.minimum(g[edge], np.maximum(r, b)[edge])
    rgba = np.dstack([r.astype(np.uint8), g2.astype(np.uint8), b.astype(np.uint8), alpha])
    ys, xs = np.where(alpha > 12)
    pad = 16
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad)
    crop = rgba[y0:y1, x0:x1]
    ch, cw = crop.shape[:2]
    side = max(ch, cw)
    sq = np.zeros((side, side, 4), np.uint8)
    sq[(side - ch) // 2:(side - ch) // 2 + ch, (side - cw) // 2:(side - cw) // 2 + cw] = crop
    im = Image.fromarray(sq, "RGBA")
    im.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
    canvas.save(out)
    arr = np.array(canvas)
    print(out.name, "opaque", int((arr[:, :, 3] > 16).mean() * 100))

if __name__ == "__main__":
    key(sys.argv[1], Path(sys.argv[2]))

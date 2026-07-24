#!/usr/bin/env python3
"""Offline software renderer for ABYSSAL creature meshes.

No WebGL available in this environment, so we rasterise the exported triangles
ourselves: orthographic projection, z-buffer, Lambert + ambient. Purpose is to
review SILHOUETTE, PROPORTION and COLOUR — not to reproduce in-game water
shading. Deliberately neutral lighting so proportion errors are obvious.
"""
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw

# key light roughly from above-front-left, matching the game's sun direction
LIGHT = np.array([-0.45, 0.80, 0.40]); LIGHT /= np.linalg.norm(LIGHT)
AMBIENT = 0.42
BG = (14, 26, 38)


def load(path):
    d = json.load(open(path))
    P = np.array(d["P"], dtype=np.float64).reshape(-1, 3, 3)
    C = np.array(d["C"], dtype=np.float64).reshape(-1, 3, 3)
    return d["id"], P, C


def project(P, view, W, H, pad=0.10, bounds=None):
    """view: 'side' (+X out of screen), 'top' (+Y out), 'front' (+Z out)."""
    if view == "side":      # look along -X : screen x = -Z (nose right), y = Y
        sx, sy, sz = -P[..., 2], P[..., 1], P[..., 0]
    elif view == "top":     # look down -Y : screen x = -Z, y = -X
        sx, sy, sz = -P[..., 2], -P[..., 0], P[..., 1]
    else:                   # front, look along -Z : screen x = X, y = Y
        sx, sy, sz = P[..., 0], P[..., 1], P[..., 2]

    if bounds is None:
        x0, x1 = sx.min(), sx.max()
        y0, y1 = sy.min(), sy.max()
    else:
        x0, x1, y0, y1 = bounds
    ex, ey = max(x1 - x0, 1e-6), max(y1 - y0, 1e-6)
    scale = min(W * (1 - 2 * pad) / ex, H * (1 - 2 * pad) / ey)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    px = (sx - cx) * scale + W / 2
    py = H / 2 - (sy - cy) * scale
    return np.stack([px, py, sz], axis=-1)


def raster(tris, cols, W, H):
    img = np.zeros((H, W, 3), dtype=np.float64)
    img[:] = np.array(BG) / 255.0
    zb = np.full((H, W), -1e18)

    # face normals in world space for lighting (before projection)
    for t in range(tris.shape[0]):
        p = tris[t]
        minx = max(int(math.floor(p[:, 0].min())), 0)
        maxx = min(int(math.ceil(p[:, 0].max())), W - 1)
        miny = max(int(math.floor(p[:, 1].min())), 0)
        maxy = min(int(math.ceil(p[:, 1].max())), H - 1)
        if minx > maxx or miny > maxy:
            continue
        x0, y0 = p[0, 0], p[0, 1]
        x1, y1 = p[1, 0], p[1, 1]
        x2, y2 = p[2, 0], p[2, 1]
        den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(den) < 1e-12:
            continue
        xs = np.arange(minx, maxx + 1)
        ys = np.arange(miny, maxy + 1)
        gx, gy = np.meshgrid(xs + 0.5, ys + 0.5)
        w0 = ((y1 - y2) * (gx - x2) + (x2 - x1) * (gy - y2)) / den
        w1 = ((y2 - y0) * (gx - x2) + (x0 - x2) * (gy - y2)) / den
        w2 = 1.0 - w0 - w1
        m = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not m.any():
            continue
        z = w0 * p[0, 2] + w1 * p[1, 2] + w2 * p[2, 2]
        sub = zb[miny:maxy + 1, minx:maxx + 1]
        upd = m & (z > sub)
        if not upd.any():
            continue
        sub[upd] = z[upd]
        c = (w0[..., None] * cols[t, 0] + w1[..., None] * cols[t, 1]
             + w2[..., None] * cols[t, 2])
        shade = cols[t, 3, 0]  # packed lambert term
        c = np.clip(c * shade, 0, 1)
        tgt = img[miny:maxy + 1, minx:maxx + 1]
        tgt[upd] = c[upd]
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)


def render(path, view, W=520, H=360, bounds=None):
    _id, P, C = load(path)
    # world-space face normal -> lambert, packed into a 4th colour row
    e1 = P[:, 1] - P[:, 0]
    e2 = P[:, 2] - P[:, 0]
    n = np.cross(e1, e2)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1
    n = n / ln
    lam = np.abs(n @ LIGHT)          # abs: single-sided authoring, keep it lit
    shade = AMBIENT + (1 - AMBIENT) * lam
    proj = project(P, view, W, H, bounds=bounds)
    C4 = np.concatenate([C, np.repeat(shade[:, None, None], 3, axis=2)], axis=1)
    return Image.fromarray(raster(proj, C4, W, H))


if __name__ == "__main__":
    files = sys.argv[1].split(",")
    view = sys.argv[2] if len(sys.argv) > 2 else "side"
    out = sys.argv[3] if len(sys.argv) > 3 else "/tmp/out.png"
    ims = [render(f, view) for f in files]
    w = sum(i.width for i in ims)
    h = max(i.height for i in ims)
    sheet = Image.new("RGB", (w, h), BG)
    x = 0
    for f, i in zip(files, ims):
        sheet.paste(i, (x, 0))
        d = ImageDraw.Draw(sheet)
        d.text((x + 10, 8), json.load(open(f))["id"], fill=(255, 235, 190))
        x += i.width
    sheet.save(out)
    print("wrote", out)

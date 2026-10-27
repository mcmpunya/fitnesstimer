#!/usr/bin/env python3
"""Generate PWA icons for FitTimer - stopwatch design."""
from PIL import Image, ImageDraw
import math
import os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

BG_DARK = (17, 24, 39, 255)        # #111827 dark slate
RING = (52, 211, 153, 255)         # emerald-400
RING_SOFT = (52, 211, 153, 90)
ACCENT = (251, 191, 36, 255)       # amber-400
HAND = (236, 253, 245, 255)        # near white mint


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Safe zone: for maskable keep content within central 80%
    pad = int(size * (0.16 if maskable else 0.07))

    # Background rounded square (full bleed for maskable)
    radius = int(size * (0.22 if not maskable else 0.0))
    if maskable:
        d.rectangle([0, 0, size, size], fill=BG_DARK)
    else:
        d.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG_DARK)

    cx, cy = size // 2, int(size * 0.56)

    # Stopwatch top button
    bw = int(size * 0.12)
    bh = int(size * 0.055)
    bx0, by0 = cx - bw // 2, pad + int(size * 0.01)
    d.rounded_rectangle([bx0, by0, bx0 + bw, by0 + bh], radius=bh // 3, fill=RING)
    # button stem
    sw = int(size * 0.05)
    d.rounded_rectangle([cx - sw // 2, by0 + bh, cx + sw // 2, by0 + bh + int(size * 0.035)], radius=sw // 4, fill=RING)

    # Outer watch ring
    r_outer = min((size - 2 * pad) // 2, (size - by0 - bh - int(size*0.035) - pad) // 2 + int(size * 0.03))
    ring_w = max(int(size * 0.055), 3)

    # progress arc: 270 degrees emerald + 90 soft
    bbox = [cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer]
    d.arc(bbox, start=-90, end=180, fill=RING, width=ring_w)
    d.arc(bbox, start=180, end=270, fill=RING_SOFT, width=ring_w)

    # tick marks inside ring
    tr = r_outer - ring_w - int(size * 0.02)
    for ang in (-90, 0, 90, 180):
        a = math.radians(ang)
        x1 = cx + (tr - int(size * 0.035)) * math.cos(a)
        y1 = cy + (tr - int(size * 0.035)) * math.sin(a)
        x2 = cx + tr * math.cos(a)
        y2 = cy + tr * math.sin(a)
        d.line([x1, y1, x2, y2], fill=RING, width=max(int(size * 0.012), 1))

    # Hand pointing to ~1-2 o'clock
    hand_ang = math.radians(-35)
    hl = r_outer - ring_w - int(size * 0.015)
    hx = cx + hl * math.cos(hand_ang)
    hy = cy + hl * math.sin(hand_ang)
    d.line([cx, cy, hx, hy], fill=HAND, width=max(int(size * 0.035), 2))

    # Center dot amber
    cd = int(size * 0.055)
    d.ellipse([cx - cd // 2, cy - cd // 2, cx + cd // 2, cy + cd // 2], fill=ACCENT)

    return img


for name, size, maskable in [
    ("icon-64.png", 64, False),
    ("icon-128.png", 128, False),
    ("icon-192.png", 192, False),
    ("icon-256.png", 256, False),
    ("icon-384.png", 384, False),
    ("icon-512.png", 512, False),
    ("maskable-192.png", 192, True),
    ("maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, True),
]:
    img = draw_icon(size, maskable)
    if name == "apple-touch-icon.png":
        flat = Image.new("RGB", img.size, BG_DARK[:3])
        flat.paste(img, (0, 0), img)
        img = flat
    img.save(os.path.join(OUT, name))
    print("saved", name)

print("done")

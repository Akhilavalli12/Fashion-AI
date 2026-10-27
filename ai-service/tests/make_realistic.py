"""Harder synthetic cases: gradient + noisy background, soft shadow, fabric texture, JPEG compression."""
import numpy as np, os
from PIL import Image, ImageDraw, ImageFilter
OUT = os.path.join(os.path.dirname(__file__), "samples_hard"); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1)
SHIRT = [(95,40),(130,28),(150,48),(170,28),(205,40),(275,120),(245,150),(215,120),(215,320),(85,320),(85,120),(55,150),(25,120)]
JEANS = [(80,30),(220,30),(232,340),(158,340),(150,130),(142,340),(68,340)]
def bg(w=300,h=360, base=(205,200,192)):
    y = np.linspace(0.85, 1.1, h)[:, None, None]; x = np.linspace(0.95, 1.05, w)[None, :, None]
    a = np.array(base)[None, None, :] * y * x + rng.normal(0, 5, (h, w, 3)); return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))
def garment(pts, color, name, pattern=None, size=(300,360)):
    im = bg(*size); m = Image.new("L", im.size, 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    sh = m.filter(ImageFilter.GaussianBlur(10)).point(lambda v: v * 0.35); im.paste(Image.new("RGB", im.size, (60, 55, 50)), (8, 12), sh)
    tex = np.clip(np.array(color)[None, None, :] + rng.normal(0, 7, (size[1], size[0], 3)), 0, 255)
    xs = np.arange(size[0])[None, :, None]; fold = 1 + 0.08 * np.sin(xs / 9.0); tex = np.clip(tex * fold, 0, 255).astype("uint8")
    g = Image.fromarray(tex)
    if pattern == "stripes":
        d = ImageDraw.Draw(g)
        for x in range(0, size[0], 18): d.rectangle([x, 0, x + 7, size[1]], fill=(240, 240, 240))
    im.paste(g, (0, 0), m); im.save(os.path.join(OUT, name), quality=70)
garment(SHIRT, (245, 245, 245), "white_shirt.jpg")
garment(SHIRT, (30, 120, 70), "green_shirt.jpg")
garment(SHIRT, (30, 50, 120), "navy_stripe.jpg", pattern="stripes")
garment(JEANS, (60, 95, 150), "jeans.jpg")
garment(JEANS, (30, 30, 30), "black_pants.jpg")
garment(JEANS, (200, 170, 130), "khaki_pants.jpg")

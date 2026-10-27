"""Generates synthetic garment photos (white/grey background) for testing the CV pipeline."""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), "samples")
os.makedirs(OUT, exist_ok=True)

def canvas(): return Image.new("RGB", (300, 360), (236, 236, 232))
def save(im, n): im.save(os.path.join(OUT, n))

def shirt(color, name, stripes=None):
    im = canvas(); d = ImageDraw.Draw(im)
    pts = [(95, 40), (130, 28), (150, 48), (170, 28), (205, 40), (275, 120), (245, 150), (215, 120), (215, 320), (85, 320), (85, 120), (55, 150), (25, 120)]
    d.polygon(pts, fill=color)
    if stripes:
        m = Image.new("L", im.size, 0); ImageDraw.Draw(m).polygon(pts, fill=255)
        s = Image.new("RGB", im.size, color); ds = ImageDraw.Draw(s)
        for x in range(0, 300, 16): ds.rectangle([x, 0, x + 6, 360], fill=stripes)
        im.paste(s, (0, 0), m)
    save(im, name)

def jeans(color, name):
    im = canvas(); d = ImageDraw.Draw(im)
    d.polygon([(80, 30), (220, 30), (232, 340), (158, 340), (150, 130), (142, 340), (68, 340)], fill=color); save(im, name)

def sneaker(color, name):
    im = Image.new("RGB", (360, 260), (236, 236, 232)); d = ImageDraw.Draw(im)
    d.polygon([(30, 150), (50, 100), (130, 100), (190, 140), (310, 150), (335, 190), (335, 215), (30, 215)], fill=color); save(im, name)

shirt((250, 250, 250), "white_shirt.png")
shirt((200, 40, 45), "red_tshirt.png")
shirt((40, 70, 160), "navy_striped.png", stripes=(235, 235, 235))
jeans((52, 92, 160), "blue_jeans.png")
jeans((25, 25, 28), "black_trousers.png")
sneaker((245, 245, 245), "white_sneakers.png")
print("samples written to", OUT)

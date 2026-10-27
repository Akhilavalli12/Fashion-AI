"""Clothing analysis pipeline.

Image -> Pillow preprocessing -> foreground segmentation -> k-means color extraction (real pixels)
      -> pattern analysis -> category (CLIP zero-shot if enabled, else shape heuristics) -> fashion metadata.

Confidences are heuristic/calibrated-by-design: they are deliberately modest and labelled
detected / likely / uncertain. Nothing is random.

UPGRADE PATH: set USE_CLIP=1 (pip install torch transformers) to use CLIP zero-shot classification
for category/subcategory. Any other model can be plugged in by implementing `classify_*` below.
"""
import io
import os
import colorsys
import numpy as np
from PIL import Image, ImageOps, ImageFilter

PALETTE = {
    "White": "#F4F4F2", "Cream": "#F3EBD3", "Beige": "#D8C3A5", "Tan": "#B08968", "Brown": "#6B4A2F",
    "Grey": "#8E9196", "Charcoal": "#3D4046", "Black": "#1B1B1D", "Navy": "#1F2A4A", "Blue": "#2F6DB5",
    "Light Blue": "#9DC4E8", "Teal": "#1F8A8A", "Green": "#2E8B57", "Olive": "#6B7035", "Mint": "#B7E4C7",
    "Yellow": "#F2D024", "Mustard": "#C9962B", "Orange": "#EE7A1F", "Red": "#D62828", "Burgundy": "#722F37",
    "Pink": "#E75A97", "Blush": "#F2C4CE", "Purple": "#7B3FA0", "Lavender": "#C9B6E4", "Gold": "#C9A227",
}
NEUTRAL = {"White", "Cream", "Beige", "Tan", "Brown", "Grey", "Charcoal", "Black", "Navy"}


# ----------------------------------------------------------------------------- colors
def name_color(rgb):
    r, g, b = [x / 255.0 for x in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    h *= 360
    if v < 0.16:
        return "Black"
    if s < 0.12:
        return "White" if v > 0.86 else "Charcoal" if v < 0.42 else "Grey"
    if 28 <= h < 62 and s < 0.3 and v > 0.7:
        return "Cream" if v > 0.9 else "Beige"
    if h >= 345 or h < 15:
        if v < 0.48: return "Burgundy"
        return "Blush" if s < 0.4 else "Red"
    if h < 40:
        if v < 0.55: return "Brown"
        if s < 0.5: return "Tan" if v < 0.8 else "Beige"
        return "Orange"
    if h < 65:
        if v < 0.62: return "Mustard" if s > 0.55 else "Olive"
        return "Yellow" if s > 0.55 else "Cream"
    if h < 160:
        if s < 0.4 and v > 0.78: return "Mint"
        return "Olive" if (v < 0.55 and h < 100) else "Green"
    if h < 195:
        return "Teal" if v < 0.7 else "Mint"
    if h < 258:
        if v < 0.38: return "Navy"
        if v > 0.74 and s < 0.5: return "Light Blue"
        return "Blue"
    if h < 292:
        return "Lavender" if s < 0.38 else "Purple"
    return "Blush" if s < 0.4 else "Pink"


def kmeans(px, k=3, iters=12):
    rng = np.random.default_rng(0)
    if len(px) < k:
        return px.mean(0, keepdims=True), np.array([1.0])
    centers = px[rng.choice(len(px), 1)]
    for _ in range(k - 1):  # kmeans++ init
        d = np.min(((px[:, None, :] - centers[None]) ** 2).sum(-1), axis=1)
        centers = np.vstack([centers, px[rng.choice(len(px), p=d / d.sum())] if d.sum() > 0 else px[0]])
    for _ in range(iters):
        lab = ((px[:, None, :] - centers[None]) ** 2).sum(-1).argmin(1)
        for j in range(len(centers)):
            if (lab == j).any():
                centers[j] = px[lab == j].mean(0)
    lab = ((px[:, None, :] - centers[None]) ** 2).sum(-1).argmin(1)
    frac = np.bincount(lab, minlength=len(centers)) / len(lab)
    return centers, frac


# ----------------------------------------------------------------------------- segmentation
def load(data):
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    img.thumbnail((320, 320))
    alpha = None
    if img.mode in ("RGBA", "LA") or "transparency" in img.info:
        rgba = img.convert("RGBA")
        a = np.array(rgba)[:, :, 3]
        if (a < 250).mean() > 0.05:
            alpha = a > 128
    return img.convert("RGB"), alpha


try:  # OpenCV is optional: used for GrabCut refinement (removes shadows / soft backgrounds)
    import cv2
except Exception:  # pragma: no cover
    cv2 = None


def _refine_grabcut(arr, dist, thr, edge, mask):
    if cv2 is None or mask.sum() < 50:
        return mask
    try:
        gm = np.full(mask.shape, cv2.GC_PR_BGD, np.uint8)
        gm[dist > thr] = cv2.GC_PR_FGD
        sure = np.array(Image.fromarray(((dist > 2.5 * thr) * 255).astype("uint8")).filter(ImageFilter.MinFilter(5))) > 127
        gm[sure] = cv2.GC_FGD
        gm[dist < 0.5 * thr] = cv2.GC_BGD
        gm[edge] = cv2.GC_BGD
        if not (gm == cv2.GC_FGD).any():
            return mask
        cv2.grabCut(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR), gm, None, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_MASK)
        out = (gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD)
        return out if out.sum() > 50 else mask
    except Exception:
        return mask


def segment(arr, alpha):
    """Returns (mask, used_fallback). Uses alpha if present, else border-color background removal."""
    H, W, _ = arr.shape
    if alpha is not None:
        return alpha, False
    b = 4
    yy, xx = np.mgrid[0:H, 0:W]
    edge = np.zeros((H, W), bool); edge[:b] = edge[-b:] = True; edge[:, :b] = edge[:, -b:] = True
    A = np.stack([xx / W, yy / H, np.ones_like(xx, float)], -1)
    # background = plane fitted to the border pixels (handles lighting gradients), robustly refit once
    coef = np.linalg.lstsq(A[edge], arr[edge].astype(float), rcond=None)[0]
    res = np.linalg.norm(A[edge] @ coef - arr[edge], axis=1)
    keep = res < res.mean() + 2 * res.std()
    coef = np.linalg.lstsq(A[edge][keep], arr[edge][keep].astype(float), rcond=None)[0]
    res = np.linalg.norm(A[edge] @ coef - arr[edge], axis=1)
    thr = max(16.0, 4.0 * res.std() + res.mean())
    dist = np.linalg.norm(A @ coef - arr.astype(float), axis=2)
    mask = dist > thr
    mask = _refine_grabcut(arr, dist, thr, edge, mask)
    # morphological closing/opening via PIL filters
    m = Image.fromarray((mask * 255).astype("uint8"))
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    mask = np.array(m) > 127
    frac = mask.mean()
    if frac > 0.93 or frac < 0.03:  # busy/unknown background -> centre prior
        yy, xx = np.mgrid[0:H, 0:W]
        ell = ((yy - H / 2) / (H * 0.42)) ** 2 + ((xx - W / 2) / (W * 0.38)) ** 2 < 1
        return ell, True
    return mask, False


# ----------------------------------------------------------------------------- shape + pattern
def shape_features(mask):
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    m = mask[y0:y1 + 1, x0:x1 + 1]
    h, w = m.shape

    def row_info(frac):
        row = m[min(h - 1, int(h * frac))]
        runs, cur = [], 0
        for v in row:
            if v: cur += 1
            elif cur: runs.append(cur); cur = 0
        if cur: runs.append(cur)
        runs = [r for r in runs if r > 0.06 * w]
        return row.sum() / w, len(runs)

    f = {"aspect": h / w, "fill": m.mean()}
    for p in (0.15, 0.3, 0.5, 0.7, 0.85, 0.95):
        f[f"w{p}"], f[f"runs{p}"] = row_info(p)
    return f, (y0, y1, x0, x1)


def detect_pattern(arr, mask, k_fracs):
    gray = np.array(Image.fromarray(arr).convert("L")).astype(float)
    ys, xs = np.where(mask)
    sub = gray[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    def periodic(axis):
        vals = np.where(m, sub, np.nan)
        with np.errstate(all='ignore'):
            import warnings; warnings.simplefilter('ignore')
            prof = np.nanmean(vals, axis=axis)
        prof = prof[~np.isnan(prof)]
        if len(prof) < 24:
            return 0.0
        k = 7
        prof = prof - np.convolve(prof, np.ones(k) / k, mode="same")
        prof = prof[k:-k]
        if len(prof) < 16 or prof.std() < 4:
            return 0.0
        prof = (prof - prof.mean()) / (prof.std() + 1e-6)
        ac = np.correlate(prof, prof, "full")[len(prof) - 1:] / len(prof)
        lo, hi = 3, max(4, len(prof) // 3)
        return float(ac[lo:hi].max()) if hi > lo else 0.0

    pv, ph = periodic(0), periodic(1)
    gy, gx = np.gradient(gray)
    grad = np.hypot(gx, gy)
    inner = np.array(Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.MinFilter(9))) > 127
    texture = float(grad[ys.min():ys.max() + 1, xs.min():xs.max() + 1][inner].mean()) if inner.any() else 0.0
    sig = sorted(k_fracs, reverse=True)
    if pv > 0.55 and ph > 0.55:
        return "Checked", 0.6
    if max(pv, ph) > 0.6:
        return "Striped", 0.6
    if len(sig) > 1 and sig[0] < 0.75 and sig[1] > 0.2 and texture > 9:
        return "Printed", 0.5
    if sig[0] < 0.6 and texture <= 9:
        return "Colorblock", 0.5
    return "Solid", 0.8 if sig[0] > 0.85 else 0.65


# ----------------------------------------------------------------------------- category
def classify_shape(f, color):
    """Heuristic silhouette classifier. Returns (category, subcategory, confidence)."""
    a = f["aspect"]
    legs85, legs70 = f["runs0.85"] >= 2, f["runs0.7"] >= 2
    scores = {}
    scores["Footwear"] = 1.0 if a < 0.7 else 0.25 if a < 0.9 else 0.0
    two_legs = (legs85 or f["runs0.95"] >= 2) and f["aspect"] > 0.9
    scores["Pants"] = (0.9 if a > 1.15 else 0.45) if two_legs and f["w0.15"] > 0.7 else 0.0
    scores["Shorts"] = 0.0
    if two_legs and f["w0.15"] > 0.7 and a <= 1.15: scores["Pants"] = 0.0; scores["Shorts"] = 0.75
    flare = f["w0.95"] > 1.25 * max(0.1, f["w0.15"])
    scores["Skirt"] = 0.75 if (not two_legs and flare and a < 1.35) else 0.0
    scores["Dress"] = 0.8 if (not two_legs and a >= 1.35 and f["w0.3"] < 0.75 * f["w0.95"]) else 0.0
    sleeves = f["w0.3"] > 0.95 * f["w0.7"] and f["w0.15"] > 0.55
    scores["Top"] = (0.75 if sleeves else 0.4) if (0.6 <= a <= 1.5 and not two_legs and not flare) else 0.0
    if max(scores.values()) == 0:
        return None
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    top, second = ranked[0], ranked[1]
    conf = float(np.clip(0.3 + 0.5 * (top[1] - second[1]) + 0.2 * top[1], 0.25, 0.8))
    label = top[0]
    h, s, v = colorsys.rgb_to_hsv(*[x / 255 for x in color])
    if label == "Footwear": return "Footwear", "Sneakers", conf
    if label == "Pants":
        denim = 0.52 <= h <= 0.7 and s > 0.25 and v < 0.78
        return "Bottom", "Jeans" if denim else "Trousers", conf
    if label == "Shorts": return "Bottom", "Shorts", conf
    if label == "Skirt": return "Bottom", "Skirt", conf
    if label == "Dress": return "Dress", "Dress", conf
    long_sleeve = f["w0.5"] > f["w0.7"] * 1.25
    return "Top", ("Sweater" if long_sleeve and a > 1.1 else "T-Shirt" if a < 1.1 else "Shirt"), conf


_clip = None
CLIP_LABELS = [
    ("Top", "T-Shirt", "a t-shirt"), ("Top", "Shirt", "a button-up shirt"), ("Top", "Sweater", "a sweater"),
    ("Top", "Hoodie", "a hoodie"), ("Top", "Kurta", "a kurta"), ("Top", "Blouse", "a blouse"),
    ("Bottom", "Jeans", "a pair of blue jeans"), ("Bottom", "Trousers", "a pair of trousers"), ("Bottom", "Shorts", "shorts"),
    ("Bottom", "Skirt", "a skirt"), ("Bottom", "Cargo Pants", "cargo pants"), ("Dress", "Dress", "a dress"), ("Dress", "Saree", "a saree"),
    ("Outerwear", "Jacket", "a jacket"), ("Outerwear", "Blazer", "a blazer"), ("Outerwear", "Coat", "a long coat"),
    ("Footwear", "Sneakers", "sneakers"), ("Footwear", "Boots", "boots"), ("Footwear", "Heels", "high heels"),
    ("Accessory", "Bag", "a handbag"), ("Accessory", "Watch", "a wrist watch"), ("Accessory", "Hat", "a hat"),
]


def classify_clip(img):
    """Optional stronger model. Returns (category, subcategory, prob) or None if unavailable."""
    global _clip
    if os.environ.get("USE_CLIP") != "1":
        return None
    try:
        import torch
        from transformers import CLIPModel, CLIPProcessor
        if _clip is None:
            name = os.environ.get("CLIP_MODEL", "openai/clip-vit-base-patch32")
            _clip = (CLIPModel.from_pretrained(name).eval(), CLIPProcessor.from_pretrained(name))
        model, proc = _clip
        inputs = proc(text=[f"a photo of {t} clothing item" if c != "Accessory" else f"a photo of {t}" for _, _, t in CLIP_LABELS], images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            probs = model(**inputs).logits_per_image.softmax(-1)[0]
        i = int(probs.argmax())
        return CLIP_LABELS[i][0], CLIP_LABELS[i][1], float(probs[i])
    except Exception:
        return None


# ----------------------------------------------------------------------------- metadata
SEASON = {
    "T-Shirt": ["Spring", "Summer"], "Shirt": ["Spring", "Summer", "Autumn"], "Sweater": ["Autumn", "Winter"], "Hoodie": ["Autumn", "Winter"],
    "Jeans": ["Spring", "Summer", "Autumn", "Winter"], "Trousers": ["Spring", "Summer", "Autumn", "Winter"], "Shorts": ["Summer"],
    "Skirt": ["Spring", "Summer"], "Dress": ["Spring", "Summer"], "Jacket": ["Autumn", "Winter"], "Coat": ["Winter"], "Blazer": ["Spring", "Autumn", "Winter"],
}


def metadata(category, sub, color, pattern):
    formal = {"Blazer": "Semi-Formal", "Shirt": "Semi-Formal", "Trousers": "Semi-Formal", "Blouse": "Semi-Formal", "Kurta": "Semi-Formal",
              "Saree": "Formal", "Heels": "Formal", "Dress": "Semi-Formal", "Jeans": "Casual", "T-Shirt": "Casual", "Hoodie": "Casual",
              "Shorts": "Casual", "Sneakers": "Casual", "Cargo Pants": "Casual"}.get(sub, "Smart Casual")
    if sub in ("Hoodie", "Cargo Pants"): style = "Streetwear"
    elif sub in ("Kurta", "Kurti", "Saree"): style = "Traditional"
    elif pattern in ("Printed", "Floral") or color in ("Red", "Orange", "Yellow", "Pink", "Purple", "Teal"): style = "Trendy"
    elif color in NEUTRAL and pattern == "Solid": style = "Minimal"
    else: style = "Casual"
    return style, formal, SEASON.get(sub, ["Spring", "Summer", "Autumn", "Winter"])


def label(c):
    return "detected" if c >= 0.75 else "likely" if c >= 0.5 else "uncertain"


def analyze(data: bytes):
    try:
        img, alpha = load(data)
    except Exception as e:  # not an image / corrupt
        return {"ok": False, "reason": "unreadable_image", "detail": str(e)}
    arr = np.array(img)
    mask, fallback = segment(arr, alpha)
    if mask.sum() < 0.03 * mask.size:
        return {"ok": False, "reason": "no_garment_found"}

    # --- color from real pixels (eroded mask avoids edge blending)
    inner = np.array(Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MinFilter(7))) > 127
    px_all = arr[inner if inner.sum() > 200 else mask].astype(float)
    if len(px_all) > 5000:
        px_all = px_all[np.random.default_rng(0).choice(len(px_all), 5000, replace=False)]
    centers, fracs = kmeans(px_all, 3)
    by_name = {}
    for c, fr in zip(centers, fracs):
        n = name_color(c)
        by_name.setdefault(n, [0.0, c]);
        by_name[n][0] += fr
    ranked = sorted(by_name.items(), key=lambda kv: -kv[1][0])
    dominant, (dfrac, drgb) = ranked[0]
    secondary = [n for n, (f_, _) in ranked[1:] if f_ >= 0.15]
    color_conf = float(np.clip(0.5 + 0.45 * dfrac - (0.12 if fallback else 0), 0.3, 0.95))

    pattern, pattern_conf = detect_pattern(arr, mask, [f_ for _, (f_, _) in ranked])
    feats, _ = shape_features(mask)

    cat = sub = None
    method = "pixels+shape-heuristic"
    clip = classify_clip(img)
    if clip:
        cat, sub, cat_conf = clip
        method = "clip+pixels"
    else:
        r = classify_shape(feats, drgb)
        if r:
            cat, sub, cat_conf = r
            if fallback: cat_conf *= 0.8
            cat_conf = min(cat_conf, 0.7)  # shape heuristics never claim 'detected' level certainty
    if not cat:
        return {"ok": False, "reason": "category_uncertain", "dominantColor": dominant, "colorHex": PALETTE[dominant], "method": method}
    style, formality, season = metadata(cat, sub, dominant, pattern)
    conf = {"category": round(cat_conf, 2), "color": round(color_conf, 2), "pattern": round(pattern_conf, 2)}
    return {
        "ok": True, "category": cat, "subcategory": sub, "dominantColor": dominant, "colorHex": PALETTE[dominant],
        "secondaryColors": secondary, "pattern": pattern, "style": style, "formality": formality, "season": season,
        "confidence": conf, "confidenceLabel": {k: label(v) for k, v in conf.items()},
        "method": method,
        "notes": ["Background could not be isolated cleanly; used a centre-weighted region."] if fallback else [],
    }

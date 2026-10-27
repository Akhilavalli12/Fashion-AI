import os, glob, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import analyzer
EXPECT = {"white_shirt": ("Top", "White"), "green_shirt": ("Top", "Green"), "navy_stripe": ("Top", None), "jeans": ("Bottom", "Blue"), "black_pants": ("Bottom", "Black"), "khaki_pants": ("Bottom", None)}
bad = 0
for p in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "samples_hard", "*.jpg"))):
    n = os.path.basename(p)[:-4]; r = analyzer.analyze(open(p, "rb").read())
    cat, col = EXPECT[n]; ok = r.get("ok") and r["category"] == cat and (col is None or r["dominantColor"] == col)
    bad += not ok
    print("OK " if ok else "BAD", n.ljust(12), {k: r.get(k) for k in ("category", "subcategory", "dominantColor", "pattern", "secondaryColors")}, r.get("confidence"), r.get("notes"))
sys.exit(1 if bad else 0)

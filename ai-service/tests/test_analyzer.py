import os, sys, glob
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import analyzer

for p in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "samples", "*.png"))):
    r = analyzer.analyze(open(p, "rb").read())
    print(os.path.basename(p).ljust(20), {k: r.get(k) for k in ("ok", "category", "subcategory", "dominantColor", "pattern", "confidence")})
bad = analyzer.analyze(b"not an image")
assert bad["ok"] is False
print("garbage input handled:", bad["reason"])

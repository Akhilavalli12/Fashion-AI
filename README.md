# StyleSense – AI Wardrobe & Outfit Recommender (v03)

Three services: **React frontend** (5173) → **Node/Express API + MongoDB** (5000) → **Python CV service** (8001).

## Run it
```bash
# 1. MongoDB
docker compose up -d                    # or use a local mongod / Atlas URI in backend/.env

# 2. Computer-vision service
cd ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001

# 3. Backend (auto-seeds the 3 demo accounts on first start)
cd backend && cp .env.example .env && npm install && npm run dev
#   npm run seed:reset   -> wipe & re-create demo accounts

# 4. Frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```

## Demo accounts (password for all: `Demo123!`)
| Account | Email | Profile |
|---|---|---|
| Minimalist | minimalist@demo.com | Minimal/Classic, neutrals, low pattern tolerance, 19 items |
| Trend Explorer | trendsetter@demo.com | Streetwear/Trendy, bold colors, high pattern tolerance, 19 items |
| Elegant / Traditional | elegant@demo.com | Elegant/Traditional, pastels, semi-formal, 19 items |

The login page has "Try …" buttons that authenticate against the backend. Each account is real MongoDB data:
items, outfit history, saved/liked/disliked outfits, learned preference weights, and engine-generated recommendations.

## How the pieces work
- **Image analysis** (`ai-service/analyzer.py`): Pillow preprocessing → background removal → k-means on real garment pixels
  (color) → stripe/check/texture analysis (pattern) → silhouette heuristics (category). Confidences are modest and labelled
  *detected / likely / uncertain*. **Upgrade path:** `pip install torch transformers` and run with `USE_CLIP=1` for CLIP
  zero-shot category/subcategory; any model can replace `classify_*`.
- **Upload flow**: upload → analyze → review/edit (AI vs. user-edited fields are badged) → save. If AI fails the UI says
  "AI analysis couldn't confidently identify this item." and lets you fill it in manually.
- **Storage** (`backend/src/services/storage.js`): local `uploads/`; MongoDB stores only URL/key + metadata. Swap the class for S3/Cloudinary.
- **Engine** (`services/engine.js`): candidate outfits from your real items, scored on color harmony, occasion/formality,
  weather (Open-Meteo, fallback mock), your stored+learned preferences, and freshness/repetition; every outfit has reasons.
- **Feedback loop** (`services/preferences.js`): like/dislike/save/worn update per-color/style/pattern weights stored on the user in MongoDB.
- **AI stylist** (`services/stylist.js`): parses your message against your wardrobe (items, "don't use black", occasion, weather words),
  then calls the engine. Optional `ANTHROPIC_API_KEY` adds LLM understanding; the local parser is the fallback.
- **Analytics**: category/color/style mix, wear stats, utilization, never-worn items, rough footprint-per-wear (estimates).

## Tests
```bash
# with Mongo + backend + ai-service running:
cd backend && node tests/e2e.mjs                          # full end-to-end API test
cd backend && npm test                                  # engine/personalisation/stylist (no DB needed)
cd ai-service && python tests/make_samples.py && python tests/test_analyzer.py && python tests/make_realistic.py && python tests/test_hard.py
```

## Photo tips
Best results: one garment, laid flat or on a hanger, plain background, good light. Photos of people wearing outfits aren't segmented yet — use CLIP (`USE_CLIP=1`) or crop to the garment.

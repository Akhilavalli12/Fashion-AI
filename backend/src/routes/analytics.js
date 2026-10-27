import { Router } from 'express';
import Item from '../models/Item.js';
import Outfit from '../models/Outfit.js';
import { auth, wrap } from '../middleware/auth.js';
import { topPrefs } from '../services/preferences.js';
import { getWeather } from '../services/weather.js';
import { PALETTE } from '../services/colors.js';
const r = Router();
// Rough, commonly cited cradle-to-gate footprints (kg CO2e per garment). Estimates only.
const FOOTPRINT = { 'T-Shirt': 7, Shirt: 10, Jeans: 33, Trousers: 20, Hoodie: 25, Sweater: 20, Jacket: 30, Coat: 40, Dress: 20, Sneakers: 14, Shorts: 12 };
const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});

r.get('/dashboard', auth, wrap(async (req, res) => {
  const u = req.user;
  const [items, outfits, weather] = await Promise.all([
    Item.find({ user: u._id, archived: false }).lean(),
    Outfit.find({ user: u._id }).sort({ updatedAt: -1 }).limit(100).populate('items').lean(),
    getWeather(u.profile.city),
  ]);
  res.json({
    user: { name: u.name, profile: u.profile, isDemo: u.isDemo, demoLabel: u.demoLabel },
    weather,
    counts: { items: items.length, outfits: outfits.length, saved: outfits.filter((o) => o.status.saved).length, worn: outfits.filter((o) => o.wornDates?.length).length, ...u.prefs?.counts },
    saved: outfits.filter((o) => o.status.saved).slice(0, 3),
    recentWorn: outfits.filter((o) => o.wornDates?.length).sort((a, b) => new Date(b.wornDates.at(-1)) - new Date(a.wornDates.at(-1))).slice(0, 3),
    recommended: outfits.filter((o) => o.source !== 'seed' || (!o.status.liked && !o.status.disliked && !o.wornDates?.length)).filter((o) => !o.status.disliked && !o.wornDates?.length).slice(0, 3),
    learned: { colors: topPrefs(u.prefs, 'colors'), styles: topPrefs(u.prefs, 'styles'), patterns: topPrefs(u.prefs, 'patterns'), groups: topPrefs(u.prefs, 'groups') },
  });
}));

r.get('/analytics', auth, wrap(async (req, res) => {
  const items = await Item.find({ user: req.user._id, archived: false }).lean();
  const outfits = await Outfit.find({ user: req.user._id }).lean();
  const now = Date.now();
  const worn30 = items.filter((i) => i.lastWorn && now - new Date(i.lastWorn) < 30 * 864e5).length;
  const worn90 = items.filter((i) => i.lastWorn && now - new Date(i.lastWorn) < 90 * 864e5).length;
  const sorted = [...items].sort((a, b) => b.timesWorn - a.timesWorn);
  const totalWears = items.reduce((s, i) => s + i.timesWorn, 0);
  const withFp = items.map((i) => {
    const fp = FOOTPRINT[i.subcategory] ?? 10;
    return { _id: i._id, name: i.name, imageUrl: i.imageUrl, timesWorn: i.timesWorn, footprintPerWear: i.timesWorn ? +(fp / i.timesWorn).toFixed(2) : null, costPerWear: i.price && i.timesWorn ? +(i.price / i.timesWorn).toFixed(0) : null };
  });
  res.json({
    totals: { items: items.length, totalWears, avgWears: items.length ? +(totalWears / items.length).toFixed(1) : 0 },
    byCategory: count(items, (i) => i.category),
    byColor: Object.entries(count(items, (i) => i.dominantColor)).map(([name, n]) => ({ name, n, hex: PALETTE[name] })).sort((a, b) => b.n - a.n),
    byStyle: count(items, (i) => i.style),
    byFormality: count(items, (i) => i.formality),
    mostWorn: sorted.filter((i) => i.timesWorn).slice(0, 5),
    neverWorn: items.filter((i) => !i.timesWorn),
    outfitStats: { generated: outfits.length, liked: outfits.filter((o) => o.status.liked).length, disliked: outfits.filter((o) => o.status.disliked).length, saved: outfits.filter((o) => o.status.saved).length, worn: outfits.filter((o) => o.wornDates?.length).length },
    sustainability: {
      utilization30: items.length ? Math.round((100 * worn30) / items.length) : 0,
      utilization90: items.length ? Math.round((100 * worn90) / items.length) : 0,
      neverWornCount: items.filter((i) => !i.timesWorn).length,
      rewears: items.reduce((s, i) => s + Math.max(0, i.timesWorn - 1), 0),
      perItem: withFp.filter((x) => x.footprintPerWear !== null).sort((a, b) => a.footprintPerWear - b.footprintPerWear).slice(0, 6),
      note: 'Footprint-per-wear uses rough per-garment CO₂e estimates; treat as directional, not exact.',
    },
    learned: { colors: topPrefs(req.user.prefs, 'colors', 6), styles: topPrefs(req.user.prefs, 'styles', 6) },
  });
}));
export default r;

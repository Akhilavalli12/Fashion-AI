import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Outfit from '../models/Outfit.js';
import Message from '../models/Message.js';
import { config } from '../config.js';
import { PALETTE } from '../services/colors.js';
import { applyFeedback, emptyPrefs } from '../services/preferences.js';
import { signatureOf } from '../services/engine.js';
import { fallbackWeather } from '../services/weather.js';
import { generateAndStore } from '../routes/outfits.js';
import { garmentSvg } from './svg.js';
import { DEMO_USERS } from './demoData.js';

export async function seedDemo({ reset = false } = {}) {
  const dir = path.join(config.uploadDir, 'seed');
  await fs.mkdir(dir, { recursive: true });
  for (const d of DEMO_USERS) {
    const existing = await User.findOne({ email: d.email });
    if (existing && !reset) { console.log(`demo ${d.email} exists`); continue; }
    if (existing) { await Promise.all([Item.deleteMany({ user: existing._id }), Outfit.deleteMany({ user: existing._id }), Message.deleteMany({ user: existing._id }), existing.deleteOne()]); }
    const user = await User.create({ name: d.name, email: d.email, passwordHash: await bcrypt.hash('Demo123!', 10), isDemo: true, demoLabel: d.demoLabel, profile: d.profile, prefs: emptyPrefs() });
    const byName = {};
    let n = 0;
    for (const [name, category, subcategory, color, pattern, style, formality, season, secondary] of d.items) {
      const file = `${d.key}-${n++}.svg`;
      await fs.writeFile(path.join(dir, file), garmentSvg({ subcategory, category, color, pattern, secondary }, n));
      byName[name] = await Item.create({
        user: user._id, name, category, subcategory, dominantColor: color, colorHex: PALETTE[color], secondaryColors: secondary ? [secondary] : [],
        pattern, style, formality, season, imageUrl: `/uploads/seed/${file}`,
        fieldSources: Object.fromEntries(['category', 'subcategory', 'dominantColor', 'pattern', 'style', 'formality'].map((k) => [k, 'seed'])),
        analysis: { source: 'seed' },
      });
    }
    const prefs = emptyPrefs();
    const weather = { ...fallbackWeather(d.profile.city), source: 'seed' };
    for (const h of d.history) {
      const items = h.names.map((nm) => byName[nm]);
      const wornDates = h.wornDaysAgo.map((a) => new Date(Date.now() - a * 864e5));
      const status = { liked: h.actions.includes('like'), disliked: h.actions.includes('dislike'), saved: h.actions.includes('save') };
      await Outfit.create({ user: user._id, items: items.map((i) => i._id), occasion: h.occasion, weather, score: 70 + Math.round(Math.random() * 20), reasons: ['Seeded history entry.'], signature: signatureOf(items), source: 'seed', status, wornDates, createdAt: wornDates[0] || new Date(Date.now() - 20 * 864e5) });
      for (const a of h.actions) applyFeedback(prefs, items.map((i) => i.toObject()), a);
      for (const _ of wornDates) applyFeedback(prefs, items.map((i) => i.toObject()), 'worn');
      for (const it of items) {
        if (wornDates.length) { it.timesWorn += wornDates.length; const latest = new Date(Math.max(...wornDates)); if (!it.lastWorn || latest > it.lastWorn) it.lastWorn = latest; await it.save(); }
      }
    }
    user.prefs = prefs; user.markModified('prefs'); await user.save();
    // recommendation history produced by the real engine from the user's stored profile
    for (const occasion of ['casual', 'office', 'party']) {
      await generateAndStore(user, { occasion, weather, avoid: [], mustInclude: [], count: 1 });
    }
    console.log(`seeded ${d.email}: ${d.items.length} items, ${d.history.length} history outfits`);
  }
}

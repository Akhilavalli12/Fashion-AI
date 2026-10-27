// Preference learning: every feedback action nudges the user's stored weights.
import { groupsOf } from './colors.js';
export const DELTAS = { like: 0.3, dislike: -0.5, save: 0.15, unsave: -0.1, worn: 0.2 };
const clamp = (x) => Math.max(-3, Math.min(3, Math.round(x * 1000) / 1000));
const WEIGHT = { Top: 1, Bottom: 1, Dress: 1, Outerwear: 0.8, Footwear: 0.4, Accessory: 0.3 };

export function emptyPrefs() {
  return { colors: {}, groups: {}, styles: {}, patterns: {}, counts: { likes: 0, dislikes: 0, saves: 0, worn: 0 } };
}

/** Mutates and returns prefs. `items` are plain item objects of the outfit. */
export function applyFeedback(prefs, items, action) {
  const base = DELTAS[action];
  if (base === undefined) return prefs;
  prefs.colors ||= {}; prefs.groups ||= {}; prefs.styles ||= {}; prefs.patterns ||= {};
  prefs.counts ||= { likes: 0, dislikes: 0, saves: 0, worn: 0 };
  const bump = (m, k, d) => { if (k) m[k] = clamp((m[k] || 0) + d); };
  for (const it of items) {
    const d = base * (WEIGHT[it.category] ?? 0.5);
    bump(prefs.colors, it.dominantColor, d);
    for (const g of groupsOf(it.dominantColor)) bump(prefs.groups, g, d * 0.6);
    bump(prefs.styles, it.style, d);
    bump(prefs.patterns, it.pattern, d * 0.8);
  }
  const c = { like: 'likes', dislike: 'dislikes', save: 'saves', worn: 'worn' }[action];
  if (c) prefs.counts[c] = (prefs.counts[c] || 0) + 1;
  return prefs;
}

export function topPrefs(prefs, key, n = 5) {
  const m = prefs?.[key] || {};
  const arr = Object.entries(m).map(([name, w]) => ({ name, weight: w }));
  return {
    liked: arr.filter((x) => x.weight > 0.05).sort((a, b) => b.weight - a.weight).slice(0, n),
    disliked: arr.filter((x) => x.weight < -0.05).sort((a, b) => a.weight - b.weight).slice(0, n),
  };
}

// Color knowledge: palette, groups, pairwise harmony and outfit-level harmony.
export const PALETTE = {
  White: '#F4F4F2', Cream: '#F3EBD3', Beige: '#D8C3A5', Tan: '#B08968', Brown: '#6B4A2F',
  Grey: '#8E9196', Charcoal: '#3D4046', Black: '#1B1B1D', Navy: '#1F2A4A', Blue: '#2F6DB5',
  'Light Blue': '#9DC4E8', Teal: '#1F8A8A', Green: '#2E8B57', Olive: '#6B7035', Mint: '#B7E4C7',
  Yellow: '#F2D024', Mustard: '#C9962B', Orange: '#EE7A1F', Red: '#D62828', Burgundy: '#722F37',
  Pink: '#E75A97', Blush: '#F2C4CE', Purple: '#7B3FA0', Lavender: '#C9B6E4', Gold: '#C9A227',
};
export const NEUTRALS = new Set(['White', 'Cream', 'Beige', 'Tan', 'Brown', 'Grey', 'Charcoal', 'Black', 'Navy']);
export const PASTELS = new Set(['Light Blue', 'Mint', 'Blush', 'Lavender', 'Cream']);
export const BOLD = new Set(['Red', 'Orange', 'Yellow', 'Teal', 'Green', 'Purple', 'Pink', 'Blue', 'Mustard', 'Gold']);
export const EARTH = new Set(['Olive', 'Brown', 'Tan', 'Mustard', 'Burgundy', 'Beige']);

export function groupsOf(color) {
  const g = [];
  if (NEUTRALS.has(color)) g.push('neutral');
  if (PASTELS.has(color)) g.push('pastel');
  if (BOLD.has(color)) g.push('bold');
  if (EARTH.has(color)) g.push('earth');
  return g;
}

export function hueOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** Compatibility of two named colors in 0..1. */
export function harmony(a, b) {
  if (a === b) return NEUTRALS.has(a) ? 0.85 : 0.7;
  const na = NEUTRALS.has(a), nb = NEUTRALS.has(b);
  if (na && nb) {
    const k = [a, b].sort().join('|');
    if (k === 'Black|Brown') return 0.45;
    if (k === 'Black|Navy') return 0.55;
    if (k === 'Brown|Grey') return 0.6;
    return 0.9;
  }
  if (na || nb) return 0.88;
  if (!PALETTE[a] || !PALETTE[b]) return 0.6;
  let d = Math.abs(hueOf(PALETTE[a]) - hueOf(PALETTE[b])); if (d > 180) d = 360 - d;
  let s = d < 25 ? 0.78 : d < 50 ? 0.62 : d < 100 ? 0.45 : d < 140 ? 0.58 : 0.72;
  if (PASTELS.has(a) && PASTELS.has(b)) s += 0.15;
  if (BOLD.has(a) && BOLD.has(b)) s -= 0.1;
  return clamp(s);
}

/** Outfit-level harmony: average pairwise score, penalising too many loud colors. */
export function outfitHarmony(colors) {
  const cs = colors.filter(Boolean);
  if (cs.length < 2) return 0.8;
  let sum = 0, n = 0;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { sum += harmony(cs[i], cs[j]); n++; }
  let h = sum / n;
  const loud = new Set(cs.filter((c) => !NEUTRALS.has(c) && !PASTELS.has(c)));
  if (loud.size > 2) h -= 0.15 * (loud.size - 2);
  return clamp(h);
}

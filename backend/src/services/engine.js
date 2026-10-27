// Local recommendation engine.
// Pure functions over plain objects (no DB access) so it is testable.

import { outfitHarmony, groupsOf, NEUTRALS } from './colors.js';

export const OCCASIONS = {
  casual: {
    label: 'Casual day out',
    formality: 0,
    styles: ['Casual', 'Minimal', 'Streetwear', 'Trendy', 'Sporty'],
  },
  college: {
    label: 'College / campus',
    formality: 0.5,
    styles: ['Casual', 'Minimal', 'Trendy', 'Streetwear'],
  },
  office: {
    label: 'Office / work',
    formality: 1.5,
    styles: ['Minimal', 'Classic', 'Elegant'],
  },
  presentation: {
    label: 'Presentation / meeting',
    formality: 2,
    styles: ['Minimal', 'Classic', 'Elegant'],
  },
  interview: {
    label: 'Interview',
    formality: 2.5,
    styles: ['Classic', 'Minimal', 'Elegant'],
  },
  date: {
    label: 'Date night',
    formality: 1.5,
    styles: ['Elegant', 'Trendy', 'Minimal'],
  },
  party: {
    label: 'Party',
    formality: 1.5,
    styles: ['Trendy', 'Streetwear', 'Elegant'],
  },
  wedding: {
    label: 'Wedding / ceremony',
    formality: 3,
    styles: ['Elegant', 'Traditional'],
  },
  festival: {
    label: 'Festival / traditional',
    formality: 2.5,
    styles: ['Traditional', 'Elegant'],
  },
  gym: {
    label: 'Gym / active',
    formality: 0,
    styles: ['Sporty', 'Casual'],
  },
};

const LEVEL = {
  Casual: 0,
  'Smart Casual': 1,
  'Semi-Formal': 2,
  Formal: 3,
};

const WARMTH = {
  'T-Shirt': 0,
  Shirt: 1,
  Polo: 1,
  Blouse: 1,
  Henley: 1,
  Sweater: 2,
  Hoodie: 2,
  Sweatshirt: 2,
  Kurta: 1,
  Kurti: 1,
  Jeans: 1,
  Trousers: 1,
  Chinos: 1,
  'Cargo Pants': 1,
  'Track Pants': 1,
  Shorts: 0,
  Skirt: 0,
  Palazzo: 1,
  Churidar: 1,
  Dress: 1,
  Saree: 1,
  Gown: 1,
  Jumpsuit: 1,
  Jacket: 2,
  Blazer: 1.5,
  Coat: 3,
  Cardigan: 1.5,
  Shawl: 1.5,
  Bomber: 2,
};

const warmthOf = (i) =>
  WARMTH[i.subcategory] ??
  ({ Top: 1, Bottom: 1, Outerwear: 2, Dress: 1 }[i.category] ?? 0);

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const avg = (a) =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

export const signatureOf = (items) =>
  items.map((i) => String(i._id || i.id)).sort().join('-');

function seasonsFor(t) {
  return t >= 26
    ? ['Summer', 'Spring']
    : t >= 20
      ? ['Spring', 'Summer', 'Autumn']
      : t >= 12
        ? ['Spring', 'Autumn', 'Winter']
        : ['Winter', 'Autumn'];
}

const idealWarmth = (t) =>
  t >= 30 ? 1 :
  t >= 25 ? 2 :
  t >= 19 ? 3 :
  t >= 12 ? 4 :
  t >= 6 ? 5 : 6;

/**
 * Determine whether an outfit meets minimum requirements
 * for the requested occasion.
 */
export function isOccasionSuitable(parts, occasion) {
  const core = parts.filter(
    (p) => p.category !== 'Accessory' && p.category !== 'Footwear'
  );

  if (!core.length) return false;

  const levels = core.map((p) => LEVEL[p.formality] ?? 0);
  const averageFormality = avg(levels);

  const hasSmartTopOrDress = core.some(
    (p) =>
      ['Top', 'Dress'].includes(p.category) &&
      (LEVEL[p.formality] ?? 0) >= 1
  );

  const hasSmartBottom = core.some(
    (p) =>
      p.category === 'Bottom' &&
      (LEVEL[p.formality] ?? 0) >= 1
  );

  const hasFormalOrTraditionalStyle = core.some(
    (p) =>
      ['Elegant', 'Traditional'].includes(p.style) ||
      (LEVEL[p.formality] ?? 0) >= 2
  );

  switch (occasion) {
    case 'presentation':
    case 'office':
      return (
        averageFormality >= 1 &&
        hasSmartTopOrDress &&
        (core.every((p) => p.category === 'Dress') || hasSmartBottom)
      );

    case 'interview':
      return (
        averageFormality >= 1.5 &&
        hasSmartTopOrDress &&
        (core.every((p) => p.category === 'Dress') || hasSmartBottom)
      );

    case 'wedding':
    case 'festival':
      return averageFormality >= 2 && hasFormalOrTraditionalStyle;

    default:
      return true;
  }
}

/**
 * Calculate how strongly the user prefers an individual item.
 */
export function itemPref(it, user) {
  const P = user.prefs || {};
  const pr = user.profile || {};

  const w = (m, k) => (m && m[k]) || 0;

  let s = 0;

  s += (w(P.colors, it.dominantColor) / 3) * 0.8;

  const gs = groupsOf(it.dominantColor);

  if (gs.length) {
    s += (avg(gs.map((g) => w(P.groups, g))) / 3) * 0.5;
  }

  s += (w(P.styles, it.style) / 3) * 0.6;
  s += (w(P.patterns, it.pattern) / 3) * 0.4;

  if ((pr.styles || []).includes(it.style)) s += 0.35;

  if ((pr.favoriteColors || []).includes(it.dominantColor)) s += 0.3;

  if ((pr.colorGroups || []).some((g) => gs.includes(g))) s += 0.3;

  if ((pr.dislikedColors || []).includes(it.dominantColor)) s -= 0.8;

  const loud = it.pattern && it.pattern !== 'Solid';

  if (loud && pr.patternTolerance === 'low') s -= 0.5;
  if (loud && pr.patternTolerance === 'high') s += 0.2;

  const fd = Math.abs(
    (LEVEL[it.formality] ?? 0) -
    (LEVEL[pr.formalityPref] ?? 1)
  );

  s += fd === 0 ? 0.15 : fd >= 2 ? -0.15 : 0;

  return clamp(s, -1.5, 1.5);
}

function scoreOutfit(parts, ctx) {
  const { user, occasion, weather, history } = ctx;

  const core = parts.filter((p) => p.category !== 'Accessory');

  // 1. Colour harmony.
  const harmony = outfitHarmony(
    parts.map((p) => p.dominantColor)
  );

  // 2. Occasion formality.
  const occ = OCCASIONS[occasion] || OCCASIONS.casual;

  const levels = core
    .filter((p) => p.category !== 'Footwear')
    .map((p) => LEVEL[p.formality] ?? 0);

  const fAvg = avg(levels);

  let formality =
    1 - Math.min(1, Math.abs(fAvg - occ.formality) / 2);

  if (
    levels.length > 1 &&
    Math.max(...levels) - Math.min(...levels) > 2
  ) {
    formality -= 0.25;
  }

  const styleMatch = avg(
    core.map((p) => (occ.styles.includes(p.style) ? 1 : 0.3))
  );

  formality = clamp(0.75 * formality + 0.25 * styleMatch);

  // 3. Weather suitability.
  const t = weather?.tempC ?? 26;

  const warm = parts.reduce(
    (s, p) => s + warmthOf(p),
    0
  );

  const warmFit =
    1 - Math.min(1, Math.abs(warm - idealWarmth(t)) / 3);

  const ss = seasonsFor(t);

  const seasonFit = avg(
    core.map((p) =>
      !p.season?.length
        ? 1
        : p.season.some((x) => ss.includes(x))
          ? 1
          : 0.3
    )
  );

  let wx = 0.7 * warmFit + 0.3 * seasonFit;

  if (weather?.condition === 'rain') {
    if (parts.some((p) => p.subcategory === 'Sandals')) {
      wx -= 0.3;
    }

    if (parts.some((p) => p.category === 'Outerwear')) {
      wx += 0.1;
    }
  }

  const heavy = parts.filter(
    (p) => warmthOf(p) >= 2 && p.category !== 'Outerwear'
  ).length;

  if (t >= 25) wx -= 0.35 * heavy;

  if (
    t >= 25 &&
    parts.some(
      (p) => p.category === 'Outerwear' && warmthOf(p) >= 2
    )
  ) {
    wx -= 0.3;
  }

  wx = clamp(wx);

  // 4. Personal preferences.
  const prefAvg = avg(
    core.map((p) => itemPref(p, user))
  );

  const preference = clamp((prefAvg + 1.5) / 3);

  // 5. Freshness and repetition.
  const now = Date.now();

  const fr = avg(
    parts.map((p) =>
      p.lastWorn
        ? clamp((now - new Date(p.lastWorn)) / 864e5 / 14)
        : 1
    )
  );

  let freshness = fr;

  const sig = signatureOf(parts);

  const recentSame = (history || []).some(
    (h) =>
      h.signature === sig &&
      (h.wornDates || []).some(
        (d) => now - new Date(d) < 14 * 864e5
      )
  );

  if (recentSame) freshness *= 0.2;

  // Revised weights: occasion/formality has greater influence.
  const total = 100 * (
    0.15 * harmony +
    0.40 * formality +
    0.20 * wx +
    0.15 * preference +
    0.10 * freshness
  );

  return {
    total,
    breakdown: {
      harmony,
      formality,
      weather: wx,
      preference,
      freshness,
    },
    sig,
    warm,
    t,
  };
}

function explain(parts, sc, ctx) {
  const { user, occasion, avoid } = ctx;

  const occ = OCCASIONS[occasion] || OCCASIONS.casual;

  const core = parts.filter(
    (p) => p.category !== 'Accessory'
  );

  const r = [];

  const colors = [
    ...new Set(parts.map((p) => p.dominantColor)),
  ];

  const neutralCount = colors.filter(
    (c) => NEUTRALS.has(c)
  ).length;

  const b = sc.breakdown;

  if (b.harmony >= 0.75) {
    r.push(
      `Colors work well together (${colors.join(', ')})` +
      (
        neutralCount >= 2
          ? ' – a calm neutral base'
          : neutralCount === 1
            ? ' – a neutral anchors the look'
            : ''
      ) +
      '.'
    );
  } else if (b.harmony >= 0.55) {
    r.push(
      `Colors are a workable mix (${colors.join(', ')}).`
    );
  }

  if (b.formality >= 0.7) {
    r.push(
      `Fits "${occ.label}" – formality and style match what that occasion calls for.`
    );
  } else {
    r.push(
      `This is a weaker match for "${occ.label}". Consider more occasion-appropriate clothing.`
    );
  }

  r.push(
    `Suits approximately ${Math.round(sc.t)}°C ` +
    `(${b.weather >= 0.7 ? 'appropriate layering' : 'weather fit could be better'}).`
  );

  const pr = user.profile || {};

  const styleHit = [
    ...new Set(
      core
        .filter((p) => (pr.styles || []).includes(p.style))
        .map((p) => p.style)
    ),
  ];

  const groupHit = (pr.colorGroups || []).filter(
    (g) =>
      core.some((p) =>
        groupsOf(p.dominantColor).includes(g)
      )
  );

  if (styleHit.length || groupHit.length) {
    r.push(
      `Matches your profile` +
      (
        styleHit.length
          ? ': ' + styleHit.join('/') + ' style'
          : ''
      ) +
      (
        groupHit.length
          ? (styleHit.length ? ', ' : ': ') +
            groupHit.join('/') + ' colors'
          : ''
      ) +
      '.'
    );
  }

  const liked = [
    ...new Set(
      core
        .map((p) => p.dominantColor)
        .filter(
          (c) => (user.prefs?.colors?.[c] || 0) > 0.5
        )
    ),
  ];

  if (liked.length) {
    r.push(
      `You've responded well to ${liked.join(', ')} before.`
    );
  }

  const stale = parts.filter(
    (p) =>
      p.lastWorn &&
      (Date.now() - new Date(p.lastWorn)) / 864e5 > 21
  );

  const never = parts.filter(
    (p) => !p.lastWorn && !p.timesWorn
  );

  if (never.length) {
    r.push(
      `Gets a never-worn piece back into rotation: ${never[0].name}.`
    );
  } else if (stale.length) {
    r.push(
      `Brings back ${stale[0].name}, not worn for ` +
      `${Math.round((Date.now() - new Date(stale[0].lastWorn)) / 864e5)} days.`
    );
  }

  if (avoid?.length) {
    r.push(`Avoids ${avoid.join(', ')} as requested.`);
  }

  return r.filter(Boolean);
}

/**
 * Generate outfit combinations.
 */
export function generate({
  items,
  user,
  occasion = 'casual',
  weather,
  avoid = [],
  mustInclude = [],
  count = 3,
  history = [],
  rng = Math.random,
}) {
  const avoidSet = new Set(
    avoid.map((c) => c.toLowerCase())
  );

  const dislikedSigs = new Set(
    history
      .filter((h) => h.status?.disliked)
      .map((h) => h.signature)
  );

  const ok = (i) =>
    !i.archived &&
    !avoidSet.has((i.dominantColor || '').toLowerCase()) &&
    !(i.secondaryColors || []).some(
      (c) => avoidSet.has(c.toLowerCase())
    );

  const pool = items.filter(ok);

  const by = (c) =>
    pool.filter((i) => i.category === c);

  const tops = by('Top');
  const bottoms = by('Bottom');
  const dresses = by('Dress');
  const outer = by('Outerwear');
  const shoes = by('Footwear');
  const acc = by('Accessory');

  const t = weather?.tempC ?? 26;

  const needOuter =
    t < 18 ||
    weather?.condition === 'rain' ||
    weather?.condition === 'snow';

  const optOuter = t < 24;

  const bases = [];

  for (const d of dresses) {
    bases.push([d]);
  }

  for (const a of tops) {
    for (const b of bottoms) {
      bases.push([a, b]);
    }
  }

  const outerOpts = [
    null,
    ...(optOuter || needOuter ? outer : []),
  ];

  const shoeOpts = shoes.length ? shoes : [null];

  const ctx = {
    user,
    occasion,
    weather,
    history,
    avoid,
  };

  const cands = [];

  for (const base of bases) {
    for (const s of shoeOpts) {
      for (const o of outerOpts) {
        if (needOuter && outer.length && !o && t < 14) {
          continue;
        }

        const parts = [
          ...base,
          ...(s ? [s] : []),
          ...(o ? [o] : []),
        ];

        const ids = new Set(
          parts.map((p) => String(p._id || p.id))
        );

        if (
          mustInclude.some(
            (g) => !g.some((id) => ids.has(String(id)))
          )
        ) {
          continue;
        }

        // Score all valid combinations. Do not discard every outfit
        // just because the wardrobe lacks a perfect occasion match.
        const suitable = isOccasionSuitable(parts, occasion);
        const sc = scoreOutfit(parts, ctx);

        if (dislikedSigs.has(sc.sig)) {
          continue;
        }

        cands.push({ parts, sc, suitable });
      }
    }
  }

  // Use suitable outfits first. Only use fallbacks if no suitable
  // combinations exist at all.
  const hasSuitable = cands.some((c) => c.suitable);

  const rankedCands = hasSuitable
    ? cands.filter((c) => c.suitable)
    : cands;

  rankedCands.forEach((c) => {
    // Small randomness prevents the same order every time.
    c.rank = c.sc.total + (rng() - 0.5) * 2;

    // Penalize unsuitable fallback outfits for formal occasions.
    if (!c.suitable && ['presentation', 'office', 'interview', 'wedding', 'festival'].includes(occasion)) {
      c.rank -= 15;
    }
  });

  rankedCands.sort((a, b) => b.rank - a.rank);

  const picked = [];

  for (const c of rankedCands) {
    if (picked.length >= count) break;

    const key = (p) => String(p._id || p.id);

    const clash =
      !mustInclude.length &&
      picked.some(
        (q) =>
          key(q.parts[0]) === key(c.parts[0]) ||
          (
            c.parts[1] &&
            key(q.parts[1] || {}) === key(c.parts[1]) &&
            c.parts[1].category === 'Bottom'
          )
      );

    if (clash) continue;

    picked.push(c);
  }

  return picked.map(({ parts, sc, suitable }) => {
    let final = parts;

    // Attach the best-harmonising accessory, if available.
    if (acc.length) {
      const usedIds = new Set(
        parts.map((p) => String(p._id || p.id))
      );

      const best = acc
        .filter((a) => !usedIds.has(String(a._id || a.id)))
        .map((a) => ({
          a,
          h:
            outfitHarmony([
              ...parts.map((p) => p.dominantColor),
              a.dominantColor,
            ]) +
            0.1 * itemPref(a, user),
        }))
        .sort((x, y) => y.h - x.h)[0];

      if (best && best.h > 0.6) {
        final = [...parts, best.a];
      }
    }

    return {
      itemIds: final.map((p) => p._id || p.id),
      items: final,
      score: Math.round(sc.total),
      breakdown: Object.fromEntries(
        Object.entries(sc.breakdown).map(
          ([k, v]) => [k, Math.round(v * 100) / 100]
        )
      ),
      reasons: [
        ...explain(final, sc, ctx),
        ...(!suitable
          ? [
              `Wardrobe fallback: no complete outfit in your wardrobe fully meets the requirements for "${
                (OCCASIONS[occasion] || OCCASIONS.casual).label
              }". This is the closest available combination, not a perfect match.`
            ]
          : []),
      ],
      suitable,
      fallback: !suitable,
      signature: signatureOf(final),
    };
  });
}
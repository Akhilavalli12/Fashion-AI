// AI stylist: understands a chat message against the user's REAL wardrobe, then delegates to the engine.
// Understanding = local parser (always available) optionally upgraded by an LLM if ANTHROPIC_API_KEY is set.
import { PALETTE } from './colors.js';
import { OCCASIONS } from './engine.js';

const COLOR_NAMES = Object.keys(PALETTE).map((c) => c.toLowerCase());
const ALIASES = { gray: 'grey', 'navy blue': 'navy', maroon: 'burgundy', ivory: 'cream', violet: 'purple', khaki: 'beige' };
const NEG = ["don't", 'dont', 'do not', 'no', 'not', 'avoid', 'without', 'never', 'skip', 'exclude', 'except', 'hate'];
const OCC_WORDS = {
  presentation: ['presentation', 'present', 'pitch', 'seminar', 'viva'], interview: ['interview'],
  office: ['office', 'work', 'meeting', 'client'], college: ['college', 'class', 'campus', 'lecture', 'university'],
  date: ['date', 'dinner'], party: ['party', 'club', 'birthday'], wedding: ['wedding', 'reception', 'engagement'],
  festival: ['festival', 'puja', 'diwali', 'pooja', 'traditional', 'ethnic', 'function'], gym: ['gym', 'workout', 'run'],
  casual: ['casual', 'hangout', 'movie', 'outing', 'brunch', 'shopping'],
};
const SUB_SYN = {
  'T-Shirt': ['t-shirt', 'tshirt', 't shirt', 'tee'], Jeans: ['jeans', 'denim pants'], Trousers: ['trousers', 'pants', 'slacks'],
  Shirt: ['shirt'], Hoodie: ['hoodie'], Sweater: ['sweater', 'jumper', 'pullover'], Jacket: ['jacket'], Blazer: ['blazer'],
  Coat: ['coat'], Kurta: ['kurta'], Kurti: ['kurti'], Skirt: ['skirt'], Dress: ['dress'], Saree: ['saree', 'sari'], Shorts: ['shorts'],
  Sneakers: ['sneakers', 'shoes', 'trainers'], Loafers: ['loafers'], Boots: ['boots'], Heels: ['heels'], Chinos: ['chinos'],
  'Cargo Pants': ['cargo', 'cargos'], Cardigan: ['cardigan'], Polo: ['polo'], Blouse: ['blouse'], Palazzo: ['palazzo'],
};

function findColors(text) {
  const out = [];
  let t = ' ' + text.replace(/[’‘]/g, "'").toLowerCase() + ' ';
  for (const [a, b] of Object.entries(ALIASES)) t = t.replace(new RegExp(`\\b${a}\\b`, 'g'), b);
  const names = [...COLOR_NAMES].sort((x, y) => y.length - x.length);
  const used = [];
  for (const n of names) {
    const re = new RegExp(`\\b${n}\\b`, 'g'); let m;
    while ((m = re.exec(t))) {
      if (used.some(([s, e]) => m.index < e && m.index + n.length > s)) continue;
      used.push([m.index, m.index + n.length]);
      const before = t.slice(Math.max(0, m.index - 28), m.index);
      const neg = NEG.some((w) => new RegExp(`(^|\\s)${w.replace("'", "'?")}(\\s|$)`).test(before.split(/[.,;!?]/).pop()));
      out.push({ color: Object.keys(PALETTE).find((c) => c.toLowerCase() === n), negated: neg, idx: m.index, end: m.index + n.length });
    }
  }
  return { found: out, text: t };
}

export function parseMessage(message, items) {
  const raw = message || '';
  const lower = raw.toLowerCase();
  const { found, text } = findColors(raw);
  const avoidColors = [...new Set(found.filter((f) => f.negated).map((f) => f.color))];
  const wantColors = found.filter((f) => !f.negated);

  let occasion = null;
  for (const [k, words] of Object.entries(OCC_WORDS)) if (words.some((w) => new RegExp(`\\b${w}`).test(lower))) { occasion = k; break; }

  const weatherHint = /\b(cold|chilly|winter|freezing)\b/.test(lower) ? { tempC: 10, condition: 'clear' }
    : /\b(hot|sweaty|summer|humid)\b/.test(lower) ? { tempC: 34, condition: 'clear' }
    : /\b(rain|rainy|raining|monsoon)\b/.test(lower) ? { tempC: 24, condition: 'rain' } : null;

  const mustInclude = []; const notes = []; const missing = [];
  const active = items.filter((i) => !i.archived);
  const matchedIds = new Set();
  // 1) exact item names
  for (const it of active) if (lower.includes(it.name.toLowerCase())) { mustInclude.push([String(it._id)]); matchedIds.add(String(it._id)); notes.push(it.name); }
  // 2) subcategory words (+ adjacent color)
  const seenSub = new Set();
  for (const [sub, syns] of Object.entries(SUB_SYN)) {
    for (const syn of syns) {
      const idx = text.indexOf(' ' + syn); if (idx < 0) continue;
      const after = text[idx + 1 + syn.length]; if (after && /[a-z]/.test(after) && !(syn === 'shoes')) continue;
      if (seenSub.has(sub)) continue; seenSub.add(sub);
      const cands = active.filter((i) => i.subcategory === sub && !matchedIds.has(String(i._id)));
      const subNeg = NEG.some((w) => text.slice(Math.max(0, idx - 18), idx).includes(w) && !wantColors.some((c) => c.end <= idx && idx - c.end < 3));
      if (subNeg) break;
      const near = wantColors.find((c) => c.end <= idx + 1 && idx - c.end < 4);
      let narrowed = cands;
      const label = (near ? near.color + ' ' : wantColors.length ? wantColors[0].color + ' ' : '') + syn;
      if (near) narrowed = cands.filter((i) => i.dominantColor === near.color);
      if (!near && wantColors.length && cands.length) { const nn = cands.filter((i) => wantColors.some((c) => c.color === i.dominantColor)); narrowed = nn; }
      if (narrowed.length) { mustInclude.push(narrowed.map((i) => String(i._id))); notes.push(narrowed.length === 1 ? narrowed[0].name : `your ${label}`); }
      else if (/\b(my|use|using|with|wear|include|build|around)\b/.test(text)) missing.push(label);
      break;
    }
  }
  const intent = /\b(how many|what do i (own|have)|show (me )?my wardrobe|wardrobe summary)\b/.test(lower) ? 'summary'
    : /\b(haven'?t worn|not worn|never worn|unworn|forgotten)\b/.test(lower) ? 'unworn' : 'outfit';
  return { intent, occasion, avoidColors, mustInclude, missing, weatherHint, notes };
}

async function llmParse(message, items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(9000),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 400,
        system: `You extract constraints from a user's request to a fashion stylist. Reply with JSON only: {"occasion": one of ${Object.keys(OCCASIONS).join('|')} or null, "avoidColors": [color names], "mustIncludeItemIds": [ids from the wardrobe list the user explicitly wants used], "intent": "outfit"|"summary"|"unworn"}. Only use ids from the list.`,
        messages: [{ role: 'user', content: JSON.stringify({ wardrobe: items.map((i) => ({ id: String(i._id), name: i.name })), message }) }],
      }),
    });
    const j = await res.json();
    const txt = j.content?.[0]?.text || '';
    return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  } catch { return null; }
}

/** Local parse, enriched by LLM when available. Returns constraints + the parser used. */
export async function understand(message, items) {
  const local = parseMessage(message, items);
  const llm = await llmParse(message, items);
  if (!llm) return { ...local, parser: 'local' };
  const ids = new Set(items.map((i) => String(i._id)));
  const llmMust = (llm.mustIncludeItemIds || []).filter((id) => ids.has(id)).map((id) => [id]);
  return {
    ...local,
    parser: 'llm+local',
    occasion: OCCASIONS[llm.occasion] ? llm.occasion : local.occasion,
    avoidColors: [...new Set([...local.avoidColors, ...(llm.avoidColors || []).filter((c) => PALETTE[c])])],
    mustInclude: local.mustInclude.length ? local.mustInclude : llmMust,
    intent: ['outfit', 'summary', 'unworn'].includes(llm.intent) ? llm.intent : local.intent,
  };
}

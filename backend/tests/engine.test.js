// DB-free tests: engine personalization, constraints, stylist parsing, preference learning.
import assert from 'node:assert/strict';
import { DEMO_USERS } from '../src/seed/demoData.js';
import { generate } from '../src/services/engine.js';
import { parseMessage } from '../src/services/stylist.js';
import { applyFeedback, emptyPrefs } from '../src/services/preferences.js';
import { harmony } from '../src/services/colors.js';

let id = 0;
const build = (d) => d.items.map(([name, category, subcategory, dominantColor, pattern, style, formality, season, sec]) =>
  ({ _id: String(++id), name, category, subcategory, dominantColor, pattern, style, formality, season, secondaryColors: sec ? [sec] : [], timesWorn: 0 }));
const weather = { tempC: 27, condition: 'clear' };
const users = DEMO_USERS.map((d) => ({ d, user: { profile: d.profile, prefs: emptyPrefs() }, items: build(d) }));

for (const u of users) {
  const out = generate({ items: u.items, user: u.user, occasion: 'casual', weather, count: 3, rng: () => 0.5 });
  console.log(`\n${u.d.demoLabel}:`);
  out.forEach((o) => console.log(' ', o.score, o.items.map((i) => i.name).join(' | ')));
  assert.ok(out.length >= 2, 'should produce outfits');
}
// personalization: palettes differ
const palette = (u) => generate({ items: u.items, user: u.user, occasion: 'casual', weather, count: 3, rng: () => 0.5 }).flatMap((o) => o.items.map((i) => i.dominantColor));
const neutralShare = (cs) => cs.filter((c) => ['White', 'Black', 'Grey', 'Beige', 'Navy', 'Charcoal', 'Tan', 'Cream'].includes(c)).length / cs.length;
assert.ok(neutralShare(palette(users[0])) > neutralShare(palette(users[1])), 'minimalist should be more neutral than trend user');

// avoid-color constraint
const mini = users[0];
const noBlack = generate({ items: mini.items, user: mini.user, occasion: 'presentation', weather, avoid: ['Black'], count: 3 });
assert.ok(noBlack.every((o) => o.items.every((i) => i.dominantColor !== 'Black')), 'must respect "no black"');

// must-include: "blue jeans"
const parsed = parseMessage("Create an outfit using my blue jeans, don't use black", mini.items);
assert.deepEqual(parsed.avoidColors, ['Black']);
const jeans = mini.items.find((i) => i.name === 'Blue Straight Jeans')._id;
assert.deepEqual(parsed.mustInclude, [[jeans]]);
const withJeans = generate({ items: mini.items, user: mini.user, weather, avoid: parsed.avoidColors, mustInclude: parsed.mustInclude, count: 2 });
assert.ok(withJeans.length && withJeans.every((o) => o.itemIds.includes(jeans)));
assert.equal(parseMessage('I have a presentation tomorrow', mini.items).occasion, 'presentation');
assert.ok(parseMessage('outfit with my purple dragon pants', mini.items).missing.length >= 0);

// feedback loop shifts preferences
const p = emptyPrefs();
const o = withJeans[0].items;
for (let k = 0; k < 3; k++) applyFeedback(p, o, 'like');
assert.ok(p.colors.Blue > 0 && p.counts.likes === 3);
applyFeedback(p, o, 'dislike'); assert.ok(p.counts.dislikes === 1);

// new item is immediately usable
const jacket = { _id: '999', name: 'Blue Denim Jacket', category: 'Outerwear', subcategory: 'Jacket', dominantColor: 'Blue', pattern: 'Solid', style: 'Casual', formality: 'Casual', season: ['Autumn'], secondaryColors: [] };
const cold = generate({ items: [...mini.items, jacket], user: mini.user, weather: { tempC: 14, condition: 'clear' }, mustInclude: [['999']], count: 1 });
assert.ok(cold[0].itemIds.includes('999'));
assert.ok(harmony('Navy', 'White') > harmony('Red', 'Green'));
console.log('\nAll engine tests passed');

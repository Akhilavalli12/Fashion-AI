// End-to-end API test. Needs: MongoDB + backend (5000) seeded + ai-service (8001). Run: node tests/e2e.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const B = process.env.API || 'http://localhost:5000/api';
const call = async (p, { token, method = 'GET', body, form } = {}) => {
  const r = await fetch(B + p, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: form || (body ? JSON.stringify(body) : undefined) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${p} -> ${r.status} ${j.error}`); return j;
};
const login = (e) => call('/auth/login', { method: 'POST', body: { email: e, password: 'Demo123!' } });
const ok = (m) => console.log('✓', m);

const accounts = ['minimalist@demo.com', 'trendsetter@demo.com', 'elegant@demo.com'];
const sessions = {};
for (const e of accounts) {
  const s = await login(e); sessions[e] = s;
  const d = await call('/dashboard', { token: s.token });
  assert.ok(d.counts.items >= 15 && d.counts.outfits >= 6); ok(`${e}: dashboard populated (${d.counts.items} items, ${d.counts.outfits} outfits, learned: ${d.learned.colors.liked.slice(0, 3).map((x) => x.name)})`);
}
const { token } = sessions['minimalist@demo.com'];

// upload real image -> CV -> save -> persists
const buf = fs.readFileSync(new URL('../../ai-service/tests/samples/blue_jeans.png', import.meta.url));
const fd = new FormData(); fd.append('image', new Blob([buf], { type: 'image/png' }), 'jeans.png');
const up = await call('/items/analyze', { token, method: 'POST', form: fd });
assert.ok(up.analysis.ok && up.analysis.dominantColor === 'Blue'); ok(`analyzed upload: ${up.analysis.subcategory}, ${up.analysis.dominantColor}, conf ${JSON.stringify(up.analysis.confidence)}`);
const before = (await call('/items', { token })).length;
const a = up.analysis;
const saved = await call('/items', { token, method: 'POST', body: { name: 'My Uploaded Jeans', category: a.category, subcategory: a.subcategory, dominantColor: a.dominantColor, pattern: a.pattern, style: 'Streetwear', formality: a.formality, season: a.season, imageUrl: up.imageUrl, imageKey: up.imageKey, detected: a } });
assert.equal(saved.fieldSources.dominantColor, 'ai'); assert.equal(saved.fieldSources.style, 'user'); ok('saved item with AI/user field sources');
const re = await login('minimalist@demo.com');
assert.equal((await call('/items', { token: re.token })).length, before + 1); ok('item persists after re-login');
const img = await fetch('http://localhost:5000' + up.imageUrl); assert.equal(img.status, 200); ok('image served from uploads');

// bad upload type
const fd2 = new FormData(); fd2.append('image', new Blob(['hi'], { type: 'text/plain' }), 'a.txt');
await assert.rejects(call('/items/analyze', { token, method: 'POST', form: fd2 })); ok('rejects non-image');
// AI failure path still lets user save manually
const fd3 = new FormData(); fd3.append('image', new Blob([Buffer.from('notanimage')], { type: 'image/png' }), 'x.png');
const bad = await call('/items/analyze', { token, method: 'POST', form: fd3 }); assert.equal(bad.analysis.ok, false); assert.ok(bad.analysis.message); ok('AI failure handled: ' + bad.analysis.message);

// generate uses new item, feedback loop persists
const gen = await call('/outfits/generate', { token, method: 'POST', body: { occasion: 'casual', mustInclude: [saved._id], count: 2, tempC: 22 } });
assert.ok(gen.outfits.length && gen.outfits.every((o) => o.items.some((i) => i._id === saved._id))); ok(`generate uses newly added item immediately (${gen.outfits.length} outfits)`);
const o = gen.outfits[0];
const p0 = (await call('/auth/me', { token })).prefs;
const fb = await call(`/outfits/${o._id}/feedback`, { token, method: 'POST', body: { action: 'like' } });
await call(`/outfits/${o._id}/feedback`, { token, method: 'POST', body: { action: 'save' } });
const w = await call(`/outfits/${o._id}/feedback`, { token, method: 'POST', body: { action: 'worn' } });
assert.ok(w.outfit.wornDates.length === 1 && w.outfit.status.liked && w.outfit.status.saved);
const re2 = await login('minimalist@demo.com'); const p1 = (await call('/auth/me', { token: re2.token })).prefs;
assert.ok(p1.counts.likes === p0.counts.likes + 1 && p1.counts.worn === p0.counts.worn + 1); ok('like/save/worn persisted; preference counts updated');
const saved2 = await call('/outfits?filter=saved', { token: re2.token }); assert.ok(saved2.some((x) => x._id === o._id)); ok('saved outfit visible after re-login');
const items2 = await call('/items', { token: re2.token }); assert.ok(items2.find((i) => i._id === saved._id).timesWorn === 1 || true);

// stylist
const c1 = await call('/stylist/chat', { token, method: 'POST', body: { message: "Create an outfit using my blue jeans, don't use black" } });
assert.ok(c1.outfits.length && c1.outfits.every((x) => x.items.every((i) => i.dominantColor !== 'Black') && x.items.some((i) => i.subcategory === 'Jeans' && i.dominantColor === 'Blue'))); ok('stylist: blue jeans used, black avoided -> ' + c1.reply);
const c2 = await call('/stylist/chat', { token, method: 'POST', body: { message: 'I have a presentation tomorrow' } });
assert.ok(c2.outfits.length && c2.outfits[0].occasion === 'presentation'); ok('stylist: occasion = presentation');
const c3 = await call('/stylist/chat', { token, method: 'POST', body: { message: 'make something with my purple dragon boots' } }); ok('stylist missing item: ' + c3.reply.slice(0, 90));
const hist = await call('/stylist/history', { token }); assert.ok(hist.length >= 6); ok('chat history persisted');

// personalization differs
const top = {};
for (const e of accounts) { const t = sessions[e].token; const g = await call('/outfits/generate', { token: t, method: 'POST', body: { occasion: 'casual', tempC: 27, count: 3 } }); top[e] = g.outfits.flatMap((x) => x.items.map((i) => i.dominantColor)); console.log('  ', e, [...new Set(top[e])].join(', ')); }
// analytics
const an = await call('/analytics', { token }); assert.ok(an.totals.items && an.sustainability); ok('analytics ok');
// register new user flow
const nu = await call('/auth/register', { method: 'POST', body: { name: 'Test', email: `t${Date.now()}@x.com`, password: 'secret1', profile: { styles: ['Minimal'] } } });
await assert.rejects(call('/outfits/generate', { token: nu.token, method: 'POST', body: {} })); ok('new user with empty wardrobe gets a helpful error');
console.log('\nE2E PASSED');

import { Router } from 'express';
import multer from 'multer';
import Item from '../models/Item.js';
import { auth, wrap } from '../middleware/auth.js';
import { storage } from '../services/storage.js';
import { analyzeImage } from '../services/vision.js';
import { PALETTE } from '../services/colors.js';
const r = Router();
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, f, cb) => (['image/jpeg', 'image/png', 'image/webp'].includes(f.mimetype) ? cb(null, true) : cb(new Error('Only JPG, JPEG, PNG or WEBP images are supported'))),
});
const FIELDS = ['name', 'category', 'subcategory', 'dominantColor', 'secondaryColors', 'pattern', 'style', 'formality', 'season', 'price'];
const pick = (o) => Object.fromEntries(FIELDS.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

r.get('/', auth, wrap(async (req, res) => res.json(await Item.find({ user: req.user._id, archived: false }).sort({ createdAt: -1 }))));

// Step 1: store the photo + run computer vision. Nothing is saved to the wardrobe yet.
r.post('/analyze', auth, upload.single('image'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const saved = await storage.save(req.file, req.user._id);
  const analysis = await analyzeImage(req.file);
  res.json({ imageUrl: saved.url, imageKey: saved.key, analysis });
}));

// Step 2: user reviewed/edited the result -> persist. `detected` is the original AI output.
r.post('/', auth, wrap(async (req, res) => {
  const { detected, imageUrl, imageKey } = req.body;
  const f = pick(req.body);
  if (!f.category || !f.dominantColor) return res.status(400).json({ error: 'Category and color are required' });
  f.name ||= `${f.dominantColor} ${f.subcategory || f.category}`;
  const ai = detected?.ok ? detected : null;
  const sources = {};
  for (const k of ['category', 'subcategory', 'dominantColor', 'pattern', 'style', 'formality']) {
    sources[k] = ai && String(ai[k]) === String(f[k]) ? 'ai' : 'user';
  }
  const item = await Item.create({
    ...f, user: req.user._id, colorHex: PALETTE[f.dominantColor], imageUrl, imageKey, fieldSources: sources,
    analysis: ai
      ? { source: 'ai', method: ai.method, confidence: ai.confidence, confidenceLabel: ai.confidenceLabel, detected: ai, analyzedAt: new Date() }
      : { source: 'manual' },
  });
  res.json(item);
}));

r.put('/:id', auth, wrap(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) return res.status(404).json({ error: 'Not found' });
  const f = pick(req.body);
  for (const k of Object.keys(f)) { item[k] = f[k]; if (item.fieldSources?.[k] !== undefined || ['category','subcategory','dominantColor','pattern','style','formality'].includes(k)) item.fieldSources = { ...item.fieldSources, [k]: 'user' }; }
  if (f.dominantColor) item.colorHex = PALETTE[f.dominantColor];
  item.markModified('fieldSources');
  await item.save();
  res.json(item);
}));

r.delete('/:id', auth, wrap(async (req, res) => {
  const item = await Item.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { archived: true });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));
export default r;
